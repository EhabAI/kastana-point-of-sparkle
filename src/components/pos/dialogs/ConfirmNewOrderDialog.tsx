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
import { Pause } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfirmNewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmHoldAndNew: () => void;
}

export function ConfirmNewOrderDialog({
  open,
  onOpenChange,
  onConfirmHoldAndNew,
}: ConfirmNewOrderDialogProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("active_order_exists")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("open_order_exists")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmHoldAndNew}>
            <Pause className="h-4 w-4 mr-2" />
            {t("hold_current_start_new")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
