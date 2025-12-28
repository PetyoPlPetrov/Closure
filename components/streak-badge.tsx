/**
 * Streak Badge Component - Displays on Home Screen
 */

import { ThemedText } from '@/components/themed-text';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import type { StreakBadge } from '@/utils/streak-types';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface StreakBadgeProps {
  currentStreak: number;
  currentBadge: StreakBadge | null;
  onPress: () => void;
  onLongPress?: () => void;
}

export const StreakBadgeComponent = React.memo(function StreakBadgeComponent({
  currentStreak,
  currentBadge,
  onPress,
  onLongPress,
}: StreakBadgeProps) {
  const fontScale = useFontScale();
  const t = useTranslate();

  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const pressScale = useSharedValue(1); // For press animation

  // Entry animation on mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    scale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withSpring(1, {
        damping: 12,
        stiffness: 100,
      })
    );
  }, []);

  // Pulse animation when streak is active
  useEffect(() => {
    if (currentStreak > 0) {
      scale.value = withSequence(
        withTiming(1, { duration: 0 }),
        withSpring(1.1, { damping: 8, stiffness: 100 }),
        withSpring(1, { damping: 8, stiffness: 100 })
      );
    }
  }, [currentStreak]);

  // Handlers for press animation
  const handlePressIn = () => {
    pressScale.value = withTiming(0.92, { duration: 100, easing: Easing.out(Easing.ease) });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * pressScale.value }],
  }));

  const isActiveStreak = currentStreak > 0;
  const displayEmoji = currentBadge?.emoji || (isActiveStreak ? '🔥' : '💫');
  const displayText = `${currentStreak} ${currentStreak === 1 ? t('streak.badge.day') : t('streak.badge.days')}`;

  // Colors based on badge or default
  const gradientColors = currentBadge?.colorGradient || (
    isActiveStreak
      ? ['#FFEBEE', '#EF5350'] // Default fire colors
      : ['rgba(158, 158, 158, 0.1)', 'rgba(117, 117, 117, 0.1)'] // Gray for zero state
  );

  const borderColor = isActiveStreak
    ? (currentBadge?.colorGradient[1] || '#EF5350')
    : '#9E9E9E';

  // Use a darker, high-contrast color for text to ensure readability
  // For active streaks with light gradient backgrounds, use dark text
  const textColor = isActiveStreak
    ? '#1A1A1A' // Very dark color for maximum contrast against light gradient backgrounds
    : '#757575';

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.badge,
            {
              borderColor,
              borderWidth: 2,
            },
          ]}
        >
          <ThemedText
            size="sm"
            weight="bold"
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: 14 * fontScale,
              },
            ]}
          >
            {displayEmoji} {displayText}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    right: 16,
    zIndex: 1000,
  },
  pressable: {
    borderRadius: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    letterSpacing: 0.5,
  },
});
