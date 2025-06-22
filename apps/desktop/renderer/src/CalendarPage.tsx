import React, { useState, useEffect, useContext, useMemo, FC, FormEvent, Dispatch, SetStateAction } from 'react';
import { ThemeContext } from './ThemeContext';

// --- Types & Mock Data ---
type CalendarEvent = {
  id: string;
  title: string;
  type: 'Meeting' | 'Call Back' | 'Task' | 'Project';
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  attendees?: string[];
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
    bg: '#ffffff',
    panelBg: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#e9ecef',
    accent: '#212529', // Black
    eventBorder: { Meeting: '#212529', 'Call Back': '#6c757d', Project: '#adb5bd', Task: '#dee2e6' }
  },
  dark: {
    bg: '#1a1a1a',
    panelBg: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#adb5bd',
    border: '#3a3a3a',
    accent: '#ffffff', // White
    eventBorder: { Meeting: '#ffffff', 'Call Back': '#adb5bd', Project: '#888888', Task: '#555555' }
  }
};

type ThemeName = 'light' | 'dark';

// --- Helper Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon
const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

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
                    <div key={event.id} style={{ borderLeft: `3px solid ${colors.eventBorder[event.type]}`, background: colors.bg, color: colors.text, padding: '8px 12px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px' }}>
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
                         <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.eventBorder[event.type], marginRight: '10px' }}></div>
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
    onDayClick: (date: Date) => void;
    calendarView: 'Week' | 'Month';
    setCalendarView: Dispatch<SetStateAction<'Week' | 'Month'>>;
}

const CalendarPanel: FC<CalendarPanelProps> = ({ events, theme, currentDate, setCurrentDate, onDayClick, calendarView, setCalendarView }) => {
    const colors = themes[theme];
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = (getFirstDayOfMonth(year, month) + 6) % 7; // Adjust to make Monday the first day
    
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(<div key={`empty-${i}`} style={{ background: theme === 'dark' ? 'rgba(0,0,0,0.1)' : '#f8f9fa' }} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = toYYYYMMDD(date);
        const dayEvents = events.filter(e => toYYYYMMDD(e.startDate) <= dateStr && toYYYYMMDD(e.endDate) >= dateStr);
        
        calendarDays.push(
            <div key={day} onClick={() => onDayClick(date)} style={{ padding: '4px', border: `1px solid ${colors.border}`, minHeight: '100px', cursor: 'pointer' }}>
                <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{day}</span>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {dayEvents.slice(0, 2).map(event => (
                        <div key={event.id} style={{ borderLeft: `2px solid ${colors.eventBorder[event.type]}`, background: colors.panelBg, color: colors.text, padding: '2px 4px', borderRadius: '2px', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {event.title}
                        </div>
                    ))}
                    {dayEvents.length > 2 && (
                         <div style={{ fontSize: '10px', color: colors.textSecondary }}>+{dayEvents.length - 2} More</div>
                    )}
                </div>
            </div>
        );
    }
    
    const viewButtonStyle = (view: 'Week' | 'Month') => ({
      padding: '6px 12px',
      background: calendarView === view ? colors.accent : 'none',
      border: `1px solid ${colors.border}`,
      color: calendarView === view ? (theme === 'dark' ? '#000' : '#fff') : colors.text,
      cursor: 'pointer',
    });

    return (
        <div style={{ flex: 1 }}>
            {/* Calendar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <button style={{...viewButtonStyle('Week'), borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px'}} onClick={() => setCalendarView('Week')}>Week</button>
                  <button style={{...viewButtonStyle('Month'), borderTopRightRadius: '6px', borderBottomRightRadius: '6px', borderLeft: 'none'}} onClick={() => setCalendarView('Month')}>Month</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '20px', cursor: 'pointer' }}>{'<'}</button>
                    <span style={{ fontSize: '18px', margin: '0 12px', color: colors.text }}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '20px', cursor: 'pointer' }}>{'>'}</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>{day}</div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: `1px solid ${colors.border}`, borderLeft: `1px solid ${colors.border}` }}>
                {calendarDays}
            </div>
        </div>
    );
};

// --- Main Page Component ---
export default function CalendarPage() {
  const { theme } = useContext(ThemeContext);
  const colors = themes[theme as ThemeName];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState('Calendar');
  const [calendarView, setCalendarView] = useState<'Week' | 'Month'>('Month');

  const filterButtons = [
    { label: 'Calendar', value: 'Calendar' },
    { label: 'Meetings', value: 'Meeting' },
    { label: 'Call Back', value: 'Call Back' },
    { label: 'Task', value: 'Task' },
    { label: 'Projects', value: 'Project' },
  ];

  useEffect(() => {
    const parsedEvents = mockApiEvents.map(e => ({
        ...e,
        startDate: new Date(e.startDate + 'T00:00:00'),
        endDate: new Date(e.endDate + 'T00:00:00'),
    }));
    setEvents(parsedEvents);
  }, []);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'Calendar') return events;
    return events.filter(event => event.type === activeFilter);
  }, [events, activeFilter]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleAddEvent = (newEvent: CalendarEvent) => {
    setEvents(prev => [...prev, newEvent]);
  }

  const headerButtonStyle = (filter: string) => ({
    padding: '6px 10px',
    fontSize: '13px',
    border: `1px solid ${activeFilter === filter ? colors.border : 'transparent'}`,
    borderRadius: '6px',
    marginLeft: '12px',
    background: activeFilter === filter ? colors.panelBg : 'none',
    color: colors.text,
    cursor: 'pointer'
  });

  return (
    <div style={{ background: colors.bg, color: colors.text, padding: '20px', height: '100%', transition: 'background 0.2s, color 0.2s', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, marginRight: '24px' }}>Scheduling</h1>
          {filterButtons.map(item => (
              <button key={item.label} onClick={() => setActiveFilter(item.value)} style={headerButtonStyle(item.value)}>{item.label}</button>
          ))}
          <button 
            onClick={() => handleDayClick(new Date())} 
            style={{ 
                padding: '8px 16px', 
                fontSize: '14px', 
                borderRadius: '6px', 
                border: 'none', 
                background: colors.accent, 
                color: theme === 'dark' ? '#000' : '#fff', 
                cursor: 'pointer', 
                fontWeight: 500,
                marginLeft: 'auto'
            }}>
            + Add New
          </button>
      </div>
      
      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <TodayPanel events={filteredEvents} theme={theme as ThemeName} currentDate={currentDate} />
          <CalendarPanel events={filteredEvents} theme={theme as ThemeName} currentDate={currentDate} setCurrentDate={setCurrentDate} onDayClick={handleDayClick} calendarView={calendarView} setCalendarView={setCalendarView} />
      </div>

      {isModalOpen && selectedDate && <AddEventModal date={selectedDate} onClose={() => setIsModalOpen(false)} onAddEvent={handleAddEvent} theme={theme as ThemeName} />}
    </div>
  );
} 