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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSubtotal: number;
  currency: string;
  onApply: (type: "percent" | "fixed", value: number) => void;
  onClear: () => void;
  currentDiscountType?: string | null;
  currentDiscountValue?: number | null;
}

export function DiscountDialog({
  open,
  onOpenChange,
  currentSubtotal,
  currency,
  onApply,
  onClear,
  currentDiscountType,
  currentDiscountValue,
}: DiscountDialogProps) {
  const { t } = useLanguage();
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    (currentDiscountType as "percent" | "fixed") || "percent"
  );
  const [value, setValue] = useState("");

  const handleApply = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      // Validate percent is <= 100
      if (discountType === "percent" && numValue > 100) {
        return;
      }
      // Validate fixed is <= subtotal
      if (discountType === "fixed" && numValue > currentSubtotal) {
        return;
      }
      onApply(discountType, numValue);
      onOpenChange(false);
    }
  };

  const handleClear = () => {
    onClear();
    setValue("");
    onOpenChange(false);
  };

  const previewDiscount =
    discountType === "percent"
      ? (currentSubtotal * (parseFloat(value) || 0)) / 100
      : parseFloat(value) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("discount_dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("subtotal")}: {formatJOD(currentSubtotal)} {currency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={discountType}
            onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percent" id="percent" />
              <Label htmlFor="percent">{t("percentage")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed">{t("fixed_amount")} ({currency})</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="discountValue">
              {discountType === "percent" ? t("percentage") : t("amount")}
            </Label>
            <Input
              id="discountValue"
              type="number"
              step="0.001"
              min="0"
              max={discountType === "percent" ? 100 : currentSubtotal}
              placeholder={discountType === "percent" ? "10" : "5.00"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>

          {parseFloat(value) > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("discount_preview")}</p>
              <p className="text-lg font-bold text-green-600">
                -{formatJOD(previewDiscount)} {currency}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {(currentDiscountValue ?? 0) > 0 && (
            <Button variant="destructive" onClick={handleClear}>
              {t("clear_discount")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleApply} disabled={!value || parseFloat(value) <= 0}>
            {t("apply_discount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
