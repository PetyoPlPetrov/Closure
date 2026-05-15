/**
 * Shared ring-planet SVG component — futuristic planet with tilted orbital rings.
 * Used by both universe-lessons-screen and focused-entities-view (sfera insights).
 */

import type { LifeSphere } from "@/utils/JourneyProvider";
import React, { useMemo } from "react";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
  Circle as SvgCircle,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

// ─── Seeded random ────────────────────────────────────────────────────────────
export function sr(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Per-sphere ring colors ───────────────────────────────────────────────────

const SPHERE_RINGS: Record<LifeSphere, { core: string; ring1: string; ring2: string; glow: string }> = {
  relationships: { core: "#EF4444", ring1: "#B42323", ring2: "#FCA5A5", glow: "#EF4444" },
  career:        { core: "#3B82F6", ring1: "#215FC4", ring2: "#93C5FD", glow: "#3B82F6" },
  family:        { core: "#10B981", ring1: "#0E8D66", ring2: "#6EE7B7", glow: "#10B981" },
  friends:       { core: "#8B5CF6", ring1: "#5530AA", ring2: "#C4B5FD", glow: "#8B5CF6" },
  hobbies:       { core: "#F97316", ring1: "#B84C08", ring2: "#FDBA74", glow: "#F97316" },
};

/** Orbital colors on light grey — saturated strokes for AAA legibility vs soft surfaces. */
const SPHERE_RINGS_LIGHT: Record<LifeSphere, { core: string; ring1: string; ring2: string; glow: string }> = {
  relationships: { core: "#D32F2F", ring1: "#B71C1C", ring2: "#EF5350", glow: "#C62828" },
  career: { core: "#1976D2", ring1: "#0D47A1", ring2: "#42A5F5", glow: "#1565C0" },
  family: { core: "#2E7D32", ring1: "#1B5E20", ring2: "#66BB6A", glow: "#2E7D32" },
  friends: { core: "#7B1FA2", ring1: "#4A148C", ring2: "#BA68C8", glow: "#6A1B9A" },
  hobbies: { core: "#D84315", ring1: "#BF360C", ring2: "#FF8A65", glow: "#D84315" },
};

export function sphereRingsForScheme(
  sphere: LifeSphere,
  scheme: "light" | "dark",
): { core: string; ring1: string; ring2: string; glow: string } {
  return scheme === "light"
    ? SPHERE_RINGS_LIGHT[sphere] ?? SPHERE_RINGS_LIGHT.career
    : SPHERE_RINGS[sphere] ?? SPHERE_RINGS.career;
}

// ─── Ring-planet SVG ──────────────────────────────────────────────────────────

export const RingPlanetSvg = React.memo(function RingPlanetSvg({
  id,
  colors,
  ringRotation,
  isLight,
  atmoR,
  planetCanvas,
  planetC,
}: {
  id: string;
  colors: { core: string; ring1: string; ring2: string; glow: string };
  ringRotation: SharedValue<number>;
  isLight: boolean;
  atmoR: number;
  planetCanvas: number;
  planetC: number;
}) {
  const { core, ring1, ring2 } = colors;
  const C = planetC;
  const size = planetCanvas;

  // Ring dimensions
  const R0_RX = atmoR * 2.05;
  const R0_RY = atmoR * 0.34;
  const R1_RX = atmoR * 1.72;
  const R1_RY = atmoR * 0.28;
  const R2_RX = atmoR * 1.42;
  const R2_RY = atmoR * 0.20;
  const R3_RX = atmoR * 1.18;
  const R3_RY = atmoR * 0.14;

  const TILT = 22;

  const ring0Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-TILT * 0.7 + ringRotation.value * 0.18}deg` }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${TILT + ringRotation.value * 0.6}deg` }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-TILT + ringRotation.value * 0.4}deg` }],
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${TILT * 0.5 + ringRotation.value * 0.25}deg` }],
  }));

  const dustParticles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const jitter = sr(i * 7 + 3) * 0.18 + 0.92;
      return {
        cx: C + Math.cos(angle) * atmoR * jitter,
        cy: C + Math.sin(angle) * atmoR * jitter * 0.55,
        r: sr(i * 7 + 1) * 1.8 + 0.6,
        op: sr(i * 7 + 5) * 0.35 + 0.12,
      };
    }), [C, atmoR]);

  const svgPos = { position: "absolute" as const, left: 0, top: 0, overflow: "visible" as const };
  const ringViewStyle = { position: "absolute" as const, left: 0, top: 0 };

  return (
    <>
      {/* Outermost faint ring (behind everything) */}
      <Animated.View style={[ringViewStyle, ring0Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgLinearGradient id={`rg1a_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring1} stopOpacity="0.75" />
              <Stop offset="50%"  stopColor={ring1} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={ring1} stopOpacity="0.12" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R0_RX} ry={R0_RY} fill="none" stroke={`url(#rg1a_${id})`} strokeWidth={isLight ? 2.4 : 2.2} strokeDasharray="6 10" opacity={isLight ? 0.5 : 0.38} />
        </Svg>
      </Animated.View>

      {/* Back rings (drawn before planet so they go behind) */}
      <Animated.View style={[ringViewStyle, ring1Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgLinearGradient id={`rg1b_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring1} stopOpacity="0.75" />
              <Stop offset="50%"  stopColor={ring1} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={ring1} stopOpacity="0.12" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R1_RX} ry={R1_RY} fill="none" stroke={`url(#rg1b_${id})`} strokeWidth={5.5} opacity={isLight ? 0.88 : 0.78} />
        </Svg>
      </Animated.View>
      <Animated.View style={[ringViewStyle, ring2Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgLinearGradient id={`rg2_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring2} stopOpacity="0.55" />
              <Stop offset="50%"  stopColor={ring2} stopOpacity="0.30" />
              <Stop offset="100%" stopColor={ring2} stopOpacity="0.08" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R2_RX} ry={R2_RY} fill="none" stroke={`url(#rg2_${id})`} strokeWidth={4.0} opacity={isLight ? 0.78 : 0.68} />
        </Svg>
      </Animated.View>

      {/* Static planet body (atmospheric rim, glow, dust) */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={svgPos}>
        <Defs>
          <RadialGradient id={`atmo_${id}`} cx={`${C}`} cy={`${C}`} r={`${atmoR}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor={core} stopOpacity="0" />
            <Stop offset="62%"  stopColor={core} stopOpacity="0" />
            <Stop offset="80%"  stopColor={core} stopOpacity="0.18" />
            <Stop offset="92%"  stopColor={core} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={core} stopOpacity="0.80" />
          </RadialGradient>
          <RadialGradient id={`corona_${id}`} cx={`${C}`} cy={`${C}`} r={`${atmoR * 1.45}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor={core} stopOpacity="0" />
            <Stop offset="68%"  stopColor={core} stopOpacity="0" />
            <Stop offset="82%"  stopColor={core} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={core} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`inner_${id}`} cx={`${C}`} cy={`${C}`} r={`${atmoR * 0.85}`} gradientUnits="userSpaceOnUse">
            {isLight
              ? [
                  <Stop key="in0" offset="0%" stopColor="#FAFAFA" stopOpacity="0.45" />,
                  <Stop key="in1" offset="55%" stopColor="#ECEFF1" stopOpacity="0.22" />,
                  <Stop key="in2" offset="100%" stopColor="#ECEFF1" stopOpacity="0" />,
                ]
              : [
                  <Stop key="in0" offset="0%" stopColor="#0A1020" stopOpacity="0.55" />,
                  <Stop key="in1" offset="70%" stopColor="#0A1020" stopOpacity="0.25" />,
                  <Stop key="in2" offset="100%" stopColor="#0A1020" stopOpacity="0" />,
                ]}
          </RadialGradient>
          <RadialGradient id={`rimglow_${id}`} cx={`${C}`} cy={`${C}`} r={`${atmoR}`} gradientUnits="userSpaceOnUse">
            {isLight
              ? [
                  <Stop key="rg0" offset="0%" stopColor="#0D0D0D" stopOpacity="0" />,
                  <Stop key="rg1" offset="78%" stopColor="#0D0D0D" stopOpacity="0" />,
                  <Stop key="rg2" offset="90%" stopColor="#0D0D0D" stopOpacity="0.12" />,
                  <Stop key="rg3" offset="100%" stopColor="#0D0D0D" stopOpacity="0.22" />,
                ]
              : [
                  <Stop key="rg0" offset="0%" stopColor="#FFFFFF" stopOpacity="0" />,
                  <Stop key="rg1" offset="82%" stopColor="#FFFFFF" stopOpacity="0" />,
                  <Stop key="rg2" offset="93%" stopColor="#FFFFFF" stopOpacity="0.22" />,
                  <Stop key="rg3" offset="100%" stopColor="#FFFFFF" stopOpacity="0.55" />,
                ]}
          </RadialGradient>
        </Defs>
        <SvgCircle cx={C} cy={C} r={atmoR * 1.75} fill={`url(#corona_${id})`} />
        <SvgCircle cx={C} cy={C} r={atmoR * 1.42} fill={`url(#corona_${id})`} />
        <SvgCircle cx={C} cy={C} r={atmoR}        fill={`url(#atmo_${id})`} />
        <SvgCircle cx={C} cy={C} r={atmoR * 0.85} fill={`url(#inner_${id})`} />
        <SvgCircle cx={C} cy={C} r={atmoR} fill={`url(#rimglow_${id})`} />
        {dustParticles.map((p, i) => (
          <SvgCircle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={core} opacity={p.op} />
        ))}
      </Svg>

      {/* Front innermost ring (on top of planet) */}
      <Animated.View style={[ringViewStyle, ring3Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgLinearGradient id={`rg3_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring2} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={ring2} stopOpacity="0.05" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R3_RX} ry={R3_RY} fill="none" stroke={`url(#rg3_${id})`} strokeWidth={3.2} opacity={isLight ? 0.9 : 0.82} />
        </Svg>
      </Animated.View>
    </>
  );
});
