import { CalendarEvent, CalendarEventAttendee } from '../types/calendar';

// Global declaration for Google APIs
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

class GoogleCalendarService {
  private isInitialized = false;
  private isSignedIn = false;
  private currentUser: any = null;
  private clientId: string = '';
  private apiKey: string = '';
  private tokenClient: any = null;
  private accessToken: string = '';

  constructor() {
    // Get credentials from environment variables (browser environment with Vite polyfill)
    this.clientId = process.env.VITE_GOOGLE_CLIENT_ID || '';
    this.apiKey = process.env.VITE_GOOGLE_API_KEY || '';
    
    // Development fallback (REMOVE IN PRODUCTION)
    if (!this.clientId || !this.apiKey) {
      console.warn('Google Calendar - Using development fallback credentials');
      console.warn('Please set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in .env file');
      // Remove these fallback values in production:
      this.clientId = '1010078884491-spte5g22lnht5cj0lf5a3tgdcgiu3jm1.apps.googleusercontent.com';
      this.apiKey = 'AIzaSyDBSx82-FBxJ3ElidsAU4XDLK5mNnlPNwI';
    }
    
    // Only initialize if we have credentials
    if (this.clientId && this.apiKey) {
      console.log('Google Calendar - Modern GIS OAuth credentials configured');
      console.log('Google Calendar - Client ID configured:', this.clientId ? 'Yes' : 'No');
      console.log('Google Calendar - API Key configured:', this.apiKey ? 'Yes' : 'No');
      this.loadGoogleAPI();
    } else {
      console.error('Google Calendar - Missing OAuth credentials!');
      console.error('Please set the following environment variables in .env file:');
      console.error('- VITE_GOOGLE_CLIENT_ID: Your OAuth 2.0 Client ID');
      console.error('- VITE_GOOGLE_API_KEY: Your Google API Key');
      console.error('These should be configured in your SaaS deployment environment');
    }
  }

  private loadGoogleAPI(): void {
    // Load both Google API and Google Identity Services
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      console.log('Google Calendar - GAPI loaded');
      this.loadGoogleIdentityServices();
    };
    gapiScript.onerror = (error) => {
      console.error('Google Calendar - Failed to load GAPI script:', error);
    };
    document.head.appendChild(gapiScript);
  }

  private loadGoogleIdentityServices(): void {
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      console.log('Google Calendar - Google Identity Services loaded');
      this.initializeGAPI();
    };
    gisScript.onerror = (error) => {
      console.error('Google Calendar - Failed to load GIS script:', error);
    };
    document.head.appendChild(gisScript);
  }

  private async initializeGAPI(): Promise<void> {
    try {
      console.log('Google Calendar - Initializing modern Google Identity Services...');
      
      if (!window.gapi) {
        console.error('Google API not available');
        return;
      }

      // Initialize GAPI client
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: reject
        });
      });

      await window.gapi.client.init({
        apiKey: this.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });

      // Initialize Google Identity Services token client
      if (window.google?.accounts?.oauth2) {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: (response: any) => {
            if (response.access_token) {
              this.accessToken = response.access_token;
              this.isSignedIn = true;
              this.currentUser = { accessToken: response.access_token };
              console.log('Google Calendar - Modern GIS sign-in successful');
            } else {
              console.error('Google Calendar - No access token received');
            }
          },
        });

        this.isInitialized = true;
        console.log('Google Calendar - Modern GIS initialization complete');
      } else {
        throw new Error('Google Identity Services not available');
      }
    } catch (error) {
      console.error('Error initializing Google Calendar API:', error);
      this.isInitialized = false;
    }
  }

  async signIn(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.error('Google Calendar service not initialized');
        return false;
      }

      if (!this.tokenClient) {
        console.error('Google Identity Services token client not available');
        return false;
      }

      console.log('Google Calendar - Starting modern GIS sign-in...');
      
      return new Promise((resolve) => {
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.error('Google Calendar - Sign-in timeout after 30 seconds');
          resolve(false);
        }, 30000);

        // Update callback to resolve promise
        this.tokenClient.callback = (response: any) => {
          clearTimeout(timeout);
          
          if (response.error) {
            console.error('Google Calendar - OAuth error:', response.error);
            console.error('Error details:', response.error_description);
            
            // Handle specific errors
            if (response.error === 'access_denied') {
              console.error('Access denied - User may not be in test users list or consent screen not configured');
            } else if (response.error === 'popup_closed_by_user') {
              console.error('User closed the popup');
            } else if (response.error === 'popup_blocked_by_browser') {
              console.error('Popup blocked by browser');
            }
            
            resolve(false);
            return;
          }
          
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.isSignedIn = true;
            this.currentUser = { accessToken: response.access_token };
            // Set the access token for gapi client
            window.gapi.client.setToken({ access_token: response.access_token });
            console.log('Google Calendar - Modern GIS sign-in successful');
            resolve(true);
          } else {
            console.error('Google Calendar - Sign-in failed: No access token received');
            console.error('Response:', response);
            resolve(false);
          }
        };

        // Request access token with specific parameters
        try {
          this.tokenClient.requestAccessToken({ 
            prompt: 'consent',
            hint: 'leveldesignagency@gmail.com'  // Hint which account to use
          });
        } catch (requestError) {
          clearTimeout(timeout);
          console.error('Google Calendar - Error requesting access token:', requestError);
          resolve(false);
        }
      });
    } catch (signInError) {
      console.error('Google Calendar - Modern GIS sign-in failed:', signInError);
      return false;
    }
  }

  async signOut(): Promise<void> {
    try {
      if (this.accessToken && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(this.accessToken);
      }
      
      this.currentUser = null;
      this.isSignedIn = false;
      this.accessToken = '';
      
      // Clear gapi client token
      if (window.gapi?.client) {
        window.gapi.client.setToken(null);
      }
      
      console.log('Google Calendar signed out successfully');
    } catch (error) {
      console.error('Error signing out of Google Calendar:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.isInitialized && this.isSignedIn && !!this.accessToken;
  }

  async getEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      if (!this.isAuthenticated()) {
        console.warn('Google Calendar - Not authenticated');
        return [];
      }

      if (!window.gapi?.client?.calendar) {
        console.error('Google Calendar API client not available');
        return [];
      }

      const start = startDate || new Date();
      const end = endDate || new Date(start.getFullYear(), start.getMonth() + 1, 0);

      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.result.items || [];
      return this.convertGoogleEvents(events);
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      return [];
    }
  }

  async getCalendars(): Promise<any[]> {
    try {
      if (!this.isAuthenticated()) {
        return [];
      }

      if (!window.gapi?.client?.calendar) {
        console.error('Google Calendar API client not available');
        return [];
      }

      const response = await window.gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching Google Calendar calendars:', error);
      return [];
    }
  }

  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      if (!window.gapi?.client?.calendar) {
        console.error('Google Calendar API client not available');
        return null;
      }

      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: event.location,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email
        })) || []
      };

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent
      });

      return this.convertGoogleEvents([response.result])[0];
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return null;
    }
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      if (!window.gapi?.client?.calendar) {
        console.error('Google Calendar API client not available');
        return null;
      }

      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: event.location
      };

      const response = await window.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: googleEvent
      });

      return this.convertGoogleEvents([response.result])[0];
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return null;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      if (!window.gapi?.client?.calendar) {
        console.error('Google Calendar API client not available');
        return false;
      }

      await window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      if (!this.tokenClient) {
        return false;
      }

      return new Promise((resolve) => {
        this.tokenClient.callback = (response: any) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            window.gapi.client.setToken({ access_token: response.access_token });
            resolve(true);
          } else {
            resolve(false);
          }
        };

        this.tokenClient.requestAccessToken({ prompt: '' });
      });
    } catch (error) {
      console.error('Error refreshing Google Calendar token:', error);
      return false;
    }
  }

  getUserProfile(): any {
    if (!this.currentUser) {
      return null;
    }

    // With modern GIS, we'd need to make a separate API call to get user profile
    // For now, return basic info from the token
    return {
      id: 'modern_user',
      name: 'Google User',
      email: 'user@gmail.com',
      imageUrl: ''
    };
  }

  // Diagnostic method to help troubleshoot issues
  async diagnose(): Promise<void> {
    console.log('=== GOOGLE CALENDAR DIAGNOSTIC ===');
    console.log('Environment:', {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      userAgent: navigator.userAgent.substring(0, 100) + '...'
    });
    
    console.log('Configuration:', {
      clientId: this.clientId ? 'Present' : 'Missing',
      apiKey: this.apiKey ? 'Present' : 'Missing',
      isInitialized: this.isInitialized,
      isSignedIn: this.isSignedIn,
      hasAccessToken: !!this.accessToken
    });
    
    console.log('Browser APIs:', {
      gapi: !!window.gapi,
      gapiClient: !!window.gapi?.client,
      gapiCalendar: !!window.gapi?.client?.calendar,
      googleAccounts: !!window.google?.accounts,
      googleOAuth2: !!window.google?.accounts?.oauth2
    });
    
    console.log('Token Client:', {
      available: !!this.tokenClient,
      accessToken: this.accessToken ? 'Present' : 'Missing'
    });
    
    // Check third-party cookies
    try {
      document.cookie = 'test=1; SameSite=None; Secure';
      const cookieEnabled = document.cookie.includes('test=1');
      console.log('Third-party cookies:', cookieEnabled ? 'Enabled' : 'Disabled/Blocked');
      // Clean up test cookie
      document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (e) {
      console.log('Third-party cookies: Cannot test (likely blocked)');
    }
    
    console.log('=== END DIAGNOSTIC ===');
  }

  // Reset method to clear API state
  async reset(): Promise<void> {
    console.log('Google Calendar - Resetting API state...');
    
    try {
      // Sign out if signed in
      if (this.isSignedIn) {
        await this.signOut();
      }
    } catch (error) {
      console.warn('Google Calendar - Error during sign out:', error);
    }
    
    // Reset internal state
    this.isInitialized = false;
    this.isSignedIn = false;
    this.currentUser = null;
    this.accessToken = '';
    this.tokenClient = null;
    
    console.log('Google Calendar - API state reset complete');
  }

  private convertGoogleEvents(googleEvents: any[]): CalendarEvent[] {
    return googleEvents.map((event: any) => {
      const start = event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date || new Date());
      const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date || new Date());

      const attendees: CalendarEventAttendee[] = (event.attendees || []).map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName || attendee.email,
        responseStatus: attendee.responseStatus || 'needsAction'
      }));

      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description,
        start: start,
        end: end,
        location: event.location,
        attendees: attendees,
        isAllDay: !event.start?.dateTime,
        recurrence: event.recurrence,
        status: event.status || 'confirmed',
        created: new Date(event.created),
        updated: new Date(event.updated),
        htmlLink: event.htmlLink,
        calendarId: event.organizer?.email || 'primary'
      };
    });
  }
}

// Create a safe instance that won't break if credentials are missing
const createGoogleCalendarService = () => {
  try {
    return new GoogleCalendarService();
  } catch (error) {
    console.error('Failed to create Google Calendar service:', error);
    // Return a placeholder service that won't break the app
    return {
      signIn: async () => false,
      signOut: async () => {},
      isAuthenticated: () => false,
      getEvents: async () => [],
      getCalendars: async () => [],
      createEvent: async () => null,
      updateEvent: async () => null,
      deleteEvent: async () => false,
      refreshToken: async () => false,
      getUserProfile: () => null,
      diagnose: async () => {},
      reset: async () => {}
    };
  }
};

export const googleCalendarService = createGoogleCalendarService(); 