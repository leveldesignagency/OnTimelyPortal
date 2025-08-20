import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';


// Types
type ActivityType = {
  id: string;
  action_type: string;
  user_id: string;
  event_id?: string;
  created_at: string;
  details?: any;
};

type EventType = {
  id: string;
  name: string;
};



interface NotificationsPageProps {
  eventId?: string;
  onNavigate: (route: string, params?: any) => void;
}

export default function NotificationsPage({ eventId, onNavigate }: NotificationsPageProps) {
  const insets = useSafeAreaInsets();
  
  console.log('🔍 NotificationsPage: Received eventId:', eventId);
  
  const [activity, setActivity] = useState<ActivityType[]>([]);
  const [filtered, setFiltered] = useState<ActivityType[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [events, setEvents] = useState<EventType[]>([]);

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const colors = {
    bg: '#181A20',
    card: 'rgba(255, 255, 255, 0.05)',
    text: '#fff',
    textSecondary: '#888',
    border: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.1)',
    primary: '#10b981',
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return onNavigate('login');
      }
      setCurrentUser(user);
      
      // Get company_id the same way EventDashboard does
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.user?.id || '').single();
      const companyId = profile?.company_id;
      
      console.log('🔍 NotificationsPage: Fetching activity feed for eventId:', eventId, 'companyId:', companyId);
      
      if (eventId) {
        // If we have an eventId, use the RPC function to get comprehensive data (same as EventDashboard)
        const { data: logs, error: logsError } = await supabase.rpc('get_event_activity_feed', {
          p_event_id: eventId,
          p_company_id: companyId,
          p_limit: 100,
          p_offset: 0,
        });
        
        if (logsError) {
          console.error('Error fetching activity feed:', logsError);
          // Fallback to activity_log if RPC fails
          const { data: fallbackLogs } = await supabase
            .from('activity_log')
            .select('*')
            .eq('company_id', companyId)
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
          setActivity(fallbackLogs || []);
          setFiltered(fallbackLogs || []);
        } else {
          console.log('🔍 NotificationsPage: RPC returned', logs?.length || 0, 'items');
          // Transform the RPC data to match the expected format
          const transformedLogs = (logs || []).map((item: any) => ({
            id: `${item.item_type}-${item.source_id}`,
            action_type: item.item_type,
            user_id: null, // RPC doesn't return user_id
            event_id: eventId,
            created_at: item.created_at,
            details: {
              event_title: item.title || item.description || 'Unknown',
              actor_name: item.actor_name || 'Unknown',
              description: item.description,
            },
          }));
          setActivity(transformedLogs);
          setFiltered(transformedLogs);
        }
      } else {
        // If no eventId, fallback to activity_log for all company activity
        console.log('🔍 NotificationsPage: No eventId, falling back to activity_log');
        const { data: fallbackLogs } = await supabase
          .from('activity_log')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        setActivity(fallbackLogs || []);
        setFiltered(fallbackLogs || []);
      }
      
      // Fetch events
      const { data: eventList } = await supabase
        .from('events')
        .select('id, name')
        .eq('company_id', companyId);
      setEvents(eventList || []);
      

      setLoading(false);
    })();
  }, [onNavigate]);



  // Auto-select event filter if eventId is provided
  useEffect(() => {
    if (eventId && events.length > 0) {
      console.log('🔍 NotificationsPage: Auto-selecting event filter for eventId:', eventId);
      setEventFilter(eventId);
    }
  }, [eventId, events]);

  // Filtering and search
  useEffect(() => {
    let data = [...activity];
    if (typeFilter) data = data.filter(a => a.action_type === typeFilter);
    if (eventFilter) data = data.filter(a => a.event_id === eventFilter);
    if (userFilter) data = data.filter(a => a.details?.actor_name === userFilter);
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(a =>
        (a.details?.event_title || '').toLowerCase().includes(s) ||
        (a.action_type || '').toLowerCase().includes(s) ||
        (a.details?.description || '').toLowerCase().includes(s) ||
        (a.details?.actor_name || '').toLowerCase().includes(s)
      );
    }
    setFiltered(data);
  }, [activity, typeFilter, eventFilter, userFilter, search]);



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
      case 'message': return 'sent a message';
      case 'chat_attachment': return 'shared an attachment';
      case 'chat_reaction': return 'reacted in chat';
      case 'module_response': return 'submitted a module response';
      case 'module_answer': return 'submitted a module response';
      case 'timeline_checkpoint': return 'reached a checkpoint';
      case 'announcement': return 'made an announcement';
      case 'itinerary': return 'updated itinerary';
      case 'form_submission': return 'submitted a form';
      default: return type.replace(/_/g, ' ');
    }
  };

  // Utility for relative time
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return then.toLocaleDateString();
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setEventFilter('');
    setUserFilter('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (typeFilter) count++;
    if (eventFilter) count++;
    if (userFilter) count++;
    if (search) count++;
    return count;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => onNavigate('back')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity 
          style={styles.filtersButton} 
          onPress={() => setShowFiltersModal(true)}
        >
          <MaterialCommunityIcons name="filter-variant" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: colors.card, 
            color: colors.text, 
            borderColor: colors.border 
          }]}
          placeholder="Search notifications..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading notifications...
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-off" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {getActiveFiltersCount() > 0 ? 'Try adjusting your filters' : 'You\'re all caught up!'}
            </Text>
          </View>
        ) : (
          filtered.map((a, idx) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.notificationItem, { 
                backgroundColor: colors.card, 
                borderBottomColor: colors.border 
              }]}
              onPress={() => {
                if (a.event_id) onNavigate('event-dashboard', { eventId: a.event_id });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {a.details?.actor_name || 'Unknown'}
                  </Text>
                </View>
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                  {actionPhrase(a.action_type)}
                </Text>
                {a.event_id && (
                  <Text style={[styles.eventName, { color: colors.textSecondary }]}>
                    {getEventName(a.event_id)}
                  </Text>
                )}
              </View>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {getRelativeTime(a.created_at)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowFiltersModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
            <TouchableOpacity 
              style={styles.modalClearButton} 
              onPress={clearFilters}
            >
              <Text style={[styles.modalClearText, { color: colors.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Filters Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Type Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Type</Text>
              <TouchableOpacity
                style={[styles.filterDropdown, { 
                  backgroundColor: colors.card, 
                  borderColor: colors.border 
                }]}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <Text style={[styles.filterDropdownText, { 
                  color: typeFilter ? colors.text : colors.textSecondary 
                }]}>
                  {typeFilter ? actionPhrase(typeFilter) : 'All Types'}
                </Text>
                <MaterialCommunityIcons 
                  name={showTypeDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
              {showTypeDropdown && (
                <View style={[styles.dropdownOptions, { backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => { setTypeFilter(''); setShowTypeDropdown(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: colors.text }]}>All Types</Text>
                  </TouchableOpacity>
                  {Array.from(new Set(activity.map(a => a.action_type))).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.dropdownOption, { 
                        backgroundColor: typeFilter === type ? colors.hover : 'transparent' 
                      }]}
                      onPress={() => { setTypeFilter(type); setShowTypeDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: colors.text }]}>
                        {actionPhrase(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Event Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Event</Text>
              <TouchableOpacity
                style={[styles.filterDropdown, { 
                  backgroundColor: colors.card, 
                  borderColor: colors.border 
                }]}
                onPress={() => setShowEventDropdown(!showEventDropdown)}
              >
                <Text style={[styles.filterDropdownText, { 
                  color: eventFilter ? colors.text : colors.textSecondary 
                }]}>
                  {eventFilter ? getEventName(eventFilter) : 'All Events'}
                </Text>
                <MaterialCommunityIcons 
                  name={showEventDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
              {showEventDropdown && (
                <View style={[styles.dropdownOptions, { backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => { setEventFilter(''); setShowEventDropdown(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: colors.text }]}>All Events</Text>
                  </TouchableOpacity>
                  {events.map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.dropdownOption, { 
                        backgroundColor: eventFilter === ev.id ? colors.hover : 'transparent' 
                      }]}
                      onPress={() => { setEventFilter(ev.id); setShowEventDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: colors.text }]}>
                        {ev.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* User Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>User</Text>
              <TouchableOpacity
                style={[styles.filterDropdown, { 
                  backgroundColor: colors.card, 
                  borderColor: colors.border 
                }]}
                onPress={() => setShowUserDropdown(!showUserDropdown)}
              >
                <Text style={[styles.filterDropdownText, { 
                  color: userFilter ? colors.text : colors.textSecondary 
                }]}>
                  {userFilter ? userFilter : 'All Users'}
                </Text>
                <MaterialCommunityIcons 
                  name={showUserDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
              {showUserDropdown && (
                <View style={[styles.dropdownOptions, { backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => { setUserFilter(''); setShowUserDropdown(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: colors.text }]}>All Users</Text>
                  </TouchableOpacity>
                  {Array.from(new Set(activity.map(a => a.details?.actor_name).filter(Boolean))).map(actorName => (
                    <TouchableOpacity
                      key={actorName}
                      style={[styles.dropdownOption, { 
                        backgroundColor: userFilter === actorName ? colors.hover : 'transparent' 
                      }]}
                      onPress={() => { setUserFilter(actorName); setShowUserDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: colors.text }]}>
                        {actorName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  filtersButton: {
    padding: 8,
    position: 'relative',
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
    borderRadius: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  actionText: {
    fontSize: 14,
    marginBottom: 4,
  },
  eventName: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    minWidth: 60,
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClearButton: {
    padding: 8,
  },
  modalClearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterDropdownText: {
    fontSize: 16,
  },
  dropdownOptions: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionText: {
    fontSize: 16,
  },
}); 