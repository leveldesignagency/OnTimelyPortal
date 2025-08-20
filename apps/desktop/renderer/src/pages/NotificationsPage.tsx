import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ThemeContext } from '../ThemeContext';
import { getCurrentUser } from '../lib/auth';
import { subscribeToActivityLog } from '../lib/supabase';
import Icon from '../Icon';

// Utility for relative time (copy from Dashboard)
const getRelativeTime = (timestamp: string) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
  return then.toLocaleDateString();
};

export default function NotificationsPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  // Use the same color logic as Create Event and Dashboard
  const colors = {
    bg: isDark ? '#121212' : '#f7f8fa',
    card: isDark ? '#1e1e1e' : '#ffffff',
    text: isDark ? '#ffffff' : '#1a1a1a',
    textSecondary: isDark ? '#a0a0a0' : '#6b7280',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    hover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };
  const [activity, setActivity] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const userNameCache = useRef<{ [id: string]: string }>({});
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return navigate('/login');
      }
      setCurrentUser(user);
      // Fetch activity log
      const { data: logs } = await supabase
        .from('activity_log')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false });
      setActivity(logs || []);
      setFiltered(logs || []);
      // Fetch events
      const { data: eventList } = await supabase
        .from('events')
        .select('id, name')
        .eq('company_id', user.company_id);
      setEvents(eventList || []);
      // Fetch users limited to company initially
      const { data: userList } = await supabase
        .from('users')
        .select('id, name')
        .eq('company_id', user.company_id);
      setUsers(userList || []);
      setLoading(false);
    })();
  }, [navigate]);

  // When event filter changes, limit users to those on teams assigned to that event
  useEffect(() => {
    (async () => {
      if (!currentUser) return;
      if (!eventFilter) {
        const { data: userList } = await supabase
          .from('users')
          .select('id, name')
          .eq('company_id', currentUser.company_id);
        setUsers(userList || []);
        return;
      }
      // 1) get team ids for the event
      const { data: teamEvents } = await supabase
        .from('team_events')
        .select('team_id')
        .eq('event_id', eventFilter);
      const teamIds = (teamEvents || []).map((t: any) => t.team_id);
      if (teamIds.length === 0) { setUsers([]); return; }
      // 2) members of those teams
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds);
      const userIds = Array.from(new Set((teamMembers || []).map((m: any) => m.user_id)));
      if (userIds.length === 0) { setUsers([]); return; }
      // 3) fetch user records limited to company and these ids
      const { data: userList } = await supabase
        .from('users')
        .select('id, name')
        .eq('company_id', currentUser.company_id)
        .in('id', userIds);
      setUsers(userList || []);
    })();
  }, [eventFilter, currentUser]);

  // Filtering and search
  useEffect(() => {
    let data = [...activity];
    if (typeFilter) data = data.filter(a => a.action_type === typeFilter);
    if (eventFilter) data = data.filter(a => a.event_id === eventFilter);
    if (userFilter) data = data.filter(a => a.user_id === userFilter);
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(a =>
        (a.details?.event_title || '').toLowerCase().includes(s) ||
        (a.action_type || '').toLowerCase().includes(s)
      );
    }
    setFiltered(data);
  }, [activity, typeFilter, eventFilter, userFilter, search]);

  // Helper to get user name
  const getUserName = (id: string) => {
    if (!id) return 'Unknown';
    if (userNameCache.current[id]) return userNameCache.current[id];
    const user = users.find(u => u.id === id);
    if (user) {
      userNameCache.current[id] = user.name;
      return user.name;
    }
    return 'Unknown';
  };

  // Helper to get event name
  const getEventName = (id: string) => {
    if (!id) return '';
    const event = events.find(e => e.id === id);
    return event ? event.name : '';
  };

  // Action type to phrase
  const actionPhrase = (type: string) => {
    switch (type) {
      case 'event_created': return 'created an event';
      case 'event_updated': return 'updated an event';
      case 'event_deleted': return 'deleted an event';
      case 'guests_added': return 'added guests';
      case 'guest_updated': return 'updated a guest';
      case 'guest_deleted': return 'deleted a guest';
      case 'itinerary_created': return 'created an itinerary';
      case 'itinerary_updated': return 'updated an itinerary';
      case 'itinerary_deleted': return 'deleted an itinerary';
      case 'homepage_updated': return 'updated the homepage';
      case 'chat_message': return 'sent a message';
      case 'chat_attachment': return 'shared an attachment';
      case 'chat_reaction': return 'reacted in chat';
      case 'module_response': return 'submitted a module response';
      case 'timeline_checkpoint': return 'reached a checkpoint';
      default: return type.replace(/_/g, ' ');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: isDark 
        ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
        : '#f7f8fa', 
      padding: 0 
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 16px 0 16px', position: 'relative' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text,
            fontSize: 16,
            cursor: 'pointer',
            padding: '8px 0',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'inherit',
          }}
        >
          ← Back
        </button>
        <h1 style={{ color: colors.text, fontWeight: 700, fontSize: 32, marginBottom: 24 }}>Notifications</h1>
        {/* Filters and search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          {/* Filters Row */}
          <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                          <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notifications..."
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: `2px solid ${colors.border}`,
                  background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  color: colors.text,
                  fontSize: 18,
                  minWidth: 220,
                  height: 56,
                  flex: 1,
                  boxSizing: 'border-box',
                  backdropFilter: isDark ? 'blur(8px)' : 'blur(4px)',
                }}
              />
            {/* Custom dropdowns styled like CreateEvent dropdowns */}
            <div style={{ position: 'relative', minWidth: 180, width: 220 }}>
              <input
                type="text"
                value={typeFilter ? actionPhrase(typeFilter) : ''}
                onClick={() => setShowTypeDropdown(v => !v)}
                readOnly
                placeholder="All Types"
                style={{
                  width: '100%',
                  height: 56,
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: `2px solid ${colors.border}`,
                  background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  color: colors.text,
                  fontSize: 18,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  backdropFilter: isDark ? 'blur(8px)' : 'blur(4px)',
                }}
              />
              {showTypeDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 60,
                  left: 0,
                  width: '100%',
                  background: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                  border: `2px solid ${colors.border}`,
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  maxHeight: 260,
                  overflowY: 'auto',
                  backdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
                }}>
                  <div
                    style={{ padding: '12px 20px', cursor: 'pointer', color: colors.text, fontSize: 18, borderRadius: 8 }}
                    onClick={() => { setTypeFilter(''); setShowTypeDropdown(false); }}
                  >All Types</div>
                  {Array.from(new Set(activity.map(a => a.action_type))).map(type => (
                    <div
                      key={type}
                      style={{ padding: '12px 20px', cursor: 'pointer', color: colors.text, fontSize: 18, borderRadius: 8, background: typeFilter === type ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : 'transparent' }}
                      onClick={() => { setTypeFilter(type); setShowTypeDropdown(false); }}
                    >{actionPhrase(type)}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative', minWidth: 180, width: 220 }}>
              <input
                type="text"
                value={eventFilter ? getEventName(eventFilter) : ''}
                onClick={() => setShowEventDropdown(v => !v)}
                readOnly
                placeholder="All Events"
                style={{
                  width: '100%',
                  height: 56,
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: `2px solid ${colors.border}`,
                  background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  color: colors.text,
                  fontSize: 18,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  backdropFilter: isDark ? 'blur(8px)' : 'blur(4px)',
                }}
              />
              {showEventDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 60,
                  left: 0,
                  width: '100%',
                  background: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                  border: `2px solid ${colors.border}`,
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  maxHeight: 260,
                  overflowY: 'auto',
                  backdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
                }}>
                  <div
                    style={{ padding: '12px 20px', cursor: 'pointer', color: colors.text, fontSize: 18, borderRadius: 8 }}
                    onClick={() => { setEventFilter(''); setShowEventDropdown(false); }}
                  >All Events</div>
                  {events.map(ev => (
                    <div
                      key={ev.id}
                      style={{ padding: '12px 20px', cursor: 'pointer', color: colors.text, fontSize: 18, borderRadius: 8, background: eventFilter === ev.id ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : 'transparent' }}
                      onClick={() => { setEventFilter(ev.id); setShowEventDropdown(false); }}
                    >{ev.name}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative', minWidth: 180, width: 220 }}>
              <input
                type="text"
                value={userFilter ? getUserName(userFilter) : ''}
                onClick={() => setShowUserDropdown(v => !v)}
                readOnly
                placeholder="All Users"
                style={{
                  width: '100%',
                  height: 56,
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: `2px solid ${colors.border}`,
                  background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  color: colors.text,
                  fontSize: 18,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  backdropFilter: isDark ? 'blur(8px)' : 'blur(4px)',
                }}
              />
              {showUserDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 60,
                  left: 0,
                  width: '100%',
                  background: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                  border: `2px solid ${colors.border}`,
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  maxHeight: 260,
                  overflowY: 'auto',
                  backdropFilter: isDark ? 'blur(12px)' : 'blur(8px)',
                }}>
                  <div
                    style={{ padding: '12px 20px', cursor: 'pointer', color: colors.text, fontSize: 18, borderRadius: 8 }}
                    onClick={() => { setUserFilter(''); setShowUserDropdown(false); }}
                  >All Users</div>
                  {users.map(u => (
                    <div
                      key={u.id}
                      style={{ padding: '12px 20px', cursor: 'pointer', color: colors.text, fontSize: 18, borderRadius: 8, background: userFilter === u.id ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : 'transparent' }}
                      onClick={() => { setUserFilter(u.id); setShowUserDropdown(false); }}
                    >{u.name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Notification List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: '40px' }}>
          {loading ? (
            <div style={{ color: colors.textSecondary, fontSize: 18, textAlign: 'center', padding: 40 }}>Loading notifications...</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: colors.textSecondary, fontSize: 18, textAlign: 'center', padding: 40 }}>No notifications found.</div>
          ) : (
            filtered.map((a, idx) => (
              <div
                key={a.id}
                style={{
                  background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  borderBottom: `1px solid ${colors.border}`,
                  padding: '24px 32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  cursor: a.event_id ? 'pointer' : 'default',
                  borderRadius: idx === 0 ? '16px 16px 0 0' : idx === filtered.length - 1 ? '0 0 16px 16px' : 0,
                  transition: 'background 0.15s, box-shadow 0.15s',
                  marginBottom: 0,
                  marginTop: 0,
                  boxShadow: 'none',
                  position: 'relative',
                  minHeight: 64,
                  backdropFilter: isDark ? 'blur(8px)' : 'blur(4px)',
                }}
                onClick={() => {
                  if (a.event_id) navigate(`/event/${a.event_id}`);
                }}
                onMouseEnter={e => {
                  if (a.event_id) {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)';
                    e.currentTarget.style.boxShadow = isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.08)';
                  } else {
                    e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: colors.text }}>
                    {getUserName(a.user_id)}
                    {a.details?.event_title && (
                      <span style={{ color: colors.textSecondary, fontWeight: 400 }}> — {a.details.event_title}</span>
                    )}
                  </div>
                  <div style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>
                    {getEventName(a.event_id)}
                  </div>
                </div>
                <div style={{ color: colors.textSecondary, fontSize: 14, minWidth: 90, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {getRelativeTime(a.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 