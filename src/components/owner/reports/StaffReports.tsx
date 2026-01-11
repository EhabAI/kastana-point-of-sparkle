import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { DateRange } from "../DateRangeFilter";

interface StaffReportsProps {
  dateRange: DateRange;
}

export function StaffReports({ dateRange }: StaffReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const { data, isLoading } = useQuery({
    queryKey: ["staff-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Get shifts in date range
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, cashier_id")
        .eq("restaurant_id", restaurant.id)
        .gte("opened_at", dateRange.from.toISOString())
        .lt("opened_at", dateRange.to.toISOString());

      if (shiftsError) throw shiftsError;

      const shiftIds = shifts?.map(s => s.id) || [];
      const cashierIds = [...new Set(shifts?.map(s => s.cashier_id) || [])];

      if (shiftIds.length === 0) {
        return { cashierSales: [], cashierActivity: [] };
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds.length > 0 ? cashierIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email || "Unknown"]) || []);
      const shiftToCashier = new Map(shifts?.map(s => [s.id, s.cashier_id]) || []);

      // Get paid orders for these shifts
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, shift_id, status")
        .in("shift_id", shiftIds)
        .eq("status", "paid");

      if (ordersError) throw ordersError;

      // Get order items for void counts
      const orderIds = orders?.map(o => o.id) || [];
      let voidedItems: { order_id: string }[] = [];
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id")
          .in("order_id", orderIds)
          .eq("voided", true);
        voidedItems = items || [];
      }

      // Get refunds
      const { data: refunds } = await supabase
        .from("refunds")
        .select("order_id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      // Aggregate sales by cashier
      const cashierSalesAgg: Record<string, { email: string; totalSales: number; orderCount: number }> = {};
      orders?.forEach(o => {
        const cashierId = shiftToCashier.get(o.shift_id!);
        if (cashierId) {
          if (!cashierSalesAgg[cashierId]) {
            cashierSalesAgg[cashierId] = { email: profileMap.get(cashierId) || "Unknown", totalSales: 0, orderCount: 0 };
          }
          cashierSalesAgg[cashierId].totalSales += Number(o.total);
          cashierSalesAgg[cashierId].orderCount += 1;
        }
      });

      const cashierSales = Object.values(cashierSalesAgg).sort((a, b) => b.totalSales - a.totalSales);

      // Aggregate activity (voids and refunds) by cashier
      const cashierActivityAgg: Record<string, { email: string; voidCount: number; refundCount: number }> = {};
      
      // Initialize all cashiers
      cashierIds.forEach(id => {
        cashierActivityAgg[id] = { email: profileMap.get(id) || "Unknown", voidCount: 0, refundCount: 0 };
      });

      // Count voids per cashier
      voidedItems.forEach(v => {
        const order = orders?.find(o => o.id === v.order_id);
        if (order) {
          const cashierId = shiftToCashier.get(order.shift_id!);
          if (cashierId && cashierActivityAgg[cashierId]) {
            cashierActivityAgg[cashierId].voidCount += 1;
          }
        }
      });

      // Count refunds per cashier
      refunds?.forEach(r => {
        const order = orders?.find(o => o.id === r.order_id);
        if (order) {
          const cashierId = shiftToCashier.get(order.shift_id!);
          if (cashierId && cashierActivityAgg[cashierId]) {
            cashierActivityAgg[cashierId].refundCount += 1;
          }
        }
      });

      const cashierActivity = Object.values(cashierActivityAgg)
        .filter(c => c.voidCount > 0 || c.refundCount > 0)
        .sort((a, b) => (b.voidCount + b.refundCount) - (a.voidCount + a.refundCount));

      return {
        cashierSales,
        cashierActivity,
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
      {/* Sales by Cashier */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("sales_by_cashier")}
        </h3>
        {(data?.cashierSales || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_staff_data")}</p>
        ) : (
          <div className="space-y-2">
            {data?.cashierSales.map((cashier, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{cashier.email}</p>
                  <p className="text-xs text-muted-foreground">{cashier.orderCount} {t("orders")}</p>
                </div>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(cashier.totalSales)} {currencySymbol}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cashier Activity (Voids & Refunds) */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("cashier_activity")} — {t("voids_refunds")}
        </h3>
        {(data?.cashierActivity || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_voids_refunds")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("cashier")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("voided_items")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("refunds")}</th>
                </tr>
              </thead>
              <tbody>
                {data?.cashierActivity.map((cashier, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium text-foreground">{cashier.email}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{cashier.voidCount}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-destructive">{cashier.refundCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
