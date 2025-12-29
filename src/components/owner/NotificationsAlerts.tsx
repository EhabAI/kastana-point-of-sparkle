import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Bell, AlertTriangle, AlertCircle, Info, CheckCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string;
  type: "error" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: Date;
}

export function NotificationsAlerts() {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currency = settings?.currency || "JOD";
  
  const [isOpen, setIsOpen] = useState(true);

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ["owner-alerts", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return { alerts: [] };

      const alerts: Alert[] = [];
      const today = new Date();
      const yesterday = subDays(today, 1);
      const lastWeek = subDays(today, 7);

      // Get today's orders
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("id, total, status, discount_value")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startOfDay(today).toISOString())
        .lt("created_at", endOfDay(today).toISOString());

      // Get yesterday's orders for comparison
      const { data: yesterdayOrders } = await supabase
        .from("orders")
        .select("id, total, status")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startOfDay(yesterday).toISOString())
        .lt("created_at", endOfDay(yesterday).toISOString());

      // Get this week's voided items
      const { data: weekOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", lastWeek.toISOString());

      const weekOrderIds = weekOrders?.map(o => o.id) || [];
      let weekVoidedCount = 0;
      
      if (weekOrderIds.length > 0) {
        const { data: voidedItems } = await supabase
          .from("order_items")
          .select("id")
          .in("order_id", weekOrderIds)
          .eq("voided", true);
        
        weekVoidedCount = voidedItems?.length || 0;
      }

      // Get open shifts
      const { data: openShifts } = await supabase
        .from("shifts")
        .select("id, opened_at, cashier_id")
        .eq("restaurant_id", restaurant.id)
        .eq("status", "open");

      // Calculate metrics
      const todayPaidOrders = todayOrders?.filter(o => o.status === "paid") || [];
      const todayCancelledOrders = todayOrders?.filter(o => o.status === "cancelled") || [];
      const yesterdayPaidOrders = yesterdayOrders?.filter(o => o.status === "paid") || [];
      
      const todaySales = todayPaidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const yesterdaySales = yesterdayPaidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const todayDiscounts = todayPaidOrders.reduce((sum, o) => sum + Number(o.discount_value || 0), 0);

      // Generate alerts based on data

      // 1. Sales comparison
      if (yesterdaySales > 0) {
        const salesChange = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
        
        if (salesChange >= 20) {
          alerts.push({
            id: "sales-up",
            type: "success",
            title: "Sales Up!",
            message: `Today's sales are up ${salesChange.toFixed(0)}% compared to yesterday (${todaySales.toFixed(2)} vs ${yesterdaySales.toFixed(2)} ${currency})`,
            timestamp: new Date(),
          });
        } else if (salesChange <= -20) {
          alerts.push({
            id: "sales-down",
            type: "warning",
            title: "Sales Down",
            message: `Today's sales are down ${Math.abs(salesChange).toFixed(0)}% compared to yesterday (${todaySales.toFixed(2)} vs ${yesterdaySales.toFixed(2)} ${currency})`,
            timestamp: new Date(),
          });
        }
      }

      // 2. High cancellation rate
      if (todayOrders && todayOrders.length > 5) {
        const cancellationRate = (todayCancelledOrders.length / todayOrders.length) * 100;
        if (cancellationRate > 15) {
          alerts.push({
            id: "high-cancellations",
            type: "error",
            title: "High Cancellation Rate",
            message: `${cancellationRate.toFixed(0)}% of today's orders were cancelled (${todayCancelledOrders.length} of ${todayOrders.length})`,
            timestamp: new Date(),
          });
        }
      }

      // 3. High void rate
      if (weekVoidedCount > 20) {
        alerts.push({
          id: "high-voids",
          type: "warning",
          title: "High Void Count",
          message: `${weekVoidedCount} items voided in the last 7 days. Consider reviewing with staff.`,
          timestamp: new Date(),
        });
      }

      // 4. Long open shifts
      openShifts?.forEach(shift => {
        const shiftDuration = (new Date().getTime() - new Date(shift.opened_at).getTime()) / (1000 * 60 * 60);
        if (shiftDuration > 10) {
          alerts.push({
            id: `long-shift-${shift.id}`,
            type: "info",
            title: "Long Open Shift",
            message: `A shift has been open for ${shiftDuration.toFixed(1)} hours. Consider checking if it should be closed.`,
            timestamp: new Date(shift.opened_at),
          });
        }
      });

      // 5. High discount usage
      if (todaySales > 0 && (todayDiscounts / todaySales) > 0.15) {
        alerts.push({
          id: "high-discounts",
          type: "warning",
          title: "High Discount Usage",
          message: `${((todayDiscounts / todaySales) * 100).toFixed(0)}% of today's sales were discounted (${todayDiscounts.toFixed(2)} ${currency})`,
          timestamp: new Date(),
        });
      }

      // 6. No orders today (after 11am)
      const currentHour = new Date().getHours();
      if (currentHour >= 11 && todayPaidOrders.length === 0) {
        alerts.push({
          id: "no-sales-today",
          type: "info",
          title: "No Sales Today",
          message: "No completed orders have been recorded today yet.",
          timestamp: new Date(),
        });
      }

      // 7. Good performance
      if (todayPaidOrders.length >= 10 && todayCancelledOrders.length === 0 && weekVoidedCount < 5) {
        alerts.push({
          id: "good-performance",
          type: "success",
          title: "Great Performance!",
          message: "Operations are running smoothly with low cancellations and voids.",
          timestamp: new Date(),
        });
      }

      return { alerts };
    },
    enabled: !!restaurant?.id,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-success" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return "bg-destructive/5 border-destructive/20";
      case "warning":
        return "bg-warning/5 border-warning/20";
      case "success":
        return "bg-success/5 border-success/20";
      default:
        return "bg-primary/5 border-primary/20";
    }
  };

  const sortedAlerts = [...(alertsData?.alerts || [])].sort((a, b) => {
    const priority = { error: 0, warning: 1, info: 2, success: 3 };
    return priority[a.type] - priority[b.type];
  });

  const alertCounts = {
    error: sortedAlerts.filter(a => a.type === "error").length,
    warning: sortedAlerts.filter(a => a.type === "warning").length,
  };

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
                    <Bell className="h-5 w-5" />
                    Notifications & Alerts
                    {(alertCounts.error > 0 || alertCounts.warning > 0) && (
                      <Badge variant="destructive" className="ml-2">
                        {alertCounts.error + alertCounts.warning}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Proactive alerts about your restaurant performance</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sortedAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-success mb-3" />
                <p className="font-medium text-foreground">All Clear!</p>
                <p className="text-sm text-muted-foreground">No alerts or notifications at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`flex items-start gap-3 p-4 rounded-lg border ${getAlertStyles(alert.type)}`}
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{alert.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(alert.timestamp, "HH:mm")}
                    </span>
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
