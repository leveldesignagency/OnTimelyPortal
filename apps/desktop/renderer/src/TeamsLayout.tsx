import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';

const teamNavLinks = [
  { to: '/teams/create', label: 'Create Team', icon: <span style={{ fontSize: '24px' }}>➕</span> },
  { to: '/teams/chat', label: 'Chat', icon: <ThemedIcon name="chat" alt="Chat" size={60} /> },
  { to: '/teams/calendar', label: 'Calendar', icon: <ThemedIcon name="calendar" alt="Calendar" size={60} /> },
  { to: '/teams/canvas', label: 'Canvas', icon: <ThemedIcon name="canvas" alt="Canvas" size={60} /> },
  // Future links can be added here
];

export default function TeamsLayout() {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

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
  };

  const navLinkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: isDark ? '#a0a0a0' : '#333',
    fontWeight: 500,
    fontSize: '24px',
    marginBottom: '8px',
    transition: 'background 0.2s, color 0.2s',
    width: '48px',
    height: '48px'
  };

  const activeNavLinkStyle: React.CSSProperties = {
    background: isDark ? '#333' : '#e0e0e0',
    color: isDark ? '#fff' : '#000',
  };
  
  const titleStyle: React.CSSProperties = {
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '24px',
      color: isDark ? '#a0a0a0' : '#333',
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={secondarySidebarStyle}>
        <h2 style={titleStyle}>TEAMS</h2>
        <nav style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {teamNavLinks.map(({ to, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...navLinkStyle,
                ...(isActive ? activeNavLinkStyle : {}),
              })}
            >
              {icon}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}