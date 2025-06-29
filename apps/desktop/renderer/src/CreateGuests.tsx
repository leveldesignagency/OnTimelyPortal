import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import countryList from 'country-list';
import { codes as countryCallingCodes } from 'country-calling-code';
import { getCurrentUser } from './lib/auth';
import { addMultipleGuests, getGuests, deleteGuest, deleteGuestsByGroupId } from './lib/supabase';
import { ThemeContext } from './ThemeContext';
import { useRealtimeEvents } from './hooks/useRealtime';

const AVIATIONSTACK_API_KEY = 'bb7fd8369e323c356434d5b1ac77b437'; // 🚨 PASTE YOUR NEW AVIATIONSTACK API KEY HERE 🚨

// --- TYPE DEFINITIONS ---
interface FlightData {
  flight_status: string;
  departure: {
    airport: string;
    iata: string;
    scheduled: string;
    timezone: string;
    terminal: string | null;
    gate: string | null;
    estimated: string | null;
    actual: string | null;
  };
  arrival: {
    airport: string;
    iata: string;
    scheduled: string;
    timezone: string;
    terminal: string | null;
    gate: string | null;
    estimated: string | null;
    actual: string | null;
  };
}

interface FlightModuleState {
  status: 'idle' | 'loading' | 'found' | 'not_found';
  data: FlightData | null;
}

interface Guest {
  // Basic Info
  id?: string;
  prefix: string;
  gender: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  // Contact
  countryCode: string;
  contactNumber: string;
  email: string;
  // ID
  idType: string;
  idNumber: string;
  idCountry: string;
  // Next of Kin
  nextOfKinName: string;
  nextOfKinEmail: string;
  nextOfKinPhoneCountry: string;
  nextOfKinPhone: string;
  // Additional Info
  dietary: string[];
  medical: string[];
  // Modules
  modules: Record<string, boolean[]>;
  moduleValues: Record<string, any[]>;
  moduleFlightData?: Record<string, (FlightModuleState | null)[]>;
  // UI State for Drafts
  dietaryInput?: string;
  medicalInput?: string;
  errors?: Record<string, string>;
  // Grouping
  groupId?: string | null;
  groupName?: string | null;
  flightData?: FlightData;
  hotelAddress?: string;
  hotelBookingNumber?: string;
}

type Draft = Guest;

async function fetchFlightData(flightNumber: string, flightDate: string): Promise<FlightData | null> {
  if (!flightNumber || !flightDate || !AVIATIONSTACK_API_KEY) {
    return null;
  }

  const upperCaseFlightNumber = flightNumber.toUpperCase();
  const requestUrl = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${upperCaseFlightNumber}&flight_date=${flightDate}`;
  
  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
        console.error(`AviationStack API error! Status: ${response.status}`);
        try {
            const errorData = await response.json();
            console.error('API Error Details:', errorData);
        } catch (e) {
            console.error('Could not parse error response from API.');
        }
        return null;
    }

    const data = await response.json();

    if (data.error) {
        console.error('AviationStack API returned an error object:', data.error);
        return null;
    }

    if (data.data && data.data.length > 0) {
      return data.data[0];
    }
  } catch (error) {
    console.error('Failed to fetch flight data. This could be a network error or a Cross-Origin (CORS) issue because the free API uses HTTP. Please check the browser console for more details.', error);
  }
  return null;
}

function formatFlightTime(dateTimeString: string, timeZone: string) {
  if (!dateTimeString) return 'N/A';
  try {
    const date = new Date(dateTimeString);
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone,
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

const GUEST_MODULES = [
  { key: 'flightNumber', label: 'Flight Tracker', type: 'text', placeholder: 'e.g. BA2490', description: 'Auto-detects flight details' },
  { key: 'seatNumber', label: 'Seat Number', type: 'text', placeholder: 'e.g. 14A' },
  { key: 'eventReference', label: 'Event Reference', type: 'text', placeholder: 'Enter reference number' },
  { key: 'hotelReservation', label: 'Hotel Reservation', type: 'text', placeholder: 'Enter confirmation number', description: 'Auto-detects hotel details' },
  { key: 'trainBookingNumber', label: 'Train Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'coachBookingNumber', label: 'Coach Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'idUpload', label: 'ID Upload', type: 'file', placeholder: 'Upload ID (PNG, JPG, PDF)' },
];

const GUEST_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'middleName', label: 'Middle Name', required: false },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'contactNumber', label: 'Contact Number', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'nextOfKin', label: 'Next of Kin Contact Information', required: false },
  { key: 'idType', label: 'ID Type', required: true },
  { key: 'idNumber', label: 'ID Number', required: true },
];

const PREFIXES = ['Mr', 'Mrs', 'Ms', 'Mx', 'Dr', 'Prof'];
const GENDERS = ['Male', 'Female', 'Transgender', 'Non Binary', 'Other', 'Prefer Not to Say'];
const COUNTRIES = countryList.getNames();

function getFlagEmoji(isoCode2: string) {
  if (!isoCode2) return '';
  return isoCode2
    .toUpperCase()
    .replace(/./g, (char: string) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

type CountryCodeObj = { countryCodes: string[]; isoCode2: string; country: string };

const COUNTRY_CODES = Array.from(
  new Map(
    countryCallingCodes
      .filter(c => c.countryCodes[0] && c.isoCode2)
      .map((c: CountryCodeObj) => [`+${c.countryCodes[0]}`, {
        code: `+${c.countryCodes[0]}`,
        label: c.country,
        flag: getFlagEmoji(c.isoCode2)
      }])
  ).values()
);

function countryCodeSelector(value: string, onChange: (val: string) => void) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: 120, minWidth: 90, borderRadius: 8, background: '#f7f8fa', border: '1px solid #d1d5db', padding: '0 8px', fontSize: 18, height: 48, lineHeight: '48px' }}>
      {COUNTRY_CODES.map(c => (
        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
      ))}
    </select>
  );
}

// Glassmorphic style helper functions
const getGlassStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`,
  borderRadius: '16px',
  boxShadow: isDark 
    ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
    : '0 8px 32px rgba(0, 0, 0, 0.1)'
});

const getInputStyles = (isDark: boolean) => ({
  background: isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
  borderRadius: '8px',
  color: isDark ? '#fff' : '#000',
  outline: 'none',
  transition: 'all 0.2s ease'
});

const getButtonStyles = (isDark: boolean, variant: 'primary' | 'secondary' | 'danger') => {
  const baseStyles = {
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyles,
        background: isDark 
          ? 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' 
          : 'linear-gradient(135deg, #000000 0%, #333333 100%)',
        color: isDark ? '#000000' : '#ffffff',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
      };
    case 'secondary':
      return {
        ...baseStyles,
        background: isDark 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.05)',
        color: isDark ? '#ffffff' : '#000000',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`
      };
    case 'danger':
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
      };
    default:
      return baseStyles;
  }
};

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0f0f0f' : '#f8fafc',
  text: isDark ? '#ffffff' : '#000000',
  textSecondary: isDark ? '#a1a1aa' : '#666666',
  border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  accent: isDark ? '#ffffff' : '#000000',
  hoverBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
  cardBg: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)'
});

export default function CreateGuests() {
  const { eventId: eventIdFromParams, guestIndex } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);

  // This is a failsafe against development server (Vite HMR) issues where useParams might return stale data.
  // It ensures eventId is reliably extracted from the URL, fixing save/load actions.
  const eventId = useMemo(() => {
    if (eventIdFromParams) return eventIdFromParams;
    const pathParts = location.pathname.split('/');
    // Expected URL structure: /event/{eventId}/...
    if (pathParts[1] === 'event' && pathParts[2]) {
      return pathParts[2];
    }
    return undefined;
  }, [eventIdFromParams, location.pathname]);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showModules, setShowModules] = useState(false);
  const [eventName, setEventName] = useState('');
  const [openMenuIdx, setOpenMenuIdx] = useState(null);
  const [editGuestIdx, setEditGuestIdx] = useState<number | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupNameConfirmed, setGroupNameConfirmed] = useState(false);
  const [expandedGuestIndex, setExpandedGuestIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{type: 'guest' | 'group' | 'draft', index?: number} | null>(null);
  const [scannerTab, setScannerTab] = useState<'upload' | 'camera'>('upload');
  const [scannerState, setScannerState] = useState<{
    show: boolean;
    draftIndex: number | null;
    processing: boolean;
    imageUrl: string | null;
    message: string;
  }>({
    show: false,
    draftIndex: null,
    processing: false,
    imageUrl: null,
    message: 'Upload or scan a passport to begin.'
  });
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);
  const [csvError, setCsvError] = useState<string | null>('');
  const [expandedDraftIndex, setExpandedDraftIndex] = useState<number | null>(null);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState<number | null>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentUser = getCurrentUser();
  const { events: realtimeEvents } = useRealtimeEvents(currentUser?.company_id || null);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [dateRange, setDateRange] = useState('');

  useEffect(() => {
    if (!eventId || !realtimeEvents) return;
    const currentEvent = realtimeEvents.find(e => e.id === eventId);
    if (currentEvent) {
      setEventDetails(currentEvent);
      if (currentEvent.from && currentEvent.to) {
        const fromDate = new Date(currentEvent.from).toLocaleDateString('en-GB');
        const toDate = new Date(currentEvent.to).toLocaleDateString('en-GB');
        setDateRange(`${fromDate} - ${toDate}`);
      }
    }
  }, [eventId, realtimeEvents]);

  useEffect(() => {
    if (!eventId) return;

    const loadGuestDataForEdit = async () => {
      if (guestIndex !== undefined) {
        console.log('[CreateGuests] guestIndex param:', guestIndex);
        // Check if guestIndex is a UUID (contains hyphens) or a number
        const isUUID = typeof guestIndex === 'string' && guestIndex.includes('-');
        const idx = isUUID ? NaN : parseInt(guestIndex, 10);
        let guestToEdit: Guest | undefined;
        let convertedGuests: Guest[] = [];
        try {
          // Load guests from Supabase instead of localStorage
          const supabaseGuests = await getGuests(eventId);
          convertedGuests = supabaseGuests.map((guest: any) => ({
            id: guest.id, // Ensure ID is preserved
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
          console.log('[CreateGuests] Loaded guests IDs:', convertedGuests.map(g => g.id));
          console.log('[CreateGuests] Types of loaded guest IDs:', convertedGuests.map(g => typeof g.id));
          console.log('[CreateGuests] guestIndex:', guestIndex, 'type:', typeof guestIndex, 'isUUID:', isUUID);

          if (!isNaN(idx)) {
            console.log('[CreateGuests] Using index lookup:', idx);
            guestToEdit = convertedGuests[idx];
          } else {
            console.log('[CreateGuests] Using ID lookup for:', guestIndex);
            guestToEdit = convertedGuests.find((g: any) => {
              const match = String(g.id).trim() === String(guestIndex).trim();
              console.log('[CreateGuests] Comparing:', g.id, '===', guestIndex, '->', match);
              return match;
            });
          }
          console.log('[CreateGuests] guestToEdit found:', guestToEdit);

          if (guestToEdit) {
            setGuests([]); // Clear guests state to avoid rendering the summary card
            setEditGuestIdx(!isNaN(idx) ? idx : null);

            if (guestToEdit.groupId) {
              // Editing a group
              const groupGuests = convertedGuests.filter((g: any) => g.groupId === guestToEdit.groupId);
              setDrafts(groupGuests);
              setIsGroup(true);
              setGroupName(guestToEdit.groupName || '');
              setGroupNameConfirmed(true); // When editing a group, name is already set
              setExpandedDraftIndex(null);
            } else {
              // Editing a single guest
              setDrafts([guestToEdit]);
              setIsGroup(false);
              setExpandedDraftIndex(0);
            }
          }
        } catch (error) {
          console.error('Error loading guest data for edit:', error);
          // Fallback to localStorage if Supabase fails
          const allGuests = JSON.parse(localStorage.getItem(`event_guests_${eventId}`) || '[]');
          console.log('[CreateGuests] Fallback allGuests:', allGuests.map((g: any) => g.id));
          if (!isNaN(idx)) {
            guestToEdit = allGuests[idx];
          } else {
            guestToEdit = allGuests.find((g: any) => g.id === guestIndex);
          }
          console.log('[CreateGuests] Fallback guestToEdit found:', guestToEdit);

          if (guestToEdit) {
            setGuests([]);
            setEditGuestIdx(!isNaN(idx) ? idx : null);

            if (guestToEdit.groupId) {
              const groupGuests = allGuests.filter((g: any) => g.groupId === guestToEdit.groupId);
              setDrafts(groupGuests);
              setIsGroup(true);
              setGroupName(guestToEdit.groupName || '');
              setGroupNameConfirmed(true);
              setExpandedDraftIndex(null);
            } else {
              setDrafts([guestToEdit]);
              setIsGroup(false);
              setExpandedDraftIndex(0);
            }
          }
        }
      } else {
        // Creating a new guest/group
        setGuests([]);
        setDrafts([]);
        setEditGuestIdx(null);
        setIsGroup(false);
        setGroupName('');
        setGroupNameConfirmed(false);
        setExpandedDraftIndex(null);
      }
    };

    loadGuestDataForEdit();
  }, [eventId, guestIndex]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('upload') === '1') setIsCsvModalOpen(true);
  }, [location.search]);

  useEffect(() => {
    if (eventId) {
      try {
        const events = JSON.parse(localStorage.getItem('timely_events') || '[]');
        const event = events.find((e: { id: string }) => e.id === eventId);
        setEventName(event ? event.name : '');
      } catch {}
    }
  }, [eventId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(null);
      }
    }
    if (countryDropdownOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryDropdownOpen]);

  function handleConfirmGroupName() {
    if (groupName.trim()) {
      setGroupNameConfirmed(true);
    }
  }

  function handleAddDraft() {
    const newDraft = {
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      contactNumber: '',
      countryCode: '+44',
      email: '',
      idType: '',
      idNumber: '',
      idCountry: '',
      nextOfKinName: '',
      nextOfKinEmail: '',
      nextOfKinPhone: '',
      nextOfKinPhoneCountry: '+44',
      modules: {},
      moduleValues: {},
      moduleFlightData: {},
      errors: {},
      prefix: '',
      gender: '',
      dietary: [],
      medical: [],
      dietaryInput: '',
      medicalInput: '',
    };
    const newDrafts = [newDraft, ...drafts];
    setDrafts(newDrafts);
    setExpandedDraftIndex(0);
  }

  function handleDraftChange(idx: number, key: keyof Draft, value: any) {
    setDrafts(d => d.map((draft, i) => i === idx ? { ...draft, [key]: value } : draft));
  }

  function validateDraft(draft: Draft): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!draft.firstName.trim()) errs.firstName = 'First name is required.';
    if (!draft.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!draft.contactNumber.trim()) errs.contactNumber = 'Contact number is required.';
    if (!draft.email.trim()) errs.email = 'Email is required.';
    if (!draft.idType) errs.idType = 'ID type is required.';
    if (!draft.idNumber.trim()) errs.idNumber = 'ID number is required.';
    if (!draft.idCountry) errs.idCountry = 'Country of origin is required.';
    if (!draft.nextOfKinName.trim()) errs.nextOfKinName = 'Next of kin name is required.';
    if (!draft.nextOfKinEmail.trim()) errs.nextOfKinEmail = 'Next of kin email is required.';
    if (!draft.nextOfKinPhone.trim()) errs.nextOfKinPhone = 'Next of kin phone is required.';
    if (draft.idType === 'Passport' && !/^\w{6,9}$/.test(draft.idNumber)) errs.idNumber = 'Passport number must be 6-9 alphanumeric characters.';
    if (draft.idType === 'Identity Card' && !/^\w{6,12}$/.test(draft.idNumber)) errs.idNumber = 'Identity Card number must be 6-12 alphanumeric characters.';
    if (draft.idType === 'Drivers License' && !/^\w{6,15}$/.test(draft.idNumber)) errs.idNumber = 'Drivers License number must be 6-15 alphanumeric characters.';
    if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email)) errs.email = 'Invalid email address.';
    if (draft.nextOfKinEmail && !/^\S+@\S+\.\S+$/.test(draft.nextOfKinEmail)) errs.nextOfKinEmail = 'Invalid next of kin email address.';
    return errs;
  }

  function handleSaveDraft(idx: number) {
    const draft = drafts[idx];
    const errs = validateDraft(draft);
    if (Object.keys(errs).length > 0) {
      setDrafts(d => d.map((dft, i) => i === idx ? { ...dft, errors: errs } : dft));
      return;
    }
    setGuests(g => [...g, draft]);
    setDrafts(d => d.filter((_, i) => i !== idx));
  }

  function handleRemoveDraft(idx: number) {
    setDrafts(d => d.filter((_, i) => i !== idx));
  }

  function handleModuleDrop(idx: number, e: React.DragEvent) {
    e.preventDefault();
    const moduleKey = e.dataTransfer.getData('moduleKey');
    setDrafts(d => d.map((draft, i) => {
      if (i !== idx) return draft;
      if (moduleKey) {
        const newModules = { ...draft.modules };
        if (Array.isArray(newModules[moduleKey])) {
          newModules[moduleKey] = [...newModules[moduleKey], true];
        } else {
          newModules[moduleKey] = [true];
        }
        return { ...draft, modules: newModules };
      }
      return draft;
    }));
  }

  function handleRemoveModule(draftIdx: number, moduleKey: string, instanceIndex: number) {
    setDrafts(d => d.map((draft, i) => {
      if (i !== draftIdx) return draft;
      
      const newModules = { ...draft.modules };
      const newModuleValues = { ...draft.moduleValues };
      const newModuleFlightData = { ...draft.moduleFlightData };

      if (Array.isArray(newModules[moduleKey])) {
        newModules[moduleKey] = newModules[moduleKey].filter((_, i) => i !== instanceIndex);
        if (newModules[moduleKey].length === 0) {
          delete newModules[moduleKey];
        }
      }

      if (Array.isArray(newModuleValues[moduleKey])) {
        newModuleValues[moduleKey] = newModuleValues[moduleKey].filter((_, i) => i !== instanceIndex);
        if (newModuleValues[moduleKey].length === 0) {
          delete newModuleValues[moduleKey];
        }
      }

      if (Array.isArray(newModuleFlightData[moduleKey])) {
        newModuleFlightData[moduleKey] = newModuleFlightData[moduleKey].filter((_, i) => i !== instanceIndex);
        if (newModuleFlightData[moduleKey].length === 0) {
          delete newModuleFlightData[moduleKey];
        }
      }

      return { ...draft, modules: newModules, moduleValues: newModuleValues, moduleFlightData: newModuleFlightData };
    }));
  }

  function parseNewCsv(file: File): Promise<Partial<Draft>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) {
            return reject(new Error('File is empty.'));
          }
          const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) {
            return reject(new Error('CSV must have a header row and at least one data row.'));
          }
          const headers = lines[0].split(',').map(h => h.trim());
          const requiredHeaders = ['First Name', 'Last Name'];
          for (const requiredHeader of requiredHeaders) {
            if (!headers.includes(requiredHeader)) {
              return reject(new Error(`CSV is missing required header: ${requiredHeader}`));
            }
          }
          const moduleHeaders = GUEST_MODULES.map(m => m.label);
          const parsedData = lines.slice(1).map((line, rowIndex) => {
            const values = line.split(',').map(v => v.trim());
            const entry: any = {};
            headers.forEach((header, index) => {
              const value = values[index] || '';
              switch (header) {
                case 'Prefix': entry.prefix = value; break;
                case 'Gender': entry.gender = value; break;
                case 'First Name': entry.firstName = value; break;
                case 'Middle Name': entry.middleName = value; break;
                case 'Last Name': entry.lastName = value; break;
                case 'Country Code': entry.countryCode = value; break;
                case 'Contact Number': entry.contactNumber = value; break;
                case 'Email': entry.email = value; break;
                case 'ID Type': entry.idType = value; break;
                case 'ID Number': entry.idNumber = value; break;
                case 'Country of Origin': entry.idCountry = value; break;
                case 'Next of Kin Name': entry.nextOfKinName = value; break;
                case 'Next of Kin Email': entry.nextOfKinEmail = value; break;
                case 'Next of Kin Country Code': entry.nextOfKinPhoneCountry = value; break;
                case 'Next of Kin Number': entry.nextOfKinPhone = value; break;
                case 'Dietary': entry.dietary = value ? value.split(';').map(d => d.trim()) : []; break;
                case 'Medical/Accessibility': entry.medical = value ? value.split(';').map(d => d.trim()) : []; break;
                default:
                  // If header is a module, store in moduleValues
                  const moduleIdx = moduleHeaders.indexOf(header);
                  if (moduleIdx !== -1) {
                    if (!entry.moduleValues) entry.moduleValues = {};
                    entry.moduleValues[GUEST_MODULES[moduleIdx].key] = [value];
                  }
                  break;
              }
            });
            if (!entry.firstName || !entry.lastName) {
              throw new Error(`Row ${rowIndex + 2} is missing First Name or Last Name.`);
            }
            return entry;
          });
          resolve(parsedData);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to parse CSV file. Please check its format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read the file.'));
      reader.readAsText(file);
    });
  }

  async function handleCsvSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!csvFile) {
      setCsvError('Please select a file to upload.');
      return;
    }
    setIsCsvProcessing(true);
    setCsvError(null);
    try {
      const parsedGuests = await parseNewCsv(csvFile);
      const newDrafts = parsedGuests.map(guest => ({
        id: `draft-${Date.now()}-${Math.random()}`,
        prefix: guest.prefix || '',
        gender: guest.gender || '',
        firstName: guest.firstName || '',
        middleName: guest.middleName || '',
        lastName: guest.lastName || '',
        dob: guest.dob || '',
        contactNumber: guest.contactNumber || '',
        countryCode: guest.countryCode || '+44',
        email: guest.email || '',
        idType: guest.idType || '',
        idNumber: guest.idNumber || '',
        idCountry: guest.idCountry || '',
        nextOfKinName: guest.nextOfKinName || '',
        nextOfKinEmail: guest.nextOfKinEmail || '',
        nextOfKinPhoneCountry: guest.nextOfKinPhoneCountry || '+44',
        nextOfKinPhone: guest.nextOfKinPhone || '',
        dietary: guest.dietary || [],
        medical: guest.medical || [],
        modules: {},
        moduleValues: {},
        errors: {},
        dietaryInput: '',
        medicalInput: '',
      }));

      setDrafts(d => [...d, ...newDrafts]);

      // Success: close modal and reset state
      setIsCsvModalOpen(false);
      setCsvFile(null);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsCsvProcessing(false);
    }
  }

  function CsvUploadModal() {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <form
          onSubmit={handleCsvSubmit}
          style={{
            background: isDark ? 'rgba(30,30,30,0.95)' : '#fff',
            borderRadius: 16,
            padding: '32px 40px',
            width: 480,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.7)' : '0 5px 30px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            color: isDark ? '#fff' : '#222',
            border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid #e5e7eb',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)'
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: isDark ? '#fff' : '#222' }}>Upload Guests CSV</div>
          <p style={{ color: isDark ? '#cbd5e1' : '#555', fontSize: 15, marginBottom: 24, textAlign: 'center', maxWidth: 380, lineHeight: 1.5 }}>
             Select a CSV file to create draft guest forms.
             Required columns are 'First Name' and 'Last Name'.
           </p>

           <label
             htmlFor="csv-upload-input"
             style={{
               display: 'flex', alignItems: 'center', justifyContent: 'space-between',
               width: '100%',
               background: isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb',
               border: isDark ? '1.5px solid rgba(255,255,255,0.13)' : '1.5px solid #d1d5db',
               borderRadius: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 16
             }}
           >
             <span style={{ color: isDark ? '#fff' : '#333', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               {csvFile ? csvFile.name : 'No file chosen'}
             </span>
             <span style={{
               background: isDark ? 'rgba(255,255,255,0.10)' : '#374151',
               color: isDark ? '#fff' : '#fff',
               borderRadius: 6, padding: '6px 18px',
               fontWeight: 500, fontSize: 14, marginLeft: 16, flexShrink: 0,
               border: isDark ? '1.5px solid rgba(255,255,255,0.13)' : 'none',
               boxShadow: isDark ? '0 2px 8px #0003' : '0 1px 4px #0001',
             }}>
               Choose File
             </span>
           </label>
           <input
             id="csv-upload-input"
             type="file"
             accept=".csv,text/csv"
             style={{ display: 'none' }}
             disabled={isCsvProcessing}
             onChange={e => {
               const file = e.target.files?.[0] || null;
               setCsvFile(file);
               setCsvError(null);
             }}
           />

           {csvError && (
             <div style={{ width: '100%', color: '#c53030', background: '#fed7d7', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, textAlign: 'center' }}>
               {csvError}
             </div>
           )}

           <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
             <button
               type="button"
               onClick={() => {
                 setIsCsvModalOpen(false);
                 setCsvFile(null);
                 setCsvError(null);
               }}
               disabled={isCsvProcessing}
               style={{
                 flex: 1,
                 background: isDark ? 'rgba(255,255,255,0.10)' : '#e5e7eb',
                 color: isDark ? '#fff' : '#374151',
                 fontWeight: 600, fontSize: 16,
                 border: isDark ? '1.5px solid rgba(255,255,255,0.13)' : 'none',
                 borderRadius: 8, padding: '12px 0', cursor: 'pointer',
                 boxShadow: isDark ? '0 2px 8px #0003' : '0 1px 4px #0001',
                 transition: 'background 0.2s, color 0.2s',
               }}
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={!csvFile || isCsvProcessing}
               style={{
                 flex: 2,
                 background: isDark ? 'linear-gradient(135deg, #374151 0%, #111827 100%)' : '#1f2937',
                 color: '#fff',
                 fontWeight: 600, fontSize: 16,
                 border: isDark ? '1.5px solid rgba(255,255,255,0.13)' : 'none',
                 borderRadius: 8, padding: '12px 0',
                 cursor: (!csvFile || isCsvProcessing) ? 'not-allowed' : 'pointer',
                 opacity: (!csvFile || isCsvProcessing) ? 0.6 : 1,
                 boxShadow: isDark ? '0 2px 8px #0003' : '0 1px 4px #0001',
                 transition: 'background 0.2s, color 0.2s',
               }}
             >
               {isCsvProcessing ? 'Processing...' : 'Upload & Create Drafts'}
             </button>
           </div>
           <button
             type="button"
             style={{
               background: 'none',
               border: 'none',
               color: isDark ? '#cbd5e1' : '#4b5563',
               fontSize: 14,
               marginTop: 20,
               cursor: 'pointer',
               textDecoration: 'underline',
               transition: 'color 0.2s',
             }}
             onClick={handleDownloadCSVTemplate}
             disabled={isCsvProcessing}
           >
             Download CSV
           </button>
        </form>
      </div>
    );
  }

  async function handleRemoveGuest(idx: number) {
    const guestToRemove = guests[idx];

    // If the guest has an ID, it means it's saved in Supabase and needs to be deleted
    if (guestToRemove.id && eventId) {
        try {
          // Delete from Supabase using the guest's ID
          await deleteGuest(guestToRemove.id);
          console.log('Guest deleted from Supabase successfully');
          
          // Remove from local state
          setGuests(g => g.filter((_, i) => i !== idx));
          
          // If we're in edit mode, navigate back to guests tab
          if (editGuestIdx !== null) {
            navigate(`/event/${eventId}?tab=guests`);
          }
        } catch (error) {
          console.error('Error deleting guest from Supabase:', error);
          alert('Failed to delete guest. Please try again.');
        }
        return;
    }

    // If in edit mode and guest is not in Supabase yet, try to find and delete it
    if (editGuestIdx !== null && !isGroup) {
        if (!eventId) return;
        
        try {
          // Get all guests from Supabase to find the one to delete
          const supabaseGuests = await getGuests(eventId);
          const guestToDelete = supabaseGuests[editGuestIdx];
          
          if (guestToDelete && guestToDelete.id) {
            // Delete from Supabase
            await deleteGuest(guestToDelete.id);
            console.log('Guest deleted from Supabase successfully');
            navigate(`/event/${eventId}?tab=guests`);
          } else {
            console.warn('Guest not found in Supabase, navigating back');
            navigate(`/event/${eventId}?tab=guests`);
          }
        } catch (error) {
          console.error('Error deleting guest from Supabase:', error);
          alert('Failed to delete guest. Please try again.');
        }
        return;
    }
    
    // If guest is not in Supabase (no ID), just remove from local state
    setGuests(g => g.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!eventId) {
        console.error('Save failed: no eventId');
        return;
    }

    const guestsToProcess = [...guests, ...drafts];

    if (guestsToProcess.length === 0) {
        // If there's nothing to save, just go back to the dashboard.
        navigate(`/event/${eventId}?tab=guests`, { replace: true });
        return;
    }

    // Check if user is logged in
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.error('No user logged in');
        alert('You must be logged in to save guests. Please log in and try again.');
        return;
    }

    // Convert guests to Supabase format and save
    const guestsForSupabase = guestsToProcess.map(guest => ({
      event_id: eventId,
      company_id: currentUser.company_id || '',
      first_name: guest.firstName,
      middle_name: guest.middleName || '',
      last_name: guest.lastName,
      email: guest.email,
      contact_number: guest.contactNumber,
      country_code: guest.countryCode,
      id_type: guest.idType,
      id_number: guest.idNumber,
      id_country: guest.idCountry || '',
      dob: guest.dob || undefined,
      gender: guest.gender || '',
      group_id: isGroup ? `group-${Date.now()}` : undefined,
      group_name: isGroup ? groupName : undefined,
      next_of_kin_name: guest.nextOfKinName || '',
      next_of_kin_email: guest.nextOfKinEmail || '',
      next_of_kin_phone_country: guest.nextOfKinPhoneCountry || '',
      next_of_kin_phone: guest.nextOfKinPhone || '',
      dietary: guest.dietary || [],
      medical: guest.medical || [],
      modules: guest.modules || {},
      module_values: guest.moduleValues || {},
      prefix: guest.prefix || '',
      status: 'pending',
      created_by: currentUser.id || undefined
    }));

    console.log('Saving guests to Supabase:', guestsForSupabase);

    // Save to Supabase
    addMultipleGuests(guestsForSupabase)
      .then(() => {
        console.log('Guests saved to Supabase successfully');
        // Reset state and navigate
        setGuests([]);
        setDrafts([]);
        setIsGroup(false);
        setGroupName('');
        setGroupNameConfirmed(false);
        navigate(`/event/${eventId}?tab=guests`, { replace: true });
      })
      .catch(error => {
        console.error('Error saving guests to Supabase:', error);
        alert('Failed to save guests. Please try again.');
      });
  }

  async function handleDeleteGroup() {
    if (editGuestIdx !== null && guests.length > 0 && guests[0].groupId) {
        if (!eventId) return;
        
        const groupIdToDelete = guests[0].groupId;
        
        try {
          // Delete the entire group from Supabase
          await deleteGuestsByGroupId(groupIdToDelete);
          console.log('Group deleted from Supabase successfully');
          navigate(`/event/${eventId}?tab=guests`);
        } catch (error) {
          console.error('Error deleting group from Supabase:', error);
          alert('Failed to delete group. Please try again.');
        }
    } else {
        setGuests([]);
        setIsGroup(false);
        setGroupName('');
    }
  }

  function handleConfirmDelete() {
    if (!showDeleteConfirm) return;

    const { type, index } = showDeleteConfirm;

    if (type === 'guest' && index !== undefined) {
        handleRemoveGuest(index);
    } else if (type === 'draft' && index !== undefined) {
        handleRemoveDraft(index);
    } else if (type === 'group') {
        handleDeleteGroup();
    }
    setShowDeleteConfirm(null);
  }

  function handleTagInput(idx: number, key: 'dietaryInput' | 'medicalInput', value: string) {
    setDrafts(d => d.map((draft, i) => i === idx ? { ...draft, [key]: value } : draft));
  }

  function handleAddTag(idx: number, key: 'dietary' | 'medical', tag: string) {
    setDrafts(d => d.map((draft, i) => i === idx ? { ...draft, [key]: [...(draft[key] || []), tag] } : draft));
  }

  function handleRemoveTag(idx: number, key: 'dietary' | 'medical', tagIdx: number) {
    setDrafts(d => d.map((draft, i) => i === idx ? { ...draft, [key]: draft[key].filter((_, j) => j !== tagIdx) } : draft));
  }

  function handleDownloadCSVTemplate() {
    const moduleHeaders = GUEST_MODULES.map(m => m.label);
    const headers = [
      'Prefix', 'Gender', 'First Name', 'Middle Name', 'Last Name',
      'Country Code', 'Contact Number', 'Email',
      'ID Type', 'ID Number', 'Country of Origin',
      'Next of Kin Name', 'Next of Kin Email', 'Next of Kin Country Code', 'Next of Kin Number',
      'Dietary', 'Medical/Accessibility',
      ...moduleHeaders
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

  function handleGuestCardClick(idx: number) {
    setExpandedGuestIndex(expandedGuestIndex === idx ? null : idx);
  }

  function parseMRZ(mrzText: string, draftIndex: number) {
    const lines = mrzText
      .split('\n')
      .map(line => line.replace(/[^A-Z0-9<]/gi, '').trim())
      .filter(line => line.length > 25);
    const mrzStartIdx = lines.findIndex(line => /^P<[A-Z0-9]{3}/.test(line));
    if (mrzStartIdx === -1 || !lines[mrzStartIdx + 1]) {
      setScannerState(s => ({ ...s, processing: false, message: 'Could not find MRZ code. Please try a clearer image.' }));
      return;
    }
    const line1 = lines[mrzStartIdx];
    const line2 = lines[mrzStartIdx + 1];

    const nameSection = line1.substring(5);
    const [lastNameRaw, firstAndMiddleRaw] = nameSection.split('<<');
    const lastName = lastNameRaw.replace(/</g, ' ').replace(/[^A-Z ]/gi, '').trim();
    const firstAndMiddle = (firstAndMiddleRaw || '').replace(/</g, ' ').replace(/[^A-Z ]/gi, '').trim();
    const [firstName, ...middleNamesArr] = firstAndMiddle.split(' ').filter(Boolean);
    const middleName = middleNamesArr.join(' ');

    let passportNumber = line2.substring(0, 9).replace(/</g, '');
    let nationality = line2.substring(10, 13).replace(/</g, '');
    let dob = line2.substring(13, 19);
    let sex = line2.substring(20, 21).replace(/</g, '');
    let expiry = line2.substring(21, 27);

    // DOB formatting
    let year = parseInt(dob.substring(0, 2), 10);
    const month = dob.substring(2, 4);
    const day = dob.substring(4, 6);
    year += (year < (new Date().getFullYear() % 100) + 1) ? 2000 : 1900;
    const formattedDob = `${year}-${month}-${day}`;

    let countryName = '';
    if (/^[A-Z]{3}$/.test(nationality)) {
      countryName = countryList.getName(nationality) || nationality;
    }
    if (!/^[A-Z0-9]+$/.test(passportNumber)) passportNumber = '';

    handleDraftChange(draftIndex, 'firstName', firstName || '');
    handleDraftChange(draftIndex, 'middleName', middleName || '');
    handleDraftChange(draftIndex, 'lastName', lastName || '');
    handleDraftChange(draftIndex, 'idType', 'Passport');
    handleDraftChange(draftIndex, 'idNumber', passportNumber);
    handleDraftChange(draftIndex, 'idCountry', countryName);
    handleDraftChange(draftIndex, 'dob', formattedDob);
    handleDraftChange(draftIndex, 'gender', sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : 'Other');

    setScannerState(s => ({ ...s, processing: false, show: false, message: 'Scan successful!' }));
  }

  async function processImageWithOCR(imageUrl: string, draftIndex: number) {
    if (!imageUrl) return;
    setScannerState(s => ({ ...s, processing: true, message: 'Recognizing text from image...' }));
    try {
      const result = await Tesseract.recognize(imageUrl, 'eng');
      parseMRZ(result.data.text, draftIndex);
    } catch (error) {
      console.error('OCR Error:', error);
      setScannerState(s => ({ ...s, processing: false, message: 'An error occurred during OCR. Please try again.' }));
    }
  }

  function handleStopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }

  function handleModalClose() {
    handleStopCamera();
    setScannerState({ show: false, draftIndex: null, processing: false, imageUrl: null, message: '' });
    setScannerTab('upload');
  }

  async function handleStartCamera() {
    setScannerTab('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setScannerState(s => ({ ...s, message: 'Could not access camera. Please check permissions.' }));
    }
  }

  function handleCapture() {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg');
        setScannerState(s => ({ ...s, imageUrl }));
        handleStopCamera();
        if (scannerState.draftIndex !== null) {
          processImageWithOCR(imageUrl, scannerState.draftIndex);
        }
      }
    }
  }

  const labelStyle = (isDark: boolean) => ({ fontWeight: 500, fontSize: 13, marginBottom: 4, color: isDark ? '#fff' : '#333', letterSpacing: 0.2 });
  const inputStyle = (isDark: boolean) => ({ borderRadius: 8, background: isDark ? 'rgba(0,0,0,0)' : '#f7f8fa', border: isDark ? '1.5px solid rgba(255,255,255,0.13)' : '1.5px solid #d1d5db', padding: 10, fontSize: 15, height: 38, width: '100%', color: isDark ? '#fff' : '#000', transition: 'background 0.2s, color 0.2s' });

  function handleGuestChange(guestIdx: number, key: keyof Guest, value: any) {
    setGuests(guests.map((guest, i) => i === guestIdx ? { ...guest, [key]: value } : guest));
  }
  
  function handleGuestTagInputChange(guestIdx: number, key: 'dietaryInput' | 'medicalInput', value: string) {
    setGuests(guests.map((guest, i) => i === guestIdx ? { ...guest, [key]: value } : guest));
  }
  
  function handleGuestTagAdd(guestIdx: number, key: 'dietary' | 'medical', tag: string) {
    setGuests(guests.map((guest, i) => {
      if (i === guestIdx) {
        const existingTags = guest[key] || [];
        return { ...guest, [key]: [...existingTags, tag], [`${key}Input`]: '' };
      }
      return guest;
    }));
  }
  
  function handleGuestTagRemove(guestIdx: number, key: 'dietary' | 'medical', tagIndexToRemove: number) {
    setGuests(guests.map((guest, i) => {
      if (i === guestIdx) {
        const existingTags = guest[key] || [];
        return { ...guest, [key]: existingTags.filter((_, tagIdx) => tagIdx !== tagIndexToRemove) };
      }
      return guest;
    }));
  }
  
  function handleGuestModuleDrop(guestIdx: number, e: React.DragEvent) {
      e.preventDefault();
      const moduleKey = e.dataTransfer.getData('moduleKey');
      setGuests(guests.map((guest, i) => {
          if (i !== guestIdx || !moduleKey) return guest;
          
          const newModules = { ...guest.modules };
          if (Array.isArray(newModules[moduleKey])) {
              newModules[moduleKey].push(true);
          } else {
              newModules[moduleKey] = [true];
          }
          return { ...guest, modules: newModules };
      }));
  }
  
  function handleGuestModuleRemove(guestIdx: number, moduleKey: string, instanceIndex: number) {
    setGuests(guests.map((guest, i) => {
        if (i !== guestIdx) return guest;
        
        const newModules = { ...guest.modules };
        const newModuleValues = { ...guest.moduleValues };
  
        if (Array.isArray(newModules[moduleKey])) {
          newModules[moduleKey] = newModules[moduleKey].filter((_, i) => i !== instanceIndex);
          if (newModules[moduleKey].length === 0) {
            delete newModules[moduleKey];
          }
        }
  
        if (Array.isArray(newModuleValues[moduleKey])) {
          newModuleValues[moduleKey] = newModuleValues[moduleKey].filter((_, i) => i !== instanceIndex);
          if (newModuleValues[moduleKey].length === 0) {
            delete newModuleValues[moduleKey];
          }
        }
  
        const newModuleFlightData = { ...guest.moduleFlightData };
        if (Array.isArray(newModuleFlightData[moduleKey])) {
          newModuleFlightData[moduleKey] = newModuleFlightData[moduleKey].filter((_, i) => i !== instanceIndex);
          if (newModuleFlightData[moduleKey].length === 0) {
            delete newModuleFlightData[moduleKey];
          }
        }
  
        return { ...guest, modules: newModules, moduleValues: newModuleValues, moduleFlightData: newModuleFlightData };
    }));
  }
  
  async function handleGuestFlightData(guestIdx: number, moduleKey: string, instanceIndex: number, flightNumber: string, flightDate: string) {
    setGuests(guests => guests.map((g, i) => {
        if (i !== guestIdx) return g;
        const newModuleFlightData = { ...g.moduleFlightData };
        if (!Array.isArray(newModuleFlightData[moduleKey])) newModuleFlightData[moduleKey] = new Array(g.modules[moduleKey].length).fill(null);
        newModuleFlightData[moduleKey][instanceIndex] = { status: 'loading', data: null };
        return { ...g, moduleFlightData: newModuleFlightData };
    }));

    const data = await fetchFlightData(flightNumber, flightDate);

    setGuests(guests => guests.map((g, i) => {
        if (i !== guestIdx) return g;
        const newModuleFlightData = { ...g.moduleFlightData };
        if (data) {
            newModuleFlightData[moduleKey][instanceIndex] = { status: 'found', data };
        } else {
            newModuleFlightData[moduleKey][instanceIndex] = { status: 'not_found', data: null };
        }
        return { ...g, moduleFlightData: newModuleFlightData };
    }));
  }

  return (
    <div style={{ 
      display: 'flex', 
      background: colors.bg, 
      minHeight: '100vh',
      color: colors.text,
      transition: 'background 0.3s, color 0.3s'
    }}>
      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: 40, 
        fontFamily: 'Roboto, Arial, system-ui, sans-serif', 
        position: 'relative', 
        height: '100vh', 
        overflowY: 'auto' 
      }}>
        {/* Header with Glass Effect */}
        <div style={{
          ...getGlassStyles(isDark),
          padding: '32px',
          marginBottom: '32px',
          position: 'sticky',
          top: '0',
          zIndex: 10
        }}>
          <div style={{ 
            fontSize: 36, 
            fontWeight: 500, 
            marginBottom: 8,
            color: colors.text
          }}>
            {eventDetails?.name || 'Event'}
          </div>
          <hr style={{ 
            margin: '12px 0 8px 0', 
            border: 'none', 
            borderTop: `2px solid ${colors.border}` 
          }} />
          <div style={{ 
            fontSize: 26, 
            fontWeight: 500, 
            marginBottom: 0, 
            marginTop: 0, 
            textAlign: 'left',
            color: colors.textSecondary
          }}>
            Add Guests
          </div>
          {dateRange && (
            <div style={{ fontSize: 16, color: colors.textSecondary, marginTop: 4 }}>{dateRange}</div>
          )}
        </div>

        {/* Action Buttons with Glass Effect */}
        <div style={{ 
          maxWidth: 1100, 
          marginLeft: 'auto', 
          marginRight: 'auto', 
          marginBottom: 24 
        }}>
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            alignItems: 'center' 
          }}>
            <button
              onClick={() => setIsGroup(!isGroup)}
              style={{
                ...getButtonStyles(isDark, isGroup ? 'primary' : 'secondary'),
                fontSize: 18,
                padding: '12px 32px',
                minWidth: '165px',
                border: isGroup ? undefined : `1px solid ${colors.border}`
              }}
            >
              Create as Group
            </button>
            <button
              onClick={handleAddDraft}
              style={{ ...getButtonStyles(isDark, 'primary'), fontSize: 18, padding: '14px 34px', minWidth: '165px' }}
            >
              Add {isGroup ? 'Group Member' : 'New Guest'}
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              style={{ ...getButtonStyles(isDark, 'secondary'), fontSize: 18, padding: '12px 32px', minWidth: '145px' }}
            >
              Upload from CSV
            </button>
          </div>
        </div>

        {/* Group Name Input (if grouping) with Glass Effect */}
        {isGroup && (
          <div style={{ 
            marginBottom: 24, 
            maxWidth: 500 
          }}>
            <label style={{ 
              fontWeight: 600, 
              fontSize: 16, 
              color: colors.text, 
              marginBottom: 8, 
              display: 'block' 
            }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Enter group name (e.g. Smith Family)"
              style={{
                ...inputStyle(isDark),
                width: '100%',
                padding: '12px 16px',
                fontSize: 18,
                height: 48,
                marginBottom: 8
              }}
            />
          </div>
        )}

        {/* Draft/Guest Cards with Glass Effect */}
        {drafts.map((draft, idx) => (
          <div key={`draft-${idx}`} style={{
            ...getGlassStyles(isDark),
            border: expandedDraftIndex === idx 
              ? `2px solid ${isDark ? '#ffffff' : '#000000'}` 
              : `2px solid ${colors.border}`,
            marginBottom: 32,
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
            transition: 'all 0.3s ease-in-out',
            cursor: expandedDraftIndex !== idx ? 'pointer' : 'default',
            position: 'relative'
          }}
            onClick={() => expandedDraftIndex !== idx && setExpandedDraftIndex(idx)}
          >
            {/* Card Title */}
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              padding: '18px 24px 0 24px',
              letterSpacing: 0.2,
              textShadow: '0 2px 8px #0007',
              minHeight: 32
            }}>
              {(draft.firstName || draft.lastName)
                ? `${draft.firstName || ''}${draft.firstName && draft.lastName ? ' ' : ''}${draft.lastName || ''}`
                : `New Guest ${idx + 1}`}
            </div>
            {expandedDraftIndex === idx ? (
              <div style={{ padding: 20, position: 'relative' }}>
                <button
                  onClick={() => setExpandedDraftIndex(null)}
                  title="Collapse"
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 60,
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    color: '#fff',
                    fontSize: 18,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button
                  onClick={() => handleRemoveDraft(idx)}
                  title="Delete Draft"
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    ...getButtonStyles(isDark, 'danger'),
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    fontSize: 16
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path></svg>
                </button>
                {/* --- FIELD ROWS --- */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 24 }}>
                  {/* Row 1: Prefix, Gender, First Name, Middle Name, Last Name */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle(isDark)}>Prefix</label>
                      <select value={draft.prefix} onChange={e => handleDraftChange(idx, 'prefix', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}}>
                        <option value="">Prefix</option>
                        {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle(isDark)}>Gender</label>
                      <select value={draft.gender} onChange={e => handleDraftChange(idx, 'gender', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}}>
                        <option value="">Gender</option>
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle(isDark)}>First Name</label>
                      <input value={draft.firstName} onChange={e => handleDraftChange(idx, 'firstName', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="First Name" />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle(isDark)}>Middle Name</label>
                      <input value={draft.middleName} onChange={e => handleDraftChange(idx, 'middleName', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Middle Name" />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle(isDark)}>Last Name</label>
                      <input value={draft.lastName} onChange={e => handleDraftChange(idx, 'lastName', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Last Name" />
                    </div>
                  </div>
                  {/* Row 2: Country Code, Contact Number, Email */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle(isDark)}>Country Code</label>
                      <input value={draft.countryCode} onChange={e => handleDraftChange(idx, 'countryCode', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="+44" />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle(isDark)}>Contact Number</label>
                      <input value={draft.contactNumber} onChange={e => handleDraftChange(idx, 'contactNumber', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Contact Number" />
                    </div>
                    <div style={{ flex: 3 }}>
                      <label style={labelStyle(isDark)}>Email</label>
                      <input value={draft.email} onChange={e => handleDraftChange(idx, 'email', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Email" />
                    </div>
                  </div>
                  {/* Row 3: ID Type (custom dropdown), ID Number, Country of Origin (dropdown) */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle(isDark)}>ID Type</label>
                      <select value={draft.idType} onChange={e => handleDraftChange(idx, 'idType', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}}>
                        <option value="">ID Type</option>
                        <option value="Passport">Passport</option>
                        <option value="Identity Card">Identity Card</option>
                        <option value="Drivers License">Drivers License</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle(isDark)}>ID Number</label>
                      <input value={draft.idNumber} onChange={e => handleDraftChange(idx, 'idNumber', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="ID Number" />
                    </div>
                    <div style={{ flex: 3 }}>
                      <label style={labelStyle(isDark)}>Country of Origin</label>
                      <div style={{ position: 'relative' }} ref={countryDropdownRef}>
                        <div
                          tabIndex={0}
                          style={{
                            ...inputStyle(isDark),
                            height: 40,
                            fontSize: 15,
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            color: draft.idCountry ? (isDark ? '#fff' : '#000') : '#888',
                            userSelect: 'none',
                            position: 'relative',
                          }}
                          onClick={() => setCountryDropdownOpen(idx === countryDropdownOpen ? null : idx)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') setCountryDropdownOpen(idx === countryDropdownOpen ? null : idx);
                            if (e.key === 'Escape') setCountryDropdownOpen(null);
                          }}
                        >
                          {draft.idCountry || 'Country'}
                          <span style={{ marginLeft: 8, fontSize: 18, color: isDark ? '#fff' : '#000' }}>▼</span>
                        </div>
                        {countryDropdownOpen === idx && (
                          <div style={{
                            position: 'absolute',
                            top: 44,
                            left: 0,
                            width: '100%',
                            maxHeight: 220,
                            overflowY: 'auto',
                            background: isDark ? 'rgba(0,0,0,0)' : '#fff',
                            border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.13)' : '#d1d5db'}`,
                            borderRadius: 12,
                            zIndex: 100,
                            boxShadow: isDark ? '0 4px 24px #000a' : '0 2px 8px #0002',
                            padding: 4,
                          }}>
                            {COUNTRIES.map((c: string) => (
                              <div
                                key={c}
                                tabIndex={0}
                                style={{
                                  padding: '8px 14px',
                                  color: isDark ? '#fff' : '#000',
                                  background: draft.idCountry === c ? (isDark ? 'rgba(255,255,255,0.08)' : '#e0e7ff') : 'transparent',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontWeight: draft.idCountry === c ? 700 : 400,
                                  fontSize: 15,
                                  outline: 'none',
                                  marginBottom: 2,
                                }}
                                onClick={() => {
                                  handleDraftChange(idx, 'idCountry', c);
                                  setCountryDropdownOpen(null);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    handleDraftChange(idx, 'idCountry', c);
                                    setCountryDropdownOpen(null);
                                  }
                                }}
                              >
                                {c}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Row 4: Next of Kin Name, Next of Kin Email, Next of Kin Contact Number (country code + number) */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle(isDark)}>Next of Kin Name</label>
                      <input value={draft.nextOfKinName} onChange={e => handleDraftChange(idx, 'nextOfKinName', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Next of Kin Name" />
                    </div>
                    <div style={{ flex: 3 }}>
                      <label style={labelStyle(isDark)}>Next of Kin Email</label>
                      <input value={draft.nextOfKinEmail} onChange={e => handleDraftChange(idx, 'nextOfKinEmail', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Next of Kin Email" />
                    </div>
                    <div style={{ flex: 3, display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle(isDark)}>Country Code</label>
                        <input value={draft.nextOfKinPhoneCountry} onChange={e => handleDraftChange(idx, 'nextOfKinPhoneCountry', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="+44" />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={labelStyle(isDark)}>Contact Number</label>
                        <input value={draft.nextOfKinPhone} onChange={e => handleDraftChange(idx, 'nextOfKinPhone', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Contact Number" />
                      </div>
                    </div>
                  </div>
                  {/* Row 5: Dietary (tag), Medical (tag) */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle(isDark)}>Dietary</label>
                      <input value={draft.dietaryInput || ''} onChange={e => handleTagInput(idx, 'dietaryInput', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Add dietary requirement and press Enter" onKeyDown={e => { if (e.key === 'Enter' && draft.dietaryInput?.trim()) { handleAddTag(idx, 'dietary', draft.dietaryInput.trim()); e.preventDefault(); } }} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {(draft.dietary || []).map((tag, tagIdx) => (
                          <span key={tagIdx} style={{
                            background: isDark ? 'rgba(255,255,255,0.08)' : '#e0e7ff',
                            color: isDark ? '#fff' : '#3730a3',
                            borderRadius: 25,
                            padding: '6px 18px',
                            fontSize: 15,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            marginRight: 6,
                            marginBottom: 6
                          }}>
                            {tag}
                            <button onClick={() => handleRemoveTag(idx, 'dietary', tagIdx)} style={{
                              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                              color: isDark ? '#fff' : '#222',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#bbb'}`,
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              minWidth: 24,
                              minHeight: 24,
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              fontWeight: 700,
                              cursor: 'pointer',
                              marginLeft: 8,
                              boxShadow: isDark ? '0 2px 8px #0003' : '0 1px 4px #0001',
                              transition: 'background 0.2s, color 0.2s',
                              outline: 'none',
                            }} title="Remove tag">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle(isDark)}>Medical</label>
                      <input value={draft.medicalInput || ''} onChange={e => handleTagInput(idx, 'medicalInput', e.target.value)} style={{...inputStyle(isDark), height: 40, fontSize: 15, padding: '8px 12px'}} placeholder="Add medical/accessibility need and press Enter" onKeyDown={e => { if (e.key === 'Enter' && draft.medicalInput?.trim()) { handleAddTag(idx, 'medical', draft.medicalInput.trim()); e.preventDefault(); } }} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {(draft.medical || []).map((tag, tagIdx) => (
                          <span key={tagIdx} style={{
                            background: isDark ? 'rgba(255,255,255,0.08)' : '#e0e7ff',
                            color: isDark ? '#fff' : '#3730a3',
                            borderRadius: 25,
                            padding: '6px 18px',
                            fontSize: 15,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            marginRight: 6,
                            marginBottom: 6
                          }}>
                            {tag}
                            <button onClick={() => handleRemoveTag(idx, 'medical', tagIdx)} style={{
                              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                              color: isDark ? '#fff' : '#222',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#bbb'}`,
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              minWidth: 24,
                              minHeight: 24,
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              fontWeight: 700,
                              cursor: 'pointer',
                              marginLeft: 8,
                              boxShadow: isDark ? '0 2px 8px #0003' : '0 1px 4px #0001',
                              transition: 'background 0.2s, color 0.2s',
                              outline: 'none',
                            }} title="Remove tag">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* --- MODULES DROP ZONE & MODULE CARDS --- */}
                <div
                  style={{ 
                    ...getGlassStyles(isDark),
                    padding: 20, 
                    minHeight: 60, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    cursor: 'copy', 
                    marginTop: 18,
                    border: `2px dashed ${colors.border}`,
                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                  }}
                  onDrop={e => handleModuleDrop(idx, e)}
                  onDragOver={e => e.preventDefault()}
                >
                  <span style={{ 
                    color: colors.textSecondary, 
                    fontSize: 16, 
                    fontWeight: 500 
                  }}>
                    Drag modules here
                  </span>
                </div>
                {/* Display Added Modules with CreateItinerary visuals */}
                {Object.entries(draft.modules || {}).map(([key, instances]) => {
                  const module = GUEST_MODULES.find(m => m.key === key);
                  if (!module) return null;
                  const instanceArray = Array.isArray(instances) ? instances : [];
                  return instanceArray.map((_, index) => (
                    <div key={`${key}-${index}`} style={{
                      background: isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.8)',
                      border: `2px solid ${isDark ? 'rgba(255,255,255,0.10)' : '#e5e7eb'}`,
                      borderRadius: 16,
                      padding: 20,
                      marginTop: 16,
                      position: 'relative',
                      boxShadow: isDark ? '0 2px 12px #0006' : '0 1px 4px #0001',
                      color: isDark ? '#fff' : '#111',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)'
                    }}>
                      <button
                        onClick={() => handleRemoveModule(idx, key, index)}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                          color: isDark ? '#fff' : '#222',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#bbb'}`,
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          minWidth: 28,
                          minHeight: 28,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: isDark ? '0 2px 8px #0003' : '0 1px 4px #0001',
                          transition: 'background 0.2s, color 0.2s',
                          outline: 'none',
                        }}
                        title="Remove module"
                      >
                        ×
                      </button>
                      {/* Module-specific fields */}
                      {key === 'flightNumber' && (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#000', marginBottom: 4 }}>Flight Tracker</div>
                          <label style={labelStyle(isDark)}>Flight Number</label>
                          <input
                            type="text"
                            value={draft.moduleValues?.[key]?.[index] || ''}
                            onChange={e => {
                              const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                              newVals[index] = e.target.value;
                              handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                            }}
                            style={{
                              width: '100%',
                              borderRadius: 6,
                              background: isDark ? 'rgba(0,0,0,0)' : '#f9fafb',
                              border: '1px solid #d1d5db',
                              padding: '10px 12px',
                              fontSize: 14,
                              outline: 'none',
                              marginBottom: 4
                            }}
                            placeholder="e.g. BA2490"
                          />
                        </div>
                      )}
                      {key === 'seatNumber' && (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#fff' : '#000', marginBottom: 4 }}>Seat Number</div>
                          <label style={labelStyle(isDark)}>Seat Number</label>
                          <input
                            type="text"
                            value={draft.moduleValues?.[key]?.[index] || ''}
                            onChange={e => {
                              const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                              newVals[index] = e.target.value;
                              handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                            }}
                            style={{
                              width: '100%',
                              borderRadius: 8,
                              background: isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb',
                              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.13)' : '#d1d5db'}`,
                              color: isDark ? '#fff' : '#111',
                              padding: '10px 12px',
                              fontSize: 14,
                              outline: 'none',
                              marginBottom: 4
                            }}
                            placeholder="e.g. 14A"
                          />
                        </div>
                      )}
                      {key === 'eventReference' && (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#000', marginBottom: 4 }}>Event Reference</div>
                          <label style={labelStyle(isDark)}>Reference</label>
                          <input
                            type="text"
                            value={draft.moduleValues?.[key]?.[index] || ''}
                            onChange={e => {
                              const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                              newVals[index] = e.target.value;
                              handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                            }}
                            style={{
                              width: '100%',
                              borderRadius: 6,
                              background: isDark ? 'rgba(0,0,0,0)' : '#f9fafb',
                              border: '1px solid #d1d5db',
                              padding: '10px 12px',
                              fontSize: 14,
                              outline: 'none',
                              marginBottom: 4
                            }}
                            placeholder="Enter reference number"
                          />
                        </div>
                      )}
                      {key === 'hotelReservation' && (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#000', marginBottom: 4 }}>Hotel Tracker</div>
                          <label style={labelStyle(isDark)}>Hotel Location</label>
                          <input
                            type="text"
                            value={draft.moduleValues?.[key]?.[index]?.location || ''}
                            onChange={e => {
                              const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                              newVals[index] = { ...newVals[index], location: e.target.value };
                              handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                            }}
                            style={{
                              width: '100%',
                              borderRadius: 6,
                              background: isDark ? 'rgba(0,0,0,0)' : '#f9fafb',
                              border: '1px solid #d1d5db',
                              padding: '10px 12px',
                              fontSize: 14,
                              outline: 'none',
                              marginBottom: 8
                            }}
                            placeholder="Enter hotel location"
                          />
                          <label style={labelStyle(isDark)}>Hotel Booking Number</label>
                          <input
                            type="text"
                            value={draft.moduleValues?.[key]?.[index]?.bookingNumber || ''}
                            onChange={e => {
                              const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                              newVals[index] = { ...newVals[index], bookingNumber: e.target.value };
                              handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                            }}
                            style={{
                              width: '100%',
                              borderRadius: 6,
                              background: isDark ? 'rgba(0,0,0,0)' : '#f9fafb',
                              border: '1px solid #d1d5db',
                              padding: '10px 12px',
                              fontSize: 14,
                              outline: 'none',
                              marginBottom: 4
                            }}
                            placeholder="Enter booking number"
                          />
                        </div>
                      )}
                      {key === 'trainBookingNumber' && (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#000', marginBottom: 4 }}>Train Booking Number</div>
                          <label style={labelStyle(isDark)}>Booking Number</label>
                          <input
                            type="text"
                            value={draft.moduleValues?.[key]?.[index] || ''}
                            onChange={e => {
                              const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                              newVals[index] = e.target.value;
                              handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                            }}
                            style={{
                              width: '100%',
                              borderRadius: 6,
                              background: isDark ? 'rgba(0,0,0,0)' : '#f9fafb',
                              border: '1px solid #d1d5db',
                              padding: '10px 12px',
                              fontSize: 14,
                              outline: 'none',
                              marginBottom: 4
                            }}
                            placeholder="Enter train booking number"
                          />
                        </div>
                      )}
                      {key === 'coachBookingNumber' && (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#000', marginBottom: 4 }}>Coach Booking Number</div>
                          <label style={labelStyle(isDark)}>Booking Number</label>
                          <input
                            type="text"
                            value={draft.moduleValues?.[key]?.[index] || ''}
                            onChange={e => {
                              const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                              newVals[index] = e.target.value;
                              handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                            }}
                            style={{
                              width: '100%',
                              borderRadius: 6,
                              background: isDark ? 'rgba(0,0,0,0)' : '#f9fafb',
                              border: '1px solid #d1d5db',
                              padding: '10px 12px',
                              fontSize: 14,
                              outline: 'none',
                              marginBottom: 4
                            }}
                            placeholder="Enter coach booking number"
                          />
                        </div>
                      )}
                      {key === 'idUpload' && (
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#000', marginBottom: 4 }}>ID Upload</div>
                          <label style={labelStyle(isDark)}>Upload ID (PDF, PNG, JPG)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <label
                              htmlFor={`id-upload-${idx}-${index}`}
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                                color: isDark ? '#fff' : '#222',
                                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#bbb'}`,
                                borderRadius: 999,
                                padding: '8px 22px',
                                fontSize: 15,
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: isDark ? '0 2px 8px #0003' : '0 1px 4px #0001',
                                transition: 'background 0.2s, color 0.2s',
                                outline: 'none',
                                display: 'inline-block',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)'
                              }}
                            >
                              {draft.moduleValues?.[key]?.[index]?.name || 'Choose file'}
                            </label>
                            <input
                              id={`id-upload-${idx}-${index}`}
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                const newVals = Array.isArray(draft.moduleValues?.[key]) ? [...draft.moduleValues[key]] : [];
                                newVals[index] = file;
                                handleDraftChange(idx, 'moduleValues', { ...draft.moduleValues, [key]: newVals });
                              }}
                              style={{ display: 'none' }}
                            />
                            {draft.moduleValues?.[key]?.[index]?.name && (
                              <span style={{ color: isDark ? '#cbd5e1' : '#374151', fontSize: 14, marginLeft: 4 }}>
                                {draft.moduleValues[key][index].name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ));
                })}
              </div>
            ) : (
              // COLLAPSED VIEW
              <div style={{ padding: 24, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
                    {draft.firstName} {draft.lastName}
                  </div>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    {draft.email}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {drafts.length === 0 && guests.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 40px',
            color: '#666',
            fontSize: 18,
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
            <div style={{ marginBottom: 8 }}>No guests yet</div>
            <div style={{ fontSize: 16 }}>Click "Add New Guest" to get started</div>
          </div>
        )}

        {/* Footer with Glass Effect */}
        <div style={{
          ...getGlassStyles(isDark),
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 48,
          padding: '24px 32px',
          maxWidth: 1100,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          <button 
            style={{ 
              ...getButtonStyles(isDark, 'secondary'),
              fontSize: 18, 
              padding: '10px 36px', 
              minWidth: '125px'
            }} 
            onClick={() => navigate(`/event/${eventId}?tab=guests`)}
          >
            Cancel
          </button>
          <button
            style={{ 
              ...getButtonStyles(isDark, (drafts.length + guests.length) > 0 ? 'primary' : 'secondary'),
              fontSize: 18, 
              padding: '11px 37px',
              minWidth: '155px',
              opacity: (drafts.length + guests.length) > 0 ? 1 : 0.5,
              cursor: (drafts.length + guests.length) > 0 ? 'pointer' : 'not-allowed'
            }}
            onClick={handleSave}
            disabled={(drafts.length + guests.length) === 0}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Module Sidebar with Glass Effect */}
      <div style={{
        width: showModules ? 280 : 32,
        color: colors.text,
        transition: 'width 0.2s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: showModules ? 'flex-start' : 'center',
        padding: showModules ? '40px 24px' : '40px 0',
        minHeight: '100vh',
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
          : '0 8px 32px rgba(0,0,0,0.08)'
      }}>
        <button onClick={() => setShowModules(v => !v)} style={{ background: 'none', border: 'none', color: colors.text, fontSize: 22, cursor: 'pointer', alignSelf: showModules ? 'flex-end' : 'center', marginBottom: 24 }} title={showModules ? 'Hide Modules' : 'Show Modules'}>
          {showModules ? '→' : '←'}
        </button>
        {showModules && (
          <>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>Guest Modules</div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {GUEST_MODULES.map(module => (
                <div
                  key={module.key}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('moduleKey', module.key)}
                  style={{
                    background: isDark ? 'rgba(40,40,40,0.45)' : 'rgba(255,255,255,0.85)',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.13)' : '1px solid #bbb',
                    borderRadius: 12,
                    padding: '14px 18px',
                    cursor: 'grab',
                    userSelect: 'none',
                    boxShadow: isDark ? '0 2px 12px #0004' : '0 1px 4px #0001',
                    width: '100%',
                    color: isDark ? '#fff' : '#222',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  <div style={{ color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 16, marginBottom: module.description ? 4 : 0 }}>{module.label}</div>
                  {module.description && (
                    <div style={{ color: isDark ? '#cbd5e1' : '#666', fontSize: 12 }}>{module.description}</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {isCsvModalOpen && <CsvUploadModal />}
    </div>
  );
}