import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderItemRow } from "./OrderItemRow";
import { OrderTotals } from "./OrderTotals";
import { Percent, CreditCard, Pause, Ban, User, Phone, Plus } from "lucide-react";
import { formatJOD, cn, getCurrencySymbol } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// Status badge configuration
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: "OPEN", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  held: { label: "HELD", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  paid: { label: "PAID", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  refunded: { label: "REFUNDED", className: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800" },
};

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
  onVoidOrder: () => void;
  hasItems: boolean;
  onTransferItem?: (itemId: string) => void;
  showTransfer?: boolean;
  onNewOrder: () => void;
  shiftOpen: boolean;
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
  onVoidOrder,
  hasItems,
  onTransferItem,
  showTransfer = false,
  onNewOrder,
  shiftOpen,
}: OrderPanelProps) {
  const { t, language } = useLanguage();
  const activeItems = items.filter((item) => !item.voided);
  const customerInfo = parseCustomerInfo(orderNotes);
  const orderType = parseOrderType(orderNotes);
  const isOpen = orderStatus === "open";
  const localizedCurrency = getCurrencySymbol(currency, language);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{t("current_order")}</span>
            {/* Status Badge */}
            {orderStatus && STATUS_CONFIG[orderStatus] && (
              <Badge 
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 border",
                  STATUS_CONFIG[orderStatus].className
                )}
              >
                {STATUS_CONFIG[orderStatus].label}
              </Badge>
            )}
            <Badge 
              variant={orderType === "DINE-IN" ? "default" : "secondary"}
              className="text-xs"
            >
              {orderType === "DINE-IN" ? t("dine_in") : t("takeaway")}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {orderNumber && (
              <span className="text-muted-foreground">#{orderNumber}</span>
            )}
            {shiftOpen && (
              <Button
                variant="default"
                size="sm"
                onClick={onNewOrder}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("new_order")}
              </Button>
            )}
          </div>
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
              {t("no_items_in_order")}
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
            className="text-muted-foreground hover:text-foreground"
          >
            <Percent className="h-4 w-4 mr-1.5" />
            {t("discount")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHoldOrder}
            disabled={!hasItems || !isOpen}
            className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/30"
          >
            <Pause className="h-4 w-4 mr-1.5" />
            {t("hold")}
          </Button>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onVoidOrder}
            disabled={!hasItems || !isOpen}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <Ban className="h-4 w-4 mr-1.5" />
            {t("void")}
          </Button>
          <Button
            size="lg"
            className="shadow-md"
            onClick={onPay}
            disabled={!hasItems || total <= 0 || !isOpen}
          >
            <CreditCard className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
            <span className="flex flex-col items-center leading-tight">
              <span className="text-xs font-normal opacity-80">{t("pay")}</span>
              <span className="text-xs font-semibold">{formatJOD(total)} {localizedCurrency}</span>
            </span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
