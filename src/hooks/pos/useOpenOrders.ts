import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface OpenOrder {
  id: string;
  order_number: number;
  status: string;
  total: number;
  subtotal: number;
  created_at: string;
  notes: string | null;
  order_notes: string | null;
  order_items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes: string | null;
    voided: boolean;
  }[];
}

export function useOpenOrders(branchId: string | undefined) {
  return useQuery({
    queryKey: ["open-orders", branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, subtotal, created_at, notes, order_notes, order_items(id, name, quantity, price, notes, voided)")
        .eq("branch_id", branchId)
        .in("status", ["open", "confirmed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as OpenOrder[];
    },
    enabled: !!branchId,
  });
}

export function useMoveOrderToTable() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      tableId, 
      tableName,
      previousTableId,
      previousTableName,
    }: { 
      orderId: string; 
      tableId: string;
      tableName: string;
      previousTableId?: string;
      previousTableName?: string;
    }) => {
      // Update order notes to reflect new table
      const { data, error } = await supabase
        .from("orders")
        .update({ 
          notes: `table:${tableId}`,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, tableName, previousTableName };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      
      // Log to audit
      if (user?.id && restaurant?.id) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          entity_type: "order",
          entity_id: data.id,
          action: "ORDER_TABLE_CHANGED",
          details: { 
            order_number: data.order_number,
            from_table: data.previousTableName || "None",
            to_table: data.tableName,
          } as unknown as Json,
        });
      }
    },
  });
}

export function useMergeOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      primaryOrderId,
      secondaryOrderId,
      restaurantId,
    }: {
      primaryOrderId: string;
      secondaryOrderId: string;
      restaurantId: string;
    }) => {
      // 1. Get all items from secondary order
      const { data: secondaryItems, error: itemsError } = await supabase
        .from("order_items")
        .select("id, menu_item_id, name, price, quantity, notes, voided, void_reason")
        .eq("order_id", secondaryOrderId);

      if (itemsError) throw itemsError;

      // 2. Move items to primary order (re-insert with new order_id)
      if (secondaryItems && secondaryItems.length > 0) {
        for (const item of secondaryItems) {
          // Insert item into primary order
          const { data: newItem, error: insertError } = await supabase
            .from("order_items")
            .insert({
              order_id: primaryOrderId,
              restaurant_id: restaurantId,
              menu_item_id: item.menu_item_id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              notes: item.notes,
              voided: item.voided,
              void_reason: item.void_reason,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Copy modifiers if any
          const { data: modifiers } = await supabase
            .from("order_item_modifiers")
            .select("modifier_option_id, modifier_name, option_name, price_adjustment")
            .eq("order_item_id", item.id);

          if (modifiers && modifiers.length > 0) {
            await supabase.from("order_item_modifiers").insert(
              modifiers.map((mod) => ({
                order_item_id: newItem.id,
                modifier_option_id: mod.modifier_option_id,
                modifier_name: mod.modifier_name,
                option_name: mod.option_name,
                price_adjustment: mod.price_adjustment,
              }))
            );
          }

          // Delete original item
          await supabase.from("order_items").delete().eq("id", item.id);
        }
      }

      // 3. Close secondary order as cancelled (merged)
      const { error: closeError } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_reason: "Merged into another order",
          notes: null, // Clear table assignment
        })
        .eq("id", secondaryOrderId);

      if (closeError) throw closeError;

      return { primaryOrderId, secondaryOrderId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}
