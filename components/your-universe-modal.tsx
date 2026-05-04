import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Circle as SvgCircle,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

// A single lesson entry with its source memory context
type LessonEntry = {
  text: string;
  memoryTitle: string;
  memoryImageUri?: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Book dimensions — two pages side by side
const BOOK_H = SCREEN_WIDTH * 0.84;
const PAGE_W = (SCREEN_WIDTH - 32) / 2; // half book minus spine gap
const SPINE_W = 14;

// ─── Mini Sun ─────────────────────────────────────────────────────────────────

function StaticMiniSun({ color, size = 90 }: { color: string; size?: number }) {
  const DISC_R = size * 0.38;
  const RAY_COUNT = 12;
  const RAY_INNER = DISC_R + 2;
  const RAY_OUTER = DISC_R + size * 0.2;
  const RAY_BASE_W = 3;
  const RAY_TIP_W = 0.4;
  const C = size / 2;

  const rays = useMemo(
    () =>
      Array.from({ length: RAY_COUNT }, (_, i) => {
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
        return `M ${li} L ${lo} L ${ro} L ${ri} Z`;
      }),
    [C, DISC_R, RAY_INNER, RAY_OUTER],
  );

  const rotation = useSharedValue(0);
  const haloOpacity = useSharedValue(0.3);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 18000, easing: Easing.linear }),
      -1,
      false,
    );
    haloOpacity.value = withRepeat(
      withTiming(0.7, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(haloOpacity);
    };
  }, [rotation, haloOpacity]);

  const rotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOpacity.value }));
  const haloSize = size * 1.6;
  const haloOff = (haloSize - size) / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            borderWidth: 1.5,
            borderColor: color,
            top: -haloOff,
            left: -haloOff,
          },
          haloStyle,
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[{ position: "absolute", width: size, height: size }, rotStyle]}
        pointerEvents="none"
      >
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: "absolute" }}
        >
          {rays.map((d, i) => (
            <Path key={i} d={d} fill={color} opacity={0.75} />
          ))}
        </Svg>
      </Animated.View>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute" }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id="discGrad"
            cx={`${C}`}
            cy={`${C}`}
            r={`${DISC_R}`}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#1E2A20" stopOpacity="1" />
            <Stop offset="60%" stopColor="#0D1525" stopOpacity="1" />
            <Stop offset="100%" stopColor="#080E1A" stopOpacity="1" />
          </RadialGradient>
          <SvgLinearGradient id="sunFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </SvgLinearGradient>
        </Defs>
        <SvgCircle cx={C} cy={C} r={DISC_R} fill="url(#discGrad)" />
        <SvgCircle cx={C} cy={C} r={DISC_R} fill="url(#sunFill)" />
      </Svg>
      <View
        style={{
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ThemedText
          style={{ fontSize: DISC_R * 1.1, lineHeight: DISC_R * 1.4 }}
        >
          😌
        </ThemedText>
      </View>
    </View>
  );
}

// ─── Starfield ────────────────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        x: seededRandom(i * 3 + 1) * SCREEN_WIDTH,
        y: seededRandom(i * 3 + 2) * SCREEN_HEIGHT,
        r: seededRandom(i * 3 + 3) * 1.4 + 0.4,
        opacity: seededRandom(i * 3 + 7) * 0.5 + 0.2,
      })),
    [],
  );

  return (
    <Svg
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
          <Stop offset="0%" stopColor="#0D1A2E" stopOpacity="1" />
          <Stop offset="60%" stopColor="#06101C" stopOpacity="1" />
          <Stop offset="100%" stopColor="#030A14" stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="nebulaGlow" cx="50%" cy="30%" r="40%">
          <Stop offset="0%" stopColor="#1A2A4A" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#0D1A2E" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        fill="url(#bgGrad)"
      />
      <Ellipse
        cx={SCREEN_WIDTH * 0.5}
        cy={SCREEN_HEIGHT * 0.28}
        rx={SCREEN_WIDTH * 0.65}
        ry={SCREEN_HEIGHT * 0.32}
        fill="url(#nebulaGlow)"
      />
      {stars.map((s, i) => (
        <SvgCircle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#FFFFFF"
          opacity={s.opacity}
        />
      ))}
    </Svg>
  );
}

// ─── Page Content (static, no animation) ─────────────────────────────────────

// ─── Layout patterns ──────────────────────────────────────────────────────────
// 0: image top-center, text below  (classic)
// 1: image left, text right        (side-by-side)
// 2: image right, text left        (mirrored side-by-side)
// 3: no image, large centered text (quote style)
const PATTERN_COUNT = 4;

function getPattern(lessonIndex: number): number {
  return ((lessonIndex * 7 + 3) % PATTERN_COUNT + PATTERN_COUNT) % PATTERN_COUNT;
}

function PageContent({
  entry,
  lessonIndex,
  displayNumber,
  total,
  lessonColor,
  side,
  dimmed,
  role,
}: {
  entry: LessonEntry;
  lessonIndex: number;
  displayNumber?: number; // explicit 1-based page number; if omitted uses lessonIndex+1
  total: number;
  lessonColor: string;
  side: "left" | "right";
  dimmed?: boolean;
  role?: string;
}) {
  const isLeft = side === "left";
  const alpha = dimmed ? "55" : "FF";
  const pageNumber = displayNumber ?? (lessonIndex >= 0 ? lessonIndex + 1 : null);
  const pattern = getPattern(lessonIndex >= 0 ? lessonIndex : 0);
  const hasImage = !!entry.memoryImageUri;

  const titleColor = lessonColor + (dimmed ? "60" : "CC");
  const textColor = dimmed ? Colors.dark.textDisabled : Colors.dark.textHighEmphasis;

  const imageEl = hasImage ? (
    <View
      style={[
        styles.memoryImageWrapper,
        { borderColor: lessonColor + (dimmed ? "25" : "45") },
      ]}
    >
      <Image
        source={{ uri: entry.memoryImageUri }}
        style={styles.memoryImage}
        resizeMode="cover"
      />
      {dimmed && <View style={styles.memoryImageDim} />}
    </View>
  ) : (
    <View
      style={[
        styles.pageIconCircle,
        {
          backgroundColor: lessonColor + (dimmed ? "18" : "28"),
          borderColor: lessonColor + (dimmed ? "30" : "55"),
        },
      ]}
    >
      <MaterialIcons
        name="auto-awesome"
        size={dimmed ? 16 : 20}
        color={lessonColor + alpha}
      />
    </View>
  );

  // Effective pattern: patterns 1/2 only apply when there's an image
  const effectivePattern = hasImage ? pattern : 3;

  return (
    <>
      {/* Ruled lines */}
      <View style={styles.pageLines} pointerEvents="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <View
            key={i}
            style={[styles.pageLine, { backgroundColor: lessonColor + "10" }]}
          />
        ))}
      </View>

      {/* Page number */}
      {pageNumber != null && (
        <View
          style={[styles.pageNumCorner, isLeft ? { left: 12 } : { right: 12 }]}
        >
          <ThemedText style={[styles.pageNum, { color: lessonColor + "70" }]}>
            {pageNumber} / {total}
          </ThemedText>
        </View>
      )}

      {/* ── Pattern 0: image top-center, title, divider, text ── */}
      {effectivePattern === 0 && (
        <View style={styles.patternCenter}>
          <ThemedText
            numberOfLines={1}
            style={[styles.memoryTitle, { color: titleColor, fontSize: dimmed ? 10 : 11 }]}
          >
            {entry.memoryTitle}
          </ThemedText>
          {imageEl}
          <View style={[styles.pageDivider, { backgroundColor: lessonColor + (dimmed ? "18" : "30") }]} />
          <ThemedText style={[styles.pageText, { color: textColor, fontSize: dimmed ? 11.5 : 13 }]}>
            {entry.text}
          </ThemedText>
        </View>
      )}

      {/* ── Pattern 1: image left, title+text right ── */}
      {effectivePattern === 1 && (
        <View style={styles.patternSideRow}>
          <View style={styles.patternSideImage}>{imageEl}</View>
          <View style={styles.patternSideText}>
            <ThemedText
              numberOfLines={2}
              style={[styles.memoryTitle, { color: titleColor, fontSize: dimmed ? 9 : 10, textAlign: "left" }]}
            >
              {entry.memoryTitle}
            </ThemedText>
            <View style={[styles.pageDivider, { backgroundColor: lessonColor + (dimmed ? "18" : "30"), width: "100%", marginBottom: 6 }]} />
            <ThemedText style={[styles.pageText, { color: textColor, fontSize: dimmed ? 10.5 : 12, textAlign: "left" }]}>
              {entry.text}
            </ThemedText>
          </View>
        </View>
      )}

      {/* ── Pattern 2: title+text left, image right ── */}
      {effectivePattern === 2 && (
        <View style={styles.patternSideRow}>
          <View style={styles.patternSideText}>
            <ThemedText
              numberOfLines={2}
              style={[styles.memoryTitle, { color: titleColor, fontSize: dimmed ? 9 : 10, textAlign: "left" }]}
            >
              {entry.memoryTitle}
            </ThemedText>
            <View style={[styles.pageDivider, { backgroundColor: lessonColor + (dimmed ? "18" : "30"), width: "100%", marginBottom: 6 }]} />
            <ThemedText style={[styles.pageText, { color: textColor, fontSize: dimmed ? 10.5 : 12, textAlign: "left" }]}>
              {entry.text}
            </ThemedText>
          </View>
          <View style={styles.patternSideImage}>{imageEl}</View>
        </View>
      )}

      {/* ── Pattern 3: large quote text, source at bottom ── */}
      {effectivePattern === 3 && (
        <View style={styles.patternQuote}>
          <ThemedText style={[styles.pageQuoteText, { color: textColor, fontSize: dimmed ? 13 : 15 }]}>
            {entry.text}
          </ThemedText>
          <View style={[styles.pageDivider, { backgroundColor: lessonColor + (dimmed ? "18" : "30") }]} />
          <ThemedText
            numberOfLines={1}
            style={[styles.memoryTitle, { color: titleColor, fontSize: dimmed ? 9 : 10 }]}
          >
            — {entry.memoryTitle}
          </ThemedText>
        </View>
      )}

      {/* Spine-edge fold shadow */}
      <View
        style={[
          styles.pageFold,
          isLeft ? styles.pageFoldRight : styles.pageFoldLeft,
          { backgroundColor: isLeft ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.08)" },
        ]}
      />

      {/* Page-curl grab corner (right page only) */}
      {!isLeft && (
        <View style={styles.pageCurlCorner} pointerEvents="none">
          <View style={[styles.pageCurlTriangle, { borderTopColor: lessonColor + "28" }]} />
        </View>
      )}
    </>
  );
}

// ─── Book flip mechanics ──────────────────────────────────────────────────────
//
// The open book has LEFT and RIGHT pages. When user taps "next":
//
//  • RIGHT page (current lesson) is the page being turned.
//    It pivots around its LEFT edge (spine), sweeping from 0° → -180°.
//    - 0°    = flat on the right side (face up, readable)
//    - -90°  = edge-on at the spine (invisible sliver)
//    - -180° = flat on the LEFT side (face down, now the new left page)
//
//  • The new RIGHT page (next lesson) sits underneath the turning page — static,
//    revealed as the turning page lifts off it.
//
//  • The new LEFT page (previous lesson) is already there — the turning page
//    lands on top of it at -180°, becoming the new "read" left page.
//
// Pivot-on-left-edge transform chain:
//   translateX(-PAGE_W/2)  ← shift origin to left edge
//   rotateY(angle)          ← rotate around that edge
//   translateX(+PAGE_W/2)  ← shift back
//
// At -180° the page is mirrored (back face). We use scaleX(-1) inside the
// flipped wrapper so the text reads correctly on the back face.
//
// The whole animation lives OUTSIDE the left/right page containers — the
// turning page is a sibling absolutely positioned over the whole book,
// so it can travel from right → spine → left seamlessly.

function BookView({
  leftEntry,
  leftIndex,
  leftDisplayNum,
  rightEntry,
  rightIndex,
  newLeftEntry,
  newLeftIndex,
  nextEntry,
  nextIndex,
  nextDisplayNum,
  total,
  lessonColor,
  flipAnim,
  flipDir,
  isFlipping,
  isBackward,
}: {
  leftEntry: LessonEntry;
  leftIndex: number;
  leftDisplayNum?: number;
  rightEntry: LessonEntry;
  rightIndex: number;
  newLeftEntry: LessonEntry;
  newLeftIndex: number;
  nextEntry: LessonEntry;
  nextIndex: number;
  nextDisplayNum?: number;
  total: number;
  lessonColor: string;
  flipAnim: SharedValue<number>;
  // 0 = forward (right page folds left), 1 = backward (left page folds right)
  flipDir: SharedValue<number>;
  isFlipping: SharedValue<number>;
  isBackward: boolean;
}) {
  const pageW = PAGE_W;
  // Forward (flipDir=0): right page pivots on left edge, sweeps 0deg to -180deg
  // Backward (flipDir=1): left page pivots on right edge, sweeps 0deg to +180deg

  const turningStyle = useAnimatedStyle(() => {
    "worklet";
    const t = flipAnim.value;
    const isBack = flipDir.value === 1;
    // Projected width: cos curve collapses to 0 at t=0.5, opens back up on the other side.
    // This reveals the destination page as the turning page sweeps across it.
    const projectedW = Math.abs(Math.cos(t * Math.PI)) * pageW;
    if (isBack) {
      const angle = t * 180;
      const left = t >= 0.5 ? pageW + SPINE_W : 0;
      // Clip from the right edge (origin stays at left edge of the page slot)
      const clipLeft = t >= 0.5 ? pageW - projectedW : 0;
      return {
        left: left + clipLeft,
        width: projectedW,
        transform: [
          { perspective: 1200 },
          { translateX: pageW / 2 },
          { rotateY: `${angle}deg` },
          { translateX: -pageW / 2 },
        ],
      };
    } else {
      const angle = t * -180;
      const left = t >= 0.5 ? 0 : pageW + SPINE_W;
      // Clip from the left edge for forward flip (origin at right edge of slot)
      const clipLeft = t < 0.5 ? pageW - projectedW : 0;
      return {
        left: left + clipLeft,
        width: projectedW,
        transform: [
          { perspective: 1200 },
          { translateX: -pageW / 2 },
          { rotateY: `${angle}deg` },
          { translateX: pageW / 2 },
        ],
      };
    }
  });

  const frontFaceStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = flipAnim.value < 0.5 ? 1 : 0;
    return { opacity };
  });

  const backFaceStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = flipAnim.value >= 0.5 ? 1 : 0;
    return { opacity };
  });

  // Shadow on the turning page (darkens as it rotates, peaks at edge-on)
  const pageShadingStyle = useAnimatedStyle(() => {
    "worklet";
    const t = flipAnim.value;
    // Max shadow at t=0.5 (edge-on), zero at t=0 and t=1
    const shadow = Math.sin(t * Math.PI) * 0.65;
    return { opacity: shadow };
  });

  // Shadow on left page: forward=lands there (2nd half), backward=lifts off (1st half)
  const leftShadowStyle = useAnimatedStyle(() => {
    "worklet";
    const t = flipAnim.value;
    const isBack = flipDir.value === 1;
    const shadow = isBack
      ? (t < 0.5 ? Math.sin(t * Math.PI) * 0.4 : 0)
      : (t > 0.5 ? Math.sin(t * Math.PI) * 0.5 : 0);
    return { opacity: shadow };
  });

  // Hide the entire turning page when not animating so it never bleeds through at rest.
  const turningPageVisibility = useAnimatedStyle(() => {
    "worklet";
    const visible = isFlipping.value === 1;
    return { opacity: visible ? 1 : 0 };
  });

  // Shadow on right page: forward=lifts off (1st half), backward=lands there (2nd half)
  const rightShadowStyle = useAnimatedStyle(() => {
    "worklet";
    const t = flipAnim.value;
    const isBack = flipDir.value === 1;
    const shadow = isBack
      ? (t > 0.5 ? Math.sin(t * Math.PI) * 0.5 : 0)
      : (t < 0.5 ? Math.sin(t * Math.PI) * 0.4 : 0);
    return { opacity: shadow };
  });

  return (
    <View style={[styles.book, { position: "relative" }]}>
      {/* ── Static left page (previous lesson) ── */}
      <View
        style={[
          styles.page,
          styles.pageLeft,
          { borderColor: lessonColor + "28" },
        ]}
      >
        <PageContent
          entry={leftEntry}
          lessonIndex={leftIndex}
          displayNumber={leftDisplayNum}
          total={total}
          lessonColor={lessonColor}
          side="left"
          dimmed
          role="static-left"
        />
        {/* Shadow cast by the turning page landing on left */}
        <Animated.View
          style={[styles.pageTurnShadowOverlay, leftShadowStyle]}
          pointerEvents="none"
        />
      </View>

      {/* ── Spine ── */}
      <View style={styles.spine}>
        <View
          style={[styles.spineGlow, { backgroundColor: lessonColor + "40" }]}
        />
      </View>

      {/* ── Static right page (next lesson, sits underneath) ── */}
      <View
        style={[
          styles.page,
          styles.pageRight,
          { borderColor: lessonColor + "50" },
        ]}
      >
        <PageContent
          entry={nextEntry}
          lessonIndex={nextIndex}
          displayNumber={nextDisplayNum}
          total={total}
          lessonColor={lessonColor}
          side="right"
          role="static-right"
        />
        {/* Shadow as outgoing page lifts off */}
        <Animated.View
          style={[styles.pageTurnShadowOverlay, rightShadowStyle]}
          pointerEvents="none"
        />
      </View>

      {/* ── Turning page — absolutely positioned, direction-aware ── */}
      <Animated.View
        style={[styles.turningPage, turningStyle, turningPageVisibility]}
        pointerEvents="none"
      >
        {/* Front face: the page being lifted */}
        <Animated.View style={[StyleSheet.absoluteFill, frontFaceStyle]}>
          <View
            style={[
              styles.page,
              isBackward ? styles.pageLeft : styles.pageRight,
              styles.turningPageInner,
              { borderColor: lessonColor + (isBackward ? "28" : "50") },
            ]}
          >
            <PageContent
              entry={rightEntry}
              lessonIndex={rightIndex}
              total={total}
              lessonColor={lessonColor}
              side={isBackward ? "left" : "right"}
              dimmed={isBackward}
              role="turning-front"
            />
          </View>
        </Animated.View>

        {/* Back face: the page as it lands on the other side, mirrored */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            backFaceStyle,
            { transform: [{ scaleX: -1 }] },
          ]}
        >
          <View
            style={[
              styles.page,
              isBackward ? styles.pageRight : styles.pageLeft,
              styles.turningPageInner,
              { borderColor: lessonColor + (isBackward ? "50" : "28") },
            ]}
          >
            <PageContent
              entry={newLeftEntry}
              lessonIndex={newLeftIndex}
              total={total}
              lessonColor={lessonColor}
              side={isBackward ? "right" : "left"}
              dimmed={!isBackward}
              role="turning-back"
            />
          </View>
        </Animated.View>

        {/* Page-turn shading (darkens toward edge-on) */}
        <Animated.View
          style={[styles.pageTurnShading, pageShadingStyle]}
          pointerEvents="none"
        />
      </Animated.View>
    </View>
  );
}

// ─── Pagination dots ──────────────────────────────────────────────────────────

function PaginationDots({
  count,
  active,
  color,
}: {
  count: number;
  active: number;
  color: string;
}) {
  const display = Math.min(count, 9);
  const activeDisplay = Math.min(active, display - 1);
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: display }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeDisplay
              ? { backgroundColor: color, width: 20 }
              : { backgroundColor: "rgba(255,255,255,0.2)", width: 6 },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface YourUniverseModalProps {
  visible: boolean;
  onClose: () => void;
  onChallengeMePress: () => void;
}

export function YourUniverseModal({
  visible,
  onClose,
  onChallengeMePress,
}: YourUniverseModalProps) {
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  const { idealizedMemories } = useJourney();
  const lessonColor = momentColors.lesson.background;


  // Build a flat list of LessonEntry from all memory lessonsLearned.
  const entries = useMemo<LessonEntry[]>(() => {
    const real: LessonEntry[] = [];
    for (const memory of idealizedMemories) {
      if (!memory.lessonsLearned?.length) continue;
      for (const l of memory.lessonsLearned) {
        if (l.text.trim()) {
          real.push({
            text: l.text,
            memoryTitle: memory.title,
            memoryImageUri: memory.imageUri,
          });
        }
      }
    }
    return real;
  }, [idealizedMemories]);

  const total = entries.length;

  // pendingIndex = the index we're flipping TO (set at press time, committed in finishFlip).
  const pendingIndexRef = React.useRef(0);

  // Snapshot of page indices captured when flip starts — frozen for BookView during animation.
  // isBackward is included here so goNext/goPrev cause exactly ONE React re-render.
  // At rest: rightIndex = current, nextIndex = next, leftIndex = prev (shown dimmed).
  const makeIdleSnapshot = useCallback((idx: number) => {
    if (total === 0) {
      return {
        leftIndex: 0,
        rightIndex: 0,
        newLeftIndex: 0,
        nextIndex: 0,
        leftDisplayNum: undefined,
        nextDisplayNum: 0,
        isBackward: false,
      };
    }
    return {
      leftIndex: (idx - 1 + total) % total,
      rightIndex: idx,
      newLeftIndex: idx,
      nextIndex: (idx + 1) % total,
      leftDisplayNum: idx > 0 ? idx : undefined,
      nextDisplayNum: idx + 1,
      isBackward: false,
    };
  }, [total]);

  const [snapshot, setSnapshot] = useState(() => makeIdleSnapshot(0));
  // displayIndex is derived from the settled snapshot — no separate state needed.
  const displayIndex = snapshot.rightIndex;
  const isBackward = snapshot.isBackward;

  // flipAnim: 0 = resting, 0→1 = animating
  const flipAnim = useSharedValue(0);
  const isFlipping = useSharedValue(0);
  // 0 = forward (right-to-left), 1 = backward (left-to-right)
  const flipDir = useSharedValue(0);

  const finishFlip = useCallback(() => {
    isFlipping.value = 0;
    const settled = pendingIndexRef.current;
    // Do NOT reset flipAnim here. At t=1: frontFace=opacity:0, backFace=opacity:1 —
    // the turning page is effectively hidden (backFace content matches static-left dimmed).
    // Resetting to 0 here would snap frontFace to opacity:1 causing a visible flash
    // of the turning page over the newly rendered static pages.
    // flipAnim is reset to 0 at the START of the next goNext/goPrev call instead.
    setSnapshot(makeIdleSnapshot(settled));
  }, [isFlipping, makeIdleSnapshot, flipAnim]);

  const goNext = useCallback(() => {
    if (isFlipping.value === 1) return;
    const cur = displayIndex;
    const next = (cur + 1) % total;
    const prev = (cur - 1 + total) % total;
    pendingIndexRef.current = next;
    // Reset flipAnim BEFORE setSnapshot so worklets see t=0 when BookView re-renders.
    flipDir.value = 0;
    flipAnim.value = 0;
    isFlipping.value = 1;
    // Single setState call → single re-render to set up animation snapshot.
    setSnapshot({
      leftIndex: prev,
      rightIndex: cur,
      newLeftIndex: cur,
      nextIndex: next,
      leftDisplayNum: cur > 0 ? cur : undefined,
      nextDisplayNum: next + 1,
      isBackward: false,
    });
    flipAnim.value = withTiming(
      1,
      { duration: 500, easing: Easing.inOut(Easing.ease) },
      () => {
        "worklet";
        runOnJS(finishFlip)();
      },
    );
  }, [displayIndex, total, flipAnim, flipDir, isFlipping, finishFlip]);

  const goPrev = useCallback(() => {
    if (isFlipping.value === 1) return;
    const cur = displayIndex;
    const prev = (cur - 1 + total) % total;
    const prevPrev = (cur - 2 + total) % total;
    pendingIndexRef.current = prev;
    // Reset flipAnim BEFORE setSnapshot so worklets see t=0 when BookView re-renders.
    flipDir.value = 1;
    flipAnim.value = 0;
    isFlipping.value = 1;
    // Single setState call → single re-render to set up animation snapshot.
    setSnapshot({
      leftIndex: prevPrev,
      rightIndex: prev,   // front face = left page being lifted
      newLeftIndex: prev, // back face = new right page after landing
      nextIndex: cur,     // static right page stays visible
      leftDisplayNum: prev > 0 ? prev : undefined,
      nextDisplayNum: cur + 1,
      isBackward: true,
    });
    flipAnim.value = withTiming(
      1,
      { duration: 500, easing: Easing.inOut(Easing.ease) },
      () => {
        "worklet";
        runOnJS(finishFlip)();
      },
    );
  }, [displayIndex, total, flipAnim, flipDir, isFlipping, finishFlip]);

  // Challenge Me pulse
  const challengeScale = useSharedValue(1);
  useEffect(() => {
    if (!visible) return;
    challengeScale.value = withRepeat(
      withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(challengeScale);
      challengeScale.value = 1;
    };
  }, [visible, challengeScale]);

  const challengeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: challengeScale.value }],
  }));

  // Swipe hint
  const swipeHintOpacity = useSharedValue(0);
  useEffect(() => {
    if (!visible) return;
    swipeHintOpacity.value = withSequence(
      withTiming(0.7, { duration: 600, easing: Easing.out(Easing.ease) }),
      withTiming(0.7, { duration: 2200 }),
      withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) }),
    );
    return () => {
      cancelAnimation(swipeHintOpacity);
      swipeHintOpacity.value = 0;
    };
  }, [visible, swipeHintOpacity]);

  const swipeHintStyle = useAnimatedStyle(() => ({
    opacity: swipeHintOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <StarField />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.closeButtonSpacer} />
            <View style={styles.headerCenter}>
              <ThemedText style={styles.title}>
                {t("universe.modal.title")}
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                {t("universe.modal.subtitle")}
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={16}
            >
              <MaterialIcons
                name="close"
                size={22}
                color={Colors.dark.textMediumEmphasis}
              />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <View
              style={[styles.tabActivePill, { backgroundColor: lessonColor }]}
            >
              <ThemedText style={styles.tabActiveText}>
                {t("universe.modal.tabLessons")}
              </ThemedText>
            </View>
            <ThemedText style={styles.tabInactiveText}>
              {t("universe.modal.tabMoments")}
            </ThemedText>
          </View>

          {/* Open book */}
          <View style={styles.bookContainer}>
            {total === 0 ? (
              <View style={styles.emptyLessonsWrap}>
                <ThemedText style={styles.emptyLessonsText}>
                  {t("universe.lessons.noneAvailable")}
                </ThemedText>
              </View>
            ) : (
              <>
                <View style={[styles.bookShadow, { shadowColor: lessonColor }]} />
                <BookView
                  leftEntry={entries[snapshot.leftIndex]}
                  leftIndex={snapshot.leftIndex}
                  leftDisplayNum={snapshot.leftDisplayNum}
                  rightEntry={entries[snapshot.rightIndex]}
                  rightIndex={snapshot.rightIndex}
                  newLeftEntry={entries[snapshot.newLeftIndex]}
                  newLeftIndex={snapshot.newLeftIndex}
                  nextEntry={entries[snapshot.nextIndex]}
                  nextIndex={snapshot.nextIndex}
                  nextDisplayNum={snapshot.nextDisplayNum}
                  total={total}
                  lessonColor={lessonColor}
                  flipAnim={flipAnim}
                  flipDir={flipDir}
                  isFlipping={isFlipping}
                  isBackward={isBackward}
                />
                <View style={styles.bookBottomShadow} />
              </>
            )}
          </View>

          {/* Page turn controls */}
          {total > 0 && (
            <View style={styles.pageControls}>
              <Pressable
                onPress={goPrev}
                style={({ pressed }) => [
                  styles.pageBtn,
                  { opacity: pressed ? 0.6 : 1, borderColor: lessonColor + "50" },
                ]}
                hitSlop={12}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={26}
                  color={lessonColor}
                />
              </Pressable>

              <PaginationDots
                count={total}
                active={displayIndex}
                color={lessonColor}
              />

              <Pressable
                onPress={goNext}
                style={({ pressed }) => [
                  styles.pageBtn,
                  { opacity: pressed ? 0.6 : 1, borderColor: lessonColor + "50" },
                ]}
                hitSlop={12}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={26}
                  color={lessonColor}
                />
              </Pressable>
            </View>
          )}

          {/* Swipe hint */}
          {total > 0 && (
            <Animated.View style={swipeHintStyle}>
              <ThemedText style={styles.swipeHint}>
                tap arrows to turn pages
              </ThemedText>
            </Animated.View>
          )}

          {/* Challenge Me */}
          {total > 0 && (
          <View style={styles.challengeSection}>
            <Pressable
              onPress={onChallengeMePress}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <Animated.View
                style={[
                  styles.challengePill,
                  {
                    borderColor: lessonColor + "99",
                    backgroundColor: lessonColor + "18",
                  },
                  challengeStyle,
                ]}
              >
                <View
                  style={[
                    styles.challengeGlow,
                    { backgroundColor: lessonColor + "15" },
                  ]}
                />
                <MaterialIcons name="bolt" size={24} color={lessonColor} />
                <ThemedText
                  style={[styles.challengeTitle, { color: lessonColor }]}
                >
                  {t("universe.modal.challengeMe")}
                </ThemedText>
              </Animated.View>
            </Pressable>
            <ThemedText style={styles.challengeSub}>
              {t("universe.modal.challengeSub")}
            </ThemedText>
          </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#06101C",
  },
  scrollContent: {
    paddingBottom: 52,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 52,
    marginBottom: 8,
  },
  closeButtonSpacer: { width: 30 },
  headerCenter: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.textDisabled,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  closeButton: { padding: 4, marginTop: 2, width: 30, alignItems: "flex-end" },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  tabActivePill: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 24,
  },
  tabActiveText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  tabInactiveText: { fontSize: 14, color: Colors.dark.textMediumEmphasis },
  sunSection: { alignItems: "center", marginBottom: 16, gap: 6 },
  sunLabels: { alignItems: "center", gap: 2 },
  youLabel: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  keepLearning: { fontSize: 12, color: Colors.dark.textMediumEmphasis },

  emptyLessonsWrap: {
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  emptyLessonsText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: Colors.dark.textMediumEmphasis,
    fontWeight: "500",
  },

  // ── Book ──────────────────────────────────────────────────────────────────
  bookContainer: {
    marginHorizontal: 8,
    marginBottom: 4,
  },
  bookShadow: {
    position: "absolute",
    bottom: -10,
    left: 20,
    right: 20,
    height: 20,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  book: {
    flexDirection: "row",
    height: BOOK_H,
    borderRadius: 6,
    overflow: "hidden",
  },
  page: {
    flex: 1,
    height: BOOK_H,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  pageLeft: {
    backgroundColor: "rgba(10,18,32,0.92)",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    borderRightWidth: 0,
  },
  pageRight: {
    backgroundColor: "rgba(14,24,44,0.97)",
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderLeftWidth: 0,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pageLines: {
    position: "absolute",
    top: 36,
    left: 12,
    right: 12,
    gap: 14,
  },
  pageLine: {
    height: 1,
    borderRadius: 1,
  },
  pageNumCorner: {
    position: "absolute",
    top: 10,
  },
  pageNum: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  pageIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  memoryImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  memoryImage: {
    width: "100%",
    height: "100%",
  },
  memoryImageDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  memoryTitle: {
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 5,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  pageDivider: {
    width: "70%",
    height: 1,
    borderRadius: 1,
    marginBottom: 8,
  },
  pageText: {
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 2,
  },
  pageFold: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 12,
  },
  pageFoldLeft: { right: 0 },
  pageTurnShading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
  },
  pageTurnShadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
  },
  // The turning page: positioned at the spine, same size as one page
  turningPage: {
    position: "absolute",
    top: 0,
    width: PAGE_W,
    height: BOOK_H,
    zIndex: 10,
    overflow: "hidden",
  },
  turningPageInner: {
    borderRadius: 0,
  },
  pageFoldRight: { left: 0 },
  spine: {
    width: SPINE_W,
    height: BOOK_H,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  spineGlow: {
    width: 3,
    height: "80%",
    borderRadius: 2,
  },
  bookBottomShadow: {
    height: 6,
    marginHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  // ── Controls ──────────────────────────────────────────────────────────────
  pageControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flex: 1,
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  dot: { height: 5, borderRadius: 3 },
  swipeHint: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.dark.textDisabled,
    marginTop: 4,
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  // ── Challenge Me ──────────────────────────────────────────────────────────
  challengeSection: { alignItems: "center", gap: 12, paddingHorizontal: 32 },
  challengePill: {
    width: SCREEN_WIDTH - 64,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
  },
  challengeGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 29 },
  challengeTitle: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  challengeSub: {
    fontSize: 13,
    color: Colors.dark.textDisabled,
    textAlign: "center",
  },

  // ── Page layout patterns ───────────────────────────────────────────────────
  patternCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
  },
  patternSideRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingHorizontal: 4,
  },
  patternSideImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  patternSideText: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
  },
  patternQuote: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  pageQuoteText: {
    textAlign: "center",
    lineHeight: 22,
    fontStyle: "italic",
    fontWeight: "500",
    paddingHorizontal: 2,
  },

  // ── Page-curl corner ──────────────────────────────────────────────────────
  pageCurlCorner: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
  },
  pageCurlTriangle: {
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderRightWidth: 22,
    borderTopWidth: 22,
    borderRightColor: "transparent",
    borderTopColor: "rgba(255,255,255,0.10)",
  },
});
