import { useState, useEffect, useRef, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Banknote, CreditCard, Smartphone, Hash, X, Users } from "lucide-react";
import { formatJOD, cn } from "@/lib/utils";
import type { PaymentMethodConfig } from "@/hooks/pos/useCashierPaymentMethods";
import { NumericKeypad } from "../NumericKeypad";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrderSummary {
  id: string;
  order_number: number;
  total: number;
  itemCount: number;
}

interface TableCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  orders: OrderSummary[];
  currency: string;
  onConfirm: (payments: { method: string; amount: number }[]) => Promise<void>;
  isLoading?: boolean;
  paymentMethods?: PaymentMethodConfig[];
}

type PaymentMethodId = string;

type PaymentRow = {
  method: PaymentMethodId;
  amount: string;
};

// Icons for payment methods
const methodIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  visa: CreditCard,
  cliq: Smartphone,
  zain_cash: Smartphone,
  orange_money: Smartphone,
  umniah_wallet: Smartphone,
};

export function TableCheckoutDialog({
  open,
  onOpenChange,
  tableName,
  orders,
  currency,
  onConfirm,
  isLoading,
  paymentMethods,
}: TableCheckoutDialogProps) {
  const { t } = useLanguage();

  // Calculate combined total
  const combinedTotal = useMemo(() => {
    return orders.reduce((sum, o) => sum + Number(o.total), 0);
  }, [orders]);

  // Payment state
  const enabledMethods = paymentMethods?.filter((m) => m.enabled) || [
    { id: "cash" as const, label: t("cash"), enabled: true },
    { id: "visa" as const, label: t("card"), enabled: true },
  ];

  const [committedPayments, setCommittedPayments] = useState<PaymentRow[]>([]);
  const [draftPayment, setDraftPayment] = useState<PaymentRow>({ method: "cash", amount: "" });
  const [splitMode, setSplitMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef(false);

  const [keypadState, setKeypadState] = useState<{
    open: boolean;
    target: "committed" | "draft";
    index: number;
  }>({ open: false, target: "draft", index: 0 });

  // Helper: round to 3 decimals
  const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

  const getFirstMethod = (): PaymentMethodId => enabledMethods[0]?.id || "cash";

  // Initialize state when dialog opens
  useEffect(() => {
    if (open && enabledMethods.length > 0) {
      const firstMethod = getFirstMethod();
      setCommittedPayments([{ method: firstMethod, amount: formatJOD(combinedTotal) }]);
      setDraftPayment({ method: firstMethod, amount: "" });
      setSplitMode(false);
      setIsSubmitting(false);
      submitRef.current = false;
    }

    if (!open) {
      setCommittedPayments([]);
      setDraftPayment({ method: getFirstMethod(), amount: "" });
      setSplitMode(false);
    }
  }, [open, combinedTotal, enabledMethods.length]);

  const commitDraftRow = (rowOverride?: PaymentRow) => {
    const row = rowOverride ?? draftPayment;
    const amt = parseFloat(row.amount) || 0;
    if (amt <= 0) return;

    setCommittedPayments((prev) => [
      ...prev,
      { method: row.method, amount: formatJOD(amt) },
    ]);
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
    const rem = roundJOD(combinedTotal - committedTotal);
    if (rem > 0) {
      commitDraftRow({ ...draftPayment, amount: formatJOD(rem) });
    }
  };

  const handleKeypadConfirm = (value: number) => {
    const amtStr = formatJOD(value);

    if (keypadState.target === "draft") {
      commitDraftRow({ ...draftPayment, amount: amtStr });
      return;
    }

    finalizeCommittedRow(keypadState.index, amtStr);
  };

  const handleConfirm = async () => {
    if (submitRef.current || isSubmitting) return;
    submitRef.current = true;
    setIsSubmitting(true);

    const payments = committedPayments
      .filter((p) => (parseFloat(p.amount) || 0) > 0)
      .map((p) => ({ method: p.method, amount: Math.min(parseFloat(p.amount), combinedTotal) }));

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

  // Calculations
  const validPayments = committedPayments.filter((p) => (parseFloat(p.amount) || 0) > 0);
  const totalPaid = roundJOD(validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0));
  const diff = roundJOD(totalPaid - combinedTotal);
  const remaining = diff < -0.001 ? roundJOD(Math.abs(diff)) : 0;
  const hasOverpayment = diff > 0.001;
  const changeAmount = hasOverpayment ? diff : 0;
  const hasValidPayments = validPayments.length > 0;
  const allPaymentsCash = validPayments.length === 0 || validPayments.every((p) => p.method === "cash");
  const canConfirm = hasValidPayments && remaining < 0.001 && (!hasOverpayment || allPaymentsCash);

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
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("table_checkout")} – {tableName}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            {/* Orders summary */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {orders.map((order) => (
                <Badge key={order.id} variant="secondary" className="text-xs">
                  #{order.order_number}: {formatJOD(order.total)} {currency}
                </Badge>
              ))}
            </div>
            
            <Separator className="my-2" />
            
            {/* Combined total */}
            <div className="flex items-center justify-between">
              <span className="font-medium">{t("combined_total")}:</span>
              <span className="text-xl font-bold text-primary">
                {formatJOD(combinedTotal)} {currency}
              </span>
            </div>

            {/* Payment status */}
            {hasValidPayments && (
              <div className="flex items-center gap-2 flex-wrap text-sm">
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
            {/* Payment rows */}
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

                    {/* Quick cash denominations */}
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
                          onClick={() => finalizeCommittedRow(index, formatJOD(combinedTotal))}
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

              {/* Draft row - only in split mode */}
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
                </div>
              )}

              {/* Split button */}
              {!splitMode && committedPayments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSplitBill}
                  className="w-full"
                >
                  {t("split_payment")}
                </Button>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isLoading || isSubmitting
              ? t("processing")
              : `${t("pay_all_orders")} (${orders.length})`}
          </Button>
        </DialogFooter>

        {/* Numeric Keypad */}
        <NumericKeypad
          open={keypadState.open}
          onOpenChange={(open) => setKeypadState((s) => ({ ...s, open }))}
          onConfirm={handleKeypadConfirm}
          initialValue={keypadInitialValue}
          allowDecimals
          currency={currency}
          title={t("enter_amount")}
        />
      </DialogContent>
    </Dialog>
  );
}
