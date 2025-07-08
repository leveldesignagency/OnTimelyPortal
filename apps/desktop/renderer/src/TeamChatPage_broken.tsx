import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
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
  leaveGroup
} from './lib/chat';

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
  timestamp: string;
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
    accent: '#007bff',
    hoverBg: 'rgba(255, 255, 255, 0.05)',
    buttonBg: '#404040',
    buttonText: '#ffffff',
    messageBubble: 'rgba(64, 64, 64, 0.8)',
    messageBubbleSent: 'rgba(0, 123, 255, 0.8)',
    inputBg: 'rgba(255, 255, 255, 0.1)',
    avatarBg: 'linear-gradient(135deg, #4a4a4a, #2a2a2a)',
    avatarText: '#fff',
    primary: '#007bff'
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
  name: supabaseUser.name,
  avatar: supabaseUser.avatar || supabaseUser.name.charAt(0).toUpperCase(),
  status: supabaseUser.status as UserStatus,
  lastSeen: supabaseUser.last_seen,
  email: supabaseUser.email,
  role: (supabaseUser.role as 'admin' | 'member') || 'member',
  company_id: supabaseUser.company_id
});

// Helper function to convert Supabase message to local Message type
const convertSupabaseMessage = (supabaseMessage: SupabaseMessage): Message => ({
  id: supabaseMessage.id,
  text: supabaseMessage.content,
  sender: supabaseMessage.sender?.name || 'Unknown',
  sender_id: supabaseMessage.sender_id,
  timestamp: new Date(supabaseMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  type: supabaseMessage.message_type as MessageType,
  fileUrl: supabaseMessage.file_url,
  fileName: supabaseMessage.file_name,
  fileSize: supabaseMessage.file_size,
  reactions: supabaseMessage.reactions?.map(r => ({
    emoji: r.emoji,
    users: r.user_id ? [r.user_id] : [],
    count: 1
  })) || [],
  replyTo: supabaseMessage.reply_to_id,
  edited: supabaseMessage.is_edited,
  editedAt: supabaseMessage.edited_at,
  sent: true
});

// Helper function to convert Supabase chat to local Chat type
const convertSupabaseChat = (supabaseChat: SupabaseChat): Chat => ({
  id: supabaseChat.id,
  name: supabaseChat.name || supabaseChat.participants?.map(p => p.name).join(', ') || 'Unknown',
  type: supabaseChat.type as ChatType,
  lastMessage: supabaseChat.last_message?.content || 'No messages yet',
  timestamp: new Date(supabaseChat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  unread: supabaseChat.unread_count || 0,
  avatar: supabaseChat.avatar || (supabaseChat.name?.charAt(0) || 'C'),
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
});

// Mock data with enhanced features
const MOCK_USERS: User[] = [
  { id: 'user_1', name: 'Leon JENKINGS!', avatar: 'LJ', status: 'online', email: 'leon@example.com', company_id: CURRENT_USER?.company_id || 'mock_company', role: 'admin' },
  { id: 'user_2', name: 'Luis', avatar: 'L', status: 'away', email: 'luis@example.com', company_id: CURRENT_USER?.company_id || 'mock_company', role: 'member' },
  { id: 'user_3', name: 'Vanilla Gorilla', avatar: 'VG', status: 'offline', lastSeen: '2 hours ago', company_id: CURRENT_USER?.company_id || 'mock_company', role: 'member' },
  { id: 'user_4', name: 'Alice Johnson', avatar: 'AJ', status: 'online', email: 'alice@example.com', company_id: CURRENT_USER?.company_id || 'mock_company', role: 'member' },
  { id: 'user_5', name: 'Bob Smith', avatar: 'BS', status: 'busy', email: 'bob@example.com', company_id: CURRENT_USER?.company_id || 'mock_company', role: 'member' },
  { id: 'user_6', name: 'Charlie Brown', avatar: 'CB', status: 'online', email: 'charlie@example.com', company_id: CURRENT_USER?.company_id || 'mock_company', role: 'member' },
];

// Enhanced components
const UserProfileCard: React.FC<{ user: User; isDark: boolean; notificationCount?: number }> = ({ user, isDark, notificationCount = 0 }) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  
  return (
    <div style={{ 
      padding: '24px', 
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      background: colors.panelBg,
      position: 'relative'
    }}>
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
            : '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          {user.avatar}
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
            gap: '8px'
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
          : '0 4px 16px rgba(0,0,0,0.1)') : 'none'
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
        {chat.avatar && chat.avatar.length <= 3 ? chat.avatar : chat.name.charAt(0).toUpperCase()}
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
              {chat.name}
            </span>
            {chat.isPinned && (
              <span style={{ fontSize: '12px', color: colors.accent }}>📌</span>
            )}
            {chat.isMuted && (
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>🔇</span>
            )}
          </div>
          <span style={{
            fontSize: '12px',
            color: colors.textSecondary,
            flexShrink: 0,
            marginLeft: '8px',
            fontWeight: '500'
          }}>
            {chat.timestamp}
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
      backgroundColor: isDark ? '#444' : '#e9ecef',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#495057',
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
      backgroundColor: isDark ? '#444' : '#e9ecef',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#495057',
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
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
            color: isDark ? '#fff' : '#495057',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {chat.avatar && chat.avatar.length <= 3 ? chat.avatar : chat.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{
              fontWeight: '600',
              fontSize: '16px',
              color: isDark ? '#ffffff' : '#1a1a1a'
            }}>
              {chat.name}
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
          transition: 'all 0.2s ease'
        }}
      >
        ℹ️
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
  
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      marginTop: '8px',
      flexWrap: 'wrap'
    }}>
      {reactions.map(reaction => (
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

const MessageBubble = ({ message, sent, isDark, onReact, onReply }: { 
  message: Message, 
  sent: boolean, 
  isDark: boolean, 
  onReact: (messageId: string, emoji: string) => void,
  onReply: (message: Message) => void 
}) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div style={{
      display: 'flex',
      justifyContent: sent ? 'flex-end' : 'flex-start',
      marginBottom: '16px',
      paddingLeft: sent ? '60px' : '0px',
      paddingRight: sent ? '0px' : '60px'
    }}>
      <div style={{
        maxWidth: '70%',
        position: 'relative'
      }}>
        {message.replyTo && (
          <div style={{
            background: sent ? 'rgba(255,255,255,0.1)' : colors.hoverBg,
            padding: '8px 12px',
            borderRadius: '8px 8px 0 0',
            fontSize: '12px',
            color: colors.textSecondary,
            borderLeft: `3px solid ${colors.accent}`,
            marginBottom: '2px'
          }}>
            Replying to: {message.replyTo}
          </div>
        )}
        
        <div
          style={{
            background: sent ? colors.messageBubbleSent : colors.messageBubble,
            color: sent ? (isDark ? colors.bg : '#ffffff') : colors.text,
            padding: '12px 16px',
            borderRadius: sent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            wordWrap: 'break-word',
            position: 'relative',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark 
              ? '0 4px 16px rgba(0,0,0,0.3)' 
              : '0 4px 16px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={() => setShowOptions(true)}
          onMouseLeave={() => setShowOptions(false)}
        >
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

          {/* Message metadata */}
          <div style={{
            fontSize: '11px',
            color: sent ? (isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.7)') : colors.textSecondary,
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            justifyContent: 'flex-end'
          }}>
            {message.edited && <span>edited</span>}
            <span>{message.timestamp}</span>
            {sent && (
              <span style={{ 
                color: message.sent ? (isDark ? 'rgba(26,26,26,0.8)' : 'rgba(255,255,255,0.8)') : '#f59e0b' 
              }}>
                {message.sent ? '✓' : '⏳'}
              </span>
            )}
          </div>

          {/* Options menu */}
          {showOptions && (
            <div style={{
              position: 'absolute',
              top: '-40px',
              right: sent ? '0px' : 'auto',
              left: sent ? 'auto' : '0px',
              background: colors.panelBg,
              borderRadius: '8px',
              padding: '4px',
              display: 'flex',
              gap: '4px',
              boxShadow: isDark 
                ? '0 4px 16px rgba(0,0,0,0.4)' 
                : '0 4px 16px rgba(0,0,0,0.2)',
              border: `1px solid ${colors.border}`,
              zIndex: 10
            }}>
              <button
                onClick={() => onReply(message)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: colors.text,
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Reply
              </button>
              <button
                onClick={() => setShowReactions(!showReactions)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: colors.text,
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                😊
              </button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <MessageReactions reactions={message.reactions} onReact={(emoji) => onReact(message.id, emoji)} isDark={isDark} />
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: sent ? '0px' : 'auto',
            left: sent ? 'auto' : '0px',
            background: colors.panelBg,
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            gap: '4px',
            boxShadow: isDark 
              ? '0 4px 16px rgba(0,0,0,0.4)' 
              : '0 4px 16px rgba(0,0,0,0.2)',
            border: `1px solid ${colors.border}`,
            zIndex: 10,
            marginTop: '4px'
          }}>
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowReactions(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MessageInput = ({ onSendMessage, onFileUpload, isDark, replyingTo, onCancelReply }: { 
  onSendMessage: (text: string, type?: MessageType) => void, 
  onFileUpload: (file: File) => void, 
  isDark: boolean,
  replyingTo?: Message | undefined,
  onCancelReply?: () => void
}) => {
    const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😡', '🔥', '💯'];

    const handleSend = () => {
        if (text.trim()) {
            onSendMessage(text.trim());
            setText('');
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
              ↩️ Replying to {replyingTo.sender}:
            </span>
            <span style={{
              fontSize: '14px',
              color: isDark ? '#ffffff' : '#1a1a1a',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {replyingTo.text}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#adb5bd' : '#6c757d',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px'
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
          placeholder="Start Typing..."
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
            <img 
              src="/icons/__smiley.svg" 
              alt="emoji"
              width={30}
              height={30}
              style={{ 
                filter: isDark ? 'invert(1)' : 'brightness(0)'
              }}
            />
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
            <img 
              src="/icons/__attach.svg" 
              alt="attach"
              width={30}
              height={30}
              style={{ 
                filter: isDark ? 'invert(1)' : 'brightness(0)'
              }}
            />
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
            <img 
              src="/icons/__send.svg" 
              alt="send"
              width={30}
              height={30}
              style={{ 
                filter: isDark ? 'invert(1)' : 'brightness(0)'
              }}
            />
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
      console.log('🗑️ DELETE GROUP - Starting process');
      console.log('📋 Chat info:', {
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
            const success = await deleteChat(chat.id);
            console.log('🔄 Delete result:', success);
            
            if (success) {
              console.log('✅ Group deleted successfully');
              // Remove from local state and navigate away
              onUpdateChats(prevChats => prevChats.filter(c => c.id !== chat.id));
              onSetActiveChat('');
              onAddNotification(`Group "${chat.name}" has been deleted`, 'success');
    } else {
              console.error('❌ Failed to delete group - deleteChat returned false');
              onAddNotification('Failed to delete group. Please try again.', 'error');
            }
          } catch (error) {
            console.error('💥 Error deleting group:', error);
            onAddNotification('An error occurred while deleting the group.', 'error');
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

  const handleRemoveUser = (userId: string, userName: string) => {
    if (chat.type === 'group' && userId !== CURRENT_USER?.id) {
      onRemoveUser(userId, userName);
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
      height: '100vh',
      overflowY: 'auto',
      flexShrink: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 100,
      boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.5)' : '-4px 0 20px rgba(0,0,0,0.15)',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease'
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
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            {chat.avatar}
          </div>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            {chat.name}
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
            {chat.participants.map((participant, idx) => (
              <div 
                key={idx} 
            style={{
              display: 'flex',
              alignItems: 'center',
                  gap: '10px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  transition: 'background 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  if (participant.id !== CURRENT_USER?.id) {
                    e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f8f9fa';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                    color: isDark ? '#fff' : '#495057',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {participant.avatar}
          </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: participant.status === 'online' ? '#10b981' : 
                               participant.status === 'away' ? '#f59e0b' : 
                               participant.status === 'busy' ? '#ef4444' : '#6b7280',
                    border: `2px solid ${isDark ? '#1a1a1a' : '#ffffff'}`
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: isDark ? '#ffffff' : '#1a1a1a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {participant.name} {participant.id === CURRENT_USER?.id && '(You)'}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isDark ? '#adb5bd' : '#6c757d',
                    textTransform: 'capitalize'
                  }}>
                    {participant.status}
                  </div>
                </div>
                
                {/* Remove User Button - Smaller and less intrusive */}
                {participant.id !== CURRENT_USER?.id && (
        <button
                    onClick={() => handleRemoveUser(participant.id, participant.name)}
                    title={`Remove ${participant.name} from group`}
          style={{
                      background: 'transparent',
            border: 'none',
                      color: '#ef4444',
              cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      opacity: 0.6,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = isDark ? '#2a1f1f' : '#fef2f2';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '0.6';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ✕
                  </button>
                )}
          </div>
        ))}
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
              📷
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
                <img 
                  src={setting.iconSrc} 
                  alt={setting.label}
                  width={14}
                  height={14}
                  style={{ 
                    filter: isDark ? 'invert(1)' : 'none',
                    opacity: 0.8
                  }}
                />
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
                  width: '36px',
                  height: '18px',
                  borderRadius: '9px',
                  background: setting.value ? '#007bff' : isDark ? '#404040' : '#dee2e6',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: '2px',
                  left: setting.value ? '20px' : '2px',
                  transition: 'all 0.2s ease'
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
                <span>🚪</span>
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
                  <span>🗑️</span>
                  Delete Group
                </button>
              )}
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

const MessageNotificationToast = ({ notification, onRemove, onMarkRead, onOpenChat, isDark }: { 
  notification: MessageNotification, 
  onRemove: (id: string) => void,
  onMarkRead: (id: string) => void,
  onOpenChat: (chatId: string) => void,
  isDark: boolean 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Smooth entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-dismiss after 6 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 400);
  };

  const handleClick = () => {
    onMarkRead(notification.id);
    onOpenChat(notification.chatId);
    handleDismiss();
  };

  const truncateMessage = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getChatIcon = () => {
    switch (notification.chatType) {
      case 'direct':
        return '💬';
      case 'group':
        return '👥';
      case 'team':
        return '🏢';
      default:
        return '💬';
    }
  };

  const getChatTypeColor = () => {
    switch (notification.chatType) {
      case 'direct':
        return isDark ? '#ffffff' : '#000000'; // White for dark mode, black for light mode
      case 'group':
        return '#10b981'; // Green
      case 'team':
        return '#8b5cf6'; // Purple
      default:
        return '#6b7280'; // Gray
    }
  };

  const chatColor = getChatTypeColor();

  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '380px',
        background: isDark 
          ? `linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(42, 42, 42, 0.95) 100%)`
          : `linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: isDark 
          ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 0 0 1px ${chatColor}40`
          : `0 20px 40px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 0 0 1px ${chatColor}40`,
        border: `1px solid ${chatColor}30`,
        cursor: 'pointer',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isVisible && !isExiting 
          ? 'translateX(0) scale(1) rotateY(0deg)' 
          : 'translateX(100%) scale(0.9) rotateY(10deg)',
        opacity: isVisible && !isExiting ? 1 : 0,
        zIndex: 1001,
        overflow: 'hidden'
      }}
      onClick={handleClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateX(0) scale(1.02) rotateY(0deg)';
        e.currentTarget.style.boxShadow = isDark 
          ? `0 24px 48px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.1) inset, 0 0 0 1px ${chatColor}60`
          : `0 24px 48px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 1) inset, 0 0 0 1px ${chatColor}60`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateX(0) scale(1) rotateY(0deg)';
        e.currentTarget.style.boxShadow = isDark 
          ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 0 0 1px ${chatColor}40`
          : `0 20px 40px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 0 0 1px ${chatColor}40`;
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
          background: `linear-gradient(135deg, ${chatColor}10 0%, transparent 100%)`,
          borderRadius: '16px',
          opacity: 0.6
        }}
      />

      {/* Close button with modern styling */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'transparent',
          border: 'none',
          color: isDark ? '#9ca3af' : '#6b7280',
          cursor: 'pointer',
          fontSize: '18px',
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2
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

      {/* Header with sender info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${chatColor} 0%, ${chatColor}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: `0 4px 12px ${chatColor}40, 0 0 0 3px ${chatColor}20`,
          flexShrink: 0,
          animation: 'pulse 2s infinite'
        }}>
          {getChatIcon()}
              </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '15px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1f2937',
            marginBottom: '2px',
            letterSpacing: '-0.01em'
          }}>
            {notification.senderName}
            </div>
          <div style={{
            fontSize: '13px',
            color: isDark ? '#9ca3af' : '#6b7280',
            fontWeight: '500'
          }}>
            in {notification.chatName}
          </div>
        </div>
        <div style={{
          fontSize: '11px',
          color: isDark ? '#9ca3af' : '#6b7280',
          fontWeight: '500'
        }}>
          {new Date(notification.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>

      {/* Message content */}
      <div style={{
        fontSize: '14px',
        lineHeight: '1.5',
        color: isDark ? '#d1d5db' : '#4b5563',
        background: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)',
        borderRadius: '12px',
        padding: '12px 16px',
        border: `1px solid ${isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.3)'}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 1
      }}>
        {truncateMessage(notification.messageText)}
            </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${chatColor} 0%, ${chatColor}80 100%)`,
          borderRadius: '0 0 16px 16px',
          animation: 'messageProgress 6s linear',
          transformOrigin: 'left',
          zIndex: 1
        }}
      />

      {/* Add keyframes for animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes messageProgress {
            0% { width: 100%; }
            100% { width: 0%; }
          }
        `}
      </style>
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [companyTeams, setCompanyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupUserSearch, setGroupUserSearch] = useState(''); // New search field for group creation
  const [recentUsers, setRecentUsers] = useState<User[]>([]); // Track recent/frequent users
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<MessageNotification[]>([]);
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
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);

  const isDark = theme === 'dark';
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const colors = themes[isDark ? 'dark' : 'light'];

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      const user = getCurrentUser();
      if (!user) {
        // Redirect to login if no user (this should be handled at app level)
        navigate('/login');
        return;
      }
      
      console.log('🔍 Raw user from getCurrentUser():', user);
      CURRENT_USER = convertSupabaseUser(user);
      console.log('👤 CURRENT_USER after conversion:', CURRENT_USER);
      console.log('🏢 CURRENT_USER company_id:', CURRENT_USER?.company_id);
      await loadInitialData();
    };

    initializeData();
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
      const authUser = getCurrentUser();
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
    const currentAuthUser = getCurrentUser();
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
      const icon = chatType === 'team' ? '🏢' : chatType === 'group' ? '👥' : '💬';
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
    
    // Create message notification if chat is not currently active or app is not focused
    if (chat && sender && (message.chat_id !== activeChatId || !document.hasFocus())) {
      console.log('✅ Creating notification for message');
      
      const messageNotification: MessageNotification = {
        id: `msg_notification_${Date.now()}_${Math.random()}`,
        senderId: message.sender_id,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        chatId: message.chat_id,
        chatName: chat.name,
        chatType: chat.type,
        messageText: message.content,
        timestamp: Date.now(),
        isRead: false
      };
      
      setMessageNotifications(prev => {
        console.log('📬 Adding notification to state:', messageNotification);
        return [...prev, messageNotification];
      });
      
      // Play notification sound
      console.log('🔊 Playing notification sound');
      playNotificationSound();
      
      // Show browser notification if app is not focused
      if (!document.hasFocus()) {
        console.log('🌐 Showing browser notification');
        showBrowserNotification(sender.name, message.content, chat.name, chat.type);
      }
      
      // Auto-remove after 5 seconds if not interacted with
      setTimeout(() => {
        setMessageNotifications(prev => prev.filter(n => n.id !== messageNotification.id));
      }, 5000);
    } else {
      console.log('❌ Not creating notification - conditions not met');
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
            timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
    
    // Search users
    const existingChatNames = chats.map(c => c.name.toLowerCase());
    const userResults = companyUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !existingChatNames.includes(user.name.toLowerCase())
    );
    console.log('🔍 User search results:', userResults);
    setSearchResults(userResults);
    
    // Search teams
    const teamResults = companyTeams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('🔍 Team search results:', teamResults);
    setTeamSearchResults(teamResults);
  }, [searchQuery, chats, companyUsers, companyTeams]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setSearchQuery('');
    setShowRightPanel(false);
  };

  const handleStartNewChat = async (user: User) => {
    if (!CURRENT_USER) {
      console.error('No current user found')
      return
    }

    const authUser = getCurrentUser()
    if (!authUser) {
      console.error('No authenticated user found')
      return
    }

    try {
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
    if (!CURRENT_USER) {
      console.error('No current user found')
      return
    }

    const authUser = getCurrentUser()
    if (!authUser) {
      console.error('No authenticated user found')
      return
    }

    try {
      const newChat = await createTeamChat(CURRENT_USER.id, authUser.company_id, team.id, `${team.name} Chat`)
      
      if (newChat) {
        const convertedChat = convertSupabaseChat(newChat)
        setChats(prev => {
          const exists = prev.find(c => c.id === convertedChat.id)
          if (exists) return prev
          return [convertedChat, ...prev]
        })
        setActiveChatId(convertedChat.id)
        setSearchQuery('')
        console.log(`✅ Started team chat for ${team.name}`)
      } else {
        console.error('Failed to create team chat - null response')
      }
    } catch (error) {
      console.error('Error creating team chat:', error)
    }
  }

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
      const authUser = getCurrentUser();
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
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async (text: string, type: MessageType = 'text') => {
    if (!activeChatId || !CURRENT_USER) return;

    try {
      const message = await sendMessage(activeChatId, CURRENT_USER.id, text, type);
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
                  timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              : chat
          )
        );
        
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    if (!CURRENT_USER) return;

    try {
      await addMessageReaction(messageId, CURRENT_USER.id, emoji);
      // Real-time updates will handle the UI update
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Updated handler functions for button functionality
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

  const handleToggleArchive = (chatId: string) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, isArchived: !chat.isArchived }
          : chat
      )
    );
    
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      addNotification(
        `Chat "${chat.name}" ${chat.isArchived ? 'unarchived' : 'archived'}`,
        'info'
      );
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

  const removeMessageNotification = (id: string) => {
    setMessageNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markMessageNotificationRead = (id: string) => {
    setMessageNotifications(prev => 
      prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      )
    );
  };

  const openChatFromNotification = (chatId: string) => {
    setActiveChatId(chatId);
    setSearchQuery('');
    setShowRightPanel(false);
    selectChat(chatId);
  };

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
      display: 'flex', 
      height: '100vh', 
      background: colors.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      transition: 'background 0.2s ease',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
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
        {messageNotifications.map(notification => (
          <div key={notification.id} style={{ pointerEvents: 'auto' }}>
            <MessageNotificationToast
              notification={notification}
              onRemove={removeMessageNotification}
              onMarkRead={markMessageNotificationRead}
              onOpenChat={openChatFromNotification}
              isDark={isDark}
            />
                </div>
              ))}
            </div>

     
        {/* Left Sidebar */}
        <div style={{
          width: '400px',
          background: isDark 
            ? 'linear-gradient(180deg, rgba(25,25,25,0.98) 0%, rgba(15,15,15,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,245,245,0.99) 100%)',
          borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          boxShadow: isDark 
            ? '4px 0 20px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.05)'
            : '4px 0 20px rgba(0,0,0,0.08), inset -1px 0 0 rgba(255,255,255,0.8)',
          position: 'relative',
          zIndex: 10
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
            notificationCount={messageNotifications.length}
          />

          {/* Search Bar with Glass Effect */}
          <div style={{ padding: '20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
            <div style={{ position: 'relative' }}>
                <input
                  type="text"
                placeholder="Search conversations..."
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
                transform: 'translateY(-50%)',
                color: colors.textSecondary,
                fontSize: '16px'
              }}>
                🔍
              </div>
            </div>
          </div>

          {/* Tabs with Glass Effect */}
          <div style={{ 
            display: 'flex', 
            padding: '0 20px 16px 20px',
            gap: '8px'
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
            <div style={{ padding: '0 20px 16px 20px' }}>
              <button
                onClick={handleCreateGroupClick}
                style={{
                  width: '100%',
                  background: showCreateGroup ? colors.accent : colors.inputBg,
                  color: showCreateGroup ? (isDark ? colors.bg : '#ffffff') : colors.text,
                  border: `1px solid ${showCreateGroup ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(20px)',
                  boxShadow: showCreateGroup ? (isDark 
                    ? '0 4px 16px rgba(255,255,255,0.2)' 
                    : '0 4px 16px rgba(0,0,0,0.2)') : 'none'
                }}
                onMouseEnter={e => {
                  if (!showCreateGroup) {
                    e.currentTarget.style.backgroundColor = colors.hoverBg;
                  }
                }}
                onMouseLeave={e => {
                  if (!showCreateGroup) {
                    e.currentTarget.style.backgroundColor = colors.inputBg;
                  }
                }}
              >
                + Create Group
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
                      background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                      color: isDark ? '#fff' : '#495057',
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
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
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
                              margin: '0',
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

                <div style={{ display: 'flex', gap: '8px' }}>
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
                      background: (groupName.trim() && selectedUsers.length > 0) ? colors.accent : (isDark ? '#404040' : '#dee2e6'),
                      color: (groupName.trim() && selectedUsers.length > 0) ? (isDark ? colors.bg : '#ffffff') : (isDark ? '#888' : '#6c757d'),
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
                        Teams
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
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
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
      </div>
      
      {/* Main Chat Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        background: isDark ? '#1a1a1a' : '#ffffff',
        minWidth: 0,
        position: 'relative',
        margin: 0,
        padding: 0,
        borderLeft: 'none'
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
          padding: '8px 12px',
          display: 'flex', 
          flexDirection: 'column',
          gap: '6px'
        }}>
            {activeChat ? (
              activeChat.messages.map((message, index) => (
                <MessageBubble 
                  key={message.id} 
                  message={message}
                  sent={message.sender === CURRENT_USER?.name}
                  isDark={isDark}
                  onReact={handleReaction}
                  onReply={handleReply}
                />
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
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>💬</div>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  margin: '0 0 6px 0',
                  color: isDark ? '#adb5bd' : '#6c757d'
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
        
        {/* Message Input */}
        {activeChat && (
          <MessageInput 
            onSendMessage={handleSendMessage} 
            onFileUpload={handleFileUpload}
            isDark={isDark} 
            replyingTo={replyingTo || undefined}
            onCancelReply={handleCancelReply}
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
    </div>
  );
} 