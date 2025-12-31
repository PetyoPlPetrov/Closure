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
import { useEffect, useRef } from 'react';
import { emitSpheresTabPress } from '@/utils/spheres-tab-press';
import { onSpheresTabPulseRequest } from '@/utils/spheres-tab-pulse';
import { useSegments } from 'expo-router';

export function HapticTab(props: BottomTabBarButtonProps) {
  const pressScale = useSharedValue(1);

  // Simple approach: always animate on press
  const handlePress = (ev: any) => {
    console.log('[HapticTab] Press detected');
    // Always animate when pressed
    pressScale.value = withSequence(
      // Press down
      withTiming(0.92, {
        duration: 150,
        easing: Easing.out(Easing.ease),
      }),
      // Bounce back up (subtle)
      withTiming(1.02, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      }),
      // Settle
      withTiming(1, {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      })
    );

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Call original onPress
    props.onPress?.(ev);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressScale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <PlatformPressable
        {...props}
        onPress={handlePress}
      />
    </Animated.View>
  );
}

// Custom home tab button that intercepts presses even when already focused
export function HomeTabButton(props: BottomTabBarButtonProps) {
  const pressScale = useSharedValue(1);

  // Simple approach: always animate on press, the navigation system will handle whether to navigate
  const handlePress = (ev: any) => {
    console.log('[HomeTabButton] Press detected');
    // Always animate when pressed
    pressScale.value = withSequence(
      // Press down
      withTiming(0.92, {
        duration: 150,
        easing: Easing.out(Easing.ease),
      }),
      // Bounce back up (subtle)
      withTiming(1.02, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      }),
      // Settle
      withTiming(1, {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      })
    );

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Call original onPress
    props.onPress?.(ev);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressScale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <PlatformPressable
        {...props}
        onPress={handlePress}
      />
    </Animated.View>
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

  const pressScale = useSharedValue(1);

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

  // Modified press handler to include animation
  const handlePressWithAnimation = (ev: any) => {
    console.log('[SpheresTabButton] Press detected');

    // Stop pulsing animation when tab is pressed
    cancelAnimation(pulseScale);
    pulseScale.value = withTiming(1, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });

    // Animate the press
    cancelAnimation(pressScale);
    pressScale.value = withSequence(
      // Press down
      withTiming(0.92, {
        duration: 150,
        easing: Easing.out(Easing.ease),
      }),
      // Bounce back up (subtle)
      withTiming(1.02, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      }),
      // Settle
      withTiming(1, {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      })
    );

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Always emit the event - let the screen component decide if it should handle it
    emitSpheresTabPress();

    // Always call the original onPress
    props.onPress?.(ev);
  };

  // Combine both animations
  const combinedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * pressScale.value }],
  }));

  return (
    <Animated.View style={combinedAnimatedStyle}>
      <PlatformPressable
        {...props}
        onPress={handlePressWithAnimation}
      />
    </Animated.View>
  );
}
