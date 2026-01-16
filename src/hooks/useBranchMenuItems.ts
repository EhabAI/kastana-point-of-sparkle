import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";

export interface BranchMenuItem {
  id: string;
  branch_id: string;
  menu_item_id: string;
  price: number | null;
  is_available: boolean;
  is_active: boolean;
  promo_price: number | null;
  promo_label: string | null;
  promo_start: string | null;
  promo_end: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  menu_item?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category_id: string;
    is_available: boolean;
    is_offer: boolean;
  };
}

export interface BranchMenuItemWithBase extends BranchMenuItem {
  effective_price: number;
  is_promo_active: boolean;
  base_name: string;
  base_description: string | null;
  category_id: string;
}

export function useBranchMenuItems(branchId: string | undefined, categoryId?: string) {
  return useQuery({
    queryKey: ["branch-menu-items", branchId, categoryId],
    queryFn: async () => {
      if (!branchId) return [];

      let query = supabase
        .from("branch_menu_items")
        .select(`
          *,
          menu_item:menu_items(id, name, description, price, category_id, is_available, is_offer)
        `)
        .eq("branch_id", branchId);

      if (categoryId) {
        query = query.eq("menu_item.category_id", categoryId);
      }

      const { data, error } = await query.order("sort_order", { ascending: true });

      if (error) throw error;

      // Filter out items where menu_item is null (deleted items)
      const validItems = (data || []).filter((item: any) => item.menu_item !== null);

      // Calculate effective price and promo status
      const now = new Date();
      return validItems.map((item: any): BranchMenuItemWithBase => {
        const isPromoActive = !!(
          item.promo_price !== null &&
          item.promo_start &&
          item.promo_end &&
          new Date(item.promo_start) <= now &&
          new Date(item.promo_end) >= now
        );

        const effectivePrice = isPromoActive
          ? item.promo_price
          : (item.price ?? item.menu_item.price);

        return {
          ...item,
          effective_price: effectivePrice,
          is_promo_active: isPromoActive,
          base_name: item.menu_item.name,
          base_description: item.menu_item.description,
          category_id: item.menu_item.category_id,
        };
      });
    },
    enabled: !!branchId,
  });
}

export function useUpdateBranchMenuItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<BranchMenuItem> & { id: string }) => {
      const { data: item, error } = await supabase
        .from("branch_menu_items")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["branch-menu-items", data.branch_id] });
      toast({ title: t("item_updated") || "Item updated successfully" });
    },
    onError: (error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}

export function useBulkUpdateBranchMenuItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      branchId,
      itemIds,
      updates,
    }: {
      branchId: string;
      itemIds: string[];
      updates: Partial<Pick<BranchMenuItem, 'is_available' | 'is_active' | 'promo_price' | 'promo_label' | 'promo_start' | 'promo_end'>>;
    }) => {
      const { data, error } = await supabase
        .from("branch_menu_items")
        .update(updates)
        .eq("branch_id", branchId)
        .in("menu_item_id", itemIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branch-menu-items", variables.branchId] });
      toast({ title: t("items_updated") || "Items updated successfully" });
    },
    onError: (error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}

export function useCopyBranchPrices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      sourceBranchId,
      targetBranchId,
      copyPromos = false,
    }: {
      sourceBranchId: string;
      targetBranchId: string;
      copyPromos?: boolean;
    }) => {
      // Get source branch items
      const { data: sourceItems, error: sourceError } = await supabase
        .from("branch_menu_items")
        .select("*")
        .eq("branch_id", sourceBranchId);

      if (sourceError) throw sourceError;

      // Update target branch items
      for (const item of sourceItems || []) {
        const updateData: Partial<BranchMenuItem> = {
          price: item.price,
        };

        if (copyPromos) {
          updateData.promo_price = item.promo_price;
          updateData.promo_label = item.promo_label;
          updateData.promo_start = item.promo_start;
          updateData.promo_end = item.promo_end;
        }

        await supabase
          .from("branch_menu_items")
          .update(updateData)
          .eq("branch_id", targetBranchId)
          .eq("menu_item_id", item.menu_item_id);
      }

      return { sourceBranchId, targetBranchId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branch-menu-items", variables.targetBranchId] });
      toast({ title: t("prices_copied") || "Prices copied successfully" });
    },
    onError: (error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}
