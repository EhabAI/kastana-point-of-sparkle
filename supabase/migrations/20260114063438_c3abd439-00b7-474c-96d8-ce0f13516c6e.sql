-- Add kds_enabled column to restaurant_settings
ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS kds_enabled boolean NOT NULL DEFAULT false;

-- Create RLS policies for kitchen role to read orders
CREATE POLICY "Kitchen can view orders for their restaurant"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'kitchen'
    AND ur.restaurant_id = orders.restaurant_id
    AND ur.is_active = true
  )
);

-- Create RLS policy for kitchen to update order status only
CREATE POLICY "Kitchen can update order status"
ON public.orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'kitchen'
    AND ur.restaurant_id = orders.restaurant_id
    AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'kitchen'
    AND ur.restaurant_id = orders.restaurant_id
    AND ur.is_active = true
  )
);

-- Create RLS policy for kitchen to read order items
CREATE POLICY "Kitchen can view order items for their restaurant"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'kitchen'
    AND ur.restaurant_id = order_items.restaurant_id
    AND ur.is_active = true
  )
);

-- Enable realtime for orders table (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create function to get kitchen user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_kitchen_restaurant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'kitchen'
    AND is_active = true
  LIMIT 1;
$$;