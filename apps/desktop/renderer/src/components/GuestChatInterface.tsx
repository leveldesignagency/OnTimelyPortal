import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

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
  reply_to_message_id?: string | null; // Added for replies
  is_edited?: boolean; // Added for edited status
  edited_at?: string; // Added for edited timestamp
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
}

interface GuestChatInterfaceProps {
  eventId: string;
  isDark: boolean;
  guests: Guest[];
}

// Global hover popup management
type HoverPopupState = {
  activeMessageId: string | null;
  position: { x: number; y: number } | null;
  message: Message | null;
  hideTimeoutId: number | null;
};

// Enhanced theme system inspired by Teams Chat design
const themes = {
  light: {
    bg: '#f8f9fa',
    panelBg: '#f8f9fa',
    chatBg: 'rgba(255, 255, 255, 0.7)',
    text: '#1a1a1a',
    textSecondary: '#6c757d',
    border: '#e9ecef',
    accent: '#1a1a1a',
    hoverBg: 'rgba(255, 255, 255, 0.9)',
    buttonBg: '#1a1a1a',
    buttonText: '#ffffff',
    messageBubble: 'rgba(255, 255, 255, 0.9)',
    messageBubbleSent: 'rgba(26, 26, 26, 0.9)',
    inputBg: 'rgba(255, 255, 255, 0.8)',
    avatarBg: 'linear-gradient(135deg, #e9ecef, #dee2e6)',
    avatarText: '#495057',
    primary: '#228B22'
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

// Helper function to generate avatar initials from name
const getUserInitials = (name: string): string => {
  return name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
};

// Helper function to check if a string is a valid avatar URL
const isAvatarUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  // Check if it's a valid URL or data URL
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('/');
};

// Modern Chat Header Component
const ChatHeader = ({ eventId, isDark, guestCount }: { 
  eventId: string, 
  isDark: boolean, 
  guestCount: number 
}) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  
  return (
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
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: colors.avatarBg,
          color: colors.avatarText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          👥
        </div>
        <div>
          <div style={{
            fontWeight: '600',
            fontSize: '16px',
            color: colors.text
          }}>
            Guest Chat
          </div>
          <div style={{
            fontSize: '13px',
            color: colors.textSecondary
          }}>
            {guestCount} guests • Event chat
          </div>
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ name, avatarUrl, isDark, isCurrentUser }: { name: string; avatarUrl?: string | null; isDark: boolean; isCurrentUser?: boolean }) => {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  
  // console.log(`[AVATAR COMPONENT] Rendering avatar for ${name}:`, {
  //   avatarUrl,
  //   isAvatarUrl: avatarUrl ? isAvatarUrl(avatarUrl) : false,
  //   willShowImage: avatarUrl && isAvatarUrl(avatarUrl)
  // });
  
  // Only log if avatarUrl exists but we're still showing initials
  if (avatarUrl && !isAvatarUrl(avatarUrl)) {
    // console.log(`[AVATAR DEBUG] Invalid URL for ${name}: ${avatarUrl}`);
  }
  
  const avatarStyle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    marginRight: isCurrentUser ? 0 : 10,
    marginLeft: isCurrentUser ? 10 : 0,
    objectFit: 'cover' as const,
    background: isDark ? '#222' : '#e0e0e0'
  };
  
  if (avatarUrl && isAvatarUrl(avatarUrl)) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={avatarStyle}
      />
    );
  }
  return (
    <div style={{
      ...avatarStyle,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: 14,
      color: isDark ? '#fff' : '#222',
    }}>{initials}</div>
  );
};

// Modern Message Bubble Component
const MessageBubble = ({ message, isDark, currentUserEmail, onReply, onReact, messages, reactions, highlightedMessageId, handleJumpToMessage, onShowHover }: { 
  message: Message, 
  isDark: boolean,
  currentUserEmail: string | null,
  onReply: (message: Message) => void,
  onReact: (message: Message, emoji: string) => void,
  messages: Message[],
  reactions: { [emoji: string]: { count: number, reacted: boolean } },
  highlightedMessageId: string | null,
  handleJumpToMessage: (messageId: string) => void,
  onShowHover?: (message: Message, event: React.MouseEvent) => void
}) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  const isCurrentUser = currentUserEmail && message.sender_email === currentUserEmail;
  
      // console.log(`[AVATAR DEBUG] Message from ${message.sender_email}, current user: ${currentUserEmail}, isCurrentUser: ${isCurrentUser}, avatar_url: ${message.avatar_url}, sender_type: ${message.sender_type}`);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiList = ['👍','❤️','😂','😮','😢','😡','🎉','👏','🙏','🔥','💯','✨','💪','🤔','😎','🥳','😴','🤯','😍','🤩','😭','🤬','🤮','🤧','🤠','👻','🤖','👽','👾','🤡','👹','👺','💀','☠️'];

  // Find replied-to message if this is a reply
  const repliedTo = message.reply_to_message_id
    ? messages.find((m) => m.message_id === message.reply_to_message_id)
    : null;

  return (
    <div 
      id={`message-${message.message_id}`}
      style={{
        position: 'relative',
        background: highlightedMessageId === message.message_id ? (isDark ? 'rgba(128,128,128,0.28)' : 'rgba(128,128,128,0.18)') : undefined,
        transition: 'background 0.3s',
        maxWidth: '100%',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { 
        setShowActions(false); 
        setShowEmojiPicker(false);
      }}
    >

    <div style={{
      display: 'flex',
      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
      marginBottom: '16px',
      paddingLeft: isCurrentUser ? '60px' : '0px',
      paddingRight: isCurrentUser ? '0px' : '60px',
      alignItems: 'flex-start',
      gap: '8px',
      position: 'relative'
    }}>
      {/* Avatar for received messages (left side) */}
      {!isCurrentUser && <Avatar name={message.sender_name} avatarUrl={message.avatar_url} isDark={isDark} isCurrentUser={false} />}
      
              <div style={{
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: isCurrentUser ? 'flex-end' : 'flex-start', 
          maxWidth: '70%',
          position: 'relative'
        }}>

          {/* Bubble */}
          <div
            style={{
          background: isCurrentUser ? '#00bfa5' : colors.messageBubble,
          color: isCurrentUser ? '#ffffff' : (isDark ? '#ffffff' : '#000000'),
          padding: '12px 16px',
          borderRadius: isCurrentUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          wordWrap: 'break-word',
          position: 'relative',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: isDark 
            ? '0 4px 16px rgba(0,0,0,0.3)' 
                : '0 4px 16px rgba(0,0,0,0.1)',
              cursor: isCurrentUser ? 'pointer' : 'default',
            }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onClick={(e) => {
              if (isCurrentUser) {
                e.stopPropagation();
                onShowHover?.(message, e);
              }
            }}
          >
            {/* Reply preview if this is a reply */}
            {repliedTo && (
              <div
                onClick={() => handleJumpToMessage(repliedTo.message_id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                  marginLeft: 0,
                  alignSelf: 'flex-start',
                  cursor: 'pointer',
                  opacity: 0.8,
                  borderLeft: `3px solid ${isDark ? '#60a5fa' : '#3b82f6'}`,
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
                    borderRadius: repliedTo.sender_email === currentUserEmail
                      ? '12px 12px 4px 12px'
                      : '12px 12px 12px 4px',
                    padding: '8px 12px',
                    maxWidth: 250,
                    fontSize: 12,
                    color: isDark ? '#000000' : '#ffffff',
                    fontStyle: 'normal',
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                    fontWeight: 400,
                    letterSpacing: 0.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div style={{ 
                    fontSize: 11, 
                    color: isDark ? '#9ca3af' : '#6b7280', 
                    marginBottom: 3,
                    fontWeight: 600 
                  }}>
                    {repliedTo.sender_name}
          </div>
                  {repliedTo.message_text.length > 50 ? repliedTo.message_text.slice(0, 50) + '…' : repliedTo.message_text}
        </div>
      </div>
            )}
            {/* Main message text with link detection */}
            <div style={{ fontSize: '14px', lineHeight: '1.4', fontWeight: '400' }}>
              {(() => {
                // Add null check for message.message_text
                if (!message.message_text || message.message_text.trim() === '') {
                  return <span style={{ fontStyle: 'italic', color: isDark ? '#adb5bd' : '#6c757d' }}>Message text unavailable</span>;
                }
                
                // Improved regex to match URLs (http, https, www, etc.)
                const urlRegex = /((https?:\/\/|www\.)[\w\-._~:/?#[\]@!$&'()*+,;=%]+)(?=\s|$)/gi;
                const parts = [];
                let lastIndex = 0;
                let match;
                while ((match = urlRegex.exec(message.message_text)) !== null) {
                  if (match.index > lastIndex) {
                    parts.push(message.message_text.slice(lastIndex, match.index));
                  }
                  parts.push({ url: match[0] });
                  lastIndex = urlRegex.lastIndex;
                }
                if (lastIndex < message.message_text.length) {
                  parts.push(message.message_text.slice(lastIndex));
                }
                return parts.map((part, i) => {
                  if (typeof part === 'string') {
                    return part ? <span key={i}>{part}</span> : null;
                  } else if (part.url) {
                    let href = part.url;
                    if (!/^https?:\/\//i.test(href)) {
                      href = 'https://' + href;
                    }
                    return (
                      <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', whiteSpace: 'nowrap', overflowWrap: 'anywhere', wordBreak: 'break-all' }}>{part.url}</a>
                    );
                  }
                  return null;
                });
              })()}
            </div>

          </div>

          {/* Sender name and timestamp outside the bubble */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
            marginTop: '4px',
            gap: '2px'
          }}>
            {/* Sender name */}
            {!isCurrentUser && (
              <div style={{
                fontSize: '12px',
                color: isDark ? '#adb5bd' : '#6c757d',
                fontWeight: '500',
                marginBottom: '2px'
              }}>
                {message.sender_name}
              </div>
            )}
            {/* Timestamp and edit indicator */}
            <div style={{
              fontSize: '11px',
              color: isDark ? '#adb5bd' : '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {message.is_edited && (
                <span style={{ 
                  color: isDark ? '#adb5bd' : '#6c757d', 
                  fontStyle: 'italic',
                  fontSize: '10px'
                }}>
                  (edited)
                </span>
              )}
            </div>
          </div>

          {/* At the bottom of the bubble, render emoji+count row */}
          <div style={{
            display: 'flex',
            gap: 4,
            marginTop: 4,
            width: 'auto',
            alignItems: 'center',
          }}>
            {Object.entries(reactions).map(([emoji, info]) => (
              <button
                key={emoji}
                style={{
                  background: info.reacted ? (isDark ? '#404040' : '#e9ecef') : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '2px 8px',
                  fontSize: 15,
                  color: isDark ? '#fff' : '#222',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
                onClick={() => onReact(message, emoji)}
              >
                <span>{emoji}</span>
                <span style={{ fontWeight: 500, marginLeft: 2 }}>{info.count > 1 ? info.count : ''}</span>
              </button>
            ))}
            {/* + button to open emoji picker if you want */}
          </div>

          {/* Action buttons for received messages (left side) */}
          {!isCurrentUser && showActions && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                right: '-80px',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'row',
                gap: '4px',
                background: isDark ? '#2a2a2a' : '#ffffff',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
                border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
                zIndex: 10
              }}
              onMouseEnter={() => {
                setShowActions(true);
                setShowEmojiPicker(false);
              }}
              onMouseLeave={() => {
                setShowActions(false);
                setShowEmojiPicker(false);
              }}
            >
              {/* Reply button */}
              <button
                onClick={() => onReply(message)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '6px',
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
                title="Reply"
              >
                ↺
              </button>
              
              {/* Emoji reaction button */}
              <button
                onClick={() => {
                  // Show emoji picker
                  setShowEmojiPicker(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '6px',
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
                title="React"
              >
                😀
              </button>
            </div>
          )}

          {/* Emoji picker for received messages */}
          {!isCurrentUser && showEmojiPicker && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                right: '-140px',
                transform: 'translateY(-50%)',
                background: isDark ? '#2a2a2a' : '#ffffff',
                borderRadius: '12px',
                padding: '8px',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
                border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
                zIndex: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '4px',
                minWidth: '200px'
              }}
              onMouseEnter={() => {
                setShowEmojiPicker(true);
                setShowActions(true);
              }}
              onMouseLeave={() => {
                setShowEmojiPicker(false);
                setShowActions(false);
              }}
            >
              {emojiList.slice(0, 12).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(message, emoji);
                    setShowEmojiPicker(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '18px',
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
          )}
        </div>

        {/* Avatar for sent messages (right side) */}
        {isCurrentUser && <Avatar name={message.sender_name} avatarUrl={message.avatar_url} isDark={isDark} isCurrentUser={true} />}
      </div>
    </div>
  );
};

// Modern Message Input Component
const MessageInput = ({ onSendMessage, isDark, sending, broadcastTyping, editingMessageId, editText, onSaveEdit, onCancelEdit }: { 
  onSendMessage: (text: string) => void, 
  isDark: boolean,
  sending: boolean,
  broadcastTyping: () => void,
  editingMessageId?: string | null,
  editText?: string,
  onSaveEdit?: (text: string) => void,
  onCancelEdit?: () => void
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😡', '🔥', '💯'];

  // Set text when editing starts
  React.useEffect(() => {
    if (editingMessageId && editText) {
      setText(editText);
    }
  }, [editingMessageId, editText]);

  const handleSend = () => {
    if (text.trim() && !sending) {
      if (editingMessageId && onSaveEdit) {
        onSaveEdit(text);
        setText('');
      } else {
      onSendMessage(text.trim());
      setText('');
      }
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
              background: isDark ? '#404040' : '#e9ecef',
              border: 'none',
              color: isDark ? '#adb5bd' : '#6c757d',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
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

      {/* Main Input Area */}
      <div style={{
        padding: '20px 24px',
        position: 'relative'
      }}>
        {/* Single Input Field */}
        <input
          type="text"
          placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
          value={text}
          onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
          onKeyPress={handleKeyPress}
          disabled={sending}
          style={{
            width: '100%',
            border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
            background: isDark ? '#2a2a2a' : '#f8f9fa',
            color: isDark ? '#ffffff' : '#000000',
            outline: 'none',
            fontSize: '15px',
            padding: '14px 120px 14px 20px',
            borderRadius: '12px',
            boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)',
            position: 'relative',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            opacity: sending ? 0.7 : 1
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

        {/* Icons Container */}
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
            disabled={sending}
            style={{
              background: 'none',
              border: 'none',
              cursor: sending ? 'not-allowed' : 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              opacity: sending ? 0.5 : 1
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

          {/* Send Button */}
          <button 
            onClick={handleSend} 
            disabled={!text.trim() || sending}
            style={{
              background: 'none',
              border: 'none', 
              cursor: (text.trim() && !sending) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              opacity: (text.trim() && !sending) ? 1 : 0.5,
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

export default function GuestChatInterface({ eventId, isDark, guests }: GuestChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Global hover popup state
  const [hoverPopupState, setHoverPopupState] = useState<HoverPopupState>({
    activeMessageId: null,
    position: null,
    message: null,
    hideTimeoutId: null
  });
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineGuests, setOnlineGuests] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactions, setReactions] = useState<{ [messageId: string]: { [emoji: string]: { count: number, reacted: boolean } } }>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('Guest Chat');
  const [typingUsers, setTypingUsers] = useState<{ [email: string]: string }>({});
  const typingTimeouts = useRef<{ [email: string]: number }>({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // 1. Add hover popup state to GuestChatInterface
  const [hoverPopup, setHoverPopup] = useState<{
    message: Message | null;
    position: { x: number; y: number } | null;
    visible: boolean;
  }>({ message: null, position: null, visible: false });

  // 2. Add handler to show/hide popup with proper positioning
  const showHoverPopup = (message: Message, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Popup dimensions
    const popupWidth = 280;
    const popupHeight = 200;
    
    // Position popup below the bubble, centered horizontally
    let x = rect.left + (rect.width / 2) - (popupWidth / 2);
    let y = rect.bottom + 8;
    
    // Ensure popup doesn't go off the right side of screen
    if (x + popupWidth > viewportWidth - 10) {
      x = viewportWidth - popupWidth - 10;
    }
    
    // Ensure popup doesn't go off the left side of screen
    if (x < 10) {
      x = 10;
    }
    
    // If popup would go below screen, position it above the bubble
    if (y + popupHeight > viewportHeight - 10) {
      y = rect.top - popupHeight - 8;
    }
    
    setHoverPopup({
      message,
      position: { x, y },
      visible: true
    });
  };
  const hideHoverPopup = () => setHoverPopup({ message: null, position: null, visible: false });

  // Typing functions
  const broadcastTyping = () => {
    if (!currentUser || !eventId) return;
    
    console.log('[TYPING] broadcastTyping called for:', currentUser.email);
    
    // Clear existing timeout
    if (typingTimeouts.current[currentUser.email]) {
      clearTimeout(typingTimeouts.current[currentUser.email]);
    }
    
    // Broadcast typing status
    const channel = supabase.channel(`typing-${eventId}`);
    console.log('[TYPING] Broadcasting typing event for:', currentUser.email);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        email: currentUser.email,
        name: currentUser.name || currentUser.email,
        isTyping: true
      }
    });
    
    // Set timeout to stop typing
    typingTimeouts.current[currentUser.email] = setTimeout(() => {
      console.log('[TYPING] Stopping typing for:', currentUser.email);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          email: currentUser.email,
          name: currentUser.name || currentUser.email,
          isTyping: false
        }
      });
    }, 3000);
  };

  const stopTyping = () => {
    if (!currentUser || !eventId) return;
    
    if (typingTimeouts.current[currentUser.email]) {
      clearTimeout(typingTimeouts.current[currentUser.email]);
    }
    
    const channel = supabase.channel(`typing-${eventId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        email: currentUser.email,
        name: currentUser.name || currentUser.email,
        isTyping: false
      }
    });
  };

  // Fetch event title
  const fetchEventTitle = async () => {
    try {
      if (!eventId) {
        return;
      }
      
      const { data, error } = await supabase
        .from('events')
        .select('name')
        .eq('id', eventId)
        .single();
      
      if (error) {
        console.error('[GUESTS_CHAT] Error fetching event title:', error);
        return;
      }
      
      if (data && data.name) {
        setEventTitle(data.name);
      }
    } catch (error) {
      console.error('[GUESTS_CHAT] Error fetching event title:', error);
    }
  };

  const colors = themes[isDark ? 'dark' : 'light'];

  // Initialize chat system
  useEffect(() => {
    initializeChat();
  }, [eventId]);

  // Set up typing subscription
  useEffect(() => {
    if (!eventId) return;

    console.log('[TYPING] Setting up typing subscription for eventId:', eventId);
    const channel = supabase.channel(`typing-${eventId}`);
    
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      console.log('[TYPING] Received typing event:', payload);
      const { email, name, isTyping } = payload.payload;
      
      if (isTyping) {
        console.log('[TYPING] User started typing:', email, name);
        setTypingUsers(prev => ({ ...prev, [email]: name }));
      } else {
        console.log('[TYPING] User stopped typing:', email, name);
        setTypingUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[email];
          return newUsers;
        });
      }
    });

    channel.subscribe();

    return () => {
      console.log('[TYPING] Cleaning up typing subscription');
      channel.unsubscribe();
    };
  }, [eventId]);

  // Log typing users changes
  useEffect(() => {
    console.log('[TYPING] Current typing users:', typingUsers);
  }, [typingUsers]);

  // Set up real-time message subscription with enhanced filtering
  useEffect(() => {
    if (!eventId || !currentUser) return;

    console.log('[GUESTS_CHAT] Setting up enhanced real-time subscription for event:', eventId);

    const channel = supabase
      .channel(`guests-chat-enhanced-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guests_chat_messages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          localStorage.setItem('GUESTS_CHAT_REALTIME_LOG', JSON.stringify({
            payload,
            timestamp: new Date().toISOString()
          }));
          console.log('[GUESTS_CHAT] Enhanced real-time message received:', payload);
          console.log('[GUESTS_CHAT] New message details:', payload.new);
          
          // Add new message to existing state instead of reloading all messages
          const newMessage = payload.new as Message;
          
          // Enrich the new message with avatar data
          enrichMessagesWithAvatars([newMessage]).then(enrichedMessages => {
            const enrichedMessage = enrichedMessages[0];
            console.log('[GUESTS_CHAT] Enriched message:', enrichedMessage);
            console.log('[GUESTS_CHAT] Enriched message ID:', enrichedMessage.message_id);
            
            setMessages(prev => {
              console.log('[GUESTS_CHAT] Current messages count:', prev.length);
              // Check if message already exists to avoid duplicates
              const exists = prev.some(msg => msg.message_id === enrichedMessage.message_id);
              console.log('[GUESTS_CHAT] Message already exists:', exists);
              if (exists) {
                console.log('[GUESTS_CHAT] Skipping duplicate message');
                return prev;
              }
              
              // Add new message and sort by created_at
              const updated = [...prev, enrichedMessage];
              const sorted = updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              console.log('[GUESTS_CHAT] Updated messages count:', sorted.length);
              console.log('[GUESTS_CHAT] Added new message via real-time');
              return sorted;
            });
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guests_chat_receipts',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('[GUESTS_CHAT] Enhanced read receipt updated:', payload);
          // Don't reload messages for read receipts - this was causing state overwrites
          // loadMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests_chat_participants',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('[GUESTS_CHAT] Enhanced chat participants updated:', payload);
          // Don't reinitialize chat - this was causing state overwrites
          // initializeChat();
        }
      )
      .subscribe();

    return () => {
      console.log('[GUESTS_CHAT] Cleaning up enhanced real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [eventId, currentUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when user views them
  useEffect(() => {
    if (eventId && currentUser && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [eventId, currentUser, messages]);

  // Fetch reactions for all messages
  useEffect(() => {
    if (!messages.length || !currentUser) return;
    const fetchReactions = async () => {
      const messageIds = messages.map(m => m.message_id);
      const { data, error } = await supabase
        .from('guests_chat_reactions')
        .select('message_id, user_email, emoji')
        .in('message_id', messageIds);
      if (error) return;
      // Group by message and emoji
      const reactionMap: { [messageId: string]: { [emoji: string]: { count: number, reacted: boolean } } } = {};
      for (const m of messages) {
        reactionMap[m.message_id] = {};
      }
      data.forEach((row: any) => {
        if (!reactionMap[row.message_id][row.emoji]) {
          reactionMap[row.message_id][row.emoji] = { count: 0, reacted: false };
        }
        reactionMap[row.message_id][row.emoji].count++;
        if (row.user_email === currentUser.email) {
          reactionMap[row.message_id][row.emoji].reacted = true;
        }
      });
      setReactions(reactionMap);
    };
    fetchReactions();
  }, [messages, currentUser]);

  // Replace old initialization logic with new function
  const initializeChat = async () => {
    try {
      setIsInitializing(true);
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (!user || !eventId) {
        return;
      }

      // Initialize chat participants for this event
      const { error: initError } = await supabase.rpc('initialize_guests_chat', { p_event_id: eventId });
      if (initError) {
        console.error('[GUESTS_CHAT] Error initializing chat:', initError);
      }

      // Load initial messages with the user we just fetched
      await loadMessagesWithUser(user);
      
      // Fetch event title
      await fetchEventTitle();
    } catch (error) {
      console.error('[GUESTS_CHAT] Error initializing chat:', error);
    } finally {
      setIsInitializing(false);
      setLoading(false);
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

  // Load messages with a specific user (for initialization)
  const loadMessagesWithUser = async (user: any) => {
    if (!eventId || !user) {
      return;
    }
    try {
      // First, get the total count of messages to calculate the correct offset
      const { data: countData, error: countError } = await supabase
        .from('guests_chat_messages')
        .select('message_id', { count: 'exact' })
        .eq('event_id', eventId);
      
      if (countError) {
        console.error('[GUESTS_CHAT] Error getting message count:', countError);
        return;
      }
      
      const totalMessages = countData?.length || 0;
      const limit = 100;
      const offset = Math.max(0, totalMessages - limit); // Get the last 100 messages
      
      const { data: messagesData, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: eventId,
        p_user_email: user.email,
        p_limit: limit,
        p_offset: offset,
      });
      
      if (error) {
        console.error('[GUESTS_CHAT] Error loading messages:', error);
        return;
      }
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(messagesData || []);
      
      setMessages(enrichedMessages);
    } catch (error) {
      console.error('[GUESTS_CHAT] Error in loadMessagesWithUser:', error);
    }
  };

  // Load older messages function
  const loadOlderMessages = async () => {
    if (!eventId || !currentUser || loadingOlder || !hasMoreMessages) {
      return;
    }
    
    setLoadingOlder(true);
    try {
      // Get the oldest message timestamp to use as offset
      const oldestMessage = messages[0];
      if (!oldestMessage) {
        setHasMoreMessages(false);
        return;
      }
      
      const { data: messagesData, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: eventId,
        p_user_email: currentUser.email,
        p_limit: 50,
        p_offset: 0,
      });
      
      if (error) {
        console.error('[GUESTS_CHAT] Error loading older messages:', error);
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
      console.error('[GUESTS_CHAT] Error in loadOlderMessages:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Replace old message fetching logic with new function
  const loadMessages = async () => {
    if (!eventId || !currentUser) {
      return;
    }
    try {
      const { data: messagesData, error } = await supabase.rpc('get_guests_chat_messages', {
        p_event_id: eventId,
        p_user_email: currentUser.email,
        p_limit: 100,
        p_offset: 0,
      });
      
      if (error) {
        console.error('[GUESTS_CHAT] Error loading messages:', error);
        return;
      }
      
      // Enrich messages with avatar URLs for admin users
      const enrichedMessages = await enrichMessagesWithAvatars(messagesData || []);
      
      setMessages(enrichedMessages);
    } catch (error) {
      console.error('[GUESTS_CHAT] Error in loadMessages:', error);
    }
  };

  // Replace old message sending logic with new function
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !eventId || !currentUser || sending) return;
    
    // Create optimistic message
    const optimisticMessage: Message = {
      message_id: `temp_${Date.now()}`,
      event_id: eventId,
      sender_name: currentUser.name || currentUser.email,
      sender_type: 'admin',
      sender_email: currentUser.email,
      avatar_url: currentUser.avatar_url,
      message_text: messageText,
      message_type: 'text',
      company_id: currentUser.company_id,
      created_at: new Date().toISOString(),
      reply_to_message_id: replyingTo ? replyingTo.message_id : null,
      is_edited: false,
              edited_at: undefined,
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);
    scrollToBottom();

    try {
      // Use localStorage to persist logs across re-renders
      const logData = {
        timestamp: new Date().toISOString(),
        params: {
          p_event_id: eventId,
          p_sender_email: currentUser.email,
          p_message_text: messageText,
          p_message_type: 'text',
          p_reply_to_message_id: replyingTo ? replyingTo.message_id : null
        }
      };
      localStorage.setItem('GUESTS_CHAT_SEND_LOG', JSON.stringify(logData));
      console.log('[GUESTS_CHAT] Sending message with params:', logData.params);
      
      // Debug authentication state
      const { data: { session } } = await supabase.auth.getSession();
      localStorage.setItem('GUESTS_CHAT_SESSION_LOG', JSON.stringify({ session, currentUser }));
      console.log('[GUESTS_CHAT] Current session:', session);
      console.log('[GUESTS_CHAT] Current user object:', currentUser);
      
      const { data: result, error } = await supabase.rpc('send_guests_chat_message', {
        p_event_id: eventId,
        p_sender_email: currentUser.email,
        p_message_text: messageText,
        p_message_type: 'text',
        p_reply_to_message_id: replyingTo ? replyingTo.message_id : null
      });
      
      localStorage.setItem('GUESTS_CHAT_RESULT_LOG', JSON.stringify({ result, error, timestamp: new Date().toISOString() }));
      console.log('[GUESTS_CHAT] Send result:', result);
      console.log('[GUESTS_CHAT] Send error:', error);
      
      if (error) {
        console.error('[GUESTS_CHAT] Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
        return;
      }

      // Replace optimistic message with real message (EXACTLY like GuestChatAdminScreen)
      if (result && result.length > 0) {
        const realMessage = result[0];
        localStorage.setItem('GUESTS_CHAT_SUCCESS_LOG', JSON.stringify({
          result,
          optimisticMessageId: optimisticMessage.message_id,
          realMessageId: realMessage.message_id,
          timestamp: new Date().toISOString()
        }));
        console.log('[GUESTS_CHAT] Real message from server:', realMessage);
        console.log('[GUESTS_CHAT] Optimistic message ID:', optimisticMessage.message_id);
        console.log('[GUESTS_CHAT] Real message ID:', realMessage.message_id);
        
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
      } else {
        console.log('[GUESTS_CHAT] Send failed:', result);
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
      }
      
      setReplyingTo(null); // clear reply state after sending
    } catch (error) {
      console.error('[GUESTS_CHAT] Error in sendMessage:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
    } finally {
      setSending(false);
    }
  };

  const markMessagesAsRead = async () => {
    // Skip marking messages as read for now - function not implemented
    console.log('[GUESTS_CHAT] Skipping mark as read - function not implemented yet');
  };

  const loadUnreadCount = async () => {
    // Skip loading unread count for now - function not implemented
    console.log('[GUESTS_CHAT] Skipping unread count - function not implemented yet');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
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

    // Messages are already sorted by database in ascending order (oldest first)
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

  const getGuestInfo = (senderName: string, senderType: string, senderEmail: string) => {
    if (senderType === 'admin') {
      return { name: senderName, avatar: null, isOnline: true };
    }

    // Add null check for senderName
    if (!senderName) {
      return { name: 'Unknown User', avatar: null, isOnline: false };
    }

    const guest = guests.find(g => 
      g.email === senderEmail ||
      `${g.first_name} ${g.last_name}` === senderName ||
      (senderName && g.first_name === senderName.split(' ')[0])
    );

    return {
      name: guest ? `${guest.first_name} ${guest.last_name}` : senderName,
      avatar: guest?.avatar,
      isOnline: guest ? onlineGuests.has(guest.id) : false
    };
  };

  useEffect(() => {
    if (eventId && currentUser) {
      loadMessages();
    }
  }, [eventId, currentUser]);

  // Auto-scroll to bottom when messages change or component is focused
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => scrollToBottom(), 100);
    };

    // Scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }

    // Add focus event listeners
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [messages]);



  // Handler for reply action
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Handler for cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Toggle reaction - limit to 1 reaction per user with replace functionality
  const handleReact = async (message: Message, emoji: string) => {
    if (!currentUser) return;
    
    // Check if user already has a reaction on this message
    const existingReaction = reactions[message.message_id] 
      ? Object.entries(reactions[message.message_id]).find(([_, data]) => data.reacted)
      : null;
    
    if (existingReaction) {
      const [existingEmoji, _] = existingReaction;
      
      if (existingEmoji === emoji) {
        // Remove reaction if clicking the same emoji
        await supabase
          .from('guests_chat_reactions')
          .delete()
          .eq('message_id', message.message_id)
          .eq('user_email', currentUser.email)
          .eq('emoji', emoji);
      } else {
        // Replace existing reaction with new one
        await supabase
          .from('guests_chat_reactions')
          .delete()
          .eq('message_id', message.message_id)
          .eq('user_email', currentUser.email);
        
        await supabase
          .from('guests_chat_reactions')
          .insert({
            message_id: message.message_id,
            user_email: currentUser.email,
            emoji
          });
      }
    } else {
      // Add new reaction
      await supabase
        .from('guests_chat_reactions')
        .insert({
          message_id: message.message_id,
          user_email: currentUser.email,
          emoji
        });
    }
    
    // Refetch reactions
    const { data, error } = await supabase
      .from('guests_chat_reactions')
      .select('message_id, user_email, emoji')
      .eq('message_id', message.message_id);
    if (!error) {
      const reactionMap = { ...reactions };
      reactionMap[message.message_id] = {};
      data.forEach((row: any) => {
        if (!reactionMap[message.message_id][row.emoji]) {
          reactionMap[message.message_id][row.emoji] = { count: 0, reacted: false };
        }
        reactionMap[message.message_id][row.emoji].count++;
        if (row.user_email === currentUser.email) {
          reactionMap[message.message_id][row.emoji].reacted = true;
        }
      });
      setReactions(reactionMap);
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  // Edit message state (matching TeamChatPage pattern)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Handle edit message
  const handleEditMessage = (message: Message) => {
    // Prevent editing optimistic messages (messages that haven't been saved to database yet)
    if (message.message_id.startsWith('optimistic-')) {
      alert('Please wait for the message to be sent before editing.');
      return;
    }
    setEditingMessageId(message.message_id);
    setEditText(message.message_text);
    setReplyingTo(null); // Clear any reply state
  };

  // Handle save edit
  const handleSaveEdit = async (text: string) => {
    if (!editingMessageId || !text.trim()) return;
    
    // Prevent editing optimistic messages
    if (editingMessageId.startsWith('optimistic-')) {
      alert('Cannot edit messages that are still being sent.');
      setEditingMessageId(null);
      setEditText('');
      return;
    }
    
    try {
      const { error } = await supabase.rpc('edit_guests_chat_message', {
        p_message_id: editingMessageId,
        p_user_email: currentUser?.email,
        p_new_text: text.trim(),
      });
      
      if (error) {
        console.error('Error editing message:', error);
        alert('Failed to edit message. Please try again.');
        return;
      }
      
      // Update local state with edit status
      setMessages(prev => prev.map(msg => 
        msg.message_id === editingMessageId 
          ? { ...msg, message_text: text.trim(), is_edited: true, edited_at: new Date().toISOString() }
          : msg
      ));
      
      setEditingMessageId(null);
      setEditText('');
      console.log('Message edited successfully');
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Failed to edit message. Please try again.');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Handle delete message
  const handleDeleteMessage = async (message: Message) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const { error } = await supabase.rpc('delete_guests_chat_message', {
        p_message_id: message.message_id,
        p_user_email: currentUser?.email,
      });
      
      if (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message. Please try again.');
        return;
      }
      
      // Update local state
      setMessages(prev => prev.filter(msg => msg.message_id !== message.message_id));
      
      console.log('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  if (isInitializing || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        color: isDark ? '#aaa' : '#666'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid', 
            borderColor: isDark ? '#444' : '#ddd',
            borderTopColor: isDark ? '#60a5fa' : '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div>Loading chat...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bg,
      minWidth: 0,
      maxWidth: '100%',
      overflowX: 'hidden',
      position: 'relative',
      margin: 0,
      padding: 0
    }}>
      <style>
        {`
          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.4;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
        `}
      </style>


      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '100%'
        }}
      >
        {/* Load Older Messages Button */}
        {messages.length > 0 && hasMoreMessages && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0'
          }}>
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              style={{
                background: isDark ? '#374151' : '#f3f4f6',
                color: isDark ? '#d1d5db' : '#374151',
                border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loadingOlder ? 'not-allowed' : 'pointer',
                opacity: loadingOlder ? 0.6 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loadingOlder) {
                  e.currentTarget.style.background = isDark ? '#4b5563' : '#e5e7eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!loadingOlder) {
                  e.currentTarget.style.background = isDark ? '#374151' : '#f3f4f6';
                }
              }}
            >
              {loadingOlder ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: `2px solid ${isDark ? '#d1d5db' : '#374151'}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading...
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  Load Older Messages
                </>
              )}
            </button>
          </div>
        )}
        {messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: colors.textSecondary,
            minHeight: '200px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>💬</div>
            <h3 style={{
              margin: '0 0 6px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.text
            }}>
              No messages yet
            </h3>
            <p style={{
              fontSize: '14px',
              margin: 0,
              color: colors.textSecondary,
              opacity: 0.8
            }}>
              Start a conversation with your guests
            </p>
          </div>
        ) : (
          getMessageGroups().map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div style={{
                textAlign: 'center',
                margin: '16px 0',
                position: 'relative'
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: colors.hoverBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: colors.textSecondary,
                  backdropFilter: 'blur(10px)'
                }}>
                  {group.date}
                </div>
              </div>

              {/* Messages for this date */}
              {group.messages.map((message, messageIndex) => {
                const guestInfo = getGuestInfo(message.sender_name, message.sender_type, message.sender_email);
                const isFromAdmin = message.sender_type === 'admin';
                const isCurrentUser = isFromAdmin && currentUser && 
                  message.sender_email === currentUser.email;

                return (
                  <MessageBubble
                    key={message.message_id}
                    message={message}
                    isDark={isDark}
                    currentUserEmail={currentUser?.email || null}
                    onReply={handleReply}
                    onReact={handleReact}
                    messages={messages}
                    reactions={reactions[message.message_id] || {}}
                    highlightedMessageId={highlightedMessageId}
                    handleJumpToMessage={handleJumpToMessage}
                    onShowHover={showHoverPopup}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        
        {/* Typing Indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div style={{
            padding: '8px 24px',
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderTop: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              gap: '4px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isDark ? '#10b981' : '#22c55e',
                animation: 'typing 1.4s infinite'
              }} />
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isDark ? '#10b981' : '#22c55e',
                animation: 'typing 1.4s infinite 0.2s'
              }} />
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isDark ? '#10b981' : '#22c55e',
                animation: 'typing 1.4s infinite 0.4s'
              }} />
            </div>
            <span style={{
              fontSize: '14px',
              color: isDark ? '#adb5bd' : '#6c757d',
              fontStyle: 'italic'
            }}>
              {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>

      {/* Message Input */}
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
              Replying to {replyingTo.sender_name}:
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
                {replyingTo.message_text}
              </span>
            </div>
          </div>
          <button
            onClick={handleCancelReply}
            style={{
              background: isDark ? '#404040' : '#e9ecef',
              border: 'none',
              color: isDark ? '#adb5bd' : '#6c757d',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
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
        </div>
      )}



      <MessageInput
        onSendMessage={sendMessage}
        isDark={isDark}
        sending={sending}
        broadcastTyping={broadcastTyping}
        editingMessageId={editingMessageId}
        editText={editText}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
      />

      {/* Enhanced Global Hover Popup - matches TeamChatPage functionality */}
      {hoverPopup.visible && hoverPopup.position && hoverPopup.message && (
        <div
          className="hover-popup"
          style={{
            position: 'fixed',
            top: hoverPopup.position.y,
            left: hoverPopup.position.x,
            background: isDark ? '#2a2a2a' : '#ffffff',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
            border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            width: '280px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
          onMouseEnter={() => setHoverPopup((prev) => ({ ...prev, visible: true }))}
          onMouseLeave={hideHoverPopup}
        >
          {/* X Close Button */}
          <button
            onClick={hideHoverPopup}
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
            {['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🙏', '🔥', '💯', '✨', '💪', '🤔', '😎', '🥳', '😴', '🤯', '😍', '🤩', '😭', '🤬', '🤮', '🤧', '🤠', '👻', '🤖', '👽', '👾', '🤡', '👹', '👺', '💀', '☠️'].map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  handleReact(hoverPopup.message!, emoji);
                  hideHoverPopup();
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
                handleReply(hoverPopup.message!);
                hideHoverPopup();
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
            {/* Only show Edit/Delete for current user's messages */}
            {hoverPopup.message.sender_email === currentUser?.email && (
              <>
                <button
                  onClick={() => {
                    handleEditMessage(hoverPopup.message!);
                    hideHoverPopup();
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
                    handleDeleteMessage(hoverPopup.message!);
                    hideHoverPopup();
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
              </>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}