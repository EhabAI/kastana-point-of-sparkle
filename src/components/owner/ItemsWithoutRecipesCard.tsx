import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  const { language } = useLanguage();
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

      // Step 2: Get menu item names and types (only drink and food require recipes)
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id, name, item_type")
        .in("id", soldMenuItemIds);

      if (menuError) {
        console.error("[ItemsWithoutRecipesCard] Failed to fetch menu items:", menuError);
        return [];
      }

      // Filter to only inventory-relevant items (drink and food)
      const inventoryRelevantItems = (menuItems || []).filter(
        (m) => m.item_type === 'drink' || m.item_type === 'food'
      );
      
      if (inventoryRelevantItems.length === 0) {
        return [];
      }

      const inventoryRelevantIds = inventoryRelevantItems.map(m => m.id);
      const menuItemNameMap = new Map(inventoryRelevantItems.map(m => [m.id, m.name]));

      // Step 3: Get active recipes for inventory-relevant menu items
      const { data: recipes, error: recipesError } = await supabase
        .from("menu_item_recipes")
        .select("menu_item_id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .in("menu_item_id", inventoryRelevantIds);

      if (recipesError) {
        console.error("[ItemsWithoutRecipesCard] Failed to fetch recipes:", recipesError);
        return [];
      }

      const menuItemsWithRecipes = new Set((recipes || []).map(r => r.menu_item_id));

      // Step 4: Find inventory-relevant menu items without recipes
      const result: ItemWithoutRecipe[] = [];
      for (const menuItemId of inventoryRelevantIds) {
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

  return (
    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 border h-full">
      <CardContent className="p-4 h-full flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {language === "ar" ? "تنبيه المخزون" : "Inventory Alert"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-medium text-amber-600">
                {language === "ar" 
                  ? `${itemsWithoutRecipes.length} أصناف بدون وصفة`
                  : `${itemsWithoutRecipes.length} items without recipes`}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-amber-500 cursor-help" />
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
                        : "Add recipes to enable automatic inventory deduction."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
