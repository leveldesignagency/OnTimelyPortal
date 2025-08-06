import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
// Removed problematic Slider import
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { alertService } from '../lib/alertService';
import Mapbox from '@rnmapbox/maps';
import MapErrorBoundary from '../components/MapErrorBoundary';
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import {
  pinService,
  offlineService,
  navigationService,
  MapPin,
  DownloadedArea,
  NavigationRoute,
  pinCategories,
  transportModes,
} from '../lib/mapsService';

// Set Mapbox access token (you'll need to replace this with a real token)
Mapbox.setAccessToken('pk.eyJ1IjoidGltZWx5bW9iaWxlYXBwIiwiYSI6ImNtZGhnN3NzNTAxNHIybXJiODFyajZrN3QifQ.N2hc7roTYTRYz4No1RxLaQ');

// Dark blue color for location and route icons (matching other pages)
const DARK_BLUE = '#007AFF';

// Mapbox access token for geocoding
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoidGltZWx5bW9iaWxlYXBwIiwiYSI6ImNtZGhnN3NzNTAxNHIybXJiODFyajZrN3QifQ.N2hc7roTYTRYz4No1RxLaQ';

const { width, height } = Dimensions.get('window');

interface OfflineMapsScreenProps {
  navigation?: any;
}

export default function OfflineMapsScreen({ navigation }: OfflineMapsScreenProps) {
  const insets = useSafeAreaInsets();
  
  // Map state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [downloadedAreas, setDownloadedAreas] = useState<DownloadedArea[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [currentRoute, setCurrentRoute] = useState<NavigationRoute | null>(null);
  const [navigationDestination, setNavigationDestination] = useState<[number, number] | null>(null);
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [navigationProgress, setNavigationProgress] = useState(0); // 0-100 percentage
  const [navigationStartTime, setNavigationStartTime] = useState<Date | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  
  // UI state
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Map error handling state
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapRetryCount, setMapRetryCount] = useState(0);
  
  // Download area state
  const [downloadRadius, setDownloadRadius] = useState(5); // km
  const [downloadAreaName, setDownloadAreaName] = useState('');
  
  // Pin creation state
  const [newPinTitle, setNewPinTitle] = useState('');
  const [newPinDescription, setNewPinDescription] = useState('');
  const [newPinCategory, setNewPinCategory] = useState<keyof typeof pinCategories>('custom');
  const [newPinCoordinates, setNewPinCoordinates] = useState<[number, number] | null>(null);
  const [newPinLocation, setNewPinLocation] = useState(''); // New state for location search
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([]);
  const [locationSearchTimeout, setLocationSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPinNotification, setShowPinNotification] = useState(false);
  const [pinNotificationText, setPinNotificationText] = useState('');
  
  // Navigation state
  const [navigationMode, setNavigationMode] = useState<keyof typeof transportModes>('walking');
  
  // Simple search and pin dropping
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);

  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  // Bottom sheet refs and state
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [bottomSheetIndex, setBottomSheetIndex] = useState(0);
  const [bottomSheetSnapPoints] = useState(['25%', '40%', '50%', '70%', '90%']);
  const [bottomSheetView, setBottomSheetView] = useState<'search' | 'transport' | 'route' | 'pinDrop' | 'pinList' | 'navigation'>('search');

  // Handle map errors gracefully
  const handleMapError = (error: any) => {
    console.warn('🗺️ Map error:', error);
    const errorMessage = error?.message || 'Unknown map error';
    
    // Don't show error for network issues if we've already shown it
    if (errorMessage.includes('api.mapbox.com') && mapRetryCount > 0) {
      return;
    }
    
    setMapError(errorMessage);
    setMapRetryCount(prev => prev + 1);
    
    // Show user-friendly error
    if (errorMessage.includes('api.mapbox.com')) {
      alertService.error(
        'Map Connection Issue',
        'Unable to load map tiles. This might be due to:\n\n• Network connectivity issues\n• Mapbox service temporarily unavailable\n\nYou can still use offline features if you have downloaded areas.'
      );
    } else {
      alertService.error('Map Error', 'There was an issue loading the map. Please try again.');
    }
  };

  // Handle map load success
  const handleMapLoad = () => {
    console.log('🗺️ Map loaded successfully');
    setMapError(null);
    setIsMapLoading(false);
    setMapRetryCount(0);
  };

  // Retry map loading
  const handleRetryMap = () => {
    setMapError(null);
    setIsMapLoading(true);
    setMapRetryCount(0);
  };

  // Bottom sheet callbacks
  const handleSheetChanges = useCallback((index: number) => {
    setBottomSheetIndex(index);
  }, []);

  const handleSheetClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleSheetExpand = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  // Enhanced search location function with real-world suggestions
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // First try to get current location for nearby search
      let currentLocation = userLocation;
      if (!currentLocation) {
        try {
          await initializeLocation();
          currentLocation = userLocation;
        } catch (error) {
          console.log('Could not get current location for nearby search');
        }
      }

      // Build search query with proximity bias if we have location
      let searchQuery = query;
      if (currentLocation) {
        const [lon, lat] = currentLocation;
        searchQuery = `${query} near ${lat.toFixed(4)},${lon.toFixed(4)}`;
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=poi,place,neighborhood,address&limit=6&proximity=${currentLocation ? `${currentLocation[0]},${currentLocation[1]}` : ''}`
      );

      if (!response.ok) {
        console.error('Geocoding API error:', response.status);
        return;
      }

      const data = await response.json();
      
      // Process and format results
      const formattedResults = data.features.map((feature: any) => ({
        place_name: feature.place_name,
        center: feature.center,
        relevance: feature.relevance,
        type: feature.place_type?.[0] || 'unknown'
      }));

      // Sort by relevance and distance
      const sortedResults = formattedResults.sort((a: any, b: any) => {
        // Prioritize by relevance score
        if (a.relevance !== b.relevance) {
          return b.relevance - a.relevance;
        }
        return 0;
      });

      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Error searching locations:', error);
      // Fallback: show some basic suggestions
      setSearchResults([
        {
          place_name: `${query} - Current Location`,
          center: userLocation || [0, 0],
          type: 'suggestion'
        }
      ]);
    }
  };

  const searchLocationForPin = async (query: string) => {
    if (!query.trim()) {
      setLocationSearchResults([]);
      return;
    }

    try {
      // First try to get current location for nearby search
      let currentLocation = userLocation;
      if (!currentLocation) {
        try {
          await initializeLocation();
          currentLocation = userLocation;
        } catch (error) {
          console.log('Could not get current location for nearby search');
        }
      }

      // Build search query with proximity bias if we have location
      let searchQuery = query;
      if (currentLocation) {
        const [lon, lat] = currentLocation;
        searchQuery = `${query} near ${lat.toFixed(4)},${lon.toFixed(4)}`;
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=poi,place,neighborhood,address&limit=6&proximity=${currentLocation ? `${currentLocation[0]},${currentLocation[1]}` : ''}`
      );

      if (!response.ok) {
        console.error('Geocoding API error:', response.status);
        return;
      }

      const data = await response.json();
      
      // Process and format results
      const formattedResults = data.features.map((feature: any) => ({
        place_name: feature.place_name,
        center: feature.center,
        relevance: feature.relevance,
        type: feature.place_type?.[0] || 'unknown'
      }));

      // Sort by relevance and distance
      const sortedResults = formattedResults.sort((a: any, b: any) => {
        // Prioritize by relevance score
        if (a.relevance !== b.relevance) {
          return b.relevance - a.relevance;
        }
        return 0;
      });

      setLocationSearchResults(sortedResults);
    } catch (error) {
      console.error('Error searching locations for pin:', error);
      // Fallback: show some basic suggestions
      setLocationSearchResults([
        {
          place_name: `${query} - Current Location`,
          center: userLocation || [0, 0],
          type: 'suggestion'
        }
      ]);
    }
  };

  // Handle search result selection for navigation
  const handleSearchResultSelect = (result: any) => {
    const [longitude, latitude] = result.center;
    
    console.log('🎯 Search result selected:', result.place_name);
    console.log('🎯 Coordinates:', [longitude, latitude]);
    
    // Clear any existing route first
    setCurrentRoute(null);
    
    // Set as navigation destination
    setNavigationDestination([longitude, latitude]);
    setDestinationAddress(result.place_name);
    setSearchQuery(result.place_name);
    setShowSearchDropdown(false);
    setSearchResults([]);
    
    // Center map on selected location
    if (cameraRef.current) {
      try {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 15,
          animationDuration: 1000
        });
      } catch (error) {
        console.warn('Camera set failed:', error);
      }
    }
    
    // Expand bottom sheet to show transport options
    setTimeout(() => {
      setBottomSheetView('transport');
      bottomSheetRef.current?.snapToIndex(1);
    }, 100);
  };

  // Calculate real-world route with turn-by-turn directions
  const calculateRealRoute = async (start: [number, number], end: [number, number], mode: string) => {
    console.log('🗺️ calculateRealRoute called with mode:', mode);
    console.log('🗺️ start:', start);
    console.log('🗺️ end:', end);
    
    try {
      // Use Mapbox Directions API to get real route
      let profile = 'driving'; // default
      
      // Map our transport modes to Mapbox profiles
      switch (mode) {
        case 'walking':
          profile = 'walking';
          break;
        case 'cycling':
          profile = 'cycling';
          break;
        case 'driving':
          profile = 'driving';
          break;
        case 'bus':
        case 'subway':
        case 'tram':
        case 'train':
          profile = 'driving'; // Mapbox doesn't have specific transit profiles, use driving as base
          break;
        case 'ferry':
          profile = 'driving'; // Mapbox doesn't have ferry profile, use driving as base
          break;
        default:
          profile = 'driving';
      }
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          // Calculate proper duration based on transport mode and distance
          let adjustedDuration = route.duration;
          const distanceKm = route.distance / 1000; // Convert to km
          
          switch (mode) {
            case 'walking':
              // Walking speed: ~5 km/h
              adjustedDuration = (distanceKm / 5) * 3600; // Convert to seconds
              break;
            case 'cycling':
              // Cycling speed: ~15 km/h
              adjustedDuration = (distanceKm / 15) * 3600; // Convert to seconds
              break;
            case 'driving':
              // Driving speed: ~50 km/h (urban)
              adjustedDuration = (distanceKm / 50) * 3600; // Convert to seconds
              break;
            case 'bus':
            case 'subway':
            case 'tram':
            case 'train':
              // Public transport: ~30 km/h (including stops)
              adjustedDuration = (distanceKm / 30) * 3600; // Convert to seconds
              break;
            case 'ferry':
              // Ferry speed: ~20 km/h
              adjustedDuration = (distanceKm / 20) * 3600; // Convert to seconds
              break;
            default:
              adjustedDuration = route.duration;
          }
          
          return {
            geometry: route.geometry,
            distance: route.distance,
            duration: adjustedDuration,
            steps: route.legs[0].steps,
            mode: mode // Return the actual mode parameter
          };
        }
      }
      
      // Fallback to straight line if API fails
      const distanceKm = Math.sqrt(
        Math.pow((end[1] - start[1]) * 111, 2) + 
        Math.pow((end[0] - start[0]) * 111 * Math.cos(start[1] * Math.PI / 180), 2)
      );
      
      let fallbackDuration = 0;
      switch (mode) {
        case 'walking':
          fallbackDuration = (distanceKm / 5) * 3600;
          break;
        case 'cycling':
          fallbackDuration = (distanceKm / 15) * 3600;
          break;
        case 'driving':
          fallbackDuration = (distanceKm / 50) * 3600;
          break;
        case 'bus':
        case 'subway':
        case 'tram':
        case 'train':
          fallbackDuration = (distanceKm / 30) * 3600;
          break;
        case 'ferry':
          fallbackDuration = (distanceKm / 20) * 3600;
          break;
        default:
          fallbackDuration = (distanceKm / 5) * 3600;
      }
      
      return {
        geometry: {
          type: 'LineString',
          coordinates: [start, end]
        },
        distance: distanceKm * 1000, // Convert to meters
        duration: fallbackDuration,
        steps: [],
        mode: mode // Return the actual mode parameter
      };
    } catch (error) {
      console.error('Route calculation error:', error);
      // Fallback to straight line
      const distanceKm = Math.sqrt(
        Math.pow((end[1] - start[1]) * 111, 2) + 
        Math.pow((end[0] - start[0]) * 111 * Math.cos(start[1] * Math.PI / 180), 2)
      );
      
      let fallbackDuration = 0;
      switch (mode) {
        case 'walking':
          fallbackDuration = (distanceKm / 5) * 3600;
          break;
        case 'cycling':
          fallbackDuration = (distanceKm / 15) * 3600;
          break;
        case 'driving':
          fallbackDuration = (distanceKm / 50) * 3600;
          break;
        case 'bus':
        case 'subway':
        case 'tram':
        case 'train':
          fallbackDuration = (distanceKm / 30) * 3600;
          break;
        case 'ferry':
          fallbackDuration = (distanceKm / 20) * 3600;
          break;
        default:
          fallbackDuration = (distanceKm / 5) * 3600;
      }
      
      return {
        geometry: {
          type: 'LineString',
          coordinates: [start, end]
        },
        distance: distanceKm * 1000, // Convert to meters
        duration: fallbackDuration,
        steps: [],
        mode: mode // Return the actual mode parameter
      };
    }
  };

  // Monitor currentRoute changes for debugging
  useEffect(() => {
    if (currentRoute) {
      console.log('🎯 CurrentRoute state updated:', currentRoute.mode, currentRoute.distance, currentRoute.duration);
    } else {
      console.log('🎯 CurrentRoute state cleared');
    }
  }, [currentRoute]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load saved data first
        await Promise.all([
          loadPins(),
          loadDownloadedAreas()
        ]);
        
        // Set a default location so the map loads immediately
        setUserLocation([-122.4194, 37.7749]); // San Francisco default
        
        // Show location permission modal
        setShowLocationPermissionModal(true);
        
      } catch (error) {
        console.error('Error initializing app:', error);
        alertService.error('Initialization Error', 'Failed to initialize the app. Please restart.');
      }
    };
    
    initializeApp();
    
    return () => {
      // Cleanup search timeout
      if (locationSearchTimeout) {
        clearTimeout(locationSearchTimeout);
      }
      
      // Cleanup location subscription
      if (locationSubscription) {
        console.log('🔄 Stopping location updates...');
        locationSubscription.remove();
      }
    };
  }, []);

  const initializeLocation = async () => {
    try {
      console.log('🔍 Requesting location permissions...');
      
      // First check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        alertService.error(
          'Location Services Disabled', 
          'Please enable location services in your device settings to use maps.'
        );
        setUserLocation([-122.4194, 37.7749]);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 Permission status:', status);
      
      if (status !== 'granted') {
        alertService.error('Permission Denied', 'Location access is required for maps to work properly.');
        setUserLocation([-122.4194, 37.7749]);
        return;
      }

      console.log('🌍 Getting current position with maximum precision...');
      
      // Maximum precision location options for real-time tracking
      const locationOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 500, // Update every 500ms for real-time
        distanceInterval: 0.5, // Update every 0.5 meters for precise tracking
        mayShowUserSettingsDialog: true, // Allow user to improve accuracy
        maximumAge: 0, // Always get fresh location
      };
      
      try {
        const location = await Location.getCurrentPositionAsync(locationOptions);
        console.log('✅ Maximum precision location:', location.coords);
        console.log('📍 Accuracy:', location.coords.accuracy, 'meters');
        
        // Check if this is the default emulator location (Silicon Valley)
        const isEmulatorDefault = (
          Math.abs(location.coords.latitude - 37.7749) < 0.01 && 
          Math.abs(location.coords.longitude - (-122.4194)) < 0.01
        );
        
        if (isEmulatorDefault) {
          console.log('🤖 Detected emulator default location');
          alertService.info(
            'Emulator Location Detected',
            'This appears to be the default emulator location (Silicon Valley).\n\nTo use your real location:\n\n1. Click "..." in emulator\n2. Go to "Location" tab\n3. Enter your city or coordinates\n4. Click "Send"\n5. Tap the location button again\n\nOr use the search bar to find your location!\n\n💡 Tip: For better accuracy, try the location button multiple times.'
          );
        }
        
        setUserLocation([location.coords.longitude, location.coords.latitude]);
        
        // Start real-time location updates for precise movement tracking
        startLocationUpdates();
        
        // Show accuracy feedback
        const accuracy = location.coords.accuracy || 0;
        if (accuracy < 5) {
          alertService.success('High Precision', `Location accuracy: ${accuracy.toFixed(1)} meters - Real-time tracking active!`);
        } else if (accuracy < 20) {
          alertService.info('Good Precision', `Location accuracy: ${accuracy.toFixed(1)} meters - Real-time tracking active!`);
        } else {
          alertService.warning('Low Precision', `Location accuracy: ${accuracy.toFixed(1)} meters. Consider moving to an open area for better precision.`);
        }
        
        return;
      } catch (highAccuracyError) {
        console.log('⚠️ Maximum precision failed, trying high accuracy...');
        
        // Fallback to high accuracy
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
          maximumAge: 0,
        });
        console.log('✅ High accuracy location:', location.coords);
        setUserLocation([location.coords.longitude, location.coords.latitude]);
        
        // Start real-time location updates
        startLocationUpdates();
        
        alertService.info('Location Active', 'Real-time location tracking is now active!');
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      setUserLocation([-122.4194, 37.7749]);
      alertService.error(
        'Location Error', 
        'Could not get your current location. Make sure location services are enabled and try the location button.'
      );
    }
  };

  // New function to start location updates for movement tracking
  const startLocationUpdates = async () => {
    try {
      console.log('🔄 Starting real-time location updates for precise movement tracking...');
      
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500, // Update every 500ms for real-time
          distanceInterval: 0.5, // Update every 0.5 meters for precise tracking
          maximumAge: 0, // Always get fresh location
        },
        (location) => {
          console.log('📍 Real-time location updated:', location.coords);
          console.log('📍 Accuracy:', location.coords.accuracy, 'meters');
          setUserLocation([location.coords.longitude, location.coords.latitude]);
          
          // Update camera position smoothly if map is loaded
          if (cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: [location.coords.longitude, location.coords.latitude],
              animationDuration: 500, // Faster animation for real-time
            });
          }
        }
      );
      
      // Store subscription for cleanup
      setLocationSubscription(locationSubscription);
      
      console.log('✅ Real-time location tracking activated!');
      
    } catch (error) {
      console.error('❌ Error starting location updates:', error);
    }
  };

  // Enhanced location refresh function for better accuracy
  const refreshLocationWithAccuracy = async () => {
    try {
      console.log('🎯 Refreshing location with high accuracy...');
      
      // Stop existing updates temporarily
      if (locationSubscription) {
        locationSubscription.remove();
      }
      
      // Get fresh location with best accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 500, // Faster response
        distanceInterval: 0.5, // More sensitive
        mayShowUserSettingsDialog: true,
      });
      
      console.log('✅ Fresh high-accuracy location:', location.coords);
      setUserLocation([location.coords.longitude, location.coords.latitude]);
      
      // Center map on new location
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [location.coords.longitude, location.coords.latitude],
          zoomLevel: 16,
          animationDuration: 1000,
        });
      }
      
      // Restart location updates
      startLocationUpdates();
      
      // Show accuracy feedback
      const accuracy = location.coords.accuracy || 0;
      if (accuracy < 10) {
        alertService.success('High Accuracy', `Location accuracy: ${accuracy.toFixed(1)} meters`);
      } else if (accuracy < 50) {
        alertService.info('Good Accuracy', `Location accuracy: ${accuracy.toFixed(1)} meters`);
      } else {
        alertService.warning('Low Accuracy', `Location accuracy: ${accuracy.toFixed(1)} meters. Consider moving to an open area.`);
      }
      
    } catch (error) {
      console.error('❌ Error refreshing location:', error);
      alertService.error('Location Error', 'Could not get accurate location. Please try again.');
    }
  };

  const loadPins = async () => {
    try {
      const loadedPins = await pinService.getPins();
      setPins(loadedPins);
    } catch (error) {
      console.error('Error loading pins:', error);
    }
  };

  const loadDownloadedAreas = async () => {
    try {
      const areas = await offlineService.getDownloadedAreas();
      setDownloadedAreas(areas);
    } catch (error) {
      console.error('Error loading downloaded areas:', error);
    }
  };

  const handleMapLongPress = (feature: any) => {
    if (feature.geometry && feature.geometry.coordinates) {
      const [longitude, latitude] = feature.geometry.coordinates;
      setNewPinCoordinates([longitude, latitude]);
      setNewPinLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setShowPinModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleAddPin = async () => {
    if (!newPinTitle.trim() || !newPinCoordinates) {
      alertService.error('Error', 'Please provide a title and select a location on the map.');
      return;
    }

    try {
      const newPin: Omit<MapPin, 'id' | 'timestamp'> = {
        latitude: newPinCoordinates[1],
        longitude: newPinCoordinates[0],
        title: newPinTitle.trim(),
        description: newPinDescription.trim() || undefined,
        category: 'custom',
        color: pinCategories.custom.color
      };

      await pinService.addPin(newPin);
      setPins(prev => [...prev, { ...newPin, id: Date.now().toString(), timestamp: new Date() }]);
      
      // Clear form
      setNewPinTitle('');
      setNewPinDescription('');
      setNewPinCoordinates(null);
      setNewPinLocation(''); // Clear location search field
      setLocationSearchResults([]); // Clear location search results
      
      // Navigate to pin location
      if (mapRef.current && newPinCoordinates) {
        mapRef.current.setCamera({
          centerCoordinate: newPinCoordinates,
          zoomLevel: 16,
          animationDuration: 1000
        });
      }
      
      // Return to search view
      setBottomSheetView('pinList');
      bottomSheetRef.current?.expand();
      
      // Show tiny notification
      setPinNotificationText(`${newPin.title} added successfully!`);
      setShowPinNotification(true);
      setTimeout(() => setShowPinNotification(false), 3000);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      alertService.error('Error', 'Failed to add pin. Please try again.');
    }
  };

  const handleRemovePin = async (pinId: string) => {
    try {
      await pinService.removePin(pinId);
      setPins(prev => prev.filter(pin => pin.id !== pinId));
      setSelectedPin(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      alertService.error('Error', 'Failed to remove pin. Please try again.');
    }
  };

  const handleDownloadArea = async () => {
    if (!userLocation || !downloadAreaName.trim()) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      // Wait for "download" to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      const [longitude, latitude] = userLocation;
      const area = await offlineService.addDownloadedArea({
        name: downloadAreaName.trim(),
        bounds: {
          northeast: { latitude: latitude + (downloadRadius / 111), longitude: longitude + (downloadRadius / 111) },
          southwest: { latitude: latitude - (downloadRadius / 111), longitude: longitude - (downloadRadius / 111) }
        },
        center: { latitude, longitude },
        radius: downloadRadius,
        size: downloadRadius * 2 // Estimated size in MB
      });

      setDownloadedAreas(prev => [...prev, area]);
      setShowDownloadModal(false);
      setDownloadAreaName('');
      setIsDownloading(false);
      setDownloadProgress(0);
      
      alertService.success('Success', `Area "${area.name}" has been downloaded for offline use!`, 3000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setIsDownloading(false);
      setDownloadProgress(0);
      alertService.error('Error', 'Failed to download area. Please try again.');
    }
  };

  const handleStartNavigation = async (mode: keyof typeof transportModes) => {
    console.log('🚀 handleStartNavigation called');
    console.log('🚀 userLocation:', userLocation);
    console.log('🚀 navigationDestination:', navigationDestination);
    console.log('🚀 navigationMode (argument):', mode);
    
    if (!userLocation || !navigationDestination) {
      console.log('❌ Navigation failed: Missing userLocation or navigationDestination');
      return;
    }
    if (!mode) {
      console.log('❌ Navigation failed: navigationMode is not set');
      return;
    }
    console.log('🚀 Starting navigation...');
    console.log('From:', userLocation);
    console.log('To:', navigationDestination);
    console.log('Mode:', mode);

    // Calculate real-world route
    const route = await calculateRealRoute(userLocation, navigationDestination, mode);
    console.log('✅ Route calculated:', route);

    // Convert to NavigationRoute format
    const navigationRoute: NavigationRoute = {
      id: Date.now().toString(),
      start: { latitude: userLocation[1], longitude: userLocation[0] },
      end: { latitude: navigationDestination[1], longitude: navigationDestination[0] },
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      steps: route.steps,
      mode: mode // Always use the passed-in mode
    };

    setCurrentRoute(navigationRoute);
    setShowNavigationModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Collapse bottom sheet and switch to route view
    setBottomSheetView('route');
    bottomSheetRef.current?.snapToIndex(0);

    // Camera zoom to fit route
    if (cameraRef.current && route.geometry && route.geometry.coordinates.length > 1) {
      const coords = route.geometry.coordinates;
      const lats = coords.map((c: [number, number]) => c[1]);
      const lngs = coords.map((c: [number, number]) => c[0]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      let zoomLevel = 15;
      const maxDiff = Math.max(maxLat - minLat, maxLng - minLng);
      if (maxDiff > 0.1) zoomLevel = 8;
      else if (maxDiff > 0.05) zoomLevel = 10;
      else if (maxDiff > 0.02) zoomLevel = 12;
      else if (maxDiff > 0.01) zoomLevel = 14;
      else zoomLevel = 16;
      cameraRef.current.setCamera({
        centerCoordinate: [centerLng, centerLat],
        zoomLevel,
        animationDuration: 2000
      });
    }
  };

  // Handle navigation button press
  const handleNavigationPress = () => {
    if (currentRoute) {
      // Start navigation with the current route
      console.log('🧭 Starting navigation with current route:', currentRoute.mode);
      
      // Set camera based on transport mode
      if (cameraRef.current) {
        try {
          const startCoord = [currentRoute.start.longitude, currentRoute.start.latitude];
          
          switch (currentRoute.mode) {
            case 'walking':
              // Walking: Street level view
              cameraRef.current.setCamera({
                centerCoordinate: startCoord,
                zoomLevel: 17,
                pitch: 30,
                animationDuration: 2000
              });
              break;
            case 'cycling':
              // Cycling: Medium view
              cameraRef.current.setCamera({
                centerCoordinate: startCoord,
                zoomLevel: 16,
                pitch: 45,
                animationDuration: 2000
              });
              break;
            case 'driving':
              // Driving: Canted view near street level
              cameraRef.current.setCamera({
                centerCoordinate: startCoord,
                zoomLevel: 15,
                pitch: 60,
                animationDuration: 2000
              });
              break;
            default:
              // Default: Standard view
              cameraRef.current.setCamera({
                centerCoordinate: startCoord,
                zoomLevel: 16,
                pitch: 45,
                animationDuration: 2000
              });
          }
        } catch (error) {
          console.warn('Navigation camera set failed:', error);
        }
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      alertService.info('No Route', 'Please select a destination first');
    }
  };

  const handlePinNavigation = async (pin: MapPin) => {
    if (!userLocation) {
      alertService.error('Error', 'Unable to get your current location.');
      return;
    }

    // Check if pin is at current location (within 50 meters)
    const distance = Math.sqrt(
      Math.pow(pin.latitude - userLocation[1], 2) + 
      Math.pow(pin.longitude - userLocation[0], 2)
    ) * 111000; // Convert to meters

    if (distance < 50) {
      alertService.info('Already Here', 'You are already at this location.');
      return;
    }

    try {
      // Calculate route to pin
      const route = await calculateRealRoute(
        userLocation,
        [pin.longitude, pin.latitude],
        'driving' // Default to driving mode
      );

      if (route) {
        // Set navigation destination and route
        setNavigationDestination([pin.longitude, pin.latitude]);
        setDestinationAddress(pin.title);
        setCurrentRoute({
          id: Date.now().toString(),
          start: { latitude: userLocation[1], longitude: userLocation[0] },
          end: { latitude: pin.latitude, longitude: pin.longitude },
          mode: 'driving',
          distance: route.distance,
          duration: route.duration,
          steps: route.steps,
          geometry: route.geometry
        });
        setBottomSheetView('transport');
        bottomSheetRef.current?.snapToIndex(1);
        
        // Center map on destination
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [pin.longitude, pin.latitude],
            zoomLevel: 14,
            animationDuration: 1000
          });
        }
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('Error navigating to pin:', error);
      alertService.error('Error', 'Failed to calculate route to this location.');
    }
  };

  const renderMapPin = (pin: MapPin) => (
    <Mapbox.PointAnnotation
      key={pin.id}
      id={pin.id}
      coordinate={[pin.longitude, pin.latitude]}
      onSelected={() => setSelectedPin(pin)}
    >
      <View style={styles.pinMarker}>
        <Ionicons name={pinCategories[pin.category].icon} size={32} color={pinCategories[pin.category].color} />
      </View>
    </Mapbox.PointAnnotation>
  );

  // Add this helper function near the top of the component
  const getETA = () => {
    if (!currentRoute || !navigationStartTime) return '';
    
    // Calculate remaining time based on progress
    const totalDuration = currentRoute.duration; // in seconds
    const remainingDuration = totalDuration * (1 - navigationProgress / 100);
    const now = new Date();
    const arrival = new Date(now.getTime() + remainingDuration * 1000);
    
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startMapNavigation = () => {
    if (!currentRoute || !userLocation || !currentRoute.geometry) return;
    
    // Determine if it's vehicle transport (driving, cycling, etc.)
    const isVehicleTransport = ['driving', 'cycling', 'ferry', 'train', 'bus', 'subway', 'tram'].includes(currentRoute.mode);
    
    if (isVehicleTransport) {
      // Vehicle transport: Canted street-level view
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 16,
        pitch: 45, // Canted view for street level
        heading: 0, // North-facing
        animationDuration: 2000,
      });
    } else {
      // Walking: Overhead view focused on start point
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 15,
        pitch: 0, // Overhead view
        heading: 0,
        animationDuration: 2000,
      });
    }
  };

  if (!userLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Maps</Text>
        <TouchableOpacity onPress={() => setShowDownloadModal(true)} style={styles.headerButton}>
          <Ionicons name="download-outline" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Search Modal - Removed, using floating search bar instead */}
      
      {/* Pill Notification */}
      {showPinNotification && (
        <View style={styles.pillNotification}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.pillNotificationText}>{pinNotificationText}</Text>
        </View>
      )}

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {mapError ? (
          // Fallback UI when map fails to load
          <View style={styles.mapErrorContainer}>
            <Ionicons name="map-outline" size={64} color="#666" />
            <Text style={styles.mapErrorTitle}>Map Unavailable</Text>
            <Text style={styles.mapErrorText}>
              {mapError.includes('api.mapbox.com') 
                ? 'Unable to connect to map service. Check your internet connection.'
                : 'There was an issue loading the map.'
              }
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetryMap}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MapErrorBoundary onRetry={handleRetryMap}>
            <Mapbox.MapView
              ref={mapRef}
              style={styles.map}
              styleURL={Mapbox.StyleURL.Street}
              onLongPress={handleMapLongPress}
            >
          {userLocation && (
            <Mapbox.Camera
              ref={cameraRef}
              centerCoordinate={userLocation}
              zoomLevel={12}
            />
          )}
          
          {/* User location */}
          {userLocation && (
            <Mapbox.UserLocation 
              visible={true}
              androidRenderMode="normal"
              showsUserHeadingIndicator={true}
            />
          )}
          
          {/* Pins */}
          {pins.map(renderMapPin)}
          
          {/* Route rendering - Completely restructured to avoid sourceID errors */}
          {currentRoute?.geometry && (
            <Mapbox.ShapeSource
              id="routeSource"
              shape={{
                type: 'Feature',
                properties: {},
                geometry: currentRoute.geometry
              }}
            >
              <Mapbox.LineLayer
                id="routeLayer"
                style={{
                  lineColor: DARK_BLUE,
                  lineWidth: 4,
                  lineOpacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineDasharray: currentRoute.mode === 'walking' ? [2, 2] : undefined
                }}
              />
            </Mapbox.ShapeSource>
          )}
          {/* Start marker - Explicit rendering */}
          {currentRoute?.start && (
            <Mapbox.PointAnnotation
              id="startPoint"
              coordinate={[currentRoute.start.longitude, currentRoute.start.latitude]}
            >
              <View style={styles.startMarker}>
                <Text style={styles.markerText}>A</Text>
              </View>
            </Mapbox.PointAnnotation>
          )}
          {/* End marker - Explicit rendering */}
          {currentRoute?.end && (
            <Mapbox.PointAnnotation
              id="endPoint"
              coordinate={[currentRoute.end.longitude, currentRoute.end.latitude]}
            >
              <View style={styles.endMarker}>
                <Text style={styles.markerText}>🏁</Text>
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
          </MapErrorBoundary>
        )}

        {/* Floating action buttons */}
        <View style={styles.fabContainer}>
          {/* Pin Dropping Button */}
          <TouchableOpacity
            style={[styles.fab, { marginBottom: 20 }]}
            onPress={() => {
              setSelectedPin(null);
              setBottomSheetView('pinDrop');
              bottomSheetRef.current?.snapToIndex(3);
            }}
          >
            <Ionicons name="location" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.fab, { marginBottom: 20 }]}
            onPress={() => {
              setSelectedPin(null);
              handleNavigationPress();
            }}
          >
            <Ionicons name="navigate" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.fab, { marginTop: 16 }]}
            onPress={async () => {
              setSelectedPin(null);
              try {
                // Use enhanced location refresh for better accuracy
                await refreshLocationWithAccuracy();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (error) {
                console.error('Error refreshing location:', error);
                // Fallback to basic location if enhanced fails
                await initializeLocation();
              }
            }}
          >
            <Ionicons name="locate" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet - Wrapped in absolute positioned View */}
        <View style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 999999, 
          elevation: 999999, 
          pointerEvents: 'box-none' 
        }}>
          <BottomSheet
            ref={bottomSheetRef}
            index={bottomSheetIndex}
            snapPoints={bottomSheetSnapPoints}
            onChange={handleSheetChanges}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={styles.bottomSheetIndicator}
            style={{ zIndex: 999999, elevation: 999999 }}
          >
            <BottomSheetView style={styles.bottomSheetContent}>
              {/* Search Section */}
              {bottomSheetView === 'search' && (
                <View style={styles.searchSection}>
                  <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#fff" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search locations..."
                      placeholderTextColor="#666"
                      value={searchQuery}
                      onChangeText={(text) => {
                        setSearchQuery(text);
                        if (text.trim()) {
                          setShowSearchDropdown(true);
                          searchLocation(text);
                        } else {
                          setSearchResults([]);
                          setShowSearchDropdown(false);
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={styles.currentLocationSearchButton}
                      onPress={async () => {
                        try {
                          await initializeLocation();
                          if (userLocation) {
                            // Reverse geocode to get address
                            try {
                              const response = await fetch(
                                `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLocation[0]},${userLocation[1]}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=poi,place,neighborhood,address&limit=1`
                              );
                              
                              if (response.ok) {
                                const data = await response.json();
                                if (data.features && data.features.length > 0) {
                                  const currentLocationResult = {
                                    place_name: data.features[0].place_name,
                                    center: data.features[0].center,
                                    properties: { name: 'Current Location' }
                                  };
                                  setSearchResults([currentLocationResult]);
                                  setSearchQuery(data.features[0].place_name);
                                } else {
                                  const fallbackResult = {
                                    place_name: 'Current Location',
                                    center: userLocation,
                                    properties: { name: 'Current Location' }
                                  };
                                  setSearchResults([fallbackResult]);
                                  setSearchQuery('Current Location');
                                }
                              } else {
                                const fallbackResult = {
                                  place_name: 'Current Location',
                                  center: userLocation,
                                  properties: { name: 'Current Location' }
                                };
                                setSearchResults([fallbackResult]);
                                setSearchQuery('Current Location');
                              }
                            } catch (error) {
                              console.error('Reverse geocoding failed:', error);
                              const fallbackResult = {
                                place_name: 'Current Location',
                                center: userLocation,
                                properties: { name: 'Current Location' }
                              };
                              setSearchResults([fallbackResult]);
                              setSearchQuery('Current Location');
                            }
                            
                            // Center map on current location
                            if (cameraRef.current) {
                              cameraRef.current.setCamera({
                                centerCoordinate: userLocation,
                                zoomLevel: 16,
                                animationDuration: 1000
                              });
                            }
                            
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        } catch (error) {
                          console.error('Error getting current location:', error);
                        }
                      }}
                    >
                      <Ionicons name="locate" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  {showSearchDropdown && searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                      {searchResults.map((result, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.searchResultItem}
                          onPress={() => handleSearchResultSelect(result)}
                        >
                          <Ionicons name="location-outline" size={16} color="#666" />
                          <Text style={styles.searchResultText} numberOfLines={2}>
                            {result.place_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Transport options */}
              {bottomSheetView === 'transport' && (
                <View style={styles.transportSection}>
                  <View style={styles.transportGrid}>
                    {/* Row 1 */}
                    <View style={styles.transportRow}>
                      {Object.entries(transportModes).slice(0, 4).map(([key, mode]) => (
                        <TouchableOpacity
                          key={key}
                          style={styles.transportOption}
                          onPress={() => handleStartNavigation(key as keyof typeof transportModes)}
                        >
                          <Ionicons name={mode.icon} size={32} color={mode.color} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Row 2 */}
                    <View style={styles.transportRow}>
                      {Object.entries(transportModes).slice(4, 8).map(([key, mode]) => (
                        <TouchableOpacity
                          key={key}
                          style={styles.transportOption}
                          onPress={() => handleStartNavigation(key as keyof typeof transportModes)}
                        >
                          <Ionicons name={mode.icon} size={32} color={mode.color} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Road Sign Card */}
                  <View style={styles.roadSignCard}>
                    <View style={styles.roadSignHeader}>
                      <View style={styles.roadSignIconContainer}>
                        <Ionicons name="arrow-forward" size={28} color="#fff" />
                      </View>
                      <View style={styles.roadSignMainContent}>
                        <Text style={styles.roadSignInstruction}>
                          Ready to navigate
                        </Text>
                        <Text style={styles.roadSignDistance}>
                          {destinationAddress}
                        </Text>
                      </View>
                      <View style={styles.roadSignETA}>
                        <Text style={styles.roadSignETAText}>
                          Select transport
                        </Text>
                        <Text style={styles.roadSignETATime}>
                          Choose mode above
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.roadSignNextTurn}>
                      <View style={styles.nextTurnIcon}>
                        <Ionicons name="navigate-circle" size={20} color="#4ECDC4" />
                      </View>
                      <Text style={styles.nextTurnText}>
                        Tap a transport option to begin navigation
                      </Text>
                    </View>
                    
                    <View style={styles.roadSignProgress}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '0%' }]} />
                      </View>
                      <Text style={styles.roadSignProgressText}>
                        Select transport mode to start
                      </Text>
                    </View>
                  </View>
                  
                  {/* Begin Navigation Button */}
                  <TouchableOpacity
                    style={[
                      styles.addPinButton,
                      { opacity: 0.5, marginTop: 16 }
                    ]}
                    disabled={true}
                  >
                    <Text style={[
                      styles.addPinButtonText,
                      { color: '#fff' }
                    ]}>
                      Select Transport Mode Above
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Route Info Section - Show when route is active */}
              {bottomSheetView === 'route' && currentRoute && (
                <View style={styles.routeSection}>
                  <Text style={styles.sectionTitle}>Route Info</Text>
                  <View style={styles.routeInfo}>
                    <Ionicons 
                      name={transportModes[currentRoute.mode]?.icon || 'car'} 
                      size={32} 
                      color={transportModes[currentRoute.mode]?.color || '#96CEB4'} 
                    />
                    <View style={styles.routeInfoText}>
                      <Text style={styles.routeInfoTitle}>
                        {destinationAddress || 'Destination'}
                      </Text>
                      <Text style={styles.routeInfoSubtitle}>
                        {(currentRoute.distance / 1000).toFixed(1)} km • {Math.round(currentRoute.duration / 60)} min
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.clearRouteButton}
                      onPress={() => {
                        setCurrentRoute(null);
                        setNavigationDestination(null);
                        setDestinationAddress('');
                        setSearchQuery('');
                        setBottomSheetView('search');
                        bottomSheetRef.current?.snapToIndex(1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{marginLeft: 10, padding: 8}}
                      onPress={() => {
                        setBottomSheetView('navigation');
                        bottomSheetRef.current?.expand();
                        setNavigationStartTime(new Date());
                        setNavigationProgress(0); // Start at 0% progress
                        startMapNavigation(); // Trigger map navigation
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    >
                      <Ionicons name="navigate" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

                {/* Pin Drop Section */}
                {bottomSheetView === 'pinDrop' && (
                  <View style={styles.pinDropSection}>
                    <View style={styles.pinDropHeader}>
                      <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setBottomSheetView('search')}
                      >
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.pinDropTitle}>Drop a Pin</Text>
                    </View>
                    
                    <Text style={styles.pinDropSubtitle}>
                      Search for a location or tap on the map to select
                    </Text>
                    
                    <TextInput
                      style={styles.pinTitleInput}
                      placeholder="Pin title (required)"
                      placeholderTextColor="#fff"
                      value={newPinTitle}
                      onChangeText={setNewPinTitle}
                    />
                    
                    {/* Location Search Section */}
                    <View style={styles.locationSearchSection}>
                      <View style={styles.locationSearchContainer}>
                        <Ionicons name="search" size={20} color="#fff" />
                        <TextInput
                          style={styles.locationSearchInput}
                          placeholder="Search for location..."
                          placeholderTextColor="#fff"
                          value={newPinLocation}
                          onChangeText={(text) => {
                            setNewPinLocation(text);
                            
                            // Clear previous timeout
                            if (locationSearchTimeout) {
                              clearTimeout(locationSearchTimeout);
                            }
                            
                            // Set new timeout for debounced search
                            if (text.trim()) {
                              const timeout = setTimeout(() => {
                                searchLocationForPin(text);
                              }, 300); // 300ms delay
                              setLocationSearchTimeout(timeout);
                            } else {
                              setLocationSearchResults([]);
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={styles.currentLocationButton}
                          onPress={async () => {
                            try {
                              await initializeLocation();
                              if (userLocation) {
                                setNewPinCoordinates(userLocation);
                                
                                // Reverse geocode to get actual address
                                try {
                                  const response = await fetch(
                                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLocation[0]},${userLocation[1]}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=poi,place,neighborhood,address&limit=1`
                                  );
                                  
                                  if (response.ok) {
                                    const data = await response.json();
                                    if (data.features && data.features.length > 0) {
                                      setNewPinLocation(data.features[0].place_name);
                                    } else {
                                      setNewPinLocation('Current Location');
                                    }
                                  } else {
                                    setNewPinLocation('Current Location');
                                  }
                                } catch (error) {
                                  console.error('Reverse geocoding failed:', error);
                                  setNewPinLocation('Current Location');
                                }
                                
                                setLocationSearchResults([]);
                                
                                // Center map on current location
                                if (mapRef.current) {
                                  mapRef.current.setCamera({
                                    centerCoordinate: userLocation,
                                    zoomLevel: 16,
                                    animationDuration: 1000
                                  });
                                }
                                
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }
                            } catch (error) {
                              console.error('Error getting current location:', error);
                            }
                          }}
                        >
                          <Ionicons name="locate" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Location Search Results */}
                      {locationSearchResults.length > 0 && (
                        <ScrollView 
                          style={styles.locationSearchResults}
                          showsVerticalScrollIndicator={false}
                        >
                          {locationSearchResults.map((result, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.locationSearchResult}
                              onPress={() => {
                                setNewPinLocation(result.place_name);
                                setNewPinCoordinates([result.center[0], result.center[1]]);
                                setLocationSearchResults([]);
                              }}
                            >
                              <Ionicons name="location" size={16} color="#666" />
                              <Text style={styles.locationSearchResultText}>
                                {result.place_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                    
                    {newPinCoordinates && (
                      <View style={styles.selectedLocationContainer}>
                        <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
                        <Text style={styles.selectedLocationText}>
                          Location selected: {newPinLocation}
                        </Text>
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={[
                        styles.addPinButton,
                        { opacity: newPinTitle.trim() && newPinCoordinates ? 1 : 0.5 }
                      ]}
                      onPress={handleAddPin}
                      disabled={!newPinTitle.trim() || !newPinCoordinates}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.addPinButtonText,
                        { color: '#fff' }
                      ]}>
                        Add Pin
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.viewAllPinsButton}
                      onPress={() => {
                        setBottomSheetView('pinList');
                        bottomSheetRef.current?.snapToIndex(1);
                      }}
                    >
                      <Ionicons name="list" size={16} color="#4ECDC4" />
                      <Text style={styles.viewAllPinsButtonText}>View All Pins</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Pin List Section */}
                {bottomSheetView === 'pinList' && (
                  <View style={styles.pinListSection}>
                    <View style={styles.pinListHeader}>
                      <Text style={styles.pinListTitle}>My Pins</Text>
                      <Text style={styles.pinListSubtitle}>{pins.length} saved locations</Text>
                    </View>
                    
                    <ScrollView 
                      style={styles.pinListScroll}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ flexGrow: 1 }}
                    >
                      {pins.map((pin) => (
                        <View
                          key={pin.id}
                          style={styles.pinListItem}
                        >
                          <View style={styles.pinListItemContent}>
                            <Text style={styles.pinListItemTitle}>{pin.title}</Text>
                            {pin.description && (
                              <Text style={styles.pinListItemDescription}>
                                {pin.description}
                              </Text>
                            )}
                            <Text style={styles.pinListItemLocation}>
                              {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                            </Text>
                          </View>
                          
                          <TouchableOpacity
                            style={styles.pinListItemAction}
                            onPress={() => handlePinNavigation(pin)}
                          >
                            <Ionicons name="navigate" size={20} color="#4ECDC4" />
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.pinListItemDelete}
                            onPress={() => handleRemovePin(pin.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#FF4757" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      
                      {pins.length === 0 && (
                        <View style={styles.emptyPinList}>
                          <Ionicons name="location-outline" size={48} color="#666" />
                          <Text style={styles.emptyPinListTitle}>No Pins Yet</Text>
                          <Text style={styles.emptyPinListSubtitle}>
                            Drop some pins on the map to see them here
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}

              {/* Navigation View - Real-time navigation with road sign cards */}
              {bottomSheetView === 'navigation' && currentRoute && (
                <View style={styles.navigationSection}>
                  <View style={styles.navigationHeader}>
                    <Text style={styles.navigationTitle}>Navigation</Text>
                    <TouchableOpacity 
                      style={styles.stopNavigationButton}
                      onPress={() => {
                        setBottomSheetView('route');
                        bottomSheetRef.current?.snapToIndex(1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.roadSignCard}>
                    <View style={styles.roadSignHeader}>
                      <View style={styles.roadSignIconContainer}>
                        <Ionicons name="arrow-forward" size={28} color="#fff" />
                      </View>
                      <View style={styles.roadSignMainContent}>
                        <Text style={styles.roadSignInstruction}>
                          Continue straight
                        </Text>
                        <Text style={styles.roadSignDistance}>
                          500m
                        </Text>
                      </View>
                      <View style={styles.roadSignETA}>
                        <Text style={styles.roadSignETAText}>
                          ETA
                        </Text>
                        <Text style={styles.roadSignETATime}>
                          {getETA()}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.roadSignNextTurn}>
                      <View style={styles.nextTurnIcon}>
                        <Ionicons name="arrow-forward-circle" size={20} color="#4ECDC4" />
                      </View>
                      <Text style={styles.nextTurnText}>
                        Then turn right onto Main Street
                      </Text>
                    </View>
                    
                    <View style={styles.roadSignProgress}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${navigationProgress}%` }]} />
                      </View>
                      <Text style={styles.roadSignProgressText}>
                        {Math.round(currentRoute.distance / 1000)} km remaining
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.navigationInfo}>
                    <Text style={styles.navigationDestination}>
                      {destinationAddress}
                    </Text>
                    <Text style={styles.navigationMode}>
                      {transportModes[currentRoute.mode]?.label} • {Math.round(currentRoute.duration / 60)} min
                    </Text>
                  </View>
                </View>
              )}
            </BottomSheetView>
          </BottomSheet>
        </View>

      </View>

      {/* Selected Pin Info */}
      {selectedPin && (
        <View style={styles.pinInfo}>
          <View style={styles.pinInfoHeader}>
            <Text style={styles.pinInfoTitle}>{selectedPin.title}</Text>
            <TouchableOpacity
              onPress={() => handleRemovePin(selectedPin.id)}
              style={styles.removeButton}
            >
              <Ionicons name="trash-outline" size={20} color="#FF4757" />
            </TouchableOpacity>
          </View>
          {selectedPin.description ? (
            <Text style={styles.pinInfoDescription}>{selectedPin.description}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.navigateToButton}
            onPress={() => handlePinNavigation(selectedPin)}
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.navigateToButtonText}>Navigate Here</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Pin Modal */}
      <Modal visible={showPinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Pin</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={newPinTitle}
                onChangeText={setNewPinTitle}
                placeholder="Enter pin title"
                placeholderTextColor="#666"
              />
              
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={newPinDescription}
                onChangeText={setNewPinDescription}
                placeholder="Enter description"
                placeholderTextColor="#666"
                multiline
              />
              
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {Object.entries(pinCategories).map(([key, category]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: category.color },
                      newPinCategory === key && styles.selectedCategory
                    ]}
                    onPress={() => setNewPinCategory(key as keyof typeof pinCategories)}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={[styles.actionButton, !newPinTitle.trim() && styles.disabledButton]}
                onPress={handleAddPin}
                disabled={!newPinTitle.trim()}
              >
                <Text style={styles.actionButtonText}>Add Pin</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Download Area Modal */}
      <Modal visible={showDownloadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Area</Text>
              <TouchableOpacity onPress={() => setShowDownloadModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Area Name</Text>
              <TextInput
                style={styles.textInput}
                value={downloadAreaName}
                onChangeText={setDownloadAreaName}
                placeholder="Enter area name"
                placeholderTextColor="#666"
              />
              
              <Text style={styles.inputLabel}>Download Radius: {downloadRadius}km</Text>
              <View style={styles.radiusSelector}>
                <TouchableOpacity 
                  style={styles.radiusButton}
                  onPress={() => setDownloadRadius(Math.max(1, downloadRadius - 1))}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.radiusDisplay}>
                  <Text style={styles.radiusText}>{downloadRadius}km</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.radiusButton}
                  onPress={() => setDownloadRadius(Math.min(20, downloadRadius + 1))}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.radiusPresets}>
                {[2, 5, 10, 15].map(preset => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      downloadRadius === preset && styles.activePreset
                    ]}
                    onPress={() => setDownloadRadius(preset)}
                  >
                    <Text style={[
                      styles.presetText,
                      downloadRadius === preset && styles.activePresetText
                    ]}>{preset}km</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.downloadInfo}>
                Estimated size: {(downloadRadius * 2).toFixed(1)}MB
              </Text>
              
              {isDownloading ? (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>Downloading... {downloadProgress}%</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, !downloadAreaName.trim() && styles.disabledButton]}
                  onPress={handleDownloadArea}
                  disabled={!downloadAreaName.trim()}
                >
                  <Text style={styles.actionButtonText}>Download Area</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Permission Modal */}
      <Modal
        visible={showLocationPermissionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationPermissionModalContainer}>
            <View style={styles.locationPermissionIcon}>
              <Ionicons name="location" size={48} color="#10b981" />
            </View>
            <Text style={styles.locationPermissionTitle}>Location Access</Text>
            <Text style={styles.locationPermissionText}>
              Offline Maps needs access to your location to provide:
            </Text>
            <View style={styles.locationPermissionFeatures}>
              <View style={styles.locationPermissionFeature}>
                <Ionicons name="navigate" size={20} color="#10b981" />
                <Text style={styles.locationPermissionFeatureText}>Real-time navigation</Text>
              </View>
              <View style={styles.locationPermissionFeature}>
                <Ionicons name="locate" size={20} color="#10b981" />
                <Text style={styles.locationPermissionFeatureText}>Your current position</Text>
              </View>
              <View style={styles.locationPermissionFeature}>
                <Ionicons name="map" size={20} color="#10b981" />
                <Text style={styles.locationPermissionFeatureText}>Movement tracking</Text>
              </View>
            </View>
            <View style={styles.locationPermissionButtonsColumn}>
              <TouchableOpacity
                style={styles.locationPermissionButtonSecondary}
                onPress={() => {
                  setShowLocationPermissionModal(false);
                  navigation?.goBack?.();
                }}
              >
                <Text style={styles.locationPermissionButtonSecondaryText}>Don't Allow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationPermissionButtonPrimary}
                onPress={async () => {
                  setShowLocationPermissionModal(false);
                  try {
                    await initializeLocation();
                  } catch (error) {
                    console.error('Error initializing location:', error);
                  }
                }}
              >
                <Text style={styles.locationPermissionButtonPrimaryText}>Allow While Using App</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationPermissionButtonTertiary}
                onPress={async () => {
                  setShowLocationPermissionModal(false);
                  try {
                    // Request permission with "just once" option
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                      await initializeLocation();
                    }
                  } catch (error) {
                    console.error('Error initializing location:', error);
                  }
                }}
              >
                <Text style={styles.locationPermissionButtonTertiaryText}>Use Just This Once</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationPermissionButtonTertiary}
                onPress={async () => {
                  setShowLocationPermissionModal(false);
                  try {
                    // Request permission with "ask every time" option
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                      await initializeLocation();
                    }
                  } catch (error) {
                    console.error('Error initializing location:', error);
                  }
                }}
              >
                <Text style={styles.locationPermissionButtonTertiaryText}>Ask Every Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181A20' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', fontSize: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#181A20',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  fabContainer: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    alignItems: 'center',
    zIndex: 1,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#23242b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 0,
    marginBottom: 16,
  },

  pinMarker: { 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  pinIcon: { 
    fontSize: 32,
    color: '#4ECDC4',
  },
  pinInfo: { 
    backgroundColor: '#23242b', 
    margin: 16, 
    padding: 16, 
    borderRadius: 12 
  },
  pinInfoHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  pinInfoTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    flex: 1 
  },
  removeButton: { padding: 4 },
  pinInfoDescription: { 
    color: '#ccc', 
    fontSize: 14, 
    marginTop: 8 
  },
  navigateToButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 12 
  },
  navigateToButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    marginLeft: 8 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContainer: { 
    backgroundColor: '#23242b', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    maxHeight: height * 0.8 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#333' 
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    opacity: 0.5,
  },
  modalContent: { padding: 20 },
  inputLabel: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  textInput: { 
    backgroundColor: '#181A20', 
    borderRadius: 12, 
    padding: 16, 
    color: '#fff', 
    fontSize: 16, 
    marginBottom: 16 
  },
  categoryScroll: { marginBottom: 20 },
  categoryButton: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedCategory: { borderColor: '#fff' },
  categoryIcon: { fontSize: 20 },
  radiusSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16,
    gap: 16
  },
  radiusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  radiusDisplay: {
    minWidth: 80,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radiusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  radiusPresets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8
  },
  presetButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center'
  },
  activePreset: {
    backgroundColor: '#007AFF'
  },
  presetText: {
    color: '#ccc',
    fontSize: 14
  },
  activePresetText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  downloadInfo: { 
    color: '#ccc', 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  progressContainer: { alignItems: 'center' },
  progressText: { 
    color: '#fff', 
    fontSize: 16, 
    marginBottom: 12 
  },
  progressBar: { 
    width: '100%', 
    height: 8, 
    backgroundColor: '#333', 
    borderRadius: 4, 
    overflow: 'hidden' 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#007AFF' 
  },
  actionButton: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  disabledButton: { 
    backgroundColor: '#333', 
    opacity: 0.5 
  },
  actionButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#23242b',
    padding: 20,
  },
  mapErrorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  mapErrorText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingSearchContainer: {
    position: 'absolute',
    top: 45, // Move higher up (was 60)
    left: 20,
    right: 20,
    zIndex: 10,
  },
  floatingSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23242b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  floatingSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0, // Remove any horizontal padding that might cause weird lines
    borderWidth: 0, // Remove any border
    backgroundColor: 'transparent', // Ensure no background
  },
  searchSpinner: {
    marginLeft: 8,
  },
  floatingSearchResults: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    backgroundColor: '#23242b',
  },
  floatingSearchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  floatingSearchResultText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  searchGoButton: {
    backgroundColor: DARK_BLUE,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  searchGoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  transportOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    gap: 0,
  },
  transportOptionLarge: {
    flex: 0,
    maxWidth: 60,
    minWidth: 48,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: '#23242b',
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 2,
  },
  transportOptionTextLarge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  transportEmoji: {
    fontSize: 28,
  },
  modalButtonSecondary: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
    width: '100%',
    alignSelf: 'center',
  },
  modalButtonTextSecondary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  destinationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  destinationSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 20,
  },
  startMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DARK_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  endMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DARK_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeInfoBottomPopup: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    zIndex: 10,
  },
  routeInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#23242b',
    borderWidth: 1,
    borderColor: '#333',
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeInfoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearRouteButton: {
    marginLeft: 10,
    padding: 4,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeInfoTextContainer: {
    marginLeft: 10,
  },
  routeInfoSubtitle: {
    color: '#ccc',
    fontSize: 12,
  },
  // Bottom sheet styles
  bottomSheetBackground: {
    backgroundColor: '#23242b',
    elevation: 99999,
  },
  bottomSheetIndicator: {
    backgroundColor: '#666',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#333',
    borderRadius: 12,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  searchResultText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  transportSection: {
    marginTop: 16,
    paddingBottom: 20,
    maxHeight: 300, // Limit height to prevent empty space
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transportOption: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181A20',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '23%',
    height: 80,
  },
  routeSection: {
    marginBottom: 16,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  routeInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  pinDropSection: {
    marginTop: 16,
    paddingBottom: 20,
  },
  pinDropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinDropTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  pinDropSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 20,
  },
  pinTitleInput: {
    backgroundColor: '#181A20',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    minHeight: 50,
  },
  pinLocationInput: {
    backgroundColor: '#181A20',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    minHeight: 50,
  },
  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  selectedLocationText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  addPinButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addPinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationSearchSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  locationSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181A20',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  locationSearchResults: {
    marginTop: 8,
    backgroundColor: '#333',
    borderRadius: 12,
    maxHeight: 150,
    overflow: 'hidden',
  },
  locationSearchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  locationSearchResultText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  currentLocationButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#333',
    marginLeft: 8,
  },
  pillNotification: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4ECDC4',
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
  },
  pillNotificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  currentLocationSearchButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#333',
    marginLeft: 8,
  },
  pinListSection: {
    marginTop: 16,
    paddingBottom: 20,
  },
  pinListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinListTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pinListSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  pinListScroll: {
    flex: 1,
  },
  pinListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: '#2a2b32',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  pinListItemContent: {
    flex: 1,
  },
  pinListItemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pinListItemDescription: {
    color: '#ccc',
    fontSize: 14,
  },
  pinListItemLocation: {
    color: '#ccc',
    fontSize: 12,
  },
  pinListItemAction: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#333',
    marginLeft: 10,
  },
  pinListItemDelete: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#333',
    marginLeft: 10,
  },
  emptyPinList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyPinListTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyPinListSubtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  viewAllPinsButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  viewAllPinsButtonText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transportGrid: {
    padding: 10,
  },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  startNavigationButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 10,
  },
  startNavigationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationSection: {
    marginTop: 16,
    paddingBottom: 20,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navigationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stopNavigationButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#333',
    marginLeft: 10,
  },
  roadSignCard: {
    backgroundColor: '#23242b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  roadSignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  roadSignIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  roadSignMainContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  roadSignInstruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roadSignDistance: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
  },
  roadSignETA: {
    alignItems: 'flex-end',
  },
  roadSignETAText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  roadSignETATime: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roadSignNextTurn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  nextTurnIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextTurnText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  roadSignProgress: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
    width: '65%',
  },
  roadSignProgressText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  navigationInfo: {
    marginTop: 10,
  },
  navigationDestination: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigationMode: {
    color: '#ccc',
    fontSize: 14,
  },
  // Location Permission Modal Styles
  locationPermissionModalContainer: {
    backgroundColor: '#23242b',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 40,
    alignItems: 'center',
    maxWidth: 400,
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    transform: [{ translateY: -200 }],
  },
  locationPermissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationPermissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  locationPermissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  locationPermissionFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  locationPermissionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationPermissionFeatureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  locationPermissionButtonsColumn: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    marginTop: 8,
    marginBottom: 0,
  },
  locationPermissionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
  },
  locationPermissionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
    textAlign: 'center',
  },
  locationPermissionButtonPrimary: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
  },
  locationPermissionButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  locationPermissionAdditionalButtons: {
    marginTop: 12,
    width: '100%',
  },
  locationPermissionButtonTertiary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
    height: 56,
  },
  locationPermissionButtonTertiaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
});