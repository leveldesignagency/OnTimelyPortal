import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Stage1GuestTrackerProps {
  guestId: string;
  eventId: string;
  isVisible: boolean;
  onClose: () => void;
}

interface Checkpoint {
  id: string;
  checkpoint_name: string;
  checkpoint_type: string;
  status: 'pending' | 'approaching' | 'completed' | 'skipped';
  description?: string;
  expected_time?: string;
  actual_time?: string;
}

interface TravelProfile {
  id: string;
  flight_number: string;
  flight_date: string;
  flight_status: string;
  departure_airport: string;
  arrival_airport: string;
  hotel_name: string;
  hotel_address: string;
  journey_status: string;
  current_location_lat?: number;
  current_location_lng?: number;
}

export default function Stage1GuestTracker({ 
  guestId, 
  eventId, 
  isVisible, 
  onClose 
}: Stage1GuestTrackerProps) {
  const [travelProfile, setTravelProfile] = useState<TravelProfile | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Checkpoint | null>(null);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);

  // Load travel profile and checkpoints
  useEffect(() => {
    if (isVisible && guestId) {
      loadTravelData();
    }
  }, [isVisible, guestId]);

  // Real-time subscription for checkpoint updates
  useEffect(() => {
    if (!travelProfile?.id) return;

    const subscription = supabase
      .channel(`stage1-${guestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'journey_checkpoints',
        filter: `travel_profile_id=eq.${travelProfile.id}`
      }, (payload) => {
        console.log('🔄 Checkpoint updated:', payload);
        loadTravelData(); // Reload data
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [travelProfile?.id, guestId]);

  const loadTravelData = async () => {
    try {
      setLoading(true);
      
      // Load travel profile
      const { data: profile } = await supabase
        .from('guest_travel_profiles')
        .select('*')
        .eq('guest_id', guestId)
        .eq('event_id', eventId)
        .single();

      if (profile) {
        setTravelProfile(profile);
        
        // Load checkpoints
        const { data: checkpointData } = await supabase
          .from('journey_checkpoints')
          .select('*')
          .eq('travel_profile_id', profile.id)
          .order('created_at');

        if (checkpointData) {
          setCheckpoints(checkpointData);
          
          // Find current active checkpoint
          const activeCheckpoint = checkpointData.find(cp => 
            cp.status === 'pending' || cp.status === 'approaching'
          );
          setCurrentCheckpoint(activeCheckpoint || null);
        }
      }
    } catch (error) {
      console.error('Error loading travel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmCheckpoint = async (checkpointId: string) => {
    try {
      // Update checkpoint status
      const { error } = await supabase
        .from('journey_checkpoints')
        .update({
          status: 'completed',
          actual_time: new Date().toISOString(),
          completion_method: 'guest_confirmed'
        })
        .eq('id', checkpointId);

      if (error) throw error;

      // Reload data
      await loadTravelData();
      
      // Show success message
      Alert.alert('Checkpoint Confirmed', 'Great! You\'ve completed this stage of your journey.');
      
    } catch (error) {
      console.error('Error confirming checkpoint:', error);
      Alert.alert('Error', 'Failed to confirm checkpoint. Please try again.');
    }
  };

  const skipCheckpoint = async (checkpointId: string) => {
    try {
      const { error } = await supabase
        .from('journey_checkpoints')
        .update({
          status: 'skipped',
          completion_method: 'guest_confirmed'
        })
        .eq('id', checkpointId);

      if (error) throw error;

      await loadTravelData();
      Alert.alert('Checkpoint Skipped', 'This checkpoint has been marked as skipped.');
      
    } catch (error) {
      console.error('Error skipping checkpoint:', error);
      Alert.alert('Error', 'Failed to skip checkpoint. Please try again.');
    }
  };

  const getCheckpointIcon = (type: string) => {
    switch (type) {
      case 'airport_arrival': return 'airplane';
      case 'security': return 'shield-check';
      case 'baggage_claim': return 'bag-personal';
      case 'meet_driver': return 'car';
      case 'en_route': return 'map-marker-path';
      case 'hotel_arrival': return 'home';
      default: return 'map-marker';
    }
  };

  const getCheckpointColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'approaching': return '#f59e0b';
      case 'skipped': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stage 1: Travel Companion</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your journey...</Text>
          </View>
        ) : !travelProfile ? (
          <View style={styles.noProfileContainer}>
            <MaterialCommunityIcons name="airplane-off" size={64} color="#6b7280" />
            <Text style={styles.noProfileTitle}>No Travel Profile</Text>
            <Text style={styles.noProfileText}>
              Stage 1 module hasn't been activated for your profile yet.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Flight Status */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="airplane" size={24} color="#10b981" />
                <Text style={styles.sectionTitle}>Flight Status</Text>
              </View>
              
              <View style={styles.flightInfo}>
                <View style={styles.flightRow}>
                  <Text style={styles.flightLabel}>Flight:</Text>
                  <Text style={styles.flightValue}>{travelProfile.flight_number}</Text>
                </View>
                <View style={styles.flightRow}>
                  <Text style={styles.flightLabel}>From:</Text>
                  <Text style={styles.flightValue}>{travelProfile.departure_airport}</Text>
                </View>
                <View style={styles.flightRow}>
                  <Text style={styles.flightLabel}>To:</Text>
                  <Text style={styles.flightValue}>{travelProfile.arrival_airport}</Text>
                </View>
                <View style={styles.flightRow}>
                  <Text style={styles.flightLabel}>Status:</Text>
                  <Text style={[styles.flightValue, { color: '#10b981' }]}>
                    {travelProfile.flight_status}
                  </Text>
                </View>
              </View>
            </View>

            {/* Hotel Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="home" size={24} color="#10b981" />
                <Text style={styles.sectionTitle}>Hotel</Text>
              </View>
              
              <View style={styles.hotelInfo}>
                <Text style={styles.hotelName}>{travelProfile.hotel_name}</Text>
                <Text style={styles.hotelAddress}>{travelProfile.hotel_address}</Text>
              </View>
            </View>

            {/* Journey Progress */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="map-marker-path" size={24} color="#10b981" />
                <Text style={styles.sectionTitle}>Journey Progress</Text>
              </View>
              
              <View style={styles.checkpointsContainer}>
                {checkpoints.map((checkpoint, index) => (
                  <View key={checkpoint.id} style={styles.checkpointItem}>
                    {/* Connection Line */}
                    {index > 0 && (
                      <View style={[
                        styles.connectionLine,
                        { backgroundColor: getCheckpointColor(checkpoints[index - 1].status) }
                      ]} />
                    )}
                    
                    {/* Checkpoint */}
                    <View style={styles.checkpointContent}>
                      <View style={[
                        styles.checkpointIcon,
                        { backgroundColor: getCheckpointColor(checkpoint.status) }
                      ]}>
                        <MaterialCommunityIcons 
                          name={getCheckpointIcon(checkpoint.checkpoint_type) as any}
                          size={20} 
                          color="#fff" 
                        />
                      </View>
                      
                      <View style={styles.checkpointDetails}>
                        <Text style={styles.checkpointName}>{checkpoint.checkpoint_name}</Text>
                        <Text style={styles.checkpointDescription}>
                          {checkpoint.description || 'Complete this stage of your journey'}
                        </Text>
                        
                        {checkpoint.status === 'pending' && (
                          <View style={styles.checkpointActions}>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.confirmButton]}
                              onPress={() => confirmCheckpoint(checkpoint.id)}
                            >
                              <Text style={styles.actionButtonText}>Confirm</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.skipButton]}
                              onPress={() => skipCheckpoint(checkpoint.id)}
                            >
                              <Text style={styles.skipButtonText}>Skip</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        
                        {checkpoint.status === 'completed' && (
                          <View style={styles.completedBadge}>
                            <MaterialCommunityIcons name="check-circle" size={16} color="#22c55e" />
                            <Text style={styles.completedText}>Completed</Text>
                          </View>
                        )}
                        
                        {checkpoint.status === 'skipped' && (
                          <View style={styles.skippedBadge}>
                            <MaterialCommunityIcons name="skip-next" size={16} color="#6b7280" />
                            <Text style={styles.skippedText}>Skipped</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Current Status */}
            {currentCheckpoint && (
              <View style={styles.currentStatusContainer}>
                <Text style={styles.currentStatusTitle}>Current Stage</Text>
                <Text style={styles.currentStatusText}>
                  {currentCheckpoint.checkpoint_name}
                </Text>
                <Text style={styles.currentStatusDescription}>
                  {currentCheckpoint.description || 'Please complete this stage to continue your journey'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  noProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noProfileTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  noProfileText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  flightInfo: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  flightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  flightLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  flightValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  hotelInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  hotelAddress: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  checkpointsContainer: {
    gap: 16,
  },
  checkpointItem: {
    position: 'relative',
  },
  connectionLine: {
    position: 'absolute',
    left: 20,
    top: -16,
    width: 2,
    height: 16,
    zIndex: 1,
  },
  checkpointContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  checkpointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  checkpointDetails: {
    flex: 1,
  },
  checkpointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  checkpointDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
    lineHeight: 20,
  },
  checkpointActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  skippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skippedText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  currentStatusContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  currentStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 8,
  },
  currentStatusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  currentStatusDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
}); 