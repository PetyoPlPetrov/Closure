/**
 * FocusedEntities view — displays entities in orbital layout around a central sphere avatar.
 * Similar to FocusedSferaView but for entities within a single sphere.
 * Swipe left/right or use chevrons to change focus between entities.
 * The central avatar shows sunny vs cloudy percentage for the specific sphere.
 */

import { ConstellationBackground } from "@/components/constellation-background";
import { EventPreviewModal } from "@/components/event-preview-modal";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { BaseEntity, IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useSferaEventsBadge } from "@/utils/SferaEventsBadgeProvider";
import { getEventImageUrls } from "@/utils/sfera-events";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  getSphereGradientColors,
  getSphereIconColor,
  getSphereShadowColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const COSMIC_INNER_DARK = ["rgba(10,14,26,0.55)", "rgba(15,20,34,0.6)", "rgba(21,28,46,0.65)", "rgba(26,36,64,0.6)", "rgba(30,42,74,0.55)"] as const;
const COSMIC_INNER_LIGHT = ["rgba(42,42,58,0.55)", "rgba(58,58,78,0.6)", "rgba(74,74,98,0.65)", "rgba(90,90,118,0.6)", "rgba(106,106,138,0.55)"] as const;

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
  orbitAngle,
}: {
  entityCenterX: number;
  entityCenterY: number;
  entityIndex: number;
  memories: IdealizedMemory[];
  orbitAngle: SharedValue<number>;
}) {
  const { momentColors } = useMomentColors();

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

// ───────────────────── Sfera Insight Card dimensions (used by both card and perimeter layout) ─────────────────────

const INSIGHT_CARD_W = 240;
const INSIGHT_CARD_H = 295;

// ───────────────────── Card perimeter position helper (worklet) ─────────────────────

/**
 * Maps a normalized position t ∈ [0,1) clockwise around the card rectangle
 * (top-left → top-right → bottom-right → bottom-left → back).
 * Returns the center point of the avatar, offset `gap` px outside the card edge.
 * Must be a worklet so it can run on the UI thread inside useAnimatedStyle.
 */
function perimeterPoint(
  t: number,
  cardCX: number,
  cardCY: number,
  cardW: number,
  cardH: number,
  gap: number,
): { x: number; y: number } {
  "worklet";
  const halfW = cardW / 2 + gap;
  const halfH = cardH / 2 + gap;
  // The path is a rectangle offset `gap` px outside the card, so each edge
  // spans the full gap-expanded dimension:
  const topLen = cardW + 2 * gap;    // top edge:    left-corner → right-corner
  const rightLen = cardH + 2 * gap;  // right edge:  top-corner  → bottom-corner
  const bottomLen = cardW + 2 * gap; // bottom edge: right-corner → left-corner
  // leftLen = cardH + 2 * gap (implicit remainder)
  const dist = ((t % 1) + 1) % 1 * (2 * (topLen + rightLen)); // clamp to [0, perimeter)

  let x: number, y: number;
  if (dist < topLen) {
    // Top edge: left → right
    x = cardCX - halfW + dist;
    y = cardCY - halfH;
  } else if (dist < topLen + rightLen) {
    // Right edge: top → bottom
    x = cardCX + halfW;
    y = cardCY - halfH + (dist - topLen);
  } else if (dist < topLen + rightLen + bottomLen) {
    // Bottom edge: right → left
    x = cardCX + halfW - (dist - topLen - rightLen);
    y = cardCY + halfH;
  } else {
    // Left edge: bottom → top
    x = cardCX - halfW;
    y = cardCY + halfH - (dist - topLen - rightLen - bottomLen);
  }

  return { x, y };
}

// ───────────────────── Orbiting Entity ─────────────────────

const OrbitingEntity = React.memo(function OrbitingEntity({
  entity,
  memories,
  index,
  count,
  centerX,
  centerY,
  avatarSize,
  glowColor,
  onEntitySelect,
  sphere,
  perimeterOffset,
  momentsOrbitAngle,
  isTablet,
}: {
  entity: BaseEntity | { id: string; name: string; imageUri?: string; isCompleted: boolean; createdAt?: string };
  memories: IdealizedMemory[];
  index: number;
  count: number;
  centerX: number;
  centerY: number;
  avatarSize: number;
  glowColor: string;
  onEntitySelect?: (entityId: string) => void;
  sphere: LifeSphere;
  perimeterOffset: SharedValue<number>;
  momentsOrbitAngle: SharedValue<number>;
  isTablet: boolean;
}) {
  const scale = useSharedValue(1);

  const gap = avatarSize / 2 + 10;
  const baseT = index / count;

  const animatedStyle = useAnimatedStyle(() => {
    const t = (baseT + perimeterOffset.value) % 1;
    const pos = perimeterPoint(t, centerX, centerY, INSIGHT_CARD_W, INSIGHT_CARD_H, gap);
    return {
      position: "absolute",
      left: pos.x - avatarSize / 2,
      top: pos.y - avatarSize / 2,
      width: avatarSize,
      height: avatarSize,
      transform: [{ scale: scale.value }],
    };
  });

  // Moment icons rendered as an absolute sibling (not clipped by avatar circle)
  const iconAreaSize = (MOMENT_ORBIT_RADIUS + MOMENT_ICON_SIZE) * 2;
  const momentIconsStyle = useAnimatedStyle(() => {
    const t = (baseT + perimeterOffset.value) % 1;
    const pos = perimeterPoint(t, centerX, centerY, INSIGHT_CARD_W, INSIGHT_CARD_H, gap);
    return {
      position: "absolute",
      left: pos.x - iconAreaSize / 2,
      top: pos.y - iconAreaSize / 2,
      width: iconAreaSize,
      height: iconAreaSize,
    };
  });

  const initialLetter = entity.name.trim()
    ? entity.name.trim()[0].toUpperCase()
    : "?";

  const borderWidth = isTablet ? 3 : 2;

  return (
    <>
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
      </Pressable>
    </Animated.View>

    {/* Moment icons in a separate Animated.View so they are NOT clipped by the avatar circle */}
    <Animated.View style={[momentIconsStyle, { zIndex: 16 }]} pointerEvents="none">
      <SmallFloatingMoments
        entityCenterX={(MOMENT_ORBIT_RADIUS + MOMENT_ICON_SIZE)}
        entityCenterY={(MOMENT_ORBIT_RADIUS + MOMENT_ICON_SIZE)}
        entityIndex={index}
        memories={memories}
        orbitAngle={momentsOrbitAngle}
      />
    </Animated.View>
  </>
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
  avatarSize,
  glowColor,
  orbitDurationMs = DEFAULT_ORBIT_DURATION_MS,
}: {
  entities: (BaseEntity | { id: string; name: string; imageUri?: string; isCompleted: boolean; createdAt?: string })[];
  memoriesPerEntity: IdealizedMemory[][];
  onEntitySelect?: (entityId: string) => void;
  sphere: LifeSphere;
  centerX: number;
  centerY: number;
  avatarSize: number;
  glowColor: string;
  orbitDurationMs?: number;
}) {
  const { isTablet } = useLargeDevice();
  // Single offset value drives all entities sliding clockwise around the card perimeter
  const perimeterOffset = useSharedValue(0);
  // Single shared orbit angle for all moment icon rings (same speed, no need for one per entity)
  const momentsOrbitAngle = useSharedValue(0);

  useEffect(() => {
    perimeterOffset.value = 0;
    perimeterOffset.value = withRepeat(
      withTiming(1, { duration: orbitDurationMs, easing: Easing.linear }),
      -1,
      false,
    );
    momentsOrbitAngle.value = 0;
    momentsOrbitAngle.value = withRepeat(
      withTiming(2 * Math.PI, { duration: orbitDurationMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(perimeterOffset);
      cancelAnimation(momentsOrbitAngle);
    };
  }, [perimeterOffset, momentsOrbitAngle, orbitDurationMs]);

  if (entities.length === 0) return null;
  const count = Math.min(entities.length, 8);

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const entity = entities[i];
        const memories = memoriesPerEntity[i] ?? [];
        return (
          <OrbitingEntity
            key={`${entity.id}-${i}`}
            entity={entity}
            memories={memories}
            index={i}
            count={count}
            centerX={centerX}
            centerY={centerY}
            avatarSize={avatarSize}
            glowColor={glowColor}
            onEntitySelect={onEntitySelect}
            sphere={sphere}
            perimeterOffset={perimeterOffset}
            momentsOrbitAngle={momentsOrbitAngle}
            isTablet={isTablet}
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

// ───────────────────── Sfera Insight Card ─────────────────────

const INSIGHT_ARROW_SIZE = 28;
const INSIGHT_ARROW_HIT = 36;

const COSMIC_TEXT_COLOR = "#FFFFFF"; // matches inactive tab label — white, ~12:1 on dark bg
const COSMIC_TEXT_DIM = "#90CAF9"; // matches active tab tint — sky blue, ~5.8:1 on dark bg

/** Most recent / most old last-interaction for an entity set */
function getInteractionIndices(memoriesPerEntity: IdealizedMemory[][]) {
  let newestTime = -1, newestIdx = 0;
  let oldestTime = Infinity, oldestIdx = 0;
  let mostMems = -1, mostMemsIdx = 0;
  let leastMems = Infinity, leastMemsIdx = 0;
  let oldestMemTime = Infinity, oldestMemIdx = 0;
  let mostCloudy = -1, mostCloudyIdx = 0;
  let mostSunny = -1, mostSunnyIdx = 0;
  let noMemsIdx = -1; // first entity with zero memories

  memoriesPerEntity.forEach((mems, i) => {
    if (mems.length === 0 && noMemsIdx === -1) noMemsIdx = i;
    if (mems.length > mostMems) { mostMems = mems.length; mostMemsIdx = i; }
    if (mems.length < leastMems) { leastMems = mems.length; leastMemsIdx = i; }

    let cloudyCount = 0, sunnyCount = 0;
    mems.forEach((mem) => {
      const ts = new Date(mem.updatedAt).getTime();
      if (ts > newestTime) { newestTime = ts; newestIdx = i; }
      if (ts < oldestTime) { oldestTime = ts; oldestIdx = i; }

      const memCreated = new Date(mem.createdAt).getTime();
      if (memCreated < oldestMemTime) { oldestMemTime = memCreated; oldestMemIdx = i; }

      cloudyCount += mem.hardTruths?.length ?? 0;
      sunnyCount += mem.goodFacts?.length ?? 0;
    });
    if (cloudyCount > mostCloudy) { mostCloudy = cloudyCount; mostCloudyIdx = i; }
    if (sunnyCount > mostSunny) { mostSunny = sunnyCount; mostSunnyIdx = i; }
  });

  return {
    newestIdx,
    oldestIdx,
    oldestTime: oldestTime === Infinity ? null : oldestTime,
    newestTime: newestTime === -1 ? null : newestTime,
    mostMemsIdx,
    leastMemsIdx,
    oldestMemIdx,
    mostCloudyIdx,
    mostSunnyIdx,
    noMemsIdx,
  };
}

const SferaInsightsCard = React.memo(function SferaInsightsCard({
  sphere,
  entities,
  memoriesPerEntity,
  onEntitySelect,
  colorScheme,
  x,
  y,
}: {
  sphere: LifeSphere;
  entities: FocusedEntitiesViewProps["entities"];
  memoriesPerEntity: IdealizedMemory[][];
  onEntitySelect?: (entityId: string) => void;
  colorScheme: "light" | "dark";
  x: number;
  y: number;
}) {
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  // career/relationships hide the interaction-based modes (least memories, oldest, most recent)
  const hiddenModes = (sphere === "career" || sphere === "relationships") ? new Set([0, 1, 2]) : new Set<number>();
  const allowedModes = [0, 1, 2, 3, 4, 5].filter((m) => !hiddenModes.has(m));
  // For family/friends, default to "oldest interaction" (mode 1, index 1 in allowedModes)
  const defaultModeIdx = (sphere === "family" || sphere === "friends") ? 1 : 0;
  const [modeIdx, setModeIdx] = useState(defaultModeIdx); // index into allowedModes
  const mode = allowedModes[modeIdx] ?? allowedModes[0] ?? 0;
  const modeOpacity = useSharedValue(1);
  const shadowColor = getSphereShadowColor(sphere, colorScheme);
  const numEntities = entities.length;
  // Whether this sphere supports social CTAs (bell + event thumbnails)
  const hasSocialCTAs = sphere === "family" || sphere === "friends";

  const { newestIdx, oldestIdx, oldestTime, newestTime, mostMemsIdx, leastMemsIdx, oldestMemIdx, mostCloudyIdx, mostSunnyIdx, noMemsIdx } = useMemo(
    () => getInteractionIndices(memoriesPerEntity),
    [memoriesPerEntity],
  );

  // Urgency: oldest interaction > 30 days ago
  const isUrgent = hasSocialCTAs && oldestTime !== null && (Date.now() - oldestTime) > 30 * 24 * 60 * 60 * 1000;

  // Upcoming social events for the event row (family/friends only)
  const { getCachedEvents } = useSferaEventsBadge();
  const socialEvents = useMemo(() => {
    if (!hasSocialCTAs) return [];
    return getCachedEvents()
      .filter((e) => e.type === "social" || e.type === "plus");
  }, [hasSocialCTAs, getCachedEvents]);

  // Which event index is shown in the single-event row; refresh cycles through
  const [eventDisplayIdx, setEventDisplayIdx] = useState(0);
  const currentEvent = socialEvents.length > 0 ? socialEvents[eventDisplayIdx % socialEvents.length] : null;

  // Which event was tapped — shows EventPreviewModal
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const previewEvent = useMemo(
    () => previewEventId ? socialEvents.find((e) => e.id === previewEventId) ?? null : null,
    [previewEventId, socialEvents],
  );

  const numModes = numEntities === 0 ? 1 : allowedModes.length;

  const animateAndSet = useCallback((nextIdx: number) => {
    modeOpacity.value = withTiming(0, { duration: 100 }, () => {
      modeOpacity.value = withTiming(1, { duration: 150 });
    });
    setModeIdx(nextIdx);
  }, [modeOpacity]);

  const goNext = useCallback(() => animateAndSet((modeIdx + 1) % numModes), [animateAndSet, modeIdx, numModes]);
  const goPrev = useCallback(() => animateAndSet((modeIdx - 1 + numModes) % numModes), [animateAndSet, modeIdx, numModes]);

  // Keep latest nav callbacks in refs so PanResponder (created once) can call them
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goPrevRef = useRef(goPrev);
  goPrevRef.current = goPrev;
  // entityTapRef is updated after entity is computed (below) so the once-created pan responder always has the latest
  const entityTapRef = useRef<(() => void) | null>(null);

  const cardPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false, // child Pressables (bell, dots) still get capture phase
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5) {
          if (gs.dx < 0) goNextRef.current();
          else goPrevRef.current();
        } else if (Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8) {
          entityTapRef.current?.();
        }
      },
    }),
  ).current;

  const modeAnimStyle = useAnimatedStyle(() => ({ opacity: modeOpacity.value }));
  const gradientColors = colorScheme === "dark" ? COSMIC_INNER_DARK : COSMIC_INNER_LIGHT;

  const totalW = INSIGHT_CARD_W + INSIGHT_ARROW_HIT * 2;
  const wrapperStyle = {
    position: "absolute" as const,
    left: x - totalW / 2,
    top: y - INSIGHT_CARD_H / 2,
    width: totalW,
    height: INSIGHT_CARD_H,
    zIndex: 25,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  };

  // 6 modes: 0=least memories, 1=oldest interaction, 2=most recent, 3=most memories, 4=most cloudy, 5=most sunny
  const entityIdx = [leastMemsIdx, oldestIdx, newestIdx, mostMemsIdx, mostCloudyIdx, mostSunnyIdx][mode] ?? 0;
  const entity = entities[entityIdx];
  const entityName = entity?.name ?? "";
  const showSocialBottom = hasSocialCTAs && (mode === 0 || mode === 1) && entity != null;
  entityTapRef.current = entity ? () => onEntitySelect?.(entity.id) : null;

  // Urgency border: amber tint when oldest interaction > 30 days
  const isMoodCard = mode === 4 || mode === 5;
  const moodBorderColor = mode === 4 ? (momentColors.cloudy.background + "AA") : (momentColors.sunny.background + "AA");
  const borderColor = (isUrgent && mode === 1) ? "#F5A623AA" : isMoodCard ? moodBorderColor : shadowColor + "66";
  const shadowGlowColor = isMoodCard ? (mode === 4 ? momentColors.cloudy.background : momentColors.sunny.background) : (isUrgent && mode === 1 ? "#F5A623" : shadowColor);

  // Human-readable time since interaction (must be before early return)
  const timeAgoLabel = useMemo(() => {
    const ts = mode === 1 ? oldestTime : newestTime;
    if (!ts || (mode !== 0 && mode !== 1 && mode !== 2)) return null;
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return t("sferaInsight.timeAgo.today");
    if (days < 31) return `${days}${t("sferaInsight.timeAgo.days")}`;
    const months = Math.floor(days / 30);
    return `${months}${t("sferaInsight.timeAgo.months")}`;
  }, [oldestTime, newestTime, mode, t]);

  // Label for top of card
  const cardLabels = [
    t("sferaInsight.leastMemories"),
    t("sferaInsight.lastInteractedWith"),
    t("sferaInsight.mostRecent"),
    t("sferaInsight.mostMemories2"),
    t("sferaInsight.mostCloudy"),
    t("sferaInsight.mostSunny"),
  ];
  const cardLabel = cardLabels[mode] ?? cardLabels[0];

  if (numEntities === 0) {
    return (
      <View style={wrapperStyle}>
        <View style={{ width: INSIGHT_ARROW_HIT }} />
        <LinearGradient
          colors={[...gradientColors]}
          style={{
            flex: 1,
            height: INSIGHT_CARD_H,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: shadowColor + "66",
            justifyContent: "center",
            alignItems: "center",
            padding: 14,
            shadowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          <MaterialIcons name="add-circle-outline" size={32} color={shadowColor} />
          <ThemedText style={{ color: COSMIC_TEXT_COLOR, fontSize: 11, textAlign: "center", marginTop: 8 }}>
            {t("sferaInsight.addPeople")}
          </ThemedText>
        </LinearGradient>
        <View style={{ width: INSIGHT_ARROW_HIT }} />
      </View>
    );
  }

  return (
    <View style={wrapperStyle}>
      {/* Left arrow */}
      {numModes > 1 ? (
        <Pressable
          onPress={goPrev}
          accessibilityRole="button"
          accessibilityLabel="Previous insight"
          style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
        >
          <MaterialIcons name="chevron-left" size={INSIGHT_ARROW_SIZE} color={shadowColor + "CC"} />
        </Pressable>
      ) : (
        <View style={{ width: INSIGHT_ARROW_HIT }} />
      )}

      {/* Card — pan responder handles both swipe (next/prev) and tap (entity nav) */}
      <View
        style={{ flex: 1, height: INSIGHT_CARD_H }}
        accessibilityRole="button"
        accessibilityLabel={entity ? `${cardLabel}: ${entityName}` : undefined}
        {...cardPanResponder.panHandlers}
      >
        <LinearGradient
          colors={[...gradientColors]}
          style={{
            flex: 1,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 10,
            shadowColor: shadowGlowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 16,
            elevation: 10,
            gap: 8,
          }}
        >
          {/* Top label — the insight, not the person */}
          <Animated.View style={modeAnimStyle} accessibilityLiveRegion="polite">
            <ThemedText style={{ color: COSMIC_TEXT_COLOR, fontSize: 16, textAlign: "center", fontWeight: "700", letterSpacing: 0.2 }} numberOfLines={1}>
              {cardLabel}
            </ThemedText>
          </Animated.View>

          {/* Person block */}
          <Animated.View style={[modeAnimStyle, { gap: 3 }]}>
            <ThemedText style={{ color: COSMIC_TEXT_COLOR, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>
              {entityName}
            </ThemedText>
            {/* Meta row varies by mode */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {/* Mode 0/1/2: time-ago */}
              {(mode === 0 || mode === 1 || mode === 2) && timeAgoLabel ? (
                <ThemedText style={{ color: isUrgent && mode === 1 ? "#F5A623" : COSMIC_TEXT_DIM, fontSize: 10 }}>
                  {timeAgoLabel}
                </ThemedText>
              ) : null}
              {/* Mode 3: most memory count */}
              {mode === 3 ? (
                <ThemedText style={{ color: COSMIC_TEXT_DIM, fontSize: 10 }}>
                  {(memoriesPerEntity[entityIdx]?.length ?? 0)} {t("sferaInsight.memories")}
                </ThemedText>
              ) : null}
              {/* Mode 4/5: mood counts */}
              {mode === 4 ? (() => {
                const mems = memoriesPerEntity[entityIdx] ?? [];
                const count = mems.reduce((s, m) => s + (m.hardTruths?.length ?? 0), 0);
                return <ThemedText style={{ color: momentColors.cloudy.background, fontSize: 10 }}>{count} cloudy moments</ThemedText>;
              })() : null}
              {mode === 5 ? (() => {
                const mems = memoriesPerEntity[entityIdx] ?? [];
                const count = mems.reduce((s, m) => s + (m.goodFacts?.length ?? 0), 0);
                return <ThemedText style={{ color: momentColors.sunny.background, fontSize: 10 }}>{count} sunny moments</ThemedText>;
              })() : null}
              {/* Bell for modes 0/1 */}
              {showSocialBottom && timeAgoLabel ? (
                <ThemedText style={{ color: COSMIC_TEXT_DIM, fontSize: 10 }}>·</ThemedText>
              ) : null}
              {showSocialBottom && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/notifications/${sphere}/${entity.id}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Set reminder for ${entityName}`}
                  accessibilityHint="Opens notification settings"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: shadowColor + "22",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: shadowColor + "44",
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    minWidth: 32,
                    minHeight: 32,
                  }}
                >
                  <MaterialIcons name="notifications-none" size={14} color={shadowColor} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* Modes 0/1: show most recent memory image, or add-memories CTA (suppressed when social event card takes over) */}
          {(mode === 0 || mode === 1) && !(showSocialBottom && currentEvent) && (() => {
            const mems = memoriesPerEntity[entityIdx] ?? [];
            const mem = mems.length > 0
              ? mems.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b)
              : null;
            if (mem?.imageUri) {
              const moodSunny = mem.goodFacts?.length ?? 0;
              const moodCloudy = mem.hardTruths?.length ?? 0;
              const moodColor = moodSunny >= moodCloudy ? momentColors.sunny.background : momentColors.cloudy.background;
              return (
                <View style={{ flex: 1, alignSelf: "stretch", borderRadius: 10, overflow: "hidden", borderWidth: 1.5, borderColor: moodColor + "88" }}>
                  <Image source={{ uri: mem.imageUri }} style={{ width: "100%", flex: 1 }} contentFit="cover" />
                  <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: moodColor + "22" }}>
                    <ThemedText style={{ color: COSMIC_TEXT_COLOR, fontSize: 10 }} numberOfLines={1}>
                      {mem.title}
                    </ThemedText>
                  </View>
                </View>
              );
            }
            return (
              <Pressable
                onPress={(e) => { e.stopPropagation(); entity && onEntitySelect?.(entity.id); }}
                accessibilityRole="button"
                accessibilityLabel={`Add memories for ${entityName}`}
                style={{
                  flex: 1,
                  alignSelf: "stretch",
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: shadowColor + "44",
                  borderStyle: "dashed",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <MaterialIcons name="add-photo-alternate" size={24} color={shadowColor + "99"} />
                <ThemedText style={{ color: COSMIC_TEXT_DIM, fontSize: 11 }}>
                  {t("sferaInsight.addMemories")}
                </ThemedText>
              </Pressable>
            );
          })()}

          {/* Mode 2/4/5: show memory image if available */}
          {/* Mode 3: scattered memory bubbles */}
          {mode === 3 && (() => {
            const mems = memoriesPerEntity[entityIdx] ?? [];
            if (mems.length === 0) return null;
            // Deterministic scatter positions using index-based offsets
            const positions = [
              { top: "8%",  left: "10%" },
              { top: "12%", left: "55%" },
              { top: "38%", left: "30%" },
              { top: "55%", left: "8%"  },
              { top: "50%", left: "62%" },
              { top: "75%", left: "25%" },
              { top: "72%", left: "68%" },
              { top: "20%", left: "78%" },
            ];
            return (
              <View style={{ flex: 1, alignSelf: "stretch", position: "relative" }}>
                {mems.slice(0, 8).map((mem, i) => {
                  const pos = positions[i % positions.length];
                  const sunny = mem.goodFacts?.length ?? 0;
                  const cloudy = mem.hardTruths?.length ?? 0;
                  const moodColor = sunny >= cloudy ? momentColors.sunny.background : momentColors.cloudy.background;
                  const size = 36 + (i % 3) * 8;
                  return (
                    <View
                      key={mem.id}
                      style={{
                        position: "absolute",
                        top: pos.top as any,
                        left: pos.left as any,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: 1.5,
                        borderColor: moodColor + "99",
                        overflow: "hidden",
                        backgroundColor: shadowColor + "22",
                        shadowColor: moodColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      {mem.imageUri ? (
                        <Image source={{ uri: mem.imageUri }} style={{ width: size, height: size }} contentFit="cover" />
                      ) : (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                          <MaterialIcons name="photo" size={size * 0.4} color={moodColor} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* Modes 2/4/5: memory image with mood border */}
          {(mode === 2 || mode === 4 || mode === 5) && (() => {
            const mems = memoriesPerEntity[entityIdx] ?? [];
            let mem: IdealizedMemory | null = null;
            if (mode === 2) mem = mems.length > 0 ? mems.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b) : null;
            if (mode === 4) mem = mems.length > 0 ? mems.reduce((a, b) => (a.hardTruths?.length ?? 0) > (b.hardTruths?.length ?? 0) ? a : b) : null;
            if (mode === 5) mem = mems.length > 0 ? mems.reduce((a, b) => (a.goodFacts?.length ?? 0) > (b.goodFacts?.length ?? 0) ? a : b) : null;
            if (!mem?.imageUri) return null;
            const moodSunny = mem.goodFacts?.length ?? 0;
            const moodCloudy = mem.hardTruths?.length ?? 0;
            const moodColor = moodSunny >= moodCloudy ? momentColors.sunny.background : momentColors.cloudy.background;
            return (
              <View style={{ flex: 1, alignSelf: "stretch", borderRadius: 10, overflow: "hidden", borderWidth: 1.5, borderColor: moodColor + "88" }}>
                <Image source={{ uri: mem.imageUri }} style={{ width: "100%", flex: 1 }} contentFit="cover" />
                <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: moodColor + "22" }}>
                  <ThemedText style={{ color: COSMIC_TEXT_COLOR, fontSize: 10 }} numberOfLines={1}>
                    {mem.title}
                  </ThemedText>
                </View>
              </View>
            );
          })()}

          {/* Event card — fills remaining space, image on top, text below */}
          {showSocialBottom && currentEvent ? (
            <View style={{ flex: 1, alignSelf: "stretch" }}>
              {/* Card — tap to preview */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setPreviewEventId(currentEvent.id);
                }}
                style={{
                  flex: 1,
                  backgroundColor: shadowColor + "1A",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: shadowColor + "33",
                  overflow: "hidden",
                }}
              >
                {/* Event image — fills top portion */}
                {(() => {
                  const imgUrl = getEventImageUrls(currentEvent)[0];
                  return imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={{ width: "100%", flex: 1 }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: shadowColor + "33", justifyContent: "center", alignItems: "center" }}>
                      <MaterialIcons name="event" size={24} color={shadowColor} />
                    </View>
                  );
                })()}
                {/* Refresh — absolutely positioned top-right of image */}
                <Pressable
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (socialEvents.length > 1) setEventDisplayIdx((i) => (i + 1) % socialEvents.length);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Show next event"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#00000055",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <MaterialIcons name="refresh" size={20} color="#FFFFFFCC" />
                </Pressable>
                {/* Event name + see-more */}
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, gap: 4 }}>
                  <ThemedText style={{ color: COSMIC_TEXT_COLOR, fontSize: 10, flex: 1 }} numberOfLines={2}>
                    {currentEvent.name}
                  </ThemedText>
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push("/(tabs)/events");
                    }}
                    accessibilityRole="link"
                    accessibilityLabel="See all events"
                  >
                    <MaterialIcons name="open-in-new" size={13} color={shadowColor} />
                  </Pressable>
                </View>
              </Pressable>
            </View>
          ) : null}

          {/* Pagination dots — shown when not in social mode */}
          {!showSocialBottom && (
            <View style={{ flexDirection: "row", gap: 5, alignSelf: "center" }} accessibilityRole="tablist">
              {Array.from({ length: numModes }).map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => animateAndSet(i)}
                  hitSlop={8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: i === modeIdx }}
                  accessibilityLabel={cardLabels[allowedModes[i] ?? i]}
                  style={{
                    width: i === modeIdx ? 14 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === modeIdx ? shadowColor : shadowColor + "88",
                  }}
                />
              ))}
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Right arrow */}
      {numModes > 1 ? (
        <Pressable
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel="Next insight"
          style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
        >
          <MaterialIcons name="chevron-right" size={INSIGHT_ARROW_SIZE} color={shadowColor + "CC"} />
        </Pressable>
      ) : (
        <View style={{ width: INSIGHT_ARROW_HIT }} />
      )}

      {/* Event preview sheet — shown when event row is tapped */}
      {previewEvent && (
        <EventPreviewModal
          event={previewEvent}
          onClose={() => setPreviewEventId(null)}
        />
      )}
    </View>
  );
});

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
        <SferaInsightsCard
          sphere={sphere}
          entities={sortedEntities}
          memoriesPerEntity={sortedMemoriesPerEntity}
          onEntitySelect={onEntitySelect}
          colorScheme={colorScheme}
          x={AVATAR_CX}
          y={AVATAR_CY}
        />
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

      {/* Central insight card */}
      <SferaInsightsCard
        sphere={sphere}
        entities={sortedEntities}
        memoriesPerEntity={sortedMemoriesPerEntity}
        onEntitySelect={onEntitySelect}
        colorScheme={colorScheme}
        x={AVATAR_CX}
        y={AVATAR_CY}
      />

      {/* Entities sliding clockwise around the card perimeter */}
      <EntityRing
        entities={sortedEntities}
        memoriesPerEntity={sortedMemoriesPerEntity}
        onEntitySelect={onEntitySelect}
        sphere={sphere}
        centerX={AVATAR_CX}
        centerY={AVATAR_CY}
        avatarSize={isTablet ? 60 : 50}
        glowColor={sunnyBackground}
        orbitDurationMs={orbitDurationMs}
      />
    </View>
  );
});
