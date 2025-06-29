import React from 'react';

interface AddOnCardProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

const AddOnCard: React.FC<AddOnCardProps> = ({ title, description, children }) => {
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
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 16, color: '#ccc' }}>{description}</div>
      </div>
      <div style={{ width: 120, height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginLeft: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Future image/mockup goes here */}
        {children}
      </div>
    </div>
  );
};

export default AddOnCard; 