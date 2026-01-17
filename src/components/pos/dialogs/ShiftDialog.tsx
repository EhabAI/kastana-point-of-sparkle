import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "open" | "close";
  onConfirm: (amount: number) => void;
  isLoading?: boolean;
  expectedCash?: number;
  currency?: string;
}

export function ShiftDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
  isLoading,
  expectedCash,
  currency = "JOD",
}: ShiftDialogProps) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [shiftTime, setShiftTime] = useState<Date>(new Date());

  useEffect(() => {
    if (open && mode === "open") {
      setShiftTime(new Date());
    }
  }, [open, mode]);

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount >= 0) {
      onConfirm(numAmount);
      setAmount("");
    }
  };

  const title = mode === "open" ? t("open_shift") : t("close_shift");
  const description =
    mode === "open"
      ? t("enter_opening_cash")
      : t("enter_closing_cash");
  const label = mode === "open" ? `${t("opening_cash")} (${currency})` : `${t("closing_cash")} (${currency})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "open" && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("shift_start_time")}</p>
              <p className="text-lg font-bold">{format(shiftTime, "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          )}

          {mode === "close" && expectedCash !== undefined && (
            <>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t("expected_cash")}</p>
                <p className="text-lg font-bold">{formatJOD(expectedCash)} {currency}</p>
              </div>

              {/* Cash Difference - Live calculated */}
              {amount && (() => {
                const actualCash = parseFloat(amount) || 0;
                const difference = actualCash - expectedCash;
                const isOver = difference > 0;
                const isShort = difference < 0;
                const isMatch = difference === 0;
                
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
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">{label}</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="h-12 text-lg"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12">
            {t("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !amount} className="h-12 min-w-[140px]">
            {isLoading ? t("processing") : `${t("confirm")} ${title}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
