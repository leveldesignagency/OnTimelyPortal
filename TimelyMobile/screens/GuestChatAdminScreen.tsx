import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
// import { Video } from 'expo-av'; // Removed deprecated import
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, supabaseAnonKey } from '../lib/supabase';
import Constants from 'expo-constants';
import Base64 from 'react-native-base64';
import { getCurrentUser } from '../lib/auth';
import GlobalHeader from '../components/GlobalHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnnouncementChatItem from '../components/AnnouncementChatItem';
import TimelineModuleChatItem from '../components/TimelineModuleChatItem';
import ModuleResponseModal from '../components/ModuleResponseModal';
import announcementService, { Announcement as AnnouncementType } from '../lib/announcementService';
import { insertActivityLogMobile } from '../lib/supabase';

// ModuleDisplay component for chat screens
const ModuleDisplay = ({ module, onClose }: { module: any; onClose: () => void }) => {
  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'question': return 'help-circle';
      case 'feedback': return 'star';
      case 'multiple_choice': return 'format-list-bulleted';
      case 'photo_video': return 'camera';
      default: return 'puzzle';
    }
  };

  const getModuleColor = (type: string) => {
    switch (type) {
      case 'question': return '#3b82f6';
      case 'feedback': return '#f59e0b';
      case 'multiple_choice': return '#10b981';
      case 'photo_video': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getModuleDisplayName = (type: string) => {
    const displayNames: { [key: string]: string } = {
      question: 'Question',
      feedback: 'Feedback',
      multiple_choice: 'Multiple Choice',
      photo_video: 'Photo/Video'
    };
    return displayNames[type] || type;
  };

  return (
    <View style={styles.moduleDisplayContainer}>
      <View style={styles.moduleDisplayHeader}>
        <View style={styles.moduleDisplayIconContainer}>
          <MaterialCommunityIcons
            name={getModuleIcon(module.module_type)}
            size={32}
            color={getModuleColor(module.module_type)}
          />
        </View>
        <View style={styles.moduleDisplayInfo}>
          <Text style={styles.moduleDisplayTitle}>
            {getModuleDisplayName(module.module_type)}
          </Text>
          <Text style={styles.moduleDisplayTime}>
            {module.time} • {module.date}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeModuleButton}>
          <MaterialCommunityIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.moduleContent}>
        <Text style={styles.moduleQuestion}>
          {module.question || module.title || module.label || getModuleDisplayName(module.module_type)}
        </Text>
        
        <Text style={styles.moduleDescription}>
          This module is now available for you to interact with.
        </Text>
      </View>
    </View>
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
  message_id: string;
  event_id: string;
  sender_email: string;
  sender_name: string;
  sender_type: 'admin' | 'guest';
  avatar_url?: string;
  message_text: string | null;
  message_type: string;
  created_at: string;
  company_id: string;
  is_edited: boolean;
  edited_at?: string;
  reply_to_message_id?: string;
  reactions?: any[];
  attachment_url?: string | null;
  attachment_filename?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}

interface GuestChatAdminScreenProps {
  route: {
    params: {
      eventId: string;
      eventName?: string;
    };
  };
  navigation: any;
  onMenuPress?: () => void;
  onNavigate?: (route: string, params?: any) => void;
}

const GuestChatAdminScreen: React.FC<GuestChatAdminScreenProps> = ({ route, navigation, onMenuPress, onNavigate }) => {
  const { eventId, eventName } = route.params || {};
  const insets = useSafeAreaInsets();
  
  // Show error screen if no eventId
  if (!eventId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          No event selected{'\n'}Please go back and select an event
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 5 }}
        >
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementType[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [messageText, setMessageText] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const replyToRef = useRef<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [reactions, setReactions] = useState<{[messageId: string]: {[emoji: string]: {count: number, reacted: boolean}}}>();
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadErrorModal, setShowUploadErrorModal] = useState(false);
  const [showAttachmentPickerModal, setShowAttachmentPickerModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadAttachment, setDownloadAttachment] = useState<any>(null);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);
  const [showDownloadFailureModal, setShowDownloadFailureModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  
  // Module notification states
  const [showModuleDisplayModal, setShowModuleDisplayModal] = useState(false);
  const [showModuleResponse, setShowModuleResponse] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Handle module notification click
  const handleModuleNotificationClick = (module: any) => {
    setSelectedModule(module);
    setShowModuleResponse(true);
  };

  const scrollToMessage = (messageId: string) => {
    if (scrollViewRef.current) {
      // Find the message index
      const messageIndex = messages.findIndex(m => m.message_id === messageId);
      if (messageIndex !== -1) {
        // Calculate approximate position (rough estimate)
        const estimatedPosition = messageIndex * 120; // Approximate message height
        scrollViewRef.current.scrollTo({ y: estimatedPosition, animated: true });
        
        // Add visual feedback - highlight the message briefly
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 2000); // Remove highlight after 2 seconds
      }
    }
  };
  
  // Action sheet state for mobile long-press
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const bubbleRefs = useRef<{ [key: string]: any }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const reactionsFetched = useRef<boolean>(false);
  
  // Performance optimizations to prevent glitching
  const attachmentCache = useRef<Map<string, any>>(new Map());
  const lastRenderTime = useRef<number>(0);
  const RENDER_DEBOUNCE_MS = 1000; // Minimum 1 second between re-renders
  const [visibleMessageIds, setVisibleMessageIds] = useState<Set<string>>(new Set());
  const visibilityUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {

    if (currentUser && eventId) {
      loadMessages();
      loadAnnouncements();
      loadModules();
      setupSubscription();
      setupAnnouncementsSubscription();
      setupModulesSubscription();
      setupPolling();
    }
    
    // Cleanup function
    return () => {
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (error) {
          console.log('[CHAT] Error cleaning up channel:', error);
        }
      }
      // Clear polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('[MODULES] Polling interval cleared');
      }
      
      // Cleanup performance optimization variables
      attachmentCache.current.clear();
      if (visibilityUpdateTimeout.current) {
        clearTimeout(visibilityUpdateTimeout.current);
      }
    };
  }, [currentUser, eventId]);

  // Auto-scroll to bottom when messages change or screen is focused
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollViewRef.current && messages.length > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    // Scroll to bottom when messages change, but not when loading older messages or in delete mode
    if (messages.length > 0 && !isLoadingOlderMessages && !isDeleteMode) {
      scrollToBottom();
    }

    // Add focus listener
    const unsubscribe = navigation.addListener('focus', () => {
      setTimeout(scrollToBottom, 200);
      // Reload modules when screen is focused
      if (currentUser && eventId) {
        console.log('[FOCUS] Reloading modules on focus');
        loadModules();
      }
    });

    return unsubscribe;
  }, [messages, navigation, isLoadingOlderMessages, isDeleteMode, currentUser, eventId]);

  // Restore reply state if it gets lost during re-renders
  useEffect(() => {
    console.log('[REPLY DEBUG] Reply state changed to:', replyTo ? replyTo.message_text : 'null');
    if (replyToRef.current && !replyTo) {
      console.log('[REPLY DEBUG] Restoring reply state from ref');
      setReplyTo(replyToRef.current);
    }
  }, [replyTo]);

  const loadCurrentUser = async () => {
    try {
      const authResponse = await getCurrentUser();

      if (authResponse.user) {
        // Fetch user data from database to get the name
        const { data: userData, error } = await supabase
          .from('users')
          .select('email, name, avatar_url, company_id')
          .eq('email', authResponse.user.email)
          .single();
        
        if (error) {
          console.error('[DEBUG] Error fetching user data:', error);
          setCurrentUser(authResponse.user);
        } else if (userData) {
          // Create user object with name from database
          const userWithName = {
            ...authResponse.user,
            name: userData.name || authResponse.user.email,
            avatar_url: userData.avatar_url,
            company_id: userData.company_id
          };
          setCurrentUser(userWithName);
        } else {
          setCurrentUser(authResponse.user);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  // Function to enrich messages with avatar URLs for admin users
  const enrichMessagesWithAvatars = async (messages: any[]) => {
    const enrichedMessages = [...messages];
    
    // Get unique admin user emails
    const adminEmails = [...new Set(
      messages
        .filter(msg => msg.sender_type === 'admin')
        .map(msg => msg.sender_email)
    )];
    
    if (adminEmails.length > 0) {
      // Fetch avatar URLs for admin users
      const { data: users, error } = await supabase
        .from('users')
        .select('email, avatar_url')
        .in('email', adminEmails);
      
      if (!error && users) {
        // Create a map of email to avatar_url
        const avatarMap = users.reduce((map: any, user: any) => {
          map[user.email] = user.avatar_url;
          return map;
        }, {});
        
        // Enrich messages with avatar URLs
        enrichedMessages.forEach(msg => {
          if (msg.sender_type === 'admin' && avatarMap[msg.sender_email]) {
            msg.avatar_url = avatarMap[msg.sender_email];
          }
        });
      }
    }
    
    return enrichedMessages;
  };

  const loadOlderMessages = async () => {
    if (!eventId || !currentUser || loadingOlder || !hasMoreMessages) {
      return;
    }
    
    setLoadingOlder(true);
    setIsLoadingOlderMessages(true); // Set flag to prevent auto-scroll
    try {
      // Get the total count of messages to calculate the correct offset
      const { data: countData, error: countError } = await supabase
        .from('guests_chat_messages')
        .select('message_id', { count: 'exact' })
        .eq('event_id', eventId);
      
      if (countError) {
        console.error('Error getting message count:', countError);
        return;
      }
      
      const totalMessages = countData?.length || 0;
      const limit = 50;
      // Calculate offset to get messages older than what we currently have
      const offset = Math.max(0, totalMessages - limit - messages.length);
      
      console.log('📨 Loading older messages - Total:', totalMessages, 'Current messages:', messages.length, 'Offset:', offset);
      
      const { data: messagesData, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: eventId,
        p_user_email: currentUser.email,
        p_limit: limit,
        p_offset: offset,
      });
      
      if (error) {
        console.error('Error loading older messages:', error);
        return;
      }
      
      // Filter out messages we already have
      const existingMessageIds = new Set(messages.map(m => m.message_id));
      const newMessages = messagesData?.filter((msg: any) => !existingMessageIds.has(msg.message_id)) || [];
      
      console.log('📨 New messages found:', newMessages.length);
      
      if (newMessages.length === 0) {
        console.log('📨 No new messages found, setting hasMoreMessages to false');
        setHasMoreMessages(false);
        return;
      }
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(newMessages);
      
      // Add older messages to the beginning
      setMessages(prev => [...enrichedMessages, ...prev]);
      
      // Check if we have more messages to load
      if (newMessages.length < 50) {
        console.log('📨 Less than 50 messages loaded, setting hasMoreMessages to false');
        setHasMoreMessages(false);
      } else {
        console.log('📨 50 messages loaded, keeping hasMoreMessages as true');
      }
    } catch (error) {
      console.error('Error in loadOlderMessages:', error);
    } finally {
      setLoadingOlder(false);
      setIsLoadingOlderMessages(false); // Reset flag to allow auto-scroll
    }
  };

  const loadAnnouncements = async () => {
    try {
      console.log('[ANNOUNCEMENTS] Loading announcements for eventId:', eventId);
      
      // Initialize the announcement service
      await announcementService.initialize();
      
      const announcementsData = await announcementService.getAnnouncements(eventId);
      console.log('[ANNOUNCEMENTS] Raw announcements data:', announcementsData);
      setAnnouncements(announcementsData);
      console.log('[ANNOUNCEMENTS] Loaded announcements:', announcementsData.length);
    } catch (error) {
      console.error('[ANNOUNCEMENTS] Error loading announcements:', error);
    }
  };

  const loadModules = async () => {
    try {
      console.log('[MODULES] Loading all timeline modules for eventId:', eventId);
      
      // Admin view shows all modules for the event
      const { data, error } = await supabase
        .from('timeline_modules')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MODULES] Error loading modules:', error);
      } else {
        console.log('[MODULES] Loaded all modules:', data);
        console.log('[MODULES] Modules count:', data?.length || 0);
        setModules(data || []);
      }
    } catch (error) {
      console.error('[MODULES] Error loading modules:', error);
    }
  };

  const setupAnnouncementsSubscription = () => {
    try {
      announcementService.subscribeToAnnouncements(eventId, (newAnnouncement: AnnouncementType) => {
        console.log('[ANNOUNCEMENTS] New announcement received:', newAnnouncement);
        setAnnouncements(prev => [...prev, newAnnouncement]);
      });
    } catch (error) {
      console.error('[ANNOUNCEMENTS] Error setting up subscription:', error);
    }
  };

  const setupModulesSubscription = () => {
    try {
      const channel = supabase
        .channel('modules_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_modules',
            filter: `event_id=eq.${eventId}`
          },
          (payload) => {
            console.log('[MODULES] Module change detected:', payload);
            if (payload.eventType === 'INSERT') {
              console.log('[MODULES] New module received:', payload.new);
              setModules(prev => [payload.new, ...prev]);
            } else if (payload.eventType === 'DELETE') {
              console.log('[MODULES] Module deleted:', payload.old);
              setModules(prev => prev.filter(module => module.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
              console.log('[MODULES] Module updated:', payload.new);
              setModules(prev => prev.map(module => 
                module.id === payload.new.id ? payload.new : module
              ));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('[MODULES] Error setting up subscription:', error);
    }
  };

  const setupPolling = () => {
    if (!eventId) {
      return;
    }
    
    // Poll every 15 seconds for new modules (reduced frequency to prevent glitching)
    const pollInterval = setInterval(async () => {
      try {
        // Poll for new modules
        const { data: newModules, error: modulesError } = await supabase
          .from('timeline_modules')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        if (!modulesError && newModules) {
          setModules(prev => {
            // Check for new modules that aren't already in state
            const existingIds = new Set(prev.map(module => module.id));
            const trulyNewModules = newModules.filter(module => !existingIds.has(module.id));
            
            if (trulyNewModules.length > 0) {
              console.log('[MODULES] Polling found new modules:', trulyNewModules.length);
              
              // Debounce rapid re-renders
              const now = Date.now();
              if (now - lastRenderTime.current < RENDER_DEBOUNCE_MS) {
                console.log('[MODULES] Debouncing render, too soon since last update');
                return prev; // Return same reference to prevent re-render
              }
              lastRenderTime.current = now;
              
              const updated = [...prev, ...trulyNewModules];
              return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
            
            return prev;
          });
        }
      } catch (error) {
        // Silent error handling
      }
    }, 2000); // Poll every 2 seconds for modules

    // Store the interval ID so we can clear it later
    setPollingInterval(pollInterval);
  };

  const loadMessages = async (isRefresh = false) => {
    if (!eventId) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      
      // First, get the total count of messages to calculate the correct offset
      const { data: countData, error: countError } = await supabase
        .from('guests_chat_messages')
        .select('message_id', { count: 'exact' })
        .eq('event_id', eventId);
      
      if (countError) {
        console.error('Error getting message count:', countError);
        return;
      }
      
      const totalMessages = countData?.length || 0;
      const limit = 100;
      const offset = Math.max(0, totalMessages - limit); // Get the last 100 messages
      
      const { data, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: eventId,
        p_user_email: currentUser?.email || '',
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(data || []);
      setMessages(enrichedMessages);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      setIsLoading(false);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  // Load reactions for all messages
  const fetchReactions = async () => {
    if (!messages.length || !currentUser) return;
    
          const messageIds = messages.map(m => m.message_id);
      
      const { data, error } = await supabase
        .rpc('get_guests_chat_reactions_unified', {
          p_event_id: eventId,
          p_user_email: currentUser.email,
          p_message_ids: messageIds
        });
    
    if (error) {
      console.error('[GUESTS_CHAT] Error fetching reactions:', error);
      return;
    }
    
    // Group by message and emoji
    const reactionMap: { [messageId: string]: { [emoji: string]: { count: number, reacted: boolean } } } = {};
    for (const m of messages) {
      reactionMap[m.message_id] = {};
    }
    
    console.log('[REACTION DEBUG] Raw reaction data received:', data.length, 'reactions');
    console.log('[REACTION DEBUG] Sample reactions:', data.slice(0, 3).map(r => ({ msg: r.message_id.substring(0, 8), user: r.user_email, emoji: r.emoji })));
    
    data.forEach((row: any) => {
      if (!reactionMap[row.message_id][row.emoji]) {
        reactionMap[row.message_id][row.emoji] = { count: 0, reacted: false };
      }
      reactionMap[row.message_id][row.emoji].count++;
      if (row.user_email === currentUser.email) {
        reactionMap[row.message_id][row.emoji].reacted = true;
      }
    });
    
    console.log('[REACTION DEBUG] Processed reaction map:', Object.keys(reactionMap).length, 'messages with reactions');
    
    setReactions(reactionMap);
  };

  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !currentUser || !eventId) return;

    const textToSend = messageText.trim();
    setMessageText(''); // Clear input immediately
    
    let attachment = null;
    
    // Upload file if selected
    if (selectedFile) {
      setUploading(true);
      try {
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Determine proper MIME type from file extension
        let mimeType = selectedFile.type;
        
        // Handle image files
        if (fileExt === 'jpg' || fileExt === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (fileExt === 'png') {
          mimeType = 'image/png';
        } else if (fileExt === 'gif') {
          mimeType = 'image/gif';
        } else if (fileExt === 'webp') {
          mimeType = 'image/webp';
        } else if (fileExt === 'svg') {
          mimeType = 'image/svg+xml';
        } else if (fileExt === 'bmp') {
          mimeType = 'image/bmp';
        } else if (fileExt === 'tiff' || fileExt === 'tif') {
          mimeType = 'image/tiff';
        }
        // Handle video files
        else if (fileExt === 'mp4') {
          mimeType = 'video/mp4';
        } else if (fileExt === 'mpeg' || fileExt === 'mpg') {
          mimeType = 'video/mpeg';
        } else if (fileExt === 'mov') {
          mimeType = 'video/quicktime';
        } else if (fileExt === 'avi') {
          mimeType = 'video/x-msvideo';
        } else if (fileExt === 'wmv') {
          mimeType = 'video/x-ms-wmv';
        } else if (fileExt === 'webm') {
          mimeType = 'video/webm';
        } else if (fileExt === 'ogv') {
          mimeType = 'video/ogg';
        }
        // Handle audio files
        else if (fileExt === 'mp3') {
          mimeType = 'audio/mpeg';
        } else if (fileExt === 'wav') {
          mimeType = 'audio/wav';
        } else if (fileExt === 'ogg') {
          mimeType = 'audio/ogg';
        } else if (fileExt === 'm4a') {
          mimeType = 'audio/m4a';
        } else if (fileExt === 'aac') {
          mimeType = 'audio/aac';
        } else if (fileExt === 'flac') {
          mimeType = 'audio/flac';
        }
        // Handle document files
        else if (fileExt === 'pdf') {
          mimeType = 'application/pdf';
        } else if (fileExt === 'doc') {
          mimeType = 'application/msword';
        } else if (fileExt === 'docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (fileExt === 'xls') {
          mimeType = 'application/vnd.ms-excel';
        } else if (fileExt === 'xlsx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (fileExt === 'ppt') {
          mimeType = 'application/vnd.ms-powerpoint';
        } else if (fileExt === 'pptx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        } else if (fileExt === 'csv') {
          mimeType = 'text/csv';
        } else if (fileExt === 'txt') {
          mimeType = 'text/plain';
        } else if (fileExt === 'html' || fileExt === 'htm') {
          mimeType = 'text/html';
        } else if (fileExt === 'css') {
          mimeType = 'text/css';
        } else if (fileExt === 'js') {
          mimeType = 'text/javascript';
        } else if (fileExt === 'json') {
          mimeType = 'application/json';
        } else if (fileExt === 'xml') {
          mimeType = 'application/xml';
        } else if (fileExt === 'rtf') {
          mimeType = 'application/rtf';
        } else if (fileExt === 'tex') {
          mimeType = 'application/x-tex';
        } else if (fileExt === 'md' || fileExt === 'markdown') {
          mimeType = 'text/markdown';
        } else if (fileExt === 'yaml' || fileExt === 'yml') {
          mimeType = 'application/x-yaml';
        }
        // Handle archive files
        else if (fileExt === 'zip') {
          mimeType = 'application/zip';
        } else if (fileExt === 'rar') {
          mimeType = 'application/x-rar-compressed';
        } else if (fileExt === '7z') {
          mimeType = 'application/x-7z-compressed';
        } else if (fileExt === 'gz') {
          mimeType = 'application/gzip';
        } else if (fileExt === 'tar') {
          mimeType = 'application/x-tar';
        }
        // Fallback for other file types
        else if (mimeType === 'image') {
          mimeType = 'image/jpeg'; // default for generic image type
        } else if (mimeType === 'video') {
          mimeType = 'video/mp4'; // default for generic video type
        } else if (mimeType === 'audio') {
          mimeType = 'audio/mpeg'; // default for generic audio type
        }
        
        console.log('[UPLOAD DEBUG] Starting upload for file:', selectedFile.name);
        console.log('[UPLOAD DEBUG] File URI:', selectedFile.uri);
        console.log('[UPLOAD DEBUG] File type:', selectedFile.type);
        console.log('[UPLOAD DEBUG] File size:', selectedFile.size);
        
        // Use the PROVEN working approach from TimelineScreen
        console.log('[UPLOAD DEBUG] Using TimelineScreen upload method...');
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        console.log('[UPLOAD DEBUG] Calling guest-upload-image Edge Function...');
        console.log('[UPLOAD DEBUG] Edge Function URL: https://ijsktwmevnqgzwwuggkf.functions.supabase.co/guest-upload-image');
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          const response = await fetch('https://ijsktwmevnqgzwwuggkf.functions.supabase.co/guest-upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'apikey': supabaseAnonKey
            },
            body: JSON.stringify({
              guest_id: 'chat-upload',
              module_id: 'chat-media',
              event_id: eventId,
              file_base64: base64,
              file_type: mimeType,
              upload_type: 'chat' // This tells the Edge Function to upload to chat-attachments bucket
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[UPLOAD DEBUG] Edge Function error:', response.status, errorText);
            throw new Error(`Edge Function failed: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('[UPLOAD DEBUG] Edge Function success:', result);
          
          // Create attachment object with the correct URL
          attachment = {
            url: result.url,
            filename: selectedFile.name,
            type: mimeType,
            size: selectedFile.size
          };
          
          console.log('[ATTACHMENT DEBUG] Created attachment object:', attachment);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Upload timeout - request took too long');
          }
          throw fetchError;
        }
        
      } catch (error) {
        console.error('File upload failed:', error);
        setShowUploadErrorModal(true);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Create optimistic message
    console.log('[SEND DEBUG] Current user data:', {
      email: currentUser.email,
      name: currentUser.name,
      fallback: currentUser.name || currentUser.email
    });
    const optimisticMessage: Message = {
      message_id: `temp-${Date.now()}`,
      event_id: eventId,
      sender_email: currentUser.email,
      sender_name: currentUser.name || currentUser.email,
      sender_type: 'admin',
      avatar_url: currentUser.avatar_url,
      message_text: textToSend, // Only send the actual text, not the attachment URL
      message_type: attachment ? 'file' : 'text',
      created_at: new Date().toISOString(),
      company_id: currentUser.company_id,
      is_edited: false,
      reply_to_message_id: replyTo?.message_id,
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      console.log('[SEND DEBUG] Calling send_guests_chat_message with params:', {
        p_event_id: eventId,
        p_sender_email: currentUser.email,
        p_message_text: textToSend, // Always send the text, even with attachments
        p_message_type: attachment ? 'file' : 'text',
        p_reply_to_message_id: replyTo?.message_id || null
      });
      
      const { data, error } = await supabase.rpc('send_guests_chat_message', {
        p_event_id: eventId,
        p_sender_email: currentUser.email,
        p_message_text: textToSend, // Always send the text, even with attachments
        p_message_type: attachment ? 'file' : 'text',
        p_reply_to_message_id: replyTo?.message_id || null
      });

      console.log('[SEND DEBUG] send_guests_chat_message response:', { data, error });

      if (error) {
        console.error('[GUESTS_CHAT] Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
        setMessageText(textToSend); // Restore message text
        return;
      }

            // Replace optimistic message with real message
      console.log('[SEND DEBUG] Data structure:', data);
      
      // Handle both array and object responses
      const realMessage = Array.isArray(data) ? data[0] : data;
      
      if (realMessage) {
        console.log('[SEND DEBUG] Real message received:', realMessage);
        
        // The RPC response doesn't have all fields, so we need to add them
        const completeMessage = {
          ...realMessage,
          sender_email: currentUser.email,
          message_text: textToSend, // Only send the actual text, not the attachment URL
          message_type: attachment ? 'file' : 'text',
          company_id: currentUser.company_id,
          is_edited: false,
          edited_at: null,
          reply_to_message_id: replyTo?.message_id || null,
          reactions: []
        };
        
        // Store attachment in the proper attachments table
        if (attachment) {
          console.log('[SEND DEBUG] Storing attachment in database');
          try {
            const { error: insertError } = await supabase.rpc('add_message_attachment', {
              p_message_id: realMessage.message_id,
              p_file_url: attachment.url,
              p_filename: attachment.filename,
              p_file_type: attachment.type,
              p_file_size: attachment.size || 0
            });
            if (insertError) throw insertError;

            // Immediately attach to local message for instant render
            setMessages(prev => prev.map(msg =>
              msg.message_id === realMessage.message_id
                ? { ...msg, attachment_url: attachment.url, attachment_filename: attachment.filename, attachment_type: attachment.type }
                : msg
            ));

            // activity: admin shared attachment
            insertActivityLogMobile({
              company_id: currentUser.company_id,
              user_id: currentUser.id,
              event_id: eventId,
              action: 'chat_attachment',
              summary: `${currentUser.name || 'Admin'} shared a ${attachment.type.startsWith('image/') ? 'photo' : attachment.type.startsWith('video/') ? 'video' : 'file'}`,
              meta: { filename: attachment.filename }
            });
          } catch (insertError) {
            console.error('[SEND DEBUG] Error storing attachment:', insertError);
          }
        }

        // Replace optimistic message
        setMessages(prev => prev.map(msg => msg.message_id === optimisticMessage.message_id ? completeMessage : msg));

        // activity: admin sent message
        insertActivityLogMobile({
          company_id: currentUser.company_id,
          user_id: currentUser.id,
          event_id: eventId,
          action: 'chat_message',
          summary: `${currentUser.name || 'Admin'} sent a message`,
          meta: { preview: textToSend.slice(0, 80) }
        });
      }

      console.log('[REPLY DEBUG] Clearing replyTo after sending message');
      setReplyTo(null);
      replyToRef.current = null;
      setSelectedFile(null); // Clear selected file
    } catch (error) {
      console.error('[GUESTS_CHAT] Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
      setMessageText(textToSend); // Restore message text
    }
  };

  const setupSubscription = () => {
    if (!eventId) return;

    console.log('[SUBSCRIPTION DEBUG] Setting up subscription for eventId:', eventId);
    console.log('[SUBSCRIPTION DEBUG] Current user:', currentUser?.email);

    const ch = supabase.channel(`guests-chat-admin-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guests_chat_messages',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {

        
        if (payload.eventType === 'DELETE') {
          // Remove deleted message
          setMessages(prev => {
            const filtered = prev.filter(msg => msg.message_id !== payload.old.message_id);

            return filtered;
          });
          
        } else if (payload.eventType === 'UPDATE') {
          // Update existing message
          setMessages(prev => prev.map(msg => 
            msg.message_id === payload.new.message_id 
              ? { ...msg, ...payload.new }
              : msg
          ));
          
        } else if (payload.eventType === 'INSERT') {
          console.log('📨 New message received:', payload.new);
          // Add new message to existing state instead of reloading all messages
          const newMessage = payload.new as Message;
          
          console.log('[SUBSCRIPTION DEBUG] Message sender_email:', newMessage.sender_email);
          console.log('[SUBSCRIPTION DEBUG] Current user email:', currentUser?.email);
          console.log('[SUBSCRIPTION DEBUG] Emails match:', newMessage.sender_email === currentUser?.email);
          
          // Skip messages from current user to avoid duplicates with optimistic updates
          if (newMessage.sender_email === currentUser?.email) {
            console.log('[SUBSCRIPTION DEBUG] Skipping message from current user:', newMessage.message_id.substring(0, 8));
            return;
          }
          
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.message_id === newMessage.message_id);
            console.log('[SUBSCRIPTION DEBUG] Message exists check:', exists, 'for message:', newMessage.message_id.substring(0, 8));
            if (exists) return prev;
            
            // Debounce rapid re-renders
            const now = Date.now();
            if (now - lastRenderTime.current < RENDER_DEBOUNCE_MS) {
              console.log('[SUBSCRIPTION] Debouncing render, too soon since last update');
              return prev; // Return same reference to prevent re-render
            }
            lastRenderTime.current = now;
            
            // Add new message and sort by created_at
            const updated = [...prev, newMessage];
            return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guests_chat_reactions',
      }, (payload) => {
        console.log('[REACTION REALTIME] Reaction change detected:', payload.eventType, 'for message:', payload.new?.message_id || payload.old?.message_id);
        
        // Update reactions state directly based on the specific change
        setReactions(prevReactions => {
          const newReactions = { ...prevReactions };
          const messageId = payload.new?.message_id || payload.old?.message_id;
          
          if (!messageId) return prevReactions;
          
          // Ensure message exists in reactions
          if (!newReactions[messageId]) {
            newReactions[messageId] = {};
          }
          
          if (payload.eventType === 'INSERT') {
            // Add new reaction
            const { emoji, user_email } = payload.new;
            if (!newReactions[messageId][emoji]) {
              newReactions[messageId][emoji] = { count: 0, reacted: false };
            }
            newReactions[messageId][emoji].count++;
            if (user_email === currentUser?.email) {
              newReactions[messageId][emoji].reacted = true;
            }
            console.log('[REACTION REALTIME] Added reaction:', emoji, 'to message:', messageId.substring(0, 8));
          } else if (payload.eventType === 'DELETE') {
            // Remove reaction
            const { emoji, user_email } = payload.old;
            if (newReactions[messageId][emoji]) {
              newReactions[messageId][emoji].count--;
              if (user_email === currentUser?.email) {
                newReactions[messageId][emoji].reacted = false;
              }
              // Remove emoji if count reaches 0
              if (newReactions[messageId][emoji].count <= 0) {
                delete newReactions[messageId][emoji];
              }
            }
            console.log('[REACTION REALTIME] Removed reaction:', emoji, 'from message:', messageId.substring(0, 8));
          } else if (payload.eventType === 'UPDATE') {
            // Handle reaction update (emoji change)
            const newEmoji = payload.new?.emoji;
            const user_email = payload.new?.user_email;
            
            // For UPDATE events, we need to clear ALL existing reactions for this user
            // and then add the new one (since we can't reliably get the old emoji)
            if (user_email === currentUser?.email) {
              // Remove all existing reactions for current user on this message
              Object.keys(newReactions[messageId]).forEach(emoji => {
                if (newReactions[messageId][emoji].reacted) {
                  newReactions[messageId][emoji].count--;
                  newReactions[messageId][emoji].reacted = false;
                  if (newReactions[messageId][emoji].count <= 0) {
                    delete newReactions[messageId][emoji];
                  }
                }
              });
            }
            // Note: For other users' updates, we just add the new emoji
            // Any stale emoji counts will be corrected on next message load
            
            // Add new emoji
            if (newEmoji) {
              if (!newReactions[messageId][newEmoji]) {
                newReactions[messageId][newEmoji] = { count: 0, reacted: false };
              }
              newReactions[messageId][newEmoji].count++;
              if (user_email === currentUser?.email) {
                newReactions[messageId][newEmoji].reacted = true;
              }
            }
            console.log('[REACTION REALTIME] Updated reaction to:', newEmoji, 'for message:', messageId.substring(0, 8));
          }
          
          return newReactions;
        });
      })
      .subscribe();

    console.log('[SUBSCRIPTION DEBUG] Subscription subscribed successfully');
    setChannel(ch);
  };

  const handleLongPress = (message: Message) => {
    console.log('[LONG PRESS DEBUG] Long press detected for message:', message.message_text);
    console.log('[LONG PRESS DEBUG] Message sender_name:', message.sender_name);
    console.log('[LONG PRESS DEBUG] Message sender_email:', message.sender_email);
    console.log('[LONG PRESS DEBUG] Full message object:', JSON.stringify(message, null, 2));
    setSelectedMessage(message);
    setShowActionSheet(true);
  };

  useEffect(() => {
    if (currentUser && eventId) {
      console.log('🔍 Screen focused, reloading messages and modules');
      loadMessages();
      loadModules();
    }
  }, [currentUser, eventId]);

  // Load reactions when messages change
  useEffect(() => {
    // Always fetch reactions when messages change - real-time subscription handles updates for new reactions
    if (messages.length > 0 && currentUser && !reactionsFetched.current) {
      fetchReactions();
      reactionsFetched.current = true;
    }
  }, [messages, currentUser]); // Don't include reactions to prevent race condition

  const deleteMessage = async (message: Message) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('guests_chat_messages')
        .delete()
        .eq('message_id', message.message_id);

      if (error) {
        console.error('Error deleting message:', error);
        return;
      }

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.message_id !== message.message_id));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('guests_chat_messages')
        .update({
          message_text: newText,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('message_id', messageId);

      if (error) {
        console.error('Error editing message:', error);
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.message_id === messageId 
          ? { ...msg, message_text: newText, is_edited: true, edited_at: new Date().toISOString() }
          : msg
      ));

      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    
    try {
      // Always call the add function - it will handle toggling internally
      const { data, error } = await supabase.rpc('add_guests_chat_reaction_unified', {
        p_message_id: messageId,
        p_event_id: eventId,
        p_user_email: currentUser.email,
        p_emoji: emoji
      });
      
      if (error) {
        console.error('Error handling reaction:', error);
      }
      
      // Real-time subscription will handle the UI update
      
    } catch (error) {
      console.error('Exception handling reaction:', error);
    }
  };

  const handleAttachmentPress = async () => {
    console.log('[ATTACHMENT PICKER DEBUG] Opening custom attachment picker modal');
    setShowAttachmentPickerModal(true);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permissions are required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (10MB limit)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'File size must be less than 10MB');
          return;
        }
        
        // Determine proper MIME type from file extension
        let mimeType = asset.type || 'image/jpeg';
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        
        // Handle image files
        if (fileExt === 'jpg' || fileExt === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (fileExt === 'png') {
          mimeType = 'image/png';
        } else if (fileExt === 'gif') {
          mimeType = 'image/gif';
        } else if (fileExt === 'webp') {
          mimeType = 'image/webp';
        } else if (fileExt === 'svg') {
          mimeType = 'image/svg+xml';
        } else if (fileExt === 'bmp') {
          mimeType = 'image/bmp';
        } else if (fileExt === 'tiff' || fileExt === 'tif') {
          mimeType = 'image/tiff';
        }
        // Fallback for other file types
        else if (mimeType === 'image') {
          mimeType = 'image/jpeg'; // default for generic image type
        }
        
        console.log('[PICK IMAGE DEBUG] Asset:', {
          uri: asset.uri,
          fileName: fileName,
          originalType: asset.type,
          fileExt: fileExt,
          finalMimeType: mimeType,
          fileSize: asset.fileSize
        });
        
        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
          size: asset.fileSize || 0
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (10MB limit)
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'File size must be less than 10MB');
          return;
        }
        
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  // Android-specific function for Google Photos
  const pickImageFromGooglePhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permissions are required to select images.');
        return;
      }

      // For Android, this will show the app chooser including Google Photos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (10MB limit)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'File size must be less than 10MB');
          return;
        }
        
        // Determine proper MIME type from file extension
        let mimeType = asset.type || 'image/jpeg';
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        
        // Handle image files
        if (fileExt === 'jpg' || fileExt === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (fileExt === 'png') {
          mimeType = 'image/png';
        } else if (fileExt === 'gif') {
          mimeType = 'image/gif';
        } else if (fileExt === 'webp') {
          mimeType = 'image/webp';
        } else if (fileExt === 'svg') {
          mimeType = 'image/svg+xml';
        } else if (fileExt === 'bmp') {
          mimeType = 'image/bmp';
        } else if (fileExt === 'tiff' || fileExt === 'tif') {
          mimeType = 'image/tiff';
        }
        // Fallback for other file types
        else if (mimeType === 'image') {
          mimeType = 'image/jpeg'; // default for generic image type
        }
        
        console.log('[PICK IMAGE FROM GOOGLE PHOTOS DEBUG] Asset:', {
          uri: asset.uri,
          fileName: fileName,
          originalType: asset.type,
          fileExt: fileExt,
          finalMimeType: mimeType,
          fileSize: asset.fileSize
        });
        
        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
          size: asset.fileSize || 0
        });
      }
    } catch (error) {
      console.error('Error picking image from Google Photos:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Android-specific function for taking photos
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permissions are required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (10MB limit)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'File size must be less than 10MB');
          return;
        }
        
        // Determine proper MIME type from file extension
        let mimeType = asset.type || 'image/jpeg';
        const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        
        // Handle image files
        if (fileExt === 'jpg' || fileExt === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (fileExt === 'png') {
          mimeType = 'image/png';
        } else if (fileExt === 'gif') {
          mimeType = 'image/gif';
        } else if (fileExt === 'webp') {
          mimeType = 'image/webp';
        } else if (fileExt === 'svg') {
          mimeType = 'image/svg+xml';
        } else if (fileExt === 'bmp') {
          mimeType = 'image/bmp';
        } else if (fileExt === 'tiff' || fileExt === 'tif') {
          mimeType = 'image/tiff';
        }
        // Fallback for other file types
        else if (mimeType === 'image') {
          mimeType = 'image/jpeg'; // default for generic image type
        }
        
        console.log('[TAKE PHOTO DEBUG] Asset:', {
          uri: asset.uri,
          fileName: fileName,
          originalType: asset.type,
          fileExt: fileExt,
          finalMimeType: mimeType,
          fileSize: asset.fileSize
        });
        
        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
          size: asset.fileSize || 0
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    replyToRef.current = message;
    setShowActionSheet(false);
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.message_id);
    setEditText(message.message_text);
    setShowActionSheet(false);
  };

  const handleDelete = async (message: Message) => {
    try {
      await supabase.rpc('delete_guests_chat_message', {
        p_message_id: message.message_id,
        p_user_email: currentUser.email
      });
      setShowActionSheet(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    if (!isDeleteMode) return;
    
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (!currentUser || selectedMessages.size === 0) return;

    try {
      const messageIds = Array.from(selectedMessages);
      
      // Delete messages from database
      const { error } = await supabase
        .from('guests_chat_messages')
        .delete()
        .in('message_id', messageIds);

      if (error) {
        console.error('Error deleting messages:', error);
        return;
      }

      // Remove from local state
      setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.message_id)));
      
      // Exit delete mode
      setIsDeleteMode(false);
      setSelectedMessages(new Set());
      
      console.log('[BULK DELETE] Successfully deleted', selectedMessages.size, 'messages');
    } catch (error) {
      console.error('Error bulk deleting messages:', error);
    }
  };

  const cancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedMessages(new Set());
  };

  // Attachment Display Component
        const AttachmentDisplay = ({ messageId }: { messageId: string }) => {
      const [attachment, setAttachment] = useState<any>(null);
      const [loading, setLoading] = useState(false); // Changed initial state
      const [showPreview, setShowPreview] = useState(false);
      const [imageLoadError, setImageLoadError] = useState(false);
      const [isVisible, setIsVisible] = useState(false);

      useEffect(() => {
        // Skip fetching for temporary message IDs
        if (messageId.startsWith('temp-')) {
          setLoading(false);
          return;
        }

        // Check cache first
        if (attachmentCache.current.has(messageId)) {
          setAttachment(attachmentCache.current.get(messageId));
          return;
        }

        // Only fetch if visible
        if (!isVisible) {
          return;
        }

        const fetchAttachment = async () => {
        try {
          // First check if there's a data URL in the message text (for backward compatibility)
          const message = messages.find(m => m.message_id === messageId);
          const isDataUrl = message?.message_text?.startsWith('data:');
          
          if (isDataUrl) {
            // Extract file type from data URL
            const dataUrlMatch = message.message_text.match(/^data:([^;]+);base64,/);
            const mimeType = dataUrlMatch ? dataUrlMatch[1] : 'image/jpeg';
            const filename = `attachment_${messageId.substring(0, 8)}.${mimeType.split('/')[1] || 'jpg'}`;
            
            setAttachment({
              file_url: message.message_text,
              file_type: mimeType,
              filename: filename
            });
            setLoading(false);
            return;
          }

          // Check if message has attachment properties directly
          if (message?.attachment_url || message?.attachment_filename) {
            setAttachment({
              file_url: message.attachment_url || message.message_text,
              file_type: message.attachment_type || 'image/jpeg',
              filename: message.attachment_filename || `attachment_${messageId.substring(0, 8)}.jpg`
            });
            setLoading(false);
            return;
          }

          // Otherwise, try to fetch from the proper attachments table
          try {
            const { data, error } = await supabase
              .from('guests_chat_attachments')
              .select('*')
              .eq('message_id', messageId)
              .single();
            
            if (error) {
              // Don't log error if table doesn't exist or no rows found
              if (error.code !== 'PGRST116') {
                console.error('Error fetching attachment:', error);
              }
              return;
            }
            
            if (data) {
              const attachmentData = {
                file_url: data.file_url,
                file_type: data.file_type,
                filename: data.filename
              };
              // Cache the attachment
              attachmentCache.current.set(messageId, attachmentData);
              setAttachment(attachmentData);
            }
          } catch (tableError) {
            // Table might not exist, which is fine
            console.log('Attachments table not accessible, skipping database fetch');
          }
        } catch (error) {
          console.error('Exception fetching data URL:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchAttachment();
    }, [messageId, messages, isVisible]);

    // Check if this message is currently visible
    useEffect(() => {
      setIsVisible(visibleMessageIds.has(messageId));
    }, [messageId, visibleMessageIds]);

    // Don't render anything if loading or no attachment
    if (loading || !attachment) {
      console.log('[ATTACHMENT DISPLAY DEBUG] Not rendering - loading:', loading, 'attachment:', !!attachment);
      return null;
    }

    console.log('[ATTACHMENT DISPLAY DEBUG] Rendering attachment:', {
      file_type: attachment.file_type,
      file_url: attachment.file_url.substring(0, 50) + '...',
      filename: attachment.filename
    });

    const isImage = attachment.file_type?.startsWith('image/');
    const isVideo = attachment.file_type?.startsWith('video/');
    const isAudio = attachment.file_type?.startsWith('audio/');

    console.log('[ATTACHMENT DISPLAY DEBUG] File type checks:', {
      isImage,
      isVideo,
      isAudio,
      file_type: attachment.file_type
    });

    return (
      <>
        <TouchableOpacity 
          style={styles.attachmentContainer}
          onPress={() => setShowPreview(true)}
        >
          {isImage ? (
            <View style={styles.attachmentImageContainer}>
              {!imageLoadError ? (
                <Image 
                  source={{ uri: attachment.file_url }} 
                  style={styles.attachmentImage}
                  resizeMode="cover"
                  onLoad={() => console.log('[IMAGE DEBUG] Image loaded successfully from data URL')}
                  onError={(error) => {
                    console.log('[IMAGE DEBUG] Image failed to load from data URL:', error);
                    setImageLoadError(true);
                  }}
                />
              ) : (
                <View style={styles.attachmentImageFallback}>
                  <Text style={styles.attachmentImageFallbackText}>Image Not Available</Text>
                </View>
              )}
            </View>
          ) : isVideo ? (
            <View style={styles.attachmentVideo}>
              <Text style={styles.attachmentIcon}>🎥</Text>
              <Text style={styles.attachmentText}>{attachment.filename}</Text>
            </View>
          ) : isAudio ? (
            <View style={styles.attachmentAudio}>
              <Text style={styles.attachmentIcon}>🎵</Text>
              <Text style={styles.attachmentText}>{attachment.filename}</Text>
            </View>
          ) : (
            <View style={styles.attachmentFile}>
              <Text style={styles.attachmentIcon}>📄</Text>
              <Text style={styles.attachmentText}>{attachment.filename}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Full Preview Modal */}
        <Modal
          visible={showPreview}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPreview(false)}
        >
          <View style={styles.previewModalOverlay}>
            <View style={styles.previewModalContent}>
              <TouchableOpacity 
                style={styles.previewCloseButton}
                onPress={() => setShowPreview(false)}
              >
                <Text style={styles.previewCloseText}>✕</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.previewDownloadButton}
                onPress={() => {
                  console.log('[DOWNLOAD DEBUG] Download button pressed');
                  setDownloadAttachment(attachment);
                  setShowDownloadModal(true);
                }}
              >
                <Text style={styles.previewDownloadText}>⋮</Text>
              </TouchableOpacity>
              
              {isImage ? (
                <View style={styles.previewImageContainer}>
                  {!imageLoadError ? (
                    <Image 
                      source={{ uri: attachment.file_url }} 
                      style={styles.previewImage}
                      resizeMode="contain"
                      onError={(error) => {
                        console.log('[PREVIEW DEBUG] Image failed to load in preview:', error);
                        setImageLoadError(true);
                      }}
                    />
                  ) : (
                    <View style={styles.previewImageFallback}>
                      <Text style={styles.previewImageFallbackText}>Image Not Available</Text>
                    </View>
                  )}
                </View>
              ) : isVideo ? (
                <View style={styles.previewVideo}>
                  <Text style={styles.previewVideoText}>🎥 Video Preview</Text>
                  <Text style={styles.previewVideoSubtext}>{attachment.filename}</Text>
                </View>
              ) : isAudio ? (
                <View style={styles.previewAudio}>
                  <Text style={styles.previewAudioIcon}>🎵</Text>
                  <Text style={styles.previewAudioText}>{attachment.filename}</Text>
                  <Text style={styles.previewAudioSubtext}>Audio preview not available</Text>
                </View>
              ) : (
                <View style={styles.previewFile}>
                  <Text style={styles.previewFileIcon}>📄</Text>
                  <Text style={styles.previewFileText}>{attachment.filename}</Text>
                  <Text style={styles.previewFileSubtext}>File preview not available</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>


      </>
    );
  };

  const renderReactions = (messageReactions: {[emoji: string]: {count: number, reacted: boolean}}) => {
    if (!messageReactions || Object.keys(messageReactions).length === 0) return null;
    
    const reactionEntries = Object.entries(messageReactions);
    const visibleReactions = reactionEntries.slice(0, 4);
    const hiddenReactions = reactionEntries.slice(4);
    
    return (
      <View style={styles.reactionsContainer}>
        {visibleReactions.map(([emoji, info]) => (
          <View
            key={emoji}
            style={[
              styles.reactionBubble,
              info.reacted && styles.reactionBubbleReacted
            ]}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {info.count > 1 && (
              <Text style={styles.reactionCount}>{info.count}</Text>
            )}
          </View>
        ))}
        {hiddenReactions.length > 0 && (
          <View style={[styles.reactionBubble, styles.reactionBubbleHidden]}>
            <Text style={styles.reactionHiddenText}>+{hiddenReactions.length}</Text>
          </View>
        )}
      </View>
    );
  };



  const renderMessage = (message: Message) => {
    // Check if this message is from the current user
    // If currentUser is not loaded yet, assume it's not the current user's message
    const isCurrentUser = currentUser && message.sender_email === currentUser.email;
    
    const messageReactions = reactions?.[message.message_id] || {};
    const hasReactions = Object.keys(messageReactions).length > 0;
    const isSelected = selectedMessages.has(message.message_id);
    


    return (
      <TouchableOpacity
        key={message.message_id}
        style={[styles.messageContainer, isCurrentUser ? styles.sentMessage : styles.receivedMessage]}
        onLongPress={() => handleLongPress(message)}
        onPress={() => isDeleteMode && isCurrentUser ? toggleMessageSelection(message.message_id) : null}
        activeOpacity={0.8}
      >
        {/* Avatar for received messages (left side) */}
        {!isCurrentUser && (
          <View style={styles.avatar}>
            {message.avatar_url && message.avatar_url.startsWith('http') ? (
              <Image 
                source={{ uri: message.avatar_url }} 
                style={styles.avatarImage}
                onError={(error) => {
                  console.log('[AVATAR ERROR] Failed to load image:', message.avatar_url, error);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {(message.sender_name || '?')?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
        )}



        <View style={[
          styles.messageContentWrapper, 
          isCurrentUser && styles.sentMessageContent
        ]}>
          {/* Reply preview if this is a reply */}
          {message.reply_to_message_id && (
            <TouchableOpacity 
              style={styles.replyPreview}
              onPress={() => scrollToMessage(message.reply_to_message_id!)}
              activeOpacity={0.7}
            >
              <Text style={styles.replyText}>
                {messages.find(m => m.message_id === message.reply_to_message_id)?.message_text || 'Original message not found'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Message bubble */}
          <View style={[
            styles.messageBubble, 
            isCurrentUser ? styles.sentBubble : styles.receivedBubble,
            isDeleteMode && isCurrentUser && isSelected && styles.selectedMessageBorder,
            highlightedMessageId === message.message_id && styles.highlightedMessage
          ]}>
            {/* Attachment display - for file, image, and other attachment messages */}
            {(message.message_type === 'file' || 
              message.message_type === 'image' || 
              message.message_type === 'video' || 
              message.message_type === 'audio' ||
              message.attachment_url ||
              message.attachment_filename) && (
              <AttachmentDisplay messageId={message.message_id} />
            )}
            
            {/* Only show text if there actually is text content - now below attachments */}
            {message.message_text && message.message_text.trim() && (
              <Text style={[
                styles.messageText, 
                isCurrentUser ? styles.sentMessageText : styles.receivedMessageText
              ]}>
                {message.message_text}
              </Text>
            )}
          </View>

          {/* Reactions */}
          {hasReactions && renderReactions(messageReactions)}

          {/* Sender name and timestamp */}
          <View style={[styles.messageInfo, isCurrentUser && styles.sentMessageInfo]}>
            <Text style={styles.senderName}>{message.sender_name || 'Unknown User'}</Text>
            <Text style={styles.messageTime}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {message.is_edited && ' (edited)'}
            </Text>
          </View>
        </View>

        {/* Avatar for sent messages (right side) */}
        {isCurrentUser && (
          <View style={styles.avatar}>
            {message.avatar_url && message.avatar_url.startsWith('http') ? (
              <Image 
                source={{ uri: message.avatar_url }} 
                style={styles.avatarImage}
                onError={(error) => {
                  console.log('[AVATAR ERROR] Failed to load image:', message.avatar_url, error);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {(message.sender_name || '?')?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Action Sheet Modal
  const ActionSheetModal = () => (
    <Modal
      visible={showActionSheet}
      transparent
      animationType="fade"
      onRequestClose={() => setShowActionSheet(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowActionSheet(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheet}>
            {/* Emoji reactions */}
            <Text style={styles.actionSheetTitle}>Add Reaction</Text>
            <View style={styles.emojiGrid}>
              {['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥', '💯', '✨'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => {
                    if (selectedMessage) {
                      handleReaction(selectedMessage.message_id, emoji);
                    }
                    setShowActionSheet(false);
                  }}
                >
                  <Text style={styles.emojiButtonText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => selectedMessage && handleReply(selectedMessage)}
              >
                <Text style={styles.actionButtonText}>Reply</Text>
              </TouchableOpacity>
              
              {selectedMessage?.sender_email === currentUser?.email && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => selectedMessage && handleEdit(selectedMessage)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      if (selectedMessage) {
                        setIsDeleteMode(true);
                        setSelectedMessages(new Set([selectedMessage.message_id]));
                        setShowActionSheet(false);
                      }
                    }}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>


          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Delete Mode Bottom Sheet
  const DeleteModeModal = () => (
    <Modal
      visible={isDeleteMode}
      transparent
      animationType="slide"
      onRequestClose={cancelDeleteMode}
    >
      <View style={[styles.modalOverlay, { pointerEvents: 'box-none' }]}>
        <View style={styles.actionSheet}>
          <View style={styles.deleteModeInfo}>
            <Text style={styles.deleteModeTitle}>Delete Messages</Text>
            <Text style={styles.deleteModeSubtitle}>
              {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <View style={styles.deleteModeActions}>
            <TouchableOpacity
              style={[styles.deleteModeButton, styles.cancelButton]}
              onPress={cancelDeleteMode}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteModeButton, 
                styles.deleteButton,
                selectedMessages.size === 0 && styles.deleteButtonDisabled
              ]}
              onPress={handleBulkDelete}
              disabled={selectedMessages.size === 0}
            >
              <Text style={styles.deleteButtonText}>
                Delete ({selectedMessages.size})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Typing indicator
  const TypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    return (
      <View style={styles.typingIndicator}>
        <Text style={styles.typingText}>
          {typingUsers.length === 1 
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.length} people are typing...`
          }
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader
        title={eventName || 'Admin Chat'}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onMenuPress={onMenuPress || (() => {})}
      />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00bfa5" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <>


          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              // Track visible items for lazy loading attachments
              const { contentOffset, layoutMeasurement } = event.nativeEvent;
              const visibleY = contentOffset.y;
              const screenHeight = layoutMeasurement.height;
              
              // Simple visibility check - if item is within viewport
              const visibleMessageIds = new Set<string>();
              messages.forEach((message, index) => {
                // Estimate position based on index (rough calculation)
                const estimatedPosition = index * 100; // Approximate message height
                if (estimatedPosition >= visibleY - 200 && estimatedPosition <= visibleY + screenHeight + 200) {
                  visibleMessageIds.add(message.message_id);
                }
              });
              
              // Debounce visibility updates
              if (visibilityUpdateTimeout.current) {
                clearTimeout(visibilityUpdateTimeout.current);
              }
              visibilityUpdateTimeout.current = setTimeout(() => {
                setVisibleMessageIds(visibleMessageIds);
              }, 100);
            }}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadMessages(true)}
                tintColor="#00bfa5"
                colors={["#00bfa5"]}
                progressViewOffset={0}
                progressBackgroundColor="transparent"
              />
            }
          >
                        {/* Load Older Messages Button */}
            {messages.length > 0 && hasMoreMessages && (
              <View style={styles.loadOlderContainer}>
                <TouchableOpacity
                  style={[styles.loadOlderButton, loadingOlder && styles.loadOlderButtonDisabled]}
                  onPress={loadOlderMessages}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? (
                    <>
                      <ActivityIndicator size="small" color="#00bfa5" />
                      <Text style={styles.loadOlderText}>Loading...</Text>
                    </>
                  ) : (
                    <Text style={styles.loadOlderText}>Load Older Messages</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}


            
            {(() => {
              // Combine messages, announcements, and modules, then sort by timestamp
              
              
              const allItems = [
                ...messages.map(msg => ({ ...msg, type: 'message' as const })),
                ...announcements.map(ann => ({ ...ann, type: 'announcement' as const })),
                ...modules.map(module => ({ ...module, type: 'module' as const }))
              ];
              
              const sortedItems = allItems.sort((a, b) => {
                const aTime = new Date(a.created_at).getTime();
                const bTime = new Date(b.created_at).getTime();
                return aTime - bTime;
              });
              
              
              
              if (sortedItems.length === 0) {
                return (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>💬</Text>
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptySubtitle}>Start a conversation with your guests</Text>
                  </View>
                );
              }
              
              return sortedItems.map((item, index) => {
                if (item.type === 'message') {
                  return renderMessage(item);
                } else if (item.type === 'announcement') {
                  return (
                    <AnnouncementChatItem 
                      key={item.id}
                      announcement={item} 
                      onPress={() => {
                        console.log('[ANNOUNCEMENT] Pressed:', item.title);
                      }}
                    />
                  );
                } else if (item.type === 'module') {
                  return (
                    <TimelineModuleChatItem 
                      key={item.id}
                      module={item} 
                      onPress={() => {
                        setSelectedModule(item);
                        setShowModuleResponse(true);
                      }}
                    />
                  );
                }
                return null;
              });
            })()}
            <TypingIndicator />
          </ScrollView>
          {showModuleResponse && selectedModule && (
            <ModuleResponseModal
              visible={showModuleResponse}
              module={selectedModule}
              guestId={null as any}
              userId={currentUser?.id}
              eventId={eventId}
              onClose={() => setShowModuleResponse(false)}
            />
          )}

          {/* Reply preview */}
          {replyTo && (
            <View style={styles.replyContainer}>
              <Text style={styles.replyLabel}>Replying to {replyTo.sender_name}</Text>
              <Text style={styles.replyMessage} numberOfLines={1}>
                {replyTo.message_text}
              </Text>
              <TouchableOpacity
                style={styles.cancelReply}
                onPress={() => {
                  setReplyTo(null);
                  replyToRef.current = null;
                }}
              >
                <Text style={styles.cancelReplyText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Edit preview */}
          {editingMessageId && (
            <View style={styles.editContainer}>
              <Text style={styles.editLabel}>Editing message</Text>
              <Text style={styles.editMessage} numberOfLines={1}>
                {messages.find(m => m.message_id === editingMessageId)?.message_text || 'Original message not found'}
              </Text>
              <TouchableOpacity
                style={styles.cancelEdit}
                onPress={() => {
                  setEditingMessageId(null);
                  setEditText('');
                }}
              >
                <Text style={styles.cancelEditText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Delete Mode Popup */}
          {isDeleteMode && (
            <View style={styles.deleteModePopup}>
              <View style={styles.deleteModeInfo}>
                <Text style={styles.deleteModeTitle}>Delete Messages</Text>
                <Text style={styles.deleteModeSubtitle}>
                  {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
                </Text>
              </View>
              <View style={styles.deleteModeActions}>
                <TouchableOpacity
                  style={[styles.deleteModeButton, styles.cancelButton]}
                  onPress={cancelDeleteMode}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteModeButton, 
                    styles.deleteButton,
                    selectedMessages.size === 0 && styles.deleteButtonDisabled
                  ]}
                  onPress={handleBulkDelete}
                  disabled={selectedMessages.size === 0}
                >
                  <Text style={styles.deleteButtonText}>
                    Delete ({selectedMessages.size})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* File Preview */}
          {selectedFile && (
            <View style={styles.filePreview}>
              <View style={styles.filePreviewContent}>

                {selectedFile.type?.startsWith('image/') ? (
                  <Image 
                    source={{ uri: selectedFile.uri }} 
                    style={styles.filePreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.fileIcon}>
                    <MaterialCommunityIcons 
                      name="file" 
                      size={24} 
                      color="#00bfa5" 
                    />
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => setSelectedFile(null)}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Message input */}
                     <KeyboardAvoidingView
             behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
             style={[styles.inputContainer, { paddingBottom: Math.max(24, insets?.bottom || 0) }]}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={editingMessageId ? editText : messageText}
                onChangeText={editingMessageId ? setEditText : setMessageText}
                placeholder={editingMessageId ? "Edit your message..." : selectedFile ? "Add a caption (optional)..." : "Type a message..."}
                placeholderTextColor="#666"
                multiline
                maxLength={1000}
                editable={!uploading}
              />
              
              {/* Attachment Button */}
              <TouchableOpacity
                style={[styles.attachButton, uploading && styles.attachButtonDisabled]}
                onPress={handleAttachmentPress}
                disabled={uploading}
              >
                <MaterialCommunityIcons 
                  name="attachment" 
                  size={20} 
                  color={uploading ? "#333" : "#666"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.sendButton, ((editingMessageId ? editText.trim() : messageText.trim()) || selectedFile) && !uploading && styles.sendButtonActive]}
                onPress={editingMessageId ? () => editMessage(editingMessageId, editText) : sendMessage}
                disabled={(!((editingMessageId ? editText.trim() : messageText.trim()) || selectedFile)) || uploading}
              >
                <MaterialCommunityIcons 
                  name={editingMessageId ? "check" : "send"} 
                  size={20} 
                  color={(editingMessageId ? editText.trim() : messageText.trim()) ? "#fff" : "#666"} 
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      <ActionSheetModal />
      
      {/* Module Display Modal */}
      <Modal
        visible={showModuleDisplayModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModuleDisplayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.moduleDisplayContent}>
            {selectedModule && (
              <ModuleDisplay 
                module={selectedModule} 
                onClose={() => setShowModuleDisplayModal(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Attachment Picker Modal */}
      <Modal
        visible={showAttachmentPickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachmentPickerModal(false)}
      >
        <View style={styles.attachmentPickerModalOverlay}>
          <View style={styles.attachmentPickerModalContent}>
            <View style={styles.attachmentPickerModalHeader}>
              <Text style={styles.attachmentPickerModalTitle}>Select Attachment</Text>
              <TouchableOpacity 
                onPress={() => setShowAttachmentPickerModal(false)}
                style={styles.attachmentPickerModalCloseButton}
              >
                <Text style={styles.attachmentPickerModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.attachmentPickerModalBody}>
              <Text style={styles.attachmentPickerModalText}>
                Choose how you want to add an attachment
              </Text>
            </View>
            
            <View style={styles.attachmentPickerModalActions}>
              {Platform.OS === 'android' ? (
                // Android: Show separate options for different gallery apps
                <>
                  <TouchableOpacity 
                    style={styles.attachmentPickerModalButton}
                    onPress={async () => {
                      console.log('[ATTACHMENT PICKER DEBUG] Gallery button pressed (Android)');
                      setShowAttachmentPickerModal(false);
                      setTimeout(() => {
                        pickImage();
                      }, 100);
                    }}
                  >
                    <Text style={styles.attachmentPickerModalButtonText}>Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.attachmentPickerModalButton}
                    onPress={async () => {
                      console.log('[ATTACHMENT PICKER DEBUG] Google Photos button pressed (Android)');
                      setShowAttachmentPickerModal(false);
                      setTimeout(() => {
                        pickImageFromGooglePhotos();
                      }, 100);
                    }}
                  >
                    <Text style={styles.attachmentPickerModalButtonText}>Google Photos</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.attachmentPickerModalButton}
                    onPress={async () => {
                      console.log('[ATTACHMENT PICKER DEBUG] Camera button pressed (Android)');
                      setShowAttachmentPickerModal(false);
                      setTimeout(() => {
                        takePhoto();
                      }, 100);
                    }}
                  >
                    <Text style={styles.attachmentPickerModalButtonText}>Camera</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // iOS: Show combined option (iOS handles app selection automatically)
                <TouchableOpacity 
                  style={styles.attachmentPickerModalButton}
                  onPress={async () => {
                    console.log('[ATTACHMENT PICKER DEBUG] Camera/Gallery button pressed (iOS)');
                    setShowAttachmentPickerModal(false);
                    setTimeout(() => {
                      pickImage();
                    }, 100);
                  }}
                >
                  <Text style={styles.attachmentPickerModalButtonText}>Camera/Gallery</Text>
                </TouchableOpacity>
              )}
                
                <TouchableOpacity 
                  style={styles.attachmentPickerModalButton}
                  onPress={async () => {
                    console.log('[ATTACHMENT PICKER DEBUG] Document button pressed');
                    setShowAttachmentPickerModal(false);
                    // Add a small delay to ensure modal is closed before opening native picker
                    setTimeout(() => {
                      pickDocument();
                    }, 100);
                  }}
                >
                  <Text style={styles.attachmentPickerModalButtonText}>Document</Text>
                </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.attachmentPickerModalCancelButton}
                onPress={() => setShowAttachmentPickerModal(false)}
              >
                <Text style={styles.attachmentPickerModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Download Modal */}
      <Modal
        visible={showDownloadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDownloadModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.downloadModalOverlay}>
          <View style={styles.downloadModalContent}>
            <View style={styles.downloadModalHeader}>
              <Text style={styles.downloadModalTitle}>Download File</Text>
              <TouchableOpacity 
                onPress={() => setShowDownloadModal(false)}
                style={styles.downloadModalCloseButton}
              >
                <Text style={styles.downloadModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.downloadModalBody}>
              <Text style={styles.downloadModalText}>
                Download {downloadAttachment?.filename} to your device?
              </Text>
            </View>
            
            <View style={styles.downloadModalActions}>
              <TouchableOpacity 
                style={styles.downloadModalCancelButton}
                onPress={() => setShowDownloadModal(false)}
              >
                <Text style={styles.downloadModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.downloadModalDownloadButton}
                onPress={() => {
                  // Download function - simulate success for now
                  setShowDownloadModal(false);
                  setTimeout(() => {
                    setShowDownloadSuccessModal(true);
                  }, 100);
                }}
              >
                <Text style={styles.downloadModalDownloadText}>Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Download Success Modal */}
      <Modal
        visible={showDownloadSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDownloadSuccessModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.downloadModalOverlay}>
          <View style={styles.downloadModalContent}>
            <View style={styles.downloadModalHeader}>
              <Text style={styles.downloadModalTitle}>Success</Text>
              <TouchableOpacity 
                onPress={() => setShowDownloadSuccessModal(false)}
                style={styles.downloadModalCloseButton}
              >
                <Text style={styles.downloadModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.downloadModalBody}>
              <Text style={styles.downloadModalText}>
                File downloaded successfully!
              </Text>
            </View>
            
            <View style={styles.downloadModalActions}>
              <TouchableOpacity 
                style={styles.downloadModalDownloadButton}
                onPress={() => setShowDownloadSuccessModal(false)}
              >
                <Text style={styles.downloadModalDownloadText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Download Failure Modal */}
      <Modal
        visible={showDownloadFailureModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDownloadFailureModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.downloadModalOverlay}>
          <View style={styles.downloadModalContent}>
            <View style={styles.downloadModalHeader}>
              <Text style={styles.downloadModalTitle}>Download Failed</Text>
              <TouchableOpacity 
                onPress={() => setShowDownloadFailureModal(false)}
                style={styles.downloadModalCloseButton}
              >
                <Text style={styles.downloadModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.downloadModalBody}>
              <Text style={styles.downloadModalText}>
                Failed to download file. Please try again.
              </Text>
            </View>
            
            <View style={styles.downloadModalActions}>
              <TouchableOpacity 
                style={styles.downloadModalDownloadButton}
                onPress={() => setShowDownloadFailureModal(false)}
              >
                <Text style={styles.downloadModalDownloadText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
    marginTop: 4,
  },
  checkmarkSelected: {
    backgroundColor: '#00bfa5',
    borderRadius: 12,
  },
  checkmark: {
    fontSize: 16,
    color: '#666',
  },
  checkmarkSelectedText: {
    color: '#fff',
  },
  checkmarkRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkmarkRingSelected: {
    backgroundColor: 'transparent',
  },
  checkmarkInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00bfa5',
  },
  selectedMessageBorder: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
  },
  deleteModeContainer: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  deleteModeModal: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  deleteModePopup: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  deleteModeHeader: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  deleteModeInfo: {
    marginBottom: 12,
  },
  deleteModeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  deleteModeSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  deleteModeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#404040',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00bfa5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    marginTop: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContentWrapper: {
    maxWidth: '75%',
    alignItems: 'flex-start',
  },
  sentMessageContent: {
    alignItems: 'flex-end',
  },
  replyPreview: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#00bfa5',
    // Make it look more interactive
    borderWidth: 1,
    borderColor: 'rgba(0,191,165,0.3)',
  },
  replyText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
    // Make it clear it's clickable
    textDecorationLine: 'underline',
    textDecorationColor: '#00bfa5',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  sentBubble: {
    backgroundColor: '#00bfa5',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 4,
  },
  highlightedMessage: {
    borderWidth: 2,
    borderColor: '#00bfa5',
    shadowColor: '#00bfa5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#fff',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 2,
  },
  reactionBubbleReacted: {
    backgroundColor: 'rgba(0,191,165,0.3)',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  reactionBubbleHidden: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  reactionHiddenText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  sentMessageInfo: {
    justifyContent: 'flex-end',
  },
  senderName: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  messageTime: {
    color: '#666',
    fontSize: 11,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  replyContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyLabel: {
    color: '#00bfa5',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  replyMessage: {
    color: '#999',
    fontSize: 12,
    flex: 1,
  },
  cancelReply: {
    padding: 4,
  },
  cancelReplyText: {
    color: '#666',
    fontSize: 16,
  },
  editContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editLabel: {
    color: '#ff9500',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  editMessage: {
    color: '#999',
    fontSize: 12,
    flex: 1,
  },
  cancelEdit: {
    padding: 4,
  },
  cancelEditText: {
    color: '#666',
    fontSize: 16,
  },
  inputContainer: {
    // paddingBottom will be applied inline with insets
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    textAlignVertical: 'top',
    minHeight: 40,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachButtonDisabled: {
    opacity: 0.5,
  },
  filePreview: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  filePreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  filePreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  removeFileButton: {
    padding: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#00bfa5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  actionSheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonText: {
    fontSize: 20,
  },
  loadOlderContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadOlderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  loadOlderButtonDisabled: {
    opacity: 0.6,
  },
  loadOlderText: {
    color: '#00bfa5',
    fontSize: 14,
    fontWeight: '500',
  },
  loadOlderIcon: {
    fontSize: 16,
  },

  actionButtons: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,59,48,0.2)',
  },
  deleteButtonText: {
    color: '#ff3b30',
  },
  deleteModeControls: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  deleteButtonDisabled: {
    backgroundColor: '#404040',
    opacity: 0.6,
  },
  // Module display modal styles
  moduleDisplayContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  moduleDisplayContainer: {
    padding: 20,
  },
  moduleDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  // Attachment styles
  attachmentLoading: {
    padding: 8,
    alignItems: 'center',
  },
  attachmentLoadingText: {
    color: '#999',
    fontSize: 12,
  },
  attachmentContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  attachmentImageContainer: {
    position: 'relative',
    width: 200,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImageFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  attachmentImageFallbackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  attachmentVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
  },
  attachmentAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
  },
  attachmentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
  },
  attachmentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  attachmentText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  moduleDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 16,
  },
  moduleDisplayIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleDisplayInfo: {
    flex: 1,
  },
  moduleDisplayTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleDisplayTime: {
    color: '#cccccc',
    fontSize: 14,
  },
  closeModuleButton: {
    padding: 8,
  },
  moduleContent: {
    paddingTop: 8,
  },
  moduleQuestion: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 24,
  },
  moduleDescription: {
    color: '#cccccc',
    fontSize: 16,
    lineHeight: 22,
  },
  // Module card styles
  moduleContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleHeaderText: {
    flex: 1,
  },
  moduleTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  moduleTime: {
    color: '#cccccc',
    fontSize: 12,
  },
  moduleContentText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  // Preview Modal Styles
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  previewDownloadButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1000,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewDownloadText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  previewImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    flex: 1,
  },
  previewImageContainer: {
    position: 'relative',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    flex: 1,
  },
  previewImageFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageFallbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  previewVideo: {
    width: '100%',
    height: 300,
    maxWidth: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewVideoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewVideoSubtext: {
    color: '#ccc',
    fontSize: 14,
  },
  previewAudio: {
    alignItems: 'center',
    padding: 40,
  },
  previewAudioIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  previewAudioText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewAudioSubtext: {
    color: '#ccc',
    fontSize: 14,
  },
  previewFile: {
    alignItems: 'center',
    padding: 40,
  },
  previewFileIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  previewFileText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewFileSubtext: {
    color: '#ccc',
    fontSize: 14,
  },
  // Custom Download Modal Styles
  downloadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  downloadModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  downloadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  downloadModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  downloadModalCloseButton: {
    padding: 5,
  },
  downloadModalCloseText: {
    color: '#ccc',
    fontSize: 20,
  },
  downloadModalBody: {
    marginBottom: 20,
  },
  downloadModalText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  downloadModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  downloadModalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadModalCancelText: {
    color: '#ccc',
    fontSize: 16,
  },
  downloadModalDownloadButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#00bfa5',
  },
  downloadModalDownloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Custom Attachment Picker Modal Styles
  attachmentPickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  attachmentPickerModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#333',
  },
  attachmentPickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  attachmentPickerModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  attachmentPickerModalCloseButton: {
    padding: 5,
  },
  attachmentPickerModalCloseText: {
    color: '#ccc',
    fontSize: 20,
  },
  attachmentPickerModalBody: {
    marginBottom: 20,
  },
  attachmentPickerModalText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  attachmentPickerModalActions: {
    gap: 10,
  },
  attachmentPickerModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: '#00bfa5',
    marginBottom: 10,
  },
  attachmentPickerModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  attachmentPickerModalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
  },
  attachmentPickerModalCancelText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default GuestChatAdminScreen; 