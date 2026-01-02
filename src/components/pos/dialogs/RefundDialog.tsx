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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Undo2 } from "lucide-react";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  totalPaid: number;
  alreadyRefunded?: number;
  currency: string;
  onConfirm: (data: {
    refundType: "full" | "partial";
    amount: number;
    reason: string;
  }) => Promise<void>;
  isProcessing?: boolean;
}

export function RefundDialog({
  open,
  onOpenChange,
  orderNumber,
  totalPaid,
  alreadyRefunded = 0,
  currency,
  onConfirm,
  isProcessing = false,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxRefundable = totalPaid - alreadyRefunded;
  const refundAmount = refundType === "full" ? maxRefundable : parseFloat(partialAmount) || 0;
  const isValidAmount = refundAmount > 0 && refundAmount <= maxRefundable;
  const hasReason = reason.trim().length > 0;
  const canSubmit = isValidAmount && hasReason && !isProcessing && maxRefundable > 0;

  const handleRefundTypeChange = (value: string) => {
    setRefundType(value as "full" | "partial");
    setPartialAmount("");
    setError(null);
  };

  const handlePartialAmountChange = (value: string) => {
    setPartialAmount(value);
    const num = parseFloat(value);
    if (num > maxRefundable) {
      setError(`Amount cannot exceed ${maxRefundable.toFixed(2)} ${currency}`);
    } else {
      setError(null);
    }
  };

  const handleProceed = () => {
    if (!canSubmit) return;
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm({
      refundType,
      amount: refundAmount,
      reason: reason.trim(),
    });
    handleClose();
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  const handleClose = () => {
    setRefundType("full");
    setPartialAmount("");
    setReason("");
    setShowConfirmation(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            {showConfirmation ? "Confirm Refund" : "Process Refund"}
          </DialogTitle>
          <DialogDescription>
            Order #{orderNumber} • Total Paid: {totalPaid.toFixed(2)} {currency}
            {alreadyRefunded > 0 && (
              <span className="block text-destructive">
                Already Refunded: {alreadyRefunded.toFixed(2)} {currency} • 
                Remaining: {maxRefundable.toFixed(2)} {currency}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <>
            <div className="space-y-6 py-4">
              {/* Refund Type */}
              <div className="space-y-3">
                <Label className="text-base">Refund Type</Label>
                <RadioGroup
                  value={refundType}
                  onValueChange={handleRefundTypeChange}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem
                      value="full"
                      id="full"
                      className="peer sr-only"
                      disabled={maxRefundable <= 0}
                    />
                    <Label
                      htmlFor="full"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-20"
                    >
                      <span className="text-lg font-semibold">Full Refund</span>
                      <span className="text-sm text-muted-foreground">
                        {maxRefundable.toFixed(2)} {currency}
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="partial"
                      id="partial"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="partial"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-20"
                    >
                      <span className="text-lg font-semibold">Partial</span>
                      <span className="text-sm text-muted-foreground">
                        Custom amount
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Partial Amount Input */}
              {refundType === "partial" && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Refund Amount</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxRefundable}
                      value={partialAmount}
                      onChange={(e) => handlePartialAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="text-lg h-12 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currency}
                    </span>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter the reason for this refund..."
                  className="min-h-[100px] resize-none"
                />
                {!hasReason && reason !== "" && (
                  <p className="text-sm text-destructive">Reason is required</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-12"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceed}
                disabled={!canSubmit}
                className="h-12"
              >
                Review Refund
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Confirmation Step */}
            <div className="py-6">
              <div className="flex items-center justify-center mb-6">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-lg font-medium">
                  You are about to refund
                </p>
                <p className="text-3xl font-bold text-destructive">
                  {refundAmount.toFixed(2)} {currency}
                </p>
                <p className="text-muted-foreground">
                  {refundType === "full" ? "Full refund" : "Partial refund"} for Order #{orderNumber}
                </p>
                <div className="bg-muted rounded-lg p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-1">Reason:</p>
                  <p className="text-sm">{reason}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-12"
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="h-12"
              >
                {isProcessing ? "Processing..." : "Confirm Refund"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
