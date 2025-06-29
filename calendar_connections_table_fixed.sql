-- Create calendar_connections table with corrected RLS policy handling
-- This script handles the case where the policy might already exist

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'outlook')),
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_user_id)
);

-- Enable RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can only access their own calendar connections" ON calendar_connections;

-- Create the RLS policy
CREATE POLICY "Users can only access their own calendar connections" 
ON calendar_connections 
FOR ALL 
USING (auth.uid() = user_id);

-- Create calendar_events_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
  external_event_id VARCHAR(255) NOT NULL,
  title TEXT,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE,
  end_datetime TIMESTAMP WITH TIME ZONE,
  location TEXT,
  attendees JSONB,
  status VARCHAR(50),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, external_event_id)
);

-- Enable RLS for calendar_events_cache
ALTER TABLE calendar_events_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can only access their own cached events" ON calendar_events_cache;

-- Create RLS policy for calendar_events_cache
CREATE POLICY "Users can only access their own cached events" 
ON calendar_events_cache 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM calendar_connections 
    WHERE calendar_connections.id = calendar_events_cache.connection_id 
    AND calendar_connections.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_connection_id ON calendar_events_cache(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_start_datetime ON calendar_events_cache(start_datetime);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_calendar_connections_updated_at ON calendar_connections;
CREATE TRIGGER update_calendar_connections_updated_at 
    BEFORE UPDATE ON calendar_connections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_cache_updated_at ON calendar_events_cache;
CREATE TRIGGER update_calendar_events_cache_updated_at 
    BEFORE UPDATE ON calendar_events_cache 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 