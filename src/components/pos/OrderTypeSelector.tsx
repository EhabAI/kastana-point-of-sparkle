import { cn } from "@/lib/utils";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";

export type OrderType = "dine-in" | "takeaway";

interface OrderTypeSelectorProps {
  selectedType: OrderType | null;
  onSelectType: (type: OrderType) => void;
}

export function OrderTypeSelector({ selectedType, onSelectType }: OrderTypeSelectorProps) {
  const types = [
    { 
      id: "dine-in" as OrderType, 
      label: "Dine In", 
      icon: UtensilsCrossed,
      description: "Customer will eat here",
    },
    { 
      id: "takeaway" as OrderType, 
      label: "Takeaway", 
      icon: ShoppingBag,
      description: "Customer will take order",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelectType(type.id)}
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all min-h-[120px]",
            selectedType === type.id
              ? "border-primary bg-primary/10"
              : "border-muted hover:border-primary/50"
          )}
        >
          <type.icon className={cn(
            "h-10 w-10 mb-3",
            selectedType === type.id ? "text-primary" : "text-muted-foreground"
          )} />
          <span className="font-bold text-lg">{type.label}</span>
          <span className="text-xs text-muted-foreground mt-1">{type.description}</span>
        </button>
      ))}
    </div>
  );
}
