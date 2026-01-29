import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierSession } from "./useCashierSession";

// Helper to check if a category is time-active (for Offers category)
function isCategoryTimeActive(category: { promo_start: string | null; promo_end: string | null }): boolean {
  const now = new Date();
  const promoStart = category.promo_start ? new Date(category.promo_start) : null;
  const promoEnd = category.promo_end ? new Date(category.promo_end) : null;

  // No dates = always visible (timeless)
  if (!promoStart && !promoEnd) {
    return true;
  }

  // Check if within date range
  const afterStart = !promoStart || promoStart <= now;
  const beforeEnd = !promoEnd || promoEnd >= now;

  return afterStart && beforeEnd;
}

// Helper to check if category is the Offers category
function isOfferCategory(name: string): boolean {
  return name === "العروض" || name.toLowerCase() === "offers";
}

export function useCashierCategories() {
  const { data: session } = useCashierSession();

  return useQuery({
    queryKey: ["cashier-categories", session?.branch?.id],
    queryFn: async () => {
      if (!session?.branch?.id) return [];

      // Get categories active for this branch with branch-specific sort order
      // Also fetch promo_start and promo_end for time-based filtering
      const { data, error } = await supabase
        .from("branch_menu_categories")
        .select(`
          id,
          sort_order,
          category:menu_categories!inner(
            id,
            name,
            restaurant_id,
            promo_start,
            promo_end
          )
        `)
        .eq("branch_id", session.branch.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Flatten the response and filter based on time for Offers category
      return (data || [])
        .filter((item) => {
          // For offers category, check if within time range
          if (isOfferCategory(item.category.name)) {
            return isCategoryTimeActive({
              promo_start: item.category.promo_start,
              promo_end: item.category.promo_end,
            });
          }
          // All other categories pass through
          return true;
        })
        .map((item) => ({
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
          promo_enabled,
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
        .eq("menu_item.category_id", categoryId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Flatten and calculate effective price
      return (data || []).map((item) => {
        const now = new Date();
        const promoStart = item.promo_start ? new Date(item.promo_start) : null;
        const promoEnd = item.promo_end ? new Date(item.promo_end) : null;
        const promoEnabled = item.promo_enabled !== false; // default true for backward compat
        
        // Promo is active only if enabled AND within time range
        const isPromoActive =
          item.promo_price &&
          promoEnabled &&
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
          is_favorite: item.menu_item.is_favorite,
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

export function useCashierAllMenuItems() {
  const { data: session } = useCashierSession();

  return useQuery({
    queryKey: ["cashier-all-menu-items", session?.branch?.id],
    queryFn: async () => {
      if (!session?.branch?.id) return [];

      // Get ALL menu items for this branch (no category filter)
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
          promo_enabled,
          sort_order,
          menu_item:menu_items!inner(
            id,
            name,
            description,
            price,
            is_available,
            category_id,
            is_favorite,
            menu_category:menu_categories!inner(
              id,
              name
            )
          )
        `)
        .eq("branch_id", session.branch.id)
        .eq("is_active", true)
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Flatten and calculate effective price
      return (data || []).map((item) => {
        const now = new Date();
        const promoStart = item.promo_start ? new Date(item.promo_start) : null;
        const promoEnd = item.promo_end ? new Date(item.promo_end) : null;
        const promoEnabled = item.promo_enabled !== false;
        
        const isPromoActive =
          item.promo_price &&
          promoEnabled &&
          (!promoStart || promoStart <= now) &&
          (!promoEnd || promoEnd >= now);

        const basePrice = item.price ?? item.menu_item.price;
        const effectivePrice = isPromoActive ? item.promo_price : basePrice;

        return {
          id: item.menu_item.id,
          name: item.menu_item.name,
          description: item.menu_item.description,
          category_id: item.menu_item.category_id,
          category_name: item.menu_item.menu_category.name,
          price: basePrice,
          is_available: item.is_available,
          is_offer: false,
          is_favorite: item.menu_item.is_favorite,
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
          promo_enabled,
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
        const promoEnabled = item.promo_enabled !== false;
        
        const isPromoActive =
          item.promo_price &&
          promoEnabled &&
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
