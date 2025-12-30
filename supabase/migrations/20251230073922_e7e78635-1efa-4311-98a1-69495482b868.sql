-- Allow anonymous users (QR Menu customers) to insert order items
CREATE POLICY "Public can insert order items"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (true);