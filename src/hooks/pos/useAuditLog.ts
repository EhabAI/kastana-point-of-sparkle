import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCashierRestaurant } from "./useCashierRestaurant";
import type { Json } from "@/integrations/supabase/types";
import { useRef } from "react";

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
  | "TABLE_CHECKOUT"
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
  | "STOCK_COUNT_CREATED"
  | "STOCK_COUNT_APPROVED"
  | "STOCK_COUNT_CANCELLED"
  | "INVENTORY_ADJUSTMENT"
  | "SEND_TO_KITCHEN";

export type EntityType = "shift" | "order" | "order_item" | "payment" | "refund" | "shift_transaction" | "stock_count" | "inventory_transaction";

// Session-level guard to prevent spamming console on 403 errors
let auditLogDisabledForSession = false;
let hasWarnedOnce = false;

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
      // Skip if audit logging was disabled due to previous 403 errors
      if (auditLogDisabledForSession) {
        return null;
      }

      if (!user?.id || !restaurant?.id) {
        // Silently skip if missing context - don't block operations
        return null;
      }

      try {
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

        if (error) {
          // Check for 403 Forbidden (RLS policy violation)
          if (error.code === "42501" || error.message?.includes("denied") || error.message?.includes("policy")) {
            if (!hasWarnedOnce) {
              console.warn("[Audit] Logging disabled for this session due to permission restrictions.");
              hasWarnedOnce = true;
            }
            auditLogDisabledForSession = true;
            return null; // Don't throw - allow operations to continue
          }
          // For other errors, log once but don't block
          if (!hasWarnedOnce) {
            console.warn("[Audit] Error logging audit event:", error.message);
            hasWarnedOnce = true;
          }
          return null;
        }
        return data;
      } catch (err) {
        // Catch any unexpected errors - don't block POS operations
        if (!hasWarnedOnce) {
          console.warn("[Audit] Unexpected error during audit logging");
          hasWarnedOnce = true;
        }
        return null;
      }
    },
    // Don't use onError callback - we handle errors internally
  });
}
