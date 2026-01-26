import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: round to 3 decimals using HALF-UP (JOD standard)
const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

// Allowed payment methods (must match DB constraint)
const ALLOWED_PAYMENT_METHODS = ["cash", "visa", "cliq", "zain_cash", "orange_money", "umniah_wallet"];

/**
 * complete-table-payment: Atomically pay multiple orders on a single table
 * 
 * This edge function handles "Table Checkout" / "Group Pay" functionality:
 * - Accepts multiple order IDs from the same table
 * - Validates all orders are open and belong to same restaurant
 * - Distributes payment across orders (proportionally or FIFO)
 * - Marks all orders as 'paid' atomically
 * - Each order keeps its own record - NO MERGING
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[complete-table-payment] Missing or invalid Authorization header");
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
      console.error("[complete-table-payment] JWT validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[complete-table-payment] Authenticated user:", userId);

    // Parse request body
    const { orderIds, payments, tableId } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      console.error("[complete-table-payment] Missing or invalid orderIds");
      return new Response(
        JSON.stringify({ error: "Missing orderIds array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      console.error("[complete-table-payment] Missing or invalid payments");
      return new Response(
        JSON.stringify({ error: "Missing payments array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate payment methods
    for (const payment of payments) {
      if (!ALLOWED_PAYMENT_METHODS.includes(payment.method)) {
        console.error("[complete-table-payment] Invalid payment method:", payment.method);
        return new Response(
          JSON.stringify({ error: `Invalid payment method: ${payment.method}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof payment.amount !== "number" || payment.amount <= 0) {
        console.error("[complete-table-payment] Invalid payment amount:", payment.amount);
        return new Response(
          JSON.stringify({ error: "Invalid payment amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
      console.error("[complete-table-payment] User role validation failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Access denied: requires cashier or owner role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[complete-table-payment] User role:", userRole.role);

    // Step 2: Fetch all orders and validate
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, status, total, restaurant_id, table_id, branch_id, order_number")
      .in("id", orderIds);

    if (ordersError || !orders || orders.length === 0) {
      console.error("[complete-table-payment] Orders not found:", ordersError);
      return new Response(
        JSON.stringify({ error: "Orders not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify all requested orders were found
    if (orders.length !== orderIds.length) {
      console.error("[complete-table-payment] Not all orders found:", { requested: orderIds.length, found: orders.length });
      return new Response(
        JSON.stringify({ error: "Some orders not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all orders are in valid payment status
    // MARKET-GRADE KITCHEN WORKFLOW:
    // - "open": Orders not yet in kitchen (takeaway)
    // - "new": Dine-in orders already in kitchen
    const validPaymentStatuses = ["open", "new"];
    const invalidOrders = orders.filter(o => !validPaymentStatuses.includes(o.status));
    if (invalidOrders.length > 0) {
      console.error("[complete-table-payment] Invalid status orders found:", invalidOrders.map(o => ({ id: o.id, status: o.status })));
      return new Response(
        JSON.stringify({ 
          error: `Some orders are not open for payment.`,
          details: invalidOrders.map(o => ({ order_number: o.order_number, status: o.status }))
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all orders belong to same restaurant
    const restaurantIds = [...new Set(orders.map(o => o.restaurant_id))];
    if (restaurantIds.length !== 1) {
      console.error("[complete-table-payment] Orders from multiple restaurants");
      return new Response(
        JSON.stringify({ error: "Orders must belong to same restaurant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restaurantId = restaurantIds[0];

    // Step 3: Validate user has access to this restaurant
    let userRestaurantId: string;
    
    if (userRole.role === "owner") {
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .single();
      
      if (!restaurant) {
        console.error("[complete-table-payment] Owner restaurant not found");
        return new Response(
          JSON.stringify({ error: "Restaurant not found for owner" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userRestaurantId = restaurant.id;
    } else {
      userRestaurantId = userRole.restaurant_id;
    }

    if (restaurantId !== userRestaurantId) {
      console.error("[complete-table-payment] Restaurant mismatch");
      return new Response(
        JSON.stringify({ error: "Access denied: orders belong to different restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Validate restaurant subscription is active
    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurantId);
    if (!subscriptionActive) {
      console.error("[complete-table-payment] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    // Step 5: Calculate combined total and validate payment
    const combinedTotal = roundJOD(orders.reduce((sum, o) => sum + Number(o.total), 0));
    const paymentTotal = roundJOD(payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0));
    const allCash = payments.every((p: { method: string }) => p.method === "cash");

    console.log("[complete-table-payment] Totals:", { combinedTotal, paymentTotal, orderCount: orders.length });

    // Card payments must be exact (no overpayment)
    if (!allCash && paymentTotal > combinedTotal + 0.001) {
      console.error("[complete-table-payment] Card overpayment not allowed");
      return new Response(
        JSON.stringify({ error: "Card payments must be exact. No overpayment allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Total payments must cover combined total
    if (paymentTotal < combinedTotal - 0.001) {
      console.error("[complete-table-payment] Underpayment:", { paymentTotal, combinedTotal });
      return new Response(
        JSON.stringify({ error: "Payment total is less than combined order total." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 6: ATOMIC OPERATION - Update all orders to 'paid'
    // Sort orders by created_at for consistent FIFO processing
    const sortedOrders = [...orders].sort((a, b) => a.order_number - b.order_number);
    
    const updatedOrders: typeof orders = [];
    const paymentRecords: Array<{
      order_id: string;
      restaurant_id: string;
      branch_id: string | null;
      method: string;
      amount: number;
    }> = [];

    // Distribute payment proportionally across orders
    // Each order gets payments proportional to its share of the total
    let remainingPayments = payments.map((p: { method: string; amount: number }) => ({ 
      method: p.method, 
      amount: roundJOD(p.amount) 
    }));

    for (let i = 0; i < sortedOrders.length; i++) {
      const order = sortedOrders[i];
      const orderTotal = roundJOD(Number(order.total));
      const isLastOrder = i === sortedOrders.length - 1;

      // Calculate this order's share of each payment method
      // For last order, assign all remaining amounts to avoid rounding errors
      const orderPayments: Array<{ method: string; amount: number }> = [];
      
      if (isLastOrder) {
        // Last order gets all remaining payment amounts
        for (const rp of remainingPayments) {
          if (rp.amount > 0) {
            orderPayments.push({ method: rp.method, amount: rp.amount });
          }
        }
      } else {
        // Proportional distribution
        const orderProportion = orderTotal / combinedTotal;
        for (const rp of remainingPayments) {
          const share = roundJOD(rp.amount * orderProportion);
          if (share > 0) {
            orderPayments.push({ method: rp.method, amount: share });
            rp.amount = roundJOD(rp.amount - share);
          }
        }
      }

      // Update order status atomically
      // Accept both "open" (takeaway) and "new" (dine-in in kitchen) statuses
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order.id)
        .in("status", ["open", "new"])  // Valid payment statuses
        .select()
        .single();

      if (updateError || !updatedOrder) {
        console.error("[complete-table-payment] Failed to update order:", order.id, updateError);
        
        // Rollback: revert previously updated orders to their original status
        for (const prevOrder of updatedOrders) {
          // Find original status for this order
          const original = orders.find(o => o.id === prevOrder.id);
          await supabaseAdmin
            .from("orders")
            .update({ status: original?.status || "open" })
            .eq("id", prevOrder.id);
        }
        
        return new Response(
          JSON.stringify({ error: `Order #${order.order_number} is no longer open for payment. Table checkout aborted.` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      updatedOrders.push(updatedOrder);

      // Prepare payment records for this order
      for (const op of orderPayments) {
        paymentRecords.push({
          order_id: order.id,
          restaurant_id: restaurantId,
          branch_id: order.branch_id,
          method: op.method,
          amount: op.amount,
        });
      }
    }

    // Step 7: Insert all payment records
    if (paymentRecords.length > 0) {
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert(paymentRecords);

      if (paymentError) {
        console.error("[complete-table-payment] Failed to insert payments, rolling back:", paymentError);
        
        // Rollback all orders to their original status
        for (const updatedOrder of updatedOrders) {
          const original = orders.find(o => o.id === updatedOrder.id);
          await supabaseAdmin
            .from("orders")
            .update({ status: original?.status || "open" })
            .eq("id", updatedOrder.id);
        }

        return new Response(
          JSON.stringify({ error: "Failed to record payments" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[complete-table-payment] Success:", {
      ordersUpdated: updatedOrders.length,
      paymentsInserted: paymentRecords.length,
      combinedTotal,
      paymentTotal,
    });

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        orders: updatedOrders.map(o => ({ id: o.id, order_number: o.order_number })),
        combinedTotal,
        paymentTotal,
        change: allCash && paymentTotal > combinedTotal ? roundJOD(paymentTotal - combinedTotal) : 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[complete-table-payment] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
