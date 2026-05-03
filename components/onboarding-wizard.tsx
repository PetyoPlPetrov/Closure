/**
 * OnboardingWizard - Stepper flow for new users with no data.
 * Major steps: language → intro slides → tell your story → review entities.
 * AI processing uses a loading view (same stepper position as story, not its own step).
 * On Save: persist entities, open home tab, show walkthrough modal
 */
import { AILoadingView } from "@/components/ai-loading-view";
import { OnboardingEntityResultsView } from "@/components/onboarding-entity-results-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import type { AIOnboardingResponse } from "@/utils/ai-service";
import { processOnboardingPrompt } from "@/utils/ai-service";
import { ensureImageInAppDocuments } from "@/utils/entity-image-storage";
import { logError } from "@/utils/error-logger";
import { useJourney } from "@/utils/JourneyProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { setFocusedDisplayMode } from "@/utils/focused-display-mode-storage";
import {
  clearCachedOnboardingResponse,
  getCachedOnboardingResponse,
  setCachedOnboardingResponse,
  setOnboardingCompleted,
  setShowPostOnboardingAIWelcome,
  setShowWalkthroughAfterOnboarding,
} from "@/utils/onboarding-storage";
import { getSphere3DGradientColors, getSphereIconColor, getSphereShadowColor, getSphereSferaColor } from "@/utils/sphere-styles";
import type { LifeSphere } from "@/utils/JourneyProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Animated, { cancelAnimation, Easing, SharedValue, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { ClipPath, Defs, Ellipse as SvgEllipse, Path, RadialGradient as SvgRadialGradient, Rect, Stop, Circle as SvgCircle, LinearGradient as SvgLinearGradient } from "react-native-svg";
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

const MAX_INPUT_LENGTH = 500;
const MIN_WORDS = 50;
const TOTAL_ONBOARDING_STEPS = 7;

function formatDateToYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Sparkle dots for cosmic vibe on hierarchy slides ────────────────────────

const SPARKLE_DOTS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_WIDTH,
  y: Math.random() * SCREEN_HEIGHT,
  size: 1.5 + Math.random() * 2.5,
  delay: Math.floor(Math.random() * 2000),
  duration: 1200 + Math.floor(Math.random() * 1600),
}));

const OnboardingSparkle = React.memo(function OnboardingSparkle({ dot }: { dot: typeof SPARKLE_DOTS[number] }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      dot.delay,
      withTiming(0.7, { duration: 600, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          opacity.value = withRepeat(
            withTiming(0.25, { duration: dot.duration, easing: Easing.inOut(Easing.ease) }),
            -1,
            true,
          );
        }
      }),
    );
    return () => { cancelAnimation(opacity); };
  }, [dot.delay, dot.duration, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: dot.x - dot.size / 2,
        top: dot.y - dot.size / 2,
        width: dot.size,
        height: dot.size,
        borderRadius: dot.size / 2,
        backgroundColor: "rgba(255,255,255,0.9)",
        shadowColor: "rgba(255,255,255,0.8)",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: dot.size * 2,
      }, style]}
    />
  );
});

function OnboardingSparkles() {
  return (
    <>
      {SPARKLE_DOTS.map((dot) => <OnboardingSparkle key={dot.id} dot={dot} />)}
    </>
  );
}

// ─── Static sun preview (no absolute positioning, no SharedValue deps) ───────

function blendHexLocal(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const a = parse(hex1);
  const b = parse(hex2);
  return `#${Math.round(a.r * (1 - t) + b.r * t).toString(16).padStart(2, "0")}${Math.round(a.g * (1 - t) + b.g * t).toString(16).padStart(2, "0")}${Math.round(a.b * (1 - t) + b.b * t).toString(16).padStart(2, "0")}`;
}

const StaticSunPreview = React.memo(function StaticSunPreview({ size = 120, percentage = 72 }: { size?: number; percentage?: number }) {
  const DISC_R = size * 0.37;
  const RAY_COUNT = 16;
  const RAY_INNER = DISC_R + size * 0.025;
  const RAY_OUTER = DISC_R + size * 0.2;
  const RAY_BASE_W = size * 0.033;
  const RAY_TIP_W = 0.4;
  const C = size / 2;

  const FILL_TOP = "#F5C842";
  const FILL_BOT = blendHexLocal("#F5C842", "#000000", 0.35);

  const rayRotation = useSharedValue(0);
  useEffect(() => {
    rayRotation.value = withRepeat(
      withTiming(360, { duration: 120000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => { cancelAnimation(rayRotation); };
  }, [rayRotation]);

  const rotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rayRotation.value}deg` }],
  }));

  const rays = useMemo(() => Array.from({ length: RAY_COUNT }, (_, i) => {
    const angle = (i * 2 * Math.PI) / RAY_COUNT;
    const innerX = C + Math.cos(angle) * RAY_INNER;
    const innerY = C + Math.sin(angle) * RAY_INNER;
    const outerX = C + Math.cos(angle) * RAY_OUTER;
    const outerY = C + Math.sin(angle) * RAY_OUTER;
    const perp = angle + Math.PI / 2;
    const li = `${innerX + Math.cos(perp) * RAY_BASE_W} ${innerY + Math.sin(perp) * RAY_BASE_W}`;
    const ri = `${innerX + Math.cos(perp + Math.PI) * RAY_BASE_W} ${innerY + Math.sin(perp + Math.PI) * RAY_BASE_W}`;
    const lo = `${outerX + Math.cos(perp) * RAY_TIP_W} ${outerY + Math.sin(perp) * RAY_TIP_W}`;
    const ro = `${outerX + Math.cos(perp + Math.PI) * RAY_TIP_W} ${outerY + Math.sin(perp + Math.PI) * RAY_TIP_W}`;
    return { d: `M ${li} L ${lo} L ${ro} L ${ri} Z` };
  }), [C, RAY_INNER, RAY_OUTER, RAY_BASE_W]);

  const discTop = C - DISC_R;
  const fillClipY = discTop + DISC_R * 2 * (1 - percentage / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Rotating rays */}
      <Animated.View style={[{ position: "absolute", width: size, height: size }, rotatingStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
          {rays.map((ray, i) => (
            <Path key={i} d={ray.d} fill="#F5C842" opacity={0.82} />
          ))}
        </Svg>
      </Animated.View>
      {/* Static disc + fill */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }} pointerEvents="none">
        <Defs>
          <SvgRadialGradient id="obDiscGrad" cx={`${C}`} cy={`${C}`} r={`${DISC_R}`} fx={`${C}`} fy={`${C}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#1E2A4A" stopOpacity="1" />
            <Stop offset="70%" stopColor="#0A0E1A" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0D1525" stopOpacity="1" />
          </SvgRadialGradient>
          <SvgLinearGradient id="obFillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={FILL_TOP} stopOpacity="0.92" />
            <Stop offset="100%" stopColor={FILL_BOT} stopOpacity="1" />
          </SvgLinearGradient>
          <ClipPath id="obFillClip">
            <Rect x={0} y={fillClipY} width={size} height={size - fillClipY} />
          </ClipPath>
        </Defs>
        <SvgCircle cx={C} cy={C} r={DISC_R} fill="url(#obDiscGrad)" />
        <SvgCircle cx={C} cy={C} r={DISC_R} fill="url(#obFillGrad)" clipPath="url(#obFillClip)" />
      </Svg>
      {/* Text */}
      <View style={{ position: "absolute", width: DISC_R * 2, height: DISC_R * 2, borderRadius: DISC_R, justifyContent: "center", alignItems: "center" }} pointerEvents="none">
        <ThemedText weight="bold" style={{ color: "#FFFFFF", fontSize: size * 0.2, textShadowColor: "rgba(0,0,0,0.85)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
          {percentage}%
        </ThemedText>
        <ThemedText style={{ color: "#FFFFFF", fontSize: size * 0.095, opacity: 0.8, marginTop: -2, textShadowColor: "rgba(0,0,0,0.85)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
          Sunny Life
        </ThemedText>
      </View>
    </View>
  );
});

const StaticInsightsHub = React.memo(function StaticInsightsHub({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(186,104,200,0.22)",
        borderWidth: Math.max(2, Math.round(size * 0.045)),
        borderColor: "rgba(186,104,200,0.65)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#BA68C8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 10,
      }}
      pointerEvents="none"
    >
      <MaterialIcons
        name="insights"
        size={Math.round(size * 0.58)}
        color="#CE93D8"
      />
    </View>
  );
});

// ─── Static sfera ball (single sphere, no orbit animation) ────────────────────

const StaticSferaBall = React.memo(function StaticSferaBall({
  sphere,
  size,
  colorScheme,
}: {
  sphere: { type: LifeSphere; icon: string };
  size: number;
  colorScheme: "light" | "dark";
}) {
  const gradient3D = getSphere3DGradientColors(sphere.type, 60, colorScheme);
  const iconColor = getSphereIconColor(sphere.type, colorScheme, 60);
  const shadowColor = getSphereShadowColor(sphere.type, colorScheme);
  const iconSize = Math.round(size * 0.45);
  const uid = `ob-sphere-${sphere.type}`;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      shadowColor, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
      justifyContent: "center", alignItems: "center", overflow: "visible",
    }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute" }} pointerEvents="none">
        <Defs>
          <SvgRadialGradient id={uid} cx="50" cy="50" r="50" fx="32" fy="32" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={gradient3D.highlight} stopOpacity="1" />
            <Stop offset="38%" stopColor={gradient3D.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradient3D.shadow} stopOpacity="1" />
          </SvgRadialGradient>
        </Defs>
        <SvgCircle cx="50" cy="50" r="50" fill={`url(#${uid})`} />
      </Svg>
      {/* Specular highlight */}
      <View style={{ position: "absolute", left: "18%", top: "18%", width: "28%", height: "28%", borderRadius: 100, backgroundColor: "rgba(255,255,255,0.45)" }} />
      <MaterialIcons name={sphere.icon as any} size={iconSize} color={iconColor} style={{ zIndex: 1 }} />
    </View>
  );
});

// ─── Mock: one sfera with orbiting entity photo avatars ──────────────────────

const MOCK_ENTITY_PHOTOS = [
  require("@/assets/images/fake-family-emily.jpg"),
  require("@/assets/images/fake-family-sarah.jpg"),
  require("@/assets/images/fake-family-robert.jpg"),
  require("@/assets/images/fake-family-michael.jpg"),
  require("@/assets/images/fake-family-maria.jpg"),
];

const MOCK_SFERA_SIZE = 240;
const MOCK_SPHERE_SIZE = 88;
const MOCK_AVATAR_SIZE = 44;
const MOCK_ORBIT_R = MOCK_SPHERE_SIZE / 2 + MOCK_AVATAR_SIZE / 2 + 16;
const MOCK_C = MOCK_SFERA_SIZE / 2;

const MockOrbitingAvatar = React.memo(function MockOrbitingAvatar({
  photo, index, count, orbitAngle, glowColor,
}: {
  photo: number;
  index: number; count: number;
  orbitAngle: SharedValue<number>;
  glowColor: string;
}) {
  const baseAngle = (index / count) * 2 * Math.PI - Math.PI / 2;
  const avatarStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: MOCK_C + Math.cos(baseAngle + orbitAngle.value) * MOCK_ORBIT_R - MOCK_AVATAR_SIZE / 2,
    top:  MOCK_C + Math.sin(baseAngle + orbitAngle.value) * MOCK_ORBIT_R - MOCK_AVATAR_SIZE / 2,
  }));
  return (
    <Animated.View pointerEvents="none" style={[avatarStyle, {
      width: MOCK_AVATAR_SIZE, height: MOCK_AVATAR_SIZE,
      borderRadius: MOCK_AVATAR_SIZE / 2,
      shadowColor: glowColor, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.75, shadowRadius: 8, elevation: 8,
    }]}>
      <Image
        source={photo}
        style={{
          width: MOCK_AVATAR_SIZE, height: MOCK_AVATAR_SIZE,
          borderRadius: MOCK_AVATAR_SIZE / 2,
          borderWidth: 2, borderColor: "rgba(255,255,255,0.75)",
        }}
        contentFit="cover"
      />
    </Animated.View>
  );
});

const MockSferaWithEntities = React.memo(function MockSferaWithEntities({
  colorScheme,
}: { colorScheme: "light" | "dark" }) {
  const orbitAngle = useSharedValue(0);
  useEffect(() => {
    orbitAngle.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 14000, easing: Easing.linear }),
      -1, false,
    );
    return () => { cancelAnimation(orbitAngle); };
  }, [orbitAngle]);

  const sphere = { type: "family" as LifeSphere, icon: "family-restroom" };
  const glowColor = getSphereShadowColor("family", colorScheme);

  return (
    <View style={{ width: MOCK_SFERA_SIZE, height: MOCK_SFERA_SIZE }}>
      <View style={{ position: "absolute", left: MOCK_C - MOCK_SPHERE_SIZE / 2, top: MOCK_C - MOCK_SPHERE_SIZE / 2 }}>
        <StaticSferaBall sphere={sphere} size={MOCK_SPHERE_SIZE} colorScheme={colorScheme} />
      </View>
      {MOCK_ENTITY_PHOTOS.map((photo, i) => (
        <MockOrbitingAvatar
          key={i}
          photo={photo} index={i} count={MOCK_ENTITY_PHOTOS.length}
          orbitAngle={orbitAngle} glowColor={glowColor}
        />
      ))}
    </View>
  );
});

// ─── Mock: entity detail — central avatar + floating memory photo bubbles ─────

// Memory bubbles placed at fixed scatter positions (like the entity detail screen)
// Each bubble has moment icons orbiting it
const MOCK_MEMORY_DATA: {
  photo: number;
  moments: readonly ("wb-sunny" | "cloud" | "lightbulb")[];
  offsetX: number; offsetY: number;
}[] = [
  { photo: require("@/assets/images/fake-memory-1.jpg"),  moments: ["wb-sunny", "wb-sunny", "wb-sunny"] as const, offsetX: -88, offsetY: -72 },
  { photo: require("@/assets/images/fake-memory-3.jpg"),  moments: ["cloud", "cloud"] as const,                   offsetX:  72, offsetY: -60 },
  { photo: require("@/assets/images/fake-memory-5.jpg"),  moments: ["wb-sunny", "cloud"] as const,                offsetX: -80, offsetY:  64 },
  { photo: require("@/assets/images/fake-memory-7.jpg"),  moments: ["wb-sunny", "wb-sunny"] as const,             offsetX:  78, offsetY:  72 },
];

const MOCK_MEM_SIZE = 58;
const MOCK_MOM_SIZE = 14;
const MOCK_MOM_R = MOCK_MEM_SIZE / 2 + MOCK_MOM_SIZE / 2 + 4;
const MOCK_EV_SIZE = 280;
const MOCK_EV_C = MOCK_EV_SIZE / 2;
const MOCK_ENTITY_R = 52;

const MockFloatingMomentIcon = React.memo(function MockFloatingMomentIcon({
  name, color, offsetX, offsetY, floatY,
}: {
  name: "wb-sunny" | "cloud" | "lightbulb";
  color: string;
  offsetX: number; offsetY: number;
  floatY: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value * 3 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute",
      left: offsetX - MOCK_MOM_SIZE / 2,
      top: offsetY - MOCK_MOM_SIZE / 2,
      width: MOCK_MOM_SIZE, height: MOCK_MOM_SIZE,
      borderRadius: MOCK_MOM_SIZE / 2,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center", alignItems: "center",
      zIndex: 22,
      shadowColor: color, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85, shadowRadius: 4, elevation: 4,
    }, style]}>
      <MaterialIcons name={name} size={MOCK_MOM_SIZE - 3} color={color} />
    </Animated.View>
  );
});

const MockMemoryBubble = React.memo(function MockMemoryBubble({
  mem, floatY,
}: {
  mem: typeof MOCK_MEMORY_DATA[number];
  floatY: SharedValue<number>;
}) {
  const isSunny = mem.moments[0] === "wb-sunny";
  const borderColor = isSunny ? "#FFD700" : "#7EB8D4";

  // Compute moment icon positions around the bubble
  const momentPositions = mem.moments.map((iconName, j) => {
    const angle = (j / mem.moments.length) * 2 * Math.PI - Math.PI / 2;
    return {
      name: iconName,
      color: iconName === "wb-sunny" ? "#FFD700" : iconName === "cloud" ? "#7EB8D4" : "#D1DA40",
      x: Math.cos(angle) * MOCK_MOM_R,
      y: Math.sin(angle) * MOCK_MOM_R,
    };
  });

  const bubbleFloat = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value * 4 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: MOCK_EV_C + mem.offsetX - MOCK_MEM_SIZE / 2,
        top:  MOCK_EV_C + mem.offsetY - MOCK_MEM_SIZE / 2,
        width: MOCK_MEM_SIZE, height: MOCK_MEM_SIZE,
        zIndex: 15,
      }, bubbleFloat]}
    >
      {/* Memory photo circle */}
      <View style={{
        width: MOCK_MEM_SIZE, height: MOCK_MEM_SIZE,
        borderRadius: MOCK_MEM_SIZE / 2,
        borderWidth: 2.5, borderColor,
        shadowColor: borderColor, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7, shadowRadius: 8, elevation: 8,
        overflow: "hidden",
      }}>
        <Image source={mem.photo} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      </View>
      {/* Moment icons around bubble */}
      {momentPositions.map((m, j) => (
        <MockFloatingMomentIcon
          key={j}
          name={m.name} color={m.color}
          offsetX={MOCK_MEM_SIZE / 2 + m.x}
          offsetY={MOCK_MEM_SIZE / 2 + m.y}
          floatY={floatY}
        />
      ))}
    </Animated.View>
  );
});

const MockEntityWithMemories = React.memo(function MockEntityWithMemories() {
  const floatY0 = useSharedValue(0);
  const floatY1 = useSharedValue(0);
  const floatY2 = useSharedValue(0);
  const floatY3 = useSharedValue(0);

  useEffect(() => {
    const starts = [0, 600, 300, 900];
    const floats = [floatY0, floatY1, floatY2, floatY3];
    floats.forEach((f, i) => {
      f.value = withRepeat(
        withTiming(1, { duration: 1900 + i * 200, easing: Easing.inOut(Easing.ease) }),
        -1, true,
      );
    });
    return () => { floats.forEach(f => cancelAnimation(f)); };
  }, [floatY0, floatY1, floatY2, floatY3]);

  const floatValues = [floatY0, floatY1, floatY2, floatY3];

  return (
    <View style={{ width: MOCK_EV_SIZE, height: MOCK_EV_SIZE }}>
      {/* Memory bubbles */}
      {MOCK_MEMORY_DATA.map((mem, i) => (
        <MockMemoryBubble key={i} mem={mem} floatY={floatValues[i]} />
      ))}
      {/* Central entity avatar */}
      <View style={{
        position: "absolute",
        left: MOCK_EV_C - MOCK_ENTITY_R, top: MOCK_EV_C - MOCK_ENTITY_R,
        width: MOCK_ENTITY_R * 2, height: MOCK_ENTITY_R * 2,
        borderRadius: MOCK_ENTITY_R,
        borderWidth: 2.5, borderColor: "#FFD700",
        shadowColor: "#FFD700", shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
        overflow: "hidden",
        zIndex: 20,
      }}>
        <Image
          source={require("@/assets/images/fake-profile-mark.jpg")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>
    </View>
  );
});

// ─── Mini orbit diagram: sun at center, 5 sferas in real focused-sfera-view positions ──
//
// Mirrors the math from focused-sfera-view.tsx containerStyle worklet.
// Slot 0 = bottom (0°), slots go clockwise at 72° each.
// Angle convention: centerX = C + R*sin(rad), centerY = C + R*cos(rad)  (0° = bottom)
// Depth: depthScale = 0.38 + 0.62*sqrt((1+cos(rad))/2)
// Y offsets replicate the per-slot corrections from the real view, scaled down.

const MINI_ORBIT_R = 100;   // scaled-down from 135
const MINI_SUN_SIZE = 68;
// Per-slot sizes from the real view, scaled to ~75% of originals
const MINI_SLOT_SIZES = [
  82, // slot 0 — bottom / "focused"
  48, // slot 1 — right-below
  30, // slot 2 — top-right
  48, // slot 3 — top-left
  44, // slot 4 — left-below
];
const MINI_CANVAS = 330;
const MINI_C = MINI_CANVAS / 2;
const SLOT_ANGLE_DEG = 72;

const MINI_SPHERE_LIST: { type: LifeSphere; icon: string }[] = [
  { type: "relationships", icon: "favorite" },   // slot 0 — bottom
  { type: "career",        icon: "work" },        // slot 1 — right-below
  { type: "hobbies",       icon: "sports-esports" }, // slot 2 — top-right
  { type: "friends",       icon: "people" },      // slot 3 — top-left
  { type: "family",        icon: "family-restroom" }, // slot 4 — left-below
];

const MiniOrbitingSfera = React.memo(function MiniOrbitingSfera({
  sphere, slot, orbitAngle, colorScheme,
}: {
  sphere: { type: LifeSphere; icon: string };
  slot: number;
  orbitAngle: SharedValue<number>;
  colorScheme: "light" | "dark";
}) {
  const baseAngle = (slot * SLOT_ANGLE_DEG * Math.PI) / 180;
  const size = MINI_SLOT_SIZES[slot];

  const style = useAnimatedStyle(() => {
    const rad = baseAngle + orbitAngle.value;
    const centerX = MINI_C + MINI_ORBIT_R * Math.sin(rad);
    const centerY = MINI_C + MINI_ORBIT_R * Math.cos(rad);

    // Exact depth formula from focused-sfera-view
    const x = (1 + Math.cos(rad)) / 2;
    const depthScale = 0.38 + 0.62 * Math.sqrt(Math.max(0, x));

    // Y offsets — same logic, scaled to ~40% (original offsets were for full-screen)
    const backOffsetY  = -9.5 * (1 - Math.cos(rad)); // smooth continuous version of the back-half offset
    const unfocusedOffsetY = slot === 0 ? 0 : -11;
    const rightSideOffsetY = slot === 1 || slot === 2 ? -9 : 0;
    const rightBelowExtraOffsetY = slot === 1 ? -3 : 0;
    const topPairOffsetY = slot === 2 || slot === 3 ? 4 : 0;
    const topLeftExtraOffsetY = slot === 3 ? 7 : 0;

    const finalY = centerY + backOffsetY + unfocusedOffsetY + rightSideOffsetY + rightBelowExtraOffsetY + topPairOffsetY + topLeftExtraOffsetY;

    return {
      position: "absolute" as const,
      left: centerX - size / 2,
      top: finalY - size / 2,
      width: size, height: size,
      transform: [{ scale: depthScale }],
      zIndex: Math.round(depthScale * 10),
      opacity: 0.55 + 0.45 * depthScale,
    };
  });

  return (
    <Animated.View pointerEvents="none" style={style}>
      <StaticSferaBall sphere={sphere} size={size} colorScheme={colorScheme} />
    </Animated.View>
  );
});

const MiniOrbitDiagram = React.memo(function MiniOrbitDiagram({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const orbitAngle = useSharedValue(0);
  useEffect(() => {
    orbitAngle.value = withTiming(2 * Math.PI * 10000, { duration: 16000 * 10000, easing: Easing.linear });
    return () => { cancelAnimation(orbitAngle); };
  }, [orbitAngle]);

  return (
    <View style={{ width: MINI_CANVAS, height: MINI_CANVAS, marginTop: -40 }}>
      {/* Orbit circle guide */}
      <Svg width={MINI_CANVAS} height={MINI_CANVAS} style={{ position: "absolute" }} pointerEvents="none">
        <SvgEllipse
          cx={MINI_C} cy={MINI_C}
          rx={MINI_ORBIT_R} ry={MINI_ORBIT_R}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 6"
        />
      </Svg>
      {/* Orbiting sferas */}
      {MINI_SPHERE_LIST.map((s, i) => (
        <MiniOrbitingSfera
          key={s.type} sphere={s} slot={i}
          orbitAngle={orbitAngle} colorScheme={colorScheme}
        />
      ))}
      {/* Insights hub always on top */}
      <View style={{ position: "absolute", left: MINI_C - MINI_SUN_SIZE / 2, top: MINI_C - MINI_SUN_SIZE / 2, zIndex: 20, width: MINI_SUN_SIZE, height: MINI_SUN_SIZE, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
        <StaticInsightsHub size={MINI_SUN_SIZE} />
      </View>
    </View>
  );
});

export type OnboardingWizardProps = {
  /** When true (e.g. re-run from Settings), back arrow exits onboarding instead of going to previous step. */
  canExitEarly?: boolean;
  /** Called when user taps back to exit onboarding. Redirects to Sferas tab. */
  onExit?: () => void;
};

export function OnboardingWizard({
  canExitEarly = false,
  onExit,
}: OnboardingWizardProps = {}) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? "dark"];
  const t = useTranslate();
  const { language, setLanguage } = useLanguage();
  const { addProfile, addJob, addFamilyMember, addFriend, addHobby, reloadAll } =
    useJourney();

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCachedOnboardingResponse().then((cached) => {
      if (cancelled || !cached) return;
      setAiResponse(cached);
      setStep(6);
    });
    return () => { cancelled = true; };
  }, []);
  const [aiResponse, setAiResponse] = useState<AIOnboardingResponse | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wordCount = useMemo(
    () =>
      inputText
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length,
    [inputText],
  );
  const hasMinWords = wordCount >= MIN_WORDS;
  const exceedsMax = inputText.length > MAX_INPUT_LENGTH;
  const canSubmit = hasMinWords && !exceedsMax && !isProcessing;

  const setInputTextWithLimit = useCallback((text: string) => {
    if (text.length > MAX_INPUT_LENGTH)
      setInputText(text.slice(0, MAX_INPUT_LENGTH));
    else setInputText(text);
  }, []);

  const speechToText = useSpeechToText({
    language: language ?? "en",
    getText: () => inputText,
    setText: setInputTextWithLimit,
    disabled: isProcessing,
  });

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    setErrorMessage(null);
    Keyboard.dismiss();
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 100));
    const startTime = Date.now();
    try {
      const response = await processOnboardingPrompt(
        inputText.trim(),
        language ?? "en",
      );
      // Ensure loader is visible for at least 600ms (avoids flash if API is fast)
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }
      setAiResponse(response);
      await setCachedOnboardingResponse(response);
      setStep(6);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : (t("ai.error.send") ?? "Failed to process"),
      );
    } finally {
      setIsProcessing(false);
    }
  }, [canSubmit, inputText, language, t]);

  const persistEntities = useCallback(
    async (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => {
      const spheres = [
        "relationships",
        "career",
        "family",
        "friends",
        "hobbies",
      ] as const;
      for (const sphere of spheres) {
        const entities = entitiesBySphere[sphere];
        if (!Array.isArray(entities) || entities.length === 0) continue;

        for (const entity of entities) {
          const imageUri = entity.imageUri
            ? await ensureImageInAppDocuments(entity.imageUri)
            : undefined;

          if (sphere === "family") {
            await addFamilyMember({
              name: entity.name.trim(),
              relationship: entity.relationship?.trim() ?? "",
              description: entity.description?.trim(),
              imageUri,
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "friends") {
            await addFriend({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              imageUri,
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "hobbies") {
            await addHobby({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              imageUri,
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "relationships") {
            let start: string | undefined;
            if (entity.startDate) {
              const d = new Date(entity.startDate);
              start = !isNaN(d.getTime())
                ? formatDateToYMD(d)
                : entity.startDate;
            }
            let end: string | null = null;
            if (entity.endDate) {
              const d = new Date(entity.endDate);
              end = !isNaN(d.getTime()) ? formatDateToYMD(d) : entity.endDate;
            }
            await addProfile({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              relationshipStartDate: start,
              relationshipEndDate: end,
              imageUri,
              sphere: "relationships",
              setupProgress: 0,
              isCompleted: false,
            });
          } else if (sphere === "career") {
            let start: string | undefined;
            if (entity.startDate) {
              const d = new Date(entity.startDate);
              start = !isNaN(d.getTime())
                ? formatDateToYMD(d)
                : entity.startDate;
            }
            let end: string | null = null;
            if (entity.endDate) {
              const d = new Date(entity.endDate);
              end = !isNaN(d.getTime()) ? formatDateToYMD(d) : entity.endDate;
            }
            await addJob({
              name: entity.name.trim(),
              description: entity.description?.trim(),
              startDate: start,
              endDate: end,
              imageUri,
              setupProgress: 0,
              isCompleted: false,
            });
          }
        }
      }
    },
    [addProfile, addJob, addFamilyMember, addFriend, addHobby],
  );

  const handleCacheOnboardingResponse = useCallback(
    (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => {
      setCachedOnboardingResponse({ entitiesBySphere });
    },
    []
  );

  const handleStartOver = useCallback(async () => {
    await clearCachedOnboardingResponse();
    setAiResponse(null);
    setInputText("");
    setStep(5);
  }, []);

  const handleSave = useCallback(
    async (entitiesBySphere: AIOnboardingResponse["entitiesBySphere"]) => {
      try {
        await persistEntities(entitiesBySphere);
        await reloadAll();
        await clearCachedOnboardingResponse();
        await setOnboardingCompleted(true);
        await setShowWalkthroughAfterOnboarding(false);
        await setShowPostOnboardingAIWelcome(true);
        await setFocusedDisplayMode("memoryBalanceRings");
        router.replace("/(tabs)");
      } catch (err) {
        void logError("OnboardingSave:handleSave", err, {
          stage: "persist_or_reload",
        });
        Alert.alert(
          t("common.error") ?? "Error",
          err instanceof Error
            ? err.message
            : (t("ai.entity.saveError") ?? "Failed to save"),
        );
      }
    },
    [persistEntities, reloadAll, t],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor:
            colorScheme === "dark" ? colors.background : "#ffffff",
        },
        header: {
          position: "relative",
          zIndex: 1,
          paddingHorizontal: 20 * fontScale,
          paddingTop: 60 * fontScale,
          paddingBottom: 16 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        stepper: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16 * fontScale,
        },
        stepDot: {
          width: 10 * fontScale,
          height: 10 * fontScale,
          borderRadius: 5 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.3)"
              : "rgba(0, 0, 0, 0.3)",
        },
        stepDotActive: {
          backgroundColor: colors.primary,
        },
        stepLine: {
          flex: 1,
          height: 2,
          marginHorizontal: 8,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(0, 0, 0, 0.2)",
        },
        content: {
          flex: 1,
          position: "relative",
          zIndex: 1,
          padding: 20 * fontScale,
        },
        inputWrapper: {
          position: "relative",
          marginBottom: 16 * fontScale,
        },
        textInput: {
          minHeight: 260 * fontScale,
          maxHeight: 320 * fontScale,
          padding: 12 * fontScale,
          paddingRight: 16 * fontScale + 64 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          color: colors.text,
          fontSize: 15 * fontScale,
          lineHeight: 21 * fontScale,
          textAlignVertical: "top",
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.15)"
              : "rgba(0, 0, 0, 0.1)",
        },
        micButton: {
          width: 52 * fontScale,
          height: 52 * fontScale,
          borderRadius: 26 * fontScale,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
        },
        micButtonRecording: {
          backgroundColor: "#FF4444",
        },
        submitButton: {
          height: 52 * fontScale,
          borderRadius: 12 * fontScale,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        },
        submitButtonEnabled: {
          shadowColor: "#8EC8FF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 28,
          elevation: 10,
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24 * fontScale,
        },
        errorText: {
          color: "#FF4444",
          marginTop: 12 * fontScale,
        },
      }),
    [colorScheme, colors, fontScale],
  );

  const renderMainStepper = useCallback(
    (activeStepIndex: number, compact = false) => (
      <View style={[styles.stepper, compact && { marginBottom: 0 }]}>
        {Array.from({ length: TOTAL_ONBOARDING_STEPS }).map((_, index) => (
          <React.Fragment key={index}>
            <View
              style={[
                styles.stepDot,
                index <= activeStepIndex && styles.stepDotActive,
              ]}
            />
            {index < TOTAL_ONBOARDING_STEPS - 1 ? (
              <View
                style={[
                  styles.stepLine,
                  index < activeStepIndex && { backgroundColor: colors.primary },
                ]}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    ),
    [colors.primary, styles],
  );

  const handleSelectLanguage = useCallback(
    async (lang: "en" | "bg") => {
      await setLanguage(lang);
      setStep(1);
    },
    [setLanguage],
  );

  // Step 0: Choose language (EN / BG)
  if (step === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {(canExitEarly && onExit ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16 * fontScale,
              }}
            >
              <TouchableOpacity
                onPress={() => onExit()}
                style={{
                  width: 44 * fontScale,
                  height: 44 * fontScale,
                  borderRadius: 22 * fontScale,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8 * fontScale,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24 * fontScale}
                  color={colorScheme === "dark" ? "#E8D5B7" : "#8B6914"}
                />
              </TouchableOpacity>
              <View style={[styles.stepper, { flex: 1, marginBottom: 0 }]}>
                {renderMainStepper(0, true)}
              </View>
            </View>
          ) : (
            renderMainStepper(0)
          ))}
          <ThemedText
            size="xl"
            weight="bold"
            style={{ color: colorScheme === "dark" ? "#E8D5B7" : "#8B6914" }}
          >
            {t("onboarding.language.title")}
          </ThemedText>
          <ThemedText
            size="m"
            style={{
              marginTop: 8 * fontScale,
              color:
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.65)"
                  : "rgba(0, 0, 0, 0.6)",
            }}
          >
            {t("onboarding.language.subtitle")}
          </ThemedText>
        </View>
        <View style={[styles.content, { justifyContent: "center", gap: 16 * fontScale }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              styles.submitButtonEnabled,
              { marginHorizontal: 0 },
            ]}
            onPress={() => void handleSelectLanguage("en")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4A90E2", "#357ABD", "#2E6DA4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 * fontScale }]}
            />
            <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
              {t("settings.language.english") ?? "English"}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              styles.submitButtonEnabled,
              { marginHorizontal: 0 },
            ]}
            onPress={() => void handleSelectLanguage("bg")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4A90E2", "#357ABD", "#2E6DA4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 * fontScale }]}
            />
            <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
              {t("settings.language.bulgarian") ?? "Bulgarian"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Steps 1-4: Hierarchy introduction screens (each as major step)
  if (step >= 1 && step <= 4) {
    const slideData = [
      {
        illustration: null,
        title: t("onboarding.hierarchy.whysferas.title"),
        body: t("onboarding.hierarchy.whysferas.body"),
        extras: null,
      },
      {
        illustration: (
          <View style={{ width: 110 * fontScale, height: 110 * fontScale, alignItems: "center", justifyContent: "center" }}>
            <StaticInsightsHub size={110 * fontScale} />
          </View>
        ),
        title: t("onboarding.hierarchy.universe.title"),
        body: t("onboarding.hierarchy.universe.body"),
        extras: (
          <MiniOrbitDiagram colorScheme={(colorScheme ?? "dark") as "light" | "dark"} />
        ),
      },
      {
        illustration: (
          <MockSferaWithEntities colorScheme={(colorScheme ?? "dark") as "light" | "dark"} />
        ),
        title: t("onboarding.hierarchy.entities.title"),
        body: t("onboarding.hierarchy.entities.body"),
        extras: null,
      },
      {
        illustration: (
          <MockEntityWithMemories />
        ),
        title: t("onboarding.hierarchy.memories.title"),
        body: t("onboarding.hierarchy.memories.body"),
        extras: null,
      },
    ];

    const slideIndex = (step - 1) as 0 | 1 | 2 | 3;
    const slide = slideData[slideIndex];

    return (
      <View style={styles.container}>
        {/* Cosmic sparkle dots */}
        <View style={{ position: "absolute", left: 0, top: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, pointerEvents: "none", zIndex: 0 }}>
          <OnboardingSparkles />
        </View>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 * fontScale }}>
            <TouchableOpacity
              onPress={() => {
                if (slideIndex === 0) {
                  setStep(0);
                } else {
                  setStep((step - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
                }
              }}
              style={{
                width: 44 * fontScale,
                height: 44 * fontScale,
                borderRadius: 22 * fontScale,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8 * fontScale,
                backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24 * fontScale} color={colorScheme === "dark" ? "#E8D5B7" : "#8B6914"} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={{ marginBottom: 8 * fontScale }}>
                {renderMainStepper(step, true)}
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 * fontScale, alignItems: "center" }}
          showsVerticalScrollIndicator={false}
        >
          {/* Illustration */}
          {slide.illustration ? (
            <View style={{ marginBottom: 24 * fontScale }}>
              {slide.illustration}
            </View>
          ) : (slide as any).image ? (
            <View style={{ width: 180 * fontScale, height: 180 * fontScale, marginBottom: 24 * fontScale }}>
              <Image source={(slide as any).image} style={{ width: "100%", height: "100%" }} contentFit="contain" />
            </View>
          ) : null}

          {/* Title + Body — elevated zIndex so orbiting sferas pass behind */}
          <View style={{ zIndex: 10, alignItems: "center", width: "100%", flex: slideIndex === 0 ? 1 : undefined }}>
            <ThemedText size="xl" weight="bold" style={{ textAlign: "center", color: colorScheme === "dark" ? "#E8D5B7" : "#8B6914", marginBottom: 12 * fontScale }}>
              {slide.title}
            </ThemedText>

            {slideIndex === 0 ? (() => {
              const paragraphs = slide.body.split("\n\n");
              const intro = paragraphs.slice(0, -1);
              const last = paragraphs[paragraphs.length - 1];
              return (
                <>
                  {intro.map((p, i) => (
                    <ThemedText key={i} size="m" style={{ textAlign: "center", opacity: 0.75, lineHeight: 22 * fontScale, marginBottom: 16 * fontScale, width: "100%" }}>
                      {p}
                    </ThemedText>
                  ))}
                  <View style={{ flex: 1 }} />
                  <ThemedText size="m" style={{ textAlign: "left", opacity: 0.75, lineHeight: 22 * fontScale, width: "100%", paddingRight: "52%", marginBottom: 80 * fontScale }}>
                    {last}
                  </ThemedText>
                </>
              );
            })() : (
              <ThemedText size="m" style={{ textAlign: "center", opacity: 0.75, lineHeight: 22 * fontScale }}>
                {slide.body}
              </ThemedText>
            )}
          </View>

          {/* Extras */}
          <View style={{ alignItems: "center" }}>{slide.extras}</View>
        </ScrollView>

        {/* DayDream illustration — behind footer buttons on last slide */}
        {slideIndex === 0 && (
          <Image
            source={require("@/DayDream.png")}
            style={{
              position: "absolute",
              bottom: 30 * fontScale,
              right: -16 * fontScale,
              width: 280 * fontScale,
              height: 330 * fontScale,
              zIndex: 0,
            }}
            contentFit="contain"
          />
        )}

        {/* Footer nav */}
        <View style={{ flexDirection: "row", paddingHorizontal: 20 * fontScale, paddingBottom: 64 * fontScale, gap: 12 * fontScale, zIndex: 1 }}>
          <TouchableOpacity
            onPress={() => {
              if (slideIndex === 0) {
                setStep(0);
              } else {
                setStep((step - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
              }
            }}
            style={{
              flex: 1,
              height: 52 * fontScale,
              borderRadius: 12 * fontScale,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            }}
            activeOpacity={0.7}
          >
            <ThemedText size="l" weight="bold">{t("onboarding.back")}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (slideIndex < 3) {
                setStep((step + 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
              } else {
                setStep(5);
              }
            }}
            style={[styles.submitButton, styles.submitButtonEnabled, { flex: 1, overflow: "hidden" }]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4A90E2", "#357ABD", "#2E6DA4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 * fontScale }]}
            />
            <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
              {t("onboarding.next")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading while AI processes — same stepper position as "tell your story" (not a separate step)
  if (isProcessing) {
    const loadingMessages = [
      t("onboarding.sferaAnalyzing"),
      t("onboarding.analyzing"),
      t("ai.loading.thinking") ?? "AI is thinking...",
      t("ai.loading.processing") ?? "Processing memories...",
    ];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {renderMainStepper(5)}
          <ThemedText size="xl" weight="bold">
            {t("onboarding.analyzing")}
          </ThemedText>
        </View>
        <AILoadingView messages={loadingMessages} />
      </View>
    );
  }

  // Step 5: Tell your story
  if (step === 5) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }} collapsable={false}>
        <Pressable style={styles.header} onPress={Keyboard.dismiss}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16 * fontScale,
            }}
          >
            <TouchableOpacity
              onPress={() => setStep(4)}
              style={{
                width: 44 * fontScale,
                height: 44 * fontScale,
                borderRadius: 22 * fontScale,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8 * fontScale,
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={24 * fontScale}
                color={colorScheme === "dark" ? "#E8D5B7" : "#8B6914"}
              />
            </TouchableOpacity>
            <View style={[styles.stepper, { flex: 1, marginBottom: 0 }]}>
              {renderMainStepper(5, true)}
            </View>
          </View>
          <ThemedText
            size="xl"
            weight="bold"
            style={{ color: colorScheme === "dark" ? "#E8D5B7" : "#8B6914" }}
          >
            {t("onboarding.title")}
          </ThemedText>
          {!keyboardVisible && (
            <>
              <ThemedText
                size="m"
                style={{
                  marginTop: 8 * fontScale,
                  color:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.65)"
                      : "rgba(0, 0, 0, 0.6)",
                }}
              >
                {t("onboarding.subtitle")}
              </ThemedText>

              {/* Sfera badges - dark bg, per-category icon colors (no border to avoid selected-state look) */}
              <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10 * fontScale,
              marginTop: 16 * fontScale,
            }}
          >
            {(
              [
                {
                  sphere: "family" as LifeSphere,
                  icon: "family-restroom" as const,
                  label: t("onboarding.sphere.family") || "Family",
                },
                {
                  sphere: "friends" as LifeSphere,
                  icon: "people" as const,
                  label: t("onboarding.sphere.friends") || "Friends",
                },
                {
                  sphere: "career" as LifeSphere,
                  icon: "work" as const,
                  label: t("onboarding.sphere.career") || "Job",
                },
                {
                  sphere: "hobbies" as LifeSphere,
                  icon: "local-cafe" as const,
                  label: t("onboarding.sphere.hobbies") || "Hobbies",
                },
                {
                  sphere: "relationships" as LifeSphere,
                  icon: "favorite" as const,
                  label: t("onboarding.sphere.relationships") || "Relationships",
                },
              ] as const
            ).map((s) => ({
              ...s,
              iconColor: getSphereSferaColor(
                s.sphere,
                (colorScheme ?? "dark") as "light" | "dark",
              ),
            })).map((s) => (
              <View
                key={s.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14 * fontScale,
                  paddingVertical: 10 * fontScale,
                  borderRadius: 24 * fontScale,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(42, 37, 32, 0.95)"
                      : "rgba(60, 55, 50, 0.15)",
                }}
              >
                <MaterialIcons
                  name={s.icon}
                  size={18 * fontScale}
                  color={s.iconColor}
                  style={{ marginRight: 8 * fontScale }}
                />
                <ThemedText
                  size="sm"
                  style={{
                    color:
                      colorScheme === "dark"
                        ? "rgba(255, 255, 255, 0.9)"
                        : "rgba(0, 0, 0, 0.85)",
                  }}
                >
                  {s.label}
                </ThemedText>
              </View>
            ))}
              </View>
            </>
          )}
        </Pressable>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
          keyboardShouldPersistTaps="never"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                position: "relative" as const,
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                borderRadius: 16 * fontScale,
                padding: 16 * fontScale,
              },
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputTextWithLimit}
              placeholder={
                t("onboarding.placeholder")
              }
              placeholderTextColor={
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.45)"
                  : "rgba(0, 0, 0, 0.45)"
              }
              multiline
              scrollEnabled
              maxLength={MAX_INPUT_LENGTH}
              editable={!isProcessing}
            />
            {/* Mic button - top right of input, lowered */}
            <View
              style={{
                position: "absolute",
                right: 28 * fontScale,
                top: 48 * fontScale,
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.micButton,
                  speechToText.isRecording && styles.micButtonRecording,
                ]}
                onPress={
                  speechToText.isRecording
                    ? () => void speechToText.stop()
                    : () => void speechToText.start()
                }
                disabled={isProcessing}
              >
                <MaterialIcons
                  name={speechToText.isRecording ? "stop" : "mic"}
                  size={24 * fontScale}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          <ThemedText size="sm" style={{ opacity: 0.6, marginBottom: 16 }}>
            {MIN_WORDS}+ words • {inputText.length}/{MAX_INPUT_LENGTH} chars
          </ThemedText>
        </ScrollView>

        {/* Fixed footer: person + sferas + submit - always visible at bottom */}
        <View
          style={{
            position: "relative",
            zIndex: 1,
            paddingHorizontal: 20 * fontScale,
            paddingTop: keyboardVisible ? 24 * fontScale : 0,
            paddingBottom: 64 * fontScale,
            minHeight: 120 * fontScale,
            justifyContent: "flex-end",
          }}
        >
          {/* Sferas - just above the person */}
          <View
            style={{
              position: "absolute",
              right: -10 * fontScale,
              bottom: 150 * fontScale,
              width: 165 * fontScale,
              height: 130 * fontScale,
              zIndex: 1,
            }}
          >
            <Image
              source={require("@/assets/images/onboarding-sferas.png")}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          </View>
          {/* Person - sitting almost on top of submit button */}
          <View
            style={{
              position: "absolute",
              right: -10 * fontScale,
              bottom: 40,
              width: 190 * fontScale,
              height: 260 * fontScale,
              zIndex: 2,
            }}
          >
            <Image
              source={require("@/assets/images/onboarding-person.png")}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              canSubmit && styles.submitButtonEnabled,
              !canSubmit && styles.submitButtonDisabled,
            ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  canSubmit ? ["#4A90E2", "#357ABD", "#2E6DA4"] : ["#666", "#555"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 12 * fontScale }]}
              />
              <ThemedText size="l" weight="bold" style={{ color: "#FFFFFF" }}>
                {t("onboarding.analyze")}
              </ThemedText>
            </TouchableOpacity>
        </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  // Step 6: Edit entities (review)
  if (step === 6 && aiResponse) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16 * fontScale,
            }}
          >
            <TouchableOpacity
              onPress={() => setStep(5)}
              style={{
                width: 44 * fontScale,
                height: 44 * fontScale,
                borderRadius: 22 * fontScale,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8 * fontScale,
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={24 * fontScale}
                color={colorScheme === "dark" ? "#E8D5B7" : "#8B6914"}
              />
            </TouchableOpacity>
            <View style={[styles.stepper, { flex: 1, marginBottom: 0 }]}>
              {renderMainStepper(6, true)}
            </View>
          </View>
          <ThemedText size="xl" weight="bold">
            {t("onboarding.review")}
          </ThemedText>
          <ThemedText
            size="m"
            style={{ marginTop: 8 * fontScale, opacity: 0.8 }}
          >
            {t("onboarding.reviewSubtitle")}
          </ThemedText>
        </View>

        <View style={{ flex: 1 }}>
          <OnboardingEntityResultsView
            entitiesBySphere={aiResponse.entitiesBySphere}
            onSave={handleSave}
            onStartOver={handleStartOver}
            onEntitiesBySphereChange={handleCacheOnboardingResponse}
          />
        </View>
      </View>
    );
  }

  return null;
}
