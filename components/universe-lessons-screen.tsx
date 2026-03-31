/**
 * Universe Lessons Screen — TikTok-style vertical pager.
 * Each card is a futuristic ring-planet: glowing atmospheric rim, tilted orbital
 * rings, transparent center with lesson text floating in space.
 */

import { ThemedText } from "@/components/themed-text";
import { useJourney } from "@/utils/JourneyProvider";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lifeLessons } from "@/utils/life-lessons";
import {
  getSphereShadowColor,
  getSphereSferaColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Circle as SvgCircle,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");

// The planet body radius — fixed, sized relative to screen width
const ATMO_R = SW * 0.96 * 0.34;
// Canvas must be ≥ 2 * R0_RX = 2 * ATMO_R * 2.05 = ATMO_R * 4.1 so rings never clip at any rotation
const PLANET_CANVAS = ATMO_R * 4.4;  // 4.4× gives a comfortable margin beyond the widest ring
const PLANET_C = PLANET_CANVAS / 2;

// Moon avatar size (memory image orbiting the planet top)
const MOON_SIZE = 72;

const HEADER_H = 94;
// Full-screen cards so each planet is perfectly centred. Peek is a separate overlay.
const CARD_HEIGHT = SH;
// How many px of the next planet's rim peek from the bottom
const PEEK_VISIBLE = 72;

// App background
const BG = "#1A2332";

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonCard = {
  id: string;
  text: string;
  memoryTitle: string;
  memoryImageUri?: string;
  sphere: LifeSphere;
  memoryId?: string;
  entityId?: string;
};

const SPHERE_LIST: LifeSphere[] = [
  "relationships", "career", "family", "friends", "hobbies",
];
function getSphereForIndex(i: number): LifeSphere {
  return SPHERE_LIST[i % SPHERE_LIST.length];
}

const SPHERE_ICONS: Record<LifeSphere, string> = {
  relationships: "favorite",
  career: "work",
  family: "family-restroom",
  friends: "people",
  hobbies: "sports-esports",
};

// Per-sphere: colors derived from getSphereSferaColor/getSphereShadowColor (dark mode)
const SPHERE_RINGS: Record<LifeSphere, { core: string; ring1: string; ring2: string; glow: string }> = {
  relationships: { core: "#FF9696", ring1: "#C05050", ring2: "#FFB8B8", glow: "#FF9696" },
  career:        { core: "#96C8FF", ring1: "#3A70C0", ring2: "#C0E0FF", glow: "#96CAFF" },
  family:        { core: "#C896FF", ring1: "#7A40C0", ring2: "#E0C0FF", glow: "#C89CFF" },
  friends:       { core: "#8B5CF6", ring1: "#5530AA", ring2: "#B090FF", glow: "#9B7AFF" },
  hobbies:       { core: "#F97B16", ring1: "#B84000", ring2: "#FFB060", glow: "#F97B16" },
};

// ─── Seeded random ────────────────────────────────────────────────────────────
function sr(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Constellations ───────────────────────────────────────────────────────────
// Three hand-placed constellations in screen-relative coords.
// Each is a list of [x,y] fractions + edges between node indices.
const CONSTELLATIONS: Array<{
  nodes: [number, number][];
  edges: [number, number][];
}> = [
  {
    // Top-left — arrow / spear shape
    nodes: [
      [0.08, 0.08], [0.18, 0.05], [0.25, 0.11],
      [0.20, 0.18], [0.12, 0.20], [0.06, 0.15],
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,3]],
  },
  {
    // Right side — dipper / ladle
    nodes: [
      [0.82, 0.14], [0.90, 0.10], [0.96, 0.15],
      [0.94, 0.23], [0.86, 0.28], [0.80, 0.22],
      [0.74, 0.30], [0.68, 0.40],
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[4,6],[6,7]],
  },
  {
    // Bottom — cross / southern cross
    nodes: [
      [0.20, 0.82], [0.28, 0.78], [0.36, 0.82],
      [0.28, 0.88], [0.28, 0.74],
    ],
    edges: [[0,2],[4,3],[1,0],[1,2]],
  },
];

function ConstellationLayer({ color }: { color: string }) {
  return (
    <>
      {CONSTELLATIONS.map((c, ci) => (
        <React.Fragment key={ci}>
          {/* Lines */}
          {c.edges.map(([a, b], ei) => (
            <Path
              key={ei}
              d={`M ${c.nodes[a][0] * SW} ${c.nodes[a][1] * SH} L ${c.nodes[b][0] * SW} ${c.nodes[b][1] * SH}`}
              stroke={color}
              strokeWidth={0.7}
              strokeOpacity={0.22}
            />
          ))}
          {/* Stars at nodes */}
          {c.nodes.map(([x, y], ni) => (
            <SvgCircle
              key={ni}
              cx={x * SW}
              cy={y * SH}
              r={ni === 0 ? 1.8 : 1.2}
              fill="#FFFFFF"
              opacity={ni === 0 ? 0.75 : 0.55}
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
}

// ─── Static star field ────────────────────────────────────────────────────────
function StarField({ nebulaColor }: { nebulaColor?: string }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        x: sr(i * 3 + 1) * SW,
        y: sr(i * 3 + 2) * SH,
        r: sr(i * 3 + 3) * 1.4 + 0.2,
        op: sr(i * 3 + 7) * 0.42 + 0.08,
      })),
    [],
  );
  const nc = nebulaColor ?? "#1A2A4A";
  return (
    <Svg width={SW} height={SH} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="bg" cx="50%" cy="38%" r="72%">
          <Stop offset="0%" stopColor="#1E2D42" stopOpacity="1" />
          <Stop offset="55%" stopColor="#131E2E" stopOpacity="1" />
          <Stop offset="100%" stopColor="#0D1525" stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="neb" cx="28%" cy="20%" r="48%">
          <Stop offset="0%" stopColor={nc} stopOpacity="0.28" />
          <Stop offset="100%" stopColor="#0D1525" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="neb2" cx="72%" cy="75%" r="40%">
          <Stop offset="0%" stopColor={nc} stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#0D1525" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="neb3" cx="15%" cy="60%" r="30%">
          <Stop offset="0%" stopColor="#1A2A4A" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#0D1525" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={SW} height={SH} fill="url(#bg)" />
      {/* Three nebula clouds — main tinted + two neutral */}
      <Ellipse cx={SW * 0.28} cy={SH * 0.2} rx={SW * 0.65} ry={SH * 0.30} fill="url(#neb)" />
      <Ellipse cx={SW * 0.75} cy={SH * 0.72} rx={SW * 0.50} ry={SH * 0.22} fill="url(#neb2)" />
      <Ellipse cx={SW * 0.12} cy={SH * 0.58} rx={SW * 0.38} ry={SH * 0.18} fill="url(#neb3)" />
      {stars.map((s, i) => (
        <SvgCircle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.op} />
      ))}
      <ConstellationLayer color={nc} />
    </Svg>
  );
}

// ─── Shooting star ────────────────────────────────────────────────────────────
const ShootingStar = React.memo(function ShootingStar({
  x, y, angle, delay, color,
}: { x: number; y: number; angle: number; delay: number; color: string }) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const LENGTH = 90 + (delay % 60);
  const TRAVEL = 180 + (delay % 80);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * TRAVEL;
  const dy = Math.sin(rad) * TRAVEL;

  useEffect(() => {
    const fire = () => {
      tx.value = 0;
      ty.value = 0;
      opacity.value = 0;
      opacity.value = withDelay(delay, withSequence(
        withTiming(0.9, { duration: 200 }),
        withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
      ));
      tx.value = withDelay(delay, withTiming(dx, { duration: 700, easing: Easing.out(Easing.quad) }));
      ty.value = withDelay(delay, withTiming(dy, { duration: 700, easing: Easing.out(Easing.quad) }));
    };
    fire();
    const interval = setInterval(fire, 5500 + delay);
    return () => { clearInterval(interval); cancelAnimation(opacity); cancelAnimation(tx); cancelAnimation(ty); };
  }, [opacity, tx, ty, delay, dx, dy]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[wrapStyle, { position: "absolute", left: x, top: y }]}>
      <View
        style={{
          width: LENGTH,
          height: 1.5,
          borderRadius: 1,
          backgroundColor: color,
          transform: [{ rotate: `${angle}deg` }],
        }}
      />
    </Animated.View>
  );
});

// ─── Twinkling dot ────────────────────────────────────────────────────────────
const TwinkleDot = React.memo(function TwinkleDot({
  x, y, r, delay,
}: { x: number; y: number; r: number; delay: number }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.65, { duration: 1200 + (delay % 900), easing: Easing.inOut(Easing.ease) }),
          withTiming(0.08, { duration: 1500 + (delay % 700), easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(op);
  }, [op, delay]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[style, {
        position: "absolute", left: x - r, top: y - r,
        width: r * 2, height: r * 2, borderRadius: r,
        backgroundColor: "#FFFFFF",
      }]}
    />
  );
});

// ─── Ring-Planet SVG ──────────────────────────────────────────────────────────
// The visual heart: atmospheric rim + 3 tilted elliptical orbital rings.
// Center is almost fully transparent so it reads as space, not a ball.
//
// Each ring lives in its own Animated.View so we can rotate it via
// useAnimatedStyle (numeric degrees) without touching the SVG transform string.
// The origin is offset so the View rotates around the planet centre (C, C).

const svgPos = { position: "absolute" as const, left: -(PLANET_CANVAS - SW) / 2, top: -(PLANET_CANVAS - SW) / 2, overflow: "visible" as const };

function RingPlanetSvg({
  id,
  colors,
  ringRotation,   // SharedValue<number>, drives ring rotation on the UI thread
}: {
  id: string;
  colors: { core: string; ring1: string; ring2: string; glow: string };
  ringRotation: SharedValue<number>;
}) {
  const { core, ring1, ring2 } = colors;
  const C = PLANET_C;
  const size = PLANET_CANVAS;

  // Ring dimensions
  const R0_RX = ATMO_R * 2.05;  // new widest outer ring
  const R0_RY = ATMO_R * 0.34;
  const R1_RX = ATMO_R * 1.72;
  const R1_RY = ATMO_R * 0.28;
  const R2_RX = ATMO_R * 1.42;
  const R2_RY = ATMO_R * 0.20;
  const R3_RX = ATMO_R * 1.18;
  const R3_RY = ATMO_R * 0.14;

  const TILT = 22; // degrees, gives the planet a Saturn-like tilt

  // Each ring is a separate Animated.View so we can rotate around the planet
  // center using translateX/Y + rotate + translateX/Y (standard CSS trick).
  // rotateOriginStyle handles the pivot-around-center transform sequence.
  // The ring Views are PLANET_CANVAS × PLANET_CANVAS and the planet centre is
  // exactly at the view centre (C = PLANET_CANVAS/2), so a plain rotate spins
  // around the planet centre with no extra translation needed.
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

  // Dust particle positions (seeded, ring the planet rim)
  const dustParticles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const jitter = sr(i * 7 + 3) * 0.18 + 0.92;
      return {
        cx: C + Math.cos(angle) * ATMO_R * jitter,
        cy: C + Math.sin(angle) * ATMO_R * jitter * 0.55,
        r: sr(i * 7 + 1) * 1.8 + 0.6,
        op: sr(i * 7 + 5) * 0.35 + 0.12,
      };
    }), [C]);

  const ringViewStyle = { position: "absolute" as const, left: -(PLANET_CANVAS - SW) / 2, top: -(PLANET_CANVAS - SW) / 2 };

  return (
    <>
      {/* ── Outermost faint ring (behind everything) ── */}
      <Animated.View style={[ringViewStyle, ring0Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          <Defs>
            <SvgLinearGradient id={`rg1a_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring1} stopOpacity="0.75" />
              <Stop offset="50%"  stopColor={ring1} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={ring1} stopOpacity="0.12" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R0_RX} ry={R0_RY} fill="none" stroke={`url(#rg1a_${id})`} strokeWidth={2.2} strokeDasharray="6 10" opacity={0.38} />
        </Svg>
      </Animated.View>

      {/* ── Back rings (drawn before planet so they go behind) ── */}
      <Animated.View style={[ringViewStyle, ring1Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          <Defs>
            <SvgLinearGradient id={`rg1b_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring1} stopOpacity="0.75" />
              <Stop offset="50%"  stopColor={ring1} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={ring1} stopOpacity="0.12" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R1_RX} ry={R1_RY} fill="none" stroke={`url(#rg1b_${id})`} strokeWidth={5.5} opacity={0.78} />
        </Svg>
      </Animated.View>
      <Animated.View style={[ringViewStyle, ring2Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          <Defs>
            <SvgLinearGradient id={`rg2_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring2} stopOpacity="0.55" />
              <Stop offset="50%"  stopColor={ring2} stopOpacity="0.30" />
              <Stop offset="100%" stopColor={ring2} stopOpacity="0.08" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R2_RX} ry={R2_RY} fill="none" stroke={`url(#rg2_${id})`} strokeWidth={4.0} opacity={0.68} />
        </Svg>
      </Animated.View>

      {/* ── Static planet body (atmospheric rim, glow, dust) ── */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={svgPos} overflow="visible">
        <Defs>
          <RadialGradient id={`atmo_${id}`} cx={`${C}`} cy={`${C}`} r={`${ATMO_R}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor={core} stopOpacity="0" />
            <Stop offset="62%"  stopColor={core} stopOpacity="0" />
            <Stop offset="80%"  stopColor={core} stopOpacity="0.18" />
            <Stop offset="92%"  stopColor={core} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={core} stopOpacity="0.80" />
          </RadialGradient>
          <RadialGradient id={`corona_${id}`} cx={`${C}`} cy={`${C}`} r={`${ATMO_R * 1.45}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor={core} stopOpacity="0" />
            <Stop offset="68%"  stopColor={core} stopOpacity="0" />
            <Stop offset="82%"  stopColor={core} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={core} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`inner_${id}`} cx={`${C}`} cy={`${C}`} r={`${ATMO_R * 0.85}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor="#0A1020" stopOpacity="0.55" />
            <Stop offset="70%"  stopColor="#0A1020" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#0A1020" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`rimglow_${id}`} cx={`${C}`} cy={`${C}`} r={`${ATMO_R}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="82%"  stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="93%"  stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.55" />
          </RadialGradient>
        </Defs>
        <SvgCircle cx={C} cy={C} r={ATMO_R * 1.75} fill={`url(#corona_${id})`} />
        <SvgCircle cx={C} cy={C} r={ATMO_R * 1.42} fill={`url(#corona_${id})`} />
        <SvgCircle cx={C} cy={C} r={ATMO_R}        fill={`url(#atmo_${id})`} />
        <SvgCircle cx={C} cy={C} r={ATMO_R * 0.85} fill={`url(#inner_${id})`} />
        <SvgCircle cx={C} cy={C} r={ATMO_R} fill={`url(#rimglow_${id})`} />
        {dustParticles.map((p, i) => (
          <SvgCircle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={core} opacity={p.op} />
        ))}
      </Svg>

      {/* ── Front innermost ring (on top of planet) ── */}
      <Animated.View style={[ringViewStyle, ring3Style]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          <Defs>
            <SvgLinearGradient id={`rg3_${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor={ring2} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={ring2} stopOpacity="0.05" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={C} cy={C} rx={R3_RX} ry={R3_RY} fill="none" stroke={`url(#rg3_${id})`} strokeWidth={3.2} opacity={0.82} />
        </Svg>
      </Animated.View>
    </>
  );
}

// ─── Background sferas (decorative, low-opacity) ──────────────────────────────

// Visual diameter of the planet body (used for bg sfera positioning, not the oversized canvas)
const PLANET_BODY = ATMO_R * 2;

function generateBgSferas(seed: number) {
  return Array.from({ length: 5 }, (_, i) => {
    const s = seed * 17 + i;
    const scale = sr(s + 1) * 0.18 + 0.20;   // 0.20–0.38
    const left  = sr(s + 2) * SW * 0.85 - PLANET_BODY * scale * 0.3;
    const top   = sr(s + 3) * SH * 0.85 + SH * 0.05;
    return {
      id: `bg${seed}_${i}`,
      sphere: SPHERE_LIST[Math.floor(sr(s + 4) * 5)] as LifeSphere,
      scale,
      left,
      top,
    };
  });
}

// Lightweight blob replacement for background sferas — no rings, no dust, ~3 SVG elements.
function BgPlanetBlob({ id, color, size }: { id: string; color: string; size: number }) {
  const r = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id={`bgblob_${id}`} cx={`${r}`} cy={`${r}`} r={`${r}`} gradientUnits="userSpaceOnUse">
          <Stop offset="0%"   stopColor={color} stopOpacity="0" />
          <Stop offset="65%"  stopColor={color} stopOpacity="0" />
          <Stop offset="85%"  stopColor={color} stopOpacity="0.45" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.70" />
        </RadialGradient>
      </Defs>
      <SvgCircle cx={r} cy={r} r={r} fill={`url(#bgblob_${id})`} />
    </Svg>
  );
}

function BackgroundSferas({ seed, fadeOut }: { seed: number; fadeOut: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({ opacity: fadeOut.value * 0.22 }));

  const sferas = useMemo(() => generateBgSferas(seed), [seed]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animStyle]}>
      {sferas.map((s) => {
        const blobSize = PLANET_BODY * s.scale;
        return (
          <View
            key={s.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: s.left,
              top: s.top,
            }}
          >
            <BgPlanetBlob id={s.id} color={SPHERE_RINGS[s.sphere].core} size={blobSize} />
          </View>
        );
      })}
    </Animated.View>
  );
}

// ─── Ring-planet card ─────────────────────────────────────────────────────────

const LessonSfera = React.memo(function LessonSfera({
  card,
  isVisible,
  onAvatarPress,
}: {
  card: LessonCard;
  isVisible: boolean;
  onAvatarPress?: () => void;
}) {
  const colors = SPHERE_RINGS[card.sphere] ?? SPHERE_RINGS.career;
  const shadowColor = getSphereShadowColor(card.sphere, "dark");
  const accentColor = getSphereSferaColor(card.sphere, "dark");

  // Entry spring + glow pulse (scale only, no opacity fade on the planet itself)
  const entryScale = useSharedValue(0.92);
  const glowPulse = useSharedValue(0.5);

  // Moon tap pulse
  const moonScale = useSharedValue(1);
  const moonGlow = useSharedValue(0);
  const moonAmbient = useSharedValue(1);

  const fireMoonPulse = useCallback(() => {
    moonScale.value = withSequence(
      withSpring(1.14, { damping: 8, stiffness: 220 }),
      withSpring(0.95, { damping: 10, stiffness: 200 }),
      withSpring(1.0, { damping: 12, stiffness: 180 }),
    );
    moonGlow.value = withSequence(
      withTiming(0.7, { duration: 180 }),
      withTiming(0.3, { duration: 300 }),
      withTiming(0, { duration: 500 }),
    );
  }, [moonScale, moonGlow]);

  // Idle pulse — fires after an initial delay then every ~4.5s while card is visible
  useEffect(() => {
    if (!isVisible) return;
    const initial = setTimeout(() => {
      fireMoonPulse();
      const interval = setInterval(fireMoonPulse, 4500);
      return () => clearInterval(interval);
    }, 2000);
    return () => clearTimeout(initial);
  }, [isVisible, fireMoonPulse]);

  const handleMoonPress = useCallback(() => {
    moonScale.value = withSequence(
      withSpring(1.22, { damping: 6, stiffness: 300 }),
      withSpring(0.92, { damping: 8, stiffness: 260 }),
      withSpring(1.0, { damping: 10, stiffness: 200 }),
    );
    moonGlow.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(0.6, { duration: 200 }),
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 400 }),
    );
    onAvatarPress?.();
  }, [moonScale, moonGlow, onAvatarPress]);
  useEffect(() => {
    if (isVisible) {
      moonAmbient.value = withDelay(600, withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.00, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ));
    } else {
      cancelAnimation(moonAmbient);
      moonAmbient.value = 1;
    }
  }, [isVisible, moonAmbient]);

  const moonStyle = useAnimatedStyle(() => ({ transform: [{ scale: moonScale.value * moonAmbient.value }] }));
  const moonGlowStyle = useAnimatedStyle(() => ({ opacity: moonGlow.value }));

  useEffect(() => {
    if (isVisible) {
      entryScale.value = withSpring(1, { damping: 16, stiffness: 110 });
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.45, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(glowPulse);
      entryScale.value = withTiming(0.92, { duration: 280 });
      glowPulse.value = 0.5;
    }
  }, [isVisible, entryScale, glowPulse]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entryScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  // Ring rotation — driven on the UI thread via Reanimated, no JS setState needed
  const rot = useSharedValue(0);
  useEffect(() => {
    if (isVisible) {
      rot.value = withRepeat(
        withTiming(360, { duration: 28000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rot);
    }
  }, [isVisible, rot]);

  return (
    <View style={[styles.cardContainer, { height: CARD_HEIGHT }]}>
      <Animated.View style={[styles.planetWrapper, cardStyle]}>
        {/* Outer diffuse glow shadow — pulses with glowStyle */}
        <Animated.View
          pointerEvents="none"
          style={[glowStyle, {
            position: "absolute",
            width: ATMO_R * 2 + 80,
            height: ATMO_R * 2 + 80,
            borderRadius: ATMO_R + 40,
            shadowColor: colors.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 60,
            elevation: 0,
          }]}
        />

        {/* Ring-planet SVG (atmospheric rim + orbital rings) */}
        <RingPlanetSvg id={card.id} colors={colors} ringRotation={rot} />

        {/* Lesson content — floats in the transparent center */}
        <View style={styles.contentOverlay}>
          {/* Thin divider */}
          <View style={styles.divRow}>
            <View style={[styles.divLine, { backgroundColor: accentColor + "35" }]} />
            <View style={[styles.divDot, { backgroundColor: accentColor + "80" }]} />
            <View style={[styles.divLine, { backgroundColor: accentColor + "35" }]} />
          </View>

          {/* Lesson text */}
          <ThemedText style={styles.lessonText}>
            {card.text}
          </ThemedText>
        </View>

        {/* Moon avatar — memory image as a glowing satellite at the top rim of the planet.
            Positioned so its center sits exactly on the atmospheric circle edge (ATMO_R from planet center). */}
        <View
          style={[styles.moonOrbit, {
            top: SW / 2 - ATMO_R - MOON_SIZE / 2 + 4,
          }]}
        >
          {/* Moon image or fallback icon — tappable when linked to a real memory */}
          <Pressable onPress={card.memoryId ? handleMoonPress : undefined} hitSlop={12}>
            <View>
              {/* Pulse glow ring behind avatar */}
              <Animated.View
                pointerEvents="none"
                style={[moonGlowStyle, {
                  position: "absolute",
                  top: -10, left: -10, right: -10, bottom: -10,
                  borderRadius: (MOON_SIZE + 20) / 2,
                  backgroundColor: accentColor + "40",
                }]}
              />
              <Animated.View style={[styles.moonAvatar, moonStyle, {
                borderColor: accentColor + "AA",
                shadowColor: accentColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 8,
                elevation: 6,
              }]}>
                {card.memoryImageUri ? (
                  <Image
                    source={{ uri: card.memoryImageUri }}
                    style={styles.moonImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: accentColor + "22", borderRadius: MOON_SIZE / 2 }]}>
                    <MaterialIcons name="auto-awesome" size={20} color={accentColor} />
                  </View>
                )}
              </Animated.View>
            </View>
          </Pressable>
          {/* Memory title below the moon */}
          <ThemedText style={[styles.moonLabel, { color: accentColor }]} numberOfLines={1}>
            {card.memoryTitle}
          </ThemedText>
        </View>

        {/* Sphere icon badge — on the bottom rim of the planet */}
        <View
          pointerEvents="none"
          style={[styles.sphereBadge, {
            top: SW / 2 + ATMO_R - 18,
            borderColor: accentColor + "CC",
            backgroundColor: "rgba(8,14,28,0.82)",
            shadowColor: accentColor,
          }]}
        >
          <MaterialIcons name={SPHERE_ICONS[card.sphere] as any} size={20} color={accentColor} />
        </View>
      </Animated.View>

    </View>
  );
});


// ─── Scroll rail ──────────────────────────────────────────────────────────────

function ScrollRail({ total, active, color }: { total: number; active: number; color: string }) {
  const shown = Math.min(total, 8);
  const activeShown = Math.min(active, shown - 1);
  return (
    <View style={styles.rail}>
      {Array.from({ length: shown }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.railDot,
            i === activeShown
              ? { height: 20, backgroundColor: color }
              : { height: 5, backgroundColor: color + "28" },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function UniverseLessonsScreen({ visible, onClose }: Props) {
  const t = useTranslate();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { appUsabilityHints } = useVisualSettings();
  const { idealizedMemories } = useJourney();
  const [activeIndex, setActiveIndex] = useState(0);
  const [bgSeed, setBgSeed] = useState(0);
  const listRef = useRef<FlatList>(null);

  const twinkles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: sr(i * 5 + 2) * SW,
        y: sr(i * 5 + 4) * SH,
        r: sr(i * 5 + 6) * 0.9 + 0.5,
        delay: Math.floor(sr(i * 5 + 9) * 2800),
      })),
    [],
  );

  const cards = useMemo<LessonCard[]>(() => {
    const real: LessonCard[] = [];
    for (const mem of idealizedMemories) {
      for (const l of mem.lessonsLearned ?? []) {
        if (l.text.trim()) {
          real.push({
            id: `${mem.id}_${l.id}`,
            text: l.text.trim(),
            memoryTitle: mem.title,
            memoryImageUri: mem.imageUri,
            sphere: (mem.sphere as LifeSphere) ?? "relationships",
            memoryId: mem.id,
            entityId: mem.entityId || mem.profileId,
          });
        }
      }
    }
    if (real.length > 0) {
      // Interleave cards from different spheres so the feed feels varied
      const bySphere: Record<string, LessonCard[]> = {};
      for (const card of real) {
        (bySphere[card.sphere] ??= []).push(card);
      }
      const buckets = Object.values(bySphere);
      const interleaved: LessonCard[] = [];
      const maxLen = Math.max(...buckets.map((b) => b.length));
      for (let i = 0; i < maxLen; i++) {
        for (const bucket of buckets) {
          if (i < bucket.length) interleaved.push(bucket[i]);
        }
      }
      return interleaved;
    }
    const fb = lifeLessons[language] ?? lifeLessons.en;
    return fb.map((text, i) => ({
      id: `static_${i}`,
      text,
      memoryTitle: language === "bg" ? "Твоята Вселена" : "Your Universe",
      sphere: getSphereForIndex(i),
    }));
  }, [idealizedMemories, language]);

  useEffect(() => {
    if (visible) {
      setActiveIndex(0);
      listRef.current?.scrollToIndex({ index: 0, animated: false });
    }
  }, [visible]);

  const bgSeedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgFadeOut = useSharedValue(1);
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) {
        if (bgSeedTimerRef.current) clearTimeout(bgSeedTimerRef.current);
        bgFadeOut.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
        bgSeedTimerRef.current = setTimeout(() => {
          setActiveIndex(idx);
          setBgSeed(idx);
          bgFadeOut.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
        }, 420);
      }
    },
    [bgFadeOut],
  );
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 52 }), []);

  const activeCard = cards[activeIndex];
  const accentColor = getSphereSferaColor(activeCard?.sphere ?? "career", "dark");

  const shootingStars = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      x: sr(i * 11 + 1) * SW,
      y: sr(i * 11 + 2) * SH * 0.6,
      angle: 20 + sr(i * 11 + 3) * 25,
      delay: Math.floor(sr(i * 11 + 4) * 4000),
    })), []);

  // Swipe hint — finger animates upward, shown once on open when hints enabled
  // Swipe hint: fade in → swipe up → return → swipe down → return → fade out, repeat 3×
  const swipeHintOpacity = useSharedValue(0);
  const swipeHintY = useSharedValue(0);
  useEffect(() => {
    if (!visible || !appUsabilityHints) {
      cancelAnimation(swipeHintOpacity);
      cancelAnimation(swipeHintY);
      swipeHintOpacity.value = 0;
      swipeHintY.value = 0;
      return;
    }
    const SWIPE = 90;
    const cycle = () => {
      swipeHintY.value = 0;
      swipeHintOpacity.value = withSequence(
        withTiming(0.88, { duration: 300 }),                          // fade in
        withDelay(2600, withTiming(0, { duration: 350 })),            // fade out after full cycle
      );
      swipeHintY.value = withSequence(
        withTiming(-SWIPE, { duration: 550, easing: Easing.out(Easing.quad) }),  // swipe up
        withTiming(0,      { duration: 400, easing: Easing.inOut(Easing.quad) }), // return
        withDelay(100,
          withTiming(SWIPE,  { duration: 550, easing: Easing.out(Easing.quad) })  // swipe down
        ),
        withTiming(0,      { duration: 400, easing: Easing.inOut(Easing.quad) }), // return
      );
    };
    const t0 = setTimeout(cycle, 1500);
    return () => clearTimeout(t0);
  }, [visible, appUsabilityHints, swipeHintOpacity, swipeHintY]);
  const swipeHintStyle = useAnimatedStyle(() => ({
    opacity: swipeHintOpacity.value,
    transform: [{ translateY: swipeHintY.value }],
  }));

  const handleAvatarPress = useCallback((card: LessonCard) => {
    if (!card.entityId) return;
    onClose();
    router.push({
      pathname: "/(tabs)" as const,
      params: { sphere: card.sphere, entityId: card.entityId },
    });
  }, [onClose]);

  const renderItem = useCallback(
    ({ item, index }: { item: LessonCard; index: number }) => (
      <LessonSfera
        card={item}
        isVisible={index === activeIndex}
        onAvatarPress={item.memoryId ? () => handleAvatarPress(item) : undefined}
      />
    ),
    [activeIndex, handleAvatarPress],
  );
  const keyExtractor = useCallback((item: LessonCard) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <StarField nebulaColor={SPHERE_RINGS[activeCard?.sphere ?? "career"].glow} />
        {twinkles.map((tw, i) => (
          <TwinkleDot key={i} x={tw.x} y={tw.y} r={tw.r} delay={tw.delay} />
        ))}
        {shootingStars.map((ss, i) => (
          <ShootingStar key={i} x={ss.x} y={ss.y} angle={ss.angle} delay={ss.delay} color={accentColor} />
        ))}

        {/* Header */}
        <View style={[styles.header, { top: insets.top + 12 }]}>
          <ThemedText style={[styles.headerTitle, { textShadowColor: accentColor + "55" }]}>{t("universe.modal.title")}</ThemedText>
          <Pressable onPress={onClose} hitSlop={16}>
            <View style={styles.closeBg}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.90)" />
            </View>
          </Pressable>
        </View>

        {/* Swipe hint — finger + up/down arrows, centered on screen */}
        {appUsabilityHints && cards.length > 1 && (
          <Animated.View
            pointerEvents="none"
            style={[swipeHintStyle, {
              position: "absolute",
              top: SH / 2 - 26,
              left: 0, right: 0,
              alignItems: "center",
              zIndex: 30,
            }]}
          >
            <MaterialIcons name="expand-less" size={28} color="rgba(255,255,255,0.55)" />
            <View style={{ marginVertical: 2 }}>
              <MaterialIcons name="touch-app" size={52} color="rgba(0,0,0,0.45)" style={{ position: "absolute", left: 2, top: 2 }} />
              <MaterialIcons name="touch-app" size={52} color="rgba(255,255,255,0.92)" />
            </View>
            <MaterialIcons name="expand-more" size={28} color="rgba(255,255,255,0.55)" />
          </Animated.View>
        )}


        <BackgroundSferas seed={bgSeed} fadeOut={bgFadeOut} />
        <FlatList
          ref={listRef}
          data={cards}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled
          snapToInterval={CARD_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: CARD_HEIGHT,
            offset: CARD_HEIGHT * index,
            index,
          })}
          style={{ flex: 1 }}
        />

        {cards.length > 1 && (
          <ScrollRail total={cards.length} active={activeIndex} color={accentColor} />
        )}


      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0.5,
    textShadowColor: "rgba(8,14,28,0.70)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  closeBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(10,16,32,0.72)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    width: SW,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  planetWrapper: {
    width: SW,
    height: SW,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  contentOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ATMO_R * 0.54,
    paddingTop: MOON_SIZE + 16,
    marginTop: -30,
    gap: 14,
  },
  moonOrbit: {
    position: "absolute",
    alignItems: "center",
    gap: 5,
    zIndex: 10,
  },
  moonAvatar: {
    width: MOON_SIZE,
    height: MOON_SIZE,
    borderRadius: MOON_SIZE / 2,
    borderWidth: 2,
    overflow: "hidden",
  },
  moonImage: {
    width: "100%",
    height: "100%",
  },
  moonLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
    opacity: 0.8,
    maxWidth: ATMO_R * 1.6,
    textAlign: "center",
  },
  divRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    width: "52%",
  },
  divLine: {
    flex: 1,
    height: 1,
    borderRadius: 1,
  },
  divDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  lessonText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
    letterSpacing: 0.1,
    color: "rgba(255,255,255,0.92)",
    textShadowColor: "rgba(8,14,28,0.80)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  sphereBadge: {
    position: "absolute",
    // top: set inline as PLANET_C + ATMO_R - 18 (bottom rim, badge centered on it)
    alignSelf: "center",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 12,
  },
  rail: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -50 }],
    alignItems: "center",
    gap: 5,
    zIndex: 20,
  },
  railDot: {
    width: 3,
    borderRadius: 2,
  },
});
