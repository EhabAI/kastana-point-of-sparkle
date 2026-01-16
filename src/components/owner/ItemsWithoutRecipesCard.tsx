import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Info, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInventoryEnabled } from "@/hooks/useInventoryEnabled";

interface ItemWithoutRecipe {
  menu_item_id: string;
  menu_item_name: string;
  sold_count: number;
}

interface ItemsWithoutRecipesCardProps {
  restaurantId: string;
}

export function ItemsWithoutRecipesCard({ restaurantId }: ItemsWithoutRecipesCardProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { isEnabled: inventoryEnabled } = useInventoryEnabled();

  const { data: itemsWithoutRecipes } = useQuery({
    queryKey: ["items-without-recipes", restaurantId],
    queryFn: async () => {
      // Step 1: Get all menu items that have been sold in paid orders
      const { data: soldItems, error: soldError } = await supabase
        .from("order_items")
        .select(`
          menu_item_id,
          quantity,
          orders!inner (
            status,
            restaurant_id
          )
        `)
        .eq("orders.restaurant_id", restaurantId)
        .eq("orders.status", "paid")
        .eq("voided", false)
        .not("menu_item_id", "is", null);

      if (soldError) {
        console.error("[ItemsWithoutRecipesCard] Failed to fetch sold items:", soldError);
        return [];
      }

      if (!soldItems || soldItems.length === 0) {
        return [];
      }

      // Aggregate sold quantities by menu_item_id
      const soldByMenuItem: Record<string, number> = {};
      for (const item of soldItems) {
        if (item.menu_item_id) {
          soldByMenuItem[item.menu_item_id] = (soldByMenuItem[item.menu_item_id] || 0) + item.quantity;
        }
      }

      const soldMenuItemIds = Object.keys(soldByMenuItem);
      if (soldMenuItemIds.length === 0) {
        return [];
      }

      // Step 2: Get menu item names
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id, name")
        .in("id", soldMenuItemIds);

      if (menuError) {
        console.error("[ItemsWithoutRecipesCard] Failed to fetch menu items:", menuError);
        return [];
      }

      const menuItemNameMap = new Map((menuItems || []).map(m => [m.id, m.name]));

      // Step 3: Get active recipes for these menu items
      const { data: recipes, error: recipesError } = await supabase
        .from("menu_item_recipes")
        .select("menu_item_id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .in("menu_item_id", soldMenuItemIds);

      if (recipesError) {
        console.error("[ItemsWithoutRecipesCard] Failed to fetch recipes:", recipesError);
        return [];
      }

      const menuItemsWithRecipes = new Set((recipes || []).map(r => r.menu_item_id));

      // Step 4: Find menu items without recipes
      const result: ItemWithoutRecipe[] = [];
      for (const menuItemId of soldMenuItemIds) {
        if (!menuItemsWithRecipes.has(menuItemId)) {
          result.push({
            menu_item_id: menuItemId,
            menu_item_name: menuItemNameMap.get(menuItemId) || "Unknown",
            sold_count: soldByMenuItem[menuItemId],
          });
        }
      }

      // Sort by sold count descending
      result.sort((a, b) => b.sold_count - a.sold_count);

      return result;
    },
    enabled: !!restaurantId && inventoryEnabled,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Don't show if inventory is disabled or no items without recipes
  if (!inventoryEnabled || !itemsWithoutRecipes || itemsWithoutRecipes.length === 0) {
    return null;
  }

  const handleNavigateToRecipes = () => {
    // Navigate to inventory tab (where recipes are managed)
    // The tab is controlled by the parent, so we use hash or query params
    // For now, scroll to top and trigger tab change via URL
    const tabsElement = document.querySelector('[data-value="inventory"]');
    if (tabsElement) {
      (tabsElement as HTMLElement).click();
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Warning Icon */}
          <div className="flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {language === "ar" ? "أصناف تُباع بدون وصفة" : "Items Sold Without Recipes"}
              </h4>
              <Badge 
                variant="secondary" 
                className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs"
              >
                {itemsWithoutRecipes.length}
              </Badge>

              {/* Tooltip with details */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="start"
                    className="max-w-[300px] p-3"
                  >
                    <p className="text-xs font-semibold mb-2">
                      {language === "ar" ? "تفاصيل الأصناف" : "Item Details"}
                    </p>
                    <ul className="text-xs space-y-1 max-h-[200px] overflow-y-auto">
                      {itemsWithoutRecipes.slice(0, 10).map((item) => (
                        <li key={item.menu_item_id} className="flex justify-between gap-2">
                          <span className="truncate">{item.menu_item_name}</span>
                          <span className="text-muted-foreground flex-shrink-0">
                            ({item.sold_count} {language === "ar" ? "مباع" : "sold"})
                          </span>
                        </li>
                      ))}
                      {itemsWithoutRecipes.length > 10 && (
                        <li className="text-muted-foreground">
                          +{itemsWithoutRecipes.length - 10} {language === "ar" ? "أصناف أخرى" : "more items"}
                        </li>
                      )}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      {language === "ar" 
                        ? "أضف وصفة لهذه الأصناف لتفعيل خصم المخزون تلقائيًا."
                        : "Add recipes to these items to enable automatic inventory deduction."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              {language === "ar"
                ? "تم بيع أصناف لا تملك وصفة، لذلك لم يتم خصم أي مخزون لها."
                : "Items were sold without recipes, so no inventory was deducted for them."}
            </p>

            {/* Action Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              onClick={handleNavigateToRecipes}
            >
              <ChefHat className="h-3.5 w-3.5 mr-1.5" />
              {language === "ar" ? "إدارة الوصفات" : "Manage Recipes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
