-- ============================================
-- STAGE 1 TRAVEL COMPANION MODULE - DATABASE SCHEMA
-- This schema supports complete travel tracking from airport to hotel
-- with driver verification, GPS tracking, and checkpoint notifications
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GUEST TRAVEL PROFILES TABLE
-- Core travel information for each guest
-- ============================================
CREATE TABLE IF NOT EXISTS guest_travel_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL, -- References the guest from your existing system
  event_id UUID NOT NULL, -- References the event from your existing system
  
  -- Flight Information
  flight_number VARCHAR(20),
  flight_date DATE,
  flight_departure_time TIMESTAMP WITH TIME ZONE,
  flight_arrival_time TIMESTAMP WITH TIME ZONE,
  flight_status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, delayed, cancelled, landed
  departure_airport VARCHAR(100),
  arrival_airport VARCHAR(100),
  
  -- Hotel Information
  hotel_reservation_number VARCHAR(100),
  hotel_name VARCHAR(255),
  hotel_address TEXT,
  hotel_check_in_time TIMESTAMP WITH TIME ZONE,
  
  -- Driver Information
  driver_verification_code VARCHAR(100),
  driver_name VARCHAR(255),
  driver_phone VARCHAR(50),
  driver_license_plate VARCHAR(20),
  driver_verified BOOLEAN DEFAULT FALSE,
  driver_verification_time TIMESTAMP WITH TIME ZONE,
  
  -- Tracking Settings
  gps_tracking_enabled BOOLEAN DEFAULT TRUE,
  checkpoint_notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- Journey Status
  journey_status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_transit, at_security, met_driver, en_route_hotel, arrived_hotel
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  last_location_update TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOURNEY CHECKPOINTS TABLE
-- Predefined and custom checkpoints for the journey
-- ============================================
CREATE TABLE IF NOT EXISTS journey_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Checkpoint Information
  checkpoint_name VARCHAR(255) NOT NULL,
  checkpoint_type VARCHAR(50) NOT NULL, -- airport_arrival, security, baggage_claim, customs, meet_driver, en_route, hotel_arrival
  description TEXT,
  
  -- Location Information
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name VARCHAR(255),
  
  -- Timing
  expected_time TIMESTAMP WITH TIME ZONE,
  actual_time TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, approaching, completed, skipped
  completion_method VARCHAR(50), -- auto_detected, guest_confirmed, manual_override
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GUEST NOTIFICATIONS TABLE
-- Tracks all notifications sent to guests
-- ============================================
CREATE TABLE IF NOT EXISTS guest_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES journey_checkpoints(id) ON DELETE SET NULL,
  
  -- Notification Content
  notification_type VARCHAR(50) NOT NULL, -- checkpoint_prompt, status_update, driver_info, emergency_alert
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Delivery Information
  delivery_method VARCHAR(50) NOT NULL, -- push_notification, sms, email, in_app
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Response Information
  requires_response BOOLEAN DEFAULT FALSE,
  response_received BOOLEAN DEFAULT FALSE,
  response_data JSONB,
  response_time TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, read, responded, failed
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GPS TRACKING DATA TABLE
-- Stores GPS location history for guests
-- ============================================
CREATE TABLE IF NOT EXISTS gps_tracking_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Location Data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters INTEGER,
  altitude_meters INTEGER,
  speed_kmh DECIMAL(5, 2),
  heading_degrees INTEGER,
  
  -- Context
  location_source VARCHAR(50) DEFAULT 'gps', -- gps, network, passive
  battery_level INTEGER,
  is_moving BOOLEAN DEFAULT FALSE,
  
  -- Timing
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DRIVER VERIFICATION LOGS TABLE
-- Tracks all driver verification attempts
-- ============================================
CREATE TABLE IF NOT EXISTS driver_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Verification Details
  verification_method VARCHAR(50) NOT NULL, -- barcode_scan, qr_code, manual_code, photo_verification
  verification_code VARCHAR(100),
  verification_data JSONB, -- Store barcode/QR code data, photo URLs, etc.
  
  -- Result
  verification_successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  
  -- Location and Timing
  verification_lat DECIMAL(10, 8),
  verification_lng DECIMAL(11, 8),
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOURNEY ANALYTICS TABLE
-- Stores analytical data about journeys
-- ============================================
CREATE TABLE IF NOT EXISTS journey_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Journey Metrics
  total_journey_time_minutes INTEGER,
  airport_to_driver_time_minutes INTEGER,
  driver_to_hotel_time_minutes INTEGER,
  total_distance_km DECIMAL(8, 2),
  
  -- Checkpoint Metrics
  checkpoints_completed INTEGER DEFAULT 0,
  checkpoints_skipped INTEGER DEFAULT 0,
  average_checkpoint_delay_minutes INTEGER,
  
  -- Notification Metrics
  notifications_sent INTEGER DEFAULT 0,
  notifications_responded INTEGER DEFAULT 0,
  average_response_time_minutes INTEGER,
  
  -- GPS Metrics
  gps_data_points INTEGER DEFAULT 0,
  tracking_accuracy_average_meters INTEGER,
  
  -- Journey Quality Score (1-100)
  journey_quality_score INTEGER,
  
  -- Completion Status
  journey_completed BOOLEAN DEFAULT FALSE,
  completion_time TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_guest_id ON guest_travel_profiles(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_event_id ON guest_travel_profiles(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_journey_status ON guest_travel_profiles(journey_status);
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_flight_date ON guest_travel_profiles(flight_date);

CREATE INDEX IF NOT EXISTS idx_journey_checkpoints_travel_profile_id ON journey_checkpoints(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkpoints_type ON journey_checkpoints(checkpoint_type);
CREATE INDEX IF NOT EXISTS idx_journey_checkpoints_status ON journey_checkpoints(status);

CREATE INDEX IF NOT EXISTS idx_guest_notifications_travel_profile_id ON guest_notifications(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_type ON guest_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_status ON guest_notifications(status);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_sent_at ON guest_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_travel_profile_id ON gps_tracking_data(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_recorded_at ON gps_tracking_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_location ON gps_tracking_data(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_driver_verification_logs_travel_profile_id ON driver_verification_logs(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_logs_verified_at ON driver_verification_logs(verified_at);

CREATE INDEX IF NOT EXISTS idx_journey_analytics_travel_profile_id ON journey_analytics(travel_profile_id);

-- ============================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guest_travel_profiles_updated_at 
  BEFORE UPDATE ON guest_travel_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_checkpoints_updated_at 
  BEFORE UPDATE ON journey_checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_notifications_updated_at 
  BEFORE UPDATE ON guest_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_analytics_updated_at 
  BEFORE UPDATE ON journey_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE HELPFUL FUNCTIONS
-- ============================================

-- Function to create default checkpoints for a travel profile
CREATE OR REPLACE FUNCTION create_default_checkpoints(profile_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO journey_checkpoints (travel_profile_id, checkpoint_name, checkpoint_type, description) VALUES
    (profile_id, 'Flight Arrival', 'airport_arrival', 'Guest has landed at the airport'),
    (profile_id, 'Security Clearance', 'security', 'Guest has cleared airport security and customs'),
    (profile_id, 'Baggage Collection', 'baggage_claim', 'Guest has collected their baggage'),
    (profile_id, 'Meet Driver', 'meet_driver', 'Guest has met their designated driver'),
    (profile_id, 'Journey to Hotel', 'en_route', 'Guest is traveling to the hotel'),
    (profile_id, 'Hotel Arrival', 'hotel_arrival', 'Guest has arrived at the hotel');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate journey quality score
CREATE OR REPLACE FUNCTION calculate_journey_quality_score(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 100;
    delays INTEGER;
    response_rate DECIMAL;
BEGIN
    -- Deduct points for delays
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (actual_time - expected_time))/60), 0)
    INTO delays
    FROM journey_checkpoints 
    WHERE travel_profile_id = profile_id AND actual_time IS NOT NULL AND expected_time IS NOT NULL;
    
    score := score - LEAST(delays, 30); -- Max 30 point deduction for delays
    
    -- Add points for good response rate
    SELECT COALESCE(
        (COUNT(*) FILTER (WHERE response_received = true)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE requires_response = true), 0)) * 20,
        0
    )
    INTO response_rate
    FROM guest_notifications 
    WHERE travel_profile_id = profile_id;
    
    score := score + response_rate;
    
    RETURN GREATEST(LEAST(score, 100), 0); -- Ensure score is between 0 and 100
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE guest_travel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming you have a way to get company_id from guest_id)
-- You'll need to adjust these based on your existing user authentication system

-- Basic policy for guest travel profiles
CREATE POLICY "Users can manage travel profiles for their company events" ON guest_travel_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = guest_travel_profiles.event_id 
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can manage journey checkpoints" ON journey_checkpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = journey_checkpoints.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage guest notifications" ON guest_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = guest_notifications.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view GPS tracking data" ON gps_tracking_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = gps_tracking_data.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view driver verification logs" ON driver_verification_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = driver_verification_logs.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view journey analytics" ON journey_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = journey_analytics.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- SAMPLE DATA INSERTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_sample_travel_profile(
  p_guest_id UUID,
  p_event_id UUID,
  p_flight_number VARCHAR DEFAULT 'BA2490',
  p_flight_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  INSERT INTO guest_travel_profiles (
    guest_id, event_id, flight_number, flight_date,
    hotel_reservation_number, hotel_name, hotel_address,
    gps_tracking_enabled, checkpoint_notifications_enabled
  ) VALUES (
    p_guest_id, p_event_id, p_flight_number, p_flight_date,
    'HTL' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0'),
    'Grand Hotel London',
    '123 Park Lane, London, W1K 7AA',
    TRUE, TRUE
  ) RETURNING id INTO profile_id;
  
  -- Create default checkpoints
  PERFORM create_default_checkpoints(profile_id);
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE guest_travel_profiles IS 'Core travel information and tracking settings for each guest';
COMMENT ON TABLE journey_checkpoints IS 'Predefined and custom checkpoints throughout the guest journey';
COMMENT ON TABLE guest_notifications IS 'All notifications sent to guests with delivery and response tracking';
COMMENT ON TABLE gps_tracking_data IS 'Real-time GPS location data for guest tracking';
COMMENT ON TABLE driver_verification_logs IS 'Audit log of all driver verification attempts';
COMMENT ON TABLE journey_analytics IS 'Analytical data and metrics for journey performance';

COMMENT ON FUNCTION create_default_checkpoints(UUID) IS 'Creates standard checkpoints for a new travel profile';
COMMENT ON FUNCTION calculate_journey_quality_score(UUID) IS 'Calculates a quality score (0-100) based on journey performance metrics';
COMMENT ON FUNCTION create_sample_travel_profile(UUID, UUID, VARCHAR, DATE) IS 'Creates a sample travel profile with default checkpoints for testing'; 
 
-- STAGE 1 TRAVEL COMPANION MODULE - DATABASE SCHEMA
-- This schema supports complete travel tracking from airport to hotel
-- with driver verification, GPS tracking, and checkpoint notifications
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GUEST TRAVEL PROFILES TABLE
-- Core travel information for each guest
-- ============================================
CREATE TABLE IF NOT EXISTS guest_travel_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL, -- References the guest from your existing system
  event_id UUID NOT NULL, -- References the event from your existing system
  
  -- Flight Information
  flight_number VARCHAR(20),
  flight_date DATE,
  flight_departure_time TIMESTAMP WITH TIME ZONE,
  flight_arrival_time TIMESTAMP WITH TIME ZONE,
  flight_status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, delayed, cancelled, landed
  departure_airport VARCHAR(100),
  arrival_airport VARCHAR(100),
  
  -- Hotel Information
  hotel_reservation_number VARCHAR(100),
  hotel_name VARCHAR(255),
  hotel_address TEXT,
  hotel_check_in_time TIMESTAMP WITH TIME ZONE,
  
  -- Driver Information
  driver_verification_code VARCHAR(100),
  driver_name VARCHAR(255),
  driver_phone VARCHAR(50),
  driver_license_plate VARCHAR(20),
  driver_verified BOOLEAN DEFAULT FALSE,
  driver_verification_time TIMESTAMP WITH TIME ZONE,
  
  -- Tracking Settings
  gps_tracking_enabled BOOLEAN DEFAULT TRUE,
  checkpoint_notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- Journey Status
  journey_status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_transit, at_security, met_driver, en_route_hotel, arrived_hotel
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  last_location_update TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOURNEY CHECKPOINTS TABLE
-- Predefined and custom checkpoints for the journey
-- ============================================
CREATE TABLE IF NOT EXISTS journey_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Checkpoint Information
  checkpoint_name VARCHAR(255) NOT NULL,
  checkpoint_type VARCHAR(50) NOT NULL, -- airport_arrival, security, baggage_claim, customs, meet_driver, en_route, hotel_arrival
  description TEXT,
  
  -- Location Information
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name VARCHAR(255),
  
  -- Timing
  expected_time TIMESTAMP WITH TIME ZONE,
  actual_time TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, approaching, completed, skipped
  completion_method VARCHAR(50), -- auto_detected, guest_confirmed, manual_override
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GUEST NOTIFICATIONS TABLE
-- Tracks all notifications sent to guests
-- ============================================
CREATE TABLE IF NOT EXISTS guest_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES journey_checkpoints(id) ON DELETE SET NULL,
  
  -- Notification Content
  notification_type VARCHAR(50) NOT NULL, -- checkpoint_prompt, status_update, driver_info, emergency_alert
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Delivery Information
  delivery_method VARCHAR(50) NOT NULL, -- push_notification, sms, email, in_app
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Response Information
  requires_response BOOLEAN DEFAULT FALSE,
  response_received BOOLEAN DEFAULT FALSE,
  response_data JSONB,
  response_time TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, read, responded, failed
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GPS TRACKING DATA TABLE
-- Stores GPS location history for guests
-- ============================================
CREATE TABLE IF NOT EXISTS gps_tracking_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Location Data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters INTEGER,
  altitude_meters INTEGER,
  speed_kmh DECIMAL(5, 2),
  heading_degrees INTEGER,
  
  -- Context
  location_source VARCHAR(50) DEFAULT 'gps', -- gps, network, passive
  battery_level INTEGER,
  is_moving BOOLEAN DEFAULT FALSE,
  
  -- Timing
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DRIVER VERIFICATION LOGS TABLE
-- Tracks all driver verification attempts
-- ============================================
CREATE TABLE IF NOT EXISTS driver_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Verification Details
  verification_method VARCHAR(50) NOT NULL, -- barcode_scan, qr_code, manual_code, photo_verification
  verification_code VARCHAR(100),
  verification_data JSONB, -- Store barcode/QR code data, photo URLs, etc.
  
  -- Result
  verification_successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  
  -- Location and Timing
  verification_lat DECIMAL(10, 8),
  verification_lng DECIMAL(11, 8),
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOURNEY ANALYTICS TABLE
-- Stores analytical data about journeys
-- ============================================
CREATE TABLE IF NOT EXISTS journey_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  
  -- Journey Metrics
  total_journey_time_minutes INTEGER,
  airport_to_driver_time_minutes INTEGER,
  driver_to_hotel_time_minutes INTEGER,
  total_distance_km DECIMAL(8, 2),
  
  -- Checkpoint Metrics
  checkpoints_completed INTEGER DEFAULT 0,
  checkpoints_skipped INTEGER DEFAULT 0,
  average_checkpoint_delay_minutes INTEGER,
  
  -- Notification Metrics
  notifications_sent INTEGER DEFAULT 0,
  notifications_responded INTEGER DEFAULT 0,
  average_response_time_minutes INTEGER,
  
  -- GPS Metrics
  gps_data_points INTEGER DEFAULT 0,
  tracking_accuracy_average_meters INTEGER,
  
  -- Journey Quality Score (1-100)
  journey_quality_score INTEGER,
  
  -- Completion Status
  journey_completed BOOLEAN DEFAULT FALSE,
  completion_time TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_guest_id ON guest_travel_profiles(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_event_id ON guest_travel_profiles(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_journey_status ON guest_travel_profiles(journey_status);
CREATE INDEX IF NOT EXISTS idx_guest_travel_profiles_flight_date ON guest_travel_profiles(flight_date);

CREATE INDEX IF NOT EXISTS idx_journey_checkpoints_travel_profile_id ON journey_checkpoints(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkpoints_type ON journey_checkpoints(checkpoint_type);
CREATE INDEX IF NOT EXISTS idx_journey_checkpoints_status ON journey_checkpoints(status);

CREATE INDEX IF NOT EXISTS idx_guest_notifications_travel_profile_id ON guest_notifications(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_type ON guest_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_status ON guest_notifications(status);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_sent_at ON guest_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_travel_profile_id ON gps_tracking_data(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_recorded_at ON gps_tracking_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_location ON gps_tracking_data(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_driver_verification_logs_travel_profile_id ON driver_verification_logs(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_logs_verified_at ON driver_verification_logs(verified_at);

CREATE INDEX IF NOT EXISTS idx_journey_analytics_travel_profile_id ON journey_analytics(travel_profile_id);

-- ============================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guest_travel_profiles_updated_at 
  BEFORE UPDATE ON guest_travel_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_checkpoints_updated_at 
  BEFORE UPDATE ON journey_checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_notifications_updated_at 
  BEFORE UPDATE ON guest_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_analytics_updated_at 
  BEFORE UPDATE ON journey_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE HELPFUL FUNCTIONS
-- ============================================

-- Function to create default checkpoints for a travel profile
CREATE OR REPLACE FUNCTION create_default_checkpoints(profile_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO journey_checkpoints (travel_profile_id, checkpoint_name, checkpoint_type, description) VALUES
    (profile_id, 'Flight Arrival', 'airport_arrival', 'Guest has landed at the airport'),
    (profile_id, 'Security Clearance', 'security', 'Guest has cleared airport security and customs'),
    (profile_id, 'Baggage Collection', 'baggage_claim', 'Guest has collected their baggage'),
    (profile_id, 'Meet Driver', 'meet_driver', 'Guest has met their designated driver'),
    (profile_id, 'Journey to Hotel', 'en_route', 'Guest is traveling to the hotel'),
    (profile_id, 'Hotel Arrival', 'hotel_arrival', 'Guest has arrived at the hotel');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate journey quality score
CREATE OR REPLACE FUNCTION calculate_journey_quality_score(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 100;
    delays INTEGER;
    response_rate DECIMAL;
BEGIN
    -- Deduct points for delays
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (actual_time - expected_time))/60), 0)
    INTO delays
    FROM journey_checkpoints 
    WHERE travel_profile_id = profile_id AND actual_time IS NOT NULL AND expected_time IS NOT NULL;
    
    score := score - LEAST(delays, 30); -- Max 30 point deduction for delays
    
    -- Add points for good response rate
    SELECT COALESCE(
        (COUNT(*) FILTER (WHERE response_received = true)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE requires_response = true), 0)) * 20,
        0
    )
    INTO response_rate
    FROM guest_notifications 
    WHERE travel_profile_id = profile_id;
    
    score := score + response_rate;
    
    RETURN GREATEST(LEAST(score, 100), 0); -- Ensure score is between 0 and 100
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE guest_travel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming you have a way to get company_id from guest_id)
-- You'll need to adjust these based on your existing user authentication system

-- Basic policy for guest travel profiles
CREATE POLICY "Users can manage travel profiles for their company events" ON guest_travel_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = guest_travel_profiles.event_id 
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can manage journey checkpoints" ON journey_checkpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = journey_checkpoints.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage guest notifications" ON guest_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = guest_notifications.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view GPS tracking data" ON gps_tracking_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = gps_tracking_data.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view driver verification logs" ON driver_verification_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = driver_verification_logs.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view journey analytics" ON journey_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM guest_travel_profiles gtp
      JOIN events e ON e.id = gtp.event_id
      WHERE gtp.id = journey_analytics.travel_profile_id
      AND e.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- SAMPLE DATA INSERTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_sample_travel_profile(
  p_guest_id UUID,
  p_event_id UUID,
  p_flight_number VARCHAR DEFAULT 'BA2490',
  p_flight_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  INSERT INTO guest_travel_profiles (
    guest_id, event_id, flight_number, flight_date,
    hotel_reservation_number, hotel_name, hotel_address,
    gps_tracking_enabled, checkpoint_notifications_enabled
  ) VALUES (
    p_guest_id, p_event_id, p_flight_number, p_flight_date,
    'HTL' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0'),
    'Grand Hotel London',
    '123 Park Lane, London, W1K 7AA',
    TRUE, TRUE
  ) RETURNING id INTO profile_id;
  
  -- Create default checkpoints
  PERFORM create_default_checkpoints(profile_id);
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE guest_travel_profiles IS 'Core travel information and tracking settings for each guest';
COMMENT ON TABLE journey_checkpoints IS 'Predefined and custom checkpoints throughout the guest journey';
COMMENT ON TABLE guest_notifications IS 'All notifications sent to guests with delivery and response tracking';
COMMENT ON TABLE gps_tracking_data IS 'Real-time GPS location data for guest tracking';
COMMENT ON TABLE driver_verification_logs IS 'Audit log of all driver verification attempts';
COMMENT ON TABLE journey_analytics IS 'Analytical data and metrics for journey performance';

COMMENT ON FUNCTION create_default_checkpoints(UUID) IS 'Creates standard checkpoints for a new travel profile';
COMMENT ON FUNCTION calculate_journey_quality_score(UUID) IS 'Calculates a quality score (0-100) based on journey performance metrics';
COMMENT ON FUNCTION create_sample_travel_profile(UUID, UUID, VARCHAR, DATE) IS 'Creates a sample travel profile with default checkpoints for testing'; 
 