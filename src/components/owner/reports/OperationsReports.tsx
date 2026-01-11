import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { DateRange } from "../DateRangeFilter";
import { format, differenceInMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface OperationsReportsProps {
  dateRange: DateRange;
}

export function OperationsReports({ dateRange }: OperationsReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const { data, isLoading } = useQuery({
    queryKey: ["operations-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Get shifts with sales data
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, cashier_id, opened_at, closed_at, status, opening_cash, closing_cash")
        .eq("restaurant_id", restaurant.id)
        .gte("opened_at", dateRange.from.toISOString())
        .lt("opened_at", dateRange.to.toISOString())
        .order("opened_at", { ascending: false });

      if (shiftsError) throw shiftsError;

      const shiftIds = shifts?.map(s => s.id) || [];
      const cashierIds = [...new Set(shifts?.map(s => s.cashier_id) || [])];

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds.length > 0 ? cashierIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email || "Unknown"]) || []);

      // Get orders by shift for shift sales
      let shiftSalesMap: Record<string, number> = {};
      if (shiftIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("shift_id, total")
          .in("shift_id", shiftIds)
          .eq("status", "paid");

        orders?.forEach(o => {
          if (o.shift_id) {
            shiftSalesMap[o.shift_id] = (shiftSalesMap[o.shift_id] || 0) + Number(o.total);
          }
        });
      }

      // Calculate shift data with duration and sales
      const shiftsWithData = shifts?.map(s => {
        const durationMinutes = s.closed_at 
          ? differenceInMinutes(new Date(s.closed_at), new Date(s.opened_at))
          : differenceInMinutes(new Date(), new Date(s.opened_at));
        
        const expectedCash = (shiftSalesMap[s.id] || 0) + Number(s.opening_cash);
        const actualCash = s.closing_cash !== null ? Number(s.closing_cash) : null;
        const difference = actualCash !== null ? actualCash - expectedCash : null;

        return {
          id: s.id,
          cashierEmail: profileMap.get(s.cashier_id) || "Unknown",
          openedAt: s.opened_at,
          closedAt: s.closed_at,
          status: s.status,
          durationMinutes,
          openingCash: Number(s.opening_cash),
          closingCash: actualCash,
          totalSales: shiftSalesMap[s.id] || 0,
          expectedCash,
          difference,
        };
      }) || [];

      // Get tables with order counts
      const { data: tables, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("id, table_name")
        .eq("restaurant_id", restaurant.id);

      if (tablesError) throw tablesError;

      // Get orders with table info
      const { data: tableOrders, error: tableOrdersError } = await supabase
        .from("orders")
        .select("id, table_id, created_at, updated_at")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString())
        .not("table_id", "is", null);

      if (tableOrdersError) throw tableOrdersError;

      // Aggregate table usage
      const tableUsage: Record<string, { tableName: string; orderCount: number; totalMinutes: number }> = {};
      tables?.forEach(t => {
        tableUsage[t.id] = { tableName: t.table_name, orderCount: 0, totalMinutes: 0 };
      });

      tableOrders?.forEach(o => {
        if (o.table_id && tableUsage[o.table_id]) {
          tableUsage[o.table_id].orderCount += 1;
          const duration = differenceInMinutes(new Date(o.updated_at), new Date(o.created_at));
          tableUsage[o.table_id].totalMinutes += duration;
        }
      });

      const tableUsageList = Object.values(tableUsage)
        .filter(t => t.orderCount > 0)
        .map(t => ({
          ...t,
          avgOccupancy: t.orderCount > 0 ? Math.round(t.totalMinutes / t.orderCount) : 0,
        }))
        .sort((a, b) => b.orderCount - a.orderCount);

      return {
        shifts: shiftsWithData,
        tableUsage: tableUsageList,
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const shiftsWithDifference = (data?.shifts || []).filter(s => s.difference !== null && s.difference !== 0);

  return (
    <div className="space-y-8">
      {/* Shifts History */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("shifts_history")}
        </h3>
        {(data?.shifts || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_shifts_found")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("cashier")}</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("started")}</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("ended")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("duration")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("sales")}</th>
                </tr>
              </thead>
              <tbody>
                {data?.shifts.slice(0, 15).map((shift, i) => (
                  <tr key={shift.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium text-foreground">{shift.cashierEmail}</td>
                    <td className="py-2 px-3 text-muted-foreground">{format(new Date(shift.openedAt), "MMM d, HH:mm")}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {shift.closedAt ? format(new Date(shift.closedAt), "HH:mm") : <Badge variant="outline" className="text-xs">{t("open")}</Badge>}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{formatDuration(shift.durationMinutes)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-foreground">{formatJOD(shift.totalSales)} {currencySymbol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cash Difference Report */}
      {shiftsWithDifference.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
            {t("cash_difference")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("cashier")}</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("date")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("expected")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("actual")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("difference")}</th>
                </tr>
              </thead>
              <tbody>
                {shiftsWithDifference.slice(0, 10).map((shift) => (
                  <tr key={shift.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium text-foreground">{shift.cashierEmail}</td>
                    <td className="py-2 px-3 text-muted-foreground">{format(new Date(shift.openedAt), "MMM d")}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{formatJOD(shift.expectedCash)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{formatJOD(shift.closingCash || 0)}</td>
                    <td className={`py-2 px-3 text-right tabular-nums font-medium ${shift.difference! < 0 ? 'text-destructive' : shift.difference! > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                      {shift.difference! > 0 ? '+' : ''}{formatJOD(shift.difference!)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tables Usage */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("tables_usage")}
        </h3>
        {(data?.tableUsage || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_table_data")}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data?.tableUsage.map((table, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium text-foreground">{table.tableName}</p>
                <p className="text-xs text-muted-foreground mt-1">{table.orderCount} {t("orders")}</p>
                <p className="text-xs text-muted-foreground">~{formatDuration(table.avgOccupancy)} {t("avg")}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
