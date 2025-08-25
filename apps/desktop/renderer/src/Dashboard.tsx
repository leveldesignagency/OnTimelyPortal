import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import { getCurrentUser, getCompanyUsers, getCompanyEvents, getUserNameById } from './lib/auth';
import { supabase, subscribeToActivityLog } from './lib/supabase';
import { User } from './lib/auth';
import { DraggableAction } from './components/DraggableAction';

type EventType = {
  id: string;
  name: string;
  from: string;
  to: string;
  status: string;
  guestCount?: number;
  completionRate?: number;
  location?: string;
  company_id: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

type StaffActivityType = {
  id: string;
  staffName: string;
  action: string;
  timestamp: string;
  eventId?: string;
  eventName?: string;
  userId: string;
  companyId: string;
};

type DashboardStats = {
  totalEvents: number;
  totalGuests: number;
  totalStaff: number;
  activeEvents: number;
  upcomingEvents: number;
  completedEvents: number;
};

type DashboardProps = {
  events?: EventType[];
};

const Dashboard = ({ events: propEvents }: DashboardProps) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  
  // State for real data
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventType[]>(propEvents || []);
  const [staff, setStaff] = useState<User[]>([]);
  const [recentActivity, setRecentActivity] = useState<StaffActivityType[]>([]);
  const [totalGuests, setTotalGuests] = useState<number>(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalGuests: 0,
    totalStaff: 0,
    activeEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0
  });
  const [loading, setLoading] = useState(true);
  // Remove refs and height logic for Quick Stats/Actions

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          console.error('No authenticated user found');
          return;
        }
        setCurrentUser(user);

        // Only load events if not provided by props
        if (!propEvents) {
          const companyEvents = await getCompanyEvents(user.company_id);
          setEvents(companyEvents);
        }

        // Load staff members
        const companyStaff = await getCompanyUsers(user.company_id);
        setStaff(companyStaff);

        // Load total guests for the company
        const { count: guestCount, error: guestCountError } = await supabase
          .from('guests')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', user.company_id);
        if (guestCountError) {
          console.error('Error fetching guest count:', guestCountError);
        } else {
          setTotalGuests(guestCount || 0);
        }

        // Load recent activity from activity_log table
        const { data: activityLogs, error: activityError } = await supabase
          .from('activity_log')
          .select('*')
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (activityError) {
          console.error('Error fetching activity_log:', activityError);
        } else if (activityLogs) {
          // Map activity logs to StaffActivityType
          const mapped = await Promise.all(activityLogs.map(async (log: any) => {
            let staffName = '';
            if (log.user_id) {
              staffName = (await getUserNameById(log.user_id)) || 'Unknown User';
            }
            return {
              id: log.id,
              staffName,
              action: log.action_type,
              timestamp: log.created_at,
              eventId: log.event_id,
              eventName: log.details?.event_title,
              userId: log.user_id,
              companyId: log.company_id,
            };
          }));
          setRecentActivity(mapped);
        }

        // Calculate stats using current events state
        const calculatedStats = calculateStats(events, companyStaff);
        setStats({ ...calculatedStats, totalGuests: guestCount || 0 });

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [propEvents]);

  // If propEvents changes, update local events state and recalculate stats
  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents);
      // Recalculate stats with new events
      const calculatedStats = calculateStats(propEvents, staff);
      setStats(prev => ({ ...prev, ...calculatedStats }));
    }
  }, [propEvents, staff]);

  // Cache for user names
  const userNameCache = React.useRef<{ [userId: string]: string }>({});

  useEffect(() => {
    let subscription: any;
    if (currentUser && currentUser.company_id) {
      subscription = subscribeToActivityLog(currentUser.company_id, async (payload) => {
        console.log('Activity log payload:', payload); // DEBUG: log real-time activity payload
        if (payload.eventType === 'INSERT') {
          let staffName = userNameCache.current[payload.new.user_id];
          if (!staffName) {
            staffName = (await getUserNameById(payload.new.user_id)) || 'Unknown User';
            userNameCache.current[payload.new.user_id] = staffName;
          }
          setRecentActivity(prev => [
            {
              id: payload.new.id,
              staffName,
              action: payload.new.action_type,
              timestamp: payload.new.created_at,
              eventId: payload.new.event_id,
              eventName: payload.new.details?.event_title,
              userId: payload.new.user_id,
              companyId: payload.new.company_id,
            },
            ...prev
          ].slice(0, 10));
        }
      });
    }
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [currentUser]);

  // Function to load recent activity from various sources
  const loadRecentActivity = async (companyId: string): Promise<StaffActivityType[]> => {
    try {
      const activities: StaffActivityType[] = [];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

             // Get recent event updates
       const { data: recentEvents } = await supabase
         .from('events')
         .select(`
           id,
           name,
           updated_at,
           created_by,
           users!events_created_by_fkey(name)
         `)
         .eq('company_id', companyId)
         .gte('updated_at', thirtyDaysAgo.toISOString())
         .order('updated_at', { ascending: false })
         .limit(10);

       if (recentEvents) {
         recentEvents.forEach(event => {
           activities.push({
             id: `event-${event.id}`,
             staffName: (event.users as any)?.name || 'Unknown User',
             action: 'Updated event',
             timestamp: event.updated_at,
             eventId: event.id,
             eventName: event.name,
             userId: event.created_by || '',
             companyId: companyId
           });
         });
       }

             // Get recent guest updates
       const { data: recentGuests } = await supabase
         .from('guests')
         .select(`
           id,
           firstName,
           lastName,
           updated_at,
           created_by,
           users!guests_created_by_fkey(name)
         `)
         .eq('company_id', companyId)
         .gte('updated_at', thirtyDaysAgo.toISOString())
         .order('updated_at', { ascending: false })
         .limit(5);

       if (recentGuests) {
         recentGuests.forEach(guest => {
           activities.push({
             id: `guest-${guest.id}`,
             staffName: (guest.users as any)?.name || 'Unknown User',
             action: 'Updated guest',
             timestamp: guest.updated_at,
             userId: guest.created_by || '',
             companyId: companyId
           });
         });
       }

             // Get recent itinerary updates
       const { data: recentItineraries } = await supabase
         .from('itineraries')
         .select(`
           id,
           title,
           updated_at,
           created_by,
           users!itineraries_created_by_fkey(name)
         `)
         .eq('company_id', companyId)
         .gte('updated_at', thirtyDaysAgo.toISOString())
         .order('updated_at', { ascending: false })
         .limit(5);

       if (recentItineraries) {
         recentItineraries.forEach(itinerary => {
           activities.push({
             id: `itinerary-${itinerary.id}`,
             staffName: (itinerary.users as any)?.name || 'Unknown User',
             action: 'Updated itinerary',
             timestamp: itinerary.updated_at,
             userId: itinerary.created_by || '',
             companyId: companyId
           });
         });
       }

      // Sort all activities by timestamp and take the most recent 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    } catch (error) {
      console.error('Error loading recent activity:', error);
      return [];
    }
  };

  // Calculate dashboard stats
  const calculateStats = (events: EventType[], staff: User[]): DashboardStats => {
    const now = new Date();
    const activeEvents = events.filter(event => {
      const eventStart = new Date(event.from);
      const eventEnd = new Date(event.to);
      return now >= eventStart && now <= eventEnd;
    });

    const upcomingEvents = events.filter(event => {
      const eventStart = new Date(event.from);
      return now < eventStart;
    });

    const completedEvents = events.filter(event => {
      const eventEnd = new Date(event.to);
      return now > eventEnd;
    });

    // Calculate total guests across all events
    const totalGuests = events.reduce((sum, event) => sum + (event.guestCount || 0), 0);

    return {
      totalEvents: events.length,
      totalGuests,
      totalStaff: staff.length,
      activeEvents: activeEvents.length,
      upcomingEvents: upcomingEvents.length,
      completedEvents: completedEvents.length
    };
  };

  // Helper to map action_type codes to readable phrases, context-aware
  const getActionPhrase = (activity: any) => {
    const { action, details } = activity;
    switch (action) {
      case 'event_created': return 'created a new event';
      case 'event_updated': return 'updated the event';
      case 'guests_added':
        if (details?.count && details.count > 1) return `added ${details.count} new guests`;
        return 'added a new guest';
      case 'guest_updated': return 'updated a guest';
      case 'guest_deleted': return 'deleted a guest';
      case 'itinerary_created': return 'created a new itinerary item';
      case 'itinerary_updated': return 'updated an itinerary item';
      case 'itinerary_deleted': return 'deleted an itinerary item';
      case 'homepage_updated': return 'updated the event homepage';
      default: return action.replace(/_/g, ' ');
    }
  };

  // Helper to format relative time
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000); // seconds
    if (diff < 60) return `${diff} second${diff === 1 ? '' : 's'} ago`;
    if (diff < 3600) {
      const min = Math.floor(diff / 60);
      return `${min} minute${min === 1 ? '' : 's'} ago`;
    }
    if (diff < 86400) {
      const hr = Math.floor(diff / 3600);
      return `${hr} hour${hr === 1 ? '' : 's'} ago`;
    }
    const days = Math.floor(diff / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Add a helper to determine event status
  function getEventStatus(event: EventType) {
    const now = new Date();
    const start = new Date(event.from);
    const end = new Date(event.to);
    if (now < start) return 'Upcoming';
    if (now >= start && now <= end) return 'Live';
    return 'Finished';
  }

  const containerStyle: React.CSSProperties = {
    padding: '40px',
    minHeight: '100vh',
    background: isDark ? '#121212' : '#f7f8fa',
    color: isDark ? '#ffffff' : '#333',
    fontFamily: 'Roboto, Arial, system-ui, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: 24,
    textAlign: 'left',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '700',
    margin: 0,
    color: isDark ? '#ffffff' : '#222',
    textAlign: 'left',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: isDark ? '#b0b0b0' : '#666',
    margin: '0',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  };

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: isDark 
      ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
      : '0 4px 20px rgba(0,0,0,0.1)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '500',
    margin: '0 0 16px 0',
    color: isDark ? '#ffffff' : '#222',
  };

  const buttonStyle: React.CSSProperties = {
    background: isDark ? '#ffffff' : '#222',
    color: isDark ? '#000000' : '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: isDark ? '#333' : '#f3f4f6',
    color: isDark ? '#ffffff' : '#374151',
    border: isDark ? '1px solid #444' : '1px solid #d1d5db',
  };

  const eventItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
  };

  const eventNameStyle: React.CSSProperties = {
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#222',
  };

  const eventDateStyle: React.CSSProperties = {
    fontSize: '14px',
    color: isDark ? '#b0b0b0' : '#666',
  };

  const statusStyle: React.CSSProperties = {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: '500',
  };

  // Update getStatusStyle to support new statuses
  const getStatusStyle = (status: string) => {
    const baseStyle = { ...statusStyle };
    if (status === 'Upcoming') {
      return { ...baseStyle, background: '#fbbf24', color: '#fff' };
    } else if (status === 'Live') {
      return { ...baseStyle, background: '#10b981', color: '#fff' };
    } else if (status === 'Finished') {
      return { ...baseStyle, background: '#ef4444', color: '#fff' };
    } else {
      return { ...baseStyle, background: isDark ? '#6b7280' : '#6b7280', color: '#fff' };
    }
  };

  const activityItemStyle: React.CSSProperties = {
    padding: '12px 0',
    borderBottom: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  };

  const activityActionStyle: React.CSSProperties = {
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#222',
  };

  const activityDetailsStyle: React.CSSProperties = {
    fontSize: '14px',
    color: isDark ? '#b0b0b0' : '#666',
    margin: '4px 0 0 0',
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  };

  const statCardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: isDark 
      ? 'inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 16px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.06)',
  };

  const statNumberStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#1f2937',
    margin: '0 0 4px 0',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: isDark ? '#b0b0b0' : '#6b7280',
    margin: '0',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    fontSize: '16px',
    color: isDark ? '#b0b0b0' : '#666',
  };

  const singleColumnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    marginBottom: '40px',
    maxWidth: 800,
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  // Update main container style to match EventDashboardPage
  const mainContainerStyle: React.CSSProperties = {
    padding: '32px 16px 0 16px',
    minHeight: '100vh',
    background: 'transparent',
    color: isDark ? '#ffffff' : '#333',
    fontFamily: 'Roboto, Arial, system-ui, sans-serif',
    maxWidth: 1200,
    margin: '0 auto',
  };

  const twoColStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    marginBottom: '40px',
  };

  const singleColStackStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    marginBottom: '40px',
    width: '100%',
  };

  const quickActionsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: 12,
  };
  const quickActionButtonStyle: React.CSSProperties = {
    aspectRatio: '1',
    minHeight: 120,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)',
    color: isDark ? '#fff' : '#222',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.2)',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Dashboard</h1>
          <p style={subtitleStyle}>Loading your dashboard...</p>
        </div>
        <div style={loadingStyle}>Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark 
        ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
        : '#f7f8fa',
      padding: '24px'
    }}>
      <div style={mainContainerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Dashboard</h1>
          <p style={subtitleStyle}>
            Welcome back{currentUser ? `, ${currentUser.name}` : ''}! Here's what's happening with your events.
          </p>
        </div>
      <div style={twoColStyle}>
        {/* Quick Stats */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Quick Stats</h2>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{stats.totalEvents}</div>
              <div style={statLabelStyle}>Total Events</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{totalGuests}</div>
              <div style={statLabelStyle}>Total Guests</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{stats.totalStaff}</div>
              <div style={statLabelStyle}>Staff Members</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{stats.activeEvents}</div>
              <div style={statLabelStyle}>Active Events</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{stats.upcomingEvents}</div>
              <div style={statLabelStyle}>Upcoming Events</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{stats.completedEvents}</div>
              <div style={statLabelStyle}>Completed Events</div>
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={cardTitleStyle}>Quick Actions</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '16px',
            marginTop: 12,
            flex: 1,
            height: '100%',
          }}>
            <DraggableAction
              action={{
                name: 'Create Event',
        icon: '📅',
                type: 'navigate',
                to: '/create-event'
              }}
            >
              <button 
                style={{
                  ...quickActionButtonStyle,
                  height: '100%',
                  minHeight: 0,
                  aspectRatio: 'auto',
                  fontSize: 25,
                  fontWeight: 500,
                  borderRadius: 12,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => navigate('/create-event')}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                }}
              >
                Create Event
              </button>
            </DraggableAction>
            <DraggableAction
              action={{
                name: 'Go to Teams',
                icon: '👥',
                type: 'navigate',
                to: '/teams'
              }}
            >
              <button 
                style={{ 
                  ...quickActionButtonStyle, 
                  height: '100%',
                  minHeight: 0,
                  aspectRatio: 'auto',
                  fontSize: 25,
                  fontWeight: 500,
                  borderRadius: 12,
                }}
                onClick={() => navigate('/teams')}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                }}
              >
                Go to Teams
              </button>
            </DraggableAction>
            <DraggableAction
              action={{
                name: 'Manage Guests',
                icon: '👤',
                type: 'navigate',
                to: '/guests'
              }}
            >
              <button
                style={{ 
                  ...quickActionButtonStyle, 
                  height: '100%',
                  minHeight: 0,
                  aspectRatio: 'auto',
                  fontSize: 25,
                  fontWeight: 500,
                  borderRadius: 12,
                }}
                onClick={() => navigate('/guests')}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                }}
              >
                Manage Guests
              </button>
            </DraggableAction>
            <DraggableAction
              action={{
                name: 'Help Centre',
                icon: '❓',
                type: 'function',
                execute: () => window.open('https://help.yourapp.com', '_blank')
              }}
            >
              <button
                style={{ 
                  ...quickActionButtonStyle, 
                  height: '100%',
                  minHeight: 0,
                  aspectRatio: 'auto',
                  fontSize: 25,
                  fontWeight: 500,
                  borderRadius: 12,
                }}
                onClick={() => window.open('https://help.yourapp.com', '_blank')}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                }}
              >
                Help Centre
              </button>
            </DraggableAction>
          </div>
        </div>
      </div>
      <div style={singleColStackStyle}>
        {/* Recent Events */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Recent Events</h2>
          <div>
            {events.length === 0 ? (
              <div style={{ color: isDark ? '#b0b0b0' : '#666', fontSize: '16px', textAlign: 'center', padding: '20px' }}>
                No events found. Create your first event to get started.
              </div>
            ) : (
              events.slice(0, 5).map(event => (
                <div
                  key={event.id}
                                      style={{
                      background: isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                      borderRadius: 12,
                      marginBottom: 14,
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                      padding: '18px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                    }}
                  onClick={() => navigate(`/event/${event.id}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                  }}
                >
                  <div>
                    <div style={eventNameStyle}>{event.name}</div>
                    <div style={eventDateStyle}>{formatDate(event.from)} - {formatDate(event.to)}</div>
                    {event.location && (
                      <div style={{ fontSize: 15, color: '#666' }}>{event.location}</div>
                    )}
                  </div>
                  <span style={getStatusStyle(getEventStatus(event))}>{getEventStatus(event)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Recent Activity (last in stack) */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={cardTitleStyle}>Recent Activity</h2>
            <button
              onClick={() => navigate('/notifications')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: 32,
                height: 32,
                transition: 'background 0.15s',
                color: isDark ? '#fff' : '#222',
                marginTop: '-8px',
              }}
              title="View all notifications"
              aria-label="View all notifications"
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#222' : '#f0f0f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
          <div>
            {recentActivity.length === 0 ? (
              <div style={{ color: isDark ? '#b0b0b0' : '#666', fontSize: 16, textAlign: 'center', padding: '20px' }}>
                No recent activity. Start working on events to see activity here.
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  style={{
                    background: isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 12,
                    marginBottom: 14,
                    transition: 'background 0.15s',
                    cursor: activity.eventId ? 'pointer' : 'default',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                  }}
                  onClick={() => { if (activity.eventId) navigate(`/event/${activity.eventId}`); }}
                  onMouseEnter={e => {
                    if (activity.eventId) {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: isDark ? '#333' : '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    color: isDark ? '#fff' : '#666',
                    fontWeight: '600'
                  }}>
                    {activity.staffName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={activityActionStyle}>
                      <span style={{ fontWeight: 500 }}>{activity.staffName}</span>
                      {' '}
                      {getActionPhrase(activity)}
                    </div>
                    <div style={activityDetailsStyle}>
                      {getRelativeTime(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Dashboard;