import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushTokenData {
  id?: string;
  user_id: string;
  guest_id?: string;
  expo_push_token: string;
  device_id: string;
  platform: 'ios' | 'android';
  created_at?: string;
  updated_at?: string;
}

class PushNotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications and get token
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID, // Make sure this is set in your app.json
      });

      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);

      // Set up notification listeners
      this.setupNotificationListeners();

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Save push token to Supabase
  async savePushTokenToSupabase(userId: string, guestId?: string): Promise<boolean> {
    try {
      if (!this.expoPushToken) {
        console.log('No push token available');
        return false;
      }

      // Use a unique identifier for the device since getDeviceIdAsync is deprecated
      const deviceId = `${Platform.OS}-${Device.deviceName || 'unknown'}-${Date.now()}`;
      const platform = Platform.OS as 'ios' | 'android';

      const tokenData: PushTokenData = {
        user_id: userId,
        guest_id: guestId,
        expo_push_token: this.expoPushToken,
        device_id: deviceId,
        platform,
      };

      // Check if token already exists for this device
      const { data: existingToken } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .single();

      if (existingToken) {
        // Update existing token
        const { error } = await supabase
          .from('user_push_tokens')
          .update({
            expo_push_token: this.expoPushToken,
            guest_id: guestId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('Error updating push token:', error);
          return false;
        }
      } else {
        // Insert new token
        const { error } = await supabase
          .from('user_push_tokens')
          .insert([tokenData]);

        if (error) {
          console.error('Error saving push token:', error);
          return false;
        }
      }

      console.log('Push token saved to Supabase successfully');
      return true;
    } catch (error) {
      console.error('Error saving push token to Supabase:', error);
      return false;
    }
  }

  // Set up notification listeners
  private setupNotificationListeners() {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // You can update your app state here if needed
    });

    // Handle notification response (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      // Handle navigation based on notification data
      this.handleNotificationResponse(response);
    });

    // Return cleanup function
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  // Handle notification response (navigation)
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data?.type === 'module') {
      // Navigate to timeline or specific module
      // You'll need to implement navigation logic here
      console.log('Navigate to module:', data.moduleId);
    }
  }

  // Get current push token
  getCurrentToken(): string | null {
    return this.expoPushToken;
  }

  // Clear badge count
  async clearBadgeCount(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const pushNotificationService = new PushNotificationService(); 