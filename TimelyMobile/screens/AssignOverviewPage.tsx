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
import { updateEvent } from '../lib/supabase';

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

interface AssignOverviewPageProps {
  eventId: string;
  guestAssignments: {[guestId: string]: string[]};
  guests: GuestType[];
  itineraries: ItineraryType[];
  activeAddOns: any[];
  onNavigate: (route: string, params?: any) => void;
}

export default function AssignOverviewPage({ 
  eventId, 
  guestAssignments, 
  guests, 
  itineraries, 
  activeAddOns, 
  onNavigate 
}: AssignOverviewPageProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<{[guestId: string]: boolean}>({});

  // Handle launch event
  const handleLaunchEvent = async () => {
    setLoading(true);
    try {
      // Update event status to 'launched'
      await updateEvent(eventId, { status: 'launched' });
      
      // Navigate to Event Portal Management
      onNavigate('EventPortalManagement', { 
        eventId, 
        guestAssignments, 
        guests, 
        itineraries, 
        activeAddOns 
      });
      
    } catch (error) {
      console.error('Error launching event:', error);
      Alert.alert('Error', 'Failed to launch event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if there are any assignments
  const hasAssignments = Object.values(guestAssignments).some(arr => arr && arr.length > 0);

  // Handle card toggle
  const toggleCard = (guestId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [guestId]: !prev[guestId]
    }));
  };

  if (!hasAssignments || guests.length === 0 || itineraries.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('event-launcher', { eventId })}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assign Overview</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No guests or itineraries selected</Text>
            <Text style={styles.emptyStateSubtext}>
              Please go back and select at least one guest and one itinerary.
            </Text>
          </View>
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
          onPress={() => onNavigate('event-launcher', { eventId })}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Overview</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Launch Button */}
      <View style={styles.launchButtonContainer}>
        <TouchableOpacity
          style={[styles.launchButton, loading && styles.launchButtonDisabled]}
          onPress={handleLaunchEvent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.launchButtonText}>Launch Event</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Guest Cards */}
        <View style={styles.guestCards}>
          {guests.map((guest) => {
            const assignedItins = (guestAssignments[guest.id] || [])
              .map((itinId: string) => itineraries.find((itin: any) => String(itin.id) === String(itinId)))
              .filter(Boolean);

                         const isExpanded = expandedCards[guest.id] || false;
             
             return (
               <TouchableOpacity 
                 key={guest.id} 
                 style={styles.guestCard}
                 onPress={() => toggleCard(guest.id)}
               >
                 {/* Stage 1 Badge */}
                 {guest.modules?.stage1TravelCompanion && (
                   <View style={styles.stage1Badge}>
                     <Text style={styles.stage1BadgeText}>Stage 1</Text>
                   </View>
                 )}

                 {/* Guest Info */}
                 <View style={styles.guestInfo}>
                   <Text style={styles.guestName}>
                     {guest.first_name || guest.firstName} {guest.last_name || guest.lastName}
                   </Text>
                   <Text style={styles.guestEmail}>{guest.email}</Text>
                 </View>

                 {/* Collapsed View - Itinerary Counter */}
                 {!isExpanded && assignedItins.length > 0 && (
                   <View style={styles.collapsedView}>
                     <Text style={styles.itineraryCounter}>
                       Assigned Itineraries ({assignedItins.length})
                     </Text>
                     <MaterialCommunityIcons 
                       name="chevron-down" 
                       size={20} 
                       color="#10b981" 
                     />
                   </View>
                 )}

                 {/* Expanded View - Full Itinerary List */}
                 {isExpanded && (
                   <View style={styles.expandedView}>
                     <View style={styles.section}>
                       <Text style={styles.sectionTitle}>Assigned Itineraries</Text>
                       {assignedItins.length > 0 ? (
                         <View style={styles.itineraryList}>
                           {assignedItins.map((itin: any) => (
                             <View key={itin.id} style={styles.itineraryItem}>
                               <Text style={styles.itineraryTitle}>{itin.title}</Text>
                               <Text style={styles.itineraryDetails}>
                                 {[
                                   itin.arrival_time && `Arrival: ${itin.arrival_time}`,
                                   itin.start_time && `Start: ${itin.start_time}`,
                                   itin.end_time && `End: ${itin.end_time}`,
                                   `Date: ${itin.date || '-'}`,
                                   itin.location && `Location: ${itin.location}`
                                 ].filter(Boolean).join(' | ')}
                               </Text>
                             </View>
                           ))}
                         </View>
                       ) : (
                         <Text style={styles.noItinerariesText}>No itineraries assigned.</Text>
                       )}
                     </View>

                     {/* Add-Ons */}
                     {activeAddOns.length > 0 && (
                       <View style={styles.section}>
                         <Text style={styles.sectionTitle}>Add-Ons</Text>
                         <View style={styles.addOnsList}>
                           {activeAddOns.map((addon: any, index: number) => (
                             <View key={addon.id || index} style={styles.addOnItem}>
                               <Text style={styles.addOnText}>
                                 {addon.addon_label || addon.addon_key || addon.name || 'Unknown Add-on'}
                               </Text>
                             </View>
                           ))}
                         </View>
                       </View>
                     )}
                   </View>
                 )}


               </TouchableOpacity>
             );
          })}
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
  launchButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  launchButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  launchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  launchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  guestCards: {
    gap: 20,
  },
  guestCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 8,
    position: 'relative',
  },
  stage1Badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  stage1BadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  guestInfo: {
    marginBottom: 20,
  },
  guestName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  guestEmail: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
  },
  collapsedView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  itineraryCounter: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  expandedView: {
    marginTop: 16,
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 8,
  },
  itineraryList: {
    gap: 12,
  },
  itineraryItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  itineraryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itineraryDetails: {
    color: '#ccc',
    fontSize: 14,
  },
  noItinerariesText: {
    color: '#aaa',
    fontSize: 15,
  },
  addOnsList: {
    gap: 6,
  },
  addOnItem: {
    paddingLeft: 16,
  },
  addOnText: {
    color: '#ccc',
    fontSize: 15,
  },
}); 