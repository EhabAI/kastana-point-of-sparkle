-- Allow cashiers to view tables for their assigned branch
CREATE POLICY "Cashiers can view their branch tables"
ON public.restaurant_tables
FOR SELECT
USING (
  branch_id IN (
    SELECT ur.branch_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'cashier'
  )
);