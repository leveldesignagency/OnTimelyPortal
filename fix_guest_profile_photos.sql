-- Fix Guest Profile Photos and Avatar Display
-- This script adds profile photo upload capability for guests and fixes avatar display in chat

-- 1. Add avatar_url column to guests table if it doesn't exist
ALTER TABLE guests ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create storage bucket for guest profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-profiles',
  'guest-profiles', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Create storage policies for guest profiles bucket
CREATE POLICY "Guests can upload their own profile photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'guest-profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Guests can update their own profile photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'guest-profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Guests can delete their own profile photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'guest-profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Everyone can view guest profile photos" ON storage.objects
FOR SELECT USING (bucket_id = 'guest-profiles');

-- 4. Create function to get guest profile with avatar
CREATE OR REPLACE FUNCTION get_guest_profile(guest_email TEXT, event_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  event_id UUID,
  company_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.first_name,
    g.last_name,
    g.email,
    g.avatar_url,
    g.event_id,
    g.company_id,
    g.created_at,
    g.updated_at
  FROM guests g
  WHERE g.email = guest_email AND g.event_id = event_id;
END;
$$;

-- 5. Create function to update guest profile
CREATE OR REPLACE FUNCTION update_guest_profile(
  guest_email TEXT,
  event_id UUID,
  new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE guests 
  SET 
    avatar_url = CASE 
      WHEN new_avatar_url IS NOT NULL THEN new_avatar_url
      ELSE avatar_url
    END,
    updated_at = NOW()
  WHERE email = guest_email AND event_id = event_id;
  
  RETURN FOUND;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION get_guest_profile(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_guest_profile(TEXT, UUID, TEXT) TO authenticated;

-- 7. Update the send_guests_chat_message function to properly handle avatar_url
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_avatar_url TEXT;
BEGIN
  -- Get sender details from guests table
  SELECT 
    first_name || ' ' || last_name,
    'guest',
    company_id,
    COALESCE(avatar_url, NULL) as avatar_url
  INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
  FROM guests 
  WHERE email = p_sender_email AND event_id = p_event_id;
  
  -- If not found in guests, check if it's an admin (company user)
  IF v_sender_name IS NULL THEN
    SELECT 
      name,
      'admin',
      company_id,
      COALESCE(avatar_url, NULL) as avatar_url
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM users 
    WHERE email = p_sender_email;
  END IF;
  
  -- Debug logging
  RAISE NOTICE 'Sender: %, Name: %, Type: %, Avatar: %', p_sender_email, v_sender_name, v_sender_type, v_avatar_url;
  
  -- Insert the message
  INSERT INTO guests_chat_messages (
    event_id,
    sender_email,
    sender_name,
    sender_type,
    message_text,
    message_type,
    company_id,
    avatar_url,
    reply_to_message_id
  ) VALUES (
    p_event_id,
    p_sender_email,
    v_sender_name,
    v_sender_type,
    p_message_text,
    p_message_type,
    v_company_id,
    v_avatar_url,
    p_reply_to_message_id
  ) RETURNING message_id INTO v_message_id;
  
  -- Return the created message
  RETURN json_build_object(
    'message_id', v_message_id,
    'event_id', p_event_id,
    'sender_email', p_sender_email,
    'sender_name', v_sender_name,
    'sender_type', v_sender_type,
    'message_text', p_message_text,
    'message_type', p_message_type,
    'company_id', v_company_id,
    'avatar_url', v_avatar_url,
    'reply_to_message_id', p_reply_to_message_id,
    'created_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Test the setup
SELECT 'Guest profile photo system setup complete!' as status; 