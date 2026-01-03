import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShiftSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftData: {
    openingCash: number;
    openedAt: string;
    closedAt: string;
    orderCount: number;
  } | null;
  currency: string;
}

export function ShiftSummaryDialog({
  open,
  onOpenChange,
  shiftData,
  currency,
}: ShiftSummaryDialogProps) {
  const { t } = useLanguage();

  if (!shiftData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shift_closed_title")}</DialogTitle>
          <DialogDescription>
            {t("shift_closed_success")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("opening_cash")}</p>
              <p className="text-lg font-bold">
                {formatJOD(shiftData.openingCash)} {currency}
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("orders")}</p>
              <p className="text-lg font-bold">{shiftData.orderCount}</p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{t("shift_opened_at")}</p>
            <p className="font-medium">
              {format(new Date(shiftData.openedAt), "PPp")}
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{t("shift_closed_at")}</p>
            <p className="font-medium">
              {format(new Date(shiftData.closedAt), "PPp")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            {t("done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
