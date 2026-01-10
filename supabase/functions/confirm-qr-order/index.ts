import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. AUTHENTICATION: Verify JWT from Authorization header
    // ═══════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's JWT to verify identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // ═══════════════════════════════════════════════════════════════════
    // 2. SERVICE CLIENT: Use service role for privileged operations
    // ═══════════════════════════════════════════════════════════════════
    const supabase = createClient(supabaseUrl, serviceKey);

    // ═══════════════════════════════════════════════════════════════════
    // 3. AUTHORIZATION: Verify user is a cashier and get their branch
    // ═══════════════════════════════════════════════════════════════════
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, branch_id, restaurant_id")
      .eq("user_id", userId)
      .eq("role", "cashier")
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      console.error("Role lookup error:", roleError.message);
      return new Response(
        JSON.stringify({ error: "Authorization check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData || roleData.role !== "cashier") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only cashiers can confirm QR orders" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cashierBranchId = roleData.branch_id;
    const cashierRestaurantId = roleData.restaurant_id;

    if (!cashierBranchId || !cashierRestaurantId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Cashier not assigned to a branch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. SHIFT VALIDATION: Cashier must have an open shift
    // ═══════════════════════════════════════════════════════════════════
    const { data: openShift, error: shiftError } = await supabase
      .from("shifts")
      .select("id")
      .eq("cashier_id", userId)
      .eq("status", "open")
      .maybeSingle();

    if (shiftError) {
      console.error("Shift lookup error:", shiftError.message);
      return new Response(
        JSON.stringify({ error: "Shift validation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!openShift) {
      return new Response(
        JSON.stringify({ error: "No open shift: Please open a shift before accepting orders" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. PARSE REQUEST: Get order_id from body
    // ═══════════════════════════════════════════════════════════════════
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = body.order_id;
    if (!orderId || typeof orderId !== "string") {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. FETCH ORDER: Validate it exists and matches criteria
    // ═══════════════════════════════════════════════════════════════════
    const { data: order, error: orderFetchError } = await supabase
      .from("orders")
      .select("id, status, source, branch_id, restaurant_id, order_number")
      .eq("id", orderId)
      .maybeSingle();

    if (orderFetchError) {
      console.error("Order fetch error:", orderFetchError.message);
      return new Response(
        JSON.stringify({ error: "Order lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. ORDER VALIDATION: Check all conditions
    // ═══════════════════════════════════════════════════════════════════
    
    // Must be a QR order
    if (order.source !== "qr") {
      return new Response(
        JSON.stringify({ error: "Invalid order: Not a QR order" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must be pending (prevents double-accept)
    if (order.status !== "pending") {
      return new Response(
        JSON.stringify({ 
          error: "Order already processed",
          details: `Order is currently '${order.status}', not 'pending'`
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must match cashier's branch
    if (order.branch_id !== cashierBranchId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Order belongs to a different branch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Restaurant must match (extra security layer)
    if (order.restaurant_id !== cashierRestaurantId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Order belongs to a different restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. ATOMIC UPDATE: Confirm order and link to shift
    // ═══════════════════════════════════════════════════════════════════
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "open",
        shift_id: openShift.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending") // Optimistic lock - prevents race condition
      .eq("source", "qr")
      .select("id, order_number, status, shift_id")
      .maybeSingle();

    if (updateError) {
      console.error("Order update error:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Failed to confirm order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no row was updated, another cashier confirmed it first
    if (!updatedOrder) {
      return new Response(
        JSON.stringify({ error: "Order was already confirmed by another cashier" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 9. AUDIT LOG: Record the acceptance for accountability
    // ═══════════════════════════════════════════════════════════════════
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: userId,
        restaurant_id: cashierRestaurantId,
        entity_type: "order",
        entity_id: orderId,
        action: "ORDER_CONFIRMED",
        details: {
          source: "qr",
          order_number: order.order_number,
          shift_id: openShift.id,
          branch_id: cashierBranchId,
          confirmed_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      // Log but don't fail - audit is secondary to the main operation
      console.error("Audit log insert failed:", auditError.message);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 10. SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: updatedOrder.id,
          order_number: updatedOrder.order_number,
          status: updatedOrder.status,
          shift_id: updatedOrder.shift_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Unexpected error in confirm-qr-order:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
