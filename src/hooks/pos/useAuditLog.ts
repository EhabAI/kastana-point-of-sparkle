import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCashierRestaurant } from "./useCashierRestaurant";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | "shift_open"
  | "shift_close"
  | "order_create"
  | "order_cancel"
  | "order_voided"
  | "order_hold"
  | "order_resume"
  | "order_complete"
  | "order_reopen"
  | "order_confirmed"
  | "order_moved_table"
  | "item_void"
  | "discount_apply"
  | "payment_add"
  | "refund_create"
  | "cash_in"
  | "cash_out"
  | "CASH_MOVEMENT"
  | "VOID_ITEM"
  | "ITEM_QTY_CHANGED";

export type EntityType = "shift" | "order" | "order_item" | "payment" | "refund" | "shift_transaction";

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
