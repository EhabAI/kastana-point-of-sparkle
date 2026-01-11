import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useBranches } from "@/hooks/useBranches";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Loader2, Building2 } from "lucide-react";
import { DateRange } from "../DateRangeFilter";

interface BranchReportsProps {
  dateRange: DateRange;
}

export function BranchReports({ dateRange }: BranchReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: branches = [] } = useBranches(restaurant?.id);
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const { data, isLoading } = useQuery({
    queryKey: ["branch-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id || branches.length === 0) return null;

      const branchMap = new Map(branches.map(b => [b.id, b.name]));

      // Get orders by branch
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, branch_id, status")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      if (ordersError) throw ordersError;

      // Get shifts by branch
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, branch_id, status")
        .eq("restaurant_id", restaurant.id)
        .gte("opened_at", dateRange.from.toISOString())
        .lt("opened_at", dateRange.to.toISOString());

      if (shiftsError) throw shiftsError;

      // Aggregate by branch
      const branchData: Record<string, { name: string; totalSales: number; orderCount: number; shiftCount: number }> = {};
      
      branches.forEach(b => {
        branchData[b.id] = { name: b.name, totalSales: 0, orderCount: 0, shiftCount: 0 };
      });

      // Sales and orders per branch
      orders?.filter(o => o.status === "paid").forEach(o => {
        if (o.branch_id && branchData[o.branch_id]) {
          branchData[o.branch_id].totalSales += Number(o.total);
          branchData[o.branch_id].orderCount += 1;
        }
      });

      // Shifts per branch
      shifts?.forEach(s => {
        if (s.branch_id && branchData[s.branch_id]) {
          branchData[s.branch_id].shiftCount += 1;
        }
      });

      const branchList = Object.values(branchData)
        .filter(b => b.orderCount > 0 || b.shiftCount > 0)
        .sort((a, b) => b.totalSales - a.totalSales);

      const totalSales = branchList.reduce((s, b) => s + b.totalSales, 0);
      const totalOrders = branchList.reduce((s, b) => s + b.orderCount, 0);

      return {
        branches: branchList,
        totalSales,
        totalOrders,
      };
    },
    enabled: !!restaurant?.id && branches.length > 0,
  });

  if (branches.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{t("single_branch_msg")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sales per Branch */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("sales_per_branch")}
        </h3>
        {(data?.branches || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_branch_data")}</p>
        ) : (
          <div className="space-y-3">
            {data?.branches.map((branch, i) => {
              const salesPercent = data.totalSales > 0 ? (branch.totalSales / data.totalSales) * 100 : 0;
              return (
                <div key={i} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{branch.name}</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(branch.totalSales)} {currencySymbol}</p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${salesPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{salesPercent.toFixed(0)}% {t("of_total")}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Orders per Branch */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("orders_per_branch")}
        </h3>
        {(data?.branches || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_branch_data")}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data?.branches.map((branch, i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{branch.name}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{branch.orderCount}</p>
                <p className="text-xs text-muted-foreground">{t("orders")}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shifts per Branch */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("shifts_per_branch")}
        </h3>
        {(data?.branches || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_branch_data")}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data?.branches.map((branch, i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{branch.name}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{branch.shiftCount}</p>
                <p className="text-xs text-muted-foreground">{t("shifts")}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
