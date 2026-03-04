/**
 * Reusable slider row for settings (e.g. orbit duration, constellation amount).
 */

import { ThemedText } from "@/components/themed-text";
import React, { useMemo, useRef } from "react";
import { PanResponder, View } from "react-native";

const SLIDER_TRACK_HEIGHT = 6;
const SLIDER_THUMB_SIZE = 20;

export function SliderRow({
  label,
  value,
  min,
  max,
  onValueChange,
  valueLabel,
  colorScheme,
  colors,
  fontScale,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (v: number) => void;
  valueLabel: string;
  colorScheme: "light" | "dark";
  colors: { text: string; primary: string };
  fontScale: number;
}) {
  const trackRef = useRef<View>(null);
  const fraction = (value - min) / (max - min) || 0;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          trackRef.current?.measureInWindow((x, _y, width) => {
            const touchX = evt.nativeEvent.pageX - x;
            const frac = Math.max(0, Math.min(1, touchX / width));
            const v = min + frac * (max - min);
            onValueChange(Math.round(v));
          });
        },
        onPanResponderMove: (evt) => {
          trackRef.current?.measureInWindow((x, _y, width) => {
            const touchX = evt.nativeEvent.pageX - x;
            const frac = Math.max(0, Math.min(1, touchX / width));
            const v = min + frac * (max - min);
            onValueChange(Math.round(v));
          });
        },
      }),
    [min, max, onValueChange],
  );

  return (
    <View style={{ marginBottom: 16 * fontScale }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <ThemedText style={{ fontSize: 15 * fontScale, opacity: 0.9 }}>
          {label}
        </ThemedText>
        <ThemedText style={{ fontSize: 14 * fontScale, opacity: 0.7 }}>
          {valueLabel}
        </ThemedText>
      </View>
      <View
        ref={trackRef}
        style={{ height: 32, justifyContent: "center" }}
        {...panResponder.panHandlers}
      >
        <View
          style={{
            height: SLIDER_TRACK_HEIGHT,
            borderRadius: SLIDER_TRACK_HEIGHT / 2,
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255,255,255,0.2)"
                : "rgba(0,0,0,0.15)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: `${fraction * 100}%`,
            marginLeft: -SLIDER_THUMB_SIZE / 2,
            width: SLIDER_THUMB_SIZE,
            height: SLIDER_THUMB_SIZE,
            borderRadius: SLIDER_THUMB_SIZE / 2,
            backgroundColor: colors.primary,
            top: (32 - SLIDER_THUMB_SIZE) / 2,
          }}
        />
      </View>
    </View>
  );
}
