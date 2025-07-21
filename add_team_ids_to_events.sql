-- Add team_ids column to events table for assigned teams
ALTER TABLE events
ADD COLUMN IF NOT EXISTS team_ids uuid[];

-- (Optional) Add an index for faster lookups by team
CREATE INDEX IF NOT EXISTS idx_events_team_ids ON events USING GIN (team_ids); 