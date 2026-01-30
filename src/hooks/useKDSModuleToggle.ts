import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
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
 * Toggle KDS module for a restaurant
 * Toast messages should be handled by the caller for proper localization
 */
export function useToggleKDSModule(callbacks?: ToggleKDSCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ restaurantId, enabled }: { restaurantId: string; enabled: boolean }) => {
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from("restaurant_settings")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from("restaurant_settings")
          .update({ kds_enabled: enabled, updated_at: new Date().toISOString() })
          .eq("restaurant_id", restaurantId);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("restaurant_settings")
          .insert({ restaurant_id: restaurantId, kds_enabled: enabled });

        if (error) throw error;
      }

      return { restaurantId, enabled };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-restaurants-kds-status"] });
      queryClient.invalidateQueries({ queryKey: ["kds-enabled"] });
      callbacks?.onSuccessCallback?.(variables.enabled);
    },
    onError: (error: Error) => {
      callbacks?.onErrorCallback?.(error);
    },
  });
}
