-- Drop and recreate the get_public_restaurant function to include logo_url
DROP FUNCTION IF EXISTS public.get_public_restaurant(uuid);

CREATE OR REPLACE FUNCTION public.get_public_restaurant(p_restaurant_id uuid)
 RETURNS TABLE(id uuid, name text, logo_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.name, r.logo_url
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id
  LIMIT 1;
$function$;