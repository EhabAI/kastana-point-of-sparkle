import { cn } from "@/lib/utils";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";

export type OrderType = "dine-in" | "takeaway";

interface OrderTypeSelectorProps {
  selectedType: OrderType | null;
  onSelectType: (type: OrderType) => void;
}

export function OrderTypeSelector({ selectedType, onSelectType }: OrderTypeSelectorProps) {
  const types = [
    { id: "dine-in" as OrderType, label: "Dine In", icon: UtensilsCrossed },
    { id: "takeaway" as OrderType, label: "Takeaway", icon: ShoppingBag },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelectType(type.id)}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all",
            selectedType === type.id
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-muted hover:border-primary/50"
          )}
        >
          <type.icon className={cn(
            "h-5 w-5",
            selectedType === type.id ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "font-semibold text-sm",
            selectedType === type.id ? "text-primary" : "text-foreground"
          )}>{type.label}</span>
        </button>
      ))}
    </div>
  );
}
