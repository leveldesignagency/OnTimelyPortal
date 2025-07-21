-- (Optional) Add event_ids column to teams table for reverse lookup
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS event_ids uuid[];

-- (Optional) Add an index for faster lookups by event
CREATE INDEX IF NOT EXISTS idx_teams_event_ids ON teams USING GIN (event_ids); 