import { useState } from "react";
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
} from "@/hooks/useInventoryOperations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Loader2, ClipboardList, Plus, Check, AlertTriangle, Package } from "lucide-react";

interface StockCountDialogProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isManager?: boolean;
}

export function StockCountDialog({ restaurantId, open, onOpenChange, isManager = false }: StockCountDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: items = [] } = useInventoryItems(restaurantId);
  const { data: stockCounts = [], isLoading: loadingCounts } = useStockCounts(restaurantId);
  const createStockCount = useCreateStockCount();
  const submitStockCount = useSubmitStockCount();

  const [activeTab, setActiveTab] = useState("list");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCount, setSelectedCount] = useState<string | null>(null);

  const dateLocale = language === "ar" ? ar : enUS;
  const canApprove = role === "owner";

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

      // Create lines for all active items in this branch
      const branchItems = items.filter((item) => item.branchId === selectedBranch && item.isActive);
      
      if (branchItems.length > 0) {
        const lines = branchItems.map((item) => ({
          stock_count_id: data.id,
          item_id: item.id,
          expected_base: item.onHandBase,
          actual_base: 0,
        }));

        const { error } = await supabase.from("stock_count_lines").insert(lines);
        if (error) throw error;
      }

      toast({ title: t("inv_count_created") });
      setSelectedCount(data.id);
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
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    }
  };

  const handleApproveCount = async (countId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("stock-count-approve", {
        body: { stockCountId: countId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");

      toast({ title: t("inv_count_approved") });
    } catch (error: any) {
      toast({ title: error.message || t("inv_operation_failed"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
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
                </div>
              ) : (
                <div className="space-y-2">
                  {stockCounts.map((count) => (
                    <div
                      key={count.id}
                      className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{count.branchName}</span>
                          <Badge
                            variant={
                              count.status === "APPROVED"
                                ? "default"
                                : count.status === "SUBMITTED"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {t(`inv_status_${count.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(count.createdAt), "PPp", { locale: dateLocale })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {count.status === "DRAFT" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCount(count.id);
                                setActiveTab("count");
                              }}
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
                          </>
                        )}
                        {count.status === "SUBMITTED" && canApprove && (
                          <Button size="sm" onClick={() => handleApproveCount(count.id)}>
                            <Check className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                            {t("inv_approve")}
                          </Button>
                        )}
                        {count.status === "SUBMITTED" && !canApprove && (
                          <span className="text-xs text-muted-foreground">{t("inv_awaiting_approval")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* New Count Tab */}
          <TabsContent value="new" className="mt-4 space-y-4">
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
            {selectedCount && <StockCountLinesList stockCountId={selectedCount} />}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockCountLinesList({ stockCountId }: { stockCountId: string }) {
  const { t } = useLanguage();
  const { data: lines = [], isLoading } = useStockCountLines(stockCountId);
  const updateLine = useUpdateStockCountLine();

  const handleUpdateActual = async (lineId: string, value: string) => {
    const actualBase = parseFloat(value) || 0;
    try {
      await updateLine.mutateAsync({ lineId, actualBase });
    } catch (error) {
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
    <ScrollArea className="h-[350px] pr-4">
      <div className="space-y-2">
        {lines.map((line) => {
          const variance = line.actualBase - line.expectedBase;
          const hasVariance = Math.abs(variance) > 0.01;

          return (
            <div
              key={line.id}
              className={`p-3 rounded-lg border ${hasVariance ? "bg-warning/5 border-warning/30" : "bg-muted/20"}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {hasVariance && <AlertTriangle className="h-4 w-4 text-warning" />}
                    <span className="font-medium">{line.itemName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("inv_expected")}: {line.expectedBase} {line.unitName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.actualBase}
                    onChange={(e) => handleUpdateActual(line.id, e.target.value)}
                    className="w-24 text-center"
                  />
                  <span className="text-sm text-muted-foreground w-16">{line.unitName}</span>
                </div>
              </div>
              {hasVariance && (
                <div className="mt-2 text-xs">
                  <span className={variance > 0 ? "text-green-600" : "text-red-600"}>
                    {t("inv_variance")}: {variance > 0 ? "+" : ""}{variance.toFixed(2)} {line.unitName}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
