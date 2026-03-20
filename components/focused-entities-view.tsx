/**
 * FocusedEntities view — displays entities in orbital layout around a central sphere avatar.
 * Similar to FocusedSferaView but for entities within a single sphere.
 * Swipe left/right or use chevrons to change focus between entities.
 * The central avatar shows sunny vs cloudy percentage for the specific sphere.
 */

import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { BaseEntity, IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  getSphereGradientColors,
  getSphereIconColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  PanResponder,
  Pressable,
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
  Circle as SvgCircle,
  Defs,
  FeColorMatrix,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  Filter,
  Line,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");

// Avatar constants (from focused-sfera-view.tsx)
const COSMIC_TRACK = "#0D1525";
const COSMIC_INNER_DARK = ["#0A0E1A", "#0F1422", "#151C2E", "#1A2440", "#1E2A4A"] as const;
const COSMIC_INNER_LIGHT = ["#2A2A3A", "#3A3A4E", "#4A4A62", "#5A5A76", "#6A6A8A"] as const;

const AVATAR_STARS = [
  { x: 0.82, y: 0.5 }, { x: 0.726, y: 0.726 }, { x: 0.5, y: 0.82 }, { x: 0.274, y: 0.726 },
  { x: 0.18, y: 0.5 }, { x: 0.274, y: 0.274 }, { x: 0.5, y: 0.18 }, { x: 0.726, y: 0.274 },
  { x: 0.62, y: 0.38 }, { x: 0.38, y: 0.62 }, { x: 0.38, y: 0.38 }, { x: 0.62, y: 0.62 },
] as const;
const AVATAR_CONSTELLATION_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [8, 9], [10, 11],
];
const AVATAR_STAR_COLOR = "rgba(184, 232, 236, 0.35)";
const AVATAR_LINE_COLOR = "rgba(184, 232, 236, 0.12)";

function hexToRgbNorm(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

// Central avatar configuration
const AVATAR_SIZE = 100;
const AVATAR_CX = SW / 2;
const AVATAR_CY = SH * 0.46;

// Entity configuration
const FOCUSED_ENTITY_SIZE = 120;
const ENTITY_ORBIT_RADIUS = 160;

// Orbit configuration for non-focused entities
const ORBIT_RADIUS = 100;
const NUM_ORBIT_SLOTS = 4; // 4 entities in orbit around focused entity

// Memory icons around each entity
const MOMENT_ICON_SIZE = 16;
const MOMENT_ORBIT_RADIUS = 38; // Increased from 26 for more distance

const DEFAULT_ORBIT_DURATION_MS = 60000;

// ───────────────────── types ─────────────────────────────

export type FocusedEntitiesViewProps = {
  sphere: LifeSphere;
  sphereSunnyPercentage: number;
  entities: (BaseEntity | { id: string; name: string; imageUri?: string; isCompleted: boolean; createdAt?: string })[];
  memoriesPerEntity: IdealizedMemory[][];
  onMemorySelect?: (memoryId: string, entityId: string) => void;
  onEntitySelect?: (entityId: string) => void;
  colorScheme: "light" | "dark";
  orbitDurationMs?: number;
  constellationAmount?: number;
  constellationOpacity?: number;
  hidden?: boolean;
};

// ───────────────────── Helper functions ─────────────────────────────

/** Compute sunny % for a memory from goodFacts vs hardTruths */
function getMemorySunnyPercentage(memory: IdealizedMemory): number {
  const clouds = (memory.hardTruths || []).length;
  const suns = (memory.goodFacts || []).length;
  const total = clouds + suns;
  if (total === 0) return 50;
  return (suns / total) * 100;
}

/** Get sphere icon name */
function getSphereIcon(sphere: LifeSphere): string {
  const icons: Record<LifeSphere, string> = {
    relationships: "favorite",
    career: "work",
    family: "family-restroom",
    friends: "people",
    hobbies: "sports-esports",
  };
  return icons[sphere];
}

/** Get sphere name for display */
function getSphereName(sphere: LifeSphere, t: (key: string) => string): string {
  const keys: Record<LifeSphere, string> = {
    relationships: "relationships",
    career: "career",
    family: "family",
    friends: "friends",
    hobbies: "hobbies",
  };
  return t(keys[sphere]);
}

// ───────────────────── Small floating memory icons around one entity ─────────────────────

const SmallFloatingMoments = React.memo(function SmallFloatingMoments({
  entityCenterX,
  entityCenterY,
  entityIndex,
  memories,
  orbitDurationMs = DEFAULT_ORBIT_DURATION_MS,
}: {
  entityCenterX: number;
  entityCenterY: number;
  entityIndex: number;
  memories: IdealizedMemory[];
  orbitDurationMs?: number;
}) {
  const { momentColors } = useMomentColors();
  const orbitAngle = useSharedValue(0);

  useEffect(() => {
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
  }, [orbitAngle, orbitDurationMs]);

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
        const baseAngle = (i / memoryIcons.length) * 2 * Math.PI - Math.PI / 2;
        return (
          <SmallFloatingMomentIcon
            key={m.id}
            baseAngle={baseAngle}
            entityCenterX={entityCenterX}
            entityCenterY={entityCenterY}
            orbitAngle={orbitAngle}
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
  baseAngle,
  entityCenterX,
  entityCenterY,
  orbitAngle,
  color,
  name,
  glowColor,
}: {
  baseAngle: number;
  entityCenterX: number;
  entityCenterY: number;
  orbitAngle: SharedValue<number>;
  color: string;
  name: "wb-sunny" | "cloud";
  glowColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const angle = baseAngle + orbitAngle.value;
    const x = entityCenterX + Math.cos(angle) * MOMENT_ORBIT_RADIUS - MOMENT_ICON_SIZE / 2;
    const y = entityCenterY + Math.sin(angle) * MOMENT_ORBIT_RADIUS - MOMENT_ICON_SIZE / 2;
    return {
      position: "absolute",
      left: x,
      top: y,
      width: MOMENT_ICON_SIZE,
      height: MOMENT_ICON_SIZE,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
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

// ───────────────────── Sparkled dots ─────────────────────

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
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: duration / 2 }),
          withTiming(0, { duration: duration / 2 }),
        ),
        -1,
        false,
      ),
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 2 }),
          withTiming(0.7, { duration: duration / 2 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, duration, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const dotColor = colorScheme === "dark" ? sunnyBackground : "#FFD700";

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
          backgroundColor: dotColor,
        },
        animatedStyle,
      ]}
    />
  );
});

// ───────────────────── Orbiting Entity ─────────────────────

const OrbitingEntity = React.memo(function OrbitingEntity({
  entity,
  memories,
  index,
  count,
  baseAngle,
  centerX,
  centerY,
  orbitRadius,
  avatarSize,
  glowColor,
  onEntitySelect,
  sphere,
  orbitAngle,
  rotateOrbit,
  orbitDurationMs = DEFAULT_ORBIT_DURATION_MS,
}: {
  entity: BaseEntity | { id: string; name: string; imageUri?: string; isCompleted: boolean; createdAt?: string };
  memories: IdealizedMemory[];
  index: number;
  count: number;
  baseAngle: number;
  centerX: number;
  centerY: number;
  orbitRadius: number;
  avatarSize: number;
  glowColor: string;
  onEntitySelect?: (entityId: string) => void;
  sphere: LifeSphere;
  orbitAngle: SharedValue<number>;
  rotateOrbit: boolean;
  orbitDurationMs?: number;
}) {
  const { isTablet } = useLargeDevice();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
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

  const initialLetter = entity.name.trim()
    ? entity.name.trim()[0].toUpperCase()
    : "?";

  const borderWidth = isTablet ? 3 : 2;

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
          cancelAnimation(scale);
          scale.value = withSequence(
            withTiming(1.18, { duration: 80, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          );
          if (onEntitySelect) {
            onEntitySelect(entity.id);
          }
        }}
      >
        {entity.imageUri ? (
          <Image
            source={{ uri: entity.imageUri }}
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
        <SmallFloatingMoments
          entityCenterX={avatarSize / 2}
          entityCenterY={avatarSize / 2}
          entityIndex={index}
          memories={memories}
          orbitDurationMs={orbitDurationMs}
        />
      </Pressable>
    </Animated.View>
  );
});

// ───────────────────── Entity Ring ─────────────────────

const EntityRing = React.memo(function EntityRing({
  entities,
  memoriesPerEntity,
  onEntitySelect,
  sphere,
  centerX,
  centerY,
  orbitRadius,
  avatarSize,
  glowColor,
  rotateOrbit = false,
  orbitDurationMs = DEFAULT_ORBIT_DURATION_MS,
}: {
  entities: (BaseEntity | { id: string; name: string; imageUri?: string; isCompleted: boolean; createdAt?: string })[];
  memoriesPerEntity: IdealizedMemory[][];
  onEntitySelect?: (entityId: string) => void;
  sphere: LifeSphere;
  centerX: number;
  centerY: number;
  orbitRadius: number;
  avatarSize: number;
  glowColor: string;
  rotateOrbit?: boolean;
  orbitDurationMs?: number;
}) {
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

  if (entities.length === 0) return null;
  const count = Math.min(entities.length, 8);

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const baseAngle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const entity = entities[i];
        const memories = memoriesPerEntity[i] ?? [];
        return (
          <OrbitingEntity
            key={`${entity.id}-${i}`}
            entity={entity}
            memories={memories}
            index={i}
            count={count}
            baseAngle={baseAngle}
            centerX={centerX}
            centerY={centerY}
            orbitRadius={orbitRadius}
            avatarSize={avatarSize}
            glowColor={glowColor}
            onEntitySelect={onEntitySelect}
            sphere={sphere}
            orbitAngle={orbitAngle}
            rotateOrbit={rotateOrbit}
            orbitDurationMs={orbitDurationMs}
          />
        );
      })}
    </>
  );
});

// ───────────────────── Central Sphere Avatar ─────────────────────

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

const SphereAvatar = React.memo(function SphereAvatar({
  percentage,
  colorScheme,
  x,
  y,
}: {
  percentage: number;
  colorScheme: "light" | "dark";
  x: number;
  y: number;
}) {
  const { momentColors } = useMomentColors();
  const colors = Colors[colorScheme] as { primary: string; primaryLight?: string; primaryDark?: string };
  const primaryHex = colors.primary ?? "#64B5F6";
  const glowMatrixValues = React.useMemo(() => {
    const rgb = hexToRgbNorm(primaryHex);
    const m = (a: number) =>
      `${rgb.r} 0 0 0 0   0 ${rgb.g} 0 0 0   0 0 ${rgb.b} 0 0   0 0 0 ${a} 0`;
    return { m05: m(0.5), m07: m(0.7), m085: m(0.85), m08: m(0.8), m09: m(0.9), m1: m(1) };
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

  const avatarPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarPulseScale.value }],
  }));

  const wrapperStyle = {
    position: "absolute" as const,
    left: x - avatarSize / 2,
    top: y - avatarSize / 2,
    width: avatarSize,
    height: avatarSize,
    zIndex: 25, // Above spheres (10-12) so taps always reach the avatar
  };

  return (
    <View style={wrapperStyle} pointerEvents="none">
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
                <Stop offset="50%" stopColor={colors.primaryLight ?? colors.primary} stopOpacity="0.08" />
                <Stop offset="85%" stopColor={colors.primary} stopOpacity="0.2" />
                <Stop offset="100%" stopColor={colors.primaryDark ?? colors.primary} stopOpacity="0.35" />
              </RadialGradient>
              <Filter id="nebulaBlur" x="-80%" y="-80%" width="260%" height="260%">
                <FeGaussianBlur in="SourceGraphic" stdDeviation="12" result="nebulaBlurred" />
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
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
                <Stop offset="50%" stopColor={colors.primaryLight ?? colors.primary} stopOpacity="1" />
                <Stop offset="100%" stopColor={colors.primaryDark ?? colors.primary} stopOpacity="1" />
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
            <ThemedText
              size="xl"
              weight="bold"
              style={{ color: colors.primaryLight ?? colors.primary, fontSize: 24 }}
            >
              {Math.round(percentage)}%
            </ThemedText>
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
                <MaterialIcons name="wb-sunny" size={14} color={momentColors.sunny.text} />
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
                <MaterialIcons name="cloud" size={14} color={momentColors.cloudy.text} />
              </View>
            );
          })()}
      </Animated.View>
    </View>
  );
});

// ───────────────────── Main Component ─────────────────────

export const FocusedEntitiesView = React.memo(function FocusedEntitiesView({
  sphere,
  sphereSunnyPercentage,
  entities: rawEntities,
  memoriesPerEntity: rawMemoriesPerEntity,
  onMemorySelect,
  onEntitySelect,
  colorScheme,
  orbitDurationMs = DEFAULT_ORBIT_DURATION_MS,
  constellationAmount = 5,
  constellationOpacity = 5,
  hidden = false,
}: FocusedEntitiesViewProps) {
  const t = useTranslate();
  const { isTablet } = useLargeDevice();

  // Sort entities: ongoing first (isCompleted=false), then by date descending
  const { sortedEntities, sortedMemoriesPerEntity } = useMemo(() => {
    const combined = rawEntities.map((entity, i) => ({
      entity,
      memories: rawMemoriesPerEntity[i] ?? [],
    }));

    // Sort: ongoing first, then by createdAt descending
    combined.sort((a, b) => {
      if (a.entity.isCompleted !== b.entity.isCompleted) {
        return a.entity.isCompleted ? 1 : -1; // false first (ongoing)
      }
      const dateA = new Date(a.entity.createdAt || 0).getTime();
      const dateB = new Date(b.entity.createdAt || 0).getTime();
      return dateB - dateA; // descending
    });

    return {
      sortedEntities: combined.map((c) => c.entity),
      sortedMemoriesPerEntity: combined.map((c) => c.memories),
    };
  }, [rawEntities, rawMemoriesPerEntity]);

  const gradientColors = getSphereGradientColors(sphere, sphereSunnyPercentage, colorScheme);
  const sunnyBackground = gradientColors[0];

  if (sortedEntities.length === 0) {
    // No entities to display
    return (
      <View
        style={{
          flex: 1,
          width: SW,
          height: SH,
          opacity: hidden ? 0 : 1,
          pointerEvents: hidden ? "none" : "auto",
        }}
      >
        <ConstellationBackground
          width={SW}
          height={SH}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <SparkledDots
          avatarSize={AVATAR_SIZE}
          avatarCenterX={AVATAR_CX}
          avatarCenterY={AVATAR_CY}
          colorScheme={colorScheme}
          sunnyBackground={sunnyBackground}
        />
        <SphereAvatar
          percentage={sphereSunnyPercentage}
          colorScheme={colorScheme}
          x={AVATAR_CX}
          y={AVATAR_CY}
        />
        <View
          style={{
            position: "absolute",
            top: AVATAR_CY + AVATAR_SIZE / 2 + 40,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <ThemedText style={{ fontSize: 18, opacity: 0.7 }}>
            No entities yet
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        width: SW,
        height: SH,
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      <ConstellationBackground
        width={SW}
        height={SH}
        constellationAmount={constellationAmount}
        constellationOpacity={constellationOpacity}
      />

      <SparkledDots
        avatarSize={AVATAR_SIZE}
        avatarCenterX={AVATAR_CX}
        avatarCenterY={AVATAR_CY}
        colorScheme={colorScheme}
        sunnyBackground={sunnyBackground}
      />

      {/* Central sphere avatar */}
      <SphereAvatar
        percentage={sphereSunnyPercentage}
        colorScheme={colorScheme}
        x={AVATAR_CX}
        y={AVATAR_CY}
      />

      {/* Entities in orbit around central avatar */}
      <EntityRing
        entities={sortedEntities}
        memoriesPerEntity={sortedMemoriesPerEntity}
        onEntitySelect={onEntitySelect}
        sphere={sphere}
        centerX={AVATAR_CX}
        centerY={AVATAR_CY}
        orbitRadius={ENTITY_ORBIT_RADIUS}
        avatarSize={isTablet ? 60 : 50}
        glowColor={sunnyBackground}
        rotateOrbit={true}
        orbitDurationMs={orbitDurationMs}
      />
    </View>
  );
});
