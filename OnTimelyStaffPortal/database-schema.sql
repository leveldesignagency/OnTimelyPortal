-- OnTimely Staff Portal Database Schema
-- Run this in your Supabase SQL editor to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('Basic', 'Professional', 'Enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    admin_email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    max_users INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_active TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support tickets table
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

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('excellent', 'good', 'warning', 'critical')),
    target VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desktop app versions table
CREATE TABLE IF NOT EXISTS desktop_app_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('Windows', 'macOS', 'Linux')),
    download_url TEXT NOT NULL,
    release_notes TEXT,
    is_latest BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base articles table
CREATE TABLE IF NOT EXISTS knowledge_articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[],
    author_id UUID REFERENCES users(id),
    views INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_articles_updated_at BEFORE UPDATE ON knowledge_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO companies (name, domain, plan, admin_email, max_users) VALUES
('TechCorp Solutions', 'techcorp.com', 'Enterprise', 'admin@techcorp.com', 100),
('Startup.io', 'startup.io', 'Professional', 'hello@startup.io', 25),
('Enterprise Corp', 'enterprise.com', 'Enterprise', 'info@enterprise.com', 200)
ON CONFLICT (domain) DO NOTHING;

-- Insert sample users
INSERT INTO users (email, full_name, company_id, role) 
SELECT 
    'john.doe@techcorp.com',
    'John Doe',
    c.id,
    'admin'
FROM companies c WHERE c.domain = 'techcorp.com'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, full_name, company_id, role)
SELECT 
    'jane.smith@startup.io',
    'Jane Smith',
    c.id,
    'admin'
FROM companies c WHERE c.domain = 'startup.io'
ON CONFLICT (email) DO NOTHING;

-- Insert sample system metrics
INSERT INTO system_metrics (metric_name, metric_value, status, target) VALUES
('CPU Usage', '45%', 'good', '<60%'),
('Memory Usage', '68%', 'warning', '<70%'),
('Disk Usage', '72%', 'warning', '<80%'),
('Network Response', '180ms', 'good', '<200ms'),
('Database Query Time', '45ms', 'excellent', '<50ms')
ON CONFLICT DO NOTHING;

-- Insert sample desktop app versions
INSERT INTO desktop_app_versions (version, platform, download_url, release_notes, is_latest) VALUES
('2.1.0', 'Windows', 'https://downloads.ontimely.com/windows/2.1.0/OnTimely-Setup.exe', 'Enhanced chat functionality and improved performance', true),
('2.1.0', 'macOS', 'https://downloads.ontimely.com/macos/2.1.0/OnTimely.dmg', 'Enhanced chat functionality and improved performance', true),
('2.1.0', 'Linux', 'https://downloads.ontimely.com/linux/2.1.0/OnTimely.AppImage', 'Enhanced chat functionality and improved performance', true)
ON CONFLICT DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE desktop_app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (you can customize these based on your security requirements)
-- For now, allowing all operations for staff portal users
CREATE POLICY "Allow all operations for staff portal" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all operations for staff portal" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for staff portal" ON support_tickets FOR ALL USING (true);
CREATE POLICY "Allow all operations for staff portal" ON system_metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations for staff portal" ON desktop_app_versions FOR ALL USING (true);
CREATE POLICY "Allow all operations for staff portal" ON knowledge_articles FOR ALL USING (true);
CREATE POLICY "Allow all operations for staff portal" ON user_activity_logs FOR ALL USING (true);

-- Create a view for company statistics
CREATE OR REPLACE VIEW company_stats AS
SELECT 
    c.id,
    c.name,
    c.domain,
    c.plan,
    c.status,
    c.max_users,
    COUNT(u.id) as current_users,
    COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
    c.created_at
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name, c.domain, c.plan, c.status, c.max_users, c.created_at;

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    c.name as company_name,
    c.domain as company_domain,
    u.created_at,
    u.last_active
FROM users u
JOIN companies c ON u.company_id = c.id;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
