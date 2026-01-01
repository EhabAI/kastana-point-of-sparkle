import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface OpenOrder {
  id: string;
  order_number: number;
  notes: string | null;
}

interface TransferItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetOrderId: string) => void;
  isLoading?: boolean;
  itemName: string;
  openOrders: OpenOrder[];
  currentOrderId: string;
}

// Extract table name from notes
function getTableFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/table:([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

export function TransferItemDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  itemName,
  openOrders,
  currentOrderId,
}: TransferItemDialogProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filter out current order and get other open orders
  const availableOrders = openOrders.filter(
    (order) => order.id !== currentOrderId
  );

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleProceed = () => {
    if (selectedOrderId) {
      setShowConfirmation(true);
    }
  };

  const handleConfirm = () => {
    if (selectedOrderId) {
      onConfirm(selectedOrderId);
    }
  };

  const handleClose = () => {
    setSelectedOrderId(null);
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const selectedOrder = availableOrders.find((o) => o.id === selectedOrderId);

  if (showConfirmation && selectedOrder) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <DialogTitle>Confirm Transfer</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              You are about to transfer <strong>{itemName}</strong> to Order #{selectedOrder.order_number}.
              This action will move the entire item (including notes and modifiers).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              {isLoading ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <DialogTitle>Transfer Item</DialogTitle>
          </div>
          <DialogDescription>
            Select the target order for <strong>{itemName}</strong>
          </DialogDescription>
        </DialogHeader>

        {availableOrders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No other open orders available
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {availableOrders.map((order) => {
                const tableId = getTableFromNotes(order.notes);
                const isSelected = selectedOrderId === order.id;
                
                return (
                  <button
                    key={order.id}
                    onClick={() => handleSelectOrder(order.id)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Order #{order.order_number}
                      </span>
                      {tableId && (
                        <span className="text-sm text-muted-foreground">
                          Table assigned
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!selectedOrderId || availableOrders.length === 0}
            className="min-h-[44px]"
          >
            Next
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
