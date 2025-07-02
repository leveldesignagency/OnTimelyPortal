-- Check ONLY the ID column types of our main tables
-- This will show us exactly what data types we're working with

SELECT 
    table_name,
    column_name,
    data_type,
    'ID COLUMN TYPE' as note
FROM information_schema.columns 
WHERE table_name IN ('guests', 'itineraries', 'events') 
AND column_name = 'id'
ORDER BY table_name;

-- Also check if these tables exist at all
SELECT 
    table_name,
    'TABLE EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN ('guests', 'itineraries', 'events', 'users')
ORDER BY table_name; 