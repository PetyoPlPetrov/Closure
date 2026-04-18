/**
 * A Pressable that pulses (scale down → bounce up → settle) when pressed,
 * matching the HapticTab / HomeTabButton animation pattern.
 */

import * as Haptics from "expo-haptics";
import * as Device from "expo-device";
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/** Faster pulse when action waits on animation end — full tab timing (~600ms) feels sluggish before navigation. */
const DEFER_PULSE_MS = { down: 80, up: 130, settle: 90 } as const;

export type PulsingPressableProps = Omit<PressableProps, "style"> & {
  /**
   * When true, `onPress` runs right after the squeeze + bounce (the visible “pop”), while a short
   * settle animation still runs. That overlaps navigation/modal work with motion so there’s no dead
   * gap after the pulse ends.
   */
  deferPressUntilAnimationEnd?: boolean;
  /**
   * Fire `onPress` on press-in instead of waiting for press release.
   * Useful for back/close actions where responsiveness matters more than waiting for pulse completion.
   */
  triggerPressOnPressIn?: boolean;
  /** Applied to the scaled wrapper (static styles only; matches tab pulse visuals). */
  style?: StyleProp<ViewStyle>;
};

export function PulsingPressable({
  onPress,
  onPressIn,
  children,
  style,
  deferPressUntilAnimationEnd = false,
  triggerPressOnPressIn = false,
  ...rest
}: PulsingPressableProps) {
  const pressScale = useSharedValue(1);

  const startPulse = (runPressAfterPulse: boolean, ev: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
    if (Platform.OS === "ios" && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const runPress = () => {
      onPress?.(ev);
    };

    if (runPressAfterPulse && deferPressUntilAnimationEnd) {
      pressScale.value = withSequence(
        withTiming(0.88, {
          duration: DEFER_PULSE_MS.down,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1.08, {
          duration: DEFER_PULSE_MS.up,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (finished) {
            runOnJS(runPress)();
          }
        }),
        withTiming(1, {
          duration: DEFER_PULSE_MS.settle,
          easing: Easing.inOut(Easing.ease),
        })
      );
    } else {
      pressScale.value = withSequence(
        withTiming(0.82, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(1.15, { duration: 250, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
      );
      if (runPressAfterPulse) {
        onPress?.(ev);
      }
    }
  };

  const handlePressIn = (
    ev: Parameters<NonNullable<PressableProps["onPressIn"]>>[0],
  ) => {
    if (triggerPressOnPressIn) {
      // Start pulse and trigger action immediately for snappy navigation/back actions.
      startPulse(false, ev as Parameters<NonNullable<PressableProps["onPress"]>>[0]);
      onPress?.(ev as Parameters<NonNullable<PressableProps["onPress"]>>[0]);
    }
    onPressIn?.(ev);
  };

  const handlePress = (
    ev: Parameters<NonNullable<PressableProps["onPress"]>>[0],
  ) => {
    if (triggerPressOnPressIn) return;
    startPulse(true, ev);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPress={handlePress}
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
