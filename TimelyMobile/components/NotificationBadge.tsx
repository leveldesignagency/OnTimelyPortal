import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';

interface NotificationBadgeProps {
  count: number;
  size?: number;
}

export default function NotificationBadge({ count, size = 20 }: NotificationBadgeProps) {
  const { theme } = useTheme();

  // Don't render if count is 0
  if (count === 0) return null;

  const styles = StyleSheet.create({
    badge: {
      position: 'absolute',
      top: -5,
      right: -5,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#FF3B30',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#1a1a1a' : '#FFFFFF',
      zIndex: 1000,
    },
    text: {
      color: '#FFFFFF',
      fontSize: Math.max(10, size * 0.4),
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });

  // Show 99+ if count is greater than 99
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{displayCount}</Text>
    </View>
  );
} 