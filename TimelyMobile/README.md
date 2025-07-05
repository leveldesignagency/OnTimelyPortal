# Timely Mobile App

A React Native Expo app for event management, built with TypeScript and Supabase.

## Features

- **Authentication**: User and guest login with Supabase
- **JSC Engine**: Uses JavaScriptCore instead of Hermes for better Supabase compatibility
- **TypeScript**: Full TypeScript support
- **React Navigation**: Clean navigation between screens
- **AsyncStorage**: Persistent authentication state

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Run on iOS**:
   ```bash
   npm run ios
   ```

4. **Run on Android**:
   ```bash
   npm run android
   ```

## Project Structure

```
TimelyMobile/
├── lib/
│   ├── supabase.ts    # Supabase client configuration
│   └── auth.ts        # Authentication functions
├── screens/
│   ├── LoginScreen.tsx    # Login screen
│   └── GuestDashboard.tsx # Dashboard after login
├── App.tsx            # Main app component
└── app.json          # Expo configuration
```

## Configuration

- **JavaScript Engine**: Uses JSC (JavaScriptCore) instead of Hermes for better Supabase compatibility
- **Supabase**: Configured with your existing Supabase project
- **Authentication**: Supports both user and guest login modes

## Dependencies

- `expo`: Latest Expo SDK
- `@supabase/supabase-js`: Supabase client
- `@react-navigation/native`: Navigation library
- `@react-navigation/native-stack`: Stack navigation
- `@react-native-async-storage/async-storage`: Persistent storage
- `react-native-screens`: Native screen components
- `react-native-safe-area-context`: Safe area handling

## Authentication Flow

1. App checks for existing user session on startup
2. If no session, shows login screen
3. User can switch between regular user login and guest login
4. After successful login, shows dashboard
5. User can logout from dashboard

## Development Notes

- This app is configured to use JSC instead of Hermes to avoid compatibility issues with Supabase
- All authentication functions are compatible with your existing Supabase setup
- The app uses the same Supabase URL and configuration as your desktop app 