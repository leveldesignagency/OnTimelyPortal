-- Simple check for sender name issues

-- Check what's currently stored in messages
SELECT 
    sender_type,
    sender_name,
    sender_email,
    COUNT(*) as message_count
FROM guests_chat_messages 
GROUP BY sender_type, sender_name, sender_email
ORDER BY sender_type, message_count DESC;

-- Check users table
SELECT 
    name,
    email,
    CASE 
        WHEN name = email THEN 'name is email'
        WHEN name IS NULL OR name = '' THEN 'name is empty'
        ELSE 'name is different from email'
    END as name_status
FROM users 
LIMIT 5; 