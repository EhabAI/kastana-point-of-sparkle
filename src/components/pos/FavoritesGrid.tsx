import { Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MenuItemCard } from "./MenuItemCard";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_offer: boolean;
  is_available: boolean;
  promo_price?: number | null;
  promo_label?: string | null;
}

interface FavoritesGridProps {
  items: MenuItem[];
  currency: string;
  onSelectItem: (item: MenuItem) => void;
  isLoading?: boolean;
}

export function FavoritesGrid({
  items,
  currency,
  onSelectItem,
  isLoading,
}: FavoritesGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
        <Star className="h-16 w-16 text-muted-foreground/30" />
        <div className="text-center">
          <h3 className="font-medium text-lg mb-2">No Favorites Yet</h3>
          <p className="text-sm max-w-xs">
            Mark menu items as favorites to access them quickly from this screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            currency={currency}
            onSelect={onSelectItem}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
