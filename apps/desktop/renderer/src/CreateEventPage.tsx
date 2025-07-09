import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from './lib/supabase';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';
import { getCurrentUser } from './lib/auth';

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
  // Generate a 6-row calendar grid for consistent height
  const calendarCells = [];
  let dayCounter = 1;
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const cellIndex = week * 7 + day;
      if (cellIndex < firstDay || dayCounter > daysInMonth) {
        calendarCells.push(null);
      } else {
        calendarCells.push(dayCounter);
        dayCounter++;
      }
    }
  }
  function handlePrev() {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  }
  function handleNext() {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
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
          height: 390, // fixed height for 6 weeks
          ...getGlassStyles(isDark),
          padding: 20,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Single navigation row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, width: '100%' }}>
            <button type="button" onClick={handlePrev} style={{ flex: '0 0 48px', height: 40, background: colors.hover, border: 'none', borderRadius: 8, color: colors.text, fontSize: 22, cursor: 'pointer', marginRight: 12, fontWeight: 700, transition: 'background 0.2s' }}>←</button>
            <span style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 18, textAlign: 'center', letterSpacing: 1, color: colors.text, background: 'none', height: 40, lineHeight: '40px', borderRadius: 8 }}>{monthNames[month]} {year}</span>
            <button type="button" onClick={handleNext} style={{ flex: '0 0 48px', height: 40, background: colors.hover, border: 'none', borderRadius: 8, color: colors.text, fontSize: 22, cursor: 'pointer', marginLeft: 12, fontWeight: 700, transition: 'background 0.2s' }}>→</button>
          </div>
          {/* Days of week header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, width: '100%' }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ textAlign: 'center', fontWeight: 600, color: colors.textSecondary, fontSize: 13 }}>{['S','M','T','W','T','F','S'][i]}</div>
            ))}
          </div>
          {/* Calendar grid (6 rows, 7 columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, width: '100%', flex: 1 }}>
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <div key={idx} style={{ width: 36, height: 36 }} />;
              }
              const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
              return (
                <button
                  key={idx}
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

// Utility to get current offset for a time zone
function getTimeZoneOffsetLabel(tz: string): string {
  try {
    const now = new Date();
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset',
    });
    // e.g. "15:00 GMT+2"
    const parts = dtf.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    if (offset.startsWith('GMT') || offset.startsWith('UTC')) return offset;
    return 'GMT' + offset.replace('UTC', '');
  } catch {
    return '';
  }
}

interface TimeZoneOption {
  value: string;
  label: string;
}

const IANA_TIME_ZONES = [
  'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong',
  'Asia/Kolkata', 'Australia/Sydney', 'Australia/Perth', 'Africa/Johannesburg',
  'Pacific/Auckland', 'Pacific/Honolulu', 'Etc/GMT+12', 'Etc/GMT-14',
];

const timeZoneOptions: TimeZoneOption[] = IANA_TIME_ZONES.map(tz => {
  const offset = getTimeZoneOffsetLabel(tz);
  return {
    value: tz,
    label: `${tz} (${offset})`,
  };
});

interface GlassTimeZoneDropdownProps {
  value: string;
  onChange: (tz: string) => void;
  colors: any;
}

function GlassTimeZoneDropdown({ value, onChange, colors }: GlassTimeZoneDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const filtered = timeZoneOptions.filter(opt =>
    opt.label.toLowerCase().includes(filter.toLowerCase())
  );
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: '12px',
          border: `2px solid ${colors.border}`,
          background: colors.inputBg,
          color: colors.text,
          fontSize: '20px',
          minHeight: '56px',
          boxSizing: 'border-box',
          marginTop: 4,
          transition: 'all 0.2s',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <span>{timeZoneOptions.find(opt => opt.value === value)?.label || value}</span>
        <span style={{ marginLeft: 12, fontSize: 18, opacity: 0.5 }}>▼</span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            width: '100%',
            maxHeight: 260,
            overflowY: 'auto',
            background: '#000',
            border: '2px solid #fff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
            zIndex: 100,
            color: '#fff',
          }}
        >
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search time zone..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              outline: 'none',
              background: '#111',
              color: '#fff',
              fontSize: 16,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              boxSizing: 'border-box',
            }}
          />
          {filtered.length === 0 && (
            <div style={{ padding: 16, color: '#aaa', fontSize: 15 }}>No results</div>
          )}
          {filtered.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); setFilter(''); }}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                color: '#fff',
                background: opt.value === value ? '#222' : 'transparent',
                fontWeight: opt.value === value ? 700 : 400,
                fontSize: 18,
                border: opt.value === value ? '2px solid #fff' : '2px solid transparent',
                borderRadius: 8,
                margin: '4px 8px',
                transition: 'border 0.2s',
              }}
              onMouseDown={e => e.preventDefault()}
            >
              {opt.label}
            </div>
          ))}
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
  const [timeZone, setTimeZone] = useState('UTC');
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
      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('No authenticated user found. Please log in again.');
        setLoading(false);
        return;
      }
      console.log('Creating event with user:', currentUser);
      const eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'> = {
      name,
      from,
      to,
      status: 'Upcoming',
        description: description || undefined,
        location: location || undefined,
        company_id: currentUser.company_id,
        created_by: currentUser.id,
        time_zone: timeZone,
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
    }}>
      <div style={{ maxWidth: 520, width: '100%', ...glassStyle, padding: 32, zIndex: 1000, position: 'relative', margin: '40px auto' }}>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <h2 style={{ color: colors.text, fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Create New Event</h2>
          {/* Event Name field */}
          <div style={{ marginBottom: 20, width: '100%' }}>
            <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Event Name *</label>
        <input
              type="text"
          value={name}
          onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: '20px',
                marginBottom: 0,
                minHeight: '56px',
                boxSizing: 'border-box',
                marginTop: 4,
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
          placeholder="What is your event called?"
          required
        />
          </div>
          {/* Location field */}
          <div style={{ marginBottom: 20, width: '100%' }}>
            <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Location</label>
        <input
              type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                border: `2px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                fontSize: '20px',
                marginBottom: 0,
                minHeight: '56px',
                boxSizing: 'border-box',
                marginTop: 4,
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              placeholder="Event location"
              required
            />
          </div>
          {/* Time Zone field - match location field UI */}
          <div style={{ marginBottom: 20, width: '100%' }}>
            <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Time Zone</label>
            <GlassTimeZoneDropdown value={timeZone} onChange={setTimeZone} colors={colors} />
          </div>
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
        </form>
      </div>
    </div>
  );
} 