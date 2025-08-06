import React, { useState, useContext, useRef } from 'react';
import { ThemeContext } from '../ThemeContext';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: () => void;
}

interface AnnouncementData {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  scheduledFor: string;
  sendImmediately: boolean;
}

// Custom Glassmorphic Time Picker Component
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
          position: 'relative',
          marginTop: '8px',
          width: '100%',
          display: 'flex',
          gap: 8,
          borderRadius: 16,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb'}`,
          background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)',
          maxHeight: 220,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          <div style={{ flex: 1, maxHeight: 220, overflow: 'auto' }}>
            <div style={{ padding: '8px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }}>
              <div style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: isDark ? '#888' : '#666' }}>HOUR</div>
            </div>
            {hours.map(h => (
              <div
                key={h}
                onClick={() => handleSelect(h, minute || '00')}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: hour === h ? colors.primary : colors.text,
                  background: hour === h ? colors.primaryBg : 'transparent',
                  fontWeight: hour === h ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {h}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, maxHeight: 220, overflow: 'auto' }}>
            <div style={{ padding: '8px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }}>
              <div style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: isDark ? '#888' : '#666' }}>MINUTE</div>
            </div>
            {minutes.map(m => (
              <div
                key={m}
                onClick={() => handleSelect(hour || '00', m)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: minute === m ? colors.primary : colors.text,
                  background: minute === m ? colors.primaryBg : 'transparent',
                  fontWeight: minute === m ? 600 : 400,
                  transition: 'all 0.15s ease',
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

// Glassmorphic styling functions
const getGlassStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(30, 30, 30, 0.8)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  border: isDark 
    ? '1px solid rgba(255, 255, 255, 0.1)' 
    : '1px solid rgba(0, 0, 0, 0.1)',
  boxShadow: isDark 
    ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
    : '0 8px 32px rgba(0, 0, 0, 0.1)',
});

const getButtonStyles = (isDark: boolean, variant: 'primary' | 'secondary' | 'danger' | 'success') => {
  const baseStyles = {
    padding: '12px 24px',
    borderRadius: '12px',
    border: '2px solid',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  };

  const variants = {
    primary: {
      background: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
      borderColor: isDark ? '#22c55e' : '#22c55e',
      color: '#22c55e',
    },
    secondary: {
      background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      color: isDark ? '#ffffff' : '#000000',
    },
    danger: {
      background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
      borderColor: isDark ? '#ef4444' : '#ef4444',
      color: '#ef4444',
    },
    success: {
      background: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
      borderColor: isDark ? '#22c55e' : '#22c55e',
      color: '#22c55e',
    },
  };

  return { ...baseStyles, ...variants[variant] };
};

const getColors = (isDark: boolean) => ({
  text: isDark ? '#ffffff' : '#000000',
  textSecondary: isDark ? '#cccccc' : '#666666',
  border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
  inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  primary: '#22c55e', // Timely green
  primaryBg: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
});

export default function AnnouncementModal({ isOpen, onClose, eventId, onSuccess }: AnnouncementModalProps) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colors = getColors(isDark);

  const [formData, setFormData] = useState<AnnouncementData>({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    scheduledFor: '',
    sendImmediately: true
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Load current user on mount
  React.useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const handleInputChange = (field: keyof AnnouncementData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    try {
      setLoading(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `announcements/${eventId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('announcement_media')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('announcement_media')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        imageUrl: publicUrl
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (!currentUser || !currentUser.id) {
      alert('User not authenticated');
      return;
    }

    try {
      setLoading(true);

      // Calculate scheduled time if not sending immediately
      let scheduledFor = null;
      if (!formData.sendImmediately && formData.scheduledFor) {
        const today = new Date();
        const [hours, minutes] = formData.scheduledFor.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (today <= new Date()) {
          today.setDate(today.getDate() + 1);
        }
        
        scheduledFor = today.toISOString();
      }

      const announcementData = {
        event_id: eventId,
        company_id: currentUser.company_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        image_url: formData.imageUrl || null,
        link_url: formData.linkUrl.trim() || null,
        scheduled_for: scheduledFor,
        sent_at: formData.sendImmediately ? new Date().toISOString() : null,
        created_by: currentUser.id
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert([announcementData])
        .select();

      if (error) throw error;

      // If sending immediately, trigger push notifications
      if (formData.sendImmediately) {
        console.log('Sending immediate announcement:', data);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        scheduledFor: '',
        sendImmediately: true
      });
      setImageFile(null);
      setImagePreview('');

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to send announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      
      <div style={{
        ...getGlassStyles(isDark),
        padding: '32px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        borderRadius: '20px',
        position: 'relative',
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* X Button - Top right of modal container */}
        <button 
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
            fontSize: '20px',
            cursor: 'pointer',
            color: colors.text,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 10,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
          }}
        >
          ×
        </button>

        <h2 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: colors.text,
          margin: '0 0 24px 0',
          textAlign: 'center'
        }}>
          Send Announcement
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Title - Required */}
          <div>
            <label style={{
              fontSize: '14px',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '8px',
              display: 'block'
            }}>
              Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter announcement title"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              required
              disabled={loading}
            />
          </div>

          {/* Description - Optional */}
          <div>
            <label style={{
              fontSize: '14px',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '8px',
              display: 'block'
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter announcement description (optional)"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: '16px',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              disabled={loading}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label style={{
              fontSize: '14px',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '8px',
              display: 'block'
            }}>
              Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...getButtonStyles(isDark, 'secondary'),
                width: '100%',
                height: '48px',
              }}
              disabled={loading}
            >
              {imagePreview ? 'Change Image' : 'Upload Image'}
            </button>
            {imagePreview && (
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{
                  width: '100%',
                  maxWidth: '200px',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: `2px solid ${colors.border}`,
                  marginTop: '12px'
                }}
              />
            )}
          </div>

          {/* Link URL */}
          <div>
            <label style={{
              fontSize: '14px',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '8px',
              display: 'block'
            }}>
              Link URL
            </label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => handleInputChange('linkUrl', e.target.value)}
              placeholder="https://example.com (optional)"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              disabled={loading}
            />
          </div>

          {/* Send Options */}
          <div>
            <label style={{
              fontSize: '14px',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '12px',
              display: 'block'
            }}>
              Send Options
            </label>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => handleInputChange('sendImmediately', true)}
                style={{
                  ...getButtonStyles(isDark, formData.sendImmediately ? 'success' : 'secondary'),
                  flex: 1,
                  height: '48px',
                }}
                disabled={loading}
              >
                Send Now
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('sendImmediately', false)}
                style={{
                  ...getButtonStyles(isDark, !formData.sendImmediately ? 'success' : 'secondary'),
                  flex: 1,
                  height: '48px',
                }}
                disabled={loading}
              >
                Set Time
              </button>
            </div>
            
            {!formData.sendImmediately && (
              <div>
                <label style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.text,
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Send Time
                </label>
                <CustomGlassTimePicker
                  value={formData.scheduledFor}
                  onChange={(value) => handleInputChange('scheduledFor', value)}
                  placeholder="Select time (HH:MM)"
                  isDark={isDark}
                  colors={colors}
                />
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...getButtonStyles(isDark, 'secondary'),
                flex: 1,
                height: '48px',
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...getButtonStyles(isDark, (!loading && formData.title.trim()) ? 'success' : 'primary'),
                flex: 1,
                height: '48px',
                opacity: loading ? 0.6 : 1
              }}
              disabled={loading || !formData.title.trim()}
            >
              {loading ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Success Toast */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: 'rgba(40,200,120,0.95)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 16,
          zIndex: 3000,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
        }}>
          Announcement sent successfully!
        </div>
      )}
    </div>
  );
} 