import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderItemRow } from "./OrderItemRow";
import { OrderTotals } from "./OrderTotals";
import { Percent, CreditCard, Pause, X } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | null;
  voided: boolean;
}

interface OrderPanelProps {
  orderNumber?: number;
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
}

export function OrderPanel({
  orderNumber,
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
}: OrderPanelProps) {
  const activeItems = items.filter((item) => !item.voided);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Current Order</span>
          {orderNumber && (
            <span className="text-muted-foreground">#{orderNumber}</span>
          )}
        </CardTitle>
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
            disabled={!hasItems}
          >
            <Percent className="h-4 w-4 mr-1" />
            Discount
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHoldOrder}
            disabled={!hasItems}
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
            disabled={!hasItems || total <= 0}
          >
            <CreditCard className="h-4 w-4 mr-1" />
            Pay {total.toFixed(2)}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
