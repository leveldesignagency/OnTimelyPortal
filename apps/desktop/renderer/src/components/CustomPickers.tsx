import React, { useContext, useEffect, useRef, useState } from 'react';
import { ThemeContext } from '../ThemeContext';
import ThemedIcon from './ThemedIcon';

const getColors = (isDark: boolean) => ({
  text: isDark ? '#ffffff' : '#1a1a1a',
  textSecondary: isDark ? '#a0a0a0' : '#6b7280',
  border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
});

export function CustomDatePicker({ value, onChange, placeholder, required, placement = 'below' }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  placement?: 'above' | 'below';
}) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const today = new Date();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const calendarCells: Array<number | null> = [];
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

  useEffect(() => {
    if (!value) { setText(''); return; }
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      setText(`${dd}/${mm}/${yyyy}`);
    }
  }, [value]);

  function formatDateInput(input: string): string {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    
    // Format as dd/mm/yyyy
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  }

  function tryCommitTypedDate(raw: string) {
    const s = raw.trim();
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
    let yyyy = '', mm = '', dd = '';
    if (dmy.test(s)) {
      const m = s.match(dmy)!; dd = m[1]; mm = m[2]; yyyy = m[3];
    } else if (ymd.test(s)) {
      const m = s.match(ymd)!; yyyy = m[1]; mm = m[2]; dd = m[3]; setText(`${dd}/${mm}/${yyyy}`);
    } else { return; }
    const n = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!isNaN(n.getTime())) onChange(`${yyyy}-${mm}-${dd}`);
  }

  function handlePrev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); } }
  function handleNext() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); } }
  function selectDate(day: number) { const mm = String(month + 1).padStart(2, '0'); const dd = String(day).padStart(2, '0'); onChange(`${year}-${mm}-${dd}`); setShow(false); }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        value={text}
        onChange={(e) => setText(formatDateInput(e.target.value))}
        onFocus={() => setShow(true)}
        onBlur={() => tryCommitTypedDate(text)}
        onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as HTMLInputElement).blur(); } }}
        placeholder={placeholder || 'dd/mm/yyyy'}
        required={required}
        style={{
          width: '100%', padding: '16px 42px 16px 14px', borderRadius: 12,
          border: `2px solid ${colors.border}`, background: colors.inputBg,
          color: text ? colors.text : colors.textSecondary, fontSize: 16, minHeight: 56, boxSizing: 'border-box'
        }}
      />
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <ThemedIcon name="calendar-flat" size={20} />
      </div>
      {show && (
        <div style={{ position: 'absolute', left: '50%', top: placement === 'above' ? undefined : '100%', bottom: placement === 'above' ? '100%' : undefined, transform: 'translateX(-50%)', marginTop: placement === 'above' ? 0 : 8, marginBottom: placement === 'above' ? 8 : 0, zIndex: 1000, width: 340, height: 360,
          background: isDark ? '#1e1e1e' : '#ffffff', border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 12, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', alignItems: 'center', marginBottom: 8, width: '100%' }}>
            <button type="button" onClick={handlePrev} style={{ width: 40, height: 32, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 18, cursor: 'pointer', padding: 0 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 18, textAlign: 'center', letterSpacing: 0.5, color: colors.text }}>{['January','February','March','April','May','June','July','August','September','October','November','December'][month]} {year}</span>
            <button type="button" onClick={handleNext} style={{ width: 40, height: 32, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 18, cursor: 'pointer', padding: 0 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, width: '100%' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label) => (
              <div key={label} style={{ textAlign: 'center', fontWeight: 600, color: colors.textSecondary, fontSize: 13 }}>
                {label.charAt(0)}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, width: '100%', flex: 1 }}>
            {calendarCells.map((day, idx) => day ? (
              <button key={idx} type="button" onClick={() => selectDate(day)} style={{ width: 34, height: 32, borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, fontSize: 13, cursor: 'pointer', margin: 0, padding: 0 }}>
                {day}
              </button>
            ) : (<div key={idx} style={{ width: 34, height: 32 }} />))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomTimePicker({ value, onChange, placeholder, placement = 'below' }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  placement?: 'above' | 'below';
}) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [hour, setHour] = useState<string>(() => (value && /^\d{2}:\d{2}$/.test(value) ? value.split(':')[0] : ''));
  const [minute, setMinute] = useState<string>(() => (value && /^\d{2}:\d{2}$/.test(value) ? value.split(':')[1] : ''));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const display = value && /^\d{2}:\d{2}$/.test(value) ? value : '';
  useEffect(() => { setText(display); }, [display]);

  const apply = (h: string, m: string) => { setHour(h); setMinute(m); onChange(`${h}:${m}`); setOpen(false); };
  
  function formatTimeInput(input: string): string {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    
    // Format as HH:MM
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
  }
  
  function commitTypedTime(raw: string) {
    const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/); if (!m) return;
    const hh = Math.min(Math.max(parseInt(m[1], 10), 0), 23);
    const mm = Math.min(Math.max(parseInt(m[2], 10), 0), 59);
    apply(String(hh).padStart(2, '0'), String(mm).padStart(2, '0'));
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        value={text}
        onChange={(e) => setText(formatTimeInput(e.target.value))}
        onFocus={() => setOpen(true)}
        onBlur={() => commitTypedTime(text)}
        onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget as HTMLInputElement).blur(); } }}
        placeholder={placeholder || 'HH:MM'}
        style={{ width: '100%', padding: '12px 38px 12px 14px', borderRadius: 8, border: `2px solid ${colors.border}`, background: colors.inputBg, color: text ? colors.text : colors.textSecondary, fontSize: 16, minHeight: 48, boxSizing: 'border-box' }}
      />
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <ThemedIcon name="clock" size={18} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: placement === 'above' ? undefined : '100%', bottom: placement === 'above' ? '100%' : undefined, zIndex: 1000, marginTop: placement === 'above' ? 0 : 8, marginBottom: placement === 'above' ? 8 : 0, left: 0, right: 0, background: isDark ? '#1e1e1e' : '#ffffff', border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {hours.map((h) => (
                <div key={h} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(h, minute || '00')} style={{ height: 32, border: `1px solid ${colors.border}`, borderRadius: 6, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: h === hour ? (isDark ? '#2a2a2a' : '#f5f5f5') : 'transparent', color: colors.text, fontSize: 14 }}>{h}</div>
              ))}
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {minutes.map((m) => (
                <div key={m} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(hour || '00', m)} style={{ height: 32, border: `1px solid ${colors.border}`, borderRadius: 6, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: m === minute ? (isDark ? '#2a2a2a' : '#f5f5f5') : 'transparent', color: colors.text, fontSize: 14 }}>{m}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default { CustomDatePicker, CustomTimePicker };


