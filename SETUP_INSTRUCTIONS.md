# Teams Chat Setup Instructions

## Step 1: Set up Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `SUPABASE_CHAT_SETUP.sql` into the SQL editor
4. Click **Run** to execute all the SQL commands

This will create:
- ✅ Companies table (multi-tenant isolation)
- ✅ Users table (company-specific users)
- ✅ Chats table (direct messages and group chats)
- ✅ Chat participants table
- ✅ Messages table
- ✅ Message reactions table
- ✅ Row-level security policies
- ✅ Real-time subscriptions
- ✅ Test data with 2 users

## Step 2: Test the Login

1. Make sure your development server is running:
   ```bash
   cd apps/desktop/renderer
   npm run dev
   ```

2. Navigate to `http://localhost:5174/login`

3. Use these test credentials:

   **Master Admin:**
   - Email: `admin@testcompany.com`
   - Password: `admin123`

   **Regular User:**
   - Email: `user@testcompany.com`  
   - Password: `user123`

## Step 3: Test Real-time Chat

1. Login with the Admin user
2. You should see the existing chat between Admin and Regular User
3. Open another browser tab/window (or incognito mode)
4. Login with the Regular User account
5. Send messages from both accounts - they should appear in real-time!

## Features Working:

✅ **Authentication**
- Simple login/logout
- User session persistence
- Multi-tenant data isolation

✅ **Real-time Chat**
- Send/receive messages instantly
- User status indicators
- Company-specific user lists
- Direct messaging

✅ **User Management**
- Create new direct chats
- View company users
- Online/offline status

## Test Scenarios:

1. **Login as Admin** → Should see existing chat with Regular User
2. **Login as Regular User** → Should see same chat from other perspective  
3. **Send messages** → Should appear instantly in both browser tabs
4. **Create new chat** → Click "New Chat" and select a user
5. **Real-time updates** → Messages sync automatically

## Next Steps:

Once basic chat is working, we can add:
- Group chats
- File sharing
- Message reactions
- Push notifications
- Message search
- User profiles

## Troubleshooting:

- **Can't login?** → Check Supabase connection status
- **No real-time updates?** → Check browser console for WebSocket errors
- **Empty chat list?** → Verify test data was inserted correctly
- **Database errors?** → Check Supabase logs in dashboard

The system is now ready for testing! 🚀 