-- Add D.O.B. (date of birth) column to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dob TEXT;
-- Optionally, add a comment for documentation
COMMENT ON COLUMN guests.dob IS 'Date of birth (dd/mm/yyyy) for guest'; 