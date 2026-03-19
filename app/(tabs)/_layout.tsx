import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventsTabButton, HapticTab, HomeTabButton, SpheresTabButton } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { emitAIModalOpen } from '@/utils/ai-open-modal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useSferaEventsBadge } from '@/utils/SferaEventsBadgeProvider';
import { useTranslate } from '@/utils/languages/use-translate';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const { hasNewEvents, unseenCount } = useSferaEventsBadge();
  const router = useRouter();

  // Scale icon size: 28 base size, 30% larger on tablets (28 * 1.3 = 36.4, round to 36)
  const iconSize = Math.round(28 * fontScale);

  // Tab bar height (same formula as tabBarStyle height below)
  const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);

  // Floating share button animations
  const shareBtnScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.55);

  React.useEffect(() => {
    // Gentle breathing glow — subtle pulse to attract attention
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.45, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [glowOpacity]);

  const handleSharePress = () => {
    shareBtnScale.value = withSequence(
      withSpring(0.88, { damping: 5, stiffness: 300 }),
      withSpring(1.08, { damping: 6, stiffness: 260 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    emitAIModalOpen();
  };

  const shareBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareBtnScale.value }],
  }));
  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Custom tab bar background with gradient
  const TabBarBackground = () => {
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
  };

  return (
    <View style={styles.container}>
    <Tabs
      initialRouteName="index"
      lazy={false}
      screenOptions={{
        tabBarActiveTintColor: colorScheme === 'dark' ? colors.primaryLight : '#1976D2', // Darker blue for better contrast on white
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#ffffff' : '#666666', // Darker grey for better contrast on white
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelPosition: 'below-icon', // Ensures icons and labels are vertically stacked
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: 'transparent', // Transparent to show gradient background
          borderTopColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' // Subtle border with low opacity for dark mode
            : 'rgba(150, 150, 150, 0.6)', // Darker grey border for light mode
          borderTopWidth: 1,
          paddingBottom: Math.max(32 * fontScale, insets.bottom + 12),
          paddingTop: 8 * fontScale,
          height: Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale),
          flexDirection: 'row', // Ensure tabs are laid out horizontally
        },
        tabBarItemStyle: {
          flexDirection: 'column', // Keep icon and label stacked vertically
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: Math.round(12 * fontScale), // Scale tab bar label font size
          fontWeight: '500',
          letterSpacing: 0.015,
          marginTop: 4 * fontScale, // Gap between icon and text, scaled for device size
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name="explore" size={iconSize} color={color} />,
          tabBarLabel: ({ focused, color }) => {
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : '#666666'; // Darker grey for better contrast on white
            return (
              <ThemedText
                size="xs"
                weight={focused ? 'bold' : 'medium'}
                letterSpacing="l"
                style={{
                  color: focused ? color : inactiveColor,
                  marginTop: 6 * fontScale,
                  lineHeight: 18 * fontScale
                }}
              >
                {t('tab.home')}
              </ThemedText>
            );
          },
          tabBarButton: HomeTabButton,
        }}
      />
      <Tabs.Screen
        name="sferas"
        options={{
          title: 'Sferas',
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              name="category"
              size={iconSize}
              color={color}
            />
          ),
          tabBarLabel: ({ focused, color }) => {
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : '#666666'; // Darker grey for better contrast on white
            return (
              <ThemedText
                size="xs"
                weight={focused ? 'bold' : 'medium'}
                letterSpacing="l"
                style={{
                  color: focused ? color : inactiveColor,
                  marginTop: 6 * fontScale,
                  lineHeight: 18 * fontScale
                }}
              >
                {t('tab.spheres')}
              </ThemedText>
            );
          },
          tabBarButton: SpheresTabButton,
        }}
      />
      {/* spheres route hidden from tab bar — used as overlay in sferas.tsx */}
      <Tabs.Screen name="spheres" options={{ href: null, headerShown: false }} />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarBadge: hasNewEvents ? unseenCount : undefined,
          tabBarButton: EventsTabButton,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="event" size={iconSize} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => {
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : '#666666';
            return (
              <ThemedText
                size="xs"
                weight={focused ? 'bold' : 'medium'}
                letterSpacing="l"
                style={{
                  color: focused ? color : inactiveColor,
                  marginTop: 6 * fontScale,
                  lineHeight: 18 * fontScale
                }}
              >
                {t('tab.events')}
              </ThemedText>
            );
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={iconSize} color={color} />,
          tabBarLabel: ({ focused, color }) => {
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : '#666666'; // Darker grey for better contrast on white
            return (
              <ThemedText
                size="xs"
                weight={focused ? 'bold' : 'medium'}
                letterSpacing="l"
                style={{
                  color: focused ? color : inactiveColor,
                  marginTop: 6 * fontScale,
                  lineHeight: 18 * fontScale
                }}
              >
                {t('tab.settings')}
              </ThemedText>
            );
          },
        }}
      />

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

      {/* ── Floating "Share to Universe" button ── */}
      {/* Positioned between the Sferas and Events tabs, slightly above the tab bar */}
      <Animated.View
        style={[
          styles.shareFabWrapper,
          { bottom: tabBarHeight - 24 },
          shareBtnAnimStyle,
        ]}
        pointerEvents="box-none"
      >
        {/* Outer glow ring */}
        <Animated.View style={[styles.shareFabGlow, glowAnimStyle]} />

        {/* Shadow wrapper (no overflow:hidden so shadow renders on iOS) */}
        <View style={styles.shareFabShadow}>
          <Pressable
            onPress={handleSharePress}
            style={styles.shareFabPressable}
            accessibilityRole="button"
            accessibilityLabel="AI"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LinearGradient
              colors={['#5BA8E8', '#3E8FD4', '#2472B8']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.shareFabGradient}
            >
              <MaterialIcons
                name="auto-awesome"
                size={22}
                color="#fff"
                accessibilityElementsHidden
              />
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Floating share FAB
  shareFabWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -26, // half of 52 (button width)
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareFabGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(100, 181, 246, 0.28)',
    // iOS shadow for glow effect
    shadowColor: '#64B5F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 0,
  },
  shareFabShadow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    // Shadow on the outer wrapper so it isn't clipped
    shadowColor: '#4290D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.60,
    shadowRadius: 10,
    elevation: 12,
  },
  shareFabPressable: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(100, 181, 246, 0.45)',
  },
  shareFabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
