import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Receipt, Undo2, RotateCcw, Search, X } from "lucide-react";
import { format } from "date-fns";
import { formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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

type StatusFilter = "all" | "paid" | "refunded";

export function RecentOrdersDialog({
  open,
  onOpenChange,
  orders,
  currency,
  onRefund,
  onViewReceipt,
  onReopen,
}: RecentOrdersDialogProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Reset filters when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearchQuery("");
      setStatusFilter("all");
    }
    onOpenChange(isOpen);
  };

  // Filter orders based on search and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter - match order number
      const matchesSearch = searchQuery === "" || 
        order.order_number.toString().includes(searchQuery);
      
      // Status filter
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

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

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "paid", label: t("paid") },
    { value: "refunded", label: t("refunded") },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("recent_orders")}
          </DialogTitle>
          <DialogDescription>
            {t("view_completed_orders")}
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter Bar */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 pb-3 border-b">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search_by_order_number")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex gap-1">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className="h-9"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        {orders.length > 0 && (
          <div className="flex-shrink-0 text-sm text-muted-foreground py-2">
            {t("showing")} {filteredOrders.length} {t("of")} {orders.length} {t("orders")}
          </div>
        )}

        {/* Orders List */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("no_completed_orders")}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("no_orders_match_filter")}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t("order_prefix")} #{order.order_number}</span>
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
                          {t("reopen")}
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
                          {t("refund")}
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
                          {t("receipt")}
                        </Button>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "HH:mm")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("items")}</p>
                      <div className="text-sm space-y-1">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.quantity}× {item.name}
                            </span>
                            <span>{formatJOD(Number(item.price) * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("summary")}</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>{t("subtotal")}</span>
                          <span>{formatJOD(Number(order.subtotal))}</span>
                        </div>
                        {order.discount_value && Number(order.discount_value) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>{t("discount")}</span>
                            <span>-{formatJOD(Number(order.discount_value))}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>{t("tax")}</span>
                          <span>{formatJOD(Number(order.tax_amount))}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>{t("total")}</span>
                          <span>{formatJOD(Number(order.total))} {currency}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3 mb-1">{t("payments")}</p>
                      <div className="text-sm space-y-1">
                        {order.payments.map((payment) => (
                          <div key={payment.id} className="flex justify-between">
                            <span className="capitalize">{payment.method}</span>
                            <span>{formatJOD(Number(payment.amount))}</span>
                          </div>
                        ))}
                      </div>

                      {order.refunds && order.refunds.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground mt-3 mb-1">{t("refunds")}</p>
                          <div className="text-sm space-y-1 text-destructive">
                            {order.refunds.map((refund) => (
                              <div key={refund.id} className="flex justify-between">
                                <span className="capitalize">{refund.refund_type}</span>
                                <span>-{formatJOD(Number(refund.amount))}</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
