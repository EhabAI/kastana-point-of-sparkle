import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierSession } from "./useCashierSession";

export interface RestaurantSettings {
  id: string;
  restaurant_id: string;
  tax_rate: number;
  service_charge_rate: number;
  currency: string;
  rounding_enabled: boolean;
  kds_enabled?: boolean;
  inventory_enabled?: boolean;
  qr_order_enabled?: boolean;
}

const DEFAULT_SETTINGS: Omit<RestaurantSettings, "id" | "restaurant_id"> = {
  tax_rate: 0.16,
  service_charge_rate: 0,
  currency: "JOD",
  rounding_enabled: false,
  kds_enabled: false,
  inventory_enabled: false,
  qr_order_enabled: false,
};

export function useRestaurantSettings() {
  // Use the same session data as POS.tsx for consistency
  const { data: session } = useCashierSession();
  const restaurantId = session?.restaurant?.id;

  return useQuery({
    queryKey: ["restaurant-settings", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) throw error;
      
      // Return data if exists, otherwise return defaults
      if (data) {
        return data as RestaurantSettings;
      }
      
      return { ...DEFAULT_SETTINGS, restaurant_id: restaurantId } as RestaurantSettings;
    },
    enabled: !!restaurantId,
  });
}
