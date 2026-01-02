import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, CreditCard, PlayCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes: string | null;
  voided: boolean;
}

interface TableOrder {
  id: string;
  order_number: number;
  status: string;
  total: number;
  subtotal: number;
  created_at: string;
  notes: string | null;
  order_notes: string | null;
  table_id: string | null;
  order_items: OrderItem[];
}

interface TableOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  orders: TableOrder[];
  currency: string;
  onResumeOrder: (orderId: string) => void;
  onPayOrder: (orderId: string) => void;
  isLoading?: boolean;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "OPEN";
    case "held":
      return "ON_HOLD";
    case "confirmed":
      return "CONFIRMED";
    default:
      return status.toUpperCase();
  }
}

function getStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "open":
      return "default";
    case "held":
      return "secondary";
    default:
      return "outline";
  }
}

export function TableOrdersDialog({
  open,
  onOpenChange,
  tableName,
  orders,
  currency,
  onResumeOrder,
  onPayOrder,
  isLoading,
}: TableOrdersDialogProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Auto-select if only one order
  useEffect(() => {
    if (orders.length === 1) {
      setSelectedOrderId(orders[0].id);
    } else {
      setSelectedOrderId(null);
    }
  }, [orders, open]);

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedOrderId(null);
    }
  }, [open]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const showDirectActions = orders.length === 1;

  const handleResumeClick = () => {
    if (selectedOrderId) {
      onResumeOrder(selectedOrderId);
      onOpenChange(false);
    }
  };

  const handlePayClick = () => {
    if (selectedOrderId) {
      onPayOrder(selectedOrderId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Table {tableName} – Active Orders
          </DialogTitle>
          <DialogDescription>
            {orders.length === 1
              ? "1 active order on this table."
              : `${orders.length} active orders on this table. Select one to continue.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[350px]">
          <div className="space-y-2 pr-2">
            {orders.map((order) => {
              const activeItems = order.order_items.filter((i) => !i.voided);
              const isSelected = selectedOrderId === order.id;

              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  disabled={isLoading}
                  className={cn(
                    "w-full p-4 border rounded-lg text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-1"
                      : "hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{order.order_number}</span>
                      <Badge variant={getStatusVariant(order.status)} className="text-xs">
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Items preview */}
                  <div className="text-sm text-muted-foreground mb-2">
                    {activeItems.slice(0, 3).map((item, i) => (
                      <span key={item.id}>
                        {item.quantity}× {item.name}
                        {i < Math.min(activeItems.length - 1, 2) && ", "}
                      </span>
                    ))}
                    {activeItems.length > 3 && (
                      <span className="text-primary"> +{activeItems.length - 3} more</span>
                    )}
                    {activeItems.length === 0 && (
                      <span className="italic">No items</span>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-lg font-bold text-primary">
                    {Number(order.total).toFixed(2)} {currency}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>

          {showDirectActions ? (
            // Direct actions for single order
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleResumeClick}
                disabled={isLoading || !selectedOrderId}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Resume / Add Items
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayClick}
                disabled={isLoading || !selectedOrderId || selectedOrder?.status !== "open"}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Pay & Close
              </Button>
            </>
          ) : (
            // Selection required for multiple orders
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleResumeClick}
                disabled={isLoading || !selectedOrderId}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Resume / Add Items
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayClick}
                disabled={isLoading || !selectedOrderId || selectedOrder?.status !== "open"}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Pay & Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
