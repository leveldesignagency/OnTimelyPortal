-- Fix the module_id column type from UUID to TEXT
-- This is needed because module IDs are strings like "module-b8d3568b-b525-45fc-bbc0-f1818857b0bd"

-- First, drop the foreign key constraint
ALTER TABLE guest_module_answers 
DROP CONSTRAINT IF EXISTS guest_module_answers_module_id_fkey;

-- Drop any existing indexes on module_id
DROP INDEX IF EXISTS idx_guest_module_answers_module_id;

-- Alter the column type from UUID to TEXT
ALTER TABLE guest_module_answers 
ALTER COLUMN module_id TYPE TEXT;

-- Recreate the index
CREATE INDEX idx_guest_module_answers_module_id ON guest_module_answers(module_id);

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guest_module_answers' 
AND column_name = 'module_id'; 