import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from './lib/supabase';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';

// Glass and color helpers (copy from CalendarPage if not imported)
const getGlassStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(30, 30, 30, 0.8)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '16px',
  boxShadow: isDark 
    ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
    : '0 8px 32px rgba(0, 0, 0, 0.1)',
});
const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0a0a0a' : '#f5f7fa',
  text: isDark ? '#ffffff' : '#1a1a1a',
  textSecondary: isDark ? '#a0a0a0' : '#6b7280',
  accent: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  hover: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
});

// Custom Date Picker
function CustomDatePicker({ value, onChange, placeholder, isDark, colors, required }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isDark: boolean;
  colors: any;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  function selectDate(day: number) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setShow(false);
  }
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setShow(!show)}
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: '12px',
          border: `2px solid ${colors.border}`,
          background: colors.inputBg,
          color: value ? colors.text : colors.textSecondary,
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
          minHeight: '56px',
          boxSizing: 'border-box',
          marginBottom: 0
        }}
      >
        <span>{value ? new Date(value).toLocaleDateString() : placeholder}</span>
        <ThemedIcon name="calendar" size={24} style={{ marginLeft: 8 }} />
      </div>
      {show && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '100%',
          transform: 'translate(-50%, -24px)',
          zIndex: 1000,
          width: 340,
          minWidth: 340,
          maxWidth: 340,
          ...getGlassStyles(isDark),
          padding: 20,
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 12 }}>
            <button type="button" onClick={() => setMonth(m => m === 0 ? 11 : m - 1)} style={{ background: 'none', border: 'none', color: colors.text, fontSize: 20, cursor: 'pointer', boxShadow: 'none', outline: 'none', padding: 0, margin: 0 }}>←</button>
            <span style={{ fontWeight: 600, fontSize: 16, textAlign: 'center', flex: 1, whiteSpace: 'nowrap' }}>{monthNames[month]} {year}</span>
            <button type="button" onClick={() => setMonth(m => m === 11 ? 0 : m + 1)} style={{ background: 'none', border: 'none', color: colors.text, fontSize: 20, cursor: 'pointer', boxShadow: 'none', outline: 'none', padding: 0, margin: 0 }}>→</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ textAlign: 'center', fontWeight: 600, color: colors.textSecondary, fontSize: 13 }}>{['S','M','T','W','T','F','S'][i]}</div>
            ))}
            {Array(firstDay).fill(null).map((_, i) => <div key={'empty'+i} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year ? colors.accent : isToday ? colors.hover : 'transparent',
                    color: colors.text,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    margin: 0, padding: 0
                  }}
                >{day}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateEventPageProps {
  onCreate: (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => Promise<Event>;
}

export default function CreateEventPage({ onCreate }: CreateEventPageProps) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const glassStyle = getGlassStyles(isDark);
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        description: description || undefined,
        location: location || undefined,
        company_id: '',
        created_by: '',
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
    <form onSubmit={handleSubmit} style={{
      minHeight: '100vh',
      width: '100vw',
      background: colors.bg,
      color: colors.text,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      fontFamily: 'inherit',
      transition: 'background 0.3s, color 0.3s',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1
    }}>
      <div style={{ ...glassStyle, width: '100%', maxWidth: 640, padding: '56px 40px', boxSizing: 'border-box', margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: 36, color: colors.text, marginBottom: 40, fontWeight: 700, letterSpacing: 0.5, textAlign: 'center' }}>Create New Event</h1>
        <label htmlFor="event-name" style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'block', alignSelf: 'flex-start' }}>EVENT NAME *</label>
        <input
          id="event-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="What is your event called?"
          style={{ width: '100%', padding: '16px 20px', borderRadius: '12px', border: `2px solid ${colors.border}`, background: colors.inputBg, color: colors.text, fontSize: 20, marginBottom: 28, outline: 'none', boxSizing: 'border-box', marginTop: 4, transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
          required
        />
        <label htmlFor="event-location" style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'block', alignSelf: 'flex-start' }}>LOCATION</label>
        <input
          id="event-location"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Where will the event take place? (optional)"
          style={{ width: '100%', padding: '16px 20px', borderRadius: '12px', border: `2px solid ${colors.border}`, background: colors.inputBg, color: colors.text, fontSize: 20, marginBottom: 28, outline: 'none', boxSizing: 'border-box', marginTop: 4, transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
        />
        <label style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'block', marginTop: 12, alignSelf: 'flex-start' }} htmlFor="event-from">DATES/DURATION *</label>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40, gap: 20, width: '100%' }}>
          <CustomDatePicker
            value={from}
            onChange={setFrom}
            placeholder="Start date"
            isDark={isDark}
            colors={colors}
            required
          />
          <span style={{ fontSize: 32, color: colors.textSecondary, margin: '0 12px', userSelect: 'none' }}>&#9654;</span>
          <CustomDatePicker
            value={to}
            onChange={setTo}
            placeholder="End date"
            isDark={isDark}
            colors={colors}
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            marginTop: 12, 
            height: 60, 
            fontSize: 22,
            fontWeight: 700,
            borderRadius: '12px',
            border: 'none',
            background: colors.text,
            color: isDark ? '#000' : '#fff',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'all 0.2s',
            letterSpacing: 1
          }}
        >
          {loading ? 'CREATING...' : 'CREATE'}
        </button>
      </div>
    </form>
  );
} 