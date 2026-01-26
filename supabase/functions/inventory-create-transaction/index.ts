import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionRequest {
  itemId: string;
  branchId: string;
  txnType: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "WASTE" | "INITIAL_STOCK";
  qty: number;
  unitId: string;
  notes?: string;
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
      console.error("[inventory-create-transaction] Missing authorization header");
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
      console.error("[inventory-create-transaction] Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for DB operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id, branch_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "cashier"])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[inventory-create-transaction] Role check failed:", roleError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restaurantId = roleData.restaurant_id;

    // Validate restaurant subscription is active
    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurantId);
    if (!subscriptionActive) {
      console.error("[inventory-create-transaction] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    // ============ INVENTORY MODULE GUARD ============
    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("inventory_enabled")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (settingsError) {
      console.error("[inventory-create-transaction] Settings check failed:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check inventory module status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings?.inventory_enabled) {
      console.warn("[inventory-create-transaction] Inventory module disabled for restaurant:", restaurantId);
      return new Response(
        JSON.stringify({ success: false, error: "Inventory module is not enabled for this restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ============ END INVENTORY MODULE GUARD ============

    // Parse request body
    const body: TransactionRequest = await req.json();
    const { itemId, branchId, txnType, qty, unitId, notes } = body;

    // Validate required fields
    if (!itemId || !branchId || !txnType || !qty || !unitId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate transaction type
    const validTypes = ["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "WASTE", "INITIAL_STOCK"];
    if (!validTypes.includes(txnType)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid transaction type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate qty is positive
    if (qty <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Quantity must be positive" }),
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

    // Validate item exists and belongs to this branch
    const { data: item, error: itemError } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .eq("id", itemId)
      .eq("branch_id", branchId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid inventory item" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate qty_in_base using unit conversion
    let qtyInBase = qty;
    if (unitId !== item.base_unit_id) {
      const { data: conversion, error: convError } = await supabase
        .from("inventory_unit_conversions")
        .select("multiplier")
        .eq("restaurant_id", restaurantId)
        .eq("from_unit_id", unitId)
        .eq("to_unit_id", item.base_unit_id)
        .maybeSingle();

      if (conversion) {
        qtyInBase = qty * conversion.multiplier;
      } else {
        // Try reverse conversion
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
        // If no conversion found, assume same unit
      }
    }

    // Determine signed qty for ledger
    const signedQty = ["ADJUSTMENT_OUT", "WASTE", "TRANSFER_OUT"].includes(txnType) ? -qty : qty;
    const signedQtyInBase = ["ADJUSTMENT_OUT", "WASTE", "TRANSFER_OUT"].includes(txnType) ? -qtyInBase : qtyInBase;

    // Get current stock level
    const { data: currentStock } = await supabase
      .from("inventory_stock_levels")
      .select("on_hand_base")
      .eq("item_id", itemId)
      .eq("branch_id", branchId)
      .maybeSingle();

    const currentOnHand = currentStock?.on_hand_base || 0;
    const newOnHand = currentOnHand + signedQtyInBase;

    // Block negative stock for outgoing transactions
    if (signedQtyInBase < 0 && newOnHand < 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient stock. Current: ${currentOnHand}, Requested: ${Math.abs(signedQtyInBase)}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start transaction - insert ledger entry
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
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert stock level cache
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
      // Transaction already created, log but don't fail
    }

    // Write audit log
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
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
