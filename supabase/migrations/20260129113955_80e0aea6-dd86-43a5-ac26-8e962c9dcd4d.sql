-- Add promo_enabled column for manual control of time-based offers
-- Default is true to ensure backward compatibility with existing offers
ALTER TABLE public.branch_menu_items
ADD COLUMN IF NOT EXISTS promo_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.branch_menu_items.promo_enabled IS 'Manual toggle to enable/disable promo regardless of time. Default true for backward compatibility.';