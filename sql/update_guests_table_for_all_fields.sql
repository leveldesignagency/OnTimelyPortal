-- Update guests table to match the latest CreateGuests form and CSV template
-- Add/rename all necessary fields for full guest data capture

-- Add D.O.B. (date of birth) column if not exists
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dob TEXT;
COMMENT ON COLUMN guests.dob IS 'Date of birth (dd/mm/yyyy) for guest';

-- Add/rename Next of Kin fields
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_email TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_phone_country TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT;

COMMENT ON COLUMN guests.next_of_kin_name IS 'Next of kin name';
COMMENT ON COLUMN guests.next_of_kin_email IS 'Next of kin email';
COMMENT ON COLUMN guests.next_of_kin_phone_country IS 'N.O.K Country Code';
COMMENT ON COLUMN guests.next_of_kin_phone IS 'N.O.K Contact Number';

-- Add/ensure all other fields exist (no-op if already present)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS prefix TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_country TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary TEXT[];
ALTER TABLE guests ADD COLUMN IF NOT EXISTS medical TEXT[];
-- Modules and module_values columns already exist
-- Add/ensure all module columns as needed (if you want to store them as separate columns, otherwise keep in module_values)

-- Add unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'guests' AND constraint_type = 'UNIQUE' AND constraint_name = 'unique_event_email'
  ) THEN
    ALTER TABLE guests ADD CONSTRAINT unique_event_email UNIQUE (event_id, email);
  END IF;
END $$; 