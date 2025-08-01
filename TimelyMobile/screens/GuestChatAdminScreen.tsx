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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import GlobalHeader from '../components/GlobalHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  
  // Action sheet state for mobile long-press
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const bubbleRefs = useRef<{ [key: string]: any }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    console.log('[DEBUG] useEffect triggered - currentUser:', currentUser?.email, 'eventId:', eventId);
    if (currentUser && eventId) {
      loadMessages();
      setupSubscription();
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
      console.log('[DEBUG] Loading current user...');
      const authResponse = await getCurrentUser();
      console.log('[DEBUG] Auth response:', authResponse);
      
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
            console.log('[DEBUG] User data from database:', userData);
            // Create user object with name from database
            const userWithName = {
              ...authResponse.user,
              name: userData.name || authResponse.user.email,
              avatar_url: userData.avatar_url,
              company_id: userData.company_id
            };
            setCurrentUser(userWithName);
            console.log('[DEBUG] Current user set with name:', userWithName.name);
          } else {
            setCurrentUser(authResponse.user);
            console.log('[DEBUG] Current user set (no database data):', authResponse.user.email);
          }
        } else {
        console.log('[DEBUG] No current user found');
        console.log('[DEBUG] Auth error:', authResponse.error);
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
      const offset = Math.max(0, totalMessages - limit - messages.length); // Get older messages
      
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
    if (!eventId) return;
    
    try {
      console.log('📨 Loading messages for event:', eventId);
      
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

    const ch = supabase.channel(`guests-chat-admin-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guests_chat_messages',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {
        console.log('📨 New message received:', payload.new);
        // Only add new message if it's not our own message
        if (payload.new.sender_email !== currentUser?.email) {
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
      .subscribe();

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
      console.log('🔍 Screen focused, reloading messages');
      loadMessages();
    }
  }, [currentUser, eventId]);

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
      // Check if user already has this reaction
      const existingReaction = reactions?.[messageId]?.[emoji]?.reacted;
      
      if (existingReaction) {
        await supabase.rpc('remove_guests_chat_reaction', {
          p_message_id: messageId,
          p_user_email: currentUser.email,
          p_emoji: emoji
        });
      } else {
        await supabase.rpc('add_guests_chat_reaction', {
          p_message_id: messageId,
          p_user_email: currentUser.email,
          p_emoji: emoji
        });
      }
      
      // Optimistic update
      setReactions(prev => {
        const updated = { ...prev };
        if (!updated[messageId]) updated[messageId] = {};
        
        if (existingReaction) {
          if (updated[messageId][emoji].count <= 1) {
            delete updated[messageId][emoji];
          } else {
            updated[messageId][emoji] = {
              count: updated[messageId][emoji].count - 1,
              reacted: false
            };
          }
        } else {
          updated[messageId][emoji] = {
            count: (updated[messageId][emoji]?.count || 0) + 1,
            reacted: true
          };
        }
        
        return updated;
      });
      
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleReply = (message: Message) => {
    console.log('[REPLY DEBUG] Setting replyTo to:', message.message_text);
    console.log('[REPLY DEBUG] Message sender_name:', message.sender_name);
    console.log('[REPLY DEBUG] Message sender_email:', message.sender_email);
    setReplyTo(message);
    replyToRef.current = message;
    setShowActionSheet(false);
    console.log('[REPLY DEBUG] Reply state set, should show UI');
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

  const renderReactions = (messageReactions: {[emoji: string]: {count: number, reacted: boolean}}) => {
    if (!messageReactions || Object.keys(messageReactions).length === 0) return null;
    
    return (
      <View style={styles.reactionsContainer}>
        {Object.entries(messageReactions).map(([emoji, info]) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionBubble,
              info.reacted && styles.reactionBubbleReacted
            ]}
            onPress={() => handleReaction(selectedMessage?.message_id || '', emoji)}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {info.count > 1 && (
              <Text style={styles.reactionCount}>{info.count}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMessage = (message: Message) => {
    // Check if this message is from the current user
    // If currentUser is not loaded yet, assume it's not the current user's message
    const isCurrentUser = currentUser && message.sender_email === currentUser.email;
    
    const messageReactions = reactions?.[message.message_id] || {};
    const hasReactions = Object.keys(messageReactions).length > 0;

    return (
      <TouchableOpacity
        key={message.message_id}
        style={[styles.messageContainer, isCurrentUser ? styles.sentMessage : styles.receivedMessage]}
        onLongPress={() => handleLongPress(message)}
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

        <View style={[styles.messageContentWrapper, isCurrentUser && styles.sentMessageContent]}>
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
            isCurrentUser ? styles.sentBubble : styles.receivedBubble
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
                    onPress={() => selectedMessage && handleDelete(selectedMessage)}
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
                    <>
                      <Text style={styles.loadOlderIcon}>⬆️</Text>
                      <Text style={styles.loadOlderText}>Load Older Messages</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>Start a conversation with your guests</Text>
              </View>
            ) : (
              messages.map(renderMessage)
            )}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
});

export default GuestChatAdminScreen; 