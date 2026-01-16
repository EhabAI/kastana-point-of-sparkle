-- Create enum type for menu item classification
CREATE TYPE public.menu_item_type AS ENUM (
  'drink',
  'food', 
  'ready_product',
  'addon',
  'service',
  'combo'
);

-- Add item_type column to menu_items with default 'food'
ALTER TABLE public.menu_items 
ADD COLUMN item_type public.menu_item_type NOT NULL DEFAULT 'food';

-- Update existing items based on common patterns (safe defaults)
-- This is a conservative approach - owner can adjust manually
COMMENT ON COLUMN public.menu_items.item_type IS 'Classification for inventory/recipe rules: drink, food, ready_product, addon, service, combo';