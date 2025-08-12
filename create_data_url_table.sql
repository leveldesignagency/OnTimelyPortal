-- Create a table for storing data URLs separately
CREATE TABLE IF NOT EXISTS guests_chat_data_urls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES guests_chat_messages(message_id) ON DELETE CASCADE,
    data_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE guests_chat_data_urls ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read data URLs" ON guests_chat_data_urls
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert data URLs" ON guests_chat_data_urls
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guests_chat_data_urls_message_id ON guests_chat_data_urls(message_id); 