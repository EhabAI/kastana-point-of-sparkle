import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { DateRange } from "../DateRangeFilter";
import { format, differenceInMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ReportFilters, ReportFilterValues } from "./ReportFilters";
import { ReportSection } from "./ReportSection";
import { DrillDownDialog, DrillDownColumn } from "./DrillDownDialog";
import { exportToCSV, printReport, getPaginatedData, getTotalPages } from "./utils/reportUtils";
import { OperationsReportsSkeleton } from "./ReportSkeletons";
import { ReportTablePagination } from "./ReportTablePagination";

interface OperationsReportsProps {
  dateRange: DateRange;
}

interface ShiftData {
  id: string;
  cashierEmail: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  durationMinutes: number;
  openingCash: number;
  closingCash: number | null;
  totalSales: number;
  expectedCash: number;
  difference: number | null;
  cashIn: number;
  cashOut: number;
}

interface TableUsage {
  tableName: string;
  orderCount: number;
  totalMinutes: number;
  avgOccupancy: number;
}

interface CashMovement {
  cashierEmail: string;
  type: string;
  amount: number;
  reason: string;
  time: string;
}

export function OperationsReports({ dateRange }: OperationsReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const [filters, setFilters] = useState<ReportFilterValues>({});
  const [showShiftsDialog, setShowShiftsDialog] = useState(false);
  const [showCashDiffDialog, setShowCashDiffDialog] = useState(false);
  const [showCashMovementsDialog, setShowCashMovementsDialog] = useState(false);
  const [shiftsPage, setShiftsPage] = useState(1);
  const [shiftsPageSize, setShiftsPageSize] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ["operations-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString(), filters],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Build shifts query with filters
      let shiftsQuery = supabase
        .from("shifts")
        .select("id, cashier_id, opened_at, closed_at, status, opening_cash, closing_cash, branch_id")
        .eq("restaurant_id", restaurant.id)
        .gte("opened_at", dateRange.from.toISOString())
        .lt("opened_at", dateRange.to.toISOString())
        .order("opened_at", { ascending: false });

      if (filters.branchId) {
        shiftsQuery = shiftsQuery.eq("branch_id", filters.branchId);
      }

      const { data: shifts, error: shiftsError } = await shiftsQuery;
      if (shiftsError) throw shiftsError;

      let shiftIds = shifts?.map(s => s.id) || [];
      let cashierIds = [...new Set(shifts?.map(s => s.cashier_id) || [])];

      // Filter by cashier
      if (filters.cashierId) {
        const filteredShifts = shifts?.filter(s => s.cashier_id === filters.cashierId) || [];
        shiftIds = filteredShifts.map(s => s.id);
        cashierIds = [filters.cashierId];
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds.length > 0 ? cashierIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email || t("unknown")]) || []);

      // Get cash movements (shift_transactions)
      let cashMovements: CashMovement[] = [];
      if (shiftIds.length > 0) {
        const { data: transactions } = await supabase
          .from("shift_transactions")
          .select("shift_id, type, amount, reason, created_at")
          .in("shift_id", shiftIds);

        const shiftToCashier = new Map(shifts?.map(s => [s.id, s.cashier_id]) || []);

        cashMovements = transactions?.map(tx => ({
          cashierEmail: profileMap.get(shiftToCashier.get(tx.shift_id) || "") || t("unknown"),
          type: tx.type,
          amount: Number(tx.amount),
          reason: tx.reason || "",
          time: format(new Date(tx.created_at), "MMM d, HH:mm"),
        })) || [];
      }

      // Get orders by shift for shift sales
      let shiftSalesMap: Record<string, number> = {};
      let shiftCashInMap: Record<string, number> = {};
      let shiftCashOutMap: Record<string, number> = {};

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

        // Get cash movements per shift
        const { data: movements } = await supabase
          .from("shift_transactions")
          .select("shift_id, type, amount")
          .in("shift_id", shiftIds);

        movements?.forEach(m => {
          if (m.type === "cash_in") {
            shiftCashInMap[m.shift_id] = (shiftCashInMap[m.shift_id] || 0) + Number(m.amount);
          } else if (m.type === "cash_out") {
            shiftCashOutMap[m.shift_id] = (shiftCashOutMap[m.shift_id] || 0) + Number(m.amount);
          }
        });
      }

      // Calculate shift data with duration and sales
      const shiftsWithData: ShiftData[] = (filters.cashierId 
        ? shifts?.filter(s => s.cashier_id === filters.cashierId) 
        : shifts)?.map(s => {
        const durationMinutes = s.closed_at 
          ? differenceInMinutes(new Date(s.closed_at), new Date(s.opened_at))
          : differenceInMinutes(new Date(), new Date(s.opened_at));
        
        const cashIn = shiftCashInMap[s.id] || 0;
        const cashOut = shiftCashOutMap[s.id] || 0;
        const expectedCash = (shiftSalesMap[s.id] || 0) + Number(s.opening_cash) + cashIn - cashOut;
        const actualCash = s.closing_cash !== null ? Number(s.closing_cash) : null;
        const difference = actualCash !== null ? actualCash - expectedCash : null;

        return {
          id: s.id,
          cashierEmail: profileMap.get(s.cashier_id) || t("unknown"),
          openedAt: s.opened_at,
          closedAt: s.closed_at,
          status: s.status,
          durationMinutes,
          openingCash: Number(s.opening_cash),
          closingCash: actualCash,
          totalSales: shiftSalesMap[s.id] || 0,
          expectedCash,
          difference,
          cashIn,
          cashOut,
        };
      }) || [];

      // Get tables with order counts
      let tableUsage: TableUsage[] = [];
      
      const { data: tables, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("id, table_name, branch_id")
        .eq("restaurant_id", restaurant.id);

      if (!tablesError && tables) {
        // Filter tables by branch if selected
        const filteredTables = filters.branchId 
          ? tables.filter(t => t.branch_id === filters.branchId)
          : tables;

        // Get orders with table info
        let tableOrdersQuery = supabase
          .from("orders")
          .select("id, table_id, created_at, updated_at")
          .eq("restaurant_id", restaurant.id)
          .gte("created_at", dateRange.from.toISOString())
          .lt("created_at", dateRange.to.toISOString())
          .not("table_id", "is", null);

        if (filters.branchId) {
          tableOrdersQuery = tableOrdersQuery.eq("branch_id", filters.branchId);
        }

        const { data: tableOrders } = await tableOrdersQuery;

        // Aggregate table usage
        const tableUsageMap: Record<string, TableUsage> = {};
        filteredTables.forEach(t => {
          tableUsageMap[t.id] = { tableName: t.table_name, orderCount: 0, totalMinutes: 0, avgOccupancy: 0 };
        });

        tableOrders?.forEach(o => {
          if (o.table_id && tableUsageMap[o.table_id]) {
            tableUsageMap[o.table_id].orderCount += 1;
            const duration = differenceInMinutes(new Date(o.updated_at), new Date(o.created_at));
            tableUsageMap[o.table_id].totalMinutes += duration;
          }
        });

        tableUsage = Object.values(tableUsageMap)
          .filter(t => t.orderCount > 0)
          .map(t => ({
            ...t,
            avgOccupancy: t.orderCount > 0 ? Math.round(t.totalMinutes / t.orderCount) : 0,
          }))
          .sort((a, b) => b.orderCount - a.orderCount);
      }

      return {
        shifts: shiftsWithData,
        tableUsage,
        cashMovements,
      };
    },
    enabled: !!restaurant?.id,
  });

  // Format duration with Arabic support and proper spacing
  // Note: durationMinutes here comes from differenceInMinutes, so it's already in minutes
  const formatDuration = (durationValue: number) => {
    // Normalize: if value > 1440 (24 hours in minutes), it's likely in seconds
    const totalMinutes = durationValue > 1440 
      ? Math.floor(durationValue / 60) 
      : Math.floor(durationValue);
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const paddedMins = mins.toString().padStart(2, "0");
    
    if (language === "ar") {
      return `${hours} س ${paddedMins} د`;
    }
    return `${hours}h ${paddedMins}m`;
  };

  const handleExportCSV = () => {
    if (!data) return;
    const exportData = data.shifts.map(s => ({
      [t("cashier")]: s.cashierEmail,
      [t("started")]: format(new Date(s.openedAt), "MMM d, HH:mm"),
      [t("ended")]: s.closedAt ? format(new Date(s.closedAt), "HH:mm") : t("open"),
      [t("duration")]: formatDuration(s.durationMinutes),
      [t("sales")]: s.totalSales,
      [t("expected")]: s.expectedCash,
      [t("actual")]: s.closingCash || "",
      [t("difference")]: s.difference || "",
    }));
    exportToCSV(exportData, "operations_report");
  };

  const handlePrint = () => {
    printReport(
      t("operations_report"),
      restaurant?.name || "",
      dateRange,
      "operations-report-content",
      currencySymbol
    );
  };

  if (isLoading) {
    return <OperationsReportsSkeleton />;
  }

  const shiftsWithDifference = (data?.shifts || []).filter(s => s.difference !== null && s.difference !== 0);
  const paginatedShifts = getPaginatedData(data?.shifts || [], { page: shiftsPage, pageSize: shiftsPageSize });
  const totalShiftPages = getTotalPages((data?.shifts || []).length, shiftsPageSize);

  const shiftColumns: DrillDownColumn<ShiftData>[] = [
    { key: "cashierEmail", header: t("cashier") },
    { key: "openedAt", header: t("started"), render: (item) => format(new Date(item.openedAt), "MMM d, HH:mm") },
    { key: "closedAt", header: t("ended"), render: (item) => item.closedAt ? format(new Date(item.closedAt), "HH:mm") : t("open") },
    { key: "durationMinutes", header: t("duration"), align: "right", render: (item) => formatDuration(item.durationMinutes) },
    { key: "totalSales", header: t("sales"), align: "right", render: (item) => `${formatJOD(item.totalSales)} ${currencySymbol}` },
    { key: "cashIn", header: t("cash_in"), align: "right", render: (item) => `${formatJOD(item.cashIn)} ${currencySymbol}` },
    { key: "cashOut", header: t("cash_out"), align: "right", render: (item) => `${formatJOD(item.cashOut)} ${currencySymbol}` },
  ];

  const cashDiffColumns: DrillDownColumn<ShiftData>[] = [
    { key: "cashierEmail", header: t("cashier") },
    { key: "openedAt", header: t("date"), render: (item) => format(new Date(item.openedAt), "MMM d") },
    { key: "expectedCash", header: t("expected"), align: "right", render: (item) => `${formatJOD(item.expectedCash)} ${currencySymbol}` },
    { key: "closingCash", header: t("actual"), align: "right", render: (item) => `${formatJOD(item.closingCash || 0)} ${currencySymbol}` },
    { key: "difference", header: t("difference"), align: "right", render: (item) => (
      <span className={item.difference! < 0 ? 'text-destructive' : item.difference! > 0 ? 'text-emerald-600' : ''}>
        {item.difference! > 0 ? '+' : ''}{formatJOD(item.difference!)} {currencySymbol}
      </span>
    )},
  ];

  const cashMovementColumns: DrillDownColumn<CashMovement>[] = [
    { key: "cashierEmail", header: t("cashier") },
    { key: "type", header: t("type"), render: (item) => item.type === "cash_in" ? t("cash_in") : t("cash_out") },
    { key: "amount", header: t("amount"), align: "right", render: (item) => `${formatJOD(item.amount)} ${currencySymbol}` },
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

      <div id="operations-report-content" className="space-y-8">
        {/* Shifts History */}
        <ReportSection
          title={t("shifts_history")}
          onViewDetails={() => setShowShiftsDialog(true)}
        >
          {(data?.shifts || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("no_shifts_found")}</p>
          ) : (
            <>
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
                    {paginatedShifts.map((shift) => (
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
              <ReportTablePagination
                currentPage={shiftsPage}
                totalPages={totalShiftPages}
                totalItems={(data?.shifts || []).length}
                pageSize={shiftsPageSize}
                onPageChange={setShiftsPage}
                onPageSizeChange={(size) => { setShiftsPageSize(size); setShiftsPage(1); }}
              />
            </>
          )}
        </ReportSection>

        {/* Cash Difference Report */}
        {shiftsWithDifference.length > 0 && (
          <ReportSection
            title={t("cash_difference")}
            onViewDetails={() => setShowCashDiffDialog(true)}
          >
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
          </ReportSection>
        )}

        {/* Cash Movements */}
        {(data?.cashMovements || []).length > 0 && (
          <ReportSection
            title={t("cash_movements")}
            onViewDetails={() => setShowCashMovementsDialog(true)}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">{t("total_cash_in")}</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
                  {formatJOD(data?.cashMovements.filter(m => m.type === "cash_in").reduce((s, m) => s + m.amount, 0) || 0)} {currencySymbol}
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide">{t("total_cash_out")}</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-1">
                  {formatJOD(data?.cashMovements.filter(m => m.type === "cash_out").reduce((s, m) => s + m.amount, 0) || 0)} {currencySymbol}
                </p>
              </div>
            </div>
          </ReportSection>
        )}

        {/* Tables Usage */}
        <ReportSection title={t("tables_usage")}>
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
        </ReportSection>
      </div>

      {/* Drill-down dialogs */}
      <DrillDownDialog
        open={showShiftsDialog}
        onOpenChange={setShowShiftsDialog}
        title={t("all_shifts")}
        data={data?.shifts || []}
        columns={shiftColumns}
        exportFilename="shifts_details"
      />

      <DrillDownDialog
        open={showCashDiffDialog}
        onOpenChange={setShowCashDiffDialog}
        title={t("cash_difference_details")}
        data={shiftsWithDifference}
        columns={cashDiffColumns}
        exportFilename="cash_differences"
      />

      <DrillDownDialog
        open={showCashMovementsDialog}
        onOpenChange={setShowCashMovementsDialog}
        title={t("cash_movements_details")}
        data={data?.cashMovements || []}
        columns={cashMovementColumns}
        exportFilename="cash_movements"
      />
    </div>
  );
}
