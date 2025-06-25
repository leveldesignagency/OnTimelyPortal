-- Timely Database Setup Script
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (if not exists)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  max_users INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('masterAdmin', 'user')),
  avatar VARCHAR(500),
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  password_hash TEXT
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar VARCHAR(500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure team names are unique within a company
  UNIQUE(company_id, name)
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only be in a team once
  UNIQUE(team_id, user_id)
);

-- Team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invitation_token UUID DEFAULT uuid_generate_v4(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique invitations per team/email combination
  UNIQUE(team_id, email)
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'team')),
  avatar VARCHAR(500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  
  -- Ensure a user can only be in a chat once
  UNIQUE(chat_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'audio', 'location')),
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only react with the same emoji once per message
  UNIQUE(message_id, user_id, emoji)
);

-- Insert test company if not exists
INSERT INTO companies (id, name, subscription_plan, max_users) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Company', 'premium', 50)
ON CONFLICT (id) DO NOTHING;

-- Insert test users with clean avatar initials instead of URLs
INSERT INTO users (id, company_id, email, name, role, avatar, status, password_hash) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online', '$2b$10$K7L/8Y.f89xSgf.L8fIU.OUhdxTcOjbqYYtUdRTG/Jo2Ov2aS.Ch2'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', 'Regular User', 'user', 'RU', 'online', '$2b$10$K7L/8Y.f89xSgf.L8fIU.OUhdxTcOjbqYYtUdRTG/Jo2Ov2aS.Ch2'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'alice@testcompany.com', 'Alice Johnson', 'user', 'AJ', 'online', '$2b$10$K7L/8Y.f89xSgf.L8fIU.OUhdxTcOjbqYYtUdRTG/Jo2Ov2aS.Ch2'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'bob@testcompany.com', 'Bob Smith', 'user', 'BS', 'online', '$2b$10$K7L/8Y.f89xSgf.L8fIU.OUhdxTcOjbqYYtUdRTG/Jo2Ov2aS.Ch2')
ON CONFLICT (email) DO NOTHING;

-- Insert test teams with clean avatars
INSERT INTO teams (id, company_id, name, description, avatar, created_by, is_archived) VALUES
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Project Alpha Team', 'Development team for Project Alpha', 'PA', '22222222-2222-2222-2222-222222222222', false),
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Marketing Team', 'Marketing and outreach team', 'MT', '22222222-2222-2222-2222-222222222222', false)
ON CONFLICT (id) DO NOTHING;

-- Add team members
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'member'),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'member')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Insert test chats
INSERT INTO chats (id, company_id, name, type, created_by, team_id, is_archived) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Admin & Regular User', 'direct', '22222222-2222-2222-2222-222222222222', null, false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Project Alpha Team', 'team', '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', false)
ON CONFLICT (id) DO NOTHING;

-- Add chat participants
INSERT INTO chat_participants (chat_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'member')
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- Insert test messages
INSERT INTO messages (id, chat_id, sender_id, content, message_type, created_at) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Hello! Welcome to the team chat system.', 'text', NOW() - INTERVAL '2 hours'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Thanks! This looks great.', 'text', NOW() - INTERVAL '1 hour'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Project Alpha team chat is now active!', 'text', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_company_id ON chats(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - you can customize these)
-- Allow users to see their own company data only

-- Companies policy
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (true); -- For now, allow all - customize as needed

-- Users policy
CREATE POLICY "Users can view company users" ON users
  FOR SELECT USING (true); -- For now, allow all - customize as needed

-- Teams policies
CREATE POLICY "Users can view company teams" ON teams
  FOR SELECT USING (true);
CREATE POLICY "Users can create teams in their company" ON teams
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their company teams" ON teams
  FOR UPDATE USING (true);

-- Team members policies
CREATE POLICY "Users can view team members" ON team_members
  FOR SELECT USING (true);
CREATE POLICY "Users can add team members" ON team_members
  FOR INSERT WITH CHECK (true);

-- Chat policies
CREATE POLICY "Users can view company chats" ON chats
  FOR SELECT USING (true);
CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (true);

-- Chat participants policies
CREATE POLICY "Users can view chat participants" ON chat_participants
  FOR SELECT USING (true);
CREATE POLICY "Users can add chat participants" ON chat_participants
  FOR INSERT WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Message reactions policies
CREATE POLICY "Users can view reactions" ON message_reactions
  FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (true);

-- Drop existing itineraries table if it exists
DROP TABLE IF EXISTS public.itineraries CASCADE;

-- Create the new itineraries table with comprehensive structure
CREATE TABLE public.itineraries (
    -- Primary fields
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic itinerary fields
    title TEXT NOT NULL,
    description TEXT,
    arrival_time TEXT,
    start_time TEXT,
    end_time TEXT,
    location TEXT,
    is_draft BOOLEAN DEFAULT false,
    
    -- Document Upload Module
    document_file_name TEXT,
    
    -- QR Code Module
    qrcode_url TEXT,
    qrcode_image TEXT,
    
    -- Host Contact Details Module
    contact_name TEXT,
    contact_country_code TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    
    -- Notifications Timer Module
    notification_times TEXT[],
    
    -- Legacy content field for backward compatibility
    content JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_itineraries_event_id ON public.itineraries(event_id);
CREATE INDEX idx_itineraries_company_id ON public.itineraries(company_id);
CREATE INDEX idx_itineraries_created_by ON public.itineraries(created_by);
CREATE INDEX idx_itineraries_is_draft ON public.itineraries(is_draft);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_itineraries_updated_at
    BEFORE UPDATE ON public.itineraries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Disable Row Level Security for now (since we're using custom auth, not Supabase Auth)
-- We'll implement company isolation at the application level
ALTER TABLE public.itineraries DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.itineraries TO authenticated;
GRANT ALL ON public.itineraries TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.itineraries_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.itineraries_id_seq TO service_role;

-- Success message
SELECT 'Database setup completed successfully! All tables created with test data.' as result; 