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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import GlobalHeader from '../components/GlobalHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnnouncementChatItem from '../components/AnnouncementChatItem';
import TimelineModuleChatItem from '../components/TimelineModuleChatItem';
import announcementService, { Announcement as AnnouncementType } from '../lib/announcementService';

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
  message_text: string;
  message_type: string;
  created_at: string;
  company_id: string;
  is_edited: boolean;
  edited_at?: string;
  reply_to_message_id?: string;
  reactions?: any[];
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
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  
  // Module notification states
  const [showModuleDisplayModal, setShowModuleDisplayModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Handle module notification click
  const handleModuleNotificationClick = (module: any) => {
    setSelectedModule(module);
    setShowModuleDisplayModal(true);
  };
  
  // Action sheet state for mobile long-press
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const bubbleRefs = useRef<{ [key: string]: any }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const reactionsFetched = useRef<boolean>(false);

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
        } else {
  
  
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
    
    // Poll every 2 seconds for new modules
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
    if (!messageText.trim() || !currentUser || !eventId) return;

    const textToSend = messageText.trim();
    setMessageText(''); // Clear input immediately

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
      message_text: textToSend,
      message_type: 'text',
      created_at: new Date().toISOString(),
      company_id: currentUser.company_id,
      is_edited: false,
      reply_to_message_id: replyTo?.message_id,
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase.rpc('send_guests_chat_message', {
        p_event_id: eventId,
        p_sender_email: currentUser.email,
        p_message_text: textToSend,
        p_message_type: 'text',
        p_reply_to_message_id: replyTo?.message_id || null
      });

      if (error) {
        console.error('[GUESTS_CHAT] Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
        setMessageText(textToSend); // Restore message text
        return;
      }

      // Replace optimistic message with real message
      if (data && data.length > 0) {
        const realMessage = data[0];
        setMessages(prev => prev.map(msg => 
          msg.message_id === optimisticMessage.message_id ? {
            message_id: realMessage.message_id,
            event_id: realMessage.event_id,
            sender_email: realMessage.sender_email,
            sender_name: realMessage.sender_name,
            sender_type: realMessage.sender_type,
            avatar_url: realMessage.avatar_url,
            message_text: realMessage.message_text,
            message_type: realMessage.message_type,
            created_at: realMessage.created_at,
            company_id: realMessage.company_id,
            is_edited: realMessage.is_edited || false,
            edited_at: realMessage.edited_at,
            reply_to_message_id: realMessage.reply_to_message_id,
            reactions: []
          } : msg
        ));
      }

      console.log('[REPLY DEBUG] Clearing replyTo after sending message');
      setReplyTo(null);
      replyToRef.current = null;
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
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.message_id === newMessage.message_id);
            if (exists) return prev;
            
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
            <View style={styles.replyPreview}>
              <Text style={styles.replyText}>
                {messages.find(m => m.message_id === message.reply_to_message_id)?.message_text || 'Original message not found'}
              </Text>
            </View>
          )}

          {/* Message bubble */}
          <View style={[
            styles.messageBubble, 
            isCurrentUser ? styles.sentBubble : styles.receivedBubble,
            isDeleteMode && isCurrentUser && isSelected && styles.selectedMessageBorder
          ]}>
            <Text style={[
              styles.messageText, 
              isCurrentUser ? styles.sentMessageText : styles.receivedMessageText
            ]}>
              {message.message_text || 'Message text unavailable'}
            </Text>
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
                        console.log('[TIMELINE MODULE] Pressed:', item.question || item.title);
                      }}
                    />
                  );
                }
                return null;
              });
            })()}
            <TypingIndicator />
          </ScrollView>

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
                placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
                placeholderTextColor="#666"
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendButton, (editingMessageId ? editText.trim() : messageText.trim()) && styles.sendButtonActive]}
                onPress={editingMessageId ? () => editMessage(editingMessageId, editText) : sendMessage}
                disabled={!(editingMessageId ? editText.trim() : messageText.trim())}
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
  },
  replyText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
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
});

export default GuestChatAdminScreen; 