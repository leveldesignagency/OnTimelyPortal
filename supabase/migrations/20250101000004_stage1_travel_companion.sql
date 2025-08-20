-- ============================================
-- STAGE 1 TRAVEL COMPANION MODULE - SIMPLE MIGRATION
-- Only creates what's missing, avoids conflicts
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE ONLY MISSING TABLES
-- ============================================

-- GPS Tracking Data Table
CREATE TABLE IF NOT EXISTS gps_tracking_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters INTEGER,
  altitude_meters INTEGER,
  speed_kmh DECIMAL(5, 2),
  heading_degrees INTEGER,
  location_source VARCHAR(50) DEFAULT 'gps',
  battery_level INTEGER,
  is_moving BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Verification Logs Table
CREATE TABLE IF NOT EXISTS driver_verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  verification_method VARCHAR(50) NOT NULL,
  verification_code VARCHAR(100),
  verification_data JSONB,
  verification_successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  verification_lat DECIMAL(10, 8),
  verification_lng DECIMAL(11, 8),
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journey Analytics Table
CREATE TABLE IF NOT EXISTS journey_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_profile_id UUID REFERENCES guest_travel_profiles(id) ON DELETE CASCADE,
  total_journey_time_minutes INTEGER,
  airport_to_driver_time_minutes INTEGER,
  driver_to_hotel_time_minutes INTEGER,
  total_distance_km DECIMAL(8, 2),
  checkpoints_completed INTEGER DEFAULT 0,
  checkpoints_skipped INTEGER DEFAULT 0,
  average_checkpoint_delay_minutes INTEGER,
  notifications_sent INTEGER DEFAULT 0,
  notifications_responded INTEGER DEFAULT 0,
  average_response_time_minutes INTEGER,
  gps_data_points INTEGER DEFAULT 0,
  tracking_accuracy_average_meters INTEGER,
  journey_quality_score INTEGER,
  journey_completed BOOLEAN DEFAULT FALSE,
  completion_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE BASIC INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_travel_profile_id ON gps_tracking_data(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_recorded_at ON gps_tracking_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_data_location ON gps_tracking_data(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_driver_verification_logs_travel_profile_id ON driver_verification_logs(travel_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_verification_logs_verified_at ON driver_verification_logs(verified_at);

CREATE INDEX IF NOT EXISTS idx_journey_analytics_travel_profile_id ON journey_analytics(travel_profile_id);

-- ============================================
-- CREATE SIMPLE TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS (SIMPLE APPROACH)
-- ============================================
-- Only create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_journey_analytics_updated_at') THEN
        CREATE TRIGGER update_journey_analytics_updated_at 
        BEFORE UPDATE ON journey_analytics
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 