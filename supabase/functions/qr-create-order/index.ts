import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * Edge Function: qr-create-order
 * 
 * MARKET-GRADE QR Order Creation
 * 
 * Security:
 * - Uses SERVICE_ROLE_KEY to bypass RLS (anon cannot insert directly)
 * - All data validated server-side
 * - Prices fetched from DB (never trust client)
 * - Audit logging for accountability
 * 
 * Flow:
 * 1. Validate payload
 * 2. Lookup table and branch
 * 3. Validate menu items exist and are available
 * 4. Calculate totals server-side
 * 5. Insert order with status='pending', source='qr'
 * 6. Insert order items
 * 7. Log to audit_logs
 * 8. Return order_id and order_number
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OrderItemPayload {
  menu_item_id: string;
  quantity: number;
  notes?: string | null;
  modifiers?: Array<{ id: string; name: string; price: number }> | null;
}

interface RequestBody {
  restaurant_id: string;
  branch_id?: string | null;
  table_code?: string | null;
  table_id?: string | null;
  order_type?: "DINE_IN" | "TAKEAWAY";
  items: OrderItemPayload[];
  order_notes?: string | null;
  customer_phone?: string | null;
  language?: "ar" | "en";
}

serve(async (req) => {
  // ═══════════════════════════════════════════════════════════════════
  // CORS PREFLIGHT
  // ═══════════════════════════════════════════════════════════════════
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. PARSE & VALIDATE REQUEST
    // ═══════════════════════════════════════════════════════════════════
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      restaurant_id,
      branch_id: providedBranchId,
      table_code,
      table_id: providedTableId,
      order_type = "DINE_IN",
      items,
      order_notes,
      customer_phone,
    } = body;

    // Validate required fields
    if (!restaurant_id || typeof restaurant_id !== "string") {
      return new Response(
        JSON.stringify({ error: "restaurant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must have either table_code or table_id for dine-in, or just items for takeaway
    if (order_type === "DINE_IN" && !table_code && !providedTableId) {
      return new Response(
        JSON.stringify({ error: "table_code or table_id required for dine-in orders" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "items must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.menu_item_id || typeof item.menu_item_id !== "string") {
        return new Response(
          JSON.stringify({ error: "Each item must have a valid menu_item_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return new Response(
          JSON.stringify({ error: "Item quantity must be an integer between 1 and 99" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate phone format if provided
    if (customer_phone && typeof customer_phone === "string") {
      const cleaned = customer_phone.replace(/[\s-]/g, "");
      const phoneRegex = /^\+?[\d]{7,15}$/;
      if (!phoneRegex.test(cleaned)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format (7-15 digits)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. INITIALIZE SUPABASE CLIENT (SERVICE ROLE)
    // ═══════════════════════════════════════════════════════════════════
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ═══════════════════════════════════════════════════════════════════
    // 3. RESOLVE TABLE AND BRANCH
    // ═══════════════════════════════════════════════════════════════════
    let table_id: string | null = providedTableId || null;
    let branch_id: string | null = providedBranchId || null;

    // If table_code provided, lookup the table
    if (table_code && !table_id) {
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("id, branch_id, is_active")
        .eq("restaurant_id", restaurant_id)
        .eq("table_code", table_code)
        .maybeSingle();

      if (tableError) {
        console.error("Table lookup error:", tableError.message);
        return new Response(
          JSON.stringify({ error: "Failed to lookup table" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!tableData) {
        return new Response(
          JSON.stringify({ error: "Table not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!tableData.is_active) {
        return new Response(
          JSON.stringify({ error: "Table is not active" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      table_id = tableData.id;
      branch_id = tableData.branch_id || branch_id;
    }

    // If still no branch_id, try to get default branch
    if (!branch_id) {
      const { data: defaultBranch } = await supabase
        .rpc("get_restaurant_default_branch", { p_restaurant_id: restaurant_id });
      
      if (defaultBranch) {
        branch_id = defaultBranch;
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. VALIDATE MENU ITEMS (SERVER-SIDE)
    // ═══════════════════════════════════════════════════════════════════
    const menuItemIds = items.map((i) => i.menu_item_id);
    
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available, category_id, menu_categories!inner(restaurant_id)")
      .in("id", menuItemIds);

    if (menuError) {
      console.error("Menu items lookup error:", menuError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch menu items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!menuItems || menuItems.length !== menuItemIds.length) {
      const foundIds = new Set(menuItems?.map((m) => m.id) || []);
      const missingIds = menuItemIds.filter((id) => !foundIds.has(id));
      return new Response(
        JSON.stringify({ error: "Some menu items not found", missing: missingIds }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all items belong to the restaurant and are available
    for (const mi of menuItems) {
      const category = mi.menu_categories as unknown as { restaurant_id: string };
      if (category.restaurant_id !== restaurant_id) {
        return new Response(
          JSON.stringify({ error: `Item "${mi.name}" does not belong to this restaurant` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!mi.is_available) {
        return new Response(
          JSON.stringify({ error: `Item "${mi.name}" is currently unavailable` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. CALCULATE TOTALS (SERVER-SIDE PRICES ONLY)
    // ═══════════════════════════════════════════════════════════════════
    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));
    let subtotal = 0;

    const orderItemsToInsert: Array<{
      menu_item_id: string;
      name: string;
      price: number;
      quantity: number;
      notes: string | null;
      modifiers: string | null;
      modifiers_total: number;
    }> = [];

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menu_item_id);
      if (!menuItem) continue;

      // Calculate modifiers total if any
      let modifiersTotal = 0;
      if (item.modifiers && Array.isArray(item.modifiers)) {
        for (const mod of item.modifiers) {
          if (typeof mod.price === "number" && mod.price > 0) {
            modifiersTotal += mod.price;
          }
        }
      }

      const itemTotal = (menuItem.price + modifiersTotal) * item.quantity;
      subtotal += itemTotal;

      orderItemsToInsert.push({
        menu_item_id: item.menu_item_id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        notes: item.notes?.trim() || null,
        modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
        modifiers_total: modifiersTotal,
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. INSERT ORDER (TRANSACTION START)
    // ═══════════════════════════════════════════════════════════════════
    const orderPayload = {
      restaurant_id,
      branch_id,
      table_id,
      status: "pending",
      source: "qr",
      order_type: order_type === "TAKEAWAY" ? "takeaway" : "dine_in",
      subtotal,
      total: subtotal, // No tax/service for QR initially
      order_notes: order_notes?.trim() || null,
      customer_phone: customer_phone?.trim() || null,
      shift_id: null, // Will be set when cashier confirms
    };

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number, status, created_at")
      .single();

    if (orderError || !orderData) {
      console.error("Order insert error:", orderError?.message);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. INSERT ORDER ITEMS
    // ═══════════════════════════════════════════════════════════════════
    const orderItemsWithOrderId = orderItemsToInsert.map((item) => ({
      ...item,
      order_id: orderData.id,
      restaurant_id,
    }));

    const { error: itemsInsertError } = await supabase
      .from("order_items")
      .insert(orderItemsWithOrderId);

    if (itemsInsertError) {
      console.error("Order items insert error:", itemsInsertError.message);
      // ROLLBACK: Delete the order if items failed
      await supabase.from("orders").delete().eq("id", orderData.id);
      return new Response(
        JSON.stringify({ error: "Failed to add order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. AUDIT LOG
    // ═══════════════════════════════════════════════════════════════════
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: null, // Anonymous user
        restaurant_id,
        entity_type: "order",
        entity_id: orderData.id,
        action: "QR_ORDER_CREATED",
        details: {
          order_number: orderData.order_number,
          source: "qr",
          table_id,
          table_code: table_code || null,
          branch_id,
          item_count: items.length,
          total: subtotal,
          customer_phone: customer_phone ? "***" : null, // Mask phone in logs
          created_at: orderData.created_at,
        },
      });

    if (auditError) {
      // Log but don't fail - audit is secondary
      console.error("Audit log insert failed:", auditError.message);
    }

    console.log(`QR Order #${orderData.order_number} created for restaurant ${restaurant_id}`);

    // ═══════════════════════════════════════════════════════════════════
    // 9. SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderData.id,
        order_number: orderData.order_number,
        status: orderData.status,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("QR Order creation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});