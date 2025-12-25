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

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSubtotal: number;
  currency: string;
  onApply: (type: "percentage" | "fixed", value: number) => void;
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
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    (currentDiscountType as "percentage" | "fixed") || "percentage"
  );
  const [value, setValue] = useState(currentDiscountValue?.toString() || "");

  const handleApply = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      // Validate percentage is <= 100
      if (discountType === "percentage" && numValue > 100) {
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
    discountType === "percentage"
      ? (currentSubtotal * (parseFloat(value) || 0)) / 100
      : parseFloat(value) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Subtotal: {currentSubtotal.toFixed(2)} {currency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={discountType}
            onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentage" id="percentage" />
              <Label htmlFor="percentage">Percentage (%)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed">Fixed Amount ({currency})</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="discountValue">
              {discountType === "percentage" ? "Percentage" : "Amount"}
            </Label>
            <Input
              id="discountValue"
              type="number"
              step="0.01"
              min="0"
              max={discountType === "percentage" ? 100 : currentSubtotal}
              placeholder={discountType === "percentage" ? "10" : "5.00"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>

          {parseFloat(value) > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Discount Preview</p>
              <p className="text-lg font-bold text-green-600">
                -{previewDiscount.toFixed(2)} {currency}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {(currentDiscountValue ?? 0) > 0 && (
            <Button variant="destructive" onClick={handleClear}>
              Clear Discount
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!value || parseFloat(value) <= 0}>
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
