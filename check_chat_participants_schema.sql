-- Check if company_id column exists in chat_participants table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_participants' 
ORDER BY column_name;

-- Also check the current structure
SELECT COUNT(*) as total_participants FROM chat_participants;

-- Check for any recent errors or constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'chat_participants'; 
 
 
 