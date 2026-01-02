import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, CreditCard, Wallet, Receipt, Smartphone, Plus, Minus, X, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethodConfig } from "@/hooks/pos/useCashierPaymentMethods";
import { NumericKeypad } from "../NumericKeypad";

type PaymentMethodId = string;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  currency: string;
  onConfirm: (payments: { method: string; amount: number }[]) => void;
  isLoading?: boolean;
  paymentMethods?: PaymentMethodConfig[];
}

const methodIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  visa: CreditCard,
  mastercard: CreditCard,
  efawateer: Receipt,
  wallet: Wallet,
  card: CreditCard,
  mobile: Smartphone,
};

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  currency,
  onConfirm,
  isLoading,
  paymentMethods,
}: PaymentDialogProps) {
  // Get enabled methods or default to cash/card/mobile
  const enabledMethods = paymentMethods?.filter((m) => m.enabled) || [
    { id: "cash", label: "Cash", enabled: true },
    { id: "card", label: "Card", enabled: true },
    { id: "mobile", label: "Mobile", enabled: true },
  ];

  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethodId; amount: string }[]>([]);
  const [keypadState, setKeypadState] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });

  // Initialize with first payment row when dialog opens
  useEffect(() => {
    if (open && splitPayments.length === 0 && enabledMethods.length > 0) {
      setSplitPayments([{ method: enabledMethods[0].id, amount: total.toFixed(2) }]);
    }
  }, [open, enabledMethods.length]);

  const handleKeypadConfirm = (value: number) => {
    updatePaymentAmount(keypadState.index, value.toFixed(2));
  };

  const handleConfirm = () => {
    const payments = splitPayments
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({ method: p.method, amount: parseFloat(p.amount) }));
    
    if (payments.length === 0) return;
    
    onConfirm(payments);
    resetState();
  };

  const resetState = () => {
    setSplitPayments([]);
  };

  const addPaymentRow = () => {
    const remaining = total - splitTotal;
    setSplitPayments([
      ...splitPayments,
      { method: enabledMethods[0]?.id || "cash", amount: remaining > 0 ? remaining.toFixed(2) : "" },
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
    const remaining = total - otherTotal;
    if (remaining > 0) {
      updatePaymentAmount(index, remaining.toFixed(2));
    }
  };

  const splitTotal = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = total - splitTotal;
  const isExactMatch = Math.abs(remaining) < 0.01;
  const hasOverpayment = remaining < -0.01;
  const hasValidPayments = splitPayments.some((p) => parseFloat(p.amount) > 0);

  // Cash quick amounts
  const cashDenominations = [1, 5, 10, 20, 50];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>
            Order Total: <span className="font-bold text-foreground text-lg">{total.toFixed(2)} {currency}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Remaining amount indicator */}
          <div className={cn(
            "p-4 rounded-lg text-center",
            isExactMatch ? "bg-green-500/10 border border-green-500/30" :
            hasOverpayment ? "bg-destructive/10 border border-destructive/30" :
            "bg-muted"
          )}>
            <p className="text-sm text-muted-foreground mb-1">
              {isExactMatch ? "Payment Complete" : hasOverpayment ? "Overpayment" : "Remaining to Pay"}
            </p>
            <p className={cn(
              "text-2xl font-bold",
              isExactMatch ? "text-green-600" :
              hasOverpayment ? "text-destructive" :
              "text-foreground"
            )}>
              {Math.abs(remaining).toFixed(2)} {currency}
            </p>
          </div>

          {/* Payment rows */}
          <div className="space-y-3">
            {splitPayments.map((payment, index) => {
              const methodInfo = enabledMethods.find((m) => m.id === payment.method);
              const isCash = payment.method === "cash";
              
              return (
                <div key={index} className="space-y-2 p-3 border rounded-lg bg-background">
                  <div className="flex items-center gap-2">
                    {/* Payment method selector */}
                    <Select
                      value={payment.method}
                      onValueChange={(value) => updatePaymentMethod(index, value)}
                    >
                      <SelectTrigger className="w-[140px] h-12">
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
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={payment.amount}
                        onChange={(e) => updatePaymentAmount(index, e.target.value)}
                        className="h-12 text-lg pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currency}
                      </span>
                    </div>

                    {/* Numeric keypad button */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setKeypadState({ open: true, index })}
                      title="Enter amount"
                    >
                      <Hash className="h-5 w-5" />
                    </Button>

                    {/* Fill remaining button */}
                    {!isExactMatch && remaining > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fillRemaining(index)}
                        className="h-12 px-3 whitespace-nowrap"
                        title="Fill remaining amount"
                      >
                        Fill
                      </Button>
                    )}

                    {/* Remove row button */}
                    {splitPayments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePaymentRow(index)}
                        className="h-12 w-12 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    )}
                  </div>

                  {/* Quick cash denominations for cash payments */}
                  {isCash && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {cashDenominations.map((denom) => (
                        <Button
                          key={denom}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = parseFloat(payment.amount) || 0;
                            updatePaymentAmount(index, (current + denom).toFixed(2));
                          }}
                          className="h-10 min-w-[60px]"
                        >
                          +{denom}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePaymentAmount(index, total.toFixed(2))}
                        className="h-10"
                      >
                        Exact
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add payment row button */}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={addPaymentRow}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Payment Method
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isExactMatch || !hasValidPayments}
            className="h-12 min-w-[160px]"
          >
            {isLoading ? "Processing..." : `Complete Payment`}
          </Button>
        </DialogFooter>

        <NumericKeypad
          open={keypadState.open}
          onOpenChange={(open) => setKeypadState({ ...keypadState, open })}
          title="Enter Amount"
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
