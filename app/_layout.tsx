import {
    ENABLE_REVENUECAT,
    isNativeModuleAvailable,
    LOG_LEVEL,
    Purchases,
} from "@/utils/revenuecat-wrapper";
import { HeaderBackButton } from "@react-navigation/elements";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, InteractionManager, Platform } from "react-native";
import "react-native-reanimated";

import { AIInsightsConsentProvider } from "@/utils/AIInsightsConsentProvider";
import { NotificationNudgePreferenceProvider } from "@/utils/NotificationNudgePreferenceProvider";
import { initializeAppCheckService, verifyAppCheck } from "@/utils/app-check";
import { handleDevError } from "@/utils/dev-error-handler";
import { InAppNotificationProvider } from "@/utils/InAppNotificationProvider";
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
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

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

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void checkForUpdateAndReload();
    });
    return () => sub.remove();
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

  // Handle notification deep linking (tap when app in background) and cold start (app opened from killed state by tap).
  // Navigate to the entity's notification (edit) screen so the user lands in the right place.
  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const content = response.notification.request.content;
      const data = content.data as { type?: string; entityId?: string; sphere?: string };
      if (data.type === "entity_reminder" && data.entityId && data.sphere) {
        InteractionManager.runAfterInteractions(() => {
          router.replace(`/notifications/${data.sphere}/${data.entityId}`);
        });
      }
    };

    // Cold start: app was killed and user opened it by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {});

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
          options={{
            headerShown: true,
            // Title will be set dynamically in the screen component
            headerBackTitle: "", // Remove "(tabs)" text from back button
            headerLeft: (props) => (
              <HeaderBackButton
                {...props}
                onPress={() => {
                  // Always return to Settings tab
                  router.replace("/settings");
                }}
              />
            ),
          }}
        />
        <Stack.Screen
          name="notifications/[sphere]/[entityId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="moment-notifications"
          options={{
            headerShown: true,
            headerBackTitle: "",
            headerLeft: (props) => (
              <HeaderBackButton
                {...props}
                onPress={() => router.replace("/notifications")}
              />
            ),
          }}
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
                    <InAppNotificationProvider>
                      <AppContent />
                    </InAppNotificationProvider>
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
