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
  | "invalid_input"
  | "invalid_branch"
  | "invalid_item"
  | "insufficient_stock"
  | "server_error"
  | "unexpected";

function errorResponse(code: ErrorCode, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface TransactionRequest {
  itemId: string;
  branchId: string;
  txnType: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "WASTE" | "INITIAL_STOCK";
  qty: number;
  unitId: string;
  notes?: string;
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
      console.error("[inventory-create-transaction] Missing authorization header");
      return errorResponse("missing_auth", 401);
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[inventory-create-transaction] Auth error:", authError);
      return errorResponse("invalid_token", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id, branch_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "cashier"])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[inventory-create-transaction] Role check failed:", roleError);
      return errorResponse("not_authorized", 403);
    }

    const restaurantId = roleData.restaurant_id;

    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurantId);
    if (!subscriptionActive) {
      console.error("[inventory-create-transaction] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("inventory_enabled")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (settingsError) {
      console.error("[inventory-create-transaction] Settings check failed:", settingsError);
      return errorResponse("server_error", 500);
    }

    if (!settings?.inventory_enabled) {
      console.warn("[inventory-create-transaction] Inventory module disabled for restaurant:", restaurantId);
      return errorResponse("inventory_disabled", 403);
    }

    const body: TransactionRequest = await req.json();
    const { itemId, branchId, txnType, qty, unitId, notes } = body;

    if (!itemId || !branchId || !txnType || !qty || !unitId) {
      return errorResponse("missing_fields", 400);
    }

    const validTypes = ["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "WASTE", "INITIAL_STOCK"];
    if (!validTypes.includes(txnType)) {
      return errorResponse("invalid_input", 400);
    }

    if (qty <= 0) {
      return errorResponse("invalid_input", 400);
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

    const { data: item, error: itemError } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .eq("id", itemId)
      .eq("branch_id", branchId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (itemError || !item) {
      return errorResponse("invalid_item", 400);
    }

    let qtyInBase = qty;
    if (unitId !== item.base_unit_id) {
      const { data: conversion } = await supabase
        .from("inventory_unit_conversions")
        .select("multiplier")
        .eq("restaurant_id", restaurantId)
        .eq("from_unit_id", unitId)
        .eq("to_unit_id", item.base_unit_id)
        .maybeSingle();

      if (conversion) {
        qtyInBase = qty * conversion.multiplier;
      } else {
        const { data: reverseConv } = await supabase
          .from("inventory_unit_conversions")
          .select("multiplier")
          .eq("restaurant_id", restaurantId)
          .eq("from_unit_id", item.base_unit_id)
          .eq("to_unit_id", unitId)
          .maybeSingle();

        if (reverseConv) {
          qtyInBase = qty / reverseConv.multiplier;
        }
      }
    }

    const signedQty = ["ADJUSTMENT_OUT", "WASTE", "TRANSFER_OUT"].includes(txnType) ? -qty : qty;
    const signedQtyInBase = ["ADJUSTMENT_OUT", "WASTE", "TRANSFER_OUT"].includes(txnType) ? -qtyInBase : qtyInBase;

    const { data: currentStock } = await supabase
      .from("inventory_stock_levels")
      .select("on_hand_base")
      .eq("item_id", itemId)
      .eq("branch_id", branchId)
      .maybeSingle();

    const currentOnHand = currentStock?.on_hand_base || 0;
    const newOnHand = currentOnHand + signedQtyInBase;

    if (signedQtyInBase < 0 && newOnHand < 0) {
      return errorResponse("insufficient_stock", 400);
    }

    const { data: txn, error: txnError } = await supabase
      .from("inventory_transactions")
      .insert({
        restaurant_id: restaurantId,
        branch_id: branchId,
        item_id: itemId,
        txn_type: txnType,
        qty: signedQty,
        unit_id: unitId,
        qty_in_base: signedQtyInBase,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (txnError) {
      console.error("[inventory-create-transaction] Insert error:", txnError);
      return errorResponse("server_error", 500);
    }

    const { error: stockError } = await supabase
      .from("inventory_stock_levels")
      .upsert(
        {
          restaurant_id: restaurantId,
          branch_id: branchId,
          item_id: itemId,
          on_hand_base: newOnHand,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id,branch_id,item_id" }
      );

    if (stockError) {
      console.error("[inventory-create-transaction] Stock update error:", stockError);
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      entity_type: "inventory_transaction",
      entity_id: txn.id,
      action: `INVENTORY_${txnType}`,
      details: {
        item_id: itemId,
        item_name: item.name,
        branch_id: branchId,
        qty: signedQty,
        qty_in_base: signedQtyInBase,
        new_on_hand: newOnHand,
        notes,
      },
    });

    console.log(`[inventory-create-transaction] Success: ${txnType} for item ${itemId}, qty: ${signedQtyInBase}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: txn,
        newOnHand,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[inventory-create-transaction] Unexpected error:", error);
    return errorResponse("unexpected", 500);
  }
});
