import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useLayoutEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SplashAnimationProvider, useSplash } from '@/utils/SplashAnimationProvider';

// Hide native splash immediately when this module loads
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { hideSplash, isAnimationComplete } = useSplash();
  const colorScheme = useColorScheme();

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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Hide native splash IMMEDIATELY - this runs synchronously before render
  useLayoutEffect(() => {
    // Hide synchronously on mount - no async delay
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Ignore errors
      }
    })();
  }, []);

  return (
    <SplashAnimationProvider>
      <AppContent />
    </SplashAnimationProvider>
  );
}
