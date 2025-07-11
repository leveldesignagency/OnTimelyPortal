import { useState, useEffect, useCallback } from 'react';
import { Stage1TravelService, TravelProfile, JourneyCheckpoint, GuestNotification, GPSTrackingData } from '../services/stage1TravelService';

interface UseStage1TravelOptions {
  guestId: string;
  eventId: string;
  enableRealTimeTracking?: boolean;
  trackingIntervalMs?: number;
}

interface Stage1TravelState {
  profile: TravelProfile | null;
  checkpoints: JourneyCheckpoint[];
  notifications: GuestNotification[];
  currentLocation: GPSTrackingData | null;
  isLoading: boolean;
  error: string | null;
  isTracking: boolean;
}

interface Stage1TravelActions {
  // Profile Management
  createProfile: (profileData: Partial<TravelProfile>) => Promise<void>;
  updateProfile: (updates: Partial<TravelProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Checkpoint Management
  completeCheckpoint: (checkpointId: string, method?: 'auto_detected' | 'guest_confirmed' | 'manual_override') => Promise<void>;
  updateCheckpoint: (checkpointId: string, updates: Partial<JourneyCheckpoint>) => Promise<void>;
  
  // Notification Management
  sendCheckpointPrompt: (checkpointId: string, checkpointName: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  respondToNotification: (notificationId: string, responseData: any) => Promise<void>;
  
  // GPS Tracking
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  recordLocation: (locationData: Omit<GPSTrackingData, 'id' | 'travel_profile_id' | 'created_at'>) => Promise<void>;
  
  // Driver Verification
  verifyDriver: (method: 'barcode_scan' | 'qr_code' | 'manual_code' | 'photo_verification', code: string, data?: any) => Promise<boolean>;
  
  // Flight Data
  searchFlightData: (flightNumber: string, flightDate: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

export const useStage1Travel = (options: UseStage1TravelOptions): [Stage1TravelState, Stage1TravelActions] => {
  const { guestId, eventId, enableRealTimeTracking = false, trackingIntervalMs = 30000 } = options;

  // State
  const [state, setState] = useState<Stage1TravelState>({
    profile: null,
    checkpoints: [],
    notifications: [],
    currentLocation: null,
    isLoading: false,
    error: null,
    isTracking: false
  });

  // Tracking interval reference
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<Stage1TravelState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper function to handle errors
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Stage1Travel Error (${context}):`, error);
    updateState({ 
      error: error.message || `Failed to ${context}`,
      isLoading: false 
    });
  }, [updateState]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!guestId || !eventId) return;

    updateState({ isLoading: true, error: null });

    try {
      // Load travel profile
      const profile = await Stage1TravelService.getTravelProfile(guestId, eventId);
      
      if (profile) {
        // Load related data
        const [checkpoints, notifications, currentLocation] = await Promise.all([
          Stage1TravelService.getCheckpoints(profile.id),
          Stage1TravelService.getNotifications(profile.id),
          Stage1TravelService.getCurrentLocation(profile.id)
        ]);

        updateState({
          profile,
          checkpoints,
          notifications,
          currentLocation,
          isLoading: false
        });
      } else {
        updateState({ isLoading: false });
      }
    } catch (error) {
      handleError(error, 'load travel data');
    }
  }, [guestId, eventId, updateState, handleError]);

  // Profile Management Actions
  const createProfile = useCallback(async (profileData: Partial<TravelProfile>) => {
    updateState({ isLoading: true, error: null });

    try {
      const profile = await Stage1TravelService.createTravelProfile({
        id: guestId,
        event_id: eventId,
        ...profileData
      });

      // Load checkpoints for the new profile
      const checkpoints = await Stage1TravelService.getCheckpoints(profile.id);

      updateState({
        profile,
        checkpoints,
        isLoading: false
      });
    } catch (error) {
      handleError(error, 'create travel profile');
    }
  }, [guestId, eventId, updateState, handleError]);

  const updateProfile = useCallback(async (updates: Partial<TravelProfile>) => {
    if (!state.profile) return;

    updateState({ isLoading: true, error: null });

    try {
      const updatedProfile = await Stage1TravelService.updateTravelProfile(state.profile.id, updates);
      updateState({
        profile: updatedProfile,
        isLoading: false
      });
    } catch (error) {
      handleError(error, 'update travel profile');
    }
  }, [state.profile, updateState, handleError]);

  const refreshProfile = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Checkpoint Management Actions
  const completeCheckpoint = useCallback(async (
    checkpointId: string, 
    method: 'auto_detected' | 'guest_confirmed' | 'manual_override' = 'guest_confirmed'
  ) => {
    updateState({ isLoading: true, error: null });

    try {
      const updatedCheckpoint = await Stage1TravelService.completeCheckpoint(checkpointId, method);
      
      updateState({
        checkpoints: state.checkpoints.map(cp => 
          cp.id === checkpointId ? updatedCheckpoint : cp
        ),
        isLoading: false
      });

      // Update journey status based on completed checkpoint
      if (state.profile && updatedCheckpoint.checkpoint_type) {
        const statusMap: Record<string, TravelProfile['journey_status']> = {
          'airport_arrival': 'in_transit',
          'security': 'at_security',
          'meet_driver': 'met_driver',
          'en_route': 'en_route_hotel',
          'hotel_arrival': 'arrived_hotel'
        };

        const newStatus = statusMap[updatedCheckpoint.checkpoint_type];
        if (newStatus) {
          await updateProfile({ journey_status: newStatus });
        }
      }
    } catch (error) {
      handleError(error, 'complete checkpoint');
    }
  }, [state.checkpoints, state.profile, updateState, handleError, updateProfile]);

  const updateCheckpoint = useCallback(async (checkpointId: string, updates: Partial<JourneyCheckpoint>) => {
    updateState({ isLoading: true, error: null });

    try {
      const updatedCheckpoint = await Stage1TravelService.updateCheckpoint(checkpointId, updates);
      
      updateState({
        checkpoints: state.checkpoints.map(cp => 
          cp.id === checkpointId ? updatedCheckpoint : cp
        ),
        isLoading: false
      });
    } catch (error) {
      handleError(error, 'update checkpoint');
    }
  }, [state.checkpoints, updateState, handleError]);

  // Notification Management Actions
  const sendCheckpointPrompt = useCallback(async (checkpointId: string, checkpointName: string) => {
    if (!state.profile) return;

    try {
      const notification = await Stage1TravelService.sendCheckpointPrompt(
        state.profile.id,
        checkpointId,
        checkpointName
      );

      updateState({
        notifications: [notification, ...state.notifications]
      });
    } catch (error) {
      handleError(error, 'send checkpoint prompt');
    }
  }, [state.profile, state.notifications, updateState, handleError]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await Stage1TravelService.markNotificationAsRead(notificationId);
      
      updateState({
        notifications: state.notifications.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_at: new Date().toISOString(), status: 'read' }
            : notif
        )
      });
    } catch (error) {
      handleError(error, 'mark notification as read');
    }
  }, [state.notifications, updateState, handleError]);

  const respondToNotification = useCallback(async (notificationId: string, responseData: any) => {
    try {
      await Stage1TravelService.respondToNotification(notificationId, responseData);
      
      updateState({
        notifications: state.notifications.map(notif => 
          notif.id === notificationId 
            ? { 
                ...notif, 
                response_received: true, 
                response_data: responseData,
                response_time: new Date().toISOString(),
                status: 'responded'
              }
            : notif
        )
      });
    } catch (error) {
      handleError(error, 'respond to notification');
    }
  }, [state.notifications, updateState, handleError]);

  // GPS Tracking Actions
  const startTracking = useCallback(async () => {
    if (!state.profile || state.isTracking) return;

    try {
      updateState({ isTracking: true, error: null });

      // Request geolocation permission
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Start watching position
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_meters: Math.round(position.coords.accuracy),
            altitude_meters: position.coords.altitude ? Math.round(position.coords.altitude) : undefined,
            speed_kmh: position.coords.speed ? Math.round(position.coords.speed * 3.6) : undefined,
            heading_degrees: position.coords.heading ? Math.round(position.coords.heading) : undefined,
            recorded_at: new Date().toISOString()
          };

          try {
            const gpsData = await Stage1TravelService.recordGPSLocation({
              travel_profile_id: state.profile!.id,
              ...locationData
            });

            updateState({ currentLocation: gpsData });

            // Check for nearby checkpoints
            const nearbyCheckpoints = await Stage1TravelService.checkNearbyCheckpoints(
              state.profile!.id,
              locationData.latitude,
              locationData.longitude
            );

            // Send notifications for approaching checkpoints
            for (const checkpoint of nearbyCheckpoints) {
              if (checkpoint.status === 'pending') {
                await sendCheckpointPrompt(checkpoint.id, checkpoint.checkpoint_name);
                await updateCheckpoint(checkpoint.id, { status: 'approaching' });
              }
            }
          } catch (error) {
            console.error('Error recording GPS location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          handleError(error, 'track location');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );

      setWatchId(id);

      // Set up periodic tracking updates
      if (enableRealTimeTracking) {
        const interval = setInterval(async () => {
          // Additional tracking logic could go here
          console.log('Tracking update interval');
        }, trackingIntervalMs);

        setTrackingInterval(interval);
      }

    } catch (error) {
      handleError(error, 'start GPS tracking');
      updateState({ isTracking: false });
    }
  }, [state.profile, state.isTracking, enableRealTimeTracking, trackingIntervalMs, updateState, handleError, sendCheckpointPrompt, updateCheckpoint]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }

    updateState({ isTracking: false });
  }, [watchId, trackingInterval, updateState]);

  const recordLocation = useCallback(async (locationData: Omit<GPSTrackingData, 'id' | 'travel_profile_id' | 'created_at'>) => {
    if (!state.profile) return;

    try {
      const gpsData = await Stage1TravelService.recordGPSLocation({
        travel_profile_id: state.profile.id,
        ...locationData
      });

      updateState({ currentLocation: gpsData });
    } catch (error) {
      handleError(error, 'record location');
    }
  }, [state.profile, updateState, handleError]);

  // Driver Verification Actions
  const verifyDriver = useCallback(async (
    method: 'barcode_scan' | 'qr_code' | 'manual_code' | 'photo_verification',
    code: string,
    data?: any
  ): Promise<boolean> => {
    if (!state.profile) return false;

    try {
      updateState({ isLoading: true, error: null });

      // Get current location for verification
      let location: { lat: number; lng: number } | undefined;
      if (state.currentLocation) {
        location = {
          lat: state.currentLocation.latitude,
          lng: state.currentLocation.longitude
        };
      }

      const result = await Stage1TravelService.verifyDriver(
        state.profile.id,
        method,
        code,
        data,
        location
      );

      if (result.success) {
        // Update profile to reflect verification
        await updateProfile({
          driver_verified: true,
          driver_verification_time: new Date().toISOString()
        });

        // Complete the "Meet Driver" checkpoint if it exists
        const meetDriverCheckpoint = state.checkpoints.find(cp => cp.checkpoint_type === 'meet_driver');
        if (meetDriverCheckpoint && meetDriverCheckpoint.status === 'pending') {
          await completeCheckpoint(meetDriverCheckpoint.id, 'auto_detected');
        }
      }

      updateState({ isLoading: false });
      return result.success;
    } catch (error) {
      handleError(error, 'verify driver');
      return false;
    }
  }, [state.profile, state.currentLocation, state.checkpoints, updateState, handleError, updateProfile, completeCheckpoint]);

  // Flight Data Actions
  const searchFlightData = useCallback(async (flightNumber: string, flightDate: string) => {
    updateState({ isLoading: true, error: null });

    try {
      const flightData = await Stage1TravelService.fetchFlightData(flightNumber, flightDate);
      
      if (state.profile) {
        await updateProfile({
          flight_number: flightNumber,
          flight_date: flightDate,
          flight_departure_time: flightData.departure_time,
          flight_arrival_time: flightData.arrival_time,
          flight_status: flightData.flight_status,
          departure_airport: flightData.departure_airport,
          arrival_airport: flightData.arrival_airport
        });
      }

      updateState({ isLoading: false });
    } catch (error) {
      handleError(error, 'search flight data');
    }
  }, [state.profile, updateState, handleError, updateProfile]);

  // Utility Actions
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Effects
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Auto-start tracking if enabled and profile exists
  useEffect(() => {
    if (enableRealTimeTracking && state.profile && state.profile.gps_tracking_enabled && !state.isTracking) {
      startTracking();
    }
  }, [enableRealTimeTracking, state.profile, state.isTracking, startTracking]);

  const actions: Stage1TravelActions = {
    createProfile,
    updateProfile,
    refreshProfile,
    completeCheckpoint,
    updateCheckpoint,
    sendCheckpointPrompt,
    markNotificationAsRead,
    respondToNotification,
    startTracking,
    stopTracking,
    recordLocation,
    verifyDriver,
    searchFlightData,
    clearError
  };

  return [state, actions];
}; 