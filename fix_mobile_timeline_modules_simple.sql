-- Simple fix for mobile timeline modules
-- This ensures the timeline_modules table has the necessary fields

-- 1. Add date field if it doesn't exist
ALTER TABLE timeline_modules ADD COLUMN IF NOT EXISTS date DATE;

-- 2. Update the module_type constraint to include all module types
ALTER TABLE timeline_modules DROP CONSTRAINT IF EXISTS timeline_modules_module_type_check;
ALTER TABLE timeline_modules ADD CONSTRAINT timeline_modules_module_type_check 
CHECK (module_type IN ('qrcode', 'survey', 'feedback', 'question', 'multiple_choice', 'photo_video'));

-- 3. Add index for date filtering
CREATE INDEX IF NOT EXISTS idx_timeline_modules_date ON public.timeline_modules(date);

-- 4. Ensure the get_event_timeline_modules function returns the date field
CREATE OR REPLACE FUNCTION get_event_timeline_modules(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    module_type TEXT,
    title TEXT,
    question TEXT,
    "time" TEXT,
    date TEXT,
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
        tm.id, tm.module_type, tm.title, tm.question, tm."time",
        tm.date::TEXT, tm.label, tm.link, tm.file, tm.survey_data, tm.feedback_data,
        tm.created_at
    FROM public.timeline_modules tm
    WHERE tm.event_id = p_event_id
    ORDER BY tm."time", tm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_event_timeline_modules(UUID) TO authenticated, anon;

-- 6. Test the function
SELECT 'Mobile timeline modules setup completed successfully!' as result; 