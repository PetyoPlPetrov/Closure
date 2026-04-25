import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

type ConstellationBackgroundProps = {
  width: number;
  height: number;
  constellationAmount?: number;
  constellationOpacity?: number;
  linesOpacityScale?: number;
  starFieldMultiplier?: number;
};

export const ConstellationBackground = React.memo(
  function ConstellationBackground({
    width,
    height,
    constellationAmount = 10,
    constellationOpacity = 10,
    starFieldMultiplier = 1,
  }: ConstellationBackgroundProps) {
    if (width <= 0 || height <= 0) return null;
    if (constellationAmount <= 0 || constellationOpacity <= 0) return null;

    const amountNorm = Math.max(0, Math.min(1, constellationAmount / 10));
    const opacityNorm = Math.max(0, Math.min(1, constellationOpacity / 10));
    const densityNorm = Math.max(0.5, Math.min(2, starFieldMultiplier));
    const baseDotCount = Math.round((260 + amountNorm * 240) * densityNorm);
    const clusterDotCount = Math.round((220 + amountNorm * 240) * densityNorm);
    const clusterCount = Math.max(6, Math.round(6 + amountNorm * 6));

    const dots = useMemo(() => {
      const rand = (seed: number) => Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      const rand01 = (seed: number) => {
        const v = rand(seed);
        return v - Math.floor(v);
      };
      const result: Array<{ id: string; x: number; y: number; size: number; opacity: number }> = [];

      // Background stars spread across the full viewport.
      for (let i = 0; i < baseDotCount; i += 1) {
        const seed = i * 17.137 + 3.11;
        const x = rand01(seed * 1.73) * width;
        const y = rand01(seed * 2.11 + 1.2) * height;
        const tier = rand01(seed * 3.19);
        const size = tier > 0.96 ? 3.2 : tier > 0.82 ? 2.6 : tier > 0.5 ? 2.0 : 1.4;
        const baseOpacity = tier > 0.96 ? 0.76 : tier > 0.82 ? 0.58 : tier > 0.5 ? 0.44 : 0.32;
        result.push({
          id: `base-${i}`,
          x,
          y,
          size,
          opacity: Math.min(0.95, baseOpacity * opacityNorm),
        });
      }

      // Cluster hubs create denser "milky way" pockets while staying static.
      const hubs = Array.from({ length: clusterCount }, (_, i) => {
        const seed = 1000 + i * 37.17;
        return {
          x: rand01(seed * 1.31) * width,
          y: rand01(seed * 1.71) * height,
          radius: 24 + rand01(seed * 2.07) * (Math.min(width, height) * 0.12),
        };
      });

      for (let i = 0; i < clusterDotCount; i += 1) {
        const seed = 5000 + i * 11.73;
        const hub = hubs[i % hubs.length];
        const angle = rand01(seed * 1.07) * Math.PI * 2;
        const r = Math.sqrt(rand01(seed * 1.43)) * hub.radius;
        const x = Math.max(0, Math.min(width, hub.x + Math.cos(angle) * r));
        const y = Math.max(0, Math.min(height, hub.y + Math.sin(angle) * r));
        const tier = rand01(seed * 2.01 + 0.4);
        const size = tier > 0.95 ? 3.0 : tier > 0.75 ? 2.4 : 1.7;
        const baseOpacity = tier > 0.95 ? 0.7 : tier > 0.75 ? 0.54 : 0.36;
        result.push({
          id: `cluster-${i}`,
          x,
          y,
          size,
          opacity: Math.min(0.95, baseOpacity * opacityNorm),
        });
      }

      // Safety cap for very high multipliers.
      if (result.length > 1400) {
        return result.slice(0, 1400);
      }
      return result;
    }, [
      baseDotCount,
      clusterCount,
      clusterDotCount,
      height,
      opacityNorm,
      width,
    ]);

    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
        {dots.map((dot) => (
          <View
            key={dot.id}
            style={{
              position: "absolute",
              left: dot.x - dot.size / 2,
              top: dot.y - dot.size / 2,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              backgroundColor: `rgba(255,255,255,${dot.opacity.toFixed(3)})`,
            }}
          />
        ))}
      </View>
    );
  },
);
