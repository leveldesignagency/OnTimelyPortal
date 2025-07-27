import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface CustomAlertProps {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: number; // Auto close after X milliseconds
}

export default function CustomAlert({
  visible,
  type,
  title,
  message,
  onClose,
  autoClose
}: CustomAlertProps) {
  
  React.useEffect(() => {
    if (visible) {
      // Haptic feedback based on type
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Auto close if specified
      if (autoClose) {
        const timer = setTimeout(() => {
          onClose();
        }, autoClose);
        
        return () => clearTimeout(timer);
      }
    }
  }, [visible, type, autoClose, onClose]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#28c874',
          icon: 'checkmark-circle',
          color: '#fff'
        };
      case 'error':
        return {
          backgroundColor: '#FF3B30',
          icon: 'close-circle',
          color: '#fff'
        };
      case 'info':
      default:
        return {
          backgroundColor: '#007AFF',
          icon: 'information-circle',
          color: '#fff'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* Header with icon and close button */}
          <View style={[styles.header, { backgroundColor: config.backgroundColor }]}>
            <View style={styles.headerLeft}>
              <Ionicons 
                name={config.icon as any} 
                size={24} 
                color={config.color} 
              />
              <Text style={[styles.headerTitle, { color: config.color }]}>
                {title}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={config.color} />
            </TouchableOpacity>
          </View>

          {/* Message body */}
          <View style={styles.body}>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Action button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: config.backgroundColor }]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, { color: config.color }]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: '#23242b',
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 