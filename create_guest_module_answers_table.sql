-- Create guest_module_answers table
CREATE TABLE IF NOT EXISTS guest_module_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guest_module_answers_guest_id ON guest_module_answers(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_module_answers_module_id ON guest_module_answers(module_id);
CREATE INDEX IF NOT EXISTS idx_guest_module_answers_event_id ON guest_module_answers(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_module_answers_timestamp ON guest_module_answers(timestamp);

-- Enable RLS
ALTER TABLE guest_module_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow guests to insert their own answers
CREATE POLICY "Guests can insert their own answers" ON guest_module_answers
    FOR INSERT WITH CHECK (
        guest_id IN (
            SELECT id FROM guests 
            WHERE id = guest_id 
            AND auth.uid()::text = guest_user_id
        )
    );

-- Allow guests to view their own answers
CREATE POLICY "Guests can view their own answers" ON guest_module_answers
    FOR SELECT USING (
        guest_id IN (
            SELECT id FROM guests 
            WHERE id = guest_id 
            AND auth.uid()::text = guest_user_id
        )
    );

-- Allow event organizers to view all answers for their events
CREATE POLICY "Event organizers can view answers for their events" ON guest_module_answers
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN teams t ON e.team_id = t.id
            JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON guest_module_answers TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 