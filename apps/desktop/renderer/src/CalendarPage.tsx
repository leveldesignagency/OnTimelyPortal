import React, { useState, useEffect, useContext, useMemo, FC, FormEvent, Dispatch, SetStateAction } from 'react';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';

// --- Types & Mock Data ---
type CalendarEvent = {
  id: string;
  title: string;
  type: 'Meeting' | 'Call Back' | 'Task' | 'Project' | 'Event';
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  attendees?: string[];
  status: string;
  color: string;
};

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth(); // 0-indexed

const d = (day: number, m = month, y = year) => new Date(y, m, day).toISOString().split('T')[0];

const mockApiEvents: (Omit<CalendarEvent, 'startDate' | 'endDate' | 'attendees'> & { startDate: string, endDate: string, startTime?: string, endTime?: string, attendees?: string[] })[] = [
    // Meetings
    { id: '1', title: 'Team Standup', type: 'Meeting', startDate: d(2), endDate: d(2), startTime: '09:00', endTime: '09:30', attendees: ['team@example.com'] },
    { id: '5', title: 'Client Sync', type: 'Meeting', startDate: d(10), endDate: d(10), startTime: '14:00', endTime: '15:30', attendees: ['client@example.com', 'rushi@example.com'] },
    { id: '11', title: '1-on-1 with Manager', type: 'Meeting', startDate: d(18), endDate: d(18), startTime: '11:00', endTime: '11:30', attendees: ['manager@example.com'] },
    
    // Call Backs
    { id: '2', title: 'Follow up with lead', type: 'Call Back', startDate: d(3), endDate: d(3) },
    { id: '4', title: 'Call back applicant', type: 'Call Back', startDate: d(12), endDate: d(12) },
    { id: '6', title: 'Return call to vendor', type: 'Call Back', startDate: d(20), endDate: d(20) },

    // Projects
    { id: '3', title: 'Quarterly Report', type: 'Project', startDate: d(5), endDate: d(8) },
    { id: '7', title: 'Website Redesign', type: 'Project', startDate: d(15), endDate: d(25) },
    { id: '10', title: 'New Feature Launch', type: 'Project', startDate: d(28), endDate: d(30) },

    // Tasks
    { id: '12', title: 'Prepare presentation slides', type: 'Task', startDate: d(9), endDate: d(9) },
    { id: '13', title: 'Review PRs', type: 'Task', startDate: d(16), endDate: d(16) },
    { id: '14', title: 'Book flight for conference', type: 'Task', startDate: d(22), endDate: d(22) },
    { id: '15', title: 'Submit expense report', type: 'Task', startDate: d(today.getDate()), endDate: d(today.getDate()) }, // A task for today
];

// --- Theming ---
const themes = {
  light: {
    bg: '#f8f9fa', // Light grey background to match today panel
    panelBg: '#f8f9fa',
    calendarBg: 'rgba(255, 255, 255, 0.7)', // Glass effect
    text: '#1a1a1a',
    textSecondary: '#6c757d',
    border: '#e9ecef',
    accent: '#1a1a1a', // Black instead of green
    hoverBg: 'rgba(255, 255, 255, 0.9)', // Slightly lighter for hover
    todayBorder: '#1a1a1a', // Black instead of green
    eventBorder: { Meeting: '#1a1a1a', 'Call Back': '#6c757d', Project: '#1a1a1a', Task: '#1a1a1a' }
  },
  dark: {
    bg: '#1a1a1a', // Dark background
    panelBg: '#2a2a2a',
    calendarBg: 'rgba(42, 42, 42, 0.7)', // Glass effect
    text: '#ffffff',
    textSecondary: '#adb5bd',
    border: '#3a3a3a',
    accent: '#ffffff', // White instead of green
    hoverBg: 'rgba(58, 58, 58, 0.9)', // Slightly lighter for hover
    todayBorder: '#ffffff', // White instead of green
    eventBorder: { Meeting: '#ffffff', 'Call Back': '#adb5bd', Project: '#ffffff', Task: '#ffffff' }
  }
};

type ThemeName = 'light' | 'dark';

// --- Helper Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon
const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

// 1. Add a helper to map event status to color
const statusColorMap = {
  'Upcoming': '#FFD600', // yellow
  'Live': '#4CAF50',    // green
  'Ongoing': '#4CAF50', // green (alias)
  'Past': '#F44336',    // red
  'Cancelled': '#F44336', // red
};

// --- Sub-components ---

interface AddEventModalProps {
    date: Date;
    onClose: () => void;
    onAddEvent: (event: CalendarEvent) => void;
    theme: ThemeName;
}

const CustomSelect: FC<{
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  theme: ThemeName;
}> = ({ options, selected, onSelect, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colors = themes[theme];

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ width: '100%', padding: '12px', background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}
      >
        {selected}
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
      </div>
      {isOpen && (
        <ul style={{ position: 'absolute', width: '100%', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: '6px', listStyle: 'none', padding: 0, margin: '4px 0 0', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
          {options.map(option => (
            <li key={option} onClick={() => handleSelect(option)} style={{ padding: '12px', cursor: 'pointer', fontSize: '14px', borderBottom: `1px solid ${colors.border}` }}>
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AddEventModal: FC<AddEventModalProps> = ({ date, onClose, onAddEvent, theme }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEvent['type']>('Meeting');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [attendees, setAttendees] = useState('');
  const colors = themes[theme];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title) return;
    const newEvent: CalendarEvent = {
        id: `evt_${Date.now()}`,
        title,
        type,
        startDate: date,
        endDate: date,
        startTime,
        endTime,
        attendees: attendees.split(',').map(email => email.trim()).filter(Boolean),
        status: 'Upcoming',
        color: statusColorMap['Upcoming'],
    };
    onAddEvent(newEvent);
    onClose();
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: colors.panelBg, color: colors.text, padding: '24px', borderRadius: '12px', width: '450px' }}>
        <h2 style={{ margin: '0 0 24px' }}>Add New Entry for {date.toLocaleDateString()}</h2>
        <form onSubmit={handleSubmit}>
          
          <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', color: colors.textSecondary}}>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Client Follow-up" style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: '14px' }} />
          
          <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', color: colors.textSecondary}}>Type</label>
          <div style={{marginBottom: '16px'}}>
            <CustomSelect
              options={['Meeting', 'Call Back', 'Project', 'Task']}
              selected={type}
              onSelect={(value) => setType(value as CalendarEvent['type'])}
              theme={theme}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{width: '50%'}}>
              <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', color: colors.textSecondary}}>Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: '14px', colorScheme: theme === 'dark' ? 'dark' : 'light' }} />
            </div>
            <div style={{width: '50%'}}>
              <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', color: colors.textSecondary}}>End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: '14px', colorScheme: theme === 'dark' ? 'dark' : 'light' }} />
            </div>
          </div>

          <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', color: colors.textSecondary}}>Invite Attendees</label>
          <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="john@example.com, jane@example.com" style={{ width: '100%', padding: '12px', marginBottom: '24px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: '14px' }} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: colors.border, color: colors.text, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: colors.accent, color: theme === 'dark' ? '#000' : '#fff', cursor: 'pointer' }}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TodayPanelProps {
    events: CalendarEvent[];
    theme: ThemeName;
    currentDate: Date;
}

const TodayPanel: FC<TodayPanelProps> = ({ events, theme, currentDate }) => {
    const colors = themes[theme];
    const todayStr = toYYYYMMDD(currentDate);
    const todayEvents = events.filter(e => toYYYYMMDD(e.startDate) === todayStr);
    const upcomingEvents = events.filter(e => e.startDate > currentDate).sort((a,b) => a.startDate.getTime() - b.startDate.getTime()).slice(0, 5);

    return (
        <div style={{ width: '280px', padding: '16px', background: colors.panelBg, borderRadius: '8px', marginRight: '20px' }}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>{currentDate.toLocaleString('default', { weekday: 'long' })}</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: colors.text, lineHeight: 1.1 }}>{currentDate.getDate()}</div>
                <div style={{ fontSize: '16px', color: colors.text }}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px', color: colors.text, fontSize: '16px' }}>Today's Events</h3>
                {todayEvents.map(event => (
                    <div key={event.id} style={{ borderLeft: `3px solid ${event.type === 'Event' ? event.color : colors.eventBorder[event.type]}`, background: colors.bg, color: colors.text, padding: '8px 12px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px' }}>
                        <div>{event.title}</div>
                        {event.startTime && <div style={{fontSize: '11px', color: colors.textSecondary}}>{event.startTime} - {event.endTime}</div>}
                    </div>
                ))}
                {todayEvents.length === 0 && <div style={{fontSize: '13px', color: colors.textSecondary}}>No events today.</div>}
            </div>

            <div>
                <h3 style={{ margin: '0 0 12px', color: colors.text, fontSize: '16px' }}>Upcoming</h3>
                {upcomingEvents.map(event => (
                    <div key={event.id} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                         <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: event.type === 'Event' ? event.color : colors.eventBorder[event.type], marginRight: '10px' }}></div>
                         <div>
                            <div style={{ color: colors.text, fontSize: '13px' }}>{event.title}</div>
                            <div style={{ color: colors.textSecondary, fontSize: '11px' }}>{event.startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                         </div>
                    </div>
                ))}
                 {upcomingEvents.length === 0 && <div style={{fontSize: '13px', color: colors.textSecondary}}>No upcoming events.</div>}
            </div>
        </div>
    );
}

interface CalendarPanelProps {
    events: CalendarEvent[];
    theme: ThemeName;
    currentDate: Date;
    setCurrentDate: Dispatch<SetStateAction<Date>>;
    onDayClick: (date: Date, isDoubleClick?: boolean) => void;
    calendarView: 'Week' | 'Month';
    setCalendarView: Dispatch<SetStateAction<'Week' | 'Month'>>;
}

const CalendarPanel: FC<CalendarPanelProps> = ({ events, theme, currentDate, setCurrentDate, onDayClick, calendarView, setCalendarView }) => {
    const colors = themes[theme];
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = (getFirstDayOfMonth(year, month) + 6) % 7; // Monday as first day

    // Helper to get start of week (Monday)
    const getStartOfWeek = (date: Date) => {
      const day = date.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // Monday=1, Sunday=0
      const start = new Date(date);
      start.setDate(date.getDate() + diff);
      start.setHours(0,0,0,0);
      return start;
    };
    // Helper to get all days in week
    const getWeekDays = (date: Date) => {
      const start = getStartOfWeek(date);
      return Array.from({length: 7}, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    };

    // Helper to check if date has events
    const getDateEventInfo = (date: Date) => {
      const dateStr = toYYYYMMDD(date);
      const dayEvents = events.filter(e => toYYYYMMDD(e.startDate) <= dateStr && toYYYYMMDD(e.endDate) >= dateStr);
      return {
        hasEvents: dayEvents.length > 0,
        events: dayEvents
      };
    };

    let calendarDays: JSX.Element[] = [];
    if (calendarView === 'Month') {
      for (let i = 0; i < firstDay; i++) {
        calendarDays.push(
          <div key={`empty-${i}`} style={{ 
            background: 'transparent',
            borderRadius: '8px',
            margin: '1px'
          }} />
        );
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const eventInfo = getDateEventInfo(date);
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = date.toDateString() === currentDate.toDateString();
        
        calendarDays.push(
          <div 
            key={day} 
            onClick={() => onDayClick(date)} 
            onDoubleClick={() => onDayClick(date, true)}
            style={{ 
              position: 'relative',
              padding: '12px 8px',
              margin: '1px',
              minHeight: '80px',
              cursor: 'pointer',
              borderRadius: '8px',
              border: isToday ? `2px solid ${colors.todayBorder}` : isSelected ? `2px solid ${colors.accent}` : 'none',
              background: isSelected ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = colors.hoverBg;
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* Day number */}
            <div style={{
              fontSize: '16px',
              fontWeight: isToday ? '700' : isSelected ? '600' : '500',
              color: isToday ? colors.todayBorder : isSelected ? colors.accent : colors.text,
              marginBottom: '4px'
            }}>
              {day}
            </div>
            
            {/* Simple event indicators - just small dots */}
            {eventInfo.hasEvents && (
              <div style={{
                display: 'flex',
                gap: '2px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {eventInfo.events.slice(0, 3).map((event, idx) => (
                  <div 
                    key={event.id} 
                    style={{ 
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: colors.textSecondary,
                      opacity: 0.8
                    }}
                  />
                ))}
                {eventInfo.events.length > 3 && (
                  <div style={{ 
                    fontSize: '8px', 
                    color: colors.textSecondary,
                    marginLeft: '2px'
                  }}>
                    +{eventInfo.events.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
    } else {
      // Week view
      const weekDays = getWeekDays(currentDate);
      calendarDays = weekDays.map((date, idx) => {
        const eventInfo = getDateEventInfo(date);
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = date.toDateString() === currentDate.toDateString();
        
        return (
          <div 
            key={toYYYYMMDD(date)} 
            onClick={() => onDayClick(date)} 
            onDoubleClick={() => onDayClick(date, true)}
            style={{ 
              position: 'relative',
              padding: '12px 8px',
              margin: '1px',
              minHeight: '100px',
              cursor: 'pointer',
              borderRadius: '8px',
              border: isToday ? `2px solid ${colors.todayBorder}` : isSelected ? `2px solid ${colors.accent}` : 'none',
              background: isSelected ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = colors.hoverBg;
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* Day number */}
            <div style={{
              fontSize: '16px',
              fontWeight: isToday ? '700' : isSelected ? '600' : '500',
              color: isToday ? colors.todayBorder : isSelected ? colors.accent : colors.text,
              marginBottom: '4px'
            }}>
              {date.getDate()}
            </div>
            
            {/* Simple event indicators */}
            {eventInfo.hasEvents && (
              <div style={{
                display: 'flex',
                gap: '2px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {eventInfo.events.slice(0, 4).map((event, idx) => (
                  <div 
                    key={event.id} 
                    style={{ 
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: colors.textSecondary,
                      opacity: 0.8
                    }}
                  />
                ))}
                {eventInfo.events.length > 4 && (
                  <div style={{ 
                    fontSize: '8px', 
                    color: colors.textSecondary,
                    marginLeft: '2px'
                  }}>
                    +{eventInfo.events.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });
    }

    const viewButtonStyle = (view: 'Week' | 'Month') => ({
      padding: '8px 16px',
      background: calendarView === view ? colors.accent : 'transparent',
      border: `1px solid ${colors.accent}`,
      color: calendarView === view ? (theme === 'dark' ? '#000' : '#fff') : colors.accent,
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '14px',
      borderRadius: view === 'Week' ? '6px 0 0 6px' : '0 6px 6px 0',
      outline: 'none',
      transition: 'all 0.2s ease',
      minWidth: 70,
    });

    // Navigation logic
    const handlePrev = () => {
      if (calendarView === 'Month') {
        setCurrentDate(new Date(year, month - 1, 1));
      } else {
        const prevWeek = new Date(currentDate);
        prevWeek.setDate(currentDate.getDate() - 7);
        setCurrentDate(prevWeek);
      }
    };
    const handleNext = () => {
      if (calendarView === 'Month') {
        setCurrentDate(new Date(year, month + 1, 1));
      } else {
        const nextWeek = new Date(currentDate);
        nextWeek.setDate(currentDate.getDate() + 7);
        setCurrentDate(nextWeek);
      }
    };

    // Centered, fixed-width date display
    const dateLabel = calendarView === 'Month'
      ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      : (() => {
          const weekDays = getWeekDays(currentDate);
          const start = weekDays[0];
          const end = weekDays[6];
          const sameMonth = start.getMonth() === end.getMonth();
          return sameMonth
            ? `${start.toLocaleString('default', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`
            : `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()} - ${end.toLocaleString('default', { month: 'short' })} ${end.getDate()}, ${end.getFullYear()}`;
        })();

    return (
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Glass Calendar Card */}
        <div style={{
          background: colors.calendarBg,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          padding: '20px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxShadow: theme === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {/* Calendar Grid Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
          }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ 
                textAlign: 'center', 
                padding: '8px 0', 
                fontSize: '12px', 
                color: colors.textSecondary,
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            flex: 1
          }}>
            {calendarDays}
          </div>
        </div>
        
        {/* Controls bottom right */}
        <div style={{ 
          position: 'absolute', 
          bottom: 20, 
          right: 20, 
          zIndex: 10, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 16,
          background: theme === 'dark' ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
          padding: '8px',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: theme === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden' }}>
            <button style={viewButtonStyle('Week')} onClick={() => setCalendarView('Week')}>
              Week
            </button>
            <button style={viewButtonStyle('Month')} onClick={() => setCalendarView('Month')}>
              Month
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 280 }}>
            <button
              onClick={handlePrev}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                color: colors.text,
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: colors.text, 
              textAlign: 'center',
              flex: 1,
              letterSpacing: '0.5px'
            }}>
              {dateLabel}
            </span>
            
            <button
              onClick={handleNext}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                color: colors.text,
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
};

// --- Main Page Component ---
export default function CalendarPage() {
  const { theme } = useContext(ThemeContext);
  const colors = themes[theme as ThemeName];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState('Calendar');
  const [calendarView, setCalendarView] = useState<'Week' | 'Month'>('Month');

  const filterButtons = [
    { label: 'Calendar', value: 'Calendar' },
    { label: 'Meetings', value: 'Meeting' },
    { label: 'Call Back', value: 'Call Back' },
    { label: 'Task', value: 'Task' },
    { label: 'Projects', value: 'Project' },
  ];

  // 2. Load events from localStorage and merge with user entries
  useEffect(() => {
    // Load user-created events from localStorage
    const timelyEvents = JSON.parse(localStorage.getItem('timely_events') || '[]');
    const calendarEvents = timelyEvents.map(e => ({
      id: e.id,
      title: e.name,
      type: 'Event',
      startDate: new Date(e.from + 'T00:00:00'),
      endDate: new Date(e.to + 'T00:00:00'),
      status: e.status,
      color: statusColorMap[e.status] || '#FFD600',
    }));
    // Load mock/user entries as before
    const parsedEvents = mockApiEvents.map(e => ({
      ...e,
      startDate: new Date(e.startDate + 'T00:00:00'),
      endDate: new Date(e.endDate + 'T00:00:00'),
    }));
    setEvents([...calendarEvents, ...parsedEvents]);
  }, []);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'Calendar') return events;
    return events.filter(event => event.type === activeFilter);
  }, [events, activeFilter]);

  const handleDayClick = (date: Date, isDoubleClick = false) => {
    if (isDoubleClick) {
      // Double click - open modal
      setModalDate(date);
      setIsModalOpen(true);
    } else {
      // Single click - select date
      setSelectedDate(date);
      setCurrentDate(date);
    }
  };

  const handleAddEvent = (newEvent: CalendarEvent) => {
    setEvents(prev => [...prev, newEvent]);
  }

  const headerButtonStyle = (filter: string) => ({
    padding: '8px 16px',
    fontSize: '14px',
    border: `1px solid ${activeFilter === filter ? colors.accent : 'transparent'}`,
    borderRadius: '6px',
    marginLeft: '12px',
    background: activeFilter === filter ? colors.accent : 'transparent',
    color: activeFilter === filter ? (theme === 'dark' ? '#000' : '#fff') : colors.text,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: activeFilter === filter ? '600' : '500'
  });

  return (
    <div style={{ 
      background: colors.bg, 
      color: colors.text, 
      padding: '20px', 
      height: '100%', 
      transition: 'background 0.2s, color 0.2s', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
          <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0, marginRight: '24px' }}>Scheduling</h1>
          {filterButtons.map(item => (
              <button key={item.label} onClick={() => setActiveFilter(item.value)} style={headerButtonStyle(item.value)}>{item.label}</button>
          ))}
          <button 
            onClick={() => handleDayClick(new Date())} 
            style={{ 
                padding: '10px 20px', 
                fontSize: '14px', 
                borderRadius: '6px', 
                border: 'none', 
                background: colors.accent, 
                color: theme === 'dark' ? '#000' : '#fff', 
                cursor: 'pointer', 
                fontWeight: '600',
                marginLeft: 'auto',
                transition: 'transform 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            + Add New
          </button>
      </div>
      
      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '20px' }}>
          <TodayPanel events={filteredEvents} theme={theme as ThemeName} currentDate={currentDate} />
          <CalendarPanel events={filteredEvents} theme={theme as ThemeName} currentDate={selectedDate || currentDate} setCurrentDate={setCurrentDate} onDayClick={handleDayClick} calendarView={calendarView} setCalendarView={setCalendarView} />
      </div>

      {isModalOpen && modalDate && <AddEventModal date={modalDate} onClose={() => setIsModalOpen(false)} onAddEvent={handleAddEvent} theme={theme as ThemeName} />}
    </div>
  );
}