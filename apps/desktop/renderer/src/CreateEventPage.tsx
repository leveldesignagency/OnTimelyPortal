import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type EventType = {
  id: string;
  name: string;
  from: string;
  to: string;
  status: string;
};

export default function CreateEventPage({ onCreate }: { onCreate: (event: EventType) => void }) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [team, setTeam] = useState('');
  const [teamList] = useState([
    'marina@octagon.com',
    'tommy@octagon.com',
    'sam@octagon.com',
    'sydney@octagon.com',
  ]);
  const [assigned, setAssigned] = useState([
    'ryan@octagon.com',
    'luisa@octagon.com',
    'david@octagon.com',
  ]);
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    const event: EventType = {
      id,
      name,
      from,
      to,
      status: 'Upcoming',
    };
    onCreate(event);
    navigate(`/event/${id}`);
  }

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '60px auto 0 auto', background: 'none', boxShadow: 'none', padding: 0 }}>
      <h1 style={{ fontSize: 32, color: '#222', marginBottom: 32, paddingBottom: 8, letterSpacing: 0.5 }}>Create New Event</h1>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <label htmlFor="event-name">EVENT NAME</label>
        <input
          id="event-name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="What is your event called?"
          style={{ width: '100%', height: 56, fontSize: 22, marginBottom: 36 }}
        />
        <label style={{ marginTop: 32 }} htmlFor="event-from">DATES/DURATION</label>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36, gap: 24, width: '100%' }}>
          <input
            id="event-from"
            type="date"
            value={from}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
            placeholder="FROM"
            style={{ flex: 1, height: 56, fontSize: 22 }}
          />
          <span style={{ fontSize: 36, color: '#bbb', margin: '0 12px' }}>&#9654;</span>
          <input
            type="date"
            value={to}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
            placeholder="TO"
            style={{ flex: 1, height: 56, fontSize: 22 }}
          />
        </div>
        <button type="submit" style={{ width: '100%', marginTop: 32, height: 56, fontSize: 22 }}>CREATE</button>
      </form>
    </div>
  );
} 