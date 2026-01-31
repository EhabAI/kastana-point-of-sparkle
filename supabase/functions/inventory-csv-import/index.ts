import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";
import { resolveOwnerRestaurantId } from "../_shared/owner-restaurant.ts";
import { validateOwnerContext, createContextErrorResponse } from "../_shared/owner-context-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CSVImportRow {
  name: string;
  category?: string;
  baseUnit: string;
  branchName: string;
  quantity: number;
  minLevel?: number;
  reorderPoint?: number;
}

interface ImportResult {
  success: boolean;
  itemsCreated: number;
  unitsCreated: number;
  stockEntriesCreated: number;
  stockEntriesSkipped: number;
  errors: string[];
}

// Default units to auto-create if missing
const DEFAULT_UNITS: Record<string, string> = {
  pcs: "pcs",
  kg: "kg",
  g: "g",
  liter: "L",
  ml: "ml",
  bottle: "btl",
  can: "can",
  cup: "cup",
  pack: "pk",
  box: "box",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "missing_auth" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body early so we can resolve the intended restaurant context.
    // Client is expected to pass `restaurant_id` and `branch_id` for Owner operations.
    const body = await req.json().catch(() => ({}));
    const rows: CSVImportRow[] = body.rows || [];
    const requestedRestaurantId: string | null = body.restaurant_id || null;
    const requestedBranchId: string | null = body.branch_id || null;

    // Validate Owner context - both restaurant_id and branch_id are required
    const contextValidation = validateOwnerContext(body);
    if (!contextValidation.isValid) {
      console.error("[inventory-csv-import] Context validation failed:", contextValidation.error);
      return createContextErrorResponse(contextValidation, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { restaurantId, error: restaurantResolveError } = await resolveOwnerRestaurantId({
      supabaseAdmin: supabase,
      userId: user.id,
      requestedRestaurantId,
    });

    if (!restaurantId) {
      const code = restaurantResolveError || "not_authorized";
      return new Response(
        JSON.stringify({ success: false, error: code }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that the requested branch belongs to the restaurant
    const { data: branchData, error: branchError } = await supabase
      .from("restaurant_branches")
      .select("id")
      .eq("id", requestedBranchId!)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (branchError || !branchData) {
      console.error("[inventory-csv-import] Branch validation failed:", branchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_branch",
          message_en: "Branch does not belong to this restaurant",
          message_ar: "الفرع لا ينتمي لهذا المطعم",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription ONCE at the beginning
    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurantId);
    if (!subscriptionActive) {
      return subscriptionExpiredResponse(corsHeaders);
    }

    // Check if inventory is enabled
    const { data: settings } = await supabase
      .from("restaurant_settings")
      .select("inventory_enabled")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!settings?.inventory_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: "inventory_disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rows.length) {
      return new Response(
        JSON.stringify({ success: true, itemsCreated: 0, unitsCreated: 0, stockEntriesCreated: 0, stockEntriesSkipped: 0, errors: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load all branches for this restaurant
    const { data: branches } = await supabase
      .from("restaurant_branches")
      .select("id, name")
      .eq("restaurant_id", restaurantId);

    const branchMap = new Map<string, string>();
    (branches || []).forEach((b) => branchMap.set(b.name.toLowerCase(), b.id));

    // Load existing units
    const { data: existingUnits } = await supabase
      .from("inventory_units")
      .select("id, name")
      .eq("restaurant_id", restaurantId);

    const unitMap = new Map<string, string>();
    (existingUnits || []).forEach((u) => unitMap.set(u.name.toLowerCase(), u.id));

    // Load existing inventory items
    const { data: existingItems } = await supabase
      .from("inventory_items")
      .select("id, name, branch_id, base_unit_id")
      .eq("restaurant_id", restaurantId);

    // Map: "name|branchId" -> item
    const itemMap = new Map<string, { id: string; baseUnitId: string }>();
    (existingItems || []).forEach((item) => {
      const key = `${item.name.toLowerCase()}|${item.branch_id}`;
      itemMap.set(key, { id: item.id, baseUnitId: item.base_unit_id });
    });

    // Track items with existing transactions
    const itemsWithTransactions = new Set<string>();
    const itemIds = (existingItems || []).map((i) => i.id);
    if (itemIds.length > 0) {
      const { data: txnData } = await supabase
        .from("inventory_transactions")
        .select("item_id")
        .in("item_id", itemIds);
      (txnData || []).forEach((t) => itemsWithTransactions.add(t.item_id));
    }

    // Process results
    let itemsCreated = 0;
    let unitsCreated = 0;
    let stockEntriesCreated = 0;
    let stockEntriesSkipped = 0;
    const errors: string[] = [];

    // Process each row
    for (const row of rows) {
      try {
        const normalizedBranch = row.branchName?.toLowerCase().trim();
        const normalizedUnit = row.baseUnit?.toLowerCase().trim();
        const normalizedName = row.name?.trim();

        if (!normalizedName) {
          errors.push("اسم صنف فارغ");
          continue;
        }

        // Validate branch
        const branchId = branchMap.get(normalizedBranch);
        if (!branchId) {
          errors.push(`${normalizedName}: فرع غير موجود "${row.branchName}"`);
          continue;
        }

        // Get or create unit
        let unitId: string | undefined = unitMap.get(normalizedUnit);
        if (!unitId) {
          // Auto-create unit
          const symbol = DEFAULT_UNITS[normalizedUnit] || normalizedUnit;
          const { data: newUnit, error: unitError } = await supabase
            .from("inventory_units")
            .insert({
              restaurant_id: restaurantId,
              name: normalizedUnit,
              symbol: symbol,
            })
            .select("id")
            .single();

          if (unitError || !newUnit) {
            errors.push(`${normalizedName}: فشل إنشاء وحدة "${row.baseUnit}"`);
            continue;
          }

          unitId = newUnit.id as string;
          unitMap.set(normalizedUnit, unitId);
          unitsCreated++;
        }

        // Now unitId is guaranteed to be defined (either found or created)
        // TypeScript doesn't understand the control flow, so we assert
        if (!unitId) {
          errors.push(`${normalizedName}: وحدة القياس غير صالحة`);
          continue;
        }

        // Check for existing item
        const itemKey = `${normalizedName.toLowerCase()}|${branchId}`;
        const itemData = itemMap.get(itemKey);
        let itemId: string;

        if (itemData) {
          // Item exists - check unit mismatch
          if (itemData.baseUnitId !== unitId) {
            errors.push(`${normalizedName}: وحدة القياس مختلفة عن الموجودة في النظام`);
            continue;
          }
          itemId = itemData.id;
        } else {
          // Create new item
          const { data: newItem, error: itemError } = await supabase
            .from("inventory_items")
            .insert({
              restaurant_id: restaurantId,
              branch_id: branchId,
              name: row.name.trim(),
              base_unit_id: unitId,
              min_level: row.minLevel || 0,
              reorder_point: row.reorderPoint || 0,
              category: row.category || null,
            })
            .select("id")
            .single();

          if (itemError) {
            errors.push(`${normalizedName}: فشل إنشاء الصنف`);
            continue;
          }

          itemId = newItem.id;
          itemMap.set(itemKey, { id: itemId, baseUnitId: unitId });
          itemsCreated++;
        }

        // Create stock transaction if quantity > 0
        const quantity = row.quantity || 0;
        if (quantity > 0) {
          // Check if item already has transactions
          if (itemsWithTransactions.has(itemId)) {
            stockEntriesSkipped++;
            continue;
          }

          // Create INITIAL_STOCK_IMPORT transaction
          const { error: txnError } = await supabase
            .from("inventory_transactions")
            .insert({
              restaurant_id: restaurantId,
              branch_id: branchId,
              item_id: itemId,
              txn_type: "INITIAL_STOCK_IMPORT",
              qty: quantity,
              unit_id: unitId,
              qty_in_base: quantity, // Same as qty since we're using base unit
              notes: "CSV Import - رصيد افتتاحي",
              created_by: user.id,
            });

          if (txnError) {
            errors.push(`${normalizedName}: فشل إضافة الكمية`);
            continue;
          }

          // Update stock level
          const { data: currentStock } = await supabase
            .from("inventory_stock_levels")
            .select("on_hand_base")
            .eq("item_id", itemId)
            .eq("branch_id", branchId)
            .maybeSingle();

          const newOnHand = (currentStock?.on_hand_base || 0) + quantity;

          await supabase
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

          stockEntriesCreated++;
          itemsWithTransactions.add(itemId);
        }
      } catch (err) {
        console.error("[CSV Import] Row error:", err);
        errors.push(`${row.name}: خطأ غير متوقع`);
      }
    }

    // Log audit entry for the import
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      entity_type: "inventory_csv_import",
      entity_id: null,
      action: "INVENTORY_CSV_IMPORT",
      details: {
        rows_processed: rows.length,
        items_created: itemsCreated,
        units_created: unitsCreated,
        stock_entries_created: stockEntriesCreated,
        stock_entries_skipped: stockEntriesSkipped,
        errors_count: errors.length,
      },
    });

    const result: ImportResult = {
      success: true,
      itemsCreated,
      unitsCreated,
      stockEntriesCreated,
      stockEntriesSkipped,
      errors,
    };

    console.log(`[inventory-csv-import] Complete: ${itemsCreated} items, ${stockEntriesCreated} stock entries, ${errors.length} errors`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[inventory-csv-import] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
