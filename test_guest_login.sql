-- Test Guest Login System
-- This script tests the guest login validation with actual credentials

-- First, let's see what guest logins exist
SELECT 
    email,
    password,
    status,
    is_active,
    expires_at,
    created_at
FROM guest_logins 
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- Let's also check what guests exist in the guests table
SELECT 
    id,
    first_name,
    last_name,
    email,
    (first_name || ' ' || last_name) as full_name
FROM guests 
ORDER BY created_at DESC
LIMIT 10;

-- Test the validate_guest_login function with the credentials
-- Replace with actual email and password from the query above
SELECT * FROM validate_guest_login(
    'charlesmorgantravels@gmail.com',  -- Replace with actual email from above results
    'XXXX1234'  -- Replace with actual password from the first query above
);

-- Check event details for the guest
SELECT 
    e.id as event_id,
    e.name as event_name,
    e."from" as event_start,
    e."to" as event_end,
    e.company_id,
    NOW() as current_time,
    (NOW() <= e."to"::timestamp) as event_is_active
FROM events e
JOIN guest_logins gl ON gl.event_id = e.id
WHERE gl.is_active = true
ORDER BY gl.created_at DESC
LIMIT 5; 