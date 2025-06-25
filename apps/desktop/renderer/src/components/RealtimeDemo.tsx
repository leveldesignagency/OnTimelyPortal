import React, { useState } from 'react'
import { useRealtimeEvents, useRealtimeGuests } from '../hooks/useRealtime'
import { addGuest, updateGuest, deleteGuest } from '../lib/supabase'
import RealtimeStatus from './RealtimeStatus'

const RealtimeDemo: React.FC = () => {
  const { events, loading: eventsLoading, error: eventsError } = useRealtimeEvents()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const { guests, loading: guestsLoading, error: guestsError } = useRealtimeGuests(selectedEventId)
  const [newGuestName, setNewGuestName] = useState('')
  const [newGuestEmail, setNewGuestEmail] = useState('')

  const handleAddGuest = async () => {
    if (!selectedEventId || !newGuestName || !newGuestEmail) return
    
    try {
      await addGuest({
        event_id: selectedEventId,
        name: newGuestName,
        email: newGuestEmail,
        status: 'pending'
      })
      setNewGuestName('')
      setNewGuestEmail('')
    } catch (error) {
      console.error('Error adding guest:', error)
    }
  }

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
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
            <p><strong>Location:</strong> {event.location}</p>
          </div>
        ))}
      </div>

      {/* Guests Section */}
      {selectedEventId && (
        <div>
          <h2>Guests for Selected Event</h2>
          
          {/* Add Guest Form */}
          <div style={{ 
            border: '1px solid #ddd', 
            padding: '15px', 
            marginBottom: '20px', 
            borderRadius: '5px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3>Add New Guest</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Guest Name"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input
                type="email"
                placeholder="Guest Email"
                value={newGuestEmail}
                onChange={(e) => setNewGuestEmail(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button 
                onClick={handleAddGuest}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Add Guest
              </button>
            </div>
          </div>

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
                <strong>{guest.name}</strong> ({guest.email})
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
 