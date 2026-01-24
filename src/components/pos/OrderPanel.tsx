import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderItemRow } from "./OrderItemRow";
import { OrderTotals } from "./OrderTotals";
import { OrderBadges, getOrderStatusBackground } from "./OrderBadges";
import { Percent, CreditCard, Pause, Ban, User, Phone, Plus, ChefHat } from "lucide-react";
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
  kitchen_sent_at?: string | null;
}

interface CustomerInfo {
  name: string;
  phone: string;
}

interface OrderPanelProps {
  orderNumber?: number;
  orderStatus?: string;
  orderNotes?: string | null;
  orderSource?: string;
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
  hasRefund?: boolean;
  hasTable?: boolean;
  // Send to Kitchen props
  kdsEnabled?: boolean;
  onSendToKitchen?: () => void;
  isSendingToKitchen?: boolean;
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
  orderSource,
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
  hasRefund = false,
  hasTable = false,
  kdsEnabled = false,
  onSendToKitchen,
  isSendingToKitchen = false,
}: OrderPanelProps) {
  const { t, language } = useLanguage();
  const activeItems = items.filter((item) => !item.voided);
  const customerInfo = parseCustomerInfo(orderNotes);
  const orderType = hasTable ? "DINE-IN" : "TAKEAWAY";
  const isOpen = orderStatus === "open";
  const localizedCurrency = getCurrencySymbol(currency, language);
  const hasDiscount = (discountValue && discountValue > 0) || false;
  const hasOrderNotes = orderNotes && !orderNotes.startsWith("customer:") && !orderNotes.startsWith("type:");
  const orderBg = getOrderStatusBackground(orderStatus, hasDiscount);

  // Count pending items (not yet sent to kitchen)
  const pendingKitchenItems = activeItems.filter((item) => !item.kitchen_sent_at);
  const hasPendingKitchenItems = pendingKitchenItems.length > 0;

  // Total quantity of items in order
  const totalItemsCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className={cn("h-full flex flex-col", orderBg)}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Title + Item Count */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold truncate">{t("current_order")}</span>
            {totalItemsCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                {totalItemsCount}
              </Badge>
            )}
          </div>
          
          {/* Center: Order Number */}
          {orderNumber && (
            <span className="text-xs text-muted-foreground font-medium shrink-0">#{orderNumber}</span>
          )}
          
          {/* Right: Status + Order Type + New Order Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {orderStatus && STATUS_CONFIG[orderStatus] && (
              <Badge 
                variant="outline"
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0 h-5 border",
                  STATUS_CONFIG[orderStatus].className
                )}
              >
                {STATUS_CONFIG[orderStatus].label} · {orderType === "DINE-IN" ? t("dine_in") : t("takeaway")}
              </Badge>
            )}
            {/* Inline Order Indicators */}
            <OrderBadges
              source={orderSource}
              hasDiscount={hasDiscount}
              hasRefund={hasRefund}
              hasNotes={!!hasOrderNotes}
              compact
            />
            {shiftOpen && (
              <Button
                variant="outline"
                size="icon"
                onClick={onNewOrder}
                className="h-6 w-6"
                title={t("new_order")}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
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

      <CardFooter className="flex-col p-3 pt-2 border-t space-y-2">
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

        <div className="w-full grid grid-cols-3 gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onApplyDiscount}
            disabled={!hasItems || !isOpen}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
          >
            <Percent className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
            {t("discount")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHoldOrder}
            disabled={!hasItems || !isOpen}
            className="h-7 text-[11px] px-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/30"
          >
            <Pause className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
            {t("hold")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onVoidOrder}
            disabled={!hasItems || !isOpen}
            className="h-7 text-[11px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <Ban className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
            {t("void")}
          </Button>
        </div>

        {/* Send to Kitchen Button - compact, secondary style */}
        {onSendToKitchen && hasItems && isOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSendToKitchen}
            disabled={isSendingToKitchen || !hasPendingKitchenItems}
            className={cn(
              "w-full h-10 text-sm border-primary text-primary",
              hasPendingKitchenItems 
                ? "bg-primary/5 hover:bg-primary/10" 
                : "bg-muted/50 opacity-60 cursor-not-allowed"
            )}
          >
            {isSendingToKitchen ? (
              <span className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <ChefHat className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
            )}
            {hasPendingKitchenItems ? (
              <span className="flex items-center gap-1">
                <span>{t("send_to_kitchen")}</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {pendingKitchenItems.length}
                </Badge>
              </span>
            ) : (
              <span>{t("sent_to_kitchen")}</span>
            )}
          </Button>
        )}

        {/* Pay Button - primary action, slightly reduced padding */}
        <Button
          size="default"
          className={cn(
            "w-full h-11 text-sm font-medium shadow-sm transition-all duration-200",
            hasItems && total > 0 && isOpen
              ? "shadow-md shadow-primary/20 ring-1 ring-primary/20 hover:shadow-lg hover:shadow-primary/25"
              : "opacity-70"
          )}
          onClick={onPay}
          disabled={!hasItems || total <= 0 || !isOpen}
        >
          <CreditCard className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
          <span className="flex items-center gap-1.5">
            <span>{t("pay")}</span>
            <span className="font-semibold">{formatJOD(total)} {localizedCurrency}</span>
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
}
