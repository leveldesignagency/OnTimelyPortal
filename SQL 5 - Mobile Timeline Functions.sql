-- SQL 5: Mobile Timeline Functions (Fixed)
-- Create database functions to support mobile app timeline functionality
-- Updated to match desktop parameter names and structure

-- Function 1: Get guest's assigned itineraries for mobile timeline
CREATE OR REPLACE FUNCTION get_guest_itineraries(p_guest_id TEXT, p_event_id TEXT)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    date DATE,
    start_time TIME,
    end_time TIME,
    location TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id::TEXT,
        i.title,
        i.description,
        i.date,
        i.start_time,
        i.end_time,
        i.location
    FROM itineraries i
    INNER JOIN guest_itinerary_assignments gia ON i.id = gia.itinerary_id
    WHERE gia.guest_id = p_guest_id::UUID
      AND gia.event_id = p_event_id::UUID
    ORDER BY i.start_time;
END;
$$;

-- Function 2: Ensure get_event_timeline_modules exists with correct parameters (if not already created)
-- This function should already exist from earlier SQL scripts, but let's make sure it's compatible
CREATE OR REPLACE FUNCTION get_event_timeline_modules(p_event_id TEXT)
RETURNS TABLE (
    id TEXT,
    module_type TEXT,
    title TEXT,
    question TEXT,
    label TEXT,
    time TIME,
    link TEXT,
    file TEXT,
    survey_data JSONB,
    feedback_data JSONB,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id::TEXT,
        tm.module_type,
        tm.title,
        tm.question,
        tm.label,
        tm.time,
        tm.link,
        tm.file,
        tm.survey_data,
        tm.feedback_data,
        tm.created_at
    FROM timeline_modules tm
    WHERE tm.event_id = p_event_id::UUID
    ORDER BY tm.time;
END;
$$;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_guest_itineraries(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_event_timeline_modules(TEXT) TO authenticated, anon;

-- Grant insert permissions for survey and feedback responses to authenticated and anonymous users
GRANT INSERT ON survey_responses TO authenticated, anon;
GRANT INSERT ON feedback_responses TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guest_itinerary_assignments_guest_event 
ON guest_itinerary_assignments(guest_id, event_id);

CREATE INDEX IF NOT EXISTS idx_timeline_modules_event_time 
ON timeline_modules(event_id, time);

CREATE INDEX IF NOT EXISTS idx_survey_responses_guest_event 
ON survey_responses(guest_id, event_id);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_guest_event 
ON feedback_responses(guest_id, event_id);

-- Verify functions were created successfully
SELECT 
    proname as function_name,
    prokind as function_type,
    proargnames as argument_names
FROM pg_proc 
WHERE proname IN ('get_guest_itineraries', 'get_event_timeline_modules')
ORDER BY proname;

-- Test the functions (replace with actual IDs when testing)
-- SELECT * FROM get_guest_itineraries('guest-id-here', 'event-id-here');
-- SELECT * FROM get_event_timeline_modules('event-id-here'); 