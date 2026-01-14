-- Add RLS policy for kitchen users to view their restaurant
CREATE POLICY "Kitchen can view their restaurant"
ON public.restaurants
FOR SELECT
TO authenticated
USING (id = get_kitchen_restaurant_id(auth.uid()));

-- Add RLS policy for kitchen users to view their restaurant settings
CREATE POLICY "Kitchen can view their restaurant settings"
ON public.restaurant_settings
FOR SELECT
USING (restaurant_id = get_kitchen_restaurant_id(auth.uid()));