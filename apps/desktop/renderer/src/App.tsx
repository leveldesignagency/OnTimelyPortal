import React, { useState, useContext } from 'react';
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
import CreateTeamPage from './CreateTeamPage';
import CalendarPage from './CalendarPage';
import CanvasPage from './CanvasPage';
import RealtimeTestPage from './pages/realtime-test';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider, ThemeContext } from './ThemeContext';
import { getCurrentUser } from './lib/auth';
import { getEvents, createEvent, Event } from './lib/supabase';
import LinkItinerariesPage from './pages/LinkItinerariesPage';
import AssignOverviewPage from './pages/AssignOverviewPage';
import EventPortalManagementPage from './pages/EventPortalManagementPage';

// Update EventType to match Supabase Event type
export type EventType = Event;

const AppContent = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [events, setEvents] = React.useState<EventType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const location = useLocation();

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const isTeamsPage = location.pathname.startsWith('/teams');
  const isLoginPage = location.pathname === '/login';

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

    // Remove existing theme styles
    const existingStyle = document.getElementById('app-theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'app-theme-styles';
    style.innerHTML = `
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        font-family: 'Roboto', Arial, system-ui, sans-serif !important;
        font-weight: 400;
        background: ${isDark ? '#121212' : '#f7f8fa'};
        color: ${isDark ? '#ffffff' : '#222'};
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
        border: 1.5px solid ${isDark ? '#444' : '#d1d5db'};
        outline: none;
        transition: border 0.2s, box-shadow 0.2s;
      }
      button {
        background: ${isDark ? '#ffffff' : '#222'};
        color: ${isDark ? '#000000' : '#fff'};
        padding: 16px 0;
        font-size: 20px;
        cursor: pointer;
        border: none;
        border-radius: 8px;
        margin: 0;
        box-shadow: 0 2px 8px ${isDark ? 'rgba(255,255,255,0.1)' : '#0001'};
        transition: background 0.2s, color 0.2s;
        width: 100%;
        letter-spacing: 1px;
      }
      button:hover {
        background: ${isDark ? '#f0f0f0' : '#444'};
        color: ${isDark ? '#000000' : '#fff'};
      }
      input[type="date"], input[type="text"], input[type="email"] {
        background: ${isDark ? '#2a2a2a' : '#fff'};
        color: ${isDark ? '#ffffff' : '#222'};
        padding: 18px 20px;
        font-size: 22px;
        border: 1.5px solid ${isDark ? '#444' : '#d1d5db'};
        margin-bottom: 28px;
        width: 100%;
        box-shadow: 0 1px 4px ${isDark ? 'rgba(255,255,255,0.1)' : '#0001'};
      }
      input[type="date"]::-webkit-input-placeholder, input[type="text"]::-webkit-input-placeholder {
        color: ${isDark ? '#888' : '#bbb'};
        opacity: 1;
      }
      input[type="date"]:focus, input[type="text"]:focus {
        border: 1.5px solid ${isDark ? '#666' : '#888'};
        box-shadow: 0 2px 8px ${isDark ? 'rgba(255,255,255,0.2)' : '#0002'};
      }
      label {
        font-size: 17px;
        color: ${isDark ? '#ccc' : '#666'};
        margin-bottom: 10px;
        display: block;
      }
      .modern-container {
        max-width: 600px;
        margin: 60px auto 0 auto;
        background: ${isDark ? '#1a1a1a' : '#fff'};
        border-radius: 16px;
        box-shadow: 0 4px 32px ${isDark ? 'rgba(0,0,0,0.5)' : '#0002'};
        padding: 48px 40px 64px 40px;
        display: flex;
        flex-direction: column;
        gap: 0;
        border: 1px solid ${isDark ? '#333' : 'transparent'};
      }
      .modern-container form > * {
        width: 100%;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    return () => { 
      const styleToRemove = document.getElementById('app-theme-styles');
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [isDark]);

  // Load events from Supabase on mount
  React.useEffect(() => {
    const loadEvents = async () => {
      try {
        const user = getCurrentUser();
        if (user && !isLoginPage) {
          const supabaseEvents = await getEvents(user.company_id);
          setEvents(supabaseEvents || []);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to load events:', error);
        setError('Failed to load events');
        setLoading(false);
      }
    };

    loadEvents();

    // On teams pages, the sidebar should be closed by default.
    if (isTeamsPage) {
      setSidebarOpen(false);
    }
  }, [isTeamsPage, isLoginPage]);

  // Event creation handler
  const handleCreateEvent = async (eventData: Omit<EventType, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const newEvent = await createEvent({
        ...eventData,
        company_id: user.company_id,
        created_by: user.id
      });

      setEvents(prev => [newEvent, ...prev]);
      return newEvent;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  };

  if (loading) {
    return <div style={{ padding: 64, fontFamily: 'Roboto, Arial, system-ui, sans-serif', color: isDark ? '#fff' : '#222' }}>Loading events...</div>;
  }
  if (error) {
    return <div style={{ padding: 64, color: isDark ? '#ff6b6b' : 'red', fontFamily: 'Roboto, Arial, system-ui, sans-serif' }}>{error}</div>;
  }

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    padding: 0,
    minHeight: '100vh',
    background: 'none',
    transition: 'margin-left 0.3s ease',
    marginLeft: (isTeamsPage && !isLoginPage) ? '50px' : '0',
    height: '100vh',
    overflowY: 'auto',
  }

  return (
    <div style={{ display: 'flex', position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {!isLoginPage && (
        <Sidebar 
          events={events} 
          isOverlay={isTeamsPage} 
          isOpen={isSidebarOpen} 
          setOpen={setSidebarOpen} 
        />
      )}
      <main style={mainContentStyle}>
        <Routes>
          {/* Public route - Login */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create-event" element={<ProtectedRoute><CreateEventPage onCreate={handleCreateEvent} /></ProtectedRoute>} />
          <Route path="/event/:id" element={<ProtectedRoute><EventDashboardPage events={events} /></ProtectedRoute>} />
          <Route path="/event/:id/add-guests" element={<ProtectedRoute><CreateGuests /></ProtectedRoute>} />
          <Route path="/event/:eventId/guests/edit/:guestIndex" element={<ProtectedRoute><CreateGuests /></ProtectedRoute>} />
          <Route path="/event/:eventId/itinerary/create" element={<ProtectedRoute><CreateItinerary /></ProtectedRoute>} />
          <Route path="/event/:eventId/itinerary/edit/:itineraryId" element={<ProtectedRoute><CreateItinerary /></ProtectedRoute>} />
          <Route path="/event/:eventId/modules" element={<ProtectedRoute><ModulesPage /></ProtectedRoute>} />
          <Route path="/realtime-test" element={<ProtectedRoute><RealtimeTestPage /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><TeamsLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="chat" replace />} />
            <Route path="chat" element={<TeamChatPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="canvas" element={<CanvasPage />} />
            <Route path="create" element={<CreateTeamPage />} />
          </Route>
          <Route path="/guest-form/:eventId" element={<ProtectedRoute><GuestFormPage /></ProtectedRoute>} />
          <Route path="/guest-form/:eventId/edit/:guestIndex" element={<ProtectedRoute><GuestFormPage /></ProtectedRoute>} />
          <Route path="/link-itineraries/:id" element={<LinkItinerariesPage />} />
          <Route path="/link-itineraries/:id/assign-overview" element={<AssignOverviewPage />} />
          <Route path="/event-portal-management" element={<ProtectedRoute><EventPortalManagementPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}