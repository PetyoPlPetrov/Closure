/**
 * Fireworks / Confetti burst for celebrating correct wheel exam answers.
 */

import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: SW, height: SH } = Dimensions.get("window");

const PARTICLE_COUNT = 24;
const COLORS = [
  "#FFD700", // gold
  "#FFA500", // orange
  "#FF6B6B", // coral
  "#4ECDC4", // teal
  "#95E1D3", // mint
  "#F38181", // pink
  "#AA96DA", // lavender
  "#FCBAD3", // light pink
];

interface FireworksProps {
  visible: boolean;
  onComplete?: () => void;
  duration?: number;
}

export function Fireworks({
  visible,
  onComplete,
  duration = 2500,
}: FireworksProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, { duration: 0 }, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      }),
    );
  }, [visible, duration, onComplete, progress]);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * 2 * Math.PI + Math.random() * 0.5;
        const distance = 80 + Math.random() * 120;
        return {
          targetX: Math.cos(angle) * distance,
          targetY: Math.sin(angle) * distance,
          color: COLORS[i % COLORS.length],
          size: 6 + Math.random() * 6,
          rotation: Math.random() * 360,
        };
      }),
    [],
  );

  if (!visible) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityLabel="Celebration fireworks"
    >
      {particles.map((p, i) => (
        <FireworkParticle
          key={i}
          progress={progress}
          targetX={p.targetX}
          targetY={p.targetY}
          color={p.color}
          size={p.size}
          rotation={p.rotation}
          centerX={SW / 2}
          centerY={SH / 2 - 80}
        />
      ))}
    </View>
  );
}

function FireworkParticle({
  progress,
  targetX,
  targetY,
  color,
  size,
  rotation,
  centerX,
  centerY,
}: {
  progress: Animated.SharedValue<number>;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  rotation: number;
  centerX: number;
  centerY: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const eased = 1 - Math.pow(1 - p, 1.5);
    const x = centerX + targetX * eased - size / 2;
    const y = centerY + targetY * eased - size / 2;
    const opacity = p < 0.7 ? 1 : (1 - p) / 0.3;
    const scale = 1 + (1 - p) * 0.3;

    return {
      position: "absolute" as const,
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity,
      transform: [
        { scale },
        { rotate: `${rotation + eased * 180}deg` },
      ],
    };
  });

  return <Animated.View style={style} />;
}
