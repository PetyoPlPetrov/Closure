/**
 * Constellation background — small dots connected by thin lines,
 * evoking a starry network. Used in both focused and classic home views.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle as SvgCircle, Line } from "react-native-svg";

export function ConstellationBackground({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const stars = [
    { x: width * 0.35, y: height * 0.06 },
    { x: width * 0.55, y: height * 0.04 },
    { x: width * 0.72, y: height * 0.08 },
    { x: width * 0.45, y: height * 0.12 },
    { x: width * 0.62, y: height * 0.14 },
    { x: width * 0.82, y: height * 0.11 },
    { x: width * 0.28, y: height * 0.15 },
    { x: width * 0.15, y: height * 0.1 },
    { x: width * 0.9, y: height * 0.06 },
    { x: width * 0.6, y: height * 0.2 },
    { x: width * 0.75, y: height * 0.17 },
    { x: width * 0.5, y: height * 0.24 },
  ];
  const lines: [number, number][] = [
    [0, 1],
    [1, 2],
    [1, 4],
    [3, 4],
    [0, 3],
    [4, 5],
    [7, 0],
    [6, 3],
    [2, 8],
    [9, 10],
    [10, 5],
    [9, 11],
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {lines.map(([a, b], i) => (
          <Line
            key={`line-${i}`}
            x1={stars[a].x}
            y1={stars[a].y}
            x2={stars[b].x}
            y2={stars[b].y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.8}
          />
        ))}
        {stars.map((s, i) => (
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
