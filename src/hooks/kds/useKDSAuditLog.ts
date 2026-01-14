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
      if (!user?.id || !restaurantId) throw new Error("Missing user or restaurant");

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

      if (error) throw error;
      return data;
    },
  });
}
