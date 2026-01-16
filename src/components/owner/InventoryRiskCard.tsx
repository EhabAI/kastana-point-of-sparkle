import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContext } from "@/contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingDown, Utensils, Package } from "lucide-react";

interface InventoryRiskCardProps {
  restaurantId: string;
  inventoryEnabled?: boolean;
  onLowStockClick?: () => void;
  onNegativeStockClick?: () => void;
  onWithoutRecipeClick?: () => void;
}

export function InventoryRiskCard({
  restaurantId,
  inventoryEnabled = false,
  onLowStockClick,
  onNegativeStockClick,
  onWithoutRecipeClick,
}: InventoryRiskCardProps) {
  const { t } = useLanguage();
  const { selectedBranch } = useBranchContext();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-risk-snapshot", restaurantId, selectedBranch?.id],
    queryFn: async () => {
      // Get inventory items with stock levels
      let itemsQuery = supabase
        .from("inventory_items")
        .select(`
          id,
          reorder_point,
          inventory_stock_levels!inner(on_hand_base)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      if (selectedBranch?.id) {
        itemsQuery = itemsQuery.eq("branch_id", selectedBranch.id);
      }

      const { data: items, error: itemsError } = await itemsQuery;
      if (itemsError) throw itemsError;

      // Calculate low stock and negative stock counts
      let lowStockCount = 0;
      let negativeStockCount = 0;

      items?.forEach((item) => {
        const stockLevel = item.inventory_stock_levels as unknown as { on_hand_base: number } | null;
        const onHand = stockLevel?.on_hand_base || 0;
        const reorderPoint = item.reorder_point || 0;

        if (onHand < 0) {
          negativeStockCount++;
        } else if (onHand <= reorderPoint) {
          lowStockCount++;
        }
      });

      // Get menu items that require recipes (drink, food) but don't have any
      // First, get all menu categories for this restaurant
      const { data: categories } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("restaurant_id", restaurantId);

      const categoryIds = categories?.map((c) => c.id) || [];

      if (categoryIds.length === 0) {
        return { lowStockCount, negativeStockCount, withoutRecipeCount: 0 };
      }

      // Get menu items that require recipes
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id, item_type")
        .in("category_id", categoryIds)
        .in("item_type", ["drink", "food"])
        .eq("is_available", true);

      if (menuError) throw menuError;

      // Get existing recipes
      const { data: recipes } = await supabase
        .from("menu_item_recipes")
        .select("menu_item_id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      const recipeItemIds = new Set(recipes?.map((r) => r.menu_item_id) || []);

      // Count items without recipes
      const withoutRecipeCount = menuItems?.filter(
        (item) => !recipeItemIds.has(item.id)
      ).length || 0;

      return { lowStockCount, negativeStockCount, withoutRecipeCount };
    },
    enabled: !!restaurantId && inventoryEnabled,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Don't render if inventory is disabled
  if (!inventoryEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 border h-full">
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { lowStockCount = 0, negativeStockCount = 0, withoutRecipeCount = 0 } = data || {};

  // Hide card if all counts are 0
  if (lowStockCount === 0 && negativeStockCount === 0 && withoutRecipeCount === 0) {
    return null;
  }

  const rows = [
    {
      icon: AlertTriangle,
      label: t("inv_near_reorder_short"),
      count: lowStockCount,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      onClick: onLowStockClick,
    },
    {
      icon: TrendingDown,
      label: t("inv_negative_stock"),
      count: negativeStockCount,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      onClick: onNegativeStockClick,
    },
    {
      icon: Utensils,
      label: t("inv_items_without_recipe"),
      count: withoutRecipeCount,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      onClick: onWithoutRecipeClick,
    },
  ].filter((row) => row.count > 0);

  return (
    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 border h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <CardTitle className="text-sm font-semibold text-foreground">
            {t("inventory_risk_title")}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2">
          {rows.map((row, index) => {
            const Icon = row.icon;
            return (
              <button
                key={index}
                onClick={row.onClick}
                disabled={!row.onClick}
                className={`w-full flex items-center justify-between py-2 px-2 rounded-md transition-colors ${
                  row.onClick
                    ? "hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${row.bgColor}`}>
                    <Icon className={`h-3.5 w-3.5 ${row.color}`} />
                  </div>
                  <span className="text-sm text-foreground/80">{row.label}</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${row.color}`}>
                  {row.count}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
