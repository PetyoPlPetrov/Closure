import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TAB_BACKGROUND_COLOR_DARK } from '@/library/components/tab-screen-container';
import { useTranslate } from '@/utils/languages/use-translate';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  
  // Scale icon size: 28 base size, 30% larger on tablets (28 * 1.3 = 36.4, round to 36)
  const iconSize = Math.round(28 * fontScale);

  return (
    <Tabs
      initialRouteName="spheres"
      screenOptions={{
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#ffffff' : Colors.light.text,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelPosition: 'below-icon', // Ensures icons and labels are vertically stacked
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? TAB_BACKGROUND_COLOR_DARK : '#ffffff',
          borderTopColor: colorScheme === 'dark' 
            ? 'rgba(14, 165, 233, 0.3)' 
            : 'rgba(226, 232, 240, 1)',
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
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={iconSize} color={color} />,
          tabBarLabel: ({ focused, color }) => {
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : Colors.light.text;
            return (
              <ThemedText
                size="xs"
                weight={focused ? 'bold' : 'medium'}
                letterSpacing="l"
                style={{ 
                  color: focused ? color : inactiveColor,
                  marginTop: 6 * fontScale
                }}
              >
                {t('tab.home')}
              </ThemedText>
            );
          },
        }}
      />
      <Tabs.Screen
        name="spheres"
        options={{
          title: 'Spheres',
          tabBarIcon: ({ color }) => (
            <MaterialIcons 
              name="category" 
              size={iconSize} 
              color={color}
            />
          ),
          tabBarLabel: ({ focused, color }) => {
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : Colors.light.text;
            return (
              <ThemedText
                size="xs"
                weight={focused ? 'bold' : 'medium'}
                letterSpacing="l"
                style={{ 
                  color: focused ? color : inactiveColor,
                  marginTop: 6 * fontScale
                }}
              >
                Spheres
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
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : Colors.light.text;
            return (
              <ThemedText
                size="xs"
                weight={focused ? 'bold' : 'medium'}
                letterSpacing="l"
                style={{ 
                  color: focused ? color : inactiveColor,
                  marginTop: 6 * fontScale
                }}
              >
                {t('tab.settings')}
              </ThemedText>
            );
          },
        }}
      />
    </Tabs>
  );
}
