import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType = 'subscription' | 'welcome' | 'technical' | 'custom';

export interface AdminNotification {
  id: string;
  restaurant_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  created_by: string;
  read_at: string | null;
}

export interface CreateNotificationInput {
  restaurant_id: string;
  title: string;
  message: string;
  type: NotificationType;
}

export function useSendAdminNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Create the notification
      const { data: notification, error: notifError } = await supabase
        .from("admin_notifications")
        .insert({
          restaurant_id: input.restaurant_id,
          title: input.title,
          message: input.message,
          type: input.type,
          created_by: user.id,
        })
        .select()
        .single();

      if (notifError) throw notifError;

      // Log the action in audit_logs
      await supabase
        .from("audit_logs")
        .insert({
          user_id: user.id,
          restaurant_id: input.restaurant_id,
          entity_type: "notification",
          entity_id: notification.id,
          action: "ADMIN_SENT_NOTIFICATION",
          details: {
            message_type: input.type,
            title: input.title,
          },
        });

      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });
}
