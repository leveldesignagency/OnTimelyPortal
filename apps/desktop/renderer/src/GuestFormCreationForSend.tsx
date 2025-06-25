import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import countryList from 'country-list';
import { codes as countryCallingCodes } from 'country-calling-code';
import { getCurrentUser } from './lib/auth';
import { addMultipleGuests, deleteGuest, deleteGuestsByGroupId } from './lib/supabase';

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

const COUNTRY_CODES = Array.from(
  new Map(
    countryCallingCodes
      .filter(c => c.countryCodes[0] && c.isoCode2)
      .map(c => [`+${c.countryCodes[0]}`, {
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

export default function GuestFormCreationForSend() {
  const { eventId: eventIdFromParams, guestIndex } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!eventId) return;

    if (guestIndex !== undefined) {
      const idx = parseInt(guestIndex, 10);
      const allGuests = JSON.parse(localStorage.getItem(`event_guests_${eventId}`) || '[]');
      const guestToEdit = allGuests[idx];

      if (guestToEdit) {
        setEditGuestIdx(idx);
        setDrafts([guestToEdit]);
      }
    } else {
        const savedDrafts = JSON.parse(localStorage.getItem(`event_guest_drafts_${eventId}`) || '[]');
        if (savedDrafts.length > 0) {
            setDrafts(savedDrafts);
        } else {
            handleAddDraft(); // Start with one empty draft if none are saved
        }
    }

    const events = JSON.parse(localStorage.getItem('timely_events') || '[]');
    const currentEvent = events.find((e: any) => e.id === eventId);
    if (currentEvent) {
      setEventName(currentEvent.name);
    }

    const savedGuests = JSON.parse(localStorage.getItem(`event_guests_${eventId}`) || '[]');
    setGuests(savedGuests);
  }, [eventId, guestIndex]);

  useEffect(() => {
    if (eventId && drafts.length > 0 && guestIndex === undefined) {
      localStorage.setItem(`event_guest_drafts_${eventId}`, JSON.stringify(drafts));
    }
  }, [drafts, eventId, guestIndex]);

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
                case 'Medical': entry.medical = value ? value.split(';').map(d => d.trim()) : []; break;
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
        countryCode: guest.countryCode || '+44',
        contactNumber: guest.contactNumber || '',
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
        moduleFlightData: {},
        errors: {},
        dietaryInput: '',
        medicalInput: '',
      }));
      setDrafts(prevDrafts => [...prevDrafts, ...newDrafts].filter(d => d.firstName)); // Add new and filter out empty ones
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
        background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <form
          onSubmit={handleCsvSubmit}
          style={{
            background: '#fff', borderRadius: 16, padding: '32px 40px', width: 480,
            boxShadow: '0 5px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Upload Guests CSV</div>
          <p style={{ color: '#555', fontSize: 15, marginBottom: 24, textAlign: 'center', maxWidth: 380, lineHeight: 1.5 }}>
            Select a CSV file to create draft guest forms.
            Required columns are 'First Name' and 'Last Name'.
          </p>

          <label
            htmlFor="csv-upload-input"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: '#f9fafb', border: '1.5px solid #d1d5db',
              borderRadius: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 16
            }}
          >
            <span style={{ color: '#333', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {csvFile ? csvFile.name : 'No file chosen'}
            </span>
            <span style={{
              background: '#374151', color: '#fff', borderRadius: 6, padding: '6px 18px',
              fontWeight: 500, fontSize: 14, marginLeft: 16, flexShrink: 0
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
                flex: 1, background: '#e5e7eb', color: '#374151', fontWeight: 600, fontSize: 16,
                border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!csvFile || isCsvProcessing}
              style={{
                flex: 2, background: '#1f2937', color: '#fff', fontWeight: 600, fontSize: 16,
                border: 'none', borderRadius: 8, padding: '12px 0',
                cursor: (!csvFile || isCsvProcessing) ? 'not-allowed' : 'pointer',
                opacity: (!csvFile || isCsvProcessing) ? 0.6 : 1
              }}
            >
              {isCsvProcessing ? 'Processing...' : 'Upload & Create Drafts'}
            </button>
          </div>
            <button
              type="button"
              style={{
                 background: 'none', border: 'none', color: '#4b5563', fontSize: 14,
                 marginTop: 20, cursor: 'pointer', textDecoration: 'underline'
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

    if (editGuestIdx !== null && !isGroup) {
        if (!eventId) return;
        
        // Get the guest from localStorage to get their ID
        const allGuests = JSON.parse(localStorage.getItem(`event_guests_${eventId}`) || '[]');
        const guestToDelete = allGuests[editGuestIdx];
        
        if (guestToDelete && guestToDelete.id) {
          try {
            // Delete from Supabase
            await deleteGuest(guestToDelete.id);
            console.log('Guest deleted from Supabase successfully');
            
            // Remove from localStorage
            allGuests.splice(editGuestIdx, 1);
            localStorage.setItem(`event_guests_${eventId}`, JSON.stringify(allGuests));
            navigate(`/event/${eventId}?tab=guests`);
          } catch (error) {
            console.error('Error deleting guest from Supabase:', error);
            alert('Failed to delete guest. Please try again.');
          }
        } else {
          // Fallback: just remove from localStorage if no ID
          allGuests.splice(editGuestIdx, 1);
          localStorage.setItem(`event_guests_${eventId}`, JSON.stringify(allGuests));
          navigate(`/event/${eventId}?tab=guests`);
        }
        return;
    }
    
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
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Failed to save guests. Error: ${error.message || 'Unknown error'}`);
      });
  }

  async function handleDeleteGroup() {
    if (editGuestIdx !== null && guests.length > 0 && guests[0].groupId) {
        if (!eventId) return;
        
        const groupIdToDelete = guests[0].groupId;
        const allGuests = JSON.parse(localStorage.getItem(`event_guests_${eventId}`) || '[]');
        const guestsInGroup = allGuests.filter((g: Guest) => g.groupId === groupIdToDelete);
        
        try {
          // Delete the entire group from Supabase
          await deleteGuestsByGroupId(groupIdToDelete);
          console.log('Group deleted from Supabase successfully');
          
          // Remove from localStorage
          const remainingGuests = allGuests.filter((g: Guest) => g.groupId !== groupIdToDelete);
          localStorage.setItem(`event_guests_${eventId}`, JSON.stringify(remainingGuests));
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
    setDrafts(d => d.map((draft, i) => i === idx ? { ...draft, [key]: draft[key].filter((_: any, j: number) => j !== tagIdx) } : draft));
  }

  function handleDownloadCSVTemplate() {
    const headers = [
      'Prefix', 'Gender', 'First Name', 'Middle Name', 'Last Name',
      'Country Code', 'Contact Number', 'Email',
      'ID Type', 'ID Number', 'Country of Origin',
      'Next of Kin Name', 'Next of Kin Email', 'Next of Kin Country Code', 'Next of Kin Number',
      'Dietary', 'Medical', 'Modules'
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

  const labelStyle = { fontWeight: 500, fontSize: 13, marginBottom: 4, color: '#333', letterSpacing: 0.2 };
  const inputStyle = { borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 15, height: 38, width: '100%' };

  function handleGuestChange(guestIdx: number, key: keyof Guest, value: any) {
    setGuests(guests.map((guest, i) => i === guestIdx ? { ...guest, [key]: value } : guest));
  }
  
  function handleGuestTagInputChange(guestIdx: number, key: 'dietaryInput' | 'medicalInput', value: string) {
    setGuests(guests.map((guest, i) => i === guestIdx ? { ...guest, [key]: value } : guest));
  }
  
  function handleGuestTagAdd(guestIdx: number, key: 'dietary' | 'medical', tag: string) {
    setGuests(guests.map((guest, i) => {
      if (i === guestIdx) {
        return { ...guest, [key]: [...(guest[key] || []), tag] };
      }
      return guest;
    }));
  }
  
  function handleGuestTagRemove(guestIdx: number, key: 'dietary' | 'medical', tagIndexToRemove: number) {
    setGuests(guests.map((guest, i) => {
      if (i === guestIdx) {
        return { ...guest, [key]: guest[key].filter((_: any, j: number) => j !== tagIndexToRemove) };
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
    <div className="flex bg-white dark:bg-gray-900 min-h-screen">
      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto p-10 font-sans text-gray-900 dark:text-gray-100 relative h-screen overflow-y-auto">
        <div className="text-4xl font-medium mb-0">{eventName}</div>
        <hr className="my-3 border-none border-t-2 border-gray-400 dark:border-gray-600" />
        <div className="text-2xl font-medium mb-6 mt-0 text-left">Add Guests</div>

        {/* Action Buttons */}
        {!editGuestIdx ? (
          <div className="max-w-1100 mx-auto mb-24">
            <div className="flex gap-16 items-center">
                <button
                    onClick={() => setIsGroup(!isGroup)}
                    className={`${
                        isGroup 
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' 
                            : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                    } border-2 border-gray-900 dark:border-gray-100 px-6 py-2 rounded-lg text-base font-medium cursor-pointer w-auto`}
                >
                    {isGroup ? '✓ Group' : 'Create Group'}
                </button>
                {isGroup && (
                    <div className="flex items-center flex-grow">
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter Group Name"
                            disabled={groupNameConfirmed}
                            className="h-11 flex-grow rounded-l-lg border-r-0 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3"
                        />
                        <button
                            onClick={handleConfirmGroupName}
                            disabled={groupNameConfirmed || !groupName.trim()}
                            className={`h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-2 border-gray-900 dark:border-gray-100 rounded-r-lg px-6 text-base ${
                                (groupNameConfirmed || !groupName.trim()) 
                                    ? 'cursor-not-allowed opacity-60' 
                                    : 'cursor-pointer opacity-100'
                            }`}
                        >
                            Confirm
                        </button>
                    </div>
                )}
            </div>
            <hr className="my-24 border-none border-t-1.5 border-gray-400 dark:border-gray-600" />
          </div>
        ) : null}

        {/* Rest of the component code */}
      </div>
    </div>
  );
} 