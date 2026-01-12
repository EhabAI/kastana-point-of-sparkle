import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: confirm-qr-order
 * 
 * MARKET-GRADE QR Order Confirmation with Hardened Validation
 * 
 * Security Guarantees:
 * - Requires valid JWT (cashier authentication)
 * - Validates cashier role and branch assignment
 * - Requires open shift
 * - STRICTLY validates order status = 'pending' (rejects cancelled/open/closed)
 * - Atomic update with WHERE status = 'pending' (prevents race conditions)
 * - Full audit logging (action: QR_ORDER_CONFIRMED)
 * 
 * Hardened Confirmation Rules:
 * - CANNOT confirm if status != 'pending'
 * - CANNOT confirm if order is already 'cancelled'
 * - CANNOT confirm if order is already 'open' or 'closed'
 * - Atomic WHERE clause prevents double-confirmation
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Valid terminal statuses that cannot be confirmed
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
    // 3. AUTHORIZATION: Verify user is a cashier or owner and get their branch
    // ═══════════════════════════════════════════════════════════════════
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, branch_id, restaurant_id")
      .eq("user_id", userId)
      .in("role", ["cashier", "owner"])
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      console.error("Role lookup error:", roleError.message);
      return new Response(
        JSON.stringify({ error: "Authorization check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData || !["cashier", "owner"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only cashiers or owners can confirm QR orders" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userBranchId = roleData.branch_id;
    const userRestaurantId = roleData.restaurant_id;

    if (!userBranchId || !userRestaurantId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: User not assigned to a branch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3.5. RESTAURANT ACTIVE CHECK (KILL-SWITCH)
    // ═══════════════════════════════════════════════════════════════════
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("is_active")
      .eq("id", userRestaurantId)
      .maybeSingle();

    if (restaurantError) {
      console.error("Restaurant lookup error:", restaurantError.message);
      return new Response(
        JSON.stringify({ error: "Failed to verify restaurant status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!restaurantData?.is_active) {
      return new Response(
        JSON.stringify({ error: "Restaurant is inactive", code: "RESTAURANT_INACTIVE" }),
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ error: "Invalid order_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. FETCH ORDER: Validate it exists and check current status
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
          details: "Only QR orders can be confirmed through this endpoint"
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HARDENED: Check if order is in a terminal state (cannot be confirmed)
    if (TERMINAL_STATUSES.includes(order.status)) {
      return new Response(
        JSON.stringify({ 
          error: "Order cannot be confirmed",
          details: `Order is '${order.status}' and cannot be modified`,
          status: order.status
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HARDENED: Check if order was already confirmed
    if (ALREADY_CONFIRMED_STATUSES.includes(order.status)) {
      return new Response(
        JSON.stringify({ 
          error: "Order already confirmed",
          details: `Order is already '${order.status}'`,
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

    // Must match user's branch
    if (order.branch_id !== userBranchId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Order belongs to a different branch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Restaurant must match (extra security layer)
    if (order.restaurant_id !== userRestaurantId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Order belongs to a different restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. ATOMIC UPDATE: Confirm order with WHERE status = 'pending'
    // ═══════════════════════════════════════════════════════════════════
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "open",
        shift_id: openShift.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending") // ATOMIC: Only update if still pending
      .eq("source", "qr")      // Extra safety
      .select("id, order_number, status, shift_id")
      .maybeSingle();

    if (updateError) {
      console.error("Order update error:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Failed to confirm order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no row was updated, race condition occurred
    if (!updatedOrder) {
      return new Response(
        JSON.stringify({ 
          error: "Order confirmation failed",
          details: "Order status changed during confirmation (race condition)"
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 9. AUDIT LOG (action: QR_ORDER_CONFIRMED - UPPER_SNAKE_CASE)
    // ═══════════════════════════════════════════════════════════════════
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: userId,
        restaurant_id: userRestaurantId,
        entity_type: "order",
        entity_id: orderId,
        action: "QR_ORDER_CONFIRMED", // UPPER_SNAKE_CASE
        details: {
          source: "qr",
          order_number: order.order_number,
          shift_id: openShift.id,
          branch_id: userBranchId,
          previous_status: "pending",
          new_status: "open",
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