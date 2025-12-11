import { ENABLE_REVENUECAT, isNativeModuleAvailable, LOG_LEVEL, Purchases } from '@/utils/revenuecat-wrapper';
import { HeaderBackButton } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { handleDevError } from '@/utils/dev-error-handler';
import { JourneyProvider, LifeSphere } from '@/utils/JourneyProvider';
import { LanguageProvider } from '@/utils/languages/language-context';
import { NotificationsProvider } from '@/utils/NotificationsProvider';
import { SplashAnimationProvider, useSplash } from '@/utils/SplashAnimationProvider';
import { SubscriptionProvider } from '@/utils/SubscriptionProvider';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/utils/ThemeContext';
// Firebase is automatically initialized via Expo plugin (@react-native-firebase/app)
// No manual initialization needed

// Hide native splash immediately when this module loads
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { hideSplash, isAnimationComplete } = useSplash();
  const { colorScheme } = useTheme();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    const initializeRevenueCat = async () => {
      // Skip initialization if RevenueCat is disabled via feature flag
      if (!ENABLE_REVENUECAT) {
        if (__DEV__) {
          console.warn('[RevenueCat] RevenueCat initialization skipped (disabled via feature flag).');
        }
        return;
      }

      // Only initialize if native module is available
      if (!isNativeModuleAvailable || !Purchases || !LOG_LEVEL) {
        if (__DEV__) {
          console.warn('[RevenueCat] Native module not available. Skipping initialization.');
        }
        return;
      }

      try {
        // Set log level based on environment
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);

        // Platform-specific API keys
        const iosApiKey = 'appl_DEXthnrRgJUgeRHbnAqcepQbhkl';
        const androidApiKey = 'test_bwsKZRrhzegZZheOpaNyrIYYLmW';

        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: iosApiKey });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: androidApiKey });
        }
      } catch (error) {
        // Handle RevenueCat initialization errors
        // Show error in dev mode, silently handle in production
        handleDevError(error, 'RevenueCat Initialization');
        // The app can still function without RevenueCat
      }
    };

    initializeRevenueCat();
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

  // Handle notification deep linking
  useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[NotificationReceived] ==========================================');
      console.log('[NotificationReceived] 📬 Notification received while app is foregrounded');
      console.log('[NotificationReceived] Received at:', new Date().toISOString());
      console.log('[NotificationReceived] Title:', notification.request.content.title);
      console.log('[NotificationReceived] Body:', notification.request.content.body);
      console.log('[NotificationReceived] Data:', JSON.stringify(notification.request.content.data, null, 2));
      console.log('[NotificationReceived] Trigger:', JSON.stringify(notification.request.trigger, null, 2));
      console.log('[NotificationReceived] Notification ID:', notification.request.identifier);

      // Check if this is an immediate fire or scheduled
      const scheduledAt = (notification.request.content.data as any)?.scheduledAt;
      if (scheduledAt) {
        const timeSinceScheduled = Date.now() - scheduledAt;
        console.log('[NotificationReceived] Time since scheduled:', timeSinceScheduled, 'ms');
        if (timeSinceScheduled < 5000) {
          console.error('[NotificationReceived] ⚠️ FIRED IMMEDIATELY! This notification was scheduled less than 5 seconds ago!');
        }
      }
      console.log('[NotificationReceived] ==========================================');
      // We don't need to do anything here, just showing the notification is enough
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (data.type === 'entity_reminder' && data.entityId && data.sphere) {
        const entityId = data.entityId as string;
        const sphere = data.sphere as LifeSphere;

        // Navigate to the appropriate entity detail screen based on sphere
        if (sphere === 'relationships') {
          router.push(`/relationship-detail?id=${entityId}`);
        } else if (sphere === 'career') {
          router.push(`/job-detail?id=${entityId}`);
        } else if (sphere === 'family') {
          router.push(`/family-member-detail?id=${entityId}`);
        } else if (sphere === 'friends') {
          router.push(`/friend-detail?id=${entityId}`);
        } else if (sphere === 'hobbies') {
          router.push(`/hobby-detail?id=${entityId}`);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-ex-profile" options={{ headerShown: false }} />
        <Stack.Screen name="reality-check" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="add-job" options={{ headerShown: false }} />
        <Stack.Screen name="edit-job" options={{ headerShown: false }} />
        <Stack.Screen name="add-family-member" options={{ headerShown: false }} />
        <Stack.Screen name="edit-family-member" options={{ headerShown: false }} />
        <Stack.Screen name="edit-friend" options={{ headerShown: false }} />
        <Stack.Screen name="edit-hobby" options={{ headerShown: false }} />
        <Stack.Screen name="add-friend" options={{ headerShown: false }} />
        <Stack.Screen name="add-hobby" options={{ headerShown: false }} />
        <Stack.Screen name="idealized-memories" options={{ headerShown: false }} />
        <Stack.Screen name="add-idealized-memory" options={{ headerShown: false }} />
        <Stack.Screen name="relationships-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="career-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="family-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="friends-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="hobbies-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="relationship-detail" options={{ headerShown: false }} />
        <Stack.Screen name="job-detail" options={{ headerShown: false }} />
        <Stack.Screen name="family-member-detail" options={{ headerShown: false }} />
        <Stack.Screen name="friend-detail" options={{ headerShown: false }} />
        <Stack.Screen name="hobby-detail" options={{ headerShown: false }} />
        <Stack.Screen name="insights" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            title: 'Notifications',
            headerBackTitleVisible: false,
            headerBackTitle: '',
            headerLeft: (props) => (
              <HeaderBackButton
                {...props}
                onPress={() => {
                  // Always return to Settings tab
                  router.replace('/settings');
                }}
                labelVisible={false}
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
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Don't hide native splash here - let SplashAnimationProvider handle it
  // This prevents race conditions with the animation provider

  return (
    <AppThemeProvider>
      <SplashAnimationProvider>
        <LanguageProvider>
          <SubscriptionProvider>
            <JourneyProvider>
              <NotificationsProvider>
                <AppContent />
              </NotificationsProvider>
            </JourneyProvider>
          </SubscriptionProvider>
        </LanguageProvider>
      </SplashAnimationProvider>
    </AppThemeProvider>
  );
}
