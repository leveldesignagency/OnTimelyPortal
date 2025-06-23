# 🚀 Supabase Real-Time Backend Setup for Timely

## Step 1: Create Your Supabase Account & Project

1. **Go to [supabase.com](https://supabase.com) and sign up for free**
   - No credit card required for the free tier
   - Free tier includes: 500MB database, 2GB bandwidth, 50MB file storage

2. **Create a new project**
   - Click "New Project"
   - Choose organization (or create one)
   - Project name: `timely-events`
   - Database password: Create a strong password (save it!)
   - Region: Choose closest to your users

3. **Wait for project to be ready** (takes 1-2 minutes)

## Step 2: Get Your Project Credentials

1. **Go to Project Settings > API**
2. **Copy these values:**
   - Project URL: `https://[your-project-id].supabase.co`
   - Anon public key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Configure Your Environment

1. **Create `.env.local` file in `apps/desktop/`:**
```bash
# Copy .env.example to .env.local
cp .env.example .env.local
```

2. **Add your Supabase credentials to `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Create Database Tables

**Go to your Supabase dashboard > SQL Editor and run:**

```sql
-- Create events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  "from" VARCHAR NOT NULL,
  "to" VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create guests table
CREATE TABLE guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  "firstName" VARCHAR NOT NULL,
  "middleName" VARCHAR,
  "lastName" VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  "contactNumber" VARCHAR NOT NULL,
  "countryCode" VARCHAR NOT NULL,
  "idType" VARCHAR NOT NULL,
  "idNumber" VARCHAR NOT NULL,
  dob DATE,
  gender VARCHAR,
  "groupId" VARCHAR,
  "groupName" VARCHAR,
  modules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - you can restrict later)
CREATE POLICY "Enable all operations for events" ON events FOR ALL USING (true);
CREATE POLICY "Enable all operations for guests" ON guests FOR ALL USING (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE guests;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 5: Test Your Setup

1. **Start your development server:**
```bash
npm run dev
```

2. **Open browser console and look for:**
   - No Supabase connection errors
   - Real-time subscription messages when you add/edit data

## Step 6: Add Sample Data (Optional)

**Go to Supabase dashboard > SQL Editor:**

```sql
-- Insert sample event
INSERT INTO events (name, "from", "to", status) VALUES 
('Tech Conference 2024', '2024-03-15', '2024-03-17', 'active');

-- Get the event ID and insert sample guests
INSERT INTO guests (event_id, "firstName", "lastName", email, "contactNumber", "countryCode", "idType", "idNumber") VALUES 
((SELECT id FROM events WHERE name = 'Tech Conference 2024'), 'John', 'Doe', 'john@example.com', '1234567890', '+1', 'passport', 'P123456789'),
((SELECT id FROM events WHERE name = 'Tech Conference 2024'), 'Jane', 'Smith', 'jane@example.com', '0987654321', '+1', 'license', 'L987654321');
```

## 🎉 You're Ready!

Your Supabase backend is now set up with:
- ✅ Real-time database subscriptions
- ✅ Automatic API generation
- ✅ Type-safe operations
- ✅ Connection monitoring

## Next Steps

1. **Integrate with your EventDashboardPage:**
   - Import the hooks: `import { useRealtimeGuests, useRealtimeEvents } from '../hooks/useRealtime'`
   - Replace static data with real-time data

2. **Enable authentication** (when ready):
   - Go to Authentication > Settings in Supabase
   - Enable email/password or OAuth providers

3. **Add file storage** (for ID uploads):
   - Go to Storage in Supabase dashboard
   - Create buckets for file uploads

## 🔧 Troubleshooting

**Connection Issues:**
- Check your environment variables are correct
- Ensure your Supabase project is running
- Check browser console for errors

**Real-time Not Working:**
- Verify tables are added to the realtime publication
- Check Row Level Security policies
- Ensure your subscription code is correct

**Need Help?**
- Check the browser console for detailed error messages
- Visit [Supabase Docs](https://supabase.com/docs)
- Join [Supabase Discord](https://discord.supabase.com)

---

**Free Tier Limits:**
- 500MB database storage
- 2GB bandwidth per month  
- 50MB file storage
- 50,000 monthly active users

Perfect for development and small production apps! 🚀 