-- Create function to get form data by token
CREATE OR REPLACE FUNCTION get_form_by_token(p_token TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  fields JSONB,
  event_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.title,
    f.description,
    f.fields,
    f.event_id
  FROM forms f
  INNER JOIN form_recipients fr ON f.id = fr.form_id
  WHERE fr.token = p_token
  AND fr.expires_at > NOW();
END;
$$;

-- Create function to submit form response
CREATE OR REPLACE FUNCTION submit_form_response(
  p_token TEXT,
  p_email TEXT,
  p_responses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_form_id UUID;
  v_recipient_id UUID;
  v_response_id UUID;
BEGIN
  -- Get form_id and recipient_id from token
  SELECT fr.form_id, fr.id INTO v_form_id, v_recipient_id
  FROM form_recipients fr
  WHERE fr.token = p_token
  AND fr.expires_at > NOW();
  
  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;
  
  -- Check if already submitted
  IF EXISTS (
    SELECT 1 FROM form_submissions 
    WHERE recipient_id = v_recipient_id
  ) THEN
    RAISE EXCEPTION 'Form already submitted';
  END IF;
  
  -- Insert the submission
  INSERT INTO form_submissions (
    form_id,
    recipient_id,
    email,
    responses,
    submitted_at
  ) VALUES (
    v_form_id,
    v_recipient_id,
    p_email,
    p_responses,
    NOW()
  )
  RETURNING id INTO v_response_id;
  
  -- Mark recipient as responded
  UPDATE form_recipients 
  SET responded_at = NOW()
  WHERE id = v_recipient_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_response_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_form_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_form_response(TEXT, TEXT, JSONB) TO anon; 