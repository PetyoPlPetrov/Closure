import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect, useMemo, useState } from 'react';
import { emitEventsTabPress } from '@/utils/events-tab-press';
import { emitHomeTabPress } from '@/utils/home-tab-press';
import { emitAIButtonPress } from '@/utils/ai-button-press';
import { emitSpheresTabPress } from '@/utils/spheres-tab-press';
import {
  getCosmicPulseAccentSphere,
  subscribeCosmicPulseAccentSphere,
} from '@/utils/cosmic-pulse-accent-sphere';
import { getCosmicPulseRingAccent } from '@/utils/sphere-styles';
import { hexToRgb } from '@/utils/moment-pill-glyph';
import { useSegments } from 'expo-router';
import { useUnsavedChanges } from '@/utils/UnsavedChangesContext';
import { useTranslate } from '@/utils/languages/use-translate';

/** Routes where switching tabs should consult UnsavedChangesContext. Entity hubs (edit-job, edit-family-member, …) are menus only — real drafts live on add-* / add-idealized-memory. */
const TAB_UNSAVED_CHANGE_ROUTE_SUFFIXES = [
  'add-ex-profile',
  'add-job',
  'add-family-member',
  'add-friend',
  'add-hobby',
  'add-idealized-memory',
  'idealized-memories',
] as const;

function lastSegmentMayHaveUnsavedDraft(segments: string[] | undefined): boolean {
  if (!Array.isArray(segments) || segments.length === 0) return false;
  const last = segments[segments.length - 1];
  return (TAB_UNSAVED_CHANGE_ROUTE_SUFFIXES as readonly string[]).includes(last);
}

export function HapticTab(props: BottomTabBarButtonProps) {
  const pressScale = useSharedValue(1);
  const segments = useSegments();
  const { checkUnsavedChanges, resetScreen } = useUnsavedChanges();
  const t = useTranslate();

  const shouldCheckUnsavedChanges = lastSegmentMayHaveUnsavedDraft(segments);

  // Simple approach: always animate on press
  const handlePress = (ev: any) => {
    // Check for unsaved changes when navigating away from screens that host drafts
    if (shouldCheckUnsavedChanges) {
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

  const shouldCheckUnsavedChanges = lastSegmentMayHaveUnsavedDraft(segments);

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
      if (shouldCheckUnsavedChanges) {
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

    if (shouldCheckUnsavedChanges) {
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

  const shouldCheckUnsavedChanges = lastSegmentMayHaveUnsavedDraft(segments);

  const handlePress = (ev: any) => {
    if (shouldCheckUnsavedChanges) {
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

function aiPulsePeak(spotlight: boolean, isDark: boolean): number {
  if (spotlight) return isDark ? 1.14 : 1.055;
  return isDark ? 1.08 : 1.028;
}

// Central AI button rendered between Spheres and Events tabs
export function AITabButton({
  size,
  spotlight = false,
  onPressed,
}: {
  size: number;
  spotlight?: boolean;
  onPressed?: () => void;
}) {
  const colorScheme = useColorScheme();
  const isDark = (colorScheme ?? 'dark') === 'dark';
  const palette = Colors[colorScheme ?? 'dark'];
  const pressScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  const [accentSphere, setAccentSphere] = useState(getCosmicPulseAccentSphere);

  useEffect(() => {
    return subscribeCosmicPulseAccentSphere(() => {
      setAccentSphere(getCosmicPulseAccentSphere());
    });
  }, []);

  const orbitScheme = isDark ? 'dark' : 'light';
  const accentRgb = useMemo(() => {
    const hex = getCosmicPulseRingAccent(accentSphere, orbitScheme);
    return hexToRgb(hex);
  }, [accentSphere, orbitScheme]);
  const { r: accR, g: accG, b: accB } = accentRgb;

  useEffect(() => {
    const peak = aiPulsePeak(spotlight, isDark);
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(peak, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulseScale);
  }, [pulseScale, spotlight, isDark]);

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
      const peak = aiPulsePeak(spotlight, isDark);
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(peak, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }, 520);

    if (Platform.OS === 'ios' && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPressed?.();
    emitAIButtonPress();
  };

  const iconSize = size * 0.42;

  const lightShadowWrap = {
    width: size,
    height: size,
    borderRadius: size / 2,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: spotlight ? 5 : 4 },
    shadowOpacity: spotlight ? 0.32 : 0.2,
    shadowRadius: spotlight ? 16 : 12,
    elevation: spotlight ? 12 : 9,
  };

  /** Orbit cosmic-ring hue — border only; fill/shadow stay theme defaults. */
  const lightInner = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: spotlight ? 1.5 : 1.25,
    borderColor: spotlight
      ? `rgba(${accR}, ${accG}, ${accB}, 0.48)`
      : `rgba(${accR}, ${accG}, ${accB}, 0.3)`,
  };

  return (
    <Animated.View style={animatedStyle}>
      {isDark ? (
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
            shadowColor: Colors.dark.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: spotlight ? 0.9 : 0.6,
            shadowRadius: spotlight ? 14 : 10,
            elevation: spotlight ? 14 : 10,
            borderWidth: 1.5,
            borderColor: spotlight
              ? `rgba(${accR}, ${accG}, ${accB}, 0.95)`
              : `rgba(${accR}, ${accG}, ${accB}, 0.58)`,
          }}
        >
          <Animated.Text style={{ fontSize: iconSize, lineHeight: size * 0.5 }}>✨</Animated.Text>
        </TouchableOpacity>
      ) : (
        <View style={lightShadowWrap}>
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={1}
            style={lightInner}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F3FAF5', '#E3F0E8']}
              locations={[0, 0.45, 1]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
            />
            <MaterialIcons
              name="auto-awesome"
              size={iconSize}
              color={palette.icon}
              style={{ zIndex: 1 }}
            />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}
