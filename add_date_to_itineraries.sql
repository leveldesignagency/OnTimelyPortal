-- ============================================
-- ADD DATE COLUMN TO ITINERARIES TABLE
-- Run this in Supabase SQL Editor
-- This adds date field support to itinerary items
-- ============================================

-- Add date column to itineraries table
ALTER TABLE public.itineraries 
ADD COLUMN IF NOT EXISTS date DATE;

-- Create index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_itineraries_date ON public.itineraries(date);

-- Update existing itineraries to have a default date (optional)
-- You can uncomment this if you want to set a default date for existing records
-- UPDATE public.itineraries 
-- SET date = CURRENT_DATE 
-- WHERE date IS NULL;

-- Success message
SELECT 'Date column added to itineraries table successfully!' as result; 