-- Setup script for creating your first staff account
-- Run this AFTER creating the ontimely_staff table

-- First, let's create a proper password hash for your account
-- Replace 'your-email@example.com' with your actual email
-- Replace 'your-password' with your desired password

-- For demo purposes, we'll use a simple hash
-- In production, use proper bcrypt hashing

-- Example: If your password is "admin123", the hash would be:
-- demo_hash_123456789 (this is just an example)

-- Insert your master director account
INSERT INTO public.ontimely_staff (email, password_hash, name, role) 
VALUES (
    'your-email@example.com',  -- Replace with your email
    'demo_hash_123456789',     -- Replace with actual hash from passwordUtils.hashPassword()
    'Master Director',
    'director'
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = timezone('utc'::text, now());

-- Verify the account was created
SELECT 
    id,
    email,
    name,
    role,
    is_active,
    created_at
FROM public.ontimely_staff 
WHERE email = 'your-email@example.com';

-- You can also create additional staff accounts here
-- Example admin account:
-- INSERT INTO public.ontimely_staff (email, password_hash, name, role) 
-- VALUES (
--     'admin@example.com',
--     'demo_hash_987654321',
--     'Admin User',
--     'admin'
-- );

-- Example staff account:
-- INSERT INTO public.ontimely_staff (email, password_hash, name, role) 
-- VALUES (
--     'staff@example.com',
--     'demo_hash_456789123',
--     'Staff User',
--     'staff'
-- );
