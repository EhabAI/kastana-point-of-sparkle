import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { DateRange } from "../DateRangeFilter";
import { format } from "date-fns";
import { ReportFilters, ReportFilterValues } from "./ReportFilters";
import { ReportSection } from "./ReportSection";
import { DrillDownDialog, DrillDownColumn } from "./DrillDownDialog";
import { exportToCSV, printReport } from "./utils/reportUtils";

interface OrdersReportsProps {
  dateRange: DateRange;
}

interface OrderDetail {
  order_number: number;
  status: string;
  source: string;
  type: string;
  total: number;
  time: string;
}

export function OrdersReports({ dateRange }: OrdersReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const [filters, setFilters] = useState<ReportFilterValues>({});
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["orders-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString(), filters],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Build query with filters
      let query = supabase
        .from("orders")
        .select("id, order_number, total, status, source, table_id, created_at, branch_id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      if (filters.branchId) {
        query = query.eq("branch_id", filters.branchId);
      }

      // Filter by order type
      if (filters.orderType === "dine_in") {
        query = query.not("table_id", "is", null);
      } else if (filters.orderType === "takeaway") {
        query = query.is("table_id", null);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Calculate order counts by status
      const totalOrders = orders?.length || 0;
      const paidOrders = orders?.filter(o => o.status === "paid") || [];
      const openOrders = orders?.filter(o => o.status === "open" || o.status === "in_progress" || o.status === "confirmed") || [];
      const cancelledOrders = orders?.filter(o => o.status === "cancelled") || [];
      const refundedOrders = orders?.filter(o => o.status === "refunded") || [];

      // Orders by type (dine-in vs takeaway)
      const dineInOrders = paidOrders.filter(o => o.table_id !== null);
      const takeawayOrders = paidOrders.filter(o => o.table_id === null);

      // Calculate AOV
      const totalPaidAmount = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const averageOrderValue = paidOrders.length > 0 ? totalPaidAmount / paidOrders.length : 0;

      // Peak hours analysis
      const hourCounts: Record<number, number> = {};
      paidOrders.forEach(o => {
        const hour = new Date(o.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count);

      // Source breakdown
      const ordersBySource: Record<string, number> = {};
      orders?.forEach(o => {
        ordersBySource[o.source] = (ordersBySource[o.source] || 0) + 1;
      });

      // Build order details list
      const orderDetails: OrderDetail[] = orders?.map(o => ({
        order_number: o.order_number,
        status: o.status,
        source: o.source,
        type: o.table_id ? "dine_in" : "takeaway",
        total: Number(o.total),
        time: format(new Date(o.created_at), "MMM d, HH:mm"),
      })) || [];

      return {
        totalOrders,
        paidCount: paidOrders.length,
        openCount: openOrders.length,
        cancelledCount: cancelledOrders.length,
        refundedCount: refundedOrders.length,
        dineInCount: dineInOrders.length,
        takeawayCount: takeawayOrders.length,
        averageOrderValue,
        totalRevenue: totalPaidAmount,
        peakHours,
        ordersBySource,
        orderDetails,
      };
    },
    enabled: !!restaurant?.id,
  });

  const handleExportCSV = () => {
    if (!data) return;
    exportToCSV(data.orderDetails as unknown as Record<string, unknown>[], "orders_report");
  };

  const handlePrint = () => {
    printReport(
      t("orders_overview"),
      restaurant?.name || "",
      dateRange,
      "orders-report-content",
      currencySymbol
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  };

  const orderColumns: DrillDownColumn<OrderDetail>[] = [
    { key: "order_number", header: t("order_number") },
    { key: "status", header: t("status"), render: (item) => t(item.status) || item.status },
    { key: "type", header: t("type"), render: (item) => t(item.type) || item.type },
    { key: "source", header: t("source"), render: (item) => item.source === "pos" ? "POS" : item.source === "qr" ? "QR" : item.source },
    { key: "total", header: t("total"), align: "right", render: (item) => `${formatJOD(item.total)} ${currencySymbol}` },
    { key: "time", header: t("time") },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        showBranch
        showOrderType
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
      />

      <div id="orders-report-content" className="space-y-8">
        {/* Orders Overview */}
        <ReportSection
          title={t("orders_overview")}
          onViewDetails={() => setShowOrdersDialog(true)}
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("total_orders")}</p>
              <p className="text-2xl font-black text-foreground tabular-nums mt-1">{data?.totalOrders || 0}</p>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">{t("paid")}</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">{data?.paidCount || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wide">{t("open")}</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums mt-1">{data?.openCount || 0}</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide">{t("cancelled")}</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-1">{data?.cancelledCount || 0}</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive uppercase tracking-wide">{t("refunded")}</p>
              <p className="text-2xl font-bold text-destructive tabular-nums mt-1">{data?.refundedCount || 0}</p>
            </div>
          </div>
        </ReportSection>

        {/* Orders by Type */}
        <ReportSection title={t("orders_by_type")}>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("dine_in")}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{data?.dineInCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.paidCount ? ((data.dineInCount / data.paidCount) * 100).toFixed(0) : 0}%
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("takeaway")}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{data?.takeawayCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.paidCount ? ((data.takeawayCount / data.paidCount) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Average Order Value */}
        <ReportSection title={t("average_order_value")}>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary uppercase tracking-wide font-medium">{t("aov")}</p>
              <p className="text-2xl font-black text-foreground tabular-nums mt-1">{formatJOD(data?.averageOrderValue || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("total_revenue")}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.totalRevenue || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
            </div>
          </div>
        </ReportSection>

        {/* Peak Hours */}
        <ReportSection title={t("peak_hours")}>
          {(data?.peakHours || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("no_order_data")}</p>
          ) : (
            <div className="space-y-2">
              {data?.peakHours.slice(0, 8).map((ph, i) => {
                const maxCount = data.peakHours[0]?.count || 1;
                const widthPercent = (ph.count / maxCount) * 100;
                return (
                  <div key={ph.hour} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-20 text-right tabular-nums">{formatHour(ph.hour)}</span>
                    <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                      <div 
                        className={`h-full ${i === 0 ? 'bg-primary' : 'bg-primary/60'} rounded`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground w-12 tabular-nums">{ph.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ReportSection>

        {/* Orders by Source */}
        {Object.keys(data?.ordersBySource || {}).length > 1 && (
          <ReportSection title={t("orders_by_source")}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(data?.ordersBySource || {}).map(([source, count]) => (
                <div key={source} className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{source === "pos" ? "POS" : source === "qr" ? "QR Order" : source}</p>
                  <p className="text-xl font-bold text-foreground tabular-nums mt-1">{count}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}
      </div>

      {/* Drill-down dialog */}
      <DrillDownDialog
        open={showOrdersDialog}
        onOpenChange={setShowOrdersDialog}
        title={t("orders_details")}
        data={data?.orderDetails || []}
        columns={orderColumns}
        exportFilename="orders_details"
      />
    </div>
  );
}
