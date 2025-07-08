-- ============================================
-- FIX EVENTS RLS WITH PROPER COMPANY ISOLATION
-- Replace the broad "allow all authenticated" policy with secure company-based access
-- ============================================

-- First, drop the problematic broad policy
DROP POLICY IF EXISTS "Allow all authenticated" ON events;
DROP POLICY IF EXISTS "Allow all operations on events" ON events;

-- Enable RLS (if not already enabled)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create proper company-based policies for events
CREATE POLICY "Users can view company events" ON events
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create events in their company" ON events
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update company events" ON events
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company events" ON events
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Also fix the event_homepage_data table policies to use proper company isolation
DROP POLICY IF EXISTS "Users can insert their company's event homepage data" ON event_homepage_data;
DROP POLICY IF EXISTS "Users can update their company's event homepage data" ON event_homepage_data;
DROP POLICY IF EXISTS "Users can read their company's event homepage data" ON event_homepage_data;
DROP POLICY IF EXISTS "Users can delete their company's event homepage data" ON event_homepage_data;

-- Create proper company-based policies for event_homepage_data
CREATE POLICY "Users can read their company's event homepage data" ON event_homepage_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_homepage_data.event_id 
      AND e.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their company's event homepage data" ON event_homepage_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_homepage_data.event_id 
      AND e.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their company's event homepage data" ON event_homepage_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_homepage_data.event_id 
      AND e.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their company's event homepage data" ON event_homepage_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_homepage_data.event_id 
      AND e.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Verification query
SELECT 'Events RLS policies updated successfully' as status;
SELECT 'Users can now only access events from their own company' as security_note; 