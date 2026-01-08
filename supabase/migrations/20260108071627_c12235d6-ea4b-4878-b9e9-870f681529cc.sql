-- Allow public (anon) to look up tables by restaurant_id and table_code for QR menu
-- This is read-only and only exposes minimal info needed for QR ordering
CREATE POLICY "Public can lookup tables for QR menu"
ON public.restaurant_tables
FOR SELECT
TO anon
USING (true);