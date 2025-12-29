import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ShiftSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftData: {
    openingCash: number;
    openedAt: string;
    closedAt: string;
    orderCount: number;
  } | null;
  currency: string;
}

export function ShiftSummaryDialog({
  open,
  onOpenChange,
  shiftData,
  currency,
}: ShiftSummaryDialogProps) {
  if (!shiftData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shift Closed</DialogTitle>
          <DialogDescription>
            Your shift has been closed successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Opening Cash</p>
              <p className="text-lg font-bold">
                {shiftData.openingCash.toFixed(2)} {currency}
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="text-lg font-bold">{shiftData.orderCount}</p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Shift Start</p>
            <p className="font-medium">
              {format(new Date(shiftData.openedAt), "PPp")}
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Shift End</p>
            <p className="font-medium">
              {format(new Date(shiftData.closedAt), "PPp")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
