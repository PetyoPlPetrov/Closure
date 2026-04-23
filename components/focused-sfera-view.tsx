/**
 * FocusedSferas view — one sphere in focus (large, center-bottom), the rest on orbit.
 * Swipe left/right or use chevrons to change focus. Overview: tap center avatar to open Sfera Insights; in a sfera, tap avatar to leave.
 *
 * All interaction state lives here so the parent home tab does NOT re-render on swipes/interactions.
 */

import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import {
  ORBIT_MAX_FLOATING_ENTITIES,
  pickOrbitEntitiesBySunnyScore,
} from "@/utils/orbit-entity-pick";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import type { Translations } from "@/utils/languages/translations";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  getSphere3DGradientColors,
  getSphereIconColor,
  getSphereShadowColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppState,
  Dimensions,
  InteractionManager,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
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
  RadialGradient,
  Stop,
  Circle as SvgCircle,
} from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");
const IS_IPAD = Platform.OS === "ios" && Platform.isPad;
/** Larger UI on iPad only (iOS iPad); phones unchanged. */
const IPAD_FOCUSED_SCALE = IS_IPAD ? 1.55 : 1;
const IPAD_INDIVIDUAL_SFERA_SCALE = IS_IPAD ? 1.3 : 1;
const IPAD_INDIVIDUAL_CARD_SCALE = IS_IPAD ? 1.45 : 1;
const IPAD_INDIVIDUAL_ENTITY_AVATAR_SCALE = IS_IPAD ? 1.18 : 1;
const scaleFocused = (value: number) => value * IPAD_FOCUSED_SCALE;

const SPHERE_LIST: { type: LifeSphere; icon: string }[] = [
  { type: "relationships", icon: "favorite" },
  { type: "career", icon: "work" },
  { type: "family", icon: "family-restroom" },
  { type: "friends", icon: "people" },
  { type: "hobbies", icon: "sports-esports" },
];

const SPHERE_DISPLAY_NAME_KEY: Record<LifeSphere, keyof Translations> = {
  relationships: "spheres.relationships",
  career: "spheres.career",
  family: "spheres.family",
  friends: "spheres.friends",
  hobbies: "spheres.hobbies",
};

/** Neon rim colors per sphere — matches universe-lessons-screen palette */
const SPHERE_NEON: Record<LifeSphere, { core: string; glow: string }> = {
  relationships: { core: "#FF9696", glow: "#FF9696" },
  career:        { core: "#96C8FF", glow: "#96CAFF" },
  family:        { core: "#C896FF", glow: "#C89CFF" },
  friends:       { core: "#9B7AFF", glow: "#9B7AFF" },
  hobbies:       { core: "#F97B16", glow: "#F97B16" },
};

const FOCUSED_SIZE = scaleFocused(170);
const FOCUSED_ICON_SIZE = scaleFocused(72);

/** Memory Balance: hint overlay band starts this far down the screen (fraction of height). Larger = strip nearer tab bar. */
const SFERA_HINT_MB_BAND_TOP_FRAC = 0.7;
/**
 * Pulls the hint strip closer to the tab bar: tab inset minus a fraction of screen height
 * minus scaled points (phones + iPad via scaleFocused).
 */
function sferaHintBottomLiftPx(tabBarInset: number): number {
  return Math.max(0, tabBarInset - SH * 0.052 - scaleFocused(14));
}

// Orbit around the Sunny Life avatar: spheres move along this circle when switching focus
const ORBIT_CX = SW / 2;
// Slightly lower than center to keep space for the badge + toggle
const ORBIT_CY = SH * 0.46;
const ORBIT_R = scaleFocused(135);
const SUN_CENTER_X = SW / 2;
const SUN_CENTER_Y = SH * 0.38;
const MEMORY_BALANCE_MIN_SIZE = scaleFocused(70);
const MEMORY_BALANCE_MAX_SIZE = scaleFocused(136);
const MEMORY_BALANCE_RING_LAYOUT: readonly { angleDeg: number; radius: number }[] = [
  { angleDeg: -90, radius: scaleFocused(148) },
  { angleDeg: -18, radius: scaleFocused(156) },
  { angleDeg: 54, radius: scaleFocused(172) },
  { angleDeg: 126, radius: scaleFocused(172) },
  { angleDeg: 198, radius: scaleFocused(156) },
];

/** Persisted orbit vs Memory Balance layout (FocusedSferas overview). */
const FOCUSED_DISPLAY_MODE_STORAGE_KEY = "@sferas:focused_display_mode";
/** Vertical drift when hiding Memory Balance sferas (sun menu open) — worklet-safe constant. */
const MEMORY_BALANCE_MENU_HIDE_DRIFT_Y = scaleFocused(10);
/** Sunny / cloud stats under Memory Balance sferas. */
const MEMORY_BALANCE_STATS_ICON_SIZE = scaleFocused(13);
const MEMORY_BALANCE_STATS_TEXT_SIZE = scaleFocused(11);
const MEMORY_BALANCE_STATS_MARGIN_TOP = scaleFocused(6);
const MEMORY_BALANCE_STATS_ROW_GAP = scaleFocused(4);
const MEMORY_BALANCE_STATS_ICON_TEXT_GAP = scaleFocused(3);
const MEMORY_BALANCE_STATS_BELOW = scaleFocused(22);
const MEMORY_BALANCE_NAME_GAP = scaleFocused(3);
const MEMORY_BALANCE_NAME_BELOW = scaleFocused(30);
/** Soft cyan-white for orbit sfera names, avatar labels, and insights chrome. */
const COSMIC_TEXT = "#B8E8EC";
const INSIGHTS_HUB_SIZE = scaleFocused(100);

/** Scalable gap between rotating entities and the label block (3% of screen height) */
const FOCUSED_LABEL_GAP = SH * 0.03 * IPAD_FOCUSED_SCALE;
/** Gap between label text and pagination dots (0.8% of screen height) */
const LABEL_TO_DOTS_GAP = SH * 0.008 * IPAD_FOCUSED_SCALE;
const NEED_MEMORIES_HINT_WIDTH_FS = scaleFocused(220);
const needMemoriesHintBubbleStyleFs = {
  paddingVertical: 8,
  paddingHorizontal: 10,
  backgroundColor: "rgba(15, 20, 34, 0.96)",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.22)",
  maxWidth: NEED_MEMORIES_HINT_WIDTH_FS,
} as const;

/** Left just above the focused sfera (slot 4) — slightly bigger */
const BG_SPHERE_SIZE_LEFT_BELOW = scaleFocused(76);
/** Right just above / below-right of the circle avatar (slot 1) — a bit bigger */
const BG_SPHERE_SIZE_RIGHT_BELOW = scaleFocused(82);
/** Sfera above the Sunny Life circle on the right (slot 2) — back of orbit; min large enough for name label. */
const BG_SPHERE_SIZE_TOP_RIGHT = scaleFocused(64);
/** Sfera above the Sunny Life circle on the left (slot 3) — a bit bigger */
const BG_SPHERE_SIZE_TOP_LEFT = scaleFocused(82);
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

function getEntityRingMetrics(
  sphereSize: number,
  focused: boolean,
  slot: number,
  entityAvatarScale: number,
): { entityAvatarSize: number; orbitRadius: number } {
  const depthScale = getEntityDepthScale(slot);
  const baseEntityAvatarSize = focused
    ? 40
    : Math.max(22, Math.round(sphereSize * 0.3));
  const rawEntityAvatarSize = focused
    ? baseEntityAvatarSize
    : Math.max(10, Math.round(baseEntityAvatarSize * depthScale));
  const entityAvatarSize = rawEntityAvatarSize * entityAvatarScale;
  const orbitRadius =
    sphereSize / 2 + entityAvatarSize / 2 + (focused ? 8 : 6);
  return { entityAvatarSize, orbitRadius };
}

// ───────────────────────────── types ─────────────────────────────

export type FocusedSferaViewProps = {
  overallSunnyPercentage: number;
  /**
   * When false, center sun shows the empty "+" and tap goes to `onAddMemoriesPress`.
   * Parent should pass true if the user has any memories **or** any entities — otherwise post-onboarding users see "+" despite having saved entities.
   */
  hasMemories: boolean;
  /** Called when user taps the empty center (when hasMemories is false). Typically navigates to Sfera tab. */
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
  /** When true, journey/home data has finished loading (so 0% sunny means no entities, not "still loading"). */
  sferaDataReady?: boolean;
  /** Restore sun menu expanded (3 action icons) after remount, e.g. returning from /insights. */
  initialSunMenuExpanded?: boolean;
  /** Notifies parent when sun menu expands/collapses so state can survive navigation remounts. */
  onSunMenuExpandedChange?: (expanded: boolean) => void;
  /** Called once when the sunny moments intro animation finishes (or is skipped). Lets parent gate modals on this. */
  onIntroComplete?: () => void;
  /** Parent assigns `current` to collapse the sun menu (same as tapping the sun when the menu is open). */
  sunMenuCollapseActionRef?: React.MutableRefObject<(() => void) | null>;
  /** Height reserved for the tab bar (pt) — pins optional bottom overlays above it. */
  bottomTabBarInset?: number;
  /** e.g. sfera size hint; only shown on overview (`selectedSphere === null`) below the sphere cluster. */
  sferaSizeHint?: React.ReactNode;
  /** Reports Memory Balance vs orbit so the home tab can gate the sfera-size hint (hint only applies to Memory Balance rings). */
  onFocusedDisplayModeForHint?: (isMemoryBalanceRings: boolean) => void;
  /** Optional lesson target from a notification; opens Universe Lessons and jumps to that lesson. */
  notificationLessonTarget?: {
    key: string;
    lessonId?: string;
    memoryId: string;
    entityId: string;
    sphere: LifeSphere;
    text: string;
  } | null;
  /** Called after notification target is consumed to avoid reopening on rerender. */
  onNotificationLessonTargetHandled?: (key: string) => void;
};

// ───────────────────── Small floating memory icons around one entity (one per memory, sunny/cloudy color) ─────────────────────

const MOMENT_ICON_SIZE = scaleFocused(16);
const MOMENT_ORBIT_RADIUS = scaleFocused(32); // outside entity avatar (entity radius ~20 for focused; +12 gap so memories sit clearly away)

// ─── Background decorative sferas (rings, orbs, arcs) ───────────────────────
// Lesson card occupies roughly the horizontal center and y: 180–420.
// Decorations avoid that zone by staying in corners / edges.
const BG_DECOR = [
  // top-left corner cluster
  { cx: SW * 0.08, cy: SH * 0.07, rx: 52, ry: 52, strokeW: 1.2, op: 0.10, fill: false },
  { cx: SW * 0.08, cy: SH * 0.07, rx: 32, ry: 32, strokeW: 0.7, op: 0.07, fill: false },
  { cx: SW * 0.14, cy: SH * 0.12, rx: 14, ry: 14, strokeW: 0, op: 0.08, fill: true },
  // top-right: intentionally no rings here — they sat under the memory-balance control / status area and read like a ghost of that button.
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
  entityIndex,
  memories,
  visibility,
  animationsEnabled,
}: {
  entityIndex: number;
  memories: IdealizedMemory[];
  visibility: SharedValue<number>;
  animationsEnabled: boolean;
}) {
  const { momentColors } = useMomentColors();
  const floatY = useSharedValue(0);
  const wrapperStyle = useAnimatedStyle(() => ({
    // Keep clouds/suns visible a bit longer during fade-out for a gentler transition.
    opacity: Math.sqrt(Math.max(0, Math.min(1, visibility.value))),
  }));

  useEffect(() => {
    if (!animationsEnabled) {
      cancelAnimation(floatY);
      floatY.value = 0;
      return;
    }
    floatY.value = withRepeat(
      withTiming(1, {
        duration: 1800 + entityIndex * 150,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(floatY);
      floatY.value = 0;
    };
  }, [entityIndex, floatY, animationsEnabled]);

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
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        },
        wrapperStyle,
      ]}
    >
      {memoryIcons.map((m, i) => {
        const angle = (i / memoryIcons.length) * 2 * Math.PI - Math.PI / 2;
        const dx = Math.cos(angle) * MOMENT_ORBIT_RADIUS;
        const dy = Math.sin(angle) * MOMENT_ORBIT_RADIUS;
        return (
          <SmallFloatingMomentIcon
            key={m.id}
            dx={dx}
            dy={dy}
            floatY={floatY}
            visibility={visibility}
            color={m.color}
            name={m.name}
            glowColor={m.glowColor}
          />
        );
      })}
    </Animated.View>
  );
});

const SmallFloatingMomentIcon = React.memo(function SmallFloatingMomentIcon({
  dx,
  dy,
  floatY,
  visibility,
  color,
  name,
  glowColor,
}: {
  dx: number;
  dy: number;
  floatY: SharedValue<number>;
  visibility: SharedValue<number>;
  color: string;
  name: "wb-sunny" | "cloud";
  glowColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(visibility.value, [0, 1], [0.12, 0.8], Extrapolation.CLAMP),
    shadowRadius: interpolate(visibility.value, [0, 1], [1.5, 4], Extrapolation.CLAMP),
    transform: [
      { translateX: dx - MOMENT_ICON_SIZE / 2 },
      { translateY: dy - MOMENT_ICON_SIZE / 2 + floatY.value * 3 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: "50%",
          top: "50%",
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
  animationsEnabled,
}: {
  avatarSize: number;
  avatarCenterX: number;
  avatarCenterY: number;
  colorScheme: "light" | "dark";
  sunnyBackground: string;
  animationsEnabled: boolean;
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
          animationsEnabled={animationsEnabled}
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
  animationsEnabled,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  colorScheme: "light" | "dark";
  sunnyBackground: string;
  animationsEnabled: boolean;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    if (!animationsEnabled) {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      opacity.value = 0;
      scale.value = 0.7;
      return;
    }
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
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [delay, duration, animationsEnabled, opacity, scale]);

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

// ───────────────────── Entity avatar ring (same glow blur as classic FloatingEntity) ─────────────────────

const EntityRing = React.memo(function EntityRing({
  uris,
  entityIds,
  entityNames,
  entityMemories,
  onEntitySelect,
  onSingleTapSameAsFocusedSphere,
  onNeedMemoriesHint,
  needMemoriesHintEntityId,
  sphere,
  centerX,
  centerY,
  orbitRadius,
  avatarSize,
  avatarSizeFallback,
  glowColor,
  isFocused = false,
  momentsVisibility,
  rotateOrbit = false,
  orbitDurationMs = DEFAULT_ENTITY_ORBIT_DURATION_MS,
  randomPulseIndex = null,
  animationsEnabled = true,
}: {
  uris: string[];
  entityIds: string[];
  entityNames: string[];
  entityMemories: IdealizedMemory[][];
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
  /** When set (focused sphere only), single tap on an orbiting entity matches focused-sphere tap: pulse + global double-tap hint. */
  onSingleTapSameAsFocusedSphere?: () => void;
  onNeedMemoriesHint?: (entityId: string) => void;
  needMemoriesHintEntityId: string | null;
  sphere: LifeSphere;
  centerX: number;
  centerY: number;
  orbitRadius: SharedValue<number>;
  avatarSize: SharedValue<number>;
  avatarSizeFallback: number;
  glowColor: string;
  isFocused?: boolean;
  momentsVisibility: SharedValue<number>;
  rotateOrbit?: boolean;
  orbitDurationMs?: number;
  randomPulseIndex?: number | null;
  animationsEnabled?: boolean;
}) {
  const { isTablet } = useLargeDevice();
  const orbitAngle = useSharedValue(0);

  useEffect(() => {
    if (!animationsEnabled || !rotateOrbit) {
      cancelAnimation(orbitAngle);
      return;
    }
    // Keep the current phase when focus changes so entities don't "pop" to a new ring position.
    const start = orbitAngle.value;
    orbitAngle.value = withRepeat(
      withTiming(start + 2 * Math.PI, {
        duration: orbitDurationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(orbitAngle);
    };
  }, [rotateOrbit, orbitAngle, orbitDurationMs, animationsEnabled]);

  const handleOrbitingEntityTap = useCallback(
    (entityId: string, isDoubleTap: boolean, memoryCount: number) => {
      if (isDoubleTap) {
        onEntitySelect(entityId, sphere);
        return;
      }
      if (!isFocused || !entityId) return;
      if (memoryCount === 0) {
        onNeedMemoriesHint?.(entityId);
        return;
      }
      onSingleTapSameAsFocusedSphere?.();
    },
    [isFocused, onEntitySelect, onSingleTapSameAsFocusedSphere, onNeedMemoriesHint, sphere],
  );

  if (entityIds.length === 0) return null;
  const count = Math.min(entityIds.length, ORBIT_MAX_FLOATING_ENTITIES);
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
            avatarSizeFallback={avatarSizeFallback}
            borderWidth={borderWidth}
            glowColor={glowColor}
            isFocused={isFocused}
            isTablet={isTablet}
            momentsVisibility={momentsVisibility}
            entityMemories={memories}
            onOrbitingTap={handleOrbitingEntityTap}
            needMemoriesHintForEntity={needMemoriesHintEntityId === entityId}
            orbitAngle={orbitAngle}
            rotateOrbit={rotateOrbit}
            shouldDoRandomPulse={randomPulseIndex === i}
            animationsEnabled={animationsEnabled}
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
  avatarSizeFallback,
  borderWidth,
  glowColor,
  isFocused,
  isTablet,
  momentsVisibility,
  entityMemories,
  onOrbitingTap,
  needMemoriesHintForEntity,
  orbitAngle,
  rotateOrbit,
  shouldDoRandomPulse,
  animationsEnabled,
}: {
  uri: string;
  entityId: string;
  entityName: string;
  index: number;
  count: number;
  baseAngle: number;
  centerX: number;
  centerY: number;
  orbitRadius: SharedValue<number>;
  avatarSize: SharedValue<number>;
  avatarSizeFallback: number;
  borderWidth: number;
  glowColor: string;
  isFocused: boolean;
  isTablet: boolean;
  momentsVisibility: SharedValue<number>;
  entityMemories: IdealizedMemory[];
  onOrbitingTap: (
    entityId: string,
    isDoubleTap: boolean,
    memoryCount: number,
  ) => void;
  needMemoriesHintForEntity?: boolean;
  orbitAngle: SharedValue<number>;
  rotateOrbit: boolean;
  shouldDoRandomPulse: boolean;
  animationsEnabled: boolean;
}) {
  const t = useTranslate();
  const scale = useSharedValue(1);
  const lastTap = useRef(0);

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
    const dynamicAvatarSize = avatarSize.value;
    const dynamicOrbitRadius = orbitRadius.value;
    const x = centerX + Math.cos(angle) * dynamicOrbitRadius - dynamicAvatarSize / 2;
    const y = centerY + Math.sin(angle) * dynamicOrbitRadius - dynamicAvatarSize / 2;
    return {
      position: "absolute",
      left: x,
      top: y,
      width: dynamicAvatarSize,
      height: dynamicAvatarSize,
      overflow: "visible" as const,
      opacity: interpolate(
        momentsVisibility.value,
        [0, 1],
        [0.55, 1],
        Extrapolation.CLAMP,
      ),
      shadowOpacity: interpolate(
        momentsVisibility.value,
        [0, 1],
        [0.2, 0.8],
        Extrapolation.CLAMP,
      ),
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
          borderRadius: 999,
          zIndex: 15,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: isTablet ? 12 : 8,
          elevation: 8,
        },
      ]}
    >
      <Pressable
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
        }}
        onPress={() => {
          if (entityId) {
            const now = Date.now();
            const isDoubleTap = now - lastTap.current < 300;
            lastTap.current = now;

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

            onOrbitingTap(entityId, isDoubleTap, entityMemories.length);
          }
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 999,
              borderWidth,
              borderColor: "rgba(255,255,255,0.75)",
            }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 999,
              borderWidth,
              borderColor: "rgba(255,255,255,0.75)",
              backgroundColor: "rgba(128,128,128,0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemedText
              style={{ fontSize: avatarSizeFallback * 0.45, fontWeight: "600" }}
            >
              {initialLetter}
            </ThemedText>
          </View>
        )}
        <SmallFloatingMoments
          entityIndex={index}
          memories={entityMemories}
          visibility={momentsVisibility}
          animationsEnabled={animationsEnabled}
        />
      </Pressable>
      {needMemoriesHintForEntity ? (
        <View
          style={{
            position: "absolute",
            top: avatarSizeFallback + 6,
            left: (avatarSizeFallback - NEED_MEMORIES_HINT_WIDTH_FS) / 2,
            width: NEED_MEMORIES_HINT_WIDTH_FS,
            zIndex: 50,
            ...needMemoriesHintBubbleStyleFs,
          }}
          pointerEvents="none"
        >
          <ThemedText
            style={{
              fontSize: 11,
              color: "#FFFFFF",
              textAlign: "center",
              lineHeight: 15,
            }}
          >
            {t("sferaInsight.needMemoriesFirst")}
          </ThemedText>
        </View>
      ) : null}
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

const SPHERE_CONTAINER_SIZE = scaleFocused(320); // Fits orbit extent
// Debug tuning: eased timing gives gentler start and better visual sync between outgoing/incoming sferas.
const ORBIT_TRANSITION_DURATION_MS = 650;

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
  onSingleTapSameAsFocusedSphere,
  onNeedMemoriesHint,
  needMemoriesHintEntityId,
  onPulse,
  colorScheme,
  sunnyPercentage,
  orbitDurationMs = DEFAULT_ENTITY_ORBIT_DURATION_MS,
  singleTapWhenFocused = false,
  sunExpanded,
  isInitialView = false,
  isSunMenuOpen = false,
  individualModeScale = 1,
  entityAvatarScale = 1,
  animationsEnabled = true,
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
  onSingleTapSameAsFocusedSphere?: () => void;
  onNeedMemoriesHint?: (entityId: string) => void;
  needMemoriesHintEntityId: string | null;
  onPulse?: (trigger: () => void) => void;
  colorScheme: "light" | "dark";
  sunnyPercentage: number;
  orbitDurationMs?: number;
  singleTapWhenFocused?: boolean;
  sunExpanded: SharedValue<number>;
  isInitialView?: boolean;
  /** When sun menu is expanded: hide spheres completely and block taps. */
  isSunMenuOpen?: boolean;
  /** Additional scale for selected-sfera mode (iPad only). */
  individualModeScale?: number;
  /** Additional scale for orbiting entity avatars in selected-sfera mode (iPad only). */
  entityAvatarScale?: number;
  animationsEnabled?: boolean;
}) {
  const { isTablet } = useLargeDevice();
  const target = getSphereTarget(sphereIdx, focusedIdx);
  const isFocused = sphereIdx === focusedIdx;
  const slot = (sphereIdx - focusedIdx + 5) % 5;
  const rotateOrbitGate = isFocused && animationsEnabled && isInitialView;

  const [randomPulseIndex, setRandomPulseIndex] = useState<number | null>(null);

  // Periodically pick a random entity to pulse (only when focused)
  const entityCount = Math.min(entityIds.length, ORBIT_MAX_FLOATING_ENTITIES);
  useEffect(() => {
    if (!animationsEnabled || !isFocused || entityCount === 0) {
      setRandomPulseIndex(null);
      return;
    }
    const id = setInterval(() => {
      setRandomPulseIndex(Math.floor(Math.random() * entityCount));
    }, RANDOM_ENTITY_PULSE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isFocused, entityCount, animationsEnabled]);

  const angle = useSharedValue(target.angle);
  const size = useSharedValue(target.size);
  const focusProgress = useSharedValue(isFocused ? 1 : 0);
  const momentsVisibilityProgress = useSharedValue(isFocused ? 1 : 0);
  const initialEntityMetrics = getEntityRingMetrics(
    target.size,
    isFocused,
    slot,
    entityAvatarScale,
  );
  const entityAvatarSizeSv = useSharedValue(initialEntityMetrics.entityAvatarSize);
  const orbitRadiusSv = useSharedValue(initialEntityMetrics.orbitRadius);
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
    if (!animationsEnabled) {
      cancelAnimation(spherePulseScale);
      spherePulseScale.value = 1;
      return;
    }
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
  }, [isFocused, spherePulseScale, animationsEnabled]);

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

  useLayoutEffect(() => {
    const next = getSphereTarget(sphereIdx, focusedIdx);
    const nextIsFocused = sphereIdx === focusedIdx;
    const nextSlot = (sphereIdx - focusedIdx + 5) % 5;
    const nextEntityMetrics = getEntityRingMetrics(
      next.size,
      nextIsFocused,
      nextSlot,
      entityAvatarScale,
    );
    cancelAnimation(angle);
    cancelAnimation(size);
    cancelAnimation(entityAvatarSizeSv);
    cancelAnimation(orbitRadiusSv);
    // Normalize current angle to [0, 360) to avoid drift after many cycles
    const raw = angle.value;
    const normalized = ((raw % 360) + 360) % 360;
    let delta = next.angle - normalized;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    const targetAngle = raw + delta;
    angle.value = withTiming(targetAngle, {
      duration: ORBIT_TRANSITION_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    }, (finished) => {
      "worklet";
      if (finished) {
        const v = angle.value;
        angle.value = ((v % 360) + 360) % 360;
      }
    });
    size.value = withTiming(next.size, {
      duration: ORBIT_TRANSITION_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    });
    entityAvatarSizeSv.value = withTiming(nextEntityMetrics.entityAvatarSize, {
      duration: ORBIT_TRANSITION_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    });
    orbitRadiusSv.value = withTiming(nextEntityMetrics.orbitRadius, {
      duration: ORBIT_TRANSITION_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [
    sphereIdx,
    focusedIdx,
    angle,
    size,
    entityAvatarScale,
    entityAvatarSizeSv,
    orbitRadiusSv,
  ]);

  useLayoutEffect(() => {
    cancelAnimation(focusProgress);
    if (isFocused) {
      focusProgress.value = withTiming(1, {
        duration: 480,
        easing: Easing.inOut(Easing.quad),
      });
    } else {
      // Start dimming shortly after movement begins so outgoing focused sphere does not "drop" immediately.
      focusProgress.value = withDelay(
        120,
        withTiming(0, {
          duration: 620,
          easing: Easing.inOut(Easing.quad),
        }),
      );
    }
  }, [isFocused, focusProgress]);

  useLayoutEffect(() => {
    // Keep clouds/suns fade synced with motion start (no extra delay).
    cancelAnimation(momentsVisibilityProgress);
    momentsVisibilityProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: 520,
      easing: Easing.inOut(Easing.quad),
    });
  }, [isFocused, momentsVisibilityProgress]);

  const CONTAINER_HALF = SPHERE_CONTAINER_SIZE / 2;

  const containerStyle = useAnimatedStyle(() => {
    const totalAngle = angle.value;
    const normalizedAngle = ((totalAngle % 360) + 360) % 360;
    const rad = (totalAngle * Math.PI) / 180;
    const centerX = ORBIT_CX + ORBIT_R * Math.sin(rad);
    const centerY = ORBIT_CY + ORBIT_R * Math.cos(rad);
    // Depth from actual position on orbit (angle), not from slot — avoids "grow then move" pop on swipe
    // cos(rad)=1 at bottom (front), -1 at top (back). Smooth scale as spheres slide along orbit.
    const x = (1 + Math.cos(rad)) / 2;
    const depthScale = 0.38 + 0.62 * Math.sqrt(Math.max(0, x));
    // Shift back-half spheres up continuously so depth transition doesn't snap.
    const backOffsetY = -48 * Math.max(0, -Math.cos(rad));
    // Continuous slot-style offset across orbit, inlined to avoid any non-worklet call.
    let orbitStyleOffsetY = 0;
    if (normalizedAngle < 72) {
      orbitStyleOffsetY = (normalizedAngle / 72) * -58;
    } else if (normalizedAngle < 144) {
      orbitStyleOffsetY = -58 + ((normalizedAngle - 72) / 72) * 18;
    } else if (normalizedAngle < 216) {
      orbitStyleOffsetY = -40 + ((normalizedAngle - 144) / 72) * 40;
    } else if (normalizedAngle < 288) {
      orbitStyleOffsetY = ((normalizedAngle - 216) / 72) * -28;
    } else {
      orbitStyleOffsetY = -28 + ((normalizedAngle - 288) / 72) * 28;
    }
    // When sun menu is open: scale to 0 and fully hide (0.94 left ~6% visible — too noticeable)
    const sunShrink = 1 - sunExpanded.value;
    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: SPHERE_CONTAINER_SIZE,
      height: SPHERE_CONTAINER_SIZE,
      opacity: 1 - sunExpanded.value,
      transform: [
        { translateX: centerX - CONTAINER_HALF },
        {
          translateY:
            centerY -
            CONTAINER_HALF +
            backOffsetY +
            orbitStyleOffsetY,
        },
        { scale: depthScale * sunShrink * individualModeScale },
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

  const sphereStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: CONTAINER_HALF - size.value / 2,
    top: CONTAINER_HALF - size.value / 2,
    width: size.value,
    height: size.value,
    opacity: interpolate(
      focusProgress.value,
      [0, 1],
      [isInitialView ? 0.55 : 0.8, 1],
      Extrapolation.CLAMP,
    ),
    transform: [{ scale: spherePulseScale.value * firstTapFeedbackScale.value }],
  }));

  const sphereVisualStyle = useAnimatedStyle(() => {
    const darkFocus = colorScheme === "dark" ? focusProgress.value : 0;
    return {
      shadowOpacity:
        colorScheme === "dark"
          ? 0.5 + 0.25 * darkFocus
          : 0.25,
      shadowRadius:
        colorScheme === "dark"
          ? (isTablet ? 16 : 12) + (isTablet ? 12 : 10) * darkFocus
          : isTablet ? 16 : 12,
      shadowOffset: {
        width: 0,
        height: colorScheme === "dark" ? (1 - darkFocus) * (isTablet ? 4 : 3) : isTablet ? 4 : 3,
      },
    };
  });

  const entityRingStyle = useAnimatedStyle(() => {
    return { opacity: 1 - sunExpanded.value };
  });

  const iconWrapStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
    opacity: interpolate(focusProgress.value, [0, 1], [0.62, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: Math.max(0.42, size.value / FOCUSED_SIZE),
      },
    ],
  }));

  const desaturationOverlayStyle = useAnimatedStyle(() => ({
    opacity: (1 - focusProgress.value) * 0.65,
  }));

  const neonLayerStyle = useAnimatedStyle(() => ({
    opacity: colorScheme === "dark" ? focusProgress.value : 0,
  }));

  const classicLayerStyle = useAnimatedStyle(() => ({
    opacity: colorScheme === "dark" ? 1 - focusProgress.value : 1,
  }));

  const specularStyle = useAnimatedStyle(() => ({
    opacity: colorScheme === "dark" ? 1 - focusProgress.value : 1,
  }));

  const iconBaseStyle = useAnimatedStyle(() => ({
    opacity: colorScheme === "dark" ? 1 - focusProgress.value : 1,
  }));

  const iconFocusedStyle = useAnimatedStyle(() => ({
    opacity: colorScheme === "dark" ? focusProgress.value : 0,
  }));

  return (
    <Animated.View
      style={containerStyle}
      pointerEvents={isSunMenuOpen ? "none" : "auto"}
    >
      {/* Tight tap target for unfocused spheres — sits over the visual only. */}
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
          // Keep this constant; visual fade is handled by animated focusProgress.
          opacity: 1,
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
              shadowColor: colorScheme === "dark" ? SPHERE_NEON[sphere.type].glow : "#000",
              elevation: 10,
            },
            sphereVisualStyle,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, classicLayerStyle]}
          >
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
          </Animated.View>
          {colorScheme === "dark" && (
            <Animated.View
              pointerEvents="none"
              style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, neonLayerStyle]}
            >
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
            </Animated.View>
          )}
          {/* Specular highlight - bright ellipse top-left for glossy 3D effect */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: "18%",
                top: "18%",
                width: "28%",
                height: "28%",
                borderRadius: 100,
                backgroundColor: "rgba(255,255,255,0.45)",
              },
              specularStyle,
            ]}
          />
          {/* Desaturation overlay for unfocused spheres — washes out color to grey */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                borderRadius: 1000,
                backgroundColor: "rgba(20,26,46,0.65)",
              },
              desaturationOverlayStyle,
            ]}
          />
          <Animated.View pointerEvents="none" style={iconWrapStyle}>
            {colorScheme !== "dark" && (
              <MaterialIcons
                name={sphere.icon as any}
                size={FOCUSED_ICON_SIZE}
                color={iconColor}
                style={{ pointerEvents: "none" }}
              />
            )}
            {colorScheme === "dark" && (
              <Animated.View pointerEvents="none" style={iconFocusedStyle}>
                <MaterialIcons
                  name={sphere.icon as any}
                  size={FOCUSED_ICON_SIZE}
                  color={SPHERE_NEON[sphere.type].core}
                  style={{ pointerEvents: "none" }}
                />
              </Animated.View>
            )}
            {colorScheme === "dark" && (
              <Animated.View
                pointerEvents="none"
                style={[{ position: "absolute" }, iconBaseStyle]}
              >
                <MaterialIcons
                  name={sphere.icon as any}
                  size={FOCUSED_ICON_SIZE}
                  color={iconColor}
                  style={{ pointerEvents: "none" }}
                />
              </Animated.View>
            )}
          </Animated.View>
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
            onSingleTapSameAsFocusedSphere={onSingleTapSameAsFocusedSphere}
            onNeedMemoriesHint={onNeedMemoriesHint}
            needMemoriesHintEntityId={needMemoriesHintEntityId}
            sphere={sphere.type}
            centerX={CONTAINER_HALF}
            centerY={CONTAINER_HALF}
            orbitRadius={orbitRadiusSv}
            avatarSize={entityAvatarSizeSv}
            avatarSizeFallback={initialEntityMetrics.entityAvatarSize}
            glowColor={shadowColor}
            isFocused={isFocused}
            momentsVisibility={momentsVisibilityProgress}
            rotateOrbit={rotateOrbitGate}
            orbitDurationMs={orbitDurationMs}
            randomPulseIndex={randomPulseIndex}
            animationsEnabled={animationsEnabled}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// Cosmic chrome (Sfera insight empty state, overall avatar labels, etc.)
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

// ───────────────────── Sfera Insight Card ─────────────────────

const INSIGHT_CARD_SIZE = scaleFocused(120);

const SferaInsightCard = React.memo(function SferaInsightCard({
  sphere,
  entityIds,
  entityNames,
  entityMemories,
  onEntitySelect,
  onNeedMemoriesHintCenter,
  showNeedMemoriesHintBelowCard,
  colorScheme,
  shadowColor,
  x,
  y,
  sizeScale = 1,
  isVisible = true,
}: {
  sphere: LifeSphere;
  entityIds: string[];
  entityNames: string[];
  entityMemories: IdealizedMemory[][];
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
  onNeedMemoriesHintCenter?: () => void;
  showNeedMemoriesHintBelowCard?: boolean;
  colorScheme: "light" | "dark";
  shadowColor: string;
  x: number;
  y: number;
  sizeScale?: number;
  isVisible?: boolean;
}) {
  const t = useTranslate();
  const [mode, setMode] = useState(0);
  const modeOpacity = useSharedValue(1);
  const lastTapRef = useRef(0);
  const progress = useSharedValue(0);

  const numEntities = entityIds.length;
  const totalMemoriesCount = useMemo(
    () => entityMemories.reduce((sum, mems) => sum + mems.length, 0),
    [entityMemories],
  );

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

  // Auto-cycle every 5 seconds with progress bar
  useEffect(() => {
    if (!isVisible || numEntities === 0) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 5000 }, (finished) => {
      if (finished) {
        runOnJS(cycleModeRef.current)(1);
      }
    });
    return () => {
      cancelAnimation(progress);
    };
  }, [mode, numEntities, progress, isVisible]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

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
  const cardSize = INSIGHT_CARD_SIZE * sizeScale;

  const wrapperStyle = {
    position: "absolute" as const,
    left: x - cardSize / 2,
    top: y - cardSize / 2,
    width: cardSize,
    height: cardSize,
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
            {sphere === "relationships"
              ? t("sferaInsight.addPeopleAndMemories")
              : t("sferaInsight.addMemories")}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    );
  }

  // Entities exist but no memories yet — avoid misleading mode titles (e.g. "Most recently done")
  if (totalMemoriesCount === 0) {
    const zeroOuter = {
      ...wrapperStyle,
      overflow: "visible" as const,
      minHeight: cardSize + (showNeedMemoriesHintBelowCard ? 48 : 0),
      height: undefined as number | undefined,
    };
    return (
      <View style={zeroOuter}>
        <Pressable style={{ width: cardSize }} onPress={() => onNeedMemoriesHintCenter?.()}>
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
              minHeight: cardSize,
            }}
          >
            <MaterialIcons name="add-photo-alternate" size={26} color={shadowColor} />
            <ThemedText
              style={{
                color: COSMIC_TEXT,
                fontSize: 11,
                textAlign: "center",
                marginTop: 8,
                fontWeight: "600",
              }}
            >
              {t("sferaInsight.addMemories")}
            </ThemedText>
          </LinearGradient>
        </Pressable>
        {showNeedMemoriesHintBelowCard ? (
          <View
            style={{
              alignSelf: "center",
              marginTop: 8,
              ...needMemoriesHintBubbleStyleFs,
            }}
            pointerEvents="none"
          >
            <ThemedText
              style={{
                fontSize: 11,
                color: COSMIC_TEXT,
                textAlign: "center",
                lineHeight: 15,
              }}
            >
              {t("sferaInsight.needMemoriesFirst")}
            </ThemedText>
          </View>
        ) : null}
      </View>
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
    if (entityId) {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < 300;
      lastTapRef.current = now;
      if (isDoubleTap) {
        const mems = entityMemories[entityIdx] ?? [];
        if (mems.length === 0) {
          onNeedMemoriesHintCenter?.();
          return;
        }
        onEntitySelect(entityId, sphere);
      }
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        left: x - cardSize / 2,
        top: y - cardSize / 2,
        zIndex: 25,
        overflow: "visible",
        alignItems: "center",
      }}
      pointerEvents="box-none"
    >
    <Pressable style={{ width: cardSize, height: cardSize }} onPress={handleEntityTap} {...swipePanResponder.panHandlers}>
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
          overflow: "hidden",
        }}
      >
        {/* Auto-cycle progress bar */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: shadowColor + "33" }}>
          <Animated.View style={[{ height: 2, backgroundColor: shadowColor }, progressBarStyle]} />
        </View>

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
            onPress={() => cycleMode()}
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
    {showNeedMemoriesHintBelowCard && totalMemoriesCount > 0 ? (
      <View
        style={{
          marginTop: 8,
          width: NEED_MEMORIES_HINT_WIDTH_FS,
          ...needMemoriesHintBubbleStyleFs,
        }}
        pointerEvents="none"
      >
        <ThemedText
          style={{
            fontSize: 11,
            color: COSMIC_TEXT,
            textAlign: "center",
            lineHeight: 15,
          }}
        >
          {t("sferaInsight.needMemoriesFirst")}
        </ThemedText>
      </View>
    ) : null}
    </View>
  );
});

/** Concentric memory-balance layout (overview) — toggled from the top-right control, not the avatar. */
function MemoryBalanceView({
  memoryBalanceSizeBySphere,
  momentStatsBySphere,
  getSphereSunnyPercentage,
  colorScheme,
  onSpherePress,
}: {
  memoryBalanceSizeBySphere: Record<LifeSphere, number>;
  momentStatsBySphere: Record<LifeSphere, { sunny: number; cloudy: number }>;
  getSphereSunnyPercentage: (sphere: LifeSphere) => number;
  colorScheme: "light" | "dark";
  onSpherePress: (sphereIndex: number, sphereType: LifeSphere) => void;
}) {
  const t = useTranslate();
  return (
    <>
      {SPHERE_LIST.map((sphere, i) => {
        const layout = MEMORY_BALANCE_RING_LAYOUT[i];
        const rad = (layout.angleDeg * Math.PI) / 180;
        const size = memoryBalanceSizeBySphere[sphere.type];
        const rawCenterX = SUN_CENTER_X + Math.cos(rad) * layout.radius;
        const rawCenterY = SUN_CENTER_Y + Math.sin(rad) * layout.radius;
        const safeLeft = size / 2 + 10;
        const safeRight = SW - size / 2 - 10;
        const safeTop = size / 2 + scaleFocused(42);
        const safeBottom = SH - size / 2 - scaleFocused(140);
        const centerX = Math.max(safeLeft, Math.min(safeRight, rawCenterX));
        const centerY = Math.max(safeTop, Math.min(safeBottom, rawCenterY));
        const sunnyPct = getSphereSunnyPercentage(sphere.type);
        const gradient3D = getSphere3DGradientColors(
          sphere.type,
          sunnyPct,
          colorScheme,
        );
        const iconColor = getSphereIconColor(sphere.type, colorScheme, sunnyPct);
        const shadowColor = getSphereShadowColor(sphere.type, colorScheme);
        const stats = momentStatsBySphere[sphere.type];

        return (
          <Pressable
            key={`memory-balance-${sphere.type}`}
            onPress={() => onSpherePress(i, sphere.type)}
            style={{
              position: "absolute",
              left: centerX - size / 2,
              top: centerY - size / 2,
              width: size,
              height:
                size +
                MEMORY_BALANCE_NAME_GAP +
                MEMORY_BALANCE_NAME_BELOW +
                MEMORY_BALANCE_STATS_MARGIN_TOP +
                MEMORY_BALANCE_STATS_BELOW,
              alignItems: "center",
              zIndex: 16,
            }}
            hitSlop={8}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: colorScheme === "dark" ? shadowColor : "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 14,
                elevation: 12,
              }}
            >
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                style={{ position: "absolute" }}
                pointerEvents="none"
              >
                <Defs>
                  <RadialGradient
                    id={`memory-balance-sphere-${sphere.type}`}
                    cx="50"
                    cy="50"
                    r="50"
                    fx="32"
                    fy="32"
                    gradientUnits="userSpaceOnUse"
                  >
                    <Stop offset="0%" stopColor={gradient3D.highlight} stopOpacity="1" />
                    <Stop offset="38%" stopColor={gradient3D.base} stopOpacity="1" />
                    <Stop offset="100%" stopColor={gradient3D.shadow} stopOpacity="1" />
                  </RadialGradient>
                </Defs>
                <SvgCircle
                  cx="50"
                  cy="50"
                  r="50"
                  fill={`url(#memory-balance-sphere-${sphere.type})`}
                />
              </Svg>
              <MaterialIcons
                name={sphere.icon as keyof typeof MaterialIcons.glyphMap}
                size={Math.round(size * 0.33)}
                color={iconColor}
              />
            </View>
            <ThemedText
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                marginTop: MEMORY_BALANCE_NAME_GAP,
                width: size + scaleFocused(8),
                fontSize: scaleFocused(10),
                lineHeight: scaleFocused(13),
                fontWeight: "600",
                textAlign: "center",
                color: colorScheme === "dark" ? "#E8EEF4" : "#1E2830",
                opacity: 0.95,
              }}
            >
              {t(SPHERE_DISPLAY_NAME_KEY[sphere.type])}
            </ThemedText>
            <View
              style={{
                marginTop: MEMORY_BALANCE_STATS_MARGIN_TOP,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: MEMORY_BALANCE_STATS_ROW_GAP,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: MEMORY_BALANCE_STATS_ICON_TEXT_GAP,
                  }}
                >
                  <MaterialIcons
                    name="wb-sunny"
                    size={MEMORY_BALANCE_STATS_ICON_SIZE}
                    color="#FDD835"
                  />
                  <ThemedText
                    style={{
                      fontSize: MEMORY_BALANCE_STATS_TEXT_SIZE,
                      color: "#FFFFFF",
                      opacity: 0.9,
                    }}
                  >
                    {stats.sunny}
                  </ThemedText>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: MEMORY_BALANCE_STATS_ICON_TEXT_GAP,
                  }}
                >
                  <MaterialIcons
                    name="cloud"
                    size={MEMORY_BALANCE_STATS_ICON_SIZE}
                    color="#90A4AE"
                  />
                  <ThemedText
                    style={{
                      fontSize: MEMORY_BALANCE_STATS_TEXT_SIZE,
                      color: "#FFFFFF",
                      opacity: 0.9,
                    }}
                  >
                    {stats.cloudy}
                  </ThemedText>
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

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
  initialSunMenuExpanded = false,
  onSunMenuExpandedChange,
  onIntroComplete,
  sferaDataReady = true,
  sunMenuCollapseActionRef,
  bottomTabBarInset = 0,
  sferaSizeHint,
  onFocusedDisplayModeForHint,
  notificationLessonTarget = null,
  onNotificationLessonTargetHandled,
}: FocusedSferaViewProps) {
  const isScreenFocused = useIsFocused();
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setIsAppActive(nextAppState === "active");
    });
    return () => subscription.remove();
  }, []);

  const animationsEnabled = isScreenFocused && !hidden && isAppActive;
  const overviewAnimationsEnabled = animationsEnabled && selectedSphere === null;

  const orbitEntityDataBySphere = useMemo(() => {
    const result = {} as Record<
      LifeSphere,
      {
        entityIds: string[];
        imageUris: string[];
        entityNames: string[];
        memoriesPerEntity: IdealizedMemory[][];
      }
    >;
    for (const { type } of SPHERE_LIST) {
      result[type] = pickOrbitEntitiesBySunnyScore(
        entityIdsBySphere[type] ?? [],
        entityImageUrisBySphere[type] ?? [],
        entityNamesBySphere[type] ?? [],
        memoriesPerEntityBySphere[type] ?? [],
        ORBIT_MAX_FLOATING_ENTITIES,
      );
    }
    return result;
  }, [
    entityIdsBySphere,
    entityImageUrisBySphere,
    entityNamesBySphere,
    memoriesPerEntityBySphere,
  ]);

  const insets = useSafeAreaInsets();
  const { appUsabilityHints } = useVisualSettings();
  const focusedSpherePulseRef = useRef<(() => void) | null>(null);
  const focusedSphereTapTimeRef = useRef<number>(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoriesHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayMode, setDisplayMode] = useState<"defaultOrbit" | "memoryBalanceRings">(
    "defaultOrbit",
  );
  const [displayModeHydrated, setDisplayModeHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(FOCUSED_DISPLAY_MODE_STORAGE_KEY);
        if (cancelled) return;
        if (raw === "memoryBalanceRings" || raw === "defaultOrbit") {
          setDisplayMode(raw);
        }
      } finally {
        if (!cancelled) {
          setDisplayModeHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!displayModeHydrated) return;
    void AsyncStorage.setItem(FOCUSED_DISPLAY_MODE_STORAGE_KEY, displayMode);
  }, [displayMode, displayModeHydrated]);

  useEffect(() => {
    if (!displayModeHydrated) return;
    onFocusedDisplayModeForHint?.(displayMode === "memoryBalanceRings");
  }, [displayModeHydrated, displayMode, onFocusedDisplayModeForHint]);

  const [memoriesHint, setMemoriesHint] = useState<
    | null
    | { place: "orbit"; entityId: string }
    | { place: "insightCard" }
  >(null);

  const clearMemoriesHintTimer = useCallback(() => {
    if (memoriesHintTimerRef.current) {
      clearTimeout(memoriesHintTimerRef.current);
      memoriesHintTimerRef.current = null;
    }
  }, []);

  const showOrbitNeedMemoriesHint = useCallback(
    (entityId: string) => {
      clearMemoriesHintTimer();
      setMemoriesHint({ place: "orbit", entityId });
      memoriesHintTimerRef.current = setTimeout(() => {
        setMemoriesHint(null);
        memoriesHintTimerRef.current = null;
      }, 4500);
    },
    [clearMemoriesHintTimer],
  );

  const showInsightCardNeedMemoriesHint = useCallback(() => {
    clearMemoriesHintTimer();
    setMemoriesHint({ place: "insightCard" });
    memoriesHintTimerRef.current = setTimeout(() => {
      setMemoriesHint(null);
      memoriesHintTimerRef.current = null;
    }, 4500);
  }, [clearMemoriesHintTimer]);

  useEffect(
    () => () => {
      clearMemoriesHintTimer();
    },
    [clearMemoriesHintTimer],
  );

  const orbitNeedMemoriesHintEntityId =
    memoriesHint?.place === "orbit" ? memoriesHint.entityId : null;
  const showInsightCardNeedMemoriesHintFlag =
    memoriesHint?.place === "insightCard";

  const [focusedIdx, setFocusedIdx] = useState(initialFocusedIdx);
  const N = SPHERE_LIST.length;
  // Keep root aligned with TabScreenContainer; we shift spheres via ORBIT_CY instead.
  const rootMarginTop = 0;

  // Sun expanded state: 0 = collapsed, 1 = expanded (spheres shrink, action buttons appear)
  const startSunExpanded = initialSunMenuExpanded;
  const sunExpanded = useSharedValue(startSunExpanded ? 1 : 0);
  const [isSunExpanded, setIsSunExpanded] = useState(startSunExpanded);
  const handledNotificationLessonTargetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!notificationLessonTarget?.key) return;
    if (
      handledNotificationLessonTargetKeyRef.current === notificationLessonTarget.key
    ) {
      return;
    }
    handledNotificationLessonTargetKeyRef.current = notificationLessonTarget.key;
    const p: Record<string, string> = {
      nudgeKey: notificationLessonTarget.key,
    };
    if (notificationLessonTarget.lessonId) p.lessonId = notificationLessonTarget.lessonId;
    if (notificationLessonTarget.memoryId) p.memoryId = notificationLessonTarget.memoryId;
    if (notificationLessonTarget.entityId) p.entityId = notificationLessonTarget.entityId;
    if (notificationLessonTarget.sphere) p.sphere = notificationLessonTarget.sphere;
    if (notificationLessonTarget.text) p.text = notificationLessonTarget.text;
    router.push({ pathname: "/(tabs)/lessons", params: p });
    onNotificationLessonTargetHandled?.(notificationLessonTarget.key);
  }, [notificationLessonTarget, onNotificationLessonTargetHandled]);

  /** Hide top-right memory-balance toggle as soon as central avatar press starts (before sun menu state updates). */
  const [hideMemoryBalanceToggleForAvatar, setHideMemoryBalanceToggleForAvatar] =
    useState(false);
  const isSunExpandedRef = useRef(isSunExpanded);
  useEffect(() => {
    isSunExpandedRef.current = isSunExpanded;
  }, [isSunExpanded]);
  useEffect(() => {
    if (selectedSphere !== null) setHideMemoryBalanceToggleForAvatar(false);
  }, [selectedSphere]);

  useEffect(() => {
    onSunMenuExpandedChange?.(isSunExpanded);
  }, [isSunExpanded, onSunMenuExpandedChange]);

  // Gated on splash + journey data: same as the old "skip intro" path (no sun celebration on cold start).
  const [sunLoadComplete, setIntroComplete] = useState(selectedSphere !== null);
  const markIntroComplete = useCallback(() => {
    setIntroComplete(true);
    onIntroComplete?.();
  }, [onIntroComplete]);

  const handleSunPress = useCallback(() => {
    const next = !isSunExpanded;
    setIsSunExpanded(next);
    if (next) {
      sunExpanded.value = withSpring(1, { damping: 14, stiffness: 120 });
    } else {
      sunExpanded.value = withSpring(0, { damping: 14, stiffness: 120 });
    }
  }, [isSunExpanded, sunExpanded]);

  /** Fades / scales Memory Balance sferas with the sun menu (same `sunExpanded` spring as orbit sferas). */
  const memoryBalanceLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sunExpanded.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(sunExpanded.value, [0, 1], [1, 0.93], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(
          sunExpanded.value,
          [0, 1],
          [0, MEMORY_BALANCE_MENU_HIDE_DRIFT_Y],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  useEffect(() => {
    setFocusedIdx(initialFocusedIdx);
  }, [initialFocusedIdx]);

  const sunLoadStartedRef = useRef(false);
  useEffect(() => {
    if (!splashDone || sunLoadStartedRef.current) return;
    if (selectedSphere === null && overallSunnyPercentage === 0) {
      if (!sferaDataReady) return;
      sunLoadStartedRef.current = true;
      markIntroComplete();
      return;
    }
    sunLoadStartedRef.current = true;
    markIntroComplete();
  }, [splashDone, sferaDataReady, selectedSphere, overallSunnyPercentage, markIntroComplete]);

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
        // Only capture in side regions so taps on center entity avatars are never stolen.
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
  const focusedSphere = SPHERE_LIST[focusedIdx];
  const isMemoryBalanceMode =
    selectedSphere === null && displayMode === "memoryBalanceRings";
  const individualModeScale =
    selectedSphere !== null ? IPAD_INDIVIDUAL_SFERA_SCALE : 1;
  const individualCardScale =
    selectedSphere !== null ? IPAD_INDIVIDUAL_CARD_SCALE : 1;
  const individualEntityAvatarScale =
    selectedSphere !== null ? IPAD_INDIVIDUAL_ENTITY_AVATAR_SCALE : 1;
  const focusedTapSize = FOCUSED_SIZE * individualModeScale;
  const focusedLabelTop = IS_IPAD
    ? Math.min(
        ORBIT_CY + ORBIT_R + FOCUSED_LABEL_GAP * 3.4,
        SH - scaleFocused(120),
      )
    : ORBIT_CY + ORBIT_R + FOCUSED_LABEL_GAP * 5.5;
  /** Top edge of the band where the sfera-size hint may sit (below label row / rings, above tab bar). */
  const sferaSizeHintBandTop = useMemo(() => {
    if (selectedSphere !== null) return SH;
    if (isMemoryBalanceMode) {
      return SH * SFERA_HINT_MB_BAND_TOP_FRAC;
    }
    return Math.min(
      focusedLabelTop + scaleFocused(56),
      SH * 0.76,
    );
  }, [selectedSphere, isMemoryBalanceMode, focusedLabelTop]);
  const focusedShadowColor = getSphereShadowColor(
    focusedSphere.type,
    colorScheme,
  );

  const memoryCountBySphere = useMemo(() => {
    const result = {} as Record<LifeSphere, number>;
    SPHERE_LIST.forEach(({ type }) => {
      const entityMemories = memoriesPerEntityBySphere[type] ?? [];
      result[type] = entityMemories.reduce(
        (total, memories) => total + memories.length,
        0,
      );
    });
    return result;
  }, [memoriesPerEntityBySphere]);

  const memoryBalanceSizeBySphere = useMemo(() => {
    const maxAllowed = Math.min(MEMORY_BALANCE_MAX_SIZE, SW * 0.32);
    const minAllowed = Math.min(MEMORY_BALANCE_MIN_SIZE, maxAllowed * 0.65);
    const counts = SPHERE_LIST.map(({ type }) => memoryCountBySphere[type]);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const sameCounts = maxCount === minCount;
    const fallbackSize = (minAllowed + maxAllowed) / 2;
    const result = {} as Record<LifeSphere, number>;

    SPHERE_LIST.forEach(({ type }) => {
      const count = memoryCountBySphere[type];
      if (sameCounts) {
        result[type] = fallbackSize;
        return;
      }
      const ratio = (count - minCount) / (maxCount - minCount);
      result[type] =
        minAllowed + ratio * (maxAllowed - minAllowed);
    });

    return result;
  }, [memoryCountBySphere]);

  const momentStatsBySphere = useMemo(() => {
    const result = {} as Record<LifeSphere, { sunny: number; cloudy: number }>;

    SPHERE_LIST.forEach(({ type }) => {
      const entityMemories = memoriesPerEntityBySphere[type] ?? [];
      let sunny = 0;
      let cloudy = 0;

      entityMemories.forEach((memories) => {
        memories.forEach((memory) => {
          sunny += (memory.goodFacts || []).length;
          cloudy += (memory.hardTruths || []).length;
        });
      });

      result[type] = { sunny, cloudy };
    });

    return result;
  }, [memoriesPerEntityBySphere]);

  // Collapse sun expanded state and centering together
  const handleCollapseSun = useCallback(() => {
    setHideMemoryBalanceToggleForAvatar(false);
    if (isSunExpanded) handleSunPress();
  }, [isSunExpanded, handleSunPress]);

  const handleAvatarPressInHideMemoryBalance = useCallback(() => {
    if (selectedSphere === null && hasMemories) {
      setHideMemoryBalanceToggleForAvatar(true);
    }
  }, [selectedSphere, hasMemories]);

  const handleAvatarPressOutRestoreMemoryBalance = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isSunExpandedRef.current) {
          setHideMemoryBalanceToggleForAvatar(false);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!sunMenuCollapseActionRef) return;
    sunMenuCollapseActionRef.current = () => {
      handleCollapseSun();
    };
    return () => {
      sunMenuCollapseActionRef.current = null;
    };
  }, [handleCollapseSun, sunMenuCollapseActionRef]);

  // When circle avatar is pressed:
  // - Initial view: open Sfera Insights (wheel of life)
  // - Individual sfera view: clear selection to return to initial view
  const handleCircleAvatarPress = useCallback(() => {
    if (!sunLoadComplete) return;
    if (selectedSphere === null) {
      if (isSunExpanded) {
        handleCollapseSun();
      } else {
        onInsightsPress?.();
      }
    } else {
      if (onClearSelection) {
        onClearSelection();
      } else {
        onSwitchToClassic();
      }
    }
  }, [
    selectedSphere,
    isSunExpanded,
    onClearSelection,
    onSwitchToClassic,
    onInsightsPress,
    sunLoadComplete,
    handleCollapseSun,
  ]);

  const { momentColors } = useMomentColors();
  const avatarSizeForDots = scaleFocused(100);
  const avatarCenterX = SW / 2;
  const avatarCenterY = SH * 0.48;

  const leftChevronScale = useSharedValue(1);
  const rightChevronScale = useSharedValue(1);
  const memoryBalanceToggleScale = useSharedValue(1);
  const hintOpacity = useSharedValue(0);

  const showDoubleTapHint = useCallback(() => {
    if (!appUsabilityHints) return;
    cancelAnimation(hintOpacity);
    hintOpacity.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
      withDelay(1200, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })),
    );
  }, [appUsabilityHints, hintOpacity]);

  /** Same timing as the absolute focused-sphere overlay: pulse + global hint on first tap; second tap opens sphere. Orbiting entities call this on single tap. */
  const handleFocusedSphereTapOverlay = useCallback(() => {
    if (!sunLoadComplete) return;
    if (isSunExpanded) {
      handleCollapseSun();
      return;
    }
    if (selectedSphere !== null) {
      onAddMemoriesPress?.();
      return;
    }
    const now = Date.now();
    const elapsed = now - focusedSphereTapTimeRef.current;
    if (elapsed < 350 && elapsed > 0) {
      focusedSphereTapTimeRef.current = 0;
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
      onSphereSelect(SPHERE_LIST[focusedIdx].type);
    } else {
      focusedSphereTapTimeRef.current = now;
      focusedSpherePulseRef.current?.();
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => {
        hintTimerRef.current = null;
        showDoubleTapHint();
      }, 350);
    }
  }, [
    sunLoadComplete,
    isSunExpanded,
    handleCollapseSun,
    selectedSphere,
    onAddMemoriesPress,
    focusedIdx,
    onSphereSelect,
    showDoubleTapHint,
  ]);

  const resolveEntitySelectForSphere = useCallback(
    (sphereIndex: number) => {
      return (entityId: string, s: LifeSphere) => {
        if (hintTimerRef.current) {
          clearTimeout(hintTimerRef.current);
          hintTimerRef.current = null;
        }
        focusedSphereTapTimeRef.current = 0;

        const ids = entityIdsBySphere[s] ?? [];
        const entityIdx = ids.indexOf(entityId);
        const memoriesForEntity =
          entityIdx >= 0
            ? (memoriesPerEntityBySphere[s]?.[entityIdx] ?? [])
            : [];

        if (
          selectedSphere === null &&
          sphereIndex === focusedIdx &&
          memoriesForEntity.length === 0
        ) {
          showOrbitNeedMemoriesHint(entityId);
        } else if (
          selectedSphere !== null &&
          memoriesForEntity.length === 0
        ) {
          showOrbitNeedMemoriesHint(entityId);
        } else {
          onEntitySelect(entityId, s);
        }
      };
    },
    [
      selectedSphere,
      focusedIdx,
      onEntitySelect,
      showOrbitNeedMemoriesHint,
      entityIdsBySphere,
      memoriesPerEntityBySphere,
    ],
  );

  const handleMemoryBalanceSpherePress = useCallback(
    (sphereIndex: number, sphereType: LifeSphere) => {
      if (!sunLoadComplete) return;
      if (isSunExpanded) {
        handleCollapseSun();
      }
      goToSphere(sphereIndex);
      onSphereSelect(sphereType);
    },
    [goToSphere, handleCollapseSun, isSunExpanded, onSphereSelect, sunLoadComplete],
  );

  const handleMemoryBalanceToggle = useCallback(() => {
    if (!sunLoadComplete) return;
    if (isSunExpanded) handleCollapseSun();
    setDisplayMode((prev) =>
      prev === "memoryBalanceRings" ? "defaultOrbit" : "memoryBalanceRings",
    );
  }, [sunLoadComplete, isSunExpanded, handleCollapseSun]);

  const doubleTapHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const leftChevronStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leftChevronScale.value }],
  }));
  const rightChevronStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightChevronScale.value }],
  }));
  const memoryBalanceToggleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: memoryBalanceToggleScale.value }],
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
  const memoryBalanceTogglePressIn = useCallback(() => {
    cancelAnimation(memoryBalanceToggleScale);
    memoryBalanceToggleScale.value = withTiming(0.9, {
      duration: 90,
      easing: Easing.out(Easing.ease),
    });
  }, [memoryBalanceToggleScale]);
  const memoryBalanceTogglePressOut = useCallback(() => {
    cancelAnimation(memoryBalanceToggleScale);
    memoryBalanceToggleScale.value = withSpring(1, {
      damping: 12,
      stiffness: 360,
    });
  }, [memoryBalanceToggleScale]);

  if (hidden) {
    return null;
  }

  return (
    <View
      style={[styles.root, { marginTop: rootMarginTop }]}
      {...panResponder.panHandlers}
    >
      <ConstellationBackground
        width={SW}
        height={SH}
        constellationAmount={constellationAmount}
        constellationOpacity={constellationOpacity}
      />

      <BackgroundDecorations />

      {selectedSphere === null &&
        sunLoadComplete &&
        !isSunExpanded &&
        !hideMemoryBalanceToggleForAvatar && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: insets.top + scaleFocused(8),
                right: scaleFocused(12) + insets.right,
                zIndex: 50,
              },
              memoryBalanceToggleStyle,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                isMemoryBalanceMode
                  ? "spheres.memoryBalanceToggleShowOrbitA11y"
                  : "spheres.memoryBalanceToggleShowBalanceA11y",
              )}
              onPress={handleMemoryBalanceToggle}
              onPressIn={memoryBalanceTogglePressIn}
              onPressOut={memoryBalanceTogglePressOut}
              hitSlop={12}
              style={{
                width: scaleFocused(44),
                height: scaleFocused(44),
                borderRadius: scaleFocused(22),
                backgroundColor: "rgba(30, 50, 80, 0.55)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.22)",
                justifyContent: "center",
                alignItems: "center",
                shadowOpacity: 0,
                elevation: 0,
              }}
            >
              <MaterialIcons
                name={isMemoryBalanceMode ? "blur-circular" : "bubble-chart"}
                size={scaleFocused(24)}
                color="rgba(255,255,255,0.92)"
              />
            </Pressable>
          </Animated.View>
      )}

      {/* ─── Sparkled dots scattered across screen ─── */}
      <SparkledDots
        avatarSize={avatarSizeForDots}
        avatarCenterX={avatarCenterX}
        avatarCenterY={avatarCenterY}
        colorScheme={colorScheme}
        sunnyBackground={momentColors.sunny.background}
        animationsEnabled={overviewAnimationsEnabled}
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
        sphereSize={FOCUSED_SIZE * individualModeScale}
        enabled={
          overviewAnimationsEnabled &&
          pulsingAnimations &&
          !isMemoryBalanceMode &&
          !isSunExpanded &&
          sunLoadComplete
        }
      />

      {/* ─── Sfera layer: default orbit or memory-balance concentric rings ─── */}
      {!isMemoryBalanceMode &&
        SPHERE_LIST.map((sphere, i) => (
          <AnimatedSphere
            key={sphere.type}
            sphereIdx={i}
            sphere={sphere}
            focusedIdx={focusedIdx}
            entityUris={orbitEntityDataBySphere[sphere.type].imageUris}
            entityIds={orbitEntityDataBySphere[sphere.type].entityIds}
            entityNames={orbitEntityDataBySphere[sphere.type].entityNames}
            entityMemories={orbitEntityDataBySphere[sphere.type].memoriesPerEntity}
            onPress={() => {
              if (!sunLoadComplete) return;
              if (isSunExpanded) {
                handleCollapseSun();
                return;
              }
              if (i !== focusedIdx) {
                goToSphere(i);
                return;
              }
              if (selectedSphere !== null) {
                onAddMemoriesPress?.();
                return;
              }
              onSphereSelect(sphere.type);
            }}
            onEntitySelect={resolveEntitySelectForSphere(i)}
            onSingleTapSameAsFocusedSphere={
              i === focusedIdx ? handleFocusedSphereTapOverlay : undefined
            }
            onNeedMemoriesHint={showOrbitNeedMemoriesHint}
            needMemoriesHintEntityId={orbitNeedMemoriesHintEntityId}
            colorScheme={colorScheme}
            sunnyPercentage={getSphereSunnyPercentage(sphere.type)}
            orbitDurationMs={orbitDurationMs}
            singleTapWhenFocused={selectedSphere !== null && i === focusedIdx}
            onPulse={
              i === focusedIdx
                ? (fn) => {
                    focusedSpherePulseRef.current = fn;
                  }
                : undefined
            }
            sunExpanded={sunExpanded}
            isInitialView={selectedSphere === null}
            isSunMenuOpen={isSunExpanded}
            individualModeScale={individualModeScale}
            entityAvatarScale={individualEntityAvatarScale}
            animationsEnabled={overviewAnimationsEnabled}
          />
        ))}
      {/* Same timing as orbit sferas: only after initial load gate (splash + data). */}
      {isMemoryBalanceMode && sunLoadComplete && (
        <Animated.View
          pointerEvents={isSunExpanded ? "none" : "auto"}
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 16,
            },
            memoryBalanceLayerStyle,
          ]}
        >
          <MemoryBalanceView
            memoryBalanceSizeBySphere={memoryBalanceSizeBySphere}
            momentStatsBySphere={momentStatsBySphere}
            getSphereSunnyPercentage={getSphereSunnyPercentage}
            colorScheme={colorScheme}
            onSpherePress={handleMemoryBalanceSpherePress}
          />
        </Animated.View>
      )}

      {/* ─── Focused sphere tap target — absolute positioned so iOS hit-testing works (transforms bypass hit rects) ─── */}
      {!isMemoryBalanceMode && (
        <Pressable
          style={{
            position: "absolute",
            left: ORBIT_CX - focusedTapSize / 2,
            top: ORBIT_CY + ORBIT_R - focusedTapSize / 2,
            width: focusedTapSize,
            height: focusedTapSize,
            borderRadius: focusedTapSize / 2,
            zIndex: 13,
          }}
          onPress={handleFocusedSphereTapOverlay}
        />
      )}

      {/* ─── Center: entity insight card (per-sfera) or Sfera Insights hub (overview) ─── */}
      {selectedSphere !== null && (entityIdsBySphere[focusedSphere.type]?.length ?? 0) > 0 ? (
        <SferaInsightCard
          sphere={focusedSphere.type}
          entityIds={entityIdsBySphere[focusedSphere.type] ?? []}
          entityNames={entityNamesBySphere[focusedSphere.type] ?? []}
          entityMemories={memoriesPerEntityBySphere[focusedSphere.type] ?? []}
          onEntitySelect={onEntitySelect}
          onNeedMemoriesHintCenter={showInsightCardNeedMemoriesHint}
          showNeedMemoriesHintBelowCard={showInsightCardNeedMemoriesHintFlag}
          colorScheme={colorScheme}
          shadowColor={focusedShadowColor}
          x={SUN_CENTER_X}
          y={SUN_CENTER_Y}
          sizeScale={individualCardScale}
          isVisible={animationsEnabled && selectedSphere !== null}
        />
      ) : (
        <View
          style={{
            position: "absolute",
            left: SUN_CENTER_X - INSIGHTS_HUB_SIZE / 2,
            top: SUN_CENTER_Y - INSIGHTS_HUB_SIZE / 2,
            width: INSIGHTS_HUB_SIZE,
            height: INSIGHTS_HUB_SIZE,
            zIndex: 20,
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handleCircleAvatarPress}
            onPressIn={handleAvatarPressInHideMemoryBalance}
            onPressOut={handleAvatarPressOutRestoreMemoryBalance}
            accessibilityRole="button"
            accessibilityLabel={t("insights.wheelOfLife.title")}
            accessibilityHint={t("insights.wheelOfLife.subtitle")}
            style={{
              flex: 1,
              borderRadius: INSIGHTS_HUB_SIZE / 2,
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
            <MaterialIcons
              name="insights"
              size={scaleFocused(44)}
              color="#CE93D8"
            />
          </Pressable>
        </View>
      )}

      {/* ─── Focused sfera label + pagination dots (below rotating entities) ─── */}
      {!isMemoryBalanceMode && (
        <View
          style={[
            styles.focusedLabelContainer,
            {
              top: focusedLabelTop,
              opacity: !sunLoadComplete || isSunExpanded ? 0 : 1,
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
      )}

      {/* ─── Double-tap UX hint: soft tooltip below sphere, triggered on single tap ─── */}
      {appUsabilityHints && selectedSphere === null && !isMemoryBalanceMode && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: ORBIT_CX - FOCUSED_SIZE / 2,
              width: FOCUSED_SIZE,
              top: ORBIT_CY + ORBIT_R + scaleFocused(20),
              alignItems: "center",
              zIndex: 20,
            },
            doubleTapHintAnimatedStyle,
          ]}
        >
          <ThemedText style={{
            fontSize: scaleFocused(13),
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

      {/* ─── Sfera size hint: Memory Balance view only (relative ring sizes); not default orbit / single-sphere focus ─── */}
      {selectedSphere === null &&
        isMemoryBalanceMode &&
        sunLoadComplete &&
        sferaSizeHint &&
        bottomTabBarInset > 0 &&
        SH - sferaHintBottomLiftPx(bottomTabBarInset) - sferaSizeHintBandTop >
          scaleFocused(48) && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: sferaSizeHintBandTop,
              bottom: sferaHintBottomLiftPx(bottomTabBarInset),
              justifyContent: "flex-end",
              paddingHorizontal: scaleFocused(16),
              paddingBottom: 0,
              zIndex: 60,
            }}
          >
            {sferaSizeHint}
          </View>
        )}

      {/* ─── Chevron buttons: hidden when sun is expanded or intro is playing ─── */}
      {!isMemoryBalanceMode && !isSunExpanded && sunLoadComplete && (
        <>
          <Animated.View style={[styles.chevron, styles.chevronLeft, leftChevronStyle]}>
            <Pressable
              style={styles.chevronPressable}
              onPressIn={() => chevronPressIn("left")}
              onPressOut={() => chevronPressOut("left")}
              onPress={() => goToSphere((focusedIdx + 1) % N)}
            >
              <MaterialIcons
                name="chevron-left"
                size={scaleFocused(32)}
                color="rgba(255,255,255,0.45)"
              />
            </Pressable>
          </Animated.View>
          <Animated.View style={[styles.chevron, styles.chevronRight, rightChevronStyle]}>
            <Pressable
              style={styles.chevronPressable}
              onPressIn={() => chevronPressIn("right")}
              onPressOut={() => chevronPressOut("right")}
              onPress={() => goToSphere((focusedIdx - 1 + N) % N)}
            >
              <MaterialIcons
                name="chevron-right"
                size={scaleFocused(32)}
                color="rgba(255,255,255,0.45)"
              />
            </Pressable>
          </Animated.View>
        </>
      )}

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
    fontSize: scaleFocused(18),
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
    top: ORBIT_CY + ORBIT_R - scaleFocused(16),
    zIndex: 5,
  },
  chevronLeft: {
    left: scaleFocused(6),
  },
  chevronRight: {
    right: scaleFocused(6),
  },
  chevronPressable: {
    padding: scaleFocused(20),
    justifyContent: "center",
    alignItems: "center",
  },
});
