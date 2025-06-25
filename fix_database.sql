-- ============================================
-- FIX DATABASE ISSUES
-- ============================================

-- 1. Create the missing trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Check if users exist and create them if they don't
DO $$
BEGIN
    -- Insert test company if it doesn't exist
    INSERT INTO companies (id, name, subscription_plan, max_users) 
    VALUES ('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10)
    ON CONFLICT (id) DO NOTHING;

    -- Insert admin user if it doesn't exist
    INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) 
    VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', '$2b$10$dummy_hash_1', 'Admin User', 'masterAdmin', 'AU', 'online')
    ON CONFLICT (id) DO NOTHING;

    -- Insert regular user if it doesn't exist
    INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) 
    VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', '$2b$10$dummy_hash_2', 'Regular User', 'user', 'RU', 'online')
    ON CONFLICT (id) DO NOTHING;

    -- Create a direct chat between the 2 users if it doesn't exist
    INSERT INTO chats (id, company_id, name, type, created_by) 
    VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Admin User & Regular User', 'direct', '22222222-2222-2222-2222-222222222222')
    ON CONFLICT (id) DO NOTHING;

    -- Add both users to the chat if they're not already there
    INSERT INTO chat_participants (chat_id, user_id) 
    VALUES ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222')
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    INSERT INTO chat_participants (chat_id, user_id) 
    VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333')
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Add some test messages if the chat is empty
    INSERT INTO messages (chat_id, sender_id, content, message_type) 
    SELECT '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Hello! This is a test message from Admin.', 'text'
    WHERE NOT EXISTS (SELECT 1 FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444');

    INSERT INTO messages (chat_id, sender_id, content, message_type) 
    SELECT '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Hi Admin! This is Regular User responding.', 'text'
    WHERE NOT EXISTS (SELECT 1 FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444' AND sender_id = '33333333-3333-3333-3333-333333333333');

    INSERT INTO messages (chat_id, sender_id, content, message_type) 
    SELECT '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Great! The real-time chat is working perfectly! 🎉', 'text'
    WHERE (SELECT COUNT(*) FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444') < 3;
END $$;

-- 3. Verify the data was created correctly
SELECT 'Companies:' as table_name, count(*) as count FROM companies
UNION ALL
SELECT 'Users:', count(*) FROM users
UNION ALL  
SELECT 'Chats:', count(*) FROM chats
UNION ALL
SELECT 'Chat Participants:', count(*) FROM chat_participants
UNION ALL
SELECT 'Messages:', count(*) FROM messages;

-- 4. Show the actual user data
SELECT 'User Details:' as info, email, name, role, company_id FROM users; 
 
 
-- FIX DATABASE ISSUES
-- ============================================

-- 1. Create the missing trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Check if users exist and create them if they don't
DO $$
BEGIN
    -- Insert test company if it doesn't exist
    INSERT INTO companies (id, name, subscription_plan, max_users) 
    VALUES ('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10)
    ON CONFLICT (id) DO NOTHING;

    -- Insert admin user if it doesn't exist
    INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) 
    VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', '$2b$10$dummy_hash_1', 'Admin User', 'masterAdmin', 'AU', 'online')
    ON CONFLICT (id) DO NOTHING;

    -- Insert regular user if it doesn't exist
    INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) 
    VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', '$2b$10$dummy_hash_2', 'Regular User', 'user', 'RU', 'online')
    ON CONFLICT (id) DO NOTHING;

    -- Create a direct chat between the 2 users if it doesn't exist
    INSERT INTO chats (id, company_id, name, type, created_by) 
    VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Admin User & Regular User', 'direct', '22222222-2222-2222-2222-222222222222')
    ON CONFLICT (id) DO NOTHING;

    -- Add both users to the chat if they're not already there
    INSERT INTO chat_participants (chat_id, user_id) 
    VALUES ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222')
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    INSERT INTO chat_participants (chat_id, user_id) 
    VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333')
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Add some test messages if the chat is empty
    INSERT INTO messages (chat_id, sender_id, content, message_type) 
    SELECT '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Hello! This is a test message from Admin.', 'text'
    WHERE NOT EXISTS (SELECT 1 FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444');

    INSERT INTO messages (chat_id, sender_id, content, message_type) 
    SELECT '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Hi Admin! This is Regular User responding.', 'text'
    WHERE NOT EXISTS (SELECT 1 FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444' AND sender_id = '33333333-3333-3333-3333-333333333333');

    INSERT INTO messages (chat_id, sender_id, content, message_type) 
    SELECT '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Great! The real-time chat is working perfectly! 🎉', 'text'
    WHERE (SELECT COUNT(*) FROM messages WHERE chat_id = '44444444-4444-4444-4444-444444444444') < 3;
END $$;

-- 3. Verify the data was created correctly
SELECT 'Companies:' as table_name, count(*) as count FROM companies
UNION ALL
SELECT 'Users:', count(*) FROM users
UNION ALL  
SELECT 'Chats:', count(*) FROM chats
UNION ALL
SELECT 'Chat Participants:', count(*) FROM chat_participants
UNION ALL
SELECT 'Messages:', count(*) FROM messages;

-- 4. Show the actual user data
SELECT 'User Details:' as info, email, name, role, company_id FROM users; 
 
 