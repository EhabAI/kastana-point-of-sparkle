import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, LineChart, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { DateRangeFilter, DateRange, DateRangePreset, getDateRangeForPreset } from "./DateRangeFilter";
import { format, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const CHART_COLORS = [
  "hsl(221, 83%, 53%)",  // primary blue
  "hsl(142, 76%, 36%)",  // success green
  "hsl(38, 92%, 50%)",   // warning yellow
  "hsl(0, 84%, 60%)",    // destructive red
  "hsl(280, 65%, 60%)",  // purple
  "hsl(180, 70%, 45%)",  // teal
];

export function AnalyticsCharts() {
  const { t, language } = useLanguage();
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();
  const { selectedBranch } = useBranchContextSafe();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";
  
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<DateRangePreset>("last_7_days");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPreset("last_7_days"));

  // Fetch orders with category info
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["analytics-orders", restaurant?.id, selectedBranch?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      let ordersQuery = supabase
        .from("orders")
        .select("id, total, created_at, status")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString())
        .eq("status", "paid");

      if (selectedBranch?.id) {
        ordersQuery = ordersQuery.eq("branch_id", selectedBranch.id);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // Fetch order items with menu item info
      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length === 0) return { orders: [], orderItems: [], categories: [] };

      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("id, order_id, price, quantity, menu_item_id, voided")
        .in("order_id", orderIds)
        .eq("voided", false);

      if (itemsError) throw itemsError;

      // Fetch menu items with categories
      const menuItemIds = [...new Set(orderItems?.map(i => i.menu_item_id).filter(Boolean) || [])];
      let menuItems: { id: string; category_id: string }[] = [];
      if (menuItemIds.length > 0) {
        const { data: items, error: menuError } = await supabase
          .from("menu_items")
          .select("id, category_id")
          .in("id", menuItemIds);

        if (!menuError && items) {
          menuItems = items;
        }
      }

      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from("menu_categories")
        .select("id, name")
        .eq("restaurant_id", restaurant.id);

      if (catError) throw catError;

      return { orders, orderItems, menuItems, categories };
    },
    enabled: !!restaurant?.id,
  });

  // Calculate daily sales trend
  const salesTrendData = (() => {
    if (!ordersData?.orders) return [];
    
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayOrders = ordersData.orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });
      const total = dayOrders.reduce((sum, o) => sum + Number(o.total), 0);
      return {
        date: format(day, "MMM d"),
        sales: total,
        orders: dayOrders.length,
      };
    });
  })();

  // Calculate peak hours
  const peakHoursData = (() => {
    if (!ordersData?.orders) return [];
    
    const hourCounts: { [hour: number]: { count: number; sales: number } } = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = { count: 0, sales: 0 };
    }
    
    ordersData.orders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourCounts[hour].count += 1;
      hourCounts[hour].sales += Number(order.total);
    });

    return Object.entries(hourCounts)
      .map(([hour, data]) => ({
        hour: `${hour.padStart(2, '0')}:00`,
        orders: data.count,
        sales: data.sales,
      }))
      .filter(h => h.orders > 0);
  })();

  // Calculate category performance
  const categoryData = (() => {
    if (!ordersData?.orderItems || !ordersData?.categories) return [];
    
    const categoryTotals: { [id: string]: number } = {};
    const menuItemToCategory = new Map<string, string>(
      ordersData.menuItems?.map(m => [m.id, m.category_id] as [string, string]) || []
    );
    
    ordersData.orderItems.forEach(item => {
      if (item.menu_item_id) {
        const categoryId = menuItemToCategory.get(item.menu_item_id);
        if (categoryId) {
          categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + 
            (Number(item.price) * item.quantity);
        }
      }
    });

    const categoryMap = new Map<string, string>(ordersData.categories?.map(c => [c.id, c.name] as [string, string]) || []);
    
    return Object.entries(categoryTotals)
      .map(([id, value]) => ({
        name: categoryMap.get(id) || "Unknown",
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  })();

  const totalCategorySales = categoryData.reduce((sum, c) => sum + c.value, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="text-start">
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    {t("analytics_charts")}
                  </CardTitle>
                  <CardDescription>{t("analytics_desc")}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              preset={preset}
              onPresetChange={setPreset}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Sales Trend Chart */}
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">{t("sales_trend")}</h4>
                  {salesTrendData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("no_sales_data")}</p>
                  ) : (
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesTrendData}>
                          <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs fill-muted-foreground"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis 
                            className="text-xs fill-muted-foreground"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `${v}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: number) => [`${formatJOD(value)} ${currencySymbol}`, t("sales")]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="hsl(221, 83%, 53%)" 
                            fillOpacity={1} 
                            fill="url(#salesGradient)" 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Peak Hours Chart */}
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">{t("peak_hours")}</h4>
                  {peakHoursData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("no_order_data")}</p>
                  ) : (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={peakHoursData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="hour" 
                            className="text-xs fill-muted-foreground"
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis 
                            className="text-xs fill-muted-foreground"
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: number, name: string) => [
                              name === 'orders' ? value : `${formatJOD(value)} ${currencySymbol}`,
                              name === 'orders' ? t("orders") : t("sales")
                            ]}
                          />
                          <Bar dataKey="orders" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Category Performance */}
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">{t("category_performance")}</h4>
                  {categoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("no_category_data")}</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              formatter={(value: number) => [`${formatJOD(value)} ${currencySymbol}`, t("sales")]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {categoryData.slice(0, 5).map((cat, index) => (
                          <div key={cat.name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="text-sm font-medium text-foreground">{cat.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">{formatJOD(cat.value)} {currencySymbol}</p>
                              <p className="text-xs text-muted-foreground">
                                {totalCategorySales > 0 ? ((cat.value / totalCategorySales) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
