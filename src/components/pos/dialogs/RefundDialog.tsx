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
import { formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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
      setError(`${t("amount")} > ${formatJOD(maxRefundable)} ${currency}`);
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
            {showConfirmation ? t("confirm_refund") : t("process_refund")}
          </DialogTitle>
          <DialogDescription>
            {t("order")} #{orderNumber} • {t("total_paid")}: {formatJOD(totalPaid)} {currency}
            {alreadyRefunded > 0 && (
              <span className="block text-destructive">
                {t("already_refunded")}: {formatJOD(alreadyRefunded)} {currency} • 
                {t("remaining")}: {formatJOD(maxRefundable)} {currency}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <>
            <div className="space-y-6 py-4">
              {/* Refund Type */}
              <div className="space-y-3">
                <Label className="text-base">{t("refund_type")}</Label>
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
                      <span className="text-lg font-semibold">{t("full_refund")}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatJOD(maxRefundable)} {currency}
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
                      <span className="text-lg font-semibold">{t("partial_refund")}</span>
                      <span className="text-sm text-muted-foreground">
                        {t("custom_amount")}
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Partial Amount Input */}
              {refundType === "partial" && (
                <div className="space-y-2">
                  <Label htmlFor="amount">{t("refund_amount")}</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.001"
                      min="0.001"
                      max={maxRefundable}
                      value={partialAmount}
                      onChange={(e) => handlePartialAmountChange(e.target.value)}
                      placeholder="0.000"
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
                  {t("reason")} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("void_reason_placeholder")}
                  className="min-h-[100px] resize-none"
                />
                {!hasReason && reason !== "" && (
                  <p className="text-sm text-destructive">{t("reason_required")}</p>
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
                {t("cancel")}
              </Button>
              <Button
                onClick={handleProceed}
                disabled={!canSubmit}
                className="h-12"
              >
                {t("review_refund")}
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
                  {t("about_to_refund")}
                </p>
                <p className="text-3xl font-bold text-destructive">
                  {formatJOD(refundAmount)} {currency}
                </p>
                <p className="text-muted-foreground">
                  {refundType === "full" ? t("full_refund") : t("partial_refund")} {t("refund_for_order")} #{orderNumber}
                </p>
                <div className="bg-muted rounded-lg p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-1">{t("reason")}:</p>
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
                {t("back")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="h-12"
              >
                {isProcessing ? t("processing") : t("confirm_refund")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
