import { ThemedText } from "@/components/themed-text";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { useTranslate } from "@/utils/languages/use-translate";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SUNNY_CELEBRATION_SPEED_TIERS = [3, 2, 1] as const;
type SunnyCelebrationPlaybackSpeed = (typeof SUNNY_CELEBRATION_SPEED_TIERS)[number];
const MIN_CELEBRATION_BUBBLE_DURATION_MS = 320;
/** Mounting hundreds of SVG + Reanimated nodes tanks the JS thread; parade samples a capped set. */
const MAX_PARADE_BUBBLES = 96;
/**
 * Last few % of each rise is opacity-out / off-screen; auto-close was delay+duration+200ms so
 * the count pill lingered. Trim keeps dismiss aligned with when suns look gone.
 */
const PARADE_AUTO_CLOSE_TRIM_MS = 520;
const PARADE_AUTO_CLOSE_MIN_MS = 400;
/** Backscreen dim fade in / fade out (same duration both ways). */
const PARADE_BACKDROP_FADE_MS = 1500;
/** Small slack after fade duration before JS dismiss — avoids runOnJS from the animation callback (crash-prone with Modal). */
const PARADE_EXIT_JS_DISMISS_BUFFER_MS = 64;
/** Without a cap, 280–420px discs leave almost no X travel on phones → a visual “middle column”. */
function paradeSunSizeCap(isTablet: boolean, isLargeDevice: boolean): number {
  return isTablet ? 360 : isLargeDevice ? 320 : 280;
}

function paradeComputeSunSize(
  rawText: string,
  isTablet: boolean,
  isLargeDevice: boolean,
): number {
  const cap = paradeSunSizeCap(isTablet, isLargeDevice);
  return Math.min(computeCelebrationSunSize(rawText, isTablet, isLargeDevice), cap);
}

function pickMomentsForParade(
  moments: SunnyCelebrationMomentEntry[],
  max: number,
): SunnyCelebrationMomentEntry[] {
  if (moments.length <= max) {
    return moments;
  }
  const n = moments.length;
  const out: SunnyCelebrationMomentEntry[] = [];
  for (let i = 0; i < max; i++) {
    const t = max === 1 ? 0 : i / (max - 1);
    const idx = Math.round(t * (n - 1));
    out.push(moments[idx]);
  }
  return out;
}

export type SunnyCelebrationMomentEntry = {
  id: string;
  text: string;
  sphere: LifeSphere;
};

type BubbleSpec = {
  id: string;
  text: string;
  size: number;
  delayMs: number;
  durationMs: number;
  driftX: number;
  riseStartX: number;
};

type Props = {
  visible: boolean;
  triggerToken: number;
  moments: SunnyCelebrationMomentEntry[];
  onComplete?: () => void;
  onDismiss?: () => void;
};

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function idScatterSalt(id: string, index: number): number {
  let h = index * 31;
  const n = Math.min(id.length, 48);
  for (let i = 0; i < n; i++) {
    h = (h * 29 + id.charCodeAt(i) * (i + 11)) >>> 0;
  }
  return h & 0xffff;
}

/** Keep parade cadence at the previous default ("balanced") now that density control is removed. */
const PARADE_DENSITY_STAGGER_MULTIPLIER = 1;

function FocusedMemorySunCelebrationBubble({
  spec,
  sunnyBackground,
  fontScale,
  isTablet,
  isLargeDevice,
}: {
  spec: Pick<BubbleSpec, "id" | "text" | "size">;
  sunnyBackground: string;
  fontScale: number;
  isTablet: boolean;
  isLargeDevice: boolean;
}) {
  const size = spec.size;
  const textLength = spec.text.length;
  const gradientId = `celebrateSunGrad-${spec.id}`;

  return (
    <View
      style={{
        width: size,
        height: size,
        shadowColor: sunnyBackground,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: isTablet ? 12 : 9,
        elevation: 10,
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Defs>
          <RadialGradient
            id={gradientId}
            cx="80"
            cy="80"
            rx="48"
            ry="48"
            fx="80"
            fy="80"
            gradientUnits="userSpaceOnUse"
          >
            <Stop
              offset="0%"
              stopColor={sunnyBackground}
              stopOpacity="0.9"
            />
            <Stop
              offset="60%"
              stopColor={sunnyBackground}
              stopOpacity="1"
            />
            <Stop
              offset="100%"
              stopColor={sunnyBackground}
              stopOpacity="1"
            />
          </RadialGradient>
        </Defs>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          const radian = (angle * Math.PI) / 180;
          const centerX = 80;
          const centerY = 80;
          const innerRadius = 48;
          const outerRadius = 72;
          const rayWidth = 3;
          const innerX = centerX + Math.cos(radian) * innerRadius;
          const innerY = centerY + Math.sin(radian) * innerRadius;
          const outerX = centerX + Math.cos(radian) * outerRadius;
          const outerY = centerY + Math.sin(radian) * outerRadius;
          const perpAngle = radian + Math.PI / 2;
          const halfWidth = rayWidth / 2;
          const leftX = outerX + Math.cos(perpAngle) * halfWidth;
          const leftY = outerY + Math.sin(perpAngle) * halfWidth;
          const rightX = outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
          const rightY = outerY + Math.sin(perpAngle + Math.PI) * halfWidth;
          return (
            <Path
              key={`celebrate-ray-${spec.id}-${i}`}
              d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
              fill={sunnyBackground}
            />
          );
        })}
        <Circle cx="80" cy="80" r="48" fill={`url(#${gradientId})`} />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: (size / 160) * 48 * 0.54,
          paddingVertical: (size / 160) * 48 * 0.4,
        }}
      >
        <ThemedText
          style={{
            color: "black",
            fontSize:
              Math.max(
                isTablet ? 11 : 9.5,
                (isTablet ? 15 : isLargeDevice ? 14 : 13) -
                  Math.floor(textLength / (isTablet ? 140 : 105)),
              ) * fontScale,
            textAlign: "center",
            fontWeight: "700",
            lineHeight:
              Math.max(
                isTablet ? 12 : 11,
                (isTablet ? 19 : isLargeDevice ? 17 : 16) -
                  Math.floor(textLength / (isTablet ? 170 : 130)),
              ) * fontScale,
            maxWidth: (size / 160) * 48 * 1.5,
          }}
          numberOfLines={8}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          {spec.text}
        </ThemedText>
      </View>
    </View>
  );
}

function SunnyMomentBubble({
  spec,
  triggerToken,
  paradeSessionStartedAtMs,
  sunnyBackground,
  fontScale,
  isTablet,
  isLargeDevice,
}: {
  spec: BubbleSpec;
  triggerToken: number;
  /** Wall-clock ms when this parade session started (`Date.now()`); used so tier changes don’t reset stagger from “now”. */
  paradeSessionStartedAtMs: number;
  sunnyBackground: string;
  fontScale: number;
  isTablet: boolean;
  isLargeDevice: boolean;
}) {
  const progress = useSharedValue(0);
  const prevTriggerTokenRef = useRef<number | null>(null);
  /** Expected wall-clock start of the current withDelay; used so sparse tiers don’t push waits backward. */
  const scheduledLaunchAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const newCelebrationSession = prevTriggerTokenRef.current !== triggerToken;
    prevTriggerTokenRef.current = triggerToken;

    const delayMsFromSessionClock = () => {
      const elapsed = Date.now() - paradeSessionStartedAtMs;
      return Math.max(0, Math.round(spec.delayMs - elapsed));
    };

    if (newCelebrationSession) {
      cancelAnimation(progress);
      scheduledLaunchAtMsRef.current = null;
      progress.value = 0;
      const waitMs = delayMsFromSessionClock();
      scheduledLaunchAtMsRef.current = Date.now() + waitMs;
      progress.value = withDelay(
        waitMs,
        withTiming(1, {
          duration: spec.durationMs,
          easing: ease,
        }),
      );
      return;
    }

    cancelAnimation(progress);
    const p = progress.value;

    if (p >= 1) {
      progress.value = 1;
      scheduledLaunchAtMsRef.current = null;
      return;
    }

    if (p <= 0) {
      progress.value = 0;
      const rawNew = delayMsFromSessionClock();
      let waitMs = rawNew;
      if (scheduledLaunchAtMsRef.current != null) {
        const oldRemain = Math.max(
          0,
          scheduledLaunchAtMsRef.current - Date.now(),
        );
        waitMs = Math.min(rawNew, oldRemain);
      }
      scheduledLaunchAtMsRef.current = Date.now() + waitMs;
      progress.value = withDelay(
        waitMs,
        withTiming(1, {
          duration: spec.durationMs,
          easing: ease,
        }),
      );
      return;
    }

    scheduledLaunchAtMsRef.current = null;

    const remainingFrac = 1 - p;
    const remainingMs = Math.max(
      MIN_CELEBRATION_BUBBLE_DURATION_MS,
      Math.round(remainingFrac * spec.durationMs),
    );
    progress.value = p;
    progress.value = withTiming(1, {
      duration: remainingMs,
      easing: ease,
    });
  }, [
    triggerToken,
    spec.delayMs,
    spec.durationMs,
    paradeSessionStartedAtMs,
    progress,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(
      p,
      [0, 0.015, 0.88, 1],
      [0.88, 0.97, 0.97, 0],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      p,
      [0, 1],
      [
        SCREEN_HEIGHT + spec.size * 0.35,
        -spec.size * 1.35,
      ],
      Extrapolation.CLAMP,
    );
    const sway = Math.sin(p * Math.PI * 0.85) * spec.driftX;
    const scale = interpolate(p, [0, 0.06, 1], [0.9, 1, 1.05]);

    return {
      opacity,
      transform: [
        { translateX: spec.riseStartX + sway },
        { translateY },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubbleWrap,
        {
          width: spec.size,
          height: spec.size,
        },
        animatedStyle,
      ]}
    >
      <FocusedMemorySunCelebrationBubble
        spec={spec}
        sunnyBackground={sunnyBackground}
        fontScale={fontScale}
        isTablet={isTablet}
        isLargeDevice={isLargeDevice}
      />
    </Animated.View>
  );
}

function computeCelebrationSunSize(
  rawText: string,
  isTablet: boolean,
  isLargeDevice: boolean,
): number {
  const normalizedSunText = rawText.trim().replace(/\s+/g, " ");
  const textLength = normalizedSunText.length;
  const sunEstimatedLines = Math.max(
    1,
    Math.ceil(textLength / (isTablet ? 22 : isLargeDevice ? 18 : 14)),
  );
  const sunLongestWord = normalizedSunText
    .split(" ")
    .reduce((max: number, word: string) => Math.max(max, word.length), 0);
  const baseSunSize = isTablet ? 240 : isLargeDevice ? 200 : 160;
  return Math.min(
    isTablet ? 500 : isLargeDevice ? 420 : 360,
    Math.max(
      baseSunSize,
      baseSunSize +
        (sunEstimatedLines - 1) * (isTablet ? 20 : isLargeDevice ? 18 : 16) +
        Math.floor(textLength * (isTablet ? 0.62 : isLargeDevice ? 0.56 : 0.48)) +
        Math.max(0, sunLongestWord - 10) * (isTablet ? 3 : 2),
    ),
  );
}

export function SunnyMomentsCelebrationOverlay({
  visible,
  triggerToken,
  moments,
  onComplete,
  onDismiss,
}: Props) {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const { momentColors } = useMomentColors();
  const { isTablet, isLargeDevice } = useLargeDevice();
  const fontScale = useFontScale();
  const sunnyBackground = momentColors.sunny.background;
  const insets = useSafeAreaInsets();
  const [playbackSpeedTier, setPlaybackSpeedTier] =
    useState<SunnyCelebrationPlaybackSpeed>(1);

  useEffect(() => {
    if (visible) {
      setPlaybackSpeedTier(1);
    }
  }, [visible, triggerToken]);

  const dismissIconColor =
    colorScheme === "dark" ? "#FEF9C7" : "rgba(0,0,0,0.7)";

  const paradeMoments = useMemo(
    () => pickMomentsForParade(moments, MAX_PARADE_BUBBLES),
    [moments],
  );

  const bubbleSpecsBase = useMemo<BubbleSpec[]>(() => {
    const total = paradeMoments.length;
    const margin = 14;
    const targetStaggerWindow = 24000;
    const rawStagger =
      total <= 1 ? 0 : targetStaggerWindow / Math.max(1, total - 1);
    const baseStaggerRounded = Math.round(
      Math.min(800, Math.max(280, rawStagger)),
    );
    const densMul = PARADE_DENSITY_STAGGER_MULTIPLIER;
    const staggerMs = Math.round(
      Math.min(960, Math.max(44, baseStaggerRounded * densMul)),
    );

    const paradeMargin = Math.max(8, margin - 6);
    const saltBase = paradeMargin * 101 + SCREEN_WIDTH;
    const nBusy = Math.max(1, total);

    return paradeMoments.map((entry, index) => {
      const text = entry.text.trim().replace(/\s+/g, " ").slice(0, 140);
      const textLength = text.length;
      const size = paradeComputeSunSize(text, isTablet, isLargeDevice);
      const idSalt = idScatterSalt(entry.id, index);
      const unitDrift = seededUnit(index * 3 + textLength + 29 + idSalt);
      const unitDuration = seededUnit(index * 7 + textLength + 47 + idSalt);
      const durationMs = 5200 + Math.round(unitDuration * 2000);

      // Stratify X across the width (scrambled rank) + within-cell jitter → no central clumping
      const space = SCREEN_WIDTH - 2 * paradeMargin - size;
      const uPos = seededUnit(index * 79 + saltBase + idSalt + textLength * 13);
      const uFine = seededUnit(index * 67 + saltBase + textLength + 883);
      const rank =
        ((index ^ (idSalt & 0xfff)) * 9973 +
          ((idSalt * 131 + 27437) >>> 0)) %
        nBusy;
      let frac =
        (rank + uPos * (0.9 - 0.06) + 0.03 + (uFine - 0.5) * 0.22) / nBusy;
      frac -= Math.floor(frac);
      const microNudge =
        (uFine - 0.5) *
        Math.min(48, Math.max(22, Math.max(0, space * 0.11)));
      let riseStartX =
        space > 0 ? paradeMargin + frac * space + microNudge : paradeMargin;
      riseStartX = Math.round(riseStartX);
      riseStartX = Math.max(
        paradeMargin,
        Math.min(riseStartX, SCREEN_WIDTH - size - paradeMargin),
      );

      const driftAmp = (unitDrift - 0.5) * (isTablet ? 40 : isLargeDevice ? 36 : 34);

      return {
        id: `sunny-float-${entry.id}-${index}`,
        text,
        size,
        riseStartX,
        driftX: driftAmp,
        delayMs: Math.round(index * staggerMs),
        durationMs,
      };
    });
  }, [paradeMoments, isTablet, isLargeDevice]);

  const bubbleSpecs = useMemo<BubbleSpec[]>(() => {
    const inv = 1 / playbackSpeedTier;
    return bubbleSpecsBase.map((s) => ({
      ...s,
      delayMs: Math.round(s.delayMs * inv),
      durationMs: Math.max(
        MIN_CELEBRATION_BUBBLE_DURATION_MS,
        Math.round(s.durationMs * inv),
      ),
    }));
  }, [bubbleSpecsBase, playbackSpeedTier]);

  const paradeAnchorRef = useRef<{ token: number; at: number } | null>(null);
  if (
    paradeAnchorRef.current === null ||
    paradeAnchorRef.current.token !== triggerToken
  ) {
    paradeAnchorRef.current = { token: triggerToken, at: Date.now() };
  }
  const paradeSessionStartedAtMs = paradeAnchorRef.current.at;

  const onCompleteRef = useRef(onComplete);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onDismissRef.current = onDismiss;
  }, [onComplete, onDismiss]);

  const paradeBackdropOpacity = useSharedValue(0);
  /** Fades density/speed rails + count pill with the scrim on exit so UI can’t stick at full opacity. */
  const controlsChromeOpacity = useSharedValue(1);
  /** Fade bubbles themselves on dismiss so they don't disappear on modal unmount. */
  const bubblesLayerOpacity = useSharedValue(1);
  const backdropExitInProgressRef = useRef(false);
  const exitFadeDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Monotonic auto-dismiss wall time so tier changes can’t postpone close (see auto-close effect). */
  const paradeAutoCloseAtMsRef = useRef<number | null>(null);
  const paradeAutoCloseScheduleTokenRef = useRef<number | null>(null);

  const clearExitFadeDismissTimer = useCallback(() => {
    if (exitFadeDismissTimerRef.current != null) {
      clearTimeout(exitFadeDismissTimerRef.current);
      exitFadeDismissTimerRef.current = null;
    }
  }, []);

  const completeDismissFromOverlay = useCallback(() => {
    const dismiss = onDismissRef.current;
    const complete = onCompleteRef.current;
    if (dismiss) dismiss();
    else complete?.();
  }, []);

  const fadeBackdropOutThen = useCallback(() => {
    if (backdropExitInProgressRef.current) return;
    backdropExitInProgressRef.current = true;
    clearExitFadeDismissTimer();
    cancelAnimation(paradeBackdropOpacity);
    cancelAnimation(controlsChromeOpacity);
    cancelAnimation(bubblesLayerOpacity);
    const timingConfig = {
      duration: PARADE_BACKDROP_FADE_MS,
      easing: Easing.inOut(Easing.cubic),
    };
    controlsChromeOpacity.value = withTiming(0, timingConfig);
    paradeBackdropOpacity.value = withTiming(0, timingConfig);
    bubblesLayerOpacity.value = withTiming(0, timingConfig);

    exitFadeDismissTimerRef.current = setTimeout(() => {
      exitFadeDismissTimerRef.current = null;
      backdropExitInProgressRef.current = false;
      completeDismissFromOverlay();
    }, PARADE_BACKDROP_FADE_MS + PARADE_EXIT_JS_DISMISS_BUFFER_MS);
  }, [
    paradeBackdropOpacity,
    controlsChromeOpacity,
    completeDismissFromOverlay,
    clearExitFadeDismissTimer,
  ]);

  useEffect(() => {
    return () => {
      clearExitFadeDismissTimer();
    };
  }, [clearExitFadeDismissTimer]);

  useEffect(() => {
    if (!visible) {
      clearExitFadeDismissTimer();
      cancelAnimation(paradeBackdropOpacity);
      cancelAnimation(controlsChromeOpacity);
    cancelAnimation(bubblesLayerOpacity);
      paradeBackdropOpacity.value = 0;
      controlsChromeOpacity.value = 1;
    bubblesLayerOpacity.value = 1;
      return;
    }
    clearExitFadeDismissTimer();
    backdropExitInProgressRef.current = false;
    cancelAnimation(paradeBackdropOpacity);
    cancelAnimation(controlsChromeOpacity);
  cancelAnimation(bubblesLayerOpacity);
    controlsChromeOpacity.value = 1;
  bubblesLayerOpacity.value = 1;
    paradeBackdropOpacity.value = 0;
    paradeBackdropOpacity.value = withTiming(1, {
      duration: PARADE_BACKDROP_FADE_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [
    visible,
    triggerToken,
    paradeBackdropOpacity,
    controlsChromeOpacity,
    bubblesLayerOpacity,
    clearExitFadeDismissTimer,
  ]);

  /** Auto-close: nominal end from bubbleSpecs; min() keeps committed time when tiers lengthen the timeline. */
  useEffect(() => {
    if (!visible) {
      paradeAutoCloseAtMsRef.current = null;
      paradeAutoCloseScheduleTokenRef.current = null;
      return;
    }
    if (paradeAutoCloseScheduleTokenRef.current !== triggerToken) {
      paradeAutoCloseAtMsRef.current = null;
      paradeAutoCloseScheduleTokenRef.current = triggerToken;
    }

    const paradeEndMs = bubbleSpecs.reduce(
      (max, bubble) => Math.max(max, bubble.delayMs + bubble.durationMs),
      0,
    );
    const idealCloseAtMs =
      paradeSessionStartedAtMs +
      paradeEndMs -
      PARADE_AUTO_CLOSE_TRIM_MS;

    let fireAtMs = idealCloseAtMs;
    if (paradeAutoCloseAtMsRef.current != null) {
      fireAtMs = Math.min(idealCloseAtMs, paradeAutoCloseAtMsRef.current);
    }
    paradeAutoCloseAtMsRef.current = fireAtMs;

    const closeAfterMs = Math.max(
      PARADE_AUTO_CLOSE_MIN_MS,
      fireAtMs - Date.now(),
    );
    const timer = setTimeout(() => {
      fadeBackdropOutThen();
    }, closeAfterMs);
    return () => clearTimeout(timer);
  }, [
    bubbleSpecs,
    fadeBackdropOutThen,
    visible,
    triggerToken,
    paradeSessionStartedAtMs,
  ]);

  const requestCloseOverlay = useCallback(() => {
    fadeBackdropOutThen();
  }, [fadeBackdropOutThen]);

  const deferTierInteractionUpdate = React.useCallback((run: () => void) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          startTransition(run);
        });
      });
    });
  }, []);

  const selectSpeedTier = (tier: SunnyCelebrationPlaybackSpeed) => {
    if (tier === playbackSpeedTier) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => {},
    );
    deferTierInteractionUpdate(() => setPlaybackSpeedTier(tier));
  };

  /** Side rails: fade in + scale overshoot when the parade starts (same moment as overlay opens). */
  const speedRailScale = useSharedValue(1);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(speedRailScale);
      speedRailScale.value = 1;
      return;
    }

    cancelAnimation(speedRailScale);
    speedRailScale.value = 1;

    const PEAK = 1.09;
    const RISE_MS = 420;
    const STAGGER_MS = 140;

    speedRailScale.value = withDelay(
      STAGGER_MS,
      withSequence(
        withTiming(PEAK, {
          duration: RISE_MS,
          easing: Easing.out(Easing.cubic),
        }),
        withSpring(1, { damping: 11, stiffness: 300 }),
      ),
    );
  }, [visible, triggerToken, speedRailScale]);

  const speedRailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speedRailScale.value }],
  }));

  const controlsChromeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsChromeOpacity.value,
  }));

  const paradeBackdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: paradeBackdropOpacity.value,
  }));

  const bubblesLayerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bubblesLayerOpacity.value,
  }));

  if (!visible) return null;

  const speedRailTop = Math.round(insets.top + SCREEN_HEIGHT * 0.45);
  const speedRailRight = Math.max(8, insets.right + 6);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      {...(Platform.OS === "android"
        ? { hardwareAccelerated: true }
        : {})}
      onRequestClose={requestCloseOverlay}
    >
      <View pointerEvents="box-none" style={styles.modalRoot}>
        <View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            Platform.OS === "android" ? styles.overlayAndroidElevation : null,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.paradeBackdropDim, paradeBackdropAnimatedStyle]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, bubblesLayerAnimatedStyle]}
          >
            {bubbleSpecs.map((spec) => (
              <SunnyMomentBubble
                key={`${spec.id}-${triggerToken}`}
                spec={spec}
                triggerToken={triggerToken}
                paradeSessionStartedAtMs={paradeSessionStartedAtMs}
                sunnyBackground={sunnyBackground}
                fontScale={fontScale}
                isTablet={isTablet}
                isLargeDevice={isLargeDevice}
              />
            ))}
          </Animated.View>
          <Animated.View
            pointerEvents="box-none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.controlsLayer,
              controlsChromeAnimatedStyle,
            ]}
          >
            <Animated.View
              accessibilityRole="radiogroup"
              accessibilityLabel={t("home.sunnyCelebrate.speedA11y")}
              pointerEvents="auto"
              collapsable={false}
              style={[
                styles.speedRailColumn,
                {
                  top: speedRailTop,
                  right: speedRailRight,
                },
                speedRailAnimatedStyle,
              ]}
            >
              {SUNNY_CELEBRATION_SPEED_TIERS.map((tier, tierIndex) => {
                const selected = playbackSpeedTier === tier;
                return (
                  <React.Fragment key={`speed-tier-${tier}`}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${tier}×`}
                      onPress={() => selectSpeedTier(tier)}
                      style={({ pressed }) => [
                        styles.speedTierMinimalHit,
                        pressed && styles.speedTierMinimalPressed,
                      ]}
                      hitSlop={{ top: 14, bottom: 14, left: 22, right: 22 }}
                    >
                      <ThemedText
                        style={[
                          styles.speedTierMinimalLabel,
                          selected && styles.speedTierMinimalLabelSelected,
                        ]}
                      >
                        {tier}×
                      </ThemedText>
                    </Pressable>
                    {tierIndex < SUNNY_CELEBRATION_SPEED_TIERS.length - 1 ? (
                      <View
                        style={styles.speedMinimalSegment}
                        pointerEvents="none"
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </Animated.View>
            <View style={styles.countPill}>
              <ThemedText style={styles.countText}>
                {t("sferaInsight.sunnyMomentsMany", {
                  count: moments.length,
                })}
              </ThemedText>
              {onDismiss ? (
                <Pressable
                  onPress={requestCloseOverlay}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                  style={styles.countDismiss}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={dismissIconColor}
                  />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Dims the underlying screen so the parade reads clearly (transparent modal + scrim). */
  paradeBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 8, 22, 0.52)",
  },
  overlayAndroidElevation: {
    elevation: 40,
  },
  controlsLayer: {
    ...(Platform.OS === "android" ? { elevation: 52 } : {}),
  },
  bubbleWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "visible",
  },
  countPill: {
    position: "absolute",
    alignSelf: "center",
    top: 98,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(8, 14, 28, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.24)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 6,
    maxWidth: SCREEN_WIDTH - 32,
    pointerEvents: "auto",
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FDE68A",
    flexShrink: 1,
    paddingRight: 2,
  },
  countDismiss: {
    padding: 5,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  speedRailColumn: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  speedTierMinimalHit: {
    minWidth: 40,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  speedTierMinimalPressed: {
    opacity: 0.7,
  },
  speedMinimalSegment: {
    width: StyleSheet.hairlineWidth + 1,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginVertical: 1,
    borderRadius: 1,
    alignSelf: "center",
  },
  speedTierMinimalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.15,
  },
  speedTierMinimalLabelSelected: {
    color: "rgba(255,250,220,0.96)",
    fontWeight: "800",
  },
});
