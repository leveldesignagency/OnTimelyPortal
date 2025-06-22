import React, { useState, useEffect, useRef, useContext } from 'react';
import { ThemeContext } from './ThemeContext';

// Define the types for our data structures
type Message = {
  id: string;
  text: string;
  sender: string; // 'You' or the other person's name
  timestamp: string;
};

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
  messages: Message[];
};

type User = {
  id: string;
  name: string;
  avatar: string;
};

// --- Mock Data & Defaults ---

const MOCK_USERS: User[] = [
  { id: 'user_1', name: 'Leon JENKINGS!', avatar: 'LJ' },
  { id: 'user_2', name: 'Luis', avatar: 'L' },
  { id: 'user_3', name: 'Vanilla Gorilla', avatar: 'VG' },
  { id: 'user_4', name: 'Alice', avatar: 'A' },
  { id: 'user_5', name: 'Bob', avatar: 'B' },
  { id: 'user_6', name: 'Charlie', avatar: 'C' },
];

const TIMELY_BOT_CHAT: Chat = {
  id: 'chat_bot_timely',
  name: 'Timely',
  lastMessage: 'Welcome to Timely! How can I help you?',
  timestamp: 'Now',
  unread: 1,
  avatar: 'T',
  messages: [
    {
      id: 'msg_bot_1',
      text: 'Welcome to Timely! I can help you with scheduling, reminders, and more. What would you like to do?',
      sender: 'Timely',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]
};

// --- Components ---

const ChatListItem = ({ chat, active, onClick, isDark }: { chat: Chat, active: boolean, onClick: () => void, isDark: boolean }) => (
  <div onClick={onClick} style={{
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e0e0e0'}`,
    background: active ? (isDark ? '#2a2a2a' : '#e9e9e9') : 'transparent',
    cursor: 'pointer'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: '#3a3a3a',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
      marginRight: '16px'
    }}>
      {chat.avatar}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{chat.name}</span>
        <span style={{ fontSize: '12px', color: '#888' }}>{chat.timestamp}</span>
      </div>
      <p style={{ margin: 0, color: '#aaa', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMessage}</p>
    </div>
  </div>
);

const SearchResultItem = ({ user, onClick, isDark }: { user: User, onClick: () => void, isDark: boolean }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e0e0e0'}` }}>
        <div style={{
            width: '48px', height: '48px', borderRadius: '50%', background: '#3a3a3a', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', marginRight: '16px'
        }}>
            {user.avatar}
        </div>
        <span style={{ fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{user.name}</span>
    </div>
);


const ChatHeader = ({ chat, isDark }: { chat: Chat | undefined, isDark: boolean }) => (
    <div style={{ padding: '10px 16px', background: isDark ? '#2a2a2a' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isDark ? '#3a3a3a' : '#e0e0e0'}` }}>
        <div>
            <h2 style={{margin: 0, color: isDark ? '#fff' : '#000'}}>{chat?.name || 'Select a chat'}</h2>
            {chat && <p style={{margin: 0, color: '#aaa', fontSize: '13px'}}>Click to view contact info</p>}
        </div>
        <div>
            {/* Icons would go here */}
        </div>
    </div>
);

const MessageBubble = ({ text, time, sent, isDark }: { text: string, time: string, sent: boolean, isDark: boolean }) => (
    <div style={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start', margin: '8px 16px' }}>
        <div style={{
            background: sent ? (isDark ? '#056162' : '#dcf8c6') : (isDark ? '#2a2a2a' : '#fff'),
            color: isDark ? '#fff' : '#000',
            padding: '8px 12px',
            borderRadius: '8px',
            maxWidth: '60%',
            boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
        }}>
            <p style={{margin: 0, whiteSpace: 'pre-wrap'}}>{text}</p>
            <p style={{margin: 0, textAlign: 'right', fontSize: '11px', color: sent ? (isDark ? '#aab' : '#777') : '#aab', marginTop: '4px'}}>{time}</p>
        </div>
    </div>
);

const MessageInput = ({ onSendMessage, isDark }: { onSendMessage: (text: string) => void, isDark: boolean }) => {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim()) {
            onSendMessage(text.trim());
            setText('');
        }
    };

    return (
        <div style={{padding: '10px 16px', background: isDark ? '#1a1a1a' : '#f0f0f0', display: 'flex', alignItems: 'center', borderTop: `1px solid ${isDark ? '#2a2a2a' : '#e0e0e0'}`}}>
            <input
                type="text"
                placeholder="Type a message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                style={{flex: 1, padding: '12px', borderRadius: '20px', border: 'none', background: isDark ? '#2a2a2a' : '#fff', color: isDark ? '#fff' : '#000', outline: 'none'}}
            />
            <button onClick={handleSend} style={{marginLeft: 10, background: '#056162', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 20, cursor: 'pointer'}}>
                ▶
            </button>
        </div>
    );
}

// Main component for the Teams page
export default function TeamChatPage() {
  const [chats, setChats] = useState<Chat[]>([TIMELY_BOT_CHAT]);
  const [activeChatId, setActiveChatId] = useState<string | null>(TIMELY_BOT_CHAT.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);

  const isDark = theme === 'dark';
  const activeChat = chats.find(c => c.id === activeChatId);

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
  };

  const handleStartNewChat = (user: User) => {
    const newChat: Chat = {
        id: `chat_${user.id}`,
        name: user.name,
        avatar: user.avatar,
        lastMessage: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
      messages: [],
    };
    setChats(prevChats => [newChat, ...prevChats.filter(c => c.id !== newChat.id)]);
    setActiveChatId(newChat.id);
    setSearchQuery('');
  };

  const handleSendMessage = (text: string) => {
    if (!activeChatId) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      text,
      sender: 'You', // This would be the current user in a real app
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedChats = chats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: `You: ${text}`,
          timestamp: newMessage.timestamp,
        };
      }
      return chat;
    });

    setChats(updatedChats);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: isDark ? '#1a1a1a' : '#fff', color: isDark ? 'white' : 'black' }}>
      <div style={{ width: '350px', borderRight: `1px solid ${isDark ? '#2a2a2a' : '#e0e0e0'}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#e0e0e0'}` }}>
            <h1 style={{margin: 0, fontSize: '24px'}}>Chats</h1>
                <input
                type="search"
                placeholder="Search or start a new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: 'none', background: isDark ? '#2a2a2a' : '#f0f0f0', color: isDark ? '#fff' : '#000', marginTop: '16px', outline: 'none' }}
            />
              </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
            {searchQuery ? (
                <div>
                    {searchResults.length > 0 ? (
                        searchResults.map(user => <SearchResultItem key={user.id} user={user} onClick={() => handleStartNewChat(user)} isDark={isDark} />)
                    ) : (
                        <p style={{textAlign: 'center', color: '#888', marginTop: 20}}>No users found.</p>
                    )}
                </div>
            ) : (
                chats.map(chat => <ChatListItem key={chat.id} chat={chat} active={chat.id === activeChatId} onClick={() => handleSelectChat(chat.id)} isDark={isDark} />)
            )}
          </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isDark ? 'url(https://i.redd.it/qwd83n49h0241.png)' : '#e5ddd5', backgroundSize: 'cover' }}>
        <ChatHeader chat={activeChat} isDark={isDark} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
            {activeChat ? (
                activeChat.messages.map(msg => (
                    <MessageBubble key={msg.id} text={msg.text} time={msg.timestamp} sent={msg.sender === 'You'} isDark={isDark}/>
                ))
            ) : (
                <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888'}}>Select a chat to start messaging</div>
            )}
            <div ref={messagesEndRef} />
        </div>
        {activeChat && <MessageInput onSendMessage={handleSendMessage} isDark={isDark} />}
      </div>
    </div>
  );
} 