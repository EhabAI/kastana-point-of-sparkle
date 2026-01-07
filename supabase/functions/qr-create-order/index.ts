import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * Edge Function: qr-create-order
 * 
 * Securely creates QR orders from the public menu page.
 * Uses service role to bypass RLS for inserts.
 * Validates all data server-side.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  menu_item_id: string;
  quantity: number;
  notes?: string | null;
}

interface RequestBody {
  restaurant_id: string;
  table_code: string;
  items: OrderItem[];
  order_notes?: string | null;
  customer_phone?: string | null;
  language?: "ar" | "en";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { restaurant_id, table_code, items, order_notes, customer_phone, language } = body;

    // === VALIDATION ===

    // Required fields
    if (!restaurant_id || typeof restaurant_id !== "string") {
      return new Response(
        JSON.stringify({ error: "restaurant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!table_code || typeof table_code !== "string") {
      return new Response(
        JSON.stringify({ error: "table_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "items must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each item has valid quantity
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

    // Validate customer phone format if provided
    if (customer_phone && typeof customer_phone === "string") {
      const phoneRegex = /^\+?[\d\s-]{7,15}$/;
      if (!phoneRegex.test(customer_phone.replace(/\s/g, ""))) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === DATABASE OPERATIONS ===

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Lookup table by restaurant_id and table_code
    const { data: tableData, error: tableError } = await supabase
      .from("restaurant_tables")
      .select("id, branch_id, is_active")
      .eq("restaurant_id", restaurant_id)
      .eq("table_code", table_code)
      .single();

    if (tableError || !tableData) {
      console.error("Table lookup error:", tableError);
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

    const table_id = tableData.id;
    const branch_id = tableData.branch_id || null;

    // 2. Validate and fetch menu items from DB
    const menuItemIds = items.map((i) => i.menu_item_id);
    
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available, category_id, menu_categories!inner(restaurant_id)")
      .in("id", menuItemIds);

    if (menuError) {
      console.error("Menu items lookup error:", menuError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch menu items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!menuItems || menuItems.length !== menuItemIds.length) {
      return new Response(
        JSON.stringify({ error: "Some menu items not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all items belong to the same restaurant and are available
    for (const mi of menuItems) {
      const category = mi.menu_categories as unknown as { restaurant_id: string };
      if (category.restaurant_id !== restaurant_id) {
        return new Response(
          JSON.stringify({ error: "Menu item does not belong to this restaurant" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!mi.is_available) {
        return new Response(
          JSON.stringify({ error: `Item "${mi.name}" is not available` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Calculate totals using server-side prices ONLY
    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));
    let subtotal = 0;

    const orderItemsToInsert: {
      menu_item_id: string;
      name: string;
      price: number;
      quantity: number;
      notes: string | null;
    }[] = [];

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menu_item_id);
      if (!menuItem) continue;

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItemsToInsert.push({
        menu_item_id: item.menu_item_id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        notes: item.notes?.trim() || null,
      });
    }

    // 4. Insert order with source='qr', status='pending', shift_id=NULL
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id,
        branch_id,
        table_id,
        status: "pending",
        subtotal,
        total: subtotal, // No tax/discount for QR orders initially
        order_notes: order_notes?.trim() || null,
        customer_phone: customer_phone?.trim() || null,
        source: "qr",
        shift_id: null,
      })
      .select("id, order_number, status")
      .single();

    if (orderError || !orderData) {
      console.error("Order insert error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Insert order items
    const orderItemsWithOrderId = orderItemsToInsert.map((item) => ({
      ...item,
      order_id: orderData.id,
      restaurant_id,
    }));

    const { error: itemsInsertError } = await supabase
      .from("order_items")
      .insert(orderItemsWithOrderId);

    if (itemsInsertError) {
      console.error("Order items insert error:", itemsInsertError);
      // Rollback: delete the order if items failed
      await supabase.from("orders").delete().eq("id", orderData.id);
      return new Response(
        JSON.stringify({ error: "Failed to add order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`QR Order created: ${orderData.order_number} for table ${table_code}`);

    // 6. Return success
    return new Response(
      JSON.stringify({
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
