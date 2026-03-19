/**
 * UniverseLessonsFeed - Full-screen vertical feed of community lessons.
 * Redesigned to be visually consistent with the Sferas app design language:
 * - App surface palette (#1A2332 → #243041 → #2D3A4F) instead of generic deep-space black
 * - Constellation star field (same motif as the home screen)
 * - Per-card sphere glow using the real Sferas sphere color system
 * - Typography at 87%/60% opacity levels per Material Design dark mode
 * - Onboarding-style stepper pips for progress
 */

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslate } from "@/utils/languages/use-translate";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import {
  fetchUniverseLessons,
  getCachedUniverseLessons,
  getLikedLessonIds,
  getSavedLessonIds,
  likeLesson,
  markLessonAsSaved,
  unlikeLesson,
  type UniverseLesson,
} from "@/utils/universe-lessons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const cosmicBackground = require("@/assets/images/cosmic-background.png");

// Leave a peek gap so the next card is always partially visible
const PEEK_HEIGHT = 72;
const CARD_HEIGHT = SCREEN_HEIGHT - PEEK_HEIGHT;

/**
 * Sphere accent palettes — mapped to the real Sferas sphere color system.
 * Each palette: [primary glow, secondary glow, outer haze, constellation line tint]
 * Cycles through all five life spheres: relationships, career, family, friends, hobbies.
 */
const SPHERE_PALETTES: {
  primary: string;
  secondary: string;
  haze: string;
  line: string;
  accent: string;
}[] = [
  // Relationships — rose/red
  {
    primary: "rgba(255, 150, 150, 0.40)",
    secondary: "rgba(180, 60, 60, 0.18)",
    haze: "rgba(180, 60, 60, 0.07)",
    line: "rgba(255, 150, 150, 0.25)",
    accent: "#FF9696",
  },
  // Career — sky blue (app primary)
  {
    primary: "rgba(100, 181, 246, 0.42)",
    secondary: "rgba(66, 165, 245, 0.18)",
    haze: "rgba(63, 81, 181, 0.07)",
    line: "rgba(100, 181, 246, 0.25)",
    accent: "#64B5F6",
  },
  // Family — purple
  {
    primary: "rgba(200, 150, 255, 0.38)",
    secondary: "rgba(120, 60, 180, 0.16)",
    haze: "rgba(94, 53, 177, 0.07)",
    line: "rgba(200, 150, 255, 0.22)",
    accent: "#CE93D8",
  },
  // Friends — violet
  {
    primary: "rgba(139, 92, 246, 0.38)",
    secondary: "rgba(88, 28, 135, 0.16)",
    haze: "rgba(81, 45, 168, 0.07)",
    line: "rgba(179, 157, 219, 0.22)",
    accent: "#B39DDB",
  },
  // Hobbies — warm amber/orange
  {
    primary: "rgba(249, 115, 22, 0.36)",
    secondary: "rgba(154, 52, 18, 0.16)",
    haze: "rgba(230, 81, 0, 0.07)",
    line: "rgba(255, 204, 128, 0.22)",
    accent: "#FFCC80",
  },
];

interface UniverseLessonsFeedProps {
  visible: boolean;
  onClose: () => void;
  onSaveToMemory: (lesson: UniverseLesson) => void;
  currentEntityName?: string;
  /** When true, renders as a plain View (fills screen) instead of a Modal. Use for tab screens. */
  asScreen?: boolean;
}

interface LessonCardProps {
  lesson: UniverseLesson;
  index: number;
  isLiked: boolean;
  isSaved: boolean;
  isVisible: boolean;
  onLike: (lessonId: string) => void;
  onUnlike: (lessonId: string) => void;
  onSave: (lesson: UniverseLesson) => void;
  currentEntityName?: string;
  totalCount: number;
  nextLesson?: UniverseLesson;
  reduceMotion: boolean;
}

// ─── Constellation star field ────────────────────────────────────────────────
// Same visual motif as the home screen — deterministic positions, never random.

const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: (Math.sin(i * 2.4) * 0.5 + 0.5) * SCREEN_WIDTH,
  y: (Math.cos(i * 3.7) * 0.5 + 0.5) * SCREEN_HEIGHT,
  size: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.6 : 1.0,
  opacity: 0.12 + (i % 7) * 0.04,
  twinkle: i % 4 === 0,
}));

// A small set of constellation lines connecting nearby stars (for visual interest)
const CONSTELLATION_LINES = [
  [0, 4], [4, 9], [9, 14],
  [20, 25], [25, 30],
  [40, 45], [45, 50], [50, 55],
  [60, 65], [65, 70],
] as [number, number][];

/** Single static star dot */
const Star: React.FC<{ x: number; y: number; size: number; opacity: number }> = ({ x, y, size, opacity }) => (
  <View
    importantForAccessibility="no-hide-descendants"
    accessibilityElementsHidden
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: "#fff",
      opacity,
    }}
  />
);

/** Twinkling star — skips animation when reduceMotion is on */
const TwinkleStar: React.FC<{
  x: number; y: number; size: number; baseOpacity: number; reduceMotion: boolean;
}> = ({ x, y, size, baseOpacity, reduceMotion }) => {
  const opacity = useSharedValue(baseOpacity);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(baseOpacity * 0.15, { duration: 900 + Math.random() * 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(baseOpacity,        { duration: 900 + Math.random() * 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
  }, [opacity, baseOpacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{
        position: "absolute", left: x, top: y, width: size, height: size,
        borderRadius: size / 2, backgroundColor: "#fff",
      }, style]}
    />
  );
};

/** Occasional shooting star — skipped entirely when reduceMotion is on */
const ShootingStar: React.FC<{ isVisible: boolean; reduceMotion: boolean }> = ({ isVisible, reduceMotion }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isVisible || reduceMotion) return;
    const shoot = () => {
      const startX = Math.random() * SCREEN_WIDTH * 0.6;
      const startY = Math.random() * SCREEN_HEIGHT * 0.35;
      translateX.value = startX;
      translateY.value = startY;
      opacity.value = withSequence(
        withTiming(0.7, { duration: 80 }),
        withTiming(0, { duration: 400 }),
      );
      translateX.value = withTiming(startX + 140, { duration: 480 });
      translateY.value = withTiming(startY + 70, { duration: 480 });
    };
    const delay1 = 2200 + Math.random() * 3000;
    const t1 = setTimeout(shoot, delay1);
    const t2 = setTimeout(shoot, delay1 + 5000 + Math.random() * 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isVisible, reduceMotion, translateX, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.shootingStar, style]}
    />
  );
};

/**
 * SphereGlow — the sphere-inspired ambient background.
 *
 * Uses the actual Sferas sphere color palette (relationships/career/family/friends/hobbies).
 * Renders as a single large orb behind the card content, mirroring how sferas look in the
 * focused-sfera-view but subtler — ambient glow, not a foreground element.
 *
 * Structure:
 *   • Outer haze  — very subtle, fills the whole card
 *   • Mid ring    — medium orb, slowly breathes
 *   • Core glow   — smaller bright centre
 *   • Halo ring   — thin expanding border that repeats (same as EntityWheelOfLife glow ring)
 */
const SphereGlow: React.FC<{
  palette: typeof SPHERE_PALETTES[number];
  isVisible: boolean;
  reduceMotion: boolean;
}> = ({ palette, isVisible, reduceMotion }) => {
  const coreOpacity  = useSharedValue(0);
  const coreScale    = useSharedValue(1);
  const midScale     = useSharedValue(1);
  const haloScale    = useSharedValue(0.85);
  const haloOpacity  = useSharedValue(0);

  useEffect(() => {
    if (!isVisible) {
      coreOpacity.value = withTiming(0, { duration: 300 });
      haloOpacity.value = withTiming(0, { duration: 300 });
      return;
    }
    coreOpacity.value = withTiming(1, { duration: reduceMotion ? 0 : 600 });

    if (reduceMotion) return;

    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.00, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
    midScale.value = withRepeat(
      withSequence(
        withTiming(1.13, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.00, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1400 }),
        withTiming(0.00, { duration: 3800 }),
      ),
      -1, false,
    );
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 5200, easing: Easing.out(Easing.quad) }),
        withTiming(0.85, { duration: 0 }),
      ),
      -1, false,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, reduceMotion]);

  const coreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [{ scale: coreScale.value }],
  }));
  const midStyle  = useAnimatedStyle(() => ({ transform: [{ scale: midScale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const ORB  = SCREEN_WIDTH * 1.10;
  const MID  = SCREEN_WIDTH * 0.72;
  const HALO = SCREEN_WIDTH * 1.15;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Outer haze — fills the card with a very faint sphere tint */}
      <LinearGradient
        colors={[palette.haze, "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Main orb — centred vertically at 45% (slightly above center, feels balanced) */}
      <Animated.View style={[{
        position: "absolute",
        alignSelf: "center",
        top: SCREEN_HEIGHT * 0.45 - ORB / 2,
        width: ORB,
        height: ORB,
        borderRadius: ORB / 2,
        overflow: "hidden",
      }, coreStyle]}>
        {/* Mid gradient ring */}
        <Animated.View style={[{
          position: "absolute",
          alignSelf: "center",
          top: (ORB - MID) / 2,
          width: MID,
          height: MID,
          borderRadius: MID / 2,
          overflow: "hidden",
        }, midStyle]}>
          <LinearGradient colors={[palette.secondary, "transparent"]} style={StyleSheet.absoluteFill} />
        </Animated.View>
        {/* Core glow */}
        <LinearGradient colors={[palette.primary, "transparent"]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Expanding halo ring — mirrors the EntityWheelOfLife glow ring */}
      <Animated.View style={[{
        position: "absolute",
        alignSelf: "center",
        top: SCREEN_HEIGHT * 0.45 - HALO / 2,
        width: HALO,
        height: HALO,
        borderRadius: HALO / 2,
        borderWidth: 1,
        borderColor: palette.line,
      }, haloStyle]} />
    </View>
  );
};

/** Single word that fades in when revealed */
const WordToken: React.FC<{ word: string; revealed: boolean; reduceMotion: boolean }> = ({
  word, revealed, reduceMotion,
}) => {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (revealed) {
      opacity.value = reduceMotion ? 1 : withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
    }
  }, [revealed, opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.Text style={style}>{word} </Animated.Text>;
};

const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  index,
  isLiked,
  isVisible,
  onLike,
  onUnlike,
  onSave,
  currentEntityName,
  totalCount,
  nextLesson,
  reduceMotion,
}) => {
  const t = useTranslate();
  const palette = SPHERE_PALETTES[index % SPHERE_PALETTES.length];

  // Word-reveal animation
  const [revealedWordCount, setRevealedWordCount] = useState(reduceMotion ? Infinity : 0);
  const words = lesson.text.split(" ");

  // Interaction micro-animations
  const heartScale    = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  // Card entrance
  const cardOpacity    = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);

  useEffect(() => {
    if (isVisible) {
      setRevealedWordCount(reduceMotion ? Infinity : 0);
      cardOpacity.value    = withTiming(1, { duration: reduceMotion ? 0 : 420 });
      cardTranslateY.value = reduceMotion ? 0 : withSpring(0, { damping: 20, stiffness: 140 });

      if (!reduceMotion) {
        words.forEach((_, i) => {
          setTimeout(() => setRevealedWordCount(i + 1), 260 + i * 55);
        });
      }
    } else {
      cardOpacity.value    = withTiming(0, { duration: 180 });
      cardTranslateY.value = 24;
      setRevealedWordCount(reduceMotion ? Infinity : 0);
    }
  // words is stable per card — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, reduceMotion, cardOpacity, cardTranslateY]);

  const handleLikePress = useCallback(() => {
    if (isLiked) {
      onUnlike(lesson.id);
      heartScale.value = withSpring(0.82, { damping: 4, stiffness: 220 });
    } else {
      onLike(lesson.id);
      heartScale.value = withSequence(
        withSpring(1.45, { damping: 3, stiffness: 320 }),
        withSpring(1, { damping: 7, stiffness: 220 }),
      );
    }
  }, [isLiked, lesson.id, onLike, onUnlike, heartScale]);

  const handleSavePress = useCallback(() => {
    onSave(lesson);
    bookmarkScale.value = withSequence(
      withSpring(1.35, { damping: 3, stiffness: 300 }),
      withSpring(1, { damping: 7, stiffness: 200 }),
    );
  }, [lesson, onSave, bookmarkScale]);

  const heartStyle    = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const bookmarkStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookmarkScale.value }] }));
  const cardStyle     = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const isLastCard = index === totalCount - 1;

  return (
    <View style={[styles.cardContainer, { height: CARD_HEIGHT }]} accessible={false}>

      {/* ── App-consistent background: #1A2332 → #243041 ── */}
      <LinearGradient
        colors={["#1A2332", "#1E2A3A", "#243041"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
      />

      {/* ── Constellation star field ── */}
      {STARS.map((s, i) =>
        s.twinkle ? (
          <TwinkleStar key={i} x={s.x} y={s.y} size={s.size} baseOpacity={s.opacity} reduceMotion={reduceMotion} />
        ) : (
          <Star key={i} x={s.x} y={s.y} size={s.size} opacity={s.opacity} />
        )
      )}
      {/* Constellation lines — thin, very subtle */}
      {CONSTELLATION_LINES.map(([a, b], i) => {
        const sA = STARS[a];
        const sB = STARS[b];
        const dx = sB.x - sA.x;
        const dy = sB.y - sA.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              left: sA.x,
              top: sA.y,
              width: len,
              height: 1,
              backgroundColor: palette.line,
              transformOrigin: "0 50%",
              transform: [{ rotate: `${angle}deg` }],
              opacity: 0.35,
            }}
          />
        );
      })}

      {/* ── Shooting star ── */}
      <ShootingStar isVisible={isVisible} reduceMotion={reduceMotion} />

      {/* ── Sphere glow — the Sferas-consistent ambient background ── */}
      <SphereGlow palette={palette} isVisible={isVisible} reduceMotion={reduceMotion} />

      {/* ── Card content ── */}
      <Animated.View style={[styles.contentWrapper, cardStyle]}>

        {/* Quote area — centred */}
        <View style={styles.quoteArea}>
          {/* Sphere accent dot — a tiny sfera orb above the quote */}
          <View style={[styles.accentOrb, { backgroundColor: palette.primary, shadowColor: palette.accent }]} />

          <Text
            style={styles.lessonText}
            accessibilityLabel={lesson.text}
          >
            {words.map((word, wi) => (
              <WordToken key={wi} word={word} revealed={wi < revealedWordCount} reduceMotion={reduceMotion} />
            ))}
          </Text>

          {lesson.author && (
            <View style={[styles.authorRow, { borderLeftColor: palette.accent }]}>
              <ThemedText style={styles.authorText}>— {lesson.author}</ThemedText>
            </View>
          )}

          {lesson.likeCount != null && lesson.likeCount > 0 && (
            <View
              style={styles.likeCountBadge}
              accessible
              accessibilityLabel={`${lesson.likeCount} likes`}
            >
              <MaterialIcons name="favorite" size={11} color="#EF5350" accessibilityElementsHidden />
              <Text style={styles.likeCountText}>{lesson.likeCount}</Text>
            </View>
          )}
        </View>

        {/* ── Right-side action rail ── */}
        <View style={styles.actionRail} accessibilityElementsHidden={false}>
          {/* Like */}
          <Pressable
            onPress={handleLikePress}
            style={[styles.railButton, isLiked && styles.railButtonLiked]}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? "Unlike lesson" : "Like lesson"}
            accessibilityState={{ selected: isLiked }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={heartStyle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <MaterialIcons
                name={isLiked ? "favorite" : "favorite-border"}
                size={24}
                color={isLiked ? "#EF5350" : "rgba(255,255,255,0.75)"}
              />
            </Animated.View>
          </Pressable>

          {/* Save */}
          <Pressable
            onPress={handleSavePress}
            style={styles.railButton}
            accessibilityRole="button"
            accessibilityLabel="Save lesson to memory"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={bookmarkStyle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <MaterialIcons
                name="bookmark-border"
                size={24}
                color="rgba(255,255,255,0.75)"
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* ── Progress pips — onboarding stepper style ── */}
        <View
          style={styles.progressPips}
          accessible
          accessibilityLabel={`Lesson ${index + 1} of ${totalCount}`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: totalCount, now: index + 1 }}
        >
          {Array.from({ length: Math.min(totalCount, 12) }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                i === index % 12 && [styles.pipActive, { backgroundColor: palette.accent }],
              ]}
              accessibilityElementsHidden
            />
          ))}
        </View>
      </Animated.View>

      {/* ── Next-card peek strip ── */}
      {!isLastCard && nextLesson && (
        <View
          style={styles.peekStrip}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <LinearGradient
            colors={["transparent", "rgba(26,35,50,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
          {/* Thin sphere-tinted separator line */}
          <View style={[styles.peekSeparator, { backgroundColor: palette.line }]} />
          <Text style={styles.peekText} numberOfLines={1}>
            {nextLesson.text}
          </Text>
        </View>
      )}
    </View>
  );
};

export const UniverseLessonsFeed: React.FC<UniverseLessonsFeedProps> = ({
  visible,
  onClose,
  onSaveToMemory,
  currentEntityName,
  asScreen = false,
}) => {
  const colors = Colors[useColorScheme()];
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const { cosmicBackgroundOpacity } = useVisualSettings();
  const cosmicImageOpacity = cosmicBackgroundOpacity / 10;

  const [lessons, setLessons] = useState<UniverseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const prefetchedRef = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const modalOpacity = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  const loadLessons = useCallback(
    async (forceRefresh = false) => {
      try {
        if (!forceRefresh) {
          const [cached, liked, saved] = await Promise.all([
            getCachedUniverseLessons(),
            getLikedLessonIds(),
            getSavedLessonIds(),
          ]);
          if (cached && cached.length > 0) {
            setLessons(cached);
            setLikedIds(liked);
            setSavedIds(saved);
            setLoading(false);
            fetchUniverseLessons(false).then((fresh) => {
              setLessons(fresh);
            }).catch(() => {});
            return;
          }
        }
        setLoading(true);
        const [fetchedLessons, liked, saved] = await Promise.all([
          fetchUniverseLessons(forceRefresh),
          getLikedLessonIds(),
          getSavedLessonIds(),
        ]);
        setLessons(fetchedLessons);
        setLikedIds(liked);
        setSavedIds(saved);
      } catch {
        Alert.alert(t("error"), "Failed to load lessons. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (visible) {
      prefetchedRef.current = false;
      loadLessons();
      modalOpacity.value = withTiming(1, { duration: 350 });
      AccessibilityInfo.announceForAccessibility("Universe Lessons opened");
    } else {
      modalOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, loadLessons, modalOpacity]);

  const handleLike = useCallback(async (lessonId: string) => {
    await likeLesson(lessonId);
    setLikedIds((prev) => new Set([...prev, lessonId]));
  }, []);

  const handleUnlike = useCallback(async (lessonId: string) => {
    await unlikeLesson(lessonId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.delete(lessonId);
      return next;
    });
  }, []);

  const handleSaveToMemory = useCallback(
    async (lesson: UniverseLesson) => {
      await markLessonAsSaved(lesson.id);
      setSavedIds((prev) => new Set([...prev, lesson.id]));
      onSaveToMemory(lesson);
      Alert.alert(
        t("success"),
        `Lesson saved to ${currentEntityName || "memory"}!`,
      );
    },
    [onSaveToMemory, currentEntityName, t],
  );

  const lessonsRef = useRef(lessons);
  useEffect(() => { lessonsRef.current = lessons; }, [lessons]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setVisibleIndex(idx);
        const total = lessonsRef.current.length;
        if (total > 0 && !prefetchedRef.current && idx >= Math.floor(total * 0.8)) {
          prefetchedRef.current = true;
          fetchUniverseLessons(true).then((fresh) => {
            if (fresh.length > 0) setLessons(fresh);
          }).catch(() => {});
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<UniverseLesson>) => (
      <LessonCard
        lesson={item}
        index={index}
        isLiked={likedIds.has(item.id)}
        isSaved={savedIds.has(item.id)}
        isVisible={index === visibleIndex}
        onLike={handleLike}
        onUnlike={handleUnlike}
        onSave={handleSaveToMemory}
        currentEntityName={currentEntityName}
        totalCount={lessons.length}
        nextLesson={lessons[index + 1]}
        reduceMotion={reduceMotion}
      />
    ),
    [
      likedIds,
      savedIds,
      visibleIndex,
      handleLike,
      handleUnlike,
      handleSaveToMemory,
      currentEntityName,
      lessons.length,
      reduceMotion,
    ],
  );

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
  }));

  const feedContent = (
    <Animated.View style={[StyleSheet.absoluteFill, modalAnimatedStyle]}>
      {/* App-consistent base fill with cosmic background */}
      <Image
        source={cosmicBackground}
        style={[StyleSheet.absoluteFill, { opacity: cosmicImageOpacity }]}
        resizeMode="cover"
        pointerEvents="none"
        accessibilityElementsHidden
      />
      <LinearGradient
        colors={["rgba(5,8,16,0.55)", "rgba(10,15,24,0.55)", "rgba(15,22,32,0.55)", "rgba(21,30,46,0.55)", "rgba(26,37,54,0.55)", "rgba(31,43,60,0.55)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
      />

      {/* Header — floating blurred pill, consistent with focused-sfera-view header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <BlurView intensity={25} tint="dark" style={styles.headerBlur}>
          <View style={styles.headerInner}>
            <View style={styles.headerTitleRow}>
              <MaterialIcons
                name="auto-awesome"
                size={16}
                color="#64B5F6"
                style={{ marginRight: 6 }}
                accessibilityElementsHidden
              />
              <ThemedText style={styles.headerTitle}>
                {t("universe_lessons") || "Universe Lessons"}
              </ThemedText>
            </View>
            {!asScreen && (
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close Universe Lessons"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color="rgba(255,255,255,0.60)"
                  accessibilityElementsHidden
                />
              </Pressable>
            )}
          </View>
        </BlurView>
      </View>

      {/* Feed */}
      {loading ? (
        <View
          style={styles.loadingContainer}
          accessible
          accessibilityLabel="Loading Universe Lessons"
          accessibilityRole="progressbar"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator size="large" color="#64B5F6" accessibilityElementsHidden />
          <Text style={styles.loadingText}>
            {t("loading_lessons") || "Gathering wisdom from the cosmos…"}
          </Text>
        </View>
      ) : lessons.length === 0 ? (
        <View
          style={styles.emptyContainer}
          accessible
          accessibilityLiveRegion="polite"
        >
          <MaterialIcons name="auto-awesome" size={56} color="#64B5F6" accessibilityElementsHidden />
          <Text style={styles.emptyTitle}>
            {t("no_lessons_yet") || "The universe is quiet for now."}
          </Text>
          <Text style={styles.emptySubtext}>
            {"Be the first to share your wisdom."}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={lessons}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          snapToInterval={CARD_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={styles.flatList}
          getItemLayout={(_, i) => ({
            length: CARD_HEIGHT,
            offset: CARD_HEIGHT * i,
            index: i,
          })}
        />
      )}
    </Animated.View>
  );

  if (asScreen) {
    return <View style={StyleSheet.absoluteFill}>{feedContent}</View>;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {feedContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(100, 181, 246, 0.15)",
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.87)",
    letterSpacing: 0.2,
  },
  closeButton: {
    // 44dp touch target per WCAG 2.5.5
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
  },
  flatList: {
    flex: 1,
  },
  // ── Card ─────────────────────────────────────────────────────────────────
  cardContainer: {
    width: SCREEN_WIDTH,
    overflow: "hidden",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  // ── Quote area ───────────────────────────────────────────────────────────
  quoteArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 96,  // clear header
    paddingBottom: 130,
    width: "100%",
  },
  accentOrb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 4,
  },
  lessonText: {
    fontSize: 25,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 37,
    // 87% opacity — app high-emphasis text standard
    color: "rgba(255, 255, 255, 0.87)",
    letterSpacing: 0.15,
    marginBottom: 22,
  },
  // Author attribution with a left border accent (like a blockquote)
  authorRow: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    marginBottom: 14,
    alignSelf: "center",
  },
  authorText: {
    fontSize: 14,
    fontStyle: "italic",
    // 60% opacity — app medium-emphasis text standard
    color: "rgba(255, 255, 255, 0.60)",
    letterSpacing: 0.3,
  },
  likeCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 83, 80, 0.10)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(239, 83, 80, 0.28)",
    marginTop: 4,
  },
  likeCountText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.87)",
    fontWeight: "600",
  },
  // ── Shooting star ────────────────────────────────────────────────────────
  shootingStar: {
    position: "absolute",
    width: 50,
    height: 1.2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    shadowColor: "#fff",
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  // ── Action rail ──────────────────────────────────────────────────────────
  // Elevated surface card (surfaceElevated2) — consistent with app modals
  actionRail: {
    position: "absolute",
    right: 14,
    bottom: "28%",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(45, 58, 79, 0.75)", // surfaceElevated2 with alpha
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  railButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  railButtonLiked: {
    backgroundColor: "rgba(239,83,80,0.14)",
    borderColor: "rgba(239,83,80,0.32)",
  },
  // ── Progress pips — onboarding stepper style ─────────────────────────────
  progressPips: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: [{ translateY: -40 }],
    alignItems: "center",
    gap: 5,
  },
  pip: {
    width: 4,
    height: 4,
    borderRadius: 2,
    // 38% opacity — disabled/inactive state per app standard
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  pipActive: {
    width: 4,
    height: 18,
    borderRadius: 2,
    // color set inline to palette.accent
  },
  // ── Next-card peek strip ─────────────────────────────────────────────────
  peekStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: PEEK_HEIGHT,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 10,
    gap: 6,
  },
  peekSeparator: {
    height: StyleSheet.hairlineWidth,
    width: "70%",
    alignSelf: "center",
    opacity: 0.5,
    marginBottom: 4,
  },
  peekText: {
    fontSize: 13,
    // 60% opacity — medium emphasis
    color: "rgba(255,255,255,0.60)",
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  // ── Loading / empty ───────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    // 60% opacity — medium emphasis
    color: "rgba(255,255,255,0.60)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    // 87% opacity — high emphasis
    color: "rgba(255,255,255,0.87)",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    // 60% opacity — medium emphasis
    color: "rgba(255,255,255,0.60)",
    textAlign: "center",
    lineHeight: 22,
  },
});
