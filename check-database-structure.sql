-- Check what tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check what functions exist (specifically for the trigger)
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%update%';

-- Check if the update function exists specifically
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_updated_at_column'
) as function_exists; 
 
 
 
 
 
 