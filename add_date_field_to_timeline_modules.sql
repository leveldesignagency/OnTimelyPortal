-- Add date field to timeline_modules table
-- This allows modules to be associated with specific dates

-- Add the date column to the timeline_modules table
ALTER TABLE timeline_modules ADD COLUMN IF NOT EXISTS date DATE;

-- Update existing modules to have today's date (temporary fix for existing data)
UPDATE timeline_modules SET date = CURRENT_DATE WHERE date IS NULL;

-- Make the date column NOT NULL after setting default values
ALTER TABLE timeline_modules ALTER COLUMN date SET NOT NULL;

-- Drop the existing function first, then recreate it with the date parameter
DROP FUNCTION IF EXISTS add_timeline_module(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB);

-- Update the add_timeline_module function to include date parameter
CREATE OR REPLACE FUNCTION add_timeline_module(
    p_event_id UUID,
    p_module_type TEXT,
    p_time TEXT,
    p_date DATE,
    p_title TEXT DEFAULT NULL,
    p_question TEXT DEFAULT NULL,
    p_label TEXT DEFAULT NULL,
    p_link TEXT DEFAULT NULL,
    p_file TEXT DEFAULT NULL,
    p_survey_data JSONB DEFAULT NULL,
    p_feedback_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_module_id UUID;
BEGIN
    INSERT INTO public.timeline_modules (
        event_id, module_type, title, question, "time", date,
        label, link, file, survey_data, feedback_data,
        created_by
    )
    VALUES (
        p_event_id, p_module_type, p_title, p_question, p_time, p_date,
        p_label, p_link, p_file, p_survey_data, p_feedback_data,
        auth.uid()
    )
    RETURNING id INTO new_module_id;
    
    RETURN new_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing function first, then recreate it with the date field
DROP FUNCTION IF EXISTS get_event_timeline_modules(UUID);

-- Update the get_event_timeline_modules function to return the date field
CREATE OR REPLACE FUNCTION get_event_timeline_modules(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    module_type TEXT,
    title TEXT,
    question TEXT,
    "time" TEXT,
    date DATE,
    label TEXT,
    link TEXT,
    file TEXT,
    survey_data JSONB,
    feedback_data JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id, tm.module_type, tm.title, tm.question, tm."time", tm.date,
        tm.label, tm.link, tm.file, tm.survey_data, tm.feedback_data,
        tm.created_at
    FROM public.timeline_modules tm
    WHERE tm.event_id = p_event_id
    ORDER BY tm.date, tm."time", tm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_timeline_module(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_timeline_modules(UUID) TO authenticated;

-- Add index for date-based queries
CREATE INDEX IF NOT EXISTS idx_timeline_modules_date ON public.timeline_modules(event_id, date);

-- Test the updated schema
SELECT 'timeline_modules date field added successfully' as result; 