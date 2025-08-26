import React, { useState, useEffect } from 'react';

interface UpdateSystemTrayProps {
  isDark: boolean;
  updateInfo: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  } | null;
  onShowUpdateModal: () => void;
  onDismiss: () => void;
}

const UpdateSystemTray: React.FC<UpdateSystemTrayProps> = ({
  isDark,
  updateInfo,
  onShowUpdateModal,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (updateInfo) {
      setIsVisible(true);
      
      // Auto-hide after 10 seconds unless hovered
      const timer = setTimeout(() => {
        if (!isHovered) {
          setIsVisible(false);
        }
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [updateInfo, isHovered]);

  if (!isVisible || !updateInfo) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '350px',
        boxShadow: isDark 
          ? '0 20px 40px rgba(0, 0, 0, 0.4)' 
          : '0 20px 40px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10000,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? (isDark 
              ? '0 25px 50px rgba(0, 0, 0, 0.5)' 
              : '0 25px 50px rgba(0, 0, 0, 0.2)')
          : (isDark 
              ? '0 20px 40px rgba(0, 0, 0, 0.4)' 
              : '0 20px 40px rgba(0, 0, 0, 0.15)')
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onShowUpdateModal}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: isDark ? '#fff' : '#000',
            margin: '0 0 2px 0'
          }}>
            Update Available!
          </h4>
          <p style={{
            fontSize: '12px',
            color: isDark ? '#ccc' : '#666',
            margin: '0'
          }}>
            Version {updateInfo.version}
          </p>
        </div>
      </div>

      {/* Content */}
      <p style={{
        fontSize: '13px',
        color: isDark ? '#ccc' : '#666',
        margin: '0 0 16px 0',
        lineHeight: '1.4'
      }}>
        {updateInfo.releaseNotes.length > 100 
          ? `${updateInfo.releaseNotes.substring(0, 100)}...` 
          : updateInfo.releaseNotes
        }
      </p>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowUpdateModal();
          }}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            width: '50%'
          }}
        >
          View Details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: isDark ? '#888' : '#999',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            width: '50%'
          }}
        >
          Dismiss
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '3px',
        background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderRadius: '2px',
        marginTop: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #10b981, #059669)',
          borderRadius: '2px',
          animation: 'slide 10s linear forwards'
        }} />
      </div>

      <style>{`
        @keyframes slide {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default UpdateSystemTray;
