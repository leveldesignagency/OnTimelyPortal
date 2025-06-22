import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function Dashboard() {
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

  return (
    <div style={{ 
      padding: '40px',
      maxWidth: 1400,
      margin: '0 auto',
      fontFamily: 'Roboto, Arial, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, fontWeight: 500, marginBottom: 8 }}>Dashboard</h1>
        <p style={{ fontSize: 18, color: '#666', marginBottom: 24 }}>Welcome back! Here's an overview of your events and activities.</p>
      </div>

      {/* Quick Stats */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 24,
        marginBottom: 48
      }}>
        <div style={{ 
          background: '#f8f9fa',
          borderRadius: 16,
          padding: 24,
          border: '1.5px solid #ddd'
        }}>
          <div style={{ fontSize: 32, fontWeight: 500, marginBottom: 8 }}>{events.length}</div>
          <div style={{ fontSize: 16, color: '#666' }}>Active Events</div>
        </div>
        <div style={{ 
          background: '#f8f9fa',
          borderRadius: 16,
          padding: 24,
          border: '1.5px solid #ddd'
        }}>
          <div style={{ fontSize: 32, fontWeight: 500, marginBottom: 8 }}>2,300</div>
          <div style={{ fontSize: 16, color: '#666' }}>Total Guests</div>
        </div>
        <div style={{ 
          background: '#f8f9fa',
          borderRadius: 16,
          padding: 24,
          border: '1.5px solid #ddd'
        }}>
          <div style={{ fontSize: 32, fontWeight: 500, marginBottom: 8 }}>85%</div>
          <div style={{ fontSize: 16, color: '#666' }}>Average Completion</div>
        </div>
        <div style={{ 
          background: '#f8f9fa',
          borderRadius: 16,
          padding: 24,
          border: '1.5px solid #ddd'
        }}>
          <div style={{ fontSize: 32, fontWeight: 500, marginBottom: 8 }}>12</div>
          <div style={{ fontSize: 16, color: '#666' }}>Staff Members</div>
        </div>
      </div>

      {/* Events Grid */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 500 }}>Your Events</h2>
          <button 
            onClick={() => navigate('/create-event')}
            style={{
              background: '#222',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 16,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Create New Event
          </button>
        </div>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: 24
        }}>
          {events.map(event => (
            <div 
              key={event.id}
              onClick={() => navigate(`/event/${event.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              style={{ 
                background: '#fff',
                border: '1.5px solid #ddd',
                borderRadius: 16,
                padding: 24,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>{event.name}</h3>
                  <p style={{ fontSize: 15, color: '#666', marginBottom: 4 }}>
                    {formatDate(event.from)} - {formatDate(event.to)}
                  </p>
                  <p style={{ fontSize: 15, color: '#666' }}>{event.location}</p>
                </div>
                <span style={{ 
                  background: event.status === 'Upcoming' ? '#FFD600' : '#4CAF50',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  {event.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Guests</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{event.guestCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Completion</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{event.completionRate}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: 24 }}>Recent Activity</h2>
        <div style={{ 
          background: '#fff',
          border: '1.5px solid #ddd',
          borderRadius: 16,
          overflow: 'hidden'
        }}>
          {recentActivity.map((activity, index) => (
            <div 
              key={activity.id}
              style={{ 
                padding: '16px 24px',
                borderBottom: index < recentActivity.length - 1 ? '1px solid #eee' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}
            >
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
                <div style={{ fontSize: 15, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{activity.staffName}</span>
                  {' '}
                  {activity.action}
                  {' in '}
                  <span style={{ color: '#666' }}>{activity.eventName}</span>
                </div>
                <div style={{ fontSize: 14, color: '#888' }}>
                  {formatTimestamp(activity.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 