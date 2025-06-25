import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import countryList from 'country-list';
import { codes as countryCallingCodes } from 'country-calling-code';
import { getCurrentUser } from './lib/auth';
import { addMultipleGuests, getGuests, deleteGuest, deleteGuestsByGroupId } from './lib/supabase';

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

export default function CreateGuests() {
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

    const loadGuestDataForEdit = async () => {
      if (guestIndex !== undefined) {
        const idx = parseInt(guestIndex, 10);
        
        try {
          // Load guests from Supabase instead of localStorage
          const supabaseGuests = await getGuests(eventId);
          
          // Convert Supabase guest format to local format
          const convertedGuests = supabaseGuests.map((guest: any) => ({
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

          const guestToEdit = convertedGuests[idx];

          if (guestToEdit) {
            setGuests([]); // Clear guests state to avoid rendering the summary card
            setEditGuestIdx(idx);

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
          const guestToEdit = allGuests[idx];

          if (guestToEdit) {
            setGuests([]);
            setEditGuestIdx(idx);

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
    <div style={{ display: 'flex', background: '#fff', minHeight: '100vh' }}>
      {/* Main Content */}
      <div style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: 40, fontFamily: 'Roboto, Arial, system-ui, sans-serif', color: '#222', position: 'relative', height: '100vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 36, fontWeight: 500, marginBottom: 0 }}>{eventName}</div>
        <hr style={{ margin: '12px 0 8px 0', border: 'none', borderTop: '2px solid #bbb' }} />
        <div style={{ fontSize: 26, fontWeight: 500, marginBottom: 24, marginTop: 0, textAlign: 'left' }}>Add Guests</div>

        {/* Action Buttons */}
        {!editGuestIdx ? (
          <div style={{ maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button
                    onClick={() => setIsGroup(!isGroup)}
                    style={{
                        background: isGroup ? '#222' : '#fff',
                        color: isGroup ? '#fff' : '#222',
                        border: '2px solid #222',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 18,
                        padding: '12px 32px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    Create as Group
                </button>
                <button
                    onClick={handleAddDraft}
                    style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 18, padding: '14px 34px', cursor: 'pointer' }}
                >
                    Add {isGroup ? 'Group Member' : 'New Guest'}
                </button>
                <button
                    onClick={() => setIsCsvModalOpen(true)}
                    style={{ background: '#fff', color: '#222', border: '2px solid #222', borderRadius: 8, fontWeight: 500, fontSize: 18, padding: '12px 32px', cursor: 'pointer' }}
                >
                    Upload from CSV
                </button>
            </div>
            {isGroup && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <input
                  placeholder="Enter Group Name (e.g., Smith Family, Team Alpha)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  readOnly={groupNameConfirmed}
                  style={{
                    width: '100%',
                    maxWidth: 400,
                    padding: '12px 16px',
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1.5px solid #d1d5db',
                    background: groupNameConfirmed ? '#f8f9fa' : '#fff',
                    fontWeight: groupNameConfirmed ? 'bold' : 'normal',
                    transition: 'all 0.3s ease',
                  }}
                />
                <button
                  onClick={() => groupNameConfirmed ? setGroupNameConfirmed(false) : handleConfirmGroupName()}
                  style={{
                    background: '#222',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    height: '45px',
                    width: '45px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {groupNameConfirmed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          isGroup && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, alignItems: 'center', margin: '24px 0 32px 0', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
                <button
                    onClick={handleAddDraft}
                    style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 18, padding: '14px 32px', cursor: 'pointer' }}
                >
                    Add Group Member
                </button>
                <button
                  onClick={() => setShowDeleteConfirm({ type: 'group' })}
                  style={{
                    background: '#fef2f2',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 500,
                    fontSize: 18,
                    padding: '14px 32px',
                    cursor: 'pointer',
                    marginLeft: 16,
                  }}
                >
                  Delete Group
                </button>
            </div>
          )
        )}

        {drafts.map((draft, idx) => (
          <div key={idx} style={{
            background: '#fff',
            border: expandedDraftIndex === idx ? '2px solid #4f46e5' : '2px solid #bbb',
            borderRadius: 14,
            marginBottom: 32,
            boxShadow: expandedDraftIndex === idx ? '0 4px 16px rgba(0,0,0,0.1)' : '0 2px 8px #0001',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
            transition: 'all 0.3s ease-in-out',
          }}>
            {expandedDraftIndex === idx ? (
              // EXPANDED VIEW
              <div style={{ padding: 32, position: 'relative' }}>
                <button
                  onClick={() => setExpandedDraftIndex(null)}
                  title="Collapse"
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 76,
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    color: '#475569',
                    fontSize: 24,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button
                  onClick={() => {
                    setScannerState({ show: true, draftIndex: idx, processing: false, imageUrl: null, message: 'Upload or scan a passport to begin.' });
                    setScannerTab('upload');
                  }}
                  title="Scan Passport"
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    background: '#222',
                    border: 'none',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    zIndex: 10,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#444'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#222'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v3a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6h3"/><path d="M18 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M15 3h6v6"/><path d="m21 3-7.5 7.5"/></svg>
                </button>
                <div style={{ paddingTop: '40px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222', marginTop: 50 }}>GENDER & PREFIX</div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                    <select value={draft.prefix} onChange={e => handleDraftChange(idx, 'prefix', e.target.value)} style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }}>
                      <option value="">Prefix</option>
                      {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={draft.gender} onChange={e => handleDraftChange(idx, 'gender', e.target.value)} style={{ flex: 2, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }}>
                      <option value="">Gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>NAMES</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <input placeholder="First Name" value={draft.firstName} onChange={e => handleDraftChange(idx, 'firstName', e.target.value)} style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }} />
                    <input placeholder="Middle Name (Optional)" value={draft.middleName} onChange={e => handleDraftChange(idx, 'middleName', e.target.value)} style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }} />
                    <input placeholder="Last Name" value={draft.lastName} onChange={e => handleDraftChange(idx, 'lastName', e.target.value)} style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>DATE OF BIRTH</div>
                  <div style={{ marginBottom: 14 }}>
                    <input type="date" value={draft.dob} onChange={e => handleDraftChange(idx, 'dob', e.target.value)} style={{ width: '100%', borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>CONTACT INFORMATION</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <select value={draft.countryCode} onChange={e => handleDraftChange(idx, 'countryCode', e.target.value)} style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }}>
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <input placeholder="Contact Number" value={draft.contactNumber} onChange={e => handleDraftChange(idx, 'contactNumber', e.target.value)} style={{ flex: 2, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }} />
                    <input placeholder="Email" value={draft.email} onChange={e => handleDraftChange(idx, 'email', e.target.value)} style={{ flex: 2, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>DOCUMENTS</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <select value={draft.idType} onChange={e => handleDraftChange(idx, 'idType', e.target.value)} style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }}>
                      <option value="">Select ID Type</option>
                      <option value="Passport">Passport</option>
                      <option value="Identity Card">Identity Card</option>
                      <option value="Drivers License">Drivers License</option>
                    </select>
                    <input placeholder="ID Number" value={draft.idNumber} onChange={e => handleDraftChange(idx, 'idNumber', e.target.value)} style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }} />
                    <select value={draft.idCountry} onChange={e => handleDraftChange(idx, 'idCountry', e.target.value)} style={{ flex: 2, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }}>
                      <option value="">Country of Origin</option>
                      {COUNTRIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>NEXT OF KIN</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}>Next of Kin Name</label>
                      <input value={draft.nextOfKinName} onChange={e => handleDraftChange(idx, 'nextOfKinName', e.target.value)} style={{ ...inputStyle, fontSize: 18, height: 48 }} />
                    </div>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}>Next of Kin Email</label>
                      <input type="email" value={draft.nextOfKinEmail} onChange={e => handleDraftChange(idx, 'nextOfKinEmail', e.target.value)} style={{ ...inputStyle, fontSize: 18, height: 48 }} />
                    </div>
                    <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}>Next of Kin Number</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={draft.nextOfKinPhoneCountry} onChange={e => handleDraftChange(idx, 'nextOfKinPhoneCountry', e.target.value)} style={{ ...inputStyle, width: 110, flex: 'none', fontSize: 18, height: 48 }}>
                          {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                        </select>
                        <input value={draft.nextOfKinPhone} onChange={e => handleDraftChange(idx, 'nextOfKinPhone', e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 18, height: 48 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>DIETARY</div>
                  <div style={{ marginBottom: 14 }}>
                    <input
                      placeholder="Add dietary request and press Enter"
                      value={draft.dietaryInput || ''}
                      onChange={e => handleTagInput(idx, 'dietaryInput', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && draft.dietaryInput?.trim()) { handleAddTag(idx, 'dietary', draft.dietaryInput.trim()); handleTagInput(idx, 'dietaryInput', ''); e.preventDefault(); } }}
                      style={{ width: '100%', borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {(draft.dietary || []).map((tag: string, tagIdx: number) => (
                        <span key={tagIdx} style={{ background: '#eee', borderRadius: 16, padding: '6px 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {tag}
                          <button onClick={() => handleRemoveTag(idx, 'dietary', tagIdx)} style={{ background: 'none', border: 'none', color: '#888', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginLeft: 4 }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>MEDICAL</div>
                  <div style={{ marginBottom: 14 }}>
                    <input
                      placeholder="Add medical condition and press Enter"
                      value={draft.medicalInput || ''}
                      onChange={e => handleTagInput(idx, 'medicalInput', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && draft.medicalInput?.trim()) { handleAddTag(idx, 'medical', draft.medicalInput.trim()); handleTagInput(idx, 'medicalInput', ''); e.preventDefault(); } }}
                      style={{ width: '100%', borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 18, height: 48 }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {(draft.medical || []).map((tag: string, tagIdx: number) => (
                        <span key={tagIdx} style={{ background: '#eee', borderRadius: 16, padding: '6px 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {tag}
                          <button onClick={() => handleRemoveTag(idx, 'medical', tagIdx)} style={{ background: 'none', border: 'none', color: '#888', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginLeft: 4 }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {Object.values(draft.errors || {}).length > 0 && (
                    <div style={{ color: 'red', marginBottom: 8, fontSize: 14 }}>
                      {Object.values(draft.errors || {}).map((err: any, i: number) => <div key={i}>{err}</div>)}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {Object.entries(draft.modules || {}).map(([key, instances]) => {
                      const module = GUEST_MODULES.find(m => m.key === key);
                      if (!module) return null;

                      const instanceArray = Array.isArray(instances) ? instances : [];

                      return instanceArray.map((_, index) => (
                        <div key={`${key}-${index}`} style={{
                          background: '#f8f9fa',
                          borderRadius: 12,
                          padding: '20px',
                          border: '1px solid #e5e7eb',
                          position: 'relative'
                        }}>
                          <button
                            onClick={() => handleRemoveModule(idx, key, index)}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: 'transparent',
                              border: 'none',
                              color: '#9ca3af',
                              cursor: 'pointer',
                              fontSize: 28,
                              lineHeight: 1,
                              padding: '8px',
                              borderRadius: '50%',
                              width: 40,
                              height: 40,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.2s, background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.background = '#fee2e2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#9ca3af';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            ×
                          </button>
                          <div style={{ paddingRight: '40px' }}>
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ fontWeight: 600, fontSize: 16, color: '#374151' }}>{module.label}</label>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {module.key === 'flightNumber' ? (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input
                                    placeholder="e.g. BA2490"
                                    value={draft.moduleValues?.[key]?.[index]?.number || ''}
                                    onChange={e => {
                                      const newValues = { ...draft.moduleValues };
                                      if (!Array.isArray(newValues[key])) newValues[key] = new Array(instanceArray.length).fill({});
                                      newValues[key][index] = { ...(newValues[key][index] || {}), number: e.target.value };
                                      handleDraftChange(idx, 'moduleValues', newValues);
                                    }}
                                    style={{ flex: '2 1 auto', padding: '0 16px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 18, height: 48, background: '#fff', boxSizing: 'border-box' }}
                                  />
                                  <input
                                    type="date"
                                    value={draft.moduleValues?.[key]?.[index]?.date || ''}
                                    onChange={e => {
                                      const newValues = { ...draft.moduleValues };
                                      if (!Array.isArray(newValues[key])) newValues[key] = new Array(instanceArray.length).fill({});
                                      newValues[key][index] = { ...(newValues[key][index] || {}), date: e.target.value };
                                      handleDraftChange(idx, 'moduleValues', newValues);
                                    }}
                                    style={{ flex: '1 1 auto', padding: '0 16px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 18, height: 48, background: '#fff', boxSizing: 'border-box' }}
                                  />
                                  <button
                                    onClick={async () => {
                                      const flightInfo = draft.moduleValues?.[key]?.[index];
                                      if (flightInfo && flightInfo.number && flightInfo.date) {
                                        await handleGuestFlightData(idx, key, index, flightInfo.number, flightInfo.date);
                                      }
                                    }}
                                    style={{ flex: '0 0 auto', padding: '0 24px', cursor: 'pointer', background: '#222', color: 'white', fontWeight: 500, border: 'none', fontSize: 18, height: 48, borderRadius: 8, boxSizing: 'border-box' }}
                                  >
                                    Find
                                  </button>
                                </div>
                              ) : module.type === 'file' ? (
                                <div>
                                  <label htmlFor={`file-upload-${key}-${index}`} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: 48,
                                    background: '#fff',
                                    border: '1.5px dashed #d1d5db',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    fontSize: 16,
                                    transition: 'all 0.2s'
                                  }}>
                                    {draft.moduleValues?.[key]?.[index]?.name || 'Upload ID (PNG, JPG, PDF)'}
                                  </label>
                                  <input
                                    id={`file-upload-${key}-${index}`}
                                    type="file"
                                    accept="image/png,image/jpeg,.pdf"
                                    onChange={e => {
                                      const newValues = { ...draft.moduleValues };
                                      if (!Array.isArray(newValues[key])) {
                                        newValues[key] = new Array(instanceArray.length).fill(undefined);
                                      }
                                      newValues[key][index] = e.target.files?.[0];
                                      handleDraftChange(idx, 'moduleValues', newValues);
                                    }}
                                    style={{ display: 'none' }}
                                  />
                                </div>
                              ) : (
                                <input
                                  placeholder={module.placeholder}
                                  value={Array.isArray(draft.moduleValues?.[key]) ?
                                    draft.moduleValues[key][index] || '' :
                                    (index === 0 ? draft.moduleValues?.[key] || '' : '')}
                                  onChange={e => {
                                    const newValues = { ...draft.moduleValues };
                                    if (!Array.isArray(newValues[key])) {
                                      newValues[key] = new Array(instanceArray.length).fill('');
                                    }
                                    newValues[key][index] = e.target.value;
                                    handleDraftChange(idx, 'moduleValues', newValues);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    borderRadius: 8,
                                    border: '1.5px solid #d1d5db',
                                    fontSize: 18,
                                    height: 48,
                                    background: '#fff'
                                  }}
                                />
                              )}

                              {(() => {
                                const flightState = draft.moduleFlightData?.[key]?.[index];
                                if (!flightState || flightState.status === 'idle') {
                                  return module.description && <div style={{ fontSize: 13, color: '#666', paddingLeft: 4 }}>{module.description}</div>;
                                }
                                if (flightState.status === 'loading') {
                                  return <div style={{ marginTop: 8, padding: '12px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#4b5563', textAlign: 'center' }}>Loading flight data...</div>;
                                }
                                if (flightState.status === 'not_found') {
                                  return <div style={{ marginTop: 8, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 14, color: '#b91c1c', textAlign: 'center' }}>Flight not found. Please check the details and try again.</div>;
                                }
                                if (flightState.status === 'found' && flightState.data) {
                                  const flightData = flightState.data;
                                  return (
                                    <div style={{ marginTop: 8, padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                                      <p style={{ margin: '0 0 8px 0' }}><strong>Status:</strong> {flightData.flight_status}</p>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                          <p style={{ margin: 0, fontWeight: 'bold' }}>Departure</p>
                                          <p style={{ margin: '4px 0' }}>Airport: {flightData.departure.airport} ({flightData.departure.iata})</p>
                                          {flightData.departure.terminal && <p style={{ margin: '4px 0' }}>Terminal: {flightData.departure.terminal}</p>}
                                          {flightData.departure.gate && <p style={{ margin: '4px 0' }}>Gate: {flightData.departure.gate}</p>}
                                          <p style={{ margin: '4px 0' }}>Scheduled: {formatFlightTime(flightData.departure.scheduled, flightData.departure.timezone)}</p>
                                          {flightData.departure.estimated && <p style={{ margin: '4px 0' }}>Estimated: {formatFlightTime(flightData.departure.estimated, flightData.departure.timezone)}</p>}
                                          {flightData.departure.actual && <p style={{ margin: '4px 0' }}>Actual: {formatFlightTime(flightData.departure.actual, flightData.departure.timezone)}</p>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <p style={{ margin: 0, fontWeight: 'bold' }}>Arrival</p>
                                          <p style={{ margin: '4px 0' }}>Airport: {flightData.arrival.airport} ({flightData.arrival.iata})</p>
                                          {flightData.arrival.terminal && <p style={{ margin: '4px 0' }}>Terminal: {flightData.arrival.terminal}</p>}
                                          {flightData.arrival.gate && <p style={{ margin: '4px 0' }}>Gate: {flightData.arrival.gate}</p>}
                                          <p style={{ margin: '4px 0' }}>Scheduled: {formatFlightTime(flightData.arrival.scheduled, flightData.arrival.timezone)}</p>
                                          {flightData.arrival.estimated && <p style={{ margin: '4px 0' }}>Estimated: {formatFlightTime(flightData.arrival.estimated, flightData.arrival.timezone)}</p>}
                                          {flightData.arrival.actual && <p style={{ margin: '4px 0' }}>Actual: {formatFlightTime(flightData.arrival.actual, flightData.arrival.timezone)}</p>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      ));
                    })}
                  </div>
                  
                  <div
                    style={{ border: '2px dashed #d1d5db', borderRadius: 8, background: '#fff', padding: 24, minHeight: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'copy', marginTop: 24 }}
                    onDrop={e => handleModuleDrop(idx, e)}
                    onDragOver={e => e.preventDefault()}
                  >
                    <span style={{ color: '#9ca3af', fontSize: 16, fontWeight: 500 }}>Drag modules here</span>
                  </div>
                </div>
                {editGuestIdx === null && (
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      style={{ background: '#222', color: '#fff', fontWeight: 400, fontSize: 16, border: 'none', borderRadius: 20, padding: '8px 28px', minWidth: 90, cursor: 'pointer' }}
                      onClick={() => handleSaveDraft(idx)}
                    >Save</button>
                    <button
                      style={{ background: '#eee', color: '#222', fontWeight: 400, fontSize: 16, border: 'none', borderRadius: 20, padding: '8px 28px', minWidth: 90, cursor: 'pointer' }}
                      onClick={() => handleRemoveDraft(idx)}
                    >Cancel</button>
                  </div>
                )}
              </div>
            ) : (
              // COLLAPSED VIEW
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', cursor: 'pointer' }}
                onClick={() => setExpandedDraftIndex(idx)}
              >
                <span style={{ fontSize: 20, fontWeight: 600, color: '#333' }}>
                  {[draft.prefix, draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'New Guest'}
                </span>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <button
                    style={{ background: '#eee', color: '#222', fontWeight: 500, fontSize: 16, border: '1px solid #ccc', borderRadius: 8, padding: '8px 24px', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDraftIndex(idx);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={{ background: '#fef2f2', color: '#ef4444', fontWeight: 500, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 16 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm({ type: 'draft', index: idx });
                    }}
                  >Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {guests.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: expandedGuestIndex !== null ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
            marginBottom: 48,
            justifyItems: expandedGuestIndex !== null ? 'center' : 'start',
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
            transition: 'all 0.4s ease',
          }}>
            {guests.map((guest, idx) => (
              <div key={idx} style={{
                background: '#fff',
                border: '1.5px solid #bbb',
                borderRadius: 18,
                boxShadow: expandedGuestIndex === idx ? '0 8px 24px #0002' : '0 4px 16px #0001',
                padding: expandedGuestIndex === idx ? '32px 28px 24px 28px' : '28px 24px 20px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                position: 'relative',
                minHeight: 180,
                maxWidth: expandedGuestIndex === idx ? '100%' : 340,
                width: '100%',
                transition: 'all 0.3s ease',
                cursor: expandedGuestIndex === idx ? 'default' : 'pointer',
                transform: expandedGuestIndex === idx ? 'scale(1.02)' : 'scale(1)',
              }}
              onClick={() => {
                if (expandedGuestIndex !== idx) {
                  handleGuestCardClick(idx);
                }
              }}
              onMouseEnter={(e) => {
                if (expandedGuestIndex !== idx) {
                  e.currentTarget.style.transform = 'scale(1.01)';
                  e.currentTarget.style.boxShadow = '0 6px 20px #0002';
                }
              }}
              onMouseLeave={(e) => {
                if (expandedGuestIndex !== idx) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px #0001';
                }
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm({ type: 'guest', index: idx });
                  }}
                  title="Delete Guest"
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: '#fee2e2',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
                {expandedGuestIndex === idx && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedGuestIndex(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 56,
                      background: '#f5f5f5',
                      border: 'none',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    −
                  </button>
                )}

                <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 10, color: '#222', letterSpacing: 0.2 }}>
                  {guest.firstName} {guest.middleName} {guest.lastName}
                </div>
                <div style={{ color: '#444', fontSize: 15, marginBottom: 6 }}>
                  <b style={{ fontWeight: 500, color: '#222' }}>Contact:</b> {guest.countryCode} {guest.contactNumber}
                </div>
                <div style={{ color: '#444', fontSize: 15, marginBottom: 6 }}>
                  <b style={{ fontWeight: 500, color: '#222' }}>Email:</b> {guest.email}
                </div>
                <div style={{ color: '#444', fontSize: 15, marginBottom: 6 }}>
                  <b style={{ fontWeight: 500, color: '#222' }}>ID:</b> {guest.idType} {guest.idNumber}
                </div>

                {expandedGuestIndex === idx && (
                  <div style={{ 
                    marginTop: 24,
                    width: '100%',
                    borderTop: '1px solid #eee',
                    paddingTop: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                  }}>
                    <div style={{ paddingRight: 40, marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, letterSpacing: 0.5, color: '#222' }}>NAMES</div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <input 
                          value={guest.firstName} 
                          onChange={(e) => handleGuestChange(idx, 'firstName', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                          placeholder="First Name"
                        />
                        <input 
                          value={guest.middleName || ''} 
                          onChange={(e) => handleGuestChange(idx, 'middleName', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                          placeholder="Middle Name"
                        />
                        <input 
                          value={guest.lastName} 
                          onChange={(e) => handleGuestChange(idx, 'lastName', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                          placeholder="Last Name"
                        />
                      </div>
                    </div>

                    <div style={{ paddingRight: 40, marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, letterSpacing: 0.5, color: '#222' }}>CONTACT INFORMATION</div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <select 
                          value={guest.countryCode} 
                          onChange={(e) => handleGuestChange(idx, 'countryCode', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 120, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                        >
                          {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                        </select>
                        <input 
                          value={guest.contactNumber} 
                          onChange={(e) => handleGuestChange(idx, 'contactNumber', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                          placeholder="Contact Number"
                        />
                        <input 
                          value={guest.email} 
                          onChange={(e) => handleGuestChange(idx, 'email', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 2, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                          placeholder="Email"
                        />
                      </div>
                    </div>

                    <div style={{ paddingRight: 40, marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, letterSpacing: 0.5, color: '#222' }}>IDENTIFICATION</div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <select 
                          value={guest.idType} 
                          onChange={(e) => handleGuestChange(idx, 'idType', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                        >
                          <option value="">Select ID Type</option>
                          <option value="Passport">Passport</option>
                          <option value="Identity Card">Identity Card</option>
                          <option value="Drivers License">Driver's License</option>
                        </select>
                        <input 
                          value={guest.idNumber} 
                          onChange={(e) => handleGuestChange(idx, 'idNumber', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                          placeholder="ID Number"
                        />
                        <select 
                          value={guest.idCountry} 
                          onChange={(e) => handleGuestChange(idx, 'idCountry', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, borderRadius: 8, background: '#f7f8fa', border: '1.5px solid #d1d5db', padding: 10, fontSize: 16, height: 44 }}
                        >
                          <option value="">Country</option>
                          {COUNTRIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {Object.entries(guest.modules || {}).map(([key, instances]) => {
                        const module = GUEST_MODULES.find(m => m.key === key);
                        if (!module) return null;

                        const instanceArray = Array.isArray(instances) ? instances : [];
                        
                        return instanceArray.map((_, index) => (
                          <div key={`${key}-${index}`} style={{ 
                            background: '#fff',
                            borderRadius: 12,
                            padding: '20px',
                            border: '1px solid #e5e7eb',
                            position: 'relative'
                          }}>
                            <button
                              onClick={() => handleGuestModuleRemove(idx, key, index)}
                              style={{
                                position: 'absolute',
                                top: 8, right: 8, background: 'transparent', border: 'none',
                                color: '#9ca3af', cursor: 'pointer', fontSize: 28, lineHeight: 1,
                                padding: '8px', borderRadius: '50%', width: 40, height: 40,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'color 0.2s, background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.background = '#fee2e2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#9ca3af';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              ×
                            </button>
                            <div style={{ paddingRight: '40px' }}>
                              <div style={{ marginBottom: 12 }}>
                                <label style={{ fontWeight: 600, fontSize: 16, color: '#374151' }}>{module.label}</label>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {module.key === 'flightNumber' ? (
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                      placeholder="e.g. BA2490"
                                      value={guest.moduleValues?.[key]?.[index]?.number || ''}
                                      onChange={e => {
                                        const newValues = { ...guest.moduleValues };
                                        if (!Array.isArray(newValues[key])) newValues[key] = new Array(instanceArray.length).fill({});
                                        newValues[key][index] = { ...(newValues[key][index] || {}), number: e.target.value };
                                        handleGuestChange(idx, 'moduleValues', newValues);
                                      }}
                                      style={{ flex: '2 1 auto', padding: '0 16px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 18, height: 48, background: '#fff', boxSizing: 'border-box' }}
                                    />
                                    <input
                                      type="date"
                                      value={guest.moduleValues?.[key]?.[index]?.date || ''}
                                      onChange={e => {
                                        const newValues = { ...guest.moduleValues };
                                        if (!Array.isArray(newValues[key])) newValues[key] = new Array(instanceArray.length).fill({});
                                        newValues[key][index] = { ...(newValues[key][index] || {}), date: e.target.value };
                                        handleGuestChange(idx, 'moduleValues', newValues);
                                      }}
                                      style={{ flex: '1 1 auto', padding: '0 16px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 18, height: 48, background: '#fff', boxSizing: 'border-box' }}
                                    />
                                    <button
                                      onClick={async () => {
                                        const flightInfo = guest.moduleValues?.[key]?.[index];
                                        if (flightInfo && flightInfo.number && flightInfo.date) {
                                          await handleGuestFlightData(idx, key, index, flightInfo.number, flightInfo.date);
                                        }
                                      }}
                                      style={{ flex: '0 0 auto', padding: '0 24px', cursor: 'pointer', background: '#222', color: 'white', fontWeight: 500, border: 'none', fontSize: 18, height: 48, borderRadius: 8, boxSizing: 'border-box' }}
                                    >
                                      Find
                                    </button>
                                  </div>
                                ) : module.type === 'file' ? (
                                  <input type="file" />
                                ) : (
                                  <input 
                                    placeholder={module.placeholder}
                                    value={Array.isArray(guest.moduleValues?.[key]) ? guest.moduleValues[key][index] || '' : ''}
                                    onChange={e => {
                                      const newValues = { ...guest.moduleValues };
                                      if (!Array.isArray(newValues[key])) {
                                        newValues[key] = new Array(instanceArray.length).fill('');
                                      }
                                      newValues[key][index] = e.target.value;
                                      handleGuestChange(idx, 'moduleValues', newValues);
                                    }}
                                    style={{ 
                                      width: '100%',
                                      padding: '10px 16px',
                                      borderRadius: 8,
                                      border: '1.5px solid #d1d5db',
                                      fontSize: 18,
                                      height: 48,
                                      background: '#fff'
                                    }}
                                  />
                                )}

                                {(() => {
                                    const flightState = guest.moduleFlightData?.[key]?.[index];
                                    if (!flightState || flightState.status === 'idle') return null;
                                    if (flightState.status === 'loading') {
                                        return <div style={{marginTop: 8, padding: '12px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#4b5563', textAlign: 'center'}}>Loading flight data...</div>;
                                    }
                                    if (flightState.status === 'not_found') {
                                        return <div style={{marginTop: 8, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 14, color: '#b91c1c', textAlign: 'center'}}>Flight not found. Please check the details and try again.</div>;
                                    }
                                    if (flightState.status === 'found' && flightState.data) {
                                        const flightData = flightState.data;
                                        return (
                                            <div style={{marginTop: 8, padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 14, color: '#374151', lineHeight: 1.6}}>
                                                <p style={{margin: '0 0 8px 0'}}><strong>Status:</strong> {flightData.flight_status}</p>
                                                <div style={{display: 'flex', justifyContent: 'space-between', gap: '16px'}}>
                                                    <div style={{flex: 1}}>
                                                        <p style={{margin: 0, fontWeight: 'bold'}}>Departure</p>
                                                        <p style={{margin: '4px 0'}}>Airport: {flightData.departure.airport} ({flightData.departure.iata})</p>
                                                        {flightData.departure.terminal && <p style={{margin: '4px 0'}}>Terminal: {flightData.departure.terminal}</p>}
                                                        {flightData.departure.gate && <p style={{margin: '4px 0'}}>Gate: {flightData.departure.gate}</p>}
                                                        <p style={{margin: '4px 0'}}>Scheduled: {formatFlightTime(flightData.departure.scheduled, flightData.departure.timezone)}</p>
                                                        {flightData.departure.estimated && <p style={{margin: '4px 0'}}>Estimated: {formatFlightTime(flightData.departure.estimated, flightData.departure.timezone)}</p>}
                                                        {flightData.departure.actual && <p style={{margin: '4px 0'}}>Actual: {formatFlightTime(flightData.departure.actual, flightData.departure.timezone)}</p>}
                                                    </div>
                                                    <div style={{flex: 1}}>
                                                        <p style={{margin: 0, fontWeight: 'bold'}}>Arrival</p>
                                                        <p style={{margin: '4px 0'}}>Airport: {flightData.arrival.airport} ({flightData.arrival.iata})</p>
                                                        {flightData.arrival.terminal && <p style={{margin: '4px 0'}}>Terminal: {flightData.arrival.terminal}</p>}
                                                        {flightData.arrival.gate && <p style={{margin: '4px 0'}}>Gate: {flightData.arrival.gate}</p>}
                                                        <p style={{margin: '4px 0'}}>Scheduled: {formatFlightTime(flightData.arrival.scheduled, flightData.arrival.timezone)}</p>
                                                        {flightData.arrival.estimated && <p style={{margin: '4px 0'}}>Estimated: {formatFlightTime(flightData.arrival.estimated, flightData.arrival.timezone)}</p>}
                                                        {flightData.arrival.actual && <p style={{margin: '4px 0'}}>Actual: {formatFlightTime(flightData.arrival.actual, flightData.arrival.timezone)}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                              </div>
                            </div>
                          </div>
                        )).flat();
                      })}
                    
                      <div
                        style={{ border: '2px dashed #d1d5db', borderRadius: 8, background: '#fff', padding: 24, minHeight: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'copy' }}
                        onDrop={e => handleGuestModuleDrop(idx, e)}
                        onDragOver={e => e.preventDefault()}
                      >
                        <span style={{ color: '#9ca3af', fontSize: 16, fontWeight: 500 }}>Drag modules here</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'flex-end',
            marginTop: 40,
            paddingBottom: 40,
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
        }}>
          <button 
            style={{ background: '#eee', color: '#222', fontWeight: 500, fontSize: 18, border: '1px solid #ccc', borderRadius: 8, padding: '10px 36px', minWidth: 120, cursor: 'pointer' }} 
            onClick={() => navigate(`/event/${eventId}?tab=guests`)}
          >
            Cancel
          </button>
          <button
            style={{ 
              background: '#222', 
              color: '#fff', 
              fontWeight: 500, 
              fontSize: 18, 
              border: 'none', 
              borderRadius: 8, 
              padding: '11px 37px',
              minWidth: 120,
              opacity: (isGroup && !groupNameConfirmed) || (guests.length === 0 && drafts.length === 0) ? 0.5 : 1,
              cursor: (isGroup && !groupNameConfirmed) || (guests.length === 0 && drafts.length === 0) ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSave}
            disabled={(isGroup && !groupNameConfirmed) || (guests.length === 0 && drafts.length === 0)}
          >
            Save Changes
          </button>
        </div>

        {showDeleteConfirm && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', minWidth: 400, boxShadow: '0 4px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 600 }}>Are you sure?</h2>
              <p style={{ color: '#666', fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
                {showDeleteConfirm.type === 'group' 
                  ? "This will permanently delete the entire group and all its members. This action cannot be undone."
                  : "This will permanently delete this guest. This action cannot be undone."}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button
                  style={{ background: '#f5f5f5', color: '#222', fontWeight: 500, fontSize: 18, border: '1px solid #ddd', borderRadius: 8, padding: '12px 36px', minWidth: 120, cursor: 'pointer' }}
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  No, Cancel
                </button>
                <button
                  style={{ background: '#ef4444', color: '#fff', fontWeight: 500, fontSize: 18, border: 'none', borderRadius: 8, padding: '13px 37px', minWidth: 120, cursor: 'pointer' }}
                  onClick={handleConfirmDelete}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {isCsvModalOpen && <CsvUploadModal />}
        
        {scannerState.show && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.6)', zIndex: 1000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes scaleUp { from { transform: scale(0.9); } to { transform: scale(1); } }
            `}</style>
            <div style={{ 
              background: '#fff', borderRadius: 16, 
              width: 'clamp(500px, 60vw, 700px)', 
              boxShadow: '0 4px 32px rgba(0,0,0,0.2)',
              animation: 'scaleUp 0.3s ease',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Passport Scanner</h2>
                </div>
              </div>

              <div style={{ padding: 32 }}>
                <div style={{ display: 'flex', gap: 4, background: '#eee', borderRadius: 8, padding: 4, marginBottom: 24 }}>
                  <button 
                    onClick={() => { setScannerTab('upload'); handleStopCamera(); setScannerState(s => ({...s, imageUrl: null})); }}
                    style={{
                      flex: 1, padding: '10px 0', border: 'none', borderRadius: 6,
                      background: scannerTab === 'upload' ? '#fff' : 'transparent',
                      color: scannerTab === 'upload' ? '#222' : '#666',
                      fontSize: 15, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Upload File
                  </button>
                  <button 
                    onClick={handleStartCamera}
                    style={{
                      flex: 1, padding: '10px 0', border: 'none', borderRadius: 6,
                      background: scannerTab === 'camera' ? '#fff' : 'transparent',
                      color: scannerTab === 'camera' ? '#222' : '#666',
                      fontSize: 15, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Use Camera
                  </button>
                </div>

                <div>
                  {scannerTab === 'camera' ? (
                    <div style={{ textAlign: 'center' }}>
                      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd' }} />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                  ) : (
                    scannerState.imageUrl ? (
                       <div style={{ marginBottom: 24, textAlign: 'center' }}>
                        <img src={scannerState.imageUrl} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #ddd' }} alt="Passport preview" />
                      </div>
                    ) : (
                      <div
                        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) { setScannerState(s => ({...s, imageUrl: URL.createObjectURL(e.dataTransfer.files[0])}))}}}
                        onDragOver={(e) => e.preventDefault()}
                        style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 48, textAlign: 'center', background: '#f9fafb', marginBottom: 24 }}
                      >
                        <input
                          type="file" id="passport-upload" accept="image/*" style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setScannerState(s => ({ ...s, imageUrl: URL.createObjectURL(file) }));
                            }
                          }}
                        />
                        <label htmlFor="passport-upload" style={{ cursor: 'pointer', fontSize: 16, color: '#2563eb', fontWeight: 500 }}>
                          Choose a file
                        </label>
                        <span style={{ color: '#6b7280', margin: '0 8px' }}>or drag and drop</span>
                      </div>
                    )
                  )}
                </div>
              </div>
              
              {!scannerState.processing && (
                <div style={{ padding: '0 32px 32px 32px', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                  <button
                    onClick={handleModalClose}
                    style={{ background: '#fff', border: '1px solid #222', color: '#222', padding: '10px 24px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  {scannerTab === 'camera' ? (
                    <button
                      onClick={handleCapture}
                      style={{ background: '#222', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer' }}
                    >
                      Capture Image
                    </button>
                  ) : (
                    <button
                      onClick={() => processImageWithOCR(scannerState.imageUrl!, scannerState.draftIndex!)}
                      disabled={!scannerState.imageUrl}
                      style={{ 
                        background: scannerState.imageUrl ? '#222' : '#ccc', color: '#fff', border: 'none', 
                        padding: '10px 24px', borderRadius: 8, cursor: scannerState.imageUrl ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Process Image
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Right Toolbar (Modules) */}
      <div style={{ width: showModules ? 280 : 32, background: '#222', color: '#fff', transition: 'width 0.2s', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: showModules ? 'flex-start' : 'center', padding: showModules ? '40px 24px' : '40px 0', minHeight: '100vh' }}>
        <button onClick={() => setShowModules(v => !v)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', alignSelf: showModules ? 'flex-end' : 'center', marginBottom: 24 }} title={showModules ? 'Hide Modules' : 'Show Modules'}>
          {showModules ? '→' : '←'}
        </button>
        {showModules && (
          <>
            <div style={{ fontSize: 13, color: '#bbb', marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>Guest Modules</div>
            
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {GUEST_MODULES.map(module => (
                <div
                  key={module.key}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('moduleKey', module.key)}
                  style={{
                    background: '#fff',
                    border: '1px solid #bbb',
                    borderRadius: 8,
                    padding: '12px 16px',
                    cursor: 'grab',
                    userSelect: 'none',
                    boxShadow: '0 1px 4px #0001',
                    width: '100%'
                  }}
                >
                  <div style={{ color: '#222', fontWeight: 500, marginBottom: module.description ? 4 : 0 }}>
                    {module.label}
                  </div>
                  {module.description && (
                    <div style={{ color: '#666', fontSize: 12 }}>
                      {module.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
