import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComboItem {
  id: string;
  combo_id: string;
  menu_item_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  menu_item_name?: string;
  menu_item_price?: number;
}

export function useComboItems(comboId: string | undefined) {
  return useQuery({
    queryKey: ["combo-items", comboId],
    queryFn: async (): Promise<ComboItem[]> => {
      if (!comboId) return [];

      const { data, error } = await supabase
        .from("combo_items")
        .select(`
          id,
          combo_id,
          menu_item_id,
          quantity,
          created_at,
          updated_at,
          menu_items:menu_item_id (
            name,
            price
          )
        `)
        .eq("combo_id", comboId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[useComboItems] Error fetching combo items:", error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        combo_id: item.combo_id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        created_at: item.created_at,
        updated_at: item.updated_at,
        menu_item_name: item.menu_items?.name,
        menu_item_price: item.menu_items?.price,
      }));
    },
    enabled: !!comboId,
  });
}

export function useAddComboItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comboId,
      menuItemId,
      quantity,
    }: {
      comboId: string;
      menuItemId: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase
        .from("combo_items")
        .insert({
          combo_id: comboId,
          menu_item_id: menuItemId,
          quantity,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["combo-items", variables.comboId] });
    },
  });
}

export function useUpdateComboItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comboId,
      quantity,
    }: {
      id: string;
      comboId: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase
        .from("combo_items")
        .update({ quantity })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["combo-items", variables.comboId] });
    },
  });
}

export function useDeleteComboItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comboId,
    }: {
      id: string;
      comboId: string;
    }) => {
      const { error } = await supabase.from("combo_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["combo-items", variables.comboId] });
    },
  });
}
