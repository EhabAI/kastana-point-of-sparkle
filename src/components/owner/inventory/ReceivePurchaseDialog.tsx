import { useState } from "react";
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
import { useSuppliers, useCreateSupplier } from "@/hooks/useInventoryOperations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";
import { Loader2, Plus, Trash2, ShoppingCart } from "lucide-react";

interface ReceivePurchaseDialogProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LineItem {
  id: string;
  itemId: string;
  qty: string;
  unitCost: string;
}

export function ReceivePurchaseDialog({ restaurantId, open, onOpenChange }: ReceivePurchaseDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: suppliers = [] } = useSuppliers(restaurantId);
  const createSupplier = useCreateSupplier();

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [receiptNo, setReceiptNo] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ id: "1", itemId: "", qty: "", unitCost: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: items = [] } = useInventoryItems(restaurantId);
  const branchItems = items.filter((item) => item.branchId === selectedBranch && item.isActive);

  // Helper to get item's unit info
  const getItemUnit = (itemId: string) => {
    const item = branchItems.find((i) => i.id === itemId);
    return { unitId: item?.baseUnitId || "", unitName: item?.baseUnitName || "" };
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), itemId: "", qty: "", unitCost: "" }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof LineItem, value: string) => {
    setLines(lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const data = await createSupplier.mutateAsync({
        restaurantId,
        name: newSupplierName.trim(),
      });
      setSelectedSupplier(data.id);
      setNewSupplierName("");
      setShowAddSupplier(false);
      toast({ title: t("inv_supplier_created") });
    } catch (error: unknown) {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!selectedBranch) {
      toast({ title: t("select_branch_required"), variant: "destructive" });
      return;
    }

    // Validate lines and check each item has a unit
    const validLines = lines.filter((line) => {
      if (!line.itemId || !(parseFloat(line.qty) > 0)) return false;
      const { unitId } = getItemUnit(line.itemId);
      if (!unitId) {
        toast({ title: t("inv_item_no_unit"), variant: "destructive" });
        return false;
      }
      return true;
    });
    
    if (validLines.length === 0) {
      toast({ title: t("inv_add_items"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-receipt-post", {
        body: {
          restaurantId,
          branchId: selectedBranch,
          supplierId: selectedSupplier || null,
          receiptNo: receiptNo.trim() || `RCV-${Date.now()}`,
          notes: notes.trim() || null,
          lines: validLines.map((line) => ({
            itemId: line.itemId,
            qty: parseFloat(line.qty),
            unitId: getItemUnit(line.itemId).unitId,
            unitCost: line.unitCost ? parseFloat(line.unitCost) : null,
          })),
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");

      toast({ title: t("inv_purchase_received") });
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = selectedBranch && lines.some((line) => {
    if (!line.itemId || !(parseFloat(line.qty) > 0)) return false;
    const { unitId } = getItemUnit(line.itemId);
    return !!unitId;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl min-h-[60vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            {t("inv_receive_purchase")}
          </DialogTitle>
          <DialogDescription>{t("inv_receive_purchase_desc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-4">
          {/* Branch & Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("branch")} *</Label>
              <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setLines([{ id: "1", itemId: "", qty: "", unitCost: "" }]); }}>
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
              <Label>{t("inv_supplier")}</Label>
              {showAddSupplier ? (
                <div className="flex gap-2">
                  <Input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder={t("inv_supplier_name")}
                  />
                  <Button size="sm" onClick={handleAddSupplier} disabled={!newSupplierName.trim()}>
                    {t("add")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddSupplier(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("inv_select_supplier")} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={() => setShowAddSupplier(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Number */}
          <div className="space-y-2">
            <Label>{t("inv_receipt_no")}</Label>
            <Input
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              placeholder={t("inv_receipt_no_placeholder")}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("items")} *</Label>
              <Button size="sm" variant="outline" onClick={addLine} disabled={!selectedBranch}>
                <Plus className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("inv_add_line")}
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const { unitName } = getItemUnit(line.itemId);
                return (
                  <div key={line.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
                    <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                    <Select
                      value={line.itemId}
                      onValueChange={(v) => updateLine(line.id, "itemId", v)}
                      disabled={!selectedBranch}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t("inv_select_item")} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {branchItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
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
                      className="w-20"
                      disabled={!line.itemId}
                    />
                    <Input
                      value={unitName}
                      disabled
                      readOnly
                      className="w-24 bg-muted cursor-not-allowed"
                      placeholder={line.itemId ? t("inv_item_no_unit") : t("inv_unit")}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder={t("inv_unit_cost")}
                      value={line.unitCost}
                      onChange={(e) => updateLine(line.id, "unitCost", e.target.value)}
                      className="w-24"
                      title={t("inv_unit_cost_helper")}
                    />
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
                );
              })}
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
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t("inv_submit_receive")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
