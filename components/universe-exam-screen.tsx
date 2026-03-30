/**
 * Universe Exam Screen — full-screen modal for AI-generated exam questions
 * based on the user's universe lessons. Mirrors the wheel-of-life exam flow:
 * loading → question → analyzing → result → (next question or paywall).
 *
 * Free users: 3 exams per day. Subscribers: unlimited.
 */

import { ThemedText } from "@/components/themed-text";
import { useJourney } from "@/utils/JourneyProvider";
import type { LifeSphere } from "@/utils/JourneyProvider";
import {
  analyzeLessonExamAnswer,
  generateLessonExamQuestionsBatch,
} from "@/utils/ai-service";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { lifeLessons } from "@/utils/life-lessons";
import { showPaywallForAIAccess } from "@/utils/premium-access";
import { getSphereSferaColor } from "@/utils/sphere-styles";
import { useSubscription } from "@/utils/SubscriptionProvider";
import {
  canUseExam,
  consumeUniverseExamIfAvailable,
} from "@/utils/universe-exam-rate-limiter";
import {
  clearPendingUniverseExam,
  savePendingUniverseExam,
  tryRestorePendingUniverseExam,
} from "@/utils/universe-exam-pending";
import { pickAndConsumePreloadedQuestion } from "@/utils/wheel-exam-preload";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
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
  Ellipse,
  RadialGradient,
  Rect,
  Stop,
  Circle as SvgCircle,
} from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");

const BG = "#06101C";
const COSMIC_RING_START = "#5CE1E6";
const COSMIC_RING_MID = "#4AC8D0";
const COSMIC_TEXT = "#B8E8EC";

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonCard = {
  id: string;
  text: string;
  memoryTitle: string;
  memoryImageUri?: string;
  sphere: LifeSphere;
  memoryId?: string;
  entityId?: string;
};

type ExamStep = "loading" | "question" | "analyzing" | "result";

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Seeded random ────────────────────────────────────────────────────────────
function sr(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Star field ───────────────────────────────────────────────────────────────
function StarField({ nebulaColor }: { nebulaColor?: string }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        x: sr(i * 3 + 1) * SW,
        y: sr(i * 3 + 2) * SH,
        r: sr(i * 3 + 3) * 1.4 + 0.2,
        op: sr(i * 3 + 7) * 0.42 + 0.08,
      })),
    [],
  );
  const nc = nebulaColor ?? "#1A2A4A";
  return (
    <Svg
      width={SW}
      height={SH}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="bg_ex" cx="50%" cy="38%" r="72%">
          <Stop offset="0%" stopColor="#0D1525" stopOpacity="1" />
          <Stop offset="55%" stopColor="#080E1A" stopOpacity="1" />
          <Stop offset="100%" stopColor={BG} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="neb_ex" cx="28%" cy="20%" r="48%">
          <Stop offset="0%" stopColor={nc} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={BG} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="neb2_ex" cx="72%" cy="75%" r="40%">
          <Stop offset="0%" stopColor={nc} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={BG} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={SW} height={SH} fill="url(#bg_ex)" />
      <Ellipse
        cx={SW * 0.28}
        cy={SH * 0.2}
        rx={SW * 0.65}
        ry={SH * 0.3}
        fill="url(#neb_ex)"
      />
      <Ellipse
        cx={SW * 0.75}
        cy={SH * 0.72}
        rx={SW * 0.5}
        ry={SH * 0.22}
        fill="url(#neb2_ex)"
      />
      {stars.map((s, i) => (
        <SvgCircle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#FFFFFF"
          opacity={s.op}
        />
      ))}
    </Svg>
  );
}

// ─── Twinkling dot ────────────────────────────────────────────────────────────
const TwinkleDot = React.memo(function TwinkleDot({
  x,
  y,
  r,
  delay,
}: {
  x: number;
  y: number;
  r: number;
  delay: number;
}) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.65, {
            duration: 1200 + (delay % 900),
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.08, {
            duration: 1500 + (delay % 700),
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(op);
    };
  }, [op, delay]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: "absolute",
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: "#FFFFFF",
        },
      ]}
    />
  );
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export function UniverseExamScreen({ visible, onClose }: Props) {
  const t = useTranslate();
  const { language } = useLanguage();
  const { idealizedMemories } = useJourney();
  const { hasAIEntitlement } = useSubscription();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<ExamStep>("loading");
  const [currentCard, setCurrentCard] = useState<LessonCard | null>(null);
  const [question, setQuestion] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [analysis, setAnalysis] = useState<{
    isCorrect: boolean;
    feedback: string;
  } | null>(null);

  const answerInputRef = useRef(answerInput);
  useEffect(() => {
    answerInputRef.current = answerInput;
  }, [answerInput]);

  // Press scale for submit button
  const submitPressScale = useSharedValue(1);
  const submitButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitPressScale.value }],
  }));

  // Pulse/shake for input validation
  const inputPulseScale = useSharedValue(1);
  const inputPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputPulseScale.value }],
  }));

  // Build lesson cards — same logic as universe-lessons-screen
  const cards = useMemo<LessonCard[]>(() => {
    const real: LessonCard[] = [];
    for (const mem of idealizedMemories) {
      for (const l of mem.lessonsLearned ?? []) {
        if (l.text.trim()) {
          real.push({
            id: `${mem.id}_${l.id}`,
            text: l.text.trim(),
            memoryTitle: mem.title,
            memoryImageUri: mem.imageUri,
            sphere: (mem.sphere as LifeSphere) ?? "relationships",
            memoryId: mem.id,
            entityId: mem.entityId || mem.profileId,
          });
        }
      }
    }
    if (real.length > 0) return real;
    const fb = lifeLessons[language] ?? lifeLessons.en;
    return fb.map((text, i) => ({
      id: `static_${i}`,
      text,
      memoryTitle: language === "bg" ? "Твоята Вселена" : "Your Universe",
      sphere: (["relationships", "career", "family", "friends", "hobbies"][
        i % 5
      ] as LifeSphere),
    }));
  }, [idealizedMemories, language]);

  const twinkles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: sr(i * 5 + 2) * SW,
        y: sr(i * 5 + 4) * SH,
        r: sr(i * 5 + 6) * 0.9 + 0.5,
        delay: Math.floor(sr(i * 5 + 9) * 2800),
      })),
    [],
  );

  /** Prevents duplicate loadQuestion runs (e.g. Strict Mode) from consuming two free slots. */
  const loadQuestionInFlightRef = useRef(false);

  /**
   * Restore saved unanswered question if any; else build a question, then consume a free slot
   * (so closing during AI load does not burn a daily exam).
   */
  const loadQuestion = useCallback(async () => {
    if (cards.length === 0) return;
    if (loadQuestionInFlightRef.current) return;
    loadQuestionInFlightRef.current = true;
    try {
    const restored = await tryRestorePendingUniverseExam(cards);
    if (restored) {
      setCurrentCard(restored.card);
      setQuestion(restored.question);
      setAnswerInput(restored.answerInput);
      setAnalysis(null);
      setStep("question");
      return;
    }

    if (!hasAIEntitlement) {
      const can = await canUseExam(false);
      if (!can) {
        onClose();
        await showPaywallForAIAccess();
        return;
      }
    }

    setStep("loading");
    setAnswerInput("");
    setAnalysis(null);

    const card = cards[Math.floor(Math.random() * cards.length)];
    setCurrentCard(card);

    const fallbackQ =
      language === "bg"
        ? "Как бихте приложили този урок в реален живот?"
        : "How would you apply this lesson in real life?";

    let nextQuestion: string | null = null;
    try {
      const preloaded = await pickAndConsumePreloadedQuestion({ type: "main" });
      if (preloaded) {
        nextQuestion = preloaded.question;
      }
    } catch {
      // fall through to generation
    }

    if (nextQuestion === null) {
      try {
        const results = await generateLessonExamQuestionsBatch(
          [
            {
              id: card.id,
              text: card.text,
              memoryId: card.memoryId,
              memoryImageUri: card.memoryImageUri,
              entityId: card.entityId,
              sphere: card.sphere,
            },
          ],
          language,
        );
        nextQuestion =
          results.length > 0 ? results[0].question : fallbackQ;
      } catch {
        nextQuestion = fallbackQ;
      }
    }

    const allowed = await consumeUniverseExamIfAvailable(hasAIEntitlement);
    if (!allowed) {
      onClose();
      await showPaywallForAIAccess();
      return;
    }

    setQuestion(nextQuestion);
    setStep("question");
    } finally {
      loadQuestionInFlightRef.current = false;
    }
  }, [cards, language, hasAIEntitlement, onClose]);

  const loadQuestionRef = useRef(loadQuestion);
  loadQuestionRef.current = loadQuestion;
  useEffect(() => {
    if (visible) {
      loadQuestionRef.current();
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    const trimmed = answerInputRef.current.trim();
    if (!currentCard || trimmed.length < 2) return;
    await clearPendingUniverseExam();
    Keyboard.dismiss();
    setStep("analyzing");
    try {
      const result = await analyzeLessonExamAnswer(
        currentCard.text,
        question,
        trimmed,
        language,
      );
      setAnalysis(result);
    } catch {
      setAnalysis({
        isCorrect: false,
        feedback:
          language === "bg"
            ? "Не можахме да анализираме отговора ви."
            : "Could not analyze your answer.",
      });
    }
    setStep("result");
  }, [currentCard, question, language]);

  const handleClose = useCallback(() => {
    void (async () => {
      if (step === "result") {
        await clearPendingUniverseExam();
      } else if (
        step === "question" &&
        currentCard &&
        question.trim().length > 0
      ) {
        await savePendingUniverseExam({
          card: currentCard,
          question,
          answerInput,
        });
      }
      setCurrentCard(null);
      setQuestion("");
      setAnswerInput("");
      setAnalysis(null);
      onClose();
    })();
  }, [step, currentCard, question, answerInput, onClose]);

  /** Load next question from result screen. */
  const handleNext = useCallback(() => {
    loadQuestion();
  }, [loadQuestion]);

  const accentColor = currentCard
    ? getSphereSferaColor(currentCard.sphere, "dark")
    : COSMIC_RING_START;

  const resultAccentColor = analysis?.isCorrect ? "#4CAF50" : "#FFA726";
  const CARD_WIDTH = Math.min(320, SW - 48);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <StarField nebulaColor={accentColor} />
        {twinkles.map((tw, i) => (
          <TwinkleDot key={i} x={tw.x} y={tw.y} r={tw.r} delay={tw.delay} />
        ))}

        {/* Header */}
        <View
          style={[styles.header, { top: insets.top + 28 }]}
          pointerEvents="none"
        >
          <ThemedText
            style={[
              styles.headerTitle,
              { textShadowColor: accentColor + "55" },
            ]}
          >
            {t("universe.exam.title")}
          </ThemedText>
        </View>

        {/* Close button */}
        <Pressable
          onPress={handleClose}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          hitSlop={16}
        >
          <View style={styles.closeBg}>
            <MaterialIcons
              name="close"
              size={18}
              color="rgba(255,255,255,0.90)"
            />
          </View>
        </Pressable>

        {/* Question card */}
        {step !== "result" && (
          <View style={styles.cardArea}>
            <View
              style={[
                styles.card,
                {
                  shadowColor: COSMIC_RING_START,
                  borderColor: "rgba(92, 225, 230, 0.2)",
                },
              ]}
            >
              <LinearGradient
                colors={["#0A0E1A", "#0F1422", "#151C2E", "#1A2440"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />

              {step === "loading" || (step === "question" && !question) ? (
                <ActivityIndicator size="large" color={COSMIC_RING_START} />
              ) : step === "analyzing" ? (
                <>
                  <ActivityIndicator size="large" color={COSMIC_RING_START} />
                  <ThemedText
                    size="sm"
                    style={{
                      marginTop: 12,
                      opacity: 0.9,
                      textAlign: "center",
                      color: COSMIC_TEXT,
                    }}
                  >
                    {t("wheel.exam.analyzing")}
                  </ThemedText>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="emoji-objects"
                    size={36}
                    color={accentColor}
                    style={{ marginBottom: 14, opacity: 0.95 }}
                  />
                  <ThemedText
                    size="sm"
                    weight="semibold"
                    style={{
                      marginBottom: 16,
                      textAlign: "center",
                      paddingHorizontal: 8,
                      color: COSMIC_TEXT,
                      lineHeight: 22,
                    }}
                  >
                    {question}
                  </ThemedText>
                  <Animated.View style={[{ width: "100%" }, inputPulseStyle]}>
                    <TextInput
                      value={answerInput}
                      onChangeText={setAnswerInput}
                      placeholder={t("wheel.exam.questionPrompt")}
                      placeholderTextColor="rgba(184, 232, 236, 0.5)"
                      style={{
                        width: "100%",
                        minHeight: 48,
                        backgroundColor: "rgba(13, 21, 37, 0.8)",
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        color: COSMIC_TEXT,
                        fontSize: 14,
                        borderWidth: 1,
                        borderColor: "rgba(92, 225, 230, 0.2)",
                      }}
                      multiline
                    />
                  </Animated.View>
                  <Animated.View
                    style={[submitButtonStyle, { width: "100%", marginTop: 16 }]}
                  >
                    <Pressable
                      onPressIn={() => {
                        if (answerInputRef.current.trim().length >= 2) {
                          cancelAnimation(submitPressScale);
                          submitPressScale.value = withTiming(0.82, {
                            duration: 80,
                            easing: Easing.out(Easing.ease),
                          });
                        }
                      }}
                      onPressOut={() => {
                        cancelAnimation(submitPressScale);
                        submitPressScale.value = withSpring(1, {
                          damping: 12,
                          stiffness: 400,
                        });
                      }}
                      onPress={() => {
                        const trimmed = answerInput.trim();
                        if (trimmed.length >= 2) {
                          handleSubmit();
                          setAnswerInput("");
                        } else {
                          cancelAnimation(inputPulseScale);
                          inputPulseScale.value = withSequence(
                            withTiming(1.04, {
                              duration: 80,
                              easing: Easing.out(Easing.ease),
                            }),
                            withSpring(1, { damping: 12, stiffness: 400 }),
                          );
                        }
                      }}
                      style={{
                        width: "100%",
                        borderRadius: 14,
                        overflow: "hidden",
                      }}
                    >
                      <LinearGradient
                        colors={[COSMIC_RING_START, COSMIC_RING_MID]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ThemedText
                          size="sm"
                          weight="semibold"
                          style={{ color: "#0A0E1A" }}
                        >
                          {t("wheel.exam.submitAnswer")}
                        </ThemedText>
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Result overlay */}
        {step === "result" && analysis && currentCard && (
          <View style={styles.resultOverlay}>
            <ScrollView
              contentContainerStyle={styles.resultScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.resultCard,
                  {
                    borderColor: `${resultAccentColor}40`,
                    shadowColor: resultAccentColor,
                  },
                ]}
              >
                {/* Close button */}
                <Pressable
                  onPress={handleClose}
                  hitSlop={12}
                  style={styles.resultCloseBtn}
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color="rgba(255,255,255,0.85)"
                  />
                </Pressable>

                <View style={styles.resultContent}>
                  {/* Result icon */}
                  <View
                    style={[
                      styles.resultIconCircle,
                      { backgroundColor: `${resultAccentColor}28` },
                    ]}
                  >
                    <MaterialIcons
                      name={analysis.isCorrect ? "check-circle" : "warning"}
                      size={32}
                      color={resultAccentColor}
                    />
                  </View>

                  {/* Celebration / keep practicing */}
                  <ThemedText
                    size="l"
                    weight="bold"
                    style={{
                      marginBottom: 8,
                      textAlign: "center",
                      color: "#fff",
                    }}
                  >
                    {analysis.isCorrect
                      ? t("wheel.exam.correctCelebration")
                      : t("wheel.exam.keepPracticing")}
                  </ThemedText>

                  {/* AI feedback */}
                  <ThemedText
                    size="xs"
                    style={{
                      marginBottom: 16,
                      textAlign: "center",
                      opacity: 0.75,
                      color: "#fff",
                    }}
                  >
                    {analysis.feedback}
                  </ThemedText>

                  {/* Lesson text */}
                  <ThemedText
                    size="sm"
                    style={{
                      textAlign: "center",
                      fontStyle: "italic",
                      marginBottom: 16,
                      paddingHorizontal: 4,
                      lineHeight: 22,
                      color: "rgba(255,255,255,0.8)",
                    }}
                    numberOfLines={4}
                  >
                    {currentCard.text}
                  </ThemedText>

                  {/* Memory image */}
                  {currentCard.memoryImageUri ? (
                    <View
                      style={{
                        width: CARD_WIDTH - 40,
                        height: 160,
                        borderRadius: 16,
                        overflow: "hidden",
                        backgroundColor: "rgba(255,255,255,0.06)",
                        marginBottom: 20,
                      }}
                    >
                      <Image
                        source={{ uri: currentCard.memoryImageUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: CARD_WIDTH - 40,
                        height: 64,
                        borderRadius: 16,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 20,
                      }}
                    >
                      <MaterialIcons
                        name="auto-awesome"
                        size={28}
                        color={accentColor}
                        style={{ opacity: 0.55 }}
                      />
                    </View>
                  )}

                  {/* Next / done row */}
                  <View style={styles.resultActions}>
                    <Pressable
                      onPress={handleNext}
                      style={[styles.actionBtn, styles.actionBtnPrimary]}
                    >
                      <LinearGradient
                        colors={[COSMIC_RING_START, COSMIC_RING_MID]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionBtnGradient}
                      >
                        <ThemedText
                          size="sm"
                          weight="semibold"
                          style={{ color: "#0A0E1A" }}
                        >
                          {t("universe.exam.next")}
                        </ThemedText>
                        <MaterialIcons
                          name="arrow-forward"
                          size={18}
                          color="#0A0E1A"
                          style={{ marginLeft: 6 }}
                        />
                      </LinearGradient>
                    </Pressable>
                    <Pressable
                      onPress={handleClose}
                      style={styles.actionBtnSecondary}
                    >
                      <ThemedText
                        size="sm"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        {t("universe.exam.done")}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_WIDTH = Math.min(320, SW - 48);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    position: "absolute",
    left: 20,
    right: 60,
    zIndex: 20,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0.5,
    textShadowColor: "rgba(8,14,28,0.70)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    zIndex: 50,
  },
  closeBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(10,16,32,0.72)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
    padding: 20,
    position: "relative",
    borderWidth: 1,
  },
  resultOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.88)",
  },
  resultScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: (SW - CARD_WIDTH) / 2,
  },
  resultCard: {
    width: CARD_WIDTH,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(10, 16, 30, 0.98)",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  resultCloseBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  resultContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  resultIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  resultActions: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  actionBtnPrimary: {
    // wrapper; gradient inside
  },
  actionBtnGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnSecondary: {
    paddingVertical: 8,
    alignItems: "center",
  },
});
