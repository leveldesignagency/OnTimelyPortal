import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  AppState,
  AppStateStatus
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Stage1NotificationManagerProps {
  guestId: string;
  eventId: string;
}

interface CheckpointNotification {
  id: string;
  checkpoint_name: string;
  checkpoint_type: string;
  description?: string;
  requires_response: boolean;
  created_at: string;
}

interface TravelProfile {
  id: string;
  flight_number: string;
  hotel_name: string;
  journey_status: string;
}

export default function Stage1NotificationManager({ 
  guestId, 
  eventId 
}: Stage1NotificationManagerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<CheckpointNotification | null>(null);
  const [travelProfile, setTravelProfile] = useState<TravelProfile | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Check if Stage 1 is active for this guest
  useEffect(() => {
    if (guestId && eventId) {
      checkStage1Status();
    }
  }, [guestId, eventId]);

  // Set up real-time subscriptions for notifications
  useEffect(() => {
    if (!isActive || !travelProfile?.id) return;

    // Subscribe to new notifications
    const notificationSubscription = supabase
      .channel(`stage1-notifications-${guestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guest_notifications',
        filter: `travel_profile_id=eq.${travelProfile.id}`
      }, (payload) => {
        console.log('🔔 New Stage 1 notification:', payload);
        handleNewNotification(payload.new);
      })
      .subscribe();

    // Subscribe to checkpoint updates
    const checkpointSubscription = supabase
      .channel(`stage1-checkpoints-${guestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'journey_checkpoints',
        filter: `travel_profile_id=eq.${travelProfile.id}`
      }, (payload) => {
        console.log('🔄 Checkpoint updated:', payload);
        if (payload.new.status === 'approaching') {
          showCheckpointPrompt(payload.new);
        }
      })
      .subscribe();

    // Subscribe to flight status changes
    const flightSubscription = supabase
      .channel(`stage1-flight-${guestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'guest_travel_profiles',
        filter: `id=eq.${travelProfile.id}`
      }, (payload) => {
        console.log('✈️ Flight status updated:', payload);
        handleFlightStatusUpdate(payload.new);
      })
      .subscribe();

    return () => {
      notificationSubscription.unsubscribe();
      checkpointSubscription.unsubscribe();
      flightSubscription.unsubscribe();
    };
  }, [isActive, travelProfile?.id, guestId]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isActive) {
        // App came to foreground, check for pending notifications
        checkPendingNotifications();
      }
    };

    AppState.addEventListener('change', handleAppStateChange);
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, [isActive]);

  const checkStage1Status = async () => {
    try {
      const { data: profile } = await supabase
        .from('guest_travel_profiles')
        .select('id, flight_number, hotel_name, journey_status')
        .eq('guest_id', guestId)
        .eq('event_id', eventId)
        .single();

      if (profile) {
        setTravelProfile(profile);
        setIsActive(true);
        console.log('✅ Stage 1 active for guest:', guestId);
        
        // Check for any pending notifications
        await checkPendingNotifications();
      } else {
        setIsActive(false);
        console.log('❌ Stage 1 not active for guest:', guestId);
      }
    } catch (error) {
      console.error('Error checking Stage 1 status:', error);
      setIsActive(false);
    }
  };

  const checkPendingNotifications = async () => {
    if (!travelProfile?.id) return;

    try {
      const { data: notifications } = await supabase
        .from('guest_notifications')
        .select('*')
        .eq('travel_profile_id', travelProfile.id)
        .eq('status', 'sent')
        .eq('requires_response', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (notifications && notifications.length > 0) {
        handleNewNotification(notifications[0]);
      }
    } catch (error) {
      console.error('Error checking pending notifications:', error);
    }
  };

  const handleNewNotification = (notification: any) => {
    if (notification.notification_type === 'checkpoint_prompt') {
      setCurrentNotification({
        id: notification.id,
        checkpoint_name: notification.title.replace('Checkpoint: ', ''),
        checkpoint_type: 'checkpoint_prompt',
        description: notification.message,
        requires_response: notification.requires_response,
        created_at: notification.created_at
      });
      setIsVisible(true);
    }
  };

  const showCheckpointPrompt = (checkpoint: any) => {
    setCurrentNotification({
      id: checkpoint.id,
      checkpoint_name: checkpoint.checkpoint_name,
      checkpoint_type: checkpoint.checkpoint_type,
      description: checkpoint.description || 'Please confirm you have reached this stage',
      requires_response: true,
      created_at: checkpoint.created_at
    });
    setIsVisible(true);
  };

  const handleFlightStatusUpdate = (profile: any) => {
    if (profile.flight_status === 'landed') {
      // Flight has landed, show arrival notification
      Alert.alert(
        '✈️ Flight Landed',
        `Your flight ${profile.flight_number} has landed. Welcome to your destination!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Automatically update journey status
              updateJourneyStatus('in_transit');
            }
          }
        ]
      );
    }
  };

  const updateJourneyStatus = async (status: string) => {
    if (!travelProfile?.id) return;

    try {
      const { error } = await supabase
        .from('guest_travel_profiles')
        .update({ journey_status: status })
        .eq('id', travelProfile.id);

      if (error) throw error;
      console.log('✅ Journey status updated to:', status);
    } catch (error) {
      console.error('Error updating journey status:', error);
    }
  };

  const handleCheckpointResponse = async (action: 'confirm' | 'skip') => {
    if (!currentNotification || !travelProfile?.id) return;

    try {
      // Update notification status
      await supabase
        .from('guest_notifications')
        .update({
          status: 'responded',
          response_received: true,
          response_data: { action },
          response_time: new Date().toISOString()
        })
        .eq('id', currentNotification.id);

      // Update checkpoint status
      const { data: checkpoints } = await supabase
        .from('journey_checkpoints')
        .select('id')
        .eq('travel_profile_id', travelProfile.id)
        .eq('checkpoint_name', currentNotification.checkpoint_name)
        .limit(1);

      if (checkpoints && checkpoints.length > 0) {
        await supabase
          .from('journey_checkpoints')
          .update({
            status: action === 'confirm' ? 'completed' : 'skipped',
            actual_time: new Date().toISOString(),
            completion_method: 'guest_confirmed'
          })
          .eq('id', checkpoints[0].id);
      }

      // Show success message
      Alert.alert(
        'Checkpoint Updated',
        action === 'confirm' 
          ? 'Great! You\'ve completed this stage of your journey.'
          : 'This checkpoint has been marked as skipped.',
        [{ text: 'OK' }]
      );

      // Close notification
      setIsVisible(false);
      setCurrentNotification(null);

    } catch (error) {
      console.error('Error handling checkpoint response:', error);
      Alert.alert('Error', 'Failed to update checkpoint. Please try again.');
    }
  };

  const handleCloseNotification = () => {
    setIsVisible(false);
    setCurrentNotification(null);
  };

  // Don't render anything if Stage 1 is not active
  if (!isActive) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCloseNotification}
    >
      <View style={styles.overlay}>
        <View style={styles.notificationCard}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons 
              name="map-marker-path" 
              size={24} 
              color="#10b981" 
            />
            <Text style={styles.title}>Journey Checkpoint</Text>
            <TouchableOpacity onPress={handleCloseNotification}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.checkpointName}>
              {currentNotification?.checkpoint_name}
            </Text>
            <Text style={styles.description}>
              {currentNotification?.description}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={() => handleCheckpointResponse('confirm')}
            >
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={() => handleCheckpointResponse('skip')}
            >
              <MaterialCommunityIcons name="skip-next" size={20} color="#6b7280" />
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This helps us track your journey progress
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notificationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    marginBottom: 20,
  },
  checkpointName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 