import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCashierRestaurant() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cashier-restaurant", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get restaurant_id from user_roles for cashier
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .eq("role", "cashier")
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData?.restaurant_id) return null;

      // Get restaurant details
      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", roleData.restaurant_id)
        .maybeSingle();

      if (restaurantError) throw restaurantError;
      return restaurant;
    },
    enabled: !!user?.id,
  });
}
