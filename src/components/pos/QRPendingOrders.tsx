import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { PendingOrder } from "@/hooks/pos/usePendingOrders";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface QRPendingOrdersProps {
  orders: PendingOrder[];
  currency: string;
  onConfirm: (orderId: string) => void;
  onReject: (orderId: string, reason?: string) => void;
  isLoading?: boolean;
}

export function QRPendingOrders({
  orders,
  currency,
  onConfirm,
  onReject,
  isLoading,
}: QRPendingOrdersProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedOrderId) {
      onReject(selectedOrderId, rejectReason || undefined);
      setRejectDialogOpen(false);
      setSelectedOrderId(null);
    }
  };

  const hasTable = (order: PendingOrder): boolean => {
    return !!order.table_id;
  };

  if (orders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <Clock className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-1">No Pending QR Orders</h3>
        <p className="text-sm">New QR orders will appear here</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const tableAssigned = hasTable(order);
            const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        Order #{order.order_number}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {itemCount} items
                      </Badge>
                      {tableAssigned && (
                        <Badge variant="secondary" className="text-xs">
                          Table
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="py-0 px-4">
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>View items</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pb-3 space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span>{item.quantity}× {item.name}</span>
                          <span className="text-muted-foreground">
                            {(item.price * item.quantity).toFixed(2)} {currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-t font-medium">
                    <span>Total</span>
                    <span className="text-lg">{order.total.toFixed(2)} {currency}</span>
                  </div>
                </CardContent>

                <CardFooter className="py-3 px-4 bg-muted/30 gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 h-12"
                    onClick={() => handleRejectClick(order.id)}
                    disabled={isLoading}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1 h-12"
                    onClick={() => onConfirm(order.id)}
                    disabled={isLoading}
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Confirm
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
