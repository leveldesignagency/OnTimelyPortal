-- GUESTS TABLE MIGRATION: Remove guest_id column and use id as the canonical guest identifier
-- All foreign keys in related tables should reference guests.id

ALTER TABLE guests DROP COLUMN IF EXISTS guest_id;
-- All code, functions, and foreign keys should now use guests.id as the guest identifier

-- Add ALL missing columns to existing guests table
-- This will add all columns that the code expects based on the Guest type

-- Add basic required columns
ALTER TABLE guests ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add name columns (snake_case for Supabase)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Add contact columns (snake_case for Supabase)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);

-- Add ID columns (snake_case for Supabase)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_type VARCHAR(50);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_number VARCHAR(100);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_country VARCHAR(100);

-- Add group columns (snake_case for Supabase)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS group_id VARCHAR(255);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS group_name VARCHAR(255);

-- Add next of kin columns (snake_case for Supabase)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_name VARCHAR(255);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_email VARCHAR(255);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_phone_country VARCHAR(10);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS next_of_kin_phone VARCHAR(50);

-- Add prefix column
ALTER TABLE guests ADD COLUMN IF NOT EXISTS prefix VARCHAR(20);

-- Add JSONB columns for arrays and objects
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary JSONB DEFAULT '[]';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS medical JSONB DEFAULT '[]';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '{}';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS module_values JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_company_id ON guests(company_id);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_group_id ON guests(group_id);

-- Verify the structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'guests' 
ORDER BY ordinal_position; 
 
 
 
 