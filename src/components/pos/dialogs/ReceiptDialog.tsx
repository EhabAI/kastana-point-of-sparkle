import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD, roundTo5Fils } from "@/lib/utils";

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

export interface ReceiptOrder {
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
  table_id?: string | null;
  order_items: OrderItem[];
  payments: Payment[];
}

interface Restaurant {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Table {
  id: string;
  table_name: string;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ReceiptOrder | null;
  restaurant?: Restaurant | null;
  branch?: Branch | null;
  currency: string;
  tables?: Table[];
  cashierEmail?: string | null;
  onRefund?: (order: ReceiptOrder) => void;
}

export function ReceiptDialog({
  open,
  onOpenChange,
  order,
  restaurant,
  branch,
  currency,
  tables = [],
  cashierEmail,
  onRefund,
}: ReceiptDialogProps) {
  const { t } = useLanguage();
  
  if (!order) return null;

  const getOrderTypeAndTable = () => {
    if (order.table_id) {
      const table = tables.find((t) => t.id === order.table_id);
      return { type: t("dine_in"), tableName: table?.table_name || null };
    }
    const notes = order.order_notes || "";
    const typeMatch = notes.match(/type:(\w+)/i);
    if (typeMatch) {
      return { type: typeMatch[1].toUpperCase(), tableName: null };
    }
    return { type: t("takeaway"), tableName: null };
  };

  const getCustomerInfo = () => {
    const notes = order.order_notes || "";
    const match = notes.match(/customer:([^;]*)/);
    if (!match) return null;
    const [name, phone] = match[1].split("|");
    if (!name && !phone) return null;
    return { name: name || "", phone: phone || "" };
  };

  const { type: orderType, tableName } = getOrderTypeAndTable();
  const customerInfo = getCustomerInfo();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh]">
        {/* Action buttons - compact */}
        <div className="no-print px-3 py-2 border-b bg-muted/50 flex gap-2">
          <Button onClick={handlePrint} className="flex-1 h-10" size="default">
            <Printer className="mr-1.5 h-4 w-4" />
            {t("print")}
          </Button>
          {order.status === "paid" && onRefund && (
            <Button variant="outline" onClick={() => onRefund(order)} className="h-10" size="default">
              <Undo2 className="mr-1.5 h-4 w-4" />
              {t("refund")}
            </Button>
          )}
        </div>

        {/* Receipt content - compact layout */}
        <div className="receipt-print-area px-4 py-3 bg-background overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* Header: Restaurant name, branch, date/time - compact */}
          <div className="text-center mb-2">
            {restaurant?.logo_url && (
              <img src={restaurant.logo_url} alt={restaurant.name} className="h-8 mx-auto mb-1 object-contain" />
            )}
            <h2 className="text-base font-bold leading-tight">{restaurant?.name || t("restaurant")}</h2>
            <p className="text-xs text-muted-foreground leading-tight">
              {branch?.name && <>{branch.name} • </>}
              {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
            </p>
            {cashierEmail && <p className="text-[10px] text-muted-foreground">{cashierEmail}</p>}
          </div>

          {/* Order info line - compact single row */}
          <div className="border-t border-b border-dashed py-1.5 mb-2 text-xs">
            <div className="flex justify-between items-center font-medium">
              <span>#{order.order_number}</span>
              <span className="uppercase text-[10px] px-1.5 py-0.5 bg-muted rounded">{orderType}</span>
              {tableName && <span>{tableName}</span>}
            </div>
            {orderType === t("takeaway") && customerInfo && (customerInfo.name || customerInfo.phone) && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {customerInfo.name}{customerInfo.name && customerInfo.phone && " • "}{customerInfo.phone}
              </div>
            )}
          </div>

          {/* Items list - compact single-line per item */}
          <div className="space-y-0.5 mb-2 text-xs">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between leading-tight py-0.5">
                <span className="truncate flex-1 pr-2">{item.quantity}× {item.name}</span>
                <span className="font-mono text-right shrink-0">{formatJOD(Number(item.price) * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Totals section - compact */}
          <div className="border-t border-dashed pt-1.5 space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span>{t("subtotal")}</span>
              <span className="font-mono">{formatJOD(Number(order.subtotal))}</span>
            </div>
            {order.discount_value && Number(order.discount_value) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t("discount")}{order.discount_type === "percentage" && ` ${order.discount_value}%`}</span>
                <span className="font-mono">
                  -{order.discount_type === "percentage"
                    ? formatJOD((Number(order.subtotal) * Number(order.discount_value)) / 100)
                    : formatJOD(Number(order.discount_value))}
                </span>
              </div>
            )}
            {Number(order.service_charge) > 0 && (
              <div className="flex justify-between">
                <span>{t("service_charge")}</span>
                <span className="font-mono">{formatJOD(Number(order.service_charge))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t("tax")}</span>
              <span className="font-mono">{formatJOD(Number(order.tax_amount))}</span>
            </div>
            {/* Total - emphasized (rounded to 5 fils for JOD) */}
            <div className="flex justify-between font-bold text-sm border-t border-dashed pt-1 mt-1">
              <span>{t("total")}</span>
              <span className="font-mono">
                {formatJOD(currency === "JOD" ? roundTo5Fils(Number(order.total)) : Number(order.total))} {currency}
              </span>
            </div>
          </div>

          {/* Payment methods - compact */}
          <div className="border-t border-dashed mt-2 pt-1.5">
            <div className="space-y-0.5 text-xs">
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between">
                  <span className="capitalize text-muted-foreground">{payment.method}</span>
                  <span className="font-mono">{formatJOD(Number(payment.amount))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Thank you - compact */}
          <div className="text-center text-[10px] text-muted-foreground mt-3 pt-2 border-t border-dashed">
            {t("thank_you")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
