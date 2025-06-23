import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from './ThemeContext';
import { getCurrentUser, getCompanyUsers, logout, User as AuthUser } from './lib/auth';
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
  searchTeams,
  createTeamChat,
  Team as SupabaseTeam,
  removeUserFromGroup
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
  team_id?: string;
  isTyping?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
};

// Mock data with enhanced features - REPLACED WITH REAL DATA
let CURRENT_USER: User | null = null;

// Helper function to convert Supabase user to local User type
const convertSupabaseUser = (supabaseUser: AuthUser): User => ({
  id: supabaseUser.id,
  name: supabaseUser.name,
  avatar: supabaseUser.avatar || supabaseUser.name.charAt(0).toUpperCase(),
  status: supabaseUser.status as UserStatus,
  lastSeen: supabaseUser.last_seen,
  email: supabaseUser.email
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
  participants: supabaseChat.participants?.map(convertSupabaseUser) || [],
  isPinned: false,
  isMuted: false,
  isArchived: supabaseChat.is_archived
});

// Mock data with enhanced features
const MOCK_USERS: User[] = [
  { id: 'user_1', name: 'Leon JENKINGS!', avatar: 'LJ', status: 'online', email: 'leon@example.com' },
  { id: 'user_2', name: 'Luis', avatar: 'L', status: 'away', email: 'luis@example.com' },
  { id: 'user_3', name: 'Vanilla Gorilla', avatar: 'VG', status: 'offline', lastSeen: '2 hours ago' },
  { id: 'user_4', name: 'Alice Johnson', avatar: 'AJ', status: 'online', email: 'alice@example.com' },
  { id: 'user_5', name: 'Bob Smith', avatar: 'BS', status: 'busy', email: 'bob@example.com' },
  { id: 'user_6', name: 'Charlie Brown', avatar: 'CB', status: 'online', email: 'charlie@example.com' },
];

// Enhanced components
const UserProfileCard: React.FC<{ user: User; isDark: boolean }> = ({ user, isDark }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderBottom: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
    background: isDark ? '#1a1a1a' : '#ffffff',
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: user.avatar ? `url(${user.avatar})` : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '16px',
      marginRight: '12px',
    }}>
      {!user.avatar && user.name.charAt(0).toUpperCase()}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontWeight: '600',
        fontSize: '14px',
        color: isDark ? '#ffffff' : '#1a1a1a',
        marginBottom: '2px',
      }}>
        {user.name}
      </div>
      <div style={{
        fontSize: '12px',
        color: isDark ? '#888' : '#666',
        display: 'flex',
        alignItems: 'center',
      }}>
        <StatusIndicator status={user.status} />
        <span style={{ marginLeft: '6px' }}>
          {user.status === 'online' ? 'Online' : 
           user.status === 'away' ? 'Away' : 
           user.status === 'busy' ? 'Busy' : 'Offline'}
        </span>
      </div>
    </div>
  </div>
);

const StatusIndicator = ({ status }: { status: UserStatus }) => {
  const colors = {
    online: '#228B22',
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

const ChatListItem = ({ chat, active, onClick, isDark }: { chat: Chat, active: boolean, onClick: () => void, isDark: boolean }) => (
  <div 
    onClick={onClick} 
    style={{
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
      cursor: 'pointer',
      backgroundColor: active ? (isDark ? '#1f2937' : '#f5f5f5') : 'transparent',
      borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`,
      position: 'relative'
    }}
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#228B22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        marginRight: '12px',
        flexShrink: 0
      }}
    >
      {chat.avatar}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontWeight: '600',
            fontSize: '15px',
            color: isDark ? '#ffffff' : '#1f2937',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {chat.name}
          </span>
          {chat.isPinned && (
            <span style={{ fontSize: '12px', color: '#228B22' }}>📌</span>
          )}
          {chat.isMuted && (
            <span style={{ fontSize: '12px', color: isDark ? '#6c757d' : '#9ca3af' }}>🔇</span>
          )}
        </div>
        <span style={{
          fontSize: '13px',
          color: isDark ? '#9ca3af' : '#6b7280',
          flexShrink: 0,
          marginLeft: '8px'
        }}>
          {chat.timestamp}
        </span>
      </div>
      <div style={{
        fontSize: '14px',
        color: isDark ? '#9ca3af' : '#6b7280',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {chat.lastMessage}
      </div>
    </div>
    {chat.unread > 0 && (
      <div style={{
        backgroundColor: '#228B22',
        color: 'white',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '600',
        marginLeft: '8px',
        flexShrink: 0
      }}>
        {chat.unread}
      </div>
    )}
  </div>
);

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
      {user.avatar}
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
      {team.avatar}
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

const ChatHeader = ({ chat, isDark, onToggleRightPanel }: { chat: Chat | undefined, isDark: boolean, onToggleRightPanel: () => void }) => (
        <div style={{
    padding: '16px 24px',
    background: isDark ? '#1a1a1a' : '#ffffff',
    borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
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
            {chat.avatar}
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

const MessageReactions = ({ reactions, onReact, isDark }: { reactions: Reaction[], onReact: (emoji: string) => void, isDark: boolean }) => (
  <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
    {reactions.map((reaction, idx) => (
      <button
        key={idx}
        onClick={() => onReact(reaction.emoji)}
        style={{
          background: isDark ? '#2a2a2a' : '#f8f9fa',
          border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
          borderRadius: '12px',
          padding: '4px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease'
        }}
      >
        <span>{reaction.emoji}</span>
        <span style={{ color: isDark ? '#adb5bd' : '#6c757d' }}>{reaction.count}</span>
      </button>
    ))}
    <button
      onClick={() => onReact('👍')}
      style={{
        background: 'transparent',
        border: `1px dashed ${isDark ? '#404040' : '#dee2e6'}`,
        borderRadius: '12px',
        padding: '4px 8px',
        fontSize: '12px',
        cursor: 'pointer',
        color: isDark ? '#6c757d' : '#adb5bd',
        transition: 'all 0.2s ease'
      }}
    >
      +
    </button>
  </div>
);

const FilePreview = ({ message, isDark }: { message: Message, isDark: boolean }) => {
  if (message.type === 'image') {
    return (
      <div style={{
        maxWidth: '300px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        <img 
          src={message.fileUrl} 
          alt={message.fileName}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        </div>
    );
  }

  if (message.type === 'file') {
    return (
      <div style={{
        background: isDark ? '#2a2a2a' : '#f8f9fa',
        border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '300px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          background: '#228B22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: '#fff'
        }}>
          📄
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: '500',
            fontSize: '14px',
            color: isDark ? '#ffffff' : '#1a1a1a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {message.fileName}
          </div>
          <div style={{
            fontSize: '12px',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'File'}
          </div>
        </div>
        <button style={{
          background: 'transparent',
          border: 'none',
          color: isDark ? '#adb5bd' : '#6c757d',
          cursor: 'pointer',
          fontSize: '16px'
        }}>
          ⬇️
        </button>
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
  const [isHovered, setIsHovered] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  return (
    <div 
      style={{
        display: 'flex', 
        justifyContent: sent ? 'flex-end' : 'flex-start', 
        margin: '8px 24px',
        marginBottom: '12px',
        position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover Actions */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: sent ? 'auto' : '100%',
          left: sent ? '100%' : 'auto',
          display: 'flex',
          gap: '4px',
          background: isDark ? '#2a2a2a' : '#ffffff',
          borderRadius: '20px',
          padding: '4px 8px',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
          border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
          zIndex: 10
        }}>
          {/* Quick Reactions */}
          {['👍', '❤️', '😂'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
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
          
          {/* More Reactions Button */}
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '12px',
              color: isDark ? '#adb5bd' : '#6c757d',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            😀
          </button>
          
          {/* Reply Button */}
          <button
            onClick={() => onReply(message)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '12px',
              color: isDark ? '#adb5bd' : '#6c757d',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ↩️
          </button>
        </div>
      )}

      {/* Extended Reaction Picker */}
      {showReactionPicker && (
        <div style={{
          position: 'absolute',
          top: '32px',
          right: sent ? 'auto' : '100%',
          left: sent ? '100%' : 'auto',
          background: isDark ? '#2a2a2a' : '#ffffff',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
          border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
          zIndex: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '4px',
          minWidth: '200px'
        }}>
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji);
                setShowReactionPicker(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
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

      <div style={{
        background: sent 
          ? '#228B22'
          : isDark 
            ? '#2a2a2a' 
            : '#ffffff',
        color: sent 
          ? '#ffffff' 
          : isDark 
            ? '#ffffff' 
            : '#1a1a1a',
        padding: '12px 16px',
        borderRadius: sent ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        maxWidth: '70%',
        boxShadow: isDark 
          ? '0 2px 8px rgba(0,0,0,0.3)' 
          : '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        wordBreak: 'break-word'
      }}>
        {message.replyTo && (
          <div style={{
            background: sent ? 'rgba(255,255,255,0.1)' : isDark ? '#1a1a1a' : '#f8f9fa',
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '13px',
            borderLeft: `3px solid ${sent ? '#ffffff' : '#228B22'}`
          }}>
            Replying to: {message.replyTo}
          </div>
        )}
        
        <FilePreview message={message} isDark={isDark} />
        
        {message.text && (
          <p style={{
            margin: 0, 
            whiteSpace: 'pre-wrap',
            fontSize: '15px',
            lineHeight: '1.4',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {message.text}
          </p>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <p style={{
            margin: 0, 
            fontSize: '12px', 
            color: sent 
              ? 'rgba(255,255,255,0.7)' 
              : isDark 
                ? '#adb5bd' 
                : '#6c757d', 
            fontWeight: '500'
          }}>
            {message.timestamp}
            {message.edited && ' (edited)'}
          </p>
          {sent && (
            <span style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              marginLeft: '8px'
            }}>
              ✓✓
            </span>
          )}
        </div>
        
        {message.reactions && message.reactions.length > 0 && (
          <MessageReactions 
            reactions={message.reactions} 
            onReact={(emoji) => onReact(message.id, emoji)}
            isDark={isDark}
          />
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
            border: 'none',
            background: '#f5f5f5',
            color: '#000000',
            outline: 'none',
            fontSize: '15px',
            padding: '14px 160px 14px 20px',
            borderRadius: '12px',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
            position: 'relative'
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
                filter: 'brightness(0)'
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
                filter: 'brightness(0)'
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
              width={35}
              height={35}
              style={{ 
                opacity: text.trim() ? 1 : 0.3
              }}
            />
            </button>
        </div>
      </div>
        </div>
    );
};

const RightPanel = ({ chat, isOpen, isDark, onToggleMute, onTogglePin, onToggleArchive }: { 
  chat: Chat | undefined, 
  isOpen: boolean, 
  isDark: boolean,
  onToggleMute: (chatId: string) => void,
  onTogglePin: (chatId: string) => void,
  onToggleArchive: (chatId: string) => void
}) => {
  if (!isOpen || !chat) return null;

  const handleMediaClick = (index: number) => {
    // Simulate opening media viewer
    alert(`Opening media item ${index + 1}`);
  };

  const handleLeaveGroup = () => {
    if (chat.type === 'group') {
      const confirmLeave = confirm(`Are you sure you want to leave "${chat.name}"?`);
      if (confirmLeave) {
        // TODO: Implement leave group functionality with Supabase
        alert('Leave group functionality will be implemented');
      }
    }
  };

  const handleDeleteGroup = () => {
    if (chat.type === 'group') {
      const confirmDelete = confirm(`Are you sure you want to delete "${chat.name}"? This action cannot be undone.`);
      if (confirmDelete) {
        // TODO: Implement delete group functionality with Supabase
        alert('Delete group functionality will be implemented');
      }
    }
  };

  const actionButtons = [
    { icon: chat.isMuted ? '🔇' : '🔊', label: chat.isMuted ? 'Unmute' : 'Mute', action: () => onToggleMute(chat.id) },
    { icon: chat.isPinned ? '📌' : '📍', label: chat.isPinned ? 'Unpin' : 'Pin', action: () => onTogglePin(chat.id) },
    { icon: '🗃️', label: 'Archive', action: () => onToggleArchive(chat.id) }
  ];

  return (
    <div style={{
      width: '320px',
      background: isDark ? '#1a1a1a' : '#ffffff',
      borderLeft: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: isDark ? '-2px 0 8px rgba(0,0,0,0.3)' : '-2px 0 8px rgba(0,0,0,0.1)'
    }}>
      {/* Profile/Group Info */}
      <div style={{ padding: '24px', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}` }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
            color: isDark ? '#fff' : '#495057',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '600',
            margin: '0 auto 16px',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            {chat.avatar}
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            {chat.name}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: isDark ? '#adb5bd' : '#6c757d'
          }}>
            {chat.type === 'group' ? `${chat.participants.length} members` : 'Direct message'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {actionButtons.map((button, idx) => (
            <button
              key={idx}
              onClick={button.action}
              title={button.label}
              style={{
                background: isDark ? '#2a2a2a' : '#f8f9fa',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 14px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark ? '#404040' : '#e9ecef';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f8f9fa';
              }}
            >
              {button.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Participants */}
      {chat.type === 'group' && (
        <div style={{ padding: '20px', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}` }}>
          <h4 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: isDark ? '#ffffff' : '#1a1a1a'
          }}>
            Members ({chat.participants.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chat.participants.map((participant, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'background 0.2s ease'
                }}
                onClick={() => {
                  if (participant.id !== CURRENT_USER?.id) {
                    alert(`Starting direct chat with ${participant.name}`);
                  }
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
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                    color: isDark ? '#fff' : '#495057',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {participant.avatar}
                  </div>
                  <StatusIndicator status={participant.status} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: isDark ? '#ffffff' : '#1a1a1a'
                  }}>
                    {participant.name} {participant.id === CURRENT_USER?.id && '(You)'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: isDark ? '#adb5bd' : '#6c757d',
                    textTransform: 'capitalize'
                  }}>
                    {participant.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Media */}
      <div style={{ padding: '20px', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}` }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: isDark ? '#ffffff' : '#1a1a1a'
        }}>
          Shared Media
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              onClick={() => handleMediaClick(item - 1)}
              style={{
                aspectRatio: '1',
                background: isDark ? '#2a2a2a' : '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
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
      <div style={{ padding: '20px' }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: isDark ? '#ffffff' : '#1a1a1a'
        }}>
          Chat Settings
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { iconSrc: '/icons/bell.svg', label: 'Notifications', value: !chat.isMuted, action: () => onToggleMute(chat.id) },
            { iconSrc: '/icons/pin.svg', label: 'Pin Chat', value: chat.isPinned, action: () => onTogglePin(chat.id) },
            { iconSrc: '/icons/archive.svg', label: 'Archive Chat', value: chat.isArchived, action: () => onToggleArchive(chat.id) }
          ].map((setting, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={setting.iconSrc} 
                  alt={setting.label}
                  width={16}
                  height={16}
                  style={{ 
                    filter: isDark ? 'invert(1)' : 'none',
                    opacity: 0.8
                  }}
                />
                <span style={{
                  fontSize: '14px',
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
                  borderRadius: '10px',
                  background: setting.value ? '#228B22' : isDark ? '#404040' : '#dee2e6',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
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
                  transition: 'all 0.2s ease'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Group Actions - Only show for groups */}
        {chat.type === 'group' && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: isDark ? '#ffffff' : '#1a1a1a'
            }}>
              Group Actions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleLeaveGroup}
                style={{
                  background: isDark ? '#2a2a2a' : '#f8f9fa',
                  border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#f59e0b',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
              <button
                onClick={handleDeleteGroup}
                style={{
                  background: isDark ? '#2a2a2a' : '#f8f9fa',
                  border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
            </div>
          </div>
        )}
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [companyTeams, setCompanyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupUserSearch, setGroupUserSearch] = useState(''); // New search field for group creation
  const [recentUsers, setRecentUsers] = useState<User[]>([]); // Track recent/frequent users
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);

  const isDark = theme === 'dark';
  const activeChat = chats.find(chat => chat.id === activeChatId);

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      const user = getCurrentUser();
      if (!user) {
        // Redirect to login if no user (this should be handled at app level)
        navigate('/login');
        return;
      }
      
      CURRENT_USER = convertSupabaseUser(user);
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
        const [users, teams] = await Promise.all([
          getCompanyUsers(authUser.company_id),
          getCompanyTeams(authUser.company_id)
        ]);
        
        const convertedUsers = users.filter(u => u.id !== CURRENT_USER?.id).map(convertSupabaseUser);
        setCompanyUsers(convertedUsers);
        
        const convertedTeams = teams.map(team => ({
          id: team.id,
          name: team.name,
          description: team.description,
          avatar: team.avatar,
          member_count: team.member_count || 0,
          members: team.members?.map(member => convertSupabaseUser(member.user!)).filter(Boolean)
        }));
        setCompanyTeams(convertedTeams);
      }
      
      // Select first chat if available
      if (convertedChats.length > 0) {
        await selectChat(convertedChats[0].id);
      }
      
      // Subscribe to user status changes
      const currentAuthUser = getCurrentUser();
      if (currentAuthUser) {
        subscribeToUserStatus(currentAuthUser.company_id, handleUserStatusChange);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setSearchQuery('');
    setShowRightPanel(false);
    
    try {
      const chatMessages = await getChatMessages(chatId);
      const convertedMessages = chatMessages.map(convertSupabaseMessage);
      
      // Update the specific chat with its messages
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages: convertedMessages }
            : chat
        )
      );
      
      // Subscribe to real-time messages for this chat
      subscribeToMessages(chatId, handleNewMessage);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

  const handleNewMessage = (message: SupabaseMessage) => {
    // Don't add message if it's from the current user (they already see it immediately)
    if (message.sender_id === CURRENT_USER?.id) {
      return;
    }
    
    const convertedMessage = convertSupabaseMessage(message);
    
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
    
    // Search users
    const existingChatNames = chats.map(c => c.name.toLowerCase());
    const userResults = companyUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !existingChatNames.includes(user.name.toLowerCase())
    );
    setSearchResults(userResults);
    
    // Search teams
    const teamResults = companyTeams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setTeamSearchResults(teamResults);
  }, [searchQuery, chats, companyUsers, companyTeams]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setSearchQuery('');
    setShowRightPanel(false);
  };

  const handleStartNewChat = async (user: User) => {
    if (!CURRENT_USER) return;

    try {
      const authUser = getCurrentUser();
      if (!authUser) return;

      const chat = await createDirectChat(CURRENT_USER.id, user.id, authUser.company_id);
      if (chat) {
        const convertedChat = convertSupabaseChat(chat);
        setChats(prevChats => [convertedChat, ...prevChats.filter(c => c.id !== convertedChat.id)]);
        setActiveChatId(convertedChat.id);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to create direct chat:', error);
    }
  };

  const handleStartTeamChat = async (team: Team) => {
    if (!CURRENT_USER) return;

    try {
      const authUser = getCurrentUser();
      if (!authUser) return;

      const chat = await createTeamChat(CURRENT_USER.id, authUser.company_id, team.id);
      if (chat) {
        const convertedChat = convertSupabaseChat(chat);
        setChats(prevChats => [convertedChat, ...prevChats.filter(c => c.id !== convertedChat.id)]);
        setActiveChatId(convertedChat.id);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to create team chat:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || !CURRENT_USER) return;

    try {
      const authUser = getCurrentUser();
      if (!authUser) return;

      // Get participant IDs
      const participantIds = selectedUsers.map(user => user.id);
      
      // Create group chat in Supabase
      const chat = await createGroupChat(
        CURRENT_USER.id, 
        authUser.company_id, 
        groupName.trim(), 
        participantIds
      );

      if (chat) {
        const convertedChat = convertSupabaseChat(chat);
        setChats(prevChats => [convertedChat, ...prevChats]);
        setActiveChatId(convertedChat.id);
        setShowCreateGroup(false);
        setGroupName('');
        setSelectedUsers([]);
        setGroupUserSearch('');
      }
    } catch (error) {
      console.error('Failed to create group chat:', error);
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
    
    // Close the chat if it's currently active and being archived
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setShowRightPanel(false);
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
    setSearchQuery('');
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
      background: isDark ? '#0f0f0f' : '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Left Sidebar */}
      <div style={{ 
        width: '380px', 
        background: isDark ? '#1a1a1a' : '#ffffff',
        borderRight: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`, 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: isDark ? '2px 0 8px rgba(0,0,0,0.3)' : '2px 0 8px rgba(0,0,0,0.1)'
      }}>
        {/* User Profile */}
        <UserProfileCard 
          user={CURRENT_USER || {
            id: 'unknown',
            name: 'Unknown User',
            email: 'unknown@example.com',
            avatar: '',
            status: 'offline' as const,
            lastSeen: new Date().toISOString()
          }}
          isDark={isDark}
        />

        {/* Search */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
                <input
                type="search"
              placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 16px 12px 44px', 
                borderRadius: '12px', 
                border: 'none', 
                background: isDark ? '#2a2a2a' : '#f8f9fa', 
                color: isDark ? '#ffffff' : '#1a1a1a',
                outline: 'none',
                fontSize: '15px',
                boxShadow: isDark ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            />
            <div style={{
              position: 'absolute',
              left: '16px',
              color: isDark ? '#adb5bd' : '#6c757d',
              fontSize: '16px'
            }}>
              🔍
              </div>
          </div>
        </div>

        {/* Tabs */}
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
                background: activeTab === tab.id ? '#228B22' : 'transparent',
                border: activeTab === tab.id ? '1px solid #228B22' : '1px solid #228B22',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                color: activeTab === tab.id ? '#ffffff' : '#228B22',
                cursor: 'pointer',
                borderRadius: '20px',
                transition: 'all 0.2s ease',
                minWidth: '70px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        {activeTab !== 'archived' && (
          <div style={{ padding: '0 20px 16px 20px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleNewChatClick}
              style={{
                flex: 1,
                background: '#228B22',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              + New Chat
            </button>
            <button
              onClick={handleCreateGroupClick}
              style={{
                flex: 1,
                background: showCreateGroup ? '#228B22' : (isDark ? '#2a2a2a' : '#f8f9fa'),
                color: showCreateGroup ? '#ffffff' : (isDark ? '#ffffff' : '#1a1a1a'),
                border: `1px solid ${showCreateGroup ? '#228B22' : (isDark ? '#404040' : '#dee2e6')}`,
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Create Group
            </button>
          </div>
        )}

        {/* Create Group Form */}
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
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                background: isDark ? '#2a2a2a' : '#f8f9fa',
                color: isDark ? '#ffffff' : '#1a1a1a',
                outline: 'none',
                fontSize: '14px',
                marginBottom: '12px',
                boxSizing: 'border-box'
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
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                background: isDark ? '#2a2a2a' : '#f8f9fa',
                color: isDark ? '#ffffff' : '#1a1a1a',
                outline: 'none',
                fontSize: '14px',
                marginBottom: '12px',
                boxSizing: 'border-box'
              }}
            />

            {/* Quick suggestions */}
            {groupUserSearch.trim() === '' && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isDark ? '#adb5bd' : '#6c757d',
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
                          ? isDark ? '#404040' : '#e9ecef'
                          : '#228B22',
                        color: selectedUsers.some(u => u.id === user.id)
                          ? isDark ? '#888' : '#6c757d'
                          : 'white',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: selectedUsers.some(u => u.id === user.id) ? 'not-allowed' : 'pointer',
                        opacity: selectedUsers.some(u => u.id === user.id) ? 0.5 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                        color: isDark ? '#fff' : '#495057',
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
            
            {/* User Selection */}
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
              borderRadius: '8px',
              background: isDark ? '#2a2a2a' : '#f8f9fa',
              marginBottom: '12px'
            }}>
              <div style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                fontSize: '12px',
                fontWeight: '600',
                color: isDark ? '#adb5bd' : '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Select Members ({selectedUsers.length} selected)
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
                    border: `2px solid ${selectedUsers.some(u => u.id === user.id) ? '#228B22' : (isDark ? '#666' : '#ccc')}`,
                    background: selectedUsers.some(u => u.id === user.id) ? '#228B22' : 'transparent',
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {selectedUsers.map(user => (
                    <span
                      key={user.id}
                      style={{
                        background: '#228B22',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {user.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          padding: '0',
                          margin: '0',
                          lineHeight: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
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
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
                style={{
                  width: '50%',
                  background: (groupName.trim() && selectedUsers.length > 0) ? '#228B22' : (isDark ? '#404040' : '#dee2e6'),
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
                  No users or teams found for "{searchQuery}"
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
        flexDirection: 'column', 
        background: isDark ? '#0f0f0f' : '#f8f9fa'
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
          paddingTop: '16px',
          paddingBottom: '16px',
          display: 'flex', 
          flexDirection: 'column'
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
              color: isDark ? '#6c757d' : '#adb5bd'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>💬</div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: '0 0 8px 0',
                color: isDark ? '#adb5bd' : '#6c757d'
              }}>
                No chat selected
              </h3>
              <p style={{ 
                fontSize: '16px', 
                margin: 0,
                color: isDark ? '#6c757d' : '#adb5bd'
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
      />
    </div>
  );
} 