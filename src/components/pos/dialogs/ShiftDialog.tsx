import { useState, useEffect } from "react";
import { format } from "date-fns";
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

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "open" | "close";
  onConfirm: (amount: number) => void;
  isLoading?: boolean;
  expectedCash?: number;
}

export function ShiftDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
  isLoading,
  expectedCash,
}: ShiftDialogProps) {
  const [amount, setAmount] = useState("");
  const [shiftTime, setShiftTime] = useState<Date>(new Date());

  useEffect(() => {
    if (open && mode === "open") {
      setShiftTime(new Date());
    }
  }, [open, mode]);

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount >= 0) {
      onConfirm(numAmount);
      setAmount("");
    }
  };

  const title = mode === "open" ? "Open Shift" : "Close Shift";
  const description =
    mode === "open"
      ? "Enter the opening cash amount in the drawer."
      : "Count the cash in the drawer and enter the closing amount.";
  const label = mode === "open" ? "Opening Cash" : "Closing Cash";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "open" && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Shift Start Time</p>
              <p className="text-lg font-bold">{format(shiftTime, "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          )}

          {mode === "close" && expectedCash !== undefined && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Expected Cash</p>
              <p className="text-lg font-bold">{expectedCash.toFixed(2)} JOD</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">{label}</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !amount}>
            {isLoading ? "Processing..." : `Confirm ${title}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
