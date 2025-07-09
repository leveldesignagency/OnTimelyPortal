import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser, type User } from './lib/auth';
import { useRealtimeEvents } from './hooks/useRealtime';
import { 
  getItineraries, 
  addItinerary, 
  updateItinerary, 
  type Itinerary 
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
  id: string;
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
  const [isModuleSidebarCollapsed, setIsModuleSidebarCollapsed] = useState(false);
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
              id: `edit_${Date.now()}_${Math.random()}`,
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
            }
            console.log('Mapped draftItem:', draftItem);
            setDrafts([draftItem]);
            setExpandedDraftIndex(0);
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

  const handleSaveDraft = async (idx: number) => {
    const draft = drafts[idx];
    if (!draft.title.trim() || !draft.startTime.trim() || !draft.endTime.trim()) {
      alert('Please fill in Title, Start Time, and End Time');
      return;
    }

    if (!draft.date || !draft.date.trim()) {
      alert('Please select a date for this itinerary item');
      return;
    }

    if (!eventId || !currentUser) {
      alert('Missing event or user information.');
      return;
    }

    try {
      // Extract module values for this draft
      const documentModule = draft.modules?.document ? draft.moduleValues?.document : undefined;
      const qrcodeModule = draft.modules?.qrcode ? draft.moduleValues?.qrcode : undefined;
      const contactModule = draft.modules?.contact ? draft.moduleValues?.contact : undefined;
      const notificationsModule = draft.modules?.notifications ? draft.moduleValues?.notifications : undefined;
      
      console.log('💾 SAVING DRAFT TO DATABASE:', {
        title: draft.title,
        modules: draft.modules,
        moduleValues: draft.moduleValues,
        extractedValues: { documentModule, qrcodeModule, contactModule, notificationsModule }
      });

      const itineraryData = {
        event_id: eventId,
        company_id: currentUser.company_id,
        created_by: currentUser.id,
        title: draft.title,
        description: draft.details || '',
        arrival_time: draft.arrivalTime || undefined,
        start_time: draft.startTime,
        end_time: draft.endTime,
        location: draft.location || undefined,
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
        group_id: draft.group_id || undefined,
        group_name: draft.group_name || undefined,
        date: draft.date,
        // Legacy content field for backward compatibility
        content: {
          items: [draft]
        }
      };

      // Save to database - check if we're in edit mode
      if (isEditMode && originalItinerary?.id) {
        // UPDATE existing itinerary
        const updatedItinerary = await updateItinerary(originalItinerary.id, itineraryData);
        console.log('✅ Draft updated in database:', updatedItinerary);
        
        // Move from drafts to items array with existing ID
        setItems(g => [...g, { ...draft, id: originalItinerary.id }]);
        setDrafts(d => d.filter((_, i) => i !== idx));
        setExpandedDraftIndex(null);
        
        // Show success feedback
        showSuccessToast('Itinerary item updated successfully!');
      } else {
        // CREATE new itinerary
        const createdItinerary = await addItinerary(itineraryData);
        console.log('✅ Draft saved to database:', createdItinerary);
        
        // Move from drafts to items array
        setItems(g => [...g, { ...draft, id: createdItinerary.id }]);
        setDrafts(d => d.filter((_, i) => i !== idx));
        setExpandedDraftIndex(null);
        
        // Show success feedback
        showSuccessToast('Itinerary item saved successfully!');
      }
      
    } catch (error) {
      console.error('❌ Failed to save draft:', error);
      alert('Failed to save itinerary item. Please try again.');
    }
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
    // Check if we have any drafts or items to save
    const allItemsToSave = [...drafts, ...items];
    
    if (allItemsToSave.length === 0) {
      alert('Please add at least one itinerary item before saving.');
      return;
    }

    if (!eventId || !currentUser) {
      alert('Missing event or user information.');
      return;
    }

    try {
      // Validate that all items have required fields
      const invalidItems = allItemsToSave.filter(item => 
        !item.title.trim() || !item.startTime.trim() || !item.endTime.trim()
      );
      
      if (invalidItems.length > 0) {
        alert('Please fill in Title, Start Time, and End Time for all items before saving.');
        return;
      }

      // Validate that all items have a date
      const itemsWithoutDate = allItemsToSave.filter(item => 
        !item.date || !item.date.trim()
      );
      
      if (itemsWithoutDate.length > 0) {
        alert('⚠️ Date Required\n\nPlease select a date for all itinerary items before saving. Each activity must have a specific date to help your guests plan their schedule.\n\nTip: Use the date picker for each item to set when the activity will take place.');
        return;
      }

      // If we're in edit mode, update the existing itinerary
      if (isEditMode && originalItinerary?.id) {
        const firstItem = allItemsToSave[0];
        
        // Extract module values
        const documentModule = firstItem.modules?.document ? firstItem.moduleValues?.document : undefined;
        const qrcodeModule = firstItem.modules?.qrcode ? firstItem.moduleValues?.qrcode : undefined;
        const contactModule = firstItem.modules?.contact ? firstItem.moduleValues?.contact : undefined;
        const notificationsModule = firstItem.modules?.notifications ? firstItem.moduleValues?.notifications : undefined;

        const itineraryData = {
          title: firstItem.title,
          description: firstItem.details || '',
          arrival_time: firstItem.arrivalTime || undefined,
          start_time: firstItem.startTime,
          end_time: firstItem.endTime,
          location: firstItem.location || undefined,
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
          group_id: firstItem.group_id || undefined,
          group_name: firstItem.group_name || undefined,
          date: firstItem.date && firstItem.date.trim() ? firstItem.date : undefined, // FIX: Convert empty string to undefined
          // Legacy content field for backward compatibility
          content: {
            items: allItemsToSave
          }
        };

        const updatedItinerary = await updateItinerary(originalItinerary.id, itineraryData);
        console.log('Itinerary updated successfully:', updatedItinerary);
        setShowSuccess(true);
        setGlowItineraryId(updatedItinerary.id);
        setTimeout(() => {
          setShowSuccess(false);
          setGlowItineraryId(null);
          navigate(`/event/${eventId}?tab=itineraries`, { state: { glowId: updatedItinerary.id } });
        }, 2000);
      } else {
        // Create new itineraries (one for each item)
        const createdItineraries: any[] = [];
        
        for (const item of allItemsToSave) {
          // Debug: Log the item data before extraction
          console.log('🔍 DEBUGGING ITEM BEFORE SAVE:', {
            title: item.title,
            modules: item.modules,
            moduleValues: item.moduleValues
          });
          
          // Extract module values for each item
          const documentModule = item.modules?.document ? item.moduleValues?.document : undefined;
          const qrcodeModule = item.modules?.qrcode ? item.moduleValues?.qrcode : undefined;
          const contactModule = item.modules?.contact ? item.moduleValues?.contact : undefined;
          const notificationsModule = item.modules?.notifications ? item.moduleValues?.notifications : undefined;
          
          // Debug: Log the extracted values
          console.log('🔍 EXTRACTED MODULE VALUES:', {
            documentModule,
            qrcodeModule,
            contactModule,
            notificationsModule
          });

          const itineraryData = {
            event_id: eventId,
            company_id: currentUser.company_id,
            created_by: currentUser.id,
            title: item.title,
            description: item.details || '',
            arrival_time: item.arrivalTime || undefined,
            start_time: item.startTime,
            end_time: item.endTime,
            location: item.location || undefined,
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
            group_id: item.group_id || undefined,
            group_name: item.group_name || undefined,
            date: item.date && item.date.trim() ? item.date : undefined, // FIX: Convert empty string to undefined
            // Legacy content field for backward compatibility
            content: {
              originalItem: item
            }
          };

          const newItinerary = await addItinerary(itineraryData);
          createdItineraries.push(newItinerary);
        }
        
        console.log(`${createdItineraries.length} itinerary items created successfully:`, createdItineraries);
        setShowSuccess(true);
        setGlowItineraryId(createdItineraries[0].id);
        setTimeout(() => {
          setShowSuccess(false);
          setGlowItineraryId(null);
          navigate(`/event/${eventId}?tab=itineraries`, { state: { glowId: createdItineraries[0].id } });
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving itinerary to Supabase:', error);
      alert('Failed to save itinerary. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate(`/event/${eventId}?tab=itineraries`);
  };

  const handleDownloadCSVTemplate = () => {
    // Basic form fields
    const basicHeaders = [
      'Title', 'Arrival Time', 'Start Time', 'End Time', 'Location', 'Description', 'Date', 'Group ID', 'Group Name'
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
          for (const requiredHeader of requiredHeaders) {
            if (!headers.includes(requiredHeader)) {
              return reject(new Error(`CSV is missing required header: ${requiredHeader}`));
            }
          }

          const parsedData = lines.slice(1).map((line, rowIndex) => {
            const values = line.split(',').map(v => v.trim());
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
                case 'Date': entry.date = value; break;
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
            
            if (!entry.title) {
              throw new Error(`Row ${rowIndex + 2} is missing Title.`);
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
  };

  const handleCsvUpload = async (file: File) => {
    try {
      const parsedItems = await parseItineraryCsv(file);
      const newDrafts = parsedItems.map(item => ({
        id: `item_${Date.now()}_${Math.random()}`,
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

      setDrafts(d => [...d, ...newDrafts]);
      setIsCsvModalOpen(false);
    } catch (error) {
      console.error('CSV upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to parse CSV file.');
    }
  };

  const handleEditItem = (idx: number) => {
    setExpandedItemIndex(idx);
  };

  const handleItemChange = (idx: number, key: keyof ItineraryItem, value: any) => {
    setItems(items => items.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  };

  const handleItemModuleDrop = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    const moduleKey = e.dataTransfer.getData('text/plain');
    const module = ITINERARY_MODULES.find(m => m.key === moduleKey);
    if (module) {
      setItems(items => items.map((item, i) => i === idx ? {
        ...item,
        modules: { ...item.modules, [moduleKey]: true },
        moduleValues: { ...item.moduleValues, [moduleKey]: getDefaultModuleValue(moduleKey) }
      } : item));
    }
  };

  const handleRemoveItemModule = (itemIdx: number, moduleKey: string) => {
    setItems(items => items.map((item, i) => i === itemIdx ? {
      ...item,
      modules: { ...item.modules, [moduleKey]: false },
      moduleValues: { ...item.moduleValues, [moduleKey]: undefined }
    } : item));
  };

  const handleItemModuleValueChange = (itemIdx: number, moduleKey: string, value: any) => {
    setItems(items => items.map((item, i) => i === itemIdx ? {
      ...item,
      moduleValues: { ...item.moduleValues, [moduleKey]: value }
    } : item));
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
      alert('Document upload failed: ' + (err.message || err.toString()));
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
      alert('QR code upload failed: ' + (err.message || err.toString()));
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
                    width: 44,
                    height: 44,
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
                    width: 44,
                    height: 44,
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
                    onChange={(e) => handleDraftChange(idx, 'title', e.target.value)}
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
                    <div style={{ flex: 1, position: 'relative' }}>
                      <CustomDatePicker
                        value={draft.date}
                        onChange={(value) => handleDraftChange(idx, 'date', value)}
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
                      <div style={{ flex: 1, position: 'relative' }} key={key}>
                        <CustomGlassTimePicker
                          value={draft[key] as string}
                          onChange={value => handleDraftChange(idx, key, value)}
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
                    onChange={(e) => handleDraftChange(idx, 'location', e.target.value)}
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
                    onChange={(e) => handleDraftChange(idx, 'details', e.target.value)}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDraft(idx);
                      }}
                      style={{
                        background: '#18181b',
                        color: '#fff',
                        border: '1.5px solid #444',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: 'pointer',
                        minWidth: '100px',
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleSaveDraft(idx)}
                      disabled={!draft.title || !draft.arrivalTime || !draft.startTime || !draft.endTime}
                      style={{
                        background: '#18181b',
                        color: '#fff',
                        border: '1.5px solid #444',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: draft.title && draft.arrivalTime && draft.startTime && draft.endTime ? 'pointer' : 'not-allowed',
                        minWidth: '100px',
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                        opacity: draft.title && draft.arrivalTime && draft.startTime && draft.endTime ? 1 : 0.6
                      }}
                    >
                      Save
                    </button>
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveDraft(idx);
                      }}
                      disabled={!draft.title || !draft.arrivalTime || !draft.startTime || !draft.endTime}
                      style={{
                        background: '#18181b',
                        color: '#fff',
                        border: '1.5px solid #444',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: 'pointer',
                        minWidth: '100px',
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDraft(idx);
                      }}
                      style={{
                        background: '#18181b',
                        color: '#fff',
                        border: '1.5px solid #444',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: 'pointer',
                        minWidth: '100px',
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8
                      }}
                    >
                      Delete
                    </button>
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
                    width: 44,
                    height: 44,
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
                    width: 44,
                    height: 44,
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
                    onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
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
                    <div style={{ flex: 1, position: 'relative' }}>
                      <CustomDatePicker
                        value={item.date}
                        onChange={(value) => handleItemChange(idx, 'date', value)}
                        placeholder="Date (DD/MM/YYYY)"
                        isDark={isDark}
                        colors={colors}
                        id={`item-date-picker-${idx}`}
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
                      <div style={{ flex: 1, position: 'relative' }} key={key}>
                        <CustomGlassTimePicker
                          value={item[key] as string}
                          onChange={value => handleItemChange(idx, key, value)}
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
                    onChange={(e) => handleItemChange(idx, 'location', e.target.value)}
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
                    onChange={(e) => handleItemChange(idx, 'details', e.target.value)}
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
                      background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
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
                  {Object.entries(item.modules || {}).filter(([_, isActive]) => isActive).map(([moduleKey, _]) => {
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
                          onClick={() => handleRemoveItemModule(idx, moduleKey)}
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            color: 'white'
                          }}
                        >
                          ×
                        </button>
                        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
                          {module.label}
                        </div>
                        
                        {moduleKey === 'contact' && (
                          <div>
                            <input
                              placeholder="Contact Name"
                              value={item.moduleValues?.contact?.name || ''}
                              onChange={(e) => handleItemModuleValueChange(idx, 'contact', { ...item.moduleValues?.contact, name: e.target.value })}
                              style={{ ...getInputStyles(isDark), width: '100%', marginBottom: 8 }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                placeholder="Country Code"
                                value={item.moduleValues?.contact?.countryCode || ''}
                                onChange={(e) => handleItemModuleValueChange(idx, 'contact', { ...item.moduleValues?.contact, countryCode: e.target.value })}
                                style={{ ...getInputStyles(isDark), width: '30%' }}
                              />
                              <input
                                placeholder="Phone Number"
                                value={item.moduleValues?.contact?.phone || ''}
                                onChange={(e) => handleItemModuleValueChange(idx, 'contact', { ...item.moduleValues?.contact, phone: e.target.value })}
                                style={{ ...getInputStyles(isDark), width: '70%' }}
                              />
                            </div>
                            <input
                              placeholder="Email Address"
                              value={item.moduleValues?.contact?.email || ''}
                              onChange={(e) => handleItemModuleValueChange(idx, 'contact', { ...item.moduleValues?.contact, email: e.target.value })}
                              style={{ ...getInputStyles(isDark), width: '100%', marginTop: 8 }}
                            />
                          </div>
                        )}
                        
                        {moduleKey === 'notifications' && (
                          <div>
                            <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
                              Notification times (minutes before event):
                            </div>
                            <input
                              placeholder="e.g., 15,30,60"
                              value={Array.isArray(item.moduleValues?.notifications) ? item.moduleValues.notifications.join(',') : ''}
                              onChange={(e) => {
                                const times = e.target.value.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
                                handleItemModuleValueChange(idx, 'notifications', times);
                              }}
                              style={{ ...getInputStyles(isDark), width: '100%' }}
                            />
                          </div>
      )}
    </div>
  );
                  })}
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
                    <button
                      style={{
                        background: '#18181b',
                        color: '#fff',
                        border: '1.5px solid #444',
                        borderRadius: 8,
                        padding: '10px 24px',
                        fontSize: 16,
                        fontWeight: 500,
                        cursor: 'pointer',
                        marginRight: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 80,
                        height: 40
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(idx);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      style={{
                        background: '#18181b',
                        color: '#fff',
                        border: '1.5px solid #444',
                        borderRadius: 8,
                        padding: '10px 24px',
                        fontSize: 16,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 80,
                        height: 40
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(idx);
                      }}
                    >
                      Delete
                    </button>
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
            onClick={() => navigate(`/event/${eventId}?tab=dashboard`)}
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
                    📥 Download CSV Template
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
            top: '20px',
            right: '20px',
            background: isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.95)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px',
            fontWeight: '500',
            zIndex: 1000,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
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
function CustomDatePicker({ value, onChange, placeholder, isDark, colors, id, openDropdown, setOpenDropdown }) {
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
  function selectDate(day) {
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
  const handleInputChange = (e) => {
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button 
              type="button" 
              onClick={() => {
                if (month === 0) {
                  setMonth(11);
                  setYear(year - 1);
                } else {
                  setMonth(month - 1);
                }
              }} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: colors.text, 
                fontSize: 18, 
                cursor: 'pointer', 
                padding: '4px 8px',
                borderRadius: '4px',
                boxShadow: 'none',
              }}
            >
              ←
            </button>
            <span style={{ fontWeight: 600, fontSize: 16, color: colors.text }}>
              {monthNames[month]} {year}
            </span>
            <button 
              type="button" 
              onClick={() => {
                if (month === 11) {
                  setMonth(0);
                  setYear(year + 1);
                } else {
                  setMonth(month + 1);
                }
              }} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: colors.text, 
                fontSize: 18, 
                cursor: 'pointer', 
                padding: '4px 8px',
                borderRadius: '4px',
                boxShadow: 'none',
              }}
            >
              →
            </button>
          </div>
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
            {Array(daysInMonth).fill(null).map((_, i) => {
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

// --- Custom Glassmorphic Time Picker ---
function CustomGlassTimePicker({ value, onChange, placeholder, isDark, colors }) {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState('');
  const [minute, setMinute] = React.useState('');
  React.useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':');
      setHour(h);
      setMinute(m);
    }
  }, [value]);
  const handleSelect = (h, m) => {
    setHour(h);
    setMinute(m);
    onChange(`${h}:${m}`);
    setOpen(false);
  };
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  return (
    <div style={{ position: 'relative', width: '100%' }}>
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
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.13)' : '#d1d5db'}`,
          borderRadius: '12px',
          color: isDark ? '#fff' : '#000',
          width: '100%',
          fontSize: 16,
          height: 48,
          padding: '12px 16px',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
          outline: 'none',
          transition: 'all 0.2s',
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
          display: 'flex',
          gap: 8,
          ...getGlassStyles(isDark),
          borderRadius: 16,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb'}`,
          zIndex: 1000,
          maxHeight: 220,
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {hours.map(h => (
              <div
                key={h}
                onMouseDown={() => handleSelect(h, minute || '00')}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  background: h === hour ? colors.accent : 'transparent',
                  color: h === hour ? '#000' : colors.text,
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
                  background: m === minute ? colors.accent : 'transparent',
                  color: m === minute ? '#000' : colors.text,
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