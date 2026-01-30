-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('subscription', 'welcome', 'technical', 'custom');

-- Create notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'custom',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  read_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: System admins can insert notifications
CREATE POLICY "System admins can create notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

-- Policy: System admins can view all notifications
CREATE POLICY "System admins can view all notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'));

-- Policy: Owners can view notifications for their restaurants
CREATE POLICY "Owners can view their restaurant notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner') 
  AND restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- Policy: Owners can update (mark as read) their notifications
CREATE POLICY "Owners can mark notifications as read"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner') 
  AND restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner') 
  AND restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- Index for faster queries
CREATE INDEX idx_admin_notifications_restaurant ON public.admin_notifications(restaurant_id);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications(restaurant_id, is_read) WHERE is_read = false;