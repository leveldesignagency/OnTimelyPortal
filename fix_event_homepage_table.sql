-- Check if company_id column exists in event_homepage_data table
DO $$
BEGIN
    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_homepage_data' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE event_homepage_data ADD COLUMN company_id UUID;
        
        -- Update existing records to set company_id based on the event's company_id
        UPDATE event_homepage_data 
        SET company_id = e.company_id 
        FROM events e 
        WHERE event_homepage_data.event_id = e.id;
        
        -- Make company_id NOT NULL after populating it
        ALTER TABLE event_homepage_data ALTER COLUMN company_id SET NOT NULL;
        
        -- Add foreign key constraint
        ALTER TABLE event_homepage_data 
        ADD CONSTRAINT fk_event_homepage_data_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id);
        
        -- Drop the old unique constraint if it exists
        ALTER TABLE event_homepage_data DROP CONSTRAINT IF EXISTS unique_event_homepage;
        
        -- Add new unique constraint on event_id and company_id
        ALTER TABLE event_homepage_data 
        ADD CONSTRAINT event_homepage_data_event_id_company_id_key 
        UNIQUE (event_id, company_id);
        
        RAISE NOTICE 'Added company_id column and updated constraints for event_homepage_data table';
    ELSE
        RAISE NOTICE 'company_id column already exists in event_homepage_data table';
    END IF;
END $$;

-- Show the current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'event_homepage_data' 
ORDER BY ordinal_position;

-- Show the current constraints
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'event_homepage_data'::regclass; 