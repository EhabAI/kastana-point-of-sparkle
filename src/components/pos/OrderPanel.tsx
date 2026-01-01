import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderItemRow } from "./OrderItemRow";
import { OrderTotals } from "./OrderTotals";
import { Percent, CreditCard, Pause, X, User, Phone } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | null;
  voided: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string;
}

interface OrderPanelProps {
  orderNumber?: number;
  orderStatus?: string;
  orderNotes?: string | null;
  items: OrderItem[];
  subtotal: number;
  discountType?: string | null;
  discountValue?: number | null;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  currency: string;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onVoidItem: (itemId: string) => void;
  onAddNotes: (itemId: string) => void;
  onApplyDiscount: () => void;
  onPay: () => void;
  onHoldOrder: () => void;
  onCancelOrder: () => void;
  hasItems: boolean;
  onTransferItem?: (itemId: string) => void;
  showTransfer?: boolean;
}

// Parse customer info from order_notes
function parseCustomerInfo(notes: string | null | undefined): CustomerInfo | null {
  if (!notes) return null;
  const match = notes.match(/customer:([^;]*)/);
  if (!match) return null;
  const [name, phone] = match[1].split("|");
  if (!name && !phone) return null;
  return { name: name || "", phone: phone || "" };
}

// Parse order type from order_notes (now uses table_id on order, but fallback for display)
function parseOrderType(notes: string | null | undefined, hasTable?: boolean): "DINE-IN" | "TAKEAWAY" {
  if (hasTable) return "DINE-IN";
  if (!notes) return "TAKEAWAY";
  if (notes.includes("type:takeaway")) return "TAKEAWAY";
  return "TAKEAWAY";
}

export function OrderPanel({
  orderNumber,
  orderStatus,
  orderNotes,
  items,
  subtotal,
  discountType,
  discountValue,
  taxRate,
  taxAmount,
  serviceCharge,
  total,
  currency,
  onUpdateQuantity,
  onRemoveItem,
  onVoidItem,
  onAddNotes,
  onApplyDiscount,
  onPay,
  onHoldOrder,
  onCancelOrder,
  hasItems,
  onTransferItem,
  showTransfer,
}: OrderPanelProps) {
  const activeItems = items.filter((item) => !item.voided);
  const customerInfo = parseCustomerInfo(orderNotes);
  const orderType = parseOrderType(orderNotes);
  const isOpen = orderStatus === "open";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Current Order</span>
            <Badge 
              variant={orderType === "DINE-IN" ? "default" : "secondary"}
              className="text-xs"
            >
              {orderType}
            </Badge>
          </div>
          {orderNumber && (
            <span className="text-muted-foreground">#{orderNumber}</span>
          )}
        </CardTitle>
        {/* Customer info for takeaway */}
        {orderType === "TAKEAWAY" && customerInfo && (customerInfo.name || customerInfo.phone) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
            {customerInfo.name && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {customerInfo.name}
              </span>
            )}
            {customerInfo.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {customerInfo.phone}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          {activeItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No items in order
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                  onVoid={onVoidItem}
                  onAddNotes={onAddNotes}
                  onTransfer={onTransferItem}
                  showTransfer={showTransfer}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-col p-4 border-t space-y-4">
        <OrderTotals
          subtotal={subtotal}
          discountType={discountType}
          discountValue={discountValue}
          taxRate={taxRate}
          taxAmount={taxAmount}
          serviceCharge={serviceCharge}
          total={total}
          currency={currency}
        />

        <div className="w-full grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onApplyDiscount}
            disabled={!hasItems || !isOpen}
          >
            <Percent className="h-4 w-4 mr-1" />
            Discount
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHoldOrder}
            disabled={!hasItems || !isOpen}
          >
            <Pause className="h-4 w-4 mr-1" />
            Hold
          </Button>
        </div>

        <div className="w-full grid grid-cols-2 gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancelOrder}
            disabled={!hasItems}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="lg"
            className="font-bold"
            onClick={onPay}
            disabled={!hasItems || total <= 0 || !isOpen}
          >
            <CreditCard className="h-4 w-4 mr-1" />
            Pay {total.toFixed(2)}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
