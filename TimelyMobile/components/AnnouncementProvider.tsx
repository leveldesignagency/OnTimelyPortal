import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import AnnouncementNotification from './AnnouncementNotification';
import announcementService, { Announcement } from '../lib/announcementService';

interface AnnouncementContextType {
  currentAnnouncement: Announcement | null;
  showAnnouncement: (announcement: Announcement) => void;
  hideAnnouncement: () => void;
  navigateToChat: () => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

interface AnnouncementProviderProps {
  children: ReactNode;
  eventId?: string;
}

export function AnnouncementProvider({ children, eventId }: AnnouncementProviderProps) {
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    console.log('[AnnouncementProvider] eventId:', eventId);
    if (!eventId) {
      console.log('[AnnouncementProvider] No eventId provided');
      return;
    }

    console.log('[AnnouncementProvider] Initializing with eventId:', eventId);
    
    // Initialize announcement service
    announcementService.initialize();

    // Subscribe to new announcements
    const subscription = announcementService.subscribeToAnnouncements(
      eventId,
      (announcement) => {
        console.log('[AnnouncementProvider] Received new announcement:', announcement);
        
        // Only show notification if user is logged in (app is active)
        // Push notifications will handle when app is background/closed
        setCurrentAnnouncement(announcement);
        setShowNotification(true);
      }
    );

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [eventId]);

  const showAnnouncement = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setShowNotification(true);
  };

  const hideAnnouncement = () => {
    setShowNotification(false);
    if (currentAnnouncement) {
      announcementService.markAnnouncementAsRead(currentAnnouncement.id);
    }
  };

  const navigateToChat = () => {
    // This will be handled by the parent component
    // The parent can listen to this context and navigate accordingly
    hideAnnouncement();
  };

  const contextValue: AnnouncementContextType = {
    currentAnnouncement,
    showAnnouncement,
    hideAnnouncement,
    navigateToChat,
  };

  return (
    <AnnouncementContext.Provider value={contextValue}>
      {children}
      
      {/* Global announcement notification */}
      {showNotification && currentAnnouncement && (
        <AnnouncementNotification
          announcement={currentAnnouncement}
          onClose={hideAnnouncement}
          onViewInChat={navigateToChat}
        />
      )}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncements() {
  const context = useContext(AnnouncementContext);
  if (context === undefined) {
    throw new Error('useAnnouncements must be used within an AnnouncementProvider');
  }
  return context;
} 