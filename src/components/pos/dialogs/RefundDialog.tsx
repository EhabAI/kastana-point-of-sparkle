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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Undo2 } from "lucide-react";
import { formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type RefundReason = "customer_request" | "order_mistake" | "system_error" | "other";

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
  const [selectedReason, setSelectedReason] = useState<RefundReason | "">("");
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const maxRefundable = totalPaid - alreadyRefunded;
  const refundAmount = maxRefundable; // Full refund only in Phase 1
  const hasReason = selectedReason !== "";
  const canSubmit = refundAmount > 0 && hasReason && !isProcessing && maxRefundable > 0;

  const refundReasons: { value: RefundReason; label: string }[] = [
    { value: "customer_request", label: t("refund_reason_customer_request") },
    { value: "order_mistake", label: t("refund_reason_order_mistake") },
    { value: "system_error", label: t("refund_reason_system_error") },
    { value: "other", label: t("refund_reason_other") },
  ];

  const getReasonLabel = (value: RefundReason | "") => {
    if (!value) return "";
    const found = refundReasons.find(r => r.value === value);
    return found?.label || value;
  };

  const handleProceed = () => {
    if (!canSubmit) return;
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    const reasonText = notes.trim() 
      ? `${getReasonLabel(selectedReason)}: ${notes.trim()}`
      : getReasonLabel(selectedReason);
    await onConfirm({
      refundType: "full",
      amount: refundAmount,
      reason: reasonText,
    });
    handleClose();
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  const handleClose = () => {
    setSelectedReason("");
    setNotes("");
    setShowConfirmation(false);
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
              {/* Full Refund Amount Display */}
              <div className="space-y-3">
                <Label className="text-base">{t("full_refund")}</Label>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-primary bg-popover p-4 h-20">
                  <span className="text-lg font-semibold">{t("refund_amount")}</span>
                  <span className="text-2xl font-bold text-destructive">
                    {formatJOD(maxRefundable)} {currency}
                  </span>
                </div>
              </div>

              {/* Reason Dropdown */}
              <div className="space-y-2">
                <Label>
                  {t("reason")} <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={selectedReason} 
                  onValueChange={(value) => setSelectedReason(value as RefundReason)}
                >
                  <SelectTrigger className="h-12 bg-background">
                    <SelectValue placeholder={t("select_refund_reason")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {refundReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  {t("notes")} ({t("optional")})
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("refund_notes_placeholder")}
                  className="min-h-[80px] resize-none"
                />
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
                  {t("full_refund")} {t("refund_for_order")} #{orderNumber}
                </p>
                <div className="bg-muted rounded-lg p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-1">{t("reason")}:</p>
                  <p className="text-sm font-medium">{getReasonLabel(selectedReason)}</p>
                  {notes.trim() && (
                    <p className="text-sm text-muted-foreground mt-1">{notes.trim()}</p>
                  )}
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
