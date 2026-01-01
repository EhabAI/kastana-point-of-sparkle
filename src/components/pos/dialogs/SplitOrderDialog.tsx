import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes: string | null;
}

interface SplitOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  items: OrderItem[];
  currency: string;
  onConfirm: (itemsToSplit: { itemId: string; quantity: number }[]) => void;
  isLoading?: boolean;
}

export function SplitOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  items,
  currency,
  onConfirm,
  isLoading,
}: SplitOrderDialogProps) {
  // Track quantities to split for each item
  const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({});

  // Reset when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSplitQuantities({});
    }
    onOpenChange(newOpen);
  };

  const handleIncrement = (itemId: string, maxQty: number) => {
    setSplitQuantities((prev) => ({
      ...prev,
      [itemId]: Math.min((prev[itemId] || 0) + 1, maxQty),
    }));
  };

  const handleDecrement = (itemId: string) => {
    setSplitQuantities((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  };

  const handleToggle = (itemId: string, maxQty: number) => {
    setSplitQuantities((prev) => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: 1 };
    });
  };

  const itemsToSplit = useMemo(() => {
    return Object.entries(splitQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
  }, [splitQuantities]);

  const totalItemsToSplit = itemsToSplit.reduce((sum, i) => sum + i.quantity, 0);
  const totalOriginalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const remainingItems = totalOriginalItems - totalItemsToSplit;

  const canSplit = totalItemsToSplit > 0 && remainingItems > 0;

  const splitTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const splitQty = splitQuantities[item.id] || 0;
      return sum + item.price * splitQty;
    }, 0);
  }, [items, splitQuantities]);

  const handleConfirm = () => {
    if (canSplit) {
      onConfirm(itemsToSplit);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split Order #{orderNumber}</DialogTitle>
          <DialogDescription>
            Select items to move to a new order. Both orders will stay on the same table.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-4">
            {items.map((item) => {
              const splitQty = splitQuantities[item.id] || 0;
              const isSelected = splitQty > 0;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(item.id, item.quantity)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.price.toFixed(2)} {currency} × {item.quantity}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-muted-foreground italic truncate">
                        {item.notes}
                      </div>
                    )}
                  </div>
                  {isSelected && item.quantity > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDecrement(item.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{splitQty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleIncrement(item.id, item.quantity)}
                        disabled={splitQty >= item.quantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {isSelected && item.quantity === 1 && (
                    <span className="text-sm text-muted-foreground">1</span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Items to new order:</span>
            <span className="font-medium">{totalItemsToSplit}</span>
          </div>
          <div className="flex justify-between">
            <span>Items remaining:</span>
            <span className="font-medium">{remainingItems}</span>
          </div>
          <div className="flex justify-between text-base font-medium pt-2 border-t">
            <span>New order total:</span>
            <span>{splitTotal.toFixed(2)} {currency}</span>
          </div>
        </div>

        {!canSplit && totalItemsToSplit > 0 && (
          <p className="text-sm text-destructive">
            At least 1 item must remain in the original order.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSplit || isLoading}
            className="h-12"
          >
            {isLoading ? "Splitting..." : "Split Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
