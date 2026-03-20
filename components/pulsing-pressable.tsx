/**
 * A Pressable that pulses (scale down → bounce up → settle) when pressed,
 * matching the HapticTab / HomeTabButton animation pattern.
 */

import * as Haptics from "expo-haptics";
import * as Device from "expo-device";
import { Platform, Pressable, type PressableProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function PulsingPressable({
  onPress,
  children,
  style,
  ...rest
}: PressableProps) {
  if (__DEV__) {
    console.log("[render] PulsingPressable");
  }
  const pressScale = useSharedValue(1);

  const handlePress = (ev: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
    pressScale.value = withSequence(
      withTiming(0.82, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(1.15, { duration: 250, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
    );

    if (Platform.OS === "ios" && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    onPress?.(ev);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable onPress={handlePress} style={{ flex: 1, justifyContent: "center", alignItems: "center" }} {...rest}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
