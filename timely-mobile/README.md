# Timely Mobile

A React Native mobile companion app for the Timely event management system. This app allows event organizers to view events and manage guest check-ins on the go.

## Features

- **Event Management**: View all events created in the desktop app
- **Guest Check-in**: Check guests in/out with a simple tap
- **Real-time Sync**: Automatic synchronization with the desktop app via Supabase
- **Search Functionality**: Quickly find guests by name or email
- **Authentication**: Secure login using the same credentials as the desktop app

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- Expo Go app on your mobile device (for testing)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - The app is already configured to use the same Supabase instance as the desktop app
   - No additional configuration needed if the desktop app is already set up

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/simulator:**
   - For iOS: `npm run ios` or scan QR code with Camera app
   - For Android: `npm run android` or scan QR code with Expo Go app
   - For web: `npm run web`

## Usage

1. **Login**: Use the same credentials as your desktop app
2. **View Events**: Browse all events from your organization
3. **Manage Guests**: Tap on an event to view and check in guests
4. **Search**: Use the search bar to quickly find specific guests
5. **Real-time Updates**: Changes sync automatically across all devices

## Test Accounts

The app includes quick login buttons for testing:
- **Admin**: admin@timelyapp.com / admin123
- **User**: user@timelyapp.com / user123

## Architecture

- **Frontend**: React Native with Expo
- **Backend**: Supabase (shared with desktop app)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: AsyncStorage for local session management

## Development

The app follows a simple navigation structure:
- `LoginScreen`: Authentication
- `EventsScreen`: List of events
- `GuestsScreen`: Guest management for selected event

Key components:
- `EventCard`: Reusable event display component
- `lib/supabase.ts`: Database operations and types
- `lib/auth.ts`: Authentication helpers

## Building for Production

1. **Configure app.json** with your bundle identifiers
2. **Build with EAS Build** (recommended):
   ```bash
   npm install -g @expo/eas-cli
   eas build
   ```

## Troubleshooting

- **Connection Issues**: Ensure your device/simulator can reach the Supabase URL
- **Authentication Problems**: Verify the Supabase configuration matches the desktop app
- **Real-time Updates Not Working**: Check network connectivity and Supabase realtime settings

## Support

For issues related to the mobile app, please check the main Timely repository or contact your system administrator. 
 

A React Native mobile companion app for the Timely event management system. This app allows event organizers to view events and manage guest check-ins on the go.

## Features

- **Event Management**: View all events created in the desktop app
- **Guest Check-in**: Check guests in/out with a simple tap
- **Real-time Sync**: Automatic synchronization with the desktop app via Supabase
- **Search Functionality**: Quickly find guests by name or email
- **Authentication**: Secure login using the same credentials as the desktop app

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- Expo Go app on your mobile device (for testing)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - The app is already configured to use the same Supabase instance as the desktop app
   - No additional configuration needed if the desktop app is already set up

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/simulator:**
   - For iOS: `npm run ios` or scan QR code with Camera app
   - For Android: `npm run android` or scan QR code with Expo Go app
   - For web: `npm run web`

## Usage

1. **Login**: Use the same credentials as your desktop app
2. **View Events**: Browse all events from your organization
3. **Manage Guests**: Tap on an event to view and check in guests
4. **Search**: Use the search bar to quickly find specific guests
5. **Real-time Updates**: Changes sync automatically across all devices

## Test Accounts

The app includes quick login buttons for testing:
- **Admin**: admin@timelyapp.com / admin123
- **User**: user@timelyapp.com / user123

## Architecture

- **Frontend**: React Native with Expo
- **Backend**: Supabase (shared with desktop app)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: AsyncStorage for local session management

## Development

The app follows a simple navigation structure:
- `LoginScreen`: Authentication
- `EventsScreen`: List of events
- `GuestsScreen`: Guest management for selected event

Key components:
- `EventCard`: Reusable event display component
- `lib/supabase.ts`: Database operations and types
- `lib/auth.ts`: Authentication helpers

## Building for Production

1. **Configure app.json** with your bundle identifiers
2. **Build with EAS Build** (recommended):
   ```bash
   npm install -g @expo/eas-cli
   eas build
   ```

## Troubleshooting

- **Connection Issues**: Ensure your device/simulator can reach the Supabase URL
- **Authentication Problems**: Verify the Supabase configuration matches the desktop app
- **Real-time Updates Not Working**: Check network connectivity and Supabase realtime settings

## Support

For issues related to the mobile app, please check the main Timely repository or contact your system administrator. 
 