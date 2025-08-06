-- Test what the get_guests_chat_messages function actually returns
-- Replace 'your-event-id' with an actual event ID from your database

-- First, get a sample event ID
SELECT id, name FROM events LIMIT 1;

-- Then test the function with that event ID
-- (Replace the UUID below with an actual event ID from the query above)
SELECT * FROM get_guests_chat_messages(
    '4e19b264-61a1-484f-8619-4f2d515b3796',  -- Replace with actual event ID
    'charlesmorgantravels@gmail.com',  -- Replace with actual user email
    10,  -- limit
    0    -- offset
); 