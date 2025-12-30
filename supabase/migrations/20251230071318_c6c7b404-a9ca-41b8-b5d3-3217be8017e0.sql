-- Add database constraints for input validation on menu data

-- Restaurant name constraints
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_name_length 
  CHECK (length(trim(name)) BETWEEN 1 AND 200);

-- Menu categories name constraints  
ALTER TABLE public.menu_categories ADD CONSTRAINT menu_categories_name_length 
  CHECK (length(trim(name)) BETWEEN 1 AND 200);

-- Menu items constraints
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_name_length 
  CHECK (length(trim(name)) BETWEEN 1 AND 200);

ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_description_length 
  CHECK (description IS NULL OR length(description) <= 2000);

ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_price_reasonable 
  CHECK (price >= 0 AND price <= 999999.99);