import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogBody,
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useInventoryItems } from "@/hooks/useInventoryItems";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2 } from "lucide-react";

interface WasteDialogProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WASTE_REASONS = [
  "inv_waste_expired",
  "inv_waste_spoiled",
  "inv_waste_damaged",
  "inv_waste_dropped",
  "inv_waste_other",
];

export function WasteDialog({ restaurantId, open, onOpenChange }: WasteDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: items = [] } = useInventoryItems(restaurantId);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchItems = items.filter((item) => item.branchId === selectedBranch && item.isActive);
  const selectedItemData = branchItems.find((item) => item.id === selectedItem);
  
  // Auto-fill unit from selected item
  const selectedUnit = selectedItemData?.baseUnitId || "";
  const selectedUnitName = selectedItemData?.baseUnitName || "";

  // Quantity validation
  const qtyValidation = useMemo(() => {
    if (!qty || qty.trim() === "") {
      return { isValid: false, showError: false };
    }
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return { isValid: false, showError: true };
    }
    return { isValid: true, showError: false };
  }, [qty]);

  const handleSubmit = async () => {
    if (!selectedBranch || !selectedItem || !qty || !reason) {
      toast({ title: t("inv_fill_required"), variant: "destructive" });
      return;
    }

    // Validate item has a unit configured
    if (!selectedUnit) {
      toast({ title: t("inv_item_no_unit"), variant: "destructive" });
      return;
    }

    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
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
          txnType: "WASTE",
          qty: qtyNum,
          unitId: selectedUnit,
          notes: `${t(reason)}${notes ? `: ${notes.trim()}` : ""}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");

      toast({ title: t("inv_waste_recorded") });
      onOpenChange(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = selectedBranch && selectedItem && qtyValidation.isValid && selectedUnit && reason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md min-h-[60vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            {t("inv_waste")}
          </DialogTitle>
          <DialogDescription>{t("inv_waste_desc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-4">
          {/* Branch */}
          <div className="space-y-2">
            <Label>{t("branch")} *</Label>
            <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setSelectedItem(""); setQty(""); }}>
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
            <Select value={selectedItem} onValueChange={(v) => { setSelectedItem(v); setQty(""); }} disabled={!selectedBranch}>
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
                min="0.01"
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                disabled={!selectedItem}
                className={qtyValidation.showError ? "border-destructive" : ""}
              />
              {qtyValidation.showError && (
                <p className="text-xs text-destructive">{t("inv_qty_must_be_positive")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("inv_unit")}</Label>
              <Input
                value={selectedUnitName}
                disabled
                readOnly
                className="bg-muted cursor-not-allowed"
                placeholder={selectedItem ? t("inv_item_no_unit") : t("inv_select_item_first")}
              />
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
                {WASTE_REASONS.map((r) => (
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
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting} variant="destructive">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t("inv_record_waste")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
