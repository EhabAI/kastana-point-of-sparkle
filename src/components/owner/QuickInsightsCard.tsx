import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendingUp, AlertTriangle, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJOD } from "@/lib/utils";
import { useInventoryEnabled } from "@/hooks/useInventoryEnabled";

interface QuickInsightsCardProps {
  restaurantId: string;
  currency: string;
}

export function QuickInsightsCard({ restaurantId, currency }: QuickInsightsCardProps) {
  const { t, language } = useLanguage();
  const { isEnabled: inventoryEnabled } = useInventoryEnabled();
  const currencySymbol = language === "ar" ? "د.أ" : currency;

  const today = new Date();
  const startOfToday = startOfDay(today).toISOString();
  const endOfToday = endOfDay(today).toISOString();

  // Fetch top selling item today
  const { data: topSeller, isLoading: loadingTopSeller } = useQuery({
    queryKey: ["quick-insights-top-seller", restaurantId, startOfToday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          menu_item_id,
          name,
          quantity,
          orders!inner(restaurant_id, created_at, status)
        `)
        .eq("orders.restaurant_id", restaurantId)
        .eq("orders.status", "paid")
        .gte("orders.created_at", startOfToday)
        .lt("orders.created_at", endOfToday)
        .eq("voided", false);

      if (error) throw error;

      // Aggregate by item name
      const itemCounts: Record<string, { name: string; total: number }> = {};
      data?.forEach((item) => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { name: item.name, total: 0 };
        }
        itemCounts[item.name].total += item.quantity;
      });

      const sorted = Object.values(itemCounts).sort((a, b) => b.total - a.total);
      return sorted[0] || null;
    },
    enabled: !!restaurantId,
    refetchInterval: 60000,
  });

  // Fetch highest variance item today (if inventory enabled)
  const { data: highestVariance, isLoading: loadingVariance } = useQuery({
    queryKey: ["quick-insights-variance", restaurantId, startOfToday],
    queryFn: async () => {
      // Get recent stock count variances
      const { data, error } = await supabase
        .from("stock_count_lines")
        .select(`
          item_id,
          variance_base,
          inventory_items!inner(name, avg_cost),
          stock_counts!inner(restaurant_id, status, approved_at)
        `)
        .eq("stock_counts.restaurant_id", restaurantId)
        .eq("stock_counts.status", "approved")
        .not("variance_base", "eq", 0)
        .order("stock_counts.approved_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!data || data.length === 0) return null;

      // Find the item with highest absolute variance value
      let highest: { name: string; variance: number; value: number } | null = null;
      
      data.forEach((line: any) => {
        const absVariance = Math.abs(line.variance_base);
        const cost = line.inventory_items?.avg_cost || 0;
        const value = absVariance * cost;
        
        if (!highest || value > highest.value) {
          highest = {
            name: line.inventory_items?.name || "Unknown",
            variance: line.variance_base,
            value,
          };
        }
      });

      return highest;
    },
    enabled: !!restaurantId && inventoryEnabled,
    refetchInterval: 120000,
  });

  const showVarianceWarning = highestVariance && highestVariance.value > 10; // Threshold

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t("quick_insights")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Top Seller */}
        <div className="flex items-start gap-2">
          <Award className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {t("top_seller_today")}
            </p>
            {loadingTopSeller ? (
              <Skeleton className="h-4 w-24 mt-1" />
            ) : topSeller ? (
              <p className="text-sm font-semibold text-foreground truncate">
                {topSeller.name}
                <span className="text-muted-foreground font-normal ml-1">
                  ({topSeller.total} {t("sold")})
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("no_sales_today")}</p>
            )}
          </div>
        </div>

        {/* Highest Variance - Only if inventory enabled */}
        {inventoryEnabled && (
          <div className="flex items-start gap-2">
            <AlertTriangle 
              className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                showVarianceWarning ? "text-amber-500" : "text-muted-foreground/50"
              }`} 
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                {t("highest_variance")}
              </p>
              {loadingVariance ? (
                <Skeleton className="h-4 w-24 mt-1" />
              ) : highestVariance ? (
                <p className={`text-sm font-semibold truncate ${
                  showVarianceWarning ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                }`}>
                  {highestVariance.name}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({formatJOD(highestVariance.value)} {currencySymbol})
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("no_variance_data")}</p>
              )}
            </div>
          </div>
        )}

        {/* Variance Warning */}
        {showVarianceWarning && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/20 rounded-md px-2 py-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span>{t("variance_exceeds_normal")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
