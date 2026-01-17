import { cn, formatJOD } from "@/lib/utils";

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

interface MenuItemCardProps {
  item: MenuItem;
  currency: string;
  onSelect: (item: MenuItem) => void;
  showCategoryName?: boolean;
}

export function MenuItemCard({ item, currency, onSelect, showCategoryName = false }: MenuItemCardProps) {
  // Detect offer/deal (via is_offer, promo_price, or name keywords)
  const hasPromo = item.promo_price != null && item.promo_price > 0;
  const nameHasOfferKeyword = /happy|deal|offer|عروض/i.test(item.name);
  const isOffer = item.is_offer || hasPromo || nameHasOfferKeyword;

  return (
    <button
      onClick={() => onSelect(item)}
      disabled={!item.is_available}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all text-center min-h-[100px]",
        item.is_available
          ? "hover:border-primary hover:shadow-md bg-card"
          : "opacity-50 cursor-not-allowed bg-muted",
        // Offer items: subtle background tint and border highlight
        isOffer && item.is_available && "bg-destructive/5 border-destructive/40"
      )}
    >
      {/* Red dot indicator for offers - top-left corner */}
      {isOffer && item.is_available && (
        <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-destructive" />
      )}
      <span className="font-medium text-sm mb-1 line-clamp-2">{item.name}</span>
      {showCategoryName && item.category_name && (
        <span className="text-xs text-muted-foreground mb-1 line-clamp-1">
          {item.category_name}
        </span>
      )}
      <span className="text-primary font-bold">
        {formatJOD(Number(item.price))} {currency}
      </span>
    </button>
  );
}
