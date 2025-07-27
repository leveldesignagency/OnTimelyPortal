-- Safe enable realtime for users table to support profile update subscriptions

-- Check if users table is already in the publication, if not add it
DO $$
BEGIN
    -- Only add if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
        RAISE NOTICE 'Added users table to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'Users table already in supabase_realtime publication';
    END IF;
END $$;

-- Ensure RLS is properly configured for realtime
-- Users can only see other users in their company
-- Drop policy if it exists, then create it
DROP POLICY IF EXISTS "Users can view company users via realtime" ON users;

CREATE POLICY "Users can view company users via realtime" ON users
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    company_id = (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

RAISE NOTICE 'Real-time setup completed for users table'; 