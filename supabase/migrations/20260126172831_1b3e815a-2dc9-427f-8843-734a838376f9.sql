-- Add qr_order_enabled column to restaurant_settings table
ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS qr_order_enabled boolean NOT NULL DEFAULT false;

-- Create SECURITY DEFINER RPC function for anon access to check QR enabled status
CREATE OR REPLACE FUNCTION public.public_is_qr_enabled(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT qr_order_enabled FROM public.restaurant_settings WHERE restaurant_id = p_restaurant_id),
    false
  );
$$;

-- Grant execute to anon role for public QR menu access
GRANT EXECUTE ON FUNCTION public.public_is_qr_enabled(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.public_is_qr_enabled(uuid) TO authenticated;