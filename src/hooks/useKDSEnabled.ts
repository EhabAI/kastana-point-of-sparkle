import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useKDSEnabled(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: ["kds-enabled", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return false;
      
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("kds_enabled")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching KDS enabled status:", error);
        return false;
      }
      
      return data?.kds_enabled ?? false;
    },
    enabled: !!restaurantId,
  });
}
