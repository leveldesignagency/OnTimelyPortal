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
} from 'react-native'
import { signIn, signInAsGuest } from '../lib/auth'

interface LoginScreenProps {
  onLogin: (user: any) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'admin' | 'guest'>('admin')
  // Admin login state
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  // Guest login state
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPassword, setGuestPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      Alert.alert('Error', 'Please enter both email and password')
      return
    }
    setLoading(true)
    try {
      const { user, error } = await signInAsGuest(guestEmail, guestPassword)
      if (error) {
        Alert.alert('Guest Login Failed', error.message)
      } else if (user) {
        onLogin(user)
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Timely</Text>
          <Text style={styles.subtitle}>Event Management</Text>
        </View>
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
            onPress={() => setActiveTab('admin')}
          >
            <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>
              Admin Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'guest' && styles.activeTab]}
            onPress={() => setActiveTab('guest')}
          >
            <Text style={[styles.tabText, activeTab === 'guest' && styles.activeTabText]}>
              Guest Login
            </Text>
          </TouchableOpacity>
        </View>
        {/* Admin Login Form */}
        {activeTab === 'admin' && (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Agency Admin</Text>
              <Text style={styles.formSubtitle}>
                Login with your agency credentials
              </Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@company.com"
                value={adminEmail}
                onChangeText={setAdminEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={adminPassword}
                onChangeText={setAdminPassword}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleAdminLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => fillTestCredentials('admin')}
            >
              <Text style={styles.testButtonText}>Fill Test Credentials</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Guest Login Form */}
        {activeTab === 'guest' && (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Guest</Text>
              <Text style={styles.formSubtitle}>
                Login with your guest credentials
              </Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="guest@event.com"
                value={guestEmail}
                onChangeText={setGuestEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={guestPassword}
                onChangeText={setGuestPassword}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleGuestLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => fillTestCredentials('guest')}
            >
              <Text style={styles.testButtonText}>Fill Test Credentials</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#1f2937',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  testButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
}) 