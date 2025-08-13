-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_form_by_token(TEXT);
DROP FUNCTION IF EXISTS create_form_recipients(UUID, TEXT[]);
DROP FUNCTION IF EXISTS submit_form_response(TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS generate_form_token();

-- Drop existing tables if they exist to avoid column conflicts
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_recipients CASCADE;
DROP TABLE IF EXISTS forms CASCADE;

-- Create forms table
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  modules JSONB NOT NULL DEFAULT '[]',
  emails_sent TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create form_recipients table
CREATE TABLE form_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create form_submissions table
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES form_recipients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Forms policies
CREATE POLICY "Users can view forms for their company events" ON forms
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create forms for their company events" ON forms
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update forms for their company events" ON forms
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Form recipients policies
CREATE POLICY "Users can view recipients for their company forms" ON form_recipients
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM forms WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create recipients for their company forms" ON form_recipients
  FOR INSERT WITH CHECK (
    form_id IN (
      SELECT id FROM forms WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Form submissions policies (public access for form submission)
CREATE POLICY "Anyone can submit forms" ON form_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view submissions for their company forms" ON form_submissions
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM forms WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Helper function to generate form token
CREATE OR REPLACE FUNCTION generate_form_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'form_' || gen_random_uuid()::text;
END;
$$ LANGUAGE plpgsql;

-- RPC functions for form management
CREATE OR REPLACE FUNCTION create_form_recipients(
  p_form_id UUID,
  p_emails TEXT[]
)
RETURNS TABLE(emails TEXT[], links TEXT[]) AS $$
DECLARE
  email TEXT;
  token TEXT;
  emails_array TEXT[] := '{}';
  links_array TEXT[] := '{}';
BEGIN
  FOR email IN SELECT unnest(p_emails)
  LOOP
    token := generate_form_token();
    
    INSERT INTO form_recipients (form_id, email, token)
    VALUES (p_form_id, email, token);
    
    -- Build arrays for return
    emails_array := array_append(emails_array, email);
    links_array := array_append(links_array, 'https://ontimely.co.uk/forms/' || token);
  END LOOP;
  
  -- Return both arrays
  RETURN QUERY SELECT emails_array, links_array;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get form by token
CREATE OR REPLACE FUNCTION get_form_by_token(p_token TEXT)
RETURNS TABLE(
  form_id UUID,
  title TEXT,
  description TEXT,
  fields JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.title, f.description, f.fields
  FROM forms f
  JOIN form_recipients fr ON f.id = fr.form_id
  WHERE fr.token = p_token AND f.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit form response
CREATE OR REPLACE FUNCTION submit_form_response(
  p_token TEXT,
  p_email TEXT,
  p_responses JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_form_id UUID;
BEGIN
  -- Get form ID from token
  SELECT form_id INTO v_form_id
  FROM form_recipients
  WHERE token = p_token;
  
  IF v_form_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Insert submission
  INSERT INTO form_submissions (form_id, recipient_id, email, responses)
  SELECT v_form_id, id, p_email, p_responses
  FROM form_recipients
  WHERE token = p_token;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

