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
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
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

const Avatar = ({ name, avatarUrl, isDark }: { name: string; avatarUrl?: string | null; isDark: boolean }) => {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  
  // Only log if avatarUrl exists but we're still showing initials
  if (avatarUrl && !isAvatarUrl(avatarUrl)) {
    console.log(`[AVATAR ISSUE] Invalid URL for ${name}: ${avatarUrl}`);
  }
  
  if (avatarUrl && isAvatarUrl(avatarUrl)) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 10, marginLeft: 0, objectFit: 'cover', background: isDark ? '#222' : '#e0e0e0' }}
      />
    );
  }
  return (
    <div style={{
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: isDark ? '#222' : '#e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginLeft: 0,
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
  const sent = message.sender_email === currentUserEmail;
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: sent ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
        paddingLeft: sent ? '60px' : '0px',
        paddingRight: sent ? '0px' : '60px',
        position: 'relative',
        background: highlightedMessageId === message.message_id ? (isDark ? 'rgba(128,128,128,0.28)' : 'rgba(128,128,128,0.18)') : undefined,
        transition: 'background 0.3s',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {/* Sender name above bubble */}
      <div style={{
        fontSize: '12px',
        color: colors.textSecondary,
        marginBottom: '4px',
        marginLeft: sent ? '0' : '42px',
        marginRight: sent ? '42px' : '0',
        fontWeight: '500'
      }}>
        {message.sender_name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: sent ? 'flex-end' : 'flex-start', gap: '8px', position: 'relative' }}>
        {/* Avatar for received messages */}
        {!sent && <Avatar name={message.sender_name} avatarUrl={message.avatar_url} isDark={isDark} />}
        <div style={{ position: 'relative', maxWidth: '70%' }}>
          {/* Bubble */}
          <div
            style={{
              background: sent ? colors.messageBubbleSent : colors.messageBubble,
              color: sent ? (isDark ? colors.bg : '#ffffff') : colors.text,
              padding: '12px 16px',
              borderRadius: sent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              wordWrap: 'normal',
              position: 'relative',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: isDark 
                ? '0 4px 16px rgba(0,0,0,0.3)' 
                : '0 4px 16px rgba(0,0,0,0.1)',
              cursor: 'default',
              maxWidth: '40vw',
              overflowWrap: 'anywhere',
              whiteSpace: 'normal',
              wordBreak: 'normal',
            }}
            onMouseEnter={(event) => {
              // Only show hover popup for admin messages (sent messages)
              if (sent && onShowHover) {
                onShowHover(message, event);
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
                  marginBottom: 6,
                  marginLeft: 24,
                  alignSelf: 'flex-start',
                  cursor: 'pointer',
                  opacity: 0.95,
                }}
                title="Jump to replied message"
              >
                <div
                  style={{
                    borderRadius: repliedTo.sender_email === currentUserEmail
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    padding: '8px 14px',
                    marginLeft: 0,
                    maxWidth: 220,
                    fontSize: 14,
                    color: isDark ? '#111' : '#fff',
                    fontStyle: 'normal',
                    boxShadow: 'none',
                    fontWeight: 400,
                    letterSpacing: 0.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                    borderColor: highlightedMessageId === repliedTo.message_id ? (isDark ? 'rgba(128,128,128,0.7)' : 'rgba(128,128,128,0.7)') : (isDark ? '#888' : '#bbb'),
                    border: `1.5px solid ${highlightedMessageId === repliedTo.message_id ? (isDark ? 'rgba(128,128,128,0.7)' : 'rgba(128,128,128,0.7)') : (isDark ? '#888' : '#bbb')}`,
                    background: highlightedMessageId === repliedTo.message_id ? (isDark ? 'rgba(128,128,128,0.18)' : 'rgba(128,128,128,0.10)') : 'transparent',
                    transition: 'background 0.3s, border-color 0.3s',
                  }}
                >
                  {repliedTo.message_text.length > 60 ? repliedTo.message_text.slice(0, 60) + '…' : repliedTo.message_text}
                </div>
              </div>
            )}
            {/* Main message text with link detection */}
            <div style={{ fontSize: '14px', lineHeight: '1.4', fontWeight: '400' }}>
              {(() => {
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
          {/* Action bar, only for other users' messages on hover */}
          {!sent && showActions && (
            <div style={{
              position: 'absolute',
              left: 'calc(100% + 12px)',
              top: 0,
              display: 'flex',
              flexDirection: 'row', // horizontal
              gap: 4,
              zIndex: 10,
              alignItems: 'center',
            }}>
              <button
                style={{
                  background: colors.buttonBg,
                  color: colors.buttonText,
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 16,
                  cursor: 'pointer',
                  marginRight: 2
                }}
                onClick={() => onReply(message)}
              >
                &#x21A9;
              </button>
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setShowEmojiPicker(true)}
                onMouseLeave={() => setShowEmojiPicker(false)}
              >
                <button
                  style={{
                    background: colors.buttonBg,
                    color: colors.buttonText,
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '100%',
                    width: 40,
                    maxHeight: 200,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    background: colors.panelBg,
                    borderRadius: 8,
                    zIndex: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                  }}>
                    {emojiList.map((emoji, idx) => (
                      <React.Fragment key={emoji}>
                        <button
                          style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                          onClick={() => onReact(message, emoji)}
                        >
                          {emoji}
                        </button>
                        {idx < emojiList.length - 1 && (
                          <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', margin: '0 6px' }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
        </div>
        {/* Avatar for sent messages */}
        {sent && <Avatar name={message.sender_name} avatarUrl={message.avatar_url} isDark={isDark} />}
      </div>
      {/* Timestamp below bubble */}
      <div style={{
        fontSize: '11px',
        color: colors.textSecondary,
        marginTop: '4px',
        marginLeft: sent ? '0' : '42px',
        marginRight: sent ? '42px' : '0',
        textAlign: sent ? 'right' : 'left'
      }}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

  const colors = themes[isDark ? 'dark' : 'light'];

  // Initialize chat system
  useEffect(() => {
    initializeChat();
  }, [eventId]);

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
          console.log('[GUESTS_CHAT] Enhanced real-time message received:', payload);
          loadMessages();
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
          loadMessages();
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
          // Reinitialize chat to get updated participant list
          initializeChat();
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
        console.error('[GUESTS_CHAT] Missing user or eventId');
        return;
      }

      // Initialize chat participants for this event
      const { error: initError } = await supabase.rpc('initialize_guests_chat', { p_event_id: eventId });
      if (initError) {
        console.error('[GUESTS_CHAT] Error initializing chat:', initError);
      }

      // Load initial messages
      await loadMessages();
    } catch (error) {
      console.error('[GUESTS_CHAT] Error initializing chat:', error);
    } finally {
      setIsInitializing(false);
      setLoading(false);
    }
  };

  // Replace old message fetching logic with new function
  const loadMessages = async () => {
    if (!eventId || !currentUser) return;
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
      
      // Simple debug: check if any admin messages have avatar_url
      if (messagesData && messagesData.length > 0) {
        const adminMessages = messagesData.filter((msg: any) => msg.sender_type === 'admin');
        if (adminMessages.length > 0) {
          console.log('[AVATAR DEBUG] Admin messages avatar_url values:', adminMessages.map((msg: any) => ({
            sender: msg.sender_name,
            avatar_url: msg.avatar_url,
            avatar_type: typeof msg.avatar_url,
            is_null: msg.avatar_url === null,
            is_undefined: msg.avatar_url === undefined
          })));
        }
      }
      
      setMessages(messagesData || []);
    } catch (error) {
      console.error('[GUESTS_CHAT] Error in loadMessages:', error);
    }
  };

  // Replace old message sending logic with new function
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !eventId || !currentUser || sending) return;
    setSending(true);
    try {
      const { data: result, error } = await supabase.rpc('send_guests_chat_message', {
        p_event_id: eventId,
        p_sender_email: currentUser.email,
        p_message_text: messageText,
        p_message_type: 'text',
        p_reply_to_message_id: replyingTo ? replyingTo.message_id : null // pass reply id if replying
      });
      if (error) {
        console.error('[GUESTS_CHAT] Error sending message:', error);
        return;
      }
      // Reload messages to show the new one
      await loadMessages();
      setReplyingTo(null); // clear reply state after sending
    } catch (error) {
      console.error('[GUESTS_CHAT] Error in sendMessage:', error);
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

    const guest = guests.find(g => 
      g.email === senderEmail ||
      `${g.first_name} ${g.last_name}` === senderName ||
      g.first_name === senderName.split(' ')[0]
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

  const broadcastTyping = useCallback(() => {
    // Simple typing broadcast without debounce for now
    if (!eventId || !currentUser) return;
    const channel = supabase.channel(`mobile-guest-chat-${eventId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        sender_email: currentUser.email,
        sender_name: currentUser.name,
      },
    });
  }, [eventId, currentUser]);

  // Handler for reply action
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Handler for cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Toggle reaction
  const handleReact = async (message: Message, emoji: string) => {
    if (!currentUser) return;
    const hasReacted = reactions[message.message_id]?.[emoji]?.reacted;
    if (hasReacted) {
      // Remove reaction
      await supabase
        .from('guests_chat_reactions')
        .delete()
        .eq('message_id', message.message_id)
        .eq('user_email', currentUser.email)
        .eq('emoji', emoji);
    } else {
      // Add reaction
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
    setEditingMessageId(message.message_id);
    setEditText(message.message_text);
    setReplyingTo(null); // Clear any reply state
  };

  // Handle save edit
  const handleSaveEdit = async (text: string) => {
    if (!editingMessageId || !text.trim()) return;
    
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
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.message_id === editingMessageId 
          ? { ...msg, message_text: text.trim() }
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
      position: 'relative',
      margin: 0,
      padding: 0
    }}>
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
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
      </div>

      {/* Message Input */}
      {replyingTo && (
        <div style={{
          padding: '12px 24px',
          background: isDark ? '#2a2a2a' : '#f8f9fa',
          borderBottom: `1px solid ${isDark ? '#404040' : '#dee2e6'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 0
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
              ✏️ Editing:
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
            onClick={handleCancelEdit}
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
              top: '4px',
              left: '-10px', // Position to the left and slightly outside
              background: isDark ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${isDark ? '#404040' : '#e9ecef'}`,
              color: isDark ? '#ffffff' : '#000000',
              fontSize: '14px',
              cursor: 'pointer',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%', // Perfect circle
              transition: 'background 0.2s ease',
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? '#404040' : '#f0f0f0';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isDark ? '#2a2a2a' : '#ffffff';
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