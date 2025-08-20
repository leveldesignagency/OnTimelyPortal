import { supabase } from '../lib/supabase';
import { insertActivityLog } from '../lib/supabase';


// ============================================
// TYPE DEFINITIONS
// ============================================

export interface TravelProfile {
  id: string;
  guest_id: string;
  event_id: string;
  
  // Flight Information
  flight_number?: string;
  flight_date?: string;
  flight_departure_time?: string;
  flight_arrival_time?: string;
  flight_status?: 'scheduled' | 'delayed' | 'cancelled' | 'landed';
  departure_airport?: string;
  arrival_airport?: string;
  
  // Hotel Information
  hotel_reservation_number?: string;
  hotel_name?: string;
  hotel_address?: string;
  hotel_check_in_time?: string;
  
  // Driver Information
  driver_verification_code?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_license_plate?: string;
  driver_verified?: boolean;
  driver_verification_time?: string;
  
  // Tracking Settings
  gps_tracking_enabled?: boolean;
  checkpoint_notifications_enabled?: boolean;
  
  // Journey Status
  journey_status?: 'not_started' | 'in_transit' | 'at_security' | 'met_driver' | 'en_route_hotel' | 'arrived_hotel';
  current_location_lat?: number;
  current_location_lng?: number;
  last_location_update?: string;
  
  created_at?: string;
  updated_at?: string;
}

export interface JourneyCheckpoint {
  id: string;
  travel_profile_id: string;
  checkpoint_name: string;
  checkpoint_type: 'airport_arrival' | 'security' | 'baggage_claim' | 'customs' | 'meet_driver' | 'en_route' | 'hotel_arrival';
  description?: string;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  expected_time?: string;
  actual_time?: string;
  status?: 'pending' | 'approaching' | 'completed' | 'skipped';
  completion_method?: 'auto_detected' | 'guest_confirmed' | 'manual_override';
  created_at?: string;
  updated_at?: string;
}

export interface GuestNotification {
  id: string;
  travel_profile_id: string;
  checkpoint_id?: string;
  notification_type: 'checkpoint_prompt' | 'status_update' | 'driver_info' | 'emergency_alert';
  title: string;
  message: string;
  delivery_method: 'push_notification' | 'sms' | 'email' | 'in_app';
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  requires_response?: boolean;
  response_received?: boolean;
  response_data?: any;
  response_time?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'responded' | 'failed';
  created_at?: string;
  updated_at?: string;
}

export interface GPSTrackingData {
  id: string;
  travel_profile_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  altitude_meters?: number;
  speed_kmh?: number;
  heading_degrees?: number;
  location_source?: 'gps' | 'network' | 'passive';
  battery_level?: number;
  is_moving?: boolean;
  recorded_at: string;
  created_at?: string;
}

export interface DriverVerificationLog {
  id: string;
  travel_profile_id: string;
  verification_method: 'barcode_scan' | 'qr_code' | 'manual_code' | 'photo_verification';
  verification_code?: string;
  verification_data?: any;
  verification_successful: boolean;
  failure_reason?: string;
  verification_lat?: number;
  verification_lng?: number;
  verified_at: string;
  created_at?: string;
}

export interface JourneyAnalytics {
  id: string;
  travel_profile_id: string;
  total_journey_time_minutes?: number;
  airport_to_driver_time_minutes?: number;
  driver_to_hotel_time_minutes?: number;
  total_distance_km?: number;
  checkpoints_completed?: number;
  checkpoints_skipped?: number;
  average_checkpoint_delay_minutes?: number;
  notifications_sent?: number;
  notifications_responded?: number;
  average_response_time_minutes?: number;
  gps_data_points?: number;
  tracking_accuracy_average_meters?: number;
  journey_quality_score?: number;
  journey_completed?: boolean;
  completion_time?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// TRAVEL PROFILE MANAGEMENT
// ============================================

export class Stage1TravelService {
  
  /**
   * Create a new travel profile for a guest
   */
  static async createTravelProfile(profileData: Omit<TravelProfile, 'id' | 'created_at' | 'updated_at'>): Promise<TravelProfile> {
    const { data, error } = await supabase
      .from('guest_travel_profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      console.error('Error creating travel profile:', error);
      throw new Error(`Failed to create travel profile: ${error.message}`);
    }

    // Create default checkpoints
    await this.createDefaultCheckpoints(data.id);

    return data;
  }

  /**
   * Get travel profile by guest ID and event ID
   */
  static async getTravelProfile(guestId: string, eventId: string): Promise<TravelProfile | null> {
    const { data, error } = await supabase
      .from('guest_travel_profiles')
      .select('*')
      .eq('guest_id', guestId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No profile found
      }
      console.error('Error fetching travel profile:', error);
      throw new Error(`Failed to fetch travel profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Update travel profile
   */
  static async updateTravelProfile(profileId: string, updates: Partial<TravelProfile>): Promise<TravelProfile> {
    const { data, error } = await supabase
      .from('guest_travel_profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Error updating travel profile:', error);
      throw new Error(`Failed to update travel profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete travel profile
   */
  static async deleteTravelProfile(profileId: string): Promise<void> {
    const { error } = await supabase
      .from('guest_travel_profiles')
      .delete()
      .eq('id', profileId);

    if (error) {
      console.error('Error deleting travel profile:', error);
      throw new Error(`Failed to delete travel profile: ${error.message}`);
    }
  }

  /**
   * Hard-delete ALL Stage 1 profiles for a given guest and event.
   * Use this when the user clicks the X to ensure no stale searches remain.
   */
  static async deleteProfilesByGuestEvent(guestId: string, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('guest_travel_profiles')
      .delete()
      .eq('guest_id', guestId)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error deleting profiles by guest/event:', error);
      throw new Error(`Failed to delete travel profiles: ${error.message}`);
    }
  }

  /**
   * Clean up duplicate travel profiles for a guest/event combination
   * Keeps the most recent one and deletes the rest
   */
  static async cleanupDuplicateProfiles(guestId: string, eventId: string): Promise<void> {
    try {
      // Get all profiles for this guest/event combination
      const { data: profiles, error } = await supabase
        .from('guest_travel_profiles')
        .select('*')
        .eq('guest_id', guestId)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles for cleanup:', error);
        return;
      }

      // If more than one profile exists, delete the older ones
      if (profiles && profiles.length > 1) {
        console.log(`🧹 Found ${profiles.length} profiles, cleaning up duplicates...`);
        
        const profilesToDelete = profiles.slice(1); // Keep the first (most recent) one
        const deleteIds = profilesToDelete.map(p => p.id);
        
        const { error: deleteError } = await supabase
          .from('guest_travel_profiles')
          .delete()
          .in('id', deleteIds);

        if (deleteError) {
          console.error('Error deleting duplicate profiles:', deleteError);
        } else {
          console.log(`✅ Cleaned up ${profilesToDelete.length} duplicate profiles`);
        }
      }
    } catch (error) {
      console.error('Error during profile cleanup:', error);
    }
  }

  // ============================================
  // CHECKPOINT MANAGEMENT
  // ============================================

  /**
   * Create default checkpoints for a travel profile
   */
  static async createDefaultCheckpoints(profileId: string): Promise<void> {
    const defaultCheckpoints = [
      {
        travel_profile_id: profileId,
        checkpoint_name: 'Flight Arrival',
        checkpoint_type: 'airport_arrival' as const,
        description: 'Guest has landed at the airport'
      },
      {
        travel_profile_id: profileId,
        checkpoint_name: 'Security Clearance',
        checkpoint_type: 'security' as const,
        description: 'Guest has cleared airport security and customs'
      },
      {
        travel_profile_id: profileId,
        checkpoint_name: 'Baggage Collection',
        checkpoint_type: 'baggage_claim' as const,
        description: 'Guest has collected their baggage'
      },
      {
        travel_profile_id: profileId,
        checkpoint_name: 'Meet Driver',
        checkpoint_type: 'meet_driver' as const,
        description: 'Guest has met their designated driver'
      },
      {
        travel_profile_id: profileId,
        checkpoint_name: 'Journey to Hotel',
        checkpoint_type: 'en_route' as const,
        description: 'Guest is traveling to the hotel'
      },
      {
        travel_profile_id: profileId,
        checkpoint_name: 'Hotel Arrival',
        checkpoint_type: 'hotel_arrival' as const,
        description: 'Guest has arrived at the hotel'
      }
    ];

    const { error } = await supabase
      .from('journey_checkpoints')
      .insert(defaultCheckpoints);

    if (error) {
      console.error('Error creating default checkpoints:', error);
      throw new Error(`Failed to create default checkpoints: ${error.message}`);
    }
  }

  /**
   * Get all checkpoints for a travel profile
   */
  static async getCheckpoints(profileId: string): Promise<JourneyCheckpoint[]> {
    const { data, error } = await supabase
      .from('journey_checkpoints')
      .select('*')
      .eq('travel_profile_id', profileId)
      .order('created_at');

    if (error) {
      console.error('Error fetching checkpoints:', error);
      throw new Error(`Failed to fetch checkpoints: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update checkpoint status
   */
  static async updateCheckpoint(checkpointId: string, updates: Partial<JourneyCheckpoint>): Promise<JourneyCheckpoint> {
    const { data, error } = await supabase
      .from('journey_checkpoints')
      .update(updates)
      .eq('id', checkpointId)
      .select()
      .single();

    if (error) {
      console.error('Error updating checkpoint:', error);
      throw new Error(`Failed to update checkpoint: ${error.message}`);
    }

    return data;
  }

  /**
   * Complete a checkpoint
   */
  static async completeCheckpoint(
    checkpointId: string, 
    completionMethod: 'auto_detected' | 'guest_confirmed' | 'manual_override' = 'guest_confirmed'
  ): Promise<JourneyCheckpoint> {
    const result = await this.updateCheckpoint(checkpointId, {
      status: 'completed',
      actual_time: new Date().toISOString(),
      completion_method: completionMethod
    });

    // Log activity for timeline checkpoint reached
    try {
      // fetch profile/event/company for context
      const { data: checkpoint } = await supabase
        .from('journey_checkpoints')
        .select('id, checkpoint_name, checkpoint_type, travel_profile_id')
        .eq('id', checkpointId)
        .single();

      if (checkpoint) {
        const { data: profile } = await supabase
          .from('guest_travel_profiles')
          .select('id, event_id, company_id, guest_id')
          .eq('id', checkpoint.travel_profile_id)
          .single();

        await insertActivityLog({
          company_id: profile?.company_id || '',
          user_id: (await supabase.auth.getUser()).data.user?.id || 'unknown',
          action_type: 'timeline_checkpoint_reached',
          details: {
            summary: `${checkpoint.checkpoint_name} reached`,
            checkpoint_type: checkpoint.checkpoint_type,
            completion_method: completionMethod,
          },
          event_id: profile?.event_id,
        });
      }
    } catch (e) {
      console.warn('[activity_log] checkpoint activity failed:', e);
    }

    return result;
  }

  // ============================================
  // NOTIFICATION MANAGEMENT
  // ============================================

  /**
   * Send a notification to a guest
   */
  static async sendNotification(notificationData: Omit<GuestNotification, 'id' | 'created_at' | 'updated_at'>): Promise<GuestNotification> {
    const { data, error } = await supabase
      .from('guest_notifications')
      .insert([{
        ...notificationData,
        sent_at: new Date().toISOString(),
        status: 'sent'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error sending notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Send checkpoint prompt notification
   */
  static async sendCheckpointPrompt(
    profileId: string, 
    checkpointId: string, 
    checkpointName: string
  ): Promise<GuestNotification> {
    return this.sendNotification({
      travel_profile_id: profileId,
      checkpoint_id: checkpointId,
      notification_type: 'checkpoint_prompt',
      title: `Checkpoint: ${checkpointName}`,
      message: `Have you reached ${checkpointName}? Please confirm your status.`,
      delivery_method: 'push_notification',
      requires_response: true
    });
  }

  /**
   * Get notifications for a travel profile
   */
  static async getNotifications(profileId: string): Promise<GuestNotification[]> {
    const { data, error } = await supabase
      .from('guest_notifications')
      .select('*')
      .eq('travel_profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('guest_notifications')
      .update({
        read_at: new Date().toISOString(),
        status: 'read'
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Respond to notification
   */
  static async respondToNotification(notificationId: string, responseData: any): Promise<void> {
    const { error } = await supabase
      .from('guest_notifications')
      .update({
        response_received: true,
        response_data: responseData,
        response_time: new Date().toISOString(),
        status: 'responded'
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error updating notification response:', error);
      throw new Error(`Failed to update notification response: ${error.message}`);
    }
  }

  // ============================================
  // GPS TRACKING
  // ============================================

  /**
   * Record GPS location data
   */
  static async recordGPSLocation(locationData: Omit<GPSTrackingData, 'id' | 'created_at'>): Promise<GPSTrackingData> {
    const { data, error } = await supabase
      .from('gps_tracking_data')
      .insert([locationData])
      .select()
      .single();

    if (error) {
      console.error('Error recording GPS location:', error);
      throw new Error(`Failed to record GPS location: ${error.message}`);
    }

    // Update travel profile with current location
    await this.updateTravelProfile(locationData.travel_profile_id, {
      current_location_lat: locationData.latitude,
      current_location_lng: locationData.longitude,
      last_location_update: new Date().toISOString()
    });

    return data;
  }

  /**
   * Get GPS tracking history
   */
  static async getGPSHistory(profileId: string, limit: number = 100): Promise<GPSTrackingData[]> {
    const { data, error } = await supabase
      .from('gps_tracking_data')
      .select('*')
      .eq('travel_profile_id', profileId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching GPS history:', error);
      throw new Error(`Failed to fetch GPS history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get current location
   */
  static async getCurrentLocation(profileId: string): Promise<GPSTrackingData | null> {
    const { data, error } = await supabase
      .from('gps_tracking_data')
      .select('*')
      .eq('travel_profile_id', profileId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No location data found
      }
      console.error('Error fetching current location:', error);
      throw new Error(`Failed to fetch current location: ${error.message}`);
    }

    return data;
  }

  // ============================================
  // DRIVER VERIFICATION
  // ============================================

  /**
   * Verify driver with barcode/QR code
   */
  static async verifyDriver(
    profileId: string,
    verificationMethod: 'barcode_scan' | 'qr_code' | 'manual_code' | 'photo_verification',
    verificationCode: string,
    verificationData?: any,
    location?: { lat: number; lng: number }
  ): Promise<{ success: boolean; log: DriverVerificationLog }> {
    // Get travel profile to check expected driver code
    const profile = await supabase
      .from('guest_travel_profiles')
      .select('driver_verification_code')
      .eq('id', profileId)
      .single();

    const isValid = profile.data?.driver_verification_code === verificationCode;

    // Log the verification attempt
    const logData: Omit<DriverVerificationLog, 'id' | 'created_at'> = {
      travel_profile_id: profileId,
      verification_method: verificationMethod,
      verification_code: verificationCode,
      verification_data: verificationData,
      verification_successful: isValid,
      failure_reason: isValid ? undefined : 'Invalid verification code',
      verification_lat: location?.lat,
      verification_lng: location?.lng,
      verified_at: new Date().toISOString()
    };

    const { data: logResult, error: logError } = await supabase
      .from('driver_verification_logs')
      .insert([logData])
      .select()
      .single();

    if (logError) {
      console.error('Error logging driver verification:', logError);
      throw new Error(`Failed to log driver verification: ${logError.message}`);
    }

    // Update travel profile if verification successful
    if (isValid) {
      await this.updateTravelProfile(profileId, {
        driver_verified: true,
        driver_verification_time: new Date().toISOString()
      });
    }

    return {
      success: isValid,
      log: logResult
    };
  }

  /**
   * Get driver verification logs
   */
  static async getVerificationLogs(profileId: string): Promise<DriverVerificationLog[]> {
    const { data, error } = await supabase
      .from('driver_verification_logs')
      .select('*')
      .eq('travel_profile_id', profileId)
      .order('verified_at', { ascending: false });

    if (error) {
      console.error('Error fetching verification logs:', error);
      throw new Error(`Failed to fetch verification logs: ${error.message}`);
    }

    return data || [];
  }

  // ============================================
  // JOURNEY ANALYTICS
  // ============================================

  /**
   * Calculate and update journey analytics
   */
  static async updateJourneyAnalytics(profileId: string): Promise<JourneyAnalytics> {
    // This would typically call the database function
    const { data, error } = await supabase
      .rpc('calculate_journey_quality_score', { profile_id: profileId });

    if (error) {
      console.error('Error calculating journey analytics:', error);
      throw new Error(`Failed to calculate journey analytics: ${error.message}`);
    }

    // Get or create analytics record
    let { data: analytics, error: analyticsError } = await supabase
      .from('journey_analytics')
      .select('*')
      .eq('travel_profile_id', profileId)
      .single();

    if (analyticsError && analyticsError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch analytics: ${analyticsError.message}`);
    }

    if (!analytics) {
      // Create new analytics record
      const { data: newAnalytics, error: createError } = await supabase
        .from('journey_analytics')
        .insert([{
          travel_profile_id: profileId,
          journey_quality_score: data
        }])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create analytics: ${createError.message}`);
      }

      analytics = newAnalytics;
    } else {
      // Update existing analytics
      const { data: updatedAnalytics, error: updateError } = await supabase
        .from('journey_analytics')
        .update({ journey_quality_score: data })
        .eq('id', analytics.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update analytics: ${updateError.message}`);
      }

      analytics = updatedAnalytics;
    }

    return analytics;
  }

  /**
   * Get journey analytics
   */
  static async getJourneyAnalytics(profileId: string): Promise<JourneyAnalytics | null> {
    const { data, error } = await supabase
      .from('journey_analytics')
      .select('*')
      .eq('travel_profile_id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No analytics found
      }
      console.error('Error fetching journey analytics:', error);
      throw new Error(`Failed to fetch journey analytics: ${error.message}`);
    }

    return data;
  }

  // ============================================
  // FLIGHT API INTEGRATION
  // ============================================

  /**
   * Fetch flight data from multiple APIs with fallback
   */
    static async fetchFlightData(flightNumber: string, flightDate: string): Promise<any> {
    if (!flightNumber || !flightDate) {
      throw new Error('Missing required flight data parameters');
    }

    const upperCaseFlightNumber = flightNumber.toUpperCase();
    
    // Use FlightAware AeroAPI directly (no fallback needed)
    try {
      console.log(`🔄 Using FlightAware AeroAPI for flight:`, flightNumber, flightDate);
      const result = await this.tryFlightAwareAPI(upperCaseFlightNumber, flightDate);
      console.log(`✅ FlightAware AeroAPI succeeded!`);
      return result;
    } catch (error) {
      console.error('❌ FlightAware AeroAPI failed:', error);
      throw new Error(`FlightAware API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Try FlightAware AeroAPI (real flight data)
   */
  private static async tryFlightAwareAPI(flightNumber: string, flightDate: string): Promise<any> {
    console.log('   🚀 Trying FlightAware (Cloud → Local proxy → Direct)...');

    // Resolve bases from env (build-time). Cloud is optional.
    const cloudBase = (import.meta as any)?.env?.VITE_CLOUD_API_BASE_URL as string | undefined; // e.g. https://timely.yourdomain.com
    const localBase = ((import.meta as any)?.env?.VITE_LOCAL_API_BASE_URL as string | undefined) || 'http://localhost:3001';

    // 1) Cloud (if configured): `${cloudBase}/api/flightaware-proxy`
    if (cloudBase) {
      try {
        const cloudUrl = `${cloudBase.replace(/\/$/, '')}/api/flightaware-proxy?flightNumber=${encodeURIComponent(flightNumber)}&flightDate=${encodeURIComponent(flightDate)}`;
        console.log('   🔍 Cloud API URL:', cloudUrl);
        const cloudResp = await fetch(cloudUrl, { mode: 'cors' });
        console.log('   📡 Cloud API status:', cloudResp.status);
        if (cloudResp.ok) {
          const cloudData = await cloudResp.json();
          if (cloudData?.success && cloudData?.flight) {
            console.log('   ✅ Cloud API succeeded!');
            return cloudData.flight;
          }
          console.warn('   ⚠️ Cloud API unexpected payload:', cloudData);
        } else {
          const txt = await cloudResp.text();
          console.warn('   ⚠️ Cloud API error:', txt);
        }
      } catch (e) {
        console.warn('   ⚠️ Cloud API fetch failed:', e);
      }
    }

    // 2) Local proxy on http://localhost:3001 (bundled with the app)
    try {
      const localUrl = `${localBase.replace(/\/$/, '')}/api/flightaware?flightNumber=${encodeURIComponent(flightNumber)}&flightDate=${encodeURIComponent(flightDate)}`;
      console.log('   🔍 Local proxy URL:', localUrl);
      
      const localResp = await fetch(localUrl);
      console.log('   📡 Local proxy status:', localResp.status);
      
      if (localResp.ok) {
        const localData = await localResp.json();
        if (localData?.success && localData?.flight) {
          console.log('   ✅ Local proxy succeeded!');
          return localData.flight;
        }
        console.warn('   ⚠️ Local proxy returned unexpected payload:', localData);
      } else {
        const txt = await localResp.text();
        console.warn('   ⚠️ Local proxy error:', txt);
      }
    } catch (e) {
      console.warn('   ⚠️ Local proxy fetch failed:', e);
    }

    // 3) Last resort: direct FlightAware API (likely blocked by CORS in browser)
    try {
      console.log('   🔁 Falling back to direct FlightAware (may be blocked by CORS)');
      const FLIGHTAWARE_API_KEY = 'tc87hHhGcuEA3fitkPGgvO0eGqaltNJ4';
      const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
      const searchUrl = `${baseUrl}/flights/${encodeURIComponent(flightNumber)}`;
      console.log('   🔍 Direct API URL:', searchUrl);

      const response = await fetch(searchUrl, {
        headers: {
          'x-apikey': FLIGHTAWARE_API_KEY,
          'Accept': 'application/json'
        }
      });

      console.log('   📡 Direct API status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FlightAware API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
      if (!data?.flights?.length) throw new Error('No flights found in FlightAware response');

      let targetFlight = data.flights[0];
      if (flightDate) {
        const match = data.flights.find((flight: any) => {
          const depCandidate = flight?.scheduled_out || flight?.estimated_out || flight?.scheduled_off || flight?.estimated_off || flight?.filed_departure_time;
          if (!depCandidate) return false;
          const flightDateStr = new Date(depCandidate).toISOString().split('T')[0];
          return flightDateStr === flightDate;
        });
        if (match) targetFlight = match;
      }

      return {
        flight_number: flightNumber,
        flight_date: flightDate || 'Current',
        flight_status: targetFlight.status || targetFlight.flight_status || 'scheduled',
        departure_airport: targetFlight.origin?.name || targetFlight.origin?.city || targetFlight.origin?.code_iata || targetFlight.origin?.code,
        arrival_airport: targetFlight.destination?.name || targetFlight.destination?.city || targetFlight.destination?.code_iata || targetFlight.destination?.code,
        departure_time: targetFlight.scheduled_out || targetFlight.estimated_out || targetFlight.scheduled_off || targetFlight.estimated_off || targetFlight.filed_departure_time,
        arrival_time: targetFlight.scheduled_in || targetFlight.estimated_in || targetFlight.scheduled_on || targetFlight.estimated_on || targetFlight.filed_arrival_time,
        departure_iata: targetFlight.origin?.code_iata || targetFlight.origin?.code,
        arrival_iata: targetFlight.destination?.code_iata || targetFlight.destination?.code,
        departure_terminal: targetFlight.terminal_origin || targetFlight.origin?.terminal,
        arrival_terminal: targetFlight.terminal_destination || targetFlight.destination?.terminal,
        departure_gate: targetFlight.gate_origin || targetFlight.origin?.gate,
        arrival_gate: targetFlight.gate_destination || targetFlight.destination?.gate,
        api_source: 'FlightAware AeroAPI',
        raw_data: targetFlight
      };
    } catch (error) {
      throw new Error(`FlightAware API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }





  




  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Calculate distance between two GPS coordinates
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if guest is near a checkpoint
   */
  static async checkNearbyCheckpoints(profileId: string, currentLat: number, currentLng: number, radiusKm: number = 0.5): Promise<JourneyCheckpoint[]> {
    const checkpoints = await this.getCheckpoints(profileId);
    
    return checkpoints.filter(checkpoint => {
      if (!checkpoint.location_lat || !checkpoint.location_lng) return false;
      
      const distance = this.calculateDistance(
        currentLat, currentLng,
        checkpoint.location_lat, checkpoint.location_lng
      );
      
      return distance <= radiusKm;
    });
  }
} 