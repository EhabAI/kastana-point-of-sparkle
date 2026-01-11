import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useBranches } from "@/hooks/useBranches";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Loader2, Building2 } from "lucide-react";
import { DateRange } from "../DateRangeFilter";
import { format } from "date-fns";
import { ReportFilters, ReportFilterValues } from "./ReportFilters";
import { ReportSection } from "./ReportSection";
import { DrillDownDialog, DrillDownColumn } from "./DrillDownDialog";
import { exportToCSV, printReport } from "./utils/reportUtils";

interface BranchReportsProps {
  dateRange: DateRange;
}

interface BranchData {
  name: string;
  totalSales: number;
  orderCount: number;
  shiftCount: number;
  avgOrderValue: number;
  salesPercent: number;
}

export function BranchReports({ dateRange }: BranchReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: branches = [] } = useBranches(restaurant?.id);
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const [filters, setFilters] = useState<ReportFilterValues>({});
  const [showBranchesDialog, setShowBranchesDialog] = useState(false);

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
      const branchDataMap: Record<string, { name: string; totalSales: number; orderCount: number; shiftCount: number }> = {};
      
      branches.forEach(b => {
        branchDataMap[b.id] = { name: b.name, totalSales: 0, orderCount: 0, shiftCount: 0 };
      });

      // Sales and orders per branch
      orders?.filter(o => o.status === "paid").forEach(o => {
        if (o.branch_id && branchDataMap[o.branch_id]) {
          branchDataMap[o.branch_id].totalSales += Number(o.total);
          branchDataMap[o.branch_id].orderCount += 1;
        }
      });

      // Shifts per branch
      shifts?.forEach(s => {
        if (s.branch_id && branchDataMap[s.branch_id]) {
          branchDataMap[s.branch_id].shiftCount += 1;
        }
      });

      const totalSales = Object.values(branchDataMap).reduce((s, b) => s + b.totalSales, 0);
      const totalOrders = Object.values(branchDataMap).reduce((s, b) => s + b.orderCount, 0);

      const branchList: BranchData[] = Object.values(branchDataMap)
        .filter(b => b.orderCount > 0 || b.shiftCount > 0)
        .map(b => ({
          ...b,
          avgOrderValue: b.orderCount > 0 ? b.totalSales / b.orderCount : 0,
          salesPercent: totalSales > 0 ? (b.totalSales / totalSales) * 100 : 0,
        }))
        .sort((a, b) => b.totalSales - a.totalSales);

      return {
        branches: branchList,
        totalSales,
        totalOrders,
      };
    },
    enabled: !!restaurant?.id && branches.length > 0,
  });

  const handleExportCSV = () => {
    if (!data) return;
    const exportData = data.branches.map(b => ({
      [t("branch")]: b.name,
      [t("total_sales")]: b.totalSales,
      [t("orders")]: b.orderCount,
      [t("shifts")]: b.shiftCount,
      [t("aov")]: b.avgOrderValue,
      [t("percent_of_total")]: b.salesPercent.toFixed(1) + "%",
    }));
    exportToCSV(exportData, "branch_comparison");
  };

  const handlePrint = () => {
    printReport(
      t("branch_comparison"),
      restaurant?.name || "",
      dateRange,
      "branch-report-content",
      currencySymbol
    );
  };

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

  const branchColumns: DrillDownColumn<BranchData>[] = [
    { key: "name", header: t("branch") },
    { key: "totalSales", header: t("total_sales"), align: "right", render: (item) => `${formatJOD(item.totalSales)} ${currencySymbol}` },
    { key: "orderCount", header: t("orders"), align: "right" },
    { key: "shiftCount", header: t("shifts"), align: "right" },
    { key: "avgOrderValue", header: t("aov"), align: "right", render: (item) => `${formatJOD(item.avgOrderValue)} ${currencySymbol}` },
    { key: "salesPercent", header: t("percent_of_total"), align: "right", render: (item) => `${item.salesPercent.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-6">
      {/* Filters - Note: No branch filter for branch comparison */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
      />

      <div id="branch-report-content" className="space-y-8">
        {/* Sales per Branch */}
        <ReportSection
          title={t("sales_per_branch")}
          onViewDetails={() => setShowBranchesDialog(true)}
        >
          {(data?.branches || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("no_branch_data")}</p>
          ) : (
            <div className="space-y-3">
              {data?.branches.map((branch, i) => {
                return (
                  <div key={i} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground">{branch.name}</p>
                      <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(branch.totalSales)} {currencySymbol}</p>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${branch.salesPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{branch.salesPercent.toFixed(0)}% {t("of_total")}</p>
                  </div>
                );
              })}
            </div>
          )}
        </ReportSection>

        {/* Orders per Branch */}
        <ReportSection title={t("orders_per_branch")}>
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
        </ReportSection>

        {/* Shifts per Branch */}
        <ReportSection title={t("shifts_per_branch")}>
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
        </ReportSection>

        {/* Average Order Value per Branch */}
        <ReportSection title={t("aov_per_branch")}>
          {(data?.branches || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("no_branch_data")}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data?.branches.map((branch, i) => (
                <div key={i} className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{branch.name}</p>
                  <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(branch.avgOrderValue)} <span className="text-sm font-normal">{currencySymbol}</span></p>
                  <p className="text-xs text-muted-foreground">{t("aov")}</p>
                </div>
              ))}
            </div>
          )}
        </ReportSection>
      </div>

      {/* Drill-down dialog */}
      <DrillDownDialog
        open={showBranchesDialog}
        onOpenChange={setShowBranchesDialog}
        title={t("branch_comparison_details")}
        data={data?.branches || []}
        columns={branchColumns}
        exportFilename="branch_comparison"
      />
    </div>
  );
}
