import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser, type User } from './lib/auth';
import { useRealtimeEvents } from './hooks/useRealtime';
import { 
  getItineraries, 
  addItinerary, 
  updateItinerary, 
  addDraftItinerary, 
  updateDraftItinerary,
  publishDraftItinerary,
  type Itinerary,
  insertActivityLog
} from './lib/supabase';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';
import { supabase } from './lib/supabase';
import styles from './CreateItinerary.module.css';

// --- GLASSMORPHIC STYLE HELPERS ---
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

const getInputStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '8px',
  color: isDark ? '#ffffff' : '#000000',
  outline: 'none',
  transition: 'all 0.2s ease'
});

const getButtonStyles = (isDark: boolean, variant: 'primary' | 'secondary' | 'danger' | 'success') => {
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
    case 'success':
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
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
  cardBg: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
});

// --- MODULE COMPONENTS ---
// These components are not currently used but kept for future reference
// They would need inline styles when implemented

const RENDERABLE_MODULES = {
  // contact: ModuleHostContact,
  // reminder: ModuleReminder,
  // qr: ModuleQRCode,
  // map: ModuleMap,
  // file: ModuleFileUpload,
};

// --- TYPE DEFINITIONS ---
type ActivityModule = {
  id: string;
  type: keyof typeof RENDERABLE_MODULES;
  data: any;
};

type ItineraryItem = {
  id?: string;
  title: string;
  arrivalTime: string;
  startTime: string;
  endTime: string;
  location: string;
  details: string;
  modules: Record<string, boolean>;
  moduleValues: Record<string, any>;
  date: string;
  group_id?: string;
  group_name?: string;
};

type Draft = ItineraryItem;

type EventType = {
    id: string;
    name: string;
    from: string;
    to: string;
};

const ITINERARY_MODULES = [
  { key: 'document', label: 'Document Upload', type: 'file' },
  { key: 'qrcode', label: 'QR Code', type: 'qrcode' },
  { key: 'contact', label: 'Host Contact Details', type: 'contact' },
  { key: 'notifications', label: 'Notifications Timer', type: 'notifications' },
];

// --- MAIN COMPONENT ---
export default function CreateItinerary() {
  const { eventId, itineraryId } = useParams();
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  
  // Get current user for company context
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    })();
  }, []);
  
  // Use real-time events hook
  const { events: realtimeEvents } = useRealtimeEvents(currentUser ? currentUser.company_id : null);

  // State variables
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [eventName, setEventName] = useState('');
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [expandedDraftIndex, setExpandedDraftIndex] = useState<number | null>(null);
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isModuleSidebarCollapsed, setIsModuleSidebarCollapsed] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalItinerary, setOriginalItinerary] = useState<Itinerary | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>('');
  
  // Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [tempGroupName, setTempGroupName] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemIndex, setDeleteItemIndex] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Add state for success message and glow effect
  const [showSuccess, setShowSuccess] = useState(false);
  const [glowItineraryId, setGlowItineraryId] = useState<string | null>(null);
  
  // Success message state for individual saves
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Success message function
  const showSuccessToast = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [qrcodeFile, setQrcodeFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [qrcodeUrl, setQrcodeUrl] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Add state for saved feedback
  const [savedDraftIdx, setSavedDraftIdx] = useState<number | null>(null);
  const [savedItemIdx, setSavedItemIdx] = useState<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (openDropdown && !target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  useEffect(() => {
    const loadEventAndItinerary = async () => {
      try {
        // Find current event from real-time events
        if (realtimeEvents) {
          const currentEvent = realtimeEvents.find(e => e.id === eventId);
          if (currentEvent) {
            setEventDetails(currentEvent);
          }
        }

        // Check if we're editing an existing itinerary
        if (itineraryId !== undefined && eventId) {
          setIsEditMode(true);
          // Load itineraries from Supabase
          const itineraries = await getItineraries(eventId, currentUser ? currentUser.company_id : undefined);
          console.log('Fetched itineraries:', itineraries);
          console.log('Looking for itineraryId:', itineraryId);
          const itineraryToEdit = itineraries.find(it => String(it.id) === String(itineraryId));
          console.log('Found itineraryToEdit:', itineraryToEdit);
          if (itineraryToEdit) {
            setOriginalItinerary(itineraryToEdit);
            // Convert database fields back to draft format
            const draftItem = {
              id: itineraryToEdit.id,
              title: itineraryToEdit.title,
              arrivalTime: itineraryToEdit.arrival_time || '',
              startTime: itineraryToEdit.start_time || '',
              endTime: itineraryToEdit.end_time || '',
              location: itineraryToEdit.location || '',
              details: itineraryToEdit.description || '',
              modules: {} as Record<string, any>,
              moduleValues: {} as Record<string, any>,
              date: itineraryToEdit.date || '',
              group_id: itineraryToEdit.group_id || undefined,
              group_name: itineraryToEdit.group_name || undefined,
            };
            // Reconstruct modules from database fields
            if (itineraryToEdit.document_file_name) {
              draftItem.modules.document = true;
              draftItem.moduleValues.document = itineraryToEdit.document_file_name;
            }
            if (itineraryToEdit.qrcode_url || itineraryToEdit.qrcode_image) {
              draftItem.modules.qrcode = true;
              draftItem.moduleValues.qrcode = {
                url: itineraryToEdit.qrcode_url || '',
                image: itineraryToEdit.qrcode_image || ''
              };
            }
            if (itineraryToEdit.contact_name || itineraryToEdit.contact_phone || itineraryToEdit.contact_email) {
              draftItem.modules.contact = true;
              draftItem.moduleValues.contact = {
                name: itineraryToEdit.contact_name || '',
                countryCode: itineraryToEdit.contact_country_code || '',
                phone: itineraryToEdit.contact_phone || '',
                email: itineraryToEdit.contact_email || ''
              };
            }
            if (itineraryToEdit.notification_times && itineraryToEdit.notification_times.length > 0) {
              draftItem.modules.notifications = true;
              draftItem.moduleValues.notifications = itineraryToEdit.notification_times;
              // Debug: log what is loaded from DB
              console.log('[DEBUG] Loaded notification_times from DB:', itineraryToEdit.notification_times);
            }
            // --- FIX: Also set for published items ---
            const publishedItem = { ...draftItem };
            publishedItem.moduleValues = { ...draftItem.moduleValues };
            if (itineraryToEdit.notification_times && itineraryToEdit.notification_times.length > 0) {
              publishedItem.moduleValues.notifications = itineraryToEdit.notification_times;
            }
            console.log('Mapped draftItem:', draftItem);
            // For existing published itineraries, add to items array, not drafts
            setItems([publishedItem]);
            setExpandedItemIndex(0);
          } else {
            console.warn('No itinerary found for editing with id:', itineraryId);
          }
        }
      } catch (error) {
        console.error("Failed to load event details or itinerary:", error);
        alert('Failed to load event data. Please check your connection and try again.');
      }
    };

    loadEventAndItinerary();
  }, [eventId, itineraryId, realtimeEvents]);

  const formatDateRange = (from: string, to: string) => {
      if (!from || !to) return '';
      const fromDate = new Date(from).toLocaleDateString('en-GB');
      const toDate = new Date(to).toLocaleDateString('en-GB');
      return `${fromDate} - ${toDate}`;
  }

  const handleAddDraft = () => {
    // If this is the second draft, enable grouping
    if (drafts.length === 1 && !groupId) {
      const newGroupId = `group_${Date.now()}_${Math.random()}`;
      setGroupId(newGroupId);
      setTempGroupName(''); // Reset temp group name
      setShowGroupModal(true); // Show modal for user to enter group name
      return; // Don't add the draft yet, wait for modal confirmation
    }
    const newDraft: ItineraryItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      title: '',
      arrivalTime: '',
      startTime: '',
      endTime: '',
      location: '',
      details: '',
      modules: {},
      moduleValues: {},
        date: '',
      group_id: groupId || undefined,
      group_name: groupName || undefined,
    };
    setDrafts([newDraft, ...drafts.map(d => groupId ? { ...d, group_id: groupId, group_name: groupName } : d)]);
    setExpandedDraftIndex(0);
  };

  // Group modal handlers
  const handleConfirmGroup = () => {
    if (!tempGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    
    setGroupName(tempGroupName.trim());
    
    // Update existing draft with group info
    setDrafts(d => d.map(draft => ({ ...draft, group_id: groupId || undefined, group_name: tempGroupName.trim() })));
    
    // Add the new draft
    const newDraft: ItineraryItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      title: '',
      arrivalTime: '',
      startTime: '',
      endTime: '',
      location: '',
      details: '',
      modules: {},
      moduleValues: {},
        date: '',
      group_id: groupId || undefined,
      group_name: tempGroupName.trim(),
    };
    setDrafts([newDraft, ...drafts]);
    setExpandedDraftIndex(0);
    
    // Close modal
    setShowGroupModal(false);
    setTempGroupName('');
  };

  const handleCancelGroup = () => {
    // Remove the group ID and reset to individual items
    setGroupId(null);
    setGroupName('');
    setDrafts(d => d.map(draft => ({ ...draft, group_id: undefined, group_name: undefined })));
    
    // Add the new draft without grouping
    const newDraft: ItineraryItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      title: '',
      arrivalTime: '',
      startTime: '',
      endTime: '',
      location: '',
      details: '',
      modules: {},
      moduleValues: {},
      date: '',
    };
    setDrafts([newDraft, ...drafts]);
    setExpandedDraftIndex(0);
    
    // Close modal
    setShowGroupModal(false);
    setTempGroupName('');
  };

  const handleDraftChange = (idx: number, key: keyof ItineraryItem, value: any) => {
    setDrafts(d => d.map((draft, i) => i === idx ? { ...draft, [key]: value } : draft));
  };

  const handleRemoveDraft = (idx: number) => {
    setDrafts(d => d.filter((_, i) => i !== idx));
    setExpandedDraftIndex(null);
  };

  const handleRemoveItem = (idx: number) => {
    setDeleteItemIndex(idx);
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmText.toLowerCase() === 'delete' && deleteItemIndex !== null) {
      setItems(g => g.filter((_, i) => i !== deleteItemIndex));
      setShowDeleteConfirm(false);
      setDeleteItemIndex(null);
      setDeleteConfirmText('');
      setExpandedItemIndex(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteItemIndex(null);
    setDeleteConfirmText('');
  };

  const handleModuleDrop = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    const moduleKey = e.dataTransfer.getData('text/plain');
    if (moduleKey && ITINERARY_MODULES.find(m => m.key === moduleKey)) {
      setDrafts(d => d.map((draft, i) => 
        i === idx 
          ? { 
              ...draft, 
              modules: { ...draft.modules, [moduleKey]: true },
              moduleValues: { ...draft.moduleValues, [moduleKey]: '' }
            }
          : draft
      ));
    }
  };

  const handleRemoveModule = (draftIdx: number, moduleKey: string) => {
    setDrafts(d => d.map((draft, i) => 
      i === draftIdx 
        ? { 
            ...draft, 
            modules: { ...draft.modules, [moduleKey]: false },
            moduleValues: { ...draft.moduleValues, [moduleKey]: '' }
          }
        : draft
    ));
  };

  const handleModuleValueChange = (draftIdx: number, moduleKey: string, value: any) => {
    console.log('🔧 MODULE VALUE CHANGE:', { draftIdx, moduleKey, value });
    setDrafts(d => d.map((draft, i) => 
      i === draftIdx 
        ? { 
            ...draft, 
            moduleValues: { ...draft.moduleValues, [moduleKey]: value }
          }
        : draft
    ));
  };

  const handleSaveItinerary = async () => {
    if (!eventDetails || !currentUser) {
      console.error('❌ Missing eventDetails or currentUser');
      return;
    }
    
    console.log('👤 Current user:', currentUser);
    console.log('📅 Event details:', eventDetails);
    try {
      // --- PUBLISHED ITINERARY SAVE LOGIC ---
      // We must publish BOTH existing items and new drafts.
      const toPublish = [...items, ...drafts];
      console.log('🔄 Starting save process. Items:', items.length, 'Drafts:', drafts.length, 'Total:', toPublish.length);
      for (const item of toPublish) {
        // Validate required fields
        if (!eventDetails.id || !currentUser.company_id || !currentUser.id || !item.title) {
          alert('Missing required fields for itinerary.');
          return;
        }
        // Date format validation
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          alert(`Date must be in YYYY-MM-DD format. Found: ${item.date}`);
          return;
        }
        // --- FIX: Remove string id before saving ---
        let safeId = item.id;
        if (typeof safeId === 'string' && (safeId.startsWith('item_') || isNaN(Number(safeId)))) {
          safeId = undefined;
        }
        const itineraryData = {
          event_id: eventDetails.id,
          company_id: currentUser.company_id,
          created_by: currentUser.id,
          title: item.title,
          description: item.details || '',
          date: item.date && item.date.trim() ? item.date : undefined,
          arrival_time: item.arrivalTime || undefined,
          start_time: item.startTime || undefined,
          end_time: item.endTime || undefined,
          location: item.location || undefined,
          document_file_name: item.moduleValues?.document || undefined,
          qrcode_url: item.moduleValues?.qrcode?.url || undefined,
          qrcode_image: item.moduleValues?.qrcode?.image || undefined,
          contact_name: item.moduleValues?.contact?.name || undefined,
          contact_country_code: item.moduleValues?.contact?.countryCode || undefined,
          contact_phone: item.moduleValues?.contact?.phone || undefined,
          contact_email: item.moduleValues?.contact?.email || undefined,
          notification_times: item.moduleValues?.notifications || [],
          group_id: groupId || undefined,
          group_name: groupName || undefined,
          content: { originalItem: item },
          modules: item.modules || {},
          module_values: item.moduleValues || {},
          is_draft: false
        };
        // Always treat as published: update if id exists and is a number, add if not
        if (safeId && !isNaN(Number(safeId))) {
          try {
            const result = await updateItinerary(String(safeId), itineraryData);
            console.log('✅ Update successful:', result);
          } catch (updateError) {
            console.error('❌ Update failed:', updateError);
            throw updateError;
          }
        } else {
          // Log the data being sent
          console.log('[handleSaveItinerary] About to insert:', itineraryData);
          try {
            const result = await addItinerary(itineraryData);
            console.log('[handleSaveItinerary] Insert result:', result);
          } catch (addError) {
            console.error('[handleSaveItinerary] Insert error:', addError);
            throw addError;
          }
        }
      }
      showSuccessToast('Itinerary saved successfully!');
      setItems([]);
      setDrafts([]);
      navigate(`/event/${eventId}?tab=itineraries`);
    } catch (error) {
      console.error('❌ Error saving itinerary:', error);
      if (error instanceof Error) alert('Error saving itinerary: ' + error.message);
      else alert('Error saving itinerary: ' + JSON.stringify(error));
    }
  };

  const handleCancel = () => {
    navigate(`/event/${eventId}?tab=itineraries`);
  };

  const handleDownloadCSVTemplate = () => {
    // Basic form fields
    const basicHeaders = [
      'Title', 'Arrival Time', 'Start Time', 'End Time', 'Location', 'Description', 'Date (YYYY-MM-DD)', 'Group ID', 'Group Name'
    ];
    
    // Detailed module-specific columns
    const moduleHeaders = [
      'Document File Name',
      'QR Code URL', 'QR Code Image',
      'Contact Name', 'Contact Country Code', 'Contact Phone', 'Contact Email',
      'Notification Times (JSON Array)'
    ];
    
    const allHeaders = [...basicHeaders, ...moduleHeaders];
    const csvContent = allHeaders.join(',') + '\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'itinerary_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseItineraryCsv = (file: File): Promise<Partial<ItineraryItem>[]> => {
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
          const requiredHeaders = ['Title'];
          const hasDateHeader = headers.includes('Date') || headers.includes('Date (YYYY-MM-DD)');
          if (!hasDateHeader) {
            return reject(new Error('CSV is missing required header: Date or Date (YYYY-MM-DD)'));
          }
          for (const requiredHeader of requiredHeaders) {
            if (!headers.includes(requiredHeader)) {
              return reject(new Error(`CSV is missing required header: ${requiredHeader}`));
            }
          }

          const dateHeader = headers.includes('Date (YYYY-MM-DD)') ? 'Date (YYYY-MM-DD)' : 'Date';

          const parsedData = lines.slice(1).map((line, rowIndex) => {
            const values = line.split(',').map(v => v.trim());
            // Skip empty rows
            if (values.every(v => !v)) return null;
            const entry: any = {
              modules: {},
              moduleValues: {}
            };
            
            headers.forEach((header, index) => {
              const value = values[index] || '';
              
              // Handle basic form fields
              switch (header) {
                case 'Title': entry.title = value; break;
                case 'Arrival Time': entry.arrivalTime = value; break;
                case 'Start Time': entry.startTime = value; break;
                case 'End Time': entry.endTime = value; break;
                case 'Location': entry.location = value; break;
                case 'Description': entry.details = value; break;
                case 'Date':
                case 'Date (YYYY-MM-DD)':
                  entry.date = toISODate(value);
                  break;
                case 'Group ID': entry.group_id = value; break;
                case 'Group Name': entry.group_name = value; break;
                
                // Document Upload Module
                case 'Document File Name':
                  if (value) {
                    entry.modules.document = true;
                    entry.moduleValues.document = value;
                  }
                  break;
                
                // QR Code Module
                case 'QR Code URL':
                  if (value) {
                    entry.modules.qrcode = true;
                    entry.moduleValues.qrcode = entry.moduleValues.qrcode || {};
                    entry.moduleValues.qrcode.url = value;
                  }
                  break;
                case 'QR Code Image':
                  if (value) {
                    entry.modules.qrcode = true;
                    entry.moduleValues.qrcode = entry.moduleValues.qrcode || {};
                    entry.moduleValues.qrcode.image = value;
                  }
                  break;
                
                // Host Contact Details Module
                case 'Contact Name':
                  if (value) {
                    entry.modules.contact = true;
                    entry.moduleValues.contact = entry.moduleValues.contact || {};
                    entry.moduleValues.contact.name = value;
                  }
                  break;
                case 'Contact Country Code':
                  if (value) {
                    entry.modules.contact = true;
                    entry.moduleValues.contact = entry.moduleValues.contact || {};
                    entry.moduleValues.contact.countryCode = value;
                  }
                  break;
                case 'Contact Phone':
                  if (value) {
                    entry.modules.contact = true;
                    entry.moduleValues.contact = entry.moduleValues.contact || {};
                    entry.moduleValues.contact.phone = value;
                  }
                  break;
                case 'Contact Email':
                  if (value) {
                    entry.modules.contact = true;
                    entry.moduleValues.contact = entry.moduleValues.contact || {};
                    entry.moduleValues.contact.email = value;
                  }
                  break;
                
                // Notifications Timer Module
                case 'Notification Times (JSON Array)':
                  if (value) {
                    try {
                      const notificationTimes = JSON.parse(value);
                      if (Array.isArray(notificationTimes)) {
                        entry.modules.notifications = true;
                        entry.moduleValues.notifications = notificationTimes;
                      }
                    } catch (error) {
                      console.warn(`Invalid JSON for notification times in row ${rowIndex + 2}:`, value);
                    }
                  }
                  break;
                
                default:
                  // Check if this header matches any legacy module format
                  const module = ITINERARY_MODULES.find(m => m.label === header);
                  if (module && value) {
                    // Auto-detect and add module if value is provided
                    entry.modules[module.key] = true;
                    entry.moduleValues[module.key] = value;
                  }
                  break;
              }
            });
            
            // Only require title and date
            if (!entry.title || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
              throw new Error(`Row ${rowIndex + 2} is missing required fields: Title or a valid Date (YYYY-MM-DD). Found: ${entry.date}`);
            }
            return entry;
          }).filter(Boolean);
          resolve(parsedData);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to parse CSV file. Please check its format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read the file.'));
      reader.readAsText(file);
    });
  };

  const handleCsvUpload = async (file: File) => {
    try {
      const parsedItems = await parseItineraryCsv(file);
      const newDrafts = parsedItems.map(item => ({
        id: undefined, // Explicitly set id as undefined for new items
        title: item.title || '',
        arrivalTime: item.arrivalTime || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        location: item.location || '',
        details: item.details || '',
        modules: item.modules || {},
        moduleValues: item.moduleValues || {},
        date: item.date || '',
        group_id: item.group_id || undefined,
        group_name: item.group_name || undefined,
      }));

      // Defensive check: filter out drafts missing required fields
      const validDrafts = newDrafts.filter(d => d.title && d.date);
      if (validDrafts.length < newDrafts.length) {
        alert('Some rows in your CSV were missing required fields and were not added. Only Title and Date are required.');
        console.warn('Invalid drafts:', newDrafts.filter(d => !(d.title && d.date)));
      }
      setItems(items => {
        const updated = [...items, ...validDrafts];
        console.log('[CreateItinerary] Items after CSV upload:', updated);
        return updated;
      });
      setIsCsvModalOpen(false);
    } catch (error) {
      console.error('CSV upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to parse CSV file.');
    }
  };



  const handleItemChange = (idx: number, key: keyof ItineraryItem, value: any) => {
    setItems(items => items.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  };

  const handleItemModuleDrop = async (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    const moduleKey = e.dataTransfer.getData('text/plain');
    const module = ITINERARY_MODULES.find(m => m.key === moduleKey);
    if (module) {
      // Update local state first
      setItems(items => items.map((item, i) => i === idx ? {
        ...item,
        modules: { ...item.modules, [moduleKey]: true },
        moduleValues: { ...item.moduleValues, [moduleKey]: getDefaultModuleValue(moduleKey) }
      } : item));

      // Get the updated item
      const updatedItems = items.map((item, i) => i === idx ? {
        ...item,
        modules: { ...item.modules, [moduleKey]: true },
        moduleValues: { ...item.moduleValues, [moduleKey]: getDefaultModuleValue(moduleKey) }
      } : item);
      
      const updatedItem = updatedItems[idx];
      
      // Save to database if this is a saved item (has an ID)
      if (updatedItem.id && eventId && currentUser) {
        try {
          // Extract module values for the updated item
          const documentModule = updatedItem.modules?.document ? updatedItem.moduleValues?.document : undefined;
          const qrcodeModule = updatedItem.modules?.qrcode ? updatedItem.moduleValues?.qrcode : undefined;
          const contactModule = updatedItem.modules?.contact ? updatedItem.moduleValues?.contact : undefined;
          const notificationsModule = updatedItem.modules?.notifications ? updatedItem.moduleValues?.notifications : undefined;

          const itineraryData = {
            title: updatedItem.title,
            description: updatedItem.details || '',
            arrival_time: updatedItem.arrivalTime || undefined,
            start_time: updatedItem.startTime,
            end_time: updatedItem.endTime,
            location: updatedItem.location || undefined,
            is_draft: false,
            // Document Upload Module
            document_file_name: documentModule || undefined,
            // QR Code Module
            qrcode_url: qrcodeModule?.url || undefined,
            qrcode_image: qrcodeModule?.image || undefined,
            // Host Contact Details Module
            contact_name: contactModule?.name || undefined,
            contact_country_code: contactModule?.countryCode || undefined,
            contact_phone: contactModule?.phone || undefined,
            contact_email: contactModule?.email || undefined,
            // Notifications Timer Module
            notification_times: notificationsModule || [],
            group_id: updatedItem.group_id || undefined,
            group_name: updatedItem.group_name || undefined,
            date: updatedItem.date && updatedItem.date.trim() ? updatedItem.date : undefined,
            // Legacy content field for backward compatibility
            content: {
              originalItem: updatedItem
            }
          };

          await updateItinerary(updatedItem.id, itineraryData);
          console.log('✅ Module added and saved to database:', moduleKey);
        } catch (error) {
          console.error('❌ Failed to save module addition to database:', error);
          // Revert the local state change if database update fails
          setItems(items => items.map((item, i) => i === idx ? {
            ...item,
            modules: { ...item.modules, [moduleKey]: false },
            moduleValues: { ...item.moduleValues, [moduleKey]: undefined }
          } : item));
          alert('Failed to add module. Please try again.');
        }
      }
    }
  };

  const handleRemoveItemModule = async (itemIdx: number, moduleKey: string) => {
    // Update local state first
    setItems(items => items.map((item, i) => i === itemIdx ? {
      ...item,
      modules: { ...item.modules, [moduleKey]: false },
      moduleValues: { ...item.moduleValues, [moduleKey]: undefined }
    } : item));

    // Get the updated item
    const updatedItems = items.map((item, i) => i === itemIdx ? {
      ...item,
      modules: { ...item.modules, [moduleKey]: false },
      moduleValues: { ...item.moduleValues, [moduleKey]: undefined }
    } : item);
    
    const updatedItem = updatedItems[itemIdx];
    
    // Save to database if this is a saved item (has an ID)
    if (updatedItem.id && eventId && currentUser) {
      try {
        // Extract module values for the updated item
        const documentModule = updatedItem.modules?.document ? updatedItem.moduleValues?.document : undefined;
        const qrcodeModule = updatedItem.modules?.qrcode ? updatedItem.moduleValues?.qrcode : undefined;
        const contactModule = updatedItem.modules?.contact ? updatedItem.moduleValues?.contact : undefined;
        const notificationsModule = updatedItem.modules?.notifications ? updatedItem.moduleValues?.notifications : undefined;

        const itineraryData = {
          title: updatedItem.title,
          description: updatedItem.details || '',
          arrival_time: updatedItem.arrivalTime || undefined,
          start_time: updatedItem.startTime,
          end_time: updatedItem.endTime,
          location: updatedItem.location || undefined,
          is_draft: false,
          // Document Upload Module
          document_file_name: documentModule || undefined,
          // QR Code Module
          qrcode_url: qrcodeModule?.url || undefined,
          qrcode_image: qrcodeModule?.image || undefined,
          // Host Contact Details Module
          contact_name: contactModule?.name || undefined,
          contact_country_code: contactModule?.countryCode || undefined,
          contact_phone: contactModule?.phone || undefined,
          contact_email: contactModule?.email || undefined,
          // Notifications Timer Module
          notification_times: notificationsModule || [],
          group_id: updatedItem.group_id || undefined,
          group_name: updatedItem.group_name || undefined,
          date: updatedItem.date && updatedItem.date.trim() ? updatedItem.date : undefined,
          // Legacy content field for backward compatibility
          content: {
            originalItem: updatedItem
          }
        };

        await updateItinerary(updatedItem.id, itineraryData);
        console.log('✅ Module removed and saved to database:', moduleKey);
      } catch (error) {
        console.error('❌ Failed to save module removal to database:', error);
        // Revert the local state change if database update fails
        setItems(items => items.map((item, i) => i === itemIdx ? {
          ...item,
          modules: { ...item.modules, [moduleKey]: true },
          moduleValues: { ...item.moduleValues, [moduleKey]: items[itemIdx].moduleValues[moduleKey] }
        } : item));
        alert('Failed to remove module. Please try again.');
      }
    }
  };

  const handleItemModuleValueChange = async (itemIdx: number, moduleKey: string, value: any) => {
    // Debug: log what is being saved
    if (moduleKey === 'notifications') {
      console.log('[DEBUG] Saving notification_times:', value, 'for itemIdx:', itemIdx);
    }
    // Update local state first
    setItems(items => items.map((item, i) => i === itemIdx ? {
      ...item,
      moduleValues: { ...item.moduleValues, [moduleKey]: value }
    } : item));

    // Get the updated item
    const updatedItems = items.map((item, i) => i === itemIdx ? {
      ...item,
      moduleValues: { ...item.moduleValues, [moduleKey]: value }
    } : item);
    
    const updatedItem = updatedItems[itemIdx];
    
    // Save to database if this is a saved item (has an ID)
    if (updatedItem.id && eventId && currentUser) {
      try {
        // Extract module values for the updated item
        const documentModule = updatedItem.modules?.document ? updatedItem.moduleValues?.document : undefined;
        const qrcodeModule = updatedItem.modules?.qrcode ? updatedItem.moduleValues?.qrcode : undefined;
        const contactModule = updatedItem.modules?.contact ? updatedItem.moduleValues?.contact : undefined;
        const notificationsModule = updatedItem.modules?.notifications ? updatedItem.moduleValues?.notifications : undefined;

        // Debug: log what is being sent to the DB
        if (moduleKey === 'notifications') {
          console.log('[DEBUG] updateItinerary notification_times:', notificationsModule);
        }

        const itineraryData = {
          title: updatedItem.title,
          description: updatedItem.details || '',
          arrival_time: updatedItem.arrivalTime || undefined,
          start_time: updatedItem.startTime,
          end_time: updatedItem.endTime,
          location: updatedItem.location || undefined,
          is_draft: false,
          // Document Upload Module
          document_file_name: documentModule || undefined,
          // QR Code Module
          qrcode_url: qrcodeModule?.url || undefined,
          qrcode_image: qrcodeModule?.image || undefined,
          // Host Contact Details Module
          contact_name: contactModule?.name || undefined,
          contact_country_code: contactModule?.countryCode || undefined,
          contact_phone: contactModule?.phone || undefined,
          contact_email: contactModule?.email || undefined,
          // Notifications Timer Module
          notification_times: notificationsModule || [],
          group_id: updatedItem.group_id || undefined,
          group_name: updatedItem.group_name || undefined,
          date: updatedItem.date && updatedItem.date.trim() ? updatedItem.date : undefined,
          // Legacy content field for backward compatibility
          content: {
            originalItem: updatedItem
          }
        };

        await updateItinerary(updatedItem.id, itineraryData);
        console.log('✅ Module value updated and saved to database:', moduleKey);
      } catch (error) {
        console.error('❌ Failed to save module value change to database:', error);
        // Revert the local state change if database update fails
        setItems(items => items.map((item, i) => i === itemIdx ? {
          ...item,
          moduleValues: { ...item.moduleValues, [moduleKey]: items[itemIdx].moduleValues[moduleKey] }
        } : item));
        alert('Failed to update module value. Please try again.');
      }
    }
  };

  const getDefaultModuleValue = (moduleKey: string) => {
    switch (moduleKey) {
      case 'contact':
        return { name: '', countryCode: '', phone: '', email: '' };
      case 'notifications':
        return [];
      default:
        return null;
    }
  };

  // When groupName changes, update all drafts
  useEffect(() => {
    if (groupId && drafts.length > 1) {
      setDrafts(d => d.map(draft => ({ ...draft, group_id: groupId, group_name: groupName })));
    }
  }, [groupName, groupId, drafts.length]);

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentFile(file);
    setUploading(true);
    try {
      const url = await uploadFileToBucket(file, 'itinerary-documents', 'uploads');
      setDocumentUrl(url);
    } catch (err: any) {
      alert('Document upload failed: ' + (err instanceof Error ? err.message : String(err)));
    }
    setUploading(false);
  };

  const handleQrcodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrcodeFile(file);
    setUploading(true);
    try {
      const url = await uploadFileToBucket(file, 'itinerary-qrcodes', 'uploads');
      setQrcodeUrl(url);
    } catch (err: any) {
      alert('QR code upload failed: ' + (err instanceof Error ? err.message : String(err)));
    }
    setUploading(false);
  };

  // --- RENDER ---
  // Add before the return statement in the component:
  const sortedDrafts = [...drafts].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const sortedItems = [...items].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
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
            {eventDetails?.name}
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
            {isEditMode ? 'Edit Itinerary' : 'Create Itinerary'}
      </div>
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
              onClick={handleAddDraft}
              style={{ 
                ...getButtonStyles(isDark, 'primary'),
                fontSize: 18, 
                padding: '14px 34px', 
                minWidth: '165px'
              }}
            >
              Add New Item
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              style={{ 
                ...getButtonStyles(isDark, 'secondary'),
                fontSize: 18, 
                padding: '12px 32px', 
                minWidth: '145px'
              }}
            >
              Upload CSV
            </button>
          </div>
        </div>

        {/* Group Name Input (if grouping) with Glass Effect */}
        {groupId && drafts.length > 1 && (
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
              placeholder="Enter group name (e.g. Morning Activities)"
              style={{
                ...getInputStyles(isDark),
                width: '100%',
                padding: '12px 16px',
                fontSize: 18,
                height: 48,
                marginBottom: 8
              }}
            />
        </div>
      )}

        {/* Draft Items with Glass Effect */}
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
                    color: colors.textSecondary,
                    fontSize: 24,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'; 
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDraft(idx);
                  }}
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    ...getButtonStyles(isDark, 'danger'),
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = 'scale(1.1)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = 'scale(1)'; 
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path></svg>
                </button>

                <div style={{ paddingTop: '40px' }}>
                  {/* Title Field */}
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 15, 
                    marginBottom: 8, 
                    letterSpacing: 0.5, 
                    color: colors.text 
                  }}>
                    TITLE
                  </div>
                  <input
                    placeholder="Event Title"
                    value={draft.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDraftChange(idx, 'title', e.target.value)}
                    style={{
                      ...getInputStyles(isDark),
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 18,
                      height: 48,
                      marginBottom: 14
                    }}
                  />

                  {/* Date & Time Fields */}
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: colors.text }}>
                    DATE & TIME
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    {/* Date Field */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <CustomDatePicker
                        value={draft.date}
                        onChange={(value: string) => handleDraftChange(idx, 'date', value)}
                        placeholder="Date (DD/MM/YYYY)"
                        isDark={isDark}
                        colors={colors}
                        id={`date-picker-${idx}`}
                        openDropdown={openDropdown}
                        setOpenDropdown={setOpenDropdown}
                      />
                    </div>
                    {/* Time Fields */}
                    {([
                      ['arrivalTime', 'Arrival Time'],
                      ['startTime', 'Start Time'],
                      ['endTime', 'End Time']
                    ] as [keyof ItineraryItem, string][]).map(([key, label]) => (
                      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }} key={key}>
                        <CustomGlassTimePicker
                          value={draft[key] as string}
                          onChange={(value: string) => handleDraftChange(idx, key, value)}
                          placeholder={label}
                          isDark={isDark}
                          colors={colors}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Location Field */}
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 15, 
                    marginBottom: 8, 
                    letterSpacing: 0.5, 
                    color: colors.text 
                  }}>
                    LOCATION
                  </div>
                  <input
                    placeholder="Event Location"
                    value={draft.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDraftChange(idx, 'location', e.target.value)}
                    style={{
                      ...getInputStyles(isDark),
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 18,
                      height: 48,
                      marginBottom: 14
                    }}
                  />

                  {/* Description Field */}
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 15, 
                    marginBottom: 8, 
                    letterSpacing: 0.5, 
                    color: colors.text 
                  }}>
                    DESCRIPTION
                  </div>
                  <textarea
                    placeholder="Event Description"
                    value={draft.details}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDraftChange(idx, 'details', e.target.value)}
                    style={{
                      ...getInputStyles(isDark),
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 18,
                      minHeight: 100,
                      marginBottom: 14,
                      resize: 'vertical'
                    }}
                  />

                  {/* Module Drop Zone with Glass Effect */}
                  <div
                    style={{ 
                      ...getGlassStyles(isDark),
                      padding: 24, 
                      minHeight: 60, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      cursor: 'copy', 
                      marginTop: 24,
                      border: `2px dashed ${colors.border}`,
                      background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      marginBottom: 24
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

                  {/* Display Added Modules with Glass Effect */}
                  {Object.entries(draft.modules || {}).filter(([_, isActive]) => isActive).map(([moduleKey, _]) => {
                    const module = ITINERARY_MODULES.find(m => m.key === moduleKey);
                    if (!module) return null;
                    return (
                      <div key={moduleKey} style={{
                        background: isDark ? 'rgba(30,30,30,0.75)' : '#fff',
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
                          onClick={() => handleRemoveModule(idx, moduleKey)}
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
                        <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#fff' : '#000', marginBottom: 4 }}>{module.label}</div>
                        {moduleKey === 'document' ? (
                          <div>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx,.csv,.txt"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    console.log('📤 Uploading document:', file.name);
                                    const url = await uploadFileToBucket(file, 'itinerary-documents', `event_${eventId}`);
                                    console.log('✅ Document uploaded:', url);
                                    handleModuleValueChange(idx, moduleKey, url);
                                  } catch (error) {
                                    console.error('❌ Document upload failed:', error);
                                    alert('Failed to upload document. Please try again.');
                                  }
                                } else {
                                  handleModuleValueChange(idx, moduleKey, '');
                                }
                              }}
                              style={{
                                marginBottom: 8,
                                color: isDark ? '#fff' : '#111',
                                background: 'transparent',
                                border: 'none',
                                fontSize: 14
                              }}
                            />
                            {draft.moduleValues?.[moduleKey] && (
                              <div style={{ fontSize: 14, marginTop: 4 }}>
                                Uploaded: <b>{typeof draft.moduleValues[moduleKey] === 'string' ? draft.moduleValues[moduleKey].split('/').pop() : draft.moduleValues[moduleKey]}</b>
                              </div>
                            )}
                          </div>
                        ) : moduleKey === 'qrcode' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input
                              type="text"
                              placeholder="QR Code URL (optional)"
                              value={draft.moduleValues?.[moduleKey]?.url || ''}
                              onChange={e => handleModuleValueChange(idx, moduleKey, { ...draft.moduleValues?.[moduleKey], url: e.target.value })}
                              style={{
                                width: '100%',
                                borderRadius: 8,
                                background: isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb',
                                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.13)' : '#d1d5db'}`,
                                color: isDark ? '#fff' : '#111',
                                padding: '10px 12px',
                                fontSize: 14,
                                outline: 'none',
                              }}
                            />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    console.log('📤 Uploading QR code image:', file.name);
                                    const url = await uploadFileToBucket(file, 'itinerary-qrcodes', `event_${eventId}`);
                                    console.log('✅ QR code image uploaded:', url);
                                    handleModuleValueChange(idx, moduleKey, { ...draft.moduleValues?.[moduleKey], image: url });
                                  } catch (error) {
                                    console.error('❌ QR code upload failed:', error);
                                    alert('Failed to upload QR code image. Please try again.');
                                  }
                                } else {
                                  handleModuleValueChange(idx, moduleKey, { ...draft.moduleValues?.[moduleKey], image: '' });
                                }
                              }}
                              style={{ color: isDark ? '#fff' : '#111', background: 'transparent', border: 'none', fontSize: 14 }}
                            />
                            {(draft.moduleValues?.[moduleKey]?.url || draft.moduleValues?.[moduleKey]?.image) && (
        <div style={{ marginTop: 8 }}>
                                {draft.moduleValues?.[moduleKey]?.url && (
                                  <div style={{ fontSize: 13, marginBottom: 4 }}>URL: <b>{draft.moduleValues[moduleKey].url}</b></div>
                                )}
                                {draft.moduleValues?.[moduleKey]?.image && (
                                                                      <div style={{ fontSize: 13 }}>Image: <b>{typeof draft.moduleValues[moduleKey].image === 'string' ? draft.moduleValues[moduleKey].image.split('/').pop() : draft.moduleValues[moduleKey].image}</b></div>
                                )}
        </div>
      )}
                          </div>
                        ) : moduleKey === 'contact' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input
                              type="text"
                              placeholder="Contact Name"
                              value={draft.moduleValues?.[moduleKey]?.name || ''}
                              onChange={e => handleModuleValueChange(idx, moduleKey, { ...draft.moduleValues?.[moduleKey], name: e.target.value })}
                              style={{ width: '100%', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.13)' : '#d1d5db'}`, color: isDark ? '#fff' : '#111', padding: '10px 12px', fontSize: 14, outline: 'none' }}
                            />
                            <input
                              type="text"
                              placeholder="Phone"
                              value={draft.moduleValues?.[moduleKey]?.phone || ''}
                              onChange={e => handleModuleValueChange(idx, moduleKey, { ...draft.moduleValues?.[moduleKey], phone: e.target.value })}
                              style={{ width: '100%', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.13)' : '#d1d5db'}`, color: isDark ? '#fff' : '#111', padding: '10px 12px', fontSize: 14, outline: 'none' }}
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={draft.moduleValues?.[moduleKey]?.email || ''}
                              onChange={e => handleModuleValueChange(idx, moduleKey, { ...draft.moduleValues?.[moduleKey], email: e.target.value })}
                              style={{ width: '100%', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.13)' : '#d1d5db'}`, color: isDark ? '#fff' : '#111', padding: '10px 12px', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                        ) : moduleKey === 'notifications' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                              {[
                                { label: '24 hours', value: '24h' },
                                { label: '8 hours', value: '8h' },
                                { label: '6 hours', value: '6h' },
                                { label: '4 hours', value: '4h' },
                                { label: '3 hours', value: '3h' },
                                { label: '2 hours', value: '2h' },
                                { label: '1 hour', value: '1h' },
                                { label: '50 minutes', value: '50m' },
                                { label: '45 minutes', value: '45m' },
                                { label: '30 minutes', value: '30m' },
                                { label: '15 minutes', value: '15m' },
                              ].map(opt => {
                                const selected = Array.isArray(draft.moduleValues?.[moduleKey]) && draft.moduleValues[moduleKey].includes(opt.value);
                                return (
                                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer', background: selected ? (isDark ? '#222' : '#e0e7ef') : 'transparent', borderRadius: 6, padding: '4px 6px', border: selected ? `1.5px solid ${isDark ? '#fff' : '#222'}` : '1.5px solid transparent' }}>
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={e => {
                                        let arr = Array.isArray(draft.moduleValues?.[moduleKey]) ? [...draft.moduleValues[moduleKey]] : [];
                                        if (e.target.checked) {
                                          arr.push(opt.value);
                                        } else {
                                          arr = arr.filter((t: string) => t !== opt.value);
                                        }
                                        handleModuleValueChange(idx, moduleKey, arr);
                                      }}
                                      style={{ accentColor: isDark ? '#fff' : '#222', marginRight: 4 }}
                                    />
                                    {opt.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={draft.moduleValues?.[moduleKey] || ''}
                            onChange={e => handleModuleValueChange(idx, moduleKey, e.target.value)}
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
                            placeholder={module.label}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>

                  </div>
                </div>
              </div>
            ) : (
              // COLLAPSED VIEW
              <div 
                style={{ padding: 24, cursor: 'pointer' }}
                onClick={() => setExpandedDraftIndex(idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
                      {draft.title || 'Untitled Event'}
                    </div>
                    <div style={{ fontSize: 14, color: '#666' }}>
                      {draft.arrivalTime} - {draft.startTime} - {draft.endTime}
                      {draft.location && ` • ${draft.location}`}
                    </div>
                  </div>

                </div>
        </div>
      )}
          </div>
        ))}

        {/* Saved Items */}
        {items.map((item, idx) => (
          <div key={`item-${idx}`} style={{
            ...getGlassStyles(isDark),
            color: colors.text,
            border: expandedItemIndex === idx 
              ? `2px solid ${isDark ? '#ffffff' : '#000000'}` 
              : `2px solid ${colors.border}`,
            borderRadius: 14,
            marginBottom: 32,
            boxShadow: expandedItemIndex === idx ? '0 4px 16px rgba(0,0,0,0.1)' : '0 2px 8px #0001',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
            transition: 'all 0.3s ease-in-out',
            ...(item.id === glowItineraryId ? { animation: 'glowPulse 2s' } : {}),
          }}>
            {expandedItemIndex === idx ? (
              // EXPANDED VIEW - Match draft structure exactly
              <div style={{ padding: 32, position: 'relative' }}>
                <button
                  onClick={() => setExpandedItemIndex(null)}
                  title="Collapse"
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 76,
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
                    color: colors.textSecondary,
                    fontSize: 24,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'; 
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button
                  onClick={() => handleRemoveItem(idx)}
                  title="Delete Item"
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    ...getButtonStyles(isDark, 'danger'),
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = 'scale(1.1)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = 'scale(1)'; 
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path></svg>
                </button>

                <div style={{ paddingTop: '40px' }}>
                  {/* Title Field */}
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 15, 
                    marginBottom: 8, 
                    letterSpacing: 0.5, 
                    color: colors.text 
                  }}>
                    TITLE
                  </div>
                  <input
                    placeholder="Event Title"
                    value={item.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(idx, 'title', e.target.value)}
                    style={{
                      ...getInputStyles(isDark),
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 18,
                      height: 48,
                      marginBottom: 14
                    }}
                  />

                  {/* Date & Time Fields */}
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: colors.text }}>
                    DATE & TIME
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    {/* Date Field */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', marginRight: 8 }}>
                      <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, marginTop: 8, color: colors.textSecondary, textAlign: 'left', letterSpacing: 0.5 }}>Date</label>
                      <CustomDatePicker
                        value={item.date}
                        onChange={(value: string) => handleItemChange(idx, 'date', value)}
                        placeholder="Date (DD/MM/YYYY)"
                        isDark={isDark}
                        colors={colors}
                        id={`item-date-picker-${idx}`}
                        openDropdown={openDropdown}
                        setOpenDropdown={setOpenDropdown}
                      />
                    </div>
                    {/* Time Fields with Labels Above */}
                    {([
                      ['arrivalTime', 'Arrival Time'],
                      ['startTime', 'Start Time'],
                      ['endTime', 'End Time']
                    ] as [keyof ItineraryItem, string][]).map(([key, label]) => (
                      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', marginRight: 8 }} key={key}>
                        <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, marginTop: 8, color: colors.textSecondary, textAlign: 'left', letterSpacing: 0.5 }}>{label}</label>
                        <CustomGlassTimePicker
                          value={item[key] as string}
                          onChange={(value: string) => handleItemChange(idx, key, value)}
                          placeholder={label}
                          isDark={isDark}
                          colors={colors}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Location Field */}
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 15, 
                    marginBottom: 8, 
                    letterSpacing: 0.5, 
                    color: colors.text 
                  }}>
                    LOCATION
                  </div>
                  <input
                    placeholder="Event Location"
                    value={item.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(idx, 'location', e.target.value)}
                    style={{
                      ...getInputStyles(isDark),
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 18,
                      height: 48,
                      marginBottom: 14
                    }}
                  />

                  {/* Description Field */}
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 15, 
                    marginBottom: 8, 
                    letterSpacing: 0.5, 
                    color: colors.text 
                  }}>
                    DESCRIPTION
                  </div>
                  <textarea
                    placeholder="Event Description"
                    value={item.details}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleItemChange(idx, 'details', e.target.value)}
                    style={{
                      ...getInputStyles(isDark),
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 18,
                      minHeight: 100,
                      marginBottom: 14,
                      resize: 'vertical'
                    }}
                  />

                  {/* Module Drop Zone with Glass Effect */}
                  <div
                    style={{ 
                      ...getGlassStyles(isDark),
                      padding: 24, 
                      minHeight: 60, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      cursor: 'copy', 
                      marginTop: 24,
                      border: `2px dashed ${colors.border}`,
                      background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      marginBottom: 24
                    }}
                    onDrop={e => handleItemModuleDrop(idx, e)}
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

                  {/* Display Added Modules with Glass Effect */}
                  <div className="moduleList">
                    {Object.entries(item.modules || {}).filter(([_, isActive]) => isActive).map(([moduleKey, _]) => {
                      const module = ITINERARY_MODULES.find(m => m.key === moduleKey);
                      if (!module) return null;
                      return (
                        <div
                          key={moduleKey}
                          className="moduleItem"
                          style={{
                            background: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.95)',
                            border: `2px solid ${isDark ? 'rgba(255,255,255,0.10)' : '#e5e7eb'}`,
                            borderRadius: 18,
                            boxShadow: isDark ? '0 4px 24px #0008' : '0 2px 12px #0002',
                            padding: '28px 28px 20px 28px',
                            marginBottom: 28,
                            position: 'relative',
                            color: colors.text,
                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)'
                          }}
                        >
                          <button
                            className="moduleDeleteButton"
                            onClick={() => handleRemoveItemModule(idx, moduleKey)}
                            style={{
                              position: 'absolute',
                              top: 18,
                              right: 18,
                              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                              color: isDark ? '#fff' : '#222',
                              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#bbb'}`,
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              minWidth: 18,
                              minHeight: 18,
                              boxShadow: isDark ? '0 2px 8px #0004' : '0 1px 4px #0001',
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0, // ensure no extra padding
                              lineHeight: 1, // ensure no vertical stretching
                            }}
                            title="Remove module"
                          >×</button>
                          <div className="moduleItemContent">
                            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, color: colors.text }}>{module.label}</div>
                            {/* Document Upload */}
                            {moduleKey === 'document' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
                                <label style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                                  color: isDark ? '#fff' : '#222',
                                  border: `2px dotted ${isDark ? 'rgba(255,255,255,0.25)' : '#bbb'}`,
                                  borderRadius: 10,
                                  fontWeight: 500,
                                  fontSize: 16,
                                  padding: '0 18px',
                                  height: 48,
                                  minWidth: 200,
                                  cursor: 'pointer',
                                  width: '100%',
                                  transition: 'background 0.2s, color 0.2s',
                                  textAlign: 'center',
                                  letterSpacing: 0.2,
                                  position: 'relative',
                                }}>
                                  {item.moduleValues.document ? item.moduleValues.document.split('/').pop() : 'Choose file'}
                                  <input
                                    type="file"
                                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,image/png,image/jpeg"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setUploading(true);
                                        try {
                                          const url = await uploadFileToBucket(file, 'itinerary-documents', 'uploads');
                                          handleItemModuleValueChange(idx, 'document', url);
                                        } catch (err) {
                                          alert('Document upload failed: ' + (err instanceof Error ? err.message : String(err)));
                                        }
                                        setUploading(false);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                            {/* QR Code */}
                            {moduleKey === 'qrcode' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                <label style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                                  color: isDark ? '#fff' : '#222',
                                  border: `2px dotted ${isDark ? 'rgba(255,255,255,0.25)' : '#bbb'}`,
                                  borderRadius: 10,
                                  fontWeight: 500,
                                  fontSize: 16,
                                  padding: '0 18px',
                                  height: 48,
                                  minWidth: 160,
                                  cursor: 'pointer',
                                  width: 200,
                                  transition: 'background 0.2s, color 0.2s',
                                  textAlign: 'center',
                                  letterSpacing: 0.2,
                                  position: 'relative',
                                }}>
                                  {item.moduleValues.qrcode?.image ? item.moduleValues.qrcode.image.split('/').pop() : 'Choose file'}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setUploading(true);
                                        try {
                                          const url = await uploadFileToBucket(file, 'itinerary-qrcodes', 'uploads');
                                          handleItemModuleValueChange(idx, 'qrcode', { ...item.moduleValues?.qrcode, image: url });
                                        } catch (err) {
                                          alert('QR code upload failed: ' + (err instanceof Error ? err.message : String(err)));
                                        }
                                        setUploading(false);
                                      }
                                    }}
                                  />
                                </label>
                                <input
                                  type="text"
                                  placeholder="QR Code URL"
                                  value={item.moduleValues?.qrcode?.url || ''}
                                  onChange={e => handleItemModuleValueChange(idx, 'qrcode', { ...item.moduleValues?.qrcode, url: e.target.value })}
                                  style={{ ...getInputStyles(isDark), height: 48, borderRadius: 10, fontSize: 16, padding: '0 16px', flex: 1, minWidth: 0, margin: 0 }}
                                />
                              </div>
                            )}
                            {/* Host Contact Details */}
                            {moduleKey === 'contact' && (
                              <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                                <input
                                  placeholder="Host Name"
                                  value={item.moduleValues?.contact?.name || ''}
                                  onChange={(e) => handleItemModuleValueChange(idx, 'contact', { ...item.moduleValues?.contact, name: e.target.value })}
                                  style={{ ...getInputStyles(isDark), height: 48, borderRadius: 10, fontSize: 16, padding: '0 16px', width: 180 }}
                                />
                                <input
                                  placeholder="Phone"
                                  value={item.moduleValues?.contact?.phone || ''}
                                  onChange={(e) => handleItemModuleValueChange(idx, 'contact', { ...item.moduleValues?.contact, phone: e.target.value })}
                                  style={{ ...getInputStyles(isDark), height: 48, borderRadius: 10, fontSize: 16, padding: '0 16px', width: 180 }}
                                />
                                <input
                                  placeholder="Email"
                                  value={item.moduleValues?.contact?.email || ''}
                                  onChange={(e) => handleItemModuleValueChange(idx, 'contact', { ...item.moduleValues?.contact, email: e.target.value })}
                                  style={{ ...getInputStyles(isDark), height: 48, borderRadius: 10, fontSize: 16, padding: '0 16px', flex: 1, minWidth: 0 }}
                                />
                              </div>
                            )}
                            {/* Notifications Timer */}
                            {moduleKey === 'notifications' && (
                              <div style={{ width: '100%' }}>
                                {/* Removed label text as requested */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 18, rowGap: 12, width: '100%' }}>
                                  {[
                                    { label: '24 hours', value: 24 * 60 },
                                    { label: '8 hours', value: 8 * 60 },
                                    { label: '4 hours', value: 4 * 60 },
                                    { label: '3 hours', value: 3 * 60 },
                                    { label: '2 hours', value: 2 * 60 },
                                    { label: '1 hour', value: 60 },
                                    { label: '45 minutes', value: 45 },
                                    { label: '30 minutes', value: 30 },
                                    { label: '15 minutes', value: 15 },
                                  ].map((opt, i) => (
                                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: colors.text, whiteSpace: 'nowrap' }}>
                                      <input
                                        type="checkbox"
                                        checked={Array.isArray(item.moduleValues?.notifications) && item.moduleValues.notifications.map(String).includes(String(opt.value))}
                                        onChange={async e => {
                                          let newTimes = Array.isArray(item.moduleValues?.notifications) ? item.moduleValues.notifications.map(String) : [];
                                          const valueStr = String(opt.value);
                                          if (e.target.checked) {
                                            if (!newTimes.includes(valueStr)) newTimes.push(valueStr);
                                          } else {
                                            newTimes = newTimes.filter(v => v !== valueStr);
                                          }
                                          await handleItemModuleValueChange(idx, 'notifications', newTimes);
                                        }}
                                        style={{ accentColor: isDark ? '#fff' : '#000', width: 22, height: 22, marginRight: 8 }}
                                      />
                                      {opt.label}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // COLLAPSED VIEW
              <div 
                style={{ padding: 24, cursor: 'pointer' }}
                onClick={() => setExpandedItemIndex(idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      background: '#10b981',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0
                    }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 14, color: '#666' }}>
                        {item.arrivalTime} - {item.startTime} - {item.endTime}
                        {item.location && ` • ${item.location}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>

                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* No Items Message */}
        {drafts.length === 0 && items.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 40px',
            color: '#666',
            fontSize: 18,
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <div style={{ marginBottom: 8 }}>No itinerary items yet</div>
            <div style={{ fontSize: 16 }}>Click "Add New Item" to get started</div>
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
            onClick={() => navigate(`/event/${eventId}?tab=itineraries`)}
          >
            Cancel
          </button>
          <button
            style={{ 
              ...getButtonStyles(isDark, (drafts.length + items.length) > 0 ? 'primary' : 'secondary'),
              fontSize: 18,
              padding: '11px 37px',
              minWidth: '155px',
              height: 48, // Match Delete button height
              opacity: (drafts.length + items.length) > 0 ? 1 : 0.5,
              cursor: (drafts.length + items.length) > 0 ? 'pointer' : 'not-allowed'
            }}
            onClick={handleSaveItinerary}
            disabled={(drafts.length + items.length) === 0}
          >
            {isEditMode ? 'Update Itinerary' : `Publish ${drafts.length + items.length} Item${(drafts.length + items.length) !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Modals */}
        {isCsvModalOpen && ( <div>{/* CSV Modal Content */}</div> )}
        {showGroupModal && ( <div>{/* Group Modal Content */}</div> )}
        {showSuccess && ( <div>{/* Success Message Content */}</div> )}
        
        <style>{`
          @keyframes glowPulse {
            0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.7); }
            50% { box-shadow: 0 0 16px 8px rgba(59,130,246,0.25); }
            100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.0); }
          }
        `}</style>
      </div>

      {/* Sidebar */}
      <ModuleSidebar isCollapsed={isModuleSidebarCollapsed} onToggle={() => setIsModuleSidebarCollapsed(!isModuleSidebarCollapsed)} />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
          {/* Delete Modal Content */}
          </div>
        )}

        {/* CSV Upload Modal with Glass Effect */}
        {isCsvModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              ...getGlassStyles(isDark),
              width: 'clamp(500px, 60vw, 800px)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '24px 32px', 
                borderBottom: `1px solid ${colors.border}` 
              }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: 22, 
                  fontWeight: 600,
                  color: colors.text
                }}>
                  Upload Itinerary CSV
                </h2>
    </div>
              <div style={{ padding: 32 }}>
                <p style={{ 
                  marginBottom: 24, 
                  color: colors.textSecondary, 
                  lineHeight: 1.6 
                }}>
                  Upload a CSV file with your itinerary items. The file should include columns for title, arrival time, start time, end time, location, and description.
                  <br /><br />
                  <strong>Module Support:</strong> The template includes columns for all available modules (Time Slot, Location, Notes, Attendees, Resources). 
                  If you fill in module columns, they will automatically be added to your itinerary items.
                </p>
                
                <div style={{ marginBottom: 24 }}>
                  <button
                    onClick={handleDownloadCSVTemplate}
                    style={{
                      ...getButtonStyles(isDark, 'secondary'),
                      width: '100%',
                      marginBottom: 16
                    }}
                  >
                    Download CSV Template
                  </button>
                </div>

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleCsvUpload(file);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: `2px dashed ${colors.border}`,
                    borderRadius: 8,
                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                    marginBottom: 24,
                    color: colors.text
                  }}
                />
              </div>
              <div style={{ 
                padding: '0 32px 32px 32px', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 16 
              }}>
                <button
                  onClick={() => setIsCsvModalOpen(false)}
                  style={{
                    ...getButtonStyles(isDark, 'secondary'),
                    minWidth: '100px'
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...getButtonStyles(isDark, 'primary'),
                    minWidth: '100px'
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group Creation Modal with Glass Effect */}
        {showGroupModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              ...getGlassStyles(isDark),
              width: 'clamp(400px, 50vw, 600px)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '24px 32px', 
                borderBottom: `1px solid ${colors.border}` 
              }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: 22, 
                  fontWeight: 600,
                  color: colors.text
                }}>
                  Create Itinerary Group
                </h2>
              </div>
              <div style={{ padding: 32 }}>
                <p style={{ 
                  marginBottom: 24, 
                  color: colors.textSecondary, 
                  lineHeight: 1.6 
                }}>
                  You're creating a group with multiple itinerary items. Please enter a name for this group to help organize your itineraries.
                </p>
                
                <div style={{ marginBottom: 24 }}>
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
                    value={tempGroupName}
                    onChange={(e) => setTempGroupName(e.target.value)}
                    placeholder="e.g. Morning Activities, Welcome Session, etc."
                    style={{
                      ...getInputStyles(isDark),
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 16,
                      height: 48,
                      boxSizing: 'border-box'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleConfirmGroup();
                      }
                    }}
                    autoFocus
                  />
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: 12 
                }}>
                  <button
                    onClick={handleCancelGroup}
                    style={{
                      ...getButtonStyles(isDark, 'secondary'),
                      minWidth: '100px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmGroup}
                    disabled={!tempGroupName.trim()}
                    style={{
                      ...getButtonStyles(isDark, tempGroupName.trim() ? 'primary' : 'secondary'),
                      minWidth: '100px',
                      opacity: tempGroupName.trim() ? 1 : 0.5,
                      cursor: tempGroupName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message and Glow Animation Style */}
        {showSuccess && (
          <div style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5000,
            background: isDark ? 'rgba(36,36,40,0.92)' : 'rgba(255,255,255,0.92)',
            borderRadius: 18,
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.08)',
            border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
            backdropFilter: 'blur(12px)',
            padding: '18px 32px',
            fontWeight: 700,
            fontSize: 18,
            color: isDark ? '#fff' : '#222',
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            {isEditMode ? 'Itinerary updated!' : 'Itinerary published!'}
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          zIndex: 1000,
        }}>
          <div style={{
            ...getGlassStyles(isDark),
            padding: 32,
            maxWidth: 400,
            width: '90%',
            textAlign: 'center',
          }}>
            <h3 style={{ color: colors.text, marginBottom: 16 }}>Delete Item</h3>
            <p style={{ color: colors.textSecondary, marginBottom: 24 }}>
              Are you sure you want to delete this itinerary item? This action cannot be undone.
            </p>
            <p style={{ color: colors.textSecondary, marginBottom: 16, fontSize: 14 }}>
              Type "delete" to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              style={{
                ...getInputStyles(isDark),
                width: '100%',
                marginBottom: 24,
                textAlign: 'center',
              }}
              placeholder="Type 'delete'"
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  ...getButtonStyles(isDark, 'secondary'),
                  padding: '10px 20px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                style={{
                  ...getButtonStyles(isDark, 'danger'),
                  padding: '10px 20px',
                  opacity: deleteConfirmText.toLowerCase() === 'delete' ? 1 : 0.5,
                  cursor: deleteConfirmText.toLowerCase() === 'delete' ? 'pointer' : 'not-allowed',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Message Notification */}
      {showSuccessMessage && (
        <div
          style={{
            position: 'fixed',
            top: 32,
            right: 32,
            zIndex: 9999,
            background: '#10b981',
            color: '#fff',
            padding: '16px 32px',
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
            transition: 'opacity 0.3s',
            opacity: showSuccessMessage ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          {successMessage}
        </div>
      )}
    </div>
  );
}

// --- SIDEBAR COMPONENT ---
const ModuleSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);

  return (
      <div style={{ 
        width: isCollapsed ? 32 : 280, 
        color: colors.text, 
        transition: 'width 0.2s', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: isCollapsed ? 'center' : 'flex-start', 
        padding: isCollapsed ? '40px 0' : '40px 24px', 
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
      <button onClick={onToggle} style={{ background: 'none', border: 'none', color: colors.text, fontSize: 22, cursor: 'pointer', alignSelf: isCollapsed ? 'center' : 'flex-end', marginBottom: 24 }} title={isCollapsed ? 'Show Modules' : 'Hide Modules'}>
          {isCollapsed ? '←' : '→'}
        </button>
        {!isCollapsed && (
          <>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>Itinerary Modules</div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ITINERARY_MODULES.map(module => (
                <div
                  key={module.key}
                  draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', module.key)}
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
                <div style={{ color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 16 }}>{module.label}</div>
        </div>
      ))}
      </div>
          </>
        )}
    </div>
  );
}; 

// --- DATE PICKER COMPONENTS ---
// Assuming CustomDatePicker and CustomGlassTimePicker are defined elsewhere or here

async function uploadFileToBucket(file: File, bucket: 'itinerary-documents' | 'itinerary-qrcodes', pathPrefix: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${pathPrefix}/${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });
  if (error) throw error;
  const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(filePath).data;
  return publicUrl;
}

// --- Clean Date Picker Component
interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isDark: boolean;
  colors: ReturnType<typeof getColors>;
  id: string;
  openDropdown: string | null;
  setOpenDropdown: (id: string | null) => void;
}
function CustomDatePicker({ value, onChange, placeholder, isDark, colors, id, openDropdown, setOpenDropdown }: CustomDatePickerProps) {
  const [month, setMonth] = React.useState(() => new Date().getMonth());
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const isOpen = openDropdown === id;
  function selectDate(day: number) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setOpenDropdown(null);
  }
  // Format value as dd/MM/yyyy for display
  let displayValue = value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split('-');
    displayValue = `${dd}/${mm}/${yyyy}`;
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accept both dd/MM/yyyy and yyyy-MM-dd
    let val = e.target.value;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [dd, mm, yyyy] = val.split('/');
      val = `${yyyy}-${mm}-${dd}`;
    }
    onChange(val);
  };
  const toggleDropdown = () => {
    setOpenDropdown(isOpen ? null : id);
  };
  return (
    <div style={{ position: 'relative', width: '100%' }} data-dropdown>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        onFocus={() => setOpenDropdown(id)}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '12px',
          border: `2px solid ${colors.border}`,
          background: colors.inputBg,
          color: colors.text,
          fontSize: '16px',
          transition: 'all 0.2s ease',
          height: '48px',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
        }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '100%',
          transform: 'translate(-50%, 8px)',
          zIndex: 1000,
          width: 300,
          ...getGlassStyles(isDark),
          padding: 20,
          boxSizing: 'border-box',
          borderRadius: 16,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb'}`,
          background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['S','M','T','W','T','F','S'].map((day, i) => (
              <div key={i} style={{ 
                textAlign: 'center', 
                fontWeight: 600, 
                color: colors.textSecondary, 
                fontSize: 12,
                padding: '4px 0'
              }}>
                {day}
              </div>
            ))}
            {Array(firstDay).fill(null).map((_, i) => <div key={'empty'+i} />)}
            {Array(daysInMonth).fill(null).map((_, i: number) => {
              const day = i + 1;
              const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
              const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  style={{
                    width: 32, 
                    height: 32, 
                    borderRadius: '6px', 
                    border: isToday ? '2px solid #fff' : 'none',
                    background: isSelected ? colors.accent : 'transparent',
                    color: isSelected ? '#000' : colors.text,
                    fontWeight: isSelected || isToday ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Standard Glassmorphic Time Picker (used throughout the app) ---
interface CustomGlassTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isDark: boolean;
  colors: ReturnType<typeof getColors>;
}
function CustomGlassTimePicker({ value, onChange, placeholder, isDark, colors }: CustomGlassTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState('');
  const [minute, setMinute] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  
  React.useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':');
      setHour(h);
      setMinute(m);
    }
  }, [value]);
  
  const handleSelect = (h: string, m: string) => {
    setHour(h);
    setMinute(m);
    onChange(`${h}:${m}`);
    setOpen(false);
  };
  
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }} ref={ref}>
      <input
        type="text"
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => {
          const val = e.target.value;
          if (/^\d{2}:\d{2}$/.test(val)) {
            const [h, m] = val.split(':');
            setHour(h);
            setMinute(m);
            onChange(val);
          } else {
            setHour('');
            setMinute('');
            onChange(val);
          }
        }}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '12px',
          border: `2px solid ${colors.border}`,
          background: colors.inputBg,
          color: colors.text,
          fontSize: '16px',
          transition: 'all 0.2s ease',
          height: '48px',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
        }}
        maxLength={5}
      />
      {open && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '100%',
          marginTop: 8,
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          display: 'flex',
          gap: 8,
          borderRadius: 16,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb'}`,
          background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)',
          zIndex: 1000,
          maxHeight: 220,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {hours.map(h => (
              <div
                key={h}
                onMouseDown={() => handleSelect(h, minute || '00')}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  background: h === hour ? '#fff' : 'transparent',
                  color: h === hour ? '#000' : (isDark ? '#fff' : '#222'),
                  fontWeight: h === hour ? 700 : 400,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.2s',
                }}
              >
                {h}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {minutes.map(m => (
              <div
                key={m}
                onMouseDown={() => handleSelect(hour || '00', m)}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  background: m === minute ? '#fff' : 'transparent',
                  color: m === minute ? '#000' : (isDark ? '#fff' : '#222'),
                  fontWeight: m === minute ? 700 : 400,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.2s',
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to convert dd/mm/yyyy or mm/dd/yyyy to yyyy-mm-dd
function toISODate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  // Already in yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // dd/mm/yyyy or mm/dd/yyyy
  const parts = dateStr.split(/[\/-]/);
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`; // yyyy-mm-dd
    if (c.length === 4) {
      // Try dd/mm/yyyy or mm/dd/yyyy
      // If both day and month <= 12, assume mm/dd/yyyy (US style)
      if (parseInt(a) > 12) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // dd/mm/yyyy
      if (parseInt(b) > 12) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`; // mm/dd/yyyy
      // Default to dd/mm/yyyy
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
  }
  return undefined;
}

// Helper to format yyyy-mm-dd to dd/mm/yyyy for UI display
function formatDateDisplay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
}