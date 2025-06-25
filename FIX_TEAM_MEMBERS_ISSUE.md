# Fix: No Team Members Showing Up in Chat

## Problem
When clicking "New Chat" or trying to create a group, no team members appear in the user list. This is because the `getCompanyUsers()` function returns an empty array.

## Root Cause
The issue is caused by **Row Level Security (RLS) policies** in Supabase that are incompatible with our custom authentication system. The RLS policies expect `auth.uid()` to be set (from Supabase Auth), but since we're using custom login, `auth.uid()` is `null`, causing all queries to return empty results.

## Solution Steps

### 1. Run the Updated Test Data Script
First, ensure the test data includes the required `password_hash` field:

```sql
-- Run this in your Supabase SQL Editor
-- Copy and paste the contents of INSERT_TEST_DATA.sql
```

### 2. Fix the RLS Policies
Run the RLS fix script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of fix_rls_for_custom_auth.sql
```

### 3. Debug the Database (Optional)
To verify the data is properly inserted, run:

```sql
-- Copy and paste the contents of debug_database.sql
```

## Expected Results After Fix

1. **Company Users**: You should see 4 users in the same company:
   - Admin User (admin@testcompany.com)
   - Regular User (user@testcompany.com) 
   - Alice Smith (alice@testcompany.com)
   - Bob Johnson (bob@testcompany.com)

2. **New Chat**: When you click "New Chat" and start typing, you should see other team members appear in the search results.

3. **Group Creation**: When creating a group, you should see all team members available for selection.

## Test Login Credentials

You can test with any of these accounts:
- **Admin**: admin@testcompany.com / admin123
- **User**: user@testcompany.com / user123  
- **Alice**: alice@testcompany.com / alice123
- **Bob**: bob@testcompany.com / bob123

## Debugging Logs

The app now includes debug logs in the browser console:
- `🔍 Loading company users for company: [company_id]`
- `👥 Raw company users from database: [array]`
- `👥 Converted company users: [array]`
- `🔍 Searching with query: [search_term]`
- `🔍 User search results: [results]`

## Production Note

⚠️ **Important**: The RLS fix makes the database permissive for development. In production, you should either:
1. Implement proper RLS policies that work with your custom auth system
2. Switch to Supabase Auth for proper security
3. Implement server-side API endpoints with proper authentication

## Files Modified

- `INSERT_TEST_DATA.sql` - Added password_hash field
- `fix_rls_for_custom_auth.sql` - Fixed RLS policies  
- `debug_database.sql` - Debug queries
- `apps/desktop/renderer/src/lib/auth.ts` - Added login credentials for Alice & Bob
- `apps/desktop/renderer/src/TeamChatPage.tsx` - Added debugging logs and better error messages
