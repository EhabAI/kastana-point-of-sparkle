-- Add optional owner phone field to restaurant_settings
ALTER TABLE public.restaurant_settings
ADD COLUMN owner_phone TEXT NULL;