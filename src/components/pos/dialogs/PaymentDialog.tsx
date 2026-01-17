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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, CreditCard, Smartphone, Plus, X, Hash } from "lucide-react";
import { formatJOD } from "@/lib/utils";
import type { PaymentMethodConfig } from "@/hooks/pos/useCashierPaymentMethods";
import { NumericKeypad } from "../NumericKeypad";
import { useLanguage } from "@/contexts/LanguageContext";

type PaymentMethodId = string;

type PaymentRow = {
  method: PaymentMethodId;
  amount: string;
};

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

  // Market-standard split payment UX:
  // - committedPayments: always amount > 0
  // - draftPayment: single input row, ONLY visible in split mode
  // - splitMode: tracks whether user explicitly clicked "Split Bill"
  const [committedPayments, setCommittedPayments] = useState<PaymentRow[]>([]);
  const [draftPayment, setDraftPayment] = useState<PaymentRow>({ method: "cash", amount: "" });
  const [splitMode, setSplitMode] = useState(false);

  const [keypadState, setKeypadState] = useState<{
    open: boolean;
    target: "committed" | "draft";
    index: number;
  }>({ open: false, target: "draft", index: 0 });

  // Double-submit protection
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef(false);

  // Helper: round to 3 decimals using HALF-UP (JOD standard)
  const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

  const getFirstMethod = (): PaymentMethodId => enabledMethods[0]?.id || "cash";

  const commitDraftRow = (rowOverride?: PaymentRow) => {
    const row = rowOverride ?? draftPayment;
    const amt = parseFloat(row.amount) || 0;
    if (amt <= 0) return;

    setCommittedPayments((prev) => [
      ...prev,
      { method: row.method, amount: formatJOD(amt) },
    ]);

    // Keep exactly one draft row at all times
    setDraftPayment({ method: row.method, amount: "" });
  };

  const updateCommittedPaymentMethod = (index: number, method: PaymentMethodId) => {
    setCommittedPayments((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], method };
      return next;
    });
  };

  const updateCommittedPaymentAmount = (index: number, amount: string) => {
    setCommittedPayments((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], amount };
      return next;
    });
  };

  const finalizeCommittedRow = (index: number, amountOverride?: string) => {
    setCommittedPayments((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      const raw = amountOverride ?? next[index].amount;
      const amt = parseFloat(raw) || 0;

      // Committed rows must always be > 0
      if (amt <= 0) {
        next.splice(index, 1);
        return next;
      }

      next[index] = { ...next[index], amount: formatJOD(amt) };
      return next;
    });
  };

  const removeCommittedRow = (index: number) => {
    setCommittedPayments((prev) => prev.filter((_, i) => i !== index));
  };

  // Initialize dialog state
  // Use DB total as source of truth for payment
  useEffect(() => {
    if (open && enabledMethods.length > 0) {
      const firstMethod = getFirstMethod();
      // Market standard: ONE payment row with full total, no split mode by default
      setCommittedPayments([{ method: firstMethod, amount: formatJOD(total) }]);
      setDraftPayment({ method: firstMethod, amount: "" });
      setSplitMode(false);
    }

    if (open) {
      setIsSubmitting(false);
      submitRef.current = false;
    }

    if (!open) {
      setCommittedPayments([]);
      setDraftPayment({ method: getFirstMethod(), amount: "" });
      setSplitMode(false);
    }
  }, [open, total, enabledMethods.length]);

  const handleKeypadConfirm = (value: number) => {
    const amtStr = formatJOD(value);

    if (keypadState.target === "draft") {
      commitDraftRow({ ...draftPayment, amount: amtStr });
      return;
    }

    finalizeCommittedRow(keypadState.index, amtStr);
  };

  const handleConfirm = async () => {
    // Double-submit protection: check and set flag immediately
    if (submitRef.current || isSubmitting) return;
    submitRef.current = true;
    setIsSubmitting(true);

    // Only committed payments are submitted
    const payments = committedPayments
      .filter((p) => (parseFloat(p.amount) || 0) > 0)
      .map((p) => ({ method: p.method, amount: Math.min(parseFloat(p.amount), total) }));

    if (payments.length === 0) {
      setIsSubmitting(false);
      submitRef.current = false;
      return;
    }

    try {
      await onConfirm(payments);
      resetState();
    } catch (error) {
      setIsSubmitting(false);
      submitRef.current = false;
    }
  };

  const resetState = () => {
    setCommittedPayments([]);
    setDraftPayment({ method: getFirstMethod(), amount: "" });
    setSplitMode(false);
    setIsSubmitting(false);
    submitRef.current = false;
  };

  // Split bill: enable split mode and clear to allow multiple payment entries
  const handleSplitBill = () => {
    setSplitMode(true);
    setCommittedPayments([]);
    setDraftPayment({ method: getFirstMethod(), amount: "" });
  };

  const fillRemainingIntoDraft = () => {
    const committedTotal = committedPayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );
    const rem = roundJOD(total - committedTotal);
    if (rem > 0) {
      commitDraftRow({ ...draftPayment, amount: formatJOD(rem) });
    }
  };

  // Calculations must ignore the draft row
  const validPayments = committedPayments.filter((p) => (parseFloat(p.amount) || 0) > 0);
  const totalPaid = roundJOD(validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0));
  const diff = roundJOD(totalPaid - total);

  const remaining = diff < -0.001 ? roundJOD(Math.abs(diff)) : 0;
  const hasOverpayment = diff > 0.001;
  const changeAmount = hasOverpayment ? diff : 0;
  const isExactMatch = Math.abs(diff) < 0.001;
  const hasValidPayments = validPayments.length > 0;

  // Check if all valid payments are cash-only (allows overpayment with change)
  const allPaymentsCash = validPayments.length === 0 || validPayments.every((p) => p.method === "cash");

  // Block payment for non-open orders (e.g., pending QR orders)
  const isOrderBlocked = orderStatus && orderStatus !== "open";

  // Cash quick amounts
  const cashDenominations = [1, 5, 10, 20, 50];

  const keypadInitialValue =
    keypadState.target === "draft"
      ? draftPayment.amount
      : committedPayments[keypadState.index]?.amount || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isSubmitting) {
          onOpenChange(o);
          if (!o) resetState();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("payment")}</DialogTitle>
          <DialogDescription className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{t("order_total")}:</span>
              <span className="font-semibold text-foreground">{formatJOD(total)} {currency}</span>
            </div>

            {/* Global remaining/change display based on SUM of committed payments */}
            {hasValidPayments && (
              <div className="flex items-center gap-2 flex-wrap">
                {remaining > 0 && (
                  <>
                    <span>{t("remaining_from_customer")}:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatJOD(remaining)} {currency}
                    </span>
                  </>
                )}

                {hasOverpayment && allPaymentsCash && (
                  <>
                    <span>{t("change_to_give")}:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatJOD(changeAmount)} {currency}
                    </span>
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
            {/* Payment rows (committed + one draft row) */}
            <div className="space-y-2">
              {committedPayments.map((payment, index) => {
                const isCash = payment.method === "cash";

                return (
                  <div key={`committed-${index}`} className="space-y-1.5 p-2 border rounded-md bg-background">
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={payment.method}
                        onValueChange={(value) => updateCommittedPaymentMethod(index, value)}
                      >
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

                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0.000"
                          value={payment.amount}
                          onChange={(e) => updateCommittedPaymentAmount(index, e.target.value)}
                          onBlur={() => finalizeCommittedRow(index)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") finalizeCommittedRow(index);
                          }}
                          className="h-9 text-base pr-12"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {currency}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setKeypadState({ open: true, target: "committed", index })}
                        title="Enter amount"
                      >
                        <Hash className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCommittedRow(index)}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Quick cash denominations (editing only) */}
                    {isCash && (
                      <div className="flex flex-wrap gap-1.5">
                        {cashDenominations.map((denom) => (
                          <Button
                            key={denom}
                            variant="outline"
                            size="sm"
                            onClick={() => finalizeCommittedRow(index, formatJOD(denom))}
                            className="h-8 min-w-[48px] text-xs"
                          >
                            {denom}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => finalizeCommittedRow(index, formatJOD(total))}
                          className="h-8 text-xs"
                        >
                          {t("exact")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeCommittedRow(index)}
                          className="h-8 text-xs"
                        >
                          {t("reset")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Draft row - ONLY visible in split mode */}
              {splitMode && (
                <div className="space-y-1.5 p-2 border rounded-md bg-background border-dashed">
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={draftPayment.method}
                      onValueChange={(value) => setDraftPayment((p) => ({ ...p, method: value }))}
                    >
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

                    <div className="relative flex-1">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        value={draftPayment.amount}
                        onChange={(e) => setDraftPayment((p) => ({ ...p, amount: e.target.value }))}
                        onBlur={() => commitDraftRow()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitDraftRow();
                        }}
                        className="h-9 text-base pr-12"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {currency}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setKeypadState({ open: true, target: "draft", index: 0 })}
                      title="Enter amount"
                    >
                      <Hash className="h-4 w-4" />
                    </Button>

                    {/* Fill remaining into the draft row */}
                    {diff < -0.001 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fillRemainingIntoDraft}
                        className="h-9 px-2 text-xs whitespace-nowrap"
                        title={t("fill_remaining")}
                      >
                        {t("fill")}
                      </Button>
                    )}
                  </div>

                  {/* Quick cash denominations for draft cash entry */}
                  {draftPayment.method === "cash" && (
                    <div className="flex flex-wrap gap-1.5">
                      {cashDenominations.map((denom) => (
                        <Button
                          key={denom}
                          variant="outline"
                          size="sm"
                          onClick={() => commitDraftRow({ ...draftPayment, amount: formatJOD(denom) })}
                          className="h-8 min-w-[48px] text-xs"
                        >
                          {denom}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => commitDraftRow({ ...draftPayment, amount: formatJOD(total) })}
                        className="h-8 text-xs"
                      >
                        {t("exact")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDraftPayment((p) => ({ ...p, amount: "" }))}
                        className="h-8 text-xs"
                      >
                        {t("reset")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Split bill button - starts fresh */}
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

            {isOrderBlocked && !isLoading && !isSubmitting && (
              <p className="text-xs text-destructive">{t("payment_blocked_pending")}</p>
            )}

            {!isOrderBlocked && !isExactMatch && !isLoading && !isSubmitting && hasValidPayments && (
              <p className="text-xs text-muted-foreground">
                {diff < -0.001
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
          onOpenChange={(o) => setKeypadState((s) => ({ ...s, open: o }))}
          title={t("amount")}
          initialValue={keypadInitialValue}
          allowDecimals={true}
          minValue={0.01}
          currency={currency}
          onConfirm={handleKeypadConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
