-- Create itinerary_module_notifications table
-- This table stores notifications for timeline modules sent to guests

CREATE TABLE IF NOT EXISTS itinerary_module_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core relationships
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  
  -- Module information
  module_id UUID, -- Reference to the timeline module that triggered this notification
  module_type TEXT, -- Type of module (e.g., 'flight', 'hotel', 'train', 'coach', 'id_upload', 'event_reference')
  module_title TEXT, -- Title of the module for display
  module_content JSONB, -- Full module content/data
  
  -- Notification details
  title TEXT NOT NULL, -- Notification title
  body TEXT NOT NULL, -- Notification body/message
  notification_type TEXT DEFAULT 'module', -- Type: 'module', 'reminder', 'update', etc.
  
  -- Status tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ, -- When the notification should be sent (for scheduled notifications)
  read_at TIMESTAMPTZ, -- When the user read the notification
  read BOOLEAN DEFAULT FALSE,
  
  -- Push notification tracking
  push_token TEXT, -- Expo push token for the device
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  push_error TEXT, -- Error message if push failed
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_itinerary_module_notifications_guest_id ON itinerary_module_notifications(guest_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_module_notifications_event_id ON itinerary_module_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_module_notifications_company_id ON itinerary_module_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_module_notifications_read ON itinerary_module_notifications(read);
CREATE INDEX IF NOT EXISTS idx_itinerary_module_notifications_scheduled_for ON itinerary_module_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_itinerary_module_notifications_guest_read ON itinerary_module_notifications(guest_id, read);

-- Enable RLS
ALTER TABLE itinerary_module_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Guests can only see their own notifications
CREATE POLICY "Guests can view own notifications" ON itinerary_module_notifications
  FOR SELECT USING (guest_id IN (
    SELECT id FROM guests WHERE email = auth.jwt() ->> 'email'
  ));

-- Users can create notifications for guests in their company
CREATE POLICY "Users can create notifications for company guests" ON itinerary_module_notifications
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update notifications for guests in their company
CREATE POLICY "Users can update company notifications" ON itinerary_module_notifications
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_itinerary_module_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_itinerary_module_notifications_updated_at
  BEFORE UPDATE ON itinerary_module_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_itinerary_module_notifications_updated_at();

-- Function to get unread notification count for a guest
CREATE OR REPLACE FUNCTION get_guest_unread_notification_count(guest_email TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM itinerary_module_notifications imn
    JOIN guests g ON imn.guest_id = g.id
    WHERE g.email = guest_email AND imn.read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read for a guest
CREATE OR REPLACE FUNCTION mark_guest_notifications_read(guest_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE itinerary_module_notifications imn
  SET read = TRUE, read_at = NOW()
  FROM guests g
  WHERE imn.guest_id = g.id 
    AND g.email = guest_email 
    AND imn.read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 