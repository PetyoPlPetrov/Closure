/**
 * Constellation background with nebula fog and star field —
 * creates an immersive cosmic atmosphere behind the spheres.
 */

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle as SvgCircle,
  Defs,
  Ellipse,
  Line,
  RadialGradient,
  Stop,
} from "react-native-svg";

type Star = { x: number; y: number };

/** Deterministic pseudo-random for stable star positions across renders */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Nebula cloud definitions ────────────────────────────────────────────────

const NEBULA_CLOUDS = [
  // Subtle blue-grey wash to unify with the cosmic image
  { cx: 0.50, cy: 0.45, rx: 0.75, ry: 0.50, color: "#1A3050", peak: 0.10 },
  // Light warm haze around avatar area
  { cx: 0.40, cy: 0.28, rx: 0.40, ry: 0.22, color: "#8B7860", peak: 0.08 },
  // Subtle purple accent — upper right
  { cx: 0.78, cy: 0.14, rx: 0.30, ry: 0.18, color: "#5B3D8F", peak: 0.06 },
  // Subtle blue — lower center
  { cx: 0.50, cy: 0.62, rx: 0.45, ry: 0.25, color: "#2A5080", peak: 0.07 },
];

// ─── Star field generator ────────────────────────────────────────────────────

const TOTAL_STARS = 120;

function generateStarField(
  width: number,
  height: number,
  count: number,
): { x: number; y: number; r: number; opacity: number }[] {
  const stars: { x: number; y: number; r: number; opacity: number }[] = [];
  for (let i = 0; i < count; i++) {
    const x = seededRandom(i * 3 + 1) * width;
    const y = seededRandom(i * 3 + 2) * height;
    const sizeRand = seededRandom(i * 3 + 3);

    let r: number;
    let opacity: number;

    if (sizeRand > 0.92) {
      // Bright star (~8 %)
      r = 1.8 + seededRandom(i * 7 + 100) * 1.2;
      opacity = 0.55 + seededRandom(i * 11 + 200) * 0.35;
    } else if (sizeRand > 0.65) {
      // Medium star (~27 %)
      r = 0.9 + seededRandom(i * 7 + 100) * 0.8;
      opacity = 0.3 + seededRandom(i * 11 + 200) * 0.2;
    } else {
      // Faint star (~65 %)
      r = 0.3 + seededRandom(i * 7 + 100) * 0.6;
      opacity = 0.12 + seededRandom(i * 11 + 200) * 0.2;
    }

    stars.push({ x, y, r, opacity });
  }
  return stars;
}

// ─── Constellation geometry (unchanged layout) ──────────────────────────────

function getConstellationData(width: number, height: number) {
  const yOffset = height * 0.06;

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

  const c2: Star[] = [
    { x: width * 0.08, y: height * 0.32 },
    { x: width * 0.22, y: height * 0.28 },
    { x: width * 0.18, y: height * 0.36 },
    { x: width * 0.35, y: height * 0.34 },
    { x: width * 0.3, y: height * 0.4 },
  ];
  const l2: [number, number][] = [[0, 1], [1, 2], [1, 3], [3, 4]];

  const c3: Star[] = [
    { x: width * 0.12, y: height * 0.5 },
    { x: width * 0.26, y: height * 0.48 },
    { x: width * 0.2, y: height * 0.55 },
    { x: width * 0.38, y: height * 0.52 },
  ];
  const l3: [number, number][] = [[0, 1], [1, 2], [1, 3]];

  const c4: Star[] = [
    { x: width * 0.7, y: height * 0.38 },
    { x: width * 0.82, y: height * 0.35 },
    { x: width * 0.78, y: height * 0.44 },
    { x: width * 0.92, y: height * 0.42 },
    { x: width * 0.88, y: height * 0.5 },
  ];
  const l4: [number, number][] = [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4]];

  const c5: Star[] = [
    { x: width * 0.5, y: height * 0.58 },
    { x: width * 0.62, y: height * 0.62 },
    { x: width * 0.55, y: height * 0.68 },
    { x: width * 0.72, y: height * 0.65 },
  ];
  const l5: [number, number][] = [[0, 1], [1, 2], [1, 3]];

  const c6: Star[] = [
    { x: width * 0.2, y: height * 0.78 },
    { x: width * 0.35, y: height * 0.75 },
    { x: width * 0.28, y: height * 0.82 },
    { x: width * 0.45, y: height * 0.8 },
  ];
  const l6: [number, number][] = [[0, 1], [1, 2], [1, 3]];

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

// ─── Component ───────────────────────────────────────────────────────────────

export function ConstellationBackground({
  width,
  height,
  constellationAmount = 10,
  constellationOpacity = 10,
}: {
  width: number;
  height: number;
  /** 0–10, controls how many constellation groups, nebula clouds, and stars are shown. Default 10 = full. */
  constellationAmount?: number;
  /** 0–10, controls visibility (opacity) of constellations, stars, nebula. Default 10 = full. */
  constellationOpacity?: number;
}) {
  const { allStars, allLines, scatteredDots } = getConstellationDataWithAmount(width, height, constellationAmount);
  const opacityMult = constellationOpacity / 10;

  const nebulaCount =
    constellationAmount <= 0
      ? 0
      : Math.max(2, Math.ceil((constellationAmount / 10) * NEBULA_CLOUDS.length));
  const starFieldCount =
    constellationAmount <= 0
      ? 0
      : Math.max(10, Math.round((constellationAmount / 10) * TOTAL_STARS));

  const starField = useMemo(
    () => generateStarField(width, height, starFieldCount),
    [width, height, starFieldCount],
  );

  const brightStars = useMemo(
    () => starField.filter((s) => s.r > 1.5),
    [starField],
  );

  if (constellationAmount <= 0 || width === 0 || height === 0) return null;

  const nebulae = NEBULA_CLOUDS.slice(0, nebulaCount);

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
      pointerEvents="none"
    >
      <Svg width={width} height={height}>
        {/* ── Nebula fog gradient defs ── */}
        <Defs>
          {nebulae.map((cloud, i) => (
            <RadialGradient
              key={`ng-${i}`}
              id={`nebula-${i}`}
              cx="50%"
              cy="50%"
              r="50%"
              fx="45%"
              fy="45%"
            >
              <Stop offset="0" stopColor={cloud.color} stopOpacity={String(cloud.peak * opacityMult)} />
              <Stop offset="0.25" stopColor={cloud.color} stopOpacity={String(cloud.peak * 0.75 * opacityMult)} />
              <Stop offset="0.50" stopColor={cloud.color} stopOpacity={String(cloud.peak * 0.45 * opacityMult)} />
              <Stop offset="0.75" stopColor={cloud.color} stopOpacity={String(cloud.peak * 0.15 * opacityMult)} />
              <Stop offset="1" stopColor={cloud.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>

        {/* ── Nebula clouds (bottom layer) ── */}
        {nebulae.map((cloud, i) => (
          <Ellipse
            key={`nebula-${i}`}
            cx={cloud.cx * width}
            cy={cloud.cy * height}
            rx={cloud.rx * width}
            ry={cloud.ry * height}
            fill={`url(#nebula-${i})`}
          />
        ))}

        {/* ── Star field — dense scattered stars ── */}
        {starField.map((s, i) => (
          <SvgCircle
            key={`sf-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={`rgba(255,255,255,${(s.opacity * opacityMult).toFixed(3)})`}
          />
        ))}

        {/* ── Glow halos around brightest stars ── */}
        {brightStars.map((s, i) => (
          <SvgCircle
            key={`glow-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r * 3.5}
            fill={`rgba(255,255,255,${(s.opacity * 0.18 * opacityMult).toFixed(3)})`}
          />
        ))}

        {/* ── Constellation lines ── */}
        {allLines.map((line, i) => (
          <Line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={`rgba(255,255,255,${(0.08 * opacityMult).toFixed(3)})`}
            strokeWidth={0.5}
          />
        ))}

        {/* ── Scattered dots ── */}
        {scatteredDots.map((d, i) => (
          <SvgCircle
            key={`scatter-${i}`}
            cx={d.x}
            cy={d.y}
            r={0.8}
            fill={`rgba(255,255,255,${(0.15 * opacityMult).toFixed(3)})`}
          />
        ))}

        {/* ── Constellation stars ── */}
        {allStars.map((s, i) => (
          <SvgCircle
            key={`star-${i}`}
            cx={s.x}
            cy={s.y}
            r={1.2}
            fill={`rgba(255,255,255,${(0.22 * opacityMult).toFixed(3)})`}
          />
        ))}
      </Svg>
    </View>
  );
}
