import React, { useState } from 'react';
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
interface ModuleData {
  eventId: string;
  title: string;
  time: string;
  defaultRating?: number;
  currentUser: { id: string };
}
interface FeedbackGuestSelectionModalProps {
  open: boolean;
  onClose: () => void;
  guests: Guest[];
  onSave: (selected: string[]) => void;
  moduleData: ModuleData;
}

export default function FeedbackGuestSelectionModal({ open, onClose, guests, onSave, moduleData }: FeedbackGuestSelectionModalProps) {
  const { theme } = React.useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [selected, setSelected] = useState<string[]>(() => guests.map((g: Guest) => g.id));
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  if (!open) return null;

  const toggle = (id: string) => setSelected((sel: string[]) => sel.includes(id) ? sel.filter((i: string) => i !== id) : [...sel, id]);
  const allSelected = selected.length === guests.length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', zIndex: 2100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        ...getGlassStyles(isDark),
        width: 420, maxWidth: '95vw', padding: 32,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <h2 style={{ color: isDark ? '#fff' : '#111', fontWeight: 700, fontSize: 22, marginBottom: 24 }}>Select Guests for Feedback Module</h2>
        <div style={{ width: '100%', marginBottom: 18, display: 'flex', gap: 8 }}>
          <button onClick={() => setSelected(guests.map(g => g.id))} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Select All</button>
          <button onClick={() => setSelected([])} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: isDark ? '#222' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Clear All</button>
        </div>
        <div style={{ width: '100%', maxHeight: 260, overflowY: 'auto', marginBottom: 24 }}>
          {guests.map((g: Guest) => (
            <label key={g.id} style={{ display: 'flex', alignItems: 'center', padding: 10, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginBottom: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} style={{ marginRight: 12, width: 16, height: 16 }} />
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
            if (!moduleData.currentUser || !moduleData.currentUser.id) {
              console.error('Current user is not available');
              return;
            }
            
            try {
              const module = await addTimelineModule({
                event_id: moduleData.eventId,
                module_type: 'feedback',
                title: moduleData.title,
                time: moduleData.time,
                date: new Date().toISOString().slice(0, 10),
                feedback_data: { defaultRating: moduleData.defaultRating },
                created_by: moduleData.currentUser.id,
              });
              console.log('Created feedback module:', module);
              if (module && module.id && selected.length > 0) {
                await Promise.all(
                  selected.map(guestId =>
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
              onSave(selected);
            } catch (error) {
              console.error('Failed to create feedback module:', error);
              alert('Failed to save feedback module. Please try again.');
            }
          }} disabled={selected.length === 0} style={{ padding: '12px 28px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: selected.length ? '#10b981' : (isDark ? '#444' : '#f3f4f6'), color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 16, cursor: selected.length ? 'pointer' : 'not-allowed', opacity: selected.length ? 1 : 0.7 }}>Save & Post</button>
        </div>
        {/* --- SUPABASE: On save, insert feedback module with guest assignments --- */}
        {/* Table: timeline_modules, Fields: event_id, module_type: 'feedback', time, title, default_rating, assigned_guests */}
        {/* Use Supabase function 'add_timeline_module' */}
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