import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Undo2, RotateCcw } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Payment {
  id: string;
  method: string;
  amount: number;
}

interface Refund {
  id: string;
  amount: number;
  refund_type: string;
}

export interface RecentOrder {
  id: string;
  order_number: number;
  created_at: string;
  status: string;
  subtotal: number;
  discount_type: string | null;
  discount_value: number | null;
  tax_amount: number;
  service_charge: number;
  total: number;
  order_notes: string | null;
  order_items: OrderItem[];
  payments: Payment[];
  refunds?: Refund[];
}

interface RecentOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: RecentOrder[];
  currency: string;
  onRefund?: (order: RecentOrder) => void;
  onViewReceipt?: (order: RecentOrder) => void;
  onReopen?: (order: RecentOrder) => void;
}

export function RecentOrdersDialog({
  open,
  onOpenChange,
  orders,
  currency,
  onRefund,
  onViewReceipt,
  onReopen,
}: RecentOrdersDialogProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/20 text-green-600";
      case "refunded":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Check if order can be reopened (paid status and no refunds)
  const canReopen = (order: RecentOrder) => {
    return order.status === "paid" && (!order.refunds || order.refunds.length === 0);
  };

  // Check if order can be refunded (paid and not fully refunded)
  const canRefund = (order: RecentOrder) => {
    if (order.status !== "paid") return false;
    const totalRefunded = order.refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    return totalRefunded < Number(order.total);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Orders
          </DialogTitle>
          <DialogDescription>
            View completed orders from this shift
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed orders yet
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Order #{order.order_number}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {canReopen(order) && onReopen && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReopen(order)}
                          className="h-8"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reopen
                        </Button>
                      )}
                      {canRefund(order) && onRefund && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRefund(order)}
                          className="h-8"
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          Refund
                        </Button>
                      )}
                      {order.status === "paid" && onViewReceipt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewReceipt(order)}
                          className="h-8"
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "HH:mm")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Items</p>
                      <div className="text-sm space-y-1">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.quantity}× {item.name}
                            </span>
                            <span>{(Number(item.price) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Summary</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        {order.discount_value && Number(order.discount_value) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-{Number(order.discount_value).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>{Number(order.tax_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>{Number(order.total).toFixed(2)} {currency}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3 mb-1">Payments</p>
                      <div className="text-sm space-y-1">
                        {order.payments.map((payment) => (
                          <div key={payment.id} className="flex justify-between">
                            <span className="capitalize">{payment.method}</span>
                            <span>{Number(payment.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {order.refunds && order.refunds.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground mt-3 mb-1">Refunds</p>
                          <div className="text-sm space-y-1 text-destructive">
                            {order.refunds.map((refund) => (
                              <div key={refund.id} className="flex justify-between">
                                <span className="capitalize">{refund.refund_type}</span>
                                <span>-{Number(refund.amount).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
