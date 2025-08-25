-- Update guest_travel_profiles table to include new hotel fields
ALTER TABLE guest_travel_profiles 
ADD COLUMN IF NOT EXISTS hotel_check_in_time VARCHAR(5),
ADD COLUMN IF NOT EXISTS hotel_check_out_time VARCHAR(5),
ADD COLUMN IF NOT EXISTS hotel_check_in_date VARCHAR(10),
ADD COLUMN IF NOT EXISTS hotel_check_out_date VARCHAR(10);

-- Add comments for the new fields
COMMENT ON COLUMN guest_travel_profiles.hotel_check_in_time IS 'Hotel check-in time in HH:MM format';
COMMENT ON COLUMN guest_travel_profiles.hotel_check_out_time IS 'Hotel check-out time in HH:MM format';
COMMENT ON COLUMN guest_travel_profiles.hotel_check_in_date IS 'Hotel check-in date in DD/MM/YYYY format';
COMMENT ON COLUMN guest_travel_profiles.hotel_check_out_date IS 'Hotel check-out date in DD/MM/YYYY format';
