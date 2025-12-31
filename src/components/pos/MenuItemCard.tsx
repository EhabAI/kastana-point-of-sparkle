import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_offer: boolean;
  is_available: boolean;
  promo_price?: number | null;
  promo_label?: string | null;
}

interface MenuItemCardProps {
  item: MenuItem;
  currency: string;
  onSelect: (item: MenuItem) => void;
}

export function MenuItemCard({ item, currency, onSelect }: MenuItemCardProps) {
  // B3: Detect offer/deal (via is_offer, promo_price, or name keywords)
  const hasPromo = item.promo_price != null && item.promo_price > 0;
  const nameHasOfferKeyword = /happy|deal|offer|عروض/i.test(item.name);
  const isOffer = item.is_offer || hasPromo || nameHasOfferKeyword;
  const promoLabel = item.promo_label || (hasPromo ? "Promo" : "Offer");

  return (
    <button
      onClick={() => onSelect(item)}
      disabled={!item.is_available}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all text-center min-h-[100px]",
        item.is_available
          ? "hover:border-primary hover:shadow-md bg-card"
          : "opacity-50 cursor-not-allowed bg-muted",
        isOffer && item.is_available && "ring-2 ring-destructive/30"
      )}
    >
      {isOffer && (
        <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs">
          {promoLabel}
        </Badge>
      )}
      <span className="font-medium text-sm mb-1 line-clamp-2">{item.name}</span>
      <span className="text-primary font-bold">
        {Number(item.price).toFixed(2)} {currency}
      </span>
    </button>
  );
}
