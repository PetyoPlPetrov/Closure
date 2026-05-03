import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

/** Deterministic 0–1 from seed (stable star layout across renders). */
function sinRand01(seed: number): number {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Screen position biased toward the four corners so dots stay away from the central sfera cluster.
 */
export function sampleCornerBiasedPosition(
  width: number,
  height: number,
  seed: number,
): { x: number; y: number } {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  const minSide = Math.min(width, height);
  const pad = Math.max(6, minSide * 0.028);
  const r1 = sinRand01(seed * 1.914);
  const r2 = sinRand01(seed * 2.317 + 0.31);
  const rY = sinRand01(seed * 4.27 + 0.52);
  const quad = Math.floor(sinRand01(seed * 3.101 + 1.12) * 4) % 4;
  /** How far each corner zone extends into the screen (keeps mass out of the middle). */
  const depthX = 0.2 + r2 * 0.2;
  const depthY = 0.2 + sinRand01(seed * 5.03 + 0.88) * 0.2;

  let x: number;
  let y: number;
  if (quad === 0) {
    x = pad + r1 * Math.max(pad * 2, width * depthX - pad);
    y = pad + rY * Math.max(pad * 2, height * depthY - pad);
  } else if (quad === 1) {
    x = width - pad - r1 * Math.max(pad * 2, width * depthX - pad);
    y = pad + rY * Math.max(pad * 2, height * depthY - pad);
  } else if (quad === 2) {
    x = pad + r1 * Math.max(pad * 2, width * depthX - pad);
    y = height - pad - rY * Math.max(pad * 2, height * depthY - pad);
  } else {
    x = width - pad - r1 * Math.max(pad * 2, width * depthX - pad);
    y = height - pad - rY * Math.max(pad * 2, height * depthY - pad);
  }

  return {
    x: Math.max(pad, Math.min(width - pad, x)),
    y: Math.max(pad, Math.min(height - pad, y)),
  };
}

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
    const dots = useMemo(() => {
      if (width <= 0 || height <= 0) return [];
      if (constellationAmount <= 0 || constellationOpacity <= 0) return [];

      const amountNorm = Math.max(0, Math.min(1, constellationAmount / 10));
      const opacityNorm = Math.max(0, Math.min(1, constellationOpacity / 10));
      const densityNorm = Math.max(0.5, Math.min(2, starFieldMultiplier));
      /** Lower than before: fewer background stars while keeping the same setting range. */
      const starScale = 0.42;
      const baseDotCount = Math.round(
        (130 + amountNorm * 120) * densityNorm * starScale,
      );
      const clusterDotCount = Math.round(
        (110 + amountNorm * 120) * densityNorm * starScale,
      );

      const rand01 = sinRand01;
      const result: { id: string; x: number; y: number; size: number; opacity: number }[] = [];

      // Corner-biased stars (same distribution for base + former cluster count).
      const totalDots = baseDotCount + clusterDotCount;
      for (let i = 0; i < totalDots; i += 1) {
        const seed = i * 17.137 + 3.11;
        const { x, y } = sampleCornerBiasedPosition(width, height, seed * 41.3 + 9.02);
        const tier = rand01(seed * 3.19);
        const size = tier > 0.96 ? 3.2 : tier > 0.82 ? 2.6 : tier > 0.5 ? 2.0 : 1.4;
        const baseOpacity = tier > 0.96 ? 0.76 : tier > 0.82 ? 0.58 : tier > 0.5 ? 0.44 : 0.32;
        result.push({
          id: `star-${i}`,
          x,
          y,
          size,
          opacity: Math.min(0.95, baseOpacity * opacityNorm),
        });
      }

      // Safety cap for very high multipliers.
      if (result.length > 600) {
        return result.slice(0, 600);
      }
      return result;
    }, [
      width,
      height,
      constellationAmount,
      constellationOpacity,
      starFieldMultiplier,
    ]);

    if (dots.length === 0) return null;

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
