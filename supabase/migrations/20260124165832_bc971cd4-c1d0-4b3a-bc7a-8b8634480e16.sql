-- Create restaurant_subscriptions table for System Admin subscription management
-- Owners cannot access this table due to RLS policies

CREATE TABLE public.restaurant_subscriptions (
    restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    start_date timestamptz NOT NULL DEFAULT now(),
    period text NOT NULL CHECK (period IN ('MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL')),
    bonus_months int NOT NULL DEFAULT 0 CHECK (bonus_months BETWEEN 0 AND 6),
    end_date timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED')),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_restaurant_subscriptions_end_date ON public.restaurant_subscriptions(end_date);
CREATE INDEX idx_restaurant_subscriptions_status ON public.restaurant_subscriptions(status);

-- Enable Row Level Security
ALTER TABLE public.restaurant_subscriptions ENABLE ROW LEVEL SECURITY;

-- ONLY system_admin can access this table - no policies for owners/cashiers/kitchen
CREATE POLICY "System admins can do all on restaurant_subscriptions" 
ON public.restaurant_subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- Update is_restaurant_active function to include subscription check
CREATE OR REPLACE FUNCTION public.is_restaurant_active(p_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT r.is_active 
        AND EXISTS (
          SELECT 1 FROM public.restaurant_subscriptions rs
          WHERE rs.restaurant_id = r.id
            AND now() <= rs.end_date
        )
      FROM public.restaurants r 
      WHERE r.id = p_restaurant_id
    ),
    false
  );
$function$;

-- Trigger for updated_at
CREATE TRIGGER update_restaurant_subscriptions_updated_at
BEFORE UPDATE ON public.restaurant_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();