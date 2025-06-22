import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { EventType } from './types';
import { ThemeContext } from './ThemeContext';

const PAGE_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Create Event', to: '/create-event' },
  { label: 'Teams', to: '/teams' },
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
        <div className={styles.sectionTitle}>UPCOMING EVENTS</div>
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
            <button 
              onClick={toggleTheme} 
              className={styles.themeToggleButton}
              style={{
                background: theme === 'dark' ? '#fff' : '#222',
                color: theme === 'dark' ? '#222' : '#fff',
              }}
            >
              {theme === 'light' ? 'Dark' : 'Light'} Mode
            </button>
          </div>
        </div>
      </aside>
    </>
  );
} 