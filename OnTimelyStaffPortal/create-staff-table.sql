-- Create the OnTimelyStaff table for portal authentication
CREATE TABLE IF NOT EXISTS public.ontimely_staff (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'staff' CHECK (role IN ('director', 'admin', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ontimely_staff_pkey PRIMARY KEY (id)
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_ontimely_staff_email ON public.ontimely_staff(email);

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_ontimely_staff_role ON public.ontimely_staff(role);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_ontimely_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ontimely_staff_updated_at
    BEFORE UPDATE ON public.ontimely_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_ontimely_staff_updated_at();

-- Enable Row Level Security
ALTER TABLE public.ontimely_staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only authenticated staff can view their own profile
CREATE POLICY "Staff can view own profile" ON public.ontimely_staff
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- Only directors and admins can view all staff
CREATE POLICY "Directors and admins can view all staff" ON public.ontimely_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ontimely_staff 
            WHERE email = auth.jwt() ->> 'email' 
            AND role IN ('director', 'admin')
        )
    );

-- Only directors can create new staff
CREATE POLICY "Only directors can create staff" ON public.ontimely_staff
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ontimely_staff 
            WHERE email = auth.jwt() ->> 'email' 
            AND role = 'director'
        )
    );

-- Only directors and admins can update staff
CREATE POLICY "Directors and admins can update staff" ON public.ontimely_staff
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.ontimely_staff 
            WHERE email = auth.jwt() ->> 'email' 
            AND role IN ('director', 'admin')
        )
    );

-- Only directors can delete staff
CREATE POLICY "Only directors can delete staff" ON public.ontimely_staff
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.ontimely_staff 
            WHERE email = auth.jwt() ->> 'email' 
            AND role = 'director'
        )
    );

-- Insert the master director (you)
-- Replace 'your-email@example.com' with your actual email
INSERT INTO public.ontimely_staff (email, password_hash, name, role) 
VALUES (
    'your-email@example.com', 
    '$2a$10$your-hashed-password-here', -- You'll need to generate this
    'Master Director',
    'director'
) ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.ontimely_staff TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
