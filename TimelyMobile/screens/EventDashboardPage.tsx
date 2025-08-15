import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, deleteEvent, updateEvent } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { useRealtimeGuests, useRealtimeItineraries } from '../hooks/useRealtime';
import AnnouncementModal from './AnnouncementModal';

// Types
type EventType = {
  id: string;
  name: string;
  from: string;
  to: string;
  status: string;
  location?: string;
  time_zone?: string;
  description?: string;
};

type GuestType = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  contactNumber: string;
  countryCode: string;
  idType: string;
  idNumber: string;
  dob?: string;
  gender?: string;
  groupId?: string;
  groupName?: string;
  modules?: Record<string, boolean>;
};

type ItineraryType = {
  id: string;
  title: string;
  description?: string;
  date: string;
  arrival_time?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  is_draft: boolean;
  group_id?: string;
  group_name?: string;
  // Module fields
  document_file_name?: string;
  qrcode_url?: string;
  qrcode_image?: string;
  contact_name?: string;
  contact_country_code?: string;
  contact_phone?: string;
  contact_email?: string;
  notification_times?: any[];
  modules?: Record<string, any>;
  module_values?: Record<string, any>;
  content?: any;
};

interface EventDashboardPageProps {
  eventId: string;
  onNavigate: (route: string, params?: any) => void;
}

interface EditItineraryFormProps {
  itinerary: ItineraryType;
  onSave: (data: Partial<ItineraryType>) => void;
  onCancel: () => void;
}

interface EditEventFormProps {
  event: EventType;
  onSave: (data: Partial<EventType>) => void;
  onCancel: () => void;
}

const EditItineraryForm = ({ itinerary, onSave, onCancel }: EditItineraryFormProps) => {
  const [title, setTitle] = useState(itinerary.title);
  const [description, setDescription] = useState(itinerary.description || '');
  const [date, setDate] = useState(itinerary.date);
  const [location, setLocation] = useState(itinerary.location || '');
  const [startTime, setStartTime] = useState(itinerary.start_time || '');
  const [endTime, setEndTime] = useState(itinerary.end_time || '');

  const handleSave = () => {
    const updatedData: Partial<ItineraryType> = {
      title,
      description,
      date,
      location,
      start_time: startTime,
      end_time: endTime,
    };
    onSave(updatedData);
  };

  return (
    <View style={styles.editFormContainer}>
      <TextInput
        style={styles.editFormInput}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        placeholderTextColor="#888"
        multiline
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="Start Time (HH:MM)"
        value={startTime}
        onChangeText={setStartTime}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="End Time (HH:MM)"
        value={endTime}
        onChangeText={setEndTime}
        placeholderTextColor="#888"
      />
      <View style={styles.editFormButtons}>
        <TouchableOpacity
          style={styles.modalCancelButton}
          onPress={onCancel}
        >
          <Text style={styles.modalCancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalDeleteButton}
          onPress={handleSave}
        >
          <Text style={styles.modalDeleteButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EditEventForm = ({ event, onSave, onCancel }: EditEventFormProps) => {
  const [name, setName] = useState(event.name);
  const [from, setFrom] = useState(event.from);
  const [to, setTo] = useState(event.to);
  const [location, setLocation] = useState(event.location || '');
  const [description, setDescription] = useState(event.description || '');

  const handleSave = () => {
    const updatedData: Partial<EventType> = {
      name,
      from,
      to,
      location,
      description,
    };
    onSave(updatedData);
  };

  return (
    <View style={styles.editFormContainer}>
      <TextInput
        style={styles.editFormInput}
        placeholder="Event Name"
        value={name}
        onChangeText={setName}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="Start Date (YYYY-MM-DD)"
        value={from}
        onChangeText={setFrom}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="End Date (YYYY-MM-DD)"
        value={to}
        onChangeText={setTo}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.editFormInput}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        placeholderTextColor="#888"
        multiline
      />
      <View style={styles.editFormButtons}>
        <TouchableOpacity
          style={styles.modalCancelButton}
          onPress={onCancel}
        >
          <Text style={styles.modalCancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalDeleteButton}
          onPress={handleSave}
        >
          <Text style={styles.modalDeleteButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function EventDashboardPage({ eventId, onNavigate }: EventDashboardPageProps) {
  const insets = useSafeAreaInsets();
  
  console.log('🔍 EventDashboardPage rendered with eventId:', eventId);
  
  // State
  const [currentEvent, setCurrentEvent] = useState<EventType | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignedTeam, setAssignedTeam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<GuestType[]>([]);
  const [itineraries, setItineraries] = useState<ItineraryType[]>([]);
  const [savedItineraries, setSavedItineraries] = useState<ItineraryType[]>([]);
  const [draftItineraries, setDraftItineraries] = useState<ItineraryType[]>([]);
  const [activeAddOns, setActiveAddOns] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFallbackScreen, setShowFallbackScreen] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  
  // Itineraries state
  const [isItinerarySelectModeActive, setIsItinerarySelectModeActive] = useState(false);
  const [selectedItineraryIds, setSelectedItineraryIds] = useState<string[]>([]);
  const [itineraryDateSort, setItineraryDateSort] = useState<'asc' | 'desc'>('asc');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [showDeleteItineraryModal, setShowDeleteItineraryModal] = useState(false);
  const [itineraryToDelete, setItineraryToDelete] = useState<string | null>(null);

  const [showDeleteDraftModal, setShowDeleteDraftModal] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [showEditDraftModal, setShowEditDraftModal] = useState(false);
  const [draftToEdit, setDraftToEdit] = useState<ItineraryType | null>(null);
  const [showPublishDraftModal, setShowPublishDraftModal] = useState(false);
  const [draftToPublish, setDraftToPublish] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Undo functionality state
  const [lastBulkAction, setLastBulkAction] = useState<{ action: string, affected: any[] } | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [groupedItineraries, setGroupedItineraries] = useState<{[key: string]: ItineraryType[]}>({});
  
  // Guests state
  const [isGuestSelectModeActive, setIsGuestSelectModeActive] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [guestSearchQuery, setGuestSearchQuery] = useState('');

  const [showBulkDeleteGuestsConfirm, setShowBulkDeleteGuestsConfirm] = useState(false);
  const [showDeleteGuestModal, setShowDeleteGuestModal] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<string | null>(null);
  const [groupedGuests, setGroupedGuests] = useState<{[key: string]: GuestType[]}>({});
  const [filteredGuests, setFilteredGuests] = useState<GuestType[]>([]);
  const [allGuestsSelected, setAllGuestsSelected] = useState(false);
  
  // Add Ons state
  const [isSavingAddOns, setIsSavingAddOns] = useState(false);
  const [saveAddOnsMessage, setSaveAddOnsMessage] = useState('');
  
  // Dashboard modules configuration
  const DASHBOARD_MODULES = {
    addons: [
      {
        key: 'flightTracker',
        label: 'Flight Tracker',
        description: 'Real-time flight status tracking',
        type: 'service',
        icon: 'airplane'
      },
      {
        key: 'safetyBeacon',
        label: 'Safety SOS',
        description: 'Emergency alert system for guests',
        type: 'service',
        icon: 'alert'
      },
      {
        key: 'gpsTracking',
        label: 'GPS Tracking',
        description: 'Track logistics team location',
        type: 'service',
        icon: 'crosshairs-gps'
      },
      {
        key: 'eventUpdates',
        label: 'Event Updates',
        description: 'Live event status notifications',
        type: 'service',
        icon: 'bell'
      },
      {
        key: 'hotelBooking',
        label: 'Hotel Manager',
        description: 'Hotel reservation tracking',
        type: 'service',
        icon: 'home'
      },
      {
        key: 'currencyConverter',
        label: 'Currency Converter',
        description: 'Convert currencies for international guests',
        type: 'service',
        icon: 'currency-usd'
      },
      {
        key: 'translator',
        label: 'Translator',
        description: 'Translate text and phrases for guests',
        type: 'service',
        icon: 'translate'
      },
      {
        key: 'offlineMaps',
        label: 'Offline Maps',
        description: 'Access maps without internet connection',
        type: 'service',
        icon: 'map'
      }
    ]
  };

  // Real-time hooks
  const { guests: realtimeGuests, loading: guestsLoading } = useRealtimeGuests(eventId);
  const { itineraries: realtimeItineraries, loading: itinerariesLoading } = useRealtimeItineraries(eventId);

  // Data loading functions
  const loadItineraries = async () => {
    console.log('🔍 loadItineraries called with eventId:', eventId, 'currentUser:', currentUser);
    
    if (!eventId || !currentUser?.company_id) {
      console.log('❌ loadItineraries returning early - missing eventId or currentUser.company_id');
      console.log('❌ eventId:', eventId);
      console.log('❌ currentUser:', currentUser);
      console.log('❌ currentUser?.company_id:', currentUser?.company_id);
      return;
    }
    
    try {
      console.log('🔍 Loading itineraries for event:', eventId);
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('event_id', eventId)
        .eq('company_id', currentUser.company_id)
        .order('date', { ascending: itineraryDateSort === 'asc' })
        .order('start_time', { ascending: itineraryDateSort === 'asc' });

      if (error) throw error;

      console.log('📊 Raw itinerary data:', data);
      const savedItins = data.filter((it: any) => it.is_draft === false);
      const draftItins = data.filter((it: any) => it.is_draft === true);

      console.log('✅ Published itineraries:', savedItins.length);
      console.log('📝 Draft itineraries:', draftItins.length);
      console.log('📝 Draft data:', draftItins);

      console.log('🔄 Setting saved itineraries state...');
      setSavedItineraries(savedItins);
      console.log('🔄 Setting draft itineraries state...');
      setDraftItineraries(draftItins);

      // Group itineraries by group_id
      const grouped = savedItins.reduce((acc: any, itinerary: any) => {
        const groupId = itinerary.group_id || 'ungrouped';
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(itinerary);
        return acc;
      }, {});

      setGroupedItineraries(grouped);
    } catch (error) {
      console.error('Error loading itineraries:', error);
    }
  };

  const loadGuests = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGuests(data || []);

      // Filter guests based on search query
      const filtered = data?.filter((guest: any) => {
        const searchLower = guestSearchQuery.toLowerCase();
        return (
          guest.first_name?.toLowerCase().includes(searchLower) ||
          guest.last_name?.toLowerCase().includes(searchLower) ||
          guest.email?.toLowerCase().includes(searchLower) ||
          guest.contact_number?.includes(searchLower)
        );
      }) || [];

      setFilteredGuests(filtered);

      // Group guests by group_id, but only if they have an explicit group name
      const grouped = filtered.reduce((acc: any, guest: any) => {
        const guestData = {
          ...guest,
          firstName: guest.first_name,
          lastName: guest.last_name,
          middleName: guest.middle_name,
          contactNumber: guest.contact_number,
          countryCode: guest.country_code,
          idType: guest.id_type,
          idNumber: guest.id_number,
          groupId: guest.group_id,
          groupName: guest.group_name,
        };

        // Only group if there's an explicit group name
        if (guest.group_id && guest.group_name) {
          if (!acc[guest.group_id]) {
            acc[guest.group_id] = [];
          }
          acc[guest.group_id].push(guestData);
        } else {
          // Render as individual item
          if (!acc.individual) {
            acc.individual = [];
          }
          acc.individual.push(guestData);
        }
        return acc;
      }, {});

      setGroupedGuests(grouped);
    } catch (error) {
      console.error('Error loading guests:', error);
    }
  };

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // Load event data and assigned team
  useEffect(() => {
    const loadEventAndTeam = async () => {
      try {
        console.log('🔍 Loading event with ID:', eventId);
        setLoading(true);
        
        // Load event data
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (eventError) {
          console.error('Error loading event:', eventError);
          return;
        }

        console.log('🔍 Event loaded successfully:', event);
        console.log('🔍 Event status:', event.status);
        setCurrentEvent(event);

        // Load assigned team if event has team_id
        if (event.team_id) {
          const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', event.team_id)
            .single();

          if (!teamError && team) {
            console.log('🔍 Team loaded successfully:', team);
            setAssignedTeam(team);
          }
        }

        // Load active add-ons for this event
        const { data: addOns, error: addOnsError } = await supabase
          .from('event_addons')
          .select('*')
          .eq('event_id', eventId)
          .eq('enabled', true);

        if (!addOnsError && addOns) {
          console.log('🔍 Active add-ons loaded:', addOns);
          setActiveAddOns(addOns);
        } else {
          console.error('Error loading add-ons:', addOnsError);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEventAndTeam();
    } else {
      console.log('🔍 No eventId provided');
      setLoading(false);
    }
  }, [eventId]);

  // Load saved add-ons when add-ons tab is selected
  useEffect(() => {
    if (activeTab === 'addons') {
      loadSavedAddOns();
    }
  }, [activeTab, eventId]);

  // Update guests and itineraries from real-time data
  useEffect(() => {
    if (realtimeGuests) {
      console.log('🔄 Real-time guests updated:', realtimeGuests.length);
      setGuests(realtimeGuests);
      // Re-run guest filtering and grouping
      const filtered = realtimeGuests.filter((guest: any) => {
        const searchLower = guestSearchQuery.toLowerCase();
        return (
          guest.first_name?.toLowerCase().includes(searchLower) ||
          guest.last_name?.toLowerCase().includes(searchLower) ||
          guest.email?.toLowerCase().includes(searchLower) ||
          guest.contact_number?.includes(searchLower)
        );
      });

      console.log('✅ Filtered guests from real-time:', filtered.length);
      setFilteredGuests(filtered);

      // Group guests by group_id, but only if they have an explicit group name
      const grouped = filtered.reduce((acc: any, guest: any) => {
        const guestData = {
          ...guest,
          firstName: guest.first_name,
          lastName: guest.last_name,
          middleName: guest.middle_name,
          contactNumber: guest.contact_number,
          countryCode: guest.country_code,
          idType: guest.id_type,
          idNumber: guest.id_number,
          groupId: guest.group_id,
          groupName: guest.group_name,
        };

        // Only group if there's an explicit group name
        if (guest.group_id && guest.group_name) {
          if (!acc[guest.group_id]) {
            acc[guest.group_id] = [];
          }
          acc[guest.group_id].push(guestData);
        } else {
          // Render as individual item
          if (!acc.individual) {
            acc.individual = [];
          }
          acc.individual.push(guestData);
        }
        return acc;
      }, {});

      setGroupedGuests(grouped);
    }
  }, [realtimeGuests, guestSearchQuery]);

  useEffect(() => {
    if (realtimeItineraries) {
      console.log('🔄 Real-time itineraries updated:', realtimeItineraries.length);
      const saved = realtimeItineraries.filter(i => !i.is_draft);
      const drafts = realtimeItineraries.filter(i => i.is_draft);
      
      console.log('✅ Published from real-time:', saved.length);
      console.log('📝 Drafts from real-time:', drafts.length);
      console.log('📝 Draft data from real-time:', drafts);
      
      // Apply sorting to saved itineraries
      const sortedSaved = saved.sort((a: any, b: any) => {
        const aDate = new Date(a.date || '1970-01-01').getTime();
        const bDate = new Date(b.date || '1970-01-01').getTime();
        
        if (itineraryDateSort === 'asc') {
          return aDate - bDate;
        } else {
          return bDate - aDate;
        }
      });
      
      setSavedItineraries(sortedSaved);
      setDraftItineraries(drafts);
      setItineraries(realtimeItineraries);

      // Group sorted itineraries by group_id
      const grouped = sortedSaved.reduce((acc: any, itinerary: any) => {
        const groupId = itinerary.group_id || 'ungrouped';
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(itinerary);
        return acc;
      }, {});

      setGroupedItineraries(grouped);
    }
  }, [realtimeItineraries, itineraryDateSort]);

  // Real-time subscription for event updates
  useEffect(() => {
    if (!eventId) return;

    const subscription = supabase
      .channel('event-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        (payload) => {
          console.log('🔍 Event updated via real-time:', payload.new);
          setCurrentEvent(payload.new as EventType);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  // Load itineraries when eventId, currentUser, or sort order changes
  useEffect(() => {
    if (eventId && currentUser?.company_id) {
      loadItineraries();
    }
  }, [eventId, currentUser?.company_id, itineraryDateSort]);

  // Load guests when eventId changes
  useEffect(() => {
    if (eventId) {
      loadGuests();
    }
  }, [eventId]);

  // Reload guests when search query changes
  useEffect(() => {
    if (eventId) {
      loadGuests();
    }
  }, [guestSearchQuery]);

  useEffect(() => {
    (async () => {
      if (!eventId) return;
      try {
        setActivityLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('users').select('company_id').eq('id', auth.user?.id || '').single();
        const companyId = profile?.company_id;
        // Seed from unified RPC so chat/module activity appears even without activity_log
        const { data: seed, error: seedErr } = await supabase.rpc('get_event_activity_feed', {
          p_event_id: eventId,
          p_company_id: companyId,
          p_limit: 30,
          p_offset: 0,
        });
        const seedFiltered = (seed || [])
          .filter((i: any) => i.item_type === 'message' || i.item_type === 'module_answer')
          .map((i: any) => ({
            id: `${i.item_type}-${i.source_id}`,
            created_at: i.created_at,
            action_type: i.item_type === 'message' ? 'chat_message' : 'module_response',
            details: { event_title: i.title, actor_name: i.actor_name },
          }));
        if (!seedErr) setActivityFeed(seedFiltered.slice(0, 9));
      } finally {
        setActivityLoading(false);
      }
    })();
  }, [eventId]);

  // realtime updates
  useEffect(() => {
    let sub: any;
    let subMsg: any;
    let subMod: any;
    (async () => {
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', (await supabase.auth.getUser()).data.user?.id || '').single();
      const companyId = profile?.company_id;
      // Listen to activity_log inserts for timeline checkpoints (if present)
      sub = supabase
        .channel(`activity-${eventId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `event_id=eq.${eventId}` }, (payload: any) => {
          const a = payload.new;
          if (!['timeline_checkpoint'].includes(a.action_type)) return;
          if (a.company_id !== companyId) return;
          setActivityFeed(prev => [a, ...prev].slice(0, 9));
        })
        .subscribe();

      // Listen directly to chat messages
      subMsg = supabase
        .channel(`msgs-${eventId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guests_chat_messages', filter: `event_id=eq.${eventId}` }, (payload: any) => {
          const m = payload.new;
          const a = { id: `msg-${m.message_id}`, created_at: m.created_at, action_type: 'chat_message', details: { actor_name: m.sender_name, sender_name: m.sender_name } };
          setActivityFeed(prev => [a, ...prev].slice(0, 9));
        })
        .subscribe();

      // Listen to module responses
      subMod = supabase
        .channel(`mods-${eventId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guest_module_answers', filter: `event_id=eq.${eventId}` }, async (payload: any) => {
          const r = payload.new;
          let actorName = '';
          try {
            if (r.user_id) {
              const { data: u } = await supabase.from('users').select('name').eq('id', r.user_id).single();
              actorName = u?.name || '';
            } else if (r.guest_id) {
              const { data: g } = await supabase.from('guests').select('first_name,last_name').eq('id', r.guest_id).single();
              actorName = g ? `${g.first_name} ${g.last_name}` : '';
            }
          } catch {}
          const a = { id: `mod-${r.id}`, created_at: r.created_at, action_type: 'module_response', details: { actor_name: actorName || 'Participant' } };
          setActivityFeed(prev => [a, ...prev].slice(0, 9));
        })
        .subscribe();
    })();
    return () => { if (sub) sub.unsubscribe(); if (subMsg) subMsg.unsubscribe(); if (subMod) subMod.unsubscribe(); };
  }, [eventId]);

  // Helper functions
  const getEventDisplayStatus = (event: EventType): string => {
    switch (event.status) {
      case 'draft':
        return 'Draft';
      case 'launched':
        return 'Live';
      case 'upcoming':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      default:
        return event.status;
    }
  };

  const getStatusColor = (event: EventType): string => {
    switch (event.status) {
      case 'draft':
        return '#6b7280';
      case 'launched':
        return '#10b981';
      case 'upcoming':
        return '#f59e0b';
      case 'completed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Itineraries functions
  const handleSelectItinerary = (itineraryId: string) => {
    setSelectedItineraryIds(prev => 
      prev.includes(itineraryId) 
        ? prev.filter(id => id !== itineraryId)
        : [...prev, itineraryId]
    );
  };

  const handleSelectAllItineraries = () => {
    const allItineraryIds = savedItineraries.map(itinerary => itinerary.id);
    setSelectedItineraryIds(allItineraryIds);
  };

  // Bulk actions functions
  const handleBulkDuplicate = async () => {
    try {
      const duplicated: any[] = [];
      for (const itineraryId of selectedItineraryIds) {
        const itinerary = savedItineraries.find(i => i.id === itineraryId);
        if (itinerary) {
          await handleDuplicateItinerary(itinerary);
          duplicated.push(itinerary);
        }
      }
      setLastBulkAction({ action: 'duplicate', affected: duplicated });
      setSelectedItineraryIds([]);
      setShowBulkActionsModal(false);
      setSuccessMessage('All selected itineraries duplicated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error duplicating itineraries:', error);
      setErrorMessage('Failed to duplicate some itineraries');
      setShowErrorModal(true);
    }
  };

  const handleBulkSaveAsDraft = async () => {
    try {
      const drafted: any[] = [];
      for (const itineraryId of selectedItineraryIds) {
        const itinerary = savedItineraries.find(i => i.id === itineraryId);
        if (itinerary) {
          await handleSaveAsDraft(itinerary);
          drafted.push(itinerary);
        }
      }
      setLastBulkAction({ action: 'draft', affected: drafted });
      setSelectedItineraryIds([]);
      setShowBulkActionsModal(false);
      
      // Reload itineraries to update UI
      await loadItineraries();
      
      setSuccessMessage('All selected itineraries saved as draft');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving itineraries as draft:', error);
      setErrorMessage('Failed to save some itineraries as draft');
      setShowErrorModal(true);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const deleted: any[] = [];
      for (const itineraryId of selectedItineraryIds) {
        const itinerary = savedItineraries.find(i => i.id === itineraryId);
        if (itinerary) {
          await handleDeleteItinerary(itineraryId);
          deleted.push(itinerary);
        }
      }
      setLastBulkAction({ action: 'delete', affected: deleted });
      setSelectedItineraryIds([]);
      setShowBulkActionsModal(false);
      
      // Force reload itineraries and wait for it to complete
      console.log('🔄 Reloading itineraries after bulk delete...');
      await loadItineraries();
      console.log('✅ Itineraries reloaded after bulk delete');
      
      setSuccessMessage('All selected itineraries deleted successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting itineraries:', error);
      setErrorMessage('Failed to delete some itineraries');
      setShowErrorModal(true);
    }
  };

  const handleExportItineraryCsv = () => {
    // TODO: Implement CSV export functionality
    Alert.alert('Export CSV', 'CSV export functionality coming soon');
  };

  // Undo Last button handler
  const handleUndoLast = async () => {
    if (!lastBulkAction) return;
    
    try {
      if (lastBulkAction.action === 'duplicate') {
        // Remove duplicated itineraries
        for (const it of lastBulkAction.affected) {
          await supabase
            .from('itineraries')
            .delete()
            .eq('id', it.id);
        }
        await loadItineraries();
        setUndoMessage('Duplicated itineraries have been removed.');
      } else if (lastBulkAction.action === 'draft') {
        // Un-draft: set is_draft to false
        for (const it of lastBulkAction.affected) {
          await supabase
            .from('itineraries')
            .update({ is_draft: false })
            .eq('id', it.id);
        }
        await loadItineraries();
        setUndoMessage('Drafts have been restored to active.');
      } else if (lastBulkAction.action === 'delete') {
        // Re-create deleted itineraries
        for (const it of lastBulkAction.affected) {
          const { id, ...rest } = it;
          await supabase
            .from('itineraries')
            .insert(rest);
        }
        await loadItineraries();
        setUndoMessage('Deleted itineraries have been restored.');
      }
      
      setLastBulkAction(null);
      setShowBulkActionsModal(false);
      setSuccessMessage(undoMessage || 'Action undone successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error undoing last action:', error);
      setErrorMessage('Failed to undo last action');
      setShowErrorModal(true);
    }
  };

  const handleDuplicateItinerary = async (itinerary: ItineraryType) => {
    console.log('🚀 DUPLICATE FUNCTION CALLED!');
    console.log('🔍 Starting duplicate process for itinerary:', itinerary.id);
    console.log('🔍 Current user:', currentUser);
    console.log('🔍 Event ID:', eventId);
    
    // Test auth.uid() and user lookup
    try {
      // Check auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 Auth session:', session);
      console.log('🔍 Session error:', sessionError);
      
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 Auth user:', authUser);
      console.log('🔍 Auth user error:', userError);
      
      if (authUser) {
        console.log('🔍 Auth user ID:', authUser.id);
        console.log('🔍 Auth user email:', authUser.email);
        
        // Check if user exists in users table
        const { data: userInTable, error: userTableError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        console.log('🔍 User in table:', userInTable);
        console.log('🔍 User table error:', userTableError);
        
        if (userInTable) {
          console.log('🔍 User company_id in table:', userInTable.company_id);
        }
      } else {
        console.log('❌ No authenticated user found');
      }
    } catch (error) {
      console.log('🔍 Error checking auth:', error);
    }
    
    // Ensure user is loaded
    let user = currentUser;
    if (!user) {
      console.log('🔍 No current user, fetching from getCurrentUser...');
      const userResponse = await getCurrentUser();
      console.log('🔍 User response:', userResponse);
      if (!userResponse.user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      user = userResponse.user;
      setCurrentUser(user);
    }

    console.log('🔍 User object:', user);
    console.log('🔍 User company_id:', user?.company_id);
    console.log('🔍 Event ID:', eventId);

    // Extract the actual user data from the AuthResponse
    const actualUser = user?.user || user;
    console.log('🔍 Actual user data:', actualUser);
    console.log('🔍 Actual user company_id:', actualUser?.company_id);

    if (!eventId) {
      console.log('❌ Missing event information');
      console.log('❌ eventId:', eventId);
      Alert.alert('Error', 'Missing event information');
      return;
    }
    
    try {
      const insertData = {
        event_id: eventId,
        company_id: actualUser?.company_id || '',
        created_by: actualUser?.id || '',
        title: `${itinerary.title} (Copy)`,
        description: itinerary.description || '',
        date: itinerary.date || '',
        arrival_time: itinerary.arrival_time || '',
        start_time: itinerary.start_time || '',
        end_time: itinerary.end_time || '',
        location: itinerary.location || '',
        is_draft: false,
        group_id: itinerary.group_id,
        group_name: itinerary.group_name,
        // Duplicate module data
        document_file_name: itinerary.document_file_name,
        qrcode_url: itinerary.qrcode_url,
        qrcode_image: itinerary.qrcode_image,
        contact_name: itinerary.contact_name,
        contact_country_code: itinerary.contact_country_code,
        contact_phone: itinerary.contact_phone,
        contact_email: itinerary.contact_email,
        notification_times: itinerary.notification_times || [],
        modules: itinerary.modules,
        module_values: itinerary.module_values,
        content: itinerary.content,
      };
      
      console.log('🔍 Inserting duplicate itinerary with data:', insertData);
      
      const { data, error } = await supabase
        .from('itineraries')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Itinerary duplicated successfully:', data);
      
      // Force reload itineraries and wait for it to complete
      console.log('🔄 Reloading itineraries...');
      await loadItineraries();
      console.log('✅ Itineraries reloaded');
      
      setSuccessMessage('Itinerary duplicated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('❌ Error duplicating itinerary:', error);
      setErrorMessage('Failed to duplicate itinerary');
      setShowErrorModal(true);
    }
  };

  const handleDeleteItinerary = async (itineraryId: string) => {
    console.log('🔍 Delete button clicked for itinerary:', itineraryId);
    setItineraryToDelete(itineraryId);
    setShowDeleteItineraryModal(true);
  };

  const confirmDeleteItinerary = async () => {
    if (!itineraryToDelete) return;
    
    try {
      console.log('🔍 Deleting itinerary:', itineraryToDelete);
      const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', itineraryToDelete);

      if (error) throw error;
      
      console.log('✅ Itinerary deleted successfully');
      setShowDeleteItineraryModal(false);
      setItineraryToDelete(null);
      
      // Force reload itineraries and wait for it to complete
      console.log('🔄 Reloading itineraries after delete...');
      await loadItineraries();
      console.log('✅ Itineraries reloaded after delete');
      
      // Small delay to ensure database update is complete
      setTimeout(() => {
        setSuccessMessage('Itinerary deleted successfully');
        setShowSuccessModal(true);
      }, 500);
      
      // Real-time subscription should pick up the change automatically
      console.log('🔄 Waiting for real-time update...');
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      setErrorMessage('Failed to delete itinerary');
      setShowErrorModal(true);
    }
  };

  const handleSaveAsDraft = async (itinerary: ItineraryType) => {
    try {
      console.log('🔍 Saving itinerary as draft:', itinerary.id);
      const { error } = await supabase
        .from('itineraries')
        .update({ is_draft: true })
        .eq('id', itinerary.id);

      if (error) throw error;
      
      console.log('✅ Draft saved successfully');
      
      // Reload itineraries to update UI immediately
      await loadItineraries();
      
      // Small delay to ensure database update is complete
      setTimeout(() => {
        setSuccessMessage('Itinerary saved as draft');
        setShowSuccessModal(true);
      }, 500);
      
      // Real-time subscription should pick up the change automatically
      console.log('🔄 Waiting for real-time update...');
    } catch (error) {
      console.error('Error saving as draft:', error);
      setErrorMessage('Failed to save as draft');
      setShowErrorModal(true);
    }
  };



  // Draft-specific functions
  const handleDeleteDraft = (draftId: string) => {
    setDraftToDelete(draftId);
    setShowDeleteDraftModal(true);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    
    try {
      console.log('🔍 Deleting draft:', draftToDelete);
      const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', draftToDelete);

      if (error) throw error;
      
      console.log('✅ Draft deleted successfully');
      setShowDeleteDraftModal(false);
      setDraftToDelete(null);
      
      // Reload itineraries to update UI immediately
      await loadItineraries();
      
      // Small delay to ensure database update is complete
      setTimeout(() => {
        setSuccessMessage('Draft deleted successfully');
        setShowSuccessModal(true);
      }, 500);
      
      // Real-time subscription should pick up the change automatically
      console.log('🔄 Waiting for real-time update...');
    } catch (error) {
      console.error('Error deleting draft:', error);
      setErrorMessage('Failed to delete draft');
      setShowErrorModal(true);
    }
  };

  const handleEditDraft = (draft: ItineraryType) => {
    setDraftToEdit(draft);
    setShowEditDraftModal(true);
  };

  const handleSaveEditDraft = async (updatedData: Partial<ItineraryType>) => {
    if (!draftToEdit) return;
    
    try {
      const { error } = await supabase
        .from('itineraries')
        .update(updatedData)
        .eq('id', draftToEdit.id);

      if (error) throw error;
      
      setShowEditDraftModal(false);
      setDraftToEdit(null);
      setSuccessMessage('Draft updated successfully');
      setShowSuccessModal(true);
      
      // Reload itineraries
      loadItineraries();
    } catch (error) {
      console.error('Error updating draft:', error);
      setErrorMessage('Failed to update draft');
      setShowErrorModal(true);
    }
  };

  const handlePublishDraft = (draftId: string) => {
    setDraftToPublish(draftId);
    setShowPublishDraftModal(true);
  };

  const confirmPublishDraft = async () => {
    if (!draftToPublish) return;
    
    try {
      const { error } = await supabase
        .from('itineraries')
        .update({ is_draft: false })
        .eq('id', draftToPublish);

      if (error) throw error;
      
      setShowPublishDraftModal(false);
      setDraftToPublish(null);
      setSuccessMessage('Draft published successfully');
      setShowSuccessModal(true);
      
      // Reload itineraries
      loadItineraries();
    } catch (error) {
      console.error('Error publishing draft:', error);
      setErrorMessage('Failed to publish draft');
      setShowErrorModal(true);
    }
  };

  const handleEditEvent = () => {
    setShowEditEventModal(true);
  };

  const handleSaveEditEvent = async (updatedData: Partial<EventType>) => {
    if (!eventId) return;
    
    try {
      const { error } = await supabase
        .from('events')
        .update(updatedData)
        .eq('id', eventId);

      if (error) throw error;
      
      setShowEditEventModal(false);
      setSuccessMessage('Event updated successfully');
      setShowSuccessModal(true);
      
      // Reload event data by refetching
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!eventError && event) {
        setCurrentEvent(event);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      setErrorMessage('Failed to update event');
      setShowErrorModal(true);
    }
  };

  // Guests functions
  const handleDownloadGuestTemplate = () => {
    // TODO: Implement CSV template download
    Alert.alert('Download Template', 'CSV template download coming soon');
  };

  const handleSelectGuest = (guestId: string) => {
    setSelectedGuestIds(prev => 
      prev.includes(guestId) 
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  const handleSelectAllGuests = () => {
    if (allGuestsSelected) {
      setSelectedGuestIds([]);
      setAllGuestsSelected(false);
    } else {
      setSelectedGuestIds(filteredGuests.map(g => g.id));
      setAllGuestsSelected(true);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    setGuestToDelete(guestId);
    setShowDeleteGuestModal(true);
  };

  const confirmDeleteGuest = async () => {
    if (!guestToDelete) return;

    try {
      console.log('🔍 Deleting guest:', guestToDelete);
      
      // 1. First, clean up all guest data using our comprehensive function
      const { data: cleanupResult, error: cleanupError } = await supabase.rpc('delete_guest_completely', {
        p_guest_id: guestToDelete
      });
      
      if (cleanupError) {
        console.error('Error cleaning up guest data:', cleanupError);
        throw new Error(`Failed to clean up guest data: ${cleanupError.message}`);
      }
      
      console.log('Guest data cleanup result:', cleanupResult);
      
      // 2. Then delete the guest record itself
      const { error: deleteError } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestToDelete);

      if (deleteError) {
        console.error('Error deleting guest record:', deleteError);
        throw new Error(`Failed to delete guest record: ${deleteError.message}`);
      }

      console.log('✅ Guest deleted successfully with complete cleanup');
      setShowDeleteGuestModal(false);
      setGuestToDelete(null);

      // Reload guests to update UI immediately
      await loadGuests();

      // Small delay to ensure database update is complete
      setTimeout(() => {
        setSuccessMessage('Guest deleted successfully');
        setShowSuccessModal(true);
      }, 500);

      // Real-time subscription should pick up the change automatically
      console.log('🔄 Waiting for real-time update...');
    } catch (error) {
      console.error('Error deleting guest:', error);
      setErrorMessage('Failed to delete guest');
      setShowErrorModal(true);
    }
  };

  const getAge = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const birthDate = new Date(dateString);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  // Add Ons functions
  const loadSavedAddOns = async () => {
    try {
      const { data, error } = await supabase
        .from('event_addons')
        .select('*')
        .eq('event_id', eventId)
        .eq('enabled', true);

      if (error) throw error;

      if (data) {
        const savedAddOns = data.map(item => {
          const moduleInfo = DASHBOARD_MODULES.addons.find(m => m.key === item.addon_key);
          return {
            key: item.addon_key,
            name: moduleInfo?.label || item.addon_key,
            description: moduleInfo?.description || '',
            id: item.id
          };
        });
        setActiveAddOns(savedAddOns);
      }
    } catch (error) {
      console.error('Error loading saved add-ons:', error);
    }
  };

  const handleSaveAddOns = async () => {
    setIsSavingAddOns(true);
    try {
      const addOnKeys = activeAddOns.map(addon => addon.key);
      await saveEventAddOns(eventId, addOnKeys);
      setSaveAddOnsMessage('Add-ons saved successfully!');
      setTimeout(() => setSaveAddOnsMessage(''), 3000);
    } catch (error) {
      console.error('Error saving add-ons:', error);
      setSaveAddOnsMessage('Failed to save add-ons');
      setTimeout(() => setSaveAddOnsMessage(''), 3000);
    } finally {
      setIsSavingAddOns(false);
    }
  };

  const handleToggleAddOn = (module: any) => {
    const isActive = activeAddOns.some(addon => addon.key === module.key);
    if (isActive) {
      setActiveAddOns(prev => prev.filter(addon => addon.key !== module.key));
    } else {
      setActiveAddOns(prev => [...prev, { key: module.key, name: module.label, description: module.description }]);
    }
  };

  const handleDeleteAddOn = (addonKey: string) => {
    setActiveAddOns(prev => prev.filter(addon => addon.key !== addonKey));
  };

  const saveEventAddOns = async (eventId: string, addOnKeys: string[]) => {
    try {
      // First, delete existing add-ons for this event
      const { error: deleteError } = await supabase
        .from('event_addons')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) throw deleteError;

      // Then insert new add-ons
      if (addOnKeys.length > 0) {
        const addOnsToInsert = addOnKeys.map(key => ({
          event_id: eventId,
          addon_key: key,
          enabled: true
        }));

        const { error: insertError } = await supabase
          .from('event_addons')
          .insert(addOnsToInsert);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error saving event add-ons:', error);
      throw error;
    }
  };

  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === id && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(id)}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === id && styles.activeTabButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </View>
    );
  }

  if (!currentEvent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Event not found</Text>
          <Text style={styles.errorSubtitle}>
            The event you are looking for does not exist or has been deleted.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => onNavigate('events')}
          >
            <Text style={styles.errorButtonText}>Go to Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('events')}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentEvent.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentEvent) }]}>
            <Text style={styles.statusText}>{getEventDisplayStatus(currentEvent)}</Text>
          </View>
        </View>
        
        <View style={styles.eventInfo}>
          <Text style={styles.eventInfoText}>
            <MaterialCommunityIcons name="calendar" size={16} color="#10b981" />
            {' '}{formatDate(currentEvent.from)} - {formatDate(currentEvent.to)}
          </Text>
          
          {currentEvent.location && (
            <Text style={styles.eventInfoText}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#10b981" />
              {' '}{currentEvent.location}
              {currentEvent.time_zone && ` • ${currentEvent.time_zone}`}
            </Text>
          )}
          
          <Text style={styles.eventInfoText}>
            <MaterialCommunityIcons name="account-group" size={16} color="#10b981" />
            {' '}{assignedTeam ? assignedTeam.name : 'No team assigned'}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TabButton id="settings" label="Dashboard" />
        <TabButton id="itineraries" label="Itineraries" />
        <TabButton id="guests" label="Guests" />
        <TabButton id="addons" label="Add Ons" />
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'settings' && (
          <View style={styles.tabContent}>
            {/* Event Action Buttons */}
            <View style={styles.eventActionButtons}>
              <TouchableOpacity
                style={[
                  styles.eventActionButton,
                  currentEvent.status === 'launched' && styles.eventActionButtonLaunched
                ]}
                onPress={async () => {
                  console.log('🔍 Launch Event button pressed');
                  console.log('🔍 Current event status:', currentEvent?.status);
                  console.log('🔍 Event ID:', eventId);
                  
                  console.log('🔍 Navigating to event-launcher with eventId:', eventId);
                  onNavigate('event-launcher', { eventId });
                }}
              >
                <Text style={[
                  styles.eventActionButtonText,
                  currentEvent.status === 'launched' && styles.eventActionButtonTextLaunched
                ]}>
                  {currentEvent.status === 'launched' ? 'Event Launched' : 'Launch Event'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.eventActionButton}
                onPress={handleEditEvent}
              >
                <Text style={styles.eventActionButtonText}>Edit Event</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => onNavigate('export-report', { eventId })}
                >
                  <MaterialCommunityIcons name="file-export" size={24} color="#10b981" />
                  <Text style={styles.quickActionText}>Export Report</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => setShowAnnouncementModal(true)}
                >
                  <MaterialCommunityIcons name="bullhorn" size={24} color="#10b981" />
                  <Text style={styles.quickActionText}>Send Announcement</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => onNavigate('guest-form-responses', { eventId })}
                >
                  <MaterialCommunityIcons name="clipboard-text" size={24} color="#10b981" />
                  <Text style={styles.quickActionText}>Guest Form Responses</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.quickActionButton,
                    currentEvent && currentEvent.status !== 'launched' && styles.disabledButton
                  ]}
                  onPress={() => {
                    // Allow access if event is launched, or if currentEvent is null (fallback)
                    if (!currentEvent || currentEvent.status === 'launched') {
                      console.log('🔍 Event Portal button pressed');
                      console.log('🔍 Current event status:', currentEvent?.status);
                      onNavigate('event-portal-management', { 
                        eventId, 
                        activeAddOns,
                        guests,
                        itineraries: savedItineraries
                      });
                    } else {
                      console.log('🔍 Event Portal disabled - event not launched');
                    }
                  }}
                  disabled={currentEvent && currentEvent.status !== 'launched'}
                >
                  <MaterialCommunityIcons name="satellite" size={24} color="#10b981" />
                  <Text style={styles.quickActionText}>Event Portal</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                {/* Guests Card */}
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <MaterialCommunityIcons name="account-group" size={32} color="#3b82f6" />
                    <Text style={styles.statNumber}>{guests.length}</Text>
                  </View>
                  <Text style={styles.statLabel}>Total Guests</Text>
                  <View style={styles.statDetails}>
                    <Text style={styles.statDetail}>
                      Male: {guests.filter(g => g.gender === 'Male').length}
                    </Text>
                    <Text style={styles.statDetail}>
                      Female: {guests.filter(g => g.gender === 'Female').length}
                    </Text>
                  </View>
                </View>

                {/* Itineraries Card */}
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <MaterialCommunityIcons name="clipboard-list" size={32} color="#10b981" />
                    <Text style={styles.statNumber}>{savedItineraries.length}</Text>
                  </View>
                  <Text style={styles.statLabel}>Active Itineraries</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '75%' }]} />
                  </View>
                  <Text style={styles.progressText}>75% Complete</Text>
                </View>

                {/* Active Add-ons Card */}
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <MaterialCommunityIcons name="puzzle" size={32} color="#8b5cf6" />
                    <Text style={styles.statNumber}>{activeAddOns.length}</Text>
                  </View>
                  <Text style={styles.statLabel}>Active Add-ons</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '75%' }]} />
                  </View>
                  <Text style={styles.progressText}>75% Complete</Text>
                </View>
              </View>
            </View>

            {/* Guest Journey Checkpoints */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Guest Journey</Text>
              <View style={styles.checkpointsContainer}>
                <View style={styles.checkpoint}>
                  <View style={styles.checkpointIcon}>
                    <MaterialCommunityIcons name="airplane" size={20} color="#fff" />
                  </View>
                  <View style={styles.checkpointContent}>
                    <Text style={styles.checkpointTitle}>Flight Status</Text>
                    <Text style={styles.checkpointSubtitle}>Landing & Arrival</Text>
                    <View style={styles.checkpointProgress}>
                      <Text style={styles.checkpointText}>12/15 Flights Landed</Text>
                      <View style={styles.checkpointBar}>
                        <View style={[styles.checkpointFill, { width: '80%' }]} />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.checkpoint}>
                  <View style={[styles.checkpointIcon, { backgroundColor: '#444' }]}>
                    <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
                  </View>
                  <View style={styles.checkpointContent}>
                    <Text style={styles.checkpointTitle}>Security</Text>
                    <Text style={styles.checkpointSubtitle}>Customs & Immigration</Text>
                    <View style={styles.checkpointProgress}>
                      <Text style={styles.checkpointText}>8/10 Through Security</Text>
                      <View style={styles.checkpointBar}>
                        <View style={[styles.checkpointFill, { width: '80%' }]} />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.checkpoint}>
                  <View style={[styles.checkpointIcon, { backgroundColor: '#555' }]}>
                    <MaterialCommunityIcons name="car" size={20} color="#fff" />
                  </View>
                  <View style={styles.checkpointContent}>
                    <Text style={styles.checkpointTitle}>Transportation</Text>
                    <Text style={styles.checkpointSubtitle}>Driver Assignment</Text>
                    <View style={styles.checkpointProgress}>
                      <Text style={styles.checkpointText}>6/8 With Driver</Text>
                      <View style={styles.checkpointBar}>
                        <View style={[styles.checkpointFill, { width: '75%' }]} />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.checkpoint}>
                  <View style={[styles.checkpointIcon, { backgroundColor: '#666' }]}>
                    <MaterialCommunityIcons name="bed" size={20} color="#fff" />
                  </View>
                  <View style={styles.checkpointContent}>
                    <Text style={styles.checkpointTitle}>Accommodation</Text>
                    <Text style={styles.checkpointSubtitle}>Hotel Check-in</Text>
                    <View style={styles.checkpointProgress}>
                      <Text style={styles.checkpointText}>5/6 Checked In</Text>
                      <View style={styles.checkpointBar}>
                        <View style={[styles.checkpointFill, { width: '83%' }]} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Live Activity Feed */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionTitle}>Live Activity</Text>
                <TouchableOpacity onPress={() => onNavigate('notifications', { eventId })} style={{ padding: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <MaterialCommunityIcons name="bell-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.activityContainer}>
                {activityLoading ? (
                  <Text style={styles.activitySubtitle}>Loading…</Text>
                ) : activityFeed.length === 0 ? (
                  <Text style={styles.activitySubtitle}>No recent activity</Text>
                ) : (
                  activityFeed.map((a, idx) => {
                    const friendly = (() => {
                      const actor = a.details?.actor_name || a.details?.sender_name || a.details?.event_title || 'Someone';
                      switch (a.action_type) {
                        case 'chat_message': return `${actor} sent a message…`;
                        case 'chat_attachment': return `${actor} shared an attachment`;
                        case 'chat_reaction': return `${actor} reacted in chat`;
                        case 'module_response': return `${actor} submitted a module response`;
                        case 'timeline_checkpoint': return `${actor || 'Participant'} reached a checkpoint`;
                        default: return (a.action_type || '').replace(/_/g, ' ');
                      }
                    })();
                    return (
                      <View key={a.id || idx} style={styles.activityItem}>
                        <View style={styles.activityDot} />
                        <View style={styles.activityContent}>
                          <Text style={styles.activityTitle}>{friendly}</Text>
                          <Text style={styles.activitySubtitle}>{new Date(a.created_at).toLocaleString()}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* Event Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Settings</Text>
              <View style={styles.settingsContainer}>
                <TouchableOpacity
                  style={styles.settingButton}
                  onPress={() => onNavigate('notification-settings', { eventId })}
                >
                  <MaterialCommunityIcons name="bell" size={20} color="#10b981" />
                  <Text style={styles.settingText}>Notification Settings</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingButton}>
                  <MaterialCommunityIcons name="shield" size={20} color="#10b981" />
                  <Text style={styles.settingText}>Privacy Settings</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingButton}>
                  <MaterialCommunityIcons name="download" size={20} color="#10b981" />
                  <Text style={styles.settingText}>Data Export</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Danger Zone */}
              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>
                <Text style={styles.dangerSubtitle}>
                  Deleting this event is permanent and cannot be undone.
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setShowDeleteModal(true)}
                >
                  <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete Event</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'itineraries' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Itineraries</Text>
            
            {/* Top Controls */}
            <View style={styles.itineraryControls}>
              <View style={styles.controlButtons}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    if (!isItinerarySelectModeActive) {
                      // First click: Enter select mode
                      setIsItinerarySelectModeActive(true);
                    } else {
                      // Second click: Show bulk actions modal
                      setShowBulkActionsModal(true);
                    }
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {!isItinerarySelectModeActive ? 'Select' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleExportItineraryCsv}
                >
                  <Text style={styles.secondaryButtonText}>Export CSV</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => onNavigate('create-itinerary', { eventId })}
                >
                  <Text style={styles.primaryButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort Controls */}
            <View style={styles.sortControls}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setItineraryDateSort(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                <Text style={styles.sortButtonText}>
                  Date {itineraryDateSort === 'asc' ? '↑' : '↓'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selection Indicator */}
            {isItinerarySelectModeActive && selectedItineraryIds.length > 0 && (
              <View style={styles.selectionIndicator}>
                <Text style={styles.selectionText}>
                  {selectedItineraryIds.length} itinerary(s) selected
                </Text>
              </View>
            )}

            {/* Itineraries List */}
            <View style={styles.itinerariesList}>
              {savedItineraries.length === 0 ? (
                <Text style={styles.emptyStateText}>No itineraries yet.</Text>
              ) : (
                <>
                  {/* Render grouped itineraries */}
                  {Object.entries(groupedItineraries)
                    .filter(([groupId]) => groupId !== 'ungrouped')
                    .map(([groupId, groupItems]) => (
                      <View key={groupId} style={styles.itineraryGroup}>
                        <View style={styles.groupHeader}>
                          <Text style={styles.groupLabel}>GROUP</Text>
                          <Text style={styles.groupName}>
                            {groupItems[0]?.group_name || 'Unnamed Group'}
                          </Text>
                          <Text style={styles.groupCount}>
                            {groupItems.length} item{groupItems.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        
                        {groupItems.map((itinerary) => (
                          <TouchableOpacity
                            key={itinerary.id}
                            style={[
                              styles.itineraryCard,
                              isItinerarySelectModeActive && selectedItineraryIds.includes(itinerary.id) && styles.selectedItineraryCard
                            ]}
                            onPress={() => {
                              if (isItinerarySelectModeActive) {
                                handleSelectItinerary(itinerary.id);
                              }
                            }}
                          >
                            <View style={styles.itineraryContent}>
                              <View style={styles.itineraryHeader}>
                                <Text style={styles.itineraryTitle}>{itinerary.title}</Text>
                                <Text style={styles.itineraryDate}>
                                  {formatDate(itinerary.date)}
                                </Text>
                              </View>
                              
                              <View style={styles.itineraryActions}>
                                <TouchableOpacity
                                  style={styles.actionButton}
                                  onPress={() => onNavigate('CreateItinerary', { eventId, itineraryId: itinerary.id })}
                                >
                                  <MaterialCommunityIcons name="pencil" size={16} color="#10b981" />
                                  <Text style={styles.actionButtonText}>Edit</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.actionButton}
                                  onPress={() => handleDuplicateItinerary(itinerary)}
                                >
                                  <MaterialCommunityIcons name="content-copy" size={16} color="#10b981" />
                                  <Text style={styles.actionButtonText}>Duplicate</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.actionButton}
                                  onPress={() => handleSaveAsDraft(itinerary)}
                                >
                                  <MaterialCommunityIcons name="file-document-outline" size={16} color="#10b981" />
                                  <Text style={styles.actionButtonText}>Draft</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={[styles.actionButton, styles.deleteActionButton]}
                                  onPress={() => handleDeleteItinerary(itinerary.id)}
                                >
                                  <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                                  <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  
                  {/* Render ungrouped itineraries as individual items */}
                  {groupedItineraries['ungrouped']?.map((itinerary) => (
                    <TouchableOpacity
                      key={itinerary.id}
                      style={[
                        styles.itineraryCard,
                        isItinerarySelectModeActive && selectedItineraryIds.includes(itinerary.id) && styles.selectedItineraryCard
                      ]}
                      onPress={() => {
                        if (isItinerarySelectModeActive) {
                          handleSelectItinerary(itinerary.id);
                        }
                      }}
                    >
                      <View style={styles.itineraryContent}>
                        <View style={styles.itineraryHeader}>
                          <Text style={styles.itineraryTitle}>{itinerary.title}</Text>
                          <Text style={styles.itineraryDate}>
                            {formatDate(itinerary.date)}
                          </Text>
                        </View>
                        
                        <View style={styles.itineraryActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => onNavigate('CreateItinerary', { eventId, itineraryId: itinerary.id })}
                          >
                            <MaterialCommunityIcons name="pencil" size={16} color="#10b981" />
                            <Text style={styles.actionButtonText}>Edit</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDuplicateItinerary(itinerary)}
                          >
                            <MaterialCommunityIcons name="content-copy" size={16} color="#10b981" />
                            <Text style={styles.actionButtonText}>Duplicate</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleSaveAsDraft(itinerary)}
                          >
                            <MaterialCommunityIcons name="file-document-outline" size={16} color="#10b981" />
                            <Text style={styles.actionButtonText}>Draft</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.actionButton, styles.deleteActionButton]}
                            onPress={() => handleDeleteItinerary(itinerary.id)}
                          >
                            <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                            <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Drafts Section */}
              {draftItineraries.length > 0 && (
                <View style={styles.draftsSection}>
                  <Text style={styles.sectionTitle}>Drafts</Text>
                  <View style={styles.draftsList}>
                    {draftItineraries.map((draft) => (
                      <View key={draft.id} style={styles.draftCard}>
                        <View style={styles.draftContent}>
                          <View style={styles.draftHeader}>
                            <Text style={styles.draftTitle}>{draft.title}</Text>
                            <Text style={styles.draftDate}>
                              {formatDate(draft.date)}
                            </Text>
                          </View>
                          
                          <View style={styles.draftActions}>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleEditDraft(draft)}
                            >
                              <MaterialCommunityIcons name="pencil" size={16} color="#10b981" />
                              <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handlePublishDraft(draft.id)}
                            >
                              <MaterialCommunityIcons name="publish" size={16} color="#10b981" />
                              <Text style={styles.actionButtonText}>Publish</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={[styles.actionButton, styles.deleteActionButton]}
                              onPress={() => handleDeleteDraft(draft.id)}
                            >
                              <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                              <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'guests' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Guest List</Text>
            
            {/* Top Controls */}
            <View style={styles.guestControls}>
              <View style={styles.controlButtons}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => onNavigate('send-form', { eventId })}
                >
                  <Text style={styles.secondaryButtonText}>Send Form</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => onNavigate('upload-guests', { eventId })}
                >
                  <Text style={styles.secondaryButtonText}>Upload CSV</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => onNavigate('add-guests', { eventId })}
                >
                  <Text style={styles.primaryButtonText}>Add Guests</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search and Filter Controls */}
            <View style={styles.guestSearchControls}>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Guest"
                  placeholderTextColor="#888"
                  value={guestSearchQuery}
                  onChangeText={setGuestSearchQuery}
                />
              </View>
              

            </View>

            {/* Guest Selection Indicator */}
            {isGuestSelectModeActive && selectedGuestIds.length > 0 && (
              <View style={styles.selectionIndicator}>
                <Text style={styles.selectionText}>
                  {selectedGuestIds.length} guest(s) selected
                </Text>
                <View style={styles.selectionButtons}>
                  <TouchableOpacity
                    style={styles.unselectButton}
                    onPress={() => setSelectedGuestIds([])}
                  >
                    <Text style={styles.unselectButtonText}>Unselect</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bulkDeleteButton}
                    onPress={() => setShowBulkDeleteGuestsConfirm(true)}
                  >
                    <Text style={styles.bulkDeleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Guests List */}
            <View style={styles.guestsList}>
              {filteredGuests.length === 0 ? (
                <Text style={styles.emptyStateText}>No guests found.</Text>
              ) : (
                Object.entries(groupedGuests).map(([groupId, groupGuests]) => {
                  // Only show group header if it's a real group with a name
                  const isRealGroup = groupId !== 'ungrouped' && groupGuests[0]?.groupName;
                  
                  return (
                    <View key={groupId} style={styles.guestGroup}>
                      {isRealGroup && (
                        <View style={styles.groupHeader}>
                          <Text style={styles.groupLabel}>GROUP</Text>
                          <Text style={styles.groupName}>
                            {groupGuests[0]?.groupName}
                          </Text>
                          <Text style={styles.groupCount}>
                            {groupGuests.length} guest{groupGuests.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      
                      {groupGuests.map((guest) => (
                        <View key={guest.id} style={styles.guestCard}>
                          {isGuestSelectModeActive && (
                            <TouchableOpacity
                              style={styles.checkbox}
                              onPress={() => handleSelectGuest(guest.id)}
                            >
                              <MaterialCommunityIcons
                                name={selectedGuestIds.includes(guest.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                size={20}
                                color="#10b981"
                              />
                            </TouchableOpacity>
                          )}
                          
                          <View style={styles.guestContent}>
                            <View style={styles.guestHeader}>
                              <Text style={styles.guestName}>
                                {guest.firstName} {guest.lastName}
                              </Text>
                              <Text style={styles.guestEmail}>{guest.email}</Text>
                            </View>
                            
                            <View style={styles.guestDetails}>
                              <Text style={styles.guestDetail}>
                                {guest.countryCode} • {guest.contactNumber}
                              </Text>
                              <Text style={styles.guestDetail}>
                                {guest.gender} • {getAge(guest.dob)}
                              </Text>
                            </View>
                            
                            <View style={styles.guestActions}>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => onNavigate('CreateGuests', { eventId, guestId: guest.id })}
                              >
                                <MaterialCommunityIcons name="pencil" size={16} color="#10b981" />
                                <Text style={styles.actionButtonText}>Edit</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={[styles.actionButton, styles.deleteActionButton]}
                                onPress={() => handleDeleteGuest(guest.id)}
                              >
                                <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                                <Text style={[styles.actionButtonText, styles.deleteActionText]}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {activeTab === 'addons' && (
          <View style={styles.tabContent}>
            <View style={styles.addOnsHeader}>
              <Text style={styles.sectionTitle}>Add Ons</Text>
              <TouchableOpacity
                style={styles.saveAddOnsButton}
                onPress={handleSaveAddOns}
                disabled={isSavingAddOns}
              >
                <Text style={styles.saveAddOnsButtonText}>
                  {isSavingAddOns ? 'Saving...' : 'Save Add-Ons'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Active Add Ons List */}
            {activeAddOns.length > 0 && (
              <View style={styles.activeAddOnsList}>
                <Text style={styles.activeAddOnsTitle}>Active Apps</Text>
                {activeAddOns.map((addon, index) => (
                  <View key={index} style={styles.addOnCard}>
                    <View style={styles.addOnHeader}>
                      <Text style={styles.addOnTitle}>{addon.name}</Text>
                      <TouchableOpacity
                        style={styles.deleteAddOnButton}
                        onPress={() => handleDeleteAddOn(addon.key)}
                      >
                        <MaterialCommunityIcons name="close" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.addOnDescription}>{addon.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Available Add Ons */}
            <View style={styles.availableAddOns}>
              <Text style={styles.availableTitle}>Available Apps</Text>
              <View style={styles.addOnsGrid}>
                {DASHBOARD_MODULES.addons.map((module) => {
                  const isActive = activeAddOns.some(addon => 
                    addon.key === module.key || addon.name === module.key
                  );
                  
                  return (
                    <TouchableOpacity
                      key={module.key}
                      style={[
                        styles.addOnModule,
                        isActive && styles.addOnModuleActive
                      ]}
                      onPress={() => handleToggleAddOn(module)}
                      disabled={isActive}
                    >
                      <View style={styles.addOnModuleContent}>
                        <View style={styles.addOnModuleHeader}>
                          <MaterialCommunityIcons name={module.icon as any} size={20} color="#10b981" />
                          <Text style={styles.addOnModuleTitle}>{module.label}</Text>
                        </View>
                        <Text style={styles.addOnModuleDescription}>{module.description}</Text>
                      </View>
                      {!isActive && (
                        <TouchableOpacity
                          style={styles.addOnPlusButton}
                          onPress={() => handleToggleAddOn(module)}
                        >
                          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                        </TouchableOpacity>
                      )}
                      {isActive && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color="#10b981"
                          style={styles.addOnCheckIcon}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Message */}
            {saveAddOnsMessage && (
              <Text style={styles.saveMessage}>{saveAddOnsMessage}</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bulk Actions Modal */}
      <Modal
        visible={showBulkActionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBulkActionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bulk Actions</Text>
            <Text style={styles.modalMessage}>
              {selectedItineraryIds.length} itinerary(s) selected
            </Text>
            
            <View style={styles.bulkActionsContainer}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={handleBulkDuplicate}
              >
                <MaterialCommunityIcons name="content-copy" size={20} color="#10b981" />
                <Text style={styles.bulkActionButtonText}>Duplicate All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => {
                  // TODO: Implement share functionality
                  setSuccessMessage('Share functionality coming soon');
                  setShowSuccessModal(true);
                  setShowBulkActionsModal(false);
                }}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="#10b981" />
                <Text style={styles.bulkActionButtonText}>Share All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={handleBulkSaveAsDraft}
              >
                <MaterialCommunityIcons name="file-document-outline" size={20} color="#10b981" />
                <Text style={styles.bulkActionButtonText}>Save All as Draft</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.bulkActionDeleteButton]}
                onPress={handleBulkDelete}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                <Text style={[styles.bulkActionButtonText, styles.bulkActionDeleteButtonText]}>Delete All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.bulkActionButton,
                  !lastBulkAction && styles.disabledButton
                ]}
                onPress={handleUndoLast}
                disabled={!lastBulkAction}
              >
                <MaterialCommunityIcons 
                  name="undo" 
                  size={20} 
                  color={lastBulkAction ? "#10b981" : "#6b7280"} 
                />
                <Text style={[
                  styles.bulkActionButtonText,
                  !lastBulkAction && styles.disabledButtonText
                ]}>Undo Last</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => {
                  setShowBulkActionsModal(false);
                  setIsItinerarySelectModeActive(false);
                  setSelectedItineraryIds([]);
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
                <Text style={styles.bulkActionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Itinerary Confirmation Modal */}
      <Modal
        visible={showDeleteItineraryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteItineraryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this itinerary? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteItineraryModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDeleteItinerary}
              >
                <Text style={styles.modalDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* Delete Draft Confirmation Modal */}
      <Modal
        visible={showDeleteDraftModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteDraftModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this draft? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteDraftModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDeleteDraft}
              >
                <Text style={styles.modalDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Draft Modal */}
      <Modal
        visible={showEditDraftModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditDraftModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Draft</Text>
            {draftToEdit && (
              <EditItineraryForm
                itinerary={draftToEdit}
                onSave={handleSaveEditDraft}
                onCancel={() => setShowEditDraftModal(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Publish Draft Confirmation Modal */}
      <Modal
        visible={showPublishDraftModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPublishDraftModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10b981" />
            <Text style={styles.modalTitle}>Publish Draft</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to publish this draft? It will become a live itinerary.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPublishDraftModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmPublishDraft}
              >
                <Text style={styles.modalDeleteButtonText}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10b981" />
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditEventModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Event</Text>
            {currentEvent && (
              <EditEventForm
                event={currentEvent}
                onSave={handleSaveEditEvent}
                onCancel={() => setShowEditEventModal(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Event Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this event? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={async () => {
                  try {
                    console.log('Attempting to delete event:', eventId);
                    await deleteEvent(eventId);
                    console.log('Event deleted successfully');
                    setShowDeleteModal(false);
                    setShowSuccessModal(true);
                    
                    // Set a timeout to show fallback screen if UI doesn't update
                    setTimeout(() => {
                      setShowFallbackScreen(true);
                    }, 3000); // 3 seconds fallback
                  } catch (error) {
                    console.error('Failed to delete event:', error);
                    Alert.alert('Error', 'Failed to delete event. Please try again.');
                  }
                }}
              >
                <Text style={styles.modalDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          onNavigate('events');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
              <Text style={styles.modalTitle}>Success</Text>
            </View>
            <Text style={styles.modalMessage}>Event deleted successfully</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSuccessButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  onNavigate('events');
                }}
              >
                <Text style={styles.modalSuccessButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fallback Screen */}
      <Modal
        visible={showFallbackScreen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowFallbackScreen(false)}
      >
        <View style={styles.fallbackContainer}>
          {/* Header with hamburger menu */}
          <View style={styles.fallbackHeader}>
            <TouchableOpacity 
              style={styles.fallbackCloseButton}
              onPress={() => setShowFallbackScreen(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fallbackTitle}>Event Deletion</Text>
            <TouchableOpacity 
              style={styles.fallbackMenuButton}
              onPress={() => onNavigate('admin-dashboard')}
            >
              <MaterialCommunityIcons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.fallbackContent}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10b981" />
            <Text style={styles.fallbackMainTitle}>Event Deleted Successfully</Text>
            <Text style={styles.fallbackMessage}>
              The event has been deleted from the database. If you're still seeing it in the UI, 
              please refresh the app or navigate away and back to see the updated list.
            </Text>
            
            <View style={styles.fallbackButtons}>
              <TouchableOpacity
                style={styles.fallbackPrimaryButton}
                onPress={() => {
                  setShowFallbackScreen(false);
                  onNavigate('events');
                }}
              >
                <Text style={styles.fallbackPrimaryButtonText}>Go to Events</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.fallbackSecondaryButton}
                onPress={() => {
                  setShowFallbackScreen(false);
                  onNavigate('admin-dashboard');
                }}
              >
                <Text style={styles.fallbackSecondaryButtonText}>Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Announcement Modal */}
      <AnnouncementModal
        isVisible={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        eventId={eventId}
        onSuccess={() => {
          console.log('Announcement sent successfully');
          // You can add a success message or refresh data here
        }}
      />

      {/* Delete Guest Confirmation Modal */}
      <Modal
        visible={showDeleteGuestModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteGuestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this guest? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteGuestModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDeleteGuest}
              >
                <Text style={styles.modalDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Draft Confirmation Modal */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  eventInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 8,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#10b981',
  },
  tabButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 0,
  },
  quickActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '48%',
    height: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  statDetails: {
    gap: 4,
  },
  statDetail: {
    color: '#888',
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    color: '#888',
    fontSize: 12,
  },
  statusDescription: {
    color: '#888',
    fontSize: 14,
  },
  checkpointsContainer: {
    gap: 16,
  },
  checkpoint: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkpointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkpointContent: {
    flex: 1,
  },
  checkpointTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  checkpointSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  checkpointProgress: {
    gap: 4,
  },
  checkpointText: {
    color: '#aaa',
    fontSize: 12,
  },
  checkpointBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
  },
  checkpointFill: {
    height: 6,
    backgroundColor: '#ccc',
    borderRadius: 3,
  },
  activityContainer: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activitySubtitle: {
    color: '#888',
    fontSize: 12,
  },
  settingsContainer: {
    gap: 8,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  dangerZone: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerTitle: {
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dangerSubtitle: {
    color: '#fecaca',
    fontSize: 13,
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  deleteButtonText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoon: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  modalMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSuccessButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSuccessButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  eventActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '48%',
  },
  eventActionButtonLaunched: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  eventActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  eventActionButtonTextLaunched: {
    color: '#fff',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  fallbackCloseButton: {
    padding: 8,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  fallbackMenuButton: {
    padding: 8,
  },
  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fallbackMainTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  fallbackMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  fallbackButtons: {
    width: '100%',
    gap: 16,
  },
  fallbackPrimaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  fallbackPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackSecondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fallbackSecondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Itineraries styles
  itineraryControls: {
    marginBottom: 16,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  sortControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  sortButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sortButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionIndicator: {
    backgroundColor: 'rgba(254, 226, 226, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  unselectButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#000',
  },
  unselectButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  bulkDeleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bulkDeleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itinerariesList: {
    gap: 16,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  itineraryGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  groupLabel: {
    backgroundColor: '#666',
    color: '#fff',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  groupName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  groupCount: {
    color: '#ccc',
    fontSize: 12,
  },
  itineraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  checkbox: {
    marginRight: 12,
  },
  itineraryContent: {
    flex: 1,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itineraryTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  itineraryDate: {
    color: '#888',
    fontSize: 12,
  },
  itineraryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionButtonText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteActionText: {
    color: '#ef4444',
  },
  // Guests styles
  guestControls: {
    marginBottom: 16,
  },
  guestSearchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  guestsList: {
    gap: 16,
  },
  guestGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  guestContent: {
    flex: 1,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  guestName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  guestEmail: {
    color: '#888',
    fontSize: 12,
  },
  guestDetails: {
    marginBottom: 8,
  },
  guestDetail: {
    color: '#ccc',
    fontSize: 11,
  },
  guestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  // Add Ons styles
  addOnsDropZone: {
    borderWidth: 2,
    borderColor: '#888',
    borderStyle: 'dashed',
    borderRadius: 12,
    minHeight: 100,
    padding: 24,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  saveAddOnsButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: 150,
    flexShrink: 0,
  },
  saveAddOnsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 0,
  },
  saveMessage: {
    textAlign: 'center',
    color: '#10b981',
    marginBottom: 16,
    fontWeight: '600',
  },
  activeAddOnsList: {
    gap: 8,
    marginBottom: 24,
  },
  addOnCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addOnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addOnTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addOnDescription: {
    color: '#ccc',
    fontSize: 12,
  },
  deleteAddOnButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  availableAddOns: {
    marginTop: 16,
  },
  availableTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  addOnsGrid: {
    gap: 8,
  },
  addOnModule: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addOnModuleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  addOnModuleContent: {
    flex: 1,
  },
  addOnModuleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  addOnModuleTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  addOnModuleDescription: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  addOnCheckIcon: {
    marginLeft: 8,
  },
  activeAddOnsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  addOnPlusButton: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addOnsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Bulk Actions Modal styles
  bulkActionsContainer: {
    gap: 12,
    marginTop: 20,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  bulkActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bulkActionDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bulkActionDeleteButtonText: {
    color: '#ef4444',
  },
  // Edit Itinerary Form styles
  editFormContainer: {
    gap: 16,
    marginTop: 20,
  },
  editFormInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  editFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  // Draft section styles
  draftsSection: {
    marginTop: 20,
  },
  draftsList: {
    gap: 12,
  },
  draftCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  draftContent: {
    gap: 12,
  },
  draftHeader: {
    gap: 4,
  },
  draftTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  draftDate: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },
  draftActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  selectedItineraryCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  disabledButtonText: {
    color: '#6b7280',
  },
}); 