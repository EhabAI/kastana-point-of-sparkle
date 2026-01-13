import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/hooks/useBranches";
import { useInventoryItems } from "@/hooks/useInventoryItems";
import {
  useStockCounts,
  useStockCountLines,
  useCreateStockCount,
  useUpdateStockCountLine,
  useSubmitStockCount,
  useCancelStockCount,
  StockCount,
} from "@/hooks/useInventoryOperations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  Loader2, 
  ClipboardList, 
  Plus, 
  Check, 
  AlertTriangle, 
  Package, 
  X, 
  Lock,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface StockCountDialogProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CountStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "CANCELLED";

const STATUS_CONFIG: Record<CountStatus, { variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode; color: string }> = {
  DRAFT: { variant: "outline", icon: null, color: "text-muted-foreground" },
  SUBMITTED: { variant: "secondary", icon: null, color: "text-blue-600" },
  APPROVED: { variant: "default", icon: <Check className="h-3 w-3" />, color: "text-green-600" },
  CANCELLED: { variant: "destructive", icon: <X className="h-3 w-3" />, color: "text-red-600" },
};

export function StockCountDialog({ restaurantId, open, onOpenChange }: StockCountDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: items = [] } = useInventoryItems(restaurantId);
  const { data: stockCounts = [], isLoading: loadingCounts, refetch } = useStockCounts(restaurantId);
  const createStockCount = useCreateStockCount();
  const submitStockCount = useSubmitStockCount();
  const cancelStockCount = useCancelStockCount();

  const [activeTab, setActiveTab] = useState("list");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);
  const [cancelCountId, setCancelCountId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [approveCountId, setApproveCountId] = useState<string | null>(null);
  const [approvalSummary, setApprovalSummary] = useState<{ positiveVariance: number; negativeVariance: number; itemsWithVariance: number } | null>(null);

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

  const handleCreateCount = async () => {
    if (!selectedBranch || !user?.id) {
      toast({ title: t("select_branch_required"), variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const data = await createStockCount.mutateAsync({
        restaurantId,
        branchId: selectedBranch,
        createdBy: user.id,
        notes: notes.trim() || undefined,
      });

      // Create lines for ALL active items in this branch (no partial counts)
      const branchItems = items.filter((item) => item.branchId === selectedBranch && item.isActive);
      
      if (branchItems.length === 0) {
        toast({ title: t("inv_no_items_in_branch"), variant: "destructive" });
        return;
      }

      const lines = branchItems.map((item) => ({
        stock_count_id: data.id,
        item_id: item.id,
        expected_base: item.onHandBase,
        actual_base: 0,
      }));

      const { error } = await supabase.from("stock_count_lines").insert(lines);
      if (error) throw error;

      toast({ title: t("inv_count_created") });
      
      // Find the created count for display
      await refetch();
      const createdCount: StockCount = {
        id: data.id,
        restaurantId: data.restaurant_id,
        branchId: data.branch_id,
        branchName: branches.find(b => b.id === selectedBranch)?.name || "",
        status: "DRAFT",
        createdBy: user.id,
        approvedBy: null,
        createdAt: data.created_at,
        approvedAt: null,
        notes: data.notes,
      };
      
      setSelectedCount(createdCount);
      setActiveTab("count");
      setSelectedBranch("");
      setNotes("");
    } catch (error: any) {
      toast({ title: error.message || t("inv_operation_failed"), variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmitCount = async (countId: string) => {
    try {
      await submitStockCount.mutateAsync({ stockCountId: countId });
      toast({ title: t("inv_count_submitted") });
      await refetch();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    }
  };

  const handlePrepareApproval = async (countId: string) => {
    // Fetch lines to calculate summary for confirmation dialog
    const { data: lines } = await supabase
      .from("stock_count_lines")
      .select("expected_base, actual_base")
      .eq("stock_count_id", countId);

    if (lines) {
      let positiveVariance = 0;
      let negativeVariance = 0;
      let itemsWithVariance = 0;

      lines.forEach((line: { expected_base: number; actual_base: number }) => {
        const variance = line.actual_base - line.expected_base;
        if (Math.abs(variance) > 0.01) {
          itemsWithVariance++;
          if (variance > 0) {
            positiveVariance += variance;
          } else {
            negativeVariance += Math.abs(variance);
          }
        }
      });

      setApprovalSummary({ positiveVariance, negativeVariance, itemsWithVariance });
    }
    
    setApproveCountId(countId);
  };

  const handleApproveCount = async () => {
    if (!approveCountId) return;

    setIsApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("stock-count-approve", {
        body: { stockCountId: approveCountId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");

      // Show success with detailed summary
      toast({ 
        title: t("inv_count_approved"),
        description: language === "ar" 
          ? `✓ تم إنشاء ${data.adjustmentsCreated} قيد تسوية\nصافي الفرق: ${data.netVariance > 0 ? "+" : ""}${data.netVariance.toFixed(2)}`
          : `✓ ${data.adjustmentsCreated} adjustment entries created\nNet variance: ${data.netVariance > 0 ? "+" : ""}${data.netVariance.toFixed(2)}`
      });
      
      await refetch();
      setActiveTab("list");
      setSelectedCount(null);
      setApproveCountId(null);
      setApprovalSummary(null);
    } catch (error: any) {
      toast({ title: error.message || t("inv_operation_failed"), variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancelCount = async () => {
    if (!cancelCountId || !user?.id) return;
    
    try {
      await cancelStockCount.mutateAsync({
        stockCountId: cancelCountId,
        userId: user.id,
        restaurantId,
        reason: cancelReason.trim() || undefined,
      });
      toast({ title: t("inv_count_cancelled") });
      await refetch();
      setCancelCountId(null);
      setCancelReason("");
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    }
  };

  const handleViewCount = (count: StockCount) => {
    setSelectedCount(count);
    setActiveTab("count");
  };

  const renderStatusBadge = (status: CountStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge variant={config.variant} className="text-xs flex items-center gap-1">
        {config.icon}
        {t(`inv_status_${status.toLowerCase()}`)}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-600" />
              {t("inv_stock_count")}
            </DialogTitle>
            <DialogDescription>{t("inv_stock_count_desc")}</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">{t("inv_count_list")}</TabsTrigger>
              <TabsTrigger value="new">{t("inv_new_count")}</TabsTrigger>
              <TabsTrigger value="count" disabled={!selectedCount}>{t("inv_count_items")}</TabsTrigger>
            </TabsList>

            {/* List Tab */}
            <TabsContent value="list" className="flex-1 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {loadingCounts ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : stockCounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
                    <span className="text-sm">{t("inv_no_counts")}</span>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setActiveTab("new")}
                    >
                      {t("inv_create_first_count")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stockCounts.map((count) => {
                      const isImmutable = count.status === "APPROVED" || count.status === "CANCELLED";
                      const isApproved = count.status === "APPROVED";
                      
                      return (
                        <div
                          key={count.id}
                          className={`p-4 rounded-lg border ${
                            isApproved 
                              ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                              : isImmutable 
                                ? "bg-muted/10" 
                                : "bg-muted/20"
                          } ${count.status === "CANCELLED" ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              {/* Header row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{count.branchName}</span>
                                {renderStatusBadge(count.status as CountStatus)}
                                {isImmutable && (
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              
                              {/* Date info */}
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <span>{t("created")}:</span>
                                  <span>{format(new Date(count.createdAt), "PPp", { locale: dateLocale })}</span>
                                </div>
                                
                                {/* Approved info for APPROVED counts */}
                                {isApproved && count.approvedAt && (
                                  <div className="flex items-center gap-1">
                                    <span>{t("inv_approved_at")}:</span>
                                    <span>{format(new Date(count.approvedAt), "PPp", { locale: dateLocale })}</span>
                                    {count.approvedByName && (
                                      <span className="text-foreground font-medium">({count.approvedByName})</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Variance summary for APPROVED counts */}
                              {isApproved && count.totalItems !== undefined && (
                                <div className="flex items-center gap-4 text-xs mt-2 p-2 bg-muted/30 rounded">
                                  <div className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    <span>{count.totalItems} {t("items")}</span>
                                  </div>
                                  {count.itemsWithVariance !== undefined && count.itemsWithVariance > 0 && (
                                    <>
                                      <div className="flex items-center gap-1 text-green-600">
                                        <TrendingUp className="h-3 w-3" />
                                        <span>+{count.totalPositiveVariance?.toFixed(1) || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-red-600">
                                        <TrendingDown className="h-3 w-3" />
                                        <span>-{count.totalNegativeVariance?.toFixed(1) || 0}</span>
                                      </div>
                                      <div className="text-muted-foreground">
                                        ({count.itemsWithVariance} {t("inv_with_variance")})
                                      </div>
                                    </>
                                  )}
                                  {count.itemsWithVariance === 0 && (
                                    <span className="text-green-600">{t("inv_no_variance")}</span>
                                  )}
                                </div>
                              )}
                              
                              {count.notes && (
                                <p className="text-xs text-muted-foreground italic">{count.notes}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* View button for APPROVED/CANCELLED (read-only) */}
                              {isImmutable && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewCount(count)}
                                >
                                  {t("view")}
                                </Button>
                              )}
                              
                              {/* DRAFT actions */}
                              {count.status === "DRAFT" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewCount(count)}
                                  >
                                    {t("inv_continue_count")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSubmitCount(count.id)}
                                    disabled={submitStockCount.isPending}
                                  >
                                    {t("inv_submit_count")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setCancelCountId(count.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* SUBMITTED actions */}
                              {count.status === "SUBMITTED" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewCount(count)}
                                  >
                                    {t("view")}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handlePrepareApproval(count.id)}
                                  >
                                    <Check className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                                    {t("inv_approve")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setCancelCountId(count.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* New Count Tab */}
            <TabsContent value="new" className="mt-4 space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {language === "ar" 
                    ? "⚠️ سيتم إنشاء جرد لجميع الأصناف في الفرع المحدد. لا يمكن إجراء جرد جزئي."
                    : "⚠️ A full count will be created for ALL items in the selected branch. Partial counts are not supported."}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>{t("branch")} *</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_branch_required")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {branches.filter((b) => b.is_active).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("inv_notes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("inv_count_notes_placeholder")}
                  rows={2}
                />
              </div>
              <Button onClick={handleCreateCount} disabled={!selectedBranch || isCreating} className="w-full">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("inv_create_count")}
              </Button>
            </TabsContent>

            {/* Count Items Tab */}
            <TabsContent value="count" className="flex-1 mt-4">
              {selectedCount && (
                <StockCountLinesList 
                  stockCountId={selectedCount.id} 
                  status={selectedCount.status as CountStatus}
                  onApprove={() => handlePrepareApproval(selectedCount.id)}
                  onSubmit={() => handleSubmitCount(selectedCount.id)}
                  onCancel={() => setCancelCountId(selectedCount.id)}
                />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog - Irreversible Warning */}
      <AlertDialog open={!!approveCountId} onOpenChange={() => { setApproveCountId(null); setApprovalSummary(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("inv_approve_count_title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-destructive font-medium">
                  {language === "ar"
                    ? "⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!"
                    : "⚠️ Warning: This action is irreversible!"}
                </p>
                <p>
                  {language === "ar"
                    ? "عند الاعتماد، سيتم إنشاء قيود تسوية للمخزون تلقائياً ولا يمكن تعديل الجرد بعدها."
                    : "Upon approval, inventory adjustment entries will be created automatically and the count cannot be modified afterwards."}
                </p>
                
                {approvalSummary && (
                  <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">{language === "ar" ? "ملخص الفروقات:" : "Variance Summary:"}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>{language === "ar" ? "زيادة:" : "Overage:"}</span>
                        <span className="font-mono text-green-600">+{approvalSummary.positiveVariance.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span>{language === "ar" ? "نقص:" : "Shortage:"}</span>
                        <span className="font-mono text-red-600">-{approvalSummary.negativeVariance.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === "ar" 
                        ? `${approvalSummary.itemsWithVariance} صنف بفروقات`
                        : `${approvalSummary.itemsWithVariance} items with variance`}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => { setApproveCountId(null); setApprovalSummary(null); }}
              disabled={isApproving}
            >
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApproveCount}
              disabled={isApproving}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                  {t("processing")}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("inv_confirm_approve")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelCountId} onOpenChange={() => setCancelCountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inv_cancel_count_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ar"
                ? "هل أنت متأكد من إلغاء هذا الجرد؟ لا يمكن التراجع عن هذا الإجراء. لن يتم إنشاء أي قيود تسوية."
                : "Are you sure you want to cancel this stock count? This action cannot be undone. No adjustment entries will be created."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>{t("inv_cancel_reason")}</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={language === "ar" ? "سبب الإلغاء (اختياري)" : "Reason for cancellation (optional)"}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelCountId(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelCount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("inv_confirm_cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface StockCountLinesListProps {
  stockCountId: string;
  status: CountStatus;
  onApprove: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function StockCountLinesList({ stockCountId, status, onApprove, onSubmit, onCancel }: StockCountLinesListProps) {
  const { t, language } = useLanguage();
  const { data: lines = [], isLoading } = useStockCountLines(stockCountId);
  const updateLine = useUpdateStockCountLine();

  const isImmutable = status === "APPROVED" || status === "CANCELLED";
  const canEdit = status === "DRAFT";

  // Calculate summary stats
  const summary = useMemo(() => {
    let totalItems = lines.length;
    let countedItems = lines.filter(l => l.actualBase > 0).length;
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

    return { totalItems, countedItems, positiveVariance, negativeVariance, itemsWithVariance };
  }, [lines]);

  const handleUpdateActual = async (lineId: string, value: string) => {
    if (isImmutable) return;
    
    const actualBase = parseFloat(value) || 0;
    try {
      await updateLine.mutateAsync({ lineId, actualBase, stockCountId });
    } catch (error: any) {
      console.error("Failed to update line:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-10 w-10 mb-3 opacity-40" />
        <span className="text-sm">{t("inv_no_items_to_count")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {isImmutable && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          status === "APPROVED" 
            ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" 
            : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        }`}>
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {status === "APPROVED" 
              ? (language === "ar" ? "تم اعتماد الجرد - لا يمكن التعديل" : "Count approved - Read only")
              : (language === "ar" ? "تم إلغاء الجرد - لا يمكن التعديل" : "Count cancelled - Read only")}
          </span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <p className="text-2xl font-bold">{summary.totalItems}</p>
          <p className="text-xs text-muted-foreground">{t("inv_total_items")}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <p className="text-2xl font-bold">{summary.countedItems}</p>
          <p className="text-xs text-muted-foreground">{t("inv_counted")}</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
            <TrendingUp className="h-4 w-4" />
            +{summary.positiveVariance.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">{t("inv_overage")}</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
            <TrendingDown className="h-4 w-4" />
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

      {/* Items List */}
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

                {/* Actual Qty Input */}
                <div className="col-span-2 text-center">
                  {canEdit ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.actualBase}
                      onChange={(e) => handleUpdateActual(line.id, e.target.value)}
                      className="w-full text-center h-8"
                    />
                  ) : (
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {line.actualBase.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Live Variance */}
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

      {/* Action Buttons */}
      {!isImmutable && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="destructive" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
            {t("inv_cancel_count")}
          </Button>
          {status === "DRAFT" && (
            <Button size="sm" onClick={onSubmit}>
              {t("inv_submit_count")}
            </Button>
          )}
          {status === "SUBMITTED" && (
            <Button size="sm" onClick={onApprove}>
              <Check className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("inv_approve")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
