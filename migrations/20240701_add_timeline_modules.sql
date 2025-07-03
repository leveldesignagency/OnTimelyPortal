-- Migration: Add timeline_modules table and RPCs for event timeline modules

-- 1. Table: timeline_modules
CREATE TABLE IF NOT EXISTS public.timeline_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    module_type text NOT NULL CHECK (module_type IN ('question', 'feedback', 'survey', 'qrcode')),
    time text NOT NULL, -- e.g. '14:00'
    question text,
    title text,
    label text,
    link text,
    file text,
    survey_data jsonb,
    feedback_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Function: add_timeline_module
CREATE OR REPLACE FUNCTION public.add_timeline_module(
    p_event_id uuid,
    p_module_type text,
    p_time text,
    p_question text DEFAULT NULL,
    p_title text DEFAULT NULL,
    p_label text DEFAULT NULL,
    p_link text DEFAULT NULL,
    p_file text DEFAULT NULL,
    p_survey_data jsonb DEFAULT NULL,
    p_feedback_data jsonb DEFAULT NULL
)
RETURNS SETOF public.timeline_modules AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.timeline_modules (
        event_id, module_type, time, question, title, label, link, file, survey_data, feedback_data
    ) VALUES (
        p_event_id, p_module_type, p_time, p_question, p_title, p_label, p_link, p_file, p_survey_data, p_feedback_data
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function: get_event_timeline_modules
CREATE OR REPLACE FUNCTION public.get_event_timeline_modules(
    p_event_id uuid
)
RETURNS SETOF public.timeline_modules AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.timeline_modules WHERE event_id = p_event_id ORDER BY time ASC, created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_timeline_modules_event_id ON public.timeline_modules(event_id); 