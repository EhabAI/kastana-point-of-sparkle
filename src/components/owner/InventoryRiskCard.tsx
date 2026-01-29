import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingDown, Utensils, Package, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { t, language } = useLanguage();
  const { selectedBranch } = useBranchContextSafe();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-risk-snapshot", restaurantId, selectedBranch?.id],
    queryFn: async () => {
      // Get inventory items with stock levels
      let itemsQuery = supabase
        .from("inventory_items")
        .select(`
          id,
          min_level,
          reorder_point,
          inventory_stock_levels!inner(on_hand_base, branch_id)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      if (selectedBranch?.id) {
        itemsQuery = itemsQuery.eq("branch_id", selectedBranch.id);
        // Ensure the embedded stock level also matches the selected branch
        itemsQuery = itemsQuery.eq("inventory_stock_levels.branch_id", selectedBranch.id);
      }

      const { data: items, error: itemsError } = await itemsQuery;
      if (itemsError) throw itemsError;

      // Calculate counts for different stock levels
      let lowStockCount = 0; // Items below min_level (critical)
      let nearReorderCount = 0; // Items between min_level and reorder_point (warning)
      let negativeStockCount = 0;

      items?.forEach((item) => {
        const stockLevels =
          (item.inventory_stock_levels as unknown as Array<{
            on_hand_base: number;
            branch_id: string;
          }>) || [];

        const relevantStock = selectedBranch?.id
          ? stockLevels.find((sl) => sl.branch_id === selectedBranch.id)
          : stockLevels[0];

        const onHand = relevantStock?.on_hand_base ?? 0;
        const minLevel = item.min_level || 0;
        const reorderPoint = item.reorder_point || 0;

        if (onHand < 0) {
          negativeStockCount++;
        } else if (onHand < minLevel) {
          lowStockCount++; // Critical - below minimum
        } else if (onHand <= reorderPoint) {
          nearReorderCount++; // Warning - at or below reorder point but above min
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
        return { lowStockCount, nearReorderCount, negativeStockCount, withoutRecipeCount: 0 };
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

      return { lowStockCount, nearReorderCount, negativeStockCount, withoutRecipeCount };
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
      <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30">
        <CardContent className="p-4">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { lowStockCount = 0, nearReorderCount = 0, negativeStockCount = 0, withoutRecipeCount = 0 } = data || {};

  // Hide card if all counts are 0
  if (lowStockCount === 0 && nearReorderCount === 0 && negativeStockCount === 0 && withoutRecipeCount === 0) {
    return null;
  }

  const totalItems = lowStockCount + nearReorderCount + negativeStockCount + withoutRecipeCount;

  const rows = [
    {
      icon: AlertTriangle,
      label: t("inv_low_stock"),
      tooltip: t("inv_low_stock_desc"),
      count: lowStockCount,
      color: "text-amber-600/80",
      bgColor: "bg-amber-100/50 dark:bg-amber-900/20",
      onClick: onLowStockClick,
    },
    {
      icon: Package,
      label: t("inv_near_reorder"),
      tooltip: t("inv_near_reorder_tooltip"),
      count: nearReorderCount,
      color: "text-amber-500/70",
      bgColor: "bg-amber-100/40 dark:bg-amber-900/15",
      onClick: onLowStockClick,
    },
    {
      icon: TrendingDown,
      label: t("inv_negative_stock"),
      tooltip: t("inv_negative_stock_tooltip"),
      count: negativeStockCount,
      color: "text-amber-600/80",
      bgColor: "bg-amber-100/50 dark:bg-amber-900/20",
      onClick: onNegativeStockClick,
    },
    {
      icon: Utensils,
      label: t("inv_items_without_recipe"),
      tooltip: t("inv_items_without_recipe_tooltip"),
      count: withoutRecipeCount,
      color: "text-amber-500/70",
      bgColor: "bg-amber-100/40 dark:bg-amber-900/15",
      onClick: onWithoutRecipeClick,
    },
  ].filter((row) => row.count > 0);

  return (
    <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-500/70" />
            <CardTitle className="text-sm font-semibold text-amber-700/80 dark:text-amber-400/80">
              {t("inventory_risk_title")}
            </CardTitle>
          </div>
          <span className="text-[13px] font-medium text-amber-600/60">
            {totalItems} {language === "ar" ? "صنف" : "items"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-0.5">
          <TooltipProvider>
            {rows.map((row, index) => {
              const Icon = row.icon;
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={row.onClick}
                      disabled={!row.onClick}
                      className={`w-full flex items-center justify-between py-1 px-1.5 rounded transition-colors ${
                        row.onClick
                          ? "hover:bg-amber-100/50 dark:hover:bg-amber-900/20 cursor-pointer"
                          : "cursor-default"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3 w-3 ${row.color}`} />
                        <span className="text-xs text-foreground/70">{row.label}</span>
                      </div>
                      <span className={`text-[13px] font-medium tabular-nums ${row.color}`}>
                        {row.count}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    <p className="text-xs">{row.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
