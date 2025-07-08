-- Check the actual structure of existing tables
-- Run this to see what column types we're working with

-- Check guests table structure
SELECT 'GUESTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'guests' 
ORDER BY ordinal_position;

-- Check itineraries table structure  
SELECT 'ITINERARIES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'itineraries' 
ORDER BY ordinal_position;

-- Check events table structure
SELECT 'EVENTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Show sample data to understand the ID formats
SELECT 'SAMPLE GUESTS DATA:' as info;
SELECT id, first_name, last_name, event_id FROM guests LIMIT 3;

SELECT 'SAMPLE ITINERARIES DATA:' as info;
SELECT id, title, event_id FROM itineraries LIMIT 3;

SELECT 'SAMPLE EVENTS DATA:' as info;
SELECT id, name FROM events LIMIT 3; 
 
-- Run this to see what column types we're working with

-- Check guests table structure
SELECT 'GUESTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'guests' 
ORDER BY ordinal_position;

-- Check itineraries table structure  
SELECT 'ITINERARIES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'itineraries' 
ORDER BY ordinal_position;

-- Check events table structure
SELECT 'EVENTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Show sample data to understand the ID formats
SELECT 'SAMPLE GUESTS DATA:' as info;
SELECT id, first_name, last_name, event_id FROM guests LIMIT 3;

SELECT 'SAMPLE ITINERARIES DATA:' as info;
SELECT id, title, event_id FROM itineraries LIMIT 3;

SELECT 'SAMPLE EVENTS DATA:' as info;
SELECT id, name FROM events LIMIT 3; 
 
 