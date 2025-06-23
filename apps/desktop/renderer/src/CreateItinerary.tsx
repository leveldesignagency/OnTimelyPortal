import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import styles from './CreateItinerary.module.css';

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
  const { eventId, itineraryIndex } = useParams();
  const navigate = useNavigate();

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
  const [originalItinerary, setOriginalItinerary] = useState<any>(null);
  
  useEffect(() => {
    try {
        const events: EventType[] = JSON.parse(localStorage.getItem('timely_events') || '[]');
        const currentEvent = events.find(e => e.id === eventId);
        if (currentEvent) {
            setEventDetails(currentEvent);
        }

        // Check if we're editing an existing itinerary
        if (itineraryIndex !== undefined) {
          setIsEditMode(true);
          const existingItineraries = JSON.parse(localStorage.getItem(`event_itineraries_${eventId}`) || '[]');
          const itineraryToEdit = existingItineraries[parseInt(itineraryIndex)];
          
          if (itineraryToEdit) {
            setOriginalItinerary(itineraryToEdit);
            // Load existing items as drafts for editing
            const existingDrafts = itineraryToEdit.items.map((item: ItineraryItem) => ({
              ...item,
              id: `edit_${Date.now()}_${Math.random()}` // Generate new IDs for editing
            }));
            setDrafts(existingDrafts);
            // Expand the first draft by default
            if (existingDrafts.length > 0) {
              setExpandedDraftIndex(0);
            }
          }
        }
    } catch (e) {
        console.error("Failed to load event details", e);
    }
  }, [eventId, itineraryIndex]);

  const formatDateRange = (from: string, to: string) => {
      if (!from || !to) return '';
      const fromDate = new Date(from).toLocaleDateString('en-GB');
      const toDate = new Date(to).toLocaleDateString('en-GB');
      return `${fromDate} - ${toDate}`;
  }

  const handleAddDraft = () => {
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
    };
    setDrafts([newDraft, ...drafts]);
    setExpandedDraftIndex(0);
  };

  const handleDraftChange = (idx: number, key: keyof ItineraryItem, value: any) => {
    setDrafts(d => d.map((draft, i) => i === idx ? { ...draft, [key]: value } : draft));
  };

  const handleSaveDraft = (idx: number) => {
    const draft = drafts[idx];
    if (!draft.title.trim() || !draft.arrivalTime.trim() || !draft.startTime.trim() || !draft.endTime.trim() || !draft.location.trim()) {
      alert('Please fill in Title, Arrival Time, Start Time, End Time, and Location');
      return;
    }
    setItems(g => [...g, draft]);
    setDrafts(d => d.filter((_, i) => i !== idx));
    setExpandedDraftIndex(null);
  };

  const handleRemoveDraft = (idx: number) => {
    setDrafts(d => d.filter((_, i) => i !== idx));
    setExpandedDraftIndex(null);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(g => g.filter((_, i) => i !== idx));
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
    setDrafts(d => d.map((draft, i) => 
      i === draftIdx 
        ? { 
            ...draft, 
            moduleValues: { ...draft.moduleValues, [moduleKey]: value }
          }
        : draft
    ));
  };

  const handleSaveItinerary = () => {
    if (items.length === 0) {
      alert('Please add at least one itinerary item before saving.');
      return;
    }

    try {
      // Load existing itineraries
      const existingItineraries = JSON.parse(localStorage.getItem(`event_itineraries_${eventId}`) || '[]');
      
      if (isEditMode && itineraryIndex !== undefined) {
        // Update existing itinerary
        const updatedItinerary = {
          ...originalItinerary,
          items: items,
          updatedAt: new Date().toISOString()
        };
        
        existingItineraries[parseInt(itineraryIndex)] = updatedItinerary;
        localStorage.setItem(`event_itineraries_${eventId}`, JSON.stringify(existingItineraries));
        
        // Navigate back to EventDashboard itinerary tab
        navigate(`/event/${eventId}?tab=itineraries`);
      } else {
        // Create new itinerary
        const itinerary = {
          title: eventDetails?.name ? `${eventDetails.name} Itinerary` : 'New Itinerary',
          items: items,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Add new itinerary
        const updatedItineraries = [...existingItineraries, itinerary];
        localStorage.setItem(`event_itineraries_${eventId}`, JSON.stringify(updatedItineraries));
        
        // Navigate to EventDashboard itinerary tab
        navigate(`/event/${eventId}?tab=itineraries`);
      }
    } catch (error) {
      console.error('Error saving itinerary:', error);
      alert('Failed to save itinerary. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate(`/event/${eventId}?tab=itineraries`);
  };

  const handleDownloadCSVTemplate = () => {
    // Basic form fields
    const basicHeaders = [
      'Title', 'Arrival Time', 'Start Time', 'End Time', 'Location', 'Description'
    ];
    
    // Add all available modules as columns
    const moduleHeaders = ITINERARY_MODULES.map(module => module.label);
    
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
                default:
                  // Check if this header matches any module
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
      }));

      setDrafts(d => [...d, ...newDrafts]);
      setIsCsvModalOpen(false);
    } catch (error) {
      console.error('CSV upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to parse CSV file.');
    }
  };

  const handleEditItem = (idx: number) => {
    const item = items[idx];
    const newDraft: ItineraryItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random()}`, // Generate new ID for draft
    };
    setDrafts(d => [newDraft, ...d]);
    setItems(g => g.filter((_, i) => i !== idx));
    setExpandedDraftIndex(0);
    setEditingItemIndex(null);
  };

  // --- RENDER ---
  return (
    <div style={{ display: 'flex', background: '#fff', minHeight: '100vh' }}>
      {/* Main Content */}
      <div style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: 40, fontFamily: 'Roboto, Arial, system-ui, sans-serif', color: '#222', position: 'relative', height: '100vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 36, fontWeight: 500, marginBottom: 0 }}>{eventDetails?.name}</div>
        <hr style={{ margin: '12px 0 8px 0', border: 'none', borderTop: '2px solid #bbb' }} />
        <div style={{ fontSize: 26, fontWeight: 500, marginBottom: 24, marginTop: 0, textAlign: 'left' }}>
          {isEditMode ? 'Edit Itinerary' : 'Create Itinerary'}
        </div>

        {/* Action Buttons */}
        <div style={{ maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              onClick={handleAddDraft}
              style={{ 
                background: '#222', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 500, 
                fontSize: 18, 
                padding: '14px 34px', 
                cursor: 'pointer',
                minWidth: '165px'
              }}
            >
              Add New Item
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              style={{ 
                background: '#fff', 
                color: '#222', 
                border: '2px solid #222', 
                borderRadius: 8, 
                fontWeight: 500, 
                fontSize: 18, 
                padding: '12px 32px', 
                cursor: 'pointer',
                minWidth: '145px'
              }}
            >
              Upload CSV
            </button>
          </div>
        </div>

        {/* Draft Items */}
        {drafts.map((draft, idx) => (
          <div key={`draft-${idx}`} style={{
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
                  onClick={() => handleRemoveDraft(idx)}
                  title="Delete Draft"
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    background: '#ef4444',
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
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path></svg>
                </button>

                <div style={{ paddingTop: '40px' }}>
                  {/* Title Field */}
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>TITLE</div>
                  <input
                    placeholder="Event Title"
                    value={draft.title}
                    onChange={(e) => handleDraftChange(idx, 'title', e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      background: '#f7f8fa',
                      border: '1.5px solid #d1d5db',
                      padding: 10,
                      fontSize: 18,
                      height: 48,
                      marginBottom: 14
                    }}
                  />

                  {/* Time Fields */}
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>TIME</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Arrival Time</div>
                      <input
                        type="time"
                        value={draft.arrivalTime}
                        onChange={(e) => handleDraftChange(idx, 'arrivalTime', e.target.value)}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          background: '#f7f8fa',
                          border: '1.5px solid #d1d5db',
                          padding: 10,
                          fontSize: 18,
                          height: 48
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Start Time</div>
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(e) => handleDraftChange(idx, 'startTime', e.target.value)}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          background: '#f7f8fa',
                          border: '1.5px solid #d1d5db',
                          padding: 10,
                          fontSize: 18,
                          height: 48
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>End Time</div>
                      <input
                        type="time"
                        value={draft.endTime}
                        onChange={(e) => handleDraftChange(idx, 'endTime', e.target.value)}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          background: '#f7f8fa',
                          border: '1.5px solid #d1d5db',
                          padding: 10,
                          fontSize: 18,
                          height: 48
                        }}
                      />
                    </div>
                  </div>

                  {/* Location Field */}
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>LOCATION</div>
                  <input
                    placeholder="Event Location"
                    value={draft.location}
                    onChange={(e) => handleDraftChange(idx, 'location', e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      background: '#f7f8fa',
                      border: '1.5px solid #d1d5db',
                      padding: 10,
                      fontSize: 18,
                      height: 48,
                      marginBottom: 14
                    }}
                  />

                  {/* Description Field */}
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: 0.5, color: '#222' }}>DESCRIPTION</div>
                  <textarea
                    placeholder="Event Description"
                    value={draft.details}
                    onChange={(e) => handleDraftChange(idx, 'details', e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      background: '#f7f8fa',
                      border: '1.5px solid #d1d5db',
                      padding: 10,
                      fontSize: 18,
                      minHeight: 100,
                      marginBottom: 14,
                      resize: 'vertical'
                    }}
                  />

                  {/* Module Drop Zone */}
                  <div
                    style={{ 
                      border: '2px dashed #d1d5db', 
                      borderRadius: 8, 
                      background: '#fff', 
                      padding: 24, 
                      minHeight: 60, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      cursor: 'copy', 
                      marginTop: 24 
                    }}
                    onDrop={e => handleModuleDrop(idx, e)}
                    onDragOver={e => e.preventDefault()}
                  >
                    <span style={{ color: '#9ca3af', fontSize: 16, fontWeight: 500 }}>Drag modules here</span>
                  </div>

                  {/* Display Added Modules */}
                  {Object.entries(draft.modules || {}).filter(([_, isActive]) => isActive).map(([moduleKey, _]) => {
                    const module = ITINERARY_MODULES.find(m => m.key === moduleKey);
                    if (!module) return null;
                    
                    return (
                      <div key={moduleKey} style={{
                        background: '#ffffff',
                        border: '2px solid #e5e7eb',
                        borderRadius: 8,
                        padding: 20,
                        marginTop: 16,
                        position: 'relative'
                      }}>
                        <button
                          onClick={() => handleRemoveModule(idx, moduleKey)}
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            background: '#000000',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          ×
                        </button>
                        
                        {/* Document Upload Module */}
                        {module.type === 'file' && (
                          <div>
                            <div style={{ 
                              marginBottom: 16,
                              paddingRight: 40
                            }}>
                              <div style={{ 
                                fontSize: 16, 
                                fontWeight: 600, 
                                color: '#000000',
                                marginBottom: 4
                              }}>
                                {module.label}
                              </div>
                              <div style={{ 
                                fontSize: 14, 
                                color: '#6b7280',
                                fontWeight: 400
                              }}>
                                Upload PNG, JPG, or PDF files
                              </div>
                            </div>
                            <div style={{
                              border: '2px dashed #d1d5db',
                              borderRadius: 6,
                              padding: 24,
                              textAlign: 'center',
                              background: '#f9fafb',
                              position: 'relative',
                              cursor: 'pointer'
                            }}>
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleModuleValueChange(idx, moduleKey, file.name);
                                  }
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  opacity: 0,
                                  cursor: 'pointer'
                                }}
                              />
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                                Drop files here or click to browse
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>
                                Supports PNG, JPG, and PDF files
                              </div>
                              {draft.moduleValues?.[moduleKey] && (
                                <div style={{
                                  marginTop: 12,
                                  padding: 8,
                                  background: '#f3f4f6',
                                  border: '1px solid #d1d5db',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  color: '#374151',
                                  fontWeight: 500
                                }}>
                                  Selected: {draft.moduleValues[moduleKey]}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* QR Code Module */}
                        {module.type === 'qrcode' && (
                          <div>
                            <div style={{ 
                              marginBottom: 16,
                              paddingRight: 40
                            }}>
                              <div style={{ 
                                fontSize: 16, 
                                fontWeight: 600, 
                                color: '#000000',
                                marginBottom: 4
                              }}>
                                {module.label}
                              </div>
                              <div style={{ 
                                fontSize: 14, 
                                color: '#6b7280',
                                fontWeight: 400
                              }}>
                                Generate QR code from URL or upload image
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  fontSize: 14, 
                                  fontWeight: 500, 
                                  color: '#374151', 
                                  marginBottom: 6 
                                }}>
                                  Enter URL
                                </label>
                                <input
                                  type="url"
                                  placeholder="https://example.com"
                                  value={draft.moduleValues?.[moduleKey]?.url || ''}
                                  onChange={(e) => handleModuleValueChange(idx, moduleKey, { 
                                    ...draft.moduleValues?.[moduleKey], 
                                    url: e.target.value 
                                  })}
                                  style={{
                                    width: '100%',
                                    borderRadius: 6,
                                    background: '#ffffff',
                                    border: '1px solid #d1d5db',
                                    padding: '10px 12px',
                                    fontSize: 14,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                              
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 12,
                                margin: '4px 0'
                              }}>
                                <div style={{ height: '1px', background: '#d1d5db', flex: 1 }}></div>
                                <div style={{ 
                                  fontSize: 12, 
                                  color: '#6b7280', 
                                  fontWeight: 500
                                }}>
                                  OR
                                </div>
                                <div style={{ height: '1px', background: '#d1d5db', flex: 1 }}></div>
                              </div>
                              
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  fontSize: 14, 
                                  fontWeight: 500, 
                                  color: '#374151', 
                                  marginBottom: 6 
                                }}>
                                  Upload QR Code Image
                                </label>
                                <div style={{
                                  border: '2px dashed #d1d5db',
                                  borderRadius: 6,
                                  padding: 16,
                                  textAlign: 'center',
                                  background: '#f9fafb',
                                  position: 'relative',
                                  cursor: 'pointer'
                                }}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleModuleValueChange(idx, moduleKey, { 
                                          ...draft.moduleValues?.[moduleKey], 
                                          image: file.name 
                                        });
                                      }
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      opacity: 0,
                                      cursor: 'pointer'
                                    }}
                                  />
                                  <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>
                                    Click to upload QR code image
                                  </div>
                                  {draft.moduleValues?.[moduleKey]?.image && (
                                    <div style={{
                                      marginTop: 8,
                                      padding: 6,
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: 4,
                                      fontSize: 12,
                                      color: '#374151',
                                      fontWeight: 500
                                    }}>
                                      Selected: {draft.moduleValues[moduleKey].image}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Host Contact Details Module */}
                        {module.type === 'contact' && (
                          <div>
                            <div style={{ 
                              marginBottom: 16,
                              paddingRight: 40
                            }}>
                              <div style={{ 
                                fontSize: 16, 
                                fontWeight: 600, 
                                color: '#000000',
                                marginBottom: 4
                              }}>
                                {module.label}
                              </div>
                              <div style={{ 
                                fontSize: 14, 
                                color: '#6b7280',
                                fontWeight: 400
                              }}>
                                Contact information for event host
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  fontSize: 14, 
                                  fontWeight: 500, 
                                  color: '#374151', 
                                  marginBottom: 6 
                                }}>
                                  Host Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="Enter host name"
                                  value={draft.moduleValues?.[moduleKey]?.name || ''}
                                  onChange={(e) => handleModuleValueChange(idx, moduleKey, { 
                                    ...draft.moduleValues?.[moduleKey], 
                                    name: e.target.value 
                                  })}
                                  style={{
                                    width: '100%',
                                    borderRadius: 6,
                                    background: '#ffffff',
                                    border: '1px solid #d1d5db',
                                    padding: '10px 12px',
                                    fontSize: 14,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                              
                              <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ 
                                    display: 'block', 
                                    fontSize: 14, 
                                    fontWeight: 500, 
                                    color: '#374151', 
                                    marginBottom: 6 
                                  }}>
                                    Phone Number
                                  </label>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                      type="text"
                                      placeholder="+1"
                                      value={draft.moduleValues?.[moduleKey]?.countryCode || ''}
                                      onChange={(e) => handleModuleValueChange(idx, moduleKey, { 
                                        ...draft.moduleValues?.[moduleKey], 
                                        countryCode: e.target.value 
                                      })}
                                      style={{
                                        width: '60px',
                                        borderRadius: 6,
                                        background: '#ffffff',
                                        border: '1px solid #d1d5db',
                                        padding: '10px 8px',
                                        fontSize: 14,
                                        textAlign: 'center',
                                        outline: 'none'
                                      }}
                                    />
                                    <input
                                      type="tel"
                                      placeholder="Enter phone number"
                                      value={draft.moduleValues?.[moduleKey]?.phone || ''}
                                      onChange={(e) => handleModuleValueChange(idx, moduleKey, { 
                                        ...draft.moduleValues?.[moduleKey], 
                                        phone: e.target.value 
                                      })}
                                      style={{
                                        flex: 1,
                                        borderRadius: 6,
                                        background: '#ffffff',
                                        border: '1px solid #d1d5db',
                                        padding: '10px 12px',
                                        fontSize: 14,
                                        outline: 'none'
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                <div style={{ flex: 1 }}>
                                  <label style={{ 
                                    display: 'block', 
                                    fontSize: 14, 
                                    fontWeight: 500, 
                                    color: '#374151', 
                                    marginBottom: 6 
                                  }}>
                                    Email Address
                                  </label>
                                  <input
                                    type="email"
                                    placeholder="host@example.com"
                                    value={draft.moduleValues?.[moduleKey]?.email || ''}
                                    onChange={(e) => handleModuleValueChange(idx, moduleKey, { 
                                      ...draft.moduleValues?.[moduleKey], 
                                      email: e.target.value 
                                    })}
                                    style={{
                                      width: '100%',
                                      borderRadius: 6,
                                      background: '#ffffff',
                                      border: '1px solid #d1d5db',
                                      padding: '10px 12px',
                                      fontSize: 14,
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Notifications Timer Module */}
                        {module.type === 'notifications' && (
                          <div>
                            <div style={{ 
                              marginBottom: 16,
                              paddingRight: 40
                            }}>
                              <div style={{ 
                                fontSize: 16, 
                                fontWeight: 600, 
                                color: '#000000',
                                marginBottom: 4
                              }}>
                                {module.label}
                              </div>
                              <div style={{ 
                                fontSize: 14, 
                                color: '#6b7280',
                                fontWeight: 400
                              }}>
                                Set reminder notifications for this event
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ 
                                fontSize: 14, 
                                fontWeight: 500, 
                                color: '#374151', 
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                              }}>
                                Select notification times:
                                <span style={{
                                  fontSize: 12,
                                  color: '#6b7280',
                                  fontWeight: 400,
                                  background: '#f3f4f6',
                                  padding: '2px 6px',
                                  borderRadius: 4
                                }}>
                                  {(draft.moduleValues?.[moduleKey] || []).length} selected
                                </span>
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                                gap: 8 
                              }}>
                                {[
                                  { value: '24h', label: '24 hours' },
                                  { value: '8h', label: '8 hours' },
                                  { value: '4h', label: '4 hours' },
                                  { value: '3h', label: '3 hours' },
                                  { value: '2h', label: '2 hours' },
                                  { value: '1h', label: '1 hour' },
                                  { value: '45m', label: '45 min' },
                                  { value: '30m', label: '30 min' },
                                  { value: '15m', label: '15 min' }
                                ].map(time => {
                                  const selectedTimes = draft.moduleValues?.[moduleKey] || [];
                                  const isSelected = selectedTimes.includes(time.value);
                                  return (
                                    <button
                                      key={time.value}
                                      type="button"
                                      onClick={() => {
                                        const currentTimes = draft.moduleValues?.[moduleKey] || [];
                                        const newTimes = isSelected
                                          ? currentTimes.filter((t: string) => t !== time.value)
                                          : [...currentTimes, time.value];
                                        handleModuleValueChange(idx, moduleKey, newTimes);
                                      }}
                                      style={{
                                        background: isSelected ? '#000000' : '#ffffff',
                                        color: isSelected ? '#ffffff' : '#374151',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        padding: '8px 12px',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                      }}
                                    >
                                      {time.label}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              {(draft.moduleValues?.[moduleKey] || []).length > 0 && (
                                <div style={{
                                  marginTop: 12,
                                  padding: 12,
                                  background: '#f9fafb',
                                  border: '1px solid #d1d5db',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  color: '#374151',
                                  fontWeight: 500
                                }}>
                                  {(draft.moduleValues[moduleKey] || []).length} notification{(draft.moduleValues[moduleKey] || []).length !== 1 ? 's' : ''} will be sent before this event
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                    <button
                      onClick={() => handleRemoveDraft(idx)}
                      style={{
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: 'pointer',
                        minWidth: '110px'
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleSaveDraft(idx)}
                      disabled={!draft.title || !draft.arrivalTime || !draft.startTime || !draft.endTime}
                      style={{
                        background: draft.title && draft.arrivalTime && draft.startTime && draft.endTime ? '#222' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: draft.title && draft.arrivalTime && draft.startTime && draft.endTime ? 'pointer' : 'not-allowed',
                        minWidth: '110px'
                      }}
                    >
                      Save Item
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
                      {draft.arrivalTime && draft.startTime && draft.endTime ? `${draft.arrivalTime} - ${draft.startTime} - ${draft.endTime}` : 'Time not set'}
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
                        background: draft.title && draft.arrivalTime && draft.startTime && draft.endTime ? '#222' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 14,
                        padding: '8px 16px',
                        cursor: draft.title && draft.arrivalTime && draft.startTime && draft.endTime ? 'pointer' : 'not-allowed',
                        minWidth: '85px'
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
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 14,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        minWidth: '85px'
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
            background: '#fff',
            border: expandedItemIndex === idx ? '2px solid #10b981' : '2px solid #d1d5db',
            borderRadius: 14,
            marginBottom: 32,
            boxShadow: expandedItemIndex === idx ? '0 4px 16px rgba(0,0,0,0.1)' : '0 2px 8px #0001',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
            transition: 'all 0.3s ease-in-out',
          }}>
            {expandedItemIndex === idx ? (
              // EXPANDED VIEW
              <div style={{ padding: 32, position: 'relative' }}>
                <button
                  onClick={() => setExpandedItemIndex(null)}
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
                  onClick={() => handleRemoveItem(idx)}
                  title="Delete Item"
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    background: '#ef4444',
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
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path></svg>
                </button>

                <div style={{ paddingTop: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{
                      background: '#10b981',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 600
                    }}>
                      ✓
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#10b981' }}>Saved Item</div>
                  </div>

                  <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
                  <div style={{ fontSize: 16, color: '#666', marginBottom: 12 }}>
                    {item.arrivalTime} - {item.startTime} - {item.endTime}
                    {item.location && ` • ${item.location}`}
                  </div>
                  {item.details && (
                    <div style={{ fontSize: 16, color: '#666', lineHeight: 1.5, marginBottom: 16 }}>
                      {item.details}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                    <button
                      onClick={() => handleEditItem(idx)}
                      style={{
                        background: '#f0f9ff',
                        color: '#0369a1',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: 'pointer',
                        minWidth: '110px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      style={{
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 16,
                        padding: '10px 24px',
                        cursor: 'pointer',
                        minWidth: '110px'
                      }}
                    >
                      Delete
                    </button>
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(idx);
                      }}
                      style={{
                        background: '#f0f9ff',
                        color: '#0369a1',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 14,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        minWidth: '65px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(idx);
                      }}
                      style={{
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 14,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        minWidth: '75px'
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

        {/* CSV Upload Modal */}
        {isCsvModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              width: 'clamp(500px, 60vw, 800px)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #eee' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Upload Itinerary CSV</h2>
              </div>
              <div style={{ padding: 32 }}>
                <p style={{ marginBottom: 24, color: '#666', lineHeight: 1.6 }}>
                  Upload a CSV file with your itinerary items. The file should include columns for title, arrival time, start time, end time, location, and description.
                  <br /><br />
                  <strong>Module Support:</strong> The template includes columns for all available modules (Time Slot, Location, Notes, Attendees, Resources). 
                  If you fill in module columns, they will automatically be added to your itinerary items.
                </p>
                
                <div style={{ marginBottom: 24 }}>
                  <button
                    onClick={handleDownloadCSVTemplate}
                    style={{
                      background: '#f8f9fa',
                      border: '2px solid #6c757d',
                      color: '#6c757d',
                      padding: '10px 20px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
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
                    border: '2px dashed #d1d5db',
                    borderRadius: 8,
                    background: '#f9fafb',
                    marginBottom: 24
                  }}
                />
              </div>
              <div style={{ padding: '0 32px 32px 32px', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                <button
                  onClick={() => setIsCsvModalOpen(false)}
                  style={{
                    background: '#fff',
                    border: '1px solid #222',
                    color: '#222',
                    padding: '10px 24px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{
                    background: '#222',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 48,
          paddingTop: 24,
          borderTop: '1px solid #e5e7eb',
          maxWidth: 1100,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          <button 
            style={{ 
              background: '#eee', 
              color: '#222', 
              fontWeight: 500, 
              fontSize: 18, 
              border: '1px solid #ccc', 
              borderRadius: 8, 
              padding: '10px 36px', 
              minWidth: '125px', 
              cursor: 'pointer' 
            }} 
            onClick={() => navigate(`/event/${eventId}?tab=dashboard`)}
          >
            Cancel
          </button>
          <button
            style={{ 
              background: items.length > 0 ? '#222' : '#ccc', 
              color: '#fff', 
              fontWeight: 500, 
              fontSize: 18, 
              border: 'none', 
              borderRadius: 8, 
              padding: '11px 37px',
              minWidth: '155px',
              opacity: items.length > 0 ? 1 : 0.5,
              cursor: items.length > 0 ? 'pointer' : 'not-allowed'
            }}
            onClick={handleSaveItinerary}
            disabled={items.length === 0}
          >
            {isEditMode ? 'Update Itinerary' : 'Publish Itinerary'}
          </button>
        </div>
      </div>

      {/* Module Sidebar */}
      <ModuleSidebar isCollapsed={isModuleSidebarCollapsed} onToggle={() => setIsModuleSidebarCollapsed(!isModuleSidebarCollapsed)} />
    </div>
  );
} 

// --- SIDEBAR COMPONENT ---
const ModuleSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, moduleKey: string) => {
    e.dataTransfer.setData('text/plain', moduleKey);
  };
  
  return (
      <div style={{ 
        width: isCollapsed ? 32 : 280, 
        background: '#222', 
        color: '#fff', 
        transition: 'width 0.2s', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: isCollapsed ? 'center' : 'flex-start', 
        padding: isCollapsed ? '40px 0' : '40px 24px', 
        minHeight: '100vh' 
      }}>
        <button 
          onClick={onToggle} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            fontSize: 22, 
            cursor: 'pointer', 
            alignSelf: isCollapsed ? 'center' : 'flex-end', 
            marginBottom: 24 
          }} 
          title={isCollapsed ? 'Show Modules' : 'Hide Modules'}
        >
          {isCollapsed ? '←' : '→'}
        </button>
        {!isCollapsed && (
          <>
            <div style={{ fontSize: 13, color: '#bbb', marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>Modules</div>
            
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ITINERARY_MODULES.map(module => (
                <div
                  key={module.key}
                  draggable
                  onDragStart={e => handleDragStart(e, module.key)}
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
                  <div style={{ color: '#222', fontWeight: 500 }}>
                    {module.label}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
  );
}; 