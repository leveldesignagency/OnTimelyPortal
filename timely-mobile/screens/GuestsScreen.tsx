import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { supabase, getGuestAssignedItineraries, getEventTimelineModules, ItineraryItem, TimelineModule, submitSurveyResponse, submitFeedbackResponse } from '../lib/supabase';
import { AuthUser } from '../lib/auth';

interface GuestsScreenProps {
  guest: AuthUser;
}

// Star Rating Component for mobile
const StarRating = ({ rating, onRatingChange, isDark = false }: { 
  rating: number, 
  onRatingChange: (rating: number) => void, 
  isDark?: boolean 
}) => {
  const handleStarPress = (starIndex: number) => {
    onRatingChange(starIndex);
  };

  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handleStarPress(star)}
          style={styles.starButton}
        >
          <Text style={[
            styles.starText,
            { color: rating >= star ? '#fbbf24' : '#d1d5db' }
          ]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.ratingText}>{rating}.0</Text>
    </View>
  );
};

// Add after imports and before GuestsScreen:
type TimelineEvent = ItineraryItem & { moduleData?: TimelineModule };

export default function GuestsScreen({ guest }: GuestsScreenProps) {
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [timelineModules, setTimelineModules] = useState<TimelineModule[]>([]);
  const [mergedTimeline, setMergedTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Form states
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Format time helper
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  // Load guest's timeline data
  const loadTimelineData = useCallback(async () => {
    if (!guest.eventId || !guest.id) {
      console.error('No event ID or guest ID available');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading timeline for guest:', guest.id, 'event:', guest.eventId);

      // Fetch guest's assigned itineraries and timeline modules in parallel
      const [itinerariesData, modulesData] = await Promise.all([
        getGuestAssignedItineraries(guest.id, guest.eventId),
        getEventTimelineModules(guest.eventId)
      ]);

      console.log('Itineraries loaded:', itinerariesData);
      console.log('Modules loaded:', modulesData);

      setItineraries(itinerariesData || []);
      setTimelineModules(modulesData || []);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      Alert.alert('Error', 'Failed to load your timeline. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [guest.id, guest.eventId]);

  // Merge itineraries and modules into a single timeline
  useEffect(() => {
    const merged: TimelineEvent[] = [...itineraries];
    
    // Add modules to timeline
    timelineModules.forEach((module, idx) => {
      const today = new Date();
      const [h, m] = module.time.split(':').map(Number);
      const dateTime = new Date(today);
      dateTime.setHours(h, m, 0, 0);
      
      merged.push({
        id: `${module.module_type}-${idx}`,
        title: module.title || module.question || module.label || 'Module',
        date: today.toISOString().split('T')[0],
        start_time: module.time,
        end_time: module.time,
        module: module.module_type,
        moduleData: module,
      });
    });

    // Sort by time
    const sorted = merged.sort((a, b) => {
      const aTime = a.start_time.replace(':', '');
      const bTime = b.start_time.replace(':', '');
      return parseInt(aTime) - parseInt(bTime);
    });

    setMergedTimeline(sorted);
  }, [itineraries, timelineModules]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTimelineData();
  }, [loadTimelineData]);

  // Load data on mount
  useEffect(() => {
    loadTimelineData();
  }, [loadTimelineData]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Event status helper
  const getEventStatus = (event: any) => {
    const now = currentTime;
    const [startHours, startMinutes] = event.start_time.split(':').map(Number);
    const [endHours, endMinutes] = (event.end_time || event.start_time).split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHours, endMinutes, 0, 0);
    
    if (now >= startTime && now <= endTime) {
      return 'current';
    } else if (now > endTime) {
      return 'past';
    } else {
      return 'upcoming';
    }
  };

  // Handle event press
  const handleEventPress = (event: any) => {
    setSelectedEvent(event);
    
    if (event.module === 'survey') {
      setShowSurveyModal(true);
    } else if (event.module === 'feedback') {
      setShowFeedbackModal(true);
    } else if (event.module === 'qrcode') {
      setShowQrModal(true);
    } else {
      setShowEventModal(true);
    }
  };

  // Handle location press
  const handleLocationPress = (location: string) => {
    Alert.alert(
      'Open Location',
      `Open "${location}" in maps?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Google Maps', onPress: () => openInMaps(location, 'google') },
        { text: 'Apple Maps', onPress: () => openInMaps(location, 'apple') },
      ]
    );
  };

  const openInMaps = (location: string, provider: string) => {
    const query = encodeURIComponent(location);
    const url = provider === 'google' 
      ? `https://www.google.com/maps/search/?api=1&query=${query}`
      : `http://maps.apple.com/?q=${query}`;
    Linking.openURL(url);
  };

  // Handle survey submission
  const handleSurveySubmit = async () => {
    if (surveyRating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    try {
      await submitSurveyResponse(
        guest.id,
        guest.eventId || '',
        selectedEvent?.moduleData?.id || selectedEvent?.id,
        surveyRating,
        surveyComment
      );
      
      Alert.alert('Success', 'Survey submitted successfully!');
      setShowSurveyModal(false);
      setSurveyRating(0);
      setSurveyComment('');
    } catch (error) {
      console.error('Survey submission error:', error);
      Alert.alert('Error', 'Failed to submit survey. Please try again.');
    }
  };

  // Handle feedback submission  
  const handleFeedbackSubmit = async () => {
    if (feedbackRating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    try {
      await submitFeedbackResponse(
        guest.id,
        guest.eventId || '',
        selectedEvent?.moduleData?.id || selectedEvent?.id,
        feedbackRating,
        feedbackComment
      );
      
      Alert.alert('Success', 'Feedback submitted successfully!');
      setShowFeedbackModal(false);
      setFeedbackRating(0);
      setFeedbackComment('');
    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  // Handle QR code actions
  const handleQrAction = (action: 'link' | 'file') => {
    const moduleData = selectedEvent?.moduleData;
    if (action === 'link' && moduleData?.link) {
      Linking.openURL(moduleData.link);
    } else if (action === 'file' && moduleData?.file) {
      Linking.openURL(moduleData.file);
    }
    setShowQrModal(false);
  };

  // Render timeline event
  const renderTimelineEvent = (event: any, index: number) => {
    const status = getEventStatus(event);
    const isModule = !!event.module;
    
    return (
      <TouchableOpacity
        key={event.id}
        style={styles.timelineEvent}
        onPress={() => handleEventPress(event)}
      >
        <View style={styles.timelineLeft}>
          <Text style={styles.timeText}>{formatTime(event.start_time)}</Text>
          <View style={[
            styles.timelineDot,
            status === 'current' && styles.currentDot,
            status === 'past' && styles.pastDot,
            isModule && styles.moduleDot
          ]} />
        </View>
        
        <View style={styles.timelineRight}>
          <View style={[
            styles.eventCard,
            status === 'current' && styles.currentEventCard
          ]}>
            <Text style={[
              styles.eventTitle,
              isModule && styles.moduleTitle
            ]}>
              {isModule ? `📋 ${event.title}` : event.title}
            </Text>
            
            {event.location && (
              <TouchableOpacity onPress={() => handleLocationPress(event.location)}>
                <Text style={styles.eventLocation}>📍 {event.location}</Text>
              </TouchableOpacity>
            )}
            
            {event.description && (
              <Text style={styles.eventDescription}>{event.description}</Text>
            )}
            
            <View style={styles.eventFooter}>
              <Text style={[
                styles.statusText,
                status === 'current' && styles.currentStatus,
                status === 'past' && styles.pastStatus
              ]}>
                {status === 'current' ? 'Happening Now' : 
                 status === 'past' ? 'Completed' : 'Upcoming'}
              </Text>
              
              {event.end_time && event.end_time !== event.start_time && (
                <Text style={styles.endTime}>
                  Until {formatTime(event.end_time)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your timeline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.guestName}>{guest.name}</Text>
        <Text style={styles.currentTime}>
          {currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>

      {/* Timeline */}
      <ScrollView
        style={styles.timeline}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {mergedTimeline.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No events today</Text>
            <Text style={styles.emptySubtitle}>
              Your timeline will appear here when events are assigned
            </Text>
          </View>
        ) : (
          mergedTimeline.map((event, index) => renderTimelineEvent(event, index))
        )}
      </ScrollView>

      {/* Event Detail Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalTime}>
                {formatTime(selectedEvent?.start_time)} - {formatTime(selectedEvent?.end_time)}
              </Text>
              
              {selectedEvent?.location && (
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={() => handleLocationPress(selectedEvent.location)}
                >
                  <Text style={styles.locationButtonText}>
                    📍 {selectedEvent.location}
                  </Text>
                </TouchableOpacity>
              )}
              
              {selectedEvent?.description && (
                <Text style={styles.modalDescription}>
                  {selectedEvent.description}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Survey Modal */}
      <Modal
        visible={showSurveyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSurveyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Survey</Text>
              <TouchableOpacity onPress={() => setShowSurveyModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.surveyQuestion}>
                {selectedEvent?.moduleData?.title || 'How was your experience?'}
              </Text>
              
              <StarRating
                rating={surveyRating}
                onRatingChange={setSurveyRating}
              />
              
              <TextInput
                style={styles.commentInput}
                placeholder="Additional comments (optional)"
                value={surveyComment}
                onChangeText={setSurveyComment}
                multiline
                maxLength={500}
              />
              
              <TouchableOpacity
                style={[styles.submitButton, surveyRating === 0 && styles.disabledButton]}
                onPress={handleSurveySubmit}
                disabled={surveyRating === 0}
              >
                <Text style={styles.submitButtonText}>Submit Survey</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Feedback</Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.surveyQuestion}>
                {selectedEvent?.moduleData?.question || 'Share your feedback'}
              </Text>
              
              <StarRating
                rating={feedbackRating}
                onRatingChange={setFeedbackRating}
              />
              
              <TextInput
                style={styles.commentInput}
                placeholder="Your feedback (optional)"
                value={feedbackComment}
                onChangeText={setFeedbackComment}
                multiline
                maxLength={500}
              />
              
              <TouchableOpacity
                style={[styles.submitButton, feedbackRating === 0 && styles.disabledButton]}
                onPress={handleFeedbackSubmit}
                disabled={feedbackRating === 0}
              >
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQrModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedEvent?.moduleData?.label || 'QR Code'}
              </Text>
              <TouchableOpacity onPress={() => setShowQrModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {selectedEvent?.moduleData?.link && (
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#007AFF' }]}
                  onPress={() => handleQrAction('link')}
                >
                  <Text style={styles.submitButtonText}>🔗 Open Link</Text>
                </TouchableOpacity>
              )}
              
              {selectedEvent?.moduleData?.file && (
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#34C759', marginTop: 10 }]}
                  onPress={() => handleQrAction('file')}
                >
                  <Text style={styles.submitButtonText}>📄 View File</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6b7280',
  },
  guestName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  currentTime: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  timeline: {
    flex: 1,
    padding: 20,
  },
  timelineEvent: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    width: 80,
    alignItems: 'center',
    paddingTop: 5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9ca3af',
  },
  currentDot: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  pastDot: {
    backgroundColor: '#10b981',
  },
  moduleDot: {
    backgroundColor: '#8b5cf6',
  },
  timelineRight: {
    flex: 1,
    marginLeft: 15,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentEventCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  moduleTitle: {
    color: '#8b5cf6',
  },
  eventLocation: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  currentStatus: {
    color: '#3b82f6',
  },
  pastStatus: {
    color: '#10b981',
  },
  endTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  modalTime: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 12,
  },
  locationButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  surveyQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  starButton: {
    padding: 5,
  },
  starText: {
    fontSize: 24,
  },
  ratingText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#fbbf24',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
 
 