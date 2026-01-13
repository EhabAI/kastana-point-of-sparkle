import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";

/**
 * Hook to check if inventory module is enabled for the current owner's restaurant
 * Returns { isEnabled, isLoading } for UI guards
 */
export function useInventoryEnabled() {
  const { data: restaurant } = useOwnerRestaurant();

  const query = useQuery({
    queryKey: ["inventory-enabled", restaurant?.id],
    queryFn: async (): Promise<boolean> => {
      if (!restaurant?.id) return false;

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("inventory_enabled")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (error) {
        console.error("[useInventoryEnabled] Error:", error);
        return false;
      }

      return data?.inventory_enabled ?? false;
    },
    enabled: !!restaurant?.id,
  });

  return {
    isEnabled: query.data ?? false,
    isLoading: query.isLoading,
    restaurantId: restaurant?.id,
  };
}
