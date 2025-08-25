import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ThemeContext } from '../ThemeContext';
import { Stage1TravelService } from '../services/stage1TravelService';
import Icon from '../Icon';

interface Stage1ModuleProps {
  guestId: string;
  eventId: string;
  initialData?: {
    flightNumber?: string;
    hotelName?: string;
    hotelAddress?: string;
    flightDate?: string;
  };
  onModuleDataChange: (moduleKey: string, data: any) => void;
}

export default function Stage1Module({ 
  guestId, 
  eventId, 
  initialData = {}, 
  onModuleDataChange 
}: Stage1ModuleProps) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [flightNumber, setFlightNumber] = useState(initialData.flightNumber || '');
  const [hotelName, setHotelName] = useState(initialData.hotelName || '');
  const [hotelAddress, setHotelAddress] = useState(initialData.hotelAddress || '');
  const [hotelReservationNumber, setHotelReservationNumber] = useState('');
  const [hotelCheckInTime, setHotelCheckInTime] = useState('');
  const [hotelCheckOutTime, setHotelCheckOutTime] = useState('');
  const [hotelCheckInDate, setHotelCheckInDate] = useState('');
  const [hotelCheckOutDate, setHotelCheckOutDate] = useState('');
  // Combined hotel search (name + address) with suggestions
  const [hotelQuery, setHotelQuery] = useState<string>((initialData.hotelName || initialData.hotelAddress) || '');
  const [hotelSuggestions, setHotelSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState<boolean>(false);
  const [flightDate, setFlightDate] = useState(initialData.flightDate || '');

  const [isLoading, setIsLoading] = useState(false);
  const [flightData, setFlightData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [savingHotel, setSavingHotel] = useState<boolean>(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const colors = {
    background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    cardBg: isDark ? 'rgba(40, 40, 40, 0.8)' : 'rgba(250, 250, 250, 0.8)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    primary: '#10b981',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  // Use ref to track previous values and prevent unnecessary updates
  const prevDataRef = useRef({
    flightNumber: '',
    hotelName: '',
    hotelAddress: '',
    flightDate: '',
    isActive: false,
    flightData: null,
    hotelCheckInTime: '',
    hotelCheckOutTime: '',
    hotelCheckInDate: '',
    hotelCheckOutDate: '',
    hotelReservationNumber: ''
  });

  // Update parent component when data changes - with additional safety checks
  useEffect(() => {
    // Skip if onModuleDataChange is not a function
    if (typeof onModuleDataChange !== 'function') {
      return;
    }

    const currentData = {
      flightNumber,
      hotelName,
      hotelAddress,
      flightDate,
      isActive,
      flightData,
      hotelCheckInTime,
      hotelCheckOutTime,
      hotelCheckInDate,
      hotelCheckOutDate,
      hotelReservationNumber
    };

    // Only call onModuleDataChange if data has actually changed
    const hasChanged = JSON.stringify(currentData) !== JSON.stringify(prevDataRef.current);
    
    if (hasChanged) {
      try {
        onModuleDataChange('stage1TravelCompanion', currentData);
        prevDataRef.current = currentData;
      } catch (error) {
        console.error('Error in onModuleDataChange:', error);
      }
    }
  }, [flightNumber, hotelName, hotelAddress, flightDate, isActive, flightData, hotelCheckInTime, hotelCheckOutTime, hotelCheckInDate, hotelCheckOutDate, hotelReservationNumber, onModuleDataChange]);

  // Debounced hotel location search using OpenStreetMap Nominatim (no API key, CORS-enabled)
  useEffect(() => {
    const controller = new AbortController();
    const q = hotelQuery?.trim();
    if (!q || q.length < 3) {
      setHotelSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setIsSearchingLocations(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
        const resp = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Timely Desktop App (Stage1Module)'
          },
          signal: controller.signal
        });
        if (!resp.ok) throw new Error(`Location search failed: ${resp.status}`);
        const data = await resp.json();
        setHotelSuggestions(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.warn('Hotel location search error:', e);
          setHotelSuggestions([]);
        }
      } finally {
        setIsSearchingLocations(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [hotelQuery]);

  // Search flight data ONLY - don't save to database
  const searchFlight = async () => {
    if (!flightNumber || !flightDate) {
      setError('Please enter flight number and date');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await Stage1TravelService.fetchFlightData(flightNumber, flightDate);
              console.log('Flight search result:', data);
      setFlightData(data);
      setError(null);
    } catch (err) {
      console.error('Flight search error:', err);
      
      // Handle specific API errors gracefully
      if (err instanceof Error) {
        if (err.message.includes('All flight tracking APIs failed')) {
          setError('All flight APIs failed. You can still continue with manual data.');
        } else if (err.message.includes('403') || err.message.includes('API request failed')) {
          setError('Flight API temporarily unavailable. You can still continue with manual data.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to fetch flight data. You can still continue with manual data.');
      }
      setFlightData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Activate Stage 1 module for this guest
  const activateStage1Module = async (flightInfo: any) => {
    try {
      console.log('🚀 Activating Stage 1 with flight info:', flightInfo);
      // Normalize times using FlightAware fields
      const normalizedDepTime = flightInfo.departure_time
        || flightInfo.filed_departure_time
        || flightInfo.scheduled_out
        || flightInfo.estimated_out
        || flightInfo.scheduled_off
        || flightInfo.estimated_off
        || flightInfo.raw_data?.scheduled_out
        || flightInfo.raw_data?.estimated_out
        || flightInfo.raw_data?.scheduled_off
        || flightInfo.raw_data?.estimated_off;

      const normalizedArrTime = flightInfo.arrival_time
        || flightInfo.filed_arrival_time
        || flightInfo.scheduled_in
        || flightInfo.estimated_in
        || flightInfo.scheduled_on
        || flightInfo.estimated_on
        || flightInfo.raw_data?.scheduled_in
        || flightInfo.raw_data?.estimated_in
        || flightInfo.raw_data?.scheduled_on
        || flightInfo.raw_data?.estimated_on;
      
      // If we already have a profile, update it instead of creating a new one
      if (profileId) {
        console.log('🔄 Updating existing profile:', profileId);
        const updated = await Stage1TravelService.updateTravelProfile(profileId, {
          flight_number: flightNumber,
          flight_date: flightDate,
          flight_departure_time: normalizedDepTime || null,
          flight_arrival_time: normalizedArrTime || null,
          flight_status: flightInfo.flight_status || flightInfo.status || 'scheduled',
          departure_airport: flightInfo.departure_airport || flightInfo.raw_data?.origin?.city || flightInfo.raw_data?.origin?.name || flightInfo.origin?.city || flightInfo.origin?.code || '',
          arrival_airport: flightInfo.arrival_airport || flightInfo.raw_data?.destination?.city || flightInfo.raw_data?.destination?.name || flightInfo.destination?.city || flightInfo.destination?.code || '',
        });
        
        if (updated) {
          setExistingProfile(updated);
          setError(null);
        }
        console.log('✅ Stage 1 module updated for guest:', guestId);
        return;
      }
      
      // Create new travel profile only if one doesn't exist
      const profileData = {
        guest_id: guestId,
        event_id: eventId,
        flight_number: flightNumber,
        flight_date: flightDate,
        flight_departure_time: normalizedDepTime || null,
        flight_arrival_time: normalizedArrTime || null,
        flight_status: flightInfo.flight_status || flightInfo.status || 'scheduled',
        departure_airport: flightInfo.departure_airport || flightInfo.raw_data?.origin?.city || flightInfo.raw_data?.origin?.name || flightInfo.origin?.city || flightInfo.origin?.code || '',
        arrival_airport: flightInfo.arrival_airport || flightInfo.raw_data?.destination?.city || flightInfo.raw_data?.destination?.name || flightInfo.destination?.city || flightInfo.destination?.code || '',
        hotel_name: hotelName,
        hotel_address: hotelAddress,
        hotel_reservation_number: hotelReservationNumber,
        hotel_check_in_time: hotelCheckInTime,
        journey_status: 'not_started' as const,
        gps_tracking_enabled: true,
        checkpoint_notifications_enabled: true
      };
      
      console.log('📝 Creating new profile with data:', profileData);

      const created = await Stage1TravelService.createTravelProfile(profileData);
      if (created?.id) {
        setProfileId(created.id);
        setExistingProfile(created);
        setIsActive(true);
        setError(null); // Clear any previous errors
      }
      console.log('✅ Stage 1 module activated for guest:', guestId);
    } catch (err) {
      console.error('❌ Failed to activate Stage 1 module:', err);
      setError('Failed to activate Stage 1 module');
    }
  };

  // Load existing travel profile on component mount
  useEffect(() => {
    const loadExistingProfile = async () => {
      if (!guestId || !eventId) return;
      
              console.log('Loading existing travel profile for guest:', guestId, 'event:', eventId);
      
      try {
        // First, clean up any duplicate entries
        await Stage1TravelService.cleanupDuplicateProfiles(guestId, eventId);
        
        const profile = await Stage1TravelService.getTravelProfile(guestId, eventId);
        console.log('📋 Found existing profile:', profile);
        
        if (profile) {
          setExistingProfile(profile);
          setProfileId(profile.id);
          setIsActive(true);
          
          // Populate form fields with existing data
          if (profile.flight_number) setFlightNumber(profile.flight_number);
          if (profile.flight_date) setFlightDate(profile.flight_date);
          if (profile.hotel_name) setHotelName(profile.hotel_name);
          if (profile.hotel_address) setHotelAddress(profile.hotel_address);
          if (profile.hotel_reservation_number) setHotelReservationNumber(profile.hotel_reservation_number);
          if (profile.hotel_check_in_time) setHotelCheckInTime(profile.hotel_check_in_time);
          
          // Set hotel query for the search field
          if (profile.hotel_name || profile.hotel_address) {
            setHotelQuery(profile.hotel_name || profile.hotel_address);
          }
          
          // Set flight data if available
          if (profile.flight_number && profile.flight_date) {
            setFlightData({
              flight_number: profile.flight_number,
              departure_airport: profile.departure_airport || '',
              arrival_airport: profile.arrival_airport || '',
              flight_status: profile.flight_status || 'scheduled',
              departure_time: profile.flight_departure_time || '',
              arrival_time: profile.flight_arrival_time || ''
            });
          }
          
          console.log('✅ Profile loaded and UI updated');
        } else {
          console.log('ℹ️ No existing profile found');
        }
      } catch (error) {
        console.error('❌ Error loading existing profile:', error);
      }
    };

    loadExistingProfile();
  }, [guestId, eventId]);

  // Delete travel profile
  const deleteTravelProfile = async () => {
    try {
      setDeleting(true);
      // Always hard-delete by guest+event to ensure no stale entries remain
      await Stage1TravelService.deleteProfilesByGuestEvent(guestId, eventId);
      
      // Reset all state
      setProfileId(null);
      setExistingProfile(null);
      setIsActive(false);
      setFlightData(null);
      setFlightNumber('');
      setFlightDate('');
      setHotelName('');
      setHotelAddress('');
      setHotelQuery('');
      setHotelReservationNumber('');
      setHotelCheckInTime('');
      setError(null);
      
      console.log('🗑️ Travel profile deleted');
    } catch (error) {
      console.error('Failed to delete travel profile:', error);
      setError('Failed to delete travel profile');
    } finally {
      setDeleting(false);
    }
  };

  // Handle hotel information update
  const updateHotelInfo = async () => {
    if (!hotelName || !hotelAddress) return;
    if (!isActive) {
      setError('Activate Stage 1 before saving hotel');
      return;
    }
    if (!profileId) {
      setError('Travel profile not found yet. Please search flight to create it first.');
      return;
    }
    try {
      setSavingHotel(true);
      const updated = await Stage1TravelService.updateTravelProfile(profileId, {
        hotel_name: hotelName,
        hotel_address: hotelAddress,
        hotel_reservation_number: hotelReservationNumber,
        hotel_check_in_time: hotelCheckInTime
      });
      if (updated) {
        setExistingProfile(updated);
        setError(null); // Clear any previous errors
      }
              console.log('Hotel information updated');
    } catch (e) {
      console.error('Failed to save hotel info', e);
      setError('Failed to save hotel info. Try again.');
    } finally {
      setSavingHotel(false);
    }
  };

  return (
    <div style={{
      background: colors.cardBg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16
    }}>
      {/* Module Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12
      }}>
        <div style={{
          background: colors.primary,
          borderRadius: 8,
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon name="airplane" style={{ fontSize: 20, color: '#fff' }} />
        </div>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: colors.text
          }}>
            Stage 1: Travel Companion
          </h3>
          <p style={{
            margin: 0,
            fontSize: 14,
            color: colors.textSecondary
          }}>
            Complete travel tracking from airport to hotel
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{
            background: isActive ? colors.success : colors.warning,
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500
          }}>
            {isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Flight Information */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: 16,
          fontWeight: 600,
          color: colors.text
        }}>
          Flight Information
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              color: colors.textSecondary
            }}>
              Flight Number
            </label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="e.g. BA2490"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: 14
              }}
            />
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              color: colors.textSecondary
            }}>
              Flight Date
            </label>
            <input
              type="date"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: 14
              }}
            />
          </div>


        </div>

        <button
          onClick={searchFlight}
          disabled={isLoading || !flightNumber || !flightDate}
          style={{
            background: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            display: 'block',
            width: 140,
            maxWidth: 140,
            margin: '8px auto 0'
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid transparent',
                borderTop: '2px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Searching...
            </>
          ) : (
            <>
              <Icon name="search" style={{ fontSize: 16, color: '#fff', marginRight: 6 }} />
              Search Flight
            </>
          )}
        </button>

        {error && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: colors.error,
            fontSize: 14
          }}>
            {error}
            {error.includes('Flight API temporarily unavailable') && (
              <button
                onClick={() => setIsActive(true)}
                style={{
                  marginTop: 8,
                  background: colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Activate Stage 1 Manually
              </button>
            )}
          </div>
        )}

        {flightData && (
          <div style={{
            marginTop: 16,
            padding: 16,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8
          }}>
            {/* DEBUG: Show raw flight data */}
            <details style={{ marginBottom: 16, fontSize: 11, color: '#666' }}>
              <summary>Debug: Raw Flight Data</summary>
              <pre style={{ fontSize: 10, overflow: 'auto', maxHeight: 200 }}>
                {JSON.stringify(flightData, null, 2)}
              </pre>
            </details>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: `1px solid rgba(16, 185, 129, 0.3)`
            }}>
              <h5 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: colors.primary
              }}>
                Flight {flightData.flight_number || flightData.ident || 'Unknown'}
              </h5>
              <span style={{ 
                fontSize: 12, 
                fontWeight: 500,
                color: flightData.flight_status === 'scheduled' ? colors.success : 
                       flightData.flight_status === 'delayed' ? colors.warning : 
                       flightData.flight_status === 'cancelled' ? '#ef4444' : colors.text,
                textTransform: 'uppercase'
              }}>
                {flightData.flight_status || 'Unknown'}
              </span>
            </div>

            {/* Google Flights Style Layout */}
            
            {/* Top Row: Large Airport Codes with Duration */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <div style={{ 
                fontSize: 48, 
                fontWeight: 'bold', 
                color: colors.text,
                letterSpacing: '2px'
              }}>
                {flightData.departure_iata || flightData.origin || '--'}
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                flex: 1,
                justifyContent: 'center'
              }}>
                <div style={{ 
                  width: 60, 
                  height: 2, 
                  backgroundColor: colors.primary,
                  borderRadius: 1
                }} />
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <div style={{ 
                    fontSize: 14, 
                    color: colors.textSecondary,
                    fontWeight: 500
                  }}>
                    {(() => {
                      const depTime = flightData.departure_time || flightData.scheduled_out || flightData.estimated_out || flightData.scheduled_off || flightData.estimated_off || flightData.filed_departure_time;
                      const arrTime = flightData.arrival_time || flightData.scheduled_in || flightData.estimated_in || flightData.scheduled_on || flightData.estimated_on || flightData.filed_arrival_time;
                      if (!depTime || !arrTime) return '--:--';
                      const dep = new Date(depTime);
                      const arr = new Date(arrTime);
                      const diffMs = arr.getTime() - dep.getTime();
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      return `${diffHours}h ${diffMinutes}m`;
                    })()}
                  </div>
                  <div style={{
                    fontSize: 20,
                    color: colors.primary
                  }}>
                    ✈
                  </div>
                </div>
                <div style={{ 
                  width: 60, 
                  height: 2, 
                  backgroundColor: colors.primary,
                  borderRadius: 1
                }} />
              </div>
              
              <div style={{ 
                fontSize: 48, 
                fontWeight: 'bold', 
                color: colors.text,
                letterSpacing: '2px'
              }}>
                {flightData.arrival_iata || flightData.destination || '--'}
              </div>
            </div>

            {/* Bottom Row: Detailed Flight Info */}
            <div style={{ display: 'flex', gap: 20 }}>
              {/* Left: Departure Info */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: 13, 
                  color: colors.textSecondary, 
                  marginBottom: 4,
                  textDecoration: 'underline'
                }}>
                  Airport info
                </div>
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: colors.text,
                  marginBottom: 8
                }}>
                  {flightData.departure_city || flightData.origin_city || 'Unknown City'} · {(() => {
                    const depTime = flightData.departure_time || flightData.scheduled_out || flightData.estimated_out || flightData.scheduled_off || flightData.estimated_off || flightData.filed_departure_time;
                    if (!depTime) return '--';
                    const date = new Date(depTime);
                    return date.toLocaleDateString('en-GB', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    });
                  })()}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: colors.textSecondary, 
                  marginBottom: 4
                }}>
                  Scheduled departure
                </div>
                <div style={{ 
                  fontSize: 28, 
                  fontWeight: 'bold', 
                  color: colors.primary,
                  marginBottom: 8
                }}>
                  {(() => {
                    const depTime = flightData.departure_time || flightData.filed_departure_time || flightData.scheduled_departure;
                    if (!depTime) return '--:--';
                    const date = new Date(depTime);
                    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: colors.textSecondary }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>Terminal</span><br />
                    {flightData.departure_terminal || '--'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 500 }}>Gate</span><br />
                    {flightData.departure_gate || '-'}
                  </div>
                </div>
              </div>

              {/* Right: Arrival Info */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: 13, 
                  color: colors.textSecondary, 
                  marginBottom: 4,
                  textDecoration: 'underline'
                }}>
                  Airport info
                </div>
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: colors.text,
                  marginBottom: 8
                }}>
                  {flightData.arrival_city || flightData.destination_city || 'Unknown City'} · {(() => {
                    const arrTime = flightData.arrival_time || flightData.scheduled_in || flightData.estimated_in || flightData.scheduled_on || flightData.estimated_on || flightData.filed_arrival_time;
                    if (!arrTime) return '--';
                    const date = new Date(arrTime);
                    return date.toLocaleDateString('en-GB', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    });
                  })()}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: colors.textSecondary, 
                  marginBottom: 4
                }}>
                  Scheduled arrival
                </div>
                <div style={{ 
                  fontSize: 28, 
                  fontWeight: 'bold', 
                  color: colors.primary,
                  marginBottom: 8
                }}>
                  {(() => {
                    const arrTime = flightData.arrival_time || flightData.filed_arrival_time || flightData.scheduled_arrival;
                    if (!arrTime) return '--:--';
                    const date = new Date(arrTime);
                    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: colors.textSecondary }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>Terminal</span><br />
                    {flightData.arrival_terminal || '--'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 500 }}>Gate</span><br />
                    {flightData.arrival_gate || '-'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Activate Stage 1 Button - only show when flight data found but not active */}
            {!isActive && (
              <button
                onClick={() => activateStage1Module(flightData)}
                style={{
                  background: colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 16,
                  width: '100%'
                }}
              >
                Activate Stage 1 with this Flight
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hotel Information */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: 16,
          fontWeight: 600,
          color: colors.text
        }}>
          Hotel Information
        </h4>
        
        {/* Combined hotel finder (name + address) */}
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 14,
            color: colors.textSecondary
          }}>
            Hotel (search name or address)
          </label>
          <input
            type="text"
            value={hotelQuery}
            onChange={(e) => setHotelQuery(e.target.value)}
            placeholder="Start typing a hotel name or address..."
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.text,
              fontSize: 14
            }}
          />
          {/* Suggestions dropdown */}
          {(hotelSuggestions.length > 0 || isSearchingLocations) && (
            <div style={{
              position: 'absolute',
              top: 64,
              left: 0,
              right: 0,
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 20,
              maxHeight: 240,
              overflowY: 'auto'
            }}>
              {isSearchingLocations && (
                <div style={{ padding: 12, color: colors.textSecondary, fontSize: 13 }}>Searching…</div>
              )}
              {hotelSuggestions.map((sug, idx) => (
                <button
                  key={sug.display_name + idx}
                  type="button"
                  onClick={() => {
                    setHotelName(sug.display_name.split(',')[0] || sug.display_name);
                    setHotelAddress(sug.display_name);
                    setHotelQuery(sug.display_name);
                    setHotelSuggestions([]);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: colors.text,
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  {sug.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hotel Reservation Number */}
        <div style={{ marginBottom: 12 }}>
          <label style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 14,
            color: colors.textSecondary
          }}>
            Reservation Number (optional)
          </label>
          <input
            type="text"
            value={hotelReservationNumber}
            onChange={(e) => setHotelReservationNumber(e.target.value)}
            placeholder="Enter reservation number..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.text,
              fontSize: 14
            }}
          />
        </div>

        {/* Hotel Check-in and Check-out Times */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              color: colors.textSecondary
            }}>
              Check-in Time
            </label>
            <input
              type="text"
              value={hotelCheckInTime}
              onChange={(e) => {
                const val = e.target.value;
                // Auto-format with : separator
                const formatted = val.replace(/[^0-9]/g, '').replace(/(\d{2})(\d{2})/, '$1:$2');
                setHotelCheckInTime(formatted);
              }}
              placeholder="HH:MM"
              maxLength={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: 14,
                height: 48,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              color: colors.textSecondary
            }}>
              Check-out Time
            </label>
            <input
              type="text"
              value={hotelCheckOutTime || ''}
              onChange={(e) => {
                const val = e.target.value;
                // Auto-format with : separator
                const formatted = val.replace(/[^0-9]/g, '').replace(/(\d{2})(\d{2})/, '$1:$2');
                setHotelCheckOutTime(formatted);
              }}
              placeholder="HH:MM"
              maxLength={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: 14,
                height: 48,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Hotel Check-in and Check-out Dates */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              color: colors.textSecondary
            }}>
              Check-in Date
            </label>
            <input
              type="text"
              value={hotelCheckInDate || ''}
              onChange={(e) => {
                const val = e.target.value;
                // Auto-format with / separators
                const formatted = val.replace(/[^0-9]/g, '').replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
                setHotelCheckInDate(formatted);
              }}
              placeholder="DD/MM/YYYY"
              maxLength={10}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: 14,
                height: 48,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              color: colors.textSecondary
            }}>
              Check-out Date
            </label>
            <input
              type="text"
              value={hotelCheckOutDate || ''}
              onChange={(e) => {
                const val = e.target.value;
                // Auto-format with / separators
                const formatted = val.replace(/[^0-9]/g, '').replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
                setHotelCheckOutDate(formatted);
              }}
              placeholder="DD/MM/YYYY"
              maxLength={10}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                color: colors.text,
                fontSize: 14,
                height: 48,
                                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <button
          onClick={updateHotelInfo}
          disabled={!hotelName || !hotelAddress || savingHotel}
          style={{
            background: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
            cursor: (!hotelName || !hotelAddress || savingHotel) ? 'not-allowed' : 'pointer',
            opacity: (!hotelName || !hotelAddress || savingHotel) ? 0.6 : 1,
            display: 'block',
            width: 140,
            maxWidth: 140,
            margin: '8px auto 0'
          }}
        >
          {savingHotel ? 'Saving…' : 'Save Hotel'}
        </button>
      </div>
    </div>
  );
} 