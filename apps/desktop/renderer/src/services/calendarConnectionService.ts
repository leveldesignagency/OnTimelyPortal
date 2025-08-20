// Safe IPC renderer access for browser compatibility
const getIpcRenderer = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  
  // Fallback for browser environment - return mock functions
  return {
    invoke: async (channel: string, ...args: any[]) => {
      console.warn(`IPC call to ${channel} not available in browser environment`);
      return null;
    }
  };
};

import { CalendarEvent } from '../types/calendar';

export interface CalendarConnection {
  id: string;
  provider: 'google' | 'outlook';
  email: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedEvent {
  id: string;
  connectionId: string;
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  isAllDay: boolean;
  recurrence?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export class CalendarConnectionService {
  private connections: Map<string, CalendarConnection> = new Map();
  private cachedEvents: Map<string, CachedEvent[]> = new Map();
  private ipc = getIpcRenderer();

  async checkAvailability(startTime: Date, endTime: Date, userId?: string): Promise<boolean> {
    try {
      const events = await this.getCachedEventsInRange(startTime, endTime, userId);
      
      // Check if there are any conflicting events
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        
        // Check for overlap
        return (eventStart < endTime && eventEnd > startTime);
      });

      return !hasConflict;
    } catch (error) {
      console.error('Error checking availability:', error);
      return true; // Default to available if there's an error
    }
  }

  async saveConnection(connection: Omit<CalendarConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarConnection> {
    try {
      const newConnection: CalendarConnection = {
        ...connection,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database via IPC
      const savedConnection = await this.ipc.invoke('save-calendar-connection', newConnection);
      
      if (savedConnection) {
        this.connections.set(savedConnection.id, savedConnection);
        return savedConnection;
      }
      
      return newConnection;
    } catch (error) {
      console.error('Error saving calendar connection:', error);
      throw error;
    }
  }

  async getUserConnections(userId?: string): Promise<CalendarConnection[]> {
    try {
      const connections = await this.ipc.invoke('get-calendar-connections', userId);
      
      if (connections && Array.isArray(connections)) {
        // Update local cache
        connections.forEach((conn: CalendarConnection) => {
          this.connections.set(conn.id, conn);
        });
        return connections;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting user connections:', error);
      return [];
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    try {
      await this.ipc.invoke('delete-calendar-connection', connectionId);
      this.connections.delete(connectionId);
      this.cachedEvents.delete(connectionId);
    } catch (error) {
      console.error('Error deleting calendar connection:', error);
      throw error;
    }
  }

  async syncEvents(connectionId: string): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      let events: CalendarEvent[] = [];

      if (connection.provider === 'google') {
        const { googleCalendarService } = await import('./googleCalendar');
        events = await googleCalendarService.getEvents();
      } else if (connection.provider === 'outlook') {
        const { outlookCalendarService } = await import('./outlookCalendar');
        events = await outlookCalendarService.getEvents();
      }

      // Convert to cached events format
      const cachedEvents: CachedEvent[] = events.map(event => ({
        id: this.generateId(),
        connectionId,
        eventId: event.id,
        title: event.title,
        description: event.description,
        startTime: new Date(event.start),
        endTime: new Date(event.end),
        location: event.location,
        attendees: event.attendees?.map(a => a.email) || [],
        isAllDay: event.isAllDay || false,
        recurrence: event.recurrence,
        status: (event.status === 'tentative' || event.status === 'cancelled') ? event.status : 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Save to database
      await this.saveCachedEvents(connectionId, cachedEvents);
      
      // Update local cache
      this.cachedEvents.set(connectionId, cachedEvents);
    } catch (error) {
      console.error('Error syncing events:', error);
      throw error;
    }
  }

  private async getCachedEventsInRange(startTime: Date, endTime: Date, userId?: string): Promise<CachedEvent[]> {
    try {
      const events = await this.ipc.invoke('get-cached-events', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        userId
      });

      return events || [];
    } catch (error) {
      console.error('Error getting cached events:', error);
      return [];
    }
  }

  // Public method to get cached events without date range (gets all recent events)
  async getCachedEvents(userId?: string): Promise<CachedEvent[]> {
    try {
      const now = new Date();
      const startTime = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Last month
      const endTime = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Next month
      
      const events = await this.ipc.invoke('get-cached-events', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        userId
      });

      return events || [];
    } catch (error) {
      console.error('Error getting cached events:', error);
      return [];
    }
  }

  private async saveCachedEvents(connectionId: string, events: CachedEvent[]): Promise<void> {
    try {
      // First clear existing events for this connection
      await this.ipc.invoke('clear-cached-events', connectionId);
      
      // Then save new events
      for (const event of events) {
        await this.ipc.invoke('save-cached-event', event);
      }
    } catch (error) {
      console.error('Error saving cached events:', error);
      throw error;
    }
  }

  async getEventsForDateRange(startDate: Date, endDate: Date, connectionIds?: string[]): Promise<CachedEvent[]> {
    try {
      const events = await this.ipc.invoke('get-events-for-date-range', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        connectionIds
      });

      return events || [];
    } catch (error) {
      console.error('Error getting events for date range:', error);
      return [];
    }
  }

  async refreshConnection(connectionId: string): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Refresh the access token if needed
      if (connection.provider === 'google') {
        const { googleCalendarService } = await import('./googleCalendar');
        await googleCalendarService.refreshToken();
      } else if (connection.provider === 'outlook') {
        const { outlookCalendarService } = await import('./outlookCalendar');
        await outlookCalendarService.refreshToken();
      }

      // Update connection status
      connection.isConnected = true;
      connection.updatedAt = new Date();
      
      await this.ipc.invoke('update-calendar-connection', connection);
      this.connections.set(connectionId, connection);
    } catch (error) {
      console.error('Error refreshing connection:', error);
      throw error;
    }
  }

  async testConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return false;
      }

      if (connection.provider === 'google') {
        const { googleCalendarService } = await import('./googleCalendar');
        return await googleCalendarService.isAuthenticated();
      } else if (connection.provider === 'outlook') {
        const { outlookCalendarService } = await import('./outlookCalendar');
        return await outlookCalendarService.isAuthenticated();
      }

      return false;
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Get all cached events for a specific connection
  async getConnectionEvents(connectionId: string): Promise<CachedEvent[]> {
    try {
      const events = await this.ipc.invoke('get-connection-events', connectionId);
      return events || [];
    } catch (error) {
      console.error('Error getting connection events:', error);
      return [];
    }
  }

  // Clear all cached events for a connection
  async clearConnectionEvents(connectionId: string): Promise<void> {
    try {
      await this.ipc.invoke('clear-connection-events', connectionId);
      this.cachedEvents.delete(connectionId);
    } catch (error) {
      console.error('Error clearing connection events:', error);
      throw error;
    }
  }

  // Get connection by ID
  async getConnection(connectionId: string): Promise<CalendarConnection | null> {
    try {
      if (this.connections.has(connectionId)) {
        return this.connections.get(connectionId)!;
      }

      const connection = await this.ipc.invoke('get-calendar-connection', connectionId);
      if (connection) {
        this.connections.set(connectionId, connection);
      }
      
      return connection || null;
    } catch (error) {
      console.error('Error getting connection:', error);
      return null;
    }
  }

  // Update connection status
  async updateConnectionStatus(connectionId: string, isConnected: boolean): Promise<void> {
    try {
      const connection = await this.getConnection(connectionId);
      if (connection) {
        connection.isConnected = isConnected;
        connection.updatedAt = new Date();
        
        await this.ipc.invoke('update-calendar-connection', connection);
        this.connections.set(connectionId, connection);
      }
    } catch (error) {
      console.error('Error updating connection status:', error);
      throw error;
    }
  }
}

export const calendarConnectionService = new CalendarConnectionService(); 