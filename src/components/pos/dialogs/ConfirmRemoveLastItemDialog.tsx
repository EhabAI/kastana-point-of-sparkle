import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfirmRemoveLastItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmRemoveLastItemDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isLoading,
}: ConfirmRemoveLastItemDialogProps) {
  const { t } = useLanguage();

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("remove_last_item")}
          </DialogTitle>
          <DialogDescription>
            {t("remove_last_item_desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">{t("order_will_be_empty")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              "<strong>{itemName}</strong>" {t("removing_last_item_warning")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12"
            disabled={isLoading}
          >
            {t("keep_item")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="h-12"
          >
            {isLoading ? t("removing") : t("remove_item")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
