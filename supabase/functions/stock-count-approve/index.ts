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
  | "count_not_found"
  | "count_immutable"
  | "no_count_lines"
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
  count_not_found: { en: "Stock count not found", ar: "عملية الجرد غير موجودة" },
  count_immutable: { en: "This stock count has already been approved or cancelled", ar: "تم اعتماد أو إلغاء عملية الجرد هذه بالفعل" },
  no_count_lines: { en: "No items in this stock count", ar: "لا توجد عناصر في عملية الجرد هذه" },
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

interface ApproveRequest {
  restaurant_id?: string;
  stockCountId: string;
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

    const body: ApproveRequest = await req.json();
    const { restaurant_id: requestedRestaurantId, stockCountId } = body;

    if (!stockCountId) {
      return errorResponse("missing_fields", 400);
    }

    // Resolve restaurant ID for multi-restaurant owners
    const { restaurantId: resolvedRestaurantId, error: resolveError } = await resolveOwnerRestaurantId({
      supabaseAdmin: supabase,
      userId: user.id,
      requestedRestaurantId: requestedRestaurantId || undefined,
    });

    if (resolveError || !resolvedRestaurantId) {
      console.log("[stock-count-approve] Restaurant resolution error:", resolveError);
      return errorResponse("restaurant_mismatch", 403);
    }

    const { isActive: subscriptionActive } = await checkSubscriptionActive(resolvedRestaurantId);
    if (!subscriptionActive) {
      console.error("[stock-count-approve] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("inventory_enabled")
      .eq("restaurant_id", resolvedRestaurantId)
      .maybeSingle();

    if (settingsError) {
      console.error("[stock-count-approve] Settings check failed:", settingsError);
      return errorResponse("server_error", 500);
    }

    if (!settings?.inventory_enabled) {
      console.warn("[stock-count-approve] Inventory module disabled for restaurant:", resolvedRestaurantId);
      return errorResponse("inventory_disabled", 403);
    }

    const { data: stockCount, error: countError } = await supabase
      .from("stock_counts")
      .select("id, branch_id, status, restaurant_id")
      .eq("id", stockCountId)
      .eq("restaurant_id", resolvedRestaurantId)
      .single();

    if (countError || !stockCount) {
      return errorResponse("count_not_found", 404);
    }

    if (stockCount.status === "APPROVED" || stockCount.status === "CANCELLED") {
      return errorResponse("count_immutable", 400);
    }

    const { data: countLines, error: linesError } = await supabase
      .from("stock_count_lines")
      .select("id, item_id, expected_base, actual_base, variance_base")
      .eq("stock_count_id", stockCountId);

    if (linesError || !countLines || countLines.length === 0) {
      return errorResponse("no_count_lines", 400);
    }

    const itemIds = countLines.map((l) => l.item_id);
    const { data: items } = await supabase
      .from("inventory_items")
      .select("id, base_unit_id, name")
      .in("id", itemIds);

    const itemMap = new Map(items?.map((i) => [i.id, i]) || []);

    const { data: stockLevels } = await supabase
      .from("inventory_stock_levels")
      .select("item_id, on_hand_base")
      .eq("branch_id", stockCount.branch_id)
      .in("item_id", itemIds);

    const stockMap = new Map(stockLevels?.map((s) => [s.item_id, s.on_hand_base]) || []);

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
      
      if (varianceQty === 0) continue;

      const item = itemMap.get(line.item_id);
      if (!item) continue;

      itemsWithVariance++;

      transactions.push({
        restaurant_id: resolvedRestaurantId,
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

    if (transactions.length > 0) {
      const { error: txnError } = await supabase
        .from("inventory_transactions")
        .insert(transactions);

      if (txnError) {
        console.error("[stock-count-approve] Ledger insert error:", txnError);
        return errorResponse("server_error", 500);
      }

      console.log(`[stock-count-approve] Created ${transactions.length} INVENTORY_ADJUSTMENT entries`);
    }

    for (const update of stockUpdates) {
      const newOnHand = update.currentOnHand + update.varianceQty;
      
      const { error: stockError } = await supabase
        .from("inventory_stock_levels")
        .upsert(
          {
            restaurant_id: resolvedRestaurantId,
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
      return errorResponse("server_error", 500);
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: resolvedRestaurantId,
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
        message_en: `Stock count approved with ${transactions.length} adjustments`,
        message_ar: `تم اعتماد الجرد مع ${transactions.length} تعديل`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[stock-count-approve] Unexpected error:", error);
    return errorResponse("unexpected", 500);
  }
});
