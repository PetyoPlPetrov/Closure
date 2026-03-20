import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AITabButton, EventsTabButton, HapticTab, HomeTabButton } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useSferaEventsBadge } from '@/utils/SferaEventsBadgeProvider';
import { useTranslate } from '@/utils/languages/use-translate';

function TabBarBackground() {
  const colorScheme = useColorScheme();
  if (colorScheme === 'dark') {
    return (
      <LinearGradient
        colors={['#243041', '#1F2A3A', '#1A2332', '#151D2A', '#0F1620']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return (
    <LinearGradient
      colors={['#F0F0F0', '#E0E0E0', '#D0D0D0', '#C0C0C0', '#B0B0B0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabLayout() {
  if (__DEV__) {
    console.log("[render] TabLayout");
  }
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const { hasNewEvents, unseenCount } = useSferaEventsBadge();

  const iconSize = Math.round(28 * fontScale);
  const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
  const aiButtonSize = Math.round(52 * fontScale);

  const inactiveColor = colorScheme === 'dark' ? '#ffffff' : '#666666';
  const activeTintColor = colorScheme === 'dark' ? colors.primaryLight : '#1976D2';
  const borderTopColor = colorScheme === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(150, 150, 150, 0.6)';

  const screenOptions = useMemo(() => ({
    tabBarActiveTintColor: activeTintColor,
    tabBarInactiveTintColor: inactiveColor,
    headerShown: false,
    tabBarButton: HapticTab,
    tabBarLabelPosition: 'below-icon' as const,
    tabBarBackground: TabBarBackground,
    tabBarStyle: {
      backgroundColor: 'transparent' as const,
      borderTopColor,
      borderTopWidth: 1,
      paddingBottom: Math.max(32 * fontScale, insets.bottom + 12),
      paddingTop: 8 * fontScale,
      height: tabBarHeight,
      flexDirection: 'row' as const,
    },
    tabBarItemStyle: {
      flexDirection: 'column' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    tabBarLabelStyle: {
      fontSize: Math.round(12 * fontScale),
      fontWeight: '500' as const,
      letterSpacing: 0.015,
      marginTop: 4 * fontScale,
    },
  }), [activeTintColor, inactiveColor, borderTopColor, fontScale, insets.bottom, tabBarHeight]);

  const homeIcon = useCallback(({ color }: { color: string }) =>
    <MaterialIcons name="home" size={iconSize} color={color} />,
  [iconSize]);

  const homeLabel = useCallback(({ focused, color }: { focused: boolean; color: string }) => (
    <ThemedText size="xs" weight={focused ? 'bold' : 'medium'} letterSpacing="l"
      style={{ color: focused ? color : inactiveColor, marginTop: 6 * fontScale, lineHeight: 18 * fontScale }}>
      {t('tab.home')}
    </ThemedText>
  ), [inactiveColor, fontScale, t]);

  const eventsIcon = useCallback(({ color }: { color: string }) =>
    <MaterialIcons name="event" size={iconSize} color={color} />,
  [iconSize]);

  const eventsLabel = useCallback(({ focused, color }: { focused: boolean; color: string }) => (
    <ThemedText size="xs" weight={focused ? 'bold' : 'medium'} letterSpacing="l"
      style={{ color: focused ? color : inactiveColor, marginTop: 6 * fontScale, lineHeight: 18 * fontScale }}>
      {t('tab.events')}
    </ThemedText>
  ), [inactiveColor, fontScale, t]);

  const eventsTabBadge = hasNewEvents ? unseenCount : undefined;

  return (
    <View style={styles.container}>
    <Tabs
      initialRouteName="index"
      screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: homeIcon,
          tabBarLabel: homeLabel,
          tabBarButton: HomeTabButton,
        }}
      />
      <Tabs.Screen name="spheres" options={{ href: null, headerShown: false }} />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarBadge: eventsTabBadge,
          tabBarButton: EventsTabButton,
          tabBarIcon: eventsIcon,
          tabBarLabel: eventsLabel,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null, headerShown: false }} />

      {/* Entity detail and edit screens - hidden from tab bar but keep tabs visible */}
      <Tabs.Screen name="add-ex-profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="edit-profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="add-job" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="edit-job" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="add-family-member" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="edit-family-member" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="edit-friend" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="edit-hobby" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="add-friend" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="add-hobby" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="idealized-memories" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="add-idealized-memory" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="relationship-detail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="job-detail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="family-member-detail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="friend-detail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="hobby-detail" options={{ href: null, headerShown: false }} />
    </Tabs>
    {/* Central AI button floating above the tab bar between Spheres and Events */}
    <View
      style={{
        position: 'absolute',
        bottom: tabBarHeight - aiButtonSize * 0.5,
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'box-none',
        zIndex: 100,
      }}
    >
      <View style={{ pointerEvents: 'auto' }}>
        <AITabButton size={aiButtonSize} />
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
