import { useState, useMemo } from "react";
import type { Locale } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useStockCounts,
  useStockCountLines,
  StockCount,
} from "@/hooks/useInventoryOperations";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  History, 
  Check, 
  X, 
  Lock,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Minus,
  AlertTriangle,
} from "lucide-react";

interface StockCountHistoryDialogProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CountStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "CANCELLED";

const STATUS_CONFIG: Record<CountStatus, { variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  DRAFT: { variant: "outline", icon: <FileText className="h-3 w-3" /> },
  SUBMITTED: { variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  APPROVED: { variant: "default", icon: <Check className="h-3 w-3" /> },
  CANCELLED: { variant: "destructive", icon: <X className="h-3 w-3" /> },
};

export function StockCountHistoryDialog({ restaurantId, open, onOpenChange }: StockCountHistoryDialogProps) {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  const { data: stockCounts = [], isLoading: loadingCounts } = useStockCounts(restaurantId);
  
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);

  const dateLocale = language === "ar" ? ar : enUS;

  // Owner-only access check
  const isOwner = role === "owner";

  if (!isOwner) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              {t("access_denied")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{t("inv_owner_only_feature")}</p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Filter to show only history (APPROVED and CANCELLED)
  const historyItems = useMemo(() => {
    return stockCounts
      .filter(c => c.status === "APPROVED" || c.status === "CANCELLED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [stockCounts]);

  const renderStatusBadge = (status: CountStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge variant={config.variant} className="text-xs flex items-center gap-1">
        {config.icon}
        {t(`inv_status_${status.toLowerCase()}`)}
      </Badge>
    );
  };

  const handleViewDetails = (count: StockCount) => {
    setSelectedCount(count);
  };

  const handleBackToList = () => {
    setSelectedCount(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedCount ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <History className="h-5 w-5 text-blue-600" />
                {t("inv_count_details")}
              </>
            ) : (
              <>
                <History className="h-5 w-5 text-blue-600" />
                {t("inv_stock_count_history")}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedCount 
              ? (language === "ar" ? "عرض تفاصيل الجرد - للقراءة فقط" : "Stock count details - Read only")
              : t("inv_stock_count_history_desc")
            }
          </DialogDescription>
        </DialogHeader>

        {selectedCount ? (
          <StockCountHistoryDetails 
            stockCount={selectedCount} 
            dateLocale={dateLocale}
          />
        ) : (
          <StockCountHistoryList
            historyItems={historyItems}
            isLoading={loadingCounts}
            dateLocale={dateLocale}
            onViewDetails={handleViewDetails}
            renderStatusBadge={renderStatusBadge}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StockCountHistoryListProps {
  historyItems: StockCount[];
  isLoading: boolean;
  dateLocale: Locale;
  onViewDetails: (count: StockCount) => void;
  renderStatusBadge: (status: CountStatus) => React.ReactNode;
}

function StockCountHistoryList({ 
  historyItems, 
  isLoading, 
  dateLocale, 
  onViewDetails,
  renderStatusBadge 
}: StockCountHistoryListProps) {
  const { t, language } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <History className="h-12 w-12 mb-4 opacity-40" />
        <span className="text-sm font-medium">{t("inv_no_history")}</span>
        <span className="text-xs mt-1">
          {language === "ar" 
            ? "لا توجد عمليات جرد مكتملة أو ملغاة"
            : "No approved or cancelled stock counts yet"}
        </span>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-[450px] pr-4">
      <div className="space-y-3">
        {historyItems.map((count) => {
          const isApproved = count.status === "APPROVED";
          
          return (
            <div
              key={count.id}
              className={`p-4 rounded-lg border transition-colors ${
                isApproved 
                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                  : "bg-muted/30 border-border opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{count.branchName}</span>
                    {renderStatusBadge(count.status as CountStatus)}
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                  
                  {/* Date & Approver Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{t("inv_count_date")}:</span>
                      <span className="text-foreground">
                        {format(new Date(count.createdAt), "PPP", { locale: dateLocale })}
                      </span>
                    </div>
                    
                    {isApproved && count.approvedAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{t("inv_approved_at")}:</span>
                        <span className="text-foreground">
                          {format(new Date(count.approvedAt), "PPp", { locale: dateLocale })}
                        </span>
                      </div>
                    )}
                    
                    {isApproved && count.approvedByName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{t("inv_approved_by")}:</span>
                        <span className="text-foreground font-medium">{count.approvedByName}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Variance Summary for APPROVED counts */}
                  {isApproved && count.totalItems !== undefined && (
                    <div className="flex items-center gap-4 text-sm p-2 bg-background/50 rounded border">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{count.totalItems}</span>
                        <span className="text-muted-foreground">{t("items")}</span>
                      </div>
                      
                      <div className="h-4 w-px bg-border" />
                      
                      {count.itemsWithVariance !== undefined && count.itemsWithVariance > 0 ? (
                        <>
                          <div className="flex items-center gap-1.5 text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-mono font-medium">
                              +{count.totalPositiveVariance?.toFixed(1) || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-red-600">
                            <TrendingDown className="h-4 w-4" />
                            <span className="font-mono font-medium">
                              -{count.totalNegativeVariance?.toFixed(1) || 0}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({count.itemsWithVariance} {t("inv_with_variance")})
                          </span>
                        </>
                      ) : (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          {t("inv_no_variance")}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {count.notes && (
                    <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {count.notes}
                    </p>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails(count)}
                  className="flex-shrink-0"
                >
                  {t("view_details")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface StockCountHistoryDetailsProps {
  stockCount: StockCount;
  dateLocale: Locale;
}

function StockCountHistoryDetails({ stockCount, dateLocale }: StockCountHistoryDetailsProps) {
  const { t, language } = useLanguage();
  const { data: lines = [], isLoading } = useStockCountLines(stockCount.id);

  const isApproved = stockCount.status === "APPROVED";

  // Calculate summary stats
  const summary = useMemo(() => {
    let totalItems = lines.length;
    let positiveVariance = 0;
    let negativeVariance = 0;
    let itemsWithVariance = 0;

    lines.forEach(line => {
      const variance = line.actualBase - line.expectedBase;
      if (Math.abs(variance) > 0.01) {
        itemsWithVariance++;
        if (variance > 0) {
          positiveVariance += variance;
        } else {
          negativeVariance += Math.abs(variance);
        }
      }
    });

    return { totalItems, positiveVariance, negativeVariance, itemsWithVariance };
  }, [lines]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 flex-1">
      {/* Status Banner */}
      <div className={`p-3 rounded-lg flex items-center gap-3 ${
        isApproved 
          ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" 
          : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
      }`}>
        <Lock className="h-4 w-4" />
        <div className="flex-1">
          <span className="text-sm font-medium">
            {isApproved 
              ? (language === "ar" ? "جرد معتمد - للقراءة فقط" : "Approved count - Read only")
              : (language === "ar" ? "جرد ملغي - للقراءة فقط" : "Cancelled count - Read only")}
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span>{stockCount.branchName}</span>
            <span>•</span>
            <span>{format(new Date(stockCount.createdAt), "PPP", { locale: dateLocale })}</span>
            {isApproved && stockCount.approvedByName && (
              <>
                <span>•</span>
                <span>{t("inv_approved_by")}: {stockCount.approvedByName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <p className="text-2xl font-bold">{summary.totalItems}</p>
          <p className="text-xs text-muted-foreground">{t("inv_total_items")}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <p className="text-2xl font-bold">{summary.itemsWithVariance}</p>
          <p className="text-xs text-muted-foreground">{t("inv_with_variance")}</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
            <TrendingUp className="h-5 w-5" />
            +{summary.positiveVariance.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">{t("inv_overage")}</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
            <TrendingDown className="h-5 w-5" />
            -{summary.negativeVariance.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">{t("inv_shortage")}</p>
        </div>
      </div>

      {/* Items Table Header */}
      <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-muted-foreground border-b pb-2">
        <div className="col-span-5">{t("inv_item")}</div>
        <div className="col-span-2 text-center">{t("inv_theoretical")}</div>
        <div className="col-span-2 text-center">{t("inv_actual")}</div>
        <div className="col-span-3 text-center">{t("inv_variance")}</div>
      </div>

      {/* Items List - Read Only */}
      <ScrollArea className="h-[280px] pr-4">
        <div className="space-y-2">
          {lines.map((line) => {
            const variance = line.actualBase - line.expectedBase;
            const hasVariance = Math.abs(variance) > 0.01;

            return (
              <div
                key={line.id}
                className={`grid grid-cols-12 gap-2 p-3 rounded-lg border items-center ${
                  hasVariance 
                    ? variance > 0 
                      ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                      : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                    : "bg-muted/20"
                }`}
              >
                {/* Item Name */}
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    {hasVariance && (
                      <AlertTriangle className={`h-4 w-4 ${variance > 0 ? "text-green-600" : "text-red-600"}`} />
                    )}
                    <span className="font-medium text-sm">{line.itemName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{line.unitName}</span>
                </div>

                {/* Theoretical Qty (Read-only) */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {line.expectedBase.toFixed(2)}
                  </span>
                </div>

                {/* Actual Qty (Read-only) */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {line.actualBase.toFixed(2)}
                  </span>
                </div>

                {/* Variance (Read-only) */}
                <div className="col-span-3 text-center">
                  <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                    hasVariance 
                      ? variance > 0 ? "text-green-600" : "text-red-600"
                      : "text-muted-foreground"
                  }`}>
                    {hasVariance ? (
                      variance > 0 ? (
                        <><TrendingUp className="h-3 w-3" />+{variance.toFixed(2)}</>
                      ) : (
                        <><TrendingDown className="h-3 w-3" />{variance.toFixed(2)}</>
                      )
                    ) : (
                      <><Minus className="h-3 w-3" />0.00</>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
