import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ReopenOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ReopenOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
  isLoading,
}: ReopenOrderDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Reopen Order
          </DialogTitle>
          <DialogDescription>
            Reopen Order #{orderNumber} for correction
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">Order will be reopened</p>
            <p className="text-sm text-muted-foreground mt-1">
              This order will be moved back to open status. You will be able to:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
              <li>Edit items and quantities</li>
              <li>Apply or modify discounts</li>
              <li>Process additional payments</li>
              <li>Close the order again when ready</li>
            </ul>
          </div>
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
            disabled={isLoading}
            className="h-12"
          >
            {isLoading ? "Reopening..." : "Reopen Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
