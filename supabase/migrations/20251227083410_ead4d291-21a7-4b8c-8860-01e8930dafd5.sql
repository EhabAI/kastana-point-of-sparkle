-- Add policy: Owners can view roles in their restaurant
CREATE POLICY "Owners can view roles in their restaurant"
ON public.user_roles
FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

-- Add policy: Owners can insert roles in their restaurant
CREATE POLICY "Owners can insert roles in their restaurant"
ON public.user_roles
FOR INSERT
WITH CHECK (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND role = 'cashier'
);

-- Add policy: Owners can delete cashier roles in their restaurant
CREATE POLICY "Owners can delete cashier roles in their restaurant"
ON public.user_roles
FOR DELETE
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND role = 'cashier'
);