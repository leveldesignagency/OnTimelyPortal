import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface EventDetailsAppPageProps {
  onNavigate: (route: string) => void;
  onGoBack: () => void;
  eventId?: string;
}

export default function EventDetailsAppPage({ onNavigate, onGoBack, eventId }: EventDetailsAppPageProps) {
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const getGlassCardStyle = () => ({
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  });

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event:', eventError);
        Alert.alert('Error', 'Failed to load event details');
        return;
      }

      setEvent(eventData);

      // Fetch guests
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

      if (guestsData) {
        // Process guest data to handle both old and new field structures
        const processedGuests = guestsData.map(guest => ({
          ...guest,
          // Ensure dietary and medical are arrays
          dietary: Array.isArray(guest.dietary) ? guest.dietary : 
                   (guest.dietary === 'none' ? [] : [guest.dietary || '']),
          medical: Array.isArray(guest.medical) ? guest.medical : 
                   (guest.medical === 'none' ? [] : [guest.medical || '']),
          // Handle modules field
          modules: Array.isArray(guest.modules) ? {} : (guest.modules || {}),
          // Ensure all fields have fallbacks
          first_name: guest.first_name || guest.firstName || '',
          last_name: guest.last_name || guest.lastName || '',
          email: guest.email || '',
          contact_number: guest.contact_number || guest.contactNumber || '',
          country_code: guest.country_code || guest.countryCode || '',
          id_type: guest.id_type || guest.idType || '',
          id_number: guest.id_number || guest.idNumber || '',
          id_country: guest.id_country || guest.idCountry || '',
          next_of_kin_name: guest.next_of_kin_name || guest.nextOfKinName || '',
          next_of_kin_email: guest.next_of_kin_email || guest.nextOfKinEmail || '',
          next_of_kin_phone_country: guest.next_of_kin_phone_country || guest.nextOfKinPhoneCountry || '',
          next_of_kin_phone: guest.next_of_kin_phone || guest.nextOfKinPhone || '',
        }));
        
        setGuests(processedGuests);
      }

      // Fetch itineraries
      const { data: itinerariesData } = await supabase
        .from('itineraries')
        .select('*')
        .eq('event_id', eventId);

      if (itinerariesData) {
        setItineraries(itinerariesData);
      }

      // Fetch teams assigned to this event
      const { data: teamEventsData } = await supabase
        .from('team_events')
        .select(`
          team_id,
          teams (
            id,
            name,
            description
          )
        `)
        .eq('event_id', eventId);

      if (teamEventsData) {
        const teamData = teamEventsData.map((te: any) => te.teams).filter(Boolean);
        setTeams(teamData);
      }

    } catch (error) {
      console.error('Error fetching event data:', error);
      Alert.alert('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        Alert.alert('Error', 'Failed to delete event');
        return;
      }

      setShowDeleteModal(false);
      setShowSuccessModal(true);
      
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        setShowSuccessModal(false);
        onNavigate('dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event');
    }
  };

  const getEventStatus = () => {
    if (!event) return 'Unknown';
    
    const now = new Date();
    const startDate = new Date(event.from);
    const endDate = new Date(event.to);
    
    if (now >= startDate && now <= endDate) return 'Live';
    if (now < startDate) return 'Upcoming';
    return 'Completed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live': return '#10b981';
      case 'Upcoming': return '#f59e0b';
      case 'Completed': return '#ef4444';
      default: return '#666';
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

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#666" />
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorDescription}>
            The event you are looking for does not exist or has been deleted.
          </Text>
        </View>
      </View>
    );
  }

  const status = getEventStatus();
  const statusColor = getStatusColor(status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <TouchableOpacity 
          onPress={() => setShowDeleteModal(true)} 
          style={styles.deleteButton}
        >
          <MaterialCommunityIcons name="delete" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Info Card */}
        <View style={[styles.eventCard, getGlassCardStyle()]}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>
          
          <Text style={styles.eventDescription}>
            {event.description || 'No description available'}
          </Text>

          <View style={styles.eventMeta}>
            {event.location && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#10b981" />
                <Text style={styles.metaText}>{event.location}</Text>
              </View>
            )}
            
            {event.time_zone && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="earth" size={16} color="#10b981" />
                <Text style={styles.metaText}>{event.time_zone}</Text>
              </View>
            )}

            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={16} color="#10b981" />
              <Text style={styles.metaText}>
                {formatDate(event.from)} - {formatDate(event.to)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, getGlassCardStyle()]}>
            <MaterialCommunityIcons name="account-group" size={32} color="#10b981" />
            <Text style={styles.statNumber}>{guests.length}</Text>
            <Text style={styles.statLabel}>Guests</Text>
          </View>

          <View style={[styles.statCard, getGlassCardStyle()]}>
            <MaterialCommunityIcons name="calendar-clock" size={32} color="#10b981" />
            <Text style={styles.statNumber}>{itineraries.length}</Text>
            <Text style={styles.statLabel}>Itineraries</Text>
          </View>

          <View style={[styles.statCard, getGlassCardStyle()]}>
            <MaterialCommunityIcons name="account-multiple" size={32} color="#10b981" />
            <Text style={styles.statNumber}>{teams.length}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.actionsCard, getGlassCardStyle()]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onNavigate('add-guests')}
            >
              <MaterialCommunityIcons name="account-plus" size={24} color="#10b981" />
              <Text style={styles.actionText}>Add Guests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onNavigate('create-itinerary')}
            >
              <MaterialCommunityIcons name="calendar-plus" size={24} color="#10b981" />
              <Text style={styles.actionText}>Create Itinerary</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onNavigate('event-portal')}
            >
              <MaterialCommunityIcons name="web" size={24} color="#10b981" />
              <Text style={styles.actionText}>Event Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onNavigate('guest-form-responses')}
            >
              <MaterialCommunityIcons name="clipboard-text" size={24} color="#10b981" />
              <Text style={styles.actionText}>Guest Form Responses</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onNavigate('export-report')}
            >
              <MaterialCommunityIcons name="file-export" size={24} color="#10b981" />
              <Text style={styles.actionText}>Export Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Teams Section */}
        {teams.length > 0 && (
          <View style={[styles.teamsCard, getGlassCardStyle()]}>
            <Text style={styles.sectionTitle}>Assigned Teams</Text>
            {teams.map((team) => (
              <View key={team.id} style={styles.teamItem}>
                <MaterialCommunityIcons name="account-group" size={20} color="#10b981" />
                <Text style={styles.teamName}>{team.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Guests */}
        {guests.length > 0 && (
          <View style={[styles.guestsCard, getGlassCardStyle()]}>
            <Text style={styles.sectionTitle}>Recent Guests</Text>
            {guests.slice(0, 3).map((guest) => (
              <View key={guest.id} style={styles.guestItem}>
                <MaterialCommunityIcons name="account" size={20} color="#10b981" />
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>
                    {guest.first_name} {guest.last_name}
                  </Text>
                  {guest.email && (
                    <Text style={styles.guestEmail}>{guest.email}</Text>
                  )}
                  {guest.contact_number && (
                    <Text style={styles.guestContact}>{guest.contact_number}</Text>
                  )}
                  {/* Dietary Requirements */}
                  {guest.dietary && Array.isArray(guest.dietary) && guest.dietary.length > 0 && (
                    <View style={styles.tagsContainer}>
                      <Text style={styles.tagsLabel}>Dietary:</Text>
                      <View style={styles.tagsList}>
                        {guest.dietary.slice(0, 3).map((diet: string, index: number) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{diet}</Text>
                          </View>
                        ))}
                        {guest.dietary.length > 3 && (
                          <Text style={styles.moreTags}>+{guest.dietary.length - 3} more</Text>
                        )}
                      </View>
                    </View>
                  )}
                  {/* Medical Information */}
                  {guest.medical && Array.isArray(guest.medical) && guest.medical.length > 0 && (
                    <View style={styles.tagsContainer}>
                      <Text style={styles.tagsLabel}>Medical:</Text>
                      <View style={styles.tagsList}>
                        {guest.medical.slice(0, 2).map((med: string, index: number) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{med}</Text>
                          </View>
                        ))}
                        {guest.medical.length > 2 && (
                          <Text style={styles.moreTags}>+{guest.medical.length - 2} more</Text>
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Next of Kin Info */}
                  {guest.next_of_kin_name && (
                    <View style={styles.nextOfKinContainer}>
                      <Text style={styles.nextOfKinLabel}>🆘 Next of Kin:</Text>
                      <Text style={styles.nextOfKinText}>{guest.next_of_kin_name}</Text>
                      {guest.next_of_kin_phone && (
                        <Text style={styles.nextOfKinContact}>📱 {guest.next_of_kin_phone}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
            {guests.length > 3 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View all {guests.length} guests</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.deleteTitle}>Delete Event</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete "{event.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteEvent}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <MaterialCommunityIcons name="check-circle" size={64} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>Event deleted successfully!</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  eventCard: {
    marginVertical: 20,
    padding: 20,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    color: '#666',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  eventMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#fff',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  actionsCard: {
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  teamsCard: {
    marginBottom: 20,
    padding: 20,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  teamName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  guestsCard: {
    marginBottom: 20,
    padding: 20,
  },
  guestItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  guestEmail: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  guestContact: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    marginTop: 4,
  },
  tagsLabel: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '500',
  },
  moreTags: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
  },
  nextOfKinContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  nextOfKinLabel: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextOfKinText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
  nextOfKinContact: {
    color: '#10b981',
    fontSize: 12,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  deleteTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  deleteMessage: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successModal: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
}); 