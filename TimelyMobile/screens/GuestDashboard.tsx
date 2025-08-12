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
  Linking,
} from 'react-native';
import { signOut } from '../lib/auth';
import { getGlassCardStyle, getGlassTextColor, getGlassSecondaryTextColor } from '../lib/glassmorphic';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useFonts, Poppins_400Regular } from '@expo-google-fonts/poppins';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface GuestDashboardProps {
  guest: any;
  onLogout: () => void;
}

interface HomepageModule {
  id: string;
  type: 'title' | 'description' | 'image' | 'collage' | 'video' | 'list';
  content: any;
  position: number;
}

interface HomepageData {
  eventImage: string | null;
  welcomeTitle: string;
  welcomeDescription: string;
  modules: HomepageModule[];
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

const { width, height } = Dimensions.get('window');

const getVideoEmbedUrl = (url: string): string => {
  // Handle different YouTube URL formats
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&controls=1&fs=1` : '';
  } else if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&controls=1&fs=1` : '';
  } else if (url.includes('youtube.com/embed/')) {
    return url;
  } else if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}?h=auto&autoplay=0&title=0&byline=0&portrait=0` : '';
  }
  return url;
};

function GeometricOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: height * 0.18,
          right: -width * 0.15,
          width: width * 0.7,
          height: width * 0.7,
          borderRadius: width * 0.35,
          backgroundColor: 'rgba(40,40,50,0.18)',
          transform: [{ rotate: '18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: height * 0.38,
          left: -width * 0.2,
          width: width * 0.5,
          height: width * 0.5,
          borderRadius: width * 0.25,
          backgroundColor: 'rgba(40,40,50,0.10)',
          transform: [{ rotate: '-12deg' }],
        }}
      />
    </View>
  );
}

export default function GuestDashboard({ guest, onLogout }: GuestDashboardProps) {
  // ALL HOOKS MUST BE CALLED FIRST - NO CONDITIONAL LOGIC BEFORE HOOKS
  const [fontsLoaded] = useFonts({ Poppins_400Regular });
  const textColor = getGlassTextColor();
  const secondaryTextColor = getGlassSecondaryTextColor();
  const [homepageData, setHomepageData] = useState<HomepageData>({
    eventImage: null,
    welcomeTitle: 'WELCOME TO THE EVENT',
    welcomeDescription: 'THIS IS A DESCRIPTION',
    modules: [],
  });
  const [homepageLoading, setHomepageLoading] = useState(true);
  const [videoWebViewKey, setVideoWebViewKey] = useState(0);

  const guestObj = Array.isArray(guest) ? guest[0] : guest;
  console.log('[GuestDashboard] guestObj:', guestObj);
  supabase.auth.getSession().then(({ data: { session } }) => {
    console.log('[GuestDashboard] Supabase session:', session);
  });
  supabase.auth.getUser().then(({ data: { user } }) => {
    console.log('[GuestDashboard] Supabase user:', user);
  });

  // useEffect hook to fetch homepage data
  useEffect(() => {
    async function fetchHomepage() {
      if (!guestObj?.event_id) {
        console.log('[GuestDashboard] guestObj.event_id is missing:', guestObj);
        return;
      }
      setHomepageLoading(true);

      try {
        // Use the custom RPC to fetch homepage data by event_id
        const { data, error } = await supabase.rpc('get_event_homepage_data', { p_event_id: guestObj.event_id });
        console.log('[GuestDashboard] get_event_homepage_data result:', data, error);
        let homepageData = null;
        if (Array.isArray(data) && data.length > 0) {
          homepageData = data[0];
        }
        if (error || !homepageData) {
          console.error('❌ Error fetching homepage data:', error?.message || 'No homepage data found');
          setHomepageData({
            eventImage: null,
            welcomeTitle: 'WELCOME TO THE EVENT',
            welcomeDescription: 'No homepage has been set for this event.',
            modules: [],
          });
        } else {
          setHomepageData({
            eventImage: homepageData.event_image || null,
            welcomeTitle: homepageData.welcome_title || 'WELCOME TO THE EVENT',
            welcomeDescription: homepageData.welcome_description || 'THIS IS A DESCRIPTION',
            modules: homepageData.modules || [],
          });
        }
      } catch (error) {
        console.error('Error in fetchHomepage:', error);
        setHomepageData({
          eventImage: null,
          welcomeTitle: 'WELCOME TO THE EVENT',
          welcomeDescription: 'Error loading homepage data.',
          modules: [],
        });
      } finally {
        setHomepageLoading(false);
      }
    }

    fetchHomepage();
  }, [guestObj?.event_id]);

  // NOW we can do conditional rendering after all hooks are called
  if (!fontsLoaded) return null;

  // Mock notifications
  const notifications = [
    { id: 1, message: 'Changes to your itinerary have been made...' },
    { id: 2, message: 'You have 4 unread chat messages...' },
    { id: 3, message: 'Changes to your itinerary have been made...' },
    { id: 4, message: 'You have 4 unread chat messages...' },
  ];



  const handleLogout = async () => {
    console.log('[GuestDashboard] Logout button pressed');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('[GuestDashboard] Logout confirmed, calling onLogout');
            onLogout();
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

  // Render collage component similar to desktop
  const CollageComponent = ({ images, layout }: { images: string[]; layout?: any }) => {
    if (!images || images.length === 0) return null;
    
    const containerWidth = SCREEN_WIDTH - 48; // Account for padding
    const imageSize = containerWidth / 3 - 4; // 3 columns with gaps
    
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {images.map((img: string, i: number) => (
          <Image
            key={i}
            source={{ uri: img }}
            style={{
              width: imageSize,
              height: imageSize,
              borderRadius: 10,
              resizeMode: 'cover',
            }}
          />
        ))}
      </View>
    );
  };

  const coverImageSrc = homepageData.eventImage || PLACEHOLDER_IMAGE;
  const coverHeight = SCREEN_HEIGHT / 3;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#18181b", "#23272F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GeometricOverlay />
      {/* Remove fixed cover image, make it part of ScrollView */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}>
        {/* Cover Image (edge-to-edge, rounded corners, no inner shadow) */}
        <View style={{ width: Dimensions.get('window').width, marginLeft: -18, marginRight: -18, aspectRatio: 16/9, position: 'relative', marginBottom: 15, borderRadius: 35, overflow: 'hidden', alignSelf: 'center' }}>
          <Image source={{ uri: coverImageSrc }} style={{ width: '100%', height: undefined, aspectRatio: 16/9, resizeMode: 'cover', borderRadius: 35 }} />
          {/* Only show event title overlay if it exists */}
          {(guestObj?.event_title || guestObj?.event_name) && (
            <View style={styles.titleOverlay} pointerEvents="none">
              <Text style={styles.eventTitle}>
                {guestObj?.event_title || guestObj?.event_name}
              </Text>
            </View>
                      )}
          </View>

                    {/* Main Welcome Title */}
          <Text style={{
          fontSize: 30, // increased by ~6px
          fontWeight: 'bold',
          color: '#fff',
          textAlign: 'center',
          marginBottom: 18,
          letterSpacing: 1,
          paddingTop: 15,
        }}>
          {homepageData.welcomeTitle}
        </Text>
        {/* Main Welcome Description */}
        <Text style={{
          fontSize: 16,
          color: '#fff',
          opacity: 0.85,
          textAlign: 'center',
          lineHeight: 22,
          paddingTop: 7,
          paddingBottom: 30,
        }}>
          {homepageData.welcomeDescription}
        </Text>
        {/* Render Homepage Modules */}
        {homepageData.modules && homepageData.modules.length > 0 ? (
          homepageData.modules.map((module, idx) => {
            switch (module.type) {
              case 'title':
                return (
                  <Text
                    key={module.id}
                    style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: '#fff',
                      textAlign: 'center',
                      marginBottom: 18,
                      letterSpacing: 1,
                      paddingTop: 22,
                      paddingBottom: 22,
                    }}
                  >
                    {module.content?.text}
                  </Text>
                );
              case 'description':
                return (
                  <Text
                    key={module.id}
                    style={{
                      fontSize: 16,
                      color: '#fff',
                      opacity: 0.85,
                      textAlign: 'center',
                      lineHeight: 22,
                      paddingTop: 7,
                      paddingBottom: 35,
                    }}
                  >
                    {module.content?.text}
                  </Text>
                );
              case 'image':
                return (
                  <View key={module.id} style={{ marginBottom: 24, borderRadius: 16, overflow: 'hidden', alignItems: 'center' }}>
                    <Image
                      source={{ uri: module.content?.url }}
                      style={{ width: '100%', maxWidth: 1920, height: undefined, aspectRatio: 16/9, resizeMode: 'cover' }}
                    />
                  </View>
                );
              case 'collage':
                return (
                  <View key={module.id} style={{ marginBottom: 24 }}>
                    <CollageComponent 
                      images={module.content?.images || []} 
                      layout={module.content?.layout}
                    />
                  </View>
                );
              case 'list':
                return (
                  <View key={module.id} style={{ marginBottom: 24 }}>
                    {module.content?.items?.map((item: string, i: number) => (
                      <View key={i} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        marginBottom: 18, // increased gap
                        justifyContent: 'center', // center horizontally
                      }}>
                        <Text style={{ 
                          color: '#fff', 
                          fontSize: 16, 
                          flex: 1,
                          lineHeight: 22,
                          textAlign: 'center', // center text
                        }}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
                            case 'video':
                // If the URL is a YouTube link, embed the video
                const url = module.content?.url || '';
                console.log('[VIDEO] Processing video URL:', url);
                
                if (url) {
                  const embedUrl = getVideoEmbedUrl(url);
                  console.log('[VIDEO] Using embed URL:', embedUrl);
                  
                  if (embedUrl) {
                    return (
                      <View key={module.id} style={{ marginBottom: 24, alignItems: 'center', width: '100%' }}>
                        <WebView
                          key={videoWebViewKey}
                          source={{ uri: embedUrl }}
                          style={{ width: '100%', minHeight: 220, aspectRatio: 16/9, borderRadius: 16 }}
                          javaScriptEnabled={true}
                          domStorageEnabled={true}
                          allowsFullscreenVideo={true}
                          mediaPlaybackRequiresUserAction={false}
                          onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('[VIDEO] WebView error:', nativeEvent);
                          }}
                          onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('[VIDEO] WebView HTTP error:', nativeEvent);
                          }}
                          onNavigationStateChange={navState => {
                            console.log('[VIDEO] Navigation state changed:', navState.url);
                            if (navState.url !== embedUrl && !navState.url.includes('youtube.com') && !navState.url.includes('vimeo.com')) {
                              setVideoWebViewKey(k => k + 1);
                            }
                          }}
                        />
                      </View>
                    );
                  } else {
                    console.log('[VIDEO] Invalid video URL format:', url);
                    return (
                      <View key={module.id} style={{ marginBottom: 24, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 4, paddingTop: 7, paddingBottom: 15 }}>
                          Invalid video URL
                        </Text>
                        <Text style={{ color: '#fff', fontSize: 14, opacity: 0.85, textAlign: 'center', flexWrap: 'wrap', overflow: 'hidden' }}>
                          {url}
                        </Text>
                      </View>
                    );
                  }
                } else {
                  console.log('[VIDEO] No video URL provided');
                  return (
                    <View key={module.id} style={{ marginBottom: 24, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 4, paddingTop: 7, paddingBottom: 15 }}>
                        No video URL provided.
                      </Text>
                    </View>
                  );
                }
              default:
                return null;
            }
          })
        ) : (
          homepageData.welcomeDescription === 'No homepage has been set for this event.' && (
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', opacity: 0.7 }}>
                No additional content available.
              </Text>
            </View>
          )
        )}
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