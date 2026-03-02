import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getNotificationNudgeEnabled,
  setNotificationNudgeEnabled as persistNotificationNudgeEnabled,
} from "@/utils/notification-nudge-preference";

type NotificationNudgePreferenceContextValue = {
  enabled: boolean;
  isLoaded: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
};

const NotificationNudgePreferenceContext =
  createContext<NotificationNudgePreferenceContextValue | undefined>(undefined);

export function NotificationNudgePreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabledState] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getNotificationNudgeEnabled().then((value) => {
      setEnabledState(value);
      setIsLoaded(true);
    });
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    setEnabledState(value);
    await persistNotificationNudgeEnabled(value);
  }, []);

  const value = useMemo<NotificationNudgePreferenceContextValue>(
    () => ({ enabled, isLoaded, setEnabled }),
    [enabled, isLoaded, setEnabled],
  );

  return (
    <NotificationNudgePreferenceContext.Provider value={value}>
      {children}
    </NotificationNudgePreferenceContext.Provider>
  );
}

export function useNotificationNudgePreference() {
  const ctx = useContext(NotificationNudgePreferenceContext);
  if (ctx === undefined) {
    throw new Error(
      "useNotificationNudgePreference must be used within NotificationNudgePreferenceProvider",
    );
  }
  return ctx;
}
