import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval } from "date-fns";

// ============= INTERFACES =============

export interface VarianceTrendPoint {
  period: string; // Date string (YYYY-MM-DD or week label)
  branchId: string;
  branchName: string;
  positiveVariance: number;
  negativeVariance: number;
  netVariance: number;
  countApproved: number;
}

export interface TopVarianceItem {
  itemId: string;
  itemName: string;
  branchName: string;
  unitName: string;
  totalVarianceQty: number; // Absolute sum
  totalVarianceValue: number; // Cost-weighted (if cost exists)
  varianceCount: number; // Number of stock counts with variance
}

export interface VarianceByReason {
  reason: "USAGE" | "WASTE" | "REFUND" | "ADJUSTMENT";
  totalQty: number;
  totalValue: number;
  transactionCount: number;
}

export interface VarianceBreakdown {
  branchId: string;
  branchName: string;
  breakdown: VarianceByReason[];
}

type Granularity = "daily" | "weekly";

// ============= VARIANCE TRENDS OVER TIME =============

export function useVarianceTrends(
  restaurantId: string | undefined,
  granularity: Granularity = "daily",
  days: number = 30,
  branchId?: string
) {
  return useQuery({
    queryKey: ["variance-trends", restaurantId, granularity, days, branchId],
    queryFn: async (): Promise<VarianceTrendPoint[]> => {
      if (!restaurantId) return [];

      const startDate = subDays(new Date(), days);

      // Get APPROVED stock counts within the date range
      let query = supabase
        .from("stock_counts")
        .select(`
          id,
          branch_id,
          approved_at,
          restaurant_branches!inner (name)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("status", "APPROVED")
        .gte("approved_at", startDate.toISOString());

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data: stockCounts, error: scError } = await query;

      if (scError) {
        console.error("Error fetching stock counts for trends:", scError);
        return [];
      }

      if (!stockCounts || stockCounts.length === 0) return [];

      // Get stock count lines for variance data
      const countIds = stockCounts.map((sc: any) => sc.id);
      const { data: lines, error: linesError } = await supabase
        .from("stock_count_lines")
        .select("stock_count_id, expected_base, actual_base")
        .in("stock_count_id", countIds);

      if (linesError) {
        console.error("Error fetching stock count lines:", linesError);
        return [];
      }

      // Build variance per stock count
      const variancePerCount = new Map<string, { positive: number; negative: number }>();
      (lines || []).forEach((line: any) => {
        const variance = line.actual_base - line.expected_base;
        const existing = variancePerCount.get(line.stock_count_id) || { positive: 0, negative: 0 };
        if (variance > 0) {
          existing.positive += variance;
        } else {
          existing.negative += Math.abs(variance);
        }
        variancePerCount.set(line.stock_count_id, existing);
      });

      // Group by period and branch
      const trendMap = new Map<string, VarianceTrendPoint>();

      stockCounts.forEach((sc: any) => {
        const approvedDate = new Date(sc.approved_at);
        let periodKey: string;

        if (granularity === "daily") {
          periodKey = format(startOfDay(approvedDate), "yyyy-MM-dd");
        } else {
          const weekStart = startOfWeek(approvedDate, { weekStartsOn: 1 });
          periodKey = format(weekStart, "yyyy-'W'ww");
        }

        const mapKey = `${periodKey}|${sc.branch_id}`;
        const existing = trendMap.get(mapKey) || {
          period: periodKey,
          branchId: sc.branch_id,
          branchName: sc.restaurant_branches.name,
          positiveVariance: 0,
          negativeVariance: 0,
          netVariance: 0,
          countApproved: 0,
        };

        const variance = variancePerCount.get(sc.id) || { positive: 0, negative: 0 };
        existing.positiveVariance += variance.positive;
        existing.negativeVariance += variance.negative;
        existing.netVariance += variance.positive - variance.negative;
        existing.countApproved += 1;

        trendMap.set(mapKey, existing);
      });

      return Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// ============= TOP VARIANCE ITEMS =============

export function useTopVarianceItems(
  restaurantId: string | undefined,
  days: number = 30,
  limit: number = 10,
  sortBy: "quantity" | "value" = "quantity",
  branchId?: string
) {
  return useQuery({
    queryKey: ["top-variance-items", restaurantId, days, limit, sortBy, branchId],
    queryFn: async (): Promise<TopVarianceItem[]> => {
      if (!restaurantId) return [];

      const startDate = subDays(new Date(), days);

      // Get APPROVED stock counts within the date range
      let query = supabase
        .from("stock_counts")
        .select("id, branch_id, restaurant_branches!inner (name)")
        .eq("restaurant_id", restaurantId)
        .eq("status", "APPROVED")
        .gte("approved_at", startDate.toISOString());

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data: stockCounts, error: scError } = await query;

      if (scError) {
        console.error("Error fetching stock counts:", scError);
        return [];
      }

      if (!stockCounts || stockCounts.length === 0) return [];

      // Map branch_id to branch_name
      const branchMap = new Map<string, string>();
      stockCounts.forEach((sc: any) => {
        branchMap.set(sc.branch_id, sc.restaurant_branches.name);
      });

      const countIds = stockCounts.map((sc: any) => sc.id);

      // Get stock count lines with item info
      const { data: lines, error: linesError } = await supabase
        .from("stock_count_lines")
        .select(`
          stock_count_id,
          item_id,
          expected_base,
          actual_base,
          inventory_items!inner (
            name,
            branch_id,
            avg_cost,
            inventory_units!inventory_items_base_unit_id_fkey (name)
          )
        `)
        .in("stock_count_id", countIds);

      if (linesError) {
        console.error("Error fetching stock count lines:", linesError);
        return [];
      }

      // Aggregate by item
      const itemMap = new Map<string, TopVarianceItem>();

      (lines || []).forEach((line: any) => {
        const variance = Math.abs(line.actual_base - line.expected_base);
        if (variance < 0.001) return; // Skip zero variance

        const itemKey = line.item_id;
        const existing = itemMap.get(itemKey) || {
          itemId: line.item_id,
          itemName: line.inventory_items.name,
          branchName: branchMap.get(line.inventory_items.branch_id) || "",
          unitName: line.inventory_items.inventory_units?.name || "",
          totalVarianceQty: 0,
          totalVarianceValue: 0,
          varianceCount: 0,
        };

        existing.totalVarianceQty += variance;
        existing.totalVarianceValue += variance * (line.inventory_items.avg_cost || 0);
        existing.varianceCount += 1;

        itemMap.set(itemKey, existing);
      });

      // Sort and limit
      const sorted = Array.from(itemMap.values()).sort((a, b) => {
        if (sortBy === "value") {
          return b.totalVarianceValue - a.totalVarianceValue;
        }
        return b.totalVarianceQty - a.totalVarianceQty;
      });

      return sorted.slice(0, limit);
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============= VARIANCE BREAKDOWN BY REASON =============

export function useVarianceBreakdown(
  restaurantId: string | undefined,
  days: number = 30,
  branchId?: string
) {
  return useQuery({
    queryKey: ["variance-breakdown", restaurantId, days, branchId],
    queryFn: async (): Promise<VarianceBreakdown[]> => {
      if (!restaurantId) return [];

      const startDate = subDays(new Date(), days);

      // Get all inventory transactions within the date range
      // Reason buckets map to txn_type:
      // - USAGE: SALE (deductions via recipes)
      // - WASTE: WASTE
      // - REFUND: REFUND (if inventory is restored)
      // - ADJUSTMENT: INVENTORY_ADJUSTMENT (from stock count approvals)
      let query = supabase
        .from("inventory_transactions")
        .select(`
          id,
          branch_id,
          txn_type,
          qty_in_base,
          unit_cost,
          total_cost,
          restaurant_branches!inner (name)
        `)
        .eq("restaurant_id", restaurantId)
        .in("txn_type", ["SALE", "WASTE", "REFUND", "INVENTORY_ADJUSTMENT"])
        .gte("created_at", startDate.toISOString());

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data: transactions, error: txnError } = await query;

      if (txnError) {
        console.error("Error fetching transactions:", txnError);
        return [];
      }

      // Group by branch and reason
      const branchMap = new Map<string, VarianceBreakdown>();

      (transactions || []).forEach((tx: any) => {
        const existing = branchMap.get(tx.branch_id) || {
          branchId: tx.branch_id,
          branchName: tx.restaurant_branches.name,
          breakdown: [],
        };

        // Map txn_type to reason bucket
        let reason: VarianceByReason["reason"];
        switch (tx.txn_type) {
          case "SALE":
            reason = "USAGE";
            break;
          case "WASTE":
            reason = "WASTE";
            break;
          case "REFUND":
            reason = "REFUND";
            break;
          case "INVENTORY_ADJUSTMENT":
            reason = "ADJUSTMENT";
            break;
          default:
            return;
        }

        // Find or create the reason entry
        let reasonEntry = existing.breakdown.find((b) => b.reason === reason);
        if (!reasonEntry) {
          reasonEntry = { reason, totalQty: 0, totalValue: 0, transactionCount: 0 };
          existing.breakdown.push(reasonEntry);
        }

        reasonEntry.totalQty += Math.abs(tx.qty_in_base || 0);
        reasonEntry.totalValue += Math.abs(tx.total_cost || 0);
        reasonEntry.transactionCount += 1;

        branchMap.set(tx.branch_id, existing);
      });

      return Array.from(branchMap.values());
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============= AGGREGATED VARIANCE SUMMARY =============

export interface VarianceSummary {
  totalPositiveVariance: number;
  totalNegativeVariance: number;
  netVariance: number;
  totalVarianceValue: number;
  stockCountsApproved: number;
  itemsWithVariance: number;
}

export function useVarianceSummary(
  restaurantId: string | undefined,
  days: number = 30,
  branchId?: string
) {
  return useQuery({
    queryKey: ["variance-summary", restaurantId, days, branchId],
    queryFn: async (): Promise<VarianceSummary> => {
      if (!restaurantId) {
        return {
          totalPositiveVariance: 0,
          totalNegativeVariance: 0,
          netVariance: 0,
          totalVarianceValue: 0,
          stockCountsApproved: 0,
          itemsWithVariance: 0,
        };
      }

      const startDate = subDays(new Date(), days);

      // Get APPROVED stock counts
      let query = supabase
        .from("stock_counts")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("status", "APPROVED")
        .gte("approved_at", startDate.toISOString());

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data: stockCounts, error: scError } = await query;

      if (scError) {
        console.error("Error fetching stock counts:", scError);
        return {
          totalPositiveVariance: 0,
          totalNegativeVariance: 0,
          netVariance: 0,
          totalVarianceValue: 0,
          stockCountsApproved: 0,
          itemsWithVariance: 0,
        };
      }

      const countIds = (stockCounts || []).map((sc: any) => sc.id);
      if (countIds.length === 0) {
        return {
          totalPositiveVariance: 0,
          totalNegativeVariance: 0,
          netVariance: 0,
          totalVarianceValue: 0,
          stockCountsApproved: 0,
          itemsWithVariance: 0,
        };
      }

      // Get stock count lines with cost info
      const { data: lines, error: linesError } = await supabase
        .from("stock_count_lines")
        .select(`
          expected_base,
          actual_base,
          inventory_items!inner (avg_cost)
        `)
        .in("stock_count_id", countIds);

      if (linesError) {
        console.error("Error fetching stock count lines:", linesError);
        return {
          totalPositiveVariance: 0,
          totalNegativeVariance: 0,
          netVariance: 0,
          totalVarianceValue: 0,
          stockCountsApproved: countIds.length,
          itemsWithVariance: 0,
        };
      }

      let totalPositive = 0;
      let totalNegative = 0;
      let totalValue = 0;
      let itemsWithVariance = 0;

      (lines || []).forEach((line: any) => {
        const variance = line.actual_base - line.expected_base;
        if (Math.abs(variance) > 0.001) {
          itemsWithVariance++;
          const cost = line.inventory_items?.avg_cost || 0;
          totalValue += Math.abs(variance) * cost;
          if (variance > 0) {
            totalPositive += variance;
          } else {
            totalNegative += Math.abs(variance);
          }
        }
      });

      return {
        totalPositiveVariance: totalPositive,
        totalNegativeVariance: totalNegative,
        netVariance: totalPositive - totalNegative,
        totalVarianceValue: totalValue,
        stockCountsApproved: countIds.length,
        itemsWithVariance,
      };
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
}
