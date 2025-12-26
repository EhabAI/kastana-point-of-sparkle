-- Allow public (unauthenticated) users to view active menu categories
CREATE POLICY "Public can view active menu categories" 
ON public.menu_categories
FOR SELECT
USING (is_active = true);

-- Allow public (unauthenticated) users to view available menu items
CREATE POLICY "Public can view available menu items" 
ON public.menu_items
FOR SELECT
USING (is_available = true);