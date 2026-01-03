import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="no-print p-4 border-b bg-muted/50 flex gap-2">
          <Button onClick={handlePrint} className="flex-1 h-12 text-base" size="lg">
            <Printer className="mr-2 h-5 w-5" />
            {t("print")}
          </Button>
          {order.status === "paid" && onRefund && (
            <Button variant="outline" onClick={() => onRefund(order)} className="h-12 text-base" size="lg">
              <Undo2 className="mr-2 h-5 w-5" />
              {t("refund")}
            </Button>
          )}
        </div>

        <div className="receipt-print-area p-6 bg-background">
          <div className="text-center mb-6">
            {restaurant?.logo_url && (
              <img src={restaurant.logo_url} alt={restaurant.name} className="h-12 mx-auto mb-2 object-contain" />
            )}
            <h2 className="text-lg font-bold">{restaurant?.name || t("restaurant")}</h2>
            {branch?.name && <p className="text-sm text-muted-foreground">{branch.name}</p>}
            <p className="text-sm text-muted-foreground">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}</p>
            {cashierEmail && <p className="text-xs text-muted-foreground mt-1">{t("cashier")}: {cashierEmail}</p>}
          </div>

          <div className="border-t border-b border-dashed py-3 mb-4">
            <div className="flex justify-between text-sm font-medium">
              <span>{t("order")} #{order.order_number}</span>
              <span className="uppercase">{orderType}</span>
            </div>
            {tableName && <div className="text-sm text-muted-foreground mt-1">{t("table")}: {tableName}</div>}
            {orderType === t("takeaway") && customerInfo && (customerInfo.name || customerInfo.phone) && (
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {customerInfo.name && <div>{t("customer")}: {customerInfo.name}</div>}
                {customerInfo.phone && <div>{t("phone")}: {customerInfo.phone}</div>}
              </div>
            )}
          </div>

          <div className="space-y-2 mb-4">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.quantity} × {item.name}</span>
                <span className="font-mono">{formatJOD(Number(item.price) * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{t("subtotal")}</span>
              <span className="font-mono">{formatJOD(Number(order.subtotal))}</span>
            </div>
            {order.discount_value && Number(order.discount_value) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t("discount")} {order.discount_type === "percentage" && `(${order.discount_value}%)`}</span>
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
            <div className="flex justify-between font-bold text-base border-t border-dashed pt-2 mt-2">
              <span>{t("total")}</span>
              <span className="font-mono">{formatJOD(Number(order.total))} {currency}</span>
            </div>
          </div>

          <div className="border-t border-dashed mt-4 pt-3">
            <p className="text-xs text-muted-foreground mb-2">{t("payment_methods_label")}</p>
            <div className="space-y-1 text-sm">
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between">
                  <span className="capitalize">{payment.method}</span>
                  <span className="font-mono">{formatJOD(Number(payment.amount))}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t border-dashed">
            {t("thank_you")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
