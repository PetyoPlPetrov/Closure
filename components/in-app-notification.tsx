/**
 * In-App Notification Component
 * Shows celebration messages at the top of the screen
 */

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
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

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme === 'dark' ? colors.card : '#FFFFFF',
          borderColor: colorScheme === 'dark' ? colors.border : '#E5E5EA',
          shadowColor: colorScheme === 'dark' ? '#000' : '#000',
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
        <ThemedText size="md" weight="bold" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText size="sm" style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </ThemedText>
      </Animated.View>
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
    padding: 16,
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
  },
  title: {
    marginBottom: 2,
  },
  message: {
    lineHeight: 18,
  },
});
