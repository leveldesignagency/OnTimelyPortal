-- ============================================
-- CREATE GUESTS TABLE FOR TIMELY APP
-- Run this in Supabase SQL Editor
-- This adds guest data sharing capabilities
-- ============================================

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID,
  company_id UUID,
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  id_type VARCHAR(50) NOT NULL,
  id_number VARCHAR(100) NOT NULL,
  id_country VARCHAR(100),
  dob DATE,
  gender VARCHAR(20),
  group_id VARCHAR(100),
  group_name VARCHAR(255),
  next_of_kin_name VARCHAR(255),
  next_of_kin_email VARCHAR(255),
  next_of_kin_phone_country VARCHAR(10),
  next_of_kin_phone VARCHAR(50),
  dietary JSONB DEFAULT '[]',
  medical JSONB DEFAULT '[]',
  modules JSONB DEFAULT '{}',
  module_values JSONB DEFAULT '{}',
  prefix VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_company_id ON guests(company_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_group_id ON guests(group_id);

-- Enable Row Level Security
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Create policy (allow all for now - you can restrict later)
CREATE POLICY "Allow all operations on guests" ON guests FOR ALL USING (true);

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE guests;

-- Create trigger for updated_at
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'Guests table created successfully' as status;
SELECT count(*) as guest_count FROM guests; 