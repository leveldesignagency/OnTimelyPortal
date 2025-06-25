-- Simple guests table - no foreign keys, just the data we need
CREATE TABLE guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT,
  company_id TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  country_code TEXT NOT NULL,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  id_country TEXT,
  dob DATE,
  gender TEXT,
  group_id TEXT,
  group_name TEXT,
  next_of_kin_name TEXT,
  next_of_kin_email TEXT,
  next_of_kin_phone_country TEXT,
  next_of_kin_phone TEXT,
  dietary JSONB DEFAULT '[]',
  medical JSONB DEFAULT '[]',
  modules JSONB DEFAULT '{}',
  module_values JSONB DEFAULT '{}',
  prefix TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Basic indexes
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_guests_email ON guests(email);

-- Enable RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON guests FOR ALL USING (true);

-- Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE guests;

-- Trigger
CREATE TRIGGER update_guests_updated_at 
    BEFORE UPDATE ON guests
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 
 
 
 
 
 
 