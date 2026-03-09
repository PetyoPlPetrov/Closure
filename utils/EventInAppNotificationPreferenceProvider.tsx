import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getEventInAppNotificationsEnabled,
  setEventInAppNotificationsEnabled as persistEventInAppNotificationsEnabled,
} from "@/utils/event-in-app-notification-preference";

type EventInAppNotificationPreferenceContextValue = {
  enabled: boolean;
  isLoaded: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
};

const EventInAppNotificationPreferenceContext =
  createContext<EventInAppNotificationPreferenceContextValue | undefined>(
    undefined,
  );

export function EventInAppNotificationPreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabledState] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getEventInAppNotificationsEnabled().then((value) => {
      setEnabledState(value);
      setIsLoaded(true);
    });
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    setEnabledState(value);
    await persistEventInAppNotificationsEnabled(value);
  }, []);

  const value = useMemo<EventInAppNotificationPreferenceContextValue>(
    () => ({ enabled, isLoaded, setEnabled }),
    [enabled, isLoaded, setEnabled],
  );

  return (
    <EventInAppNotificationPreferenceContext.Provider value={value}>
      {children}
    </EventInAppNotificationPreferenceContext.Provider>
  );
}

export function useEventInAppNotificationPreference() {
  const ctx = useContext(EventInAppNotificationPreferenceContext);
  if (ctx === undefined) {
    throw new Error(
      "useEventInAppNotificationPreference must be used within EventInAppNotificationPreferenceProvider",
    );
  }
  return ctx;
}
