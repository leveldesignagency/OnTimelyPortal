-- Create notification triggers and functions
-- This handles automatic notification creation when timeline modules are added

-- Function to create notifications for timeline modules
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
    WHEN 'flight' THEN
      module_title := 'Flight Information';
      module_content := jsonb_build_object(
        'flightNumber', NEW.module_data->>'flightNumber',
        'seatNumber', NEW.module_data->>'seatNumber',
        'departureTime', NEW.module_data->>'departureTime',
        'arrivalTime', NEW.module_data->>'arrivalTime'
      );
    WHEN 'hotel' THEN
      module_title := 'Hotel Information';
      module_content := jsonb_build_object(
        'hotelName', NEW.module_data->>'hotelName',
        'reservationNumber', NEW.module_data->>'reservationNumber',
        'checkIn', NEW.module_data->>'checkIn',
        'checkOut', NEW.module_data->>'checkOut'
      );
    WHEN 'train' THEN
      module_title := 'Train Information';
      module_content := jsonb_build_object(
        'trainNumber', NEW.module_data->>'trainNumber',
        'bookingNumber', NEW.module_data->>'bookingNumber',
        'departureTime', NEW.module_data->>'departureTime'
      );
    WHEN 'coach' THEN
      module_title := 'Coach Information';
      module_content := jsonb_build_object(
        'coachNumber', NEW.module_data->>'coachNumber',
        'bookingNumber', NEW.module_data->>'bookingNumber',
        'departureTime', NEW.module_data->>'departureTime'
      );
    WHEN 'id_upload' THEN
      module_title := 'ID Upload Required';
      module_content := jsonb_build_object(
        'documentType', NEW.module_data->>'documentType',
        'instructions', NEW.module_data->>'instructions'
      );
    WHEN 'event_reference' THEN
      module_title := 'Event Reference';
      module_content := jsonb_build_object(
        'reference', NEW.module_data->>'reference',
        'description', NEW.module_data->>'description'
      );
    ELSE
      module_title := 'New Module';
      module_content := NEW.module_data;
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
      'You have a new ' || module_title || ' for ' || event_record.title,
      'module',
      NEW.scheduled_time,
      NOW()
    ) RETURNING * INTO notification_record;
    
    -- If the module is scheduled for now or in the past, send notification immediately
    IF NEW.scheduled_time <= NOW() THEN
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

-- Function to send push notification for a specific guest
CREATE OR REPLACE FUNCTION send_push_notification_for_guest(
  notification_id UUID,
  guest_email TEXT,
  title TEXT,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  -- Call the Supabase Edge Function to send the push notification
  -- This will be handled by the Edge Function we created
  -- For now, we'll just log it (you can implement HTTP call here if needed)
  RAISE NOTICE 'Sending push notification to %: % - %', guest_email, title, body;
  
  -- In a real implementation, you would make an HTTP call to your Edge Function
  -- For now, we'll update the notification record to indicate it should be sent
  UPDATE itinerary_module_notifications 
  SET push_sent = FALSE, 
      push_error = 'Pending send via Edge Function'
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications when timeline modules are inserted
CREATE TRIGGER create_notifications_on_module_insert
  AFTER INSERT ON timeline_modules
  FOR EACH ROW
  EXECUTE FUNCTION create_module_notifications();

-- Function to process scheduled notifications (run via cron or scheduled job)
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

-- Function to get unread notification count for a guest (for badge display)
CREATE OR REPLACE FUNCTION get_guest_notification_badge_count(guest_email TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM itinerary_module_notifications imn
    JOIN guests g ON imn.guest_id = g.id
    WHERE g.email = guest_email 
    AND imn.read = FALSE
    AND imn.push_sent = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 