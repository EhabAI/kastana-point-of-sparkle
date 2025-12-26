-- Create a public function to get restaurant info by ID (safe for anonymous access)
CREATE OR REPLACE FUNCTION public.get_public_restaurant(p_restaurant_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT r.id, r.name
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id
  LIMIT 1;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_restaurant(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant(uuid) TO authenticated;