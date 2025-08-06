# Guest Chat Fix Summary

## Problem
The guest chat system was failing with the error:
```
[GUESTS_CHAT] Error sending message: {"code":"42702","details":"It could refer to either a PL/pgSQL variable or a table column.","hint":null,"message":"column reference \"message_id\" is ambiguous"}
```

This error was occurring on all three screens:
- GuestChatScreen
- GuestChatAdminScreen  
- GuestChatInterface

## Root Cause
The issue was caused by **ambiguous column references** in the `send_guests_chat_message` function. Specifically:

1. **Multiple function versions**: There were multiple versions of the `send_guests_chat_message` function with different signatures
2. **Ambiguous column names**: The SQL queries were referencing `message_id` without specifying which table it came from
3. **Table structure confusion**: The system has both old (`chat_messages` with `id`) and new (`guests_chat_messages` with `message_id`) table structures

## Solution
Created a comprehensive fix that:

### 1. **Drops all conflicting function versions**
```sql
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
-- ... and others
```

### 2. **Creates a single, correct function**
The new `send_guests_chat_message` function:
- Uses explicit column names to avoid ambiguity
- Properly handles both admin users and guests
- Returns JSON with success/error status
- Creates read receipts for all participants

### 3. **Key improvements**
- **Explicit column references**: Uses `gcm.message_id` instead of just `message_id`
- **Proper authorization**: Checks if user is admin or guest for the event
- **Company isolation**: Ensures users can only send messages to events in their company
- **Error handling**: Returns proper JSON error responses

## Files Created
1. `comprehensive_guest_chat_fix.sql` - Main fix
2. `test_guest_chat_fix.sql` - Verification tests
3. `fix_ambiguous_message_id.sql` - Alternative fix

## How to Apply the Fix

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `comprehensive_guest_chat_fix.sql`
4. Run the script

### Option 2: Supabase CLI
```bash
supabase db push --file comprehensive_guest_chat_fix.sql
```

## Verification
After applying the fix, run `test_guest_chat_fix.sql` to verify:
- Functions exist with correct signatures
- Tables have proper structure
- No ambiguous column references remain

## Expected Result
After the fix:
- ✅ Messages can be sent from all three screens
- ✅ No more "ambiguous column reference" errors
- ✅ Proper authorization checks work
- ✅ Read receipts are created correctly

## Technical Details

### Function Signature
```sql
send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
)
```

### Authorization Logic
1. **Admin users**: Must be assigned to the event via team_events
2. **Guest users**: Must be in the guests table for the event
3. **Company isolation**: All users must belong to the same company as the event

### Table Structure
- `guests_chat_messages`: Stores all messages with `message_id` as primary key
- `guests_chat_participants`: Tracks who can participate in each event
- `guests_chat_receipts`: Tracks read receipts for messages

## Testing
To test the fix:
1. Try sending a message from GuestChatInterface
2. Try sending a message from GuestChatAdminScreen  
3. Try sending a message from GuestChatScreen
4. Verify messages appear in real-time
5. Check that read receipts are created

The fix should resolve the ambiguous column reference error and allow messages to be sent successfully from all three screens. 