import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay } from "date-fns";

// ============= INTERFACES =============

export interface ConsumptionVarianceItem {
  inventoryItemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  unitName: string;
  theoreticalConsumption: number;
  actualConsumption: number;
  variance: number;
  variancePercentage: number;
  varianceCost: number;
  avgCost: number;
  rootCauseTag: string | null;
  rootCauseNotes: string | null;
  tagId: string | null;
}

export interface ConsumptionVarianceParams {
  restaurantId: string | undefined;
  branchId: string | undefined;
  startDate: Date;
  endDate: Date;
}

export type RootCauseType =
  | "WASTE"
  | "THEFT"
  | "OVER_PORTIONING"
  | "DATA_ERROR"
  | "SUPPLIER_VARIANCE"
  | "UNKNOWN";

export const ROOT_CAUSE_OPTIONS: RootCauseType[] = [
  "WASTE",
  "THEFT",
  "OVER_PORTIONING",
  "DATA_ERROR",
  "SUPPLIER_VARIANCE",
  "UNKNOWN",
];

// ============= THEORETICAL CONSUMPTION ENGINE =============
// Calculates expected consumption based on paid orders and recipes

async function calculateTheoreticalConsumption(
  restaurantId: string,
  branchId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const theoreticalMap = new Map<string, number>();

  // Step 1: Get all PAID orders in the date range for the branch
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("branch_id", branchId)
    .eq("status", "paid")
    .gte("created_at", startOfDay(startDate).toISOString())
    .lte("created_at", endOfDay(endDate).toISOString());

  if (ordersError) {
    console.error("[variance] Failed to fetch orders:", ordersError);
    return theoreticalMap;
  }

  if (!orders || orders.length === 0) {
    return theoreticalMap;
  }

  const orderIds = orders.map((o) => o.id);

  // Step 2: Get order items (non-voided) for these orders
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity")
    .in("order_id", orderIds)
    .eq("voided", false);

  if (itemsError) {
    console.error("[variance] Failed to fetch order items:", itemsError);
    return theoreticalMap;
  }

  if (!orderItems || orderItems.length === 0) {
    return theoreticalMap;
  }

  // Step 3: Aggregate quantities by menu_item_id
  const menuItemQty: Record<string, number> = {};
  for (const item of orderItems) {
    if (item.menu_item_id) {
      menuItemQty[item.menu_item_id] = (menuItemQty[item.menu_item_id] || 0) + item.quantity;
    }
  }

  const menuItemIds = Object.keys(menuItemQty);
  if (menuItemIds.length === 0) {
    return theoreticalMap;
  }

  // Step 4: Load active recipes for these menu items
  const { data: recipes, error: recipesError } = await supabase
    .from("menu_item_recipes")
    .select("id, menu_item_id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .in("menu_item_id", menuItemIds);

  if (recipesError) {
    console.error("[variance] Failed to fetch recipes:", recipesError);
    return theoreticalMap;
  }

  if (!recipes || recipes.length === 0) {
    return theoreticalMap;
  }

  const recipeIds = recipes.map((r) => r.id);
  const recipeMenuMap = new Map(recipes.map((r) => [r.id, r.menu_item_id]));

  // Step 5: Load recipe lines
  const { data: recipeLines, error: linesError } = await supabase
    .from("menu_item_recipe_lines")
    .select("recipe_id, inventory_item_id, qty_in_base")
    .in("recipe_id", recipeIds);

  if (linesError) {
    console.error("[variance] Failed to fetch recipe lines:", linesError);
    return theoreticalMap;
  }

  if (!recipeLines || recipeLines.length === 0) {
    return theoreticalMap;
  }

  // Step 6: Calculate theoretical consumption per inventory item
  for (const line of recipeLines) {
    const menuItemId = recipeMenuMap.get(line.recipe_id);
    if (!menuItemId) continue;

    const orderedQty = menuItemQty[menuItemId] || 0;
    const requiredBase = Number(line.qty_in_base) * orderedQty;

    const current = theoreticalMap.get(line.inventory_item_id) || 0;
    theoreticalMap.set(line.inventory_item_id, current + requiredBase);
  }

  return theoreticalMap;
}

// ============= ACTUAL CONSUMPTION ENGINE =============
// Calculates actual consumption from inventory ledger

async function calculateActualConsumption(
  restaurantId: string,
  branchId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const actualMap = new Map<string, number>();

  // Get all inventory transactions that represent consumption
  // SALE_DEDUCTION: from order payment (recipe-based deduction)
  // WASTE: manual waste recording
  // ADJUSTMENT_OUT: stock adjustments (decrease)
  // STOCK_COUNT_ADJUSTMENT: adjustments from approved stock counts (can be + or -)
  const { data: transactions, error: txnError } = await supabase
    .from("inventory_transactions")
    .select("item_id, qty_in_base, txn_type")
    .eq("restaurant_id", restaurantId)
    .eq("branch_id", branchId)
    .in("txn_type", ["SALE_DEDUCTION", "WASTE", "ADJUSTMENT_OUT", "STOCK_COUNT_ADJUSTMENT"])
    .gte("created_at", startOfDay(startDate).toISOString())
    .lte("created_at", endOfDay(endDate).toISOString());

  if (txnError) {
    console.error("[variance] Failed to fetch transactions:", txnError);
    return actualMap;
  }

  if (!transactions || transactions.length === 0) {
    return actualMap;
  }

  // Aggregate consumption by item
  // Note: qty_in_base is negative for outflows
  for (const tx of transactions) {
    const qtyBase = Math.abs(Number(tx.qty_in_base) || 0);
    
    // For STOCK_COUNT_ADJUSTMENT, only count negative values (decreases)
    if (tx.txn_type === "STOCK_COUNT_ADJUSTMENT") {
      const rawQty = Number(tx.qty_in_base) || 0;
      if (rawQty < 0) {
        const current = actualMap.get(tx.item_id) || 0;
        actualMap.set(tx.item_id, current + Math.abs(rawQty));
      }
    } else {
      const current = actualMap.get(tx.item_id) || 0;
      actualMap.set(tx.item_id, current + qtyBase);
    }
  }

  return actualMap;
}

// ============= CONSUMPTION VARIANCE HOOK =============

export function useConsumptionVariance({
  restaurantId,
  branchId,
  startDate,
  endDate,
}: ConsumptionVarianceParams) {
  return useQuery({
    queryKey: [
      "consumption-variance",
      restaurantId,
      branchId,
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd"),
    ],
    queryFn: async (): Promise<ConsumptionVarianceItem[]> => {
      if (!restaurantId || !branchId) return [];

      // Calculate both theoretical and actual consumption in parallel
      const [theoreticalMap, actualMap] = await Promise.all([
        calculateTheoreticalConsumption(restaurantId, branchId, startDate, endDate),
        calculateActualConsumption(restaurantId, branchId, startDate, endDate),
      ]);

      // Collect all unique inventory item IDs
      const allItemIds = new Set([
        ...theoreticalMap.keys(),
        ...actualMap.keys(),
      ]);

      if (allItemIds.size === 0) {
        return [];
      }

      // Fetch inventory item details
      const { data: inventoryItems, error: invError } = await supabase
        .from("inventory_items")
        .select(`
          id,
          name,
          avg_cost,
          branch_id,
          inventory_units!inventory_items_base_unit_id_fkey (name),
          restaurant_branches!inner (name)
        `)
        .in("id", Array.from(allItemIds));

      if (invError) {
        console.error("[variance] Failed to fetch inventory items:", invError);
        return [];
      }

      // Fetch existing variance tags for this period
      const { data: existingTags } = await supabase
        .from("inventory_variance_tags")
        .select("id, inventory_item_id, root_cause, notes")
        .eq("restaurant_id", restaurantId)
        .eq("branch_id", branchId)
        .eq("period_start", format(startDate, "yyyy-MM-dd"))
        .eq("period_end", format(endDate, "yyyy-MM-dd"));

      const tagMap = new Map(
        (existingTags || []).map((t: any) => [
          t.inventory_item_id,
          { id: t.id, root_cause: t.root_cause, notes: t.notes },
        ])
      );

      // Build variance items
      const varianceItems: ConsumptionVarianceItem[] = [];

      for (const item of inventoryItems || []) {
        const theoretical = theoreticalMap.get(item.id) || 0;
        const actual = actualMap.get(item.id) || 0;
        
        // Skip items with no consumption at all
        if (theoretical === 0 && actual === 0) continue;

        const variance = actual - theoretical;
        const variancePercentage = theoretical > 0 
          ? ((variance / theoretical) * 100) 
          : (actual > 0 ? 100 : 0);
        const avgCost = Number(item.avg_cost) || 0;
        const varianceCost = variance * avgCost;

        const tag = tagMap.get(item.id);

        varianceItems.push({
          inventoryItemId: item.id,
          itemName: item.name,
          branchId: item.branch_id,
          branchName: (item as any).restaurant_branches?.name || "",
          unitName: (item as any).inventory_units?.name || "",
          theoreticalConsumption: theoretical,
          actualConsumption: actual,
          variance,
          variancePercentage,
          varianceCost,
          avgCost,
          rootCauseTag: tag?.root_cause || null,
          rootCauseNotes: tag?.notes || null,
          tagId: tag?.id || null,
        });
      }

      // Sort by absolute variance value (highest impact first)
      varianceItems.sort((a, b) => Math.abs(b.varianceCost) - Math.abs(a.varianceCost));

      return varianceItems;
    },
    enabled: !!restaurantId && !!branchId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

// ============= VARIANCE TAGGING MUTATIONS =============

interface UpsertVarianceTagParams {
  restaurantId: string;
  branchId: string;
  inventoryItemId: string;
  periodStart: string;
  periodEnd: string;
  rootCause: RootCauseType;
  notes?: string;
  varianceQty: number;
  varianceValue: number;
}

export function useUpsertVarianceTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpsertVarianceTagParams) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("inventory_variance_tags")
        .upsert(
          {
            restaurant_id: params.restaurantId,
            branch_id: params.branchId,
            inventory_item_id: params.inventoryItemId,
            period_start: params.periodStart,
            period_end: params.periodEnd,
            root_cause: params.rootCause,
            notes: params.notes || null,
            variance_qty: params.varianceQty,
            variance_value: params.varianceValue,
            tagged_by: session.session.user.id,
          },
          {
            onConflict: "branch_id,inventory_item_id,period_start,period_end",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "consumption-variance",
          variables.restaurantId,
          variables.branchId,
          variables.periodStart,
          variables.periodEnd,
        ],
      });
      toast({
        title: "Tag saved",
        description: "Variance root cause has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteVarianceTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagId }: { tagId: string }) => {
      const { error } = await supabase
        .from("inventory_variance_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption-variance"] });
      toast({
        title: "Tag removed",
        description: "Variance tag has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ============= CONSUMPTION VARIANCE SUMMARY =============

export interface ConsumptionVarianceSummary {
  totalItems: number;
  itemsWithVariance: number;
  totalPositiveVariance: number;
  totalNegativeVariance: number;
  netVarianceCost: number;
  taggedCount: number;
  untaggedCount: number;
}

export function useConsumptionVarianceSummary(items: ConsumptionVarianceItem[]): ConsumptionVarianceSummary {
  const itemsWithVariance = items.filter((i) => Math.abs(i.variance) > 0.001);
  
  const totalPositiveVariance = items
    .filter((i) => i.variance > 0)
    .reduce((sum, i) => sum + i.variance, 0);
  
  const totalNegativeVariance = items
    .filter((i) => i.variance < 0)
    .reduce((sum, i) => sum + Math.abs(i.variance), 0);
  
  const netVarianceCost = items.reduce((sum, i) => sum + i.varianceCost, 0);
  
  const taggedCount = items.filter((i) => i.rootCauseTag).length;
  const untaggedCount = itemsWithVariance.length - taggedCount;

  return {
    totalItems: items.length,
    itemsWithVariance: itemsWithVariance.length,
    totalPositiveVariance,
    totalNegativeVariance,
    netVarianceCost,
    taggedCount,
    untaggedCount,
  };
}
