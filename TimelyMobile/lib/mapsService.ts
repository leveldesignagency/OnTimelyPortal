import AsyncStorage from '@react-native-async-storage/async-storage';

// Map Pin Interface
export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  category: 'custom' | 'restaurant' | 'hotel' | 'transport' | 'attraction' | 'emergency';
  color: string;
  timestamp: Date;
}

// Downloaded Area Interface
export interface DownloadedArea {
  id: string;
  name: string;
  bounds: {
    northeast: { latitude: number; longitude: number };
    southwest: { latitude: number; longitude: number };
  };
  center: { latitude: number; longitude: number };
  radius: number; // in kilometers
  downloadedAt: Date;
  size: number; // in MB
}

// Navigation Route Interface
export interface NavigationRoute {
  id: string;
  start: { latitude: number; longitude: number };
  end: { latitude: number; longitude: number };
  mode: 'walking' | 'driving' | 'cycling' | 'ferry' | 'train' | 'bus' | 'subway' | 'tram';
  distance: number; // in meters
  duration: number; // in seconds
  steps: RouteStep[];
  geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: { latitude: number; longitude: number }[];
}

// Storage Keys
const STORAGE_KEYS = {
  PINS: '@TimelMaps_pins',
  DOWNLOADED_AREAS: '@TimelyMaps_downloaded_areas',
  ROUTES: '@TimelyMaps_routes',
  SETTINGS: '@TimelyMaps_settings'
};

// Pin Management
export const pinService = {
  async getPins(): Promise<MapPin[]> {
    try {
      const pinsData = await AsyncStorage.getItem(STORAGE_KEYS.PINS);
      return pinsData ? JSON.parse(pinsData) : [];
    } catch (error) {
      console.error('Error loading pins:', error);
      return [];
    }
  },

  async addPin(pin: Omit<MapPin, 'id' | 'timestamp'>): Promise<MapPin> {
    try {
      const pins = await this.getPins();
      const newPin: MapPin = {
        ...pin,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      pins.push(newPin);
      await AsyncStorage.setItem(STORAGE_KEYS.PINS, JSON.stringify(pins));
      return newPin;
    } catch (error) {
      console.error('Error adding pin:', error);
      throw error;
    }
  },

  async removePin(id: string): Promise<void> {
    try {
      const pins = await this.getPins();
      const filteredPins = pins.filter(pin => pin.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.PINS, JSON.stringify(filteredPins));
    } catch (error) {
      console.error('Error removing pin:', error);
      throw error;
    }
  },

  async updatePin(id: string, updates: Partial<MapPin>): Promise<void> {
    try {
      const pins = await this.getPins();
      const pinIndex = pins.findIndex(pin => pin.id === id);
      if (pinIndex !== -1) {
        pins[pinIndex] = { ...pins[pinIndex], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.PINS, JSON.stringify(pins));
      }
    } catch (error) {
      console.error('Error updating pin:', error);
      throw error;
    }
  }
};

// Offline Area Management
export const offlineService = {
  async getDownloadedAreas(): Promise<DownloadedArea[]> {
    try {
      const areasData = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_AREAS);
      return areasData ? JSON.parse(areasData) : [];
    } catch (error) {
      console.error('Error loading downloaded areas:', error);
      return [];
    }
  },

  async addDownloadedArea(area: Omit<DownloadedArea, 'id' | 'downloadedAt'>): Promise<DownloadedArea> {
    try {
      const areas = await this.getDownloadedAreas();
      const newArea: DownloadedArea = {
        ...area,
        id: Date.now().toString(),
        downloadedAt: new Date()
      };
      areas.push(newArea);
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AREAS, JSON.stringify(areas));
      return newArea;
    } catch (error) {
      console.error('Error adding downloaded area:', error);
      throw error;
    }
  },

  async removeDownloadedArea(id: string): Promise<void> {
    try {
      const areas = await this.getDownloadedAreas();
      const filteredAreas = areas.filter(area => area.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_AREAS, JSON.stringify(filteredAreas));
    } catch (error) {
      console.error('Error removing downloaded area:', error);
      throw error;
    }
  }
};

// Navigation Service
export const navigationService = {
  async calculateRoute(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    mode: 'walking' | 'driving' | 'cycling' | 'transit'
  ): Promise<NavigationRoute> {
    try {
      // For offline functionality, we'll use simplified route calculation
      // In a real implementation, you'd use Mapbox Directions API with offline caching
      const distance = this.calculateDistance(start, end);
      const baseSpeed = mode === 'walking' ? 5 : mode === 'cycling' ? 15 : mode === 'driving' ? 50 : 30; // km/h
      const duration = (distance / baseSpeed) * 3600; // seconds

      const route: NavigationRoute = {
        id: Date.now().toString(),
        start,
        end,
        mode,
        distance: distance * 1000, // convert to meters
        duration,
        steps: [
          {
            instruction: `Head ${this.getBearing(start, end)} toward destination`,
            distance: distance * 1000,
            duration,
            coordinates: [start, end]
          }
        ]
      };

      return route;
    } catch (error) {
      console.error('Error calculating route:', error);
      throw error;
    }
  },

  calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    const lat1 = this.toRad(point1.latitude);
    const lat2 = this.toRad(point2.latitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  getBearing(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number }
  ): string {
    const dLon = this.toRad(end.longitude - start.longitude);
    const lat1 = this.toRad(start.latitude);
    const lat2 = this.toRad(end.latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = this.toDeg(Math.atan2(y, x));
    
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(((bearing + 360) % 360) / 45) % 8;
    return directions[index];
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  toDeg(radians: number): number {
    return radians * (180 / Math.PI);
  }
};

// Utility functions for pin categories
export const pinCategories = {
  custom: { color: '#007AFF', icon: '📍' },
  restaurant: { color: '#FF6B6B', icon: '🍽️' },
  hotel: { color: '#4ECDC4', icon: '🏨' },
  transport: { color: '#45B7D1', icon: '🚇' },
  attraction: { color: '#96CEB4', icon: '🎭' },
  emergency: { color: '#FF4757', icon: '🚨' }
};

export const transportModes = {
  walking: { icon: '🚶‍♂️', color: '#4ECDC4', label: 'Walking' },
  cycling: { icon: '🚴‍♂️', color: '#45B7D1', label: 'Cycling' },
  driving: { icon: '🚗', color: '#96CEB4', label: 'Driving' },
  ferry: { icon: '⛴️', color: '#00BCD4', label: 'Ferry' },
  train: { icon: '🚆', color: '#795548', label: 'Train' },
  bus: { icon: '🚌', color: '#FF9800', label: 'Bus' },
  subway: { icon: '🚇', color: '#9C27B0', label: 'Subway' },
  tram: { icon: '🚊', color: '#607D8B', label: 'Tram' }
}; 