/**
 * Entity Wheel of Life — wheel-of-life view for a single entity (orbit of memories,
 * sunny/cloudy percentage ring, lesson/sunny/cloudy selector). Used when an entity
 * circle is focused (e.g. in modal or detail flow). The home tab uses an inline
 * implementation inside FloatingAvatar; this component is the standalone variant.
 *
 * Exam mode: When lesson filter is selected, spinning runs an AI-powered exam
 * (question based on random lesson, user answers, AI evaluates). Fireworks on correct.
 */
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
import {
  canSpinWheelExam,
  recordWheelExamUsed,
} from '@/utils/wheel-exam-rate-limiter';
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
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  colors: typeof Colors.dark;
  colorScheme: 'light' | 'dark';
}

export function EntityWheelOfLife({
  entity,
  memories,
  onClose,
  colors,
  colorScheme,
}: EntityWheelOfLifeProps) {
  const { isTablet } = useLargeDevice();
  const fontScale = useFontScale();
  const { hasAIEntitlement } = useSubscription();
  const t = useTranslate();
  const { language } = useLanguage();
  const lang = language === 'bg' ? 'bg' : 'en';

  // Animation values
  const entranceProgress = useSharedValue(0);
  const spinRotation = useSharedValue(0);
  const selectedMomentScale = useSharedValue(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<{
    type: 'lesson' | 'sunny' | 'cloudy';
    text: string;
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
  const [showFireworks, setShowFireworks] = useState(false);

  // State for floating moments that grow from memories
  const [floatingMoments, setFloatingMoments] = useState<{
    id: number;
    memoryId: string;
    memoryX: number;
    memoryY: number;
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

  const { momentColors } = useMomentColors();

  // Moment types configuration (uses custom colors)
  const momentTypes: MomentType[] = [
    { type: 'lesson', icon: 'lightbulb', color: momentColors.lesson.background, label: 'Lesson' },
    { type: 'sunny', icon: 'wb-sunny', color: momentColors.sunny.background, label: 'Sunny' },
    { type: 'cloudy', icon: 'cloud', color: momentColors.cloudy.background, label: 'Cloudy' },
  ];

  // Collect all moments by type
  const momentsByType = useMemo(() => {
    const lessons: { id: string; text: string; memoryImageUri?: string }[] = [];
    const sunny: { id: string; text: string; memoryImageUri?: string }[] = [];
    const cloudy: { id: string; text: string; memoryImageUri?: string }[] = [];

    memories.forEach((memory) => {
      if (memory.lessonsLearned) {
        lessons.push(...memory.lessonsLearned.map(l => ({ ...l, memoryImageUri: memory.imageUri })));
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

  // Entrance animation
  useEffect(() => {
    entranceProgress.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
  }, [entranceProgress]);

  // Collect all moments of selected type with their source memory positions
  const momentsWithPositions = useMemo(() => {
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2 - 40;
    const result: Array<{
      memoryId: string;
      memoryX: number;
      memoryY: number;
      momentType: 'lesson' | 'sunny' | 'cloudy';
      text: string;
      memoryImageUri?: string;
    }> = [];

    memories.forEach((memory, index) => {
      // Calculate memory position on orbit
      const angle = (index / Math.min(memories.length, 8)) * 2 * Math.PI;
      const memoryX = centerX + Math.cos(angle) * orbitRadius;
      const memoryY = centerY + Math.sin(angle) * orbitRadius;

      // Add moments based on selected type
      if (selectedMomentType === 'lesson' && memory.lessonsLearned) {
        memory.lessonsLearned.forEach(lesson => {
          result.push({
            memoryId: memory.id,
            memoryX,
            memoryY,
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
            momentType: 'cloudy',
            text: cloudy.text,
            memoryImageUri: memory.imageUri,
          });
        });
      }
    });

    return result;
  }, [memories, selectedMomentType, orbitRadius]);

  // Spawn 4 moments sequentially, each grows from its memory, stays 3s, then shrinks back
  useEffect(() => {
    console.log('[EntityWheel] Effect triggered. isSpinning:', isSpinning, 'momentsWithPositions.length:', momentsWithPositions.length);

    // Don't spawn moments while spinning
    if (isSpinning) {
      setFloatingMoments([]);
      currentMomentIndex.current = 0;
      return;
    }

    if (momentsWithPositions.length === 0) {
      console.log('[EntityWheel] No moments found for type:', selectedMomentType);
      setFloatingMoments([]);
      return;
    }

    console.log('[EntityWheel] Starting to spawn moments. First 4:', momentsWithPositions.slice(0, 4).map(m => ({ type: m.momentType, text: m.text.substring(0, 20) })));

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

        console.log('[EntityWheel] Spawning moment:', { index: momentIndex, type: newMoment.momentType, text: newMoment.text.substring(0, 30), memoryX: newMoment.memoryX, memoryY: newMoment.memoryY });
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

    const canSpin = await canSpinWheelExam(hasAIEntitlement);
    if (!canSpin) {
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

    setTimeout(async () => {
      if (!hasAIEntitlement) {
        await recordWheelExamUsed();
      }
      const item = await pickAndConsumePreloadedQuestion({
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
      if (item) {
        setSelectedMomentType('lesson'); // Always show lesson filter when spin completes
        setSelectedMoment({
          type: 'lesson',
          text: item.lessonText,
          memoryImageUri: item.memoryImageUri,
        });
        setExamState({ question: item.question, step: 'question' });
      } else {
        setSelectedMomentType('lesson'); // Always show lesson filter when spin completes
        const randomObj = lessons[Math.floor(Math.random() * lessons.length)];
        setSelectedMoment({
          type: 'lesson',
          text: randomObj.text,
          memoryImageUri: randomObj.memoryImageUri,
        });
        setExamState({
          question: randomObj.text,
          step: 'question',
        });
      }
      selectedMomentScale.value = withSpring(1, {
        damping: 12,
        stiffness: 150,
      });
      setIsSpinning(false);
    }, 2000);
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

      {/* Memories in orbit */}
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
          const angle = (index / Math.min(memories.length, 8)) * 2 * Math.PI;
          const x = orbitRadius + Math.cos(angle) * orbitRadius - memorySize / 2;
          const y = orbitRadius + Math.sin(angle) * orbitRadius - memorySize / 2;

          return (
            <Animated.View
              key={memory.id}
              style={[
                styles.memoryIcon,
                {
                  width: memorySize,
                  height: memorySize,
                  borderRadius: memorySize / 2,
                  left: x,
                  top: y,
                },
              ]}
            >
              {memory.imageUri ? (
                <Image source={{ uri: memory.imageUri }} style={[styles.memoryImage, { borderRadius: memorySize / 2 }]} />
              ) : (
                <View style={[styles.memoryPlaceholder, { backgroundColor: colors.primary, borderRadius: memorySize / 2 }]}>
                  <MaterialIcons name="photo" size={memorySize * 0.5} color="#fff" />
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
        {momentTypes.map((momentType, index) => {
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
                  backgroundColor: isSelected ? momentType.color + '40' : 'rgba(0, 0, 0, 0.3)',
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: isSelected ? momentType.color : 'transparent',
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
                color={isDisabled ? colors.textTertiary : momentType.color}
              />
              <ThemedText
                size="xs"
                style={{
                  marginTop: 4,
                  color: isDisabled ? colors.textTertiary : momentType.color
                }}
              >
                {count}
              </ThemedText>
            </Pressable>
          );
        })}
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
      {/* Floating moments that grow from memories */}
      {(() => {
        console.log('[EntityWheel] Rendering floatingMoments. Count:', floatingMoments.length);
        return floatingMoments.map((moment, index) => (
          <FloatingMomentFromMemory
            key={`floating-moment-${moment.id}`}
            memoryX={moment.memoryX}
            memoryY={moment.memoryY}
            momentType={moment.momentType}
            colorScheme={colorScheme}
            text={moment.text}
            isTablet={isTablet}
            positionIndex={index}
            totalConcurrent={floatingMoments.length}
          />
        ));
      })()}

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

        return (
          <AnimatedView
            style={[
              styles.selectedMomentContainer,
              {
                top: SCREEN_HEIGHT / 2 + 220,
                backgroundColor:
                  selectedMoment.type === 'lesson' && examState
                    ? momentColors.lesson.background + 'B3'
                    : colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                width: Math.max(momentWidth, 280),
                minWidth: 200,
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
                    }}
                  >
                    <ActivityIndicator
                      size="large"
                      color={momentColors.lesson.background}
                    />
                    <ThemedText size="sm" style={{ marginTop: 12, opacity: 0.9 }}>
                      {t('wheel.exam.analyzing')}
                    </ThemedText>
                  </View>
                ) : examState.step === 'result' && examState.analysis ? (
                  <>
                    <MaterialIcons
                      name={
                        examState.analysis.isCorrect ? "check-circle" : "warning"
                      }
                      size={32}
                      color={
                        examState.analysis.isCorrect ? "#4CAF50" : "#FFA726"
                      }
                      style={{ marginBottom: 8 }}
                    />
                    <ThemedText size="l" weight="bold" style={{ marginBottom: 12, textAlign: 'center' }}>
                      {examState.analysis.isCorrect
                        ? t('wheel.exam.correctCelebration')
                        : t('wheel.exam.keepPracticing')}
                    </ThemedText>
                    <ThemedText size="xs" style={{ marginBottom: 8, opacity: 0.9, textAlign: 'center' }}>
                      {examState.analysis.feedback}
                    </ThemedText>
                    <ThemedText size="xs" weight="semibold" style={{ marginTop: 12, marginBottom: 4, opacity: 0.8 }}>
                      {t('wheel.exam.revealLesson')}
                    </ThemedText>
                    <ThemedText
                      size="sm"
                      style={{ textAlign: 'center', fontStyle: 'italic', maxWidth: '100%' }}
                      numberOfLines={6}
                    >
                      {selectedMoment.text}
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="lightbulb"
                      size={28}
                      color={momentColors.lesson.background}
                      style={{ marginBottom: 12 }}
                    />
                    <ThemedText
                      size="sm"
                      weight="semibold"
                      style={{ marginBottom: 16, textAlign: 'center', paddingHorizontal: 8 }}
                    >
                      {examState.question}
                    </ThemedText>
                    <TextInput
                      value={examAnswerInput}
                      onChangeText={setExamAnswerInput}
                      placeholder={t('wheel.exam.questionPrompt')}
                      placeholderTextColor={momentColors.lesson.text + '99'}
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
                    <Pressable
                      onPress={() => {
                        const trimmed = examAnswerInput.trim();
                        if (trimmed) {
                          void handleExamSubmit(trimmed);
                          setExamAnswerInput('');
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
              /* Simple moment display (lesson without exam, sunny, cloudy) */
              <>
                <View style={styles.selectedMomentHeader}>
                  <MaterialIcons
                    name={
                      selectedMoment.type === 'sunny'
                        ? 'wb-sunny'
                        : selectedMoment.type === 'cloudy'
                          ? 'cloud'
                          : 'lightbulb'
                    }
                    size={24 * fontScale}
                    color={
                      selectedMoment.type === 'sunny'
                        ? momentColors.sunny.background
                        : selectedMoment.type === 'cloudy'
                          ? momentColors.cloudy.background
                          : momentColors.lesson.background
                    }
                  />
                  <ThemedText size="sm" weight="semibold" style={{ marginLeft: 8 }}>
                    {selectedMoment.type === 'sunny'
                      ? 'Sunny'
                      : selectedMoment.type === 'cloudy'
                        ? 'Cloudy'
                        : 'Lesson'}
                  </ThemedText>
                </View>
                <ThemedText
                  size="sm"
                  style={{
                    marginTop: 8,
                    textAlign: 'center',
                    opacity: 0.9,
                    fontSize: Math.max(12, Math.min(16, 14 + (textLength / 80))) * fontScale,
                  }}
                  numberOfLines={Math.min(10, Math.max(3, Math.ceil(textLength / 40)))}
                >
                  {selectedMoment.text}
                </ThemedText>
                {selectedMoment.memoryImageUri && (
                  <Image
                    source={{ uri: selectedMoment.memoryImageUri }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginTop: 12,
                      borderWidth: 2,
                      borderColor: momentColors.lesson.background,
                    }}
                  />
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
                    backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.95)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 999,
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                    style={{ opacity: 0.9 }}
                  />
                </Pressable>
              </>
            )}
          </AnimatedView>
        );
      })()}
    </View>
  );
}

// Pulsing Floating Moment Icon Component (grows from memory, stays grown, shrinks back)
const FloatingMomentFromMemory = function FloatingMomentFromMemory({
  memoryX,
  memoryY,
  momentType,
  colorScheme,
  text = '',
  isTablet,
  positionIndex = 0,
  totalConcurrent = 1,
}: {
  memoryX: number;
  memoryY: number;
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

  // Get final size based on type
  const finalWidth = momentType === 'sunny'
    ? dynamicSunSize
    : momentType === 'cloudy'
    ? dynamicCloudWidth
    : dynamicLessonSize;
  const finalHeight = momentType === 'sunny'
    ? dynamicSunSize
    : momentType === 'cloudy'
    ? dynamicCloudHeight
    : dynamicLessonSize;

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
    console.log('[FloatingMoment] Component mounted. Type:', momentType, 'Text:', text?.substring(0, 20), 'StartPos:', { x: startX, y: startY }, 'EndPos:', { x: endX, y: endY });

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

  if (momentType === 'cloudy') {
    return (
      <Animated.View style={animatedStyle}>
        <View
          style={{
            width: finalWidth,
            height: finalHeight,
            borderRadius: finalWidth * 0.3,
            backgroundColor: momentColors.cloudy.background + 'F2',
            shadowColor: momentColors.cloudy.background,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
            elevation: 8,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: Math.max(20, finalWidth * 0.1),
            paddingVertical: finalHeight * 0.2,
          }}
        >
          <MaterialIcons name="cloud" size={finalHeight * 0.3} color={momentColors.cloudy.text} />
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
      </Animated.View>
    );
  }

  // Lesson
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
        <MaterialIcons name="lightbulb" size={finalWidth * 0.25} color={momentColors.lesson.background} />
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
