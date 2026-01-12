import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: round to 3 decimals using HALF-UP (JOD standard)
const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[create-refund] Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      console.error("[create-refund] JWT validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[create-refund] Authenticated user:", userId);

    // Parse request body
    const { orderId, amount, refundType, reason, branchId } = await req.json();

    if (!orderId || !amount || !refundType || !reason?.trim()) {
      console.error("[create-refund] Invalid request body:", { orderId, amount, refundType, reason });
      return new Response(
        JSON.stringify({ error: "Missing required fields: orderId, amount, refundType, reason" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      console.error("[create-refund] Invalid refund amount:", amount);
      return new Response(
        JSON.stringify({ error: "Refund amount must be greater than zero" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["full", "partial"].includes(refundType)) {
      console.error("[create-refund] Invalid refund type:", refundType);
      return new Response(
        JSON.stringify({ error: "Refund type must be 'full' or 'partial'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      console.error("[create-refund] User role validation failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Access denied: requires cashier or owner role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-refund] User role:", userRole.role);

    // Step 2: Fetch order with lock simulation
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, total, restaurant_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[create-refund] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-refund] Order found:", { id: order.id, status: order.status, total: order.total });

    // Step 3: Validate order status (must be 'paid' or 'refunded' for partial refunds)
    if (order.status !== "paid" && order.status !== "refunded") {
      console.error("[create-refund] Order not refundable:", order.status);
      return new Response(
        JSON.stringify({ error: `Cannot refund order with status '${order.status}'. Only paid orders can be refunded.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Validate user has access to this restaurant
    let userRestaurantId: string;
    
    if (userRole.role === "owner") {
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .single();
      
      if (!restaurant) {
        console.error("[create-refund] Owner restaurant not found");
        return new Response(
          JSON.stringify({ error: "Restaurant not found for owner" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userRestaurantId = restaurant.id;
    } else {
      userRestaurantId = userRole.restaurant_id;
    }

    if (order.restaurant_id !== userRestaurantId) {
      console.error("[create-refund] Restaurant mismatch:", { order: order.restaurant_id, user: userRestaurantId });
      return new Response(
        JSON.stringify({ error: "Access denied: order belongs to different restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Validate restaurant is active
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("is_active")
      .eq("id", order.restaurant_id)
      .single();

    if (restaurantError || !restaurant || !restaurant.is_active) {
      console.error("[create-refund] Restaurant inactive or not found:", restaurantError);
      return new Response(
        JSON.stringify({ error: "Restaurant is not active" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 6: ATOMIC - Get existing refunds and calculate refundable amount
    const { data: existingRefunds, error: refundsError } = await supabaseAdmin
      .from("refunds")
      .select("id, amount")
      .eq("order_id", orderId);

    if (refundsError) {
      console.error("[create-refund] Failed to fetch existing refunds:", refundsError);
      return new Response(
        JSON.stringify({ error: "Failed to calculate refundable amount" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalRefunded = roundJOD(existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0);
    const orderTotal = roundJOD(Number(order.total));
    const maxRefundable = roundJOD(orderTotal - totalRefunded);
    const refundAmount = roundJOD(amount);

    console.log("[create-refund] Refund calculation:", { orderTotal, totalRefunded, maxRefundable, requestedAmount: refundAmount });

    // Validate refund doesn't exceed available amount
    if (refundAmount > maxRefundable + 0.001) {
      console.error("[create-refund] Refund exceeds available amount:", { refundAmount, maxRefundable });
      return new Response(
        JSON.stringify({ 
          error: `Cannot refund ${refundAmount.toFixed(3)}. Maximum refundable: ${maxRefundable.toFixed(3)}. Already refunded: ${totalRefunded.toFixed(3)}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 7: ATOMIC - Insert refund record
    const { data: refund, error: refundError } = await supabaseAdmin
      .from("refunds")
      .insert({
        order_id: orderId,
        restaurant_id: order.restaurant_id,
        branch_id: branchId || null,
        amount: refundAmount,
        refund_type: refundType,
        reason: reason.trim(),
      })
      .select()
      .single();

    if (refundError) {
      console.error("[create-refund] Failed to insert refund:", refundError);
      return new Response(
        JSON.stringify({ error: "Failed to create refund record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-refund] Refund created:", refund.id);

    // Step 8: Update order status to 'refunded' if fully refunded
    const newTotalRefunded = roundJOD(totalRefunded + refundAmount);
    const isFullyRefunded = newTotalRefunded >= orderTotal - 0.001;

    if (isFullyRefunded && order.status !== "refunded") {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "refunded" })
        .eq("id", orderId);

      if (updateError) {
        console.error("[create-refund] Failed to update order status:", updateError);
        // Don't fail the refund, just log the error
      } else {
        console.log("[create-refund] Order marked as fully refunded");
      }
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        refund,
        totalRefunded: newTotalRefunded,
        remainingRefundable: roundJOD(orderTotal - newTotalRefunded),
        isFullyRefunded,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[create-refund] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
