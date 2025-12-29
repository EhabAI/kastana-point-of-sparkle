-- Add logo_url column to restaurants table
ALTER TABLE public.restaurants ADD COLUMN logo_url TEXT;

-- Create storage bucket for restaurant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-logos', 'restaurant-logos', true);

-- Allow anyone to view restaurant logos (public bucket)
CREATE POLICY "Public can view restaurant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-logos');

-- Allow system admins to upload restaurant logos
CREATE POLICY "System admins can upload restaurant logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'restaurant-logos' AND has_role(auth.uid(), 'system_admin'::app_role));

-- Allow system admins to update restaurant logos
CREATE POLICY "System admins can update restaurant logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-logos' AND has_role(auth.uid(), 'system_admin'::app_role));

-- Allow system admins to delete restaurant logos
CREATE POLICY "System admins can delete restaurant logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-logos' AND has_role(auth.uid(), 'system_admin'::app_role));

-- Allow owners to upload their restaurant logo
CREATE POLICY "Owners can upload their restaurant logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'restaurant-logos' AND has_role(auth.uid(), 'owner'::app_role));