import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";

export function useCashierCategories() {
  const { data: restaurant } = useCashierRestaurant();

  return useQuery({
    queryKey: ["cashier-categories", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];

      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurant?.id,
  });
}

export function useCashierMenuItems(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["cashier-menu-items", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!categoryId,
  });
}
