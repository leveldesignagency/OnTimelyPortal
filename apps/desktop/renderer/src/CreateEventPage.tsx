import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from './lib/supabase';

export default function CreateEventPage({ onCreate }: { onCreate: (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => Promise<Event> }) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !from || !to) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'> = {
        name,
        from,
        to,
        status: 'Upcoming',
        description: description || null,
        location: location || null,
        company_id: '', // This will be set by the onCreate handler
        created_by: '', // This will be set by the onCreate handler
      };
      
      const newEvent = await onCreate(eventData);
      navigate(`/event/${newEvent.id}`);
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '60px auto 0 auto', background: 'none', boxShadow: 'none', padding: 0 }}>
      <h1 style={{ fontSize: 32, color: '#222', marginBottom: 32, paddingBottom: 8, letterSpacing: 0.5 }}>Create New Event</h1>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <label htmlFor="event-name">EVENT NAME *</label>
        <input
          id="event-name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="What is your event called?"
          style={{ width: '100%', height: 56, fontSize: 22, marginBottom: 36 }}
          required
        />
        
        <label htmlFor="event-description">DESCRIPTION</label>
        <input
          id="event-description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          placeholder="Brief description of the event (optional)"
          style={{ width: '100%', height: 56, fontSize: 22, marginBottom: 36 }}
        />
        
        <label htmlFor="event-location">LOCATION</label>
        <input
          id="event-location"
          value={location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
          placeholder="Where will the event take place? (optional)"
          style={{ width: '100%', height: 56, fontSize: 22, marginBottom: 36 }}
        />
        
        <label style={{ marginTop: 32 }} htmlFor="event-from">DATES/DURATION *</label>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36, gap: 24, width: '100%' }}>
          <input
            id="event-from"
            type="date"
            value={from}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
            placeholder="FROM"
            style={{ flex: 1, height: 56, fontSize: 22 }}
            required
          />
          <span style={{ fontSize: 36, color: '#bbb', margin: '0 12px' }}>&#9654;</span>
          <input
            type="date"
            value={to}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
            placeholder="TO"
            style={{ flex: 1, height: 56, fontSize: 22 }}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            marginTop: 32, 
            height: 56, 
            fontSize: 22,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'CREATING...' : 'CREATE'}
        </button>
      </form>
    </div>
  );
} 