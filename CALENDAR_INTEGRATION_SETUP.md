# Calendar Integration Setup Guide

This guide will help you set up Google Calendar and Outlook Calendar integration for the Timely application.

## Overview

The calendar integration allows users to:
- Connect their Google Calendar and/or Outlook Calendar accounts
- View external calendar events alongside local events
- Sync events automatically
- Maintain separate visual indicators for each calendar source

## Prerequisites

- Google Cloud Console account (for Google Calendar)
- Azure Portal account (for Outlook Calendar)
- Basic understanding of OAuth 2.0

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the consent screen if prompted
4. Select "Web application" as the application type
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - Your production domain
6. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - Your production domain
7. Save and copy the Client ID

### 3. Create API Key

1. In "Credentials", click "Create Credentials" > "API Key"
2. Restrict the API key to Google Calendar API
3. Copy the API key

## Outlook Calendar Setup

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Enter application details:
   - Name: "Timely Calendar Integration"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost:3000` (for development)

### 2. Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission" > "Microsoft Graph"
3. Select "Delegated permissions"
4. Add the following permissions:
   - `Calendars.Read`
   - `User.Read` (usually added by default)
5. Click "Grant admin consent" if you have admin privileges

### 3. Get Client ID

1. Go to "Overview" in your app registration
2. Copy the "Application (client) ID"

## Environment Configuration

1. Copy `apps/desktop/renderer/.env.example` to `apps/desktop/renderer/.env`
2. Fill in your credentials:

```env
# Google Calendar Integration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_API_KEY=your_google_api_key_here

# Outlook Calendar Integration
VITE_OUTLOOK_CLIENT_ID=your_outlook_client_id_here
```

## Testing the Integration

1. Start the development server: `npm run dev`
2. Navigate to the Calendar page
3. In the "Today's Events" panel, you'll see a "Calendar Integration" section
4. Click "Connect Google Calendar" or "Connect Outlook Calendar"
5. Complete the OAuth flow in the popup window
6. Once connected, external events should appear with colored badges

## Troubleshooting

### Google Calendar Issues

- **"Access blocked" error**: Make sure your domain is added to authorized origins
- **"Invalid client" error**: Check that your Client ID is correct
- **No events showing**: Verify API key restrictions and Calendar API is enabled

### Outlook Calendar Issues

- **"AADSTS50011" error**: Check redirect URI configuration
- **Permission denied**: Ensure proper API permissions are granted
- **No events loading**: Verify client ID and permission scopes

### General Issues

- **CORS errors**: Ensure proper domain configuration in both Google and Azure
- **Token expiration**: The app handles token refresh automatically
- **Local storage**: Clear browser storage if experiencing authentication issues

## Security Considerations

- Never commit your `.env` file to version control
- Use environment-specific credentials for development and production
- Regularly review and rotate API keys and client secrets
- Consider implementing additional security measures for production deployments

## Features

### Current Features
- OAuth authentication for both Google and Outlook
- Event syncing and display
- Visual indicators for event sources
- Automatic token refresh
- Connection status display

### Future Enhancements
- Bi-directional sync (create events in external calendars)
- Multiple calendar support per provider
- Event conflict detection
- Calendar-specific filtering options
- Offline event caching

## Support

If you encounter issues with the calendar integration:

1. Check the browser console for error messages
2. Verify your OAuth configuration
3. Ensure all required permissions are granted
4. Test with a fresh browser session (incognito mode)

For additional support, please refer to the official documentation:
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Microsoft Graph Calendar API Documentation](https://docs.microsoft.com/en-us/graph/api/resources/calendar) 