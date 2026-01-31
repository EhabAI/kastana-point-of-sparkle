import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode = 'not_authorized' | 'missing_fields' | 'invalid_payment_method' | 'invalid_amount' | 'order_not_found' | 'order_not_open' | 'restaurant_mismatch' | 'card_overpayment' | 'underpayment' | 'race_condition' | 'payment_failed' | 'unexpected'

// Helper: round to 3 decimals using HALF-UP (JOD standard)
const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

// Allowed payment methods (must match DB constraint)
const ALLOWED_PAYMENT_METHODS = ["cash", "visa", "cliq", "zain_cash", "orange_money", "umniah_wallet"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function errorResponse(code: ErrorCode, status = 400) {
  return json({ error: { code } }, status)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[complete-payment] Missing or invalid Authorization header");
      return errorResponse('not_authorized', 401);
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("[complete-payment] JWT validation failed:", claimsError);
      return errorResponse('not_authorized', 401);
    }

    const userId = claimsData.claims.sub;
    console.log("[complete-payment] Authenticated user:", userId);

    // Parse request body
    const { orderId, payments } = await req.json();

    if (!orderId || !payments || !Array.isArray(payments) || payments.length === 0) {
      console.error("[complete-payment] Invalid request body:", { orderId, payments });
      return errorResponse('missing_fields', 400);
    }

    // Validate payment methods
    for (const payment of payments) {
      if (!ALLOWED_PAYMENT_METHODS.includes(payment.method)) {
        console.error("[complete-payment] Invalid payment method:", payment.method);
        return errorResponse('invalid_payment_method', 400);
      }
      if (typeof payment.amount !== "number" || payment.amount <= 0) {
        console.error("[complete-payment] Invalid payment amount:", payment.amount);
        return errorResponse('invalid_amount', 400);
      }
    }

    // Use service role client for atomic transaction
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 1: Validate user role (cashier or owner)
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", userId)
      .in("role", ["cashier", "owner"])
      .single();

    if (roleError || !userRole) {
      console.error("[complete-payment] User role validation failed:", roleError);
      return errorResponse('not_authorized', 403);
    }

    console.log("[complete-payment] User role:", userRole.role);

    // Step 2: Fetch order and validate status (atomic lock simulation)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, total, restaurant_id, table_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[complete-payment] Order not found:", orderError);
      return errorResponse('order_not_found', 404);
    }

    console.log("[complete-payment] Order found:", { id: order.id, status: order.status, total: order.total });

    // Step 3: Validate order status is 'open'
    if (order.status !== "open") {
      console.error("[complete-payment] Order not open:", order.status);
      return errorResponse('order_not_open', 409);
    }

    // Step 4: Validate user has access to this restaurant
    let userRestaurantId: string;
    
    if (userRole.role === "owner") {
      // Get owner's restaurant
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .single();
      
      if (!restaurant) {
        console.error("[complete-payment] Owner restaurant not found");
        return errorResponse('restaurant_mismatch', 403);
      }
      userRestaurantId = restaurant.id;
    } else {
      userRestaurantId = userRole.restaurant_id;
    }

    if (order.restaurant_id !== userRestaurantId) {
      console.error("[complete-payment] Restaurant mismatch:", { order: order.restaurant_id, user: userRestaurantId });
      return errorResponse('restaurant_mismatch', 403);
    }

    // Step 5: Validate restaurant subscription is active (includes is_active + subscription check)
    const { isActive: subscriptionActive } = await checkSubscriptionActive(order.restaurant_id);
    if (!subscriptionActive) {
      console.error("[complete-payment] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    // Step 6: Validate payment totals
    const orderTotal = roundJOD(order.total);
    const paymentTotal = roundJOD(payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0));
    const allCash = payments.every((p: { method: string }) => p.method === "cash");

    // Card payments must be exact (no overpayment)
    if (!allCash && paymentTotal > orderTotal + 0.001) {
      console.error("[complete-payment] Card overpayment not allowed:", { paymentTotal, orderTotal });
      return errorResponse('card_overpayment', 400);
    }

    // Total payments must cover the order
    if (paymentTotal < orderTotal - 0.001) {
      console.error("[complete-payment] Underpayment:", { paymentTotal, orderTotal });
      return errorResponse('underpayment', 400);
    }

    console.log("[complete-payment] Payment validation passed:", { paymentTotal, orderTotal, allCash });

    // Step 7: ATOMIC OPERATION - Check status again and update in one go
    // MARKET-GRADE KITCHEN WORKFLOW:
    // - DINE-IN (has table_id): Already in kitchen (status="new"), set to "paid"
    // - TAKEAWAY (no table_id): Still waiting (status="open"), set to "new" to appear in KDS
    const isDineIn = !!order.table_id;
    const newStatus = isDineIn ? "paid" : "new";
    
    // Valid payment statuses:
    // - "open": Takeaway orders waiting for payment
    // - "new": Dine-in orders already in kitchen, now being paid
    const validPaymentStatuses = isDineIn ? ["new", "open"] : ["open"];
    
    console.log(`[complete-payment] Order type: ${isDineIn ? 'DINE-IN' : 'TAKEAWAY'}, current status: ${order.status}, setting status to: ${newStatus}`);
    
    // Verify current status is valid for payment
    if (!validPaymentStatuses.includes(order.status)) {
      console.error(`[complete-payment] Invalid order status for payment: ${order.status}`);
      return errorResponse('order_not_open', 409);
    }
    
    // First update order status - this serves as our lock
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .in("status", validPaymentStatuses)  // Critical: only update if in valid payment status
      .select()
      .single();

    if (updateError || !updatedOrder) {
      console.error("[complete-payment] Failed to update order (race condition or already paid):", updateError);
      return errorResponse('race_condition', 409);
    }

    console.log("[complete-payment] Order status updated to paid");

    // Step 8: Insert payments (order is now locked as 'paid')
    const paymentRecords = payments.map((p: { method: string; amount: number }) => ({
      order_id: orderId,
      restaurant_id: order.restaurant_id,
      method: p.method,
      amount: p.amount,
    }));

    const { data: insertedPayments, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert(paymentRecords)
      .select();

    if (paymentError) {
      // Rollback: set order back to open
      console.error("[complete-payment] Failed to insert payments, rolling back:", paymentError);
      await supabaseAdmin
        .from("orders")
        .update({ status: "open" })
        .eq("id", orderId);
      
      return errorResponse('payment_failed', 500);
    }

    console.log("[complete-payment] Payments inserted successfully:", insertedPayments?.length);

    // Success
    return json({
      success: true,
      order: updatedOrder,
      payments: insertedPayments,
      change: allCash && paymentTotal > orderTotal ? roundJOD(paymentTotal - orderTotal) : 0,
    }, 200);

  } catch (error) {
    console.error("[complete-payment] Unexpected error:", error);
    return errorResponse('unexpected', 500);
  }
});
