-- Create RLS policies for guest_module_answers table
-- Based on the actual table structure provided

-- Enable RLS (in case it's not already enabled)
ALTER TABLE guest_module_answers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow users to view their own answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow event organizers to view event answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow guests to view answers by email" ON guest_module_answers;

-- Policy 1: Allow guests to insert their own answers
-- This checks that the guest_id matches a guest with the authenticated user's email
CREATE POLICY "Guests can insert their own answers" ON guest_module_answers
    FOR INSERT WITH CHECK (
        guest_id IN (
            SELECT id FROM guests 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Policy 2: Allow guests to view their own answers
CREATE POLICY "Guests can view their own answers" ON guest_module_answers
    FOR SELECT USING (
        guest_id IN (
            SELECT id FROM guests 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Policy 3: Allow event organizers to view all answers for their events
CREATE POLICY "Event organizers can view event answers" ON guest_module_answers
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN teams t ON e.team_ids @> ARRAY[t.id]
            JOIN team_members tm ON t.id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE u.email = auth.jwt() ->> 'email'
        )
    );

-- Grant necessary permissions
GRANT ALL ON guest_module_answers TO authenticated; 