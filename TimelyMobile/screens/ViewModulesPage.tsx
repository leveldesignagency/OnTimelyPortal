import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

interface Module {
  id: string;
  module_type: 'question' | 'feedback' | 'multiple_choice' | 'photo_video';
  title?: string;
  question?: string;
  time: string;
  date: string;
  survey_data?: any;
  feedback_data?: any;
  label?: string;
  created_at: string;
}

interface ViewModulesPageProps {
  eventId: string;
}

export default function ViewModulesPage({ eventId }: ViewModulesPageProps) {
  const navigation = useNavigation();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load modules
  useEffect(() => {
    loadModules();
  }, [eventId]);

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from('timeline_modules')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading modules:', error);
        Alert.alert('Error', 'Failed to load modules');
      } else {
        setModules(data || []);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
      Alert.alert('Error', 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    setModuleToDelete(moduleId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!moduleToDelete) return;
    
    try {
      const { error } = await supabase
        .from('timeline_modules')
        .delete()
        .eq('id', moduleToDelete);

      if (error) {
        console.error('Error deleting module:', error);
        Alert.alert('Error', 'Failed to delete module');
      } else {
        await loadModules();
        setSuccessMessage('Module deleted successfully');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      Alert.alert('Error', 'Failed to delete module');
    } finally {
      setShowDeleteModal(false);
      setModuleToDelete(null);
    }
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedModule: Partial<Module>) => {
    if (!editingModule) return;

    console.log('handleSaveEdit called with:', { editingModule, updatedModule });

    try {
      const { error } = await supabase
        .from('timeline_modules')
        .update(updatedModule)
        .eq('id', editingModule.id);

      if (error) {
        console.error('Error updating module:', error);
        Alert.alert('Error', 'Failed to update module');
      } else {
        console.log('Module updated successfully');
        await loadModules();
        setShowEditModal(false);
        setEditingModule(null);
        setSuccessMessage('Module updated successfully');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error updating module:', error);
      Alert.alert('Error', 'Failed to update module');
    }
  };

  const getModuleIcon = (moduleType: string) => {
    switch (moduleType) {
      case 'question':
        return 'help-circle';
      case 'feedback':
        return 'star';
      case 'multiple_choice':
        return 'format-list-bulleted';
      case 'photo_video':
        return 'camera';
      case 'qrcode':
        return 'qrcode';
      case 'survey':
        return 'clipboard-list';
      default:
        return 'puzzle';
    }
  };

  const getModuleTypeName = (moduleType: string) => {
    switch (moduleType) {
      case 'question':
        return 'Question';
      case 'feedback':
        return 'Feedback';
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'photo_video':
        return 'Photo/Video';
      case 'qrcode':
        return 'QR Code';
      case 'survey':
        return 'Survey';
      default:
        return 'Module';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading modules...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>View Modules</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Modules List */}
      <ScrollView style={styles.modulesList} showsVerticalScrollIndicator={false}>
        {modules.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="puzzle" size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>No Modules</Text>
            <Text style={styles.emptyStateText}>
              No timeline modules have been created yet.
            </Text>
          </View>
        ) : (
          modules.map((module) => (
            <View key={module.id} style={styles.moduleCard}>
              <View style={styles.moduleHeader}>
                <View style={styles.moduleIconContainer}>
                  <MaterialCommunityIcons 
                    name={getModuleIcon(module.module_type)} 
                    size={20} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>
                    {module.question || module.title || module.label || getModuleTypeName(module.module_type)}
                  </Text>
                  <Text style={styles.moduleType}>
                    {getModuleTypeName(module.module_type)}
                  </Text>
                  <Text style={styles.moduleTime}>
                    {module.time}
                  </Text>
                </View>
                <View style={styles.moduleDate}>
                  <Text style={styles.dateText}>
                    {formatDate(module.date)}
                  </Text>
                </View>
                <View style={styles.moduleActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditModule(module)}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteModule(module.id)}
                  >
                    <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Module Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Module</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <EditModuleForm 
              module={editingModule}
              onSave={handleSaveEdit}
              onCancel={() => setShowEditModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Text style={styles.deleteModalTitle}>Delete Module</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this module?
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.cancelDeleteButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalHeader}>
              <View style={styles.successIconContainer}>
                <MaterialCommunityIcons name="check-circle" size={32} color="#10b981" />
              </View>
              <Text style={styles.successModalTitle}>Success</Text>
            </View>
            
            <Text style={styles.successModalText}>
              {successMessage}
            </Text>
            
            <TouchableOpacity 
              style={styles.successModalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Edit Module Form Component
function EditModuleForm({ module, onSave, onCancel }: any) {
  const [title, setTitle] = useState(module?.question || module?.title || module?.label || '');
  const [time, setTime] = useState(module?.time || '');
  const [date, setDate] = useState(() => {
    // Convert YYYY-MM-DD to DD/MM/YYYY for display
    if (module?.date && module.date.includes('-')) {
      const parts = module.date.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
    }
    return module?.date || '';
  });
  
  // Module-specific state
  const [options, setOptions] = useState<string[]>(
    module?.module_type === 'multiple_choice' && module?.survey_data?.options 
      ? module.survey_data.options 
      : ['', '']
  );
  const [prompt, setPrompt] = useState(module?.title || '');

  const handleSave = () => {
    // Check required fields based on module type
    const requiredTitle = module?.module_type === 'photo_video' ? prompt : title;
    
    if (!requiredTitle.trim() || !time.trim() || !date.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD for database
    const convertDateForDatabase = (dateString: string) => {
      if (!dateString || !dateString.includes('/')) return dateString;
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      return dateString;
    };

    const updatedModule: any = { time, date: convertDateForDatabase(date) };
    
    // Add module-specific fields based on type
    switch (module?.module_type) {
      case 'question':
        updatedModule.question = title;
        updatedModule.title = title;
        break;
      case 'feedback':
        updatedModule.title = title;
        updatedModule.question = title; // Add question field for feedback
        break;
      case 'multiple_choice':
        updatedModule.question = title;
        updatedModule.title = title;
        if (options.filter(opt => opt.trim()).length < 2) {
          Alert.alert('Error', 'Please add at least 2 options');
          return;
        }
        updatedModule.survey_data = { options: options.filter(opt => opt.trim()) };
        break;
      case 'photo_video':
        updatedModule.title = prompt;
        updatedModule.question = prompt; // Add question field for photo/video
        updatedModule.label = prompt;
        break;
      default:
        updatedModule.title = title;
        updatedModule.question = title;
    }

    console.log('Saving module updates:', updatedModule);
    onSave(updatedModule);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const getFieldLabel = () => {
    switch (module?.module_type) {
      case 'question':
      case 'multiple_choice':
        return 'Question';
      case 'photo_video':
        return 'Prompt';
      default:
        return 'Title';
    }
  };

  const getFieldPlaceholder = () => {
    switch (module?.module_type) {
      case 'question':
      case 'multiple_choice':
        return 'Enter question...';
      case 'photo_video':
        return 'Enter prompt...';
      default:
        return 'Enter title...';
    }
  };

  return (
    <ScrollView style={styles.editFormScroll}>
      <View style={styles.editForm}>
        {/* Question/Title Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{getFieldLabel()}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={getFieldPlaceholder()}
            placeholderTextColor="#666"
            value={module?.module_type === 'photo_video' ? prompt : title}
            onChangeText={(value) => {
              if (module?.module_type === 'photo_video') {
                setPrompt(value);
              } else {
                setTitle(value);
              }
            }}
          />
        </View>

        {/* Multiple Choice Options */}
        {module?.module_type === 'multiple_choice' && (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Options</Text>
            {options.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor="#666"
                  value={option}
                  onChangeText={(value) => updateOption(index, value)}
                />
                {options.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeOptionButton}
                    onPress={() => removeOption(index)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
              <MaterialCommunityIcons name="plus" size={16} color="#10b981" />
              <Text style={styles.addOptionText}>Add Option</Text>
            </TouchableOpacity>
          </View>
        )}



        {/* Date and Time Fields */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeField}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#666"
              value={date}
              onChangeText={setDate}
            />
          </View>
          
          <View style={styles.dateTimeField}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput
              style={styles.textInput}
              placeholder="HH:MM"
              placeholderTextColor="#666"
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        <View style={styles.formButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  modulesList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  moduleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleType: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  moduleTime: {
    color: '#666',
    fontSize: 12,
  },
  moduleDate: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dateText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  moduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  editForm: {
    gap: 16,
    paddingBottom: 20,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editFormScroll: {
    maxHeight: 500,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  optionInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
  },
  removeOptionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  addOptionText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 350,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  deleteModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  deleteModalText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelDeleteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
  },
  successModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    marginBottom: 12,
  },
  successModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  successModalText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  successModalButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeField: {
    flex: 1,
  },
}); 