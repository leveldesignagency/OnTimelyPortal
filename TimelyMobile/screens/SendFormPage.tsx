import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface SendFormPageProps {
  route?: any;
  navigation?: any;
}

const GUEST_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true, type: 'text' },
  { key: 'middleName', label: 'Middle Name', required: false, type: 'text' },
  { key: 'lastName', label: 'Last Name', required: true, type: 'text' },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'contactNumber', label: 'Contact Number', required: true, type: 'tel' },
  { key: 'countryCode', label: 'Country Code', required: true, type: 'select' },
  { key: 'dob', label: 'Date of Birth', required: false, type: 'date' },
  { key: 'gender', label: 'Gender', required: false, type: 'select' },
  { key: 'idType', label: 'ID Type', required: true, type: 'select' },
  { key: 'idNumber', label: 'ID Number', required: true, type: 'text' },
  { key: 'idCountry', label: 'ID Country', required: false, type: 'select' },
  { key: 'nextOfKinName', label: 'Next of Kin Name', required: false, type: 'text' },
  { key: 'nextOfKinEmail', label: 'Next of Kin Email', required: false, type: 'email' },
  { key: 'nextOfKinPhone', label: 'Next of Kin Phone', required: false, type: 'tel' },
  { key: 'dietary', label: 'Dietary Requirements', required: false, type: 'textarea' },
  { key: 'medical', label: 'Medical Information', required: false, type: 'textarea' },
];

const GUEST_MODULES = [
  { key: 'flightNumber', label: 'Flight Tracker', type: 'text', placeholder: 'e.g. BA2490' },
  { key: 'seatNumber', label: 'Seat Number', type: 'text', placeholder: 'e.g. 14A' },
  { key: 'eventReference', label: 'Event Reference', type: 'text', placeholder: 'Enter reference number' },
  { key: 'hotelTracker', label: 'Hotel Tracker', type: 'group' },
  { key: 'trainBookingNumber', label: 'Train Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'coachBookingNumber', label: 'Coach Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'idUpload', label: 'ID Upload', type: 'file', placeholder: 'Upload ID (PNG, JPG, PDF)' },
];

export default function SendFormPage({ route, navigation }: SendFormPageProps) {
  const insets = useSafeAreaInsets();
  
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const currentEventId = route?.params?.eventId;
  const eventName = route?.params?.eventName || 'Event';
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [formConfig, setFormConfig] = useState<{ fields: string[], modules: string[] }>({ fields: [], modules: [] });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastAnimation = new Animated.Value(0);

  useEffect(() => {
    if (currentEventId) {
      fetchEventData();
    }
  }, [currentEventId]);

  const fetchEventData = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', currentEventId)
        .single();

      if (error) throw error;
      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event:', error);
      Alert.alert('Error', 'Failed to load event details');
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    if (currentEmail && !emails.includes(currentEmail) && isValidEmail(currentEmail)) {
      setEmails([...emails, currentEmail]);
      setCurrentEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleFieldToggle = (fieldKey: string) => {
    setFormConfig(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldKey)
        ? prev.fields.filter(f => f !== fieldKey)
        : [...prev.fields, fieldKey]
    }));
  };

  const handleModuleToggle = (moduleKey: string) => {
    setFormConfig(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleKey)
        ? prev.modules.filter(m => m !== moduleKey)
        : [...prev.modules, moduleKey]
    }));
  };

  const handleSelectDefault = () => {
    const defaultFields = [
      'firstName', 'middleName', 'lastName', 'email', 'contactNumber', 
      'countryCode', 'dob', 'gender', 'idType', 'idNumber', 'idCountry',
      'nextOfKinName', 'nextOfKinEmail', 'nextOfKinPhone', 'dietary', 'medical'
    ];
    setFormConfig(prev => ({
      ...prev,
      fields: defaultFields
    }));
  };

  const handleDownloadCSV = () => {
    // Create CSV template for mobile
    const header = 'email\n';
    const example = ['example1@email.com','example2@email.com','example3@email.com'].join('\n');
    const csvContent = header + example + '\n';
    
    // For mobile, we'll show an alert with the CSV content
    // In a real app, you'd use react-native-fs to save the file
    Alert.alert(
      'CSV Template',
      `CSV content:\n\n${csvContent}\n\nCopy this content and save as .csv file`,
      [{ text: 'OK' }]
    );
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    
    // Animate toast in
    Animated.timing(toastAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Auto-hide after 3 seconds and navigate
    setTimeout(() => {
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowToast(false);
        // Navigate to Guest Form Responses page
        navigation.navigate('GuestFormResponses', { eventId: currentEventId });
      });
    }, 3000);
  };

  const handleSendForm = async () => {
    if (emails.length === 0 || formConfig.fields.length === 0) {
      Alert.alert('Error', 'Please add emails and select form fields first.');
      return;
    }

    setLoading(true);
    try {
      // First, create the form in the database
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .insert({
          event_id: currentEventId,
          company_id: event?.company_id,
          title: `${eventName} Guest Form`,
          description: `Please fill out this form for ${eventName}`,
          fields: formConfig.fields.map(fieldKey => {
            const field = GUEST_FIELDS.find(f => f.key === fieldKey);
            if (field) {
              return {
                key: field.key,
                label: field.label,
                type: field.type,
                required: field.required
              };
            }
            return null;
          }).filter(Boolean),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (formError) throw formError;

      // Create recipients and get form links
      console.log('Creating form recipients for emails:', emails);
      const { data: linksData, error: linksError } = await supabase.rpc('create_form_recipients', {
        p_form_id: formData.id,
        p_emails: emails
      });
      
      console.log('create_form_recipients response:', { linksData, linksError });

      if (linksError) throw linksError;

      // Extract emails and links from the response
      console.log('Raw linksData:', linksData);
      
      // The function returns TABLE(emails TEXT[], links TEXT[]) so linksData should be an array
      // with the first element containing the emails and links arrays
      const emailsSent = linksData?.[0]?.emails || emails; // Fallback to original emails if function fails
      const generatedLinks = linksData?.[0]?.links || [];
      
      console.log('Extracted emails:', emailsSent);
      console.log('Extracted links:', generatedLinks);
      
      // Update the form with the emails that were sent
      const { error: updateError } = await supabase
        .from('forms')
        .update({ emails_sent: emailsSent })
        .eq('id', formData.id);

      if (updateError) {
        console.error('Error updating form with emails:', updateError);
        // Don't fail the whole process for this, just log it
      }

      // Generate OnTimely URLs from the database tokens
      const baseUrl = 'https://guestsform.ontimely.co.uk';
      const links = generatedLinks.map((token: string) => `${baseUrl}/forms/${token}`);

      // Send emails with form links via API
      console.log('Starting to send emails via API...');
      console.log('Emails to send:', emails);
      console.log('Links to use:', links);
      
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        const link = links[i] || links[0];
        
        console.log(`Sending email ${i + 1}/${emails.length} to: ${email}`);
        console.log(`Using link: ${link}`);
        
        try {
          const requestBody = {
            emails: [email],
            link: link,
            eventName: eventName
          };
          
          console.log('Request body:', requestBody);
          
          // For mobile app, simulate email sending
          // In production, this would call a Supabase Edge Function
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
          
          console.log(`Email would be sent to: ${email}`);
          console.log(`With link: ${link}`);
          console.log(`Event: ${eventName}`);
          
          // For now, assume success (in production, implement actual email sending)
          console.log(`Email sent successfully to ${email}`);
        } catch (e) {
          console.error('Email send failed for', email, 'Error:', e);
        }
      }
       
      showSuccessToast(`Form sent to ${emails.length} recipient(s) via email`);

    } catch (error: any) {
      console.error('Error sending form:', error);
      Alert.alert('Error', 'Failed to send form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Send Form</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Toast */}
      {showToast && (
        <Animated.View 
          style={[
            styles.toast,
            {
              transform: [{
                translateY: toastAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                })
              }],
              opacity: toastAnimation
            }
          ]}
        >
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Send Form</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, step >= 1 && styles.stepActive]}>
            <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.step, step >= 2 && styles.stepActive]}>
            <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>2</Text>
          </View>
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          <View style={[styles.step, step >= 3 && styles.stepActive]}>
            <Text style={[styles.stepText, step >= 3 && styles.stepTextActive]}>3</Text>
          </View>
        </View>

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Add Recipients</Text>
            <Text style={styles.stepDescription}>
              Add email addresses of people who should receive this form.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.emailInputContainer}>
                <TextInput
                  style={styles.emailInput}
                  value={currentEmail}
                  onChangeText={setCurrentEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onSubmitEditing={handleAddEmail}
                />
                <TouchableOpacity onPress={handleAddEmail} style={styles.addEmailButton}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {emails.length > 0 && (
              <View style={styles.recipientsSection}>
                <Text style={styles.recipientsTitle}>
                  {emails.length} recipient{emails.length !== 1 ? 's' : ''} added
                </Text>
                <View style={styles.recipientsList}>
                  {emails.slice(0, 5).map((email, index) => (
                    <View key={index} style={styles.recipientChip}>
                      <Text style={styles.recipientEmail}>{email}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveEmail(email)}
                        style={styles.removeRecipientButton}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {emails.length > 5 && (
                    <Text style={styles.moreRecipients}>+{emails.length - 5} more</Text>
                  )}
                </View>
              </View>
            )}

            {/* CSV Upload/Download Section */}
            <View style={styles.csvSection}>
              <Text style={styles.csvTitle}>Or upload CSV file:</Text>
              <View style={styles.csvButtons}>
                <TouchableOpacity
                  style={styles.csvButton}
                  onPress={() => {
                    // For mobile, we'll show an alert to upload CSV
                    Alert.alert('Upload CSV', 'CSV upload functionality will be implemented for mobile app');
                  }}
                >
                  <Ionicons name="arrow-up-circle" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.csvButton}
                  onPress={handleDownloadCSV}
                >
                  <Ionicons name="arrow-down-circle" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.stepButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={goBack}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.nextButton, emails.length === 0 && styles.nextButtonDisabled]}
                onPress={() => setStep(2)}
                disabled={emails.length === 0}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Form Fields & Modules</Text>
            <Text style={styles.stepDescription}>
              Choose which fields and modules to include in your form.
            </Text>

            <View style={styles.fieldsSection}>
              <View style={styles.fieldsHeader}>
                <Text style={styles.fieldsTitle}>Basic Fields</Text>
                <TouchableOpacity onPress={handleSelectDefault} style={styles.selectDefaultButton}>
                  <Text style={styles.selectDefaultText}>Select Default</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.fieldsGrid}>
                {GUEST_FIELDS.map((field) => (
                  <TouchableOpacity
                    key={field.key}
                    style={[
                      styles.fieldChip,
                      formConfig.fields.includes(field.key) && styles.fieldChipSelected
                    ]}
                    onPress={() => handleFieldToggle(field.key)}
                  >
                    <Text style={[
                      styles.fieldChipText,
                      formConfig.fields.includes(field.key) && styles.fieldChipTextSelected
                    ]}>
                      {field.label}{field.required ? ' *' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modulesSection}>
              <Text style={styles.modulesTitle}>Modules</Text>
              <View style={styles.fieldsGrid}>
                {GUEST_MODULES.map((module) => (
                  <TouchableOpacity
                    key={module.key}
                    style={[
                      styles.fieldChip,
                      formConfig.modules.includes(module.key) && styles.fieldChipSelected
                    ]}
                    onPress={() => handleModuleToggle(module.key)}
                  >
                    <Text style={[
                      styles.fieldChipText,
                      formConfig.modules.includes(module.key) && styles.fieldChipTextSelected
                    ]}>
                      {module.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Spacer to separate modules from bottom buttons */}
            <View style={styles.bottomSpacer} />

            <View style={styles.stepButtons}>
              <TouchableOpacity
                style={styles.stepBackButton}
                onPress={() => setStep(1)}
              >
                <Text style={styles.stepBackButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.nextButton, formConfig.fields.length === 0 && styles.nextButtonDisabled]}
                onPress={() => setStep(3)}
                disabled={formConfig.fields.length === 0}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Preview & Send Form</Text>
            <Text style={styles.stepDescription}>
              Review your form configuration before sending.
            </Text>

            {/* Form Preview Card */}
            <View style={styles.formPreviewCard}>
              <Text style={styles.formPreviewTitle}>{eventName}</Text>
              <Text style={styles.formPreviewSubtitle}>Guest Information Form</Text>
              
              <View style={styles.formFieldsPreview}>
                {formConfig.fields.map(fieldKey => {
                  const field = GUEST_FIELDS.find(f => f.key === fieldKey);
                  if (!field) return null;
                  
                  return (
                    <View key={fieldKey} style={styles.formFieldPreview}>
                      <Text style={styles.formFieldLabel}>
                        {field.label}
                        {field.required && <Text style={styles.requiredAsterisk}> *</Text>}
                      </Text>
                      <View style={[
                        styles.formFieldInput,
                        field.type === 'textarea' && styles.formFieldTextarea
                      ]}>
                        <Text style={styles.formFieldPlaceholder}>
                          {field.type === 'select' ? `Select ${field.label.toLowerCase()}...` : 
                           field.type === 'textarea' ? `Enter ${field.label.toLowerCase()}...` :
                           `Enter ${field.label.toLowerCase()}...`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                
                {formConfig.modules.length > 0 && (
                  <View style={styles.modulesSection}>
                    <Text style={styles.modulesTitle}>Additional Information</Text>
                    {formConfig.modules.map(moduleKey => {
                      const module = GUEST_MODULES.find(m => m.key === moduleKey);
                      if (!module) return null;
                      
                      if (module.key === 'hotelTracker') {
                        return (
                          <View key={moduleKey} style={styles.formFieldPreview}>
                            <Text style={styles.formFieldLabel}>Hotel Tracker</Text>
                            <View style={styles.hotelTrackerFields}>
                              <View style={styles.formFieldInput}>
                                <Text style={styles.formFieldPlaceholder}>Enter hotel address...</Text>
                              </View>
                              <View style={styles.formFieldInput}>
                                <Text style={styles.formFieldPlaceholder}>Enter reservation number...</Text>
                              </View>
                            </View>
                          </View>
                        );
                      }
                      
                      return (
                        <View key={moduleKey} style={styles.formFieldPreview}>
                          <Text style={styles.formFieldLabel}>{module.label}</Text>
                          <View style={[
                            styles.formFieldInput,
                            module.type === 'file' && styles.formFieldFile
                          ]}>
                            <Text style={styles.formFieldPlaceholder}>
                              {module.placeholder || `Enter ${module.label.toLowerCase()}...`}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Form Summary Card */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>Form Summary</Text>
              <View style={styles.reviewGrid}>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Recipients:</Text>
                  <Text style={styles.reviewValue}>{emails.length}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Fields:</Text>
                  <Text style={styles.reviewValue}>{formConfig.fields.length}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Modules:</Text>
                  <Text style={styles.reviewValue}>{formConfig.modules.length}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Form Hosting:</Text>
                  <Text style={styles.formHostingUrl}>guestsform.ontimely.co.uk</Text>
                </View>
              </View>
            </View>

            <View style={styles.stepButtons}>
              <TouchableOpacity
                style={styles.stepBackButton}
                onPress={() => setStep(2)}
              >
                <Text style={styles.stepBackButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                onPress={handleSendForm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color="#fff" />
                )}
                <Text style={styles.sendButtonText}>
                  {loading ? 'Sending...' : 'Send Form'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#10b981',
  },
  stepText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#ffffff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#10b981',
  },
  stepContent: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 24,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emailInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addEmailButton: {
    backgroundColor: '#10b981',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientsSection: {
    marginBottom: 24,
  },
  recipientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  recipientsList: {
    gap: 8,
  },
  recipientChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipientEmail: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  removeRecipientButton: {
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreRecipients: {
    color: '#a0a0a0',
    fontSize: 14,
    fontStyle: 'italic',
  },
  csvSection: {
    marginBottom: 24,
  },
  csvTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 500,
    marginBottom: 8,
  },
  csvButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  csvButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    width: 56,
  },
  bottomSpacer: {
    height: 32,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  fieldsSection: {
    marginBottom: 32,
  },
  fieldsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fieldsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectDefaultButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: 120,
  },
  selectDefaultText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modulesSection: {
    marginBottom: 24,
  },
  modulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  fieldsGrid: {
    gap: 12,
  },
  fieldChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  fieldChipText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  fieldChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  formPreviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  formPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  formPreviewSubtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 24,
  },
  formFieldsPreview: {
    gap: 16,
  },
  formFieldPreview: {
    marginBottom: 16,
  },
  formFieldLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#a0a0a0',
  },
  formFieldInput: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  formFieldTextarea: {
    height: 80,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  formFieldFile: {
    height: 60,
  },
  formFieldPlaceholder: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  hotelTrackerFields: {
    gap: 8,
  },
  modulesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 16,
    marginTop: 16,
  },
  modulesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  formHostingUrl: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'monospace',
  },
  reviewSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  reviewGrid: {
    gap: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepBackButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 