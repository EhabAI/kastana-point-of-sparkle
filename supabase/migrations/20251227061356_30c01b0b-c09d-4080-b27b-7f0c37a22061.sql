-- Allow owners to insert new profiles
CREATE POLICY "Owners can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Allow owners to view profiles of users in their restaurant
-- Uses user_roles to check if the profile belongs to a user in the owner's restaurant
CREATE POLICY "Owners can view their restaurant staff profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT ur.user_id 
    FROM public.user_roles ur
    WHERE ur.restaurant_id = get_owner_restaurant_id(auth.uid())
  )
);