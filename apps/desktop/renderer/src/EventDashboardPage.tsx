import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { ModulesPage } from './pages/ModulesPage';
import Icon from './Icon';
import { ThemeContext } from './ThemeContext';

console.log("THIS IS EVENT DASHBOARD PAGE");

type EventType = {
  id: string;
  name: string;
  from: string;
  to: string;
  status: string;
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
    { key: 'flightTracker', label: 'Flight Tracker', type: 'service', description: 'Real-time flight status tracking', icon: 'flight' },
    { key: 'safetyBeacon', label: 'Safety SOS', type: 'service', description: 'Emergency alert system for guests', icon: '🆘' },
    { key: 'gpsTracking', label: 'GPS Tracking', type: 'service', description: 'Track logistics team location', icon: 'pin' },
    { key: 'eventUpdates', label: 'Event Updates', type: 'service', description: 'Live event status notifications', icon: '🔔' },
    { key: 'hotelBooking', label: 'Hotel Manager', type: 'service', description: 'Hotel reservation tracking', icon: 'hotel' }
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

export default function EventDashboardPage({ events }: { events: EventType[] }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const event = events.find(e => e.id === id);
  const [showModules, setShowModules] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'dashboard';
  });
  const [itineraryToDelete, setItineraryToDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [savedItineraries, setSavedItineraries] = useState<{ title: string; items: any[] }[]>([]);
  const [draftItineraries, setDraftItineraries] = useState<{ title: string; items: any[] }[]>([]);
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
    safety: []
  });
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // Share Itinerary State
  const [showShareModal, setShowShareModal] = useState(false);
  const [itineraryToShare, setItineraryToShare] = useState<number | null>(null);
  const [shareRecipients, setShareRecipients] = useState<GuestType[]>([]);
  const [shareSearchQuery, setShareSearchQuery] = useState('');

  // New state for guest selection
  const [guests, setGuests] = useState<GuestType[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showGuestDeleteConfirm, setShowGuestDeleteConfirm] = useState(false);
  const [isSelectModeActive, setIsSelectModeActive] = useState(false);
  
  // State for Send Form modal
  const [showSendFormModal, setShowSendFormModal] = useState(false);
  const [sendFormRecipients, setSendFormRecipients] = useState<string[]>([]);
  const [currentEmailInput, setCurrentEmailInput] = useState('');
  
  // State for delete event modal
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [deleteEventText, setDeleteEventText] = useState('');
  
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
  const [modalView, setModalView] = useState('recipients');
  const [formFields, setFormFields] = useState([
    { key: 'prefix', label: 'Prefix', enabled: true },
    { key: 'gender', label: 'Gender', enabled: true },
    { key: 'firstName', label: 'First Name', enabled: true, required: true },
    { key: 'middleName', label: 'Middle Name', enabled: true },
    { key: 'lastName', label: 'Last Name', enabled: true, required: true },
    { key: 'dob', label: 'Date of Birth', enabled: true },
    { key: 'countryCode', label: 'Contact Number', enabled: true, required: true },
    { key: 'email', label: 'Email', enabled: true, required: true },
    { key: 'idType', label: 'ID Type', enabled: true, required: true },
    { key: 'idNumber', label: 'ID Number', enabled: true, required: true },
    { key: 'idCountry', label: 'Country of Origin', enabled: true },
    { key: 'nextOfKinName', label: 'Next of Kin Name', enabled: true },
    { key: 'nextOfKinEmail', label: 'Next of Kin Email', enabled: true },
    { key: 'nextOfKinPhone', label: 'Next of Kin Phone', enabled: true },
    { key: 'dietary', label: 'Dietary Requirements', enabled: true },
    { key: 'disabilities', label: 'Disabilities/Accessibility', enabled: true },
  ]);

  const [formModules, setFormModules] = useState([
    { key: 'flightNumber', label: 'Flight Tracker', enabled: false },
    { key: 'seatNumber', label: 'Seat Number', enabled: false },
    { key: 'eventReference', label: 'Event Reference', enabled: false },
    { key: 'hotelReservation', label: 'Hotel Reservation', enabled: false },
    { key: 'trainBookingNumber', label: 'Train Booking Number', enabled: false },
    { key: 'coachBookingNumber', label: 'Coach Booking Number', enabled: false },
    { key: 'idUpload', label: 'ID Upload', enabled: false },
  ]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const [sendState, setSendState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState('');

  const { id: eventId } = useParams();
  const currentEvent = events.find(e => e.id === eventId);

  // When the modal is closed, reset the state
  const handleCloseModal = () => {
    setShowSendFormModal(false);
    // Add a small delay to allow the modal to animate out before resetting state
    setTimeout(() => {
      setSendState('idle');
      setModalView('recipients');
      setSendFormRecipients([]);
      setSendError('');
    }, 300);
  };

  const handleSendForm = async () => {
    setSendState('sending');
    setSendError('');

    const enabledFields = formFields.filter(f => f.enabled).map(f => f.key);
    const enabledModules = formModules.filter(m => m.enabled).map(m => m.key);

    const queryParams = new URLSearchParams({
      fields: enabledFields.join(','),
      modules: enabledModules.join(','),
    }).toString();
    
    // Use the production URL or localhost for development
    const baseUrl = window.location.origin;
    const generatedLink = `${baseUrl}/form/fill/${eventId}?${queryParams}`;

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: sendFormRecipients,
          link: generatedLink,
          eventName: currentEvent?.name || 'Your Event',
        }),
      });

      if (!response.ok) {
        let errorDetails = `The server returned an error (Status: ${response.status}).`;
        try {
          // Attempt to parse a JSON error response from the server
          const errorData = await response.json();
          errorDetails = errorData.error || JSON.stringify(errorData);
        } catch (e) {
          // If the response isn't JSON, it's almost certainly a server config issue.
          errorDetails = "The backend API did not respond correctly. This is likely a local development server configuration issue where API routes are not being handled. Make sure the backend server is running and properly configured.";
        }
        throw new Error(errorDetails);
      }

      setSendState('success');

    } catch (error) {
      setSendState('error');
      setSendError(error instanceof Error ? error.message : String(error));
      console.error("Failed to send emails:", error);
    }
  };

  const handleCheckboxChange = (index: number, type: 'fields' | 'modules') => {
    if (type === 'fields') {
      const newFields = [...formFields];
      newFields[index].enabled = !newFields[index].enabled;
      setFormFields(newFields);
    } else {
      const newModules = [...formModules];
      newModules[index].enabled = !newModules[index].enabled;
      setFormModules(newModules);
    }
  };

  const handleAddEmailOnKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && currentEmailInput) {
      e.preventDefault();
      const newEmail = currentEmailInput.trim().replace(/,/g, '');
      if (newEmail && /^\S+@\S+\.\S+$/.test(newEmail) && !sendFormRecipients.includes(newEmail)) {
        setSendFormRecipients([...sendFormRecipients, newEmail]);
      }
      setCurrentEmailInput('');
    } else if (e.key === 'Backspace' && !currentEmailInput && sendFormRecipients.length > 0) {
      setSendFormRecipients(current => current.slice(0, -1));
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const emails = text.split(/[\n,]+/).map(e => e.trim()).filter(e => e && /^\S+@\S+\.\S+$/.test(e));
        const newEmails = [...new Set([...sendFormRecipients, ...emails])];
        setSendFormRecipients(newEmails);
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (!event?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`event_itineraries_${event.id}`) || '[]');
      const drafts = JSON.parse(localStorage.getItem(`event_itinerary_drafts_${event.id}`) || '[]');
      setSavedItineraries(saved);
      setDraftItineraries(drafts);

      // Load guests
      const savedGuests = JSON.parse(localStorage.getItem(`event_guests_${event.id}`) || '[]');
      setGuests(savedGuests);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [event?.id]);

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
    const params = new URLSearchParams(location.search);
    if (activeTab !== 'itineraries') {
      params.set('tab', activeTab);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    } else {
      params.delete('tab');
      const search = params.toString();
      navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true });
    }
  }, [activeTab, location.pathname, navigate]);

  useEffect(() => {
    if (!event) return;
    const savedModules = localStorage.getItem(`event_modules_${event.id}`);
    if (savedModules) {
      setActiveModules(JSON.parse(savedModules));
    }
  }, [event]);

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

    const itinerary = savedItineraries[itineraryToShare];
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

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Roboto, Arial, system-ui, sans-serif', background: '#fff' }}>
        <div style={{ fontSize: 36, fontWeight: 600, color: '#000', marginBottom: 24 }}>Event not found</div>
        <div style={{ fontSize: 18, color: '#555', marginBottom: 40 }}>The event you are looking for does not exist or has been deleted.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: '#222', color: '#fff', fontWeight: 500, fontSize: 18, border: 'none', borderRadius: 8, padding: '12px 32px', minWidth: 140, minHeight: 48, cursor: 'pointer' }}>Go to Dashboard</button>
          <button onClick={() => navigate('/create-event')} style={{ background: '#fff', color: '#222', fontWeight: 500, fontSize: 18, border: '2px solid #bbb', borderRadius: 8, padding: '12px 32px', minWidth: 140, minHeight: 48, cursor: 'pointer' }}>Create New Event</button>
        </div>
      </div>
    );
  }

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
      'ID Type', 'ID Number', 'Country of Origin',
      'Next of Kin Name', 'Next of Kin Email', 'Next of Kin Country Code', 'Next of Kin Number',
      'Dietary', 'Disabilities', 'Modules'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getAge(dateString?: string) {
    if (!dateString) return null;
    try {
      const today = new Date();
      const birthDate = new Date(dateString);
      if (isNaN(birthDate.getTime())) return null;
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  }

  const filteredGuests = guests
    .filter(guest => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      if (searchQuery && 
        !`${guest.firstName} ${guest.lastName}`.toLowerCase().includes(searchLower) &&
        !guest.email.toLowerCase().includes(searchLower) &&
        !guest.idNumber.toLowerCase().includes(searchLower)
      ) {
        return false;
      }

      // Group filter
      if (filters.group !== 'all' && guest.groupId !== filters.group) {
        return false;
      }
      
      // Age filter
      const age = getAge(guest.dob);
      const minAge = filters.ageRange.min ? parseInt(filters.ageRange.min, 10) : null;
      const maxAge = filters.ageRange.max ? parseInt(filters.ageRange.max, 10) : null;

      if (minAge !== null && (age === null || age < minAge)) {
        return false;
      }
      if (maxAge !== null && (age === null || age > maxAge)) {
        return false;
      }

      // Nationality filter
      if (filters.nationality !== 'all' && guest.countryCode !== filters.nationality) {
        return false;
      }

      // Gender filter
      if (filters.gender !== 'all' && guest.gender !== filters.gender) {
        return false;
      }

      // ID Type filter
      if (filters.idType !== 'all' && guest.idType !== filters.idType) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sorting logic
      const [sortKey, sortDir] = filters.sort.split('-');
      
      let valA: any, valB: any;

      if (sortKey === 'countryCode') {
        valA = a.countryCode || '';
        valB = b.countryCode || '';
      } else {
        valA = (a as any)[sortKey] || '';
        valB = (b as any)[sortKey] || '';
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const allFilteredSelected = useMemo(() => {
    const allFilteredGuestIds = filteredGuests.map(g => g.id);
    return allFilteredGuestIds.length > 0 && allFilteredGuestIds.every(id => selectedGuestIds.includes(id));
  }, [filteredGuests, selectedGuestIds]);

  const handleSelectAll = () => {
    const allFilteredGuestIds = filteredGuests.map(g => g.id);
    if (allFilteredSelected) {
      // Deselect all visible
      setSelectedGuestIds(current => current.filter(id => !allFilteredGuestIds.includes(id)));
    } else {
      // Select all visible
      setSelectedGuestIds(current => [...new Set([...current, ...allFilteredGuestIds])]);
    }
  };

  const handleSelectAllClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFilteredGuestIds = filteredGuests.map(g => g.id);
    if (e.target.checked) {
      setSelectedGuestIds(current => [...new Set([...current, ...allFilteredGuestIds])]);
    } else {
      setSelectedGuestIds(current => current.filter(id => !allFilteredGuestIds.includes(id)));
    }
  };

  useEffect(() => {
    const allFilteredGuestIds = filteredGuests.map(g => g.id);
    const allVisibleSelected = allFilteredGuestIds.length > 0 && allFilteredGuestIds.every(id => selectedGuestIds.includes(id));
    const someVisibleSelected = allFilteredGuestIds.length > 0 && selectedGuestIds.some(id => allFilteredGuestIds.includes(id));

    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.checked = allVisibleSelected;
      selectAllCheckboxRef.current.indeterminate = !allVisibleSelected && someVisibleSelected;
    }
  }, [selectedGuestIds, filteredGuests]);

  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        background: activeTab === id ? (isDark ? '#ffffff' : '#000') : 'transparent',
        color: activeTab === id ? (isDark ? '#000000' : '#fff') : (isDark ? '#ffffff' : '#666'),
        border: isDark ? '1.5px solid #444' : '1.5px solid #ddd',
        borderRadius: 8,
        padding: '12px 24px',
        fontSize: 16,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  );

  const handleDuplicate = (idx: number) => {
    const itinerary = savedItineraries[idx];
    const newItineraries = [...savedItineraries, { ...itinerary, title: `${itinerary.title} (Copy)` }];
    setSavedItineraries(newItineraries);
    localStorage.setItem(`event_itineraries_${event?.id}`, JSON.stringify(newItineraries));
  };

  const handleMakeDraft = (idx: number) => {
    const itinerary = savedItineraries[idx];
    
    const newDrafts = [...draftItineraries, itinerary];
    setDraftItineraries(newDrafts);
    localStorage.setItem(`event_itinerary_drafts_${event?.id}`, JSON.stringify(newDrafts));
    
    const newSaved = savedItineraries.filter((_, i) => i !== idx);
    setSavedItineraries(newSaved);
    localStorage.setItem(`event_itineraries_${event?.id}`, JSON.stringify(newSaved));
  };

  const handleDelete = () => {
    if (itineraryToDelete === null || deleteText !== 'delete') return;
    
    const newItineraries = savedItineraries.filter((_, idx) => idx !== itineraryToDelete);
    setSavedItineraries(newItineraries);
    localStorage.setItem(`event_itineraries_${event?.id}`, JSON.stringify(newItineraries));
    
    setShowDeleteConfirm(false);
    setItineraryToDelete(null);
    setDeleteText('');
  };

  function handleSelectGuest(guestId: string) {
    if (shiftKeyRef.current && lastSelectedId) {
      // Shift-click selection
      const allGuestIds = guests.map(g => g.id);
      const lastIdx = allGuestIds.indexOf(lastSelectedId);
      const currentIdx = allGuestIds.indexOf(guestId);
      const start = Math.min(lastIdx, currentIdx);
      const end = Math.max(lastIdx, currentIdx);
      const rangeIds = allGuestIds.slice(start, end + 1);

      const uniqueIds = new Set([...selectedGuestIds, ...rangeIds]);
      setSelectedGuestIds(Array.from(uniqueIds));
    } else {
      // Regular click selection
      const newSelectedIds = selectedGuestIds.includes(guestId)
        ? selectedGuestIds.filter(id => id !== guestId)
        : [...selectedGuestIds, guestId];
      setSelectedGuestIds(newSelectedIds);
      setLastSelectedId(guestId);
    }
  }

  function handleSelectGroup(groupId: string) {
    const guestIdsInGroup = guests
      .filter(g => g.groupId === groupId)
      .map(g => g.id);
    
    // Check if all guests in the group are already selected
    const allSelected = guestIdsInGroup.every(id => selectedGuestIds.includes(id));
    
    if (allSelected) {
      // Deselect all guests in the group
      setSelectedGuestIds(currentSelected => currentSelected.filter(id => !guestIdsInGroup.includes(id)));
    } else {
      // Select all guests in the group (and remove duplicates)
      setSelectedGuestIds(currentSelected => [...new Set([...currentSelected, ...guestIdsInGroup])]);
    }
  }

  function handleDeleteSelectedGuests() {
    if (!event?.id) return;

    const remainingGuests = guests.filter(g => !selectedGuestIds.includes(g.id));
    localStorage.setItem(`event_guests_${event.id}`, JSON.stringify(remainingGuests));
    setGuests(remainingGuests);
    setSelectedGuestIds([]);
    setShowGuestDeleteConfirm(false);
  }

  const handlePublishDraft = (draftIndex: number) => {
    const draftToPublish = draftItineraries[draftIndex];
    const newSaved = [...savedItineraries, draftToPublish];
    
    const newDrafts = draftItineraries.filter((_, idx) => idx !== draftIndex);
    localStorage.setItem(`event_itinerary_drafts_${event?.id}`, JSON.stringify(newDrafts));
    setDraftItineraries(newDrafts);
    
    localStorage.setItem(`event_itineraries_${event?.id}`, JSON.stringify(newSaved));
    setSavedItineraries(newSaved);
  };

  const handleDragStart = (e: React.DragEvent, moduleKey: string) => {
    setDraggedModule(moduleKey);
  };

  const handleModuleDrop = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    const moduleType = e.dataTransfer.getData('moduleType');
    const moduleName = e.dataTransfer.getData('moduleName');
    
    setActiveModules(prev => ({
      ...prev,
      [category]: [...prev[category], {
        id: `${moduleType}-${Date.now()}`,
        name: moduleName,
        type: moduleType
      }]
    }));
  };

  const handleModuleRemove = (category: string, moduleId: string) => {
    setActiveModules(prev => ({
      ...prev,
      [category]: prev[category].filter(m => m.id !== moduleId)
    }));
  };

  const GuestCard = ({ guest, isSelected, onSelect, standalone, isSelectModeActive }: { guest: GuestType, isSelected: boolean, onSelect: (id: string) => void, standalone?: boolean, isSelectModeActive: boolean }) => {
    const handleNavigate = () => {
      const guestIndex = guests.findIndex(g => g.id === guest.id);
      if (guestIndex !== -1) {
        navigate(`/event/${id}/guests/edit/${guestIndex}`);
      }
    };

    const handleSelectClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(guest.id);
    };

    const cardStyle: React.CSSProperties = {
      background: isSelected ? (isDark ? '#2a2a2a' : '#f0f0f0') : (isDark ? '#1e1e1e' : '#fff'),
      borderRadius: 12,
      border: isSelected ? (isDark ? '2px solid #ffffff' : '2px solid #000') : (isDark ? '1.5px solid #444' : '1.5px solid #bbb'),
      transition: 'all 0.2s ease-in-out',
      boxShadow: isSelected ? (isDark ? '0 4px 12px rgba(255,255,255,0.1)' : '0 4px 12px rgba(0,0,0,0.1)') : (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)'),
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
    };
    
    if (!standalone) {
        cardStyle.background = isSelected ? (isDark ? '#2a2a2a' : '#f0f0f0') : (isDark ? '#1a1a1a' : '#f8f9fa');
        cardStyle.border = isSelected ? (isDark ? '2px solid #ffffff' : '2px solid #000') : (isDark ? '1px solid #333' : '1px solid #ddd');
    }

    return (
      <div 
        onClick={handleNavigate}
        style={cardStyle}
      >
        {isSelectModeActive && (
          <div onClick={handleSelectClick} style={{ padding: '16px', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" checked={isSelected} readOnly style={{ width: 18, height: 18, cursor: 'pointer' }}/>
          </div>
        )}
        <div style={{ flex: 1, padding: isSelectModeActive ? '16px 16px 16px 0' : '16px' }}>
          <div style={{ fontSize: standalone ? 18 : 16, fontWeight: 500, marginBottom: standalone ? 12 : 8, textTransform: 'uppercase', color: isDark ? '#ffffff' : '#222' }}>
            {[guest.firstName, guest.middleName, guest.lastName].filter(Boolean).join(' ')}
          </div>
          <>
            <div style={{ fontSize: 14, color: isDark ? '#b0b0b0' : '#666', marginBottom: 8 }}>
              <span style={{ color: isDark ? '#d0d0d0' : '#444', fontWeight: 500 }}>Email:</span> {guest.email}
            </div>
            <div style={{ fontSize: 14, color: isDark ? '#b0b0b0' : '#666', marginBottom: 8 }}>
              <span style={{ color: isDark ? '#d0d0d0' : '#444', fontWeight: 500 }}>Phone:</span> {guest.countryCode} {guest.contactNumber}
            </div>
            <div style={{ fontSize: 14, color: isDark ? '#b0b0b0' : '#666' }}>
              <span style={{ color: isDark ? '#d0d0d0' : '#444', fontWeight: 500 }}>ID:</span> {guest.idType} {guest.idNumber}
            </div>
          </>
        </div>
      </div>
    );
  };

  const guestPageButtonBaseStyle: React.CSSProperties = {
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    height: 45,
    width: '160px',
    border: isDark ? '2px solid #ffffff' : '2px solid #000',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  };
  
  const guestPageBlackButtonStyle: React.CSSProperties = {
    ...guestPageButtonBaseStyle,
    background: isDark ? '#ffffff' : '#000',
    color: isDark ? '#000000' : '#fff',
  };
  
  const guestPageWhiteButtonStyle: React.CSSProperties = {
    ...guestPageButtonBaseStyle,
    background: isDark ? '#1e1e1e' : '#fff',
    color: isDark ? '#ffffff' : '#000',
  };

  const guestPageInputStyle: React.CSSProperties = {
    height: 45,
    padding: '0 16px',
    border: isDark ? '2px solid #444' : '2px solid #000',
    borderRadius: '8px',
    boxSizing: 'border-box',
    fontSize: 15,
    width: '280px',
    background: isDark ? '#2a2a2a' : '#fff',
    color: isDark ? '#ffffff' : '#333',
  };

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Add delete event logic
  const handleDeleteEvent = () => {
    setShowDeleteEventModal(true);
  };

  const handleConfirmDeleteEvent = () => {
    if (deleteEventText !== 'delete') return;
    
    const updatedEvents = events.filter(e => e.id !== id);
    localStorage.setItem('timely_events', JSON.stringify(updatedEvents));
    navigate('/');
  };

  // Add email recipient handling functions
  const handleAddEmailRecipient = () => {
    if (currentEmailInput && currentEmailInput.includes('@')) {
      setSendFormRecipients(prev => [...prev, currentEmailInput]);
      setCurrentEmailInput('');
    }
  };

  const handleRemoveEmailRecipient = (index: number) => {
    setSendFormRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const handleNextToPreview = () => {
    setModalView('preview');
  };

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
          background: isDark ? '#2a2a2a' : '#1a1a1a', 
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {DASHBOARD_MODULES.addons.map(module => (
                  <div
                    key={module.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, module.key)}
                    style={{
                      background: isDark ? '#404040' : '#333',
                      borderRadius: 8,
                      padding: '12px 16px',
                      cursor: 'grab',
                      userSelect: 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{module.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{module.label}</div>
                      <div style={{ fontSize: 13, color: '#ccc' }}>{module.description}</div>
                    </div>
                  </div>
                ))}
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
        padding: '0 40px',
        transition: 'right 0.3s ease'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '40px',
          fontFamily: 'Roboto, Arial, system-ui, sans-serif',
          color: isDark ? '#ffffff' : '#222',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h1 style={{ fontSize: 32, fontWeight: 600, margin: 0, color: isDark ? '#fff' : '#333' }}>
                {currentEvent?.name || 'Event Dashboard'}
              </h1>
              <span style={{
                background: currentEvent?.status === 'Upcoming' ? '#ef4444' : 
                           currentEvent?.status === 'Live' ? '#f59e0b' : '#22c55e',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {currentEvent?.status || 'Unknown'}
              </span>
          </div>
            <div style={{ fontSize: 22, color: isDark ? '#b0b0b0' : '#888', fontWeight: 400, marginBottom: 0, textAlign: 'right' }}>{formatUK(event.from)} - {formatUK(event.to)}</div>
          </div>
          <hr style={{ margin: '7px 0 16px 0', border: 'none', borderTop: isDark ? '2px solid #444' : '2px solid #bbb' }} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            <TabButton id="settings" label="Event Dashboard" />
            <TabButton id="itineraries" label="Itineraries" />
            <TabButton id="guests" label="Guests" />
            <TabButton id="addons" label="Add Ons" />
          </div>

          {activeTab === 'settings' && (
            <div style={{ marginBottom: 64, paddingBottom: 48 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 32px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon name="report" style={{ fontSize: 32, color: isDark ? '#60A5FA' : '#3B82F6' }} />
                Event Dashboard
              </h2>
              
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

              {/* Guest Journey Tracking */}
              <div style={{ 
                background: isDark ? '#1e1e1e' : '#fff', 
                borderRadius: 16, 
                padding: 32, 
                marginBottom: 32,
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.08)',
                border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: isDark ? '#ffffff' : '#222' }}>
                  <Icon name="flight" style={{ fontSize: 28, color: isDark ? '#60A5FA' : '#3B82F6' }} />
                  Guest Journey Checkpoints
                </h3>
                
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

              {/* Real-time Activity Feed */}
              <div style={{ 
                background: isDark ? '#1e1e1e' : '#fff', 
                borderRadius: 16, 
                padding: 32, 
                marginBottom: 32,
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.08)',
                border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: isDark ? '#ffffff' : '#222' }}>
                  <Icon name="satellite" style={{ fontSize: 28, color: isDark ? '#60A5FA' : '#3B82F6' }} />
                  Live Activity Feed
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 400, overflowY: 'auto' }}>
                  
                  {/* Sample activity items */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16, 
                    padding: 16, 
                    background: isDark ? '#2a2a2a' : '#f8fafc', 
                    borderRadius: 12, 
                    border: isDark ? '1px solid #444' : '1px solid #e2e8f0' 
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: isDark ? '#fff' : '#000', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: isDark ? '#ffffff' : '#000' }}>John Smith confirmed arrival</div>
                      <div style={{ color: isDark ? '#aaa' : '#666', fontSize: 13 }}>Through security checkpoint • 2 minutes ago</div>
                    </div>
                    <div style={{ fontSize: 20 }}>
                      <Icon name="clipboard" style={{ fontSize: 18, color: '#22c55e' }} />
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16, 
                    padding: 16, 
                    background: isDark ? '#2a2a2a' : '#f8fafc', 
                    borderRadius: 12, 
                    border: isDark ? '1px solid #444' : '1px solid #e2e8f0' 
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: isDark ? '#ccc' : '#333', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: isDark ? '#ffffff' : '#000' }}>Flight BA123 landed</div>
                      <div style={{ color: isDark ? '#aaa' : '#666', fontSize: 13 }}>5 guests on board • 15 minutes ago</div>
                    </div>
                    <div style={{ fontSize: 20 }}>
                      <Icon name="flight" style={{ fontSize: 18, color: '#fff' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#666', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>Driver assigned to Group Alpha</div>
                      <div style={{ color: '#666', fontSize: 13 }}>Vehicle: Mercedes Sprinter • 18 minutes ago</div>
                    </div>
                    <div style={{ fontSize: 20 }}>
                      <Icon name="pin" style={{ fontSize: 18, color: '#fff' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#888', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>Sarah Johnson checked into hotel</div>
                      <div style={{ color: '#666', fontSize: 13 }}>Grand Palace Hotel, Room 503 • 25 minutes ago</div>
                    </div>
                    <div style={{ fontSize: 20 }}>
                      <Icon name="hotel" style={{ fontSize: 18, color: '#fff' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#aaa', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>Emergency contact updated</div>
                      <div style={{ color: '#666', fontSize: 13 }}>Guest: Mike Davis • 32 minutes ago</div>
                    </div>
                    <div style={{ fontSize: 20 }}>📞</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
                
                {/* Quick Actions */}
                <div style={{ 
                  background: '#fff', 
                  borderRadius: 16, 
                  padding: 32,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Quick Actions</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <button style={{ 
                      background: '#000', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 12, 
                      padding: '16px 20px',
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Icon name="report" style={{ fontSize: 18, color: '#fff' }} />
                      Export Report
                    </button>
                    
                    <button style={{ 
                      background: '#333', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 12, 
                      padding: '16px 20px',
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>!</span>
                      Send Announcement
                    </button>

                    <button style={{ 
                      background: '#666', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 12, 
                      padding: '16px 20px',
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>!</span>
                      Emergency Alert
                    </button>

                    <button style={{ 
                      background: '#999', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 12, 
                      padding: '16px 20px',
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Icon name="pin" style={{ fontSize: 18, color: '#fff' }} />
                      Track Logistics
                    </button>
                  </div>
                </div>

                {/* Event Settings & Danger Zone */}
                <div style={{ 
                  background: '#fff', 
                  borderRadius: 16, 
                  padding: 32,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Event Settings</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <button style={{ 
                      background: '#f3f4f6', 
                      color: '#374151', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 8, 
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      textAlign: 'left'
                    }}>
                      ✉ Notification Settings
                    </button>
                    
                    <button style={{ 
                      background: '#f3f4f6', 
                      color: '#374151', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 8, 
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      textAlign: 'left'
                    }}>
                      <Icon name="padlock" style={{ fontSize: 14, color: '#374151', marginRight: 8 }} /> Privacy Settings
                    </button>

                    <button style={{ 
                      background: '#f3f4f6', 
                      color: '#374151', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 8, 
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Icon name="report" style={{ fontSize: 14, color: '#374151' }} />
                      Data Export
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div style={{ marginTop: 32, padding: 20, background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 12 }}>
                    <h4 style={{ color: '#000', marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Danger Zone</h4>
                    <p style={{ color: '#333', fontSize: 13, marginBottom: 16 }}>Deleting this event is permanent and cannot be undone.</p>
              <button
                onClick={handleDeleteEvent}
                style={{
                  background: '#fff',
                        color: '#000',
                        border: '2px solid #000',
                  borderRadius: 8,
                        padding: '12px 20px',
                        fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                        width: '100%'
                }}
              >
                Delete Event
              </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'itineraries' && (
            <div style={{ marginBottom: 64, paddingBottom: 48 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0' }}>Itineraries</h2>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                <button 
                  onClick={() => navigate(`/event/${id}/itinerary/create`)} 
                  style={{ background: '#222', color: '#fff', fontWeight: 500, fontSize: 18, border: 'none', borderRadius: 8, padding: '12px 32px', minWidth: 140, minHeight: 48, width: 'auto' }}
                >
                  Create Itinerary
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {savedItineraries.length === 0 && <div style={{ color: '#bbb', fontSize: 17 }}>No itineraries yet.</div>}
                {savedItineraries.map((it, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      background: '#fff', 
                      border: '2px solid #d1d5db', 
                      borderRadius: 14, 
                      padding: '24px 20px', 
                      marginBottom: 0,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 12 }}>{it.title}</div>
                      <div>
                        {it.items && it.items.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {it.items.map((act, aidx) => (
                              <div key={aidx} style={{
                                background: aidx % 2 === 0 ? '#f8f9fa' : '#fff',
                                border: '2px solid #eee',
                                borderRadius: 10,
                                padding: '16px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f0f0f0';
                                e.currentTarget.style.transform = 'scale(1.01)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = aidx % 2 === 0 ? '#f8f9fa' : '#fff';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <div style={{ fontWeight: 500, fontSize: 16, color: '#222' }}>{act.activity || act.title}</div>
                                  <div style={{ color: '#666', fontSize: 14 }}>{formatUK(act.date)}</div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                                  <div style={{ color: '#444', fontSize: 14 }}>
                                    <span style={{ fontWeight: 500, color: '#666' }}>Time:</span> {act.start} - {act.end}
                                  </div>
                                  <div style={{ color: '#444', fontSize: 14 }}>
                                    <span style={{ fontWeight: 500, color: '#666' }}>Location:</span> {act.location}
                                  </div>
                                </div>

                                {act.description && (
                                  <div style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
                                    {act.description}
                                  </div>
                                )}

                                {act.nextOfKin && (
                                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8 }}>
                                    <div style={{ fontSize: 13, color: '#666', fontWeight: 500, marginBottom: 4 }}>NEXT OF KIN</div>
                                    <div style={{ fontSize: 14, color: '#444' }}>
                                      {act.nextOfKin.name} • {act.nextOfKin.phone} • {act.nextOfKin.email}
                                    </div>
                                  </div>
                                )}

                                {act.dietary && act.dietary.length > 0 && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ fontSize: 13, color: '#666', fontWeight: 500, marginBottom: 4 }}>DIETARY</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      {(act.dietary as string[]).map((diet: string, didx: number) => (
                                        <span key={didx} style={{
                                          background: '#f5f5f5',
                                          color: '#000',
                                          padding: '4px 12px',
                                          borderRadius: 12,
                                          fontSize: 13,
                                          border: '1px solid #ccc'
                                        }}>{diet}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {act.disabilities && act.disabilities.length > 0 && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ fontSize: 13, color: '#666', fontWeight: 500, marginBottom: 4 }}>ACCESSIBILITY</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      {(act.disabilities as string[]).map((disability: string, didx: number) => (
                                        <span key={didx} style={{
                                          background: '#e5e5e5',
                                          color: '#000',
                                          padding: '4px 12px',
                                          borderRadius: 12,
                                          fontSize: 13,
                                          border: '1px solid #999'
                                        }}>{disability}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {act.modules && Object.keys(act.modules).length > 0 && (
                                  <div style={{ marginTop: 12, borderTop: '2px solid #eee', paddingTop: 12 }}>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      {Object.entries(act.modules as Record<string, boolean>).map(([key, value], midx) => (
                                        value && (
                                          <span key={midx} style={{
                                            background: '#f3f4f6',
                                            color: '#374151',
                                            padding: '4px 12px',
                                            borderRadius: 12,
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                          }}>
                                            {MODULES.find((m: ActivityModule) => m.key === key)?.label || key}
                                          </span>
                                        )
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#bbb', fontSize: 15 }}>No activities in this itinerary.</div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 20, display: 'flex', alignSelf: 'flex-end', gap: 16, alignItems: 'center' }}>
                      <button title="Edit" onClick={() => navigate(`/event/${id}/itinerary/edit/${idx}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}><Icon name="edit" style={{ color: '#fff' }} /></button>
                      <button title="Duplicate" onClick={() => handleDuplicate(idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}><Icon name="duplicate" style={{ color: '#fff' }} /></button>
                      <button title="Share" onClick={() => { setItineraryToShare(idx); setShowShareModal(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}><Icon name="share" style={{ color: '#fff' }} /></button>
                      <button title="Save as Draft" onClick={() => handleMakeDraft(idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}><Icon name="saveAsDraft" style={{ color: '#fff' }} /></button>
                      <button title="Delete" onClick={() => { setItineraryToDelete(idx); setShowDeleteConfirm(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}><Icon name="delete" style={{ color: '#fff' }} /></button>
                    </div>
                  </div>
                ))}

                {draftItineraries.length > 0 && (
                  <>
                    <div style={{ marginTop: 48, marginBottom: 24 }}>
                      <div style={{ fontSize: 20, fontWeight: 500, color: '#666', marginBottom: 8 }}>Drafts</div>
                      <div style={{ height: 1, background: '#d1d5db', marginBottom: 24 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {draftItineraries.map((it, idx) => (
                          <div 
                            key={`draft-${idx}`}
                            style={{ 
                              background: '#f8f9fa',
                              border: '2px solid #d1d5db',
                              borderRadius: 14, 
                              padding: '24px 20px', 
                              marginBottom: 0,
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                              <div style={{ fontWeight: 600, fontSize: 20 }}>{it.title}</div>
                              <button
                                onClick={() => handlePublishDraft(idx)}
                                style={{
                                  background: '#4CAF50',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '8px 16px',
                                  fontSize: 15,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  width: 'auto',
                                  whiteSpace: 'nowrap',
                                  fontWeight: 500
                                }}
                              >
                                <span style={{ fontSize: 16 }}>↑</span>
                                Publish
                              </button>
                            </div>
                            {it.items && it.items.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {it.items.map((act, aidx) => (
                                  <div key={aidx} style={{
                                    background: aidx % 2 === 0 ? '#f8f9fa' : '#fff',
                                    border: '2px solid #eee',
                                    borderRadius: 10,
                                    padding: '16px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f0f0f0';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = aidx % 2 === 0 ? '#f8f9fa' : '#fff';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                      <div style={{ fontWeight: 500, fontSize: 16, color: '#222' }}>{act.activity || act.title}</div>
                                      <div style={{ color: '#666', fontSize: 14 }}>{formatUK(act.date)}</div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                                      <div style={{ color: '#444', fontSize: 14 }}>
                                        <span style={{ fontWeight: 500, color: '#666' }}>Time:</span> {act.start} - {act.end}
                                      </div>
                                      <div style={{ color: '#444', fontSize: 14 }}>
                                        <span style={{ fontWeight: 500, color: '#666' }}>Location:</span> {act.location}
                                      </div>
                                    </div>

                                    {act.description && (
                                      <div style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
                                        {act.description}
                                      </div>
                                    )}

                                    {act.nextOfKin && (
                                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8 }}>
                                        <div style={{ fontSize: 13, color: '#666', fontWeight: 500, marginBottom: 4 }}>NEXT OF KIN</div>
                                        <div style={{ fontSize: 14, color: '#444' }}>
                                          {act.nextOfKin.name} • {act.nextOfKin.phone} • {act.nextOfKin.email}
                                        </div>
                                      </div>
                                    )}

                                    {act.dietary && act.dietary.length > 0 && (
                                      <div style={{ marginTop: 8 }}>
                                        <div style={{ fontSize: 13, color: '#666', fontWeight: 500, marginBottom: 4 }}>DIETARY</div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                          {(act.dietary as string[]).map((diet: string, didx: number) => (
                                            <span key={didx} style={{
                                              background: '#f5f5f5',
                                              color: '#000',
                                              padding: '4px 12px',
                                              borderRadius: 12,
                                              fontSize: 13,
                                              border: '1px solid #ccc'
                                            }}>{diet}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {act.disabilities && act.disabilities.length > 0 && (
                                      <div style={{ marginTop: 8 }}>
                                        <div style={{ fontSize: 13, color: '#666', fontWeight: 500, marginBottom: 4 }}>ACCESSIBILITY</div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                          {(act.disabilities as string[]).map((disability: string, didx: number) => (
                                            <span key={didx} style={{
                                              background: '#e5e5e5',
                                              color: '#000',
                                              padding: '4px 12px',
                                              borderRadius: 12,
                                              fontSize: 13,
                                              border: '1px solid #999'
                                            }}>{disability}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {act.modules && Object.keys(act.modules).length > 0 && (
                                      <div style={{ marginTop: 12, borderTop: '2px solid #eee', paddingTop: 12 }}>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                          {Object.entries(act.modules as Record<string, boolean>).map(([key, value], midx) => (
                                            value && (
                                              <span key={midx} style={{
                                                background: '#f3f4f6',
                                                color: '#374151',
                                                padding: '4px 12px',
                                                borderRadius: 12,
                                                fontSize: 13,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                              }}>
                                                {MODULES.find((m: ActivityModule) => m.key === key)?.label || key}
                                              </span>
                                            )
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: '#bbb', fontSize: 15 }}>No activities in this draft.</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'guests' && (
            <div style={{ marginBottom: 64, position: 'relative', paddingBottom: 48 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0' }}>Guest List</h2>

              {/* Top row of controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => navigate(`/event/${id}/add-guests`)} style={guestPageBlackButtonStyle}>
                    Add Guests
                  </button>
                  <button onClick={() => navigate(`/event/${id}/add-guests?upload=1`)} style={guestPageWhiteButtonStyle}>
                    Upload .CSV
                  </button>
                  <button onClick={handleDownloadCSVTemplate} style={guestPageWhiteButtonStyle}>
                    Download
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowSendFormModal(true);
                  }}
                  style={guestPageBlackButtonStyle}
                >
                  Send Form
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
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff',
                        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '2px solid #e5e7eb',
                        zIndex: 10, width: 380, padding: 28,
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
                          <h4 style={{margin: 0, fontSize: 18, fontWeight: 600}}>Filters</h4>
                            <button 
                            onClick={() => setShowFilterPopup(false)} 
                            style={{
                              background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32,
                              cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 18
                            }}
                          >&times;</button>
                        </div>
                        <div style={{ display: 'grid', gap: 20 }}>
                          <div>
                            <label style={{ fontWeight: 500, fontSize: 14, color: '#4a5568', display: 'block', marginBottom: 8 }}>Sort by</label>
                            <select
                              value={filters.sort}
                              onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value }))}
                              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #d1d5db', fontSize: 16, background: '#f7f8fa', height: 44 }}
                            >
                              <option value="firstName-asc">First Name (A-Z)</option>
                              <option value="firstName-desc">First Name (Z-A)</option>
                              <option value="lastName-asc">Last Name (A-Z)</option>
                              <option value="lastName-desc">Last Name (Z-A)</option>
                              <option value="countryCode-asc">Nationality (A-Z)</option>
                              <option value="countryCode-desc">Nationality (Z-A)</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, fontSize: 14, color: '#4a5568', display: 'block', marginBottom: 8 }}>Age Range</label>
                            <div style={{display: 'flex', gap: 12}}>
                                <input type="number" placeholder="Min" value={filters.ageRange.min} onChange={(e) => setFilters(f => ({ ...f, ageRange: { ...f.ageRange, min: e.target.value } }))} style={{width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #d1d5db', fontSize: 16, background: '#f7f8fa', height: 44}} />
                                <input type="number" placeholder="Max" value={filters.ageRange.max} onChange={(e) => setFilters(f => ({ ...f, ageRange: { ...f.ageRange, max: e.target.value } }))} style={{width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #d1d5db', fontSize: 16, background: '#f7f8fa', height: 44}} />
                            </div>
                          </div>
                          {[
                            {key: 'nationality', label: 'Nationality', options: [...new Set(guests.map(g => g.countryCode).filter(Boolean))]},
                            {key: 'gender', label: 'Gender', options: [...new Set(guests.map(g => g.gender).filter(Boolean))]},
                            {key: 'idType', label: 'ID Type', options: [...new Set(guests.map(g => g.idType).filter(Boolean))]},
                          ].map(filter => (
                            <div key={filter.key}>
                              <label style={{ fontWeight: 500, fontSize: 14, color: '#4a5568', display: 'block', marginBottom: 8 }}>{filter.label}</label>
                              <select
                                value={(filters as any)[filter.key]}
                                onChange={(e) => setFilters(f => ({ ...f, [filter.key]: e.target.value }))}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #d1d5db', fontSize: 16, background: '#f7f8fa', height: 44 }}
                              >
                                <option value="all">All</option>
                                {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                        <div style={{borderTop: '2px solid #e5e7eb', marginTop: 24, paddingTop: 20, display: 'flex', justifyContent: 'space-between', gap: 12}}>
                            <button
                              onClick={() => {
                                  setFilters({ sort: 'firstName-asc', group: 'all', nationality: 'all', gender: 'all', idType: 'all', ageRange: { min: '', max: '' } });
                                  setSearchQuery('');
                              }}
                              style={{
                                  width: '100%', padding: '12px', background: '#f1f5f9', border: 'none',
                                  borderRadius: 8, color: '#1f2937', fontWeight: 600, cursor: 'pointer', fontSize: 16
                              }}
                          >
                              Clear
                          </button>
                          <button
                              onClick={() => setShowFilterPopup(false)}
                              style={{
                                  width: '100%', padding: '12px', background: '#1f2937', color: '#fff', border: 'none',
                                  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 16
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
                    style={{
                      ...guestPageWhiteButtonStyle,
                      background: isSelectModeActive ? '#eef2ff' : '#fff',
                      color: isSelectModeActive ? '#4f46e5' : '#000',
                      border: `2px solid ${isSelectModeActive ? '#4f46e5' : '#000'}`,
                    }}
                  >
                    Select
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
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', borderRadius: 16, padding: '40px 48px', minWidth: 400, boxShadow: '0 4px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 600 }}>Delete Guests?</h2>
                    <p style={{ color: '#666', fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
                      Are you sure you want to permanently delete the {selectedGuestIds.length} selected guest(s)? This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                      <button
                        style={{ background: '#f5f5f5', color: '#222', fontWeight: 500, fontSize: 18, border: '2px solid #ddd', borderRadius: 8, padding: '12px 36px', minWidth: 120, cursor: 'pointer' }}
                        onClick={() => setShowGuestDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        style={{ background: '#ef4444', color: '#fff', fontWeight: 500, fontSize: 18, border: 'none', borderRadius: 8, padding: '13px 37px', minWidth: 120, cursor: 'pointer' }}
                        onClick={handleDeleteSelectedGuests}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const grouped = filteredGuests.reduce((acc, guest) => {
                  if (guest.groupId && guest.groupName) {
                    if (!acc.groups[guest.groupName]) {
                      acc.groups[guest.groupName] = { groupId: guest.groupId, guests: [] };
                    }
                    acc.groups[guest.groupName].guests.push(guest);
                  } else {
                    acc.individuals.push(guest);
                  }
                  return acc;
                }, { individuals: [] as GuestType[], groups: {} as Record<string, { groupId: string; guests: GuestType[] }> });

                return (
                  <>
                    {Object.entries(grouped.groups).map(([groupName, { groupId, guests: groupGuests }]) => (
                       <div key={groupId} style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16, marginBottom: 24, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {isSelectModeActive && (
                              <input 
                                type="checkbox" 
                                style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#4f46e5' }}
                                checked={groupGuests.length > 0 && groupGuests.every(g => selectedGuestIds.includes(g.id))}
                                onChange={() => handleSelectGroup(groupId)}
                              />
                            )}
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{groupName}</h3>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, background: '#f3f4f6', padding: '4px 10px', borderRadius: '99px' }}>{groupGuests.length} guests</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                          {groupGuests.map((guest) => (
                            <GuestCard key={guest.id} guest={guest} isSelected={selectedGuestIds.includes(guest.id)} onSelect={handleSelectGuest} isSelectModeActive={isSelectModeActive} />
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {grouped.individuals.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {grouped.individuals.map((guest) => (
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
              <h2 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0' }}>Add Ons</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {Object.entries(activeModules).map(([category, modules]) => (
                  <div
                    key={category}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverCategory(category);
                    }}
                    onDragLeave={() => setDragOverCategory(null)}
                    onDrop={(e) => {
                      handleModuleDrop(e, category);
                      setDragOverCategory(null);
                    }}
                    style={{
                      padding: 24,
                      background: isDark ? '#2a2a2a' : '#f8f9fa',
                      borderRadius: 12,
                      border: `2px dashed ${dragOverCategory === category ? '#2563eb' : (isDark ? '#555' : '#ccc')}`,
                      minHeight: 200,
                      transition: 'all 0.2s ease',
                      transform: dragOverCategory === category ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: dragOverCategory === category ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none'
                    }}
                  >
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 500, color: isDark ? '#fff' : '#444' }}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h3>
                    {modules.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {modules.map((module, index) => {
                          const moduleInfo = DASHBOARD_MODULES.addons.find(m => m.key === module.id);
                          if (!moduleInfo) return null;
                          return (
                            <div
                              key={`${module.id}-${index}`}
                              style={{
                                background: '#fff',
                                borderRadius: 8,
                                padding: '12px 16px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 24 }}>{moduleInfo.icon}</span>
                                <div>
                                  <div style={{ fontWeight: 600, color: isDark ? '#fff' : '#333' }}>{moduleInfo.label}</div>
                                  <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#777' }}>{moduleInfo.description}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleModuleRemove(category, module.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isDark ? '#888' : '#aaa',
                                  cursor: 'pointer',
                                  fontSize: 24,
                                  lineHeight: 1,
                                  padding: '4px'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: isDark ? '#888' : '#aaa', marginTop: 60 }}>
                        Drag and drop {category} modules here
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            minWidth: 400,
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 8, color: '#c00' }}>Delete Itinerary</div>
            <div style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>This action cannot be undone. Type "delete" to confirm.</div>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 16,
                borderRadius: 8,
                border: '2px solid #ddd',
                marginBottom: 24
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText('');
                  setItineraryToDelete(null);
                }}
                style={{
                  background: '#eee',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: 8,
                  fontSize: 16,
                  cursor: 'pointer'
                }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteText !== 'delete'}
                style={{
                  background: deleteText === 'delete' ? '#c00' : '#fcc',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: 8,
                  fontSize: 16,
                  cursor: deleteText === 'delete' ? 'pointer' : 'not-allowed'
                }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (() => {
        const itineraryDetails = itineraryToShare !== null ? savedItineraries[itineraryToShare] : null;
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

      {showSendFormModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 2000
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '0',
            width: '100%', maxWidth: 640, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', maxHeight: '85vh'
          }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '2px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                  {sendState === 'success' ? 'Success!' : sendState === 'error' ? 'Error Sending Emails' : 'Send Guest Form'}
                </h3>
                {(sendState === 'idle') && (
                  <p style={{ margin: '4px 0 0', color: '#666' }}>
                    {modalView === 'recipients' ? 'Step 1: Add Recipients' : 'Step 2: Customize Form'}
                  </p>
                )}
              </div>
              <button onClick={handleCloseModal} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>&times;</button>
            </div>
            
            {/* Body */}
            <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
              {sendState === 'success' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <Icon name="clipboard" style={{ fontSize: 48, color: '#22c55e' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Forms sent successfully!</p>
                  <p style={{ color: '#666', marginBottom: 24 }}>Guest forms have been sent to all recipients.</p>
                </div>
              )}

              {sendState === 'error' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, color: '#ef4444', fontWeight: 'bold' }}>!</div>
                  <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Failed to send forms</p>
                  <p style={{ color: '#666', marginBottom: 24 }}>There was an error sending the guest forms. Please try again.</p>
                </div>
              )}

              {sendState === 'sending' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      border: '4px solid #e5e7eb', 
                      borderTop: '4px solid #3b82f6', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto'
                    }}></div>
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Sending forms...</p>
                  <p style={{ color: '#666' }}>Please wait while we send the forms to your guests.</p>
                </div>
              )}

              {sendState === 'idle' && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                  <button
                    onClick={() => {
                      setShowSendFormModal(false);
                      setSendFormRecipients([]);
                      setModalView('recipients');
                      setCurrentEmailInput('');
                      setSendState('idle');
                    }}
                    style={{
                      background: '#f5f5f5',
                      color: '#222',
                      fontWeight: 500,
                      fontSize: 18,
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '12px 36px',
                      minWidth: 120,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                    }}
                  >
                    {modalView === 'preview' ? 'Back' : 'Cancel'}
                  </button>
                      <button
                    onClick={modalView === 'preview' ? handleSendForm : () => setModalView('preview')}
                      style={{
                      background: '#3b82f6',
                        color: '#fff',
                      fontWeight: 500,
                      fontSize: 18,
                        border: 'none',
                        borderRadius: 8,
                      padding: '13px 37px',
                      minWidth: 120,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#3b82f6';
                    }}
                  >
                    {modalView === 'preview' ? 'Send Forms' : 'Next'}
                    </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            minWidth: 400,
            maxWidth: 500,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#ef4444', fontWeight: 'bold' }}>!</div>
            <h2 style={{ margin: 0, marginBottom: 16, fontSize: 24, fontWeight: 600 }}>Delete Event</h2>
            <p style={{ color: '#666', marginBottom: 24 }}>This action cannot be undone. All event data, guests, and configurations will be permanently deleted.</p>
            <p style={{ color: '#666', marginBottom: 24 }}>Type <strong>delete</strong> to confirm:</p>
              <input
                type="text"
                value={deleteEventText}
                onChange={(e) => setDeleteEventText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                style={{
                  width: '100%',
                padding: 12,
                  border: '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 24,
                  textAlign: 'center'
                }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => {
                  setShowDeleteEventModal(false);
                  setDeleteEventText('');
                }}
                style={{
                  background: '#f5f5f5',
                  color: '#222',
                  fontWeight: 500,
                  fontSize: 18,
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '12px 36px',
                  minWidth: 120,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteEvent}
                disabled={deleteEventText !== 'delete'}
                style={{
                  background: deleteEventText === 'delete' ? '#ef4444' : '#fca5a5',
                  color: '#fff',
                  fontWeight: 500,
                  fontSize: 18,
                  border: 'none',
                  borderRadius: 8,
                  padding: '13px 37px',
                  minWidth: 120,
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
    </div>
  );
} 