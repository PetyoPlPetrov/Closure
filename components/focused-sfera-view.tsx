/**
 * FocusedSferas view — one sphere in focus (large, center-bottom), the rest on orbit.
 * Swipe left/right or use chevrons to change focus. Tap Sunny Life avatar to return to Classic view.
 *
 * All interaction state lives here so the parent home tab does NOT re-render on swipes/interactions.
 */

import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
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
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
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
/** Left just above the focused sfera (slot 4) — slightly bigger */
const BG_SPHERE_SIZE_LEFT_BELOW = 76;
/** Right just above / below-right of the circle avatar (slot 1) — a bit bigger */
const BG_SPHERE_SIZE_RIGHT_BELOW = 82;
/** Sfera above the Sunny Life circle on the right (slot 2) — slightly smaller */
const BG_SPHERE_SIZE_TOP_RIGHT = 46;
/** Sfera above the Sunny Life circle on the left (slot 3) — slightly bigger */
const BG_SPHERE_SIZE_TOP_LEFT = 62;
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

// ───────────────────────────── types ─────────────────────────────

export type FocusedSferaViewProps = {
  overallSunnyPercentage: number;
  onSphereSelect: (sphere: LifeSphere) => void;
  /** Switch back to Classic view (wheel of life). */
  onSwitchToClassic: () => void;
  /** Called when user taps a floating entity avatar; navigates to entity detail. */
  onEntitySelect: (entityId: string, sphere: LifeSphere) => void;
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
};

// ───────────────────── Small floating memory icons around one entity (one per memory, sunny/cloudy color) ─────────────────────

const MOMENT_ICON_SIZE = 16;
const MOMENT_ORBIT_RADIUS = 26; // outside entity avatar (avatar radius ~20 for focused)

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

  const dots = useMemo(() => {
    const numDots = isTablet ? 80 : 60;
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
}) {
  const { isTablet } = useLargeDevice();
  const orbitAngle = useSharedValue(0);

  useEffect(() => {
    if (!rotateOrbit) {
      cancelAnimation(orbitAngle);
      orbitAngle.value = 0;
      return;
    }
    cancelAnimation(orbitAngle);
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
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const angle = baseAngle + (rotateOrbit ? orbitAngle.value : 0);
    const x = centerX + Math.cos(angle) * orbitRadius - avatarSize / 2;
    const y = centerY + Math.sin(angle) * orbitRadius - avatarSize / 2;
    return {
      position: "absolute",
      left: x,
      top: y,
      width: avatarSize,
      height: avatarSize,
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
        onPress={() => entityId && onEntitySelect(entityId, sphere)}
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
const ORBIT_SLIDE_DURATION = 420;

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
    angle.value = withTiming(
      targetAngle,
      { duration: ORBIT_SLIDE_DURATION, easing: Easing.inOut(Easing.ease) },
      () => {
        "worklet";
        // Keep angle in [0,360) to prevent unbounded drift after many cycles
        const v = angle.value;
        angle.value = ((v % 360) + 360) % 360;
      },
    );
    size.value = withTiming(next.size, {
      duration: ORBIT_SLIDE_DURATION,
      easing: Easing.inOut(Easing.ease),
    });
  }, [sphereIdx, focusedIdx]);

  const CONTAINER_HALF = SPHERE_CONTAINER_SIZE / 2;
  const slot = (sphereIdx - focusedIdx + 5) % 5;

  const containerStyle = useAnimatedStyle(() => {
    const rad = (angle.value * Math.PI) / 180;
    const centerX = ORBIT_CX + ORBIT_R * Math.sin(rad);
    const centerY = ORBIT_CY + ORBIT_R * Math.cos(rad);
    // Depth: spheres behind (top) are smaller and shifted up for distance illusion
    // cos(rad)=1 at bottom (front), -1 at top (back). sqrt curve: back smaller, front/sides bigger
    const x = (1 + Math.cos(rad)) / 2;
    const depthScale =
      slot === 0 ? 1 : 0.38 + 0.62 * Math.sqrt(Math.max(0, x));
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
            topPairOffsetY,
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
  const iconColor = getSphereIconColor(sphere.type, colorScheme);
  const shadowColor = getSphereShadowColor(sphere.type, colorScheme);
  const entityAvatarSize = isFocused
    ? 40
    : Math.max(22, Math.round(target.size * 0.3));
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

const SunnyLifeAvatar = React.memo(function SunnyLifeAvatar({
  percentage,
  colorScheme,
  x,
  y,
  onPress,
}: {
  percentage: number;
  colorScheme: "light" | "dark";
  x: number;
  y: number;
  /** When set, tapping the avatar switches to Classic view (wheel of life). */
  onPress?: () => void;
}) {
  const { momentColors } = useMomentColors();
  const t = useTranslate();
  const { language } = useLanguage();

  const avatarSize = 100;
  const borderWidth = 8;
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const gradientColors =
    colorScheme === "dark" ? BADGE_GRADIENT_DARK : BADGE_GRADIENT_LIGHT;

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
      onPress={onPress}
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
              <SvgLinearGradient
                id="focusedBorderGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop
                  offset="0%"
                  stopColor={momentColors.sunny.background}
                  stopOpacity="0.7"
                />
                <Stop
                  offset="50%"
                  stopColor={momentColors.sunny.background}
                  stopOpacity="1"
                />
                <Stop
                  offset="100%"
                  stopColor={momentColors.sunny.background}
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
                  values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.5 0"
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
                  values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.7 0"
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
                  values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.9 0"
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
                  values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 1.0 0"
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
                  values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.85 0"
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
                  values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.8 0"
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
            {/* Dark ring track */}
            <SvgCircle
              cx={avatarSize / 2}
              cy={avatarSize / 2}
              r={radius}
              stroke="#000000"
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
          </Svg>

          <View style={{ alignItems: "center", marginTop: -8 }}>
            <ThemedText
              size="xl"
              weight="bold"
              style={{ color: momentColors.sunny.background, fontSize: 24 }}
            >
              {Math.round(percentage)}%
            </ThemedText>
            {language === "bg" ? (
              <View style={{ alignItems: "center" }}>
                <ThemedText
                  size="sm"
                  weight="medium"
                  style={{
                    color: momentColors.sunny.background,
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
                    color: momentColors.sunny.background,
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
                  color: momentColors.sunny.background,
                  fontSize: 12,
                  marginTop: -2,
                }}
              >
                {t("avatar.sunnyLife")}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Sun icon on the sunny arc */}
        {percentage > 0 &&
          (() => {
            const sunnyArcAngle = -90 + ((percentage / 100) * 360) / 2;
            const sunnyAngleRad = (sunnyArcAngle * Math.PI) / 180;
            const iconRadius = avatarSize / 2;
            const sunX =
              avatarSize / 2 + iconRadius * Math.cos(sunnyAngleRad) - 12;
            const sunY =
              avatarSize / 2 + iconRadius * Math.sin(sunnyAngleRad) - 12;
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
                  backgroundColor: momentColors.sunny.background,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: momentColors.sunny.background,
                  zIndex: 999,
                  elevation: 30,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                }}
              >
                <MaterialIcons name="wb-sunny" size={14} color="#FFFFFF" />
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
                  backgroundColor: "#555555",
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: "#222222",
                  zIndex: 999,
                  elevation: 30,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                }}
              >
                <MaterialIcons name="cloud" size={14} color="#FFFFFF" />
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
  onSphereSelect,
  onSwitchToClassic,
  onEntitySelect,
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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy * 1.5),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) {
            goToSphere((focusedIdx + 1) % N);
          } else if (g.dx > 50) {
            goToSphere((focusedIdx - 1 + N) % N);
          }
        },
      }),
    [focusedIdx, goToSphere, N],
  );

  const focusedSphere = SPHERE_LIST[focusedIdx];
  const focusedSunnyPct = getSphereSunnyPercentage(focusedSphere.type);
  const focusedGradientColors = getSphereGradientColors(
    focusedSphere.type,
    focusedSunnyPct,
    colorScheme,
  );
  const focusedIconColor = getSphereIconColor(focusedSphere.type, colorScheme);
  const focusedShadowColor = getSphereShadowColor(
    focusedSphere.type,
    colorScheme,
  );
  const focusedUris = entityImageUrisBySphere[focusedSphere.type] ?? [];

  const handleSwitchToClassic = useCallback(() => {
    onSwitchToClassic();
  }, [onSwitchToClassic]);

  const { momentColors } = useMomentColors();
  const avatarSizeForDots = 100;
  const avatarCenterX = SW / 2;
  const avatarCenterY = SH * 0.48;

  const chevronPulseProgress = useSharedValue(0);

  useEffect(() => {
    chevronPulseProgress.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withDelay(800, withTiming(0, { duration: 0 })),
        ),
        2,
        false,
      ),
    );
    return () => {
      cancelAnimation(chevronPulseProgress);
      chevronPulseProgress.value = 0;
    };
  }, [chevronPulseProgress]);

  const chevronPulseStyle = useAnimatedStyle(() => {
    const p = chevronPulseProgress.value;
    const scale = 1 + p * 0.15;
    const opacity = interpolate(p, [0, 1], [0.82, 1]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

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
        percentage={overallSunnyPercentage}
        colorScheme={colorScheme}
        x={SW * 0.45}
        y={SH * 0.38}
        onPress={handleSwitchToClassic}
      />

      {/* ─── Chevron buttons: left = prev, right = next (orbital cycle) ─── */}
      <Animated.View
        style={[styles.chevron, styles.chevronLeft, chevronPulseStyle]}
      >
        <Pressable
          style={{ padding: 8 }}
          onPress={() => goToSphere((focusedIdx - 1 + N) % N)}
        >
          <MaterialIcons
            name="chevron-left"
            size={32}
            color="rgba(255,255,255,0.45)"
          />
        </Pressable>
      </Animated.View>
      <Animated.View
        style={[styles.chevron, styles.chevronRight, chevronPulseStyle]}
      >
        <Pressable
          style={{ padding: 8 }}
          onPress={() => goToSphere((focusedIdx + 1) % N)}
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
});
