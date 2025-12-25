import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface HeldOrder {
  id: string;
  order_number: number;
  created_at: string;
  total: number;
  order_items: OrderItem[];
}

interface HeldOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: HeldOrder[];
  currency: string;
  onResumeOrder: (orderId: string) => void;
}

export function HeldOrdersDialog({
  open,
  onOpenChange,
  orders,
  currency,
  onResumeOrder,
}: HeldOrdersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Held Orders
          </DialogTitle>
          <DialogDescription>
            {orders.length} order(s) on hold
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No held orders
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 border rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">Order #{order.order_number}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <span className="font-bold text-primary">
                      {Number(order.total).toFixed(2)} {currency}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3">
                    {order.order_items.slice(0, 3).map((item, i) => (
                      <span key={item.id}>
                        {item.quantity}× {item.name}
                        {i < Math.min(order.order_items.length - 1, 2) && ", "}
                      </span>
                    ))}
                    {order.order_items.length > 3 && (
                      <span> +{order.order_items.length - 3} more</span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onResumeOrder(order.id);
                      onOpenChange(false);
                    }}
                  >
                    Resume Order
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
