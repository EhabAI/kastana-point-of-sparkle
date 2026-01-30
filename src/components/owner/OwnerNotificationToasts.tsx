import { useEffect, useRef, useCallback } from "react";
import { useRestaurantContext } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Info, AlertTriangle, AlertCircle, Bell } from "lucide-react";

interface NotificationPayload {
  id: string;
  restaurant_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'action_required' | 'subscription' | 'welcome' | 'technical' | 'custom';
  is_read: boolean;
  created_at: string;
}

export function OwnerNotificationToasts() {
  const { selectedRestaurant } = useRestaurantContext();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
      case 'welcome':
      case 'custom':
        return <Info className="h-4 w-4" />;
      case 'warning':
      case 'technical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'action_required':
      case 'subscription':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getToastStyle = (type: string): 'info' | 'warning' | 'error' => {
    switch (type) {
      case 'info':
      case 'welcome':
      case 'custom':
        return 'info';
      case 'warning':
      case 'technical':
        return 'warning';
      case 'action_required':
      case 'subscription':
        return 'error';
      default:
        return 'info';
    }
  };

  const showNotificationToast = useCallback((notification: NotificationPayload) => {
    // Don't show if already shown in this session
    if (shownNotificationsRef.current.has(notification.id)) {
      return;
    }
    
    // Don't show if already read
    if (notification.is_read) {
      return;
    }

    // Only show if matches current restaurant
    if (selectedRestaurant?.id && notification.restaurant_id !== selectedRestaurant.id) {
      return;
    }

    shownNotificationsRef.current.add(notification.id);

    const style = getToastStyle(notification.type);
    const icon = getNotificationIcon(notification.type);

    // Use sonner toast with custom styling
    toast[style](notification.title, {
      description: notification.message,
      icon,
      duration: 5000,
      position: 'top-right',
      closeButton: true,
      className: 'notification-toast',
    });

    // Mark as read after showing
    supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notification.id)
      .then(() => {});
  }, [selectedRestaurant?.id]);

  // Fetch unread notifications on mount
  useEffect(() => {
    if (!selectedRestaurant?.id) return;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('restaurant_id', selectedRestaurant.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) {
        // Show up to 3 unread notifications as toasts
        data.forEach((notification, index) => {
          // Stagger the toasts slightly
          setTimeout(() => {
            showNotificationToast(notification as NotificationPayload);
          }, index * 500);
        });
      }
    };

    fetchUnread();
  }, [selectedRestaurant?.id, showNotificationToast]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!selectedRestaurant?.id) return;

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications-${selectedRestaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: `restaurant_id=eq.${selectedRestaurant.id}`,
        },
        (payload) => {
          const notification = payload.new as NotificationPayload;
          showNotificationToast(notification);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedRestaurant?.id, showNotificationToast]);

  // This component doesn't render anything visible
  // It just manages the toast notifications
  return null;
}
