import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ModulesPage } from './pages/ModulesPage';
import Icon from './Icon';
import { ThemeContext } from './ThemeContext';
import SendFormModal from './components/SendFormModal';
import { getCurrentUser } from './lib/auth';
import { useRealtimeGuests, useRealtimeItineraries } from './hooks/useRealtime';
import { DraggableAction } from './components/DraggableAction';
import { 
  addMultipleGuests, 
  convertCsvToGuests, 
  deleteGuest, 
  getItineraries,
  addItinerary,
  updateItinerary,
  deleteItinerary,
  deleteMultipleItineraries,
  getEventModules,
  saveEventModules,
  getDraftItineraries,
  deleteDraftItinerary,
  updateEvent,
  assignTeamToEvent,
  getEvent,
  type Guest,
  type Itinerary,
  deleteEvent as supabaseDeleteEvent
} from './lib/supabase';
import { supabase, getEventActivityFeed } from './lib/supabase';
import { Itinerary as SupabaseItinerary } from './lib/supabase';
import AddOnCard from './components/AddOnCard';
import { User } from './lib/auth';
import EventForm from './components/EventForm';
import { getEventTeams } from './lib/supabase';
import { getEventAddOns, upsertEventAddon } from './lib/supabase';
import AnnouncementModal from './components/AnnouncementModal';
import { exportEventData, purgeEvent } from './lib/supabase';

// Custom Dropdown Component
const CustomDropdown = ({ 
  value, 
  onChange, 
  options, 
  colors 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[]; 
  colors: any; 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options.find(opt => opt.value === value) || options[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update selected option when value changes
  useEffect(() => {
    const newOption = options.find(opt => opt.value === value);
    if (newOption) {
      setSelectedOption(newOption);
    }
  }, [value, options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: { value: string; label: string }) => {
    setSelectedOption(option);
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          border: `2px solid ${colors.border}`,
          fontSize: 16,
          background: colors.inputBg,
          color: colors.text,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <span style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.2s ease',
          fontSize: '12px'
        }}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: colors.cardBg,
          border: `2px solid ${colors.border}`,
          borderRadius: 8,
          marginTop: 4,
          maxHeight: 200,
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: option.value === value ? colors.accent : 'transparent',
                color: option.value === value ? (colors.accent === '#ffffff' ? '#000000' : '#ffffff') : colors.text,
                fontSize: 16,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.background = colors.hoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function EventMetaInfo({ event, colors, isDark }: { event: any, colors: any, isDark: boolean }) {
  const [teamNames, setTeamNames] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      if (!event?.id) return;
      try {
        const links = await getEventTeams(event.id);
        const names = (links || []).map((t: any) => t.teams?.name || '').filter(Boolean);
        // Deduplicate to avoid repeated team names in header
        setTeamNames(Array.from(new Set(names)));
      } catch {
        setTeamNames([]);
      }
    })();
  }, [event?.id]);
  const metaParts = [];
  if (event.location) metaParts.push(`Location: ${event.location}`);
  if (event.time_zone) metaParts.push(`Time Zone: ${event.time_zone}`);
  if (teamNames.length > 0) metaParts.push(`Team Assigned: ${teamNames.join(', ')}`);
  if (event.from) {
    const fromDate = new Date(event.from).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const fromTime = event.start_time ? ` ${event.start_time}` : '';
    metaParts.push(`From: ${fromDate}${fromTime}`);
  }
  if (event.to) {
    const toDate = new Date(event.to).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const toTime = event.end_time ? ` ${event.end_time}` : '';
    metaParts.push(`To: ${toDate}${toTime}`);
  }
  if (metaParts.length === 0) return null;
  return (
    <div style={{ marginTop: 4, marginBottom: 16, fontSize: 15, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 12 }}>
      {metaParts.map((part, idx) => (
        <span key={idx}>
          {part}
          {idx < metaParts.length - 1 && <span style={{ margin: '0 12px', fontSize: 18, fontWeight: 700, color: colors.textSecondary, verticalAlign: 'middle' }}>•</span>}
        </span>
      ))}
    </div>
  );
}

// Add getColors function definition
const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0f0f0f' : '#f8fafc',
  text: isDark ? '#ffffff' : '#000000',
  textSecondary: isDark ? '#a1a1aa' : '#666666',
  border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  accent: isDark ? '#ffffff' : '#000000',
  hoverBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
  cardBg: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  buttonBg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
});

console.log("THIS IS EVENT DASHBOARD PAGE");

type EventType = {
  id: string;
  name: string;
  from: string;
  to: string;
  status: string;
};

type ItineraryType = SupabaseItinerary & {
  group_id?: string;
  group_name?: string;
};

type GuestType = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  contactNumber: string;
  countryCode: string;
  idType: string;
  idNumber: string;
  dob?: string;
  gender?: string;
  groupId?: string;
  groupName?: string;
  modules?: Record<string, boolean>;
};

type GroupedGuestsType = {
  [key: string]: GuestType[];
};

interface ModuleType {
  key: string;
  label: string;
  type: string;
  description: string;
  icon?: string;
}

interface DashboardModules {
  itinerary: ModuleType[];
  guests: ModuleType[];
  addons: ModuleType[];
}

const DASHBOARD_MODULES: DashboardModules = {
  itinerary: [
    { key: 'documentUpload', label: 'Document Upload', type: 'file', description: 'Upload and manage event documents' },
    { key: 'scheduleBuilder', label: 'Schedule Builder', type: 'tool', description: 'Create and manage event schedules' },
    { key: 'venueMap', label: 'Venue Map', type: 'tool', description: 'Interactive venue mapping' },
    { key: 'checklistMaker', label: 'Checklist Maker', type: 'tool', description: 'Create event checklists' }
  ],
  guests: [
    { key: 'guestGroups', label: 'Guest Groups', type: 'tool', description: 'Organize guests into groups' },
    { key: 'customFields', label: 'Custom Fields', type: 'field', description: 'Add custom guest information fields' },
    { key: 'guestImport', label: 'Guest Import', type: 'tool', description: 'Bulk import guest data' },
    { key: 'guestExport', label: 'Guest Export', type: 'tool', description: 'Export guest lists' }
  ],
  addons: [
    { key: 'flightTracker', label: 'Flight Tracker', type: 'service', description: 'Real-time flight status tracking', icon: 'airplane' },
    { key: 'safetyBeacon', label: 'Safety SOS', type: 'service', description: 'Emergency alert system for guests', icon: 'alert' },
    { key: 'gpsTracking', label: 'GPS Tracking', type: 'service', description: 'Track logistics team location', icon: 'crosshairs-gps' },
    { key: 'eventUpdates', label: 'Event Updates', type: 'service', description: 'Live event status notifications', icon: 'bell' },
    { key: 'hotelBooking', label: 'Hotel Manager', type: 'service', description: 'Hotel reservation tracking', icon: 'home' },
    // New Add Ons
    { key: 'currencyConverter', label: 'Currency Converter', type: 'service', description: 'Convert currencies for international guests', icon: 'currency-usd' },
    { key: 'translator', label: 'Translator', type: 'service', description: 'Translate text and phrases for guests', icon: 'translate' },
    { key: 'offlineMaps', label: 'Offline Maps', type: 'service', description: 'Access maps without internet connection', icon: 'map' }
  ]
};

type ActivityModule = {
  key: string;
  label: string;
};

const MODULES: ActivityModule[] = [
  { key: 'contact', label: 'Contact Info' },
  { key: 'reminder', label: 'Reminder (Email/SMS)' },
  { key: 'qr', label: 'QR Code' },
  { key: 'gps', label: 'GPS Tracker' },
  { key: 'file', label: 'File Upload' },
  { key: 'notes', label: 'Notes' },
];

// Glassmorphic style helpers
const getGlassStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(30, 30, 30, 0.8)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '16px',
  boxShadow: isDark 
    ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
    : '0 8px 32px rgba(0, 0, 0, 0.1)',
});

const getButtonStyles = (isDark: boolean, variant: 'primary' | 'secondary' = 'primary') => {
  const baseStyles = {
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '16px',
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyles,
        background: isDark 
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
        color: isDark ? '#ffffff' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
      };
    case 'secondary':
      return {
        ...baseStyles,
        background: isDark 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(0, 0, 0, 0.03)',
        color: isDark ? '#ffffff' : '#000000',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
      };
    default:
      return baseStyles;
  }
};

export default function EventDashboardPage({ events, onDeleteEvent }: { events: EventType[]; onDeleteEvent?: (eventId: string) => void }) {
  // Add CSS keyframes for guest highlighting animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current user for company context
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    })();
  }, []);
  
  // Use real-time guests hook
  const { guests: realtimeGuests, loading: guestsLoading, error: guestsError, refetch: refetchGuests } = useRealtimeGuests(id || null);
  
  // Use real-time itineraries hook
  const { itineraries: realtimeItineraries, loading: itinerariesLoading, error: itinerariesError, refetch: refetchItineraries } = useRealtimeItineraries(id || null);

  const [currentEvent, setCurrentEvent] = useState(events.find(e => e.id === id));
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Refresh event data when component mounts or when events prop changes
  useEffect(() => {
    const updatedEvent = events.find(e => e.id === id);
    setCurrentEvent(updatedEvent);
  }, [events, id]);
  
  // Periodically refresh event data to ensure status is up to date
  useEffect(() => {
    const refreshEventData = async () => {
      try {
        const updatedEvent = await getEvent(id!);
        setCurrentEvent(updatedEvent);
        if (currentUser && id) {
          try {
            // Load activity feed from RPC function
            const data = await getEventActivityFeed(id, currentUser.company_id, 30, 0);
            
            // Also load form submissions directly to ensure they're included
            const { data: formSubmissions, error: formError } = await supabase
              .from('form_submissions')
              .select(`
                id,
                email,
                responses,
                submitted_at,
                forms!inner(
                  event_id,
                  title
                )
              `)
              .eq('forms.event_id', id);
            
            if (formError) {
              console.error('Error querying form submissions:', formError);
            }
            
            // Transform form submissions to match activity feed format
            const transformedFormSubmissions = (formSubmissions || []).map(sub => {
              const actorName = (() => {
                try {
                  const responses = sub.responses;
                  if (responses) {
                    const firstName = responses.firstName || responses.first_name || '';
                    const lastName = responses.lastName || responses.last_name || '';
                    if (firstName || lastName) {
                      return `${firstName} ${lastName}`.trim();
                    }
                  }
                } catch (e) {
                  console.log('Error extracting name from responses:', e);
                }
                return sub.email || 'Guest';
              })();
              
              return {
                item_type: 'form_submission',
                title: 'Guest Form Submitted',
                description: 'Form response received',
                created_at: sub.submitted_at,
                actor_name: actorName,
                actor_email: sub.email,
                source_id: sub.id
              };
            });
            
            // Merge and sort by created_at
            const allActivity = [...(data || []), ...transformedFormSubmissions]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 30);
            
            setActivityFeed(allActivity);
            console.log('🔄 Activity feed loaded:', { 
              rpcCount: data?.length || 0, 
              formSubmissionsCount: formSubmissions?.length || 0,
              totalCount: allActivity.length 
            });
          } catch (e) {
            console.error('Error loading event activity feed:', e);
          }
        }
      } catch (error) {
        console.error('Error refreshing event data:', error);
      }
    };
    
    // Refresh immediately
    refreshEventData();
    
    // Refresh every 5 seconds
    const interval = setInterval(refreshEventData, 5000);
    
    return () => clearInterval(interval);
  }, [id]);
  
  // Handle query parameters for tab and guest highlighting
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    const highlight = searchParams.get('highlight');
    
    if (tab) {
      setActiveTab(tab);
      console.log('🎯 Setting active tab from URL:', tab);
    }
    
    if (highlight) {
      setHighlightedGuestEmail(decodeURIComponent(highlight));
      console.log('🎯 Setting highlighted guest from URL:', decodeURIComponent(highlight));
      
      // Clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedGuestEmail(null);
        console.log('🎯 Cleared guest highlight');
      }, 5000);
    }
  }, [location.search]);

  // Real-time subscription for guest form submissions to update activity feed
  useEffect(() => {
    if (!supabase || !id || !currentUser?.company_id) return;

    const subscription = supabase
      .channel('guest_form_submissions_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'form_submissions'
        },
        async (payload) => {
          console.log('📡 New guest form submission detected:', payload);
          
          // Check if this submission is for our current event
          try {
            // Get the form details to check if it's for our event
            const { data: formData } = await supabase
              .from('forms')
              .select('event_id')
              .eq('id', payload.new.form_id)
              .single();
            
            if (formData?.event_id === id) {
              console.log('🎯 Form submission is for current event, updating activity feed');
              
              // Get guest name from the form responses
              let guestName = 'Guest';
              try {
                const responses = payload.new.responses;
                if (responses) {
                  const firstName = responses.firstName || responses.first_name || '';
                  const lastName = responses.lastName || responses.last_name || '';
                  if (firstName || lastName) {
                    guestName = `${firstName} ${lastName}`.trim();
                  }
                }
              } catch (e) {
                console.log('Could not extract guest name from responses');
              }
              
              // Add the form submission directly to the activity feed
              const newActivityItem = {
                item_type: 'form_submission',
                title: 'Guest Form Submitted',
                description: `${guestName} completed the guest form`,
                created_at: payload.new.submitted_at || new Date().toISOString(),
                actor_name: guestName,
                actor_email: payload.new.email,
                source_id: payload.new.id
              };
              
              setActivityFeed(prev => [newActivityItem, ...prev.slice(0, 29)]); // Keep only 30 items
              console.log('🔄 Activity feed updated with new guest form submission:', newActivityItem);
            } else {
              console.log('⚠️ Form submission is for different event, ignoring');
            }
          } catch (error) {
            console.error('Error checking form submission event:', error);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, id, currentUser?.company_id]);

  // Real-time subscription for guest creation to update activity feed
  useEffect(() => {
    if (!supabase || !id || !currentUser?.company_id) return;

    const subscription = supabase
      .channel('guest_creation_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guests'
        },
        async (payload) => {
          console.log('📡 New guest created:', payload);
          
          // Check if this guest is for our current event
          if (payload.new.event_id === id) {
            console.log('🎯 Guest created for current event, updating activity feed');
            
            // Get guest name
            const firstName = payload.new.first_name || '';
            const lastName = payload.new.last_name || '';
            const guestName = `${firstName} ${lastName}`.trim() || 'Guest';
            
            // Add the guest creation to the activity feed
            const newActivityItem = {
              item_type: 'guest_created',
              title: 'Guest Added',
              description: `${guestName} was added to the guest list`,
              created_at: payload.new.created_at || new Date().toISOString(),
              actor_name: guestName,
              actor_email: payload.new.email,
              source_id: payload.new.id
            };
            
            setActivityFeed(prev => [newActivityItem, ...prev.slice(0, 29)]); // Keep only 30 items
            console.log('🔄 Activity feed updated with new guest creation:', newActivityItem);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, id, currentUser?.company_id]);

  // Refresh event data when navigating back (check location state)
  useEffect(() => {
    if (location.state?.refreshEvent) {
      // Force refresh by fetching the latest event data from database
      const refreshEventData = async () => {
        try {
          const updatedEvent = await getEvent(id!);
          setCurrentEvent(updatedEvent);
        } catch (error) {
          console.error('Error refreshing event data:', error);
          // Fallback to events prop
          const updatedEvent = events.find(e => e.id === id);
          setCurrentEvent(updatedEvent);
        }
      };
      refreshEventData();
      // Clear the refresh flag
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, events, id, navigate]);
  
  const event = currentEvent;
  const [activeTab, setActiveTab] = useState('settings');
  const [highlightedGuestEmail, setHighlightedGuestEmail] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestType[]>([]);
  const [savedItineraries, setSavedItineraries] = useState<ItineraryType[]>([]);
  const [draftItineraries, setDraftItineraries] = useState<ItineraryType[]>([]);
  const [externalDraftItineraries, setExternalDraftItineraries] = useState<ItineraryType[]>([]);
  
  // CSV Upload states
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null);
  const [csvUploadSuccess, setCsvUploadSuccess] = useState<string | null>(null);

  const [showModules, setShowModules] = useState(true);
  const [itineraryToDelete, setItineraryToDelete] = useState<string | null>(null);
  const [ittinerariesExpandedCard, setIttinerariesExpandedCard] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState<string | null>(null);
  const [isSelectModeActive, setIsSelectModeActive] = useState(false);
  const [isItinerarySelectModeActive, setIsItinerarySelectModeActive] = useState(false);
  const [selectedItineraryIds, setSelectedItineraryIds] = useState<string[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteText, setBulkDeleteText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [newGuestData, setNewGuestData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    countryCode: '+44',
    idType: 'passport',
    idNumber: '',
    dob: '',
    gender: 'prefer-not-to-say'
  });
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [deleteEventText, setDeleteEventText] = useState('');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [itineraryToShare, setItineraryToShare] = useState<string | null>(null);
  const [shareRecipients, setShareRecipients] = useState<GuestType[]>([]);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  
  // New state for guest selection
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showGuestDeleteConfirm, setShowGuestDeleteConfirm] = useState(false);
  
  const [activeSection, setActiveSection] = useState('modules');
  const [activeModules, setActiveModules] = useState<{
    [key: string]: {
      id: string;
      name: string;
      type: string;
      config?: any;
    }[];
  }>({
    travel: [],
    hotels: [],
    logistics: [],
    eventTracker: [],
    safety: [],
    addons: []
  });
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  
  // State for Send Form modal
  const [showSendFormModal, setShowSendFormModal] = useState(false);
  
  // Ref to track shift key status
  const shiftKeyRef = useRef(false);

  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filters, setFilters] = useState({
    sort: 'firstName-asc',
    group: 'all',
    nationality: 'all',
    gender: 'all',
    idType: 'all',
    ageRange: { min: '', max: '' },
  });
  // modalView state removed - not used
  
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const { id: eventId } = useParams();

  // Refs for click-outside detection
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const filterPopupRef = useRef<HTMLDivElement>(null);

  // Add state for CSV export modal
  const [showCsvExportModal, setShowCsvExportModal] = useState(false);

  const [isSavingAddOns, setIsSavingAddOns] = useState(false);
  const [saveAddOnsMessage, setSaveAddOnsMessage] = useState<string | null>(null);
  
  // Success message state
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Add missing state variables
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Handle click outside filter popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
    };

    if (showFilterPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPopup]);

  // Add state for itinerary date sort order
  const [filtersItineraryDateSort, setFiltersItineraryDateSort] = useState<'asc' | 'desc'>('asc');

  // Add state for custom sort dropdown
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Add state for undo functionality
  const [lastBulkAction, setLastBulkAction] = useState<{ action: string, affected: any[] } | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);

  // Add state for draft deletion confirmation
  const [showDeleteDraftModal, setShowDeleteDraftModal] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [deleteDraftText, setDeleteDraftText] = useState('');

  // Add state for edit event modal
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventData, setEditEventData] = useState({
    name: '',
    from: '',
    to: '',
    startTime: '',
    endTime: '',
    description: '',
    location: '',
    timeZone: 'UTC',
    teamIds: [] as string[]
  });
  const [editEventLoading, setEditEventLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // Success message function
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
      setSuccessMessage('');
    }, 3000);
  };

  // When the modal is closed, reset the state
  const handleCloseModal = () => {
    setShowSendFormModal(false);
  };

  // handleSendForm function removed - now handled by SendFormModal component

  // Old form handler functions removed - now handled by SendFormModal component

  // New CSV Guest Upload Handler
  const handleGuestCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !event) return;

    setIsCsvUploading(true);
    setCsvUploadError(null);
    setCsvUploadSuccess(null);

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      if (!text) throw new Error('File is empty');

      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

      const headers = lines[0].split(',').map(h => h.trim());
      const requiredHeaders = ['First Name', 'Last Name'];
      
      for (const requiredHeader of requiredHeaders) {
        if (!headers.includes(requiredHeader)) {
          throw new Error(`CSV is missing required header: ${requiredHeader}`);
        }
      }

      const csvData = lines.slice(1).map((line, rowIndex) => {
        const values = line.split(',').map(v => v.trim());
        const entry: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          entry[header] = value;
        });

        if (!entry['First Name'] || !entry['Last Name']) {
          throw new Error(`Row ${rowIndex + 2} is missing First Name or Last Name`);
        }
        
        return entry;
      });

      // Convert CSV data to guest format
      const guestsToAdd = convertCsvToGuests(csvData, event.id, currentUser.company_id, currentUser.id);
      
      // Add to Supabase
      await addMultipleGuests(guestsToAdd);
      
      // Refresh guests list
      await refetchGuests();
      
      setCsvUploadSuccess(`Successfully uploaded ${guestsToAdd.length} guests! They are now visible to all team members.`);
      
      // Clear the file input
      e.target.value = '';
      
    } catch (error) {
      setCsvUploadError(error instanceof Error ? error.message : 'Failed to upload CSV');
    } finally {
      setIsCsvUploading(false);
    }
  };

  // Replace add-on loading logic
  useEffect(() => {
    if (!event?.id) return;
    const loadAddOns = async () => {
      try {
        const addOns = await getEventAddOns(event.id);
        setActiveModules(prev => ({
          ...prev,
          addons: addOns.filter(a => a.enabled).map(a => ({
            id: a.addon_key,
            name: a.addon_key,
            type: a.addon_type || 'service',
          }))
        }));
      } catch (error) {
        console.error('Error loading add-ons from event_addons:', error);
        setActiveModules(prev => ({ ...prev, addons: [] }));
      }
    };
    loadAddOns();
  }, [event?.id]);

  useEffect(() => {
    console.log('DEBUG: activeModules changed', activeModules);
  }, [activeModules]);

  // Update local guests state when real-time data changes
  useEffect(() => {
    if (realtimeGuests) {
      // Convert Supabase guest format to local format
      const convertedGuests = realtimeGuests.map((guest: Guest) => ({
        id: guest.id,
        firstName: guest.first_name,
        middleName: guest.middle_name,
        lastName: guest.last_name,
        email: guest.email,
        contactNumber: guest.contact_number,
        countryCode: guest.country_code,
        idType: guest.id_type,
        idNumber: guest.id_number,
        idCountry: guest.id_country,
        dob: guest.dob,
        gender: guest.gender,
        groupId: guest.group_id,
        groupName: guest.group_name,
        nextOfKinName: guest.next_of_kin_name,
        nextOfKinEmail: guest.next_of_kin_email,
        nextOfKinPhoneCountry: guest.next_of_kin_phone_country,
        nextOfKinPhone: guest.next_of_kin_phone,
        dietary: guest.dietary || [],
        medical: guest.medical || [],
        modules: guest.modules || {},
        moduleValues: guest.module_values || {},
        prefix: guest.prefix,
        status: guest.status
      }));
      setGuests(convertedGuests);
    }
  }, [realtimeGuests]);

  // Update local itinerary state when real-time data changes
  useEffect(() => {
    if (realtimeItineraries) {
      const saved = realtimeItineraries.filter(it => !it.is_draft);
      const drafts = realtimeItineraries.filter(it => !!it.is_draft);
      setSavedItineraries(saved);
      setDraftItineraries(drafts);
    }
  }, [realtimeItineraries]);

  // Fetch drafts from draft_itineraries table
  useEffect(() => {
    const fetchDrafts = async () => {
      if (!event?.id || !currentUser?.company_id) return;
      
      try {
        const drafts = await getDraftItineraries(event.id, currentUser.company_id);
        setExternalDraftItineraries(drafts);
      } catch (error) {
        console.error('Error fetching draft itineraries:', error);
      }
    };

    fetchDrafts();
  }, [event?.id, currentUser?.company_id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    // On mount, check for ?tab=itineraries and set the correct tab
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!event) return;
    localStorage.setItem(`event_modules_${event.id}`, JSON.stringify(activeModules));
  }, [activeModules, event]);

  const shareSearchResults = useMemo(() => {
    if (!shareSearchQuery) {
      return { guests: [], groups: [] };
    }

    const query = shareSearchQuery.toLowerCase();
    
    const matchingGuests = guests.filter(g => 
        (g.firstName + ' ' + g.lastName).toLowerCase().includes(query) ||
        g.email.toLowerCase().includes(query)
    );

    const allGroups: { [key: string]: { groupId: string, guests: GuestType[] } } = guests.reduce((acc, guest) => {
        if (guest.groupId && guest.groupName) {
            if (!acc[guest.groupName]) {
                acc[guest.groupName] = { groupId: guest.groupId, guests: [] };
            }
            acc[guest.groupName].guests.push(guest);
        }
        return acc;
    }, {} as Record<string, { groupId: string, guests: GuestType[] }>);

    const matchingGroups = Object.entries(allGroups)
        .filter(([groupName]) => groupName.toLowerCase().includes(query))
        .map(([groupName, groupData]) => ({ name: groupName, ...groupData }));

    return { guests: matchingGuests, groups: matchingGroups };
  }, [shareSearchQuery, guests]);

  const handleAddRecipient = (guestOrGroup: GuestType | { name: string, groupId: string, guests: GuestType[] }) => {
    let guestsToAdd: GuestType[] = [];
    if ('guests' in guestOrGroup) {
        guestsToAdd = guestOrGroup.guests;
    } else {
        guestsToAdd = [guestOrGroup];
    }

    setShareRecipients(currentRecipients => {
        const existingIds = new Set(currentRecipients.map(g => g.id));
        const newRecipients = guestsToAdd.filter(g => !existingIds.has(g.id));
        return [...currentRecipients, ...newRecipients];
    });

    setShareSearchQuery('');
  };

  const handleRemoveRecipient = (guestId: string) => {
    setShareRecipients(current => current.filter(g => g.id !== guestId));
  };

  const handleSendItinerary = () => {
    if (itineraryToShare === null || shareRecipients.length === 0) return;

    const itinerary = savedItineraries.find(it => it.id === itineraryToShare);
    if (!itinerary) return;
    
    console.log('--- Sending Itinerary ---');
    console.log('Itinerary:', itinerary.title);
    console.log('Recipients:', shareRecipients.map(g => ({ name: `${g.firstName} ${g.lastName}`, email: g.email })));
    console.log('-------------------------');

    // Reset and close
    setShowShareModal(false);
    setItineraryToShare(null);
    setShareRecipients([]);
    setShareSearchQuery('');
  };

  function formatUK(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  function handleDownloadCSVTemplate() {
    const headers = [
      'Prefix', 'Gender', 'First Name', 'Middle Name', 'Last Name',
      'Country Code', 'Contact Number', 'Email',
      'ID Type', 'ID Number', 'Date of Birth (YYYY-MM-DD)',
      'Flight Number', 'Event Reference', 'Hotel Location',
      'Hotel Booking Number', 'Train Booking Number',
      'Coach Booking Number', 'ID Upload (file path)',
      'Seat Number'
    ];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function getAge(dateString?: string) {
    if (!dateString) return null;
    try {
      const today = new Date();
      const birthDate = new Date(dateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return null;
    }
  }

  const groupedGuests = useMemo(() => {
    const grouped: GroupedGuestsType = {};
    
    if (!guests || guests.length === 0) return grouped;
    
    guests.forEach(guest => {
      const groupKey = guest.groupId || 'ungrouped';
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(guest);
    });
    
    return grouped;
  }, [guests]);

  const groupedItineraries = useMemo(() => {
    const groups: { [key: string]: ItineraryType[] } = {};
    const individuals: ItineraryType[] = [];

    savedItineraries.forEach(itinerary => {
      if (itinerary.group_id) {
        if (!groups[itinerary.group_id]) {
          groups[itinerary.group_id] = [];
        }
        groups[itinerary.group_id].push(itinerary);
      } else {
        individuals.push(itinerary);
      }
    });

    return { groups, individuals };
  }, [savedItineraries]);

  const handleSelectAll = () => {
    if (selectedGuestIds.length === guests.length) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(guests.map(g => g.id));
    }
  };

  const handleSelectAllClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedGuestIds(guests.map(g => g.id));
    } else {
      setSelectedGuestIds([]);
    }
  };

  const isAllSelected = selectedGuestIds.length === guests.length && guests.length > 0;
  const isIndeterminate = selectedGuestIds.length > 0 && selectedGuestIds.length < guests.length;

  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 24px',
        fontWeight: 600,
        fontSize: '16px',
        borderRadius: '8px',
        border: `2px solid ${isDark ? '#ffffff' : '#000000'}`,
        background: activeTab === id 
          ? (isDark ? '#ffffff' : '#ffffff') 
          : 'transparent',
        color: activeTab === id 
          ? '#000000' 
          : (isDark ? '#ffffff' : '#000000'),
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap' as const
      }}
    >
      {label}
    </button>
  );

  const handleDuplicate = async (itinerary: ItineraryType) => {
    if (!event || !currentUser) return;
    
    if (!itinerary) return;
    
    try {
      const newItinerary = {
        event_id: event.id,
        company_id: currentUser.company_id || '',
        created_by: currentUser.id || '',
        title: `${itinerary.title} (Copy)`,
        description: itinerary.description || '',
        date: itinerary.date || '',
        arrival_time: itinerary.arrival_time || '',
        start_time: itinerary.start_time || '',
        end_time: itinerary.end_time || '',
        location: itinerary.location || '',
        is_draft: false,
        document_file_name: itinerary.document_file_name,
        qrcode_url: itinerary.qrcode_url,
        qrcode_image: itinerary.qrcode_image,
        contact_name: itinerary.contact_name,
        contact_country_code: itinerary.contact_country_code,
        contact_phone: itinerary.contact_phone,
        contact_email: itinerary.contact_email,
        notification_times: itinerary.notification_times || [],
        group_id: itinerary.group_id,
        group_name: itinerary.group_name,
        content: itinerary.content
      };
      
      await addItinerary(newItinerary);
      await refetchItineraries();
      showSuccess('Itinerary duplicated successfully!');
      return newItinerary;
    } catch (error) {
      console.error('Error duplicating itinerary:', error);
      showSuccess('Error duplicating itinerary. Please try again.');
      return null;
    }
  };

  const handleMakeDraft = async (itineraryId: number) => {
    if (!event) return;
    const itinerary = savedItineraries.find(it => Number(it.id) === Number(itineraryId));
    if (!itinerary) return;

    try {
      console.log('Updating itinerary to draft:', itinerary.id, { is_draft: true });
      const result = await updateItinerary(Number(itinerary.id), { is_draft: true });
      console.log('Update result:', result);
      await refetchItineraries();
      showSuccess('Itinerary moved to drafts successfully!'); // Re-enabled
    } catch (error) {
      console.error('Error making itinerary draft:', error);
      showSuccess('Error moving to drafts. Please try again.');
    }
  };

  const handleDeleteSingle = async () => {
    if (!event || itineraryToDelete === null) {
      console.error('Missing event or itinerary to delete');
      alert('Error: Missing event or itinerary information');
      return;
    }
    
    console.log('itineraryToDelete:', itineraryToDelete, 'type:', typeof itineraryToDelete);
    console.log('savedItineraries length:', savedItineraries.length);
    
    // itineraryToDelete should be a string ID
    const itineraryId = itineraryToDelete;
    if (!itineraryId) {
      console.error('Could not find itinerary ID to delete');
      alert('Error: Could not identify itinerary to delete');
      return;
    }
    
    // Verify the itinerary exists in our list
    const itineraryExists = savedItineraries.find(it => it.id === itineraryId);
    if (!itineraryExists) {
      console.error('Itinerary not found in saved list:', itineraryId);
      alert('Error: Itinerary not found');
      return;
    }
    
    try {
      console.log('Attempting to delete itinerary:', itineraryId);
      console.log('Itinerary details:', itineraryExists);
      
      await deleteItinerary(itineraryId);
      console.log('Delete operation completed, refetching...');
      
      // Close modal immediately
      setShowDeleteConfirm(false);
      setItineraryToDelete(null);
      
      // Refetch data
      await refetchItineraries();
      console.log('Refetch completed');
      
      showSuccess('Itinerary deleted successfully!');
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      
      // Close modal on error too
      setShowDeleteConfirm(false);
      setItineraryToDelete(null);
      
      alert(`Error deleting itinerary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!event || selectedItineraryIds.length === 0) return;
    
    try {
      for (const id of selectedItineraryIds) {
        await deleteItinerary(id);
      }
      setSelectedItineraryIds([]);
      await refetchItineraries();
    } catch (error) {
      console.error('Error deleting itineraries:', error);
    }
  };

  function handleSelectGuest(guestId: string) {
    setSelectedGuestIds(prev => {
      if (prev.includes(guestId)) {
        return prev.filter(id => id !== guestId);
      } else {
        return [...prev, guestId];
      }
    });
  }

  function handleSelectGroup(groupId: string) {
    const groupGuests = groupedGuests[groupId] || [];
    const groupGuestIds = groupGuests.map(g => g.id);
    const allSelected = groupGuestIds.every(id => selectedGuestIds.includes(id));
    
    if (allSelected) {
      setSelectedGuestIds(prev => prev.filter(id => !groupGuestIds.includes(id)));
    } else {
      setSelectedGuestIds(prev => [...new Set([...prev, ...groupGuestIds])]);
    }
  }

  async function handleDeleteSelectedGuests() {
    if (selectedGuestIds.length === 0) return;
    
    try {
      console.log('Deleting guests:', selectedGuestIds);
      
      for (const guestId of selectedGuestIds) {
        await deleteGuest(guestId);
      }
      
      const deletedCount = selectedGuestIds.length;
      console.log(`Successfully deleted ${deletedCount} guest(s)`);
      
      // Clear selections and close modal immediately
      setSelectedGuestIds([]);
      setShowGuestDeleteConfirm(false);
      
      // Refetch guests data
      await refetchGuests();
      
      // Show success message
      showSuccess(`Successfully deleted ${deletedCount} guest${deletedCount > 1 ? 's' : ''}!`);
      
    } catch (error) {
      console.error('Error deleting guests:', error);
      
      // Close modal even on error
      setShowGuestDeleteConfirm(false);
      
      // Show error message
      alert(`Error deleting guests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const handlePublishDraft = async (draftId: string) => {
    const draft = draftItineraries.find(d => d.id === draftId);
    console.log('Entered handlePublishDraft', draftId, draft);
    if (!event || !draft) return;
    try {
      const result = await updateItinerary(Number(draft.id), { is_draft: false });
      console.log('[PublishDraft] updateItinerary result:', result);
      await refetchItineraries();
      showSuccess('Draft published successfully!');
    } catch (error) {
      console.error('Error publishing draft:', error);
      showSuccess('Error publishing draft. Please try again.');
    }
  }

  const handleDragStart = (e: React.DragEvent, moduleKey: string) => {
    e.dataTransfer.setData('text/plain', moduleKey);
  };

  const handleModuleDrop = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    const moduleKey = e.dataTransfer.getData('text/plain');
    
    if (!event) return;
    
    setActiveModules(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), { 
        id: `${moduleKey}-${Date.now()}`,
        name: moduleKey,
        type: moduleKey
      }]
    }));
  };

  const handleModuleRemove = (category: string, moduleId: string) => {
    setActiveModules(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter(m => m.id !== moduleId)
    }));
  };

  const GuestCard = ({ guest, isSelected, onSelect, standalone, isSelectModeActive }: { guest: GuestType, isSelected: boolean, onSelect: (id: string) => void, standalone?: boolean, isSelectModeActive: boolean }) => {
    // Check if this guest should be highlighted
    const isHighlighted = highlightedGuestEmail === guest.email;
    

    const handleNavigate = () => {
      if (!isSelectModeActive) {
        navigate(`/event/${event?.id}/guests/edit/${guest.id}`);
      }
    };
    
    const handleSelectClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(guest.id);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelect(guest.id);
    };

    // Check if Stage 1 Travel Companion module is active
    const hasStage1Module = guest.modules?.stage1TravelCompanion === true;

    return (
      <div
        data-guest-email={guest.email}
        onClick={handleNavigate}
        style={{
          ...getGlassStyles(isDark),
          border: isSelected
            ? (isDark ? '2px solid #fff' : '2px solid #000')
            : isHighlighted
            ? (isDark ? '3px solid #fbbf24' : '3px solid #f59e0b') // Yellow highlight border
            : (isDark ? '1px solid rgba(255,255,255,0.13)' : '1px solid #e5e7eb'),
          borderRadius: 16,
          padding: '28px 28px 20px 28px',
          marginBottom: 0,
          boxShadow: isHighlighted
            ? (isDark ? '0 0 20px rgba(251, 191, 36, 0.6)' : '0 0 20px rgba(245, 158, 11, 0.6)') // Glowing highlight shadow
            : isDark
            ? '0 4px 16px rgba(0,0,0,0.25)'
            : '0 4px 16px rgba(0,0,0,0.08)',
          cursor: isSelectModeActive ? 'default' : 'pointer',
          position: 'relative',
          minHeight: 120,
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transform: isHighlighted ? 'scale(1.02)' : 'scale(1)', // Slight scale up when highlighted
          background: isHighlighted 
            ? (isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.1)') // Subtle highlight background
            : undefined,
          animation: isHighlighted ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      >
        {isSelectModeActive && (
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '18px',
                height: '18px',
                accentColor: isDark ? '#ffffff' : '#000000',
                borderRadius: 6,
              }}
            />
          </div>
        )}
        
        {/* Stage 1: Active indicator */}
        {hasStage1Module && (
          <div style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16,
            background: '#22c55e',
            color: 'white',
            padding: '4px 10px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
            boxShadow: '0 2px 8px rgba(34,197,94,0.15)',
            zIndex: 2
          }}>
            Stage 1 Active
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: isDark ? '#fff' : '#111', marginBottom: 2 }}>
            {guest.firstName} {guest.lastName}
          </div>
          <div style={{ color: isDark ? '#aaa' : '#444', fontSize: 15, marginBottom: 2 }}>
            {guest.email}
          </div>
          <div style={{ color: isDark ? '#888' : '#666', fontSize: 14 }}>
            {guest.countryCode} {guest.contactNumber}
          </div>
          {guest.dob && (
            <div style={{ color: isDark ? '#888' : '#666', fontSize: 14 }}>
              Age: {getAge(guest.dob)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleDeleteEvent = () => {
    setShowDeleteEventModal(true);
  };

  const handleConfirmDeleteEvent = async () => {
    if (!event || deleteEventText !== 'delete') return;
    
    try {
      await supabaseDeleteEvent(event.id);
      setShowDeleteEventModal(false);
      if (onDeleteEvent) onDeleteEvent(event.id);
      navigate('/');
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Old email handling functions removed - now handled by SendFormModal component

  // handleNextToPreview function removed - not used

  const isEventLive = (event: EventType): boolean => {
    const now = new Date();
    const eventStart = new Date(event.from);
    const eventEnd = new Date(event.to);
    
    return now >= eventStart && now <= eventEnd;
  };

  const getEventDisplayStatus = (event: EventType): string => {
    const now = new Date();
    const eventStart = new Date(event.from);
    const eventEnd = new Date(event.to);
    
    if (now < eventStart) {
      return 'Upcoming';
    } else if (now >= eventStart && now <= eventEnd) {
      return 'Live';
    } else {
      return 'Completed';
    }
  };

  const getStatusColor = (event: EventType): string => {
    const displayStatus = getEventDisplayStatus(event);
    
    switch (displayStatus) {
      case 'Live':
        return '#22c55e'; // Green
      case 'Upcoming':
        return '#f59e0b'; // Orange
      case 'Completed':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const handleSelectItinerary = (itineraryId: string) => {
    setSelectedItineraryIds(prev => {
      if (prev.includes(itineraryId)) {
        return prev.filter(id => id !== itineraryId);
      } else {
        return [...prev, itineraryId];
      }
    });
  };

  const handleSelectAllItineraries = () => {
    if (selectedItineraryIds.length === savedItineraries.length) {
      setSelectedItineraryIds([]);
    } else {
      setSelectedItineraryIds(savedItineraries.map(i => i.id));
    }
  };

  const handleDeleteAllItineraries = async () => {
    if (selectedItineraryIds.length === 0) return;
    
    try {
      console.log('Starting bulk delete for itineraries:', selectedItineraryIds);
      
      for (const id of selectedItineraryIds) {
        await deleteItinerary(id);
        console.log(`Successfully deleted itinerary: ${id}`);
      }
      
      // Clear selection and close modal immediately after starting deletion
      setSelectedItineraryIds([]);
      setShowBulkDeleteConfirm(false);
      
      // Refresh the itinerary list
      await refetchItineraries();
      
      // Show success message
      console.log(`Successfully deleted ${selectedItineraryIds.length} itineraries`);
      // You could add a toast notification here if you have one implemented
      
    } catch (error) {
      console.error('Error deleting itineraries:', error);
      // Close modal even on error to prevent it from staying open
      setShowBulkDeleteConfirm(false);
      // You could show an error toast here
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleExportCsv() {
    setShowCsvExportModal(true);
  }

  function downloadCsv() {
    if (!event || !savedItineraries) return;

    // Define headers for itinerary CSV
    const headers = [
      'Title',
      'Description', 
      'Date',
      'Arrival Time',
      'Start Time',
      'End Time',
      'Location',
      'Group ID',
      'Group Name',
      'Document File Name',
      'QR Code URL',
      'QR Code Image',
      'Contact Name',
      'Contact Country Code',
      'Contact Phone',
      'Contact Email',
      'Notification Times',
      'Modules',
      'Module Values'
    ];

    // Create rows from published itineraries
    const rows = savedItineraries.map(itinerary => [
      itinerary.title || '',
      itinerary.description || '',
      itinerary.date || '',
      itinerary.arrival_time || '',
      itinerary.start_time || '',
      itinerary.end_time || '',
      itinerary.location || '',
      itinerary.group_id || '',
      itinerary.group_name || '',
      itinerary.document_file_name || '',
      itinerary.qrcode_url || '',
      itinerary.qrcode_image || '',
      itinerary.contact_name || '',
      itinerary.contact_country_code || '',
      itinerary.contact_phone || '',
      itinerary.contact_email || '',
      Array.isArray(itinerary.notification_times) ? itinerary.notification_times.join(';') : '',
      JSON.stringify((itinerary as any).modules || {}),
      JSON.stringify((itinerary as any).module_values || {})
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.name}_itineraries.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowCsvExportModal(false);
  }

  // Guest page styles
  const guestPageBlackButtonStyle = {
    ...getButtonStyles(isDark, 'primary'),
    minWidth: '120px',
    maxWidth: '140px',
    whiteSpace: 'nowrap' as const,
    textAlign: 'center' as const,
  };

  const guestPageWhiteButtonStyle = {
    ...getButtonStyles(isDark, 'secondary'),
    minWidth: '120px',
    maxWidth: '140px',
    whiteSpace: 'nowrap' as const,
    textAlign: 'center' as const,
  };

  const guestPageInputStyle = {
    padding: '12px 16px',
    border: '2px solid #ffffff',
    borderRadius: 8,
    fontSize: 16,
    background: 'transparent',
    color: '#ffffff',
    outline: 'none',
    width: '300px',
    transition: 'all 0.2s ease',
  };

  // Filter and search logic for guests
  const filteredGuests = useMemo(() => {
    let filtered = guests.filter(guest => {
      const matchesSearch = searchQuery === '' || 
        guest.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesNationality = filters.nationality === 'all' || guest.countryCode === filters.nationality;
      const matchesGender = filters.gender === 'all' || guest.gender === filters.gender;
      const matchesIdType = filters.idType === 'all' || guest.idType === filters.idType;

      let matchesAge = true;
      if (filters.ageRange.min || filters.ageRange.max) {
        const age = getAge(guest.dob);
        if (age !== null) {
          if (filters.ageRange.min && age < parseInt(filters.ageRange.min)) matchesAge = false;
          if (filters.ageRange.max && age > parseInt(filters.ageRange.max)) matchesAge = false;
        }
      }

      return matchesSearch && matchesNationality && matchesGender && matchesIdType && matchesAge;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const [field, direction] = filters.sort.split('-');
      let aValue = (a as any)[field] || '';
      let bValue = (b as any)[field] || '';
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [guests, searchQuery, filters]);

  const allFilteredSelected = filteredGuests.length > 0 && filteredGuests.every(guest => selectedGuestIds.includes(guest.id));

  // Replace handleSaveAddOns logic
  const handleSaveAddOns = async () => {
    if (!event?.id) return;
    setIsSavingAddOns(true);
    setSaveAddOnsMessage(null);
    try {
      // Get all possible add-ons
      const allAddOnKeys = DASHBOARD_MODULES.addons.map(a => a.key);
      // Get currently enabled add-ons
      const enabledAddOnKeys = (activeModules.addons || []).map(a => a.name);
      // Upsert each add-on
      await Promise.all(allAddOnKeys.map(async key => {
        const moduleInfo = DASHBOARD_MODULES.addons.find(a => a.key === key);
        await upsertEventAddon({
          event_id: event.id,
          addon_key: key,
          enabled: enabledAddOnKeys.includes(key),
          addon_label: moduleInfo?.label,
          addon_type: moduleInfo?.type,
          addon_description: moduleInfo?.description,
          addon_icon: moduleInfo?.icon,
          is_active: true,
        });
      }));
      setSaveAddOnsMessage('Add-Ons saved!');
    } catch (error) {
      setSaveAddOnsMessage('Failed to save Add-Ons.');
    } finally {
      setIsSavingAddOns(false);
      setTimeout(() => setSaveAddOnsMessage(null), 2000);
    }
  };

  // Handle delete add-on
  const handleDeleteAddOn = async (addonKey: string) => {
    if (!event?.id) return;
    
    try {
      // Remove from local state
      setActiveModules(prev => ({
        ...prev,
        addons: prev.addons.filter(a => a.name !== addonKey && a.id !== addonKey)
      }));
      
      // Update in database
      await upsertEventAddon({
        event_id: event.id,
        addon_key: addonKey,
        enabled: false,
        addon_label: DASHBOARD_MODULES.addons.find(a => a.key === addonKey)?.label,
        addon_type: DASHBOARD_MODULES.addons.find(a => a.key === addonKey)?.type,
        addon_description: DASHBOARD_MODULES.addons.find(a => a.key === addonKey)?.description,
        addon_icon: DASHBOARD_MODULES.addons.find(a => a.key === addonKey)?.icon,
        is_active: false,
      });
      
      setSaveAddOnsMessage('Add-On removed!');
      setTimeout(() => setSaveAddOnsMessage(null), 2000);
    } catch (error) {
      console.error('Error deleting add-on:', error);
      setSaveAddOnsMessage('Failed to remove Add-On.');
      setTimeout(() => setSaveAddOnsMessage(null), 2000);
    }
  };

  // Remove all use of saveEventModules/getEventModules for add-ons

  if (!event) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: 'Roboto, Arial, system-ui, sans-serif', 
        background: isDark ? '#1a1a1a' : '#fff',
        padding: '40px 20px'
      }}>
        <div style={{ 
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{ 
            fontSize: 48, 
            fontWeight: 700, 
            color: isDark ? '#ffffff' : '#000', 
            marginBottom: 16,
            letterSpacing: '-0.02em'
          }}>
            Event not found
          </div>
          <div style={{ 
            fontSize: 18, 
            color: isDark ? '#aaa' : '#555', 
            marginBottom: 48,
            lineHeight: 1.5
          }}>
            The event you are looking for does not exist or has been deleted.
          </div>
          <div style={{ 
            display: 'flex', 
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => navigate('/')} 
              style={{ 
                background: isDark ? '#ffffff' : '#222', 
                color: isDark ? '#000' : '#fff', 
                fontWeight: 600, 
                fontSize: 16, 
                border: 'none', 
                borderRadius: 8, 
                padding: '14px 28px', 
                minWidth: 160, 
                minHeight: 48, 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => navigate('/create-event')} 
              style={{ 
                background: 'transparent', 
                color: isDark ? '#ffffff' : '#222', 
                fontWeight: 600, 
                fontSize: 16, 
                border: `2px solid ${isDark ? '#444' : '#bbb'}`, 
                borderRadius: 8, 
                padding: '14px 28px', 
                minWidth: 160, 
                minHeight: 48, 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Create New Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Function to store selected add-ons in Supabase for an event
  async function saveEventAddOns(eventId: string, addOnKeys: string[]) {
    // TODO: Implement actual Supabase update logic
    // await supabase.from('events').update({ addons: addOnKeys }).eq('id', eventId);
  }

  // Function to be called by the mobile app to activate add-ons for a guest profile
  // (This is a placeholder for future mobile integration)
  // function activateAddOnsForGuest(eventId: string, guestId: string) {
  //   // Mobile app would call this to install/activate add-ons for the guest
  //   // Example: fetch enabled add-ons from Supabase and show/hide modules in the mobile UI
  // }

  // 1. Standardize all main page titles
  const mainTitleStyle = {
    fontSize: 32,
    fontWeight: 600,
    margin: 0,
    color: isDark ? '#fff' : '#333',
    paddingTop: 32,
    paddingLeft: 8,
    paddingBottom: 16,
    letterSpacing: '-0.02em',
  };

  // 2. Glassmorphic activity card style for Live Activity Feed
  const activityCardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    background: isDark ? 'rgba(40,40,40,0.7)' : 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    border: isDark ? '1px solid #444' : '1px solid #e2e8f0',
    boxShadow: isDark ? '0 2px 8px #0003' : '0 2px 8px #0001',
    marginBottom: 8,
  };

  // 3. Glassmorphic style for Quick Actions
  const quickActionsStyle = {
    ...getGlassStyles(isDark),
    background: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 32,
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.08)',
    border: isDark ? '1px solid #333' : '1px solid #e5e7eb',
    marginBottom: 32,
    marginTop: 15,
  };

  // 4. Glassmorphic style for Event Settings
  const eventSettingsStyle = {
    ...getGlassStyles(isDark),
    background: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 32,
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.08)',
    border: isDark ? '1px solid #333' : '1px solid #e5e7eb',
    marginBottom: 32,
    marginTop: 15,
  };

  // Add a useEffect to refetch itineraries when sort order changes
  useEffect(() => {
    if (!event?.id) return;
    const fetchItineraries = async () => {
      try {
        // getCurrentUser may be async, so handle accordingly
        const user = typeof getCurrentUser === 'function' ? await getCurrentUser() : getCurrentUser;
        const companyId = user?.company_id;
        let data = await getItineraries(event.id, companyId, filtersItineraryDateSort);
        // Always sort in-memory by date
        const sortFn = (a: any, b: any) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          return filtersItineraryDateSort === 'asc' ? aDate - bDate : bDate - aDate;
        };
        setSavedItineraries(data.filter((it) => it.is_draft === false).sort(sortFn));
        setDraftItineraries(data.filter((it) => it.is_draft === true).sort(sortFn));
      } catch (error) {
        console.error('Error fetching itineraries with sort:', error);
      }
    };
    fetchItineraries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersItineraryDateSort, event?.id]);

  // Remove Options button and dropdown, add Select All button and modal
  // Add state for Select All modal
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);

  // Undo Last button handler
  const handleUndoLast = async () => {
    if (!lastBulkAction) return;
    if (lastBulkAction.action === 'duplicate') {
      // Remove duplicated itineraries
      for (const it of lastBulkAction.affected) {
        await deleteItinerary(it.id);
      }
      await refetchItineraries();
      setUndoMessage('Duplicated itineraries have been removed.');
    } else if (lastBulkAction.action === 'draft') {
      // Un-draft: set is_draft to false
      for (const it of lastBulkAction.affected) {
        await updateItinerary(it.id, { ...it, is_draft: false });
      }
      await refetchItineraries();
      setUndoMessage('Drafts have been restored to active.');
    } else if (lastBulkAction.action === 'delete') {
      // Re-create deleted itineraries
      for (const it of lastBulkAction.affected) {
        const { id, ...rest } = it;
        await addItinerary(rest);
      }
      await refetchItineraries();
      setUndoMessage('Deleted itineraries have been restored.');
    }
    setLastBulkAction(null);
  };

  // Add function to handle draft deletion
  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;
    
    try {
      console.log('Deleting draft:', draftToDelete);
      await deleteDraftItinerary(draftToDelete);
      console.log('Draft deleted successfully');
      
      // Update UI immediately by filtering out the deleted draft
      setExternalDraftItineraries(prev => {
        const updated = prev.filter(draft => draft.id !== draftToDelete);
        console.log('Updated drafts list:', updated.length, 'drafts remaining');
        return updated;
      });
      
      // Also refetch drafts to ensure consistency
      if (event?.id && currentUser?.company_id) {
        const drafts = await getDraftItineraries(event.id, currentUser.company_id);
        setExternalDraftItineraries(drafts);
        console.log('Refetched drafts:', drafts.length, 'drafts');
      }
      
      setShowDeleteDraftModal(false);
      setDraftToDelete(null);
      showSuccess('Draft deleted successfully!');
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Error deleting draft. Please try again.');
    }
  };

  // Add function to handle edit event modal
  const handleOpenEditEventModal = async () => {
    console.log('handleOpenEditEventModal called');
    console.log('currentEvent:', currentEvent);
    if (currentEvent) {
      // Fetch assigned team IDs for this event
      let teamIds: string[] = [];
      try {
        const teamLinks = await getEventTeams(currentEvent.id);
        teamIds = (teamLinks || []).map((t: any) => t.team_id);
      } catch (e) {
        teamIds = [];
      }
      setEditEventData({
        name: currentEvent.name || '',
        from: currentEvent.from || '',
        to: currentEvent.to || '',
        startTime: (currentEvent as any).start_time || '',
        endTime: (currentEvent as any).end_time || '',
        description: (currentEvent as any).description || '',
        location: (currentEvent as any).location || '',
        timeZone: (currentEvent as any).time_zone || 'UTC',
        teamIds
      });
      setShowEditEventModal(true);
    } else {
      console.log('No currentEvent found');
    }
  };

  // Add or import the formatDateDisplay helper if not present
  function formatDateDisplay(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, yyyy, mm, dd] = match;
      return `${dd}/${mm}/${yyyy}`;
    }
    return dateStr;
  }

  useEffect(() => {
    const fetchActivity = async () => {
      if (!currentUser || !id) return;
      try {
        setActivityLoading(true);
        const data = await getEventActivityFeed(id, currentUser.company_id, 30, 0);
        setActivityFeed(data || []);
      } catch (e) {
        console.error('Error loading event activity feed:', e);
      } finally {
        setActivityLoading(false);
      }
    };
    fetchActivity();
  }, [currentUser, id]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: isDark ? '#121212' : '#f8f9fa' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: 260, height: '100vh', background: isDark ? '#1a1a1a' : '#222', color: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <Sidebar 
          events={events} 
          isOverlay={false} 
          isOpen={true} 
          setOpen={() => {}} 
        />
      </div>

      {activeTab === 'addons' && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          right: 0,
          width: showModules ? 320 : 32, 
          height: '100vh',
          background: isDark
            ? 'rgba(0, 0, 0, 0.35)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isDark
            ? '1.5px solid rgba(255,255,255,0.12)'
            : '1.5px solid #e5e7eb',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.08)',
          color: '#fff',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: showModules ? 'stretch' : 'center',
          padding: showModules ? '40px 24px' : '40px 0',
          zIndex: 100
        }}>
          <button 
            onClick={() => setShowModules(v => !v)} 
            style={{ 
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 22,
              cursor: 'pointer',
              alignSelf: showModules ? 'flex-end' : 'center',
              marginBottom: 32,
              padding: '8px'
            }}
          >
            {showModules ? '→' : '←'}
          </button>

          {showModules && (
            <>
              <div style={{ fontSize: 13, color: '#bbb', marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>Available Services</div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {DASHBOARD_MODULES.addons.map(module => {
                  const isActive = (activeModules.addons || []).some(m =>
                    (typeof m.id === 'string' && m.id.includes(module.key)) ||
                    (typeof m.name === 'string' && m.name.includes(module.key))
                  );
                  return (
                    <div
                      key={module.key}
                      draggable={!isActive}
                      onDragStart={e => handleDragStart(e, module.key)}
                      style={{
                        background: isDark ? 'rgba(40,40,40,0.45)' : 'rgba(255,255,255,0.85)',
                        border: isActive
                          ? '2px solid #22c55e'
                          : isDark ? '1.5px solid rgba(255,255,255,0.13)' : '1px solid #bbb',
                        borderRadius: 12,
                        padding: '14px 18px',
                        cursor: isActive ? 'not-allowed' : 'grab',
                        userSelect: 'none',
                        boxShadow: isActive
                          ? '0 0 12px 2px #22c55e99'
                          : isDark ? '0 2px 12px #0004' : '0 1px 4px #0001',
                        width: '100%',
                        color: isDark ? '#fff' : '#222',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        transition: 'background 0.2s, color 0.2s, box-shadow 0.2s, border 0.2s',
                        opacity: isActive ? 0.7 : 1,
                        position: 'relative',
                        pointerEvents: isActive ? 'none' : 'auto',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* <span style={{ fontSize: 24 }}>{module.icon}</span> */}
                        <div>
                          <div style={{ color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 16 }}>{module.label}</div>
                          <div style={{ color: isDark ? '#cbd5e1' : '#666', fontSize: 12 }}>{module.description}</div>
                        </div>
                        {isActive && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: 22,
                            color: '#22c55e',
                            fontWeight: 700,
                            filter: 'drop-shadow(0 0 6px #22c55e99)'
                          }}>✓</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 260,
        right: activeTab === 'addons' ? (showModules ? 320 : 32) : 0,
        height: '100vh',
        overflowY: 'auto',
        background: isDark ? '#121212' : '#fff',
        padding: 0, // Remove side padding from outer container
        transition: 'right 0.3s ease'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 16px 0 16px', // Add top padding, reduce side padding
          fontFamily: 'Roboto, Arial, system-ui, sans-serif',
          color: isDark ? '#ffffff' : '#222',
          width: '100%'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, width: '100%' }}>
            <h1 style={{ ...mainTitleStyle, textAlign: 'left', width: '100%' }}>{currentEvent?.name || 'Event Dashboard'}</h1>
            {currentEvent && (
              <EventMetaInfo event={currentEvent} colors={colors} isDark={isDark} />
            )}
          </div>
          <div style={{ height: 32 }} />
          <hr style={{ margin: '7px 0 16px 0', border: 'none', borderTop: isDark ? '2px solid #444' : '2px solid #bbb' }} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            <TabButton id="settings" label="Event Dashboard" />
            <TabButton id="itineraries" label="Itineraries" />
            <TabButton id="guests" label="Guests" />
            <TabButton id="addons" label="Add Ons" />
          </div>

          {activeTab === 'settings' && (
            <div style={{ marginBottom: 64, paddingBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                {/* Remove duplicate section title to avoid header repetition */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <DraggableAction
                    action={{
                      name: 'Launch Event',
                      icon: '🚀',
                      type: 'navigate',
                      to: `/link-itineraries/${currentEvent?.id}`
                    }}
                  >
                    <button
                      onClick={() => navigate(`/link-itineraries/${currentEvent?.id}`)}
                      style={{
                        background: event?.status === 'launched' 
                          ? '#4CAF50' 
                          : (isDark 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(255, 255, 255, 0.2)'),
                        backdropFilter: 'blur(10px)',
                        border: event?.status === 'launched'
                          ? '1px solid #4CAF50'
                          : (isDark 
                            ? '1px solid rgba(255, 255, 255, 0.2)' 
                            : '1px solid rgba(0, 0, 0, 0.1)'),
                        color: event?.status === 'launched' ? '#ffffff' : (isDark ? '#ffffff' : '#000000'),
                        borderRadius: 12,
                        padding: '16px 32px',
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: isDark 
                          ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                          : '0 8px 32px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        minWidth: '140px',
                        maxWidth: '180px',
                        whiteSpace: 'nowrap',
                        marginBottom: 24,
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0 // Remove any gap
                      }}
                      onMouseEnter={(e) => {
                        if (event?.status === 'launched') {
                          e.currentTarget.style.background = '#45a049';
                        } else {
                          e.currentTarget.style.background = isDark 
                            ? 'rgba(255, 255, 255, 0.15)' 
                            : 'rgba(255, 255, 255, 0.3)';
                        }
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        if (event?.status === 'launched') {
                          e.currentTarget.style.background = '#4CAF50';
                        } else {
                          e.currentTarget.style.background = isDark 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(255, 255, 255, 0.2)';
                        }
                        e.currentTarget.style.transform = 'translateY(0px)';
                      }}
                    >
                    {event?.status === 'launched' ? 'Event Launched' : 'Launch Event'}
                    </button>
                  </DraggableAction>
                  <DraggableAction
                    action={{
                      name: 'Edit Event',
                      icon: '✏️',
                      type: 'function',
                      execute: () => handleOpenEditEventModal()
                    }}
                  >
                    <button
                      onClick={() => {
                        console.log('Edit Event button clicked!');
                        handleOpenEditEventModal();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isDark 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                        border: isDark 
                          ? '1px solid rgba(255, 255, 255, 0.2)' 
                          : '1px solid rgba(0, 0, 0, 0.1)',
                        color: isDark ? '#ffffff' : '#000000',
                        borderRadius: 12,
                        padding: '16px 32px',
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: isDark 
                          ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                          : '0 8px 32px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        minWidth: '140px',
                        maxWidth: '180px',
                        whiteSpace: 'nowrap',
                        marginBottom: 24,
                        textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark 
                        ? 'rgba(255, 255, 255, 0.15)' 
                        : 'rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDark 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0px)';
                    }}
                  >
                    Edit Event
                  </button>
                  </DraggableAction>
                </div>
              </div>
              
              {/* Overview Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
                
                {/* Total Guests Card */}
                <div style={{ 
                  background: isDark ? '#1e1e1e' : '#000', 
                  borderRadius: 16, 
                  padding: 32, 
                  color: '#fff',
                  boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
                  border: isDark ? '1px solid #333' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Icon name="person" style={{ fontSize: 48, color: isDark ? '#60A5FA' : '#3B82F6' }} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 36, fontWeight: 700 }}>{guests.length}</div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>Total Guests</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{guests.filter(g => g.gender === 'Male').length}</div>
                      <div style={{ opacity: 0.8 }}>Male</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{guests.filter(g => g.gender === 'Female').length}</div>
                      <div style={{ opacity: 0.8 }}>Female</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{new Set(guests.map(g => g.groupId).filter(Boolean)).size}</div>
                      <div style={{ opacity: 0.8 }}>Groups</div>
                    </div>
                  </div>
                </div>

                {/* Itinerary Progress Card */}
                <div style={{ 
                  background: isDark ? '#2a2a2a' : '#333', 
                  borderRadius: 16, 
                  padding: 32, 
                  color: '#fff',
                  boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
                  border: isDark ? '1px solid #444' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Icon name="clipboard" style={{ fontSize: 48, color: isDark ? '#34D399' : '#10B981' }} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 36, fontWeight: 700 }}>{savedItineraries.length}</div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>Active Itineraries</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span>Completion Rate</span>
                      <span>75%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 8 }}>
                      <div style={{ background: '#fff', borderRadius: 8, height: 8, width: '75%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Event Status Card */}
                <div style={{ 
                  background: isDark ? '#3a3a3a' : '#666', 
                  borderRadius: 16, 
                  padding: 32, 
                  color: '#fff',
                  boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
                  border: isDark ? '1px solid #555' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Icon name="satellite" style={{ fontSize: 48, color: isDark ? '#A78BFA' : '#8B5CF6' }} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{event?.status || 'Active'}</div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>Event Status</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <div style={{ marginBottom: 8 }}>Start: {event?.from}</div>
                    <div>End: {event?.to}</div>
                  </div>
                </div>
              </div>

              {/* 2. Quick Actions moved above Guest Journey Checkpoints */}
              <div style={quickActionsStyle}>
                <h3 style={{ fontSize: 30, fontWeight: 600, marginBottom: 24 }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <button 
                    onClick={() => navigate(`/export-report/${event?.id}`)}
                    style={{
                      ...getButtonStyles(isDark, 'primary'),
                      padding: '16px 20px',
                      fontSize: 15,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      textAlign: 'center'
                    }}
                  >
                    Export Report
                  </button>
                  <button 
                    onClick={() => setShowAnnouncementModal(true)}
                    style={{
                      ...getButtonStyles(isDark, 'secondary'),
                      padding: '16px 20px',
                      fontSize: 15,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      textAlign: 'center'
                    }}
                  >
                    Send Announcement
                  </button>
                  <button 
                    onClick={() => navigate(`/guest-forms/${event?.id}`)}
                    style={{
                      ...getButtonStyles(isDark, 'secondary'),
                      padding: '16px 20px',
                      fontSize: '15px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      textAlign: 'center'
                    }}
                  >
                    Guest Form Responses
                  </button>
                  <button 
                    onClick={() => {
                      console.log('🔍 Event Portal clicked');
                      console.log('🔍 Event ID:', event?.id);
                      console.log('🔍 Event status:', event?.status);
                      console.log('🔍 Is launched:', event?.status === 'launched');
                      if (event?.status === 'launched') {
                        navigate(`/event-portal-management/${event?.id}`);
                      } else {
                        console.log('❌ Event not launched, navigation blocked');
                      }
                    }}
                    style={{
                      ...getButtonStyles(isDark, event?.status === 'launched' ? 'primary' : 'secondary'),
                      padding: '16px 20px',
                      fontSize: 15,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      textAlign: 'center',
                      cursor: event?.status === 'launched' ? 'pointer' : 'not-allowed',
                      opacity: event?.status === 'launched' ? 1 : 0.5,
                      pointerEvents: event?.status === 'launched' ? 'auto' : 'none'
                    }}
                  >
                    Event Portal
                  </button>
                </div>
              </div>

              {/* 3. Guest Journey Tracking (now above Live Activity Feed) */}
              <div style={{ 
                background: isDark ? '#1e1e1e' : '#fff', 
                borderRadius: 16, 
                padding: 32, 
                marginBottom: 32,
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.08)',
                border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: 30, fontWeight: 600, marginBottom: 24 }}>Guest Journey Checkpoints</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  
                  {/* Flight Status */}
                  <div style={{ 
                    border: isDark ? '2px solid #444' : '2px solid #e5e7eb', 
                    borderRadius: 12, 
                    padding: 20,
                    background: isDark ? '#2a2a2a' : '#fff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: isDark ? '#333' : '#000', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 18,
                        color: '#fff'
                      }}>
                        <Icon name="flight" style={{ fontSize: 18, color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: isDark ? '#ffffff' : '#000' }}>Flight Status</div>
                        <div style={{ color: isDark ? '#aaa' : '#666', fontSize: 14 }}>Landing & Arrival</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, color: isDark ? '#ddd' : '#000' }}>Flights Landed</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#000' }}>12/15</span>
                          <div style={{ width: 60, height: 6, background: isDark ? '#555' : '#e5e7eb', borderRadius: 3 }}>
                            <div style={{ width: '80%', height: 6, background: isDark ? '#fff' : '#333', borderRadius: 3 }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, color: isDark ? '#ddd' : '#000' }}>Confirmed Arrival</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#000' }}>10/15</span>
                          <div style={{ width: 60, height: 6, background: isDark ? '#555' : '#e5e7eb', borderRadius: 3 }}>
                            <div style={{ width: '67%', height: 6, background: isDark ? '#ccc' : '#666', borderRadius: 3 }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Checkpoint */}
                  <div style={{ 
                    border: isDark ? '2px solid #444' : '2px solid #e5e7eb', 
                    borderRadius: 12, 
                    padding: 20,
                    background: isDark ? '#2a2a2a' : '#fff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: isDark ? '#444' : '#333', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 18,
                        color: '#fff'
                      }}>
                        <Icon name="padlock" style={{ fontSize: 18, color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: isDark ? '#ffffff' : '#000' }}>Security</div>
                        <div style={{ color: isDark ? '#aaa' : '#666', fontSize: 14 }}>Customs & Immigration</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, color: isDark ? '#ddd' : '#000' }}>Through Security</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#000' }}>8/10</span>
                          <div style={{ width: 60, height: 6, background: isDark ? '#555' : '#e5e7eb', borderRadius: 3 }}>
                            <div style={{ width: '80%', height: 6, background: isDark ? '#ccc' : '#666', borderRadius: 3 }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transportation */}
                  <div style={{ 
                    border: isDark ? '2px solid #444' : '2px solid #e5e7eb', 
                    borderRadius: 12, 
                    padding: 20,
                    background: isDark ? '#2a2a2a' : '#fff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: isDark ? '#555' : '#555', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 18,
                        color: '#fff'
                      }}>
                        <Icon name="pin" style={{ fontSize: 18, color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: isDark ? '#ffffff' : '#000' }}>Transportation</div>
                        <div style={{ color: isDark ? '#aaa' : '#666', fontSize: 14 }}>Driver Assignment</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, color: isDark ? '#ddd' : '#000' }}>With Driver</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#000' }}>6/8</span>
                          <div style={{ width: 60, height: 6, background: isDark ? '#555' : '#e5e7eb', borderRadius: 3 }}>
                            <div style={{ width: '75%', height: 6, background: isDark ? '#bbb' : '#777', borderRadius: 3 }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hotel Check-in */}
                  <div style={{ 
                    border: isDark ? '2px solid #444' : '2px solid #e5e7eb', 
                    borderRadius: 12, 
                    padding: 20,
                    background: isDark ? '#2a2a2a' : '#fff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: isDark ? '#666' : '#888', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 18,
                        color: '#fff'
                      }}>
                        <Icon name="hotel" style={{ fontSize: 18, color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: isDark ? '#ffffff' : '#000' }}>Accommodation</div>
                        <div style={{ color: isDark ? '#aaa' : '#666', fontSize: 14 }}>Hotel Check-in</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, color: isDark ? '#ddd' : '#000' }}>Checked In</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#000' }}>5/6</span>
                          <div style={{ width: 60, height: 6, background: isDark ? '#555' : '#e5e7eb', borderRadius: 3 }}>
                            <div style={{ width: '83%', height: 6, background: isDark ? '#aaa' : '#999', borderRadius: 3 }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Live Activity Feed (now below Guest Journey Checkpoints) */}
              <div style={{ ...getGlassStyles(isDark), marginBottom: 32, padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: isDark ? '#fff' : '#222', letterSpacing: 0 }}>Live Activity Feed</h3>
                  <button
                    onClick={() => navigate('/notifications')}
                    title="View all activity"
                    aria-label="View all activity"
                    style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="bell" style={{ fontSize: 18, color: isDark ? '#fff' : '#000' }} />
                  </button>
                </div>
                <div>
                  {activityLoading && (
                    <div style={{ color: isDark ? '#aaa' : '#666' }}>Loading activity…</div>
                  )}
                  {!activityLoading && activityFeed.length === 0 && (
                    <div style={{ color: isDark ? '#aaa' : '#666' }}>No recent activity.</div>
                  )}
                  {activityFeed.slice(0, 15).map((item, idx) => {
                    const ts = new Date(item.created_at).toLocaleString();
                    const friendly = (() => {
                      if (item.item_type === 'message') {
                        return `${item.actor_name || 'Someone'} sent a message…`;
                      }
                      if (item.item_type === 'module_answer') {
                        return `${item.actor_name || 'Participant'} submitted a module response`;
                      }
                      if (item.item_type === 'announcement') {
                        return `Announcement: ${item.title || 'New announcement'}`;
                      }
                      if (item.item_type === 'itinerary') {
                        return `${item.title || 'Itinerary'} updated`;
                      }
                      if (item.item_type === 'form_submission') {
                        return `${item.actor_name || 'Guest'} responded to form`;
                      }
                      return item.title || item.item_type;
                    })();
                    return (
                      <div key={`${item.item_type}-${item.source_id}-${idx}`} style={{ ...activityCardStyle, position: 'relative' }}
                        onClick={() => {
                          const t = item.item_type;
                          if (t === 'message' || t === 'module_answer') navigate('/guest-chat', { state: { eventId: id } });
                          // No navigation for itinerary items as requested
                        }}
                      >
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: isDark ? '#ccc' : '#333', flexShrink: 0 }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: isDark ? '#ffffff' : '#000' }}>{friendly}</div>
                        </div>
                        <div style={{ position: 'absolute', top: 10, right: 14, color: isDark ? '#aaa' : '#666', fontSize: 12 }}>{ts}</div>
                        <div style={{ fontSize: 20 }}>
                          <Icon name={
                            item.item_type === 'announcement' ? 'announcement' : 
                            item.item_type === 'message' ? 'chat' : 
                            item.item_type === 'module_answer' ? 'clipboard' : 
                            item.item_type === 'form_submission' ? 'description' : 
                            'pin'
                          } style={{ fontSize: 18, color: '#fff' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Event Settings */}
              <div style={eventSettingsStyle}>
                <h3 style={{ fontSize: 30, fontWeight: 600, marginBottom: 28 }}>Event Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <button 
                    onClick={() => navigate(`/event/${id}/notification-settings`)}
                    style={{ 
                      ...getGlassStyles(isDark),
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      color: isDark ? '#fff' : '#374151',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d5db',
                      borderRadius: 8, 
                      padding: '16px 20px',
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 500,
                      textAlign: 'left',
                      boxShadow: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                    }}
                  >
                    Notification Settings
                  </button>
                  <button style={{ 
                    ...getGlassStyles(isDark),
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: isDark ? '#fff' : '#374151',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d5db',
                    borderRadius: 8, 
                    padding: '16px 20px',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 500,
                    textAlign: 'left',
                    boxShadow: 'none',
                  }}>
                    Privacy Settings
                  </button>
                  <button style={{ 
                    ...getGlassStyles(isDark),
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: isDark ? '#fff' : '#374151',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d5db',
                    borderRadius: 8, 
                    padding: '16px 20px',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 500,
                    textAlign: 'left',
                    boxShadow: 'none',
                  }}>
                    Data Export
                  </button>
                </div>
                {/* Danger Zone */}
                <div style={{ 
                  marginTop: 32, 
                  padding: 20, 
                  ...getGlassStyles(isDark),
                  background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', 
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: 12 
                }}>
                  <h4 style={{ 
                    color: isDark ? '#fca5a5' : '#dc2626', 
                    marginBottom: 12, 
                    fontSize: 16, 
                    fontWeight: 600 
                  }}>Danger Zone</h4>
                  <p style={{ 
                    color: isDark ? '#fecaca' : '#991b1b', 
                    fontSize: 13, 
                    marginBottom: 16 
                  }}>Deleting this event is permanent and cannot be undone.</p>
            <button
              onClick={handleDeleteEvent}
              style={{
                background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                      color: isDark ? '#fca5a5' : '#dc2626',
                      border: isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                      padding: '12px 20px',
                      fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)';
              }}
            >
              Delete Event
            </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'itineraries' && (
            <div style={{ marginBottom: 64, paddingBottom: 48 }}>
              <h2 style={mainTitleStyle}>Itineraries</h2>

              {/* Top row of controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Select All Button - only show when select mode is active */}
                  {isItinerarySelectModeActive && (
                    <button
                      onClick={() => setShowBulkActionsModal(true)}
                      style={{
                        ...getButtonStyles(isDark, 'secondary'),
                        minWidth: '120px',
                        maxWidth: '140px',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}
                    >
                      Select All
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const newMode = !isItinerarySelectModeActive;
                      setIsItinerarySelectModeActive(newMode);
                      if (!newMode) {
                        setSelectedItineraryIds([]);
                      }
                    }}
                    style={{
                      ...getButtonStyles(isDark, 'secondary'),
                      minWidth: '120px',
                      maxWidth: '140px',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                  >
                    {isItinerarySelectModeActive ? 'Unselect' : 'Select'}
                  </button>
                  <button
                    onClick={handleExportCsv}
                    style={{
                      ...getButtonStyles(isDark, 'secondary'),
                      minWidth: '120px',
                      maxWidth: '140px',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                  >
                    Export CSV
                  </button>
                </div>
                <button
                  onClick={() => navigate(`/event/${id}/itinerary/create`)}
                  style={{
                    ...getButtonStyles(isDark, 'primary'),
                    minWidth: '120px',
                    maxWidth: '180px',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  Create Itinerary
                </button>
              </div>

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
              
              {/* Sort by Date Dropdown */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, gap: 12 }}>
                <button
                  onClick={() => setFiltersItineraryDateSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                  style={{
                    minWidth: '120px',
                    maxWidth: '180px',
                    height: 44,
                    background: isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`,
                    borderRadius: 14,
                    boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.08)',
                    color: isDark ? '#fff' : '#222',
                    fontSize: 16,
                    fontWeight: 600,
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background 0.2s',
                    position: 'relative',
                    zIndex: 2,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {filtersItineraryDateSort === 'asc' ? 'Date Ascending' : 'Date Descending'}
                </button>
              </div>
              
              {/* Selection indicator bar for itineraries */}
              {isItinerarySelectModeActive && selectedItineraryIds.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: '#fee2e2', 
                  padding: '12px 24px', 
                  borderRadius: 8, 
                  marginBottom: 24, 
                  border: '2px solid #fecaca'
                }}>
                  <span style={{fontSize: 16, fontWeight: 500, color: '#b91c1c'}}>{selectedItineraryIds.length} itinerary(s) selected</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => setSelectedItineraryIds([])}
                        style={{ background: '#fff', color: '#000', border: '2px solid #000', borderRadius: '8px', padding: '10px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Unselect
                    </button>
                    <button
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Delete
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {savedItineraries.length === 0 && (
                  <div style={{ 
                    color: isDark ? '#a1a1aa' : '#71717a', 
                    fontSize: 17 
                  }}>No itineraries yet.</div>
                )}
                {/* Render grouped itineraries */}
                {Object.entries(groupedItineraries.groups).map(([groupId, groupItems]) => (
                  <div
                    key={groupId}
                    style={{
                      marginBottom: 32,
                      border: `2px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}`,
                      borderRadius: 16,
                      background: isDark ? 'rgba(40,40,40,0.8)' : 'rgba(245,245,245,0.9)',
                      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                      padding: 24,
                      transition: 'box-shadow 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = isDark
                        ? '0 0 0 4px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.4)'
                        : '0 0 0 4px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = isDark
                        ? '0 2px 8px rgba(0,0,0,0.4)'
                        : '0 2px 8px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
                    }}
                  >
                    <div style={{
                      fontWeight: 700,
                      fontSize: 22,
                      marginBottom: 12,
                      color: isDark ? '#ffffff' : '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <span style={{ background: isDark ? '#666666' : '#333333', color: '#fff', borderRadius: 8, padding: '2px 12px', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>GROUP</span>
                      {groupItems[0].group_name || 'Unnamed Group'}
                      <span style={{ fontSize: 13, color: isDark ? '#cccccc' : '#666666', marginLeft: 8 }}>
                        {groupItems.length} item{groupItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {groupItems.map((it, idx) => (
                        <div key={it.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                          {isItinerarySelectModeActive && (
                            <div style={{ marginRight: 16, display: 'flex', alignItems: 'center', height: '100%' }}>
                              <input
                                type="checkbox"
                                checked={selectedItineraryIds.includes(it.id!)}
                                onChange={() => handleSelectItinerary(it.id!)}
                                style={{
                                  width: 20,
                                  height: 20,
                                  cursor: 'pointer',
                                  accentColor: isDark ? '#ffffff' : '#000000',
                                  verticalAlign: 'middle',
                                }}
                              />
                            </div>
                          )}
                          <div
                            style={{
                              ...getGlassStyles(isDark),
                              padding: '24px 20px',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              border: selectedItineraryIds.includes(it.id!)
                                ? `2px solid ${isDark ? '#ffffff' : '#000000'}`
                                : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                              transition: 'all 0.2s ease',
                              flex: 1,
                            }}
                          >
                          <div style={{ flex: 1, marginLeft: isSelectModeActive ? 40 : 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 12, color: isDark ? '#ffffff' : '#000000' }}>{it.title}</div>
                            <div>
                              {/* Display individual itinerary details */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{
                                  background: isDark 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(0, 0, 0, 0.03)',
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                                  borderRadius: 12,
                                  padding: '16px',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = isDark 
                                    ? 'rgba(255, 255, 255, 0.08)' 
                                    : 'rgba(0, 0, 0, 0.05)';
                                  e.currentTarget.style.transform = 'scale(1.01)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = isDark 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(0, 0, 0, 0.03)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}>
                                  <div style={{ display: 'flex', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 500, fontSize: 16, color: isDark ? '#ffffff' : '#000000' }}>{it.title}</div>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                                    {it.arrival_time && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                        <span style={{ 
                                          fontWeight: 500, 
                                          color: isDark ? '#a1a1aa' : '#71717a' 
                                          }}>Arrival:</span> {formatDateDisplay(it.arrival_time)}
                                      </div>
                                    )}
                                    {it.start_time && it.end_time && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                        <span style={{ 
                                          fontWeight: 500, 
                                          color: isDark ? '#a1a1aa' : '#71717a' 
                                          }}>Time:</span> {formatDateDisplay(it.start_time)} - {formatDateDisplay(it.end_time)}
                                      </div>
                                    )}
                                    {it.date && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                          <span style={{ fontWeight: 500, color: isDark ? '#a1a1aa' : '#71717a', marginRight: 4 }}>Date:</span> {formatDateDisplay(it.date)}
                                      </div>
                                    )}
                                    {it.location && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                        <span style={{ 
                                          fontWeight: 500, 
                                          color: isDark ? '#a1a1aa' : '#71717a' 
                                        }}>Location:</span> {it.location}
                                      </div>
                                    )}
                                  </div>

                                  {it.description && (
                                    <div style={{ 
                                      color: isDark ? '#a1a1aa' : '#71717a', 
                                      fontSize: 14, 
                                      marginBottom: 12 
                                    }}>
                                      {it.description}
                                    </div>
                                  )}

                                  {/* Display active modules */}
                                  {(it.document_file_name || it.qrcode_url || it.contact_name || (it.notification_times && it.notification_times.length > 0)) && (
                                    <div style={{ 
                                      marginTop: 12, 
                                      borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`, 
                                      paddingTop: 12 
                                    }}>
                                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {it.document_file_name && (
                                          <span style={{
                                            background: isDark 
                                              ? 'rgba(255, 255, 255, 0.1)' 
                                              : 'rgba(0, 0, 0, 0.05)',
                                            color: isDark ? '#d1d5db' : '#374151',
                                            padding: '4px 12px',
                                            borderRadius: 12,
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                          }}>
                                            Document Upload
                                          </span>
                                        )}
                                        {it.qrcode_url && (
                                          <span style={{
                                            background: isDark 
                                              ? 'rgba(255, 255, 255, 0.1)' 
                                              : 'rgba(0, 0, 0, 0.05)',
                                            color: isDark ? '#d1d5db' : '#374151',
                                            padding: '4px 12px',
                                            borderRadius: 12,
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                          }}>
                                            QR Code
                                          </span>
                                        )}
                                        {it.contact_name && (
                                          <span style={{
                                            background: isDark 
                                              ? 'rgba(255, 255, 255, 0.1)' 
                                              : 'rgba(0, 0, 0, 0.05)',
                                            color: isDark ? '#d1d5db' : '#374151',
                                            padding: '4px 12px',
                                            borderRadius: 12,
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                          }}>
                                            Host Contact Details
                                          </span>
                                        )}
                                        {it.notification_times && it.notification_times.length > 0 && (
                                          <span style={{
                                            background: isDark 
                                              ? 'rgba(255, 255, 255, 0.1)' 
                                              : 'rgba(0, 0, 0, 0.05)',
                                            color: isDark ? '#d1d5db' : '#374151',
                                            padding: '4px 12px',
                                            borderRadius: 12,
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                          }}>
                                            Notifications Timer
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                          <div style={{ position: 'absolute', top: 8, right: 16, display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button title="Edit" onClick={() => navigate(`/event/${id}/itinerary/edit/${it.id}`)} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="edit" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                            <button title="Duplicate" onClick={() => handleDuplicate(it)} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="duplicate" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                            <button title="Share" onClick={() => { setItineraryToShare(it.id); setShowShareModal(true); }} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="share" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                            <button title="Save as Draft" onClick={() => handleMakeDraft(Number(it.id))} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="saveAsDraft" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                            <button title="Delete" onClick={() => { setItineraryToDelete(it.id); setShowDeleteConfirm(true); }} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="delete" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Render individual itineraries */}
                {groupedItineraries.individuals.map((it, idx) => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                    {isItinerarySelectModeActive && (
                      <div style={{ marginRight: 16, display: 'flex', alignItems: 'center', height: '100%' }}>
                        <input
                          type="checkbox"
                          checked={selectedItineraryIds.includes(it.id!)}
                          onChange={() => handleSelectItinerary(it.id!)}
                          style={{
                            width: 20,
                            height: 20,
                            cursor: 'pointer',
                            accentColor: isDark ? '#ffffff' : '#000000',
                            verticalAlign: 'middle',
                          }}
                        />
                      </div>
                    )}
                    <div
                      style={{
                        ...getGlassStyles(isDark),
                        padding: '24px 20px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        border: selectedItineraryIds.includes(it.id!)
                          ? `2px solid ${isDark ? '#ffffff' : '#000000'}`
                          : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                        transition: 'all 0.2s ease',
                        flex: 1,
                      }}
                    >
                    <div style={{ flex: 1, marginLeft: isSelectModeActive ? 40 : 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 12, color: isDark ? '#ffffff' : '#000000' }}>{it.title}</div>
                      <div>
                        {/* Display individual itinerary details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div style={{
                            background: isDark 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : 'rgba(0, 0, 0, 0.03)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                            borderRadius: 12,
                            padding: '16px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark 
                              ? 'rgba(255, 255, 255, 0.08)' 
                              : 'rgba(0, 0, 0, 0.05)';
                            e.currentTarget.style.transform = 'scale(1.01)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isDark 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : 'rgba(0, 0, 0, 0.03)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}>
                            <div style={{ display: 'flex', marginBottom: 8 }}>
                              <div style={{ fontWeight: 500, fontSize: 16, color: isDark ? '#ffffff' : '#000000' }}>{it.title}</div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                              {it.arrival_time && (
                                <div style={{ 
                                  color: isDark ? '#d1d5db' : '#374151', 
                                  fontSize: 14 
                                }}>
                                  <span style={{ 
                                    fontWeight: 500, 
                                    color: isDark ? '#a1a1aa' : '#71717a' 
                                    }}>Arrival:</span> {formatDateDisplay(it.arrival_time)}
                                </div>
                              )}
                              {it.start_time && it.end_time && (
                                <div style={{ 
                                  color: isDark ? '#d1d5db' : '#374151', 
                                  fontSize: 14 
                                }}>
                                  <span style={{ 
                                    fontWeight: 500, 
                                    color: isDark ? '#a1a1aa' : '#71717a' 
                                    }}>Time:</span> {formatDateDisplay(it.start_time)} - {formatDateDisplay(it.end_time)}
                                </div>
                              )}
                              {it.date && (
                                <div style={{ 
                                  color: isDark ? '#d1d5db' : '#374151', 
                                  fontSize: 14 
                                }}>
                                    <span style={{ fontWeight: 500, color: isDark ? '#a1a1aa' : '#71717a', marginRight: 4 }}>Date:</span> {formatDateDisplay(it.date)}
                                </div>
                              )}
                              {it.location && (
                                <div style={{ 
                                  color: isDark ? '#d1d5db' : '#374151', 
                                  fontSize: 14 
                                }}>
                                  <span style={{ 
                                    fontWeight: 500, 
                                    color: isDark ? '#a1a1aa' : '#71717a' 
                                  }}>Location:</span> {it.location}
                                </div>
                              )}
                            </div>

                            {it.description && (
                              <div style={{ 
                                color: isDark ? '#a1a1aa' : '#71717a', 
                                fontSize: 14, 
                                marginBottom: 12 
                              }}>
                                {it.description}
                              </div>
                            )}

                            {/* Display active modules */}
                            {(it.document_file_name || it.qrcode_url || it.contact_name || (it.notification_times && it.notification_times.length > 0)) && (
                              <div style={{ 
                                marginTop: 12, 
                                borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`, 
                                paddingTop: 12 
                              }}>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {it.document_file_name && (
                                    <span style={{
                                      background: isDark 
                                        ? 'rgba(255, 255, 255, 0.1)' 
                                        : 'rgba(0, 0, 0, 0.05)',
                                      color: isDark ? '#d1d5db' : '#374151',
                                      padding: '4px 12px',
                                      borderRadius: 12,
                                      fontSize: 13,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                    }}>
                                      Document Upload
                                    </span>
                                  )}
                                  {it.qrcode_url && (
                                    <span style={{
                                      background: isDark 
                                        ? 'rgba(255, 255, 255, 0.1)' 
                                        : 'rgba(0, 0, 0, 0.05)',
                                      color: isDark ? '#d1d5db' : '#374151',
                                      padding: '4px 12px',
                                      borderRadius: 12,
                                      fontSize: 13,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                    }}>
                                      QR Code
                                    </span>
                                  )}
                                  {it.contact_name && (
                                    <span style={{
                                      background: isDark 
                                        ? 'rgba(255, 255, 255, 0.1)' 
                                        : 'rgba(0, 0, 0, 0.05)',
                                      color: isDark ? '#d1d5db' : '#374151',
                                      padding: '4px 12px',
                                      borderRadius: 12,
                                      fontSize: 13,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                    }}>
                                      Host Contact Details
                                    </span>
                                  )}
                                  {it.notification_times && it.notification_times.length > 0 && (
                                    <span style={{
                                      background: isDark 
                                        ? 'rgba(255, 255, 255, 0.1)' 
                                        : 'rgba(0, 0, 0, 0.05)',
                                      color: isDark ? '#d1d5db' : '#374151',
                                      padding: '4px 12px',
                                      borderRadius: 12,
                                      fontSize: 13,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                                    }}>
                                      Notifications Timer
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ position: 'absolute', top: 8, right: 16, display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button title="Edit" onClick={() => navigate(`/event/${id}/itinerary/edit/${it.id}`)} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="edit" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                        <button title="Duplicate" onClick={() => handleDuplicate(it)} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="duplicate" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                        <button title="Share" onClick={() => { setItineraryToShare(it.id); setShowShareModal(true); }} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="share" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                        <button title="Save as Draft" onClick={() => handleMakeDraft(Number(it.id))} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="saveAsDraft" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                        <button title="Delete" onClick={() => { setItineraryToDelete(it.id); setShowDeleteConfirm(true); }} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', boxShadow: 'none' }}><Icon name="delete" style={{ fontSize: 16, color: isDark ? '#fff' : '#000' }} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Drafts Section */}
                <div style={{ marginTop: 48, paddingTop: 32, borderTop: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                  <h3 style={mainTitleStyle}>Draft Itineraries</h3>
                  {draftItineraries.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: 16, margin: 24 }}>No drafts yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 24 }}>
                      {draftItineraries.map((draft, draftIdx) => (
                        <div
                          key={draft.id}
                          style={{
                            ...getGlassStyles(isDark),
                            border: `2px dashed ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}`,
                            borderRadius: 16,
                            padding: 28,
                            background: isDark ? 'rgba(40,40,40,0.5)' : 'rgba(245,245,245,0.7)',
                            position: 'relative'
                          }}
                        >
                          {/* Delete button - positioned top right only */}
                          <button
                            onClick={() => {
                              setDraftToDelete(draft.id);
                              setShowDeleteDraftModal(true);
                              setDeleteDraftText('');
                            }}
                            style={{
                              position: 'absolute',
                              top: 12, // move up a bit for bigger button
                              right: 12,
                              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                              color: isDark ? '#fff' : '#222',
                              border: `2px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#bbb'}`,
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              minWidth: 32,
                              minHeight: 32,
                              boxShadow: isDark ? '0 2px 8px #0004' : '0 1px 4px #0001',
                              fontSize: 22,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              lineHeight: 1,
                            }}
                            title="Delete draft"
                          >
                            ×
                          </button>

                          <div style={{ flex: 1, marginLeft: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 12, color: isDark ? '#ffffff' : '#000000' }}>
                              {draft.title || 'Untitled Draft'}
                            </div>
                            <div>
                              {/* Display individual itinerary details */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{
                                  background: isDark 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(0, 0, 0, 0.03)',
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                                  borderRadius: 12,
                                  padding: '16px',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = isDark 
                                    ? 'rgba(255, 255, 255, 0.08)' 
                                    : 'rgba(0, 0, 0, 0.05)';
                                  e.currentTarget.style.transform = 'scale(1.01)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = isDark 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(0, 0, 0, 0.03)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}>
                                  <div style={{ display: 'flex', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 500, fontSize: 16, color: isDark ? '#ffffff' : '#000000' }}>
                                      {draft.title || 'Untitled Draft'}
                                    </div>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                                    {draft.arrival_time && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                        <span style={{ 
                                          fontWeight: 500, 
                                          color: isDark ? '#a1a1aa' : '#71717a' 
                                        }}>Arrival:</span> {formatDateDisplay(draft.arrival_time)}
                                      </div>
                                    )}
                                    {draft.start_time && draft.end_time && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                        <span style={{ 
                                          fontWeight: 500, 
                                          color: isDark ? '#a1a1aa' : '#71717a' 
                                        }}>Time:</span> {formatDateDisplay(draft.start_time)} - {formatDateDisplay(draft.end_time)}
                                      </div>
                                    )}
                                    {draft.date && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                        <span style={{ fontWeight: 500, color: isDark ? '#a1a1aa' : '#71717a', marginRight: 4 }}>Date:</span> {formatDateDisplay(draft.date)}
                                      </div>
                                    )}
                                    {draft.location && (
                                      <div style={{ 
                                        color: isDark ? '#d1d5db' : '#374151', 
                                        fontSize: 14 
                                      }}>
                                        <span style={{ 
                                          fontWeight: 500, 
                                          color: isDark ? '#a1a1aa' : '#71717a' 
                                        }}>Location:</span> {draft.location}
                                      </div>
                                    )}
                                  </div>

                                  {draft.description && (
                                    <div style={{ 
                                      color: isDark ? '#a1a1aa' : '#71717a', 
                                      fontSize: 14, 
                                      marginBottom: 12 
                                    }}>
                                      {draft.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20 }}>
                            <button
                              onClick={() => navigate(`/event/${event?.id}/itinerary/edit/${draft.id}`)}
                              style={{
                                ...getButtonStyles(isDark, 'primary'),
                                fontSize: 14,
                                padding: '8px 16px',
                                minHeight: 36
                              }}
                            >
                              Edit
                            </button>
                            
                            <button
                              onClick={() => {
                                console.log('Publish clicked', draft.id, draft);
                                handlePublishDraft(draft.id);
                              }}
                              style={{
                                ...getButtonStyles(isDark, 'secondary'),
                                fontSize: 14,
                                padding: '8px 16px',
                                minHeight: 36
                              }}
                            >
                              Publish
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guests' && (
            <div style={{ marginBottom: 64, position: 'relative', paddingBottom: 48 }}>
              <h2 style={mainTitleStyle}>Guest List</h2>

              {/* Top row of controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowSendFormModal(true);
                    }}
                    style={guestPageBlackButtonStyle}
                  >
                    Send Form
                  </button>
                  <button onClick={() => navigate(`/event/${id}/add-guests?upload=1`)} style={guestPageWhiteButtonStyle}>
                    Upload .CSV
                  </button>
                  <button onClick={handleDownloadCSVTemplate} style={guestPageWhiteButtonStyle}>
                    Download
                  </button>
                </div>
                <button onClick={() => navigate(`/event/${id}/add-guests`)} style={guestPageBlackButtonStyle}>
                  Add Guests
                </button>
              </div>

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

              {/* Bottom row of controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <input
                    type="text"
                    placeholder="Search Guest"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={guestPageInputStyle}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {isSelectModeActive && (
                    <button onClick={handleSelectAll} style={guestPageWhiteButtonStyle}>
                      {allFilteredSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowFilterPopup(!showFilterPopup)}
                      style={guestPageWhiteButtonStyle}
                    >
                      Filters
                    </button>
                    {showFilterPopup && (
                      <div ref={filterPopupRef} style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, 
                        background: colors.cardBg,
                        borderRadius: 12, 
                        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)', 
                        border: `2px solid ${colors.border}`,
                        zIndex: 10, 
                        width: 380, 
                        padding: 28,
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
                          <h4 style={{margin: 0, fontSize: 18, fontWeight: 600, color: colors.text}}>Filters</h4>
                            <button 
                            onClick={() => setShowFilterPopup(false)} 
                            style={{
                              background: colors.buttonBg, 
                              border: `2px solid ${colors.border}`, 
                              borderRadius: '50%', 
                              width: 32, 
                              height: 32,
                              cursor: 'pointer', 
                              color: colors.text, 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'center', 
                              fontSize: 18
                            }}
                          >&times;</button>
                        </div>
                        <div style={{ display: 'grid', gap: 20 }}>
                          <div>
                            <label style={{ fontWeight: 500, fontSize: 14, color: colors.text, display: 'block', marginBottom: 8 }}>Sort by</label>
                            <CustomDropdown
                              value={filters.sort}
                              onChange={(value) => setFilters(f => ({ ...f, sort: value }))}
                              options={[
                                { value: 'firstName-asc', label: 'First Name (A-Z)' },
                                { value: 'firstName-desc', label: 'First Name (Z-A)' },
                                { value: 'lastName-asc', label: 'Last Name (A-Z)' },
                                { value: 'lastName-desc', label: 'Last Name (Z-A)' },
                                { value: 'countryCode-asc', label: 'Nationality (A-Z)' },
                                { value: 'countryCode-desc', label: 'Nationality (Z-A)' }
                              ]}
                              colors={colors}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, fontSize: 14, color: colors.text, display: 'block', marginBottom: 8 }}>Age Range</label>
                            <div style={{display: 'flex', gap: 12}}>
                                <input 
                                  type="number" 
                                  placeholder="Min" 
                                  value={filters.ageRange.min} 
                                  onChange={(e) => setFilters(f => ({ ...f, ageRange: { ...f.ageRange, min: e.target.value } }))} 
                                  style={{
                                    width: '100%', 
                                    padding: '10px 14px', 
                                    borderRadius: 8, 
                                    border: `2px solid ${colors.border}`, 
                                    fontSize: 16, 
                                    background: colors.inputBg, 
                                    color: colors.text,
                                    height: 44
                                  }} 
                                />
                                <input 
                                  type="number" 
                                  placeholder="Max" 
                                  value={filters.ageRange.max} 
                                  onChange={(e) => setFilters(f => ({ ...f, ageRange: { ...f.ageRange, max: e.target.value } }))} 
                                  style={{
                                    width: '100%', 
                                    padding: '10px 14px', 
                                    borderRadius: 8, 
                                    border: `2px solid ${colors.border}`, 
                                    fontSize: 16, 
                                    background: colors.inputBg, 
                                    color: colors.text,
                                    height: 44
                                  }} 
                                />
                            </div>
                          </div>
                          {[
                            {key: 'nationality', label: 'Nationality', options: [...new Set(guests.map(g => g.countryCode).filter(Boolean))]},
                            {key: 'gender', label: 'Gender', options: [...new Set(guests.map(g => g.gender).filter(Boolean))]},
                            {key: 'idType', label: 'ID Type', options: [...new Set(guests.map(g => g.idType).filter(Boolean))]},
                          ].map(filter => (
                            <div key={filter.key}>
                              <label style={{ fontWeight: 500, fontSize: 14, color: colors.text, display: 'block', marginBottom: 8 }}>{filter.label}</label>
                              <CustomDropdown
                                value={(filters as any)[filter.key]}
                                onChange={(value) => setFilters(f => ({ ...f, [filter.key]: value }))}
                                options={[
                                  { value: 'all', label: 'All' },
                                  ...filter.options.map(opt => ({ value: opt, label: opt }))
                                ]}
                                colors={colors}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{borderTop: `2px solid ${colors.border}`, marginTop: 24, paddingTop: 20, display: 'flex', justifyContent: 'space-between', gap: 12}}>
                            <button
                              onClick={() => {
                                  setFilters({ sort: 'firstName-asc', group: 'all', nationality: 'all', gender: 'all', idType: 'all', ageRange: { min: '', max: '' } });
                                  setSearchQuery('');
                              }}
                              style={{
                                  width: '100%', 
                                  padding: '12px', 
                                  background: colors.buttonBg, 
                                  border: `2px solid ${colors.border}`,
                                  borderRadius: 8, 
                                  color: colors.text, 
                                  fontWeight: 600, 
                                  cursor: 'pointer', 
                                  fontSize: 16
                              }}
                          >
                              Clear
                          </button>
                          <button
                              onClick={() => setShowFilterPopup(false)}
                              style={{
                                  width: '100%', 
                                  padding: '12px', 
                                  background: colors.accent, 
                                  color: isDark ? '#000000' : '#ffffff', 
                                  border: `2px solid ${colors.accent}`,
                                  borderRadius: 8, 
                                  fontWeight: 600, 
                                  cursor: 'pointer', 
                                  fontSize: 16
                              }}
                          >
                              Apply Filters
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const newMode = !isSelectModeActive;
                      setIsSelectModeActive(newMode);
                      if (!newMode) {
                        setSelectedGuestIds([]);
                      }
                    }}
                    style={guestPageWhiteButtonStyle}
                  >
                    {isSelectModeActive ? 'Unselect' : 'Select'}
                  </button>
                </div>
              </div>

              {isSelectModeActive && selectedGuestIds.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: '#fee2e2', 
                  padding: '12px 24px', 
                  borderRadius: 8, 
                  marginBottom: 24, 
                  border: '2px solid #fecaca'
                }}>
                  <span style={{fontSize: 16, fontWeight: 500, color: '#b91c1c'}}>{selectedGuestIds.length} guest(s) selected</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => setSelectedGuestIds([])}
                        style={{ background: '#fff', color: '#000', border: '2px solid #000', borderRadius: '8px', padding: '10px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Unselect
                    </button>
                    <button
                        onClick={() => setShowGuestDeleteConfirm(true)}
                        style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Delete
                    </button>
                  </div>
                </div>
              )}

              {showGuestDeleteConfirm && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000
                }}>
                  <div style={{
                    ...getGlassStyles(isDark),
                    padding: 32,
                    minWidth: 400,
                    maxWidth: 500
                  }}>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 600, 
                      marginBottom: 8, 
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <span style={{ fontSize: 28 }}>🗑️</span>
                      Delete Guests
                    </div>
                    <div style={{ 
                      fontSize: 16, 
                      color: isDark ? '#a1a1aa' : '#71717a', 
                      marginBottom: 24,
                      lineHeight: 1.5
                    }}>
                      Are you sure you want to permanently delete <strong>{selectedGuestIds.length}</strong> selected guest{selectedGuestIds.length > 1 ? 's' : ''}? This action cannot be undone.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                      <button
                        onClick={() => setShowGuestDeleteConfirm(false)}
                        style={{
                          ...getButtonStyles(isDark, 'secondary'),
                          padding: '12px 24px',
                          fontSize: 16
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteSelectedGuests}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: 12,
                          fontSize: 16,
                          fontWeight: 600,
                          cursor: 'pointer',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        Delete Guest{selectedGuestIds.length > 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const grouped = filteredGuests.reduce((acc: any, guest) => {
                  if (guest.groupId && guest.groupName) {
                    if (!acc.groups[guest.groupName]) {
                      acc.groups[guest.groupName] = { groupId: guest.groupId, guests: [] };
                    }
                    acc.groups[guest.groupName].guests.push(guest);
                  } else {
                    acc.individuals.push(guest);
                  }
                  return acc;
                }, { individuals: [], groups: {} });

                return (
                  <>
                    {Object.entries(grouped.groups as Record<string, { groupId: string; guests: GuestType[] }>).map(([groupName, { groupId, guests: groupGuests }]) => (
                       <div key={groupId} style={{ 
                         ...getGlassStyles(isDark),
                         border: '2px solid #e5e7eb', borderRadius: 16, marginBottom: 24, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                       }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {isSelectModeActive && (
                              <input 
                                type="checkbox" 
                                style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#4f46e5' }}
                                checked={groupGuests.length > 0 && groupGuests.every((g: GuestType) => selectedGuestIds.includes(g.id))}
                                onChange={() => handleSelectGroup(groupId)}
                              />
                            )}
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{groupName}</h3>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, background: '#f3f4f6', padding: '4px 10px', borderRadius: '99px' }}>{groupGuests.length} guests</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                          {groupGuests.map((guest: GuestType) => (
                            <GuestCard key={guest.id} guest={guest} isSelected={selectedGuestIds.includes(guest.id)} onSelect={handleSelectGuest} isSelectModeActive={isSelectModeActive} />
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {grouped.individuals.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {grouped.individuals.map((guest: GuestType) => (
                          <GuestCard key={guest.id} guest={guest} isSelected={selectedGuestIds.includes(guest.id)} onSelect={handleSelectGuest} standalone isSelectModeActive={isSelectModeActive} />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
              
              <p style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>* All modules are optional add-ons</p>
            </div>
          )}

          {activeTab === 'addons' && (
            <div style={{ marginBottom: 64, position: 'relative', paddingBottom: 48 }}>
              <h2 style={mainTitleStyle}>Add Ons</h2>
              <div
                style={{
                  border: '2px dashed #888',
                  borderRadius: 16,
                  minHeight: 100,
                  padding: 32,
                  marginBottom: 32,
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  fontSize: 18,
                  fontWeight: 500,
                  textAlign: 'center',
                  transition: 'background 0.2s, border 0.2s',
                  cursor: 'copy',
                }}
                onDrop={e => handleModuleDrop(e, 'addons')}
                onDragOver={e => e.preventDefault()}
              >
                Drag add-ons from the right to activate them for this event.
              </div>
              <button
                onClick={handleSaveAddOns}
                disabled={isSavingAddOns}
                style={{
                  margin: '0 auto 24px auto',
                  display: 'block',
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: isDark ? '#fff' : '#000',
                  color: isDark ? '#000' : '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  border: '1.5px solid',
                  borderColor: isDark ? '#444' : '#bbb',
                  cursor: isSavingAddOns ? 'not-allowed' : 'pointer',
                  opacity: isSavingAddOns ? 0.7 : 1,
                  width: '150px',
                  transition: 'all 0.2s',
                }}
              >
                {isSavingAddOns ? 'Saving...' : 'Save Add-Ons'}
              </button>
              {saveAddOnsMessage && (
                <div style={{ textAlign: 'center', color: isDark ? '#22c55e' : '#16a34a', marginBottom: 16, fontWeight: 600 }}>{saveAddOnsMessage}</div>
              )}
              {activeModules.addons && activeModules.addons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 100, marginBottom: 24 }}>
                  {activeModules.addons.map((module, idx) => {
                    const moduleInfo = DASHBOARD_MODULES.addons.find(m => m.key === module.name || m.key === module.id);
                    if (!moduleInfo) return null;
                    return (
                      <AddOnCard
                        key={module.id}
                        title={moduleInfo.label}
                        description={moduleInfo.description}
                        icon={moduleInfo.icon}
                        onDelete={() => handleDeleteAddOn(module.name || module.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            ...getGlassStyles(isDark),
            padding: 32,
            minWidth: 400,
            maxWidth: 500
          }}>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 600, 
              marginBottom: 8, 
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              Delete Itinerary
            </div>
            <div style={{ 
              fontSize: 16, 
              color: isDark ? '#a1a1aa' : '#71717a', 
              marginBottom: 24,
              lineHeight: 1.5
            }}>
              Are you sure you want to permanently delete this itinerary? This action cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItineraryToDelete(null);
                }}
                style={{
                  ...getButtonStyles(isDark, 'secondary'),
                  padding: '12px 24px',
                  fontSize: 16
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSingle}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            ...getGlassStyles(isDark),
            padding: 32,
            minWidth: 450,
            maxWidth: 550
          }}>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 600, 
              marginBottom: 8, 
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 28 }}>🗑️</span>
              Delete All Selected Itineraries
            </div>
            <div style={{ 
              fontSize: 16, 
              color: isDark ? '#a1a1aa' : '#71717a', 
              marginBottom: 24,
              lineHeight: 1.5
            }}>
              You are about to permanently delete <strong>{selectedItineraryIds.length}</strong> itineraries. 
              This action cannot be undone. Type <strong>"delete all"</strong> to confirm.
            </div>
            <input
              type="text"
              value={bulkDeleteText}
              onChange={(e) => setBulkDeleteText(e.target.value)}
              placeholder="Type 'delete all' to confirm"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 16,
                borderRadius: 12,
                border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                background: isDark 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.02)',
                color: isDark ? '#ffffff' : '#000000',
                marginBottom: 24,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
              <button
                onClick={() => {
                  setShowBulkDeleteConfirm(false);
                  setBulkDeleteText('');
                }}
                style={{
                  ...getButtonStyles(isDark, 'secondary'),
                  padding: '12px 24px',
                  fontSize: 16
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllItineraries}
                disabled={bulkDeleteText !== 'delete all'}
                style={{
                  background: bulkDeleteText === 'delete all' 
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : isDark 
                      ? 'rgba(239, 68, 68, 0.3)' 
                      : 'rgba(239, 68, 68, 0.2)',
                  color: bulkDeleteText === 'delete all' ? '#ffffff' : '#a1a1aa',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: bulkDeleteText === 'delete all' ? 'pointer' : 'not-allowed',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease'
                }}
              >
                Delete All ({selectedItineraryIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (() => {
        const itineraryDetails = itineraryToShare !== null ? savedItineraries.find(it => it.id === itineraryToShare) : null;
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2000
          }}>
            <div style={{
              background: isDark ? '#2a2a2a' : '#fff', 
              borderRadius: 16, 
              padding: '0',
              width: '100%', 
              maxWidth: 560, 
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              display: 'flex', 
              flexDirection: 'column', 
              maxHeight: '80vh',
              border: isDark ? '1px solid #444' : 'none'
            }}>
              <div style={{ 
                padding: '24px 32px', 
                borderBottom: isDark ? '2px solid #444' : '2px solid #eee' 
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 22, 
                  fontWeight: 600,
                  color: isDark ? '#fff' : '#000'
                }}>Share Itinerary</h3>
                {itineraryDetails && <p style={{ 
                  margin: '4px 0 0', 
                  color: isDark ? '#aaa' : '#666' 
                }}>for "{itineraryDetails.title}"</p>}
              </div>

              <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input
                    type="text"
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or group..."
                    style={{
                      width: '100%', padding: '12px 16px', fontSize: 16,
                      borderRadius: 8, border: '2px solid #ddd', boxSizing: 'border-box'
                    }}
                  />
                  {shareSearchQuery && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#fff', border: '2px solid #ddd', borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
                      maxHeight: 250, overflowY: 'auto', marginTop: 4
                    }}>
                      {shareSearchResults.guests.length === 0 && shareSearchResults.groups.length === 0 ? (
                        <div style={{ padding: '12px 16px', color: '#888' }}>No results found.</div>
                      ) : (
                        <>
                          {shareSearchResults.groups.map(group => (
                            <div key={group.groupId} onClick={() => handleAddRecipient(group)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '2px solid #eee' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                              <div style={{ fontWeight: 600 }}>{group.name}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>Group • {group.guests.length} members</div>
                            </div>
                          ))}
                          {shareSearchResults.guests.map(guest => (
                            <div key={guest.id} onClick={() => handleAddRecipient(guest)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '2px solid #eee' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                              <div style={{ fontWeight: 500 }}>{guest.firstName} {guest.lastName}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{guest.email}</div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shareRecipients.length > 0 ? (
                    shareRecipients.map(recipient => (
                      <div key={recipient.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#f8f9fa', padding: '8px 12px', borderRadius: 8
                      }}>
                        <span style={{ fontWeight: 500 }}>{recipient.firstName} {recipient.lastName}</span>
                        <button onClick={() => handleRemoveRecipient(recipient.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888', padding: 4 }}>&times;</button>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: '#aaa', padding: '32px 0' }}>Recipients will appear here.</div>
                  )}
                </div>
              </div>

              <div style={{ padding: '24px 32px', borderTop: '2px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setItineraryToShare(null);
                    setShareRecipients([]);
                    setShareSearchQuery('');
                  }}
                  style={{
                    background: '#eee', border: 'none', padding: '10px 24px', borderRadius: 8,
                    fontSize: 16, cursor: 'pointer', color: '#222', fontWeight: 500
                  }}
                >Cancel</button>
                <button
                  onClick={handleSendItinerary}
                  disabled={shareRecipients.length === 0}
                  style={{
                    background: shareRecipients.length > 0 ? '#222' : '#ccc',
                    color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8,
                    fontSize: 16, cursor: shareRecipients.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 500
                  }}
                >Send</button>
              </div>
            </div>
          </div>
        )
      })()}

      {showSendFormModal ? (
        <SendFormModal
          isOpen={true}
          onClose={handleCloseModal}
          eventId={event?.id || ''}
          eventName={event?.name || ''}
        />
      ) : null}

      {/* Delete Event Confirmation Modal */}
      {showDeleteEventModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: isDark ? '#232323' : '#fff',
            borderRadius: 12,
            padding: 32,
            minWidth: 640,
            maxWidth: 720,
            textAlign: 'center',
            color: isDark ? '#fff' : '#222',
            border: isDark ? '1px solid #444' : 'none'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#ef4444', fontWeight: 'bold' }}>!</div>
            <h2 style={{ margin: 0, marginBottom: 16, fontSize: 24, fontWeight: 600 }}>Delete Event</h2>
            <p style={{ color: isDark ? '#bbb' : '#666', marginBottom: 24 }}>This action cannot be undone. All event data, guests, and configurations will be permanently deleted.</p>
            <p style={{ color: isDark ? '#bbb' : '#666', marginBottom: 24 }}>Type <strong>delete</strong> to confirm:</p>
              <input
                type="text"
                value={deleteEventText}
                onChange={(e) => setDeleteEventText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                style={{
                  width: '100%',
                  padding: 12,
                  border: isDark ? '2px solid #444' : '2px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 16,
                  marginBottom: 24,
                  textAlign: 'center',
                  background: isDark ? '#18181b' : '#fff',
                  color: isDark ? '#fff' : '#222'
                }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => {
                  setShowDeleteEventModal(false);
                  setDeleteEventText('');
                }}
                style={{
                  background: isDark ? '#18181b' : '#f5f5f5',
                  color: isDark ? '#fff' : '#222',
                  fontWeight: 500,
                  fontSize: 18,
                  border: isDark ? '2px solid #444' : '2px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '12px 40px',
                  minWidth: 160,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? '#232323' : '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? '#18181b' : '#f5f5f5';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => navigate(`/export-report/${id}`)}
                style={{
                  background: isDark ? '#0b3b2e' : '#e6fffa',
                  color: isDark ? '#a7f3d0' : '#065f46',
                  fontWeight: 500,
                  fontSize: 18,
                  border: isDark ? '2px solid #065f46' : '2px solid #99f6e4',
                  borderRadius: 8,
                  padding: '12px 40px',
                  minWidth: 160,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Export Data
              </button>
              <button
                onClick={async () => {
                  if (deleteEventText !== 'delete') return;
                  try {
                    await purgeEvent(id!);
                    setShowDeleteEventModal(false);
                    setDeleteEventText('');
                    navigate('/');
                  } catch (e) {
                    console.error('Purge failed', e);
                    alert('Failed to delete event completely. Check console for details.');
                  }
                }}
                disabled={deleteEventText !== 'delete'}
                style={{
                  background: deleteEventText === 'delete' ? '#ef4444' : (isDark ? '#3a3a3a' : '#fca5a5'),
                  color: '#fff',
                  fontWeight: 500,
                  fontSize: 18,
                  border: 'none',
                  borderRadius: 8,
                  padding: '13px 44px',
                  minWidth: 160,
                  whiteSpace: 'nowrap',
                  cursor: deleteEventText === 'delete' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (deleteEventText === 'delete') {
                    e.currentTarget.style.background = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (deleteEventText === 'delete') {
                    e.currentTarget.style.background = '#ef4444';
                  }
                }}
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {showCsvExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: '280px', // Account for sidebar width
        }}>
          <div style={{
            background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 16,
            minWidth: 700,
            maxWidth: '90vw',
            maxHeight: '80vh',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            color: isDark ? '#fff' : '#222',
            border: isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '32px 32px 0 32px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>Preview Itinerary CSV Export</div>
            </div>
            
            {/* Scrollable Content */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '0 32px',
              maxHeight: 'calc(80vh - 140px)' // Account for header and footer
            }}>
              <div style={{ overflowX: 'auto', marginBottom: 24, maxWidth: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800, maxWidth: 1200 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Title</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Description</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Date</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Arrival Time</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Start Time</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>End Time</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Location</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Group Name</th>
                      <th style={{ padding: 8, borderBottom: '2px solid #ddd', background: isDark ? '#23234a' : '#f3f4f6', color: isDark ? '#fff' : '#222', fontWeight: 700, textAlign: 'left' }}>Group ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedItineraries.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.title}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.description}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.date}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.arrival_time}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.start_time}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.end_time}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.location}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.group_name}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'left' }}>{it.group_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Footer with buttons - always visible */}
            <div style={{ 
              padding: '24px 32px 32px 32px', 
              borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 16 
            }}>
              <button
                onClick={() => setShowCsvExportModal(false)}
                style={{
                  ...getButtonStyles(isDark, 'secondary'),
                  minWidth: 120,
                  fontSize: 16
                }}
              >
                Cancel
              </button>
              <button
                onClick={downloadCsv}
                style={{
                  padding: '12px 24px',
                  background: isDark ? '#ffffff' : '#000000',
                  color: isDark ? '#000000' : '#ffffff',
                  border: `2px solid ${isDark ? '#ffffff' : '#000000'}`,
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.2s ease',
                  minWidth: 120,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Notification */}
      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#10b981',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10002,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 16,
          fontWeight: 500
        }}>
          <span style={{ fontSize: 18 }}>✓</span>
          {successMessage}
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkActionsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            ...getGlassStyles(isDark),
            padding: 40,
            minWidth: 420,
            maxWidth: 520,
            borderRadius: 20,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.28)' : '0 8px 32px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: isDark ? '#fff' : '#222' }}>Bulk Actions</div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button
                onClick={async () => {
                  // Duplicate all selected itineraries
                  const duplicated: any[] = [];
                  for (const it of savedItineraries) {
                    const newIt = await handleDuplicate(it);
                    if (newIt) duplicated.push(newIt);
                  }
                  setLastBulkAction({ action: 'duplicate', affected: duplicated });
                  setShowBulkActionsModal(false);
                }}
                style={{ ...getButtonStyles(isDark, 'primary'), width: '100%', fontSize: 17 }}
              >
                Duplicate All
              </button>
              <button
                onClick={() => {
                  // Share all selected itineraries (open share modal for all)
                  // You may want to implement a custom share modal for all, or call your existing share logic
                  // For now, just close the modal
                  setShowBulkActionsModal(false);
                  setShowShareModal(true);
                  setItineraryToShare(null); // null means share all
                }}
                style={{ ...getButtonStyles(isDark, 'secondary'), width: '100%', fontSize: 17 }}
              >
                Share All
              </button>
              <button
                onClick={async () => {
                  // Save all as draft
                  const drafted: any[] = [];
                  for (const it of savedItineraries) {
                    await handleMakeDraft(Number(it.id));
                    drafted.push(it);
                  }
                  setLastBulkAction({ action: 'draft', affected: drafted });
                  setShowBulkActionsModal(false);
                }}
                style={{ ...getButtonStyles(isDark, 'secondary'), width: '100%', fontSize: 17 }}
              >
                Save All as Draft
              </button>
              <button
                onClick={async () => {
                  // Delete all
                  const deleted: any[] = [];
                  for (const it of savedItineraries) {
                    await deleteItinerary(it.id);
                    deleted.push(it);
                  }
                  await refetchItineraries();
                  setLastBulkAction({ action: 'delete', affected: deleted });
                  setShowBulkActionsModal(false);
                }}
                style={{
                  ...getButtonStyles(isDark, 'secondary'),
                  width: '100%',
                  fontSize: 17,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                Delete All
              </button>
            </div>
            <button
              onClick={handleUndoLast}
              disabled={!lastBulkAction}
              style={{
                ...getButtonStyles(isDark, 'secondary'),
                width: '100%',
                fontSize: 17,
                opacity: lastBulkAction ? 1 : 0.5,
                cursor: lastBulkAction ? 'pointer' : 'not-allowed',
                marginBottom: 8
              }}
            >
              Undo Last
            </button>
            {undoMessage && (
              <div style={{
                marginTop: 12,
                color: isDark ? '#22c55e' : '#16a34a',
                fontWeight: 600,
                textAlign: 'center',
                fontSize: 16
              }}>{undoMessage}</div>
            )}
            <button
              onClick={() => setShowBulkActionsModal(false)}
              style={{
                marginTop: 16,
                ...getButtonStyles(isDark, 'secondary'),
                width: '100%',
                fontSize: 17
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      {showDeleteDraftModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            ...getGlassStyles(isDark),
            padding: 32,
            borderRadius: 16,
            maxWidth: 400,
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: 24,
              fontWeight: 600,
              margin: '0 0 16px 0',
              color: colors.text
            }}>
              Delete Draft
            </h3>
            <p style={{
              fontSize: 16,
              color: colors.textSecondary,
              margin: '0 0 24px 0',
              lineHeight: 1.5
            }}>
              Are you sure you want to delete this draft? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowDeleteDraftModal(false);
                  setDraftToDelete(null);
                }}
                style={{
                  ...getButtonStyles(isDark, 'secondary'),
                  fontSize: 16,
                  padding: '12px 24px',
                  minWidth: 100
                }}
              >
                Close
              </button>
              <button
                onClick={handleDeleteDraft}
                style={{
                  ...getButtonStyles(isDark, 'primary'),
                  fontSize: 16,
                  padding: '12px 24px',
                  minWidth: 100,
                  background: isDark ? '#ef4444' : '#dc2626',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal - now at the end of the return for proper stacking and matching CreateEventPage UI */}
      {showEditEventModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            width: '100%',
            maxWidth: '900px',
            ...getGlassStyles(isDark),
            padding: '40px',
            position: 'relative',
            boxShadow: isDark 
              ? 'inset 0 2px 8px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' 
              : 'inset 0 2px 8px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.1)',
          }}>
            <EventForm
              mode="edit"
              initialValues={editEventData}
              isDark={isDark}
              colors={colors}
              onCancel={() => setShowEditEventModal(false)}
              onSubmit={async (values) => {
                setEditEventLoading(true);
                try {
                  if (!currentEvent) {
                    alert('No event selected.');
                    setEditEventLoading(false);
                    return;
                  }
                  
                  // Update event details
                  const updatedEvent = {
                    ...currentEvent,
                    name: values.name,
                    from: values.from,
                    to: values.to,
                    start_time: values.startTime,
                    end_time: values.endTime,
                    description: values.description,
                    location: values.location,
                    time_zone: values.timeZone
                  };
                  await updateEvent(currentEvent.id, updatedEvent);
                  
                  // Handle team assignments
                  if (values.teamIds && values.teamIds.length > 0) {
                    try {
                      // Get current user for assignment
                      const currentUser = await getCurrentUser();
                      if (currentUser) {
                        // Assign each selected team to the event
                        for (const teamId of values.teamIds) {
                          await assignTeamToEvent(teamId, currentEvent.id, currentUser.id);
                        }
                        console.log(`Successfully assigned ${values.teamIds.length} team(s) to event`);
                      }
                    } catch (error) {
                      console.error('Error assigning teams to event:', error);
                      // Don't fail the event update, just log the error
                    }
                  }
                  
                  setShowEditEventModal(false);
                  showSuccess('Event updated successfully!');
                  window.location.reload();
                } catch (error) {
                  console.error('Error updating event:', error);
                  alert('Error updating event. Please try again.');
                } finally {
                  setEditEventLoading(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        eventId={event?.id || ''}
        onSuccess={() => {
          showSuccess('Announcement sent successfully!');
        }}
      />
    </div>
  );
}
