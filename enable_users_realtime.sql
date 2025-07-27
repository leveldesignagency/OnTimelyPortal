-- Enable realtime for users table to support profile update subscriptions

-- Enable realtime on the users table
ALTER PUBLICATION supabase_realtime ADD TABLE users;

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

-- Optional: Enable realtime for specific columns only (more efficient)
-- This would limit updates to only profile-related changes
-- ALTER PUBLICATION supabase_realtime ADD TABLE users (id, name, avatar_url, status, company_role, updated_at); 