# OnTimely Staff Portal Setup Guide

## 🚀 **Quick Start**

This portal integrates with your **existing OnTimely Supabase database** to manage companies, users, and provide staff support.

## 📋 **Prerequisites**

- Node.js 18+ installed
- Access to your existing OnTimely Supabase project
- **No additional services needed** - uses your existing Supabase setup!

## ⚙️ **Configuration**

### 1. **Environment Variables**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp env.example .env
```

**Required Variables:**
```env
# Your existing OnTimely Supabase project
VITE_SUPABASE_URL=https://ijsktwmevnqgzwwuggkf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**That's it!** No additional API keys needed - we use your existing Supabase setup.

### 2. **Get Your Credentials**

#### **Supabase (Already have these):**
- Go to your existing OnTimely Supabase project
- Navigate to Settings → API
- Copy the Project URL and anon public key

## 🛠️ **Installation**

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🎯 **Features**

### **Company Management**
- ✅ Create companies with subscription plans
- ✅ Set user limits
- ✅ View company statistics

### **User Management**
- ✅ Create individual users
- ✅ **Bulk user creation** (CSV upload or manual input)
- ✅ **Automatic welcome emails** with temporary passwords
- ✅ Password reset functionality
- ✅ Role and status management

### **Email Integration (via Supabase Auth)**
- ✅ **Welcome emails** sent automatically when users are created
- ✅ **Temporary passwords** generated securely
- ✅ **Login links** to dashboard.ontimely.co.uk
- ✅ **Password reset emails** using your existing Supabase setup
- ✅ **No additional services** - leverages your current infrastructure

## 📧 **How Emails Work**

The portal uses **Supabase Auth** (your existing setup) to:
1. **Create users** with temporary passwords
2. **Send welcome emails** through Supabase's built-in email service
3. **Handle password resets** using your existing password reset flow
4. **Integrate seamlessly** with your current authentication system

## 🔐 **Password Security**

- **12-character temporary passwords** with mixed case, numbers, and symbols
- **Supabase Auth integration** for secure password management
- **Automatic password reset** functionality
- **Email delivery** through your existing Supabase email service

## 🚨 **Important Notes**

### **Database Integration**
- ✅ **Uses your existing OnTimely tables** (`companies`, `users`, `teams`, `chats`, `messages`)
- ✅ **No new database creation** required
- ✅ **Respects existing triggers** and constraints
- ✅ **Foreign key relationships** maintained
- ✅ **Uses your existing Supabase Auth** for user management

### **Optional Tables**
If you want support ticket functionality, run the optional SQL:
```sql
-- Run this in your existing Supabase SQL editor
\i add-support-tickets.sql
```

## 🧪 **Testing**

1. **Create a company** - should appear in your `companies` table
2. **Create a user** - should appear in your `users` table + receive welcome email via Supabase
3. **Bulk create users** - upload CSV or type multiple users
4. **Reset passwords** - generates new temporary passwords + sends emails via Supabase

## 🔧 **Troubleshooting**

### **Emails not sending?**
- Check that your Supabase project has email enabled
- Verify your Supabase email settings in the dashboard
- Check browser console for errors

### **Database errors?**
- Ensure Supabase URL and key are correct
- Check that your existing tables match the expected schema
- Verify RLS policies allow the operations

### **Build errors?**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## 🚀 **Production Deployment**

Before going live:
1. **Verify Supabase Auth settings** in your production environment
2. **Test email functionality** in your production Supabase project
3. **Implement staff authentication** (OnTimelyStaff table)
4. **Set up proper RLS policies** for staff access
5. **Configure production Supabase** environment

## 📞 **Support**

The portal is designed to work seamlessly with your existing OnTimely infrastructure. All user and company data will be available in your desktop app immediately after creation.

**Benefits of using Supabase Auth:**
- ✅ **No additional services** to manage
- ✅ **Uses your existing** email infrastructure
- ✅ **Same security model** as your current app
- ✅ **Integrated user management** with your existing system
- ✅ **Password reset flow** matches your current setup

---

**Ready to manage your OnTimely users like a pro! 🎉**
