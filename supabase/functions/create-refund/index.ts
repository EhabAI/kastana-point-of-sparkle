import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode = 'not_authorized' | 'missing_fields' | 'invalid_amount' | 'invalid_refund_type' | 'order_not_found' | 'order_not_refundable' | 'restaurant_mismatch' | 'refund_exceeds_available' | 'refund_failed' | 'unexpected'

// Helper: round to 3 decimals using HALF-UP (JOD standard)
const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

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
      console.error("[create-refund] Missing or invalid Authorization header");
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
      console.error("[create-refund] JWT validation failed:", claimsError);
      return errorResponse('not_authorized', 401);
    }

    const userId = claimsData.claims.sub;
    console.log("[create-refund] Authenticated user:", userId);

    // Parse request body
    const { orderId, amount, refundType, reason, branchId } = await req.json();

    if (!orderId || !amount || !refundType || !reason?.trim()) {
      console.error("[create-refund] Invalid request body:", { orderId, amount, refundType, reason });
      return errorResponse('missing_fields', 400);
    }

    if (typeof amount !== "number" || amount <= 0) {
      console.error("[create-refund] Invalid refund amount:", amount);
      return errorResponse('invalid_amount', 400);
    }

    if (!["full", "partial"].includes(refundType)) {
      console.error("[create-refund] Invalid refund type:", refundType);
      return errorResponse('invalid_refund_type', 400);
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
      return errorResponse('not_authorized', 403);
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
      return errorResponse('order_not_found', 404);
    }

    console.log("[create-refund] Order found:", { id: order.id, status: order.status, total: order.total });

    // Step 3: Validate order status (must be 'paid' or 'refunded' for partial refunds)
    if (order.status !== "paid" && order.status !== "refunded") {
      console.error("[create-refund] Order not refundable:", order.status);
      return errorResponse('order_not_refundable', 400);
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
        return errorResponse('restaurant_mismatch', 403);
      }
      userRestaurantId = restaurant.id;
    } else {
      userRestaurantId = userRole.restaurant_id;
    }

    if (order.restaurant_id !== userRestaurantId) {
      console.error("[create-refund] Restaurant mismatch:", { order: order.restaurant_id, user: userRestaurantId });
      return errorResponse('restaurant_mismatch', 403);
    }

    // Step 5: Validate restaurant subscription is active
    const { isActive: subscriptionActive } = await checkSubscriptionActive(order.restaurant_id);
    if (!subscriptionActive) {
      console.error("[create-refund] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    // Step 6: ATOMIC - Get existing refunds and calculate refundable amount
    const { data: existingRefunds, error: refundsError } = await supabaseAdmin
      .from("refunds")
      .select("id, amount")
      .eq("order_id", orderId);

    if (refundsError) {
      console.error("[create-refund] Failed to fetch existing refunds:", refundsError);
      return errorResponse('unexpected', 500);
    }

    const totalRefunded = roundJOD(existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0);
    const orderTotal = roundJOD(Number(order.total));
    const maxRefundable = roundJOD(orderTotal - totalRefunded);
    const refundAmount = roundJOD(amount);

    console.log("[create-refund] Refund calculation:", { orderTotal, totalRefunded, maxRefundable, requestedAmount: refundAmount });

    // Validate refund doesn't exceed available amount
    if (refundAmount > maxRefundable + 0.001) {
      console.error("[create-refund] Refund exceeds available amount:", { refundAmount, maxRefundable });
      return errorResponse('refund_exceeds_available', 400);
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
      return errorResponse('refund_failed', 500);
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

    // Step 9: INVENTORY RESTORATION (for full refunds only)
    // Only restore inventory if this is a full refund and inventory module is enabled
    let inventoryRestored = false;
    let inventoryRestoredCount = 0;

    if (refundType === "full" || isFullyRefunded) {
      try {
        // Check if inventory is enabled for this restaurant
        const { data: settings } = await supabaseAdmin
          .from("restaurant_settings")
          .select("inventory_enabled")
          .eq("restaurant_id", order.restaurant_id)
          .maybeSingle();

        if (settings?.inventory_enabled) {
          // Find original SALE_DEDUCTION transactions for this order
          const { data: originalDeductions, error: deductionsError } = await supabaseAdmin
            .from("inventory_transactions")
            .select("item_id, qty_in_base, unit_id, branch_id")
            .eq("reference_type", "ORDER")
            .eq("reference_id", orderId)
            .eq("txn_type", "SALE_DEDUCTION");

          if (deductionsError) {
            console.error("[create-refund] Failed to fetch original deductions:", deductionsError);
          } else if (originalDeductions && originalDeductions.length > 0) {
            console.log("[create-refund] Restoring inventory for", originalDeductions.length, "items");

            // Create reverse (IN) transactions
            const restorationTxns = originalDeductions.map(d => ({
              restaurant_id: order.restaurant_id,
              branch_id: d.branch_id,
              item_id: d.item_id,
              qty: Math.abs(d.qty_in_base), // Positive for restoration
              unit_id: d.unit_id,
              qty_in_base: Math.abs(d.qty_in_base),
              txn_type: "REFUND_RESTORATION",
              reference_type: "REFUND",
              reference_id: refund.id,
              notes: `Inventory restored on refund for order ${orderId}`,
              created_by: userId,
            }));

            const { error: restoreError } = await supabaseAdmin
              .from("inventory_transactions")
              .insert(restorationTxns);

            if (restoreError) {
              console.error("[create-refund] Failed to insert restoration transactions:", restoreError);
            } else {
              inventoryRestoredCount = restorationTxns.length;
              
              // Update stock levels
              for (const d of originalDeductions) {
                const restoredQty = Math.abs(d.qty_in_base);
                
                // Get current stock level
                const { data: currentStock } = await supabaseAdmin
                  .from("inventory_stock_levels")
                  .select("on_hand_base")
                  .eq("branch_id", d.branch_id)
                  .eq("item_id", d.item_id)
                  .maybeSingle();

                const currentOnHand = Number(currentStock?.on_hand_base || 0);
                const newOnHand = currentOnHand + restoredQty;

                const { error: stockError } = await supabaseAdmin
                  .from("inventory_stock_levels")
                  .upsert({
                    restaurant_id: order.restaurant_id,
                    branch_id: d.branch_id,
                    item_id: d.item_id,
                    on_hand_base: newOnHand,
                    updated_at: new Date().toISOString(),
                  }, {
                    onConflict: "branch_id,item_id",
                  });

                if (stockError) {
                  console.error("[create-refund] Failed to update stock level:", stockError);
                }
              }

              inventoryRestored = true;
              console.log("[create-refund] Inventory restored:", inventoryRestoredCount, "items");

              // Write audit log for inventory restoration
              await supabaseAdmin.from("audit_logs").insert({
                restaurant_id: order.restaurant_id,
                user_id: userId,
                action: "INVENTORY_REFUND_RESTORATION",
                entity_type: "refund",
                entity_id: refund.id,
                details: {
                  refund_id: refund.id,
                  order_id: orderId,
                  items_restored: inventoryRestoredCount,
                },
              });
            }
          }
        }
      } catch (invError) {
        console.error("[create-refund] Inventory restoration error:", invError);
        // Don't fail the refund - inventory restoration is non-blocking
      }
    }

    // Success response
    return json({
      success: true,
      refund,
      totalRefunded: newTotalRefunded,
      remainingRefundable: roundJOD(orderTotal - newTotalRefunded),
      isFullyRefunded,
      inventoryRestored,
      inventoryRestoredCount,
    }, 200);

  } catch (error) {
    console.error("[create-refund] Unexpected error:", error);
    return errorResponse('unexpected', 500);
  }
});
