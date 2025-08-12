import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Modal, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Announcement } from '../lib/announcementService';

interface GlobalAnnouncementModalProps {
  announcement: Announcement | null;
  isVisible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function GlobalAnnouncementModal({ 
  announcement, 
  isVisible, 
  onClose 
}: GlobalAnnouncementModalProps) {
  const [imageExpanded, setImageExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!announcement) return null;

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
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="megaphone" size={32} color="#ffffff" />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.announcementTitle}>{announcement.title}</Text>
            
            {announcement.description && (
              <Text style={styles.description}>{announcement.description}</Text>
            )}

            {announcement.image_url && (
              <TouchableOpacity 
                onPress={() => setImageExpanded(true)}
                style={styles.imageContainer}
              >
                {!imageError ? (
                  <Image 
                    source={{ uri: announcement.image_url }} 
                    style={styles.image}
                    resizeMode="cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Ionicons name="image-off" size={40} color="#888888" />
                    <Text style={styles.imageFallbackText}>Image not available</Text>
                  </View>
                )}
                {!imageError && (
                  <View style={styles.imageOverlay}>
                    <Ionicons name="expand" size={24} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            )}

            {announcement.link_url && (
              <TouchableOpacity onPress={handleLinkPress} style={styles.linkButton}>
                <Ionicons name="link" size={18} color="#4a9eff" />
                <Text style={styles.linkText}>Open Link</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.time}>{formatTime(announcement.created_at)}</Text>
          </View>
        </View>

        {/* Expanded Image Modal */}
        {imageExpanded && announcement.image_url && (
          <Modal
            visible={imageExpanded}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setImageExpanded(false)}
          >
            <View style={styles.expandedOverlay}>
              <View style={styles.expandedBackdrop} />
              
              <View style={styles.expandedContainer}>
                <TouchableOpacity 
                  onPress={() => setImageExpanded(false)} 
                  style={styles.expandedCloseButton}
                >
                  <Ionicons name="close" size={32} color="#ffffff" />
                </TouchableOpacity>
                
                {!imageError ? (
                  <Image 
                    source={{ uri: announcement.image_url }} 
                    style={styles.expandedImage}
                    resizeMode="contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <View style={styles.expandedImageFallback}>
                    <Ionicons name="image-off" size={80} color="#888888" />
                    <Text style={styles.expandedImageFallbackText}>Image not available</Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  container: {
    width: width * 0.9,
    maxWidth: 450,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 0,
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 8,
    position: 'absolute',
    right: 0,
    top: 20,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  announcementTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: width * 0.7,
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallback: {
    width: width * 0.7,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // Fallback background
  },
  imageFallbackText: {
    marginTop: 10,
    fontSize: 14,
    color: '#888888',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#4a9eff',
    marginLeft: 8,
    fontWeight: '500',
  },
  time: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  // Expanded image styles
  expandedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  expandedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  expandedCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  expandedImage: {
    width: width,
    height: height * 0.8,
  },
  expandedImageFallback: {
    width: width * 0.7,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // Fallback background
  },
  expandedImageFallbackText: {
    marginTop: 10,
    fontSize: 14,
    color: '#888888',
  },
}); 