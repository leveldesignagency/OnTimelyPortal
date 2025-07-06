-- Add time_zone field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64);
-- Example: 'Europe/London', 'America/New_York', etc.

-- All itinerary items for an event should be interpreted in the event's time zone.
-- (Backend logic will use this field for all date/time calculations.) 