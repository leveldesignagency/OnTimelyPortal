-- SQL 5: Timeline Module Management Functions
-- Functions to create, read, update, delete timeline modules

-- Function 1: Add a timeline module
CREATE OR REPLACE FUNCTION add_timeline_module(
    p_event_id UUID,
    p_module_type TEXT,
    p_time TEXT,
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
        event_id, module_type, title, question, "time",
        label, link, file, survey_data, feedback_data,
        created_by
    )
    VALUES (
        p_event_id, p_module_type, p_title, p_question, p_time,
        p_label, p_link, p_file, p_survey_data, p_feedback_data,
        auth.uid()
    )
    RETURNING id INTO new_module_id;
    
    RETURN new_module_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get all timeline modules for an event
CREATE OR REPLACE FUNCTION get_event_timeline_modules(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    module_type TEXT,
    title TEXT,
    question TEXT,
    "time" TEXT,
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
        tm.label, tm.link, tm.file, tm.survey_data, tm.feedback_data,
        tm.created_at
    FROM public.timeline_modules tm
    WHERE tm.event_id = p_event_id
    ORDER BY tm."time", tm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get timeline modules for a specific guest
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

-- Function 4: Update a timeline module
CREATE OR REPLACE FUNCTION update_timeline_module(
    p_module_id UUID,
    p_title TEXT DEFAULT NULL,
    p_question TEXT DEFAULT NULL,
    p_time TEXT DEFAULT NULL,
    p_label TEXT DEFAULT NULL,
    p_link TEXT DEFAULT NULL,
    p_file TEXT DEFAULT NULL,
    p_survey_data JSONB DEFAULT NULL,
    p_feedback_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.timeline_modules
    SET 
        title = COALESCE(p_title, title),
        question = COALESCE(p_question, question),
        "time" = COALESCE(p_time, "time"),
        label = COALESCE(p_label, label),
        link = COALESCE(p_link, link),
        file = COALESCE(p_file, file),
        survey_data = COALESCE(p_survey_data, survey_data),
        feedback_data = COALESCE(p_feedback_data, feedback_data),
        updated_at = NOW()
    WHERE id = p_module_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Delete a timeline module
CREATE OR REPLACE FUNCTION delete_timeline_module(p_module_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.timeline_modules
    WHERE id = p_module_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 6: Delete multiple timeline modules
CREATE OR REPLACE FUNCTION delete_timeline_modules(p_module_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.timeline_modules
    WHERE id = ANY(p_module_ids);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for timeline_modules
DROP POLICY IF EXISTS "Users can manage company event modules" ON public.timeline_modules;
CREATE POLICY "Users can manage company event modules" ON public.timeline_modules
    FOR ALL
    USING (
        event_id IN (
            SELECT e.id 
            FROM public.events e 
            WHERE e.id = event_id
        )
    );

-- Create RLS policies for timeline_module_guests
DROP POLICY IF EXISTS "Guests can view assigned modules" ON public.timeline_module_guests;
CREATE POLICY "Guests can view assigned modules" ON public.timeline_module_guests
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_timeline_module TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_event_timeline_modules TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_guest_timeline_modules TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_timeline_module TO authenticated, anon;
GRANT EXECUTE ON FUNCTION delete_timeline_module TO authenticated, anon;
GRANT EXECUTE ON FUNCTION delete_timeline_modules TO authenticated, anon;

-- Test the functions
SELECT 'Timeline module functions created successfully' as result; 