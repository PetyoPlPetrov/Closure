/**
 * Entity Wheel of Life — wheel-of-life view for a single entity (orbit of memories,
 * sunny/cloudy percentage ring, lesson/sunny/cloudy selector). Used when an entity
 * circle is focused (e.g. in modal or detail flow). The home tab uses an inline
 * implementation inside FloatingAvatar; this component is the standalone variant.
 *
 * Exam mode: When lesson filter is selected, spinning runs an AI-powered exam
 * (question based on random lesson, user answers, AI evaluates). Fireworks on correct.
 */
import { Image } from 'expo-image';
import { Fireworks } from '@/components/fireworks';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import { useMomentColors } from '@/utils/MomentColorsProvider';
import { analyzeLessonExamAnswer } from '@/utils/ai-service';
import { showPaywallForAIAccess } from '@/utils/premium-access';
import { useSubscription } from '@/utils/SubscriptionProvider';
import {
  pickAndConsumePreloadedQuestion,
  preloadEntityWheelQuestions,
} from '@/utils/wheel-exam-preload';
import { consumeUniverseExamIfAvailable } from '@/utils/universe-exam-rate-limiter';
import { logWheelEntitySpin } from '@/utils/analytics';
import { useAIInsightsConsent } from '@/utils/AIInsightsConsentProvider';
import { AIInsightsConsentModal } from '@/components/ai-insights-consent-modal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Cosmic palette for floating moment bubbles (nebula / space vibe)
const COSMIC_GLOW = '#5CE1E6';
const NEBULA_DARK = '#0f1219';
const NEBULA_MID = '#1a2332';
const NEBULA_EDGE_ALPHA = 0.28;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

interface Memory {
  id: string;
  title?: string;
  imageUri?: string;
  hardTruths?: { id: string; text: string; x?: number; y?: number }[];
  goodFacts?: { id: string; text: string; x?: number; y?: number }[];
  lessonsLearned?: { id: string; text: string; x?: number; y?: number }[];
}

interface MomentType {
  type: 'lesson' | 'sunny' | 'cloudy';
  icon: string;
  color: string;
  label: string;
}

interface EntityWheelOfLifeProps {
  entity: {
    id: string;
    name: string;
    imageUri?: string;
  };
  memories: Memory[];
  onClose: () => void;
  onMemoryOpen?: (memoryId: string) => void;
  colors: typeof Colors.dark;
  colorScheme: 'light' | 'dark';
}

// Spiraling icons that flow out from avatar during wheel spin or on correct exam answer
const EntitySpirallingStar = React.memo(function EntitySpirallingStar({
  avatarCenterX,
  avatarCenterY,
  startAngle,
  spiralOffset,
  size,
  delay,
  isSpinning,
  celebrationSpinning,
  momentType = 'lessons',
}: {
  avatarCenterX: Animated.SharedValue<number>;
  avatarCenterY: Animated.SharedValue<number>;
  startAngle: number;
  spiralOffset: number;
  size: number;
  delay: number;
  isSpinning: Animated.SharedValue<boolean>;
  celebrationSpinning?: Animated.SharedValue<boolean>;
  momentType?: 'lessons' | 'hardTruths' | 'sunnyMoments';
}) {
  const { momentColors } = useMomentColors();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useAnimatedReaction(
    () => isSpinning.value,
    (spinning, previousSpinning) => {
      'worklet';
      if (spinning && !previousSpinning) {
        progress.value = 0;
        opacity.value = 0;
        progress.value = withDelay(
          delay,
          withRepeat(
            withTiming(1, { duration: 2500, easing: Easing.out(Easing.ease) }),
            -1,
            false,
          ),
        );
        opacity.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }),
              withTiming(0, { duration: 2000, easing: Easing.in(Easing.ease) }),
            ),
            -1,
            false,
          ),
        );
      } else if (!spinning && previousSpinning) {
        cancelAnimation(progress);
        cancelAnimation(opacity);
        progress.value = 0;
        opacity.value = 0;
      }
    },
    [delay],
  );

  useAnimatedReaction(
    () => celebrationSpinning?.value ?? false,
    (celebrating, previousCelebrating) => {
      'worklet';
      if (celebrating && !previousCelebrating && celebrationSpinning) {
        progress.value = 0;
        opacity.value = 0;
        progress.value = withDelay(
          delay,
          withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
        );
        opacity.value = withDelay(
          delay,
          withSequence(
            withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) }),
          ),
        );
      } else if (!celebrating && previousCelebrating) {
        cancelAnimation(progress);
        cancelAnimation(opacity);
        progress.value = 0;
        opacity.value = 0;
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const centerX = avatarCenterX.value;
    const centerY = avatarCenterY.value;
    const maxRadius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.5;
    const radius = progress.value * maxRadius;
    const angle = startAngle + spiralOffset * progress.value;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const rotation = progress.value * 360;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { rotate: `${rotation}deg` },
        { scale: 1 - progress.value * 0.3 },
      ],
    };
  });

  const getIconConfig = () => {
    switch (momentType) {
      case 'lessons':
        return { icon: '💡', color: momentColors.lesson.background };
      case 'sunnyMoments':
        return { icon: '☀️', color: momentColors.sunny.background };
      case 'hardTruths':
        return { icon: '☁️', color: momentColors.cloudy.background };
      default:
        return { icon: '💡', color: momentColors.lesson.background };
    }
  };

  const { icon, color } = getIconConfig();

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          left: 0,
          top: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: size,
          elevation: 8,
        }}
      >
        <ThemedText style={{ fontSize: size, lineHeight: size }}>{icon}</ThemedText>
      </View>
    </Animated.View>
  );
});

const EntitySpiralingStars = React.memo(function EntitySpiralingStars({
  avatarCenterX,
  avatarCenterY,
  isSpinning,
  celebrationSpinning,
  momentType = 'lessons',
}: {
  avatarCenterX: Animated.SharedValue<number>;
  avatarCenterY: Animated.SharedValue<number>;
  isSpinning: Animated.SharedValue<boolean>;
  celebrationSpinning?: Animated.SharedValue<boolean>;
  momentType?: 'lessons' | 'hardTruths' | 'sunnyMoments';
}) {
  const { isTablet } = useLargeDevice();
  const particles = React.useMemo(() => {
    const numParticles = isTablet ? 30 : 20;
    return Array.from({ length: numParticles }, (_, i) => ({
      id: `spiral-particle-${i}`,
      startAngle: (i / numParticles) * Math.PI * 2,
      spiralOffset: (i / numParticles) * Math.PI * 4,
      size: isTablet ? 24 : 18,
      delay: (i / numParticles) * 800,
    }));
  }, [isTablet]);

  return (
    <>
      {particles.map((particle) => (
        <EntitySpirallingStar
          key={particle.id}
          avatarCenterX={avatarCenterX}
          avatarCenterY={avatarCenterY}
          startAngle={particle.startAngle}
          spiralOffset={particle.spiralOffset}
          size={particle.size}
          delay={particle.delay}
          isSpinning={isSpinning}
          celebrationSpinning={celebrationSpinning}
          momentType={momentType}
        />
      ))}
    </>
  );
});

// Moment types configuration (uses custom colors)
// Cosmic accent (aligned with circle avatar and home wheel selectors)
const COSMIC_SELECTOR = '#5CE1E6';
const COSMIC_UNSELECTED_BG = 'rgba(26, 36, 64, 0.9)';
const COSMIC_ICON_UNSELECTED = 'rgba(184, 232, 236, 0.75)';
const MOMENT_TYPES: MomentType[] = [
  { type: 'lesson', icon: 'lightbulb', color: COSMIC_SELECTOR, label: 'Lesson' },
  { type: 'sunny', icon: 'wb-sunny', color: COSMIC_SELECTOR, label: 'Sunny' },
  { type: 'cloudy', icon: 'cloud', color: COSMIC_SELECTOR, label: 'Cloudy' },
];

export function EntityWheelOfLife({
  entity,
  memories,
  onClose,
  onMemoryOpen,
  colors,
  colorScheme,
}: EntityWheelOfLifeProps) {
  const { isTablet } = useLargeDevice();
  const fontScale = useFontScale();
  const { hasAIEntitlement } = useSubscription();
  const aiConsent = useAIInsightsConsent();
  const t = useTranslate();
  const { language } = useLanguage();
  const lang = language === 'bg' ? 'bg' : 'en';

  const [aiConsentModalVisible, setAiConsentModalVisible] = useState(false);
  const [spinLabelDismissed, setSpinLabelDismissed] = useState(false);

  // Shared values for spiraling stars (synced with spinning state)
  const wheelCenterX = useSharedValue(SCREEN_WIDTH / 2);
  const wheelCenterY = useSharedValue(SCREEN_HEIGHT / 2 - 40);
  const isSpinningShared = useSharedValue(false);
  const celebrationSpinning = useSharedValue(false);

  // Animation values
  const entranceProgress = useSharedValue(0);
  const spinRotation = useSharedValue(0);
  const selectedMomentScale = useSharedValue(0);
  const examSubmitPressScale = useSharedValue(1);
  const examInputPulseScale = useSharedValue(1);
  const examAnswerInputRef = useRef('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<{
    type: 'lesson' | 'sunny' | 'cloudy';
    text: string;
    memoryId?: string;
    memoryImageUri?: string;
  } | null>(null);
  const [selectedMomentType, setSelectedMomentType] = useState<
    'lesson' | 'sunny' | 'cloudy'
  >('lesson');
  const [examState, setExamState] = useState<{
    question: string;
    step: 'question' | 'analyzing' | 'result';
    analysis?: { isCorrect: boolean; feedback: string };
    userAnswer?: string;
  } | null>(null);
  const [examAnswerInput, setExamAnswerInput] = useState('');
  examAnswerInputRef.current = examAnswerInput;
  const [showFireworks, setShowFireworks] = useState(false);

  // State for floating moments that grow from memories
  const [floatingMoments, setFloatingMoments] = useState<{
    id: number;
    memoryId: string;
    memoryX: number;
    memoryY: number;
    memorySizeMultiplier: number;
    momentType: 'lesson' | 'sunny' | 'cloudy';
    text: string;
    memoryImageUri?: string;
  }[]>([]);
  const momentIdCounter = useRef(0);
  const currentMomentIndex = useRef(0);

  // Sizes
  const avatarSize = isTablet ? 100 : 80;
  const memorySize = isTablet ? 50 : 40;
  const momentIconSize = isTablet ? 60 : 50;
  const orbitRadius = isTablet ? 180 : 140;

  // Memory size by position: below avatar = full, left/right = bit smaller, above = smallest (stays in orbit)
  const getMemorySizeMultiplier = useCallback((angle: number) => {
    // Standard circle: angle 0 = right, π/2 = bottom, π = left, 3π/2 = top
    const towardBottom = (1 + Math.cos(angle - Math.PI / 2)) / 2; // 1 at bottom, 0 at top, ~0.5 at sides
    return 0.65 + 0.35 * towardBottom; // 1 at bottom, ~0.825 at sides, 0.65 at top
  }, []);

  const { momentColors } = useMomentColors();


  // Collect all moments by type
  const momentsByType = useMemo(() => {
    const lessons: { id: string; text: string; memoryId: string; memoryImageUri?: string }[] = [];
    const sunny: { id: string; text: string; memoryImageUri?: string }[] = [];
    const cloudy: { id: string; text: string; memoryImageUri?: string }[] = [];

    memories.forEach((memory) => {
      if (memory.lessonsLearned) {
        lessons.push(...memory.lessonsLearned.map(l => ({ ...l, memoryId: memory.id, memoryImageUri: memory.imageUri })));
      }
      if (memory.goodFacts) {
        sunny.push(...memory.goodFacts.map(gf => ({ ...gf, memoryImageUri: memory.imageUri })));
      }
      if (memory.hardTruths) {
        cloudy.push(...memory.hardTruths.map(ht => ({ ...ht, memoryImageUri: memory.imageUri })));
      }
    });

    return { lesson: lessons, sunny, cloudy };
  }, [memories]);

  // Sync isSpinning to shared value for SpiralingStars
  useEffect(() => {
    isSpinningShared.value = isSpinning;
  }, [isSpinning]);

  // Trigger celebration sparks when exam answer is correct
  useEffect(() => {
    if (examState?.step === 'result' && examState?.analysis?.isCorrect) {
      celebrationSpinning.value = true;
      const t = setTimeout(() => {
        celebrationSpinning.value = false;
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [examState?.step, examState?.analysis?.isCorrect]);

  // Auto-dismiss "Spin the wheel" label after 3 seconds
  useEffect(() => {
    setSpinLabelDismissed(false);
    const timer = setTimeout(() => setSpinLabelDismissed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Entrance animation
  useEffect(() => {
    entranceProgress.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
  }, []);

  // Reset spin state on unmount so re-entering the wheel works correctly
  useEffect(() => {
    return () => {
      cancelAnimation(spinRotation);
      isSpinningShared.value = false;
      celebrationSpinning.value = false;
      setIsSpinning(false);
      setSelectedMoment(null);
      setExamState(null);
    };
  }, []);

  // Collect all moments of selected type with their source memory positions and size scale
  const momentsWithPositions = useMemo(() => {
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2 - 40;
    const result: Array<{
      memoryId: string;
      memoryX: number;
      memoryY: number;
      memorySizeMultiplier: number;
      momentType: 'lesson' | 'sunny' | 'cloudy';
      text: string;
      memoryImageUri?: string;
    }> = [];

    memories.forEach((memory, index) => {
      // Calculate memory position on orbit and size multiplier (below=1, sides=~0.82, above=~0.65)
      const count = Math.min(memories.length, 8);
      const angle = (index / count) * 2 * Math.PI;
      const memoryX = centerX + Math.cos(angle) * orbitRadius;
      const memoryY = centerY + Math.sin(angle) * orbitRadius;
      const memorySizeMultiplier = getMemorySizeMultiplier(angle);

      // Add moments based on selected type
      if (selectedMomentType === 'lesson' && memory.lessonsLearned) {
        memory.lessonsLearned.forEach(lesson => {
          result.push({
            memoryId: memory.id,
            memoryX,
            memoryY,
            memorySizeMultiplier,
            momentType: 'lesson',
            text: lesson.text,
            memoryImageUri: memory.imageUri,
          });
        });
      } else if (selectedMomentType === 'sunny' && memory.goodFacts) {
        memory.goodFacts.forEach(sunny => {
          result.push({
            memoryId: memory.id,
            memoryX,
            memoryY,
            memorySizeMultiplier,
            momentType: 'sunny',
            text: sunny.text,
            memoryImageUri: memory.imageUri,
          });
        });
      } else if (selectedMomentType === 'cloudy' && memory.hardTruths) {
        memory.hardTruths.forEach(cloudy => {
          result.push({
            memoryId: memory.id,
            memoryX,
            memoryY,
            memorySizeMultiplier,
            momentType: 'cloudy',
            text: cloudy.text,
            memoryImageUri: memory.imageUri,
          });
        });
      }
    });

    return result;
  }, [memories, selectedMomentType, orbitRadius, getMemorySizeMultiplier]);

  // Spawn 4 moments sequentially, each grows from its memory, stays 3s, then shrinks back
  useEffect(() => {
    // Don't spawn moments while spinning
    if (isSpinning) {
      setFloatingMoments([]);
      currentMomentIndex.current = 0;
      return;
    }

    if (momentsWithPositions.length === 0) {
      setFloatingMoments([]);
      return;
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const INITIAL_CONCURRENT_MOMENTS = 4; // Show 4 at a time
    const INITIAL_START_DELAY = 1000; // Wait 1 second after opening
    const INITIAL_STAGGER_DELAY = 600; // 600ms between each initial moment
    const GROW_DURATION = 800; // Time to grow
    const HOLD_DURATION = 3000; // Hold for 3 seconds
    const SHRINK_DURATION = 800; // Time to shrink back
    const TOTAL_DURATION = GROW_DURATION + HOLD_DURATION + SHRINK_DURATION; // 4600ms total

    const spawnSingleMoment = (momentIndex: number, delay: number = 0) => {
      if (momentIndex >= momentsWithPositions.length) return;

      const timeout = setTimeout(() => {
        const momentData = momentsWithPositions[momentIndex];
        const newMoment = {
          id: momentIdCounter.current++,
          ...momentData,
        };

        setFloatingMoments(prev => [...prev, newMoment]);

        // Remove this moment after it completes
        const removeTimeout = setTimeout(() => {
          setFloatingMoments(prev => prev.filter(m => m.id !== newMoment.id));
        }, TOTAL_DURATION + 100);
        timeouts.push(removeTimeout);

        // After this moment starts shrinking, spawn the next one
        const nextMomentIndex = momentIndex + INITIAL_CONCURRENT_MOMENTS;
        if (nextMomentIndex < momentsWithPositions.length) {
          const nextSpawnTimeout = setTimeout(() => {
            spawnSingleMoment(nextMomentIndex, 0);
          }, TOTAL_DURATION);
          timeouts.push(nextSpawnTimeout);
        } else {
          // Restart from beginning after last moment completes
          const restartTimeout = setTimeout(() => {
            currentMomentIndex.current = 0;
            spawnSingleMoment(0, 0);
          }, TOTAL_DURATION);
          timeouts.push(restartTimeout);
        }
      }, delay);

      timeouts.push(timeout);
    };

    // Reset index when moment type changes
    currentMomentIndex.current = 0;

    // Start initial batch of 4 moments
    const momentsToSpawn = Math.min(INITIAL_CONCURRENT_MOMENTS, momentsWithPositions.length);
    for (let i = 0; i < momentsToSpawn; i++) {
      spawnSingleMoment(i, INITIAL_START_DELAY + (i * INITIAL_STAGGER_DELAY));
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [isSpinning, momentsWithPositions]);

  // Preload exam questions when entity wheel opens
  useEffect(() => {
    const lessonsCount = memories.reduce(
      (s, m) => s + (m.lessonsLearned?.length ?? 0),
      0,
    );
    if (lessonsCount > 0) {
      void preloadEntityWheelQuestions({
        entityId: entity.id,
        memories,
        language: lang,
        hasAIEntitlement,
      });
    }
  }, [entity.id, memories, lang, hasAIEntitlement]);

  // Handle spin — always use lesson preloaded exam (filters hidden when spinning)
  const handleSpin = useCallback(async () => {
    if (isSpinning) return;
    const lessons = momentsByType.lesson;
    if (lessons.length === 0) return;

    if (!aiConsent.isEnabled) {
      setAiConsentModalVisible(true);
      return;
    }

    const consumed = await consumeUniverseExamIfAvailable(hasAIEntitlement);
    if (!consumed) {
      const purchased = await showPaywallForAIAccess();
      if (!purchased) return;
    }

    logWheelEntitySpin(entity.id).catch(() => {});
    setSelectedMomentType('lesson'); // Force lesson mode when spin starts (ignore current filter)
    setIsSpinning(true);
    setSelectedMoment(null);
    setExamState(null);
    selectedMomentScale.value = 0;

    const totalRotations = 3 + Math.random() * 2;
    spinRotation.value = withSequence(
      withTiming(totalRotations * 360, {
        duration: 2000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(totalRotations * 360, { duration: 0, easing: Easing.linear }),
    );

    // Fetch the question in parallel with the spin animation
    const questionPromise = pickAndConsumePreloadedQuestion({
      type: 'entity',
      entityId: entity.id,
      onRefetchEntity: (eid) =>
        preloadEntityWheelQuestions({
          entityId: eid,
          memories,
          language: lang,
          hasAIEntitlement,
          onNeedPaywall: showPaywallForAIAccess,
          appendOnly: true,
        }),
    });

    // Wait for both the spin animation (2000ms) and the question to be ready
    const [item] = await Promise.all([
      questionPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);

    setSelectedMomentType('lesson');
    if (item) {
      setSelectedMoment({
        type: 'lesson',
        text: item.lessonText,
        memoryId: item.memoryId,
        memoryImageUri: item.memoryImageUri,
      });
      setExamState({ question: item.question, step: 'question' });
    } else {
      const randomObj = lessons[Math.floor(Math.random() * lessons.length)];
      setSelectedMoment({
        type: 'lesson',
        text: randomObj.text,
        memoryId: randomObj.memoryId,
        memoryImageUri: randomObj.memoryImageUri,
      });
      setExamState({
        question: randomObj.text,
        step: 'question',
      });
    }
    setIsSpinning(false);
    selectedMomentScale.value = withSpring(1, {
      damping: 12,
      stiffness: 150,
    });
  }, [
    isSpinning,
    momentsByType.lesson,
    entity.id,
    hasAIEntitlement,
    aiConsent.isEnabled,
  ]);

  const handleExamSubmit = useCallback(
    async (userAnswer: string) => {
      if (!selectedMoment || selectedMoment.type !== 'lesson' || !examState)
        return;
      setExamState((p) => (p ? { ...p, step: 'analyzing' } : null));
      try {
        const analysis = await analyzeLessonExamAnswer(
          selectedMoment.text,
          examState.question,
          userAnswer,
          lang,
        );
        setExamState((p) =>
          p ? { ...p, step: 'result', analysis, userAnswer } : null,
        );
        if (analysis.isCorrect) setShowFireworks(true);
      } catch {
        setExamState((p) =>
          p
            ? {
                ...p,
                step: 'result',
                analysis: {
                  isCorrect: false,
                  feedback: 'Something went wrong. Try again.',
                },
                userAnswer,
              }
            : null,
        );
      }
    },
    [selectedMoment, examState, lang],
  );

  const clearMomentAndExam = useCallback(() => {
    setSelectedMoment(null);
    setExamState(null);
    setExamAnswerInput('');
    setShowFireworks(false);
  }, []);

  // Avatar animated style - center and scale down
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const scale = 1 - entranceProgress.value * 0.3; // Scale down from 1 to 0.7
    return {
      position: 'absolute',
      left: SCREEN_WIDTH / 2 - avatarSize / 2,
      top: SCREEN_HEIGHT / 2 - avatarSize / 2 - 40,
      transform: [{ scale }],
      opacity: entranceProgress.value,
    };
  });

  // Memories orbit animated style
  const memoriesOrbitStyle = useAnimatedStyle(() => {
    const scale = entranceProgress.value; // Scale from 0 to 1
    return {
      position: 'absolute',
      left: SCREEN_WIDTH / 2 - orbitRadius,
      top: SCREEN_HEIGHT / 2 - orbitRadius - 40,
      transform: [{ rotate: `${spinRotation.value}deg` }, { scale }],
      opacity: entranceProgress.value,
    };
  });

  // Selected moment animated style
  const selectedMomentAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: selectedMomentScale.value }],
      opacity: selectedMomentScale.value,
    };
  });

  const examSubmitButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: examSubmitPressScale.value }],
  }));

  const examInputPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: examInputPulseScale.value }],
  }));

  // Calculate progress for sunny percentage
  const sunnyPercentage = useMemo(() => {
    const total = momentsByType.lesson.length + momentsByType.sunny.length + momentsByType.cloudy.length;
    if (total === 0) return 0;
    return ((momentsByType.sunny.length + momentsByType.lesson.length) / total) * 100;
  }, [momentsByType]);

  // SVG progress circle parameters
  const borderWidth = 6;
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (sunnyPercentage / 100) * circumference;

  const initials = entity.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Semi-transparent backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={{ flex: 1 }} />
      </Pressable>

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose}>
        <MaterialIcons name="close" size={28 * fontScale} color={colors.text} />
      </Pressable>

      {/* Central avatar */}
      <AnimatedView
        style={[
          styles.avatarContainer,
          {
            width: avatarSize,
            height: avatarSize,
          },
          avatarAnimatedStyle,
        ]}
        pointerEvents="box-none"
      >
        <Svg width={avatarSize + borderWidth * 2} height={avatarSize + borderWidth * 2} style={styles.progressCircle}>
          <Defs>
            <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={momentColors.sunny.background} stopOpacity="1" />
              <Stop offset="100%" stopColor={momentColors.sunny.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={(avatarSize + borderWidth * 2) / 2}
            cy={(avatarSize + borderWidth * 2) / 2}
            r={radius}
            stroke={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}
            strokeWidth={borderWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={(avatarSize + borderWidth * 2) / 2}
            cy={(avatarSize + borderWidth * 2) / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={borderWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${(avatarSize + borderWidth * 2) / 2}, ${(avatarSize + borderWidth * 2) / 2}`}
          />
        </Svg>

        {entity.imageUri ? (
          <Image source={{ uri: entity.imageUri }} style={[styles.avatar, { borderRadius: avatarSize / 2 }]} />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.primary,
                borderRadius: avatarSize / 2,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <ThemedText size="xl" weight="bold" style={{ color: '#fff' }}>
              {initials}
            </ThemedText>
          </View>
        )}
      </AnimatedView>

      {/* Spiraling icons - appears during wheel spin and on correct exam answer */}
      <EntitySpiralingStars
        avatarCenterX={wheelCenterX}
        avatarCenterY={wheelCenterY}
        isSpinning={isSpinningShared}
        celebrationSpinning={celebrationSpinning}
        momentType="lessons"
      />

      {/* Memories in orbit — size by position: below = full, left/right = smaller, above = smallest */}
      <AnimatedView
        style={[
          styles.memoriesOrbit,
          {
            width: orbitRadius * 2,
            height: orbitRadius * 2,
          },
          memoriesOrbitStyle,
        ]}
        pointerEvents="box-none"
      >
        {memories.slice(0, 8).map((memory, index) => {
          const count = Math.min(memories.length, 8);
          const angle = (index / count) * 2 * Math.PI;
          const sizeMultiplier = getMemorySizeMultiplier(angle);
          const size = memorySize * sizeMultiplier;
          const x = orbitRadius + Math.cos(angle) * orbitRadius - size / 2;
          const y = orbitRadius + Math.sin(angle) * orbitRadius - size / 2;

          return (
            <Animated.View
              key={memory.id}
              style={[
                styles.memoryIcon,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  left: x,
                  top: y,
                },
              ]}
            >
              {memory.imageUri ? (
                <Image source={{ uri: memory.imageUri }} style={[styles.memoryImage, { borderRadius: size / 2 }]} />
              ) : (
                <View style={[styles.memoryPlaceholder, { backgroundColor: colors.primary, borderRadius: size / 2 }]}>
                  <MaterialIcons name="photo" size={size * 0.5} color="#fff" />
                </View>
              )}
            </Animated.View>
          );
        })}
      </AnimatedView>

      {/* Moment type icons below avatar - selectable to filter floating moments */}
      {!isSpinning && (
      <View
        style={[
          styles.momentTypesContainer,
          {
            top: SCREEN_HEIGHT / 2 + 50,
          },
        ]}
      >
        {MOMENT_TYPES.map((momentType, index) => {
          const count = momentsByType[momentType.type].length;
          const isDisabled = count === 0;
          const isSelected = selectedMomentType === momentType.type;

          return (
            <Pressable
              key={momentType.type}
              style={[
                styles.momentTypeButton,
                {
                  width: momentIconSize,
                  height: momentIconSize,
                  borderRadius: momentIconSize / 2,
                  backgroundColor: isSelected ? COSMIC_SELECTOR : COSMIC_UNSELECTED_BG,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: isSelected ? COSMIC_SELECTOR : 'transparent',
                  opacity: isDisabled ? 0.3 : 1,
                },
              ]}
              onPress={() => {
                if (!isDisabled && !isSpinning) {
                  setSelectedMomentType(momentType.type);
                }
              }}
              disabled={isDisabled || isSpinning}
            >
              <MaterialIcons
                name={momentType.icon as any}
                size={momentIconSize * 0.5}
                color={
                  isDisabled
                    ? colors.textTertiary
                    : isSelected
                      ? momentType.type === 'lesson'
                        ? momentColors.lesson.background
                        : momentType.type === 'sunny'
                          ? momentColors.sunny.background
                          : momentColors.cloudy.background
                      : COSMIC_ICON_UNSELECTED
                }
              />
              <ThemedText
                size="xs"
                style={{
                  marginTop: 4,
                  color:
                    isDisabled
                      ? colors.textTertiary
                      : isSelected
                        ? momentType.type === 'lesson'
                          ? momentColors.lesson.background
                          : momentType.type === 'sunny'
                            ? momentColors.sunny.background
                            : momentColors.cloudy.background
                        : COSMIC_ICON_UNSELECTED
                }}
              >
                {count}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      )}

      {/* "Spin the wheel" label - auto-dismisses after 3 seconds */}
      {!isSpinning && !spinLabelDismissed && (
        <View
          style={{
            position: 'absolute',
            top: SCREEN_HEIGHT / 2 + 105,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 200,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ThemedText size="sm" weight="bold" style={{ opacity: 0.7, textAlign: 'center' }}>
              {t('wheel.spinForRandom')}
            </ThemedText>
            <Pressable
              onPress={() => setSpinLabelDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="close" size={16} color={colors.text} style={{ opacity: 0.7 }} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Spin button — enabled for any filter with moments */}
      <Pressable
        style={[
          styles.spinButton,
          {
            top: SCREEN_HEIGHT / 2 + 150,
            backgroundColor: colors.primary,
            opacity: isSpinning ? 0.5 : 1,
          },
        ]}
        onPress={() => void handleSpin()}
        disabled={isSpinning || momentsByType.lesson.length === 0}
      >
        <MaterialIcons name="refresh" size={28 * fontScale} color="#fff" />
        <ThemedText size="sm" weight="semibold" style={{ marginLeft: 8, color: '#fff' }}>
          {isSpinning ? 'Spinning...' : t('wheel.spinForRandom')}
        </ThemedText>
      </Pressable>
      {/* Floating moments that grow from memories (cosmic nebula-style bubbles); scale by memory position */}
      {floatingMoments.map((moment, index) => (
          <FloatingMomentFromMemory
            key={`floating-moment-${moment.id}`}
            momentId={moment.id}
            memoryX={moment.memoryX}
            memoryY={moment.memoryY}
            memorySizeMultiplier={moment.memorySizeMultiplier}
            momentType={moment.momentType}
            colorScheme={colorScheme}
            text={moment.text}
            isTablet={isTablet}
            positionIndex={index}
            totalConcurrent={floatingMoments.length}
          />
        ))}

      {/* Fireworks for correct exam answer */}
      {showFireworks && (
        <Fireworks
          visible={showFireworks}
          onComplete={() => setShowFireworks(false)}
        />
      )}

      {/* AI consent modal — shown when user tries to spin without enabling AI */}
      <AIInsightsConsentModal
        visible={aiConsentModalVisible}
        onEnable={() => {
          setAiConsentModalVisible(false);
          void aiConsent.setChoice('enabled');
        }}
        onMaybeLater={() => {
          void aiConsent.setChoice('maybe_later').then(() => {
            setAiConsentModalVisible(false);
          });
        }}
      />

      {/* Selected moment display — exam UI for lessons */}
      {selectedMoment && (() => {
        // Calculate dimensions dynamically based on text length for all moment types (matching main wheel rules)
        const textLength = selectedMoment.text?.length || 0;

        // Base sizes for different moment types
        const baseSunSize = isTablet ? 240 : 160;
        const baseCloudWidth = isTablet ? 260 : 190;
        const baseCloudHeight = isTablet ? 160 : 120;
        const baseLessonSize = isTablet ? 260 : 190;

        // Dynamic sizing based on text length (EXACT SAME RULES as main wheel)
        // For sunny moments: circular, so width = height
        const dynamicSunSize = Math.min(400, Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 1.5)));

        // For cloudy moments: wider and shorter, scale width more than height
        const cloudWidthMultiplier = Math.min(2.0, Math.max(1.0, 1.0 + (textLength / 100)));
        const cloudHeightMultiplier = Math.min(1.2, Math.max(1.0, 1.0 + (textLength / 200)));
        const dynamicCloudWidth = baseCloudWidth * cloudWidthMultiplier;
        const dynamicCloudHeight = baseCloudHeight * cloudHeightMultiplier;

        // For lesson moments: circular, scale based on text length
        const lessonSizeMultiplier = Math.min(1.8, Math.max(1.0, 1.0 + (textLength / 120)));
        const dynamicLessonSize = baseLessonSize * lessonSizeMultiplier;

        // Set moment dimensions based on type
        const momentWidth = selectedMoment.type === 'sunny'
          ? dynamicSunSize
          : selectedMoment.type === 'cloudy'
          ? dynamicCloudWidth
          : dynamicLessonSize;
        const momentHeight = selectedMoment.type === 'sunny'
          ? dynamicSunSize
          : selectedMoment.type === 'cloudy'
          ? dynamicCloudHeight
          : dynamicLessonSize;

        const CARD_WIDTH = Math.min(320, SCREEN_WIDTH - 48);
        const CARD_HEIGHT = 400;
        const isSimpleCard = !(selectedMoment.type === 'lesson' && examState);
        const simpleCardAccent =
          selectedMoment.type === 'sunny'
            ? momentColors.sunny.background
            : selectedMoment.type === 'cloudy'
              ? momentColors.cloudy.background
              : momentColors.lesson.background;

        return (
          <AnimatedView
            style={[
              styles.selectedMomentContainer,
              {
                top: SCREEN_HEIGHT / 2 + 220,
                backgroundColor:
                  selectedMoment.type === 'lesson' && examState
                    ? momentColors.lesson.background + 'B3'
                    : isSimpleCard
                      ? colorScheme === 'dark'
                        ? 'rgba(26, 35, 50, 0.98)'
                        : 'rgba(255, 255, 255, 0.98)'
                      : colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                width: isSimpleCard ? CARD_WIDTH : Math.max(momentWidth, 280),
                minWidth: isSimpleCard ? undefined : 200,
                minHeight: isSimpleCard ? CARD_HEIGHT : examState?.step === 'analyzing' ? 220 : undefined,
                borderRadius: isSimpleCard ? 24 : undefined,
                overflow: isSimpleCard ? 'hidden' : undefined,
                borderWidth: isSimpleCard ? 1 : undefined,
                borderColor: isSimpleCard ? `${simpleCardAccent}40` : undefined,
                shadowColor: isSimpleCard ? simpleCardAccent : undefined,
                shadowOffset: isSimpleCard ? { width: 0, height: 8 } : undefined,
                shadowOpacity: isSimpleCard ? 0.35 : undefined,
                shadowRadius: isSimpleCard ? 24 : undefined,
                elevation: isSimpleCard ? 12 : undefined,
              },
              selectedMomentAnimatedStyle,
            ]}
          >
            {selectedMoment.type === 'lesson' && examState ? (
              /* Exam flow for lessons */
              <>
                {examState.step === 'question' && !examState.question ? (
                  <ActivityIndicator
                    size="large"
                    color={momentColors.lesson.background}
                  />
                ) : examState.step === 'analyzing' ? (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                      minHeight: 200,
                    }}
                  >
                    <ActivityIndicator
                      size="large"
                      color={momentColors.lesson.background}
                    />
                    <ThemedText size="sm" style={{ marginTop: 12, opacity: 0.9, textAlign: 'center' }}>
                      {t('wheel.exam.analyzing')}
                    </ThemedText>
                  </View>
                ) : examState.step === 'result' ? (
                  null
                ) : (
                  <>
                    <MaterialIcons
                      name="lightbulb"
                      size={28}
                      color={blendHex(momentColors.lesson.background, '#5CE1E6', 0.28)}
                      style={{ marginBottom: 12 }}
                    />
                    <ThemedText
                      size="sm"
                      weight="semibold"
                      style={{ marginBottom: 16, textAlign: 'center', paddingHorizontal: 8, color: momentColors.lesson.text }}
                    >
                      {examState.question}
                    </ThemedText>
                    <Animated.View style={[{ width: '100%' }, examInputPulseStyle]}>
                      <TextInput
                        value={examAnswerInput}
                        onChangeText={setExamAnswerInput}
                        placeholder={t('wheel.exam.questionPrompt')}
                        placeholderTextColor={momentColors.lesson.text}
                        style={{
                          width: '100%',
                          minHeight: 44,
                          backgroundColor: momentColors.lesson.background + '40',
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          color: momentColors.lesson.text,
                          fontSize: 14 * fontScale,
                        }}
                        multiline
                      />
                    </Animated.View>
                    <Animated.View style={examSubmitButtonStyle}>
                      <Pressable
                        onPressIn={() => {
                          if (examAnswerInputRef.current.trim().length >= 2) {
                            cancelAnimation(examSubmitPressScale);
                            examSubmitPressScale.value = withTiming(0.82, {
                              duration: 80,
                              easing: Easing.out(Easing.ease),
                            });
                          }
                        }}
                        onPressOut={() => {
                          cancelAnimation(examSubmitPressScale);
                          examSubmitPressScale.value = withSpring(1, {
                            damping: 12,
                            stiffness: 400,
                          });
                        }}
                        onPress={() => {
                          const trimmed = examAnswerInput.trim();
                          if (trimmed.length >= 2) {
                            void handleExamSubmit(trimmed);
                            setExamAnswerInput('');
                          } else {
                            cancelAnimation(examInputPulseScale);
                            examInputPulseScale.value = withSequence(
                              withTiming(1.04, { duration: 80, easing: Easing.out(Easing.ease) }),
                              withSpring(1, { damping: 12, stiffness: 400 })
                            );
                          }
                        }}
                        style={{
                          marginTop: 12,
                          paddingHorizontal: 24,
                          paddingVertical: 10,
                          backgroundColor: momentColors.lesson.background,
                          borderRadius: 20,
                        }}
                      >
                        <ThemedText size="sm" weight="semibold" style={{ color: momentColors.lesson.text }}>
                          {t('wheel.exam.submitAnswer')}
                        </ThemedText>
                      </Pressable>
                    </Animated.View>
                  </>
                )}
                <Pressable
                  onPress={clearMomentAndExam}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: selectedMoment.type === 'lesson' && examState
                      ? momentColors.lesson.background + 'CC'
                      : colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.95)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 999,
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={selectedMoment.type === 'lesson' && examState ? momentColors.lesson.text : (colorScheme === 'dark' ? '#FFFFFF' : '#000000')}
                    style={{ opacity: 0.9 }}
                  />
                </Pressable>
              </>
            ) : (
              /* Simple moment display: new card design (fixed size, close, icon, truncated text, image, open icon) */
              <>
                <Pressable
                  onPress={clearMomentAndExam}
                  hitSlop={12}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.08)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={colorScheme === 'dark' ? '#fff' : '#333'}
                  />
                </Pressable>
                <Pressable
                  onPress={onClose}
                  style={{
                    flex: 1,
                    paddingTop: 20,
                    paddingHorizontal: 20,
                    paddingBottom: 20,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: `${simpleCardAccent}28`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <MaterialIcons
                      name={
                        selectedMoment.type === 'sunny'
                          ? 'wb-sunny'
                          : selectedMoment.type === 'cloudy'
                            ? 'cloud'
                            : 'lightbulb'
                      }
                      size={32}
                      color={simpleCardAccent}
                    />
                  </View>
                  <ThemedText
                    numberOfLines={3}
                    ellipsizeMode="tail"
                    style={{
                      fontSize: 15 * fontScale,
                      lineHeight: 22 * fontScale,
                      textAlign: 'center',
                      marginBottom: 16,
                      paddingHorizontal: 8,
                    }}
                  >
                    {selectedMoment.text || ' '}
                  </ThemedText>
                  {selectedMoment.memoryImageUri ? (
                    <View
                      style={{
                        width: CARD_WIDTH - 40,
                        height: 160,
                        borderRadius: 16,
                        overflow: 'hidden',
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      <Image
                        source={{ uri: selectedMoment.memoryImageUri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: CARD_WIDTH - 40,
                        height: 100,
                        borderRadius: 16,
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.06)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcons
                        name="photo-library"
                        size={36}
                        color={
                          colorScheme === 'dark'
                            ? 'rgba(255,255,255,0.3)'
                            : 'rgba(0,0,0,0.2)'
                        }
                      />
                    </View>
                  )}
                  <View
                    style={{
                      marginTop: 14,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.08)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialIcons
                      name="open-in-full"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                </Pressable>
              </>
            )}
          </AnimatedView>
        );
      })()}

      {/* Exam result card overlay */}
      {examState?.step === 'result' && examState.analysis && selectedMoment && (() => {
        const resultAccentColor = examState.analysis.isCorrect ? '#4CAF50' : '#FFA726';
        const RESULT_CARD_WIDTH = Math.min(320, SCREEN_WIDTH - 48);
        const dismiss = () => {
          setSelectedMoment(null);
          setExamState(null);
        };
        const openMemory = () => {
          if (selectedMoment.memoryId && onMemoryOpen) {
            dismiss();
            onMemoryOpen(selectedMoment.memoryId);
          } else {
            dismiss();
          }
        };
        return (
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 1200,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.85)',
            }}
            onPress={dismiss}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                width: RESULT_CARD_WIDTH,
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(26, 35, 50, 0.98)'
                    : 'rgba(255, 255, 255, 0.98)',
                borderWidth: 1,
                borderColor: `${resultAccentColor}40`,
                shadowColor: resultAccentColor,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              {/* Close button */}
              <Pressable
                onPress={dismiss}
                hitSlop={12}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(0,0,0,0.08)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons
                  name="close"
                  size={22}
                  color={colorScheme === 'dark' ? '#fff' : '#333'}
                />
              </Pressable>
              {/* Card content — tap to open memory */}
              <Pressable
                onPress={openMemory}
                style={{
                  paddingTop: 24,
                  paddingHorizontal: 20,
                  paddingBottom: 20,
                  alignItems: 'center',
                }}
              >
                {/* Result icon */}
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: `${resultAccentColor}28`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <MaterialIcons
                    name={examState.analysis.isCorrect ? 'check-circle' : 'warning'}
                    size={32}
                    color={resultAccentColor}
                  />
                </View>
                {/* Celebration / keep practicing */}
                <ThemedText
                  size="l"
                  weight="bold"
                  style={{ marginBottom: 8, textAlign: 'center' }}
                >
                  {examState.analysis.isCorrect
                    ? t('wheel.exam.correctCelebration')
                    : t('wheel.exam.keepPracticing')}
                </ThemedText>
                {/* AI feedback */}
                <ThemedText
                  size="xs"
                  style={{ marginBottom: 16, textAlign: 'center', opacity: 0.75 }}
                >
                  {examState.analysis.feedback}
                </ThemedText>
                {/* Lesson text */}
                <ThemedText
                  size="sm"
                  style={{
                    textAlign: 'center',
                    fontStyle: 'italic',
                    marginBottom: 16,
                    paddingHorizontal: 4,
                    lineHeight: 22 * fontScale,
                  }}
                  numberOfLines={4}
                >
                  {selectedMoment.text}
                </ThemedText>
                {/* Memory image */}
                {selectedMoment.memoryImageUri ? (
                  <View
                    style={{
                      width: RESULT_CARD_WIDTH - 40,
                      height: 160,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <Image
                      source={{ uri: selectedMoment.memoryImageUri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      width: RESULT_CARD_WIDTH - 40,
                      height: 100,
                      borderRadius: 16,
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.06)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialIcons
                      name="photo-library"
                      size={36}
                      color={
                        colorScheme === 'dark'
                          ? 'rgba(255,255,255,0.3)'
                          : 'rgba(0,0,0,0.2)'
                      }
                    />
                  </View>
                )}
                {/* Open memory button */}
                <View
                  style={{
                    marginTop: 14,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.08)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons
                    name="open-in-full"
                    size={22}
                    color={colors.primary}
                  />
                </View>
              </Pressable>
            </Pressable>
          </Pressable>
        );
      })()}
    </View>
  );
}

function blendHex(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  });
  const a = parse(hex1);
  const b = parse(hex2);
  const r = Math.round(a.r * (1 - t) + b.r * t);
  const g = Math.round(a.g * (1 - t) + b.g * t);
  const b_ = Math.round(a.b * (1 - t) + b.b * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b_.toString(16).padStart(2, '0')}`;
}

// Cosmic floating moment bubbles (nebula-style: radial/linear gradients + soft glow)
// Smaller memories (e.g. above wheel) have smaller floating moments; they still orbit from memory position.
const FloatingMomentFromMemory = function FloatingMomentFromMemory({
  momentId,
  memoryX,
  memoryY,
  memorySizeMultiplier = 1,
  momentType,
  colorScheme,
  text = '',
  isTablet,
  positionIndex = 0,
  totalConcurrent = 1,
}: {
  momentId: number;
  memoryX: number;
  memoryY: number;
  memorySizeMultiplier?: number;
  momentType: 'lesson' | 'sunny' | 'cloudy';
  colorScheme: 'light' | 'dark';
  text?: string;
  isTablet: boolean;
  positionIndex?: number;
  totalConcurrent?: number;
}) {
  const fontScale = useFontScale();
  const { momentColors } = useMomentColors();
  const scale = useSharedValue(0);
  const positionX = useSharedValue(0);
  const positionY = useSharedValue(0);
  const growPulseScale = useSharedValue(1);

  // Calculate text length for dynamic sizing
  const textLength = text?.length || 0;

  // Dynamic sizes based on text length (matching main wheel rules)
  const baseSunSize = isTablet ? 240 : 160;
  const baseCloudWidth = isTablet ? 260 : 190;
  const baseCloudHeight = isTablet ? 160 : 120;
  const baseLessonSize = isTablet ? 260 : 190;

  // Apply dynamic sizing rules
  const dynamicSunSize = Math.min(400, Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 1.5)));

  const cloudWidthMultiplier = Math.min(2.0, Math.max(1.0, 1.0 + (textLength / 100)));
  const cloudHeightMultiplier = Math.min(1.2, Math.max(1.0, 1.0 + (textLength / 200)));
  const dynamicCloudWidth = baseCloudWidth * cloudWidthMultiplier;
  const dynamicCloudHeight = baseCloudHeight * cloudHeightMultiplier;

  const lessonSizeMultiplier = Math.min(1.8, Math.max(1.0, 1.0 + (textLength / 120)));
  const dynamicLessonSize = baseLessonSize * lessonSizeMultiplier;

  // Get final size based on type, then scale by memory position (smaller memory → smaller moment, still in orbit)
  const baseWidth = momentType === 'sunny'
    ? dynamicSunSize
    : momentType === 'cloudy'
    ? dynamicCloudWidth
    : dynamicLessonSize;
  const baseHeight = momentType === 'sunny'
    ? dynamicSunSize
    : momentType === 'cloudy'
    ? dynamicCloudHeight
    : dynamicLessonSize;
  const finalWidth = baseWidth * memorySizeMultiplier;
  const finalHeight = baseHeight * memorySizeMultiplier;

  // Start position is at memory
  const startX = memoryX;
  const startY = memoryY;

  // Calculate end position distributed around center to prevent overlap
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2 - 40;
  
  // Calculate offset based on position index to distribute moments in a circle
  // Use a radius that ensures moments don't overlap (based on maximum moment size + padding)
  const maxMomentSize = Math.max(finalWidth, finalHeight);
  // Minimum radius: half the diagonal of the largest moment + padding to prevent overlap
  // For 4 moments in a circle, we need radius >= (maxMomentSize * sqrt(2) / 2) + padding
  const minRadius = (maxMomentSize * Math.sqrt(2) / 2) + (maxMomentSize * 0.3);
  // Scale radius based on number of concurrent moments
  const distributionRadius = Math.max(minRadius, maxMomentSize * (0.4 + (totalConcurrent - 1) * 0.2));
  
  let endX = centerX;
  let endY = centerY;
  
  if (totalConcurrent > 1) {
    // Distribute moments in a circular pattern around center
    // Offset angle by -PI/2 to start from top (12 o'clock position)
    const angleStep = (2 * Math.PI) / totalConcurrent;
    const angle = (positionIndex * angleStep) - (Math.PI / 2);
    endX = centerX + Math.cos(angle) * distributionRadius;
    endY = centerY + Math.sin(angle) * distributionRadius;
  }

  // Animation: grow from memory position, move to center, hold, then shrink back to memory
  useEffect(() => {
    const GROW_DURATION = 800;
    const HOLD_DURATION = 3000;
    const SHRINK_DURATION = 800;

    // Start at memory position with scale 0
    scale.value = 0;
    positionX.value = startX;
    positionY.value = startY;
    growPulseScale.value = 1;

    // Grow and move to center
    scale.value = withTiming(1, { duration: GROW_DURATION, easing: Easing.out(Easing.ease) });
    positionX.value = withTiming(endX, { duration: GROW_DURATION, easing: Easing.out(Easing.ease) });
    positionY.value = withTiming(endY, { duration: GROW_DURATION, easing: Easing.out(Easing.ease) });

    // Start pulsing after growing
    setTimeout(() => {
      growPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        Math.floor(HOLD_DURATION / 1200),
        false
      );
    }, GROW_DURATION);

    // After hold, shrink and move back to memory
    setTimeout(() => {
      scale.value = withTiming(0, { duration: SHRINK_DURATION, easing: Easing.in(Easing.ease) });
      positionX.value = withTiming(startX, { duration: SHRINK_DURATION, easing: Easing.in(Easing.ease) });
      positionY.value = withTiming(startY, { duration: SHRINK_DURATION, easing: Easing.in(Easing.ease) });
    }, GROW_DURATION + HOLD_DURATION);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: positionX.value - finalWidth / 2,
      top: positionY.value - finalHeight / 2,
      transform: [{ scale: scale.value * growPulseScale.value }],
      zIndex: 1005,
    };
  });

  // Render the actual styled element based on type with text
  if (momentType === 'sunny') {
    return (
      <Animated.View style={animatedStyle}>
        <View
          style={{
            width: finalWidth,
            height: finalHeight,
            borderRadius: finalWidth / 2,
            backgroundColor: momentColors.sunny.background + '8C',
            shadowColor: momentColors.sunny.background,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: isTablet ? 12 : 9,
            elevation: 10,
            alignItems: 'center',
            justifyContent: 'center',
            padding: finalWidth * 0.15,
          }}
        >
          <MaterialIcons name="wb-sunny" size={finalWidth * 0.15} color={momentColors.sunny.background} />
          {text && (
            <ThemedText
              style={{
                color: momentColors.sunny.text,
                fontSize: Math.max(11, Math.min(16, 12 + (textLength / 60))) * fontScale,
                textAlign: 'center',
                fontWeight: '700',
                marginTop: 4,
              }}
              numberOfLines={Math.min(4, Math.max(2, Math.ceil(textLength / 25)))}
            >
              {text}
            </ThemedText>
          )}
        </View>
      </Animated.View>
    );
  }

  // Cloudy — nebula-style: linear gradient (deep space → cloudy color → cosmic teal edge)
  if (momentType === 'cloudy') {
    const gradId = `floating-cloudy-${momentId}`;
    return (
      <Animated.View
        style={[
          animatedStyle,
          {
            shadowColor: COSMIC_GLOW,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: isTablet ? 16 : 12,
            elevation: 12,
          },
        ]}
      >
        <View style={{ width: finalWidth, height: finalHeight, position: 'relative' }}>
          <Svg width={finalWidth} height={finalHeight} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Defs>
              <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={NEBULA_DARK} stopOpacity="0.98" />
                <Stop offset="18%" stopColor={NEBULA_MID} stopOpacity="0.97" />
                <Stop offset="35%" stopColor={momentColors.cloudy.background} stopOpacity="0.95" />
                <Stop offset="70%" stopColor={momentColors.cloudy.background} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={COSMIC_GLOW} stopOpacity={NEBULA_EDGE_ALPHA} />
              </LinearGradient>
            </Defs>
            <Rect
              x={2}
              y={2}
              width={finalWidth - 4}
              height={finalHeight - 4}
              rx={finalWidth * 0.28}
              ry={finalHeight * 0.22}
              fill={`url(#${gradId})`}
            />
          </Svg>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: Math.max(20, finalWidth * 0.1),
              paddingVertical: finalHeight * 0.2,
            }}
            pointerEvents="box-none"
          >
            <MaterialIcons name="cloud" size={finalHeight * 0.22} color={momentColors.cloudy.text} />
            {text && (
              <ThemedText
                style={{
                  color: momentColors.cloudy.text,
                  fontSize: Math.max(12, Math.min(16, 14 + (textLength / 80))) * fontScale,
                  textAlign: 'center',
                  fontWeight: '500',
                  marginTop: 4,
                }}
                numberOfLines={Math.min(6, Math.max(3, Math.ceil(textLength / 40)))}
              >
                {text}
              </ThemedText>
            )}
          </View>
        </View>
      </Animated.View>
    );
  }

  // Lesson (bulb) — original style
  const bulbColor = blendHex(momentColors.lesson.background, '#5CE1E6', 0.28);
  return (
    <Animated.View style={animatedStyle}>
      <View
        style={{
          width: finalWidth,
          height: finalHeight,
          borderRadius: finalWidth / 2,
          backgroundColor: momentColors.lesson.background + '73',
          shadowColor: momentColors.lesson.background,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: isTablet ? 40 : 30,
          elevation: 24,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Math.max(8, finalWidth * 0.05),
        }}
      >
        <MaterialIcons name="lightbulb" size={finalWidth * 0.25} color={bulbColor} />
        {text && (
          <ThemedText
            style={{
              color: momentColors.lesson.text,
              fontSize: Math.max(11, Math.min(14, 11 + (textLength / 50))) * fontScale,
              textAlign: 'center',
              fontWeight: '700',
              maxWidth: finalWidth * 0.75,
              lineHeight: Math.max(15, Math.min(18, 15 + (textLength / 50))) * fontScale,
              marginTop: 8,
            }}
            numberOfLines={Math.min(10, Math.max(4, Math.ceil(textLength / 30)))}
          >
            {text}
          </ThemedText>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1002,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  progressCircle: {
    position: 'absolute',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  memoriesOrbit: {
    zIndex: 1000,
  },
  memoryIcon: {
    position: 'absolute',
    overflow: 'hidden',
  },
  memoryImage: {
    width: '100%',
    height: '100%',
  },
  memoryPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentTypesContainer: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  spinButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  selectedMomentContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH - 60,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  selectedMomentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
