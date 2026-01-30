import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OwnerNotification {
  id: string;
  restaurant_id: string;
  title: string;
  message: string;
  type: 'subscription' | 'welcome' | 'technical' | 'custom';
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export function useOwnerNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Notifications are filtered by RLS - owner can only see their restaurants' notifications
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("id, restaurant_id, title, message, type, is_read, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      return (data || []) as OwnerNotification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds for new notifications
  });
}

export function useUnreadNotificationsCount() {
  const { data: notifications = [] } = useOwnerNotifications();
  return notifications.filter(n => !n.is_read).length;
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq("id", notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-notifications", user?.id] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // Since RLS filters by owner's restaurants, this update will only affect their notifications
      const { error } = await supabase
        .from("admin_notifications")
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-notifications", user?.id] });
    },
  });
}
