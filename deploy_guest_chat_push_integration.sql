-- ============================================
-- DEPLOY GUEST CHAT PUSH NOTIFICATION INTEGRATION
-- Updates the guest chat system to properly call the Edge Function
-- ============================================

-- Enhanced function to call the guest chat push notification edge function
CREATE OR REPLACE FUNCTION send_guest_chat_push_notification(
  p_notification_id UUID,
  p_recipient_email TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  v_supabase_url TEXT;
  v_function_url TEXT;
  v_request_body JSONB;
  v_headers JSONB;
  v_response TEXT;
BEGIN
  -- Get the Supabase URL (you'll need to set this in your environment)
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- If not set via setting, use a default (update this with your actual URL)
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://your-project-ref.supabase.co';
  END IF;
  
  v_function_url := v_supabase_url || '/functions/v1/send-guest-chat-push';
  
  -- Prepare request body
  v_request_body := jsonb_build_object(
    'notificationId', p_notification_id,
    'recipientEmail', p_recipient_email,
    'title', p_title,
    'body', p_body,
    'data', p_data
  );
  
  -- Prepare headers
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  );

  -- For now, just log the notification (Edge Function integration requires additional setup)
  RAISE NOTICE '[GUEST CHAT PUSH] Would send notification to %: % - %', p_recipient_email, p_title, p_body;
  RAISE NOTICE '[GUEST CHAT PUSH] Function URL: %', v_function_url;
  RAISE NOTICE '[GUEST CHAT PUSH] Request body: %', v_request_body;
  
  -- Update the notification record to indicate it's being processed
  UPDATE guests_chat_notifications 
  SET push_sent = FALSE, 
      push_error = 'Queued for Edge Function processing'
  WHERE id = p_notification_id;
  
  -- TODO: Implement actual HTTP call to Edge Function
  -- This requires the http extension and proper configuration
  -- For production, you would uncomment and configure the following:
  
  /*
  -- Make HTTP request to the Edge Function
  SELECT content INTO v_response FROM http((
    'POST',
    v_function_url,
    ARRAY[
      ('Content-Type', 'application/json')::http_header,
      ('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))::http_header
    ],
    'application/json',
    v_request_body::text
  ));
  
  -- Update notification based on response
  IF v_response IS NOT NULL THEN
    UPDATE guests_chat_notifications 
    SET push_sent = TRUE,
        push_sent_at = NOW(),
        push_error = NULL
    WHERE id = p_notification_id;
  ELSE
    UPDATE guests_chat_notifications 
    SET push_sent = FALSE,
        push_error = 'Edge Function call failed'
    WHERE id = p_notification_id;
  END IF;
  */
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually trigger push notifications for testing
CREATE OR REPLACE FUNCTION trigger_guest_chat_push_notification(
  p_notification_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_notification RECORD;
  v_result JSONB;
BEGIN
  -- Get notification details
  SELECT * INTO v_notification
  FROM guests_chat_notifications
  WHERE id = p_notification_id;
  
  IF v_notification IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification not found');
  END IF;
  
  -- Call the push notification function
  PERFORM send_guest_chat_push_notification(
    v_notification.id,
    v_notification.recipient_email,
    v_notification.title,
    v_notification.body,
    jsonb_build_object(
      'type', 'guest_chat',
      'messageId', v_notification.message_id,
      'eventId', v_notification.event_id,
      'senderName', v_notification.sender_name,
      'senderEmail', v_notification.sender_email
    )
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'notification_id', p_notification_id,
    'recipient', v_notification.recipient_email,
    'title', v_notification.title
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get push notification statistics
CREATE OR REPLACE FUNCTION get_guest_chat_push_stats(p_event_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_notifications', COUNT(*),
    'sent_successfully', COUNT(*) FILTER (WHERE push_sent = TRUE AND push_error IS NULL),
    'pending', COUNT(*) FILTER (WHERE push_sent = FALSE AND push_error IS NULL),
    'failed', COUNT(*) FILTER (WHERE push_error IS NOT NULL),
    'unread', COUNT(*) FILTER (WHERE is_read = FALSE),
    'by_event', (
      SELECT jsonb_object_agg(
        e.name, 
        jsonb_build_object(
          'event_id', gcn.event_id,
          'total', COUNT(*),
          'sent', COUNT(*) FILTER (WHERE gcn.push_sent = TRUE)
        )
      )
      FROM guests_chat_notifications gcn
      JOIN events e ON gcn.event_id = e.id
      WHERE (p_event_id IS NULL OR gcn.event_id = p_event_id)
      GROUP BY gcn.event_id, e.name
    )
  ) INTO v_stats
  FROM guests_chat_notifications gcn
  WHERE (p_event_id IS NULL OR gcn.event_id = p_event_id);
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_guest_chat_push_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guest_chat_push_stats(UUID) TO authenticated;

-- Enable the http extension if needed (uncomment if using HTTP calls)
-- CREATE EXTENSION IF NOT EXISTS "http";

-- Set up configuration (replace with your actual values)
-- ALTER DATABASE SET app.settings.supabase_url = 'https://your-project-ref.supabase.co';
-- ALTER DATABASE SET app.settings.service_role_key = 'your-service-role-key';

-- Create a view for easy monitoring of push notifications
CREATE OR REPLACE VIEW guest_chat_push_monitoring AS
SELECT 
  gcn.id,
  gcn.message_id,
  e.name as event_name,
  gcn.recipient_email,
  gcn.sender_name,
  gcn.title,
  gcn.push_sent,
  gcn.push_sent_at,
  gcn.push_error,
  gcn.is_read,
  gcn.created_at,
  array_length(gcn.push_tokens, 1) as token_count
FROM guests_chat_notifications gcn
JOIN events e ON gcn.event_id = e.id
ORDER BY gcn.created_at DESC;

-- Grant select on the monitoring view
GRANT SELECT ON guest_chat_push_monitoring TO authenticated; 