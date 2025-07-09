-- Update storage bucket file size limits for better user experience
-- This script increases the file size limits for both guest and itinerary buckets

-- Update guest-files bucket to 30MB (as user requested)
UPDATE storage.buckets 
SET file_size_limit = 31457280 -- 30MB in bytes (30 * 1024 * 1024)
WHERE id = 'guest-files';

-- Update itinerary-documents bucket to 30MB (from 2MB)
UPDATE storage.buckets 
SET file_size_limit = 31457280 -- 30MB in bytes
WHERE id = 'itinerary-documents';

-- Update itinerary-qrcodes bucket to 10MB (from 2MB) - QR codes don't need as much space
UPDATE storage.buckets 
SET file_size_limit = 10485760 -- 10MB in bytes (10 * 1024 * 1024)
WHERE id = 'itinerary-qrcodes';

-- Optional: Update allowed MIME types for guest-files bucket to include more formats
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
]
WHERE id = 'guest-files';

-- Optional: Update allowed MIME types for itinerary-documents bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
]
WHERE id = 'itinerary-documents';

-- Verify the changes
SELECT 
    id,
    name,
    file_size_limit,
    file_size_limit / 1024 / 1024 as size_mb,
    allowed_mime_types
FROM storage.buckets 
WHERE id IN ('guest-files', 'itinerary-documents', 'itinerary-qrcodes')
ORDER BY id;

-- Success message
SELECT 'Storage bucket limits updated successfully!' as result;

-- File size reference:
-- 1MB = 1,048,576 bytes
-- 2MB = 2,097,152 bytes  
-- 10MB = 10,485,760 bytes
-- 30MB = 31,457,280 bytes
-- 50MB = 52,428,800 bytes 