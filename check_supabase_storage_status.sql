-- ===========================================
-- COMPREHENSIVE SUPABASE STORAGE & DATABASE CHECK
-- ===========================================

-- 1. CHECK STORAGE BUCKET CONFIGURATION
-- ===========================================
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE name = 'chat-attachments';

-- 2. CHECK STORAGE OBJECTS (FILES) IN BUCKET
-- ===========================================
SELECT 
    id,
    name,
    bucket_id,
    owner,
    metadata,
    created_at,
    updated_at,
    last_accessed_at,
    -- Get file size from metadata
    (metadata->>'size')::bigint as file_size_bytes,
    -- Get content type from metadata
    metadata->>'mimetype' as content_type
FROM storage.objects 
WHERE bucket_id = 'chat-attachments'
ORDER BY created_at DESC
LIMIT 10;

-- 3. CHECK STORAGE POLICIES FOR BUCKET
-- ===========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- 4. CHECK STORAGE POLICIES FOR BUCKETS TABLE
-- ===========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'buckets' 
AND schemaname = 'storage';

-- 5. CHECK GUESTS_CHAT_ATTACHMENTS TABLE STRUCTURE
-- ===========================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_attachments'
ORDER BY ordinal_position;

-- 6. CHECK GUESTS_CHAT_ATTACHMENTS DATA
-- ===========================================
SELECT 
    id,
    message_id,
    file_url,
    filename,
    file_type,
    file_size,
    created_at
FROM guests_chat_attachments
ORDER BY created_at DESC
LIMIT 10;

-- 7. CHECK GUESTS_CHAT_MESSAGES WITH ATTACHMENTS
-- ===========================================
SELECT 
    message_id,
    sender_email,
    message_text,
    message_type,
    created_at,
    -- Check if there's an attachment record
    (SELECT COUNT(*) FROM guests_chat_attachments WHERE message_id = gcm.message_id) as attachment_count
FROM guests_chat_messages gcm
WHERE message_type = 'file'
ORDER BY created_at DESC
LIMIT 10;

-- 8. CHECK RPC FUNCTIONS
-- ===========================================
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('add_message_attachment', 'get_message_attachments')
AND routine_schema = 'public';

-- 9. CHECK STORAGE BUCKET PUBLIC URL ACCESS
-- ===========================================
-- This will show the public URL pattern for files
SELECT 
    'https://ijsktwmevnqgzwwuggkf.supabase.co/storage/v1/object/public/chat-attachments/' || name as public_url_example,
    name as filename
FROM storage.objects 
WHERE bucket_id = 'chat-attachments'
ORDER BY created_at DESC
LIMIT 5;

-- 10. CHECK STORAGE OBJECT METADATA DETAILS
-- ===========================================
SELECT 
    name,
    metadata,
    -- Extract specific metadata fields
    metadata->>'size' as size_bytes,
    metadata->>'mimetype' as mime_type,
    metadata->>'cacheControl' as cache_control,
    metadata->>'lastModified' as last_modified,
    metadata->>'etag' as etag,
    -- Check metadata size
    length(metadata::text) as metadata_size
FROM storage.objects 
WHERE bucket_id = 'chat-attachments'
ORDER BY created_at DESC
LIMIT 5;

-- 11. CHECK STORAGE BUCKET SIZE AND COUNT
-- ===========================================
SELECT 
    'chat-attachments' as bucket_name,
    COUNT(*) as total_files,
    SUM((metadata->>'size')::bigint) as total_size_bytes,
    AVG((metadata->>'size')::bigint) as avg_file_size_bytes
FROM storage.objects 
WHERE bucket_id = 'chat-attachments';

-- 12. CHECK FOR EMPTY OR CORRUPTED FILES
-- ===========================================
SELECT 
    name,
    (metadata->>'size')::bigint as file_size,
    CASE 
        WHEN (metadata->>'size')::bigint = 0 THEN 'EMPTY_FILE'
        WHEN (metadata->>'size')::bigint < 100 THEN 'SUSPICIOUSLY_SMALL'
        ELSE 'NORMAL_SIZE'
    END as file_status
FROM storage.objects 
WHERE bucket_id = 'chat-attachments'
AND ((metadata->>'size')::bigint = 0 OR (metadata->>'size')::bigint < 100)
ORDER BY created_at DESC; 