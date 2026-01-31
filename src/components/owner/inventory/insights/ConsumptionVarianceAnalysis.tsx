import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContext } from "@/contexts/BranchContext";
import { 
  useConsumptionVariance, 
  useConsumptionVarianceSummary,
  useUpsertVarianceTag,
  useDeleteVarianceTag,
  ROOT_CAUSE_OPTIONS,
  RootCauseType,
  ConsumptionVarianceItem
} from "@/hooks/useConsumptionVariance";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Tag, 
  CalendarIcon, 
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  Calculator,
  DollarSign
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ConsumptionVarianceAnalysisProps {
  restaurantId: string;
  branchId?: string;
}

const ROOT_CAUSE_LABELS: Record<RootCauseType, { en: string; ar: string }> = {
  WASTE: { en: "Waste", ar: "هدر" },
  THEFT: { en: "Theft", ar: "سرقة" },
  OVER_PORTIONING: { en: "Over-portioning", ar: "تقديم زائد" },
  DATA_ERROR: { en: "Data Error", ar: "خطأ في البيانات" },
  SUPPLIER_VARIANCE: { en: "Supplier Variance", ar: "فرق المورد" },
  UNKNOWN: { en: "Unknown", ar: "غير معروف" },
};

const ROOT_CAUSE_COLORS: Record<RootCauseType, string> = {
  WASTE: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  THEFT: "bg-red-500/10 text-red-600 border-red-500/30",
  OVER_PORTIONING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  DATA_ERROR: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  SUPPLIER_VARIANCE: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  UNKNOWN: "bg-gray-500/10 text-gray-600 border-gray-500/30",
};

type DatePreset = "last7" | "last30" | "thisMonth" | "lastMonth" | "thisWeek" | "custom";

export function ConsumptionVarianceAnalysis({ restaurantId, branchId }: ConsumptionVarianceAnalysisProps) {
  const { t, language } = useLanguage();
  const { branches, selectedBranch } = useBranchContext();
  const dateLocale = language === "ar" ? ar : enUS;

  // Use prop branchId if provided, otherwise use context
  const effectiveBranchId = branchId || selectedBranch?.id || "";
  // State
  const [datePreset, setDatePreset] = useState<DatePreset>("last7");
  const [customStart, setCustomStart] = useState<Date>(subDays(new Date(), 7));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConsumptionVarianceItem | null>(null);
  const [tagForm, setTagForm] = useState<{ rootCause: RootCauseType; notes: string }>({
    rootCause: "UNKNOWN",
    notes: "",
  });

  // Calculate date range based on preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "last7":
        return { startDate: subDays(now, 7), endDate: now };
      case "last30":
        return { startDate: subDays(now, 30), endDate: now };
      case "thisMonth":
        return { startDate: startOfMonth(now), endDate: now };
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(now), 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
      case "thisWeek":
        return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: now };
      case "custom":
        return { startDate: customStart, endDate: customEnd };
      default:
        return { startDate: subDays(now, 7), endDate: now };
    }
  }, [datePreset, customStart, customEnd]);

  // Fetch variance data using effective branch ID
  const { data: varianceItems = [], isLoading } = useConsumptionVariance({
    restaurantId,
    branchId: effectiveBranchId,
    startDate,
    endDate,
  });

  const summary = useConsumptionVarianceSummary(varianceItems);

  // Mutations
  const upsertTag = useUpsertVarianceTag();
  const deleteTag = useDeleteVarianceTag();

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return varianceItems;
    const query = searchQuery.toLowerCase();
    return varianceItems.filter((item) =>
      item.itemName.toLowerCase().includes(query)
    );
  }, [varianceItems, searchQuery]);

  // Format currency (JOD)
  const formatCurrency = (value: number) => {
    const formatted = Math.abs(value).toFixed(3);
    const prefix = value < 0 ? "-" : "";
    return `${prefix}${formatted} ${language === "ar" ? "د.أ" : "JOD"}`;
  };

  // Handle tag dialog
  const openTagDialog = (item: ConsumptionVarianceItem) => {
    setSelectedItem(item);
    setTagForm({
      rootCause: (item.rootCauseTag as RootCauseType) || "UNKNOWN",
      notes: item.rootCauseNotes || "",
    });
    setTagDialogOpen(true);
  };

  const handleSaveTag = async () => {
    if (!selectedItem || !effectiveBranchId) return;

    await upsertTag.mutateAsync({
      restaurantId,
      branchId: effectiveBranchId,
      inventoryItemId: selectedItem.inventoryItemId,
      periodStart: format(startDate, "yyyy-MM-dd"),
      periodEnd: format(endDate, "yyyy-MM-dd"),
      rootCause: tagForm.rootCause,
      notes: tagForm.notes,
      varianceQty: selectedItem.variance,
      varianceValue: selectedItem.varianceCost,
    });

    setTagDialogOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteTag = async () => {
    if (!selectedItem?.tagId) return;
    await deleteTag.mutateAsync({ tagId: selectedItem.tagId });
    setTagDialogOpen(false);
    setSelectedItem(null);
  };

  // Variance indicator
  const VarianceIndicator = ({ variance }: { variance: number }) => {
    if (Math.abs(variance) < 0.001) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (variance > 0) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("inv_consumption_variance")}</h2>
          <p className="text-sm text-muted-foreground">{t("inv_consumption_variance_desc")}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Show current branch info when filtering by global selector */}
            {branchId && selectedBranch && (
              <div className="space-y-2 min-w-[180px]">
                <Label>{t("branch")}</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                  <span className="text-sm">{selectedBranch.name}</span>
                </div>
              </div>
            )}

            {/* Date Preset */}
            <div className="space-y-2 min-w-[160px]">
              <Label>{t("period")}</Label>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">{t("last_7_days")}</SelectItem>
                  <SelectItem value="last30">{t("last_30_days")}</SelectItem>
                  <SelectItem value="thisWeek">{t("this_week")}</SelectItem>
                  <SelectItem value="thisMonth">{t("this_month")}</SelectItem>
                  <SelectItem value="lastMonth">{t("last_month")}</SelectItem>
                  <SelectItem value="custom">{t("custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Pickers */}
            {datePreset === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>{t("start_date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(customStart, "MMM d", { locale: dateLocale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStart}
                        onSelect={(d) => d && setCustomStart(d)}
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{t("end_date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(customEnd, "MMM d", { locale: dateLocale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEnd}
                        onSelect={(d) => d && setCustomEnd(d)}
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Search */}
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>{t("search")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("inv_search_items")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inv_items_analyzed")}</p>
                <p className="text-xl font-semibold">{summary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingUp className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inv_over_consumption")}</p>
                <p className="text-xl font-semibold">{summary.totalPositiveVariance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingDown className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inv_under_consumption")}</p>
                <p className="text-xl font-semibold">{summary.totalNegativeVariance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                summary.netVarianceCost > 0 ? "bg-red-500/10" : "bg-green-500/10"
              )}>
                <DollarSign className={cn(
                  "h-4 w-4",
                  summary.netVarianceCost > 0 ? "text-red-500" : "text-green-500"
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inv_cost_impact")}</p>
                <p className={cn(
                  "text-xl font-semibold",
                  summary.netVarianceCost > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {formatCurrency(summary.netVarianceCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tagging Progress */}
      {summary.itemsWithVariance > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("inv_tagging_progress")}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{summary.taggedCount} {t("tagged")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{summary.untaggedCount} {t("untagged")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("inv_variance_details")}</CardTitle>
          <CardDescription>
            {format(startDate, "MMM d, yyyy", { locale: dateLocale })} – {format(endDate, "MMM d, yyyy", { locale: dateLocale })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-sm">{t("inv_no_variance_data")}</p>
              <p className="text-xs mt-1">{t("inv_no_variance_data_hint")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("inv_item")}</TableHead>
                    <TableHead className="text-center">{t("inv_theoretical")}</TableHead>
                    <TableHead className="text-center">{t("inv_actual")}</TableHead>
                    <TableHead className="text-center">{t("inv_variance")}</TableHead>
                    <TableHead className="text-center">{t("inv_variance_pct")}</TableHead>
                    <TableHead className="text-center">{t("inv_cost_impact")}</TableHead>
                    <TableHead className="text-center">{t("inv_root_cause")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.inventoryItemId}>
                      <TableCell>
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-xs text-muted-foreground">{item.unitName}</div>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.theoreticalConsumption.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.actualConsumption.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <VarianceIndicator variance={item.variance} />
                          <span className={cn(
                            "font-mono",
                            item.variance > 0 ? "text-red-600" : item.variance < 0 ? "text-green-600" : ""
                          )}>
                            {item.variance > 0 ? "+" : ""}{item.variance.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-mono text-sm",
                          Math.abs(item.variancePercentage) > 10 ? "text-red-600 font-semibold" : ""
                        )}>
                          {item.variancePercentage > 0 ? "+" : ""}{item.variancePercentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-mono text-sm",
                          item.varianceCost > 0 ? "text-red-600" : item.varianceCost < 0 ? "text-green-600" : ""
                        )}>
                          {formatCurrency(item.varianceCost)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.rootCauseTag ? (
                          <Badge 
                            variant="outline" 
                            className={ROOT_CAUSE_COLORS[item.rootCauseTag as RootCauseType]}
                          >
                            {ROOT_CAUSE_LABELS[item.rootCauseTag as RootCauseType][language]}
                          </Badge>
                        ) : Math.abs(item.variance) > 0.001 ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            {t("untagged")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {Math.abs(item.variance) > 0.001 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTagDialog(item)}
                          >
                            <Tag className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inv_tag_variance")}</DialogTitle>
            <DialogDescription>
              {selectedItem?.itemName} — {t("inv_variance")}: {selectedItem?.variance.toFixed(2)} {selectedItem?.unitName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("inv_root_cause")}</Label>
              <Select
                value={tagForm.rootCause}
                onValueChange={(v) => setTagForm((f) => ({ ...f, rootCause: v as RootCauseType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOT_CAUSE_OPTIONS.map((cause) => (
                    <SelectItem key={cause} value={cause}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", ROOT_CAUSE_COLORS[cause].split(" ")[0])} />
                        {ROOT_CAUSE_LABELS[cause][language]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("notes")} ({t("optional")})</Label>
              <Textarea
                placeholder={t("inv_tag_notes_placeholder")}
                value={tagForm.notes}
                onChange={(e) => setTagForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {selectedItem?.tagId && (
              <Button
                variant="outline"
                onClick={handleDeleteTag}
                disabled={deleteTag.isPending}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {t("remove")}
              </Button>
            )}
            <Button
              onClick={handleSaveTag}
              disabled={upsertTag.isPending}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
