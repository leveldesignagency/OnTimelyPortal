-- Add Support Tickets table to existing OnTimely database
-- Run this in your Supabase SQL Editor

-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
    assigned_to VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Create updated_at trigger for support tickets
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policy for staff portal access
CREATE POLICY "Allow all operations for staff portal" ON support_tickets FOR ALL USING (true);

-- Insert some sample support tickets
INSERT INTO support_tickets (title, description, user_id, company_id, category, priority, status) VALUES
('Login Issue', 'User cannot log into the desktop app', 
 (SELECT id FROM users LIMIT 1), 
 (SELECT id FROM companies LIMIT 1), 
 'Authentication', 'high', 'open'),
('Feature Request', 'Add dark mode to the chat interface', 
 (SELECT id FROM users LIMIT 1), 
 (SELECT id FROM companies LIMIT 1), 
 'Feature Request', 'medium', 'open'),
('Performance Issue', 'Chat messages are loading slowly', 
 (SELECT id FROM users LIMIT 1), 
 (SELECT id FROM companies LIMIT 1), 
 'Performance', 'medium', 'in-progress')
ON CONFLICT DO NOTHING;
