import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptLine {
  itemId: string;
  qty: number;
  unitId: string;
  unitCost?: number;
}

interface ReceiptRequest {
  branchId: string;
  supplierId?: string;
  receiptNo: string;
  receivedAt?: string;
  notes?: string;
  lines: ReceiptLine[];
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
      console.error("[purchase-receipt-post] Missing authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user token for auth validation
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[purchase-receipt-post] Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "cashier"])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[purchase-receipt-post] Role check failed:", roleError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restaurantId = roleData.restaurant_id;

    // Validate restaurant is active
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("is_active")
      .eq("id", restaurantId)
      .single();

    if (restaurantError || !restaurant?.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "Restaurant is inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: ReceiptRequest = await req.json();
    const { branchId, supplierId, receiptNo, receivedAt, notes, lines } = body;

    // Validate required fields
    if (!branchId || !receiptNo || !lines || lines.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields (branchId, receiptNo, lines)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate branch belongs to restaurant
    const { data: branch, error: branchError } = await supabase
      .from("restaurant_branches")
      .select("id")
      .eq("id", branchId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (branchError || !branch) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid branch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate supplier if provided
    if (supplierId) {
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplierId)
        .eq("restaurant_id", restaurantId)
        .single();

      if (supplierError || !supplier) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid supplier" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate all items exist and belong to this branch
    const itemIds = lines.map((l) => l.itemId);
    const { data: items, error: itemsError } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .in("id", itemIds)
      .eq("branch_id", branchId)
      .eq("restaurant_id", restaurantId);

    if (itemsError || !items || items.length !== itemIds.length) {
      return new Response(
        JSON.stringify({ success: false, error: "One or more invalid inventory items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemMap = new Map(items.map((i) => [i.id, i]));

    // Fetch unit conversions for this restaurant
    const { data: conversions } = await supabase
      .from("inventory_unit_conversions")
      .select("from_unit_id, to_unit_id, multiplier")
      .eq("restaurant_id", restaurantId);

    const conversionMap = new Map<string, number>();
    conversions?.forEach((c) => {
      conversionMap.set(`${c.from_unit_id}->${c.to_unit_id}`, c.multiplier);
    });

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from("purchase_receipts")
      .insert({
        restaurant_id: restaurantId,
        branch_id: branchId,
        supplier_id: supplierId || null,
        receipt_no: receiptNo,
        received_at: receivedAt || new Date().toISOString(),
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (receiptError) {
      console.error("[purchase-receipt-post] Receipt insert error:", receiptError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create receipt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create receipt lines and inventory transactions
    const receiptLines = [];
    const transactions = [];
    const stockUpdates: { itemId: string; qtyInBase: number }[] = [];

    for (const line of lines) {
      if (line.qty <= 0) continue;

      const item = itemMap.get(line.itemId);
      if (!item) continue;

      // Calculate qty_in_base
      let qtyInBase = line.qty;
      if (line.unitId !== item.base_unit_id) {
        const convKey = `${line.unitId}->${item.base_unit_id}`;
        const reverseKey = `${item.base_unit_id}->${line.unitId}`;
        if (conversionMap.has(convKey)) {
          qtyInBase = line.qty * conversionMap.get(convKey)!;
        } else if (conversionMap.has(reverseKey)) {
          qtyInBase = line.qty / conversionMap.get(reverseKey)!;
        }
      }

      receiptLines.push({
        receipt_id: receipt.id,
        item_id: line.itemId,
        qty: line.qty,
        unit_id: line.unitId,
        unit_cost: line.unitCost || null,
      });

      transactions.push({
        restaurant_id: restaurantId,
        branch_id: branchId,
        item_id: line.itemId,
        txn_type: "PURCHASE_RECEIPT",
        qty: line.qty,
        unit_id: line.unitId,
        qty_in_base: qtyInBase,
        reference_type: "purchase_receipt",
        reference_id: receipt.id,
        notes: `Receipt #${receiptNo}`,
        created_by: user.id,
      });

      stockUpdates.push({ itemId: line.itemId, qtyInBase });
    }

    // Insert receipt lines
    const { error: linesError } = await supabase
      .from("purchase_receipt_lines")
      .insert(receiptLines);

    if (linesError) {
      console.error("[purchase-receipt-post] Lines insert error:", linesError);
    }

    // Insert inventory transactions
    const { error: txnError } = await supabase
      .from("inventory_transactions")
      .insert(transactions);

    if (txnError) {
      console.error("[purchase-receipt-post] Transactions insert error:", txnError);
    }

    // Update stock levels
    for (const update of stockUpdates) {
      const { data: currentStock } = await supabase
        .from("inventory_stock_levels")
        .select("on_hand_base")
        .eq("item_id", update.itemId)
        .eq("branch_id", branchId)
        .maybeSingle();

      const newOnHand = (currentStock?.on_hand_base || 0) + update.qtyInBase;

      await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: restaurantId,
            branch_id: branchId,
            item_id: update.itemId,
            on_hand_base: newOnHand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,branch_id,item_id" }
        );
    }

    // Write audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      entity_type: "purchase_receipt",
      entity_id: receipt.id,
      action: "PURCHASE_RECEIPT_POSTED",
      details: {
        receipt_no: receiptNo,
        branch_id: branchId,
        supplier_id: supplierId,
        line_count: lines.length,
        total_items: stockUpdates.reduce((sum, u) => sum + u.qtyInBase, 0),
      },
    });

    console.log(`[purchase-receipt-post] Success: Receipt ${receiptNo} with ${lines.length} lines`);

    return new Response(
      JSON.stringify({
        success: true,
        receipt,
        lineCount: receiptLines.length,
        transactionCount: transactions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[purchase-receipt-post] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
