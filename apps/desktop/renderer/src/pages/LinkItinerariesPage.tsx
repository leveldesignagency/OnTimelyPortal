// Route: /event-launcher
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { useRealtimeGuests, useRealtimeItineraries } from '../hooks/useRealtime';
import { getEventModules } from '../lib/supabase';
import { supabase } from '../lib/supabase';

export default function EventLauncher() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { id: eventId } = useParams();

  console.log('EventLauncher component mounted/rendered, eventId:', eventId);

  const { guests, loading: guestsLoading } = useRealtimeGuests(eventId || null);
  const { itineraries, loading: itinerariesLoading } = useRealtimeItineraries(eventId || null);

  // State for guest-itinerary assignments (multiple per guest)
  const [guestAssignments, setGuestAssignments] = useState<{[guestId: string]: string[]}>({});
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [selectedItineraries, setSelectedItineraries] = useState<string[]>([]);
  const [draggedItineraryIds, setDraggedItineraryIds] = useState<string[]>([]);
  const [activeAddOns, setActiveAddOns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assignmentsSaved, setAssignmentsSaved] = useState(false);

  // Load existing assignments from database
  useEffect(() => {
    console.log('useEffect triggered, eventId:', eventId, 'assignmentsSaved:', assignmentsSaved);
    if (!eventId) {
      console.log('No eventId, skipping loadAssignments');
      return;
    }

    // Only load on initial mount (when assignments are empty) or after successful save
    const hasAssignments = Object.values(guestAssignments).some(arr => arr && arr.length > 0);
    if (hasAssignments && !assignmentsSaved) {
      console.log('Skipping loadAssignments - has unsaved local changes');
      return;
    }

    console.log('About to call loadAssignments with eventId:', eventId);

    const loadAssignments = async () => {
      try {
        setIsLoading(true);
        console.log('Loading assignments for event:', eventId);
        
        // Call the database function to get all assignments for this event
        const { data, error } = await supabase.rpc('get_event_assignments', {
          event_identifier: eventId
        });

        console.log('Raw database response:', { data, error });

        if (error) {
          console.error('Error loading assignments:', error, JSON.stringify(error));
          alert('Error loading assignments: ' + (error.message || JSON.stringify(error)));
          return;
        }

        // Convert database results to the format expected by the UI
        const assignments: {[guestId: string]: string[]} = {};
        
        if (data && Array.isArray(data)) {
          console.log('Processing', data.length, 'assignment records');
          data.forEach((row: any) => {
            const guestId = row.guest_id;
            const itineraryId = row.itinerary_id.toString(); // Convert bigint to string for UI
            
            console.log('Processing assignment:', { guestId, itineraryId, row });
            
            if (!assignments[guestId]) {
              assignments[guestId] = [];
            }
            
            assignments[guestId].push(itineraryId);
          });
        } else {
          console.log('No data returned or data is not an array:', data);
        }

        console.log('Final assignments object:', assignments);
        console.log('Setting guestAssignments state to:', assignments);
    setGuestAssignments(assignments);
        setAssignmentsSaved(true); // Mark as saved since we loaded from DB
      } catch (error) {
        console.error('Error loading assignments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssignments();
  }, [eventId]); // Remove assignmentsSaved from dependencies to prevent loops

  // Save assignments to database
  const saveAssignments = async (assignments: {[guestId: string]: string[]}) => {
    if (!eventId) return false;
    try {
      setIsLoading(true);
      
      for (const guestId of Object.keys(assignments)) {
        await supabase.rpc('clear_guest_assignments', {
          guest_identifier: guestId,
          event_identifier: eventId
        });
      }
      
      for (const [guestId, itineraryIds] of Object.entries(assignments)) {
        if (itineraryIds && itineraryIds.length > 0) {
          const bigintItineraryIds = itineraryIds.map(id => parseInt(id));
          
          const { error } = await supabase.rpc('assign_itineraries_to_guests', {
            guest_identifiers: [guestId],
            itinerary_identifiers: bigintItineraryIds,
            event_identifier: eventId,
            assigned_by_identifier: null
          });
          
          if (error) {
            console.error('Error saving assignment for guest:', guestId, error);
            alert('Failed to save assignments: ' + error.message);
            setIsLoading(false);
            return false;
          }
        }
      }
      
      // Don't override state here - it's already been set in assignItinerariesToGuests
      return true;
    } catch (error: any) {
      console.error('Error saving assignments:', error);
      alert('Unexpected error: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Assign itinerary(ies) to guest(s)
  const assignItinerariesToGuests = async (guestIds: string[], itineraryIds: string[]) => {
    console.log('assignItinerariesToGuests called with:', { guestIds, itineraryIds });
    
    const newAssignments = { ...guestAssignments };
    guestIds.forEach(guestId => {
      const current = newAssignments[guestId] || [];
      newAssignments[guestId] = Array.from(new Set([...current, ...itineraryIds]));
    });
    
    console.log('Setting state to:', newAssignments);
    
    // Mark as unsaved immediately to prevent useEffect from overriding
    setAssignmentsSaved(false);
    
    // Update state immediately so tags appear right away
    setGuestAssignments(newAssignments);
    
    // Then save to database
    const success = await saveAssignments(newAssignments);
    if (success !== false) {
      setAssignmentsSaved(true);
    }
  };

  // Remove itinerary from guest
  const removeItineraryFromGuest = async (guestId: string, itineraryId: string) => {
    try {
      setIsLoading(true);
      
      // Remove from database directly
      const { error } = await supabase.rpc('remove_guest_assignment', {
        guest_identifier: guestId,
        itinerary_identifier: parseInt(itineraryId)
      });

      if (error) {
        console.error('Error removing assignment:', error);
        return;
      }

      // Update local state
      const newAssignments = { ...guestAssignments };
      newAssignments[guestId] = (newAssignments[guestId] || []).filter(id => id !== itineraryId);
      setGuestAssignments(newAssignments);
    } catch (error) {
      console.error('Error removing assignment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleItineraryDragStart = (e: React.DragEvent, itineraryId: string) => {
    setDraggedItineraryIds(selectedItineraries.length > 0 ? selectedItineraries : [itineraryId]);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleGuestDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleGuestDrop = async (e: React.DragEvent, guestId: string) => {
    e.preventDefault();
    console.log('🎯 DRAG DROP STARTED for guest:', guestId, 'with itineraries:', draggedItineraryIds);
    
    // If multiple guests are selected, assign to all selected guests; otherwise, just the one dropped on
    const targetGuests = selectedGuests.length > 1 ? selectedGuests : [guestId];
    
    console.log('🎯 Target guests:', targetGuests);
    console.log('🎯 Current guestAssignments before drop:', guestAssignments);
    
    await assignItinerariesToGuests(targetGuests, draggedItineraryIds);
    setDraggedItineraryIds([]);
    
    console.log('🎯 DRAG DROP COMPLETED');
  };

  // Bulk assign button
  const handleBulkAssign = async () => {
    if (selectedGuests.length && selectedItineraries.length) {
      await assignItinerariesToGuests(selectedGuests, selectedItineraries);
    }
  };

  // Select all helpers
  const allGuestsSelected = guests.length > 0 && selectedGuests.length === guests.length;
  const allItinerariesSelected = itineraries.length > 0 && selectedItineraries.length === itineraries.length;

  // Glassmorphic and traffic light color helpers
  const glass = isDark
    ? 'rgba(30,30,30,0.7)'
    : 'rgba(255,255,255,0.7)';
  const border = isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e5e7eb';
  const statusColors = {
    live: '#22c55e', // green
    upcoming: '#f59e0b', // orange
    completed: '#ef4444', // red
    default: isDark ? '#888' : '#999'
  };

  // Group itineraries by group_id/group_name
  const groupedItineraries: { [groupId: string]: any[] } = {};
  itineraries.forEach(itin => {
    const groupKey = itin.group_id || itin.id;
    if (!groupedItineraries[groupKey]) groupedItineraries[groupKey] = [];
    groupedItineraries[groupKey].push(itin);
  });

  // Custom Checkbox Component
  function CustomCheckbox({ checked, onChange, id }: { checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, id?: string }) {
    return (
      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          id={id}
          style={{ display: 'none' }}
        />
        <span style={{
          width: 18,
          height: 18,
          border: `2px solid ${isDark ? '#fff' : '#000'}`,
          borderRadius: 4,
          background: checked ? (isDark ? '#fff' : '#000') : 'transparent',
          display: 'inline-block',
          marginRight: 8,
          position: 'relative',
          transition: 'background 0.2s',
        }}>
          {checked && (
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', top: 1, left: 1 }}>
              <polyline points="2,8 6,12 12,3" style={{ fill: 'none', stroke: isDark ? '#000' : '#fff', strokeWidth: 2 }} />
            </svg>
          )}
        </span>
      </label>
    );
  }

  useEffect(() => {
    async function fetchAddOns() {
      if (!eventId) return;
      try {
        const modules = await getEventModules(eventId);
        // Only use .module_data.addons
        const addons = modules?.module_data?.addons || [];
        setActiveAddOns(addons);
      } catch (e) {
        setActiveAddOns([]);
      }
    }
    fetchAddOns();
  }, [eventId]);

  const handleAssignClick = async () => {
    const success = await saveAssignments(guestAssignments);
    if (success !== false) {
      setAssignmentsSaved(true);
    }
  };

  return (
    <>
      <div style={{ minHeight: '100vh', background: isDark ? '#121212' : '#f8f9fa', color: isDark ? '#fff' : '#222', padding: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <button
              onClick={() => navigate(`/event/${eventId}`)}
              style={{ width: 140, fontSize: 16, background: 'none', color: isDark ? '#fff' : '#000', border: '1.5px solid', borderColor: isDark ? '#444' : '#bbb', borderRadius: 8, cursor: 'pointer', padding: '10px 0', fontWeight: 600 }}
            >
              Back
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={async () => {
                  const cleared: {[guestId: string]: string[]} = {};
                  guests.forEach(g => { cleared[g.id] = []; });
                  // Update state immediately so UI updates right away
                  setGuestAssignments(cleared);
                  // Reset assignment saved state
                  setAssignmentsSaved(false);
                  // Then save to database
                  await saveAssignments(cleared);
                }}
                style={{ width: 140, fontSize: 16, background: isDark ? '#232323' : '#fff', color: isDark ? '#fff' : '#222', border: '1.5px solid', borderColor: isDark ? '#444' : '#bbb', borderRadius: 8, cursor: 'pointer', padding: '10px 0', fontWeight: 600 }}
                disabled={isLoading}
              >
                {isLoading ? 'Removing...' : 'Remove All'}
              </button>
              <button
                onClick={assignmentsSaved ? () => {
                  console.log('Navigating to overview with state:', {
                    guestAssignments,
                    guests: guests.length,
                    itineraries: itineraries.length,
                    eventAddOns: activeAddOns.length
                  });
                  navigate(`/link-itineraries/${eventId}/assign-overview`, { 
                    state: { guestAssignments, guests, itineraries, eventAddOns: activeAddOns } 
                  });
                } : handleAssignClick}
                disabled={!Object.values(guestAssignments).some(arr => arr && arr.length > 0) || isLoading}
                style={{ width: 140, fontSize: 16, background: Object.values(guestAssignments).some(arr => arr && arr.length > 0) ? (isDark ? '#fff' : '#000') : '#888', color: Object.values(guestAssignments).some(arr => arr && arr.length > 0) ? (isDark ? '#000' : '#fff') : '#fff', border: 'none', borderRadius: 8, cursor: Object.values(guestAssignments).some(arr => arr && arr.length > 0) ? 'pointer' : 'not-allowed', fontWeight: 700, boxShadow: 'none', opacity: Object.values(guestAssignments).some(arr => arr && arr.length > 0) ? 1 : 0.7, transition: 'background 0.2s, opacity 0.2s', padding: '10px 0' }}
              >
                {assignmentsSaved ? 'Next' : 'Assign'}
              </button>
            </div>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 40, letterSpacing: 1 }}>Event Launcher</h1>
          <div style={{ display: 'flex', gap: 32 }}>
            {/* Guests List */}
            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CustomCheckbox checked={allGuestsSelected} onChange={e => setSelectedGuests(e.target.checked ? guests.map(g => g.id) : [])} />
                <span style={{ fontWeight: 600 }}>Guests</span>
                <span style={{ color: '#aaa', fontSize: 13 }}>({guests.length})</span>
        </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {guests.map(guest => (
                  <div
                    key={guest.id}
                    onClick={() => setSelectedGuests(sel => sel.includes(guest.id) ? sel.filter(id => id !== guest.id) : [...sel, guest.id])}
                    onDragOver={handleGuestDragOver}
                    onDrop={e => handleGuestDrop(e, guest.id)}
                    style={{
                      background: glass,
                      border,
          borderRadius: 12,
                      padding: 18,
                      cursor: 'pointer',
                      transition: 'background 0.2s, border 0.2s',
                      boxShadow: selectedGuests.includes(guest.id) ? '0 0 0 1px #fff' : '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{guest.first_name} {guest.last_name}</div>
                    <div style={{ color: '#aaa', fontSize: 13 }}>{guest.email}</div>
                    {/* Assigned itinerary tags */}
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(() => {
                        const assignments = guestAssignments[guest.id] || [];
                        console.log(`🏷️ Rendering tags for guest ${guest.first_name} ${guest.last_name}:`, assignments);
                        return assignments.map(itinId => {
                          // Fix data type mismatch - try both string and numeric comparison
                          const itin = itineraries.find(i => String(i.id) === String(itinId) || Number(i.id) === Number(itinId));
                          if (!itin) {
                            console.log(`🏷️ Could not find itinerary for ID ${itinId}, available IDs:`, itineraries.map(i => ({ id: i.id, type: typeof i.id })));
                            return null;
                          }
                          console.log(`🏷️ Rendering tag for itinerary: ${itin.title}`);
                          return (
                            <span key={itinId} style={{
                              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                              color: isDark ? '#fff' : '#222',
                              borderRadius: 8,
                              padding: '4px 10px',
                              fontSize: 13,
          display: 'flex',
          alignItems: 'center',
                              gap: 4,
                              border: isDark ? '1.5px solid #bbb' : '1.5px solid #bbb',
                              boxShadow: '0 0 4px 1px #fff',
                            }}>
                              {itin.title}
                              <span
                                style={{ marginLeft: 6, cursor: 'pointer', color: statusColors.completed, fontWeight: 700 }}
                                onClick={e => { e.stopPropagation(); removeItineraryFromGuest(guest.id, itinId); }}
                              >×</span>
                            </span>
                          );
                        });
                      })()}
                    </div>
            </div>
                ))}
          </div>
        </div>

            {/* Itinerary List */}
            <div style={{ flex: 1, minWidth: 320 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CustomCheckbox checked={allItinerariesSelected} onChange={e => setSelectedItineraries(e.target.checked ? itineraries.map(i => i.id) : [])} />
                <span style={{ fontWeight: 600 }}>Itinerary Items</span>
                <span style={{ color: '#aaa', fontSize: 13 }}>({itineraries.length})</span>
        </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(groupedItineraries).map(([groupId, groupItems]) => {
                  // If group has a group_name, render as a single drag-and-drop box for the group
                  if (groupItems[0]?.group_id) {
                  return (
                      <div 
                        key={groupId}
                        draggable
                        onDragStart={e => {
                          setDraggedItineraryIds(groupItems.map(it => it.id));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => {
                          const allIds = groupItems.map(it => it.id);
                          setSelectedItineraries(sel => {
                            const allSelected = allIds.every(id => sel.includes(id));
                            return allSelected ? sel.filter(id => !allIds.includes(id)) : [...new Set([...sel, ...allIds])];
                          });
                        }}
                        style={{
                          background: glass,
                          border,
                          borderRadius: 16,
                          padding: 24,
                          marginBottom: 16,
                          cursor: 'grab',
                          boxShadow: groupItems.some(it => selectedItineraries.includes(it.id)) ? '0 0 0 1px #fff' : '0 2px 8px rgba(0,0,0,0.08)',
                          transition: 'background 0.2s, border 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        {groupItems.map((itin: any) => {
                          const details = [
                            itin.arrival_time ? `Arrival: ${itin.arrival_time}` : null,
                            itin.start_time ? `Start: ${itin.start_time}` : null,
                            itin.end_time ? `End: ${itin.end_time}` : null,
                            `Date: ${itin.date || '-'}`,
                            itin.location ? `Location: ${itin.location}` : null,
                          ].filter(Boolean).join(' | ');
                            return (
                            <div key={itin.id}>
                              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{itin.title}</div>
                              <div style={{ color: '#aaa', fontSize: 14 }}>{details}</div>
                              </div>
                            );
                          })}
                    </div>
                  );
                  }
                  // Otherwise, render as individual items
                  return groupItems.map((itin: any) => {
                    const details = [
                      itin.arrival_time ? `Arrival: ${itin.arrival_time}` : null,
                      itin.start_time ? `Start: ${itin.start_time}` : null,
                      itin.end_time ? `End: ${itin.end_time}` : null,
                      `Date: ${itin.date || '-'}`,
                      itin.location ? `Location: ${itin.location}` : null,
                    ].filter(Boolean).join(' | ');
                  return (
                    <div 
                        key={itin.id}
                        draggable
                        onDragStart={e => handleItineraryDragStart(e, itin.id)}
                        onClick={() => setSelectedItineraries(sel => sel.includes(itin.id) ? sel.filter(id => id !== itin.id) : [...sel, itin.id])}
                      style={{
                          background: glass,
                          border,
                          borderRadius: 12,
                          padding: 18,
                          cursor: 'grab',
                          boxShadow: selectedItineraries.includes(itin.id) ? '0 0 0 1px #fff' : '0 2px 8px rgba(0,0,0,0.08)',
                          transition: 'background 0.2s, border 0.2s',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{itin.title}</div>
                        <div style={{ color: '#aaa', fontSize: 14 }}>{details}</div>
                    </div>
                  );
                  });
                })}
              </div>
          </div>
            {/* Add-Ons List Column */}
            <div style={{ flex: 1, minWidth: 240, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>Add-Ons</div>
              {activeAddOns.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: 15 }}>No add-ons enabled for this event.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activeAddOns.map((addOn) => (
                    <div
                      key={addOn.id || addOn.name}
                      style={{
                        border: isDark ? '1.5px solid #fff' : '1.5px solid #222',
                        borderRadius: 8,
                        padding: '14px 18px',
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        fontWeight: 600,
                        fontSize: 15,
                        letterSpacing: 0.5,
                        color: isDark ? '#fff' : '#111',
                        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {addOn.name || addOn.type || addOn.key}
                    </div>
                  ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 