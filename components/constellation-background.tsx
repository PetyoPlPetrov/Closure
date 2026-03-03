/**
 * Constellation background — small dots connected by thin lines,
 * evoking a starry network across the whole screen. Used in both focused and classic home views.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle as SvgCircle, Line } from "react-native-svg";

type Star = { x: number; y: number };

function getConstellationData(width: number, height: number) {
  const yOffset = height * 0.06;

  // Constellation 1 — upper (original cluster)
  const c1: Star[] = [
    { x: width * 0.35, y: height * 0.06 + yOffset },
    { x: width * 0.55, y: height * 0.04 + yOffset },
    { x: width * 0.72, y: height * 0.08 + yOffset },
    { x: width * 0.45, y: height * 0.12 + yOffset },
    { x: width * 0.62, y: height * 0.14 + yOffset },
    { x: width * 0.82, y: height * 0.11 + yOffset },
    { x: width * 0.28, y: height * 0.15 + yOffset },
    { x: width * 0.15, y: height * 0.1 + yOffset },
    { x: width * 0.9, y: height * 0.06 + yOffset },
    { x: width * 0.6, y: height * 0.2 + yOffset },
    { x: width * 0.75, y: height * 0.17 + yOffset },
    { x: width * 0.5, y: height * 0.24 + yOffset },
  ];
  const l1: [number, number][] = [
    [0, 1], [1, 2], [1, 4], [3, 4], [0, 3], [4, 5], [7, 0], [6, 3], [2, 8], [9, 10], [10, 5], [9, 11],
  ];

  // Constellation 2 — upper-mid
  const c2: Star[] = [
    { x: width * 0.08, y: height * 0.32 },
    { x: width * 0.22, y: height * 0.28 },
    { x: width * 0.18, y: height * 0.36 },
    { x: width * 0.35, y: height * 0.34 },
    { x: width * 0.3, y: height * 0.4 },
  ];
  const l2: [number, number][] = [[0, 1], [1, 2], [1, 3], [3, 4]];

  // Constellation 3 — center-left
  const c3: Star[] = [
    { x: width * 0.12, y: height * 0.5 },
    { x: width * 0.26, y: height * 0.48 },
    { x: width * 0.2, y: height * 0.55 },
    { x: width * 0.38, y: height * 0.52 },
  ];
  const l3: [number, number][] = [[0, 1], [1, 2], [1, 3]];

  // Constellation 4 — center-right
  const c4: Star[] = [
    { x: width * 0.7, y: height * 0.38 },
    { x: width * 0.82, y: height * 0.35 },
    { x: width * 0.78, y: height * 0.44 },
    { x: width * 0.92, y: height * 0.42 },
    { x: width * 0.88, y: height * 0.5 },
  ];
  const l4: [number, number][] = [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4]];

  // Constellation 5 — lower-mid
  const c5: Star[] = [
    { x: width * 0.5, y: height * 0.58 },
    { x: width * 0.62, y: height * 0.62 },
    { x: width * 0.55, y: height * 0.68 },
    { x: width * 0.72, y: height * 0.65 },
  ];
  const l5: [number, number][] = [[0, 1], [1, 2], [1, 3]];

  // Constellation 6 — lower
  const c6: Star[] = [
    { x: width * 0.2, y: height * 0.78 },
    { x: width * 0.35, y: height * 0.75 },
    { x: width * 0.28, y: height * 0.82 },
    { x: width * 0.45, y: height * 0.8 },
  ];
  const l6: [number, number][] = [[0, 1], [1, 2], [1, 3]];

  // Constellation 7 — bottom-right
  const c7: Star[] = [
    { x: width * 0.75, y: height * 0.82 },
    { x: width * 0.88, y: height * 0.78 },
    { x: width * 0.82, y: height * 0.86 },
  ];
  const l7: [number, number][] = [[0, 1], [1, 2]];

  const allConstellationStars = [c1, c2, c3, c4, c5, c6, c7];
  const allConstellationLines = [
    l1.map(([a, b]) => ({ x1: c1[a].x, y1: c1[a].y, x2: c1[b].x, y2: c1[b].y })),
    l2.map(([a, b]) => ({ x1: c2[a].x, y1: c2[a].y, x2: c2[b].x, y2: c2[b].y })),
    l3.map(([a, b]) => ({ x1: c3[a].x, y1: c3[a].y, x2: c3[b].x, y2: c3[b].y })),
    l4.map(([a, b]) => ({ x1: c4[a].x, y1: c4[a].y, x2: c4[b].x, y2: c4[b].y })),
    l5.map(([a, b]) => ({ x1: c5[a].x, y1: c5[a].y, x2: c5[b].x, y2: c5[b].y })),
    l6.map(([a, b]) => ({ x1: c6[a].x, y1: c6[a].y, x2: c6[b].x, y2: c6[b].y })),
    l7.map(([a, b]) => ({ x1: c7[a].x, y1: c7[a].y, x2: c7[b].x, y2: c7[b].y })),
  ];

  // Scattered dots across full height (0.1 to 0.92)
  const scatterYMin = height * 0.1;
  const scatterYMax = height * 0.92;
  const scatterXs = [0.22, 0.4, 0.52, 0.68, 0.78, 0.38, 0.58, 0.18, 0.85, 0.32, 0.7, 0.1, 0.48, 0.94, 0.56, 0.24, 0.64, 0.8];
  const scatterYs = [0.12, 0.08, 0.25, 0.15, 0.35, 0.42, 0.5, 0.38, 0.22, 0.6, 0.48, 0.72, 0.55, 0.18, 0.65, 0.78, 0.88, 0.7];
  const scatteredDots: Star[] = [];
  for (let i = 0; i < scatterXs.length; i++) {
    scatteredDots.push({
      x: width * scatterXs[i],
      y: scatterYMin + (scatterYMax - scatterYMin) * scatterYs[i],
    });
  }

  return { allConstellationStars, allConstellationLines, scatteredDots };
}

function getConstellationDataWithAmount(
  width: number,
  height: number,
  amount: number,
): { allStars: Star[]; allLines: { x1: number; y1: number; x2: number; y2: number }[]; scatteredDots: Star[] } {
  const { allConstellationStars, allConstellationLines, scatteredDots } = getConstellationData(width, height);
  if (amount <= 0) {
    return { allStars: [], allLines: [], scatteredDots: [] };
  }
  const numGroups = Math.min(7, Math.max(1, Math.round((amount / 10) * 7)));
  const allStars = allConstellationStars.slice(0, numGroups).flat();
  const allLines = allConstellationLines.slice(0, numGroups).flat();
  const scatterCount = Math.round((amount / 10) * scatteredDots.length);
  return {
    allStars,
    allLines,
    scatteredDots: scatteredDots.slice(0, scatterCount),
  };
}

export function ConstellationBackground({
  width,
  height,
  constellationAmount = 10,
}: {
  width: number;
  height: number;
  /** 0–10, controls how many constellation groups and scattered dots are shown. Default 10 = full. */
  constellationAmount?: number;
}) {
  const { allStars, allLines, scatteredDots } = getConstellationDataWithAmount(width, height, constellationAmount);

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
      pointerEvents="none"
    >
      <Svg width={width} height={height}>
        {allLines.map((line, i) => (
          <Line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.8}
          />
        ))}
        {scatteredDots.map((d, i) => (
          <SvgCircle
            key={`scatter-${i}`}
            cx={d.x}
            cy={d.y}
            r={1}
            fill="rgba(255,255,255,0.2)"
          />
        ))}
        {allStars.map((s, i) => (
          <SvgCircle
            key={`star-${i}`}
            cx={s.x}
            cy={s.y}
            r={1.5}
            fill="rgba(255,255,255,0.35)"
          />
        ))}
      </Svg>
    </View>
  );
}
