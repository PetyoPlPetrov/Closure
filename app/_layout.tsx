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
import { router, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  InteractionManager,
  Linking,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AIInsightsConsentModal } from "@/components/ai-insights-consent-modal";
import { AIModal } from "@/components/ai-modal";
import { HomeTransitionLoaderOverlay } from "@/components/home-transition-loader";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import {
  getPendingAIResponse,
  type PendingAIResponse,
} from "@/utils/ai-background-processor";
import { onAIButtonPress } from "@/utils/ai-button-press";
import { sendToAI } from "@/utils/ai-service";
import { AIInsightsConsentProvider, useAIInsightsConsent } from "@/utils/AIInsightsConsentProvider";
import { AIMemoryModalContext } from "@/utils/AIMemoryModalContext";
import { initializeAppCheckService, verifyAppCheck } from "@/utils/app-check";
import { handleDevError } from "@/utils/dev-error-handler";
import { scheduleEventMemoryReminders } from "@/utils/event-memory-reminders";
import { HomeTransitionLoaderProvider } from "@/utils/home-transition-loader-context";
import {
  InAppNotificationProvider,
  useInAppNotification,
} from "@/utils/InAppNotificationProvider";
import { JourneyProvider, useJourney } from "@/utils/JourneyProvider";
import { LanguageProvider } from "@/utils/languages/language-context";
import { MomentColorsProvider } from "@/utils/MomentColorsProvider";
import {
  EventInAppNotificationPreferenceProvider,
  useEventInAppNotificationPreference,
} from "@/utils/EventInAppNotificationPreferenceProvider";
import { MomentNotificationProvider } from "@/utils/MomentNotificationProvider";
import { NotificationsProvider } from "@/utils/NotificationsProvider";
import { OnboardingGateContext } from "@/utils/OnboardingGateContext";
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from "@/utils/onboarding-storage";
import {
  getEventGoldenMemoryUsedIds,
  getOrCreateEventReminderSchedule,
  getPastAttendedEvents,
  incrementEventReminderInAppShownCount,
  parseEventStartDate,
  type SferaEvent,
} from "@/utils/sfera-events";
import { SferaEventsBadgeProvider } from "@/utils/SferaEventsBadgeProvider";
import {
  SplashAnimationProvider,
  useSplash,
} from "@/utils/SplashAnimationProvider";
import { SubscriptionProvider } from "@/utils/SubscriptionProvider";
import {
  ThemeProvider as AppThemeProvider,
  useTheme,
} from "@/utils/ThemeContext";
import { UnsavedChangesProvider } from "@/utils/UnsavedChangesContext";
import { checkForUpdateAndReload } from "@/utils/updates";
import { VisualSettingsProvider } from "@/utils/VisualSettingsProvider";
// Firebase is automatically initialized via Expo plugin (@react-native-firebase/app)
// App Check is initialized in AppContent component

// Load notification test utilities in dev mode
if (__DEV__) {
  import("../scripts/test-notification");
}

// Hide native splash immediately when this module loads
SplashScreen.preventAutoHideAsync();

const appGlobals = globalThis as typeof globalThis & {
  __sferasRevenueCatConfigured?: boolean;
  __sferasRevenueCatConfigInProgress?: boolean;
  __sferasHandledInitialStartupUrl?: boolean;
};

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const pathname = usePathname();
  const { hideSplash, isAnimationComplete } = useSplash();
  const { colorScheme } = useTheme();
  const { showNotification: showInAppNotification } = useInAppNotification();
  const { enabled: eventInAppNotificationsEnabled, isLoaded: eventInAppPrefLoaded } =
    useEventInAppNotificationPreference();
  const { profiles, jobs, familyMembers, friends, hobbies, idealizedMemories } =
    useJourney();
  const aiConsent = useAIInsightsConsent();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [onboardingRequestTrigger, setOnboardingRequestTrigger] = useState(0);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const lastHandledNotificationResponseRef = useRef<{
    key: string;
    handledAt: number;
  } | null>(null);
  const [aiMemoryModalVisible, setAiMemoryModalVisible] = useState(false);
  const [aiConsentModalForAIButton, setAiConsentModalForAIButton] = useState(false);
  const [pendingAIResponseForButton, setPendingAIResponseForButton] =
    useState<PendingAIResponse | null>(null);

  const requestShowOnboarding = useCallback(async () => {
    await setOnboardingCompleted(false);
    setOnboardingRequestTrigger((t) => t + 1);
  }, []);

  const openMemoryModal = useCallback(() => {
    setAiMemoryModalVisible(true);
  }, []);

  // Handle AI button press from any tab
  useEffect(() => {
    const unsubscribe = onAIButtonPress(async () => {
      if (!aiConsent.isEnabled) {
        setAiConsentModalForAIButton(true);
        return;
      }
      const pendingResponse = await getPendingAIResponse();
      if (pendingResponse) {
        setPendingAIResponseForButton(pendingResponse);
      }
      openMemoryModal();
    });
    return () => unsubscribe();
  }, [aiConsent.isEnabled, openMemoryModal]);

  // Auto-open modal when a pending AI response is detected (app resume / cold start)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          const pendingResponse = await getPendingAIResponse();
          if (pendingResponse) {
            setPendingAIResponseForButton(pendingResponse);
            if (!aiMemoryModalVisible) {
              openMemoryModal();
            }
          }
        }
      },
    );
    const checkPending = async () => {
      const pendingResponse = await getPendingAIResponse();
      if (pendingResponse) {
        setPendingAIResponseForButton(pendingResponse);
        if (!aiMemoryModalVisible) {
          openMemoryModal();
        }
      }
    };
    checkPending();
    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lastEventReminderShownAtRef = useRef<number>(0);
  const nextReminderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** When set, show AI Create memory modal with golden access (from event memory reminder). No navigation to Events tab. */
  const [goldenEventIdForMemoryModal, setGoldenEventIdForMemoryModal] =
    useState<string | null>(null);
  const [pendingAIResponseForModal, setPendingAIResponseForModal] =
    useState<PendingAIResponse | null>(null);
  const notFoundRecoveryAttemptsRef = useRef(0);

  // Hard fallback for plain cold start: if app opens via bare custom scheme URL
  // (e.g. sphere:///), immediately normalize to root.
  useEffect(() => {
    if (appGlobals.__sferasHandledInitialStartupUrl) {
      return;
    }

    const isBareStartupUrl = (url: string): boolean => {
      const normalized = url.trim().toLowerCase();
      if (!normalized) return false;
      if (/^(sphere|sferas):\/{0,3}$/i.test(normalized)) return true;
      if (
        normalized.startsWith("expo-development-client") ||
        normalized.includes("://expo-development-client/?url=")
      ) {
        return true;
      }

      try {
        const parsed = new URL(url);
        const isKnownScheme =
          parsed.protocol === "sphere:" || parsed.protocol === "sferas:";
        const isEmptyPath =
          !parsed.hostname && (!parsed.pathname || parsed.pathname === "/");
        return isKnownScheme && isEmptyPath;
      } catch {
        return false;
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        appGlobals.__sferasHandledInitialStartupUrl = true;
        if (url && isBareStartupUrl(url)) {
          router.replace("/");
        }
      })
      .catch(() => {
        appGlobals.__sferasHandledInitialStartupUrl = true;
        // Ignore Linking failures; app continues with normal router behavior.
      });
  }, []);

  // Recovery fallback: if router lands on an unmatched/not-found path,
  // send user to the default tabs entry. Limited attempts prevent loops.
  useEffect(() => {
    if (!pathname) return;
    const normalized = pathname.toLowerCase();
    const isNotFoundPath =
      normalized.includes("not-found") || normalized.includes("unmatched");
    if (!isNotFoundPath) return;
    if (notFoundRecoveryAttemptsRef.current >= 2) return;

    notFoundRecoveryAttemptsRef.current += 1;
    requestAnimationFrame(() => {
      router.replace("/(tabs)/index");
    });
  }, [pathname]);

  // Onboarding gate: show onboarding only when we have no data AND onboarding not completed
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const completed = await getOnboardingCompleted();
      if (cancelled) return;
      const totalEntities =
        profiles.length +
        jobs.length +
        familyMembers.length +
        friends.length +
        hobbies.length;
      const totalMemories = idealizedMemories.length;
      const hasNoData = totalEntities === 0 && totalMemories === 0;
      const isDevReRun = __DEV__ && onboardingRequestTrigger > 0;
      const shouldShow = !completed && (hasNoData || isDevReRun);
      setShowOnboarding(shouldShow);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [
    onboardingRequestTrigger,
    profiles.length,
    jobs.length,
    familyMembers.length,
    friends.length,
    hobbies.length,
    idealizedMemories.length,
  ]);

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

  // EAS Update: check for OTA on launch (after splash) and when app comes to foreground
  useEffect(() => {
    if (!isAnimationComplete) return;
    const t = setTimeout(() => {
      void checkForUpdateAndReload();
    }, 2000);
    return () => clearTimeout(t);
  }, [isAnimationComplete]);

  // In-app reminders for past attended Sfera events (dev and prod). Due times are 1/2/3 min in dev, next-day 10:00 in prod.
  const showEventMemoryReminderIfNeeded = useCallback(
    (skipThrottle?: boolean) => {
      // Don't show until preference is loaded (avoids showing on default true before AsyncStorage read)
      if (!eventInAppPrefLoaded || !eventInAppNotificationsEnabled) return;
      const now = Date.now();
      if (!skipThrottle && now - lastEventReminderShownAtRef.current < 10_000)
        return; // throttle 10s unless showing next at due time
      getPastAttendedEvents()
        .then((past) =>
          Promise.all([Promise.resolve(past), getEventGoldenMemoryUsedIds()]),
        )
        .then(async (result) => {
          const [past, goldenUsed] = result as [SferaEvent[], Set<string>];
          for (const event of past) {
            if (goldenUsed.has(event.id)) {
              continue;
            }
            // Get or create schedule for this past event
            const { schedule } = await getOrCreateEventReminderSchedule(event);
            if (schedule.shownCount >= 3) {
              continue;
            }
            const nextDue = schedule.dueTimes[schedule.shownCount];
            if (now < nextDue) {
              // Not yet due. Schedule check at due time.
              const delay = Math.max(0, nextDue - now);
              if (nextReminderTimeoutRef.current)
                clearTimeout(nextReminderTimeoutRef.current);
              nextReminderTimeoutRef.current = setTimeout(() => {
                nextReminderTimeoutRef.current = null;
                showEventMemoryReminderIfNeeded(true);
              }, delay);
              return;
            }
            lastEventReminderShownAtRef.current = now;
            const newCount = await incrementEventReminderInAppShownCount(
              event.id,
            );
            const title = "Create a memory for your event";
            const message = `You attended "${event.name}". Create a memory for it with Sfera AI.`;
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
              onDismiss: undefined,
            });
            // Schedule the next reminder at its due time
            if (newCount < 3) {
              const delay = Math.max(
                0,
                schedule.dueTimes[newCount] - Date.now(),
              );
              if (nextReminderTimeoutRef.current)
                clearTimeout(nextReminderTimeoutRef.current);
              nextReminderTimeoutRef.current = setTimeout(() => {
                nextReminderTimeoutRef.current = null;
                showEventMemoryReminderIfNeeded(true);
              }, delay);
            }
            return;
          }
        });
    },
    [showInAppNotification, eventInAppNotificationsEnabled, eventInAppPrefLoaded],
  );

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
    const inferMomentTypeFromMemory = (
      memoryId?: string,
      momentId?: string,
      momentText?: string,
    ): "lesson" | "sunny" | null => {
      if (!memoryId) return null;
      const memory = idealizedMemories.find((m) => m.id === memoryId);
      if (!memory) return null;

      if (momentId) {
        const isLesson = (memory.lessonsLearned ?? []).some(
          (lesson: any) => lesson?.id === momentId,
        );
        if (isLesson) return "lesson";

        const isSunny = (memory.goodFacts ?? []).some(
          (fact: any) => fact?.id === momentId,
        );
        if (isSunny) return "sunny";
      }

      if (momentText) {
        const normalized = momentText.trim();
        if (normalized.length > 0) {
          const isLesson = (memory.lessonsLearned ?? []).some(
            (lesson: any) => (lesson?.text ?? "").trim() === normalized,
          );
          if (isLesson) return "lesson";

          const isSunny = (memory.goodFacts ?? []).some(
            (fact: any) => (fact?.text ?? "").trim() === normalized,
          );
          if (isSunny) return "sunny";
        }
      }

      return null;
    };

    const handleNotificationResponse = (
      response: Notifications.NotificationResponse,
    ) => {
      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      const now = Date.now();
      const last = lastHandledNotificationResponseRef.current;
      const DUPLICATE_WINDOW_MS = 3000;
      if (
        last &&
        last.key === responseKey &&
        now - last.handledAt < DUPLICATE_WINDOW_MS
      ) {
        return;
      }
      lastHandledNotificationResponseRef.current = {
        key: responseKey,
        handledAt: now,
      };
      const content = response.notification.request.content;
      const data = content.data as {
        type?: string;
        entityId?: string;
        sphere?: string;
        memoryId?: string;
        momentId?: string;
        momentText?: string;
        momentType?: "lesson" | "sunny";
      };
      if (data.type === "entity_reminder" && data.entityId && data.sphere) {
        InteractionManager.runAfterInteractions(() => {
          router.replace(`/notifications/${data.sphere}/${data.entityId}`);
        });
      } else if (
        (data.type === "moment_nudge" ||
          (!data.type && data.entityId && data.sphere && data.memoryId)) &&
        data.entityId &&
        data.sphere &&
        data.memoryId
      ) {
        InteractionManager.runAfterInteractions(() => {
          const resolvedMomentType =
            data.momentType === "lesson" || data.momentType === "sunny"
              ? data.momentType
              : inferMomentTypeFromMemory(
                  data.memoryId,
                  data.momentId,
                  data.momentText ?? content.body ?? "",
                ) ?? "lesson";

          if (resolvedMomentType === "lesson") {
            router.replace({
              pathname: "/universe-lessons",
              params: {
                nudgeKey: `${Date.now()}`,
                lessonId: data.momentId ?? "",
                text: data.momentText ?? content.body ?? "",
                memoryId: data.memoryId,
                entityId: data.entityId,
                sphere: data.sphere,
              },
            });
            return;
          }

          router.replace({
            pathname: "/(tabs)",
            params: {
              nudgeMomentType: "sunny",
              focusedMemoryId: data.memoryId,
              entityId: data.entityId,
              sphere: data.sphere,
              momentId: data.momentId ?? "",
              nudgeNonce: `${Date.now()}`,
            },
          });
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
        void Notifications.clearLastNotificationResponseAsync();
      });

    return () => {
      responseListener.current?.remove();
    };
  }, [idealizedMemories]);

  const isReRun = onboardingRequestTrigger > 0;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={styles.appContainer}>
        <AIMemoryModalContext.Provider value={{ openMemoryModal }}>
        <OnboardingGateContext.Provider
          value={{ requestShowOnboarding }}
        >
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          <Stack.Screen name="insights" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
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
            name="universe-lessons"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="entity-reminders"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="event-reminders"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
          <Stack.Screen name="premium-info" options={{ headerShown: false }} />
          <Stack.Screen name="moment-colors" options={{ headerShown: false }} />
          <Stack.Screen
            name="cosmic-app-look"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="personalization"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="usability" options={{ headerShown: false }} />
          <Stack.Screen name="backup" options={{ headerShown: false }} />
          <Stack.Screen name="guide" options={{ headerShown: false }} />
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
        <AIInsightsConsentModal
          visible={aiConsentModalForAIButton}
          onEnable={() => {
            setAiConsentModalForAIButton(false);
            void aiConsent.setChoice("enabled").then(async () => {
              const pendingResponse = await getPendingAIResponse();
              if (pendingResponse) {
                setPendingAIResponseForButton(pendingResponse);
              }
              openMemoryModal();
            });
          }}
          onMaybeLater={() => {
            void aiConsent.setChoice("maybe_later");
            setAiConsentModalForAIButton(false);
          }}
        />
        {aiMemoryModalVisible && (
          <AIModal
            visible={aiMemoryModalVisible}
            onClose={() => {
              setAiMemoryModalVisible(false);
              setPendingAIResponseForButton(null);
            }}
            onMinimize={() => {
              setAiMemoryModalVisible(false);
            }}
            pendingResponse={pendingAIResponseForButton}
            onSend={async (message: string) => {
              const sphereTypes = [
                ...profiles.map(() => "relationships" as const),
                ...jobs.map(() => "career" as const),
                ...familyMembers.map(() => "family" as const),
                ...friends.map(() => "friends" as const),
                ...hobbies.map(() => "hobbies" as const),
              ];
              const uniqueSpheres = [...new Set(sphereTypes)];
              await sendToAI(message, { spheres: uniqueSpheres });
            }}
          />
        )}
      </OnboardingGateContext.Provider>
      </AIMemoryModalContext.Provider>

        {showOnboarding === true && (
          <View
            style={StyleSheet.absoluteFillObject}
            pointerEvents="box-none"
          >
            <OnboardingWizard
              canExitEarly={isReRun}
              onExit={
                isReRun
                  ? async () => {
                      await setOnboardingCompleted(true);
                      setOnboardingRequestTrigger((t) => t + 1);
                    }
                  : undefined
              }
            />
          </View>
        )}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1 },
});

export default function RootLayout() {
  // Configure RevenueCat first so it's ready before SubscriptionProvider's useEffect runs.
  // SubscriptionProvider is a descendant and calls getOfferings/getCustomerInfo on mount.
  useEffect(() => {
    if (
      appGlobals.__sferasRevenueCatConfigured ||
      appGlobals.__sferasRevenueCatConfigInProgress
    ) {
      return;
    }
    if (
      ENABLE_REVENUECAT &&
      isNativeModuleAvailable &&
      Purchases &&
      LOG_LEVEL
    ) {
      try {
        // Set immediately to prevent concurrent mounts from racing into configure.
        appGlobals.__sferasRevenueCatConfigInProgress = true;
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);
        const iosApiKey = "appl_DEXthnrRgJUgeRHbnAqcepQbhkl";
        const androidApiKey = "test_bwsKZRrhzegZZheOpaNyrIYYLmW";
        if (Platform.OS === "ios") {
          Purchases.configure({ apiKey: iosApiKey });
        } else if (Platform.OS === "android") {
          Purchases.configure({ apiKey: androidApiKey });
        }
        appGlobals.__sferasRevenueCatConfigured = true;
        appGlobals.__sferasRevenueCatConfigInProgress = false;
      } catch (error) {
        appGlobals.__sferasRevenueCatConfigInProgress = false;
        handleDevError(error, "RevenueCat Initialization");
      }
    }
  }, []);

  // Don't hide native splash here - let SplashAnimationProvider handle it
  // This prevents race conditions with the animation provider

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                        <EventInAppNotificationPreferenceProvider>
                          <HomeTransitionLoaderProvider>
                            <UnsavedChangesProvider>
                              <View style={{ flex: 1 }}>
                                <InAppNotificationProvider>
                                  <SferaEventsBadgeProvider>
                                    <AppContent />
                                  </SferaEventsBadgeProvider>
                                </InAppNotificationProvider>
                                <HomeTransitionLoaderOverlay />
                              </View>
                            </UnsavedChangesProvider>
                          </HomeTransitionLoaderProvider>
                        </EventInAppNotificationPreferenceProvider>
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
    </GestureHandlerRootView>
  );
}
