-- DROP TEAM_EVENTS TABLE (if you want to remove it)
-- Uncomment the line below to drop the team_events table:
-- DROP TABLE IF EXISTS team_events CASCADE;

-- Add time_zone field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64);
-- Example: 'Europe/London', 'America/New_York', etc.
 
-- All itinerary items for an event should be interpreted in the event's time zone.
-- (Backend logic will use this field for all date/time calculations.) 

-- SAFE TEAM-EVENTS TABLE (links teams to events)
-- This version has minimal RLS to avoid auth issues
CREATE TABLE IF NOT EXISTS team_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id),
  access_level text DEFAULT 'full' CHECK (access_level IN ('full', 'read_only', 'limited')),
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS but with SAFE policies
ALTER TABLE team_events ENABLE ROW LEVEL SECURITY;

-- SAFE Policy: Allow authenticated users to see team_events (we'll restrict later)
CREATE POLICY "authenticated_users_can_access_team_events" ON team_events
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_team_events_team_id ON team_events(team_id);
CREATE INDEX IF NOT EXISTS idx_team_events_event_id ON team_events(event_id); 