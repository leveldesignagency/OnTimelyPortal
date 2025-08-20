import { ModuleType } from './types';

export const AVAILABLE_MODULES: ModuleType[] = [
  {
    id: 'safety-sos',
    name: 'Safety SOS',
    description: 'Emergency SOS system with real-time location tracking and alert system',
    icon: '🆘',
    category: 'safety',
    features: [
      'Emergency SOS Button',
      'Real-time Location Tracking',
      'Emergency Contact Alerts',
      'Geofencing Alerts',
      'Incident Reporting'
    ],
    configRequired: true
  },
  {
    id: 'flight-tracker',
    name: 'Flight Tracker',
    description: 'Real-time flight tracking and notifications',
    icon: '✈️',
    category: 'travel',
    features: [
      'Live Flight Status',
      'Delay Notifications',
      'Gate Changes',
      'Weather Impacts',
      'Alternative Routes'
    ],
    configRequired: true,
    apiKey: '8b8117fd5f6f048d0904c8e884939449'
  },
  {
    id: 'logistics-tracker',
    name: 'Logistics GPS',
    description: 'Real-time GPS tracking for logistics teams',
    icon: '📍',
    category: 'logistics',
    features: [
      'Live Team Tracking',
      'Area Assignment',
      'Route Optimization',
      'Team Communication',
      'Status Updates'
    ],
    configRequired: true
  },
  {
    id: 'event-tracker',
    name: 'Event Tracker',
    description: 'Live event status and progress tracking',
    icon: '📊',
    category: 'events',
    features: [
      'Live Status Updates',
      'Checkpoint Tracking',
      'Staff Assignments',
      'Issue Reporting',
      'Real-time Analytics'
    ]
  }
];

export const getModule = (id: string): ModuleType | undefined => {
  return AVAILABLE_MODULES.find(module => module.id === id);
};

export const getModulesByCategory = (category: ModuleType['category']): ModuleType[] => {
  return AVAILABLE_MODULES.filter(module => module.category === category);
};

// API Integration helpers
export const getModuleApiConfig = async (moduleId: string, apiKey?: string) => {
  switch (moduleId) {
    case 'flight-tracker':
      return {
        baseUrl: 'https://api.aviationstack.com/v1/',
        apiKey: apiKey || '8b8117fd5f6f048d0904c8e884939449',
        endpoints: {
          flightStatus: 'flights',
          airports: 'airports',
          airlines: 'airlines'
        }
      };
    case 'safety-sos':
      return {
        baseUrl: 'https://api.emergency-service.com/v1/',
        apiKey: apiKey || process.env.EMERGENCY_SERVICE_API_KEY,
        endpoints: {
          sos: 'alerts',
          location: 'tracking',
          geofence: 'boundaries'
        }
      };
    // Add more module API configurations as needed
    default:
      return null;
  }
}; 