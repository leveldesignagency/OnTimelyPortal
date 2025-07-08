-- ============================================
-- ONBOARDING NEW CUSTOMERS & USERS: STEP-BY-STEP GUIDE
-- ============================================

-- 1. Create a new company (if needed)
-- --------------------------------------------
-- Run this in SQL Editor:
--
--   INSERT INTO companies (id, name, created_at, updated_at)
--   VALUES (gen_random_uuid(), 'COMPANY NAME HERE', NOW(), NOW())
--   RETURNING id;
--
-- Copy the returned id (company_id) for use in the next step.

-- 2. Add a new user (after creating in Supabase Auth)
-- --------------------------------------------
-- Use the Auth UID as id, and the company_id from above.

-- Example for Level Design Agency:
INSERT INTO users (
  id, company_id, email, name, role, status, created_at, updated_at
) VALUES (
  '5c8f74e2-416a-43f3-b24e-06058704fe78',  -- Supabase Auth UID
  '92cde8b0-eb1a-43b0-a985-f2f592353b04',  -- Level Design Agency company_id
  'leveldesignagency@gmail.com',
  'Level Design Agency',
  'user',
  'online',
  NOW(),
  NOW()
);

-- ============================================
-- BULK USER ONBOARDING (TEMPLATE)
-- ============================================
-- For onboarding multiple users at once (after creating them in Supabase Auth):
--
-- 1. Make sure each user has a Supabase Auth UID.
-- 2. Use the correct company_id for each user.
-- 3. Add as many rows as needed.

INSERT INTO users (
  id, company_id, email, name, role, status, created_at, updated_at
) VALUES
  ('UID_1', 'COMPANY_UUID_1', 'email1@example.com', 'Name 1', 'user', 'online', NOW(), NOW()),
  ('UID_2', 'COMPANY_UUID_2', 'email2@example.com', 'Name 2', 'user', 'online', NOW(), NOW()),
  ('UID_3', 'COMPANY_UUID_3', 'email3@example.com', 'Name 3', 'user', 'online', NOW(), NOW());
-- Add more rows as needed for each user

-- ============================================
-- STAFF ONBOARDING CHECKLIST
-- ============================================
-- 1. Add user in Supabase Auth (Dashboard > Authentication > Users > Add user)
-- 2. Copy the UID from the Auth user
-- 3. If this is a new company, create a company row and copy the new company_id
-- 4. Insert the user row in the users table with the correct UID and company_id
-- 5. (Bulk) Repeat for each user as needed
-- 6. Done! User(s) can now log in and access only their company's data 
-- ============================================
-- MANUAL USER & COMPANY ONBOARDING SCRIPT (EXAMPLE)
-- ============================================
-- Fill in ALL values below before running!

DO $$
DECLARE
    user_uid UUID := 'PASTE-USER-UID-HERE';                -- Supabase Auth UID
    user_email TEXT := 'user@email.com';                    -- User's email
    user_first_name TEXT := 'First';                        -- User's first name
    user_last_name TEXT := 'Last';                          -- User's last name
    user_avatar TEXT := 'FL';                               -- Avatar initials (e.g., 'CM')
    company_name TEXT := 'Company Name';                    -- Company name
    new_company_id UUID := gen_random_uuid();               -- Generates a new company UUID
    user_full_name TEXT;
BEGIN
    user_full_name := user_first_name || ' ' || user_last_name;

    -- Create the company
    INSERT INTO companies (id, name, created_at, updated_at)
    VALUES (new_company_id, company_name, NOW(), NOW());

    -- Create the user profile
    INSERT INTO users (id, company_id, email, name, role, avatar, status, created_at, updated_at)
    VALUES (
        user_uid,
        new_company_id,
        user_email,
        user_full_name,
        'admin',           -- or 'user', 'member', etc.
        user_avatar,
        'active',
        NOW(),
        NOW()
    );

    -- Confirm the user's email (optional)
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = user_uid;

    RAISE NOTICE '✅ Company created: % (ID: %)', company_name, new_company_id;
    RAISE NOTICE '✅ User created: % (ID: %)', user_full_name, user_uid;
    RAISE NOTICE '✅ Email confirmed for: %', user_email;
    RAISE NOTICE '🎉 User can now log in and see their fresh, empty app!';
END $$; 
