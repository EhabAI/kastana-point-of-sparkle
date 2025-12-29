import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { DateRangeFilter, DateRange, DateRangePreset, getDateRangeForPreset } from "./DateRangeFilter";
import { Badge } from "@/components/ui/badge";

interface ItemSalesData {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function BestWorstSellers() {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currency = settings?.currency || "JOD";
  
  const [isOpen, setIsOpen] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>("last_30_days");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPreset("last_30_days"));

  const { data: salesData, isLoading } = useQuery({
    queryKey: ["best-worst-sellers", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Fetch paid orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString())
        .eq("status", "paid");

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return { items: [] };

      const orderIds = orders.map(o => o.id);

      // Fetch order items (not voided)
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("menu_item_id, name, price, quantity")
        .in("order_id", orderIds)
        .eq("voided", false);

      if (itemsError) throw itemsError;

      // Aggregate by menu item
      const itemMap = new Map<string, ItemSalesData>();
      
      orderItems?.forEach(item => {
        const key = item.menu_item_id || item.name; // Use name if no menu_item_id (manual items)
        const existing = itemMap.get(key);
        
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.price) * item.quantity;
        } else {
          itemMap.set(key, {
            menuItemId: item.menu_item_id || key,
            name: item.name,
            quantity: item.quantity,
            revenue: Number(item.price) * item.quantity,
          });
        }
      });

      const items = Array.from(itemMap.values());
      return { items };
    },
    enabled: !!restaurant?.id,
  });

  const sortedByQuantity = [...(salesData?.items || [])].sort((a, b) => b.quantity - a.quantity);
  const bestSellers = sortedByQuantity.slice(0, 5);
  const worstSellers = sortedByQuantity.slice(-5).reverse();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Best & Worst Sellers
                  </CardTitle>
                  <CardDescription>Identify your top and bottom performing menu items</CardDescription>
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
            ) : salesData?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data for this period.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Best Sellers */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <h4 className="font-medium text-foreground">Top 5 Best Sellers</h4>
                  </div>
                  <div className="space-y-2">
                    {bestSellers.map((item, index) => (
                      <div 
                        key={item.menuItemId} 
                        className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-bold">
                            #{index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.quantity} sold</p>
                          </div>
                        </div>
                        <p className="font-semibold text-foreground">{item.revenue.toFixed(2)} {currency}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Worst Sellers */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <h4 className="font-medium text-foreground">Bottom 5 Sellers</h4>
                  </div>
                  <div className="space-y-2">
                    {worstSellers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not enough data to show worst sellers.</p>
                    ) : (
                      worstSellers.map((item, index) => (
                        <div 
                          key={item.menuItemId} 
                          className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-bold">
                              #{sortedByQuantity.length - index}
                            </Badge>
                            <div>
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.quantity} sold</p>
                            </div>
                          </div>
                          <p className="font-semibold text-foreground">{item.revenue.toFixed(2)} {currency}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
