import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'team';
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatar: string;
  participants: any[];
  isArchived?: boolean;
}

interface ChatListPageProps {
  onNavigate: (route: string) => void;
  onMenuPress?: () => void;
  onOpenChat: (chatId: string, chatName: string) => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

type TabType = 'all' | 'groups' | 'archived';

export default function ChatListPage({ onNavigate, onMenuPress, onOpenChat }: ChatListPageProps) {
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [swipeAnimations] = useState(new Map<string, Animated.Value>());

  useEffect(() => {
    loadChats();
    // Reset all swipe animations when tab changes
    swipeAnimations.forEach((animation) => {
      animation.setValue(0);
    });
  }, [activeTab]);

  // Cleanup animations when component unmounts
  useEffect(() => {
    return () => {
      swipeAnimations.forEach((animation) => {
        animation.setValue(0);
      });
    };
  }, []);

  const loadChats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { console.error('No authenticated user found'); return; }
      setCurrentUserId(user.id);
      
      const { data: participantChats, error: participantError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);
      if (participantError) { console.error('❌ Error finding participant chats:', participantError); return; }
      
      const chatIds = participantChats.map(pc => pc.chat_id);
      if (!chatIds.length) { setChats([]); return; }

      const { data: chatsData, error } = await supabase
        .from('chats')
        .select(`*, chat_participants(id, user_id, joined_at, is_muted, is_pinned, role, user:users!chat_participants_user_id_fkey(*))`)
        .in('id', chatIds)
        .order('updated_at', { ascending: false });
      if (error) { console.error('❌ Error fetching chats:', error); return; }

      const processedChats: Chat[] = (chatsData || []).map(chat => {
        const participants = chat.chat_participants?.map((cp: any) => cp.user).filter(Boolean) || [];
        
        let displayName = chat.name || 'Unnamed Chat';
        if (chat.type === 'direct' && participants.length > 0 && user) {
          const otherParticipant = participants.find((p: any) => p.id !== user.id);
          if (otherParticipant) { displayName = otherParticipant.name || 'Unknown User'; }
        }
        
        return {
          id: chat.id, 
          name: displayName, 
          type: chat.type as 'direct' | 'group' | 'team',
          lastMessage: 'No messages yet', 
          timestamp: chat.updated_at || chat.created_at,
          unreadCount: 0, 
          avatar: chat.avatar || '', 
          participants,
          isArchived: chat.is_archived || false,
        };
      });

      // Filter chats based on active tab
      const filteredChats = processedChats.filter(chat => {
        if (activeTab === 'archived') {
          return chat.isArchived;
        } else if (activeTab === 'groups') {
          return (chat.type === 'group' || chat.type === 'team') && !chat.isArchived;
        } else {
          return !chat.isArchived;
        }
      });

      for (const chat of filteredChats) {
        try {
          const { data: lastMessageData, error: messageError } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (!messageError && lastMessageData) {
            chat.lastMessage = lastMessageData.content;
            chat.timestamp = lastMessageData.created_at;
          } else {
            console.log('📝 No messages found for chat:', chat.name);
          }
        } catch (error) { console.log('No messages for chat:', chat.id); }
      }
      
      // Reset all swipe animations when chats are reloaded
      swipeAnimations.forEach((animation) => {
        animation.setValue(0);
      });
      
      setChats(filteredChats);
    } catch (error) { console.error('Error loading chats:', error); Alert.alert('Error', 'Failed to load chats'); }
    finally { setLoading(false); }
  };

  const loadUsersAndTeams = async () => {
    try {
      setSearchLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load users from the same company
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .eq('company_id', userProfile.company_id)
          .neq('id', user.id); // Exclude current user

        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, description')
          .eq('company_id', userProfile.company_id);

        setUsers(usersData || []);
        setTeams(teamsData || []);
      }
    } catch (error) {
      console.error('Error loading users and teams:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNewChat = () => {
    loadUsersAndTeams();
    setShowNewChatModal(true);
  };

  const searchUsersAndTeams = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: any[] = [];
    const lowerQuery = query.toLowerCase();

    // Search users
    users.forEach(user => {
      if (user.name.toLowerCase().includes(lowerQuery) || 
          user.email.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: user.id,
          name: user.name,
          type: 'user',
          email: user.email,
          avatar: user.avatar_url
        });
      }
    });

    // Search teams
    teams.forEach(team => {
      if (team.name.toLowerCase().includes(lowerQuery) ||
          (team.description && team.description.toLowerCase().includes(lowerQuery))) {
        results.push({
          id: team.id,
          name: team.name,
          type: 'team',
          description: team.description
        });
      }
    });

    setSearchResults(results);
  };

  const createDirectChat = async (userId: string, userName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if direct chat already exists
      const { data: existingChats } = await supabase
        .from('chats')
        .select('id, chat_participants!inner(user_id)')
        .eq('type', 'direct')
        .eq('chat_participants.user_id', user.id);

      if (existingChats) {
        for (const chat of existingChats) {
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id);
          
          if (participants && participants.length === 2) {
            const otherParticipant = participants.find(p => p.user_id === userId);
            if (otherParticipant) {
              // Chat already exists, open it
              onOpenChat(chat.id, userName);
              setShowNewChatModal(false);
              return;
            }
          }
        }
      }

      // Create new direct chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: `Direct Chat`,
          type: 'direct',
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        Alert.alert('Error', 'Failed to create chat');
        return;
      }

      // Add participants
      await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: userId }
        ]);

      onOpenChat(newChat.id, userName);
      setShowNewChatModal(false);
      loadChats(); // Refresh chat list
    } catch (error) {
      console.error('Error creating direct chat:', error);
      Alert.alert('Error', 'Failed to create chat');
    }
  };

  const createTeamChat = async (teamId: string, teamName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create team chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: teamName,
          type: 'team',
          team_id: teamId,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating team chat:', chatError);
        Alert.alert('Error', 'Failed to create team chat');
        return;
      }

      // Add current user as participant
      await supabase
        .from('chat_participants')
        .insert({ chat_id: newChat.id, user_id: user.id });

      onOpenChat(newChat.id, teamName);
      setShowNewChatModal(false);
      loadChats(); // Refresh chat list
    } catch (error) {
      console.error('Error creating team chat:', error);
      Alert.alert('Error', 'Failed to create team chat');
    }
  };

  const toggleChatArchive = async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current chat to check archive status
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('is_archived')
        .eq('id', chatId)
        .single();

      if (chatError) {
        console.error('Error getting chat:', chatError);
        Alert.alert('Error', 'Failed to get chat status');
        return;
      }

      // Toggle archive status
      const newArchiveStatus = !chat.is_archived;
      const { error } = await supabase
        .from('chats')
        .update({ is_archived: newArchiveStatus })
        .eq('id', chatId);

      if (error) {
        console.error('Error updating archive status:', error);
        Alert.alert('Error', 'Failed to update archive status');
        return;
      }

      console.log('✅ Chat archive status updated:', newArchiveStatus ? 'archived' : 'unarchived');
      loadChats(); // Refresh chat list
    } catch (error) {
      console.error('Error toggling archive:', error);
      Alert.alert('Error', 'Failed to update archive status');
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, get all message IDs for this chat
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId);

      if (messagesError) {
        console.error('Error getting messages:', messagesError);
      } else if (messages && messages.length > 0) {
        // Delete message reactions first
        const messageIds = messages.map(m => m.id);
        await supabase
          .from('message_reactions')
          .delete()
          .in('message_id', messageIds);

        // Delete messages
        await supabase
          .from('messages')
          .delete()
          .eq('chat_id', chatId);
      }

      // Delete chat participants
      await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chatId);

      // Delete the chat
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        console.error('Error deleting chat:', error);
        Alert.alert('Error', 'Failed to delete chat');
        return;
      }

      console.log('✅ Chat deleted successfully');
      loadChats(); // Refresh chat list
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const nameParts = name.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  const getChatDisplayName = (chat: Chat, currentUserId?: string) => {
    if (chat.type === 'direct' && chat.participants && currentUserId) {
      const otherParticipant = chat.participants.find(p => p.id !== currentUserId);
      return otherParticipant?.name || 'Unknown User';
    }
    return chat.name;
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'direct': return 'account';
      case 'group': return 'account-group';
      case 'team': return 'account-group';
      default: return 'chat';
    }
  };

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <MaterialCommunityIcons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? '#00ff88' : '#666'} 
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderChatItem = ({ item }: { item: Chat }) => {
    console.log('🎨 Rendering chat item:', item.name, item.id);
    
    // Get display name and avatar initials
    const displayName = getChatDisplayName(item, currentUserId);
    const avatarText = item.type === 'direct' && item.participants
      ? getUserInitials(displayName)
      : getUserInitials(item.name);
    
    // Initialize swipe animation for this chat item
    if (!swipeAnimations.has(item.id)) {
      swipeAnimations.set(item.id, new Animated.Value(0));
    }
    const swipeAnimation = swipeAnimations.get(item.id)!;
    
    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: swipeAnimation } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: any) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX } = event.nativeEvent;
        
        if (translationX < -50) {
          // Swipe left - show actions
          Animated.spring(swipeAnimation, {
            toValue: -160,
            useNativeDriver: true,
          }).start();
        } else {
          // Swipe right or not enough - hide actions
          Animated.spring(swipeAnimation, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    const handleArchive = () => {
      toggleChatArchive(item.id);
      Animated.spring(swipeAnimation, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    };

    const handleDelete = () => {
      Alert.alert(
        'Delete Chat',
        'Are you sure you want to delete this chat? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => {
              deleteChat(item.id);
              Animated.spring(swipeAnimation, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
            }
          }
        ]
      );
    };
    
    return (
      <View style={styles.chatItemContainer}>
        {/* Swipe Actions (Hidden behind the main item) */}
        <View style={styles.swipeActions}>
          <TouchableOpacity
            style={[styles.swipeAction, styles.archiveAction]}
            onPress={handleArchive}
          >
            <MaterialCommunityIcons 
              name={item.isArchived ? 'archive-arrow-up' : 'archive'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.swipeActionText}>
              {item.isArchived ? 'Unarchive' : 'Archive'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={handleDelete}
          >
            <MaterialCommunityIcons name="delete" size={24} color="#fff" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Main Chat Item (Swipeable) */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.chatItem,
              {
                transform: [{
                  translateX: swipeAnimation.interpolate({
                    inputRange: [-160, 0],
                    outputRange: [-160, 0],
                    extrapolate: 'clamp',
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.chatItemContent}
              onPress={() => {
                console.log('🎯 Chat pressed:', item.id, displayName);
                onOpenChat(item.id, displayName);
              }}
            >
              <View style={styles.chatIcon}>
                {item.type === 'direct' ? (
                  <Text style={styles.avatarText}>{avatarText}</Text>
                ) : (
                  <MaterialCommunityIcons 
                    name={getChatIcon(item.type)} 
                    size={24} 
                    color="#fff" 
                  />
                )}
              </View>
              
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{displayName}</Text>
                  <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                </View>
                
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  };

  const renderSearchResult = ({ item }: { item: any }) => {
    const initials = getUserInitials(item.name);
    
    return (
      <TouchableOpacity
        style={styles.searchResultItem}
        onPress={() => {
          if (item.type === 'user') {
            createDirectChat(item.id, item.name);
          } else if (item.type === 'team') {
            createTeamChat(item.id, item.name);
          }
        }}
      >
        <View style={styles.searchResultIcon}>
          {item.type === 'user' ? (
            <Text style={styles.avatarText}>{initials}</Text>
          ) : (
            <MaterialCommunityIcons 
              name="account-group" 
              size={24} 
              color="#fff" 
            />
          )}
        </View>
        
        <View style={styles.searchResultContent}>
          <Text style={styles.searchResultName}>{item.name}</Text>
          <Text style={styles.searchResultType}>
            {item.type === 'user' ? item.email : 'Team'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('teams')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {renderTabButton('all', 'All', 'chat-outline')}
        {renderTabButton('groups', 'Groups', 'account-group-outline')}
        {renderTabButton('archived', 'Archived', 'archive-outline')}
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        onLayout={() => console.log('📱 FlatList onLayout - chats count:', chats.length)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'archived' ? 'No archived chats' : 'No chats yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'archived' 
                ? 'Archived chats will appear here' 
                : 'Start a conversation to see it here'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Chat</Text>
            <View style={{ width: 24 }} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search users and teams..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={searchUsersAndTeams}
            autoFocus
          />

          {searchLoading ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.searchLoadingText}>Loading...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              style={styles.searchResults}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                searchQuery ? (
                  <View style={styles.noResults}>
                    <MaterialCommunityIcons name="magnify" size={48} color="#666" />
                    <Text style={styles.noResultsText}>No results found</Text>
                  </View>
                ) : (
                  <View style={styles.searchPrompt}>
                    <MaterialCommunityIcons name="account-search" size={48} color="#666" />
                    <Text style={styles.searchPromptText}>Search for users or teams to start a chat</Text>
                  </View>
                )
              }
            />
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 40,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#00ff88',
  },
  chatList: {
    flex: 1,
  },
  chatItemContainer: {
    position: 'relative',
    height: 72, // Fixed height for consistent swipe behavior
  },
  chatItem: {
    backgroundColor: '#1a1a1a',
    height: '100%',
    zIndex: 1,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    height: '100%',
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
  },
  swipeActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  swipeAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveAction: {
    backgroundColor: '#ff9500',
  },
  deleteAction: {
    backgroundColor: '#ff3b30',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  newChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    color: '#fff',
    fontSize: 16,
  },
  searchLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchLoadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  searchResultType: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  searchPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  searchPromptText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
}); 