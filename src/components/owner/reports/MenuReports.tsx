import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { DateRange } from "../DateRangeFilter";

interface MenuReportsProps {
  dateRange: DateRange;
}

export function MenuReports({ dateRange }: MenuReportsProps) {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const { data, isLoading } = useQuery({
    queryKey: ["menu-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Get paid orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .eq("status", "paid")
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString());

      if (ordersError) throw ordersError;

      const orderIds = orders?.map(o => o.id) || [];

      if (orderIds.length === 0) {
        return { itemPerformance: [], categoryPerformance: [], topSellers: [], leastSellers: [] };
      }

      // Get order items (non-voided)
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("name, price, quantity, menu_item_id")
        .in("order_id", orderIds)
        .eq("voided", false);

      if (itemsError) throw itemsError;

      // Get menu items with categories
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id, name, category_id")
        .eq("is_available", true);

      if (menuError) throw menuError;

      // Get categories
      const { data: categories, error: catError } = await supabase
        .from("menu_categories")
        .select("id, name")
        .eq("restaurant_id", restaurant.id);

      if (catError) throw catError;

      const menuItemMap = new Map(menuItems?.map(m => [m.id, m]) || []);
      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

      // Aggregate item performance
      const itemAgg: Record<string, { name: string; quantity: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        const key = item.menu_item_id || item.name;
        if (!itemAgg[key]) {
          itemAgg[key] = { name: item.name, quantity: 0, revenue: 0 };
        }
        itemAgg[key].quantity += item.quantity;
        itemAgg[key].revenue += Number(item.price) * item.quantity;
      });

      const itemPerformance = Object.values(itemAgg).sort((a, b) => b.revenue - a.revenue);
      const topSellers = itemPerformance.slice(0, 5);
      const leastSellers = [...itemPerformance].sort((a, b) => a.revenue - b.revenue).slice(0, 5);

      // Aggregate category performance
      const categoryAgg: Record<string, { name: string; quantity: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        const menuItem = item.menu_item_id ? menuItemMap.get(item.menu_item_id) : null;
        const categoryId = menuItem?.category_id;
        const categoryName = categoryId ? categoryMap.get(categoryId) || "Other" : "Other";
        
        if (!categoryAgg[categoryName]) {
          categoryAgg[categoryName] = { name: categoryName, quantity: 0, revenue: 0 };
        }
        categoryAgg[categoryName].quantity += item.quantity;
        categoryAgg[categoryName].revenue += Number(item.price) * item.quantity;
      });

      const categoryPerformance = Object.values(categoryAgg).sort((a, b) => b.revenue - a.revenue);

      return {
        itemPerformance,
        categoryPerformance,
        topSellers,
        leastSellers,
      };
    },
    enabled: !!restaurant?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = (data?.itemPerformance || []).length > 0;

  return (
    <div className="space-y-8">
      {/* Top Selling Items */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          {t("top_selling_items")}
        </h3>
        {!hasData ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_menu_data")}</p>
        ) : (
          <div className="space-y-2">
            {data?.topSellers.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 w-6">{i + 1}</span>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} {t("sold")}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(item.revenue)} {currencySymbol}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Least Selling Items */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-amber-500" />
          {t("least_selling_items")}
        </h3>
        {!hasData ? (
          <p className="text-sm text-muted-foreground py-4">{t("not_enough_data")}</p>
        ) : (
          <div className="space-y-2">
            {data?.leastSellers.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-6">{i + 1}</span>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} {t("sold")}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(item.revenue)} {currencySymbol}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sales by Category */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("sales_by_category")}
        </h3>
        {(data?.categoryPerformance || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_category_data")}</p>
        ) : (
          <div className="space-y-2">
            {data?.categoryPerformance.map((cat, i) => {
              const totalRevenue = data.categoryPerformance.reduce((s, c) => s + c.revenue, 0);
              const percent = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.quantity} {t("items")} · {percent.toFixed(0)}%</p>
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatJOD(cat.revenue)} {currencySymbol}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Item Performance Table */}
      <section>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border/50">
          {t("item_performance")}
        </h3>
        {!hasData ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_menu_data")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("item")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("quantity")}</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase tracking-wide font-medium">{t("revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {data?.itemPerformance.slice(0, 20).map((item, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium text-foreground">{item.name}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{item.quantity}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-foreground">{formatJOD(item.revenue)} {currencySymbol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
