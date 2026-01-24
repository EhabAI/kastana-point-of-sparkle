import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, MessageSquare, ArrowRightLeft, Hash } from "lucide-react";
import { NumericKeypad } from "./NumericKeypad";
import { formatJOD, getCurrencySymbol } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrderItemModifier {
  id: string;
  modifier_name: string;
  option_name: string;
  price_adjustment: number;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | null;
  voided: boolean;
  order_item_modifiers?: OrderItemModifier[];
}

interface OrderItemRowProps {
  item: OrderItem;
  currency: string;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onVoid: (itemId: string) => void;
  onAddNotes: (itemId: string) => void;
  onTransfer?: (itemId: string) => void;
  showTransfer?: boolean;
}

export function OrderItemRow({
  item,
  currency,
  onUpdateQuantity,
  onRemove,
  onVoid,
  onAddNotes,
  onTransfer,
  showTransfer,
}: OrderItemRowProps) {
  const [keypadOpen, setKeypadOpen] = useState(false);
  const { language } = useLanguage();
  const localizedCurrency = getCurrencySymbol(currency, language);

  if (item.voided) {
    return (
      <div className="flex items-center justify-between py-2 px-2 bg-muted/50 rounded opacity-50 line-through">
        <span className="text-sm">{item.name}</span>
        <span className="text-xs text-muted-foreground">VOIDED</span>
      </div>
    );
  }

  const lineTotal = Number(item.price) * item.quantity;
  const modifiers = item.order_item_modifiers || [];

  const handleKeypadConfirm = (value: number) => {
    if (value >= 1) {
      onUpdateQuantity(item.id, value);
    }
  };

  return (
    <>
      <div className="space-y-1 py-2 border-b last:border-b-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium flex-1">{item.name}</span>
          <span className="text-sm font-medium">
            {formatJOD(lineTotal)} {localizedCurrency}
          </span>
        </div>

        {/* Show modifiers */}
        {modifiers.length > 0 && (
          <div className="pl-2 space-y-0.5">
            {modifiers.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="italic">+ {mod.option_name}</span>
                {mod.price_adjustment !== 0 && (
                  <span>
                    {mod.price_adjustment > 0 ? "+" : ""}
                    {formatJOD(mod.price_adjustment)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="h-2.5 w-2.5" />
            </Button>
            <span className="w-6 text-center text-xs">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="h-2.5 w-2.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => setKeypadOpen(true)}
              title="Enter quantity"
            >
              <Hash className="h-2.5 w-2.5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            {showTransfer && onTransfer && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onTransfer(item.id)}
                title="Transfer to another order"
              >
                <ArrowRightLeft className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddNotes(item.id)}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(item.id);
              }}
              title="Remove item"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {item.notes && (
          <p className="text-xs text-muted-foreground italic pl-1">
            Note: {item.notes}
          </p>
        )}
      </div>

      <NumericKeypad
        open={keypadOpen}
        onOpenChange={setKeypadOpen}
        title="Enter Quantity"
        initialValue={item.quantity.toString()}
        allowDecimals={false}
        minValue={1}
        onConfirm={handleKeypadConfirm}
      />
    </>
  );
}
