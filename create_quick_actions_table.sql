-- Create quick_actions table
CREATE TABLE IF NOT EXISTS quick_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('navigate', 'function')),
  action_data JSONB NOT NULL, -- Stores navigation path, function data, etc.
  event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- For event-specific actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, event_id) -- Prevent duplicate actions for same user/event
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quick_actions_user_id ON quick_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_event_id ON quick_actions(event_id);

-- Enable RLS
ALTER TABLE quick_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own quick actions" ON quick_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick actions" ON quick_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick actions" ON quick_actions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick actions" ON quick_actions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get user's quick actions
CREATE OR REPLACE FUNCTION get_user_quick_actions(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  name TEXT,
  icon TEXT,
  action_type TEXT,
  action_data JSONB,
  event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.id,
    qa.name,
    qa.icon,
    qa.action_type,
    qa.action_data,
    qa.event_id,
    qa.created_at
  FROM quick_actions qa
  WHERE qa.user_id = user_uuid
  ORDER BY qa.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a quick action
CREATE OR REPLACE FUNCTION add_quick_action(
  action_name TEXT,
  action_icon TEXT,
  action_type TEXT,
  action_data JSONB,
  event_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_action_id UUID;
BEGIN
  INSERT INTO quick_actions (
    user_id,
    name,
    icon,
    action_type,
    action_data,
    event_id
  ) VALUES (
    auth.uid(),
    action_name,
    action_icon,
    action_type,
    action_data,
    event_uuid
  )
  ON CONFLICT (user_id, name, event_id) 
  DO UPDATE SET
    icon = EXCLUDED.icon,
    action_type = EXCLUDED.action_type,
    action_data = EXCLUDED.action_data,
    updated_at = NOW()
  RETURNING id INTO new_action_id;
  
  RETURN new_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a quick action
CREATE OR REPLACE FUNCTION remove_quick_action(action_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM quick_actions 
  WHERE id = action_uuid AND user_id = auth.uid();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear all quick actions for a user
CREATE OR REPLACE FUNCTION clear_user_quick_actions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM quick_actions WHERE user_id = auth.uid();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get quick actions for a specific event
CREATE OR REPLACE FUNCTION get_event_quick_actions(event_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  icon TEXT,
  action_type TEXT,
  action_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.id,
    qa.name,
    qa.icon,
    qa.action_type,
    qa.action_data,
    qa.created_at
  FROM quick_actions qa
  WHERE qa.user_id = auth.uid() AND qa.event_id = event_uuid
  ORDER BY qa.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 