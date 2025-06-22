import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CreateEventPage from './CreateEventPage';
import EventDashboardPage from './EventDashboardPage';
import Dashboard from './Dashboard';
import Sidebar from './Sidebar';
import CreateItinerary from './CreateItinerary';
import CreateGuests from './CreateGuests';
import { ModulesPage } from './pages/ModulesPage';
import GuestFormPage from './GuestFormPage';
import TeamsLayout from './TeamsLayout';
import TeamChatPage from './TeamChatPage';
import CalendarPage from './CalendarPage';
import CanvasPage from './CanvasPage';
import CreateTeamFlowPage from './CreateTeamFlowPage';
import { ThemeProvider } from './ThemeContext';
import { EventType } from './types';

// Remove fs and path, use localStorage for persistence

function loadEventsFromStorage(): EventType[] {
  try {
    const data = localStorage.getItem('timely_events');
    if (data) return JSON.parse(data);
  } catch (e) {
    // ignore
  }
  return [];
}

function saveEventsToStorage(events: EventType[]) {
  try {
    localStorage.setItem('timely_events', JSON.stringify(events));
  } catch (e) {
    // ignore
  }
}

const AppContent = () => {
  const [events, setEvents] = React.useState<EventType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const location = useLocation();

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const isTeamsPage = location.pathname.startsWith('/teams');

  // Global styles useEffect must be before any early returns
  React.useEffect(() => {
    // Add Google Fonts Roboto
    if (!document.getElementById('roboto-font')) {
      const link = document.createElement('link');
      link.id = 'roboto-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap';
      document.head.appendChild(link);
    }
    const style = document.createElement('style');
    style.innerHTML = `
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        font-family: 'Roboto', Arial, system-ui, sans-serif !important;
        font-weight: 400;
        background: #f7f8fa;
        color: #222;
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: inherit;
        font-family: inherit !important;
        font-weight: 400 !important;
      }
      h1, h2, h3, h4, h5, h6, strong, b {
        font-weight: 400 !important;
        font-family: inherit !important;
      }
      button, input, select, textarea {
        font-family: inherit !important;
        font-weight: 400 !important;
        border-radius: 8px;
        border: 1.5px solid #d1d5db;
        outline: none;
        transition: border 0.2s, box-shadow 0.2s;
      }
      button {
        background: #222;
        color: #fff;
        padding: 16px 0;
        font-size: 20px;
        cursor: pointer;
        border: none;
        border-radius: 8px;
        margin: 0;
        box-shadow: 0 2px 8px #0001;
        transition: background 0.2s, color 0.2s;
        width: 100%;
        letter-spacing: 1px;
      }
      button:hover {
        background: #444;
        color: #fff;
      }
      input[type="date"], input[type="text"], input[type="email"] {
        background: #fff;
        color: #222;
        padding: 18px 20px;
        font-size: 22px;
        border: 1.5px solid #d1d5db;
        margin-bottom: 28px;
        width: 100%;
        box-shadow: 0 1px 4px #0001;
      }
      input[type="date"]::-webkit-input-placeholder, input[type="text"]::-webkit-input-placeholder {
        color: #bbb;
        opacity: 1;
      }
      input[type="date"]:focus, input[type="text"]:focus {
        border: 1.5px solid #888;
        box-shadow: 0 2px 8px #0002;
      }
      label {
        font-size: 17px;
        color: #666;
        margin-bottom: 10px;
        display: block;
      }
      .modern-container {
        max-width: 600px;
        margin: 60px auto 0 auto;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 4px 32px #0002;
        padding: 48px 40px 64px 40px;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .modern-container form > * {
        width: 100%;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Load from localStorage on mount
  React.useEffect(() => {
    setEvents(loadEventsFromStorage());
    setLoading(false);
    // On teams pages, the sidebar should be closed by default.
    if (isTeamsPage) {
      setSidebarOpen(false);
    }
  }, [isTeamsPage]);

  // Save to localStorage on change
  React.useEffect(() => {
    if (!loading) {
      saveEventsToStorage(events);
    }
  }, [events, loading]);

  if (loading) {
    return <div style={{ padding: 64, fontFamily: 'Roboto, Arial, system-ui, sans-serif' }}>Loading events...</div>;
  }
  if (error) {
    return <div style={{ padding: 64, color: 'red', fontFamily: 'Roboto, Arial, system-ui, sans-serif' }}>{error}</div>;
  }

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    padding: 0,
    minHeight: '100vh',
    background: 'none',
    transition: 'margin-left 0.3s ease',
    marginLeft: isTeamsPage ? '50px' : '0',
  }

  return (
    <div style={{ display: 'flex', position: 'relative' }}>
      <Sidebar 
        events={events} 
        isOverlay={isTeamsPage} 
        isOpen={isSidebarOpen} 
        setOpen={setSidebarOpen} 
      />
      <main style={mainContentStyle}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-event" element={<CreateEventPage onCreate={event => setEvents(prev => { const next = [...prev, event]; saveEventsToStorage(next); return next; })} />} />
          <Route path="/event/:id" element={<EventDashboardPage events={events} />} />
          <Route path="/event/:id/add-guests" element={<CreateGuests />} />
          <Route path="/event/:eventId/guests/edit/:guestIndex" element={<CreateGuests />} />
          <Route path="/event/:eventId/itinerary/create" element={<CreateItinerary />} />
          <Route path="/event/:eventId/itinerary/edit/:itineraryIndex" element={<CreateItinerary />} />
          <Route path="/event/:eventId/modules" element={<ModulesPage />} />
          <Route path="/teams" element={<TeamsLayout />}>
            <Route index element={<Navigate to="chat" replace />} />
            <Route path="chat" element={<TeamChatPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="canvas" element={<CanvasPage />} />
          </Route>
          <Route path="/teams/create" element={<CreateTeamFlowPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* The form fill page should not have the main layout */}
          <Route path="/form/fill/:eventId" element={<GuestFormPage />} />
          
          {/* All other routes go through AppContent to have the sidebar */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
} 