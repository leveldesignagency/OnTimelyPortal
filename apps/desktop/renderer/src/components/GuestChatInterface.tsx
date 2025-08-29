import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import TimelineModuleChatItem from './TimelineModuleChatItem';

// Import announcement types and service
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
  attachment_url?: string | null;
  attachment_filename?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
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
const MessageBubble = ({ message, isDark, currentUserEmail, onReply, onReact, messages, reactions, highlightedMessageId, handleJumpToMessage, onShowHover, isDeleteMode, isSelected, onToggleSelection }: { 
  message: Message, 
  isDark: boolean,
  currentUserEmail: string | null,
  onReply: (message: Message) => void,
  onReact: (message: Message, emoji: string) => void,
  messages: Message[],
  reactions: { [emoji: string]: { count: number, reacted: boolean } },
  highlightedMessageId: string | null,
  handleJumpToMessage: (messageId: string) => void,
  onShowHover?: (message: Message, event: React.MouseEvent) => void,
  isDeleteMode?: boolean,
  isSelected?: boolean,
  onToggleSelection?: (messageId: string) => void
}) => {
  const colors = themes[isDark ? 'dark' : 'light'];
  const isCurrentUser = currentUserEmail && message.sender_email === currentUserEmail;
  

  
      // console.log(`[AVATAR DEBUG] Message from ${message.sender_email}, current user: ${currentUserEmail}, isCurrentUser: ${isCurrentUser}, avatar_url: ${message.avatar_url}, sender_type: ${message.sender_type}`);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hideActionsTimeout, setHideActionsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const iconList = [
    { id: 'thumbs-up', icon: '👍', name: 'Like' },
    { id: 'heart', icon: '❤️', name: 'Love' },
    { id: 'laugh', icon: '😂', name: 'Laugh' },
    { id: 'wow', icon: '😮', name: 'Wow' },
    { id: 'sad', icon: '😢', name: 'Sad' },
    { id: 'angry', icon: '😡', name: 'Angry' },
    { id: 'party', icon: '🎉', name: 'Party' },
    { id: 'clap', icon: '👏', name: 'Clap' },
    { id: 'pray', icon: '🙏', name: 'Pray' },
    { id: 'fire', icon: '🔥', name: 'Fire' },
    { id: 'hundred', icon: '💯', name: '100' },
    { id: 'sparkle', icon: '✨', name: 'Sparkle' },
    { id: 'muscle', icon: '💪', name: 'Muscle' },
    { id: 'think', icon: '🤔', name: 'Think' },
    { id: 'cool', icon: '😎', name: 'Cool' },
    { id: 'celebration', icon: '🥳', name: 'Celebration' },
    { id: 'sleep', icon: '😴', name: 'Sleep' },
    { id: 'mind-blown', icon: '🤯', name: 'Mind Blown' },
    { id: 'love-eyes', icon: '😍', name: 'Love Eyes' },
    { id: 'star-struck', icon: '🤩', name: 'Star Struck' },
    { id: 'cry', icon: '😭', name: 'Cry' },
    { id: 'rage', icon: '🤬', name: 'Rage' },
    { id: 'vomit', icon: '🤮', name: 'Vomit' },
    { id: 'sick', icon: '🤧', name: 'Sick' },
    { id: 'cowboy', icon: '🤠', name: 'Cowboy' },
    { id: 'ghost', icon: '👻', name: 'Ghost' },
    { id: 'robot', icon: '🤖', name: 'Robot' },
    { id: 'alien', icon: '👽', name: 'Alien' },
    { id: 'game', icon: '👾', name: 'Game' },
    { id: 'clown', icon: '🤡', name: 'Clown' },
    { id: 'ogre', icon: '👹', name: 'Ogre' },
    { id: 'goblin', icon: '👺', name: 'Goblin' },
    { id: 'skull', icon: '💀', name: 'Skull' },
    { id: 'skull-bones', icon: '☠️', name: 'Skull Bones' }
  ];

  const clearHideActionsTimeout = () => {
    if (hideActionsTimeout) {
      clearTimeout(hideActionsTimeout);
      setHideActionsTimeout(null);
    }
  };

  const delayedHideActions = () => {
    clearHideActionsTimeout();
    const timeout = setTimeout(() => {
      setShowActions(false);
      setShowEmojiPicker(false);
    }, 1000); // 1 second delay
    setHideActionsTimeout(timeout);
  };

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
      onMouseEnter={() => {
        clearHideActionsTimeout();
        setShowActions(true);
      }}
      onMouseLeave={delayedHideActions}
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
      {/* Checkmark for delete mode */}
      {isDeleteMode && isCurrentUser && (
        <div
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: '8px',
            marginTop: '4px',
            cursor: 'pointer',
            borderRadius: '50%',
            background: isSelected ? '#00bfa5' : 'transparent',
            border: `2px solid ${isSelected ? '#00bfa5' : '#666'}`,
            transition: 'all 0.2s ease'
          }}
          onClick={() => onToggleSelection?.(message.message_id)}
        >
          <span style={{
            fontSize: '16px',
            color: isSelected ? '#fff' : '#666',
            fontWeight: 'bold'
          }}>
            {isSelected ? '●' : '○'}
          </span>
        </div>
      )}

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
            onMouseEnter={() => {
              clearHideActionsTimeout();
              setShowActions(true);
            }}
            onMouseLeave={delayedHideActions}
            onClick={(e) => {
              if (isCurrentUser) {
                e.stopPropagation();
                if (isDeleteMode) {
                  onToggleSelection?.(message.message_id);
                } else {
                  onShowHover?.(message, e);
                }
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
                  borderLeft: `3px solid ${repliedTo.sender_email === currentUserEmail ? '#00bfa5' : (isDark ? '#ffffff' : '#000000')}`,
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
                    color: isDark ? '#00bfa5' : '#000000', 
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

            {/* Attachment Display */}
            {message.attachment_url && (
              <div style={{
                marginTop: '8px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }}>
                {message.attachment_type?.startsWith('image/') ? (
                  <img 
                    src={message.attachment_url}
                    alt={message.attachment_filename || 'Image attachment'}
                    style={{
                      maxWidth: '300px',
                      maxHeight: '200px',
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(message.attachment_url, '_blank')}
                  />
                ) : message.attachment_type?.startsWith('video/') ? (
                  <video 
                    src={message.attachment_url}
                    controls
                    style={{
                      maxWidth: '300px',
                      maxHeight: '200px',
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(message.attachment_url, '_blank')}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: isDark ? '#404040' : '#dee2e6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}>
                      📎
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isCurrentUser ? '#ffffff' : (isDark ? '#ffffff' : '#000000')
                      }}>
                        {message.attachment_filename}
                      </div>
                      {message.attachment_size && (
                        <div style={{ 
                          fontSize: '12px',
                          color: isCurrentUser ? 'rgba(255,255,255,0.8)' : (isDark ? '#adb5bd' : '#6c757d')
                        }}>
                          {(message.attachment_size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            {(() => {
              const reactionEntries = Object.entries(reactions);
              const visibleReactions = reactionEntries.slice(0, 4);
              const hiddenReactions = reactionEntries.slice(4);
              
              return (
                <>
                  {visibleReactions.map(([emoji, info]) => (
                    <div
                      key={emoji}
                      style={{
                        background: info.reacted ? (isDark ? '#22c55e' : '#22c55e') : (isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)'),
                        border: 'none',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontSize: 15,
                        color: info.reacted ? '#ffffff' : (isDark ? '#22c55e' : '#22c55e'),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <span>{emoji}</span>
                      <span style={{ fontWeight: 500, marginLeft: 2 }}>{info.count > 1 ? info.count : ''}</span>
                    </div>
                  ))}
                  {hiddenReactions.length > 0 && (
                    <button
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontSize: 12,
                        color: isDark ? '#adb5bd' : '#6c757d',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={`${hiddenReactions.length} more reactions`}
                    >
                      +{hiddenReactions.length}
                    </button>
                  )}
                </>
              );
            })()}
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
                clearHideActionsTimeout();
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
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
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
                <img 
                  src="/svg/smiley-svgrepo-com.svg" 
                  alt="emoji"
                  width={16}
                  height={16}
                  style={{ filter: isDark ? 'invert(1)' : 'brightness(0)' }}
                />
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
                          {iconList.slice(0, 12).map((iconItem) => (
              <button
                key={iconItem.id}
                onClick={() => {
                  onReact(message, iconItem.icon);
                  setShowEmojiPicker(false);
                }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDark ? '#404040' : '#f8f9fa';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{iconItem.icon}</span>
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
  onSendMessage: (text: string, attachment?: any) => void,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const commonIcons = [
    { id: 'smile', icon: '😀', name: 'Smile' },
    { id: 'laugh', icon: '😂', name: 'Laugh' },
    { id: 'love-eyes', icon: '😍', name: 'Love Eyes' },
    { id: 'think', icon: '🤔', name: 'Think' },
    { id: 'thumbs-up', icon: '👍', name: 'Like' },
    { id: 'thumbs-down', icon: '👎', name: 'Dislike' },
    { id: 'heart', icon: '❤️', name: 'Love' },
    { id: 'party', icon: '🎉', name: 'Party' },
    { id: 'sad', icon: '😢', name: 'Sad' },
    { id: 'angry', icon: '😡', name: 'Angry' },
    { id: 'fire', icon: '🔥', name: 'Fire' },
    { id: 'hundred', icon: '💯', name: '100' }
  ];

  // Set text when editing starts
  React.useEffect(() => {
    if (editingMessageId && editText) {
      setText(editText);
    }
  }, [editingMessageId, editText]);

  const handleSend = async () => {
    if ((text.trim() || selectedFile) && !sending && !uploading) {
      if (editingMessageId && onSaveEdit) {
        onSaveEdit(text);
        setText('');
      } else {
        let attachment = null;
        
        // Upload file if selected
        if (selectedFile) {
          setUploading(true);
          try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-attachments')
              .upload(filePath, selectedFile, {
                cacheControl: '3600',
                upsert: false
              });
              
            if (uploadError) {
              console.error('Upload error:', uploadError);
              alert('Failed to upload file. Please try again.');
              setUploading(false);
              return;
            }
            
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('chat-attachments')
              .getPublicUrl(filePath);
              
            attachment = {
              url: urlData.publicUrl,
              filename: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size
            };
            
          } catch (error) {
            console.error('File upload failed:', error);
            alert('Failed to upload file. Please try again.');
            setUploading(false);
            return;
          }
          setUploading(false);
        }
        
        onSendMessage(text.trim() || 'Attachment', attachment);
        setText('');
        setSelectedFile(null);
      }
    }
  };
  
  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          alert('File size must be less than 10MB');
          return;
        }
        setSelectedFile(file);
      }
    };
    input.click();
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
                      {commonIcons.map((iconItem) => (
              <button
                key={iconItem.id}
                onClick={() => handleEmojiSelect(iconItem.icon)}
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
              {iconItem.icon}
            </button>
          ))}
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div style={{
          padding: '12px 24px',
          background: isDark ? '#2a2a2a' : '#f1f3f4',
          borderBottom: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: isDark ? '#404040' : '#dee2e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            📎
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              color: isDark ? '#ffffff' : '#000000',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {selectedFile.name}
            </div>
            <div style={{ 
              color: isDark ? '#888888' : '#666666',
              fontSize: '12px'
            }}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#888888' : '#666666',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Input Area */}
      <div style={{
        padding: '20px 24px',
        position: 'relative'
      }}>
        {/* Single Input Field (now a textarea) */}
        <textarea
          placeholder={editingMessageId ? "Edit your message..." : selectedFile ? "Add a caption (optional)..." : "Type a message..."}
          value={text}
          onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
          onKeyDown={handleKeyPress}
          disabled={sending || uploading}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
          style={{
            width: '100%',
            border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
            background: isDark ? '#2a2a2a' : '#f8f9fa',
            color: isDark ? '#ffffff' : '#000000',
            outline: 'none',
            fontSize: '15px',
            lineHeight: '20px',
            padding: '14px 150px 14px 20px',
            borderRadius: '12px',
            position: 'relative',
            transition: 'border-color 0.2s ease',
            resize: 'none',
            overflowY: 'auto',
            maxHeight: '120px',
            opacity: (sending || uploading) ? 0.7 : 1
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = isDark ? '#ffffff' : '#007bff';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = isDark ? '#404040' : '#dee2e6';
          }}
        />

        {/* Icons Container */}
        <div style={{
          position: 'absolute',
          right: '44px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none'
        }}>
          {/* Attachment Button */}
          <button
            onClick={handleFileSelect}
            disabled={sending || uploading}
            style={{
              background: 'none',
              border: 'none',
              cursor: (sending || uploading) ? 'not-allowed' : 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              opacity: (sending || uploading) ? 0.5 : 1,
              boxShadow: 'none',
              outline: 'none'
            }}
            title="Attach file"
          >
            <img 
              src="/svg/paper-clip-svgrepo-com.svg" 
              alt="attach"
              width={18}
              height={18}
              style={{ 
                filter: isDark ? 'invert(1)' : 'brightness(0)'
              }}
            />
          </button>

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
              opacity: sending ? 0.5 : 1,
              boxShadow: 'none',
              outline: 'none'
            }}
          >
            <img 
              src="/svg/smiley-svgrepo-com.svg" 
              alt="emoji"
              width={18}
              height={18}
              style={{ 
                filter: isDark ? 'invert(1)' : 'brightness(0)'
              }}
            />
          </button>

          {/* Send Button */}
          <button 
            onClick={handleSend} 
            disabled={(!text.trim() && !selectedFile) || sending || uploading}
            style={{
              background: 'none',
              border: 'none', 
              cursor: ((text.trim() || selectedFile) && !sending && !uploading) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              opacity: ((text.trim() || selectedFile) && !sending && !uploading) ? 1 : 0.5,
              pointerEvents: 'auto',
              boxShadow: 'none',
              outline: 'none'
            }}
          >
            {uploading ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: `2px solid ${isDark ? '#666' : '#ccc'}`,
                borderTop: `2px solid ${isDark ? '#fff' : '#000'}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <img 
                src="/svg/send-1-svgrepo-com.svg" 
                alt="send"
                width={18}
                height={18}
                style={{ 
                  filter: isDark ? 'invert(1)' : 'brightness(0)'
                }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GuestChatInterface({ eventId, isDark, guests }: GuestChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
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
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const reactionsFetched = useRef<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set());
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [showModuleResponse, setShowModuleResponse] = useState(false);
  const [hasSubmittedMap, setHasSubmittedMap] = useState<Record<string, boolean>>({});
  const [moduleAnswerState, setModuleAnswerState] = useState<{ rating?: number; text?: string; option?: string; mediaUrl?: string; submitting?: boolean; comment?: string; file?: File | null; filePreviewUrl?: string | null }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const starBarRef = useRef<HTMLDivElement | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // 1. Add hover popup state to GuestChatInterface
  const [hoverPopup, setHoverPopup] = useState<{
    message: Message | null;
    position: { x: number; y: number } | null;
    visible: boolean;
    hideTimeoutId: number | null;
  }>({ message: null, position: null, visible: false, hideTimeoutId: null });

  // 2. Add handler to show/hide popup with proper positioning
  const showHoverPopup = (message: Message, event: React.MouseEvent) => {
    // Clear any existing timeout
    if (hoverPopup.hideTimeoutId) {
      clearTimeout(hoverPopup.hideTimeoutId);
    }

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
      visible: true,
      hideTimeoutId: null
    });
  };

  const hideHoverPopup = () => {
    // Clear any existing timeout first
    if (hoverPopup.hideTimeoutId) {
      clearTimeout(hoverPopup.hideTimeoutId);
    }
    
    // Set a 10-second delay before hiding
    const timeoutId = window.setTimeout(() => {
      setHoverPopup({
        message: null,
        position: null,
        visible: false,
        hideTimeoutId: null
      });
    }, 10000);
    
    setHoverPopup(prev => ({
      ...prev,
      hideTimeoutId: timeoutId
    }));
  };

  const clearHoverTimeout = () => {
    setHoverPopup(prev => {
      if (prev.hideTimeoutId) {
        clearTimeout(prev.hideTimeoutId);
        return {
          ...prev,
          hideTimeoutId: null
        };
      }
      return prev;
    });
  };

  const closeHoverPopup = () => {
    setHoverPopup(prev => {
      if (prev.hideTimeoutId) {
        clearTimeout(prev.hideTimeoutId);
      }
      return {
        message: null,
        position: null,
        visible: false,
        hideTimeoutId: null
      };
    });
  };

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

  // Cleanup hover popup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverPopup.hideTimeoutId) {
        clearTimeout(hoverPopup.hideTimeoutId);
      }
    };
  }, [hoverPopup.hideTimeoutId]);

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

    
    

    const channel = supabase
      .channel(`guests-chat-enhanced-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests_chat_messages',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          localStorage.setItem('GUESTS_CHAT_REALTIME_LOG', JSON.stringify({
            payload,
            timestamp: new Date().toISOString()
          }));
          
          
          if (payload.eventType === 'DELETE') {
            // Remove deleted message
            setMessages(prev => {
              const filtered = prev.filter(msg => msg.message_id !== payload.old.message_id);
              
              return filtered;
            });
  
          } else if (payload.eventType === 'UPDATE') {
            // Update existing message
            setMessages(prev => prev.map(msg => 
              msg.message_id === payload.new.message_id 
                ? { ...msg, ...payload.new }
                : msg
            ));
  
          } else if (payload.eventType === 'INSERT') {
  
            
            // Add new message to existing state instead of reloading all messages
            const newMessage = payload.new as Message;
            
            // Enrich the new message with avatar data
            enrichMessagesWithAvatars([newMessage]).then(enrichedMessages => {
              const enrichedMessage = enrichedMessages[0];
              
              
              setMessages(prev => {
      
                // Check if message already exists to avoid duplicates
                const exists = prev.some(msg => msg.message_id === enrichedMessage.message_id);
      
                if (exists) {
      
                  return prev;
                }
                
                // Add new message and sort by created_at
                const updated = [...prev, enrichedMessage];
                const sorted = updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                
                return sorted;
              });
            });
          }
        }
      )
              .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guests_chat_reactions',
          },
          (payload) => {
            const maybeNew = (payload as any).new as { message_id?: string } | undefined;
            const maybeOld = (payload as any).old as { message_id?: string } | undefined;
            console.log('[REACTION REALTIME] Reaction change detected:', payload.eventType, 'for message:', maybeNew?.message_id || maybeOld?.message_id);
            
            // Update reactions state directly based on the specific change
            setReactions(prevReactions => {
              const newReactions = { ...prevReactions };
              const messageId = maybeNew?.message_id || maybeOld?.message_id;
              
              if (!messageId) return prevReactions;
              
              // Ensure message exists in reactions
              if (!newReactions[messageId]) {
                newReactions[messageId] = {};
              }
              
              if (payload.eventType === 'INSERT') {
                // Add new reaction
                const { emoji, user_email } = payload.new;
                if (!newReactions[messageId][emoji]) {
                  newReactions[messageId][emoji] = { count: 0, reacted: false };
                }
                newReactions[messageId][emoji].count++;
                if (user_email === currentUser?.email) {
                  newReactions[messageId][emoji].reacted = true;
                }
                console.log('[REACTION REALTIME] Added reaction:', emoji, 'to message:', messageId.substring(0, 8));
              } else if (payload.eventType === 'DELETE') {
                // Remove reaction
                const { emoji, user_email } = payload.old;
                if (newReactions[messageId][emoji]) {
                  newReactions[messageId][emoji].count--;
                  if (user_email === currentUser?.email) {
                    newReactions[messageId][emoji].reacted = false;
                  }
                  // Remove emoji if count reaches 0
                  if (newReactions[messageId][emoji].count <= 0) {
                    delete newReactions[messageId][emoji];
                  }
                }
                console.log('[REACTION REALTIME] Removed reaction:', emoji, 'from message:', messageId.substring(0, 8));
              } else if (payload.eventType === 'UPDATE') {
                // Handle reaction update (emoji change)
                const newEmoji = payload.new?.emoji;
                const user_email = payload.new?.user_email;
                
                // For UPDATE events, we need to clear ALL existing reactions for this user
                // and then add the new one (since we can't reliably get the old emoji)
                if (user_email === currentUser?.email) {
                  // Remove all existing reactions for current user on this message
                  Object.keys(newReactions[messageId]).forEach(emoji => {
                    if (newReactions[messageId][emoji].reacted) {
                      newReactions[messageId][emoji].count--;
                      newReactions[messageId][emoji].reacted = false;
                      if (newReactions[messageId][emoji].count <= 0) {
                        delete newReactions[messageId][emoji];
                      }
                    }
                  });
                }
                // Note: For other users' updates, we just add the new emoji
                // Any stale emoji counts will be corrected on next message load
                
                // Add new emoji
                if (newEmoji) {
                  if (!newReactions[messageId][newEmoji]) {
                    newReactions[messageId][newEmoji] = { count: 0, reacted: false };
                  }
                  newReactions[messageId][newEmoji].count++;
                  if (user_email === currentUser?.email) {
                    newReactions[messageId][newEmoji].reacted = true;
                  }
                }
                console.log('[REACTION REALTIME] Updated reaction to:', newEmoji, 'for message:', messageId.substring(0, 8));
              }
              
              return newReactions;
            });
          }
        )
      .subscribe();

    return () => {

      channel.unsubscribe();
    };
  }, [eventId, currentUser, messages.length]);

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

  // Load reactions from database when messages change
  useEffect(() => {
    if (!messages.length || !currentUser || !eventId) return;
    
    const fetchReactions = async () => {
      // Filter out temp message IDs to avoid UUID errors
      const messageIds = messages
        .map(m => m.message_id)
        .filter(id => !id.startsWith('temp-'));
      
      if (messageIds.length === 0) return;
      
      // Direct table access with JWT authentication (this was working before)
      const { data, error } = await supabase
        .from('guests_chat_reactions')
        .select('*')
        .eq('event_id', eventId)
        .in('message_id', messageIds);
      
      if (error) {
        console.error('[GUESTS_CHAT] Error fetching reactions:', error);
        return;
      }
      
      // Group by message and emoji
      const reactionMap: { [messageId: string]: { [emoji: string]: { count: number, reacted: boolean } } } = {};
      
      // Initialize empty reaction objects for all current messages
      for (const m of messages) {
        reactionMap[m.message_id] = {};
      }
      
      if (data) {
        data.forEach((row: any) => {
          if (!reactionMap[row.message_id]) {
            reactionMap[row.message_id] = {};
          }
          if (!reactionMap[row.message_id][row.emoji]) {
            reactionMap[row.message_id][row.emoji] = { count: 0, reacted: false };
          }
          reactionMap[row.message_id][row.emoji].count++;
          if (row.user_email === currentUser.email) {
            reactionMap[row.message_id][row.emoji].reacted = true;
          }
        });
      }
      console.log('[REACTION FIX] Initial reactions loaded. Message count:', Object.keys(reactionMap).length, 'Total reactions:', Object.values(reactionMap).reduce((sum, msgReactions) => sum + Object.keys(msgReactions).length, 0));
      console.log('[REACTION FIX] Sample reaction data:', Object.keys(reactionMap).slice(0, 3).map(msgId => ({ msgId: msgId.substring(0, 8), reactions: reactionMap[msgId] })));
      console.log('[REACTION FIX] Raw data that was processed:', data?.slice(0, 3).map(row => ({ msgId: row.message_id.substring(0, 8), emoji: row.emoji, userEmail: row.user_email })));
      console.log('[REACTION FIX] First 3 current message IDs:', messages.slice(0, 3).map(m => m.message_id.substring(0, 8)));
      setReactions(reactionMap);
    };
    
    // Always fetch reactions when messages change - real-time subscription handles updates for new reactions
    if (messages.length > 0) {
      fetchReactions();
    }
  }, [messages, currentUser, eventId]); // Don't include reactions to prevent race condition

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
    // Create a deep copy of messages to preserve all original fields
    const enrichedMessages = messages.map(msg => ({
      ...msg, // Preserve ALL original fields including reply_to_message_id
      avatar_url: msg.avatar_url // Keep existing avatar_url if present
    }));
    
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
    setIsLoadingOlderMessages(true); // Set flag to prevent auto-scroll
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
      setIsLoadingOlderMessages(false); // Reset flag to allow auto-scroll
    }
  };

  // Load announcements for the event
  const loadAnnouncements = async () => {
    try {
      console.log('[ANNOUNCEMENTS] Loading announcements for eventId:', eventId);
      
      const { data, error } = await supabase.rpc('get_guest_announcements', {
        p_event_id: eventId
      });

      if (error) {
        console.error('[ANNOUNCEMENTS] RPC error:', error);
        return;
      }
      
      console.log('[ANNOUNCEMENTS] Raw announcements data:', data);
      setAnnouncements(data || []);
      console.log('[ANNOUNCEMENTS] Loaded announcements:', data?.length || 0);
    } catch (error) {
      console.error('[ANNOUNCEMENTS] Error loading announcements:', error);
    }
  };

  // Load timeline modules for the event
  const loadModules = async () => {
    try {
      console.log('[MODULES] Loading timeline modules for eventId:', eventId);
      
      // Load all modules for the event (admin view)
      const { data, error } = await supabase
        .from('timeline_modules')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MODULES] Error loading timeline modules:', error);
      } else {
        console.log('[MODULES] Loaded timeline modules:', data);
        setModules(data || []);
      }
    } catch (error) {
      console.error('[MODULES] Error loading timeline modules:', error);
    }
  };

  // Setup real-time subscription for announcements
  const setupAnnouncementsSubscription = () => {
    try {
      console.log('[ANNOUNCEMENTS] Setting up subscription for eventId:', eventId);
      
      const subscription = supabase
        .channel(`announcements-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements',
          },
          (payload) => {
            console.log('[ANNOUNCEMENTS] Received real-time announcement:', payload);
            const newAnnouncement = payload.new as Announcement;
            
            // Only process announcements for this specific event
            if (newAnnouncement.event_id === eventId) {
              console.log('[ANNOUNCEMENTS] Announcement matches eventId:', eventId);
              setAnnouncements(prev => [...prev, newAnnouncement]);
            }
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      console.error('[ANNOUNCEMENTS] Error setting up subscription:', error);
      return null;
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
  const sendMessage = async (messageText: string, attachment?: any) => {
    if ((!messageText.trim() && !attachment) || !eventId || !currentUser || sending) return;
    
    // Create optimistic message
    const optimisticMessage: Message = {
      message_id: `temp-${Date.now()}`,
      event_id: eventId,
      sender_name: currentUser.name || currentUser.email,
      sender_type: 'admin',
      sender_email: currentUser.email,
      avatar_url: currentUser.avatar_url,
      message_text: messageText || (attachment ? '📎 Attachment' : ''),
      message_type: attachment ? 'attachment' : 'text',
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

      
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: result, error } = await supabase.rpc('send_guests_chat_message', {
        p_event_id: eventId,
        p_sender_email: currentUser.email,
        p_message_text: messageText || (attachment ? '📎 Attachment' : ''),
        p_message_type: attachment ? 'attachment' : 'text',
        p_reply_to_message_id: replyingTo ? replyingTo.message_id : null
      });
      

      

      

      
      if (error) {
        console.error('[GUESTS_CHAT] Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
        return;
      }

      // Replace optimistic message with real message (EXACTLY like GuestChatAdminScreen)
      if (result && result.length > 0) {
        const realMessage = result[0];
        
        // Add attachment to the separate table if we have one
        if (attachment) {
          try {
            await supabase.rpc('add_message_attachment', {
              p_message_id: realMessage.message_id,
              p_file_url: attachment.url,
              p_filename: attachment.filename,
              p_file_type: attachment.type,
              p_file_size: attachment.size
            });
          } catch (attachmentError) {
            console.error('Error adding attachment:', attachmentError);
            // Don't fail the message send if attachment fails
          }
        }
        
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

  };

  const loadUnreadCount = async () => {
    // Skip loading unread count for now - function not implemented

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
    const groups: { date: string; messages: Message[]; announcements: Announcement[]; modules: any[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];
    let currentAnnouncements: Announcement[] = [];
    let currentModules: any[] = [];

    // Combine messages, announcements, and modules, then sort by timestamp
    const allItems = [
      ...messages.map(msg => ({ ...msg, type: 'message' as const })),
      ...announcements.map(ann => ({ ...ann, type: 'announcement' as const })),
      ...modules.map(module => ({ ...module, type: 'module' as const }))
    ];
    
    const sortedItems = allItems.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return aTime - bTime;
    });



    // Group by date - but include ALL items in chronological order
    sortedItems.forEach(item => {
      const itemDate = formatDate(item.created_at);
      
      if (item.type === 'announcement') {

      } else if (item.type === 'module') {

      }
      
      if (itemDate !== currentDate) {
        if (currentGroup.length > 0 || currentAnnouncements.length > 0 || currentModules.length > 0) {
    
          groups.push({ date: currentDate, messages: currentGroup, announcements: currentAnnouncements, modules: currentModules });
        }
        currentDate = itemDate;
        currentGroup = [];
        currentAnnouncements = [];
        currentModules = [];
      }
      
      if (item.type === 'message') {
        currentGroup.push(item);
      } else if (item.type === 'announcement') {
        currentAnnouncements.push(item);
      } else if (item.type === 'module') {
        currentModules.push(item);
      }
    });

    if (currentGroup.length > 0 || currentAnnouncements.length > 0 || currentModules.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup, announcements: currentAnnouncements, modules: currentModules });
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
      loadAnnouncements();
      loadModules();
      setupAnnouncementsSubscription();
    }
  }, [eventId, currentUser]);

  // Auto-scroll to bottom when messages change or component is focused
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => scrollToBottom(), 100);
    };

    // Scroll to bottom when messages change, but not when loading older messages
    if (messages.length > 0 && !isLoadingOlderMessages) {
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
  }, [messages, isLoadingOlderMessages]);



  // Handler for reply action
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Handler for cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Handler for toggling announcement expansion
  const toggleAnnouncementExpansion = (announcementId: string) => {
    setExpandedAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(announcementId)) {
        newSet.delete(announcementId);
      } else {
        newSet.add(announcementId);
      }
      return newSet;
    });
  };

  // Toggle reaction - use unified function
  const handleReact = async (message: Message, emoji: string) => {
    if (!currentUser) return;
    
    try {
      // Use unified function that handles both admin and guest authorization
      await supabase.rpc('add_guests_chat_reaction_unified', {
        p_message_id: message.message_id,
        p_event_id: eventId,
        p_user_email: currentUser.email,
        p_emoji: emoji
      });
      
      // Real-time subscription will handle the UI update
      
    } catch (error) {
      console.error('Error handling reaction:', error);
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

  // Handle delete message (now part of multi-select system)
  const handleDeleteMessage = async (message: Message) => {
    // Check if this is the current user's message
    const isCurrentUserMessage = currentUser && message.sender_email === currentUser.email;
    
    if (isCurrentUserMessage) {
      // Enable delete mode for user's own messages
      setIsDeleteMode(true);
      setSelectedMessages(new Set([message.message_id]));
      console.log('[DELETE MODE] Entered delete mode for message:', message.message_id);
    } else {
      // For other messages, show a simple alert (or could be removed entirely)
      alert('You can only delete your own messages');
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    if (!isDeleteMode) return;
    
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (!currentUser || selectedMessages.size === 0) return;

    try {
      const messageIds = Array.from(selectedMessages);
      
      // Delete messages from database
      const { error } = await supabase
        .from('guests_chat_messages')
        .delete()
        .in('message_id', messageIds);

      if (error) {
        console.error('Error deleting messages:', error);
        alert('Failed to delete messages');
        return;
      }

      // Remove from local state
      setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.message_id)));
      
      // Exit delete mode
      setIsDeleteMode(false);
      setSelectedMessages(new Set());
      
      console.log('[BULK DELETE] Successfully deleted', selectedMessages.size, 'messages');
    } catch (error) {
      console.error('Error bulk deleting messages:', error);
      alert('Failed to delete messages');
    }
  };

  const cancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedMessages(new Set());
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
                background: isDark ? '#1f2937' : '#ffffff',
                color: isDark ? '#ffffff' : '#1f2937',
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: loadingOlder ? 'not-allowed' : 'pointer',
                opacity: loadingOlder ? 0.5 : 1,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '200px',
                textAlign: 'center',
                boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!loadingOlder) {
                  e.currentTarget.style.background = isDark ? '#374151' : '#f9fafb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = isDark ? '0 2px 6px rgba(0, 0, 0, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loadingOlder) {
                  e.currentTarget.style.background = isDark ? '#1f2937' : '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)';
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
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }} />
                  Loading...
                </>
              ) : (
                <>
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
            <>
              {getMessageGroups().map((group, groupIndex) => (
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

                  const messageReactions = reactions[message.message_id] || {};
                  if (Object.keys(messageReactions).length > 0) {
                    console.log('[REACTION DEBUG] Message', message.message_id.substring(0, 8), 'has reactions:', messageReactions);
                  }
                  
                  // Debug first few messages to see their IDs
                  if (messageIndex < 3) {
                    console.log('[MESSAGE DEBUG] Rendering message:', message.message_id.substring(0, 8), 'Looking for reactions in:', Object.keys(reactions).length > 0 ? Object.keys(reactions)[0]?.substring(0, 8) : 'empty reactions');
                  }

                  return (
                    <MessageBubble
                      key={message.message_id}
                      message={message}
                      isDark={isDark}
                      currentUserEmail={currentUser?.email || null}
                      onReply={handleReply}
                      onReact={handleReact}
                      messages={messages}
                      reactions={messageReactions}
                      highlightedMessageId={highlightedMessageId}
                      handleJumpToMessage={handleJumpToMessage}
                      onShowHover={showHoverPopup}
                      isDeleteMode={isDeleteMode}
                      isSelected={selectedMessages.has(message.message_id)}
                      onToggleSelection={toggleMessageSelection}
                    />
                  );
                })}

                {/* Announcements for this date */}
                {group.announcements.map((announcement, announcementIndex) => {
                  const isExpanded = expandedAnnouncements.has(announcement.id);
                  
                  return (
                        <div
                      key={announcement.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '8px 0'
                      }}
                    >
                      <div
                        onClick={() => toggleAnnouncementExpansion(announcement.id)}
                        style={{
                          maxWidth: '520px',
                          width: '100%',
                          padding: '16px',
                          background: isDark ? 'rgba(64, 64, 64, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '12px',
                          border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
                          borderLeft: `4px solid ${isDark ? '#10b981' : '#22c55e'}`,
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                      >
                        {/* Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: isDark ? '#10b981' : '#22c55e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#fff'
                            }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            </div>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: isDark ? '#fff' : '#1a1a1a'
                            }}>
                              {announcement.title}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '12px',
                            color: isDark ? '#adb5bd' : '#6c757d'
                          }}>
                            {formatTime(announcement.created_at)}
                          </span>
                        </div>

                        {/* Content */}
                        {announcement.description && (
                          <p style={{
                            fontSize: '14px',
                            color: isDark ? '#adb5bd' : '#495057',
                            margin: '8px 0',
                            lineHeight: '1.4'
                          }}>
                            {announcement.description}
                          </p>
                        )}

                                                 {/* Expanded Details */}
                         {isExpanded && (
                           <div style={{
                             marginTop: '12px',
                             padding: '12px',
                             background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                             borderRadius: '8px',
                             border: `1px solid ${isDark ? '#404040' : '#dee2e6'}`
                           }}>
                             <div style={{
                               display: 'flex',
                               flexDirection: 'column',
                               gap: '12px',
                               fontSize: '12px'
                             }}>
                               {/* Image */}
                               {announcement.image_url && (
                                 <div style={{
                                   display: 'flex',
                                   flexDirection: 'column',
                                   gap: '8px'
                                 }}>
                                   <span style={{ color: isDark ? '#adb5bd' : '#6c757d', fontWeight: '500' }}>Image:</span>
                                   <img 
                                     src={announcement.image_url} 
                                     alt="Announcement"
                                     style={{
                                       maxWidth: '100%',
                                       maxHeight: '200px',
                                       borderRadius: '8px',
                                       objectFit: 'cover'
                                     }}
                                   />
                                 </div>
                               )}

                               {/* Link URL */}
                               {announcement.link_url && (
                                 <div style={{
                                   display: 'flex',
                                   flexDirection: 'column',
                                   gap: '8px'
                                 }}>
                                   <span style={{ color: isDark ? '#adb5bd' : '#6c757d', fontWeight: '500' }}>Link:</span>
                                   <a 
                                     href={announcement.link_url} 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     style={{
                                       color: isDark ? '#10b981' : '#22c55e',
                                       textDecoration: 'none',
                                       wordBreak: 'break-all',
                                       fontSize: '11px'
                                     }}
                                   >
                                     {announcement.link_url}
                                   </a>
                                 </div>
                               )}

                               {/* Scheduled For */}
                               {announcement.scheduled_for && (
                                 <div style={{
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '8px'
                                 }}>
                                   <span style={{ color: isDark ? '#adb5bd' : '#6c757d', fontWeight: '500' }}>Scheduled:</span>
                                   <span style={{ color: isDark ? '#fff' : '#1a1a1a' }}>
                                     {new Date(announcement.scheduled_for).toLocaleString()}
                                   </span>
                                 </div>
                               )}
                             </div>
                           </div>
                         )}

                        {/* Footer */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '8px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: isDark ? '#10b981' : '#22c55e'
                          }}>
                                                         <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                             </svg>
                             Announcement
                          </div>
                          <span style={{
                            fontSize: '11px',
                            color: isDark ? '#6b7280' : '#9ca3af',
                            fontStyle: 'italic'
                          }}>
                            {isExpanded ? 'Click to collapse' : 'Click to expand'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Modules for this date */}
                {group.modules.map((module, moduleIndex) => (
                  <div
                    key={module.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      margin: '8px 0'
                    }}
                  >
                    <TimelineModuleChatItem
                      module={module}
                      isDark={isDark}
                      onPress={async () => {
                        setSelectedModule(module);
                        setShowModuleResponse(true);
                        try {
                          const user = await getCurrentUser();
                          if (!user) return;
                          const { data: answered } = await supabase.rpc('user_or_guest_has_module_answer', {
                            p_guest_id: null,
                            p_user_id: user.id,
                            p_module_id: module.id,
                            p_event_id: eventId,
                          });
                          setHasSubmittedMap(prev => ({ ...prev, [module.id]: !!answered }));
                        } catch {}
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
            </>
        )}
        <div ref={messagesEndRef} />
        
        {/* Module Response Modal (Desktop) */}
        {showModuleResponse && selectedModule && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: 560, width: '92vw', borderRadius: 16, background: isDark ? '#1f1f1f' : '#fff', padding: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#fff' : '#111' }}>
                  {selectedModule.title || selectedModule.question || selectedModule.label || 'Module'}
                </div>
                <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', marginTop: 6 }}>
                  {selectedModule.date} • {selectedModule.time}
                </div>
              </div>
              {/* Question */}
              {selectedModule.module_type === 'question' && (
                <textarea
                  placeholder="Type your answer"
                  value={moduleAnswerState.text || ''}
                  onChange={e => setModuleAnswerState(s => ({ ...s, text: e.target.value }))}
                  style={{ width: '100%', minHeight: 100, borderRadius: 10, border: `1px solid ${isDark ? '#333' : '#ddd'}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#f7f7f7', color: isDark ? '#fff' : '#111', padding: 12 }}
                />
              )}
              {/* Multiple Choice */}
              {selectedModule.module_type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(selectedModule.survey_data?.options || []).map((opt: string, i: number) => (
                    <button key={i} onClick={() => setModuleAnswerState(s => ({ ...s, option: opt }))} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${isDark ? '#333' : '#ddd'}`, background: (moduleAnswerState.option === opt) ? '#00bfa5' : (isDark ? 'rgba(255,255,255,0.05)' : '#f7f7f7'), color: (moduleAnswerState.option === opt) ? '#001b14' : (isDark ? '#fff' : '#111'), textAlign: 'left' }}>{opt}</button>
                  ))}
                </div>
              )}
              {/* Feedback with 0.1 precision stars */}
              {selectedModule.module_type === 'feedback' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div
                    ref={starBarRef}
                    onMouseDown={(e) => {
                      const rect = starBarRef.current!.getBoundingClientRect();
                      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                      const pct = x / rect.width;
                      const rating = Math.round(pct * 50) / 10;
                      setModuleAnswerState(s => ({ ...s, rating }));
                    }}
                    onMouseMove={(e) => {
                      if (e.buttons !== 1) return;
                      const rect = starBarRef.current!.getBoundingClientRect();
                      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                      const pct = x / rect.width;
                      const rating = Math.round(pct * 50) / 10;
                      setModuleAnswerState(s => ({ ...s, rating }));
                    }}
                    style={{ width: 260, maxWidth: '80%', padding: '6px 0', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                      {[1,2,3,4,5].map(star => {
                        const isFilled = (moduleAnswerState.rating || 0) >= star;
                        const partial = (moduleAnswerState.rating || 0) > star - 1 && (moduleAnswerState.rating || 0) < star ? (moduleAnswerState.rating || 0) - (star - 1) : 0;
                        return (
                          <div key={star} style={{ position: 'relative', width: 28, height: 28 }}>
                            {/* Hollow star */}
                            <svg width="28" height="28" viewBox="0 0 24 24" style={{ display: 'block' }}>
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                fill="none" stroke={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'} strokeWidth="1" />
                            </svg>
                            {/* Filled overlay */}
                            {(isFilled || partial > 0) && (
                              <div style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', width: isFilled ? '100%' : `${partial * 100}%` }}>
                                <svg width="28" height="28" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#fbbf24" />
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: isDark ? '#fbbf24' : '#d97706' }}>{(moduleAnswerState.rating || 0).toFixed(1)} / 5.0</div>
                  <textarea
                    placeholder="Add a comment (optional)"
                    value={moduleAnswerState.comment || ''}
                    onChange={e => setModuleAnswerState(s => ({ ...s, comment: e.target.value }))}
                    style={{ width: '100%', minHeight: 80, borderRadius: 10, border: `1px solid ${isDark ? '#333' : '#ddd'}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#f7f7f7', color: isDark ? '#fff' : '#111', padding: 12 }}
                  />
                </div>
              )}
              {/* Photo / Video uploader */}
              {selectedModule.module_type === 'photo_video' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={async (e) => {
                    const file = e.target.files?.[0] || null;
                    let filePreviewUrl: string | null = null;
                    if (file) { try { filePreviewUrl = URL.createObjectURL(file); } catch {} }
                    setModuleAnswerState(s => ({ ...s, file, filePreviewUrl }));
                  }} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${isDark ? '#333' : '#ddd'}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#f7f7f7', color: isDark ? '#fff' : '#111', textAlign: 'left' }}>{moduleAnswerState.file ? 'Change Photo/Video' : 'Pick Photo/Video'}</button>
                  {moduleAnswerState.file && (
                    <div style={{ position: 'relative', width: '100%', maxWidth: 420, margin: '0 auto' }}>
                      {moduleAnswerState.file.type.startsWith('image/') ? (
                        <img src={moduleAnswerState.filePreviewUrl || ''} alt="Selected" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 10, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <video src={moduleAnswerState.filePreviewUrl || ''} controls style={{ width: '100%', borderRadius: 10, display: 'block', background: '#000' }} />
                      )}
                      <button
                        onClick={() => {
                          try { if (moduleAnswerState.filePreviewUrl) URL.revokeObjectURL(moduleAnswerState.filePreviewUrl); } catch {}
                          setModuleAnswerState(s => ({ ...s, file: null, filePreviewUrl: null }));
                        }}
                        aria-label="Clear media"
                        style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 0 }}
                      >
                        ×
                      </button>
                      <div style={{ marginTop: 8, color: isDark ? '#adb5bd' : '#6c757d', fontSize: 12, textAlign: 'center' }}>{moduleAnswerState.file.name}</div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button onClick={() => setShowModuleResponse(false)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: isDark ? '#333' : '#eee', color: isDark ? '#fff' : '#111', fontWeight: 700 }}>Close</button>
                <button disabled={!!hasSubmittedMap[selectedModule.id] || !!moduleAnswerState.submitting} onClick={async () => {
                  try {
                    const user = await getCurrentUser();
                    if (!user) return;
                    setModuleAnswerState(s => ({ ...s, submitting: true }));
                    let answer = '';
                    if (selectedModule.module_type === 'question') {
                      if (!moduleAnswerState.text?.trim()) return;
                      answer = moduleAnswerState.text.trim();
                    } else if (selectedModule.module_type === 'multiple_choice') {
                      if (!moduleAnswerState.option) return;
                      answer = moduleAnswerState.option;
                    } else if (selectedModule.module_type === 'feedback') {
                      const rating = moduleAnswerState.rating || 0;
                      if (rating <= 0) return;
                      answer = JSON.stringify({ rating, comment: (moduleAnswerState.comment || '').trim() });
                    } else if (selectedModule.module_type === 'photo_video') {
                      const file = moduleAnswerState.file;
                      if (!file) return;
                      const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                      const response = await fetch('https://ijsktwmevnqgzwwuggkf.functions.supabase.co/guest-upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          guest_id: 'desktop-user',
                          module_id: selectedModule.id,
                          event_id: eventId,
                          file_base64: base64,
                          file_type: file.type,
                        })
                      });
                      const result = await response.json();
                      if (!response.ok || !result?.url) throw new Error(result?.error || 'Upload failed');
                      answer = JSON.stringify({ url: result.url, type: file.type, filename: file.name });
                    }
                    await supabase.rpc('insert_module_answer_unified', {
                      p_guest_id: null,
                      p_user_id: user.id,
                      p_module_id: selectedModule.id,
                      p_answer_text: answer,
                      p_event_id: eventId,
                    });
                    setHasSubmittedMap(prev => ({ ...prev, [selectedModule.id]: true }));
                    setShowModuleResponse(false);
                  } catch (e) { console.error('Desktop submit error', e); }
                  finally { setModuleAnswerState(s => ({ ...s, submitting: false })); }
                }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: hasSubmittedMap[selectedModule.id] ? (isDark ? '#444' : '#ddd') : '#00bfa5', color: '#001b14', fontWeight: 800, opacity: hasSubmittedMap[selectedModule.id] ? 0.6 : 1 }}>Submit</button>
              </div>
            </div>
          </div>
        )}

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

      {/* Delete Mode UI */}
      {isDeleteMode && (
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
              Delete Messages: {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={cancelDeleteMode}
              style={{
                background: 'transparent',
                color: isDark ? '#fff' : '#1a1a1a',
                border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedMessages.size === 0}
              style={{
                background: selectedMessages.size === 0 ? (isDark ? '#404040' : '#e9ecef') : '#dc2626',
                color: selectedMessages.size === 0 ? (isDark ? '#666' : '#999') : '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: selectedMessages.size === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Delete ({selectedMessages.size})
            </button>
          </div>
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
        <>
          {/* Invisible bridge to prevent gap between message and popup */}
          <div
            style={{
              position: 'fixed',
              top: hoverPopup.position.y - 8,
              left: hoverPopup.position.x + 140, // Center of popup
              width: '1px',
              height: '8px',
              zIndex: 999998,
              pointerEvents: 'auto'
            }}
            onMouseEnter={clearHoverTimeout}
            onMouseLeave={hideHoverPopup}
          />
          {/* Additional bridge to cover more area */}
          <div
            style={{
              position: 'fixed',
              top: hoverPopup.position.y - 4,
              left: hoverPopup.position.x,
              width: '280px',
              height: '4px',
              zIndex: 999998,
              pointerEvents: 'auto'
            }}
            onMouseEnter={clearHoverTimeout}
            onMouseLeave={hideHoverPopup}
          />
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
            onMouseEnter={clearHoverTimeout}
            onMouseLeave={hideHoverPopup}
          >
          {/* X Close Button */}
          <button
            onClick={closeHoverPopup}
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
                    setIsDeleteMode(true);
                    setSelectedMessages(new Set([hoverPopup.message!.message_id]));
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
        </>
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