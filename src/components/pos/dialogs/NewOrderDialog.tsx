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
import { OrderTypeSelector, type OrderType } from "../OrderTypeSelector";
import { TableSelector } from "../TableSelector";
import type { BranchTable } from "@/hooks/pos/useBranchTables";

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: BranchTable[];
  tablesLoading?: boolean;
  onConfirm: (orderType: OrderType, tableId: string | null) => void;
  isLoading?: boolean;
}

export function NewOrderDialog({
  open,
  onOpenChange,
  tables,
  tablesLoading,
  onConfirm,
  isLoading,
}: NewOrderDialogProps) {
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (orderType) {
      onConfirm(orderType, orderType === "dine-in" ? selectedTableId : null);
      // Reset state
      setOrderType(null);
      setSelectedTableId(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setOrderType(null);
    setSelectedTableId(null);
  };

  const canConfirm = orderType === "takeaway" || (orderType === "dine-in" && selectedTableId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>
            Select order type to begin
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <OrderTypeSelector
            selectedType={orderType}
            onSelectType={setOrderType}
          />

          {orderType === "dine-in" && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Select Table</h4>
              <TableSelector
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={setSelectedTableId}
                isLoading={tablesLoading}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="h-12">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="h-12 min-w-[120px]"
          >
            {isLoading ? "Creating..." : "Start Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
