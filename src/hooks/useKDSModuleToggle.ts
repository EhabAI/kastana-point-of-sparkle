import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Hook to get all restaurants' KDS status
export function useAllRestaurantsKDSStatus() {
  return useQuery({
    queryKey: ["all-restaurants-kds-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("restaurant_id, kds_enabled");

      if (error) throw error;

      const statusMap = new Map<string, boolean>();
      (data || []).forEach((row) => {
        statusMap.set(row.restaurant_id, row.kds_enabled ?? false);
      });

      return statusMap;
    },
  });
}

interface ToggleKDSCallbacks {
  onSuccessCallback?: (enabled: boolean) => void;
  onErrorCallback?: (error: Error) => void;
}

/**
 * Toggle KDS module for a restaurant (System Admin only)
 * Uses edge function for proper authorization and audit logging
 * Toast messages should be handled by the caller for proper localization
 */
export function useToggleKDSModule(callbacks?: ToggleKDSCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ restaurantId, enabled }: { restaurantId: string; enabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke("toggle-kds-module", {
        body: { restaurantId, enabled },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { ...data, enabled };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-restaurants-kds-status"] });
      queryClient.invalidateQueries({ queryKey: ["kds-enabled"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-settings"] });
      callbacks?.onSuccessCallback?.(variables.enabled);
    },
    onError: (error: Error) => {
      console.error("Toggle KDS module error:", error);
      callbacks?.onErrorCallback?.(error);
    },
  });
}
