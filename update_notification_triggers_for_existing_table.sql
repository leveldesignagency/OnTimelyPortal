-- Update notification triggers to work with existing timeline_modules table
-- This modifies the triggers to work with the current table structure

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS create_notifications_on_module_insert ON timeline_modules;

-- Update the function to work with existing timeline_modules structure
CREATE OR REPLACE FUNCTION create_module_notifications()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  company_record RECORD;
  guest_record RECORD;
  notification_record RECORD;
  module_title TEXT;
  module_content JSONB;
BEGIN
  -- Get event information
  SELECT * INTO event_record FROM events WHERE id = NEW.event_id;
  
  -- Get company information
  SELECT * INTO company_record FROM companies WHERE id = event_record.company_id;
  
  -- Determine module title and content based on module type
  CASE NEW.module_type
    WHEN 'qrcode' THEN
      module_title := 'QR Code Available';
      module_content := jsonb_build_object(
        'label', NEW.label,
        'link', NEW.link,
        'file', NEW.file,
        'time', NEW.time
      );
    WHEN 'survey' THEN
      module_title := 'Survey Available';
      module_content := jsonb_build_object(
        'title', NEW.title,
        'survey_data', NEW.survey_data,
        'time', NEW.time
      );
    WHEN 'feedback' THEN
      module_title := 'Feedback Requested';
      module_content := jsonb_build_object(
        'question', NEW.question,
        'feedback_data', NEW.feedback_data,
        'time', NEW.time
      );
    WHEN 'question' THEN
      module_title := 'Question Available';
      module_content := jsonb_build_object(
        'question', NEW.question,
        'time', NEW.time
      );
    ELSE
      module_title := 'New Module Available';
      module_content := jsonb_build_object(
        'title', NEW.title,
        'type', NEW.module_type,
        'time', NEW.time
      );
  END CASE;
  
  -- Create notifications for all guests in this event
  FOR guest_record IN 
    SELECT g.* FROM guests g 
    WHERE g.event_id = NEW.event_id 
    AND g.status = 'active'
  LOOP
    -- Insert notification record
    INSERT INTO itinerary_module_notifications (
      company_id,
      event_id,
      user_id,
      guest_id,
      module_id,
      module_type,
      module_title,
      module_content,
      title,
      body,
      notification_type,
      scheduled_for,
      created_at
    ) VALUES (
      event_record.company_id,
      NEW.event_id,
      NEW.created_by,
      guest_record.id,
      NEW.id,
      NEW.module_type,
      module_title,
      module_content,
      module_title,
      'You have a new ' || module_title || ' for ' || event_record.name,
      'module',
      -- Convert time string to scheduled time (assuming today's date)
      (CURRENT_DATE || ' ' || NEW.time)::timestamptz,
      NOW()
    ) RETURNING * INTO notification_record;
    
    -- If the module is scheduled for now or in the past, send notification immediately
    IF (CURRENT_DATE || ' ' || NEW.time)::timestamptz <= NOW() THEN
      PERFORM send_push_notification_for_guest(
        notification_record.id,
        guest_record.email,
        notification_record.title,
        notification_record.body,
        jsonb_build_object(
          'type', 'module',
          'moduleId', NEW.id,
          'eventId', NEW.event_id,
          'moduleType', NEW.module_type
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER create_notifications_on_module_insert
  AFTER INSERT ON timeline_modules
  FOR EACH ROW
  EXECUTE FUNCTION create_module_notifications();

-- Update the process_scheduled_notifications function to handle time-based scheduling
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS INTEGER AS $$
DECLARE
  notification_record RECORD;
  guest_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  -- Find all notifications that are scheduled for now or in the past and haven't been sent
  FOR notification_record IN 
    SELECT imn.*, g.email as guest_email
    FROM itinerary_module_notifications imn
    JOIN guests g ON imn.guest_id = g.id
    WHERE imn.scheduled_for <= NOW() 
    AND imn.push_sent = FALSE
    AND imn.push_error IS NULL
  LOOP
    -- Send the push notification
    PERFORM send_push_notification_for_guest(
      notification_record.id,
      notification_record.guest_email,
      notification_record.title,
      notification_record.body,
      jsonb_build_object(
        'type', 'module',
        'moduleId', notification_record.module_id,
        'eventId', notification_record.event_id,
        'moduleType', notification_record.module_type
      )
    );
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql; 