-- Check the current structure of the guests table
-- Run this to see what columns actually exist

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'guests' 
ORDER BY ordinal_position;

-- Also check if the table exists at all
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'guests';

-- Check what data is currently in the guests table
SELECT COUNT(*) as total_guests FROM guests;

-- Show first few rows to see the structure
SELECT * FROM guests LIMIT 3; 
 
 
 
 
 
 