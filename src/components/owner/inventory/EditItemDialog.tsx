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
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUpdateInventoryItem, InventoryItem } from "@/hooks/useInventoryItems";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EditItemDialogProps {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditItemDialog({ item, open, onOpenChange }: EditItemDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const updateItem = useUpdateInventoryItem();

  const [name, setName] = useState(item.name);
  const [minLevel, setMinLevel] = useState(item.minLevel.toString());
  const [reorderPoint, setReorderPoint] = useState(item.reorderPoint.toString());
  const [isActive, setIsActive] = useState(item.isActive);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("inv_name_required"), variant: "destructive" });
      return;
    }

    const minLevelNum = parseFloat(minLevel) || 0;
    const reorderPointNum = parseFloat(reorderPoint) || 0;

    if (minLevelNum < 0 || reorderPointNum < 0) {
      toast({ title: t("inv_invalid_values"), variant: "destructive" });
      return;
    }

    try {
      await updateItem.mutateAsync({
        id: item.id,
        name: name.trim(),
        minLevel: minLevelNum,
        reorderPoint: reorderPointNum,
        isActive,
      });

      toast({ title: t("inv_item_updated") });
      onOpenChange(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inv_edit_item")}</DialogTitle>
          <DialogDescription>{t("inv_edit_item_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">{t("inv_item_name")}</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("inv_item_name_placeholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-level">{t("inv_min_level")}</Label>
              <Input
                id="min-level"
                type="number"
                min="0"
                step="0.01"
                value={minLevel}
                onChange={(e) => setMinLevel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder-point">{t("inv_reorder_point")}</Label>
              <Input
                id="reorder-point"
                type="number"
                min="0"
                step="0.01"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <Label htmlFor="is-active" className="cursor-pointer">
                {t("inv_item_active")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("inv_item_active_desc")}</p>
            </div>
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("branch")}</span>
              <span className="font-medium">{item.branchName}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">{t("inv_base_unit")}</span>
              <span className="font-medium">{item.baseUnitName}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={updateItem.isPending}>
            {updateItem.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
