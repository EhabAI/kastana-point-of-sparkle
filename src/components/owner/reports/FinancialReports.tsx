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
import { FinancialReportsSkeleton } from "./ReportSkeletons";
import { ExplainTooltip } from "@/components/ui/explain-tooltip";

interface FinancialReportsProps {
  dateRange: DateRange;
}

interface RefundDetail {
  order_number: number;
  cashier: string;
  time: string;
  amount: number;
  refund_type: string;
  reason: string;
}

interface PaymentDetail {
  order_number: number;
  method: string;
  amount: number;
  time: string;
}

export function FinancialReports({ dateRange }: FinancialReportsProps) {
  const { t, language } = useLanguage();
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const [filters, setFilters] = useState<ReportFilterValues>({});
  const [showRefundsDialog, setShowRefundsDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["financial-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString(), filters],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Build base query for orders
      let ordersQuery = supabase
        .from("orders")
        .select("id, order_number, total, subtotal, discount_value, tax_amount, service_charge, status, branch_id, shift_id, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString())
        .eq("status", "paid");

      if (filters.branchId) {
        ordersQuery = ordersQuery.eq("branch_id", filters.branchId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Get payments with filtering
      let paymentsQuery = supabase
        .from("payments")
        .select("id, amount, method, order_id, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      if (filters.branchId) {
        paymentsQuery = paymentsQuery.eq("branch_id", filters.branchId);
      }
      if (filters.paymentMethod) {
        paymentsQuery = paymentsQuery.eq("method", filters.paymentMethod);
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Get refunds
      let refundsQuery = supabase
        .from("refunds")
        .select("id, amount, reason, order_id, refund_type, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      if (filters.branchId) {
        refundsQuery = refundsQuery.eq("branch_id", filters.branchId);
      }

      const { data: refunds, error: refundsError } = await refundsQuery;
      if (refundsError) throw refundsError;

      // Build detailed refund list with cashier info
      const refundOrderIds = refunds?.map(r => r.order_id) || [];
      let refundDetails: RefundDetail[] = [];
      let refundsByCashier: { email: string; count: number }[] = [];

      if (refundOrderIds.length > 0) {
        const { data: refundOrders } = await supabase
          .from("orders")
          .select("id, order_number, shift_id")
          .in("id", refundOrderIds);

        const shiftIds = [...new Set(refundOrders?.map(o => o.shift_id).filter(Boolean) || [])];
        
        let profileMap = new Map<string, string>();
        let shiftToCashier = new Map<string, string>();
        
        if (shiftIds.length > 0) {
          const { data: shifts } = await supabase
            .from("shifts")
            .select("id, cashier_id")
            .in("id", shiftIds);

          const cashierIds = [...new Set(shifts?.map(s => s.cashier_id) || [])];
          shiftToCashier = new Map(shifts?.map(s => [s.id, s.cashier_id]) || []);
          
          if (cashierIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, email")
              .in("id", cashierIds);

            profileMap = new Map(profiles?.map(p => [p.id, p.email || t("unknown")]) || []);

            // Filter by cashier if specified
            if (filters.cashierId) {
              const validShiftIds = shifts?.filter(s => s.cashier_id === filters.cashierId).map(s => s.id) || [];
              // Filter refunds to only those from the selected cashier
            }
          }
        }

        const orderMap = new Map(refundOrders?.map(o => [o.id, o]) || []);
        
        refundDetails = refunds?.map(r => {
          const order = orderMap.get(r.order_id);
          const shiftId = order?.shift_id;
          const cashierId = shiftId ? shiftToCashier.get(shiftId) : null;
          const cashierEmail = cashierId ? profileMap.get(cashierId) : null;
          
          return {
            order_number: order?.order_number || 0,
            cashier: cashierEmail || t("unknown"),
            time: format(new Date(r.created_at), "MMM d, HH:mm"),
            amount: Number(r.amount),
            refund_type: r.refund_type,
            reason: r.reason || t("no_reason_given"),
          };
        }) || [];

        // Aggregate refunds by cashier
        const cashierRefundCount: Record<string, number> = {};
        refunds?.forEach(r => {
          const order = orderMap.get(r.order_id);
          const shiftId = order?.shift_id;
          const cashierId = shiftId ? shiftToCashier.get(shiftId) : null;
          if (cashierId) {
            cashierRefundCount[cashierId] = (cashierRefundCount[cashierId] || 0) + 1;
          }
        });

        refundsByCashier = Object.entries(cashierRefundCount).map(([id, count]) => ({
          email: profileMap.get(id) || t("unknown"),
          count,
        })).sort((a, b) => b.count - a.count);
      }

      // Build detailed payment list
      const paymentOrderIds = [...new Set(payments?.map(p => p.order_id) || [])];
      let paymentDetails: PaymentDetail[] = [];
      
      if (paymentOrderIds.length > 0) {
        const { data: paymentOrders } = await supabase
          .from("orders")
          .select("id, order_number")
          .in("id", paymentOrderIds);

        const orderNumMap = new Map(paymentOrders?.map(o => [o.id, o.order_number]) || []);

        paymentDetails = payments?.map(p => ({
          order_number: orderNumMap.get(p.order_id) || 0,
          method: p.method,
          amount: Number(p.amount),
          time: format(new Date(p.created_at), "MMM d, HH:mm"),
        })) || [];
      }

      // Calculate financial metrics
      const grossSales = orders?.reduce((sum, o) => sum + Number(o.subtotal) + Number(o.discount_value || 0), 0) || 0;
      const totalDiscounts = orders?.reduce((sum, o) => sum + Number(o.discount_value || 0), 0) || 0;
      const netSales = orders?.reduce((sum, o) => sum + Number(o.subtotal), 0) || 0;
      const totalTax = orders?.reduce((sum, o) => sum + Number(o.tax_amount), 0) || 0;
      const totalServiceCharge = orders?.reduce((sum, o) => sum + Number(o.service_charge), 0) || 0;
      const finalTotal = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const totalRefundAmount = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      // Net totals after refunds (accounting correctness)
      const netFinalTotal = finalTotal - totalRefundAmount;

      // Payment methods breakdown
      const paymentsByMethod: Record<string, { total: number; count: number }> = {};
      payments?.forEach(p => {
        if (!paymentsByMethod[p.method]) {
          paymentsByMethod[p.method] = { total: 0, count: 0 };
        }
        paymentsByMethod[p.method].total += Number(p.amount);
        paymentsByMethod[p.method].count += 1;
      });

      // Adjust payment method totals by refunds (distribute refunds proportionally for now)
      // This is a simplified approach; a more accurate method would track refund payment methods

      // Refunds by reason
      const refundsByReason: Record<string, { total: number; count: number }> = {};
      refunds?.forEach(r => {
        const reason = r.reason || t("no_reason_given");
        if (!refundsByReason[reason]) {
          refundsByReason[reason] = { total: 0, count: 0 };
        }
        refundsByReason[reason].total += Number(r.amount);
        refundsByReason[reason].count += 1;
      });

      return {
        grossSales,
        totalDiscounts,
        netSales,
        totalTax,
        totalServiceCharge,
        finalTotal,
        netFinalTotal,
        paymentsByMethod,
        refundCount: refunds?.length || 0,
        totalRefundAmount,
        refundsByReason,
        refundsByCashier,
        refundDetails,
        paymentDetails,
      };
    },
    enabled: !!restaurant?.id,
  });

  const handleExportCSV = () => {
    if (!data) return;
    const exportData = [
      { metric: t("gross_sales"), value: data.grossSales },
      { metric: t("discount"), value: data.totalDiscounts },
      { metric: t("net_sales"), value: data.netSales },
      { metric: t("tax"), value: data.totalTax },
      { metric: t("service_charge"), value: data.totalServiceCharge },
      { metric: t("final_total"), value: data.finalTotal },
      { metric: t("total_refunded"), value: data.totalRefundAmount },
      { metric: t("net_after_refunds"), value: data.netFinalTotal },
    ];
    exportToCSV(exportData, "financial_report");
  };

  const handlePrint = () => {
    printReport(
      t("daily_sales_report"),
      restaurant?.name || "",
      dateRange,
      "financial-report-content",
      currencySymbol
    );
  };

  if (isLoading) {
    return <FinancialReportsSkeleton />;
  }

  const refundColumns: DrillDownColumn<RefundDetail>[] = [
    { key: "order_number", header: t("order_number") },
    { key: "cashier", header: t("cashier") },
    { key: "time", header: t("time") },
    { key: "amount", header: t("amount"), align: "right", render: (item) => `${formatJOD(item.amount)} ${currencySymbol}` },
    { key: "refund_type", header: t("refund_type") },
    { key: "reason", header: t("reason") },
  ];

  const paymentColumns: DrillDownColumn<PaymentDetail>[] = [
    { key: "order_number", header: t("order_number") },
    { key: "method", header: t("payment_method"), render: (item) => t(item.method) || item.method },
    { key: "amount", header: t("amount"), align: "right", render: (item) => `${formatJOD(item.amount)} ${currencySymbol}` },
    { key: "time", header: t("time") },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        showBranch
        showPaymentMethod
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
      />

      <div id="financial-report-content" className="space-y-8">
        {/* Daily Sales Report */}
        <ReportSection title={t("daily_sales_report")}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                {t("gross_sales")}
                <ExplainTooltip explainKey="gross_sales" language={language} />
              </p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.grossSales || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                {t("discount")}
                <ExplainTooltip explainKey="discount" language={language} />
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">-{formatJOD(data?.totalDiscounts || 0)} <span className="text-sm font-normal">{currencySymbol}</span></p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                {t("net_sales")}
                <ExplainTooltip explainKey="net_sales" language={language} />
              </p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.netSales || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                {t("tax")}
                <ExplainTooltip explainKey="tax" language={language} />
              </p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.totalTax || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
            </div>
            {(data?.totalServiceCharge || 0) > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("service_charge")}</p>
                <p className="text-xl font-bold text-foreground tabular-nums mt-1">{formatJOD(data?.totalServiceCharge || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
              </div>
            )}
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary uppercase tracking-wide font-medium flex items-center gap-1">
                {t("final_total")}
                <ExplainTooltip explainKey="z_report_total" language={language} />
              </p>
              <p className="text-2xl font-black text-foreground tabular-nums mt-1">{formatJOD(data?.finalTotal || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
            </div>
          </div>

          {/* Net after refunds */}
          {(data?.totalRefundAmount || 0) > 0 && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-destructive uppercase tracking-wide font-medium">{t("net_after_refunds")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("final_total")} - {t("refunds")}</p>
                </div>
                <p className="text-2xl font-black text-foreground tabular-nums">{formatJOD(data?.netFinalTotal || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span></p>
              </div>
            </div>
          )}
        </ReportSection>

        {/* Payment Methods Report */}
        <ReportSection
          title={t("payment_methods")}
          onViewDetails={() => setShowPaymentsDialog(true)}
        >
          {Object.keys(data?.paymentsByMethod || {}).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("no_payment_data")}</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data?.paymentsByMethod || {}).map(([method, info]) => (
                <div key={method} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground capitalize">{t(method) || method}</p>
                    <p className="text-xs text-muted-foreground">{info.count} {t("transactions")}</p>
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(info.total)} {currencySymbol}</p>
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Refunds Report */}
        <ReportSection
          title={t("refunds_report")}
          onViewDetails={() => setShowRefundsDialog(true)}
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("total_refunds")}</p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-1">{data?.refundCount || 0}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("refunded_amount")}</p>
              <p className="text-xl font-bold text-destructive tabular-nums mt-1">{formatJOD(data?.totalRefundAmount || 0)} {currencySymbol}</p>
            </div>
          </div>

          {Object.keys(data?.refundsByReason || {}).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("by_reason")}</p>
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("by_cashier")}</p>
              <div className="space-y-1">
                {data?.refundsByCashier.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded">
                    <span className="text-sm text-foreground">{c.email}</span>
                    <span className="text-sm font-medium text-foreground">{c.count} {t("refunds")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportSection>
      </div>

      {/* Drill-down dialogs */}
      <DrillDownDialog
        open={showRefundsDialog}
        onOpenChange={setShowRefundsDialog}
        title={t("refunds_details")}
        data={data?.refundDetails || []}
        columns={refundColumns}
        exportFilename="refunds_details"
      />

      <DrillDownDialog
        open={showPaymentsDialog}
        onOpenChange={setShowPaymentsDialog}
        title={t("payments_details")}
        data={data?.paymentDetails || []}
        columns={paymentColumns}
        exportFilename="payments_details"
      />
    </div>
  );
}
