import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../ThemeContext';
import { getUserProfile, updateUserProfile, uploadProfilePhoto, deleteProfilePhoto, getUserAvatar, isAvatarUrl, type UserProfile, type UpdateProfileData } from '../lib/profile';
import { supabase } from '../lib/supabase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: (profileUpdated?: boolean) => void;
}

const statusOptions = [
  { value: 'online', label: 'Online', color: '#22c55e' },
  { value: 'away', label: 'Away', color: '#eab308' },
  { value: 'busy', label: 'Busy', color: '#ef4444' },
  { value: 'offline', label: 'Offline', color: '#6b7280' }
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'online',
    company_role: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user ID first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to view your profile');
        return;
      }

      // Get user profile by email instead of ID
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_user_profile_by_email', { user_email: user.email });
      
      if (profileError || !profileData || profileData.length === 0) {
        setError('Failed to load profile information');
        return;
      }
      
      const userProfile = profileData[0];
      if (userProfile) {
        setProfile(userProfile);
        setFormData({
          name: userProfile.name || '',
          status: userProfile.status || 'online',
          company_role: userProfile.company_role || ''
        });
      } else {
        setError('Failed to load profile information');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);

      // Get current user ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to update your profile');
        return;
      }

      const updateData: UpdateProfileData = {
        name: formData.name,
        status: formData.status as 'online' | 'away' | 'busy' | 'offline',
        company_role: formData.company_role
      };

      // Update user profile by email instead of ID
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_user_profile_by_email', { 
          user_email: user.email,
          new_name: updateData.name,
          new_avatar_url: updateData.avatar_url,
          new_description: updateData.description,
          new_company_role: updateData.company_role,
          new_status: updateData.status
        });
      
      const success = !updateError && updateResult;
      if (success) {
        // Reload profile to get updated data
        await loadProfile();
        onClose(true); // Pass true to indicate profile was updated
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    try {
      setUploading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to upload photos');
        return;
      }

      // Upload photo using email instead of ID
      const avatarUrl = await uploadProfilePhoto(user.email, file);
      if (avatarUrl) {
        await loadProfile(); // Reload to get new avatar URL
      } else {
        setError('Failed to upload photo');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('An error occurred while uploading your photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile) return;

    try {
      setUploading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to remove photos');
        return;
      }

      // Delete photo using email instead of ID
      const success = await deleteProfilePhoto(user.email);
      if (success) {
        await loadProfile(); // Reload to update avatar
      } else {
        setError('Failed to remove photo');
      }
    } catch (err) {
      console.error('Error removing photo:', err);
      setError('An error occurred while removing your photo');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    background: isDark
      ? 'rgba(20, 20, 20, 0.98)'
      : 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: isDark
      ? '0 20px 40px rgba(0, 0, 0, 0.8)'
      : '0 20px 40px rgba(0, 0, 0, 0.2)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#222',
    marginBottom: '8px',
    textAlign: 'center'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: isDark ? '#b0b0b0' : '#666',
    textAlign: 'center',
    marginBottom: '32px'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#222'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: isDark ? '1px solid #404040' : '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    background: isDark ? '#1a1a1a' : '#ffffff',
    color: isDark ? '#ffffff' : '#333',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit'
  };

  const readOnlyInputStyle: React.CSSProperties = {
    ...inputStyle,
    background: isDark ? '#0d0d0d' : '#f8f9fa',
    color: isDark ? '#888888' : '#666',
    cursor: 'not-allowed',
    border: isDark ? '1px solid #2a2a2a' : '1px solid #e5e7eb'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: isDark ? '#ffffff' : '#000000',
    color: isDark ? '#000000' : '#ffffff'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: isDark ? '#1a1a1a' : '#f8f9fa',
    color: isDark ? '#ffffff' : '#333',
    border: isDark ? '1px solid #404040' : '1px solid #e5e7eb'
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#ef4444',
    color: '#ffffff'
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: `3px solid ${isDark ? '#333' : '#e5e7eb'}`,
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <div style={{ 
              fontSize: '18px', 
              color: isDark ? '#ffffff' : '#333',
              fontWeight: '500'
            }}>
              Loading profile...
            </div>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: isDark 
                ? 'rgba(239, 68, 68, 0.1)' 
                : 'rgba(239, 68, 68, 0.05)',
              border: isDark 
                ? '2px solid rgba(239, 68, 68, 0.3)' 
                : '2px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px',
              color: '#ef4444'
            }}>
              ⚠️
            </div>
            <div style={{ 
              fontSize: '18px', 
              color: isDark ? '#ff6b6b' : '#dc2626', 
              marginBottom: '8px',
              fontWeight: '600'
            }}>
              Failed to load profile
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: isDark ? '#b0b0b0' : '#666', 
              marginBottom: '24px',
              lineHeight: '1.4'
            }}>
              There was an error loading your profile information. Please try again or contact support if the problem persists.
            </div>
            <button
              onClick={() => onClose()}
              style={secondaryButtonStyle}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={() => onClose()}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>


        {error && (
          <div style={{
            padding: '16px 20px',
            background: isDark 
              ? 'rgba(239, 68, 68, 0.1)' 
              : 'rgba(239, 68, 68, 0.05)',
            border: isDark 
              ? '1px solid rgba(239, 68, 68, 0.3)' 
              : '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              !
            </div>
            <div style={{ 
              color: isDark ? '#ff6b6b' : '#dc2626', 
              fontSize: '14px',
              fontWeight: '500',
              lineHeight: '1.4'
            }}>
              {error}
            </div>
          </div>
        )}

        {/* Profile Photo Section */}
        <div style={{ ...sectionStyle, textAlign: 'center' }}>
          <label style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            margin: '0 auto 16px',
            background: isDark ? '#1a1a1a' : '#f0f0f0',
            border: isDark ? '3px solid #404040' : '3px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            fontWeight: '600',
            color: isDark ? '#666' : '#999',
            overflow: 'hidden',
            position: 'relative',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = '#ffffff';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = isDark ? '#404040' : '#e5e7eb';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          >
            {isAvatarUrl(profile.avatar_url) ? (
              <img
                src={profile.avatar_url!}
                alt={profile.name || 'Profile'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              getUserAvatar({ name: profile.name, avatar_url: profile.avatar_url })
            )}
            
            {/* Overlay for upload indication */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              fontSize: '24px',
              color: '#ffffff'
            }}
            className="avatar-overlay"
            >
              {uploading ? '⏳' : ''}
            </div>
            
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>

          {isAvatarUrl(profile.avatar_url) && (
            <button
              onClick={handleRemovePhoto}
              disabled={uploading}
              style={{
                ...dangerButtonStyle,
                fontSize: '12px',
                padding: '6px 12px',
                marginBottom: '8px',
                width: 'auto',
                minWidth: '90px'
              }}
            >
              Remove Photo
            </button>
          )}

          <p style={{
            fontSize: '12px',
            color: isDark ? '#888' : '#666',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {uploading ? 'Uploading photo...' : 'Click avatar to upload a profile photo. Recommended size is 400x400 pixels or larger.'}
          </p>
        </div>

        <style>
          {`
            label:hover .avatar-overlay {
              opacity: 1 !important;
            }
          `}
        </style>

        {/* Form Fields */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Display Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            style={inputStyle}
            placeholder="Enter your display name"
            onFocus={(e) => {
              e.target.style.borderColor = isDark ? '#3b82f6' : '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isDark ? '#404040' : '#e5e7eb';
            }}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Email Address</label>
          <input
            type="email"
            value={profile.email}
            readOnly
            style={readOnlyInputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Status</label>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleInputChange('status', option.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  border: formData.status === option.value
                    ? `2px solid ${option.color}`
                    : isDark ? '2px solid #404040' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  background: formData.status === option.value
                    ? isDark 
                      ? `${option.color}20`
                      : `${option.color}10`
                    : isDark ? '#1a1a1a' : '#ffffff',
                  color: isDark ? '#ffffff' : '#333',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  fontWeight: formData.status === option.value ? '600' : '500',
                  fontFamily: 'inherit',
                  flex: '1',
                  minWidth: '90px'
                }}
                onMouseEnter={(e) => {
                  if (formData.status !== option.value) {
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.background = isDark 
                      ? `${option.color}10`
                      : `${option.color}08`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (formData.status !== option.value) {
                    e.currentTarget.style.borderColor = isDark ? '#404040' : '#e5e7eb';
                    e.currentTarget.style.background = isDark ? '#1a1a1a' : '#ffffff';
                  }
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: option.color,
                  flexShrink: 0
                }} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Company Role</label>
          <input
            type="text"
            value={formData.company_role}
            onChange={(e) => handleInputChange('company_role', e.target.value)}
            style={inputStyle}
            placeholder="Enter your role or title"
            onFocus={(e) => {
              e.target.style.borderColor = isDark ? '#3b82f6' : '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isDark ? '#404040' : '#e5e7eb';
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '32px',
          marginBottom: '16px'
        }}>
          <button
            onClick={() => onClose()}
            style={secondaryButtonStyle}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={primaryButtonStyle}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Member Since Footer */}
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: isDark ? '#666' : '#999',
          marginTop: '16px'
        }}>
          Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
    </div>
  );
}; 