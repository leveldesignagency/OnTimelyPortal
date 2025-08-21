import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { EventType } from './types';
import { ThemeContext } from './ThemeContext';
import { supabase } from './lib/supabase';
import { 
  getUserQuickActions, 
  addQuickAction, 
  removeQuickAction, 
  QuickAction as QuickActionType,
  createNavigationQuickAction
} from './lib/quickActions';

const PAGE_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Create Event', to: '/create-event' },
  { label: 'Workspace', to: '/teams' },
];

// Add EventType definition for Sidebar props
interface SidebarProps {
  events: EventType[];
  isOverlay: boolean;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  action: () => void;
}

function getEventStatus(event: EventType, today: Date) {
  // Create full datetime objects considering both date and time
  let eventStart = new Date(event.from);
  let eventEnd = new Date(event.to);
  
  // If we have time fields, combine them with the dates
  if (event.start_time) {
    const [startHour, startMinute] = event.start_time.split(':').map(Number);
    eventStart.setHours(startHour || 0, startMinute || 0, 0, 0);
  }
  
  if (event.end_time) {
    const [endHour, endMinute] = event.end_time.split(':').map(Number);
    eventEnd.setHours(endHour || 23, endMinute || 59, 59, 999); // Default to end of day if no time
  }
  
  // Event is live if today is between start and end datetime (inclusive)
  if (today >= eventStart && today <= eventEnd) {
    return 'live';
  }
  
  // Event is upcoming if start datetime is in the future
  if (today < eventStart) {
    return 'upcoming';
  }
  
  // Event is past if end datetime has passed
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
  const pastEvents = events.filter(e => getEventStatus(e, today) === 'past');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    live: false,
    upcoming: false,
    finished: false
  });

  // Quick Actions State
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [showQuickActionsDrawer, setShowQuickActionsDrawer] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Function to replace emoji icons with flat icons
  const getFlatIcon = (emoji: string): string => {
    const iconMap: { [key: string]: string } = {
      '💬': '💬', // Keep chat bubble as is for now
      '📱': '📱', // Keep phone as is for now
      '📧': '📧', // Keep email as is for now
      '🔔': '🔔', // Keep bell as is for now
      '📊': '📊', // Keep chart as is for now
      '⚙️': '⚙️', // Keep settings as is for now
      '🚨': '🚨', // Keep alert as is for now
      '🌐': '🌐', // Keep globe as is for now
      '📋': '📋', // Keep clipboard as is for now
      '👥': '👥', // Keep people as is for now
      '📅': '📅', // Keep calendar as is for now
      '📍': '📍', // Keep location as is for now
      '💰': '💰', // Keep money as is for now
      '🎯': '🎯', // Keep target as is for now
      '📈': '📈', // Keep trending up as is for now
      '📉': '📉', // Keep trending down as is for now
      '✅': '✅', // Keep checkmark as is for now
      '❌': '❌', // Keep x as is for now
      '⚠️': '⚠️', // Keep warning as is for now
      'ℹ️': 'ℹ️', // Keep info as is for now
    };
    return iconMap[emoji] || emoji;
  };

  // Load quick actions from database on component mount
  useEffect(() => {
    loadQuickActions();
  }, []);

  const loadQuickActions = async () => {
    try {
      const actions = await getUserQuickActions();
      const formattedActions: QuickAction[] = actions.map(action => ({
        id: action.id,
        name: action.name,
        icon: action.icon,
        action: () => {
          if (action.action_type === 'navigate') {
            const path = action.action_data?.path;
            if (path) {
              // Handle guest chat navigation with event ID
              if (path === '/guest-chat' && action.event_id) {
                navigate(path, { state: { eventId: action.event_id } });
              } else {
                navigate(path);
              }
            }
          } else if (action.action_type === 'function') {
            // Handle function actions if needed
            console.log('Function action:', action.action_data);
          }
        }
      }));
      setQuickActions(formattedActions);
    } catch (error) {
      console.error('Error loading quick actions:', error);
    }
  };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Quick Actions Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const actionData = e.dataTransfer.getData('application/json');
    if (actionData) {
      try {
        const action = JSON.parse(actionData);
        
        // Create the quick action for database
        let quickActionInput;
        
        if (action.type === 'navigate') {
          // Extract eventId from action name if it's a guest chat
          let eventId = null;
          let path = action.to;
          
          if (action.name.includes('Guest Chat')) {
            const eventName = action.name.split(' - ')[1];
            const event = events.find(e => e.name === eventName);
            if (event) {
              eventId = event.id;
              path = '/guest-chat';
            }
          }
          
          quickActionInput = createNavigationQuickAction(
            action.name,
            action.icon,
            path,
            eventId
          );
        } else if (action.type === 'function') {
          quickActionInput = {
            name: action.name,
            icon: action.icon,
            action_type: 'function',
            action_data: action.execute,
            event_id: null
          };
        }
        
        if (quickActionInput) {
          // Save to database
          const newActionId = await addQuickAction(quickActionInput);
          
          if (newActionId) {
            // Add to local state
            const newQuickAction: QuickAction = {
              id: newActionId,
              name: action.name,
              icon: action.icon,
              action: () => {
                // Use the same logic as loaded actions
                if (action.type === 'navigate') {
                  const path = quickActionInput.action_data?.path;
                  if (path) {
                    // Handle guest chat navigation with event ID
                    if (path === '/guest-chat' && quickActionInput.event_id) {
                      navigate(path, { state: { eventId: quickActionInput.event_id } });
                    } else {
                      navigate(path);
                    }
                  }
                } else if (action.type === 'function') {
                  // Handle function actions if needed
                  console.log('Function action:', quickActionInput.action_data);
                }
              }
            };
            
            setQuickActions(prev => [...prev, newQuickAction]);
          }
        }
      } catch (error) {
        console.error('Error parsing dropped action:', error);
      }
    }
  };

  const handleRemoveQuickAction = async (id: string) => {
    try {
      const success = await removeQuickAction(id);
      if (success) {
        setQuickActions(prev => prev.filter(action => action.id !== id));
      }
    } catch (error) {
      console.error('Error removing quick action:', error);
    }
  };

  const toggleSection = (section: 'live' | 'upcoming' | 'finished') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <>
      {isOverlay && isOpen && <div className={styles.backdrop} onClick={() => setOpen(false)} />}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: '250px',
        zIndex: 9998
      }}>
        <aside className={sidebarClasses} style={{ boxShadow: 'none' }}>
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
        <div className={styles.sectionTitle} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer'
        }} onClick={() => toggleSection('live')}>
          LIVE EVENTS
          <span style={{ 
            fontSize: '12px', 
            color: theme === 'dark' ? '#888' : '#666',
            transition: 'transform 0.2s ease',
            transform: collapsedSections.live ? 'rotate(-90deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        </div>
        {!collapsedSections.live && liveEvents.length > 0 && (
          <div className={styles.eventScrollContainer} style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            marginBottom: '8px'
          }}>
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
          </div>
        )}
        
        {/* Add spacing and divider between Live and Upcoming events */}
        <div style={{ marginTop: '24px' }}>
          <hr className={styles.hr} />
          <div className={styles.sectionTitle} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer'
          }} onClick={() => toggleSection('upcoming')}>
            UPCOMING EVENTS
            <span style={{ 
              fontSize: '12px', 
              color: theme === 'dark' ? '#888' : '#666',
              transition: 'transform 0.2s ease',
              transform: collapsedSections.upcoming ? 'rotate(-90deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>
        </div>
        
        {!collapsedSections.upcoming && upcomingEvents.length > 0 && (
          <div className={styles.eventScrollContainer} style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            marginBottom: '8px'
          }}>
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
          </div>
        )}
        
        {/* Add spacing and divider between Upcoming and Finished events */}
        {pastEvents.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <hr className={styles.hr} />
            <div className={styles.sectionTitle} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }} onClick={() => toggleSection('finished')}>
              FINISHED EVENTS
              <span style={{ 
                fontSize: '12px', 
                color: theme === 'dark' ? '#888' : '#666',
                transition: 'transform 0.2s ease',
                transform: collapsedSections.finished ? 'rotate(-90deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </div>
          </div>
        )}
        
        {!collapsedSections.finished && pastEvents.length > 0 && (
          <div className={styles.eventScrollContainer} style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            marginBottom: '8px'
          }}>
            <nav className={styles.nav}>
              {pastEvents.map(event => (
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
          </div>
        )}
        <hr className={styles.hr} />
        <div style={{ flex: 1 }} />
        
        {/* Quick Actions Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragOver ? '#00bfa5' : '#666'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center',
            backgroundColor: isDragOver ? 'rgba(0, 191, 165, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            color: '#999'
          }}
        >
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '500', 
            color: isDragOver ? '#00bfa5' : '#999',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Quick Action Drop
          </div>
        </div>

        {/* Quick Actions Tab */}
        {quickActions.length > 0 && (
          <div
            onClick={() => setShowQuickActionsDrawer(!showQuickActionsDrawer)}
            style={{
              position: 'absolute',
              right: '-20px',
              bottom: '80px',
              width: '20px',
              height: '60px',
              backgroundColor: '#2d2d2d',
              border: `1px solid #2d2d2d`,
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3a3a3a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2d2d2d';
            }}
          >
            <div style={{ 
              width: '4px',
              height: '16px',
              backgroundColor: '#fff',
              borderRadius: '2px'
            }} />
          </div>
        )}

        {/* Quick Actions Drawer */}
        {showQuickActionsDrawer && quickActions.length > 0 && (
          <>
            {/* Backdrop to handle outside clicks */}
            <div
              onClick={() => setShowQuickActionsDrawer(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'transparent',
                zIndex: 999
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '-200px',
                top: '0',
                width: '200px',
                height: '100%',
                backgroundColor: '#2d2d2d',
                border: `1px solid #2d2d2d`,
                borderLeft: '1.5px solid #2d2d2d',
                borderRadius: '0 8px 8px 0',
                padding: '20px',
                boxShadow: '8px 0 20px rgba(0,0,0,0.5)',
                zIndex: 9997
              }}
            >
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#fff',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {quickActions.map((action) => (
                <div
                  key={action.id}
                  onClick={action.action}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{getFlatIcon(action.icon)}</div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: '600',
                    lineHeight: '1.3'
                  }}>
                    {action.name}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveQuickAction(action.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'transparent',
                      border: '1px solid #fff',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      lineHeight: '1',
                      padding: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.color = '#000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#fff';
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            {/* Minimize Button */}
            <div style={{ 
              position: 'absolute', 
              bottom: '20px', 
              left: '50%', 
              transform: 'translateX(-50%)' 
            }}>
              <button
                onClick={() => {
                  setShowQuickActionsDrawer(false);
                }}
                style={{
                  background: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  width: '60px',
                  height: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                }}
              />
            </div>
          </div>
          </>
        )}

        <div className={styles.footer}>
          <div className={styles.footerItem} onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>Settings</div>
          <div className={styles.footerItem} onClick={() => setShowLogoutModal(true)} style={{ cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 140 }}>
            Sign Out/Switch User
          </div>
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
      </div>
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: theme === 'dark' ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.18)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            minWidth: 320,
            background: theme === 'dark' ? 'rgba(30,32,38,0.92)' : 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderRadius: 20,
            boxShadow: '0 8px 32px #0005',
            padding: '32px 32px 24px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1.5px solid rgba(255,255,255,0.25)',
          }}>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 14, color: theme === 'dark' ? '#fff' : '#222', letterSpacing: 0.5 }}>Sign Out?</div>
            <div style={{ fontSize: 14, color: theme === 'dark' ? '#ccc' : '#444', marginBottom: 24, textAlign: 'center', maxWidth: 260 }}>
              Are you sure you want to sign out or switch user?
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <button
                onClick={handleLogout}
                style={{
                  background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '10px 26px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #0002',
                  letterSpacing: 0.2,
                  whiteSpace: 'nowrap',
                  minWidth: 100,
                }}
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  color: theme === 'dark' ? '#fff' : '#222',
                  border: '1.5px solid #bbb',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 15,
                  padding: '10px 26px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #0001',
                  letterSpacing: 0.2,
                  whiteSpace: 'nowrap',
                  minWidth: 100,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 