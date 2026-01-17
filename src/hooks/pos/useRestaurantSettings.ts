import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";

export interface RestaurantSettings {
  id: string;
  restaurant_id: string;
  tax_rate: number;
  service_charge_rate: number;
  currency: string;
  rounding_enabled: boolean;
  kds_enabled?: boolean;
  inventory_enabled?: boolean;
}

const DEFAULT_SETTINGS: Omit<RestaurantSettings, "id" | "restaurant_id"> = {
  tax_rate: 0.16,
  service_charge_rate: 0,
  currency: "JOD",
  rounding_enabled: false,
  kds_enabled: false,
  inventory_enabled: false,
};

export function useRestaurantSettings() {
  const { data: restaurant } = useCashierRestaurant();

  return useQuery({
    queryKey: ["restaurant-settings", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return data if exists, otherwise return defaults
      if (data) {
        return data as RestaurantSettings;
      }
      
      return { ...DEFAULT_SETTINGS, restaurant_id: restaurant.id } as RestaurantSettings;
    },
    enabled: !!restaurant?.id,
  });
}
