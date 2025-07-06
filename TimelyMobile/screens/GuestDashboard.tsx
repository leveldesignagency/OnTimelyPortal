import React, { PropsWithChildren } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { signOut } from '../lib/auth';
import { getGlassCardStyle, getGlassTextColor, getGlassSecondaryTextColor } from '../lib/glassmorphic';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useFonts, Poppins_400Regular } from '@expo-google-fonts/poppins';

interface GuestDashboardProps {
  guest: any;
  onLogout: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_RADIUS = 18;
const MM_TO_PX = 3.78; // 1mm ≈ 3.78px
const CARD_HEIGHT = SCREEN_HEIGHT / 3 - 10 * MM_TO_PX;
const CARD_BORDER = 2;
const CARD_GLOW = 18;
const CARD_BORDER_COLOR = '#fff';
const CARD_BG = 'rgba(255,255,255,0.10)';
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';

export default function GuestDashboard({ guest, onLogout }: GuestDashboardProps) {
  const textColor = getGlassTextColor();
  const secondaryTextColor = getGlassSecondaryTextColor();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
  });

  console.log('guest', guest);

  if (!fontsLoaded) return null;

  // Mock notifications
  const notifications = [
    { id: 1, message: 'Changes to your itinerary have been made...' },
    { id: 2, message: 'You have 4 unread chat messages...' },
    { id: 3, message: 'Changes to your itinerary have been made...' },
    { id: 4, message: 'You have 4 unread chat messages...' },
  ];

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to logout');
            } else {
              onLogout();
            }
          },
        },
      ]
    );
  };

  // Glassmorphic Card Wrapper
  const GlassCard: React.FC<PropsWithChildren<{ style?: any }>> = ({ children, style }) => (
    <View style={[styles.glassCardContainer, style]}>
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={styles.glassOverlay} />
      <View style={{ zIndex: 1 }}>{children}</View>
    </View>
  );

  console.log('guest', guest);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={styles.topCard}>
        <Image source={{ uri: guest?.image_url || PLACEHOLDER_IMAGE }} style={styles.topImage} />
        <View style={styles.innerShadow} pointerEvents="none" />
        <View style={styles.titleOverlay} pointerEvents="none">
          <Text style={styles.eventTitle}>
            {guest?.event_title || guest?.event_name || 'Event Title'}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 24 }}>
        {/* Welcome Section */}
        <View style={{ alignItems: 'center', marginTop: -5, marginBottom: 12 }}>
          <Text style={styles.welcomeTitle}>WELCOME TO THE EVENT</Text>
          <Text style={styles.welcomeDesc}>{(guest?.description || 'THIS IS A DESCRIPTION THE USER WILL CREATE WHEN LAUNCHING THE EVENT IT CAN BE A MAXIMUM OF 750 CHARACTERS').toUpperCase()}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topCard: {
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: 32,
    alignSelf: 'center',
    backgroundColor: '#222',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  topImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  titleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    pointerEvents: 'none',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    paddingHorizontal: 16,
  },
  glassCardContainer: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    marginBottom: 0,
    shadowColor: '#fff',
    shadowOpacity: 0.13,
    shadowRadius: CARD_GLOW,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: 'transparent',
    borderWidth: CARD_BORDER,
    borderColor: CARD_BORDER_COLOR,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CARD_BG,
    borderRadius: CARD_RADIUS,
  },
  eventCardWireframe: {
    width: '100%',
    height: SCREEN_HEIGHT / 3,
    borderRadius: CARD_RADIUS,
    borderWidth: CARD_BORDER,
    borderColor: CARD_BORDER_COLOR,
    overflow: 'hidden',
    marginBottom: 36,
    shadowColor: '#fff',
    shadowOpacity: 0.13,
    shadowRadius: CARD_GLOW,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: 'transparent',
    position: 'relative',
  },
  eventImageWireframe: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventOverlayWireframe: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  eventCardTitleWireframe: {
    position: 'absolute',
    top: 32,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  welcomeDesc: {
    fontSize: 9,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.85,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 10,
    maxWidth: 340,
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    borderRadius: CARD_RADIUS,
    backgroundColor: 'transparent',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    // Android shadow (simulate with gradient if needed)
    borderWidth: 0,
  },
}); 