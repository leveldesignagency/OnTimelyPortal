-- Create user_push_tokens table
-- This table stores Expo push tokens for each user's devices

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User relationships
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  
  -- Device information
  expo_push_token TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_guest_id ON user_push_tokens(guest_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_device_id ON user_push_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_expo_token ON user_push_tokens(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON user_push_tokens(is_active);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own push tokens
CREATE POLICY "Users can view own push tokens" ON user_push_tokens
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own push tokens
CREATE POLICY "Users can insert own push tokens" ON user_push_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own push tokens
CREATE POLICY "Users can update own push tokens" ON user_push_tokens
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens" ON user_push_tokens
  FOR DELETE USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_push_tokens_updated_at();

-- Function to get all active push tokens for a guest
CREATE OR REPLACE FUNCTION get_guest_push_tokens(guest_email TEXT)
RETURNS TABLE(expo_push_token TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT upt.expo_push_token
  FROM user_push_tokens upt
  JOIN guests g ON upt.guest_id = g.id
  WHERE g.email = guest_email 
    AND upt.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 