/**
 * FocusedSferas view — one sphere in focus (large, center-bottom), the rest on orbit.
 * Swipe left/right or use chevrons to change focus. Tap Sunny Life avatar to return to Classic view.
 *
 * All interaction state lives here so the parent home tab does NOT re-render on swipes/interactions.
 */

import { ConstellationBackground } from "@/components/constellation-background";
import { Fireworks } from "@/components/fireworks";
import { SunnyLifeAvatar } from "@/components/SunnyLifeAvatar";
import { ThemedText } from "@/components/themed-text";
import { UniverseLessonsScreen } from "@/components/universe-lessons-screen";
import { UniverseExamScreen } from "@/components/universe-exam-screen";
import { Colors } from "@/constants/theme";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import { SUN_CONGRATS_LAST_SHOWN_KEY, useVisualSettings } from "@/utils/VisualSettingsProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForAIAccess } from "@/utils/premium-access";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { hasPendingUniverseExam } from "@/utils/universe-exam-pending";
import { canUseExam } from "@/utils/universe-exam-rate-limiter";
import {
  getSphere3DGradientColors,
  getSphereGradientColors,
  getSphereIconColor,
  getSphereShadowColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  InteractionManager,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
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
  Ellipse as SvgEllipse,
  FeColorMatrix,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  Filter,
  Line,
  Path,
  RadialGradient,
  Stop,
  Circle as SvgCircle,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";


const { width: SW, height: SH } = Dimensions.get("window");

const SPHERE_LIST: { type: LifeSphere; icon: string }[] = [
  { type: "relationships", icon: "favorite" },
  { type: "career", icon: "work" },
  { type: "family", icon: "family-restroom" },
  { type: "friends", icon: "people" },
  { type: "hobbies", icon: "sports-esports" },
];

/** Neon rim colors per sphere — matches universe-lessons-screen palette */
const SPHERE_NEON: Record<LifeSphere, { core: string; glow: string }> = {
  relationships: { core: "#FF9696", glow: "#FF9696" },
  career:        { core: "#96C8FF", glow: "#96CAFF" },
  family:        { core: "#C896FF", glow: "#C89CFF" },
  friends:       { core: "#9B7AFF", glow: "#9B7AFF" },
  hobbies:       { core: "#F97B16", glow: "#F97B16" },
};

const FOCUSED_SIZE = 170;
const FOCUSED_ICON_SIZE = 72;

// Orbit around the Sunny Life avatar: spheres move along this circle when switching focus
const ORBIT_CX = SW / 2;
// Slightly lower than center to keep space for the badge + toggle
const ORBIT_CY = SH * 0.46;
const ORBIT_R = 135;

/** Scalable gap between rotating entities and the label block (3% of screen height) */
const FOCUSED_LABEL_GAP = SH * 0.03;
/** Gap between label text and pagination dots (0.8% of screen height) */
const LABEL_TO_DOTS_GAP = SH * 0.008;
/** Entity orbit radius when this sphere is focused (sphere radius + entity radius + padding) */
const FOCUSED_ENTITY_ORBIT_R = FOCUSED_SIZE / 2 + 20 + 8;

/** Left just above the focused sfera (slot 4) — slightly bigger */
const BG_SPHERE_SIZE_LEFT_BELOW = 76;
/** Right just above / below-right of the circle avatar (slot 1) — a bit bigger */
const BG_SPHERE_SIZE_RIGHT_BELOW = 82;
/** Sfera above the Sunny Life circle on the right (slot 2) — slightly smaller */
const BG_SPHERE_SIZE_TOP_RIGHT = 46;
/** Sfera above the Sunny Life circle on the left (slot 3) — a bit bigger */
const BG_SPHERE_SIZE_TOP_LEFT = 82;
const SLOT_ANGLE = 72; // 360 / 5

/** Slot 0 = focus (bottom), slots 1-4 go clockwise. Returns angle in degrees (0 = bottom). */
function getSlotAngle(slot: number): number {
  return slot * SLOT_ANGLE;
}

/** Target layout for sphere at index i when focusedIdx is f. Sphere moves along orbit. */
function getSphereTarget(
  sphereIdx: number,
  focusedIdx: number,
): { angle: number; size: number } {
  const slot = (sphereIdx - focusedIdx + 5) % 5;
  const angle = getSlotAngle(slot);
  const size =
    slot === 0
      ? FOCUSED_SIZE
      : slot === 1
        ? BG_SPHERE_SIZE_RIGHT_BELOW
        : slot === 4
          ? BG_SPHERE_SIZE_LEFT_BELOW
          : slot === 2
            ? BG_SPHERE_SIZE_TOP_RIGHT
            : BG_SPHERE_SIZE_TOP_LEFT;
  return { angle, size };
}

/** Depth scale for entity ring (floating entities) per slot — illusion of distance: higher/further = smaller. Slot 2 (top-right) smallest. */
function getEntityDepthScale(slot: number): number {
  if (slot === 0) return 1;
  if (slot === 2) return 0.5; // top-right, furthest → smallest entities
  if (slot === 3) return 0.62; // top-left, high → smaller
  if (slot === 1) return 0.78; // right below
  return 0.78; // slot 4, left below
}

// ───────────────────────────── types ─────────────────────────────

export type FocusedSferaViewProps = {
  overallSunnyPercentage: number;
  /** When false, circle avatar shows "Add memories" and tap navigates to Sfera tab. */
  hasMemories: boolean;
  /** Called when user taps "Add memories" (when hasMemories is false). Typically navigates to Sfera tab. */
  onAddMemoriesPress?: () => void;
  onSphereSelect: (sphere: LifeSphere) => void;
  /** Switch back to Classic view (wheel of life). */
  onSwitchToClassic: () => void;
  /** Called when user taps circle avatar to clear sfera selection and return to initial view showing all sferas. */
  onClearSelection?: () => void;
  /** Called when user taps a floating entity avatar; navigates to entity detail. */
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
  /** Currently selected sphere (null = initial view with all sferas, non-null = individual sfera view). Used to determine if circle avatar shows overall or focused sfera percentage. */
  selectedSphere?: LifeSphere | null;
  colorScheme: "light" | "dark";
  getSphereSunnyPercentage: (sphere: LifeSphere) => number;
  entityImageUrisBySphere: Record<LifeSphere, string[]>;
  /** Entity IDs per sphere; inner array matches entityImageUrisBySphere order. */
  entityIdsBySphere: Record<LifeSphere, string[]>;
  /** Entity names per sphere; used for placeholder when entity has no image. */
  entityNamesBySphere: Record<LifeSphere, string[]>;
  /** Memories per entity per sphere; inner array matches entityImageUrisBySphere order. */
  memoriesPerEntityBySphere: Record<LifeSphere, IdealizedMemory[][]>;
  /** Initial focused sphere index (0–4); used when returning to Focused view so selection is remembered. */
  initialFocusedIdx?: number;
  /** Called when user changes focus (swipe/chevron) so parent can persist the selection. */
  onFocusedSphereChange?: (index: number) => void;
  /** Full orbit duration in ms for entities around the focused sphere. From Personalization settings. */
  orbitDurationMs?: number;
  /** Constellation density 0–10. From Personalization settings. */
  constellationAmount?: number;
  /** Constellation opacity 0–10. From Personalization settings. */
  constellationOpacity?: number;
  /** When true, component stays mounted and runs calcs but is invisible (opacity 0, no pointer events). Used for instant back from entity detail. */
  hidden?: boolean;
  /** When false, pulsing animations (cosmic rings, sphere pulse) are disabled. From Personalization settings. */
  pulsingAnimations?: boolean;
  /** Called when user taps insights icon from the expanded sun menu. Navigates to /insights. */
  onInsightsPress?: () => void;
  /** Called when user taps "Challenge Me" in Universe Lessons or Your Universe modal. Runs rate-limit check and spins main wheel. */
  onChallengeMePress?: () => void;
  /** When true, the splash screen animation has finished and the joy-meter intro sequence can begin. */
  splashDone?: boolean;
};

// ───────────────────── Small floating memory icons around one entity (one per memory, sunny/cloudy color) ─────────────────────

const MOMENT_ICON_SIZE = 16;
const MOMENT_ORBIT_RADIUS = 32; // outside entity avatar (entity radius ~20 for focused; +12 gap so memories sit clearly away)

/** Fewer, lighter bubbles — 18× heavy SVG suns was a main source of congrats intro jank. */
const RISING_SUN_COUNT = 8;

// ─── Background decorative sferas (rings, orbs, arcs) ───────────────────────
// Lesson card occupies roughly the horizontal center and y: 180–420.
// Decorations avoid that zone by staying in corners / edges.
const BG_DECOR = [
  // top-left corner cluster
  { cx: SW * 0.08, cy: SH * 0.07, rx: 52, ry: 52, strokeW: 1.2, op: 0.10, fill: false },
  { cx: SW * 0.08, cy: SH * 0.07, rx: 32, ry: 32, strokeW: 0.7, op: 0.07, fill: false },
  { cx: SW * 0.14, cy: SH * 0.12, rx: 14, ry: 14, strokeW: 0, op: 0.08, fill: true },
  // top-right corner
  { cx: SW * 0.88, cy: SH * 0.06, rx: 44, ry: 44, strokeW: 1.0, op: 0.09, fill: false },
  { cx: SW * 0.92, cy: SH * 0.10, rx: 20, ry: 20, strokeW: 0, op: 0.07, fill: true },
  { cx: SW * 0.82, cy: SH * 0.14, rx: 10, ry: 10, strokeW: 0, op: 0.05, fill: true },
  // left edge mid (below lesson card zone)
  { cx: SW * 0.04, cy: SH * 0.60, rx: 60, ry: 36, strokeW: 0.8, op: 0.08, fill: false },
  { cx: SW * 0.06, cy: SH * 0.55, rx: 18, ry: 18, strokeW: 0, op: 0.06, fill: true },
  // right edge mid
  { cx: SW * 0.96, cy: SH * 0.58, rx: 50, ry: 30, strokeW: 0.9, op: 0.08, fill: false },
  { cx: SW * 0.90, cy: SH * 0.64, rx: 12, ry: 12, strokeW: 0, op: 0.05, fill: true },
  // bottom cluster
  { cx: SW * 0.18, cy: SH * 0.88, rx: 68, ry: 42, strokeW: 1.1, op: 0.09, fill: false },
  { cx: SW * 0.22, cy: SH * 0.93, rx: 22, ry: 22, strokeW: 0, op: 0.07, fill: true },
  { cx: SW * 0.78, cy: SH * 0.90, rx: 55, ry: 34, strokeW: 1.0, op: 0.08, fill: false },
  { cx: SW * 0.75, cy: SH * 0.85, rx: 16, ry: 16, strokeW: 0, op: 0.06, fill: true },
  // scattered small orbs (all outside lesson zone)
  { cx: SW * 0.50, cy: SH * 0.04, rx: 8, ry: 8, strokeW: 0, op: 0.06, fill: true },
  { cx: SW * 0.30, cy: SH * 0.08, rx: 5, ry: 5, strokeW: 0, op: 0.05, fill: true },
  { cx: SW * 0.68, cy: SH * 0.09, rx: 7, ry: 7, strokeW: 0, op: 0.05, fill: true },
  { cx: SW * 0.12, cy: SH * 0.75, rx: 9, ry: 9, strokeW: 0, op: 0.06, fill: true },
  { cx: SW * 0.88, cy: SH * 0.80, rx: 6, ry: 6, strokeW: 0, op: 0.05, fill: true },
];

const BackgroundDecorations = React.memo(function BackgroundDecorations() {
  return (
    <Svg
      width={SW}
      height={SH}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {BG_DECOR.map((d, i) =>
        d.fill ? (
          <SvgEllipse
            key={i}
            cx={d.cx}
            cy={d.cy}
            rx={d.rx}
            ry={d.ry}
            fill="#B0C8FF"
            fillOpacity={d.op}
          />
        ) : (
          <SvgEllipse
            key={i}
            cx={d.cx}
            cy={d.cy}
            rx={d.rx}
            ry={d.ry}
            fill="none"
            stroke="#B0C8FF"
            strokeWidth={d.strokeW}
            strokeOpacity={d.op}
          />
        )
      )}
    </Svg>
  );
});

/** Compute sunny % for a memory from goodFacts vs hardTruths; 50 = neutral, 100 = all sunny, 0 = all cloudy */
function getMemorySunnyPercentage(memory: IdealizedMemory): number {
  const clouds = (memory.hardTruths || []).length;
  const suns = (memory.goodFacts || []).length;
  const total = clouds + suns;
  if (total === 0) return 50;
  return (suns / total) * 100;
}

const SmallFloatingMoments = React.memo(function SmallFloatingMoments({
  entityCenterX,
  entityCenterY,
  entityIndex,
  memories,
}: {
  entityCenterX: number;
  entityCenterY: number;
  entityIndex: number;
  memories: IdealizedMemory[];
}) {
  const { momentColors } = useMomentColors();
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(1, {
        duration: 1800 + entityIndex * 150,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [entityIndex, floatY]);

  const memoryIcons = useMemo(() => {
    const maxIcons = 8;
    const slice = memories.slice(0, maxIcons);
    return slice.map((memory) => {
      const sunnyPct = getMemorySunnyPercentage(memory);
      const isSunny = sunnyPct >= 50;
      return {
        id: memory.id,
        name: (isSunny ? "wb-sunny" : "cloud") as "wb-sunny" | "cloud",
        color: isSunny
          ? momentColors.sunny.background
          : momentColors.cloudy.background,
        glowColor: isSunny
          ? momentColors.sunny.background
          : momentColors.cloudy.background,
      };
    });
  }, [memories, momentColors]);

  if (memoryIcons.length === 0) return null;

  return (
    <>
      {memoryIcons.map((m, i) => {
        const angle = (i / memoryIcons.length) * 2 * Math.PI - Math.PI / 2;
        const ix =
          entityCenterX +
          Math.cos(angle) * MOMENT_ORBIT_RADIUS -
          MOMENT_ICON_SIZE / 2;
        const iy =
          entityCenterY +
          Math.sin(angle) * MOMENT_ORBIT_RADIUS -
          MOMENT_ICON_SIZE / 2;
        return (
          <SmallFloatingMomentIcon
            key={m.id}
            left={ix}
            top={iy}
            floatY={floatY}
            color={m.color}
            name={m.name}
            glowColor={m.glowColor}
          />
        );
      })}
    </>
  );
});

const SmallFloatingMomentIcon = React.memo(function SmallFloatingMomentIcon({
  left,
  top,
  floatY,
  color,
  name,
  glowColor,
}: {
  left: number;
  top: number;
  floatY: SharedValue<number>;
  color: string;
  name: "wb-sunny" | "cloud";
  glowColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value * 3 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left,
          top,
          width: MOMENT_ICON_SIZE,
          height: MOMENT_ICON_SIZE,
          borderRadius: MOMENT_ICON_SIZE / 2,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 20,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      <MaterialIcons name={name} size={MOMENT_ICON_SIZE - 2} color={color} />
    </Animated.View>
  );
});

// ───────────────────── Entity avatar ring (same glow blur as classic FloatingEntity) ─────────────────────

const DEFAULT_ENTITY_ORBIT_DURATION_MS = 60000;

// ───────────────────── Sparkled dots (scattered across screen) ─────────────────────

const SparkledDots = React.memo(function SparkledDots({
  avatarSize,
  avatarCenterX,
  avatarCenterY,
  colorScheme,
  sunnyBackground,
}: {
  avatarSize: number;
  avatarCenterX: number;
  avatarCenterY: number;
  colorScheme: "light" | "dark";
  sunnyBackground: string;
}) {
  const { isTablet } = useLargeDevice();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => handle.cancel();
  }, []);

  const dots = useMemo(() => {
    const numDots = isTablet ? 55 : 40;
    const padding = 20;

    return Array.from({ length: numDots }, (_, i) => {
      let x: number, y: number;

      if (i < numDots * 0.4) {
        const minRadius = avatarSize / 2 + 20;
        const maxRadius = Math.min(SW, SH) * 0.42;
        const angle = Math.random() * 2 * Math.PI;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        x = avatarCenterX + Math.cos(angle) * radius;
        y = avatarCenterY + Math.sin(angle) * radius;
      } else {
        x = padding + Math.random() * (SW - padding * 2);
        y = padding + Math.random() * (SH - padding * 2);
      }

      x = Math.max(padding, Math.min(SW - padding, x));
      y = Math.max(padding, Math.min(SH - padding, y));

      const size = 2 + Math.random() * 2;
      const delay = Math.random() * 2000;
      const duration = 2500 + Math.random() * 1500;

      return { x, y, size, delay, duration, id: i };
    });
  }, [avatarSize, avatarCenterX, avatarCenterY, isTablet]);

  if (!isReady) return null;

  return (
    <>
      {dots.map((dot) => (
        <SparkledDot
          key={dot.id}
          x={dot.x}
          y={dot.y}
          size={dot.size}
          delay={dot.delay}
          duration={dot.duration}
          colorScheme={colorScheme}
          sunnyBackground={sunnyBackground}
        />
      ))}
    </>
  );
});

const SparkledDot = React.memo(function SparkledDot({
  x,
  y,
  size,
  delay,
  duration,
  colorScheme,
  sunnyBackground,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  colorScheme: "light" | "dark";
  sunnyBackground: string;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 }),
    );

    opacity.value = withDelay(
      delay,
      withTiming(
        0.7,
        { duration: 600, easing: Easing.out(Easing.ease) },
        (finished) => {
          if (finished) {
            opacity.value = withRepeat(
              withTiming(0.4, { duration, easing: Easing.inOut(Easing.ease) }),
              -1,
              true,
            );
          }
        },
      ),
    );
  }, [delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowColor =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.65)"
      : (() => {
          const r = parseInt(sunnyBackground.slice(1, 3), 16);
          const g = parseInt(sunnyBackground.slice(3, 5), 16);
          const b = parseInt(sunnyBackground.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, 0.55)`;
        })();

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: glowColor,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: size * 2,
          elevation: 6,
          zIndex: 2,
        },
        animatedStyle,
      ]}
    />
  );
});

// ───────────────────── Rising sun bubbles (background decoration during congrats intro) ─────────────────────
// Timeline: sun fills 0–3500ms, then shrinks. Suns rise once (bottom→top) during fill phase, fade out on shrink.

const RisingSunBubble = React.memo(function RisingSunBubble({
  left,
  sunSize,
  maxOpacity,
  delay,
  duration,
  text,
  color,
  fadeOut,
}: {
  left: number;
  sunSize: number;
  maxOpacity: number;
  delay: number;
  duration: number;
  text: string;
  color: string;
  fadeOut: SharedValue<number>;
}) {
  // translateY goes from 0 (at SH, off-screen bottom) to -(SH + sunSize) (past top)
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(-(SH + sunSize), { duration, easing: Easing.linear }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Progress 0 = at bottom (top: SH), 1 = past top. translateY ranges 0 → -(SH + sunSize)
    const progress = -translateY.value / (SH + sunSize);
    // Fade as it nears the top: full opacity in bottom 60%, fade to 0 in top 40%
    const posOpacity = progress < 0.6 ? 1 : (1 - progress) / 0.4;
    const finalOpacity = maxOpacity * Math.max(0, posOpacity) * fadeOut.value;
    return {
      opacity: finalOpacity,
      transform: [{ translateY: translateY.value }],
    };
  });

  const paddingH = (sunSize / 160) * 48 * 0.6;
  const paddingV = (sunSize / 160) * 48 * 0.4;
  const fontSize = 12 * (sunSize / 160);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left,
          top: SH,
          width: sunSize,
          height: sunSize,
          zIndex: 5,
          shadowColor: color,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.28,
          shadowRadius: 4,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: sunSize,
          height: sunSize,
          borderRadius: sunSize / 2,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[color, `${color}ee`]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: paddingH,
            paddingVertical: paddingV,
          }}
        >
          <ThemedText
            style={{
              color: "black",
              fontSize,
              textAlign: "center",
              fontWeight: "700",
            }}
            numberOfLines={3}
          >
            {text.split("\n")[0] || text}
          </ThemedText>
          {text.includes("\n") && (
            <ThemedText
              style={{
                color: "black",
                fontSize: fontSize * 0.6,
                textAlign: "center",
                fontWeight: "600",
                maxWidth: (sunSize / 160) * 48 * 1.6,
              }}
              numberOfLines={2}
            >
              {text.split("\n")[1]}
            </ThemedText>
          )}
        </LinearGradient>
      </View>
    </Animated.View>
  );
});

const RisingSunsBackground = React.memo(function RisingSunsBackground({
  sunnyFacts,
  fadeOut,
}: {
  sunnyFacts: { id: string; text: string }[];
  fadeOut: SharedValue<number>;
}) {
  const { momentColors } = useMomentColors();
  const color = momentColors.sunny.background;

  const suns = useMemo(() => {
    if (sunnyFacts.length === 0) return [];

    const shuffled = [...sunnyFacts].sort(() => Math.random() - 0.5);
    const minSize = 70;
    const maxSize = 160;
    const gap = 12;
    // Use the max size for column layout so large suns don't overflow into adjacent columns
    const colWidth = maxSize + gap;
    const cols = Math.floor(SW / colWidth);
    // Shuffle column indices so assignment order is random
    const colIndices = Array.from({ length: cols }, (_, i) => i).sort(() => Math.random() - 0.5);

    return Array.from({ length: RISING_SUN_COUNT }, (_, i) => {
      const fact = shuffled[i % shuffled.length];
      const sunSize = Math.round(minSize + Math.random() * (maxSize - minSize));
      // Assign a column, wrapping if RISING_SUN_COUNT > cols
      const col = colIndices[i % colIndices.length];
      // Jitter within the column so suns don't form a rigid grid
      const jitter = Math.random() * (colWidth - sunSize);
      const left = col * colWidth + jitter;
      const delay = Math.round(Math.random() * 2500);
      const duration = 3500 - delay;
      return {
        id: `${fact.id}-${i}`,
        text: fact.text,
        left,
        sunSize,
        maxOpacity: 0.25 + Math.random() * 0.2,
        delay,
        duration,
      };
    });
  }, [sunnyFacts]);

  return (
    <>
      {suns.map((s) => (
        <RisingSunBubble
          key={s.id}
          left={s.left}
          sunSize={s.sunSize}
          maxOpacity={s.maxOpacity}
          delay={s.delay}
          duration={s.duration}
          text={s.text}
          color={color}
          fadeOut={fadeOut}
        />
      ))}
    </>
  );
});

// ───────────────────── Entity avatar ring (same glow blur as classic FloatingEntity) ─────────────────────

const EntityRing = React.memo(function EntityRing({
  uris,
  entityIds,
  entityNames,
  entityMemories,
  onEntitySelect,
  sphere,
  centerX,
  centerY,
  orbitRadius,
  avatarSize,
  glowColor,
  isFocused = false,
  showFloatingMoments = false,
  rotateOrbit = false,
  orbitDurationMs = DEFAULT_ENTITY_ORBIT_DURATION_MS,
  randomPulseIndex = null,
}: {
  uris: string[];
  entityIds: string[];
  entityNames: string[];
  entityMemories: IdealizedMemory[][];
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
  sphere: LifeSphere;
  centerX: number;
  centerY: number;
  orbitRadius: number;
  avatarSize: number;
  glowColor: string;
  isFocused?: boolean;
  showFloatingMoments?: boolean;
  rotateOrbit?: boolean;
  orbitDurationMs?: number;
  randomPulseIndex?: number | null;
}) {
  const { isTablet } = useLargeDevice();
  const orbitAngle = useSharedValue(0);

  useEffect(() => {
    if (!rotateOrbit) {
      cancelAnimation(orbitAngle);
      return;
    }
    orbitAngle.value = 0;
    orbitAngle.value = withRepeat(
      withTiming(2 * Math.PI, {
        duration: orbitDurationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(orbitAngle);
    };
  }, [rotateOrbit, orbitAngle, orbitDurationMs]);

  if (entityIds.length === 0) return null;
  const count = Math.min(entityIds.length, 8);
  const borderWidth = isTablet ? 3 : 2;

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const baseAngle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const uri = uris[i] ?? "";
        const memories = entityMemories[i] ?? [];
        const entityId = entityIds[i] ?? "";
        const entityName = entityNames[i] ?? "";
        return (
          <OrbitingEntity
            key={`${entityId}-${i}`}
            uri={uri}
            entityId={entityId}
            entityName={entityName}
            index={i}
            count={count}
            baseAngle={baseAngle}
            centerX={centerX}
            centerY={centerY}
            orbitRadius={orbitRadius}
            avatarSize={avatarSize}
            borderWidth={borderWidth}
            glowColor={glowColor}
            isFocused={isFocused}
            isTablet={isTablet}
            showFloatingMoments={showFloatingMoments}
            entityMemories={memories}
            onEntitySelect={onEntitySelect}
            sphere={sphere}
            orbitAngle={orbitAngle}
            rotateOrbit={rotateOrbit}
            shouldDoRandomPulse={randomPulseIndex === i}
          />
        );
      })}
    </>
  );
});

const OrbitingEntity = React.memo(function OrbitingEntity({
  uri,
  entityId,
  entityName,
  index,
  count,
  baseAngle,
  centerX,
  centerY,
  orbitRadius,
  avatarSize,
  borderWidth,
  glowColor,
  isFocused,
  isTablet,
  showFloatingMoments,
  entityMemories,
  onEntitySelect,
  sphere,
  orbitAngle,
  rotateOrbit,
  shouldDoRandomPulse,
}: {
  uri: string;
  entityId: string;
  entityName: string;
  index: number;
  count: number;
  baseAngle: number;
  centerX: number;
  centerY: number;
  orbitRadius: number;
  avatarSize: number;
  borderWidth: number;
  glowColor: string;
  isFocused: boolean;
  isTablet: boolean;
  showFloatingMoments: boolean;
  entityMemories: IdealizedMemory[];
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
  sphere: LifeSphere;
  orbitAngle: SharedValue<number>;
  rotateOrbit: boolean;
  shouldDoRandomPulse: boolean;
}) {
  const scale = useSharedValue(1);


  // One-shot pulse when this entity is randomly chosen for periodic pulse
  useEffect(() => {
    if (shouldDoRandomPulse) {
      cancelAnimation(scale);
      scale.value = withSequence(
        withSpring(1.1, { damping: 12, stiffness: 150 }),
        withSpring(1, { damping: 12, stiffness: 150 }),
      );
    }
  }, [shouldDoRandomPulse, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    // Always use orbitAngle.value: when orbit stops, it retains last value so entity stays in place
    const angle = baseAngle + orbitAngle.value;
    const x = centerX + Math.cos(angle) * orbitRadius - avatarSize / 2;
    const y = centerY + Math.sin(angle) * orbitRadius - avatarSize / 2;
    return {
      position: "absolute",
      left: x,
      top: y,
      width: avatarSize,
      height: avatarSize,
      transform: [{ scale: scale.value }],
    };
  });

  const initialLetter = entityName.trim()
    ? entityName.trim()[0].toUpperCase()
    : "?";

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          borderRadius: avatarSize / 2,
          zIndex: 15,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isFocused ? 0.8 : 0.2,
          shadowRadius: isTablet ? 12 : 8,
          elevation: 8,
          opacity: isFocused ? 1 : 0.55,
        },
      ]}
    >
      <Pressable
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
        }}
        onPress={() => {
          if (entityId) {
            // Fast one-shot pulse for tap feedback (orbit keeps rotating)
            cancelAnimation(scale);
            scale.value = withSequence(
              withTiming(1.18, {
                duration: 80,
                easing: Easing.out(Easing.ease),
              }),
              withTiming(1, {
                duration: 100,
                easing: Easing.inOut(Easing.ease),
              }),
            );
            onEntitySelect(entityId, sphere);
          }
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderWidth,
              borderColor: "rgba(255,255,255,0.75)",
            }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderWidth,
              borderColor: "rgba(255,255,255,0.75)",
              backgroundColor: "rgba(128,128,128,0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemedText
              style={{ fontSize: avatarSize * 0.45, fontWeight: "600" }}
            >
              {initialLetter}
            </ThemedText>
          </View>
        )}
        {showFloatingMoments && (
          <SmallFloatingMoments
            entityCenterX={avatarSize / 2}
            entityCenterY={avatarSize / 2}
            entityIndex={index}
            memories={entityMemories}
          />
        )}
      </Pressable>
    </Animated.View>
  );
});

// ───────────────────── Cosmic pulse rings (radiate outward from focused sphere) ─────────────────────

const CosmicRing = React.memo(function CosmicRing({
  delay,
  color,
  left,
  top,
  size,
  enabled,
}: {
  delay: number;
  color: string;
  left: number;
  top: number;
  size: number;
  enabled: boolean;
}) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      ringScale.value = 1;
      ringOpacity.value = 0;
      return;
    }
    ringScale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.9, {
            duration: 4500,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          }),
        ),
        -1,
        false,
      ),
    );
    ringOpacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.1, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 3900, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      ringScale.value = 1;
      ringOpacity.value = 0;
    };
  }, [enabled, delay, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const staticStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left,
      top,
      width: size,
      height: size,
      borderRadius: 1000,
      borderWidth: 1,
      borderColor: color,
      backgroundColor: "transparent",
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 0,
      zIndex: 5,
    }),
    [left, top, size, color],
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[staticStyle, ringStyle]}
    />
  );
});

const CosmicPulseRings = React.memo(function CosmicPulseRings({
  color,
  offsetX,
  offsetY,
  sphereSize,
  enabled,
}: {
  color: string;
  offsetX: number;
  offsetY: number;
  sphereSize: number;
  enabled: boolean;
}) {
  const left = offsetX - sphereSize / 2;
  const top = offsetY - sphereSize / 2;
  return (
    <>
      <CosmicRing delay={0} color={color} left={left} top={top} size={sphereSize} enabled={enabled} />
      <CosmicRing delay={1500} color={color} left={left} top={top} size={sphereSize} enabled={enabled} />
      <CosmicRing delay={3000} color={color} left={left} top={top} size={sphereSize} enabled={enabled} />
    </>
  );
});

// ───────────────────── Animated sphere (orbital transition: spheres slide along orbit like beads on a string) ─────────────────────

const SPHERE_CONTAINER_SIZE = 320; // Fits orbit extent
const ORBIT_SPRING_CONFIG = { damping: 22, stiffness: 180 };

const RANDOM_ENTITY_PULSE_INTERVAL_MS = 4200;

const AnimatedSphere = React.memo(function AnimatedSphere({
  sphereIdx,
  sphere,
  focusedIdx,
  entityUris,
  entityIds,
  entityNames,
  entityMemories,
  onPress,
  onEntitySelect,
  onPulse,
  colorScheme,
  sunnyPercentage,
  orbitDurationMs = DEFAULT_ENTITY_ORBIT_DURATION_MS,
  singleTapWhenFocused = false,
  sunExpanded,
  isInitialView = false,
  sunLoadProgress,
  sunLoadSweepOffset,
  sphereIntroStaggerMs = 0,
  isSunMenuOpen = false,
}: {
  sphereIdx: number;
  sphere: { type: LifeSphere; icon: string };
  focusedIdx: number;
  entityUris: string[];
  entityIds: string[];
  entityNames: string[];
  entityMemories: IdealizedMemory[][];
  onPress: () => void;
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
  onPulse?: (trigger: () => void) => void;
  colorScheme: "light" | "dark";
  sunnyPercentage: number;
  orbitDurationMs?: number;
  singleTapWhenFocused?: boolean;
  sunExpanded: SharedValue<number>;
  isInitialView?: boolean;
  sunLoadProgress?: SharedValue<number>;
  sunLoadSweepOffset?: SharedValue<number>;
  sphereIntroStaggerMs?: number;
  /** When sun menu is expanded: hide spheres completely and block taps. */
  isSunMenuOpen?: boolean;
}) {
  const { isTablet } = useLargeDevice();
  const target = getSphereTarget(sphereIdx, focusedIdx);
  const isFocused = sphereIdx === focusedIdx;

  const [randomPulseIndex, setRandomPulseIndex] = useState<number | null>(null);

  // Periodically pick a random entity to pulse (only when focused)
  const entityCount = Math.min(entityIds.length, 8);
  useEffect(() => {
    if (!isFocused || entityCount === 0) {
      setRandomPulseIndex(null);
      return;
    }
    const id = setInterval(() => {
      setRandomPulseIndex(Math.floor(Math.random() * entityCount));
    }, RANDOM_ENTITY_PULSE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isFocused, entityCount]);

  const angle = useSharedValue(target.angle);
  const size = useSharedValue(target.size);
  const spherePulseScale = useSharedValue(1);
  const lastPressTimeRef = useRef<number>(0);
  const firstTapFeedbackScale = useSharedValue(1);

  // Register pulse trigger with parent so the external tap target can fire it
  const triggerPulse = useCallback(() => {
    cancelAnimation(firstTapFeedbackScale);
    firstTapFeedbackScale.value = 1;
    firstTapFeedbackScale.value = withSequence(
      withSpring(1.06, { damping: 10, stiffness: 350 }),
      withSpring(1.0, { damping: 12, stiffness: 200 }),
    );
  }, [firstTapFeedbackScale]);

  useEffect(() => {
    if (isFocused) onPulse?.(triggerPulse);
  }, [isFocused, onPulse, triggerPulse]);

  // Pulse animation for focused sphere — every 7s, subtle (offset so it doesn't sync with circle avatar)
  useEffect(() => {
    if (isFocused) {
      spherePulseScale.value = 1;
      spherePulseScale.value = withDelay(
        7000,
        withRepeat(
          withSequence(
            withSpring(1.04, { damping: 12, stiffness: 80 }),
            withSpring(1, { damping: 12, stiffness: 100 }),
            withDelay(7000, withTiming(1, { duration: 0 })),
          ),
          -1,
          false,
        ),
      );
      return () => {
        cancelAnimation(spherePulseScale);
        spherePulseScale.value = 1;
      };
    } else {
      cancelAnimation(spherePulseScale);
      spherePulseScale.value = 1;
    }
  }, [isFocused, spherePulseScale]);

  // Reset double-tap state when this sphere comes into focus (e.g. tapped from unfocused)
  // so the focusing tap doesn't accidentally count as the first tap of a double-tap sequence.
  useEffect(() => {
    if (isFocused) {
      lastPressTimeRef.current = 0;
    }
  }, [isFocused]);

  const handleSpherePress = useCallback(() => {
    if (!isFocused) { onPress(); return; }
    if (singleTapWhenFocused) { onPress(); return; }
    const now = Date.now();
    const elapsed = now - lastPressTimeRef.current;
    if (elapsed < 350 && elapsed > 0) {
      lastPressTimeRef.current = 0;
      onPress();
    } else {
      lastPressTimeRef.current = now;
      cancelAnimation(firstTapFeedbackScale);
      firstTapFeedbackScale.value = 1;
      firstTapFeedbackScale.value = withSequence(
        withSpring(1.06, { damping: 10, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 200 }),
      );
    }
  }, [isFocused, singleTapWhenFocused, onPress, firstTapFeedbackScale]);

  const handleEntitySelect = useCallback(
    (entityId: string, sphere: LifeSphere) => {
      onEntitySelect(entityId, sphere);
    },
    [onEntitySelect],
  );

  useEffect(() => {
    const next = getSphereTarget(sphereIdx, focusedIdx);
    // Normalize current angle to [0, 360) to avoid drift after many cycles
    const raw = angle.value;
    const normalized = ((raw % 360) + 360) % 360;
    let delta = next.angle - normalized;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    const targetAngle = raw + delta;
    angle.value = withSpring(targetAngle, ORBIT_SPRING_CONFIG, (finished) => {
      "worklet";
      if (finished) {
        const v = angle.value;
        angle.value = ((v % 360) + 360) % 360;
      }
    });
    size.value = withSpring(next.size, ORBIT_SPRING_CONFIG);
  }, [sphereIdx, focusedIdx]);

  const CONTAINER_HALF = SPHERE_CONTAINER_SIZE / 2;
  const slot = (sphereIdx - focusedIdx + 5) % 5;

  const containerStyle = useAnimatedStyle(() => {
    const totalAngle = angle.value;
    const rad = (totalAngle * Math.PI) / 180;
    const centerX = ORBIT_CX + ORBIT_R * Math.sin(rad);
    const centerY = ORBIT_CY + ORBIT_R * Math.cos(rad);
    // Depth from actual position on orbit (angle), not from slot — avoids "grow then move" pop on swipe
    // cos(rad)=1 at bottom (front), -1 at top (back). Smooth scale as spheres slide along orbit.
    const x = (1 + Math.cos(rad)) / 2;
    const depthScale = 0.38 + 0.62 * Math.sqrt(Math.max(0, x));
    // Shift back-half spheres up so they feel further away (behind circle avatar)
    const backOffsetY = slot === 0 ? 0 : Math.cos(rad) < 0 ? -48 : 0;
    // Unfocused spheres: shift up; focused stays put
    const unfocusedOffsetY = slot === 0 ? 0 : -28;
    // Right-side spheres (slots 1 & 2) sit higher so they don't align in a flat row
    const rightSideOffsetY = slot === 1 || slot === 2 ? -22 : 0;
    // Extra lift for the sphere below-right of the avatar (slot 1) so it sits slightly higher
    const rightBelowExtraOffsetY = slot === 1 ? -8 : 0;
    // Top pair above the Sunny Life circle (slots 2 & 3) sit a bit lower so they are closer to the avatar
    const topPairOffsetY = slot === 2 || slot === 3 ? 10 : 0;
    // Top-left (slot 3) sfera specifically — lower so it sits better above the circle avatar
    const topLeftExtraOffsetY = slot === 3 ? 18 : 0;
    // When sun menu is open: scale to 0 and fully hide (0.94 left ~6% visible — too noticeable)
    const sunShrink = 1 - sunExpanded.value;
    // Sphere + entity reveal during SunLoadAnimation: scale 0→1 and fade in together
    const introProgress = sunLoadProgress
      ? Math.min(1, Math.max(0, (sunLoadProgress.value - sphereIntroStaggerMs) / 400))
      : 1;
    const introScale = introProgress;
    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: SPHERE_CONTAINER_SIZE,
      height: SPHERE_CONTAINER_SIZE,
      opacity: introProgress * (1 - sunExpanded.value),
      transform: [
        { translateX: centerX - CONTAINER_HALF },
        {
          translateY:
            centerY -
            CONTAINER_HALF +
            backOffsetY +
            unfocusedOffsetY +
            rightSideOffsetY +
            rightBelowExtraOffsetY +
            topPairOffsetY +
            topLeftExtraOffsetY,
        },
        { scale: depthScale * sunShrink * introScale },
      ],
    };
  });

  const gradient3D = getSphere3DGradientColors(
    sphere.type,
    sunnyPercentage,
    colorScheme,
  );
  const iconColor = getSphereIconColor(
    sphere.type,
    colorScheme,
    sunnyPercentage,
  );
  const shadowColor = getSphereShadowColor(sphere.type, colorScheme);
  const depthScale = getEntityDepthScale(slot);
  const baseEntityAvatarSize = isFocused
    ? 40
    : Math.max(22, Math.round(target.size * 0.3));
  const entityAvatarSize = isFocused
    ? baseEntityAvatarSize
    : Math.max(10, Math.round(baseEntityAvatarSize * depthScale));
  // Keep orbit radius unscaled by depth so entities stay in a ring *around* the sfera, not on top of it
  const orbitRadius =
    target.size / 2 + entityAvatarSize / 2 + (isFocused ? 8 : 6);

  const sphereStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: CONTAINER_HALF - size.value / 2,
    top: CONTAINER_HALF - size.value / 2,
    width: size.value,
    height: size.value,
    transform: [{ scale: spherePulseScale.value * firstTapFeedbackScale.value }],
  }));

  const entityRingStyle = useAnimatedStyle(() => {
    const introProgress = sunLoadProgress
      ? Math.min(1, Math.max(0, (sunLoadProgress.value - sphereIntroStaggerMs) / 400))
      : 1;
    return { opacity: introProgress * (1 - sunExpanded.value) };
  });

  const iconSize = isFocused
    ? FOCUSED_ICON_SIZE
    : Math.round(target.size * 0.5);

  return (
    <Animated.View
      style={containerStyle}
      pointerEvents={isSunMenuOpen ? "none" : "auto"}
    >
      {/* Tight tap target for unfocused spheres — sits over the visual only, avoids stomping on focused sphere taps */}
      {!isFocused && (
        <Pressable
          onPress={handleSpherePress}
          style={{
            position: "absolute",
            left: CONTAINER_HALF - target.size / 2,
            top: CONTAINER_HALF - target.size / 2,
            width: target.size,
            height: target.size,
            borderRadius: target.size / 2,
            zIndex: 11,
          }}
        />
      )}
      <Pressable
        onPress={isFocused ? handleSpherePress : undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SPHERE_CONTAINER_SIZE,
          height: SPHERE_CONTAINER_SIZE,
          zIndex: isFocused ? 12 : 10,
          opacity: isFocused ? 1 : isInitialView ? 0.55 : 0.8,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            sphereStyle,
            {
              borderRadius: 1000,
              overflow: "visible",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: isFocused && colorScheme === "dark"
                ? SPHERE_NEON[sphere.type].glow
                : colorScheme === "dark" ? shadowColor : "#000",
              shadowOffset: isFocused && colorScheme === "dark"
                ? { width: 0, height: 0 }
                : { width: 0, height: isTablet ? 4 : 3 },
              shadowOpacity: isFocused && colorScheme === "dark" ? 0.75 : colorScheme === "dark" ? 0.5 : 0.25,
              shadowRadius: isFocused && colorScheme === "dark"
                ? (isTablet ? 28 : 22)
                : isTablet ? 16 : 12,
              elevation: 10,
            },
          ]}
        >
          {isFocused && colorScheme === "dark" ? (
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              style={{ position: "absolute" }}
              pointerEvents="none"
            >
              <Defs>
                {/* Atmospheric rim: transparent center → neon color at rim */}
                <RadialGradient
                  id={`neon-atmo-${sphere.type}-${sphereIdx}`}
                  cx="50" cy="50" r="50"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%"   stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0" />
                  <Stop offset="55%"  stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0" />
                  <Stop offset="76%"  stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0.12" />
                  <Stop offset="90%"  stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0.50" />
                  <Stop offset="100%" stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0.80" />
                </RadialGradient>
                {/* Inner deep-space shadow */}
                <RadialGradient
                  id={`neon-inner-${sphere.type}-${sphereIdx}`}
                  cx="50" cy="50" r="44"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%"   stopColor="#080C14" stopOpacity="0.65" />
                  <Stop offset="65%"  stopColor="#080C14" stopOpacity="0.30" />
                  <Stop offset="100%" stopColor="#080C14" stopOpacity="0" />
                </RadialGradient>
                {/* White rim sparkle */}
                <RadialGradient
                  id={`neon-rim-${sphere.type}-${sphereIdx}`}
                  cx="50" cy="50" r="50"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="84%"  stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="94%"  stopColor="#FFFFFF" stopOpacity="0.18" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.45" />
                </RadialGradient>
              </Defs>
              {/* Faint tinted fill so the center isn't fully black */}
              <SvgCircle cx="50" cy="50" r="50" fill={SPHERE_NEON[sphere.type].core} fillOpacity={0.05} />
              <SvgCircle cx="50" cy="50" r="50" fill={`url(#neon-atmo-${sphere.type}-${sphereIdx})`} />
              <SvgCircle cx="50" cy="50" r="50" fill={`url(#neon-inner-${sphere.type}-${sphereIdx})`} />
              <SvgCircle cx="50" cy="50" r="50" fill={`url(#neon-rim-${sphere.type}-${sphereIdx})`} />
            </Svg>
          ) : (
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              style={{ position: "absolute" }}
              pointerEvents="none"
            >
              <Defs>
                <RadialGradient
                  id={`sphere3d-${sphere.type}-${sphereIdx}`}
                  cx="50"
                  cy="50"
                  r="50"
                  fx="32"
                  fy="32"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop
                    offset="0%"
                    stopColor={gradient3D.highlight}
                    stopOpacity="1"
                  />
                  <Stop
                    offset="38%"
                    stopColor={gradient3D.base}
                    stopOpacity="1"
                  />
                  <Stop
                    offset="100%"
                    stopColor={gradient3D.shadow}
                    stopOpacity="1"
                  />
                </RadialGradient>
              </Defs>
              <SvgCircle
                cx="50"
                cy="50"
                r="50"
                fill={`url(#sphere3d-${sphere.type}-${sphereIdx})`}
              />
            </Svg>
          )}
          {/* Specular highlight - bright ellipse top-left for glossy 3D effect */}
          {!(isFocused && colorScheme === "dark") && (
            <View
              style={{
                position: "absolute",
                left: "18%",
                top: "18%",
                width: "28%",
                height: "28%",
                borderRadius: 100,
                backgroundColor: "rgba(255,255,255,0.45)",
              }}
            />
          )}
          {/* Desaturation overlay for unfocused spheres — washes out color to grey */}
          {!isFocused && (
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                borderRadius: 1000,
                backgroundColor: "rgba(20,26,46,0.65)",
              }}
            />
          )}
          <MaterialIcons
            name={sphere.icon as any}
            size={iconSize}
            color={isFocused && colorScheme === "dark" ? SPHERE_NEON[sphere.type].core : iconColor}
            style={{ position: "absolute", zIndex: 1, pointerEvents: "none", opacity: isFocused ? 1 : 0.6 }}
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: SPHERE_CONTAINER_SIZE,
              height: SPHERE_CONTAINER_SIZE,
              pointerEvents: "box-none",
            },
            entityRingStyle,
          ]}
        >
          <EntityRing
            uris={entityUris}
            entityIds={entityIds}
            entityNames={entityNames}
            entityMemories={entityMemories}
            onEntitySelect={handleEntitySelect}
            sphere={sphere.type}
            centerX={CONTAINER_HALF}
            centerY={CONTAINER_HALF}
            orbitRadius={orbitRadius}
            avatarSize={entityAvatarSize}
            glowColor={shadowColor}
            isFocused={isFocused}
            showFloatingMoments={isFocused}
            rotateOrbit={isFocused}
            orbitDurationMs={orbitDurationMs}
            randomPulseIndex={randomPulseIndex}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ───────────────── Overall Percentage Avatar (same as classic view) ──────────────────

const BADGE_GRADIENT_DARK = [
  "#080C14",
  "#0D121A",
  "#121820",
  "#1A2332",
  "#1F2A3A",
  "#243041",
  "#2A3545",
  "#2F3A4A",
  "#344050",
] as const;
const BADGE_GRADIENT_LIGHT = [
  "#858585",
  "#909090",
  "#9B9B9B",
  "#B0B0B0",
  "#C5C5C5",
  "#D0D0D0",
  "#DBDBDB",
  "#E5E5E5",
  "#F0F0F0",
] as const;

// Cosmic avatar palette: nebula-inspired cyan → purple
const COSMIC_RING_START = "#5CE1E6"; // soft cyan
const COSMIC_RING_MID = "#9D7BDB"; // lavender
const COSMIC_RING_END = "#7B68EE"; // medium slate blue
const COSMIC_TEXT = "#B8E8EC"; // soft cyan-white for percentage & label
const COSMIC_TRACK = "#0D1525"; // dark cosmic blue (progress track)
const COSMIC_INNER_DARK = [
  "#0A0E1A",
  "#0F1422",
  "#151C2E",
  "#1A2440",
  "#1E2A4A",
] as const; // deep space fill
const COSMIC_INNER_LIGHT = [
  "#2A2A3A",
  "#3A3A4E",
  "#4A4A62",
  "#5A5A76",
  "#6A6A8A",
] as const; // light theme cosmic

// Constellation: star positions (normalized 0–1) and line pairs (indices into AVATAR_STARS)
const AVATAR_STARS = [
  { x: 0.82, y: 0.5 },
  { x: 0.726, y: 0.726 },
  { x: 0.5, y: 0.82 },
  { x: 0.274, y: 0.726 },
  { x: 0.18, y: 0.5 },
  { x: 0.274, y: 0.274 },
  { x: 0.5, y: 0.18 },
  { x: 0.726, y: 0.274 },
  { x: 0.62, y: 0.38 },
  { x: 0.38, y: 0.62 },
  { x: 0.38, y: 0.38 },
  { x: 0.62, y: 0.62 },
] as const;
const AVATAR_CONSTELLATION_LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 0],
  [8, 9],
  [10, 11],
];
const AVATAR_STAR_COLOR = "rgba(184, 232, 236, 0.35)";
const AVATAR_LINE_COLOR = "rgba(184, 232, 236, 0.12)";

function blendHex(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const a = parse(hex1);
  const b = parse(hex2);
  const r = Math.round(a.r * (1 - t) + b.r * t);
  const g = Math.round(a.g * (1 - t) + b.g * t);
  const b_ = Math.round(a.b * (1 - t) + b.b * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b_.toString(16).padStart(2, "0")}`;
}

/** Hex to RGB 0–1 for FeColorMatrix (glow uses theme primary from personalization) */
function hexToRgbNorm(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

// ─── Cosmic universe icon: nebula core + two tilted elliptical orbits + 3 glowing orbs ───
const WheelOfLifeIcon = React.memo(function WheelOfLifeIcon({ size }: { size: number }) {
  const { momentColors } = useMomentColors();

  // Four orbs orbit at different speeds and on different axes
  const angle0 = useSharedValue(0);
  const angle1 = useSharedValue((2 * Math.PI) / 3);
  const angle2 = useSharedValue((4 * Math.PI) / 3);
  const angle3 = useSharedValue(Math.PI / 4);

  useEffect(() => {
    const dur = 3200;
    angle0.value = withRepeat(withTiming(angle0.value + 2 * Math.PI, { duration: dur, easing: Easing.linear }), -1, false);
    angle1.value = withRepeat(withTiming(angle1.value + 2 * Math.PI, { duration: dur * 1.35, easing: Easing.linear }), -1, false);
    angle2.value = withRepeat(withTiming(angle2.value + 2 * Math.PI, { duration: dur * 0.8, easing: Easing.linear }), -1, false);
    angle3.value = withRepeat(withTiming(angle3.value + 2 * Math.PI, { duration: dur * 1.7, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(angle0);
      cancelAnimation(angle1);
      cancelAnimation(angle2);
      cancelAnimation(angle3);
    };
  }, [angle0, angle1, angle2, angle3]);

  const C = size / 2;
  // Elliptical orbit radii — orbit 0 is wider/flat, orbit 1 is tilted
  const RX0 = size * 0.41;
  const RY0 = size * 0.18;
  const RX1 = size * 0.32;
  const RY1 = size * 0.41;
  const TILT1 = Math.PI / 5; // 36° tilt for second orbit
  // Orbit 3: smaller tilted ellipse at ~-60° tilt
  const RX3 = size * 0.38;
  const RY3 = size * 0.14;
  const TILT3 = -Math.PI / 3;
  const DOT_R = size * 0.09;

  const sunColor = momentColors.sunny.background;
  const cloudColor = momentColors.cloudy.background;
  const lessonColor = momentColors.lesson.background;

  // Orb 0 on flat ellipse
  const orb0Style = useAnimatedStyle(() => {
    const a = angle0.value;
    return {
      position: "absolute" as const,
      left: C + Math.cos(a) * RX0 - DOT_R,
      top: C + Math.sin(a) * RY0 - DOT_R,
      width: DOT_R * 2,
      height: DOT_R * 2,
      borderRadius: DOT_R,
    };
  });

  // Orb 1 on tilted ellipse
  const orb1Style = useAnimatedStyle(() => {
    const a = angle1.value;
    const ex = Math.cos(a) * RX1;
    const ey = Math.sin(a) * RY1;
    // Apply tilt rotation
    return {
      position: "absolute" as const,
      left: C + ex * Math.cos(TILT1) - ey * Math.sin(TILT1) - DOT_R,
      top: C + ex * Math.sin(TILT1) + ey * Math.cos(TILT1) - DOT_R,
      width: DOT_R * 2,
      height: DOT_R * 2,
      borderRadius: DOT_R,
    };
  });

  // Orb 2 on second tilted ellipse (opposite tilt)
  const orb2Style = useAnimatedStyle(() => {
    const a = angle2.value;
    const ex = Math.cos(a) * RX1;
    const ey = Math.sin(a) * RY1;
    const tilt = -TILT1;
    return {
      position: "absolute" as const,
      left: C + ex * Math.cos(tilt) - ey * Math.sin(tilt) - DOT_R,
      top: C + ex * Math.sin(tilt) + ey * Math.cos(tilt) - DOT_R,
      width: DOT_R * 2,
      height: DOT_R * 2,
      borderRadius: DOT_R,
    };
  });

  // Orb 3 on a shallow tilted ellipse
  const orb3Style = useAnimatedStyle(() => {
    const a = angle3.value;
    const ex = Math.cos(a) * RX3;
    const ey = Math.sin(a) * RY3;
    return {
      position: "absolute" as const,
      left: C + ex * Math.cos(TILT3) - ey * Math.sin(TILT3) - DOT_R,
      top: C + ex * Math.sin(TILT3) + ey * Math.cos(TILT3) - DOT_R,
      width: DOT_R * 2,
      height: DOT_R * 2,
      borderRadius: DOT_R,
    };
  });

  // Fixed star positions inside the disc
  const STARS = useMemo(() => [
    { x: C * 0.55, y: C * 0.60 }, { x: C * 1.45, y: C * 0.72 },
    { x: C * 0.70, y: C * 1.38 }, { x: C * 1.30, y: C * 1.42 },
    { x: C * 1.10, y: C * 0.50 }, { x: C * 0.48, y: C * 1.05 },
  ], [C]);

  return (
    <View style={{ width: size, height: size }}>
      {/* Static SVG: nebula core + orbit rings + star dots */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="nebulaCore" cx={`${C}`} cy={`${C}`} r={`${size * 0.22}`} fx={`${C}`} fy={`${C}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#7B68EE" stopOpacity="1" />
            <Stop offset="50%" stopColor="#5CE1E6" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#0D1525" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Outer boundary glow */}
        <SvgCircle cx={C} cy={C} r={C - 0.5} fill="none" stroke="rgba(92,225,230,0.18)" strokeWidth={0.8} />

        {/* Flat elliptical orbit ring */}
        <SvgCircle cx={C} cy={C} r={0} fill="none" />
        <Path
          d={`M ${C - RX0} ${C} A ${RX0} ${RY0} 0 1 1 ${C + RX0} ${C} A ${RX0} ${RY0} 0 1 1 ${C - RX0} ${C} Z`}
          fill="none"
          stroke="rgba(92,225,230,0.2)"
          strokeWidth={0.7}
          strokeDasharray="1.5 2.5"
        />

        {/* Tilted ellipse 1 */}
        <Path
          d={`M ${C + RX1 * Math.cos(TILT1)} ${C + RX1 * Math.sin(TILT1)} A ${RX1} ${RY1} ${(TILT1 * 180) / Math.PI} 1 1 ${C - RX1 * Math.cos(TILT1)} ${C - RX1 * Math.sin(TILT1)} A ${RX1} ${RY1} ${(TILT1 * 180) / Math.PI} 1 1 ${C + RX1 * Math.cos(TILT1)} ${C + RX1 * Math.sin(TILT1)} Z`}
          fill="none"
          stroke="rgba(157,123,219,0.2)"
          strokeWidth={0.7}
          strokeDasharray="1.5 2.5"
        />

        {/* Tilted ellipse 3 (shallow, -60°) */}
        <Path
          d={`M ${C + RX3 * Math.cos(TILT3)} ${C + RX3 * Math.sin(TILT3)} A ${RX3} ${RY3} ${(TILT3 * 180) / Math.PI} 1 1 ${C - RX3 * Math.cos(TILT3)} ${C - RX3 * Math.sin(TILT3)} A ${RX3} ${RY3} ${(TILT3 * 180) / Math.PI} 1 1 ${C + RX3 * Math.cos(TILT3)} ${C + RX3 * Math.sin(TILT3)} Z`}
          fill="none"
          stroke="rgba(92,225,180,0.2)"
          strokeWidth={0.7}
          strokeDasharray="1.5 2.5"
        />

        {/* Nebula core glow */}
        <SvgCircle cx={C} cy={C} r={size * 0.22} fill="url(#nebulaCore)" />

        {/* Bright core */}
        <SvgCircle cx={C} cy={C} r={size * 0.045} fill="#B8E8EC" opacity={0.9} />
        <SvgCircle cx={C} cy={C} r={size * 0.022} fill="#FFFFFF" opacity={1} />

        {/* Star dust */}
        {STARS.map((s, i) => (
          <SvgCircle key={i} cx={s.x} cy={s.y} r={0.8} fill="rgba(255,255,255,0.5)" />
        ))}
      </Svg>

      {/* Animated orbs */}
      <Animated.View pointerEvents="none" style={[orb0Style, { backgroundColor: sunColor, shadowColor: sunColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 3, elevation: 5 }]} />
      <Animated.View pointerEvents="none" style={[orb1Style, { backgroundColor: cloudColor, shadowColor: cloudColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 3, elevation: 5 }]} />
      <Animated.View pointerEvents="none" style={[orb2Style, { backgroundColor: lessonColor, shadowColor: lessonColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 3, elevation: 5 }]} />
      <Animated.View pointerEvents="none" style={[orb3Style, { backgroundColor: sunColor, shadowColor: sunColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 3, elevation: 5 }]} />
    </View>
  );
});

// ─── Universe Scroll Icon: vertical stack of sfera orbs + upward swipe arrow ───
// Distinct from WheelOfLifeIcon (orbital orrery). Communicates "scroll through lessons".
const UniverseScrollIcon = React.memo(function UniverseScrollIcon({ size }: { size: number }) {
  const C = size / 2;
  // Three stacked orbs — relationships (red), career (blue), family (purple)
  const ORB_COLORS = ["#FF8888", "#7BB8FF", "#C088FF"] as const;
  const ORB_R = size * 0.13;
  // Orb vertical positions: top, center, bottom — slightly offset left of center to leave room for arrow
  const ORB_X = C - size * 0.08;
  const ORB_POSITIONS = [C - size * 0.28, C, C + size * 0.28] as const;
  // Connecting dashed line between orbs
  const LINE_X = ORB_X;

  // Floating animation: orbs gently drift up
  const floatY = useSharedValue(0);
  // Arrow pulse
  const arrowOpacity = useSharedValue(0.4);
  const arrowTranslateY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-size * 0.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    arrowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(0.35, { duration: 700, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
    arrowTranslateY.value = withRepeat(
      withSequence(
        withTiming(-size * 0.08, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(floatY);
      cancelAnimation(arrowOpacity);
      cancelAnimation(arrowTranslateY);
    };
  }, [floatY, arrowOpacity, arrowTranslateY, size]);

  const orbsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: arrowOpacity.value,
    transform: [{ translateY: arrowTranslateY.value }],
  }));

  // Arrow chevrons (×2 stacked, pointing up) — right side of orbs
  const ARROW_X = C + size * 0.22;
  const ARROW_Y1 = C + size * 0.06;
  const ARROW_Y2 = C - size * 0.1;
  const ARROW_W = size * 0.14;
  const ARROW_H = size * 0.09;

  return (
    <View style={{ width: size, height: size }}>
      {/* Static: connecting line + subtle outer glow disc */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="usDiscGlow" cx={`${C}`} cy={`${C}`} r={`${C}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#5CE1E6" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#5CE1E6" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <SvgCircle cx={C} cy={C} r={C - 0.5} fill="url(#usDiscGlow)" />
        {/* Dashed connecting line between orb centers */}
        <Line
          x1={LINE_X}
          y1={ORB_POSITIONS[0] + ORB_R + 1}
          x2={LINE_X}
          y2={ORB_POSITIONS[2] - ORB_R - 1}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </Svg>

      {/* Animated: orbs floating */}
      <Animated.View style={[{ position: "absolute", width: size, height: size }, orbsStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            {ORB_COLORS.map((color, i) => (
              <RadialGradient key={i} id={`usOrb${i}`} cx={`${ORB_X - ORB_R * 0.3}`} cy={`${ORB_POSITIONS[i] - ORB_R * 0.3}`} r={`${ORB_R * 1.6}`} gradientUnits="userSpaceOnUse">
                <Stop offset="0%" stopColor={color} stopOpacity="1" />
                <Stop offset="60%" stopColor={color} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.3" />
              </RadialGradient>
            ))}
          </Defs>
          {ORB_COLORS.map((color, i) => (
            <React.Fragment key={i}>
              {/* Glow halo */}
              <SvgCircle cx={ORB_X} cy={ORB_POSITIONS[i]} r={ORB_R * 1.55} fill={color} opacity={0.12} />
              {/* Orb body */}
              <SvgCircle cx={ORB_X} cy={ORB_POSITIONS[i]} r={ORB_R} fill={`url(#usOrb${i})`} />
              {/* Specular highlight */}
              <SvgCircle cx={ORB_X - ORB_R * 0.28} cy={ORB_POSITIONS[i] - ORB_R * 0.3} r={ORB_R * 0.28} fill="#FFFFFF" opacity={0.45} />
            </React.Fragment>
          ))}
        </Svg>
      </Animated.View>

      {/* Animated: upward swipe arrow */}
      <Animated.View style={[{ position: "absolute", width: size, height: size }, arrowStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Two chevron arrows pointing up */}
          <Path
            d={`M ${ARROW_X - ARROW_W} ${ARROW_Y1} L ${ARROW_X} ${ARROW_Y1 - ARROW_H} L ${ARROW_X + ARROW_W} ${ARROW_Y1}`}
            fill="none"
            stroke="rgba(92,225,230,0.9)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={`M ${ARROW_X - ARROW_W} ${ARROW_Y2} L ${ARROW_X} ${ARROW_Y2 - ARROW_H} L ${ARROW_X + ARROW_W} ${ARROW_Y2}`}
            fill="none"
            stroke="rgba(92,225,230,0.55)"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
});


// ───────────────────── Sfera Insight Card ─────────────────────

const INSIGHT_CARD_SIZE = 120;

const SferaInsightCard = React.memo(function SferaInsightCard({
  sphere,
  entityIds,
  entityNames,
  entityMemories,
  onEntitySelect,
  colorScheme,
  shadowColor,
  x,
  y,
}: {
  sphere: LifeSphere;
  entityIds: string[];
  entityNames: string[];
  entityMemories: IdealizedMemory[][];
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
  colorScheme: "light" | "dark";
  shadowColor: string;
  x: number;
  y: number;
}) {
  const t = useTranslate();
  const [mode, setMode] = useState(0);
  const modeOpacity = useSharedValue(1);

  const numEntities = entityIds.length;

  // Compute insight indices
  const leastMemoriesIdx = useMemo(() => {
    if (numEntities === 0) return -1;
    let minCount = Infinity;
    let minIdx = 0;
    entityMemories.forEach((mems, i) => {
      if (mems.length < minCount) {
        minCount = mems.length;
        minIdx = i;
      }
    });
    return minIdx;
  }, [entityMemories, numEntities]);

  const mostMemoriesIdx = useMemo(() => {
    if (numEntities === 0) return -1;
    let maxCount = -1;
    let maxIdx = 0;
    entityMemories.forEach((mems, i) => {
      if (mems.length > maxCount) {
        maxCount = mems.length;
        maxIdx = i;
      }
    });
    return maxIdx;
  }, [entityMemories, numEntities]);

  const lastUpdatedIdx = useMemo(() => {
    if (numEntities === 0) return -1;
    let latestTime = -1;
    let latestIdx = 0;
    entityMemories.forEach((mems, i) => {
      mems.forEach((mem) => {
        const t = new Date(mem.updatedAt).getTime();
        if (t > latestTime) {
          latestTime = t;
          latestIdx = i;
        }
      });
    });
    return latestIdx;
  }, [entityMemories, numEntities]);

  const numModes = numEntities <= 1 ? 1 : 3;

  const cycleMode = useCallback(
    (direction: 1 | -1 = 1) => {
      if (numEntities === 0) return;
      modeOpacity.value = withTiming(0, { duration: 120 }, () => {
        modeOpacity.value = withTiming(1, { duration: 120 });
      });
      setMode((prev) => (prev + direction + numModes) % numModes);
    },
    [modeOpacity, numModes, numEntities],
  );

  const cycleModeRef = useRef(cycleMode);
  cycleModeRef.current = cycleMode;

  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 20) {
          cycleModeRef.current(gestureState.dx < 0 ? 1 : -1);
        }
      },
    }),
  ).current;

  const modeAnimStyle = useAnimatedStyle(() => ({
    opacity: modeOpacity.value,
  }));

  const gradientColors =
    colorScheme === "dark" ? COSMIC_INNER_DARK : COSMIC_INNER_LIGHT;

  const wrapperStyle = {
    position: "absolute" as const,
    left: x - INSIGHT_CARD_SIZE / 2,
    top: y - INSIGHT_CARD_SIZE / 2,
    width: INSIGHT_CARD_SIZE,
    height: INSIGHT_CARD_SIZE,
    zIndex: 25,
  };

  // Empty state
  if (numEntities === 0) {
    return (
      <Pressable style={wrapperStyle}>
        <LinearGradient
          colors={[...gradientColors]}
          style={{
            flex: 1,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: shadowColor + "66",
            justifyContent: "center",
            alignItems: "center",
            padding: 10,
            shadowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <MaterialIcons
            name="add-circle-outline"
            size={28}
            color={shadowColor}
          />
          <ThemedText
            style={{
              color: COSMIC_TEXT,
              fontSize: 10,
              textAlign: "center",
              marginTop: 6,
              opacity: 0.8,
            }}
          >
            {sphere === "hobbies" ? t("sferaInsight.addHobbies") : t("sferaInsight.addPeople")}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    );
  }

  // Insight modes
  const MODES: {
    icon: keyof typeof MaterialIcons.glyphMap;
    idx: number;
    subtext: string;
  }[] = [
    {
      icon: "person-outline",
      idx: leastMemoriesIdx,
      subtext: t("sferaInsight.leastMemories"),
    },
    {
      icon: "star",
      idx: mostMemoriesIdx,
      subtext: t("sferaInsight.mostMemories"),
    },
    {
      icon: "schedule",
      idx: lastUpdatedIdx,
      subtext: t("sferaInsight.lastUpdated"),
    },
  ];

  const currentMode = MODES[mode];
  const entityIdx = currentMode.idx;
  const entityId = entityIds[entityIdx] ?? "";
  const entityName = entityNames[entityIdx] ?? "";

  const handleEntityTap = () => {
    if (entityId) onEntitySelect(entityId, sphere);
  };

  return (
    <Pressable style={wrapperStyle} onPress={handleEntityTap} {...swipePanResponder.panHandlers}>
      <LinearGradient
        colors={[...gradientColors]}
        style={{
          flex: 1,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: shadowColor + "66",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 12,
          paddingBottom: 10,
          shadowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Animated.View
          style={[
            modeAnimStyle,
            { alignItems: "center", flex: 1, justifyContent: "center" },
          ]}
        >
          <MaterialIcons
            name={currentMode.icon}
            size={22}
            color={shadowColor}
          />
          <ThemedText
            style={{
              color: COSMIC_TEXT,
              fontSize: 11,
              fontWeight: "600",
              textAlign: "center",
              marginTop: 5,
            }}
            numberOfLines={1}
          >
            {entityName}
          </ThemedText>
          <ThemedText
            style={{
              color: COSMIC_TEXT,
              fontSize: 9,
              textAlign: "center",
              marginTop: 3,
              opacity: 0.65,
            }}
            numberOfLines={1}
          >
            {currentMode.subtext}
          </ThemedText>
        </Animated.View>

        {/* Mode pagination dots */}
        {numModes > 1 && (
          <Pressable
            onPress={cycleMode}
            hitSlop={8}
            style={{ flexDirection: "row", gap: 4, paddingTop: 4 }}
          >
            {MODES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === mode ? 12 : 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor:
                    i === mode ? shadowColor : shadowColor + "55",
                }}
              />
            ))}
          </Pressable>
        )}
      </LinearGradient>
    </Pressable>
  );
});

// ───────────────────── Main component ─────────────────────

export function FocusedSferaView({
  overallSunnyPercentage,
  hasMemories,
  onAddMemoriesPress,
  onSphereSelect,
  onSwitchToClassic,
  onClearSelection,
  onEntitySelect,
  selectedSphere,
  colorScheme,
  getSphereSunnyPercentage,
  entityImageUrisBySphere,
  entityIdsBySphere,
  entityNamesBySphere,
  memoriesPerEntityBySphere,
  initialFocusedIdx = 0,
  onFocusedSphereChange,
  orbitDurationMs = DEFAULT_ENTITY_ORBIT_DURATION_MS,
  constellationAmount = 10,
  constellationOpacity = 10,
  hidden = false,
  pulsingAnimations = true,
  onInsightsPress,
  onChallengeMePress,
  splashDone = true,
}: FocusedSferaViewProps) {
  const { isTablet } = useLargeDevice();
  const { ensureSubscriptionResolved, refreshCustomerInfo } = useSubscription();
  const { appUsabilityHints, sunnyMomentsCongratsAnimation } = useVisualSettings();
  const focusedSpherePulseRef = useRef<(() => void) | null>(null);
  const focusedSphereTapTimeRef = useRef<number>(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(initialFocusedIdx);
  const N = SPHERE_LIST.length;
  // Keep root aligned with TabScreenContainer; we shift spheres via ORBIT_CY instead.
  const rootMarginTop = 0;

  // Sun expanded state: 0 = collapsed, 1 = expanded (spheres shrink, action buttons appear)
  const sunExpanded = useSharedValue(0);
  const [isSunExpanded, setIsSunExpanded] = useState(false);
  const sunMenuOpacity = useSharedValue(0);
  const sunMenuTranslateY = useSharedValue(20);
  const [universeLessonsVisible, setUniverseLessonsVisible] = useState(false);
  const [universeExamVisible, setUniverseExamVisible] = useState(false);

  // Sun centered state (initial view only): true = floated to screen center
  const [isSunCentered, setIsSunCentered] = useState(false);

  // SunLoadAnimation — plays on first app open when overall sunny % is ≥ 50 and selectedSphere is null.
  // Initial state is "pending" (not complete) so we don't flash the normal view before deciding.
  const sunLoadProgress      = useSharedValue(0);
  const sunLoadSweepOffset   = useSharedValue(0);
  const sunLoadScale         = useSharedValue(1);   // set to 1.5 inside effect if intro plays
  const sunLoadDisplayPct    = useSharedValue(0);
  const risingSunsFadeOut    = useSharedValue(1);   // 1 = visible, fades to 0 when sun starts shrinking
  const congratsOpacity    = useSharedValue(0);
  const [sunLoadComplete, setIntroComplete] = useState(selectedSphere !== null);
  const [sunLoadFireworks, setIntroFireworks] = useState(false);
  const [sunLoadCentered, setIntroCentered] = useState(false); // set to true inside effect if intro plays

  const handleSunPress = useCallback(() => {
    const next = !isSunExpanded;
    setIsSunExpanded(next);
    if (next) {
      sunExpanded.value = withSpring(1, { damping: 14, stiffness: 120 });
      sunMenuOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) });
      sunMenuTranslateY.value = withSpring(0, { damping: 14, stiffness: 180 });
    } else {
      sunExpanded.value = withSpring(0, { damping: 14, stiffness: 120 });
      sunMenuOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
      sunMenuTranslateY.value = withTiming(20, { duration: 200 });
    }
  }, [isSunExpanded, sunExpanded, sunMenuOpacity, sunMenuTranslateY]);

  const sunMenuStyle = useAnimatedStyle(() => ({
    opacity: sunMenuOpacity.value,
    transform: [{ translateY: sunMenuTranslateY.value }],
  }));

  useEffect(() => {
    setFocusedIdx(initialFocusedIdx);
  }, [initialFocusedIdx]);

  // SunLoadAnimation sequence — waits for splash done AND real percentage data (> 0) before deciding.
  const sunLoadStartedRef = useRef(false);
  useEffect(() => {
    if (!splashDone || sunLoadStartedRef.current) return;
    // Wait until data is loaded (percentage > 0 means memories exist and were calculated)
    if (selectedSphere === null && overallSunnyPercentage === 0) return;
    sunLoadStartedRef.current = true;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const run = async () => {
      let shownToday = false;
      if (!__DEV__ && sunnyMomentsCongratsAnimation && selectedSphere === null && overallSunnyPercentage >= 50) {
        const lastShown = await AsyncStorage.getItem(SUN_CONGRATS_LAST_SHOWN_KEY);
        shownToday = lastShown === today;
      }
      const shouldPlayIntro = sunnyMomentsCongratsAnimation && selectedSphere === null && overallSunnyPercentage >= 50 && !shownToday;

      if (!shouldPlayIntro) {
        setIntroComplete(true);
        setIntroCentered(false);
        sunLoadScale.value = 1;
        sunLoadDisplayPct.value = overallSunnyPercentage;
        return;
      }

      // Record today so the animation won't replay again until tomorrow
      await AsyncStorage.setItem(SUN_CONGRATS_LAST_SHOWN_KEY, today);

      // Kick off intro: enlarge sun and center it
      sunLoadScale.value = 1.5;
      setIntroCentered(true);

      // Phase 1 (0–2500ms): count percentage from 0 → actual
      sunLoadDisplayPct.value = withTiming(overallSunnyPercentage, {
        duration: 2500,
        easing: Easing.out(Easing.quad),
      });

      // Phase 2 (2500ms): fireworks burst
      const fireworksTimer = setTimeout(() => {
        runOnJS(setIntroFireworks)(true);
      }, 2500);

      // Congrats text: fade in at 2500ms, fade out at 3400ms
      congratsOpacity.value = withSequence(
        withDelay(2500, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })),
        withDelay(500, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })),
      );

      // Phase 3 (3500ms): sun shrinks to 1×, un-center it; rising suns fade out simultaneously
      sunLoadScale.value = withDelay(3500, withSpring(1.0, { damping: 18, stiffness: 90 }));
      risingSunsFadeOut.value = withDelay(3500, withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) }));
      const uncenterTimer = setTimeout(() => {
        runOnJS(setIntroCentered)(false);
      }, 3500);

      // Phase 4 (4200ms): sferas + entities stagger in together (scale + fade), each from 0→normal size
      // sunLoadProgress goes 0→1400 over 1200ms; each sphere triggers at i*150, reveals over 400ms
      sunLoadProgress.value = withDelay(
        4200,
        withTiming(1400, { duration: 1200, easing: Easing.out(Easing.quad) }, (done) => {
          "worklet";
          if (done) {
            runOnJS(setIntroComplete)(true);
          }
        }),
      );

      return () => {
        clearTimeout(fireworksTimer);
        clearTimeout(uncenterTimer);
      };
    };

    run();
  }, [splashDone, overallSunnyPercentage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset sun centering when leaving initial view
  useEffect(() => {
    if (selectedSphere !== null && sunLoadComplete) {
      setIsSunCentered(false);
      setIntroCentered(false);
    }
  }, [selectedSphere, sunLoadComplete]);

  const goToSphere = useCallback(
    (newIdx: number) => {
      setFocusedIdx(newIdx);
      focusedSphereTapTimeRef.current = 0;
      onFocusedSphereChange?.(newIdx);
    },
    [onFocusedSphereChange],
  );

  // Left/right sfera regions: vertical drag. Right: up = prev, down = next. Left: up = next, down = prev. Center: horizontal swipe.
  const SIDE_REGION_WIDTH = 0.35; // left 35%, right 35%; center 30% uses horizontal
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (!sunLoadComplete) return false;
          const startX = g.moveX - g.dx;
          const inSideRegion =
            startX < SW * SIDE_REGION_WIDTH ||
            startX > SW * (1 - SIDE_REGION_WIDTH);
          if (inSideRegion) {
            // Accept vertical drag OR horizontal swipe from side regions
            return (
              (Math.abs(g.dy) > 20 && Math.abs(g.dy) > Math.abs(g.dx * 1.5)) ||
              (Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy * 1.5))
            );
          }
          return Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy * 1.5);
        },
        // Only capture in side regions so taps on center entity avatars are never stolen (entity tap → redirect works).
        onMoveShouldSetPanResponderCapture: (_, g) => {
          const startX = g.moveX - g.dx;
          const inSideRegion =
            startX < SW * SIDE_REGION_WIDTH ||
            startX > SW * (1 - SIDE_REGION_WIDTH);
          if (!inSideRegion) return false;
          return Math.abs(g.dy) > 20 && Math.abs(g.dy) > Math.abs(g.dx * 1.5);
        },
        onPanResponderRelease: (_, g) => {
          const startX = g.moveX - g.dx;
          const isLeftRegion = startX < SW * SIDE_REGION_WIDTH;
          const isRightRegion = startX > SW * (1 - SIDE_REGION_WIDTH);
          const inSideRegion = isLeftRegion || isRightRegion;
          if (inSideRegion && Math.abs(g.dy) > Math.abs(g.dx)) {
            // Vertical: right sfera = up prev / down next; left sfera = reversed (up next / down prev)
            if (g.dy < -50)
              goToSphere(
                isLeftRegion ? (focusedIdx + 1) % N : (focusedIdx - 1 + N) % N,
              );
            else if (g.dy > 50)
              goToSphere(
                isLeftRegion ? (focusedIdx - 1 + N) % N : (focusedIdx + 1) % N,
              );
          } else {
            // Horizontal anywhere (center or side): left = next, right = prev
            if (g.dx < -50) goToSphere((focusedIdx + 1) % N);
            else if (g.dx > 50) goToSphere((focusedIdx - 1 + N) % N);
          }
        },
      }),
    [focusedIdx, goToSphere, N, sunLoadComplete],
  );

  const t = useTranslate();
  const { language } = useLanguage();
  const focusedSphere = SPHERE_LIST[focusedIdx];
  const focusedSunnyPct = getSphereSunnyPercentage(focusedSphere.type);
  const focusedGradientColors = getSphereGradientColors(
    focusedSphere.type,
    focusedSunnyPct,
    colorScheme,
  );
  const focusedIconColor = getSphereIconColor(
    focusedSphere.type,
    colorScheme,
    focusedSunnyPct,
  );
  const focusedShadowColor = getSphereShadowColor(
    focusedSphere.type,
    colorScheme,
  );

  // Check if the FOCUSED sfera has memories (not overall)
  const focusedSferaHasMemories = useMemo(() => {
    const focusedMemories = memoriesPerEntityBySphere[focusedSphere.type] ?? [];
    return focusedMemories.some((entityMemories) => entityMemories.length > 0);
  }, [memoriesPerEntityBySphere, focusedSphere.type]);

  const sunnyFacts = useMemo(() => {
    const allMems = (
      Object.values(memoriesPerEntityBySphere) as IdealizedMemory[][]
    ).flat(2);
    return allMems
      .filter((m) => getMemorySunnyPercentage(m) >= 50)
      .flatMap((m) => m.goodFacts ?? [])
      .filter((f) => f.text?.trim());
  }, [memoriesPerEntityBySphere]);

  // Circle avatar percentage logic:
  // - Initial view (selectedSphere === null): Show overall percentage across all sferas
  // - Individual sfera view (selectedSphere !== null): Show that sfera's percentage if it has memories, otherwise overall
  const circleAvatarPercentage = useMemo(() => {
    if (selectedSphere === null) {
      // Initial view: always show overall percentage
      return overallSunnyPercentage;
    } else {
      // Individual sfera view: show focused sfera % if it has memories, otherwise overall
      return focusedSferaHasMemories ? focusedSunnyPct : overallSunnyPercentage;
    }
  }, [
    selectedSphere,
    focusedSferaHasMemories,
    focusedSunnyPct,
    overallSunnyPercentage,
  ]);

  // Collapse sun expanded state and centering together
  const handleCollapseSun = useCallback(() => {
    setIsSunCentered(false);
    if (isSunExpanded) handleSunPress();
  }, [isSunExpanded, handleSunPress]);

  /** Lesson Check: show exam only if AI sub or free daily slot; otherwise paywall only (not both). */
  const handleOpenUniverseExam = useCallback(async () => {
    handleCollapseSun();
    const { hasAIEntitlement } = await ensureSubscriptionResolved();
    const hasPending = await hasPendingUniverseExam();
    const canTakeExam =
      hasAIEntitlement || hasPending || (await canUseExam(hasAIEntitlement));
    if (!canTakeExam) {
      const purchased = await showPaywallForAIAccess();
      if (purchased) {
        await refreshCustomerInfo();
        setUniverseExamVisible(true);
      }
      return;
    }
    setUniverseExamVisible(true);
  }, [ensureSubscriptionResolved, handleCollapseSun, refreshCustomerInfo]);

  // When circle avatar is pressed:
  // - Initial view (selectedSphere === null): expand sun (shrink sferas + show menu) AND center sun
  // - Individual sfera view (selectedSphere !== null): clear selection to return to initial view
  const handleCircleAvatarPress = useCallback(() => {
    if (!sunLoadComplete) return;
    if (selectedSphere === null) {
      const next = !isSunExpanded;
      setIsSunCentered(next);
      handleSunPress();
    } else {
      if (onClearSelection) {
        onClearSelection();
      } else {
        onSwitchToClassic();
      }
    }
  }, [selectedSphere, isSunExpanded, onClearSelection, onSwitchToClassic, handleSunPress, sunLoadComplete]);

  const { momentColors } = useMomentColors();
  const avatarSizeForDots = 100;
  const avatarCenterX = SW / 2;
  const avatarCenterY = SH * 0.48;

  const leftChevronScale = useSharedValue(1);
  const rightChevronScale = useSharedValue(1);
  const hintOpacity = useSharedValue(0);

  const showDoubleTapHint = useCallback(() => {
    if (!appUsabilityHints) return;
    cancelAnimation(hintOpacity);
    hintOpacity.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
      withDelay(1200, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })),
    );
  }, [appUsabilityHints, hintOpacity]);

  const doubleTapHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const leftChevronStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leftChevronScale.value }],
  }));
  const rightChevronStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightChevronScale.value }],
  }));

  const chevronPressIn = useCallback(
    (side: "left" | "right") => {
      const scale = side === "left" ? leftChevronScale : rightChevronScale;
      cancelAnimation(scale);
      scale.value = withTiming(0.82, {
        duration: 80,
        easing: Easing.out(Easing.ease),
      });
    },
    [leftChevronScale, rightChevronScale],
  );
  const chevronPressOut = useCallback(
    (side: "left" | "right") => {
      const scale = side === "left" ? leftChevronScale : rightChevronScale;
      cancelAnimation(scale);
      scale.value = withSpring(1, { damping: 12, stiffness: 400 });
    },
    [leftChevronScale, rightChevronScale],
  );

  const congratsStyle = useAnimatedStyle(() => ({ opacity: congratsOpacity.value }));
  const handleFireworksComplete = useCallback(() => setIntroFireworks(false), []);

  return (
    <View
      style={[
        styles.root,
        { marginTop: rootMarginTop },
        hidden
          ? { opacity: 0, pointerEvents: "none" as const }
          : { pointerEvents: "auto" as const },
      ]}
      {...(hidden ? {} : panResponder.panHandlers)}
    >
      <ConstellationBackground
        width={SW}
        height={SH}
        constellationAmount={constellationAmount}
        constellationOpacity={constellationOpacity}
      />

      <BackgroundDecorations />

      {/* ─── Sparkled dots scattered across screen ─── */}
      <SparkledDots
        avatarSize={avatarSizeForDots}
        avatarCenterX={avatarCenterX}
        avatarCenterY={avatarCenterY}
        colorScheme={colorScheme}
        sunnyBackground={momentColors.sunny.background}
      />

      {/* ─── Cosmic pulse rings for focused sphere — rendered at root level to avoid container clipping on real iOS devices ─── */}
      <CosmicPulseRings
        color={
          colorScheme === "dark"
            ? focusedShadowColor
            : "rgba(100,100,100,0.3)"
        }
        offsetX={ORBIT_CX}
        offsetY={ORBIT_CY + ORBIT_R}
        sphereSize={FOCUSED_SIZE}
        enabled={pulsingAnimations && !isSunExpanded && sunLoadComplete}
      />

      {/* ─── All 5 spheres with orbital animated transitions ─── */}
      {SPHERE_LIST.map((sphere, i) => (
        <AnimatedSphere
          key={sphere.type}
          sphereIdx={i}
          sphere={sphere}
          focusedIdx={focusedIdx}
          entityUris={entityImageUrisBySphere[sphere.type] ?? []}
          entityIds={entityIdsBySphere[sphere.type] ?? []}
          entityNames={entityNamesBySphere[sphere.type] ?? []}
          entityMemories={memoriesPerEntityBySphere[sphere.type] ?? []}
          onPress={() => {
            if (!sunLoadComplete) return;
            if (isSunExpanded) { handleCollapseSun(); return; }
            if (i !== focusedIdx) { goToSphere(i); return; }
            if (selectedSphere !== null) { onAddMemoriesPress(); return; }
            onSphereSelect(sphere.type);
          }}
          onEntitySelect={
            selectedSphere === null && i === focusedIdx
              ? () => onSphereSelect(sphere.type)
              : onEntitySelect
          }
          colorScheme={colorScheme}
          sunnyPercentage={getSphereSunnyPercentage(sphere.type)}
          orbitDurationMs={orbitDurationMs}
          singleTapWhenFocused={selectedSphere !== null && i === focusedIdx}
          onPulse={i === focusedIdx ? (fn) => { focusedSpherePulseRef.current = fn; } : undefined}
          sunExpanded={sunExpanded}
          isInitialView={selectedSphere === null}
          sunLoadProgress={sunLoadComplete ? undefined : sunLoadProgress}
          sunLoadSweepOffset={sunLoadComplete ? undefined : sunLoadSweepOffset}
          sphereIntroStaggerMs={i * 150}
          isSunMenuOpen={isSunExpanded}
        />
      ))}

      {/* ─── Focused sphere tap target — absolute positioned so iOS hit-testing works (transforms bypass hit rects) ─── */}
      <Pressable
        style={{
          position: "absolute",
          left: ORBIT_CX - FOCUSED_SIZE / 2,
          top: ORBIT_CY + ORBIT_R - FOCUSED_SIZE / 2,
          width: FOCUSED_SIZE,
          height: FOCUSED_SIZE,
          borderRadius: FOCUSED_SIZE / 2,
          zIndex: 13,
        }}
        onPress={() => {
          if (!sunLoadComplete) return;
          if (isSunExpanded) { handleCollapseSun(); return; }
          if (selectedSphere !== null) { onAddMemoriesPress(); return; }
          const now = Date.now();
          const elapsed = now - focusedSphereTapTimeRef.current;
          if (elapsed < 350 && elapsed > 0) {
            focusedSphereTapTimeRef.current = 0;
            if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
            onSphereSelect(SPHERE_LIST[focusedIdx].type);
          } else {
            focusedSphereTapTimeRef.current = now;
            focusedSpherePulseRef.current?.();
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
            hintTimerRef.current = setTimeout(() => { hintTimerRef.current = null; showDoubleTapHint(); }, 350);
          }
        }}
      />

      {/* ─── Center: Sfera Insight Card (individual sfera view) or Sun Avatar (overview) ─── */}
      {selectedSphere !== null && (entityIdsBySphere[focusedSphere.type]?.length ?? 0) > 0 ? (
        <SferaInsightCard
          sphere={focusedSphere.type}
          entityIds={entityIdsBySphere[focusedSphere.type] ?? []}
          entityNames={entityNamesBySphere[focusedSphere.type] ?? []}
          entityMemories={memoriesPerEntityBySphere[focusedSphere.type] ?? []}
          onEntitySelect={onEntitySelect}
          colorScheme={colorScheme}
          shadowColor={focusedShadowColor}
          x={SW * 0.45}
          y={SH * 0.38}
        />
      ) : (
        <>
          <SunnyLifeAvatar
            percentage={circleAvatarPercentage}
            hasMemories={hasMemories}
            onPress={handleCircleAvatarPress}
            onAddMemoriesPress={onAddMemoriesPress}
            colorScheme={colorScheme}
            x={SW * 0.45}
            y={SH * 0.38}
            sunLoadScale={sunLoadComplete ? undefined : sunLoadScale}
            sunLoadDisplayPct={sunLoadComplete ? undefined : sunLoadDisplayPct}
            sunExpanded={sunExpanded}
            isCentered={sunLoadCentered || isSunCentered}
            screenWidth={SW}
            screenHeight={SH}
          />
          {!sunLoadComplete && (
            <>
              {/* Rising sunny moment bubbles — drift bottom to top in background */}
              <RisingSunsBackground sunnyFacts={sunnyFacts} fadeOut={risingSunsFadeOut} />
              {/* Fireworks burst at percentage reveal */}
              <Fireworks
                visible={sunLoadFireworks}
                duration={2000}
                onComplete={handleFireworksComplete}
              />
              {/* Congrats text — positioned below the centered sun */}
              <Animated.View
                pointerEvents="none"
                style={[styles.congratsContainer, congratsStyle]}
              >
                <ThemedText style={styles.congratsText}>
                  {t("avatar.sunnyCongrats", { pct: Math.round(overallSunnyPercentage) })}
                </ThemedText>
              </Animated.View>
            </>
          )}
          {/* ─── Sun action buttons: appear below sun when expanded ─── */}
          <Animated.View
            pointerEvents={isSunExpanded ? "auto" : "none"}
            style={[
              {
                position: "absolute",
                left: 20,
                top: SH * 0.5 + 120,
                width: SW - 40,
                flexDirection: "row",
                justifyContent: "space-evenly",
                alignItems: "flex-start",
                zIndex: 30,
              },
              sunMenuStyle,
            ]}
          >
            {/* Insights button */}
            <Pressable
              onPress={() => {
                handleCollapseSun();
                onInsightsPress?.();
              }}
              style={{ alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(186,104,200,0.22)",
                  borderWidth: 2,
                  borderColor: "rgba(186,104,200,0.65)",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#BA68C8",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.55,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <MaterialIcons name="insights" size={36} color="#CE93D8" />
              </View>
              <ThemedText style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, letterSpacing: 0.3 }}>
                {t("insights.wheelOfLife.title")}
              </ThemedText>
            </Pressable>

            {/* Universe Lessons scroll button */}
            <Pressable
              onPress={() => {
                handleCollapseSun();
                setUniverseLessonsVisible(true);
              }}
              style={{ alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(80,20,130,0.35)",
                  borderWidth: 2,
                  borderColor: "rgba(190,100,255,0.55)",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#BE64FF",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.55,
                  shadowRadius: 12,
                  elevation: 12,
                }}
              >
                <UniverseScrollIcon size={44} />
              </View>
              <ThemedText style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, letterSpacing: 0.3 }}>
                {language === "bg" ? "Уроци" : "Universe Lessons"}
              </ThemedText>
            </Pressable>

            {/* Universe Exam button */}
            <Pressable
              onPress={handleOpenUniverseExam}
              style={{ alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(20,80,130,0.35)",
                  borderWidth: 2,
                  borderColor: "rgba(92,225,230,0.55)",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#5CE1E6",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.55,
                  shadowRadius: 12,
                  elevation: 12,
                }}
              >
                <MaterialIcons name="fact-check" size={36} color="#5CE1E6" />
              </View>
              <ThemedText style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, letterSpacing: 0.3 }}>
                {t("universe.exam.title")}
              </ThemedText>
            </Pressable>

          </Animated.View>
        </>
      )}

      {/* ─── Focused sfera label + pagination dots (below rotating entities) ─── */}
      <View
        style={[
          styles.focusedLabelContainer,
          {
            top: ORBIT_CY + ORBIT_R + FOCUSED_LABEL_GAP * 5.5,
            opacity: isSunExpanded ? 0 : 1,
          },
        ]}
        pointerEvents="none"
      >
        <ThemedText style={styles.focusedLabelText}>
          {t(`spheres.${focusedSphere.type}`)}
        </ThemedText>
        <View
          style={[styles.focusedLabelDotsRow, { marginTop: LABEL_TO_DOTS_GAP }]}
        >
          {SPHERE_LIST.map((_, i) => (
            <View
              key={i}
              style={[
                styles.focusedLabelDot,
                i === focusedIdx && styles.focusedLabelDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ─── Double-tap UX hint: soft tooltip below sphere, triggered on single tap ─── */}
      {appUsabilityHints && selectedSphere === null && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: ORBIT_CX - FOCUSED_SIZE / 2,
              width: FOCUSED_SIZE,
              top: ORBIT_CY + ORBIT_R + 20,
              alignItems: "center",
              zIndex: 20,
            },
            doubleTapHintAnimatedStyle,
          ]}
        >
          <ThemedText style={{
            fontSize: 13,
            color: "#FFFFFF",
            opacity: 0.75,
            letterSpacing: 0.2,
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}>
            {t("spheres.doubleTapHint")}
          </ThemedText>
        </Animated.View>
      )}

      {/* ─── Chevron buttons: hidden when sun is expanded or intro is playing ─── */}
      {!isSunExpanded && sunLoadComplete && (
        <>
          <Animated.View style={[styles.chevron, styles.chevronLeft, leftChevronStyle]}>
            <Pressable
              style={styles.chevronPressable}
              onPressIn={() => chevronPressIn("left")}
              onPressOut={() => chevronPressOut("left")}
              onPress={() => goToSphere((focusedIdx + 1) % N)}
            >
              <MaterialIcons name="chevron-left" size={32} color="rgba(255,255,255,0.45)" />
            </Pressable>
          </Animated.View>
          <Animated.View style={[styles.chevron, styles.chevronRight, rightChevronStyle]}>
            <Pressable
              style={styles.chevronPressable}
              onPressIn={() => chevronPressIn("right")}
              onPressOut={() => chevronPressOut("right")}
              onPress={() => goToSphere((focusedIdx - 1 + N) % N)}
            >
              <MaterialIcons name="chevron-right" size={32} color="rgba(255,255,255,0.45)" />
            </Pressable>
          </Animated.View>
        </>
      )}

      <UniverseLessonsScreen
        visible={universeLessonsVisible}
        onClose={() => setUniverseLessonsVisible(false)}
      />
      <UniverseExamScreen
        visible={universeExamVisible}
        onClose={() => setUniverseExamVisible(false)}
      />
    </View>
  );
}

// ───────────────────── Styles ─────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  focusedLabelContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  focusedLabelText: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.95,
    letterSpacing: 0.3,
  },
  focusedLabelDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SW * 0.025,
  },
  focusedLabelDot: {
    width: SW * 0.022,
    height: SW * 0.022,
    borderRadius: SW * 0.011,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  focusedLabelDotActive: {
    width: SW * 0.06,
    height: SW * 0.022,
    borderRadius: SW * 0.011,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  chevron: {
    position: "absolute",
    top: ORBIT_CY + ORBIT_R - 16,
    zIndex: 5,
  },
  chevronLeft: {
    left: 6,
  },
  chevronRight: {
    right: 6,
  },
  chevronPressable: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  congratsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SH / 2 + 90,
    alignItems: "center",
    zIndex: 30,
  },
  congratsText: {
    fontSize: 18,
    color: "#FFD700",
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
