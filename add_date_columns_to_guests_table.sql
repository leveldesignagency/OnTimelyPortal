-- Add date columns to guests table for the four travel modules
-- This supports date tracking for flight, hotel, train, and coach bookings

-- Flight module date columns
ALTER TABLE guests ADD COLUMN IF NOT EXISTS departure_date DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS arrival_date DATE;

-- Hotel module date columns  
ALTER TABLE guests ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS hotel_departure_date DATE;

-- Train module date columns
ALTER TABLE guests ADD COLUMN IF NOT EXISTS train_departure_date DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS train_arrival_date DATE;

-- Coach module date columns
ALTER TABLE guests ADD COLUMN IF NOT EXISTS coach_departure_date DATE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS coach_arrival_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN guests.departure_date IS 'Flight departure date';
COMMENT ON COLUMN guests.arrival_date IS 'Flight arrival date';
COMMENT ON COLUMN guests.check_in_date IS 'Hotel check-in date';
COMMENT ON COLUMN guests.hotel_departure_date IS 'Hotel departure date';
COMMENT ON COLUMN guests.train_departure_date IS 'Train departure date';
COMMENT ON COLUMN guests.train_arrival_date IS 'Train arrival date';
COMMENT ON COLUMN guests.coach_departure_date IS 'Coach departure date';
COMMENT ON COLUMN guests.coach_arrival_date IS 'Coach arrival date';

-- Create indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_guests_departure_date ON guests(departure_date);
CREATE INDEX IF NOT EXISTS idx_guests_arrival_date ON guests(arrival_date);
CREATE INDEX IF NOT EXISTS idx_guests_check_in_date ON guests(check_in_date);
CREATE INDEX IF NOT EXISTS idx_guests_hotel_departure_date ON guests(hotel_departure_date);
CREATE INDEX IF NOT EXISTS idx_guests_train_departure_date ON guests(train_departure_date);
CREATE INDEX IF NOT EXISTS idx_guests_coach_departure_date ON guests(coach_departure_date);

-- Verify the new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'guests' 
  AND column_name LIKE '%_date' 
ORDER BY column_name; 