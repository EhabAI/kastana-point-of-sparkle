import { Star, Check } from "lucide-react";
import { cn, formatJOD } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_offer: boolean;
  is_available: boolean;
  is_favorite?: boolean;
  promo_price?: number | null;
  promo_label?: string | null;
  category_name?: string;
}

interface MenuItemCardProps {
  item: MenuItem;
  currency: string;
  onSelect: (item: MenuItem) => void;
  onToggleFavorite?: (itemId: string, isFavorite: boolean) => void;
  showCategoryName?: boolean;
  isInOrder?: boolean;
}

export function MenuItemCard({ 
  item, 
  currency, 
  onSelect, 
  onToggleFavorite,
  showCategoryName = false,
  isInOrder = false
}: MenuItemCardProps) {
  const { language } = useLanguage();
  
  // Detect offer/deal (via is_offer, promo_price, or name keywords)
  const hasPromo = item.promo_price != null && item.promo_price > 0;
  const nameHasOfferKeyword = /happy|deal|offer|عروض/i.test(item.name);
  const isOffer = item.is_offer || hasPromo || nameHasOfferKeyword;

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleFavorite && item.is_available) {
      onToggleFavorite(item.id, !item.is_favorite);
    }
  };

  const cardContent = (
    <button
      onClick={() => onSelect(item)}
      disabled={!item.is_available}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all text-center min-h-[100px]",
        item.is_available
          ? "hover:border-primary hover:shadow-md bg-card"
          : "opacity-50 cursor-not-allowed bg-muted",
        // Offer items: subtle background tint and border highlight
        isOffer && item.is_available && "bg-destructive/5 border-destructive/40",
        // Items already in order: subtle primary border and background
        isInOrder && item.is_available && !isOffer && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
      )}
    >
      {/* In-order indicator - top-left checkmark */}
      {isInOrder && item.is_available && (
        <span className="absolute top-1.5 left-1.5 p-0.5 rounded-full bg-primary/10">
          <Check className="h-3 w-3 text-primary" />
        </span>
      )}
      {/* Star favorite toggle - top-right corner */}
      {onToggleFavorite && item.is_available && (
        <span
          onClick={handleStarClick}
          className={cn(
            "absolute top-1.5 right-1.5 p-1 rounded-full transition-colors cursor-pointer",
            "hover:bg-accent/50",
            item.is_favorite ? "text-warning" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
        >
          <Star 
            className={cn(
              "h-4 w-4 transition-all",
              item.is_favorite && "fill-warning"
            )} 
          />
        </span>
      )}
      {/* Red dot indicator for offers - adjusted position when in-order */}
      {isOffer && item.is_available && (
        <span className={cn(
          "absolute top-2 w-2.5 h-2.5 rounded-full bg-destructive",
          isInOrder ? "left-7" : "left-2"
        )} />
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

  // Wrap offer items with tooltip
  if (isOffer && item.is_available) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="bg-destructive text-destructive-foreground text-xs font-medium"
          >
            {item.promo_label || (language === "ar" ? "عرض خاص" : "Special Offer")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}
