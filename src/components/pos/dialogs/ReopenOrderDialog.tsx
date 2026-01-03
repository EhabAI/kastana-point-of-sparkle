import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReopenOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ReopenOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
  isLoading,
}: ReopenOrderDialogProps) {
  const { t } = useLanguage();

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {t("reopen_order_title")}
          </DialogTitle>
          <DialogDescription>
            {t("reopen_order")} #{orderNumber} {t("reopen_for_correction")}
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">{t("order_will_be_reopened")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("reopening_allows")}
            </p>
            <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
              <li>{t("edit_items_quantities")}</li>
              <li>{t("apply_modify_discounts")}</li>
              <li>{t("process_additional_payments")}</li>
              <li>{t("close_order_again")}</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12"
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="h-12"
          >
            {isLoading ? t("reopening") : t("reopen_order")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
