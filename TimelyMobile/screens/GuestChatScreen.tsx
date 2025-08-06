import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import GlobalHeader from '../components/GlobalHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

interface Announcement {
  id: string;
  event_id: string;
  company_id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  scheduled_for?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface GuestChatScreenProps {
  route: {
    params: {
      eventId: string;
      eventName?: string;
      guest: any;
    };
  };
  navigation: any;
  onAnnouncementPress?: (announcement: any) => void;
}

const GuestChatScreen: React.FC<GuestChatScreenProps> = ({ route, navigation }) => {
  const { eventId, eventName, guest } = route.params;
  
  // Debug the event name
      // // console.log('[DEBUG] Event name from params:', eventName);
    // // console.log('[DEBUG] Event ID from params:', eventId);
    // // console.log('[DEBUG] Guest object:', guest);
    // // console.log('[DEBUG] Guest event_id:', guest?.event_id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementType[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const [eventData, setEventData] = useState<{
    event_title?: string;
    event_location?: string;
    event_start_date?: string;
    event_end_date?: string;
  }>({});
  
  // Debug messages state changes
  // useEffect(() => {
  //   console.log('📨 Messages state updated, count:', messages.length);
  //   if (messages.length > 0) {
  //     console.log('📨 Last message:', messages[messages.length - 1]);
  //   }
  // }, [messages]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hoverPopupState, setHoverPopupState] = useState<{
    visible: boolean;
    messageId: string;
    position: { x: number; y: number };
  }>({ visible: false, messageId: '', position: { x: 0, y: 0 } });
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [channel, setChannel] = useState<any>(null);
  const [reactionsChannel, setReactionsChannel] = useState<any>(null);
  // const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  // const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  // const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [onlineGuests, setOnlineGuests] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  // Module notification states
  const [showModuleDisplayModal, setShowModuleDisplayModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  
  // Handle module notification click
  const handleModuleNotificationClick = (module: any) => {
    setSelectedModule(module);
    setShowModuleDisplayModal(true);
  };

  const bubbleRefs = useRef<{ [key: string]: any }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const flatListRef = useRef<FlatList>(null);
  const lastMessageCount = useRef<number>(0);


  useEffect(() => {
    // // console.log('[DEBUG] useEffect triggered with eventId:', eventId);
    // // console.log('[DEBUG] Guest data:', guest);
    // // console.log('[DEBUG] Guest event_id:', guest?.event_id);
    
    if (guest && guest.event_id) {
      // // console.log('✅ Guest data available, setting up polling');
      // // console.log('[DEBUG] Setting up chat with eventId:', eventId, 'guest event_id:', guest.event_id);
      loadMessages();
      loadAnnouncements(); // Load existing announcements
          loadModules(); // Load existing modules
    setupPolling();
      setupMessagesSubscription();
      setupReactionsSubscription();
      setupAnnouncementsSubscription();
      setupModulesSubscription();
    } else {
      // // console.log('❌ Guest data not available yet');
    }
    
    // Cleanup function
    return () => {
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (error) {
          // console.log('[CHAT] Error cleaning up channel:', error);
        }
      }
      if (reactionsChannel) {
        try {
          reactionsChannel.unsubscribe();
        } catch (error) {
          // console.log('[CHAT] Error cleaning up reactions channel:', error);
        }
      }
      // Clear polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
        // console.log('🔄 Polling interval cleared');
      }
      // Clear typing timeouts
      Object.values(typingTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [eventId, guest]);

  // Fetch event data when component mounts
  useEffect(() => {
    if (eventId) {
      fetchEventData(eventId);
    }
  }, [eventId]);



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

  const fetchEventData = async (eventId: string) => {
    try {
      // console.log('[GuestChatScreen] Fetching event data for event_id:', eventId);
      
      // Try to fetch event data using RPC function
      const { data, error } = await supabase.rpc('get_event_homepage_data', { 
        p_event_id: eventId 
      });
      
      if (error) {
        console.error('[GuestChatScreen] Error fetching event data:', error);
        // Fallback: try direct query
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('name, location, from, to')
          .eq('id', eventId)
          .single();
          
        if (!eventError && eventData) {
          setEventData({
            event_title: eventData.name,
            event_location: eventData.location,
            event_start_date: eventData.from,
            event_end_date: eventData.to,
          });
        }
      } else if (data && Array.isArray(data) && data.length > 0) {
        const eventInfo = data[0];
        setEventData({
          event_title: eventInfo.event_title || eventInfo.welcome_title,
          event_location: eventInfo.event_location,
          event_start_date: eventInfo.event_start_date,
          event_end_date: eventInfo.event_end_date,
        });
      }
    } catch (err) {
      console.error('[GuestChatScreen] Error fetching event data:', err);
    }
  };

  const loadOlderMessages = async () => {
    if (!guest || !guest.event_id || loadingOlder || !hasMoreMessages) {
      return;
    }
    
    setLoadingOlder(true);
            setIsLoadingOlderMessages(true);
    try {
      // Get the total count of messages to calculate the correct offset
      const { data: countData, error: countError } = await supabase
        .from('guests_chat_messages')
        .select('message_id', { count: 'exact' })
        .eq('event_id', guest.event_id);
      
      if (countError) {
        console.error('Error getting message count:', countError);
        return;
      }
      
      const totalMessages = countData?.length || 0;
      const limit = 50;
      // Calculate offset to get messages older than what we currently have
      const offset = Math.max(0, totalMessages - limit - messages.length);
      
      // console.log('📨 Loading older messages - Total:', totalMessages, 'Current messages:', messages.length, 'Offset:', offset);
      
      const { data: messagesData, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: guest.event_id,
        p_user_email: guest.email,
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
      
      // console.log('📨 New messages found:', newMessages.length);
      
      if (newMessages.length === 0) {
        // console.log('📨 No new messages found, setting hasMoreMessages to false');
        setHasMoreMessages(false);
        return;
      }
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(newMessages);
      
      // Add older messages to the beginning
      setMessages(prev => [...enrichedMessages, ...prev]);
      
      // Check if we have more messages to load
      if (newMessages.length < 50) {
        // console.log('📨 Less than 50 messages loaded, setting hasMoreMessages to false');
        setHasMoreMessages(false);
      } else {
        // console.log('📨 50 messages loaded, keeping hasMoreMessages as true');
      }
    } catch (error) {
      console.error('Error in loadOlderMessages:', error);
    } finally {
      setLoadingOlder(false);
              setIsLoadingOlderMessages(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      // console.log('[ANNOUNCEMENTS] Loading announcements for eventId:', eventId);
      
      // Initialize the announcement service
      await announcementService.initialize();
      
      const announcementsData = await announcementService.getAnnouncements(eventId);
      // console.log('[ANNOUNCEMENTS] Raw announcements data:', announcementsData);
      setAnnouncements(announcementsData);
      // console.log('[ANNOUNCEMENTS] Loaded announcements:', announcementsData.length);
    } catch (error) {
      // console.error('[ANNOUNCEMENTS] Error loading announcements:', error);
    }
  };

  const loadModules = async () => {
    try {
      // Use the RPC function to get modules assigned to this specific guest
      const { data, error } = await supabase.rpc('get_guest_timeline_modules', {
        p_guest_id: guest?.id,
        p_event_id: eventId
      });

      if (error) {
        // Fallback to loading all modules for the event
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('timeline_modules')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        
        if (!fallbackError) {
          setModules(fallbackData || []);
        }
      } else {
        setModules(data || []);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const setupAnnouncementsSubscription = () => {
    try {
      announcementService.subscribeToAnnouncements(eventId, (newAnnouncement: AnnouncementType) => {
        // console.log('[ANNOUNCEMENTS] New announcement received:', newAnnouncement);
        setAnnouncements(prev => [...prev, newAnnouncement]);
      });
    } catch (error) {
      // console.error('[ANNOUNCEMENTS] Error setting up subscription:', error);
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
            if (payload.eventType === 'INSERT') {
              setModules(prev => [payload.new, ...prev]);
            } else if (payload.eventType === 'DELETE') {
              setModules(prev => prev.filter(module => module.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
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
      // Silent error handling
    }
  };

  const loadMessages = async () => {
    // // console.log('[LOAD MESSAGES DEBUG] loadMessages called');
    // // console.log('[LOAD MESSAGES DEBUG] guest:', guest?.id);
    // // console.log('[LOAD MESSAGES DEBUG] guest.event_id:', guest?.event_id);
    
    if (!guest || !guest.event_id) {
      // // console.log('[LOAD MESSAGES DEBUG] Early return - no guest or event_id');
      return;
    }
    
    try {
      // // console.log('📨 Loading messages for event:', guest.event_id);
      
      // First, get the total count of messages to calculate the correct offset
      const { data: countData, error: countError } = await supabase
        .from('guests_chat_messages')
        .select('message_id', { count: 'exact' })
        .eq('event_id', guest.event_id);
      
      if (countError) {
        console.error('Error getting message count:', countError);
        return;
      }
      
      const totalMessages = countData?.length || 0;
      const limit = 100;
      const offset = Math.max(0, totalMessages - limit); // Get the last 100 messages
      
      // console.log('[LOAD MESSAGES DEBUG] Calling RPC with params:', {
      //   p_event_id: guest.event_id,
      //   p_user_email: guest.email,
      //   p_limit: limit,
      //   p_offset: offset
      // });
      
      const { data, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: guest.event_id,
        p_user_email: guest.email,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        // console.error('[LOAD MESSAGES DEBUG] Error loading messages:', error);
        return;
      }
      
      // console.log('[LOAD MESSAGES DEBUG] RPC call successful, data length:', data?.length || 0);

      // console.log('📨 Loaded messages:', data?.length || 0);
      
      // Debug: Check if reply_to_message_id is being returned
      // console.log('📨 Messages with reply_to_message_id:', data?.filter((msg: any) => msg.reply_to_message_id).map((msg: any) => ({
      //   message_id: msg.message_id,
      //   message_text: msg.message_text,
      //   reply_to_message_id: msg.reply_to_message_id
      // })));
      
      // Debug: Check what data is being returned
      // console.log('[DEBUG] Loaded messages data:', data?.map((msg: any) => ({
      //   message_id: msg.message_id,
      //   sender_email: msg.sender_email,
      //   sender_name: msg.sender_name,
      //   message_text: msg.message_text,
      //   reply_to_message_id: msg.reply_to_message_id
      // })));
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(data || []);
      
      // console.log('[LOAD MESSAGES DEBUG] Enriched messages count:', enrichedMessages.length);
      
      // Load reactions for all messages
      if (enrichedMessages.length > 0) {
        const messageIds = enrichedMessages.map(m => m.message_id);
        
        // console.log('[REACTIONS DEBUG] Loading reactions for message IDs:', messageIds);
        
        const { data: reactionsData, error: reactionsError } = await supabase
          .rpc('get_guests_chat_reactions_unified', {
            p_event_id: guest.event_id,
            p_user_email: guest.email,
            p_message_ids: messageIds
          });
          
        // console.log('[REACTIONS DEBUG] Reactions query result:', { reactionsData, reactionsError });
          
        if (!reactionsError && reactionsData) {
          // Group reactions by message
          const reactionsMap: { [messageId: string]: any[] } = {};
          reactionsData.forEach((reaction: any) => {
            if (!reactionsMap[reaction.message_id]) {
              reactionsMap[reaction.message_id] = [];
            }
            reactionsMap[reaction.message_id].push(reaction);
          });
          
          // console.log('[REACTIONS DEBUG] Grouped reactions map:', reactionsMap);
          
          // Add reactions to messages
          enrichedMessages.forEach(message => {
            message.reactions = reactionsMap[message.message_id] || [];
          });
          
          // console.log('[REACTIONS DEBUG] Messages with reactions:', enrichedMessages.map(m => ({
          //   message_id: m.message_id,
          //   reactions_count: m.reactions?.length || 0,
          //   reactions: m.reactions
          // })));
        } else {
          // console.log('[REACTIONS DEBUG] No reactions data or error:', reactionsError);
        }
      } else {
        // console.log('[REACTIONS DEBUG] No messages to load reactions for');
      }
      
      setMessages(enrichedMessages);
      setIsLoading(false);
    } catch (error) {
      // console.error('Error loading messages:', error);
      setIsLoading(false);
    }
  };



  const sendMessage = async () => {
    if (!messageText.trim() || !guest || !guest.event_id || isSending) return;

    setIsSending(true);
    const textToSend = messageText.trim();
    setMessageText(''); // Clear input immediately

    // Create optimistic message
    const optimisticMessage: Message = {
      message_id: `temp-${Date.now()}`,
      event_id: guest.event_id,
      sender_email: guest.email,
      sender_name: guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.first_name || guest.last_name || 'Guest',
      sender_type: 'guest',
      avatar_url: guest.avatar_url,
      message_text: textToSend,
      message_type: 'text',
      created_at: new Date().toISOString(),
      company_id: guest.company_id,
      is_edited: false,
      reply_to_message_id: replyTo?.message_id,
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const rpcParams: any = {
        p_event_id: guest.event_id,
        p_sender_email: guest.email,
        p_message_text: textToSend,
        p_message_type: 'text',
      };
      if (replyTo?.message_id) {
        rpcParams.p_reply_to_message_id = replyTo.message_id;
      }

      const { data, error } = await supabase.rpc('send_guests_chat_message', rpcParams);

      if (error) {
        console.error('[GUESTS_CHAT] Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
        setMessageText(textToSend); // Restore message text
        return;
      }

      // Replace optimistic message with real message
      if (data && data.length > 0) {
        // The SQL function returns TABLE, not JSON
        const realMessage = data[0];
        setMessages(prev => prev.map(msg => 
          msg.message_id === optimisticMessage.message_id ? {
            message_id: realMessage.message_id,
            event_id: guest.event_id,
            sender_email: guest.email,
            sender_name: realMessage.sender_name,
            sender_type: realMessage.sender_type,
            avatar_url: guest.avatar_url,
            message_text: textToSend,
            message_type: 'text',
            created_at: realMessage.created_at,
            company_id: guest.company_id,
            is_edited: false,
            edited_at: undefined,
            reply_to_message_id: replyTo?.message_id,
            reactions: []
          } : msg
        ));
      }

      setReplyTo(null);
      
      // Trigger an immediate poll to get the latest messages
      setTimeout(() => {
        loadMessages();
      }, 200);
    } catch (error) {
      console.error('[GUESTS_CHAT] Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
      setMessageText(textToSend); // Restore message text
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (message: Message) => {
    if (!guest) return;

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
    if (!guest) return;

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

  const handleReaction = async (message: Message, emoji: string) => {
    if (!guest) return;

    console.log('[REACTION DEBUG] Attempting to add reaction:', { messageId: message.message_id, emoji, eventId, guestEmail: guest.email });

    try {
      // Always call the add function - it will handle toggling internally
      const { error } = await supabase.rpc('add_guests_chat_reaction_unified', {
        p_message_id: message.message_id,
        p_event_id: eventId,
        p_user_email: guest.email,
        p_emoji: emoji
      });

      if (error) {
        console.error('[REACTION DEBUG] Error handling reaction:', error);
        return;
      }

      console.log('[REACTION DEBUG] Reaction added successfully');
      
      // Immediately poll reactions to update UI
      if (messages.length > 0) {
        const messageIds = messages.map(m => m.message_id);
        const { data: reactionsData, error: reactionsError } = await supabase
          .rpc('get_guests_chat_reactions_unified', {
            p_event_id: guest.event_id,
            p_user_email: guest.email,
            p_message_ids: messageIds
          });
        
        if (!reactionsError && reactionsData) {
          // Group reactions by message
          const reactionsMap: { [messageId: string]: any[] } = {};
          reactionsData.forEach((reaction: any) => {
            if (!reactionsMap[reaction.message_id]) {
              reactionsMap[reaction.message_id] = [];
            }
            reactionsMap[reaction.message_id].push(reaction);
          });
          
          // Update messages with latest reactions
          setMessages(prev => prev.map(msg => ({
            ...msg,
            reactions: reactionsMap[msg.message_id] || []
          })));
        }
      }
    } catch (error) {
      console.error('[REACTION DEBUG] Exception handling reaction:', error);
    }
  };

  const handleLongPress = (message: Message) => {
    setSelectedMessage(message);
    setShowActionSheet(true);
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setShowActionSheet(false);
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.message_id);
    setEditText(message.message_text);
    setShowActionSheet(false);
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
    if (!guest || selectedMessages.size === 0) return;

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
      
      // console.log('[BULK DELETE] Successfully deleted', selectedMessages.size, 'messages');
    } catch (error) {
      console.error('Error bulk deleting messages:', error);
    }
  };

  const cancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedMessages(new Set());
  };

  const renderReactions = (messageReactions: any[], message: Message) => {
          // console.log('[REACTIONS RENDER DEBUG] Rendering reactions for message:', message.message_id, 'reactions:', messageReactions);
    if (!messageReactions || messageReactions.length === 0) return null;
    
    // Check if this message is from the current user
    const ownMessage = message.sender_email === guest?.email;
    
    // Group reactions by emoji
    const groupedReactions: { [emoji: string]: { count: number, reacted: boolean } } = {};
    messageReactions.forEach(reaction => {
      if (!groupedReactions[reaction.emoji]) {
        groupedReactions[reaction.emoji] = { count: 0, reacted: false };
      }
      groupedReactions[reaction.emoji].count++;
      if (reaction.user_email === guest?.email) {
        groupedReactions[reaction.emoji].reacted = true;
      }
    });
    
    return (
      <View style={[styles.reactionsContainer, ownMessage ? styles.ownReactionsContainer : styles.otherReactionsContainer]}>
        {Object.entries(groupedReactions).map(([emoji, info]) => (
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
      </View>
    );
  };

    const setupPolling = () => {
    if (!guest || !guest.event_id) {
      return;
    }
    
    // Poll every 5 seconds for new messages and modules (optimized for guests)
    const pollInterval = setInterval(async () => {
      try {
        // First, do a quick check if there are any new messages
        const { data: countData, error: countError } = await supabase
          .from('guests_chat_messages')
          .select('message_id', { count: 'exact' })
          .eq('event_id', guest.event_id);
        
        if (!countError) {
          const totalMessages = countData?.length || 0;
          
          // Only fetch if message count has changed
          if (totalMessages !== lastMessageCount.current) {
            lastMessageCount.current = totalMessages;
            
            const limit = 100;
            const offset = Math.max(0, totalMessages - limit);
            
            const { data: newMessages, error } = await supabase
              .rpc('get_guests_chat_messages', {
                p_event_id: guest.event_id,
                p_user_email: guest.email,
                p_limit: limit,
                p_offset: offset
              });

            if (!error && newMessages) {
              // Enrich messages with avatars
              const enrichedMessages = await enrichMessagesWithAvatars(newMessages);
              
              // Only fetch reactions if we have new messages
              if (enrichedMessages.length > 0) {
                const messageIds = enrichedMessages.map(m => m.message_id);
                
                const { data: reactionsData, error: reactionsError } = await supabase
                  .rpc('get_guests_chat_reactions_unified', {
                    p_event_id: guest.event_id,
                    p_user_email: guest.email,
                    p_message_ids: messageIds
                  });
                  
                if (!reactionsError && reactionsData) {
                  // Group reactions by message
                  const reactionsMap: { [messageId: string]: any[] } = {};
                  reactionsData.forEach((reaction: any) => {
                    if (!reactionsMap[reaction.message_id]) {
                      reactionsMap[reaction.message_id] = [];
                    }
                    reactionsMap[reaction.message_id].push(reaction);
                  });
                  
                  // Add reactions to messages
                  enrichedMessages.forEach(message => {
                    message.reactions = reactionsMap[message.message_id] || [];
                  });
                }
              }
              
              setMessages(prev => {
                // Smart update: only add truly new messages
                const currentIds = new Set(prev.map(msg => msg.message_id));
                const newMessagesOnly = enrichedMessages.filter(msg => !currentIds.has(msg.message_id));
                
                if (newMessagesOnly.length > 0) {
                  // Append new messages to existing ones
                  return [...prev, ...newMessagesOnly].sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                }
                
                return prev; // No new messages, keep existing array
              });
            }
          }
        }

        // Poll for new modules
        const { data: newModules, error: modulesError } = await supabase
          .from('timeline_modules')
          .select('*')
          .eq('event_id', guest.event_id)
          .order('created_at', { ascending: false });

        if (!modulesError && newModules) {
          setModules(prev => {
            // Check for new modules that aren't already in state
            const existingIds = new Set(prev.map(module => module.id));
            const trulyNewModules = newModules.filter(module => !existingIds.has(module.id));
            
            if (trulyNewModules.length > 0) {
              // console.log('[MODULES] Polling found new modules:', trulyNewModules.length);
              const updated = [...prev, ...trulyNewModules];
              return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
            
            return prev;
          });
        }
      } catch (error) {
        // Silent error handling
      }
         }, 5000); // Poll every 5 seconds for modules and messages

    // Store the interval ID so we can clear it later
    setPollingInterval(pollInterval);
  };

  const setupReactionsSubscription = () => {
    if (!guest || !guest.event_id) {
      return;
    }

    // For guests, use polling instead of real-time subscription due to RLS restrictions
    const pollReactions = () => {
      if (messages.length > 0) {
        const messageIds = messages.map(m => m.message_id);
        
        // Use the dedicated guest function instead of direct table access
        supabase
          .rpc('get_guests_chat_reactions_unified', {
            p_event_id: guest.event_id,
            p_user_email: guest.email,
            p_message_ids: messageIds
          })
          .then(({ data: reactionsData, error: reactionsError }) => {
            if (reactionsError) {
              console.log('[REACTION POLLING] Error fetching reactions:', reactionsError);
            } else if (reactionsData) {
              console.log('[REACTION POLLING] Received', reactionsData.length, 'reactions');
              
              // Group reactions by message
              const reactionsMap: { [messageId: string]: any[] } = {};
              reactionsData.forEach((reaction: any) => {
                if (!reactionsMap[reaction.message_id]) {
                  reactionsMap[reaction.message_id] = [];
                }
                reactionsMap[reaction.message_id].push(reaction);
              });
              
              // Update messages with latest reactions
              setMessages(prev => prev.map(message => ({
                ...message,
                reactions: reactionsMap[message.message_id] || []
              })));
            }
          });
      }
    };

    // Poll every 1 second for reaction updates (more responsive for cross-screen reactions)
    const reactionsPollInterval = setInterval(pollReactions, 1000);
    
    // Store the interval for cleanup
    setReactionsChannel({ unsubscribe: () => clearInterval(reactionsPollInterval) } as any);
  };

  const setupMessagesSubscription = () => {
    if (!guest || !guest.event_id) {
      return;
    }

    // For guests, use polling instead of real-time subscription
    // since guests may not have proper permissions for real-time subscriptions

    
    // Create a simple channel for typing indicators only
    const ch = supabase.channel(`guests-chat-typing-${guest.event_id}`)
      .subscribe();

    setChannel(ch);
  };

  const handleTyping = () => {
    if (!guest || !guest.event_id) return;
    
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeouts.current[guest.email]) {
      clearTimeout(typingTimeouts.current[guest.email]);
    }
    
    // Send typing event
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { email: guest.email, name: `${guest.first_name} ${guest.last_name}`, isTyping: true }
      });
    }
    
    // Set timeout to stop typing
    typingTimeouts.current[guest.email] = setTimeout(() => {
      setIsTyping(false);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { email: guest.email, name: `${guest.first_name} ${guest.last_name}`, isTyping: false }
        });
      }
    }, 3000);
  };

  const stopTyping = () => {
    if (!guest || !channel) return;
    
    setIsTyping(false);
    if (typingTimeouts.current[guest.email]) {
      clearTimeout(typingTimeouts.current[guest.email]);
    }
    
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { email: guest.email, name: `${guest.first_name} ${guest.last_name}`, isTyping: false }
    });
  };

  // Set up separate typing subscription
  useEffect(() => {
    if (!channel || !guest) return;

    const handleTypingBroadcast = (payload: any) => {
      const { email, name, isTyping } = payload;
      
      // Don't show our own typing
      if (email === guest.email) return;
      
      if (isTyping) {
        // console.log('[TYPING] User started typing:', email, name);
        setTypingUsers(prev => [...prev, email]);
      } else {
        // console.log('[TYPING] User stopped typing:', email, name);
        setTypingUsers(prev => prev.filter(user => user !== email));
      }
    };

    channel.on('broadcast', { event: 'typing' }, handleTypingBroadcast);

    return () => {
      try {
        if (channel && typeof channel.off === 'function') {
          channel.off('broadcast', { event: 'typing' });
        }
      } catch (error) {
        // console.log('[TYPING] Error cleaning up typing subscription:', error);
      }
    };
  }, [channel, guest]);

  const renderFlatListData = () => {
    // Combine messages, announcements, and modules, then sort by timestamp
          // console.log('[DEBUG] Messages count:', messages.length);
      // console.log('[DEBUG] Announcements count:', announcements.length);
      // console.log('[DEBUG] Modules count:', modules.length);
    
    const allItems = [
      ...messages.map(msg => ({ ...msg, type: 'message' as const })),
      ...announcements.map(ann => ({ ...ann, type: 'announcement' as const })),
      ...modules.map(module => ({ ...module, type: 'module' as const }))
    ];
    
          // console.log('[DEBUG] Combined items count:', allItems.length);
    
    const sortedItems = allItems.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return aTime - bTime;
    });
    
    // console.log('[DEBUG] Sorted items:', sortedItems.map(item => ({
    //   type: item.type,
    //   id: item.type === 'message' ? item.message_id : item.id,
    //   created_at: item.created_at
    // })));
    
    return sortedItems;
  };



  const renderMessage = (message: Message) => {
    // Check if this message is from the current user (guest)
    const ownMessage = message.sender_email === guest?.email;
    const isSelected = selectedMessages.has(message.message_id);
    
    // console.log(`[DEBUG] Message from ${message.sender_email}, guest email: ${guest?.email}, ownMessage: ${ownMessage}, sender_type: ${message.sender_type}, message_text: ${message.message_text}`);

    return (
      <TouchableOpacity
        key={message.message_id}
        style={[styles.messageContainer, ownMessage ? styles.ownMessage : styles.otherMessage]}
        onLongPress={() => handleLongPress(message)}
        onPress={() => isDeleteMode && ownMessage ? toggleMessageSelection(message.message_id) : null}
        activeOpacity={0.8}
      >
        {/* Avatar for received messages (left side) */}
        {!ownMessage && (
          <View style={styles.avatarLeft}>
            {message.sender_type === 'admin' && message.avatar_url && message.avatar_url.startsWith('http') ? (
              <Image 
                source={{ uri: message.avatar_url }} 
                style={styles.avatarImage}
                onError={(error) => {
                  // console.log('[AVATAR ERROR] Failed to load image:', message.avatar_url, error);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {message.sender_name?.split(' ').map(name => name.charAt(0)).join('').toUpperCase() || '?'}
              </Text>
            )}
          </View>
        )}



        {/* Avatar for sent messages (right side) */}
        {ownMessage && (
          <View style={styles.avatarRight}>
            {message.sender_type === 'admin' && message.avatar_url && message.avatar_url.startsWith('http') ? (
              <Image 
                source={{ uri: message.avatar_url }} 
                style={styles.avatarImage}
                onError={(error) => {
                  // console.log('[AVATAR ERROR] Failed to load image:', message.avatar_url, error);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {message.sender_name?.split(' ').map(name => name.charAt(0)).join('').toUpperCase() || '?'}
              </Text>
            )}
          </View>
        )}

        <View style={styles.messageContent}>
          {/* Reply preview */}
          {message.reply_to_message_id && (
            <View style={[styles.replyPreview, ownMessage ? styles.ownReplyPreview : styles.otherReplyPreview]}>
              <Text style={styles.replyText} numberOfLines={2} ellipsizeMode="tail">
                {messages.find(m => m.message_id === message.reply_to_message_id)?.message_text || 'Original message not found'}
              </Text>
            </View>
          )}
          
          <View style={[
            styles.messageBubble, 
            ownMessage ? styles.ownBubble : styles.otherBubble,
            isDeleteMode && ownMessage && isSelected && styles.selectedMessageBorder
          ]}>
            <Text style={[styles.messageText, ownMessage ? styles.ownMessageText : styles.otherMessageText]}>
              {message.message_text}
            </Text>
          </View>
          
          {/* Reactions */}
          {(() => {
            // console.log('[REACTIONS DEBUG] Message reactions check:', message.message_id, 'reactions:', message.reactions, 'length:', message.reactions?.length);
            return message.reactions && message.reactions.length > 0 && renderReactions(message.reactions, message);
          })()}
          
          <View style={[styles.messageInfo, ownMessage ? styles.ownMessageInfo : styles.otherMessageInfo]}>
            <Text style={ownMessage ? styles.ownSenderName : styles.senderName}>
              {message.sender_name}
            </Text>
            <Text style={ownMessage ? styles.ownMessageTime : styles.messageTime}>
              {new Date(message.created_at).getHours().toString().padStart(2, '0')}:{new Date(message.created_at).getMinutes().toString().padStart(2, '0')}
              {message.is_edited && ' (edited)'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // const renderAnnouncement = (announcement: Announcement) => {
  //   return (
  //     <TouchableOpacity 
  //       key={announcement.id} 
  //       style={styles.announcementContainer}
  //       onPress={() => {
  //         setSelectedAnnouncement(announcement);
  //         setShowAnnouncementModal(true);
  //       }}
  //       activeOpacity={0.7}
  //     >
  //       <View style={styles.announcementBubble}>
  //         <Text style={styles.announcementTitle} numberOfLines={1}>
  //           {announcement.title}
  //         </Text>
  //         <Text style={styles.announcementTime}>
  //           {new Date(announcement.created_at).getHours().toString().padStart(2, '0')}:{new Date(announcement.created_at).getMinutes().toString().padStart(2, '0')}
  //         </Text>
  //       </View>
  //     </TouchableOpacity>
  //   );
  // };

  const renderItem = ({ item }: { item: any }) => {
    // Safety check for undefined or null items
    if (!item) {
      // console.log('[DEBUG] renderItem called with null/undefined item');
      return null;
    }
    
    if (item.type === 'message') {
      return renderMessage(item);
    } else if (item.type === 'announcement') {
      return (
        <AnnouncementChatItem 
          announcement={item} 
          onPress={() => {
            // Handle announcement press if needed
            // console.log('[ANNOUNCEMENT] Pressed:', item.title);
          }}
        />
      );
    } else if (item.type === 'module') {
      // console.log('[DEBUG] Rendering timeline module:', item);
      return (
        <TimelineModuleChatItem 
          key={item.id}
          module={item} 
          onPress={() => {
            // console.log('[TIMELINE MODULE] Pressed:', item.question || item.title);
          }}
        />
      );
    }
    
    // console.log('[DEBUG] renderItem called with unknown item type:', item);
    return null;
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
                      handleReaction(selectedMessage, emoji);
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
                onPress={() => {
                  if (selectedMessage) {
                    setReplyTo(selectedMessage);
                  }
                  setShowActionSheet(false);
                }}
              >
                <Text style={styles.actionButtonText}>Reply</Text>
              </TouchableOpacity>
              
              {/* Only show edit/delete for current user's messages */}
              {selectedMessage && selectedMessage.sender_email === guest?.email && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleEdit(selectedMessage);
                      }
                    }}
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
    <View style={styles.deleteModeContainer}>
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
  );

  // Announcement Modal
  // const AnnouncementModal = () => (
  //   <Modal
  //     visible={showAnnouncementModal}
  //     transparent
  //     animationType="fade"
  //     onRequestClose={() => setShowAnnouncementModal(false)}
  //   >
  //     <View style={styles.announcementModalOverlay}>
  //       <View style={styles.announcementModalContent}>
  //         {/* Header with X button */}
  //         <View style={styles.announcementModalHeader}>
  //           <Text style={styles.announcementModalTitle}>Announcement</Text>
  //           <TouchableOpacity 
  //             style={styles.announcementModalCloseButton}
  //             onPress={() => setShowAnnouncementModal(false)}
  //           >
  //             <Text style={styles.announcementModalCloseText}>✕</Text>
  //           </TouchableOpacity>
  //         </View>

  //         {/* Announcement content */}
  //         {selectedAnnouncement && (
  //           <View style={styles.announcementModalBody}>
  //             <Text style={styles.announcementModalTitleText}>
  //               {selectedAnnouncement.title}
  //             </Text>
              
  //             {selectedAnnouncement.description && (
  //               <Text style={styles.announcementModalDescription}>
  //                 {selectedAnnouncement.description}
  //               </Text>
  //             )}

  //             {selectedAnnouncement.image_url && (
  //               <Image 
  //                 source={{ uri: selectedAnnouncement.image_url }} 
  //                 style={styles.announcementModalImage}
  //                 resizeMode="contain"
  //               />
  //             )}

  //             {selectedAnnouncement.link_url && (
  //               <TouchableOpacity style={styles.announcementModalLink}>
  //                 <Text style={styles.announcementModalLinkText}>
  //                   {selectedAnnouncement.link_url}
  //                 </Text>
  //               </TouchableOpacity>
  //             )}

  //             <Text style={styles.announcementModalTime}>
  //               {new Date(selectedAnnouncement.created_at).toLocaleString()}
  //             </Text>
  //           </View>
  //         )}
  //       </View>
  //     </View>
  //   </Modal>
  // );

  return (
    <View style={styles.container}>
      <GlobalHeader
        title={eventData.event_title || eventName || guest?.event_name || "Chat"}
        onBackPress={() => navigation.goBack()}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        

        <FlatList
          ref={flatListRef}
          data={renderFlatListData()}
          keyExtractor={(item) => item.type === 'message' ? item.message_id : item.id}
          renderItem={renderItem}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}

          ListHeaderComponent={
            messages.length > 0 && hasMoreMessages ? (
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
            ) : null
          }
        />
        
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
        
        <View style={styles.inputContainer}>
          {replyTo && (
            <View style={styles.replyContainer}>
              <Text style={styles.replyText}>Replying to: {replyTo.sender_name}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <MaterialCommunityIcons name="close" size={16} color="#666" />
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
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={editingMessageId ? editText : messageText}
              onChangeText={(text) => {
                if (editingMessageId) {
                  setEditText(text);
                } else {
                  setMessageText(text);
                  handleTyping();
                }
              }}
              onBlur={editingMessageId ? undefined : stopTyping}
              placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
              placeholderTextColor="#666"
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton, 
                (!(editingMessageId ? editText.trim() : messageText.trim()) || isSending) && styles.sendButtonDisabled
              ]}
              onPress={editingMessageId ? () => editMessage(editingMessageId, editText) : sendMessage}
              disabled={!(editingMessageId ? editText.trim() : messageText.trim()) || isSending}
            >
              <MaterialCommunityIcons 
                name={editingMessageId ? "check" : "send"} 
                size={20} 
                color={(editingMessageId ? editText.trim() : messageText.trim()) ? "#fff" : "#666"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
              <ActionSheetModal />
        {/* <AnnouncementModal /> */}
        

        
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
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  dateHeader: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
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
  deleteButtonDisabled: {
    backgroundColor: '#404040',
    opacity: 0.6,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
  messageContent: {
    flex: 1,
    alignItems: 'flex-start',
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 4,
  },
  ownBubble: {
    backgroundColor: '#00bfa5',
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    flexShrink: 1,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#fff',
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  ownMessageInfo: {
    justifyContent: 'flex-end',
    marginTop: 4,
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  otherMessageInfo: {
    justifyContent: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#999',
  },
  ownSenderName: {
    fontSize: 12,
    color: '#00bfa5',
    textAlign: 'right',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  ownMessageTime: {
    fontSize: 12,
    color: '#00bfa5',
    textAlign: 'right',
  },
  avatarLeft: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginRight: 8,
  },
  avatarRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00bfa5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  announcementContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  announcementBubble: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: 280, // Fixed width
    borderWidth: 1,
    borderColor: '#00bfa5',
  },
  announcementTitle: {
    color: '#00bfa5',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  announcementMessage: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  announcementTime: {
    color: '#666',
    fontSize: 12,
  },
  // Announcement Modal Styles
  announcementModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementModalContent: {
    backgroundColor: '#000',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00bfa5',
  },
  announcementModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  announcementModalTitle: {
    color: '#00bfa5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  announcementModalCloseButton: {
    padding: 8,
  },
  announcementModalCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  announcementModalBody: {
    padding: 20,
  },
  announcementModalTitleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  announcementModalDescription: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  announcementModalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  announcementModalLink: {
    backgroundColor: '#00bfa5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  announcementModalLinkText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  announcementModalTime: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyPreview: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#00bfa5',
    maxWidth: '80%',
  },
  ownReplyPreview: {
    alignSelf: 'flex-end',
    borderLeftColor: '#00bfa5',
  },
  otherReplyPreview: {
    alignSelf: 'flex-start',
    borderLeftColor: '#666',
  },
  replyText: {
    color: '#fff',
    fontSize: 14,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  editLabel: {
    color: '#00bfa5',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#00bfa5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  actionSheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonText: {
    fontSize: 20,
  },
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
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
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  ownReactionsContainer: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  otherReactionsContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  reactionBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionBubbleReacted: {
    backgroundColor: '#00bfa5',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
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

export default GuestChatScreen; 