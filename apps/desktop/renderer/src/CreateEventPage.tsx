import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, insertActivityLog } from './lib/supabase';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';
import { getCurrentUser } from './lib/auth';
import { getCompanyTeams } from './lib/chat';

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
  isDark: boolean;
}

function GlassTimeZoneDropdown({ value, onChange, colors, isDark }: GlassTimeZoneDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const filtered = timeZoneOptions.filter(opt =>
    opt.label.toLowerCase().includes(filter.toLowerCase())
  );
  // Find the selected label
  const selectedLabel = timeZoneOptions.find(opt => opt.value === value)?.label || '';
  // Display value: show filter if typing, else show selected label
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
  const [teams, setTeams] = useState<any[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get selected team names for display
  const selectedTeamNames = selectedTeamIds.map(id => {
    const team = teams.find(t => t.id === id);
    return team?.name || '';
  }).filter(name => name);

  // Display value for team input
  const teamDisplayValue = selectedTeamNames.length > 0 
    ? selectedTeamNames.join(', ') 
    : teamSearch;

  React.useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        const companyTeams = await getCompanyTeams(user.company_id);
        // Only show teams where user is a member or creator
        const myTeams = companyTeams.filter(
          (team: any) => team.created_by === user.id || (team.members && team.members.some((m: any) => m.user_id === user.id))
        );
        setTeams(myTeams);
        setFilteredTeams(myTeams);
      }
    })();
  }, []);

  React.useEffect(() => {
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
      const currentUser = await getCurrentUser();
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
      const user = await getCurrentUser();
      await insertActivityLog({
        company_id: newEvent.company_id || '',
        user_id: user?.id || '',
        action_type: 'event_created',
        event_id: newEvent.id || '',
        details: {
          event_title: newEvent.name || '',
        },
      });
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      padding: '60px 20px 40px 20px', // more top padding
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '800px',
        ...glassStyle,
        padding: '40px',
        position: 'relative',
        boxShadow: isDark 
          ? 'inset 0 2px 8px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' 
          : 'inset 0 2px 8px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.1)',
      }}>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <h2 style={{ color: colors.text, fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Create New Event</h2>
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
          {/* Time Zone field - match location field UI */}
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
            {/* --- Assign Your Team Dropdown --- */}
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
                    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.30)' : '0 8px 32px rgba(0,0,0,0.08)',
                    color: colors.text,
                    marginTop: 4,
                    position: 'relative',
                    zIndex: 10,
                  }}
                >
                  {filteredTeams.length === 0 && (
                    <div style={{ padding: 16, color: colors.textSecondary, fontSize: 15 }}>No teams found</div>
                  )}
                  {filteredTeams.map(team => (
                    <div
                      key={team.id}
                      onClick={() => {
                        if (!selectedTeamIds.includes(team.id)) {
                          setSelectedTeamIds([team.id]);
                        }
                        setShowTeamDropdown(false);
                        setTeamSearch('');
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
          {/* DATES/DURATION label - white, no asterisk */}
          <label style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'block', marginTop: 12, alignSelf: 'flex-start' }} htmlFor="event-from">DATES/DURATION</label>
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