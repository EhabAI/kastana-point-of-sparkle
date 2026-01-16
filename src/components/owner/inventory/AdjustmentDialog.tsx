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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useInventoryItems, useInventoryUnits } from "@/hooks/useInventoryItems";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";

interface AdjustmentDialogProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADJUSTMENT_REASONS = [
  "inv_reason_correction",
  "inv_reason_found",
  "inv_reason_damaged",
  "inv_reason_expired",
  "inv_reason_other",
];

export function AdjustmentDialog({ restaurantId, open, onOpenChange }: AdjustmentDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: items = [] } = useInventoryItems(restaurantId);
  const { data: units = [] } = useInventoryUnits(restaurantId);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"in" | "out">("in");
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchItems = items.filter((item) => item.branchId === selectedBranch && item.isActive);
  const selectedItemData = branchItems.find((item) => item.id === selectedItem);

  const handleSubmit = async () => {
    if (!selectedBranch || !selectedItem || !qty || !selectedUnit || !reason) {
      toast({ title: t("inv_fill_required"), variant: "destructive" });
      return;
    }

    const qtyNum = parseFloat(qty);
    if (qtyNum <= 0) {
      toast({ title: t("inv_qty_positive"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("inventory-create-transaction", {
        body: {
          restaurantId,
          branchId: selectedBranch,
          itemId: selectedItem,
          txnType: adjustmentType === "in" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          qty: adjustmentType === "in" ? qtyNum : -qtyNum,
          unitId: selectedUnit,
          notes: `${t(reason)}${notes ? `: ${notes.trim()}` : ""}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");

      toast({ title: t("inv_adjustment_created") });
      onOpenChange(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = selectedBranch && selectedItem && parseFloat(qty) > 0 && selectedUnit && reason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-blue-600" />
            {t("inv_adjustment")}
          </DialogTitle>
          <DialogDescription>{t("inv_adjustment_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>{t("inv_adjustment_type")} *</Label>
            <RadioGroup
              value={adjustmentType}
              onValueChange={(v: "in" | "out") => setAdjustmentType(v)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 flex-1">
                <RadioGroupItem value="in" id="adj-in" />
                <Label htmlFor="adj-in" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  {t("inv_increase")}
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 flex-1">
                <RadioGroupItem value="out" id="adj-out" />
                <Label htmlFor="adj-out" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  {t("inv_decrease")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label>{t("branch")} *</Label>
            <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedItem(""); }}>
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

          {/* Item */}
          <div className="space-y-2">
            <Label>{t("inv_item")} *</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem} disabled={!selectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder={t("inv_select_item")} />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {branchItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.onHandBase} {item.baseUnitName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Qty & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("inv_qty")} *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("inv_unit")} *</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger>
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
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t("reason")} *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("inv_select_reason")} />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t("inv_submit_adjustment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
