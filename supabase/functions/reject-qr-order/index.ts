import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: reject-qr-order
 * 
 * MARKET-GRADE QR Order Rejection with Hardened Validation
 * 
 * Security Guarantees:
 * - Requires valid JWT (cashier authentication)
 * - Validates cashier role and branch assignment
 * - Requires open shift
 * - STRICTLY validates order status = 'pending'
 * - CANNOT reject already cancelled/confirmed orders
 * - Atomic update with WHERE status = 'pending'
 * - Full audit logging (action: QR_ORDER_REJECTED)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Terminal statuses that cannot be rejected
const TERMINAL_STATUSES = ["cancelled", "closed", "refunded", "voided"];
const ALREADY_CONFIRMED_STATUSES = ["open", "confirmed", "paid"];

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
    // 1. AUTHENTICATION: Verify JWT
    // ═══════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    // 2. SERVICE CLIENT
    // ═══════════════════════════════════════════════════════════════════
    const supabase = createClient(supabaseUrl, serviceKey);

    // ═══════════════════════════════════════════════════════════════════
    // 3. AUTHORIZATION: Verify cashier role
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
        JSON.stringify({ error: "Forbidden: Only cashiers can reject QR orders" }),
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
    // 4. SHIFT VALIDATION
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
        JSON.stringify({ error: "No open shift: Please open a shift first" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. PARSE REQUEST
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
    const rawReason = body.reason?.trim() || "Rejected by cashier";
    // Sanitize reason - limit length
    const reason = rawReason.slice(0, 500);

    if (!orderId || typeof orderId !== "string") {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ error: "Invalid order_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. FETCH ORDER
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
    // 7. HARDENED ORDER VALIDATION
    // ═══════════════════════════════════════════════════════════════════
    
    // Must be a QR order
    if (order.source !== "qr") {
      return new Response(
        JSON.stringify({ 
          error: "Invalid order type",
          details: "Only QR orders can be rejected through this endpoint"
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HARDENED: Check if order is already in terminal state
    if (TERMINAL_STATUSES.includes(order.status)) {
      return new Response(
        JSON.stringify({ 
          error: "Order already in terminal state",
          details: `Order is '${order.status}' and cannot be modified`,
          status: order.status
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HARDENED: Cannot reject confirmed orders
    if (ALREADY_CONFIRMED_STATUSES.includes(order.status)) {
      return new Response(
        JSON.stringify({ 
          error: "Cannot reject confirmed order",
          details: `Order is '${order.status}' - use void/cancel instead`,
          status: order.status
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STRICT: Must be pending
    if (order.status !== "pending") {
      return new Response(
        JSON.stringify({ 
          error: "Invalid order status",
          details: `Expected 'pending', got '${order.status}'`,
          status: order.status
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Branch validation
    if (order.branch_id !== cashierBranchId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Order belongs to a different branch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Restaurant validation
    if (order.restaurant_id !== cashierRestaurantId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Order belongs to a different restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. ATOMIC UPDATE with WHERE status = 'pending'
    // ═══════════════════════════════════════════════════════════════════
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending") // ATOMIC: Only if still pending
      .eq("source", "qr")      // Extra safety
      .select("id, order_number, status, cancelled_reason")
      .maybeSingle();

    if (updateError) {
      console.error("Order update error:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Failed to reject order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!updatedOrder) {
      return new Response(
        JSON.stringify({ 
          error: "Order rejection failed",
          details: "Order status changed during rejection (race condition)"
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 9. AUDIT LOG (action: QR_ORDER_REJECTED - UPPER_SNAKE_CASE)
    // ═══════════════════════════════════════════════════════════════════
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: userId,
        restaurant_id: cashierRestaurantId,
        entity_type: "order",
        entity_id: orderId,
        action: "QR_ORDER_REJECTED", // UPPER_SNAKE_CASE normalized
        details: {
          source: "qr",
          order_number: order.order_number,
          shift_id: openShift.id,
          branch_id: cashierBranchId,
          reason: reason,
          previous_status: "pending",
          new_status: "cancelled",
          rejected_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error("Audit log insert failed:", auditError.message);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 10. SUCCESS
    // ═══════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: updatedOrder.id,
          order_number: updatedOrder.order_number,
          status: updatedOrder.status,
          reason: updatedOrder.cancelled_reason,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Unexpected error in reject-qr-order:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});