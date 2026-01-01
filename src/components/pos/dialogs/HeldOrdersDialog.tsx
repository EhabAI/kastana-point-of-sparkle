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
import { Clock, ArrowRight, X, MapPin, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes: string | null;
  voided: boolean;
}

interface HeldOrder {
  id: string;
  order_number: number;
  created_at: string;
  total: number;
  subtotal: number;
  notes: string | null;
  order_notes: string | null;
  table_id: string | null;
  order_items: OrderItem[];
}

interface Table {
  id: string;
  table_name: string;
}

interface HeldOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: HeldOrder[];
  tables?: Table[];
  currency: string;
  onResumeOrder: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  isLoading?: boolean;
}

function getTableName(tableId: string | null, tables: Table[] = []): string | null {
  if (!tableId) return null;
  const table = tables.find(t => t.id === tableId);
  return table?.table_name || null;
}

function isTableOrder(order: HeldOrder): boolean {
  return !!order.table_id;
}

export function HeldOrdersDialog({
  open,
  onOpenChange,
  orders,
  tables = [],
  currency,
  onResumeOrder,
  onCancelOrder,
  isLoading,
}: HeldOrdersDialogProps) {
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleCancelClick = (orderId: string) => {
    setConfirmCancelId(orderId);
  };

  const handleConfirmCancel = () => {
    if (confirmCancelId) {
      onCancelOrder(confirmCancelId);
      setConfirmCancelId(null);
    }
  };

  const handleClose = () => {
    setConfirmCancelId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Held Orders
          </DialogTitle>
          <DialogDescription>
            {orders.length} order(s) on hold. Resume to continue or cancel to void.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[450px]">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No held orders</p>
              <p className="text-sm">Orders you hold will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {orders.map((order) => {
                const activeItems = order.order_items.filter(i => !i.voided);
                const tableName = getTableName(order.table_id, tables);
                const isDineIn = isTableOrder(order);
                const isConfirmingCancel = confirmCancelId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      isConfirmingCancel 
                        ? "border-destructive bg-destructive/5" 
                        : "hover:border-primary"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">#{order.order_number}</span>
                        <Badge 
                          variant={isDineIn ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isDineIn ? (
                            <><MapPin className="h-3 w-3 mr-1" />{tableName || "Table"}</>
                          ) : (
                            <><ShoppingBag className="h-3 w-3 mr-1" />Takeaway</>
                          )}
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
                    </div>

                    {/* Total */}
                    <div className="text-lg font-bold text-primary mb-3">
                      {Number(order.total).toFixed(2)} {currency}
                    </div>

                    {/* Actions */}
                    {isConfirmingCancel ? (
                      <div className="space-y-2">
                        <p className="text-sm text-destructive font-medium">
                          Cancel this order? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setConfirmCancelId(null)}
                            disabled={isLoading}
                          >
                            Keep Order
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={handleConfirmCancel}
                            disabled={isLoading}
                          >
                            {isLoading ? "Cancelling..." : "Yes, Cancel"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => handleCancelClick(order.id)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            onResumeOrder(order.id);
                            handleClose();
                          }}
                          disabled={isLoading}
                        >
                          Resume
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
