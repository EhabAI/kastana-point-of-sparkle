import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RestaurantHealthData {
  hasOpenShift: boolean;
  hasPendingQROrders: boolean;
}

/**
 * Fetches operational health data for all restaurants (for System Admin)
 * Returns a Map of restaurant_id -> { hasOpenShift, hasPendingQROrders }
 */
export function useAllRestaurantsHealthData() {
  return useQuery({
    queryKey: ["all-restaurants-health-data"],
    queryFn: async (): Promise<Map<string, RestaurantHealthData>> => {
      const healthMap = new Map<string, RestaurantHealthData>();

      // Fetch all open shifts grouped by restaurant
      const { data: openShifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("restaurant_id")
        .eq("status", "open");

      if (shiftsError) {
        console.error("[useAllRestaurantsHealthData] shifts error:", shiftsError);
      }

      // Fetch all pending QR orders grouped by restaurant
      const { data: pendingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("restaurant_id")
        .eq("status", "pending")
        .eq("source", "QR");

      if (ordersError) {
        console.error("[useAllRestaurantsHealthData] orders error:", ordersError);
      }

      // Build sets for quick lookup
      const restaurantsWithOpenShifts = new Set<string>();
      (openShifts || []).forEach((shift) => {
        if (shift.restaurant_id) {
          restaurantsWithOpenShifts.add(shift.restaurant_id);
        }
      });

      const restaurantsWithPendingQR = new Set<string>();
      (pendingOrders || []).forEach((order) => {
        if (order.restaurant_id) {
          restaurantsWithPendingQR.add(order.restaurant_id);
        }
      });

      // Combine into health map - we'll populate for all restaurants we encounter
      const allRestaurantIds = new Set([
        ...restaurantsWithOpenShifts,
        ...restaurantsWithPendingQR,
      ]);

      allRestaurantIds.forEach((id) => {
        healthMap.set(id, {
          hasOpenShift: restaurantsWithOpenShifts.has(id),
          hasPendingQROrders: restaurantsWithPendingQR.has(id),
        });
      });

      return healthMap;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
}
