# Google OAuth Setup for SaaS Application

This guide explains how to set up Google OAuth for your SaaS application so that **any user** can connect their Google Calendar to your app.

## Overview

Unlike hardcoded credentials that only work for one account, this setup creates a **multi-tenant OAuth application** where:
- Each user authenticates with their own Google account
- Your app acts as an OAuth client that requests permission from users
- Users can grant/revoke access to their Google Calendar independently

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Name it something like "YourSaaS-OAuth" or your company name

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (this allows any Google user to connect)
3. Fill out the required fields:
   - **App name**: Your SaaS application name
   - **User support email**: Your support email
   - **Developer contact information**: Your email
4. **Scopes**: Add `https://www.googleapis.com/auth/calendar.readonly`
5. **Test users**: You can add test users during development
6. Submit for verification (required for production)

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: "YourSaaS Web Client"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `http://localhost`
     - `https://yourdomain.com` (your production domain)
   - **Authorized redirect URIs**: (leave empty for JavaScript-only flow)

## Step 5: Get Your Credentials

After creating the OAuth client, you'll get:
- **Client ID**: `1234567890-abcdef.apps.googleusercontent.com`
- **Client Secret**: (not needed for frontend-only auth)

## Step 6: Create API Key

1. In **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Restrict the key:
   - **Application restrictions**: HTTP referrers
   - **API restrictions**: Google Calendar API

## Step 7: Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Your OAuth Client ID (allows any user to connect)
VITE_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com

# Your API Key
VITE_GOOGLE_API_KEY=your-actual-api-key
```

## Step 8: Update Production Domains

When you deploy your SaaS:

1. Go back to **APIs & Services > Credentials**
2. Edit your OAuth client
3. Add your production domain to **Authorized JavaScript origins**:
   - `https://yourdomain.com`
   - `https://app.yourdomain.com`

## How It Works for Users

1. **User clicks "Connect Google Calendar"** in your app
2. **Google OAuth popup** opens asking for permission
3. **User grants permission** to access their calendar
4. **Your app receives access token** for that specific user
5. **User's calendar data** is fetched and displayed in your app

## Security Notes

- ✅ **Each user authenticates individually** - no shared accounts
- ✅ **Users can revoke access** anytime in their Google account settings
- ✅ **Access tokens are user-specific** and expire automatically
- ✅ **Your app never sees user passwords** - only OAuth tokens
- ✅ **Scoped permissions** - only calendar read access, not full Google account

## Testing

1. Set up the credentials as described above
2. Add `http://localhost:3000` to authorized origins
3. Test with multiple different Google accounts
4. Each user should be able to connect independently

## Production Deployment

1. Set environment variables in your hosting platform:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your-client-id
   VITE_GOOGLE_API_KEY=your-api-key
   ```

2. Update OAuth client with production domains

3. Submit app for Google verification if needed

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Add your domain to Authorized JavaScript origins

**Error: "access_denied"**
- User declined permission - this is normal

**Error: "invalid_client"**
- Check your Client ID is correct in environment variables

**Error: "App not verified"**
- Submit your app for Google verification for production use 