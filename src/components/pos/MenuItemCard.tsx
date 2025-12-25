import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_offer: boolean;
  is_available: boolean;
}

interface MenuItemCardProps {
  item: MenuItem;
  currency: string;
  onSelect: (item: MenuItem) => void;
}

export function MenuItemCard({ item, currency, onSelect }: MenuItemCardProps) {
  return (
    <button
      onClick={() => onSelect(item)}
      disabled={!item.is_available}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all text-center min-h-[100px]",
        item.is_available
          ? "hover:border-primary hover:shadow-md bg-card"
          : "opacity-50 cursor-not-allowed bg-muted"
      )}
    >
      {item.is_offer && (
        <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs">
          Offer
        </Badge>
      )}
      <span className="font-medium text-sm mb-1 line-clamp-2">{item.name}</span>
      <span className="text-primary font-bold">
        {Number(item.price).toFixed(2)} {currency}
      </span>
    </button>
  );
}
