# Timely Offline Maps 🗺️

A comprehensive offline maps solution for the Timely mobile app, providing native map rendering, offline area downloads, pin management, and navigation capabilities.

## Features

### 🗺️ **Map Display**
- **Native Rendering**: Uses Mapbox React Native SDK (no webview)
- **Real-time Location**: Shows user's current location
- **Multiple Map Styles**: Street, satellite, and custom styles
- **Smooth Interactions**: Pan, zoom, rotate with native performance

### 📍 **Pin Management**
- **Long Press to Add**: Hold down on map to create new pins
- **Categorized Pins**: 6 categories with unique colors and icons
  - 📍 Custom (Blue)
  - 🍽️ Restaurant (Red)
  - 🏨 Hotel (Teal)
  - 🚇 Transport (Blue)
  - 🎭 Attraction (Green)
  - 🚨 Emergency (Red)
- **Pin Details**: Title, description, and category for each pin
- **Persistent Storage**: Pins saved locally using AsyncStorage
- **Quick Actions**: Tap pin to view details, navigate, or delete

### ⬇️ **Offline Downloads**
- **Area Selection**: Choose download radius from 1-20km
- **Progress Tracking**: Real-time download progress with visual feedback
- **Size Estimation**: Shows estimated download size before starting
- **Multiple Areas**: Download and manage multiple offline areas
- **Local Storage**: Downloaded areas persist across app sessions

### 🧭 **Navigation System**
- **Multi-Modal Routes**: Walking, cycling, driving, and transit navigation
- **Offline Capable**: Calculate routes even without internet
- **Visual Route Display**: Routes shown as colored lines on map
- **Distance & Time**: Accurate estimates for each transport mode
- **Turn-by-Turn**: Basic navigation instructions

### 🎨 **UI/UX Design**
- **Dark Mode**: Consistent with Timely's design language
- **Glassmorphic Modals**: Beautiful slide-up modals for interactions
- **Haptic Feedback**: Tactile responses for all interactions
- **Responsive Design**: Optimized for all screen sizes
- **Floating Action Buttons**: Quick access to navigation and location

## Technical Implementation

### Dependencies
```json
{
  "@rnmapbox/maps": "^10.x.x",
  "@react-native-async-storage/async-storage": "^2.x.x",
  "expo-location": "^18.x.x",
  "expo-haptics": "^14.x.x"
}
```

### Core Services

#### 📦 **mapsService.ts**
Central service managing all map-related functionality:
- **pinService**: CRUD operations for map pins
- **offlineService**: Download area management
- **navigationService**: Route calculation and navigation
- **Utility Functions**: Distance calculation, bearing, coordinates

#### 🗺️ **OfflineMapsScreen.tsx**
Main screen component with:
- **Mapbox Integration**: Native map rendering
- **State Management**: Pins, areas, routes, modals
- **Location Services**: GPS permission and tracking
- **Modal System**: Pin creation, area download, navigation

### Data Structures

#### Pin Interface
```typescript
interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  category: 'custom' | 'restaurant' | 'hotel' | 'transport' | 'attraction' | 'emergency';
  color: string;
  timestamp: Date;
}
```

#### Downloaded Area Interface
```typescript
interface DownloadedArea {
  id: string;
  name: string;
  bounds: {
    northeast: { latitude: number; longitude: number };
    southwest: { latitude: number; longitude: number };
  };
  center: { latitude: number; longitude: number };
  radius: number;
  downloadedAt: Date;
  size: number;
}
```

## Setup Instructions

### 1. **Mapbox Account Setup**
1. Create account at [mapbox.com](https://mapbox.com)
2. Generate access token and download token
3. Update `app.config.js`:
```javascript
plugins: [
  [
    '@rnmapbox/maps',
    {
      RNMapboxMapsImpl: 'mapbox',
      RNMapboxMapsDownloadToken: 'YOUR_MAPBOX_DOWNLOAD_TOKEN'
    }
  ]
]
```

### 2. **Access Token Configuration**
Replace placeholder in `OfflineMapsScreen.tsx`:
```typescript
Mapbox.setAccessToken('pk.your_actual_mapbox_access_token_here');
```

### 3. **Permissions Setup**
The app automatically requests location permissions. Ensure your app.config.js includes:
```javascript
ios: {
  infoPlist: {
    NSLocationWhenInUseUsageDescription: "Allow Timely to access your location for maps"
  }
},
android: {
  permissions: [
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION"
  ]
}
```

## Usage Guide

### 🎯 **Adding Pins**
1. Long press anywhere on the map
2. Enter pin title and optional description
3. Select category (affects color and icon)
4. Tap "Add Pin" to save

### ⬇️ **Downloading Areas**
1. Tap download icon in header
2. Enter area name
3. Adjust radius slider (1-20km)
4. Tap "Download Area"
5. Wait for download to complete

### 🧭 **Navigation**
1. Tap navigation FAB or select pin
2. Choose transport mode:
   - 🚶‍♂️ Walking (5 km/h)
   - 🚴‍♂️ Cycling (15 km/h)
   - 🚗 Driving (50 km/h)
   - 🚇 Transit (30 km/h)
3. Tap "Start Navigation"
4. Route appears on map with distance/time

### 🎛️ **Map Controls**
- **Location FAB**: Centers map on current location
- **Navigation FAB**: Opens navigation modal
- **Download Button**: Opens area download modal
- **Back Button**: Returns to Apps screen

## Integration with Timely

### Event Add-On System
The offline maps integrates seamlessly with Timely's add-on system:
- **Desktop Configuration**: Event organizers enable "Offline Maps" in EventDashboard
- **Mobile Activation**: Appears in guest Apps tab when enabled
- **Key**: `offlineMaps` (matches desktop configuration)

### Data Persistence
- **Local Storage**: All pins and areas stored locally
- **No Server Dependency**: Works completely offline
- **Privacy Focused**: Location data never leaves device

## Performance Considerations

### Memory Management
- **Efficient Rendering**: Only render visible pins
- **Lazy Loading**: Load map tiles as needed
- **Cache Management**: Automatic cleanup of old downloads

### Battery Optimization
- **Location Accuracy**: Balanced accuracy for battery life
- **Background Handling**: Proper lifecycle management
- **Resource Cleanup**: Dispose of resources when not needed

## Troubleshooting

### Common Issues

#### Maps Not Loading
- Check Mapbox access token
- Verify internet connection for initial load
- Ensure proper plugin configuration

#### Location Not Working
- Check device location permissions
- Verify GPS is enabled
- Test on physical device (simulators may have issues)

#### Downloads Failing
- Check available storage space
- Verify download token configuration
- Ensure stable internet connection

### Error Handling
The app includes comprehensive error handling:
- **Graceful Fallbacks**: Default locations if GPS fails
- **User Feedback**: Clear error messages and alerts
- **Offline Resilience**: Works without internet after initial setup

## Future Enhancements

### Planned Features
- **Search Integration**: Search for places and addresses
- **Route Optimization**: Multi-stop route planning
- **Shared Pins**: Sync pins with other event guests
- **Advanced Navigation**: Turn-by-turn voice guidance
- **Custom Map Styles**: Event-specific map themes

### API Integrations
- **Mapbox Directions API**: Enhanced route calculation
- **Mapbox Search API**: Place search and geocoding
- **Real-time Traffic**: Live traffic data for driving routes

## Contributing

When contributing to the offline maps feature:
1. Test on both iOS and Android
2. Verify offline functionality
3. Check memory usage with large datasets
4. Ensure accessibility compliance
5. Follow Timely's design patterns

## Support

For issues or questions:
- Check error logs in development console
- Verify Mapbox token and permissions
- Test location services on physical device
- Review network connectivity for downloads 