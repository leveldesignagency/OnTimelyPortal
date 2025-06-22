export type ModuleType = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'safety' | 'travel' | 'logistics' | 'events';
  features: string[];
  apiKey?: string;
  configRequired?: boolean;
};

export type SafetyModuleConfig = {
  sosEnabled: boolean;
  emergencyContacts: {
    name: string;
    phone: string;
    email: string;
  }[];
  geofencing?: {
    enabled: boolean;
    radius: number; // in meters
    center: {
      lat: number;
      lng: number;
    };
  };
};

export type TravelModuleConfig = {
  flightTracking: {
    enabled: boolean;
    provider: 'aviationstack' | 'flightaware';
    notifications: boolean;
  };
  transfers: {
    enabled: boolean;
    vehicleTypes: string[];
  };
};

export type LogisticsModuleConfig = {
  tracking: {
    enabled: boolean;
    updateInterval: number; // in seconds
    accuracy: 'high' | 'medium' | 'low';
  };
  teams: {
    id: string;
    name: string;
    members: string[];
    area: string;
  }[];
};

export type EventTrackerConfig = {
  liveUpdates: boolean;
  autoNotifications: boolean;
  statusCategories: string[];
  checkpoints: {
    id: string;
    name: string;
    status: 'pending' | 'in-progress' | 'completed';
    timestamp?: string;
  }[];
}; 