-- Create menu_item_recipes table
CREATE TABLE public.menu_item_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  branch_id UUID NULL, -- for future branch-specific recipes
  menu_item_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, menu_item_id)
);

-- Create menu_item_recipe_lines table
CREATE TABLE public.menu_item_recipe_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.menu_item_recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL,
  qty NUMERIC NOT NULL,
  unit_id UUID NOT NULL,
  qty_in_base NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_menu_item_recipes_menu_item_id ON public.menu_item_recipes(menu_item_id);
CREATE INDEX idx_menu_item_recipes_restaurant_id ON public.menu_item_recipes(restaurant_id);
CREATE INDEX idx_menu_item_recipe_lines_recipe_id ON public.menu_item_recipe_lines(recipe_id);
CREATE INDEX idx_menu_item_recipe_lines_inventory_item_id ON public.menu_item_recipe_lines(inventory_item_id);

-- Enable RLS
ALTER TABLE public.menu_item_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_recipe_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for menu_item_recipes
CREATE POLICY "Owners can manage their recipes"
ON public.menu_item_recipes
FOR ALL
USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "System admins can do all on menu_item_recipes"
ON public.menu_item_recipes
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- RLS policies for menu_item_recipe_lines
CREATE POLICY "Owners can manage their recipe lines"
ON public.menu_item_recipe_lines
FOR ALL
USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "System admins can do all on menu_item_recipe_lines"
ON public.menu_item_recipe_lines
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- Trigger for updated_at on menu_item_recipes
CREATE TRIGGER update_menu_item_recipes_updated_at
BEFORE UPDATE ON public.menu_item_recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on menu_item_recipe_lines
CREATE TRIGGER update_menu_item_recipe_lines_updated_at
BEFORE UPDATE ON public.menu_item_recipe_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();