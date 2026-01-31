import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { DateRange } from "../DateRangeFilter";
import { format } from "date-fns";
import { ReportFilters, ReportFilterValues } from "./ReportFilters";
import { ReportSection } from "./ReportSection";
import { DrillDownDialog, DrillDownColumn } from "./DrillDownDialog";
import { exportToCSV, printReport } from "./utils/reportUtils";
import { StaffReportsSkeleton } from "./ReportSkeletons";

interface StaffReportsProps {
  dateRange: DateRange;
  branchId?: string;
}

interface CashierSales {
  email: string;
  totalSales: number;
  orderCount: number;
}

interface CashierActivity {
  email: string;
  voidCount: number;
  refundCount: number;
}

interface VoidDetail {
  order_number: number;
  item_name: string;
  cashier: string;
  reason: string;
  time: string;
}

export function StaffReports({ dateRange, branchId }: StaffReportsProps) {
  const { t, language } = useLanguage();
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const [filters, setFilters] = useState<ReportFilterValues>(() => 
    branchId ? { branchId } : {}
  );
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showVoidsDialog, setShowVoidsDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString(), filters],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Build shifts query with filters
      let shiftsQuery = supabase
        .from("shifts")
        .select("id, cashier_id, branch_id")
        .eq("restaurant_id", restaurant.id)
        .gte("opened_at", dateRange.from.toISOString())
        .lt("opened_at", dateRange.to.toISOString());

      if (filters.branchId) {
        shiftsQuery = shiftsQuery.eq("branch_id", filters.branchId);
      }

      const { data: shifts, error: shiftsError } = await shiftsQuery;
      if (shiftsError) throw shiftsError;

      let shiftIds = shifts?.map(s => s.id) || [];
      let cashierIds = [...new Set(shifts?.map(s => s.cashier_id) || [])];

      // Filter by specific cashier if selected
      if (filters.cashierId) {
        const filteredShifts = shifts?.filter(s => s.cashier_id === filters.cashierId) || [];
        shiftIds = filteredShifts.map(s => s.id);
        cashierIds = [filters.cashierId];
      }

      if (shiftIds.length === 0) {
        return { cashierSales: [], cashierActivity: [], voidDetails: [] };
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds.length > 0 ? cashierIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email || t("unknown")]) || []);
      const shiftToCashier = new Map(shifts?.map(s => [s.id, s.cashier_id]) || []);

      // Get paid orders for these shifts
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, total, shift_id, status, created_at")
        .in("shift_id", shiftIds)
        .eq("status", "paid");

      if (ordersError) throw ordersError;

      // Get voided items with details
      const orderIds = orders?.map(o => o.id) || [];
      let voidDetails: VoidDetail[] = [];
      let voidedItems: { order_id: string }[] = [];

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, name, void_reason, created_at")
          .in("order_id", orderIds)
          .eq("voided", true);
        
        voidedItems = items || [];

        voidDetails = items?.map(item => {
          const order = orders?.find(o => o.id === item.order_id);
          const cashierId = order?.shift_id ? shiftToCashier.get(order.shift_id) : null;
          return {
            order_number: order?.order_number || 0,
            item_name: item.name,
            cashier: cashierId ? profileMap.get(cashierId) || t("unknown") : t("unknown"),
            reason: item.void_reason || t("no_reason_given"),
            time: format(new Date(item.created_at), "MMM d, HH:mm"),
          };
        }) || [];
      }

      // Get refunds
      const { data: refunds } = await supabase
        .from("refunds")
        .select("order_id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      // Aggregate sales by cashier
      const cashierSalesAgg: Record<string, CashierSales> = {};
      orders?.forEach(o => {
        const cashierId = shiftToCashier.get(o.shift_id!);
        if (cashierId) {
          if (!cashierSalesAgg[cashierId]) {
            cashierSalesAgg[cashierId] = { email: profileMap.get(cashierId) || t("unknown"), totalSales: 0, orderCount: 0 };
          }
          cashierSalesAgg[cashierId].totalSales += Number(o.total);
          cashierSalesAgg[cashierId].orderCount += 1;
        }
      });

      const cashierSales = Object.values(cashierSalesAgg).sort((a, b) => b.totalSales - a.totalSales);

      // Aggregate activity (voids and refunds) by cashier
      const cashierActivityAgg: Record<string, CashierActivity> = {};
      
      // Initialize all cashiers
      cashierIds.forEach(id => {
        cashierActivityAgg[id] = { email: profileMap.get(id) || t("unknown"), voidCount: 0, refundCount: 0 };
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
        voidDetails,
      };
    },
    enabled: !!restaurant?.id,
  });

  const handleExportCSV = () => {
    if (!data) return;
    const exportData = data.cashierSales.map(c => ({
      [t("cashier")]: c.email,
      [t("total_sales")]: c.totalSales,
      [t("orders")]: c.orderCount,
    }));
    exportToCSV(exportData, "staff_performance");
  };

  const handlePrint = () => {
    printReport(
      t("staff_performance"),
      restaurant?.name || "",
      dateRange,
      "staff-report-content",
      currencySymbol
    );
  };

  if (isLoading) {
    return <StaffReportsSkeleton />;
  }

  const salesColumns: DrillDownColumn<CashierSales>[] = [
    { key: "email", header: t("cashier") },
    { key: "orderCount", header: t("orders"), align: "right" },
    { key: "totalSales", header: t("total_sales"), align: "right", render: (item) => `${formatJOD(item.totalSales)} ${currencySymbol}` },
  ];

  const activityColumns: DrillDownColumn<CashierActivity>[] = [
    { key: "email", header: t("cashier") },
    { key: "voidCount", header: t("voided_items"), align: "right" },
    { key: "refundCount", header: t("refunds"), align: "right" },
  ];

  const voidColumns: DrillDownColumn<VoidDetail>[] = [
    { key: "order_number", header: t("order_number") },
    { key: "item_name", header: t("item") },
    { key: "cashier", header: t("cashier") },
    { key: "reason", header: t("reason") },
    { key: "time", header: t("time") },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        showBranch
        showCashier
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
      />

      <div id="staff-report-content" className="space-y-8">
        {/* Sales by Cashier */}
        <ReportSection
          title={t("sales_by_cashier")}
          onViewDetails={() => setShowSalesDialog(true)}
        >
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
        </ReportSection>

        {/* Cashier Activity (Voids & Refunds) */}
        <ReportSection
          title={`${t("cashier_activity")} — ${t("voids_refunds")}`}
          onViewDetails={() => setShowVoidsDialog(true)}
        >
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
        </ReportSection>
      </div>

      {/* Drill-down dialogs */}
      <DrillDownDialog
        open={showSalesDialog}
        onOpenChange={setShowSalesDialog}
        title={t("cashier_sales_details")}
        data={data?.cashierSales || []}
        columns={salesColumns}
        exportFilename="cashier_sales"
      />

      <DrillDownDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        title={t("cashier_activity")}
        data={data?.cashierActivity || []}
        columns={activityColumns}
        exportFilename="cashier_activity"
      />

      <DrillDownDialog
        open={showVoidsDialog}
        onOpenChange={setShowVoidsDialog}
        title={t("voided_items_details")}
        data={data?.voidDetails || []}
        columns={voidColumns}
        exportFilename="voided_items"
      />
    </div>
  );
}
