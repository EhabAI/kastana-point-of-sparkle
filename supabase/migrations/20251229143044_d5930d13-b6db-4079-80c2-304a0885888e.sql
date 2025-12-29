-- Add is_active column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create RLS policy to allow owners to update cashier status in their restaurant
CREATE POLICY "Owners can update cashier status in their restaurant"
ON public.user_roles
FOR UPDATE
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND role = 'cashier'
)
WITH CHECK (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND role = 'cashier'
);