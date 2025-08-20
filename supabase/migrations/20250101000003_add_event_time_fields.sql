-- Add start_time and end_time fields to events table
-- These fields will store the time component of the event start and end

ALTER TABLE IF EXISTS public.events 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add comments for documentation
COMMENT ON COLUMN public.events.start_time IS 'Time when the event starts (HH:MM format)';
COMMENT ON COLUMN public.events.end_time IS 'Time when the event ends (HH:MM format)';

-- Create indexes for performance on time-based queries
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON public.events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON public.events("from", start_time, "to", end_time); 