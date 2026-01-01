import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export function useTransferOrderItem() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      sourceOrderId,
      targetOrderId,
    }: {
      itemId: string;
      sourceOrderId: string;
      targetOrderId: string;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");

      // 1. Get the item with its modifiers
      const { data: item, error: itemError } = await supabase
        .from("order_items")
        .select("*, order_item_modifiers(*)")
        .eq("id", itemId)
        .single();

      if (itemError) throw itemError;
      if (!item) throw new Error("Item not found");

      // 2. Check if target order is still open
      const { data: targetOrder, error: targetError } = await supabase
        .from("orders")
        .select("id, status, order_number")
        .eq("id", targetOrderId)
        .single();

      if (targetError) throw targetError;
      if (!targetOrder) throw new Error("Target order not found");
      if (targetOrder.status !== "open" && targetOrder.status !== "confirmed") {
        throw new Error("Target order is not open");
      }

      // 3. Create new item in target order
      const { data: newItem, error: insertError } = await supabase
        .from("order_items")
        .insert({
          order_id: targetOrderId,
          restaurant_id: restaurant.id,
          menu_item_id: item.menu_item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Copy modifiers if any
      if (item.order_item_modifiers && item.order_item_modifiers.length > 0) {
        const modifiersToInsert = item.order_item_modifiers.map((mod: any) => ({
          order_item_id: newItem.id,
          modifier_option_id: mod.modifier_option_id,
          modifier_name: mod.modifier_name,
          option_name: mod.option_name,
          price_adjustment: mod.price_adjustment,
        }));

        const { error: modError } = await supabase
          .from("order_item_modifiers")
          .insert(modifiersToInsert);

        if (modError) throw modError;
      }

      // 5. Delete original item (this also cascades to delete its modifiers)
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (deleteError) throw deleteError;

      return {
        sourceOrderId,
        targetOrderId,
        targetOrderNumber: targetOrder.order_number,
        itemId,
        itemName: item.name,
      };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });

      // Log to audit
      if (user?.id && restaurant?.id) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          entity_type: "order_item",
          entity_id: data.itemId,
          action: "TRANSFER_ORDER_ITEM",
          details: {
            source_order_id: data.sourceOrderId,
            target_order_id: data.targetOrderId,
            target_order_number: data.targetOrderNumber,
            item_name: data.itemName,
          } as unknown as Json,
        });
      }
    },
  });
}
