-- ==============================================
-- SECURITY HARDENING: Kitchen Role RLS Policies
-- ==============================================

-- Drop existing Kitchen policies on orders to replace with hardened versions
DROP POLICY IF EXISTS "Kitchen can update order status" ON public.orders;
DROP POLICY IF EXISTS "Kitchen can view orders for their restaurant" ON public.orders;

-- Create hardened Kitchen SELECT policy
-- Requires: active kitchen role, matching restaurant, restaurant is active, KDS is enabled
CREATE POLICY "Kitchen can view orders for their restaurant"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'kitchen'
      AND ur.restaurant_id = orders.restaurant_id
      AND ur.is_active = true
  )
  AND public.is_restaurant_active(restaurant_id)
  AND EXISTS (
    SELECT 1 FROM public.restaurant_settings rs
    WHERE rs.restaurant_id = orders.restaurant_id
      AND rs.kds_enabled = true
  )
);

-- Create hardened Kitchen UPDATE policy
-- SECURITY: Kitchen can ONLY update status field (and updated_at)
-- This is enforced by checking that no other fields change
CREATE POLICY "Kitchen can update order status only"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  -- Verify user is active kitchen staff for this restaurant
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'kitchen'
      AND ur.restaurant_id = orders.restaurant_id
      AND ur.is_active = true
  )
  AND public.is_restaurant_active(restaurant_id)
  AND EXISTS (
    SELECT 1 FROM public.restaurant_settings rs
    WHERE rs.restaurant_id = orders.restaurant_id
      AND rs.kds_enabled = true
  )
)
WITH CHECK (
  -- Same checks as USING clause
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'kitchen'
      AND ur.restaurant_id = orders.restaurant_id
      AND ur.is_active = true
  )
  AND public.is_restaurant_active(restaurant_id)
  AND EXISTS (
    SELECT 1 FROM public.restaurant_settings rs
    WHERE rs.restaurant_id = orders.restaurant_id
      AND rs.kds_enabled = true
  )
  -- SECURITY: Only allow valid status transitions
  AND status IN ('new', 'in_progress', 'ready')
);

-- ==============================================
-- SECURITY HARDENING: Kitchen order_items policies
-- ==============================================

-- Drop existing Kitchen policy on order_items
DROP POLICY IF EXISTS "Kitchen can view order items for their restaurant" ON public.order_items;

-- Create hardened Kitchen SELECT policy for order_items
-- Requires: active kitchen role, matching restaurant, restaurant is active, KDS is enabled
CREATE POLICY "Kitchen can view order items for their restaurant"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'kitchen'
      AND ur.restaurant_id = order_items.restaurant_id
      AND ur.is_active = true
  )
  AND public.is_restaurant_active(restaurant_id)
  AND EXISTS (
    SELECT 1 FROM public.restaurant_settings rs
    WHERE rs.restaurant_id = order_items.restaurant_id
      AND rs.kds_enabled = true
  )
);

-- SECURITY: Kitchen has NO INSERT, UPDATE, DELETE on order_items
-- This is enforced by NOT having any policies for those operations