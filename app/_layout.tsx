import {
    ENABLE_REVENUECAT,
    isNativeModuleAvailable,
    LOG_LEVEL,
    Purchases,
} from "@/utils/revenuecat-wrapper";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, InteractionManager, Platform, View } from "react-native";
import "react-native-reanimated";

import { AIModal } from "@/components/ai-modal";
import { HomeTransitionLoaderOverlay } from "@/components/home-transition-loader";
import { getPendingAIResponse, type PendingAIResponse } from "@/utils/ai-background-processor";
import { AIInsightsConsentProvider } from "@/utils/AIInsightsConsentProvider";
import { NotificationNudgePreferenceProvider } from "@/utils/NotificationNudgePreferenceProvider";
import { initializeAppCheckService, verifyAppCheck } from "@/utils/app-check";
import { handleDevError } from "@/utils/dev-error-handler";
import { scheduleEventMemoryReminders, seedMockPastEventsForDev } from "@/utils/event-memory-reminders";
import {
  getEventGoldenMemoryUsedIds,
  getOrCreateEventReminderSchedule,
  getPastAttendedEvents,
  incrementEventReminderInAppShownCount,
  parseEventStartDate,
} from "@/utils/sfera-events";
import { HomeTransitionLoaderProvider } from "@/utils/home-transition-loader-context";
import { InAppNotificationProvider, useInAppNotification } from "@/utils/InAppNotificationProvider";
import { SferaEventsBadgeProvider } from "@/utils/SferaEventsBadgeProvider";
import { checkForUpdateAndReload } from "@/utils/updates";
import { JourneyProvider } from "@/utils/JourneyProvider";
import { MomentColorsProvider } from "@/utils/MomentColorsProvider";
import { MomentNotificationProvider } from "@/utils/MomentNotificationProvider";
import { VisualSettingsProvider } from "@/utils/VisualSettingsProvider";
import { LanguageProvider } from "@/utils/languages/language-context";
import { NotificationsProvider } from "@/utils/NotificationsProvider";
import {
    SplashAnimationProvider,
    useSplash,
} from "@/utils/SplashAnimationProvider";
import { SubscriptionProvider } from "@/utils/SubscriptionProvider";
import {
    ThemeProvider as AppThemeProvider,
    useTheme,
} from "@/utils/ThemeContext";
// Firebase is automatically initialized via Expo plugin (@react-native-firebase/app)
// App Check is initialized in AppContent component

// Load notification test utilities in dev mode
if (__DEV__) {
  import("../scripts/test-notification");
}

// Hide native splash immediately when this module loads
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const { hideSplash, isAnimationComplete } = useSplash();
  const { colorScheme } = useTheme();
  const { showNotification: showInAppNotification } = useInAppNotification();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const lastEventReminderShownAtRef = useRef<number>(0);
  const nextReminderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When set, show AI Create memory modal with golden access (from event memory reminder). No navigation to Events tab. */
  const [goldenEventIdForMemoryModal, setGoldenEventIdForMemoryModal] = useState<string | null>(null);
  const [pendingAIResponseForModal, setPendingAIResponseForModal] = useState<PendingAIResponse | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      // Initialize Firebase App Check first (required before other Firebase services)
      try {
        await initializeAppCheckService();
        // Explicitly verify App Check after initialization
        await verifyAppCheck();
      } catch (error) {
        // App Check errors are non-fatal - app can continue
        handleDevError(error, "App Check Initialization");
      }

      // RevenueCat is configured in RootLayout so it's ready before SubscriptionProvider
    };

    initializeServices();
  }, []);

  // Dev: seed mock past events for in-app reminder testing (up to 3 reminders per event)
  useEffect(() => {
    if (!__DEV__) return;
    seedMockPastEventsForDev().catch((e) => console.warn("[Event memory reminders] Dev: seed error:", e));
  }, []);

  // EAS Update: check for OTA on launch (after splash) and when app comes to foreground
  useEffect(() => {
    if (!isAnimationComplete) return;
    const t = setTimeout(() => {
      void checkForUpdateAndReload();
    }, 2000);
    return () => clearTimeout(t);
  }, [isAnimationComplete]);

  const showEventMemoryReminderIfNeeded = useCallback((skipThrottle?: boolean) => {
    const now = Date.now();
    if (!skipThrottle && now - lastEventReminderShownAtRef.current < 10_000) return; // throttle 10s unless showing next at due time
    getPastAttendedEvents()
      .then((past) => Promise.all([Promise.resolve(past), getEventGoldenMemoryUsedIds()]))
      .then(async ([past, goldenUsed]) => {
        for (const event of past) {
          if (goldenUsed.has(event.id)) {
            if (__DEV__) console.log("[Event memory] Skipping event", event.id, `"${event.name}" – already linked with memory (no notifications)`);
            continue;
          }
          const { schedule } = await getOrCreateEventReminderSchedule(event);
          if (schedule.shownCount >= 3) {
            if (__DEV__) console.log("[Event memory] Skipping event", event.id, `"${event.name}" – already shown 3/3 reminders`);
            continue;
          }
          const nextDue = schedule.dueTimes[schedule.shownCount];
          if (now < nextDue) {
            // Not yet due (e.g. dev: first reminder in 1 min). Schedule check at due time.
            const delay = Math.max(0, nextDue - now);
            if (__DEV__) console.log("[Event memory] Next reminder for", event.id, `"${event.name}" in ${Math.round(delay / 1000)}s (reminder ${schedule.shownCount + 1}/3)`);
            if (nextReminderTimeoutRef.current) clearTimeout(nextReminderTimeoutRef.current);
            nextReminderTimeoutRef.current = setTimeout(() => {
              nextReminderTimeoutRef.current = null;
              showEventMemoryReminderIfNeeded(true);
            }, delay);
            return;
          }
          lastEventReminderShownAtRef.current = now;
          const newCount = await incrementEventReminderInAppShownCount(event.id);
          if (__DEV__) console.log("[Event memory] Showing in-app reminder for event:", event.id, `"${event.name}" (reminder ${newCount}/3)`);
          const title = "Create a memory for your event";
          const message = `You attended "${event.name}". Create a memory with AI.`;
          const eventDate = parseEventStartDate(event.startDate) ?? undefined;
          showInAppNotification({
            title,
            message,
            ...(eventDate ? { eventDate } : { emoji: "📅" }),
            trailingIcon: "auto-awesome",
            duration: 0,
            dismissOnPress: false,
            onPress: () => {
              InteractionManager.runAfterInteractions(() => {
                setGoldenEventIdForMemoryModal(event.id);
                getPendingAIResponse().then(setPendingAIResponseForModal);
              });
            },
            onDismiss: undefined, // next reminder fires at its due time (timeout or next app active)
          });
          // Schedule the next reminder at its due time (dev: 1 min later; prod: next day 10:00)
          if (newCount < 3) {
            const delay = Math.max(0, schedule.dueTimes[newCount] - Date.now());
            if (nextReminderTimeoutRef.current) clearTimeout(nextReminderTimeoutRef.current);
            nextReminderTimeoutRef.current = setTimeout(() => {
              nextReminderTimeoutRef.current = null;
              showEventMemoryReminderIfNeeded(true);
            }, delay);
          }
          return;
        }
      });
  }, [showInAppNotification]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void checkForUpdateAndReload();
        void scheduleEventMemoryReminders();
        showEventMemoryReminderIfNeeded();
      }
    });
    return () => sub.remove();
  }, [showEventMemoryReminderIfNeeded]);

  // On first app open, show reminder after a short delay (AppState may not fire "change" on initial load)
  useEffect(() => {
    const t = setTimeout(() => {
      showEventMemoryReminderIfNeeded();
    }, 3000);
    return () => clearTimeout(t);
  }, [showEventMemoryReminderIfNeeded]);

  useEffect(() => {
    return () => {
      if (nextReminderTimeoutRef.current) {
        clearTimeout(nextReminderTimeoutRef.current);
        nextReminderTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Wait for animation to complete, then hide splash
    // Animation sequence: 1.6s pulse + 2.5s split = 4.1s
    // Add small buffer for smooth transition
    if (isAnimationComplete) {
      // Animation is done, hide after a brief moment to see final state
      const timer = setTimeout(() => {
        hideSplash();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Fallback: hide after maximum expected time (5s) if animation doesn't complete
      const fallbackTimer = setTimeout(() => {
        hideSplash();
      }, 5000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [hideSplash, isAnimationComplete]);

  // Handle notification deep linking (tap when app in background) and cold start (entity reminders only; event memory is in-app only).
  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const content = response.notification.request.content;
      const data = content.data as {
        type?: string;
        entityId?: string;
        sphere?: string;
      };
      if (data.type === "entity_reminder" && data.entityId && data.sphere) {
        InteractionManager.runAfterInteractions(() => {
          router.replace(`/notifications/${data.sphere}/${data.entityId}`);
        });
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-ex-profile" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="add-job" options={{ headerShown: false }} />
        <Stack.Screen name="edit-job" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-family-member"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-family-member"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="edit-friend" options={{ headerShown: false }} />
        <Stack.Screen name="edit-hobby" options={{ headerShown: false }} />
        <Stack.Screen name="add-friend" options={{ headerShown: false }} />
        <Stack.Screen name="add-hobby" options={{ headerShown: false }} />
        <Stack.Screen
          name="idealized-memories"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="add-idealized-memory"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="relationships-comparison"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="career-comparison"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="family-comparison"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="friends-comparison"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="hobbies-comparison"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="relationship-detail"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="job-detail" options={{ headerShown: false }} />
        <Stack.Screen
          name="family-member-detail"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="friend-detail" options={{ headerShown: false }} />
        <Stack.Screen name="hobby-detail" options={{ headerShown: false }} />
        <Stack.Screen name="insights" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="notifications/[sphere]/[entityId]"
          options={{
            headerShown: false,
            animation: "none",
          }}
        />
        <Stack.Screen
          name="moment-notifications"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="premium-info" options={{ headerShown: false }} />
        <Stack.Screen name="moment-colors" options={{ headerShown: false }} />
        <Stack.Screen name="cosmic-app-look" options={{ headerShown: false }} />
        <Stack.Screen name="personalization" options={{ headerShown: false }} />
        <Stack.Screen name="backup" options={{ headerShown: false }} />
        <Stack.Screen name="backup/import" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      {goldenEventIdForMemoryModal != null && (
        <AIModal
          visible
          onClose={() => {
            setGoldenEventIdForMemoryModal(null);
            setPendingAIResponseForModal(null);
          }}
          onSend={async () => {}}
          pendingResponse={pendingAIResponseForModal}
          goldenEventId={goldenEventIdForMemoryModal}
        />
      )}
      </>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Configure RevenueCat first so it's ready before SubscriptionProvider's useEffect runs.
  // SubscriptionProvider is a descendant and calls getOfferings/getCustomerInfo on mount.
  useEffect(() => {
    if (
      ENABLE_REVENUECAT &&
      isNativeModuleAvailable &&
      Purchases &&
      LOG_LEVEL
    ) {
      try {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);
        const iosApiKey = "appl_DEXthnrRgJUgeRHbnAqcepQbhkl";
        const androidApiKey = "test_bwsKZRrhzegZZheOpaNyrIYYLmW";
        if (Platform.OS === "ios") {
          Purchases.configure({ apiKey: iosApiKey });
        } else if (Platform.OS === "android") {
          Purchases.configure({ apiKey: androidApiKey });
        }
      } catch (error) {
        handleDevError(error, "RevenueCat Initialization");
      }
    }
  }, []);

  // Don't hide native splash here - let SplashAnimationProvider handle it
  // This prevents race conditions with the animation provider

  return (
    <AppThemeProvider>
      <SplashAnimationProvider>
        <LanguageProvider>
          <SubscriptionProvider>
            <JourneyProvider>
              <MomentNotificationProvider>
              <MomentColorsProvider>
                <VisualSettingsProvider>
                <NotificationsProvider>
                  <AIInsightsConsentProvider>
                    <NotificationNudgePreferenceProvider>
                    <HomeTransitionLoaderProvider>
                      <View style={{ flex: 1 }}>
                        <InAppNotificationProvider>
                          <SferaEventsBadgeProvider>
                            <AppContent />
                          </SferaEventsBadgeProvider>
                        </InAppNotificationProvider>
                        <HomeTransitionLoaderOverlay />
                      </View>
                    </HomeTransitionLoaderProvider>
                    </NotificationNudgePreferenceProvider>
                  </AIInsightsConsentProvider>
                </NotificationsProvider>
                </VisualSettingsProvider>
              </MomentColorsProvider>
              </MomentNotificationProvider>
            </JourneyProvider>
          </SubscriptionProvider>
        </LanguageProvider>
      </SplashAnimationProvider>
    </AppThemeProvider>
  );
}
