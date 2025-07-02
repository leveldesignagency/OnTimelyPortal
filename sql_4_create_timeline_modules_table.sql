-- SQL 4: Create timeline_modules table for event-specific modules
-- This replaces localStorage with proper database storage

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.timeline_modules;

-- Create timeline_modules table
CREATE TABLE public.timeline_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    module_type TEXT NOT NULL CHECK (module_type IN ('qrcode', 'survey', 'feedback', 'question')),
    title TEXT,
    question TEXT,
    time TEXT NOT NULL, -- Format: "HH:MM"
    
    -- QR Code specific fields
    label TEXT,
    link TEXT,
    file TEXT,
    
    -- Survey/Feedback specific fields  
    survey_data JSONB,
    feedback_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX idx_timeline_modules_event_id ON public.timeline_modules(event_id);
CREATE INDEX idx_timeline_modules_type ON public.timeline_modules(module_type);
CREATE INDEX idx_timeline_modules_time ON public.timeline_modules(event_id, time);

-- Enable Row Level Security
ALTER TABLE public.timeline_modules ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_timeline_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timeline_modules_updated_at
    BEFORE UPDATE ON public.timeline_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_timeline_modules_updated_at();

-- Test the table creation
SELECT 'timeline_modules table created successfully' as result; 