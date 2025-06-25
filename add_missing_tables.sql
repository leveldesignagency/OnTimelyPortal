-- Additional Tables for Timely App - Supabase Migration
-- Run this in your Supabase SQL Editor after the main database_setup.sql

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table (if not exists)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests table (if not exists) 
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Personal Information
  prefix VARCHAR(10),
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  
  -- Identification
  id_type VARCHAR(50) NOT NULL,
  id_number VARCHAR(100) NOT NULL,
  id_country VARCHAR(100),
  
  -- Group Information
  group_id VARCHAR(255),
  group_name VARCHAR(255),
  
  -- Next of Kin
  next_of_kin_name VARCHAR(255),
  next_of_kin_email VARCHAR(255),
  next_of_kin_phone_country VARCHAR(10),
  next_of_kin_phone VARCHAR(50),
  next_of_kin JSONB DEFAULT '{}',
  
  -- Requirements
  dietary TEXT[],
  medical TEXT[],
  
  -- Modules and Status
  modules JSONB DEFAULT '{}',
  module_values JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_draft BOOLEAN DEFAULT false,
  content JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest drafts table (for temporary guest data before saving)
CREATE TABLE IF NOT EXISTS guest_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  draft_data JSONB NOT NULL,
  draft_name VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event modules table (for storing active modules per event)
CREATE TABLE IF NOT EXISTS event_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  modules JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one modules record per event
  UNIQUE(event_id)
);

-- Canvas sessions table (for storing canvas board data)
CREATE TABLE IF NOT EXISTS canvas_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  session_data JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one canvas session per event
  UNIQUE(event_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_company_id ON events(company_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_company_id ON guests(company_id);
CREATE INDEX IF NOT EXISTS idx_guests_group_id ON guests(group_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_itineraries_event_id ON itineraries(event_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_company_id ON itineraries(company_id);
CREATE INDEX IF NOT EXISTS idx_guest_drafts_event_id ON guest_drafts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_modules_event_id ON event_modules(event_id);
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_event_id ON canvas_sessions(event_id);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Events policies
CREATE POLICY "Users can view company events" ON events
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can create events in their company" ON events
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can update company events" ON events
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can delete company events" ON events
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Guests policies
CREATE POLICY "Users can view company guests" ON guests
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can create guests in their company" ON guests
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can update company guests" ON guests
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can delete company guests" ON guests
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Itineraries policies
CREATE POLICY "Users can view company itineraries" ON itineraries
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can create itineraries in their company" ON itineraries
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can update company itineraries" ON itineraries
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can delete company itineraries" ON itineraries
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Guest drafts policies
CREATE POLICY "Users can view company guest drafts" ON guest_drafts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can create guest drafts in their company" ON guest_drafts
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can update company guest drafts" ON guest_drafts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can delete company guest drafts" ON guest_drafts
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Event modules policies
CREATE POLICY "Users can view company event modules" ON event_modules
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can create event modules in their company" ON event_modules
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can update company event modules" ON event_modules
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can delete company event modules" ON event_modules
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Canvas sessions policies
CREATE POLICY "Users can view company canvas sessions" ON canvas_sessions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can create canvas sessions in their company" ON canvas_sessions
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can update company canvas sessions" ON canvas_sessions
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
CREATE POLICY "Users can delete company canvas sessions" ON canvas_sessions
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Insert test events and data
INSERT INTO events (id, company_id, name, description, from_date, to_date, status, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Annual Conference 2024', 'Company annual conference and networking event', '2024-06-15', '2024-06-17', 'active', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Product Launch', 'New product launch event', '2024-07-20', '2024-07-20', 'draft', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING; 
 