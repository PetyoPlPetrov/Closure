/**
 * FocusedSferas view — one sphere in focus (large, center-bottom), the rest on orbit.
 * Swipe left/right or use chevrons to change focus. Tap Sunny Life avatar to return to Classic view.
 *
 * All interaction state lives here so the parent home tab does NOT re-render on swipes/interactions.
 */

import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  getSphere3DGradientColors,
  getSphereGradientColors,
  getSphereIconColor,
  getSphereShadowColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  FeColorMatrix,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  Filter,
  Line,
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
};

// ───────────────────── Small floating memory icons around one entity (one per memory, sunny/cloudy color) ─────────────────────

const MOMENT_ICON_SIZE = 16;
const MOMENT_ORBIT_RADIUS = 32; // outside entity avatar (entity radius ~20 for focused; +12 gap so memories sit clearly away)

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
  }, [delay, duration, opacity, scale]);

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
  sphere,
  centerX,
  centerY,
  orbitRadius,
  avatarSize,
  glowColor,
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
          shadowOpacity: 0.8,
          shadowRadius: isTablet ? 12 : 8,
          elevation: 8,
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
  colorScheme,
  sunnyPercentage,
  orbitDurationMs = DEFAULT_ENTITY_ORBIT_DURATION_MS,
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
  colorScheme: "light" | "dark";
  sunnyPercentage: number;
  orbitDurationMs?: number;
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
    const rad = (angle.value * Math.PI) / 180;
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
    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: SPHERE_CONTAINER_SIZE,
      height: SPHERE_CONTAINER_SIZE,
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
        { scale: depthScale },
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
    transform: [{ scale: spherePulseScale.value }],
  }));

  const iconSize = isFocused
    ? FOCUSED_ICON_SIZE
    : Math.round(target.size * 0.5);

  return (
    <Animated.View
      style={containerStyle}
      pointerEvents={isFocused ? "box-none" : "none"}
    >
      <Pressable
        onPress={onPress}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SPHERE_CONTAINER_SIZE,
          height: SPHERE_CONTAINER_SIZE,
          zIndex: isFocused ? 12 : 10,
          opacity: isFocused ? 1 : 0.55,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Animated.View
          style={[
            sphereStyle,
            {
              borderRadius: 1000,
              overflow: "visible",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: colorScheme === "dark" ? shadowColor : "#000",
              shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
              shadowOpacity: colorScheme === "dark" ? 0.5 : 0.25,
              shadowRadius: isTablet ? 16 : 12,
              elevation: 10,
            },
          ]}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            style={{ position: "absolute" }}
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
          {/* Specular highlight - bright ellipse top-left for glossy 3D effect */}
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
          <View
            style={{
              position: "absolute",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1,
            }}
          >
            <MaterialIcons
              name={sphere.icon as any}
              size={iconSize}
              color={iconColor}
            />
          </View>
        </Animated.View>
      </Pressable>
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SPHERE_CONTAINER_SIZE,
          height: SPHERE_CONTAINER_SIZE,
          opacity: isFocused ? 1 : 0.55,
          zIndex: isFocused ? 12 : 10,
          pointerEvents: "box-none",
        }}
      >
        <EntityRing
          uris={entityUris}
          entityIds={entityIds}
          entityNames={entityNames}
          entityMemories={entityMemories}
          onEntitySelect={onEntitySelect}
          sphere={sphere.type}
          centerX={CONTAINER_HALF}
          centerY={CONTAINER_HALF}
          orbitRadius={orbitRadius}
          avatarSize={entityAvatarSize}
          glowColor={shadowColor}
          showFloatingMoments={isFocused}
          rotateOrbit={isFocused}
          orbitDurationMs={orbitDurationMs}
          randomPulseIndex={randomPulseIndex}
        />
      </View>
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

const SunnyLifeAvatar = React.memo(function SunnyLifeAvatar({
  percentage,
  hasMemories,
  onPress,
  onAddMemoriesPress,
  colorScheme,
  x,
  y,
}: {
  percentage: number;
  hasMemories: boolean;
  /** When set, tapping the avatar (when hasMemories) switches to Classic view (wheel of life). */
  onPress?: () => void;
  /** When set, tapping "Add memories" (when !hasMemories) navigates to Sfera tab. */
  onAddMemoriesPress?: () => void;
  colorScheme: "light" | "dark";
  x: number;
  y: number;
}) {
  const { momentColors } = useMomentColors();
  const t = useTranslate();
  const { language } = useLanguage();
  const handlePress = hasMemories ? onPress : onAddMemoriesPress;
  const colors = Colors[colorScheme] as {
    primary: string;
    primaryLight?: string;
    primaryDark?: string;
  };
  const primaryHex = colors.primary ?? "#64B5F6";
  const glowMatrixValues = React.useMemo(() => {
    const rgb = hexToRgbNorm(primaryHex);
    const m = (a: number) =>
      `${rgb.r} 0 0 0 0   0 ${rgb.g} 0 0 0   0 0 ${rgb.b} 0 0   0 0 0 ${a} 0`;
    return {
      m05: m(0.5),
      m07: m(0.7),
      m085: m(0.85),
      m08: m(0.8),
      m09: m(0.9),
      m1: m(1),
    };
  }, [primaryHex]);

  const avatarSize = 100;
  const borderWidth = 8;
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const gradientColors =
    colorScheme === "dark" ? COSMIC_INNER_DARK : COSMIC_INNER_LIGHT;

  // Pulse animation for circle avatar (percentage) — every 12s, offset so not in sync with focused sphere
  const avatarPulseScale = useSharedValue(1);
  useEffect(() => {
    avatarPulseScale.value = 1;
    avatarPulseScale.value = withDelay(
      12000,
      withRepeat(
        withSequence(
          withSpring(1.1, { damping: 8, stiffness: 100 }),
          withSpring(1, { damping: 10, stiffness: 150 }),
          withDelay(12000, withTiming(1, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(avatarPulseScale);
      avatarPulseScale.value = 1;
    };
  }, [avatarPulseScale]);
  // Press feedback: scale down on press, spring back on release
  const pressScale = useSharedValue(1);
  const avatarPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarPulseScale.value * pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    cancelAnimation(pressScale);
    pressScale.value = withSpring(0.9, { damping: 12, stiffness: 400 });
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    cancelAnimation(pressScale);
    pressScale.value = withSpring(1, { damping: 12, stiffness: 400 });
  }, [pressScale]);

  const wrapperStyle = {
    position: "absolute" as const,
    left: x - avatarSize / 2,
    top: y - avatarSize / 2,
    width: avatarSize,
    height: avatarSize,
    zIndex: 25, // Above spheres (10-12) so taps always reach the avatar
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={wrapperStyle}
    >
      <Animated.View
        style={[{ width: avatarSize, height: avatarSize }, avatarPulseStyle]}
      >
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            }}
          />
          <Svg
            width={avatarSize}
            height={avatarSize}
            viewBox={`0 0 ${avatarSize} ${avatarSize}`}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Defs>
              <RadialGradient
                id="nebulaHalo"
                cx="50%"
                cy="50%"
                r="65%"
                fx="50%"
                fy="50%"
              >
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
                <Stop
                  offset="50%"
                  stopColor={colors.primaryLight ?? colors.primary}
                  stopOpacity="0.08"
                />
                <Stop
                  offset="85%"
                  stopColor={colors.primary}
                  stopOpacity="0.2"
                />
                <Stop
                  offset="100%"
                  stopColor={colors.primaryDark ?? colors.primary}
                  stopOpacity="0.35"
                />
              </RadialGradient>
              <Filter
                id="nebulaBlur"
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
              >
                <FeGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="12"
                  result="nebulaBlurred"
                />
                <FeMerge>
                  <FeMergeNode in="nebulaBlurred" />
                </FeMerge>
              </Filter>
              <SvgLinearGradient
                id="focusedBorderGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop
                  offset="0%"
                  stopColor={colors.primary}
                  stopOpacity="0.9"
                />
                <Stop
                  offset="50%"
                  stopColor={colors.primaryLight ?? colors.primary}
                  stopOpacity="1"
                />
                <Stop
                  offset="100%"
                  stopColor={colors.primaryDark ?? colors.primary}
                  stopOpacity="1"
                />
              </SvgLinearGradient>
              <Filter
                id="focusedOuterGlow"
                x="-200%"
                y="-200%"
                width="500%"
                height="500%"
              >
                <FeGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="20"
                  result="outerBlurLarge"
                />
                <FeColorMatrix
                  in="outerBlurLarge"
                  type="matrix"
                  values={glowMatrixValues.m05}
                  result="outerGlowLarge"
                />
                <FeGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="12"
                  result="outerBlurMedium"
                />
                <FeColorMatrix
                  in="outerBlurMedium"
                  type="matrix"
                  values={glowMatrixValues.m07}
                  result="outerGlowMedium"
                />
                <FeGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="6"
                  result="outerBlurSmall"
                />
                <FeColorMatrix
                  in="outerBlurSmall"
                  type="matrix"
                  values={glowMatrixValues.m09}
                  result="outerGlowSmall"
                />
                <FeMerge>
                  <FeMergeNode in="outerGlowLarge" />
                  <FeMergeNode in="outerGlowMedium" />
                  <FeMergeNode in="outerGlowSmall" />
                </FeMerge>
              </Filter>
              <Filter
                id="focusedYellowGlow"
                x="-200%"
                y="-200%"
                width="500%"
                height="500%"
              >
                <FeGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="16"
                  result="outerBlur"
                />
                <FeColorMatrix
                  in="outerBlur"
                  type="matrix"
                  values={glowMatrixValues.m1}
                  result="outerGlow"
                />
                <FeGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="10"
                  result="outerBlurMed"
                />
                <FeColorMatrix
                  in="outerBlurMed"
                  type="matrix"
                  values={glowMatrixValues.m085}
                  result="outerGlowMed"
                />
                <FeGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="4"
                  result="innerBlur"
                />
                <FeColorMatrix
                  in="innerBlur"
                  type="matrix"
                  values={glowMatrixValues.m08}
                  result="innerGlow"
                />
                <FeMerge>
                  <FeMergeNode in="outerGlow" />
                  <FeMergeNode in="outerGlowMed" />
                  <FeMergeNode in="innerGlow" />
                  <FeMergeNode in="SourceGraphic" />
                </FeMerge>
              </Filter>
            </Defs>
            {/* Nebula halo - soft glow around outer part of circle */}
            <SvgCircle
              cx={avatarSize / 2}
              cy={avatarSize / 2}
              r={radius + 18}
              fill="url(#nebulaHalo)"
              filter="url(#nebulaBlur)"
            />
            {/* Cosmic dark ring track */}
            <SvgCircle
              cx={avatarSize / 2}
              cy={avatarSize / 2}
              r={radius}
              stroke={COSMIC_TRACK}
              strokeWidth={borderWidth}
              fill="none"
            />
            {/* Outer glow arc */}
            <SvgCircle
              cx={avatarSize / 2}
              cy={avatarSize / 2}
              r={radius}
              stroke="url(#focusedBorderGradient)"
              strokeWidth={borderWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              filter="url(#focusedOuterGlow)"
              transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
            />
            {/* Main glowing progress arc */}
            <SvgCircle
              cx={avatarSize / 2}
              cy={avatarSize / 2}
              r={radius}
              stroke="url(#focusedBorderGradient)"
              strokeWidth={borderWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              filter="url(#focusedYellowGlow)"
              transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
            />
            {/* Constellation lines */}
            {AVATAR_CONSTELLATION_LINES.map(([i, j], k) => (
              <Line
                key={`line-${k}`}
                x1={AVATAR_STARS[i].x * avatarSize}
                y1={AVATAR_STARS[i].y * avatarSize}
                x2={AVATAR_STARS[j].x * avatarSize}
                y2={AVATAR_STARS[j].y * avatarSize}
                stroke={AVATAR_LINE_COLOR}
                strokeWidth={1}
                strokeLinecap="round"
              />
            ))}
            {/* Constellation dots */}
            {AVATAR_STARS.map((star, k) => (
              <SvgCircle
                key={`star-${k}`}
                cx={star.x * avatarSize}
                cy={star.y * avatarSize}
                r={k < 8 ? 1.2 : 0.9}
                fill={AVATAR_STAR_COLOR}
              />
            ))}
          </Svg>

          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
            pointerEvents="box-none"
          >
            {hasMemories ? (
              <>
                <ThemedText
                  size="xl"
                  weight="bold"
                  style={{
                    color: colors.primaryLight ?? colors.primary,
                    fontSize: 24,
                  }}
                >
                  {Math.round(percentage)}%
                </ThemedText>
                {language === "bg" ? (
                  <View style={{ alignItems: "center" }}>
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={{
                        color: colors.primaryLight ?? colors.primary,
                        fontSize: 10,
                        marginTop: -2,
                        textAlign: "center",
                        lineHeight: 10,
                      }}
                    >
                      Слънчев
                    </ThemedText>
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={{
                        color: colors.primaryLight ?? colors.primary,
                        fontSize: 10,
                        textAlign: "center",
                        lineHeight: 10,
                        marginTop: -1,
                      }}
                    >
                      живот
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText
                    size="sm"
                    weight="medium"
                    style={{
                      color: colors.primaryLight ?? colors.primary,
                      fontSize: 12,
                      marginTop: -2,
                    }}
                  >
                    {t("avatar.sunnyLife")}
                  </ThemedText>
                )}
              </>
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${colors.primary}40`,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialIcons
                  name="add"
                  size={28}
                  color={colors.primaryLight ?? colors.primary}
                />
              </View>
            )}
          </View>
        </View>

        {/* Sun icon on the sunny arc - darker shade of sunny color from settings */}
        {percentage > 0 &&
          (() => {
            const sunnyArcAngle = -90 + ((percentage / 100) * 360) / 2;
            const sunnyAngleRad = (sunnyArcAngle * Math.PI) / 180;
            const iconRadius = avatarSize / 2;
            const sunX =
              avatarSize / 2 + iconRadius * Math.cos(sunnyAngleRad) - 12;
            const sunY =
              avatarSize / 2 + iconRadius * Math.sin(sunnyAngleRad) - 12;
            const sunShade = blendHex(
              momentColors.sunny.background,
              COSMIC_TRACK,
              0.22,
            );
            return (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: sunY,
                  left: sunX,
                  width: 24,
                  height: 24,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: sunShade,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: sunShade,
                  zIndex: 999,
                  elevation: 30,
                  shadowColor: sunShade,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                }}
              >
                <MaterialIcons
                  name="wb-sunny"
                  size={14}
                  color={momentColors.sunny.text}
                />
              </View>
            );
          })()}

        {/* Cloud icon on the dark arc */}
        {percentage < 100 &&
          percentage > 0 &&
          (() => {
            const cloudyStartAngle = -90 + (percentage / 100) * 360;
            const cloudyArcLength = 360 - (percentage / 100) * 360;
            const cloudyArcAngle = cloudyStartAngle + cloudyArcLength / 2;
            const cloudyAngleRad = (cloudyArcAngle * Math.PI) / 180;
            const iconRadius = avatarSize / 2;
            const cloudX =
              avatarSize / 2 + iconRadius * Math.cos(cloudyAngleRad) - 12;
            const cloudY =
              avatarSize / 2 + iconRadius * Math.sin(cloudyAngleRad) - 12;
            return (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: cloudY,
                  left: cloudX,
                  width: 24,
                  height: 24,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: momentColors.cloudy.background,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: momentColors.cloudy.background,
                  zIndex: 999,
                  elevation: 30,
                  shadowColor: momentColors.cloudy.background,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.5,
                  shadowRadius: 4,
                }}
              >
                <MaterialIcons
                  name="cloud"
                  size={14}
                  color={momentColors.cloudy.text}
                />
              </View>
            );
          })()}
      </Animated.View>
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
}: FocusedSferaViewProps) {
  const { isTablet } = useLargeDevice();
  const [focusedIdx, setFocusedIdx] = useState(initialFocusedIdx);
  const N = SPHERE_LIST.length;
  // Keep root aligned with TabScreenContainer; we shift spheres via ORBIT_CY instead.
  const rootMarginTop = 0;

  useEffect(() => {
    setFocusedIdx(initialFocusedIdx);
  }, [initialFocusedIdx]);

  const goToSphere = useCallback(
    (newIdx: number) => {
      setFocusedIdx(newIdx);
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
          const startX = g.moveX - g.dx;
          const inSideRegion =
            startX < SW * SIDE_REGION_WIDTH ||
            startX > SW * (1 - SIDE_REGION_WIDTH);
          if (inSideRegion) {
            return Math.abs(g.dy) > 20 && Math.abs(g.dy) > Math.abs(g.dx * 1.5);
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
          if (inSideRegion) {
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
            // Horizontal in center (focused sfera below avatar): left = next, right = prev
            if (g.dx < -50) goToSphere((focusedIdx + 1) % N);
            else if (g.dx > 50) goToSphere((focusedIdx - 1 + N) % N);
          }
        },
      }),
    [focusedIdx, goToSphere, N],
  );

  const t = useTranslate();
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

  // When circle avatar is pressed:
  // - Initial view (selectedSphere === null): switch to classic view
  // - Individual sfera view (selectedSphere !== null): clear selection to return to initial view
  const handleCircleAvatarPress = useCallback(() => {
    if (selectedSphere === null) {
      // Initial view: switch to classic wheel of life
      onSwitchToClassic();
    } else {
      // Individual sfera view: clear selection to return to initial view
      if (onClearSelection) {
        onClearSelection();
      } else {
        onSwitchToClassic();
      }
    }
  }, [selectedSphere, onClearSelection, onSwitchToClassic]);

  const { momentColors } = useMomentColors();
  const avatarSizeForDots = 100;
  const avatarCenterX = SW / 2;
  const avatarCenterY = SH * 0.48;

  const leftChevronScale = useSharedValue(1);
  const rightChevronScale = useSharedValue(1);

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

      {/* ─── Sparkled dots scattered across screen ─── */}
      <SparkledDots
        avatarSize={avatarSizeForDots}
        avatarCenterX={avatarCenterX}
        avatarCenterY={avatarCenterY}
        colorScheme={colorScheme}
        sunnyBackground={momentColors.sunny.background}
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
          onPress={() =>
            i === focusedIdx ? onSphereSelect(sphere.type) : goToSphere(i)
          }
          onEntitySelect={onEntitySelect}
          colorScheme={colorScheme}
          sunnyPercentage={getSphereSunnyPercentage(sphere.type)}
          orbitDurationMs={orbitDurationMs}
        />
      ))}

      {/* ─── Sunny Life avatar (floating in the distance, center of the gap between spheres) ─── */}
      <SunnyLifeAvatar
        percentage={circleAvatarPercentage}
        hasMemories={hasMemories}
        onPress={handleCircleAvatarPress}
        onAddMemoriesPress={onAddMemoriesPress}
        colorScheme={colorScheme}
        x={SW * 0.45}
        y={SH * 0.38}
      />

      {/* ─── Focused sfera label + pagination dots (below rotating entities) ─── */}
      <View
        style={[
          styles.focusedLabelContainer,
          {
            top: ORBIT_CY + ORBIT_R + FOCUSED_LABEL_GAP * 5.5,
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

      {/* ─── Chevron buttons: left = next, right = prev (orbit style; focused sfera swipe is reversed) ─── */}
      <Animated.View
        style={[styles.chevron, styles.chevronLeft, leftChevronStyle]}
      >
        <Pressable
          style={styles.chevronPressable}
          onPressIn={() => chevronPressIn("left")}
          onPressOut={() => chevronPressOut("left")}
          onPress={() => goToSphere((focusedIdx + 1) % N)}
        >
          <MaterialIcons
            name="chevron-left"
            size={32}
            color="rgba(255,255,255,0.45)"
          />
        </Pressable>
      </Animated.View>
      <Animated.View
        style={[styles.chevron, styles.chevronRight, rightChevronStyle]}
      >
        <Pressable
          style={styles.chevronPressable}
          onPressIn={() => chevronPressIn("right")}
          onPressOut={() => chevronPressOut("right")}
          onPress={() => goToSphere((focusedIdx - 1 + N) % N)}
        >
          <MaterialIcons
            name="chevron-right"
            size={32}
            color="rgba(255,255,255,0.45)"
          />
        </Pressable>
      </Animated.View>
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
    width: SW * 0.016,
    height: SW * 0.016,
    borderRadius: SW * 0.008,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  focusedLabelDotActive: {
    width: SW * 0.022,
    height: SW * 0.022,
    borderRadius: SW * 0.011,
    backgroundColor: "rgba(255,255,255,0.85)",
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
});
