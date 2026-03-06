/**
 * Thin progress line shown above the tab bar when home view is transitioning
 * (e.g. entity select or back from entity wheel). First second fills to 80%;
 * if redirect hasn't happened, second second fills remainder to 95%. Hides when view changes.
 * Uses primary blue to match app theme on cosmic dark background.
 */

import { useHomeTransitionLoaderVisibility } from "@/utils/home-transition-loader-context";
import React, { useEffect } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const LINE_HEIGHT = 2;
const PHASE1_TARGET = 0.8;
const PHASE2_TARGET = 0.95;
const PHASE_DURATION_MS = 1000;

const LOADER_COLOR = "#64B5F6"; // Primary blue - matches app theme, desaturated for dark cosmic background

export function HomeTransitionLoader({
  anchor = "bottom",
}: { anchor?: "top" | "bottom" } = {}) {
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
          { backgroundColor: LOADER_COLOR },
        ]}
      />
    </View>
  );
}

/** Renders the loader above tab bar when visible. Uses Modal so it appears above navigation stack. */
export function HomeTransitionLoaderOverlay() {
  const visibility = useHomeTransitionLoaderVisibility();
  const insets = useSafeAreaInsets();
  const isVisible = visibility?.isVisible ?? false;
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      pointerEvents="none"
    >
      <View
        style={[
          styles.overlay,
          {
            top: insets.top,
          },
        ]}
        pointerEvents="none"
      >
        <HomeTransitionLoader anchor="top" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
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
