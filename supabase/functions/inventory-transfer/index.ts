import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveOwnerRestaurantId } from "../_shared/owner-restaurant.ts";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode = 
  | "missing_auth"
  | "invalid_token"
  | "not_authorized"
  | "restaurant_mismatch"
  | "subscription_expired"
  | "inventory_disabled"
  | "missing_fields"
  | "invalid_branch"
  | "same_branch"
  | "invalid_item"
  | "insufficient_stock"
  | "server_error"
  | "unexpected";

// Bilingual error messages
const ERROR_MESSAGES: Record<ErrorCode, { en: string; ar: string }> = {
  missing_auth: { en: "Authentication required", ar: "المصادقة مطلوبة" },
  invalid_token: { en: "Invalid authentication token", ar: "رمز المصادقة غير صالح" },
  not_authorized: { en: "You are not authorized to perform this action", ar: "ليس لديك صلاحية لتنفيذ هذا الإجراء" },
  restaurant_mismatch: { en: "Restaurant ownership verification failed", ar: "فشل التحقق من ملكية المطعم" },
  subscription_expired: { en: "Your subscription has expired", ar: "انتهى اشتراكك" },
  inventory_disabled: { en: "Inventory module is disabled", ar: "وحدة المخزون معطلة" },
  missing_fields: { en: "Required fields are missing", ar: "بعض الحقول المطلوبة غير موجودة" },
  invalid_branch: { en: "One or both branches are invalid", ar: "أحد الفروع أو كلاهما غير صالح" },
  same_branch: { en: "Cannot transfer to the same branch", ar: "لا يمكن النقل إلى نفس الفرع" },
  invalid_item: { en: "One or more inventory items are invalid", ar: "عنصر أو أكثر من المخزون غير صالح" },
  insufficient_stock: { en: "Insufficient stock for transfer", ar: "الكمية المتوفرة غير كافية للنقل" },
  server_error: { en: "Server error, please try again", ar: "خطأ في الخادم، يرجى المحاولة مجددًا" },
  unexpected: { en: "An unexpected error occurred", ar: "حدث خطأ غير متوقع" },
};

function errorResponse(code: ErrorCode, status = 400) {
  const messages = ERROR_MESSAGES[code];
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: { code },
      message_en: messages.en,
      message_ar: messages.ar,
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface TransferLine {
  itemId: string;
  qty: number;
  unitId: string;
}

interface TransferRequest {
  restaurant_id?: string;
  fromBranchId: string;
  toBranchId: string;
  lines: TransferLine[];
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
      return errorResponse("missing_auth", 401);
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return errorResponse("invalid_token", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !roleData) {
      return errorResponse("not_authorized", 403);
    }

    const body: TransferRequest = await req.json();
    const { restaurant_id: requestedRestaurantId, fromBranchId, toBranchId, lines, notes } = body;

    // Resolve restaurant ID for multi-restaurant owners
    const { restaurantId: resolvedRestaurantId, error: resolveError } = await resolveOwnerRestaurantId({
      supabaseAdmin: supabase,
      userId: user.id,
      requestedRestaurantId: requestedRestaurantId || undefined,
    });

    if (resolveError || !resolvedRestaurantId) {
      console.log("[inventory-transfer] Restaurant resolution error:", resolveError);
      return errorResponse("restaurant_mismatch", 403);
    }

    const { isActive: subscriptionActive } = await checkSubscriptionActive(resolvedRestaurantId);
    if (!subscriptionActive) {
      console.error("[inventory-transfer] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("inventory_enabled")
      .eq("restaurant_id", resolvedRestaurantId)
      .maybeSingle();

    if (settingsError) {
      console.error("[inventory-transfer] Settings check failed:", settingsError);
      return errorResponse("server_error", 500);
    }

    if (!settings?.inventory_enabled) {
      console.warn("[inventory-transfer] Inventory module disabled for restaurant:", resolvedRestaurantId);
      return errorResponse("inventory_disabled", 403);
    }

    if (!fromBranchId || !toBranchId || !lines || lines.length === 0) {
      return errorResponse("missing_fields", 400);
    }

    if (fromBranchId === toBranchId) {
      return errorResponse("same_branch", 400);
    }

    const { data: branches, error: branchError } = await supabase
      .from("restaurant_branches")
      .select("id, name")
      .in("id", [fromBranchId, toBranchId])
      .eq("restaurant_id", resolvedRestaurantId);

    if (branchError || !branches || branches.length !== 2) {
      return errorResponse("invalid_branch", 400);
    }

    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    const itemIds = lines.map((l) => l.itemId);
    const { data: sourceItems, error: itemsError } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .in("id", itemIds)
      .eq("branch_id", fromBranchId)
      .eq("restaurant_id", resolvedRestaurantId);

    if (itemsError || !sourceItems || sourceItems.length !== itemIds.length) {
      return errorResponse("invalid_item", 400);
    }

    const sourceItemMap = new Map(sourceItems.map((i) => [i.id, i]));

    const { data: destItems } = await supabase
      .from("inventory_items")
      .select("id, name, base_unit_id")
      .eq("branch_id", toBranchId)
      .eq("restaurant_id", resolvedRestaurantId);

    const destItemByName = new Map(destItems?.map((i) => [i.name, i]) || []);

    const { data: conversions } = await supabase
      .from("inventory_unit_conversions")
      .select("from_unit_id, to_unit_id, multiplier")
      .eq("restaurant_id", resolvedRestaurantId);

    const conversionMap = new Map<string, number>();
    conversions?.forEach((c) => {
      conversionMap.set(`${c.from_unit_id}->${c.to_unit_id}`, c.multiplier);
    });

    const { data: stockLevels } = await supabase
      .from("inventory_stock_levels")
      .select("item_id, on_hand_base")
      .in("item_id", itemIds)
      .eq("branch_id", fromBranchId);

    const stockMap = new Map(stockLevels?.map((s) => [s.item_id, s.on_hand_base]) || []);

    const transferOutTxns = [];
    const transferInTxns = [];
    const stockUpdatesOut: { itemId: string; qtyInBase: number }[] = [];
    const stockUpdatesIn: { itemId: string; qtyInBase: number }[] = [];
    const createdDestItems: string[] = [];

    for (const line of lines) {
      if (line.qty <= 0) continue;

      const sourceItem = sourceItemMap.get(line.itemId);
      if (!sourceItem) continue;

      let qtyInBase = line.qty;
      if (line.unitId !== sourceItem.base_unit_id) {
        const convKey = `${line.unitId}->${sourceItem.base_unit_id}`;
        const reverseKey = `${sourceItem.base_unit_id}->${line.unitId}`;
        if (conversionMap.has(convKey)) {
          qtyInBase = line.qty * conversionMap.get(convKey)!;
        } else if (conversionMap.has(reverseKey)) {
          qtyInBase = line.qty / conversionMap.get(reverseKey)!;
        }
      }

      const currentStock = stockMap.get(line.itemId) || 0;
      if (currentStock < qtyInBase) {
        return errorResponse("insufficient_stock", 400);
      }

      let destItemId: string;
      const existingDestItem = destItemByName.get(sourceItem.name);
      
      if (existingDestItem) {
        destItemId = existingDestItem.id;
      } else {
        const { data: newItem, error: newItemError } = await supabase
          .from("inventory_items")
          .insert({
            restaurant_id: resolvedRestaurantId,
            branch_id: toBranchId,
            name: sourceItem.name,
            base_unit_id: sourceItem.base_unit_id,
          })
          .select()
          .single();

        if (newItemError) {
          console.error("[inventory-transfer] Failed to create dest item:", newItemError);
          continue;
        }
        destItemId = newItem.id;
        createdDestItems.push(destItemId);
        destItemByName.set(sourceItem.name, newItem);
      }

      transferOutTxns.push({
        restaurant_id: resolvedRestaurantId,
        branch_id: fromBranchId,
        item_id: line.itemId,
        txn_type: "TRANSFER_OUT",
        qty: -line.qty,
        unit_id: line.unitId,
        qty_in_base: -qtyInBase,
        reference_type: "transfer",
        notes: notes || `Transfer to ${branchMap.get(toBranchId)}`,
        created_by: user.id,
      });

      transferInTxns.push({
        restaurant_id: resolvedRestaurantId,
        branch_id: toBranchId,
        item_id: destItemId,
        txn_type: "TRANSFER_IN",
        qty: line.qty,
        unit_id: line.unitId,
        qty_in_base: qtyInBase,
        reference_type: "transfer",
        notes: notes || `Transfer from ${branchMap.get(fromBranchId)}`,
        created_by: user.id,
      });

      stockUpdatesOut.push({ itemId: line.itemId, qtyInBase: -qtyInBase });
      stockUpdatesIn.push({ itemId: destItemId, qtyInBase });
    }

    if (transferOutTxns.length > 0) {
      await supabase.from("inventory_transactions").insert(transferOutTxns);
      await supabase.from("inventory_transactions").insert(transferInTxns);
    }

    for (const update of stockUpdatesOut) {
      const { data: current } = await supabase
        .from("inventory_stock_levels")
        .select("on_hand_base")
        .eq("item_id", update.itemId)
        .eq("branch_id", fromBranchId)
        .maybeSingle();

      const newOnHand = (current?.on_hand_base || 0) + update.qtyInBase;

      await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: resolvedRestaurantId,
            branch_id: fromBranchId,
            item_id: update.itemId,
            on_hand_base: newOnHand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,branch_id,item_id" }
        );
    }

    for (const update of stockUpdatesIn) {
      const { data: current } = await supabase
        .from("inventory_stock_levels")
        .select("on_hand_base")
        .eq("item_id", update.itemId)
        .eq("branch_id", toBranchId)
        .maybeSingle();

      const newOnHand = (current?.on_hand_base || 0) + update.qtyInBase;

      await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: resolvedRestaurantId,
            branch_id: toBranchId,
            item_id: update.itemId,
            on_hand_base: newOnHand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,branch_id,item_id" }
        );
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: resolvedRestaurantId,
      entity_type: "inventory_transfer",
      action: "INVENTORY_TRANSFER",
      details: {
        from_branch_id: fromBranchId,
        from_branch_name: branchMap.get(fromBranchId),
        to_branch_id: toBranchId,
        to_branch_name: branchMap.get(toBranchId),
        item_count: lines.length,
        created_dest_items: createdDestItems.length,
        notes,
      },
    });

    console.log(`[inventory-transfer] Success: ${lines.length} items from ${fromBranchId} to ${toBranchId}`);

    return new Response(
      JSON.stringify({
        success: true,
        transferredItems: lines.length,
        createdDestinationItems: createdDestItems.length,
        message_en: `Successfully transferred ${lines.length} items`,
        message_ar: `تم نقل ${lines.length} عناصر بنجاح`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[inventory-transfer] Unexpected error:", error);
    return errorResponse("unexpected", 500);
  }
});
