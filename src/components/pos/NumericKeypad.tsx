import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Delete, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface NumericKeypadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  initialValue?: string;
  allowDecimals?: boolean;
  minValue?: number;
  maxValue?: number;
  currency?: string;
  onConfirm: (value: number) => void;
  errorMessage?: string;
}

export function NumericKeypad({
  open,
  onOpenChange,
  title,
  initialValue = "",
  allowDecimals = false,
  minValue,
  maxValue,
  currency,
  onConfirm,
  errorMessage,
}: NumericKeypadProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  const handleDigit = (digit: string) => {
    if (digit === "." && !allowDecimals) return;
    if (digit === "." && value.includes(".")) return;
    
    // Limit decimal places to 2
    if (allowDecimals && value.includes(".")) {
      const parts = value.split(".");
      if (parts[1]?.length >= 2) return;
    }
    
    setValue((prev) => prev + digit);
    setError(null);
  };

  const handleBackspace = () => {
    setValue((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setValue("");
    setError(null);
  };

  const handleConfirm = () => {
    const numValue = parseFloat(value) || 0;
    
    if (!allowDecimals && !Number.isInteger(numValue)) {
      setError(t("keypad_whole_number"));
      return;
    }
    
    if (minValue !== undefined && numValue < minValue) {
      setError(`${t("keypad_min_value")} ${minValue}`);
      return;
    }
    
    if (maxValue !== undefined && numValue > maxValue) {
      setError(`${t("keypad_max_value")} ${maxValue}`);
      return;
    }

    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    
    onConfirm(numValue);
    onOpenChange(false);
  };

  const displayValue = value || "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px] p-4">
        <DialogHeader>
          <DialogTitle className="text-center">{title || t("keypad_enter_value")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Display */}
          <div className={cn(
            "p-4 rounded-lg bg-muted text-center border-2",
            error ? "border-destructive" : "border-transparent"
          )}>
            <p className="text-3xl font-bold font-mono">
              {displayValue}
              {currency && <span className="text-lg text-muted-foreground ml-2">{currency}</span>}
            </p>
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>

          {/* Keypad grid */}
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-14 text-xl font-semibold"
                onClick={() => handleDigit(digit)}
              >
                {digit}
              </Button>
            ))}
            
            {/* Bottom row */}
            {allowDecimals ? (
              <Button
                variant="outline"
                className="h-14 text-xl font-semibold"
                onClick={() => handleDigit(".")}
              >
                .
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-14"
                onClick={handleClear}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            
            <Button
              variant="outline"
              className="h-14 text-xl font-semibold"
              onClick={() => handleDigit("0")}
            >
              0
            </Button>
            
            <Button
              variant="outline"
              className="h-14"
              onClick={handleBackspace}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
          {allowDecimals && (
              <Button
                variant="outline"
                className="h-12"
                onClick={handleClear}
              >
                {t("keypad_clear")}
              </Button>
            )}
            <Button
              variant="outline"
              className={cn("h-12", !allowDecimals && "col-span-1")}
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className={cn("h-12", !allowDecimals && "col-span-1")}
              onClick={handleConfirm}
            >
              {t("confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
