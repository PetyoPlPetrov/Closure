/**
 * In-App Notification Provider
 * Manages showing celebration notifications within the app
 */

import { InAppNotification } from '@/components/in-app-notification';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface NotificationData {
  title: string;
  message: string;
  emoji?: string;
  duration?: number;
}

interface InAppNotificationContextType {
  showNotification: (data: NotificationData) => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [visible, setVisible] = useState(false);

  const showNotification = useCallback((data: NotificationData) => {
    setNotification(data);
    setVisible(true);
  }, []);

  const hideNotification = useCallback(() => {
    setVisible(false);
    // Clear notification data after animation completes
    setTimeout(() => setNotification(null), 300);
  }, []);

  return (
    <InAppNotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <InAppNotification
          visible={visible}
          title={notification.title}
          message={notification.message}
          emoji={notification.emoji}
          onHide={hideNotification}
          duration={notification.duration}
        />
      )}
    </InAppNotificationContext.Provider>
  );
}

export function useInAppNotification() {
  const context = useContext(InAppNotificationContext);
  if (!context) {
    throw new Error('useInAppNotification must be used within InAppNotificationProvider');
  }
  return context;
}
