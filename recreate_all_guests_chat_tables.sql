-- Completely recreate all guests chat tables with correct structure
-- This will drop and recreate everything to ensure consistency

-- Drop all existing tables (in reverse dependency order)
DROP TABLE IF EXISTS guests_chat_notifications CASCADE;
DROP TABLE IF EXISTS guests_chat_receipts CASCADE;
DROP TABLE IF EXISTS guests_chat_messages CASCADE;
DROP TABLE IF EXISTS guests_chat_participants CASCADE;

-- Create guests_chat_participants table
CREATE TABLE guests_chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_type TEXT NOT NULL DEFAULT 'guest' CHECK (user_type IN ('admin', 'guest')),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT guests_chat_participants_user_or_guest_check 
    CHECK ((user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL)),
  CONSTRAINT guests_chat_participants_unique_user UNIQUE (event_id, user_id),
  CONSTRAINT guests_chat_participants_unique_guest UNIQUE (event_id, guest_id)
);

-- Create guests_chat_messages table
CREATE TABLE guests_chat_messages (
  message_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'guest')),
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url TEXT,
  attachment_filename TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guests_chat_receipts table
CREATE TABLE guests_chat_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES guests_chat_messages(message_id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('admin', 'guest')),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique receipts per message/participant
  UNIQUE (message_id, participant_email)
);

-- Create guests_chat_notifications table
CREATE TABLE guests_chat_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  message_id UUID REFERENCES guests_chat_messages(message_id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'guest')),
  sender_email TEXT NOT NULL,
  message_preview TEXT,
  notification_type TEXT DEFAULT 'guest_chat_message',
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_guests_chat_participants_event_id ON guests_chat_participants(event_id);
CREATE INDEX idx_guests_chat_participants_user_email ON guests_chat_participants(user_email);
CREATE INDEX idx_guests_chat_participants_company_id ON guests_chat_participants(company_id);

CREATE INDEX idx_guests_chat_messages_event_id ON guests_chat_messages(event_id);
CREATE INDEX idx_guests_chat_messages_sender_email ON guests_chat_messages(sender_email);
CREATE INDEX idx_guests_chat_messages_created_at ON guests_chat_messages(created_at);
CREATE INDEX idx_guests_chat_messages_company_id ON guests_chat_messages(company_id);

CREATE INDEX idx_guests_chat_receipts_message_id ON guests_chat_receipts(message_id);
CREATE INDEX idx_guests_chat_receipts_participant_email ON guests_chat_receipts(participant_email);
CREATE INDEX idx_guests_chat_receipts_event_id ON guests_chat_receipts(event_id);

CREATE INDEX idx_guests_chat_notifications_event_id ON guests_chat_notifications(event_id);
CREATE INDEX idx_guests_chat_notifications_recipient_email ON guests_chat_notifications(recipient_email);
CREATE INDEX idx_guests_chat_notifications_is_read ON guests_chat_notifications(is_read);
CREATE INDEX idx_guests_chat_notifications_company_id ON guests_chat_notifications(company_id);

-- Enable RLS
ALTER TABLE guests_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for now)
CREATE POLICY "Allow authenticated users access to guest chat participants" 
  ON guests_chat_participants FOR ALL 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users access to guest chat messages" 
  ON guests_chat_messages FOR ALL 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users access to guest chat receipts" 
  ON guests_chat_receipts FOR ALL 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users access to guest chat notifications" 
  ON guests_chat_notifications FOR ALL 
  USING (auth.role() = 'authenticated');

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_notifications;

-- Create triggers for updated_at
CREATE TRIGGER update_guests_chat_participants_updated_at 
  BEFORE UPDATE ON guests_chat_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_chat_messages_updated_at 
  BEFORE UPDATE ON guests_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_chat_notifications_updated_at 
  BEFORE UPDATE ON guests_chat_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'All guests chat tables recreated successfully' AS status; 
 
 
 