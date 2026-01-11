import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  
  const [isOpen, setIsOpen] = useState(true);

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "ltr:-rotate-90 rtl:rotate-90"}`} />
                <div className="text-start">
                  <CardTitle className="flex items-center gap-2">
                    <ReceiptText className="h-5 w-5" />
                    {t("refund_void_insights")}
                    {showRefundWarning && (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                  </CardTitle>
                  <CardDescription>{t("refund_void_insights_desc")}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Refund & Void Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Refund Count */}
                  <div className={`rounded-lg border p-4 ${showRefundWarning ? 'bg-warning/5 border-warning/20' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <ReceiptText className={`h-4 w-4 ${showRefundWarning ? 'text-warning' : 'text-muted-foreground'}`} />
                      <span className="text-sm text-muted-foreground">{t("refunds_today")}</span>
                    </div>
                    <p className={`text-2xl font-bold ${showRefundWarning ? 'text-warning' : 'text-foreground'}`}>
                      {insightsData?.refundCount || 0}
                    </p>
                  </div>

                  {/* Refund Amount */}
                  <div className={`rounded-lg border p-4 ${showRefundWarning ? 'bg-warning/5 border-warning/20' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <ReceiptText className={`h-4 w-4 ${showRefundWarning ? 'text-warning' : 'text-muted-foreground'}`} />
                      <span className="text-sm text-muted-foreground">{t("refunded_amount")}</span>
                    </div>
                    <p className={`text-2xl font-bold ${showRefundWarning ? 'text-warning' : 'text-foreground'}`}>
                      {formatJOD(insightsData?.refundTotal || 0)} <span className="text-sm font-normal">{currencySymbol}</span>
                    </p>
                  </div>

                  {/* Voided Orders */}
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Ban className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("voided_orders_today")}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {insightsData?.voidedOrderCount || 0}
                    </p>
                  </div>
                </div>

                {/* Two-column layout for lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Refunds by Cashier */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("refunds_by_cashier")}
                    </h4>
                    {(insightsData?.cashierRefunds?.length || 0) === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("no_refunds_today")}</p>
                    ) : (
                      <div className="space-y-2">
                        {insightsData?.cashierRefunds.map((cashier, idx) => (
                          <div 
                            key={cashier.cashierId} 
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                          >
                            <span className="text-sm text-foreground truncate max-w-[200px]" title={cashier.email}>
                              {cashier.email}
                            </span>
                            <span className={`text-sm font-medium ${cashier.refundCount > 2 ? 'text-warning' : 'text-muted-foreground'}`}>
                              {cashier.refundCount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Void Reasons */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Ban className="h-4 w-4" />
                      {t("top_void_reasons")}
                    </h4>
                    {(insightsData?.topVoidReasons?.length || 0) === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("no_voided_orders_today")}</p>
                    ) : (
                      <div className="space-y-2">
                        {insightsData?.topVoidReasons.map((reason, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                          >
                            <span className="text-sm text-foreground truncate max-w-[200px]" title={reason.reason}>
                              {reason.reason}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground">
                              {reason.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
