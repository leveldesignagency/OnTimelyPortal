-- Fixed version: Ensure direct chat setup between admin and regular user
-- Run this in Supabase SQL editor

-- First, let's make sure we have the company and users
INSERT INTO companies (id, name, subscription_plan, max_users) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', '$2b$10$dummy_hash_1', 'Admin User', 'masterAdmin', 'AU', 'online'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', '$2b$10$dummy_hash_2', 'Regular User', 'user', 'RU', 'online')
ON CONFLICT (id) DO NOTHING;

-- Create or update the direct chat
INSERT INTO chats (id, company_id, name, type, created_by, is_archived) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Admin User & Regular User', 'direct', '22222222-2222-2222-2222-222222222222', false)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  is_archived = false,
  updated_at = NOW();

-- Ensure both users are participants (with proper role column)
INSERT INTO chat_participants (chat_id, user_id, role) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'member'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'member')
ON CONFLICT (chat_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Delete any existing messages for this chat first to avoid conflicts
DELETE FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444';

-- Add test messages (let database generate IDs automatically)
INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Hello! This is a test message from Admin.', 'text'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Hi Admin! This is Regular User responding.', 'text'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Great! The real-time chat is working perfectly! 🎉', 'text');

-- Verify the setup
SELECT 'VERIFICATION' as step, 'Chat created' as status, id, name FROM chats WHERE id = '44444444-4444-4444-4444-444444444444';
SELECT 'VERIFICATION' as step, 'Participants added' as status, user_id, (SELECT name FROM users WHERE id = user_id) as user_name FROM chat_participants WHERE chat_id = '44444444-4444-4444-4444-444444444444';
SELECT 'VERIFICATION' as step, 'Messages added' as status, COUNT(*) as message_count FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444'; 