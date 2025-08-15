import React, { useContext, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';

const teamNavLinks = [
  { to: '/teams/create', label: 'Create Team', icon: <ThemedIcon name="plus" alt="Create Team" size={32} /> },
  { to: '/teams/chat', label: 'Chat', icon: <ThemedIcon name="chat" alt="Chat" size={32} /> },
  { to: '/teams/calendar', label: 'Calendar', icon: <ThemedIcon name="calendar" alt="Calendar" size={32} /> },
  { to: '/teams/canvas', label: 'Canvas', icon: <ThemedIcon name="canvas" alt="Canvas" size={32} /> },
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

  const navLinkStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 4px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: isDark ? '#a0a0a0' : '#333',
    fontWeight: 500,
    fontSize: '12px',
    marginBottom: '16px',
    transition: 'background 0.2s, color 0.2s',
    width: '64px !important',
    height: '64px !important',
    cursor: 'pointer',
    userSelect: 'none',
    // Override global button styles
    background: 'transparent !important',
    border: 'none !important',
    boxShadow: 'none !important',
    letterSpacing: 'normal !important'
  };

  const activeNavLinkStyle: React.CSSProperties = {
    // No container styling - just transparent
  };

  const hoverNavLinkStyle: React.CSSProperties = {
    background: isDark ? '#2a2a2a' : '#f0f0f0',
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
                width: '80px', // Slightly larger than original 64px
                height: '80px', // Slightly larger than original 64px
                background: 'transparent',
                border: location.pathname === to ? '2px solid white' : 'none', // White border for selected
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                padding: '12px 8px', // Adjusted padding for new size
                borderRadius: '8px'
              }}
            >
              {React.cloneElement(icon, { size: 40 })} {/* Slightly larger than original 32px */}
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}