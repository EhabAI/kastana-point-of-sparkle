import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Clock, CreditCard, PlayCircle, X, AlertTriangle, Trash2, Ban, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { cn, formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
  onPayTable?: () => void; // New: group pay all orders
  onVoidOrder?: (orderId: string) => void;
  onCancelEmptyOrder?: (orderId: string) => void;
  isLoading?: boolean;
}

export function TableOrdersDialog({
  open,
  onOpenChange,
  tableName,
  orders,
  currency,
  onResumeOrder,
  onPayOrder,
  onPayTable,
  onVoidOrder,
  onCancelEmptyOrder,
  isLoading,
}: TableOrdersDialogProps) {
  const { t } = useLanguage();
  // CRITICAL FIX: Selection state must be managed carefully to avoid race conditions
  // The selectedOrderId MUST always reference a valid order.id, not an array index
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "open":
        return t("open").toUpperCase();
      case "held":
        return t("on_hold");
      case "confirmed":
        return t("confirmed");
      default:
        return status.toUpperCase();
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "open":
        return "default";
      case "held":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Sort orders for display - this is purely for rendering order
  // Selection is ALWAYS by order.id, never by array position
  const sortedOrders = useMemo(() => {
    const statusPriority: Record<string, number> = {
      new: 1,
      open: 2,
      confirmed: 3,
      held: 4,
    };
    return [...orders].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [orders]);

  // CRITICAL: Auto-select first order ONLY when dialog opens fresh (selectedOrderId is null)
  // Do NOT re-select when orders array changes during an open dialog
  useEffect(() => {
    if (open && sortedOrders.length > 0 && selectedOrderId === null) {
      // Dialog just opened with no selection - select first order
      setSelectedOrderId(sortedOrders[0].id);
    }
  }, [open, sortedOrders, selectedOrderId]);

  // Validate selection: if selectedOrderId no longer exists in orders, reset to first
  useEffect(() => {
    if (open && selectedOrderId && sortedOrders.length > 0) {
      const exists = sortedOrders.some(o => o.id === selectedOrderId);
      if (!exists) {
        // Selected order was removed (e.g., voided) - select first remaining
        setSelectedOrderId(sortedOrders[0].id);
      }
    }
  }, [open, sortedOrders, selectedOrderId]);

  // Reset selection when dialog closes - ensures fresh state on reopen
  useEffect(() => {
    if (!open) {
      setSelectedOrderId(null);
    }
  }, [open]);

  // CRITICAL: Always resolve selected order by ID, never by array index
  const selectedOrder = sortedOrders.find((o) => o.id === selectedOrderId);
  const showDirectActions = orders.length === 1;

  // CRITICAL FIX: All handlers must verify the order exists before acting
  // This prevents race conditions where selectedOrderId might be stale
  const handleResumeClick = () => {
    if (!selectedOrderId) return;
    // Verify the order still exists in the current orders array
    const order = sortedOrders.find(o => o.id === selectedOrderId);
    if (!order) {
      console.warn('[TableOrdersDialog] Resume: Order not found in current list', selectedOrderId);
      return;
    }
    console.log('[TableOrdersDialog] Resume order:', order.id, 'number:', order.order_number);
    onResumeOrder(order.id); // Use order.id from verified object, not raw selectedOrderId
    onOpenChange(false);
  };

  const handlePayClick = () => {
    if (!selectedOrderId) return;
    const order = sortedOrders.find(o => o.id === selectedOrderId);
    if (!order) {
      console.warn('[TableOrdersDialog] Pay: Order not found in current list', selectedOrderId);
      return;
    }
    console.log('[TableOrdersDialog] Pay order:', order.id, 'number:', order.order_number);
    onPayOrder(order.id);
    onOpenChange(false);
  };

  const handleCancelEmptyClick = (orderId: string) => {
    if (onCancelEmptyOrder) {
      console.log('[TableOrdersDialog] Cancel empty order:', orderId);
      onCancelEmptyOrder(orderId);
    }
  };

  const handleVoidClick = () => {
    if (!selectedOrderId || !onVoidOrder) return;
    const order = sortedOrders.find(o => o.id === selectedOrderId);
    if (!order) {
      console.warn('[TableOrdersDialog] Void: Order not found in current list', selectedOrderId);
      return;
    }
    console.log('[TableOrdersDialog] Void order:', order.id, 'number:', order.order_number);
    // Don't close dialog here - let the parent handle it after void is complete
    onVoidOrder(order.id);
  };

  // Check if selected order is empty
  const isSelectedOrderEmpty = selectedOrder && 
    selectedOrder.order_items.filter((i) => !i.voided).length === 0;
  
  // Can void only open orders that are not empty
  const canVoidSelectedOrder = selectedOrder && 
    selectedOrder.status === "open" && 
    !isSelectedOrderEmpty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t("table")} {tableName} – {t("table_active_orders")}
          </DialogTitle>
          <DialogDescription>
            {orders.length === 1
              ? `1 ${t("active_order_count")}`
              : `${orders.length} ${t("active_orders_count")}`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-scroll pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
          <div className="space-y-2 pr-2">
            {sortedOrders.map((order) => {
              const activeItems = order.order_items.filter((i) => !i.voided);
              const isSelected = selectedOrderId === order.id;
              const isEmpty = activeItems.length === 0;

              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    console.log('[TableOrdersDialog] Selected order:', order.id, 'number:', order.order_number);
                    setSelectedOrderId(order.id);
                  }}
                  disabled={isLoading}
                  className={cn(
                    "w-full p-4 border rounded-lg text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-1"
                      : "hover:border-primary/50 hover:bg-muted/50",
                    isEmpty && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{order.order_number}</span>
                      <Badge variant={getStatusVariant(order.status)} className="text-xs">
                        {getStatusLabel(order.status)}
                      </Badge>
                      {isEmpty && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {t("empty")}
                        </Badge>
                      )}
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
                      <span className="text-primary"> +{activeItems.length - 3} {t("more")}</span>
                    )}
                    {isEmpty && (
                      <span className="italic text-destructive">{t("no_items_empty_order")}</span>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-lg font-bold text-primary">
                    {formatJOD(Number(order.total))} {currency}
                  </div>

                  {/* Cancel empty order button */}
                  {isEmpty && onCancelEmptyOrder && isSelected && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEmptyClick(order.id);
                      }}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("cancel_empty_order")}
                    </Button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {onVoidOrder && (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 min-w-[60px] text-xs px-2 py-1 h-8"
              onClick={handleVoidClick}
              disabled={isLoading || !selectedOrderId || !canVoidSelectedOrder}
            >
              <Ban className="h-3 w-3 mr-1" />
              {t("void_order")}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-[70px]"
            onClick={handleResumeClick}
            disabled={isLoading || !selectedOrderId}
          >
            <PlayCircle className="h-3.5 w-3.5 mr-1" />
            {t("resume_add_items")}
          </Button>
          
          {/* Single order: individual pay. Multiple orders: show Pay Table instead */}
          {orders.length === 1 ? (
            <Button
              size="sm"
              className="flex-1 min-w-[60px] text-xs px-2 py-1 h-8"
              onClick={handlePayClick}
              disabled={isLoading || !selectedOrderId || selectedOrder?.status !== "open" || isSelectedOrderEmpty}
            >
              <CreditCard className="h-3 w-3 mr-1" />
              {t("pay_close")}
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 min-w-[80px] text-xs px-2 py-1 h-8 bg-primary"
              onClick={() => onPayTable?.()}
              disabled={isLoading || orders.length === 0}
            >
              <Users className="h-3 w-3 mr-1" />
              {t("pay_table")} ({orders.length})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
