/**
 * Universe Lessons Screen — TikTok-style vertical pager.
 * Each card is a futuristic ring-planet: glowing atmospheric rim, tilted orbital
 * rings, transparent center with lesson text floating in space.
 */

import { ThemedText } from "@/components/themed-text";
import { UniverseExamScreen } from "@/components/universe-exam-screen";
import { Colors } from "@/constants/theme";
import { TAB_BACKGROUND_COLOR_LIGHT_COSMIC_OFF } from "@/library/components/tab-screen-container";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useJourney } from "@/utils/JourneyProvider";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForAIAccess } from "@/utils/premium-access";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { hasPendingUniverseExam } from "@/utils/universe-exam-pending";
import { canUseExam } from "@/utils/universe-exam-rate-limiter";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSphereSferaColor } from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  type AppStateStatus,
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type ViewToken,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
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
const LESSON_INNER_IMAGE_SIZE = ATMO_R * 1.62;
const LESSON_MOON_TOP = SW / 2 - ATMO_R - MOON_SIZE / 2 + 4;
const LESSON_INNER_IMAGE_TOP = SW / 2 - LESSON_INNER_IMAGE_SIZE / 2 + 6;
const LESSON_MOON_TAP_HINT_SEEN_KEY = "@sferas:lessons_moon_tap_hint_seen";

/** Words shown in the sphere before "Learn more" (one short sentence). */
const LESSON_TEXT_PREVIEW_MAX_WORDS = 8;

function lessonTextPreviewParts(
  text: string,
  maxWords: number,
): { preview: string; needsLearnMore: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { preview: "", needsLearnMore: false };
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return { preview: trimmed, needsLearnMore: false };
  }
  return {
    preview: `${words.slice(0, maxWords).join(" ")}…`,
    needsLearnMore: true,
  };
}

// Full-screen cards so each planet is perfectly centred.
/** Dark shell only; tab uses `Colors.background` in light. */
const BG_DARK = "#1A2332";
/** Alias for StyleSheet / older refs — avoids ReferenceError if a stale `BG` slips in. */
const BG = BG_DARK;

/** Orbital colors on light grey — saturated strokes for AAA legibility vs soft surfaces. */
const SPHERE_RINGS_LIGHT: Record<LifeSphere, { core: string; ring1: string; ring2: string; glow: string }> = {
  relationships: { core: "#D32F2F", ring1: "#B71C1C", ring2: "#EF5350", glow: "#C62828" },
  career: { core: "#1976D2", ring1: "#0D47A1", ring2: "#42A5F5", glow: "#1565C0" },
  family: { core: "#2E7D32", ring1: "#1B5E20", ring2: "#66BB6A", glow: "#2E7D32" },
  friends: { core: "#7B1FA2", ring1: "#4A148C", ring2: "#BA68C8", glow: "#6A1B9A" },
  hobbies: { core: "#D84315", ring1: "#BF360C", ring2: "#FF8A65", glow: "#D84315" },
};

function sphereRingsForScheme(
  sphere: LifeSphere,
  scheme: "light" | "dark",
): { core: string; ring1: string; ring2: string; glow: string } {
  return scheme === "light"
    ? SPHERE_RINGS_LIGHT[sphere] ?? SPHERE_RINGS_LIGHT.career
    : SPHERE_RINGS[sphere] ?? SPHERE_RINGS.career;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonCard = {
  id: string;
  /** Raw lesson id within the parent memory (for persistence). */
  lessonId: string;
  text: string;
  memoryTitle: string;
  memoryImageUri?: string;
  sphere: LifeSphere;
  memoryId?: string;
  entityId?: string;
  memoryCreatedAt: string;
  isFavorite?: boolean;
};

/** Skip empty/whitespace URIs; native Image still probes them and can log CoreGraphics noise. */
function normalizeMoonImageUri(uri: string | undefined): string | null {
  if (uri == null) return null;
  const t = uri.trim();
  return t.length > 0 ? t : null;
}

type SphereFilter = "all" | Set<LifeSphere>;
type YearFilter = "all" | Set<number>;
type EntityFilter = "all" | Set<string>;

const SPHERE_LIST: LifeSphere[] = [
  "relationships", "career", "family", "friends", "hobbies",
];

function filterLessonCards(
  cards: LessonCard[],
  sphereFilter: SphereFilter,
  yearFilter: YearFilter,
  favoritesOnly: boolean,
  entityFilter: EntityFilter,
): LessonCard[] {
  return cards.filter((card) => {
    if (favoritesOnly && !card.isFavorite) return false;
    if (sphereFilter !== "all" && !sphereFilter.has(card.sphere)) return false;
    if (entityFilter !== "all") {
      const eid = card.entityId;
      if (!eid || !entityFilter.has(eid)) return false;
    }
    if (yearFilter !== "all") {
      const y = new Date(card.memoryCreatedAt).getFullYear();
      if (!yearFilter.has(y)) return false;
    }
    return true;
  });
}

const SPHERE_ICONS: Record<LifeSphere, string> = {
  relationships: "favorite",
  career: "work",
  family: "family-restroom",
  friends: "people",
  hobbies: "sports-esports",
};

/**
 * Memory title sits on the bright inner glow of the ring-planet. Light sphere tints
 * (e.g. family lavender) fail WCAG AA; near-white fill + deep hue-matched shadow
 * keeps legibility on both bright core and darker rim.
 */
const SPHERE_MOON_TITLE_SHADOW: Record<LifeSphere, string> = {
  relationships: "rgba(56, 14, 14, 0.96)",
  career: "rgba(10, 28, 52, 0.96)",
  family: "rgba(38, 16, 58, 0.96)",
  friends: "rgba(28, 14, 62, 0.96)",
  hobbies: "rgba(58, 26, 6, 0.96)",
};

// Per-sphere: colors derived from getSphereSferaColor/getSphereShadowColor (dark mode)
const SPHERE_RINGS: Record<LifeSphere, { core: string; ring1: string; ring2: string; glow: string }> = {
  relationships: { core: "#EF4444", ring1: "#B42323", ring2: "#FCA5A5", glow: "#EF4444" },
  career:        { core: "#3B82F6", ring1: "#215FC4", ring2: "#93C5FD", glow: "#3B82F6" },
  family:        { core: "#10B981", ring1: "#0E8D66", ring2: "#6EE7B7", glow: "#10B981" },
  friends:       { core: "#8B5CF6", ring1: "#5530AA", ring2: "#C4B5FD", glow: "#8B5CF6" },
  hobbies:       { core: "#F97316", ring1: "#B84C08", ring2: "#FDBA74", glow: "#F97316" },
};

// ─── Seeded random ────────────────────────────────────────────────────────────
function sr(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Constellations ───────────────────────────────────────────────────────────
// Three hand-placed constellations in screen-relative coords.
// Each is a list of [x,y] fractions + edges between node indices.
const CONSTELLATIONS: {
  nodes: [number, number][];
  edges: [number, number][];
}[] = [
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

function ConstellationLayer({ color, isLight }: { color: string; isLight: boolean }) {
  const lineOp = isLight ? 0.14 : 0.22;
  const starFill = isLight ? "#0D0D0D" : "#FFFFFF";
  const starOp = isLight ? (ni: number) => (ni === 0 ? 0.22 : 0.14) : (ni: number) => (ni === 0 ? 0.75 : 0.55);
  return (
    <>
      {CONSTELLATIONS.map((c, ci) => (
        <React.Fragment key={ci}>
          {/* Lines */}
          {c.edges.map(([a, b], ei) => (
            <Path
              key={ei}
              d={`M ${c.nodes[a][0] * SW} ${c.nodes[a][1] * SH} L ${c.nodes[b][0] * SW} ${c.nodes[b][1] * SH}`}
              stroke={isLight ? "#0D0D0D" : color}
              strokeWidth={0.7}
              strokeOpacity={lineOp}
            />
          ))}
          {/* Stars at nodes */}
          {c.nodes.map(([x, y], ni) => (
            <SvgCircle
              key={ni}
              cx={x * SW}
              cy={y * SH}
              r={ni === 0 ? 1.8 : 1.2}
              fill={starFill}
              opacity={starOp(ni)}
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
}

// ─── Static star field ────────────────────────────────────────────────────────
function StarField({ nebulaColor, isLight }: { nebulaColor?: string; isLight: boolean }) {
  const stars = useMemo(
    () =>
      isLight
        ? []
        : Array.from({ length: 80 }, (_, i) => ({
            x: sr(i * 3 + 1) * SW,
            y: sr(i * 3 + 2) * SH,
            r: sr(i * 3 + 3) * 1.4 + 0.2,
            op: sr(i * 3 + 7) * 0.42 + 0.08,
          })),
    [isLight],
  );
  const nc = nebulaColor ?? "#1A2A4A";
  if (isLight) {
    const soft = Colors.light.surfaceElevated2;
    const mid = Colors.light.surface;
    const deep = Colors.light.surfaceElevated1;
    return (
      <Svg width={SW} height={SH} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="bgLight" cx="50%" cy="38%" r="78%">
            <Stop offset="0%" stopColor={Colors.light.surfaceElevated4} stopOpacity="1" />
            <Stop offset="50%" stopColor={soft} stopOpacity="1" />
            <Stop offset="100%" stopColor={mid} stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="nebLight" cx="28%" cy="20%" r="52%">
            <Stop offset="0%" stopColor={nc} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={deep} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebLight2" cx="72%" cy="75%" r="42%">
            <Stop offset="0%" stopColor={nc} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={deep} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={SW} height={SH} fill="url(#bgLight)" />
        <Ellipse cx={SW * 0.28} cy={SH * 0.2} rx={SW * 0.65} ry={SH * 0.30} fill="url(#nebLight)" />
        <Ellipse cx={SW * 0.75} cy={SH * 0.72} rx={SW * 0.50} ry={SH * 0.22} fill="url(#nebLight2)" />
      </Svg>
    );
  }
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
      <ConstellationLayer color={nc} isLight={false} />
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
  x, y, r, delay, isLight,
}: { x: number; y: number; r: number; delay: number; isLight: boolean }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(isLight ? 0.38 : 0.65, { duration: 1200 + (delay % 900), easing: Easing.inOut(Easing.ease) }),
          withTiming(isLight ? 0.06 : 0.08, { duration: 1500 + (delay % 700), easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(op);
  }, [op, delay, isLight]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[style, {
        position: "absolute", left: x - r, top: y - r,
        width: r * 2, height: r * 2, borderRadius: r,
        backgroundColor: isLight ? "#383838" : "#FFFFFF",
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
  ringRotation,
  isLight,
}: {
  id: string;
  colors: { core: string; ring1: string; ring2: string; glow: string };
  ringRotation: SharedValue<number>;
  isLight: boolean;
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

      {/* ── Back rings (drawn before planet so they go behind) ── */}
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

      {/* ── Static planet body (atmospheric rim, glow, dust) ── */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={svgPos}>
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
          <RadialGradient id={`rimglow_${id}`} cx={`${C}`} cy={`${C}`} r={`${ATMO_R}`} gradientUnits="userSpaceOnUse">
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

function BackgroundSferas({
  seed,
  fadeOut,
  isLight,
}: {
  seed: number;
  fadeOut: SharedValue<number>;
  isLight: boolean;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: fadeOut.value * (isLight ? 0.14 : 0.22),
  }));

  const sferas = useMemo(() => generateBgSferas(seed), [seed]);
  const scheme = isLight ? "light" : "dark";

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
            <BgPlanetBlob
              id={s.id}
              color={sphereRingsForScheme(s.sphere, scheme).core}
              size={blobSize}
            />
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
  onToggleFavorite,
  pageHeight = SH,
  showTapHint = false,
}: {
  card: LessonCard;
  isVisible: boolean;
  onAvatarPress?: () => void;
  onToggleFavorite?: () => void;
  /** Pager page height (full screen or tab content area). */
  pageHeight?: number;
  /** One-time affordance shown on first lesson only. */
  showTapHint?: boolean;
}) {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const scheme = (colorScheme ?? "dark") as "light" | "dark";
  const isLight = scheme === "light";
  const themeColors = Colors[scheme];
  const { pulsingAnimations } = useVisualSettings();
  const colors = sphereRingsForScheme(card.sphere, scheme);
  const accentColor = getSphereSferaColor(card.sphere, scheme);

  const [fullLessonModalVisible, setFullLessonModalVisible] = useState(false);
  const [avatarExpanded, setAvatarExpanded] = useState(false);

  const { preview: lessonPreviewText, needsLearnMore } = useMemo(
    () => lessonTextPreviewParts(card.text, LESSON_TEXT_PREVIEW_MAX_WORDS),
    [card.text],
  );

  useEffect(() => {
    setFullLessonModalVisible(false);
  }, [card.id]);

  // Entry spring + glow pulse (scale only, no opacity fade on the planet itself)
  const entryScale = useSharedValue(0.92);
  const glowPulse = useSharedValue(0.5);

  // Moon tap pulse
  const moonScale = useSharedValue(1);
  const moonGlow = useSharedValue(0);
  const moonAmbient = useSharedValue(1);
  const moonHintPulse = useSharedValue(0);
  const moonExpand = useSharedValue(0);

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
    let initialTimer: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (isVisible && pulsingAnimations) {
      initialTimer = setTimeout(() => {
        fireMoonPulse();
        intervalId = setInterval(fireMoonPulse, 4500);
      }, 2000);
    } else {
      cancelAnimation(moonScale);
      cancelAnimation(moonGlow);
      moonScale.value = 1;
      moonGlow.value = 0;
    }
    return () => {
      if (initialTimer !== undefined) clearTimeout(initialTimer);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [isVisible, pulsingAnimations, fireMoonPulse, moonScale, moonGlow]);

  // Stop moon tap/idle sequences when this card is not the focused pager item (no work on neighbors).
  useEffect(() => {
    if (isVisible) return;
    cancelAnimation(moonScale);
    cancelAnimation(moonGlow);
    moonScale.value = 1;
    moonGlow.value = 0;
  }, [isVisible, moonScale, moonGlow]);

  useEffect(() => {
    if (!isVisible) {
      cancelAnimation(moonExpand);
      moonExpand.value = 0;
      setAvatarExpanded(false);
      return;
    }
    moonExpand.value = withTiming(avatarExpanded ? 1 : 0, {
      duration: avatarExpanded ? 420 : 320,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [avatarExpanded, isVisible, moonExpand]);

  const handleMoonPress = useCallback(() => {
    if (avatarExpanded) return;
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
    setAvatarExpanded(true);
  }, [moonScale, moonGlow, avatarExpanded]);
  useEffect(() => {
    if (isVisible && pulsingAnimations) {
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
  }, [isVisible, pulsingAnimations, moonAmbient]);

  const moonStyle = useAnimatedStyle(() => ({ transform: [{ scale: moonScale.value * moonAmbient.value }] }));
  const moonGlowStyle = useAnimatedStyle(() => ({ opacity: moonGlow.value }));
  const moonHintStyle = useAnimatedStyle(() => ({
    opacity: avatarExpanded ? 0 : moonHintPulse.value,
    transform: [{ translateY: interpolate(moonHintPulse.value, [0.25, 0.95], [-2, 2]) }],
  }));
  const moonOrbitStyle = useAnimatedStyle(() => ({
    opacity: 1 - moonExpand.value,
    transform: [{ translateY: interpolate(moonExpand.value, [0, 1], [0, -10]) }],
  }));
  const innerImageStyle = useAnimatedStyle(() => {
    const size = interpolate(moonExpand.value, [0, 1], [MOON_SIZE, LESSON_INNER_IMAGE_SIZE]);
    return {
      top: interpolate(moonExpand.value, [0, 1], [LESSON_MOON_TOP, LESSON_INNER_IMAGE_TOP]),
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity: moonExpand.value,
      transform: [{ scale: interpolate(moonExpand.value, [0, 1], [1, 1.03]) }],
    };
  });
  const expandedActionStyle = useAnimatedStyle(() => ({
    opacity: moonExpand.value,
    transform: [{ scale: interpolate(moonExpand.value, [0, 1], [0.88, 1]) }],
  }));

  useEffect(() => {
    if (!isVisible || avatarExpanded || !card.memoryId || !showTapHint) {
      cancelAnimation(moonHintPulse);
      moonHintPulse.value = 0;
      return;
    }
    moonHintPulse.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [isVisible, avatarExpanded, card.memoryId, showTapHint, moonHintPulse]);

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
      cancelAnimation(entryScale);
      entryScale.value = 0.92;
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
      rot.value = 0;
    }
  }, [isVisible, rot]);

  const moonUri = useMemo(
    () => normalizeMoonImageUri(card.memoryImageUri),
    [card.memoryImageUri],
  );
  const [moonImageFailed, setMoonImageFailed] = useState(false);
  useEffect(() => {
    setMoonImageFailed(false);
  }, [card.id, card.memoryImageUri]);

  return (
    <View style={[styles.cardContainer, { height: pageHeight }]}>
      <Animated.View style={[styles.planetWrapper, cardStyle]}>
        {/* Outer diffuse glow shadow — pulses with glowStyle */}
        <Animated.View
          pointerEvents="none"
          style={[glowStyle, {
            position: "absolute",
            width: ATMO_R * 2 + 80,
            height: ATMO_R * 2 + 80,
            borderRadius: ATMO_R + 40,
            shadowColor: isLight ? "#000000" : colors.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isLight ? 0.2 : 0.7,
            shadowRadius: isLight ? 36 : 60,
            elevation: 0,
          }]}
        />

        {/* Ring-planet SVG (atmospheric rim + orbital rings) */}
        <RingPlanetSvg id={card.id} colors={colors} ringRotation={rot} isLight={isLight} />

        {/* Lesson content — floats in the transparent center */}
        {moonUri && !moonImageFailed ? (
          <Animated.View pointerEvents="none" style={[styles.innerLessonImageWrap, innerImageStyle]}>
            <Image
              source={{ uri: moonUri }}
              style={styles.innerLessonImage}
              contentFit="cover"
              recyclingKey={`${card.id}-inner-lesson`}
            />
            <View style={styles.innerLessonImageShade} />
          </Animated.View>
        ) : null}
        {card.memoryId ? (
          <>
            <Animated.View style={[styles.expandedActionTop, expandedActionStyle]}>
              <Pressable
                onPress={() => setAvatarExpanded(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("universe.lessons.accessibility.collapseImage")}
                style={[
                  styles.expandedActionBtn,
                  {
                    borderColor: accentColor + "99",
                    backgroundColor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(8,14,28,0.86)",
                  },
                ]}
              >
                <MaterialIcons name="keyboard-arrow-up" size={20} color={accentColor} />
              </Pressable>
            </Animated.View>
          </>
        ) : null}

        <View style={styles.contentOverlay}>
          {/* Favorite — top-right of lesson text area (away from sphere heart badge below) */}
          <View
            style={styles.favoriteInOverlay}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={14}
              disabled={!onToggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={t("universe.lessons.accessibility.toggleFavorite")}
              accessibilityState={{ selected: !!card.isFavorite }}
              style={({ pressed }) => [
                styles.favoriteStarBtn,
                {
                  opacity: onToggleFavorite ? (pressed ? 0.75 : 1) : 0.35,
                  borderColor: accentColor + "99",
                  backgroundColor: isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(8,14,28,0.82)",
                },
              ]}
            >
              <MaterialIcons
                name={card.isFavorite ? "star" : "star-border"}
                size={22}
                color={
                  card.isFavorite
                    ? accentColor
                    : isLight
                      ? Colors.light.textMediumEmphasis
                      : Colors.dark.textMediumEmphasis
                }
              />
            </Pressable>
          </View>
          <Pressable
            onPress={!avatarExpanded ? () => setFullLessonModalVisible(true) : undefined}
            disabled={avatarExpanded}
            accessibilityRole="button"
            accessibilityLabel={t("universe.lessons.accessibility.learnMore")}
            style={styles.innerContentPressable}
          >
            {/* Thin divider */}
            <View style={styles.divRow}>
              <View style={[styles.divLine, { backgroundColor: accentColor + "35" }]} />
              <View style={[styles.divDot, { backgroundColor: accentColor + "80" }]} />
              <View style={[styles.divLine, { backgroundColor: accentColor + "35" }]} />
            </View>

            {/* Full width so text wraps to multiple lines (center parent would otherwise shrink to one line) */}
            <View style={styles.lessonTextWrap}>
              <ThemedText
                style={[
                  styles.lessonText,
                  isLight && {
                    color: Colors.light.text,
                    textShadowColor: "rgba(255, 255, 255, 0.75)",
                    textShadowRadius: 6,
                  },
                ]}
              >
                {lessonPreviewText}
              </ThemedText>
            </View>
          </Pressable>
          <View>
            {needsLearnMore || card.memoryId ? (
              <View style={styles.lessonActionsRow}>
                {needsLearnMore ? (
                  <Pressable
                    onPress={() => setFullLessonModalVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t("universe.lessons.accessibility.learnMore")}
                    hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                    style={styles.learnMorePressable}
                  >
                    <ThemedText
                      style={[
                        styles.learnMoreText,
                        { color: accentColor },
                        isLight && { textDecorationColor: `${Colors.light.textMediumEmphasis}99` },
                      ]}
                    >
                      {t("universe.lessons.learnMore")}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {card.memoryId && avatarExpanded ? (
                  <Pressable
                    onPress={() => onAvatarPress?.()}
                    accessibilityRole="button"
                    accessibilityLabel={t("universe.lessons.accessibility.openMemory")}
                    hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                    style={styles.openMorePressable}
                  >
                    <MaterialIcons name="open-in-new" size={16} color={accentColor} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Moon avatar — memory image as a glowing satellite at the top rim of the planet.
            Positioned so its center sits exactly on the atmospheric circle edge (ATMO_R from planet center). */}
        <View
          style={[styles.moonOrbit, { top: LESSON_MOON_TOP }]}
        >
          {/* Moon image or fallback icon — tappable when linked to a real memory */}
          <Pressable
            onPress={card.memoryId && !avatarExpanded ? handleMoonPress : undefined}
            hitSlop={12}
          >
            <Animated.View style={moonOrbitStyle}>
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
                {moonUri && !moonImageFailed ? (
                  <Image
                    source={{ uri: moonUri }}
                    style={styles.moonImage}
                    contentFit="cover"
                    recyclingKey={`${card.id}-moon`}
                    onError={() => setMoonImageFailed(true)}
                  />
                ) : (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isLight ? "rgba(255,255,255,0.92)" : "rgba(8,14,28,0.72)",
                        borderRadius: MOON_SIZE / 2,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="photo-camera"
                      size={20}
                      color={isLight ? Colors.light.textMediumEmphasis : Colors.dark.textMediumEmphasis}
                    />
                  </View>
                )}
              </Animated.View>
              {card.memoryId && !avatarExpanded && showTapHint ? (
                <Animated.View pointerEvents="none" style={[styles.moonTapHint, moonHintStyle]}>
                  <MaterialIcons name="keyboard-arrow-down" size={16} color={accentColor} />
                </Animated.View>
              ) : null}
            </Animated.View>
          </Pressable>
          {/* Memory title below the moon — high contrast on bright orb core */}
          <ThemedText
            style={[
              styles.moonLabel,
              isLight
                ? {
                    color: Colors.light.text,
                    textShadowColor: "rgba(255, 255, 255, 0.85)",
                    textShadowRadius: 8,
                  }
                : { textShadowColor: SPHERE_MOON_TITLE_SHADOW[card.sphere] },
            ]}
            numberOfLines={1}
          >
            {card.memoryTitle}
          </ThemedText>
        </View>

        {/* Sphere badge — bottom rim (heart = relationships sphere) */}
        <View
          style={[styles.bottomRimRow, { top: SW / 2 + ATMO_R - 18 }]}
        >
          <View
            pointerEvents="none"
            style={[styles.sphereBadge, {
              borderColor: accentColor + "CC",
              backgroundColor: isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(8,14,28,0.82)",
              shadowColor: accentColor,
            }]}
          >
            <MaterialIcons
              name={SPHERE_ICONS[card.sphere] as React.ComponentProps<typeof MaterialIcons>["name"]}
              size={20}
              color={accentColor}
            />
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={fullLessonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullLessonModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.lessonFullModalBackdrop}
          onPress={() => setFullLessonModalVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t("universe.lessons.accessibility.dismissSheet")}
        >
          <Pressable
            style={[
              styles.lessonFullModalCard,
              {
                backgroundColor: themeColors.background,
                borderColor: isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255,255,255,0.12)",
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.lessonFullModalHeader}>
              <ThemedText
                size="sm"
                weight="bold"
                numberOfLines={2}
                style={[styles.lessonFullModalMemoryTitle, { color: themeColors.text }]}
              >
                {card.memoryTitle}
              </ThemedText>
              <Pressable
                onPress={() => setFullLessonModalVisible(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                style={styles.lessonFullModalCloseBtn}
              >
                <MaterialIcons
                  name="close"
                  size={22}
                  color={isLight ? Colors.light.text : Colors.dark.textHighEmphasis}
                />
              </Pressable>
            </View>
            <ScrollView
              style={[styles.lessonFullModalScroll, { maxHeight: SH * 0.62 }]}
              contentContainerStyle={styles.lessonFullModalScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {moonUri && !moonImageFailed ? (
                <View style={styles.lessonFullModalImageWrap}>
                  <Image source={{ uri: moonUri }} style={styles.lessonFullModalImage} contentFit="cover" />
                </View>
              ) : null}
              <ThemedText style={[styles.lessonFullModalBody, { color: themeColors.text }]}>
                {card.text}
              </ThemedText>
              {card.memoryId ? (
                <View style={styles.lessonFullModalActionsRow}>
                  <Pressable
                    onPress={() => {
                      setFullLessonModalVisible(false);
                      onAvatarPress?.();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("universe.lessons.accessibility.openMemory")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[
                      styles.lessonFullModalOpenMoreBtn,
                      {
                        borderColor: accentColor + "99",
                        backgroundColor: isLight ? "rgba(255,255,255,0.92)" : "rgba(8,14,28,0.75)",
                      },
                    ]}
                  >
                    <MaterialIcons name="open-in-new" size={18} color={accentColor} />
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
  standaloneRoute?: boolean;
  /** Render as tab content (no Modal; tab bar remains visible). */
  embeddedInTab?: boolean;
  /** Pixels to subtract from screen height so the pager clears the bottom tab bar. */
  tabBarOverlapHeight?: number;
  initialTarget?: {
    key: string;
    lessonId?: string;
    memoryId?: string;
    entityId?: string;
    sphere?: LifeSphere;
    text?: string;
  } | null;
  onInitialTargetHandled?: (key: string) => void;
}

export function UniverseLessonsScreen({
  visible,
  onClose,
  embeddedInTab = false,
  tabBarOverlapHeight = 0,
  initialTarget,
  onInitialTargetHandled,
}: Props) {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const scheme = (colorScheme ?? "dark") as "light" | "dark";
  const isLight = scheme === "light";
  const colors = Colors[scheme];
  const filterChipSurface = isLight
    ? { borderColor: "rgba(0, 0, 0, 0.12)", backgroundColor: colors.surfaceElevated2 }
    : {};
  const filterChipSelectedLight = isLight ? { backgroundColor: `${colors.primary}22` } : {};
  const insets = useSafeAreaInsets();
  const { ensureSubscriptionResolved, refreshCustomerInfo } = useSubscription();
  const { appUsabilityHints, cosmicBackgroundOpacity, pulsingAnimations } = useVisualSettings();
  const lightCosmicOff = isLight && cosmicBackgroundOpacity === 0;
  const lessonsScreenBg = isLight
    ? lightCosmicOff
      ? TAB_BACKGROUND_COLOR_LIGHT_COSMIC_OFF
      : colors.background
    : BG_DARK;
  const { idealizedMemories, setLessonFavorite, getEntitiesBySphere } = useJourney();
  const [universeExamVisible, setUniverseExamVisible] = useState(false);

  const listPageHeight = useMemo(() => {
    if (!embeddedInTab || tabBarOverlapHeight <= 0) return SH;
    return Math.max(Math.round(SH * 0.45), SH - tabBarOverlapHeight);
  }, [embeddedInTab, tabBarOverlapHeight]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [bgSeed, setBgSeed] = useState(0);
  const listRef = useRef<FlatList>(null);

  const [isAppActive, setIsAppActive] = useState<AppStateStatus>(() => AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setIsAppActive(next);
    });
    return () => sub.remove();
  }, []);

  /** Pager + decor run only while the app is in the foreground (saves work in background). */
  const runLessonAnimations = visible && isAppActive === "active";

  const [sphereSelection, setSphereSelection] = useState<SphereFilter>("all");
  const [yearSelection, setYearSelection] = useState<YearFilter>("all");
  const [entitySelection, setEntitySelection] = useState<EntityFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showDecorLayers, setShowDecorLayers] = useState(false);

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const handledInitialTargetKeyRef = useRef<string | null>(null);
  const [showOneTimeMoonHint, setShowOneTimeMoonHint] = useState(false);
  const hasMarkedMoonHintSeenRef = useRef(false);

  const sphereFilterKey = useMemo(
    () =>
      sphereSelection === "all"
        ? "all"
        : [...sphereSelection].sort().join(","),
    [sphereSelection],
  );
  const yearFilterKey = useMemo(
    () =>
      yearSelection === "all"
        ? "all"
        : [...yearSelection].sort().join(","),
    [yearSelection],
  );
  const entityFilterKey = useMemo(
    () =>
      entitySelection === "all"
        ? "all"
        : [...entitySelection].sort().join(","),
    [entitySelection],
  );

  const singleSelectedSphere = useMemo((): LifeSphere | null => {
    if (sphereSelection === "all") return null;
    if (sphereSelection.size !== 1) return null;
    return sphereSelection.values().next().value as LifeSphere;
  }, [sphereSelection]);

  const filtersActive =
    sphereSelection !== "all" ||
    yearSelection !== "all" ||
    entitySelection !== "all" ||
    favoritesOnly;

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
            lessonId: l.id,
            text: l.text.trim(),
            memoryTitle: mem.title,
            memoryImageUri: mem.imageUri,
            sphere: (mem.sphere as LifeSphere) ?? "relationships",
            memoryId: mem.id,
            entityId: mem.entityId || mem.profileId,
            memoryCreatedAt: mem.createdAt,
            isFavorite: !!l.isFavorite,
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
    return [];
  }, [idealizedMemories]);

  const hasUserLessons = cards.length > 0;

  /** Ambient pulse + tap pulse multiply so presses always animate. */
  const examIconScale = useSharedValue(1);
  const examTapPulseScale = useSharedValue(1);
  const examIconPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: examIconScale.value * examTapPulseScale.value }],
  }));

  useEffect(() => {
    if (!visible || !runLessonAnimations || !hasUserLessons || !pulsingAnimations) {
      cancelAnimation(examIconScale);
      examIconScale.value = 1;
      return;
    }

    const firePulse = () => {
      examIconScale.value = withSequence(
        withTiming(1.14, { duration: 240, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 280, easing: Easing.inOut(Easing.quad) }),
      );
    };

    const initialTimer = setTimeout(firePulse, 900);
    const intervalId = setInterval(firePulse, 8000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      cancelAnimation(examIconScale);
      examIconScale.value = 1;
    };
  }, [visible, runLessonAnimations, hasUserLessons, pulsingAnimations, examIconScale]);

  const triggerExamIconTapPulse = useCallback(() => {
    cancelAnimation(examTapPulseScale);
    examTapPulseScale.value = 1;
    examTapPulseScale.value = withSequence(
      withTiming(1.14, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 260, easing: Easing.inOut(Easing.quad) }),
    );
  }, [examTapPulseScale]);

  const triggerLessonCheckHaptic = useCallback(() => {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const handleOpenUniverseExam = useCallback(async () => {
    triggerExamIconTapPulse();
    triggerLessonCheckHaptic();
    if (!hasUserLessons) {
      Alert.alert("", t("universe.lessons.noneAvailable"));
      return;
    }
    const { hasAIEntitlement: entitled } = await ensureSubscriptionResolved();
    const hasPending = await hasPendingUniverseExam();
    const canTakeExam =
      entitled || hasPending || (await canUseExam(entitled));
    if (!canTakeExam) {
      const purchased = await showPaywallForAIAccess();
      if (purchased) {
        await refreshCustomerInfo();
        setUniverseExamVisible(true);
      }
      return;
    }
    setUniverseExamVisible(true);
  }, [
    ensureSubscriptionResolved,
    hasUserLessons,
    refreshCustomerInfo,
    t,
    triggerExamIconTapPulse,
    triggerLessonCheckHaptic,
  ]);

  const filteredCards = useMemo(
    () =>
      filterLessonCards(
        cards,
        sphereSelection,
        yearSelection,
        favoritesOnly,
        entitySelection,
      ),
    [cards, sphereSelection, yearSelection, favoritesOnly, entitySelection],
  );

  const entitiesForFilter = useMemo(() => {
    if (!singleSelectedSphere) return [];
    const list = getEntitiesBySphere(singleSelectedSphere);
    return [...list]
      .map((e) => ({
        id: e.id,
        name: (e.name && e.name.trim()) ? e.name.trim() : e.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [singleSelectedSphere, getEntitiesBySphere]);

  const availableYears = useMemo(() => {
    const s = new Set<number>();
    for (const c of cards) {
      const y = new Date(c.memoryCreatedAt).getFullYear();
      if (!Number.isNaN(y)) s.add(y);
    }
    return [...s].sort((a, b) => b - a);
  }, [cards]);

  useEffect(() => {
    if (!visible) return;
    if (
      initialTarget?.key &&
      handledInitialTargetKeyRef.current !== initialTarget.key
    ) {
      return;
    }
    setActiveIndex(0);
    const id = requestAnimationFrame(() => {
      if (filteredCards.length > 0) {
        listRef.current?.scrollToIndex({ index: 0, animated: false });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    visible,
    sphereFilterKey,
    yearFilterKey,
    entityFilterKey,
    favoritesOnly,
    filteredCards.length,
    initialTarget?.key,
  ]);

  useEffect(() => {
    if (!visible || !initialTarget?.key) return;
    if (handledInitialTargetKeyRef.current === initialTarget.key) return;

    const matchCard = (card: LessonCard) => {
      if (
        initialTarget.lessonId &&
        initialTarget.memoryId &&
        card.lessonId === initialTarget.lessonId &&
        card.memoryId === initialTarget.memoryId
      ) {
        return true;
      }
      if (initialTarget.lessonId && card.lessonId === initialTarget.lessonId) {
        return true;
      }
      if (
        initialTarget.memoryId &&
        initialTarget.text &&
        card.memoryId === initialTarget.memoryId &&
        card.text === initialTarget.text
      ) {
        return true;
      }
      if (
        initialTarget.memoryId &&
        initialTarget.entityId &&
        card.memoryId === initialTarget.memoryId &&
        card.entityId === initialTarget.entityId
      ) {
        return true;
      }
      if (
        initialTarget.memoryId &&
        initialTarget.sphere &&
        card.memoryId === initialTarget.memoryId &&
        card.sphere === initialTarget.sphere
      ) {
        return true;
      }
      return false;
    };

    const targetIndex = cards.findIndex(matchCard);
    handledInitialTargetKeyRef.current = initialTarget.key;
    onInitialTargetHandled?.(initialTarget.key);

    if (targetIndex < 0) return;

    // Ensure the target lesson is visible even if the user had active filters.
    setSphereSelection("all");
    setYearSelection("all");
    setEntitySelection("all");
    setFavoritesOnly(false);
    setActiveIndex(targetIndex);

    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: targetIndex, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [cards, initialTarget, onInitialTargetHandled, visible]);

  useEffect(() => {
    if (!visible || filteredCards.length === 0) return;
    setActiveIndex((i) => Math.min(i, filteredCards.length - 1));
  }, [visible, filteredCards.length]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LESSON_MOON_TAP_HINT_SEEN_KEY)
      .then((seen) => {
        if (cancelled) return;
        setShowOneTimeMoonHint(seen !== "true");
      })
      .catch(() => {
        if (cancelled) return;
        setShowOneTimeMoonHint(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showOneTimeMoonHint || hasMarkedMoonHintSeenRef.current) return;
    if (!visible || !appUsabilityHints) return;
    const activeCardForHint = filteredCards[activeIndex];
    if (!activeCardForHint?.memoryId) return;

    // "Once" means first time opening Lessons tab: show briefly, then persist as seen.
    const timer = setTimeout(() => {
      hasMarkedMoonHintSeenRef.current = true;
      setShowOneTimeMoonHint(false);
      AsyncStorage.setItem(LESSON_MOON_TAP_HINT_SEEN_KEY, "true").catch(() => {});
    }, 2200);

    return () => clearTimeout(timer);
  }, [showOneTimeMoonHint, visible, appUsabilityHints, activeIndex, filteredCards]);

  useEffect(() => {
    if (!visible) {
      setShowDecorLayers(false);
      return;
    }
    if (!runLessonAnimations) {
      setShowDecorLayers(false);
      return;
    }
    // Defer heavy visual layers slightly so modal content can appear immediately.
    const timer = setTimeout(() => setShowDecorLayers(true), 80);
    return () => clearTimeout(timer);
  }, [visible, runLessonAnimations]);

  const openFilters = useCallback(() => {
    setFilterSheetVisible(true);
  }, []);

  useEffect(() => {
    if (!filterSheetVisible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setFilterSheetVisible(false);
      return true;
    });
    return () => sub.remove();
  }, [filterSheetVisible]);

  const clearAllFilters = useCallback(() => {
    setSphereSelection("all");
    setYearSelection("all");
    setEntitySelection("all");
    setFavoritesOnly(false);
  }, []);

  useEffect(() => {
    setEntitySelection("all");
  }, [singleSelectedSphere]);

  const toggleSphereSelection = useCallback((s: LifeSphere) => {
    setSphereSelection((prev) => {
      if (prev === "all") return new Set([s]);
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
        return next.size === 0 ? "all" : next;
      }
      next.add(s);
      return next;
    });
  }, []);

  const toggleYearSelection = useCallback((y: number) => {
    setYearSelection((prev) => {
      if (prev === "all") return new Set([y]);
      const next = new Set(prev);
      if (next.has(y)) {
        next.delete(y);
        return next.size === 0 ? "all" : next;
      }
      next.add(y);
      return next;
    });
  }, []);

  const toggleEntitySelection = useCallback((entityId: string) => {
    setEntitySelection((prev) => {
      if (prev === "all") return new Set([entityId]);
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
        return next.size === 0 ? "all" : next;
      }
      next.add(entityId);
      return next;
    });
  }, []);

  const handleToggleFavorite = useCallback(
    (item: LessonCard) => {
      if (!item.memoryId) return;
      void setLessonFavorite(item.memoryId, item.lessonId, !item.isFavorite);
    },
    [setLessonFavorite],
  );

  const bgSeedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgFadeOut = useSharedValue(1);
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) {
        // Pager "focus" for lesson animations must track the on-screen page immediately;
        // delaying this kept off-screen sferas running and hid animations from the new page.
        setActiveIndex(idx);
        if (bgSeedTimerRef.current) clearTimeout(bgSeedTimerRef.current);
        bgFadeOut.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
        bgSeedTimerRef.current = setTimeout(() => {
          setBgSeed(idx);
          bgFadeOut.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
        }, 420);
      }
    },
    [bgFadeOut],
  );
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 52 }), []);

  const activeCard = filteredCards[activeIndex];
  const accentColor = getSphereSferaColor(activeCard?.sphere ?? "career", scheme);

  const triggerBoundaryHaptic = useCallback(() => {
    if (Platform.OS === "ios" && Device.isDevice) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, []);

  const handleScrollEndDrag = useCallback(
    (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (filteredCards.length <= 1) return;
      const maxOffset = (filteredCards.length - 1) * listPageHeight;
      const y = ev.nativeEvent.contentOffset.y ?? 0;
      const vy = ev.nativeEvent.velocity?.y ?? 0;
      const EPS = 4;
      const VEL_THRESHOLD = 0.15;

      const tryingPastTop = y <= EPS && vy < -VEL_THRESHOLD;
      const tryingPastBottom = y >= maxOffset - EPS && vy > VEL_THRESHOLD;
      if (tryingPastTop || tryingPastBottom) {
        triggerBoundaryHaptic();
      }
    },
    [filteredCards.length, listPageHeight, triggerBoundaryHaptic],
  );

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
  const hasPlayedSwipeHintRef = useRef(false);
  useEffect(() => {
    if (hasPlayedSwipeHintRef.current) return;
    if (!visible || !appUsabilityHints || !runLessonAnimations) {
      cancelAnimation(swipeHintOpacity);
      cancelAnimation(swipeHintY);
      swipeHintOpacity.value = 0;
      swipeHintY.value = 0;
      return;
    }
    hasPlayedSwipeHintRef.current = true;
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
  }, [visible, runLessonAnimations, appUsabilityHints, swipeHintOpacity, swipeHintY]);
  const swipeHintStyle = useAnimatedStyle(() => ({
    opacity: swipeHintOpacity.value,
    transform: [{ translateY: swipeHintY.value }],
  }));

  // Screen fade-in — replaces the slow native "slide" animation
  const screenOpacity = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      screenOpacity.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) });
    } else {
      screenOpacity.value = 0;
    }
  }, [visible, screenOpacity]);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  const handleAvatarPress = useCallback((card: LessonCard) => {
    if (!card.entityId || !card.memoryId) return;

    const detailParams: {
      sphere: LifeSphere;
      entityId: string;
      focusedMemoryId: string;
      source?: string;
      profileId?: string;
      jobId?: string;
      familyMemberId?: string;
      friendId?: string;
      hobbyId?: string;
    } = {
      sphere: card.sphere,
      entityId: card.entityId,
      focusedMemoryId: card.memoryId,
      source: "universe_lessons_modal",
    };

    if (card.sphere === "relationships") detailParams.profileId = card.entityId;
    else if (card.sphere === "career") detailParams.jobId = card.entityId;
    else if (card.sphere === "family") detailParams.familyMemberId = card.entityId;
    else if (card.sphere === "friends") detailParams.friendId = card.entityId;
    else if (card.sphere === "hobbies") detailParams.hobbyId = card.entityId;

    router.replace({
      pathname: "/(tabs)" as const,
      params: detailParams,
    });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: LessonCard; index: number }) => (
      <LessonSfera
        card={item}
        isVisible={index === activeIndex && runLessonAnimations}
        onAvatarPress={item.memoryId ? () => handleAvatarPress(item) : undefined}
        onToggleFavorite={
          item.memoryId ? () => handleToggleFavorite(item) : undefined
        }
        pageHeight={listPageHeight}
        showTapHint={showOneTimeMoonHint && appUsabilityHints && index === activeIndex}
      />
    ),
    [activeIndex, runLessonAnimations, handleAvatarPress, handleToggleFavorite, listPageHeight],
  );
  const keyExtractor = useCallback((item: LessonCard) => item.id, []);

  const screenBody = (
      <Animated.View style={[styles.root, { backgroundColor: lessonsScreenBg }, screenStyle]}>
        {showDecorLayers && !lightCosmicOff ? (
          <>
            <StarField
              isLight={isLight}
              nebulaColor={
                isLight
                  ? sphereRingsForScheme(activeCard?.sphere ?? "career", "light").glow
                  : SPHERE_RINGS[activeCard?.sphere ?? "career"].glow
              }
            />
            {!isLight
              ? twinkles.map((tw, i) => (
                  <TwinkleDot key={i} x={tw.x} y={tw.y} r={tw.r} delay={tw.delay} isLight={false} />
                ))
              : null}
            {shootingStars.map((ss, i) => (
              <ShootingStar key={i} x={ss.x} y={ss.y} angle={ss.angle} delay={ss.delay} color={accentColor} />
            ))}
          </>
        ) : null}

        {/* Swipe hint — finger + up/down arrows, centered on screen */}
        {appUsabilityHints && filteredCards.length > 1 && (
          <Animated.View
            pointerEvents="none"
            style={[swipeHintStyle, {
              position: "absolute",
              top: listPageHeight / 2 - 26,
              left: 0, right: 0,
              alignItems: "center",
              zIndex: 30,
            }]}
          >
            <MaterialIcons name="expand-less" size={28} color={colors.textMediumEmphasis} />
            <View style={{ marginVertical: 2 }}>
              <MaterialIcons
                name="touch-app"
                size={52}
                color={isLight ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.45)"}
                style={{ position: "absolute", left: 2, top: 2 }}
              />
              <MaterialIcons
                name="touch-app"
                size={52}
                color={isLight ? colors.text : colors.textHighEmphasis}
              />
            </View>
            <MaterialIcons name="expand-more" size={28} color={colors.textMediumEmphasis} />
          </Animated.View>
        )}


        {showDecorLayers ? <BackgroundSferas seed={bgSeed} fadeOut={bgFadeOut} isLight={isLight} /> : null}
        {cards.length === 0 ? (
          <View style={styles.emptyLessonsWrap} pointerEvents="none">
            <ThemedText
              style={[
                styles.emptyLessonsText,
                { color: isLight ? colors.text : colors.textMediumEmphasis },
              ]}
            >
              {t("universe.lessons.noneAvailable")}
            </ThemedText>
          </View>
        ) : filteredCards.length === 0 ? (
          <View style={styles.emptyLessonsWrap}>
            <ThemedText
              style={[
                styles.emptyLessonsText,
                { color: isLight ? colors.text : colors.textMediumEmphasis },
              ]}
            >
              {t("universe.lessons.emptyFiltered")}
            </ThemedText>
            <Pressable
              onPress={clearAllFilters}
              style={[
                styles.clearFiltersBtn,
                isLight && {
                  backgroundColor: `${colors.primary}22`,
                  borderColor: `${colors.primary}55`,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("universe.lessons.clearFilters")}
            >
              <ThemedText
                style={[
                  styles.clearFiltersBtnText,
                  { color: isLight ? colors.primaryDark : colors.textHighEmphasis },
                ]}
              >
                {t("universe.lessons.clearFilters")}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={filteredCards}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              pagingEnabled
              snapToInterval={listPageHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              onScrollEndDrag={handleScrollEndDrag}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: listPageHeight,
                offset: listPageHeight * index,
                index,
              })}
              // Fewer off-screen items mounted; non-active still rely on isVisible, not on unmount.
              windowSize={3}
              style={{ flex: 1 }}
            />
            {filteredCards.length > 1 && (
              <ScrollRail total={filteredCards.length} active={activeIndex} color={accentColor} />
            )}
          </>
        )}

        {/* Header last so it wins hit-testing over full-screen FlatList (iOS) */}
        <View
          style={[styles.header, { top: insets.top + 12 }]}
          pointerEvents="box-none"
        >
          {embeddedInTab ? (
            <View style={styles.headerIconSlot} />
          ) : (
            <Pressable
              onPress={onClose}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={t("universe.lessons.accessibility.back")}
              style={styles.headerIconSlot}
            >
              <View
                style={[
                  styles.closeBg,
                  isLight && {
                    backgroundColor: "rgba(255, 255, 255, 0.96)",
                    borderColor: "rgba(0, 0, 0, 0.16)",
                  },
                ]}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={20}
                  color={isLight ? colors.text : colors.textHighEmphasis}
                />
              </View>
            </Pressable>
          )}
          <ThemedText
            pointerEvents="none"
            numberOfLines={1}
            style={[
              styles.headerTitleCenter,
              {
                color: isLight ? colors.text : colors.textHighEmphasis,
                textShadowColor: isLight ? "rgba(0, 0, 0, 0.06)" : accentColor + "55",
                textShadowRadius: isLight ? 4 : 10,
              },
            ]}
          >
            {t("universe.modal.title")}
          </ThemedText>
          <View
            style={[styles.headerIconSlot, { width: 92, flexDirection: "row", justifyContent: "flex-end", gap: 6 }]}
          >
            <Pressable
              onPress={handleOpenUniverseExam}
              disabled={!hasUserLessons}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasUserLessons }}
              accessibilityLabel={t("universe.lessons.lessonCheckCta")}
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <Animated.View
                style={[
                  styles.closeBg,
                  examIconPulseStyle,
                  isLight && {
                    backgroundColor: "rgba(255, 255, 255, 0.96)",
                    borderColor: "rgba(0, 0, 0, 0.16)",
                  },
                ]}
              >
                <MaterialIcons
                  name="fact-check"
                  size={20}
                  color={
                    hasUserLessons
                      ? accentColor
                      : isLight
                        ? colors.textDisabled
                        : colors.textDisabled
                  }
                />
              </Animated.View>
            </Pressable>
            <Pressable
              onPress={openFilters}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={
                filtersActive
                  ? `${t("universe.lessons.accessibility.openFilters")}, ${t("universe.lessons.accessibility.filterActive")}`
                  : t("universe.lessons.accessibility.openFilters")
              }
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <View
                style={[
                  styles.closeBg,
                  isLight && {
                    backgroundColor: "rgba(255, 255, 255, 0.96)",
                    borderColor: "rgba(0, 0, 0, 0.16)",
                  },
                ]}
              >
                <MaterialIcons name="tune" size={20} color={isLight ? colors.text : colors.textHighEmphasis} />
                {filtersActive ? <View style={styles.filterActiveDot} /> : null}
              </View>
            </Pressable>
          </View>
        </View>

        {/* Centered card like Events; filters apply live — dismiss by tapping outside */}
        {filterSheetVisible ? (
          <View style={styles.filterOverlay} pointerEvents="auto">
            <Pressable
              style={styles.filterModalBackdrop}
              onPress={() => setFilterSheetVisible(false)}
              accessibilityLabel={t("universe.lessons.accessibility.dismissSheet")}
            >
              <Pressable
                style={[styles.filterModalBox, { backgroundColor: colors.background }]}
                onPress={(e) => e.stopPropagation()}
              >
                <ThemedText size="l" weight="bold" style={[styles.filterModalTitle, { color: colors.text }]}>
                  {t("universe.lessons.filters.title")}
                </ThemedText>

                <View style={styles.filterModalRow}>
                  <ThemedText size="sm" style={{ flex: 1, color: colors.text }}>
                    {t("universe.lessons.filters.favoritesOnly")}
                  </ThemedText>
                  <Switch
                    value={favoritesOnly}
                    onValueChange={setFavoritesOnly}
                    trackColor={{
                      false: colors.text + "40",
                      true: colors.primary + "80",
                    }}
                    thumbColor={colors.primary}
                  />
                </View>

                <ThemedText
                  size="sm"
                  style={[styles.filterModalSectionLabel, { color: colors.text }]}
                >
                  {t("universe.lessons.filters.sphereSection")}
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  style={styles.filterModalChipRow}
                  contentContainerStyle={styles.filterModalChipRowContent}
                >
                  <Pressable
                    onPress={() => setSphereSelection("all")}
                    style={[
                      styles.filterModalChip,
                      filterChipSurface,
                      sphereSelection === "all" && [
                        styles.filterModalChipSelected,
                        filterChipSelectedLight,
                        { borderColor: colors.primary + "AA" },
                      ],
                    ]}
                  >
                    <ThemedText
                      size="sm"
                      style={{
                        color: sphereSelection === "all" ? colors.primary : colors.text,
                        fontWeight: sphereSelection === "all" ? "600" : "500",
                      }}
                    >
                      {t("universe.lessons.filters.allSpheres")}
                    </ThemedText>
                  </Pressable>
                  {SPHERE_LIST.map((sp) => {
                    const selected =
                      sphereSelection !== "all" && sphereSelection.has(sp);
                    const c = getSphereSferaColor(sp, scheme);
                    return (
                      <Pressable
                        key={sp}
                        onPress={() => toggleSphereSelection(sp)}
                        style={[
                          styles.filterModalChip,
                          filterChipSurface,
                          selected && [
                            styles.filterModalChipSelected,
                            filterChipSelectedLight,
                            { borderColor: c + "CC" },
                          ],
                        ]}
                      >
                        <MaterialIcons
                          name={SPHERE_ICONS[sp] as React.ComponentProps<typeof MaterialIcons>["name"]}
                          size={16}
                          color={selected ? c : colors.text + "99"}
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText
                          size="sm"
                          numberOfLines={1}
                          style={{
                            color: selected ? c : colors.text,
                            fontWeight: selected ? "600" : "500",
                            maxWidth: SW * 0.28,
                          }}
                        >
                          {t(`momentNotifications.sphere.${sp}` as const)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {singleSelectedSphere ? (
                  <>
                    <ThemedText
                      size="sm"
                      style={[styles.filterModalSectionLabel, { color: colors.text, marginTop: 14 }]}
                    >
                      {t("universe.lessons.filters.entitySection")}
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled
                      style={styles.filterModalChipRow}
                      contentContainerStyle={styles.filterModalChipRowContent}
                    >
                      <Pressable
                        onPress={() => setEntitySelection("all")}
                        style={[
                          styles.filterModalChip,
                          filterChipSurface,
                          entitySelection === "all" && [
                            styles.filterModalChipSelected,
                            filterChipSelectedLight,
                            { borderColor: colors.primary + "AA" },
                          ],
                        ]}
                      >
                        <ThemedText
                          size="sm"
                          style={{
                            color: entitySelection === "all" ? colors.primary : colors.text,
                            fontWeight: entitySelection === "all" ? "600" : "500",
                          }}
                        >
                          {t("universe.lessons.filters.allEntities")}
                        </ThemedText>
                      </Pressable>
                      {entitiesForFilter.map((ent) => {
                        const selected =
                          entitySelection !== "all" && entitySelection.has(ent.id);
                        const c = getSphereSferaColor(singleSelectedSphere, scheme);
                        return (
                          <Pressable
                            key={ent.id}
                            onPress={() => toggleEntitySelection(ent.id)}
                            style={[
                              styles.filterModalChip,
                              filterChipSurface,
                              selected && [
                                styles.filterModalChipSelected,
                                filterChipSelectedLight,
                                { borderColor: c + "CC" },
                              ],
                            ]}
                          >
                            <ThemedText
                              size="sm"
                              numberOfLines={1}
                              style={{
                                color: selected ? c : colors.text,
                                fontWeight: selected ? "600" : "500",
                                maxWidth: SW * 0.36,
                              }}
                            >
                              {ent.name}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}

                <ThemedText
                  size="sm"
                  style={[styles.filterModalSectionLabel, { color: colors.text, marginTop: 14 }]}
                >
                  {t("universe.lessons.filters.yearSection")}
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  style={styles.filterModalChipRow}
                  contentContainerStyle={styles.filterModalChipRowContent}
                >
                  <Pressable
                    onPress={() => setYearSelection("all")}
                    style={[
                      styles.filterModalChip,
                      filterChipSurface,
                      yearSelection === "all" && [
                        styles.filterModalChipSelected,
                        filterChipSelectedLight,
                        { borderColor: colors.primary + "AA" },
                      ],
                    ]}
                  >
                    <ThemedText
                      size="sm"
                      style={{
                        color: yearSelection === "all" ? colors.primary : colors.text,
                        fontWeight: yearSelection === "all" ? "600" : "500",
                      }}
                    >
                      {t("universe.lessons.filters.allYears")}
                    </ThemedText>
                  </Pressable>
                  {availableYears.map((y) => {
                    const selected =
                      yearSelection !== "all" && yearSelection.has(y);
                    return (
                      <Pressable
                        key={y}
                        onPress={() => toggleYearSelection(y)}
                        style={[
                          styles.filterModalChip,
                          filterChipSurface,
                          selected && [
                            styles.filterModalChipSelected,
                            filterChipSelectedLight,
                            { borderColor: colors.primary + "AA" },
                          ],
                        ]}
                      >
                        <ThemedText
                          size="sm"
                          style={{
                            color: selected ? colors.primary : colors.text,
                            fontWeight: selected ? "600" : "500",
                          }}
                        >
                          {String(y)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={[styles.filterModalActions, { marginTop: 20 }]}>
                  <Pressable
                    onPress={clearAllFilters}
                    style={styles.filterModalBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t("universe.lessons.filters.reset")}
                  >
                    <ThemedText size="sm" weight="medium" style={{ color: colors.text + "CC" }}>
                      {t("universe.lessons.filters.reset")}
                    </ThemedText>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </View>
        ) : null}

      </Animated.View>
  );

  return (
    <>
      {embeddedInTab ? (
        screenBody
      ) : (
        <Modal
          visible={visible}
          transparent
          animationType="none"
          onRequestClose={onClose}
          statusBarTranslucent
        >
          {screenBody}
        </Modal>
      )}
      <UniverseExamScreen
        visible={universeExamVisible}
        onClose={() => setUniverseExamVisible(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  emptyLessonsWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyLessonsText: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    color: Colors.dark.textMediumEmphasis,
    fontWeight: "500",
  },
  header: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconSlot: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: Colors.dark.textHighEmphasis,
    letterSpacing: 0.4,
    textAlign: "center",
    paddingHorizontal: 108,
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
    position: "relative",
  },
  filterActiveDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#E879A9",
    borderWidth: 1,
    borderColor: "rgba(8,14,28,0.9)",
  },
  /** Full-screen layer above lessons list (matches Events filter stacking). */
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
    elevation: 50,
  },
  /** Same as `events.tsx` modalBackdrop — centered card + dim. */
  filterModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  filterModalBox: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  filterModalTitle: {
    marginBottom: 16,
  },
  filterModalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterModalSectionLabel: {
    marginBottom: 8,
    opacity: 0.85,
    fontWeight: "600",
  },
  filterModalChipRow: {
    marginBottom: 4,
    maxHeight: 52,
  },
  filterModalChipRowContent: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    paddingVertical: 2,
    gap: 8,
  },
  filterModalChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(128,128,128,0.35)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  filterModalChipSelected: {
    backgroundColor: "rgba(100,181,246,0.14)",
  },
  filterModalActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  filterModalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(100,181,246,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(100,181,246,0.45)",
  },
  clearFiltersBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.textHighEmphasis,
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
    zIndex: 9,
  },
  /** Below moon + memory title; right side of the lesson text block */
  favoriteInOverlay: {
    position: "absolute",
    top: MOON_SIZE + 52,
    right: ATMO_R * 0.28,
    zIndex: 8,
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
  moonTapHint: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,14,28,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  innerLessonImageWrap: {
    position: "absolute",
    alignSelf: "center",
    overflow: "hidden",
    zIndex: 3,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.22)",
  },
  innerLessonImage: {
    width: "100%",
    height: "100%",
  },
  innerLessonImageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 14, 28, 0.28)",
  },
  expandedActionTop: {
    position: "absolute",
    top: LESSON_INNER_IMAGE_TOP - 20,
    alignSelf: "center",
    zIndex: 14,
  },
  expandedActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 5,
  },
  moonLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.35,
    maxWidth: ATMO_R * 1.6,
    textAlign: "center",
    color: Colors.dark.textHighEmphasis,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
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
  innerContentPressable: {
    alignSelf: "stretch",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 4,
  },
  lessonTextWrap: {
    alignSelf: "stretch",
    width: "100%",
  },
  learnMorePressable: {
    alignSelf: "center",
    marginTop: 6,
    paddingVertical: 4,
  },
  lessonActionsRow: {
    marginTop: 2,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  openMorePressable: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(8,14,28,0.2)",
  },
  learnMoreText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.35,
    textDecorationLine: "underline",
    textDecorationColor: Colors.dark.textDisabled,
  },
  lessonFullModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  lessonFullModalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: SH * 0.78,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  lessonFullModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  lessonFullModalMemoryTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  lessonFullModalCloseBtn: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  lessonFullModalScroll: {
    flexGrow: 0,
  },
  lessonFullModalScrollContent: {
    paddingBottom: 8,
  },
  lessonFullModalActionsRow: {
    marginTop: 10,
    width: "100%",
    alignItems: "flex-end",
  },
  lessonFullModalOpenMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  lessonFullModalImageWrap: {
    width: "100%",
    height: 168,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  lessonFullModalImage: {
    width: "100%",
    height: "100%",
  },
  lessonFullModalBody: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  lessonText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
    letterSpacing: 0.1,
    color: Colors.dark.textHighEmphasis,
    textShadowColor: "rgba(8,14,28,0.80)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  bottomRimRow: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 12,
  },
  favoriteStarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,14,28,0.82)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  sphereBadge: {
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
