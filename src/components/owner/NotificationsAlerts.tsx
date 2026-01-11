import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Bell, AlertTriangle, AlertCircle, Info, CheckCircle, Loader2, Clock, UtensilsCrossed, Receipt, Timer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useBranches } from "@/hooks/useBranches";
import { startOfDay, endOfDay, subDays, format, differenceInMinutes, differenceInHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";

interface Alert {
  id: string;
  type: "error" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: Date;
  category?: "operational" | "performance";
}

// Configuration thresholds
const THRESHOLDS = {
  LONG_SHIFT_HOURS: 10,
  STUCK_ORDER_MINUTES: 30,
  LONG_OCCUPIED_TABLE_MINUTES: 90,
  EXCESSIVE_REFUNDS_COUNT: 5,
};

export function NotificationsAlerts() {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const { data: branches = [] } = useBranches(restaurant?.id);
  const { t, language } = useLanguage();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";
  
  const [isOpen, setIsOpen] = useState(true);

  // Helper to get branch name by ID
  const getBranchName = (branchId: string | null) => {
    if (!branchId) return t("unknown");
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || t("unknown");
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}${language === "ar" ? "د" : "m"}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (language === "ar") {
      return mins > 0 ? `${hours}س ${mins}د` : `${hours}س`;
    }
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

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

      // Get open shifts with branch info
      const { data: openShifts } = await supabase
        .from("shifts")
        .select("id, opened_at, cashier_id, branch_id")
        .eq("restaurant_id", restaurant.id)
        .eq("status", "open");

      // ========== OPERATIONAL ALERTS ==========

      // 1. Long Open Shifts (>10 hours)
      openShifts?.forEach(shift => {
        const shiftDurationHours = differenceInHours(today, new Date(shift.opened_at));
        if (shiftDurationHours >= THRESHOLDS.LONG_SHIFT_HOURS) {
          const branchName = getBranchName(shift.branch_id);
          alerts.push({
            id: `long-shift-${shift.id}`,
            type: "warning",
            title: t("alert_long_shift"),
            message: t("alert_long_shift_msg")
              .replace("{hours}", String(shiftDurationHours))
              .replace("{branch}", branchName),
            timestamp: new Date(shift.opened_at),
            category: "operational",
          });
        }
      });

      // 2. Stuck Orders (open/in-progress > 30 minutes)
      const { data: stuckOrders } = await supabase
        .from("orders")
        .select("id, order_number, created_at, status, table_id")
        .eq("restaurant_id", restaurant.id)
        .in("status", ["open", "in_progress", "confirmed"]);

      stuckOrders?.forEach(order => {
        const orderAgeMinutes = differenceInMinutes(today, new Date(order.created_at));
        if (orderAgeMinutes >= THRESHOLDS.STUCK_ORDER_MINUTES) {
          alerts.push({
            id: `stuck-order-${order.id}`,
            type: "warning",
            title: t("alert_stuck_order"),
            message: t("alert_stuck_order_msg")
              .replace("{orderNumber}", String(order.order_number))
              .replace("{duration}", formatDuration(orderAgeMinutes)),
            timestamp: new Date(order.created_at),
            category: "operational",
          });
        }
      });

      // 3. Long Occupied Tables (>90 minutes)
      // Get active orders with tables to find occupied tables
      const { data: activeTableOrders } = await supabase
        .from("orders")
        .select("id, table_id, created_at")
        .eq("restaurant_id", restaurant.id)
        .in("status", ["open", "in_progress", "confirmed", "on_hold"])
        .not("table_id", "is", null);

      // Get table info
      const { data: tables } = await supabase
        .from("restaurant_tables")
        .select("id, table_name")
        .eq("restaurant_id", restaurant.id);

      // Group by table and find oldest order per table
      const tableOccupancy: Record<string, { tableName: string; oldestOrderTime: Date }> = {};
      
      activeTableOrders?.forEach(order => {
        if (!order.table_id) return;
        const orderTime = new Date(order.created_at);
        const table = tables?.find(t => t.id === order.table_id);
        
        if (!tableOccupancy[order.table_id]) {
          tableOccupancy[order.table_id] = {
            tableName: table?.table_name || t("unknown"),
            oldestOrderTime: orderTime,
          };
        } else if (orderTime < tableOccupancy[order.table_id].oldestOrderTime) {
          tableOccupancy[order.table_id].oldestOrderTime = orderTime;
        }
      });

      Object.entries(tableOccupancy).forEach(([tableId, info]) => {
        const occupiedMinutes = differenceInMinutes(today, info.oldestOrderTime);
        if (occupiedMinutes >= THRESHOLDS.LONG_OCCUPIED_TABLE_MINUTES) {
          alerts.push({
            id: `long-table-${tableId}`,
            type: "info",
            title: t("alert_long_table"),
            message: t("alert_long_table_msg")
              .replace("{tableName}", info.tableName)
              .replace("{duration}", formatDuration(occupiedMinutes)),
            timestamp: info.oldestOrderTime,
            category: "operational",
          });
        }
      });

      // 4. Excessive Refunds Today (>5)
      const { data: todayRefunds } = await supabase
        .from("refunds")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startOfDay(today).toISOString())
        .lt("created_at", endOfDay(today).toISOString());

      const refundCount = todayRefunds?.length || 0;
      if (refundCount > THRESHOLDS.EXCESSIVE_REFUNDS_COUNT) {
        alerts.push({
          id: "excessive-refunds",
          type: "warning",
          title: t("alert_excessive_refunds"),
          message: t("alert_excessive_refunds_msg").replace("{count}", String(refundCount)),
          timestamp: new Date(),
          category: "operational",
        });
      }

      // ========== PERFORMANCE ALERTS ==========

      // Calculate metrics
      const todayPaidOrders = todayOrders?.filter(o => o.status === "paid") || [];
      const todayCancelledOrders = todayOrders?.filter(o => o.status === "cancelled") || [];
      const yesterdayPaidOrders = yesterdayOrders?.filter(o => o.status === "paid") || [];
      
      const todaySales = todayPaidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const yesterdaySales = yesterdayPaidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const todayDiscounts = todayPaidOrders.reduce((sum, o) => sum + Number(o.discount_value || 0), 0);

      // Sales comparison
      if (yesterdaySales > 0) {
        const salesChange = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
        
        if (salesChange >= 20) {
          alerts.push({
            id: "sales-up",
            type: "success",
            title: t("sales_up"),
            message: t("sales_up_msg")
              .replace("{percent}", salesChange.toFixed(0))
              .replace("{today}", formatJOD(todaySales))
              .replace("{yesterday}", formatJOD(yesterdaySales))
              .replace("{currency}", currencySymbol),
            timestamp: new Date(),
            category: "performance",
          });
        } else if (salesChange <= -20) {
          alerts.push({
            id: "sales-down",
            type: "warning",
            title: t("sales_down"),
            message: t("sales_down_msg")
              .replace("{percent}", Math.abs(salesChange).toFixed(0))
              .replace("{today}", formatJOD(todaySales))
              .replace("{yesterday}", formatJOD(yesterdaySales))
              .replace("{currency}", currencySymbol),
            timestamp: new Date(),
            category: "performance",
          });
        }
      }

      // High cancellation rate
      if (todayOrders && todayOrders.length > 5) {
        const cancellationRate = (todayCancelledOrders.length / todayOrders.length) * 100;
        if (cancellationRate > 15) {
          alerts.push({
            id: "high-cancellations",
            type: "error",
            title: t("high_cancellations"),
            message: t("high_cancellations_msg")
              .replace("{percent}", cancellationRate.toFixed(0))
              .replace("{cancelled}", String(todayCancelledOrders.length))
              .replace("{total}", String(todayOrders.length)),
            timestamp: new Date(),
            category: "performance",
          });
        }
      }

      // High void rate
      if (weekVoidedCount > 20) {
        alerts.push({
          id: "high-voids",
          type: "warning",
          title: t("high_voids"),
          message: t("high_voids_msg").replace("{count}", String(weekVoidedCount)),
          timestamp: new Date(),
          category: "performance",
        });
      }

      // High discount usage
      if (todaySales > 0 && (todayDiscounts / todaySales) > 0.15) {
        alerts.push({
          id: "high-discounts",
          type: "warning",
          title: t("high_discounts"),
          message: t("high_discounts_msg")
            .replace("{percent}", ((todayDiscounts / todaySales) * 100).toFixed(0))
            .replace("{amount}", formatJOD(todayDiscounts))
            .replace("{currency}", currencySymbol),
          timestamp: new Date(),
          category: "performance",
        });
      }

      // No orders today (after 11am)
      const currentHour = new Date().getHours();
      if (currentHour >= 11 && todayPaidOrders.length === 0) {
        alerts.push({
          id: "no-sales-today",
          type: "info",
          title: t("no_sales_today"),
          message: t("no_sales_today_msg"),
          timestamp: new Date(),
          category: "performance",
        });
      }

      // Good performance
      if (todayPaidOrders.length >= 10 && todayCancelledOrders.length === 0 && weekVoidedCount < 5) {
        alerts.push({
          id: "good-performance",
          type: "success",
          title: t("great_performance"),
          message: t("great_performance_msg"),
          timestamp: new Date(),
          category: "performance",
        });
      }

      return { alerts };
    },
    enabled: !!restaurant?.id,
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes for operational alerts
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
                    {t("notifications_alerts")}
                    {(alertCounts.error > 0 || alertCounts.warning > 0) && (
                      <Badge variant="destructive" className="ml-2">
                        {alertCounts.error + alertCounts.warning}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{t("notifications_desc")}</CardDescription>
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
                <p className="font-medium text-foreground">{t("all_clear")}</p>
                <p className="text-sm text-muted-foreground">{t("no_alerts")}</p>
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
