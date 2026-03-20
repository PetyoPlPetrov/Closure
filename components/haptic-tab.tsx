import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import { Alert, Platform, TouchableOpacity } from 'react-native';
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
import { emitEventsTabPress } from '@/utils/events-tab-press';
import { emitHomeTabPress } from '@/utils/home-tab-press';
import { emitAIButtonPress } from '@/utils/ai-button-press';
import { emitSpheresTabPress } from '@/utils/spheres-tab-press';
import { useSegments } from 'expo-router';
import { useUnsavedChanges } from '@/utils/UnsavedChangesContext';
import { useTranslate } from '@/utils/languages/use-translate';

export function HapticTab(props: BottomTabBarButtonProps) {
  const pressScale = useSharedValue(1);
  const segments = useSegments();
  const { checkUnsavedChanges, resetScreen } = useUnsavedChanges();
  const t = useTranslate();

  // Check if we're on any edit/add screen that might have unsaved changes
  const editScreens = [
    'add-ex-profile', 'add-job', 'add-family-member', 'add-friend', 'add-hobby',
    'add-idealized-memory', 'edit-profile', 'edit-job', 'edit-family-member',
    'edit-friend', 'edit-hobby', 'idealized-memories'
  ];
  const isOnEditScreen = Array.isArray(segments) &&
    segments.length > 0 &&
    editScreens.includes(segments[segments.length - 1]);

  // Simple approach: always animate on press
  const handlePress = (ev: any) => {
    // Check for unsaved changes when navigating away from edit/add screens
    if (isOnEditScreen) {
      const { hasChanges, screenId } = checkUnsavedChanges();
      if (hasChanges) {
        Alert.alert(
          t('memory.unsavedChanges.title'),
          t('memory.unsavedChanges.message'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('common.discard'),
              style: 'destructive',
              onPress: () => {
                if (screenId) {
                  resetScreen(screenId);
                }
                props.onPress?.(ev);
              },
            },
          ]
        );
        return;
      }
    }

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

    // Only trigger haptics on real iOS devices (not simulator)
    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Silently ignore haptic errors (e.g., on simulator)
      });
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
  const segments = useSegments();
  const { checkUnsavedChanges, resetScreen } = useUnsavedChanges();
  const t = useTranslate();

  // Check if we're on any edit/add screen that might have unsaved changes
  const editScreens = [
    'add-ex-profile', 'add-job', 'add-family-member', 'add-friend', 'add-hobby',
    'add-idealized-memory', 'edit-profile', 'edit-job', 'edit-family-member',
    'edit-friend', 'edit-hobby', 'idealized-memories'
  ];
  const isOnEditScreen = Array.isArray(segments) &&
    segments.length > 0 &&
    editScreens.includes(segments[segments.length - 1]);

  // All screens that are part of the spheres edit flow
  const spheresFlowScreens = [
    'spheres',
    'add-ex-profile', 'add-job', 'add-family-member', 'add-friend', 'add-hobby',
    'add-idealized-memory', 'edit-profile', 'edit-job', 'edit-family-member',
    'edit-friend', 'edit-hobby', 'idealized-memories',
    'relationship-detail', 'job-detail', 'family-member-detail', 'friend-detail', 'hobby-detail',
  ];
  const isOnSpheresFlow = Array.isArray(segments) &&
    segments.length > 0 &&
    spheresFlowScreens.includes(segments[segments.length - 1]);

  const doSpheresTabPress = () => {
    emitSpheresTabPress();
    pressScale.value = withSequence(
      withTiming(0.92, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(1.02, { duration: 250, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
    );
    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePress = (ev: any) => {
    // If on spheres edit flow, check for unsaved changes first, then let spheres screen handle navigation
    if (isOnSpheresFlow) {
      if (isOnEditScreen) {
        const { hasChanges, screenId } = checkUnsavedChanges();
        if (hasChanges) {
          Alert.alert(
            t('memory.unsavedChanges.title'),
            t('memory.unsavedChanges.message'),
            [
              {
                text: t('common.cancel'),
                style: 'cancel',
              },
              {
                text: t('common.discard'),
                style: 'destructive',
                onPress: () => {
                  if (screenId) {
                    resetScreen(screenId);
                  }
                  doSpheresTabPress();
                },
              },
            ]
          );
          return;
        }
      }
      doSpheresTabPress();
      return;
    }

    if (isOnEditScreen) {
      const { hasChanges, screenId } = checkUnsavedChanges();
      if (hasChanges) {
        Alert.alert(
        t('memory.unsavedChanges.title'),
        t('memory.unsavedChanges.message'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => {
              if (screenId) {
                resetScreen(screenId);
              }
              emitHomeTabPress();
              props.onPress?.(ev);
            },
          },
        ]
        );
        return;
      }
    }

    // Emit so Home screen can show loader even when already focused (tabPress may not fire)
    emitHomeTabPress();
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

    // Only trigger haptics on real iOS devices (not simulator)
    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Silently ignore haptic errors (e.g., on simulator)
      });
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

// Custom events tab button – emits on press so the events screen can return to main view when already focused
export function EventsTabButton(props: BottomTabBarButtonProps) {
  const pressScale = useSharedValue(1);
  const segments = useSegments();
  const { checkUnsavedChanges, resetScreen } = useUnsavedChanges();
  const t = useTranslate();

  // Check if we're on any edit/add screen that might have unsaved changes
  const editScreens = [
    'add-ex-profile', 'add-job', 'add-family-member', 'add-friend', 'add-hobby',
    'add-idealized-memory', 'edit-profile', 'edit-job', 'edit-family-member',
    'edit-friend', 'edit-hobby', 'idealized-memories'
  ];
  const isOnEditScreen = Array.isArray(segments) &&
    segments.length > 0 &&
    editScreens.includes(segments[segments.length - 1]);

  const handlePress = (ev: any) => {
    if (isOnEditScreen) {
      const { hasChanges, screenId } = checkUnsavedChanges();
      if (hasChanges) {
        Alert.alert(
        t('memory.unsavedChanges.title'),
        t('memory.unsavedChanges.message'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => {
              if (screenId) {
                resetScreen(screenId);
              }
              emitEventsTabPress();
              props.onPress?.(ev);
            },
          },
        ]
        );
        return;
      }
    }

    emitEventsTabPress();
    pressScale.value = withSequence(
      withTiming(0.92, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(1.02, { duration: 250, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
    );
    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    props.onPress?.(ev);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PlatformPressable {...props} onPress={handlePress} />
    </Animated.View>
  );
}

// Central AI button rendered between Spheres and Events tabs
export function AITabButton({ size }: { size: number }) {
  const pressScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulseScale);
  }, [pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * pressScale.value }],
  }));

  const handlePress = () => {
    cancelAnimation(pulseScale);
    pulseScale.value = 1;
    pressScale.value = withSequence(
      withTiming(0.88, { duration: 120, easing: Easing.out(Easing.ease) }),
      withTiming(1.06, { duration: 200, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 180, easing: Easing.inOut(Easing.ease) }),
    );
    // Resume pulse after animation
    setTimeout(() => {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }, 520);

    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    emitAIButtonPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#1A2F4A',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#64B5F6',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 10,
          borderWidth: 1.5,
          borderColor: 'rgba(100, 181, 246, 0.5)',
        }}
      >
        <Animated.Text style={{ fontSize: size * 0.42, lineHeight: size * 0.5 }}>✨</Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
