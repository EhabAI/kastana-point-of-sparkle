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
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentMethod = "cash" | "card" | "mobile";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  currency: string;
  onConfirm: (payments: { method: PaymentMethod; amount: number }[]) => void;
  isLoading?: boolean;
}

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  currency,
  onConfirm,
  isLoading,
}: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod; amount: string }[]>([]);

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
    setSelectedMethod("cash");
    setCashReceived("");
    setSplitMode(false);
    setSplitPayments([]);
  };

  const addSplitPayment = (method: PaymentMethod) => {
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

  const paymentMethods = [
    { id: "cash" as PaymentMethod, label: "Cash", icon: Banknote },
    { id: "card" as PaymentMethod, label: "Card", icon: CreditCard },
    { id: "mobile" as PaymentMethod, label: "Mobile", icon: Smartphone },
  ];

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
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg border transition-all",
                    selectedMethod === method.id
                      ? "border-primary bg-primary/10"
                      : "hover:border-muted-foreground"
                  )}
                >
                  <method.icon className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
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
              className="w-full"
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

            {splitPayments.map((payment, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-20 text-sm capitalize">{payment.method}</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={payment.amount}
                  onChange={(e) => updateSplitPayment(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSplitPayment(index)}
                >
                  ×
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addSplitPayment(method.id)}
                >
                  + {method.label}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!splitMode ? (
            <Button
              onClick={handleSinglePayment}
              disabled={isLoading || (selectedMethod === "cash" && cashReceivedNum < total)}
            >
              {isLoading ? "Processing..." : `Pay ${total.toFixed(2)} ${currency}`}
            </Button>
          ) : (
            <Button
              onClick={handleSplitPayment}
              disabled={isLoading || Math.abs(splitRemaining) > 0.01}
            >
              {isLoading ? "Processing..." : "Complete Split Payment"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
