-- Add event_id column to timeline_module_guests table
-- This fixes the error when assigning modules to guests in Preview Timeline

-- First, check if the table exists, if not create it
CREATE TABLE IF NOT EXISTS public.timeline_module_guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.timeline_modules(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, guest_id)
);

-- Add event_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timeline_module_guests' 
        AND column_name = 'event_id'
    ) THEN
        ALTER TABLE public.timeline_module_guests ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_module_guests_event_id ON public.timeline_module_guests(event_id);
CREATE INDEX IF NOT EXISTS idx_timeline_module_guests_module_id ON public.timeline_module_guests(module_id);
CREATE INDEX IF NOT EXISTS idx_timeline_module_guests_guest_id ON public.timeline_module_guests(guest_id);

-- Enable RLS
ALTER TABLE public.timeline_module_guests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "timeline_module_guests_policy" ON public.timeline_module_guests;
CREATE POLICY "timeline_module_guests_policy" ON public.timeline_module_guests
    FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true); 