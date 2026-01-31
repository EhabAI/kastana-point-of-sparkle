import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subWeeks, startOfWeek, differenceInDays } from "date-fns";

// ============= INTERFACES =============

export type AlertSeverity = "warning" | "critical";
export type AlertType = "REPEATED_HIGH_VARIANCE" | "VARIANCE_SPIKE" | "WORSENING_TREND";

export interface InventoryAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  itemId: string;
  itemName: string;
  branchName: string;
  title: string;
  explanation: string;
  suggestion: string;
  data: {
    currentVariance?: number;
    previousVariance?: number;
    occurrences?: number;
    percentageChange?: number;
    unitName?: string;
  };
  detectedAt: string;
}

interface StockCountWithLines {
  id: string;
  branchId: string;
  branchName: string;
  approvedAt: string;
  lines: Array<{
    itemId: string;
    itemName: string;
    unitName: string;
    variance: number;
    avgCost: number;
  }>;
}

// ============= THRESHOLDS =============

const THRESHOLDS = {
  // Consider variance "high" if absolute value > this percentage of expected
  HIGH_VARIANCE_PERCENT: 0.1, // 10%
  // Minimum absolute variance to consider (prevents noise on tiny quantities)
  MIN_VARIANCE_QTY: 1,
  // Number of occurrences to trigger "repeated" alert
  REPEATED_OCCURRENCES: 2,
  // Percentage increase to consider a "spike"
  SPIKE_PERCENT: 0.5, // 50% increase
  // Weeks to analyze for trends
  TREND_WEEKS: 4,
  // Week-over-week increase to consider "worsening"
  WORSENING_PERCENT: 0.25, // 25% worse each week
};

// ============= MAIN HOOK =============

export function useInventoryAlerts(restaurantId: string | undefined, branchId?: string) {
  return useQuery({
    queryKey: ["inventory-alerts", restaurantId, branchId],
    queryFn: async (): Promise<InventoryAlert[]> => {
      if (!restaurantId) return [];

      // Fetch recent approved stock counts (last 60 days for trend analysis)
      const startDate = subDays(new Date(), 60);

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
        .gte("approved_at", startDate.toISOString())
        .order("approved_at", { ascending: true });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data: stockCounts, error: scError } = await query;

      if (scError) {
        console.error("Error fetching stock counts for alerts:", scError);
        return [];
      }

      if (!stockCounts || stockCounts.length === 0) return [];

      // Fetch all lines for these stock counts
      const countIds = stockCounts.map((sc: any) => sc.id);

      const { data: lines, error: linesError } = await supabase
        .from("stock_count_lines")
        .select(`
          stock_count_id,
          item_id,
          expected_base,
          actual_base,
          inventory_items!inner (
            name,
            avg_cost,
            inventory_units!inventory_items_base_unit_id_fkey (name)
          )
        `)
        .in("stock_count_id", countIds);

      if (linesError) {
        console.error("Error fetching stock count lines:", linesError);
        return [];
      }

      // Build structured data
      const countsWithLines: StockCountWithLines[] = stockCounts.map((sc: any) => ({
        id: sc.id,
        branchId: sc.branch_id,
        branchName: sc.restaurant_branches.name,
        approvedAt: sc.approved_at,
        lines: (lines || [])
          .filter((l: any) => l.stock_count_id === sc.id)
          .map((l: any) => ({
            itemId: l.item_id,
            itemName: l.inventory_items.name,
            unitName: l.inventory_items.inventory_units?.name || "",
            variance: l.actual_base - l.expected_base,
            avgCost: l.inventory_items.avg_cost || 0,
          })),
      }));

      const alerts: InventoryAlert[] = [];

      // Detect alerts
      alerts.push(...detectRepeatedHighVariance(countsWithLines));
      alerts.push(...detectVarianceSpikes(countsWithLines));
      alerts.push(...detectWorseningTrends(countsWithLines));

      // Sort by severity (critical first) then by detection time
      return alerts.sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === "critical" ? -1 : 1;
        }
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      });
    },
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

// ============= DETECTION FUNCTIONS =============

function detectRepeatedHighVariance(counts: StockCountWithLines[]): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  // Group variance occurrences by item
  const itemVariances = new Map<string, Array<{
    variance: number;
    expected: number;
    branchName: string;
    unitName: string;
    itemName: string;
    date: string;
  }>>();

  counts.forEach((count) => {
    count.lines.forEach((line) => {
      const absVariance = Math.abs(line.variance);
      if (absVariance < THRESHOLDS.MIN_VARIANCE_QTY) return;

      const existing = itemVariances.get(line.itemId) || [];
      existing.push({
        variance: line.variance,
        expected: absVariance / 0.1, // Approximate expected (will be refined)
        branchName: count.branchName,
        unitName: line.unitName,
        itemName: line.itemName,
        date: count.approvedAt,
      });
      itemVariances.set(line.itemId, existing);
    });
  });

  // Check for repeated high variance
  itemVariances.forEach((occurrences, itemId) => {
    const highVarianceCount = occurrences.filter(
      (o) => Math.abs(o.variance) >= THRESHOLDS.MIN_VARIANCE_QTY
    ).length;

    if (highVarianceCount >= THRESHOLDS.REPEATED_OCCURRENCES) {
      const latest = occurrences[occurrences.length - 1];
      const avgVariance = occurrences.reduce((sum, o) => sum + Math.abs(o.variance), 0) / occurrences.length;
      const isShortage = occurrences.filter((o) => o.variance < 0).length > occurrences.length / 2;

      alerts.push({
        id: `repeated-${itemId}`,
        type: "REPEATED_HIGH_VARIANCE",
        severity: highVarianceCount >= 3 ? "critical" : "warning",
        itemId,
        itemName: latest.itemName,
        branchName: latest.branchName,
        title: `Repeated ${isShortage ? "shortage" : "overage"} on ${latest.itemName}`,
        explanation: `This item has shown significant variance in ${highVarianceCount} of the last ${counts.length} stock counts. Average variance: ${avgVariance.toFixed(2)} ${latest.unitName}. This pattern suggests a systematic issue rather than random error.`,
        suggestion: isShortage
          ? "Review: (1) Recipe accuracy - portions may be larger than defined. (2) Waste logging - check if waste is being recorded. (3) Theft or unrecorded usage. (4) Receiving errors - verify deliveries match invoices."
          : "Review: (1) Recipe accuracy - portions may be smaller than defined. (2) Over-receiving - check if more stock is received than invoiced. (3) Stock count procedure - ensure counters are properly trained.",
        data: {
          occurrences: highVarianceCount,
          currentVariance: Math.abs(latest.variance),
          unitName: latest.unitName,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  });

  return alerts;
}

function detectVarianceSpikes(counts: StockCountWithLines[]): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  if (counts.length < 2) return alerts;

  // Compare the last count to the previous one
  const latestCount = counts[counts.length - 1];
  const previousCount = counts[counts.length - 2];

  // Build variance maps
  const previousVariances = new Map<string, { variance: number; itemName: string; unitName: string }>();
  previousCount.lines.forEach((line) => {
    previousVariances.set(line.itemId, {
      variance: Math.abs(line.variance),
      itemName: line.itemName,
      unitName: line.unitName,
    });
  });

  latestCount.lines.forEach((line) => {
    const absVariance = Math.abs(line.variance);
    if (absVariance < THRESHOLDS.MIN_VARIANCE_QTY) return;

    const previous = previousVariances.get(line.itemId);
    if (!previous) {
      // New variance where there was none before
      if (absVariance >= THRESHOLDS.MIN_VARIANCE_QTY * 3) {
        alerts.push({
          id: `spike-new-${line.itemId}`,
          type: "VARIANCE_SPIKE",
          severity: "warning",
          itemId: line.itemId,
          itemName: line.itemName,
          branchName: latestCount.branchName,
          title: `New variance detected on ${line.itemName}`,
          explanation: `This item showed ${line.variance > 0 ? "an overage" : "a shortage"} of ${absVariance.toFixed(2)} ${line.unitName} in the latest stock count, but had no significant variance previously. This sudden appearance warrants investigation.`,
          suggestion: "Review: (1) Recent recipe changes or menu updates. (2) New staff who may need training. (3) Supplier changes or quality issues. (4) Equipment malfunction (e.g., portion scales).",
          data: {
            currentVariance: absVariance,
            previousVariance: 0,
            unitName: line.unitName,
          },
          detectedAt: new Date().toISOString(),
        });
      }
      return;
    }

    // Check for significant increase
    if (previous.variance > 0) {
      const increase = (absVariance - previous.variance) / previous.variance;
      if (increase >= THRESHOLDS.SPIKE_PERCENT && absVariance >= THRESHOLDS.MIN_VARIANCE_QTY * 2) {
        const percentIncrease = Math.round(increase * 100);
        alerts.push({
          id: `spike-${line.itemId}`,
          type: "VARIANCE_SPIKE",
          severity: percentIncrease >= 100 ? "critical" : "warning",
          itemId: line.itemId,
          itemName: line.itemName,
          branchName: latestCount.branchName,
          title: `Variance spike on ${line.itemName} (+${percentIncrease}%)`,
          explanation: `Variance on this item jumped from ${previous.variance.toFixed(2)} to ${absVariance.toFixed(2)} ${line.unitName} - a ${percentIncrease}% increase since the last stock count (${differenceInDays(new Date(latestCount.approvedAt), new Date(previousCount.approvedAt))} days ago).`,
          suggestion: line.variance < 0
            ? "Immediate review recommended: (1) Check for unusual waste events. (2) Review refunds involving this item. (3) Verify no bulk spoilage or theft. (4) Cross-check with sales data for anomalies."
            : "Review: (1) Check for receiving errors or duplicate deliveries. (2) Verify stock count accuracy. (3) Review any returns from kitchen to storage.",
          data: {
            currentVariance: absVariance,
            previousVariance: previous.variance,
            percentageChange: percentIncrease,
            unitName: line.unitName,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }
  });

  return alerts;
}

function detectWorseningTrends(counts: StockCountWithLines[]): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  // Need at least 3 counts for trend analysis
  if (counts.length < 3) return alerts;

  // Group counts by week
  const weeklyData = new Map<string, Map<string, { variances: number[]; itemName: string; unitName: string; branchName: string }>>();

  counts.forEach((count) => {
    const weekKey = startOfWeek(new Date(count.approvedAt), { weekStartsOn: 1 }).toISOString();
    
    count.lines.forEach((line) => {
      const absVariance = Math.abs(line.variance);
      if (absVariance < THRESHOLDS.MIN_VARIANCE_QTY) return;

      if (!weeklyData.has(line.itemId)) {
        weeklyData.set(line.itemId, new Map());
      }
      const itemWeeks = weeklyData.get(line.itemId)!;

      if (!itemWeeks.has(weekKey)) {
        itemWeeks.set(weekKey, {
          variances: [],
          itemName: line.itemName,
          unitName: line.unitName,
          branchName: count.branchName,
        });
      }
      itemWeeks.get(weekKey)!.variances.push(absVariance);
    });
  });

  // Analyze trends per item
  weeklyData.forEach((itemWeeks, itemId) => {
    const weeks = Array.from(itemWeeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-THRESHOLDS.TREND_WEEKS); // Last N weeks

    if (weeks.length < 3) return;

    // Calculate weekly averages
    const weeklyAverages = weeks.map(([week, data]) => ({
      week,
      avg: data.variances.reduce((a, b) => a + b, 0) / data.variances.length,
      ...data,
    }));

    // Check for consistent worsening trend
    let worseningCount = 0;
    for (let i = 1; i < weeklyAverages.length; i++) {
      const prev = weeklyAverages[i - 1].avg;
      const curr = weeklyAverages[i].avg;
      if (prev > 0 && (curr - prev) / prev >= THRESHOLDS.WORSENING_PERCENT) {
        worseningCount++;
      }
    }

    // If worsening for 2+ consecutive comparisons, alert
    if (worseningCount >= 2) {
      const latest = weeklyAverages[weeklyAverages.length - 1];
      const first = weeklyAverages[0];
      const totalIncrease = first.avg > 0 ? ((latest.avg - first.avg) / first.avg) * 100 : 0;

      alerts.push({
        id: `trend-${itemId}`,
        type: "WORSENING_TREND",
        severity: totalIncrease >= 100 ? "critical" : "warning",
        itemId,
        itemName: latest.itemName,
        branchName: latest.branchName,
        title: `Worsening variance trend on ${latest.itemName}`,
        explanation: `Variance on this item has been consistently increasing over the past ${weeklyAverages.length} weeks. Started at ~${first.avg.toFixed(2)} ${latest.unitName}/week, now at ~${latest.avg.toFixed(2)} ${latest.unitName}/week (${totalIncrease > 0 ? "+" : ""}${totalIncrease.toFixed(0)}% overall).`,
        suggestion: "This pattern indicates a growing problem that should be addressed: (1) Review operational changes that coincide with when the trend started. (2) Re-train staff on portion control and waste logging. (3) Audit recipe definitions against actual preparation. (4) Consider more frequent stock counts to catch issues earlier.",
        data: {
          currentVariance: latest.avg,
          previousVariance: first.avg,
          percentageChange: Math.round(totalIncrease),
          unitName: latest.unitName,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  });

  return alerts;
}
