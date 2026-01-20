import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, ChevronDown, ChevronUp, AlertCircle, MessageSquare } from "lucide-react";
import { cn, formatJOD } from "@/lib/utils";
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
import { useLanguage } from "@/contexts/LanguageContext";

interface QRPendingOrdersProps {
  orders: PendingOrder[];
  currency: string;
  onConfirm: (orderId: string) => void;
  onReject: (orderId: string, reason: string) => void;
  isLoading?: boolean;
}

// Live timer component for elapsed time
function LiveTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const updateElapsed = () => {
      const created = new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);

      if (diffMins >= 60) {
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setElapsed(`${hrs}h ${mins}m`);
      } else if (diffMins > 0) {
        setElapsed(`${diffMins}m ${diffSecs}s`);
      } else {
        setElapsed(`${diffSecs}s`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return <span className="font-mono text-sm font-semibold">{elapsed}</span>;
}

export function QRPendingOrders({
  orders,
  currency,
  onConfirm,
  onReject,
  isLoading,
}: QRPendingOrdersProps) {
  const { t } = useLanguage();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  const handleRejectClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectReason("");
    setReasonError(false);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    // Require reason
    if (!rejectReason.trim()) {
      setReasonError(true);
      return;
    }
    
    if (selectedOrderId) {
      onReject(selectedOrderId, rejectReason.trim());
      setRejectDialogOpen(false);
      setSelectedOrderId(null);
      setRejectReason("");
      setReasonError(false);
    }
  };

  // Sort by oldest first (already sorted by API, but ensure)
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (sortedOrders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
        <Clock className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">{t("qr_no_pending_orders")}</h3>
        <p className="text-sm text-center mb-4">{t("qr_orders_appear_here")}</p>
        <div className="text-xs text-muted-foreground/70 bg-muted/50 rounded-lg p-4 max-w-sm text-center space-y-1">
          <p>{t("no_qr_orders_possible_reasons")}</p>
          <ul className="list-disc ltr:text-left rtl:text-right ltr:pl-4 rtl:pr-4 mt-2 space-y-0.5">
            <li>{t("reason_no_qr_orders_yet")}</li>
            <li>{t("reason_different_branch")}</li>
            <li>{t("reason_already_processed")}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {sortedOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const tableAssigned = !!order.table_id;
            const tableDisplay = order.restaurant_tables?.table_code || order.restaurant_tables?.table_name || null;
            const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <Card key={order.id} className="overflow-hidden border-2 border-primary/20">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-semibold">
                        {t("order_prefix")} #{order.order_number}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {itemCount} {t("qr_items")}
                      </Badge>
                      <Badge variant={tableAssigned ? "secondary" : "outline"} className="text-xs">
                        {tableAssigned ? `${t("qr_table")} ${tableDisplay || ''}`.trim() : t("takeaway")}
                      </Badge>
                    </div>
                    {/* Live timer */}
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      <LiveTimer createdAt={order.created_at} />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="py-0 px-4">
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{t("qr_view_items")}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pb-3 space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="py-1 border-b last:border-0">
                          <div className="flex justify-between text-sm">
                            <span>{item.quantity}× {item.name}</span>
                            <span className="text-muted-foreground">
                              {formatJOD(item.price * item.quantity)} {currency}
                            </span>
                          </div>
                          {/* Item-level notes */}
                          {item.notes && (
                            <div className="flex items-start gap-1.5 mt-1 text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{item.notes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customer notes - max 2 lines with ellipsis */}
                  {order.notes && (
                    <div className="py-2 px-3 mb-2 rounded bg-muted/50 text-sm">
                      <span className="font-medium">{t("notes")}:</span>{" "}
                      <span className="line-clamp-2">{order.notes}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-t font-medium">
                    <span>{t("qr_total")}</span>
                    <span className="text-lg">{formatJOD(order.total)} {currency}</span>
                  </div>
                </CardContent>

                <CardFooter className="py-3 px-4 bg-muted/30 gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRejectClick(order.id)}
                    disabled={isLoading}
                  >
                    <X className="h-5 w-5 mr-2" />
                    {t("qr_reject")}
                  </Button>
                  <Button
                    className="flex-1 h-12 shadow-md"
                    onClick={() => onConfirm(order.id)}
                    disabled={isLoading}
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {t("qr_accept")}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Reject dialog with required reason */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("qr_reject_order")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("qr_reject_confirm_msg")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t("qr_reject_reason_placeholder")}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (e.target.value.trim()) setReasonError(false);
              }}
              className={cn(
                "min-h-[80px]",
                reasonError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {reasonError && (
              <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {t("qr_reject_reason_required")}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRejectConfirm();
              }}
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("qr_reject_order")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
