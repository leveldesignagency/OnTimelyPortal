import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Announcement } from '../lib/announcementService';

interface AnnouncementChatItemProps {
  announcement: Announcement;
  onPress?: () => void;
}

export default function AnnouncementChatItem({ announcement, onPress }: AnnouncementChatItemProps) {
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="megaphone" size={16} color="#ffffff" />
          </View>
          <Text style={styles.sender}>{announcement.title}</Text>
        </View>
        <Text style={styles.time}>{formatTime(announcement.created_at)}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{announcement.title}</Text>
        
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
            <Ionicons name="link" size={14} color="#4a9eff" />
            <Text style={styles.linkText}>Open Link</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.badge}>
          <Ionicons name="megaphone" size={12} color="#4a9eff" />
          <Text style={styles.badgeText}>Announcement</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: '#4a9eff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4a9eff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  time: {
    fontSize: 12,
    color: '#888888',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 18,
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 12,
    color: '#4a9eff',
    marginLeft: 4,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    color: '#4a9eff',
    marginLeft: 4,
    fontWeight: '500',
  },
}); 