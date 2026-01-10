import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if a restaurant is active
 * Used for frontend guards to block inactive restaurants
 */
export function useRestaurantActiveStatus(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: ["restaurant-active-status", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data, error } = await supabase
        .from("restaurants")
        .select("is_active")
        .eq("id", restaurantId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching restaurant active status:", error);
        return null;
      }

      return data?.is_active ?? null;
    },
    enabled: !!restaurantId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to fetch restaurant active status using RPC for public access
 * Used in Menu.tsx where user is not authenticated
 */
export function usePublicRestaurantActiveStatus(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-restaurant-active-status", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      // Use RPC to bypass RLS for public access
      const { data, error } = await supabase.rpc("is_restaurant_active", {
        p_restaurant_id: restaurantId,
      });

      if (error) {
        console.error("Error fetching public restaurant active status:", error);
        return null;
      }

      return data as boolean;
    },
    enabled: !!restaurantId,
    staleTime: 30000,
  });
}
