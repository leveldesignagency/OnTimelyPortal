import { CalendarEvent, CalendarEventAttendee } from '../types/calendar';

// Global declaration for MSAL
declare global {
  interface Window {
    msal: any;
  }
}

interface OutlookEvent {
  id: string;
  subject: string;
  body?: {
    content: string;
    contentType: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    status: {
      response: string;
      time: string;
    };
  }>;
  isAllDay: boolean;
  recurrence?: any;
  responseStatus?: {
    response: string;
    time: string;
  };
  createdDateTime: string;
  lastModifiedDateTime: string;
  webLink: string;
}

class OutlookCalendarService {
  private msalInstance: any = null;
  private isInitialized = false;
  private isSignedIn = false;
  private currentAccount: any = null;
  private clientId: string = '';

  constructor() {
    // Get credentials from environment variables
    this.clientId = process.env.VITE_OUTLOOK_CLIENT_ID || '';
    
    if (!this.clientId || this.clientId === 'your_outlook_client_id_here') {
      console.warn('Outlook Calendar - Missing Client ID!');
      console.warn('Please set VITE_OUTLOOK_CLIENT_ID in .env file');
      return;
    }
    
    console.log('Outlook Calendar - Client ID configured:', this.clientId ? 'Yes' : 'No');
    this.loadMSAL();
  }

  private async loadMSAL(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Check if MSAL script is loaded
      if (!window.msal) {
        console.log('Outlook Calendar - Loading MSAL script...');
        const script = document.createElement('script');
        script.src = 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js';
        script.onload = () => this.initializeMSAL();
        script.onerror = (error) => {
          console.error('Outlook Calendar - Failed to load MSAL script:', error);
        };
        document.head.appendChild(script);
      } else {
        this.initializeMSAL();
      }
    } catch (error) {
      console.error('Outlook Calendar - Failed to load MSAL:', error);
    }
  }

  private initializeMSAL(): void {
    try {
      if (!this.clientId) {
        console.error('Outlook Calendar - Client ID missing');
        return;
      }

      console.log('Outlook Calendar - Initializing MSAL...');

      const msalConfig = {
        auth: {
          clientId: this.clientId,
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin
        },
        cache: {
          cacheLocation: 'sessionStorage',
          storeAuthStateInCookie: false
        }
      };

      this.msalInstance = new window.msal.PublicClientApplication(msalConfig);
      this.isInitialized = true;
      console.log('Outlook Calendar - MSAL initialized successfully');

      // Check if user is already signed in
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        this.currentAccount = accounts[0];
        this.isSignedIn = true;
        console.log('Outlook Calendar - User already signed in:', this.currentAccount.username);
      }
    } catch (error) {
      console.error('Outlook Calendar - Failed to initialize MSAL:', error);
    }
  }

  async signIn(): Promise<boolean> {
    if (!this.isInitialized || !this.msalInstance) {
      console.error('Outlook Calendar - MSAL not initialized');
      return false;
    }

    try {
      console.log('Outlook Calendar - Starting sign-in...');
      
      const loginRequest = {
        scopes: [
          'https://graph.microsoft.com/calendars.read',
          'https://graph.microsoft.com/user.read'
        ],
        prompt: 'select_account'
      };

      const response = await this.msalInstance.loginPopup(loginRequest);
      this.currentAccount = response.account;
      this.isSignedIn = true;
      console.log('Outlook Calendar - Sign in successful:', this.currentAccount.username);
      return true;
    } catch (error) {
      console.error('Outlook Calendar - Sign in failed:', error);
      
      // Handle specific errors
      if (error.errorCode === 'user_cancelled') {
        console.log('Outlook Calendar - User cancelled sign-in');
      } else if (error.errorCode === 'popup_window_error') {
        console.log('Outlook Calendar - Popup blocked or closed');
      }
      
      return false;
    }
  }

  async signOut(): Promise<void> {
    try {
      if (this.msalInstance && this.currentAccount) {
        await this.msalInstance.logoutPopup({
          account: this.currentAccount
        });
        this.isSignedIn = false;
        this.currentAccount = null;
        console.log('Outlook Calendar - Signed out successfully');
      }
    } catch (error) {
      console.error('Outlook Calendar - Sign out error:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.isSignedIn && this.currentAccount !== null;
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.msalInstance || !this.currentAccount) {
      return null;
    }

    try {
      const silentRequest = {
        scopes: ['https://graph.microsoft.com/calendars.read'],
        account: this.currentAccount
      };

      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Outlook Calendar - Failed to get access token:', error);
      return null;
    }
  }

  async getEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    if (!this.isAuthenticated()) {
      console.warn('Outlook Calendar - Not authenticated');
      return [];
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        console.error('Outlook Calendar - Failed to get access token');
        return [];
      }

      const start = startDate || new Date();
      const end = endDate || new Date(start.getFullYear(), start.getMonth() + 1, 0);

      const startISO = start.toISOString();
      const endISO = end.toISOString();

      console.log('Outlook Calendar - Fetching events...');

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${startISO}' and end/dateTime le '${endISO}'&$orderby=start/dateTime`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const events = this.convertOutlookEvents(data.value || []);
      console.log(`Outlook Calendar - Loaded ${events.length} events`);
      return events;
    } catch (error) {
      console.error('Outlook Calendar - Failed to fetch events:', error);
      return [];
    }
  }

  async getCalendars(): Promise<any[]> {
    if (!this.isAuthenticated()) {
      return [];
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return [];
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Outlook Calendar - Failed to fetch calendars:', error);
      return [];
    }
  }

  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }

      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'HTML',
          content: event.description || ''
        },
        start: {
          dateTime: event.start?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: {
          displayName: event.location || ''
        },
        attendees: event.attendees?.map(attendee => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name || attendee.email
          }
        })) || []
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(outlookEvent)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.convertOutlookEvents([data])[0];
    } catch (error) {
      console.error('Outlook Calendar - Failed to create event:', error);
      return null;
    }
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }

      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'HTML',
          content: event.description || ''
        },
        start: {
          dateTime: event.start?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end?.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: {
          displayName: event.location || ''
        }
      };

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(outlookEvent)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.convertOutlookEvents([data])[0];
    } catch (error) {
      console.error('Outlook Calendar - Failed to update event:', error);
      return null;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return false;
      }

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Outlook Calendar - Failed to delete event:', error);
      return false;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      console.error('Outlook Calendar - Failed to refresh token:', error);
      return false;
    }
  }

  getUserProfile(): any {
    if (!this.currentAccount) {
      return null;
    }

    return {
      id: this.currentAccount.homeAccountId,
      name: this.currentAccount.name,
      email: this.currentAccount.username,
      imageUrl: ''
    };
  }

  // Diagnostic method
  async diagnose(): Promise<void> {
    console.log('=== OUTLOOK CALENDAR DIAGNOSTIC ===');
    console.log('Configuration:', {
      clientId: this.clientId ? 'Present' : 'Missing',
      isInitialized: this.isInitialized,
      isSignedIn: this.isSignedIn,
      hasAccount: !!this.currentAccount
    });
    
    console.log('Browser APIs:', {
      msal: !!window.msal,
      msalInstance: !!this.msalInstance
    });
    
    if (this.currentAccount) {
      console.log('Current Account:', {
        username: this.currentAccount.username,
        name: this.currentAccount.name
      });
    }
    
    console.log('=== END DIAGNOSTIC ===');
  }

  private convertOutlookEvents(outlookEvents: OutlookEvent[]): CalendarEvent[] {
    return outlookEvents.map(event => {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);

      const attendees: CalendarEventAttendee[] = (event.attendees || []).map(attendee => ({
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name || attendee.emailAddress.address,
        responseStatus: attendee.status.response || 'needsAction'
      }));

      return {
        id: event.id,
        title: event.subject,
        description: event.body?.content || '',
        start: start,
        end: end,
        location: event.location?.displayName,
        attendees: attendees,
        isAllDay: event.isAllDay,
        recurrence: event.recurrence,
        status: 'confirmed',
        created: new Date(event.createdDateTime),
        updated: new Date(event.lastModifiedDateTime),
        htmlLink: event.webLink,
        calendarId: 'primary'
      };
    });
  }
}

// Create a safe instance that won't break if credentials are missing
const createOutlookCalendarService = () => {
  try {
    return new OutlookCalendarService();
  } catch (error) {
    console.error('Failed to create Outlook Calendar service:', error);
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
      diagnose: async () => {}
    };
  }
};

export const outlookCalendarService = createOutlookCalendarService(); 