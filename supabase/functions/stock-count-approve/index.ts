import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Validate restaurant is active
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("is_active")
      .eq("id", restaurantId)
      .single();

    if (!restaurant?.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "Restaurant is inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (stockCount.status === "APPROVED") {
      return new Response(
        JSON.stringify({ success: false, error: "Stock count already approved" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stock count lines
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

    // Get item details
    const itemIds = countLines.map((l) => l.item_id);
    const { data: items } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .in("id", itemIds);

    const itemMap = new Map(items?.map((i) => [i.id, i]) || []);

    // Create adjustment transactions for variances
    const transactions = [];
    const stockUpdates: { itemId: string; newOnHand: number }[] = [];
    let totalPositiveVariance = 0;
    let totalNegativeVariance = 0;

    for (const line of countLines) {
      const variance = line.variance_base;
      if (variance === 0) continue;

      const item = itemMap.get(line.item_id);
      if (!item) continue;

      const txnType = variance > 0 ? "STOCK_COUNT_ADJUSTMENT" : "STOCK_COUNT_ADJUSTMENT";

      transactions.push({
        restaurant_id: restaurantId,
        branch_id: stockCount.branch_id,
        item_id: line.item_id,
        txn_type: txnType,
        qty: variance,
        unit_id: item.base_unit_id,
        qty_in_base: variance,
        reference_type: "stock_count",
        reference_id: stockCountId,
        notes: `Stock count adjustment: expected ${line.expected_base}, actual ${line.actual_base}`,
        created_by: user.id,
      });

      stockUpdates.push({ itemId: line.item_id, newOnHand: line.actual_base });

      if (variance > 0) {
        totalPositiveVariance += variance;
      } else {
        totalNegativeVariance += Math.abs(variance);
      }
    }

    // Insert transactions
    if (transactions.length > 0) {
      const { error: txnError } = await supabase
        .from("inventory_transactions")
        .insert(transactions);

      if (txnError) {
        console.error("[stock-count-approve] Transaction insert error:", txnError);
      }
    }

    // Update stock levels to actual counts
    for (const update of stockUpdates) {
      await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: restaurantId,
            branch_id: stockCount.branch_id,
            item_id: update.itemId,
            on_hand_base: update.newOnHand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,branch_id,item_id" }
        );
    }

    // Update stock count status
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
    }

    // Write audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      entity_type: "stock_count",
      entity_id: stockCountId,
      action: "STOCK_COUNT_APPROVED",
      details: {
        branch_id: stockCount.branch_id,
        line_count: countLines.length,
        adjustments_made: transactions.length,
        positive_variance: totalPositiveVariance,
        negative_variance: totalNegativeVariance,
      },
    });

    console.log(`[stock-count-approve] Success: ${transactions.length} adjustments made`);

    return new Response(
      JSON.stringify({
        success: true,
        adjustmentsMade: transactions.length,
        positiveVariance: totalPositiveVariance,
        negativeVariance: totalNegativeVariance,
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
