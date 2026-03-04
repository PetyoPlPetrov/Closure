/**
 * Thin progress line shown above the tab bar when home view is transitioning
 * (e.g. entity select or back from entity wheel). First second fills to 80%;
 * if redirect hasn't happened, second second fills remainder to 95%. Hides when view changes.
 */

import { useHomeTransitionLoaderVisibility } from "@/utils/home-transition-loader-context";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const LINE_HEIGHT = 3;
const PHASE1_TARGET = 0.8;
const PHASE2_TARGET = 0.95;
const PHASE_DURATION_MS = 1000;

export function HomeTransitionLoader({
  anchor = "bottom",
}: { anchor?: "top" | "bottom" } = {}) {
  const { momentColors } = useMomentColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withSequence(
      withTiming(PHASE1_TARGET, {
        duration: PHASE_DURATION_MS,
        easing: Easing.linear,
      }),
      withTiming(PHASE2_TARGET, {
        duration: PHASE_DURATION_MS,
        easing: Easing.linear,
      })
    );
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

/** Renders the loader above tab bar when visible. Use as sibling of main content for correct stacking. */
export function HomeTransitionLoaderOverlay() {
  const visibility = useHomeTransitionLoaderVisibility();
  const isVisible = visibility?.isVisible ?? false;
  if (!isVisible) return null;
  return (
    <View
      style={[
        styles.overlay,
        {
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
      pointerEvents="none"
    >
      <HomeTransitionLoader anchor="top" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
    overflow: "hidden",
  },
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
