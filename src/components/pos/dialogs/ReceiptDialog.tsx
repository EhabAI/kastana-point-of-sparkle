import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Undo2 } from "lucide-react";
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
  if (!order) return null;

  // Parse order type and table using table_id column
  const getOrderTypeAndTable = () => {
    // Use table_id if available
    if (order.table_id) {
      const table = tables.find((t) => t.id === order.table_id);
      return { type: "DINE-IN", tableName: table?.table_name || null };
    }
    // Fallback to notes for order type (for legacy orders)
    const notes = order.order_notes || "";
    const typeMatch = notes.match(/type:(\w+)/i);
    if (typeMatch) {
      return { type: typeMatch[1].toUpperCase(), tableName: null };
    }
    return { type: "TAKEAWAY", tableName: null };
  };

  // Parse customer info from order_notes
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
        {/* Action buttons - hidden during print */}
        <div className="no-print p-4 border-b bg-muted/50 flex gap-2">
          <Button
            onClick={handlePrint}
            className="flex-1 h-12 text-base"
            size="lg"
          >
            <Printer className="mr-2 h-5 w-5" />
            Print
          </Button>
          {order.status === "paid" && onRefund && (
            <Button
              variant="outline"
              onClick={() => onRefund(order)}
              className="h-12 text-base"
              size="lg"
            >
              <Undo2 className="mr-2 h-5 w-5" />
              Refund
            </Button>
          )}
        </div>

        {/* Receipt content - this is what prints */}
        <div className="receipt-print-area p-6 bg-background">
          {/* Header */}
          <div className="text-center mb-6">
            {restaurant?.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-12 mx-auto mb-2 object-contain"
              />
            )}
            <h2 className="text-lg font-bold">{restaurant?.name || "Restaurant"}</h2>
            {branch?.name && (
              <p className="text-sm text-muted-foreground">{branch.name}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
            </p>
            {cashierEmail && (
              <p className="text-xs text-muted-foreground mt-1">
                Cashier: {cashierEmail}
              </p>
            )}
          </div>

          {/* Order Info */}
          <div className="border-t border-b border-dashed py-3 mb-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Order #{order.order_number}</span>
              <span className="uppercase">{orderType}</span>
            </div>
            {tableName && (
              <div className="text-sm text-muted-foreground mt-1">
                Table: {tableName}
              </div>
            )}
            {/* Customer info for takeaway */}
            {orderType === "TAKEAWAY" && customerInfo && (customerInfo.name || customerInfo.phone) && (
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {customerInfo.name && <div>Customer: {customerInfo.name}</div>}
                {customerInfo.phone && <div>Phone: {customerInfo.phone}</div>}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2 mb-4">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span className="font-mono">
                  {(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono">{Number(order.subtotal).toFixed(2)}</span>
            </div>

            {order.discount_value && Number(order.discount_value) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount
                  {order.discount_type === "percentage" && ` (${order.discount_value}%)`}
                </span>
                <span className="font-mono">
                  -{order.discount_type === "percentage"
                    ? ((Number(order.subtotal) * Number(order.discount_value)) / 100).toFixed(2)
                    : Number(order.discount_value).toFixed(2)}
                </span>
              </div>
            )}

            {Number(order.service_charge) > 0 && (
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span className="font-mono">{Number(order.service_charge).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Tax</span>
              <span className="font-mono">{Number(order.tax_amount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-bold text-base border-t border-dashed pt-2 mt-2">
              <span>Total</span>
              <span className="font-mono">
                {Number(order.total).toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {/* Payments */}
          <div className="border-t border-dashed mt-4 pt-3">
            <p className="text-xs text-muted-foreground mb-2">Payment Method(s)</p>
            <div className="space-y-1 text-sm">
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between">
                  <span className="capitalize">{payment.method}</span>
                  <span className="font-mono">{Number(payment.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t border-dashed">
            Thank you for your visit!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
