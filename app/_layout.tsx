import { ENABLE_REVENUECAT, isNativeModuleAvailable, LOG_LEVEL, Purchases } from '@/utils/revenuecat-wrapper';
import { HeaderBackButton } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { handleDevError } from '@/utils/dev-error-handler';
import { InAppNotificationProvider } from '@/utils/InAppNotificationProvider';
import { JourneyProvider, LifeSphere } from '@/utils/JourneyProvider';
import { LanguageProvider } from '@/utils/languages/language-context';
import { NotificationsProvider } from '@/utils/NotificationsProvider';
import { SplashAnimationProvider, useSplash } from '@/utils/SplashAnimationProvider';
import { SubscriptionProvider } from '@/utils/SubscriptionProvider';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/utils/ThemeContext';
// Firebase is automatically initialized via Expo plugin (@react-native-firebase/app)
// No manual initialization needed

// Load notification test utilities in dev mode
if (__DEV__) {
  import('../scripts/test-notification');
}

// Hide native splash immediately when this module loads
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { hideSplash, isAnimationComplete } = useSplash();
  const { colorScheme } = useTheme();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    const initializeRevenueCat = async () => {
      // Skip initialization if RevenueCat is disabled via feature flag
      if (!ENABLE_REVENUECAT) {
        return;
      }

      // Only initialize if native module is available
      if (!isNativeModuleAvailable || !Purchases || !LOG_LEVEL) {
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
      // Notification received while app is foregrounded
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
      notificationListener.current?.remove();
      responseListener.current?.remove();
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
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            // Title will be set dynamically in the screen component
            headerBackTitle: '', // Remove "(tabs)" text from back button
            headerLeft: (props) => (
              <HeaderBackButton
                {...props}
                onPress={() => {
                  // Always return to Settings tab
                  router.replace('/settings');
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
                <InAppNotificationProvider>
                  <AppContent />
                </InAppNotificationProvider>
              </NotificationsProvider>
            </JourneyProvider>
          </SubscriptionProvider>
        </LanguageProvider>
      </SplashAnimationProvider>
    </AppThemeProvider>
  );
}
