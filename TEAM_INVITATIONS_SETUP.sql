-- ============================================
-- TEAM INVITATIONS SETUP
-- ============================================

-- 1. TEAM_INVITATIONS TABLE (Email invitations for team membership)
CREATE TABLE team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'member', -- 'admin', 'member'
  status VARCHAR DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  invitation_token VARCHAR UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, email)
);

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see invitations for teams in their company
CREATE POLICY "Users can only see invitations for their company teams" ON team_invitations
  FOR ALL USING (
    team_id IN (
      SELECT t.id FROM teams t 
      WHERE t.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE team_invitations;

-- Add trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS FOR TEAM INVITATIONS
-- ============================================

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to create team invitation
CREATE OR REPLACE FUNCTION create_team_invitation(
  p_team_id UUID,
  p_invited_by UUID,
  p_email VARCHAR,
  p_role VARCHAR DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
  invitation_id UUID;
  invitation_token TEXT;
BEGIN
  -- Generate unique token
  invitation_token := generate_invitation_token();
  
  -- Insert invitation
  INSERT INTO team_invitations (team_id, invited_by, email, role, invitation_token)
  VALUES (p_team_id, p_invited_by, p_email, p_role, invitation_token)
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
  p_invitation_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record team_invitations%ROWTYPE;
  user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM users WHERE id = p_user_id;
  
  -- Get invitation
  SELECT * INTO invitation_record 
  FROM team_invitations 
  WHERE invitation_token = p_invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW()
    AND email = user_email;
  
  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Add user to team
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (invitation_record.team_id, p_user_id, invitation_record.role)
  ON CONFLICT (team_id, user_id) DO NOTHING;
  
  -- Update invitation status
  UPDATE team_invitations 
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending invitations for a user
CREATE OR REPLACE FUNCTION get_user_pending_invitations(p_email TEXT)
RETURNS TABLE (
  invitation_id UUID,
  team_id UUID,
  team_name TEXT,
  invited_by_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  invitation_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.team_id,
    t.name,
    u.name,
    ti.role,
    ti.created_at,
    ti.expires_at,
    ti.invitation_token
  FROM team_invitations ti
  JOIN teams t ON ti.team_id = t.id
  JOIN users u ON ti.invited_by = u.id
  WHERE ti.email = p_email 
    AND ti.status = 'pending' 
    AND ti.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE team_invitations 
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample company
INSERT INTO companies (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Test Company Inc.');

-- Insert sample users
INSERT INTO users (id, company_id, email, password_hash, name, role, avatar) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', 'hashed_password_here', 'Admin User', 'masterAdmin', 'AU'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', 'hashed_password_here', 'Regular User', 'user', 'RU');

-- Insert sample team
INSERT INTO teams (id, company_id, name, description, created_by, avatar) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Development Team', 'Main development team', '22222222-2222-2222-2222-222222222222', 'DT');

-- Add team members
INSERT INTO team_members (team_id, user_id, role) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'admin'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'member'); 