import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Linking,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';
import { useTheme } from '../ThemeContext';
import * as Haptics from 'expo-haptics';
import { pushNotificationService } from '../lib/pushNotifications';
import { LinearGradient } from 'expo-linear-gradient';
import { debounce } from 'lodash';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { soundEffects } from '../lib/soundEffects';
import AnnouncementChatItem from '../components/AnnouncementChatItem';
import announcementService, { Announcement } from '../lib/announcementService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
  message_id: string;
  event_id: string;
  sender_name: string;
  sender_type: 'admin' | 'guest';
  sender_email: string;
  avatar_url?: string | null;
  message_text: string;
  message_type: string;
  company_id: string;
  created_at: string;
  reply_to_message_id?: string | null;
  reactions?: { emoji: string; user_email: string }[];
  is_edited?: boolean;
  edited_at?: string;
}

interface GuestChatScreenProps {
  guest: any;
  onAnnouncementPress?: (announcement: Announcement) => void;
}

export default function GuestChatScreen({ guest, onAnnouncementPress }: GuestChatScreenProps) {
  // ALL HOOKS MUST BE AT THE TOP - NO EXCEPTIONS
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [eventName, setEventName] = useState<string>(guest?.event_name || guest?.event_title || '');
  const [typingUsers, setTypingUsers] = useState<{ [email: string]: string }>({});
  const [channel, setChannel] = useState<any>(null);
  const [hoverPopupState, setHoverPopupState] = useState<{
    activeMessageId: string | null;
    position: { x: number; y: number } | null;
    message: Message | null;
  }>({
    activeMessageId: null,
    position: null,
    message: null
  });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [reactionPopupPosition, setReactionPopupPosition] = useState<{ x: number; y: number; width: number } | null>(null);
  const [navigateToMessageId, setNavigateToMessageId] = useState<string | null>(null);
  const [swipeHapticTriggered, setSwipeHapticTriggered] = useState<{ [key: string]: boolean }>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // ALL REFS
  const typingTimeouts = useRef<{ [email: string]: NodeJS.Timeout }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleRefs = useRef<{ [id: string]: any }>({});
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const messageRefs = useRef<{ [id: string]: any }>({});

  // ALL DERIVED STATE AND MEMOIZED VALUES
  const isDark = theme === 'dark';
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages]);

  // ALL CALLBACKS
  const broadcastTyping = useCallback(
    debounce(() => {
      if (channel && guest?.email && guest?.name) {
        channel.send({
          type: 'broadcast',
          event: 'user_typing',
          payload: { 
            email: guest.email, 
            name: guest.name, 
            event_id: guest.event_id 
          }
        });
      }
    }, 300),
    [channel, guest?.email, guest?.name, guest?.event_id]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await initializeChat();
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Navigate to a specific message and highlight it
  const navigateToMessage = useCallback((messageId: string) => {
    setNavigateToMessageId(messageId);
    setHighlightedMessageId(messageId);
    
    // Find the message index in the flat list data
    const flatData = renderFlatListData();
    const messageIndex = flatData.findIndex(item => 
      item.type === 'message' && item.message_id === messageId
    );
    
    if (messageIndex !== -1) {
      // Scroll to the message with haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: messageIndex,
            animated: true,
            viewPosition: 0.3
          });
        } catch (error) {
          console.log('[NAVIGATE] Error scrolling to message:', error);
          // Fallback to scrollToEnd if scrollToIndex fails
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }, 100);
      
      // Clear highlight after 2 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
        setNavigateToMessageId(null);
      }, 2000);
    }
  }, [messages]);

  // Handle swipe gesture with haptic feedback
  const handleSwipeOpen = useCallback((message: Message) => {
    setReplyTo(message);
    setHighlightedMessageId(message.message_id);
    setTimeout(() => setHighlightedMessageId(null), 1200);
  }, []);

  const handleSwipeClose = useCallback(() => {
    setHighlightedMessageId(null);
  }, []);

  // ALL EFFECTS (in order)
  useEffect(() => {
    if (!eventName && guest?.event_id) {
      supabase
        .from('events')
        .select('name')
        .eq('id', guest.event_id)
        .single()
        .then(({ data, error }) => {
          if (data && data.name) setEventName(data.name);
        });
    }
  }, [guest?.event_id, eventName]);

  useEffect(() => {
    if (guest?.event_id && guest?.email) {
      initializeChat();
    }
  }, [guest]);

  // Initialize sound effects
  useEffect(() => {
    soundEffects.initialize();
    return () => {
      soundEffects.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!guest?.event_id) return;
    const ch = supabase.channel(`mobile-guest-chat-${guest.event_id}`);
    ch.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'guests_chat_messages',
      filter: `event_id=eq.${guest.event_id}`,
    }, (payload) => {
      setMessages((prev) => {
        // Only operate on Message[]
        const idx = prev.findIndex((m) => m.message_id.startsWith('optimistic') && isSameMessage(m, payload.new as any));
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = payload.new as Message;
          return copy;
        }
        if (prev.some((m) => m.message_id === (payload.new as any).message_id)) return prev;
        return [...prev, payload.new as Message];
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
    ch.on('broadcast', { event: 'typing' }, (payload) => {
      const { sender_email, sender_name } = payload.payload;
      console.log('[CHAT] Received typing event from', sender_email, sender_name);
      if (sender_email === guest.email) return;
      setTypingUsers((prev) => {
        const updated = { ...prev, [sender_email]: sender_name };
        if (typingTimeouts.current[sender_email]) clearTimeout(typingTimeouts.current[sender_email]);
        typingTimeouts.current[sender_email] = setTimeout(() => {
          setTypingUsers((prev2) => {
            const copy = { ...prev2 };
            delete copy[sender_email];
            return copy;
          });
        }, 2500);
        return updated;
      });
    });
    ch.subscribe();
    setChannel(ch);
    return () => {
      supabase.removeChannel(ch);
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingTimeouts.current = {};
    };
  }, [guest?.event_id, guest?.email]);

  useEffect(() => {
    if (!guest?.event_id) return;
    const ch = supabase.channel(`mobile-guest-chat-reactions-${guest.event_id}`);
    ch.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'guests_chat_reactions',
    }, (payload) => {
      // Refetch messages to update reactions
      loadMessages();
    });
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [guest?.event_id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  useFocusEffect(
    useCallback(() => {
      if (guest?.event_id && guest?.email) {
        initializeChat();
      }
    }, [guest?.event_id, guest?.email])
  );

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow?.remove();
      keyboardWillHide?.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Load announcements
  useEffect(() => {
    const loadAnnouncements = async () => {
      console.log('[DEBUG] GuestChatScreen - guest:', guest);
      console.log('[DEBUG] GuestChatScreen - event_id:', guest?.event_id);
      
      if (!guest?.event_id) {
        console.log('[DEBUG] GuestChatScreen - No event_id available');
        return;
      }
      
      console.log('[DEBUG] GuestChatScreen - Using eventId:', guest.event_id);
      
      try {
        console.log('[DEBUG] GuestChatScreen - Calling getAnnouncements...');
        const data = await announcementService.getAnnouncements(guest.event_id);
        console.log('[DEBUG] GuestChatScreen - getAnnouncements result:', data);
        setAnnouncements(data);
        console.log('[GuestChatScreen] Loaded announcements:', data.length);
      } catch (error) {
        console.error('[GuestChatScreen] Error loading announcements:', error);
      }
    };

    loadAnnouncements();
  }, [guest?.event_id]);

  // Subscribe to new announcements
  useEffect(() => {
    if (!guest?.event_id) {
      console.log('[GuestChatScreen] No event_id available for subscription');
      return;
    }
    
    console.log('[GuestChatScreen] Subscribing to announcements for eventId:', guest.event_id);
    
    let subscription: any = null;
    
    const setupSubscription = async () => {
      try {
        subscription = await announcementService.subscribeToAnnouncements(
          guest.event_id,
          (announcement) => {
            console.log('[GuestChatScreen] Received new announcement:', announcement);
            setAnnouncements(prev => [...prev, announcement]); // Add new announcement to the end
          }
        );
      } catch (error) {
        console.error('[GuestChatScreen] Error setting up subscription:', error);
      }
    };
    setupSubscription();

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [guest?.event_id]);

  // NOW ALL NON-HOOK FUNCTIONS AND CONSTANTS
  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😡', '🔥', '💯'];

  // Edit message handlers
  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim()) return;
    
    try {
      const { error } = await supabase.rpc('edit_guests_chat_message', {
        p_message_id: editingMessageId,
        p_user_email: guest?.email,
        p_new_text: editText.trim(),
      });
      
      if (error) {
        console.error('Error editing message:', error);
        Alert.alert('Error', 'Failed to edit message. Please try again.');
        return;
      }
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.message_id === editingMessageId 
          ? { ...msg, message_text: editText.trim() }
          : msg
      ));
      
      // Clear editing state
      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert('Error', 'Failed to edit message. Please try again.');
    }
  };
  
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Add highlight state for swiped message
  // Add state for reaction popup position

  const setupKeyboardListeners = () => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  };

  const initializeChat = async () => {
    try {
      setIsInitializing(true);
      
      if (!guest?.event_id || !guest?.email) {
        console.error('[MOBILE GUEST CHAT] Missing guest event_id or email');
        return;
      }

      console.log('[MOBILE GUEST CHAT] Initializing chat for guest:', guest.email, 'event:', guest.event_id);

      // Initialize guest chat for this event using new system
      const { error: initError } = await supabase.rpc('initialize_guests_chat', { 
        p_event_id: guest.event_id 
      });

      if (initError) {
        console.error('[MOBILE GUEST CHAT] Error initializing chat:', initError);
      }

      // Load initial messages
      await loadMessages();

    } catch (error) {
      console.error('[MOBILE GUEST CHAT] Error initializing chat:', error);
      Alert.alert('Chat Error', 'Unable to initialize chat. Please try again.');
    } finally {
      setIsInitializing(false);
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!guest?.event_id) return;

    try {
      const { data: messagesData, error } = await supabase
        .rpc('get_guests_chat_messages', {
          p_event_id: guest.event_id,
          p_user_email: guest.email,  // Add the missing user email parameter
          p_limit: 100,
          p_offset: 0
        });

      if (error) {
        console.error('[MOBILE GUEST CHAT] Error loading messages:', error);
        return;
      }

      console.log('[MOBILE GUEST CHAT] Raw messages data:', messagesData);
      console.log('[MOBILE GUEST CHAT] Loaded messages:', messagesData?.length || 0);
      
      // For each message, fetch reactions
      const messagesWithReactions = await Promise.all((messagesData as any[]).map(async (msg) => {
        const { data: reactions } = await supabase.rpc('get_guests_chat_reactions', { p_message_id: msg.message_id });
        console.log(`[REACTIONS] Message ${msg.message_id} reactions:`, reactions);
        console.log(`[AVATAR] Message ${msg.message_id} avatar_url:`, msg.avatar_url);
        
        // Map the backend data to our Message interface
        const mappedMessage: Message = {
          message_id: msg.message_id,
          event_id: msg.event_id,
          sender_name: msg.sender_name,
          sender_type: msg.sender_type,
          sender_email: msg.sender_email,
          avatar_url: msg.avatar_url, // This should now work since backend returns avatar_url
          message_text: msg.message_text,
          message_type: msg.message_type,
          company_id: msg.company_id,
          created_at: msg.created_at,
          reply_to_message_id: msg.reply_to_message_id || null,
          reactions: reactions || [],
          is_edited: msg.is_edited || false,
          edited_at: msg.edited_at || null
        };
        
        return mappedMessage;
      }));
      
      console.log('[MOBILE GUEST CHAT] Mapped messages:', messagesWithReactions);
      setMessages(messagesWithReactions);
      // Don't reverse since DB returns correct order

    } catch (error) {
      console.error('[MOBILE GUEST CHAT] Error in loadMessages:', error);
    }
  };

  // Optimistic UI: add message immediately
  const sendMessage = async () => {
    if (!newMessage.trim() || !guest?.event_id || !guest?.email || sending) return;
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    Keyboard.dismiss();
    
    // Play send message sound
    soundEffects.playSendMessage();
    const optimisticMessage: Message = {
      message_id: 'optimistic-' + Date.now(),
      event_id: guest.event_id,
      sender_name: guest.first_name + ' ' + guest.last_name,
      sender_type: 'guest',
      sender_email: guest.email,
      avatar_url: guest.avatar_url || null,
      message_text: messageText,
      message_type: 'text',
      company_id: guest.company_id,
      created_at: new Date().toISOString(),
      reply_to_message_id: replyTo?.message_id || null,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyTo(null); // Clear reply state after sending
    console.log('[OPTIMISTIC] Added optimistic message:', optimisticMessage);
    try {
      const rpcParams: any = {
        p_event_id: guest.event_id,
        p_sender_email: guest.email,
        p_message_text: messageText,
        p_message_type: 'text',
      };
      if (replyTo?.message_id) {
        rpcParams.p_reply_to_message_id = replyTo.message_id;
        console.log('[REPLY] Adding reply_to_message_id to RPC params:', replyTo.message_id);
      }
      console.log('[SEND] Calling send_guests_chat_message with params:', rpcParams);
      const { data: result, error } = await supabase
        .rpc('send_guests_chat_message', rpcParams);
      if (error) {
        console.error('[SEND] Error from send_guests_chat_message:', error);
        setMessages((prev) => prev.filter((m) => m.message_id !== optimisticMessage.message_id));
        setNewMessage(messageText);
        Alert.alert('Send Failed', 'Unable to send message. Please try again.');
        return;
      }
      console.log('[SEND] Successfully sent message, result:', result);
      // The realtime payload will replace the optimistic message
    } catch (error) {
      console.error('[SEND] Exception in sendMessage:', error);
      setMessages((prev) => prev.filter((m) => m.message_id !== optimisticMessage.message_id));
      setNewMessage(messageText);
      Alert.alert('Send Failed', 'Unable to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const markMessagesAsRead = async () => {
    // Skip marking messages as read for now - function not implemented
    console.log('[MOBILE GUEST CHAT] Skipping mark as read - function not implemented yet');
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getMessageGroups = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    messages.forEach(message => {
      const messageDate = formatDate(message.created_at);
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const ADMIN_BUBBLE = '#00bfa5'; // teal accent for admin
  const GUEST_BUBBLE = '#23242b'; // dark card for guests
  const BG_COLOR = '#181A20';
  const TEXT_COLOR = '#fff';
  const TEXT_SECONDARY = '#aaa';
  const GLASS_BG = 'rgba(36, 37, 42, 0.7)';
  const BORDER_COLOR = 'rgba(255,255,255,0.12)';
  const GRADIENT_COLORS = ['#23242b', '#2e2e38', '#3a3a4a'] as any;

            const Avatar = ({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) => {
              const initials = name
                ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                : '?';
              
              // Debug logging
              console.log(`[AVATAR DEBUG] Name: ${name}, Avatar URL: ${avatarUrl}, Type: ${typeof avatarUrl}`);
              
              if (avatarUrl) {
                console.log(`[AVATAR DEBUG] Showing profile photo for: ${name}`);
                return (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: 36, height: 36, borderRadius: 18, marginHorizontal: 10, backgroundColor: GUEST_BUBBLE }}
                    resizeMode="cover"
                  />
                );
              }
              console.log(`[AVATAR DEBUG] Showing initials for: ${name}`);
              return (
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: GUEST_BUBBLE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 10,
                }}>
                  <Text style={{ color: TEXT_COLOR, fontWeight: 'bold', fontSize: 16 }}>{initials}</Text>
                </View>
              );
            };

  const GlassBubble = ({ children, isCurrentUser, isRecipient }: { children: React.ReactNode, isCurrentUser: boolean, isRecipient: boolean }) => {
    if (isRecipient) {
      // Gradient glass for recipient
      return (
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: BORDER_COLOR,
            overflow: 'hidden',
          }}
        >
          <BlurView intensity={30} tint="dark" style={{ borderRadius: 18, padding: 14 }}>
            {children}
          </BlurView>
        </LinearGradient>
      );
    }
    // Glass only for sender
    return (
      <BlurView intensity={30} tint="dark" style={{
        backgroundColor: GLASS_BG,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: BORDER_COLOR,
        padding: 14,
        overflow: 'hidden',
      }}>
        {children}
      </BlurView>
    );
  };

  // Helper to detect and render URLs as clickable links
  function renderMessageText(text: string) {
    // Updated regex to match both http/https and www. links
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        // Ensure www. links have http:// prefix
        const url = part.startsWith('www.') ? `https://${part}` : part;
        return (
          <Text
            key={i}
            style={{ color: '#ffffff', textDecorationLine: 'underline' }}
            onPress={() => {
              try {
                Linking.openURL(url);
              } catch (error) {
                console.error('Error opening URL:', error);
              }
            }}
          >
            {part}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  }

  const renderLeftActions = () => (
    <View style={{
      flex: 1,
      backgroundColor: '#23242b',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingLeft: 24,
    }}>
      <Ionicons name="arrow-undo" size={28} color="#00bfa5" />
    </View>
  );

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isCurrentUser = message.sender_email === guest.email;
    const isAdmin = message.sender_type === 'admin';
    const isHighlighted = highlightedMessageId === message.message_id;
    // Find replied-to message if this is a reply
    const repliedTo = message.reply_to_message_id
      ? messages.find((m) => m.message_id === message.reply_to_message_id)
      : null;
    return (
      <Swipeable
        renderLeftActions={() => (
          <View style={{ width: 1, backgroundColor: 'transparent' }} />
        )}
        leftThreshold={25}
        friction={2}
        onSwipeableLeftWillOpen={() => {
          // Trigger haptic feedback early in the swipe
          if (!swipeHapticTriggered[message.message_id]) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSwipeHapticTriggered(prev => ({ ...prev, [message.message_id]: true }));
          }
          handleSwipeOpen(message);
        }}
        onSwipeableClose={() => {
          handleSwipeClose();
          // Reset haptic trigger when swipe closes
          setSwipeHapticTriggered(prev => ({ ...prev, [message.message_id]: false }));
        }}
      >
        <View style={{
          width: '100%',
          backgroundColor: isHighlighted ? 'rgba(255,255,255,0.07)' : 'transparent',
          borderRadius: isHighlighted ? 0 : 0,
          paddingVertical: 0,
          paddingHorizontal: 0,
          // No transition (not supported in RN ViewStyle)
        }}>
          <TouchableWithoutFeedback
            onLongPress={(event) => {
              if (isOwnMessage(message)) {
                // Show hover popup for own messages
                showHoverPopup(message, event);
              } else {
                // Show reaction picker for other messages
                if (bubbleRefs.current[message.message_id]) {
                  bubbleRefs.current[message.message_id].measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
                    setReactionPopupPosition({ x: px, y: py + height, width });
                    setReactionTarget(message);
                    setShowReactionPicker(true);
                  });
                } else {
                  setReactionPopupPosition(null);
                  setReactionTarget(message);
                  setShowReactionPicker(true);
                }
              }
            }}
          >
            <View
              ref={ref => { if (ref) bubbleRefs.current[message.message_id] = ref; }}
              onLayout={() => {}}
              style={{
                flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                alignItems: 'center',
                marginVertical: 6,
                justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                // No highlight here, handled by parent
              }}
            >
                                  <Avatar name={message.sender_name} avatarUrl={message.avatar_url} />
              <View style={{
                maxWidth: '75%',
                alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                marginLeft: isCurrentUser ? 0 : 4,
                marginRight: isCurrentUser ? 4 : 0,
                position: 'relative'
              }}>

                {/* Faded preview of replied-to message */}
                {repliedTo && (
                  <TouchableOpacity
                    onPress={() => navigateToMessage(repliedTo.message_id)}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      borderRadius: 10,
                      padding: 6,
                      marginBottom: 4,
                      alignSelf: 'stretch',
                      borderLeftWidth: 2,
                      borderLeftColor: '#00bfa5',
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#aaa', fontSize: 12 }} numberOfLines={1} ellipsizeMode="tail">
                      {repliedTo.sender_name}: {repliedTo.message_text}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={(event) => {
                    if (isOwnMessage(message)) {
                      showHoverPopup(message, event);
                    }
                  }}
                  activeOpacity={isOwnMessage(message) ? 0.8 : 1}
                >
                  <GlassBubble isCurrentUser={isCurrentUser} isRecipient={!isCurrentUser}>
                    <Text style={{ color: TEXT_COLOR, fontSize: 15, fontWeight: '500' }}>{renderMessageText(message.message_text)}</Text>
                  </GlassBubble>
                </TouchableOpacity>
                {message.reactions && message.reactions.length > 0 && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                    backgroundColor: '#23242b',
                    borderRadius: 12,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginTop: 4,
                    marginLeft: isCurrentUser ? 0 : 46,
                    marginRight: isCurrentUser ? 46 : 0,
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}>
                    {(() => {
                      const reactionCounts = message.reactions.reduce((acc, r) => {
                        acc[r.emoji] = acc[r.emoji] ? acc[r.emoji] + 1 : 1;
                        return acc;
                      }, {} as Record<string, number>);
                      console.log(`[REACTIONS] Rendering reactions for message ${message.message_id}:`, reactionCounts);
                      console.log(`[REACTIONS] Raw reactions array:`, message.reactions);
                      return Object.entries(reactionCounts).map(([emoji, count]) => (
                        <View key={emoji} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 2 }}>
                          <Text style={{ fontSize: 16 }}>{emoji}</Text>
                          {count > 1 && <Text style={{ color: '#aaa', fontSize: 12, marginLeft: 2 }}>{count}</Text>}
                        </View>
                      ));
                    })()}
                  </View>
                )}
                <Text style={{ color: TEXT_SECONDARY, fontSize: 11, marginTop: 4, textAlign: isCurrentUser ? 'right' : 'left' }}>
                  {message.sender_name} • {formatTime(message.created_at)}
                  {message.is_edited && (
                    <Text style={{ color: '#888', fontStyle: 'italic' }}> (edited)</Text>
                  )}
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Swipeable>
    );
  };

  const renderDateSeparator = (date: string) => (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View style={{
        backgroundColor: '#23242b',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 4,
      }}>
        <Text style={{ color: TEXT_COLOR, fontSize: 12, fontWeight: '600' }}>{date}</Text>
      </View>
    </View>
  );

  const renderFlatListData = () => {
    const groups = getMessageGroups();
    const flatData: any[] = [];

    groups.forEach((group, groupIndex) => {
      // Add date separator
      flatData.push({
        type: 'date',
        date: group.date,
        key: `date-${groupIndex}`
      });

      // Add messages
      group.messages.forEach((message) => {
        flatData.push({
          type: 'message',
          ...message,
          key: message.message_id
        });
      });
    });

    // Add announcements at the bottom as new entries
    announcements.forEach((announcement) => {
      flatData.push({
        type: 'announcement',
        ...announcement,
        key: `announcement-${announcement.id}`
      });
    });

    return flatData;
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'date') {
      return renderDateSeparator(item.date);
    }
    if (item.type === 'announcement') {
      return <AnnouncementChatItem announcement={item} onPress={() => onAnnouncementPress?.(item)} />;
    }
    return renderMessage({ item });
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>💬</Text>
      <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }]}>
        Start a conversation with the event organizers
      </Text>
    </View>
  );

  // Typing indicator text
  const typingNames = Object.values(typingUsers).filter(name => name && name !== guest.first_name + ' ' + guest.last_name);
  const typingText = typingNames.length > 0 ? `${typingNames.join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing...` : '';

  // Delete message logic
  const deleteMessage = async (message: Message | null) => {
    if (!message) return;
    setDeleting(true);
    try {
      // Call Supabase RPC for delete (to be implemented on backend)
      const { error } = await supabase.rpc('delete_guests_chat_message', {
        p_message_id: message.message_id,
        p_user_email: guest.email,
      });
      if (error) {
        Alert.alert('Delete Failed', 'Unable to delete message.');
      } else {
        setMessages((prev) => prev.filter((m) => m.message_id !== message.message_id) as Message[]);
        setShowReactionPicker(false); // Close reaction picker on delete
        setReactionTarget(null);
      }
    } catch (e) {
      Alert.alert('Delete Failed', 'Unable to delete message.');
    } finally {
      setDeleting(false);
    }
  };

  // Edit message logic
  const editMessage = async (message: Message | null) => {
    if (!message || !editText.trim()) return;
    try {
      const { error } = await supabase.rpc('edit_guests_chat_message', {
        p_message_id: message.message_id,
        p_user_email: guest.email,
        p_new_text: editText.trim(),
      });
      if (!error) {
        setMessages((prev) => prev.map((m) => m.message_id === message.message_id ? { ...m, message_text: editText.trim() } : m) as Message[]);
        setEditingMessageId(null);
        setEditText('');
        setShowReactionPicker(false); // Close reaction picker on edit
        setReactionTarget(null);
      } else {
        Alert.alert('Edit Failed', 'Unable to edit message.');
      }
    } catch (e) {
      Alert.alert('Edit Failed', 'Unable to edit message.');
    }
  };

  // On emoji tap, add or remove reaction
  const handleReaction = async (message: Message, emoji: string) => {
    console.log(`[REACTIONS] Handling reaction: ${emoji} for message ${message.message_id}`);
    const alreadyReacted = message.reactions?.some(r => r.emoji === emoji && r.user_email === guest.email);
    console.log(`[REACTIONS] Already reacted: ${alreadyReacted}`);
    if (alreadyReacted) {
      const { error } = await supabase.rpc('remove_guests_chat_reaction', {
        p_message_id: message.message_id,
        p_user_email: guest.email,
        p_emoji: emoji,
      });
      if (error) console.error('[REACTIONS] Error removing reaction:', error);
      else console.log('[REACTIONS] Successfully removed reaction');
    } else {
      const { error } = await supabase.rpc('add_guests_chat_reaction', {
        p_message_id: message.message_id,
        p_user_email: guest.email,
        p_emoji: emoji,
      });
      if (error) console.error('[REACTIONS] Error adding reaction:', error);
      else console.log('[REACTIONS] Successfully added reaction');
    }
  };

  // In long-press modal, show options based on eligibility
  const canEdit = selectedMessage && selectedMessage.sender_email === guest.email && (Date.now() - new Date(selectedMessage.created_at).getTime() < 15 * 60 * 1000);
  const canDelete = selectedMessage && (selectedMessage.sender_email === guest.email || selectedMessage.sender_type === 'admin');

  // Helper: is current user's message
  const isOwnMessage = (msg: Message) => msg.sender_email === guest.email;

  // Hover popup management functions (similar to desktop version)
  const showHoverPopup = (message: Message, event: any) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Get the actual position of the message bubble
    if (bubbleRefs.current[message.message_id]) {
      bubbleRefs.current[message.message_id].measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        const viewportWidth = SCREEN_WIDTH;
        const viewportHeight = SCREEN_HEIGHT;
        
        // Smaller popup dimensions
        const popupWidth = 240;
        const popupHeight = 160;
        
        // Calculate center position based on the message bubble
        let x = px + (width / 2) - (popupWidth / 2);
        let y = py + height + 8; // Position below the bubble
        
        // Ensure popup doesn't go off screen
        if (y + popupHeight > viewportHeight - 20) {
          // If it would go below screen, position it above the bubble
          y = py - popupHeight - 8;
        }
        
        // Ensure popup doesn't go off the sides
        if (x < 10) {
          x = 10;
        }
        if (x + popupWidth > viewportWidth - 10) {
          x = viewportWidth - popupWidth - 10;
        }
        
        setHoverPopupState({
          activeMessageId: message.message_id,
          position: { x, y },
          message: message
        });
      });
    } else {
      // Fallback positioning if ref is not available
      const viewportWidth = SCREEN_WIDTH;
      const viewportHeight = SCREEN_HEIGHT;
      const popupWidth = 240;
      const popupHeight = 160;
      
      let x = (viewportWidth - popupWidth) / 2;
      let y = viewportHeight / 2 - popupHeight / 2;
      
      setHoverPopupState({
        activeMessageId: message.message_id,
        position: { x, y },
        message: message
      });
    }
  };

  const hideHoverPopup = () => {
    // Clear any existing timeout first
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set a 3-second delay before hiding
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverPopupState({
        activeMessageId: null,
        position: null,
        message: null
      });
      hoverTimeoutRef.current = null;
    }, 3000);
  };

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Enhanced Hover Popup component (matches desktop functionality)
  const HoverPopup = () => {
    if (!hoverPopupState.activeMessageId || !hoverPopupState.position || !hoverPopupState.message) return null;

    const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥', '💯', '✨', '💪', '🤔', '😎', '🥳', '😴', '🤯', '😍', '🤩', '😭', '🤬', '🤮', '🤧', '🤠', '👻', '🤖', '👽', '👾', '🤡', '👹', '👺', '💀', '☠️'];

    return (
      <>
        {/* Background overlay to handle tap-to-close */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            zIndex: 999998,
          }}
          activeOpacity={1}
          onPress={() => setHoverPopupState({
            activeMessageId: null,
            position: null,
            message: null
          })}
        />
        
        {/* X Close Button - Outside the main popup */}
        <TouchableOpacity
          onPress={() => setHoverPopupState({
            activeMessageId: null,
            position: null,
            message: null
          })}
          style={{
            position: 'absolute',
            top: hoverPopupState.position.y - 15,
            left: hoverPopupState.position.x + 240 - 15,
            backgroundColor: 'rgba(0,0,0,0.8)',
            width: 18,
            height: 18,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 9,
            zIndex: 999999,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>×</Text>
        </TouchableOpacity>

        {/* Main Popup Container */}
        <View
          style={{
            position: 'absolute',
            top: hoverPopupState.position.y,
            left: hoverPopupState.position.x,
            borderRadius: 12,
            padding: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 12,
            zIndex: 999999,
            width: 240,
            borderWidth: 0,
          }}
        >
          {/* Gradient Background */}
          <LinearGradient
            colors={['#2a2a2a', '#1a1a1a', '#0a0a0a']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 16,
            }}
          />

          {/* Emoji reaction picker - Single row with scroll */}
          <View style={{
            height: 40,
            marginBottom: 12,
          }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 6,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emojis.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    handleReaction(hoverPopupState.message!, emoji);
                    setHoverPopupState({
                      activeMessageId: null,
                      position: null,
                      message: null
                    });
                  }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    padding: 6,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginHorizontal: 3,
                    minWidth: 32,
                    minHeight: 32,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Action buttons */}
          <View style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'space-around',
            paddingHorizontal: 4
          }}>
            <TouchableOpacity
              onPress={() => {
                setReplyTo(hoverPopupState.message!);
                setHoverPopupState({
                  activeMessageId: null,
                  position: null,
                  message: null
                });
              }}
              style={{
                backgroundColor: 'rgba(0,191,165,0.3)',
                padding: 8,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                marginHorizontal: 2,
              }}
            >
              <Text style={{ color: '#00bfa5', fontSize: 12, fontWeight: '600' }}>Reply</Text>
            </TouchableOpacity>
            
            {/* Only show Edit/Delete for current user's messages */}
            {hoverPopupState.message.sender_email === guest.email && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setEditingMessageId(hoverPopupState.message!.message_id);
                    setEditText(hoverPopupState.message!.message_text);
                    setEditText(hoverPopupState.message?.message_text || '');
                    setHoverPopupState({
                      activeMessageId: null,
                      position: null,
                      message: null
                    });
                    setReplyTo(null);
                  }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: 8,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: 1,
                    marginHorizontal: 2,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    deleteMessage(hoverPopupState.message!);
                    setHoverPopupState({
                      activeMessageId: null,
                      position: null,
                      message: null
                    });
                  }}
                  disabled={deleting}
                  style={{
                    backgroundColor: 'rgba(255,68,68,0.3)',
                    padding: 8,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: 1,
                    marginHorizontal: 2,
                  }}
                >
                  <Text style={{ color: deleting ? '#888' : '#ff4444', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </>
    );
  };



  // Now do conditional rendering
  if (isInitializing || loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BG_COLOR }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={[styles.loadingText, { color: TEXT_COLOR }]}>
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG_COLOR }}>
      {/* Force status bar to light content (white icons) */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={{ flex: 1, backgroundColor: BG_COLOR, position: 'relative' }}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={renderFlatListData()}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }} // only for input/nav
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            typingText ? (
              <View style={{ paddingTop: 8, paddingBottom: 8 }}>
                <Text style={{ opacity: 0.7, color: '#aaa', fontSize: 12 }}>{typingText}</Text>
              </View>
            ) : null
          }
        />
        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BG_COLOR, borderTopWidth: 1, borderTopColor: '#23242b' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
            <TextInput
              ref={textInputRef}
              style={{
                flex: 1,
                backgroundColor: '#23242b',
                color: TEXT_COLOR,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 15,
                marginRight: 8,
              }}
              placeholder={editingMessageId ? 'Edit message...' : 'Type a message...'}
              placeholderTextColor={TEXT_SECONDARY}
              value={editingMessageId ? editText : newMessage}
              onChangeText={text => {
                if (editingMessageId) setEditText(text); else setNewMessage(text);
                broadcastTyping();
                // Play keyboard tap sound occasionally (not on every keystroke)
                if (text.length % 3 === 0 && text.length > 0) {
                  soundEffects.playKeyboardTap();
                }
              }}
              onSubmitEditing={editingMessageId ? () => handleSaveEdit() : sendMessage}
              returnKeyType="send"
            />
            {editingMessageId ? (
              <>
                <TouchableOpacity onPress={() => handleSaveEdit()} style={{ marginRight: 8 }}>
                  <Text style={{ color: '#00bfa5', fontSize: 18 }}>✔️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCancelEdit()}>
                  <Text style={{ color: '#aaa', fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  sendMessage();
                  soundEffects.playSendMessage();
                }}
                disabled={!newMessage.trim() || sending}
                style={{
                  backgroundColor: !newMessage.trim() || sending ? '#23242b' : ADMIN_BUBBLE,
                  borderRadius: 16,
                  padding: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
        {/* Edit in place UI */}
      {editingMessageId && selectedMessage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditingMessageId(null)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={() => setEditingMessageId(null)}>
            <View style={{ position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: '#23242b', borderRadius: 16, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>Edit Message</Text>
              <TextInput
                value={editText}
                onChangeText={(text) => {
                  setEditText(text);
                  // Play keyboard tap sound occasionally
                  if (text.length % 3 === 0 && text.length > 0) {
                    soundEffects.playKeyboardTap();
                  }
                }}
                style={{ color: '#fff', backgroundColor: '#181A20', borderRadius: 8, padding: 12, width: '100%', marginBottom: 16 }}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={() => setEditingMessageId(null)} style={{ padding: 10 }}>
                  <Text style={{ color: '#aaa', fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => editMessage(selectedMessage)} style={{ padding: 10, backgroundColor: '#00bfa5', borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 15 }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {/* Reply UI */}
      {replyTo && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#23242b', borderRadius: 8, margin: 8, marginBottom: 0, padding: 8, position: 'absolute', left: 0, right: 0, bottom: 64, zIndex: 30 }}>
          <Text style={{ color: '#aaa', fontSize: 12, marginRight: 8 }}>Replying to:</Text>
          <Text style={{ color: '#fff', fontSize: 13, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{replyTo.message_text}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={{ marginLeft: 8 }}>
            <Text style={{ color: '#aaa', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Hover popup */}
      <HoverPopup />
      
      {/* Reaction picker modal */}
      <Modal visible={showReactionPicker} transparent animationType="fade" onRequestClose={() => setShowReactionPicker(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowReactionPicker(false)}>
          {reactionPopupPosition ? (
            <View style={{
              position: 'absolute',
              left: reactionPopupPosition.x,
              top: reactionPopupPosition.y + 4,
              width: reactionPopupPosition.width,
              backgroundColor: '#23242b',
              borderRadius: 16,
              padding: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                {commonEmojis.map((emoji) => (
                  <TouchableOpacity key={emoji} onPress={() => { if (reactionTarget) handleReaction(reactionTarget, emoji); setShowReactionPicker(false); }} style={{ marginHorizontal: 4 }}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </TouchableOpacity>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

// Helper to compare optimistic and real messages
function isSameMessage(opt: Message, real: Message) {
  return (
    opt.sender_email === real.sender_email &&
    opt.message_text === real.message_text &&
    Math.abs(new Date(opt.created_at).getTime() - new Date(real.created_at).getTime()) < 10000 // 10s window
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messagesContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.7,
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  messageBubbleLeft: {
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    borderTopRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  readStatus: {
    fontSize: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 