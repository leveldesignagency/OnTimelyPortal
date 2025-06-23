import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { EventType } from './types';
import { ThemeContext } from './ThemeContext';

const PAGE_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Create Event', to: '/create-event' },
  { label: 'Teams', to: '/teams' },
  { label: 'Realtime Test', to: '/realtime-test' },
];

// Add EventType definition for Sidebar props
interface SidebarProps {
  events: EventType[];
  isOverlay: boolean;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

function getEventStatus(event: EventType, today: Date) {
  const from = new Date(event.from);
  const to = new Date(event.to);
  if (from <= today && today <= to) return 'live';
  if (today < from) return 'upcoming';
  return 'past';
}

export default function Sidebar({ events = [], isOverlay, isOpen, setOpen }: SidebarProps) {
  const location = useLocation();
  const [selectedPage, setSelectedPage] = useState(location.pathname);
  const [isAnimating, setIsAnimating] = useState(false);
  const today = new Date();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const liveEvents = events.filter(e => getEventStatus(e, today) === 'live');
  const upcomingEvents = events.filter(e => getEventStatus(e, today) === 'upcoming');

  // Update selectedPage when route changes
  React.useEffect(() => {
    setSelectedPage(location.pathname);
  }, [location.pathname]);

  const sidebarClasses = [
    styles.sidebar,
    isOverlay ? styles.sidebarOverlay : '',
    isOpen ? styles.sidebarOpen : styles.sidebarClosed,
  ].join(' ');
  
  const handleLogoClick = () => {
      if (isOverlay) {
          setOpen(!isOpen);
      }
  }

  const handleThemeToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  return (
    <>
      {isOverlay && isOpen && <div className={styles.backdrop} onClick={() => setOpen(false)} />}
      <aside className={sidebarClasses}>
        <div className={styles.logo} onClick={handleLogoClick} style={{ cursor: isOverlay ? 'pointer' : 'default' }}>TIMELY</div>
        <div className={styles.sectionTitle}>EVENT MANAGEMENT</div>
        <nav className={styles.nav}>
          {PAGE_LINKS.map(link => (
            <div key={link.to} className={styles.navItem}>
              <Link
                to={link.to}
                className={
                  selectedPage === link.to
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : styles.navLink
                }
                onClick={() => setSelectedPage(link.to)}
              >
                {link.label}
              </Link>
            </div>
          ))}
        </nav>
        <hr className={styles.hr} />
        <div className={styles.sectionTitle}>LIVE EVENTS</div>
        {liveEvents.length > 0 && (
          <nav className={styles.nav}>
            {liveEvents.map(event => (
              <div key={event.id} className={styles.navItem}>
                <Link
                  to={`/event/${event.id}`}
                  className={selectedPage === `/event/${event.id}` ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
                  onClick={() => setSelectedPage(`/event/${event.id}`)}
                >
                  {event.name}
                </Link>
              </div>
            ))}
          </nav>
        )}
        
        {/* Add spacing and divider between Live and Upcoming events */}
        <div style={{ marginTop: '24px' }}>
          <hr className={styles.hr} />
          <div className={styles.sectionTitle}>UPCOMING EVENTS</div>
        </div>
        
        {upcomingEvents.length > 0 && (
          <nav className={styles.nav}>
            {upcomingEvents.map(event => (
              <div key={event.id} className={styles.navItem}>
                <Link
                  to={`/event/${event.id}`}
                  className={selectedPage === `/event/${event.id}` ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
                  onClick={() => setSelectedPage(`/event/${event.id}`)}
                >
                  {event.name}
                </Link>
              </div>
            ))}
          </nav>
        )}
        <hr className={styles.hr} />
        <div style={{ flex: 1 }} />
        <div className={styles.footer}>
          <div className={styles.footerItem}>Settings</div>
          <div className={styles.footerItem}>Sign Out/Switch User</div>
          <div className={styles.footerItem}>
            <div 
              onClick={handleThemeToggle} 
              className={styles.animatedToggle}
              style={{
                position: 'relative',
                width: '48px',
                height: '24px',
                borderRadius: '12px',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: theme === 'dark' 
                  ? 'inset 0 2px 8px rgba(0, 0, 0, .4), inset 2px 0 4px rgba(0, 0, 0, .3)'
                  : 'inset 0 2px 8px rgba(0, 0, 0, .15), inset 0 2px 4px rgba(0, 0, 0, .1)',
                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f0f0f0',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: theme === 'dark' ? '#000' : '#fff',
                  boxShadow: theme === 'dark' 
                    ? '0 2px 6px rgba(0, 0, 0, .3)'
                    : '0 2px 6px rgba(0, 0, 0, .2)',
                  transform: theme === 'dark' ? 'translateX(26px)' : 'translateX(0px)',
                  transition: 'transform 0.3s ease, background-color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {theme === 'dark' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="m12 1-1 2M12 21l1 2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12l2 1M21 12l2-1M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
} 