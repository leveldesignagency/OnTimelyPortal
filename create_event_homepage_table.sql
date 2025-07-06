-- Create event_homepage_data table
CREATE TABLE IF NOT EXISTS event_homepage_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    welcome_title TEXT NOT NULL DEFAULT 'WELCOME TO THE EVENT',
    welcome_description TEXT NOT NULL DEFAULT 'THIS IS A DESCRIPTION',
    modules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on event_id for faster queries
CREATE INDEX IF NOT EXISTS idx_event_homepage_data_event_id ON event_homepage_data(event_id);

-- Add RLS policies
ALTER TABLE event_homepage_data ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their company's event homepage data
CREATE POLICY "Users can read their company's event homepage data" ON event_homepage_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_homepage_data.event_id 
            AND e.company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Policy for authenticated users to insert their company's event homepage data
CREATE POLICY "Users can insert their company's event homepage data" ON event_homepage_data
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_homepage_data.event_id 
            AND e.company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Policy for authenticated users to update their company's event homepage data
CREATE POLICY "Users can update their company's event homepage data" ON event_homepage_data
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_homepage_data.event_id 
            AND e.company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Policy for authenticated users to delete their company's event homepage data
CREATE POLICY "Users can delete their company's event homepage data" ON event_homepage_data
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_homepage_data.event_id 
            AND e.company_id = auth.jwt() ->> 'company_id'
        )
    );

-- Add unique constraint to ensure one homepage per event
ALTER TABLE event_homepage_data ADD CONSTRAINT unique_event_homepage UNIQUE (event_id); 