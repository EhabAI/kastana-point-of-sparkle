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
      return data as MenuCategory[];
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
    mutationFn: async ({ id, name, is_active }: { id: string; name?: string; is_active?: boolean }) => {
      const updates: Partial<MenuCategory> = {};
      if (name !== undefined) updates.name = name;
      if (is_active !== undefined) updates.is_active = is_active;

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
