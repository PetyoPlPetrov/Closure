import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useLayoutEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { JourneyProvider } from '@/utils/JourneyProvider';
import { LanguageProvider } from '@/utils/languages/language-context';
import { SplashAnimationProvider, useSplash } from '@/utils/SplashAnimationProvider';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/utils/ThemeContext';

// Hide native splash immediately when this module loads
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { hideSplash, isAnimationComplete } = useSplash();
  const { colorScheme } = useTheme();

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
        <Stack.Screen name="add-ex-profile" options={{ headerShown: false }} />
        <Stack.Screen name="reality-check" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="add-job" options={{ headerShown: false }} />
        <Stack.Screen name="edit-job" options={{ headerShown: false }} />
        <Stack.Screen name="add-family-member" options={{ headerShown: false }} />
        <Stack.Screen name="edit-family-member" options={{ headerShown: false }} />
        <Stack.Screen name="idealized-memories" options={{ headerShown: false }} />
        <Stack.Screen name="add-idealized-memory" options={{ headerShown: false }} />
        <Stack.Screen name="relationships-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="career-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="family-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="relationship-detail" options={{ headerShown: false }} />
        <Stack.Screen name="job-detail" options={{ headerShown: false }} />
        <Stack.Screen name="family-member-detail" options={{ headerShown: false }} />
        <Stack.Screen name="insights" options={{ headerShown: false }} />
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
          <JourneyProvider>
            <AppContent />
          </JourneyProvider>
        </LanguageProvider>
      </SplashAnimationProvider>
    </AppThemeProvider>
  );
}
