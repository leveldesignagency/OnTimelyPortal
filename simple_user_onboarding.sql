-- ============================================
-- MANUAL USER & COMPANY ONBOARDING SCRIPT
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