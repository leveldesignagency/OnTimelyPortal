import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

interface AnnouncementModalProps {
  isVisible: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: () => void;
}

interface AnnouncementData {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  scheduledFor: string;
  sendImmediately: boolean;
}

export default function AnnouncementModal({ isVisible, onClose, eventId, onSuccess }: AnnouncementModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState<AnnouncementData>({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    scheduledFor: '',
    sendImmediately: true
  });

  // Load current user on mount
  React.useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const handleInputChange = (field: keyof AnnouncementData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (file: any) => {
    if (!file) return;

    try {
      setLoading(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `announcements/${eventId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('announcement_media')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('announcement_media')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        imageUrl: publicUrl
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);

      // Calculate scheduled time if not sending immediately
      let scheduledFor = null;
      if (!formData.sendImmediately && formData.scheduledFor) {
        const today = new Date();
        const [hours, minutes] = formData.scheduledFor.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (today <= new Date()) {
          today.setDate(today.getDate() + 1);
        }
        
        scheduledFor = today.toISOString();
      }

      const announcementData = {
        event_id: eventId,
        company_id: currentUser.company_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        image_url: formData.imageUrl || null,
        link_url: formData.linkUrl.trim() || null,
        scheduled_for: scheduledFor,
        sent_at: formData.sendImmediately ? new Date().toISOString() : null,
        created_by: currentUser.id
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert([announcementData])
        .select();

      if (error) throw error;

      // If sending immediately, trigger push notifications
      if (formData.sendImmediately) {
        console.log('Sending immediate announcement:', data);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        scheduledFor: '',
        sendImmediately: true
      });
      setImageFile(null);
      setImagePreview('');

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', 'Failed to send announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      linkUrl: '',
      scheduledFor: '',
      sendImmediately: true
    });
    setImageFile(null);
    setImagePreview('');
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Announcement</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                resetForm();
                onClose();
              }}
              disabled={loading}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Title - Required */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                placeholder="Enter announcement title"
                placeholderTextColor="#666"
                editable={!loading}
              />
            </View>

            {/* Description - Optional */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder="Enter announcement description (optional)"
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                editable={!loading}
              />
            </View>

            {/* Image Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Image</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => {
                  // For mobile, we'll skip image upload for now
                  Alert.alert('Info', 'Image upload will be implemented in a future update');
                }}
                disabled={loading}
              >
                <MaterialCommunityIcons name="upload" size={20} color="#10b981" />
                <Text style={styles.uploadButtonText}>Upload Image</Text>
              </TouchableOpacity>
            </View>

            {/* Link URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Link URL</Text>
              <TextInput
                style={styles.textInput}
                value={formData.linkUrl}
                onChangeText={(value) => handleInputChange('linkUrl', value)}
                placeholder="https://example.com (optional)"
                placeholderTextColor="#666"
                keyboardType="url"
                editable={!loading}
              />
            </View>

            {/* Send Options */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Send Options</Text>
              
              <View style={styles.sendOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.sendOptionButton,
                    formData.sendImmediately && styles.sendOptionButtonActive
                  ]}
                  onPress={() => handleInputChange('sendImmediately', true)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.sendOptionText,
                    formData.sendImmediately && styles.sendOptionTextActive
                  ]}>
                    Send Now
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sendOptionButton,
                    !formData.sendImmediately && styles.sendOptionButtonActive
                  ]}
                  onPress={() => handleInputChange('sendImmediately', false)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.sendOptionText,
                    !formData.sendImmediately && styles.sendOptionTextActive
                  ]}>
                    Set Time
                  </Text>
                </TouchableOpacity>
              </View>
              
              {!formData.sendImmediately && (
                <View style={styles.timeInputContainer}>
                  <Text style={styles.label}>Send Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.scheduledFor}
                    onChangeText={(value) => handleInputChange('scheduledFor', value)}
                    placeholder="HH:MM (e.g., 14:30)"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                resetForm();
                onClose();
              }}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!formData.title.trim() || loading) && styles.sendButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!formData.title.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Announcement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  uploadButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  sendOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sendOptionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sendOptionButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
  },
  sendOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sendOptionTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  timeInputContainer: {
    marginTop: 12,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 14,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 