import { AIModal } from "@/components/ai-modal";
import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors, fabAccentBackground } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useSferaEventsBadge } from "@/utils/SferaEventsBadgeProvider";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import {
  getPendingAIResponse,
  type PendingAIResponse,
} from "@/utils/ai-background-processor";
import {
  cancelEventMemoryReminders,
  scheduleEventMemoryReminders,
} from "@/utils/event-memory-reminders";
import { onEventsTabPress } from "@/utils/events-tab-press";
import { useTranslate } from "@/utils/languages/use-translate";
import { showPaywallForAnySubscriptionAccess } from "@/utils/premium-access";
import { updateEventStatus } from "@/utils/sfera-event-attendance";
import {
  addAttendedEventSnapshot,
  addAttendingEventId,
  addUnlockedVipCode,
  clearEventReminderInAppForEvent,
  clearLocationDeclinedByUser,
  getAttendingEventIds,
  getEventGoldenMemoryUsedIds,
  getEventImageUrls,
  getLocationPermissionStatus,
  getPastAttendedEvents,
  getSeatsLeft,
  getSeenEventIds,
  getUnlockedVipCodes,
  isEventFilled,
  isLocationDeclinedByUser,
  isPlusSectionUnlocked,
  isPrivateSectionUnlocked,
  removeAttendedEventSnapshotsByIds,
  removeAttendingEventId,
  removeEventGoldenMemoryUsedIds,
  removeEventReminderScheduledIds,
  requestLocationPermission,
  scheduleEventRemindersOnJoin,
  setLocationDeclinedByUser,
  syncAttendedSnapshotsFromActiveEvents,
  validateCodeForSection,
  type SferaEvent,
  type SferaEventType,
} from "@/utils/sfera-events";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import type { SharedValue as ReanimatedSharedValue } from "react-native-reanimated";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle as SvgCircle,
} from "react-native-svg";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT * 0.38;
const IS_IPAD = Platform.OS === "ios" && Platform.isPad;
const ORB_RADIUS = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.28;
const ORB_SIZE = 140;
const FOCUSED_ORB_SIZE = Math.round(170 / 1.4 * 0.8); // Reduced by 20% for less visual prominence, sized to fit event count text
const EVENT_ORBIT_RADIUS =
  Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * (IS_IPAD ? 0.26 : 0.36);
const EVENT_BELOW_ORB_GAP = 16;
const FOCUSED_EVENT_SIZE = 220;
/**
 * Upper bound for the focused details stack (title, date, actions) when animating to unfocused:
 * we drive `maxHeight` with swipe p (not opacity). Slightly over typical content to avoid clipping
 * before p === 1 on the incoming hero.
 */
const ORBIT_FOCUSED_DETAILS_MAX_HEIGHT = 168;
const ORBIT_FOCUSED_LOCK_BADGE_MAX_HEIGHT = 32;
/**
 * Extra horizontal offset for the two ring neighbors (minD===1). Large values push them away from
 * the hero **and** from each other together; prefer `FOCUSED_NEIGHBOR_ANGLE_CLEARANCE` to open space
 * *between* the pair on the arc while keeping this moderate so they stay nearer the hero.
 */
const FOCUSED_EVENT_SIDE_CLEARANCE = 40;
/**
 * Neighbors of focus: rotate along the ring (rad). Primary lever for “don’t stick together” without
 * shoving the pair as far from the hero as raw side clearance does.
 * (Too large can trip `sideAfter !== sideBefore` in `eventOrbitNeighborSplayedTrig`.)
 */
const FOCUSED_NEIGHBOR_ANGLE_CLEARANCE = 0.5;
const FOCUSED_NEIGHBOR_RADIAL_SCALE = 1.2;
/**
 * Ring neighbors (minD===1) beside the hero: subtract from yOffsetBelow so they sit higher,
 * left & right ~above the focus card instead of hidden under its corners.
 */
const FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_RIGHT = 102;
const FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_LEFT = 94;
/**
 * Pushes the ring card that would sit in the “back” (bottom) slot further from the big focus so it
 * does not stay 2D-under the hero; paired with a lateral nudge in `applyEventOrbitBackSlotNudge`.
 */
const FOCUSED_BACK_ORBIT_CLEARANCE = 92;
const SMALL_EVENT_SIZE = 100;
/** Non-focused cards above the orb (top half of orbit) */
const SMALL_EVENT_SIZE_ABOVE = Math.round(SMALL_EVENT_SIZE * 0.68);
/** Non-focused card above and to the right – even smaller (further “into” the arc) */
const SMALL_EVENT_SIZE_ABOVE_RIGHT = Math.round(SMALL_EVENT_SIZE * 0.54);
/**
 * Unfocused width scale at orbit back/top: `1 - backDepth * this` (backDepth 0 at bottom of ring → 1 at top).
 * Larger ⇒ smaller cards above the hub / deeper in the ellipse.
 */
const EVENT_ORBIT_BACK_DEPTH_SHRINK = 0.34;
/**
 * Extra shrink from shortest ring distance to focus (minD). Back/top of orbit uses `BACK_DEPTH_SHRINK`;
 * this covers the lower “front” arc where sinA was not reducing size before.
 */
const EVENT_ORBIT_RING_DISTANCE_SHRINK = 0.36;
const EVENT_ORBIT_RING_DISTANCE_MIN_SCALE = 0.52;
/** minD≥2: gentler radius swing than 0.8+0.2 so cards sit on one near-circular path. */
const EVENT_ORBIT_RING_RADIUS_MIN = 0.88;
const EVENT_ORBIT_RING_RADIUS_RANGE = 0.12;
/** Vertical scale on sin term for minD≥2 (ellipse, <1 tightens the orbit around the hub). */
const EVENT_ORBIT_RING_Y_SCALE = 0.9;
const FOCUSED_EVENT_BOTTOM_Y =
  CENTER_Y + FOCUSED_ORB_SIZE / 2 + EVENT_BELOW_ORB_GAP + FOCUSED_EVENT_SIZE;
const CHEVRON_HEIGHT = 56;
const CHEVRON_TOP =
  FOCUSED_EVENT_BOTTOM_Y - FOCUSED_EVENT_SIZE / 2 - CHEVRON_HEIGHT / 2;

const ORB_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]; // 0°, 120°, 240°

const COMMUNITY_TYPES: SferaEventType[] = ["social", "private", "plus"];

type SharedNum = ReanimatedSharedValue<number>;

/** 3D sphere gradient for Sfera Community orbs (highlight top-left, shadow bottom-right). */
function getCommunity3DColors(
  type: SferaEventType,
  colorScheme: "light" | "dark",
): { highlight: string; base: string; shadow: string } {
  if (colorScheme === "light") {
    const bases = {
      social: "rgb(150,200,255)",
      private: "rgb(180,150,220)",
      plus: "rgb(255,200,100)",
    };
    const b = bases[type];
    const lighter = (s: string) => {
      const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return s;
      return `rgb(${Math.min(255, parseInt(m[1], 10) + 55)},${Math.min(255, parseInt(m[2], 10) + 55)},${Math.min(255, parseInt(m[3], 10) + 55)})`;
    };
    const darker = (s: string) => {
      const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return s;
      return `rgb(${Math.max(0, parseInt(m[1], 10) - 30)},${Math.max(0, parseInt(m[2], 10) - 30)},${Math.max(0, parseInt(m[3], 10) - 30)})`;
    };
    return { highlight: lighter(b), base: b, shadow: darker(b) };
  }
  const bases = {
    social: "rgba(140,190,245,0.55)",
    private: "rgba(160,120,230,0.55)",
    plus: "rgba(255,180,80,0.55)",
  };
  const b = bases[type];
  const lighter = (s: string) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return s;
    return `rgba(${Math.min(255, parseInt(m[1], 10) + 50)},${Math.min(255, parseInt(m[2], 10) + 50)},${Math.min(255, parseInt(m[3], 10) + 50)},${m[4] ?? "1"})`;
  };
  const darker = (s: string) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return s;
    return `rgba(${Math.max(0, parseInt(m[1], 10) - 45)},${Math.max(0, parseInt(m[2], 10) - 45)},${Math.max(0, parseInt(m[3], 10) - 45)},${m[4] ?? "1"})`;
  };
  return { highlight: lighter(b), base: b, shadow: darker(b) };
}

function getCommunityShadowColor(
  type: SferaEventType,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") return "#000";
  const colors = { social: "#96CAFF", private: "#B39DDB", plus: "#FFB74D" };
  return colors[type];
}

/**
 * Icon color for each Sfera Community orb. WCAG 2.1 AA: at least 3:1 contrast
 * against the orb gradient (worst case: highlight). Uses dark tones on light pastels.
 */
function getCommunityIconColor(
  type: SferaEventType,
  colorScheme: "light" | "dark",
): string {
  // Both modes: dark icons on light/pastel gradient backgrounds for WCAG 2.1 AA compliance
  // Dark mode orbs are semi-transparent pastels, so dark text provides best contrast
  const dark = {
    social: "#0D47A1",   // Deep blue - 7.03:1 (dark) / 4.93:1 (light) ✓
    private: "#4A148C",  // Deep purple - 6.18:1 (dark) / 4.71:1 (light) ✓
    plus: "#BF360C"      // Darker orange - 3.82:1 (dark) / 3.05:1 (light) ✓
  };
  return dark[type];
}

/**
 * Text color for orb labels. WCAG 2.1 AA: at least 4.5:1 contrast against orb gradient.
 * Dark text is required on light/pastel backgrounds for accessibility compliance.
 */
function getCommunityTextColor(
  type: SferaEventType,
  colorScheme: "light" | "dark",
): string {
  // Both modes: dark text on light/pastel orb backgrounds
  // Dark mode orbs use semi-transparent light pastels, requiring dark text for contrast
  return "#11181C"; // Dark text meets WCAG 2.1 AA on all pastel gradient backgrounds
}

// Sparkled dots (scattered around the center, same pattern as Spheres tab)
const SparkledDots = React.memo(function SparkledDots({
  centerX,
  centerY,
  avatarSize,
  colorScheme,
  sunnyBackground,
}: {
  centerX: number;
  centerY: number;
  avatarSize: number;
  colorScheme: "light" | "dark";
  sunnyBackground: string;
}) {
  const { isTablet } = useLargeDevice();
  const dots = React.useMemo(() => {
    const numDots = isTablet ? 80 : 60;
    const padding = 20;
    return Array.from({ length: numDots }, (_, i) => {
      let x: number, y: number;
      if (i < numDots * 0.4) {
        const minRadius = avatarSize / 2 + 20;
        const maxRadius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35;
        const angle = Math.random() * 2 * Math.PI;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      } else {
        x = padding + Math.random() * (SCREEN_WIDTH - padding * 2);
        y = padding + Math.random() * (SCREEN_HEIGHT - padding * 2);
      }
      x = Math.max(padding, Math.min(SCREEN_WIDTH - padding, x));
      y = Math.max(padding, Math.min(SCREEN_HEIGHT - padding, y));
      const size = 2 + Math.random() * 2;
      const delay = Math.random() * 2000;
      const duration = 2500 + Math.random() * 1500;
      return { x, y, size, delay, duration, id: i };
    });
  }, [avatarSize, centerX, centerY, isTablet]);
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
  React.useEffect(() => {
    const settleDuration = Math.max(600, Math.min(duration, 1800));

    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(0.55, {
        duration: settleDuration,
        easing: Easing.out(Easing.ease),
      }),
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
        },
        animatedStyle,
      ]}
    />
  );
});

const FloatingOrb = React.memo(function FloatingOrb({
  index,
  baseAngle,
  type,
  isLocked,
  label,
  orbitAngle,
  orbExitProgress,
  selectedOrbIndex,
  hideCenteredOrb,
  phase,
  onPress,
  colorScheme,
  colors,
  hasUnseenEvents = false,
  hasNoEvents = false,
  noUpcomingEventsLabel = "No upcoming events",
}: {
  index: number;
  baseAngle: number;
  type: "social" | "private" | "plus";
  isLocked: boolean;
  label: string;
  orbitAngle: SharedNum;
  orbExitProgress: SharedNum;
  selectedOrbIndex: SharedNum;
  hideCenteredOrb: SharedNum;
  phase: string;
  onPress: () => void;
  colorScheme: "light" | "dark";
  colors: Record<string, string>;
  hasUnseenEvents?: boolean;
  hasNoEvents?: boolean;
  noUpcomingEventsLabel?: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const angle = baseAngle + orbitAngle.value;
    const x = CENTER_X + Math.cos(angle) * ORB_RADIUS - ORB_SIZE / 2;
    const y = CENTER_Y + Math.sin(angle) * ORB_RADIUS - ORB_SIZE / 2;
    const exit = orbExitProgress.value;
    const selected = selectedOrbIndex.value;
    const hide = hideCenteredOrb.value;
    let scale = 1;
    let left = x;
    let top = y;
    let opacity = 1;
    if (exit > 0 && selected >= 0) {
      if (index !== selected) {
        const dirX =
          (x + ORB_SIZE / 2 - CENTER_X) / Math.max(1, Math.abs(x - CENTER_X));
        const dirY =
          (y + ORB_SIZE / 2 - CENTER_Y) / Math.max(1, Math.abs(y - CENTER_Y));
        left = x + dirX * SCREEN_WIDTH * exit;
        top = y + dirY * SCREEN_HEIGHT * exit;
        scale = 1 - exit;
        opacity = 1 - exit;
      } else {
        left = x + (CENTER_X - ORB_SIZE / 2 - x) * exit;
        top = y + (CENTER_Y - ORB_SIZE / 2 - y) * exit;
        scale = 1 + (FOCUSED_ORB_SIZE / ORB_SIZE - 1) * exit;
        opacity = 1 - hide;
      }
    }
    return {
      position: "absolute",
      left,
      top,
      width: ORB_SIZE,
      height: ORB_SIZE,
      opacity,
      transform: [{ scale }],
    };
  });
  const gradient3D = getCommunity3DColors(type, colorScheme);
  const shadowColor = getCommunityShadowColor(type, colorScheme);
  const iconSize = 36;

  return (
    <Animated.View
      style={animatedStyle}
      pointerEvents={phase === "orbs" ? "auto" : "none"}
    >
      <Pressable
        onPress={hasNoEvents ? undefined : onPress}
        disabled={hasNoEvents}
        style={({ pressed }) => [
          styles.orbWrap,
          pressed && !hasNoEvents && styles.orbPressed,
          hasNoEvents && styles.orbDisabled,
        ]}
      >
        <View
          style={[
            styles.orb3D,
            {
              width: ORB_SIZE,
              height: ORB_SIZE,
              borderRadius: ORB_SIZE / 2,
              shadowColor: colorScheme === "dark" ? shadowColor : "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: colorScheme === "dark" ? 0.5 : 0.25,
              shadowRadius: 12,
              elevation: 10,
            },
          ]}
        >
          <Svg
            width={ORB_SIZE}
            height={ORB_SIZE}
            viewBox="0 0 100 100"
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <RadialGradient
                id={`community-orb-${type}-${index}`}
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
              fill={`url(#community-orb-${type}-${index})`}
            />
          </Svg>
          <View style={styles.orbSpecular} />
          <View style={styles.orbContent}>
            <MaterialIcons
              name={type === "private" ? "lock" : "public"}
              size={iconSize}
              color={getCommunityIconColor(type, colorScheme)}
            />
            <ThemedText
              size="xs"
              weight="medium"
              numberOfLines={hasNoEvents ? 2 : 1}
              style={[
                styles.orbLabel,
                { color: getCommunityTextColor(type, colorScheme) },
              ]}
            >
              {hasNoEvents ? noUpcomingEventsLabel : label}
            </ThemedText>
          </View>
          {isLocked && (
            <View style={styles.orbLockBadge}>
              <MaterialIcons name="lock" size={12} color="#fff" />
            </View>
          )}
          {hasUnseenEvents && !isLocked && (
            <View style={styles.orbUnseenBadge}>
              <ThemedText
                size="xxs"
                weight="bold"
                style={styles.orbUnseenText}
                numberOfLines={1}
              >
                NEW
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

/** Centered Sfera Community orb shown when a community is selected; tap to go back to all orbs. Pulses every 5s. */
const CenterOrbPlaceholder = React.memo(function CenterOrbPlaceholder({
  type,
  label,
  onPress,
  onPulseStart,
  onPulseEnd,
  colorScheme,
  colors,
  hasUnseenEvents = false,
  eventCount = 0,
}: {
  type: SferaEventType;
  label: string;
  onPress: () => void;
  onPulseStart: () => void;
  onPulseEnd: () => void;
  colorScheme: "light" | "dark";
  colors: Record<string, string>;
  hasUnseenEvents?: boolean;
  eventCount?: number;
}) {
  const gradient3D = getCommunity3DColors(type, colorScheme);
  const shadowColor = getCommunityShadowColor(type, colorScheme);
  const iconSize = 44;
  const centerOrbScale = useSharedValue(1);

  useEffect(() => {
    centerOrbScale.value = withRepeat(
      withDelay(
        5000,
        withSequence(
          withTiming(1, { duration: 0 }, (finished) => {
            if (finished) runOnJS(onPulseStart)();
          }),
          withTiming(1.06, {
            duration: 700,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(
            1,
            { duration: 700, easing: Easing.inOut(Easing.ease) },
            (finished) => {
              if (finished) runOnJS(onPulseEnd)();
            },
          ),
        ),
      ),
      -1,
    );
  }, [centerOrbScale, onPulseStart, onPulseEnd]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerOrbScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.centerOrbPlaceholder,
        {
          left: CENTER_X - FOCUSED_ORB_SIZE / 2,
          top: CENTER_Y - FOCUSED_ORB_SIZE / 2,
          width: FOCUSED_ORB_SIZE,
          height: FOCUSED_ORB_SIZE,
          borderRadius: FOCUSED_ORB_SIZE / 2,
          shadowColor: colorScheme === "dark" ? shadowColor : "#000",
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.orb3D,
            {
              width: FOCUSED_ORB_SIZE,
              height: FOCUSED_ORB_SIZE,
              borderRadius: FOCUSED_ORB_SIZE / 2,
              shadowColor: colorScheme === "dark" ? shadowColor : "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: colorScheme === "dark" ? 0.25 : 0.15,
              shadowRadius: 8,
              elevation: 5,
              opacity: 0.7, // Reduced visual prominence
            },
          ]}
        >
          <Svg
            width={FOCUSED_ORB_SIZE}
            height={FOCUSED_ORB_SIZE}
            viewBox="0 0 100 100"
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <RadialGradient
                id={`center-orb-${type}`}
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
              fill={`url(#center-orb-${type})`}
            />
          </Svg>
          <View
            style={[
              styles.orbSpecular,
              {
                left: FOCUSED_ORB_SIZE * 0.18,
                top: FOCUSED_ORB_SIZE * 0.18,
                width: FOCUSED_ORB_SIZE * 0.28,
                height: FOCUSED_ORB_SIZE * 0.28,
              },
            ]}
          />
          <View style={styles.orbContent}>
            <MaterialIcons
              name={type === "private" ? "lock" : "public"}
              size={iconSize}
              color={getCommunityIconColor(type, colorScheme)}
            />
            {eventCount > 0 && (
              <ThemedText
                size="sm"
                weight="bold"
                numberOfLines={1}
                style={[
                  styles.orbEventCount,
                  {
                    color: getCommunityTextColor(type, colorScheme),
                  },
                ]}
              >
                {eventCount} new {eventCount === 1 ? 'event' : 'events'}
              </ThemedText>
            )}
          </View>
          {hasUnseenEvents && <View style={styles.centerOrbUnseenDot} />}
        </View>
      </Pressable>
    </Animated.View>
  );
});

/**
 * Orbit angle + `orbitFocusSwipeProgress` share this timing. Ease-out (not in-out) so the **outgoing**
 * focused event card moves off the bottom immediately — in-out had near-zero velocity at t=0 and read
 * as a pause, then a second motion (Events tab only; Sfera home orbits are separate).
 */
const EVENT_ORBIT_DURATION = 1100;
const EVENT_ORBIT_EASING = Easing.bezier(0.33, 0, 0.2, 1);
/**
 * When focus swipe p passes this, blend incoming z toward the final hero layer. Too late (0.88) left
 * the growing incoming card under the outgoing (z~24 vs z~42) while they overlapped — looked “missing”.
 */
const EVENT_ORBIT_Z_CROSS_START = 0.78;
/** Stop forcing outgoing-on-top after this p so the settled hero can win the last frames. */
const EVENT_ORBIT_Z_OUT_FORCE_UNTIL_P = 0.98;
/**
 * pIn = max(0, 2p - 1). Only after this do we stack incoming **above** outgoing. Until then we force
 * outgoing ≥ incoming+1 so there is **no gap** where blended z puts the old card under the new one.
 */
const EVENT_ORBIT_Z_IN_OVER_AFTER_PIN = 0.88;

/** Dev: Metro logs for orbit focus swipe (angle vs progress, ~10% buckets). */
function eventsOrbitLogSwipe(
  label: string,
  payload: Record<string, string | number | boolean | null | undefined>,
) {
  if (!__DEV__) return;
  console.log(`[EventsOrbit SWIPE] ${label}`, payload);
}

function eventsOrbitLogSwipeTrack(payload: {
  approxPct: number;
  pAngle: number;
  pOrbitProgressSV: number;
  angle: number;
  a0: number;
  a1: number;
  from: number;
  to: number;
}) {
  if (!__DEV__) return;
  console.log("[EventsOrbit SWIPE] track", payload);
}

function eventsOrbitLogSwipeTrackEnd() {
  if (!__DEV__) return;
  console.log(
    "[EventsOrbit SWIPE] track:end (orbit idle: fromIdx === toIdx on shared values)",
  );
}

function eventsOrbitLogSwipeWorkletComplete(payload: {
  idx: number;
  aSettled: number;
  angleTarget: number;
  stepRad: number;
}) {
  if (!__DEV__) return;
  console.log("[EventsOrbit SWIPE] worklet:withTiming(finished)", {
    ...payload,
    absDiffSettledVsTarget: Math.abs(payload.aSettled - payload.angleTarget),
  });
}

/** Dev: worklet-size/position for outgoing/incoming cards (~10% buckets) to spot layout vs chrome jumps. */
function eventsOrbitLogSwipeLayout(payload: {
  role: "out" | "in";
  eventIndex: number;
  p: number;
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  zIndex: number;
}) {
  if (!__DEV__) return;
  console.log("[EventsOrbit SWIPE] layout", payload);
}

/** Left/right chevron with tiny pulse and color feedback on press */
const ChevronNavButton = React.memo(function ChevronNavButton({
  direction,
  onPress,
  colors,
  style,
}: {
  direction: "left" | "right";
  onPress: () => void;
  colors: Record<string, string>;
  style: ViewStyle | ViewStyle[];
}) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const iconColor = pressed ? colors.primaryLight : colors.primary;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    setPressed(true);
    scale.value = withTiming(0.96, { duration: 50 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
    scale.value = withTiming(1, { duration: 80 });
  }, [scale]);

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { alignItems: "center", justifyContent: "center" },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <MaterialIcons
          name={direction === "left" ? "chevron-left" : "chevron-right"}
          size={36}
          color={iconColor}
        />
      </Pressable>
    </Animated.View>
  );
});

/** Helper function to format event dates into user-friendly strings */
function formatEventDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

/**
 * Unfocused ring layout for event index `i` at a **fixed** orbit phase `orbitA` (not live-animated).
 * Used during focus swipe so the outgoing/incoming card lerps in screen space to a stable endpoint.
 */
type EventOrbitLayoutScaled = {
  focused: number;
  small: number;
  smallAbove: number;
  smallAboveRight: number;
  orbitRadius: number;
  yOffsetAboveRight: number;
  yOffsetAbove: number;
  yOffsetBelow: number;
  focusNeighborSideGap: number;
  focusBackOrbitClearance: number;
};

/**
 * The “inBackSlot” index otherwise lands under the large focus (same x band). Nudge it up and, if
 * still overlapping the hero’s width, shove it sideways so it reads beside the focus in one step.
 * Declared **above** `eventUnfLayoutAtOrbit` so the Reanimated worklet plugin resolves the call
 * (calling a worklet defined later in the file can crash on swipe).
 */
function applyEventOrbitBackSlotNudge(
  xS: number,
  yS: number,
  wS: number,
  s: EventOrbitLayoutScaled,
  focusBlend: number,
) {
  "worklet";
  let nx = xS;
  let ny = yS;
  ny -= s.focusBackOrbitClearance * (1 - focusBlend);
  const cardCx = nx + wS / 2;
  const focusHalfW = s.focused * 0.5;
  const selfHalfW = wS * 0.5;
  const pad = 4 + 4 * (s.focused / FOCUSED_EVENT_SIZE);
  if (
    cardCx + selfHalfW > CENTER_X - focusHalfW - pad &&
    cardCx - selfHalfW < CENTER_X + focusHalfW + pad
  ) {
    const push = s.focused * 0.46;
    nx += cardCx < CENTER_X ? -push : push;
  }
  return { xS: nx, yS: ny };
}

/**
 * Neighbor “splay” along the ring: `FOCUSED_NEIGHBOR_ANGLE_CLEARANCE` spreads cards from the hero.
 * While `eventOrbitAngle` animates, a slot can sit almost under the hero (|cos| tiny); adding the
 * full clearance then rotates it past the vertical and dumps it on the **wrong** side (e.g. right
 * neighbor jumps to the left, behind the big card). Skip or drop splay when that would happen.
 */
function eventOrbitNeighborSplayedTrig(
  angle: number,
  sinA: number,
  cosA: number,
): { posSin: number; posCos: number } {
  "worklet";
  if (Math.abs(cosA) < 0.28) {
    return { posSin: sinA, posCos: cosA };
  }
  const sideBefore = cosA >= 0 ? 1 : -1;
  const angP = angle + sideBefore * FOCUSED_NEIGHBOR_ANGLE_CLEARANCE;
  const cP = Math.cos(angP);
  const sP = Math.sin(angP);
  const sideAfter = cP >= 0 ? 1 : -1;
  if (sideAfter !== sideBefore) {
    return { posSin: sinA, posCos: cosA };
  }
  return { posSin: sP, posCos: cP };
}

function eventOrbitRingDistanceWidthScale(
  wS: number,
  n: number,
  minD: number,
): number {
  "worklet";
  if (n <= 1) return wS;
  const maxRing = Math.floor(n / 2);
  if (maxRing < 1 || minD < 1) return wS;
  const distT = Math.min(1, minD / maxRing);
  const ringScale = 1 - EVENT_ORBIT_RING_DISTANCE_SHRINK * distT;
  return wS * Math.max(EVENT_ORBIT_RING_DISTANCE_MIN_SCALE, ringScale);
}

function eventUnfLayoutAtOrbit(
  i: number,
  n: number,
  orbitA: number,
  fIdx: number,
  focusBlend: number,
  s: EventOrbitLayoutScaled,
) {
  "worklet";
  const angle =
    Math.PI / 2 - i * ((2 * Math.PI) / n) + orbitA;
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  const gating = (i !== fIdx) || focusBlend < 0.5;
  const distFromFocus = Math.abs(i - fIdx);
  const minD = Math.min(distFromFocus, n - distFromFocus);

  let wS: number;
  if (gating) {
    const aboveG = sinA < -0.15;
    const rightG = cosA > 0.25;
    if (aboveG && rightG) wS = s.smallAboveRight;
    else if (aboveG) wS = s.smallAbove;
    else wS = s.small;
    const backDepth = Math.max(0, Math.min(1, (-sinA - 0.15) / 0.85));
    const perspectiveScale = 1 - backDepth * EVENT_ORBIT_BACK_DEPTH_SHRINK;
    wS *= perspectiveScale;
    wS = eventOrbitRingDistanceWidthScale(wS, n, minD);
  } else {
    wS = s.focused;
  }
  const wF = s.focused;

  const radiusMultiplier = 0.8 + 0.2 * (1 + sinA);
  let r = s.orbitRadius * radiusMultiplier;
  let posSin = sinA;
  let posCos = cosA;
  let yRadialScale = 1;
  const above = sinA < -0.15;
  const right = cosA > 0.25;
  const atSideRight = !above && cosA > 0.5 && gating;
  const atSideLeft = !above && cosA < -0.5 && gating;
  let yOff =
    above && right
      ? s.yOffsetAboveRight
      : sinA < 0
        ? s.yOffsetAbove
        : atSideRight
          ? s.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_RIGHT
          : atSideLeft
            ? s.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_LEFT
            : s.yOffsetBelow;
  if (minD === 1 && n > 1 && gating) {
    const splayed = eventOrbitNeighborSplayedTrig(angle, sinA, cosA);
    posSin = splayed.posSin;
    posCos = splayed.posCos;
    const aboveP = posSin < -0.15;
    const rightP = posCos > 0.25;
    // |cos θ| for flanking neighbors is sin(π/n) (e.g. ~0.43 for n=14) — never reaches 0.5, so the
    // old atSideRightP/atSideLeftP gates never fired and neighbors kept plain yOffsetBelow (tucked
    // under the hero). Always lift left/right by sign(posCos) after splay.
    yOff =
      aboveP && rightP
        ? s.yOffsetAboveRight
        : posSin < 0
          ? s.yOffsetAbove
          : posCos >= 0
            ? s.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_RIGHT
            : s.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_LEFT;
    r =
      s.orbitRadius *
      (0.8 + 0.2 * (1 + posSin)) *
      FOCUSED_NEIGHBOR_RADIAL_SCALE;
  } else if (gating && n > 1 && minD >= 2) {
    // One continuous ellipse: avoid per-sector y jumps that looked like stacked rows, not an orbit.
    r =
      s.orbitRadius *
      (EVENT_ORBIT_RING_RADIUS_MIN +
        EVENT_ORBIT_RING_RADIUS_RANGE * (1 + sinA));
    posSin = sinA;
    posCos = cosA;
    yRadialScale = EVENT_ORBIT_RING_Y_SCALE;
    yOff =
      sinA < -0.2
        ? s.yOffsetAbove * 0.35 + s.yOffsetBelow * 0.65
        : s.yOffsetBelow * 0.82;
  }
  let xS = CENTER_X + posCos * r - wS / 2;
  if (minD === 1 && n > 1) {
    xS += (posCos >= 0 ? 1 : -1) * s.focusNeighborSideGap;
  }
  let yS = CENTER_Y + posSin * r * yRadialScale + yOff - wS / 2;
  const stepAng = n > 0 ? (2 * Math.PI) / n : 2 * Math.PI;
  const angleFromBottom = Math.abs(
    Math.atan2(
      Math.sin(angle - Math.PI / 2),
      Math.cos(angle - Math.PI / 2),
    ),
  );
  const inBackSlot =
    n > 1 &&
    gating &&
    i !== fIdx &&
    sinA > 0.12 &&
    angleFromBottom < stepAng * 0.5;
  if (inBackSlot && minD <= 2) {
    const nudged = applyEventOrbitBackSlotNudge(xS, yS, wS, s, focusBlend);
    xS = nudged.xS;
    yS = nudged.yS;
  }
  const xF = CENTER_X - wF / 2;
  const yF =
    CENTER_Y + s.orbitRadius * 1.2 + s.yOffsetBelow - wF / 2;
  return {
    wS,
    xS,
    yS,
    wF,
    xF,
    yF,
    oS: minD === 1 ? 0.6 : 0.4,
  };
}

/** Shortest step distance on the event ring between index i and focus index f. */
function eventOrbitMinCircularD(i: number, f: number, n: number) {
  "worklet";
  if (n <= 0) return 0;
  const d = Math.abs(i - f);
  return Math.min(d, n - d);
}

/** “Back of the ring” slot (occluded by the large focus card) — same geometry as `inBackSlot` in `eventUnfLayoutAtOrbit` for non-focus gating. */
function isEventOrbitBackSlot(i: number, n: number, orbitA: number) {
  "worklet";
  if (n <= 1) return false;
  const stepAng = (2 * Math.PI) / n;
  const angle = Math.PI / 2 - i * stepAng + orbitA;
  const sinA = Math.sin(angle);
  const angleFromBottom = Math.abs(
    Math.atan2(
      Math.sin(angle - Math.PI / 2),
      Math.cos(angle - Math.PI / 2),
    ),
  );
  return sinA > 0.12 && angleFromBottom < stepAng * 0.5;
}

/**
 * Linear a→b in screen space often cuts through the hub. Interpolates the **card center** in
 * polar form around the screen center (shortest angle step). Used for: “other” cards when
 * blending unfocused anchors, and **outgoing** hero → end slot (avoids piecewise f(angle) kinks
 * from lerping to f(aCur)). Incoming “to” still uses linear x/y/w for grow+move as one motion.
 */
function lerpEventOrbitUnfUnfocusedPolar(
  a: { wS: number; xS: number; yS: number; oS: number },
  b: { wS: number; xS: number; yS: number; oS: number },
  p: number,
) {
  "worklet";
  const lerp = (u: number, v: number, t: number) => u + (v - u) * t;
  const aCx = a.xS + a.wS / 2;
  const aCy = a.yS + a.wS / 2;
  const bCx = b.xS + b.wS / 2;
  const bCy = b.yS + b.wS / 2;
  const rA = Math.hypot(aCx - CENTER_X, aCy - CENTER_Y);
  const rB = Math.hypot(bCx - CENTER_X, bCy - CENTER_Y);
  const angA = Math.atan2(aCy - CENTER_Y, aCx - CENTER_X);
  const angB = Math.atan2(bCy - CENTER_Y, bCx - CENTER_X);
  let dAng = angB - angA;
  if (dAng > Math.PI) dAng -= 2 * Math.PI;
  if (dAng < -Math.PI) dAng += 2 * Math.PI;
  const r = lerp(rA, rB, p);
  const ang = angA + p * dAng;
  const cCx = CENTER_X + r * Math.cos(ang);
  const cCy = CENTER_Y + r * Math.sin(ang);
  const w = lerp(a.wS, b.wS, p);
  return {
    w,
    x: cCx - w / 2,
    y: cCy - w / 2,
    o: lerp(a.oS, b.oS, p),
  };
}

/** Incoming card z during `from !== to` swipe (must match the `to` branch). */
function eventOrbitSwipeZIn(p: number, pIn: number) {
  "worklet";
  const zCrossT =
    p < EVENT_ORBIT_Z_CROSS_START
      ? 0
      : (p - EVENT_ORBIT_Z_CROSS_START) / (1 - EVENT_ORBIT_Z_CROSS_START);
  // Rise with pIn in the 2nd half so z stays competitive while the card grows (not stuck at ~24 until p≈0.88).
  const zInLowPlateau = 24 + Math.round(22 * pIn);
  const zInHigh = 50 + Math.round(5 * pIn);
  if (p < 0.5) {
    return 12 + Math.round(4 * 2 * p);
  }
  return Math.round(zInLowPlateau * (1 - zCrossT) + zInHigh * zCrossT);
}

function getEventOrbitLayoutScaledForFontScale(fontScale: number) {
  return {
    focused: FOCUSED_EVENT_SIZE * fontScale,
    small: SMALL_EVENT_SIZE * fontScale,
    smallAbove: SMALL_EVENT_SIZE_ABOVE * fontScale,
    smallAboveRight: SMALL_EVENT_SIZE_ABOVE_RIGHT * fontScale,
    orbitRadius: EVENT_ORBIT_RADIUS * fontScale,
    yOffsetAboveRight: -26 * fontScale,
    yOffsetAbove: -14 * fontScale,
    yOffsetBelow: 4 * fontScale,
    carouselPadding: 12 * fontScale,
    focusNeighborSideGap: FOCUSED_EVENT_SIDE_CLEARANCE * fontScale,
    focusBackOrbitClearance: FOCUSED_BACK_ORBIT_CLEARANCE * fontScale,
  };
}

type OrbitalEventCardLayoutStyle = {
  position: "absolute";
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  zIndex: number;
};

/**
 * Worklet: same layout as `OrbitalEventCard` `useAnimatedStyle` (single source of truth for card layout).
 */
function computeOrbitalEventCardLayout(
  i: number,
  n: number,
  scaled: ReturnType<typeof getEventOrbitLayoutScaledForFontScale>,
  aCur: number,
  from: number,
  to: number,
  p: number,
  fIdx: number,
  swipeAngleStart: number,
  swipeAngleEnd: number,
): OrbitalEventCardLayoutStyle {
  "worklet";
  if (n <= 0) {
    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: scaled.small,
      height: scaled.small,
      opacity: 0.4,
      zIndex: 1,
    };
  }
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  let focusBlend = 0;
  if (from === to) {
    focusBlend = i === to ? 1 : 0;
  } else {
    if (i === from) {
      focusBlend = 1 - p;
    } else if (i === to) {
      focusBlend = p;
    }
  }
  const layoutFIdx = from !== to ? from : fIdx;
  if (from !== to) {
    const s: EventOrbitLayoutScaled = {
      focused: scaled.focused,
      small: scaled.small,
      smallAbove: scaled.smallAbove,
      smallAboveRight: scaled.smallAboveRight,
      orbitRadius: scaled.orbitRadius,
      yOffsetAboveRight: scaled.yOffsetAboveRight,
      yOffsetAbove: scaled.yOffsetAbove,
      yOffsetBelow: scaled.yOffsetBelow,
      focusNeighborSideGap: scaled.focusNeighborSideGap,
      focusBackOrbitClearance: scaled.focusBackOrbitClearance,
    };
    const pIn = Math.max(0, 2 * p - 1);
    if (i === from) {
      const focusAt = eventUnfLayoutAtOrbit(i, n, swipeAngleStart, layoutFIdx, 1, s);
      // `eventUnfLayoutAtOrbit` is **piecewise** in the orbit angle (splay, back nudge, w-tier). Using
      // a live `smallAt = f(aCur)` with linear x/y/w made `f(aCur)` jump mid-swipe (e.g. 40%→50%: left
      // 40→77 in logs) while p moved smoothly — visible bounce. Lerp in polar space to the **end** slot
      // `f(angleEnd)` only; p already tracks the orbit, so the path is smooth and ends on the true tile.
      const smallAtEnd = eventUnfLayoutAtOrbit(i, n, swipeAngleEnd, to, 0, s);
      const u = lerpEventOrbitUnfUnfocusedPolar(
        { wS: focusAt.wF, xS: focusAt.xF, yS: focusAt.yF, oS: 1 },
        {
          wS: smallAtEnd.wS,
          xS: smallAtEnd.xS,
          yS: smallAtEnd.yS,
          oS: smallAtEnd.oS,
        },
        p,
      );
      const w = u.w;
      const x = u.x;
      const y = u.y;
      const opacity = u.o;
      // Out stays above in until EVENT_ORBIT_Z_CROSS_START: an immediate flip at p===0.5 put the new hero
      // (z~50) over the old one while it was still large, so the previous title looked “sucked behind”.
      const zCrossT =
        p < EVENT_ORBIT_Z_CROSS_START
          ? 0
          : (p - EVENT_ORBIT_Z_CROSS_START) / (1 - EVENT_ORBIT_Z_CROSS_START);
      const zOutHigh = p < 0.5 ? 34 + Math.round(6 * (1 - 2 * p)) : 42;
      const zOutLowEnd = 16 + Math.round(10 * (1 - pIn));
      let zOut =
        p < 0.5
          ? zOutHigh
          : Math.round(zOutHigh * (1 - zCrossT) + zOutLowEnd * zCrossT);
      const zInPeer = eventOrbitSwipeZIn(p, pIn);
      // One crossover only: until pIn passes IN_OVER, keep outgoing strictly above incoming whenever
      // we’re still animating (no hysteresis gap; width-based cutoff was dropping out-on-top too soon).
      if (pIn > EVENT_ORBIT_Z_IN_OVER_AFTER_PIN) {
        zOut = Math.min(zOut, zInPeer - 1);
      } else if (p < EVENT_ORBIT_Z_OUT_FORCE_UNTIL_P) {
        zOut = Math.max(zOut, zInPeer + 1);
      }
      return {
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: w,
        opacity,
        zIndex: zOut,
      };
    }
    if (i === to) {
      const smallAtFrom = eventUnfLayoutAtOrbit(i, n, aCur, from, 0, s);
      const focusAtTo = eventUnfLayoutAtOrbit(i, n, aCur, to, 1, s);
      // Grow/move over the full swipe (`p`). Using only `pIn` (2p−1) froze size/position until p>½,
      // which read as a jump then a sudden grow; z-order still uses pIn via `eventOrbitSwipeZIn`.
      const w = lerp(smallAtFrom.wS, focusAtTo.wF, p);
      const x = lerp(smallAtFrom.xS, focusAtTo.xF, p);
      const y = lerp(smallAtFrom.yS, focusAtTo.yF, p);
      const opacity = lerp(smallAtFrom.oS, 1, p);
      const zIn = eventOrbitSwipeZIn(p, pIn);
      return {
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: w,
        opacity,
        zIndex: zIn,
      };
    }
    const pOrbitAnchor = p < 0.5 ? 0 : pIn;
    const a = eventUnfLayoutAtOrbit(i, n, aCur, from, 0, s);
    const b = eventUnfLayoutAtOrbit(i, n, aCur, to, 0, s);
    const dFrom = eventOrbitMinCircularD(i, from, n);
    const dTo = eventOrbitMinCircularD(i, to, n);
    const neighborSplayFlip = (dFrom === 1) !== (dTo === 1);
    const isBack = isEventOrbitBackSlot(i, n, aCur);
    const usePolar = isBack || neighborSplayFlip;
    const u = usePolar
      ? lerpEventOrbitUnfUnfocusedPolar(a, b, pOrbitAnchor)
      : {
          w: lerp(a.wS, b.wS, pOrbitAnchor),
          x: lerp(a.xS, b.xS, pOrbitAnchor),
          y: lerp(a.yS, b.yS, pOrbitAnchor),
          o: lerp(a.oS, b.oS, pOrbitAnchor),
        };
    const zOrbitOther = dFrom === 1 || dTo === 1 ? 10 : 1;
    return {
      position: "absolute",
      left: u.x,
      top: u.y,
      width: u.w,
      height: u.w,
      opacity: u.o,
      zIndex: zOrbitOther,
    };
  }

  const angle = Math.PI / 2 - i * ((2 * Math.PI) / n) + aCur;
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  const gating = (i !== layoutFIdx) || focusBlend < 0.5;
  const distFromFocus = Math.abs(i - layoutFIdx);
  const minD = Math.min(distFromFocus, n - distFromFocus);

  let wS: number;
  if (gating) {
    const aboveG = sinA < -0.15;
    const rightG = cosA > 0.25;
    if (aboveG && rightG) wS = scaled.smallAboveRight;
    else if (aboveG) wS = scaled.smallAbove;
    else wS = scaled.small;
    const backDepth = Math.max(0, Math.min(1, (-sinA - 0.15) / 0.85));
    const perspectiveScale = 1 - backDepth * EVENT_ORBIT_BACK_DEPTH_SHRINK;
    wS *= perspectiveScale;
    wS = eventOrbitRingDistanceWidthScale(wS, n, minD);
  } else {
    wS = scaled.focused;
  }
  const wF = scaled.focused;
  const w = lerp(wS, wF, focusBlend);
  const h = w;

  const radiusMultiplier = 0.8 + 0.2 * (1 + sinA);
  let r = scaled.orbitRadius * radiusMultiplier;
  let posSin = sinA;
  let posCos = cosA;
  let yRadialScale = 1;
  const above = sinA < -0.15;
  const right = cosA > 0.25;
  const atSideRight = !above && cosA > 0.5 && gating;
  const atSideLeft = !above && cosA < -0.5 && gating;
  let yOff =
    above && right
      ? scaled.yOffsetAboveRight
      : sinA < 0
        ? scaled.yOffsetAbove
        : atSideRight
          ? scaled.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_RIGHT
          : atSideLeft
            ? scaled.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_LEFT
            : scaled.yOffsetBelow;
  if (minD === 1 && n > 1 && gating) {
    const splayed = eventOrbitNeighborSplayedTrig(angle, sinA, cosA);
    posSin = splayed.posSin;
    posCos = splayed.posCos;
    const aboveP = posSin < -0.15;
    const rightP = posCos > 0.25;
    yOff =
      aboveP && rightP
        ? scaled.yOffsetAboveRight
        : posSin < 0
          ? scaled.yOffsetAbove
          : posCos >= 0
            ? scaled.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_RIGHT
            : scaled.yOffsetBelow - FOCUSED_NEIGHBOR_SIDE_Y_ABOVE_LEFT;
    r =
      scaled.orbitRadius *
      (0.8 + 0.2 * (1 + posSin)) *
      FOCUSED_NEIGHBOR_RADIAL_SCALE;
  } else if (gating && n > 1 && minD >= 2) {
    r =
      scaled.orbitRadius *
      (EVENT_ORBIT_RING_RADIUS_MIN +
        EVENT_ORBIT_RING_RADIUS_RANGE * (1 + sinA));
    posSin = sinA;
    posCos = cosA;
    yRadialScale = EVENT_ORBIT_RING_Y_SCALE;
    yOff =
      sinA < -0.2
        ? scaled.yOffsetAbove * 0.35 + scaled.yOffsetBelow * 0.65
        : scaled.yOffsetBelow * 0.82;
  }
  let xS = CENTER_X + posCos * r - wS / 2;
  if (minD === 1 && n > 1) {
    xS += (posCos >= 0 ? 1 : -1) * scaled.focusNeighborSideGap;
  }
  let yS = CENTER_Y + posSin * r * yRadialScale + yOff - wS / 2;
  const stepAng = n > 0 ? (2 * Math.PI) / n : 2 * Math.PI;
  const angleFromBottom = Math.abs(
    Math.atan2(
      Math.sin(angle - Math.PI / 2),
      Math.cos(angle - Math.PI / 2),
    ),
  );
  const inBackSlot =
    n > 1 &&
    gating &&
    i !== layoutFIdx &&
    sinA > 0.12 &&
    angleFromBottom < stepAng * 0.5;
  if (inBackSlot && minD <= 2) {
    const sOrbit: EventOrbitLayoutScaled = {
      focused: scaled.focused,
      small: scaled.small,
      smallAbove: scaled.smallAbove,
      smallAboveRight: scaled.smallAboveRight,
      orbitRadius: scaled.orbitRadius,
      yOffsetAboveRight: scaled.yOffsetAboveRight,
      yOffsetAbove: scaled.yOffsetAbove,
      yOffsetBelow: scaled.yOffsetBelow,
      focusNeighborSideGap: scaled.focusNeighborSideGap,
      focusBackOrbitClearance: scaled.focusBackOrbitClearance,
    };
    const nudged = applyEventOrbitBackSlotNudge(xS, yS, wS, sOrbit, focusBlend);
    xS = nudged.xS;
    yS = nudged.yS;
  }
  const xF = CENTER_X - wF / 2;
  const yF =
    CENTER_Y + scaled.orbitRadius * 1.2 + scaled.yOffsetBelow - wF / 2;

  const x = lerp(xS, xF, focusBlend);
  const y = lerp(yS, yF, focusBlend);
  const oS = minD === 1 ? 0.6 : 0.4;
  const oF = 1;
  const opacity = lerp(oS, oF, focusBlend);
  const zBase = 1 + Math.round(24 * focusBlend);
  const zBonus = from !== to && i === to ? 1 : 0;
  const zNeighborBoost =
    from === to && minD === 1 && gating ? 8 : 0;
  return {
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    opacity,
    zIndex: zBase + zBonus + zNeighborBoost,
  };
}

/** Event card positioned by shared orbit angle so all events move smoothly along the circle (no jumping). */
const OrbitalEventCard = React.memo(function OrbitalEventCard({
  event,
  eventIndex,
  totalCount,
  focusedEventIndex,
  eventOrbitAngle,
  focusedEventIndexShared,
  orbitSwipeFromIdx,
  orbitSwipeToIdx,
  orbitFocusSwipeProgress,
  orbitSwipeAngleStart,
  orbitSwipeAngleEnd,
  showFocusedChrome,
  colorScheme,
  colors,
  onFocusPress,
  onDeletePress,
  isLocked = false,
  isUnseen = false,
  isAttending = false,
  isPastEvent = false,
  fontScale = 1,
}: {
  event: SferaEvent;
  eventIndex: number;
  totalCount: number;
  focusedEventIndex: number;
  eventOrbitAngle: SharedNum;
  focusedEventIndexShared: ReanimatedSharedValue<number>;
  orbitSwipeFromIdx: ReanimatedSharedValue<number>;
  orbitSwipeToIdx: ReanimatedSharedValue<number>;
  orbitFocusSwipeProgress: ReanimatedSharedValue<number>;
  orbitSwipeAngleStart: SharedNum;
  orbitSwipeAngleEnd: SharedNum;
  /** True when this card should show the focused frame + details (incl. both endpoints while swiping). */
  showFocusedChrome: boolean;
  colorScheme: "light" | "dark";
  colors: Record<string, string>;
  onFocusPress?: (event: SferaEvent) => void;
  onDeletePress?: (event: SferaEvent) => void;
  isLocked?: boolean;
  isUnseen?: boolean;
  isAttending?: boolean;
  isPastEvent?: boolean;
  fontScale?: number;
}) {
  const t = useTranslate();
  const isFocused =
    (eventIndex - focusedEventIndex + totalCount) % totalCount === 0;

  const arrowPulse = useSharedValue(1);
  const arrowPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: arrowPulse.value }],
  }));
  const triggerArrowPulse = () => {
    arrowPulse.value = withSequence(
      withTiming(1.35, { duration: 120, easing: Easing.out(Easing.ease) }),
      withTiming(0.85, { duration: 100, easing: Easing.in(Easing.ease) }),
      withTiming(1.25, { duration: 100, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) }),
    );
  };

  const scaled = useMemo(
    () => getEventOrbitLayoutScaledForFontScale(fontScale),
    [fontScale],
  );

  /** Kept false: we always show orbit tile titles so events don’t look “lost” after swipe. */
  const isAboveOrb = false;

  const animatedStyle = useAnimatedStyle(() => {
    const n = totalCount;
    if (n <= 0) {
      return {
        position: "absolute" as const,
        left: 0,
        top: 0,
        width: scaled.small,
        height: scaled.small,
        opacity: 0.4,
        zIndex: 1,
      };
    }
    const from = Math.round(orbitSwipeFromIdx.value);
    const to = Math.round(orbitSwipeToIdx.value);
    const fIdx = Math.round(focusedEventIndexShared.value);
    let p = Math.max(0, Math.min(1, orbitFocusSwipeProgress.value));
    if (from !== to) {
      const a0 = orbitSwipeAngleStart.value;
      const a1 = orbitSwipeAngleEnd.value;
      const ac = eventOrbitAngle.value;
      const span = a1 - a0;
      if (Math.abs(span) > 1e-7) {
        p = Math.max(0, Math.min(1, (ac - a0) / span));
      }
    }
    return computeOrbitalEventCardLayout(
      eventIndex,
      n,
      scaled,
      eventOrbitAngle.value,
      from,
      to,
      p,
      fIdx,
      orbitSwipeAngleStart.value,
      orbitSwipeAngleEnd.value,
    );
  }, [fontScale, totalCount, eventIndex]);

  /** Orbit focus swipe progress in [0,1] (angle-based when from≠to) — used for details height, not opacity. */
  const orbitFocusedDetailsCollapseStyle = useAnimatedStyle(() => {
    const from = Math.round(orbitSwipeFromIdx.value);
    const to = Math.round(orbitSwipeToIdx.value);
    if (from === to) {
      return {};
    }
    let p = Math.max(0, Math.min(1, orbitFocusSwipeProgress.value));
    {
      const a0 = orbitSwipeAngleStart.value;
      const a1 = orbitSwipeAngleEnd.value;
      const ac = eventOrbitAngle.value;
      const span = a1 - a0;
      if (Math.abs(span) > 1e-7) {
        p = Math.max(0, Math.min(1, (ac - a0) / span));
      }
    }
    const H = ORBIT_FOCUSED_DETAILS_MAX_HEIGHT * (fontScale ?? 1);
    if (eventIndex === from) {
      const t = 1 - p;
      return {
        maxHeight: H * t,
        paddingTop: 4 * t,
        paddingBottom: 6 * t,
        paddingLeft: 10 * t,
        paddingRight: 10 * t,
        overflow: "hidden" as const,
      };
    }
    if (eventIndex === to) {
      const unclipped = p >= 0.999;
      if (unclipped) {
        return {};
      }
      return {
        maxHeight: H * p,
        paddingTop: 4 * p,
        paddingBottom: 6 * p,
        paddingLeft: 10 * p,
        paddingRight: 10 * p,
        overflow: "hidden" as const,
      };
    }
    return {};
  }, [eventIndex, fontScale]);

  const orbitFocusedLockBadgeCollapseStyle = useAnimatedStyle(() => {
    const from = Math.round(orbitSwipeFromIdx.value);
    const to = Math.round(orbitSwipeToIdx.value);
    if (from === to) {
      return {};
    }
    let p = Math.max(0, Math.min(1, orbitFocusSwipeProgress.value));
    {
      const a0 = orbitSwipeAngleStart.value;
      const a1 = orbitSwipeAngleEnd.value;
      const ac = eventOrbitAngle.value;
      const span = a1 - a0;
      if (Math.abs(span) > 1e-7) {
        p = Math.max(0, Math.min(1, (ac - a0) / span));
      }
    }
    const h = ORBIT_FOCUSED_LOCK_BADGE_MAX_HEIGHT * (fontScale ?? 1);
    if (eventIndex === from) {
      return {
        maxHeight: h * (1 - p),
        overflow: "hidden" as const,
      };
    }
    if (eventIndex === to) {
      const unclipped = p >= 0.999;
      return {
        maxHeight: unclipped ? 1e4 : h * p,
        overflow: unclipped ? ("visible" as const) : ("hidden" as const),
      };
    }
    return {};
  }, [eventIndex, fontScale]);

  /**
   * Dev: log outer layout (Reanimated) for the two active swipe endpoints. (Animating padding/tilt on
   * the frame was reverted: it fought the lerped width and increased the visible bounce.)
   */
  useAnimatedReaction(
    () => {
      "worklet";
      if (!__DEV__) {
        return -1;
      }
      const n = totalCount;
      if (n <= 0) {
        return -1;
      }
      const from = Math.round(orbitSwipeFromIdx.value);
      const to = Math.round(orbitSwipeToIdx.value);
      if (from === to) {
        return -1;
      }
      if (eventIndex !== from && eventIndex !== to) {
        return -999;
      }
      let p = Math.max(0, Math.min(1, orbitFocusSwipeProgress.value));
      {
        const a0 = orbitSwipeAngleStart.value;
        const a1 = orbitSwipeAngleEnd.value;
        const ac = eventOrbitAngle.value;
        const span = a1 - a0;
        if (Math.abs(span) > 1e-7) {
          p = Math.max(0, Math.min(1, (ac - a0) / span));
        }
      }
      const b = Math.min(9, Math.max(0, Math.floor(p * 10)));
      return eventIndex * 1_000_000_000 + b;
    },
    (key, prev) => {
      "worklet";
      if (!__DEV__ || key < 0 || key === prev) {
        return;
      }
      const n = totalCount;
      if (n <= 0) {
        return;
      }
      const from = Math.round(orbitSwipeFromIdx.value);
      const to = Math.round(orbitSwipeToIdx.value);
      if (from === to) {
        return;
      }
      if (eventIndex !== from && eventIndex !== to) {
        return;
      }
      let p = Math.max(0, Math.min(1, orbitFocusSwipeProgress.value));
      {
        const a0 = orbitSwipeAngleStart.value;
        const a1 = orbitSwipeAngleEnd.value;
        const ac = eventOrbitAngle.value;
        const span = a1 - a0;
        if (Math.abs(span) > 1e-7) {
          p = Math.max(0, Math.min(1, (ac - a0) / span));
        }
      }
      const fIdx = Math.round(focusedEventIndexShared.value);
      const L = computeOrbitalEventCardLayout(
        eventIndex,
        n,
        scaled,
        eventOrbitAngle.value,
        from,
        to,
        p,
        fIdx,
        orbitSwipeAngleStart.value,
        orbitSwipeAngleEnd.value,
      );
      runOnJS(eventsOrbitLogSwipeLayout)({
        role: eventIndex === from ? "out" : "in",
        eventIndex,
        p,
        left: L.left,
        top: L.top,
        width: L.width,
        height: L.height,
        opacity: L.opacity,
        zIndex: L.zIndex,
      });
    },
    [eventIndex, totalCount, scaled],
  );

  const dateDisplay = formatEventDate(event.startDate || event.date);

  const cardContent = (
    <View
      style={[
        styles.eventCardGlowWrap,
        !showFocusedChrome && styles.eventCardGlowWrapNonFocused,
      ]}
    >
      <Pressable
        onPress={() => isFocused && triggerArrowPulse()}
        style={[
          styles.eventCard,
          !showFocusedChrome && styles.eventCardNonFocused,
          {
            borderColor:
              colorScheme === "dark"
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.08)",
          },
        ]}
      >
        <BlurView
          intensity={colorScheme === "dark" ? 80 : 80}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.eventCardGlassOverlay,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(26,35,50,0.85)"
                  : "rgba(255,255,255,0.75)",
            },
          ]}
          pointerEvents="none"
        />
        <View style={styles.eventCardContent}>
          {(() => {
            const imageUrls = getEventImageUrls(event);
            if (imageUrls.length === 0) {
              return (
                <View
                  style={[
                    styles.eventCardImage,
                    styles.eventCardImagePlaceholder,
                    { backgroundColor: colors.primary + "25" },
                  ]}
                >
                  <MaterialIcons
                    name={isLocked ? "lock" : "event"}
                    size={showFocusedChrome ? 40 * fontScale : 24 * fontScale}
                    color={colors.primary}
                  />
                </View>
              );
            }
            if (imageUrls.length === 1) {
              return (
                <Image
                  source={{ uri: imageUrls[0]! }}
                  style={styles.eventCardImage}
                  contentFit="cover"
                />
              );
            }
            if (!showFocusedChrome) {
              return (
                <Image
                  source={{ uri: imageUrls[0]! }}
                  style={styles.eventCardImage}
                  contentFit="cover"
                />
              );
            }
            const carouselWidth = scaled.focused - scaled.carouselPadding;
            return (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={[styles.eventCardImage, { width: carouselWidth }]}
                contentContainerStyle={{ flexDirection: "row" }}
              >
                {imageUrls.map((uri, idx) => (
                  <Image
                    key={`${event.id}-img-${idx}`}
                    source={{ uri }}
                    style={[styles.eventCardImage, { width: carouselWidth }]}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            );
          })()}
          {showFocusedChrome ? (
            <Animated.View
              style={[
                styles.eventCardDetails,
                orbitFocusedDetailsCollapseStyle,
              ]}
            >
              <ThemedText
                size="sm"
                weight="bold"
                numberOfLines={3}
                style={styles.eventCardName}
              >
                {event.name}
              </ThemedText>
              {dateDisplay && !isLocked ? (
                <ThemedText
                  size="xxs"
                  emphasis="medium"
                  numberOfLines={1}
                  style={styles.eventCardDate}
                >
                  {dateDisplay}
                </ThemedText>
              ) : null}
              <View style={styles.eventCardActions}>
                <View style={styles.eventCardCalendarBtnWrapper}>
                  <View
                    style={[
                      styles.eventCardActionBtn,
                      {
                        backgroundColor: colors.primary + "40",
                        borderColor: "rgba(255,255,255,0.25)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="event"
                      size={18 * fontScale}
                      color="#fff"
                    />
                  </View>
                  {!isLocked && isAttending ? (
                    <View
                      style={[
                        styles.eventCardCalendarBadge,
                        isPastEvent && styles.eventCardCalendarBadgePast,
                      ]}
                    >
                      <MaterialIcons
                        name={isPastEvent ? "event-available" : "check-circle"}
                        size={10 * fontScale}
                        color="#fff"
                      />
                    </View>
                  ) : null}
                </View>
                {onFocusPress ? (
                  <Animated.View style={arrowPulseStyle}>
                    <Pressable
                      style={[
                        styles.eventCardActionBtn,
                        {
                          backgroundColor: colors.primary + "40",
                          borderColor: "rgba(255,255,255,0.25)",
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        onFocusPress(event);
                      }}
                    >
                      <MaterialIcons
                        name="arrow-forward"
                        size={18 * fontScale}
                        color="#fff"
                      />
                    </Pressable>
                  </Animated.View>
                ) : null}
              </View>
            </Animated.View>
          ) : !isAboveOrb ? (
            <ThemedText
              size="xxs"
              weight="medium"
              numberOfLines={1}
              style={styles.eventCardNameOnly}
            >
              {event.name}
            </ThemedText>
          ) : null}
        </View>
        {showFocusedChrome && isLocked ? (
          <Animated.View
            style={[
              styles.eventCardLockBadge,
              orbitFocusedLockBadgeCollapseStyle,
            ]}
          >
            <MaterialIcons name="lock" size={14 * fontScale} color="#fff" />
          </Animated.View>
        ) : null}
        {isFocused && isPastEvent && onDeletePress ? (
          <Pressable
            style={styles.eventCardDeleteBadge}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                t("events.removePastEventTitle"),
                t("events.removePastEventMessage"),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: t("common.delete"),
                    style: "destructive",
                    onPress: () => onDeletePress(event),
                  },
                ],
              );
            }}
          >
            <MaterialIcons
              name="delete-outline"
              size={18 * fontScale}
              color="#fff"
            />
          </Pressable>
        ) : null}
        {event.type === "private" && !isLocked ? (
          <View style={styles.eventCardPrivateBadge}>
            <MaterialIcons name="lock" size={12 * fontScale} color="#fff" />
          </View>
        ) : null}
        {isUnseen ? (
          <View
            style={[
              styles.eventCardUnseenBadge,
              !showFocusedChrome && styles.eventCardUnseenBadgeSmall,
            ]}
          >
            <ThemedText
              size="xxs"
              weight="bold"
              style={[
                styles.eventCardUnseenText,
                !showFocusedChrome && styles.eventCardUnseenTextSmall,
              ]}
              numberOfLines={1}
            >
              NEW
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );

  return (
    <Animated.View style={animatedStyle}>
      {showFocusedChrome ? (
        <View
          style={[
            styles.eventCardOuterFrame,
            {
              borderColor:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(0,0,0,0.12)",
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(20,30,46,0.97)"
                  : "rgba(240,244,255,0.97)",
            },
          ]}
        >
          <View style={styles.eventCardTilt}>{cardContent}</View>
        </View>
      ) : (
        cardContent
      )}
    </Animated.View>
  );
});

/** Base sizes for expanded event card; multiply by fontScale for scalable layout. */
const EXPANDED_CARD_PADDING = 20;
const EXPANDED_HEADER_MARGIN_BOTTOM = 12;
const EXPANDED_IMAGE_HEIGHT = 200;
const EXPANDED_IMAGE_RADIUS = 12;
const EXPANDED_LABEL_MARGIN_TOP = 8;
const EXPANDED_DESC_MARGIN_TOP = 12;
const EXPANDED_DISCOUNT_SECTION_MARGIN_TOP = 12;
const EXPANDED_DISCOUNT_HINT_MARGIN_BOTTOM = 8;
const EXPANDED_DISCOUNT_CODE_PADDING = 12;
const EXPANDED_DISCOUNT_CODE_RADIUS = 12;
const EXPANDED_DISCOUNT_BADGE_HEIGHT = 72;
const EXPANDED_EVENT_LINK_MARGIN_TOP = 12;
const EXPANDED_ACTIONS_MARGIN_TOP = 16;
const EXPANDED_BTN_PADDING_V = 12;
const EXPANDED_BTN_PADDING_H = 24;
const EXPANDED_BTN_RADIUS = 12;
const EXPANDED_BTN_MIN_WIDTH = 100;
/** Join button image (asset) size – scalable with fontScale. */
const JOIN_IMAGE_WIDTH = 240;
const JOIN_IMAGE_HEIGHT = 80;
const EXPANDED_CARD_RADIUS = 20;

export default function EventsTab() {
  const colorScheme = useColorScheme();
  const t = useTranslate();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { constellationAmount, constellationOpacity, appUsabilityHints } =
    useVisualSettings();
  const { momentColors } = useMomentColors();
  const { markEventAsSeen, refreshEvents, getCachedEvents, isLoadingEvents, isRefreshing } = useSferaEventsBadge();
  const { hasPlusEntitlement, hasAIEntitlement } = useSubscription();

  const [events, setEvents] = useState<SferaEvent[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set());
  const [unlockedCodes, setUnlockedCodes] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"orbs" | "social" | "private" | "plus">(
    "orbs",
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [, setSelectedType] = useState<SferaEventType | null>(null);
  const [focusedCommunityIndex, setFocusedCommunityIndex] = useState(0);
  const [focusedEventIndex, setFocusedEventIndex] = useState(0);
  /** While swiping, both endpoints render focused chrome until the orbit animation ends. */
  const [orbitCardTransition, setOrbitCardTransition] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const focusedEventIndexRef = useRef(focusedEventIndex);
  focusedEventIndexRef.current = focusedEventIndex;
  const orbitCardTransitionRef = useRef(orbitCardTransition);
  orbitCardTransitionRef.current = orbitCardTransition;
  const [codeModal, setCodeModal] = useState<{
    visible: boolean;
    for: "private" | "plus" | null;
  }>({
    visible: false,
    for: null,
  });
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [expandedImageError, setExpandedImageError] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);
  const [pastEvents, setPastEvents] = useState<SferaEvent[]>([]);
  const [goldenUsedIds, setGoldenUsedIds] = useState<Set<string>>(new Set());
  const [showPastEvents, setShowPastEvents] = useState(true);
  const [hideFilledEvents, setHideFilledEvents] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [pendingAIResponse, setPendingAIResponse] =
    useState<PendingAIResponse | null>(null);
  const [goldenEventIdForModal, setGoldenEventIdForModal] = useState<
    string | null
  >(null);
  const [discountRevealed, setDiscountRevealed] = useState(false);
  const [expandedCardSize, setExpandedCardSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [expandedImageIndex, setExpandedImageIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const expandedImageScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setDescriptionExpanded(false);
  }, [expandedEventId]);
  const joinPulseScale = useSharedValue(1);
  const [
    eventsCommunitiesRotationStarted,
    setEventsCommunitiesRotationStarted,
  ] = useState(false);
  const fingerHintShownRef = useRef(false);
  const loadEventsInFlightRef = useRef<Promise<void> | null>(null);

  const params = useLocalSearchParams<{ eventIdForMemory?: string; expandEventId?: string }>();
  const insets = useSafeAreaInsets();
  const orbitAngle = useSharedValue(0);
  const eventsFingerOpacity = useSharedValue(0);
  const eventsFingerScale = useSharedValue(1);
  const orbExitProgress = useSharedValue(0); // 0 = all visible, 1 = selected orb at center, others exited
  const selectedOrbIndex = useSharedValue(-1); // 0=social, 1=private, 2=plus
  const hideCenteredOrb = useSharedValue(0); // 1 when community selected so we show CenterOrbPlaceholder instead
  const eventsRevealProgress = useSharedValue(0); // 0 -> 1 after orb settles, so events fade in
  const eventOrbitAngle = useSharedValue(0); // shared orbit angle so all event cards move smoothly along the circle
  const locationBannerOpacity = useSharedValue(1); // 1 on orbs view, fades to 0 when entering community
  const focusedEventIndexShared = useSharedValue(0); // synced with focusedEventIndex for worklets
  /** 0 at swipe start → 1 at end, same timing as eventOrbitAngle. From/to identify outgoing/incoming. */
  const orbitSwipeFromIdx = useSharedValue(0);
  const orbitSwipeToIdx = useSharedValue(0);
  const orbitFocusSwipeProgress = useSharedValue(1);
  /** Swipe window for `eventOrbitAngle`; layout progress is derived from angle so it can’t desync from `orbitFocusSwipeProgress`. */
  const orbitSwipeAngleStart = useSharedValue(0);
  const orbitSwipeAngleEnd = useSharedValue(0);
  const loadUnlocked = useCallback(async () => {
    const set = await getUnlockedVipCodes();
    setUnlockedCodes(set);
  }, []);

  // Sync local state from storage without fetching from network
  const syncLocalState = useCallback(async (list: SferaEvent[]) => {
    const [seen, attending] = await Promise.all([
      getSeenEventIds(),
      getAttendingEventIds(),
    ]);
    await syncAttendedSnapshotsFromActiveEvents(list, attending);
    const [past, goldenUsed] = await Promise.all([
      getPastAttendedEvents(),
      getEventGoldenMemoryUsedIds(),
    ]);
    setEvents(list);
    setSeenIds(seen);
    setAttendingIds(attending);
    setPastEvents(past);
    setGoldenUsedIds(goldenUsed);
    void scheduleEventMemoryReminders();
  }, []);

  // Fetch events from network and sync local state
  const loadEvents = useCallback(async (silent = false) => {
    if (loadEventsInFlightRef.current) {
      await loadEventsInFlightRef.current;
      return;
    }

    const task = (async () => {
      const list = await refreshEvents(silent);
      await syncLocalState(list);
    })();

    loadEventsInFlightRef.current = task;
    try {
      await task;
    } finally {
      if (loadEventsInFlightRef.current === task) {
        loadEventsInFlightRef.current = null;
      }
    }
  }, [refreshEvents, syncLocalState]);

  // Load unlocked codes on mount
  useEffect(() => {
    void loadUnlocked();
  }, [loadUnlocked]);

  // When provider finishes loading (or refreshing), sync local state
  useEffect(() => {
    if (!isLoadingEvents && !isRefreshing) {
      const cached = getCachedEvents();
      if (cached.length > 0) {
        void syncLocalState(cached);
      }
    }
  }, [isLoadingEvents, isRefreshing, getCachedEvents, syncLocalState]);

  // Orbit rotation: very slow while finger hint is visible, normal speed after finger fades.
  // If usability hints off, start normal rotation immediately.
  const NORMAL_ROTATION_DURATION_MS = 24000;
  const SLOW_ROTATION_DURATION_MS = 96000; // ~4x slower while finger is on
  useEffect(() => {
    if (!appUsabilityHints) {
      orbitAngle.value = withRepeat(
        withTiming(2 * Math.PI, {
          duration: NORMAL_ROTATION_DURATION_MS,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
      setEventsCommunitiesRotationStarted(true);
      return;
    }
    const isFingerVisible = !eventsCommunitiesRotationStarted;
    orbitAngle.value = withRepeat(
      withTiming(2 * Math.PI, {
        duration: isFingerVisible
          ? SLOW_ROTATION_DURATION_MS
          : NORMAL_ROTATION_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [orbitAngle, appUsabilityHints, eventsCommunitiesRotationStarted]);

  // Finger hint over Sfera Social: appear after location/notification modal is dismissed (if any), then pulse, fade out, then start rotation
  useEffect(() => {
    if (
      phase !== "orbs" ||
      !appUsabilityHints ||
      eventsCommunitiesRotationStarted ||
      fingerHintShownRef.current ||
      locationModalVisible
    ) {
      return;
    }
    fingerHintShownRef.current = true;
    const fadeDurationMs = 3000;
    eventsFingerOpacity.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(
        0,
        {
          duration: fadeDurationMs - 150,
          easing: Easing.linear,
        },
        (finished) => {
          "worklet";
          if (finished) {
            cancelAnimation(eventsFingerScale);
            runOnJS(setEventsCommunitiesRotationStarted)(true);
          }
        },
      ),
    );
    eventsFingerScale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(eventsFingerOpacity);
      cancelAnimation(eventsFingerScale);
    };
  }, [
    phase,
    appUsabilityHints,
    eventsCommunitiesRotationStarted,
    locationModalVisible,
    eventsFingerOpacity,
    eventsFingerScale,
  ]);

  useEffect(() => {
    if (phase === "orbs") {
      selectedOrbIndex.value = -1;
      orbExitProgress.value = withTiming(0, { duration: 280 });
      eventsRevealProgress.value = 0;
      hideCenteredOrb.value = 0;
    } else {
      hideCenteredOrb.value = 1;
      eventsRevealProgress.value = withDelay(
        180,
        withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) }),
      );
    }
  }, [
    phase,
    orbExitProgress,
    selectedOrbIndex,
    eventsRevealProgress,
    hideCenteredOrb,
  ]);

  const socialEvents = useMemo(
    () => events.filter((e) => e.type === "social"),
    [events],
  );
  const privateEvents = useMemo(
    () => events.filter((e) => e.type === "private"),
    [events],
  );
  const plusEvents = useMemo(
    () => events.filter((e) => e.type === "plus"),
    [events],
  );

  useEffect(() => {
    setExpandedImageError(false);
    setDiscountRevealed(false);
    setExpandedImageIndex(0);
  }, [expandedEventId]);

  // Subtle pulse on Join button when expanded card is open
  useEffect(() => {
    if (!expandedEventId) {
      joinPulseScale.value = 1;
      cancelAnimation(joinPulseScale);
      return;
    }
    joinPulseScale.value = 1;
    joinPulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(joinPulseScale);
  }, [expandedEventId, joinPulseScale]);

  const joinPulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: joinPulseScale.value }],
  }));

  const locationBannerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: locationBannerOpacity.value,
  }));

  // Open event detail card when deep-linked from another screen (e.g. insight card thumbnail)
  useEffect(() => {
    const eventIdParam = params.expandEventId;
    const eventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam;
    if (!eventId) return;
    const found = events.find((e) => e.id === eventId) ?? pastEvents.find((e) => e.id === eventId);
    if (!found) return;

    const communityIndex =
      found.type === "social" ? 0 : found.type === "private" ? 1 : 2;
    const communityType = found.type;

    setFocusedCommunityIndex(communityIndex);
    setPhase(communityType);
    setSelectedType(communityType);

    // Mirror the settled visual state after a user manually selects a community orb.
    selectedOrbIndex.value = communityIndex;
    orbExitProgress.value = 1;
    hideCenteredOrb.value = 1;
    eventsRevealProgress.value = 1;
    locationBannerOpacity.value = 0;

    // Ensure event is visible and focused in the orbit before expanding.
    if (isEventFilled(found)) setHideFilledEvents(false);
    if (pastEvents.some((e) => e.id === eventId)) setShowPastEvents(true);

    const baseUpcoming =
      communityIndex === 0
        ? socialEvents
        : communityIndex === 1
          ? privateEvents.filter(
              (e) =>
                e.vipCode &&
                unlockedCodes.has((e.vipCode || "").trim().toLowerCase()),
            )
          : plusEvents;
    const visibleUpcoming = hideFilledEvents
      ? baseUpcoming.filter((e) => !isEventFilled(e))
      : baseUpcoming;
    const pastForCommunity = showPastEvents
      ? pastEvents.filter((e) => e.type === communityType)
      : [];
    const visibleList = [...visibleUpcoming, ...pastForCommunity];
    const targetIndex = Math.max(
      0,
      visibleList.findIndex((e) => e.id === eventId),
    );
    setFocusedEventIndex(targetIndex);
    focusedEventIndexRef.current = targetIndex;
    focusedEventIndexShared.value = targetIndex;
    if (visibleList.length > 0) {
      const settledA =
        targetIndex * ((2 * Math.PI) / visibleList.length);
      eventOrbitAngle.value = settledA;
    }

    setExpandedEventId(eventId);
    router.setParams({ expandEventId: undefined });
  }, [
    params.expandEventId,
    events,
    pastEvents,
    socialEvents,
    privateEvents,
    plusEvents,
    unlockedCodes,
    hideFilledEvents,
    showPastEvents,
    selectedOrbIndex,
    orbExitProgress,
    hideCenteredOrb,
    eventsRevealProgress,
    locationBannerOpacity,
    focusedEventIndexShared,
    eventOrbitAngle,
  ]);

  // Open Create memory modal when navigated from event memory reminder notification
  useEffect(() => {
    const eventId = params.eventIdForMemory;
    if (!eventId) return;
    const past = pastEvents.find((e) => e.id === eventId);
    if (!past || goldenUsedIds.has(eventId)) return;
    setGoldenEventIdForModal(eventId);
    setAiModalVisible(true);
    getPendingAIResponse().then(setPendingAIResponse);
    router.setParams({ eventIdForMemory: undefined });
  }, [params.eventIdForMemory, pastEvents, goldenUsedIds]);

  const privateUnlocked = isPrivateSectionUnlocked(events, unlockedCodes);
  const plusUnlocked = isPlusSectionUnlocked(events, unlockedCodes);

  const realPrivateEvents = useMemo(
    () =>
      privateEvents.filter(
        (e) =>
          e.vipCode &&
          unlockedCodes.has((e.vipCode || "").trim().toLowerCase()),
      ),
    [privateEvents, unlockedCodes],
  );

  const hasNoEvents = useMemo(
    () => [
      false, // social: never disable orb; let user tap to see "No upcoming events" overlay (same as Plus)
      privateUnlocked && realPrivateEvents.length === 0,
      plusUnlocked && plusEvents.length === 0,
    ],
    [
      privateUnlocked,
      realPrivateEvents.length,
      plusUnlocked,
      plusEvents.length,
    ],
  );

  const hasUnseenEvents = useMemo(
    () => [
      socialEvents.some((e) => !seenIds.has(e.id)),
      realPrivateEvents.some((e) => !seenIds.has(e.id)),
      plusEvents.some((e) => !seenIds.has(e.id)),
    ],
    [socialEvents, realPrivateEvents, plusEvents, seenIds],
  );

  /** Private orbit: only real unlocked events (no mock placeholders). */
  const privateSlotList = useMemo(() => {
    return privateEvents.filter(
      (e) =>
        e.vipCode && unlockedCodes.has((e.vipCode || "").trim().toLowerCase()),
    );
  }, [privateEvents, unlockedCodes]);

  const communityEvents = useMemo(
    () => [socialEvents, privateSlotList, plusEvents],
    [socialEvents, privateSlotList, plusEvents],
  );
  /** Orbit list: upcoming events for this community + past attended (same type) when toggle on. */
  const listForPhase = useMemo(() => {
    if (phase === "orbs") return [];
    let base = communityEvents[focusedCommunityIndex] ?? [];
    if (hideFilledEvents) {
      base = base.filter((e) => !isEventFilled(e));
    }
    if (!showPastEvents) return base;
    const pastForCommunity = pastEvents.filter((e) => e.type === phase);
    return [...base, ...pastForCommunity];
  }, [
    phase,
    focusedCommunityIndex,
    communityEvents,
    showPastEvents,
    hideFilledEvents,
    pastEvents,
  ]);

  const listForPhaseRef = useRef<SferaEvent[]>(listForPhase);
  listForPhaseRef.current = listForPhase;

  const pastEventIds = useMemo(
    () => new Set(pastEvents.map((e) => e.id)),
    [pastEvents],
  );

  /** Scaled orbit layout (chevron position/size, no-upcoming overlay) so they match scaled event card size. */
  const orbitScaledLayout = useMemo(() => {
    const focusedEventSize = FOCUSED_EVENT_SIZE * fontScale;
    const chevronHeight = CHEVRON_HEIGHT * fontScale;
    const focusedEventBottomY =
      CENTER_Y +
      FOCUSED_ORB_SIZE / 2 +
      EVENT_BELOW_ORB_GAP * fontScale +
      focusedEventSize;
    const chevronTop =
      focusedEventBottomY - focusedEventSize / 2 - chevronHeight / 2;
    const noUpcomingTop = CENTER_Y + FOCUSED_ORB_SIZE / 2 + 24 * fontScale;
    return {
      chevronTop,
      chevronHeight,
      chevronWidth: 48 * fontScale,
      noUpcomingTop,
    };
  }, [fontScale]);

  /** Scaled styles for expanded Sfera event card (description, discount, link left-aligned). */
  const expandedCardScaledStyles = useMemo(
    () => ({
      card: {
        padding: EXPANDED_CARD_PADDING * fontScale,
        borderRadius: EXPANDED_CARD_RADIUS * fontScale,
      },
      cardHeader: { marginBottom: EXPANDED_HEADER_MARGIN_BOTTOM * fontScale },
      cardImage: {
        height: EXPANDED_IMAGE_HEIGHT * fontScale,
        borderRadius: EXPANDED_IMAGE_RADIUS * fontScale,
      },
      leftAlignedContent: {
        alignSelf: "stretch" as const,
        alignItems: "flex-start" as const,
        paddingLeft: 0,
        marginLeft: 0,
      },
      label: {
        marginTop: EXPANDED_LABEL_MARGIN_TOP * fontScale,
        paddingLeft: 0,
      },
      description: {
        marginTop: EXPANDED_DESC_MARGIN_TOP * fontScale,
        paddingLeft: 0,
      },
      discountSection: {
        marginTop: EXPANDED_DISCOUNT_SECTION_MARGIN_TOP * fontScale,
        paddingLeft: 0,
        marginLeft: 0,
        alignSelf: "stretch" as const,
        alignItems: "flex-start" as const,
        width: "100%" as const,
      },
      discountHint: {
        marginBottom: EXPANDED_DISCOUNT_HINT_MARGIN_BOTTOM * fontScale,
      },
      discountCode: {
        padding: EXPANDED_DISCOUNT_CODE_PADDING * fontScale,
        borderRadius: EXPANDED_DISCOUNT_CODE_RADIUS * fontScale,
      },
      discountBadgeWrap: {
        minHeight: EXPANDED_DISCOUNT_BADGE_HEIGHT * fontScale,
        alignSelf: "flex-start" as const,
        overflow: "visible" as const,
      },
      discountBadgeImage: {
        width: EXPANDED_DISCOUNT_BADGE_HEIGHT * fontScale * 4,
        height: EXPANDED_DISCOUNT_BADGE_HEIGHT * fontScale,
        marginLeft: -48 * fontScale,
      },
      eventLink: {
        marginTop: EXPANDED_EVENT_LINK_MARGIN_TOP * fontScale,
        paddingLeft: 0,
      },
      actions: {
        marginTop: EXPANDED_ACTIONS_MARGIN_TOP * fontScale,
        alignSelf: "stretch" as const,
      },
      joinBtn: {
        paddingVertical: EXPANDED_BTN_PADDING_V * fontScale,
        paddingHorizontal: EXPANDED_BTN_PADDING_H * fontScale,
        borderRadius: EXPANDED_BTN_RADIUS * fontScale,
        minWidth: EXPANDED_BTN_MIN_WIDTH * fontScale,
      },
      joinBtnImage: {
        width: JOIN_IMAGE_WIDTH * fontScale,
        height: JOIN_IMAGE_HEIGHT * fontScale,
      },
      joinBtnImageWrap: {
        paddingVertical: 0,
        paddingHorizontal: 0,
        minWidth: JOIN_IMAGE_WIDTH * fontScale,
        minHeight: JOIN_IMAGE_HEIGHT * fontScale,
        alignSelf: "flex-end" as const,
        marginRight: -58 * fontScale,
      },
      leaveBtn: {
        paddingVertical: EXPANDED_BTN_PADDING_V * fontScale,
        paddingHorizontal: EXPANDED_BTN_PADDING_H * fontScale,
        borderRadius: EXPANDED_BTN_RADIUS * fontScale,
        minWidth: EXPANDED_BTN_MIN_WIDTH * fontScale,
      },
    }),
    [fontScale],
  );

  const removePastEventFromOrbit = useCallback(async (eventId: string) => {
    // Optimistic update: immediately remove from UI
    setPastEvents((prev) => prev.filter((e) => e.id !== eventId));
    setAttendingIds((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
    setExpandedEventId(null);

    // Perform async cleanup in background
    await removeAttendedEventSnapshotsByIds([eventId]);
    await removeAttendingEventId(eventId);
    await removeEventReminderScheduledIds([eventId]);
    await removeEventGoldenMemoryUsedIds([eventId]);
    await clearEventReminderInAppForEvent(eventId);
    await cancelEventMemoryReminders(eventId);
  }, []);

  /**
   * While `phase === "orbs"`, `listForPhase` is empty so the phase/list effect bails — Reanimated
   * shared values would otherwise keep the last in-community orbit. That leaves e.g. shared focus 4
   * while React `focusedEventIndex` is 0 after goBack, then a huge snap when re-entering social.
   */
  const zeroEventOrbitSharedForNavigation = useCallback(() => {
    cancelAnimation(eventOrbitAngle);
    cancelAnimation(orbitFocusSwipeProgress);
    orbitFocusSwipeProgress.value = 1;
    focusedEventIndexRef.current = 0;
    focusedEventIndexShared.value = 0;
    orbitSwipeFromIdx.value = 0;
    orbitSwipeToIdx.value = 0;
    eventOrbitAngle.value = 0;
    orbitSwipeAngleStart.value = 0;
    orbitSwipeAngleEnd.value = 0;
    setOrbitCardTransition(null);
  }, [
    eventOrbitAngle,
    orbitFocusSwipeProgress,
    focusedEventIndexShared,
    orbitSwipeFromIdx,
    orbitSwipeToIdx,
    orbitSwipeAngleStart,
    orbitSwipeAngleEnd,
  ]);

  // When entering community or list length changes: clamp focused index and set orbit angle (do not run when only focus changes so left/right can animate)
  useEffect(() => {
    if (phase === "orbs" || listForPhase.length === 0) return;
    const n = listForPhase.length;
    const step = (2 * Math.PI) / n;
    const nextFocus = Math.min(focusedEventIndex, n - 1);
    if (nextFocus !== focusedEventIndex) setFocusedEventIndex(nextFocus);
    const settled = nextFocus * step;
    eventOrbitAngle.value = settled;
    focusedEventIndexRef.current = nextFocus;
    focusedEventIndexShared.value = nextFocus;
    orbitSwipeFromIdx.value = nextFocus;
    orbitSwipeToIdx.value = nextFocus;
    orbitFocusSwipeProgress.value = 1;
    orbitSwipeAngleStart.value = settled;
    orbitSwipeAngleEnd.value = settled;
    // Only phase / list length should re-sync orbit; omit focusedEventIndex, eventOrbitAngle, focusedEventIndexShared so swipe next/prev does not reset the running animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps
  }, [phase, listForPhase.length]);

  const openCodeModal = useCallback((forSection: "private" | "plus") => {
    setCodeModal({ visible: true, for: forSection });
    setCodeInput("");
    setCodeError(null);
  }, []);

  const closeCodeModal = useCallback(() => {
    setCodeModal({ visible: false, for: null });
    setCodeInput("");
    setCodeError(null);
  }, []);

  const submitCode = useCallback(async () => {
    const forSection = codeModal.for;
    if (!forSection) return;
    const code = codeInput.trim();
    if (!code) {
      setCodeError(t("events.vipCodeRequired"));
      return;
    }
    const valid = validateCodeForSection(events, forSection, code);
    if (!valid) {
      setCodeError(t("events.vipCodeInvalid"));
      return;
    }
    await addUnlockedVipCode(code);
    await loadUnlocked();
    closeCodeModal();
    if (forSection === "plus") {
      const idx = 2;
      selectedOrbIndex.value = idx;
      setFocusedCommunityIndex(idx);
      setFocusedEventIndex(0);
      zeroEventOrbitSharedForNavigation();
      orbExitProgress.value = withTiming(1, { duration: 320 }, () => {
        runOnJS(setPhase)(forSection);
        runOnJS(setSelectedType)(forSection);
      });
    }
  }, [
    codeInput,
    codeModal.for,
    events,
    t,
    loadUnlocked,
    closeCodeModal,
    selectedOrbIndex,
    orbExitProgress,
    zeroEventOrbitSharedForNavigation,
  ]);

  const eventCount = listForPhase.length;

  const clearOrbitCardTransition = useCallback(() => {
    setOrbitCardTransition(null);
  }, []);

  /** Worklets cannot capture `useCallback` closures; use a stable runOnJS + ref to latest impl. */
  const onOrbitSwipeNativeCompleteRef = useRef<(settledIdx: number) => void>(
    () => {},
  );
  onOrbitSwipeNativeCompleteRef.current = (settledIdx: number) => {
    eventsOrbitLogSwipe("runOnJS:afterNativeSwipe", {
      settledIdx,
      reactFocusRef: focusedEventIndexRef.current,
    });
    clearOrbitCardTransition();
    eventsOrbitLogSwipe("js:afterClearOrbitCardTransition", {
      settledIdx,
      ts: Date.now(),
    });
  };
  const onOrbitSwipeNativeComplete = useCallback(
    (settledIdx: number) => {
      onOrbitSwipeNativeCompleteRef.current(settledIdx);
    },
    [],
  );

  useAnimatedReaction(
    () => {
      "worklet";
      if (!__DEV__) {
        return -2;
      }
      const from = Math.round(orbitSwipeFromIdx.value);
      const to = Math.round(orbitSwipeToIdx.value);
      if (from === to) {
        return -1;
      }
      const a0 = orbitSwipeAngleStart.value;
      const a1 = orbitSwipeAngleEnd.value;
      const ac = eventOrbitAngle.value;
      const span = a1 - a0;
      if (Math.abs(span) < 1e-7) {
        return 0;
      }
      const p = Math.max(0, Math.min(1, (ac - a0) / span));
      return Math.min(9, Math.max(0, Math.floor(p * 10)));
    },
    (bucket, prev) => {
      "worklet";
      if (!__DEV__) {
        return;
      }
      if (bucket === -1) {
        if (typeof prev === "number" && prev >= 0) {
          runOnJS(eventsOrbitLogSwipeTrackEnd)();
        }
        return;
      }
      if (bucket < 0) {
        return;
      }
      if (bucket !== prev) {
        const from = Math.round(orbitSwipeFromIdx.value);
        const to = Math.round(orbitSwipeToIdx.value);
        const a0 = orbitSwipeAngleStart.value;
        const a1 = orbitSwipeAngleEnd.value;
        const ac = eventOrbitAngle.value;
        const span = a1 - a0;
        const pAngle =
          Math.abs(span) < 1e-7
            ? 0
            : Math.max(0, Math.min(1, (ac - a0) / span));
        runOnJS(eventsOrbitLogSwipeTrack)({
          approxPct: bucket * 10,
          pAngle,
          pOrbitProgressSV: orbitFocusSwipeProgress.value,
          angle: ac,
          a0,
          a1,
          from,
          to,
        });
      }
    },
  );

  const selectOrb = useCallback(
    (index: number) => {
      // Dismiss finger hint immediately when user taps any sfera
      if (appUsabilityHints && !eventsCommunitiesRotationStarted) {
        cancelAnimation(eventsFingerOpacity);
        cancelAnimation(eventsFingerScale);
        eventsFingerOpacity.value = 0;
        setEventsCommunitiesRotationStarted(true);
      }
      const type: SferaEventType =
        index === 0 ? "social" : index === 1 ? "private" : "plus";
      selectedOrbIndex.value = index;
      setFocusedCommunityIndex(index);
      setFocusedEventIndex(0);
      zeroEventOrbitSharedForNavigation();
      orbExitProgress.value = withTiming(1, { duration: 320 }, () => {
        runOnJS(setPhase)(type);
        runOnJS(setSelectedType)(type);
      });
      // Fade out location banner when entering community view
      locationBannerOpacity.value = withDelay(
        500,
        withTiming(0, { duration: 2000 }),
      );
    },
    [
      selectedOrbIndex,
      orbExitProgress,
      locationBannerOpacity,
      appUsabilityHints,
      eventsCommunitiesRotationStarted,
      eventsFingerOpacity,
      eventsFingerScale,
      zeroEventOrbitSharedForNavigation,
    ],
  );

  const goBackToOrbs = useCallback(() => {
    setExpandedEventId(null);
    setPhase("orbs");
    setSelectedType(null);
    setFocusedCommunityIndex(0);
    setFocusedEventIndex(0);
    zeroEventOrbitSharedForNavigation();
    orbExitProgress.value = withTiming(0, { duration: 280 });
    // Fade in location banner when returning to orbs view
    locationBannerOpacity.value = withTiming(1, { duration: 400 });
  }, [orbExitProgress, locationBannerOpacity, zeroEventOrbitSharedForNavigation]);

  const handleLocationIndicatorPress = useCallback(async () => {
    const status = await requestLocationPermission();
    if (status === "granted") {
      // Clear the decline flag since user granted permission
      await clearLocationDeclinedByUser();
      setLocationPermissionDenied(false);
      void loadEvents();
    } else if (status === "denied") {
      // Permission still denied, show alert to go to Settings
      Alert.alert(
        t("events.locationModalTitle"),
        t("events.locationOpenSettingsMessage"),
        [
          { text: t("common.cancel") },
          {
            text: t("events.locationOpenSettingsButton"),
            onPress: () => Linking.openSettings(),
          },
        ],
      );
    }
  }, [loadEvents, t]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();

      // Reset finger-hint state after a short delay so the location/notification modal can show first (400ms) if needed
      const delayMs = 500;
      const resetTimeoutId = setTimeout(() => {
        fingerHintShownRef.current = false;
        setEventsCommunitiesRotationStarted(false);
      }, delayMs);

      (async () => {
        // Check if user previously declined location permission
        const declined = await isLocationDeclinedByUser();
        const currentStatus = await getLocationPermissionStatus();

        if (currentStatus === "granted") {
          await clearLocationDeclinedByUser();
          setLocationPermissionDenied(false);
          return;
        }

        if (currentStatus === "denied") {
          setLocationPermissionDenied(true);
          if (!declined) {
            setTimeout(() => setLocationModalVisible(true), 400);
          }
          return;
        }

        // Undetermined: only request when user hasn't previously dismissed the modal.
        if (!declined) {
          const requestedStatus = await requestLocationPermission();
          if (requestedStatus === "denied") {
            setTimeout(() => setLocationModalVisible(true), 400);
            setLocationPermissionDenied(true);
          } else if (requestedStatus === "granted") {
            await clearLocationDeclinedByUser();
            setLocationPermissionDenied(false);
          }
        } else {
          setLocationPermissionDenied(true);
        }
      })();

      const unsubscribe = onEventsTabPress(() => {
        if (phaseRef.current !== "orbs") goBackToOrbs();
      });
      return () => {
        clearTimeout(resetTimeoutId);
        unsubscribe();
      };
    }, [loadEvents, goBackToOrbs]),
  );

  const moveOrbitFocus = useCallback(
    (delta: 1 | -1) => {
      if (eventCount <= 1) return;
      const step = (2 * Math.PI) / eventCount;
      // SharedValue `.value` read on the JS thread can lag writes in the same turn; use a ref we
      // bump synchronously so next/prev never "misses" a step (cards stuck / need multiple swipes).
      const normalizedCurrent =
        ((focusedEventIndexRef.current % eventCount) + eventCount) % eventCount;
      const newIdx = (normalizedCurrent + delta + eventCount) % eventCount;
      // Layout assumes eventOrbitAngle ≡ focusIndex * step (mod 2π). Snap start to the current
      // index each swipe; animate by exactly one slot (`delta * step`) so wraps (last→first / first→last)
      // rotate one step instead of taking the long way (`newIdx * step` − start was e.g. −13·step).
      const angleCanonicalStart = normalizedCurrent * step;
      const angleDelta = delta * step;
      const angleTarget = angleCanonicalStart + angleDelta;
      setOrbitCardTransition({ from: normalizedCurrent, to: newIdx });
      orbitSwipeFromIdx.value = normalizedCurrent;
      orbitSwipeToIdx.value = newIdx;
      cancelAnimation(eventOrbitAngle);
      cancelAnimation(orbitFocusSwipeProgress);
      orbitFocusSwipeProgress.value = 0;
      orbitSwipeAngleStart.value = angleCanonicalStart;
      orbitSwipeAngleEnd.value = angleTarget;
      eventOrbitAngle.value = angleCanonicalStart;
      // Shared first so UI worklets see the new focus before React re-renders; avoids one-frame chrome/layout mismatch.
      focusedEventIndexShared.value = newIdx;
      focusedEventIndexRef.current = newIdx;
      setFocusedEventIndex(newIdx);
      const ec = {
        duration: EVENT_ORBIT_DURATION,
        easing: EVENT_ORBIT_EASING,
      };
      eventsOrbitLogSwipe("moveOrbitFocus:start", {
        delta,
        fromIdx: normalizedCurrent,
        toIdx: newIdx,
        angleStartRad: angleCanonicalStart,
        angleTargetRad: angleTarget,
        stepRad: step,
        durationMs: EVENT_ORBIT_DURATION,
      });
      eventOrbitAngle.value = withTiming(
        angleTarget,
        ec,
        (finished) => {
          "worklet";
          if (finished) {
            const idx = Math.round(focusedEventIndexShared.value);
            const aSettled = idx * step;
            eventOrbitAngle.value = aSettled;
            orbitSwipeAngleStart.value = aSettled;
            orbitSwipeAngleEnd.value = aSettled;
            orbitSwipeFromIdx.value = idx;
            orbitSwipeToIdx.value = idx;
            runOnJS(eventsOrbitLogSwipeWorkletComplete)({
              idx,
              aSettled,
              angleTarget,
              stepRad: step,
            });
            runOnJS(onOrbitSwipeNativeComplete)(idx);
          }
        },
      );
      orbitFocusSwipeProgress.value = withTiming(1, ec);
    },
    [
      eventCount,
      eventOrbitAngle,
      focusedEventIndexShared,
      orbitFocusSwipeProgress,
      orbitSwipeFromIdx,
      orbitSwipeToIdx,
      orbitSwipeAngleStart,
      orbitSwipeAngleEnd,
      onOrbitSwipeNativeComplete,
    ],
  );

  const goToPrevEvent = useCallback(() => {
    moveOrbitFocus(-1);
  }, [moveOrbitFocus]);

  const goToNextEvent = useCallback(() => {
    moveOrbitFocus(1);
  }, [moveOrbitFocus]);

  // Side strips: vertical drag (up = prev, down = next). Center: horizontal matches chevrons (left = next, right = prev).
  const SIDE_REGION_WIDTH = 0.35;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (phase === "orbs" || eventCount <= 1) return false;
          const startX = g.moveX - g.dx;
          const inSideRegion =
            startX < SCREEN_WIDTH * SIDE_REGION_WIDTH ||
            startX > SCREEN_WIDTH * (1 - SIDE_REGION_WIDTH);
          if (inSideRegion) {
            return Math.abs(g.dy) > 20 && Math.abs(g.dy) > Math.abs(g.dx * 1.5);
          }
          return Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy * 1.5);
        },
        onMoveShouldSetPanResponderCapture: (_, g) => {
          if (phase === "orbs" || eventCount <= 1) return false;
          const startX = g.moveX - g.dx;
          const inSideRegion =
            startX < SCREEN_WIDTH * SIDE_REGION_WIDTH ||
            startX > SCREEN_WIDTH * (1 - SIDE_REGION_WIDTH);
          if (inSideRegion) {
            return Math.abs(g.dy) > 20 && Math.abs(g.dy) > Math.abs(g.dx * 1.5);
          }
          return Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy * 1.5);
        },
        onPanResponderRelease: (_, g) => {
          if (phase === "orbs" || eventCount <= 1) return;
          const startX = g.moveX - g.dx;
          const inSideRegion =
            startX < SCREEN_WIDTH * SIDE_REGION_WIDTH ||
            startX > SCREEN_WIDTH * (1 - SIDE_REGION_WIDTH);
          if (inSideRegion) {
            if (g.dy < -50) {
              eventsOrbitLogSwipe("pan:side", { go: "prev", dy: g.dy, dx: g.dx });
              goToPrevEvent();
            } else if (g.dy > 50) {
              eventsOrbitLogSwipe("pan:side", { go: "next", dy: g.dy, dx: g.dx });
              goToNextEvent();
            }
          } else {
            if (g.dx < -50) {
              eventsOrbitLogSwipe("pan:center", { go: "next", dx: g.dx, dy: g.dy });
              goToNextEvent();
            } else if (g.dx > 50) {
              eventsOrbitLogSwipe("pan:center", { go: "prev", dx: g.dx, dy: g.dy });
              goToPrevEvent();
            }
          }
        },
      }),
    [phase, eventCount, goToPrevEvent, goToNextEvent],
  );

  const eventsRevealStyle = useAnimatedStyle(() => ({
    opacity: eventsRevealProgress.value,
  }));

  const eventsFingerHintStyle = useAnimatedStyle(() => ({
    opacity: eventsFingerOpacity.value,
    transform: [{ scale: eventsFingerScale.value }],
  }));


  const sectionLabel = (type: SferaEventType) =>
    type === "social"
      ? t("events.section.social")
      : type === "private"
        ? t("events.section.private")
        : t("events.section.plus");
  const focusedCommunityType = COMMUNITY_TYPES[focusedCommunityIndex];
  const tabBarGestureExclusionHeight =
    Math.round(78 * fontScale) +
    Math.max(12, insets.bottom + 12 - 20 * fontScale);

  return (
    <TabScreenContainer>
      <ConstellationBackground
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        constellationAmount={constellationAmount}
        constellationOpacity={constellationOpacity}
      />
      <SparkledDots
        centerX={CENTER_X}
        centerY={CENTER_Y}
        avatarSize={ORB_SIZE}
        colorScheme={colorScheme ?? "dark"}
        sunnyBackground={momentColors.sunny.background}
      />

      {/* Background refresh indicator — centre of the orbs orbit */}
      {(isRefreshing || isLoadingEvents) && phase === "orbs" && (
        <View
          style={{
            position: "absolute",
            left: CENTER_X - 18,
            top: CENTER_Y - 18,
            zIndex: 1000,
            opacity: 0.5,
          }}
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Location permission denied indicator */}
      {locationPermissionDenied && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: insets.top + 12,
              left: 16,
              right: 16,
              zIndex: 999,
            },
            locationBannerAnimatedStyle,
          ]}
          pointerEvents={phase === "orbs" ? "auto" : "none"}
        >
          <Pressable
            onPress={handleLocationIndicatorPress}
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: colors.primary + "40",
              },
            ]}
          >
            <MaterialIcons
              name="location-off"
              size={20}
              color={colors.primary}
            />
            <ThemedText
              size="xs"
              style={{ flex: 1, color: colors.textMediumEmphasis }}
            >
              {t("events.globalEventsOnly")}
            </ThemedText>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={colors.textDisabled}
            />
          </Pressable>
        </Animated.View>
      )}

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Finger hint over Sfera Social (before rotation starts), controlled by Personalization → Usability */}
        {phase === "orbs" &&
          appUsabilityHints &&
          !eventsCommunitiesRotationStarted &&
          (() => {
            const fingerSize = 56 * fontScale;
            const fingerOffsetFromOrbTop = 98 * fontScale;
            return (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    left: CENTER_X + ORB_RADIUS - fingerSize / 2,
                    top: CENTER_Y - ORB_SIZE / 2 + fingerOffsetFromOrbTop,
                    width: fingerSize,
                    height: fingerSize,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 100,
                  },
                  eventsFingerHintStyle,
                ]}
              >
                {/* Shadow layer for better contrast */}
                <MaterialIcons
                  name="touch-app"
                  size={fingerSize}
                  color="rgba(0, 0, 0, 0.4)"
                  style={{
                    position: "absolute",
                    left: 2,
                    top: 2,
                  }}
                />
                <MaterialIcons
                  name="touch-app"
                  size={fingerSize}
                  color={colorScheme === "dark" ? "#FFFFFF" : "#FFFFFF"}
                />
              </Animated.View>
            );
          })()}
        {/* ─── Phase: 3 orbs floating ─── */}
        {ORB_ANGLES.map((baseAngle, index) => {
          const type: SferaEventType =
            index === 0 ? "social" : index === 1 ? "private" : "plus";
          const isLocked = type === "private" && !privateUnlocked;
          return (
            <FloatingOrb
              key={type}
              index={index}
              baseAngle={baseAngle}
              type={type}
              isLocked={isLocked}
              label={sectionLabel(type)}
              orbitAngle={orbitAngle}
              orbExitProgress={orbExitProgress}
              selectedOrbIndex={selectedOrbIndex}
              hideCenteredOrb={hideCenteredOrb}
              phase={phase}
              onPress={() => selectOrb(index)}
              colorScheme={colorScheme ?? "dark"}
              colors={colors}
              hasUnseenEvents={hasUnseenEvents[index]}
              hasNoEvents={hasNoEvents[index]}
              noUpcomingEventsLabel={t("events.noUpcomingEvents")}
            />
          );
        })}

        {/* ─── Phase: selected Sfera Community has moved to center (same orb, no duplicate); events appear after ─── */}
        {phase !== "orbs" && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { bottom: tabBarGestureExclusionHeight },
            ]}
            {...panResponder.panHandlers}
          >
            <Animated.View
              style={[StyleSheet.absoluteFill, eventsRevealStyle]}
              pointerEvents="box-none"
            >
              {/* One card per event as siblings of the orb; zIndex in worklet keeps back arc under orb, growing/focused above. */}
              {listForPhase.map((event, idx) => {
                const showFocusedChrome =
                  (idx - focusedEventIndex + listForPhase.length) %
                    Math.max(1, listForPhase.length) ===
                    0 ||
                  (!!orbitCardTransition &&
                    (idx === orbitCardTransition.from ||
                      idx === orbitCardTransition.to));
                return (
                  <OrbitalEventCard
                    key={event.id}
                    event={event}
                    eventIndex={idx}
                    totalCount={Math.max(1, listForPhase.length)}
                    focusedEventIndex={focusedEventIndex}
                    eventOrbitAngle={eventOrbitAngle}
                    focusedEventIndexShared={focusedEventIndexShared}
                    orbitSwipeFromIdx={orbitSwipeFromIdx}
                    orbitSwipeToIdx={orbitSwipeToIdx}
                    orbitFocusSwipeProgress={orbitFocusSwipeProgress}
                    orbitSwipeAngleStart={orbitSwipeAngleStart}
                    orbitSwipeAngleEnd={orbitSwipeAngleEnd}
                    showFocusedChrome={showFocusedChrome}
                    colorScheme={colorScheme ?? "dark"}
                    colors={colors}
                    isLocked={false}
                    isUnseen={!seenIds.has(event.id)}
                    isAttending={attendingIds.has(event.id)}
                    isPastEvent={pastEventIds.has(event.id)}
                    onDeletePress={(ev) => removePastEventFromOrbit(ev.id)}
                    onFocusPress={(e) => {
                      if (phase === "private" && !privateUnlocked)
                        openCodeModal("private");
                      else {
                        setExpandedEventId(e.id);
                        markEventAsSeen(e.id);
                        setSeenIds((prev) => new Set(prev).add(e.id));
                      }
                    }}
                    fontScale={fontScale}
                  />
                );
              })}

              {/* Centered Sfera Community orb – tap to go back to all communities; pulses every 5s */}
              <CenterOrbPlaceholder
                type={focusedCommunityType}
                label={sectionLabel(focusedCommunityType)}
                onPress={goBackToOrbs}
                onPulseStart={() => {}}
                onPulseEnd={() => {}}
                colorScheme={colorScheme ?? "dark"}
                colors={colors}
                hasUnseenEvents={hasUnseenEvents[focusedCommunityIndex]}
                eventCount={listForPhase.filter(event => !seenIds.has(event.id)).length}
              />
              {listForPhase.length === 0 ? (
                <View
                  style={[
                    styles.noUpcomingEventsOverlay,
                    { top: orbitScaledLayout.noUpcomingTop },
                  ]}
                >
                  <ThemedText
                    size="sm"
                    weight="medium"
                    style={styles.noUpcomingEventsText}
                  >
                    {t("events.noUpcomingEvents")}
                  </ThemedText>
                </View>
              ) : null}

              {/* Left/right to focus prev/next Sfera Event – positioned lower on screen */}
              {listForPhase.length > 1 ? (
                <>
                  <ChevronNavButton
                    direction="left"
                    onPress={goToNextEvent}
                    colors={colors}
                    style={[
                      styles.chevron,
                      styles.chevronLeft,
                      {
                        top: orbitScaledLayout.chevronTop,
                        width: orbitScaledLayout.chevronWidth,
                        height: orbitScaledLayout.chevronHeight,
                      },
                    ]}
                  />
                  <ChevronNavButton
                    direction="right"
                    onPress={goToPrevEvent}
                    colors={colors}
                    style={[
                      styles.chevron,
                      styles.chevronRight,
                      {
                        top: orbitScaledLayout.chevronTop,
                        width: orbitScaledLayout.chevronWidth,
                        height: orbitScaledLayout.chevronHeight,
                      },
                    ]}
                  />
                </>
              ) : null}

              {phase === "private" ? (
                <Pressable
                  onPress={() => {
                    openCodeModal("private");
                    void loadEvents(); // refetch in background without blocking the modal
                  }}
                  style={[
                    styles.unlockPlusButton,
                    {
                      bottom: 20 + insets.bottom,
                      right: 20 + insets.right,
                      backgroundColor: fabAccentBackground,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="add"
                    size={28}
                    color={colorScheme === "dark" ? "#1A2332" : "#fff"}
                  />
                </Pressable>
              ) : null}

              {/* Back arrow: return to main view with 3 floating Sfera communities */}
              <Pressable
                onPress={goBackToOrbs}
                style={[
                  styles.filterIconButton,
                  {
                    top: 8 + insets.top,
                    left: 16 + insets.left,
                    backgroundColor: colors.background,
                    borderColor: colors.text + "40",
                  },
                ]}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.primary}
                />
              </Pressable>

              {/* Centered community title */}
              <View
                style={[
                  styles.sferaCommunitiesTitle,
                  {
                    top: 8 + insets.top,
                  },
                ]}
              >
                <ThemedText
                  size="lg"
                  weight="bold"
                  style={{ color: colors.text }}
                >
                  {sectionLabel(focusedCommunityType)}
                </ThemedText>
              </View>

              {/* Filter icon: opens modal with past events + filled events toggles */}
              <Pressable
                onPress={() => setFilterModalVisible(true)}
                style={[
                  styles.filterIconButton,
                  {
                    top: 8 + insets.top,
                    right: 16 + insets.right,
                    backgroundColor: colors.background,
                    borderColor: colors.text + "40",
                  },
                ]}
              >
                <MaterialIcons
                  name="filter-list"
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            </Animated.View>
          </View>
        )}

        {/* Title when showing 3 orbs */}
        {phase === "orbs" && (
          <View
            style={[styles.sferaCommunitiesTitle, { top: insets.top }]}
            pointerEvents="none"
          >
            <ThemedText size="l" weight="bold" letterSpacing="l">
              {t("events.sferaCommunities")}
            </ThemedText>
          </View>
        )}
      </View>

      {expandedEventId ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => {
            setExpandedEventId(null);
            setExpandedImageError(false);
            setExpandedCardSize(null);
            setDescriptionExpanded(false);
          }}
          onShow={() => setExpandedImageError(false)}
        >
          {(() => {
            const expandedEvent =
              listForPhase.find((e) => e.id === expandedEventId) ??
              events.find((e) => e.id === expandedEventId) ??
              pastEvents.find((e) => e.id === expandedEventId);
            if (!expandedEvent) return null;
            const expandedImageUrls = getEventImageUrls(expandedEvent);
            const hasImages =
              expandedImageUrls.length > 0 && !expandedImageError;

            const renderExpandedActions = () => (
              <View
                style={[
                  styles.expandedActions,
                  expandedCardScaledStyles.actions,
                ]}
              >
                {pastEventIds.has(expandedEvent.id) ? (
                  goldenUsedIds.has(expandedEvent.id) ? (
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={{ color: colors.textMediumEmphasis }}
                    >
                      {t("events.memoryCreated")}
                    </ThemedText>
                  ) : (
                    <Pressable
                      style={[
                        styles.expandedJoinBtn,
                        expandedCardScaledStyles.joinBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => {
                        setGoldenEventIdForModal(expandedEvent.id);
                        setAiModalVisible(true);
                        getPendingAIResponse().then(setPendingAIResponse);
                        setExpandedEventId(null);
                        setExpandedImageError(false);
                      }}
                    >
                      <MaterialIcons
                        name="auto-awesome"
                        size={18 * fontScale}
                        color="#1A2332"
                      />
                      <ThemedText
                        size="sm"
                        weight="bold"
                        style={[
                          styles.createMemoryBtnText,
                          { marginLeft: 6 * fontScale },
                        ]}
                      >
                        {t("events.createMemoryForEvent")}
                      </ThemedText>
                    </Pressable>
                  )
                ) : attendingIds.has(expandedEvent.id) ? (
                  <Pressable
                    style={[
                      styles.expandedLeaveBtn,
                      expandedCardScaledStyles.leaveBtn,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.text + "40",
                      },
                    ]}
                    onPress={async () => {
                      if (attendanceLoading) return;
                      setAttendanceLoading(true);
                      try {
                        const ok = await updateEventStatus(
                          expandedEvent.id,
                          "leave",
                        );
                        if (ok) {
                          await removeAttendingEventId(expandedEvent.id);
                          await removeAttendedEventSnapshotsByIds([
                            expandedEvent.id,
                          ]);
                          // Cancel all scheduled reminders for this event
                          await clearEventReminderInAppForEvent(
                            expandedEvent.id,
                          );
                          await cancelEventMemoryReminders(expandedEvent.id);
                          setAttendingIds((prev) => {
                            const next = new Set(prev);
                            next.delete(expandedEvent.id);
                            return next;
                          });
                          setExpandedEventId(null);
                          setExpandedImageError(false);
                        } else {
                          Alert.alert(t("events.leaveError"), undefined, [
                            { text: "OK" },
                          ]);
                        }
                      } finally {
                        setAttendanceLoading(false);
                      }
                    }}
                    disabled={attendanceLoading}
                  >
                    {attendanceLoading ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <ThemedText size="sm" weight="medium">
                        {t("events.leave")}
                      </ThemedText>
                    )}
                  </Pressable>
                ) : isEventFilled(expandedEvent) ? (
                  <View
                    style={[
                      styles.expandedJoinBtn,
                      expandedCardScaledStyles.joinBtn,
                      {
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.text + "40",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6 * fontScale,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="event-busy"
                      size={18 * fontScale}
                      color={colors.textMediumEmphasis}
                    />
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={{ color: colors.textMediumEmphasis }}
                    >
                      {t("events.eventFilled")}
                    </ThemedText>
                  </View>
                ) : (
                  <Pressable
                    style={[
                      styles.expandedJoinBtn,
                      expandedCardScaledStyles.joinBtn,
                      { overflow: "hidden", alignSelf: "flex-end" },
                    ]}
                    onPress={async () => {
                      if (attendanceLoading) return;
                      setAttendanceLoading(true);
                      try {
                        const ok = await updateEventStatus(
                          expandedEvent.id,
                          "join",
                        );
                        if (ok) {
                          await addAttendingEventId(expandedEvent.id);
                          await addAttendedEventSnapshot(expandedEvent);
                          setAttendingIds((prev) =>
                            new Set(prev).add(expandedEvent.id),
                          );
                          // Schedule reminder notifications immediately
                          await scheduleEventRemindersOnJoin(expandedEvent);
                          void loadEvents();
                        } else {
                          Alert.alert(t("events.joinError"), undefined, [
                            { text: "OK" },
                          ]);
                        }
                      } finally {
                        setAttendanceLoading(false);
                      }
                    }}
                    disabled={attendanceLoading}
                  >
                    {attendanceLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Animated.View style={joinPulseAnimatedStyle}>
                        <LinearGradient
                          colors={["#64B5F6", "#42A5F5", "#1E88E5"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.expandedJoinBtn,
                            expandedCardScaledStyles.joinBtn,
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8 * fontScale,
                              paddingVertical:
                                EXPANDED_BTN_PADDING_V * fontScale,
                              paddingHorizontal:
                                EXPANDED_BTN_PADDING_H * fontScale,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="event-available"
                            size={20 * fontScale}
                            color="#fff"
                          />
                          <ThemedText
                            size="sm"
                            weight="bold"
                            style={{ color: "#fff" }}
                          >
                            {(() => {
                              const seatsLeft = getSeatsLeft(expandedEvent);
                              const joinText = t("events.join");
                              if (seatsLeft != null) {
                                return `${joinText} • ${t("events.seatsLeft").replace("{count}", String(seatsLeft))}`;
                              }
                              return joinText;
                            })()}
                          </ThemedText>
                        </LinearGradient>
                      </Animated.View>
                    )}
                  </Pressable>
                )}
              </View>
            );

            return (
              <Pressable
                style={styles.expandedBackdrop}
                onPress={() => {
                  setExpandedEventId(null);
                  setExpandedImageError(false);
                  setExpandedCardSize(null);
                  setDescriptionExpanded(false);
                }}
              >
                <Pressable
                  style={[
                    styles.expandedCard,
                    expandedCardScaledStyles.card,
                    {
                      backgroundColor: colors.background,
                      borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                    },
                    descriptionExpanded && styles.expandedCardFullScreen,
                    descriptionExpanded && {
                      paddingTop: 24 + insets.top,
                      paddingBottom: 24 + insets.bottom,
                    },
                  ]}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    setExpandedCardSize({ w: width, h: height });
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  {/* Subtle universe/constellation layer behind card content */}
                  {expandedCardSize &&
                  expandedCardSize.w > 0 &&
                  expandedCardSize.h > 0 ? (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          overflow: "hidden",
                          borderRadius: EXPANDED_CARD_RADIUS * fontScale,
                          opacity: 0.12,
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <ConstellationBackground
                        width={expandedCardSize.w}
                        height={expandedCardSize.h}
                        constellationAmount={4}
                        constellationOpacity={13}
                        linesOpacityScale={0.35}
                        starFieldMultiplier={0.5}
                      />
                    </View>
                  ) : null}
                  <View
                    style={[styles.expandedCardBody, { flex: 1, zIndex: 1 }]}
                  >
                    <View
                      style={[
                        styles.expandedCardHeader,
                        expandedCardScaledStyles.cardHeader,
                        { paddingTop: 20 * fontScale, paddingBottom: 16 * fontScale },
                      ]}
                    >
                      <ThemedText
                        size="l"
                        weight="bold"
                        numberOfLines={descriptionExpanded ? 1 : 2}
                        style={{ flex: 1, paddingRight: 12 * fontScale }}
                      >
                        {expandedEvent.name}
                      </ThemedText>
                      {!descriptionExpanded ? (
                        <Pressable
                          onPress={() => {
                            setExpandedEventId(null);
                            setExpandedImageError(false);
                            setExpandedCardSize(null);
                            setDescriptionExpanded(false);
                          }}
                          hitSlop={12}
                        >
                          <MaterialIcons
                            name="close"
                            size={28}
                            color={colors.text}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                    {descriptionExpanded ? (
                      <>
                        <ScrollView
                          style={styles.expandedDescriptionScroll}
                          contentContainerStyle={
                            styles.expandedDescriptionScrollContent
                          }
                          showsVerticalScrollIndicator={true}
                        >
                          <ThemedText
                            size="sm"
                            selectable={false}
                            style={styles.expandedDescriptionFull}
                          >
                            {expandedEvent.description}
                          </ThemedText>
                        </ScrollView>
                        <Pressable
                          onPress={() => setDescriptionExpanded(false)}
                          style={[
                            styles.showLessBtn,
                            { borderColor: colors.text + "40" },
                          ]}
                        >
                          <ThemedText size="sm" weight="medium">
                            {t("events.showLess")}
                          </ThemedText>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <ScrollView
                          style={[
                            styles.expandedCardScroll,
                            { minHeight: EXPANDED_IMAGE_HEIGHT * fontScale },
                          ]}
                          contentContainerStyle={{ paddingBottom: 120 }}
                          showsVerticalScrollIndicator={true}
                        >
                          {hasImages ? (
                            expandedImageUrls.length === 1 ? (
                              <Image
                                source={{ uri: expandedImageUrls[0]! }}
                                style={[
                                  styles.expandedCardImage,
                                  expandedCardScaledStyles.cardImage,
                                ]}
                                contentFit="cover"
                                onError={() => setExpandedImageError(true)}
                              />
                            ) : (
                              <View style={styles.expandedCarouselWrap}>
                                <ScrollView
                                  ref={expandedImageScrollRef}
                                  horizontal
                                  pagingEnabled
                                  showsHorizontalScrollIndicator={false}
                                  style={[
                                    styles.expandedCardImage,
                                    expandedCardScaledStyles.cardImage,
                                  ]}
                                  onMomentumScrollEnd={(e) => {
                                    const offset =
                                      e.nativeEvent.contentOffset.x;
                                    const pageWidth =
                                      SCREEN_WIDTH - 48 * fontScale;
                                    const idx = Math.round(offset / pageWidth);
                                    setExpandedImageIndex(
                                      Math.min(
                                        idx,
                                        expandedImageUrls.length - 1,
                                      ),
                                    );
                                  }}
                                >
                                  {expandedImageUrls.map((uri, idx) => (
                                    <Image
                                      key={`${expandedEvent.id}-img-${idx}`}
                                      source={{ uri }}
                                      style={[
                                        styles.expandedCardImage,
                                        expandedCardScaledStyles.cardImage,
                                        {
                                          width: SCREEN_WIDTH - 48 * fontScale,
                                        },
                                      ]}
                                      contentFit="cover"
                                      onError={() =>
                                        setExpandedImageError(true)
                                      }
                                    />
                                  ))}
                                </ScrollView>
                                <Pressable
                                  style={[
                                    styles.expandedCarouselArrow,
                                    styles.expandedCarouselArrowLeft,
                                  ]}
                                  onPress={() => {
                                    const next = Math.max(
                                      0,
                                      expandedImageIndex - 1,
                                    );
                                    setExpandedImageIndex(next);
                                    const pageWidth =
                                      SCREEN_WIDTH - 48 * fontScale;
                                    expandedImageScrollRef.current?.scrollTo({
                                      x: next * pageWidth,
                                      animated: true,
                                    });
                                  }}
                                  hitSlop={12}
                                >
                                  <MaterialIcons
                                    name="chevron-left"
                                    size={32 * fontScale}
                                    color="rgba(255,255,255,0.9)"
                                  />
                                </Pressable>
                                <Pressable
                                  style={[
                                    styles.expandedCarouselArrow,
                                    styles.expandedCarouselArrowRight,
                                  ]}
                                  onPress={() => {
                                    const next = Math.min(
                                      expandedImageUrls.length - 1,
                                      expandedImageIndex + 1,
                                    );
                                    setExpandedImageIndex(next);
                                    const pageWidth =
                                      SCREEN_WIDTH - 48 * fontScale;
                                    expandedImageScrollRef.current?.scrollTo({
                                      x: next * pageWidth,
                                      animated: true,
                                    });
                                  }}
                                  hitSlop={12}
                                >
                                  <MaterialIcons
                                    name="chevron-right"
                                    size={32 * fontScale}
                                    color="rgba(255,255,255,0.9)"
                                  />
                                </Pressable>
                              </View>
                            )
                          ) : (
                            <View
                              style={[
                                styles.expandedCardImage,
                                styles.expandedCardImagePlaceholder,
                                expandedCardScaledStyles.cardImage,
                                { backgroundColor: colors.primary + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name="event"
                                size={64 * fontScale}
                                color={colors.primary}
                              />
                            </View>
                          )}
                          <View
                            style={[
                              expandedCardScaledStyles.leftAlignedContent,
                              { paddingTop: 12 * fontScale },
                            ]}
                          >
                            {expandedEvent.date || expandedEvent.startDate ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 * fontScale }}>
                                <MaterialIcons
                                  name="event"
                                  size={18 * fontScale}
                                  color={colors.textMediumEmphasis}
                                />
                                <ThemedText
                                  size="sm"
                                  emphasis="medium"
                                  style={[
                                    styles.expandedLabel,
                                    expandedCardScaledStyles.label,
                                  ]}
                                >
                                  {formatEventDate(
                                    expandedEvent.startDate || expandedEvent.date,
                                  )}
                                </ThemedText>
                              </View>
                            ) : null}
                            {expandedEvent.location ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 * fontScale }}>
                                <MaterialIcons
                                  name="location-on"
                                  size={18 * fontScale}
                                  color={colors.textMediumEmphasis}
                                />
                                <ThemedText
                                  size="sm"
                                  emphasis="medium"
                                  style={[
                                    styles.expandedLabel,
                                    expandedCardScaledStyles.label,
                                  ]}
                                >
                                  {expandedEvent.location}
                                </ThemedText>
                              </View>
                            ) : null}
                            {expandedEvent.description ? (
                              <ThemedText
                                size="sm"
                                emphasis="high"
                                selectable={false}
                                numberOfLines={expandedEvent.type === "plus" ? 5 : 10}
                                style={[
                                  styles.expandedDescription,
                                  expandedCardScaledStyles.description,
                                  { color: colors.text },
                                ]}
                              >
                                {(() => {
                                  const charLimit =
                                    expandedEvent.type === "plus" ? 100 : 200;
                                  return expandedEvent.description.length >
                                    charLimit
                                    ? expandedEvent.description.slice(
                                        0,
                                        charLimit,
                                      ) + "…"
                                    : expandedEvent.description;
                                })()}
                                {(() => {
                                  const charLimit =
                                    expandedEvent.type === "plus" ? 100 : 150;
                                  return expandedEvent.description.length >
                                    charLimit ? (
                                    <ThemedText
                                      onPress={() =>
                                        setDescriptionExpanded(true)
                                      }
                                      size="sm"
                                      weight="medium"
                                      style={{ color: colors.primary }}
                                    >
                                      {" "}
                                      {t("events.learnMore")}
                                    </ThemedText>
                                  ) : null;
                                })()}
                              </ThemedText>
                            ) : null}
                          </View>
                        </ScrollView>
                        <View
                          style={{
                            height: 8,
                          }}
                        />
                        <View
                          style={[
                            styles.expandedBottomButtons,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          {renderExpandedActions()}
                          <View style={{ flexDirection: "row", gap: 12 * fontScale, marginTop: 12 * fontScale }}>
                            {expandedEvent.type === "plus" &&
                            (hasPlusEntitlement ||
                              hasAIEntitlement ||
                              (expandedEvent.discountCode ?? "").trim()) ? (
                              <View style={{ flex: 1 }}>
                                {(expandedEvent.discountCode ?? "").trim() ? (
                                  discountRevealed &&
                                  (hasPlusEntitlement || hasAIEntitlement) ? (
                                    <View
                                      style={[
                                        styles.expandedDiscountCode,
                                        expandedCardScaledStyles.discountCode,
                                        {
                                          backgroundColor: colors.background,
                                          borderColor: colors.text + "40",
                                        },
                                      ]}
                                    >
                                      <ThemedText
                                        size="xs"
                                        style={{
                                          color: colors.textMediumEmphasis,
                                        }}
                                      >
                                        {t("events.discountRevealed")}
                                      </ThemedText>
                                      <ThemedText
                                        size="sm"
                                        weight="bold"
                                        style={{ marginTop: 4 * fontScale }}
                                      >
                                        {expandedEvent.discountCode}
                                      </ThemedText>
                                    </View>
                                  ) : (
                                    <Pressable
                                      style={[
                                        {
                                          backgroundColor: colors.primary + "20",
                                          borderWidth: 1,
                                          borderColor: colors.primary + "50",
                                          flexDirection: "row",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          paddingVertical: 12 * fontScale,
                                          paddingHorizontal: 14 * fontScale,
                                          borderRadius: 12,
                                          gap: 8 * fontScale,
                                          flex: 1,
                                        },
                                      ]}
                                      onPress={async () => {
                                        if (
                                          hasPlusEntitlement ||
                                          hasAIEntitlement
                                        ) {
                                          setDiscountRevealed(true);
                                        } else {
                                          await showPaywallForAnySubscriptionAccess();
                                        }
                                      }}
                                    >
                                      <MaterialIcons
                                        name="local-offer"
                                        size={20 * fontScale}
                                        color={colors.primary}
                                      />
                                      <ThemedText
                                        size="sm"
                                        weight="semibold"
                                        style={{ color: colors.primary }}
                                      >
                                        {t("events.getDiscount")}
                                      </ThemedText>
                                    </Pressable>
                                  )
                                ) : hasPlusEntitlement || hasAIEntitlement ? (
                                  <ThemedText
                                    size="xs"
                                    style={{ color: colors.textMediumEmphasis }}
                                  >
                                    {t("events.noDiscountForEvent")}
                                  </ThemedText>
                                ) : null}
                              </View>
                            ) : null}
                            {expandedEvent.type === "plus" ||
                            (expandedEvent.eventLink ?? "").trim() ? (
                              <Pressable
                                style={[
                                  {
                                    backgroundColor: colors.primary + "20",
                                    borderWidth: 1,
                                    borderColor: colors.primary + "50",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    paddingVertical: 12 * fontScale,
                                    paddingHorizontal: 16 * fontScale,
                                    borderRadius: 12,
                                  },
                                ]}
                                onPress={() => {
                                  const url = (
                                    expandedEvent.eventLink ?? ""
                                  ).trim();
                                  if (
                                    url.startsWith("http://") ||
                                    url.startsWith("https://")
                                  ) {
                                    try {
                                      Linking.openURL(url);
                                    } catch {}
                                  }
                                }}
                                hitSlop={12}
                                disabled={!(expandedEvent.eventLink ?? "").trim()}
                              >
                                <MaterialIcons
                                  name="open-in-new"
                                  size={22 * fontScale}
                                  color={
                                    (expandedEvent.eventLink ?? "").trim()
                                      ? colors.primary
                                      : colors.textMediumEmphasis
                                  }
                                />
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </Pressable>
              </Pressable>
            );
          })()}
        </Modal>
      ) : null}

      <Modal visible={codeModal.visible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeCodeModal}>
          <Pressable
            style={[styles.modalBox, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText size="l" weight="bold" style={styles.modalTitle}>
              {codeModal.for === "private"
                ? t("events.privateEnterCode")
                : t("events.plusEnterCode")}
            </ThemedText>
            <TextInput
              value={codeInput}
              onChangeText={(text) => {
                setCodeInput(text);
                setCodeError(null);
              }}
              placeholder={t("events.vipCodePlaceholder")}
              placeholderTextColor={colors.textMediumEmphasis}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.codeInput,
                { color: colors.text, borderColor: colors.icon },
              ]}
            />
            {codeError ? (
              <ThemedText size="xs" style={styles.codeError}>
                {codeError}
              </ThemedText>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={closeCodeModal} style={styles.modalBtn}>
                <ThemedText size="sm" weight="medium">
                  {t("events.cancel")}
                </ThemedText>
              </Pressable>
              <Pressable onPress={submitCode} style={styles.modalBtn}>
                <ThemedText
                  size="sm"
                  weight="bold"
                  style={{ color: colors.primary }}
                >
                  {t("events.unlock")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Location denied: explain global-only events, Enable to retry or Close */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLocationModalVisible(false)}
        >
          <Pressable
            style={[styles.modalBox, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText size="l" weight="bold" style={styles.modalTitle}>
              {t("events.locationModalTitle")}
            </ThemedText>
            <ThemedText
              size="sm"
              style={{ color: colors.textMediumEmphasis, marginBottom: 20 }}
            >
              {t("events.locationModalMessage")}
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable
                onPress={async () => {
                  // User chose to close - remember they declined
                  await setLocationDeclinedByUser();
                  setLocationPermissionDenied(true);
                  setLocationModalVisible(false);
                }}
                style={styles.modalBtn}
              >
                <ThemedText size="sm" weight="medium">
                  {t("events.locationModalClose")}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const status = await requestLocationPermission();
                  if (status === "granted") {
                    // Clear the decline flag since user granted permission
                    await clearLocationDeclinedByUser();
                    setLocationPermissionDenied(false);
                    setLocationModalVisible(false);
                    void loadEvents();
                  } else if (status === "denied") {
                    Alert.alert(
                      t("events.locationModalTitle"),
                      t("events.locationOpenSettingsMessage"),
                      [
                        { text: t("common.cancel") },
                        {
                          text: t("events.locationOpenSettingsButton"),
                          onPress: () => Linking.openSettings(),
                        },
                      ],
                    );
                  }
                }}
                style={styles.modalBtn}
              >
                <ThemedText
                  size="sm"
                  weight="bold"
                  style={{ color: colors.primary }}
                >
                  {t("events.locationModalEnable")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Events filter modal: past events + filled events toggles */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable
            style={[styles.modalBox, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText size="l" weight="bold" style={styles.modalTitle}>
              {t("events.filterTitle")}
            </ThemedText>
            <View style={styles.filterRow}>
              <ThemedText size="sm" style={{ flex: 1, color: colors.text }}>
                {t("events.hidePastEvents")}
              </ThemedText>
              <Switch
                value={!showPastEvents}
                onValueChange={(v) => setShowPastEvents(!v)}
                trackColor={{
                  false: colors.text + "40",
                  true: colors.primary + "80",
                }}
                thumbColor={colors.primary}
              />
            </View>
            <View style={styles.filterRow}>
              <ThemedText size="sm" style={{ flex: 1, color: colors.text }}>
                {t("events.hideFilledEvents")}
              </ThemedText>
              <Switch
                value={hideFilledEvents}
                onValueChange={setHideFilledEvents}
                trackColor={{
                  false: colors.text + "40",
                  true: colors.primary + "80",
                }}
                thumbColor={colors.primary}
              />
            </View>
            <View style={[styles.modalActions, { marginTop: 24 }]}>
              <Pressable
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalBtn}
              >
                <ThemedText size="sm" weight="medium">
                  {t("common.done")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* AI Create memory modal (golden event AI access when goldenEventIdForModal is set) */}
      {aiModalVisible && (
        <AIModal
          visible={aiModalVisible}
          onClose={() => {
            setAiModalVisible(false);
            setGoldenEventIdForModal(null);
            setPendingAIResponse(null);
            void loadEvents();
            if (params.eventIdForMemory) {
              router.setParams({ eventIdForMemory: undefined });
            }
          }}
          pendingResponse={pendingAIResponse}
          onSend={async () => {}}
          goldenEventId={goldenEventIdForModal}
        />
      )}
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12 },
  orbWrap: { width: ORB_SIZE, height: ORB_SIZE },
  orbPressed: { opacity: 0.9 },
  orbDisabled: { opacity: 0.6 },
  orb3D: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  orbSpecular: {
    position: "absolute",
    left: ORB_SIZE * 0.18,
    top: ORB_SIZE * 0.18,
    width: ORB_SIZE * 0.28,
    height: ORB_SIZE * 0.28,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  orbContent: { alignItems: "center", justifyContent: "center", zIndex: 1 },
  orbLabel: { marginTop: 2, textAlign: "center", paddingHorizontal: 4 },
  orbEventCount: { marginTop: 1, textAlign: "center", fontSize: 9 },
  orbLockBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  orbUnseenBadge: {
    position: "absolute",
    top: 22,
    left: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    zIndex: 2,
  },
  orbUnseenText: {
    color: "#FF5252",
    textTransform: "uppercase",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  centerOrbUnseenDot: {
    position: "absolute",
    top: 26,
    left: 15,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF5252",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    zIndex: 2,
  },
  centerOrbPlaceholder: {
    position: "absolute",
    // Below side ring tiles (z~9–11) so neighbors aren’t painted “under” the hub after a swipe.
    // Back-arc cards stay z=1 and remain behind the orb.
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  noUpcomingEventsOverlay: {
    position: "absolute",
    top: CENTER_Y + FOCUSED_ORB_SIZE / 2 + 24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 15,
  },
  noUpcomingEventsText: {
    opacity: 0.9,
  },
  chevron: {
    position: "absolute",
    top: CHEVRON_TOP,
    width: 48,
    height: CHEVRON_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronLeft: { left: 8 },
  chevronRight: { right: 8 },
  unlockPlusButton: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  sferaCommunitiesTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    pointerEvents: "none",
  },
  eventCardOuterFrame: {
    width: "100%",
    height: "100%",
    padding: 6,
    borderRadius: 22,
    borderWidth: 3,
    overflow: "hidden",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  eventCardTilt: {
    flex: 1,
    transform: [{ perspective: 500 }, { rotateX: "7deg" }],
  },
  eventCardGlowWrap: {
    width: "100%",
    height: "100%",
    shadowColor: "rgba(100, 181, 246, 0.45)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  eventCardGlowWrapNonFocused: {
    shadowOpacity: 0,
    elevation: 0,
  },
  eventCard: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  eventCardNonFocused: {
    shadowOpacity: 0.05,
    elevation: 1,
  },
  eventCardGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  eventCardContent: {
    flex: 1,
    overflow: "hidden",
    paddingTop: 3,
    paddingBottom: 6,
    paddingHorizontal: 6,
  },
  eventCardImage: {
    width: "100%",
    flex: 1,
    minHeight: 24,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  eventCardImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  eventCardDetails: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 6,
  },
  eventCardName: { marginBottom: 2, textAlign: "left" },
  eventCardNameOnly: {
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 4,
    textAlign: "left",
  },
  eventCardDate: { opacity: 0.85, textAlign: "left" },
  eventCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 6,
  },
  eventCardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardCalendarBtnWrapper: {
    position: "relative",
  },
  eventCardCalendarBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(76, 175, 80, 0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardCalendarBadgePast: {
    backgroundColor: "rgba(96, 125, 139, 0.95)",
  },
  eventCardLockBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardDeleteBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(180,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  eventCardPrivateBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(160,120,230,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  eventCardUnseenBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    zIndex: 5,
  },
  eventCardUnseenBadgeSmall: {
    top: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  eventCardUnseenText: {
    color: "#FF5252",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventCardUnseenTextSmall: {
    fontSize: 8,
  },
  backBtn: {
    position: "absolute",
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  expandedBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  expandedCard: {
    width: "100%",
    maxWidth: 420,
    height: Math.min(700, SCREEN_HEIGHT * 0.85),
    maxHeight: "78%",
    borderRadius: 20,
    overflow: "hidden",
    padding: 20,
    flexDirection: "column",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  expandedCardFullScreen: {
    flex: 1,
    alignSelf: "stretch",
    maxWidth: "100%",
    width: "100%",
    maxHeight: "100%",
  },
  expandedCardBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
    position: "relative",
  },
  expandedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  expandedCardScroll: {
    flex: 1,
    minHeight: 0,
    marginBottom: 100,
  },
  expandedCarouselWrap: {
    position: "relative",
    width: "100%",
  },
  expandedCarouselArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  expandedCarouselArrowLeft: { left: 8 },
  expandedCarouselArrowRight: { right: 8 },
  expandedCardImage: { width: "100%", height: 200, borderRadius: 12 },
  expandedCardImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  expandedLabel: { marginTop: 8 },
  expandedDescription: { marginTop: 12 },
  expandedDescriptionScroll: { flex: 1, minHeight: 0 },
  expandedDescriptionScrollContent: { paddingBottom: 24 },
  expandedDescriptionFull: { lineHeight: 22 },
  showLessBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  expandedBottomButtons: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 4,
    alignItems: "flex-start",
  },
  expandedDiscountSection: {
    marginTop: 0,
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  expandedDiscountHint: {
    marginBottom: 8,
  },
  expandedDiscountCode: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  expandedDiscountBadgeWrap: {
    alignSelf: "stretch",
    minHeight: 52,
  },
  expandedDiscountBadgeImage: {
    width: "100%",
    height: 52,
  },
  expandedEventLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  expandedActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  expandedJoinBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedLeaveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: { width: "100%", maxWidth: 340, borderRadius: 16, padding: 24 },
  modalTitle: { marginBottom: 16 },
  codeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  codeError: { marginTop: 8, color: "#ff4444" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  filterIconButton: {
    position: "absolute",
    zIndex: 25,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pastEventsToggle: {
    position: "absolute",
    zIndex: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  pastEventsSection: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  pastEventsSectionTitle: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  pastEventsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pastEventCard: {
    width: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    paddingBottom: 10,
  },
  pastEventCardImage: {
    width: "100%",
    height: 88,
  },
  pastEventCardImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  pastEventCardName: {
    marginTop: 6,
    paddingHorizontal: 8,
  },
  pastEventCardAction: {
    marginTop: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  createMemoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  createMemoryBtnText: {
    color: "#1A2332",
  },
});
