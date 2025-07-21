-- Activity Log Table for Notifications and Audit Trail
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  event_id uuid,
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- e.g. 'event_created', 'guests_added', 'itinerary_updated', 'homepage_updated'
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_activity_log_company ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_event ON activity_log(event_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id); 