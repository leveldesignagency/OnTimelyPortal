import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, insertActivityLog, assignTeamToEvent } from './lib/supabase';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';
import { CustomDatePicker as SharedDatePicker, CustomTimePicker as SharedTimePicker } from './components/CustomPickers';
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
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.30)' : '0 8px 32px rgba(0,0,0,0.08)',
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

// Settings-style dropdown (matches SettingsPage look & feel)
function SettingsStyleDropdown({
  value,
  onChange,
  options,
  placeholder,
  isDark,
  colors,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  isDark: boolean;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value)?.label || '';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: '12px',
          border: `2px solid ${colors.border}`,
          background: colors.inputBg,
          color: selected ? colors.text : colors.textSecondary,
          fontSize: '20px',
          minHeight: '56px',
          boxSizing: 'border-box',
          marginTop: 4,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <span>{selected || placeholder}</span>
        <span style={{ opacity: 0.6 }}>▼</span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: isDark ? '#2a2a2a' : '#ffffff',
            border: `2px solid ${colors.border}`,
            borderRadius: '12px',
            marginTop: 4,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.30)'
              : '0 8px 32px rgba(0,0,0,0.08)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                color: colors.text,
                fontSize: 18,
                borderBottom: `1px solid ${colors.border}`,
                background: opt.value === value ? (isDark ? '#3a3a3a' : '#f3f4f6') : 'transparent',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#3a3a3a' : '#f0f0f0')}
              onMouseLeave={e => (e.currentTarget.style.background = opt.value === value ? (isDark ? '#3a3a3a' : '#f3f4f6') : 'transparent')}
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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
      if (!currentUser || !currentUser.id) {
        alert('No authenticated user found. Please log in again.');
        setLoading(false);
        return;
      }
      console.log('Creating event with user:', currentUser);
      const eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'> = {
        name,
        from,
        to,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        status: 'Upcoming',
        description: description || undefined,
        location: location || undefined,
        company_id: currentUser.company_id,
        created_by: currentUser.id,
        time_zone: timeZone,
      };
      const newEvent = await onCreate(eventData);
      
      // Assign selected teams to the event
      if (selectedTeamIds.length > 0) {
        try {
          for (const teamId of selectedTeamIds) {
            await assignTeamToEvent(teamId, newEvent.id, currentUser.id);
          }
          console.log(`Successfully assigned ${selectedTeamIds.length} team(s) to event`);
        } catch (error) {
          console.error('Error assigning teams to event:', error);
          // Don't fail the event creation, just log the error
        }
      }
      
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
      background: isDark
        ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
        : colors.bg,
      padding: '40px 16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
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
                paddingRight: '64px',
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
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: colors.textSecondary, pointerEvents: 'none' }}>
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
          {/* Time Zone + Assign Team in one row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%', marginBottom: 20 }}>
            <div>
              <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Time Zone</label>
              <SettingsStyleDropdown
                value={timeZone}
                onChange={setTimeZone}
                options={timeZoneOptions}
                placeholder="Select time zone"
                isDark={isDark}
                colors={colors}
              />
            </div>
            <div style={{ width: '100%', position: 'relative' }}>
              <label style={{ color: colors.text, fontWeight: 600, fontSize: 16, marginBottom: 4, display: 'block' }}>Assign Your Team</label>
              {/* --- Assign Your Team Dropdown --- */}
              <div style={{ position: 'relative', width: '100%', marginBottom: 4 }}>
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
              <div style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>
                You can also assign a team in the{' '}
                <a
                  href="/teams/create"
                  onClick={(e) => { e.preventDefault(); navigate('/teams/create'); }}
                  style={{ color: isDark ? '#10b981' : '#0f766e', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Create a Team
                </a>{' '}section.
              </div>
            </div>
          </div>
          {/* DATES/DURATION label - white, no asterisk */}
          <label style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 8, display: 'block', marginTop: 12, alignSelf: 'flex-start' }} htmlFor="event-from">DATES/DURATION</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, width: '100%' }}>
          <SharedDatePicker
            value={from}
            onChange={setFrom}
            placeholder="Start date (dd/mm/yyyy)"
            required
          />
          <SharedDatePicker
            value={to}
            onChange={setTo}
            placeholder="End date (dd/mm/yyyy)"
            required
          />
        </div>
        
        {/* Time Fields */}
        <div style={{ marginBottom: 40 }}>
          <label style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 12, display: 'block' }}>
            EVENT TIMES
          </label>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* Start Time */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6, display: 'block' }}>
                Start Time
              </label>
              <SharedTimePicker value={startTime} onChange={setStartTime} placeholder="--:--" />
            </div>
            
            {/* End Time */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6, display: 'block' }}>
                End Time
              </label>
              <SharedTimePicker value={endTime} onChange={setEndTime} placeholder="--:--" />
            </div>
          </div>
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