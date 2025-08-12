import React, { useState, useRef } from 'react';
import { ThemeContext } from '../ThemeContext';
import { addTimelineModule, supabase } from '../lib/supabase';

const getGlassStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(30, 30, 30, 0.85)' 
    : 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
  borderRadius: '20px',
  boxShadow: isDark 
    ? '0 8px 32px rgba(0,0,0,0.3)' 
    : '0 8px 32px rgba(0,0,0,0.1)',
});

// Add prop types
interface Guest {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

interface FeedbackModuleModalProps {
  open: boolean;
  onClose: () => void;
  onNext: (data: any) => void;
  guests: Guest[];
  eventId: string;
  currentUser: { id: string };
}

// --- Local Glassmorphic Date Picker ---
function GlassDatePicker({ value, onChange, isDark }) {
  const [show, setShow] = useState(false);
  const [month, setMonth] = useState(() => value ? new Date(value).getMonth() : new Date().getMonth());
  const [year, setYear] = useState(() => value ? new Date(value).getFullYear() : new Date().getFullYear());
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const ref = useRef();
  React.useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    }
    if (show) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [show]);
  function selectDate(day) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setShow(false);
  }
  // Format value as dd/MM/yyyy for display
  let displayValue = value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split('-');
    displayValue = `${dd}/${mm}/${yyyy}`;
  }
  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }} ref={ref}>
      <input
        type="text"
        value={displayValue || ''}
        onFocus={() => setShow(true)}
        readOnly
        placeholder="Date (DD/MM/YYYY)"
        style={{
          width: '100%',
          padding: '14px 18px',
          borderRadius: 10,
          border: `2px solid ${isDark ? '#333' : '#ddd'}`,
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          color: isDark ? '#fff' : '#111',
          fontSize: 18,
          marginBottom: 0,
          outline: 'none',
          boxSizing: 'border-box',
          marginTop: 4,
          transition: 'all 0.2s',
          backdropFilter: 'blur(10px)',
        }}
      />
      {show && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '100%',
          zIndex: 1000,
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          borderRadius: 16,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb'}`,
          background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)',
          padding: 20,
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button type="button" onClick={() => { if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); } }} style={{ background: 'none', border: 'none', color: isDark ? '#fff' : '#222', fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}>←</button>
            <span style={{ fontWeight: 600, fontSize: 16, color: isDark ? '#fff' : '#222' }}>{monthNames[month]} {year}</span>
            <button type="button" onClick={() => { if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); } }} style={{ background: 'none', border: 'none', color: isDark ? '#fff' : '#222', fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}>→</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['S','M','T','W','T','F','S'].map((day, i) => (
              <div key={i} style={{ textAlign: 'center', fontWeight: 600, color: isDark ? '#aaa' : '#666', fontSize: 12, padding: '4px 0' }}>{day}</div>
            ))}
            {Array(firstDay).fill(null).map((_, i) => <div key={'empty'+i} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
              const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '6px',
                    border: isToday ? '2px solid #fff' : 'none',
                    background: isSelected ? '#fff' : 'transparent',
                    color: isSelected ? '#000' : (isDark ? '#fff' : '#222'),
                    fontWeight: isSelected || isToday ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
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

// --- Local Glassmorphic Time Picker ---
function GlassTimePicker({ value, onChange, isDark }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const ref = useRef();
  React.useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
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
  const handleSelect = (h, m) => {
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
        placeholder="Time"
        style={{
          width: '100%',
          padding: '14px 18px',
          borderRadius: 10,
          border: `2px solid ${isDark ? '#333' : '#ddd'}`,
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          color: isDark ? '#fff' : '#111',
          fontSize: 18,
          marginBottom: 0,
          outline: 'none',
          boxSizing: 'border-box',
          marginTop: 4,
          transition: 'all 0.2s',
          backdropFilter: 'blur(10px)',
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
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb'}`,
          background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)',
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
                  color: h === hour ? '#000' : (isDark ? '#fff' : '#222'),
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
                  color: m === minute ? '#000' : (isDark ? '#fff' : '#222'),
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
}

export default function FeedbackModuleModal({ open, onClose, onNext, guests, eventId, currentUser }: FeedbackModuleModalProps) {
  const { theme } = React.useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(0);
  const [dragging, setDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0,5);
  });
  const [step, setStep] = useState(1);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  if (!open) return null;

  // Swiping logic for granular rating
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let percent = x / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    setRating(Math.round(percent * 50) / 10); // 0.0 to 5.0, step 0.1
  };
  const handleBarDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    handleBarClick(e);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        ...getGlassStyles(isDark),
        width: 420,
        maxWidth: '95vw',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}>
        {step === 1 && <>
          <h2 style={{ color: isDark ? '#fff' : '#111', fontWeight: 700, fontSize: 24, marginBottom: 24 }}>Create Feedback Module</h2>
        <div style={{ width: '100%', boxSizing: 'border-box', marginBottom: 28 }}>
          <label style={{ color: isDark ? '#aaa' : '#444', fontWeight: 600, fontSize: 15, marginBottom: 8, alignSelf: 'flex-start' }}>Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 35))}
            placeholder="Feedback title..."
            style={{ width: '100%', padding: '14px 18px', borderRadius: 10, border: `2px solid ${isDark ? '#333' : '#ddd'}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: isDark ? '#fff' : '#111', fontSize: 18, marginBottom: 0, outline: 'none', boxSizing: 'border-box', marginTop: 4, transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
          />
        </div>
        <div style={{ width: '100%', boxSizing: 'border-box', marginBottom: 28 }}>
          <label style={{ color: isDark ? '#aaa' : '#444', fontWeight: 600, fontSize: 15, marginBottom: 8, alignSelf: 'flex-start' }}>Date</label>
          <GlassDatePicker value={date} onChange={setDate} isDark={isDark} />
        </div>
        <div style={{ width: '100%', boxSizing: 'border-box', marginBottom: 28 }}>
          <label style={{ color: isDark ? '#aaa' : '#444', fontWeight: 600, fontSize: 15, marginBottom: 8, alignSelf: 'flex-start' }}>Time</label>
          <GlassTimePicker value={time} onChange={setTime} isDark={isDark} />
        </div>
        <div style={{ color: isDark ? '#aaa' : '#444', fontWeight: 600, fontSize: 15, marginBottom: 8, alignSelf: 'flex-start' }}>Default Rating</div>
        <div style={{ width: '100%', marginBottom: 32 }}>
          <div
            ref={barRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              marginBottom: 8,
              cursor: 'pointer',
              userSelect: 'none',
              background: 'none',
              padding: 0,
            }}
            onClick={handleBarClick}
            onMouseDown={e => { setDragging(true); handleBarClick(e); }}
            onMouseUp={() => setDragging(false)}
            onMouseMove={handleBarDrag}
            onMouseLeave={() => setDragging(false)}
          >
            {[0,1,2,3,4].map(i => {
              const fillPercent = Math.max(0, Math.min(1, rating - i));
              return (
                <svg key={i} width={28} height={28} viewBox="0 0 24 24" style={{ margin: 0, display: 'block' }}>
                  <defs>
                    <linearGradient id={`star-fill-${i}`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset={`${fillPercent * 100}%`} stopColor="#FFD600" />
                      <stop offset={`${fillPercent * 100}%`} stopColor="none" />
                    </linearGradient>
                  </defs>
                  <polygon points="12,2 15,9 22,9.3 17,14.1 18.5,21 12,17.5 5.5,21 7,14.1 2,9.3 9,9"
                    fill={`url(#star-fill-${i})`}
                    stroke="#FFD600" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: fillPercent === 0 ? 'grayscale(1) opacity(0.5)' : '' }}
                  />
                </svg>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', color: isDark ? '#FFD600' : '#FFD600', fontWeight: 600, fontSize: 18 }}>{rating.toFixed(1)} / 5.0</div>
        </div>
        <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 28px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginRight: 8 }}>Cancel</button>
          <button onClick={() => setStep(2)} disabled={!title} style={{ padding: '12px 28px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: !title ? (isDark ? '#444' : '#f3f4f6') : '#10b981', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 16, cursor: title ? 'pointer' : 'not-allowed', opacity: title ? 1 : 0.7 }}>Next</button>
        </div>
        </>}
        {step === 2 && <div style={{ width: '100%' }}>
          <h2 style={{ color: isDark ? '#fff' : '#111', fontWeight: 700, fontSize: 22, marginBottom: 24 }}>Select Guests for Module</h2>
          <div style={{ width: '100%', marginBottom: 18, display: 'flex', gap: 8 }}>
            <button onClick={() => setSelectedGuests(guests.map(g => g.id))} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Select All</button>
            <button onClick={() => setSelectedGuests([])} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Clear All</button>
          </div>
          <div style={{ width: '100%', maxHeight: 260, overflowY: 'auto', marginBottom: 24 }}>
            {guests.map(g => (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', padding: 10, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginBottom: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedGuests.includes(g.id)} onChange={() => setSelectedGuests(sel => sel.includes(g.id) ? sel.filter(i => i !== g.id) : [...sel, g.id])} style={{ marginRight: 12, width: 16, height: 16 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{g.first_name || g.last_name ? `${g.first_name || ''} ${g.last_name || ''}`.trim() : g.email}</div>
                  <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{g.email}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '12px 28px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginRight: 8 }}>Cancel</button>
            <button onClick={async () => {
              if (!currentUser || !currentUser.id) {
                console.error('Current user is not available');
                return;
              }
              
              const module = await addTimelineModule({
                event_id: eventId,
                module_type: 'feedback',
                title: title,
                time: time,
                date: date,
                label: title,
                link: '',
                file: null,
                created_by: currentUser.id,
              });
              if (module && module.id && selectedGuests.length > 0) {
                await Promise.all(
                  selectedGuests.map(guestId =>
                    supabase.from('timeline_module_guests').insert({
                      module_id: module.id,
                      guest_id: guestId,
                    })
                  )
                );
              }
              setTimeout(() => { window.dispatchEvent(new Event('refreshTimelineModules')); }, 300);
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 3000);
              onNext({ module, selectedGuests });
            }} style={{ padding: '12px 28px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: '#10b981', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Save & Post</button>
          </div>
        </div>}
      </div>
      
      {/* Success Toast */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: 'rgba(40,200,120,0.95)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 16,
          zIndex: 3000,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
        }}>
          Feedback module created successfully!
        </div>
      )}
    </div>
  );
} 