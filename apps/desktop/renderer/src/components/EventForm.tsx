import React, { useState, useEffect } from 'react';
import ThemedIcon from './ThemedIcon';
import { getCurrentUser } from '../lib/auth';
import { getCompanyTeams } from '../lib/chat';

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
    const parts = dtf.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    if (offset.startsWith('GMT') || offset.startsWith('UTC')) return offset;
    return 'GMT' + offset.replace('UTC', '');
  } catch {
    return '';
  }
}

const IANA_TIME_ZONES = [
  'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong',
  'Asia/Kolkata', 'Australia/Sydney', 'Australia/Perth', 'Africa/Johannesburg',
  'Pacific/Auckland', 'Pacific/Honolulu', 'Etc/GMT+12', 'Etc/GMT-14',
];

const timeZoneOptions = IANA_TIME_ZONES.map(tz => {
  const offset = getTimeZoneOffsetLabel(tz);
  return {
    value: tz,
    label: `${tz} (${offset})`,
  };
});

// Add prop types for GlassTimeZoneDropdown
interface GlassTimeZoneDropdownProps {
  value: string;
  onChange: (tz: string) => void;
  colors: any;
  isDark: boolean;
}

function GlassTimeZoneDropdown({ value, onChange, colors, isDark }: GlassTimeZoneDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const filtered = timeZoneOptions.filter(opt =>
    opt.label.toLowerCase().includes(filter.toLowerCase())
  );
  const selectedLabel = timeZoneOptions.find(opt => opt.value === value)?.label || '';
  const displayValue = filter.length > 0 ? filter : selectedLabel;
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={displayValue}
        onChange={e => {
          setFilter(e.target.value);
          setOpen(!!e.target.value);
        }}
        onFocus={e => { if (filter || value) setOpen(true); }}
        placeholder="Search time zone..."
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
          display: 'block',
        }}
        autoComplete="off"
      />
      <span
        onClick={() => setOpen(filter ? !open : !open)}
        style={{
          position: 'absolute',
          right: 18,
          top: 18,
          fontSize: 18,
          opacity: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 2,
        }}
        tabIndex={0}
        role="button"
        aria-label="Show time zone suggestions"
      >▼</span>
      {open && (filter || value) && (
        <div
          style={{
            width: '100%',
            maxHeight: 260,
            overflowY: 'auto',
            background: `linear-gradient(to top, ${colors.inputBg} 75%, rgba(0,0,0,0) 100%)`,
            border: `2px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
            color: colors.text,
            marginTop: 4,
            position: 'relative',
            zIndex: 10,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: 16, color: colors.textSecondary, fontSize: 15 }}>No results</div>
          )}
          {filtered.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); setFilter(''); }}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                color: colors.text,
                background: opt.value === value ? (isDark ? '#444' : '#e5e7eb') : 'transparent',
                fontWeight: opt.value === value ? 700 : 400,
                fontSize: 18,
                borderRadius: 8,
                margin: '4px 8px',
                transition: 'background 0.2s',
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

// Add prop types for CustomDatePicker
interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isDark: boolean;
  colors: any;
  required?: boolean;
}

function CustomDatePicker({ value, onChange, placeholder, isDark, colors, required }: CustomDatePickerProps) {
  const [show, setShow] = React.useState(false);
  const [month, setMonth] = React.useState(() => new Date().getMonth());
  const [year, setYear] = React.useState(() => new Date().getFullYear());
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
        <span>{value ? (() => {
          const date = new Date(value);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        })() : placeholder}</span>
        <ThemedIcon name="calendar" size={24} style={{ marginLeft: 8, background: 'transparent', color: '#fff' }} />
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
            <button type="button" onClick={handlePrev} style={{ flex: '0 0 48px', height: 40, background: 'transparent', border: `2px solid ${colors.text}`, borderRadius: 8, color: colors.text, fontSize: 22, cursor: 'pointer', marginRight: 12, fontWeight: 700, transition: 'border 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThemedIcon name="__arrow" size={18} style={{ filter: isDark ? 'invert(1) brightness(1.2)' : 'none', display: 'block', transform: 'rotate(180deg)' }} />
            </button>
            <span style={{ flex: '1 1 auto', fontWeight: 700, fontSize: 18, textAlign: 'center', letterSpacing: 1, color: colors.text, background: 'none', height: 40, lineHeight: '40px', borderRadius: 8 }}>{monthNames[month]} {year}</span>
            <button type="button" onClick={handleNext} style={{ flex: '0 0 48px', height: 40, background: 'transparent', border: `2px solid ${colors.text}`, borderRadius: 8, color: colors.text, fontSize: 22, cursor: 'pointer', marginLeft: 12, fontWeight: 700, transition: 'border 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThemedIcon name="nav-arrow" size={18} style={{ filter: isDark ? 'invert(1) brightness(1.2)' : 'none', display: 'block' }} />
            </button>
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
              const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
              let background = 'transparent';
              let color = colors.text;
              if (isSelected) {
                background = colors.accent;
                color = isDark ? '#000' : '#fff';
              } else if (!value && isToday) {
                background = colors.hover;
                color = colors.text;
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDate(day)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    background,
                    color,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    margin: 0,
                    padding: 0
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

// Custom Glass Time Picker Component (matching CreateItinerary style)
const TimePicker = ({ 
  value, 
  onChange, 
  placeholder, 
  colors 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
  colors: any; 
}) => {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState('');
  const [minute, setMinute] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  
  React.useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':');
      setHour(h);
      setMinute(m);
    }
  }, [value]);
  
  const handleSelect = (h: string, m: string) => {
    setHour(h);
    setMinute(m);
    onChange(`${h}:${m}`);
    setOpen(false);
  };
  
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }} ref={ref}>
      <input
        type="text"
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => {
          const val = e.target.value;
          if (/^\d{2}:\d{2}$/.test(val)) {
            const [h, m] = val.split(':');
            setHour(h);
            setMinute(m);
            onChange(val);
          } else {
            setHour('');
            setMinute('');
            onChange(val);
          }
        }}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: '12px',
          border: `2px solid ${colors.border}`,
          background: colors.inputBg,
          color: colors.text,
          fontSize: '16px',
          transition: 'all 0.2s ease',
          height: '56px',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
          backdropFilter: 'blur(10px)'
        }}
        maxLength={5}
      />
      {open && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '100%',
          marginTop: 8,
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          display: 'flex',
          gap: 8,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: `1.5px solid rgba(255,255,255,0.18)`,
          background: 'rgba(30, 30, 30, 0.95)',
          zIndex: 1000,
          maxHeight: 220,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {hours.map(h => (
              <div
                key={h}
                onMouseDown={() => handleSelect(h, minute || '00')}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  background: h === hour ? '#fff' : 'transparent',
                  color: h === hour ? '#000' : '#fff',
                  fontWeight: h === hour ? 700 : 400,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.2s',
                }}
              >
                {h}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {minutes.map(m => (
              <div
                key={m}
                onMouseDown={() => handleSelect(hour || '00', m)}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  background: m === minute ? '#fff' : 'transparent',
                  color: m === minute ? '#000' : '#fff',
                  fontWeight: m === minute ? 700 : 400,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.2s',
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Props: mode ('create'|'edit'), initialValues, onSubmit, onCancel, isDark, colors
export default function EventForm({
  mode = 'create',
  initialValues = {},
  onSubmit,
  onCancel,
  isDark,
  colors
}: {
  mode: 'create' | 'edit',
  initialValues: any,
  onSubmit: (values: any) => Promise<void> | void,
  onCancel: () => void,
  isDark: boolean,
  colors: any
}) {
  // State copied from CreateEventPage, but initialized from initialValues
  const [name, setName] = useState(initialValues.name || '');
  const [from, setFrom] = useState(initialValues.from || '');
  const [to, setTo] = useState(initialValues.to || '');
  const [startTime, setStartTime] = useState(initialValues.startTime || '');
  const [endTime, setEndTime] = useState(initialValues.endTime || '');
  const [location, setLocation] = useState(initialValues.location || '');
  const [timeZone, setTimeZone] = useState(initialValues.timeZone || 'UTC');
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(initialValues.teamIds || []);
  const [teamSearch, setTeamSearch] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  // Get selected team names for display
  const selectedTeamNames = selectedTeamIds.map(id => {
    const team = teams.find(t => t.id === id);
    return team?.name || '';
  }).filter(name => name);
  const teamDisplayValue = selectedTeamNames.length > 0 
    ? selectedTeamNames.join(', ') 
    : teamSearch;

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) {
        const companyTeams = await getCompanyTeams(user.company_id);
        const myTeams = companyTeams.filter(
          (team: any) => team.created_by === user.id || (team.members && team.members.some((m: any) => m.user_id === user.id))
        );
        setTeams(myTeams);
        setFilteredTeams(myTeams);
      }
    })();
  }, []);

  useEffect(() => {
    if (!teamSearch) {
      setFilteredTeams(teams);
    } else {
      setFilteredTeams(
        teams.filter((team: any) =>
          team.name.toLowerCase().includes(teamSearch.toLowerCase())
        )
      );
    }
  }, [teamSearch, teams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name || !from || !to) {
      alert('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        name,
        from,
        to,
        startTime,
        endTime,
        location,
        timeZone,
        teamIds: selectedTeamIds
      });
    } catch (error) {
      alert('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '100%' }}>
      <h2 style={{ color: colors.text, fontWeight: 700, fontSize: 28, marginBottom: 24 }}>{mode === 'edit' ? 'Edit Event' : 'Create New Event'}</h2>
      {/* Event Name field */}
      <div style={{ marginBottom: 20, width: '100%', position: 'relative' }}>
        <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Event Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => {
            if (e.target.value.length <= 20) setName(e.target.value);
          }}
          maxLength={20}
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
        {/* Character count, far right */}
        <div style={{ position: 'absolute', right: 12, top: 18, fontSize: 13, color: colors.textSecondary }}>
          {name.length}/20
        </div>
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
      {/* Time Zone field - use GlassTimeZoneDropdown */}
      <div style={{ marginBottom: 20, width: '100%' }}>
        <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Time Zone</label>
        <GlassTimeZoneDropdown value={timeZone} onChange={setTimeZone} colors={colors} isDark={isDark} />
      </div>
      {/* Team Assignment field - styled like GlassTimeZoneDropdown */}
      <div style={{ marginBottom: 20, width: '100%', position: 'relative' }}>
        <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 4, display: 'block' }}>Assign Your Team</label>
        <div style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 6, marginTop: 0 }}>
          If you are not ready to add your team, you can add them later inside of the Create A New Team page.
        </div>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={selectedTeamIds.length > 0 ? teamDisplayValue : teamSearch}
            onChange={e => {
              if (selectedTeamIds.length > 0) {
                setSelectedTeamIds([]);
                setTeamSearch(e.target.value);
                setShowTeamDropdown(!!e.target.value);
              } else {
                setTeamSearch(e.target.value);
                setShowTeamDropdown(!!e.target.value);
              }
            }}
            onFocus={e => { if (teamSearch || selectedTeamIds.length > 0) setShowTeamDropdown(true); }}
            placeholder="Search for a team..."
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
              marginTop: 0,
              transition: 'all 0.2s',
              display: 'block',
            }}
            autoComplete="off"
          />
          {showTeamDropdown && teamSearch && (
            <div
              style={{
                width: '100%',
                maxHeight: 220,
                overflowY: 'auto',
                background: `linear-gradient(to top, ${colors.inputBg} 75%, rgba(0,0,0,0) 100%)`,
                border: `2px solid ${colors.border}`,
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
                color: colors.text,
                marginTop: 4,
                position: 'relative',
                zIndex: 10,
              }}
            >
              {filteredTeams.length === 0 && (
                <div style={{ padding: 16, color: colors.textSecondary, fontSize: 15 }}>No results</div>
              )}
              {filteredTeams.map(team => (
                <div
                  key={team.id}
                  onClick={() => {
                    setSelectedTeamIds(prev => [...prev, team.id]);
                    setTeamSearch('');
                    setShowTeamDropdown(false);
                  }}
                  style={{
                    padding: '12px 20px',
                    cursor: 'pointer',
                    color: colors.text,
                    background: selectedTeamIds.includes(team.id) ? (isDark ? '#444' : '#e5e7eb') : 'transparent',
                    fontWeight: selectedTeamIds.includes(team.id) ? 700 : 400,
                    fontSize: 18,
                    borderRadius: 8,
                    margin: '4px 8px',
                    transition: 'background 0.2s',
                  }}
                  onMouseDown={e => e.preventDefault()}
                >
                  {team.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Date fields */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <CustomDatePicker
          value={from}
          onChange={setFrom}
          placeholder="Select start date"
          isDark={isDark}
          colors={colors}
          required
        />
        <CustomDatePicker
          value={to}
          onChange={setTo}
          placeholder="Select end date"
          isDark={isDark}
          colors={colors}
          required
        />
      </div>
      {/* Time fields */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 20, width: '100%' }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'block' }}>Start Time</label>
          <TimePicker value={startTime} onChange={setStartTime} placeholder="Start time" colors={colors} />
        </div>
        <span style={{ fontSize: 32, color: colors.textSecondary, margin: '0 12px', userSelect: 'none' }}>&#9654;</span>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'block' }}>End Time</label>
          <TimePicker value={endTime} onChange={setEndTime} placeholder="End time" colors={colors} />
        </div>
      </div>
      {/* Submit/Cancel buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: `2px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            fontSize: '18px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: colors.text,
            color: isDark ? '#000' : '#fff',
            fontSize: '18px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (mode === 'edit' ? 'UPDATING...' : 'CREATING...') : (mode === 'edit' ? 'UPDATE' : 'CREATE')}
        </button>
      </div>
    </form>
  );
}