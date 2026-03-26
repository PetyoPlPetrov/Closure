import { ThemedText } from "@/components/themed-text";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { lifeLessons } from "@/utils/life-lessons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Circle as SvgCircle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Orbit geometry ───────────────────────────────────────────────────────────
// We show exactly 5 slots on the front arc of the ellipse.
// Slot 0 = center/front, slots ±1 = near sides, slots ±2 = far sides.
// Cards past ±2 are hidden. Swiping remaps lesson indices into these slots.

const SLOT_COUNT = 5;                       // how many cards visible at once
const SLOT_HALF = Math.floor(SLOT_COUNT / 2); // 2
// Angular span of the visible arc: how much of the ellipse we use
const ARC_SPAN = Math.PI * 0.85;            // ~153° — front arc only
// Angle between adjacent slots
const SLOT_ANGLE = ARC_SPAN / (SLOT_COUNT - 1); // evenly spaced

// Ellipse radii
const ORBIT_RX = SCREEN_WIDTH * 0.44;
const ORBIT_RY = 52;

// Card sizes
const CARD_W = SCREEN_WIDTH * 0.60;
const CARD_H = CARD_W * 0.88;

// Orbit container height: card height + vertical ellipse travel + padding
const ORBIT_H = CARD_H + ORBIT_RY * 2 + 32;

// ─── Per-slot visual parameters ───────────────────────────────────────────────
// slotOffset: -2 = far left, -1 = near left, 0 = front, 1 = near right, 2 = far right
function slotAngle(offset: number): number {
  // offset 0 → top of ellipse (angle = -π/2 = pointing up)
  // We map slots symmetrically: offset * SLOT_ANGLE, centered at -π/2
  return -Math.PI / 2 + offset * SLOT_ANGLE;
}

function slotPosition(offset: number): { tx: number; ty: number } {
  const a = slotAngle(offset);
  return {
    tx: Math.cos(a) * ORBIT_RX,
    ty: Math.sin(a) * ORBIT_RY,
  };
}

// ─── Mini Sun ─────────────────────────────────────────────────────────────────

function StaticMiniSun({ color, size = 90 }: { color: string; size?: number }) {
  const DISC_R = size * 0.38;
  const RAY_COUNT = 12;
  const RAY_INNER = DISC_R + 2;
  const RAY_OUTER = DISC_R + size * 0.2;
  const RAY_BASE_W = 3;
  const RAY_TIP_W = 0.4;
  const C = size / 2;

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
    return `M ${li} L ${lo} L ${ro} L ${ri} Z`;
  }), [C, DISC_R, RAY_INNER, RAY_OUTER]);

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
  const haloOffset = (haloSize - size) / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[{
          position: "absolute",
          width: haloSize,
          height: haloSize,
          borderRadius: haloSize / 2,
          borderWidth: 1.5,
          borderColor: color,
          top: -haloOffset,
          left: -haloOffset,
        }, haloStyle]}
        pointerEvents="none"
      />
      <Animated.View style={[{ position: "absolute", width: size, height: size }, rotStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
          {rays.map((d, i) => <Path key={i} d={d} fill={color} opacity={0.75} />)}
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }} pointerEvents="none">
        <Defs>
          <RadialGradient id="miniDiscGrad" cx={`${C}`} cy={`${C}`} r={`${DISC_R}`} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#1E2A20" stopOpacity="1" />
            <Stop offset="60%" stopColor="#0D1525" stopOpacity="1" />
            <Stop offset="100%" stopColor="#080E1A" stopOpacity="1" />
          </RadialGradient>
          <SvgLinearGradient id="miniSunFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </SvgLinearGradient>
        </Defs>
        <SvgCircle cx={C} cy={C} r={DISC_R} fill="url(#miniDiscGrad)" />
        <SvgCircle cx={C} cy={C} r={DISC_R} fill="url(#miniSunFill)" />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
        <ThemedText style={{ fontSize: DISC_R * 1.1, lineHeight: DISC_R * 1.4 }}>😌</ThemedText>
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
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    x: seededRandom(i * 3 + 1) * SCREEN_WIDTH,
    y: seededRandom(i * 3 + 2) * SCREEN_HEIGHT,
    r: seededRandom(i * 3 + 3) * 1.4 + 0.4,
    opacity: seededRandom(i * 3 + 7) * 0.5 + 0.2,
  })), []);

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
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
      <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#bgGrad)" />
      <Ellipse cx={SCREEN_WIDTH * 0.5} cy={SCREEN_HEIGHT * 0.28} rx={SCREEN_WIDTH * 0.65} ry={SCREEN_HEIGHT * 0.32} fill="url(#nebulaGlow)" />
      {stars.map((s, i) => (
        <SvgCircle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.opacity} />
      ))}
    </Svg>
  );
}

// ─── Orbit card slot ─────────────────────────────────────────────────────────
// slotOffset: integer in [-SLOT_HALF, SLOT_HALF], drives position/tilt/scale.
// dragFrac: 0..1 fractional drag progress toward next slot (shared value).
// dragDir: +1 = dragging left (next card comes), -1 = dragging right (prev).

function OrbitCardSlot({
  lesson,
  lessonIndex,
  total,
  slotOffset,
  lessonColor,
  dragFrac,
  dragDir,
}: {
  lesson: string;
  lessonIndex: number;
  total: number;
  slotOffset: number;     // static integer slot position: -2..+2
  lessonColor: string;
  dragFrac: SharedValue<number>;   // 0..1 continuous drag fraction
  dragDir: SharedValue<number>;    // +1 or -1
}) {
  // Pre-compute static slot positions
  const fromPos = slotPosition(slotOffset);
  const toPos = slotPosition(slotOffset - 1); // where it moves when dragging left (+1 dir)
  const toNegPos = slotPosition(slotOffset + 1); // where it moves when dragging right (-1 dir)

  // Pre-compute all static values this slot needs so the worklet closes over primitives only
  const fromTx = fromPos.tx;
  const fromTy = fromPos.ty;
  const toPlusTx = toPos.tx;    // destination when dir=+1 (swipe left)
  const toPlusTy = toPos.ty;
  const toNegTx = toNegPos.tx;  // destination when dir=-1 (swipe right)
  const toNegTy = toNegPos.ty;

  // Inline lookup tables as plain numbers — safe to close over in worklet
  const scaleFrom = Math.abs(slotOffset) === 0 ? 1.0 : Math.abs(slotOffset) === 1 ? 0.82 : 0.66;
  const opacFrom  = Math.abs(slotOffset) === 0 ? 1.0 : Math.abs(slotOffset) === 1 ? 0.65 : 0.35;
  const rotYFrom  = slotOffset === 0 ? 0 : slotOffset === 1 ? -52 : slotOffset === -1 ? 52 : slotOffset === 2 ? -72 : 72;

  const destOffsetPlus  = slotOffset - 1;
  const destOffsetMinus = slotOffset + 1;

  const scaleTo_plus  = Math.abs(destOffsetPlus)  === 0 ? 1.0 : Math.abs(destOffsetPlus)  === 1 ? 0.82 : 0.66;
  const opacTo_plus   = Math.abs(destOffsetPlus)  === 0 ? 1.0 : Math.abs(destOffsetPlus)  === 1 ? 0.65 : 0.35;
  const rotYTo_plus   = destOffsetPlus  === 0 ? 0 : destOffsetPlus  === 1 ? -52 : destOffsetPlus  === -1 ? 52 : destOffsetPlus  === 2 ? -72 : 72;

  const scaleTo_minus = Math.abs(destOffsetMinus) === 0 ? 1.0 : Math.abs(destOffsetMinus) === 1 ? 0.82 : 0.66;
  const opacTo_minus  = Math.abs(destOffsetMinus) === 0 ? 1.0 : Math.abs(destOffsetMinus) === 1 ? 0.65 : 0.35;
  const rotYTo_minus  = destOffsetMinus === 0 ? 0 : destOffsetMinus === 1 ? -52 : destOffsetMinus === -1 ? 52 : destOffsetMinus === 2 ? -72 : 72;

  const animStyle = useAnimatedStyle(() => {
    "worklet";
    const frac = dragFrac.value;
    const dir  = dragDir.value;

    const isPlus = dir > 0;
    const destTx   = isPlus ? toPlusTx  : toNegTx;
    const destTy   = isPlus ? toPlusTy  : toNegTy;
    const scaleTo  = isPlus ? scaleTo_plus  : scaleTo_minus;
    const opacTo   = isPlus ? opacTo_plus   : opacTo_minus;
    const rotYTo   = isPlus ? rotYTo_plus   : rotYTo_minus;

    const tx    = fromTx    + (destTx   - fromTx)    * frac;
    const ty    = fromTy    + (destTy   - fromTy)    * frac;
    const scale = scaleFrom + (scaleTo  - scaleFrom) * frac;
    const opacity = opacFrom + (opacTo  - opacFrom)  * frac;
    const rotY  = rotYFrom  + (rotYTo   - rotYFrom)  * frac;

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { perspective: 900 },
        { rotateY: `${rotY}deg` },
        { scale },
      ],
      opacity,
    };
  });

  // z-order: render-order handles depth (slot 0 on top, slots ±2 at bottom)
  // This is controlled by the parent's render order — no zIndex needed.

  return (
    <Animated.View style={[styles.orbitCardWrapper, animStyle]}>
      <View style={[styles.card, { borderColor: lessonColor + "40", shadowColor: lessonColor }]}>
        <View style={[styles.cardTopAccent, { backgroundColor: lessonColor + "30" }]} />
        <View style={[styles.iconCircle, { backgroundColor: lessonColor + "22", borderColor: lessonColor + "55" }]}>
          <MaterialIcons name="auto-awesome" size={22} color={lessonColor} />
        </View>
        <ThemedText style={styles.lessonText}>{lesson}</ThemedText>
        <View style={[styles.indexBadge, { borderColor: lessonColor + "40" }]}>
          <ThemedText style={[styles.indexText, { color: lessonColor }]}>{lessonIndex + 1}/{total}</ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Pagination dots ──────────────────────────────────────────────────────────

function PaginationDots({ count, active, color }: { count: number; active: number; color: string }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active
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

export function YourUniverseModal({ visible, onClose, onChallengeMePress }: YourUniverseModalProps) {
  const t = useTranslate();
  const { language } = useLanguage();
  const { momentColors } = useMomentColors();
  const lessonColor = momentColors.lesson.background;
  const lessons = lifeLessons[language] ?? lifeLessons.en;
  const total = lessons.length;

  // centerIndex: which lesson is in the front slot
  const [centerIndex, setCenterIndex] = useState(0);

  // dragFrac: 0 = resting, 1 = fully committed to next slot
  const dragFrac = useSharedValue(0);
  // dragDir: +1 = swiping left (advancing), -1 = swiping right (going back)
  const dragDir = useSharedValue(1);
  const dragStarted = useSharedValue(0); // 0 = not started, 1 = started

  const advanceCenter = useCallback((dir: number) => {
    setCenterIndex((prev) => {
      const next = (prev + dir + total) % total;
      return next;
    });
  }, [total]);

  const pan = Gesture.Pan()
    .minDistance(8)
    .onBegin(() => {
      dragStarted.value = 0;
    })
    .onUpdate((e) => {
      const dx = e.translationX;
      // Only commit to one direction per gesture
      if (dragStarted.value === 0) {
        dragDir.value = dx < 0 ? 1 : -1;
        dragStarted.value = 1;
      }
      // Normalize: full drag = SCREEN_WIDTH * 0.4 → frac = 1
      const frac = Math.min(Math.abs(dx) / (SCREEN_WIDTH * 0.4), 1);
      dragFrac.value = frac;
    })
    .onEnd((e) => {
      const committed = Math.abs(e.translationX) > SCREEN_WIDTH * 0.12 || Math.abs(e.velocityX) > 400;
      if (committed) {
        dragFrac.value = withSpring(1, { damping: 20, stiffness: 180 }, () => {
          // After animation: advance center, reset frac instantly
          runOnJS(advanceCenter)(dragDir.value);
          dragFrac.value = 0;
        });
      } else {
        // Snap back
        dragFrac.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  // Build the 5 slots. slotOffset: -2, -1, 0, +1, +2
  // Lesson at slot offset: (centerIndex + offset + total) % total
  // Render order: far slots first (back), center last (front)
  const slots = useMemo(() => {
    // Render back-to-front: [-2, +2, -1, +1, 0]
    return [-SLOT_HALF, SLOT_HALF, -(SLOT_HALF - 1), SLOT_HALF - 1, 0].map((offset) => {
      const lessonIdx = (centerIndex + offset + total) % total;
      return { offset, lessonIdx };
    });
  }, [centerIndex, total]);

  // Challenge Me pulse
  const challengeScale = useSharedValue(1);
  useEffect(() => {
    if (!visible) return;
    challengeScale.value = withRepeat(
      withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => { cancelAnimation(challengeScale); challengeScale.value = 1; };
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
    return () => { cancelAnimation(swipeHintOpacity); swipeHintOpacity.value = 0; };
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
              <ThemedText style={styles.title}>{t("universe.modal.title")}</ThemedText>
              <ThemedText style={styles.subtitle}>{t("universe.modal.subtitle")}</ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={16}>
              <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <View style={[styles.tabActivePill, { backgroundColor: lessonColor }]}>
              <ThemedText style={styles.tabActiveText}>{t("universe.modal.tabLessons")}</ThemedText>
            </View>
            <ThemedText style={styles.tabInactiveText}>{t("universe.modal.tabMoments")}</ThemedText>
          </View>

          {/* Sun */}
          <View style={styles.sunSection}>
            <StaticMiniSun color={momentColors.sunny.background} size={88} />
            <View style={styles.sunLabels}>
              <ThemedText style={styles.youLabel}>{t("universe.modal.youLabel")}</ThemedText>
              <ThemedText style={styles.keepLearning}>{t("universe.modal.keepLearning")}</ThemedText>
            </View>
          </View>

          {/* Orbit carousel */}
          <GestureDetector gesture={pan}>
            <View style={styles.orbitContainer} collapsable={false}>
              {/* Dashed orbit ellipse */}
              <Svg
                width={ORBIT_RX * 2 + 20}
                height={ORBIT_RY * 2 + 20}
                style={styles.orbitEllipseSvg}
                pointerEvents="none"
              >
                <Ellipse
                  cx={ORBIT_RX + 10}
                  cy={ORBIT_RY + 10}
                  rx={ORBIT_RX}
                  ry={ORBIT_RY}
                  stroke="rgba(255,255,255,0.09)"
                  strokeWidth={1}
                  fill="none"
                  strokeDasharray="4 7"
                />
              </Svg>

              {/* Cards — rendered back-to-front */}
              {slots.map(({ offset, lessonIdx }) => (
                <OrbitCardSlot
                  key={offset}
                  lesson={lessons[lessonIdx]}
                  lessonIndex={lessonIdx}
                  total={total}
                  slotOffset={offset}
                  lessonColor={lessonColor}
                  dragFrac={dragFrac}
                  dragDir={dragDir}
                />
              ))}
            </View>
          </GestureDetector>

          {/* Pagination dots */}
          <PaginationDots count={Math.min(total, 7)} active={Math.min(centerIndex, 6)} color={lessonColor} />

          {/* Swipe hint */}
          <Animated.View style={swipeHintStyle}>
            <ThemedText style={styles.swipeHint}>{t("universe.modal.swipeHint")}</ThemedText>
          </Animated.View>

          {/* Challenge Me */}
          <View style={styles.challengeSection}>
            <Pressable
              onPress={onChallengeMePress}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <Animated.View style={[styles.challengePill, { borderColor: lessonColor + "99", backgroundColor: lessonColor + "18" }, challengeStyle]}>
                <View style={[styles.challengeGlow, { backgroundColor: lessonColor + "15" }]} />
                <MaterialIcons name="bolt" size={24} color={lessonColor} />
                <ThemedText style={[styles.challengeTitle, { color: lessonColor }]}>
                  {t("universe.modal.challengeMe")}
                </ThemedText>
              </Animated.View>
            </Pressable>
            <ThemedText style={styles.challengeSub}>{t("universe.modal.challengeSub")}</ThemedText>
          </View>
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
    paddingTop: 60,
    marginBottom: 12,
  },
  closeButtonSpacer: {
    width: 30,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.42)",
    textAlign: "center",
  },
  closeButton: {
    padding: 4,
    marginTop: 2,
    width: 30,
    alignItems: "flex-end",
  },
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
  tabActiveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabInactiveText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.38)",
  },
  sunSection: {
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  sunLabels: {
    alignItems: "center",
    gap: 3,
  },
  youLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  keepLearning: {
    fontSize: 12,
    color: "rgba(255,255,255,0.48)",
  },
  orbitContainer: {
    width: SCREEN_WIDTH,
    height: ORBIT_H,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitEllipseSvg: {
    position: "absolute",
    alignSelf: "center",
    top: ORBIT_H / 2 - ORBIT_RY - 10,
  },
  // Each card starts centered; translateX/Y moves it to its slot on the ellipse
  orbitCardWrapper: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    left: (SCREEN_WIDTH - CARD_W) / 2,
    top: ORBIT_H / 2 - CARD_H / 2,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  cardTopAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  lessonText: {
    fontSize: 14,
    textAlign: "center",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  indexBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  indexText: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.9,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  swipeHint: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
    marginBottom: 24,
    letterSpacing: 0.4,
  },
  challengeSection: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
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
  challengeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  challengeSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
    textAlign: "center",
  },
});
