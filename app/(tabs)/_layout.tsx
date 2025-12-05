import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  
  // Scale icon size: 28 base size, 30% larger on tablets (28 * 1.3 = 36.4, round to 36)
  const iconSize = Math.round(28 * fontScale);

  // Custom tab bar background with gradient
  const TabBarBackground = () => {
    if (colorScheme === 'dark') {
      return (
        <LinearGradient
          colors={['#1A2332', '#1A2332']}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    return (
      <LinearGradient
        colors={['#FFFFFF', '#D0D0D0', '#B0B0B0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  };

  return (
    <Tabs
      initialRouteName="spheres"
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
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={iconSize} color={color} />,
          tabBarLabel: ({ focused, color }) => {
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : '#666666'; // Darker grey for better contrast on white
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
            const inactiveColor = colorScheme === 'dark' ? '#ffffff' : '#666666'; // Darker grey for better contrast on white
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
                {t('tab.spheres')}
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
