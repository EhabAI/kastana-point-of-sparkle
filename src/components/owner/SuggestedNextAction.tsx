/**
 * Suggested Next Action Component
 * Shows contextual suggestions after key states
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryEnabled } from "@/hooks/useInventoryEnabled";
import { startOfDay, endOfDay, differenceInHours } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LogOut, 
  Package, 
  ShoppingCart,
  Lightbulb,
  ArrowRight
} from "lucide-react";

interface SuggestedNextActionProps {
  restaurantId: string;
  onNavigate?: (tab: string) => void;
}

type SuggestionType = "close_shift" | "review_inventory" | "complete_orders" | null;

export function SuggestedNextAction({ restaurantId, onNavigate }: SuggestedNextActionProps) {
  const { t, language } = useLanguage();
  const { isEnabled: inventoryEnabled } = useInventoryEnabled();
  
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  
  const { data: suggestion } = useQuery({
    queryKey: ["suggested-action", restaurantId, todayStart],
    queryFn: async () => {
      // Check for long open shifts
      const { data: openShifts } = await supabase
        .from("shifts")
        .select("id, opened_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "open");
      
      const longShift = openShifts?.find(s => {
        const hoursOpen = differenceInHours(new Date(), new Date(s.opened_at));
        return hoursOpen >= 10;
      });
      
      if (longShift) {
        return { type: "close_shift" as SuggestionType, priority: 1 };
      }
      
      // Check for held orders
      const { data: heldOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("status", "held")
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      if (heldOrders && heldOrders.length >= 3) {
        return { type: "complete_orders" as SuggestionType, priority: 2 };
      }
      
      // Check for high variance (if inventory enabled)
      if (inventoryEnabled) {
        // Simple check - if any stock adjustments today, suggest review
        const { data: adjustments } = await supabase
          .from("inventory_transactions")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .in("txn_type", ["adjustment", "waste"])
          .gte("created_at", todayStart)
          .lt("created_at", todayEnd)
          .limit(5);
        
        if (adjustments && adjustments.length >= 3) {
          return { type: "review_inventory" as SuggestionType, priority: 3 };
        }
      }
      
      return { type: null, priority: 0 };
    },
    enabled: !!restaurantId,
    refetchInterval: 5 * 60 * 1000,
  });
  
  if (!suggestion?.type) return null;
  
  const suggestions: Record<NonNullable<SuggestionType>, {
    icon: typeof LogOut;
    title: { ar: string; en: string };
    action: { ar: string; en: string };
    tab?: string;
  }> = {
    close_shift: {
      icon: LogOut,
      title: { ar: "أغلق الوردية", en: "Close the Shift" },
      action: { ar: "الوردية مفتوحة لأكثر من 10 ساعات", en: "Shift open for over 10 hours" },
    },
    review_inventory: {
      icon: Package,
      title: { ar: "راجع تقرير المخزون", en: "Review Inventory Report" },
      action: { ar: "توجد تعديلات مخزون متعددة اليوم", en: "Multiple stock adjustments today" },
      tab: "inventory",
    },
    complete_orders: {
      icon: ShoppingCart,
      title: { ar: "أكمل الطلبات المعلقة", en: "Complete Open Orders" },
      action: { ar: "توجد طلبات معلقة تحتاج متابعة", en: "Held orders need attention" },
    },
  };
  
  const config = suggestions[suggestion.type];
  const Icon = config.icon;
  
  return (
    <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50 border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-50 dark:bg-purple-950/20">
              <Lightbulb className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("suggested_action")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Icon className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">{config.title[language]}</span>
              </div>
            </div>
          </div>
          {config.tab && onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
              onClick={() => onNavigate(config.tab!)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
