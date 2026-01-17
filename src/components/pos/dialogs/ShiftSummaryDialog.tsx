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
    closingCash: number;
    expectedCash: number;
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

          {/* Cash Summary Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("expected_cash") || "النقد المتوقع"}</p>
              <p className="text-lg font-bold">
                {formatJOD(shiftData.expectedCash)} {currency}
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("closing_cash") || "النقد الفعلي"}</p>
              <p className="text-lg font-bold">
                {formatJOD(shiftData.closingCash)} {currency}
              </p>
            </div>
          </div>

          {/* Cash Difference */}
          {(() => {
            const difference = shiftData.closingCash - shiftData.expectedCash;
            const isOver = difference > 0;
            const isShort = difference < 0;
            
            return (
              <div className={`p-3 rounded-lg border-2 ${
                isOver ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 
                isShort ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' : 
                'bg-muted border-muted'
              }`}>
                <p className="text-sm text-muted-foreground">{t("shift_cash_difference") || "فرق النقد"}</p>
                <div className="flex items-center justify-between">
                  <p className={`text-lg font-bold ${
                    isOver ? 'text-green-600 dark:text-green-400' : 
                    isShort ? 'text-red-600 dark:text-red-400' : 
                    'text-foreground'
                  }`}>
                    {isOver ? '+' : ''}{formatJOD(difference)} {currency}
                  </p>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    isOver ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 
                    isShort ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isOver ? (t("shift_cash_over") || "زيادة نقدية") : 
                     isShort ? (t("shift_cash_short") || "نقص نقدي") : 
                     (t("shift_cash_match") || "متطابق")}
                  </span>
                </div>
              </div>
            );
          })()}

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
