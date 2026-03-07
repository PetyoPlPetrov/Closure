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
  /** When set, tapping the notification (not the close button) calls this. If dismissOnPress is true, notification is hidden after. */
  onPress?: () => void;
  /** If true (default), tapping the notification content hides it after onPress. If false, notification stays until user dismisses or you call hideNotification. */
  dismissOnPress?: boolean;
  /** When set, called when the user dismisses via the X button (before hiding). Use to e.g. show the next reminder in a sequence. */
  onDismiss?: () => void;
}

interface InAppNotificationContextType {
  showNotification: (data: NotificationData) => void;
  hideNotification: () => void;
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
    <InAppNotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      {notification && (
        <InAppNotification
          visible={visible}
          title={notification.title}
          message={notification.message}
          emoji={notification.emoji}
          onHide={hideNotification}
          duration={notification.duration}
          onPress={notification.onPress}
          dismissOnPress={notification.dismissOnPress}
          onDismiss={notification.onDismiss}
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
