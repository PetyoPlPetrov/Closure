import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  SharedValue,
  useAnimatedProps,
  useAnimatedReaction,
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
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// ─── Constants ────────────────────────────────────────────────────────────────

const COSMIC_TRACK = "#0D1525";
const COSMIC_INNER_DARK = [
  "#0A0E1A",
  "#0F1422",
  "#151C2E",
  "#1A2440",
  "#1E2A4A",
] as const;
const COSMIC_INNER_LIGHT = [
  "#2A2A3A",
  "#3A3A4E",
  "#4A4A62",
  "#5A5A76",
  "#6A6A8A",
] as const;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgbNorm(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function blendHex(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const c1 = parse(hex1);
  const c2 = parse(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface SunnyLifeAvatarProps {
  percentage: number;
  hasMemories: boolean;
  /**
   * When false (e.g. neutral 50% with no sunny/cloud moments yet), center % and label are hidden; ring can still show neutral fill.
   * Defaults to true.
   */
  showPercentageLabel?: boolean;
  /** When set, tapping the avatar (when hasMemories) switches to Classic view (wheel of life). */
  onPress?: () => void;
  /** When set, tapping "Add memories" (when !hasMemories) navigates to Sfera tab. */
  onAddMemoriesPress?: () => void;
  colorScheme: "light" | "dark";
  x: number;
  y: number;
  /** When provided, drives scale+centering during the congrats intro animation. */
  sunLoadScale?: SharedValue<number>;
  /** When provided, animates the displayed % from 0 → percentage during congrats intro. */
  sunLoadDisplayPct?: SharedValue<number>;
  /** When provided, drives the expand/collapse "sun menu" vertical offset. */
  sunExpanded?: SharedValue<number>;
  /** When true, the avatar translates toward screen center (congrats centering). */
  isCentered?: boolean;
  /** Screen width — needed to compute centering translateX. */
  screenWidth?: number;
  /** Screen height — needed to compute centering translateY. */
  screenHeight?: number;
}

export const SunnyLifeAvatar = React.memo(function SunnyLifeAvatar({
  percentage,
  hasMemories,
  showPercentageLabel = true,
  onPress,
  onAddMemoriesPress,
  colorScheme,
  x,
  y,
  sunLoadScale,
  sunLoadDisplayPct,
  sunExpanded: externalSunExpanded,
  isCentered = false,
  screenWidth,
  screenHeight,
}: SunnyLifeAvatarProps) {
  const { momentColors } = useMomentColors();
  const t = useTranslate();
  const colors = Colors[colorScheme] as {
    primary: string;
    primaryLight?: string;
    primaryDark?: string;
  };
  const primaryHex = colors.primary ?? "#64B5F6";
  const sunnyHex = momentColors.sunny.background;
  const sunnyGlowMatrix = React.useMemo(() => {
    const rgb = hexToRgbNorm(sunnyHex);
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
  }, [sunnyHex]);
  const glowMatrixValues = sunnyGlowMatrix;

  const avatarSize = 100;
  const borderWidth = 8;
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const staticRingDashOffset = circumference - (percentage / 100) * circumference;

  const isSunLoadIntro = sunLoadDisplayPct != null;

  const animatedRingProps = useAnimatedProps(() => {
    const pct = sunLoadDisplayPct != null ? sunLoadDisplayPct.value : percentage;
    return {
      strokeDashoffset: circumference - (pct / 100) * circumference,
    };
  }, [sunLoadDisplayPct, percentage, circumference]);

  const gradientColors =
    colorScheme === "dark" ? COSMIC_INNER_DARK : COSMIC_INNER_LIGHT;

  // ── Expand/collapse toggle ──────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  const expandScale = useSharedValue(1);

  const handlePress = useCallback(() => {
    if (!hasMemories) {
      onAddMemoriesPress?.();
      return;
    }
    if (onPress) {
      onPress();
      return;
    }
    // Toggle expand when no external onPress handler
    const next = !isExpanded;
    setIsExpanded(next);
    expandScale.value = withSpring(next ? 1.22 : 1, { damping: 14, stiffness: 160 });
  }, [hasMemories, onAddMemoriesPress, onPress, isExpanded, expandScale]);

  // Collapse when an external onPress is provided (parent controls state)
  useEffect(() => {
    if (onPress) {
      setIsExpanded(false);
      expandScale.value = withSpring(1, { damping: 14, stiffness: 160 });
    }
  }, [onPress, expandScale]);

  // ── Periodic pulse ─────────────────────────────────────────────────────────
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

  // ── Press feedback ─────────────────────────────────────────────────────────
  const pressScale = useSharedValue(1);
  const handlePressIn = useCallback(() => {
    cancelAnimation(pressScale);
    pressScale.value = withSpring(0.9, { damping: 12, stiffness: 400 });
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    cancelAnimation(pressScale);
    pressScale.value = withSpring(1, { damping: 12, stiffness: 400 });
  }, [pressScale]);

  // ── Centering (congrats intro) ─────────────────────────────────────────────
  const SW = screenWidth ?? 390;
  const SH = screenHeight ?? 844;
  const targetTX = SW / 2 - x;
  const targetTY = SH / 2 - y;
  const centeredProgress = useSharedValue(0);
  useEffect(() => {
    centeredProgress.value = withSpring(isCentered ? 1 : 0, { damping: 16, stiffness: 100 });
  }, [isCentered, centeredProgress]);

  /** Extra scale when sun menu is expanded (parent drives `sunExpanded`). */
  const SUN_MENU_EXPAND_BONUS = 0.22;

  // ── Composite animated style ───────────────────────────────────────────────
  const compositeStyle = useAnimatedStyle(() => {
    const sunExp = externalSunExpanded?.value ?? 0;
    const introScale = sunLoadScale?.value ?? 1;
    return {
      transform: [
        { translateX: centeredProgress.value * targetTX },
        { translateY: centeredProgress.value * targetTY - sunExp * 40 },
        {
          scale:
            avatarPulseScale.value *
            pressScale.value *
            expandScale.value *
            (1 + sunExp * SUN_MENU_EXPAND_BONUS) *
            introScale,
        },
      ],
    };
  });

  // ── Display percentage (animated during congrats) ─────────────────────────
  const [displayPctJs, setDisplayPctJs] = useState(sunLoadDisplayPct ? 0 : percentage);
  useAnimatedReaction(
    () => (sunLoadDisplayPct != null ? sunLoadDisplayPct.value : percentage),
    (current, previous) => {
      const rounded = Math.round(current);
      if (previous === null || rounded !== Math.round(previous as number)) {
        runOnJS(setDisplayPctJs)(rounded);
      }
    },
    [sunLoadDisplayPct, percentage],
  );

  const ringPctForIcons = sunLoadDisplayPct ? displayPctJs : percentage;

  const wrapperStyle = {
    position: "absolute" as const,
    left: x - avatarSize / 2,
    top: y - avatarSize / 2,
    width: avatarSize,
    height: avatarSize,
    zIndex: 25,
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={wrapperStyle}
    >
      <Animated.View
        style={[{ width: avatarSize, height: avatarSize }, compositeStyle]}
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
              opacity: 0.45,
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
                  stopColor={momentColors.sunny.background}
                  stopOpacity="0.9"
                />
                <Stop
                  offset="50%"
                  stopColor="#FFF176"
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
            <SvgCircle
              cx={avatarSize / 2}
              cy={avatarSize / 2}
              r={radius + 18}
              fill="url(#nebulaHalo)"
              filter={isSunLoadIntro ? undefined : "url(#nebulaBlur)"}
            />
            <SvgCircle
              cx={avatarSize / 2}
              cy={avatarSize / 2}
              r={radius}
              stroke={COSMIC_TRACK}
              strokeWidth={borderWidth}
              fill="none"
            />
            {isSunLoadIntro && sunLoadDisplayPct ? (
              <AnimatedSvgCircle
                animatedProps={animatedRingProps}
                cx={avatarSize / 2}
                cy={avatarSize / 2}
                r={radius}
                stroke="url(#focusedBorderGradient)"
                strokeWidth={borderWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeLinecap="round"
                transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
              />
            ) : (
              <>
                <SvgCircle
                  cx={avatarSize / 2}
                  cy={avatarSize / 2}
                  r={radius}
                  stroke="url(#focusedBorderGradient)"
                  strokeWidth={borderWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={staticRingDashOffset}
                  strokeLinecap="round"
                  filter="url(#focusedOuterGlow)"
                  transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
                />
                <SvgCircle
                  cx={avatarSize / 2}
                  cy={avatarSize / 2}
                  r={radius}
                  stroke="url(#focusedBorderGradient)"
                  strokeWidth={borderWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={staticRingDashOffset}
                  strokeLinecap="round"
                  filter="url(#focusedYellowGlow)"
                  transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
                />
              </>
            )}
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
              showPercentageLabel ? (
                <>
                  <ThemedText
                    size="xl"
                    weight="bold"
                    style={{
                      color: colors.primaryLight ?? colors.primary,
                      fontSize: 24,
                      includeFontPadding: false,
                    }}
                  >
                    {displayPctJs}%
                  </ThemedText>
                  <ThemedText
                    size="sm"
                    weight="medium"
                    style={{
                      color: colors.primaryLight ?? colors.primary,
                      fontSize: 12,
                      marginTop: -2,
                      includeFontPadding: false,
                    }}
                  >
                    {t("avatar.sunnyLife")}
                  </ThemedText>
                </>
              ) : null
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

        {/* Sun icon on the sunny arc */}
        {ringPctForIcons > 0 &&
          (() => {
            const sunnyArcAngle = -90 + ((ringPctForIcons / 100) * 360) / 2;
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
        {ringPctForIcons < 100 &&
          ringPctForIcons > 0 &&
          (() => {
            const cloudyStartAngle = -90 + (ringPctForIcons / 100) * 360;
            const cloudyArcLength = 360 - (ringPctForIcons / 100) * 360;
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
