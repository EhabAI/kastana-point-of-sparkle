import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

// Hook to toggle KDS module for a restaurant
export function useToggleKDSModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({
        title: variables.enabled ? "KDS Enabled" : "KDS Disabled",
        description: `Kitchen Display System has been ${variables.enabled ? "activated" : "deactivated"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update KDS setting.",
        variant: "destructive",
      });
    },
  });
}
