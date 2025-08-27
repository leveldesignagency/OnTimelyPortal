# OnTimely Staff Portal - Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project name: `OnTimely Staff Portal`
5. Enter database password (save this!)
6. Choose region closest to you
7. Click "Create new project"

### Step 2: Get Your Credentials
1. Wait for project to finish setting up (2-3 minutes)
2. Go to **Settings** → **API**
3. Copy these values:
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 3: Set Up Database
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `database-schema.sql`
3. Paste it into the SQL editor
4. Click "Run" to create all tables and sample data

### Step 4: Configure Environment
1. In your `OnTimelyStaffPortal` folder, copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 5: Start the Portal
```bash
npm run dev
```

🎉 **You're done!** The portal will open with real data from Supabase.

## 🔍 Verify Everything is Working

### Check Database Tables
1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - `companies` (with 3 sample companies)
   - `users` (with 2 sample users)
   - `support_tickets`
   - `system_metrics` (with 5 sample metrics)
   - `desktop_app_versions` (with 3 sample versions)

### Test the Portal
1. **Dashboard**: Should show real counts from your database
2. **Companies**: Should display the 3 sample companies
3. **Users**: Should show the 2 sample users
4. **Create Test**: Try adding a new company or user

## 🛠️ Troubleshooting

### "Missing Supabase environment variables"
- Make sure you copied `env.example` to `.env`
- Check that your `.env` file has the correct values
- Restart the dev server after changing `.env`

### "Table doesn't exist" errors
- Go to Supabase SQL Editor
- Run the `database-schema.sql` script again
- Check that all tables were created successfully

### "Permission denied" errors
- In Supabase, go to **Authentication** → **Policies**
- Make sure RLS policies are enabled
- Check that the "Allow all operations for staff portal" policy exists

### Charts not showing data
- This is normal for new databases - charts need time-series data
- The sample data includes some metrics, but activity charts will be empty initially
- Data will populate as you use the system

## 📊 Sample Data Included

The setup script creates:

- **3 Companies**: TechCorp Solutions, Startup.io, Enterprise Corp
- **2 Users**: John Doe (TechCorp), Jane Smith (Startup.io)
- **5 System Metrics**: CPU, Memory, Disk, Network, Database
- **3 App Versions**: Windows, macOS, Linux versions

## 🔐 Security Notes

- The current setup allows all operations for development
- For production, you'll want to implement proper authentication
- Consider adding user roles and permissions
- Review RLS policies for your security requirements

## 🚀 Next Steps

1. **Customize**: Modify company plans, user roles, etc.
2. **Add Real Data**: Create your actual companies and users
3. **Configure Auth**: Set up proper user authentication
4. **Deploy**: Build and deploy to production

## 📞 Need Help?

- Check the browser console for error messages
- Verify your Supabase project is active
- Ensure all environment variables are set correctly
- The database schema should create everything automatically
