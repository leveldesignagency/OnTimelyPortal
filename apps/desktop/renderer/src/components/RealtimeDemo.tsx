import React, { useState } from 'react'
import { useRealtimeEvents, useRealtimeGuests } from '../hooks/useRealtime'
import { addGuest, updateGuest, deleteGuest } from '../lib/supabase'
import RealtimeStatus from './RealtimeStatus'

const RealtimeDemo: React.FC = () => {
  const { events, loading: eventsLoading, error: eventsError } = useRealtimeEvents()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const { guests, loading: guestsLoading, error: guestsError } = useRealtimeGuests(selectedEventId)
  // Demo page no longer performs inserts to strict 'guests' schema to avoid type/DB constraint issues.
  // If you want add support here, wire this to your guest creation flow with required fields.

  const handleUpdateGuestStatus = async (guestId: string, status: 'confirmed' | 'declined' | 'pending') => {
    try {
      await updateGuest(guestId, { status })
    } catch (error) {
      console.error('Error updating guest:', error)
    }
  }

  const handleDeleteGuest = async (guestId: string) => {
    try {
      await deleteGuest(guestId)
    } catch (error) {
      console.error('Error deleting guest:', error)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <RealtimeStatus />
      
      <h1 style={{ marginBottom: '20px' }}>Real-time Demo</h1>
      
      {/* Events Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Events</h2>
        {eventsLoading && <p>Loading events...</p>}
        {eventsError && <p style={{ color: 'red' }}>Error: {eventsError}</p>}
        {events.length === 0 && !eventsLoading && (
          <p>No events found. Create some events in your Supabase dashboard to see them here!</p>
        )}
        {events.map(event => (
          <div 
            key={event.id} 
            style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '10px 0', 
              borderRadius: '5px',
              backgroundColor: selectedEventId === event.id ? '#e3f2fd' : 'white'
            }}
            onClick={() => setSelectedEventId(event.id)}
          >
            <h3>{event.name}</h3>
            {event.description && <p>{event.description}</p>}
            {(event.from || event.start_time) && (
              <p><strong>Date:</strong> {new Date(event.from || event.start_time as string).toLocaleDateString()}</p>
            )}
            {event.location && <p><strong>Location:</strong> {event.location}</p>}
          </div>
        ))}
      </div>

      {/* Guests Section */}
      {selectedEventId && (
        <div>
          <h2>Guests for Selected Event</h2>
          
          {/* Add Guest form removed in demo to avoid DB schema mismatch. */}

          {/* Guests List */}
          {guestsLoading && <p>Loading guests...</p>}
          {guestsError && <p style={{ color: 'red' }}>Error: {guestsError}</p>}
          {guests.length === 0 && !guestsLoading && (
            <p>No guests for this event yet. Add some above!</p>
          )}
          {guests.map(guest => (
            <div 
              key={guest.id} 
              style={{ 
                border: '1px solid #ccc', 
                padding: '10px', 
                margin: '10px 0', 
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>{[guest.first_name, guest.last_name].filter(Boolean).join(' ') || guest.email}</strong> ({guest.email})
                <br />
                <span style={{ 
                  color: guest.status === 'confirmed' ? 'green' : 
                         guest.status === 'declined' ? 'red' : 'orange'
                }}>
                  Status: {guest.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => handleUpdateGuestStatus(guest.id, 'confirmed')}
                  style={{ 
                    padding: '4px 8px', 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Confirm
                </button>
                <button 
                  onClick={() => handleUpdateGuestStatus(guest.id, 'declined')}
                  style={{ 
                    padding: '4px 8px', 
                    backgroundColor: '#dc3545', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Decline
                </button>
                <button 
                  onClick={() => handleDeleteGuest(guest.id)}
                  style={{ 
                    padding: '4px 8px', 
                    backgroundColor: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RealtimeDemo 
 