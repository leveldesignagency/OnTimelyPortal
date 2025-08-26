import React, { useState, useEffect } from 'react';
import UpdateNotificationModal from './UpdateNotificationModal';
import ScheduledUpdateManager from './ScheduledUpdateManager';
import UpdateSystemTray from './UpdateSystemTray';

interface UpdateManagerProps {
  isDark: boolean;
}

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

interface DownloadProgress {
  speed: number;
  percent: number;
  transferred: number;
  total: number;
}

interface ScheduledUpdate {
  id: string;
  scheduledTime: Date;
  updateInfo: UpdateInfo;
}

const UpdateManager: React.FC<UpdateManagerProps> = ({ isDark }) => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [scheduledUpdates, setScheduledUpdates] = useState<ScheduledUpdate[]>([]);

  useEffect(() => {
    // Get current app version
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setCurrentVersion(version);
      });

      // Set up event listeners
      window.electronAPI.onUpdateAvailable((data: UpdateInfo) => {
        setUpdateAvailable(data);
        setError(null);
        // Show system tray notification
        setTimeout(() => setShowUpdateModal(true), 2000);
      });

      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateAvailable(null);
        setError(null);
        setLastChecked(new Date());
      });

      window.electronAPI.onUpdateDownloadProgress((data: DownloadProgress) => {
        setDownloadProgress(data);
      });

      window.electronAPI.onUpdateDownloaded((data: any) => {
        setUpdateDownloaded(true);
        setDownloading(false);
        setDownloadProgress(null);
      });

      window.electronAPI.onUpdateError((data: any) => {
        setError(data.message);
        setDownloading(false);
        setDownloadProgress(null);
      });

      // Cleanup listeners on unmount
      return () => {
        window.electronAPI.removeAllListeners('update-available');
        window.electronAPI.removeAllListeners('update-not-available');
        window.electronAPI.removeAllListeners('update-download-progress');
        window.electronAPI.removeAllListeners('update-downloaded');
        window.electronAPI.removeAllListeners('update-error');
      };
    }

    // Load scheduled updates
    const saved = localStorage.getItem('scheduledUpdates');
    if (saved) {
      try {
        const updates = JSON.parse(saved).map((update: any) => ({
          ...update,
          scheduledTime: new Date(update.scheduledTime)
        }));
        setScheduledUpdates(updates);
      } catch (error) {
        console.error('Error loading scheduled updates:', error);
      }
    }
  }, []);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setError(null);
    
    try {
      if (window.electronAPI) {
        // Real Electron app
        const result = await window.electronAPI.checkForUpdates();
        if (!result.success) {
          setError(result.error || 'Failed to check for updates');
        }
      } else {
        // Web mode - simulate update check
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate finding an update
        const hasUpdate = Math.random() > 0.5;
        if (hasUpdate) {
          setUpdateAvailable({
            version: '1.0.2',
            releaseDate: new Date().toISOString(),
            releaseNotes: 'New version available with improved performance, bug fixes, and enhanced user interface. This update includes better event management tools and improved guest experience features.'
          });
          setLastChecked(new Date());
        } else {
          setUpdateAvailable(null);
          setLastChecked(new Date());
        }
      }
    } catch (err) {
      setError('Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI || !updateAvailable) return;
    
    setDownloading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success) {
        setError(result.error || 'Failed to download update');
        setDownloading(false);
      }
    } catch (err) {
      setError('Failed to download update');
      setDownloading(false);
    }
  };

  const handleInstallUpdate = () => {
    // Show installation notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      z-index: 10000;
      font-weight: 500;
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 300px;
    `;
    
    notification.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Installing Update</div>
        <div style="font-size: 14px; opacity: 0.9;">Please wait while the update installs...</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
    
    // Call the real install function
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    } else {
      // Web mode - simulate installation
      setTimeout(() => {
        // Show custom restart notification instead of browser alert
        showCustomRestartNotification();
      }, 2000);
    }
  };

  const showCustomRestartNotification = () => {
    // Create custom restart notification
    const restartNotification = document.createElement('div');
    restartNotification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20000;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;
    
    restartNotification.innerHTML = `
      <div style="
        background: ${isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      ">
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.61 1.98"/>
          </svg>
        </div>
        
        <h2 style="
          font-size: 24px;
          font-weight: 700;
          color: ${isDark ? '#fff' : '#000'};
          margin: 0 0 16px 0;
        ">
          Update Installed Successfully! 🎉
        </h2>
        
        <p style="
          font-size: 16px;
          color: ${isDark ? '#ccc' : '#666'};
          margin: 0 0 24px 0;
          line-height: 1.5;
        ">
          The app will restart in <span id="countdown" style="font-weight: 600; color: #10b981;">3</span> seconds to apply the new update.
        </p>
        
        <div style="
          width: 100%;
          height: 6px;
          background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 20px;
        ">
          <div id="progress-bar" style="
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 3px;
            transition: width 0.1s ease;
          "></div>
        </div>
        
        <button id="restart-now" style="
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
          Restart Now
        </button>
      </div>
    `;
    
    document.body.appendChild(restartNotification);
    
    // Countdown timer
    let countdown = 3;
    const countdownElement = restartNotification.querySelector('#countdown');
    const progressBar = restartNotification.querySelector('#progress-bar');
    const restartNowButton = restartNotification.querySelector('#restart-now');
    
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdownElement) countdownElement.textContent = countdown.toString();
      if (progressBar) progressBar.style.width = `${((3 - countdown) / 3) * 100}%`;
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        // Restart the app
        window.location.reload();
      }
    }, 1000);
    
    // Restart now button
    if (restartNowButton) {
      restartNowButton.addEventListener('click', () => {
        clearInterval(countdownInterval);
        window.location.reload();
      });
    }
  };

  const handleScheduleInstall = (scheduledTime: Date) => {
    if (!updateAvailable) return;

    const newScheduledUpdate: ScheduledUpdate = {
      id: `update-${Date.now()}`,
      scheduledTime,
      updateInfo: updateAvailable
    };

    const newScheduledUpdates = [...scheduledUpdates, newScheduledUpdate];
    setScheduledUpdates(newScheduledUpdates);
    localStorage.setItem('scheduledUpdates', JSON.stringify(newScheduledUpdates));
    
    // Clear the current update available
    setUpdateAvailable(null);
  };

  const handleDismissNotification = () => {
    setShowUpdateModal(false);
    // Hide the system tray notification by clearing the update
    setUpdateAvailable(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  return (
    <>
      <div style={{ maxWidth: '600px' }}>
        <h3 style={{ 
          marginBottom: '20px', 
          fontSize: '18px', 
          fontWeight: '600',
          color: isDark ? '#fff' : '#000'
        }}>
          Application Updates
        </h3>

        {/* Scheduled Updates */}
        <ScheduledUpdateManager 
          isDark={isDark} 
          onInstallUpdate={handleInstallUpdate}
          onShowRestartNotification={showCustomRestartNotification}
        />

        {/* Current Version */}
        <div style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ 
              fontSize: '14px', 
              color: isDark ? '#ccc' : '#666' 
            }}>
              Current Version
            </span>
                      <span style={{ 
            fontSize: '16px', 
            fontWeight: '600',
            color: isDark ? '#fff' : '#000'
          }}>
            {currentVersion || 'v1.0.1'}
          </span>
          </div>
          
          {lastChecked && (
            <div style={{
              fontSize: '12px',
              color: isDark ? '#888' : '#999',
              marginTop: '8px'
            }}>
              Last checked: {lastChecked.toLocaleString()}
            </div>
          )}
        </div>

        {/* Manual Check Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleCheckForUpdates}
            disabled={checking}
            style={{
              padding: '12px 24px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: checking ? 'not-allowed' : 'pointer',
              opacity: checking ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '150px',
              width: 'auto'
            }}
          >
            {checking ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Checking...
              </>
            ) : (
              'Check for Updates'
            )}
          </button>
          

        </div>

        {/* Update Available */}
        {updateAvailable && (
          <div style={{
            background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: isDark ? '#fff' : '#000',
                  margin: '0 0 4px 0'
                }}>
                  Update Available!
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: isDark ? '#ccc' : '#666',
                  margin: '0'
                }}>
                  Version {updateAvailable.version} • {new Date(updateAvailable.releaseDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <p style={{
              fontSize: '14px',
              color: isDark ? '#ccc' : '#666',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              {updateAvailable.releaseNotes}
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: 'row'
            }}>
              {!downloading && !updateDownloaded && (
                <>
                  <button
                    onClick={handleDownloadUpdate}
                    style={{
                      padding: '12px 24px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      minWidth: '120px',
                      width: 'auto',
                      justifyContent: 'center'
                    }}
                  >
                    Update Now
                  </button>
                  <button
                    onClick={() => setShowUpdateModal(true)}
                    style={{
                      padding: '12px 24px',
                      background: 'transparent',
                      color: isDark ? '#fff' : '#000',
                      border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      minWidth: '120px',
                      width: 'auto',
                      justifyContent: 'center'
                    }}
                  >
                    Schedule Update
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Download Progress */}
        {downloading && downloadProgress && (
          <div style={{
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: isDark ? '#fff' : '#000',
              margin: '0 0 16px 0'
            }}>
              Downloading Update...
            </h4>

            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${downloadProgress.percent}%`,
                  height: '100%',
                  background: '#10b981',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              color: isDark ? '#ccc' : '#666'
            }}>
              <span>{Math.round(downloadProgress.percent)}%</span>
              <span>{formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}</span>
              <span>{formatSpeed(downloadProgress.speed)}</span>
            </div>
          </div>
        )}

        {/* Update Ready to Install */}
        {updateDownloaded && (
          <div style={{
            background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: isDark ? '#fff' : '#000',
                  margin: '0 0 4px 0'
                }}>
                  Update Ready to Install!
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: isDark ? '#ccc' : '#666',
                  margin: '0'
                }}>
                  The update has been downloaded and is ready to install.
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallUpdate}
              style={{
                padding: '12px 24px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                maxWidth: '140px',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              Install Update & Restart
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ef4444'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span style={{ fontSize: '14px' }}>{error}</span>
            </div>
          </div>
        )}

        {/* Auto-update Info */}
        <div style={{
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: isDark ? '#ccc' : '#666',
            margin: '0 0 8px 0'
          }}>
            Auto-Update Settings
          </h4>
          <p style={{
            fontSize: '13px',
            color: isDark ? '#888' : '#999',
            margin: '0',
            lineHeight: '1.4'
          }}>
            Updates are automatically checked every 24 hours. You can manually check for updates at any time.
            When an update is available, you'll be notified and can choose when to download and install it.
            You can also schedule updates for a later time that's convenient for you.
          </p>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Update Notification Modal */}
      {updateAvailable && (
        <UpdateNotificationModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          updateInfo={updateAvailable}
          onInstallNow={handleDownloadUpdate}
          onScheduleInstall={handleScheduleInstall}
          isDark={isDark}
        />
      )}

      {/* System Tray Notification */}
      <UpdateSystemTray
        isDark={isDark}
        updateInfo={updateAvailable}
        onShowUpdateModal={() => setShowUpdateModal(true)}
        onDismiss={handleDismissNotification}
      />
    </>
  );
};

export default UpdateManager;
