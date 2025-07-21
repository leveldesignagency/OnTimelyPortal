-- Create a function to insert guest answers with service role permissions
-- This bypasses RLS since the function runs with elevated privileges

CREATE OR REPLACE FUNCTION insert_guest_module_answer(
    p_guest_id UUID,
    p_module_id TEXT,
    p_answer_text TEXT,
    p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with elevated privileges
AS $$
DECLARE
    v_result JSON;
    v_guest_exists BOOLEAN;
BEGIN
    -- Check if the guest exists
    SELECT EXISTS(
        SELECT 1 FROM guests 
        WHERE id = p_guest_id
    ) INTO v_guest_exists;
    
    IF NOT v_guest_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Guest not found'
        );
    END IF;
    
    -- Insert the answer
    INSERT INTO guest_module_answers (
        guest_id,
        module_id,
        answer_text,
        event_id,
        timestamp
    ) VALUES (
        p_guest_id,
        p_module_id,
        p_answer_text,
        p_event_id,
        NOW()
    );
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Answer submitted successfully'
    );
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Answer already exists for this guest and module'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_guest_module_answer TO authenticated; 