/**
 * FocusedSferas view — one sphere in focus (large, center-bottom), the rest on orbit.
 * Swipe left/right or use chevrons to change focus. Overview: tap center avatar to open Sfera Insights; in a sfera, tap avatar to leave.
 *
 * All interaction state lives here so the parent home tab does NOT re-render on swipes/interactions.
 */

import {
  ConstellationBackground,
  sampleCornerBiasedPosition,
} from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { SferaInsightEmptyGuideLink } from "@/components/sfera-insight-empty-guide-link";
import { Colors } from "@/constants/theme";
import { useLargeDevice } from "@/hooks/use-large-device";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import {
  ORBIT_MAX_FLOATING_ENTITIES,
  pickOrbitEntitiesBySunnyScore,
} from "@/utils/orbit-entity-pick";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import type { Translations } from "@/utils/languages/translations";
import { FOCUSED_DISPLAY_MODE_STORAGE_KEY } from "@/utils/focused-display-mode-storage";
import { useTranslate } from "@/utils/languages/use-translate";
import { sferaInsightEmptyEntitiesTranslationKey } from "@/utils/sfera-insight-empty-entities";
import { reportCosmicPulseAccentSphere } from "@/utils/cosmic-pulse-accent-sphere";
import {
  getSphere3DGradientColors,
  getSphereIconColor,
  getSphereShadowColor,
  getSphereSferaColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppState,
  Dimensions,
  GestureResponderEvent,
  InteractionManager,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle as SvgCircle,
  Defs,
  Ellipse as SvgEllipse,
  RadialGradient,
  Stop,
} from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");
const IS_IPAD = Platform.OS === "ios" && Platform.isPad;
/** Larger UI on iPad only (iOS iPad); phones unchanged. */
const IPAD_FOCUSED_SCALE = IS_IPAD ? 1.55 : 1;
const IPAD_INDIVIDUAL_SFERA_SCALE = IS_IPAD ? 1.3 : 1;
const IPAD_INDIVIDUAL_CARD_SCALE = IS_IPAD ? 1.45 : 1;
const IPAD_INDIVIDUAL_ENTITY_AVATAR_SCALE = IS_IPAD ? 1.18 : 1;
const scaleFocused = (value: number) => value * IPAD_FOCUSED_SCALE;
const TAP_MAX_DISTANCE_PX = 12;
const TAP_MAX_DURATION_MS = 260;

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

/** Vertical drift when hiding Memory Balance sferas (sun menu open) — worklet-safe constant. */
const MEMORY_BALANCE_MENU_HIDE_DRIFT_Y = scaleFocused(10);
/** Sunny / cloud stats under Memory Balance sferas. */
const MEMORY_BALANCE_STATS_ICON_SIZE = scaleFocused(17);
const MEMORY_BALANCE_STATS_TEXT_SIZE = scaleFocused(13);
const MEMORY_BALANCE_STATS_LINE_HEIGHT = scaleFocused(17);
const MEMORY_BALANCE_STATS_MARGIN_TOP = scaleFocused(6);
const MEMORY_BALANCE_STATS_ROW_GAP = scaleFocused(8);
const MEMORY_BALANCE_STATS_ICON_TEXT_GAP = scaleFocused(4);
const MEMORY_BALANCE_STATS_BELOW = scaleFocused(34);
const MEMORY_BALANCE_NAME_GAP = scaleFocused(3);
const MEMORY_BALANCE_NAME_BELOW = scaleFocused(30);
/** Soft cyan-white for orbit sfera names, avatar labels, and insights chrome. */
const INSIGHTS_HUB_SIZE = scaleFocused(100);
/**
 * Nudge the overview insights hub down so it does not cover Memory Balance stats under sphere
 * labels. Apply the same offset in default orbit overview too so the hub stays fixed when
 * toggling display mode (top-right control).
 */
const INSIGHTS_HUB_MEMORY_BALANCE_OFFSET_Y = scaleFocused(18);

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

/**
 * Per-slot size table indexed by integer slot (0..4).
 * Used to linearly interpolate sphere size while a fractional focused index is in motion (live drag / chevron).
 */
const SLOT_SIZES: readonly number[] = [
  FOCUSED_SIZE,
  BG_SPHERE_SIZE_RIGHT_BELOW,
  BG_SPHERE_SIZE_TOP_RIGHT,
  BG_SPHERE_SIZE_TOP_LEFT,
  BG_SPHERE_SIZE_LEFT_BELOW,
];

/** Per-slot depth scale for entity ring; same indexing as SLOT_SIZES. */
const SLOT_DEPTH_SCALES: readonly number[] = [1, 0.78, 0.5, 0.62, 0.78];

function getEntityRingMetrics(
  sphereSize: number,
  focused: boolean,
  slot: number,
  entityAvatarScale: number,
): { entityAvatarSize: number; orbitRadius: number } {
  const depthScale = getEntityDepthScale(slot);
  const baseEntityAvatarSize = focused
    ? 40
    : Math.max(20, Math.round(sphereSize * 0.28));
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
  /** Only mounted on the focused sphere; when true, run bob (screen also `animationsEnabled`). */
  momentFloatEnabled,
}: {
  entityIndex: number;
  memories: IdealizedMemory[];
  visibility: SharedValue<number>;
  momentFloatEnabled: boolean;
}) {
  const { momentColors } = useMomentColors();
  const floatY = useSharedValue(0);
  const wrapperStyle = useAnimatedStyle(() => {
    // Cubic falloff (^3) — outgoing moments still drop fast, but the incoming sphere's
    // suns/clouds start showing through earlier in the drag than ^5 allowed. This makes
    // the moments a clearer leading visual cue that the focus is shifting.
    //   visibility=1.00 → opacity=1.00 (fully focused, full glow)
    //   visibility=0.90 → opacity≈0.73 (10% drag, fading but still strong)
    //   visibility=0.80 → opacity≈0.51 (20% drag, clearly receding)
    //   visibility=0.60 → opacity≈0.22 (40% drag, faint silhouette)
    //   visibility=0.50 → opacity≈0.13 (halfway drag, just-visible glow)
    //   visibility=0.30 → opacity≈0.03 (mostly gone)
    //   visibility=0.00 → opacity=0    (unfocused)
    // Symmetric on the incoming sphere: suns now start emerging around mid-drag instead
    // of in the last sliver, mirroring the gentler outgoing fade.
    const v = Math.max(0, Math.min(1, visibility.value));
    const v2 = v * v;
    return { opacity: v2 * v };
  });

  useEffect(() => {
    if (!momentFloatEnabled) {
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
  }, [entityIndex, floatY, momentFloatEnabled]);

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
  const colorScheme = useColorScheme();
  const isLight = (colorScheme ?? "dark") === "light";
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
          backgroundColor: isLight ? "rgba(255,255,255,0.94)" : "rgba(0,0,0,0.5)",
          borderWidth: isLight ? 1 : 0,
          borderColor: isLight ? "rgba(0,0,0,0.12)" : "transparent",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 20,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isLight ? 0.35 : 0.8,
          shadowRadius: isLight ? 3 : 4,
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
// Single Reanimated driver + phase offsets (not N independent withRepeat loops).
// Fewer dots, no heavy per-dot shadows, slower cycle; gated with pulsing setting.

const SPARKLE_DOT_COUNT_PHONE = 11;
const SPARKLE_DOT_COUNT_TABLET = 14;
const SparkledDots = React.memo(function SparkledDots({
  avatarSize: _avatarSize,
  avatarCenterX: _avatarCenterX,
  avatarCenterY: _avatarCenterY,
  colorScheme,
  sunnyBackground,
  sparklesEnabled,
}: {
  avatarSize: number;
  avatarCenterX: number;
  avatarCenterY: number;
  colorScheme: "light" | "dark";
  sunnyBackground: string;
  /** Overview screen + focus + “pulsing” personalization — same as cosmic rings. */
  sparklesEnabled: boolean;
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
    const numDots = isTablet
      ? SPARKLE_DOT_COUNT_TABLET
      : SPARKLE_DOT_COUNT_PHONE;
    const padding = 20;

    return Array.from({ length: numDots }, (_, i) => {
      const { x: rawX, y: rawY } = sampleCornerBiasedPosition(
        SW,
        SH,
        i * 29.17 + 11.4,
      );
      const x = Math.max(padding, Math.min(SW - padding, rawX));
      const y = Math.max(padding, Math.min(SH - padding, rawY));
      const size = 2 + Math.random() * 2;
      return { x, y, size, id: i };
    });
  }, [isTablet]);

  if (!sparklesEnabled || !isReady || colorScheme === "light") {
    return null;
  }

  return (
    <>
      {dots.map((dot) => (
        <SparkledDot
          key={dot.id}
          x={dot.x}
          y={dot.y}
          size={dot.size}
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
  colorScheme,
  sunnyBackground,
}: {
  x: number;
  y: number;
  size: number;
  colorScheme: "light" | "dark";
  sunnyBackground: string;
}) {
  const glowColor = useMemo(() => {
    if (colorScheme === "dark") {
      return "rgba(255, 255, 255, 0.72)";
    }
    if (
      sunnyBackground.length >= 7 &&
      sunnyBackground[0] === "#"
    ) {
      const r = parseInt(sunnyBackground.slice(1, 3), 16);
      const g = parseInt(sunnyBackground.slice(3, 5), 16);
      const b = parseInt(sunnyBackground.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.6)`;
    }
    return "rgba(100, 181, 246, 0.55)";
  }, [colorScheme, sunnyBackground]);

  return (
    <View
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
          opacity: 0.5,
          zIndex: 2,
        },
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
  focusProgress,
  momentsVisibility,
  rotateOrbit = false,
  orbitDurationMs = DEFAULT_ENTITY_ORBIT_DURATION_MS,
  randomPulseIndex = null,
  animationsEnabled = true,
  entityPlaceholderBg = "rgba(128,128,128,0.5)",
  entityAvatarBorderColor = "rgba(255,255,255,0.75)",
  entityInitialLetterColor = "#FFFFFF",
}: {
  uris: string[];
  entityIds: string[];
  entityNames: string[];
  entityMemories: IdealizedMemory[][];
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
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
  focusProgress: SharedValue<number>;
  momentsVisibility: SharedValue<number>;
  rotateOrbit?: boolean;
  orbitDurationMs?: number;
  randomPulseIndex?: number | null;
  animationsEnabled?: boolean;
  entityPlaceholderBg?: string;
  entityAvatarBorderColor?: string;
  entityInitialLetterColor?: string;
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
    (entityId: string, memoryCount: number) => {
      if (!isFocused || !entityId) return;
      if (memoryCount === 0) {
        onNeedMemoriesHint?.(entityId);
        return;
      }
      onEntitySelect(entityId, sphere);
    },
    [isFocused, onEntitySelect, onNeedMemoriesHint, sphere],
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
            focusProgress={focusProgress}
            isTablet={isTablet}
            momentsVisibility={momentsVisibility}
            entityMemories={memories}
            onOrbitingTap={handleOrbitingEntityTap}
            needMemoriesHintForEntity={needMemoriesHintEntityId === entityId}
            orbitAngle={orbitAngle}
            rotateOrbit={rotateOrbit}
            shouldDoRandomPulse={randomPulseIndex === i}
            animationsEnabled={animationsEnabled}
            placeholderBg={entityPlaceholderBg}
            avatarBorderColor={entityAvatarBorderColor}
            initialLetterColor={entityInitialLetterColor}
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
  focusProgress,
  isTablet,
  momentsVisibility,
  entityMemories,
  onOrbitingTap,
  needMemoriesHintForEntity,
  orbitAngle,
  rotateOrbit,
  shouldDoRandomPulse,
  animationsEnabled,
  placeholderBg = "rgba(128,128,128,0.5)",
  avatarBorderColor = "rgba(255,255,255,0.75)",
  initialLetterColor = "#FFFFFF",
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
  focusProgress: SharedValue<number>;
  isTablet: boolean;
  momentsVisibility: SharedValue<number>;
  entityMemories: IdealizedMemory[];
  onOrbitingTap: (
    entityId: string,
    memoryCount: number,
  ) => void;
  needMemoriesHintForEntity?: boolean;
  orbitAngle: SharedValue<number>;
  rotateOrbit: boolean;
  shouldDoRandomPulse: boolean;
  animationsEnabled: boolean;
  placeholderBg?: string;
  avatarBorderColor?: string;
  initialLetterColor?: string;
}) {
  const t = useTranslate();
  const scale = useSharedValue(1);
  const pressStartRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const triggerEntityTapHaptic = useCallback(() => {
    if (Platform.OS === "ios" && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

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
        focusProgress.value,
        [0, 1],
        [0.3, 1],
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
        hitSlop={isFocused ? 18 : 10}
        onPressIn={(event) => {
          const { pageX, pageY } = event.nativeEvent;
          pressStartRef.current = { x: pageX, y: pageY, ts: Date.now() };
        }}
        onPress={(event) => {
          if (entityId) {
            const start = pressStartRef.current;
            pressStartRef.current = null;
            if (start) {
              const dx = event.nativeEvent.pageX - start.x;
              const dy = event.nativeEvent.pageY - start.y;
              const distance = Math.hypot(dx, dy);
              const duration = Date.now() - start.ts;
              if (distance > TAP_MAX_DISTANCE_PX || duration > TAP_MAX_DURATION_MS) {
                return;
              }
            }
            triggerEntityTapHaptic();

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

            onOrbitingTap(entityId, entityMemories.length);
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
              borderColor: avatarBorderColor,
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
              borderColor: avatarBorderColor,
              backgroundColor: placeholderBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemedText
              style={{
                fontSize: avatarSizeFallback * 0.45,
                fontWeight: "600",
                color: initialLetterColor,
              }}
            >
              {initialLetter}
            </ThemedText>
          </View>
        )}
        {entityMemories.length > 0 ? (
          // Render for ALL spheres (focused + unfocused). Visibility is driven by the
          // continuous `focusnessSv` shared value, so during a horizontal drag the
          // outgoing focused sphere fades the icons out while the incoming sphere
          // fades them in proportionally — same scrub treatment as size, opacity,
          // desaturation, etc. The bob (floatY) only runs for the JS-focused sphere
          // so non-focused spheres don't pay the animation cost while invisible.
          <SmallFloatingMoments
            entityIndex={index}
            memories={entityMemories}
            visibility={momentsVisibility}
            momentFloatEnabled={isFocused && animationsEnabled}
          />
        ) : null}
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
// CosmicPulseRings returns null when `enabled` is false so three CosmicRing animators are not mounted.
// Other gating: SparkledDots·sparklesEnabled; SmallFloatingMoments·focused+memories; EntityRing·rotateOrbit;
// insight card auto-cycle·isVisible; sphere pulse / random entity pulse·isFocused.

const CosmicRing = React.memo(function CosmicRing({
  delay,
  color,
  left,
  top,
  size,
  enabled,
  opacityPeak = 0.1,
  borderW = 1,
  shadowOpacity = 0.2,
}: {
  delay: number;
  color: string;
  left: number;
  top: number;
  size: number;
  enabled: boolean;
  /** Peak opacity per pulse (dark rings use ~0.1; light backgrounds need higher). */
  opacityPeak?: number;
  borderW?: number;
  shadowOpacity?: number;
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
          withTiming(opacityPeak, { duration: 600, easing: Easing.out(Easing.ease) }),
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
  }, [enabled, delay, ringScale, ringOpacity, opacityPeak]);

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
      borderWidth: borderW,
      borderColor: color,
      backgroundColor: "transparent",
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius: borderW >= 1.5 ? 6 : 4,
      elevation: 0,
      zIndex: 5,
    }),
    [left, top, size, color, borderW, shadowOpacity],
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
  visible = true,
  ringOpacityPeak = 0.1,
  ringBorderWidth = 1,
  ringShadowOpacity = 0.2,
}: {
  color: string;
  offsetX: number;
  offsetY: number;
  sphereSize: number;
  enabled: boolean;
  visible?: boolean;
  ringOpacityPeak?: number;
  ringBorderWidth?: number;
  ringShadowOpacity?: number;
}) {
  const RINGS_FADE_OUT_MS = 430;
  const RINGS_FADE_IN_MS = 760;
  const [shouldRunRings, setShouldRunRings] = useState(enabled && visible);
  const [ringCycleKey, setRingCycleKey] = useState(0);
  const stopRingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibility = useSharedValue(enabled && visible ? 1 : 0);

  useEffect(() => {
    if (stopRingsTimerRef.current) {
      clearTimeout(stopRingsTimerRef.current);
      stopRingsTimerRef.current = null;
    }

    if (enabled && visible) {
      // Restart ring phase sequence from inner -> outer when rings become visible again.
      setShouldRunRings(true);
      setRingCycleKey((prev) => prev + 1);
    } else if (shouldRunRings) {
      // Keep rings alive during fade-out, then stop loops after fully hidden.
      stopRingsTimerRef.current = setTimeout(() => {
        setShouldRunRings(false);
        stopRingsTimerRef.current = null;
      }, RINGS_FADE_OUT_MS);
    }

    const showing = enabled && visible;
    visibility.value = withTiming(showing ? 1 : 0, {
      duration: showing ? RINGS_FADE_IN_MS : RINGS_FADE_OUT_MS,
      easing: Easing.inOut(Easing.cubic),
    });
    // Intentionally NOT depending on `shouldRunRings` here. If we did, the
    // setShouldRunRings(true) above would re-trigger this effect, which would
    // increment `ringCycleKey` a second time — that double-bump unmounts and
    // remounts each <CosmicRing> with new keys, resetting their freshly-started
    // ringOpacity animations back to 0 and producing a visible "appear → vanish
    // → reappear" flicker the moment the new focused sfera takes over after a
    // drag. The `else if (shouldRunRings)` closure is consistent because the
    // only writer of `shouldRunRings` is this same effect.
    // `visibility` is a SharedValue (stable ref); also intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, visible]);

  useEffect(
    () => () => {
      if (stopRingsTimerRef.current) {
        clearTimeout(stopRingsTimerRef.current);
        stopRingsTimerRef.current = null;
      }
    },
    [],
  );

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
  }));

  if (!enabled && !visible && !shouldRunRings) return null;
  const left = offsetX - sphereSize / 2;
  const top = offsetY - sphereSize / 2;
  return (
    <Animated.View pointerEvents="none" style={fadeStyle}>
      <CosmicRing
        key={`cosmic-ring-0-${ringCycleKey}`}
        delay={0}
        color={color}
        left={left}
        top={top}
        size={sphereSize}
        enabled={enabled && shouldRunRings}
        opacityPeak={ringOpacityPeak}
        borderW={ringBorderWidth}
        shadowOpacity={ringShadowOpacity}
      />
      <CosmicRing
        key={`cosmic-ring-1-${ringCycleKey}`}
        delay={1500}
        color={color}
        left={left}
        top={top}
        size={sphereSize}
        enabled={enabled && shouldRunRings}
        opacityPeak={ringOpacityPeak}
        borderW={ringBorderWidth}
        shadowOpacity={ringShadowOpacity}
      />
      <CosmicRing
        key={`cosmic-ring-2-${ringCycleKey}`}
        delay={3000}
        color={color}
        left={left}
        top={top}
        size={sphereSize}
        enabled={enabled && shouldRunRings}
        opacityPeak={ringOpacityPeak}
        borderW={ringBorderWidth}
        shadowOpacity={ringShadowOpacity}
      />
    </Animated.View>
  );
});

// ───────────────────── Animated sphere (orbital transition: spheres slide along orbit like beads on a string) ─────────────────────

// Large touch canvas so orbiting entity avatars remain hittable on all sides.
// Visual positioning still stays centered because we translate by CONTAINER_HALF.
const SPHERE_CONTAINER_SIZE = scaleFocused(420);
// Debug tuning: eased timing gives gentler start and better visual sync between outgoing/incoming sferas.
const ORBIT_TRANSITION_DURATION_MS = 650;

const RANDOM_ENTITY_PULSE_INTERVAL_MS = 4200;

const AnimatedSphere = React.memo(function AnimatedSphere({
  sphereIdx,
  sphere,
  focusedIdx,
  focusedFracSv,
  entityUris,
  entityIds,
  entityNames,
  entityMemories,
  onPress,
  onEntitySelect,
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
  sphere3DEffect = false,
}: {
  sphereIdx: number;
  sphere: { type: LifeSphere; icon: string };
  focusedIdx: number;
  /**
   * Fractional focused index driven by both chevron taps (withTiming) and live drag
   * (panResponder). Values are continuous; when settled, equal `focusedIdx` modulo 5.
   * Drives all per-frame visuals (position, size, focus brightness, entity ring metrics).
   */
  focusedFracSv: SharedValue<number>;
  entityUris: string[];
  entityIds: string[];
  entityNames: string[];
  entityMemories: IdealizedMemory[][];
  onPress: () => void;
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
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
  /** Usability: glossy radial sferas + specular (off = flat fill). */
  sphere3DEffect?: boolean;
}) {
  const { isTablet } = useLargeDevice();
  const isFocused = sphereIdx === focusedIdx;
  const slot = (sphereIdx - focusedIdx + 5) % 5;
  const rotateOrbitGate = isFocused && animationsEnabled && isInitialView;
  const target = getSphereTarget(sphereIdx, focusedIdx); // used for the unfocused tight tap target sizing

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

  const initialEntityMetrics = getEntityRingMetrics(
    SLOT_SIZES[slot],
    isFocused,
    slot,
    entityAvatarScale,
  );
  const spherePulseScale = useSharedValue(1);
  const spherePressStartRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const firstTapFeedbackScale = useSharedValue(1);

  /**
   * All per-frame visuals are derived from `focusedFracSv` *inline* inside each
   * `useAnimatedStyle` / `useDerivedValue` worklet (no intermediate chained derived values).
   * Doing the slot math inline means each animated style explicitly subscribes to
   * `focusedFracSv` itself, so a change unambiguously re-runs every consumer at the same
   * frame — position, size, focus brightness, and entity ring metrics all move together
   * during a live drag.
   *
   * The shared values declared below are only the ones that need to be passed as
   * `SharedValue<number>` to `EntityRing` / `OrbitingEntity`.
   */

  /** Sphere diameter, linearly interpolated between adjacent slot sizes. */
  const sizeSv = useDerivedValue(() => {
    const v = sphereIdx - focusedFracSv.value;
    const slotRaw = ((v % 5) + 5) % 5;
    const slotA = Math.floor(slotRaw) % 5;
    const slotB = (slotA + 1) % 5;
    const t = slotRaw - Math.floor(slotRaw);
    return SLOT_SIZES[slotA] * (1 - t) + SLOT_SIZES[slotB] * t;
  }, [sphereIdx]);

  /** "Focusness": 1 at slot 0, drops linearly to 0 by slot ±1. */
  const focusnessSv = useDerivedValue(() => {
    const v = sphereIdx - focusedFracSv.value;
    const slotRaw = ((v % 5) + 5) % 5;
    const dist = slotRaw <= 2.5 ? slotRaw : 5 - slotRaw;
    return Math.max(0, Math.min(1, 1 - dist));
  }, [sphereIdx]);

  /**
   * Floating entity avatar size — blends between the focused (constant 40pt) and unfocused
   * (size·0.28·depthScale) formulas using `focusness` so there's no pop at the slot boundary.
   */
  const entityAvatarSizeSv = useDerivedValue(() => {
    const v = sphereIdx - focusedFracSv.value;
    const slotRaw = ((v % 5) + 5) % 5;
    const slotA = Math.floor(slotRaw) % 5;
    const slotB = (slotA + 1) % 5;
    const t = slotRaw - Math.floor(slotRaw);
    const sphereSize = SLOT_SIZES[slotA] * (1 - t) + SLOT_SIZES[slotB] * t;
    const depth =
      SLOT_DEPTH_SCALES[slotA] * (1 - t) + SLOT_DEPTH_SCALES[slotB] * t;
    const baseUnfocused = Math.max(20, sphereSize * 0.28);
    const rawUnfocused = Math.max(10, baseUnfocused * depth);
    const dist = slotRaw <= 2.5 ? slotRaw : 5 - slotRaw;
    const f = Math.max(0, Math.min(1, 1 - dist));
    const focusedAvatar = 40;
    return (focusedAvatar * f + rawUnfocused * (1 - f)) * entityAvatarScale;
  }, [sphereIdx, entityAvatarScale]);

  /**
   * Orbit radius for entity ring — sphere size/2 + entity size/2 + focus-aware padding.
   */
  const orbitRadiusSv = useDerivedValue(() => {
    const v = sphereIdx - focusedFracSv.value;
    const slotRaw = ((v % 5) + 5) % 5;
    const slotA = Math.floor(slotRaw) % 5;
    const slotB = (slotA + 1) % 5;
    const t = slotRaw - Math.floor(slotRaw);
    const sphereSize = SLOT_SIZES[slotA] * (1 - t) + SLOT_SIZES[slotB] * t;
    const depth =
      SLOT_DEPTH_SCALES[slotA] * (1 - t) + SLOT_DEPTH_SCALES[slotB] * t;
    const baseUnfocused = Math.max(20, sphereSize * 0.28);
    const rawUnfocused = Math.max(10, baseUnfocused * depth);
    const dist = slotRaw <= 2.5 ? slotRaw : 5 - slotRaw;
    const f = Math.max(0, Math.min(1, 1 - dist));
    const focusedAvatar = 40;
    const avatarSize =
      (focusedAvatar * f + rawUnfocused * (1 - f)) * entityAvatarScale;
    const padding = 6 + 2 * f;
    return sphereSize / 2 + avatarSize / 2 + padding;
  }, [sphereIdx, entityAvatarScale]);

  // Aliases for downstream consumers (EntityRing) that previously took separate
  // focusProgress / momentsVisibility shared values. With the fractional model both
  // are the same continuous focus signal; keep the variable names for readability.
  const focusProgress = focusnessSv;
  const momentsVisibilityProgress = focusnessSv;

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
            withSpring(1.06, { damping: 12, stiffness: 80 }),
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

  // Reset tap intent tracking when focus changes.
  useEffect(() => {
    if (isFocused) {
      spherePressStartRef.current = null;
    }
  }, [isFocused]);

  const handleSpherePress = useCallback(
    (event: GestureResponderEvent) => {
      const start = spherePressStartRef.current;
      spherePressStartRef.current = null;
      if (start) {
        const dx = event.nativeEvent.pageX - start.x;
        const dy = event.nativeEvent.pageY - start.y;
        const distance = Math.hypot(dx, dy);
        const duration = Date.now() - start.ts;
        if (distance > TAP_MAX_DISTANCE_PX || duration > TAP_MAX_DURATION_MS) {
          return;
        }
      }
      onPress();
    },
    [onPress],
  );

  const handleSpherePressIn = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    spherePressStartRef.current = { x: pageX, y: pageY, ts: Date.now() };
  }, []);

  const handleEntitySelect = useCallback(
    (entityId: string, sphere: LifeSphere) => {
      onEntitySelect(entityId, sphere);
    },
    [onEntitySelect],
  );

  const CONTAINER_HALF = SPHERE_CONTAINER_SIZE / 2;

  const containerStyle = useAnimatedStyle(() => {
    // Read the derived focus value first so this animated style is on the SAME
    // reactivity chain as sphereStyle / iconWrapStyle / desaturationOverlayStyle.
    // (Defensive against any case where the babel auto-tracker misses prop-passed
    // SharedValues accessed deep inside conditionals; routing through derived values
    // guarantees every per-frame property re-runs together with the gesture.)
    const focusness = focusnessSv.value;
    const v = sphereIdx - focusedFracSv.value;
    const slotRaw = ((v % 5) + 5) % 5;
    const normalizedAngle = slotRaw * SLOT_ANGLE; // already in [0, 360)
    const rad = (normalizedAngle * Math.PI) / 180;
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
    // Spheres closest to focus (slot 0 / wrapping near slot 5) draw above the rest
    // so both the outgoing and incoming focused sphere stay on top during a drag.
    // Using `focusness` here also explicitly keeps this style subscribed to the same
    // derived chain as sphereStyle / iconWrapStyle.
    const isNearFocus = focusness > 0.5;
    // When sun menu is open: scale to 0 and fully hide (0.94 left ~6% visible — too noticeable)
    const sunShrink = 1 - sunExpanded.value;
    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: SPHERE_CONTAINER_SIZE,
      height: SPHERE_CONTAINER_SIZE,
      zIndex: isNearFocus ? 30 : 10,
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
    left: CONTAINER_HALF - sizeSv.value / 2,
    top: CONTAINER_HALF - sizeSv.value / 2,
    width: sizeSv.value,
    height: sizeSv.value,
    opacity: interpolate(
      focusProgress.value,
      [0, 1],
      [isInitialView ? 0.5 : 0.75, 1],
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
        scale: Math.max(0.42, sizeSv.value / FOCUSED_SIZE),
      },
    ],
  }));

  const desaturationOverlayStyle = useAnimatedStyle(() => ({
    opacity: (1 - focusProgress.value) * 0.65,
  }));

  const classicLayerStyle = useAnimatedStyle(() => ({
    opacity:
      sphere3DEffect && colorScheme === "dark"
        ? 1 - focusProgress.value
        : 1,
  }));

  const neonLayerStyle = useAnimatedStyle(() => ({
    opacity: sphere3DEffect && colorScheme === "dark" ? focusProgress.value : 0,
  }));

  const specularStyle = useAnimatedStyle(() => ({
    opacity:
      sphere3DEffect && colorScheme === "dark"
        ? 1 - focusProgress.value
        : 0,
  }));

  const iconBaseStyle = useAnimatedStyle(() => ({
    opacity:
      sphere3DEffect && colorScheme === "dark"
        ? 1 - focusProgress.value
        : 1,
  }));

  const iconFocusedStyle = useAnimatedStyle(() => ({
    opacity: sphere3DEffect && colorScheme === "dark" ? focusProgress.value : 0,
  }));

  return (
    <Animated.View
      style={containerStyle}
      // Let only child pressables handle touches; avoid this container blocking
      // orbit entity taps when sphere containers overlap near screen edges.
      pointerEvents={isSunMenuOpen ? "none" : "box-none"}
    >
      {/* Tight tap target for unfocused spheres — sits over the visual only. */}
      {!isFocused && (
        <Pressable
          onPressIn={handleSpherePressIn}
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
      <View
        // Keep this visual wrapper non-interactive.
        // Taps are handled by:
        // - the tight unfocused-sphere target above
        // - the focused-sphere absolute overlay at root level
        // This prevents accidental taps on unfocused spheres "behind" orbit entities.
        pointerEvents="box-none"
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
          {sphere3DEffect ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
                  classicLayerStyle,
                ]}
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
                  style={[
                    { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
                    neonLayerStyle,
                  ]}
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
                        id={`neon-atmo-${sphere.type}-${sphereIdx}`}
                        cx="50"
                        cy="50"
                        r="50"
                        gradientUnits="userSpaceOnUse"
                      >
                        <Stop offset="0%" stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0" />
                        <Stop offset="55%" stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0" />
                        <Stop offset="76%" stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0.12" />
                        <Stop offset="90%" stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0.50" />
                        <Stop offset="100%" stopColor={SPHERE_NEON[sphere.type].core} stopOpacity="0.80" />
                      </RadialGradient>
                      <RadialGradient
                        id={`neon-inner-${sphere.type}-${sphereIdx}`}
                        cx="50"
                        cy="50"
                        r="44"
                        gradientUnits="userSpaceOnUse"
                      >
                        <Stop offset="0%" stopColor="#080C14" stopOpacity="0.65" />
                        <Stop offset="65%" stopColor="#080C14" stopOpacity="0.30" />
                        <Stop offset="100%" stopColor="#080C14" stopOpacity="0" />
                      </RadialGradient>
                      <RadialGradient
                        id={`neon-rim-${sphere.type}-${sphereIdx}`}
                        cx="50"
                        cy="50"
                        r="50"
                        gradientUnits="userSpaceOnUse"
                      >
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                        <Stop offset="84%" stopColor="#FFFFFF" stopOpacity="0" />
                        <Stop offset="94%" stopColor="#FFFFFF" stopOpacity="0.18" />
                        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.45" />
                      </RadialGradient>
                    </Defs>
                    <SvgCircle cx="50" cy="50" r="50" fill={SPHERE_NEON[sphere.type].core} fillOpacity={0.05} />
                    <SvgCircle cx="50" cy="50" r="50" fill={`url(#neon-atmo-${sphere.type}-${sphereIdx})`} />
                    <SvgCircle cx="50" cy="50" r="50" fill={`url(#neon-inner-${sphere.type}-${sphereIdx})`} />
                    <SvgCircle cx="50" cy="50" r="50" fill={`url(#neon-rim-${sphere.type}-${sphereIdx})`} />
                  </Svg>
                </Animated.View>
              )}
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
            </>
          ) : (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                borderRadius: 1000,
                backgroundColor: gradient3D.base,
              }}
            />
          )}
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
                backgroundColor:
                  colorScheme === "light"
                    ? "rgba(255,255,255,0.38)"
                    : "rgba(20,26,46,0.65)",
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
            {colorScheme === "dark" && sphere3DEffect && (
              <>
                <Animated.View pointerEvents="none" style={iconFocusedStyle}>
                  <MaterialIcons
                    name={sphere.icon as any}
                    size={FOCUSED_ICON_SIZE}
                    color={SPHERE_NEON[sphere.type].core}
                    style={{ pointerEvents: "none" }}
                  />
                </Animated.View>
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
              </>
            )}
            {colorScheme === "dark" && !sphere3DEffect && (
              <MaterialIcons
                name={sphere.icon as any}
                size={FOCUSED_ICON_SIZE}
                color={iconColor}
                style={{ pointerEvents: "none" }}
              />
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
            focusProgress={focusProgress}
            momentsVisibility={momentsVisibilityProgress}
            rotateOrbit={rotateOrbitGate}
            orbitDurationMs={orbitDurationMs}
            randomPulseIndex={randomPulseIndex}
            animationsEnabled={animationsEnabled}
            entityPlaceholderBg={
              colorScheme === "light" ? gradient3D.base : "rgba(128,128,128,0.5)"
            }
            entityAvatarBorderColor={
              colorScheme === "light"
                ? "rgba(0,0,0,0.14)"
                : "rgba(255,255,255,0.75)"
            }
            entityInitialLetterColor={
              colorScheme === "light" ? iconColor : "#FFFFFF"
            }
          />
        </Animated.View>
      </View>
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
  "#FDFCFB",
  "#F7FAFC",
  "#F0F6FB",
  "#E9F2F9",
  "#E2EBF5",
] as const; // light theme — high contrast with dark foreground (AAA-oriented)

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
  sphere3DEffect = false,
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
  sphere3DEffect?: boolean;
}) {
  const t = useTranslate();
  const [mode, setMode] = useState(0);
  const [isAutoCyclePaused, setIsAutoCyclePaused] = useState(false);
  const modeOpacity = useSharedValue(1);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasAutoCyclePausedRef = useRef(false);
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
      wasAutoCyclePausedRef.current = false;
      return;
    }
    if (isAutoCyclePaused) {
      cancelAnimation(progress);
      wasAutoCyclePausedRef.current = true;
      return;
    }
    const currentProgress = wasAutoCyclePausedRef.current
      ? Math.max(0, Math.min(1, progress.value))
      : 0;
    wasAutoCyclePausedRef.current = false;
    progress.value = currentProgress;
    const remainingDuration = Math.max(80, Math.round((1 - currentProgress) * 5000));
    progress.value = withTiming(1, { duration: remainingDuration }, (finished) => {
      if (finished) {
        progress.value = 0;
        runOnJS(cycleModeRef.current)(1);
      }
    });
    return () => {
      cancelAnimation(progress);
    };
  }, [mode, numEntities, progress, isVisible, isAutoCyclePaused]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
    };
  }, []);

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

  const insightCardBg =
    colorScheme === "dark" ? COSMIC_INNER_DARK[2] : COSMIC_INNER_LIGHT[2];
  const gradientColors =
    colorScheme === "dark" ? COSMIC_INNER_DARK : COSMIC_INNER_LIGHT;
  const insightOrbitInk =
    colorScheme === "dark" ? "#E8F4F6" : "#121212";
  const insightOrbitInkMuted =
    colorScheme === "dark" ? "#D0DDE6" : "#393939";
  const cardSize = INSIGHT_CARD_SIZE * sizeScale;

  const insightCardSurfaceShadow = sphere3DEffect
    ? {
        shadowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
      }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colorScheme === "dark" ? 0.3 : 0.15,
        shadowRadius: 6,
        elevation: 4,
      };

  const wrapperStyle = {
    position: "absolute" as const,
    left: x - cardSize / 2,
    top: y - cardSize / 2,
    width: cardSize,
    height: cardSize,
    zIndex: 25,
  };

  // Empty state
  const emptyCardStyle = {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: shadowColor + "66",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 10,
    ...insightCardSurfaceShadow,
  };

  if (numEntities === 0) {
    const emptyOrbitMinH = cardSize * 1.38;
    return (
      <View style={[wrapperStyle, { height: undefined, minHeight: emptyOrbitMinH }]}>
        {sphere3DEffect ? (
          <LinearGradient
            colors={[...gradientColors]}
            style={[emptyCardStyle, { minHeight: cardSize }]}
          >
            <ThemedText
              style={{
                color: insightOrbitInk,
                fontSize: 11,
                fontWeight: "600",
                textAlign: "center",
                paddingHorizontal: 8,
                opacity: 0.9,
              }}
            >
              {t(sferaInsightEmptyEntitiesTranslationKey(sphere))}
            </ThemedText>
            <SferaInsightEmptyGuideLink sphere={sphere} compact />
          </LinearGradient>
        ) : (
          <View style={{ ...emptyCardStyle, backgroundColor: insightCardBg, minHeight: cardSize }}>
            <ThemedText
              style={{
                color: insightOrbitInk,
                fontSize: 11,
                fontWeight: "600",
                textAlign: "center",
                paddingHorizontal: 8,
                opacity: 0.9,
              }}
            >
              {t(sferaInsightEmptyEntitiesTranslationKey(sphere))}
            </ThemedText>
            <SferaInsightEmptyGuideLink sphere={sphere} compact />
          </View>
        )}
      </View>
    );
  }

  // Entities exist but no memories yet — avoid misleading mode titles (e.g. "Most recently done")
  if (totalMemoriesCount === 0) {
    const zeroOrbitMinH = cardSize * 1.38;
    const zeroOuter = {
      ...wrapperStyle,
      overflow: "visible" as const,
      minHeight: zeroOrbitMinH + (showNeedMemoriesHintBelowCard ? 48 : 0),
      height: undefined as number | undefined,
    };
    const zeroCardSurface = {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: shadowColor + "66",
      justifyContent: "center" as const,
      alignItems: "center" as const,
      padding: 10,
      ...insightCardSurfaceShadow,
      minHeight: cardSize,
    };
    return (
      <View style={zeroOuter}>
        <View style={{ width: cardSize }}>
          {sphere3DEffect ? (
            <LinearGradient colors={[...gradientColors]} style={zeroCardSurface}>
              <Pressable onPress={() => onNeedMemoriesHintCenter?.()}>
                <ThemedText
                  style={{
                    color: insightOrbitInk,
                    fontSize: 11,
                    textAlign: "center",
                    fontWeight: "600",
                    paddingHorizontal: 8,
                  }}
                >
                  {t("sferaInsight.addMemories")}
                </ThemedText>
              </Pressable>
              <SferaInsightEmptyGuideLink sphere={sphere} compact />
            </LinearGradient>
          ) : (
            <View
              style={{
                ...zeroCardSurface,
                backgroundColor: insightCardBg,
              }}
            >
              <Pressable onPress={() => onNeedMemoriesHintCenter?.()}>
                <ThemedText
                  style={{
                    color: insightOrbitInk,
                    fontSize: 11,
                    textAlign: "center",
                    fontWeight: "600",
                    paddingHorizontal: 8,
                  }}
                >
                  {t("sferaInsight.addMemories")}
                </ThemedText>
              </Pressable>
              <SferaInsightEmptyGuideLink sphere={sphere} compact />
            </View>
          )}
        </View>
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
                color: "#FFFFFF",
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
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        const mems = entityMemories[entityIdx] ?? [];
        if (mems.length === 0) {
          onNeedMemoriesHintCenter?.();
          return;
        }
        onEntitySelect(entityId, sphere);
        return;
      }
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        setIsAutoCyclePaused((prev) => !prev);
      }, 300);
    }
  };

  const insightCardMainSurfaceStyle = {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: shadowColor + "66",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 12,
    paddingBottom: 10,
    ...insightCardSurfaceShadow,
    overflow: "hidden" as const,
  };

  const insightCardMainBody = (
    <>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: shadowColor + "33",
        }}
      >
        <Animated.View
          style={[{ height: 2, backgroundColor: shadowColor }, progressBarStyle]}
        />
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
            color: insightOrbitInk,
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
            color: insightOrbitInkMuted,
            fontSize: 9,
            textAlign: "center",
            marginTop: 3,
          }}
          numberOfLines={1}
        >
          {currentMode.subtext}
        </ThemedText>
      </Animated.View>

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
                backgroundColor: i === mode ? shadowColor : shadowColor + "55",
              }}
            />
          ))}
        </Pressable>
      )}
    </>
  );

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
      {sphere3DEffect ? (
        <LinearGradient colors={[...gradientColors]} style={insightCardMainSurfaceStyle}>
          {insightCardMainBody}
        </LinearGradient>
      ) : (
        <View
          style={{
            ...insightCardMainSurfaceStyle,
            backgroundColor: insightCardBg,
          }}
        >
          {insightCardMainBody}
        </View>
      )}
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
            color: "#FFFFFF",
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
const MemoryBalanceSphereItem = React.memo(function MemoryBalanceSphereItem({
  index,
  modeTransition,
  onPress,
  containerStyle,
  children,
}: {
  index: number;
  modeTransition: SharedValue<number>;
  onPress: () => void;
  containerStyle: any;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const start = Math.min(0.6, index * 0.12);
    const end = Math.min(1, start + 0.5);
    return {
      opacity: interpolate(
        modeTransition.value,
        [start, end],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            modeTransition.value,
            [start, end],
            [0.92, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, [index, modeTransition]);

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <Pressable
        onPress={onPress}
        style={{ width: "100%", height: "100%", alignItems: "center" }}
        hitSlop={8}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
});

const OrbitSphereItem = React.memo(function OrbitSphereItem({
  index,
  modeTransition,
  children,
}: {
  index: number;
  modeTransition: SharedValue<number>;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const appearProgress = 1 - modeTransition.value;
    const start = Math.min(0.6, index * 0.12);
    const end = Math.min(1, start + 0.5);
    return {
      opacity: interpolate(
        appearProgress,
        [start, end],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            appearProgress,
            [start, end],
            [0.92, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, [index, modeTransition]);

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
});

function MemoryBalanceView({
  memoryBalanceSizeBySphere,
  momentStatsBySphere,
  getSphereSunnyPercentage,
  colorScheme,
  onSpherePress,
  modeTransition,
  sphere3DEffect = false,
}: {
  memoryBalanceSizeBySphere: Record<LifeSphere, number>;
  momentStatsBySphere: Record<LifeSphere, { sunny: number; cloudy: number }>;
  getSphereSunnyPercentage: (sphere: LifeSphere) => number;
  colorScheme: "light" | "dark";
  onSpherePress: (sphereIndex: number, sphereType: LifeSphere) => void;
  modeTransition: SharedValue<number>;
  sphere3DEffect?: boolean;
}) {
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  const balanceStatNumberColor =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.92)"
      : Colors.light.text;
  const balanceSunnyIconColor = momentColors.sunny.background;
  const balanceCloudIconColor = momentColors.cloudy.background;
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
          <MemoryBalanceSphereItem
            key={`memory-balance-${sphere.type}`}
            index={i}
            modeTransition={modeTransition}
            onPress={() => onSpherePress(i, sphere.type)}
            containerStyle={{
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
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: sphere3DEffect ? "transparent" : gradient3D.base,
                shadowColor: colorScheme === "dark" ? shadowColor : "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 14,
                elevation: 12,
                overflow: "hidden",
              }}
            >
              {sphere3DEffect ? (
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
              ) : null}
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
                    color={balanceSunnyIconColor}
                  />
                  <ThemedText
                    style={{
                      fontSize: MEMORY_BALANCE_STATS_TEXT_SIZE,
                      lineHeight: MEMORY_BALANCE_STATS_LINE_HEIGHT,
                      color: balanceStatNumberColor,
                      opacity: colorScheme === "dark" ? 0.9 : 1,
                      fontWeight: "600",
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
                    color={balanceCloudIconColor}
                  />
                  <ThemedText
                    style={{
                      fontSize: MEMORY_BALANCE_STATS_TEXT_SIZE,
                      lineHeight: MEMORY_BALANCE_STATS_LINE_HEIGHT,
                      color: balanceStatNumberColor,
                      opacity: colorScheme === "dark" ? 0.9 : 1,
                      fontWeight: "600",
                    }}
                  >
                    {stats.cloudy}
                  </ThemedText>
                </View>
              </View>
            </View>
          </MemoryBalanceSphereItem>
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
  const { appUsabilityHints, sphere3DEffect, cosmicBackgroundOpacity } =
    useVisualSettings();
  const lightCosmicOff =
    colorScheme === "light" && cosmicBackgroundOpacity === 0;
  const focusedSpherePulseRef = useRef<(() => void) | null>(null);
  const focusedSpherePressStartRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const memoriesHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insightsHubPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const openInsightsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpeningInsightsRef = useRef(false);
  const insightsHubScale = useSharedValue(1);
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
      if (insightsHubPulseTimerRef.current) {
        clearTimeout(insightsHubPulseTimerRef.current);
        insightsHubPulseTimerRef.current = null;
      }
      if (openInsightsTimerRef.current) {
        clearTimeout(openInsightsTimerRef.current);
        openInsightsTimerRef.current = null;
      }
    },
    [clearMemoriesHintTimer],
  );

  const orbitNeedMemoriesHintEntityId =
    memoriesHint?.place === "orbit" ? memoriesHint.entityId : null;
  const showInsightCardNeedMemoriesHintFlag =
    memoriesHint?.place === "insightCard";

  const [focusedIdx, setFocusedIdx] = useState(initialFocusedIdx);
  const [focusedLabelIdx, setFocusedLabelIdx] = useState(initialFocusedIdx);
  const N = SPHERE_LIST.length;
  /**
   * Continuous fractional focused-index. Drives all per-frame sphere visuals
   * (position on orbit, size, focus brightness, entity ring metrics).
   * - During a horizontal drag in the center region, the panResponder writes
   *   `focusedIdx + clampedDragFraction` here every frame so the orbit follows the finger.
   * - On chevron tap / drag-release-with-snap, `goToSphere` animates this with
   *   `withTiming` along the shortest orbit path, then settles back to an integer.
   */
  const focusedFracSv = useSharedValue(initialFocusedIdx);
  useAnimatedReaction(
    () => {
      const rounded = Math.round(focusedFracSv.value);
      return ((rounded % N) + N) % N;
    },
    (next, prev) => {
      "worklet";
      if (next !== prev) {
        runOnJS(setFocusedLabelIdx)(next);
      }
    },
    [N],
  );
  const sphereTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isSphereTransitioning, setIsSphereTransitioning] = useState(false);
  // Keep root aligned with TabScreenContainer; we shift spheres via ORBIT_CY instead.
  const rootMarginTop = 0;

  // Sun expanded state: 0 = collapsed, 1 = expanded (spheres shrink, action buttons appear)
  const startSunExpanded = initialSunMenuExpanded;
  const sunExpanded = useSharedValue(startSunExpanded ? 1 : 0);
  const modeTransition = useSharedValue(
    displayMode === "memoryBalanceRings" ? 1 : 0,
  );
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

  /**
   * When the parent restores a previously-selected sphere (e.g. coming back from a tab),
   * smoothly animate the orbit to it instead of jumping. The very first mount uses the
   * initial value as-is so there is no animation on cold start.
   * Intentionally only reacts to `initialFocusedIdx` changes — local user-driven changes go
   * through `goToSphere` / the gesture handler and must not retrigger this effect.
   */
  const isInitialFocusedIdxMountRef = useRef(true);
  useEffect(() => {
    if (isInitialFocusedIdxMountRef.current) {
      isInitialFocusedIdxMountRef.current = false;
      return;
    }
    cancelAnimation(focusedFracSv);
    const current = focusedFracSv.value;
    let delta = initialFocusedIdx - current;
    while (delta > N / 2) delta -= N;
    while (delta < -N / 2) delta += N;
    focusedFracSv.value = withTiming(
      current + delta,
      { duration: ORBIT_TRANSITION_DURATION_MS, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        "worklet";
        if (finished) {
          const v = focusedFracSv.value;
          focusedFracSv.value = ((Math.round(v) % N) + N) % N;
        }
      },
    );
    setFocusedIdx(initialFocusedIdx);
    setFocusedLabelIdx(initialFocusedIdx);
    // Intentionally omit focusedIdx from deps: this effect is the *external* sync path
    // and must not re-run when the user themselves changes the focused sphere via
    // gesture / chevron (those go through goToSphere, which already animates focusedFracSv).
  }, [initialFocusedIdx, focusedFracSv, N]);

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

  const beginSphereTransition = useCallback(() => {
    if (sphereTransitionTimerRef.current) {
      clearTimeout(sphereTransitionTimerRef.current);
    }
    setIsSphereTransitioning(true);
    sphereTransitionTimerRef.current = setTimeout(() => {
      setIsSphereTransitioning(false);
      sphereTransitionTimerRef.current = null;
    }, ORBIT_TRANSITION_DURATION_MS);
  }, []);

  const applyFocusedIndex = useCallback(
    (newIdx: number) => {
      setFocusedIdx(newIdx);
      focusedSpherePressStartRef.current = null;
      onFocusedSphereChange?.(newIdx);
    },
    [onFocusedSphereChange],
  );

  /**
   * Programmatic focus change (chevron tap, sphere tap, drag release with snap).
   * Animates `focusedFracSv` along the shortest orbit path with `withTiming`, then settles
   * to the new integer index. JS-side state (`focusedIdx`) updates synchronously so labels,
   * pagination dots, and entity data switch immediately while the visual still glides.
   *
   * Caller should pass a 0..N-1 index; wrap-around is taken into account here.
   */
  const goToSphere = useCallback(
    (newIdx: number) => {
      beginSphereTransition();

      cancelAnimation(focusedFracSv);
      const current = focusedFracSv.value;
      let delta = newIdx - current;
      while (delta > N / 2) delta -= N;
      while (delta < -N / 2) delta += N;
      focusedFracSv.value = withTiming(
        current + delta,
        { duration: ORBIT_TRANSITION_DURATION_MS, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          "worklet";
          if (finished) {
            const v = focusedFracSv.value;
            focusedFracSv.value = ((Math.round(v) % N) + N) % N;
          }
        },
      );

      applyFocusedIndex(newIdx);
    },
    [N, focusedFracSv, beginSphereTransition, applyFocusedIndex],
  );

  useEffect(
    () => () => {
      if (sphereTransitionTimerRef.current) {
        clearTimeout(sphereTransitionTimerRef.current);
        sphereTransitionTimerRef.current = null;
      }
    },
    [],
  );

  // Left/right sfera regions: vertical drag. Right: up = prev, down = next. Left: up = next, down = prev. Center: horizontal swipe.
  const SIDE_REGION_WIDTH = 0.35; // left 35%, right 35%; center 30% uses horizontal
  /**
   * Distance (in pixels) the finger must travel horizontally to fully transition to the next
   * sphere (orbit advances by exactly one slot). Tuned so a comfortable swipe completes the
   * transition; partial drags scrub the visual proportionally.
   */
  const HORIZONTAL_SWIPE_FULL_DIST = SW * 0.55;
  /**
   * Keep some remaining distance for release-settle so quick flicks don't appear to "snap"
   * directly to the target sphere with almost no visible timing animation.
   */
  const HORIZONTAL_SWIPE_MAX_SCRUB = 0.82;
  /**
   * Smooth follow params for drag updates:
   * - FOLLOW: move a fraction toward finger-mapped target each update
   * - MAX_STEP: hard safety cap for very sparse update bursts on quick flicks
   */
  const HORIZONTAL_SWIPE_FOLLOW = 0.28;
  const HORIZONTAL_SWIPE_MAX_STEP_PER_UPDATE = 0.16;

  /**
   * Snapshot of `focusedIdx` at the moment the horizontal pan starts. Read inside the gesture
   * worklets so the running animation is reproducible from the gesture's pure dx.
   * Updated from JS via `runOnJS` (or read via worklet trickery is unnecessary because the
   * gesture re-evaluates this on every onBegin).
   */
  const dragStartFocusedIdxSv = useSharedValue(initialFocusedIdx);

  // ───────────────── Center horizontal swipe (live UI-thread scrub) ─────────────────
  // Why GestureDetector + Gesture.Pan instead of PanResponder:
  // PanResponder only fires JS-thread callbacks, so writes to `focusedFracSv.value` arrive on
  // the UI thread one frame later. With reanimated's auto-batching some animated styles
  // (sizeSv chain) caught the update on the next frame while others (containerStyle reading
  // the prop SV directly) didn't always re-run in time, producing the stuck-position effect.
  // Gesture.Pan().onUpdate runs on the UI thread, so writes are immediate and every animated
  // style re-evaluates in the same frame — position, size, brightness, entity ring all scrub
  // together with the finger.
  const horizontalPanGesture = useMemo(() => {
    return Gesture.Pan()
      // Only steal the gesture once the finger has clearly committed to horizontal motion.
      // `failOffsetY` ensures vertical-leaning drags (chevron/side-region fling) fall through
      // to the legacy PanResponder below.
      .activeOffsetX([-6, 6])
      .failOffsetY([-25, 25])
      .enabled(sunLoadComplete)
      .onBegin(() => {
        "worklet";
        cancelAnimation(focusedFracSv);
        // Snapshot the live (possibly fractional) value so the orbit can be grabbed
        // mid-animation without snapping. Subsequent onUpdate writes add the drag offset
        // to this snapshot, preserving the user's apparent "starting position".
        dragStartFocusedIdxSv.value = focusedFracSv.value;
      })
      .onUpdate((g) => {
        "worklet";
        // Negative translationX (drag left) advances to next sphere; clamp to ±1 so one
        // gesture moves at most one slot — predictable carousel feel. The live write to
        // `focusedFracSv` propagates synchronously to every derived value (size, focusness,
        // entity ring radius/avatar) and to `containerStyle`'s position, so all spheres
        // slide along the orbit in lockstep with the finger.
        const raw = -g.translationX / HORIZONTAL_SWIPE_FULL_DIST;
        const clamped = raw < -1 ? -1 : raw > 1 ? 1 : raw;
        const mappedTarget =
          dragStartFocusedIdxSv.value + clamped * HORIZONTAL_SWIPE_MAX_SCRUB;
        const current = focusedFracSv.value;
        const deltaToTarget = mappedTarget - current;
        const followedDelta = deltaToTarget * HORIZONTAL_SWIPE_FOLLOW;
        const clampedDelta =
          followedDelta > HORIZONTAL_SWIPE_MAX_STEP_PER_UPDATE
            ? HORIZONTAL_SWIPE_MAX_STEP_PER_UPDATE
            : followedDelta < -HORIZONTAL_SWIPE_MAX_STEP_PER_UPDATE
              ? -HORIZONTAL_SWIPE_MAX_STEP_PER_UPDATE
              : followedDelta;
        const next = current + clampedDelta;
        focusedFracSv.value = next;
      })
      .onEnd((g) => {
        "worklet";
        const startFrac = dragStartFocusedIdxSv.value;
        const offset = focusedFracSv.value - startFrac;
        const SNAP_OFFSET = 0.35;
        const SNAP_VELOCITY = 500; // px/sec — gesture-handler velocities are in px/s
        let dir = 0;
        if (offset > SNAP_OFFSET || g.velocityX < -SNAP_VELOCITY) dir = 1;
        else if (offset < -SNAP_OFFSET || g.velocityX > SNAP_VELOCITY) dir = -1;
        // Resolve the snap point to a real integer sphere index. Round the start to its
        // nearest int (handles "drag interrupted a chevron animation" cleanly).
        const startInt = Math.round(startFrac);
        if (dir !== 0) {
          const newIdx = ((startInt + dir) % N + N) % N;
          // Keep release settle entirely on the UI thread so there's no JS handoff jump.
          const current = focusedFracSv.value;
          let delta = newIdx - current;
          while (delta > N / 2) delta -= N;
          while (delta < -N / 2) delta += N;
          runOnJS(beginSphereTransition)();
          const releaseDuration = Math.max(
            240,
            Math.min(520, Math.round(ORBIT_TRANSITION_DURATION_MS * Math.abs(delta))),
          );
          focusedFracSv.value = withTiming(
            current + delta,
            { duration: releaseDuration, easing: Easing.out(Easing.cubic) },
            (finished) => {
              "worklet";
              if (finished) {
                const v = focusedFracSv.value;
                focusedFracSv.value = ((Math.round(v) % N) + N) % N;
                runOnJS(applyFocusedIndex)(newIdx);
              }
            },
          );
        } else {
          // Not enough drag — settle back to the nearest integer (usually `startInt`).
          focusedFracSv.value = withTiming(startInt, {
            duration: 240,
            easing: Easing.out(Easing.cubic),
          });
        }
      })
      .onFinalize(() => {
        "worklet";
        // No-op: onEnd handles success path, withTiming above handles cancel-path snap-back.
      });
  }, [
    sunLoadComplete,
    focusedFracSv,
    dragStartFocusedIdxSv,
    HORIZONTAL_SWIPE_FULL_DIST,
    HORIZONTAL_SWIPE_MAX_SCRUB,
    HORIZONTAL_SWIPE_FOLLOW,
    HORIZONTAL_SWIPE_MAX_STEP_PER_UPDATE,
    N,
    beginSphereTransition,
    applyFocusedIndex,
  ]);

  // ───────────────── Side-region vertical swipe (kept on PanResponder) ─────────────────
  // Vertical drags on the left/right thirds still use PanResponder because they only need to
  // detect a directional fling on release; there's nothing scrubbing during the gesture.
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
          if (!inSideRegion) return false;
          return Math.abs(g.dy) > 20 && Math.abs(g.dy) > Math.abs(g.dx * 1.5);
        },
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
          if (!inSideRegion) return;
          if (Math.abs(g.dy) > Math.abs(g.dx)) {
            // Vertical: right sfera = up prev / down next; left sfera = reversed (up next / down prev)
            if (g.dy < -50)
              goToSphere(
                isLeftRegion ? (focusedIdx + 1) % N : (focusedIdx - 1 + N) % N,
              );
            else if (g.dy > 50)
              goToSphere(
                isLeftRegion ? (focusedIdx - 1 + N) % N : (focusedIdx + 1) % N,
              );
          }
        },
      }),
    [focusedIdx, goToSphere, N, sunLoadComplete],
  );

  const t = useTranslate();
  const focusedSphere = SPHERE_LIST[focusedIdx];
  const isLightTheme = colorScheme === "light";
  const focusedSphereAccent = getSphereSferaColor(focusedSphere.type, colorScheme);
  const doubleTapHintTextColor = isLightTheme ? Colors.light.text : "#FFFFFF";
  useLayoutEffect(() => {
    reportCosmicPulseAccentSphere(focusedSphere.type);
  }, [focusedSphere.type]);
  const isMemoryBalanceMode =
    selectedSphere === null && displayMode === "memoryBalanceRings";
  // Run expensive orbit GPU/CPU animations only when the orbit view is the active visible mode.
  const orbitViewAnimationsEnabled =
    overviewAnimationsEnabled &&
    sunLoadComplete &&
    !isSunExpanded &&
    !isMemoryBalanceMode;
  useEffect(() => {
    const target =
      selectedSphere === null && displayMode === "memoryBalanceRings" ? 1 : 0;
    cancelAnimation(modeTransition);
    modeTransition.value = withTiming(target, {
      duration: 700,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [selectedSphere, displayMode, modeTransition]);
  const individualModeScale =
    selectedSphere !== null ? IPAD_INDIVIDUAL_SFERA_SCALE : 1;
  const individualCardScale =
    selectedSphere !== null ? IPAD_INDIVIDUAL_CARD_SCALE : 1;
  const individualEntityAvatarScale =
    selectedSphere !== null ? IPAD_INDIVIDUAL_ENTITY_AVATAR_SCALE : 1;
  // Keep focused-sphere overlay tight to the center sphere only,
  // so it doesn't steal taps from orbiting entity avatars.
  const focusedTapSize = FOCUSED_SIZE * individualModeScale * 0.78;
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

  /**
   * Hides the cosmic pulse rings the moment the user starts scrubbing the orbit.
   * They are decorative and tied to the *resting* focused sphere — having them
   * radiate from a sfera that's actively sliding away looks busy and competes
   * with the size/brightness scrub. Driven straight from `focusedFracSv` on the
   * UI thread (same chain as everything else that reacts to the drag) so the
   * fade is frame-perfect with the finger.
   *
   * Threshold of ~2% of a slot is just outside the floating-point jitter at the
   * resting integer values — anything past that and we're scrubbing.
   */
  const cosmicRingsDragHideStyle = useAnimatedStyle(() => {
    const v = focusedFracSv.value;
    const dist = Math.abs(v - Math.round(v));
    return { opacity: Math.max(0, Math.min(1, 1 - dist * 50)) };
  });

  /**
   * Fade focused-sfera label/dots while scrubbing horizontally between spheres.
   * At rest (integer focus index) opacity is 1; near half-step drag it approaches 0.
   * Once the next sphere settles, the new title fades back to fully visible.
   */
  const focusedLabelDragFadeStyle = useAnimatedStyle(() => {
    const v = focusedFracSv.value;
    const distFromRest = Math.abs(v - Math.round(v)); // 0..~0.5
    const opacity = Math.max(0, Math.min(1, 1 - distFromRest * 2.2));
    return { opacity };
  });

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
        if (!onInsightsPress || isOpeningInsightsRef.current) return;
        isOpeningInsightsRef.current = true;
        cancelAnimation(insightsHubScale);
        insightsHubScale.value = withSequence(
          withTiming(1.1, { duration: 150, easing: Easing.out(Easing.sin) }),
          withTiming(1, { duration: 170, easing: Easing.inOut(Easing.sin) }),
        );
        if (openInsightsTimerRef.current) {
          clearTimeout(openInsightsTimerRef.current);
          openInsightsTimerRef.current = null;
        }
        openInsightsTimerRef.current = setTimeout(() => {
          isOpeningInsightsRef.current = false;
          openInsightsTimerRef.current = null;
          onInsightsPress();
        }, 320);
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
    insightsHubScale,
  ]);

  const { momentColors } = useMomentColors();
  const avatarSizeForDots = scaleFocused(100);
  const avatarCenterX = SW / 2;
  const avatarCenterY = SH * 0.48;

  const leftChevronScale = useSharedValue(1);
  const rightChevronScale = useSharedValue(1);
  const memoryBalanceToggleScale = useSharedValue(1);

  const handleFocusedSphereTapOverlay = useCallback((event: GestureResponderEvent) => {
    const start = focusedSpherePressStartRef.current;
    focusedSpherePressStartRef.current = null;
    if (start) {
      const dx = event.nativeEvent.pageX - start.x;
      const dy = event.nativeEvent.pageY - start.y;
      const distance = Math.hypot(dx, dy);
      const duration = Date.now() - start.ts;
      if (distance > TAP_MAX_DISTANCE_PX || duration > TAP_MAX_DURATION_MS) {
        return;
      }
    }
    if (!sunLoadComplete) return;
    if (isSunExpanded) {
      handleCollapseSun();
      return;
    }
    if (selectedSphere !== null) {
      onAddMemoriesPress?.();
      return;
    }
    focusedSpherePulseRef.current?.();
    onSphereSelect(SPHERE_LIST[focusedIdx].type);
  }, [
    sunLoadComplete,
    isSunExpanded,
    handleCollapseSun,
    selectedSphere,
    onAddMemoriesPress,
    focusedIdx,
    onSphereSelect,
  ]);

  const handleFocusedSphereTapOverlayPressIn = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      focusedSpherePressStartRef.current = { x: pageX, y: pageY, ts: Date.now() };
    },
    [],
  );

  const resolveEntitySelectForSphere = useCallback(
    (sphereIndex: number) => {
      return (entityId: string, s: LifeSphere) => {
        focusedSpherePressStartRef.current = null;

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

  const triggerLightHaptic = useCallback(() => {
    if (Platform.OS === "ios" && Device.isDevice) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const handleMemoryBalanceToggle = useCallback(() => {
    if (!sunLoadComplete) return;
    triggerLightHaptic();
    if (isSunExpanded) handleCollapseSun();
    const nextMode =
      displayMode === "memoryBalanceRings" ? "defaultOrbit" : "memoryBalanceRings";
    setDisplayMode(nextMode);
    if (insightsHubPulseTimerRef.current) {
      clearTimeout(insightsHubPulseTimerRef.current);
      insightsHubPulseTimerRef.current = null;
    }
    insightsHubPulseTimerRef.current = setTimeout(() => {
      cancelAnimation(insightsHubScale);
      insightsHubScale.value = withSequence(
        withTiming(1.07, { duration: 280, easing: Easing.out(Easing.sin) }),
        withTiming(1, { duration: 360, easing: Easing.inOut(Easing.sin) }),
      );
      insightsHubPulseTimerRef.current = null;
    }, 700);
  }, [
    sunLoadComplete,
    isSunExpanded,
    handleCollapseSun,
    displayMode,
    insightsHubScale,
    triggerLightHaptic,
  ]);

  const leftChevronStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leftChevronScale.value }],
  }));
  const rightChevronStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightChevronScale.value }],
  }));
  const memoryBalanceToggleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: memoryBalanceToggleScale.value }],
  }));
  const insightsHubAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: insightsHubScale.value }],
  }));
  const orbitLayerStyle = useAnimatedStyle(() => {
    const sunFade = interpolate(sunExpanded.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    const modeFade = interpolate(modeTransition.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: sunFade * modeFade,
      transform: [
        {
          scale: interpolate(modeTransition.value, [0, 1], [1, 0.975], Extrapolation.CLAMP),
        },
      ],
    };
  });
  /** Fades / scales Memory Balance sferas with both mode transition and sun menu spring. */
  const memoryBalanceLayerStyle = useAnimatedStyle(() => {
    const sunFade = interpolate(sunExpanded.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    const modeFade = interpolate(modeTransition.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: sunFade * modeFade,
      transform: [
        {
          scale: interpolate(modeTransition.value, [0, 1], [0.965, 1], Extrapolation.CLAMP),
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
    };
  });

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
    <GestureDetector gesture={horizontalPanGesture}>
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

      {!lightCosmicOff && <BackgroundDecorations />}

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
        sparklesEnabled={orbitViewAnimationsEnabled && pulsingAnimations}
      />

      {/* ─── Cosmic pulse rings for focused sphere — rendered at root level to avoid container clipping on real iOS devices ─── */}
      {/* Wrapper hides the rings while the orbit is being dragged or settling; the rings only belong to the resting focused sfera. */}
      <Animated.View pointerEvents="none" style={cosmicRingsDragHideStyle}>
        <CosmicPulseRings
          key={`cosmic-${focusedIdx}-${focusedSphere.type}`}
          color={
            colorScheme === "dark"
              ? focusedShadowColor
              : getSphereSferaColor(focusedSphere.type, "light")
          }
          ringOpacityPeak={colorScheme === "dark" ? 0.12 : 0.14}
          ringBorderWidth={1}
          ringShadowOpacity={colorScheme === "dark" ? 0.22 : 0.12}
          offsetX={ORBIT_CX}
          offsetY={ORBIT_CY + ORBIT_R}
          sphereSize={FOCUSED_SIZE * individualModeScale}
          enabled={
            orbitViewAnimationsEnabled &&
            pulsingAnimations &&
            !isMemoryBalanceMode &&
            !lightCosmicOff
          }
          visible={!isSphereTransitioning}
        />
      </Animated.View>

      {/* ─── Sfera layer: crossfade between default orbit and memory-balance rings ─── */}
      <Animated.View
        pointerEvents={
          selectedSphere === null && isMemoryBalanceMode ? "none" : "box-none"
        }
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 16,
          },
          orbitLayerStyle,
        ]}
      >
        {SPHERE_LIST.map((sphere, i) => (
          <OrbitSphereItem key={sphere.type} index={i} modeTransition={modeTransition}>
            <AnimatedSphere
              sphereIdx={i}
              sphere={sphere}
              focusedIdx={focusedIdx}
              focusedFracSv={focusedFracSv}
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
              animationsEnabled={orbitViewAnimationsEnabled}
              sphere3DEffect={sphere3DEffect}
            />
          </OrbitSphereItem>
        ))}
      </Animated.View>
      {/* Same timing as orbit sferas: only after initial load gate (splash + data). */}
      {selectedSphere === null && sunLoadComplete && (
        <Animated.View
          pointerEvents={isMemoryBalanceMode && !isSunExpanded ? "auto" : "none"}
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
            modeTransition={modeTransition}
            sphere3DEffect={sphere3DEffect}
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
            zIndex: 30,
          }}
          onPressIn={handleFocusedSphereTapOverlayPressIn}
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
          sphere3DEffect={sphere3DEffect}
        />
      ) : (
        <View
          style={{
            position: "absolute",
            left: SUN_CENTER_X - INSIGHTS_HUB_SIZE / 2,
            top:
              SUN_CENTER_Y -
              INSIGHTS_HUB_SIZE / 2 +
              INSIGHTS_HUB_MEMORY_BALANCE_OFFSET_Y,
            width: INSIGHTS_HUB_SIZE,
            height: INSIGHTS_HUB_SIZE,
            zIndex: 20,
          }}
          pointerEvents="box-none"
        >
          <Animated.View style={[{ flex: 1 }, insightsHubAnimatedStyle]}>
            <Pressable
              onPress={handleCircleAvatarPress}
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
          </Animated.View>
        </View>
      )}

      {/* ─── Focused sfera label + pagination dots (below rotating entities) ─── */}
      {!isMemoryBalanceMode && (
        <Animated.View
          style={[
            styles.focusedLabelContainer,
            {
              top: focusedLabelTop,
              opacity: !sunLoadComplete || isSunExpanded ? 0 : 1,
            },
            focusedLabelDragFadeStyle,
          ]}
          pointerEvents="none"
        >
          <ThemedText style={styles.focusedLabelText}>
            {t(`spheres.${SPHERE_LIST[focusedLabelIdx].type}`)}
          </ThemedText>
          <View
            style={[styles.focusedLabelDotsRow, { marginTop: LABEL_TO_DOTS_GAP }]}
          >
            {SPHERE_LIST.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.focusedLabelDot,
                  i === focusedLabelIdx && styles.focusedLabelDotActive,
                  {
                    backgroundColor:
                      colorScheme === "dark"
                        ? i === focusedLabelIdx
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(255,255,255,0.3)"
                        : i === focusedLabelIdx
                          ? Colors.light.text
                          : "rgba(13, 13, 13, 0.35)",
                  },
                ]}
              />
            ))}
          </View>
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
                color={
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.45)"
                    : Colors.light.text
                }
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
                color={
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.45)"
                    : Colors.light.text
                }
              />
            </Pressable>
          </Animated.View>
        </>
      )}

      </View>
    </GestureDetector>
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
  },
  focusedLabelDotActive: {
    width: SW * 0.06,
    height: SW * 0.022,
    borderRadius: SW * 0.011,
  },
  chevron: {
    position: "absolute",
    top: ORBIT_CY + ORBIT_R - scaleFocused(16),
    zIndex: 40,
    elevation: 40,
  },
  chevronLeft: {
    left: scaleFocused(2),
  },
  chevronRight: {
    right: scaleFocused(2),
  },
  chevronPressable: {
    // Keep chevrons tappable without covering orbiting entity avatars.
    width: scaleFocused(44),
    height: scaleFocused(44),
    justifyContent: "center",
    alignItems: "center",
  },
});
