-- =============================================
-- TIMELY GUEST LOGIN SYSTEM - COMPLETE SQL
-- =============================================
-- This creates a proper SaaS guest login system where:
-- 1. Company admins generate guest mobile credentials via desktop app
-- 2. Guests ONLY use mobile app with generated credentials
-- 3. No hardcoded users - everything is dynamic

-- Create guest_logins table for mobile app credentials
CREATE TABLE IF NOT EXISTS guest_logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(20) NOT NULL, -- 8-character generated password
    login_url TEXT NOT NULL, -- Mobile app URL with credentials
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'expired')),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accessed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_logins_email ON guest_logins(email);
CREATE INDEX IF NOT EXISTS idx_guest_logins_guest_event ON guest_logins(guest_id, event_id);
CREATE INDEX IF NOT EXISTS idx_guest_logins_active ON guest_logins(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_guest_logins_expires ON guest_logins(expires_at);

-- Add unique constraint to ensure one active login per guest per event
-- Note: We'll handle this in the function logic instead of a constraint

-- =============================================
-- FUNCTION 1: Generate Guest Login Credentials
-- =============================================
-- Called by desktop app to create mobile credentials
CREATE OR REPLACE FUNCTION create_guest_login(
    p_guest_id UUID,
    p_event_id UUID,
    p_email VARCHAR(255)
)
RETURNS TABLE(
    guest_id UUID,
    event_id UUID,
    email VARCHAR(255),
    password VARCHAR(20),
    login_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_password VARCHAR(20);
    v_login_url TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_event_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get event end date
    SELECT "to" INTO v_event_end
    FROM events 
    WHERE id = p_event_id;
    
    IF v_event_end IS NULL THEN
        RAISE EXCEPTION 'Event not found or has no end date';
    END IF;
    
    -- Generate secure 8-character password (letters + numbers)
    v_password := UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 4) ||
        SUBSTRING(REPLACE(RANDOM()::TEXT, '0.', '') FROM 1 FOR 4)
    );
    
    -- Set expiry to 7 days AFTER the event ends
    v_expires_at := v_event_end + INTERVAL '7 days';
    
    -- Create mobile app login URL
    v_login_url := 'timely://guest-login?email=' || p_email || '&password=' || v_password;
    
    -- Deactivate any existing logins for this guest/event
    UPDATE guest_logins 
    SET is_active = false, status = 'expired'
    WHERE guest_logins.guest_id = p_guest_id 
    AND guest_logins.event_id = p_event_id 
    AND guest_logins.is_active = true;
    
    -- Insert new guest login
    INSERT INTO guest_logins (
        guest_id, 
        event_id, 
        email, 
        password, 
        login_url, 
        expires_at
    ) VALUES (
        p_guest_id,
        p_event_id,
        p_email,
        v_password,
        v_login_url,
        v_expires_at
    );
    
    -- Return the created login details
    RETURN QUERY
    SELECT 
        p_guest_id as guest_id,
        p_event_id as event_id,
        p_email as email,
        v_password as password,
        v_login_url as login_url,
        v_expires_at as expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 2: Validate Guest Login (Mobile App)
-- =============================================
-- Called by mobile app to authenticate guests
CREATE OR REPLACE FUNCTION validate_guest_login(
    p_email VARCHAR(255),
    p_password VARCHAR(20)
)
RETURNS TABLE(
    guest_id UUID,
    event_id UUID,
    email VARCHAR(255),
    is_valid BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_guest_login RECORD;
BEGIN
    -- Find the guest login
    SELECT gl.* INTO v_guest_login
    FROM guest_logins gl
    WHERE gl.email = p_email 
    AND gl.password = p_password
    AND gl.is_active = true
    ORDER BY gl.created_at DESC
    LIMIT 1;
    
    -- Check if login exists
    IF v_guest_login IS NULL THEN
        RETURN QUERY
        SELECT 
            NULL::UUID as guest_id,
            NULL::UUID as event_id,
            p_email as email,
            false as is_valid,
            'Invalid login credentials' as message;
        RETURN;
    END IF;
    
    -- Check if login has expired
    IF v_guest_login.expires_at < NOW() THEN
        -- Mark as expired
        UPDATE guest_logins 
        SET status = 'expired', is_active = false
        WHERE id = v_guest_login.id;
        
        RETURN QUERY
        SELECT 
            v_guest_login.guest_id,
            v_guest_login.event_id,
            v_guest_login.email,
            false as is_valid,
            'Login credentials have expired' as message;
        RETURN;
    END IF;
    
    -- Valid login found
    RETURN QUERY
    SELECT 
        v_guest_login.guest_id,
        v_guest_login.event_id,
        v_guest_login.email,
        true as is_valid,
        'Login successful' as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 3: Mark Guest Login as Accessed
-- =============================================
-- Called when guest successfully logs into mobile app
CREATE OR REPLACE FUNCTION mark_guest_login_accessed(
    p_email VARCHAR(255),
    p_password VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE guest_logins 
    SET 
        status = 'accessed',
        accessed_at = NOW()
    WHERE email = p_email 
    AND password = p_password
    AND is_active = true
    AND expires_at > NOW();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 4: Cleanup Expired Guest Logins
-- =============================================
-- Automatic cleanup of old credentials (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_guest_logins()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete expired guest logins older than 30 days
    DELETE FROM guest_logins 
    WHERE expires_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Mark expired but not deleted logins as inactive
    UPDATE guest_logins 
    SET is_active = false, status = 'expired'
    WHERE expires_at < NOW() 
    AND is_active = true;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 5: Get Guest Login Status
-- =============================================
-- For desktop app to check login status
CREATE OR REPLACE FUNCTION get_guest_login_status(p_event_id UUID)
RETURNS TABLE(
    guest_id UUID,
    guest_name TEXT,
    email VARCHAR(255),
    password VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    accessed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gl.guest_id,
        (g.first_name || ' ' || g.last_name) as guest_name,
        gl.email,
        gl.password,
        gl.status,
        gl.created_at,
        gl.accessed_at,
        gl.expires_at
    FROM guest_logins gl
    JOIN guests g ON g.id = gl.guest_id
    WHERE gl.event_id = p_event_id
    AND gl.is_active = true
    ORDER BY gl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY (Optional - for multi-tenant)
-- =============================================
-- Enable RLS on guest_logins table
ALTER TABLE guest_logins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see guest logins for their company's events
CREATE POLICY guest_logins_company_isolation ON guest_logins
    FOR ALL
    USING (
        event_id IN (
            SELECT e.id 
            FROM events e 
            WHERE e.company_id = (
                SELECT u.company_id 
                FROM users u 
                WHERE u.id = auth.uid()
            )
        )
    );

-- =============================================
-- EXAMPLE USAGE QUERIES
-- =============================================

-- 1. Desktop App: Generate guest logins for an event
/*
SELECT * FROM create_guest_login(
    'guest-uuid-here',
    'event-uuid-here', 
    'guest@example.com'
);
*/

-- 2. Mobile App: Validate guest login
/*
SELECT * FROM validate_guest_login(
    'guest@example.com',
    'ABC12345'
);
*/

-- 3. Desktop App: Check guest login status
/*
SELECT * FROM get_guest_login_status('event-uuid-here');
*/

-- 4. System: Cleanup expired logins
/*
SELECT cleanup_expired_guest_logins();
*/

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Guest login system setup complete!';
    RAISE NOTICE '📱 Mobile guests can now login with generated credentials';
    RAISE NOTICE '🖥️  Desktop admins can generate guest logins via Event Portal Management';
    RAISE NOTICE '🔒 No hardcoded users - everything is dynamic and secure';
END $$; 