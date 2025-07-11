# Timely Guest Login & Access Flow

_Last updated: 2025-07-10_

## 1. Guest Account Generation (Admin/Desktop App)
- Admins use the EventPortalManagementPage to generate guest credentials.
- The app calls a Supabase RPC (e.g., `create_guest_login`) for each guest.
- The RPC:
  - Generates a random password.
  - Stores the guest’s email, password, guest_id, and event_id in the `guest_logins` table.
  - Optionally updates the `guests` table.
- **No manual input is required for each guest**—the process is automated for all selected guests.

## 2. Credential Storage
- Credentials (email, password, guest_id, event_id) are stored in the `guest_logins` table.
- The `guests` table is also updated/created as needed.
- Guests do **not** get a row in `auth.users` unless explicitly created via the Supabase Auth API (not currently used for guests).

## 3. Guest Login (Mobile App)
- The guest enters their email and password in the mobile app.
- The app calls a custom RPC (`validate_guest_login`) to check credentials against the `guest_logins` table.
- If the credentials match, the RPC returns the guest_id and event_id.
- The app then calls another secure RPC (e.g., `get_guest_profile`) with guest_id and event_id to fetch the guest’s profile.
- **No Supabase Auth session is set for guests.**

## 4. Session/Auth Context
- **Guests are NOT Supabase Auth users.**
- No Supabase Auth session is set for guests.
- RLS policies using `auth.email()` or `auth.uid()` do **not** work for guests.
- All guest data access is via secure custom RPCs.

## 5. Access Control
- All access control for guests is enforced in custom RPCs (e.g., `validate_guest_login`, `get_guest_profile`).
- RLS is not used for guest access. RLS is used for company/admin access as needed.
- Example: For public read access (for debugging), a policy like `USING (true)` can be temporarily enabled, but should be removed for production.

## 6. Security Notes
- All sensitive guest data access must be protected in your RPCs.
- Do not expose guest passwords or sensitive info in public policies.
- If you ever want to use RLS for guests, you must migrate to Supabase Auth for guest users.

---

## Summary Table

| Step                | How it works now                    |
|---------------------|-------------------------------------|
| Guest creation      | Automated via RPC, not manual       |
| Credentials stored  | In `guest_logins` table             |
| Login verification  | Custom RPC checks email/password    |
| Auth session        | **Not set** (no Supabase Auth)      |
| Guest data access   | Secure custom RPCs only             |
| RLS policies        | **Not used for guests**; only for company/admin users | 