-- ═══════════════════════════════════════════════════════════════════════════════
-- QR Pending Orders Security Hardening
-- Restricts direct UPDATE of orders table to prevent bypassing Edge Functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop any existing policies that may allow UPDATE on orders for cashiers
DROP POLICY IF EXISTS "Cashiers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

-- Create a restrictive UPDATE policy for orders
-- Cashiers can only update orders that are NOT in PENDING status
-- PENDING orders can ONLY be updated via Edge Functions using service role
CREATE POLICY "Cashiers can update non-pending orders" 
ON public.orders 
FOR UPDATE 
TO authenticated
USING (
  -- Must be cashier or owner for this restaurant
  (
    public.has_role(auth.uid(), 'cashier'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role)
  )
  AND
  -- Block direct updates to PENDING orders - must use Edge Functions
  status != 'pending'
)
WITH CHECK (
  -- Same check for the new row
  (
    public.has_role(auth.uid(), 'cashier'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role)
  )
  AND
  status != 'pending'
);

-- Ensure order_items also has proper restrictions
-- Anon users can insert order_items but not update
DROP POLICY IF EXISTS "Anon users can update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public can update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Anon can only insert order_items" ON public.order_items;

-- Ensure anon can only INSERT but not UPDATE or DELETE
CREATE POLICY "Anon can only insert order_items" 
ON public.order_items 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Verify service role can still bypass RLS (this is automatic in Supabase)
-- Edge Functions use service role which bypasses RLS entirely

COMMENT ON POLICY "Cashiers can update non-pending orders" ON public.orders IS 
  'Prevents direct client-side updates to PENDING QR orders. Status changes from PENDING must go through Edge Functions using service role.';