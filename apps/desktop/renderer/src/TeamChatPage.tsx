import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfileModal } from './components/UserProfileModal';
import { ThemeContext } from './ThemeContext';
import { 
  getCurrentUser, 
  User as AuthUser,
  getCompanyUsers,
  logout
} from './lib/auth';
import { 
  getUserChats, 
  getChatMessages, 
  sendMessage, 
  subscribeToMessages,
  subscribeToUserStatus,
  createDirectChat,
  createGroupChat,
  addMessageReaction,
  removeMessageReaction,
  Chat as SupabaseChat,
  Message as SupabaseMessage,
  getCompanyTeams,
  createTeamChat,
  Team as SupabaseTeam,
  removeUserFromGroup,
  deleteChat,
  leaveGroup,
  toggleChatArchive
} from './lib/chat';
import { getUserAvatar, isAvatarUrl } from './lib/profile';
import { supabase } from './lib/supabase';

// Enhanced types for comprehensive chat features
type MessageType = 'text' | 'file' | 'image' | 'audio' | 'location';

type Reaction = {
  emoji: string;
  users: string[];
  count: number;
};

type Message = {
  id: string;
  text: string;
  sender: string;
  timestamp: string; // Store raw date string from database
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions?: Reaction[];
  replyTo?: string;
  edited?: boolean;
  editedAt?: string;
  sent: boolean;
  sender_id?: string;
  sender_avatar?: string; // Add sender's avatar URL
  sender_name?: string;   // Add sender's full name
};

// Global hover popup management
type HoverPopupState = {
  activeMessageId: string | null;
  position: { x: number; y: number } | null;
  message: Message | null;
  hideTimeoutId: NodeJS.Timeout | null;
};

type UserStatus = 'online' | 'offline' | 'away' | 'busy';

type User = {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  lastSeen?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'member';
  company_id?: string;
  company_role?: string;
};

type Team = {
  id: string;
  name: string;
  description?: string;
  avatar: string;
  member_count: number;
  members?: User[];
};

type ChatType = 'direct' | 'group' | 'team';

type Chat = {
  id: string;
  name: string;
  type: ChatType;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
  messages: Message[];
  participants: User[];
  created_by?: string;
  team_id?: string;
  isTyping?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
};

type Notification = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
};

type ConfirmationModal = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  type: 'warning' | 'danger' | 'info';
};

type MessageNotification = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  chatId: string;
  chatName: string;
  chatType: ChatType;
  messageText: string;
  timestamp: number;
  isRead: boolean;
};

// Mock data with enhanced features - REPLACED WITH REAL DATA
let CURRENT_USER: User | null = null;

// Enhanced theme system inspired by calendar design
const themes = {
  light: {
    bg: '#f8f9fa', // Light grey background to match calendar
    panelBg: '#f8f9fa',
    chatBg: 'rgba(255, 255, 255, 0.7)', // Glass effect
    text: '#1a1a1a',
    textSecondary: '#6c757d',
    border: '#e9ecef',
    accent: '#1a1a1a', // Black instead of green
    hoverBg: 'rgba(255, 255, 255, 0.9)',
    buttonBg: '#1a1a1a',
    buttonText: '#ffffff',
    messageBubble: 'rgba(255, 255, 255, 0.9)',
    messageBubbleSent: 'rgba(26, 26, 26, 0.9)',
    inputBg: 'rgba(255, 255, 255, 0.8)',
    avatarBg: 'linear-gradient(135deg, #e9ecef, #dee2e6)',
    avatarText: '#495057',
    primary: '#228B22' // Added primary color
  },
  dark: {
    bg: '#0a0a0a',
    panelBg: 'rgba(26, 26, 26, 0.9)',
    chatBg: 'rgba(16, 16, 16, 0.95)',
    text: '#ffffff',
    textSecondary: '#adb5bd',
    border: 'rgba(255, 255, 255, 0.1)',
    accent: '#ffffff',
    hoverBg: 'rgba(255, 255, 255, 0.05)',
    buttonBg: '#404040',
    buttonText: '#ffffff',
    messageBubble: 'rgba(64, 64, 64, 0.8)',
    messageBubbleSent: 'rgba(255, 255, 255, 0.8)',
    inputBg: 'rgba(255, 255, 255, 0.1)',
    avatarBg: 'linear-gradient(135deg, #4a4a4a, #2a2a2a)',
    avatarText: '#fff',
    primary: '#ffffff'
  }
};

// Utility function to ensure team avatars are always initials
const getTeamInitials = (team: Team): string => {
  // If avatar is already short initials (2-3 characters), use it
  if (team.avatar && team.avatar.length <= 3 && !team.avatar.includes('http') && !team.avatar.includes('.')) {
    return team.avatar;
  }
  
  // Otherwise, generate initials from team name
  return team.name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

// Helper function to convert Supabase user to local User type
const convertSupabaseUser = (supabaseUser: AuthUser): User => ({
  id: supabaseUser.id,
  name: supabaseUser.name || 'Unknown User',
  avatar: getUserInitials(supabaseUser.name || 'Unknown User'),
  status: 'online' as UserStatus,
  email: supabaseUser.email,
  company_id: supabaseUser.company_id,
  role: supabaseUser.role as 'admin' | 'member',
  company_role: (supabaseUser as any).company_role
});



// Helper function to convert Supabase message to local Message type
const convertSupabaseMessage = (supabaseMessage: SupabaseMessage): Message => {
  // Aggregate reactions by emoji - ENSURE NO DUPLICATES
  const reactionMap: Record<string, { emoji: string, users: string[], count: number }> = {};
  if (supabaseMessage.reactions) {
    for (const r of supabaseMessage.reactions) {
      if (!reactionMap[r.emoji]) {
        reactionMap[r.emoji] = { emoji: r.emoji, users: [], count: 0 };
      }
      // Only add if this user hasn't already reacted with this emoji
      if (!reactionMap[r.emoji].users.includes(r.user_id)) {
        reactionMap[r.emoji].users.push(r.user_id);
        reactionMap[r.emoji].count += 1;
      }
    }
  }
  return {
    id: supabaseMessage.id,
    text: supabaseMessage.content,
    sender: supabaseMessage.sender?.name || 'Unknown',
    sender_id: supabaseMessage.sender_id,
    sender_avatar: supabaseMessage.sender?.avatar_url || null, // Extract sender's avatar
    sender_name: supabaseMessage.sender?.name || 'Unknown', // Extract sender's full name
    timestamp: supabaseMessage.created_at, // Store raw date string
    type: supabaseMessage.message_type as MessageType,
    fileUrl: supabaseMessage.file_url,
    fileName: supabaseMessage.file_name,
    fileSize: supabaseMessage.file_size,
    reactions: Object.values(reactionMap),
    replyTo: supabaseMessage.reply_to_id,
    edited: supabaseMessage.is_edited,
    editedAt: supabaseMessage.edited_at,
    sent: true
  };
};

// Helper function to convert Supabase chat to local Chat type
const convertSupabaseChat = (supabaseChat: SupabaseChat): Chat => {
  // For direct chats, show the other participant's name
  let chatName = supabaseChat.name || 'Unknown';
  
  if (supabaseChat.type === 'direct' && supabaseChat.participants && CURRENT_USER) {
    // Find the other participant (not the current user)
    const otherParticipant = supabaseChat.participants.find(p => p.id !== CURRENT_USER!.id);
    if (otherParticipant) {
      chatName = otherParticipant.name;
    }
  } else if (supabaseChat.type === 'group' && !supabaseChat.name && supabaseChat.participants) {
    // For groups without a name, use participant names
    chatName = supabaseChat.participants.map(p => p.name).join(', ');
  }

  return {
    id: supabaseChat.id,
    name: chatName,
    type: supabaseChat.type as ChatType,
    lastMessage: supabaseChat.last_message?.content || 'No messages yet',
    timestamp: supabaseChat.updated_at, // Store raw date string
    unread: supabaseChat.unread_count || 0,
    avatar: supabaseChat.avatar || (chatName?.charAt(0) || 'C'),
      messages: [],
    participants: supabaseChat.participants?.map((participant) => ({
      ...convertSupabaseUser(participant),
      // Assign admin role to the group creator, member role to others
      role: participant.id === supabaseChat.created_by ? 'admin' : 'member'
    })) || [],
    created_by: supabaseChat.created_by,
    isPinned: false,
    isMuted: false,
    isArchived: supabaseChat.is_archived
  };
};

// Helper function to get the display name for a chat
const getChatDisplayName = (chat: Chat): string => {
  if (chat.type === 'direct' && chat.participants && CURRENT_USER) {
    // For direct chats, show the other participant's name from actual user data
    const otherParticipant = chat.participants.find(p => p.id !== CURRENT_USER!.id);
    return otherParticipant?.name || 'Unknown User';
  }
  // For groups and other chat types, use the stored name
  return chat.name;
};

// Mock data with enhanced features
const MOCK_USERS: User[] = [
  // Remove hardcoded mock users - will use real data from database
];

// Helper function to generate avatar initials from user name
const getUserInitials = (name: string): string => {
  if (!name) return 'U';
  const nameParts = name.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  // Use first letter of first name and first letter of last name
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

// Helper function to safely format timestamps
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Enhanced components
const UserProfileCard: React.FC<{ user: User; isDark: boolean; notificationCount?: number; onClick?: () => void }> = ({ user, isDark, notificationCount = 0, onClick }) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  
  return (
    <div 
      style={{ 
      padding: '24px', 
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      background: colors.panelBg,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s ease'
      }}
      onClick={onClick}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.background = isDark ? '#333333' : '#f0f0f0';
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.background = colors.panelBg;
        }
      }}
    >
      {/* Notification Badge */}
      {notificationCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: '#dc3545',
          color: '#ffffff',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
          animation: notificationCount > 0 ? 'pulse 2s infinite' : 'none'
        }}>
          {notificationCount > 99 ? '99+' : notificationCount}
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: colors.avatarBg,
          color: colors.avatarText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: '600',
          border: `2px solid ${colors.border}`,
          boxShadow: isDark 
            ? '0 4px 16px rgba(0,0,0,0.3)' 
            : '0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {isAvatarUrl(user.avatar) ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            user.avatar
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: colors.text,
            marginBottom: '4px',
            letterSpacing: '0.3px'
          }}>
            {user.name}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <StatusIndicator status={user.status} />
            <span style={{ 
              textTransform: 'capitalize',
              fontWeight: '500'
            }}>
              {user.status}
            </span>
            {user.lastSeen && user.status === 'offline' && (
              <span>• Last seen {new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          {user.company_role && (
            <div style={{ 
              fontSize: '13px', 
              color: colors.textSecondary,
              fontStyle: 'italic',
              opacity: 0.8
            }}>
              {user.company_role}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusIndicator = ({ status }: { status: UserStatus }) => {
  const colors = {
    online: '#10b981', // Changed from green to emerald
    away: '#f59e0b',
    busy: '#ef4444',
    offline: '#6b7280'
  };
  
  return (
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: colors[status],
      flexShrink: 0
    }} />
  );
};

const ChatListItem = ({ chat, active, onClick, isDark }: { chat: Chat, active: boolean, onClick: () => void, isDark: boolean }) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  
  return (
    <div 
      onClick={onClick} 
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        cursor: 'pointer',
        backgroundColor: active ? colors.hoverBg : 'transparent',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        position: 'relative',
        transition: 'all 0.2s ease',
        borderRadius: active ? '12px' : '0px',
        margin: active ? '4px 12px' : '0px',
        boxShadow: active ? (isDark 
          ? '0 4px 16px rgba(0,0,0,0.3)' 
          : '0 4px 16px rgba(0,0,0,0.1)') : 'none',
        borderLeft: chat.isPinned ? `3px solid ${colors.accent}` : 'none'
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.backgroundColor = colors.hoverBg;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: colors.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDark ? colors.bg : '#ffffff',
          fontSize: '16px',
          fontWeight: '600',
          marginRight: '16px',
          flexShrink: 0,
          boxShadow: isDark 
            ? '0 2px 8px rgba(0,0,0,0.3)' 
            : '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        {chat.type === 'direct' && chat.participants && CURRENT_USER
          ? getUserInitials(getChatDisplayName(chat))
          : (chat.avatar && chat.avatar.length <= 3 ? chat.avatar : getUserInitials(getChatDisplayName(chat)))
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <span style={{
              fontWeight: '600',
              fontSize: '15px',
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.3px'
            }}>
              {getChatDisplayName(chat)}
            </span>
            {chat.isPinned && (
              <img
                src="/icons/pin.svg"
                alt="Pinned"
                style={{
                  width: '14px',
                  height: '14px',
                  filter: isDark ? 'invert(1)' : 'none',
                  opacity: 0.8
                }}
              />
            )}
            {chat.isMuted && (
              <img
                src="/icons/bell.svg"
                alt="Muted"
                style={{
                  width: '14px',
                  height: '14px',
                  filter: isDark ? 'invert(1)' : 'none',
                  opacity: 0.6
                }}
              />
            )}
          </div>
          <span style={{
            fontSize: '12px',
            color: colors.textSecondary,
            flexShrink: 0,
            marginLeft: '8px',
            fontWeight: '500'
          }}>
            {formatTimestamp(chat.timestamp)}
          </span>
        </div>
        <div style={{
          fontSize: '13px',
          color: colors.textSecondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {chat.lastMessage}
        </div>
      </div>
      {chat.unread > 0 && (
        <div style={{
          backgroundColor: colors.accent,
          color: isDark ? colors.bg : '#ffffff',
          borderRadius: '50%',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '600',
          marginLeft: '12px',
          flexShrink: 0,
          boxShadow: isDark 
            ? '0 2px 8px rgba(255,255,255,0.2)' 
            : '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {chat.unread}
        </div>
      )}
    </div>
  );
};

const SearchResultItem = ({ user, onClick, isDark }: { user: User, onClick: () => void, isDark: boolean }) => (
  <div 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#f0f0f0'}`,
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
      transition: 'background-color 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = isDark ? '#2a2a2a' : '#f8f9fa';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = isDark ? '#1e1e1e' : '#ffffff';
    }}
  >
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#10b981',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffffff',
      marginRight: '12px'
    }}>
      {user.avatar && user.avatar.length <= 3 ? user.avatar : user.name.charAt(0).toUpperCase()}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 500, 
        color: isDark ? '#ffffff' : '#212529',
        marginBottom: '2px'
      }}>
        {user.name}
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: isDark ? '#adb5bd' : '#6c757d'
      }}>
        Start new chat
      </div>
    </div>
  </div>
);

const TeamSearchResultItem = ({ team, onClick, isDark }: { team: Team, onClick: () => void, isDark: boolean }) => (
  <div 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#f0f0f0'}`,
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
      transition: 'background-color 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = isDark ? '#2a2a2a' : '#f8f9fa';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = isDark ? '#1e1e1e' : '#ffffff';
    }}
  >
                <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginRight: '12px'
        }}>
          {getTeamInitials(team)}
        </div>
    <div style={{ flex: 1 }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 500, 
        color: isDark ? '#ffffff' : '#212529',
        marginBottom: '2px'
      }}>
        {team.name}
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: isDark ? '#adb5bd' : '#6c757d'
      }}>
        {team.member_count} members • Create team chat
      </div>
    </div>
    </div>
);

const ChatHeader = ({ chat, isDark, onToggleRightPanel }: { 
  chat: Chat | undefined, 
  isDark: boolean, 
  onToggleRightPanel: () => void
}) => (
        <div style={{
    padding: '16px 24px',
    background: isDark ? '#1a1a1a' : '#ffffff',
    borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 0,
    flexShrink: 0
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {chat && (
        <>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
            color: isDark ? '#fff' : '#495057',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '600',
            margin: '0 auto 12px',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {chat.type === 'group' ? (
              // Group chat - show first letter of group name
              chat.name ? chat.name.charAt(0).toUpperCase() : 'G'
            ) : (
              // Direct chat - show other user's profile picture or initials
              (() => {
                if (chat.participants && chat.participants.length > 0) {
                  const otherUser = chat.participants.find(p => p.id !== CURRENT_USER?.id);
                  if (otherUser) {
                    // Check if user has a profile picture
                    if (otherUser.avatar && isAvatarUrl(otherUser.avatar)) {
                      return (
                        <img
                          src={otherUser.avatar}
                          alt={otherUser.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      );
                    } else {
                      // Show user's initials
                      return getUserInitials(otherUser.name || 'Unknown User');
                    }
                  }
                }
                // Fallback to chat avatar or initials
                return chat.avatar || getUserInitials(getChatDisplayName(chat));
              })()
            )}
          </div>
          <div>
            <div style={{
              fontWeight: '600',
              fontSize: '16px',
              color: isDark ? '#ffffff' : '#1a1a1a'
            }}>
              {getChatDisplayName(chat)}
            </div>
            <div style={{
              fontSize: '13px',
              color: isDark ? '#adb5bd' : '#6c757d'
            }}>
              {chat.type === 'group' ? 
                `${chat.participants.length} members` : 
                chat.participants.find(p => p.id !== CURRENT_USER?.id)?.status || 'offline'
              }
            </div>
          </div>
        </>
      )}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        onClick={onToggleRightPanel}
        style={{
          background: 'transparent',
          border: 'none',
          color: isDark ? '#adb5bd' : '#6c757d',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          transition: 'none',
          outline: 'none',
          boxShadow: 'none'
        }}
        onFocus={e => {
          e.currentTarget.style.outline = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
        onBlur={e => {
          e.currentTarget.style.outline = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      </button>
        </div>
    </div>
);

const MessageReactions = ({ reactions, onReact, isDark }: { 
  reactions: Array<{ emoji: string, count: number, users: string[] }>, 
  onReact: (emoji: string) => void,
  isDark: boolean 
}) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  
  // Double-check merge in case backend still sends duplicates
  console.log('MessageReactions: incoming reactions', reactions);
  const merged: Record<string, { emoji: string, count: number, users: string[] }> = {};
  for (const r of reactions) {
    if (!merged[r.emoji]) {
      merged[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    }
    merged[r.emoji].count += r.count;
    merged[r.emoji].users = Array.from(new Set([...merged[r.emoji].users, ...r.users]));
  }
  const mergedReactions = Object.values(merged);
  console.log('MessageReactions: merged reactions', mergedReactions);
  const maxToShow = 3;
  const shown = mergedReactions.slice(0, maxToShow);
  const extraCount = mergedReactions.length - maxToShow;

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      marginTop: '8px',
      flexWrap: 'wrap'
    }}>
      {shown.map(reaction => (
        <button
          key={reaction.emoji}
          onClick={() => onReact(reaction.emoji)}
          style={{
            background: colors.hoverBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: colors.text,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = colors.accent;
            e.currentTarget.style.color = isDark ? colors.bg : '#ffffff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = colors.hoverBg;
            e.currentTarget.style.color = colors.text;
          }}
        >
          <span>{reaction.emoji}</span>
          <span style={{ fontWeight: '500' }}>{reaction.count}</span>
        </button>
      ))}
      {extraCount > 0 && (
        <span style={{
          background: colors.hoverBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '4px 8px',
          fontSize: '12px',
          color: colors.text,
          display: 'flex',
          alignItems: 'center',
          fontWeight: 500,
          marginLeft: '2px',
          userSelect: 'none'
        }}>+{extraCount}</span>
      )}
    </div>
  );
};

const FilePreview = ({ message, isDark }: { message: Message, isDark: boolean }) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  
  if (message.type === 'image' && message.fileUrl) {
    return (
      <div style={{ marginBottom: '8px' }}>
        <img 
          src={message.fileUrl} 
          alt="Shared image" 
          style={{ 
            maxWidth: '100%', 
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            boxShadow: isDark 
              ? '0 2px 8px rgba(0,0,0,0.3)' 
              : '0 2px 8px rgba(0,0,0,0.1)'
          }} 
        />
        {message.text && (
          <div style={{ 
            marginTop: '8px', 
            fontSize: '14px',
            color: colors.text
          }}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  if (message.type === 'file' && message.fileName) {
    const isPDF = message.fileName.toLowerCase().endsWith('.pdf');
    
    const handleFileClick = () => {
      if (message.fileUrl) {
        if (isPDF) {
          // Open PDF in new window
          window.open(message.fileUrl, '_blank');
    } else {
          // Download other files
          const link = document.createElement('a');
          link.href = message.fileUrl;
          link.download = message.fileName || 'download';
          link.click();
        }
      }
    };

    return (
      <div 
        onClick={handleFileClick}
        style={{
          padding: '12px',
          background: colors.hoverBg,
          borderRadius: '8px',
          marginBottom: '8px',
          border: `1px solid ${colors.border}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = colors.accent;
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = colors.hoverBg;
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: message.text ? '8px' : '0px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {isPDF ? '📄' : '📎'}
          </span>
          <div>
            <div style={{ 
              fontWeight: '500',
              color: colors.text,
              fontSize: '14px'
            }}>
              {message.fileName}
              <span style={{
                fontSize: '12px',
                color: colors.textSecondary,
                marginLeft: '8px'
              }}>
                {isPDF ? '(Click to open)' : '(Click to download)'}
              </span>
            </div>
            {message.fileSize && (
              <div style={{ 
                fontSize: '12px',
                color: colors.textSecondary
              }}>
                {message.fileSize}
              </div>
            )}
          </div>
        </div>
        {message.text && (
          <div style={{ 
            fontSize: '14px',
            color: colors.text
          }}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return null;
};

const MessageBubble = ({ message, sent, isDark, onReact, onReply, onEdit, onDelete, isSelected, onSelect, deleting, editingMessageId, onShowHover, allMessages }: { 
  message: Message, 
  sent: boolean, 
  isDark: boolean, 
  onReact: (messageId: string, emoji: string) => void,
  onReply: (message: Message) => void,
  onEdit: (message: Message) => void,
  onDelete: (message: Message) => void,
  isSelected?: boolean,
  onSelect?: (messageId: string) => void,
  deleting?: boolean,
  editingMessageId?: string | null,
  onShowHover?: (message: Message, event: React.MouseEvent) => void,
  allMessages?: Message[]
}) => {
  const colors = themes[isDark ? 'dark' : 'light'];

  // Get sender initials for avatar
  const getSenderInitials = (senderName: string) => {
    return senderName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
  };

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥', '💯', '✨', '💪', '🤔', '😎', '🥳', '😴', '🤯', '😍', '🤩', '😭', '🤬', '🤮', '🤧', '🤠', '👻', '🤖', '👽', '👾', '🤡', '👹', '👺', '💀', '☠️'];



  return (
    <div style={{
      display: 'flex',
      justifyContent: sent ? 'flex-end' : 'flex-start',
      marginBottom: '16px',
      paddingLeft: sent ? '60px' : '0px',
      paddingRight: sent ? '0px' : '60px',
      alignItems: 'flex-start',
      gap: '8px',
      position: 'relative'
    }}>
      {/* Selection checkbox for delete mode */}
      {deleting && sent && onSelect && (
        <label style={{
          display: 'inline-block',
          width: 22,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          marginRight: 8,
        }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(message.id)}
            style={{
              opacity: 0,
              width: 22,
              height: 22,
              position: 'absolute',
              left: 0,
              top: 0,
              margin: 0,
              cursor: 'pointer',
            }}
          />
          <span style={{
            display: 'block',
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: `2px solid ${isDark ? '#888' : '#bbb'}`,
            background: 'transparent',
            boxSizing: 'border-box',
            position: 'relative',
          }}>
            {isSelected && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'block',
                }}
              >
                <circle cx="7" cy="7" r="7" fill={isDark ? '#222' : '#fff'} />
                <path
                  d="M4 7.5L6.2 10L10 5.5"
                  stroke={isDark ? '#fff' : '#222'}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </label>
      )}

      {/* Avatar for received messages - FIXED ALIGNMENT */}
      {!sent && (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: colors.accent,
          color: isDark ? '#000000' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '600',
          flexShrink: 0,
          border: `2px solid ${isDark ? '#333' : '#fff'}`,
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          alignSelf: 'flex-start',
          marginTop: '8px'
        }}>
          {/* For received messages, show the SENDER's avatar, not current user's */}
          {message.sender_avatar && isAvatarUrl(message.sender_avatar) ? (
            <img
              src={message.sender_avatar}
              alt={message.sender_name || message.sender || 'User'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            getSenderInitials(message.sender_name || message.sender || 'Unknown')
          )}
        </div>
      )}

      {/* Bubble + reactions column - FIXED LAYOUT */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: sent ? 'flex-end' : 'flex-start', 
        maxWidth: '70%' 
      }}>

        
        <div
          style={{
            background: sent ? '#00bfa5' : colors.messageBubble,
            color: sent ? '#ffffff' : colors.text,
            padding: '12px 16px',
            borderRadius: sent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            wordWrap: 'break-word',
            position: 'relative',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark 
              ? '0 4px 16px rgba(0,0,0,0.3)' 
              : '0 4px 16px rgba(0,0,0,0.1)',
            cursor: sent ? 'pointer' : 'default'
          }}
          onClick={(e) => {
            if (sent) {
              e.stopPropagation();
              onShowHover?.(message, e);
            }
          }}
        >

          {/* Reply preview if this is a reply */}
          {message.replyTo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: 8,
                marginLeft: 0,
                alignSelf: 'flex-start',
                cursor: 'pointer',
                opacity: 0.8,
                borderLeft: `3px solid ${sent ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#ffffff' : '#000000')}`,
                paddingLeft: 8,
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              title="Jump to replied message"
            >
              <div
                style={{
                  borderRadius: sent
                    ? '12px 12px 4px 12px'
                    : '12px 12px 12px 4px',
                  padding: '8px 12px',
                  maxWidth: 250,
                  fontSize: 12,
                  color: isDark ? '#ffffff' : '#000000',
                  fontStyle: 'normal',
                  boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                  fontWeight: 400,
                  letterSpacing: 0.1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                  background: isDark ? 'rgba(64,64,64,0.9)' : 'rgba(240,240,240,0.9)',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div style={{ 
                  fontSize: 11, 
                  color: isDark ? '#ffffff' : '#000000', 
                  marginBottom: 3,
                  fontWeight: 600 
                }}>
                  Replying to message
                </div>
                {(() => {
                  // Find the replied-to message content
                  const repliedToMessage = allMessages?.find(m => m.id === message.replyTo);
                  const replyText = repliedToMessage?.text || message.replyTo;
                  return replyText.length > 50 ? replyText.slice(0, 50) + '…' : replyText;
                })()}
              </div>
            </div>
          )}

          {/* Message content */}
          {message.type === 'text' && (
            <div style={{ 
              fontSize: '14px', 
              lineHeight: '1.4',
              fontWeight: '400'
            }}>
              {message.text}
            </div>
          )}

          {/* File preview */}
          {(message.type === 'file' || message.type === 'image') && (
            <FilePreview message={message} isDark={isDark} />
          )}
        </div>
        {/* Reactions below bubble - SINGLE CONTAINER */}
        {message.reactions && message.reactions.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '4px',
            marginTop: '8px',
            flexWrap: 'wrap'
          }}>
            {message.reactions.map((reaction, index) => (
              <button
                key={`${reaction.emoji}-${index}`}
                onClick={() => onReact(message.id, reaction.emoji)}
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid #22c55e',
                  borderRadius: '12px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#22c55e',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#22c55e';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                  e.currentTarget.style.color = '#22c55e';
                }}
              >
                <span>{reaction.emoji}</span>
                <span style={{ fontWeight: '500' }}>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Avatar for sent messages - FIXED ALIGNMENT */}
      {sent && (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: colors.accent,
          color: isDark ? '#000000' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '600',
          flexShrink: 0,
          border: `2px solid ${isDark ? '#333' : '#fff'}`,
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          alignSelf: 'flex-start',
          marginTop: '8px'
        }}>
          {CURRENT_USER && isAvatarUrl(CURRENT_USER.avatar) ? (
            <img
              src={CURRENT_USER.avatar}
              alt={CURRENT_USER.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            getSenderInitials(message.sender)
          )}
        </div>
      )}
    </div>
  );
};

const MessageInput = ({ onSendMessage, onFileUpload, isDark, replyingTo, onCancelReply, editingMessageId, editText, onSaveEdit, onCancelEdit }: { 
  onSendMessage: (text: string, type?: MessageType) => void, 
  onFileUpload: (file: File) => void, 
  isDark: boolean,
  replyingTo?: Message | undefined,
  onCancelReply?: () => void,
  editingMessageId?: string | null,
  editText?: string,
  onSaveEdit?: (text: string) => void,
  onCancelEdit?: () => void
}) => {
    const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😡', '🔥', '💯'];

  // Set text when editing starts
  useEffect(() => {
    if (editingMessageId && editText) {
      setText(editText);
    }
  }, [editingMessageId, editText]);

    const handleSend = () => {
        if (text.trim()) {
            if (editingMessageId && onSaveEdit) {
                onSaveEdit(text);
            } else {
                onSendMessage(text.trim());
                setText('');
            }
        }
    };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
    };

    return (
    <div style={{
      background: isDark ? '#1a1a1a' : '#ffffff', 
      borderTop: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
      position: 'relative'
    }}>
      {/* Reply Preview */}
      {replyingTo && (
        <div style={{
          padding: '12px 24px',
          background: isDark ? '#2a2a2a' : '#f8f9fa',
          borderBottom: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1
          }}>
            <span style={{
              fontSize: '14px',
              color: isDark ? '#adb5bd' : '#6c757d'
            }}>
              Replying to {replyingTo.sender}:
            </span>
            <div style={{
              background: isDark ? '#404040' : '#e9ecef',
              padding: '8px 12px',
              borderRadius: '12px',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <span style={{
                fontSize: '14px',
                color: isDark ? '#ffffff' : '#1a1a1a'
              }}>
                {replyingTo.text}
              </span>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#adb5bd' : '#6c757d',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Edit Preview */}
      {editingMessageId && editText && (
        <div style={{
          padding: '12px 24px',
          background: isDark ? '#2a2a2a' : '#f8f9fa',
          borderBottom: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1
          }}>
            <span style={{
              fontSize: '14px',
              color: isDark ? '#adb5bd' : '#6c757d'
            }}>
               Editing:
            </span>
            <div style={{
              background: isDark ? '#404040' : '#e9ecef',
              padding: '8px 12px',
              borderRadius: '12px',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <span style={{
                fontSize: '14px',
                color: isDark ? '#ffffff' : '#1a1a1a'
              }}>
                {editText}
              </span>
            </div>
          </div>
          <button
            onClick={onCancelEdit}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#adb5bd' : '#6c757d',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '24px',
          background: isDark ? '#2a2a2a' : '#ffffff',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
          border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
          zIndex: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          minWidth: '280px'
        }}>
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Area - Single Container */}
      <div style={{
        padding: '20px 24px',
        position: 'relative'
      }}>
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        {/* Single Input Field - Direct input with icons inside */}
            <input
                type="text"
          placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
                value={text}
                onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            width: '100%',
            border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
            background: isDark ? '#2a2a2a' : '#f8f9fa',
            color: isDark ? '#ffffff' : '#000000',
            outline: 'none',
            fontSize: '15px',
            padding: '14px 160px 14px 20px',
            borderRadius: '12px',
            boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)',
            position: 'relative',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = isDark ? '#ffffff' : '#007bff';
            e.currentTarget.style.boxShadow = isDark 
              ? '0 0 0 3px rgba(255,255,255,0.1), inset 0 2px 4px rgba(0,0,0,0.3)' 
              : '0 0 0 3px rgba(0,123,255,0.1), inset 0 2px 4px rgba(0,0,0,0.1)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = isDark ? '#404040' : '#dee2e6';
            e.currentTarget.style.boxShadow = isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)';
          }}
        />

        {/* Icons Container - positioned absolutely over the input */}
        <div style={{
          position: 'absolute',
          right: '44px',
          top: '37%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none'
        }}>
          {/* Emoji Button */}
        <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
              background: 'none',
            border: 'none',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto'
            }}
          >
            <div style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: isDark ? '#ffffff' : '#000000'
            }}>
              ☺
            </div>
          </button>

          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto'
            }}
          >
            <div style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: isDark ? '#ffffff' : '#000000'
            }}>
              ⎋
            </div>
          </button>



          {/* Send Button */}
          <button 
            onClick={handleSend} 
            disabled={!text.trim()}
            style={{
              background: 'none',
              border: 'none', 
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              opacity: text.trim() ? 1 : 0.5,
              pointerEvents: 'auto'
            }}
          >
            <div style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: text.trim() ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#666666' : '#cccccc')
            }}>
              →
            </div>
          </button>
        </div>
      </div>
        </div>
    );
};

const RightPanel = ({ chat, isOpen, isDark, onToggleMute, onTogglePin, onToggleArchive, onRemoveUser, onShowConfirmation, onDeleteChat, onUpdateChats, onSetActiveChat, onAddNotification }: { 
  chat: Chat | undefined, 
  isOpen: boolean, 
  isDark: boolean,
  onToggleMute: (chatId: string) => void,
  onTogglePin: (chatId: string) => void,
  onToggleArchive: (chatId: string) => void,
  onRemoveUser: (userId: string, userName: string) => void,
  onShowConfirmation: (modal: ConfirmationModal) => void,
  onDeleteChat: (chatId: string) => Promise<boolean>,
  onUpdateChats: (updater: (prevChats: Chat[]) => Chat[]) => void,
  onSetActiveChat: (chatId: string) => void,
  onAddNotification: (message: string, type: Notification['type']) => void
}) => {
  if (!chat || !isOpen) return null;

  const handleMediaClick = (index: number) => {
    // Handle media click
  };

  const handleLeaveGroup = async () => {
    if (chat.type === 'group' && CURRENT_USER) {
      console.log('🚪 Starting leave group process for:', {
        chatId: chat.id,
        chatName: chat.name,
        userId: CURRENT_USER.id,
        userName: CURRENT_USER.name,
        participants: chat.participants
      });

      // Check if current user is admin
      const currentUserParticipant = chat.participants.find(p => p.id === CURRENT_USER!.id);
      const isCurrentUserAdmin = currentUserParticipant?.role === 'admin';
      
      console.log('👤 Current user participant info:', {
        participant: currentUserParticipant,
        isAdmin: isCurrentUserAdmin
      });
      
      const confirmMessage = isCurrentUserAdmin 
        ? `Are you sure you want to leave "${chat.name}"? As an admin, leaving will transfer admin privileges to another member. You will no longer receive messages from this group.`
        : `Are you sure you want to leave "${chat.name}"? You will no longer receive messages from this group.`;

      onShowConfirmation({
        isOpen: true,
        title: 'Leave Group',
        message: confirmMessage,
        confirmText: 'Leave',
        cancelText: 'Cancel',
        type: 'warning',
        onConfirm: async () => {
          try {
            console.log('🚪 Attempting to leave group:', chat.id);
            console.log('📋 Leave group parameters:', {
              chatId: chat.id,
              userId: CURRENT_USER!.id
            });
            
            const success = await leaveGroup(chat.id, CURRENT_USER!.id);
            console.log('📊 Leave group result:', success);
            
            if (success) {
              console.log('✅ Left group successfully');
              // Remove from local state and navigate away
              onUpdateChats(prevChats => prevChats.filter(c => c.id !== chat.id));
              onSetActiveChat('');
              onAddNotification(`You have left "${chat.name}"`, 'success');
            } else {
              console.error('❌ Failed to leave group');
              onAddNotification('Failed to leave group. Please try again.', 'error');
            }
          } catch (error) {
            console.error('💥 Error leaving group:', error);
            onAddNotification('An error occurred while leaving the group.', 'error');
          }
          // Close the modal
          onShowConfirmation({
            isOpen: false,
            title: '',
            message: '',
            confirmText: '',
            cancelText: '',
            onConfirm: () => {},
            onCancel: () => {},
            type: 'info'
          });
        },
        onCancel: () => {
          console.log('🚫 Leave group cancelled');
          // Close the modal
          onShowConfirmation({
            isOpen: false,
            title: '',
            message: '',
            confirmText: '',
            cancelText: '',
            onConfirm: () => {},
            onCancel: () => {},
            type: 'info'
          });
        }
      });
    } else {
      console.warn('⚠️ Cannot leave group:', {
        chatType: chat?.type,
        currentUser: CURRENT_USER
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (chat.type === 'group' && CURRENT_USER) {
      console.log('DELETE GROUP - Starting process');
      console.log('Chat info:', {
        chatId: chat.id,
        chatName: chat.name,
        participants: chat.participants.map(p => ({ id: p.id, name: p.name, role: p.role }))
      });
      console.log('👤 Current user:', {
        id: CURRENT_USER.id,
        name: CURRENT_USER.name,
        role: CURRENT_USER.role
      });
      
      // Check if current user is admin
      const currentUserParticipant = chat.participants.find(p => p.id === CURRENT_USER!.id);
      const isCurrentUserAdmin = currentUserParticipant?.role === 'admin';
      
      console.log('🔍 Role check:', {
        currentUserParticipant,
        isCurrentUserAdmin,
        allParticipants: chat.participants
      });
      
      if (!isCurrentUserAdmin) {
        console.log('❌ User is not admin, showing error');
        onAddNotification('Only group admins can delete groups.', 'error');
        return;
      }

      console.log('✅ User is admin, showing confirmation modal');
      onShowConfirmation({
        isOpen: true,
        title: 'Delete Group',
        message: `Are you sure you want to delete "${chat.name}"? This action cannot be undone and all messages will be permanently lost.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: async () => {
          try {
            console.log('🗑️ User confirmed deletion, attempting to delete group:', chat.id);
            console.log('🔍 Debug chat object:', {
              chatId: chat.id,
              chatIdType: typeof chat.id,
              chatName: chat.name,
              fullChat: chat
            });
            const success = await deleteChat(chat.id);
            console.log('🔄 Delete result:', success);
            
            if (success) {
              console.log('✅ Group deleted successfully from backend');
              onAddNotification(`Group "${chat.name}" has been deleted`, 'success');
    } else {
              console.warn('⚠️ Backend deletion failed, but updating UI anyway (group may have been removed from backend)');
              onAddNotification(`Group "${chat.name}" removed from your chat list`, 'info');
            }
          } catch (error) {
            console.error('💥 Error deleting group:', error);
            console.warn('⚠️ Backend deletion failed, but updating UI anyway (group may have been removed from backend)');
            onAddNotification(`Group "${chat.name}" removed from your chat list`, 'info');
          }
          
          // Always update UI regardless of backend success/failure
          // This handles cases where the group or users were deleted from backend
          console.log('🔄 Updating UI: Removing group from local state');
          onUpdateChats(prevChats => prevChats.filter(c => c.id !== chat.id));
          onSetActiveChat('');
          
          // Close the modal
          onShowConfirmation({
            isOpen: false,
            title: '',
            message: '',
            confirmText: '',
            cancelText: '',
            onConfirm: () => {},
            onCancel: () => {},
            type: 'info'
          });
        },
        onCancel: () => {
          console.log('❌ Delete group cancelled by user');
          // Close the modal
          onShowConfirmation({
            isOpen: false,
            title: '',
            message: '',
            confirmText: '',
            cancelText: '',
            onConfirm: () => {},
            onCancel: () => {},
            type: 'info'
          });
        }
      });
    } else {
      console.log('❌ Cannot delete group:', {
        chatType: chat?.type,
        hasCurrentUser: !!CURRENT_USER
      });
    }
  };

  const handleDeleteDirectChat = async () => {
    if (chat.type === 'direct' && CURRENT_USER) {
      console.log('🗑️ DELETE DIRECT CHAT - Starting process');
      console.log('📋 Chat info:', {
        chatId: chat.id,
        chatName: chat.name,
        participants: chat.participants.map(p => ({ id: p.id, name: p.name }))
      });
      
      // Get the other participant's name for the confirmation message
      const otherParticipant = chat.participants.find(p => p.id !== CURRENT_USER!.id);
      const otherParticipantName = otherParticipant?.name || 'this user';

      console.log('✅ Showing confirmation modal for direct chat deletion');
      onShowConfirmation({
        isOpen: true,
        title: 'Delete Chat',
        message: `Are you sure you want to delete this conversation with ${otherParticipantName}? This action cannot be undone and all messages will be permanently lost.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: async () => {
          try {
            console.log('🗑️ User confirmed deletion, attempting to delete direct chat:', chat.id);
            console.log('🔍 Debug direct chat object:', {
              chatId: chat.id,
              chatIdType: typeof chat.id,
              chatName: chat.name,
              fullChat: chat
            });
            const success = await deleteChat(chat.id);
            console.log('🔄 Delete result:', success);
            
            if (success) {
              console.log('✅ Direct chat deleted successfully from backend');
              onAddNotification(`Conversation with ${otherParticipantName} has been deleted`, 'success');
            } else {
              console.warn('⚠️ Backend deletion failed, but updating UI anyway (user may have been removed from backend)');
              onAddNotification(`Conversation with ${otherParticipantName} removed from your chat list`, 'info');
            }
          } catch (error) {
            console.error('💥 Error deleting direct chat:', error);
            console.warn('⚠️ Backend deletion failed, but updating UI anyway (user may have been removed from backend)');
            onAddNotification(`Conversation with ${otherParticipantName} removed from your chat list`, 'info');
          }
          
          // Always update UI regardless of backend success/failure
          // This handles cases where the other user was deleted from backend
          console.log('🔄 Updating UI: Removing chat from local state');
          onUpdateChats(prevChats => prevChats.filter(c => c.id !== chat.id));
          onSetActiveChat('');
          
          // Close the modal
          onShowConfirmation({
            isOpen: false,
            title: '',
            message: '',
            confirmText: '',
            cancelText: '',
            onConfirm: () => {},
            onCancel: () => {},
            type: 'info'
          });
        },
        onCancel: () => {
          console.log('❌ Delete direct chat cancelled by user');
          // Close the modal
          onShowConfirmation({
            isOpen: false,
            title: '',
            message: '',
            confirmText: '',
            cancelText: '',
            onConfirm: () => {},
            onCancel: () => {},
            type: 'info'
          });
        }
      });
    } else {
      console.log('❌ Cannot delete direct chat:', {
        chatType: chat?.type,
        hasCurrentUser: !!CURRENT_USER
      });
    }
  };

  const handleRemoveUser = (userId: string, userName: string) => {
    console.log('🔘 BUTTON CLICKED - handleRemoveUser called:', {
      userId,
      userName,
      chatType: chat?.type,
      currentUserId: CURRENT_USER?.id,
      willProceed: userId !== CURRENT_USER?.id
    });
    
    // Allow removal for both group and direct chats (but not removing yourself)
    if (userId !== CURRENT_USER?.id) {
      console.log('✅ Proceeding to call onRemoveUser...');
      onRemoveUser(userId, userName);
    } else {
      console.log('❌ Cannot remove yourself - blocked');
    }
  };

  const actionButtons = [
    { iconSrc: '/icons/bell.svg', label: chat.isMuted ? 'Unmute' : 'Mute', action: () => onToggleMute(chat.id) },
    { iconSrc: '/icons/pin.svg', label: chat.isPinned ? 'Unpin' : 'Pin', action: () => onTogglePin(chat.id) },
    { iconSrc: '/icons/archive.svg', label: 'Archive', action: () => onToggleArchive(chat.id) }
  ];

  return (
    <div style={{
      width: '320px',
      background: isDark ? '#1a1a1a' : '#ffffff',
      borderLeft: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      flexShrink: 0,
      position: 'relative',
      zIndex: 2000,
      boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.5)' : '-4px 0 20px rgba(0,0,0,0.15)',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease',
      borderTopRightRadius: '20px',
      borderBottomRightRadius: '20px'
    }}>
      {/* Profile/Group Info */}
      <div style={{ padding: '20px', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}` }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
            color: isDark ? '#fff' : '#495057',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '600',
            margin: '0 auto 12px',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {chat.type === 'group' ? (
              // Group chat - show first letter of group name
              chat.name ? chat.name.charAt(0).toUpperCase() : 'G'
            ) : (
              // Direct chat - show other user's profile picture or initials
              (() => {
                if (chat.participants && chat.participants.length > 0) {
                  const otherUser = chat.participants.find(p => p.id !== CURRENT_USER?.id);
                  if (otherUser) {
                    // Check if user has a profile picture
                    if (otherUser.avatar && isAvatarUrl(otherUser.avatar)) {
                      return (
                        <img
                          src={otherUser.avatar}
                          alt={otherUser.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      );
                    } else {
                      // Show user's initials
                      return getUserInitials(otherUser.name || 'Unknown User');
                    }
                  }
                }
                // Fallback to chat avatar or initials
                return chat.avatar || getUserInitials(getChatDisplayName(chat));
              })()
            )}
          </div>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            {getChatDisplayName(chat)}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            {chat.type === 'group' ? `${chat.participants.length} members` : 'Direct message'}
          </p>
        </div>
      </div>

      {/* Participants */}
      {chat.type === 'group' && (
        <div style={{ padding: '16px', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}` }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '15px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            Members ({chat.participants.length})
          </h4>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {chat.participants.map((participant, idx) => {
              // Generate correct initials for this participant
              const correctInitials = getUserInitials(participant.name || 'Unknown User');
              
              return (
                <div 
                  key={idx} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'background 0.2s ease',
                    position: 'relative',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {correctInitials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: isDark ? '#ffffff' : '#1a1a1a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {participant.name || 'Unknown User'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#adb5bd' : '#6c757d'
                    }}>
                      {participant.email || 'No email'}
                    </div>
                  </div>
                  <StatusIndicator status={participant.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shared Media */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}` }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '15px',
          fontWeight: '600',
          color: isDark ? '#ffffff' : '#1a1a1a'
        }}>
          Shared Media
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              onClick={() => handleMediaClick(item - 1)}
                  style={{
                aspectRatio: '1',
                background: isDark ? '#2a2a2a' : '#f8f9fa',
                    borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                    cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f8f9fa';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
                </div>
              ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '16px' }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '15px',
          fontWeight: '600',
          color: isDark ? '#ffffff' : '#1a1a1a'
        }}>
          Chat Settings
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { iconSrc: '/icons/bell.svg', label: 'Notifications', value: !chat.isMuted, action: () => onToggleMute(chat.id) },
            { iconSrc: '/icons/pin.svg', label: 'Pin Chat', value: chat.isPinned, action: () => onTogglePin(chat.id) },
            { iconSrc: '/icons/archive.svg', label: 'Archive Chat', value: chat.isArchived, action: () => onToggleArchive(chat.id) }
          ].map((setting, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '13px',
                  color: isDark ? '#ffffff' : '#1a1a1a'
                }}>
                  {setting.label}
                </span>
              </div>
              <div 
                onClick={setting.action}
                style={{
                  width: '40px',
                  height: '20px',
                  borderRadius: '12px',
                  background: setting.value ? '#10b981' : isDark ? '#404040' : '#dee2e6',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: '2px',
                  left: setting.value ? '22px' : '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Group Actions - Only show for groups */}
        {chat.type === 'group' && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '15px',
              fontWeight: '600',
              color: isDark ? '#ffffff' : '#1a1a1a'
            }}>
              Group Actions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
                onClick={handleLeaveGroup}
          style={{
                  background: isDark ? '#2a2a2a' : '#f8f9fa',
                  border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#f59e0b',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f8f9fa';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,12 9,12 9,9"/>
                  <path d="M21 12H9"/>
                </svg>
                Leave Group
              </button>
              {/* Only show Delete button to admins */}
              {CURRENT_USER && chat.created_by === CURRENT_USER.id && (
                <button
                  onClick={handleDeleteGroup}
                  style={{
                    background: isDark ? '#2a2a2a' : '#f8f9fa',
                    border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#ef4444',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f8f9fa';
                  }}
                >
                  <span></span>
                  Delete Group
                </button>
        )}
      </div>
          </div>
        )}

        {/* Direct Chat Actions - Only show for direct chats */}
        {chat.type === 'direct' && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '15px',
              fontWeight: '600',
              color: isDark ? '#ffffff' : '#1a1a1a'
            }}>
              Chat Actions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={handleDeleteDirectChat}
                style={{
                  background: isDark ? '#2a2a2a' : '#f8f9fa',
                  border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f8f9fa';
                }}
              >
                <span></span>
                Delete Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add notification component
const NotificationBubble = ({ notification, onRemove, isDark }: { 
  notification: Notification, 
  onRemove: (id: string) => void, 
  isDark: boolean 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Smooth entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [notification.id]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 400);
  };

  const getNotificationConfig = () => {
    switch (notification.type) {
      case 'success': 
        return {
          color: '#10b981',
          bgColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
          icon: '✓',
          borderColor: 'rgba(16, 185, 129, 0.3)'
        };
      case 'error': 
        return {
          color: '#ef4444',
          bgColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
          icon: '✕',
          borderColor: 'rgba(239, 68, 68, 0.3)'
        };
      case 'warning': 
        return {
          color: '#f59e0b',
          bgColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
          icon: '⚠',
          borderColor: 'rgba(245, 158, 11, 0.3)'
        };
      case 'info': 
        return {
          color: '#3b82f6',
          bgColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          icon: 'ℹ',
          borderColor: 'rgba(59, 130, 246, 0.3)'
        };
      default: 
        return {
          color: '#6b7280',
          bgColor: isDark ? 'rgba(107, 114, 128, 0.1)' : 'rgba(107, 114, 128, 0.05)',
          icon: '•',
          borderColor: 'rgba(107, 114, 128, 0.3)'
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        background: isDark 
          ? `linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(42, 42, 42, 0.95) 100%)`
          : `linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${config.borderColor}`,
            borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: isDark 
          ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 0 0 1px ${config.borderColor}`
          : `0 20px 40px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 0 0 1px ${config.borderColor}`,
        zIndex: 1000,
        minWidth: '320px',
        maxWidth: '420px',
        transform: isExiting 
          ? 'translateX(100%) scale(0.8) rotateY(15deg)' 
          : isVisible 
            ? 'translateX(0) scale(1) rotateY(0deg)' 
            : 'translateX(100%) scale(0.8) rotateY(15deg)',
        opacity: isExiting ? 0 : isVisible ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        overflow: 'hidden'
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${config.bgColor} 0%, transparent 100%)`,
          borderRadius: '16px',
          opacity: 0.6
        }}
      />
      
      {/* Icon with pulsing animation */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${config.color}40, 0 0 0 3px ${config.color}20`,
          animation: 'pulse 2s infinite',
          zIndex: 1
        }}
      >
        {config.icon}
                  </div>
      
      {/* Content */}
      <div style={{ flex: 1, zIndex: 1 }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1f2937',
            lineHeight: '1.4',
            marginBottom: '2px',
            letterSpacing: '-0.01em'
          }}
        >
          {notification.message}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: isDark ? '#9ca3af' : '#6b7280',
            fontWeight: '500'
          }}
        >
          {new Date(notification.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      
      {/* Close button with hover effects */}
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent',
            border: 'none',
          color: isDark ? '#9ca3af' : '#6b7280',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px',
          borderRadius: '8px',
          flexShrink: 0,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1,
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
          e.currentTarget.style.color = '#ef4444';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = isDark ? '#9ca3af' : '#6b7280';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ×
      </button>
      
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${config.color} 0%, ${config.color}80 100%)`,
          borderRadius: '0 0 16px 16px',
          animation: 'progress 5s linear',
          transformOrigin: 'left'
        }}
      />
      
      {/* Add keyframes for animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes progress {
            0% { width: 100%; }
            100% { width: 0%; }
          }
        `}
      </style>
      </div>
  );
};

// Add confirmation modal component
const ConfirmationModal = ({ modal, isDark }: { 
  modal: ConfirmationModal, 
  isDark: boolean 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (modal.isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [modal.isOpen]);

  if (!modal.isOpen) return null;

  const getModalConfig = () => {
    switch (modal.type) {
      case 'danger':
        return {
          color: '#ef4444',
          bgColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
          icon: '⚠',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          buttonColor: '#ef4444'
        };
      case 'warning':
        return {
          color: '#f59e0b',
          bgColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
          icon: '⚠',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          buttonColor: '#f59e0b'
        };
      case 'info':
        return {
          color: '#3b82f6',
          bgColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          icon: 'ℹ',
          borderColor: 'rgba(59, 130, 246, 0.3)',
          buttonColor: '#3b82f6'
        };
      default:
        return {
          color: '#6b7280',
          bgColor: isDark ? 'rgba(107, 114, 128, 0.1)' : 'rgba(107, 114, 128, 0.05)',
          icon: '?',
          borderColor: 'rgba(107, 114, 128, 0.3)',
          buttonColor: '#6b7280'
        };
    }
  };

  const config = getModalConfig();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          modal.onCancel?.();
        }
      }}
    >
      <div
        style={{
          background: isDark 
            ? `linear-gradient(135deg, rgba(26, 26, 26, 0.98) 0%, rgba(42, 42, 42, 0.98) 100%)`
            : `linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1px solid ${config.borderColor}`,
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: isDark 
            ? `0 32px 64px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05) inset`
            : `0 32px 64px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.8) inset`,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Background gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${config.bgColor} 0%, transparent 100%)`,
            borderRadius: '20px',
            opacity: 0.4
          }}
        />

        {/* Header with icon */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          marginBottom: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: `0 8px 16px ${config.color}40, 0 0 0 4px ${config.color}20`,
              animation: 'pulse 2s infinite'
            }}
          >
            {config.icon}
            </div>
                    <div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: isDark ? '#ffffff' : '#1f2937',
                letterSpacing: '-0.02em'
              }}
            >
              {modal.title}
            </h2>
                    </div>
                  </div>

        {/* Message */}
        <div
                  style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: isDark ? '#d1d5db' : '#4b5563',
            marginBottom: '32px',
            position: 'relative',
            zIndex: 1
          }}
        >
          {modal.message}
        </div>

        {/* Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          position: 'relative',
          zIndex: 1
        }}>
          <button
            onClick={modal.onCancel}
            style={{
              background: isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(243, 244, 246, 0.8)',
              border: `1px solid ${isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.6)'}`,
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              color: isDark ? '#d1d5db' : '#374151',
                    cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(243, 244, 246, 1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(243, 244, 246, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {modal.cancelText}
          </button>
          <button
            onClick={modal.onConfirm}
            style={{
              background: `linear-gradient(135deg, ${config.buttonColor} 0%, ${config.buttonColor}dd 100%)`,
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: `0 4px 12px ${config.buttonColor}40`
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 8px 20px ${config.buttonColor}50`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${config.buttonColor}40`;
            }}
          >
            {modal.confirmText}
          </button>
                </div>
      </div>
    </div>
  );
};

// Global Hover Popup Component
const GlobalHoverPopup = ({ 
  state, 
  onClose, 
  onReact, 
  onReply, 
  onEdit, 
  onDelete, 
  isDark
}: { 
  state: HoverPopupState;
  onClose: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  isDark: boolean;
}) => {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥', '💯', '✨', '💪', '🤔', '😎', '🥳', '😴', '🤯', '😍', '🤩', '😭', '🤬', '🤮', '🤧', '🤠', '👻', '🤖', '👽', '👾', '🤡', '👹', '👺', '💀', '☠️'];
  
  // CLICK-OFF HANDLER
  React.useEffect(() => {
    if (!state.activeMessageId) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.hover-popup')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.activeMessageId, onClose]);

  if (!state.activeMessageId || !state.position || !state.message) return null;

  return (
    <div
      className="hover-popup"
      style={{
        position: 'fixed',
        top: state.position.y,
        left: state.position.x,
        background: isDark ? '#2a2a2a' : '#ffffff',
        borderRadius: '12px',
        padding: '8px',
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
        border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
        zIndex: 999999, // HIGHEST POSSIBLE - above ALL UI elements
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '280px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      {/* X Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: isDark ? '#404040' : '#e9ecef',
          border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
          color: isDark ? '#adb5bd' : '#6c757d',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'all 0.2s ease',
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1,
          lineHeight: '1',
          padding: 0,
          minWidth: '20px',
          minHeight: '20px'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = isDark ? '#dc2626' : '#ef4444';
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
          e.currentTarget.style.color = isDark ? '#adb5bd' : '#6c757d';
        }}
      >
        ×
      </button>
      {/* Emoji reaction picker */}
      <div style={{
        maxHeight: '80px',
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '4px',
        padding: '4px',
        borderBottom: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
        marginBottom: '8px'
      }}>
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onReact(state.message!.id, emoji);
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'space-around'
      }}>
        <button
          onClick={() => {
            onReply(state.message!);
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '4px',
            color: isDark ? '#ffffff' : '#1a1a1a',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Reply
        </button>
        <button
          onClick={() => {
            onEdit(state.message!);
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '4px',
            color: isDark ? '#ffffff' : '#1a1a1a',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Edit
        </button>
        <button
          onClick={() => {
            onDelete(state.message!);
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '4px',
            color: '#ef4444',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};



// Main component for the enhanced Teams Chat page
export default function TeamChatPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [teamSearchResults, setTeamSearchResults] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'archived'>('chats');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [companyTeams, setCompanyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupUserSearch, setGroupUserSearch] = useState(''); // New search field for group creation
  const [recentUsers, setRecentUsers] = useState<User[]>([]); // Track recent/frequent users
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentUserRefresh, setCurrentUserRefresh] = useState(0); // Force re-render when user profile changes
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
    onCancel: () => {},
    type: 'warning'
  });
  
  // New state for enhanced chat features
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionModalPosition, setActionModalPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);
  const [reactionPopupPosition, setReactionPopupPosition] = useState({ x: 0, y: 0, width: 0 });
  
  // Global hover popup state
  const [hoverPopupState, setHoverPopupState] = useState<HoverPopupState>({
    activeMessageId: null,
    position: null,
    message: null,
    hideTimeoutId: null
  });
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);

  const isDark = theme === 'dark';
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const colors = themes[isDark ? 'dark' : 'light'];

  // Function to refresh current user with full profile data
  const refreshCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      console.log('🔍 Refreshing current user:', user.id);

      // Get full profile data by email instead of ID
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_user_profile_by_email', { user_email: user.email });

      console.log('📊 Profile data response:', { profileData, profileError });

      if (profileError || !profileData || profileData.length === 0) {
        console.warn('⚠️ Could not fetch profile data, using auth data only');
        CURRENT_USER = convertSupabaseUser(user);
        setCurrentUserRefresh(prev => prev + 1);
        return;
      }

      const profile = profileData[0];
      console.log('👤 Raw profile data:', profile);
      console.log('🖼️ Avatar URL from profile:', profile.avatar_url);
      console.log('🔍 Is avatar URL check:', isAvatarUrl(profile.avatar_url));
      
      // Update CURRENT_USER with full profile data
      CURRENT_USER = {
        id: profile.id,
        name: profile.name || 'Unknown User',
        avatar: profile.avatar_url && isAvatarUrl(profile.avatar_url) 
          ? profile.avatar_url 
          : getUserInitials(profile.name || 'Unknown User'),
        status: (profile.status || 'online') as UserStatus,
        email: profile.email,
        company_id: profile.company_id,
        role: user.role as 'admin' | 'member',
        company_role: profile.company_role
      };
      
      console.log('✅ Current user refreshed with profile data:', CURRENT_USER);
      console.log('🖼️ Final avatar value:', CURRENT_USER.avatar);
      
      // Force re-render
      setCurrentUserRefresh(prev => prev + 1);
    } catch (error) {
      console.error('❌ Error refreshing current user:', error);
    }
  };

  // Real-time subscription management
  let userProfileSubscription: any = null;

  const setupRealtimeSubscriptions = () => {
    if (!CURRENT_USER?.company_id) return;

    console.log('🔄 Setting up real-time user profile subscriptions...');

    // Subscribe to user profile changes for company users
    userProfileSubscription = supabase
      .channel('user-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `company_id=eq.${CURRENT_USER.company_id}`
        },
        async (payload) => {
          console.log('👤 User profile updated:', payload);
          
          const updatedUser = payload.new;
          
          // Update current user if it's their own profile
          if (updatedUser.id === CURRENT_USER?.id) {
            await refreshCurrentUser();
            return;
          }
          
          // Update other users in company users list
          setCompanyUsers(prevUsers => 
            prevUsers.map(user => 
              user.id === updatedUser.id
                ? {
                    ...user,
                    name: updatedUser.name || user.name,
                    avatar: updatedUser.avatar_url && isAvatarUrl(updatedUser.avatar_url)
                      ? updatedUser.avatar_url
                      : getUserInitials(updatedUser.name || 'Unknown User'),
                    status: (updatedUser.status || 'online') as UserStatus,
                    email: updatedUser.email || user.email,
                    company_id: updatedUser.company_id || user.company_id,
                    role: user.role, // Keep existing role
                    company_role: updatedUser.company_role
                  }
                : user
            )
          );

          // Update chats to reflect profile changes in participant data
          setChats(prevChats =>
            prevChats.map(chat => ({
              ...chat,
              participants: chat.participants?.map(participant =>
                participant.id === updatedUser.id
                  ? {
                      ...participant,
                      name: updatedUser.name || participant.name,
                      avatar: updatedUser.avatar_url && isAvatarUrl(updatedUser.avatar_url)
                        ? updatedUser.avatar_url
                        : getUserInitials(updatedUser.name || 'Unknown User'),
                      status: (updatedUser.status || 'online') as UserStatus,
                      company_role: updatedUser.company_role
                    }
                  : participant
              )
            }))
          );

          console.log('✅ Profile updates applied to UI');
        }
      )
      .subscribe();

    console.log('✅ Real-time user profile subscriptions active');
  };

  const cleanupRealtimeSubscriptions = () => {
    console.log('🧹 Cleaning up real-time subscriptions...');
    
    if (userProfileSubscription) {
      supabase.removeChannel(userProfileSubscription);
      userProfileSubscription = null;
    }
    
    console.log('✅ Real-time subscriptions cleaned up');
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      const user = await getCurrentUser();
      if (!user) {
        // Redirect to login if no user (this should be handled at app level)
        navigate('/login');
        return;
      }
      
      console.log('🔍 Raw user from getCurrentUser():', user);
      CURRENT_USER = convertSupabaseUser(user);
      console.log('👤 CURRENT_USER after conversion:', CURRENT_USER);
      console.log('🏢 CURRENT_USER company_id:', CURRENT_USER?.company_id);
      
      // Refresh current user with full profile data
      await refreshCurrentUser();
      
      await loadInitialData();
      
      // Set up real-time subscriptions after data is loaded
      setupRealtimeSubscriptions();
    };

    initializeData();

    // Cleanup subscriptions on unmount
    return () => {
      cleanupRealtimeSubscriptions();
    };
  }, [navigate]);

  const loadInitialData = async () => {
    if (!CURRENT_USER) return;
    
    try {
      setLoading(true);
      
      // Load user's chats
      const userChats = await getUserChats(CURRENT_USER.id);
      const convertedChats = userChats.map(convertSupabaseChat);
      setChats(convertedChats);
      
      // Load company users and teams
      const authUser = await getCurrentUser();
      if (authUser) {
        console.log('🔍 Loading company users for company:', authUser.company_id);
        try {
          const users = await getCompanyUsers(authUser.company_id);
          console.log('👥 Raw company users from database:', users);
          const convertedUsers = users.filter(u => u.id !== CURRENT_USER?.id).map(convertSupabaseUser);
          console.log('👥 Converted company users:', convertedUsers);
          setCompanyUsers(convertedUsers);
        } catch (error) {
          console.error('Failed to fetch company users:', error);
          setCompanyUsers([]);
        }
        
        try {
          const teams = await getCompanyTeams(authUser.company_id);
          const convertedTeams = teams.map(team => ({
            id: team.id,
            name: team.name,
            description: team.description,
            avatar: team.avatar,
            member_count: team.member_count || 0,
            members: team.members?.map(member => convertSupabaseUser(member.user!)).filter(Boolean)
          }));
          setCompanyTeams(convertedTeams);
        } catch (error) {
          console.error('Failed to fetch company teams:', error);
          setCompanyTeams([]);
        }
      }
      
      // Select first chat if available
      if (convertedChats.length > 0) {
        await selectChat(convertedChats[0].id);
      }
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up subscriptions after initial data load
  useEffect(() => {
    if (!CURRENT_USER || chats.length === 0) return;

    const subscriptions: any[] = [];

    const setupSubscriptions = async () => {
    // Subscribe to messages for ALL user chats
    chats.forEach(chat => {
      console.log(`🔔 Subscribing to messages for chat: ${chat.name} (${chat.id})`);
      try {
        const subscription = subscribeToMessages(chat.id, handleNewMessage);
        if (subscription) {
          subscriptions.push(subscription);
        }
      } catch (error) {
        console.error(`Failed to subscribe to chat ${chat.id}:`, error);
      }
    });

    // Subscribe to user status changes
      const currentAuthUser = await getCurrentUser();
    if (currentAuthUser) {
      try {
        const statusSubscription = subscribeToUserStatus(currentAuthUser.company_id, handleUserStatusChange);
        if (statusSubscription) {
          subscriptions.push(statusSubscription);
        }
      } catch (error) {
        console.error('Failed to subscribe to user status:', error);
      }
    }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up subscriptions...');
      subscriptions.forEach(subscription => {
        try {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
          }
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
    };
  }, [chats.length, CURRENT_USER?.id]); // Only re-run when chats change or user changes

  const selectChat = async (chatId: string) => {
    console.log('🎯 selectChat called for:', chatId);
    console.log('👤 Current user in selectChat:', CURRENT_USER);
    
    setActiveChatId(chatId);
    setSearchQuery('');
    setShowRightPanel(false);
    
    try {
      console.log('📨 Fetching messages for chat:', chatId);
      const chatMessages = await getChatMessages(chatId);
      console.log('📨 Messages received:', chatMessages?.length || 0);
      
      const convertedMessages = chatMessages.map(convertSupabaseMessage);
      console.log('📨 Converted messages:', convertedMessages?.length || 0);
      
      // Update the specific chat with its messages
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages: convertedMessages }
            : chat
        )
      );
      
      console.log('✅ Chat messages updated successfully');
      
      // No need to subscribe here anymore - we subscribe to all chats in loadInitialData
    } catch (error) {
      console.error('❌ Failed to load chat messages:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create a subtle notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant notification sound (C major chord)
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Fallback for browsers that don't support Web Audio API
      console.log('Audio notification not supported');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const showBrowserNotification = (sender: string, message: string, chatName: string, chatType: ChatType) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = '';
      const title = chatType === 'direct' ? `${sender}` : `${sender} in ${chatName}`;
      const body = message.length > 100 ? message.substring(0, 100) + '...' : message;
      
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico', // You can customize this with your app icon
        badge: '/favicon.ico',
        tag: 'timely-message', // This prevents duplicate notifications
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click to focus app
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  // Initialize notification permission on component mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleNewMessage = (message: SupabaseMessage) => {
    console.log('🔔 New message received:', {
      messageId: message.id,
      senderId: message.sender_id,
      currentUserId: CURRENT_USER?.id,
      chatId: message.chat_id,
      activeChatId: activeChatId,
      content: message.content,
      isFromCurrentUser: message.sender_id === CURRENT_USER?.id,
      timestamp: message.created_at
    });

    // Don't add message if it's from the current user (they already see it immediately)
    if (message.sender_id === CURRENT_USER?.id) {
      console.log('❌ Skipping notification - message is from current user');
      return;
    }
    
    const convertedMessage = convertSupabaseMessage(message);
    
    // Find the chat and sender info for the notification
    const chat = chats.find(c => c.id === message.chat_id);
    const sender = companyUsers.find(u => u.id === message.sender_id) || 
                  chat?.participants.find(p => p.id === message.sender_id);
    
    console.log('🔍 Notification check:', {
      chatFound: !!chat,
      senderFound: !!sender,
      chatName: chat?.name,
      senderName: sender?.name,
      isActiveChat: message.chat_id === activeChatId,
      hasFocus: document.hasFocus(),
      shouldNotify: chat && sender && (message.chat_id !== activeChatId || !document.hasFocus())
    });
    
    // Only show browser notification if app is not focused (no in-app notifications)
    if (chat && sender && !document.hasFocus()) {
      console.log('✅ Showing browser notification - app not focused');
      
      // Play notification sound
      console.log('🔊 Playing notification sound');
      playNotificationSound();
      
      // Show browser notification only when app is not focused
      console.log('🌐 Showing browser notification');
      showBrowserNotification(sender.name, message.content, chat.name, chat.type);
    } else {
      console.log('❌ Not showing notification - app is focused or conditions not met');
    }
    
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === message.chat_id) {
          // Check if message already exists to prevent duplicates
          const messageExists = chat.messages.some(msg => msg.id === message.id);
          if (messageExists) {
            return chat; // Don't add duplicate message
          }
          
          return {
            ...chat, 
            messages: [...chat.messages, convertedMessage],
            lastMessage: message.content,
            timestamp: message.created_at
          };
        }
        return chat;
      })
    );
    scrollToBottom();
  };

  const handleUserStatusChange = (updatedUser: AuthUser) => {
    const convertedUser = convertSupabaseUser(updatedUser);
    setCompanyUsers(prev => 
      prev.map(user => 
        user.id === updatedUser.id ? convertedUser : user
      )
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
        setSearchResults([]);
        setTeamSearchResults([]);
        return;
    }
    
    console.log('🔍 Searching with query:', searchQuery);
    console.log('👥 Available company users:', companyUsers);
    
    // Search users - show ALL company users regardless of existing chats
    const userResults = companyUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('🔍 User search results:', userResults);
    setSearchResults(userResults);
    
    // Search teams
    const teamResults = companyTeams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('🔍 Team search results:', teamResults);
    setTeamSearchResults(teamResults);
  }, [searchQuery, companyUsers, companyTeams]); // Removed 'chats' dependency

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setSearchQuery('');
    setShowRightPanel(false);
  };

  const handleStartNewChat = async (user: User) => {
    console.log('🎯 HANDLE START NEW CHAT - Button clicked for user:', {
      userId: user?.id,
      userName: user?.name,
      currentUser: CURRENT_USER?.id
    });

    if (!CURRENT_USER) {
      console.error('❌ No current user found')
      return
    }
    const authUser = await getCurrentUser();
    if (!authUser) {
      console.error('❌ No authenticated user found')
      return
    }
    if (!user?.id) {
      console.error('❌ Recipient user ID is missing!')
      return
    }
    console.log('🚀 Creating direct chat:', { user1Id: CURRENT_USER.id, user2Id: user.id, companyId: authUser.company_id });
    try {
      console.log('📞 Calling createDirectChat...');
      const newChat = await createDirectChat(CURRENT_USER.id, user.id, authUser.company_id)
      if (newChat) {
        const convertedChat = convertSupabaseChat(newChat)
        setChats(prev => {
          const exists = prev.find(c => c.id === convertedChat.id)
          if (exists) return prev
          return [convertedChat, ...prev]
        })
        setActiveChatId(convertedChat.id)
        setSearchQuery('')
        console.log(`✅ Started chat with ${user.name}`)
      } else {
        console.error('Failed to create chat - null response')
      }
    } catch (error) {
      console.error('Error creating direct chat:', error)
    }
  }

  const handleStartTeamChat = async (team: Team) => {
    console.log('🏢 Starting team chat for:', team.name);
    
    if (!CURRENT_USER) {
      console.error('❌ No current user found');
      addNotification('Authentication error: Please log in again', 'error');
      return;
    }

    const authUser = await getCurrentUser();
    if (!authUser) {
      console.error('❌ No authenticated user found');
      addNotification('Authentication error: Please log in again', 'error');
      return;
    }

    console.log('👤 Current user:', CURRENT_USER.name);
    console.log('🏢 Team details:', { id: team.id, name: team.name, members: team.member_count });

    try {
      // Check if team chat already exists by name
      const existingChat = chats.find(chat => 
        chat.type === 'group' && 
        chat.name === `${team.name} Team Chat`
      );

      if (existingChat) {
        console.log('✅ Team group chat already exists, opening:', existingChat.name);
        setActiveChatId(existingChat.id);
        setSearchQuery('');
        addNotification(`Opened ${team.name} chat`, 'success');
        return;
      }

      console.log('🔄 Creating new group chat for team...');
      
      // Get team members from the team
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id);

      if (teamError) {
        console.error('❌ Failed to fetch team members:', teamError);
        addNotification(`Failed to fetch team members for ${team.name}`, 'error');
        return;
      }

      const participantIds = teamMembers?.map(member => member.user_id) || [];
      
      // Ensure creator is included in participants
      if (!participantIds.includes(CURRENT_USER.id)) {
        participantIds.push(CURRENT_USER.id);
      }

      console.log('👥 Team participants:', participantIds);

      // Create the group chat directly
      const chatInsert = {
        company_id: authUser.company_id,
        name: `${team.name} Team Chat`,
        type: 'group' as const,
        avatar: team.name.substring(0, 2).toUpperCase(),
        created_by: CURRENT_USER.id,
        is_archived: false
      };

      console.log('📝 Chat insert data:', chatInsert);

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert(chatInsert)
        .select()
        .single();

      if (chatError) {
        console.error('❌ Failed to create chat:', chatError);
        throw chatError;
      }

      console.log('✅ Chat created successfully:', chatData.id);

      // Add all team members as chat participants
      const participantInserts = participantIds.map(userId => ({
        chat_id: chatData.id,
        user_id: userId,
        role: "member" as const,
        joined_at: new Date().toISOString(),
        is_muted: false,
        is_pinned: false,
        company_id: authUser.company_id
      }));

      console.log('👥 Adding participants:', participantInserts.length, 'participants');

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantInserts);

      if (participantsError) {
        console.error('❌ Failed to add participants:', participantsError);
        // Clean up chat if participants insertion fails
        await supabase.from('chats').delete().eq('id', chatData.id);
        throw participantsError;
      }

      console.log('✅ Participants added successfully');

      // Fetch the complete chat data with participants
      const { data: completeChat, error: fetchError } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants(
            id,
            user_id,
            role,
            joined_at,
            is_muted,
            is_pinned,
            user:users!chat_participants_user_id_fkey(*)
          )
        `)
        .eq('id', chatData.id)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch complete chat:', fetchError);
        throw fetchError;
      }

      const convertedChat = convertSupabaseChat(completeChat);
      
      // Ensure it's marked as a group chat
      const enhancedChat = {
        ...convertedChat,
        type: 'group' as ChatType,
        name: `${team.name} Team Chat`,
        avatar: team.name.substring(0, 2).toUpperCase()
      };

      setChats(prev => {
        const exists = prev.find(c => c.id === enhancedChat.id);
        if (exists) return prev;
        return [enhancedChat, ...prev];
      });
      
      setActiveChatId(enhancedChat.id);
      setSearchQuery('');
      console.log(`🎉 Group chat for team ${team.name} created successfully!`);
      addNotification(`${team.name} group chat created successfully`, 'success');
      
    } catch (error) {
      console.error('💥 Error creating group chat for team:', error);
      addNotification(`Error creating group chat for ${team.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleCreateGroup = async () => {
    console.log('🚀 CREATE GROUP - Starting process');
    console.log('📋 Group creation parameters:', {
      groupName: groupName.trim(),
      selectedUsers: selectedUsers.map(u => ({ id: u.id, name: u.name })),
      selectedUsersLength: selectedUsers.length,
      currentUser: CURRENT_USER ? { id: CURRENT_USER.id, name: CURRENT_USER.name } : null
    });

    if (!groupName.trim()) {
      console.log('❌ Group name is empty');
      addNotification('Please enter a group name', 'error');
      return;
    }

    if (selectedUsers.length === 0) {
      console.log('❌ No users selected');
      addNotification('Please select at least one user', 'error');
      return;
    }

    if (!CURRENT_USER) {
      console.log('❌ No current user');
      addNotification('Authentication error', 'error');
      return;
    }

    try {
      console.log('🔍 Getting authenticated user...');
      const authUser = await getCurrentUser();
      console.log('👤 Auth user:', authUser);
      
      if (!authUser) {
        console.log('❌ No authenticated user found');
        addNotification('Authentication error', 'error');
        return;
      }

      // Get participant IDs
      const participantIds = selectedUsers.map(user => user.id);
      console.log('👥 Participant IDs:', participantIds);
      
      console.log('🏗️ Creating group chat with parameters:', {
        creatorId: CURRENT_USER.id,
        companyId: authUser.company_id,
        groupName: groupName.trim(),
        participantIds
      });

      // Create group chat in Supabase
      const chat = await createGroupChat(
        CURRENT_USER.id, 
        authUser.company_id, 
        groupName.trim(), 
        participantIds
      );

      console.log('📦 Create group chat result:', chat);

      if (chat) {
        console.log('✅ Group chat created successfully, converting...');
        const convertedChat = convertSupabaseChat(chat);
        console.log('🔄 Converted chat:', convertedChat);
        
        setChats(prevChats => {
          console.log('📝 Adding to chat list, previous count:', prevChats.length);
          return [convertedChat, ...prevChats];
        });
        
        setActiveChatId(convertedChat.id);
        setShowCreateGroup(false);
        setGroupName('');
        setSelectedUsers([]);
        setGroupUserSearch('');
        
        console.log('🎉 Group creation completed successfully!');
        addNotification(`Group "${convertedChat.name}" created successfully`, 'success');
      } else {
        console.error('❌ Create group chat returned null/undefined');
        addNotification('Failed to create group chat', 'error');
      }
    } catch (error) {
      console.error('💥 Failed to create group chat:', error);
      addNotification('Failed to create group chat: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessageId(null);
    setEditText('');
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
    setReplyTo(null);
  };

  const handleDelete = async (message?: Message) => {
    if (!message) return;
    
    try {
      console.log('🗑️ Deleting message:', message.id);
      
      // First delete message reactions
      const { error: reactionsError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', message.id);
      
      if (reactionsError) {
        console.error('Error deleting message reactions:', reactionsError);
      }
      
      // Delete any replies to this message
      const { error: repliesError } = await supabase
        .from('messages')
        .delete()
        .eq('reply_to', message.id);
      
      if (repliesError) {
        console.error('Error deleting replies:', repliesError);
      }
      
      // Then delete the message itself
      const { error: messageError } = await supabase
        .from('messages')
        .delete()
        .eq('id', message.id)
        .eq('sender_id', CURRENT_USER?.id); // Only allow deleting your own messages
      
      if (messageError) {
        console.error('Error deleting message:', messageError);
        addNotification('Failed to delete message', 'error');
      } else {
        console.log('✅ Message deleted successfully:', message.id);
        addNotification('Message deleted', 'success');
        
        // Close the popup
        closeHoverPopup();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      addNotification('Failed to delete message', 'error');
    }
  };

  const handleSaveEdit = async (text: string) => {
    if (!editingMessageId || !text.trim()) return;
    
    try {
      // Use the chat library function to edit the message
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: text.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', editingMessageId)
        .eq('sender_id', CURRENT_USER?.id);

      if (error) {
        console.error('Error editing message:', error);
        return;
      }

      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.size === 0) return;

    try {
      console.log('🗑️ Deleting selected messages:', Array.from(selectedMessages));
      
      for (const messageId of selectedMessages) {
        console.log('🗑️ Deleting message:', messageId);
        
        // First delete message reactions
        const { error: reactionsError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId);
        
        if (reactionsError) {
          console.error('Error deleting message reactions:', reactionsError);
        }
        
        // Then delete the message itself
        const { error: messageError } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId)
          .eq('sender_id', CURRENT_USER?.id); // Only allow deleting your own messages
        
        if (messageError) {
          console.error('Error deleting message:', messageError);
        } else {
          console.log('✅ Message deleted successfully:', messageId);
        }
      }
      
      // Remove deleted messages from UI
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: chat.messages.filter(msg => !selectedMessages.has(msg.id)),
              }
            : chat
        )
      );
      setSelectedMessages(new Set());
      setDeleting(false);
      
      console.log('✅ All selected messages deleted');
    } catch (error) {
      console.error('Error deleting messages:', error);
    }
  };

  const handleCancelDelete = () => {
    setSelectedMessages(new Set());
    setDeleting(false);
  };

  const handleMessageSelect = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥', '💯', '✨', '💪', '🤔', '😎', '🥳', '😴', '🤯', '😍', '🤩', '😭', '🤬', '🤮', '🤧', '🤠', '👻', '🤖', '👽', '👾', '🤡', '👹', '👺', '💀', '☠️', '👻', '👽', '👾', '🤖', '💩', '🤡', '👹', '👺', '💀', '☠️', '👻', '👽', '👾', '🤖', '💩', '🤡', '👹', '👺', '💀', '☠️'];

  const handleSendMessage = async (text: string, type: MessageType = 'text') => {
    if (!activeChatId || !CURRENT_USER) return;

    try {
      // Get the replyToId if we're replying to a message
      const replyToId = replyTo?.id;
      
      const message = await sendMessage(activeChatId, CURRENT_USER.id, text, type, replyToId);
      if (message) {
        // Immediately add the message to local state so sender sees it right away
        const convertedMessage = convertSupabaseMessage(message);
        
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === activeChatId 
              ? { 
                  ...chat, 
                  messages: [...chat.messages, convertedMessage],
                  lastMessage: message.content,
                  timestamp: message.created_at
                }
              : chat
          )
        );
        
        // Clear the reply state after sending
        setReplyTo(null);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addNotification('Failed to send message', 'error');
    }
  };

  const handleFileUpload = (file: File) => {
    if (!activeChatId) return;

    const fileMessage: Message = {
      id: `msg_${Date.now()}`,
      text: file.name,
      sender: CURRENT_USER?.name || 'Unknown',
      timestamp: new Date().toISOString(), // Store raw date string
      type: file.type.startsWith('image/') ? 'image' : 'file',
      fileName: file.name,
      fileSize: file.size,
      fileUrl: URL.createObjectURL(file),
      sent: true
    };

    const updatedChats = chats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [...chat.messages, fileMessage],
          lastMessage: `📄 ${file.name}`,
          timestamp: fileMessage.timestamp,
        };
      }
      return chat;
    });

    setChats(updatedChats);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      if (!CURRENT_USER?.id) {
        console.error('No current user found', { messageId, emoji, CURRENT_USER });
        return;
      }
      console.log('handleReaction called', { messageId, emoji, userId: CURRENT_USER.id });
      
      // Check if user already has ANY reaction on this message (limit 1 per user per message)
      const { data: existingReactions, error: checkError } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', CURRENT_USER.id);
      
      if (checkError) {
        console.error('Error checking existing reactions:', checkError, { messageId, emoji, userId: CURRENT_USER.id });
        return;
      }
      
      // If user already has a reaction, remove it first
      if (existingReactions && existingReactions.length > 0) {
        for (const reaction of existingReactions) {
          await removeMessageReaction(messageId, CURRENT_USER.id, reaction.emoji);
        }
        
        // If clicking the same emoji, just remove it (toggle off)
        if (existingReactions.some(r => r.emoji === emoji)) {
          // Just removed it, don't add it back
        } else {
          // Add the new emoji
          await addMessageReaction(messageId, CURRENT_USER.id, emoji);
        }
      } else {
        // No existing reaction, add the new one
        await addMessageReaction(messageId, CURRENT_USER.id, emoji);
      }
      
      // Refetch all reactions for this message
      const { data: allReactions, error: fetchError } = await supabase
        .from('message_reactions')
        .select('emoji, user_id')
        .eq('message_id', messageId);
      if (!fetchError && allReactions) {
        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          reactions: Object.values(
                            allReactions.reduce((acc, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, users: [], count: 0 };
                              acc[r.emoji].users.push(r.user_id);
                              acc[r.emoji].count += 1;
                              return acc;
                            }, {} as Record<string, { emoji: string, users: string[], count: number }>)
                          ),
                        }
                      : msg
                  ),
                }
              : chat
          )
        );
      } else {
        console.error('Error fetching all reactions:', fetchError, { messageId });
      }
    } catch (error) {
      console.error('Error handling reaction:', error, { messageId, emoji, userId: CURRENT_USER?.id });
    }
  };

  // Enhanced chat functions
  const handleLongPressMessage = (message: Message, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    if (message.sender === CURRENT_USER?.name) {
      // Own message - show action modal
      setSelectedMessage(message);
      setActionModalPosition({ x: rect.left + rect.width / 2, y: rect.top });
      setShowActionModal(true);
    }
  };

  const handleToggleMute = (chatId: string) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, isMuted: !chat.isMuted }
          : chat
      )
    );
  };

  const handleTogglePin = (chatId: string) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, isPinned: !chat.isPinned }
          : chat
      )
    );
  };

  const handleToggleArchive = async (chatId: string) => {
    console.log('📁 TOGGLE ARCHIVE - Starting for chat:', chatId);
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
      console.error('❌ Chat not found in local state');
      return;
    }

    console.log('📋 Current archive status in UI:', chat.isArchived);

    try {
      // Call database function
      const success = await toggleChatArchive(chatId);
      
      if (success) {
        // Update local state only if database update succeeded
    setChats(prevChats => 
          prevChats.map(c => 
            c.id === chatId 
              ? { ...c, isArchived: !c.isArchived }
              : c
      )
    );
    
        const newStatus = !chat.isArchived;
        console.log('✅ Archive status updated successfully:', newStatus);
      addNotification(
          `Chat "${chat.name}" ${newStatus ? 'archived' : 'unarchived'}`,
          'success'
      );
      } else {
        console.error('❌ Failed to toggle archive status');
        addNotification('Failed to update archive status', 'error');
      }
    } catch (error) {
      console.error('💥 Error toggling archive:', error);
      addNotification('An error occurred while updating archive status', 'error');
    }
  };

  const handleNewChatClick = () => {
    setShowCreateGroup(false);
    // Toggle search or show new chat modal
    if (searchQuery) {
      setSearchQuery('');
    } else {
      // Focus on search input to start new chat
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  };

  const handleCreateGroupClick = () => {
    setShowCreateGroup(!showCreateGroup);
    setSelectedUsers([]);
    setGroupName('');
    setGroupUserSearch('');
  };

  // Get top 3 suggested users (most recent chats or frequently contacted)
  const getSuggestedUsers = (): User[] => {
    // Get users from recent direct chats, prioritizing most recent
    const directChatUsers = chats
      .filter(chat => chat.type === 'direct')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3)
      .map(chat => chat.participants.find(p => p.id !== CURRENT_USER?.id))
      .filter(Boolean) as User[];

    // Fill remaining slots with other company users if needed
    const remainingSlots = 3 - directChatUsers.length;
    if (remainingSlots > 0) {
      const otherUsers = companyUsers
        .filter(user => !directChatUsers.some(du => du.id === user.id))
        .slice(0, remainingSlots);
      return [...directChatUsers, ...otherUsers];
    }

    return directChatUsers;
  };

  const filteredGroupUsers = companyUsers.filter(user => {
    if (groupUserSearch.trim() === '') return true;
    return user.name.toLowerCase().includes(groupUserSearch.toLowerCase()) ||
           user.email?.toLowerCase().includes(groupUserSearch.toLowerCase());
  });

  const filteredChats = chats.filter(chat => {
    if (activeTab === 'archived') return chat.isArchived;
    if (activeTab === 'groups') return chat.type === 'group' && !chat.isArchived;
    if (activeTab === 'chats') return !chat.isArchived; // Show both direct and group chats
    return !chat.isArchived;
  }).sort((a, b) => {
    // Sort pinned chats to the top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const handleLogout = async () => {
    await logout();
    CURRENT_USER = null;
    navigate('/');
  };

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random()}`,
      message,
      type,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, notification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleRemoveUserFromGroup = async (userId: string, userName: string) => {
    if (!activeChat || !CURRENT_USER) return;

    // Show custom confirmation modal instead of browser confirm
    setConfirmationModal({
      isOpen: true,
      title: 'Remove User',
      message: `Are you sure you want to remove ${userName} from "${activeChat.name}"? This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        if (!CURRENT_USER) return; // Additional null check for the async callback
        
        try {
          const success = await removeUserFromGroup(activeChat.id, userId, CURRENT_USER.id);
          if (success) {
            // Update local state
            setChats(prevChats => 
              prevChats.map(chat => 
                chat.id === activeChat.id 
                  ? { ...chat, participants: chat.participants.filter(p => p.id !== userId) }
                  : chat
              )
            );
            addNotification(`${userName} has been removed from the group`, 'success');
    } else {
            addNotification('Failed to remove user from group', 'error');
          }
        } catch (error) {
          console.error('Error removing user from group:', error);
          addNotification('An error occurred while removing the user', 'error');
        }
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };



  // Global hover popup management functions
  const showHoverPopup = (message: Message, event: React.MouseEvent) => {
    // Clear any existing timeout
    if (hoverPopupState.hideTimeoutId) {
      clearTimeout(hoverPopupState.hideTimeoutId);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Popup dimensions
    const popupWidth = 280;
    const popupHeight = 200;
    
    // Position popup below the bubble, starting from its right edge
    let x = rect.right - popupWidth; // Start from right edge of bubble
    let y = rect.bottom + 8; // Position below the bubble
    
    // If popup would go off the right side of screen, adjust to fit
    if (x + popupWidth > viewportWidth - 10) {
      x = viewportWidth - popupWidth - 10;
    }
    
    // If popup would go off the left side of screen, adjust to fit
    if (x < 10) {
      x = 10;
    }
    
    // If popup would go below screen, position it above the bubble
    if (y + popupHeight > viewportHeight - 10) {
      y = rect.top - popupHeight - 8;
    }
    
    setHoverPopupState({
      activeMessageId: message.id,
      position: { x, y },
      message: message,
      hideTimeoutId: null
    });
  };

  const closeHoverPopup = () => {
    setHoverPopupState({
      activeMessageId: null,
      position: null,
      message: null,
      hideTimeoutId: null
    });
  };

  // Debug logging
  console.log('🔍 Rendering TeamChatPage with CURRENT_USER:', CURRENT_USER);
  
  // Add loading state check
  if (loading) {
  return (
      <div style={{ 
              display: 'flex',
              justifyContent: 'center',
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666',
        background: isDark ? '#0f0f0f' : '#f8f9fa'
      }}>
        Loading...
                    </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark 
        ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
        : '#f7f8fa',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Notifications */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {notifications.map(notification => (
          <div key={notification.id} style={{ pointerEvents: 'auto' }}>
            <NotificationBubble
              notification={notification}
              onRemove={removeNotification}
              isDark={isDark}
            />
                </div>
              ))}

            </div>

      {/* Main Content with Glass Effect */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        height: 'calc(100vh - 80px)',
        background: colors.bg,
        transition: 'background 0.2s, color 0.2s',
        overflow: 'hidden',
        margin: '20px',
        borderRadius: '20px',
        boxShadow: isDark 
          ? '0 8px 32px rgba(0,0,0,0.4)' 
          : '0 8px 32px rgba(0,0,0,0.1)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
      }}>
        
        {/* Left Sidebar with Glass Effect */}
        <div style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column',
          background: colors.chatBg,
          backdropFilter: 'blur(20px)',
          boxShadow: isDark 
            ? '2px 0 8px rgba(0,0,0,0.2)' 
            : '2px 0 8px rgba(0,0,0,0.08)',
          flexShrink: 0,
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          borderTopLeftRadius: '20px',
          borderBottomLeftRadius: '20px'
        }}>
          
          {/* User Profile */}
          <UserProfileCard 
            user={CURRENT_USER || { 
              id: '1', 
              name: 'Admin User', 
              avatar: 'AU', 
              status: 'online' as UserStatus 
            }} 
            isDark={isDark} 
            notificationCount={0}
            onClick={() => setIsProfileModalOpen(true)}
          />

          {/* Search Bar with Glass Effect */}
          <div style={{ 
            padding: '20px', 
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            marginBottom: '16px'
          }}>
            <div style={{ position: 'relative' }}>
                <input
                  type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                  fontSize: '14px',
                  backdropFilter: 'blur(20px)',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = isDark 
                    ? '0 0 0 3px rgba(255,255,255,0.1)' 
                    : '0 0 0 3px rgba(0,0,0,0.1)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-140%)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '16px',
                width: '16px'
              }}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={colors.textSecondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    opacity: 0.6
                  }}
                >
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Tabs with Glass Effect */}
          <div style={{ 
            display: 'flex', 
            padding: '0 20px 20px 20px',
            gap: '8px',
            marginTop: '10px'
          }}>
            {[
              { id: 'chats', label: 'Chats' },
              { id: 'groups', label: 'Groups' },
              { id: 'archived', label: 'Archived' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: activeTab === tab.id ? colors.accent : 'transparent',
                  border: `1px solid ${colors.accent}`,
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: activeTab === tab.id ? (isDark ? colors.bg : '#ffffff') : colors.accent,
                  cursor: 'pointer',
                  borderRadius: '20px',
                  transition: 'all 0.2s ease',
                  minWidth: '70px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: activeTab === tab.id ? (isDark 
                    ? '0 2px 8px rgba(255,255,255,0.2)' 
                    : '0 2px 8px rgba(0,0,0,0.2)') : 'none'
                }}
                onMouseEnter={e => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = colors.hoverBg;
                  }
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
      </div>
      
          {/* Remove the New Chat button section and keep only Create Group */}
          {activeTab !== 'archived' && (
            <div style={{ padding: '10px 20px 20px 20px' }}>
              <button
                onClick={handleCreateGroupClick}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #ffffff',
                  background: '#000000',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(20px)',
                  boxShadow: showCreateGroup 
                    ? (isDark 
                    ? '0 4px 16px rgba(255,255,255,0.2)' 
                    : '0 4px 16px rgba(0,0,0,0.2)') : 'none'
                }}
                onMouseEnter={e => {
                  if (!showCreateGroup) {
                    e.currentTarget.style.backgroundColor = '#333333';
                  }
                }}
                onMouseLeave={e => {
                  if (!showCreateGroup) {
                    e.currentTarget.style.backgroundColor = '#000000';
                  }
                }}
              >
                Create Group
              </button>
            </div>
          )}

          {/* Create Group Form with Glass Effect */}
          {showCreateGroup && (
            <div style={{ padding: '0 20px 16px 20px' }}>
            <input
              type="text"
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                  fontSize: '14px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = isDark 
                    ? '0 0 0 3px rgba(255,255,255,0.1)' 
                    : '0 0 0 3px rgba(0,0,0,0.1)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />

              {/* Search field for users */}
              <input
                type="text"
                placeholder="Search users..."
                value={groupUserSearch}
                onChange={(e) => setGroupUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                  fontSize: '14px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = isDark 
                    ? '0 0 0 3px rgba(255,255,255,0.1)' 
                    : '0 0 0 3px rgba(0,0,0,0.1)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />

              {/* Quick suggestions with Glass Effect */}
              {groupUserSearch.trim() === '' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: colors.textSecondary,
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Quick Add (Recent/Frequent)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {getSuggestedUsers().map(user => (
              <button
                        key={user.id}
                        onClick={() => {
                          if (!selectedUsers.some(u => u.id === user.id)) {
                            setSelectedUsers(prev => [...prev, user]);
                          }
                        }}
                        disabled={selectedUsers.some(u => u.id === user.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '16px',
                          border: 'none',
                          background: selectedUsers.some(u => u.id === user.id) 
                            ? colors.hoverBg
                            : colors.accent,
                          color: selectedUsers.some(u => u.id === user.id)
                            ? colors.textSecondary
                            : (isDark ? colors.bg : '#ffffff'),
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: selectedUsers.some(u => u.id === user.id) ? 'not-allowed' : 'pointer',
                          opacity: selectedUsers.some(u => u.id === user.id) ? 0.5 : 1,
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: colors.avatarBg,
                          color: colors.avatarText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {user.avatar}
                        </div>
                        {user.name}
                        {selectedUsers.some(u => u.id === user.id) && ' ✓'}
              </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* User Selection with Glass Effect */}
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                background: colors.inputBg,
                marginBottom: '12px',
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{
                  padding: '8px 12px',
                  borderBottom: `1px solid ${colors.border}`,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Select Users ({selectedUsers.length} selected)
                </div>
                {filteredGroupUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedUsers(prev => {
                        const isSelected = prev.some(u => u.id === user.id);
                        if (isSelected) {
                          return prev.filter(u => u.id !== user.id);
                        } else {
                          return [...prev, user];
                        }
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`,
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isDark ? '#333' : '#f0f0f0';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: `2px solid ${selectedUsers.some(u => u.id === user.id) ? colors.accent : (isDark ? '#666' : '#ccc')}`,
                      background: selectedUsers.some(u => u.id === user.id) ? colors.accent : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      flexShrink: 0
                    }}>
                      {selectedUsers.some(u => u.id === user.id) && (
                        <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                                    <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginRight: '12px',
                  flexShrink: 0
                }}>
                  {user.avatar}
                </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isDark ? '#ffffff' : '#1a1a1a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {user.name}
              </div>
                      <div style={{
                        fontSize: '12px',
                        color: isDark ? '#adb5bd' : '#6c757d'
                      }}>
                        {user.email}
                      </div>
                    </div>
                    <StatusIndicator status={user.status} />
                  </div>
                ))}
                {filteredGroupUsers.length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: isDark ? '#6c757d' : '#adb5bd',
                    fontSize: '14px'
                  }}>
                    {groupUserSearch.trim() ? 'No users found' : 'No users available'}
                  </div>
          )}
        </div>

                {/* Selected Users Preview */}
                {selectedUsers.length > 0 && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '8px',
                    background: isDark ? '#1a1a1a' : '#f8f9fa',
                    borderRadius: '6px',
                    border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDark ? '#adb5bd' : '#6c757d',
                      marginBottom: '6px'
                    }}>
                      Selected Members:
              </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedUsers.map(user => (
                        <span
                          key={user.id}
                          style={{
                            background: colors.accent,
                            color: '#ffffff',
                            padding: '6px 8px 6px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            whiteSpace: 'nowrap',
                            maxWidth: '160px',
                            minWidth: 'fit-content',
                            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        >
                          <span style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: '50px',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}>
                            {user.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.2)',
                              border: 'none',
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              padding: '0',
                              margin: '0 2px 0 0',
                              lineHeight: '1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
            </div>
                        </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => {
                      setShowCreateGroup(false);
                      setGroupName('');
                      setSelectedUsers([]);
                      setGroupUserSearch('');
                    }}
                    style={{
                      width: '50%',
                      background: 'transparent',
                      color: isDark ? '#adb5bd' : '#6c757d',
                      border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                      borderRadius: '6px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
              >
                Cancel
              </button>
              <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedUsers.length === 0}
                    style={{
                      width: '50%',
                      background: (groupName.trim() && selectedUsers.length > 0) ? '#000000' : (isDark ? '#404040' : '#dee2e6'),
                      color: (groupName.trim() && selectedUsers.length > 0) ? '#ffffff' : (isDark ? '#888' : '#6c757d'),
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: (groupName.trim() && selectedUsers.length > 0) ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Create Group
              </button>
            </div>
          </div>
      )}

            {/* Chat List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchQuery.trim() !== '' ? (
                <>
                  {/* User Search Results */}
                  {searchResults.length > 0 && (
                    <>
                      <div style={{
                        padding: '12px 20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#adb5bd' : '#6c757d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Users
        </div>
                      {searchResults.map(user => 
                        <SearchResultItem 
                          key={user.id} 
                          user={user} 
                          onClick={() => handleStartNewChat(user)} 
                          isDark={isDark} 
                        />
                      )}
                    </>
                  )}
                  
                  {/* Team Search Results */}
                  {teamSearchResults.length > 0 && (
                    <>
                      <div style={{
                        padding: '12px 20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#adb5bd' : '#6c757d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Workspace
                    </div>
                      {teamSearchResults.map(team => 
                        <TeamSearchResultItem 
                          key={team.id} 
                          team={team} 
                          onClick={() => handleStartTeamChat(team)} 
                          isDark={isDark} 
                        />
                      )}
                    </>
                  )}
                  
                  {/* No Results */}
                  {searchResults.length === 0 && teamSearchResults.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: isDark ? '#6c757d' : '#adb5bd',
                      padding: '40px 20px',
                      fontSize: '14px'
                    }}>
                      {searchQuery.trim() === '' ? (
                        <div>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                          <div style={{ fontWeight: '600', marginBottom: '8px' }}>No team members found</div>
                          <div style={{ fontSize: '13px', opacity: 0.8 }}>
                            Add team members to your company to start chatting
                  </div>
                </div>
                      ) : (
                        `No users or teams found for "${searchQuery}"`
                      )}
                    </div>
                  )}
              </>
            ) : (
                <>
                  <div style={{
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: isDark ? '#adb5bd' : '#6c757d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {activeTab === 'archived' ? 'Archived Chats' : `Recent ${activeTab}`}
            </div>
                  {filteredChats.map(chat => 
                    <ChatListItem 
                      key={chat.id} 
                      chat={chat} 
                      active={chat.id === activeChatId} 
                      onClick={() => handleSelectChat(chat.id)} 
                      isDark={isDark} 
                    />
                  )}
                  {filteredChats.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: isDark ? '#6c757d' : '#adb5bd',
                      padding: '40px 20px',
                      fontSize: '14px'
                    }}>
                      {activeTab === 'archived' ? 'No archived chats' : `No ${activeTab} found`}
            </div>
                  )}
                </>
                )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          background: isDark ? '#1a1a1a' : '#ffffff',
          minWidth: 0,
          position: 'relative',
          margin: 0,
          padding: 0,
          borderTopRightRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
          {/* Chat Content */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0
          }}>
            <ChatHeader
              chat={activeChat}
              isDark={isDark}
              onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
            />

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {activeChat ? (
                  activeChat.messages.map((message, index) => (
                    <div key={message.id} style={{ marginBottom: '8px' }}>
                      <MessageBubble
                        message={message}
                        sent={message.sender === CURRENT_USER?.name}
                        isDark={isDark}
                        onReact={handleReaction}
                        onReply={handleReply}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isSelected={selectedMessages.has(message.id)}
                        onSelect={handleMessageSelect}
                        deleting={deleting}
                        editingMessageId={editingMessageId}
                        onShowHover={showHoverPopup}
                        allMessages={activeChat?.messages}
                      />
                      {/* Timestamp and edited indicator outside bubble */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '4px',
                        fontSize: '11px',
                        color: isDark ? '#adb5bd' : '#6c757d',
                        justifyContent: message.sender === CURRENT_USER?.name ? 'flex-end' : 'flex-start',
                        paddingLeft: message.sender === CURRENT_USER?.name ? '0' : '48px',
                        paddingRight: message.sender === CURRENT_USER?.name ? '48px' : '0'
                      }}>
                        {message.edited && (
                          <span style={{ fontStyle: 'italic' }}>
                            edited
                          </span>
                        )}
                        <span>
                          {message.sender} • {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: isDark ? '#6c757d' : '#adb5bd',
                minHeight: '200px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}></div>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isDark ? '#ffffff' : '#1a1a1a'
                }}>
                  No chat selected
                </h3>
                <p style={{
                  fontSize: '14px',
                  margin: 0,
                  color: isDark ? '#6c757d' : '#adb5bd',
                  opacity: 0.8
                }}>
                  Choose a conversation to start messaging
                </p>
              </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Delete mode controls */}
            {deleting && (
              <div style={{
                background: colors.hoverBg,
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '12px',
                border: `1px solid #ef4444`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: colors.text,
                  fontWeight: '500'
                }}>
                  Select messages to delete ({selectedMessages.size} selected)
                </div>
                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedMessages.size === 0}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 36px',
                      borderRadius: '4px',
                      fontSize: '15px',
                      minWidth: 160,
                      cursor: selectedMessages.size > 0 ? 'pointer' : 'not-allowed',
                      opacity: selectedMessages.size > 0 ? 1 : 0.5,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    style={{
                      background: 'transparent',
                      color: colors.textSecondary,
                      border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
                      padding: '6px 28px',
                      borderRadius: '4px',
                      fontSize: '15px',
                      minWidth: 120,
                      cursor: 'pointer',
                      fontWeight: 500,
                      marginLeft: 0,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            {activeChat && (
              <MessageInput
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                isDark={isDark}
                replyingTo={replyTo || undefined}
                onCancelReply={() => setReplyTo(null)}
                editingMessageId={editingMessageId}
                editText={editText}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
              />
            )}
          </div>

          {/* Right Panel */}
          <RightPanel
            chat={activeChat}
            isOpen={showRightPanel}
            isDark={isDark}
            onToggleMute={handleToggleMute}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onRemoveUser={handleRemoveUserFromGroup}
            onShowConfirmation={setConfirmationModal}
            onDeleteChat={deleteChat}
            onUpdateChats={setChats}
            onSetActiveChat={setActiveChatId}
            onAddNotification={addNotification}
          />
        </div>
      </div>

      <ConfirmationModal modal={confirmationModal} isDark={isDark} />

      {/* Right Panel Backdrop */}
      {showRightPanel && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 99,
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setShowRightPanel(false)}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={(profileUpdated) => {
          setIsProfileModalOpen(false);
          if (profileUpdated) {
            refreshCurrentUser();
          }
        }}
      />

      

      {/* Action Modal for Own Messages */}
      {showActionModal && selectedMessage && actionModalPosition && (
        <div
          style={{
            position: 'fixed',
            top: actionModalPosition.y,
            left: actionModalPosition.x,
            transform: 'translateX(-50%)',
            background: isDark ? '#2a2a2a' : '#ffffff',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
            border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '120px'
          }}
        >
          <button
                         onClick={() => {
               handleReply(selectedMessage);
               setShowActionModal(false);
               setSelectedMessage(null);
             }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: isDark ? '#ffffff' : '#1a1a1a',
              fontSize: '14px',
              textAlign: 'left',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Reply
          </button>
          <button
                         onClick={() => {
               handleReaction(selectedMessage.id, '👍');
               setShowActionModal(false);
               setSelectedMessage(null);
             }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: isDark ? '#ffffff' : '#1a1a1a',
              fontSize: '14px',
              textAlign: 'left',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            React
          </button>
          <button
            onClick={() => {
              handleEdit(selectedMessage);
              setShowActionModal(false);
              setSelectedMessage(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: isDark ? '#ffffff' : '#1a1a1a',
              fontSize: '14px',
              textAlign: 'left',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Edit
          </button>
          <button
            onClick={() => {
              handleDelete();
              setShowActionModal(false);
              setSelectedMessage(null);
            }}
            disabled={deleting}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              color: deleting ? (isDark ? '#666' : '#999') : '#ef4444',
              fontSize: '14px',
              textAlign: 'left',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => {
              if (!deleting) {
                e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {deleting ? '⏳ Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      )}



      {/* Global Hover Popup */}
      <GlobalHoverPopup
        state={hoverPopupState}
        onClose={closeHoverPopup}
        onReact={handleReaction}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDark={isDark}
      />

      {/* Backdrop for modals */}
      {showActionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 999
          }}
          onClick={() => {
            setShowActionModal(false);
            setSelectedMessage(null);
            setActionModalPosition(null);
          }}
        />
      )}
    </div>
  );
}
