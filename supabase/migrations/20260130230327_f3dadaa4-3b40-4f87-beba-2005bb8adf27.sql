-- Add new notification types to the enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'info';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'warning';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'action_required';

-- Enable realtime for admin_notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;