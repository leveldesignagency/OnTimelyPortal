import React from 'react';

interface AddOnCardProps {
  title: string;
  description: string;
  emoji?: string;
  onDelete?: () => void;
  children?: React.ReactNode;
}

const AddOnCard: React.FC<AddOnCardProps> = ({ title, description, emoji, onDelete, children }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px',
        borderRadius: '16px',
        background: 'rgba(30,30,30,0.7)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        marginBottom: 24,
        minHeight: 120,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'relative',
      }}
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={onDelete}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
            e.currentTarget.style.border = '1.5px solid rgba(239, 68, 68, 0.9)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.border = '1.5px solid rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
      )}
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 16, color: '#ccc' }}>{description}</div>
      </div>
      
      {/* Emoji Section */}
      <div style={{ 
        width: 120, 
        height: 80, 
        background: 'rgba(255,255,255,0.04)', 
        borderRadius: 12, 
        marginLeft: 32, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '32px'
      }}>
        {emoji || children}
      </div>
    </div>
  );
};

export default AddOnCard; 