import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle } from "lucide-react";

interface ShiftCloseWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openOrdersCount: number;
  heldOrdersCount: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ShiftCloseWarningDialog({
  open,
  onOpenChange,
  openOrdersCount,
  heldOrdersCount,
  onConfirm,
  isLoading,
}: ShiftCloseWarningDialogProps) {
  const { t } = useLanguage();
  
  const totalOrders = openOrdersCount + heldOrdersCount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("shift_close_warning_title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{t("shift_close_warning_message")}</p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                {t("open_orders_count")}: {openOrdersCount}
              </p>
              {heldOrdersCount > 0 && (
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  {t("held_orders_count")}: {heldOrdersCount}
                </p>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {t("shift_close_warning_note")}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? t("closing") : t("close_shift_anyway")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
