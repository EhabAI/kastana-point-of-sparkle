import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveRequest {
  stockCountId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user role - only owners can approve stock counts
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Only owners can approve stock counts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restaurantId = roleData.restaurant_id;

    // Validate restaurant subscription is active
    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurantId);
    if (!subscriptionActive) {
      console.error("[stock-count-approve] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    // ============ INVENTORY MODULE GUARD ============
    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("inventory_enabled")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (settingsError) {
      console.error("[stock-count-approve] Settings check failed:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check inventory module status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings?.inventory_enabled) {
      console.warn("[stock-count-approve] Inventory module disabled for restaurant:", restaurantId);
      return new Response(
        JSON.stringify({ success: false, error: "Inventory module is not enabled for this restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ============ END INVENTORY MODULE GUARD ============

    // Parse request body
    const body: ApproveRequest = await req.json();
    const { stockCountId } = body;

    if (!stockCountId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing stockCountId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stock count
    const { data: stockCount, error: countError } = await supabase
      .from("stock_counts")
      .select("id, branch_id, status, restaurant_id")
      .eq("id", stockCountId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (countError || !stockCount) {
      return new Response(
        JSON.stringify({ success: false, error: "Stock count not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check immutability - APPROVED or CANCELLED counts cannot be modified
    if (stockCount.status === "APPROVED") {
      return new Response(
        JSON.stringify({ success: false, error: "Stock count already approved - immutable" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stockCount.status === "CANCELLED") {
      return new Response(
        JSON.stringify({ success: false, error: "Stock count is cancelled - immutable" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stock count lines with variance
    const { data: countLines, error: linesError } = await supabase
      .from("stock_count_lines")
      .select("id, item_id, expected_base, actual_base, variance_base")
      .eq("stock_count_id", stockCountId);

    if (linesError || !countLines || countLines.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No count lines found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get item details for all items in the count
    const itemIds = countLines.map((l) => l.item_id);
    const { data: items } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .in("id", itemIds);

    const itemMap = new Map(items?.map((i) => [i.id, i]) || []);

    // Get current stock levels for all items
    const { data: stockLevels } = await supabase
      .from("inventory_stock_levels")
      .select("item_id, on_hand_base")
      .eq("branch_id", stockCount.branch_id)
      .in("item_id", itemIds);

    const stockMap = new Map(stockLevels?.map((s) => [s.item_id, s.on_hand_base]) || []);

    // Build INVENTORY_ADJUSTMENT ledger entries for each variance
    // Ledger-based: we ADD variance_qty to current stock, not overwrite
    const transactions: {
      restaurant_id: string;
      branch_id: string;
      item_id: string;
      txn_type: string;
      qty: number;
      unit_id: string;
      qty_in_base: number;
      reference_type: string;
      reference_id: string;
      notes: string;
      created_by: string;
    }[] = [];

    const stockUpdates: { itemId: string; currentOnHand: number; varianceQty: number }[] = [];
    let totalPositiveVariance = 0;
    let totalNegativeVariance = 0;
    let itemsWithVariance = 0;

    for (const line of countLines) {
      const varianceQty = line.variance_base;
      
      // Skip items with zero variance
      if (varianceQty === 0) continue;

      const item = itemMap.get(line.item_id);
      if (!item) continue;

      itemsWithVariance++;

      // Create INVENTORY_ADJUSTMENT ledger entry
      // Positive variance = stock found (add to ledger)
      // Negative variance = stock missing (subtract from ledger)
      transactions.push({
        restaurant_id: restaurantId,
        branch_id: stockCount.branch_id,
        item_id: line.item_id,
        txn_type: "INVENTORY_ADJUSTMENT",
        qty: varianceQty,
        unit_id: item.base_unit_id,
        qty_in_base: varianceQty,
        reference_type: "stock_count",
        reference_id: stockCountId,
        notes: `Stock count variance: expected ${line.expected_base}, counted ${line.actual_base}, variance ${varianceQty}`,
        created_by: user.id,
      });

      const currentOnHand = stockMap.get(line.item_id) || 0;
      stockUpdates.push({ 
        itemId: line.item_id, 
        currentOnHand,
        varianceQty 
      });

      if (varianceQty > 0) {
        totalPositiveVariance += varianceQty;
      } else {
        totalNegativeVariance += Math.abs(varianceQty);
      }
    }

    // Insert all INVENTORY_ADJUSTMENT transactions atomically
    if (transactions.length > 0) {
      const { error: txnError } = await supabase
        .from("inventory_transactions")
        .insert(transactions);

      if (txnError) {
        console.error("[stock-count-approve] Ledger insert error:", txnError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create adjustment entries" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[stock-count-approve] Created ${transactions.length} INVENTORY_ADJUSTMENT entries`);
    }

    // Update stock levels by ADDING variance (ledger-based, not overwrite)
    for (const update of stockUpdates) {
      const newOnHand = update.currentOnHand + update.varianceQty;
      
      const { error: stockError } = await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: restaurantId,
            branch_id: stockCount.branch_id,
            item_id: update.itemId,
            on_hand_base: newOnHand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,branch_id,item_id" }
        );

      if (stockError) {
        console.error(`[stock-count-approve] Stock level update error for ${update.itemId}:`, stockError);
      }
    }

    // Update stock count status to APPROVED (immutable from here)
    const { error: updateError } = await supabase
      .from("stock_counts")
      .update({
        status: "APPROVED",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", stockCountId);

    if (updateError) {
      console.error("[stock-count-approve] Status update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update stock count status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Write audit log for STOCK_COUNT_APPROVED
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      entity_type: "stock_count",
      entity_id: stockCountId,
      action: "STOCK_COUNT_APPROVED",
      details: {
        branch_id: stockCount.branch_id,
        total_lines: countLines.length,
        items_with_variance: itemsWithVariance,
        adjustments_created: transactions.length,
        positive_variance_total: totalPositiveVariance,
        negative_variance_total: totalNegativeVariance,
        net_variance: totalPositiveVariance - totalNegativeVariance,
      },
    });

    console.log(`[stock-count-approve] Success: ${transactions.length} adjustments, net variance: ${totalPositiveVariance - totalNegativeVariance}`);

    return new Response(
      JSON.stringify({
        success: true,
        adjustmentsCreated: transactions.length,
        itemsWithVariance,
        positiveVariance: totalPositiveVariance,
        negativeVariance: totalNegativeVariance,
        netVariance: totalPositiveVariance - totalNegativeVariance,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[stock-count-approve] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
