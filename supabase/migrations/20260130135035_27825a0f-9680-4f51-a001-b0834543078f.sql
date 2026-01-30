-- Add column to track last renewal reminder stage sent
ALTER TABLE public.restaurants
ADD COLUMN last_renewal_reminder_stage text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.restaurants.last_renewal_reminder_stage IS 'Tracks the last reminder stage sent: 7_DAYS, 1_DAY, or EXPIRED';