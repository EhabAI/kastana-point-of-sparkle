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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useInventoryItems, useInventoryUnits } from "@/hooks/useInventoryItems";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, ArrowLeftRight } from "lucide-react";

interface TransferDialogProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LineItem {
  id: string;
  itemId: string;
  qty: string;
  unitId: string;
}

export function TransferDialog({ restaurantId, open, onOpenChange }: TransferDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: items = [] } = useInventoryItems(restaurantId);
  const { data: units = [] } = useInventoryUnits(restaurantId);

  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ id: "1", itemId: "", qty: "", unitId: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromBranchItems = items.filter((item) => item.branchId === fromBranch && item.isActive);
  const activeBranches = branches.filter((b) => b.is_active);

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), itemId: "", qty: "", unitId: "" }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof LineItem, value: string) => {
    setLines(lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  };

  const handleSubmit = async () => {
    if (!fromBranch || !toBranch) {
      toast({ title: t("inv_select_branches"), variant: "destructive" });
      return;
    }

    if (fromBranch === toBranch) {
      toast({ title: t("inv_different_branches"), variant: "destructive" });
      return;
    }

    const validLines = lines.filter((line) => line.itemId && parseFloat(line.qty) > 0 && line.unitId);
    if (validLines.length === 0) {
      toast({ title: t("inv_add_items"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("inventory-transfer", {
        body: {
          restaurantId,
          fromBranchId: fromBranch,
          toBranchId: toBranch,
          notes: notes.trim() || null,
          lines: validLines.map((line) => ({
            itemId: line.itemId,
            qty: parseFloat(line.qty),
            unitId: line.unitId,
          })),
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");

      toast({ title: t("inv_transfer_complete") });
      onOpenChange(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = fromBranch && toBranch && fromBranch !== toBranch && 
    lines.some((line) => line.itemId && parseFloat(line.qty) > 0 && line.unitId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-purple-600" />
            {t("inv_transfer")}
          </DialogTitle>
          <DialogDescription>{t("inv_transfer_desc")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {/* Branches */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("inv_from_branch")} *</Label>
                <Select value={fromBranch} onValueChange={(v) => { setFromBranch(v); setLines([{ id: "1", itemId: "", qty: "", unitId: "" }]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_branch_required")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {activeBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id} disabled={branch.id === toBranch}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("inv_to_branch")} *</Label>
                <Select value={toBranch} onValueChange={setToBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_branch_required")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {activeBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id} disabled={branch.id === fromBranch}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("items")} *</Label>
                <Button size="sm" variant="outline" onClick={addLine} disabled={!fromBranch}>
                  <Plus className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                  {t("inv_add_line")}
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div key={line.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
                    <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                    <Select
                      value={line.itemId}
                      onValueChange={(v) => updateLine(line.id, "itemId", v)}
                      disabled={!fromBranch}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t("inv_select_item")} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {fromBranchItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.onHandBase} {item.baseUnitName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t("inv_qty")}
                      value={line.qty}
                      onChange={(e) => updateLine(line.id, "qty", e.target.value)}
                      className="w-24"
                    />
                    <Select
                      value={line.unitId}
                      onValueChange={(v) => updateLine(line.id, "unitId", v)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder={t("inv_unit")} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t("inv_notes")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("inv_notes_placeholder")}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t("inv_submit_transfer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
