-- PROPER MULTI-TENANT RLS POLICIES
-- This is the "Most Secure" option that enforces company isolation at the database level
-- NOTE: This requires setting up user context in your app

-- Step 1: Create a function to get current user's company_id from JWT or session
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID AS $$
BEGIN
  -- Option 1: Get from JWT claims (if you store company_id in JWT)
  -- RETURN (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;
  
  -- Option 2: Get from session variable (set by your app)
  RETURN current_setting('app.current_user_company_id', true)::uuid;
  
  -- Option 3: Lookup from users table using auth.uid() (if using Supabase Auth)
  -- RETURN (SELECT company_id FROM users WHERE auth_user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Allow all operations" ON chats;
DROP POLICY IF EXISTS "Allow all operations" ON chat_participants;

-- Step 3: Create proper multi-tenant policies
CREATE POLICY "Company users can access their chats" ON chats
  FOR ALL 
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Company users can access their chat participants" ON chat_participants
  FOR ALL 
  USING (
    chat_id IN (
      SELECT id FROM chats 
      WHERE company_id = get_current_user_company_id()
    )
  );

-- Step 4: Ensure RLS is enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Step 5: You would need to set the company_id in your app's login function:
-- In your auth.ts login function, add:
-- await supabase.rpc('set_config', {
--   setting_name: 'app.current_user_company_id',
--   setting_value: user.company_id
-- });

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('chats', 'chat_participants'); 