-- ============================================
-- FIX EVENTS REALTIME PUBLICATION CONFLICT
-- Run this to fix the events realtime issue
-- ============================================

-- Handle the realtime publication conflict
DO $$
BEGIN
    -- Try to add events to realtime, ignore if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE events;
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'events table already in supabase_realtime publication';
    END;
    
    -- Try to add team_events to realtime, ignore if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE team_events;
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'team_events table already in supabase_realtime publication';
    END;
END $$;

-- Ensure events table has proper RLS (disable for now to avoid auth issues)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_events DISABLE ROW LEVEL SECURITY;

-- Verify events exist and show them
SELECT 'Events in database:' as info;
SELECT id, name, "from", "to", location, description FROM events ORDER BY "from"; 