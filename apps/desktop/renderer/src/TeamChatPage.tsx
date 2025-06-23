import React, { useState, useEffect, useRef, useContext } from 'react';
import { ThemeContext } from './ThemeContext';

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

type ChatType = 'direct' | 'group';

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
  isTyping?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
};

// Mock data with enhanced features
const CURRENT_USER: User = {
  id: 'current_user',
  name: 'You',
  avatar: 'Y',
  status: 'online'
};

const MOCK_USERS: User[] = [
  { id: 'user_1', name: 'Leon JENKINGS!', avatar: 'LJ', status: 'online', email: 'leon@example.com' },
  { id: 'user_2', name: 'Luis', avatar: 'L', status: 'away', email: 'luis@example.com' },
  { id: 'user_3', name: 'Vanilla Gorilla', avatar: 'VG', status: 'offline', lastSeen: '2 hours ago' },
  { id: 'user_4', name: 'Alice Johnson', avatar: 'AJ', status: 'online', email: 'alice@example.com' },
  { id: 'user_5', name: 'Bob Smith', avatar: 'BS', status: 'busy', email: 'bob@example.com' },
  { id: 'user_6', name: 'Charlie Brown', avatar: 'CB', status: 'online', email: 'charlie@example.com' },
];

const TIMELY_BOT_CHAT: Chat = {
  id: 'chat_bot_timely',
  name: 'Timely',
  type: 'direct',
  lastMessage: 'Welcome to Timely! How can I help you?',
  timestamp: 'Now',
  unread: 1,
  avatar: 'T',
  participants: [CURRENT_USER, { id: 'bot', name: 'Timely', avatar: 'T', status: 'online' }],
  messages: [
    {
      id: 'msg_bot_1',
      text: 'Welcome to Timely! I can help you with scheduling, reminders, and more. What would you like to do?',
      sender: 'Timely',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      sent: false
    }
  ]
};

// Enhanced components
const UserProfileCard = ({ user, isDark }: { user: User, isDark: boolean }) => (
  <div style={{
    padding: '20px 24px',
    borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e9ecef'}`,
    background: isDark ? '#1a1a1a' : '#ffffff'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: isDark ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)' : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
          color: isDark ? '#fff' : '#495057',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: '600',
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {user.avatar}
        </div>
        <div style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: user.status === 'online' ? '#228B22' : user.status === 'away' ? '#f59e0b' : user.status === 'busy' ? '#ef4444' : '#6b7280',
          border: `2px solid ${isDark ? '#1a1a1a' : '#ffffff'}`
        }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: '600',
          fontSize: '16px',
          color: isDark ? '#ffffff' : '#1a1a1a',
          marginBottom: '2px'
        }}>
          {user.name}
        </div>
        <div style={{
          fontSize: '13px',
          color: isDark ? '#adb5bd' : '#6c757d',
          textTransform: 'capitalize'
        }}>
          {user.status}
        </div>
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
      padding: '16px 20px', 
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      borderRadius: '12px',
      margin: '4px 12px'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = isDark ? '#1f1f1f' : '#f0f0f0';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <div style={{ position: 'relative', marginRight: '16px' }}>
    <div style={{
      width: '48px',
      height: '48px',
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
        {user.avatar}
      </div>
      <StatusIndicator status={user.status} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ 
        fontWeight: '600', 
        fontSize: '16px',
        color: isDark ? '#ffffff' : '#1a1a1a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        marginBottom: '2px'
      }}>
        {user.name}
      </div>
      <div style={{
        fontSize: '13px',
        color: isDark ? '#adb5bd' : '#6c757d',
        textTransform: 'capitalize'
      }}>
        {user.status} • {user.email}
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
              color: isDark ? '#ffffff' : '#1a1a1a',
              marginBottom: '2px'
            }}>
              {chat.name}
            </div>
            <div style={{
              fontSize: '13px',
              color: isDark ? '#adb5bd' : '#6c757d'
            }}>
              {chat.type === 'group' ? 
                `${chat.participants.length} members` : 
                chat.participants.find(p => p.id !== CURRENT_USER.id)?.status || 'offline'
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
                  if (participant.id !== CURRENT_USER.id) {
                    alert(`Starting direct chat with ${participant.name}`);
                  }
                }}
                onMouseEnter={e => {
                  if (participant.id !== CURRENT_USER.id) {
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
                    {participant.name} {participant.id === CURRENT_USER.id && '(You)'}
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
            { icon: '🔔', label: 'Notifications', value: !chat.isMuted, action: () => onToggleMute(chat.id) },
            { icon: '📌', label: 'Pin Chat', value: chat.isPinned, action: () => onTogglePin(chat.id) },
            { icon: '🗃️', label: 'Archive Chat', value: false, action: () => onToggleArchive(chat.id) }
          ].map((setting, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>{setting.icon}</span>
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
      </div>
    </div>
  );
};

// Main component for the enhanced Teams Chat page
export default function TeamChatPage() {
  const [chats, setChats] = useState<Chat[]>([TIMELY_BOT_CHAT]);
  const [activeChatId, setActiveChatId] = useState<string | null>(TIMELY_BOT_CHAT.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'archived'>('chats');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);

  const isDark = theme === 'dark';
  const activeChat = chats.find(chat => chat.id === activeChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
    }
    const existingChatNames = chats.map(c => c.name.toLowerCase());
    const results = MOCK_USERS.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !existingChatNames.includes(user.name.toLowerCase())
    );
    setSearchResults(results);
  }, [searchQuery, chats]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setSearchQuery('');
    setShowRightPanel(false);
  };

  const handleStartNewChat = (user: User) => {
    const newChat: Chat = {
        id: `chat_${user.id}`,
        name: user.name,
      type: 'direct',
        avatar: user.avatar,
        lastMessage: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
      messages: [],
      participants: [CURRENT_USER, user]
    };
    setChats(prevChats => [newChat, ...prevChats.filter(c => c.id !== newChat.id)]);
    setActiveChatId(newChat.id);
    setSearchQuery('');
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      const newGroup: Chat = {
        id: `group_${Date.now()}`,
        name: groupName,
        type: 'group',
        avatar: groupName.charAt(0).toUpperCase(),
        lastMessage: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        messages: [],
        participants: [CURRENT_USER, ...selectedUsers]
      };
      setChats(prevChats => [newGroup, ...prevChats]);
      setActiveChatId(newGroup.id);
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedUsers([]);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = (text: string, type: MessageType = 'text') => {
    if (!activeChatId) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      text,
      sender: CURRENT_USER.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      sent: true,
      replyTo: replyingTo ? `${replyingTo.sender}: ${replyingTo.text.substring(0, 50)}${replyingTo.text.length > 50 ? '...' : ''}` : undefined
    };

    const updatedChats = chats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: type === 'text' ? text : `${type === 'file' ? '📄' : type === 'image' ? '📷' : '📍'} ${text}`,
          timestamp: newMessage.timestamp,
        };
      }
      return chat;
    });

    setChats(updatedChats);
    setReplyingTo(null); // Clear reply after sending
  };

  const handleFileUpload = (file: File) => {
    if (!activeChatId) return;

    const fileMessage: Message = {
      id: `msg_${Date.now()}`,
      text: file.name,
      sender: CURRENT_USER.name,
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

  const handleReaction = (messageId: string, emoji: string) => {
    const updatedChats = chats.map(chat => {
      if (chat.id === activeChatId) {
        const updatedMessages = chat.messages.map(msg => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || [];
            const existingReaction = reactions.find(r => r.emoji === emoji);
            
            if (existingReaction) {
              if (existingReaction.users.includes(CURRENT_USER.id)) {
                // Remove reaction
                existingReaction.users = existingReaction.users.filter(u => u !== CURRENT_USER.id);
                existingReaction.count = existingReaction.users.length;
                return {
                  ...msg,
                  reactions: reactions.filter(r => r.count > 0)
                };
              } else {
                // Add reaction
                existingReaction.users.push(CURRENT_USER.id);
                existingReaction.count = existingReaction.users.length;
                return { ...msg, reactions };
              }
            } else {
              // New reaction
              return {
                ...msg,
                reactions: [...reactions, { emoji, users: [CURRENT_USER.id], count: 1 }]
              };
            }
          }
          return msg;
        });
        return { ...chat, messages: updatedMessages };
      }
      return chat;
    });

    setChats(updatedChats);
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

  const filteredChats = chats.filter(chat => {
    if (activeTab === 'archived') return chat.isArchived;
    if (activeTab === 'groups') return chat.type === 'group' && !chat.isArchived;
    if (activeTab === 'chats') return chat.type === 'direct' && !chat.isArchived;
    return !chat.isArchived;
  }).sort((a, b) => {
    // Sort pinned chats to the top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

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
        <UserProfileCard user={CURRENT_USER} isDark={isDark} />

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
                marginBottom: '12px'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
                style={{
                  flex: 1,
                  background: (groupName.trim() && selectedUsers.length > 0) ? '#228B22' : (isDark ? '#404040' : '#dee2e6'),
                  color: (groupName.trim() && selectedUsers.length > 0) ? '#ffffff' : (isDark ? '#888' : '#6c757d'),
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: (groupName.trim() && selectedUsers.length > 0) ? 'pointer' : 'not-allowed'
                }}
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateGroup(false)}
                style={{
                  background: 'transparent',
                  color: isDark ? '#adb5bd' : '#6c757d',
                  border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {searchQuery && searchResults.length > 0 ? (
            <>
              <div style={{
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: '600',
                color: isDark ? '#adb5bd' : '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Search Results
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
                sent={message.sender === CURRENT_USER.name}
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