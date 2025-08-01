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
import announcementService from '../lib/announcementService';

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
  console.log('[DEBUG] Event name from params:', eventName);
  console.log('[DEBUG] Event ID from params:', eventId);
  console.log('[DEBUG] Guest object:', guest);
  console.log('[DEBUG] Guest event_id:', guest?.event_id);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Debug messages state changes
  useEffect(() => {
    console.log('📨 Messages state updated, count:', messages.length);
    if (messages.length > 0) {
      console.log('📨 Last message:', messages[messages.length - 1]);
    }
  }, [messages]);
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
  const [channel, setChannel] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [onlineGuests, setOnlineGuests] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const bubbleRefs = useRef<{ [key: string]: any }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    console.log('🔄 useEffect triggered with eventId:', eventId);
    console.log('🔄 Guest data:', guest);
    console.log('🔄 Guest event_id:', guest?.event_id);
    
    if (guest && guest.event_id) {
      console.log('✅ Guest data available, setting up polling');
      loadMessages();
      setupPolling();
      setupAnnouncementSubscription();
    } else {
      console.log('❌ Guest data not available yet');
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
        console.log('🔄 Polling interval cleared');
      }
      // Clear typing timeouts
      Object.values(typingTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [eventId, guest]);

  // Auto-scroll to bottom when messages change or screen is focused
  useEffect(() => {
    const scrollToBottom = () => {
      if (flatListRef.current && messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    // Scroll to bottom when messages change
    if (messages.length > 0) {
      scrollToBottom();
    }

    // Add focus listener
    const unsubscribe = navigation.addListener('focus', () => {
      setTimeout(scrollToBottom, 200);
    });

    return unsubscribe;
  }, [messages, navigation]);

  // Function to enrich messages with avatar URLs for admin users
  const enrichMessagesWithAvatars = async (messages: any[]) => {
    const enrichedMessages = [...messages];
    
    // Get unique admin user emails
    const adminEmails = [...new Set(
      messages
        .filter(msg => msg.sender_type === 'admin')
        .map(msg => msg.sender_email)
    )];
    
    console.log('[AVATAR ENRICHMENT] Admin emails found:', adminEmails);
    
    if (adminEmails.length > 0) {
      // Fetch avatar URLs for admin users
      const { data: users, error } = await supabase
        .from('users')
        .select('email, avatar_url')
        .in('email', adminEmails);
      
      console.log('[AVATAR ENRICHMENT] Users fetched:', users);
      console.log('[AVATAR ENRICHMENT] Error:', error);
      
      if (!error && users) {
        // Create a map of email to avatar_url
        const avatarMap = users.reduce((map: any, user: any) => {
          map[user.email] = user.avatar_url;
          return map;
        }, {});
        
        console.log('[AVATAR ENRICHMENT] Avatar map:', avatarMap);
        
        // Enrich messages with avatar URLs
        enrichedMessages.forEach(msg => {
          if (msg.sender_type === 'admin' && avatarMap[msg.sender_email]) {
            msg.avatar_url = avatarMap[msg.sender_email];
            console.log(`[AVATAR ENRICHMENT] Added avatar for ${msg.sender_email}:`, avatarMap[msg.sender_email]);
          }
        });
      }
    }
    
    return enrichedMessages;
  };

  const loadOlderMessages = async () => {
    if (!guest || !guest.event_id || loadingOlder || !hasMoreMessages) {
      return;
    }
    
    setLoadingOlder(true);
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
      const offset = Math.max(0, totalMessages - limit - messages.length); // Get older messages
      
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
      
      if (newMessages.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(newMessages);
      
      // Add older messages to the beginning
      setMessages(prev => [...enrichedMessages, ...prev]);
      
      // Check if we have more messages to load
      if (newMessages.length < 50) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error in loadOlderMessages:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const loadMessages = async () => {
    if (!guest || !guest.event_id) return;
    
    try {
      console.log('📨 Loading messages for event:', guest.event_id);
      
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
      
      const { data, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: guest.event_id,
        p_user_email: guest.email,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      console.log('📨 Loaded messages:', data?.length || 0);
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(data || []);
      setMessages(enrichedMessages);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      setIsLoading(false);
    }
  };



  const sendMessage = async () => {
    if (!messageText.trim() || !guest || !guest.event_id) return;

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
      if (data && data.success) {
        // The SQL function returns JSON, not an array
        setMessages(prev => prev.map(msg => 
          msg.message_id === optimisticMessage.message_id ? {
            message_id: data.message_id,
            event_id: guest.event_id,
            sender_email: guest.email,
            sender_name: data.sender_name,
            sender_type: data.sender_type,
            avatar_url: guest.avatar_url,
            message_text: textToSend,
            message_type: 'text',
            created_at: new Date().toISOString(),
            company_id: guest.company_id,
            is_edited: false,
            edited_at: undefined,
            reply_to_message_id: replyTo?.message_id,
            reactions: []
          } : msg
        ));
      }

      setReplyTo(null);
    } catch (error) {
      console.error('[GUESTS_CHAT] Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
      setMessageText(textToSend); // Restore message text
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

    try {
      const { error } = await supabase.rpc('add_guests_chat_reaction', {
        p_message_id: message.message_id,
        p_user_email: guest.email,
        p_emoji: emoji
      });

      if (error) {
        console.error('Error adding reaction:', error);
        return;
      }

      // Optimistic update
      setMessages(prev => prev.map(msg => {
        if (msg.message_id === message.message_id) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.user_email === guest.email && r.emoji === emoji);
          
          if (existingReaction) {
            return msg; // Already reacted
          }
          
          return {
            ...msg,
            reactions: [...reactions, { emoji, user_email: guest.email }]
          };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Error adding reaction:', error);
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

    const setupPolling = () => {
    console.log('🔄 setupPolling called');
    if (!guest || !guest.event_id) {
      console.log('❌ Cannot setup polling - missing guest or event_id');
      return;
    }

    console.log('🔄 Setting up polling for event:', guest.event_id);
    
    // Poll every 2 seconds for new messages
    const pollInterval = setInterval(async () => {
      try {
        console.log('🔄 Polling for new messages...');
        const { data: newMessages, error } = await supabase
          .rpc('get_guests_chat_messages', {
            p_event_id: guest.event_id,
            p_user_email: guest.email,
            p_limit: 1000,
            p_offset: 0
          });

        if (error) {
          console.log('❌ Polling error:', error);
          return;
        }

        if (newMessages && newMessages.length > 0) {
          console.log('🔄 Polling found messages:', newMessages.length);
          console.log('🔄 Latest message from polling:', newMessages[newMessages.length - 1]);
          
          // Enrich messages with avatars
          const enrichedMessages = await enrichMessagesWithAvatars(newMessages);
          
          setMessages(prev => {
            // Check for new messages that aren't already in state
            const existingIds = new Set(prev.map(msg => msg.message_id));
            const trulyNewMessages = enrichedMessages.filter(msg => !existingIds.has(msg.message_id));
            
            if (trulyNewMessages.length > 0) {
              console.log('🔄 Adding new messages from polling:', trulyNewMessages.length);
              console.log('🔄 New message details:', trulyNewMessages[0]);
              const updated = [...prev, ...trulyNewMessages];
              return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            } else {
              console.log('🔄 No new messages found in polling');
            }
            
            return prev;
          });
        } else {
          console.log('🔄 No messages returned from polling');
        }
      } catch (error) {
        console.log('❌ Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Store the interval ID so we can clear it later
    setPollingInterval(pollInterval);
    console.log('🔄 Polling interval set:', pollInterval);
  };

  const setupAnnouncementSubscription = () => {
    if (!guest || !guest.event_id) return;

    announcementService.subscribeToAnnouncements(guest.event_id, (newAnnouncement) => {
      console.log('📢 New announcement received:', newAnnouncement);
      setAnnouncements(prev => {
        const updated = [...prev, newAnnouncement];
        // Sort by created_at to maintain chronological order
        return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    });
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
        console.log('[TYPING] User started typing:', email, name);
        setTypingUsers(prev => [...prev, email]);
      } else {
        console.log('[TYPING] User stopped typing:', email, name);
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
        console.log('[TYPING] Error cleaning up typing subscription:', error);
      }
    };
  }, [channel, guest]);

  const renderFlatListData = () => {
    // Combine messages and announcements
    const allItems = [
      ...messages.map(msg => ({ ...msg, type: 'message' as const })),
      ...announcements.map(ann => ({ ...ann, type: 'announcement' as const }))
    ];

    // Sort by created_at timestamp
    const sortedItems = allItems.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group by date
    const groupedItems: { [key: string]: any[] } = {};
    sortedItems.forEach(item => {
      const date = new Date(item.created_at).toDateString();
      if (!groupedItems[date]) {
        groupedItems[date] = [];
      }
      groupedItems[date].push(item);
    });

    return Object.entries(groupedItems).map(([date, items]) => ({
      date,
      data: items
    }));
  };

  const renderMessage = (message: Message) => {
    // Check if this message is from the current user (guest)
    const ownMessage = message.sender_email === guest?.email;
    
    console.log(`[DEBUG] Message from ${message.sender_email}, guest email: ${guest?.email}, ownMessage: ${ownMessage}, sender_type: ${message.sender_type}`);

    return (
      <TouchableOpacity
        key={message.message_id}
        style={[styles.messageContainer, ownMessage ? styles.ownMessage : styles.otherMessage]}
        onLongPress={() => handleLongPress(message)}
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
                  console.log('[AVATAR ERROR] Failed to load image:', message.avatar_url, error);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {message.sender_name?.charAt(0)?.toUpperCase() || '?'}
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
                  console.log('[AVATAR ERROR] Failed to load image:', message.avatar_url, error);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {message.sender_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
        )}

        <View style={styles.messageContent}>
          {/* Reply preview */}
          {message.reply_to_message_id && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyText}>
                {messages.find(m => m.message_id === message.reply_to_message_id)?.message_text || 'Original message not found'}
              </Text>
            </View>
          )}
          
          <View style={[styles.messageBubble, ownMessage ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, ownMessage ? styles.ownMessageText : styles.otherMessageText]}>
              {message.message_text}
            </Text>
          </View>
          
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

  const renderAnnouncement = (announcement: Announcement) => {
    return (
      <View key={announcement.id} style={styles.announcementContainer}>
        <View style={styles.announcementBubble}>
          <Text style={styles.announcementTitle}>{announcement.title}</Text>
          <Text style={styles.announcementMessage}>{announcement.description}</Text>
          <Text style={styles.announcementTime}>
            {new Date(announcement.created_at).getHours().toString().padStart(2, '0')}:{new Date(announcement.created_at).getMinutes().toString().padStart(2, '0')}
          </Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    // Safety check for undefined or null items
    if (!item) {
      console.log('[DEBUG] renderItem called with null/undefined item');
      return null;
    }
    
    if (item.type === 'message') {
      return renderMessage(item);
    } else if (item.type === 'announcement') {
      return renderAnnouncement(item);
    }
    
    console.log('[DEBUG] renderItem called with unknown item type:', item);
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
                        deleteMessage(selectedMessage);
                      }
                      setShowActionSheet(false);
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

  return (
    <View style={styles.container}>
      <GlobalHeader
        title={eventName || guest?.event_name || "Chat"}
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => {}}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={renderFlatListData()}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View>
              <Text style={styles.dateHeader}>{item.date}</Text>
              {item.data.map((dataItem) => renderItem({ item: dataItem }))}
            </View>
          )}
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
                    <>
                      <Text style={styles.loadOlderIcon}>⬆️</Text>
                      <Text style={styles.loadOlderText}>Load Older Messages</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
        
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
                !(editingMessageId ? editText.trim() : messageText.trim()) && styles.sendButtonDisabled
              ]}
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
        </View>
      </KeyboardAvoidingView>
      
      <ActionSheetModal />
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
    maxWidth: '90%',
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
  },
  replyText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    gap: 8,
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
});

export default GuestChatScreen; 