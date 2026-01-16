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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useComboItems, useAddComboItem, useUpdateComboItem, useDeleteComboItem } from "@/hooks/useComboItems";
import { MenuItem } from "@/hooks/useMenuItems";
import { Loader2, Plus, Trash2, Package } from "lucide-react";
import { formatJOD } from "@/lib/utils";

interface ComboItemsDialogProps {
  comboItem: MenuItem;
  allMenuItems: MenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

export function ComboItemsDialog({
  comboItem,
  allMenuItems,
  open,
  onOpenChange,
  currency = "JOD",
}: ComboItemsDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: comboItems = [], isLoading } = useComboItems(comboItem.id);
  const addComboItem = useAddComboItem();
  const updateComboItem = useUpdateComboItem();
  const deleteComboItem = useDeleteComboItem();

  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");

  // Filter out the combo itself and already added items
  const existingItemIds = new Set(comboItems.map((ci) => ci.menu_item_id));
  const availableItems = allMenuItems.filter(
    (item) => item.id !== comboItem.id && !existingItemIds.has(item.id) && item.item_type !== "combo"
  );

  const handleAdd = async () => {
    if (!selectedItemId || !quantity) {
      toast({ title: t("inv_fill_required"), variant: "destructive" });
      return;
    }
    const qty = parseInt(quantity, 10);
    if (qty < 1) {
      toast({ title: t("inv_qty_positive"), variant: "destructive" });
      return;
    }

    try {
      await addComboItem.mutateAsync({
        comboId: comboItem.id,
        menuItemId: selectedItemId,
        quantity: qty,
      });
      setSelectedItemId("");
      setQuantity("1");
      toast({ title: t("combo_item_added") });
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const handleUpdateQuantity = async (id: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateComboItem.mutateAsync({
        id,
        comboId: comboItem.id,
        quantity: newQty,
      });
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComboItem.mutateAsync({
        id,
        comboId: comboItem.id,
      });
      toast({ title: t("combo_item_removed") });
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("combo_items")}: {comboItem.name}
          </DialogTitle>
          <DialogDescription>{t("combo_items_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new item */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label>{t("menu_item")}</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select_item")} />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                  {availableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({currency} {formatJOD(item.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-20 space-y-2">
              <Label>{t("qty")}</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <Button onClick={handleAdd} disabled={addComboItem.isPending || !selectedItemId}>
              {addComboItem.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Current items list */}
          <div className="border rounded-lg divide-y">
            {isLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : comboItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {t("combo_no_items")}
              </div>
            ) : (
              comboItems.map((ci) => (
                <div key={ci.id} className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <p className="font-medium">{ci.menu_item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currency} {formatJOD(ci.menu_item_price || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={ci.quantity}
                      onChange={(e) => handleUpdateQuantity(ci.id, parseInt(e.target.value, 10) || 1)}
                      className="w-16 text-center"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ci.id)}
                      disabled={deleteComboItem.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
