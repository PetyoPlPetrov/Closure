/**
 * FocusedEntities view — displays entities in orbital layout around a central sphere avatar.
 * Similar to FocusedSferaView but for entities within a single sphere.
 * Swipe left/right or use chevrons to change focus between entities.
 * The central avatar shows sunny vs cloudy percentage for the specific sphere.
 */

import {
  ConstellationBackground,
  sampleCornerBiasedPosition,
} from "@/components/constellation-background";
import { SferaInsightEmptyGuideLink } from "@/components/sfera-insight-empty-guide-link";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { BaseEntity, IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import {
  ORBIT_MAX_FLOATING_ENTITIES,
  pickOrbitEntitiesBySunnyScoreForEntities,
} from "@/utils/orbit-entity-pick";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useHomeTransitionLoader } from "@/utils/home-transition-loader-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import {
  sferaInsightEmptyEntitiesWarmKey,
  sferaInsightNoMemoriesReflectionKey,
} from "@/utils/sfera-insight-empty-entities";
import { emitCreateMemoryHint } from "@/utils/onboarding-storage";
import { RingPlanetSvg, sphereRingsForScheme } from "@/components/ring-planet";
import {
  getSphereGradientColors,
  getSphereShadowColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
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

const { width: SW, height: SH } = Dimensions.get("window");
const IS_IPAD =
  Platform.OS === "ios" && (Platform.isPad || Math.min(SW, SH) >= 768);
const IPAD_ENTITIES_CARD_SCALE = IS_IPAD ? 1.6 : 1;
const IPAD_ENTITIES_AVATAR_SCALE = IS_IPAD ? 1.5 : 1;

// Avatar constants (from focused-sfera-view.tsx)
// Cosmic surface gradients removed — ring-planet visual replaces the card background.

/** Auto-advance interval for cycling sfera insight modes (ms). */
const SFERA_INSIGHT_AUTO_MS = 5000;
/** Swipe on insight card: horizontal pan activates before tap (RNGH `activeOffsetX`). */
const INSIGHT_CARD_SWIPE_ACTIVATION_PX = 12;
const INSIGHT_CARD_SWIPE_COMMIT_PX = 20;
const INSIGHT_CARD_SWIPE_FAIL_Y_PX = 28;

/** Whole-card slide transition when switching insight modes (ms). */
const INSIGHT_CARD_OUT_MS = 260;
const INSIGHT_CARD_IN_MS = 360;
/** Horizontal slide distance for the whole card (planet + content). */
const INSIGHT_CARD_SLIDE_X = Math.round(SW * 0.35);

// Central avatar configuration
const AVATAR_SIZE = 100;
const AVATAR_CX = SW / 2;
const AVATAR_CY = SH * 0.46;

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
  isActive?: boolean;
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
  avatarSize: _avatarSize,
  avatarCenterX: _avatarCenterX,
  avatarCenterY: _avatarCenterY,
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

  const dots = useMemo(() => {
    const numDots = isTablet ? 22 : 16;
    const padding = 20;

    return Array.from({ length: numDots }, (_, i) => {
      const { x: rawX, y: rawY } = sampleCornerBiasedPosition(
        SW,
        SH,
        i * 31.41 + 7.77,
      );
      const x = Math.max(padding, Math.min(SW - padding, rawX));
      const y = Math.max(padding, Math.min(SH - padding, rawY));
      const size = 2 + Math.random() * 2;
      const delay = Math.random() * 2000;
      const duration = 2500 + Math.random() * 1500;

      return { x, y, size, delay, duration, id: i };
    });
  }, [isTablet]);

  if (colorScheme === "light") {
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
    const settleDuration = Math.max(500, Math.min(duration, 1600));
    opacity.value = withDelay(
      delay,
      withTiming(0.55, { duration: settleDuration, easing: Easing.out(Easing.ease) }),
    );
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 }),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [delay, duration, opacity, scale, animationsEnabled]);

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

// ───────────────────── Sfera Insight ring-planet dimensions ─────────────────────

/** Ring-planet sizing for the insight view — large enough to hold all text inside. */
const INSIGHT_ATMO_R = Math.round(120 * IPAD_ENTITIES_CARD_SCALE);
const INSIGHT_PLANET_CANVAS = Math.round(INSIGHT_ATMO_R * 3.4);
const INSIGHT_PLANET_C = INSIGHT_PLANET_CANVAS / 2;
/** Entity avatar "moon" at the top rim of the planet. */
const INSIGHT_MOON_SIZE = Math.round(54 * IPAD_ENTITIES_CARD_SCALE);

/** Memory image thumbnails inside the insight card. */
const INSIGHT_THUMB_SIZE = Math.round(28 * IPAD_ENTITIES_CARD_SCALE);
const INSIGHT_THUMB_MAX = 5;
/** Featured memory image for single-memory modes (larger, emphasized). */
const INSIGHT_FEATURED_IMG_SIZE = Math.round(50 * IPAD_ENTITIES_CARD_SCALE);
/** Larger featured image for mood cards (most cloudy / most sunny) to draw attention. */
const INSIGHT_FEATURED_IMG_SIZE_MOOD = Math.round(80 * IPAD_ENTITIES_CARD_SCALE);

/** Bounding box used by EntityRing to orbit entities around the insight view. */
const INSIGHT_CARD_COLLAPSED_W = Math.round(INSIGHT_ATMO_R * 2.0) * IPAD_ENTITIES_CARD_SCALE;
const INSIGHT_CARD_COLLAPSED_H = Math.round(INSIGHT_PLANET_CANVAS + 20) * IPAD_ENTITIES_CARD_SCALE;
const INSIGHT_CARD_EXPANDED_W = INSIGHT_CARD_COLLAPSED_W;
const INSIGHT_CARD_EXPANDED_H = INSIGHT_CARD_COLLAPSED_H;

const NEED_MEMORIES_HINT_WIDTH = 220 * IPAD_ENTITIES_CARD_SCALE;

const needMemoriesHintBubbleStyle = {
  paddingVertical: 8,
  paddingHorizontal: 10,
  backgroundColor: "rgba(15, 20, 34, 0.96)",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.22)",
  maxWidth: NEED_MEMORIES_HINT_WIDTH,
} as const;

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
  showNeedMemoriesHint,
  onNeedMemoriesHint,
  perimeterOffset,
  momentsOrbitAngle,
  isTablet,
  cardWidth,
  cardHeight,
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
  showNeedMemoriesHint?: boolean;
  onNeedMemoriesHint?: (entityId: string) => void;
  perimeterOffset: SharedValue<number>;
  momentsOrbitAngle: SharedValue<number>;
  isTablet: boolean;
  cardWidth: number;
  cardHeight: number;
}) {
  const t = useTranslate();
  const scale = useSharedValue(1);
  const transitionLoader = useHomeTransitionLoader();

  const gap = avatarSize / 2 + 10;
  const baseT = index / count;

  const animatedStyle = useAnimatedStyle(() => {
    const t = (baseT + perimeterOffset.value) % 1;
    const pos = perimeterPoint(t, centerX, centerY, cardWidth, cardHeight, gap);
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
    const pos = perimeterPoint(t, centerX, centerY, cardWidth, cardHeight, gap);
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
          if (memories.length === 0) {
            onNeedMemoriesHint?.(entity.id);
            return;
          }
          if (onEntitySelect) {
            transitionLoader?.showLoader();
            setTimeout(() => onEntitySelect(entity.id), 50);
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
      {showNeedMemoriesHint && (
        <View
          style={{
            position: "absolute",
            top: avatarSize + 6,
            left: (avatarSize - NEED_MEMORIES_HINT_WIDTH) / 2,
            width: NEED_MEMORIES_HINT_WIDTH,
            zIndex: 50,
            ...needMemoriesHintBubbleStyle,
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
      )}
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
  needMemoriesHintEntityId,
  onNeedMemoriesHint,
  sphere,
  centerX,
  centerY,
  avatarSize,
  glowColor,
  orbitDurationMs = DEFAULT_ORBIT_DURATION_MS,
  animationsEnabled,
  cardWidth,
  cardHeight,
}: {
  entities: (BaseEntity | { id: string; name: string; imageUri?: string; isCompleted: boolean; createdAt?: string })[];
  memoriesPerEntity: IdealizedMemory[][];
  onEntitySelect?: (entityId: string) => void;
  needMemoriesHintEntityId: string | null;
  onNeedMemoriesHint: (entityId: string) => void;
  sphere: LifeSphere;
  centerX: number;
  centerY: number;
  avatarSize: number;
  glowColor: string;
  orbitDurationMs?: number;
  animationsEnabled: boolean;
  cardWidth: number;
  cardHeight: number;
}) {
  const { isTablet } = useLargeDevice();
  // Single offset value drives all entities sliding clockwise around the card perimeter
  const perimeterOffset = useSharedValue(0);
  // Single shared orbit angle for all moment icon rings (same speed, no need for one per entity)
  const momentsOrbitAngle = useSharedValue(0);

  useEffect(() => {
    if (!animationsEnabled) {
      cancelAnimation(perimeterOffset);
      cancelAnimation(momentsOrbitAngle);
      perimeterOffset.value = 0;
      momentsOrbitAngle.value = 0;
      return;
    }
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
  }, [perimeterOffset, momentsOrbitAngle, orbitDurationMs, animationsEnabled]);

  const handleEntitySelect = useCallback((entityId: string) => {
    onEntitySelect?.(entityId);
  }, [onEntitySelect]);

  if (entities.length === 0) return null;
  const count = Math.min(entities.length, ORBIT_MAX_FLOATING_ENTITIES);

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
            onEntitySelect={handleEntitySelect}
            showNeedMemoriesHint={needMemoriesHintEntityId === entity.id}
            onNeedMemoriesHint={onNeedMemoriesHint}
            perimeterOffset={perimeterOffset}
            momentsOrbitAngle={momentsOrbitAngle}
            isTablet={isTablet}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
          />
        );
      })}
    </>
  );
});

// ───────────────────── Sfera Insight Card ─────────────────────

// Arrow sizes kept for reference but arrows are now inline with pagination dots

/**
 * Insight card copy — AAA-oriented vs the actual cosmic card face (tiny meta stays ≥7:1 typical).
 */
function insightCardInk(colorScheme: "light" | "dark"): {
  ink: string;
  inkMuted: string;
} {
  if (colorScheme === "dark") {
    return { ink: "#FFFFFF", inkMuted: "#E8EDF6" };
  }
  return { ink: "#121212", inkMuted: "#393939" };
}

/** Moody meta line (cloudy/sunny counts): avoid pillar fill on pillar fill contrast traps. */
function insightSunnyCloudyMetaColors(
  colorScheme: "light" | "dark",
  cloudyBackground: string,
): { cloudy: string; sunny: string } {
  if (colorScheme === "dark") {
    return { cloudy: "#E9EEF6", sunny: "#FFECBF" };
  }
  return {
    cloudy: cloudyBackground,
    sunny: "#5C3700",
  };
}

/** Sunny meta tint + urgency copy — AAA vs creams / cosmic white. */
const INSIGHT_LIGHT_URGENCY_AFFORDANCE = "#5C3700";

// insightMemoryCaptionTextColor removed — memory previews are no longer inside the card body.

/** Most recent / most old last-interaction for an entity set */
function getInteractionIndices(memoriesPerEntity: IdealizedMemory[][]) {
  let newestTime = -1, newestIdx = 0;
  let mostMems = -1, mostMemsIdx = 0;
  let leastMems = Infinity, leastMemsIdx = 0;
  // "Oldest memory" card: entity whose *newest* memory is the oldest — i.e. most neglected entity.
  let oldestNewestTime = Infinity, oldestMemIdx = 0;
  let mostCloudy = -1, mostCloudyIdx = 0;
  let mostSunny = -1, mostSunnyIdx = 0;
  let noMemsIdx = -1; // first entity with zero memories

  memoriesPerEntity.forEach((mems, i) => {
    if (mems.length === 0 && noMemsIdx === -1) noMemsIdx = i;
    if (mems.length > mostMems) { mostMems = mems.length; mostMemsIdx = i; }
    if (mems.length < leastMems) { leastMems = mems.length; leastMemsIdx = i; }

    let cloudyCount = 0, sunnyCount = 0;
    let entityNewest = -1;
    mems.forEach((mem) => {
      const ts = new Date(mem.updatedAt).getTime();
      if (ts > newestTime) { newestTime = ts; newestIdx = i; }
      if (ts > entityNewest) entityNewest = ts;

      cloudyCount += mem.hardTruths?.length ?? 0;
      sunnyCount += mem.goodFacts?.length ?? 0;
    });
    // Track entity whose newest memory is the oldest (most neglected).
    // Only consider entities that actually have memories.
    if (mems.length > 0 && entityNewest < oldestNewestTime) {
      oldestNewestTime = entityNewest;
      oldestMemIdx = i;
    }
    if (cloudyCount > mostCloudy) { mostCloudy = cloudyCount; mostCloudyIdx = i; }
    if (sunnyCount > mostSunny) { mostSunny = sunnyCount; mostSunnyIdx = i; }
  });

  return {
    newestIdx,
    newestTime: newestTime === -1 ? null : newestTime,
    /** Timestamp of the newest memory of the most-neglected entity (used for time-ago & urgency). */
    oldestMemTime: oldestNewestTime === Infinity ? null : oldestNewestTime,
    mostMemsIdx,
    leastMemsIdx,
    oldestMemIdx,
    mostCloudyIdx,
    mostSunnyIdx,
    noMemsIdx,
    /** Max total cloudy (hard truth) moments across any entity — used to hide "Most cloudy" when empty */
    maxCloudyScore: mostCloudy,
    /** Max total sunny (good fact) moments across any entity — used to hide "Most sunny" when empty */
    maxSunnyScore: mostSunny,
  };
}

const SferaInsightsCard = React.memo(function SferaInsightsCard({
  sphere,
  entities,
  memoriesPerEntity,
  onMemorySelect,
  onEntitySelect,
  onNeedMemoriesHintCenter,
  showNeedMemoriesHintBelowCard,
  colorScheme,
  x,
  y,
  animationsEnabled,
  sphere3DEffect: _sphere3DEffect = false,
  cardWidth,
  cardHeight,
  isExpanded: _isExpanded,
  onToggleSize: _onToggleSize,
}: {
  sphere: LifeSphere;
  entities: FocusedEntitiesViewProps["entities"];
  memoriesPerEntity: IdealizedMemory[][];
  onMemorySelect?: (memoryId: string, entityId: string) => void;
  onEntitySelect?: (entityId: string) => void;
  onNeedMemoriesHintCenter?: () => void;
  showNeedMemoriesHintBelowCard?: boolean;
  colorScheme: "light" | "dark";
  x: number;
  y: number;
  animationsEnabled: boolean;
  sphere3DEffect?: boolean;
  cardWidth: number;
  cardHeight: number;
  isExpanded: boolean;
  onToggleSize: () => void;
}) {
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  // relationships: only general comparisons (least/most memories, most cloudy/sunny) — no time-based modes
  // career: hide interaction modes (0-2) — processing sphere, not an active social one
  // hobbies: hide mood modes (4-5) — cloudy/sunny framing doesn't fit activities
  const hiddenModes = useMemo(
    () =>
      sphere === "relationships"
        ? new Set([1, 2])
        : sphere === "career"
          ? new Set([0, 1, 2])
          : sphere === "hobbies"
            ? new Set([4, 5])
            : new Set<number>(),
    [sphere],
  );

  const { newestIdx, newestTime, oldestMemTime, mostMemsIdx, leastMemsIdx, oldestMemIdx, mostCloudyIdx, mostSunnyIdx, maxCloudyScore, maxSunnyScore } = useMemo(
    () => getInteractionIndices(memoriesPerEntity),
    [memoriesPerEntity],
  );

  const allowedModes = useMemo(() => {
    const base = [0, 1, 2, 3, 4, 5].filter((m) => !hiddenModes.has(m));
    return base.filter((m) => {
      if (m === 4 && maxCloudyScore <= 0) return false;
      if (m === 5 && maxSunnyScore <= 0) return false;
      return true;
    });
  }, [hiddenModes, maxCloudyScore, maxSunnyScore]);

  const [modeIdx, setModeIdx] = useState(
    () => (sphere === "family" || sphere === "friends" ? 1 : 0),
  );
  const [isAutoLoopPaused, setIsAutoLoopPaused] = useState(false);
  const prevSphereRef = useRef(sphere);
  const mode = allowedModes[modeIdx] ?? allowedModes[0] ?? 0;
  const insightCardOpacity = useSharedValue(1);
  const insightCardTranslateX = useSharedValue(0);
  const insightTitleOpacity = useSharedValue(1);
  const insightDragX = useSharedValue(0);
  const insightTitleTransitionLockRef = useRef(false);
  const shadowColor = getSphereShadowColor(sphere, colorScheme);
  const { ink: insightInk, inkMuted: insightInkMuted } = insightCardInk(colorScheme);
  const { cloudy: insightCloudyMeta, sunny: insightSunnyMeta } = insightSunnyCloudyMetaColors(
    colorScheme,
    momentColors.cloudy.background,
  );
  const numEntities = entities.length;
  const totalMemoriesCount = useMemo(
    () => memoriesPerEntity.reduce((sum, arr) => sum + arr.length, 0),
    [memoriesPerEntity],
  );
  // Family/friends keep reminder affordance in interaction-focused modes.
  const hasReminderSupport = sphere === "family" || sphere === "friends";

  // Urgency: oldest memory > 30 days ago
  const isUrgent = hasReminderSupport && oldestMemTime !== null && (Date.now() - oldestMemTime) > 30 * 24 * 60 * 60 * 1000;

  const numModes = numEntities === 0 ? 1 : Math.max(1, allowedModes.length);

  useEffect(() => {
    if (prevSphereRef.current !== sphere) {
      prevSphereRef.current = sphere;
      setIsAutoLoopPaused(false);
      cancelAnimation(insightCardOpacity);
      cancelAnimation(insightCardTranslateX);
      cancelAnimation(insightTitleOpacity);
      cancelAnimation(insightDragX);
      insightTitleTransitionLockRef.current = false;
      insightCardOpacity.value = 1;
      insightCardTranslateX.value = 0;
      insightTitleOpacity.value = 1;
      insightDragX.value = 0;
      if (sphere === "family" || sphere === "friends") {
        const i = allowedModes.indexOf(1);
        setModeIdx(i >= 0 ? i : 0);
      } else {
        setModeIdx(0);
      }
    }
  }, [sphere, allowedModes]);

  useEffect(() => {
    setModeIdx((prev) => {
      if (allowedModes.length === 0) return 0;
      return Math.min(prev, allowedModes.length - 1);
    });
  }, [allowedModes]);

  /** direction 1 = forward (auto / swipe left / chevron right): card exits left, new one enters from right. -1 = reverse. */
  const runInsightTitleTransition = useCallback(
    (applyModeUpdate: () => void, direction: 1 | -1) => {
      if (!animationsEnabled) {
        applyModeUpdate();
        return;
      }
      if (insightTitleTransitionLockRef.current) return;
      insightTitleTransitionLockRef.current = true;
      const easeOut = Easing.out(Easing.ease);
      const easeIn = Easing.out(Easing.ease);
      const slide = INSIGHT_CARD_SLIDE_X;
      const outX = direction === 1 ? -slide : slide;
      const inFromX = direction === 1 ? slide : -slide;

      const unlock = () => {
        insightTitleTransitionLockRef.current = false;
      };

      // Title: fade-only (no slide), matching the sphere-name drag fade
      insightTitleOpacity.value = withTiming(0, {
        duration: INSIGHT_CARD_OUT_MS,
        easing: easeOut,
      });

      // Card body: slide + fade out
      insightCardOpacity.value = withTiming(
        0,
        { duration: INSIGHT_CARD_OUT_MS, easing: easeOut },
        (finished) => {
          if (!finished) {
            runOnJS(unlock)();
            return;
          }
          runOnJS(applyModeUpdate)();
          insightCardTranslateX.value = inFromX;
          insightCardOpacity.value = 0;
          insightTitleOpacity.value = 0;

          insightCardOpacity.value = withTiming(1, {
            duration: INSIGHT_CARD_IN_MS,
            easing: easeIn,
          });
          insightTitleOpacity.value = withTiming(1, {
            duration: INSIGHT_CARD_IN_MS,
            easing: easeIn,
          });
          insightCardTranslateX.value = withTiming(
            0,
            { duration: INSIGHT_CARD_IN_MS, easing: easeIn },
            (done) => {
              if (done) runOnJS(unlock)();
            },
          );
        },
      );
      insightCardTranslateX.value = withTiming(outX, {
        duration: INSIGHT_CARD_OUT_MS,
        easing: easeOut,
      });
    },
    [
      animationsEnabled,
      insightCardOpacity,
      insightCardTranslateX,
      insightTitleOpacity,
    ],
  );

  const animateAndSet = useCallback(
    (nextIdx: number) => {
      if (nextIdx === modeIdx) return;
      const forward = (nextIdx - modeIdx + numModes) % numModes;
      const backward = numModes - forward;
      const dir: 1 | -1 = forward === 0 ? 1 : forward <= backward ? 1 : -1;
      runInsightTitleTransition(() => setModeIdx(nextIdx), dir);
    },
    [runInsightTitleTransition, modeIdx, numModes],
  );

  const goNext = useCallback(() => {
    runInsightTitleTransition(
      () => setModeIdx((prev) => (prev + 1) % numModes),
      1,
    );
  }, [runInsightTitleTransition, numModes]);

  const goPrev = useCallback(() => {
    runInsightTitleTransition(
      () => setModeIdx((prev) => (prev - 1 + numModes) % numModes),
      -1,
    );
  }, [runInsightTitleTransition, numModes]);

  const progress = useSharedValue(0);

  // Keep latest nav callbacks in refs for auto-advance and swipe worklets
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goPrevRef = useRef(goPrev);
  goPrevRef.current = goPrev;

  const advanceInsightOnJS = useCallback(() => {
    goNextRef.current();
  }, []);

  // Auto-cycle insights every SFERA_INSIGHT_AUTO_MS; progress bar on top border resets each mode
  useEffect(() => {
    if (!animationsEnabled || numModes <= 1 || numEntities === 0) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    if (isAutoLoopPaused) {
      cancelAnimation(progress);
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: SFERA_INSIGHT_AUTO_MS }, (finished) => {
      if (finished) {
        runOnJS(advanceInsightOnJS)();
      }
    });
    return () => {
      cancelAnimation(progress);
    };
  }, [advanceInsightOnJS, modeIdx, numEntities, numModes, progress, animationsEnabled, isAutoLoopPaused]);

  const insightCardAnimStyle = useAnimatedStyle(() => ({
    opacity: insightCardOpacity.value,
    transform: [{ translateX: insightCardTranslateX.value + insightDragX.value }],
  }));

  const insightTitleAnimStyle = useAnimatedStyle(() => {
    // Fade based on total card displacement — the closer to the screen edge, the more faded
    const totalDisplacement = Math.abs(insightCardTranslateX.value + insightDragX.value);
    const dragFade = Math.max(0, Math.min(1, 1 - (totalDisplacement / (SW * 0.35)) * 1.1));
    return {
      opacity: insightTitleOpacity.value * dragFade,
      // Counteract the parent's translateX + drag so the title stays in place
      transform: [{ translateX: -(insightCardTranslateX.value + insightDragX.value) }],
    };
  });

  // Progress bar fill width (0→100%) driven by the existing progress shared value
  const PROGRESS_BAR_W = Math.round(INSIGHT_ATMO_R * 1.2);
  const progressBarFillStyle = useAnimatedStyle(() => ({
    width: progress.value * PROGRESS_BAR_W,
  }));

  // 6 modes: 0=least memories, 1=oldest memory, 2=most recent, 3=most memories, 4=most cloudy, 5=most sunny
  const entityIdx = [leastMemsIdx, oldestMemIdx, newestIdx, mostMemsIdx, mostCloudyIdx, mostSunnyIdx][mode] ?? 0;
  const entity = entities[entityIdx];
  const entityName = entity?.name ?? "";
  const showReminderBell = hasReminderSupport && (mode === 0 || mode === 1) && entity != null;

  // Urgency
  const isMoodCard = mode === 4 || mode === 5;

  // Human-readable time since interaction (must be before early return)
  const timeAgoLabel = useMemo(() => {
    const ts = mode === 1 ? oldestMemTime : newestTime;
    if (!ts || (mode !== 1 && mode !== 2)) return null;
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return t("sferaInsight.timeAgo.today");
    if (days < 31) return `${days}${t("sferaInsight.timeAgo.days")}`;
    const months = Math.floor(days / 30);
    return `${months}${t("sferaInsight.timeAgo.months")}`;
  }, [oldestMemTime, newestTime, mode, t]);

  // Label for top of view — some labels are sphere-specific
  const cardLabels = [
    sphere === "hobbies" ? t("sferaInsight.leastPracticed") : t("sferaInsight.leastMemories"),
    sphere === "hobbies" ? t("sferaInsight.lastPracticed") : t("sferaInsight.oldestMemory"),
    sphere === "hobbies" ? t("sferaInsight.mostRecentHobby") : t("sferaInsight.mostRecent"),
    t("sferaInsight.mostMemories2"),
    t("sferaInsight.mostCloudy"),
    sphere === "hobbies" ? t("sferaInsight.mostEnjoyable") : t("sferaInsight.mostSunny"),
  ];
  const cardLabel = cardLabels[mode] ?? cardLabels[0];

  const getModeMemory = useCallback(
    (targetMode: number, idx: number): IdealizedMemory | null => {
      const mems = memoriesPerEntity[idx] ?? [];
      if (mems.length === 0) return null;
      if (targetMode === 1) {
        return mems.reduce((a, b) =>
          new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b,
        );
      }
      if (targetMode === 2) {
        return mems.reduce((a, b) =>
          new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b,
        );
      }
      if (targetMode === 4) {
        return mems.reduce((a, b) =>
          (a.hardTruths?.length ?? 0) > (b.hardTruths?.length ?? 0) ? a : b,
        );
      }
      if (targetMode === 5) {
        return mems.reduce((a, b) =>
          (a.goodFacts?.length ?? 0) > (b.goodFacts?.length ?? 0) ? a : b,
        );
      }
      return null;
    },
    [memoriesPerEntity],
  );

  const openEntity = useCallback(() => {
    if (entity) onEntitySelect?.(entity.id);
  }, [entity, onEntitySelect]);

  const openMemory = useCallback(
    (memory: IdealizedMemory) => {
      if (!entity) return;
      if (onMemorySelect) {
        onMemorySelect(memory.id, entity.id);
        return;
      }
      const params: Record<string, string> = {
        sphere,
        entityId: entity.id,
        focusedMemoryId: memory.id,
      };
      if (sphere === "relationships") params.profileId = entity.id;
      else if (sphere === "career") params.jobId = entity.id;
      else if (sphere === "family") params.familyMemberId = entity.id;
      else if (sphere === "friends") params.friendId = entity.id;
      else if (sphere === "hobbies") params.hobbyId = entity.id;

      router.replace({
        pathname: "/(tabs)",
        params,
      });
    },
    [entity, onMemorySelect, sphere],
  );

  const toggleAutoLoopPause = useCallback(() => {
    setIsAutoLoopPaused((prev) => !prev);
  }, []);

  const titleTapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(toggleAutoLoopPause)();
      }),
    [toggleAutoLoopPause],
  );

  const wasPausedBeforeDragRef = useRef(false);
  const pauseAutoLoop = useCallback(() => {
    wasPausedBeforeDragRef.current = isAutoLoopPaused;
    if (!isAutoLoopPaused) setIsAutoLoopPaused(true);
  }, [isAutoLoopPaused]);
  const resumeAutoLoop = useCallback(() => {
    if (!wasPausedBeforeDragRef.current) setIsAutoLoopPaused(false);
  }, []);

  const insightCardGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([
        -INSIGHT_CARD_SWIPE_ACTIVATION_PX,
        INSIGHT_CARD_SWIPE_ACTIVATION_PX,
      ])
      .failOffsetY([
        -INSIGHT_CARD_SWIPE_FAIL_Y_PX,
        INSIGHT_CARD_SWIPE_FAIL_Y_PX,
      ])
      .onStart(() => {
        runOnJS(pauseAutoLoop)();
      })
      .onUpdate((e) => {
        insightDragX.value = e.translationX;
      })
      .onEnd((e) => {
        const tx = e.translationX;
        const ty = e.translationY;
        if (
          Math.abs(tx) > INSIGHT_CARD_SWIPE_COMMIT_PX &&
          Math.abs(tx) > Math.abs(ty) * 1.5
        ) {
          if (tx < 0) {
            runOnJS(goNextRef.current)();
          } else {
            runOnJS(goPrevRef.current)();
          }
        }
        insightDragX.value = withTiming(0, { duration: 200 });
        runOnJS(resumeAutoLoop)();
      })
      .onFinalize(() => {
        insightDragX.value = withTiming(0, { duration: 200 });
        runOnJS(resumeAutoLoop)();
      });

    return pan;
  }, [insightDragX, pauseAutoLoop, resumeAutoLoop]);

  // Ring rotation for the insight planet
  const ringRotation = useSharedValue(0);
  useEffect(() => {
    if (!animationsEnabled) {
      cancelAnimation(ringRotation);
      ringRotation.value = 0;
      return;
    }
    ringRotation.value = 0;
    ringRotation.value = withRepeat(
      withTiming(360, { duration: 30000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(ringRotation);
  }, [animationsEnabled, ringRotation]);

  // Glow pulse for ring-planet
  const glowPulse = useSharedValue(0.5);
  useEffect(() => {
    if (!animationsEnabled) {
      cancelAnimation(glowPulse);
      glowPulse.value = 0.5;
      return;
    }
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glowPulse);
  }, [animationsEnabled, glowPulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const isLight = colorScheme === "light";
  const ringColors = sphereRingsForScheme(sphere, colorScheme);

  // ─── Wrapper positioning ───
  const viewW = Math.max(SW * 0.92, INSIGHT_PLANET_CANVAS);
  // Extra offset to account for the mode label rendered above the planet
  const titleOffset = numModes > 1 ? 14 : 0;
  const wrapperStyle = {
    position: "absolute" as const,
    left: x - viewW / 2,
    top: y - cardHeight / 2 - titleOffset,
    width: viewW,
    zIndex: 12,
    alignItems: "center" as const,
    overflow: "visible" as const,
  };

  // Moon avatar image (entity image)
  const moonImageUri = entity?.imageUri?.trim() || null;
  const moonTop = INSIGHT_PLANET_C - INSIGHT_ATMO_R - INSIGHT_MOON_SIZE / 2 + 2;

  // ─── Meta row text ───
  const metaRow = useMemo(() => {
    const parts: string[] = [];
    if ((mode === 1 || mode === 2) && timeAgoLabel) {
      parts.push(timeAgoLabel);
    }
    const mems = memoriesPerEntity[entityIdx] ?? [];
    // Only show memory count for least/most memories modes (0/3), not single-memory modes
    if (mode === 0) {
      parts.push(`${mems.length} ${t("sferaInsight.memories")}`);
    }
    if (mode === 3) {
      parts.push(`${mems.length} ${t("sferaInsight.memories")}`);
    }
    // Modes 4/5 (most cloudy/sunny): no count text — the featured memory image is the focus
    return parts.join(" · ");
  }, [mode, timeAgoLabel, memoriesPerEntity, entityIdx, t]);

  // ─── Memory image thumbnails (modes 0/3) or featured image (modes 1/2/4/5) ───
  const thumbMemories = useMemo(() => {
    if (mode !== 0 && mode !== 3) return [];
    const mems = memoriesPerEntity[entityIdx] ?? [];
    if (mems.length === 0) return [];
    const withImages = mems.filter((m) => m.imageUri?.trim());
    return withImages.slice(0, INSIGHT_THUMB_MAX);
  }, [mode, memoriesPerEntity, entityIdx]);

  const thumbOverflow = useMemo(() => {
    if (thumbMemories.length === 0) return 0;
    const mems = memoriesPerEntity[entityIdx] ?? [];
    const withImages = mems.filter((m) => m.imageUri?.trim());
    return Math.max(0, withImages.length - INSIGHT_THUMB_MAX);
  }, [thumbMemories, memoriesPerEntity, entityIdx]);

  // Featured memory for single-memory modes (1=oldest, 2=recent, 4=cloudy, 5=sunny)
  const featuredMemory = useMemo(() => {
    if (mode !== 1 && mode !== 2 && mode !== 4 && mode !== 5) return null;
    return getModeMemory(mode, entityIdx);
  }, [mode, entityIdx, getModeMemory]);
  const featuredMemoryUri = featuredMemory?.imageUri?.trim() || null;
  const featuredMemoryTitle = featuredMemory?.title?.trim() || null;

  // ─── Empty: no entities ───
  if (numEntities === 0) {
    return (
      <View style={wrapperStyle} pointerEvents="box-none">
        {/* Planet */}
        <View style={{ width: INSIGHT_PLANET_CANVAS, height: INSIGHT_PLANET_CANVAS, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
          <Animated.View
            pointerEvents="none"
            style={[glowStyle, {
              position: "absolute",
              width: INSIGHT_ATMO_R * 2 + 40,
              height: INSIGHT_ATMO_R * 2 + 40,
              borderRadius: INSIGHT_ATMO_R + 20,
              shadowColor: isLight ? "#000000" : ringColors.glow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isLight ? 0.15 : 0.55,
              shadowRadius: isLight ? 20 : 36,
              elevation: 0,
            }]}
          />
          <RingPlanetSvg
            id={`insight-empty-${sphere}`}
            colors={ringColors}
            ringRotation={ringRotation}
            isLight={isLight}
            atmoR={INSIGHT_ATMO_R}
            planetCanvas={INSIGHT_PLANET_CANVAS}
            planetC={INSIGHT_PLANET_C}
          />
        </View>
        <View style={{ alignItems: "center", gap: 8, marginTop: 8, paddingHorizontal: 20 }}>
          <ThemedText
            style={{
              color: insightInk,
              fontSize: 14,
              fontWeight: "600",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            {t(sferaInsightEmptyEntitiesWarmKey(sphere))}
          </ThemedText>
          <SferaInsightEmptyGuideLink sphere={sphere} />
        </View>
      </View>
    );
  }

  // ─── Empty: entities but zero memories ───
  if (totalMemoriesCount === 0) {
    return (
      <View style={wrapperStyle} pointerEvents="box-none">
        {/* Planet with hint overlay inside */}
        <View style={{ width: INSIGHT_PLANET_CANVAS, height: INSIGHT_PLANET_CANVAS, alignItems: "center", justifyContent: "center" }}>
          <Animated.View
            pointerEvents="none"
            style={[glowStyle, {
              position: "absolute",
              width: INSIGHT_ATMO_R * 2 + 40,
              height: INSIGHT_ATMO_R * 2 + 40,
              borderRadius: INSIGHT_ATMO_R + 20,
              shadowColor: isLight ? "#000000" : ringColors.glow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isLight ? 0.15 : 0.55,
              shadowRadius: isLight ? 20 : 36,
              elevation: 0,
            }]}
          />
          <RingPlanetSvg
            id={`insight-zero-${sphere}`}
            colors={ringColors}
            ringRotation={ringRotation}
            isLight={isLight}
            atmoR={INSIGHT_ATMO_R}
            planetCanvas={INSIGHT_PLANET_CANVAS}
            planetC={INSIGHT_PLANET_C}
          />
          {/* Hint text + button inside the sfera */}
          <View
            style={{
              position: "absolute",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
              gap: 8,
            }}
            pointerEvents="box-none"
          >
            <ThemedText
              style={{
                color: insightInk,
                fontSize: 14,
                textAlign: "center",
                fontWeight: "600",
                fontStyle: "italic",
              }}
            >
              {t(sferaInsightNoMemoriesReflectionKey(sphere))}
            </ThemedText>
            <Pressable
              onPress={() => emitCreateMemoryHint()}
              style={{
                borderRadius: 14,
                borderWidth: 1.25,
                borderColor: colorScheme === "dark"
                  ? Colors.dark.primary + "88"
                  : Colors.light.primary + "55",
                backgroundColor: colorScheme === "dark"
                  ? Colors.dark.primary + "22"
                  : Colors.light.primary + "14",
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <ThemedText
                style={{
                  color: colorScheme === "dark" ? Colors.dark.primary : Colors.light.primary,
                  fontSize: 11,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {t("sferaInsight.addFirstMemory")}
              </ThemedText>
            </Pressable>
          </View>
        </View>
        {showNeedMemoriesHintBelowCard && (
          <View
            style={{ alignSelf: "center", marginTop: 8, ...needMemoriesHintBubbleStyle }}
            pointerEvents="none"
          >
            <ThemedText style={{ fontSize: 11, color: "#FFFFFF", textAlign: "center", lineHeight: 15 }}>
              {t("sferaInsight.needMemoriesFirst")}
            </ThemedText>
          </View>
        )}
      </View>
    );
  }

  // ─── Main: ring-planet insight view ───
  return (
    <View style={wrapperStyle} pointerEvents="box-none">
      {/* ── Planet with side chevrons ── */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", overflow: "visible" }} pointerEvents="box-none">
        {/* Left chevron */}
        {numModes > 1 ? (
          <Pressable
            onPress={goPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous insight"
            style={{ width: 48, height: 80, alignItems: "center", justifyContent: "center", zIndex: 30 }}
          >
            <MaterialIcons name="chevron-left" size={28} color={shadowColor + "CC"} />
          </Pressable>
        ) : <View style={{ width: 48 }} />}

      <GestureDetector gesture={insightCardGesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={entity ? `${cardLabel}: ${entityName}` : undefined}
          collapsable={false}
          style={[insightCardAnimStyle, { alignItems: "center", flex: 1, overflow: "visible" }]}
        >
          {/* ── Mode label — above the planet, fade-only (counteracts parent slide) ── */}
          {numModes > 1 && (
            <Animated.View style={[insightTitleAnimStyle, { alignItems: "center", marginBottom: -4, zIndex: 10 }]}>
              <ThemedText
                style={{
                  color: shadowColor,
                  fontSize: 15,
                  fontWeight: "900",
                  letterSpacing: 1.8,
                  textTransform: "uppercase",
                }}
                numberOfLines={1}
              >
                {cardLabel}
              </ThemedText>
            </Animated.View>
          )}
          {/* ── Ring-planet with content overlay ── */}
          <View style={{ width: INSIGHT_PLANET_CANVAS, height: INSIGHT_PLANET_CANVAS, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            {/* Glow shadow */}
            <Animated.View
              pointerEvents="none"
              style={[glowStyle, {
                position: "absolute",
                width: INSIGHT_ATMO_R * 2 + 40,
                height: INSIGHT_ATMO_R * 2 + 40,
                borderRadius: INSIGHT_ATMO_R + 20,
                shadowColor: isLight ? "#000000" : ringColors.glow,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isLight ? 0.15 : 0.55,
                shadowRadius: isLight ? 20 : 36,
                elevation: 0,
              }]}
            />

            {/* Planet SVG */}
            <RingPlanetSvg
              id={`insight-${sphere}-${entityIdx}`}
              colors={ringColors}
              ringRotation={ringRotation}
              isLight={isLight}
              atmoR={INSIGHT_ATMO_R}
              planetCanvas={INSIGHT_PLANET_CANVAS}
              planetC={INSIGHT_PLANET_C}
            />

            {/* ── Content overlay — all info inside the planet ── */}
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9,
              }}
              pointerEvents="box-none"
            >
              {/* Entity name — tappable to pause/resume auto-swipe */}
              <GestureDetector gesture={titleTapGesture}>
              <Animated.View
                style={{ alignItems: "center", gap: 3 }}
                accessibilityRole="button"
                accessibilityLabel={`${entityName}. ${isAutoLoopPaused ? "Resume auto-swipe" : "Pause auto-swipe"}`}
              >
                <ThemedText
                  style={{
                    color: insightInk,
                    fontSize: 22,
                    fontWeight: "700",
                    textAlign: "center",
                    textShadowColor: isLight ? "rgba(255,255,255,0.75)" : "rgba(8,14,28,0.90)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 8,
                  }}
                  numberOfLines={1}
                >
                  {entityName}
                </ThemedText>
                {/* Meta row */}
                {metaRow ? (
                  <ThemedText
                    style={{
                      color: isMoodCard
                        ? mode === 4 ? insightCloudyMeta : insightSunnyMeta
                        : isUrgent && mode === 1 ? INSIGHT_LIGHT_URGENCY_AFFORDANCE : insightInkMuted,
                      fontSize: 14,
                      textAlign: "center",
                      textShadowColor: isLight ? "rgba(255,255,255,0.75)" : "rgba(8,14,28,0.85)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4,
                    }}
                  >
                    {metaRow}
                  </ThemedText>
                ) : null}
                {/* Featured memory title for single-memory modes */}
                {featuredMemoryTitle && (
                  <ThemedText
                    style={{
                      color: insightInkMuted,
                      fontSize: 12,
                      textAlign: "center",
                      textShadowColor: isLight ? "rgba(255,255,255,0.75)" : "rgba(8,14,28,0.85)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4,
                    }}
                    numberOfLines={1}
                  >
                    {featuredMemoryTitle}
                  </ThemedText>
                )}
              </Animated.View>
              </GestureDetector>

              {/* Memory image thumbnails row */}
              {thumbMemories.length > 0 && (
                <Pressable
                  onPress={openEntity}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 6,
                  }}
                >
                  {thumbMemories.map((mem, i) => (
                    <View
                      key={mem.id}
                      style={{
                        width: INSIGHT_THUMB_SIZE,
                        height: INSIGHT_THUMB_SIZE,
                        borderRadius: INSIGHT_THUMB_SIZE / 2,
                        borderWidth: 1.5,
                        borderColor: shadowColor + "88",
                        overflow: "hidden",
                        backgroundColor: isLight
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(8,14,28,0.7)",
                        marginLeft: i > 0 ? -4 : 0,
                        zIndex: INSIGHT_THUMB_MAX - i,
                      }}
                    >
                      <Image
                        source={{ uri: mem.imageUri! }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    </View>
                  ))}
                  {thumbOverflow > 0 && (
                    <View
                      style={{
                        width: INSIGHT_THUMB_SIZE,
                        height: INSIGHT_THUMB_SIZE,
                        borderRadius: INSIGHT_THUMB_SIZE / 2,
                        borderWidth: 1.5,
                        borderColor: shadowColor + "88",
                        backgroundColor: isLight
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(8,14,28,0.7)",
                        marginLeft: -4,
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 0,
                      }}
                    >
                      <ThemedText
                        style={{
                          color: insightInkMuted,
                          fontSize: 8,
                          fontWeight: "700",
                        }}
                      >
                        +{thumbOverflow}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              )}

              {/* Featured memory image for single-memory modes */}
              {featuredMemoryUri && (() => {
                const imgSize = isMoodCard ? INSIGHT_FEATURED_IMG_SIZE_MOOD : INSIGHT_FEATURED_IMG_SIZE;
                return (
                  <Pressable
                    onPress={() => {
                      if (featuredMemory) openMemory(featuredMemory);
                      else openEntity();
                    }}
                    style={{
                      marginTop: 8,
                      width: imgSize,
                      height: imgSize,
                      borderRadius: imgSize / 2,
                      borderWidth: 2,
                      borderColor: shadowColor + "AA",
                      overflow: "hidden",
                      backgroundColor: isLight
                        ? "rgba(255,255,255,0.92)"
                        : "rgba(8,14,28,0.72)",
                      shadowColor: shadowColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.7,
                      shadowRadius: 10,
                      elevation: 5,
                    }}
                  >
                    <Image
                      source={{ uri: featuredMemoryUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </Pressable>
                );
              })()}

              {/* Progress bar + pause/play button — inside planet */}
              {numModes > 1 && (
                <View style={{ alignItems: "center", marginTop: 10 }}>
                  <View
                    style={{
                      width: PROGRESS_BAR_W,
                      height: 3,
                      borderRadius: 1.5,
                      backgroundColor: shadowColor + "22",
                      overflow: "hidden",
                    }}
                  >
                    {!isAutoLoopPaused && (
                      <Animated.View
                        style={[progressBarFillStyle, {
                          height: 3,
                          borderRadius: 1.5,
                          backgroundColor: shadowColor + "AA",
                        }]}
                      />
                    )}
                  </View>
                  <Pressable
                    onPress={toggleAutoLoopPause}
                    hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                    style={{ marginTop: 4, padding: 8 }}
                  >
                    <MaterialIcons
                      name={isAutoLoopPaused ? "play-arrow" : "pause"}
                      size={20}
                      color={shadowColor + "88"}
                    />
                  </Pressable>
                </View>
              )}

            </View>
          </View>
        </Animated.View>
      </GestureDetector>

        {/* Right chevron */}
        {numModes > 1 ? (
          <Pressable
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel="Next insight"
            style={{ width: 48, height: 80, alignItems: "center", justifyContent: "center", zIndex: 30 }}
          >
            <MaterialIcons name="chevron-right" size={28} color={shadowColor + "CC"} />
          </Pressable>
        ) : <View style={{ width: 48 }} />}
      </View>

      {/* Notification bell — below the planet */}
      {showReminderBell && (
        <Animated.View style={[insightCardAnimStyle, { alignSelf: "center" }]}>
          <Pressable
            onPress={() => {
              router.push(`/notifications/${sphere}/${entity!.id}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Set reminder for ${entityName}`}
            accessibilityHint="Opens notification settings"
            style={{
              alignSelf: "center",
              marginTop: -Math.round(INSIGHT_PLANET_CANVAS * 0.28),
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: shadowColor + "66",
              backgroundColor: isLight ? "rgba(255,255,255,0.94)" : "rgba(8,14,28,0.82)",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: shadowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <MaterialIcons name="notifications-none" size={16} color={shadowColor} />
          </Pressable>
        </Animated.View>
      )}

      {showNeedMemoriesHintBelowCard && totalMemoriesCount > 0 ? (
        <View
          style={{
            alignSelf: "center",
            marginTop: 6,
            ...needMemoriesHintBubbleStyle,
          }}
          pointerEvents="none"
        >
          <ThemedText style={{ fontSize: 11, color: "#FFFFFF", textAlign: "center", lineHeight: 15 }}>
            {t("sferaInsight.needMemoriesFirst")}
          </ThemedText>
        </View>
      ) : null}
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
  isActive = true,
}: FocusedEntitiesViewProps) {
  const { isTablet } = useLargeDevice();
  const { sphere3DEffect } = useVisualSettings();
  const isScreenFocused = useIsFocused();
  const animationsEnabled = isActive && isScreenFocused && !hidden;

  const memoriesHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const orbitHintEntityId =
    memoriesHint?.place === "orbit" ? memoriesHint.entityId : null;
  const showInsightCardHint = memoriesHint?.place === "insightCard";
  const [isCardExpanded, setIsCardExpanded] = useState(true);
  const insightCardWidth = isCardExpanded ? INSIGHT_CARD_EXPANDED_W : INSIGHT_CARD_COLLAPSED_W;
  const insightCardHeight = isCardExpanded ? INSIGHT_CARD_EXPANDED_H : INSIGHT_CARD_COLLAPSED_H;

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

  const { orbitEntities, orbitMemoriesPerEntity } = useMemo(() => {
    const { entities: oEnt, memoriesPerEntity: oMem } =
      pickOrbitEntitiesBySunnyScoreForEntities(
        sortedEntities,
        sortedMemoriesPerEntity,
        ORBIT_MAX_FLOATING_ENTITIES,
      );
    return { orbitEntities: oEnt, orbitMemoriesPerEntity: oMem };
  }, [sortedEntities, sortedMemoriesPerEntity]);

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
          animationsEnabled={animationsEnabled}
        />
        <SferaInsightsCard
          sphere={sphere}
          entities={sortedEntities}
          memoriesPerEntity={sortedMemoriesPerEntity}
          onMemorySelect={onMemorySelect}
          onEntitySelect={onEntitySelect}
          onNeedMemoriesHintCenter={showInsightCardNeedMemoriesHint}
          showNeedMemoriesHintBelowCard={showInsightCardHint}
          colorScheme={colorScheme}
          x={AVATAR_CX}
          y={AVATAR_CY}
          animationsEnabled={animationsEnabled}
          sphere3DEffect={sphere3DEffect}
          cardWidth={insightCardWidth}
          cardHeight={insightCardHeight}
          isExpanded={isCardExpanded}
          onToggleSize={() => setIsCardExpanded((prev) => !prev)}
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
        animationsEnabled={animationsEnabled}
      />

      {/* Central insight card */}
      <SferaInsightsCard
        sphere={sphere}
        entities={sortedEntities}
        memoriesPerEntity={sortedMemoriesPerEntity}
        onMemorySelect={onMemorySelect}
        onEntitySelect={onEntitySelect}
        onNeedMemoriesHintCenter={showInsightCardNeedMemoriesHint}
        showNeedMemoriesHintBelowCard={showInsightCardHint}
        colorScheme={colorScheme}
        x={AVATAR_CX}
        y={AVATAR_CY}
        animationsEnabled={animationsEnabled}
        sphere3DEffect={sphere3DEffect}
        cardWidth={insightCardWidth}
        cardHeight={insightCardHeight}
        isExpanded={isCardExpanded}
        onToggleSize={() => setIsCardExpanded((prev) => !prev)}
      />

      {/* Entities sliding clockwise around the card perimeter */}
      <EntityRing
        entities={orbitEntities}
        memoriesPerEntity={orbitMemoriesPerEntity}
        onEntitySelect={onEntitySelect}
        needMemoriesHintEntityId={orbitHintEntityId}
        onNeedMemoriesHint={showOrbitNeedMemoriesHint}
        sphere={sphere}
        centerX={AVATAR_CX}
        centerY={AVATAR_CY}
        avatarSize={(isTablet ? 60 : 50) * IPAD_ENTITIES_AVATAR_SCALE}
        glowColor={sunnyBackground}
        orbitDurationMs={orbitDurationMs}
        animationsEnabled={animationsEnabled}
        cardWidth={insightCardWidth}
        cardHeight={insightCardHeight}
      />
    </View>
  );
});
