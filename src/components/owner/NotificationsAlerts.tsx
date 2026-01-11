import { useState } from "react";
import { ChevronDown, Bell, AlertTriangle, AlertCircle, Info, CheckCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useBranches } from "@/hooks/useBranches";
import { startOfDay, endOfDay, subDays, format, differenceInMinutes, differenceInHours } from "date-fns";
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
  
  const [isOpen, setIsOpen] = useState(false);

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
        return <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-primary flex-shrink-0" />;
    }
  };

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return "bg-destructive/[0.03] border-destructive/15";
      case "warning":
        return "bg-warning/[0.03] border-warning/15";
      case "success":
        return "bg-success/[0.03] border-success/15";
      default:
        return "bg-primary/[0.03] border-primary/15";
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
    <div className="space-y-2">
      {/* Alerts Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span>{t("notifications_alerts")}</span>
          {(alertCounts.error > 0 || alertCounts.warning > 0) && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {alertCounts.error + alertCounts.warning}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
        </button>
      </div>

      {/* Alerts List - Full width, simple */}
      {isOpen && (
        <div className="space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="flex items-center gap-2 py-3 px-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>{t("all_clear")} — {t("no_alerts")}</span>
            </div>
          ) : (
            sortedAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{alert.title}</span>
                  <span className="text-sm text-muted-foreground ml-1.5">— {alert.message}</span>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(alert.timestamp, "HH:mm")}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
