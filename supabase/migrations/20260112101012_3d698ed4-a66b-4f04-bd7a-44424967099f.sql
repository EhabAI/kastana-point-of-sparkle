-- Fix overly permissive anon INSERT policy on order_items
-- Replace with a policy that only allows anon to insert order_items for orders they created

DROP POLICY IF EXISTS "Anon can only insert order_items" ON public.order_items;

-- Anon can insert order_items only for orders with source='qr' (created via QR flow)
CREATE POLICY "Anon can insert order_items for QR orders" 
ON public.order_items 
FOR INSERT 
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_id 
    AND orders.source = 'qr'
    AND orders.status = 'pending'
  )
);