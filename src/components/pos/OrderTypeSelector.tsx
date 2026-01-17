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
      selectedClasses: "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500",
      selectedText: "text-blue-600 dark:text-blue-400",
      hoverClass: "hover:border-blue-400/50"
    },
    { 
      id: "takeaway" as OrderType, 
      label: "Takeaway", 
      icon: ShoppingBag,
      selectedClasses: "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500",
      selectedText: "text-emerald-600 dark:text-emerald-400",
      hoverClass: "hover:border-emerald-400/50"
    },
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
              ? type.selectedClasses
              : cn("border-muted", type.hoverClass)
          )}
        >
          <type.icon className={cn(
            "h-5 w-5",
            selectedType === type.id ? type.selectedText : "text-muted-foreground"
          )} />
          <span className={cn(
            "font-semibold text-sm",
            selectedType === type.id ? type.selectedText : "text-foreground"
          )}>{type.label}</span>
        </button>
      ))}
    </div>
  );
}
