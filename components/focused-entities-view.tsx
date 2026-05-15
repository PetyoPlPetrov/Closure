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
  sferaInsightReflectionPromptKey,
} from "@/utils/sfera-insight-empty-entities";
import {
  getSphereGradientColors,
  getSphereShadowColor,
} from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
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
const COSMIC_INNER_DARK = ["rgba(10,14,26,0.55)", "rgba(15,20,34,0.6)", "rgba(21,28,46,0.65)", "rgba(26,36,64,0.6)", "rgba(30,42,74,0.55)"] as const;
/** True light cosmic surface (prior version reused dark hues for “light” and failed WCAG AAA for meta text). */
const COSMIC_INNER_LIGHT = [
  "rgba(255,252,251,0.97)",
  "rgba(247,251,255,0.97)",
  "rgba(240,246,252,0.97)",
  "rgba(233,241,249,0.97)",
  "rgba(227,237,246,0.97)",
] as const;

/** Auto-advance interval for cycling sfera insight modes (ms). */
const SFERA_INSIGHT_AUTO_MS = 5000;
/** Swipe on insight card: horizontal pan activates before tap (RNGH `activeOffsetX`). */
const INSIGHT_CARD_SWIPE_ACTIVATION_PX = 12;
const INSIGHT_CARD_SWIPE_COMMIT_PX = 20;
const INSIGHT_CARD_SWIPE_FAIL_Y_PX = 28;
const INSIGHT_CARD_TAP_MAX_DISTANCE_PX = 14;

/** Title row crossfade when switching insight modes (ms). */
const INSIGHT_TITLE_OUT_MS = 260;
const INSIGHT_TITLE_IN_LABEL_MS = 360;
const INSIGHT_TITLE_IN_PERSON_MS = 320;
const INSIGHT_TITLE_STAGGER_MS = 80;
/** Horizontal slide distance (next = exit left / enter from right, like swiping the card left). */
const INSIGHT_TITLE_SLIDE_X = Math.round(36 * IPAD_ENTITIES_CARD_SCALE);

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

// ───────────────────── Sfera Insight Card dimensions (used by both card and perimeter layout) ─────────────────────

const INSIGHT_CARD_COLLAPSED_W = 240 * IPAD_ENTITIES_CARD_SCALE;
const INSIGHT_CARD_COLLAPSED_H = 295 * IPAD_ENTITIES_CARD_SCALE;
const INSIGHT_CARD_EXPANDED_SCALE = 1.2;
const INSIGHT_CARD_EXPANDED_W = INSIGHT_CARD_COLLAPSED_W * INSIGHT_CARD_EXPANDED_SCALE;
const INSIGHT_CARD_EXPANDED_H = INSIGHT_CARD_COLLAPSED_H * INSIGHT_CARD_EXPANDED_SCALE;

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

const INSIGHT_ARROW_SIZE = 28;
const INSIGHT_ARROW_HIT = 36;
const INSIGHT_SIZE_TOGGLE_ICON_SIZE = 20;

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

/** Caption strip over a light mood tint band — dark theme keeps white-on-tint readability. */
function insightMemoryCaptionTextColor(
  colorScheme: "light" | "dark",
  sunnyText: string,
  cloudyFill: string,
  isMostlyCloudy: boolean,
): string {
  if (colorScheme === "light") {
    return isMostlyCloudy ? cloudyFill : sunnyText;
  }
  return "#FFFFFF";
}

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
    oldestMemTime: oldestMemTime === Infinity ? null : oldestMemTime,
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
  sphere3DEffect = false,
  cardWidth,
  cardHeight,
  isExpanded,
  onToggleSize,
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
  // career/relationships: hide interaction modes (0-2) — these are processing spheres, not active social ones
  // hobbies: hide mood modes (4-5) — cloudy/sunny framing doesn't fit activities
  const hiddenModes = useMemo(
    () =>
      sphere === "career" || sphere === "relationships"
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
  const insightLabelOpacity = useSharedValue(1);
  const insightPersonOpacity = useSharedValue(1);
  const insightLabelTranslateX = useSharedValue(0);
  const insightPersonTranslateX = useSharedValue(0);
  /** Kept at 0; separate SVs so worklets always bind (avoids stale HMR / cache refs to *TranslateY). */
  const insightLabelTranslateY = useSharedValue(0);
  const insightPersonTranslateY = useSharedValue(0);
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
      cancelAnimation(insightLabelOpacity);
      cancelAnimation(insightPersonOpacity);
      cancelAnimation(insightLabelTranslateX);
      cancelAnimation(insightPersonTranslateX);
      cancelAnimation(insightLabelTranslateY);
      cancelAnimation(insightPersonTranslateY);
      insightTitleTransitionLockRef.current = false;
      insightLabelOpacity.value = 1;
      insightPersonOpacity.value = 1;
      insightLabelTranslateX.value = 0;
      insightPersonTranslateX.value = 0;
      insightLabelTranslateY.value = 0;
      insightPersonTranslateY.value = 0;
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

  /** direction 1 = forward (auto / swipe left / chevron right): titles exit right, new ones enter from the left. -1 = reverse. */
  const runInsightTitleTransition = useCallback(
    (applyModeUpdate: () => void, direction: 1 | -1) => {
      if (!animationsEnabled) {
        applyModeUpdate();
        return;
      }
      if (insightTitleTransitionLockRef.current) return;
      insightTitleTransitionLockRef.current = true;
      const easeOut = Easing.in(Easing.cubic);
      const easeIn = Easing.out(Easing.cubic);
      const slide = INSIGHT_TITLE_SLIDE_X;
      const outX = direction === 1 ? slide : -slide;
      const inFromX = direction === 1 ? -slide : slide;

      const unlock = () => {
        insightTitleTransitionLockRef.current = false;
      };

      insightLabelOpacity.value = withTiming(
        0,
        { duration: INSIGHT_TITLE_OUT_MS, easing: easeOut },
        (finished) => {
          if (!finished) {
            runOnJS(unlock)();
            return;
          }
          runOnJS(applyModeUpdate)();
          insightLabelTranslateX.value = inFromX;
          insightPersonTranslateX.value = inFromX * 1.08;
          insightPersonOpacity.value = 0;
          insightLabelOpacity.value = 0;

          insightLabelOpacity.value = withTiming(1, {
            duration: INSIGHT_TITLE_IN_LABEL_MS,
            easing: easeIn,
          });
          insightLabelTranslateX.value = withTiming(0, {
            duration: INSIGHT_TITLE_IN_LABEL_MS,
            easing: easeIn,
          });
          insightPersonOpacity.value = withDelay(
            INSIGHT_TITLE_STAGGER_MS,
            withTiming(1, {
              duration: INSIGHT_TITLE_IN_PERSON_MS,
              easing: easeIn,
            }),
          );
          insightPersonTranslateX.value = withDelay(
            INSIGHT_TITLE_STAGGER_MS,
            withTiming(0, { duration: INSIGHT_TITLE_IN_PERSON_MS, easing: easeIn }, (done) => {
              if (done) runOnJS(unlock)();
            }),
          );
        },
      );
      insightPersonOpacity.value = withTiming(0, {
        duration: INSIGHT_TITLE_OUT_MS,
        easing: easeOut,
      });
      insightLabelTranslateX.value = withTiming(outX, {
        duration: INSIGHT_TITLE_OUT_MS,
        easing: easeOut,
      });
      insightPersonTranslateX.value = withTiming(outX, {
        duration: INSIGHT_TITLE_OUT_MS,
        easing: easeOut,
      });
    },
    [
      animationsEnabled,
      insightLabelOpacity,
      insightLabelTranslateX,
      insightPersonOpacity,
      insightPersonTranslateX,
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
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

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

  const insightLabelAnimStyle = useAnimatedStyle(() => ({
    opacity: insightLabelOpacity.value,
    transform: [
      { translateX: insightLabelTranslateX.value },
      { translateY: insightLabelTranslateY.value },
    ],
  }));
  const insightPersonAnimStyle = useAnimatedStyle(() => ({
    opacity: insightPersonOpacity.value,
    transform: [
      { translateX: insightPersonTranslateX.value },
      { translateY: insightPersonTranslateY.value },
    ],
  }));
  const insightCardBg =
    colorScheme === "dark" ? COSMIC_INNER_DARK[2] : COSMIC_INNER_LIGHT[2];
  const gradientColors =
    colorScheme === "dark" ? COSMIC_INNER_DARK : COSMIC_INNER_LIGHT;

  const totalW = cardWidth + INSIGHT_ARROW_HIT * 2;
  const wrapperStyle = {
    position: "absolute" as const,
    left: x - totalW / 2,
    top: y - cardHeight / 2,
    width: totalW,
    height: cardHeight,
    zIndex: 25,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  };

  // 6 modes: 0=least memories, 1=oldest memory, 2=most recent, 3=most memories, 4=most cloudy, 5=most sunny
  const entityIdx = [leastMemsIdx, oldestMemIdx, newestIdx, mostMemsIdx, mostCloudyIdx, mostSunnyIdx][mode] ?? 0;
  const entity = entities[entityIdx];
  const entityName = entity?.name ?? "";
  const showReminderBell = hasReminderSupport && (mode === 0 || mode === 1) && entity != null;

  // Urgency border: amber tint when oldest interaction > 30 days
  const isMoodCard = mode === 4 || mode === 5;
  const moodBorderColor = mode === 4 ? (momentColors.cloudy.background + "AA") : (momentColors.sunny.background + "AA");
  const borderColor =
    isUrgent && mode === 1
      ? "rgba(92, 55, 0, 0.45)"
      : isMoodCard
        ? moodBorderColor
        : shadowColor + "99";
  const shadowGlowColor = isMoodCard
    ? mode === 4
      ? momentColors.cloudy.background
      : momentColors.sunny.background
    : isUrgent && mode === 1
      ? INSIGHT_LIGHT_URGENCY_AFFORDANCE
      : shadowColor;

  const insightCardEmptyShadow = sphere3DEffect
    ? {
        shadowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 22,
        elevation: 12,
      }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colorScheme === "dark" ? 0.32 : 0.16,
        shadowRadius: 10,
        elevation: 6,
      };

  const insightCardMainOuterShadow = sphere3DEffect
    ? {
        shadowColor: shadowGlowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 24,
        elevation: 14,
      }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colorScheme === "dark" ? 0.35 : 0.2,
        shadowRadius: 10,
        elevation: 8,
      };

  // Human-readable time since interaction (must be before early return)
  const timeAgoLabel = useMemo(() => {
    const ts = mode === 1 ? oldestMemTime : newestTime;
    if (!ts || (mode !== 0 && mode !== 1 && mode !== 2)) return null;
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return t("sferaInsight.timeAgo.today");
    if (days < 31) return `${days}${t("sferaInsight.timeAgo.days")}`;
    const months = Math.floor(days / 30);
    return `${months}${t("sferaInsight.timeAgo.months")}`;
  }, [oldestMemTime, newestTime, mode, t]);

  // Label for top of card — some labels are sphere-specific
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
          new Date(a.createdAt) < new Date(b.createdAt) ? a : b,
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

  const openInsightTarget = useCallback(() => {
    // Plural / aggregate insights should open entity view.
    if (mode === 0 || mode === 3) {
      openEntity();
      return;
    }
    const memory = getModeMemory(mode, entityIdx);
    if (memory) {
      openMemory(memory);
      return;
    }
    openEntity();
  }, [mode, openEntity, getModeMemory, entityIdx, openMemory]);

  const toggleAutoLoopPause = useCallback(() => {
    setIsAutoLoopPaused((prev) => !prev);
  }, []);

  const memoryPreviewTapIdRef = useRef<string | null>(null);
  const onMemoryPreviewTap = useCallback(() => {
    const id = memoryPreviewTapIdRef.current;
    if (!id) return;
    const mems = memoriesPerEntity[entityIdx] ?? [];
    const memory = mems.find((m) => m.id === id);
    if (memory) openMemory(memory);
  }, [memoriesPerEntity, entityIdx, openMemory]);

  const memoryPreviewTapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(onMemoryPreviewTap)();
      }),
    [onMemoryPreviewTap],
  );

  const titleTapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(toggleAutoLoopPause)();
      }),
    [toggleAutoLoopPause],
  );

  const expandToggleGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(onToggleSize)();
      }),
    [onToggleSize],
  );

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
      .onEnd((e) => {
        const tx = e.translationX;
        const ty = e.translationY;
        if (
          Math.abs(tx) > INSIGHT_CARD_SWIPE_COMMIT_PX &&
          Math.abs(tx) > Math.abs(ty) * 1.5
        ) {
          if (tx < 0) {
            runOnJS(goPrevRef.current)();
          } else {
            runOnJS(goNextRef.current)();
          }
        }
      });

    const tap = Gesture.Tap()
      .maxDistance(INSIGHT_CARD_TAP_MAX_DISTANCE_PX)
      .onEnd(() => {
        runOnJS(openInsightTarget)();
      });

    return Gesture.Exclusive(pan, tap);
  }, [openInsightTarget]);

  const emptyEntityCardStyle = {
    flex: 1,
    minHeight: cardHeight,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: shadowColor + "99",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 14,
    ...insightCardEmptyShadow,
  };

  if (numEntities === 0) {
    const emptyEntitiesContent = (
      <>
        <ThemedText
          style={{
            color: insightInk,
            fontSize: 14,
            fontWeight: "600",
            textAlign: "center",
            paddingHorizontal: 12,
            fontStyle: "italic",
          }}
        >
          {t(sferaInsightEmptyEntitiesWarmKey(sphere))}
        </ThemedText>
        <SferaInsightEmptyGuideLink sphere={sphere} />
      </>
    );
    return (
      <View
        style={[wrapperStyle, { height: undefined, minHeight: cardHeight }]}
        pointerEvents="box-none"
      >
        <View style={{ width: INSIGHT_ARROW_HIT }} />
        {sphere3DEffect ? (
          <LinearGradient colors={[...gradientColors]} style={emptyEntityCardStyle}>
            {emptyEntitiesContent}
          </LinearGradient>
        ) : (
          <View style={{ ...emptyEntityCardStyle, backgroundColor: insightCardBg }}>
            {emptyEntitiesContent}
          </View>
        )}
        <View style={{ width: INSIGHT_ARROW_HIT }} />
      </View>
    );
  }

  if (totalMemoriesCount === 0) {
    const zeroMemOuter = {
      ...wrapperStyle,
      overflow: "visible" as const,
      minHeight: cardHeight + (showNeedMemoriesHintBelowCard ? 52 : 0),
      height: undefined as number | undefined,
    };
    const zeroMemCardStyle = {
      flex: 1,
      minHeight: cardHeight,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: shadowColor + "99",
      justifyContent: "center" as const,
      alignItems: "center" as const,
      padding: 14,
      ...insightCardEmptyShadow,
    };
    const zeroMemContent = (
      <>
        <Pressable onPress={() => onNeedMemoriesHintCenter?.()}>
          <ThemedText
            style={{
              color: insightInk,
              fontSize: 14,
              textAlign: "center",
              fontWeight: "600",
              fontStyle: "italic",
              paddingHorizontal: 12,
            }}
          >
            {t(sferaInsightNoMemoriesReflectionKey(sphere))}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={openEntity}
          style={{
            marginTop: 10,
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
            shadowColor: colorScheme === "dark"
              ? Colors.dark.primary
              : Colors.light.primary,
            shadowOffset: { width: 0, height: colorScheme === "dark" ? 0 : 3 },
            shadowOpacity: colorScheme === "dark" ? 0.5 : 0.18,
            shadowRadius: colorScheme === "dark" ? 8 : 10,
            elevation: 6,
          }}
        >
          <ThemedText
            style={{
              color: colorScheme === "dark"
                ? Colors.dark.primary
                : Colors.light.primary,
              fontSize: 11,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {t("sferaInsight.addFirstMemory")}
          </ThemedText>
        </Pressable>
      </>
    );
    return (
      <View style={zeroMemOuter} pointerEvents="box-none">
        <View style={{ flexDirection: "row", alignItems: "flex-start", width: "100%" }}>
          <View style={{ width: INSIGHT_ARROW_HIT }} />
          <View style={{ flex: 1 }}>
            {sphere3DEffect ? (
              <LinearGradient colors={[...gradientColors]} style={zeroMemCardStyle}>
                {zeroMemContent}
              </LinearGradient>
            ) : (
              <View style={{ ...zeroMemCardStyle, backgroundColor: insightCardBg }}>
                {zeroMemContent}
              </View>
            )}
          </View>
          <View style={{ width: INSIGHT_ARROW_HIT }} />
        </View>
        {showNeedMemoriesHintBelowCard && (
          <View
            style={{
              alignSelf: "center",
              marginTop: 8,
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
      </View>
    );
  }

  return (
    <View
      style={[
        wrapperStyle,
        showNeedMemoriesHintBelowCard && totalMemoriesCount > 0
          ? {
              overflow: "visible",
              minHeight: cardHeight + 52,
              height: undefined as number | undefined,
            }
          : null,
      ]}
      pointerEvents="box-none"
    >
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

      {/* Card — RNGH Exclusive(Pan,Tap): horizontal swipe changes mode; tap opens insight target */}
      <GestureDetector gesture={insightCardGesture}>
        <View
          style={{ flex: 1, height: cardHeight }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={entity ? `${cardLabel}: ${entityName}` : undefined}
          collapsable={false}
        >
        <View
          style={{
            flex: 1,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor,
            ...insightCardMainOuterShadow,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {sphere3DEffect ? (
            <LinearGradient
              colors={[...gradientColors]}
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFillObject, { backgroundColor: insightCardBg }]}
            />
          )}
          <View
            style={{
              flex: 1,
              zIndex: 1,
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 10,
              gap: 8,
            }}
          >
          {/* Countdown to next insight — fills left→right over SFERA_INSIGHT_AUTO_MS */}
          {numModes > 1 ? (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: shadowColor + "33",
                zIndex: 20,
              }}
              pointerEvents="none"
            >
              <Animated.View
                style={[{ height: 3, backgroundColor: shadowColor, alignSelf: "flex-start" }, progressBarStyle]}
              />
            </View>
          ) : null}

          {/* Top label — tap toggles auto-cycle pause; uses its own RNGH tap to
              intercept before the card-level gesture detector fires openInsightTarget */}
          <Animated.View style={insightLabelAnimStyle} accessibilityLiveRegion="polite">
            <GestureDetector gesture={titleTapGesture}>
              <View
                accessibilityRole="button"
                accessibilityLabel={`${cardLabel}. ${isAutoLoopPaused ? "Resume auto-swipe" : "Pause auto-swipe"}`}
                style={{ alignSelf: "center", paddingHorizontal: 4, paddingVertical: 2 }}
                collapsable={false}
              >
                <ThemedText style={{ color: insightInk, fontSize: 16, textAlign: "center", fontWeight: "700", letterSpacing: 0.2 }} numberOfLines={1}>
                  {cardLabel}
                </ThemedText>
              </View>
            </GestureDetector>
          </Animated.View>

          {/* Person block */}
          <Animated.View style={[insightPersonAnimStyle, { gap: 3 }]}>
            <ThemedText style={{ color: insightInk, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>
              {entityName}
            </ThemedText>
            {/* Meta row varies by mode */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {/* Mode 0/1/2: time-ago */}
              {(mode === 0 || mode === 1 || mode === 2) && timeAgoLabel ? (
                <ThemedText
                  style={{
                    color:
                      isUrgent && mode === 1 ? INSIGHT_LIGHT_URGENCY_AFFORDANCE : insightInkMuted,
                    fontSize: 10,
                  }}
                >
                  {timeAgoLabel}
                </ThemedText>
              ) : null}
              {/* Mode 3: most memory count */}
              {mode === 3 ? (
                <ThemedText style={{ color: insightInkMuted, fontSize: 10 }}>
                  {(memoriesPerEntity[entityIdx]?.length ?? 0)} {t("sferaInsight.memories")}
                </ThemedText>
              ) : null}
              {/* Mode 4/5: mood counts */}
              {mode === 4 ? (() => {
                const mems = memoriesPerEntity[entityIdx] ?? [];
                const count = mems.reduce((s, m) => s + (m.hardTruths?.length ?? 0), 0);
                const label =
                  count === 1
                    ? t("sferaInsight.cloudyMomentsOne")
                    : t("sferaInsight.cloudyMomentsMany", { count });
                return <ThemedText style={{ color: insightCloudyMeta, fontSize: 10 }}>{label}</ThemedText>;
              })() : null}
              {mode === 5 ? (() => {
                const mems = memoriesPerEntity[entityIdx] ?? [];
                const count = mems.reduce((s, m) => s + (m.goodFacts?.length ?? 0), 0);
                const label =
                  count === 1
                    ? t("sferaInsight.sunnyMomentsOne")
                    : t("sferaInsight.sunnyMomentsMany", { count });
                return <ThemedText style={{ color: insightSunnyMeta, fontSize: 10 }}>{label}</ThemedText>;
              })() : null}
              {/* Bell for modes 0/1 */}
              {showReminderBell && timeAgoLabel ? (
                <ThemedText style={{ color: insightInkMuted, fontSize: 10 }}>·</ThemedText>
              ) : null}
              {showReminderBell && (
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

          {/* Modes 0/1: show memory preview, or add-memories CTA */}
          {(mode === 0 || mode === 1) && (() => {
            const mem = mode === 1
              ? getModeMemory(1, entityIdx)
              : getModeMemory(2, entityIdx);
            if (mem) {
              const moodSunny = mem.goodFacts?.length ?? 0;
              const moodCloudy = mem.hardTruths?.length ?? 0;
              const moodColor = moodSunny >= moodCloudy ? momentColors.sunny.background : momentColors.cloudy.background;
              const stripCaptionColor = insightMemoryCaptionTextColor(
                colorScheme,
                momentColors.sunny.text,
                momentColors.cloudy.background,
                moodCloudy > moodSunny,
              );
              const titleText = mem.title?.trim() || t("sferaInsight.noMemories");
              const body = (
                <View style={{ flex: 1, alignSelf: "stretch", borderRadius: 10, overflow: "hidden", backgroundColor: mem.imageUri ? undefined : shadowColor + "18" }}>
                  {mem.imageUri ? (
                    <>
                      <Image source={{ uri: mem.imageUri }} style={{ width: "100%", flex: 1 }} contentFit="cover" />
                      <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: moodColor + "22" }}>
                        <ThemedText style={{ color: stripCaptionColor, fontSize: 10 }} numberOfLines={1}>
                          {titleText}
                        </ThemedText>
                      </View>
                    </>
                  ) : (
                    <View style={{ flex: 1, padding: 10, justifyContent: "center" }}>
                      <ThemedText style={{ color: insightInk, fontSize: 12, fontWeight: "600" }} numberOfLines={2}>
                        {titleText}
                      </ThemedText>
                      {mem.description ? (
                        <ThemedText style={{ color: insightInkMuted, fontSize: 10, marginTop: 6 }} numberOfLines={6}>
                          {mem.description}
                        </ThemedText>
                      ) : null}
                    </View>
                  )}
                </View>
              );
              memoryPreviewTapIdRef.current = mem.id;
              return (
                <GestureDetector gesture={memoryPreviewTapGesture}>
                  <View
                    accessibilityRole="button"
                    accessibilityLabel={titleText}
                    style={{ flex: 1, alignSelf: "stretch", minHeight: 0 }}
                    collapsable={false}
                  >
                    {body}
                  </View>
                </GestureDetector>
              );
            }
            // Entity truly has no memories — show reflection prompt
            const promptKey = sferaInsightReflectionPromptKey(sphere, modeIdx);
            const promptText = t(promptKey as any).replace("{name}", entityName);
            return (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  openEntity();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${entityName}: ${promptText}`}
                style={{
                  flex: 1,
                  alignSelf: "stretch",
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: shadowColor + "44",
                  borderStyle: "dashed",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  gap: 10,
                }}
              >
                <ThemedText
                  style={{
                    color: insightInkMuted,
                    fontSize: 13,
                    textAlign: "center",
                    fontStyle: "italic",
                    lineHeight: 19,
                  }}
                >
                  {promptText}
                </ThemedText>
                <View
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
                    shadowColor: colorScheme === "dark"
                      ? Colors.dark.primary
                      : Colors.light.primary,
                    shadowOffset: { width: 0, height: colorScheme === "dark" ? 0 : 3 },
                    shadowOpacity: colorScheme === "dark" ? 0.5 : 0.18,
                    shadowRadius: colorScheme === "dark" ? 8 : 10,
                    elevation: 6,
                  }}
                >
                  <ThemedText
                    style={{
                      color: colorScheme === "dark"
                        ? Colors.dark.primary
                        : Colors.light.primary,
                      fontSize: 11,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {t("sferaInsight.addFirstMemory")}
                  </ThemedText>
                </View>
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

          {/* Modes 2/4/5: memory preview — image when available, otherwise title + description */}
          {(mode === 2 || mode === 4 || mode === 5) && (() => {
            const mem = getModeMemory(mode, entityIdx);
            if (!mem) return null;
            const moodSunny = mem.goodFacts?.length ?? 0;
            const moodCloudy = mem.hardTruths?.length ?? 0;
            const moodColor = moodSunny >= moodCloudy ? momentColors.sunny.background : momentColors.cloudy.background;
            const memoryStripCaption = insightMemoryCaptionTextColor(
              colorScheme,
              momentColors.sunny.text,
              momentColors.cloudy.background,
              moodCloudy > moodSunny,
            );
            const titleText =
              mem.title?.trim() ||
              (mode === 4 ? mem.hardTruths?.[0]?.text : undefined) ||
              (mode === 5 ? mem.goodFacts?.[0]?.text : undefined) ||
              t("sferaInsight.noMemories");
            memoryPreviewTapIdRef.current = mem.id;
            return (
              <GestureDetector gesture={memoryPreviewTapGesture}>
                <View
                  accessibilityRole="button"
                  accessibilityLabel={titleText}
                  style={{ flex: 1, alignSelf: "stretch", minHeight: 72 }}
                  collapsable={false}
                >
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      overflow: "hidden",
                      backgroundColor: shadowColor + "18",
                    }}
                  >
                    {mem.imageUri ? (
                      <>
                        <Image source={{ uri: mem.imageUri }} style={{ width: "100%", flex: 1, minHeight: 72 }} contentFit="cover" />
                        <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: moodColor + "22" }}>
                          <ThemedText style={{ color: memoryStripCaption, fontSize: 10 }} numberOfLines={1}>
                            {mem.title?.trim() || titleText}
                          </ThemedText>
                        </View>
                      </>
                    ) : (
                      <View style={{ flex: 1, padding: 10, justifyContent: "center" }}>
                        <ThemedText style={{ color: insightInk, fontSize: 12, fontWeight: "600" }} numberOfLines={2}>
                          {titleText}
                        </ThemedText>
                        {mem.description ? (
                          <ThemedText style={{ color: insightInkMuted, fontSize: 10, marginTop: 6 }} numberOfLines={6}>
                            {mem.description}
                          </ThemedText>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              </GestureDetector>
            );
          })()}

          {/* Footer — nested RNGH taps so card-level openInsightTarget does not fire */}
          <View style={{ zIndex: 10, alignItems: "center", gap: 2 }}>
          <View style={{ flexDirection: "row", gap: 5 }} accessibilityRole="tablist">
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
                  backgroundColor:
                    i === modeIdx
                      ? shadowColor
                      : colorScheme === "dark"
                        ? "rgba(232, 244, 246, 0.45)"
                        : "rgba(18, 18, 18, 0.38)",
                }}
              />
            ))}
          </View>
          <GestureDetector gesture={expandToggleGesture}>
            <View
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? "Shrink card" : "Expand card"}
              style={{ padding: 4 }}
              collapsable={false}
            >
              <MaterialIcons
                name={isExpanded ? "unfold-less" : "unfold-more"}
                size={INSIGHT_SIZE_TOGGLE_ICON_SIZE}
                color={shadowColor + "CC"}
              />
            </View>
          </GestureDetector>
          </View>
          </View>
        </View>
        </View>
      </GestureDetector>

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

      {showNeedMemoriesHintBelowCard && totalMemoriesCount > 0 ? (
        <View
          style={{
            position: "absolute",
            left: (totalW - NEED_MEMORIES_HINT_WIDTH) / 2,
            top: cardHeight + 6,
            width: NEED_MEMORIES_HINT_WIDTH,
            zIndex: 40,
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
