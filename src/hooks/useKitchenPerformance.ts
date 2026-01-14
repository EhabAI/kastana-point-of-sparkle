import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, differenceInMinutes, startOfWeek, format } from "date-fns";

interface KitchenPerformanceData {
  avgPrepTimeToday: number;
  avgPrepTimeYesterday: number;
  prepTimeTrend: "up" | "down" | "same";
  ordersByStatus: {
    NEW: number;
    IN_PROGRESS: number;
    READY: number;
  };
  delayedOrdersCount: number;
  delayedOrdersPercent: number;
  totalOrdersToday: number;
  peakHourToday: number | null;
  peakHourTodayCount: number;
  peakHourWeek: number | null;
  peakHourWeekCount: number;
}

export function useKitchenPerformance(restaurantId: string | undefined, branchId?: string) {
  return useQuery({
    queryKey: ["kitchen-performance", restaurantId, branchId],
    queryFn: async (): Promise<KitchenPerformanceData> => {
      if (!restaurantId) {
        throw new Error("Restaurant ID is required");
      }

      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
      const yesterdayEnd = endOfDay(subDays(now, 1)).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 }).toISOString();

      // Build base query
      let baseQuery = supabase
        .from("orders")
        .select("id, status, created_at, updated_at")
        .eq("restaurant_id", restaurantId);

      if (branchId) {
        baseQuery = baseQuery.eq("branch_id", branchId);
      }

      // Get today's orders
      const { data: todayOrders, error: todayError } = await baseQuery
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      if (todayError) throw todayError;

      // Get yesterday's READY orders for comparison
      let yesterdayQuery = supabase
        .from("orders")
        .select("id, created_at, updated_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "READY")
        .gte("created_at", yesterdayStart)
        .lt("created_at", yesterdayEnd);

      if (branchId) {
        yesterdayQuery = yesterdayQuery.eq("branch_id", branchId);
      }

      const { data: yesterdayOrders, error: yesterdayError } = await yesterdayQuery;
      if (yesterdayError) throw yesterdayError;

      // Get week's orders for peak hour analysis
      let weekQuery = supabase
        .from("orders")
        .select("id, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", weekStart)
        .lt("created_at", todayEnd);

      if (branchId) {
        weekQuery = weekQuery.eq("branch_id", branchId);
      }

      const { data: weekOrders, error: weekError } = await weekQuery;
      if (weekError) throw weekError;

      // Calculate orders by status (current snapshot - not filtered by date for real-time view)
      const ordersByStatus = {
        NEW: 0,
        IN_PROGRESS: 0,
        READY: 0,
      };

      // For status counts, we want current open orders
      let statusQuery = supabase
        .from("orders")
        .select("id, status")
        .eq("restaurant_id", restaurantId)
        .in("status", ["NEW", "IN_PROGRESS", "READY"]);

      if (branchId) {
        statusQuery = statusQuery.eq("branch_id", branchId);
      }

      const { data: statusOrders, error: statusError } = await statusQuery;
      if (statusError) throw statusError;

      statusOrders?.forEach(order => {
        if (order.status === "NEW") ordersByStatus.NEW++;
        else if (order.status === "IN_PROGRESS") ordersByStatus.IN_PROGRESS++;
        else if (order.status === "READY") ordersByStatus.READY++;
      });

      // Calculate average prep time for today's READY orders
      const todayReadyOrders = todayOrders?.filter(o => o.status === "READY" || o.status === "paid") || [];
      let avgPrepTimeToday = 0;
      let delayedCount = 0;

      if (todayReadyOrders.length > 0) {
        const prepTimes = todayReadyOrders.map(order => {
          const prepTime = differenceInMinutes(new Date(order.updated_at), new Date(order.created_at));
          if (prepTime > 15) delayedCount++;
          return prepTime;
        });
        avgPrepTimeToday = Math.round(prepTimes.reduce((sum, t) => sum + t, 0) / prepTimes.length);
      }

      // Calculate average prep time for yesterday's READY orders
      let avgPrepTimeYesterday = 0;
      if (yesterdayOrders && yesterdayOrders.length > 0) {
        const prepTimes = yesterdayOrders.map(order => 
          differenceInMinutes(new Date(order.updated_at), new Date(order.created_at))
        );
        avgPrepTimeYesterday = Math.round(prepTimes.reduce((sum, t) => sum + t, 0) / prepTimes.length);
      }

      // Determine trend
      let prepTimeTrend: "up" | "down" | "same" = "same";
      if (avgPrepTimeToday > avgPrepTimeYesterday + 1) {
        prepTimeTrend = "up"; // Worse - taking longer
      } else if (avgPrepTimeToday < avgPrepTimeYesterday - 1) {
        prepTimeTrend = "down"; // Better - faster
      }

      // Calculate delayed orders percentage
      const totalOrdersToday = todayReadyOrders.length;
      const delayedOrdersPercent = totalOrdersToday > 0 
        ? Math.round((delayedCount / totalOrdersToday) * 100) 
        : 0;

      // Calculate peak hours for today
      const todayHourCounts: Record<number, number> = {};
      todayOrders?.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        todayHourCounts[hour] = (todayHourCounts[hour] || 0) + 1;
      });

      let peakHourToday: number | null = null;
      let peakHourTodayCount = 0;
      Object.entries(todayHourCounts).forEach(([hour, count]) => {
        if (count > peakHourTodayCount) {
          peakHourToday = parseInt(hour);
          peakHourTodayCount = count;
        }
      });

      // Calculate peak hours for the week
      const weekHourCounts: Record<number, number> = {};
      weekOrders?.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        weekHourCounts[hour] = (weekHourCounts[hour] || 0) + 1;
      });

      let peakHourWeek: number | null = null;
      let peakHourWeekCount = 0;
      Object.entries(weekHourCounts).forEach(([hour, count]) => {
        if (count > peakHourWeekCount) {
          peakHourWeek = parseInt(hour);
          peakHourWeekCount = count;
        }
      });

      return {
        avgPrepTimeToday,
        avgPrepTimeYesterday,
        prepTimeTrend,
        ordersByStatus,
        delayedOrdersCount: delayedCount,
        delayedOrdersPercent,
        totalOrdersToday,
        peakHourToday,
        peakHourTodayCount,
        peakHourWeek,
        peakHourWeekCount,
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 60000, // Refresh every minute
  });
}
