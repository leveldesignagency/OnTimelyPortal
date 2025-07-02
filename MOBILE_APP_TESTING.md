# Timely Mobile App Testing Guide

## Overview
The Timely mobile app provides a timeline-based interface for event management with dual authentication for admins and guests.

## Setup Instructions

### 1. Database Setup
First, add Charles Morgan as a test user by running the SQL script:

```bash
# Navigate to the project root
cd /Users/charlesmorgan/Documents/Timely

# Run the SQL script in your Supabase database
# You can use the Supabase dashboard SQL editor or psql
```

Execute the contents of `sql/add_charles_morgan.sql` in your Supabase database.

### 2. Start the Mobile App

```bash
# Navigate to the mobile app directory
cd timely-mobile

# Start the development server
npm start
```

## Login Credentials

### Admin Login
- **Email**: `charles@timely.com`
- **Password**: `timelytest123`
- **Role**: Admin with full access to timeline and event management

### Guest Login
Guest logins are generated dynamically through the desktop app's Event Portal Management page. To test guest login:

1. Open the desktop app
2. Navigate to Event Portal Management
3. Select guests and click "Generate Login"
4. Use the generated email/password in the mobile app's Guest tab

## Testing on iPhone

### Option 1: Expo Go App (Recommended for Quick Testing)
1. Install Expo Go from the App Store
2. Scan the QR code displayed in the terminal
3. The app will load directly on your device

### Option 2: iOS Simulator
1. Install Xcode from the Mac App Store
2. Open Xcode and install iOS Simulator
3. In the terminal, press `i` to open in iOS Simulator
4. Select your preferred iPhone model

### Option 3: Development Build (For Production Testing)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Build for iOS
eas build --platform ios --profile development

# Install the build on your device
eas build:install
```

## App Features

### Admin Users
- **Timeline View**: Main screen showing chronological events
- **Event Management**: View and manage event details
- **Real-time Sync**: Automatic updates across devices
- **Search Functionality**: Find events and guests quickly

### Guest Users
- **Guest Dashboard**: Simplified interface for guests
- **Check-in/Check-out**: Simple tap-to-check-in functionality
- **Event Information**: View relevant event details
- **Limited Access**: Security-focused guest experience

## Authentication Flow

### Dual Login System
The app features two distinct login paths:

1. **Admin Tab**: For authorized users with full system access
2. **Guest Tab**: For temporary guest access with limited permissions

### Session Management
- Admin sessions use Supabase authentication
- Guest sessions are managed locally with expiration validation
- Automatic session cleanup on logout

## Testing Scenarios

### 1. Admin Login Test
1. Open the app
2. Select "Admin" tab
3. Enter Charles Morgan's credentials
4. Verify timeline loads with events
5. Test navigation and search features

### 2. Guest Login Test
1. Generate guest credentials via desktop app
2. Select "Guest" tab in mobile app
3. Enter generated credentials
4. Verify guest dashboard loads
5. Test check-in functionality

### 3. Session Expiration Test
1. Login as guest
2. Wait for session to expire (or modify expiration in database)
3. Verify automatic logout and redirect to login

### 4. Real-time Sync Test
1. Login on mobile app
2. Make changes in desktop app
3. Verify changes appear in mobile app
4. Test bidirectional sync

## Troubleshooting

### Common Issues

#### "Invalid guest credentials" Error
- Ensure guest login was generated in desktop app
- Check that guest login hasn't expired
- Verify guest is associated with an active event

#### "Profile not found" Error
- Ensure Charles Morgan user exists in database
- Run the SQL script to create the user
- Verify company association

#### App Won't Load
- Check internet connection
- Verify Supabase configuration
- Restart the development server

### Debug Mode
Enable debug logging by adding to your environment:
```javascript
// In your app, add:
console.log('Debug mode enabled');
```

## File Structure

### Key Files
- `App.tsx` - Main app component with authentication logic
- `screens/LoginScreen.tsx` - Dual login interface
- `screens/TimelineScreen.tsx` - Main timeline for admins
- `screens/GuestsScreen.tsx` - Guest dashboard
- `lib/auth.ts` - Authentication functions
- `lib/supabase.ts` - Database configuration

### Configuration Files
- `app.json` - App configuration and iOS settings
- `package.json` - Dependencies and scripts
- `sql/add_charles_morgan.sql` - User creation script

## Next Steps

### Recommended Enhancements
1. Push notifications for event updates
2. Offline mode for limited functionality
3. Advanced search and filtering
4. Photo upload for check-ins
5. Analytics and reporting

### Production Deployment
1. Configure production Supabase instance
2. Set up proper environment variables
3. Build signed iOS/Android releases
4. Submit to App Store/Play Store

## Support

For issues or questions:
1. Check the console logs for errors
2. Verify database connections
3. Ensure all dependencies are installed
4. Test with fresh guest credentials

The mobile app is designed to work seamlessly with the existing Timely desktop application while providing a focused, mobile-optimized experience for both administrators and guests. 