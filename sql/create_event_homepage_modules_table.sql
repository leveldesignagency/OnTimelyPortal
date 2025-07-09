-- Create event_homepage_modules table for normalized module storage
CREATE TABLE IF NOT EXISTS event_homepage_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_homepage_id UUID NOT NULL REFERENCES event_homepage_data(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'title', 'description', 'image', 'video', 'list', etc.
    content JSONB NOT NULL, -- flexible content for each module
    position INTEGER NOT NULL, -- for ordering modules on the homepage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by homepage
CREATE INDEX IF NOT EXISTS idx_event_homepage_modules_homepage_id ON event_homepage_modules(event_homepage_id);

-- Optional: Index for fast lookup by type (if you want to enforce limits in SQL)
CREATE INDEX IF NOT EXISTS idx_event_homepage_modules_type ON event_homepage_modules(type); 