# Timely SaaS: Secure User & Email Connection Flow

This document outlines the recommended flow for secure, scalable user onboarding and email sending in the Timely SaaS platform.

---

## 1. Controlled Access: Only Approved Users Can Sign Up

- **No open sign-up.**
- Users must be invited or approved by Timely staff/developers.
- Staff/admins create accounts or send invite links.
- Users receive credentials or a magic link to log in.
- Only approved users can log in (enforced in backend).

---

## 2. Require Email Connection After Login

- After login, users **must connect their email provider** (Gmail, Outlook, etc.) before sending emails.
- UI enforces this: blocks "Send" actions until email is connected.
- Prompt/modal guides users to connect their email.

---

## 3. How the Flow Looks

1. User is invited or approved by Timely staff.
2. User logs in with credentials.
3. User is prompted to connect their email account (OAuth).
4. User can now send emails from their own account.

---

## 4. Why This Works

- **Security:** Only approved users access the app.
- **Compliance:** Timely never handles user email credentials directly.
- **Cost:** Timely is not billed for user email usage.
- **Scalability:** Easy to add more providers or change approval as you grow.

---

## 5. What You Need to Build

- **Backend:**
  - User management with "approved" or "invited" status.
  - Admin UI or API for staff to approve/invite users.
- **Frontend:**
  - Login page (email/password or magic link).
  - "Connect your email" prompt after login.
  - Block email-sending features until connected.
- **OAuth Integration:**
  - Gmail, Outlook, etc.

---

## 6. Optional: Separate Admin Portal

- A separate "Timely Admin" portal for staff to:
  - Approve/invite users
  - Manage permissions
  - View usage, etc.

---

### **Summary Diagram**

```
[User requests access] --> [Timely Staff Approves] --> [User logs in] --> [User connects email] --> [User can send emails]
``` 

This document outlines the recommended flow for secure, scalable user onboarding and email sending in the Timely SaaS platform.

---

## 1. Controlled Access: Only Approved Users Can Sign Up

- **No open sign-up.**
- Users must be invited or approved by Timely staff/developers.
- Staff/admins create accounts or send invite links.
- Users receive credentials or a magic link to log in.
- Only approved users can log in (enforced in backend).

---

## 2. Require Email Connection After Login

- After login, users **must connect their email provider** (Gmail, Outlook, etc.) before sending emails.
- UI enforces this: blocks "Send" actions until email is connected.
- Prompt/modal guides users to connect their email.

---

## 3. How the Flow Looks

1. User is invited or approved by Timely staff.
2. User logs in with credentials.
3. User is prompted to connect their email account (OAuth).
4. User can now send emails from their own account.

---

## 4. Why This Works

- **Security:** Only approved users access the app.
- **Compliance:** Timely never handles user email credentials directly.
- **Cost:** Timely is not billed for user email usage.
- **Scalability:** Easy to add more providers or change approval as you grow.

---

## 5. What You Need to Build

- **Backend:**
  - User management with "approved" or "invited" status.
  - Admin UI or API for staff to approve/invite users.
- **Frontend:**
  - Login page (email/password or magic link).
  - "Connect your email" prompt after login.
  - Block email-sending features until connected.
- **OAuth Integration:**
  - Gmail, Outlook, etc.

---

## 6. Optional: Separate Admin Portal

- A separate "Timely Admin" portal for staff to:
  - Approve/invite users
  - Manage permissions
  - View usage, etc.

---

### **Summary Diagram**

```
[User requests access] --> [Timely Staff Approves] --> [User logs in] --> [User connects email] --> [User can send emails]
``` 