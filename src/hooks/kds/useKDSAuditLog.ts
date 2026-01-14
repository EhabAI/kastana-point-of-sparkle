import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type KDSAuditAction = 
  | "KDS_DISABLED_ACCESS"
  | "KDS_UNAUTHORIZED_ACCESS_ATTEMPT"
  | "KDS_INACTIVE_RESTAURANT_ACCESS"
  | "KDS_ORDER_START"
  | "KDS_ORDER_READY";

export type KDSEntityType = "kds" | "order";

// Session-level guard to prevent spamming console on 403 errors
let kdsAuditLogDisabledForSession = false;
let kdsHasWarnedOnce = false;

export function useKDSAuditLog() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      action,
      restaurantId,
      details,
    }: {
      entityType: KDSEntityType;
      entityId?: string;
      action: KDSAuditAction;
      restaurantId: string;
      details?: Json;
    }) => {
      // Skip if audit logging was disabled due to previous 403 errors
      if (kdsAuditLogDisabledForSession) {
        return null;
      }

      if (!user?.id || !restaurantId) {
        // Silently skip if missing context
        return null;
      }

      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .insert([{
            user_id: user.id,
            restaurant_id: restaurantId,
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
            if (!kdsHasWarnedOnce) {
              console.warn("[KDS Audit] Logging disabled for this session due to permission restrictions.");
              kdsHasWarnedOnce = true;
            }
            kdsAuditLogDisabledForSession = true;
            return null;
          }
          // For other errors, log once but don't block
          if (!kdsHasWarnedOnce) {
            console.warn("[KDS Audit] Error logging audit event:", error.message);
            kdsHasWarnedOnce = true;
          }
          return null;
        }
        return data;
      } catch (err) {
        // Catch any unexpected errors
        if (!kdsHasWarnedOnce) {
          console.warn("[KDS Audit] Unexpected error during audit logging");
          kdsHasWarnedOnce = true;
        }
        return null;
      }
    },
  });
}
