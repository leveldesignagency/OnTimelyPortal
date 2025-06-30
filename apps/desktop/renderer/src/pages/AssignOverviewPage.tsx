import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeContext } from '../ThemeContext';

export default function AssignOverviewPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const { id: eventId } = useParams();
  // Expecting navigation state: { guestAssignments, guests, itineraries, eventAddOns }
  const { guestAssignments = {}, guests = [], itineraries = [], eventAddOns = [] } = location.state || {};

  if (!guests.length || !itineraries.length) {
    return (
      <div style={{ padding: 48, background: isDark ? '#121212' : '#f8f9fa', minHeight: '100vh', color: isDark ? '#fff' : '#222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingRight: 40 }}>
          <button onClick={() => navigate(-1)} style={{ width: 140, fontSize: 16, background: 'none', color: '#fff', border: '1.5px solid #bbb', borderRadius: 8, cursor: 'pointer', fontWeight: 600, padding: '10px 0' }}>
            Back
          </button>
          <button
            style={{ width: 180, fontSize: 16, background: '#fff', color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '10px 0', letterSpacing: 1 }}
            onClick={() => navigate('/event-portal-management', { 
              state: { 
                guestAssignments, 
                guests, 
                itineraries, 
                eventAddOns,
                eventId 
              } 
            })}
          >
            Assign
          </button>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, paddingRight: 40 }}>Assign Overview</h1>
        <div>No guests or itineraries selected. Please go back and select at least one guest and one itinerary.</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 48, background: isDark ? '#121212' : '#f8f9fa', color: isDark ? '#fff' : '#222' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingRight: 40 }}>
        <button onClick={() => navigate(-1)} style={{ width: 140, fontSize: 16, background: 'none', color: '#fff', border: '1.5px solid #bbb', borderRadius: 8, cursor: 'pointer', fontWeight: 600, padding: '10px 0' }}>
          Back
        </button>
        <button
          style={{ width: 140, fontSize: 16, background: '#fff', color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '10px 0', letterSpacing: 1 }}
          onClick={() => navigate('/event-portal-management', { 
            state: { 
              guestAssignments, 
              guests, 
              itineraries, 
              eventAddOns,
              eventId 
            } 
          })}
        >
          Assign
        </button>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 40, letterSpacing: 1 }}>Assign Overview</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
        {guests.map((guest: any) => {
          const assignedItins = (guestAssignments[guest.id] || []).map((itinId: string) =>
            itineraries.find((itin: any) => itin.id === itinId)
          ).filter(Boolean);
          return (
            <div key={guest.id} style={{ minWidth: 420, maxWidth: 600, background: 'rgba(30,30,30,0.7)', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', border: '1.5px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: 44, color: '#fff', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{`${guest.first_name || ''} ${guest.last_name || ''}`.trim() || guest.email || guest.id}</div>
              <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 18, color: '#ccc' }}>{guest.email}</div>
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: isDark ? '2px solid #333' : '2px solid #e5e7eb', paddingBottom: 12 }}>Assigned Itineraries</h2>
                {assignedItins.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {assignedItins.map((itin: any) => (
                      <div key={itin.id} style={{ fontSize: 15, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <strong style={{ fontSize: 16 }}>{itin.title}</strong><br />
                        <span style={{ color: '#ccc', fontSize: 14 }}>{itin.details || ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#aaa', fontSize: 15 }}>No itineraries assigned.</div>
                )}
              </div>
              {eventAddOns.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: isDark ? '2px solid #333' : '2px solid #e5e7eb', paddingBottom: 12 }}>Add-Ons</h2>
                  <ul style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {eventAddOns.map((addon: any, index: number) => (
                      <li key={addon.id || addon.name || index} style={{ color: '#ccc', fontSize: 15 }}>
                        {addon.name || addon.type || addon.key || 'Unknown Add-on'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 
 