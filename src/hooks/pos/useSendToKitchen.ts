import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./useAuditLog";

/**
 * Hook to send pending order items to the kitchen.
 * Only sends items where kitchen_sent_at IS NULL.
 * Updates kitchen_sent_at to current timestamp for sent items.
 */
export function useSendToKitchen() {
  const queryClient = useQueryClient();
  const auditLog = useAuditLog();

  return useMutation({
    mutationFn: async ({
      orderId,
      restaurantId,
      itemIds,
    }: {
      orderId: string;
      restaurantId: string;
      itemIds: string[];
    }) => {
      if (itemIds.length === 0) {
        throw new Error("No items to send");
      }

      const now = new Date().toISOString();

      // Update kitchen_sent_at for all pending items
      const { error } = await supabase
        .from("order_items")
        .update({ kitchen_sent_at: now })
        .eq("order_id", orderId)
        .in("id", itemIds)
        .is("kitchen_sent_at", null);

      if (error) throw error;

      // Log audit
      await auditLog.mutateAsync({
        entityType: "order",
        entityId: orderId,
        action: "SEND_TO_KITCHEN",
        details: {
          order_id: orderId,
          item_count: itemIds.length,
          item_ids: itemIds,
          sent_at: now,
        },
      });

      return { itemCount: itemIds.length, sentAt: now };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["kds-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    },
  });
}
