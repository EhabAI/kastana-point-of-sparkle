import { Skeleton } from "@/components/ui/skeleton";

// KPI Card Skeleton - matches the layout of report KPI cards
export function KPICardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`p-4 bg-muted/30 rounded-lg ${wide ? "col-span-2" : ""}`}>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

// Row of KPI cards skeleton (2-5 cards)
export function KPIGridSkeleton({ count = 3, cols = 3 }: { count?: number; cols?: 2 | 3 | 5 }) {
  const gridCols = cols === 2 ? "grid-cols-2" : cols === 5 ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-3";
  return (
    <div className={`grid ${gridCols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>
  );
}

// Summary block skeleton (payment methods, refund breakdown, etc.)
export function SummaryBlockSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// Table skeleton with header and rows
export function TableSkeleton({ 
  rows = 5, 
  cols = 4,
  showHeader = true 
}: { 
  rows?: number; 
  cols?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {showHeader && (
          <thead>
            <tr className="border-b border-border/50">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="py-2 px-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border/30">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="py-3 px-3">
                  <Skeleton className={`h-4 ${colIdx === 0 ? "w-28" : "w-16"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Peak hours chart skeleton
export function ChartSkeleton({ bars = 6 }: { bars?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: bars }).map((_, i) => {
        const widthPercent = 100 - i * 12;
        return (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
              <Skeleton className="h-full rounded" style={{ width: `${widthPercent}%` }} />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        );
      })}
    </div>
  );
}

// Full report section skeleton (title + content)
export function ReportSectionSkeleton({ 
  type = "kpi" 
}: { 
  type?: "kpi" | "table" | "summary" | "chart" 
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-20" />
      </div>
      {type === "kpi" && <KPIGridSkeleton />}
      {type === "table" && <TableSkeleton />}
      {type === "summary" && <SummaryBlockSkeleton />}
      {type === "chart" && <ChartSkeleton />}
    </section>
  );
}

// Complete loading state for Financial Reports
export function FinancialReportsSkeleton() {
  return (
    <div className="space-y-8">
      <ReportSectionSkeleton type="kpi" />
      <ReportSectionSkeleton type="summary" />
      <ReportSectionSkeleton type="kpi" />
    </div>
  );
}

// Complete loading state for Orders Reports
export function OrdersReportsSkeleton() {
  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-20" />
        </div>
        <KPIGridSkeleton count={5} cols={5} />
      </section>
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
          <Skeleton className="h-4 w-28" />
        </div>
        <KPIGridSkeleton count={2} cols={2} />
      </section>
      <ReportSectionSkeleton type="chart" />
    </div>
  );
}

// Complete loading state for Menu Reports
export function MenuReportsSkeleton() {
  return (
    <div className="space-y-8">
      <ReportSectionSkeleton type="summary" />
      <ReportSectionSkeleton type="summary" />
      <ReportSectionSkeleton type="summary" />
      <ReportSectionSkeleton type="table" />
    </div>
  );
}

// Complete loading state for Staff Reports
export function StaffReportsSkeleton() {
  return (
    <div className="space-y-8">
      <ReportSectionSkeleton type="summary" />
      <ReportSectionSkeleton type="table" />
    </div>
  );
}

// Complete loading state for Operations Reports
export function OperationsReportsSkeleton() {
  return (
    <div className="space-y-8">
      <ReportSectionSkeleton type="table" />
      <ReportSectionSkeleton type="table" />
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
          <Skeleton className="h-4 w-32" />
        </div>
        <KPIGridSkeleton count={2} cols={2} />
      </section>
    </div>
  );
}

// Complete loading state for Branch Reports
export function BranchReportsSkeleton() {
  return (
    <div className="space-y-8">
      <ReportSectionSkeleton type="summary" />
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
          <Skeleton className="h-4 w-32" />
        </div>
        <KPIGridSkeleton count={3} cols={3} />
      </section>
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
          <Skeleton className="h-4 w-32" />
        </div>
        <KPIGridSkeleton count={3} cols={3} />
      </section>
    </div>
  );
}
