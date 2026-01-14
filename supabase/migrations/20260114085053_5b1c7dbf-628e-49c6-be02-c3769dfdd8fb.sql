-- Add INSERT policies for audit_logs
-- Owners can insert audit logs for their restaurant
CREATE POLICY "Owners can insert audit_logs for their restaurant"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND restaurant_id = get_owner_restaurant_id(auth.uid())
);

-- Cashiers can insert audit logs for their restaurant
CREATE POLICY "Cashiers can insert audit_logs for their restaurant"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND restaurant_id = get_cashier_restaurant_id(auth.uid())
);

-- Kitchen staff can insert audit logs for their restaurant
CREATE POLICY "Kitchen can insert audit_logs for their restaurant"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND restaurant_id = get_kitchen_restaurant_id(auth.uid())
);