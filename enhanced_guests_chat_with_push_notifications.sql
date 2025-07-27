-- ============================================
-- ENHANCED GUEST CHAT WITH PUSH NOTIFICATIONS
-- Integrates with existing push notification system
-- ============================================

-- Create guest chat notifications table
CREATE TABLE IF NOT EXISTS guests_chat_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core relationships
  message_id UUID NOT NULL, -- References guests_chat_messages.message_id
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Recipient information
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'guest')),
  
  -- Sender information
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'guest')),
  
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Push notification tracking
  push_tokens TEXT[], -- Array of Expo push tokens
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  push_delivered BOOLEAN DEFAULT FALSE,
  push_delivered_at TIMESTAMPTZ,
  push_error TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique notifications per message-recipient
  UNIQUE(message_id, recipient_email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_event_id ON guests_chat_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_recipient ON guests_chat_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_sender ON guests_chat_notifications(sender_email);
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_message_id ON guests_chat_notifications(message_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_unread ON guests_chat_notifications(recipient_email, is_read) WHERE is_read = FALSE;

-- Enhanced function to send guest chat messages WITH push notifications
CREATE OR REPLACE FUNCTION send_guests_chat_message_with_notifications(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS JSON AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_can_send BOOLEAN := FALSE;
  v_result JSON;
  v_event_name TEXT;
  v_recipient RECORD;
  v_notification_id UUID;
  v_push_tokens TEXT[];
BEGIN
  -- Get event details
  SELECT company_id, name INTO v_company_id, v_event_name
  FROM events 
  WHERE id = p_event_id;
  
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Check if sender is an assigned admin for this event
  SELECT TRUE, u.name, 'admin'
  INTO v_can_send, v_sender_name, v_sender_type
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  WHERE te.event_id = p_event_id
    AND u.email = p_sender_email
    AND u.company_id = v_company_id
  LIMIT 1;

  -- If not an admin, check if sender is a guest for this event
  IF NOT v_can_send THEN
    SELECT TRUE, COALESCE(g.first_name || ' ' || g.last_name, g.first_name, 'Guest'), 'guest'
    INTO v_can_send, v_sender_name, v_sender_type
    FROM guests g
    WHERE g.event_id = p_event_id
      AND g.email = p_sender_email
      AND g.company_id = v_company_id
    LIMIT 1;
  END IF;

  IF NOT v_can_send THEN
    RETURN json_build_object('success', false, 'error', 'You are not authorized to send messages in this chat');
  END IF;

  -- Generate message ID
  v_message_id := gen_random_uuid();

  -- Insert the message
  INSERT INTO guests_chat_messages (
    message_id,
    event_id,
    sender_email,
    sender_name,
    sender_type,
    message_text,
    message_type,
    company_id
  ) VALUES (
    v_message_id,
    p_event_id,
    p_sender_email,
    v_sender_name,
    v_sender_type,
    p_message_text,
    p_message_type,
    v_company_id
  );

  -- Create read receipts for all participants except sender
  INSERT INTO guests_chat_receipts (event_id, message_id, user_email, company_id)
  SELECT 
    p_event_id,
    v_message_id,
    gcp.user_email,
    v_company_id
  FROM guests_chat_participants gcp
  WHERE gcp.event_id = p_event_id
    AND gcp.user_email != p_sender_email
    AND gcp.company_id = v_company_id;

  -- Create push notifications for all participants except sender
  FOR v_recipient IN
    SELECT 
      gcp.user_email as recipient_email,
      gcp.user_type as recipient_type
    FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id
      AND gcp.user_email != p_sender_email
      AND gcp.company_id = v_company_id
  LOOP
    -- Get push tokens for this recipient
    SELECT ARRAY(
      SELECT upt.expo_push_token 
      FROM user_push_tokens upt
      LEFT JOIN users u ON upt.user_id = u.id
      LEFT JOIN guests g ON upt.guest_id = g.id
      WHERE (u.email = v_recipient.recipient_email OR g.email = v_recipient.recipient_email)
        AND upt.expo_push_token IS NOT NULL
        AND LENGTH(upt.expo_push_token) > 0
        AND upt.is_active = TRUE
    ) INTO v_push_tokens;

    -- Create notification record
    INSERT INTO guests_chat_notifications (
      message_id,
      event_id,
      company_id,
      recipient_email,
      recipient_type,
      sender_email,
      sender_name,
      sender_type,
      title,
      body,
      push_tokens
    ) VALUES (
      v_message_id,
      p_event_id,
      v_company_id,
      v_recipient.recipient_email,
      v_recipient.recipient_type,
      p_sender_email,
      v_sender_name,
      v_sender_type,
      v_event_name || ' - ' || v_sender_name,
      CASE 
        WHEN LENGTH(p_message_text) > 100 THEN SUBSTRING(p_message_text, 1, 100) || '...'
        ELSE p_message_text
      END,
      v_push_tokens
    ) RETURNING id INTO v_notification_id;

    -- Call the edge function to send push notification
    IF array_length(v_push_tokens, 1) > 0 THEN
      PERFORM send_guest_chat_push_notification(
        v_notification_id,
        v_recipient.recipient_email,
        v_event_name || ' - ' || v_sender_name,
        CASE 
          WHEN LENGTH(p_message_text) > 100 THEN SUBSTRING(p_message_text, 1, 100) || '...'
          ELSE p_message_text
        END,
        json_build_object(
          'type', 'guest_chat',
          'messageId', v_message_id,
          'eventId', p_event_id,
          'eventName', v_event_name,
          'senderName', v_sender_name,
          'senderEmail', p_sender_email
        )::jsonb
      );
    END IF;
  END LOOP;

  v_result := json_build_object(
    'success', true,
    'message_id', v_message_id,
    'sender_type', v_sender_type,
    'sender_name', v_sender_name
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to call the guest chat push notification edge function
CREATE OR REPLACE FUNCTION send_guest_chat_push_notification(
  p_notification_id UUID,
  p_recipient_email TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  -- This will be handled by the Edge Function
  -- For now, we'll just log it and mark it as pending
  RAISE NOTICE 'Sending guest chat push notification to %: % - %', p_recipient_email, p_title, p_body;
  
  -- Update the notification record to indicate it should be sent
  UPDATE guests_chat_notifications 
  SET push_sent = FALSE, 
      push_error = 'Pending send via Edge Function'
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread chat notification count for a user
CREATE OR REPLACE FUNCTION get_guest_chat_notification_count(p_user_email TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM guests_chat_notifications
    WHERE recipient_email = p_user_email 
      AND is_read = FALSE
      AND push_sent = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark chat notifications as read
CREATE OR REPLACE FUNCTION mark_guest_chat_notifications_read(
  p_user_email TEXT,
  p_event_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE guests_chat_notifications 
  SET is_read = TRUE,
      read_at = NOW()
  WHERE recipient_email = p_user_email
    AND is_read = FALSE
    AND (p_event_id IS NULL OR event_id = p_event_id);
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process pending chat notifications (for background job)
CREATE OR REPLACE FUNCTION process_pending_guest_chat_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_notification RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  -- Find all notifications that haven't been sent and have push tokens
  FOR v_notification IN 
    SELECT gcn.*
    FROM guests_chat_notifications gcn
    WHERE gcn.push_sent = FALSE
      AND gcn.push_error IS NULL
      AND array_length(gcn.push_tokens, 1) > 0
    ORDER BY gcn.created_at ASC
    LIMIT 50 -- Process in batches
  LOOP
    -- Send the push notification
    PERFORM send_guest_chat_push_notification(
      v_notification.id,
      v_notification.recipient_email,
      v_notification.title,
      v_notification.body,
      json_build_object(
        'type', 'guest_chat',
        'messageId', v_notification.message_id,
        'eventId', v_notification.event_id,
        'eventName', (SELECT name FROM events WHERE id = v_notification.event_id),
        'senderName', v_notification.sender_name,
        'senderEmail', v_notification.sender_email
      )::jsonb
    );
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message_with_notifications(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_guest_chat_push_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guest_chat_notification_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_guest_chat_notifications_read(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_guest_chat_notifications() TO authenticated;

-- Enable RLS on the notifications table
ALTER TABLE guests_chat_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notifications
CREATE POLICY "Users can view own chat notifications" ON guests_chat_notifications
  FOR SELECT USING (
    recipient_email IN (
      SELECT email FROM users WHERE id = auth.uid()
      UNION
      SELECT email FROM guests WHERE email = recipient_email
    )
  );

-- Enable real-time on the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_notifications; 