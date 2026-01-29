-- Add time-based fields to menu_categories for category-level offer scheduling
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS promo_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS promo_end TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.menu_categories.promo_start IS 'Optional start date for category visibility (used for Offers category)';
COMMENT ON COLUMN public.menu_categories.promo_end IS 'Optional end date for category visibility (used for Offers category)';