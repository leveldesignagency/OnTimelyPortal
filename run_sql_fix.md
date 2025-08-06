# Run This SQL in Supabase SQL Editor

Copy and paste the contents of `fix_reaction_functions_toggle.sql` into your Supabase SQL editor and run it.

This will fix the reaction functions to handle toggling properly instead of throwing exceptions.

## What This Fixes:

1. **GuestChatAdminScreen** - Can now react to others' messages (no more exceptions)
2. **GuestChatInterface** - Uses same toggle logic as GuestChatAdminScreen  
3. **GuestChatScreen** - Uses guest-specific toggle logic
4. **All screens** - Will sync reactions in real-time

## After Running the SQL:

1. Test reactions in GuestChatScreen (guest user)
2. Test reactions in GuestChatAdminScreen (admin user on mobile)
3. Test reactions in GuestChatInterface (admin user on desktop)
4. Verify that reactions sync across all screens

The key fix is that the RPC functions now handle toggling internally instead of throwing exceptions when a reaction already exists. 