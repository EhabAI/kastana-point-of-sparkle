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
import { AlertTriangle, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import type { DeductionWarning } from "@/hooks/pos/useInventoryDeduction";

interface InventoryWarningsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warnings: DeductionWarning[];
  onViewInventory?: () => void;
}

export function InventoryWarningsDialog({
  open,
  onOpenChange,
  warnings,
  onViewInventory,
}: InventoryWarningsDialogProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            {t("inventory_warning_title")}
          </DialogTitle>
          <DialogDescription>
            {t("inventory_warning_desc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64">
          <div className="space-y-2 px-1">
            {warnings.slice(0, 10).map((warning) => (
              <div
                key={warning.inventory_item_id}
                className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{warning.name}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Badge variant="destructive" className="text-xs">
                    {formatJOD(warning.new_on_hand)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {t("was")}: {formatJOD(warning.current_on_hand)} → -{formatJOD(warning.required)}
                  </span>
                </div>
              </div>
            ))}
            {warnings.length > 10 && (
              <div className="text-center text-xs text-muted-foreground py-2">
                +{warnings.length - 10} {t("more_items")}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
          {onViewInventory && (
            <Button onClick={onViewInventory}>
              {t("view_inventory")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
