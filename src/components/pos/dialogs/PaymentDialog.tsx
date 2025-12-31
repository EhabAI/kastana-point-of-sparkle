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
import { Banknote, CreditCard, Wallet, Receipt, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethodConfig } from "@/hooks/pos/useCashierPaymentMethods";

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

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>(enabledMethods[0]?.id || "cash");
  const [cashReceived, setCashReceived] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethodId; amount: string }[]>([]);

  // Reset selected method when methods change
  useEffect(() => {
    if (enabledMethods.length > 0 && !enabledMethods.find((m) => m.id === selectedMethod)) {
      setSelectedMethod(enabledMethods[0].id);
    }
  }, [enabledMethods, selectedMethod]);

  const handleSinglePayment = () => {
    onConfirm([{ method: selectedMethod, amount: total }]);
    resetState();
  };

  const handleSplitPayment = () => {
    const payments = splitPayments
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({ method: p.method, amount: parseFloat(p.amount) }));
    onConfirm(payments);
    resetState();
  };

  const resetState = () => {
    setSelectedMethod(enabledMethods[0]?.id || "cash");
    setCashReceived("");
    setSplitMode(false);
    setSplitPayments([]);
  };

  const addSplitPayment = (method: PaymentMethodId) => {
    setSplitPayments([...splitPayments, { method, amount: "" }]);
  };

  const updateSplitPayment = (index: number, amount: string) => {
    const updated = [...splitPayments];
    updated[index].amount = amount;
    setSplitPayments(updated);
  };

  const removeSplitPayment = (index: number) => {
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const splitTotal = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const splitRemaining = total - splitTotal;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = selectedMethod === "cash" && cashReceivedNum > total ? cashReceivedNum - total : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>
            Total: <span className="font-bold text-foreground">{total.toFixed(2)} {currency}</span>
          </DialogDescription>
        </DialogHeader>

        {!splitMode ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {enabledMethods.map((method) => {
                const Icon = methodIcons[method.id] || CreditCard;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-lg border transition-all min-h-[80px]",
                      selectedMethod === method.id
                        ? "border-primary bg-primary/10"
                        : "hover:border-muted-foreground"
                    )}
                  >
                    <Icon className="h-8 w-8 mb-2" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedMethod === "cash" && (
              <div className="space-y-2">
                <Label htmlFor="cashReceived">Cash Received</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={total.toFixed(2)}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="h-12 text-lg"
                />
                {change > 0 && (
                  <div className="p-3 bg-green-500/10 text-green-600 rounded-lg">
                    <p className="text-sm">Change: <span className="font-bold">{change.toFixed(2)} {currency}</span></p>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => setSplitMode(true)}
            >
              Split Payment
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg flex justify-between">
              <span>Remaining</span>
              <span className={cn("font-bold", splitRemaining > 0 ? "text-destructive" : "text-green-600")}>
                {splitRemaining.toFixed(2)} {currency}
              </span>
            </div>

            {splitPayments.map((payment, index) => {
              const methodInfo = enabledMethods.find((m) => m.id === payment.method);
              return (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-24 text-sm">{methodInfo?.label || payment.method}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={payment.amount}
                    onChange={(e) => updateSplitPayment(index, e.target.value)}
                    className="flex-1 h-12"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSplitPayment(index)}
                    className="h-12 px-3"
                  >
                    ×
                  </Button>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2">
              {enabledMethods.map((method) => (
                <Button
                  key={method.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addSplitPayment(method.id)}
                  className="h-10"
                >
                  + {method.label}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => {
                setSplitMode(false);
                setSplitPayments([]);
              }}
            >
              Cancel Split
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12">
            Cancel
          </Button>
          {!splitMode ? (
            <Button
              onClick={handleSinglePayment}
              disabled={isLoading || (selectedMethod === "cash" && cashReceivedNum < total)}
              className="h-12 min-w-[140px]"
            >
              {isLoading ? "Processing..." : `Pay ${total.toFixed(2)} ${currency}`}
            </Button>
          ) : (
            <Button
              onClick={handleSplitPayment}
              disabled={isLoading || Math.abs(splitRemaining) > 0.01}
              className="h-12"
            >
              {isLoading ? "Processing..." : "Complete Split Payment"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
