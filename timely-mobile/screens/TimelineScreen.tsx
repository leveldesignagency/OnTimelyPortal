import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native'
import { getCurrentUser } from '../lib/auth'
import { 
  getGuestAssignedItineraries, 
  getEventTimelineModules, 
  submitSurveyResponse, 
  submitFeedbackResponse,
  type ItineraryItem,
  type TimelineModule 
} from '../lib/supabase'

interface TimelineEvent extends ItineraryItem {
  moduleType?: string
  moduleData?: TimelineModule
  isModule?: boolean
}

const TimelineScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null)
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([])
  const [modules, setModules] = useState<TimelineModule[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [surveyRating, setSurveyRating] = useState(5)
  const [surveyComment, setSurveyComment] = useState('')
  const [feedbackText, setFeedbackText] = useState('')

  useEffect(() => {
    loadUserAndTimeline()
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const loadUserAndTimeline = async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to view timeline')
        return
      }
      setUser(currentUser)

      // For guests, get their assigned itineraries
      if (currentUser.isGuest && currentUser.eventId) {
        await loadGuestTimeline(currentUser.id, currentUser.eventId)
      } else {
        // For admin users, we'd need to implement event selection
        Alert.alert('Info', 'Admin timeline view coming soon')
      }
    } catch (error) {
      console.error('Error loading timeline:', error)
      Alert.alert('Error', 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  const loadGuestTimeline = async (guestId: string, eventId: string) => {
    try {
      // Load both itineraries and modules in parallel
      const [itinerariesData, modulesData] = await Promise.all([
        getGuestAssignedItineraries(guestId, eventId),
        getEventTimelineModules(eventId)
      ])

      setItineraries(itinerariesData || [])
      setModules(modulesData || [])
    } catch (error) {
      console.error('Error loading guest timeline:', error)
      Alert.alert('Error', 'Failed to load timeline data')
    }
  }

  // Merge and sort itineraries with modules (similar to desktop logic)
  const sortedEvents = useMemo(() => {
    const events: TimelineEvent[] = []

    // Add itineraries
    itineraries.forEach(itinerary => {
      events.push({
        ...itinerary,
        isModule: false
      })
    })

    // Add modules as timeline events
    modules.forEach(module => {
      if (module.time) {
        events.push({
          id: module.id,
          title: module.title || 'Timeline Module',
          description: module.question || '',
          date: new Date().toISOString().split('T')[0] as any, // Today's date
          start_time: module.time,
          end_time: module.time,
          location: '',
          isModule: true,
          moduleType: module.module_type,
          moduleData: module
        })
      }
    })

    // Sort by time
    return events.sort((a, b) => {
      const timeA = a.start_time ? a.start_time.toString() : '00:00'
      const timeB = b.start_time ? b.start_time.toString() : '00:00'
      return timeA.localeCompare(timeB)
    })
  }, [itineraries, modules])

  const getEventStatus = (event: TimelineEvent) => {
    const now = currentTime
    const eventTime = new Date()
    const [hours, minutes] = (event.start_time?.toString() || '00:00').split(':')
    eventTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    const diffMinutes = (now.getTime() - eventTime.getTime()) / (1000 * 60)
    
    if (diffMinutes < -30) return 'upcoming'
    if (diffMinutes >= -30 && diffMinutes <= 30) return 'current'
    return 'past'
  }

  const handleEventPress = (event: TimelineEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleModuleAction = (module: TimelineModule) => {
    if (module.module_type === 'survey') {
      setSelectedEvent({ ...selectedEvent!, moduleData: module })
      setShowSurveyModal(true)
    } else if (module.module_type === 'feedback') {
      setSelectedEvent({ ...selectedEvent!, moduleData: module })
      setShowFeedbackModal(true)
    }
    setShowEventModal(false)
  }

  const handleSurveySubmit = async () => {
    if (!selectedEvent?.moduleData || !user) return

    try {
      await submitSurveyResponse(
        user.id,
        user.eventId || '',
        selectedEvent.moduleData.id,
        surveyRating,
        surveyComment
      )
      Alert.alert('Success', 'Survey submitted successfully!')
      setShowSurveyModal(false)
      setSurveyRating(5)
      setSurveyComment('')
    } catch (error) {
      console.error('Error submitting survey:', error)
      Alert.alert('Error', 'Failed to submit survey')
    }
  }

  const handleFeedbackSubmit = async () => {
    if (!selectedEvent?.moduleData || !user) return

    try {
      await submitFeedbackResponse(
        user.id,
        user.eventId || '',
        selectedEvent.moduleData.id,
        feedbackText
      )
      Alert.alert('Success', 'Feedback submitted successfully!')
      setShowFeedbackModal(false)
      setFeedbackText('')
    } catch (error) {
      console.error('Error submitting feedback:', error)
      Alert.alert('Error', 'Failed to submit feedback')
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadUserAndTimeline()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading timeline...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
        {user?.isGuest && (
          <Text style={styles.subtitle}>Welcome, {user.name}</Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {sortedEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No timeline events found</Text>
            <Text style={styles.emptySubtext}>
              Check back later or contact your event organizer
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {sortedEvents.map((event, index) => {
              const status = getEventStatus(event)
              return (
                <TouchableOpacity
                  key={`${event.id}-${index}`}
                  style={styles.eventContainer}
                  onPress={() => handleEventPress(event)}
                >
                  <View style={styles.timelineLineContainer}>
                    <View style={[styles.eventDot, styles[`${status}Dot`]]} />
                    {index < sortedEvents.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTime}>
                        {event.start_time?.toString() || 'TBD'}
                      </Text>
                      {event.isModule && (
                        <View style={styles.moduleTag}>
                          <Text style={styles.moduleTagText}>
                            {event.moduleType?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.eventTitle, styles[`${status}Title`]]}>
                      {event.title}
                    </Text>
                    
                    {event.description && (
                      <Text style={styles.eventDescription}>
                        {event.description}
                      </Text>
                    )}
                    
                    {event.location && (
                      <Text style={styles.eventLocation}>📍 {event.location}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Event Detail Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Event Details</Text>
            <TouchableOpacity onPress={() => setShowEventModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedEvent && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
              <Text style={styles.eventDetailTime}>
                {selectedEvent.start_time?.toString()} - {selectedEvent.end_time?.toString()}
              </Text>
              
              {selectedEvent.description && (
                <Text style={styles.eventDetailDescription}>
                  {selectedEvent.description}
                </Text>
              )}
              
              {selectedEvent.location && (
                <Text style={styles.eventDetailLocation}>
                  📍 {selectedEvent.location}
                </Text>
              )}
              
              {selectedEvent.isModule && selectedEvent.moduleData && (
                <View style={styles.moduleActions}>
                  <TouchableOpacity
                    style={styles.moduleButton}
                    onPress={() => handleModuleAction(selectedEvent.moduleData!)}
                  >
                    <Text style={styles.moduleButtonText}>
                      {selectedEvent.moduleType === 'survey' ? 'Take Survey' : 'Leave Feedback'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Survey Modal */}
      <Modal visible={showSurveyModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Survey</Text>
            <TouchableOpacity onPress={() => setShowSurveyModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.surveyQuestion}>
              {selectedEvent?.moduleData?.question || 'How would you rate this event?'}
            </Text>
            
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating: {surveyRating}/5</Text>
              <View style={styles.ratingButtons}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      surveyRating === rating && styles.selectedRating
                    ]}
                    onPress={() => setSurveyRating(rating)}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      surveyRating === rating && styles.selectedRatingText
                    ]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              value={surveyComment}
              onChangeText={setSurveyComment}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity style={styles.submitButton} onPress={handleSurveySubmit}>
              <Text style={styles.submitButtonText}>Submit Survey</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Feedback</Text>
            <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.feedbackQuestion}>
              {selectedEvent?.moduleData?.question || 'Please share your feedback:'}
            </Text>
            
            <TextInput
              style={styles.feedbackInput}
              placeholder="Enter your feedback..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={6}
            />
            
            <TouchableOpacity style={styles.submitButton} onPress={handleFeedbackSubmit}>
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  timelineContainer: {
    padding: 20,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLineContainer: {
    width: 30,
    alignItems: 'center',
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
    zIndex: 1,
  },
  upcomingDot: {
    backgroundColor: '#007AFF',
  },
  currentDot: {
    backgroundColor: '#34C759',
  },
  pastDot: {
    backgroundColor: '#8E8E93',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#ddd',
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
    marginLeft: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  moduleTag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moduleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  upcomingTitle: {
    color: '#007AFF',
  },
  currentTitle: {
    color: '#34C759',
  },
  pastTitle: {
    color: '#8E8E93',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  eventDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDetailTime: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 16,
  },
  eventDetailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  eventDetailLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  moduleActions: {
    marginTop: 20,
  },
  moduleButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  moduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  surveyQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRating: {
    backgroundColor: '#007AFF',
  },
  ratingButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  selectedRatingText: {
    color: '#fff',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  feedbackQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#fff',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default TimelineScreen 
}) 
 
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native'
import { getCurrentUser } from '../lib/auth'
import { 
  getGuestAssignedItineraries, 
  getEventTimelineModules, 
  submitSurveyResponse, 
  submitFeedbackResponse,
  type ItineraryItem,
  type TimelineModule 
} from '../lib/supabase'

interface TimelineEvent extends ItineraryItem {
  moduleType?: string
  moduleData?: TimelineModule
  isModule?: boolean
}

const TimelineScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null)
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([])
  const [modules, setModules] = useState<TimelineModule[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [surveyRating, setSurveyRating] = useState(5)
  const [surveyComment, setSurveyComment] = useState('')
  const [feedbackText, setFeedbackText] = useState('')

  useEffect(() => {
    loadUserAndTimeline()
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const loadUserAndTimeline = async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to view timeline')
        return
      }
      setUser(currentUser)

      // For guests, get their assigned itineraries
      if (currentUser.isGuest && currentUser.eventId) {
        await loadGuestTimeline(currentUser.id, currentUser.eventId)
      } else {
        // For admin users, we'd need to implement event selection
        Alert.alert('Info', 'Admin timeline view coming soon')
      }
    } catch (error) {
      console.error('Error loading timeline:', error)
      Alert.alert('Error', 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  const loadGuestTimeline = async (guestId: string, eventId: string) => {
    try {
      // Load both itineraries and modules in parallel
      const [itinerariesData, modulesData] = await Promise.all([
        getGuestAssignedItineraries(guestId, eventId),
        getEventTimelineModules(eventId)
      ])

      setItineraries(itinerariesData || [])
      setModules(modulesData || [])
    } catch (error) {
      console.error('Error loading guest timeline:', error)
      Alert.alert('Error', 'Failed to load timeline data')
    }
  }

  // Merge and sort itineraries with modules (similar to desktop logic)
  const sortedEvents = useMemo(() => {
    const events: TimelineEvent[] = []

    // Add itineraries
    itineraries.forEach(itinerary => {
      events.push({
        ...itinerary,
        isModule: false
      })
    })

    // Add modules as timeline events
    modules.forEach(module => {
      if (module.time) {
        events.push({
          id: module.id,
          title: module.title || 'Timeline Module',
          description: module.question || '',
          date: new Date().toISOString().split('T')[0] as any, // Today's date
          start_time: module.time,
          end_time: module.time,
          location: '',
          isModule: true,
          moduleType: module.module_type,
          moduleData: module
        })
      }
    })

    // Sort by time
    return events.sort((a, b) => {
      const timeA = a.start_time ? a.start_time.toString() : '00:00'
      const timeB = b.start_time ? b.start_time.toString() : '00:00'
      return timeA.localeCompare(timeB)
    })
  }, [itineraries, modules])

  const getEventStatus = (event: TimelineEvent) => {
    const now = currentTime
    const eventTime = new Date()
    const [hours, minutes] = (event.start_time?.toString() || '00:00').split(':')
    eventTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    const diffMinutes = (now.getTime() - eventTime.getTime()) / (1000 * 60)
    
    if (diffMinutes < -30) return 'upcoming'
    if (diffMinutes >= -30 && diffMinutes <= 30) return 'current'
    return 'past'
  }

  const handleEventPress = (event: TimelineEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleModuleAction = (module: TimelineModule) => {
    if (module.module_type === 'survey') {
      setSelectedEvent({ ...selectedEvent!, moduleData: module })
      setShowSurveyModal(true)
    } else if (module.module_type === 'feedback') {
      setSelectedEvent({ ...selectedEvent!, moduleData: module })
      setShowFeedbackModal(true)
    }
    setShowEventModal(false)
  }

  const handleSurveySubmit = async () => {
    if (!selectedEvent?.moduleData || !user) return

    try {
      await submitSurveyResponse(
        user.id,
        user.eventId || '',
        selectedEvent.moduleData.id,
        surveyRating,
        surveyComment
      )
      Alert.alert('Success', 'Survey submitted successfully!')
      setShowSurveyModal(false)
      setSurveyRating(5)
      setSurveyComment('')
    } catch (error) {
      console.error('Error submitting survey:', error)
      Alert.alert('Error', 'Failed to submit survey')
    }
  }

  const handleFeedbackSubmit = async () => {
    if (!selectedEvent?.moduleData || !user) return

    try {
      await submitFeedbackResponse(
        user.id,
        user.eventId || '',
        selectedEvent.moduleData.id,
        feedbackText
      )
      Alert.alert('Success', 'Feedback submitted successfully!')
      setShowFeedbackModal(false)
      setFeedbackText('')
    } catch (error) {
      console.error('Error submitting feedback:', error)
      Alert.alert('Error', 'Failed to submit feedback')
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadUserAndTimeline()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading timeline...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
        {user?.isGuest && (
          <Text style={styles.subtitle}>Welcome, {user.name}</Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {sortedEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No timeline events found</Text>
            <Text style={styles.emptySubtext}>
              Check back later or contact your event organizer
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {sortedEvents.map((event, index) => {
              const status = getEventStatus(event)
              return (
                <TouchableOpacity
                  key={`${event.id}-${index}`}
                  style={styles.eventContainer}
                  onPress={() => handleEventPress(event)}
                >
                  <View style={styles.timelineLineContainer}>
                    <View style={[styles.eventDot, styles[`${status}Dot`]]} />
                    {index < sortedEvents.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTime}>
                        {event.start_time?.toString() || 'TBD'}
                      </Text>
                      {event.isModule && (
                        <View style={styles.moduleTag}>
                          <Text style={styles.moduleTagText}>
                            {event.moduleType?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.eventTitle, styles[`${status}Title`]]}>
                      {event.title}
                    </Text>
                    
                    {event.description && (
                      <Text style={styles.eventDescription}>
                        {event.description}
                      </Text>
                    )}
                    
                    {event.location && (
                      <Text style={styles.eventLocation}>📍 {event.location}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Event Detail Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Event Details</Text>
            <TouchableOpacity onPress={() => setShowEventModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedEvent && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
              <Text style={styles.eventDetailTime}>
                {selectedEvent.start_time?.toString()} - {selectedEvent.end_time?.toString()}
              </Text>
              
              {selectedEvent.description && (
                <Text style={styles.eventDetailDescription}>
                  {selectedEvent.description}
                </Text>
              )}
              
              {selectedEvent.location && (
                <Text style={styles.eventDetailLocation}>
                  📍 {selectedEvent.location}
                </Text>
              )}
              
              {selectedEvent.isModule && selectedEvent.moduleData && (
                <View style={styles.moduleActions}>
                  <TouchableOpacity
                    style={styles.moduleButton}
                    onPress={() => handleModuleAction(selectedEvent.moduleData!)}
                  >
                    <Text style={styles.moduleButtonText}>
                      {selectedEvent.moduleType === 'survey' ? 'Take Survey' : 'Leave Feedback'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Survey Modal */}
      <Modal visible={showSurveyModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Survey</Text>
            <TouchableOpacity onPress={() => setShowSurveyModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.surveyQuestion}>
              {selectedEvent?.moduleData?.question || 'How would you rate this event?'}
            </Text>
            
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating: {surveyRating}/5</Text>
              <View style={styles.ratingButtons}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      surveyRating === rating && styles.selectedRating
                    ]}
                    onPress={() => setSurveyRating(rating)}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      surveyRating === rating && styles.selectedRatingText
                    ]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              value={surveyComment}
              onChangeText={setSurveyComment}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity style={styles.submitButton} onPress={handleSurveySubmit}>
              <Text style={styles.submitButtonText}>Submit Survey</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Feedback</Text>
            <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.feedbackQuestion}>
              {selectedEvent?.moduleData?.question || 'Please share your feedback:'}
            </Text>
            
            <TextInput
              style={styles.feedbackInput}
              placeholder="Enter your feedback..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={6}
            />
            
            <TouchableOpacity style={styles.submitButton} onPress={handleFeedbackSubmit}>
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  timelineContainer: {
    padding: 20,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLineContainer: {
    width: 30,
    alignItems: 'center',
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
    zIndex: 1,
  },
  upcomingDot: {
    backgroundColor: '#007AFF',
  },
  currentDot: {
    backgroundColor: '#34C759',
  },
  pastDot: {
    backgroundColor: '#8E8E93',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#ddd',
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
    marginLeft: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  moduleTag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moduleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  upcomingTitle: {
    color: '#007AFF',
  },
  currentTitle: {
    color: '#34C759',
  },
  pastTitle: {
    color: '#8E8E93',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  eventDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDetailTime: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 16,
  },
  eventDetailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  eventDetailLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  moduleActions: {
    marginTop: 20,
  },
  moduleButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  moduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  surveyQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRating: {
    backgroundColor: '#007AFF',
  },
  ratingButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  selectedRatingText: {
    color: '#fff',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  feedbackQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#fff',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default TimelineScreen 
}) 
 