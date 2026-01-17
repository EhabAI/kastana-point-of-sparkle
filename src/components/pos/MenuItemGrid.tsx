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
  category_name?: string;
}

interface MenuItemGridProps {
  items: MenuItem[];
  currency: string;
  onSelectItem: (item: MenuItem) => void;
  isLoading?: boolean;
  showCategoryName?: boolean;
}

export function MenuItemGrid({
  items,
  currency,
  onSelectItem,
  isLoading,
  showCategoryName = false,
}: MenuItemGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a category to view items
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            currency={currency}
            onSelect={onSelectItem}
            showCategoryName={showCategoryName}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
