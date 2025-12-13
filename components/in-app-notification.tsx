/**
 * In-App Notification Component
 * Shows celebration messages at the top of the screen
 */

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InAppNotificationProps {
  visible: boolean;
  title: string;
  message: string;
  emoji?: string;
  onHide: () => void;
  duration?: number; // How long to show in ms (default 3000)
}

export function InAppNotification({
  visible,
  title,
  message,
  emoji,
  onHide,
  duration = 3000,
}: InAppNotificationProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      // Animate in
      translateY.value = withSpring(insets.top + 10, {
        damping: 15,
        stiffness: 120,
      });
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });

      // Auto-hide after duration
      const timer = setTimeout(() => {
        // Animate out
        translateY.value = withTiming(-200, { duration: 300, easing: Easing.in(Easing.ease) });
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 300 });

        setTimeout(onHide, 300);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      translateY.value = -200;
      opacity.value = 0;
      scale.value = 0.8;
    }
  }, [visible, duration, onHide, insets.top]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  // Determine background color with good contrast
  const backgroundColor = colorScheme === 'dark' 
    ? colors.surfaceElevated4 || '#3A4A5F' // Lighter elevated surface for better contrast
    : '#FFFFFF';
  
  // Determine border color
  const borderColor = colorScheme === 'dark'
    ? colors.surfaceElevated8 || '#4A5A6F' // Subtle border for dark mode
    : '#E5E5EA';

  // Text colors with high contrast
  const titleColor = colorScheme === 'dark' 
    ? colors.textHighEmphasis || '#FFFFFF'
    : colors.text || '#11181C';
  
  const messageColor = colorScheme === 'dark'
    ? colors.textMediumEmphasis || 'rgba(255, 255, 255, 0.80)' // Slightly brighter for better contrast
    : colors.icon || '#687076';

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          shadowColor: '#000',
        },
        animatedStyle,
      ]}
    >
      {emoji && (
        <ThemedText style={styles.emoji} size="xl">
          {emoji}
        </ThemedText>
      )}
      <Animated.View style={styles.textContainer}>
        <ThemedText size="md" weight="bold" style={[styles.title, { color: titleColor }]}>
          {title}
        </ThemedText>
        <ThemedText size="sm" style={[styles.message, { color: messageColor }]}>
          {message}
        </ThemedText>
      </Animated.View>
      <Pressable onPress={onHide} style={styles.closeButton}>
        <MaterialIcons 
          name="close" 
          size={20} 
          color={colorScheme === 'dark' ? colors.textHighEmphasis || '#FFFFFF' : colors.text || '#11181C'} 
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 20, // Extra padding on right to space button from edge
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10000,
  },
  emoji: {
    marginRight: 12,
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
    marginRight: 16, // Add spacing between text and close button
  },
  title: {
    marginBottom: 2,
  },
  message: {
    lineHeight: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
