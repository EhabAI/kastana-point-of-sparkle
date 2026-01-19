/**
 * Smart Operational Insights Hook
 * Rule-based detection of repeated abnormal operational behavior
 * NO AI models - Pure rule-based logic with smart baseline comparison
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, differenceInHours } from "date-fns";

// ==================== TYPES ====================

export type InsightType = 
  | "repeated_cancellation_after_payment"
  | "excessive_discounts"
  | "repeated_inventory_adjustments"
  | "long_open_shifts"
  | "no_sales_during_hours";

export type InsightSeverity = "first" | "repeated";

export interface OperationalInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  detectedAt: string;
  consecutiveDays: number;
  currentValue: number;
  baselineValue: number;
  deviationPercent: number;
}

export interface BaselineData {
  avgCancellationsAfterPayment: number;
  avgDiscountRate: number;
  avgInventoryAdjustments: number;
  avgShiftDurationHours: number;
  avgOrdersPerDay: number;
  activeDaysCount: number;
}

export interface InsightsResult {
  insights: OperationalInsight[];
  baseline: BaselineData | null;
  isNewRestaurant: boolean;
  confidenceScore: number;
  operationalNotes: string[];
}

// ==================== CONSTANTS ====================

const MIN_ACTIVE_DAYS_FOR_INSIGHTS = 3;
const BASELINE_DAYS = 7;
const DEVIATION_THRESHOLD_PERCENT = 50; // 50% deviation from baseline to trigger

// Deduction values for confidence score
const INSIGHT_DEDUCTIONS: Record<InsightType, { first: number; repeated: number }> = {
  repeated_cancellation_after_payment: { first: 10, repeated: 15 },
  excessive_discounts: { first: 5, repeated: 10 },
  repeated_inventory_adjustments: { first: 5, repeated: 10 },
  long_open_shifts: { first: 5, repeated: 10 },
  no_sales_during_hours: { first: 10, repeated: 15 },
};

// ==================== ANTI-NOISE STORAGE ====================

interface InsightTrackingState {
  shownToday: Record<string, string>; // insightType -> date
  consecutiveDays: Record<string, number>; // insightType -> consecutive days count
  lastDetected: Record<string, string>; // insightType -> last detected date
}

const STORAGE_KEY = "kastana_operational_insights";

function getTrackingState(): InsightTrackingState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return { shownToday: {}, consecutiveDays: {}, lastDetected: {} };
}

function saveTrackingState(state: InsightTrackingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Ignore storage errors
  }
}

function updateInsightTracking(insightType: InsightType, detected: boolean): InsightSeverity {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const state = getTrackingState();
  
  if (detected) {
    // Check if already shown today
    if (state.shownToday[insightType] === today) {
      // Already shown, return current severity
      return state.consecutiveDays[insightType] >= 3 ? "repeated" : "first";
    }
    
    // Update consecutive days
    if (state.lastDetected[insightType] === yesterday) {
      state.consecutiveDays[insightType] = (state.consecutiveDays[insightType] || 0) + 1;
    } else {
      state.consecutiveDays[insightType] = 1;
    }
    
    state.shownToday[insightType] = today;
    state.lastDetected[insightType] = today;
    saveTrackingState(state);
    
    return state.consecutiveDays[insightType] >= 3 ? "repeated" : "first";
  } else {
    // Behavior improved - auto-dismiss
    if (state.lastDetected[insightType] !== today) {
      state.consecutiveDays[insightType] = 0;
      saveTrackingState(state);
    }
    return "first";
  }
}

function getConsecutiveDays(insightType: InsightType): number {
  const state = getTrackingState();
  return state.consecutiveDays[insightType] || 0;
}

function wasShownToday(insightType: InsightType): boolean {
  const today = format(new Date(), "yyyy-MM-dd");
  const state = getTrackingState();
  return state.shownToday[insightType] === today;
}

// ==================== MAIN HOOK ====================

export function useOperationalInsights(restaurantId: string | undefined) {
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  
  return useQuery({
    queryKey: ["operational-insights", restaurantId, format(today, "yyyy-MM-dd")],
    queryFn: async (): Promise<InsightsResult> => {
      if (!restaurantId) {
        return { 
          insights: [], 
          baseline: null, 
          isNewRestaurant: true, 
          confidenceScore: 100,
          operationalNotes: []
        };
      }
      
      // =============== STEP 1: Calculate Baseline ===============
      const baseline = await calculateBaseline(restaurantId, today);
      
      // Check if restaurant is too new for insights
      if (baseline.activeDaysCount < MIN_ACTIVE_DAYS_FOR_INSIGHTS) {
        return {
          insights: [],
          baseline,
          isNewRestaurant: true,
          confidenceScore: 100,
          operationalNotes: []
        };
      }
      
      // =============== STEP 2: Get Today's Data ===============
      const todayData = await getTodayData(restaurantId, todayStart, todayEnd);
      
      // =============== STEP 3: Detect Insights ===============
      const insights: OperationalInsight[] = [];
      
      // Rule 1: Repeated cancellation after payment
      if (todayData.cancellationsAfterPayment > 0) {
        const baselineValue = baseline.avgCancellationsAfterPayment;
        const deviationPercent = baselineValue > 0 
          ? ((todayData.cancellationsAfterPayment - baselineValue) / baselineValue) * 100
          : todayData.cancellationsAfterPayment > 1 ? 100 : 0;
        
        // Only trigger if repeated (>1) AND exceeds baseline significantly
        if (todayData.cancellationsAfterPayment > 1 && deviationPercent >= DEVIATION_THRESHOLD_PERCENT) {
          if (!wasShownToday("repeated_cancellation_after_payment")) {
            const severity = updateInsightTracking("repeated_cancellation_after_payment", true);
            insights.push({
              id: `cancellation_${format(today, "yyyyMMdd")}`,
              type: "repeated_cancellation_after_payment",
              severity,
              detectedAt: new Date().toISOString(),
              consecutiveDays: getConsecutiveDays("repeated_cancellation_after_payment"),
              currentValue: todayData.cancellationsAfterPayment,
              baselineValue,
              deviationPercent,
            });
          }
        }
      }
      
      // Rule 2: Excessive discounts
      if (todayData.totalOrders > 0 && baseline.avgDiscountRate > 0) {
        const todayDiscountRate = (todayData.totalDiscounts / todayData.totalRevenue) * 100;
        const deviationPercent = ((todayDiscountRate - baseline.avgDiscountRate) / baseline.avgDiscountRate) * 100;
        
        if (deviationPercent >= DEVIATION_THRESHOLD_PERCENT && todayData.discountedOrders > 2) {
          if (!wasShownToday("excessive_discounts")) {
            const severity = updateInsightTracking("excessive_discounts", true);
            insights.push({
              id: `discounts_${format(today, "yyyyMMdd")}`,
              type: "excessive_discounts",
              severity,
              detectedAt: new Date().toISOString(),
              consecutiveDays: getConsecutiveDays("excessive_discounts"),
              currentValue: todayDiscountRate,
              baselineValue: baseline.avgDiscountRate,
              deviationPercent,
            });
          }
        }
      }
      
      // Rule 3: Repeated inventory adjustments on same item
      if (todayData.repeatedInventoryAdjustments > 2) {
        const deviationPercent = baseline.avgInventoryAdjustments > 0
          ? ((todayData.repeatedInventoryAdjustments - baseline.avgInventoryAdjustments) / baseline.avgInventoryAdjustments) * 100
          : 100;
        
        if (deviationPercent >= DEVIATION_THRESHOLD_PERCENT) {
          if (!wasShownToday("repeated_inventory_adjustments")) {
            const severity = updateInsightTracking("repeated_inventory_adjustments", true);
            insights.push({
              id: `inventory_${format(today, "yyyyMMdd")}`,
              type: "repeated_inventory_adjustments",
              severity,
              detectedAt: new Date().toISOString(),
              consecutiveDays: getConsecutiveDays("repeated_inventory_adjustments"),
              currentValue: todayData.repeatedInventoryAdjustments,
              baselineValue: baseline.avgInventoryAdjustments,
              deviationPercent,
            });
          }
        }
      }
      
      // Rule 4: Long open shifts
      if (todayData.maxShiftHours > baseline.avgShiftDurationHours * 1.5 && todayData.maxShiftHours > 10) {
        const deviationPercent = ((todayData.maxShiftHours - baseline.avgShiftDurationHours) / baseline.avgShiftDurationHours) * 100;
        
        if (!wasShownToday("long_open_shifts")) {
          const severity = updateInsightTracking("long_open_shifts", true);
          insights.push({
            id: `shift_${format(today, "yyyyMMdd")}`,
            type: "long_open_shifts",
            severity,
            detectedAt: new Date().toISOString(),
            consecutiveDays: getConsecutiveDays("long_open_shifts"),
            currentValue: todayData.maxShiftHours,
            baselineValue: baseline.avgShiftDurationHours,
            deviationPercent,
          });
        }
      }
      
      // Rule 5: No sales during working hours
      const currentHour = new Date().getHours();
      if (currentHour >= 12 && todayData.totalOrders === 0 && todayData.hasOpenShift) {
        if (baseline.avgOrdersPerDay > 0) {
          if (!wasShownToday("no_sales_during_hours")) {
            const severity = updateInsightTracking("no_sales_during_hours", true);
            insights.push({
              id: `nosales_${format(today, "yyyyMMdd")}`,
              type: "no_sales_during_hours",
              severity,
              detectedAt: new Date().toISOString(),
              consecutiveDays: getConsecutiveDays("no_sales_during_hours"),
              currentValue: 0,
              baselineValue: baseline.avgOrdersPerDay,
              deviationPercent: 100,
            });
          }
        }
      }
      
      // =============== STEP 4: Calculate Confidence Score ===============
      let confidenceScore = 100;
      for (const insight of insights) {
        const deduction = INSIGHT_DEDUCTIONS[insight.type][insight.severity];
        confidenceScore -= deduction;
      }
      confidenceScore = Math.max(40, Math.min(100, confidenceScore));
      
      // =============== STEP 5: Generate Operational Notes ===============
      const operationalNotes = generateOperationalNotes(insights);
      
      return {
        insights,
        baseline,
        isNewRestaurant: false,
        confidenceScore,
        operationalNotes,
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 10 * 60 * 1000, // Every 10 minutes
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== BASELINE CALCULATION ====================

async function calculateBaseline(restaurantId: string, today: Date): Promise<BaselineData> {
  const baselineStart = startOfDay(subDays(today, BASELINE_DAYS)).toISOString();
  const yesterdayEnd = endOfDay(subDays(today, 1)).toISOString();
  
  // Get historical orders
  const { data: historicalOrders } = await supabase
    .from("orders")
    .select("id, total, status, discount_value, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", baselineStart)
    .lt("created_at", yesterdayEnd);
  
  // Get historical refunds (as proxy for cancellations after payment)
  const { data: historicalRefunds } = await supabase
    .from("refunds")
    .select("id, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", baselineStart)
    .lt("created_at", yesterdayEnd);
  
  // Get historical shifts
  const { data: historicalShifts } = await supabase
    .from("shifts")
    .select("opened_at, closed_at, status")
    .eq("restaurant_id", restaurantId)
    .gte("opened_at", baselineStart)
    .lt("opened_at", yesterdayEnd);
  
  // Get historical inventory adjustments
  const { data: historicalAdjustments } = await supabase
    .from("inventory_transactions")
    .select("id, item_id, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("txn_type", "ADJUSTMENT")
    .gte("created_at", baselineStart)
    .lt("created_at", yesterdayEnd);
  
  // Calculate active days (days with at least one paid order)
  const ordersByDate: Record<string, number> = {};
  const paidOrders = historicalOrders?.filter(o => o.status === "paid") || [];
  
  paidOrders.forEach(order => {
    const date = format(new Date(order.created_at), "yyyy-MM-dd");
    ordersByDate[date] = (ordersByDate[date] || 0) + 1;
  });
  
  const activeDays = Object.keys(ordersByDate).filter(date => ordersByDate[date] > 0);
  const activeDaysCount = activeDays.length;
  
  if (activeDaysCount === 0) {
    return {
      avgCancellationsAfterPayment: 0,
      avgDiscountRate: 0,
      avgInventoryAdjustments: 0,
      avgShiftDurationHours: 8,
      avgOrdersPerDay: 0,
      activeDaysCount: 0,
    };
  }
  
  // Calculate averages
  const totalRefunds = historicalRefunds?.length || 0;
  const avgCancellationsAfterPayment = totalRefunds / activeDaysCount;
  
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalDiscounts = paidOrders.reduce((sum, o) => sum + (Number(o.discount_value) || 0), 0);
  const avgDiscountRate = totalRevenue > 0 ? (totalDiscounts / totalRevenue) * 100 : 0;
  
  // Inventory adjustments per day
  const adjustmentsByDate: Record<string, Set<string>> = {};
  historicalAdjustments?.forEach(adj => {
    const date = format(new Date(adj.created_at), "yyyy-MM-dd");
    if (!adjustmentsByDate[date]) adjustmentsByDate[date] = new Set();
    adjustmentsByDate[date].add(adj.item_id);
  });
  const repeatedAdjustmentDays = Object.values(adjustmentsByDate).filter(set => set.size > 2).length;
  const avgInventoryAdjustments = repeatedAdjustmentDays / activeDaysCount;
  
  // Average shift duration
  const closedShifts = historicalShifts?.filter(s => s.status === "closed" && s.closed_at) || [];
  let totalShiftHours = 0;
  closedShifts.forEach(shift => {
    const hours = differenceInHours(new Date(shift.closed_at!), new Date(shift.opened_at));
    totalShiftHours += Math.min(hours, 24); // Cap at 24 hours
  });
  const avgShiftDurationHours = closedShifts.length > 0 ? totalShiftHours / closedShifts.length : 8;
  
  const avgOrdersPerDay = paidOrders.length / activeDaysCount;
  
  return {
    avgCancellationsAfterPayment,
    avgDiscountRate,
    avgInventoryAdjustments,
    avgShiftDurationHours,
    avgOrdersPerDay,
    activeDaysCount,
  };
}

// ==================== TODAY'S DATA ====================

interface TodayData {
  cancellationsAfterPayment: number;
  totalOrders: number;
  totalRevenue: number;
  totalDiscounts: number;
  discountedOrders: number;
  repeatedInventoryAdjustments: number;
  maxShiftHours: number;
  hasOpenShift: boolean;
}

async function getTodayData(
  restaurantId: string, 
  todayStart: string, 
  todayEnd: string
): Promise<TodayData> {
  // Today's orders
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id, total, status, discount_value")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", todayStart)
    .lt("created_at", todayEnd);
  
  // Today's refunds (cancellations after payment)
  const { data: todayRefunds } = await supabase
    .from("refunds")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", todayStart)
    .lt("created_at", todayEnd);
  
  // Today's inventory adjustments
  const { data: todayAdjustments } = await supabase
    .from("inventory_transactions")
    .select("id, item_id")
    .eq("restaurant_id", restaurantId)
    .eq("txn_type", "ADJUSTMENT")
    .gte("created_at", todayStart)
    .lt("created_at", todayEnd);
  
  // Open shifts
  const { data: openShifts } = await supabase
    .from("shifts")
    .select("id, opened_at")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open");
  
  const paidOrders = todayOrders?.filter(o => o.status === "paid") || [];
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalDiscounts = paidOrders.reduce((sum, o) => sum + (Number(o.discount_value) || 0), 0);
  const discountedOrders = paidOrders.filter(o => Number(o.discount_value) > 0).length;
  
  // Count repeated adjustments on same item
  const adjustmentsByItem: Record<string, number> = {};
  todayAdjustments?.forEach(adj => {
    adjustmentsByItem[adj.item_id] = (adjustmentsByItem[adj.item_id] || 0) + 1;
  });
  const repeatedInventoryAdjustments = Object.values(adjustmentsByItem).filter(count => count > 1).length;
  
  // Max shift hours
  let maxShiftHours = 0;
  openShifts?.forEach(shift => {
    const hours = differenceInHours(new Date(), new Date(shift.opened_at));
    if (hours > maxShiftHours) maxShiftHours = hours;
  });
  
  return {
    cancellationsAfterPayment: todayRefunds?.length || 0,
    totalOrders: paidOrders.length,
    totalRevenue,
    totalDiscounts,
    discountedOrders,
    repeatedInventoryAdjustments,
    maxShiftHours,
    hasOpenShift: (openShifts?.length || 0) > 0,
  };
}

// ==================== OPERATIONAL NOTES GENERATOR ====================

function generateOperationalNotes(insights: OperationalInsight[]): string[] {
  const notes: string[] = [];
  
  // Max 3 notes
  const limitedInsights = insights.slice(0, 3);
  
  for (const insight of limitedInsights) {
    notes.push(getInsightNote(insight));
  }
  
  return notes;
}

function getInsightNote(insight: OperationalInsight): string {
  const isRepeated = insight.severity === "repeated";
  
  const noteTemplates: Record<InsightType, { first: string; repeated: string }> = {
    repeated_cancellation_after_payment: {
      first: "Order cancellations after payment are higher than recent activity.",
      repeated: "Order cancellations after payment have continued over recent days.",
    },
    excessive_discounts: {
      first: "Discount usage is higher compared to recent activity.",
      repeated: "Elevated discount usage has continued over recent days.",
    },
    repeated_inventory_adjustments: {
      first: "Multiple inventory adjustments on the same items today.",
      repeated: "Repeated inventory adjustments have continued over recent days.",
    },
    long_open_shifts: {
      first: "A shift has been open longer than typical duration.",
      repeated: "Extended shift durations have continued over recent days.",
    },
    no_sales_during_hours: {
      first: "No sales recorded during operating hours today.",
      repeated: "Low sales activity has continued over recent days.",
    },
  };
  
  return isRepeated 
    ? noteTemplates[insight.type].repeated 
    : noteTemplates[insight.type].first;
}

// ==================== LOCALIZED LABELS ====================

export const INSIGHT_LABELS: Record<InsightType, { ar: string; en: string }> = {
  repeated_cancellation_after_payment: {
    ar: "إلغاءات بعد الدفع أعلى من المعتاد",
    en: "Order cancellations after payment are higher than usual",
  },
  excessive_discounts: {
    ar: "استخدام الخصومات أعلى من المعتاد",
    en: "Discount usage is higher than usual",
  },
  repeated_inventory_adjustments: {
    ar: "تسويات مخزون متعددة على نفس الأصناف",
    en: "Multiple inventory adjustments on the same items",
  },
  long_open_shifts: {
    ar: "وردية مفتوحة أطول من المدة المعتادة",
    en: "A shift has been open longer than typical",
  },
  no_sales_during_hours: {
    ar: "لا توجد مبيعات خلال ساعات العمل",
    en: "No sales during operating hours",
  },
};
