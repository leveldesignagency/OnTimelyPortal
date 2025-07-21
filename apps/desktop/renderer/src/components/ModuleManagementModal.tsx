import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// --- Local Glassmorphic Time Picker ---
function GlassTimePicker({ value, onChange, isDark, onOpenChange }: { 
  value: string; 
  onChange: (time: string) => void; 
  isDark: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState('');
  const [minute, setMinute] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onOpenChange]);
  
  React.useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  
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
    onOpenChange?.(false);
  };
  
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }} ref={ref}>
      <input
        type="text"
        value={value}
        onFocus={() => {
          setOpen(true);
          onOpenChange?.(true);
        }}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          onOpenChange?.(false);
        }, 150)}
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
        placeholder="Time"
        style={{
          width: '100%',
          padding: '14px 18px',
          borderRadius: 10,
          border: `2px solid ${isDark ? '#333' : '#ddd'}`,
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          color: isDark ? '#fff' : '#111',
          fontSize: 18,
          marginBottom: 0,
          outline: 'none',
          boxSizing: 'border-box',
          marginTop: 4,
          transition: 'all 0.2s',
          backdropFilter: 'blur(10px)',
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

interface Module {
  id: string;
  module_type: string;
  title?: string;
  question?: string;
  time: string;
  label?: string;
  link?: string;
  file?: string;
  survey_data?: any;
  feedback_data?: any;
  created_at: string;
}

interface ModuleManagementModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  isDark: boolean;
}

export default function ModuleManagementModal({ open, onClose, eventId, isDark }: ModuleManagementModalProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load modules from database
  useEffect(() => {
    if (open && eventId) {
      loadModules();
    }
  }, [open, eventId]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_event_timeline_modules', {
        p_event_id: eventId
      });

      if (error) {
        console.error('Error loading modules:', error);
        return;
      }

      setModules(data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    const newSelection = new Set(selectedModules);
    if (newSelection.has(moduleId)) {
      newSelection.delete(moduleId);
    } else {
      newSelection.add(moduleId);
    }
    setSelectedModules(newSelection);
  };

  const selectAllModules = () => {
    if (selectedModules.size === modules.length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(modules.map(m => m.id)));
    }
  };

  const deleteSelectedModules = async () => {
    if (selectedModules.size === 0) return;

    try {
      const { error } = await supabase
        .from('timeline_modules')
        .delete()
        .in('id', Array.from(selectedModules));

      if (error) {
        console.error('Error deleting modules:', error);
        return;
      }

      // Also delete associated guest assignments
      await supabase
        .from('timeline_module_guests')
        .delete()
        .in('module_id', Array.from(selectedModules));

      setSelectedModules(new Set());
      setShowDeleteConfirm(false);
      loadModules(); // Refresh the list
      
      // Trigger timeline refresh
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshTimelineModules'));
      }, 300);
    } catch (error) {
      console.error('Error deleting modules:', error);
    }
  };

  const updateModule = async (moduleId: string, updates: Partial<Module>) => {
    try {
      const { error } = await supabase
        .from('timeline_modules')
        .update(updates)
        .eq('id', moduleId);

      if (error) {
        console.error('Error updating module:', error);
        return;
      }

      setEditingModule(null);
      loadModules(); // Refresh the list
      
      // Trigger timeline refresh
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshTimelineModules'));
      }, 300);
    } catch (error) {
      console.error('Error updating module:', error);
    }
  };

  const getModuleDisplayTitle = (module: Module) => {
    switch (module.module_type) {
      case 'question':
        return module.question || 'Question';
      case 'feedback':
        return module.title || 'Feedback';
      case 'survey':
        return module.title || 'Survey';
      case 'qrcode':
        return module.label || 'QR Code';
      default:
        return module.title || 'Module';
    }
  };



  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Close button outside container */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)',
          color: isDark ? '#fff' : '#000',
          fontSize: 20,
          cursor: 'pointer',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
          backdropFilter: 'blur(10px)',
          zIndex: 10001,
        }}
      >
        ×
      </button>

      <div style={{
        background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 24,
        maxWidth: 900,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: isDark ? '#fff' : '#000',
            margin: 0,
          }}>
            Module Management
          </h2>
        </div>

        {/* Action Bar */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          alignItems: 'center',
        }}>
          <button
            onClick={selectAllModules}
            style={{
              width: 120,
              height: 40,
              borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: isDark ? '#fff' : '#000',
              border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectedModules.size === modules.length ? 'Deselect All' : 'Select All'}
          </button>
          
          {selectedModules.size > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: 160,
                height: 40,
                borderRadius: 8,
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Delete Selected ({selectedModules.size})
            </button>
          )}
        </div>

        {/* Module List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
        }}>
          {loading ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: isDark ? '#888' : '#666',
            }}>
              Loading modules...
            </div>
          ) : modules.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: isDark ? '#888' : '#666',
            }}>
              No modules found for this event.
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                }}>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? '#888' : '#666',
                    width: 40,
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedModules.size === modules.length && modules.length > 0}
                      onChange={selectAllModules}
                      style={{ 
                        width: 16, 
                        height: 16,
                        accentColor: isDark ? '#fff' : '#000',
                      }}
                    />
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? '#888' : '#666',
                  }}>
                    Type
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? '#888' : '#666',
                  }}>
                    Title
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? '#888' : '#666',
                  }}>
                    Time
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? '#888' : '#666',
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => (
                  <tr
                    key={module.id}
                    style={{
                      borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                      background: selectedModules.has(module.id) 
                        ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                        : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedModules.has(module.id)}
                        onChange={() => toggleModuleSelection(module.id)}
                        style={{ 
                          width: 16, 
                          height: 16,
                          accentColor: isDark ? '#fff' : '#000',
                        }}
                      />
                    </td>
                    <td style={{
                      padding: '12px 8px',
                      fontSize: 14,
                      color: isDark ? '#fff' : '#000',
                    }}>
                      {getModuleTypeLabel(module.module_type)}
                    </td>
                    <td style={{
                      padding: '12px 8px',
                      fontSize: 14,
                      color: isDark ? '#fff' : '#000',
                      fontWeight: 500,
                    }}>
                      {getModuleDisplayTitle(module)}
                    </td>
                    <td style={{
                      padding: '12px 8px',
                      fontSize: 14,
                      color: isDark ? '#ccc' : '#666',
                    }}>
                      {module.time}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingModule(module)}
                          style={{
                            width: 80,
                            height: 32,
                            borderRadius: 6,
                            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            color: isDark ? '#fff' : '#000',
                            border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModules(new Set([module.id]));
                            setShowDeleteConfirm(true);
                          }}
                          style={{
                            width: 80,
                            height: 32,
                            borderRadius: 6,
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Module Modal */}
      {editingModule && (
        <EditModuleModal
          module={editingModule}
          onClose={() => setEditingModule(null)}
          onSave={(updates) => updateModule(editingModule.id, updates)}
          isDark={isDark}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderRadius: 16,
            padding: 24,
            maxWidth: 400,
            width: '90%',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: isDark ? '#fff' : '#000',
              marginBottom: 16,
            }}>
              Confirm Delete
            </h3>
            <p style={{
              fontSize: 14,
              color: isDark ? '#ccc' : '#666',
              marginBottom: 24,
            }}>
              Are you sure you want to delete {selectedModules.size} selected module{selectedModules.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  color: isDark ? '#fff' : '#000',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={deleteSelectedModules}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#ef4444',
                  color: '#fff',
                  border: '1px solid #ef4444',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for module type labels
const getModuleTypeLabel = (moduleType: string) => {
  switch (moduleType) {
    case 'question': return 'Question';
    case 'feedback': return 'Feedback';
    case 'survey': return 'Survey';
    case 'qrcode': return 'QR Code';
    case 'multiple_choice': return 'Multiple Choice';
    case 'photo_video': return 'Photo/Video';
    default: return moduleType;
  }
};

// Edit Module Modal Component
interface EditModuleModalProps {
  module: Module;
  onClose: () => void;
  onSave: (updates: Partial<Module>) => void;
  isDark: boolean;
}

function EditModuleModal({ module, onClose, onSave, isDark }: EditModuleModalProps) {
  const [title, setTitle] = useState(module.title || module.question || '');
  const [time, setTime] = useState(module.time);
  const [step, setStep] = useState(1);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  
  // Module-specific state
  const [options, setOptions] = useState<string[]>(
    module.module_type === 'multiple_choice' && module.survey_data?.options 
      ? module.survey_data.options 
      : ['', '']
  );
  const [label, setLabel] = useState(module.label || '');
  const [link, setLink] = useState(module.link || '');
  const [prompt, setPrompt] = useState(module.title || '');

  const handleSave = () => {
    const updates: Partial<Module> = { time };
    
    if (module.module_type === 'question' || module.module_type === 'multiple_choice') {
      updates.question = title;
    } else if (module.module_type === 'qrcode') {
      updates.label = title;
      updates.link = link;
    } else if (module.module_type === 'photo_video') {
      updates.title = prompt;
    } else {
      updates.title = title;
    }

    // Add module-specific data
    if (module.module_type === 'multiple_choice') {
      updates.survey_data = { options: options.filter(opt => opt.trim()) };
    }
    
    onSave(updates);
  };

  const handleAddOption = () => setOptions([...options, '']);
  const handleOptionChange = (idx: number, val: string) => setOptions(options.map((o, i) => i === idx ? val : o));
  const handleRemoveOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 10002,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 24,
        maxWidth: 900,
        width: '100%',
        minHeight: timePickerOpen ? '500px' : 'auto',
        maxHeight: timePickerOpen ? '95vh' : '90vh',
        overflow: timePickerOpen ? 'visible' : 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: isDark ? '#fff' : '#000',
            margin: 0,
          }}>
            Edit {getModuleTypeLabel(module.module_type)} Module
          </h2>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: timePickerOpen ? 'visible' : 'auto' }}>
          {step === 1 && (
            <div style={{ width: '100%' }}>
              {/* Question/Title Field */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', 
                  color: isDark ? '#aaa' : '#444', 
                  fontWeight: 600, 
                  fontSize: 15, 
                  marginBottom: 8 
                }}>
                  {module.module_type === 'question' || module.module_type === 'multiple_choice' ? 'Question' : 
                   module.module_type === 'qrcode' ? 'Label' :
                   module.module_type === 'photo_video' ? 'Prompt' : 'Title'}
                </label>
                <input
                  value={module.module_type === 'photo_video' ? prompt : title}
                  onChange={e => {
                    if (module.module_type === 'photo_video') {
                      setPrompt(e.target.value);
                    } else {
                      setTitle(e.target.value);
                    }
                  }}
                  placeholder={
                    module.module_type === 'question' || module.module_type === 'multiple_choice' ? 'Enter question...' : 
                    module.module_type === 'qrcode' ? 'Enter label...' :
                    module.module_type === 'photo_video' ? 'Enter prompt...' : 'Enter title...'
                  }
                  style={{ 
                    width: '100%', 
                    padding: '14px 18px', 
                    borderRadius: 10, 
                    border: `2px solid ${isDark ? '#333' : '#ddd'}`, 
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                    color: isDark ? '#fff' : '#111', 
                    fontSize: 18, 
                    outline: 'none', 
                    marginTop: 4, 
                    transition: 'all 0.2s', 
                    backdropFilter: 'blur(10px)' 
                  }}
                />
              </div>

              {/* Multiple Choice Options */}
              {module.module_type === 'multiple_choice' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    color: isDark ? '#aaa' : '#444', 
                    fontWeight: 600, 
                    fontSize: 15, 
                    marginBottom: 8 
                  }}>
                    Options
                  </label>
                  {options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <input
                        value={opt}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        style={{ 
                          flex: 1, 
                          padding: '10px 14px', 
                          borderRadius: 8, 
                          border: `1.5px solid ${isDark ? '#333' : '#ddd'}`, 
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                          color: isDark ? '#fff' : '#111', 
                          fontSize: 16, 
                          outline: 'none', 
                          marginRight: 8 
                        }}
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(idx)}
                          style={{
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            minHeight: 28,
                            borderRadius: 6,
                            border: `1.5px solid ${isDark ? '#f87171' : '#dc2626'}`,
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(220,38,38,0.08)',
                            color: isDark ? '#f87171' : '#dc2626',
                            fontWeight: 700,
                            fontSize: 18,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            marginLeft: 0,
                          }}
                          aria-label={`Remove option ${idx + 1}`}
                          type="button"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={handleAddOption} 
                    style={{ 
                      padding: '8px 16px', 
                      borderRadius: 8, 
                      border: '1.5px dashed #aaa', 
                      background: 'none', 
                      color: isDark ? '#fff' : '#222', 
                      fontWeight: 600, 
                      fontSize: 15, 
                      cursor: 'pointer', 
                      marginTop: 4 
                    }}
                  >
                    + Add Option
                  </button>
                </div>
              )}

              {/* QR Code Link Field */}
              {module.module_type === 'qrcode' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    color: isDark ? '#aaa' : '#444', 
                    fontWeight: 600, 
                    fontSize: 15, 
                    marginBottom: 8 
                  }}>
                    Link URL
                  </label>
                  <input
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    placeholder="Enter URL..."
                    style={{ 
                      width: '100%', 
                      padding: '14px 18px', 
                      borderRadius: 10, 
                      border: `2px solid ${isDark ? '#333' : '#ddd'}`, 
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                      color: isDark ? '#fff' : '#111', 
                      fontSize: 18, 
                      outline: 'none', 
                      marginTop: 4, 
                      transition: 'all 0.2s', 
                      backdropFilter: 'blur(10px)' 
                    }}
                  />
                </div>
              )}
              
              {/* Time Field */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', 
                  color: isDark ? '#aaa' : '#444', 
                  fontWeight: 600, 
                  fontSize: 15, 
                  marginBottom: 8 
                }}>
                  Time
                </label>
                <GlassTimePicker 
                  value={time} 
                  onChange={setTime} 
                  isDark={isDark} 
                  onOpenChange={setTimePickerOpen}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'flex-end',
          marginTop: 24,
          paddingTop: 16,
          borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 28px',
              borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: isDark ? '#fff' : '#000',
              border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 16,
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() && !prompt.trim()}
            style={{
              padding: '12px 28px',
              borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: isDark ? '#fff' : '#000',
              border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)',
              cursor: (title.trim() || prompt.trim()) ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              fontSize: 16,
              backdropFilter: 'blur(10px)',
              opacity: (title.trim() || prompt.trim()) ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 