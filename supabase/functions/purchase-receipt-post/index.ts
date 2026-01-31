import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode = 
  | "missing_auth"
  | "invalid_token"
  | "not_authorized"
  | "subscription_expired"
  | "inventory_disabled"
  | "missing_fields"
  | "invalid_branch"
  | "invalid_supplier"
  | "invalid_item"
  | "server_error"
  | "unexpected";

function errorResponse(code: ErrorCode, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface ReceiptLine {
  itemId: string;
  qty: number;
  unitId: string;
  unitCost?: number | null;
}

interface AvgCostUpdate {
  itemId: string;
  oldQty: number;
  oldAvgCost: number;
  receivedQty: number;
  unitCost: number;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.error("[purchase-receipt-post] Missing authorization header");
      return errorResponse("missing_auth", 401);
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[purchase-receipt-post] Auth error:", authError);
      return errorResponse("invalid_token", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "cashier"])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[purchase-receipt-post] Role check failed:", roleError);
      return errorResponse("not_authorized", 403);
    }

    const restaurantId = roleData.restaurant_id;

    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurantId);
    if (!subscriptionActive) {
      console.error("[purchase-receipt-post] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("inventory_enabled")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (settingsError) {
      console.error("[purchase-receipt-post] Settings check failed:", settingsError);
      return errorResponse("server_error", 500);
    }

    if (!settings?.inventory_enabled) {
      console.warn("[purchase-receipt-post] Inventory module disabled for restaurant:", restaurantId);
      return errorResponse("inventory_disabled", 403);
    }

    const body: ReceiptRequest = await req.json();
    const { branchId, supplierId, receiptNo, receivedAt, notes, lines } = body;

    if (!branchId || !receiptNo || !lines || lines.length === 0) {
      return errorResponse("missing_fields", 400);
    }

    const { data: branch, error: branchError } = await supabase
      .from("restaurant_branches")
      .select("id")
      .eq("id", branchId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (branchError || !branch) {
      return errorResponse("invalid_branch", 400);
    }

    if (supplierId) {
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplierId)
        .eq("restaurant_id", restaurantId)
        .single();

      if (supplierError || !supplier) {
        return errorResponse("invalid_supplier", 400);
      }
    }

    const itemIds = lines.map((l) => l.itemId);
    const { data: items, error: itemsError } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name, avg_cost")
      .in("id", itemIds)
      .eq("branch_id", branchId)
      .eq("restaurant_id", restaurantId);

    if (itemsError || !items || items.length !== itemIds.length) {
      return errorResponse("invalid_item", 400);
    }

    const itemMap = new Map(items.map((i) => [i.id, { ...i, avg_cost: i.avg_cost || 0 }]));

    const { data: conversions } = await supabase
      .from("inventory_unit_conversions")
      .select("from_unit_id, to_unit_id, multiplier")
      .eq("restaurant_id", restaurantId);

    const conversionMap = new Map<string, number>();
    conversions?.forEach((c) => {
      conversionMap.set(`${c.from_unit_id}->${c.to_unit_id}`, c.multiplier);
    });

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
      return errorResponse("server_error", 500);
    }

    const receiptLines = [];
    const transactions = [];
    const stockUpdates: { itemId: string; qtyInBase: number }[] = [];
    const avgCostUpdates: AvgCostUpdate[] = [];

    for (const line of lines) {
      if (line.qty <= 0) continue;

      const item = itemMap.get(line.itemId);
      if (!item) continue;

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

      const unitCost = line.unitCost != null && line.unitCost > 0 ? line.unitCost : 0;
      const totalCost = qtyInBase * unitCost;

      receiptLines.push({
        receipt_id: receipt.id,
        item_id: line.itemId,
        qty: line.qty,
        unit_id: line.unitId,
        unit_cost: unitCost > 0 ? unitCost : null,
      });

      transactions.push({
        restaurant_id: restaurantId,
        branch_id: branchId,
        item_id: line.itemId,
        txn_type: "PURCHASE_RECEIPT",
        qty: line.qty,
        unit_id: line.unitId,
        qty_in_base: qtyInBase,
        unit_cost: unitCost > 0 ? unitCost : null,
        total_cost: totalCost > 0 ? totalCost : null,
        reference_type: "purchase_receipt",
        reference_id: receipt.id,
        notes: `Receipt #${receiptNo}`,
        created_by: user.id,
      });

      stockUpdates.push({ itemId: line.itemId, qtyInBase });

      if (unitCost > 0) {
        avgCostUpdates.push({
          itemId: line.itemId,
          oldQty: 0,
          oldAvgCost: item.avg_cost,
          receivedQty: qtyInBase,
          unitCost: unitCost,
        });
      }
    }

    const { error: linesError } = await supabase
      .from("purchase_receipt_lines")
      .insert(receiptLines);

    if (linesError) {
      console.error("[purchase-receipt-post] Lines insert error:", linesError);
    }

    const { error: txnError } = await supabase
      .from("inventory_transactions")
      .insert(transactions);

    if (txnError) {
      console.error("[purchase-receipt-post] Transactions insert error:", txnError);
    }

    for (const update of stockUpdates) {
      const { data: currentStock } = await supabase
        .from("inventory_stock_levels")
        .select("on_hand_base")
        .eq("item_id", update.itemId)
        .eq("branch_id", branchId)
        .maybeSingle();

      const oldOnHand = currentStock?.on_hand_base || 0;
      const newOnHand = oldOnHand + update.qtyInBase;

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

      const avgUpdate = avgCostUpdates.find((a) => a.itemId === update.itemId);
      if (avgUpdate) {
        const item = itemMap.get(update.itemId);
        const oldAvgCost = item?.avg_cost || 0;
        
        let newAvgCost = oldAvgCost;
        const totalQty = oldOnHand + avgUpdate.receivedQty;
        if (totalQty > 0) {
          newAvgCost = ((oldOnHand * oldAvgCost) + (avgUpdate.receivedQty * avgUpdate.unitCost)) / totalQty;
        } else {
          newAvgCost = avgUpdate.unitCost;
        }

        await supabase
          .from("inventory_items")
          .update({ avg_cost: newAvgCost })
          .eq("id", update.itemId);

        console.log(`[purchase-receipt-post] Updated avg_cost for ${update.itemId}: ${oldAvgCost} -> ${newAvgCost}`);
      }
    }

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
    return errorResponse("unexpected", 500);
  }
});
