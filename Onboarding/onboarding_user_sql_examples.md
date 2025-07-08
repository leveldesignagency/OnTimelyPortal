# Timely Onboarding Guide: Adding New Companies & Users

## 1. Create a New Company (if needed)

Run this in the Supabase SQL Editor:

```sql
INSERT INTO companies (id, name, created_at, updated_at)
VALUES (gen_random_uuid(), 'COMPANY NAME HERE', NOW(), NOW())
RETURNING id;
```
- Copy the returned `id` (company_id) for use in the next step.

---

## 2. Add a New User (after creating in Supabase Auth)

- Use the Auth UID as `id`, and the `company_id` from above.

**Template for any new user:**

```sql
INSERT INTO users (
  id, company_id, email, name, role, status, created_at, updated_at
) VALUES (
  'NEW_SUPABASE_AUTH_UID',      -- Supabase Auth UID (from Auth dashboard)
  'NEW_COMPANY_ID',             -- company_id (from previous step)
  'user@email.com',             -- User's email
  'User Name',                  -- User's name
  'user',                       -- Role
  'online',                     -- Status
  NOW(),
  NOW()
);
```

---

## 3. Bulk User Onboarding (Template)

For onboarding multiple users at once (after creating them in Supabase Auth):

```sql
INSERT INTO users (
  id, company_id, email, name, role, status, created_at, updated_at
) VALUES
  ('UID_1', 'COMPANY_UUID_1', 'email1@example.com', 'Name 1', 'user', 'online', NOW(), NOW()),
  ('UID_2', 'COMPANY_UUID_2', 'email2@example.com', 'Name 2', 'user', 'online', NOW(), NOW()),
  ('UID_3', 'COMPANY_UUID_3', 'email3@example.com', 'Name 3', 'user', 'online', NOW(), NOW());
-- Add more rows as needed for each user
```

---

## 4. Staff Onboarding Checklist

1. **Add user in Supabase Auth** (Dashboard > Authentication > Users > Add user)
2. **Copy the UID** from the Auth user
3. **If this is a new company, create a company row** and copy the new company_id
4. **Insert the user row** in the users table with the correct UID and company_id
5. **(Bulk)** Repeat for each user as needed
6. **Done!** User(s) can now log in and access only their company's data

---

## 5. Troubleshooting & Error Fixes

### **A. Email Not Confirmed**
- **Symptom:** User cannot log in, sees "Email not confirmed" error.
- **Fix:** Manually confirm the email in the database:

```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@email.com';
```
- Or, resend the confirmation email from the Supabase Auth dashboard and have the user click the link.

### **B. Duplicate User ID Error**
- **Symptom:** Error about duplicate key value for user ID.
- **Fix:**
  - Update the existing user row if you want to change company or details:
    ```sql
    UPDATE users SET company_id = 'NEW_COMPANY_ID', ... WHERE id = 'EXISTING_UID';
    ```
  - Or, delete the user row and re-insert:
    ```sql
    DELETE FROM users WHERE id = 'EXISTING_UID';
    -- Then re-run the INSERT
    ```

### **C. Foreign Key Constraint on company_id**
- **Symptom:** Error about company_id not present in companies table.
- **Fix:**
  - Make sure the company row exists in the `companies` table before inserting the user.

### **D. Password Hash Not Null Error**
- **Symptom:** Error about null value in password_hash column.
- **Fix:**
  - Make the column nullable:
    ```sql
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ```
  - Or, remove the column if not needed.

### **E. RLS (Row Level Security) Errors**
- **Symptom:** "new row violates row-level security policy" or "unauthorized" errors.
- **Fix:**
  - Ensure the user's `id` matches the Supabase Auth UID.
  - Ensure the user's `company_id` matches the event or data they are trying to access.
  - Check that the user has a row in the `users` table with the correct info.
  - Check that the RLS policies are correct and enabled.

---

## FAQ

- **Q: Do I need to provide a password hash?**
  - **A:** No, Supabase Auth manages passwords. The `password_hash` column is not required for new users.
- **Q: What if a user is joining an existing company?**
  - **A:** Use the existing company_id for that company.
- **Q: Can I automate this?**
  - **A:** Yes! This process can be scripted or built into an admin tool for your staff.

---

**Store this guide in the `Onboarding` folder for easy access by your team.** 
 