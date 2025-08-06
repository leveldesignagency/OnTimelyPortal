-- Clean up duplicate reactions before adding new constraint
-- Keep only the most recent reaction for each user per message

-- First, let's see what duplicates exist
SELECT 
    message_id, 
    user_email, 
    COUNT(*) as reaction_count,
    array_agg(emoji ORDER BY created_at DESC) as emojis,
    array_agg(created_at ORDER BY created_at DESC) as timestamps
FROM guests_chat_reactions 
GROUP BY message_id, user_email 
HAVING COUNT(*) > 1
ORDER BY reaction_count DESC;

-- Delete duplicate reactions, keeping only the most recent one for each user per message
WITH ranked_reactions AS (
    SELECT 
        id,
        message_id,
        user_email,
        emoji,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY message_id, user_email 
            ORDER BY created_at DESC
        ) as rn
    FROM guests_chat_reactions
)
DELETE FROM guests_chat_reactions 
WHERE id IN (
    SELECT id 
    FROM ranked_reactions 
    WHERE rn > 1
);

-- Verify cleanup worked
SELECT 
    message_id, 
    user_email, 
    COUNT(*) as reaction_count
FROM guests_chat_reactions 
GROUP BY message_id, user_email 
HAVING COUNT(*) > 1;

-- Now add the constraint
ALTER TABLE guests_chat_reactions 
DROP CONSTRAINT IF EXISTS guests_chat_reactions_message_id_user_email_emoji_key;

ALTER TABLE guests_chat_reactions 
ADD CONSTRAINT guests_chat_reactions_message_id_user_email_key 
UNIQUE (message_id, user_email);

-- Final verification
SELECT 'Constraint added successfully - only one reaction per user per message allowed' as status;