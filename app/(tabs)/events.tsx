import { AIModal } from "@/components/ai-modal";
import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLargeDevice } from "@/hooks/use-large-device";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import {
  getPendingAIResponse,
  type PendingAIResponse,
} from "@/utils/ai-background-processor";
import { scheduleEventMemoryReminders } from "@/utils/event-memory-reminders";
import { onEventsTabPress } from "@/utils/events-tab-press";
import { useTranslate } from "@/utils/languages/use-translate";
import { useSferaEventsBadge } from "@/utils/SferaEventsBadgeProvider";
import {
  cancelEventMemoryReminders,
} from "@/utils/event-memory-reminders";
import {
  addAttendedEventSnapshot,
  addAttendingEventId,
  addUnlockedVipCode,
  clearEventReminderInAppForEvent,
  getAttendingEventIds,
  getEventGoldenMemoryUsedIds,
  getPastAttendedEvents,
  getSeenEventIds,
  getUnlockedVipCodes,
  isPrivateSectionUnlocked,
  isVipSectionUnlocked,
  removeAttendedEventSnapshotsByIds,
  removeAttendingEventId,
  removeEventGoldenMemoryUsedIds,
  removeEventReminderScheduledIds,
  requestLocationPermission,
  syncAttendedSnapshotsFromActiveEvents,
  validateCodeForSection,
  type SferaEvent,
  type SferaEventType,
} from "@/utils/sfera-events";
import { updateEventStatus } from "@/utils/sfera-event-attendance";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
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
const ORB_RADIUS = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.28;
const ORB_SIZE = 140;
const FOCUSED_ORB_SIZE = Math.round(170 / 1.4);
const EVENT_ORBIT_RADIUS = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.36;
const EVENT_BELOW_ORB_GAP = 16;
const FOCUSED_EVENT_SIZE = 208;
const SMALL_EVENT_SIZE = 88;
const EVENT_SLIDE_OFFSET = SCREEN_WIDTH * 0.5;
const FOCUSED_EVENT_BOTTOM_Y =
  CENTER_Y + FOCUSED_ORB_SIZE / 2 + EVENT_BELOW_ORB_GAP + FOCUSED_EVENT_SIZE;
const CHEVRON_TOP = FOCUSED_EVENT_BOTTOM_Y - 56;

const ORB_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]; // 0°, 120°, 240°

/** Log Sfera event orbit positions (angle°, screen x,y) for debugging. Uses same orbital formula as UI. */
function logEventPositions(
  events: SferaEvent[],
  focusedIdx: number,
  total: number,
): void {
  if (total <= 0) return;
  const tag = "[Sfera events orbit]";
  const step = (2 * Math.PI) / total;
  const orbitAngle = focusedIdx * step;
  console.log(
    `${tag} focusedEventIndex=${focusedIdx} total=${total} orbitAngle=${((orbitAngle * 180) / Math.PI).toFixed(1)}°`,
  );
  events.forEach((event, eventIdx) => {
    const angle = Math.PI / 2 - eventIdx * step + orbitAngle;
    const angleDeg = (angle * 180) / Math.PI;
    const isFocused = eventIdx === focusedIdx;
    const size = isFocused ? FOCUSED_EVENT_SIZE : SMALL_EVENT_SIZE;
    const x = CENTER_X + Math.cos(angle) * EVENT_ORBIT_RADIUS - size / 2;
    const y = CENTER_Y + Math.sin(angle) * EVENT_ORBIT_RADIUS - size / 2;
    console.log(
      `  [${eventIdx}] "${event.name}" angle=${angleDeg.toFixed(1)}° left=${x.toFixed(0)} top=${y.toFixed(0)} ${isFocused ? "FOCUSED" : "orbit"}`,
    );
  });
}

const COMMUNITY_TYPES: SferaEventType[] = ["public", "private", "vip"];

/** Number of orbit slots for Sfera Private. Real unlocked events fill first slots; rest are mock placeholders. */
const PRIVATE_SLOT_COUNT = 5;

/** Mock events used to fill Private orbit slots that aren't yet unlocked. */
const MOCK_LOCKED_PRIVATE_EVENTS: SferaEvent[] = Array.from(
  { length: PRIVATE_SLOT_COUNT },
  (_, i) => ({
    id: `mock-private-${i + 1}`,
    name: "Private Event",
    location: "",
    description: "",
    imageUrl: "",
    type: "private" as const,
    vipCode: null,
    date: "",
    startDate: "",
    eventLink: "",
    country: "",
    town: "",
  }),
);

function isMockLockedEvent(event: SferaEvent): boolean {
  return event.id.startsWith("mock-private-");
}

type SharedNum = Animated.SharedValue<number>;

/** 3D sphere gradient for Sfera Community orbs (highlight top-left, shadow bottom-right). */
function getCommunity3DColors(
  type: SferaEventType,
  colorScheme: "light" | "dark",
): { highlight: string; base: string; shadow: string } {
  if (colorScheme === "light") {
    const bases = {
      public: "rgb(150,200,255)",
      private: "rgb(180,150,220)",
      vip: "rgb(255,200,100)",
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
    public: "rgba(140,190,245,0.55)",
    private: "rgba(160,120,230,0.55)",
    vip: "rgba(255,180,80,0.55)",
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
  const colors = { public: "#96CAFF", private: "#B39DDB", vip: "#FFB74D" };
  return colors[type];
}

/**
 * Icon color for each Sfera Community orb. WCAG 2A: at least 3:1 contrast
 * against the orb gradient (worst case: highlight). Uses dark tones on light pastels.
 */
function getCommunityIconColor(
  type: SferaEventType,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") {
    // Light mode: dark icons on light gradient bases
    const dark = { public: "#1565C0", private: "#5E35B1", vip: "#E65100" };
    return dark[type];
  }
  // Dark mode: dark icons on semi-transparent pastel gradients
  const dark = { public: "#0D47A1", private: "#4A148C", vip: "#BF360C" };
  return dark[type];
}

/**
 * Text color for orb labels. WCAG 2A: at least 4.5:1 contrast against orb gradient.
 */
function getCommunityTextColor(
  type: SferaEventType,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") {
    return "#11181C"; // Dark text on light spheres
  }
  return "#1A2332"; // Dark text on semi-transparent pastels (meets 4.5:1 on lightest gradient parts)
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
  type: "public" | "private" | "vip";
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
              style={[styles.orbLabel, { color: getCommunityTextColor(type, colorScheme) }]}
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
            <View style={styles.orbUnseenBadge} />
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
}: {
  type: SferaEventType;
  label: string;
  onPress: () => void;
  onPulseStart: () => void;
  onPulseEnd: () => void;
  colorScheme: "light" | "dark";
  colors: Record<string, string>;
  hasUnseenEvents?: boolean;
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
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: colorScheme === "dark" ? 0.5 : 0.25,
              shadowRadius: 12,
              elevation: 10,
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
            <ThemedText
              size="xs"
              weight="medium"
              numberOfLines={1}
              style={[styles.orbLabel, { color: getCommunityTextColor(type, colorScheme) }]}
            >
              {label}
            </ThemedText>
          </View>
          {hasUnseenEvents && (
            <View style={styles.orbUnseenBadge} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const EVENT_ORBIT_DURATION = 320;

/** Event card positioned by shared orbit angle so all events move smoothly along the circle (no jumping). */
/** Small pulsing icon (arrow-forward) for "learn more"; shown on focused event card. */
const LearnMoreIcon = React.memo(function LearnMoreIcon({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: Record<string, string>;
}) {
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.12, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseScale]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  return (
    <Animated.View style={[styles.learnMoreIcon, animatedStyle]}>
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill}>
        <MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
});

const OrbitalEventCard = React.memo(function OrbitalEventCard({
  event,
  eventIndex,
  totalCount,
  focusedEventIndex,
  eventOrbitAngle,
  focusedEventIndexShared,
  colorScheme,
  colors,
  onFocusPress,
  onDeletePress,
  isLocked = false,
  isUnseen = false,
  isAttending = false,
  isPastEvent = false,
}: {
  event: SferaEvent;
  eventIndex: number;
  totalCount: number;
  focusedEventIndex: number;
  eventOrbitAngle: SharedNum;
  focusedEventIndexShared: Animated.SharedValue<number>;
  colorScheme: "light" | "dark";
  colors: Record<string, string>;
  onFocusPress?: (event: SferaEvent) => void;
  onDeletePress?: (event: SferaEvent) => void;
  isLocked?: boolean;
  isUnseen?: boolean;
  isAttending?: boolean;
  isPastEvent?: boolean;
}) {
  const t = useTranslate();
  const isFocused =
    (eventIndex - focusedEventIndex + totalCount) % totalCount === 0;

  const animatedStyle = useAnimatedStyle(() => {
    const n = totalCount;
    if (n <= 0)
      return {
        position: "absolute" as const,
        left: 0,
        top: 0,
        width: SMALL_EVENT_SIZE,
        height: SMALL_EVENT_SIZE,
      };
    // All events on one circle: event i at angle = π/2 (bottom) - i*(2π/n) + orbitAngle. So orbitAngle=0 puts event 0 at bottom.
    const angle =
      Math.PI / 2 - eventIndex * ((2 * Math.PI) / n) + eventOrbitAngle.value;
    const focused = focusedEventIndexShared.value === eventIndex;
    const w = focused ? FOCUSED_EVENT_SIZE : SMALL_EVENT_SIZE;
    const h = w;
    const x = CENTER_X + Math.cos(angle) * EVENT_ORBIT_RADIUS - w / 2;
    const y = CENTER_Y + Math.sin(angle) * EVENT_ORBIT_RADIUS - h / 2;
    return {
      position: "absolute" as const,
      left: x,
      top: y,
      width: w,
      height: h,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => isFocused && onFocusPress?.(event)}
        style={[
          styles.eventCard,
          {
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.eventCardImage}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.eventCardImage,
              styles.eventCardImagePlaceholder,
              { backgroundColor: colors.primary + "25" },
            ]}
          >
            <MaterialIcons
              name={isLocked ? "lock" : "event"}
              size={isFocused ? 40 : 24}
              color={colors.primary}
            />
          </View>
        )}
        <ThemedText
          size={isFocused ? "sm" : "xxs"}
          weight="medium"
          numberOfLines={isFocused ? 3 : 2}
          style={styles.eventCardName}
        >
          {event.name}
        </ThemedText>
        {event.date && !isLocked ? (
          <ThemedText size="xxs" emphasis="medium" numberOfLines={1}>
            {event.date}
          </ThemedText>
        ) : null}
        {isLocked ? (
          <View style={styles.eventCardLockBadge}>
            <MaterialIcons name="lock" size={14} color="#fff" />
          </View>
        ) : null}
        {isPastEvent && onDeletePress ? (
          <Pressable
            style={styles.eventCardDeleteBadge}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                t("events.removePastEventTitle"),
                t("events.removePastEventMessage"),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("common.delete"), style: "destructive", onPress: () => onDeletePress(event) },
                ],
              );
            }}
          >
            <MaterialIcons name="delete-outline" size={18} color="#fff" />
          </Pressable>
        ) : null}
        {isUnseen && !isLocked ? (
          <View style={styles.eventCardUnseenBadge} />
        ) : null}
        {!isLocked ? (
          isAttending ? (
            <View style={[styles.eventCardAttendingBadge, isPastEvent && styles.eventCardPastAttendedBadge]}>
              <MaterialIcons
                name={isPastEvent ? "event-available" : "check-circle"}
                size={isPastEvent ? 18 : 16}
                color="#fff"
              />
            </View>
          ) : (
            <View style={[styles.eventCardUpcomingBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="event" size={22} color="#fff" />
            </View>
          )
        ) : null}
        {isFocused && onFocusPress ? (
          <LearnMoreIcon colors={colors} onPress={() => onFocusPress(event)} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

export default function EventsTab() {
  const colorScheme = useColorScheme();
  const t = useTranslate();
  const colors = Colors[colorScheme ?? "dark"];
  const { constellationAmount, constellationOpacity } = useVisualSettings();
  const { momentColors } = useMomentColors();
  const { markEventAsSeen, refreshEvents } = useSferaEventsBadge();

  const [events, setEvents] = useState<SferaEvent[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [unlockedCodes, setUnlockedCodes] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"orbs" | "public" | "private" | "vip">(
    "orbs",
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [selectedType, setSelectedType] = useState<SferaEventType | null>(null);
  const [focusedCommunityIndex, setFocusedCommunityIndex] = useState(0);
  const [focusedEventIndex, setFocusedEventIndex] = useState(0);
  const [codeModal, setCodeModal] = useState<{
    visible: boolean;
    for: "private" | "vip" | null;
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
  const [pastEvents, setPastEvents] = useState<SferaEvent[]>([]);
  const [goldenUsedIds, setGoldenUsedIds] = useState<Set<string>>(new Set());
  const [showPastEvents, setShowPastEvents] = useState(true);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [pendingAIResponse, setPendingAIResponse] =
    useState<PendingAIResponse | null>(null);
  const [goldenEventIdForModal, setGoldenEventIdForModal] = useState<string | null>(null);

  const params = useLocalSearchParams<{ eventIdForMemory?: string }>();
  const insets = useSafeAreaInsets();
  const orbitAngle = useSharedValue(0);
  const orbExitProgress = useSharedValue(0); // 0 = all visible, 1 = selected orb at center, others exited
  const selectedOrbIndex = useSharedValue(-1); // 0=public, 1=private, 2=vip
  const hideCenteredOrb = useSharedValue(0); // 1 when community selected so we show CenterOrbPlaceholder instead
  const eventsRevealProgress = useSharedValue(0); // 0 -> 1 after orb settles, so events fade in
  const eventOrbitAngle = useSharedValue(0); // shared orbit angle so all event cards move smoothly along the circle
  const focusedEventIndexShared = useSharedValue(0); // synced with focusedEventIndex for worklets
  const loadUnlocked = useCallback(async () => {
    const set = await getUnlockedVipCodes();
    setUnlockedCodes(set);
  }, []);

  const loadEvents = useCallback(async () => {
    const [list, seen, attending] = await Promise.all([
      refreshEvents(),
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
    if (__DEV__) {
      console.log(
        "[Events tab] loadEvents: past attended count =",
        past.length,
        past.length ? past.map((e) => ({ id: e.id, name: e.name, startDate: e.startDate })) : [],
      );
    }
    void scheduleEventMemoryReminders();
  }, [refreshEvents]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadUnlocked(), loadEvents()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUnlocked, loadEvents]);

  useEffect(() => {
    orbitAngle.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 24000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [orbitAngle]);

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

  const publicEvents = useMemo(
    () => events.filter((e) => e.type === "public"),
    [events],
  );
  const privateEvents = useMemo(
    () => events.filter((e) => e.type === "private"),
    [events],
  );
  const vipEvents = useMemo(
    () => events.filter((e) => e.type === "vip"),
    [events],
  );

  useEffect(() => {
    if (events.length > 0) {
      console.log(
        "[Events tab] events:",
        events.length,
        "public:",
        publicEvents.length,
        "private:",
        privateEvents.length,
        "vip:",
        vipEvents.length,
      );
    }
  }, [
    events.length,
    publicEvents.length,
    privateEvents.length,
    vipEvents.length,
  ]);

  useEffect(() => {
    setExpandedImageError(false);
  }, [expandedEventId]);

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
  const vipUnlocked = isVipSectionUnlocked(events, unlockedCodes);

  const realPrivateEvents = useMemo(
    () =>
      privateEvents.filter(
        (e) =>
          e.vipCode && unlockedCodes.has((e.vipCode || "").trim().toLowerCase())
      ),
    [privateEvents, unlockedCodes]
  );

  const hasNoEvents = useMemo(
    () => [
      false, // public: never disable orb; let user tap to see "No upcoming events" overlay (same as VIP)
      privateUnlocked && realPrivateEvents.length === 0,
      vipUnlocked && vipEvents.length === 0,
    ],
    [privateUnlocked, realPrivateEvents.length, vipUnlocked, vipEvents.length]
  );

  const hasUnseenEvents = useMemo(
    () => [
      publicEvents.some((e) => !seenIds.has(e.id)),
      realPrivateEvents.some((e) => !seenIds.has(e.id)),
      vipEvents.some((e) => !seenIds.has(e.id)),
    ],
    [publicEvents, realPrivateEvents, vipEvents, seenIds]
  );

  /** Private orbit: real unlocked events fill first slots; remaining slots are mock placeholders. */
  const privateSlotList = useMemo(() => {
    const realUnlocked = privateEvents.filter(
      (e) =>
        e.vipCode && unlockedCodes.has((e.vipCode || "").trim().toLowerCase()),
    );
    const mockCount = Math.max(0, PRIVATE_SLOT_COUNT - realUnlocked.length);
    return [...realUnlocked, ...MOCK_LOCKED_PRIVATE_EVENTS.slice(0, mockCount)];
  }, [privateEvents, unlockedCodes]);

  const communityEvents = useMemo(
    () => [publicEvents, privateSlotList, vipEvents],
    [publicEvents, privateSlotList, vipEvents],
  );
  /** Orbit list: upcoming events for this community + past attended (same type) when toggle on. */
  const listForPhase = useMemo(() => {
    if (phase === "orbs") return [];
    const base = communityEvents[focusedCommunityIndex] ?? [];
    if (!showPastEvents) return base;
    const pastForCommunity = pastEvents.filter((e) => e.type === phase);
    return [...base, ...pastForCommunity];
  }, [phase, focusedCommunityIndex, communityEvents, showPastEvents, pastEvents]);

  const pastEventIds = useMemo(() => new Set(pastEvents.map((e) => e.id)), [pastEvents]);

  const removePastEventFromOrbit = useCallback(async (eventId: string) => {
    await removeAttendedEventSnapshotsByIds([eventId]);
    await removeAttendingEventId(eventId);
    await removeEventReminderScheduledIds([eventId]);
    await removeEventGoldenMemoryUsedIds([eventId]);
    await clearEventReminderInAppForEvent(eventId);
    await cancelEventMemoryReminders(eventId);
    setExpandedEventId(null);
    void loadEvents();
  }, [loadEvents]);

  // When entering community or list length changes: clamp focused index and set orbit angle (do not run when only focus changes so left/right can animate)
  useEffect(() => {
    if (phase === "orbs" || listForPhase.length === 0) return;
    const n = listForPhase.length;
    const step = (2 * Math.PI) / n;
    const nextFocus = Math.min(focusedEventIndex, n - 1);
    if (nextFocus !== focusedEventIndex) setFocusedEventIndex(nextFocus);
    eventOrbitAngle.value = nextFocus * step;
    focusedEventIndexShared.value = nextFocus;
  }, [phase, listForPhase.length]); // exclude focusedEventIndex so next/prev don't overwrite the running animation

 

  const openCodeModal = useCallback((forSection: "private" | "vip") => {
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
    if (forSection === "vip") {
      const idx = 2;
      selectedOrbIndex.value = idx;
      runOnJS(setFocusedCommunityIndex)(idx);
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
  ]);

  const eventCount = listForPhase.length;

  const selectOrb = useCallback(
    (index: number) => {
      const type: SferaEventType =
        index === 0 ? "public" : index === 1 ? "private" : "vip";
      selectedOrbIndex.value = index;
      runOnJS(setFocusedCommunityIndex)(index);
      runOnJS(setFocusedEventIndex)(0);
      orbExitProgress.value = withTiming(1, { duration: 320 }, () => {
        runOnJS(setPhase)(type);
        runOnJS(setSelectedType)(type);
      });
    },
    [selectedOrbIndex, orbExitProgress],
  );

  const goBackToOrbs = useCallback(() => {
    setExpandedEventId(null);
    setPhase("orbs");
    setSelectedType(null);
    setFocusedCommunityIndex(0);
    setFocusedEventIndex(0);
    orbExitProgress.value = withTiming(0, { duration: 280 });
  }, [orbExitProgress]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();

      (async () => {
        const status = await requestLocationPermission();
        if (status === "denied") {
          setTimeout(() => setLocationModalVisible(true), 400);
        } else if (status === "granted") {
          void loadEvents();
        }
      })();

      const unsubscribe = onEventsTabPress(() => {
        if (phaseRef.current !== "orbs") goBackToOrbs();
      });
      return () => unsubscribe();
    }, [loadEvents, goBackToOrbs]),
  );

  const goToPrevEvent = useCallback(() => {
    if (eventCount <= 1) return;
    const newIdx = (focusedEventIndex - 1 + eventCount) % eventCount;
    const step = (2 * Math.PI) / eventCount;
    setFocusedEventIndex(newIdx);
    focusedEventIndexShared.value = newIdx;
    eventOrbitAngle.value = withTiming(eventOrbitAngle.value - step, {
      duration: EVENT_ORBIT_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [eventCount, focusedEventIndex, eventOrbitAngle, focusedEventIndexShared]);

  const goToNextEvent = useCallback(() => {
    if (eventCount <= 1) return;
    const newIdx = (focusedEventIndex + 1) % eventCount;
    const step = (2 * Math.PI) / eventCount;
    setFocusedEventIndex(newIdx);
    focusedEventIndexShared.value = newIdx;
    eventOrbitAngle.value = withTiming(eventOrbitAngle.value + step, {
      duration: EVENT_ORBIT_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [eventCount, focusedEventIndex, eventOrbitAngle, focusedEventIndexShared]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          phase !== "orbs" &&
          eventCount > 1 &&
          Math.abs(g.dx) > 20 &&
          Math.abs(g.dx) > Math.abs(g.dy * 1.5),
        onPanResponderRelease: (_, g) => {
          if (phase === "orbs" || eventCount <= 1) return;
          if (g.dx < -50) goToNextEvent();
          else if (g.dx > 50) goToPrevEvent();
        },
      }),
    [phase, eventCount, goToPrevEvent, goToNextEvent],
  );

  const eventsRevealStyle = useAnimatedStyle(() => ({
    opacity: eventsRevealProgress.value,
  }));

  if (loading && events.length === 0) {
    return (
      <TabScreenContainer>
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText size="sm" emphasis="medium" style={styles.loadingText}>
            {t("events.loading")}
          </ThemedText>
        </View>
      </TabScreenContainer>
    );
  }

  const sectionLabel = (type: SferaEventType) =>
    type === "public"
      ? t("events.section.public")
      : type === "private"
        ? t("events.section.private")
        : t("events.section.vip");
  const focusedCommunityType = COMMUNITY_TYPES[focusedCommunityIndex];

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
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* ─── Phase: 3 orbs floating ─── */}
        {ORB_ANGLES.map((baseAngle, index) => {
          const type: SferaEventType =
            index === 0 ? "public" : index === 1 ? "private" : "vip";
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
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
            <Animated.View
              style={[StyleSheet.absoluteFill, eventsRevealStyle]}
              pointerEvents="box-none"
            >
              {/* Orbit events behind the orb (zIndex 0) – all cards on orbit, non-focused only here */}
              <View style={styles.orbitEventsLayer} pointerEvents="box-none">
                {listForPhase.map((event, idx) => {
                  const isFocused =
                    (idx - focusedEventIndex + listForPhase.length) %
                      Math.max(1, listForPhase.length) ===
                    0;
                  if (isFocused) return null;
                  return (
                    <OrbitalEventCard
                      key={event.id}
                      event={event}
                      eventIndex={idx}
                      totalCount={Math.max(1, listForPhase.length)}
                      focusedEventIndex={focusedEventIndex}
                      eventOrbitAngle={eventOrbitAngle}
                      focusedEventIndexShared={focusedEventIndexShared}
                      colorScheme={colorScheme ?? "dark"}
                      colors={colors}
                      isLocked={isMockLockedEvent(event)}
                      isUnseen={!seenIds.has(event.id)}
                      isAttending={attendingIds.has(event.id)}
                      isPastEvent={pastEventIds.has(event.id)}
                      onDeletePress={(ev) => removePastEventFromOrbit(ev.id)}
                    />
                  );
                })}
              </View>

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
              />
              {listForPhase.length === 0 ? (
                <View style={styles.noUpcomingEventsOverlay}>
                  <ThemedText size="sm" weight="medium" style={styles.noUpcomingEventsText}>
                    {t("events.noUpcomingEvents")}
                  </ThemedText>
                </View>
              ) : null}

              {/* Focused event in front of orb (zIndex 20) – same orbit motion, drawn on top for tap */}
              <View style={styles.focusedEventLayer} pointerEvents="box-none">
                {listForPhase.map((event, idx) => {
                  const isFocused =
                    (idx - focusedEventIndex + listForPhase.length) %
                      Math.max(1, listForPhase.length) ===
                    0;
                  if (!isFocused) return null;
                  return (
                    <OrbitalEventCard
                      key={event.id}
                      event={event}
                      eventIndex={idx}
                      totalCount={Math.max(1, listForPhase.length)}
                      focusedEventIndex={focusedEventIndex}
                      eventOrbitAngle={eventOrbitAngle}
                      focusedEventIndexShared={focusedEventIndexShared}
                      colorScheme={colorScheme ?? "dark"}
                      colors={colors}
                      isLocked={isMockLockedEvent(event)}
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
                    />
                  );
                })}
              </View>

              {/* Left/right to focus prev/next Sfera Event – positioned lower on screen */}
              {listForPhase.length > 1 ? (
                <>
              <Pressable
                style={[styles.chevron, styles.chevronLeft]}
                onPress={goToNextEvent}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={36}
                  color={colors.primary}
                />
              </Pressable>
              <Pressable
                style={[styles.chevron, styles.chevronRight]}
                onPress={goToPrevEvent}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={36}
                  color={colors.primary}
                />
              </Pressable>
                </>
              ) : null}

              {phase === "private" ? (
                <Pressable
                  onPress={async () => {
                    await loadEvents();
                    openCodeModal("private");
                  }}
                  style={[
                    styles.unlockPlusButton,
                    {
                      bottom: 20 + insets.bottom,
                      right: 20 + insets.right,
                      backgroundColor: colors.primary,
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

              {/* Toggle: show/hide past events (top right) */}
              <Pressable
                onPress={() => setShowPastEvents((v) => !v)}
                style={[
                  styles.pastEventsToggle,
                  {
                    top: 8 + insets.top,
                    right: 16 + insets.right,
                    backgroundColor: colors.background,
                    borderColor: colors.text + "40",
                  },
                ]}
              >
                <MaterialIcons
                  name={showPastEvents ? "visibility-off" : "history"}
                  size={20}
                  color={colors.primary}
                />
                <ThemedText size="xs" weight="medium" style={{ color: colors.text, marginLeft: 6 }}>
                  {showPastEvents ? t("events.hidePastEvents") : t("events.showPastEvents")}
                </ThemedText>
              </Pressable>

            </Animated.View>
          </View>
        )}

        {/* Title when showing 3 orbs */}
        {phase === "orbs" && (
          <View style={styles.sferaCommunitiesTitle} pointerEvents="none">
            <ThemedText size="l" weight="bold" letterSpacing="l">
              {t("events.sferaCommunities")}
            </ThemedText>
          </View>
        )}
      </View>

      {expandedEventId &&
        (() => {
          const expandedEvent = listForPhase.find(
            (e) => e.id === expandedEventId,
          );
          if (!expandedEvent) return null;
          const showImage = expandedEvent.imageUrl && !expandedImageError;
          return (
            <Modal
              visible
              transparent
              animationType="fade"
              onShow={() => setExpandedImageError(false)}
            >
              <Pressable
                style={styles.expandedBackdrop}
                onPress={() => {
                  setExpandedEventId(null);
                  setExpandedImageError(false);
                }}
              >
                <Pressable
                  style={[
                    styles.expandedCard,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.expandedCardHeader}>
                    <ThemedText size="l" weight="bold" numberOfLines={2}>
                      {expandedEvent.name}
                    </ThemedText>
                    <Pressable
                      onPress={() => {
                        setExpandedEventId(null);
                        setExpandedImageError(false);
                      }}
                      hitSlop={12}
                    >
                      <MaterialIcons
                        name="close"
                        size={28}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                  {showImage ? (
                    <Image
                      source={{ uri: expandedEvent.imageUrl }}
                      style={styles.expandedCardImage}
                      contentFit="cover"
                      onError={() => setExpandedImageError(true)}
                    />
                  ) : (
                    <View
                      style={[
                        styles.expandedCardImage,
                        styles.expandedCardImagePlaceholder,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name="event"
                        size={64}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  {expandedEvent.location ? (
                    <ThemedText
                      size="sm"
                      emphasis="medium"
                      style={styles.expandedLabel}
                    >
                      {expandedEvent.location}
                    </ThemedText>
                  ) : null}
                  {expandedEvent.date ? (
                    <ThemedText
                      size="sm"
                      emphasis="medium"
                      style={styles.expandedLabel}
                    >
                      {expandedEvent.date}
                    </ThemedText>
                  ) : null}
                  {expandedEvent.description ? (
                    <ScrollView
                      style={styles.expandedDescription}
                      showsVerticalScrollIndicator={false}
                    >
                      <ThemedText size="sm">
                        {expandedEvent.description}
                      </ThemedText>
                    </ScrollView>
                  ) : null}
                  {expandedEvent.eventLink ? (
                    <Pressable
                      style={styles.expandedEventLink}
                      onPress={() => {
                        try {
                          const url = expandedEvent.eventLink.trim();
                          if (
                            url.startsWith("http://") ||
                            url.startsWith("https://")
                          ) {
                            Linking.openURL(url);
                          }
                        } catch {}
                      }}
                    >
                      <MaterialIcons
                        name="open-in-new"
                        size={18}
                        color={colors.primary}
                      />
                      <ThemedText
                        size="sm"
                        weight="medium"
                        numberOfLines={1}
                        style={{
                          color: colors.primary,
                          marginLeft: 6,
                          flex: 1,
                        }}
                      ></ThemedText>
                    </Pressable>
                  ) : null}
                  <View style={styles.expandedActions}>
                    {pastEventIds.has(expandedEvent.id) ? (
                      goldenUsedIds.has(expandedEvent.id) ? (
                        <ThemedText size="sm" weight="medium" style={{ color: colors.textMediumEmphasis }}>
                          {t("events.memoryCreated")}
                        </ThemedText>
                      ) : (
                        <Pressable
                          style={[styles.expandedJoinBtn, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            setGoldenEventIdForModal(expandedEvent.id);
                            setAiModalVisible(true);
                            getPendingAIResponse().then(setPendingAIResponse);
                            setExpandedEventId(null);
                            setExpandedImageError(false);
                          }}
                        >
                          <MaterialIcons name="auto-awesome" size={18} color="#1A2332" />
                          <ThemedText
                            size="sm"
                            weight="bold"
                            style={[styles.createMemoryBtnText, { marginLeft: 6 }]}
                          >
                            {t("events.createMemoryForEvent")}
                          </ThemedText>
                        </Pressable>
                      )
                    ) : attendingIds.has(expandedEvent.id) ? (
                      <Pressable
                        style={[
                          styles.expandedLeaveBtn,
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
                              await removeAttendedEventSnapshotsByIds([expandedEvent.id]);
                              setAttendingIds((prev) => {
                                const next = new Set(prev);
                                next.delete(expandedEvent.id);
                                return next;
                              });
                              setExpandedEventId(null);
                              setExpandedImageError(false);
                            } else {
                              Alert.alert(
                                t("events.leaveError"),
                                undefined,
                                [{ text: "OK" }],
                              );
                            }
                          } finally {
                            setAttendanceLoading(false);
                          }
                        }}
                        disabled={attendanceLoading}
                      >
                        {attendanceLoading ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.text}
                          />
                        ) : (
                          <ThemedText size="sm" weight="medium">
                            {t("events.leave")}
                          </ThemedText>
                        )}
                      </Pressable>
                    ) : (expandedEvent.status ?? "open") === "closed" ? (
                      <View
                        style={[
                          styles.expandedJoinBtn,
                          {
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.text + "40",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="event-busy"
                          size={18}
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
                          { backgroundColor: colors.primary },
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
                              setAttendingIds((prev) => new Set(prev).add(expandedEvent.id));
                              void loadEvents();
                            } else {
                              Alert.alert(
                                t("events.joinError"),
                                undefined,
                                [{ text: "OK" }],
                              );
                            }
                          } finally {
                            setAttendanceLoading(false);
                          }
                        }}
                        disabled={attendanceLoading}
                      >
                        {attendanceLoading ? (
                          <ActivityIndicator
                            size="small"
                            color="#fff"
                          />
                        ) : (
                          <ThemedText
                            size="sm"
                            weight="medium"
                            style={{ color: "#fff" }}
                          >
                            {t("events.join")}
                          </ThemedText>
                        )}
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          );
        })()}

      <Modal visible={codeModal.visible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeCodeModal}>
          <Pressable
            style={[styles.modalBox, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText size="l" weight="bold" style={styles.modalTitle}>
              {codeModal.for === "private"
                ? t("events.privateEnterCode")
                : t("events.vipEnterCode")}
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
                onPress={() => setLocationModalVisible(false)}
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
  orbLabel: { marginTop: 4, textAlign: "center", paddingHorizontal: 4 },
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
    top: 26,
    left: 15,
    width: 16,
    height: 16,
    borderRadius: 7,
    backgroundColor: "#FF5252",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    zIndex: 2,
  },
  centerOrbPlaceholder: {
    position: "absolute",
    zIndex: 10,
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
  orbitEventsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  focusedEventLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  chevron: {
    position: "absolute",
    top: CHEVRON_TOP,
    width: 48,
    height: 56,
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
    top: 56,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  eventCard: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
    padding: 6,
    paddingBottom: 34,
  },
  eventCardImage: { width: "100%", flex: 1, minHeight: 24, borderRadius: 8 },
  eventCardImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  eventCardName: { marginTop: 4 },
  learnMoreIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
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
  eventCardUnseenBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#64B5F6",
  },
  eventCardAttendingBadge: {
    position: "absolute",
    bottom: 2,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(76, 175, 80, 0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardPastAttendedBadge: {
    backgroundColor: "rgba(96, 125, 139, 0.95)",
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  eventCardUpcomingBadge: {
    position: "absolute",
    bottom: 2,
    left: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    maxWidth: 400,
    maxHeight: "85%",
    borderRadius: 20,
    overflow: "hidden",
    padding: 20,
  },
  expandedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  expandedCardImage: { width: "100%", height: 200, borderRadius: 12 },
  expandedCardImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  expandedLabel: { marginTop: 8 },
  expandedDescription: { marginTop: 12, maxHeight: 160 },
  expandedEventLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
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
