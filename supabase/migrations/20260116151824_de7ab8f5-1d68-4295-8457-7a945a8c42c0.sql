-- Create combo_items table to link combo menu items to their child items
CREATE TABLE public.combo_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(combo_id, menu_item_id)
);

-- Enable RLS
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - owners can manage combo items for their restaurant's menu items
CREATE POLICY "Owners can view combo items"
  ON public.combo_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mi.id = combo_items.combo_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert combo items"
  ON public.combo_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mi.id = combo_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update combo items"
  ON public.combo_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mi.id = combo_items.combo_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete combo items"
  ON public.combo_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mi.id = combo_items.combo_id
        AND r.owner_id = auth.uid()
    )
  );

-- Cashiers need to read combo items for POS
CREATE POLICY "Cashiers can view combo items"
  ON public.combo_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.user_roles ur ON mc.restaurant_id = ur.restaurant_id
      WHERE mi.id = combo_items.combo_id
        AND ur.user_id = auth.uid()
        AND ur.role = 'cashier'
        AND ur.is_active = true
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_combo_items_updated_at
  BEFORE UPDATE ON public.combo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_combo_items_combo_id ON public.combo_items(combo_id);
CREATE INDEX idx_combo_items_menu_item_id ON public.combo_items(menu_item_id);