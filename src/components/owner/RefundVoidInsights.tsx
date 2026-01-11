import { ChevronDown, ReceiptText, Ban, Loader2, AlertTriangle, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { startOfDay, endOfDay } from "date-fns";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";

// Threshold for warning highlight
const REFUND_WARNING_THRESHOLD = 5;

interface CashierRefundData {
  cashierId: string;
  email: string;
  refundCount: number;
}

interface VoidReasonData {
  reason: string;
  count: number;
}

export function RefundVoidInsights() {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const { t, language } = useLanguage();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";
  
  const [isOpen, setIsOpen] = useState(false);

  const { data: insightsData, isLoading } = useQuery({
    queryKey: ["refund-void-insights", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // 1. Get today's refunds with order info
      const { data: todayRefunds } = await supabase
        .from("refunds")
        .select("id, amount, order_id, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startOfToday)
        .lt("created_at", endOfToday);

      const refundCount = todayRefunds?.length || 0;
      const refundTotal = todayRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      // 2. Get refunds by cashier for today
      // First get orders with shift info for refunds
      const refundOrderIds = todayRefunds?.map(r => r.order_id) || [];
      const cashierRefundMap: Record<string, { email: string; count: number }> = {};
      
      if (refundOrderIds.length > 0) {
        const { data: refundOrders } = await supabase
          .from("orders")
          .select("id, shift_id")
          .in("id", refundOrderIds);

        const shiftIds = [...new Set(refundOrders?.map(o => o.shift_id).filter(Boolean) || [])];
        
        if (shiftIds.length > 0) {
          const { data: shifts } = await supabase
            .from("shifts")
            .select("id, cashier_id")
            .in("id", shiftIds as string[]);

          const cashierIds = [...new Set(shifts?.map(s => s.cashier_id) || [])];
          
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email")
            .in("id", cashierIds);

          // Map cashier id to email
          const cashierEmailMap: Record<string, string> = {};
          profiles?.forEach(p => {
            cashierEmailMap[p.id] = p.email || t("unknown");
          });

          // Map shift id to cashier id
          const shiftCashierMap: Record<string, string> = {};
          shifts?.forEach(s => {
            shiftCashierMap[s.id] = s.cashier_id;
          });

          // Count refunds by cashier
          refundOrders?.forEach(order => {
            if (order.shift_id && shiftCashierMap[order.shift_id]) {
              const cashierId = shiftCashierMap[order.shift_id];
              if (!cashierRefundMap[cashierId]) {
                cashierRefundMap[cashierId] = {
                  email: cashierEmailMap[cashierId] || t("unknown"),
                  count: 0,
                };
              }
              cashierRefundMap[cashierId].count++;
            }
          });
        }
      }

      const cashierRefunds: CashierRefundData[] = Object.entries(cashierRefundMap)
        .map(([cashierId, data]) => ({
          cashierId,
          email: data.email,
          refundCount: data.count,
        }))
        .sort((a, b) => b.refundCount - a.refundCount);

      // 3. Get voided orders today (cancelled or voided)
      const { data: voidedOrders } = await supabase
        .from("orders")
        .select("id, status, cancelled_reason")
        .eq("restaurant_id", restaurant.id)
        .in("status", ["cancelled", "voided"])
        .gte("created_at", startOfToday)
        .lt("created_at", endOfToday);

      const voidedOrderCount = voidedOrders?.length || 0;

      // Count void reasons
      const reasonCounts: Record<string, number> = {};
      voidedOrders?.forEach(order => {
        const reason = order.cancelled_reason || t("no_reason_given");
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      const topVoidReasons: VoidReasonData[] = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        refundCount,
        refundTotal,
        cashierRefunds,
        voidedOrderCount,
        topVoidReasons,
      };
    },
    enabled: !!restaurant?.id,
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
  });

  const showRefundWarning = (insightsData?.refundCount || 0) > REFUND_WARNING_THRESHOLD;

  return (
    <div className="space-y-3 pt-2 border-t border-border/40">
      {/* Header */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
      >
        <ReceiptText className="h-4 w-4" />
        <span>{t("refund_void_insights")}</span>
        {showRefundWarning && (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "" : "ltr:-rotate-90 rtl:rotate-90"}`} />
      </button>

      {isOpen && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Inline KPI row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("refunds_today")}</span>
                  <p className={`text-xl font-bold tabular-nums ${showRefundWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                    {insightsData?.refundCount || 0}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("refunded_amount")}</span>
                  <p className={`text-xl font-bold tabular-nums ${showRefundWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                    {formatJOD(insightsData?.refundTotal || 0)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{currencySymbol}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("voided_orders_today")}</span>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {insightsData?.voidedOrderCount || 0}
                  </p>
                </div>
              </div>

              {/* Details row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Refunds by Cashier */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <User className="h-3 w-3" />
                    {t("refunds_by_cashier")}
                  </span>
                  {(insightsData?.cashierRefunds?.length || 0) === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {insightsData?.cashierRefunds.map((cashier) => (
                        <div key={cashier.cashierId} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[150px]">{cashier.email}</span>
                          <span className={`font-medium tabular-nums ${cashier.refundCount > 2 ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                            {cashier.refundCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Void Reasons */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Ban className="h-3 w-3" />
                    {t("top_void_reasons")}
                  </span>
                  {(insightsData?.topVoidReasons?.length || 0) === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {insightsData?.topVoidReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[150px]">{reason.reason}</span>
                          <span className="font-medium text-foreground tabular-nums">{reason.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
