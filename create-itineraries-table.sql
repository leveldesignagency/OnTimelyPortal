-- ============================================
-- CREATE ITINERARIES TABLE FOR TIMELY APP
-- Run this in Supabase SQL Editor
-- This adds itinerary data sharing capabilities
-- ============================================

-- Create itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  items JSONB DEFAULT '[]' NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_itineraries_event_id ON itineraries(event_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_company_id ON itineraries(company_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);

-- Enable Row Level Security
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- Create policy (allow all for now - you can restrict later)
CREATE POLICY "Allow all operations on itineraries" ON itineraries FOR ALL USING (true);

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE itineraries;

-- Create trigger for updated_at
CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON itineraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'Itineraries table created successfully' as status;
SELECT count(*) as itinerary_count FROM itineraries; 
 
 
 
 
 
 