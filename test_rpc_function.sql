-- Test if the RPC function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'guest_upload_chat_attachment_complete'
AND routine_schema = 'public';

-- Test if we can call it with dummy data
SELECT * FROM guest_upload_chat_attachment_complete(
  '00000000-0000-0000-0000-000000000000'::UUID,
  'dGVzdA==', -- base64 for 'test'
  'text/plain',
  'test.txt',
  '00000000-0000-0000-0000-000000000000'::UUID
); 