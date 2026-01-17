-- Add RLS policy to allow cashiers to update is_favorite on menu_items
-- Cashiers can only update items that belong to their restaurant's categories

CREATE POLICY "Cashiers can update menu item favorites"
ON public.menu_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.menu_categories mc
    JOIN public.user_roles ur ON ur.restaurant_id = mc.restaurant_id
    WHERE mc.id = menu_items.category_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'cashier'
    AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.menu_categories mc
    JOIN public.user_roles ur ON ur.restaurant_id = mc.restaurant_id
    WHERE mc.id = menu_items.category_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'cashier'
    AND ur.is_active = true
  )
);