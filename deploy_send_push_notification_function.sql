-- Deploy send-push-notification Edge Function
-- Run this in your Supabase SQL Editor

-- Create the Edge Function
-- Note: This creates the function structure, but you'll need to add the actual code via the Supabase Dashboard

-- First, let's create a placeholder function that we can replace with the actual Edge Function
CREATE OR REPLACE FUNCTION send_push_notification(
  notification_id UUID,
  guest_email TEXT,
  title TEXT,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- This is a placeholder - the actual implementation will be in the Edge Function
  -- For now, we'll just log the notification and return success
  
  RAISE NOTICE 'Sending push notification to %: % - %', guest_email, title, body;
  
  -- Update the notification record to indicate it should be sent
  UPDATE itinerary_module_notifications 
  SET push_sent = FALSE, 
      push_error = 'Pending send via Edge Function'
  WHERE id = notification_id;
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Notification queued for sending',
    'notification_id', notification_id,
    'guest_email', guest_email
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_push_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated, anon;

-- Create a function to manually trigger the Edge Function via HTTP
CREATE OR REPLACE FUNCTION trigger_push_notification_edge_function(
  notification_id UUID,
  guest_email TEXT,
  title TEXT,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  response JSONB;
  http_response RECORD;
BEGIN
  -- Make HTTP request to the Edge Function
  SELECT * INTO http_response FROM 
    http((
      'POST',
      'https://your-project-ref.supabase.co/functions/v1/send-push-notification',
      ARRAY[
        ('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))::http_header,
        ('Content-Type', 'application/json')::http_header
      ],
      'application/json',
      jsonb_build_object(
        'notificationId', notification_id,
        'guestEmail', guest_email,
        'title', title,
        'body', body,
        'data', data
      )::text
    ));
  
  -- Parse the response
  response := http_response.content::jsonb;
  
  -- Update notification record based on response
  IF response->>'success' = 'true' THEN
    UPDATE itinerary_module_notifications 
    SET push_sent = TRUE,
        push_sent_at = NOW(),
        push_error = NULL
    WHERE id = notification_id;
  ELSE
    UPDATE itinerary_module_notifications 
    SET push_sent = FALSE,
        push_error = response->>'error'
    WHERE id = notification_id;
  END IF;
  
  RETURN response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_push_notification_edge_function(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated, anon;

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "http";

-- Test the function (uncomment when ready to test)
-- SELECT trigger_push_notification_edge_function(
--   'your-notification-id-here'::UUID,
--   'guest@example.com',
--   'Test Notification',
--   'This is a test notification',
--   '{"type": "test"}'::jsonb
-- ); 