import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Announcement {
  id: string;
  event_id: string;
  company_id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  scheduled_for?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

class AnnouncementService {
  private static instance: AnnouncementService;
  private lastAnnouncementId: string | null = null;
  private isInitialized = false;

  static getInstance(): AnnouncementService {
    if (!AnnouncementService.instance) {
      AnnouncementService.instance = new AnnouncementService();
    }
    return AnnouncementService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    // Load last seen announcement ID
    this.lastAnnouncementId = await AsyncStorage.getItem('lastAnnouncementId');
    
    // Set up push notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    this.isInitialized = true;
  }

  async getAnnouncements(eventId: string): Promise<Announcement[]> {
    try {
      console.log('[announcementService] Getting announcements for eventId:', eventId);
      
      // Use RPC function for guests (similar to guest chat)
      const { data, error } = await supabase
        .rpc('get_guest_announcements', {
          p_event_id: eventId
        });

      if (error) {
        console.error('[announcementService] RPC error:', error);
        throw error;
      }
      
      console.log('[announcementService] Retrieved announcements:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('[announcementService] Error fetching announcements:', error);
      return [];
    }
  }

  async subscribeToAnnouncements(eventId: string, onNewAnnouncement: (announcement: Announcement) => void) {
    try {
      console.log('[announcementService] Subscribing to announcements for eventId:', eventId);
      
      // For real-time, we need to subscribe to the table directly
      // But we'll filter by event_id in the callback
      const subscription = supabase
        .channel(`announcements-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements',
          },
          (payload) => {
            console.log('[announcementService] Received real-time announcement:', payload);
            const newAnnouncement = payload.new as Announcement;
            
            // Only process announcements for this specific event
            if (newAnnouncement.event_id === eventId) {
              console.log('[announcementService] Announcement matches eventId:', eventId);
              
              // Check if this is a new announcement
              if (this.lastAnnouncementId !== newAnnouncement.id) {
                console.log('[announcementService] New announcement detected:', newAnnouncement.id);
                this.lastAnnouncementId = newAnnouncement.id;
                AsyncStorage.setItem('lastAnnouncementId', newAnnouncement.id);
                
                // Trigger callback
                onNewAnnouncement(newAnnouncement);
                
                // Send push notification if app is in background
                this.sendPushNotification(newAnnouncement);
              } else {
                console.log('[announcementService] Duplicate announcement ignored:', newAnnouncement.id);
              }
            } else {
              console.log('[announcementService] Announcement for different event, ignoring');
            }
          }
        )
        .subscribe();

      console.log('[announcementService] Subscription created successfully');
      
      // Ensure we return a proper subscription object
      if (subscription && typeof subscription.unsubscribe === 'function') {
        return subscription;
      } else {
        console.error('[announcementService] Invalid subscription returned');
        return null;
      }
    } catch (error) {
      console.error('[announcementService] Error subscribing to announcements:', error);
      return null;
    }
  }

  private async sendPushNotification(announcement: Announcement) {
    try {
      // Always send push notification for announcements
      // The system will handle whether to show it based on app state
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Announcement',
          body: announcement.title,
          data: { 
            type: 'announcement',
            announcementId: announcement.id,
            eventId: announcement.event_id 
          },
        },
        trigger: null, // Send immediately
      });
      
      console.log('[announcementService] Push notification sent for announcement:', announcement.id);
    } catch (error) {
      console.error('[announcementService] Error sending push notification:', error);
    }
  }

  async markAnnouncementAsRead(announcementId: string) {
    try {
      await AsyncStorage.setItem(`announcement_${announcementId}_read`, 'true');
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  }

  async isAnnouncementRead(announcementId: string): Promise<boolean> {
    try {
      const read = await AsyncStorage.getItem(`announcement_${announcementId}_read`);
      return read === 'true';
    } catch (error) {
      console.error('Error checking announcement read status:', error);
      return false;
    }
  }

  async getUnreadAnnouncements(eventId: string): Promise<Announcement[]> {
    try {
      const announcements = await this.getAnnouncements(eventId);
      const unreadAnnouncements: Announcement[] = [];

      for (const announcement of announcements) {
        const isRead = await this.isAnnouncementRead(announcement.id);
        if (!isRead) {
          unreadAnnouncements.push(announcement);
        }
      }

      return unreadAnnouncements;
    } catch (error) {
      console.error('Error getting unread announcements:', error);
      return [];
    }
  }

  async clearAnnouncementHistory(eventId: string) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const announcementKeys = keys.filter(key => 
        key.startsWith('announcement_') || key === 'lastAnnouncementId'
      );
      await AsyncStorage.multiRemove(announcementKeys);
    } catch (error) {
      console.error('Error clearing announcement history:', error);
    }
  }
}

export default AnnouncementService.getInstance(); 