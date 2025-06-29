-- ============================================
-- CALENDAR CONNECTIONS TABLE
-- Store user calendar integrations (Google & Outlook)
-- ============================================

-- Create calendar_connections table
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'outlook')),
  provider_user_id VARCHAR(255), -- External user ID from the provider
  provider_email VARCHAR(255), -- Email from the provider
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Array of granted scopes
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Store any sync errors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one connection per user per provider
  UNIQUE(user_id, provider)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_active ON calendar_connections(is_active);

-- Enable Row Level Security
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own calendar connections
CREATE POLICY "Users can only access their own calendar connections" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_connections;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_connections_updated_at 
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CALENDAR EVENTS CACHE TABLE
-- Cache external calendar events for performance
-- ============================================

-- Create calendar_events_cache table
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE NOT NULL,
  external_event_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location VARCHAR(500),
  attendees JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'confirmed',
  html_link VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique events per connection
  UNIQUE(connection_id, external_event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_connection_id ON calendar_events_cache(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_start_datetime ON calendar_events_cache(start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_end_datetime ON calendar_events_cache(end_datetime);

-- Enable Row Level Security
ALTER TABLE calendar_events_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access cached events from their own connections
CREATE POLICY "Users can only access their own cached calendar events" ON calendar_events_cache
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events_cache;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_cache_updated_at 
  BEFORE UPDATE ON calendar_events_cache
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's active calendar connections
CREATE OR REPLACE FUNCTION get_user_calendar_connections(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  provider VARCHAR(20),
  provider_email VARCHAR(255),
  is_active BOOLEAN,
  last_sync_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.provider,
    cc.provider_email,
    cc.is_active,
    cc.last_sync_at
  FROM calendar_connections cc
  WHERE cc.user_id = user_uuid AND cc.is_active = TRUE
  ORDER BY cc.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_calendar_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE calendar_connections 
  SET is_active = FALSE, 
      sync_error = 'Token expired and cleanup performed'
  WHERE token_expires_at < NOW() 
    AND is_active = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- CALENDAR CONNECTIONS TABLE
-- Store user calendar integrations (Google & Outlook)
-- ============================================

-- Create calendar_connections table
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'outlook')),
  provider_user_id VARCHAR(255), -- External user ID from the provider
  provider_email VARCHAR(255), -- Email from the provider
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Array of granted scopes
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Store any sync errors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one connection per user per provider
  UNIQUE(user_id, provider)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_active ON calendar_connections(is_active);

-- Enable Row Level Security
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own calendar connections
CREATE POLICY "Users can only access their own calendar connections" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_connections;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_connections_updated_at 
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CALENDAR EVENTS CACHE TABLE
-- Cache external calendar events for performance
-- ============================================

-- Create calendar_events_cache table
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE NOT NULL,
  external_event_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location VARCHAR(500),
  attendees JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'confirmed',
  html_link VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique events per connection
  UNIQUE(connection_id, external_event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_connection_id ON calendar_events_cache(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_start_datetime ON calendar_events_cache(start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_end_datetime ON calendar_events_cache(end_datetime);

-- Enable Row Level Security
ALTER TABLE calendar_events_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access cached events from their own connections
CREATE POLICY "Users can only access their own cached calendar events" ON calendar_events_cache
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events_cache;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_cache_updated_at 
  BEFORE UPDATE ON calendar_events_cache
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's active calendar connections
CREATE OR REPLACE FUNCTION get_user_calendar_connections(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  provider VARCHAR(20),
  provider_email VARCHAR(255),
  is_active BOOLEAN,
  last_sync_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.provider,
    cc.provider_email,
    cc.is_active,
    cc.last_sync_at
  FROM calendar_connections cc
  WHERE cc.user_id = user_uuid AND cc.is_active = TRUE
  ORDER BY cc.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_calendar_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE calendar_connections 
  SET is_active = FALSE, 
      sync_error = 'Token expired and cleanup performed'
  WHERE token_expires_at < NOW() 
    AND is_active = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
 
-- CALENDAR CONNECTIONS TABLE
-- Store user calendar integrations (Google & Outlook)
-- ============================================

-- Create calendar_connections table
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'outlook')),
  provider_user_id VARCHAR(255), -- External user ID from the provider
  provider_email VARCHAR(255), -- Email from the provider
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Array of granted scopes
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Store any sync errors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one connection per user per provider
  UNIQUE(user_id, provider)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_active ON calendar_connections(is_active);

-- Enable Row Level Security
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own calendar connections
CREATE POLICY "Users can only access their own calendar connections" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_connections;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_connections_updated_at 
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CALENDAR EVENTS CACHE TABLE
-- Cache external calendar events for performance
-- ============================================

-- Create calendar_events_cache table
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE NOT NULL,
  external_event_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location VARCHAR(500),
  attendees JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'confirmed',
  html_link VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique events per connection
  UNIQUE(connection_id, external_event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_connection_id ON calendar_events_cache(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_start_datetime ON calendar_events_cache(start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_end_datetime ON calendar_events_cache(end_datetime);

-- Enable Row Level Security
ALTER TABLE calendar_events_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access cached events from their own connections
CREATE POLICY "Users can only access their own cached calendar events" ON calendar_events_cache
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events_cache;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_cache_updated_at 
  BEFORE UPDATE ON calendar_events_cache
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's active calendar connections
CREATE OR REPLACE FUNCTION get_user_calendar_connections(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  provider VARCHAR(20),
  provider_email VARCHAR(255),
  is_active BOOLEAN,
  last_sync_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.provider,
    cc.provider_email,
    cc.is_active,
    cc.last_sync_at
  FROM calendar_connections cc
  WHERE cc.user_id = user_uuid AND cc.is_active = TRUE
  ORDER BY cc.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_calendar_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE calendar_connections 
  SET is_active = FALSE, 
      sync_error = 'Token expired and cleanup performed'
  WHERE token_expires_at < NOW() 
    AND is_active = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- CALENDAR CONNECTIONS TABLE
-- Store user calendar integrations (Google & Outlook)
-- ============================================

-- Create calendar_connections table
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'outlook')),
  provider_user_id VARCHAR(255), -- External user ID from the provider
  provider_email VARCHAR(255), -- Email from the provider
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Array of granted scopes
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Store any sync errors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one connection per user per provider
  UNIQUE(user_id, provider)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_active ON calendar_connections(is_active);

-- Enable Row Level Security
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own calendar connections
CREATE POLICY "Users can only access their own calendar connections" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_connections;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_connections_updated_at 
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CALENDAR EVENTS CACHE TABLE
-- Cache external calendar events for performance
-- ============================================

-- Create calendar_events_cache table
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE NOT NULL,
  external_event_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location VARCHAR(500),
  attendees JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'confirmed',
  html_link VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique events per connection
  UNIQUE(connection_id, external_event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_connection_id ON calendar_events_cache(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_start_datetime ON calendar_events_cache(start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_end_datetime ON calendar_events_cache(end_datetime);

-- Enable Row Level Security
ALTER TABLE calendar_events_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access cached events from their own connections
CREATE POLICY "Users can only access their own cached calendar events" ON calendar_events_cache
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Add to real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events_cache;

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_cache_updated_at 
  BEFORE UPDATE ON calendar_events_cache
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's active calendar connections
CREATE OR REPLACE FUNCTION get_user_calendar_connections(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  provider VARCHAR(20),
  provider_email VARCHAR(255),
  is_active BOOLEAN,
  last_sync_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.provider,
    cc.provider_email,
    cc.is_active,
    cc.last_sync_at
  FROM calendar_connections cc
  WHERE cc.user_id = user_uuid AND cc.is_active = TRUE
  ORDER BY cc.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_calendar_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE calendar_connections 
  SET is_active = FALSE, 
      sync_error = 'Token expired and cleanup performed'
  WHERE token_expires_at < NOW() 
    AND is_active = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 