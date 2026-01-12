import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferLine {
  itemId: string;
  qty: number;
  unitId: string;
}

interface TransferRequest {
  fromBranchId: string;
  toBranchId: string;
  lines: TransferLine[];
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user role - only owners can transfer between branches
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Only owners can transfer inventory between branches" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restaurantId = roleData.restaurant_id;

    // Validate restaurant is active
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("is_active")
      .eq("id", restaurantId)
      .single();

    if (!restaurant?.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "Restaurant is inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: TransferRequest = await req.json();
    const { fromBranchId, toBranchId, lines, notes } = body;

    if (!fromBranchId || !toBranchId || !lines || lines.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (fromBranchId === toBranchId) {
      return new Response(
        JSON.stringify({ success: false, error: "Source and destination branches must be different" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate both branches belong to restaurant
    const { data: branches, error: branchError } = await supabase
      .from("restaurant_branches")
      .select("id, name")
      .in("id", [fromBranchId, toBranchId])
      .eq("restaurant_id", restaurantId);

    if (branchError || !branches || branches.length !== 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid branches" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    // Validate items exist in source branch
    const itemIds = lines.map((l) => l.itemId);
    const { data: sourceItems, error: itemsError } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .in("id", itemIds)
      .eq("branch_id", fromBranchId)
      .eq("restaurant_id", restaurantId);

    if (itemsError || !sourceItems || sourceItems.length !== itemIds.length) {
      return new Response(
        JSON.stringify({ success: false, error: "One or more items not found in source branch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceItemMap = new Map(sourceItems.map((i) => [i.id, i]));

    // Check for existing items in destination branch or create them
    const { data: destItems } = await supabase
      .from("inventory_items")
      .select("id, name, base_unit_id")
      .eq("branch_id", toBranchId)
      .eq("restaurant_id", restaurantId);

    const destItemByName = new Map(destItems?.map((i) => [i.name, i]) || []);

    // Fetch unit conversions
    const { data: conversions } = await supabase
      .from("inventory_unit_conversions")
      .select("from_unit_id, to_unit_id, multiplier")
      .eq("restaurant_id", restaurantId);

    const conversionMap = new Map<string, number>();
    conversions?.forEach((c) => {
      conversionMap.set(`${c.from_unit_id}->${c.to_unit_id}`, c.multiplier);
    });

    // Get current stock levels for source items
    const { data: stockLevels } = await supabase
      .from("inventory_stock_levels")
      .select("item_id, on_hand_base")
      .in("item_id", itemIds)
      .eq("branch_id", fromBranchId);

    const stockMap = new Map(stockLevels?.map((s) => [s.item_id, s.on_hand_base]) || []);

    // Process transfers atomically
    const transferOutTxns = [];
    const transferInTxns = [];
    const stockUpdatesOut: { itemId: string; qtyInBase: number }[] = [];
    const stockUpdatesIn: { itemId: string; qtyInBase: number }[] = [];
    const createdDestItems: string[] = [];

    for (const line of lines) {
      if (line.qty <= 0) continue;

      const sourceItem = sourceItemMap.get(line.itemId);
      if (!sourceItem) continue;

      // Calculate qty_in_base
      let qtyInBase = line.qty;
      if (line.unitId !== sourceItem.base_unit_id) {
        const convKey = `${line.unitId}->${sourceItem.base_unit_id}`;
        const reverseKey = `${sourceItem.base_unit_id}->${line.unitId}`;
        if (conversionMap.has(convKey)) {
          qtyInBase = line.qty * conversionMap.get(convKey)!;
        } else if (conversionMap.has(reverseKey)) {
          qtyInBase = line.qty / conversionMap.get(reverseKey)!;
        }
      }

      // Check sufficient stock
      const currentStock = stockMap.get(line.itemId) || 0;
      if (currentStock < qtyInBase) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Insufficient stock for ${sourceItem.name}. Available: ${currentStock}, Requested: ${qtyInBase}` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find or create destination item
      let destItemId: string;
      const existingDestItem = destItemByName.get(sourceItem.name);
      
      if (existingDestItem) {
        destItemId = existingDestItem.id;
      } else {
        // Create item in destination branch
        const { data: newItem, error: newItemError } = await supabase
          .from("inventory_items")
          .insert({
            restaurant_id: restaurantId,
            branch_id: toBranchId,
            name: sourceItem.name,
            base_unit_id: sourceItem.base_unit_id,
          })
          .select()
          .single();

        if (newItemError) {
          console.error("[inventory-transfer] Failed to create dest item:", newItemError);
          continue;
        }
        destItemId = newItem.id;
        createdDestItems.push(destItemId);
        destItemByName.set(sourceItem.name, newItem);
      }

      // Create TRANSFER_OUT transaction
      transferOutTxns.push({
        restaurant_id: restaurantId,
        branch_id: fromBranchId,
        item_id: line.itemId,
        txn_type: "TRANSFER_OUT",
        qty: -line.qty,
        unit_id: line.unitId,
        qty_in_base: -qtyInBase,
        reference_type: "transfer",
        notes: notes || `Transfer to ${branchMap.get(toBranchId)}`,
        created_by: user.id,
      });

      // Create TRANSFER_IN transaction
      transferInTxns.push({
        restaurant_id: restaurantId,
        branch_id: toBranchId,
        item_id: destItemId,
        txn_type: "TRANSFER_IN",
        qty: line.qty,
        unit_id: line.unitId,
        qty_in_base: qtyInBase,
        reference_type: "transfer",
        notes: notes || `Transfer from ${branchMap.get(fromBranchId)}`,
        created_by: user.id,
      });

      stockUpdatesOut.push({ itemId: line.itemId, qtyInBase: -qtyInBase });
      stockUpdatesIn.push({ itemId: destItemId, qtyInBase });
    }

    // Insert all transactions
    if (transferOutTxns.length > 0) {
      await supabase.from("inventory_transactions").insert(transferOutTxns);
      await supabase.from("inventory_transactions").insert(transferInTxns);
    }

    // Update stock levels for source branch
    for (const update of stockUpdatesOut) {
      const { data: current } = await supabase
        .from("inventory_stock_levels")
        .select("on_hand_base")
        .eq("item_id", update.itemId)
        .eq("branch_id", fromBranchId)
        .maybeSingle();

      const newOnHand = (current?.on_hand_base || 0) + update.qtyInBase;

      await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: restaurantId,
            branch_id: fromBranchId,
            item_id: update.itemId,
            on_hand_base: newOnHand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,branch_id,item_id" }
        );
    }

    // Update stock levels for destination branch
    for (const update of stockUpdatesIn) {
      const { data: current } = await supabase
        .from("inventory_stock_levels")
        .select("on_hand_base")
        .eq("item_id", update.itemId)
        .eq("branch_id", toBranchId)
        .maybeSingle();

      const newOnHand = (current?.on_hand_base || 0) + update.qtyInBase;

      await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: restaurantId,
            branch_id: toBranchId,
            item_id: update.itemId,
            on_hand_base: newOnHand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,branch_id,item_id" }
        );
    }

    // Write audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      entity_type: "inventory_transfer",
      action: "INVENTORY_TRANSFER",
      details: {
        from_branch_id: fromBranchId,
        from_branch_name: branchMap.get(fromBranchId),
        to_branch_id: toBranchId,
        to_branch_name: branchMap.get(toBranchId),
        item_count: lines.length,
        created_dest_items: createdDestItems.length,
        notes,
      },
    });

    console.log(`[inventory-transfer] Success: ${lines.length} items from ${fromBranchId} to ${toBranchId}`);

    return new Response(
      JSON.stringify({
        success: true,
        transferredItems: lines.length,
        createdDestinationItems: createdDestItems.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[inventory-transfer] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
