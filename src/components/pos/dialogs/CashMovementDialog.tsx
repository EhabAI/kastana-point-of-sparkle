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
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

type MovementType = "cash_in" | "cash_out";

interface CashMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  onConfirm: (type: MovementType, amount: number, reason?: string) => void;
  isLoading?: boolean;
}

export function CashMovementDialog({
  open,
  onOpenChange,
  currency,
  onConfirm,
  isLoading,
}: CashMovementDialogProps) {
  const [type, setType] = useState<MovementType>("cash_in");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onConfirm(type, numAmount, reason || undefined);
      setAmount("");
      setReason("");
      setType("cash_in");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cash Movement</DialogTitle>
          <DialogDescription>
            Record cash added to or removed from the drawer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={type}
            onValueChange={(v) => setType(v as MovementType)}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="cash_in" id="cash_in" className="peer sr-only" />
              <Label
                htmlFor="cash_in"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <ArrowDownCircle className="h-6 w-6 mb-2 text-green-600" />
                <span className="font-medium">Cash In</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="cash_out" id="cash_out" className="peer sr-only" />
              <Label
                htmlFor="cash_out"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <ArrowUpCircle className="h-6 w-6 mb-2 text-destructive" />
                <span className="font-medium">Cash Out</span>
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for cash movement..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !amount}>
            {isLoading ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
