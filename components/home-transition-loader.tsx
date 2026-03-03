/**
 * Thin progress line shown above the tab bar when home view is transitioning
 * (e.g. entity select or back from entity wheel). Fills left-to-right over 1 second.
 */

import { useHomeTransitionLoader } from "@/utils/home-transition-loader-context";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const LINE_HEIGHT = 3;
const DURATION_MS = 1000;

export function HomeTransitionLoader({
  anchor = "bottom",
}: { anchor?: "top" | "bottom" } = {}) {
  const { momentColors } = useMomentColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: DURATION_MS,
      easing: Easing.linear,
    });
    return () => {
      progress.value = 0;
    };
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const trackStyle = [
    styles.track,
    { backgroundColor: "rgba(0,0,0,0.3)" },
    anchor === "top" ? styles.anchorTop : styles.anchorBottom,
  ] as const;

  return (
    <View style={trackStyle} pointerEvents="none">
      <Animated.View
        style={[
          styles.fill,
          fillStyle,
          { backgroundColor: momentColors.sunny.background },
        ]}
      />
    </View>
  );
}

/** Renders the loader above tab bar when visible (consumes context). */
export function HomeTransitionLoaderOverlay() {
  const ctx = useHomeTransitionLoader();
  const isVisible = ctx?.isVisible ?? false;
  if (!isVisible) return null;
  return <HomeTransitionLoader anchor="top" />;
}

const styles = StyleSheet.create({
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
    zIndex: 1000,
    overflow: "hidden",
  },
  anchorTop: { top: 0 },
  anchorBottom: { bottom: 0 },
  fill: {
    height: LINE_HEIGHT,
    borderRadius: 1,
  },
});
