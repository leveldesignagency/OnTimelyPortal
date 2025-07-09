-- Update guests table for comprehensive module support and event tracking
-- This script adds missing columns and ensures proper data storage for CreateGuests functionality

-- First, let's check if the guests table exists and add missing columns
DO $$
BEGIN
    -- Add event tracking columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'event_title') THEN
        ALTER TABLE guests ADD COLUMN event_title TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'event_location') THEN
        ALTER TABLE guests ADD COLUMN event_location TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'event_start_date') THEN
        ALTER TABLE guests ADD COLUMN event_start_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'event_end_date') THEN
        ALTER TABLE guests ADD COLUMN event_end_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Ensure company_id and created_by are properly set up
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'company_id') THEN
        ALTER TABLE guests ADD COLUMN company_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'created_by') THEN
        ALTER TABLE guests ADD COLUMN created_by UUID;
    END IF;
    
    -- Ensure modules and module_values columns exist with proper types
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'modules') THEN
        ALTER TABLE guests ADD COLUMN modules JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'module_values') THEN
        ALTER TABLE guests ADD COLUMN module_values JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add timestamps if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'created_at') THEN
        ALTER TABLE guests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'updated_at') THEN
        ALTER TABLE guests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_company_id ON guests(company_id);
CREATE INDEX IF NOT EXISTS idx_guests_created_by ON guests(created_by);
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests(created_at);
CREATE INDEX IF NOT EXISTS idx_guests_modules ON guests USING GIN(modules);
CREATE INDEX IF NOT EXISTS idx_guests_module_values ON guests USING GIN(module_values);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Foreign key to events table
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_guests_event_id') THEN
        ALTER TABLE guests ADD CONSTRAINT fk_guests_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
    
    -- Foreign key to users table for created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_guests_created_by') THEN
        ALTER TABLE guests ADD CONSTRAINT fk_guests_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create storage bucket for guest files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'guest-files',
    'guest-files',
    false,
    52428800, -- 50MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for guest-files bucket
CREATE POLICY "Users can upload guest files for their company events"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'guest-files' AND
    auth.uid() IS NOT NULL AND
    -- Check if user has access to the event this guest belongs to
    EXISTS (
        SELECT 1 FROM guests g
        JOIN events e ON g.event_id = e.id
        WHERE g.id::text = (storage.foldername(name))[1]
        AND e.company_id = (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can view guest files for their company events"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'guest-files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM guests g
        JOIN events e ON g.event_id = e.id
        WHERE g.id::text = (storage.foldername(name))[1]
        AND e.company_id = (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update guest files for their company events"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'guest-files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM guests g
        JOIN events e ON g.event_id = e.id
        WHERE g.id::text = (storage.foldername(name))[1]
        AND e.company_id = (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete guest files for their company events"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'guest-files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM guests g
        JOIN events e ON g.event_id = e.id
        WHERE g.id::text = (storage.foldername(name))[1]
        AND e.company_id = (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guests_updated_at ON guests;
CREATE TRIGGER trigger_update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION update_guests_updated_at();

-- Add comments for documentation
COMMENT ON COLUMN guests.event_title IS 'Title of the event this guest is attending';
COMMENT ON COLUMN guests.event_location IS 'Location of the event this guest is attending';
COMMENT ON COLUMN guests.event_start_date IS 'Start date and time of the event';
COMMENT ON COLUMN guests.event_end_date IS 'End date and time of the event';
COMMENT ON COLUMN guests.company_id IS 'ID of the company that created this guest record';
COMMENT ON COLUMN guests.created_by IS 'ID of the user who created this guest record';
COMMENT ON COLUMN guests.modules IS 'JSON object storing which modules are enabled for this guest';
COMMENT ON COLUMN guests.module_values IS 'JSON object storing the actual data for each module instance';

-- Sample query to verify the table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'guests'
-- ORDER BY ordinal_position; 