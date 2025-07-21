import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { signIn, signInAsGuest, guestLogin } from '../lib/auth'
import { getGlassCardStyle } from '../lib/glassmorphic'
import { LinearGradient } from 'expo-linear-gradient'
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins'
import { BlurView } from 'expo-blur'
import GuestDashboard from './GuestDashboard'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginScreenProps {
  onLogin: (user: any) => void
}

const { width, height } = Dimensions.get('window')

// Add Neumorphic style helpers
const neumorphicShadow = {
  shadowColor: '#fff',
  shadowOffset: { width: -4, height: -4 },
  shadowOpacity: 0.7,
  shadowRadius: 8,
  elevation: 4,
};
const neumorphicShadowDark = {
  shadowColor: '#000',
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 4,
};

function LoginBackground() {
  return (
    <View style={{ position: 'absolute', width, height, top: 0, left: 0, backgroundColor: '#131419' }} />
  );
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  // All hooks at the top!
  const [activeTab, setActiveTab] = useState<'admin' | 'guest'>('admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  if (!fontsLoaded) return null;

  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPassword) {
      Alert.alert('Error', 'Please enter both email and password')
      return
    }
    setLoading(true)
    try {
      const { user, error } = await signIn(adminEmail, adminPassword)
      if (error) {
        Alert.alert('Login Failed', error.message)
      } else if (user) {
        onLogin(user)
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    if (!guestEmail || !guestPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      // Debug: log credentials being sent
      console.log('Attempting guest login with:', guestEmail, guestPassword);
      // Call the login_guest RPC to validate credentials
      const { data, error } = await supabase.rpc('login_guest', {
        p_email: guestEmail,
        p_password: guestPassword
      });
      console.log('login_guest result:', data, error);
      if (error || !data || !Array.isArray(data) || data.length === 0) {
        let errorMsg = error?.message || 'Invalid login credentials';
        Alert.alert('Guest Login Failed', errorMsg);
        setLoading(false);
        return;
      }
      const guest = data[0];
      // Store guest session (id, event_id, role) in AsyncStorage
      const session = {
        id: guest.id, // use 'id' for consistency
        event_id: guest.event_id,
        role: 'guest',
        email: guest.email
      };
      await AsyncStorage.setItem('guestSession', JSON.stringify(session));
      // Optionally: fetch guest profile or event data here
      onLogin(session);
    } catch (error) {
      console.log('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  const fillTestCredentials = (type: 'admin' | 'guest') => {
    if (type === 'admin') {
      setAdminEmail('charles.morgan@testcompany.com')
      setAdminPassword('charles123')
    } else {
      setGuestEmail('guest@example.com')
      setGuestPassword('guest123')
    }
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 340 }}>
            {/* TIMELY title */}
            <Text style={{
              color: '#fff',
              fontSize: 32,
              fontWeight: 'bold',
              fontFamily: 'Poppins_700Bold',
              textAlign: 'center',
              letterSpacing: 8,
              marginTop: 0,
              marginBottom: 70,
            }}>TIMELY</Text>
            {/* Admin/Guest Tabs */}
            <View style={{ flexDirection: 'row', width: '100%', marginBottom: 32 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: activeTab === 'admin' ? '#fff' : '#111',
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  borderWidth: 1,
                  borderColor: '#222',
                }}
                onPress={() => setActiveTab('admin')}
              >
                <Text style={{
                  color: activeTab === 'admin' ? '#000' : '#fff',
                  fontWeight: '700',
                  fontFamily: 'Poppins_700Bold',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>Admin Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: activeTab === 'guest' ? '#fff' : '#111',
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  borderWidth: 1,
                  borderColor: '#222',
                }}
                onPress={() => setActiveTab('guest')}
              >
                <Text style={{
                  color: activeTab === 'guest' ? '#000' : '#fff',
                  fontWeight: '700',
                  fontFamily: 'Poppins_700Bold',
                  fontSize: 16,
                  letterSpacing: 1,
                }}>Guest Login</Text>
              </TouchableOpacity>
            </View>
            {/* Email field */}
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>Email</Text>
            <TextInput
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#111',
                color: '#fff',
                borderRadius: 8,
                paddingHorizontal: 12,
                marginBottom: 20,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#222',
              }}
              placeholder="example@xyz.com"
              placeholderTextColor="#888"
              value={activeTab === 'admin' ? adminEmail : guestEmail}
              onChangeText={activeTab === 'admin' ? setAdminEmail : setGuestEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {/* Password field */}
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>Password</Text>
            <TextInput
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#111',
                color: '#fff',
                borderRadius: 8,
                paddingHorizontal: 12,
                marginBottom: 28,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#222',
              }}
              placeholder="······"
              placeholderTextColor="#888"
              value={activeTab === 'admin' ? adminPassword : guestPassword}
              onChangeText={activeTab === 'admin' ? setAdminPassword : setGuestPassword}
              secureTextEntry
            />
            {/* Login button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#fff',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
              onPress={activeTab === 'admin' ? handleAdminLogin : handleGuestLogin}
              disabled={loading}
            >
              <Text style={{ color: '#000', fontSize: 18, fontWeight: '700' }}>{loading ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>
            {/* Forgot password */}
            <Text style={{ color: '#fff', fontSize: 15, textAlign: 'center', marginTop: 18 }}>
              Forgot Password? <Text style={{ fontWeight: '700' }}>Contact your event host.</Text>
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCardModern: {
    width: 360,
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#fff',
    shadowOpacity: 0.10,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
  },
  tabPillGroupModern: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  tabPillModern: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tabPillModernLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  tabPillModernRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  tabPillModernActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: '#fff',
  },
  tabPillModernInactive: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tabPillModernText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.7,
  },
  tabPillModernTextActive: {
    color: '#fff',
    opacity: 1,
    fontWeight: '700',
  },
  inputBoxModern: {
    marginTop: 18,
    width: '100%',
  },
  labelModern: {
    color: '#fff',
    marginBottom: 7,
    fontSize: 16,
    opacity: 0.8,
  },
  inputModernWrapper: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 0,
    overflow: 'hidden',
  },
  inputModern: {
    width: '100%',
    height: 48,
    color: '#fff',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 17,
    borderWidth: 0,
    marginBottom: 0,
  },
  loginButtonModernWrapper: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    marginTop: 32,
    marginBottom: 18,
  },
  loginButtonModern: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  loginButtonModernText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  forgotModern: {
    color: '#fff',
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
  forgotModernLink: {
    color: '#fff',
    fontWeight: '700',
    opacity: 1,
  },
}) 