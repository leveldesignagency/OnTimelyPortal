import React, { useState, useEffect } from 'react';

interface ScheduledUpdate {
  id: string;
  scheduledTime: Date;
  updateInfo: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  };
  status?: 'pending' | 'installing' | 'success' | 'failed';
  installAttempts?: number;
}

interface ScheduledUpdateManagerProps {
  isDark: boolean;
  onInstallUpdate: () => void;
  onShowRestartNotification?: () => void;
}

const ScheduledUpdateManager: React.FC<ScheduledUpdateManagerProps> = ({
  isDark,
  onInstallUpdate,
  onShowRestartNotification
}) => {
  const [scheduledUpdates, setScheduledUpdates] = useState<ScheduledUpdate[]>([]);
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Load scheduled updates from localStorage
    const saved = localStorage.getItem('scheduledUpdates');
    if (saved) {
      try {
        const updates = JSON.parse(saved).map((update: any) => ({
          ...update,
          scheduledTime: new Date(update.scheduledTime),
          status: update.status || 'pending',
          installAttempts: update.installAttempts || 0
        }));
        
        // Clean up old failed installations (older than 1 hour)
        const now = new Date();
        const cleanedUpdates = updates.filter(update => {
          if (update.status === 'failed') {
            const timeSinceFailure = now.getTime() - update.scheduledTime.getTime();
            const oneHour = 60 * 60 * 1000;
            if (timeSinceFailure > oneHour) {
              console.log(`🗑️ Cleaning up old failed update ${update.id}`);
              return false; // Remove it
            }
          }
          return true; // Keep it
        });
        
        setScheduledUpdates(cleanedUpdates);
        
        // Save cleaned updates back to localStorage
        if (cleanedUpdates.length !== updates.length) {
          localStorage.setItem('scheduledUpdates', JSON.stringify(cleanedUpdates));
        }
      } catch (error) {
        console.error('Error loading scheduled updates:', error);
      }
    }

    // Set up countdown timer and auto-installation
    const interval = setInterval(() => {
      const now = new Date();
      const newCountdowns: { [key: string]: string } = {};
      let hasAutoInstall = false;

      scheduledUpdates.forEach(update => {
        const timeLeft = update.scheduledTime.getTime() - now.getTime();
        
        if (timeLeft <= 0 && update.status !== 'installing' && update.status !== 'success' && update.status !== 'failed') {
          // Time to install!
          update.status = 'installing';
          update.installAttempts = (update.installAttempts || 0) + 1;
          newCountdowns[update.id] = 'Installing...';
          hasAutoInstall = true;
          
          // Auto-install after a short delay
          setTimeout(() => {
            console.log(`🔄 Auto-installing update ${update.id}...`);
            
            // Simulate installation process
            const installPromise = new Promise((resolve, reject) => {
              // In a real app, this would call the actual install function
              // For now, we'll simulate success/failure
              const success = Math.random() > 0.3; // 70% success rate for testing
              
              setTimeout(() => {
                if (success) {
                  resolve('success');
                } else {
                  reject(new Error('Installation failed'));
                }
              }, 2000);
            });
            
            installPromise
              .then(() => {
                // Installation successful
                update.status = 'success';
                newCountdowns[update.id] = 'Installation Complete';
                console.log(`✅ Update ${update.id} installed successfully`);
                
                // Show custom restart notification
                if (onShowRestartNotification) {
                  onShowRestartNotification();
                }
                
                // Remove successful update after 5 seconds
                setTimeout(() => {
                  removeScheduledUpdate(update.id);
                }, 5000);
              })
              .catch((error) => {
                // Installation failed
                update.status = 'failed';
                newCountdowns[update.id] = 'Installation Failed';
                console.error(`❌ Installation failed for update ${update.id}:`, error);
                
                // Remove failed update after 10 seconds
                setTimeout(() => {
                  removeScheduledUpdate(update.id);
                  console.log(`🗑️ Removed failed update ${update.id}`);
                }, 10000);
              });
          }, 1000); // 1 second delay to show "Installing..." status
          
        } else if (update.status === 'installing') {
          // Already installing, keep status
          newCountdowns[update.id] = 'Installing...';
        } else if (update.status === 'success') {
          // Installation completed
          newCountdowns[update.id] = 'Installation Complete';
        } else if (update.status === 'failed') {
          // Installation failed
          newCountdowns[update.id] = 'Installation Failed';
        } else {
          // Format countdown
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          if (hours > 0) {
            newCountdowns[update.id] = `${hours}h ${minutes}m`;
          } else if (minutes > 0) {
            newCountdowns[update.id] = `${minutes}m ${seconds}s`;
          } else {
            newCountdowns[update.id] = `${seconds}s`;
          }
        }
      });

      setCountdowns(newCountdowns);
      
      // If we have auto-installs, show a notification
      if (hasAutoInstall) {
        // You could add a toast notification here
        console.log('🚀 Auto-installation triggered!');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledUpdates]);

  const addScheduledUpdate = (update: ScheduledUpdate) => {
    const newUpdates = [...scheduledUpdates, update];
    setScheduledUpdates(newUpdates);
    
    // Save to localStorage
    localStorage.setItem('scheduledUpdates', JSON.stringify(newUpdates));
  };

  const removeScheduledUpdate = (id: string) => {
    const newUpdates = scheduledUpdates.filter(update => update.id !== id);
    setScheduledUpdates(newUpdates);
    
    // Save to localStorage
    localStorage.setItem('scheduledUpdates', JSON.stringify(newUpdates));
  };

  const formatScheduledTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isReadyToInstall = (update: ScheduledUpdate) => {
    return new Date() >= update.scheduledTime;
  };

  if (scheduledUpdates.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.03)',
      border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h4 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: isDark ? '#fff' : '#000',
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Scheduled Updates
      </h4>

      {scheduledUpdates.map(update => (
        <div
          key={update.id}
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: isDark ? '#fff' : '#000'
              }}>
                Version {update.updateInfo.version}
              </span>
              <span style={{
                fontSize: '12px',
                color: isDark ? '#888' : '#999',
                marginLeft: '8px'
              }}>
                {formatScheduledTime(update.scheduledTime)}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: (() => {
                  const countdown = countdowns[update.id];
                  if (countdown === 'Installing...') return '#f59e0b'; // Orange for installing
                  if (countdown === 'Installation Complete') return '#10b981'; // Green for success
                  if (countdown === 'Installation Failed') return '#ef4444'; // Red for failed
                  if (isReadyToInstall(update)) return '#10b981'; // Green for ready
                  return isDark ? '#ccc' : '#666'; // Default color
                })(),
                padding: '4px 8px',
                background: (() => {
                  const countdown = countdowns[update.id];
                  if (countdown === 'Installing...') return 'rgba(245, 158, 11, 0.1)'; // Orange background
                  if (countdown === 'Installation Complete') return 'rgba(16, 185, 129, 0.1)'; // Green background
                  if (countdown === 'Installation Failed') return 'rgba(239, 68, 68, 0.1)'; // Red background
                  if (isReadyToInstall(update)) return 'rgba(16, 185, 129, 0.1)'; // Green background
                  return 'transparent';
                })(),
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {countdowns[update.id] === 'Installing...' && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    border: '1px solid #f59e0b',
                    borderTop: '1px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                )}
                {countdowns[update.id] || '...'}
              </span>
              
              {update.status === 'success' ? (
                <span style={{
                  padding: '6px 12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  ✅ Complete
                </span>
              ) : update.status === 'failed' ? (
                <button
                  onClick={() => {
                    // Reset status and retry
                    update.status = 'pending';
                    update.installAttempts = 0;
                    // Force re-evaluation
                    setScheduledUpdates([...scheduledUpdates]);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Retry
                </button>
              ) : isReadyToInstall(update) ? (
                <button
                  onClick={onInstallUpdate}
                  style={{
                    padding: '6px 12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Install Now
                </button>
              ) : (
                <button
                  onClick={() => removeScheduledUpdate(update.id)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          
          <p style={{
            fontSize: '12px',
            color: isDark ? '#888' : '#999',
            margin: '0',
            lineHeight: '1.4'
          }}>
            {update.updateInfo.releaseNotes}
          </p>
        </div>
      ))}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ScheduledUpdateManager;
