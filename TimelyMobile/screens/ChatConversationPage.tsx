import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: 'text' | 'file' | 'image' | 'audio' | 'location';
  is_edited: boolean;
  edited_at?: string;
  reply_to_message_id?: string;
  reply_to_content?: string;
  reply_to_sender_name?: string;
  reactions?: Reaction[];
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface ChatInfo {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'team';
  participants: User[];
  team_id?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  last_seen?: string;
}

interface ChatConversationPageProps {
  route: {
    params: {
      chatId: string;
      chatName: string;
    };
  };
  navigation: any;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥', '💯', '✨', '💪', '🤔', '😎', '🥳', '😴', '🤯', '😍', '🤩', '😭', '🤬', '🤮', '🤧', '🤠', '👻', '🤖', '👽', '👾', '🤡', '👹', '👺', '💀', '☠️'];

export default function ChatConversationPage({ route, navigation }: ChatConversationPageProps) {
  const insets = useSafeAreaInsets();
  const { chatId, chatName } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    getCurrentUser();
  }, [chatId]);

  useEffect(() => {
    if (currentUser) {
      loadMessages();
      setupRealtimeSubscription();
    }
  }, [currentUser, chatId]);

  useEffect(() => {
    if (currentUser) {
      loadChatInfo();
    }
  }, [currentUser, chatId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
    }
  };

  const loadChatInfo = async () => {
    try {
      console.log('🔍 Loading chat info for chatId:', chatId);
      console.log('🔍 Current user:', currentUser?.id);
      
      // Get chat details
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError) {
        console.error('Error loading chat info:', chatError);
        return;
      }

      console.log('📋 Chat data:', chatData);

      // Get participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('chat_participants')
        .select(`
          user_id,
          users!chat_participants_user_id_fkey(
            id,
            name,
            email,
            avatar_url,
            status,
            last_seen
          )
        `)
        .eq('chat_id', chatId);

      if (participantsError) {
        console.error('Error loading participants:', participantsError);
        return;
      }

      console.log('👥 Participants data:', participantsData);

      const participantsList = participantsData.map((p: any) => p.users).filter(Boolean);
      setParticipants(participantsList);

      // For direct chats, show the other person's name
      let displayName = chatData.name;
      if (chatData.type === 'direct' && currentUser && participantsList.length === 2) {
        const otherParticipant = participantsList.find(p => p.id !== currentUser.id);
        if (otherParticipant) {
          displayName = otherParticipant.name;
        }
      }

      console.log('📝 Display name:', displayName);

      setChatInfo({
        id: chatData.id,
        name: displayName,
        type: chatData.type,
        participants: participantsList,
        team_id: chatData.team_id
      });
    } catch (error) {
      console.error('Error loading chat info:', error);
    }
  };

  const setupUserStatusSubscription = () => {
    if (!chatInfo) return;

    const subscription = supabase.channel(`user-status-${chatId}`).on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users',
        filter: `id=in.(${participants.map(p => p.id).join(',')})`
      },
      (payload) => {
        const updatedUser = payload.new as User;
        setParticipants(prev => 
          prev.map(p => p.id === updatedUser.id ? { ...p, ...updatedUser } : p)
        );
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  useEffect(() => {
    if (participants.length > 0) {
      return setupUserStatusSubscription();
    }
  }, [participants]);

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case 'online':
        return { color: '#00ff88', text: 'Online' };
      case 'away':
        return { color: '#ffaa00', text: 'Away' };
      case 'busy':
        return { color: '#ff4444', text: 'Busy' };
      default:
        return { color: '#666', text: 'Offline' };
    }
  };

  const getStatusText = () => {
    if (!chatInfo) return '';
    
    if (chatInfo.type === 'direct') {
      const otherParticipant = participants.find(p => p.id !== currentUser?.id);
      if (otherParticipant) {
        const status = getStatusIndicator(otherParticipant.status);
        return status.text;
      }
    } else {
      // For group/team chats, show participant count and online count
      const onlineCount = participants.filter(p => p.status === 'online').length;
      return `${participants.length} participants • ${onlineCount} online`;
    }
    
    return '';
  };

  const loadMessages = async () => {
    try {
      console.log('🔍 Loading messages for chatId:', chatId);
      
      if (!currentUser) {
        console.log('❌ No current user, skipping message load');
        return;
      }

      // First check if user has access to this chat
      const { data: chatAccess, error: accessError } = await supabase
        .from('chats')
        .select(`
          id,
          chat_participants!inner(user_id)
        `)
        .eq('id', chatId)
        .eq('chat_participants.user_id', currentUser.id)
        .single();

      if (accessError || !chatAccess) {
        console.error('❌ Chat access denied:', accessError);
        Alert.alert('Error', 'You do not have access to this chat');
        return;
      }

      console.log('✅ Chat access confirmed, loading messages...');
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, name, avatar_url)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      console.log('📨 Messages loaded:', data?.length || 0, 'messages');
      console.log('📨 Messages data:', data);

      const processedMessages = data.map((msg: any) => ({
        ...msg,
        sender: msg.sender,
      }));

      setMessages(processedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase.channel(`messages-${chatId}`).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async (content: string, messageType: 'text' | 'file' | 'image' | 'audio' | 'location' = 'text') => {
    if (!content.trim() || !currentUser) return;

    // Create optimistic message for instant display
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      message_type: messageType,
      is_edited: false,
      reply_to_message_id: replyingTo?.id,
      reply_to_content: replyingTo?.content,
      reply_to_sender_name: replyingTo?.sender?.name,
      sender: {
        id: currentUser.id,
        name: currentUser.name || currentUser.email || 'You',
        avatar: currentUser.avatar_url
      }
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setReplyingTo(null);
    scrollToBottom();

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: content.trim(),
          message_type: messageType,
          reply_to_message_id: replyingTo?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message');
        // Remove optimistic message if failed
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      } else {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessage.id ? data : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message if failed
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setShowActionMenu(false);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setEditText(message.content);
    setShowActionMenu(false);
  };

  const handleDelete = async (message: Message) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', message.id);

              if (error) {
                console.error('Error deleting message:', error);
                Alert.alert('Error', 'Failed to delete message');
              } else {
                setMessages(prev => prev.filter(msg => msg.id !== message.id));
              }
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: editText.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', editingMessage.id);

      if (error) {
        console.error('Error updating message:', error);
        Alert.alert('Error', 'Failed to update message');
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === editingMessage.id
            ? { ...msg, content: editText.trim(), is_edited: true, edited_at: new Date().toISOString() }
            : msg
        ));
        setEditingMessage(null);
        setEditText('');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      Alert.alert('Error', 'Failed to update message');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      // Get current reactions for this message
      const message = messages.find(msg => msg.id === messageId);
      const currentReactions = message?.reactions || [];
      
      // Check if user already reacted with this emoji
      const existingReaction = currentReactions.find(r => r.emoji === emoji);
      const userReacted = existingReaction?.users.includes(currentUser.id);

      if (userReacted) {
        // Remove reaction
        const updatedReactions = currentReactions.map(r => {
          if (r.emoji === emoji) {
            return {
              ...r,
              users: r.users.filter(u => u !== currentUser.id),
              count: r.count - 1
            };
          }
          return r;
        }).filter(r => r.count > 0);

        // Update message with new reactions
        const { error } = await supabase
          .from('messages')
          .update({ reactions: updatedReactions })
          .eq('id', messageId);

        if (!error) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, reactions: updatedReactions } : msg
          ));
        }
      } else {
        // Add reaction
        let updatedReactions;
        if (existingReaction) {
          updatedReactions = currentReactions.map(r => {
            if (r.emoji === emoji) {
              return {
                ...r,
                users: [...r.users, currentUser.id],
                count: r.count + 1
              };
            }
            return r;
          });
        } else {
          updatedReactions = [...currentReactions, {
            emoji,
            users: [currentUser.id],
            count: 1
          }];
        }

        const { error } = await supabase
          .from('messages')
          .update({ reactions: updatedReactions })
          .eq('id', messageId);

        if (!error) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, reactions: updatedReactions } : msg
          ));
        }
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleLongPress = (message: Message, event: any) => {
    setSelectedMessage(message);
    
    // Get screen dimensions
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    
    // Calculate popup dimensions
    const popupWidth = 240;
    const popupHeight = 120; // Approximate height
    
    // Calculate position, ensuring it stays within screen bounds
    let x = event.nativeEvent.pageX - (popupWidth / 2);
    let y = event.nativeEvent.pageY - popupHeight - 20; // Position above touch point
    
    // Ensure popup doesn't go off-screen
    if (x < 10) x = 10;
    if (x + popupWidth > screenWidth - 10) x = screenWidth - popupWidth - 10;
    if (y < 10) y = event.nativeEvent.pageY + 20; // Show below if not enough space above
    
    setActionMenuPosition({ x, y });
    setShowActionMenu(true);
  };

  const handleEmojiPress = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const selectEmoji = (emoji: string) => {
    if (editingMessage) {
      setEditText(prev => prev + emoji);
    } else {
      setNewMessage(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleAttachmentPress = () => {
    setShowAttachmentMenu(!showAttachmentMenu);
  };

  const handleCameraPress = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0].uri);
    }
    setShowAttachmentMenu(false);
  };

  const handleGalleryPress = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Gallery permission is required to select images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0].uri);
    }
    setShowAttachmentMenu(false);
  };

  const sendImageMessage = async (imageUri: string) => {
    // For now, just send the image URI as text
    // In a real app, you'd upload the image to storage and send the URL
    await sendMessage(`📷 Image: ${imageUri}`, 'image');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === currentUser?.id;
    const hasReactions = item.reactions && item.reactions.length > 0;

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {/* Reply preview */}
        {item.reply_to_content && (
          <View style={[styles.replyPreview, isOwnMessage ? styles.ownReplyPreview : styles.otherReplyPreview]}>
            <Text style={styles.replySender}>{item.reply_to_sender_name}</Text>
            <Text style={styles.replyContent} numberOfLines={1}>
              {item.reply_to_content}
            </Text>
          </View>
        )}

        {/* Message bubble with swipe to reply */}
        <PanGestureHandler
          onGestureEvent={(event) => {
            if (event.nativeEvent.translationX < -50) {
              // Swipe left to reply
              handleReply(item);
            }
          }}
        >
          <TouchableOpacity
            style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}
            onLongPress={(event) => handleLongPress(item, event)}
            activeOpacity={0.8}
          >
          {/* Message content */}
          {item.message_type === 'text' && (
            <Text style={styles.messageText}>{item.content}</Text>
          )}

          {item.message_type === 'image' && (
            <Image source={{ uri: item.content }} style={styles.messageImage} />
          )}

          {/* Edited indicator */}
          {item.is_edited && (
            <Text style={styles.editedIndicator}>edited</Text>
          )}
        </TouchableOpacity>
        </PanGestureHandler>

        {/* Timestamp outside bubble */}
        <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>

        {/* Reactions */}
        {hasReactions && (
          <View style={styles.reactionsContainer}>
            {item.reactions?.map((reaction, index) => (
              <TouchableOpacity
                key={`${reaction.emoji}-${index}`}
                style={styles.reactionButton}
                onPress={() => handleReaction(item.id, reaction.emoji)}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text style={styles.reactionCount}>{reaction.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

    return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => setShowInfoSidebar(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerTitle}>{chatInfo?.name || chatName}</Text>
          <Text style={styles.headerSubtitle}>{getStatusText()}</Text>
        </TouchableOpacity>
        <View style={styles.menuButton}>
          {/* Removed 3 dots - long-press functionality handles actions */}
        </View>
      </View>

      {/* Messages Container */}
      <View style={styles.messagesContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start a conversation!</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Reply/Edit Preview */}
      {(replyingTo || editingMessage) && (
        <View style={styles.previewContainer}>
          <View style={styles.previewContent}>
            <Text style={styles.previewLabel}>
              {replyingTo ? `Replying to ${replyingTo.sender.name}:` : 'Editing:'}
            </Text>
            <Text style={styles.previewText} numberOfLines={1}>
              {replyingTo?.content || editingMessage?.content}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              setEditText('');
            }}
            style={styles.previewCloseButton}
          >
            <MaterialCommunityIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={editingMessage ? editText : newMessage}
            onChangeText={editingMessage ? setEditText : setNewMessage}
            placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
            placeholderTextColor="#666"
            multiline
            maxLength={1000}
          />
          
          <View style={styles.inputButtons}>
            <TouchableOpacity onPress={handleEmojiPress} style={styles.inputButton}>
              <MaterialCommunityIcons name="emoticon-outline" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleAttachmentPress} style={styles.inputButton}>
              <MaterialCommunityIcons name="paperclip" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                if (editingMessage) {
                  handleSaveEdit();
                } else {
                  sendMessage(newMessage);
                }
              }}
              disabled={editingMessage ? !editText.trim() : !newMessage.trim()}
              style={[styles.sendButton, (!editingMessage ? !newMessage.trim() : !editText.trim()) && styles.sendButtonDisabled]}
            >
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiPicker}>
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiButton}
                  onPress={() => selectEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Attachment Menu Modal */}
      <Modal
        visible={showAttachmentMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentMenu(false)}
        >
          <View style={styles.attachmentMenu}>
            <TouchableOpacity style={styles.attachmentOption} onPress={handleCameraPress}>
              <MaterialCommunityIcons name="camera" size={24} color="#fff" />
              <Text style={styles.attachmentText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentOption} onPress={handleGalleryPress}>
              <MaterialCommunityIcons name="image" size={24} color="#fff" />
              <Text style={styles.attachmentText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Action Menu Modal - Matching Guest Style */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        {selectedMessage && actionMenuPosition && (
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
              onPress={() => setShowActionMenu(false)}
            />
            
            {/* X Close Button - Outside the main popup */}
            <TouchableOpacity
              onPress={() => setShowActionMenu(false)}
              style={{
                position: 'absolute',
                top: actionMenuPosition.y - 15,
                left: actionMenuPosition.x + 240 - 15,
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
                top: actionMenuPosition.y,
                left: actionMenuPosition.x,
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
                  {EMOJIS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        handleReaction(selectedMessage.id, emoji);
                        setShowActionMenu(false);
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
                    handleReply(selectedMessage);
                    setShowActionMenu(false);
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
                {selectedMessage.sender_id === currentUser?.id && (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        handleEdit(selectedMessage);
                        setShowActionMenu(false);
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
                        handleDelete(selectedMessage);
                        setShowActionMenu(false);
                      }}
                      style={{
                        backgroundColor: 'rgba(239,68,68,0.3)',
                        padding: 8,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        flex: 1,
                        marginHorizontal: 2,
                      }}
                    >
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </Modal>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(false)}
        >
          <View style={styles.reactionPicker}>
            <ScrollView contentContainerStyle={styles.reactionGrid}>
              {EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reactionButton}
                  onPress={() => {
                    if (selectedMessage) {
                      handleReaction(selectedMessage.id, emoji);
                    }
                    setShowReactionPicker(false);
                  }}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Information Sidebar Modal */}
      <Modal
        visible={showInfoSidebar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInfoSidebar(false)}
      >
        <View style={styles.infoSidebarOverlay}>
          <View style={styles.infoSidebar}>
            {/* Header */}
            <View style={styles.infoSidebarHeader}>
              <Text style={styles.infoSidebarTitle}>Chat Information</Text>
              <TouchableOpacity 
                onPress={() => setShowInfoSidebar(false)}
                style={styles.infoSidebarCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Chat Info */}
            <View style={styles.infoSection}>
              <View style={styles.chatAvatarContainer}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>
                    {chatInfo?.name ? chatInfo.name.charAt(0).toUpperCase() : 'C'}
                  </Text>
                </View>
                <Text style={styles.chatName}>{chatInfo?.name || chatName}</Text>
                <Text style={styles.chatType}>
                  {chatInfo?.type === 'direct' ? 'Direct message' : `${chatInfo?.participants.length || 0} members`}
                </Text>
              </View>
            </View>

            {/* Participants */}
            {chatInfo?.type !== 'direct' && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Members ({participants.length})</Text>
                <ScrollView style={styles.participantsList}>
                  {participants.map((participant, index) => (
                    <View key={index} style={styles.participantItem}>
                      <View style={styles.participantAvatar}>
                        <Text style={styles.participantAvatarText}>
                          {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                        <View style={[
                          styles.statusIndicator,
                          { backgroundColor: getStatusIndicator(participant.status).color }
                        ]} />
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>
                          {participant.name} {participant.id === currentUser?.id && '(You)'}
                        </Text>
                        <Text style={styles.participantStatus}>
                          {getStatusIndicator(participant.status).text}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Chat Settings */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Chat Settings</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <View style={styles.toggleSwitch}>
                  <View style={styles.toggleTrack}>
                    <View style={styles.toggleThumb} />
                  </View>
                </View>
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Pin Chat</Text>
                <View style={styles.toggleSwitch}>
                  <View style={styles.toggleTrack}>
                    <View style={styles.toggleThumb} />
                  </View>
                </View>
              </View>
            </View>
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
    minHeight: 0, // Important for flex layout
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    minHeight: 0, // Important for flex layout
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    minHeight: 0, // Important for flex layout
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  replyPreview: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    maxWidth: '80%',
  },
  ownReplyPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-end',
  },
  otherReplyPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
  },
  replySender: {
    fontSize: 12,
    color: '#00ff88',
    fontWeight: '600',
  },
  replyContent: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    position: 'relative',
  },
  ownBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginTop: 4,
  },
  editedIndicator: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewContent: {
    flex: 1,
    marginRight: 12,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 2,
  },
  previewCloseButton: {
    padding: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20, // Increased bottom padding
    minHeight: 0, // Important for flex layout
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 4, // Add some bottom padding to the content
  },
  textInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  inputButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputButton: {
    padding: 8,
  },
  sendButton: {
    backgroundColor: '#444',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2d2d2d',
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emojiPicker: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 300,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  emojiText: {
    fontSize: 24,
  },
  attachmentMenu: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  attachmentText: {
    color: '#fff',
    fontSize: 16,
  },
  actionMenu: {
    position: 'absolute',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 8,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
  },
  reactionPicker: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 200,
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  // Information Sidebar Styles
  infoSidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  infoSidebar: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  infoSidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  infoSidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  infoSidebarCloseButton: {
    padding: 4,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  chatAvatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chatAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatAvatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  chatType: {
    fontSize: 13,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  participantsList: {
    maxHeight: 200,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  participantAvatar: {
    position: 'relative',
  },
  participantAvatarText: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  participantStatus: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#fff',
  },
  toggleSwitch: {
    alignItems: 'center',
  },
  toggleTrack: {
    width: 36,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#444',
    position: 'relative',
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2,
    left: 2,
  },
}); 