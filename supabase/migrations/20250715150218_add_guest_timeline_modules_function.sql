-- Add RPC function for guests to access timeline modules
-- Function: Get timeline modules for a specific guest
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
    RETURN QUERY
    SELECT 
        tm.id, tm.module_type, tm.title, tm.question, tm."time",
        tm.date, tm.label, tm.link, tm.file, tm.survey_data, tm.feedback_data,
        tm.created_at
    FROM public.timeline_modules tm
    INNER JOIN public.timeline_module_guests tmg ON tm.id = tmg.module_id
    WHERE tmg.guest_id = p_guest_id 
      AND tm.event_id = p_event_id
      AND (p_date IS NULL OR tm.date = p_date)
    ORDER BY tm."time", tm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for timeline_module_guests
DROP POLICY IF EXISTS "Guests can view assigned modules" ON public.timeline_module_guests;
CREATE POLICY "Guests can view assigned modules" ON public.timeline_module_guests
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_guest_timeline_modules TO authenticated, anon;
