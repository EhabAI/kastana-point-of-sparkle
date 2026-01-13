import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RestaurantInventoryStatus {
  restaurantId: string;
  inventoryEnabled: boolean;
}

/**
 * Fetch inventory_enabled status for a specific restaurant
 */
export function useRestaurantInventoryStatus(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["restaurant-inventory-status", restaurantId],
    queryFn: async (): Promise<boolean> => {
      if (!restaurantId) return false;

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("inventory_enabled")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) {
        console.error("[useRestaurantInventoryStatus] Error:", error);
        return false;
      }

      return data?.inventory_enabled ?? false;
    },
    enabled: !!restaurantId,
  });
}

/**
 * Fetch inventory_enabled status for ALL restaurants (for System Admin view)
 */
export function useAllRestaurantsInventoryStatus() {
  return useQuery({
    queryKey: ["all-restaurants-inventory-status"],
    queryFn: async (): Promise<Map<string, boolean>> => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("restaurant_id, inventory_enabled");

      if (error) {
        console.error("[useAllRestaurantsInventoryStatus] Error:", error);
        return new Map();
      }

      const statusMap = new Map<string, boolean>();
      data?.forEach((setting) => {
        statusMap.set(setting.restaurant_id, setting.inventory_enabled ?? false);
      });

      return statusMap;
    },
  });
}

/**
 * Toggle inventory module for a restaurant (System Admin only)
 */
export function useToggleInventoryModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ restaurantId, enabled }: { restaurantId: string; enabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke("toggle-inventory-module", {
        body: { restaurantId, enabled },
      });

      if (error) {
        throw new Error(error.message || "Failed to toggle inventory module");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to toggle inventory module");
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["restaurant-inventory-status", variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["all-restaurants-inventory-status"] });

      toast({
        title: variables.enabled ? "Inventory Module Enabled" : "Inventory Module Disabled",
        description: data.message || `Inventory module has been ${variables.enabled ? "enabled" : "disabled"}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
