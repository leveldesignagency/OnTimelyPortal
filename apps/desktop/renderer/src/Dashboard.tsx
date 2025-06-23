import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';

type EventType = {
  id: string;
  name: string;
  from: string;
  to: string;
  status: string;
  guestCount?: number;
  completionRate?: number;
  location?: string;
};

type StaffActivityType = {
  id: string;
  staffName: string;
  action: string;
  timestamp: string;
  eventId?: string;
  eventName?: string;
};

const Dashboard = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  
  // Mock data - replace with real data later
  const events: EventType[] = [
    {
      id: '1',
      name: 'FIFA World Cup 2026',
      from: '2026-06-11',
      to: '2026-07-12',
      status: 'Upcoming',
      guestCount: 1500,
      completionRate: 75,
      location: 'Multiple Cities, USA'
    },
    {
      id: '2',
      name: 'UCL Final 2025',
      from: '2025-05-25',
      to: '2025-05-25',
      status: 'Planning',
      guestCount: 800,
      completionRate: 45,
      location: 'London, UK'
    }
  ];

  const recentActivity: StaffActivityType[] = [
    {
      id: '1',
      staffName: 'John Smith',
      action: 'Updated guest list',
      timestamp: '2024-03-15T10:30:00',
      eventId: '1',
      eventName: 'FIFA World Cup 2026'
    },
    {
      id: '2',
      staffName: 'Sarah Johnson',
      action: 'Modified itinerary',
      timestamp: '2024-03-15T09:45:00',
      eventId: '2',
      eventName: 'UCL Final 2025'
    }
  ];

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

  const containerStyle: React.CSSProperties = {
    padding: '40px',
    minHeight: '100vh',
    background: isDark ? '#121212' : '#f7f8fa',
    color: isDark ? '#ffffff' : '#333',
    fontFamily: 'Roboto, Arial, system-ui, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '40px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '500',
    margin: '0 0 8px 0',
    color: isDark ? '#ffffff' : '#222',
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
    background: isDark ? '#1e1e1e' : '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.08)',
    border: isDark ? '1px solid #333' : '1px solid #e5e7eb',
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
    borderBottom: isDark ? '1px solid #333' : '1px solid #e5e7eb',
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

  const getStatusStyle = (status: string) => {
    const baseStyle = { ...statusStyle };
    if (status === 'Upcoming') {
      return { ...baseStyle, background: isDark ? '#3b3b3b' : '#f3f4f6', color: isDark ? '#d1d5db' : '#6b7280' };
    } else if (status === 'Planning') {
      return { ...baseStyle, background: isDark ? '#3b3b1a' : '#fef3c7', color: isDark ? '#fbbf24' : '#92400e' };
    } else {
      return { ...baseStyle, background: isDark ? '#4CAF50' : '#4CAF50', color: '#fff' };
    }
  };

  const activityItemStyle: React.CSSProperties = {
    padding: '12px 0',
    borderBottom: isDark ? '1px solid #333' : '1px solid #e5e7eb',
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
    background: isDark ? '#2a2a2a' : '#f8fafc',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    border: isDark ? '1px solid #404040' : '1px solid #e2e8f0',
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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Dashboard</h1>
        <p style={subtitleStyle}>Welcome back! Here's what's happening with your events.</p>
      </div>

      <div style={gridStyle}>
        {/* Quick Stats */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Quick Stats</h2>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{events.length}</div>
              <div style={statLabelStyle}>Total Events</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>2,300</div>
              <div style={statLabelStyle}>Total Guests</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>85%</div>
              <div style={statLabelStyle}>Average Completion</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>12</div>
              <div style={statLabelStyle}>Staff Members</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              style={buttonStyle}
              onClick={() => navigate('/create-event')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#f0f0f0' : '#444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? '#ffffff' : '#222';
              }}
            >
              ✨ Create New Event
            </button>
            <button 
              style={secondaryButtonStyle}
              onClick={() => navigate('/teams')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#444' : '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? '#333' : '#f3f4f6';
              }}
            >
              👥 Go to Teams
            </button>
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        {/* Recent Events */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Recent Events</h2>
          <div>
            {events.map(event => (
              <div key={event.id} style={eventItemStyle}>
                <div>
                  <div style={eventNameStyle}>{event.name}</div>
                  <div style={eventDateStyle}>{formatDate(event.from)} - {formatDate(event.to)}</div>
                  <div style={{ fontSize: 15, color: '#666' }}>{event.location}</div>
                </div>
                <span style={getStatusStyle(event.status)}>{event.status}</span>
              </div>
            ))}
          </div>
          <button 
            style={{ ...secondaryButtonStyle, marginTop: '16px', width: '100%' }}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#444' : '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? '#333' : '#f3f4f6';
            }}
          >
            View All Events
          </button>
        </div>

        {/* Recent Activity */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Recent Activity</h2>
          <div>
            {recentActivity.map((activity, index) => (
              <div key={activity.id} style={activityItemStyle}>
                <div style={{ 
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: '#666'
                }}>
                  {activity.staffName.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={activityActionStyle}>
                    <span style={{ fontWeight: 500 }}>{activity.staffName}</span>
                    {' '}
                    {activity.action}
                    {' in '}
                    <span style={{ color: '#666' }}>{activity.eventName}</span>
                  </div>
                  <div style={activityDetailsStyle}>
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 