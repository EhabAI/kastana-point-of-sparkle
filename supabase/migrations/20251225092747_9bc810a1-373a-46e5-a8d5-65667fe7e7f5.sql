-- Add restaurant_id to user_roles for cashier assignment
ALTER TABLE public.user_roles ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id);

-- Create index for faster lookups
CREATE INDEX idx_user_roles_restaurant_id ON public.user_roles(restaurant_id);

-- Create function to get cashier's restaurant
CREATE OR REPLACE FUNCTION public.get_cashier_restaurant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT restaurant_id FROM public.user_roles WHERE user_id = _user_id AND role = 'cashier' LIMIT 1
$$;

-- Update RLS policies for cashiers to access menu data
CREATE POLICY "Cashiers can view their restaurant categories"
ON public.menu_categories
FOR SELECT
USING (restaurant_id = get_cashier_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their restaurant menu items"
ON public.menu_items
FOR SELECT
USING (category_id IN (
    SELECT id FROM menu_categories 
    WHERE restaurant_id = get_cashier_restaurant_id(auth.uid())
));

-- Cashiers can view their restaurant settings
CREATE POLICY "Cashiers can view their restaurant settings"
ON public.restaurant_settings
FOR SELECT
USING (restaurant_id = get_cashier_restaurant_id(auth.uid()));