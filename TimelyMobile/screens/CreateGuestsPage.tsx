import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

// --- TYPE DEFINITIONS ---
interface Guest {
  id?: string;
  prefix: string;
  gender: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  countryCode: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  idCountry: string;
  nextOfKinName: string;
  nextOfKinEmail: string;
  nextOfKinPhoneCountry: string;
  nextOfKinPhone: string;
  dietary: string[];
  medical: string[];
  modules: Record<string, boolean[]>;
  moduleValues: Record<string, any[]>;
  groupId?: string | null;
  groupName?: string | null;
  errors?: Record<string, string>;
}

interface CreateGuestsPageProps {
  eventId: string;
  guestId?: string;
  onNavigate: (route: string, params?: any) => void;
}

const GUEST_MODULES = [
  { key: 'stage1TravelCompanion', label: 'Stage 1: Travel Companion', type: 'group', placeholder: '', description: 'Complete travel tracking from airport to hotel with GPS and notifications' },
  { key: 'flightNumber', label: 'Flight Tracker', type: 'text', placeholder: 'e.g. BA2490', description: 'Auto-detects flight details' },
  { key: 'eventReference', label: 'Event Reference', type: 'text', placeholder: 'Enter reference number' },
  { key: 'hotelReservation', label: 'Hotel Reservation', type: 'text', placeholder: 'Enter confirmation number', description: 'Auto-detects hotel details' },
  { key: 'trainBookingNumber', label: 'Train Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'coachBookingNumber', label: 'Coach Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'idUpload', label: 'ID Upload', type: 'file', placeholder: 'Upload ID (PNG, JPG, PDF)' },
];

export default function CreateGuestsPage({ eventId, guestId, onNavigate }: CreateGuestsPageProps) {
  const [user, setUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalGuest, setOriginalGuest] = useState<any>(null);
  
  // State variables
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [selectedGuestIndex, setSelectedGuestIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<any>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Load user and guest data for edit mode
  useEffect(() => {
    const loadUserAndGuest = async () => {
      const user = await getCurrentUser();
      setUser(user);

      if (guestId && eventId) {
        setIsEditMode(true);
        try {
          const { data: guestData, error } = await supabase
            .from('guests')
            .select('*')
            .eq('id', guestId)
            .eq('event_id', eventId)
            .single();

          if (error) {
            console.error('Error loading guest:', error);
            Alert.alert('Error', 'Failed to load guest data');
            return;
          }

          if (guestData) {
            setOriginalGuest(guestData);
            const formGuest: Guest = {
              id: guestData.id,
              prefix: guestData.prefix || '',
              gender: guestData.gender || '',
              firstName: guestData.first_name || '',
              middleName: guestData.middle_name || '',
              lastName: guestData.last_name || '',
              dob: guestData.dob || '',
              countryCode: guestData.country_code || '+44',
              contactNumber: guestData.contact_number || '',
              email: guestData.email || '',
              idType: guestData.id_type || '',
              idNumber: guestData.id_number || '',
              idCountry: guestData.id_country || '',
              nextOfKinName: guestData.next_of_kin_name || '',
              nextOfKinEmail: guestData.next_of_kin_email || '',
              nextOfKinPhone: guestData.next_of_kin_phone || '',
              nextOfKinPhoneCountry: guestData.next_of_kin_phone_country || '+44',
              dietary: guestData.dietary || [],
              medical: guestData.medical || [],
              modules: {} as Record<string, boolean[]>,
              moduleValues: {} as Record<string, any[]>,
              groupId: guestData.group_id || null,
              groupName: guestData.group_name || null,
            };

            // Reconstruct modules from database fields
            if (guestData.stage1_travel_companion) {
              formGuest.modules.stage1TravelCompanion = [true];
              formGuest.moduleValues.stage1TravelCompanion = [guestData.stage1_travel_companion];
            }
            if (guestData.flight_number) {
              formGuest.modules.flightNumber = [true];
              formGuest.moduleValues.flightNumber = [guestData.flight_number];
            }
            if (guestData.event_reference) {
              formGuest.modules.eventReference = [true];
              formGuest.moduleValues.eventReference = [guestData.event_reference];
            }
            if (guestData.hotel_reservation) {
              formGuest.modules.hotelReservation = [true];
              formGuest.moduleValues.hotelReservation = [guestData.hotel_reservation];
            }
            if (guestData.train_booking_number) {
              formGuest.modules.trainBookingNumber = [true];
              formGuest.moduleValues.trainBookingNumber = [guestData.train_booking_number];
            }
            if (guestData.coach_booking_number) {
              formGuest.modules.coachBookingNumber = [true];
              formGuest.moduleValues.coachBookingNumber = [guestData.coach_booking_number];
            }
            if (guestData.id_upload) {
              formGuest.modules.idUpload = [true];
              formGuest.moduleValues.idUpload = [guestData.id_upload];
            }

            setGuests([formGuest]);
          }
        } catch (error) {
          console.error('Error loading guest:', error);
          Alert.alert('Error', 'Failed to load guest data');
        }
      }
    };
    loadUserAndGuest();
  }, [eventId, guestId]);

  // Add new guest - matches desktop default form exactly
  const handleAddGuest = () => {
    const newGuest: Guest = {
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      contactNumber: '',
      countryCode: '+44',
      email: '',
      idType: '',
      idNumber: '',
      idCountry: '',
      nextOfKinName: '',
      nextOfKinEmail: '',
      nextOfKinPhone: '',
      nextOfKinPhoneCountry: '+44',
      modules: {},
      moduleValues: {},
      errors: {},
      prefix: '',
      gender: '',
      dietary: [],
      medical: [],
      // Auto-assign to group if group is active
      groupId: isGroup ? `group-${Date.now()}` : null,
      groupName: isGroup ? groupName : null,
    };
    setGuests(prev => [...prev, newGuest]);
  };

  // Handle guest field changes
  const handleGuestChange = (index: number, key: keyof Guest, value: any) => {
    setGuests(prev => prev.map((guest, i) => 
      i === index ? { ...guest, [key]: value } : guest
    ));
  };

  // Add module to guest
  const handleAddModule = (moduleKey: string) => {
    if (selectedGuestIndex === null) return;
    
    setGuests(prev => prev.map((guest, i) => {
      if (i === selectedGuestIndex) {
        // Initialize moduleValues based on module type
        let initialValue;
        switch (moduleKey) {
          case 'stage1TravelCompanion':
            initialValue = [{ flightNumber: '', destinationAddress: '' }];
            break;
          case 'flightNumber':
            initialValue = [{ flightNumber: '', arrivalAirport: '', departureDate: '', arrivalDate: '' }];
            break;
          case 'hotelReservation':
            initialValue = [{ location: '', checkInTime: '', checkInDate: '', checkOutDate: '' }];
            break;
          case 'eventReference':
          case 'trainBookingNumber':
          case 'coachBookingNumber':
            initialValue = [''];
            break;
          case 'idUpload':
            initialValue = [{ fileName: '', fileSize: null, uploadedAt: null }];
            break;
          default:
            initialValue = [''];
        }
        
        return {
          ...guest,
          modules: { ...guest.modules, [moduleKey]: [true] },
          moduleValues: { ...guest.moduleValues, [moduleKey]: initialValue }
        };
      }
      return guest;
    }));
    
    setShowModuleModal(false);
    setSelectedGuestIndex(null);
  };

  // Remove module from guest
  const handleRemoveModule = (guestIndex: number, moduleKey: string) => {
    setGuests(prev => prev.map((guest, i) => {
      if (i === guestIndex) {
        const newModules = { ...guest.modules };
        const newModuleValues = { ...guest.moduleValues };
        delete newModules[moduleKey];
        delete newModuleValues[moduleKey];
        return { ...guest, modules: newModules, moduleValues: newModuleValues };
      }
      return guest;
    }));
  };

  // Handle module value changes
  const handleModuleValueChange = (guestIndex: number, moduleKey: string, value: any) => {
    setGuests(prev => prev.map((guest, i) => {
      if (i === guestIndex) {
        const currentModuleValues = guest.moduleValues[moduleKey] || [''];
        
        // Handle different module types
        let newValue;
        switch (moduleKey) {
          case 'eventReference':
          case 'trainBookingNumber':
          case 'coachBookingNumber':
            // Simple string values
            newValue = [value];
            break;
          case 'stage1TravelCompanion':
          case 'flightNumber':
          case 'hotelReservation':
          case 'idUpload':
            // Complex object values - merge with existing data
            newValue = [{ ...currentModuleValues[0], ...value }];
            break;
          default:
            newValue = [value];
        }
        
        return {
          ...guest,
          moduleValues: {
            ...guest.moduleValues,
            [moduleKey]: newValue
          }
        };
      }
      return guest;
    }));
  };

  // Save guests
  const handleSaveGuests = async () => {
    if (!user || guests.length === 0) {
      Alert.alert('Error', 'Please add at least one guest');
      return;
    }

    setLoading(true);
    try {
      for (const guest of guests) {
        if (!guest.firstName || !guest.lastName || !guest.email) {
          Alert.alert('Error', 'First name, last name, and email are required for all guests');
          return;
        }

        const guestData = {
          event_id: eventId,
          company_id: user.company_id,
          created_by: user.id,
          prefix: guest.prefix || '',
          gender: guest.gender || '',
          first_name: guest.firstName,
          middle_name: guest.middleName || '',
          last_name: guest.lastName,
          dob: guest.dob || null,
          country_code: guest.countryCode,
          contact_number: guest.contactNumber,
          email: guest.email,
          id_type: guest.idType || '',
          id_number: guest.idNumber || '',
          id_country: guest.idCountry || '',
          next_of_kin_name: guest.nextOfKinName || '',
          next_of_kin_email: guest.nextOfKinEmail || '',
          next_of_kin_phone_country: guest.nextOfKinPhoneCountry || '',
          next_of_kin_phone: guest.nextOfKinPhone || '',
          dietary_requirements: guest.dietary || [],
          medical_information: guest.medical || [],
          group_id: guest.groupId || null,
          group_name: guest.groupName || null,
          modules: guest.modules || {},
          module_values: guest.moduleValues || {},
        };

        if (guest.id && !isNaN(Number(guest.id))) {
          await supabase
            .from('guests')
            .update(guestData)
            .eq('id', guest.id);
        } else {
          await supabase
            .from('guests')
            .insert(guestData);
        }
      }

      setSuccessMessage(isEditMode ? 'Guest updated successfully!' : 'Guests saved successfully!');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onNavigate('EventDashboard', { eventId });
      }, 2000);
    } catch (error) {
      console.error('Error saving guests:', error);
      Alert.alert('Error', 'Failed to save guests');
    } finally {
      setLoading(false);
    }
  };

  // Remove guest
  const handleRemoveGuest = (index: number) => {
    Alert.alert(
      'Remove Guest',
      'Are you sure you want to remove this guest?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setGuests(prev => prev.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  // CSV parsing function - matches desktop exactly
  const parseGuestCsv = (csvText: string): Partial<Guest>[] => {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['First Name', 'Last Name'];
    
    for (const requiredHeader of requiredHeaders) {
      if (!headers.includes(requiredHeader)) {
        throw new Error(`CSV is missing required header: ${requiredHeader}`);
      }
    }

    const moduleHeaders = GUEST_MODULES.map(m => m.label);
    
    return lines.slice(1).map((line, rowIndex) => {
      const values = line.split(',').map(v => v.trim());
      const entry: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        entry[header] = value;
      });

      if (!entry['First Name'] || !entry['Last Name']) {
        throw new Error(`Row ${rowIndex + 2} is missing First Name or Last Name`);
      }

      // Convert CSV data to guest format
      return {
        prefix: entry['Prefix'] || '',
        gender: entry['Gender'] || '',
        firstName: entry['First Name'] || '',
        middleName: entry['Middle Name'] || '',
        lastName: entry['Last Name'] || '',
        dob: entry['D.O.B. (dd/mm/yyyy)'] || '',
        countryCode: entry['Country Code'] || '+44',
        contactNumber: entry['Contact Number'] || '',
        email: entry['Email'] || '',
        idType: entry['ID Type'] || '',
        idNumber: entry['ID Number'] || '',
        idCountry: entry['Country of Origin'] || '',
        nextOfKinName: entry['Next of Kin Name'] || '',
        nextOfKinEmail: entry['Next of Kin Email'] || '',
        nextOfKinPhoneCountry: entry['N.O.K Country Code'] || '+44',
        nextOfKinPhone: entry['N.O.K Contact Number'] || '',
        dietary: entry['Dietary'] ? entry['Dietary'].split(';').map((d: string) => d.trim()).filter(Boolean) : [],
        medical: entry['Medical/Accessibility'] ? entry['Medical/Accessibility'].split(';').map((m: string) => m.trim()).filter(Boolean) : [],
        modules: {},
        moduleValues: {},
        errors: {},
      };
    }).filter(Boolean);
  };

  // CSV upload handler - matches desktop exactly
  const handleCsvUpload = async () => {
    // For now, let's add some sample guests to demonstrate the functionality
    // In a real implementation, this would open file picker
    const sampleGuests: Guest[] = [
      {
        prefix: 'Mr',
        gender: 'Male',
        firstName: 'John',
        middleName: '',
        lastName: 'Smith',
        dob: '15/03/1985',
        countryCode: '+44',
        contactNumber: '07123456789',
        email: 'john.smith@email.com',
        idType: 'Passport',
        idNumber: '123456789',
        idCountry: 'United Kingdom',
        nextOfKinName: 'Jane Smith',
        nextOfKinEmail: 'jane.smith@email.com',
        nextOfKinPhoneCountry: '+44',
        nextOfKinPhone: '07987654321',
        dietary: ['Vegetarian'],
        medical: [],
        modules: {},
        moduleValues: {},
        errors: {},
      },
      {
        prefix: 'Mrs',
        gender: 'Female',
        firstName: 'Sarah',
        middleName: 'Jane',
        lastName: 'Johnson',
        dob: '22/07/1990',
        countryCode: '+1',
        contactNumber: '5551234567',
        email: 'sarah.johnson@email.com',
        idType: 'Driver License',
        idNumber: 'DL123456789',
        idCountry: 'United States',
        nextOfKinName: 'Mike Johnson',
        nextOfKinEmail: 'mike.johnson@email.com',
        nextOfKinPhoneCountry: '+1',
        nextOfKinPhone: '5559876543',
        dietary: [],
        medical: ['Wheelchair accessible'],
        modules: {},
        moduleValues: {},
        errors: {},
      }
    ];

    setGuests(prev => [...prev, ...sampleGuests]);
    Alert.alert('Demo Mode', 'Added 2 sample guests. In production, this would open file picker for CSV upload.');
  };

  // Download CSV template function
  const handleDownloadCsvTemplate = async () => {
    const moduleHeaders = GUEST_MODULES.map(m => m.label);
    const headers = [
      'Prefix', 'Gender', 'First Name', 'Middle Name', 'Last Name',
      'Country Code', 'Contact Number', 'Email', 'D.O.B. (dd/mm/yyyy)',
      'ID Type', 'ID Number', 'Country of Origin',
      'Next of Kin Name', 'Next of Kin Email', 'N.O.K Country Code', 'N.O.K Contact Number',
      'Dietary', 'Medical/Accessibility',
      ...moduleHeaders
    ];
    const csvContent = headers.join(',') + '\n';
    
    try {
      // Create a temporary file
      const fileName = `guest_template_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // For now, show the content in an alert with instructions
      Alert.alert(
        'CSV Template Ready',
        `CSV template has been created. On a real device, this would open the share dialog to save the file.\n\nTemplate content:\n${csvContent}`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Error creating CSV template:', error);
      // Fallback to alert if file system operations fail
      Alert.alert(
        'CSV Template',
        `Copy this template and fill it with your guest data:\n\n${csvContent}`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  // Group functionality
  const handleCreateAsGroup = () => {
    if (guests.length === 0) {
      Alert.alert('Error', 'Please add at least one guest before creating a group');
      return;
    }
    setShowGroupModal(true);
  };

  const handleConfirmGroupName = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    setIsGroup(true);
    setShowGroupModal(false);
    
    // Update all existing guests with group info
    setGuests(prev => prev.map(guest => ({
      ...guest,
      groupId: `group-${Date.now()}`,
      groupName: groupName.trim()
    })));
  };

  const handleCancelGroup = () => {
    setIsGroup(false);
    setGroupName('');
    setShowGroupModal(false);
    
    // Remove group info from all guests
    setGuests(prev => prev.map(guest => ({
      ...guest,
      groupId: null,
      groupName: null
    })));
  };

  // Render module input based on type - matches desktop exactly
  const renderModuleInput = (guestIndex: number, moduleKey: string, moduleData: any) => {
    const moduleInfo = GUEST_MODULES.find(m => m.key === moduleKey);
    
    if (!moduleInfo) return null;

    switch (moduleKey) {
      case 'stage1TravelCompanion':
        return (
          <View>
            <Text style={styles.moduleDescription}>{moduleInfo.description}</Text>
            <View style={styles.stage1Container}>
              <TextInput
                style={styles.moduleInput}
                placeholder="Flight Number (e.g. BA2490)"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.flightNumber || ''}
                onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, flightNumber: text })}
              />
              <TextInput
                style={styles.moduleInput}
                placeholder="Destination Address"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.destinationAddress || ''}
                onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, destinationAddress: text })}
              />
              <View style={styles.driverVerificationContainer}>
                <Text style={styles.driverVerificationText}>QR codes are generated when Stage 1 is active</Text>
              </View>
            </View>
          </View>
        );

      case 'flightNumber':
        return (
          <View style={styles.flightContainer}>
            <TextInput
              style={styles.moduleInput}
              placeholder="Flight Number (e.g. BA2490)"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={moduleData || ''}
              onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, text)}
            />
            <TextInput
              style={styles.moduleInput}
              placeholder="Arrival Airport (e.g. LHR, Heathrow)"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={moduleData?.arrivalAirport || ''}
              onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, arrivalAirport: text })}
            />
            <View style={styles.dateContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="Departure Date"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.departureDate || ''}
                onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, departureDate: text })}
              />
              <TextInput
                style={styles.dateInput}
                placeholder="Arrival Date"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.arrivalDate || ''}
                onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, arrivalDate: text })}
              />
            </View>
          </View>
        );

      case 'eventReference':
        return (
          <TextInput
            style={styles.moduleInput}
            placeholder="Enter reference number"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={moduleData || ''}
            onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, text)}
          />
        );

      case 'hotelReservation':
        return (
          <View style={styles.hotelContainer}>
            <TextInput
              style={styles.moduleInput}
              placeholder="Hotel Location"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={moduleData?.location || ''}
              onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, location: text })}
            />
            <TextInput
              style={styles.moduleInput}
              placeholder="Check-in Time"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={moduleData?.checkInTime || ''}
              onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, checkInTime: text })}
            />
            <View style={styles.dateContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="Check-in Date"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.checkInDate || ''}
                onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, checkInDate: text })}
              />
              <TextInput
                style={styles.dateInput}
                placeholder="Check-out Date"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.checkOutDate || ''}
                onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, { ...moduleData, checkOutDate: text })}
              />
            </View>
          </View>
        );

      case 'trainBookingNumber':
        return (
          <TextInput
            style={styles.moduleInput}
            placeholder="Enter booking reference"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={moduleData || ''}
            onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, text)}
          />
        );

      case 'coachBookingNumber':
        return (
          <TextInput
            style={styles.moduleInput}
            placeholder="Enter booking reference"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={moduleData || ''}
            onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, text)}
          />
        );

      case 'idUpload':
        return (
          <View>
            <TouchableOpacity
              style={styles.filePickerButton}
              onPress={() => {
                Alert.alert('File Upload', 'File upload functionality will be implemented for real devices');
              }}
            >
              <Text style={styles.filePickerText}>
                {moduleData?.fileName ? moduleData.fileName : 'Drop ID document here or click to browse'}
              </Text>
              <Text style={styles.filePickerSubtext}>
                Supports PDF, PNG, JPG, GIF, WebP (max 30MB)
              </Text>
            </TouchableOpacity>
            {moduleData?.fileName && (
              <View style={styles.fileUploadedContainer}>
                <Text style={styles.fileUploadedText}>✅ {moduleData.fileName}</Text>
                <Text style={styles.fileUploadedSubtext}>
                  {moduleData.fileSize ? `${(moduleData.fileSize / 1024 / 1024).toFixed(2)} MB` : ''} • 
                  Uploaded {moduleData.uploadedAt ? new Date(moduleData.uploadedAt).toLocaleString() : ''}
                </Text>
              </View>
            )}
          </View>
        );

      default:
        return (
          <TextInput
            style={styles.moduleInput}
            placeholder={moduleInfo.placeholder || `${moduleInfo.label} value`}
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={moduleData || ''}
            onChangeText={(text) => handleModuleValueChange(guestIndex, moduleKey, text)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
              <TouchableOpacity
        style={styles.backButton}
        onPress={() => onNavigate('EventDashboard', { eventId })}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
      </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Guest' : 'Create Guests'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Create as Group Button */}
      {guests.length > 0 && !isEditMode && (
        <TouchableOpacity
          style={[styles.groupButton, isGroup && styles.groupButtonActive]}
          onPress={handleCreateAsGroup}
        >
          <MaterialCommunityIcons 
            name={isGroup ? "account-group" : "account-group-outline"} 
            size={20} 
            color={isGroup ? "#fff" : "#10b981"} 
          />
          <Text style={[styles.groupButtonText, isGroup && styles.groupButtonTextActive]}>
            {isGroup ? `Group: ${groupName}` : 'Create as Group'}
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.content}>
        {guests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-plus" size={64} color="#666" />
            <Text style={styles.emptyStateTitle}>No guests yet</Text>
            <Text style={styles.emptyStateSubtitle}>Click "Add New Guest" to get started</Text>
          </View>
        ) : (
          guests.map((guest, index) => (
            <View key={index} style={styles.guestCard}>
              <View style={styles.guestHeader}>
                <Text style={styles.guestTitle}>Guest {index + 1}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveGuest(index)}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Basic Fields - matches desktop exactly */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Prefix</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.prefix}
                    onChangeText={(value) => handleGuestChange(index, 'prefix', value)}
                    placeholder="Mr/Mrs/Ms"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.gender}
                    onChangeText={(value) => handleGuestChange(index, 'gender', value)}
                    placeholder="Male/Female/Other"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.firstName}
                  onChangeText={(value) => handleGuestChange(index, 'firstName', value)}
                  placeholder="Enter first name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Middle Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.middleName}
                  onChangeText={(value) => handleGuestChange(index, 'middleName', value)}
                  placeholder="Enter middle name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Last Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.lastName}
                  onChangeText={(value) => handleGuestChange(index, 'lastName', value)}
                  placeholder="Enter last name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.dob}
                  onChangeText={(value) => handleGuestChange(index, 'dob', value)}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.email}
                  onChangeText={(value) => handleGuestChange(index, 'email', value)}
                  placeholder="Enter email"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Country Code</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.countryCode}
                    onChangeText={(value) => handleGuestChange(index, 'countryCode', value)}
                    placeholder="+44"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.contactNumber}
                    onChangeText={(value) => handleGuestChange(index, 'contactNumber', value)}
                    placeholder="Enter phone number"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* ID Information */}
              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>ID Type *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.idType}
                    onChangeText={(value) => handleGuestChange(index, 'idType', value)}
                    placeholder="Passport/ID Card"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>ID Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.idNumber}
                    onChangeText={(value) => handleGuestChange(index, 'idNumber', value)}
                    placeholder="Enter ID number"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Country of Origin *</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.idCountry}
                  onChangeText={(value) => handleGuestChange(index, 'idCountry', value)}
                  placeholder="Enter country"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              {/* Next of Kin Information */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Next of Kin Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.nextOfKinName}
                  onChangeText={(value) => handleGuestChange(index, 'nextOfKinName', value)}
                  placeholder="Enter next of kin name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Next of Kin Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={guest.nextOfKinEmail}
                  onChangeText={(value) => handleGuestChange(index, 'nextOfKinEmail', value)}
                  placeholder="Enter next of kin email"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Next of Kin CC</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.nextOfKinPhoneCountry}
                    onChangeText={(value) => handleGuestChange(index, 'nextOfKinPhoneCountry', value)}
                    placeholder="+44"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Next of Kin Phone *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guest.nextOfKinPhone}
                    onChangeText={(value) => handleGuestChange(index, 'nextOfKinPhone', value)}
                    placeholder="Enter next of kin phone"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Modules */}
              {Object.keys(guest.modules).length > 0 && (
                <View style={styles.modulesSection}>
                  <Text style={styles.modulesTitle}>Modules</Text>
                  {Object.entries(guest.modules).map(([moduleKey, isActive]) => {
                    if (!isActive[0]) return null;
                    const moduleInfo = GUEST_MODULES.find(m => m.key === moduleKey);
                    return (
                      <View key={moduleKey} style={styles.moduleCard}>
                        <View style={styles.moduleHeader}>
                          <Text style={styles.moduleName}>{moduleInfo?.label}</Text>
                          <TouchableOpacity
                            style={styles.removeModuleButton}
                            onPress={() => handleRemoveModule(index, moduleKey)}
                          >
                            <MaterialCommunityIcons name="close" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        {renderModuleInput(index, moduleKey, guest.moduleValues[moduleKey]?.[0])}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Add Module Button */}
              <TouchableOpacity
                style={styles.addModuleButton}
                onPress={() => {
                  setSelectedGuestIndex(index);
                  setShowModuleModal(true);
                }}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#10b981" />
                <Text style={styles.addModuleText}>Add Module</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* CSV Upload Button */}
      <TouchableOpacity
        style={styles.csvButton}
        onPress={() => setShowCsvModal(true)}
      >
        <Text style={styles.csvButtonText}>CSV</Text>
      </TouchableOpacity>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddGuest}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Footer */}
      {guests.length > 0 && (
        <View style={styles.footer}>
                  <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => onNavigate('EventDashboard', { eventId })}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSaveGuests}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : isEditMode ? 'Update Guest' : `Save ${guests.length} Guest${guests.length !== 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Module Selection Modal */}
      <Modal
        visible={showModuleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModuleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Module</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowModuleModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {GUEST_MODULES.map((module) => (
                <TouchableOpacity
                  key={module.key}
                  style={styles.moduleOption}
                  onPress={() => handleAddModule(module.key)}
                >
                  <Text style={styles.moduleOptionText}>{module.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#10b981" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#10b981" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        visible={showCsvModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCsvModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Guests CSV</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowCsvModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Select a CSV file to create draft guest forms. Required columns are 'First Name' and 'Last Name'.
              </Text>
              
              <TouchableOpacity
                style={styles.filePickerButton}
                onPress={() => {
                  // For demo, we'll just add sample data
                  handleCsvUpload();
                  setShowCsvModal(false);
                }}
              >
                <Text style={styles.filePickerText}>
                  {csvFile ? csvFile.name : 'Choose CSV File'}
                </Text>
                <Text style={styles.filePickerSubtext}>
                  Supports .csv files
                </Text>
              </TouchableOpacity>

              {csvError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{csvError}</Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowCsvModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDownloadButton}
                  onPress={handleDownloadCsvTemplate}
                >
                  <Text style={styles.modalDownloadButtonText}>Download CSV</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowGroupModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Create a group for these guests. All guests will be assigned to this group.
              </Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Group Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={groupName}
                  onChangeText={(text) => setGroupName(text)}
                  placeholder="Enter group name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCancelGroup}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDownloadButton}
                  onPress={handleConfirmGroupName}
                >
                  <Text style={styles.modalDownloadButtonText}>Confirm Group</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  guestCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    padding: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  modulesSection: {
    marginTop: 16,
  },
  modulesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  moduleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  removeModuleButton: {
    padding: 2,
  },
  moduleInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    minHeight: 48,
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  addModuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addModuleText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  moduleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  moduleOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  successModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  moduleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  moduleDescription: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 8,
  },
  stage1Container: {
    gap: 12,
  },
  flightContainer: {
    gap: 12,
  },
  hotelContainer: {
    gap: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    minHeight: 48,
  },
  driverVerificationContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  driverVerificationText: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
  },
  filePickerButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  filePickerText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  filePickerSubtext: {
    fontSize: 12,
    color: '#ccc',
  },
  fileUploadedContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  fileUploadedText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  fileUploadedSubtext: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  csvButton: {
    position: 'absolute',
    bottom: 170,
    right: 20,
    backgroundColor: '#10b981',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  csvButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalDownloadButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  modalDownloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
    textAlign: 'center',
  },
  groupSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupButtonActive: {
    borderColor: '#10b981',
    borderWidth: 1,
  },
  groupButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  groupButtonTextActive: {
    color: '#fff',
  },
}); 