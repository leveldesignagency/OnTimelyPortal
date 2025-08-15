import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface GuestFormResponse {
  id: string;
  form_id: string;
  email: string;
  responses: any;
  submitted_at: string;
  event_name?: string;
  guest_id?: string;
}

interface FormStats {
  totalResponses: number;
  totalFormsSent: number;
}

interface GuestFormResponsesPageProps {
  onNavigate: (route: string) => void;
  onGoBack?: () => void;
  eventId?: string;
  route?: any;
  navigation?: any;
}

export default function GuestFormResponsesPage({ onNavigate, onGoBack, eventId, route, navigation }: GuestFormResponsesPageProps) {
  // Use navigation.goBack() directly if available, otherwise fall back to onGoBack prop
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else if (onGoBack) {
      onGoBack();
    }
  };
  const insets = useSafeAreaInsets();
  const [formResponses, setFormResponses] = useState<GuestFormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<FormStats>({
    totalResponses: 0,
    totalFormsSent: 0
  });

  useEffect(() => {
    // Get eventId from route params if not passed as prop
    const currentEventId = eventId || route?.params?.eventId;
    console.log('🔍 useEffect triggered with eventId:', currentEventId);
    
    if (currentEventId) {
      console.log('✅ EventId found, calling loadGuestFormResponses...');
      loadGuestFormResponses();
      
      // Set up real-time subscription for form submissions
      const subscription = supabase
        .channel('form_submissions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'form_submissions'
          },
          (payload) => {
            console.log('📡 Real-time form submission update:', payload);
            if (payload.eventType === 'INSERT') {
              loadGuestFormResponses();
            }
          }
        )
        .subscribe();

      // Subscribe to guests table changes
      const guestsSubscription = supabase
        .channel('guests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guests'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              loadGuestFormResponses();
            } else if (payload.eventType === 'DELETE') {
              // Remove deleted guest from responses immediately
              setFormResponses(prev => 
                prev.filter(response => response.email !== payload.old.email)
              );
              // Update stats
              setStats(prev => ({
                ...prev,
                totalResponses: Math.max(0, prev.totalResponses - 1)
              }));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
        guestsSubscription.unsubscribe();
      };
    }
  }, [eventId]);

  const loadGuestFormResponses = async () => {
    try {
      // Get eventId from route params if not passed as prop
      const currentEventId = eventId || route?.params?.eventId;
      console.log('🔄 Starting loadGuestFormResponses with eventId:', currentEventId);
      setLoading(true);

      // Get current user to filter by company
      console.log('🔍 Getting current user...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ User not authenticated');
        setError('User not authenticated');
        return;
      }
      console.log('✅ User authenticated:', user.id);

      // Get user's company_id
      console.log('🔍 Getting user profile...');
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userProfile?.company_id) {
        console.error('❌ Company ID not found');
        setError('Company ID not found');
        return;
      }
      console.log('✅ Company ID found:', userProfile.company_id);

      // Fetch form submissions with event details - filter by specific event
      console.log('🔍 Building query for form submissions...');
      let query = supabase
        .from('form_submissions')
        .select(`
          id,
          form_id,
          email,
          responses,
          submitted_at,
          forms!inner(
            event_id,
            title,
            events!inner(
              name,
              company_id
            )
          )
        `)
        .eq('forms.events.company_id', userProfile.company_id);
      
      // Filter by specific event if eventId is provided
      if (currentEventId) {
        query = query.eq('forms.event_id', currentEventId);
        console.log('🎯 Filtering submissions by event ID:', currentEventId);
      }
      
      console.log('🔍 Executing query...');
      const { data: submissions, error: submissionsError } = await query.order('submitted_at', { ascending: false });
      console.log('📊 Query result:', { submissions: submissions?.length || 0, error: submissionsError });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        setError('Failed to load form submissions');
        return;
      }

      // Transform the data and filter out submissions where guest no longer exists
      console.log('🔄 Starting guest filtering process...');
      const transformedResponses: GuestFormResponse[] = [];
      
      for (const sub of submissions || []) {
        try {
          console.log('🔍 Checking guest existence for:', sub.email);
          // Check if the guest still exists in the database
          const { data: guestExists, error: guestError } = await supabase
            .from('guests')
            .select('id')
            .eq('email', sub.email)
            .eq('event_id', sub.forms?.event_id)
            .single();
          
          console.log('🔍 Guest check result:', { email: sub.email, exists: !!guestExists, error: guestError });
          
          // Only include submissions where the guest still exists
          if (guestExists && !guestError) {
            transformedResponses.push({
              id: sub.id,
              form_id: sub.form_id,
              email: sub.email,
              responses: sub.responses,
              submitted_at: sub.submitted_at,
              event_name: sub.forms?.events?.name || 'Unknown Event'
            });
            console.log('✅ Guest included:', sub.email);
          } else {
            console.log('🗑️ Filtering out submission for deleted guest:', sub.email, guestError);
          }
        } catch (error) {
          console.log('🗑️ Error checking guest existence, filtering out:', sub.email, error);
        }
      }
      
      console.log('🔄 Guest filtering complete. Total responses:', transformedResponses.length);

      console.log('📊 Setting form responses:', transformedResponses.length);
      setFormResponses(transformedResponses);

      // Fetch stats
      console.log('📊 Loading stats...');
      await loadStats(userProfile.company_id, transformedResponses.length, currentEventId);
      console.log('✅ Stats loaded successfully');

    } catch (err) {
      console.error('❌ Error in loadGuestFormResponses:', err);
      setError('Failed to load guest form responses');
      console.error('Error loading guest form responses:', err);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const loadStats = async (companyId: string, responsesCount: number, currentEventId?: string) => {
    try {
      if (!currentEventId) {
        setStats({
          totalResponses: responsesCount,
          totalFormsSent: 0
        });
        return;
      }

      // Get total forms sent for this specific event
      let totalFormsSent = 0;
      
      // First get the form IDs for this event
      const { data: formIds, error: formIdsError } = await supabase
        .from('forms')
        .select('id')
        .eq('company_id', companyId)
        .eq('event_id', currentEventId);
      
      if (formIdsError) {
        console.error('Error fetching form IDs:', formIdsError);
      } else if (formIds && formIds.length > 0) {
        // Extract the form IDs into an array
        const formIdArray = formIds.map(f => f.id);
        
        // Now count the form recipients for these forms
        const { count: formsSent, error: countError } = await supabase
          .from('form_recipients')
          .select('*', { count: 'exact', head: true })
          .in('form_id', formIdArray);
        
        if (countError) {
          console.error('Error counting form recipients:', countError);
        } else {
          totalFormsSent = formsSent || 0;
        }
      }

      setStats({
        totalResponses: responsesCount,
        totalFormsSent: totalFormsSent
      });

    } catch (err) {
      console.error('Error loading stats:', err);
      setStats({
        totalResponses: responsesCount,
        totalFormsSent: 0
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const navigateToEventDashboard = async (formId: string, guestEmail: string) => {
    try {
      // Get the event ID from the form
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('event_id')
        .eq('id', formId)
        .single();

      if (formError) {
        console.error('Error fetching form data:', formError);
        return;
      }

      if (formData?.event_id) {
        // Navigate back to EventDashboard
        goBack();
      } else {
        console.error('No event_id found for form:', formId);
      }
    } catch (error) {
      console.error('Error navigating to EventDashboard:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Guest Form Responses</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading guest form responses...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Guest Form Responses</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalResponses}</Text>
            <Text style={styles.statLabel}>Total Responses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalFormsSent}</Text>
            <Text style={styles.statLabel}>Forms Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.totalFormsSent > 0 ? Math.round((stats.totalResponses / stats.totalFormsSent) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Completed Forms</Text>
          </View>
        </View>

        {/* Form Responses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Form Responses</Text>
          
          {formResponses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No form responses yet</Text>
              <Text style={styles.emptyStateSubtext}>
                When guests complete forms via the Send Form feature, their responses will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.responsesList}>
              {formResponses.map((response) => (
                <View key={response.id} style={styles.responseCard}>
                  <View style={styles.responseHeader}>
                    <Text style={styles.responseEmail}>{response.email}</Text>
                    <Text style={styles.responseDate}>{formatDate(response.submitted_at)}</Text>
                  </View>
                  <Text style={styles.responseEvent}>{response.event_name || 'Unknown Event'}</Text>
                  
                  {/* Guest Details from Responses */}
                  {response.responses && (
                    <View style={styles.guestDetails}>
                      {/* Basic Info */}
                      {(response.responses.first_name || response.responses.firstName) && (
                        <Text style={styles.guestName}>
                          {response.responses.first_name || response.responses.firstName} {response.responses.last_name || response.responses.lastName}
                        </Text>
                      )}
                      
                      {/* Contact Info */}
                      {(response.responses.contact_number || response.responses.contactNumber) && (
                        <Text style={styles.guestContact}>
                          📞 {response.responses.contact_number || response.responses.contactNumber}
                        </Text>
                      )}
                      
                      {/* Dietary Requirements */}
                      {(response.responses.dietary && Array.isArray(response.responses.dietary) && response.responses.dietary.length > 0) && (
                        <View style={styles.tagsContainer}>
                          <Text style={styles.tagsLabel}>🍽️ Dietary:</Text>
                          <View style={styles.tagsList}>
                            {response.responses.dietary.slice(0, 3).map((diet: string, index: number) => (
                              <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{diet}</Text>
                              </View>
                            ))}
                            {response.responses.dietary.length > 3 && (
                              <Text style={styles.moreTags}>+{response.responses.dietary.length - 3} more</Text>
                            )}
                          </View>
                        </View>
                      )}
                      
                      {/* Medical Information */}
                      {(response.responses.medical && Array.isArray(response.responses.medical) && response.responses.medical.length > 0) && (
                        <View style={styles.tagsContainer}>
                          <Text style={styles.tagsLabel}>🏥 Medical:</Text>
                          <View style={styles.tagsList}>
                            {response.responses.medical.slice(0, 2).map((med: string, index: number) => (
                              <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{med}</Text>
                              </View>
                            ))}
                            {response.responses.medical.length > 2 && (
                              <Text style={styles.moreTags}>+{response.responses.medical.length - 2} more</Text>
                            )}
                          </View>
                        </View>
                      )}
                      
                      {/* Next of Kin */}
                      {(response.responses.next_of_kin_name || response.responses.nextOfKinName) && (
                        <View style={styles.nextOfKinContainer}>
                          <Text style={styles.nextOfKinLabel}>🆘 Next of Kin:</Text>
                          <Text style={styles.nextOfKinText}>
                            {response.responses.next_of_kin_name || response.responses.nextOfKinName}
                          </Text>
                          {(response.responses.next_of_kin_phone || response.responses.nextOfKinPhone) && (
                            <Text style={styles.nextOfKinContact}>
                              📱 {response.responses.next_of_kin_phone || response.responses.nextOfKinPhone}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => navigateToEventDashboard(response.form_id, response.email)}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
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
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 0, // Prevents flex items from overflowing
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 16,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
  },
  responsesList: {
    gap: 16,
  },
  responseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  responseDate: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  responseEvent: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 16,
  },
  guestDetails: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  guestName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  guestContact: {
    color: '#10b981',
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tagsLabel: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
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
    fontSize: 12,
    fontWeight: '500',
  },
  moreTags: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  nextOfKinContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  nextOfKinLabel: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextOfKinText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  nextOfKinContact: {
    color: '#10b981',
    fontSize: 14,
  },
  viewDetailsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
}); 