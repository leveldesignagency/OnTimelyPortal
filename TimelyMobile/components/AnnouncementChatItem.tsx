import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Announcement } from '../lib/announcementService';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnnouncementChatItemProps {
  announcement: Announcement;
  onPress?: () => void;
}

export default function AnnouncementChatItem({ announcement, onPress }: AnnouncementChatItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);

  // Debug image URL and get signed URL if needed
  useEffect(() => {
    if (announcement.image_url) {
      console.log('[ANNOUNCEMENT] Rendering announcement with image URL:', announcement.image_url);
      
      // Use signed URL generation for Supabase storage URLs
      if (announcement.image_url.includes('supabase.co') && announcement.image_url.includes('/storage/v1/object/public/')) {
        console.log('[ANNOUNCEMENT] Using signed URL generation');
        getSignedUrl(announcement.image_url);
      } else {
        console.log('[ANNOUNCEMENT] Not a Supabase storage URL, using original');
        setSignedImageUrl(announcement.image_url);
      }
    }
  }, [announcement.image_url]);

  const getSignedUrl = async (url: string) => {
    try {
      console.log('[ANNOUNCEMENT] Processing URL:', url);
      
      // Parse Supabase storage URL first
      // Format: https://ijsktwmevnqgzwwuggkf.supabase.co/storage/v1/object/public/announcement_media/announcements/...
      if (url.includes('supabase.co') && url.includes('/storage/v1/object/public/')) {
        const urlParts = url.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const bucketAndPath = urlParts[1];
          const bucketPathParts = bucketAndPath.split('/');
          const bucket = bucketPathParts[0]; // announcement_media
          const path = bucketPathParts.slice(1).join('/'); // announcements/4e19b264-61a1-484f-8619-4f2d515b3796/1754316469493.jpg
          
          console.log('[ANNOUNCEMENT] Extracted bucket:', bucket);
          console.log('[ANNOUNCEMENT] Extracted path:', path);
          
          // Try to get signed URL first
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600); // 1 hour expiry
          
          if (error) {
            console.log('[ANNOUNCEMENT] Error getting signed URL:', error);
            console.log('[ANNOUNCEMENT] Image likely deleted from storage, setting error state');
            setImageError(true); // Set error state to show fallback
            return; // Don't set signedImageUrl, let error state handle display
          } else {
            console.log('[ANNOUNCEMENT] Got signed URL successfully');
            setSignedImageUrl(data.signedUrl);
            setImageError(false); // Clear any previous errors
          }
        } else {
          console.log('[ANNOUNCEMENT] Could not parse Supabase URL format');
          setSignedImageUrl(url);
        }
      } else {
        console.log('[ANNOUNCEMENT] Not a Supabase storage URL, using original');
        setSignedImageUrl(url);
      }
    } catch (error) {
      console.log('[ANNOUNCEMENT] Exception getting signed URL:', error);
      setImageError(true); // Set error state to show fallback
    }
  };

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

  const handlePress = () => {
    setIsExpanded(!isExpanded);
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity 
        style={styles.container} 
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
            </View>
            <Text style={styles.sender}>{announcement.title}</Text>
          </View>
          <Text style={styles.time}>{formatTime(announcement.created_at)}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {announcement.description && (
            <Text style={styles.description}>{announcement.description}</Text>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <View style={styles.expandedContent}>
              {/* Image */}
              {announcement.image_url && (
                <View style={styles.imageSection}>
                  <Text style={styles.sectionLabel}>Image:</Text>
                  {!imageError && signedImageUrl ? (
                    <Image 
                      source={{ 
                        uri: signedImageUrl,
                        headers: {
                          'User-Agent': 'TimelyMobile/1.0',
                          'Accept': 'image/*',
                          'Cache-Control': 'no-cache'
                        }
                      }} 
                      style={styles.image}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('[ANNOUNCEMENT] Image loading error, showing fallback');
                        setImageError(true);
                      }}
                      onLoad={() => {
                        console.log('[ANNOUNCEMENT] Image loaded successfully');
                        setImageError(false);
                      }}
                    />
                  ) : !signedImageUrl && !imageError ? (
                    <View style={styles.imageLoadingContainer}>
                      <Text style={styles.imageLoadingText}>Loading image...</Text>
                    </View>
                  ) : (
                    <View style={styles.imageFallbackContainer}>
                      <Text style={styles.imageFallbackText}>Image Not Available</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Link URL */}
              {announcement.link_url && (
                <View style={styles.linkSection}>
                  <Text style={styles.sectionLabel}>Link:</Text>
                  <TouchableOpacity onPress={handleLinkPress} style={styles.linkButton}>
                    <Ionicons name="link" size={14} color="#22c55e" />
                    <Text style={styles.linkText}>{announcement.link_url}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Scheduled For */}
              {announcement.scheduled_for && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionLabel}>Scheduled:</Text>
                  <Text style={styles.infoText}>
                    {new Date(announcement.scheduled_for).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
            <Text style={styles.badgeText}>Announcement</Text>
          </View>
          <Text style={styles.expandText}>
            {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    maxWidth: 350,
    width: '100%',
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    backgroundColor: '#22c55e',
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
  description: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 18,
    marginBottom: 8,
  },
  expandedContent: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  imageSection: {
    marginBottom: 12,
  },
  linkSection: {
    marginBottom: 12,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#ffffff',
    marginLeft: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  linkText: {
    fontSize: 11,
    color: '#22c55e',
    marginLeft: 4,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    color: '#22c55e',
    marginLeft: 4,
    fontWeight: '500',
  },
  expandText: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
  },
  imageErrorContainer: {
    padding: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  imageErrorText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '500',
    marginBottom: 4,
  },
                imageUrlText: {
                fontSize: 10,
                color: '#888888',
                fontFamily: 'monospace',
              },
              imageLoadingContainer: {
                padding: 12,
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#0066ff',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              },
              imageLoadingText: {
                fontSize: 12,
                color: '#0066ff',
                fontWeight: '500',
              },
              imageFallbackContainer: {
                padding: 12,
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#808080',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              },
              imageFallbackText: {
                fontSize: 12,
                color: '#808080',
                fontStyle: 'italic',
              },
}); 