-- Add prices_include_tax and business_hours columns to restaurant_settings
ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS prices_include_tax boolean NOT NULL DEFAULT false;

ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{
  "sunday": {"open": "09:00", "close": "22:00", "closed": false},
  "monday": {"open": "09:00", "close": "22:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "22:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "22:00", "closed": false},
  "thursday": {"open": "09:00", "close": "22:00", "closed": false},
  "friday": {"open": "09:00", "close": "22:00", "closed": false},
  "saturday": {"open": "09:00", "close": "22:00", "closed": false}
}'::jsonb;