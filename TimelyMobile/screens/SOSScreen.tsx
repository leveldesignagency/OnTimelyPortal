import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface SOSScreenProps {
  navigation?: any;
}

export default function SOSScreen({ navigation }: SOSScreenProps) {
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: 'Host', phone: '+1234567890', type: 'host' },
    { name: 'Emergency Services', phone: '911', type: 'emergency' },
  ]);

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for SOS features.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: [number, number] = [location.coords.longitude, location.coords.latitude];
      setUserLocation(coords);
      return coords;
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location.');
      return null;
    }
  };

  // Send safety beacon to host
  const sendSafetyBeacon = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const location = await getCurrentLocation();
      
      if (location) {
        // Create safety beacon message with location
        const beaconMessage = `SAFETY BEACON: I need assistance. My location: https://maps.google.com/?q=${location[1]},${location[0]}`;
        
        // Find host contact
        const hostContact = emergencyContacts.find(contact => contact.type === 'host');
        
        if (hostContact) {
          // Send SMS to host (in real app, this would integrate with your backend)
          const smsUrl = `sms:${hostContact.phone}?body=${encodeURIComponent(beaconMessage)}`;
          
          if (await Linking.canOpenURL(smsUrl)) {
            await Linking.openURL(smsUrl);
            Alert.alert(
              'Safety Beacon Sent',
              'Your safety beacon has been sent to your host with your current location.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Safety Beacon',
              beaconMessage,
              [{ text: 'OK' }]
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending safety beacon:', error);
      Alert.alert('Error', 'Failed to send safety beacon. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Emergency SOS function
  const triggerEmergencySOS = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const location = await getCurrentLocation();
      
      if (location) {
        // Create emergency message with location
        const emergencyMessage = `EMERGENCY SOS: I need immediate help. My location: https://maps.google.com/?q=${location[1]},${location[0]}`;
        
        // Show confirmation dialog
        Alert.alert(
          'EMERGENCY SOS',
          'Are you sure you want to contact emergency services? This will call 911 and send your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'CALL 911',
              style: 'destructive',
              onPress: async () => {
                try {
                  // Call emergency services
                  const phoneNumber = Platform.OS === 'ios' ? '911' : 'tel:911';
                  
                  if (await Linking.canOpenURL(phoneNumber)) {
                    await Linking.openURL(phoneNumber);
                    
                    // Also send SMS with location to emergency services
                    const smsUrl = `sms:911?body=${encodeURIComponent(emergencyMessage)}`;
                    setTimeout(async () => {
                      if (await Linking.canOpenURL(smsUrl)) {
                        await Linking.openURL(smsUrl);
                      }
                    }, 2000); // Delay to allow call to connect first
                  } else {
                    Alert.alert(
                      'Emergency Services',
                      `Call 911 immediately and provide this location: ${location[1]}, ${location[0]}`,
                      [{ text: 'OK' }]
                    );
                  }
                } catch (error) {
                  console.error('Error calling emergency services:', error);
                  Alert.alert('Error', 'Failed to call emergency services. Please call 911 manually.');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error triggering emergency SOS:', error);
      Alert.alert('Error', 'Failed to get location for emergency SOS.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get emergency number based on country (simplified)
  const getEmergencyNumber = () => {
    // In a real app, you'd detect the user's country and return the appropriate number
    return '911'; // Default to US emergency number
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Emergency</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Safety Beacon Button */}
        <TouchableOpacity
          style={[styles.sosButton, styles.safetyButton]}
          onPress={sendSafetyBeacon}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonIcon}>
              <Ionicons name="shield-checkmark" size={48} color="#fff" />
            </View>
            <Text style={styles.buttonTitle}>Safety Beacon</Text>
            <Text style={styles.buttonSubtitle}>
              Send location to your host for assistance
            </Text>
          </View>
        </TouchableOpacity>

        {/* Emergency SOS Button */}
        <TouchableOpacity
          style={[styles.sosButton, styles.emergencyButton]}
          onPress={triggerEmergencySOS}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonIcon}>
              <Ionicons name="warning" size={48} color="#fff" />
            </View>
            <Text style={styles.buttonTitle}>EMERGENCY SOS</Text>
            <Text style={styles.buttonSubtitle}>
              Call emergency services with location
            </Text>
          </View>
        </TouchableOpacity>

        {/* Status Info */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {userLocation ? '📍 Location available' : '📍 Getting location...'}
          </Text>
          <Text style={styles.statusText}>
            Emergency number: {getEmergencyNumber()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20', // Match app background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#23242b', // Match app header
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 30,
  },
  sosButton: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    // 3D button effects
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    // Gradient-like effect with multiple shadows
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  safetyButton: {
    backgroundColor: '#007AFF',
    // Additional 3D effects for blue button
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    // Additional 3D effects for red button
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonContent: {
    alignItems: 'center',
    gap: 16,
  },
  buttonIcon: {
    marginBottom: 8,
    // Icon 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    // Text shadow for 3D effect
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonSubtitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: 20,
    // Text shadow for 3D effect
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    // Status container 3D effect
    backgroundColor: '#23242b',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statusText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
}); 