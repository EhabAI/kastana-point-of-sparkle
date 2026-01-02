import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierSession } from "./useCashierSession";

export function useCashierCategories() {
  const { data: session } = useCashierSession();

  return useQuery({
    queryKey: ["cashier-categories", session?.branch?.id],
    queryFn: async () => {
      if (!session?.branch?.id) return [];

      // Get categories active for this branch with branch-specific sort order
      const { data, error } = await supabase
        .from("branch_menu_categories")
        .select(`
          id,
          sort_order,
          category:menu_categories!inner(
            id,
            name,
            restaurant_id
          )
        `)
        .eq("branch_id", session.branch.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Flatten the response to match expected Category shape
      return (data || []).map((item) => ({
        id: item.category.id,
        name: item.category.name,
        restaurant_id: item.category.restaurant_id,
        sort_order: item.sort_order,
      }));
    },
    enabled: !!session?.branch?.id,
  });
}

export function useCashierMenuItems(categoryId: string | undefined) {
  const { data: session } = useCashierSession();

  return useQuery({
    queryKey: ["cashier-menu-items", session?.branch?.id, categoryId],
    queryFn: async () => {
      if (!categoryId || !session?.branch?.id) return [];

      // Get menu items with branch-specific overrides
      const { data, error } = await supabase
        .from("branch_menu_items")
        .select(`
          id,
          price,
          is_available,
          promo_price,
          promo_start,
          promo_end,
          promo_label,
          sort_order,
          menu_item:menu_items!inner(
            id,
            name,
            description,
            price,
            is_available,
            category_id
          )
        `)
        .eq("branch_id", session.branch.id)
        .eq("is_active", true)
        .eq("is_available", true)
        .eq("menu_item.category_id", categoryId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Flatten and calculate effective price
      return (data || []).map((item) => {
        const now = new Date();
        const promoStart = item.promo_start ? new Date(item.promo_start) : null;
        const promoEnd = item.promo_end ? new Date(item.promo_end) : null;
        const isPromoActive =
          item.promo_price &&
          (!promoStart || promoStart <= now) &&
          (!promoEnd || promoEnd >= now);

        const basePrice = item.price ?? item.menu_item.price;
        const effectivePrice = isPromoActive ? item.promo_price : basePrice;

        return {
          id: item.menu_item.id,
          name: item.menu_item.name,
          description: item.menu_item.description,
          category_id: item.menu_item.category_id,
          price: basePrice,
          is_available: item.is_available,
          is_offer: false,
          sort_order: item.sort_order ?? 0,
          promo_price: item.promo_price,
          promo_label: item.promo_label,
          effective_price: effectivePrice,
        };
      });
    },
    enabled: !!categoryId && !!session?.branch?.id,
  });
}

export function useCashierFavoriteItems() {
  const { data: session } = useCashierSession();

  return useQuery({
    queryKey: ["cashier-favorite-items", session?.branch?.id],
    queryFn: async () => {
      if (!session?.branch?.id) return [];

      // Get menu items that are marked as favorite with branch-specific overrides
      const { data, error } = await supabase
        .from("branch_menu_items")
        .select(`
          id,
          price,
          is_available,
          promo_price,
          promo_start,
          promo_end,
          promo_label,
          sort_order,
          menu_item:menu_items!inner(
            id,
            name,
            description,
            price,
            is_available,
            category_id,
            is_favorite
          )
        `)
        .eq("branch_id", session.branch.id)
        .eq("is_active", true)
        .eq("is_available", true)
        .eq("menu_item.is_favorite", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Flatten and calculate effective price
      return (data || []).map((item) => {
        const now = new Date();
        const promoStart = item.promo_start ? new Date(item.promo_start) : null;
        const promoEnd = item.promo_end ? new Date(item.promo_end) : null;
        const isPromoActive =
          item.promo_price &&
          (!promoStart || promoStart <= now) &&
          (!promoEnd || promoEnd >= now);

        const basePrice = item.price ?? item.menu_item.price;
        const effectivePrice = isPromoActive ? item.promo_price : basePrice;

        return {
          id: item.menu_item.id,
          name: item.menu_item.name,
          description: item.menu_item.description,
          category_id: item.menu_item.category_id,
          price: basePrice,
          is_available: item.is_available,
          is_offer: false,
          is_favorite: true,
          sort_order: item.sort_order ?? 0,
          promo_price: item.promo_price,
          promo_label: item.promo_label,
          effective_price: effectivePrice,
        };
      });
    },
    enabled: !!session?.branch?.id,
  });
}
