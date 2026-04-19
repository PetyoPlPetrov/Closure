/**
 * In-App Notification Component
 * Shows celebration messages at the top of the screen
 */

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  /** When set, show a calendar tile (month + day) instead of emoji; use the event's date. */
  eventDate?: Date;
  /** MaterialIcons name to show at the end of the message (e.g. "auto-awesome" for AI). */
  trailingIcon?: string;
  onHide: () => void;
  duration?: number; // How long to show in ms (default 3000). Use 0 for manual dismiss only.
  /** When set, tapping the notification content opens this action. If dismissOnPress is true (default), the notification is hidden after. */
  onPress?: () => void;
  /** If true (default), tapping the content hides the notification after onPress. If false, it stays until close button or hideNotification. */
  dismissOnPress?: boolean;
  /** Called when the user taps the X button (before onHide). Use to show the next in a sequence. */
  onDismiss?: () => void;
}

const MONTH_ABBREV = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

export function InAppNotification({
  visible,
  title,
  message,
  emoji,
  eventDate,
  trailingIcon,
  onHide,
  duration = 3000,
  onPress,
  dismissOnPress = true,
  onDismiss,
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

      // Auto-hide after duration (skip timer when duration is 0 = manual dismiss only)
      const timer =
        duration > 0
          ? setTimeout(() => {
              // Animate out
              translateY.value = withTiming(-200, { duration: 300, easing: Easing.in(Easing.ease) });
              opacity.value = withTiming(0, { duration: 300 });
              scale.value = withTiming(0.8, { duration: 300 });

              setTimeout(onHide, 300);
            }, duration)
          : undefined;

      return () => {
        if (timer != null) clearTimeout(timer);
      };
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
    ? (colors as any).surfaceElevated4 || '#3A4A5F' // Lighter elevated surface for better contrast
    : '#FFFFFF';
  
  // Determine border color
  const borderColor = colorScheme === 'dark'
    ? (colors as any).surfaceElevated8 || '#4A5A6F' // Subtle border for dark mode
    : '#E5E5EA';

  // Text colors with high contrast
  const titleColor = colorScheme === 'dark' 
    ? (colors as any).textHighEmphasis || '#FFFFFF'
    : colors.text || '#11181C';
  
  const messageColor = colorScheme === 'dark'
    ? (colors as any).textMediumEmphasis || 'rgba(255, 255, 255, 0.80)' // Slightly brighter for better contrast
    : colors.icon || '#687076';

  if (!visible) return null;

  const handleContentPress = () => {
    if (onPress) {
      onPress();
      if (dismissOnPress) onHide();
    }
  };

  const hasMessageRow = Boolean(message.trim().length > 0 || trailingIcon);

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
      <Pressable
        style={styles.contentPressable}
        onPress={onPress ? handleContentPress : undefined}
      >
        {eventDate != null ? (
          <View style={[styles.calendarTile, { backgroundColor: colorScheme === 'dark' ? '#4A2C2A' : '#FEE2E2' }]}>
            <ThemedText size="xs" weight="medium" style={[styles.calendarMonth, { color: colorScheme === 'dark' ? '#FFFFFF' : '#B91C1C' }]}>
              {MONTH_ABBREV[eventDate.getMonth()]}
            </ThemedText>
            <ThemedText size="l" weight="bold" style={[styles.calendarDay, { color: colorScheme === 'dark' ? '#FFFFFF' : '#1A2332' }]}>
              {eventDate.getDate()}
            </ThemedText>
          </View>
        ) : emoji ? (
          <ThemedText style={styles.emoji} size="xl">
            {emoji}
          </ThemedText>
        ) : null}
        <Animated.View style={styles.textContainer}>
          <ThemedText size="l" weight="bold" style={[styles.title, { color: titleColor }]}>
            {title}
          </ThemedText>
          {hasMessageRow ? (
            <View style={styles.messageRow}>
              <ThemedText size="sm" style={[styles.message, { color: messageColor }]}>
                {message}
                {trailingIcon === 'auto-awesome' ? ' ✨' : ''}
              </ThemedText>
              {trailingIcon && trailingIcon !== 'auto-awesome' ? (
                <MaterialIcons
                  name={trailingIcon as keyof typeof MaterialIcons.glyphMap}
                  size={16}
                  color={messageColor}
                  style={styles.messageTrailingIcon}
                />
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
      <Pressable
        onPress={() => {
          onDismiss?.();
          onHide();
        }}
        style={styles.closeButton}
        hitSlop={8}
      >
        <MaterialIcons 
          name="close" 
          size={20} 
          color={colorScheme === 'dark' ? (colors as any).textHighEmphasis || '#FFFFFF' : colors.text || '#11181C'} 
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
    paddingRight: 48, // Space for close button in top-right corner
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
  calendarTile: {
    width: 44,
    marginRight: 12,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonth: {
    fontSize: 10,
    marginBottom: 2,
  },
  calendarDay: {
    fontSize: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  messageTrailingIcon: {
    marginLeft: 4,
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
  contentPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 0,
  },
  closeButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
