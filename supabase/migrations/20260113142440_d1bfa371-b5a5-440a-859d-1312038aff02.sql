-- Add inventory_enabled flag to restaurant_settings
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS inventory_enabled boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.restaurant_settings.inventory_enabled IS 'Controls access to inventory module. System Admin only can toggle.';