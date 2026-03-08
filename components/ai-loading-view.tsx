/**
 * Shared AI loading view: sparkle icon, rotating messages, animated dots.
 * Used by onboarding wizard and AI entity creation modal for a consistent "Sfera AI is analyzing" experience.
 */

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type AILoadingViewProps = {
  messages: string[];
  /** Optional: message rotation interval in ms. Default 2000. */
  intervalMs?: number;
};

export function AILoadingView({
  messages,
  intervalMs = 2000,
}: AILoadingViewProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const [messageIndex, setMessageIndex] = useState(0);

  const sparkleScale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const dotsOpacity = useSharedValue([0.3, 0.3, 0.3]);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  useEffect(() => {
    sparkleScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    sparkleOpacity.value = withRepeat(
      withSequence(withTiming(0.6, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      false,
    );
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    dotsOpacity.value = withRepeat(
      withSequence(
        withTiming([1, 0.3, 0.3], { duration: 400 }),
        withTiming([0.3, 1, 0.3], { duration: 400 }),
        withTiming([0.3, 0.3, 1], { duration: 400 }),
        withTiming([0.3, 0.3, 0.3], { duration: 400 }),
      ),
      -1,
      false,
    );
  }, [sparkleScale, sparkleOpacity, pulseScale, dotsOpacity]);

  const animatedSparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
    opacity: sparkleOpacity.value,
  }));
  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const animatedDot1 = useAnimatedStyle(() => ({ opacity: dotsOpacity.value[0] }));
  const animatedDot2 = useAnimatedStyle(() => ({ opacity: dotsOpacity.value[1] }));
  const animatedDot3 = useAnimatedStyle(() => ({ opacity: dotsOpacity.value[2] }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 40 * fontScale,
          paddingHorizontal: 20 * fontScale,
        },
        circlesContainer: {
          position: "relative",
          width: 200 * fontScale,
          height: 200 * fontScale,
          marginBottom: 24 * fontScale,
          alignItems: "center",
          justifyContent: "center",
        },
        glow: {
          position: "absolute",
          width: 200 * fontScale,
          height: 200 * fontScale,
          borderRadius: 100 * fontScale,
          backgroundColor: colorScheme === "dark" ? "rgba(74, 144, 226, 0.15)" : "rgba(74, 144, 226, 0.2)",
        },
        iconWrapper: {
          position: "absolute",
          width: 140 * fontScale,
          height: 140 * fontScale,
          borderRadius: 70 * fontScale,
          backgroundColor: colorScheme === "dark" ? "rgba(74, 144, 226, 0.15)" : "rgba(74, 144, 226, 0.2)",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10,
        },
        messageContainer: {
          alignItems: "center",
          marginTop: 8 * fontScale,
          paddingHorizontal: 20 * fontScale,
        },
        message: {
          textAlign: "center",
          opacity: 0.9,
          marginBottom: 12 * fontScale,
        },
        dots: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8 * fontScale,
          marginTop: 4 * fontScale,
        },
        dot: {
          width: 8 * fontScale,
          height: 8 * fontScale,
          borderRadius: 4 * fontScale,
          backgroundColor: colors.primary,
        },
      }),
    [colorScheme, colors.primary, fontScale],
  );

  return (
    <View style={styles.container}>
      <View style={styles.circlesContainer}>
        <Animated.View style={[styles.glow, animatedPulseStyle]} />
        <Animated.View style={animatedSparkleStyle}>
          <View style={styles.iconWrapper}>
            <ThemedText
              style={{
                fontSize: 64 * fontScale,
                lineHeight: 64 * fontScale,
                textAlign: "center",
                includeFontPadding: false,
              }}
            >
              ✨
            </ThemedText>
          </View>
        </Animated.View>
      </View>
      <View style={styles.messageContainer}>
        <ThemedText size="l" weight="medium" style={styles.message}>
          {messages[messageIndex]}
        </ThemedText>
        <View style={styles.dots}>
          <Animated.View style={[styles.dot, animatedDot1]} />
          <Animated.View style={[styles.dot, animatedDot2]} />
          <Animated.View style={[styles.dot, animatedDot3]} />
        </View>
      </View>
    </View>
  );
}
