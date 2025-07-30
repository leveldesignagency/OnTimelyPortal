import React, { useState, useEffect, useContext } from 'react';
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
interface ActivityModule {
  id: string;
  type: string;
  data: any;
}

interface ItineraryItem {
  id?: string;
  title: string;
  arrivalTime: string;
  startTime: string;
  endTime: string;
  location: string;
  details: string;
  modules: Record<string, boolean>;
  moduleValues: Record<string, any>;
  date: string;
  group_id?: string;
  group_name?: string;
}

interface CreateItineraryPageProps {
  eventId: string;
  itineraryId?: string;
  onNavigate: (route: string, params?: any) => void;
}

const ITINERARY_MODULES = [
  { key: 'document', label: 'Document Upload', type: 'file' },
  { key: 'qrcode', label: 'QR Code', type: 'qrcode' },
  { key: 'contact', label: 'Host Contact Details', type: 'contact' },
  { key: 'notifications', label: 'Notifications Timer', type: 'notifications' },
];

export default function CreateItineraryPage({ eventId, itineraryId, onNavigate }: CreateItineraryPageProps) {
  const [user, setUser] = useState<any>(null);
  
  // State variables
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalItinerary, setOriginalItinerary] = useState<any>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<any>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);

  // Load user and existing itinerary data if in edit mode
  useEffect(() => {
    const loadUserAndItinerary = async () => {
      const user = await getCurrentUser();
      setUser(user);

      // Check if we're editing an existing itinerary
      if (itineraryId && eventId) {
        setIsEditMode(true);
        try {
          // Load the specific itinerary from Supabase
          const { data: itineraryData, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('id', itineraryId)
            .eq('event_id', eventId)
            .single();

          if (error) {
            console.error('Error loading itinerary:', error);
            Alert.alert('Error', 'Failed to load itinerary data');
            return;
          }

          if (itineraryData) {
            setOriginalItinerary(itineraryData);
            
            // Convert database fields back to form format
            const formItem: ItineraryItem = {
              id: itineraryData.id,
              title: itineraryData.title,
              arrivalTime: itineraryData.arrival_time || '',
              startTime: itineraryData.start_time || '',
              endTime: itineraryData.end_time || '',
              location: itineraryData.location || '',
              details: itineraryData.description || '',
              modules: {} as Record<string, boolean>,
              moduleValues: {} as Record<string, any>,
              date: itineraryData.date || '',
              group_id: itineraryData.group_id || undefined,
              group_name: itineraryData.group_name || undefined,
            };

            // Reconstruct modules from database fields
            if (itineraryData.document_file_name) {
              formItem.modules.document = true;
              formItem.moduleValues.document = itineraryData.document_file_name;
            }
            if (itineraryData.qrcode_url || itineraryData.qrcode_image) {
              formItem.modules.qrcode = true;
              formItem.moduleValues.qrcode = {
                url: itineraryData.qrcode_url || '',
                image: itineraryData.qrcode_image || ''
              };
            }
            if (itineraryData.contact_name || itineraryData.contact_phone || itineraryData.contact_email) {
              formItem.modules.contact = true;
              formItem.moduleValues.contact = {
                name: itineraryData.contact_name || '',
                countryCode: itineraryData.contact_country_code || '',
                phone: itineraryData.contact_phone || '',
                email: itineraryData.contact_email || ''
              };
            }
            if (itineraryData.notification_times && itineraryData.notification_times.length > 0) {
              formItem.modules.notifications = true;
              formItem.moduleValues.notifications = itineraryData.notification_times;
            }

            setItems([formItem]);
          }
        } catch (error) {
          console.error('Error loading itinerary:', error);
          Alert.alert('Error', 'Failed to load itinerary data');
        }
      }
    };

    loadUserAndItinerary();
  }, [eventId, itineraryId]);

  // Add new item
  const handleAddItem = () => {
    const newItem: ItineraryItem = {
      title: '',
      arrivalTime: '',
      startTime: '',
      endTime: '',
      location: '',
      details: '',
      modules: {},
      moduleValues: {},
      date: '',
    };
    setItems(prev => [...prev, newItem]);
  };

  // Handle item field changes
  const handleItemChange = (index: number, key: keyof ItineraryItem, value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [key]: value } : item
    ));
  };

  // Add module to item
  const handleAddModule = (moduleKey: string) => {
    if (selectedItemIndex === null) return;
    
    setItems(prev => prev.map((item, i) => {
      if (i === selectedItemIndex) {
        return {
          ...item,
          modules: { ...item.modules, [moduleKey]: true },
          moduleValues: { ...item.moduleValues, [moduleKey]: {} }
        };
      }
      return item;
    }));
    
    setShowModuleModal(false);
    setSelectedItemIndex(null);
  };

  // Remove module from item
  const handleRemoveModule = (itemIndex: number, moduleKey: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i === itemIndex) {
        const newModules = { ...item.modules };
        const newModuleValues = { ...item.moduleValues };
        delete newModules[moduleKey];
        delete newModuleValues[moduleKey];
        return { ...item, modules: newModules, moduleValues: newModuleValues };
      }
      return item;
    }));
  };

  // Handle module value changes
  const handleModuleValueChange = (itemIndex: number, moduleKey: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i === itemIndex) {
        return {
          ...item,
          moduleValues: {
            ...item.moduleValues,
            [moduleKey]: value
          }
        };
      }
      return item;
    }));
  };

  // Save itinerary
  const handleSaveItinerary = async () => {
    if (!user || items.length === 0) {
      Alert.alert('Error', 'Please add at least one itinerary item');
      return;
    }

    setLoading(true);
    try {
      for (const item of items) {
        if (!item.title || !item.date) {
          Alert.alert('Error', 'Title and Date are required for all items');
          return;
        }

        const itineraryData = {
          event_id: eventId,
          company_id: user.company_id,
          created_by: user.id,
          title: item.title,
          description: item.details || '',
          date: item.date,
          arrival_time: item.arrivalTime || undefined,
          start_time: item.startTime || undefined,
          end_time: item.endTime || undefined,
          location: item.location || undefined,
          document_file_name: item.moduleValues?.document || undefined,
          qrcode_url: item.moduleValues?.qrcode?.url || undefined,
          qrcode_image: item.moduleValues?.qrcode?.image || undefined,
          contact_name: item.moduleValues?.contact?.name || undefined,
          contact_country_code: item.moduleValues?.contact?.countryCode || undefined,
          contact_phone: item.moduleValues?.contact?.phone || undefined,
          contact_email: item.moduleValues?.contact?.email || undefined,
          notification_times: item.moduleValues?.notifications || [],
          group_id: item.group_id || undefined,
          group_name: item.group_name || undefined,
          content: { originalItem: item },
          modules: item.modules || {},
          module_values: item.moduleValues || {},
          is_draft: false
        };

        if (item.id && !isNaN(Number(item.id))) {
          await supabase
            .from('itineraries')
            .update(itineraryData)
            .eq('id', item.id);
        } else {
          await supabase
            .from('itineraries')
            .insert(itineraryData);
        }
      }

      setSuccessMessage(isEditMode ? 'Itinerary updated successfully!' : 'Itinerary saved successfully!');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onNavigate('EventDashboard', { eventId });
      }, 2000);
    } catch (error) {
      console.error('Error saving itinerary:', error);
      Alert.alert('Error', 'Failed to save itinerary');
    } finally {
      setLoading(false);
    }
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItemToRemove(index);
    setShowRemoveModal(true);
  };

  const confirmRemoveItem = () => {
    if (itemToRemove !== null) {
      setItems(prev => prev.filter((_, i) => i !== itemToRemove));
      setShowRemoveModal(false);
      setItemToRemove(null);
    }
  };

  // CSV upload functionality - matches desktop exactly
  const parseItineraryCsv = (csvText: string): Partial<ItineraryItem>[] => {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Title'];
    const hasDateHeader = headers.includes('Date') || headers.includes('Date (YYYY-MM-DD)');
    
    if (!hasDateHeader) {
      throw new Error('CSV is missing required header: Date or Date (YYYY-MM-DD)');
    }
    
    for (const requiredHeader of requiredHeaders) {
      if (!headers.includes(requiredHeader)) {
        throw new Error(`CSV is missing required header: ${requiredHeader}`);
      }
    }

    const dateHeader = headers.includes('Date (YYYY-MM-DD)') ? 'Date (YYYY-MM-DD)' : 'Date';

    const parsedData = lines.slice(1).map((line, rowIndex) => {
      const values = line.split(',').map(v => v.trim());
      // Skip empty rows
      if (values.every(v => !v)) return null;
      
      const entry: any = {
        modules: {},
        moduleValues: {}
      };
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        // Handle basic form fields
        switch (header) {
          case 'Title': entry.title = value; break;
          case 'Arrival Time': entry.arrivalTime = value; break;
          case 'Start Time': entry.startTime = value; break;
          case 'End Time': entry.endTime = value; break;
          case 'Location': entry.location = value; break;
          case 'Description': entry.details = value; break;
          case 'Date':
          case 'Date (YYYY-MM-DD)':
            entry.date = value; // Keep as string for now
            break;
          case 'Group ID': entry.group_id = value; break;
          case 'Group Name': entry.group_name = value; break;
          
          // Document Upload Module
          case 'Document File Name':
            if (value) {
              entry.modules.document = true;
              entry.moduleValues.document = value;
            }
            break;
          
          // QR Code Module
          case 'QR Code URL':
            if (value) {
              entry.modules.qrcode = true;
              entry.moduleValues.qrcode = entry.moduleValues.qrcode || {};
              entry.moduleValues.qrcode.url = value;
            }
            break;
          case 'QR Code Image':
            if (value) {
              entry.modules.qrcode = true;
              entry.moduleValues.qrcode = entry.moduleValues.qrcode || {};
              entry.moduleValues.qrcode.image = value;
            }
            break;
          
          // Host Contact Details Module
          case 'Contact Name':
            if (value) {
              entry.modules.contact = true;
              entry.moduleValues.contact = entry.moduleValues.contact || {};
              entry.moduleValues.contact.name = value;
            }
            break;
          case 'Contact Country Code':
            if (value) {
              entry.modules.contact = true;
              entry.moduleValues.contact = entry.moduleValues.contact || {};
              entry.moduleValues.contact.countryCode = value;
            }
            break;
          case 'Contact Phone':
            if (value) {
              entry.modules.contact = true;
              entry.moduleValues.contact = entry.moduleValues.contact || {};
              entry.moduleValues.contact.phone = value;
            }
            break;
          case 'Contact Email':
            if (value) {
              entry.modules.contact = true;
              entry.moduleValues.contact = entry.moduleValues.contact || {};
              entry.moduleValues.contact.email = value;
            }
            break;
          
          // Notifications Timer Module
          case 'Notification Times (JSON Array)':
            if (value) {
              try {
                const notificationTimes = JSON.parse(value);
                if (Array.isArray(notificationTimes)) {
                  entry.modules.notifications = true;
                  entry.moduleValues.notifications = notificationTimes;
                }
              } catch (error) {
                console.warn(`Invalid JSON for notification times in row ${rowIndex + 2}:`, value);
              }
            }
            break;
          
          default:
            // Check if this header matches any legacy module format
            const module = ITINERARY_MODULES.find(m => m.label === header);
            if (module && value) {
              // Auto-detect and add module if value is provided
              entry.modules[module.key] = true;
              entry.moduleValues[module.key] = value;
            }
            break;
        }
      });
      
      // Only require title and date
      if (!entry.title || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        throw new Error(`Row ${rowIndex + 2} is missing required fields: Title or a valid Date (YYYY-MM-DD). Found: ${entry.date}`);
      }
      return entry;
    }).filter(Boolean);
    
    return parsedData;
  };

  const handleCsvUpload = async () => {
    try {
      // Try to import expo-document-picker for real devices
      let DocumentPicker;
      try {
        DocumentPicker = require('expo-document-picker');
      } catch (error) {
        console.log('Document picker not available, using demo mode');
      }

      if (DocumentPicker) {
        // Real device - use document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'text/csv',
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          return;
        }

        setCsvFile(result.assets[0]);
        setCsvError(null);
        setIsCsvProcessing(true);

        try {
          const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
          const parsedItems = parseItineraryCsv(fileContent);
          const fullItems: ItineraryItem[] = parsedItems.map(item => ({
            title: item.title || '',
            arrivalTime: item.arrivalTime || '',
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            location: item.location || '',
            details: item.details || '',
            modules: item.modules || {},
            moduleValues: item.moduleValues || {},
            date: item.date || '',
            group_id: item.group_id,
            group_name: item.group_name,
          }));
          setItems(prev => [...prev, ...fullItems]);
          setShowCsvModal(false);
          setCsvFile(null);
        } catch (error) {
          setCsvError(error instanceof Error ? error.message : 'Failed to parse CSV');
        } finally {
          setIsCsvProcessing(false);
        }
      } else {
        // Simulator/fallback - use demo data
        const sampleItems: ItineraryItem[] = [
          {
            title: 'Welcome Reception',
            arrivalTime: '18:00',
            startTime: '18:30',
            endTime: '20:00',
            location: 'Grand Ballroom',
            details: 'Welcome drinks and networking',
            modules: {},
            moduleValues: {},
            date: '2024-08-15',
            group_id: '1',
            group_name: 'Main Events',
          },
          {
            title: 'Conference Session',
            arrivalTime: '09:00',
            startTime: '09:30',
            endTime: '12:00',
            location: 'Conference Hall',
            details: 'Keynote presentations',
            modules: {},
            moduleValues: {},
            date: '2024-08-16',
            group_id: '1',
            group_name: 'Main Events',
          }
        ];

        setItems(prev => [...prev, ...sampleItems]);
        setShowCsvModal(false);
        Alert.alert('Demo Mode', 'Added 2 sample itinerary items. In production, this would open file picker for CSV upload.');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setCsvError('Failed to upload CSV file');
    }
  };

  // Download CSV template function
  const handleDownloadCsvTemplate = async () => {
    const moduleHeaders = ITINERARY_MODULES.map(m => m.label);
    const headers = [
      'Date', 'Title', 'Arrival Time', 'Start Time', 'End Time', 'Location', 'Details',
      ...moduleHeaders
    ];
    const csvContent = headers.join(',') + '\n';
    
    try {
      // Create a temporary file
      const fileName = `itinerary_template_${new Date().toISOString().split('T')[0]}.csv`;
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
        `Copy this template and fill it with your itinerary data:\n\n${csvContent}`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  // Render module input based on type - matches desktop exactly
  const renderModuleInput = (itemIndex: number, moduleKey: string, moduleData: any) => {
    const moduleInfo = ITINERARY_MODULES.find(m => m.key === moduleKey);
    
    if (!moduleInfo) return null;

    switch (moduleKey) {
      case 'document':
        return (
          <View style={styles.moduleContainer}>
            <Text style={styles.moduleLabel}>{moduleInfo.label}</Text>
            <TouchableOpacity
              style={styles.filePickerButton}
              onPress={() => {
                Alert.alert('File Upload', 'File upload functionality will be implemented for real devices');
              }}
            >
              <Text style={styles.filePickerText}>
                {moduleData && typeof moduleData === 'string' ? moduleData.split('/').pop() : 'Choose file'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'qrcode':
        return (
          <View style={styles.moduleContainer}>
            <Text style={styles.moduleLabel}>{moduleInfo.label}</Text>
            <View style={styles.qrCodeContainer}>
              <TouchableOpacity
                style={styles.filePickerButton}
                onPress={() => {
                  Alert.alert('QR Image Upload', 'QR image upload functionality will be implemented for real devices');
                }}
              >
                <Text style={styles.filePickerText}>
                  {moduleData?.image && typeof moduleData.image === 'string' ? moduleData.image.split('/').pop() : 'Choose file'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.moduleInput}
                placeholder="QR Code URL"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.url || ''}
                onChangeText={(text) => handleModuleValueChange(itemIndex, moduleKey, { ...moduleData, url: text })}
              />
            </View>
          </View>
        );

      case 'contact':
        return (
          <View style={styles.moduleContainer}>
            <Text style={styles.moduleLabel}>{moduleInfo.label}</Text>
            <View style={styles.contactContainer}>
              <TextInput
                style={styles.contactInput}
                placeholder="Host Name"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.name || ''}
                onChangeText={(text) => handleModuleValueChange(itemIndex, moduleKey, { ...moduleData, name: text })}
              />
              <TextInput
                style={styles.contactInput}
                placeholder="Phone"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.phone || ''}
                onChangeText={(text) => handleModuleValueChange(itemIndex, moduleKey, { ...moduleData, phone: text })}
              />
              <TextInput
                style={styles.contactInput}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={moduleData?.email || ''}
                onChangeText={(text) => handleModuleValueChange(itemIndex, moduleKey, { ...moduleData, email: text })}
              />
            </View>
          </View>
        );

      case 'notifications':
        return (
          <View style={styles.moduleContainer}>
            <Text style={styles.moduleLabel}>{moduleInfo.label}</Text>
            <View style={styles.notificationsGrid}>
              {[
                { label: '24 hours', value: 24 * 60 },
                { label: '8 hours', value: 8 * 60 },
                { label: '4 hours', value: 4 * 60 },
                { label: '3 hours', value: 3 * 60 },
                { label: '2 hours', value: 2 * 60 },
                { label: '1 hour', value: 60 },
                { label: '45 minutes', value: 45 },
                { label: '30 minutes', value: 30 },
                { label: '15 minutes', value: 15 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.notificationOption,
                    Array.isArray(moduleData) && moduleData.map(String).includes(String(opt.value)) && styles.notificationOptionSelected
                  ]}
                  onPress={() => {
                    let newTimes = Array.isArray(moduleData) ? moduleData.map(String) : [];
                    const valueStr = String(opt.value);
                    if (newTimes.includes(valueStr)) {
                      newTimes = newTimes.filter(v => v !== valueStr);
                    } else {
                      newTimes.push(valueStr);
                    }
                    handleModuleValueChange(itemIndex, moduleKey, newTimes);
                  }}
                >
                  <Text style={[
                    styles.notificationOptionText,
                    Array.isArray(moduleData) && moduleData.map(String).includes(String(opt.value)) && styles.notificationOptionTextSelected
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.moduleContainer}>
            <Text style={styles.moduleLabel}>{moduleInfo.label}</Text>
            <TextInput
              style={styles.moduleInput}
              placeholder={`${moduleInfo.label} value`}
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={moduleData || ''}
              onChangeText={(text) => handleModuleValueChange(itemIndex, moduleKey, text)}
            />
          </View>
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
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Itinerary' : 'Create Itinerary'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-plus" size={64} color="#666" />
            <Text style={styles.emptyStateTitle}>No itinerary items yet</Text>
            <Text style={styles.emptyStateSubtitle}>Click "Add New Item" to get started</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Item {index + 1}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(index)}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Basic Fields */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={item.title}
                  onChangeText={(value) => handleItemChange(index, 'title', value)}
                  placeholder="Enter title"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Date *</Text>
                <TextInput
                  style={styles.textInput}
                  value={item.date}
                  onChangeText={(value) => handleItemChange(index, 'date', value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Arrival Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.arrivalTime}
                    onChangeText={(value) => handleItemChange(index, 'arrivalTime', value)}
                    placeholder="HH:MM"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.startTime}
                    onChangeText={(value) => handleItemChange(index, 'startTime', value)}
                    placeholder="HH:MM"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.endTime}
                    onChangeText={(value) => handleItemChange(index, 'endTime', value)}
                    placeholder="HH:MM"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.halfWidth]}>
                  <Text style={styles.fieldLabel}>Location</Text>
                                  <TextInput
                  style={styles.textInput}
                  value={item.location}
                  onChangeText={(value) => handleItemChange(index, 'location', value)}
                  placeholder="Enter location"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={item.details}
                  onChangeText={(value) => handleItemChange(index, 'details', value)}
                  placeholder="Enter description"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Modules */}
              {Object.keys(item.modules).length > 0 && (
                <View style={styles.modulesSection}>
                  <Text style={styles.modulesTitle}>Modules</Text>
                  {Object.entries(item.modules).map(([moduleKey, isActive]) => {
                    if (!isActive) return null;
                    const moduleInfo = ITINERARY_MODULES.find(m => m.key === moduleKey);
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
                        {renderModuleInput(index, moduleKey, item.moduleValues[moduleKey])}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Add Module Button */}
              <TouchableOpacity
                style={styles.addModuleButton}
                onPress={() => {
                  setSelectedItemIndex(index);
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
        style={styles.csvFab}
        onPress={handleCsvUpload}
      >
        <Text style={styles.csvFabText}>CSV</Text>
      </TouchableOpacity>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddItem}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* CSV FAB */}
      <TouchableOpacity
        style={styles.csvFab}
        onPress={() => setShowCsvModal(true)}
      >
        <Text style={styles.csvFabText}>CSV</Text>
      </TouchableOpacity>

      {/* Footer */}
      {items.length > 0 && (
        <View style={styles.footer}>
                  <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => onNavigate('EventDashboard', { eventId })}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSaveItinerary}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : isEditMode ? 'Update Itinerary' : `Publish ${items.length} Item${items.length !== 1 ? 's' : ''}`}
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
              {ITINERARY_MODULES.map((module) => (
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

      {/* Custom Remove Modal */}
      <Modal
        visible={showRemoveModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.modalTitle}>Confirm Removal</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove this item? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmRemoveItem}
              >
                <Text style={styles.modalDeleteButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.modalTitle}>Upload Itineraries CSV</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowCsvModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Select a CSV file to create draft itinerary forms. Required columns are 'Date' and 'Title'.
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
  itemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemTitle: {
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    flex: 1,
    minWidth: 0,
  },
  moduleLabel: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 4,
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
  modalDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
    textAlign: 'center',
  },
  filePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
  },
  filePickerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  filePickerSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 80,
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalDeleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    minWidth: 80,
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalDownloadButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalDownloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
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
    color: '#fff',
    fontSize: 16,
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
  removeModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: 300,
  },
  removeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  removeModalText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  removeModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  removeModalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 80,
  },
  removeModalCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  removeModalRemoveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    minWidth: 80,
  },
  removeModalRemoveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  moduleContainer: {
    marginBottom: 16,
  },

  filePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
  },
  filePickerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  qrCodeContainer: {
    flexDirection: 'column',
    gap: 12,
  },

  contactContainer: {
    gap: 12,
  },
  contactInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  notificationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notificationOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  notificationOptionSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  notificationOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  csvFab: {
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
  csvFabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 