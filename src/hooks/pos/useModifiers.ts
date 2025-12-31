import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModifierOption {
  id: string;
  name: string;
  price_adjustment: number;
  is_default: boolean;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description?: string | null;
  is_required: boolean;
  max_selections?: number | null;
  sort_order: number;
  options: ModifierOption[];
}

export interface SelectedModifier {
  modifier_option_id: string;
  modifier_name: string;
  option_name: string;
  price_adjustment: number;
}

// Fetch modifier groups for a specific menu item
export function useMenuItemModifiers(menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["menu-item-modifiers", menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];

      // Get modifier groups linked to this menu item
      const { data: links, error: linksError } = await supabase
        .from("menu_item_modifier_groups")
        .select(`
          modifier_group_id,
          sort_order,
          modifier_groups!inner (
            id,
            name,
            description,
            is_required,
            max_selections,
            sort_order
          )
        `)
        .eq("menu_item_id", menuItemId)
        .order("sort_order");

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      // Get all modifier group IDs
      const groupIds = links.map((link) => (link.modifier_groups as any).id);

      // Fetch all options for these groups
      const { data: options, error: optionsError } = await supabase
        .from("modifier_options")
        .select("*")
        .in("modifier_group_id", groupIds)
        .eq("is_active", true)
        .order("sort_order");

      if (optionsError) throw optionsError;

      // Build the result with options grouped by their group
      const result: ModifierGroup[] = links.map((link) => {
        const group = link.modifier_groups as any;
        const groupOptions = (options || [])
          .filter((opt) => opt.modifier_group_id === group.id)
          .map((opt) => ({
            id: opt.id,
            name: opt.name,
            price_adjustment: Number(opt.price_adjustment),
            is_default: opt.is_default,
            sort_order: opt.sort_order,
          }));

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          is_required: group.is_required,
          max_selections: group.max_selections,
          sort_order: group.sort_order,
          options: groupOptions,
        };
      });

      return result;
    },
    enabled: !!menuItemId,
  });
}

// Fetch modifiers for an order item
export function useOrderItemModifiers(orderItemId: string | undefined) {
  return useQuery({
    queryKey: ["order-item-modifiers", orderItemId],
    queryFn: async () => {
      if (!orderItemId) return [];

      const { data, error } = await supabase
        .from("order_item_modifiers")
        .select("*")
        .eq("order_item_id", orderItemId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orderItemId,
  });
}

// Add modifiers to an order item
export function useAddOrderItemModifiers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderItemId,
      modifiers,
    }: {
      orderItemId: string;
      modifiers: SelectedModifier[];
    }) => {
      if (modifiers.length === 0) return [];

      const inserts = modifiers.map((mod) => ({
        order_item_id: orderItemId,
        modifier_option_id: mod.modifier_option_id,
        modifier_name: mod.modifier_name,
        option_name: mod.option_name,
        price_adjustment: mod.price_adjustment,
      }));

      const { data, error } = await supabase
        .from("order_item_modifiers")
        .insert(inserts)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["order-item-modifiers"] });
    },
  });
}
