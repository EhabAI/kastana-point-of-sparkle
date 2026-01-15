-- Create table for variance root cause tagging
CREATE TABLE public.inventory_variance_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  root_cause TEXT NOT NULL CHECK (root_cause IN (
    'WASTE',
    'THEFT',
    'OVER_PORTIONING',
    'DATA_ERROR',
    'SUPPLIER_VARIANCE',
    'UNKNOWN'
  )),
  notes TEXT,
  variance_qty NUMERIC NOT NULL DEFAULT 0,
  variance_value NUMERIC NOT NULL DEFAULT 0,
  tagged_by UUID NOT NULL,
  tagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one tag per item/branch/period combination
  UNIQUE (branch_id, inventory_item_id, period_start, period_end)
);

-- Create index for efficient queries
CREATE INDEX idx_variance_tags_restaurant ON public.inventory_variance_tags(restaurant_id);
CREATE INDEX idx_variance_tags_branch ON public.inventory_variance_tags(branch_id);
CREATE INDEX idx_variance_tags_item ON public.inventory_variance_tags(inventory_item_id);
CREATE INDEX idx_variance_tags_period ON public.inventory_variance_tags(period_start, period_end);

-- Enable Row Level Security
ALTER TABLE public.inventory_variance_tags ENABLE ROW LEVEL SECURITY;

-- Owners can read/write their restaurant's variance tags
CREATE POLICY "Owners can manage variance tags"
ON public.inventory_variance_tags
FOR ALL
USING (
  restaurant_id = (SELECT get_owner_restaurant_id(auth.uid()))
);

-- Add updated_at trigger
CREATE TRIGGER update_variance_tags_updated_at
  BEFORE UPDATE ON public.inventory_variance_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.inventory_variance_tags IS 'Stores root cause tags for inventory consumption variance analysis';
COMMENT ON COLUMN public.inventory_variance_tags.root_cause IS 'Manual tag: WASTE, THEFT, OVER_PORTIONING, DATA_ERROR, SUPPLIER_VARIANCE, UNKNOWN';
COMMENT ON COLUMN public.inventory_variance_tags.variance_qty IS 'Variance quantity at time of tagging (for audit trail)';
COMMENT ON COLUMN public.inventory_variance_tags.variance_value IS 'Variance cost impact at time of tagging (for audit trail)';