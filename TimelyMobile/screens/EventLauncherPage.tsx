import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { useRealtimeGuests, useRealtimeItineraries } from '../hooks/useRealtime';

// Types
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
  date: string;
  arrival_time?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  is_draft: boolean;
  group_id?: string;
  group_name?: string;
};

interface EventLauncherPageProps {
  eventId: string;
  onNavigate: (route: string, params?: any) => void;
}

export default function EventLauncherPage({ eventId, onNavigate }: EventLauncherPageProps) {
  const insets = useSafeAreaInsets();
  
  // State
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<GuestType[]>([]);
  const [itineraries, setItineraries] = useState<ItineraryType[]>([]);
  const [guestAssignments, setGuestAssignments] = useState<{[guestId: string]: string[]}>({});
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [selectedItineraries, setSelectedItineraries] = useState<string[]>([]);
  const [activeAddOns, setActiveAddOns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assignmentsSaved, setAssignmentsSaved] = useState(false);

  // Real-time hooks
  const { guests: realtimeGuests, loading: guestsLoading } = useRealtimeGuests(eventId);
  const { itineraries: realtimeItineraries, loading: itinerariesLoading } = useRealtimeItineraries(eventId);

  // Computed values
  const allGuestsSelected = guests.length > 0 && selectedGuests.length === guests.length;
  const allItinerariesSelected = itineraries.length > 0 && selectedItineraries.length === itineraries.length;
  const hasAssignments = Object.values(guestAssignments).some(arr => arr && arr.length > 0);
  const canAssign = selectedGuests.length > 0 && selectedItineraries.length > 0;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load active add-ons
        const { data: addOns, error: addOnsError } = await supabase
          .from('event_addons')
          .select('*')
          .eq('event_id', eventId)
          .eq('enabled', true);

        if (!addOnsError && addOns) {
          setActiveAddOns(addOns);
        }

        // Fallback: Load guests directly if real-time hook isn't working
        if (guests.length === 0) {
          console.log('🔍 Loading guests directly as fallback...');
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: userProfile } = await supabase
              .from('users')
              .select('company_id')
              .eq('id', user.id)
              .single();

            if (userProfile?.company_id) {
              console.log('🔍 Querying guests with eventId:', eventId, 'company_id:', userProfile.company_id);
              const { data: guestsData, error } = await supabase
                .from('guests')
                .select('*')
                .eq('event_id', eventId)
                .eq('company_id', userProfile.company_id)
                .order('created_at', { ascending: false });

              console.log('🔍 Guests query result:', { guestsData, error });
              
              if (!error && guestsData) {
                console.log('🔍 Loaded guests directly:', guestsData.length);
                console.log('🔍 First guest sample:', guestsData[0]);
                setGuests(guestsData);
              } else {
                console.error('Error loading guests directly:', error);
              }
            }
          }
        }

        // Load existing assignments
        console.log('🔍 Loading existing assignments...');
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('guest_itinerary_assignments')
          .select('*')
          .eq('event_id', eventId);

        console.log('🔍 Assignments query result:', { assignmentsData, assignmentsError });
        
        if (!assignmentsError && assignmentsData) {
          const existingAssignments: {[guestId: string]: string[]} = {};
          assignmentsData.forEach(assignment => {
            if (!existingAssignments[assignment.guest_id]) {
              existingAssignments[assignment.guest_id] = [];
            }
            existingAssignments[assignment.guest_id].push(assignment.itinerary_id);
          });
          console.log('🔍 Loaded existing assignments:', existingAssignments);
          setGuestAssignments(existingAssignments);
          setAssignmentsSaved(true);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadData();
    }
  }, [eventId, guests.length]);

  // Update guests and itineraries from real-time data
  useEffect(() => {
    console.log('🔍 realtimeGuests updated:', realtimeGuests);
    if (realtimeGuests) {
      console.log('🔍 Setting guests:', realtimeGuests.length);
      setGuests(realtimeGuests);
    }
  }, [realtimeGuests]);

  useEffect(() => {
    if (realtimeItineraries) {
      const saved = realtimeItineraries.filter(i => !i.is_draft);
      setItineraries(saved);
    }
  }, [realtimeItineraries]);

  // Handle guest selection
  const handleGuestSelect = (guestId: string) => {
    setSelectedGuests(prev => {
      if (prev.includes(guestId)) {
        return prev.filter(id => id !== guestId);
      } else {
        return [...prev, guestId];
      }
    });
  };

  // Handle itinerary selection
  const handleItinerarySelect = (itineraryId: string) => {
    setSelectedItineraries(prev => {
      if (prev.includes(itineraryId)) {
        return prev.filter(id => id !== itineraryId);
      } else {
        return [...prev, itineraryId];
      }
    });
  };

  // Handle select all guests
  const handleSelectAllGuests = () => {
    if (allGuestsSelected) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(guests.map(g => g.id));
    }
  };

  // Handle select all itineraries
  const handleSelectAllItineraries = () => {
    if (allItinerariesSelected) {
      setSelectedItineraries([]);
    } else {
      setSelectedItineraries(itineraries.map(i => i.id));
    }
  };

  // Handle bulk assign
  const handleBulkAssign = async () => {
    if (selectedGuests.length === 0 || selectedItineraries.length === 0) {
      Alert.alert('Error', 'Please select at least one guest and one itinerary');
      return;
    }

    setIsLoading(true);
    try {
      // Create assignments array for database
      const assignmentsToSave = [];
      for (const guestId of selectedGuests) {
        for (const itineraryId of selectedItineraries) {
          assignmentsToSave.push({
            event_id: eventId,
            guest_id: guestId,
            itinerary_id: itineraryId
          });
        }
      }

      console.log('🔍 Saving assignments to database:', assignmentsToSave);

      // Save to database
      const { error: saveError } = await supabase
        .from('guest_itinerary_assignments')
        .insert(assignmentsToSave);

      if (saveError) {
        console.error('Error saving assignments:', saveError);
        Alert.alert('Error', 'Failed to save assignments');
        return;
      }

      // Update local state
      const newAssignments = { ...guestAssignments };
      for (const guestId of selectedGuests) {
        newAssignments[guestId] = selectedItineraries;
      }
      
      setGuestAssignments(newAssignments);
      setAssignmentsSaved(true);
      
      Alert.alert('Success', 'Assignments saved successfully!');
    } catch (error) {
      console.error('Error saving assignments:', error);
      Alert.alert('Error', 'Failed to save assignments');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle remove itinerary from guest
  const handleRemoveItinerary = (guestId: string, itineraryId: string) => {
    setGuestAssignments(prev => ({
      ...prev,
      [guestId]: prev[guestId]?.filter(id => id !== itineraryId) || []
    }));
  };

  // Handle next step
  const handleNext = () => {
    console.log('🔍 Next button pressed, navigating to assign-overview');
    onNavigate('assign-overview', { 
      eventId, 
      guestAssignments, 
      guests, 
      itineraries, 
      activeAddOns 
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading event data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('events')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Launcher</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => {
            setGuestAssignments({});
            setAssignmentsSaved(false);
          }}
        >
          <Text style={styles.removeButtonText}>Remove All</Text>
        </TouchableOpacity>
        
                 <TouchableOpacity
           style={[
             styles.actionButton,
             assignmentsSaved ? styles.assignButton : (canAssign ? styles.assignButton : styles.disabledButton)
           ]}
           onPress={assignmentsSaved ? handleNext : handleBulkAssign}
           disabled={assignmentsSaved ? false : (!canAssign || isLoading)}
         >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {assignmentsSaved ? 'Next' : 'Assign'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Event Launcher</Text>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Guests Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={handleSelectAllGuests}
              >
                <View style={[styles.checkbox, allGuestsSelected && styles.checkboxSelected]}>
                  {allGuestsSelected && (
                    <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.sectionTitle}>Guests</Text>
                <Text style={styles.countText}>({guests.length})</Text>
              </TouchableOpacity>
            </View>
            
                         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
               {console.log('🔍 Rendering guests:', guests.length, guests)}
               {guests.map((guest) => {
                 console.log('🔍 Rendering guest:', guest);
                 return (
                <TouchableOpacity
                  key={guest.id}
                  style={[
                    styles.guestCard,
                    selectedGuests.includes(guest.id) && styles.selectedCard
                  ]}
                  onPress={() => handleGuestSelect(guest.id)}
                >
                  {/* Stage 1 Active Badge */}
                  {guest.modules?.stage1TravelCompanion && (
                    <View style={styles.stage1Badge}>
                      <Text style={styles.stage1BadgeText}>Stage 1 Active</Text>
                    </View>
                  )}
                  
                  <Text style={styles.guestName}>
                    {guest.first_name || guest.firstName} {guest.middle_name || guest.middleName} {guest.last_name || guest.lastName}
                  </Text>
                  
                                     {/* Assigned Itineraries Counter */}
                   {(guestAssignments[guest.id] || []).length > 0 && (
                     <View style={styles.assignmentCounter}>
                       <Text style={styles.assignmentCounterText}>
                         Assigned Itineraries ({guestAssignments[guest.id].length})
                       </Text>
                     </View>
                   )}
                 </TouchableOpacity>
               );
               })}
            </ScrollView>
          </View>

          {/* Itineraries Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={handleSelectAllItineraries}
              >
                <View style={[styles.checkbox, allItinerariesSelected && styles.checkboxSelected]}>
                  {allItinerariesSelected && (
                    <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.sectionTitle}>Itinerary Items</Text>
                <Text style={styles.countText}>({itineraries.length})</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {itineraries.map((itinerary) => (
                <TouchableOpacity
                  key={itinerary.id}
                  style={[
                    styles.itineraryCard,
                    selectedItineraries.includes(itinerary.id) && styles.selectedCard
                  ]}
                  onPress={() => handleItinerarySelect(itinerary.id)}
                >
                  <Text style={styles.itineraryTitle}>{itinerary.title}</Text>
                  <Text style={styles.itineraryDetails}>
                    {[
                      itinerary.arrival_time && `Arrival: ${itinerary.arrival_time}`,
                      itinerary.start_time && `Start: ${itinerary.start_time}`,
                      itinerary.end_time && `End: ${itinerary.end_time}`,
                      `Date: ${itinerary.date || '-'}`,
                      itinerary.location && `Location: ${itinerary.location}`
                    ].filter(Boolean).join(' | ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

                     {/* Add-ons Section */}
           <View style={styles.section}>
             <Text style={styles.sectionTitle}>Add-Ons</Text>
             <View style={styles.addOnsSpacer} />
             {activeAddOns.length === 0 ? (
               <Text style={styles.emptyAddOnsText}>No add-ons enabled for this event.</Text>
             ) : (
               <View style={styles.addOnList}>
                 {activeAddOns.map((addOn) => (
                   <View key={addOn.id} style={styles.addOnCard}>
                     {addOn.addon_icon && (
                       <Text style={styles.addOnIcon}>{addOn.addon_icon}</Text>
                     )}
                     <Text style={styles.addOnText}>
                       {addOn.addon_label || addOn.addon_key}
                     </Text>
                   </View>
                 ))}
               </View>
             )}
           </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: '#10b981',
  },
  removeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
    letterSpacing: 1,
  },
  mainContent: {
    gap: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  addOnsSpacer: {
    height: 16,
  },
  countText: {
    color: '#888',
    fontSize: 14,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  guestCard: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 18,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  itineraryCard: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 18,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  stage1Badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stage1BadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  guestName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  assignmentCounter: {
    marginTop: 8,
  },
  assignmentCounterText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  itineraryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  itineraryDetails: {
    color: '#888',
    fontSize: 14,
  },
  addOnList: {
    gap: 8,
  },
  addOnCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addOnIcon: {
    fontSize: 16,
  },
  addOnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyAddOnsText: {
    color: '#888',
    fontSize: 15,
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
}); 