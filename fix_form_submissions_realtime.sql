-- Fix real-time subscriptions for form_submissions table
-- Run this in Supabase SQL Editor

-- 1. Check if form_submissions is already in the realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'form_submissions';

-- 2. Add form_submissions to the realtime publication if it's not already there
ALTER PUBLICATION supabase_realtime ADD TABLE form_submissions;

-- 3. Verify it was added
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'form_submissions';

-- 4. Also check if the table has the correct structure for real-time
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'form_submissions' 
ORDER BY ordinal_position;

-- 5. Check RLS policies are correct
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'form_submissions'; 