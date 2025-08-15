-- Check if forms table exists and show its structure
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'forms') 
        THEN 'FORMS TABLE EXISTS' 
        ELSE 'FORMS TABLE MISSING' 
    END as forms_table_status;

-- Show forms table structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'forms' 
ORDER BY ordinal_position;

-- Check if form_recipients table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_recipients') 
        THEN 'FORM_RECIPIENTS TABLE EXISTS' 
        ELSE 'FORM_RECIPIENTS TABLE MISSING' 
    END as form_recipients_table_status;

-- Show form_recipients table structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'form_recipients' 
ORDER BY ordinal_position;

-- Check if form_submissions table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_submissions') 
        THEN 'FORM_SUBMISSIONS TABLE EXISTS' 
        ELSE 'FORM_SUBMISSIONS TABLE MISSING' 
    END as form_submissions_table_status;

-- Show form_submissions table structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'form_submissions' 
ORDER BY ordinal_position;

-- Check if get_form_by_token function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_name = 'get_form_by_token'
        ) 
        THEN 'GET_FORM_BY_TOKEN FUNCTION EXISTS' 
        ELSE 'GET_FORM_BY_TOKEN FUNCTION MISSING' 
    END as get_form_by_token_status;

-- Check if submit_form_response function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_name = 'submit_form_response'
        ) 
        THEN 'SUBMIT_FORM_RESPONSE FUNCTION EXISTS' 
        ELSE 'SUBMIT_FORM_RESPONSE FUNCTION MISSING' 
    END as submit_form_response_status;

-- Check if create_form_recipients function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_name = 'create_form_recipients'
        ) 
        THEN 'CREATE_FORM_RECIPIENTS FUNCTION EXISTS' 
        ELSE 'CREATE_FORM_RECIPIENTS FUNCTION MISSING' 
    END as create_form_recipients_status;

-- Show sample data from forms table if it exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'forms') 
        THEN (SELECT COUNT(*) FROM forms)
        ELSE 0
    END as forms_count;

-- Show sample data from form_recipients table if it exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_recipients') 
        THEN (SELECT COUNT(*) FROM form_recipients)
        ELSE 0
    END as form_recipients_count; 