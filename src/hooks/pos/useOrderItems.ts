import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./useAuditLog";

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export function useAddOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      restaurantId,
      menuItem,
      quantity = 1,
      notes,
    }: {
      orderId: string;
      restaurantId: string;
      menuItem: MenuItem;
      quantity?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          restaurant_id: restaurantId,
          menu_item_id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}

export function useUpdateOrderItemQuantity() {
  const queryClient = useQueryClient();
  const auditLog = useAuditLog();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      quantity, 
      orderId,
      previousQuantity,
    }: { 
      itemId: string; 
      quantity: number;
      orderId?: string;
      previousQuantity?: number;
    }) => {
      if (quantity <= 0) {
        // Delete the item if quantity is 0 or less
        const { error } = await supabase
          .from("order_items")
          .delete()
          .eq("id", itemId);

        if (error) throw error;
        return null;
      }

      const { data, error } = await supabase
        .from("order_items")
        .update({ quantity })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      // Log audit for quantity change if orderId and previousQuantity provided
      if (orderId && previousQuantity !== undefined && previousQuantity !== quantity) {
        await auditLog.mutateAsync({
          entityType: "order_item",
          entityId: itemId,
          action: "ITEM_QTY_CHANGED",
          details: {
            order_id: orderId,
            item_id: itemId,
            from_qty: previousQuantity,
            to_qty: quantity,
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}

export function useRemoveOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}

export function useVoidOrderItem() {
  const queryClient = useQueryClient();
  const auditLog = useAuditLog();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      reason,
      orderId,
      itemName,
      quantity,
      price,
    }: { 
      itemId: string; 
      reason: string;
      orderId?: string;
      itemName?: string;
      quantity?: number;
      price?: number;
    }) => {
      const { data, error } = await supabase
        .from("order_items")
        .update({ voided: true, void_reason: reason })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      // Log audit for void item
      await auditLog.mutateAsync({
        entityType: "order_item",
        entityId: itemId,
        action: "VOID_ITEM",
        details: {
          order_id: orderId || null,
          item_id: itemId,
          item_name: itemName || data.name,
          quantity: quantity || data.quantity,
          previous_values: {
            price: price || data.price,
            quantity: quantity || data.quantity,
            voided: false,
          },
          reason,
          voided_at: new Date().toISOString(),
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}

export function useUpdateOrderItemNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
      const { data, error } = await supabase
        .from("order_items")
        .update({ notes })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}
