import React, { useState } from 'react';

type NotificationType = 'message' | 'success' | 'error' | 'info' | 'warning';

interface PreviewNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  senderName?: string;
  senderAvatar?: string;
  chatName?: string;
  timestamp: number;
}

const NotificationPreview = () => {
  const [isDark, setIsDark] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState('glass');

  const sampleNotifications: PreviewNotification[] = [
    {
      id: '1',
      type: 'message',
      title: 'New Message',
      message: 'Hey! Are you free for a quick call?',
      senderName: 'Sarah Wilson',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
      chatName: 'Design Team',
      timestamp: Date.now()
    },
    {
      id: '2',
      type: 'success',
      title: 'Message Sent',
      message: 'Your message was delivered successfully',
      timestamp: Date.now()
    },
    {
      id: '3',
      type: 'error',
      title: 'Connection Error',
      message: 'Failed to connect to chat server',
      timestamp: Date.now()
    },
    {
      id: '4',
      type: 'info',
      title: 'New Feature',
      message: 'Team chat functionality is now available!',
      timestamp: Date.now()
    }
  ];

  const GlassNotification = ({ notification }: { notification: PreviewNotification }) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'message':
          return (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img 
                src={notification.senderAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'} 
                alt={notification.senderName}
                className="w-full h-full object-cover"
              />
            </div>
          );
        case 'success':
          return (
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          );
        case 'error':
          return (
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          );
        case 'info':
          return (
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
        <div className="relative">
          {/* Glass background with forest green border */}
          <div className="backdrop-blur-md bg-black/20 border-2 border-green-700 rounded-xl p-4 shadow-2xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-transparent rounded-xl pointer-events-none" />
            
            <div className="relative flex items-start space-x-3">
              {getIcon()}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white truncate">
                    {notification.senderName || notification.title}
                  </p>
                  <button className="text-white/60 hover:text-white/80 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <p className="text-sm text-white/90 mt-1 line-clamp-2">
                  {notification.message}
                </p>
                
                {notification.chatName && (
                  <p className="text-xs text-white/60 mt-1">
                    in {notification.chatName}
                  </p>
                )}
                
                <p className="text-xs text-white/50 mt-2">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-green-700/20 rounded-xl blur-sm -z-10" />
        </div>
      </div>
    );
  };

  const AlternativeNotification = ({ notification }: { notification: PreviewNotification }) => (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-green-600 rounded-lg p-4 shadow-xl">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <img 
              src={notification.senderAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'} 
              alt={notification.senderName}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {notification.senderName || notification.title}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              {notification.message}
            </p>
            {notification.chatName && (
              <p className="text-xs text-gray-400 mt-1">
                in {notification.chatName}
              </p>
            )}
          </div>
          
          <button className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      {/* Header */}
      <div className="p-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Notification Preview
        </h1>
        <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Preview and customize notification designs
        </p>
      </div>

      {/* Controls */}
      <div className="px-8 mb-8">
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark 
                ? 'bg-gray-800 text-white hover:bg-gray-700' 
                : 'bg-white text-gray-900 hover:bg-gray-50 border'
            }`}
          >
            {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark 
                ? 'bg-gray-800 text-white border-gray-700' 
                : 'bg-white text-gray-900 border-gray-300'
            }`}
          >
            <option value="glass">Glass Effect</option>
            <option value="solid">Solid Background</option>
          </select>
        </div>
      </div>

      {/* Notification Samples */}
      <div className="px-8">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sample Notifications
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sampleNotifications.map((notification, index) => (
            <div key={notification.id} className="relative">
              <div className={`p-6 rounded-xl border-2 ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)} Notification
                </h3>
                
                <div className="relative h-32 overflow-hidden">
                  {selectedStyle === 'glass' ? (
                    <GlassNotification notification={notification} />
                  ) : (
                    <AlternativeNotification notification={notification} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview Area */}
      <div className="px-8 py-8">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Live Preview
        </h2>
        <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          The notification will appear in the top-right corner when you click the button below.
        </p>
        
        <button
          onClick={() => {
            // This would trigger a sample notification in the actual implementation
            console.log('Sample notification triggered');
          }}
          className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
        >
          Show Sample Notification
        </button>
      </div>

      {/* Sample notification always visible for styling */}
      <GlassNotification notification={sampleNotifications[0]} />
    </div>
  );
};

export default NotificationPreview; 