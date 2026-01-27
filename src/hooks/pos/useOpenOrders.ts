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
  table_id: string | null;
  source?: string; // 'pos' or 'qr'
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

      // Include 'pending' status for QR orders that haven't been confirmed yet
      // This ensures table occupancy is correctly computed for QR orders
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, subtotal, created_at, notes, order_notes, table_id, source, order_items(id, name, quantity, price, notes, voided)")
        .eq("branch_id", branchId)
        .in("status", ["new", "open", "held", "pending"])
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
      // Business guard: only allow moving OPEN or HELD orders
      const { data: orderCheck, error: checkError } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
      
      if (checkError) throw checkError;
      if (orderCheck.status !== "open" && orderCheck.status !== "held") {
        throw new Error("Can only move open or held orders");
      }

      // Update order table_id to reflect new table
      const { data, error } = await supabase
        .from("orders")
        .update({ 
          table_id: tableId,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, tableName, previousTableName, previousTableId };
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      
      // Mandatory audit log for ORDER_MOVED_TABLE
      if (user?.id && restaurant?.id) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          entity_type: "order",
          entity_id: data.id,
          action: "ORDER_MOVED_TABLE",
          details: { 
            from_table_id: data.previousTableId || null,
            to_table_id: variables.tableId,
            from_table_name: data.previousTableName || null,
            to_table_name: data.tableName,
          } as unknown as Json,
        });
      }
    },
  });
}

export function useCloseOrder() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      tableId,
      tableName,
    }: { 
      orderId: string; 
      tableId?: string;
      tableName?: string;
    }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ 
          status: "closed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, tableId, tableName };
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
          action: "CLOSE_ORDER",
          details: { 
            order_number: data.order_number,
            table_id: data.tableId || null,
            table_name: data.tableName || null,
          } as unknown as Json,
        });
      }
    },
  });
}

export function useSplitOrder() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      originalOrder,
      itemsToSplit,
      shiftId,
      branchId,
      taxRate,
    }: {
      originalOrder: OpenOrder;
      itemsToSplit: { itemId: string; quantity: number }[];
      shiftId: string;
      branchId: string;
      taxRate: number;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");

      // Use table_id from original order
      const tableId = originalOrder.table_id;

      // 1. Create new order with same table
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          shift_id: shiftId,
          restaurant_id: restaurant.id,
          branch_id: branchId,
          status: "open",
          tax_rate: taxRate,
          notes: originalOrder.notes, // Keep notes for other info
          table_id: tableId, // Use table_id column
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Get full item details from original order
      const { data: originalItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*, order_item_modifiers(*)")
        .eq("order_id", originalOrder.id)
        .in("id", itemsToSplit.map((i) => i.itemId));

      if (itemsError) throw itemsError;

      // 3. Process each item to split
      for (const splitItem of itemsToSplit) {
        const originalItem = originalItems?.find((i) => i.id === splitItem.itemId);
        if (!originalItem) continue;

        if (splitItem.quantity >= originalItem.quantity) {
          // Move entire item: update order_id
          await supabase
            .from("order_items")
            .update({ order_id: newOrder.id })
            .eq("id", originalItem.id);
        } else {
          // Partial split: reduce original, create new
          await supabase
            .from("order_items")
            .update({ quantity: originalItem.quantity - splitItem.quantity })
            .eq("id", originalItem.id);

          // Create new item in new order
          const { data: newItem, error: newItemError } = await supabase
            .from("order_items")
            .insert({
              order_id: newOrder.id,
              restaurant_id: restaurant.id,
              menu_item_id: originalItem.menu_item_id,
              name: originalItem.name,
              price: originalItem.price,
              quantity: splitItem.quantity,
              notes: originalItem.notes,
            })
            .select()
            .single();

          if (newItemError) throw newItemError;

          // Copy modifiers if any
          if (originalItem.order_item_modifiers?.length > 0) {
            await supabase.from("order_item_modifiers").insert(
              originalItem.order_item_modifiers.map((mod: any) => ({
                order_item_id: newItem.id,
                modifier_option_id: mod.modifier_option_id,
                modifier_name: mod.modifier_name,
                option_name: mod.option_name,
                price_adjustment: mod.price_adjustment,
              }))
            );
          }
        }
      }

      return { originalOrderId: originalOrder.id, newOrderId: newOrder.id, tableId };
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
          entity_id: data.originalOrderId,
          action: "SPLIT_ORDER",
          details: {
            original_order_id: data.originalOrderId,
            new_order_id: data.newOrderId,
            table_id: data.tableId || null,
          } as unknown as Json,
        });
      }
    },
  });
}

export function useMergeOrders() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

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
          notes: null, // Clear notes
          table_id: null, // Clear table assignment
        })
        .eq("id", secondaryOrderId);

      if (closeError) throw closeError;

      return { primaryOrderId, secondaryOrderId, restaurantId };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });

      // Log ORDER_MERGED audit event
      if (user?.id && restaurant?.id) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          entity_type: "order",
          entity_id: data.primaryOrderId,
          action: "ORDER_MERGED",
          details: {
            primary_order_id: data.primaryOrderId,
            secondary_order_id: data.secondaryOrderId,
          } as unknown as Json,
        });
      }
    },
  });
}
