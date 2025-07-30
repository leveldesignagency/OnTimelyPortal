import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useRealtimeGuests, useRealtimeItineraries } from '../hooks/useRealtime';
import GlobalHeader from '../components/GlobalHeader';

interface GuestLogin {
  id: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  status: 'pending' | 'invite_sent' | 'credentials_set' | 'accessed';
}

interface EventPortalManagementPageProps {
  eventId?: string;
  guestAssignments?: { [guestId: string]: string[] };
  guests?: any[];
  itineraries?: any[];
  activeAddOns?: any[];
}

export default function EventPortalManagementPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const eventId = route.params?.eventId || route.params?.eventId;
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [guestLogins, setGuestLogins] = useState<GuestLogin[]>([]);
  const [isGeneratingLogins, setIsGeneratingLogins] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedGuestsForGenerate, setSelectedGuestsForGenerate] = useState<string[]>([]);
  const [customModal, setCustomModal] = useState<{ title: string; message: string } | null>(null);
  const [loginsExpanded, setLoginsExpanded] = useState(true);
  const [expandedGuestCards, setExpandedGuestCards] = useState<{[guestId: string]: boolean}>({});
  const [showSidebar, setShowSidebar] = useState(false);

  // Handle guest card toggle
  const toggleGuestCard = (guestId: string) => {
    setExpandedGuestCards(prev => ({
      ...prev,
      [guestId]: !prev[guestId]
    }));
  };

  // Use real-time hooks for data
  const guestsData = useRealtimeGuests(eventId);
  const itinerariesData = useRealtimeItineraries(eventId);
  const guests = guestsData.guests || [];
  const itineraries = itinerariesData.itineraries || [];

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        
        if (error) throw error;
        setEvent(data);
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  // Load guest logins
  useEffect(() => {
    if (!eventId) return;
    
    const fetchGuestLogins = async () => {
      try {
        const { data, error } = await supabase
          .from('guest_logins')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && Array.isArray(data)) {
          const logins = data.map((row: any) => ({
            id: row.guest_id,
            email: row.email,
            temporaryPassword: row.password,
            loginUrl: row.login_url,
            status: 'pending' as const,
          }));
          setGuestLogins(logins);
        }
      } catch (error) {
        console.error('Error fetching guest logins:', error);
      }
    };

    fetchGuestLogins();
  }, [eventId]);

  // Generate guest logins
  const handleGenerateLogins = async (guestsToGenerate?: any[]) => {
    setIsGeneratingLogins(true);
    setShowGenerateModal(false);
    
    try {
      const guestsList = guestsToGenerate || guests;
      
      if (!guestsList || guestsList.length === 0) {
        throw new Error('No guests found for this event');
      }
      
      const newLogins: GuestLogin[] = [];
      const errorCounts: { [key: string]: number } = {};
      const duplicateEmails: string[] = [];
      const specialCharEmails: string[] = [];
      const otherErrors: string[] = [];
      
      for (const guest of guestsList) {
        try {
          const guestEmail = guest.email?.trim().toLowerCase();
          
          if (!guestEmail) {
            otherErrors.push(`Guest email is missing for: ${guest.first_name} ${guest.last_name}`);
            continue;
          }
          
          // Call the create_guest_login RPC function
          const { data: loginData, error: loginError } = await supabase.rpc('create_guest_login', {
            p_guest_id: guest.id,
            p_event_id: eventId,
            p_email: guestEmail
          });
          
          if (loginError) {
            const errorMessage = loginError.message;
            
            // Categorize errors
            if (errorMessage.includes('duplicate key value violates unique constraint')) {
              duplicateEmails.push(guestEmail);
            } else if (errorMessage.includes('international characters') || errorMessage.includes('special characters')) {
              specialCharEmails.push(guestEmail);
            } else {
              otherErrors.push(`${guestEmail}: ${errorMessage}`);
            }
            continue;
          }
          
          if (!loginData || loginData.length === 0) {
            otherErrors.push(`No login data returned for ${guestEmail}`);
            continue;
          }
          
          const loginRecord = loginData[0];
          const newLogin: GuestLogin = {
            id: guest.id,
            email: guestEmail,
            temporaryPassword: loginRecord.password,
            loginUrl: loginRecord.login_url,
            status: 'pending'
          };
          newLogins.push(newLogin);
          
        } catch (error) {
          otherErrors.push(`Failed to process ${guest.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setGuestLogins(newLogins);
      setIsGeneratingLogins(false);
      
      // Build concise error message
      let errorMessage = `Successfully created ${newLogins.length} guest accounts.`;
      
      if (duplicateEmails.length > 0 || specialCharEmails.length > 0 || otherErrors.length > 0) {
        errorMessage += '\n\nErrors:';
        
        if (duplicateEmails.length > 0) {
          errorMessage += `\n• ${duplicateEmails.length} duplicate emails (${duplicateEmails.slice(0, 3).join(', ')}${duplicateEmails.length > 3 ? ' +' + (duplicateEmails.length - 3) + ' more' : ''})`;
        }
        
        if (specialCharEmails.length > 0) {
          errorMessage += `\n• ${specialCharEmails.length} emails with special characters (${specialCharEmails.slice(0, 3).join(', ')}${specialCharEmails.length > 3 ? ' +' + (specialCharEmails.length - 3) + ' more' : ''})`;
        }
        
        if (otherErrors.length > 0) {
          errorMessage += `\n• ${otherErrors.length} other errors`;
        }
        
        setCustomModal({
          title: 'Some guests could not be processed',
          message: errorMessage,
        });
      } else {
        setShowSuccessModal(true);
      }
      
    } catch (error) {
      console.error('Failed to generate guest logins:', error);
      setIsGeneratingLogins(false);
      setCustomModal({
        title: 'Failed to create guest logins',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  // Copy login details
  const handleCopyLoginDetails = (login: GuestLogin) => {
    const details = `Email: ${login.email}\nPassword: ${login.temporaryPassword}`;
    // In a real app, you'd use a clipboard library
    Alert.alert('Copied!', 'Login details copied to clipboard');
  };

  // Send login details
  const handleSendLoginDetails = async (login: GuestLogin) => {
    try {
      // Update status to invite_sent
      setGuestLogins(prev => prev.map(l => 
        l.id === login.id ? { ...l, status: 'invite_sent' } : l
      ));
      
      Alert.alert('Success', `Invite sent to ${login.email}`);
      
    } catch (error) {
      console.error('Error sending login details:', error);
      Alert.alert('Error', `Failed to send invite to ${login.email}`);
    }
  };

  // Send all logins
  const handleSendAllLogins = async () => {
    const pendingLogins = guestLogins.filter(login => login.status === 'pending');
    
    if (pendingLogins.length === 0) {
      Alert.alert('No pending invites to send.');
      return;
    }
    
    for (const login of pendingLogins) {
      await handleSendLoginDetails(login);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    Alert.alert('Success', 'All invites sent successfully');
  };



  // Calculate stats
  const guestsWithAssignments = guests.filter(guest => 
    route.params?.guestAssignments?.[guest.id]?.length > 0
  ).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!guests.length) {
    return (
      <View style={styles.container}>
        <GlobalHeader
          title="Event Portal"
          onMenuPress={() => setShowSidebar(true)}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No guest data available. Please go back and select guests first.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalHeader
        title="Event Portal"
        onMenuPress={() => setShowSidebar(true)}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{guests.length}</Text>
              <Text style={styles.statLabel}>Total Guests</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>{guestsWithAssignments}</Text>
              <Text style={styles.statLabel}>Guests with Assignments</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#d97706' }]}>{itineraries.length}</Text>
              <Text style={styles.statLabel}>Itinerary Items</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#db2777' }]}>{route.params?.activeAddOns?.length || 0}</Text>
              <Text style={styles.statLabel}>Active Add-ons</Text>
            </View>
          </View>
        </View>

        {/* Launch Event Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Launch Event</Text>
          <Text style={styles.sectionDescription}>
            Launch your event to begin the timeline. Stage 1 will automatically be picked up if you have added it via the Guests Modules.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Launch</Text>
          </TouchableOpacity>
        </View>

        {/* Preview Timeline Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview Timeline</Text>
          <Text style={styles.sectionDescription}>
            Preview how the timeline will look, and add messages, updates and more in this user friendly experience builder.
          </Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('PreviewTimeline', { 
                eventId, 
                guests, 
                itineraries, 
                activeAddOns: route.params?.activeAddOns 
              });
            }}
          >
            <Text style={styles.actionButtonText}>Preview</Text>
          </TouchableOpacity>
        </View>

        {/* Event Homepage Builder Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Homepage Builder</Text>
          <Text style={styles.sectionDescription}>
            Create a custom homepage for your guests with all the need to knows about the event.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Guest Chat Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Chat</Text>
          <Text style={styles.sectionDescription}>
            Chat with your guests in real-time. All messages are delivered instantly with push notifications.
          </Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Open Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Guest Access Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Guest Accounts</Text>
          <Text style={styles.sectionDescription}>
            Generate temporary login credentials for guests to access their personalized mobile experience.
          </Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowGenerateModal(true)}
          >
            <Text style={styles.actionButtonText}>Generate Logins</Text>
          </TouchableOpacity>
        </View>

        {/* Guest Logins Display */}
        {guestLogins.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Login Credentials</Text>
              <TouchableOpacity
                style={styles.collapseButton}
                onPress={() => setLoginsExpanded(!loginsExpanded)}
              >
                <MaterialCommunityIcons 
                  name={loginsExpanded ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
            
            {loginsExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.loginsHeader}>
                  <Text style={styles.loginsTitle}>✅ Login Credentials Generated</Text>
                </View>
                <Text style={styles.loginsDescription}>
                  {guestLogins.length} login credentials have been generated. You can now copy or send these to your guests.
                </Text>
                
                {guestLogins.map((login) => (
                  <View key={login.id} style={styles.loginCard}>
                    <Text style={styles.loginEmail}>{login.email}</Text>
                    <Text style={styles.loginPassword}>
                      Password: <Text style={styles.passwordText}>{login.temporaryPassword}</Text>
                    </Text>
                    <Text style={styles.loginStatus}>
                      Status: <Text style={styles.statusText}>
                        {login.status === 'pending' ? 'Ready to Send' :
                         login.status === 'invite_sent' ? 'Invite Sent' :
                         login.status === 'credentials_set' ? 'Credentials Set' :
                         login.status === 'accessed' ? 'Accessed' : 'Unknown'}
                      </Text>
                    </Text>
                    <View style={styles.loginActions}>
                      <TouchableOpacity 
                        style={styles.copyButton}
                        onPress={() => handleCopyLoginDetails(login)}
                      >
                        <Text style={styles.copyButtonText}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.sendButton,
                          (login.status === 'invite_sent' || login.status === 'credentials_set' || login.status === 'accessed') && styles.sendButtonDisabled
                        ]}
                        onPress={() => handleSendLoginDetails(login)}
                        disabled={login.status === 'invite_sent' || login.status === 'credentials_set' || login.status === 'accessed'}
                      >
                        <Text style={styles.sendButtonText}>
                          {login.status === 'invite_sent' ? '✓ Invite Sent' : 
                           login.status === 'credentials_set' ? '✓ Credentials Set' :
                           login.status === 'accessed' ? '✓ Accessed' : 'Send Invite'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                
                <View style={styles.loginActionsBottom}>
                  <TouchableOpacity 
                    style={styles.regenerateButton}
                    onPress={() => setShowGenerateModal(true)}
                  >
                    <Text style={styles.regenerateButtonText}>Regenerate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.sendAllButtonInline}
                    onPress={handleSendAllLogins}
                  >
                    <Text style={styles.sendAllButtonText}>Send All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Guest Assignments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Assignments</Text>
          <View style={styles.guestCardsContainer}>
          {guests.map((guest) => {
            const assignedItins = (route.params?.guestAssignments?.[guest.id] || [])
              .map((itinId: string) => itineraries.find((itin: any) => String(itin.id) === String(itinId)))
              .filter(Boolean);
            
            const isExpanded = expandedGuestCards[guest.id] || false;
            
            return (
              <TouchableOpacity 
                key={guest.id} 
                style={styles.guestCard}
                onPress={() => toggleGuestCard(guest.id)}
              >
                <View style={styles.guestHeader}>
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestName}>
                      {`${guest.first_name || ''} ${guest.last_name || ''}`.trim() || guest.email}
                    </Text>
                    <Text style={styles.guestEmail}>
                      {assignedItins.length} assignments
                    </Text>
                  </View>
                </View>
                {guest.modules?.stage1TravelCompanion && (
                  <View style={styles.stage1BadgeTopRight}>
                    <Text style={styles.stage1BadgeText}>Stage 1</Text>
                  </View>
                )}
                
                <View style={styles.collapseIcon}>
                  <MaterialCommunityIcons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#ccc" 
                  />
                </View>
                
                {isExpanded && assignedItins.length > 0 && (
                  <View style={styles.assignmentsContainer}>
                    <Text style={styles.assignmentsTitle}>
                      Assigned Itineraries ({assignedItins.length})
                    </Text>
                    {assignedItins.map((itin: any) => (
                      <View key={itin.id} style={styles.itineraryItem}>
                        <Text style={styles.itineraryTitle}>{itin.title}</Text>
                        {(itin.start_time || itin.end_time) && (
                          <Text style={styles.itineraryTime}>
                            Time: {itin.start_time || 'TBD'} - {itin.end_time || 'TBD'}
                          </Text>
                        )}
                        {itin.location && (
                          <Text style={styles.itineraryLocation}>
                            Location: {itin.location}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                
                {isExpanded && route.params?.activeAddOns?.length > 0 && (
                  <View style={styles.addOnsContainer}>
                    <Text style={styles.addOnsTitle}>
                      Available Add-ons ({route.params.activeAddOns.length})
                    </Text>
                    <View style={styles.addOnsList}>
                      {route.params.activeAddOns.map((addon: any, index: number) => (
                        <View key={addon.id || addon.name || index} style={styles.addOnTag}>
                          <Text style={styles.addOnTagText}>
                            {addon.name || addon.type || addon.key || 'Unknown Add-on'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          </View>
        </View>
      </ScrollView>

      {/* Generate Logins Modal */}
      <Modal
        visible={showGenerateModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate Guest Logins</Text>
            <Text style={styles.modalDescription}>
              This will create temporary login credentials for the selected guests. Each guest will receive:
            </Text>
            <Text style={styles.modalList}>• A unique login URL for the mobile app</Text>
            <Text style={styles.modalList}>• A temporary password (8 characters)</Text>
            <Text style={styles.modalList}>• Access to their personalized itinerary and add-ons</Text>
            
            <Text style={styles.modalSubtitle}>Guest Emails:</Text>
            <TouchableOpacity 
              style={styles.selectAllButton}
              onPress={() => setSelectedGuestsForGenerate(
                selectedGuestsForGenerate.length === guests.length ? [] : guests.map(g => g.id)
              )}
            >
              <Text style={styles.selectAllButtonText}>
                {selectedGuestsForGenerate.length === guests.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            
            <ScrollView style={styles.guestsList}>
              {guests.map((guest) => (
                <TouchableOpacity
                  key={guest.id}
                  style={styles.guestSelectItem}
                  onPress={() => {
                    if (selectedGuestsForGenerate.includes(guest.id)) {
                      setSelectedGuestsForGenerate(prev => prev.filter(id => id !== guest.id));
                    } else {
                      setSelectedGuestsForGenerate(prev => [...prev, guest.id]);
                    }
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    selectedGuestsForGenerate.includes(guest.id) && styles.checkboxSelected
                  ]}>
                    {selectedGuestsForGenerate.includes(guest.id) && (
                      <MaterialCommunityIcons name="check" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.guestSelectText}>{guest.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowGenerateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.generateModalButton,
                  selectedGuestsForGenerate.length === 0 && styles.generateModalButtonDisabled
                ]}
                onPress={() => {
                  const selected = guests.filter(g => selectedGuestsForGenerate.includes(g.id));
                  handleGenerateLogins(selected);
                }}
                disabled={selectedGuestsForGenerate.length === 0}
              >
                <Text style={styles.generateModalButtonText}>
                  Generate Logins ({selectedGuestsForGenerate.length})
                </Text>
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
          <View style={styles.successModalContent}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check" size={40} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successDescription}>
              {guestLogins.length} login credentials have been generated successfully. 
              You can now manage and send them to your guests.
            </Text>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Modal */}
      <Modal
        visible={!!customModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customModalContent}>
            <Text style={styles.customModalTitle}>{customModal?.title}</Text>
            <Text style={styles.customModalMessage}>{customModal?.message}</Text>
            <TouchableOpacity 
              style={styles.okButton}
              onPress={() => setCustomModal(null)}
            >
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Generating Logins Modal */}
      <Modal
        visible={isGeneratingLogins}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingModalTitle}>Generating Logins...</Text>
            <Text style={styles.loadingModalDescription}>
              Creating temporary credentials for {guests.length} guests
            </Text>
          </View>
        </View>
      </Modal>

      {/* Sidebar Modal */}
      <Modal
        visible={showSidebar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              <TouchableOpacity 
                style={styles.closeSidebarButton}
                onPress={() => setShowSidebar(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sidebarContent}>
              <TouchableOpacity 
                style={styles.sidebarItem}
                onPress={() => {
                  setShowSidebar(false);
                  // Navigate to event settings
                }}
              >
                <Ionicons name="settings" size={20} color="#fff" />
                <Text style={styles.sidebarItemText}>Event Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.sidebarItem}
                onPress={() => {
                  setShowSidebar(false);
                  // Navigate to guest management
                }}
              >
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={styles.sidebarItemText}>Guest Management</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.sidebarItem}
                onPress={() => {
                  setShowSidebar(false);
                  // Navigate to itinerary management
                }}
              >
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.sidebarItemText}>Itinerary Management</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.sidebarItem}
                onPress={() => {
                  setShowSidebar(false);
                  // Navigate to module management
                }}
              >
                <Ionicons name="puzzle" size={20} color="#fff" />
                <Text style={styles.sidebarItemText}>Module Management</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.sidebarItem}
                onPress={() => {
                  setShowSidebar(false);
                  // Navigate to analytics
                }}
              >
                <Ionicons name="analytics" size={20} color="#fff" />
                <Text style={styles.sidebarItemText}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  section: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 20,
    padding: 24,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  collapseButton: {
    padding: 8,
  },
  expandedContent: {
    marginTop: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 16,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-end',
    minWidth: 120,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  generateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loginsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  loginsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loginsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  sendAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sendAllButtonFull: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  loginActionsBottom: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  regenerateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sendAllButtonInline: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
  },
  sendAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loginsDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
  },
  loginCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  loginEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  loginPassword: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 8,
  },
  passwordText: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loginStatus: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 12,
  },
  statusText: {
    color: '#f59e0b',
  },
  loginActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  guestCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  guestInfo: {
    flex: 1,
  },
  guestHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapseIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 2,
  },
  guestCardsContainer: {
    marginTop: 16,
  },
  guestName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff',
  },
  guestEmail: {
    fontSize: 13,
    color: '#ccc',
  },
  stage1Badge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stage1BadgeTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  stage1BadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  assignmentsContainer: {
    marginBottom: 16,
  },
  assignmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 12,
  },
  itineraryItem: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  itineraryTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: '#fff',
  },
  itineraryTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  itineraryLocation: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  addOnsContainer: {
    marginTop: 8,
  },
  addOnsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#db2777',
    marginBottom: 12,
  },
  addOnsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addOnTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(219, 39, 119, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(219, 39, 119, 0.2)',
  },
  addOnTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#db2777',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  modalList: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
  },
  selectAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  selectAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  guestsList: {
    maxHeight: 200,
    marginBottom: 24,
  },
  guestSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  guestSelectText: {
    fontSize: 14,
    color: '#000',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  generateModalButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  generateModalButtonDisabled: {
    opacity: 0.6,
  },
  generateModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  successModalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#22c55e',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 16,
  },
  successDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  customModalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  customModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 18,
    textAlign: 'center',
  },
  customModalMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  okButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  okButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  loadingModalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadingModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 16,
  },
  loadingModalDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sidebar: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeSidebarButton: {
    padding: 8,
  },
  sidebarContent: {
    paddingTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 16,
  },
}); 