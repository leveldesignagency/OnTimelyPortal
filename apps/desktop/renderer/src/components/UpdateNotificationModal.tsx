import React, { useState } from 'react';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  };
  onInstallNow: () => void;
  onScheduleInstall: (scheduledTime: Date) => void;
  isDark: boolean;
}

const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onInstallNow,
  onScheduleInstall,
  isDark
}) => {
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showMinutePicker, setShowMinutePicker] = useState(false);

  if (!isOpen) return null;

  // Close pickers when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowHourPicker(false);
      setShowMinutePicker(false);
    }
  };

  const handleScheduleInstall = () => {
    if (scheduledTime) {
      // Create a date for today with the selected time
      const today = new Date();
      const [hours, minutes] = scheduledTime.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (today <= new Date()) {
        today.setDate(today.getDate() + 1);
      }
      
      onScheduleInstall(today);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={handleClickOutside}
    >
              <div 
          style={{
            background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: isDark 
              ? '0 25px 50px rgba(0, 0, 0, 0.5)' 
              : '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: isDark ? '#fff' : '#000',
              margin: '0 0 4px 0'
            }}>
              Update Available!
            </h2>
            <p style={{
              fontSize: '16px',
              color: isDark ? '#ccc' : '#666',
              margin: '0'
            }}>
              Version {updateInfo.version} • {formatDate(updateInfo.releaseDate)}
            </p>
          </div>
        </div>

        {/* Release Notes */}
        <div style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: isDark ? '#fff' : '#000',
            margin: '0 0 12px 0'
          }}>
            What's New
          </h3>
          <p style={{
            fontSize: '14px',
            color: isDark ? '#ccc' : '#666',
            margin: '0',
            lineHeight: '1.6'
          }}>
            {updateInfo.releaseNotes}
          </p>
        </div>

        {/* Schedule Form */}
        {showScheduleForm && (
          <div style={{
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: isDark ? '#fff' : '#000',
              margin: '0 0 16px 0'
            }}>
              Schedule Update Installation
            </h4>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: isDark ? '#ccc' : '#666'
              }}>
                Install at time today:
              </label>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                {/* Hour Picker */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <button
                    type="button"
                    onClick={() => setShowHourPicker(!showHourPicker)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      color: isDark ? '#fff' : '#000',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {scheduledTime ? scheduledTime.split(':')[0] || '00' : '00'}
                  </button>
                  
                  {/* Hour Dropdown */}
                  {showHourPicker && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                      borderRadius: '8px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      boxShadow: isDark 
                        ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                        : '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            const currentMinute = scheduledTime ? scheduledTime.split(':')[1] || '00' : '00';
                            setScheduledTime(`${String(i).padStart(2, '0')}:${currentMinute}`);
                            setShowHourPicker(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            color: isDark ? '#fff' : '#000',
                            fontSize: '14px',
                            textAlign: 'center',
                            borderBottom: i !== 23 ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {String(i).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: isDark ? '#ccc' : '#666'
                }}>
                  :
                </span>
                
                {/* Minute Picker */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <button
                    type="button"
                    onClick={() => setShowMinutePicker(!showMinutePicker)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      color: isDark ? '#fff' : '#000',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {scheduledTime ? scheduledTime.split(':')[1] || '00' : '00'}
                  </button>
                  
                  {/* Minute Dropdown */}
                  {showMinutePicker && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                      borderRadius: '8px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      boxShadow: isDark 
                        ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                        : '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            const currentHour = scheduledTime ? scheduledTime.split(':')[0] || '00' : '00';
                            setScheduledTime(`${currentHour}:${String(i).padStart(2, '0')}`);
                            setShowMinutePicker(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            color: isDark ? '#fff' : '#000',
                            fontSize: '14px',
                            textAlign: 'center',
                            borderBottom: i !== 59 ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {String(i).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleScheduleInstall}
                disabled={!scheduledTime}
                style={{
                  padding: '10px 20px',
                  background: scheduledTime ? '#10b981' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: scheduledTime ? 'pointer' : 'not-allowed',
                  flex: 1
                }}
              >
                Schedule Install
              </button>
              <button
                onClick={() => setShowScheduleForm(false)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: isDark ? '#ccc' : '#666',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexDirection: showScheduleForm ? 'column' : 'row'
        }}>
          {!showScheduleForm && (
            <>
              <button
                onClick={onInstallNow}
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1,
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                Install Now
              </button>
              <button
                onClick={() => setShowScheduleForm(true)}
                style={{
                  padding: '14px 24px',
                  background: 'transparent',
                  color: isDark ? '#fff' : '#000',
                  border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Schedule Later
              </button>
            </>
          )}
        </div>

        {/* Dismiss Button */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <button
            onClick={() => {
              // Schedule reminder for 4 hours later
              const reminderTime = new Date();
              reminderTime.setHours(reminderTime.getHours() + 4);
              onScheduleInstall(reminderTime);
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#888' : '#999',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Remind me in 4 hours
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationModal;
