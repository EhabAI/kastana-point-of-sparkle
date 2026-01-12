import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeductionWarning {
  inventory_item_id: string;
  name: string;
  current_on_hand: number;
  required: number;
  new_on_hand: number;
}

interface DeductionResponse {
  success: boolean;
  warnings: DeductionWarning[];
  error: string | null;
  deducted_count: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[inventory-deduct] Missing Authorization header");
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Unauthorized", deducted_count: 0 }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate JWT
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[inventory-deduct] JWT validation failed:", claimsError);
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Unauthorized", deducted_count: 0 }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[inventory-deduct] Authenticated user:", userId);

    // Parse request body
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Missing order_id", deducted_count: 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[inventory-deduct] Processing order:", order_id);

    // Get user role and validate access
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role, restaurant_id, branch_id")
      .eq("user_id", userId)
      .in("role", ["cashier", "owner", "system_admin"])
      .maybeSingle();

    if (roleError || !userRole) {
      console.error("[inventory-deduct] User role not found:", roleError);
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Access denied", deducted_count: 0 }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's restaurant_id based on role
    let userRestaurantId: string;
    if (userRole.role === "owner") {
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .single();
      if (!restaurant) {
        return new Response(
          JSON.stringify({ success: false, warnings: [], error: "Restaurant not found", deducted_count: 0 }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userRestaurantId = restaurant.id;
    } else {
      userRestaurantId = userRole.restaurant_id;
    }

    // Step 1: Load order + order_items
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, branch_id, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("[inventory-deduct] Order not found:", orderError);
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Order not found", deducted_count: 0 }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate restaurant scope
    if (order.restaurant_id !== userRestaurantId) {
      console.error("[inventory-deduct] Restaurant mismatch");
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Access denied: restaurant mismatch", deducted_count: 0 }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only process paid orders
    if (order.status !== "paid") {
      console.log("[inventory-deduct] Order not paid, skipping deduction");
      return new Response(
        JSON.stringify({ success: true, warnings: [], error: null, deducted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const branchId = order.branch_id;
    if (!branchId) {
      console.log("[inventory-deduct] No branch_id on order, skipping deduction");
      return new Response(
        JSON.stringify({ success: true, warnings: [], error: null, deducted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order items (non-voided)
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("menu_item_id, quantity")
      .eq("order_id", order_id)
      .eq("voided", false);

    if (itemsError) {
      console.error("[inventory-deduct] Failed to load order items:", itemsError);
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Failed to load order items", deducted_count: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!orderItems || orderItems.length === 0) {
      console.log("[inventory-deduct] No order items found");
      return new Response(
        JSON.stringify({ success: true, warnings: [], error: null, deducted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Aggregate quantities by menu_item_id
    const menuItemQty: Record<string, number> = {};
    for (const item of orderItems) {
      if (item.menu_item_id) {
        menuItemQty[item.menu_item_id] = (menuItemQty[item.menu_item_id] || 0) + item.quantity;
      }
    }

    const menuItemIds = Object.keys(menuItemQty);
    if (menuItemIds.length === 0) {
      console.log("[inventory-deduct] No menu items to process");
      return new Response(
        JSON.stringify({ success: true, warnings: [], error: null, deducted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[inventory-deduct] Menu item quantities:", menuItemQty);

    // Step 3: Load active recipes for these menu items
    const { data: recipes, error: recipesError } = await supabaseAdmin
      .from("menu_item_recipes")
      .select("id, menu_item_id")
      .eq("restaurant_id", order.restaurant_id)
      .eq("is_active", true)
      .in("menu_item_id", menuItemIds);

    if (recipesError) {
      console.error("[inventory-deduct] Failed to load recipes:", recipesError);
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Failed to load recipes", deducted_count: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipes || recipes.length === 0) {
      console.log("[inventory-deduct] No recipes found for menu items");
      return new Response(
        JSON.stringify({ success: true, warnings: [], error: null, deducted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipeIds = recipes.map(r => r.id);
    const recipeMenuMap = new Map(recipes.map(r => [r.id, r.menu_item_id]));

    // Load recipe lines
    const { data: recipeLines, error: linesError } = await supabaseAdmin
      .from("menu_item_recipe_lines")
      .select("recipe_id, inventory_item_id, qty_in_base")
      .in("recipe_id", recipeIds);

    if (linesError) {
      console.error("[inventory-deduct] Failed to load recipe lines:", linesError);
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Failed to load recipe lines", deducted_count: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipeLines || recipeLines.length === 0) {
      console.log("[inventory-deduct] No recipe lines found");
      return new Response(
        JSON.stringify({ success: true, warnings: [], error: null, deducted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3b: Calculate required base qty per inventory_item_id
    const requiredByItem: Record<string, number> = {};
    for (const line of recipeLines) {
      const menuItemId = recipeMenuMap.get(line.recipe_id);
      if (!menuItemId) continue;
      
      const orderedQty = menuItemQty[menuItemId] || 0;
      const requiredBase = Number(line.qty_in_base) * orderedQty;
      
      requiredByItem[line.inventory_item_id] = (requiredByItem[line.inventory_item_id] || 0) + requiredBase;
    }

    console.log("[inventory-deduct] Required by item:", requiredByItem);

    const inventoryItemIds = Object.keys(requiredByItem);
    if (inventoryItemIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, warnings: [], error: null, deducted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Get current stock levels and item info
    const { data: stockLevels, error: stockError } = await supabaseAdmin
      .from("inventory_stock_levels")
      .select("item_id, on_hand_base")
      .eq("branch_id", branchId)
      .in("item_id", inventoryItemIds);

    if (stockError) {
      console.error("[inventory-deduct] Failed to load stock levels:", stockError);
      return new Response(
        JSON.stringify({ success: false, warnings: [], error: "Failed to load stock levels", deducted_count: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get inventory item names and base_unit_id
    const { data: inventoryItems, error: invItemsError } = await supabaseAdmin
      .from("inventory_items")
      .select("id, name, base_unit_id")
      .in("id", inventoryItemIds);

    if (invItemsError) {
      console.error("[inventory-deduct] Failed to load inventory items:", invItemsError);
    }

    const itemNameMap = new Map((inventoryItems || []).map(i => [i.id, { name: i.name, base_unit_id: i.base_unit_id }]));
    const stockMap = new Map((stockLevels || []).map(s => [s.item_id, Number(s.on_hand_base)]));

    // Step 5: Calculate new stock and warnings
    const warnings: DeductionWarning[] = [];
    const deductions: {
      item_id: string;
      required: number;
      current: number;
      new_on_hand: number;
      base_unit_id: string | null;
    }[] = [];

    for (const [itemId, required] of Object.entries(requiredByItem)) {
      const current = stockMap.get(itemId) || 0;
      const newOnHand = current - required;
      const itemInfo = itemNameMap.get(itemId);

      deductions.push({
        item_id: itemId,
        required,
        current,
        new_on_hand: newOnHand,
        base_unit_id: itemInfo?.base_unit_id || null,
      });

      if (newOnHand < 0) {
        warnings.push({
          inventory_item_id: itemId,
          name: itemInfo?.name || "Unknown",
          current_on_hand: current,
          required,
          new_on_hand: newOnHand,
        });
      }
    }

    console.log("[inventory-deduct] Deductions to process:", deductions.length);
    console.log("[inventory-deduct] Warnings:", warnings.length);

    // Step 6: Insert ledger rows (inventory_transactions)
    const transactions = deductions.map(d => ({
      restaurant_id: order.restaurant_id,
      branch_id: branchId,
      item_id: d.item_id,
      qty: -d.required, // Negative for deduction
      unit_id: d.base_unit_id,
      qty_in_base: -d.required,
      txn_type: "SALE_DEDUCTION",
      reference_type: "ORDER",
      reference_id: order_id,
      notes: "Auto deduction on payment",
      created_by: userId,
    }));

    const { error: txnError } = await supabaseAdmin
      .from("inventory_transactions")
      .insert(transactions);

    if (txnError) {
      console.error("[inventory-deduct] Failed to insert transactions:", txnError);
      // Don't fail the whole operation - payment already succeeded
      // Log audit for failure
      await supabaseAdmin.from("audit_logs").insert({
        restaurant_id: order.restaurant_id,
        user_id: userId,
        action: "INVENTORY_DEDUCTION_FAILED",
        entity_type: "order",
        entity_id: order_id,
        details: { error: txnError.message, items_count: deductions.length },
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          warnings, 
          error: "Failed to record inventory transactions", 
          deducted_count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 7: Update stock levels
    for (const d of deductions) {
      // Upsert stock level
      const { error: updateError } = await supabaseAdmin
        .from("inventory_stock_levels")
        .upsert({
          restaurant_id: order.restaurant_id,
          branch_id: branchId,
          item_id: d.item_id,
          on_hand_base: d.new_on_hand,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "branch_id,item_id",
        });

      if (updateError) {
        console.error("[inventory-deduct] Failed to update stock level for item:", d.item_id, updateError);
      }
    }

    // Step 8: Write audit logs
    await supabaseAdmin.from("audit_logs").insert({
      restaurant_id: order.restaurant_id,
      user_id: userId,
      action: "INVENTORY_SALE_DEDUCTION_DONE",
      entity_type: "order",
      entity_id: order_id,
      details: {
        order_id,
        items_deducted: deductions.length,
        total_ingredients: Object.keys(requiredByItem).length,
      },
    });

    if (warnings.length > 0) {
      await supabaseAdmin.from("audit_logs").insert({
        restaurant_id: order.restaurant_id,
        user_id: userId,
        action: "INVENTORY_NEGATIVE_AFTER_SALE",
        entity_type: "order",
        entity_id: order_id,
        details: {
          order_id,
          warnings: warnings.slice(0, 10), // Limit to 10 for storage
        },
      });
    }

    console.log("[inventory-deduct] Deduction complete. Success:", deductions.length, "Warnings:", warnings.length);

    return new Response(
      JSON.stringify({
        success: true,
        warnings,
        error: null,
        deducted_count: deductions.length,
      } as DeductionResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[inventory-deduct] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, warnings: [], error: message, deducted_count: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
