import React, { useContext, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';

const teamNavLinks = [
  { 
    to: '/teams/create', 
    label: 'Create Team', 
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    )
  },
  { 
    to: '/teams/chat', 
    label: 'Chat', 
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
    )
  },
  { 
    to: '/teams/calendar', 
    label: 'Calendar', 
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
      </svg>
    )
  },
  { 
    to: '/teams/canvas', 
    label: 'Canvas', 
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    )
  },
  // Future links can be added here
];

export default function TeamsLayout() {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const location = useLocation();

  const isDark = theme === 'dark';

  const secondarySidebarStyle: React.CSSProperties = {
    width: '80px',
    background: isDark ? '#1a1a1a' : '#f8f9fa',
    borderRight: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'background 0.3s, border-color 0.3s',
    position: 'relative',
    zIndex: 1000,
  };


  
  const titleStyle: React.CSSProperties = {
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '24px',
      color: isDark ? '#a0a0a0' : '#333',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative' }}>
      <main style={{ flex: 1, overflow: 'hidden', marginRight: '80px' }}>
        <Outlet />
      </main>
      
      <aside style={{
        width: '80px',
        background: '#2d2d2d', // Same grey as main sidebar
        borderLeft: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'background 0.3s, border-color 0.3s',
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        zIndex: 10000,
      }}>
        <nav style={{ 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          position: 'relative',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}>
          {teamNavLinks.map(({ to, label, icon }) => (
            <button
              key={to}
              onClick={() => {
                console.log('TeamsLayout: Navigating to:', to);
                navigate(to);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                padding: '8px',
                color: isDark ? '#ffffff' : '#333333',
                boxShadow: 'none',
                outline: 'none',
                borderRadius: '0'
              }}
            >
              {icon}
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}