import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from "@/contexts/LanguageContext";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  promo_start: string | null;
  promo_end: string | null;
}

export type CategoryPromoStatus = 'active' | 'scheduled' | 'expired' | 'none';

export interface MenuCategoryWithStatus extends MenuCategory {
  promo_status: CategoryPromoStatus;
}

// Helper to compute category promo status
export function computeCategoryPromoStatus(category: MenuCategory): CategoryPromoStatus {
  const now = new Date();
  const promoStart = category.promo_start ? new Date(category.promo_start) : null;
  const promoEnd = category.promo_end ? new Date(category.promo_end) : null;

  // No dates = no time-based status
  if (!promoStart && !promoEnd) {
    return 'none';
  }

  // If scheduled (start date in future)
  if (promoStart && now < promoStart) {
    return 'scheduled';
  }

  // If expired (end date passed)
  if (promoEnd && now > promoEnd) {
    return 'expired';
  }

  // Within date range = active
  return 'active';
}

// Helper to check if category is currently visible (for POS/QR)
export function isCategoryTimeActive(category: MenuCategory): boolean {
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

export function useMenuCategories(restaurantId?: string) {
  return useQuery({
    queryKey: ['menu-categories', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      // Add computed promo_status
      return (data as MenuCategory[]).map((cat): MenuCategoryWithStatus => ({
        ...cat,
        promo_status: computeCategoryPromoStatus(cat),
      }));
    },
    enabled: !!restaurantId,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ restaurantId, name }: { restaurantId: string; name: string }) => {
      // Get max sort order
      const { data: existing } = await supabase
        .from('menu_categories')
        .select('sort_order')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

      const { data, error } = await supabase
        .from('menu_categories')
        .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast({ title: t("category_created") || 'Category created successfully' });
    },
    onError: (error: Error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: 'destructive' });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      is_active,
      promo_start,
      promo_end,
    }: { 
      id: string; 
      name?: string; 
      is_active?: boolean;
      promo_start?: string | null;
      promo_end?: string | null;
    }) => {
      const updates: Partial<MenuCategory> = {};
      if (name !== undefined) updates.name = name;
      if (is_active !== undefined) updates.is_active = is_active;
      if (promo_start !== undefined) updates.promo_start = promo_start;
      if (promo_end !== undefined) updates.promo_end = promo_end;

      const { data, error } = await supabase
        .from('menu_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast({ title: t("category_updated") || 'Category updated successfully' });
    },
    onError: (error: Error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: 'destructive' });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast({ title: t("category_deleted") || 'Category deleted successfully' });
    },
    onError: (error: Error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: 'destructive' });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categories: { id: string; sort_order: number }[]) => {
      const updates = categories.map(({ id, sort_order }) =>
        supabase.from('menu_categories').update({ sort_order }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
  });
}
