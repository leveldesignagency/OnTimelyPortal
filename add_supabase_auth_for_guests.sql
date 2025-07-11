-- =============================================
-- ADD SUPABASE AUTH FOR GUESTS (SAFE ADDITION)
-- =============================================
-- This adds Supabase Auth functionality WITHOUT overwriting existing functions
-- It creates a helper function that can be called by your existing create_guest_login

-- =============================================
-- HELPER FUNCTION: Create Supabase Auth User for Guest
-- =============================================
CREATE OR REPLACE FUNCTION create_guest_auth_user(
    p_guest_id UUID,
    p_event_id UUID,
    p_email VARCHAR(255),
    p_password VARCHAR(20)
)
RETURNS UUID AS $$
DECLARE
    v_auth_user_id UUID;
    v_guest_record RECORD;
BEGIN
    -- Get guest record for metadata
    SELECT * INTO v_guest_record
    FROM guests 
    WHERE id = p_guest_id;
    
    IF v_guest_record IS NULL THEN
        RAISE EXCEPTION 'Guest not found with ID: %', p_guest_id;
    END IF;
    
    -- Check if auth user already exists
    SELECT id INTO v_auth_user_id
    FROM auth.users
    WHERE email = p_email;
    
    IF v_auth_user_id IS NULL THEN
        -- Create new Supabase Auth user
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            aud,
            role,
            raw_app_meta_data,
            raw_user_meta_data
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            p_email,
            crypt(p_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            'authenticated',
            'authenticated',
            jsonb_build_object(
                'provider', 'guest',
                'providers', ARRAY['guest'],
                'guest_id', p_guest_id,
                'event_id', p_event_id,
                'company_id', v_guest_record.company_id
            ),
            jsonb_build_object(
                'first_name', v_guest_record.first_name,
                'last_name', v_guest_record.last_name,
                'guest_id', p_guest_id,
                'event_id', p_event_id,
                'company_id', v_guest_record.company_id
            )
        )
        RETURNING id INTO v_auth_user_id;
        
        -- Create auth identity record
        INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    v_auth_user_id,
    jsonb_build_object(
        'sub', v_auth_user_id::text,
        'email', p_email,
        'guest_id', p_guest_id,
        'event_id', p_event_id,
        'company_id', v_guest_record.company_id
    ),
    'guest',
    NOW(),
    NOW()
);
        
        RAISE NOTICE 'Created new Supabase Auth user for guest: %', p_email;
    ELSE
        -- Update existing auth user with new password
        UPDATE auth.users 
        SET 
            encrypted_password = crypt(p_password, gen_salt('bf')),
            updated_at = NOW(),
            raw_app_meta_data = jsonb_build_object(
                'provider', 'guest',
                'providers', ARRAY['guest'],
                'guest_id', p_guest_id,
                'event_id', p_event_id,
                'company_id', v_guest_record.company_id
            ),
            raw_user_meta_data = jsonb_build_object(
                'first_name', v_guest_record.first_name,
                'last_name', v_guest_record.last_name,
                'guest_id', p_guest_id,
                'event_id', p_event_id,
                'company_id', v_guest_record.company_id
            )
        WHERE id = v_auth_user_id;
        
        RAISE NOTICE 'Updated existing Supabase Auth user for guest: %', p_email;
    END IF;
    
    RETURN v_auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER: Automatically create auth users when guest_logins are created
-- =============================================
-- This trigger will automatically call the helper function whenever
-- your existing create_guest_login function inserts into guest_logins

CREATE OR REPLACE FUNCTION trigger_create_guest_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Call our helper function to create the Supabase Auth user
    PERFORM create_guest_auth_user(
        NEW.guest_id,
        NEW.event_id,
        NEW.email,
        NEW.password
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS after_guest_login_insert ON guest_logins;
CREATE TRIGGER after_guest_login_insert
    AFTER INSERT ON guest_logins
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_guest_auth_user();

-- =============================================
-- UPDATE RLS POLICIES FOR GUEST ACCESS
-- =============================================
-- Allow guests to read event_homepage_data for their events
DROP POLICY IF EXISTS "Guests can read homepage data for their events" ON event_homepage_data;
CREATE POLICY "Guests can read homepage data for their events" ON event_homepage_data
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND (
            event_id IN (
                SELECT e.id 
                FROM events e 
                WHERE e.company_id = (
                    SELECT u.company_id 
                    FROM users u 
                    WHERE u.id = auth.uid()
                )
            )
            OR
            event_id = (
                SELECT ((auth.jwt())::jsonb -> 'user_metadata' ->> 'event_id')::UUID
            )
        )
    );

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Added Supabase Auth functionality for guests WITHOUT overwriting existing functions!' as status;
SELECT 'Your existing create_guest_login function will now automatically create Supabase Auth users via trigger!' as info; 