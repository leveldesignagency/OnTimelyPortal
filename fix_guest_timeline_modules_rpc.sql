-- Drop and recreate the get_guest_timeline_modules function with a clean implementation
DROP FUNCTION IF EXISTS get_guest_timeline_modules(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_guest_timeline_modules(TEXT, TEXT, TEXT);

-- Create the function with proper parameter types
CREATE OR REPLACE FUNCTION get_guest_timeline_modules(
    p_guest_id UUID,
    p_event_id UUID,
    p_date TEXT DEFAULT NULL
)
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
    -- Debug: Log the parameters
    RAISE NOTICE 'get_guest_timeline_modules called with: guest_id=%, event_id=%, date=%', p_guest_id, p_event_id, p_date;
    
    RETURN QUERY
    SELECT 
        tm.id, 
        tm.module_type, 
        tm.title, 
        tm.question, 
        tm."time",
        tm.date::TEXT, 
        tm.label, 
        tm.link, 
        tm.file, 
        tm.survey_data, 
        tm.feedback_data,
        tm.created_at
    FROM public.timeline_modules tm
    INNER JOIN public.timeline_module_guests tmg ON tm.id = tmg.module_id
    WHERE tmg.guest_id = p_guest_id 
      AND tm.event_id = p_event_id
      AND (p_date IS NULL OR tm.date::TEXT = p_date)
    ORDER BY tm."time", tm.created_at;
    
    -- Debug: Log the result count
    RAISE NOTICE 'get_guest_timeline_modules returned % rows', FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_guest_timeline_modules(UUID, UUID, TEXT) TO authenticated, anon;

-- Test the function
SELECT 'get_guest_timeline_modules function created successfully' as result; 