import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { DateRange } from "../DateRangeFilter";

interface FinancialReportsProps {
  dateRange: DateRange;
}

export function FinancialReports({ dateRange }: FinancialReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const { data, isLoading } = useQuery({
    queryKey: ["financial-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Get paid orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, subtotal, discount_value, tax_amount, service_charge, status")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString())
        .eq("status", "paid");

      if (ordersError) throw ordersError;

      // Get payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, amount, method, order_id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      if (paymentsError) throw paymentsError;

      // Get refunds
      const { data: refunds, error: refundsError } = await supabase
        .from("refunds")
        .select("id, amount, reason, order_id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      if (refundsError) throw refundsError;

      // Get refund orders with shift info for cashier attribution
      const refundOrderIds = refunds?.map(r => r.order_id) || [];
      let refundsByCashier: { email: string; count: number }[] = [];

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
            .in("id", shiftIds);

          const cashierIds = [...new Set(shifts?.map(s => s.cashier_id) || [])];
          
          if (cashierIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, email")
              .in("id", cashierIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p.email || "Unknown"]) || []);
            const shiftToCashier = new Map(shifts?.map(s => [s.id, s.cashier_id]) || []);
            const orderToShift = new Map(refundOrders?.map(o => [o.id, o.shift_id]) || []);

            const cashierRefundCount: Record<string, number> = {};
            refunds?.forEach(r => {
              const shiftId = orderToShift.get(r.order_id);
              const cashierId = shiftId ? shiftToCashier.get(shiftId) : null;
              if (cashierId) {
                cashierRefundCount[cashierId] = (cashierRefundCount[cashierId] || 0) + 1;
              }
            });

            refundsByCashier = Object.entries(cashierRefundCount).map(([id, count]) => ({
              email: profileMap.get(id) || "Unknown",
              count,
            })).sort((a, b) => b.count - a.count);
          }
        }
      }

      // Calculate financial metrics
      const grossSales = orders?.reduce((sum, o) => sum + Number(o.subtotal) + Number(o.discount_value || 0), 0) || 0;
      const totalDiscounts = orders?.reduce((sum, o) => sum + Number(o.discount_value || 0), 0) || 0;
      const netSales = orders?.reduce((sum, o) => sum + Number(o.subtotal), 0) || 0;
      const totalTax = orders?.reduce((sum, o) => sum + Number(o.tax_amount), 0) || 0;
      const totalServiceCharge = orders?.reduce((sum, o) => sum + Number(o.service_charge), 0) || 0;
      const finalTotal = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      // Payment methods breakdown
      const paymentsByMethod: Record<string, { total: number; count: number }> = {};
      payments?.forEach(p => {
        if (!paymentsByMethod[p.method]) {
          paymentsByMethod[p.method] = { total: 0, count: 0 };
        }
        paymentsByMethod[p.method].total += Number(p.amount);
        paymentsByMethod[p.method].count += 1;
      });

      // Refunds by reason
      const refundsByReason: Record<string, { total: number; count: number }> = {};
      refunds?.forEach(r => {
        const reason = r.reason || "No reason";
        if (!refundsByReason[reason]) {
          refundsByReason[reason] = { total: 0, count: 0 };
        }
        refundsByReason[reason].total += Number(r.amount);
        refundsByReason[reason].count += 1;
      });

      const totalRefundAmount = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      return {
        grossSales,
        totalDiscounts,
        netSales,
        totalTax,
        totalServiceCharge,
        finalTotal,
        paymentsByMethod,
        refundCount: refunds?.length || 0,
        totalRefundAmount,
        refundsByReason,
        refundsByCashier,
      };
    },
    enabled: !!restaurant?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Daily Sales Report */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("daily_sales_report") || "Daily Sales Report"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("gross_sales") || "Gross Sales"}</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.grossSales || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("discounts")}</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">-{formatJOD(data?.totalDiscounts || 0)} <span className="text-sm font-normal">{currencySymbol}</span></p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("net_sales") || "Net Sales"}</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.netSales || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("taxes") || "Taxes"}</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.totalTax || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
          </div>
          {(data?.totalServiceCharge || 0) > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("service_charge") || "Service Charge"}</p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.totalServiceCharge || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
            </div>
          )}
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs text-primary uppercase tracking-wide font-medium">{t("final_total") || "Final Total"}</p>
            <p className="text-2xl font-black text-foreground tabular-nums mt-1">{formatJOD(data?.finalTotal || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
          </div>
        </div>
      </section>

      {/* Payment Methods Report */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("payment_methods") || "Payment Methods"}
        </h3>
        {Object.keys(data?.paymentsByMethod || {}).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_payment_data") || "No payment data for this period."}</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(data?.paymentsByMethod || {}).map(([method, info]) => (
              <div key={method} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground capitalize">{t(method) || method}</p>
                  <p className="text-xs text-muted-foreground">{info.count} {t("transactions") || "transactions"}</p>
                </div>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(info.total)} {currencySymbol}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Refunds Report */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("refunds_report") || "Refunds Report"}
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("total_refunds") || "Total Refunds"}</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-1">{data?.refundCount || 0}</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("refunded_amount") || "Refunded Amount"}</p>
            <p className="text-xl font-bold text-destructive tabular-nums mt-1">{formatJOD(data?.totalRefundAmount || 0)} {currencySymbol}</p>
          </div>
        </div>

        {Object.keys(data?.refundsByReason || {}).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("by_reason") || "By Reason"}</p>
            <div className="space-y-1">
              {Object.entries(data?.refundsByReason || {}).map(([reason, info]) => (
                <div key={reason} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded">
                  <span className="text-sm text-foreground">{reason}</span>
                  <span className="text-sm font-medium text-foreground">{info.count}× ({formatJOD(info.total)} {currencySymbol})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.refundsByCashier || []).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("by_cashier") || "By Cashier"}</p>
            <div className="space-y-1">
              {data?.refundsByCashier.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded">
                  <span className="text-sm text-foreground">{c.email}</span>
                  <span className="text-sm font-medium text-foreground">{c.count} {t("refunds") || "refunds"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
