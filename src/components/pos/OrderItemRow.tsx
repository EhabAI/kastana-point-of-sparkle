import { Button } from "@/components/ui/button";
import { Minus, Plus, X, MessageSquare } from "lucide-react";

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
}

export function OrderItemRow({
  item,
  currency,
  onUpdateQuantity,
  onRemove,
  onVoid,
  onAddNotes,
}: OrderItemRowProps) {
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

  return (
    <div className="space-y-1 py-2 border-b last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex-1">{item.name}</span>
        <span className="text-sm font-medium">
          {lineTotal.toFixed(2)} {currency}
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
                  {mod.price_adjustment.toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
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
            onClick={() => onRemove(item.id)}
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

      <div className="text-xs text-muted-foreground">
        {Number(item.price).toFixed(2)} × {item.quantity}
      </div>
    </div>
  );
}
