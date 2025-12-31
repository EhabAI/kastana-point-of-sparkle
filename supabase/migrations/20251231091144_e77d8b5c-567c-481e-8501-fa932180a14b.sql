-- Add branch_id column to user_roles for cashier branch assignment
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.restaurant_branches(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_branch_id ON public.user_roles(branch_id);

-- Create branch_payment_methods table for per-branch payment method settings
CREATE TABLE IF NOT EXISTS public.branch_payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
  cash_enabled boolean NOT NULL DEFAULT true,
  visa_enabled boolean NOT NULL DEFAULT true,
  mastercard_enabled boolean NOT NULL DEFAULT true,
  efawateer_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

-- Enable RLS on branch_payment_methods
ALTER TABLE public.branch_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branch_payment_methods
-- Owners can manage their branch payment methods
CREATE POLICY "Owners can manage their branch payment methods" 
ON public.branch_payment_methods 
FOR ALL 
USING (branch_id IN (
  SELECT rb.id FROM public.restaurant_branches rb 
  WHERE rb.restaurant_id = get_owner_restaurant_id(auth.uid())
))
WITH CHECK (branch_id IN (
  SELECT rb.id FROM public.restaurant_branches rb 
  WHERE rb.restaurant_id = get_owner_restaurant_id(auth.uid())
));

-- Cashiers can view payment methods for their branch
CREATE POLICY "Cashiers can view their branch payment methods" 
ON public.branch_payment_methods 
FOR SELECT 
USING (branch_id IN (
  SELECT ur.branch_id FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
));

-- System admins can do all
CREATE POLICY "System admins can do all on branch_payment_methods" 
ON public.branch_payment_methods 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_branch_payment_methods_updated_at
  BEFORE UPDATE ON public.branch_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create payment methods for new branches
CREATE OR REPLACE FUNCTION public.create_payment_methods_for_new_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.branch_payment_methods (branch_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$function$;

CREATE TRIGGER create_payment_methods_on_branch_insert
  AFTER INSERT ON public.restaurant_branches
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_methods_for_new_branch();

-- Backfill payment methods for existing branches
INSERT INTO public.branch_payment_methods (branch_id)
SELECT id FROM public.restaurant_branches 
WHERE id NOT IN (SELECT branch_id FROM public.branch_payment_methods WHERE branch_id IS NOT NULL);