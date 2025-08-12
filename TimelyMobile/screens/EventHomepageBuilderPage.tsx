import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Image,
  Dimensions,
  SafeAreaView,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { supabase } from '../lib/supabase';
import GlobalHeader from '../components/GlobalHeader';

interface HomepageModule {
  id: string;
  type: 'title' | 'description' | 'image' | 'video' | 'list';
  content: any;
  position: number;
}

interface HomepageData {
  eventImage: string | null;
  welcomeTitle: string;
  welcomeDescription: string;
  modules: HomepageModule[];
}

interface EventHomepageBuilderPageProps {
  eventId?: string;
  onNavigate?: (route: string, params?: any) => void;
  onMenuPress?: () => void;
  navigation?: any;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';

const getVideoEmbedUrl = (url: string): string => {
  console.log('[VIDEO] Parsing URL:', url);
  
  // Handle different YouTube URL formats
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    console.log('[VIDEO] YouTube video ID:', videoId);
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&controls=1&fs=1&playsinline=1` : '';
  } else if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    console.log('[VIDEO] YouTube short video ID:', videoId);
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&controls=1&fs=1&playsinline=1` : '';
  } else if (url.includes('youtube.com/embed/')) {
    console.log('[VIDEO] Already embed URL');
    return url;
  } else if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    console.log('[VIDEO] Vimeo video ID:', videoId);
    return videoId ? `https://player.vimeo.com/video/${videoId}?h=auto&autoplay=0&title=0&byline=0&portrait=0&playsinline=1` : '';
  }
  
  console.log('[VIDEO] No recognized video format');
  return '';
};

export default function EventHomepageBuilderPage({ eventId, onNavigate, onMenuPress, navigation }: EventHomepageBuilderPageProps) {
  const insets = useSafeAreaInsets();
  const [homepageData, setHomepageData] = useState<HomepageData>({
    eventImage: null,
    welcomeTitle: 'WELCOME TO THE EVENT',
    welcomeDescription: 'THIS IS A DESCRIPTION',
    modules: [],
  });
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  // Load existing homepage data
  useEffect(() => {
    if (eventId) {
      loadHomepageData();
    }
  }, [eventId]);

  const loadHomepageData = async () => {
    try {
      console.log('Loading homepage data for eventId:', eventId);
      
      // Get current user to get company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get user profile to get company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_id) {
        console.error('Error getting user company_id:', userError);
        return;
      }

      console.log('Loading homepage data with company_id:', userData.company_id);

      const { data, error } = await supabase
        .from('event_homepage_data')
        .select('*')
        .eq('event_id', eventId)
        .eq('company_id', userData.company_id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading homepage data:', error);
        return;
      }

      if (data) {
        console.log('Loaded homepage data:', data);
        setHomepageData({
          eventImage: data.event_image || null,
          welcomeTitle: data.welcome_title || 'WELCOME TO THE EVENT',
          welcomeDescription: data.welcome_description || 'THIS IS A DESCRIPTION',
          modules: data.modules || [],
        });
      } else {
        console.log('No existing homepage data found, using defaults');
      }
    } catch (error) {
      console.error('Error loading homepage data:', error);
    }
  };

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCoverImagePreview(imageUri);
        // Upload to Supabase storage
        await uploadCoverImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadCoverImage = async (imageUri: string) => {
    try {
      console.log('[HOMEPAGE UPLOAD] Starting upload for:', imageUri);
      
      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      console.log('[HOMEPAGE UPLOAD] Base64 data length:', base64Data.length);
      
      // Create data URL
      const dataUrl = `data:image/jpeg;base64,${base64Data}`;
      console.log('[HOMEPAGE UPLOAD] Data URL created, length:', dataUrl.length);
      
      // Store the data URL directly instead of uploading to Supabase storage
      // This bypasses React Native storage issues
      setHomepageData(prev => ({ ...prev, eventImage: dataUrl }));
      
      console.log('[HOMEPAGE UPLOAD] Image uploaded successfully using data URL approach');
    } catch (error) {
      console.error('[HOMEPAGE UPLOAD] Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const addModule = (type: HomepageModule['type']) => {
    const newModule: HomepageModule = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type),
      position: homepageData.modules.length,
    };

    setHomepageData(prev => ({
      ...prev,
      modules: [...prev.modules, newModule],
    }));

    setShowAddModuleModal(false);
  };

  const getDefaultContent = (type: HomepageModule['type']) => {
    switch (type) {
      case 'title':
        return { text: 'NEW TITLE' };
      case 'description':
        return { text: 'New description text goes here.' };
      case 'image':
        return { url: PLACEHOLDER_IMAGE };

      case 'video':
        return { url: '' };
      case 'list':
        return { items: ['Item 1', 'Item 2', 'Item 3'] };
      default:
        return {};
    }
  };

  const updateModule = (moduleId: string, content: any) => {
    setHomepageData(prev => ({
      ...prev,
      modules: prev.modules.map(module =>
        module.id === moduleId ? { ...module, content } : module
      ),
    }));
  };

  const removeModule = (moduleId: string) => {
    setHomepageData(prev => ({
      ...prev,
      modules: prev.modules.filter(module => module.id !== moduleId),
    }));
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    setHomepageData(prev => {
      const modules = [...prev.modules];
      const index = modules.findIndex(m => m.id === moduleId);
      
      if (direction === 'up' && index > 0) {
        [modules[index], modules[index - 1]] = [modules[index - 1], modules[index]];
      } else if (direction === 'down' && index < modules.length - 1) {
        [modules[index], modules[index + 1]] = [modules[index + 1], modules[index]];
      }
      
      return { ...prev, modules };
    });
  };



  const saveHomepage = async () => {
    if (!eventId) return;
    
    setIsSaving(true);
    try {
      console.log('Starting save process...');
      
      // Test basic Supabase connection first
      console.log('Testing basic connection...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      if (!user) {
        console.error('No user found');
        Alert.alert('Error', 'No authenticated user found');
        return;
      }
      
      console.log('User authenticated, getting profile...');
      
      // Get user profile to get company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('User profile error:', userError);
        throw new Error(`Failed to get user profile: ${userError.message}`);
      }
      
      if (!userData?.company_id) {
        console.error('No company_id found');
        throw new Error('User has no company_id');
      }

      console.log('Profile loaded, saving homepage...');

      const { error } = await supabase
        .from('event_homepage_data')
        .upsert({
          event_id: eventId,
          company_id: userData.company_id,
          event_image: homepageData.eventImage,
          welcome_title: homepageData.welcomeTitle,
          welcome_description: homepageData.welcomeDescription,
          modules: homepageData.modules,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'event_id,company_id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Homepage saved successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving homepage:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      let errorMessage = 'Failed to save homepage';
      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const renderModule = (module: HomepageModule) => {
    switch (module.type) {
      case 'title':
        return (
          <View key={module.id} style={styles.moduleContainer}>
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleTypeLabel}>Title</Text>
              <View style={styles.moduleActions}>
                <TouchableOpacity onPress={() => moveModule(module.id, 'up')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-up" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveModule(module.id, 'down')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-down" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeModule(module.id)} style={styles.actionButton}>
                  <MaterialCommunityIcons name="delete" size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={styles.titleInput}
              value={module.content.text}
              onChangeText={(text) => updateModule(module.id, { ...module.content, text })}
              placeholder="Enter title text"
              placeholderTextColor="#888"
            />
          </View>
        );

      case 'description':
        return (
          <View key={module.id} style={styles.moduleContainer}>
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleTypeLabel}>Description</Text>
              <View style={styles.moduleActions}>
                <TouchableOpacity onPress={() => moveModule(module.id, 'up')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-up" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveModule(module.id, 'down')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-down" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeModule(module.id)} style={styles.actionButton}>
                  <MaterialCommunityIcons name="delete" size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={styles.descriptionInput}
              value={module.content.text}
              onChangeText={(text) => updateModule(module.id, { ...module.content, text })}
              placeholder="Enter description text"
              placeholderTextColor="#888"
              multiline
            />
          </View>
        );

      case 'image':
        return (
          <View key={module.id} style={styles.moduleContainer}>
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleTypeLabel}>Image</Text>
              <View style={styles.moduleActions}>
                <TouchableOpacity onPress={() => moveModule(module.id, 'up')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-up" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveModule(module.id, 'down')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-down" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeModule(module.id)} style={styles.actionButton}>
                  <MaterialCommunityIcons name="delete" size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Image source={{ uri: module.content.url }} style={styles.moduleImage} />
          </View>
        );

      case 'video':
        return (
          <View key={module.id} style={styles.moduleContainer}>
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleTypeLabel}>Video</Text>
              <View style={styles.moduleActions}>
                <TouchableOpacity onPress={() => moveModule(module.id, 'up')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-up" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveModule(module.id, 'down')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-down" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeModule(module.id)} style={styles.actionButton}>
                  <MaterialCommunityIcons name="delete" size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={styles.urlInput}
              value={module.content.url}
              onChangeText={(url) => updateModule(module.id, { ...module.content, url })}
              placeholder="Enter video URL (YouTube, Vimeo)"
              placeholderTextColor="#888"
            />
            {module.content.url && (
              <View style={styles.videoPreview}>
                <Text style={styles.videoPreviewText}>Video Preview</Text>
                {(() => {
                  const embedUrl = getVideoEmbedUrl(module.content.url);
                  console.log('[VIDEO] Original URL:', module.content.url);
                  console.log('[VIDEO] Embed URL:', embedUrl);
                  
                  if (embedUrl) {
                    return (
                      <View style={styles.videoContainer}>
                        <WebView
                          source={{ uri: embedUrl }}
                          style={styles.videoWebView}
                          javaScriptEnabled={true}
                          domStorageEnabled={true}
                          allowsFullscreenVideo={true}
                          mediaPlaybackRequiresUserAction={false}
                          onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('[VIDEO] WebView error:', nativeEvent);
                          }}
                          onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('[VIDEO] WebView HTTP error:', nativeEvent);
                          }}
                          onLoadStart={() => console.log('[VIDEO] WebView load started')}
                          onLoadEnd={() => console.log('[VIDEO] WebView load ended')}
                          onNavigationStateChange={(navState) => {
                            console.log('[VIDEO] Navigation state changed:', navState.url);
                          }}
                          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
                          startInLoadingState={true}
                          renderLoading={() => (
                            <View style={styles.videoLoadingContainer}>
                              <Text style={styles.videoLoadingText}>Loading video...</Text>
                            </View>
                          )}
                          allowsInlineMediaPlayback={true}
                          mediaPlaybackRequiresUserAction={false}
                          mixedContentMode="compatibility"
                        />
                        <View style={styles.videoOverlay}>
                          <MaterialCommunityIcons name="play-circle" size={48} color="rgba(255, 255, 255, 0.8)" />
                          <Text style={styles.videoOverlayText}>Tap to play</Text>
                        </View>
                      </View>
                    );
                  } else {
                    return (
                      <View style={styles.videoErrorContainer}>
                        <Text style={styles.videoErrorText}>Invalid video URL format</Text>
                        <Text style={styles.videoUrlText}>{module.content.url}</Text>
                      </View>
                    );
                  }
                })()}
              </View>
            )}
            
            {/* Fallback video link */}
            {module.content.url && (
              <TouchableOpacity 
                style={styles.videoFallbackLink}
                onPress={() => {
                  // Open video in external browser
                  Linking.openURL(module.content.url);
                }}
              >
                <MaterialCommunityIcons name="play-circle" size={20} color="#10b981" />
                <Text style={styles.videoFallbackText}>Open Video</Text>
              </TouchableOpacity>
            )}
          </View>
        );



      case 'list':
        return (
          <View key={module.id} style={styles.moduleContainer}>
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleTypeLabel}>List</Text>
              <View style={styles.moduleActions}>
                <TouchableOpacity onPress={() => moveModule(module.id, 'up')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-up" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveModule(module.id, 'down')} style={styles.actionButton}>
                  <MaterialCommunityIcons name="arrow-down" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeModule(module.id)} style={styles.actionButton}>
                  <MaterialCommunityIcons name="delete" size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
            {module.content.items?.map((item: string, index: number) => (
              <TextInput
                key={index}
                style={styles.listItemInput}
                value={item}
                onChangeText={(text) => {
                  const newItems = [...(module.content.items || [])];
                  newItems[index] = text;
                  updateModule(module.id, { ...module.content, items: newItems });
                }}
                placeholder={`Item ${index + 1}`}
                placeholderTextColor="#888"
              />
            ))}
            <TouchableOpacity
              style={styles.addListItemButton}
              onPress={() => {
                const newItems = [...(module.content.items || []), ''];
                updateModule(module.id, { ...module.content, items: newItems });
              }}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#10b981" />
              <Text style={styles.addListItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const moduleTypes = [
    { type: 'title' as const, label: 'Title', icon: 'format-header-1' },
    { type: 'description' as const, label: 'Description', icon: 'text' },
    { type: 'image' as const, label: 'Image', icon: 'image' },
    { type: 'video' as const, label: 'Video', icon: 'video' },
    { type: 'list' as const, label: 'List', icon: 'format-list-bulleted' },
  ];

  const coverImageSrc = coverImagePreview || homepageData.eventImage;

  return (
    <View style={styles.container}>
      <GlobalHeader
        title="Homepage Builder"
        onMenuPress={onMenuPress}
        showBackButton={true}
        onBackPress={() => {
          // Use navigation.goBack() to go back to the previous screen
          if (navigation) {
            navigation.goBack();
          } else if (onNavigate) {
            // Fallback to onNavigate if navigation is not available
            onNavigate('goBack');
          }
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cover Image</Text>
          <TouchableOpacity style={styles.coverImageContainer} onPress={pickCoverImage}>
            {coverImageSrc ? (
              <Image source={{ uri: coverImageSrc }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverImagePlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={48} color="#888" />
                <Text style={styles.coverImagePlaceholderText}>Tap to add cover image</Text>
                <Text style={styles.coverImagePlaceholderSubtext}>JPEG, PNG, WebP • Max 2MB</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome Section</Text>
          <TextInput
            style={styles.titleInput}
            value={homepageData.welcomeTitle}
            onChangeText={(text) => setHomepageData(prev => ({ ...prev, welcomeTitle: text }))}
            placeholder="Welcome title"
            placeholderTextColor="#888"
          />
          <TextInput
            style={styles.descriptionInput}
            value={homepageData.welcomeDescription}
            onChangeText={(text) => setHomepageData(prev => ({ ...prev, welcomeDescription: text }))}
            placeholder="Welcome description"
            placeholderTextColor="#888"
            multiline
          />
        </View>

        {/* Modules Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modules</Text>
          {homepageData.modules.map(renderModule)}
        </View>
      </ScrollView>

      {/* FAB Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => setShowAddModuleModal(true)}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={saveHomepage}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving...' : 'Save Homepage'}
        </Text>
      </TouchableOpacity>

      {/* Add Module Modal */}
      <Modal
        visible={showAddModuleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModuleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Module</Text>
              <TouchableOpacity onPress={() => setShowAddModuleModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {moduleTypes.map((moduleType) => (
                <TouchableOpacity
                  key={moduleType.type}
                  style={styles.moduleTypeButton}
                  onPress={() => addModule(moduleType.type)}
                >
                  <MaterialCommunityIcons name={moduleType.icon as any} size={24} color="#fff" />
                  <Text style={styles.moduleTypeLabel}>{moduleType.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContainer}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#10b981" />
            <Text style={styles.successModalTitle}>Homepage Saved!</Text>
            <Text style={styles.successModalText}>
              Your homepage has been saved successfully.
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  coverImagePlaceholderText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  coverImagePlaceholderSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  titleInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  descriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  moduleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  moduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  moduleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  urlInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  videoPreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  videoPreviewText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoUrlText: {
    color: '#ccc',
    fontSize: 12,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  videoWebView: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#000',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  videoErrorContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  videoErrorText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoLoadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  videoFallbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  videoFallbackText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  listItemInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  addListItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addListItemText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  fabButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  moduleTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  successModalContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  successModalText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  successModalButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 