-- Update the timeline_modules table constraint to allow new module types
-- Drop the existing constraint
ALTER TABLE timeline_modules DROP CONSTRAINT IF EXISTS timeline_modules_module_type_check;

-- Add the new constraint with all allowed module types
ALTER TABLE timeline_modules ADD CONSTRAINT timeline_modules_module_type_check 
CHECK (module_type IN ('qrcode', 'survey', 'feedback', 'question', 'multiple_choice', 'photo_video')); 