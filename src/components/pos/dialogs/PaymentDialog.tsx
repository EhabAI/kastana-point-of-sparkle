import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, CreditCard, Wallet, Receipt, Smartphone, Plus, Minus, X, Hash } from "lucide-react";
import { cn, formatJOD } from "@/lib/utils";
import type { PaymentMethodConfig } from "@/hooks/pos/useCashierPaymentMethods";
import { NumericKeypad } from "../NumericKeypad";
import { useLanguage } from "@/contexts/LanguageContext";

type PaymentMethodId = string;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  currency: string;
  onConfirm: (payments: { method: string; amount: number }[]) => Promise<void>;
  isLoading?: boolean;
  paymentMethods?: PaymentMethodConfig[];
  /** Order status - payment blocked if not 'open' */
  orderStatus?: string;
}

// Icons for DB-allowed payment methods only
const methodIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  visa: CreditCard,
  cliq: Smartphone,
  zain_cash: Smartphone,
  orange_money: Smartphone,
  umniah_wallet: Smartphone,
};

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  currency,
  onConfirm,
  isLoading,
  paymentMethods,
  orderStatus,
}: PaymentDialogProps) {
  const { t } = useLanguage();
  
  // Get enabled methods - only DB-allowed values
  const enabledMethods = paymentMethods?.filter((m) => m.enabled) || [
    { id: "cash" as const, label: t("cash"), enabled: true },
    { id: "visa" as const, label: t("card"), enabled: true },
  ];

  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethodId; amount: string }[]>([]);
  const [keypadState, setKeypadState] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  
  // Double-submit protection
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef(false);

  // Helper: round to 3 decimals using HALF-UP (JOD standard)
  const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

  // Initialize with first payment row when dialog opens
  // Use DB total as source of truth for payment
  useEffect(() => {
    if (open && enabledMethods.length > 0) {
      const firstMethod = enabledMethods[0].id;
      // Always reset to the current total when dialog opens
      setSplitPayments([{ method: firstMethod, amount: formatJOD(total) }]);
    }
    // Reset submitting state when dialog opens
    if (open) {
      setIsSubmitting(false);
      submitRef.current = false;
    }
    // Reset payments when dialog closes
    if (!open) {
      setSplitPayments([]);
    }
  }, [open, total, enabledMethods.length]);

  const handleKeypadConfirm = (value: number) => {
    updatePaymentAmount(keypadState.index, formatJOD(value));
  };

  const handleConfirm = async () => {
    // Double-submit protection: check and set flag immediately
    if (submitRef.current || isSubmitting) return;
    submitRef.current = true;
    setIsSubmitting(true);

    // Get valid payments and cap them to not exceed remaining
    const payments = splitPayments
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({ method: p.method, amount: Math.min(parseFloat(p.amount), total) }));
    
    if (payments.length === 0) {
      setIsSubmitting(false);
      submitRef.current = false;
      return;
    }
    
    try {
      await onConfirm(payments);
      // Only reset state AFTER successful payment
      resetState();
    } catch (error) {
      // Reset on error to allow retry
      setIsSubmitting(false);
      submitRef.current = false;
    }
  };

  const resetState = () => {
    setSplitPayments([]);
    setIsSubmitting(false);
    submitRef.current = false;
  };

  // Split bill resets everything and starts fresh
  const handleSplitBill = () => {
    setSplitPayments([
      { method: enabledMethods[0]?.id || "cash", amount: "" },
      { method: enabledMethods[0]?.id || "cash", amount: "" },
    ]);
  };

  const removePaymentRow = (index: number) => {
    if (splitPayments.length <= 1) return;
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const updatePaymentMethod = (index: number, method: PaymentMethodId) => {
    const updated = [...splitPayments];
    updated[index].method = method;
    setSplitPayments(updated);
  };

  const updatePaymentAmount = (index: number, amount: string) => {
    const updated = [...splitPayments];
    updated[index].amount = amount;
    setSplitPayments(updated);
  };

  const fillRemaining = (index: number) => {
    const otherTotal = splitPayments.reduce((sum, p, i) => 
      i === index ? sum : sum + (parseFloat(p.amount) || 0), 0
    );
    const remaining = roundJOD(total - otherTotal);
    if (remaining > 0) {
      updatePaymentAmount(index, formatJOD(remaining));
    }
  };

  const splitTotal = roundJOD(splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0));
  const remaining = roundJOD(total - splitTotal);
  const isExactMatch = Math.abs(remaining) < 0.001; // 3-decimal precision check
  const hasOverpayment = remaining < -0.001;
  const hasValidPayments = splitPayments.some((p) => parseFloat(p.amount) > 0);
  
  // Check if all payments are cash-only (allows overpayment with change)
  const allPaymentsCash = splitPayments.every((p) => p.method === "cash");
  const changeAmount = hasOverpayment ? roundJOD(Math.abs(remaining)) : 0;

  // Block payment for non-open orders (e.g., pending QR orders)
  const isOrderBlocked = orderStatus && orderStatus !== "open";

  // Cash quick amounts
  const cashDenominations = [1, 5, 10, 20, 50];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isSubmitting) { onOpenChange(o); if (!o) resetState(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("payment")}</DialogTitle>
          <DialogDescription className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{t("order_total")}:</span>
              <span className="font-semibold text-foreground">{formatJOD(total)} {currency}</span>
            </div>
            {/* Global remaining/change display based on sum of all payments */}
            {hasValidPayments && (
              <div className="flex items-center gap-2 flex-wrap">
                {remaining > 0.001 && (
                  <>
                    <span>{t("remaining_from_customer")}:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{formatJOD(remaining)} {currency}</span>
                  </>
                )}
                {hasOverpayment && allPaymentsCash && (
                  <>
                    <span>{t("change_to_give")}:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatJOD(changeAmount)} {currency}</span>
                  </>
                )}
                {hasOverpayment && !allPaymentsCash && (
                  <span className="font-semibold text-destructive">{t("card_must_be_exact")}</span>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-3 py-2">
            {/* Payment rows */}
            <div className="space-y-2">
              {splitPayments.map((payment, index) => {
                const methodInfo = enabledMethods.find((m) => m.id === payment.method);
                const isCash = payment.method === "cash";

                return (
                  <div key={index} className="space-y-1.5 p-2 border rounded-md bg-background">
                    <div className="flex items-center gap-1.5">
                      {/* Payment method selector */}
                      <Select value={payment.method} onValueChange={(value) => updatePaymentMethod(index, value)}>
                        <SelectTrigger className="w-[120px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {enabledMethods.map((method) => {
                            const Icon = methodIcons[method.id] || CreditCard;
                            return (
                              <SelectItem key={method.id} value={method.id}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {method.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {/* Amount input */}
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0.000"
                          value={payment.amount}
                          onChange={(e) => updatePaymentAmount(index, e.target.value)}
                          className="h-9 text-base pr-12"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {currency}
                        </span>
                      </div>

                      {/* Numeric keypad button */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setKeypadState({ open: true, index })}
                        title="Enter amount"
                      >
                        <Hash className="h-4 w-4" />
                      </Button>

                      {/* Fill remaining button */}
                      {remaining > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fillRemaining(index)}
                          className="h-9 px-2 text-xs whitespace-nowrap"
                          title={t("fill_remaining")}
                        >
                          {t("fill")}
                        </Button>
                      )}

                      {/* Remove row button */}
                      {splitPayments.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePaymentRow(index)}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Quick cash denominations for cash payments */}
                    {isCash && (
                      <div className="flex flex-wrap gap-1.5">
                        {cashDenominations.map((denom) => (
                          <Button
                            key={denom}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // SET the paid amount to this denomination (not add)
                              updatePaymentAmount(index, formatJOD(denom));
                            }}
                            className="h-8 min-w-[48px] text-xs"
                          >
                            {denom}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePaymentAmount(index, formatJOD(total))}
                          className="h-8 text-xs"
                        >
                          {t("exact")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updatePaymentAmount(index, "0.000")}
                          className="h-8 text-xs"
                        >
                          {t("reset")}
                        </Button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Split bill button - resets everything */}
            <Button
              variant="outline"
              className="w-full h-9"
              onClick={handleSplitBill}
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t("split_bill")}
            </Button>

          </div>
        </DialogBody>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10"
            disabled={isLoading || isSubmitting}
          >
            {t("cancel")}
          </Button>
          <div className="flex flex-col items-end gap-0.5">
            <Button
              onClick={handleConfirm}
              disabled={
                isLoading ||
                isSubmitting ||
                !hasValidPayments ||
                isOrderBlocked ||
                !(isExactMatch || (hasOverpayment && allPaymentsCash))
              }
              className="h-10 min-w-[160px]"
            >
              {isLoading || isSubmitting ? (
                <span className="text-sm">{t("processing")}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-sm">✓ {t("pay")}</span>
                  <span className="text-sm font-semibold">{formatJOD(total)} {currency}</span>
                </span>
              )}
            </Button>
            {/* Helper text explaining why button is disabled */}
            {isOrderBlocked && !isLoading && !isSubmitting && (
              <p className="text-xs text-destructive">{t("payment_blocked_pending")}</p>
            )}
            {!isOrderBlocked && !isExactMatch && !isLoading && !isSubmitting && hasValidPayments && (
              <p className="text-xs text-muted-foreground">
                {remaining > 0
                  ? t("remaining_must_be_zero")
                  : hasOverpayment && !allPaymentsCash
                    ? t("overpayment_cash_only")
                    : null}
              </p>
            )}
          </div>
        </DialogFooter>

        <NumericKeypad
          open={keypadState.open}
          onOpenChange={(open) => setKeypadState({ ...keypadState, open })}
          title={t("amount")}
          initialValue={splitPayments[keypadState.index]?.amount || ""}
          allowDecimals={true}
          minValue={0.01}
          currency={currency}
          onConfirm={handleKeypadConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
