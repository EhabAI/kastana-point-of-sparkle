import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Users, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { DateRangeFilter, DateRange, DateRangePreset, getDateRangeForPreset } from "./DateRangeFilter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CashierMetrics {
  cashierId: string;
  email: string;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  discountGiven: number;
  voidedItems: number;
  cancelledOrders: number;
}

export function CashierPerformance() {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currency = settings?.currency || "JOD";
  
  const [isOpen, setIsOpen] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPreset("this_month"));

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["cashier-performance", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Fetch shifts in date range
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, cashier_id")
        .eq("restaurant_id", restaurant.id)
        .gte("opened_at", dateRange.from.toISOString())
        .lt("opened_at", dateRange.to.toISOString());

      if (shiftsError) throw shiftsError;
      if (!shifts || shifts.length === 0) return { cashiers: [] };

      const shiftIds = shifts.map(s => s.id);
      const cashierIds = [...new Set(shifts.map(s => s.cashier_id))];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds);

      if (profilesError) throw profilesError;

      // Fetch all orders for these shifts
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, discount_value, status, shift_id")
        .in("shift_id", shiftIds);

      if (ordersError) throw ordersError;

      // Fetch voided items
      const orderIds = orders?.map(o => o.id) || [];
      let voidedItemsByOrder: { [orderId: string]: number } = {};
      
      if (orderIds.length > 0) {
        const { data: orderItems, error: itemsError } = await supabase
          .from("order_items")
          .select("order_id, voided")
          .in("order_id", orderIds)
          .eq("voided", true);

        if (!itemsError && orderItems) {
          orderItems.forEach(item => {
            voidedItemsByOrder[item.order_id] = (voidedItemsByOrder[item.order_id] || 0) + 1;
          });
        }
      }

      // Build cashier metrics
      const shiftToCashier = new Map(shifts.map(s => [s.id, s.cashier_id]));
      const cashierToEmail = new Map(profiles?.map(p => [p.id, p.email || "Unknown"]) || []);

      const metricsMap = new Map<string, CashierMetrics>();

      // Initialize all cashiers
      cashierIds.forEach(id => {
        metricsMap.set(id, {
          cashierId: id,
          email: cashierToEmail.get(id) || "Unknown",
          totalSales: 0,
          orderCount: 0,
          averageOrderValue: 0,
          discountGiven: 0,
          voidedItems: 0,
          cancelledOrders: 0,
        });
      });

      // Process orders
      orders?.forEach(order => {
        const cashierId = shiftToCashier.get(order.shift_id);
        if (!cashierId) return;

        const metrics = metricsMap.get(cashierId)!;
        
        if (order.status === "paid") {
          metrics.totalSales += Number(order.total);
          metrics.orderCount += 1;
          metrics.discountGiven += Number(order.discount_value || 0);
          metrics.voidedItems += voidedItemsByOrder[order.id] || 0;
        } else if (order.status === "cancelled") {
          metrics.cancelledOrders += 1;
        }
      });

      // Calculate averages
      metricsMap.forEach(metrics => {
        metrics.averageOrderValue = metrics.orderCount > 0 
          ? metrics.totalSales / metrics.orderCount 
          : 0;
      });

      const cashiers = Array.from(metricsMap.values()).sort((a, b) => b.totalSales - a.totalSales);
      return { cashiers };
    },
    enabled: !!restaurant?.id,
  });

  const maxSales = Math.max(...(performanceData?.cashiers.map(c => c.totalSales) || [1]));

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
                    <Users className="h-5 w-5" />
                    Cashier Performance
                  </CardTitle>
                  <CardDescription>Track sales, discounts, and voids by cashier</CardDescription>
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
            ) : performanceData?.cashiers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No shift data for this period.</p>
            ) : (
              <div className="space-y-4">
                {performanceData?.cashiers.map((cashier, index) => (
                  <div key={cashier.cashierId} className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? "default" : "secondary"} className="font-bold">
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-foreground">{cashier.email}</p>
                          <p className="text-sm text-muted-foreground">{cashier.orderCount} orders</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-foreground">{cashier.totalSales.toFixed(2)} {currency}</p>
                    </div>
                    
                    {/* Sales Progress Bar */}
                    <div className="space-y-1">
                      <Progress value={(cashier.totalSales / maxSales) * 100} className="h-2" />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Avg Order</p>
                        <p className="font-semibold text-foreground">{cashier.averageOrderValue.toFixed(2)} {currency}</p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Discounts Given</p>
                        <p className="font-semibold text-foreground">{cashier.discountGiven.toFixed(2)} {currency}</p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Voided Items</p>
                        <p className={`font-semibold ${cashier.voidedItems > 10 ? "text-destructive" : "text-foreground"}`}>
                          {cashier.voidedItems}
                        </p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Cancelled Orders</p>
                        <p className={`font-semibold ${cashier.cancelledOrders > 5 ? "text-destructive" : "text-foreground"}`}>
                          {cashier.cancelledOrders}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
