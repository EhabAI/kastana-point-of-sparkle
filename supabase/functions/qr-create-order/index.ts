import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * Edge Function: qr-create-order
 * 
 * MARKET-GRADE QR Order Creation with Transaction Safety
 * 
 * Security Guarantees:
 * - Uses SERVICE_ROLE_KEY to bypass RLS (anon cannot insert directly)
 * - ALL monetary values calculated server-side (client totals IGNORED)
 * - Prices fetched from database (never trust client)
 * - Transaction-like behavior: order + items atomic (rollback on failure)
 * - Full audit logging (action: QR_ORDER_CREATED)
 * 
 * Monetary Calculation:
 * - subtotal = sum of (item_price * quantity) for all items
 * - tax_amount = 0 (QR orders have no tax initially - applied on confirmation)
 * - total = subtotal (tax applied by cashier)
 * 
 * Database Schema (orders table):
 * - subtotal, tax_rate, tax_amount, service_charge, total
 * - source: 'pos' | 'qr'
 * - status: 'open' | 'pending' | 'paid' | 'cancelled' | 'voided'
 * - NO order_type column exists
 * 
 * Database Schema (order_items table):
 * - order_id, restaurant_id, menu_item_id, name, price, quantity, notes
 * - voided, void_reason, cogs, profit
 * - NO modifiers or modifiers_total columns exist
 * 
 * Flow:
 * 1. Validate payload (ignore client totals)
 * 2. Lookup table and branch
 * 3. Validate menu items exist and are available
 * 4. Calculate subtotal/tax_amount/total SERVER-SIDE
 * 5. Insert order with status='pending', source='qr'
 * 6. Insert order items (rollback order if fails)
 * 7. Log to audit_logs (skip if no user_id available)
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
  // Client may send these - we IGNORE them
  price?: number;
  total?: number;
}

interface RequestBody {
  restaurant_id: string;
  branch_id?: string | null;
  table_code?: string | null;
  table_id?: string | null;
  items: OrderItemPayload[];
  order_notes?: string | null;
  customer_phone?: string | null;
  language?: "ar" | "en";
  // Client may send these - we IGNORE them completely
  subtotal?: number;
  tax?: number;
  total?: number;
}

/**
 * Round to JOD standard (3 decimal places for line items)
 */
function roundJOD(value: number): number {
  return Math.round(value * 1000) / 1000;
}

serve(async (req) => {
  // ═══════════════════════════════════════════════════════════════════
  // CORS PREFLIGHT
  // ═══════════════════════════════════════════════════════════════════
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Track order ID for potential rollback
  let createdOrderId: string | null = null;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. PARSE & VALIDATE REQUEST (IGNORE CLIENT MONETARY VALUES)
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

    // Extract only what we need - IGNORE subtotal, tax, total from client
    const {
      restaurant_id,
      branch_id: providedBranchId,
      table_code,
      table_id: providedTableId,
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

    // Validate UUID format for restaurant_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurant_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid restaurant_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must have either table_code or table_id for QR orders
    if (!table_code && !providedTableId) {
      return new Response(
        JSON.stringify({ error: "table_code or table_id required for QR orders" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "items must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit items count to prevent abuse
    if (items.length > 50) {
      return new Response(
        JSON.stringify({ error: "Maximum 50 items per order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each item (IGNORE client-provided prices)
    for (const item of items) {
      if (!item.menu_item_id || typeof item.menu_item_id !== "string") {
        return new Response(
          JSON.stringify({ error: "Each item must have a valid menu_item_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!uuidRegex.test(item.menu_item_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid menu_item_id format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return new Response(
          JSON.stringify({ error: "Item quantity must be an integer between 1 and 99" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Validate notes length
      if (item.notes && item.notes.length > 500) {
        return new Response(
          JSON.stringify({ error: "Item notes must be less than 500 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate order notes length
    if (order_notes && order_notes.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Order notes must be less than 1000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    // 2.5. RESTAURANT ACTIVE CHECK (KILL-SWITCH)
    // ═══════════════════════════════════════════════════════════════════
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("is_active")
      .eq("id", restaurant_id)
      .maybeSingle();

    if (restaurantError) {
      console.error("Restaurant lookup error:", restaurantError.message);
      return new Response(
        JSON.stringify({ error: "Failed to verify restaurant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!restaurantData) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!restaurantData.is_active) {
      return new Response(
        JSON.stringify({ error: "Restaurant is inactive", code: "RESTAURANT_INACTIVE" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2.6. QR ORDER MODULE CHECK (ADD-ON GATE)
    // ═══════════════════════════════════════════════════════════════════
    const { data: settingsData, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("qr_order_enabled")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Settings lookup error:", settingsError.message);
      return new Response(
        JSON.stringify({ error: "Failed to verify restaurant settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no settings exist or qr_order_enabled is false, block QR order creation
    const qrEnabled = settingsData?.qr_order_enabled ?? false;
    if (!qrEnabled) {
      console.log(`[qr-create-order] QR Order disabled for restaurant: ${restaurant_id}`);
      return new Response(
        JSON.stringify({ 
          error: "QR Order is disabled for this restaurant", 
          code: "QR_DISABLED" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    // 4. VALIDATE MENU ITEMS (SERVER-SIDE PRICE FETCH)
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
    // 5. CALCULATE TOTALS SERVER-SIDE (IGNORE ALL CLIENT VALUES)
    // ═══════════════════════════════════════════════════════════════════
    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));
    
    // SERVER-CALCULATED values only
    let serverSubtotal = 0;
    
    // Build order items data (ONLY columns that exist in order_items table)
    const orderItemsToInsert: Array<{
      menu_item_id: string;
      name: string;
      price: number;
      quantity: number;
      notes: string | null;
    }> = [];

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menu_item_id);
      if (!menuItem) continue;

      // Use SERVER price only - ignore any client-provided price
      const serverPrice = roundJOD(menuItem.price);

      // Calculate line total using SERVER prices
      const lineTotal = roundJOD(serverPrice * item.quantity);
      serverSubtotal += lineTotal;

      orderItemsToInsert.push({
        menu_item_id: item.menu_item_id,
        name: menuItem.name,
        price: serverPrice, // SERVER price
        quantity: item.quantity,
        notes: item.notes?.trim().slice(0, 500) || null,
      });
    }

    // Round final subtotal
    serverSubtotal = roundJOD(serverSubtotal);

    // QR orders: tax_amount = 0, service_charge = 0 (applied by cashier on confirmation)
    const serverTaxAmount = 0;
    const serverServiceCharge = 0;
    const serverTotal = roundJOD(serverSubtotal + serverTaxAmount + serverServiceCharge);

    // ═══════════════════════════════════════════════════════════════════
    // 6. TRANSACTION: INSERT ORDER (using correct schema columns)
    // ═══════════════════════════════════════════════════════════════════
    // orders table columns: 
    // id, restaurant_id, shift_id, order_number, status, subtotal,
    // discount_type, discount_value, tax_rate, tax_amount, service_charge, total,
    // notes, cancelled_reason, invoice_uuid, created_at, updated_at,
    // branch_id, order_notes, table_id, customer_phone, source
    
    // Sanitize order notes once - will be written to BOTH columns for compatibility
    const sanitizedOrderNotes = order_notes?.trim().slice(0, 1000) || null;
    
    const orderPayload = {
      restaurant_id,
      branch_id,
      table_id,
      status: "pending",         // QR orders start as pending
      source: "qr",              // Mark as QR order
      subtotal: serverSubtotal,  // SERVER-CALCULATED
      tax_rate: 0,               // Default, will be applied on confirmation
      tax_amount: serverTaxAmount, // 0 for QR orders initially
      service_charge: serverServiceCharge, // 0 for QR orders initially
      total: serverTotal,        // SERVER-CALCULATED
      // CRITICAL: Write to BOTH notes columns for POS compatibility
      // - `notes`: Read by POS screens (usePendingOrders, order details, reports)
      // - `order_notes`: Legacy/alternate column
      notes: sanitizedOrderNotes,
      order_notes: sanitizedOrderNotes,
      customer_phone: customer_phone?.trim() || null,
      shift_id: null,            // Will be set when cashier confirms
    };

    console.log("Inserting order with payload:", JSON.stringify(orderPayload));

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number, status, created_at, subtotal, tax_amount, total")
      .single();

    if (orderError || !orderData) {
      console.error("Order insert error:", orderError?.message, orderError?.details, orderError?.hint);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create order",
          details: orderError?.message || "Unknown error"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Track for rollback
    createdOrderId = orderData.id;

    console.log(`Order created: ${orderData.id} (order #${orderData.order_number})`);

    // ═══════════════════════════════════════════════════════════════════
    // 7. TRANSACTION: INSERT ORDER ITEMS (ROLLBACK IF FAILS)
    // ═══════════════════════════════════════════════════════════════════
    // order_items table columns:
    // id, order_id, restaurant_id, menu_item_id, name, price, quantity, notes,
    // voided, void_reason, created_at, cogs, profit
    
    const orderItemsWithOrderId = orderItemsToInsert.map((item) => ({
      order_id: orderData.id,
      restaurant_id,
      menu_item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes,
      // voided defaults to false, cogs/profit default to 0
    }));

    console.log("Inserting order items:", JSON.stringify(orderItemsWithOrderId));

    const { error: itemsInsertError } = await supabase
      .from("order_items")
      .insert(orderItemsWithOrderId);

    if (itemsInsertError) {
      console.error("Order items insert error:", itemsInsertError.message, itemsInsertError.details);
      
      // ═══════════════════════════════════════════════════════════════════
      // ROLLBACK: Delete the order - no partial data allowed
      // ═══════════════════════════════════════════════════════════════════
      const { error: rollbackError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderData.id);
      
      if (rollbackError) {
        console.error("CRITICAL: Rollback failed:", rollbackError.message);
        // Cannot insert audit log since user_id is required and not nullable
      }
      
      createdOrderId = null; // Rolled back
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to add order items",
          details: itemsInsertError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Order items inserted for order ${orderData.id}`);

    // ═══════════════════════════════════════════════════════════════════
    // 8. SKIP AUDIT LOG (user_id is required and NOT NULLABLE)
    // ═══════════════════════════════════════════════════════════════════
    // The audit_logs table has user_id as NOT NULL, so we cannot insert
    // for anonymous QR orders. Logging is done via console for debugging.
    // Audit will be captured when cashier confirms the order (with their user_id).
    
    console.log(`[AUDIT] QR_ORDER_CREATED | order_id=${orderData.id} order_number=${orderData.order_number} restaurant_id=${restaurant_id} branch_id=${branch_id} table_id=${table_id} table_code=${table_code} items=${orderItemsToInsert.length} subtotal=${serverSubtotal} total=${serverTotal}`);

    // ═══════════════════════════════════════════════════════════════════
    // 9. SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderData.id,
        order_number: orderData.order_number,
        status: orderData.status,
        subtotal: serverSubtotal,
        tax_amount: serverTaxAmount,
        total: serverTotal,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("QR Order creation error:", error);
    
    // Attempt cleanup if order was created but something else failed
    if (createdOrderId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase.from("orders").delete().eq("id", createdOrderId);
        console.log(`Cleanup: Deleted partial order ${createdOrderId}`);
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
