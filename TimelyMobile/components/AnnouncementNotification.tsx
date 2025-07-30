import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Announcement {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  created_at: string;
}

interface AnnouncementNotificationProps {
  announcement: Announcement;
  onClose: () => void;
  onViewInChat: () => void;
}

const { width, height } = Dimensions.get('window');

export default function AnnouncementNotification({ 
  announcement, 
  onClose, 
  onViewInChat 
}: AnnouncementNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleLinkPress = async () => {
    if (announcement.link_url) {
      try {
        await Linking.openURL(announcement.link_url);
      } catch (error) {
        console.error('Error opening link:', error);
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
        style={styles.backdrop}
      />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="megaphone" size={20} color="#ffffff" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Announcement</Text>
              <Text style={styles.time}>{formatTime(announcement.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.announcementTitle}>{announcement.title}</Text>
          
          {announcement.description && (
            <Text style={styles.description}>{announcement.description}</Text>
          )}

          {announcement.image_url && (
            <Image 
              source={{ uri: announcement.image_url }} 
              style={styles.image}
              resizeMode="cover"
            />
          )}

          {announcement.link_url && (
            <TouchableOpacity onPress={handleLinkPress} style={styles.linkButton}>
              <Ionicons name="link" size={16} color="#4a9eff" />
              <Text style={styles.linkText}>Open Link</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onViewInChat} style={styles.chatButton}>
            <Ionicons name="chatbubble" size={16} color="#ffffff" />
            <Text style={styles.chatButtonText}>View in Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2a2a2a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a9eff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  time: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 14,
    color: '#4a9eff',
    marginLeft: 6,
    fontWeight: '500',
  },
  actions: {
    padding: 16,
    paddingTop: 0,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a9eff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
}); 