import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useKDSEnabled(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: ["kds-enabled", restaurantId],
    queryFn: async () => {
      // IMPORTANT: We must not return a false value while the restaurantId is not resolved,
      // otherwise consumers can incorrectly conclude "KDS disabled" on first render.
      if (!restaurantId) return null;
      
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("kds_enabled")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching KDS enabled status:", error);
        // Let React Query treat this as an error (enables retries) instead of
        // caching a false value which can cause a first-load false-negative.
        throw error;
      }
      
      return data?.kds_enabled ?? false;
    },
    enabled: !!restaurantId,
  });
}
