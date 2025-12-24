import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { emitSpheresTabPress } from '@/utils/spheres-tab-press';
import { onSpheresTabPulseRequest } from '@/utils/spheres-tab-pulse';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

// Custom home tab button that intercepts presses even when already focused
export function HomeTabButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

// Custom spheres tab button that intercepts presses even when already focused
export function SpheresTabButton(props: BottomTabBarButtonProps) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Subscribe to pulse animation requests
    const unsubscribe = onSpheresTabPulseRequest(({ shouldPulse, pulseOnce }) => {
      if (shouldPulse) {
        // Cancel any existing animation first
        cancelAnimation(pulseScale);

        if (pulseOnce) {
          // Pulse once: scale up then back down
          pulseScale.value = withSequence(
            withTiming(1.2, {
              duration: 400,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
              duration: 400,
              easing: Easing.inOut(Easing.ease),
            })
          );
        } else {
          // Infinite pulsing
          pulseScale.value = withRepeat(
            withTiming(1.2, {
              duration: 800,
              easing: Easing.inOut(Easing.ease),
            }),
            -1, // Infinite repeat
            true // Reverse animation
          );
        }
      } else {
        // Stop pulsing animation smoothly
        cancelAnimation(pulseScale);
        pulseScale.value = withTiming(1, {
          duration: 300,
          easing: Easing.inOut(Easing.ease),
        });
      }
    });

    return () => {
      cancelAnimation(pulseScale);
      unsubscribe();
    };
  }, [pulseScale]);

  const handlePress = (ev: any) => {
    // Stop pulsing animation when tab is pressed
    // Smoothly return to normal size
    cancelAnimation(pulseScale);
    pulseScale.value = withTiming(1, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });

    // Always emit the event - let the screen component decide if it should handle it
    // This works because the event listener is only active when the screen is focused
    emitSpheresTabPress();

    // Always call the original onPress
    props.onPress?.(ev);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PlatformPressable
        {...props}
        onPress={handlePress}
        onPressIn={(ev) => {
          if (Platform.OS === 'ios') {
            // Add a soft haptic feedback when pressing down on the tabs.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}
      />
    </Animated.View>
  );
}
