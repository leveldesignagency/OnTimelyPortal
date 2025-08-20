import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import GlobalHeader from '../components/GlobalHeader';

const { width, height } = Dimensions.get('window');

interface CreateEventAppPageProps {
  onNavigate: (route: string) => void;
  onGoBack: () => void;
  onMenuPress?: () => void;
}

export default function CreateEventAppPage({ onNavigate, onGoBack, onMenuPress }: CreateEventAppPageProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showTimeZonePicker, setShowTimeZonePicker] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  
  // Custom modal states
  const [showEmptyFieldModal, setShowEmptyFieldModal] = useState(false);
  const [emptyFieldMessage, setEmptyFieldMessage] = useState('');
  const [showDateErrorModal, setShowDateErrorModal] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    from: '',
    to: '',
    startTime: '',
    endTime: '',
    timeZone: 'UTC',
  });
  
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState('');

  // Timezone options
  const timeZoneOptions = [
    { value: 'UTC', label: 'UTC (UTC+0)' },
    { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
    { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
    { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
    { value: 'Europe/London', label: 'London (UTC+0)' },
    { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
    { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
  ];

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getTimeZoneLabel = (tz: string) => {
    const option = timeZoneOptions.find(opt => opt.value === tz);
    return option ? option.label : tz;
  };

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (userData?.company_id) {
          const { data: teamsData } = await supabase
            .from('teams')
            .select('*')
            .eq('company_id', userData.company_id);
          
          if (teamsData) {
            setTeams(teamsData);
          }
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, []);

  const handleCreateEvent = async () => {
    if (!formData.name.trim()) {
      setEmptyFieldMessage('Event name is required');
      setShowEmptyFieldModal(true);
      return;
    }

    if (!formData.from || !formData.to) {
      setEmptyFieldMessage('Start and end dates are required');
      setShowEmptyFieldModal(true);
      return;
    }

    if (formData.from >= formData.to) {
      setDateErrorMessage('End date must be after start date');
      setShowDateErrorModal(true);
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEmptyFieldMessage('No authenticated user found');
        setShowEmptyFieldModal(true);
        return;
      }

      // Get user's company_id
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        setEmptyFieldMessage('User company not found');
        setShowEmptyFieldModal(true);
        return;
      }

      // Create event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim(),
          location: formData.location.trim(),
          from: formData.from,
          to: formData.to,
          start_time: formData.startTime,
          end_time: formData.endTime,
          time_zone: formData.timeZone,
          company_id: userData.company_id,
          created_by: user.id,
          status: 'Upcoming'
        })
        .select()
        .single();

      if (eventError) {
        console.error('Error creating event:', eventError);
        setEmptyFieldMessage('Failed to create event');
        setShowEmptyFieldModal(true);
        return;
      }

      // Assign teams to event if selected
      if (selectedTeamIds.length > 0 && eventData) {
        for (const teamId of selectedTeamIds) {
          await supabase
            .from('team_events')
            .insert({
              team_id: teamId,
              event_id: eventData.id,
              assigned_by: user.id
            });
        }
      }

      Alert.alert('Success', 'Event created successfully!', [
        { text: 'OK', onPress: () => onNavigate('dashboard') }
      ]);

    } catch (error) {
      console.error('Error creating event:', error);
      setEmptyFieldMessage('Failed to create event');
      setShowEmptyFieldModal(true);
    } finally {
      setLoading(false);
    }
  };

  const TimePicker = ({ 
    value, 
    onChange, 
    placeholder 
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [currentTime, setCurrentTime] = useState(value || '09:00');
    const [selectedHour, setSelectedHour] = useState('09');
    const [selectedMinute, setSelectedMinute] = useState('00');

    const handleTimeSelect = (hour: string, minute: string) => {
      const timeString = `${hour}:${minute}`;
      setCurrentTime(timeString);
      onChange(timeString);
      setShowPicker(false);
    };

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[styles.datePickerButton, getGlassCardStyle()]}
          onPress={() => setShowPicker(true)}
        >
          <MaterialCommunityIcons name="clock" size={20} color="#fff" />
          <Text style={styles.datePickerText}>
            {value || placeholder}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.calendarNavButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.timePickerContainer}>
                <View style={styles.timePickerRow}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeColumnLabel}>Hour</Text>
                    <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {hours.map(hour => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.timeOption,
                            selectedHour === hour && styles.timeOptionSelected
                          ]}
                          onPress={() => setSelectedHour(hour)}
                        >
                          <Text style={[
                            styles.timeOptionText,
                            selectedHour === hour && styles.timeOptionTextSelected
                          ]}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeColumnLabel}>Minute</Text>
                    <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {minutes.map(minute => (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.timeOption,
                            selectedMinute === minute && styles.timeOptionSelected
                          ]}
                          onPress={() => setSelectedMinute(minute)}
                        >
                          <Text style={[
                            styles.timeOptionText,
                            selectedMinute === minute && styles.timeOptionTextSelected
                          ]}>
                            {minute}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.timeConfirmButton}
                  onPress={() => handleTimeSelect(selectedHour, selectedMinute)}
                >
                  <Text style={styles.timeConfirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const CalendarDatePicker = ({ 
    value, 
    onChange, 
    placeholder 
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handleDateSelect = (day: number) => {
      const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      setSelectedDate(selected);
      const year = selected.getFullYear();
      const month = String(selected.getMonth() + 1).padStart(2, '0');
      const dayStr = String(selected.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dayStr}`;
      onChange(dateString);
      setShowPicker(false);
    };

    const handlePrevMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Generate calendar grid
    const calendarDays = [];
    let dayCounter = 1;
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const cellIndex = week * 7 + day;
        if (cellIndex < firstDayOfMonth || dayCounter > daysInMonth) {
          calendarDays.push(null);
        } else {
          calendarDays.push(dayCounter);
          dayCounter++;
        }
      }
    }

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[styles.datePickerButton, getGlassCardStyle()]}
          onPress={() => setShowPicker(true)}
        >
          <MaterialCommunityIcons name="calendar" size={20} color="#fff" />
          <Text style={styles.datePickerText}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarDaysHeader}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Text key={index} style={styles.calendarDayHeader}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => (
                                     <TouchableOpacity
                     key={index}
                     style={[
                       styles.calendarDay,
                       day && selectedDate && 
                       day === selectedDate.getDate() && 
                       currentDate.getMonth() === selectedDate.getMonth() && 
                       currentDate.getFullYear() === selectedDate.getFullYear() ? 
                       styles.selectedCalendarDay : null
                     ]}
                     onPress={() => day && handleDateSelect(day)}
                     disabled={!day}
                   >
                     {day && (
                       <Text style={[
                         styles.calendarDayText,
                         day && selectedDate && 
                         day === selectedDate.getDate() && 
                         currentDate.getMonth() === selectedDate.getMonth() && 
                         currentDate.getFullYear() === selectedDate.getFullYear() ? 
                         styles.selectedCalendarDayText : null
                       ]}>
                         {day}
                       </Text>
                     )}
                   </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.calendarCancelButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Global Header */}
      <GlobalHeader
        title="Create Event"
        onMenuPress={onMenuPress || (() => {})}
        showBackButton={true}
        onBackPress={onGoBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>

          {/* Event Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Name *</Text>
            <View style={styles.nameInputContainer}>
              <TextInput
                style={[styles.textInput, getGlassCardStyle()]}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="What is your event called?"
                placeholderTextColor="#666"
                maxLength={20}
              />
              <Text style={styles.charCount}>{formData.name.length}/20</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={[styles.textInput, getGlassCardStyle()]}
              value={formData.location}
              onChangeText={(text) => handleInputChange('location', text)}
              placeholder="Event location"
              placeholderTextColor="#666"
            />
          </View>

          {/* Time Zone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time Zone</Text>
            <TouchableOpacity
              style={[styles.timeZoneButton, getGlassCardStyle()]}
              onPress={() => setShowTimeZonePicker(true)}
            >
              <MaterialCommunityIcons name="earth" size={20} color="#fff" />
              <Text style={styles.timeZoneText}>{getTimeZoneLabel(formData.timeZone)}</Text>
            </TouchableOpacity>
          </View>

          {/* Team Assignment */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assign Your Team</Text>
            <Text style={styles.teamDescription}>
              If you are not ready to add your team, you can add them later inside of the Create A New Team page.
            </Text>
            <View style={styles.teamContainer}>
              <TextInput
                style={[styles.textInput, getGlassCardStyle()]}
                value={selectedTeamIds.length > 0 ? teams.find(t => t.id === selectedTeamIds[0])?.name || '' : teamSearch}
                onChangeText={(text) => {
                  if (selectedTeamIds.length > 0) {
                    setSelectedTeamIds([]);
                    setTeamSearch(text);
                  } else {
                    setTeamSearch(text);
                  }
                  setShowTeamDropdown(!!text);
                }}
                onFocus={() => setShowTeamDropdown(true)}
                placeholder="Search for a team..."
                placeholderTextColor="#666"
              />
              
              {showTeamDropdown && (
                <View style={styles.teamDropdown}>
                  {teams.length === 0 ? (
                    <Text style={styles.noTeamsText}>No teams found</Text>
                  ) : (
                    teams.map(team => (
                      <TouchableOpacity
                        key={team.id}
                        style={[
                          styles.teamOption,
                          selectedTeamIds.includes(team.id) && styles.selectedTeamOption
                        ]}
                        onPress={() => {
                          setSelectedTeamIds([team.id]);
                          setShowTeamDropdown(false);
                          setTeamSearch('');
                        }}
                      >
                        <Text style={[
                          styles.teamOptionText,
                          selectedTeamIds.includes(team.id) && styles.selectedTeamOptionText
                        ]}>
                          {team.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Dates */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>DATES/DURATION</Text>
            <View style={styles.dateContainer}>
              <CalendarDatePicker
                value={formData.from}
                onChange={(date) => handleInputChange('from', date)}
                placeholder="Start date"
              />
              <Text style={styles.dateArrow}>▶</Text>
              <CalendarDatePicker
                value={formData.to}
                onChange={(date) => handleInputChange('to', date)}
                placeholder="End date"
              />
            </View>
          </View>

          {/* Times */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>TIMES</Text>
            <View style={styles.dateContainer}>
              <TimePicker
                value={formData.startTime}
                onChange={(time) => handleInputChange('startTime', time)}
                placeholder="Start time"
              />
              <Text style={styles.dateArrow}>▶</Text>
              <TimePicker
                value={formData.endTime}
                onChange={(time) => handleInputChange('endTime', time)}
                placeholder="End time"
              />
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, getGlassCardStyle(), loading && styles.createButtonDisabled]}
            onPress={handleCreateEvent}
            disabled={loading}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Zone Picker Modal */}
      <Modal
        visible={showTimeZonePicker}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timeZoneModal}>
            <Text style={styles.modalTitle}>Select Time Zone</Text>
            <ScrollView style={styles.timeZoneList}>
              {timeZoneOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeZoneOption,
                    formData.timeZone === option.value && styles.selectedTimeZoneOption
                  ]}
                  onPress={() => {
                    handleInputChange('timeZone', option.value);
                    setShowTimeZonePicker(false);
                  }}
                >
                  <Text style={[
                    styles.timeZoneOptionText,
                    formData.timeZone === option.value && styles.selectedTimeZoneOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowTimeZonePicker(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Empty Field Modal */}
      <Modal
        visible={showEmptyFieldModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emptyFieldModal}>
            <MaterialCommunityIcons name="alert-circle" size={40} color="#f00" />
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{emptyFieldMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowEmptyFieldModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Error Modal */}
      <Modal
        visible={showDateErrorModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emptyFieldModal}>
            <MaterialCommunityIcons name="alert-circle" size={40} color="#f00" />
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{dateErrorMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDateErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 20,
  },
  formTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  nameInputContainer: {
    position: 'relative',
  },
  textInput: {
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  charCount: {
    position: 'absolute',
    right: 12,
    top: 18,
    color: '#666',
    fontSize: 13,
  },
  teamDescription: {
    color: '#666',
    fontSize: 11,
    marginBottom: 6,
  },
  teamContainer: {
    position: 'relative',
  },
  teamDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 220,
    zIndex: 1000,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  teamOption: {
    padding: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
  },
  selectedTeamOption: {
    backgroundColor: '#444',
  },
  teamOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedTeamOptionText: {
    fontWeight: '700',
  },
  noTeamsText: {
    color: '#666',
    fontSize: 15,
    padding: 16,
  },
  timeZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeZoneText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  datePickerText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  dateArrow: {
    fontSize: 32,
    color: '#666',
    marginHorizontal: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeZoneModal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeZoneList: {
    maxHeight: 300,
  },
  timeZoneOption: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedTimeZoneOption: {
    backgroundColor: '#444',
  },
  timeZoneOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedTimeZoneOptionText: {
    fontWeight: '600',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#333',
    marginTop: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  calendarModal: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  selectedCalendarDay: {
    backgroundColor: '#10b981',
    borderRadius: 20,
  },
  calendarDayText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedCalendarDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarCancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#333',
  },
  calendarCancelText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyFieldModal: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
    padding: 20,
    alignItems: 'center',
  },
  modalMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 22,
  },
  timePickerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeColumnLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  timeScrollView: {
    maxHeight: 200,
    width: 80,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOptionSelected: {
    backgroundColor: '#10b981',
  },
  timeOptionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  timeSeparator: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginHorizontal: 20,
  },
  timeConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  timeConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 