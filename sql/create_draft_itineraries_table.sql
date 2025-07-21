-- Create draft_itineraries table for storing draft itinerary items
-- This separates drafts from published itineraries for better organization

CREATE TABLE IF NOT EXISTS draft_itineraries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    company_id uuid REFERENCES companies(id),
    created_by uuid REFERENCES auth.users(id),
    title text NOT NULL,
    description text,
    date date,
    arrival_time text,
    start_time text,
    end_time text,
    location text,
    document_file_name text,
    qrcode_url text,
    qrcode_image text,
    contact_name text,
    contact_country_code text,
    contact_phone text,
    contact_email text,
    notification_times jsonb DEFAULT '[]'::jsonb,
    group_id text,
    group_name text,
    content jsonb DEFAULT '{}'::jsonb,
    modules jsonb DEFAULT '{}'::jsonb,
    module_values jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_draft_itineraries_event_id ON draft_itineraries(event_id);
CREATE INDEX IF NOT EXISTS idx_draft_itineraries_company_id ON draft_itineraries(company_id);
CREATE INDEX IF NOT EXISTS idx_draft_itineraries_created_by ON draft_itineraries(created_by);
CREATE INDEX IF NOT EXISTS idx_draft_itineraries_date ON draft_itineraries(date);
CREATE INDEX IF NOT EXISTS idx_draft_itineraries_created_at ON draft_itineraries(created_at);

-- Enable RLS
ALTER TABLE draft_itineraries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for draft_itineraries
CREATE POLICY "Users can view draft itineraries for their company events"
ON draft_itineraries FOR SELECT
USING (
    auth.uid() IS NOT NULL AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can insert draft itineraries for their company events"
ON draft_itineraries FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can update draft itineraries for their company events"
ON draft_itineraries FOR UPDATE
USING (
    auth.uid() IS NOT NULL AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can delete draft itineraries for their company events"
ON draft_itineraries FOR DELETE
USING (
    auth.uid() IS NOT NULL AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_draft_itineraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_draft_itineraries_updated_at ON draft_itineraries;
CREATE TRIGGER trigger_update_draft_itineraries_updated_at
    BEFORE UPDATE ON draft_itineraries
    FOR EACH ROW
    EXECUTE FUNCTION update_draft_itineraries_updated_at();

-- Function to move draft to published itineraries
CREATE OR REPLACE FUNCTION publish_draft_itinerary(draft_id uuid)
RETURNS uuid AS $$
DECLARE
    published_id uuid;
    draft_record draft_itineraries%ROWTYPE;
BEGIN
    -- Get the draft record
    SELECT * INTO draft_record FROM draft_itineraries WHERE id = draft_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Draft itinerary not found';
    END IF;
    
    -- Insert into published itineraries table
    INSERT INTO itineraries (
        event_id,
        company_id,
        created_by,
        title,
        description,
        date,
        arrival_time,
        start_time,
        end_time,
        location,
        document_file_name,
        qrcode_url,
        qrcode_image,
        contact_name,
        contact_country_code,
        contact_phone,
        contact_email,
        notification_times,
        group_id,
        group_name,
        content,
        modules,
        module_values,
        is_draft
    ) VALUES (
        draft_record.event_id,
        draft_record.company_id,
        draft_record.created_by,
        draft_record.title,
        draft_record.description,
        draft_record.date,
        draft_record.arrival_time,
        draft_record.start_time,
        draft_record.end_time,
        draft_record.location,
        draft_record.document_file_name,
        draft_record.qrcode_url,
        draft_record.qrcode_image,
        draft_record.contact_name,
        draft_record.contact_country_code,
        draft_record.contact_phone,
        draft_record.contact_email,
        draft_record.notification_times,
        draft_record.group_id,
        draft_record.group_name,
        draft_record.content,
        draft_record.modules,
        draft_record.module_values,
        false
    ) RETURNING id INTO published_id;
    
    -- Delete the draft
    DELETE FROM draft_itineraries WHERE id = draft_id;
    
    RETURN published_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE draft_itineraries IS 'Draft itinerary items that are not yet published';
COMMENT ON COLUMN draft_itineraries.event_id IS 'ID of the event this draft belongs to';
COMMENT ON COLUMN draft_itineraries.company_id IS 'ID of the company that created this draft';
COMMENT ON COLUMN draft_itineraries.created_by IS 'ID of the user who created this draft';
COMMENT ON COLUMN draft_itineraries.modules IS 'JSON object storing which modules are enabled for this draft';
COMMENT ON COLUMN draft_itineraries.module_values IS 'JSON object storing the actual data for each module instance'; 