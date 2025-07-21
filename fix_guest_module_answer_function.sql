-- Drop all existing insert_guest_module_answer functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
             FROM pg_proc WHERE proname = 'insert_guest_module_answer'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS insert_guest_module_answer(' || r.args || ') CASCADE;';
    END LOOP;
END $$;

-- Create the new function with media_url
CREATE OR REPLACE FUNCTION insert_guest_module_answer(
    p_guest_id UUID,
    p_module_id TEXT,
    p_answer_text TEXT,
    p_event_id UUID,
    p_media_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO guest_module_answers (
        guest_id,
        module_id,
        answer_text,
        event_id,
        media_url,
        timestamp
    ) VALUES (
        p_guest_id,
        p_module_id,
        p_answer_text,
        p_event_id,
        p_media_url,
        NOW()
    );
    RETURN json_build_object('success', true, 'message', 'Answer submitted successfully');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION insert_guest_module_answer(UUID, TEXT, TEXT, UUID, TEXT) TO anon; 