import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";

export type MenuItemType = 'drink' | 'food' | 'ready_product' | 'addon' | 'service' | 'combo';

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  is_offer: boolean;
  is_favorite: boolean;
  item_type: MenuItemType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useMenuItems(restaurantId?: string, categoryId?: string) {
  return useQuery({
    queryKey: ["menu-items", restaurantId, categoryId],
    queryFn: async () => {
      if (!restaurantId || !categoryId) return [];

      // تأكيد أن الـ category فعلاً تابعة لنفس المطعم (حماية مهمة)
      const { data: cat, error: catError } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("id", categoryId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (catError) throw catError;
      if (!cat) return []; // category ليست لهذا المطعم

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("category_id", categoryId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!restaurantId && !!categoryId,
  });
}

export function useAllMenuItems(restaurantId?: string) {
  return useQuery({
    queryKey: ["all-menu-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      // First get all categories for this restaurant
      const { data: categories, error: catError } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("restaurant_id", restaurantId);

      if (catError) throw catError;
      if (!categories || categories.length === 0) return [];

      const categoryIds = categories.map((c) => c.id);

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .in("category_id", categoryIds)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (item: {
      category_id: string;
      name: string;
      description?: string;
      price: number;
      is_available?: boolean;
      is_offer?: boolean;
      item_type?: MenuItemType;
    }) => {
      // Get max sort order
      const { data: existing } = await supabase
        .from("menu_items")
        .select("sort_order")
        .eq("category_id", item.category_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

      const { data, error } = await supabase
        .from("menu_items")
        .insert({ ...item, sort_order: sortOrder })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
      toast({ title: t("item_created") || "Menu item created successfully" });
    },
    onError: (error: Error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItem> & { id: string }) => {
      const { data, error } = await supabase.from("menu_items").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
      toast({ title: t("item_updated") || "Menu item updated successfully" });
    },
    onError: (error: Error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
      toast({ title: t("item_deleted") || "Menu item deleted successfully" });
    },
    onError: (error: Error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}
