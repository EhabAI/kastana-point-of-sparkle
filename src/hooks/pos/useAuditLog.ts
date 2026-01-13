import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCashierRestaurant } from "./useCashierRestaurant";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | "SHIFT_OPEN"
  | "SHIFT_CLOSE"
  | "ORDER_CREATE"
  | "ORDER_CANCEL"
  | "ORDER_VOIDED"
  | "ORDER_HOLD"
  | "ORDER_RESUME"
  | "ORDER_COMPLETE"
  | "ORDER_REOPEN"
  | "ORDER_CONFIRMED"
  | "ORDER_REJECTED"
  | "ORDER_MOVED_TABLE"
  | "ITEM_VOID"
  | "DISCOUNT_APPLY"
  | "PAYMENT_ADD"
  | "REFUND_CREATE"
  | "CASH_MOVEMENT"
  | "VOID_ITEM"
  | "ITEM_QTY_CHANGED"
  | "CLOSE_ORDER"
  | "SPLIT_ORDER"
  | "TRANSFER_ORDER_ITEM"
  | "STOCK_COUNT_APPROVED"
  | "INVENTORY_ADJUSTMENT";

export type EntityType = "shift" | "order" | "order_item" | "payment" | "refund" | "shift_transaction" | "stock_count" | "inventory_transaction";

export function useAuditLog() {
  const { user } = useAuth();
  const { data: restaurant } = useCashierRestaurant();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      action,
      details,
    }: {
      entityType: EntityType;
      entityId?: string;
      action: AuditAction;
      details?: Json;
    }) => {
      if (!user?.id || !restaurant?.id) throw new Error("Missing user or restaurant");

      const { data, error } = await supabase
        .from("audit_logs")
        .insert([{
          user_id: user.id,
          restaurant_id: restaurant.id,
          entity_type: entityType,
          entity_id: entityId,
          action,
          details: details ?? null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}
