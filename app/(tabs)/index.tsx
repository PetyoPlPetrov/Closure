import { useDemoMode } from "@/utils/DemoModeProvider";
import { AIInsightsConsentModal } from "@/components/ai-insights-consent-modal";
import { ConstellationBackground } from "@/components/constellation-background";
import { ExpandableMenuButton } from "@/components/expandable-menu-button";
import { Fireworks } from "@/components/fireworks";
import { FocusedEntitiesView } from "@/components/focused-entities-view";
import { FocusedEntityMemoryList } from "@/components/focused-entity-memory-list";
import { FocusedSferaView } from "@/components/focused-sfera-view";
import { PulsingPressable } from "@/components/pulsing-pressable";
import { SferaSizeHintBanner } from "@/components/sfera-size-hint-banner";
import ShareModal from "@/components/ShareModal";
import { StreakBadgeComponent } from "@/components/streak-badge";
import { StreakModal } from "@/components/streak-modal";
import { StreakRulesModal } from "@/components/streak-rules-modal";
import {
  SunnyMomentsCelebrationOverlay,
} from "@/components/sunny-moments-celebration-overlay";
import { ThemedText } from "@/components/themed-text";
import { Colors, fabAccentBackground } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import { GifAnimationPreview } from "@/library/components/gif-animation-preview";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { WalkthroughModal } from "@/library/components/walkthrough-modal";
import { analyzeLessonExamAnswer } from "@/utils/ai-service";
import { useAIInsightsConsent } from "@/utils/AIInsightsConsentProvider";
import { logError } from "@/utils/error-logger";
import { onEventsTabPress } from "@/utils/events-tab-press";
import {
  getGuideDismissedForever,
  getReadSections,
  setGuideDismissedForever,
} from "@/utils/guide-storage";
import {
  ENTITIES_DISPLAY_MODE_STORAGE_KEY,
  type EntitiesDisplayMode,
} from "@/utils/entities-display-mode-storage";
import { onHomeTabPress } from "@/utils/home-tab-press";
import { useHomeTransitionLoader } from "@/utils/home-transition-loader-context";
import { useJourney, type LifeSphere } from "@/utils/JourneyProvider";
import { useLanguage } from "@/utils/languages/language-context";
import { useTranslate } from "@/utils/languages/use-translate";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { momentPillGlyphColor } from "@/utils/moment-pill-glyph";
import {
  getPostOnboardingAIWelcomeDismissedThisSession,
  getOnboardingCompleted,
  getShowPostOnboardingAIWelcome,
  getShowWalkthroughAfterOnboarding,
  POST_ONBOARDING_AI_SPOTLIGHT_MAX_MEMORIES,
  setShowWalkthroughAfterOnboarding,
  subscribeGuideRecheckAfterWelcomeDismiss,
} from "@/utils/onboarding-storage";
import { showPaywallForAIAccess } from "@/utils/premium-access";
import { subscribeBadgeRewardsChanged } from "@/utils/badge-rewards-events";
import {
  getSferaSizeHintDismissedForever,
  getSunnyHintCollapsed,
  setSferaSizeHintDismissedForever,
  setSunnyHintCollapsed,
} from "@/utils/sfera-size-hint-storage";
import {
  getSphereGradientColors,
  getSphereIconColor,
  getSphereShadowColor,
} from "@/utils/sphere-styles";
import { useSplash } from "@/utils/SplashAnimationProvider";
import {
  getCurrentBadge,
  getNextBadge,
  recalculateStreak,
} from "@/utils/streak-manager";
import { refreshStreakNotifications } from "@/utils/streak-notifications";
import type { StreakBadge, StreakData } from "@/utils/streak-types";
import { useSubscription } from "@/utils/SubscriptionProvider";
import {
  consumeUniverseExamIfAvailable,
  getRemainingUniverseExams,
} from "@/utils/universe-exam-rate-limiter";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import {
  pickAndConsumePreloadedQuestion,
  preloadEntityWheelQuestions,
  preloadMainWheelQuestions,
} from "@/utils/wheel-exam-preload";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import * as Device from "expo-device";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Dimensions,
  InteractionManager,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent
} from "react-native";
import Animated, {
  cancelAnimation,
  createAnimatedComponent,
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  FeColorMatrix,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  Filter,
  Line,
  Path,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import { SECTIONS } from "@/utils/guide-data";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const FOCUSED_SPHERES_ORDER: LifeSphere[] = [
  "relationships",
  "career",
  "family",
  "friends",
  "hobbies",
];

// Worklet-safe constants for the spin hint arc animation
// Clock mapping: angle = -π/2 + (hour/12)*2π
// 16:00 (4 o'clock) = -π/2 + (4/12)*2π = π/6  (~30°, right side slightly below center)
// 19:00 (7 o'clock) = -π/2 + (7/12)*2π = 2π/3 (~120°, bottom-left)
const HINT_ARC_START_RAD = Math.PI / 6; // 16:00 / 4 o'clock
const HINT_ARC_SWEEP_RAD = Math.PI / 2; // 90° clockwise → 19:00 / 7 o'clock

// Create animated Pressable component for shadow animations
const AnimatedPressable = createAnimatedComponent(Pressable);

// Create animated Circle component for loading progress
const AnimatedCircle = createAnimatedComponent(Circle);

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const num = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Shared neutral glass for unselected entity-wheel selectors (selection drives the tint). */
function momentWheelNeutralGlass(
  colorScheme: "light" | "dark",
): [string, string, string] {
  return colorScheme === "dark"
    ? [
        "rgba(42, 54, 82, 0.72)",
        "rgba(26, 36, 64, 0.55)",
        "rgba(22, 30, 52, 0.62)",
      ]
    : [
        "rgba(255, 255, 255, 0.72)",
        "rgba(245, 247, 252, 0.55)",
        "rgba(235, 238, 246, 0.65)",
      ];
}

/** Frosted glass under entity-wheel bottom selectors — moment hue only when selected. */
function momentWheelGlassGradient(
  bgHex: string,
  selected: boolean,
  colorScheme: "light" | "dark",
): [string, string, string] {
  if (!selected) {
    return momentWheelNeutralGlass(colorScheme);
  }
  const { r, g, b } = hexToRgb(bgHex);
  return [
    `rgba(${r}, ${g}, ${b}, 0.22)`,
    `rgba(${r}, ${g}, ${b}, 0.1)`,
    `rgba(${r}, ${g}, ${b}, 0.055)`,
  ];
}

/** Ring overlay on selectors — hue from Moments Colors background. */
function momentWheelRingGradient(bgHex: string): [string, string, string] {
  const { r, g, b } = hexToRgb(bgHex);
  return [
    `rgba(${r}, ${g}, ${b}, 0.5)`,
    `rgba(${r}, ${g}, ${b}, 0.26)`,
    `rgba(${r}, ${g}, ${b}, 0.11)`,
  ];
}

// Draggable Moment Component (for focused memory view)
const DraggableMoment = React.memo(function DraggableMoment({
  initialX,
  initialY,
  width,
  height,
  zIndex,
  onPositionChange,
  onPress,
  children,
  entranceDelay = 0,
  startX: propStartX,
  startY: propStartY,
  isActive = true,
}: {
  initialX: number;
  initialY: number;
  width: number;
  height: number;
  zIndex: number;
  onPositionChange?: (x: number, y: number) => void;
  onPress?: () => void;
  children: React.ReactNode;
  entranceDelay?: number;
  startX?: number;
  startY?: number;
  isActive?: boolean;
}) {
  const hasStartPosition = propStartX !== undefined && propStartY !== undefined;
  const animationStartedRef = useRef(false); // Track if animation has started to prevent reset
  const panX = useSharedValue(hasStartPosition ? propStartX! : initialX);
  const panY = useSharedValue(hasStartPosition ? propStartY! : initialY);
  const startX = useSharedValue(hasStartPosition ? propStartX! : initialX);
  const startY = useSharedValue(hasStartPosition ? propStartY! : initialY);
  const isDragging = useSharedValue(false);
  const entranceProgress = useSharedValue(hasStartPosition ? 1 : 0); // Start at 0 when no start position to enable entrance animation
  const scale = useSharedValue(hasStartPosition ? 0.3 : 1);
  const opacity = useSharedValue(hasStartPosition ? 0.95 : 1); // Start almost fully visible at button position to prevent blink

  // Use the actual content size as the draggable area (no extra padding)
  const hitAreaWidth = width;
  const hitAreaHeight = height;

  // Entrance animation with delay - if start position provided, animate from there
  // Use useLayoutEffect to ensure initial state is set synchronously before paint
  React.useLayoutEffect(() => {
    if (
      hasStartPosition &&
      propStartX !== undefined &&
      propStartY !== undefined &&
      !animationStartedRef.current
    ) {
      // Set initial values immediately and synchronously to prevent any flash
      panX.value = propStartX;
      panY.value = propStartY;
      opacity.value = 0.95; // Start almost fully visible to prevent any blink
      scale.value = 0.3;
      entranceProgress.value = 1; // Set to 1 so it doesn't affect opacity (we use opacity.value directly)
    } else if (!hasStartPosition && !animationStartedRef.current) {
      // Set initial state synchronously for entrance animation
      entranceProgress.value = 0;
    }
  }, [
    hasStartPosition,
    propStartX,
    propStartY,
    panX,
    panY,
    opacity,
    scale,
    entranceProgress,
  ]);

  // Start the actual animation after layout is complete
  React.useEffect(() => {
    if (
      hasStartPosition &&
      propStartX !== undefined &&
      propStartY !== undefined &&
      !animationStartedRef.current
    ) {
      // Mark animation as started to prevent reset
      animationStartedRef.current = true;
      // Use a very short delay (just one frame) to ensure render happens first
      const timer = setTimeout(() => {
        // Fade to full opacity smoothly
        opacity.value = withTiming(1, { duration: 100 });
        // Animate scale and position together
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
          mass: 1,
        });
        panX.value = withSpring(initialX, {
          damping: 15,
          stiffness: 150,
          mass: 1,
        });
        panY.value = withSpring(initialY, {
          damping: 15,
          stiffness: 150,
          mass: 1,
        });
      }, 16); // One frame delay (16ms) to ensure initial render completes
      return () => clearTimeout(timer);
    } else if (!hasStartPosition && !animationStartedRef.current) {
      // Only run normal entrance animation if we haven't started the button animation
      // Ensure minimum delay of 16ms (one frame) to allow component to mount and render
      const actualDelay = Math.max(entranceDelay, 16);
      const timer = setTimeout(() => {
        animationStartedRef.current = true; // Mark as started
        entranceProgress.value = withSpring(
          1,
          {
            damping: 12,
            stiffness: 150,
            mass: 0.8,
          },
          () => {
            // After growing completes, hold at full scale for 2.5 seconds
            // This callback runs when the spring animation finishes
          },
        );
      }, actualDelay);
      return () => clearTimeout(timer);
    }
    // If animation has started, don't reset anything even if start position is cleared
  }, [
    entranceDelay,
    hasStartPosition,
    propStartX,
    propStartY,
    initialX,
    initialY,
    panX,
    panY,
    opacity,
    scale,
    entranceProgress,
  ]);

  // Update position when initial values change (but not while dragging)
  React.useEffect(() => {
    if (!isDragging.value && !hasStartPosition) {
      // Animate smoothly to the new initial position
      panX.value = withSpring(initialX, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      panY.value = withSpring(initialY, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      startX.value = initialX;
      startY.value = initialY;
    }
  }, [
    initialX,
    initialY,
    panX,
    panY,
    startX,
    startY,
    isDragging,
    hasStartPosition,
  ]);

  // Update scale based on active state (shrink inactive moments)
  React.useEffect(() => {
    if (animationStartedRef.current) {
      scale.value = withSpring(isActive ? 1 : 0.4, {
        damping: 15,
        stiffness: 200,
      });
    }
  }, [isActive, scale]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // If there's significant movement, it's a drag, not text selection
          return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: (evt) => {
          isDragging.value = true;
          startX.value = panX.value;
          startY.value = panY.value;
        },
        onPanResponderMove: (evt, gestureState) => {
          const newX = startX.value + gestureState.dx;
          const newY = startY.value + gestureState.dy;

          // Clamp to viewport bounds
          const padding = 20;
          const minX = padding + hitAreaWidth / 2;
          const maxX = SCREEN_WIDTH - padding - hitAreaWidth / 2;
          const minY = padding + hitAreaHeight / 2;
          const maxY = SCREEN_HEIGHT - padding - hitAreaHeight / 2;

          panX.value = Math.max(minX, Math.min(maxX, newX));
          panY.value = Math.max(minY, Math.min(maxY, newY));
        },
        onPanResponderRelease: (evt, gestureState) => {
          isDragging.value = false;

          // Check if this was a tap (minimal movement)
          const isTap =
            Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;

          if (isTap && onPress) {
            // Call onPress for tap gestures
            onPress();
          } else {
            // Handle drag release
            const newX = startX.value + gestureState.dx;
            const newY = startY.value + gestureState.dy;

            // Clamp to viewport bounds
            const padding = 20;
            const minX = padding + hitAreaWidth / 2;
            const maxX = SCREEN_WIDTH - padding - hitAreaWidth / 2;
            const minY = padding + hitAreaHeight / 2;
            const maxY = SCREEN_HEIGHT - padding - hitAreaHeight / 2;

            const finalX = Math.max(minX, Math.min(maxX, newX));
            const finalY = Math.max(minY, Math.min(maxY, newY));

            // Update position
            panX.value = finalX;
            panY.value = finalY;
            startX.value = finalX;
            startY.value = finalY;

            // Notify parent of position change
            onPositionChange?.(finalX, finalY);
          }
        },
        onPanResponderTerminationRequest: () => false, // Don't allow other responders to take over
      }),
    [
      hitAreaWidth,
      hitAreaHeight,
      panX,
      panY,
      startX,
      startY,
      isDragging,
      onPositionChange,
      onPress,
    ],
  );

  const baseStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value - hitAreaWidth / 2 },
      { translateY: panY.value - hitAreaHeight / 2 },
      {
        scale: hasStartPosition
          ? scale.value
          : 0.3 + entranceProgress.value * 0.7, // Scale from 0.3 to 1
      },
    ],
    opacity: hasStartPosition ? opacity.value : entranceProgress.value,
  }));

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: hitAreaWidth,
          height: hitAreaHeight,
          zIndex,
          overflow: "hidden", // Clip to exact size - no overflow
          padding: 0, // No padding
          margin: 0, // No margin
        },
        baseStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
});

/** Minimum memories on the entity to open entity wheel of life (see docs/entity-wheel-individual-view/README.md). */
export const ENTITY_WHEEL_MIN_MEMORIES = 3;
/** Minimum total moments (lessons + sunny + cloudy) summed across all memories. */
export const ENTITY_WHEEL_MIN_TOTAL_MOMENTS = 9;
/** Focused-home sunny vs cloudy banner: congratulate when sunny÷(sunny+cloudy) is at least this. */
export const SUNNY_VS_CLOUDY_HINT_CONGRATS_MIN_PERCENT = 64;
/** Below that sunny share but with at least this many sunny moments, show tap-the-sun copy instead. */
export const SUNNY_VS_CLOUDY_HINT_MIN_SUNNY_COUNT = 20;

/** Entity wheel of life: `ENTITY_WHEEL_MIN_MEMORIES` memories and `ENTITY_WHEEL_MIN_TOTAL_MOMENTS` moments total. */
function canEnterEntityWheelOfLife(
  memories: {
    hardTruths?: unknown[];
    goodFacts?: unknown[];
    lessonsLearned?: unknown[];
  }[],
): boolean {
  if (memories.length < ENTITY_WHEEL_MIN_MEMORIES) return false;
  let total = 0;
  for (const m of memories) {
    total +=
      (m.hardTruths?.length ?? 0) +
      (m.goodFacts?.length ?? 0) +
      (m.lessonsLearned?.length ?? 0);
  }
  return total >= ENTITY_WHEEL_MIN_TOTAL_MOMENTS;
}

// Floating Avatar Component
const FloatingAvatar = React.memo(
  function FloatingAvatar({
    profile,
    position,
    memories,
    onPress,
    colors,
    colorScheme,
    isFocused,
    focusedMemory,
    memorySlideOffset,
    onMemoryFocus,
    yearSection,
    onPositionChange,
    enableDragging = false,
    externalPositionX,
    externalPositionY,
    onEntityWheelChange,
    orbitDurationMs = 60000,
    onShowAIConsentModal,
    isScreenActive = true,
  }: {
    profile: any;
    position: { x: number; y: number };
    memories: any[];
    onPress: () => void;
    colors: any;
    colorScheme: "light" | "dark";
    isFocused: boolean;
    focusedMemory?: {
      profileId?: string;
      jobId?: string;
      familyMemberId?: string;
      friendId?: string;
      hobbyId?: string;
      memoryId: string;
      sphere: LifeSphere;
      momentToShowId?: string;
    } | null;
    memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
    onMemoryFocus?: (
      entityId: string,
      memoryId: string,
      sphere?: LifeSphere,
      momentId?: string,
    ) => void;
    yearSection?: {
      year: number | string;
      top: number;
      bottom: number;
      height: number;
    };
    onPositionChange?: (x: number, y: number) => void;
    enableDragging?: boolean;
    externalPositionX?: ReturnType<typeof useSharedValue<number>>;
    externalPositionY?: ReturnType<typeof useSharedValue<number>>;
    onEntityWheelChange?: (isActive: boolean) => void;
    orbitDurationMs?: number;
    onShowAIConsentModal?: () => void;
    isScreenActive?: boolean;
  }) {
    /** Latest prop for AppState foreground resync (parent may update one frame after native active). */
    const isScreenActivePropRef = useRef(isScreenActive);
    isScreenActivePropRef.current = isScreenActive;

    const { showLoader: startTransitionLoader } = useHomeTransitionLoader() ?? {
      showLoader: () => {},
    };
    const { momentColors } = useMomentColors();
    const aiConsent = useAIInsightsConsent();
    const { hasAIEntitlement } = useSubscription();
    const { appUsabilityHints } = useVisualSettings();
    const t = useTranslate();
    const { language } = useLanguage();
    const lang = language === "bg" ? "bg" : "en";

    const { isTablet, isLargeDevice } = useLargeDevice();

    const insets = useSafeAreaInsets();
    const fontScale = useFontScale();
    const examModalPalette = wheelExamModalPalette(colorScheme);
    const [shareModalVisible, setShareModalVisible] = React.useState(false);
    const [shareModalContent, setShareModalContent] = React.useState({
      title: "",
      message: "",
    });
    const [showShareMenu, setShowShareMenu] = React.useState(false);
    const [isCapturingImage] = React.useState(false);
    const [captureTransform] = React.useState({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
    const [captureWrapperBounds] = React.useState({
      left: 0,
      top: 0,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    });
    const [imagePreviewUri, setImagePreviewUri] = React.useState<string | null>(
      null,
    );
    const entityWheelModeEnabled = false;
    const entityAvatarPressHintEnabled = false;
    const [showGifAnimation, setShowGifAnimation] = React.useState(false);
    const [showEntityWheel, setShowEntityWheel] = React.useState(false);
    const [selectedWheelMoment, setSelectedWheelMoment] = React.useState<{
      type: "lesson" | "sunny" | "cloudy";
      text: string;
      memoryId: string;
      momentId?: string;
      memoryImageUri?: string;
    } | null>(null);
    const [selectedWheelExam, setSelectedWheelExam] = React.useState<{
      question: string;
      step: "question" | "analyzing" | "result";
      analysis?: { isCorrect: boolean; feedback: string };
      userAnswer?: string;
    } | null>(null);
    const [showWheelFireworks, setShowWheelFireworks] = React.useState(false);
    const [entityWheelSpinLabelDismissed, setEntityWheelSpinLabelDismissed] =
      React.useState(false);
    /** Only reset spin-hint when the wheel opens (false→true), not on tab/bg resume (avoids waiting_spin_hint blocking bubbles). */
    const spinHintWheelPrevOpenRef = useRef(showEntityWheel);
    const [avatarClickHintDismissed, setAvatarClickHintDismissed] =
      React.useState(false);
    const [examAnswerInput, setExamAnswerInput] = React.useState("");
    const entityExamAnswerInputRef = React.useRef("");
    (entityExamAnswerInputRef as React.MutableRefObject<string>).current =
      examAnswerInput;
    const [entityWheelExamTriesRemaining, setEntityWheelExamTriesRemaining] =
      React.useState<number | null>(null);
    const [selectedMomentType, setSelectedMomentType] = React.useState<
      "lesson" | "sunny" | "cloudy"
    >("lesson");
    const [isWheelSpinningState, setIsWheelSpinningState] =
      React.useState(false);
    const [entityWheelGateToastVisible, setEntityWheelGateToastVisible] =
      React.useState(false);
    const entityWheelGateToastTimerRef = useRef<ReturnType<
      typeof setTimeout
    > | null>(null);
    const showEntityWheelGateToast = useCallback(() => {
      if (entityWheelGateToastTimerRef.current) {
        clearTimeout(entityWheelGateToastTimerRef.current);
      }
      setEntityWheelGateToastVisible(true);
      entityWheelGateToastTimerRef.current = setTimeout(() => {
        setEntityWheelGateToastVisible(false);
        entityWheelGateToastTimerRef.current = null;
      }, 5000);
    }, []);
    const triggerNoMomentsHaptic = useCallback(() => {
      if (Platform.OS === "ios" && Device.isDevice) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {},
        );
      }
    }, []);
    const dismissEntityWheelGateToast = useCallback(() => {
      if (entityWheelGateToastTimerRef.current) {
        clearTimeout(entityWheelGateToastTimerRef.current);
        entityWheelGateToastTimerRef.current = null;
      }
      setEntityWheelGateToastVisible(false);
    }, []);
    React.useEffect(() => {
      return () => {
        if (entityWheelGateToastTimerRef.current) {
          clearTimeout(entityWheelGateToastTimerRef.current);
        }
      };
    }, []);

    // State for floating moments that grow from memories in entity wheel
    const [floatingMoments, setFloatingMoments] = React.useState<
      {
        id: number;
        memoryId: string;
        memoryIndex: number;
        momentIndex: number;
        momentType: "lesson" | "sunny" | "cloudy";
        text: string;
        memoryImageUri?: string;
        memoryOffsetX: number;
        memoryOffsetY: number;
        memoryBaseAngle: number;
        spawnSlot: number; // Stable slot for layout (avoids blink when totalConcurrent drops)
        batchSize: number;
        cycleId: number; // Rotate positions each restart so they're not always the same
        angleJitter: number; // Random offset within slot arc for non-overlapping random positions
        spawnTime: number; // When moment spawned - for resume timing when collapsed
        entityId: string;
        sphere: LifeSphere;
      }[]
    >([]);
    const [expandedMomentId, setExpandedMomentId] = React.useState<
      number | null
    >(null);
    const expandedMomentIdRef = useRef<number | null>(null);
    expandedMomentIdRef.current = expandedMomentId;
    const expandedAtTimestampRef = useRef<number | null>(null);
    const momentIdCounter = useRef(0);
    // When user taps a floating moment in entity wheel, show card instead of expanding bubble
    const [entityWheelMomentCard, setEntityWheelMomentCard] = React.useState<{
      type: "lesson" | "sunny" | "cloudy";
      text: string;
      memoryId: string;
      memoryImageUri?: string;
      entityId: string;
      sphere: LifeSphere;
    } | null>(null);
    const floatingMomentsTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>(
      [],
    );
    const nextMomentIndexRef = useRef<number>(0);
    const isSpawningNextRef = useRef<boolean>(false);
    const cycleIdRef = useRef<number>(0);
    const restartScheduledRef = useRef<boolean>(false);
    const remainingBeforeRestartRef = useRef<number>(0);
    const currentBatchSizeRef = useRef<number>(3);
    const nextSlotRef = useRef<number>(0);

    // Create refs
    const viewShotRef = useRef<View>(null);
    const showEntityWheelRef = useRef(showEntityWheel);
    React.useEffect(() => {
      showEntityWheelRef.current = showEntityWheel;
    }, [showEntityWheel]);

    // Prevent double fire of entity wheel release (same as main wheel) so we don't consume free spin then show paywall
    const entityWheelReleaseInProgressRef = useRef(false);
    // Track previous showEntityWheel state to detect transitions
    const previousShowEntityWheel = useRef(showEntityWheel);

    // Wheel mode animation values
    const wheelModeProgress = useSharedValue(0);
    const wheelSpinRotation = useSharedValue(0); // Orbit angle offset - all memories orbit with this offset
    const wheelVelocity = useSharedValue(0);
    const isWheelSpinning = useSharedValue(false);

    // Star center position - tracks the actual visual position of the avatar
    const starCenterX = useSharedValue(SCREEN_WIDTH / 2);
    const starCenterY = useSharedValue(SCREEN_HEIGHT / 2);

    // Popup animation values
    const popupAnimProgress = useSharedValue(0);
    const popupScale = useSharedValue(0.3);
    const popupOpacity = useSharedValue(0);
    const popupPressScale = useSharedValue(1); // Press animation for entity wheel popup
    const orbitAngle = useSharedValue(0); // Continuous orbit angle for automatic rotation
    const showEntityWheelShared = useSharedValue(false); // Shared value for worklet reactivity
    const isScreenActiveShared = useSharedValue(isScreenActive);
    const entityCelebrationSparksVisible = useSharedValue(false); // Spiraling sparks on correct exam answer

    // Entity wheel moment type selector animation values (matching main wheel)
    const entityLessonButtonPressScale = useSharedValue(1);
    const entitySunnyButtonPressScale = useSharedValue(1);
    const entityCloudyButtonPressScale = useSharedValue(1);
    const entityExamSubmitPressScale = useSharedValue(1);
    const entityExamInputPulseScale = useSharedValue(1);
    const entityLessonButtonSelection = useSharedValue(1); // Start with lesson selected
    const entitySunnyButtonSelection = useSharedValue(0);
    const entityCloudyButtonSelection = useSharedValue(0);
    const entityLessonButtonHighlight = useSharedValue(0);
    const entitySunnyButtonHighlight = useSharedValue(0);
    const entityCloudyButtonHighlight = useSharedValue(0);
    const entitySpinHintArcProgress = useSharedValue(0);
    const entitySpinHintPointerOpacity = useSharedValue(0);
    const entityHintRotation = useSharedValue(0); // Wiggle when spin hint is shown
    const avatarClickHintOpacity = useSharedValue(0);
    const avatarClickHintScale = useSharedValue(1);
    /** Pulse a random memory when user taps avatar but entity wheel is gated off */
    const nudgeTargetIndex = useSharedValue(-1);
    const nudgePulseScale = useSharedValue(1);
    const wheelMomentHintPointerOpacity = useSharedValue(0);
    const wheelMomentHintPointerBounce = useSharedValue(0);
    const wheelMomentAppearCountRef = React.useRef(0);
    const [wheelMomentAppearCount, setWheelMomentAppearCount] =
      React.useState(0);
    const [wheelMomentHintDismissed, setWheelMomentHintDismissed] =
      React.useState(false);

    // Avatar pulse animation for indicating clickability when entering focused view
    const avatarPulseScale = useSharedValue(1);

    const baseAvatarSize = isTablet ? 120 : 100; // 50% larger on tablets, increased from 80 to 100
    const focusedAvatarSize = isTablet ? 150 : 120; // 50% larger on tablets, increased from 100 to 120
    const avatarSize = isFocused ? focusedAvatarSize : baseAvatarSize;

    // Compute usable viewport area (between header and tab bar) — used for centering + clamping
    const iPadHeaderScaleEarly = Platform.OS === "ios" && Platform.isPad ? 1.3 : 1;
    const headerBackSizeEarly = (isTablet ? 70 : 50) * iPadHeaderScaleEarly;
    const usableTopEarly = 70 + headerBackSizeEarly + 8;
    const tabBarHEarly = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
    const aiOverhangEarly = Math.round(56 * fontScale) / 2;
    const usableBottomEarly = SCREEN_HEIGHT - tabBarHEarly - aiOverhangEarly;
    const focusedCenterX = SCREEN_WIDTH / 2;
    const focusedCenterY = (usableTopEarly + usableBottomEarly) / 2;

    // Memory radius - when focused, ensure all floating elements fit within usable viewport
    // Use actual distances from focused center to usable edges
    const distToUsableTop = focusedCenterY - usableTopEarly;
    const distToUsableBottom = usableBottomEarly - focusedCenterY;
    const distToUsableLeft = focusedCenterX;
    const distToUsableRight = SCREEN_WIDTH - focusedCenterX;
    const maxDistanceFromCenter = isFocused
      ? Math.min(distToUsableTop, distToUsableBottom, distToUsableLeft, distToUsableRight)
      : Math.min(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    const estimatedMaxMemorySize = isTablet ? 68 : 45; // Maximum memory size when focused (50% larger on tablets)
    const estimatedMaxMomentRadius = isTablet ? 60 : 40; // Maximum radius of moments around memory (50% larger on tablets)
    const estimatedMaxMomentSize = isTablet ? 18 : 12; // Maximum moment size (50% larger on tablets)
    const safetyPadding = isTablet ? 38 : 25; // Safety padding from viewport edges (50% larger on tablets)
    const maxAllowedRadius =
      maxDistanceFromCenter -
      estimatedMaxMemorySize / 2 -
      estimatedMaxMomentRadius -
      estimatedMaxMomentSize / 2 -
      safetyPadding;
    // On tablets, increase memory radius when focused to position memories further from avatar
    // Use larger base radius on tablets to start with more spacing
    const baseMemoryRadius = isFocused
      ? isTablet
        ? Math.max(120, Math.min(160, maxAllowedRadius))
        : Math.max(60, Math.min(90, maxAllowedRadius)) // Reduced for phones when focused
      : isTablet
        ? 90
        : 60; // Base radius for floating memories around spheres (reverted to original)
    // On tablets, position memories much further from avatar when focused (3x distance for better spacing)
    const memoryRadius =
      isTablet && isFocused ? baseMemoryRadius * 3 : baseMemoryRadius;

    // Calculate sunny moments percentage for progress bar and moment counts
    const { sunnyPercentage, momentCounts, totalMoments } = useMemo(() => {
      let totalClouds = 0;
      let totalSuns = 0;
      let totalLessons = 0;

      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
        totalLessons += (memory.lessonsLearned || []).length;
      });

      const total = totalClouds + totalSuns + totalLessons;
      const percentage =
        total === 0 ? 0 : ((totalSuns + totalLessons) / total) * 100;

      return {
        sunnyPercentage: percentage,
        totalMoments: total,
        momentCounts: {
          lesson: totalLessons,
          sunny: totalSuns,
          cloudy: totalClouds,
        },
      };
    }, [memories]);

    const canEnterEntityWheel = useMemo(
      () => canEnterEntityWheelOfLife(memories),
      [memories],
    );

    React.useEffect(() => {
      if (!entityWheelModeEnabled && showEntityWheel) {
        setShowEntityWheel(false);
      }
    }, [entityWheelModeEnabled, showEntityWheel]);

    React.useEffect(() => {
      if (!isFocused || canEnterEntityWheel || showEntityWheel) {
        dismissEntityWheelGateToast();
      }
    }, [isFocused, canEnterEntityWheel, showEntityWheel, dismissEntityWheelGateToast]);

    /** Which memory the usability finger points at when wheel mode is gated off */
    const usabilityHintMemoryIndex = useMemo(() => {
      if (memories.length === 0) return 0;
      let h = 0;
      const id = String(profile?.id ?? "");
      for (let i = 0; i < id.length; i++) {
        h = (h + id.charCodeAt(i)) % memories.length;
      }
      return h;
    }, [memories.length, profile?.id]);

    // Calculate memory positions based on current animated position
    const memoryPositions = useMemo(() => {
      // Calculate max moments count to normalize distances
      const maxMomentsCount = Math.max(
        ...memories.map(
          (m) =>
            (m.hardTruths || []).length +
            (m.goodFacts || []).length +
            (m.lessonsLearned || []).length,
        ),
        1,
      );
      const minMomentsCount = Math.min(
        ...memories.map(
          (m) =>
            (m.hardTruths || []).length +
            (m.goodFacts || []).length +
            (m.lessonsLearned || []).length,
        ),
        0,
      );

      // Pre-calculate all angles to identify the top 2 elements (only if more than 5 elements)
      const topTwoIndices =
        isFocused && memories.length > 5
          ? (() => {
              const topAngle = -Math.PI / 2; // Top position
              const allAngles = memories.map((_, idx) => {
                const baseAngle = (idx * 2 * Math.PI) / memories.length;
                const seed = idx * 0.618;
                const angleVar = Math.cos(seed * 2) * 0.15;
                return baseAngle + angleVar;
              });

              // Find distances from top angle for all elements
              const distancesFromTop = allAngles.map((angle) => {
                const diff = Math.abs(angle - topAngle);
                return Math.min(diff, 2 * Math.PI - diff);
              });

              // Sort by distance and get the indices of the top 2 closest elements
              return distancesFromTop
                .map((dist, idx) => ({ dist, idx }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 2)
                .map((item) => item.idx);
            })()
          : [];

      // Calculate maximum safe radius based on avatar position and viewport boundaries
      // Memory size: account for tablets (68px focused, 45px unfocused on tablets; 45px focused, 30px unfocused on phones)
      const memorySize = isFocused ? (isTablet ? 68 : 45) : isTablet ? 45 : 30;
      const memoryRadiusSize = memorySize / 2; // Half the memory size
      const safetyPadding = isTablet ? 38 : 10; // Larger padding on tablets to match the increased sizes

      // Calculate distances from avatar center to each viewport edge
      // When focused, use the actual focused center position (usable area center)
      const refX = isFocused ? focusedCenterX : position.x;
      const refY = isFocused ? focusedCenterY : position.y;
      const distanceToTop = isFocused ? refY - usableTopEarly : refY;
      const distanceToBottom = isFocused ? usableBottomEarly - refY : SCREEN_HEIGHT - refY;
      const distanceToLeft = refX;
      const distanceToRight = SCREEN_WIDTH - refX;

      // Maximum safe radius is the minimum distance to any edge, minus memory radius and padding
      // Calculate minimum required radius: avatar radius + memory radius + padding to ensure memories float around avatar
      const avatarRadius = avatarSize / 2;
      const memoryRadiusForSpacing = memoryRadiusSize; // Half the memory size
      // Increase spacing padding when focused to ensure memories are clearly separated from avatar
      // When there are more than 5 memories, push them further out
      const baseSpacingPadding = isFocused ? 30 : 20; // More padding when focused (30px) vs unfocused (20px)
      const extraSpacingForManyMemories =
        isFocused && memories.length > 5 ? 25 : 0; // Extra spacing when more than 5 memories (increased from 15 to 25)
      const spacingPadding = baseSpacingPadding + extraSpacingForManyMemories;
      const minRequiredRadius =
        avatarRadius + memoryRadiusForSpacing + spacingPadding; // Ensure memories are clearly outside avatar

      const maxSafeRadius = Math.max(
        minRequiredRadius,
        Math.min(
          distanceToTop,
          distanceToBottom,
          distanceToLeft,
          distanceToRight,
        ) -
          memoryRadiusSize -
          safetyPadding,
      );

      return memories.map((memory, memIndex) => {
        // Calculate moment count for this memory
        const momentCount =
          (memory.hardTruths || []).length +
          (memory.goodFacts || []).length +
          (memory.lessonsLearned || []).length;

        // Calculate distance multiplier based on moments (more moments = further)
        let momentsDistanceMultiplier = 1.0;
        if (maxMomentsCount > minMomentsCount) {
          // Normalize to 0-1 range based on min/max
          const momentsFactor =
            (momentCount - minMomentsCount) /
            (maxMomentsCount - minMomentsCount);
          // Scale from 0.7x (fewest moments) to 1.8x (most moments) for clear distance difference
          momentsDistanceMultiplier = 0.7 + momentsFactor * 1.1; // Range: 0.7 to 1.8
        }

        // Add unique variation for each memory to ensure different distances
        // Use a deterministic seed based on memory index for consistency
        const variationSeed = memIndex * 0.618; // Golden ratio for better distribution
        // Add ±10% variation to ensure each memory has a unique distance
        const distanceVariation = 0.9 + Math.sin(variationSeed) * 0.2; // Range: 0.9 to 1.1

        // Combine moment-based distance with unique variation
        let variedRadius =
          memoryRadius * momentsDistanceMultiplier * distanceVariation;

        // Adjust radius based on number of floating elements
        if (memories.length < 5) {
          // When there are less than 5 elements, position them CLOSER to avatar
          // to ensure they stay fully visible in viewport
          if (memories.length === 1) {
            // For single memory, keep it much closer to ensure it's fully visible
            const closerMultiplier = isFocused ? 0.5 : 0.6; // Much closer to ensure visibility
            variedRadius = variedRadius * closerMultiplier;
          } else if (memories.length === 2) {
            // For 2 memories, position them closer to keep them in viewport
            const closerMultiplier = isFocused ? 0.6 : 0.7; // Closer when focused
            variedRadius = variedRadius * closerMultiplier;
          } else {
            // For 3-4 memories, position them closer
            const closerMultiplier = isFocused ? 0.7 : 0.8; // Closer to keep in viewport
            variedRadius = variedRadius * closerMultiplier;
          }
        } else if (
          isFocused &&
          memories.length > 5 &&
          topTwoIndices.includes(memIndex)
        ) {
          // When focused and there are more than 5 elements, push top 2 elements further away
          const additionalRadius = 75; // Increased additional distance for top 2 elements (from 60 to 75)
          variedRadius = variedRadius + additionalRadius;
        } else if (isFocused && memories.length > 5) {
          // For all other memories when there are more than 5, push them further out too
          const additionalRadius = 30; // Additional distance for other memories (increased from 20 to 30)
          variedRadius = variedRadius + additionalRadius;
        }

        // CRITICAL: Ensure memory stays fully within viewport
        // Calculate the actual position this memory would be at
        const angle = (memIndex * 2 * Math.PI) / memories.length;
        const angleVariation = Math.cos(variationSeed * 2) * 0.15; // ±15% angle variation
        const variedAngle = angle + angleVariation;

        // CRITICAL: Calculate maximum safe radius for this specific angle
        // We need to ensure the memory circle (center + radius) stays fully within viewport
        const cosAngle = Math.cos(variedAngle);
        const sinAngle = Math.sin(variedAngle);

        // Calculate maximum radius based on horizontal constraint (X direction)
        let maxRadiusX: number;
        if (cosAngle > 0) {
          // Moving right - limited by right edge
          maxRadiusX =
            (distanceToRight - memoryRadiusSize - safetyPadding) /
            Math.abs(cosAngle);
        } else if (cosAngle < 0) {
          // Moving left - limited by left edge
          maxRadiusX =
            (distanceToLeft - memoryRadiusSize - safetyPadding) /
            Math.abs(cosAngle);
        } else {
          // cosAngle === 0, moving vertically only
          maxRadiusX = Infinity;
        }

        // Calculate maximum radius based on vertical constraint (Y direction)
        let maxRadiusY: number;
        if (sinAngle > 0) {
          // Moving down - limited by bottom edge
          maxRadiusY =
            (distanceToBottom - memoryRadiusSize - safetyPadding) /
            Math.abs(sinAngle);
        } else if (sinAngle < 0) {
          // Moving up - limited by top edge
          maxRadiusY =
            (distanceToTop - memoryRadiusSize - safetyPadding) /
            Math.abs(sinAngle);
        } else {
          // sinAngle === 0, moving horizontally only
          maxRadiusY = Infinity;
        }

        // The maximum safe radius is the minimum of both constraints
        // Use the same minimum radius calculation to ensure memories float around avatar
        const maxRadiusInDirection = Math.max(
          minRequiredRadius,
          Math.min(maxRadiusX, maxRadiusY, maxSafeRadius),
        );

        // Clamp variedRadius to ensure memory stays fully visible, but never go below minimum
        // This ensures memories are always positioned outside the avatar, floating around it
        variedRadius = Math.max(
          minRequiredRadius,
          Math.min(variedRadius, maxRadiusInDirection),
        );

        const offsetX = variedRadius * cosAngle;
        const offsetY = variedRadius * sinAngle;

        // Position-based size: below avatar = full, left/right = bit smaller, above = smallest
        // Angle π/2 = bottom, 0/π = sides, -π/2 (3π/2) = top
        const towardBottom = (1 + Math.cos(variedAngle - Math.PI / 2)) / 2;
        const sizeMultiplier = 0.65 + 0.35 * towardBottom;

        return {
          angle: variedAngle,
          offsetX: offsetX,
          offsetY: offsetY,
          sizeMultiplier,
        };
      });
    }, [
      memories,
      memoryRadius,
      isFocused,
      isTablet,
      position,
      profile.id,
      profile.name,
      avatarSize,
      focusedCenterX,
      focusedCenterY,
      usableTopEarly,
      usableBottomEarly,
    ]);

    // Calculate SVG circle parameters for progress bar
    const borderWidth = 6; // Increased from 4 to 6 for thicker border
    const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
      circumference - (sunnyPercentage / 100) * circumference;

    // Double tap detection
    const initials = profile.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const floatAnimation = useSharedValue(0);
    // Clamp position to ensure avatar is entirely visible in viewport (only for draggable entities)
    // Non-draggable entities (profiles, jobs) are positioned in year sections and should not be clamped to visible area
    const padding = avatarSize / 2;
    let clampedPositionX = position.x;
    let clampedPositionY = position.y;

    if (enableDragging) {
      // Only clamp draggable entities to visible area bounds (accounting for safe area insets and tab bar)
      const tabBarHeight =
        Math.round(78 * fontScale) +
        Math.max(12, insets.bottom + 12 - 20 * fontScale);
      const visibleAreaTop = insets.top;
      const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area
      clampedPositionX = Math.max(
        padding,
        Math.min(SCREEN_WIDTH - padding, position.x),
      );
      clampedPositionY = Math.max(
        visibleAreaTop + padding,
        Math.min(visibleAreaBottom - padding, position.y),
      );
    } else {
      // For non-draggable entities, only ensure they're not outside screen bounds (basic safety check)
      // The position should already be validated within year section bounds
      clampedPositionX = Math.max(
        padding,
        Math.min(SCREEN_WIDTH - padding, position.x),
      );
      clampedPositionY = Math.max(
        padding,
        Math.min(SCREEN_HEIGHT - padding, position.y),
      );
    }

    // Shared values for focused position (used by memories) - declared early to avoid hoisting issues
    const focusedX = useSharedValue(clampedPositionX);
    const focusedY = useSharedValue(clampedPositionY);

    const panX = useSharedValue(clampedPositionX);
    const panY = useSharedValue(clampedPositionY);
    const isDragging = useSharedValue(false);
    const dragStartX = useSharedValue(clampedPositionX);
    const dragStartY = useSharedValue(clampedPositionY);
    const dragStartedRef = useRef(false); // Track if a drag gesture started
    const dragHandlePulse = useSharedValue(0); // Animation for drag handle pulse

    // PanResponder for dragging when enabled
    const panResponder = React.useMemo(
      () =>
        enableDragging
          ? PanResponder.create({
              onStartShouldSetPanResponder: () => false, // Don't capture on start - let Pressable handle taps
              onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only capture if there's significant movement (more than 10px to avoid accidental drags)
                const hasMovement =
                  Math.abs(gestureState.dx) > 10 ||
                  Math.abs(gestureState.dy) > 10;
                if (hasMovement) {
                  dragStartedRef.current = true; // Mark that we started dragging
                }
                return hasMovement;
              },
              onPanResponderGrant: () => {
                dragStartedRef.current = true;
                isDragging.value = true;
                dragStartX.value = panX.value;
                dragStartY.value = panY.value;
              },
              onPanResponderMove: (evt, gestureState) => {
                if (!dragStartedRef.current) return;

                const newX = dragStartX.value + gestureState.dx;
                const newY = dragStartY.value + gestureState.dy;

                // Clamp to viewport bounds - ensure entire avatar stays visible (accounting for safe area insets and tab bar)
                // Container is positioned at (position.x - SCREEN_WIDTH, position.y - SCREEN_HEIGHT)
                // Avatar center is at (SCREEN_WIDTH, SCREEN_HEIGHT) within container
                // So avatar center on screen = container.left + SCREEN_WIDTH = position.x
                // We need avatarSize/2 padding on all sides to keep entire avatar visible
                const padding = avatarSize / 2;
                const tabBarHeight =
                  Math.round(78 * fontScale) +
                  Math.max(12, insets.bottom + 12 - 20 * fontScale);
                const visibleAreaTop = insets.top;
                const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area
                const minX = padding;
                const maxX = SCREEN_WIDTH - padding;
                const minY = visibleAreaTop + padding;
                const maxY = visibleAreaBottom - padding;

                const clampedX = Math.max(minX, Math.min(maxX, newX));
                const clampedY = Math.max(minY, Math.min(maxY, newY));

                panX.value = clampedX;
                panY.value = clampedY;

                // Update focusedX/Y for memory following (CRITICAL!)
                focusedX.value = clampedX;
                focusedY.value = clampedY;

                // Update external position shared values if provided (for SparkledDots tracking)
                if (externalPositionX) {
                  externalPositionX.value = clampedX;
                }
                if (externalPositionY) {
                  externalPositionY.value = clampedY;
                }
              },
              onPanResponderRelease: (evt, gestureState) => {
                const wasDragging = dragStartedRef.current;
                dragStartedRef.current = false;
                isDragging.value = false;

                if (wasDragging) {
                  const newX = dragStartX.value + gestureState.dx;
                  const newY = dragStartY.value + gestureState.dy;

                  // Clamp to viewport bounds - ensure entire avatar stays visible (accounting for safe area insets and tab bar)
                  const padding = avatarSize / 2;
                  const tabBarHeight =
                    Math.round(78 * fontScale) +
                    Math.max(12, insets.bottom + 12 - 20 * fontScale);
                  const visibleAreaTop = insets.top;
                  const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area
                  const minX = padding;
                  const maxX = SCREEN_WIDTH - padding;
                  const minY = visibleAreaTop + padding;
                  const maxY = visibleAreaBottom - padding;

                  const finalX = Math.max(minX, Math.min(maxX, newX));
                  const finalY = Math.max(minY, Math.min(maxY, newY));

                  panX.value = finalX;
                  panY.value = finalY;
                  dragStartX.value = finalX;
                  dragStartY.value = finalY;

                  // Update focusedX/Y for memory following (CRITICAL!)
                  focusedX.value = finalX;
                  focusedY.value = finalY;

                  // Update external position shared values if provided (for SparkledDots tracking)
                  if (externalPositionX) {
                    externalPositionX.value = finalX;
                  }
                  if (externalPositionY) {
                    externalPositionY.value = finalY;
                  }

                  // Notify parent of position change
                  onPositionChange?.(finalX, finalY);
                }
              },
              onPanResponderTerminate: () => {
                dragStartedRef.current = false;
                isDragging.value = false;
              },
              onPanResponderTerminationRequest: () => false,
            })
          : null,
      [
        enableDragging,
        isFocused,
        panX,
        panY,
        dragStartX,
        dragStartY,
        avatarSize,
        onPositionChange,
        externalPositionX,
        externalPositionY,
      ],
    );

    // Create individual animated values for each memory with different speeds
    // Create enough for up to 25 memories to support profiles with many memories
    // We create a fixed number upfront to ensure hooks are always called in same order
    const memoryPanX0 = useSharedValue(position.x);
    const memoryPanY0 = useSharedValue(position.y);
    const memoryPanX1 = useSharedValue(position.x);
    const memoryPanY1 = useSharedValue(position.y);
    const memoryPanX2 = useSharedValue(position.x);
    const memoryPanY2 = useSharedValue(position.y);
    const memoryPanX3 = useSharedValue(position.x);
    const memoryPanY3 = useSharedValue(position.y);
    const memoryPanX4 = useSharedValue(position.x);
    const memoryPanY4 = useSharedValue(position.y);
    const memoryPanX5 = useSharedValue(position.x);
    const memoryPanY5 = useSharedValue(position.y);
    const memoryPanX6 = useSharedValue(position.x);
    const memoryPanY6 = useSharedValue(position.y);
    const memoryPanX7 = useSharedValue(position.x);
    const memoryPanY7 = useSharedValue(position.y);
    const memoryPanX8 = useSharedValue(position.x);
    const memoryPanY8 = useSharedValue(position.y);
    const memoryPanX9 = useSharedValue(position.x);
    const memoryPanY9 = useSharedValue(position.y);
    const memoryPanX10 = useSharedValue(position.x);
    const memoryPanY10 = useSharedValue(position.y);
    const memoryPanX11 = useSharedValue(position.x);
    const memoryPanY11 = useSharedValue(position.y);
    const memoryPanX12 = useSharedValue(position.x);
    const memoryPanY12 = useSharedValue(position.y);
    const memoryPanX13 = useSharedValue(position.x);
    const memoryPanY13 = useSharedValue(position.y);
    const memoryPanX14 = useSharedValue(position.x);
    const memoryPanY14 = useSharedValue(position.y);
    const memoryPanX15 = useSharedValue(position.x);
    const memoryPanY15 = useSharedValue(position.y);
    const memoryPanX16 = useSharedValue(position.x);
    const memoryPanY16 = useSharedValue(position.y);
    const memoryPanX17 = useSharedValue(position.x);
    const memoryPanY17 = useSharedValue(position.y);
    const memoryPanX18 = useSharedValue(position.x);
    const memoryPanY18 = useSharedValue(position.y);
    const memoryPanX19 = useSharedValue(position.x);
    const memoryPanY19 = useSharedValue(position.y);
    const memoryPanX20 = useSharedValue(position.x);
    const memoryPanY20 = useSharedValue(position.y);
    const memoryPanX21 = useSharedValue(position.x);
    const memoryPanY21 = useSharedValue(position.y);
    const memoryPanX22 = useSharedValue(position.x);
    const memoryPanY22 = useSharedValue(position.y);
    const memoryPanX23 = useSharedValue(position.x);
    const memoryPanY23 = useSharedValue(position.y);
    const memoryPanX24 = useSharedValue(position.x);
    const memoryPanY24 = useSharedValue(position.y);

    // Store all animated values and their spring parameters
    const memoryAnimatedValues = React.useMemo(() => {
      const panXValues = [
        memoryPanX0,
        memoryPanX1,
        memoryPanX2,
        memoryPanX3,
        memoryPanX4,
        memoryPanX5,
        memoryPanX6,
        memoryPanX7,
        memoryPanX8,
        memoryPanX9,
        memoryPanX10,
        memoryPanX11,
        memoryPanX12,
        memoryPanX13,
        memoryPanX14,
        memoryPanX15,
        memoryPanX16,
        memoryPanX17,
        memoryPanX18,
        memoryPanX19,
        memoryPanX20,
        memoryPanX21,
        memoryPanX22,
        memoryPanX23,
        memoryPanX24,
      ];
      const panYValues = [
        memoryPanY0,
        memoryPanY1,
        memoryPanY2,
        memoryPanY3,
        memoryPanY4,
        memoryPanY5,
        memoryPanY6,
        memoryPanY7,
        memoryPanY8,
        memoryPanY9,
        memoryPanY10,
        memoryPanY11,
        memoryPanY12,
        memoryPanY13,
        memoryPanY14,
        memoryPanY15,
        memoryPanY16,
        memoryPanY17,
        memoryPanY18,
        memoryPanY19,
        memoryPanY20,
        memoryPanY21,
        memoryPanY22,
        memoryPanY23,
        memoryPanY24,
      ];

      return panXValues.map((panX, index) => {
        // Vary spring parameters for different speeds - very dramatic variation
        // Faster memories: lower damping, higher stiffness
        // Slower memories: higher damping, lower stiffness
        // Use index directly for more variation instead of modulo
        const speedVariation = index / 24; // 0 to 1 across all memories
        // Very dramatic range for noticeable speed differences
        // Fastest: damping 6, stiffness 180 (very responsive)
        // Slowest: damping 30, stiffness 30 (very sluggish)
        const damping = 6 + speedVariation * 24; // Range: 6-30
        const stiffness = 30 + (1 - speedVariation) * 150; // Range: 30-180

        return {
          panX,
          panY: panYValues[index],
          damping,
          stiffness,
        };
      });
    }, [
      memoryPanX0,
      memoryPanX1,
      memoryPanX2,
      memoryPanX3,
      memoryPanX4,
      memoryPanX5,
      memoryPanX6,
      memoryPanX7,
      memoryPanX8,
      memoryPanX9,
      memoryPanX10,
      memoryPanX11,
      memoryPanX12,
      memoryPanX13,
      memoryPanX14,
      memoryPanX15,
      memoryPanX16,
      memoryPanX17,
      memoryPanX18,
      memoryPanX19,
      memoryPanX20,
      memoryPanX21,
      memoryPanX22,
      memoryPanX23,
      memoryPanX24,
      memoryPanY0,
      memoryPanY1,
      memoryPanY2,
      memoryPanY3,
      memoryPanY4,
      memoryPanY5,
      memoryPanY6,
      memoryPanY7,
      memoryPanY8,
      memoryPanY9,
      memoryPanY10,
      memoryPanY11,
      memoryPanY12,
      memoryPanY13,
      memoryPanY14,
      memoryPanY15,
      memoryPanY16,
      memoryPanY17,
      memoryPanY18,
      memoryPanY19,
      memoryPanY20,
      memoryPanY21,
      memoryPanY22,
      memoryPanY23,
      memoryPanY24,
    ]);

    // Update pan values when position prop changes (but not while dragging)
    // Also clamp position to ensure avatar stays within viewport (only for draggable entities)
    React.useEffect(() => {
      if (!isDragging.value) {
        const padding = avatarSize / 2;
        let clampedX = position.x;
        let clampedY = position.y;

        if (enableDragging) {
          // Only clamp draggable entities to visible area bounds (accounting for safe area insets and tab bar)
          const tabBarHeight =
            Math.round(78 * fontScale) +
            Math.max(12, insets.bottom + 12 - 20 * fontScale);
          const visibleAreaTop = insets.top;
          const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area
          clampedX = Math.max(
            padding,
            Math.min(SCREEN_WIDTH - padding, position.x),
          );
          clampedY = Math.max(
            visibleAreaTop + padding,
            Math.min(visibleAreaBottom - padding, position.y),
          );
        } else {
          // For non-draggable entities, only ensure they're not outside screen bounds (basic safety check)
          clampedX = Math.max(
            padding,
            Math.min(SCREEN_WIDTH - padding, position.x),
          );
          clampedY = Math.max(
            padding,
            Math.min(SCREEN_HEIGHT - padding, position.y),
          );
        }

        panX.value = clampedX;
        panY.value = clampedY;
        dragStartX.value = clampedX;
        dragStartY.value = clampedY;
        memoryAnimatedValues.forEach((mem) => {
          mem.panX.value = clampedX;
          mem.panY.value = clampedY;
        });

        // Update focusedX/Y to match clamped position
        focusedX.value = clampedX;
        focusedY.value = clampedY;

        // Notify parent if position was clamped (to persist corrected position)
        if (clampedX !== position.x || clampedY !== position.y) {
          onPositionChange?.(clampedX, clampedY);
        }
      }
    }, [
      position.x,
      position.y,
      panX,
      panY,
      dragStartX,
      dragStartY,
      memoryAnimatedValues,
      isDragging,
      avatarSize,
      focusedX,
      focusedY,
      onPositionChange,
      enableDragging,
      fontScale,
      insets.top,
      insets.bottom,
    ]);

    React.useEffect(() => {
      if (!isScreenActive) {
        cancelAnimation(floatAnimation);
        floatAnimation.value = 0;
        return;
      }

      if (!isFocused) {
        // Only float when not focused
        floatAnimation.value = withRepeat(
          withTiming(1, {
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true,
        );
        // Reset entity wheel when unfocused
        setShowEntityWheel(false);
        isWheelSpinning.value = false;
        wheelVelocity.value = 0;
        entityWheelReleaseInProgressRef.current = false;
        setIsWheelSpinningState(false);
      } else {
        // Stop floating when focused
        floatAnimation.value = 0;
      }

      return () => {
        // Cancel infinite float animation on cleanup
        cancelAnimation(floatAnimation);
      };
    }, [
      floatAnimation,
      isFocused,
      isWheelSpinning,
      wheelVelocity,
      isScreenActive,
    ]);

    // Pulse drag handle icon twice when dragging is enabled and avatar is not focused
    React.useEffect(() => {
      if (enableDragging && !isFocused) {
        // Pulse animation: scale from 1 -> 1.3 -> 1, repeat twice
        // Use withRepeat with 2 iterations to pulse twice
        dragHandlePulse.value = withRepeat(
          withTiming(1, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
          2, // Repeat twice (so it goes: 0->1->0->1->0)
          true, // Reverse animation
        );
      } else {
        dragHandlePulse.value = 0;
      }
    }, [enableDragging, isFocused, dragHandlePulse]);

    // Animated style for drag handle pulse
    const dragHandleAnimatedStyle = useAnimatedStyle(() => {
      // Pulse: scale from 1 to 1.3 and back to 1
      // dragHandlePulse.value goes from 0 to 1 and back to 0
      const scale = 1 + dragHandlePulse.value * 0.3;
      return {
        transform: [{ scale }],
      };
    });

    // Animate each memory to follow avatar with different speeds
    // Use a single reaction that handles all memories
    // Stable plain object (not useRef): worklets may capture the object; mutating ref.current
    // after that triggers Reanimated "Tried to modify key `current`" warnings.
    const memoryAnimatedValuesListHolder = React.useMemo(
      () => ({ list: memoryAnimatedValues }),
      [],
    );
    React.useEffect(() => {
      memoryAnimatedValuesListHolder.list = memoryAnimatedValues;
    }, [memoryAnimatedValues, memoryAnimatedValuesListHolder]);

    useAnimatedReaction(
      () => ({
        avatarX: panX.value,
        avatarY: panY.value,
      }),
      (current: { avatarX: number; avatarY: number }) => {
        "worklet";
        // Update each memory's position with its own spring parameters
        // The dramatic variation in damping/stiffness will create visible speed differences
        const values = memoryAnimatedValuesListHolder.list;
        for (let i = 0; i < values.length; i++) {
          const mem = values[i];
          if (mem) {
            // Each memory uses its own spring parameters for different speeds
            // Fast memories (low damping, high stiffness) will catch up quickly
            // Slow memories (high damping, low stiffness) will lag behind noticeably
            mem.panX.value = withSpring(current.avatarX, {
              damping: mem.damping,
              stiffness: mem.stiffness,
            });
            mem.panY.value = withSpring(current.avatarY, {
              damping: mem.damping,
              stiffness: mem.stiffness,
            });
          }
        }
      },
    );

    // Animated style for container position - uses panX/panY to stay in sync with drag
    // Also clamp to ensure avatar stays fully visible (only for draggable entities)
    const avatarSizeForClamp = avatarSize; // Capture for worklet
    const enableDraggingForClamp = enableDragging; // Capture for worklet
    const visibleAreaTopForClamp = insets.top; // Capture for worklet
    const tabBarHeightForClamp =
      Math.round(78 * fontScale) +
      Math.max(12, insets.bottom + 12 - 20 * fontScale); // Capture for worklet
    const visibleAreaBottomForClamp = SCREEN_HEIGHT - tabBarHeightForClamp; // Capture for worklet
    const containerAnimatedStyle = useAnimatedStyle(() => {
      "worklet";
      // Ensure panX/panY are within bounds (double-check in case they weren't clamped)
      const padding = avatarSizeForClamp / 2;
      const clampedX = Math.max(
        padding,
        Math.min(SCREEN_WIDTH - padding, panX.value),
      );
      let clampedY: number;

      if (enableDraggingForClamp) {
        // Only clamp draggable entities to visible area bounds
        clampedY = Math.max(
          visibleAreaTopForClamp + padding,
          Math.min(visibleAreaBottomForClamp - padding, panY.value),
        );
      } else {
        // For non-draggable entities, only ensure they're not outside screen bounds
        clampedY = Math.max(
          padding,
          Math.min(SCREEN_HEIGHT - padding, panY.value),
        );
      }
      return {
        left: clampedX - SCREEN_WIDTH,
        top: clampedY - SCREEN_HEIGHT,
      };
    });

    // Zoom animation for focused state - smooth zoom-in/zoom-out effect
    // Calculate the scale factor: focused size (100px) / base size (80px) = 1.25
    const baseScale = 1;
    const focusedScale = focusedAvatarSize / baseAvatarSize; // 100/80 = 1.25

    // Always start from unfocused state to ensure smooth animation
    const zoomScale = useSharedValue(baseScale);
    const zoomProgress = useSharedValue(0);

    // Store the starting position when focusing begins (State A position)
    // Use clamped position to ensure avatar is visible
    const startX = useSharedValue(clampedPositionX);
    const startY = useSharedValue(clampedPositionY);

    // Target position for focused state (State B - centered in usable viewport between header and tab bar)
    const normalTargetY = focusedCenterY;
    const wheelTargetY = SCREEN_HEIGHT / 2 - 120; // Higher position for wheel mode
    const targetX = focusedCenterX;
    const targetY = normalTargetY;

    // Update star center to match avatar's actual visual position
    // Must use targetX/targetY (same as animatedStyle) - NOT focusedX/focusedY.
    // When in wheel mode we set focusedY=wheelTargetY but the avatar stays at targetY (normalTargetY),
    // so using focusedX/focusedY would misplace sparks above the avatar.
    useAnimatedReaction(
      () => {
        if (isFocused) {
          // Same formula as avatar's animatedStyle - interpolate toward targetX/targetY
          const currentX =
            startX.value + (targetX - startX.value) * zoomProgress.value;
          const currentY =
            startY.value + (targetY - startY.value) * zoomProgress.value;
          return { x: currentX, y: currentY };
        }
        return { x: position.x, y: position.y };
      },
      (result) => {
        starCenterX.value = result.x;
        starCenterY.value = result.y;
      },
    );

    // Sync showEntityWheel state with shared value for worklet reactivity
    React.useEffect(() => {
      showEntityWheelShared.value = showEntityWheel;
    }, [showEntityWheel, showEntityWheelShared]);

    // Keep active-screen state available inside worklets — useLayoutEffect so shared matches
    // the prop before child useEffects (spawn timeouts) run; avoids stuck false after foreground.
    useLayoutEffect(() => {
      isScreenActiveShared.value = isScreenActive;
    }, [isScreenActive, isScreenActiveShared, profile.id]);

    // Hard-stop entity wheel activity when leaving Home (even if React tree is frozen).
    React.useEffect(() => {
      const pauseEntityWheelOffscreen = (_reason: string) => {
        isScreenActiveShared.value = false;
        cancelAnimation(orbitAngle);
        isWheelSpinning.value = false;
        setIsWheelSpinningState(false);
        floatingMomentsTimeoutsRef.current.forEach((timeout) =>
          clearTimeout(timeout),
        );
        floatingMomentsTimeoutsRef.current = [];
        setFloatingMoments([]);
      };

      const resyncSharedFromProp = () => {
        isScreenActiveShared.value = isScreenActivePropRef.current;
      };

      const unsubscribeEventsTab = onEventsTabPress(() =>
        pauseEntityWheelOffscreen("events_tab_press"),
      );
      const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          // Parent sets isAppActive on the same tick, but commit order can leave shared false
          // for one frame; re-sync immediately and on the next microframe/frame.
          resyncSharedFromProp();
          queueMicrotask(resyncSharedFromProp);
          requestAnimationFrame(resyncSharedFromProp);
          return;
        }
        pauseEntityWheelOffscreen("app_background");
      });

      return () => {
        unsubscribeEventsTab();
        appStateSub.remove();
      };
    }, [isScreenActiveShared, orbitAngle, isWheelSpinning, profile.id]);

    // Exit wheel mode if memories no longer meet the threshold (e.g. edits elsewhere)
    React.useEffect(() => {
      if (showEntityWheel && isFocused && !canEnterEntityWheel) {
        setShowEntityWheel(false);
      }
    }, [canEnterEntityWheel, showEntityWheel, isFocused]);

    // Pause/resume orbit when screen active state changes.
    React.useEffect(() => {
      if (!isScreenActive) {
        cancelAnimation(orbitAngle);
        isWheelSpinning.value = false;
        setIsWheelSpinningState(false);
        return;
      }
      // Screen became active — restart orbit if focused (and not in wheel mode, which handles its own orbit)
      if (isFocused && !showEntityWheel) {
        orbitAngle.value = 0;
        orbitAngle.value = withRepeat(
          withTiming(360, {
            duration: orbitDurationMs * 2,
            easing: Easing.linear,
          }),
          -1,
          false,
        );
      }
    }, [isScreenActive, orbitAngle, isWheelSpinning, profile.id, isFocused, showEntityWheel, orbitDurationMs]);

    // Animate wheel mode - use useLayoutEffect to ensure star position is set before render
    useLayoutEffect(() => {
      if (showEntityWheel && isFocused) {
        // Only set default moment type when first entering wheel mode (transitioning from false to true)
        const wasWheelHidden = !previousShowEntityWheel.current;

        wheelModeProgress.value = withSpring(1, {
          damping: 15,
          stiffness: 100,
        });
        // Animate entity position to wheel target
        focusedX.value = targetX;
        focusedY.value = wheelTargetY;

        if (isScreenActive) {
          // Start continuous orbit animation - slow rotation around entity
          // Each memory will use its base angle + this orbit angle to calculate position
          orbitAngle.value = 0;
          orbitAngle.value = withRepeat(
            withTiming(360, {
              duration: orbitDurationMs,
              easing: Easing.linear,
            }),
            -1, // Infinite repeat
            false, // Don't reverse
          );
        } else {
          cancelAnimation(orbitAngle);
        }

        // Only set default selected moment type when first entering wheel mode
        if (wasWheelHidden) {
          setSelectedMomentType("lesson");
        }
      } else {
        wheelModeProgress.value = withSpring(0, {
          damping: 15,
          stiffness: 100,
        });

        cancelAnimation(wheelSpinRotation);
        wheelSpinRotation.value = 0; // Reset rotation

        setSelectedMomentType("lesson"); // Reset selected icon
        // Return to normal focused position
        if (isFocused) {
          focusedY.value = withSpring(normalTargetY, {
            damping: 15,
            stiffness: 100,
          });
          // Start slow orbit animation for memories even outside wheel mode
          if (isScreenActive) {
            orbitAngle.value = 0;
            orbitAngle.value = withRepeat(
              withTiming(360, {
                duration: orbitDurationMs * 2, // Slower orbit in normal focused mode
                easing: Easing.linear,
              }),
              -1,
              false,
            );
          }
        } else {
          // Stop orbit animation when not focused
          cancelAnimation(orbitAngle);
          orbitAngle.value = 0;
        }
      }

      // Update the ref to track the current state for next render
      previousShowEntityWheel.current = showEntityWheel;
    }, [
      showEntityWheel,
      isFocused,
      wheelModeProgress,
      wheelSpinRotation,
      focusedY,
      wheelTargetY,
      normalTargetY,
      memoryPositions,
      position.x,
      position.y,
      orbitAngle,
      targetX,
      starCenterX,
      starCenterY,
      orbitDurationMs,
      isScreenActive,
    ]);
    // Note: selectedMomentType is intentionally NOT in dependencies to avoid restarting animations when icon selection changes

    // Notify parent when entity wheel state changes (useLayoutEffect so scroll is disabled before paint)
    React.useLayoutEffect(() => {
      if (onEntityWheelChange) {
        onEntityWheelChange(showEntityWheel && isFocused && isScreenActive);
      }
    }, [showEntityWheel, isFocused, onEntityWheelChange, isScreenActive]);

    // Entity wheel spin hint: finger + wiggle — dismiss when wiggle completes (no timer)
    React.useEffect(() => {
      const wheelJustOpened =
        !spinHintWheelPrevOpenRef.current && showEntityWheel;
      spinHintWheelPrevOpenRef.current = showEntityWheel;

      if (!showEntityWheel || !isFocused || !isScreenActive) return;
      if (!appUsabilityHints) {
        setEntityWheelSpinLabelDismissed(true);
        entityHintRotation.value = withTiming(0, { duration: 200 });
        return;
      }
      // Do not call setEntityWheelSpinLabelDismissed(false) on tab switch, background resume,
      // or focus/isScreenActive churn — only when the user opens the wheel (closed → open).
      if (!wheelJustOpened) return;
      setEntityWheelSpinLabelDismissed(false);
    }, [
      showEntityWheel,
      isFocused,
      appUsabilityHints,
      entityHintRotation,
      isScreenActive,
    ]);

    // Avatar click hint: dismiss when pulse stops (handled in pulse callback) or when leaving focused view
    // Do NOT show when exiting from entity wheel mode — only when first entering individual entity view
    const prevShowEntityWheelForHintRef = useRef(showEntityWheel);
    React.useEffect(() => {
      const wasWheelVisible = prevShowEntityWheelForHintRef.current;
      prevShowEntityWheelForHintRef.current = showEntityWheel;

      if (!isFocused || !isScreenActive || showEntityWheel) {
        if (!showEntityWheel) setAvatarClickHintDismissed(false);
        return;
      }
      if (!canEnterEntityWheel && memories.length === 0) {
        setAvatarClickHintDismissed(true);
        return;
      }
      if (!appUsabilityHints) {
        setAvatarClickHintDismissed(true);
        return;
      }
      // Exiting wheel mode -> individual view: don't show hint
      if (wasWheelVisible) {
        setAvatarClickHintDismissed(true);
        return;
      }
      setAvatarClickHintDismissed(false);
    }, [
      isFocused,
      showEntityWheel,
      appUsabilityHints,
      canEnterEntityWheel,
      memories.length,
      isScreenActive,
    ]);

    // Avatar click hint animation: finger above avatar, appears after delay, scales like pressing
    React.useEffect(() => {
      if (
        !entityAvatarPressHintEnabled ||
        !appUsabilityHints ||
        !isFocused ||
        !isScreenActive ||
        showEntityWheel ||
        avatarClickHintDismissed ||
        (!canEnterEntityWheel && memories.length === 0)
      ) {
        cancelAnimation(avatarClickHintOpacity);
        cancelAnimation(avatarClickHintScale);
        avatarClickHintOpacity.value = withTiming(0, { duration: 200 });
        avatarClickHintScale.value = withTiming(1, { duration: 200 });
        return;
      }

      // Appear at 0.85 after avatar movement (1200ms), then fade to 0 from the moment it appears
      const pulseTotalMs = 1200 + 5 * (500 + 500); // delay + 5 pulse cycles
      const fingerVisibleMs = pulseTotalMs - 1200; // time finger is on screen
      avatarClickHintOpacity.value = withDelay(
        1200,
        withSequence(
          withTiming(0.85, { duration: 100, easing: Easing.out(Easing.ease) }),
          withTiming(
            0,
            {
              duration: fingerVisibleMs - 100,
              easing: Easing.linear,
            },
            (finished) => {
              "worklet";
              if (finished) runOnJS(setAvatarClickHintDismissed)(true);
            },
          ),
        ),
      );
      // Scale: bigger -> smaller (pressing) -> bigger, like tapping
      avatarClickHintScale.value = withDelay(
        1200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(0.9, {
              duration: 350,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1.05, {
              duration: 250,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(1, {
              duration: 200,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          5,
          false,
        ),
      );

      return () => {
        cancelAnimation(avatarClickHintOpacity);
        cancelAnimation(avatarClickHintScale);
      };
    }, [
      appUsabilityHints,
      entityAvatarPressHintEnabled,
      isFocused,
      canEnterEntityWheel,
      memories.length,
      showEntityWheel,
      avatarClickHintDismissed,
      isScreenActive,
    ]);

    // Entity wheel spin hint: arc-following finger + matching wheel rotation
    React.useEffect(() => {
      if (
        !appUsabilityHints ||
        !showEntityWheel ||
        !isFocused ||
        !isScreenActive ||
        entityWheelSpinLabelDismissed
      ) {
        cancelAnimation(entitySpinHintArcProgress);
        cancelAnimation(entitySpinHintPointerOpacity);
        cancelAnimation(entityHintRotation);
        entitySpinHintPointerOpacity.value = withTiming(0, { duration: 200 });
        entitySpinHintArcProgress.value = 0;
        entityHintRotation.value = withTiming(0, { duration: 200 });
        return;
      }

      // Reset arc to start position
      entitySpinHintArcProgress.value = 0;

      // Finger: appear quickly, then fade out — total ~3450ms
      entitySpinHintPointerOpacity.value = withSequence(
        withTiming(0.9, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 3300, easing: Easing.linear }, (finished) => {
          "worklet";
          if (finished) runOnJS(setEntityWheelSpinLabelDismissed)(true);
        }),
      );

      // Arc: drag clockwise 90° (16:00 → 19:00), then snap back
      entitySpinHintArcProgress.value = withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) }),
      );

      // Wheel rotates clockwise 90° in sync, then eases back
      entityHintRotation.value = withSequence(
        withTiming(Math.PI / 2, {
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) }),
      );

      return () => {
        cancelAnimation(entitySpinHintArcProgress);
        cancelAnimation(entitySpinHintPointerOpacity);
        cancelAnimation(entityHintRotation);
      };
    }, [
      appUsabilityHints,
      showEntityWheel,
      isFocused,
      entityWheelSpinLabelDismissed,
      setEntityWheelSpinLabelDismissed,
      isScreenActive,
    ]);

    // Clear floating moments immediately when moment type changes
    React.useEffect(() => {
      setFloatingMoments([]);
    }, [selectedMomentType]);

    // Spawn floating moments that grow from memories in entity wheel mode
    React.useEffect(() => {
      // Only spawn when entity wheel is active and not spinning
      // Also don't spawn if selectedWheelMoment popup is displayed
      // When hints enabled, wait until spin hint (finger) is dismissed
      // Don't spawn new moments when one is expanded (pause) - keep existing moments visible
      const blockedReason = !showEntityWheel
        ? "wheel_hidden"
        : !isFocused
          ? "avatar_unfocused"
          : !isScreenActive
            ? "screen_inactive"
            : isWheelSpinningState
              ? "wheel_spinning"
              : selectedWheelMoment
                ? "popup_open"
                : appUsabilityHints && !entityWheelSpinLabelDismissed
                  ? "waiting_spin_hint"
                  : null;

      if (blockedReason) {
        if (!showEntityWheel || !isFocused) {
          setFloatingMoments([]);
          setExpandedMomentId(null);
          expandedAtTimestampRef.current = null;
        }
        return;
      }

      // Collect all moments of selected type with their memory/moment indices
      const momentsWithPositions: {
        memoryId: string;
        memoryIndex: number;
        momentIndex: number;
        momentType: "lesson" | "sunny" | "cloudy";
        text: string;
        memoryImageUri?: string;
        memoryOffsetX: number;
        memoryOffsetY: number;
        memoryBaseAngle: number;
      }[] = [];

      memories.forEach((memory, memoryIndex) => {
        // Get the memory's position data
        const memPosData = memoryPositions[memoryIndex];
        if (!memPosData) return;

        // Add moments based on selected type
        if (selectedMomentType === "lesson" && memory.lessonsLearned) {
          memory.lessonsLearned.forEach((lesson: any, lessonIndex: number) => {
            momentsWithPositions.push({
              memoryId: memory.id,
              memoryIndex, // Store index to calculate position dynamically
              momentIndex: lessonIndex,
              momentType: "lesson",
              text: lesson.text,
              memoryImageUri: memory.imageUri,
              memoryOffsetX: memPosData.offsetX,
              memoryOffsetY: memPosData.offsetY,
              memoryBaseAngle: memPosData.angle,
            });
          });
        } else if (selectedMomentType === "sunny" && memory.goodFacts) {
          memory.goodFacts.forEach((sunny: any, sunnyIndex: number) => {
            momentsWithPositions.push({
              memoryId: memory.id,
              memoryIndex, // Store index to calculate position dynamically
              momentIndex: sunnyIndex,
              momentType: "sunny",
              text: sunny.text,
              memoryImageUri: memory.imageUri,
              memoryOffsetX: memPosData.offsetX,
              memoryOffsetY: memPosData.offsetY,
              memoryBaseAngle: memPosData.angle,
            });
          });
        } else if (selectedMomentType === "cloudy" && memory.hardTruths) {
          memory.hardTruths.forEach((cloudy: any, cloudyIndex: number) => {
            momentsWithPositions.push({
              memoryId: memory.id,
              memoryIndex, // Store index to calculate position dynamically
              momentIndex: cloudyIndex,
              momentType: "cloudy",
              text: cloudy.text,
              memoryImageUri: memory.imageUri,
              memoryOffsetX: memPosData.offsetX,
              memoryOffsetY: memPosData.offsetY,
              memoryBaseAngle: memPosData.angle,
            });
          });
        }
      });

      if (momentsWithPositions.length === 0) {
        setFloatingMoments([]);
        return;
      }

      // Shuffle moments to randomize which memory they come from
      // Fisher-Yates shuffle algorithm
      for (let i = momentsWithPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [momentsWithPositions[i], momentsWithPositions[j]] = [
          momentsWithPositions[j],
          momentsWithPositions[i],
        ];
      }

      // Clear any existing timeouts from previous runs
      floatingMomentsTimeoutsRef.current.forEach((timeout) =>
        clearTimeout(timeout),
      );
      floatingMomentsTimeoutsRef.current = [];

      nextMomentIndexRef.current = 0;
      isSpawningNextRef.current = false;
      cycleIdRef.current++;
      restartScheduledRef.current = false;
      remainingBeforeRestartRef.current = 0;
      nextSlotRef.current = 0;

      const timeouts: ReturnType<typeof setTimeout>[] = [];
      // Initial concurrent moments: 3 for lessons, 4 for sunny, 2 for cloudy
      const INITIAL_CONCURRENT_MOMENTS =
        selectedMomentType === "lesson"
          ? 3
          : selectedMomentType === "sunny"
            ? 4
            : 2;
      const INITIAL_START_DELAY = 1000; // Wait 1 second after opening
      const INITIAL_STAGGER_DELAY = 600; // 600ms between each initial moment
      const GROW_DELAY = 400;
      const GROW_DURATION = 1400;
      const HOLD_DURATION = 3200;
      const SHRINK_DURATION = 1200;
      const TOTAL_DURATION =
        GROW_DELAY + GROW_DURATION + HOLD_DURATION + SHRINK_DURATION;
      const REMOVE_BUFFER_MS = 400;
      const CLOUDY_SPAWN_DELAY = 500;

      // For cloudy moments, spawn 2 at a time with delay between batches
      // For other moments, spawn concurrently (multiple at once)
      const isCloudyMoment = selectedMomentType === "cloudy";

      const spawnSingleMoment = (momentIndex: number, delay: number = 0) => {
        if (momentIndex >= momentsWithPositions.length) return;

        // Don't spawn if selectedWheelMoment popup is displayed
        if (selectedWheelMoment) return;

        const timeout = setTimeout(() => {
          if (!isScreenActiveShared.value) {
            return;
          }
          // Double-check selectedWheelMoment hasn't appeared during delay
          if (selectedWheelMoment) return;

          const momentData = momentsWithPositions[momentIndex];
          const currentCycleId = cycleIdRef.current;
          const momentIdentity = `${momentData.memoryIndex}-${momentData.momentIndex}-${momentData.momentType}`;
          const slot = nextSlotRef.current++;
          const batchSize = currentBatchSizeRef.current;
          const angleStep = (2 * Math.PI) / Math.max(1, batchSize);
          const angleJitter = (Math.random() - 0.5) * angleStep * 0.6; // ±30% of half-arc
          const newMoment = {
            id: momentIdCounter.current++,
            ...momentData,
            spawnSlot: slot,
            batchSize,
            cycleId: currentCycleId,
            angleJitter,
            spawnTime: Date.now(),
            entityId: profile.id,
            sphere: profile.sphere,
          };

          setFloatingMoments((prev) => {
            if (!isScreenActiveShared.value) return prev;
            const isDuplicate = prev.some(
              (m) =>
                m.memoryIndex === newMoment.memoryIndex &&
                m.momentIndex === newMoment.momentIndex &&
                m.momentType === newMoment.momentType,
            );
            if (isDuplicate) return prev;
            return [...prev, newMoment];
          });

          const removeTimeout = setTimeout(() => {
            if (!isScreenActiveShared.value) return;
            if (cycleIdRef.current !== currentCycleId) {
              setFloatingMoments((prev) =>
                prev.filter((m) => m.id !== newMoment.id),
              );
              return;
            }
            // Skip removal when a moment is expanded - keep all visible until collapse
            if (expandedMomentIdRef.current !== null) return;
            momentAnimationStateMap.delete(momentIdentity);

            setFloatingMoments((prev) =>
              prev.filter((m) => m.id !== newMoment.id),
            );

            if (restartScheduledRef.current) {
              remainingBeforeRestartRef.current--;
              if (remainingBeforeRestartRef.current <= 0) {
                restartScheduledRef.current = false;
                remainingBeforeRestartRef.current = 0;
                const momentsToSpawn = Math.min(
                  INITIAL_CONCURRENT_MOMENTS,
                  momentsWithPositions.length,
                );
                currentBatchSizeRef.current = momentsToSpawn;
                nextSlotRef.current = 0;
                cycleIdRef.current++;
                nextMomentIndexRef.current = 0;
                setFloatingMoments([]);
                for (let i = 0; i < momentsToSpawn; i++) {
                  spawnSingleMoment(
                    i,
                    INITIAL_START_DELAY + i * INITIAL_STAGGER_DELAY,
                  );
                  nextMomentIndexRef.current = i + 1;
                }
              }
              return;
            }

            if (isSpawningNextRef.current) return;

            if (nextMomentIndexRef.current < momentsWithPositions.length) {
              isSpawningNextRef.current = true;
              const nextIndex = nextMomentIndexRef.current++;
              const delayAfterShrink = isCloudyMoment ? CLOUDY_SPAWN_DELAY : 0;
              const nextSpawnTimeout = setTimeout(() => {
                if (!isScreenActiveShared.value) {
                  isSpawningNextRef.current = false;
                  return;
                }
                if (cycleIdRef.current !== currentCycleId) {
                  isSpawningNextRef.current = false;
                  return;
                }
                isSpawningNextRef.current = false;
                // Don't spawn next when a moment is expanded
                if (expandedMomentIdRef.current !== null) return;
                if (!selectedWheelMoment) spawnSingleMoment(nextIndex, 0);
              }, delayAfterShrink);
              floatingMomentsTimeoutsRef.current.push(nextSpawnTimeout);
            } else {
              // Run out: wait for remaining moments to finish shrink and be removed, then restart.
              const momentsToSpawnThisCycle = Math.min(
                INITIAL_CONCURRENT_MOMENTS,
                momentsWithPositions.length,
              );
              restartScheduledRef.current = true;
              remainingBeforeRestartRef.current = momentsToSpawnThisCycle - 1;
            }
          }, TOTAL_DURATION + REMOVE_BUFFER_MS);
          timeouts.push(removeTimeout);
          floatingMomentsTimeoutsRef.current.push(removeTimeout);
        }, delay);

        timeouts.push(timeout);
        floatingMomentsTimeoutsRef.current.push(timeout);
      };

      const momentsToSpawn = Math.min(
        INITIAL_CONCURRENT_MOMENTS,
        momentsWithPositions.length,
      );
      currentBatchSizeRef.current = momentsToSpawn;
      nextSlotRef.current = 0;
      for (let i = 0; i < momentsToSpawn; i++) {
        spawnSingleMoment(i, INITIAL_START_DELAY + i * INITIAL_STAGGER_DELAY);
        nextMomentIndexRef.current = i + 1;
      }

      return () => {
        // Clear all timeouts to prevent moments from spawning after cleanup
        timeouts.forEach((timeout) => clearTimeout(timeout));
        floatingMomentsTimeoutsRef.current.forEach((timeout) =>
          clearTimeout(timeout),
        );
        floatingMomentsTimeoutsRef.current = [];
        // Reset next moment index and lock
        nextMomentIndexRef.current = 0;
        isSpawningNextRef.current = false;
        cycleIdRef.current++; // Increment cycle to invalidate any pending completions
        // Also clear floatingMoments to prevent stale moments from appearing
        setFloatingMoments([]);
      };
    }, [
      showEntityWheel,
      isFocused,
      isWheelSpinningState,
      selectedMomentType,
      memories,
      memoryPositions,
      starCenterX,
      starCenterY,
      orbitAngle,
      isTablet,
      selectedWheelMoment,
      appUsabilityHints,
      entityWheelSpinLabelDismissed,
      isScreenActive,
      profile.id,
      isScreenActiveShared,
    ]);

    // Pulse animation when entering focused view to indicate avatar is clickable
    // Initialize to false so we detect the first focused render as a transition
    const previousIsFocused = useRef(false);
    const hasInitialPulseRun = useRef(false);

    React.useEffect(() => {
      // Detect transition from unfocused to focused (entering focused view)
      // OR first render when already focused (e.g., clicking friend from spheres view)
      if (
        entityAvatarPressHintEnabled &&
        isFocused &&
        canEnterEntityWheel &&
        (!previousIsFocused.current || !hasInitialPulseRun.current)
      ) {
        // Pulse 3 times: start after avatar movement (1200ms) has finished
        // When pulse completes, dismiss the finger hint
        avatarPulseScale.value = withDelay(
          1200,
          withSequence(
            withTiming(1.08, {
              duration: 500,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.08, {
              duration: 500,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.08, {
              duration: 500,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(
              1,
              { duration: 500, easing: Easing.inOut(Easing.ease) },
              (finished) => {
                "worklet";
                if (finished) {
                  cancelAnimation(avatarClickHintScale);
                  avatarClickHintScale.value = 1;
                  // Dismiss is handled when opacity fade completes (in parallel)
                }
              },
            ),
          ),
        );
        hasInitialPulseRun.current = true;
      } else if (!isFocused) {
        // Reset pulse when leaving focused view
        avatarPulseScale.value = 1;
        hasInitialPulseRun.current = false; // Reset so next focus triggers pulse
      } else if (!canEnterEntityWheel) {
        avatarPulseScale.value = 1;
        hasInitialPulseRun.current = false; // Allow pulse again if user later meets threshold
      } else if (!entityAvatarPressHintEnabled) {
        avatarPulseScale.value = 1;
        hasInitialPulseRun.current = false;
      }

      // Update ref for next render
      previousIsFocused.current = isFocused;
    }, [
      isFocused,
      canEnterEntityWheel,
      avatarPulseScale,
      setAvatarClickHintDismissed,
      entityAvatarPressHintEnabled,
    ]);

    // Use a ref to track previous isFocused state to detect transitions
    // CRITICAL: Don't initialize with current value - track the actual previous value from last effect run
    const prevIsFocusedRef = useRef<boolean | undefined>(undefined);
    // Track if animation has been started for current focus state to prevent duplicate starts
    const animationStartedForFocusRef = useRef<boolean>(false);

    // CRITICAL: Reset to State A synchronously BEFORE render when isFocused becomes true
    // useLayoutEffect runs synchronously after all DOM mutations but before paint
    useLayoutEffect(() => {
      const prevIsFocused = prevIsFocusedRef.current;

      // Initialize on first run if undefined
      if (prevIsFocused === undefined) {
        // If we're already focused on first run, we should animate to focused state
        // Set prevIsFocused to false so we detect the transition
        prevIsFocusedRef.current = false;
        // Don't return - let the transition check below handle it
      }

      // Check for transition BEFORE updating the ref
      // Also check if we haven't already started animation for this focus state
      // Handle first run where prevIsFocused is undefined but isFocused is true
      const isTransitioningToFocused =
        isFocused &&
        (prevIsFocused === false || (prevIsFocused === undefined && isFocused));

      if (isTransitioningToFocused && !animationStartedForFocusRef.current) {
        // Transitioning from unfocused to focused - reset to State A immediately
        // This MUST happen before the component renders with isFocused=true
        animationStartedForFocusRef.current = true; // Mark animation as started

        // Store the original position - position prop now contains the original position
        // (not the center) because we updated focused renderers to pass original position
        startX.value = position.x;
        startY.value = position.y;
        zoomProgress.value = 0; // Start at 0 (State A) - CRITICAL for animation to start from State A
        zoomScale.value = baseScale; // Start at base scale (State A)
        focusedX.value = position.x; // Start at original position (State A)
        focusedY.value = position.y; // Start at original position (State A)

        // Start animation immediately in useLayoutEffect for faster response
        // Start animation values immediately without waiting for RAF - useLayoutEffect runs synchronously
        const easingConfig = Easing.bezier(0.4, 0.0, 0.2, 1);
        const zoomInDuration = 1200;

        // Start animations immediately - no RAF delay
        zoomProgress.value = withTiming(1, {
          duration: zoomInDuration,
          easing: easingConfig,
        });
        zoomScale.value = withTiming(focusedScale, {
          duration: zoomInDuration,
          easing: easingConfig,
        });
        focusedX.value = withTiming(targetX, {
          duration: zoomInDuration,
          easing: easingConfig,
        });
        focusedY.value = withTiming(targetY, {
          duration: zoomInDuration,
          easing: easingConfig,
        });

        // Start slow orbit animation for memories in focused mode
        if (isScreenActive) {
          orbitAngle.value = 0;
          orbitAngle.value = withRepeat(
            withTiming(360, {
              duration: orbitDurationMs * 2,
              easing: Easing.linear,
            }),
            -1,
            false,
          );
        }
      } else if (!isFocused && prevIsFocused) {
        // Transitioning from focused to unfocused - ensure we start from State B (focused state)
        // This prevents flashing by ensuring values are correct before zoom-out animation
        animationStartedForFocusRef.current = false; // Reset flag for next focus
        zoomProgress.value = 1; // Start at 1 (State B - focused)
        // CRITICAL: Ensure scale is at focusedScale - this is the starting point for the shrink animation
        // If we don't set this, the scale might be at baseScale already, causing immediate shrink
        zoomScale.value = focusedScale; // Start at focused scale (State B) - will animate to baseScale
        focusedX.value = targetX; // Start at center (State B)
        focusedY.value = targetY; // Start at center (State B)

        // Stop orbit animation when leaving focused mode
        cancelAnimation(orbitAngle);
        orbitAngle.value = 0;
      }
      // Update ref AFTER checking for transitions
      prevIsFocusedRef.current = isFocused;
    }, [
      isFocused,
      position.x,
      position.y,
      startX,
      startY,
      zoomProgress,
      zoomScale,
      focusedX,
      focusedY,
      baseScale,
      focusedScale,
      targetX,
      targetY,
      orbitAngle,
      orbitDurationMs,
      isScreenActive,
    ]);

    React.useEffect(() => {
      if (isFocused) {
        const currentProgress = zoomProgress.value;
        const currentScale = zoomScale.value;

        // Check if animation is already running (zoomProgress should be > 0 if useLayoutEffect started it)
        // Also check if animation was already started by useLayoutEffect
        // If zoomProgress is still 0 and animation wasn't started, useLayoutEffect didn't start it, so start it here
        if (
          currentProgress === 0 &&
          currentScale === baseScale &&
          !animationStartedForFocusRef.current
        ) {
          animationStartedForFocusRef.current = true; // Mark as started to prevent duplicates
          // Reset values to be sure
          zoomProgress.value = 0;
          zoomScale.value = baseScale;
          startX.value = position.x;
          startY.value = position.y;
          focusedX.value = position.x;
          focusedY.value = position.y;

          // Start animation immediately
          requestAnimationFrame(() => {
            const easingConfig = Easing.bezier(0.4, 0.0, 0.2, 1);
            const zoomInDuration = 1200;

            zoomProgress.value = withTiming(1, {
              duration: zoomInDuration,
              easing: easingConfig,
            });
            zoomScale.value = withTiming(focusedScale, {
              duration: zoomInDuration,
              easing: easingConfig,
            });
            focusedX.value = withTiming(targetX, {
              duration: zoomInDuration,
              easing: easingConfig,
            });
            focusedY.value = withTiming(targetY, {
              duration: zoomInDuration,
              easing: easingConfig,
            });

            // Start slow orbit animation for memories in focused mode (backup path)
            if (isScreenActivePropRef.current) {
              orbitAngle.value = 0;
              orbitAngle.value = withRepeat(
                withTiming(360, {
                  duration: orbitDurationMs * 2,
                  easing: Easing.linear,
                }),
                -1,
                false,
              );
            }
          });
        }
      } else {
        // Animate zoom-out: smooth transition from State B back to State A
        // Values should already be set to State B in useLayoutEffect
        // Start animation immediately - all values animate together
        const easingConfig = Easing.bezier(0.4, 0.0, 0.2, 1);
        const zoomOutDuration = 1200; // Faster zoom-out to match zoom-in duration

        // Animate from focused state (progress = 1) back to unfocused (progress = 0)
        // Position, scale, and progress all animate together for smooth zoom-out
        zoomProgress.value = withTiming(0, {
          duration: zoomOutDuration,
          easing: easingConfig,
        });
        // CRITICAL: Animate scale from focusedScale to baseScale
        // This creates smooth shrinking animation - the scale was set to focusedScale in useLayoutEffect
        zoomScale.value = withTiming(baseScale, {
          duration: zoomOutDuration, // Same duration as position for synchronized movement
          easing: easingConfig,
        });
        focusedX.value = withTiming(position.x, {
          duration: zoomOutDuration,
          easing: easingConfig,
        });
        focusedY.value = withTiming(position.y, {
          duration: zoomOutDuration,
          easing: easingConfig,
        });
      }
    }, [
      isFocused,
      position.x,
      position.y,
      zoomProgress,
      zoomScale,
      startX,
      startY,
      focusedX,
      focusedY,
      focusedScale,
      baseScale,
      targetX,
      targetY,
    ]);

    // Select random moment after wheel spin — always use lesson preloaded exam
    const selectRandomMoment = React.useCallback(async () => {
      const allLessons: {
        type: "lesson";
        text: string;
        memoryId: string;
        momentId?: string;
        memoryImageUri?: string;
      }[] = [];

      memories.forEach((memory) => {
        if (memory.lessonsLearned) {
          memory.lessonsLearned.forEach(
            (lesson: { id: string; text: string }) => {
              allLessons.push({
                type: "lesson",
                text: lesson.text,
                memoryId: memory.id,
                momentId: lesson.id,
                memoryImageUri: memory.imageUri,
              });
            },
          );
        }
      });

      if (allLessons.length === 0) return;

      const chosen = allLessons[Math.floor(Math.random() * allLessons.length)];

      // Free spin already consumed at spin start (consumeUniverseExamIfAvailable)

      if (__DEV__)
        // Show loading popup immediately so UI doesn't feel stuck while preload/consume runs
        setSelectedMomentType("lesson");
      setSelectedWheelMoment({
        type: "lesson",
        text: "…",
        memoryId: chosen.memoryId,
        momentId: chosen.momentId,
        memoryImageUri: chosen.memoryImageUri,
      });
      setSelectedWheelExam({ question: "", step: "question" });

      const item = await pickAndConsumePreloadedQuestion({
        type: "entity",
        entityId: profile.id,
        onRefetchEntity: (eid) =>
          preloadEntityWheelQuestions({
            entityId: eid,
            memories,
            language: lang,
            hasAIEntitlement,
            appendOnly: true,
          }),
      });
      if (item) {
        setSelectedWheelMoment({
          type: "lesson",
          text: item.lessonText,
          memoryId: item.memoryId ?? chosen.memoryId,
          momentId: item.lessonId,
          memoryImageUri: item.memoryImageUri ?? chosen.memoryImageUri,
        });
        setSelectedWheelExam({
          question: item.question,
          step: "question",
        });
      } else {
        setSelectedWheelMoment(chosen);
        setSelectedWheelExam({
          question: chosen.text,
          step: "question",
        });
      }
    }, [memories, profile.id, lang, hasAIEntitlement]);

    // Start entity wheel spin (used after rate-limit check for lessons)
    // Even smallest drag triggers a smooth 2.5s+ spin; larger drags scale up rotation
    const startEntityWheelSpin = React.useCallback(
      (velocity: number) => {
        setSelectedMomentType("lesson"); // Force lesson mode when spin starts (ignore current filter)
        const { logWheelEntitySpin } = require("@/utils/analytics");
        logWheelEntitySpin(profile.id).catch(() => {});
        isWheelSpinning.value = true;
        runOnJS(setIsWheelSpinningState)(true);
        const velocityMagnitude = Math.abs(velocity);
        const sign = velocity >= 0 ? 1 : -1;

        const MIN_ROTATION_DEG = 540; // 1.5 full rotations for tiny drags
        const MIN_DURATION_MS = 2500;

        let targetRotation: number;
        let durationMs: number;

        if (velocityMagnitude > 0.01) {
          const momentumMultiplier =
            20.0 + Math.min(velocityMagnitude * 8, 50.0);
          const amplifiedVelocity = velocity * momentumMultiplier;
          const rawRotation = amplifiedVelocity * 3.0;
          targetRotation =
            Math.abs(rawRotation) >= MIN_ROTATION_DEG
              ? rawRotation
              : sign * MIN_ROTATION_DEG;
          durationMs = Math.max(
            MIN_DURATION_MS,
            Math.min(4500, 2500 + velocityMagnitude * 120),
          );
        } else {
          // Smallest drag or tap: guaranteed satisfying spin (1.5 rotations, 2.5s)
          targetRotation = sign * MIN_ROTATION_DEG;
          durationMs = MIN_DURATION_MS;
        }

        const targetAngle = orbitAngle.value + targetRotation;
        orbitAngle.value = withSequence(
          withTiming(targetAngle, {
            duration: durationMs,
            easing: Easing.out(Easing.cubic), // Start at release speed, decelerate to stop — feels like continuation of drag
          }),
          withTiming(targetAngle, { duration: 0 }, (finished) => {
            "worklet";
            if (finished) {
              isWheelSpinning.value = false;
              runOnJS(setIsWheelSpinningState)(false);
              if (isScreenActiveShared.value) {
                runOnJS(selectRandomMoment)();
                orbitAngle.value = withRepeat(
                  withTiming(orbitAngle.value + 360, {
                    duration: orbitDurationMs,
                    easing: Easing.linear,
                  }),
                  -1,
                  false,
                );
              }
            }
          }),
        );
        wheelVelocity.value = 0;
      },
      [
        isWheelSpinning,
        orbitAngle,
        orbitDurationMs,
        wheelVelocity,
        selectRandomMoment,
        profile.id,
        isScreenActiveShared,
      ],
    );

    // For lesson: check AI consent first, then rate limit before spin
    const handleEntityWheelReleaseForLesson = React.useCallback(
      async (velocity: number) => {
        if (!aiConsent.isEnabled) {
          onShowAIConsentModal?.();
          return;
        }
        if (entityWheelReleaseInProgressRef.current) return;
        entityWheelReleaseInProgressRef.current = true;
        try {
          const consumed =
            await consumeUniverseExamIfAvailable(hasAIEntitlement);
          if (!consumed) {
            const purchased = await showPaywallForAIAccess();
            if (!purchased) {
              cancelAnimation(orbitAngle);
              return;
            }
          }
          const remaining = await getRemainingUniverseExams(hasAIEntitlement);
          setEntityWheelExamTriesRemaining(remaining);
          startEntityWheelSpin(velocity);
        } finally {
          entityWheelReleaseInProgressRef.current = false;
        }
      },
      [
        aiConsent.isEnabled,
        hasAIEntitlement,
        onShowAIConsentModal,
        startEntityWheelSpin,
        orbitAngle,
      ],
    );

    // Preload exam questions when entity wheel opens
    React.useEffect(() => {
      if (showEntityWheel && isFocused && aiConsent.isEnabled) {
        const lessonsCount = memories.reduce(
          (sum, m) => sum + (m.lessonsLearned?.length ?? 0),
          0,
        );
        if (lessonsCount > 0) {
          void preloadEntityWheelQuestions({
            entityId: profile.id,
            memories,
            language: lang,
            hasAIEntitlement,
          });
        }
      }
    }, [
      showEntityWheel,
      isFocused,
      aiConsent.isEnabled,
      profile.id,
      memories,
      lang,
      hasAIEntitlement,
    ]);

    // Clear floating moments when selectedWheelMoment popup appears
    React.useEffect(() => {
      if (!isScreenActive) {
        cancelAnimation(popupAnimProgress);
        cancelAnimation(popupScale);
        cancelAnimation(popupOpacity);
        return;
      }

      if (selectedWheelMoment) {
        setFloatingMoments([]);
      }
    }, [selectedWheelMoment]);

    // Clear exam state when closing wheel moment
    const clearWheelMomentAndExam = React.useCallback(() => {
      setSelectedWheelMoment(null);
      setSelectedWheelExam(null);
      setShowWheelFireworks(false);
      setExamAnswerInput("");
      setWheelMomentHintDismissed(true);
    }, []);

    const handleExamSubmit = React.useCallback(
      async (userAnswer: string) => {
        if (
          !selectedWheelMoment ||
          selectedWheelMoment.type !== "lesson" ||
          !selectedWheelExam
        )
          return;
        setSelectedWheelExam((p) => (p ? { ...p, step: "analyzing" } : null));
        try {
          const analysis = await analyzeLessonExamAnswer(
            selectedWheelMoment.text,
            selectedWheelExam.question,
            userAnswer,
            lang,
          );
          setSelectedWheelExam((p) =>
            p
              ? {
                  ...p,
                  step: "result",
                  analysis,
                  userAnswer,
                }
              : null,
          );
          if (analysis.isCorrect) {
            setShowWheelFireworks(true);
            entityCelebrationSparksVisible.value = true;
            setTimeout(() => {
              entityCelebrationSparksVisible.value = false;
            }, 1000);
          }
        } catch (err) {
          logError("wheel-exam-analyze", err);
          setSelectedWheelExam((p) =>
            p
              ? {
                  ...p,
                  step: "result",
                  analysis: {
                    isCorrect: false,
                    feedback: "Something went wrong. Try again.",
                  },
                  userAnswer,
                }
              : null,
          );
        }
      },
      [
        selectedWheelMoment,
        selectedWheelExam,
        lang,
        entityCelebrationSparksVisible,
      ],
    );

    // Animate popup entrance when selectedWheelMoment appears
    React.useEffect(() => {
      if (selectedWheelMoment) {
        // Reset and animate from entity position to top
        popupAnimProgress.value = 0;
        popupScale.value = 0.3;
        popupOpacity.value = 0;

        popupAnimProgress.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
        popupScale.value = withSpring(1, {
          damping: 12,
          stiffness: 150,
        });
        popupOpacity.value = withTiming(1, { duration: 300 });
      } else {
        // Fade out when closing
        popupOpacity.value = withTiming(0, { duration: 200 });
        popupScale.value = withTiming(0.8, { duration: 200 });
      }
    }, [
      selectedWheelMoment,
      popupAnimProgress,
      popupScale,
      popupOpacity,
      isScreenActive,
    ]);

    // Update entity wheel button selection states when selectedMomentType changes (fast timing so old selection doesn't linger)
    React.useEffect(() => {
      cancelAnimation(entityLessonButtonSelection);
      cancelAnimation(entitySunnyButtonSelection);
      cancelAnimation(entityCloudyButtonSelection);

      entityLessonButtonSelection.value = withTiming(
        selectedMomentType === "lesson" ? 1 : 0,
        {
          duration: 150,
          easing: Easing.out(Easing.ease),
        },
      );
      entitySunnyButtonSelection.value = withTiming(
        selectedMomentType === "sunny" ? 1 : 0,
        {
          duration: 150,
          easing: Easing.out(Easing.ease),
        },
      );
      entityCloudyButtonSelection.value = withTiming(
        selectedMomentType === "cloudy" ? 1 : 0,
        {
          duration: 150,
          easing: Easing.out(Easing.ease),
        },
      );

      // Cancel any ongoing animations and reset all highlight and press scale values to prevent lingering press effects
      cancelAnimation(entityLessonButtonHighlight);
      cancelAnimation(entitySunnyButtonHighlight);
      cancelAnimation(entityCloudyButtonHighlight);
      cancelAnimation(entityLessonButtonPressScale);
      cancelAnimation(entitySunnyButtonPressScale);
      cancelAnimation(entityCloudyButtonPressScale);
      cancelAnimation(entityExamSubmitPressScale);

      entityLessonButtonHighlight.value = 0;
      entitySunnyButtonHighlight.value = 0;
      entityCloudyButtonHighlight.value = 0;
      entityLessonButtonPressScale.value = 1;
      entitySunnyButtonPressScale.value = 1;
      entityCloudyButtonPressScale.value = 1;
      entityExamSubmitPressScale.value = 1;
    }, [
      selectedMomentType,
      entityLessonButtonSelection,
      entitySunnyButtonSelection,
      entityCloudyButtonSelection,
      entityLessonButtonHighlight,
      entitySunnyButtonHighlight,
      entityCloudyButtonHighlight,
      entityLessonButtonPressScale,
      entitySunnyButtonPressScale,
      entityCloudyButtonPressScale,
      entityExamSubmitPressScale,
    ]);

    // Avatar pulse animated style for indicating clickability
    const avatarPulseStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: avatarPulseScale.value }],
      };
    });

    // Entity wheel bottom selectors — background/border interpolate with Moments Colors
    const wheelBtnUnselected =
      colorScheme === "dark"
        ? "rgba(26, 36, 64, 0.08)"
        : "rgba(0, 0, 0, 0.07)";
    const lessonRgb = hexToRgb(momentColors.lesson.background);
    const sunnyRgb = hexToRgb(momentColors.sunny.background);
    const cloudyRgb = hexToRgb(momentColors.cloudy.background);
    const lessonWheelSelectedGlass = `rgba(${lessonRgb.r}, ${lessonRgb.g}, ${lessonRgb.b}, 0.42)`;
    const sunnyWheelSelectedGlass = `rgba(${sunnyRgb.r}, ${sunnyRgb.g}, ${sunnyRgb.b}, 0.42)`;
    const cloudyWheelSelectedGlass = `rgba(${cloudyRgb.r}, ${cloudyRgb.g}, ${cloudyRgb.b}, 0.42)`;

    const entityLessonButtonStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        entityLessonButtonSelection.value,
        [0, 1],
        [wheelBtnUnselected, lessonWheelSelectedGlass],
      );
      const borderWidth = entityLessonButtonSelection.value * 2;

      return {
        transform: [{ scale: entityLessonButtonPressScale.value }],
        backgroundColor,
        borderWidth,
        borderColor: momentColors.lesson.text,
      };
    });

    const entityLessonHighlightStyle = useAnimatedStyle(() => {
      return { opacity: entityLessonButtonHighlight.value * 0.4 };
    });

    const entitySunnyButtonStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        entitySunnyButtonSelection.value,
        [0, 1],
        [wheelBtnUnselected, sunnyWheelSelectedGlass],
      );
      const borderWidth = entitySunnyButtonSelection.value * 2;

      return {
        transform: [{ scale: entitySunnyButtonPressScale.value }],
        backgroundColor,
        borderWidth,
        borderColor: momentColors.sunny.text,
      };
    });

    const entitySunnyHighlightStyle = useAnimatedStyle(() => {
      return { opacity: entitySunnyButtonHighlight.value * 0.4 };
    });

    const entityCloudyButtonStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        entityCloudyButtonSelection.value,
        [0, 1],
        [wheelBtnUnselected, cloudyWheelSelectedGlass],
      );
      const borderWidth = entityCloudyButtonSelection.value * 2;

      return {
        transform: [{ scale: entityCloudyButtonPressScale.value }],
        backgroundColor,
        borderWidth,
        borderColor: momentColors.cloudy.text,
      };
    });

    const entityCloudyHighlightStyle = useAnimatedStyle(() => {
      return { opacity: entityCloudyButtonHighlight.value * 0.4 };
    });

    // Avatar ring gradient overlay (fades in when selected, muted like main wheel)
    const entityLessonGradientOverlayStyle = useAnimatedStyle(() => ({
      opacity: entityLessonButtonSelection.value * 0.4,
    }));
    const entitySunnyGradientOverlayStyle = useAnimatedStyle(() => ({
      opacity: entitySunnyButtonSelection.value * 0.4,
    }));
    const entityCloudyGradientOverlayStyle = useAnimatedStyle(() => ({
      opacity: entityCloudyButtonSelection.value * 0.4,
    }));

    const getGradientOverlayStyle = (type: "lesson" | "sunny" | "cloudy") => {
      if (type === "lesson") return entityLessonGradientOverlayStyle;
      if (type === "sunny") return entitySunnyGradientOverlayStyle;
      return entityCloudyGradientOverlayStyle;
    };

    const entityExamSubmitButtonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: entityExamSubmitPressScale.value }],
    }));

    const entityExamInputPulseStyle = useAnimatedStyle(() => ({
      transform: [{ scale: entityExamInputPulseScale.value }],
    }));

    // Entity wheel orbit radius (matches focused-entities-view.tsx ORBIT_RADIUS=100) + outward offset
    const entityHintOrbitRadius = 100 + 28;

    const entitySpinHintPointerAnimatedStyle = useAnimatedStyle(() => {
      const t = entitySpinHintArcProgress.value;
      const angle = HINT_ARC_START_RAD + t * HINT_ARC_SWEEP_RAD;
      const r = entityHintOrbitRadius;
      return {
        opacity: entitySpinHintPointerOpacity.value,
        transform: [
          { translateX: r * Math.cos(angle) },
          { translateY: r * Math.sin(angle) },
          { rotate: `${angle + Math.PI / 2 + Math.PI}rad` },
        ],
      };
    });

    const avatarClickHintAnimatedStyle = useAnimatedStyle(() => ({
      opacity: avatarClickHintOpacity.value,
      transform: [{ scale: avatarClickHintScale.value }],
    }));

    const wheelMomentHintPointerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: wheelMomentHintPointerOpacity.value,
      transform: [{ translateY: wheelMomentHintPointerBounce.value }],
    }));

    // Lesson bulb tap hint: bouncing pointer shown from 2nd appearance onward
    React.useEffect(() => {
      if (selectedWheelMoment?.type === "lesson") {
        wheelMomentAppearCountRef.current += 1;
        setWheelMomentAppearCount(wheelMomentAppearCountRef.current);
      }
      const count = wheelMomentAppearCountRef.current;
      const shouldShow =
        !!selectedWheelMoment &&
        selectedWheelMoment.type === "lesson" &&
        appUsabilityHints &&
        !wheelMomentHintDismissed &&
        count >= 2 &&
        isScreenActive;
      if (!shouldShow) {
        cancelAnimation(wheelMomentHintPointerOpacity);
        cancelAnimation(wheelMomentHintPointerBounce);
        wheelMomentHintPointerOpacity.value = withTiming(0, { duration: 200 });
        wheelMomentHintPointerBounce.value = 0;
        return;
      }
      wheelMomentHintPointerBounce.value = 0;
      wheelMomentHintPointerOpacity.value = withTiming(0.9, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      wheelMomentHintPointerBounce.value = withDelay(
        400,
        withRepeat(
          withSequence(
            withTiming(-10, { duration: 350, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) }),
            withTiming(-6, { duration: 300, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
      return () => {
        cancelAnimation(wheelMomentHintPointerOpacity);
        cancelAnimation(wheelMomentHintPointerBounce);
      };
    }, [
      selectedWheelMoment,
      appUsabilityHints,
      wheelMomentHintDismissed,
      wheelMomentHintPointerOpacity,
      wheelMomentHintPointerBounce,
      isScreenActive,
    ]);

    // Popup animated style - must be defined at top level, not inside conditional
    const popupAnimatedStyle = useAnimatedStyle(() => {
      "worklet";
      // Start from entity position (wheelTargetY) and animate to final position below entity name
      // Position lower to avoid overlapping with entity name at top (give ~180px for name + padding)
      const messageTop = 180;
      const startY = wheelTargetY;
      const endY = messageTop;
      const currentY = startY + (endY - startY) * popupAnimProgress.value;

      return {
        transform: [{ scale: popupScale.value * popupPressScale.value }],
        opacity: popupOpacity.value,
        top: currentY,
      };
    });

    // Wheel drag tracking
    const wheelDragFrameCount = useSharedValue(0);
    const wheelLastAngle = useSharedValue(0);
    const wheelStartAngle = useSharedValue(0);

    // Create PanResponder for drag-to-spin in wheel mode
    const wheelPanResponder = React.useMemo(() => {
      if (!showEntityWheel || !isFocused || !isScreenActive) return null;

      // Calculate icon button exclusion zones
      const tabBarHeight =
        Math.round(78 * fontScale) +
        Math.max(12, insets.bottom + 12 - 20 * fontScale);
      const iconY = SCREEN_HEIGHT - tabBarHeight - 60;
      const iconSize = 60;
      const spacing = 85;

      const iconPositions = [
        { x: SCREEN_WIDTH / 2 - spacing, y: iconY }, // lesson
        { x: SCREEN_WIDTH / 2, y: iconY }, // sunny
        { x: SCREEN_WIDTH / 2 + spacing, y: iconY }, // cloudy
      ];

      const isTouchOnIcon = (x: number, y: number) => {
        return iconPositions.some((icon) => {
          const dx = x - icon.x;
          const dy = y - icon.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < iconSize / 2 + 10; // Add 10px padding for easier touch
        });
      };

      return PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          if (isTouchOnIcon(pageX, pageY)) {
            return false;
          }
          return true;
        },
        onMoveShouldSetPanResponder: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          if (isTouchOnIcon(pageX, pageY)) {
            return false;
          }
          return true;
        },
        onPanResponderGrant: (evt) => {
          cancelAnimation(orbitAngle);
          isWheelSpinning.value = false;
          runOnJS(setIsWheelSpinningState)(false);
          wheelVelocity.value = 0;
          wheelDragFrameCount.value = 0;

          const touch = evt.nativeEvent;
          const centerX = SCREEN_WIDTH / 2;
          const centerY = wheelTargetY;
          const dx = touch.pageX - centerX;
          const dy = touch.pageY - centerY;
          wheelStartAngle.value = Math.atan2(dy, dx);
          wheelLastAngle.value = wheelStartAngle.value;

          setSelectedWheelMoment(null);
          setSelectedWheelExam(null);
        },
        onPanResponderMove: (evt, gestureState) => {
          const touch = evt.nativeEvent;
          const centerX = SCREEN_WIDTH / 2;
          const centerY = wheelTargetY;
          const dx = touch.pageX - centerX;
          const dy = touch.pageY - centerY;
          const currentAngle = Math.atan2(dy, dx);

          // Calculate angle delta in radians
          let deltaAngle = currentAngle - wheelLastAngle.value;

          // Handle angle wrapping (when crossing -π/π boundary)
          if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
          if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

          // Increment frame counter for acceleration
          wheelDragFrameCount.value += 1;

          // Reach full sensitivity in ~80ms so wheel feels directly connected to finger
          const targetFrames = 5;
          const accelerationFactor = Math.min(
            1,
            wheelDragFrameCount.value / targetFrames,
          );
          const easedAcceleration = 1 - Math.pow(1 - accelerationFactor, 3);

          // Start at 80%, reach 100% in 5 frames — immediate response, smooth continuation
          const acceleratedDelta = deltaAngle * (0.8 + easedAcceleration * 0.2);

          // Convert to degrees for orbitAngle
          const deltaDeg = (acceleratedDelta * 180) / Math.PI;

          orbitAngle.value = orbitAngle.value + deltaDeg;
          wheelVelocity.value = deltaDeg; // Track velocity for momentum in degrees
          wheelLastAngle.value = currentAngle;
        },
        onPanResponderRelease: () => {
          wheelDragFrameCount.value = 0;
          const velocity = wheelVelocity.value;
          // Immediate continuation: keep wheel moving at release velocity while async runs
          // Use higher multiplier so small drags also feel continuous (avoids "slow then sudden" handoff)
          const continuationDeg = velocity * 250;
          orbitAngle.value = withTiming(orbitAngle.value + continuationDeg, {
            duration: 400,
            easing: Easing.linear,
          });
          // Lesson exam flow (rate limit, paywall) — startEntityWheelSpin will take over when ready
          void handleEntityWheelReleaseForLesson(velocity);
        },
      });
    }, [
      showEntityWheel,
      isFocused,
      isScreenActive,
      wheelVelocity,
      isWheelSpinning,
      wheelTargetY,
      fontScale,
      insets.bottom,
      orbitAngle,
      orbitDurationMs,
      wheelDragFrameCount,
      wheelLastAngle,
      wheelStartAngle,
      handleEntityWheelReleaseForLesson,
    ]);

    // No container rotation - each memory will animate individually
    // This is now just a placeholder for potential future container-level styles
    const memoriesOrbitRotation = useAnimatedStyle(() => {
      "worklet";
      // No transform - memories handle their own orbital movement
      return {};
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
      "worklet";
      // When dragging is enabled and not focused, use panX/panY directly
      if (enableDragging && !isFocused) {
        const floatOffset = floatAnimation.value * 6;
        return {
          transform: [
            { translateX: panX.value - position.x },
            { translateY: panY.value - position.y + floatOffset },
            { scale: zoomScale.value },
          ],
        };
      }

      // Interpolate position and scale based on zoom progress
      // When zoomProgress = 0: at start position (State A), scale = 1
      // When zoomProgress = 1: at center position (State B), scale = focusedScale

      // Use the stored start position instead of position prop to prevent flickering
      // This ensures we always animate from the correct starting point
      const startPosX = startX.value;
      const startPosY = startY.value;

      let currentX: number;
      let currentY: number;

      if (isFocused) {
        // Zoom-in: interpolate from start position to center
        currentX = startPosX + (targetX - startPosX) * zoomProgress.value;
        currentY = startPosY + (targetY - startPosY) * zoomProgress.value;
      } else {
        // Zoom-out: interpolate from center back to original position
        // Use focusedX/focusedY which are the current animated positions, not the prop
        // When zoomProgress = 1: at center (targetX, targetY)
        // When zoomProgress = 0: at original position (position.x, position.y)
        const endPosX = position.x;
        const endPosY = position.y;
        currentX =
          focusedX.value +
          (endPosX - focusedX.value) * (1 - zoomProgress.value);
        currentY =
          focusedY.value +
          (endPosY - focusedY.value) * (1 - zoomProgress.value);
      }

      if (isFocused) {
        // When focused, use interpolated position and scale (zoom-in effect)
        // Apply additional scaling for wheel mode (scale down further)
        const wheelScale = 1 - wheelModeProgress.value * 0.4; // Scale down by 40% in wheel mode
        const currentScale = zoomScale.value * wheelScale;
        // Use startPosX/Y instead of position.x/y to ensure we animate from the correct starting point
        return {
          transform: [
            { translateX: currentX - startPosX },
            { translateY: currentY - startPosY },
            { scale: currentScale },
          ],
        };
      }
      // When not focused, continue using interpolated values for smooth zoom-out
      // Add floating animation only when fully unfocused (zoomProgress = 0)
      const floatOffset =
        zoomProgress.value === 0 ? floatAnimation.value * 6 : 0;
      // Use the current animated position as reference, not the prop
      const refX = zoomProgress.value > 0 ? focusedX.value : position.x;
      const refY = zoomProgress.value > 0 ? focusedY.value : position.y;

      return {
        transform: [
          { translateX: currentX - refX },
          { translateY: currentY - refY + floatOffset },
          { scale: zoomScale.value },
        ],
      };
    });

    return (
      <View
        ref={viewShotRef}
        collapsable={false}
        style={{
          position: "absolute",
          left: captureWrapperBounds.left,
          top: captureWrapperBounds.top,
          width: captureWrapperBounds.width,
          height: captureWrapperBounds.height,
          pointerEvents: "box-none",
          backgroundColor: "transparent",
        }}
      >
        {/* Scattered white dots in background when in focused entity or entity wheel mode */}
        {isFocused && (
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            <SparkledDots
              avatarSize={avatarSize}
              avatarCenterX={focusedX}
              avatarCenterY={focusedY}
              colorScheme={colorScheme ?? "dark"}
              fullScreen={true}
            />
          </View>
        )}
        {/* Draggable container wrapping avatar and memories */}
        <Animated.View
          style={[
            {
              position: "absolute",
              zIndex: 100, // Much higher z-index to ensure avatars are always on top and interactive
              pointerEvents: "box-none", // Container doesn't block touches - children handle them
              width: SCREEN_WIDTH * 2, // Large enough to contain all memories
              height: SCREEN_HEIGHT * 2, // Large enough to contain all memories
              transform: [
                { translateX: captureTransform.translateX },
                { translateY: captureTransform.translateY },
                { scale: captureTransform.scale },
              ],
            },
            containerAnimatedStyle, // Use animated style for container position
            animatedStyle,
          ]}
        >
          {/* Avatar - centered in container at (SCREEN_WIDTH, SCREEN_HEIGHT) */}
          <Animated.View
            style={[
              {
                position: "absolute",
                left: SCREEN_WIDTH - avatarSize / 2,
                top: SCREEN_HEIGHT - avatarSize / 2,
                zIndex: 100,
                pointerEvents: "auto", // Avatar can receive touches
              },
            ]}
            {...(panResponder?.panHandlers || {})} // Attach panResponder to avatar, not container
          >
            <Pressable
              style={{ pointerEvents: "auto" }} // Always allow press events
              onPress={() => {
                // Only trigger onPress if we didn't drag
                // Use a small delay to check if drag started (PanResponder needs time to set the flag)
                setTimeout(() => {
                  if (!dragStartedRef.current && !isDragging.value) {
                    // If entity is focused, toggle entity wheel mode
                    if (isFocused) {
                      if (!entityWheelModeEnabled) return;
                      if (!canEnterEntityWheel) {
                        showEntityWheelGateToast();
                        if (memories.length > 0) {
                          const idx = Math.floor(
                            Math.random() * memories.length,
                          );
                          nudgeTargetIndex.value = idx;
                          cancelAnimation(nudgePulseScale);
                          nudgePulseScale.value = 1;
                          nudgePulseScale.value = withSequence(
                            withTiming(1.14, {
                              duration: 220,
                              easing: Easing.out(Easing.ease),
                            }),
                            withTiming(1, {
                              duration: 380,
                              easing: Easing.inOut(Easing.ease),
                            }),
                          );
                        }
                        return;
                      }
                      const nextWheelState = !showEntityWheel;
                      setShowEntityWheel(nextWheelState);
                      // Disable scroll immediately so wheel drag works (avoids ScrollView capturing vertical gestures)
                      onEntityWheelChange?.(nextWheelState);
                    } else {
                      onPress();
                    }
                  }
                }, 50);
              }}
            >
              {/* Circular progress bar border - with pulse animation */}
              <Animated.View
                style={[
                  {
                    width: avatarSize + borderWidth * 2,
                    height: avatarSize + borderWidth * 2,
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                  },
                  avatarPulseStyle,
                ]}
              >
                {/* SVG Progress Bar */}
                <Svg
                  width={avatarSize + borderWidth * 2}
                  height={avatarSize + borderWidth * 2}
                  style={{ position: "absolute" }}
                >
                  {/* Background circle (cloudy/dark) - thicker */}
                  <Circle
                    cx={(avatarSize + borderWidth * 2) / 2}
                    cy={(avatarSize + borderWidth * 2) / 2}
                    r={radius}
                    stroke={momentColors.cloudy.background}
                    strokeWidth={borderWidth + 2}
                    fill="none"
                  />
                  {/* Progress circle (sunny) */}
                  <Circle
                    cx={(avatarSize + borderWidth * 2) / 2}
                    cy={(avatarSize + borderWidth * 2) / 2}
                    r={radius}
                    stroke={momentColors.sunny.background}
                    strokeWidth={borderWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${(avatarSize + borderWidth * 2) / 2} ${(avatarSize + borderWidth * 2) / 2})`}
                  />
                </Svg>
                {/* Avatar content */}
                <View
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                    backgroundColor: colors.primary,
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  {profile.imageUri ? (
                    <Image
                      source={{ uri: profile.imageUri }}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: avatarSize / 2,
                      }}
                      contentFit="cover"
                    />
                  ) : (
                    <ThemedText
                      weight="bold"
                      style={{ color: "#fff", fontSize: 24 }}
                    >
                      {initials}
                    </ThemedText>
                  )}
                </View>

                {/* Drag handle icon overlay - shown when dragging is enabled and not focused */}
                {enableDragging && !isFocused && (
                  <Animated.View
                    style={[
                      {
                        position: "absolute",
                        top: -6,
                        right: -6,
                        backgroundColor: colors.primary,
                        borderRadius: 10,
                        padding: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 5,
                      },
                      dragHandleAnimatedStyle,
                    ]}
                  >
                    <MaterialIcons
                      name="drag-indicator"
                      size={16}
                      color="#fff"
                    />
                  </Animated.View>
                )}
              </Animated.View>
            </Pressable>

            {/* Share button - positioned outside the Pressable, shown when entity is focused and has memories (but not in entity wheel mode) */}
            {isFocused &&
              memories.length > 0 &&
              !isCapturingImage &&
              !showEntityWheel && (
                <>
                  <Pressable
                    onPress={() => setShowShareMenu(!showShareMenu)}
                    style={{
                      position: "absolute",
                      top: 8, // Position at top-right corner, very close to avatar
                      left: avatarSize + borderWidth * 2 - 24, // Position very close to avatar's right edge
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.15)"
                          : "rgba(0, 0, 0, 0.5)",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 20,
                      borderWidth: 2,
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.3)"
                          : "rgba(255, 255, 255, 0.8)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 5,
                    }}
                  >
                    <MaterialIcons name="share" size={24} color="#fff" />
                  </Pressable>

                  {/* Share Menu */}
                  {showShareMenu && (
                    <View
                      style={{
                        position: "absolute",
                        top: 50, // Closer to share button
                        right: -10, // Align right edge with share button
                        backgroundColor:
                          colorScheme === "dark"
                            ? "rgba(26, 35, 50, 0.98)"
                            : "rgba(255, 255, 255, 0.98)",
                        borderRadius: 16,
                        padding: 4,
                        zIndex: 21,
                        borderWidth: 1,
                        borderColor:
                          colorScheme === "dark"
                            ? "rgba(100, 181, 246, 0.3)"
                            : "rgba(100, 181, 246, 0.2)",
                        shadowColor:
                          colorScheme === "dark" ? Colors.dark.primary : "#000",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: colorScheme === "dark" ? 0.4 : 0.25,
                        shadowRadius: 16,
                        elevation: 12,
                        minWidth: 200,
                        maxWidth: SCREEN_WIDTH - 48,
                        overflow: "hidden",
                      }}
                    >
                      <Pressable
                        onPress={async () => {
                          try {
                            // Format all memories for this entity as text
                            const entityName = profile.name || "Entity";
                            let message = `${entityName}\n\n`;

                            memories.forEach((memory, index) => {
                              message += `${index + 1}. ${memory.title || "Memory"}\n`;

                              if (
                                memory.goodFacts &&
                                memory.goodFacts.length > 0
                              ) {
                                message += "   ☀️ Sunny Moments:\n";
                                memory.goodFacts.forEach(
                                  (fact: any, factIndex: number) => {
                                    const text =
                                      typeof fact === "string"
                                        ? fact
                                        : fact.text ||
                                          fact.content ||
                                          String(fact);
                                    message += `   ${factIndex + 1}. ${text}\n`;
                                  },
                                );
                              }

                              if (
                                memory.hardTruths &&
                                memory.hardTruths.length > 0
                              ) {
                                message += "   ☁️ Hard Truths:\n";
                                memory.hardTruths.forEach(
                                  (truth: any, truthIndex: number) => {
                                    const text =
                                      typeof truth === "string"
                                        ? truth
                                        : truth.text ||
                                          truth.content ||
                                          String(truth);
                                    message += `   ${truthIndex + 1}. ${text}\n`;
                                  },
                                );
                              }

                              if (
                                memory.lessonsLearned &&
                                memory.lessonsLearned.length > 0
                              ) {
                                message += "   💡 Lessons Learned:\n";
                                memory.lessonsLearned.forEach(
                                  (lesson: any, lessonIndex: number) => {
                                    const text =
                                      typeof lesson === "string"
                                        ? lesson
                                        : lesson.text ||
                                          lesson.content ||
                                          String(lesson);
                                    message += `   ${lessonIndex + 1}. ${text}\n`;
                                  },
                                );
                              }

                              message += "\n";
                            });

                            // Open modal with content
                            setShareModalContent({
                              title: entityName,
                              message: message.trim(),
                            });
                            setShareModalVisible(true);
                            setShowShareMenu(false);
                          } catch (error) {
                            logError("HomeScreen:ShareContentText", error);
                          }
                        }}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 14,
                          marginVertical: 2,
                          marginHorizontal: 4,
                          borderRadius: 12,
                          backgroundColor: pressed
                            ? colorScheme === "dark"
                              ? "rgba(100, 181, 246, 0.15)"
                              : "rgba(100, 181, 246, 0.1)"
                            : "transparent",
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(100, 181, 246, 0.15)"
                                : "rgba(100, 181, 246, 0.1)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MaterialIcons
                            name="text-fields"
                            size={20}
                            color={Colors.dark.primary}
                          />
                        </View>
                        <View
                          style={{
                            flex: 1,
                            flexShrink: 1,
                            minWidth: 0,
                            marginLeft: 12,
                            justifyContent: "center",
                          }}
                        >
                          <ThemedText
                            size="sm"
                            style={{ fontWeight: "500" }}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            Share as Text
                          </ThemedText>
                        </View>
                      </Pressable>

                      <View
                        style={{
                          height: 1,
                          backgroundColor:
                            colorScheme === "dark"
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(0, 0, 0, 0.05)",
                          marginHorizontal: 8,
                          marginVertical: 4,
                        }}
                      />

                      <Pressable
                        onPress={async () => {
                          try {
                            setShowShareMenu(false);
                            setShowGifAnimation(true);
                          } catch (error) {
                            logError("HomeScreen:ShareAnimation", error);
                          }
                        }}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 14,
                          marginVertical: 2,
                          marginHorizontal: 4,
                          borderRadius: 12,
                          backgroundColor: pressed
                            ? colorScheme === "dark"
                              ? "rgba(100, 181, 246, 0.15)"
                              : "rgba(100, 181, 246, 0.1)"
                            : "transparent",
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(100, 181, 246, 0.15)"
                                : "rgba(100, 181, 246, 0.1)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MaterialIcons
                            name="videocam"
                            size={20}
                            color={Colors.dark.primary}
                          />
                        </View>
                        <View
                          style={{
                            flex: 1,
                            flexShrink: 1,
                            minWidth: 0,
                            marginLeft: 12,
                            justifyContent: "center",
                          }}
                        >
                          <ThemedText
                            size="sm"
                            style={{ fontWeight: "500" }}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {`View ${profile.name}'s Story`}
                          </ThemedText>
                        </View>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
          </Animated.View>

          {/* Floating Memories around Avatar */}
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                width: SCREEN_WIDTH * 2,
                height: SCREEN_HEIGHT * 2,
                pointerEvents:
                  showEntityWheel && isFocused ? "auto" : "box-none",
              },
              memoriesOrbitRotation,
            ]}
            {...(() => {
              const handlers =
                showEntityWheel && isFocused && wheelPanResponder
                  ? wheelPanResponder.panHandlers
                  : {};
              return handlers;
            })()}
          >
            {useMemo(() => {
              // Always show all memories - they should be visible around profiles at all times
              const filteredMemories = memories.filter((memory) => {
                // If a memory is focused, only show that specific memory
                if (focusedMemory) {
                  const mem = focusedMemory as {
                    profileId?: string;
                    jobId?: string;
                    familyMemberId?: string;
                    friendId?: string;
                    hobbyId?: string;
                    memoryId: string;
                    sphere: LifeSphere;
                  };
                  if (
                    mem.profileId === profile.id ||
                    mem.jobId === profile.id ||
                    mem.familyMemberId === profile.id ||
                    mem.friendId === profile.id ||
                    mem.hobbyId === profile.id
                  ) {
                    // Show only the focused memory for this entity
                    return mem.memoryId === memory.id;
                  }
                  // If focused memory belongs to a different entity, hide all memories
                  return false;
                }
                // If nothing is focused, show all memories (they should always be visible)
                return true;
              });

              // Memoize position objects to prevent unnecessary re-renders
              const positionX = position.x;
              const positionY = position.y;

              const renderedMemories = filteredMemories.map(
                (memory, memIndex) => {
                  // Find the original index in the full memories array for position calculation
                  const originalIndex = memories.findIndex(
                    (m) => m.id === memory.id,
                  );
                  const memPosData = memoryPositions[originalIndex];

                  // Safety check: if we have more memories than animated values, use the last available one
                  const memAnimatedValues =
                    memoryAnimatedValues[originalIndex] ||
                    memoryAnimatedValues[memoryAnimatedValues.length - 1];

                  // Memories are now positioned relative to the draggable container
                  // The container is positioned at (position.x - avatarSize/2, position.y - avatarSize/2)
                  // Container size is SCREEN_WIDTH * 2 x SCREEN_HEIGHT * 2
                  // Container center is at (SCREEN_WIDTH, SCREEN_HEIGHT) within the container
                  // Avatar is centered at (SCREEN_WIDTH, SCREEN_HEIGHT)
                  // So memories should be positioned relative to the container center
                  const initialMemPos = {
                    x: SCREEN_WIDTH + memPosData.offsetX,
                    y: SCREEN_HEIGHT + memPosData.offsetY,
                  };

                  // Calculate maximum memory size based on viewport constraints
                  // Worst case: memory at memoryRadius from avatar, with moments orbiting at maxMomentRadius from memory
                  // We need to ensure the entire EX zone fits: avatar + memoryRadius + memorySize/2 + maxMomentRadius + maxMomentSize/2 <= viewport edge
                  // Scale moment sizes for tablets (50% larger)
                  const cloudSize = isFocused
                    ? isTablet
                      ? 18
                      : 12
                    : isTablet
                      ? 36
                      : 24;
                  const sunSize = isFocused
                    ? isTablet
                      ? 15
                      : 10
                    : isTablet
                      ? 33
                      : 22;
                  const maxMomentSize = Math.max(cloudSize, sunSize);
                  // Calculate moment radius to ensure moments are outside memory circle border
                  // Use estimated memory size for calculation (will be refined later)
                  // Estimate: when focused, memory is ~32-42% of avatar size, when unfocused it's ~40-75px
                  const estimatedMemorySize = isFocused
                    ? focusedAvatarSize * 0.37 // Average of 32% and 42%
                    : isTablet
                      ? 60
                      : 40; // Average estimate for unfocused
                  const estimatedMemoryRadius = estimatedMemorySize / 2;
                  const momentSize = isFocused
                    ? isTablet
                      ? 18
                      : 12
                    : isTablet
                      ? 36
                      : 24;
                  const momentRadiusSize = momentSize / 2;
                  const momentPadding = 8; // Padding to ensure moments are clearly outside memory border

                  // Base radius: memory radius + moment radius + padding
                  const baseMomentRadius =
                    estimatedMemoryRadius + momentRadiusSize + momentPadding;

                  const cloudRadius = isFocused
                    ? isTablet
                      ? baseMomentRadius + 20
                      : baseMomentRadius + 15
                    : isTablet
                      ? 38
                      : 25;
                  const sunRadius = isFocused
                    ? isTablet
                      ? baseMomentRadius + 18
                      : baseMomentRadius + 13
                    : isTablet
                      ? 33
                      : 22;
                  const maxMomentRadius = Math.max(cloudRadius, sunRadius);

                  // Calculate distances from memory center to nearest viewport edges
                  // This ensures each memory fits within the viewport
                  // Memories are positioned relative to container center (avatarSize/2, avatarSize/2)
                  // But we need to calculate distances in screen coordinates
                  // Container is at (position.x - avatarSize/2, position.y - avatarSize/2)
                  // Memory center in screen coordinates = container position + memory position relative to container
                  const memoryCenterX = positionX + memPosData.offsetX;
                  const memoryCenterY = positionY + memPosData.offsetY;
                  const distanceToLeft = memoryCenterX;
                  const distanceToRight = SCREEN_WIDTH - memoryCenterX;
                  const distanceToTop = memoryCenterY;
                  const distanceToBottom = SCREEN_HEIGHT - memoryCenterY;
                  const minDistanceToEdge = Math.min(
                    distanceToLeft,
                    distanceToRight,
                    distanceToTop,
                    distanceToBottom,
                  );

                  // Calculate maximum memory size that fits for this specific memory position
                  // Total distance from memory center to furthest moment edge = memorySize/2 + maxMomentRadius + maxMomentSize/2
                  // We need: memorySize/2 + maxMomentRadius + maxMomentSize/2 <= minDistanceToEdge
                  // Solving for memorySize: memorySize <= 2 * (minDistanceToEdge - maxMomentRadius - maxMomentSize/2 - padding)
                  const padding = 30; // Extra safety padding to ensure nothing goes outside viewport
                  const availableSpace =
                    minDistanceToEdge -
                    maxMomentRadius -
                    maxMomentSize / 2 -
                    padding;
                  // Cap the maximum memory size - when focused, max should be around 50px (half of previous)
                  const maxAllowedSize = isFocused
                    ? focusedAvatarSize * 0.5
                    : 100; // 50px when focused, 100px otherwise
                  const calculatedMaxMemorySize = Math.max(
                    20,
                    Math.min(availableSpace * 2, maxAllowedSize),
                  );

                  // Calculate moment count for this memory to scale size
                  const momentCount =
                    (memory.hardTruths || []).length +
                    (memory.goodFacts || []).length +
                    (memory.lessonsLearned || []).length;

                  // Calculate min and max moment counts across all memories for scaling
                  const allMomentCounts = memories.map(
                    (m) =>
                      (m.hardTruths || []).length +
                      (m.goodFacts || []).length +
                      (m.lessonsLearned || []).length,
                  );
                  const minMomentsCount = Math.min(...allMomentCounts, 0);
                  const maxMomentsCount = Math.max(...allMomentCounts, 1);

                  // Scale memory size based on moment count when focused
                  let baseMemorySize: number;
                  if (isFocused) {
                    // Base size is 32% of focused avatar size (32px - slightly bigger than before)
                    const baseSize = focusedAvatarSize * 0.32; // 32px (increased from 30px)

                    if (maxMomentsCount > minMomentsCount) {
                      // Scale from base size (32px) to up to 42% of avatar size (42px) based on moment count
                      // More moments = bigger memory, but keep it smaller than avatar
                      const momentsFactor =
                        (momentCount - minMomentsCount) /
                        (maxMomentsCount - minMomentsCount);
                      // Scale from 32px (fewest moments) to 42px (most moments, 42% of avatar)
                      const maxSize = focusedAvatarSize * 0.42; // 42px (42% of 100px avatar, increased from 38px)
                      baseMemorySize =
                        baseSize + momentsFactor * (maxSize - baseSize); // Range: 32 to 42
                    } else {
                      // All memories have same moment count, use base size (32% of avatar)
                      baseMemorySize = baseSize; // 32px
                    }
                  } else {
                    // Not focused, use smaller size (scale for tablets)
                    baseMemorySize = isTablet ? 75 : 40; // Smaller on non-tablet devices
                  }

                  const memorySize =
                    Math.min(baseMemorySize, calculatedMaxMemorySize) *
                    (memPosData.sizeMultiplier ?? 1);

                  return (
                    <FloatingMemory
                      key={`memory-${memory.id}-${memIndex}`}
                      memory={memory}
                      position={initialMemPos}
                      avatarPanX={memAnimatedValues.panX}
                      avatarPanY={memAnimatedValues.panY}
                      focusedX={focusedX}
                      focusedY={focusedY}
                      offsetX={memPosData.offsetX}
                      offsetY={memPosData.offsetY}
                      baseOrbitAngle={memPosData.angle} // Base angle for this memory's orbit position
                      orbitAngle={orbitAngle} // Animated orbit angle shared by all memories
                      entityHintRotation={entityHintRotation}
                      showEntityWheelShared={showEntityWheelShared}
                      isFocused={isFocused}
                      colorScheme={colorScheme}
                      calculatedMemorySize={memorySize}
                      isMemoryFocused={
                        (focusedMemory?.profileId === profile.id ||
                          focusedMemory?.jobId === profile.id) &&
                        focusedMemory?.memoryId === memory.id
                      }
                      memorySlideOffset={memorySlideOffset}
                      showEntityWheel={showEntityWheel} // Pass showEntityWheel for synchronous checking
                      showEntityWheelRef={showEntityWheelRef} // Pass ref for absolute latest value
                      onPress={showEntityWheel ? undefined : onPress}
                      onMemoryFocus={
                        showEntityWheel ? undefined : onMemoryFocus
                      }
                      zoomProgress={zoomProgress}
                      avatarStartX={startX}
                      avatarStartY={startY}
                      avatarTargetX={targetX}
                      avatarTargetY={targetY}
                      avatarPosition={position}
                      focusedMemory={focusedMemory}
                      nudgeTargetIndex={nudgeTargetIndex}
                      nudgePulseScale={nudgePulseScale}
                      memorySlotIndex={originalIndex}
                    />
                  );
                },
              );

              return renderedMemories;
              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [
              memories,
              focusedMemory,
              profile.id,
              isFocused,
              showEntityWheel,
              memoryPositions,
              memoryAnimatedValues,
              position.x,
              position.y,
              startX,
              startY,
              targetX,
              targetY,
              zoomProgress,
              colorScheme,
              memorySlideOffset,
              onPress,
              onMemoryFocus,
              nudgeTargetIndex,
              nudgePulseScale,
            ])}
          </Animated.View>

          {/* Usability finger toward a memory when entity wheel is gated off (add moments) */}
          {isFocused &&
            !canEnterEntityWheel &&
            memories.length > 0 &&
            !showEntityWheel &&
            appUsabilityHints &&
            !avatarClickHintDismissed &&
            (() => {
              const hintIdx = Math.min(
                usabilityHintMemoryIndex,
                Math.max(0, memoryPositions.length - 1),
              );
              const memPos = memoryPositions[hintIdx];
              if (!memPos) return null;
              const pointerSize = isTablet ? 88 : 78;
              const estMemSize = focusedAvatarSize * 0.37;
              const memCenterY = SCREEN_HEIGHT + memPos.offsetY;
              const fingerTop = memCenterY + estMemSize / 2 - pointerSize + 55;
              return (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    {
                      position: "absolute",
                      left: SCREEN_WIDTH + memPos.offsetX - pointerSize / 2,
                      top: fingerTop,
                      width: pointerSize,
                      height: pointerSize,
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 396,
                    },
                    avatarClickHintAnimatedStyle,
                  ]}
                >
                  <MaterialIcons
                    name="touch-app"
                    size={pointerSize}
                    color="rgba(0, 0, 0, 0.5)"
                    style={{
                      position: "absolute",
                      left: 2,
                      top: 2,
                    }}
                  />
                  <MaterialIcons
                    name="touch-app"
                    size={pointerSize}
                    color="#FFFFFF"
                  />
                </Animated.View>
              );
            })()}
        </Animated.View>

        {/* Share Modal */}
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          title={shareModalContent.title}
          content={shareModalContent.message}
        />

        {/* Entity wheel gating: in-app notice when the wheel is not unlocked yet */}
        <Modal
          visible={entityWheelGateToastVisible && isFocused}
          transparent={true}
          animationType="fade"
          onRequestClose={dismissEntityWheelGateToast}
        >
          <View
            pointerEvents="box-none"
            style={{
              flex: 1,
              paddingTop: insets.top + 12,
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                gap: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor:
                  colorScheme === "dark"
                    ? "rgba(90, 170, 255, 0.55)"
                    : "rgba(33, 150, 243, 0.34)",
                borderLeftWidth: 4,
                borderLeftColor:
                  colorScheme === "dark"
                    ? "rgba(125, 195, 255, 1)"
                    : "rgba(30, 136, 229, 0.98)",
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(10, 35, 66, 0.97)"
                    : "rgba(227, 242, 253, 0.98)",
                paddingVertical: 12,
                paddingLeft: 14,
                paddingRight: 8,
                ...Platform.select({
                  android: { elevation: 4 },
                  default: {
                    shadowColor:
                      colorScheme === "dark" ? Colors.dark.primary : "rgba(25, 118, 210, 0.7)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: colorScheme === "dark" ? 0.18 : 0.1,
                    shadowRadius: 10,
                  },
                }),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(120, 193, 255, 0.24)"
                          : "rgba(33, 150, 243, 0.2)",
                    }}
                  >
                    <MaterialIcons
                      name="info-outline"
                      size={18}
                      color={
                        colorScheme === "dark"
                          ? "rgba(191, 227, 255, 1)"
                          : "rgba(13, 71, 161, 0.95)"
                      }
                    />
                  </View>
                  <ThemedText
                    type="defaultSemiBold"
                    size="sm"
                    style={{
                      color:
                        colorScheme === "dark"
                          ? "rgba(222, 240, 255, 0.99)"
                          : "rgba(10, 79, 157, 0.98)",
                    }}
                  >
                    {t("home.entityWheel.gateTitle")}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={dismissEntityWheelGateToast}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      colorScheme === "dark"
                        ? "rgba(120, 193, 255, 0.2)"
                        : "rgba(33, 150, 243, 0.16)",
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={
                      colorScheme === "dark"
                        ? "rgba(220, 240, 255, 0.95)"
                        : "rgba(15, 88, 165, 0.78)"
                    }
                  />
                </Pressable>
              </View>

              <ThemedText
                size="sm"
                style={{
                  lineHeight: 24,
                  color:
                    colorScheme === "dark"
                      ? "rgba(215, 234, 252, 0.92)"
                      : "rgba(27, 94, 170, 0.92)",
                }}
              >
                {t("home.entityWheel.gateMessage", {
                  minMemories: ENTITY_WHEEL_MIN_MEMORIES,
                  minMoments: ENTITY_WHEEL_MIN_TOTAL_MOMENTS,
                  currentMemories: memories.length,
                  currentMoments: totalMoments,
                })}
              </ThemedText>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor:
                      colorScheme === "dark"
                        ? "rgba(120, 193, 255, 0.14)"
                        : "rgba(33, 150, 243, 0.12)",
                  }}
                >
                  <MaterialIcons
                    name="auto-stories"
                    size={14}
                    color={
                      colorScheme === "dark"
                        ? "rgba(200, 232, 255, 0.95)"
                        : "rgba(15, 88, 165, 0.85)"
                    }
                  />
                  <ThemedText
                    size="xs"
                    style={{
                      color:
                        colorScheme === "dark"
                          ? "rgba(222, 241, 255, 0.95)"
                          : "rgba(15, 88, 165, 0.85)",
                    }}
                  >
                    {`${Math.min(memories.length, ENTITY_WHEEL_MIN_MEMORIES)}/${ENTITY_WHEEL_MIN_MEMORIES}`}
                  </ThemedText>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor:
                      colorScheme === "dark"
                        ? "rgba(120, 193, 255, 0.14)"
                        : "rgba(33, 150, 243, 0.12)",
                  }}
                >
                  <MaterialIcons
                    name="flare"
                    size={14}
                    color={
                      colorScheme === "dark"
                        ? "rgba(200, 232, 255, 0.95)"
                        : "rgba(15, 88, 165, 0.85)"
                    }
                  />
                  <ThemedText
                    size="xs"
                    style={{
                      color:
                        colorScheme === "dark"
                          ? "rgba(222, 241, 255, 0.95)"
                          : "rgba(15, 88, 165, 0.85)",
                    }}
                  >
                    {`${Math.min(totalMoments, ENTITY_WHEEL_MIN_TOTAL_MOMENTS)}/${ENTITY_WHEEL_MIN_TOTAL_MOMENTS}`}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          visible={imagePreviewUri !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImagePreviewUri(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {imagePreviewUri && (
              <>
                <Image
                  source={{ uri: imagePreviewUri }}
                  style={{
                    width: SCREEN_WIDTH * 0.9,
                    height: SCREEN_HEIGHT * 0.7,
                    borderRadius: 12,
                  }}
                  contentFit="contain"
                />

                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 24,
                    gap: 16,
                  }}
                >
                  <Pressable
                    onPress={() => setImagePreviewUri(null)}
                    style={{
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.2)"
                          : "rgba(0, 0, 0, 0.3)",
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.3)"
                          : "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    <ThemedText
                      style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                    >
                      Cancel
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      try {
                        if (imagePreviewUri) {
                          await Sharing.shareAsync(imagePreviewUri, {
                            mimeType: "image/png",
                            dialogTitle: "Share image",
                          });
                          setImagePreviewUri(null);
                        }
                      } catch (error) {
                        logError("HomeScreen:SharePreviewImage", error);
                      }
                    }}
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 24,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 5,
                    }}
                  >
                    <ThemedText
                      style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                    >
                      Share
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Modal>

        {/* GIF Animation Preview Modal */}
        <Modal
          visible={showGifAnimation}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGifAnimation(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.95)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {profile && (
              <GifAnimationPreview
                entity={{
                  id: profile.id,
                  name: profile.name,
                  imageUri: profile.imageUri,
                  type: profile.type || "relationship",
                }}
                memories={memories}
                onClose={() => setShowGifAnimation(false)}
              />
            )}
          </View>
        </Modal>

        {/* Avatar click hint: finger below avatar pointing at its bottom (individual entity view, pre-wheel) */}
        {isFocused &&
          entityAvatarPressHintEnabled &&
          canEnterEntityWheel &&
          !showEntityWheel &&
          appUsabilityHints &&
          !avatarClickHintDismissed &&
          (() => {
            const normalTargetY = SCREEN_HEIGHT / 2 + 80;
            const focusedAvatarSize = isTablet ? 150 : 120;
            const pointerSize = isTablet ? 88 : 78;
            const avatarTop = normalTargetY - (focusedAvatarSize + 12) / 2;
            const avatarBottom = avatarTop + (focusedAvatarSize + 12);
            const fingerTop = avatarBottom - pointerSize + 55;

            return (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    left: SCREEN_WIDTH / 2 - pointerSize / 2,
                    top: fingerTop,
                    width: pointerSize,
                    height: pointerSize,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 395,
                  },
                  avatarClickHintAnimatedStyle,
                ]}
              >
                {/* Shadow layer for better contrast */}
                <MaterialIcons
                  name="touch-app"
                  size={pointerSize}
                  color="rgba(0, 0, 0, 0.5)"
                  style={{
                    position: "absolute",
                    left: 2,
                    top: 2,
                  }}
                />
                <MaterialIcons
                  name="touch-app"
                  size={pointerSize}
                  color="#FFFFFF"
                />
              </Animated.View>
            );
          })()}

        {/* Entity Wheel of Life — wheel mode when entity circle is focused (orbit + sunny/cloudy % + lesson/sunny/cloudy buttons) */}
        {/* Wheel Mode UI - moment type icons positioned around entity like wheel of life */}
        {entityWheelModeEnabled && showEntityWheel && isFocused && (
          <View
            style={{
              position: "absolute",
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              alignItems: "center",
              pointerEvents: "box-none",
              zIndex: 400,
            }}
          >
            {/* Spiraling icons - appears during entity wheel spin and on correct exam answer */}
            <SpiralingStars
              avatarCenterX={starCenterX}
              avatarCenterY={starCenterY}
              isSpinning={isWheelSpinning}
              celebrationSpinning={entityCelebrationSparksVisible}
              colorScheme={colorScheme ?? "dark"}
              momentType={
                selectedMomentType === "lesson"
                  ? "lessons"
                  : selectedMomentType === "sunny"
                    ? "sunnyMoments"
                    : "hardTruths"
              }
            />

            {/* 3 moment type icons at bottom - matching wheel of life liquid glass style */}
            {(() => {
              const tabBarHeight =
                Math.round(78 * fontScale) +
                Math.max(12, insets.bottom + 12 - 20 * fontScale);
              const iconY = SCREEN_HEIGHT - tabBarHeight - 60; // Moved up: 60px above tab bar (was 20px)
              const iconSize = 60; // Match main wheel size
              const spacing = 85; // Space between icons

              // Get button styles based on type
              const getButtonStyle = (type: "lesson" | "sunny" | "cloudy") => {
                if (type === "lesson") return entityLessonButtonStyle;
                if (type === "sunny") return entitySunnyButtonStyle;
                return entityCloudyButtonStyle;
              };

              const getHighlightStyle = (
                type: "lesson" | "sunny" | "cloudy",
              ) => {
                if (type === "lesson") return entityLessonHighlightStyle;
                if (type === "sunny") return entitySunnyHighlightStyle;
                return entityCloudyHighlightStyle;
              };

              const getPressScaleValue = (
                type: "lesson" | "sunny" | "cloudy",
              ) => {
                if (type === "lesson") return entityLessonButtonPressScale;
                if (type === "sunny") return entitySunnyButtonPressScale;
                return entityCloudyButtonPressScale;
              };

              const getHighlightValue = (
                type: "lesson" | "sunny" | "cloudy",
              ) => {
                if (type === "lesson") return entityLessonButtonHighlight;
                if (type === "sunny") return entitySunnyButtonHighlight;
                return entityCloudyButtonHighlight;
              };

              // Position icons horizontally at bottom
              const icons = [
                {
                  type: "lesson" as const,
                  icon: "emoji-objects" as const,
                  count: momentCounts.lesson,
                },
                {
                  type: "sunny" as const,
                  icon: "wb-sunny" as const,
                  count: momentCounts.sunny,
                },
                {
                  type: "cloudy" as const,
                  icon: "cloud-queue" as const,
                  count: momentCounts.cloudy,
                },
              ];

              return (
                <>
                  {/* Entity wheel spin hint: arc-following finger on orbit ring */}
                  {!isWheelSpinningState &&
                    appUsabilityHints &&
                    !entityWheelSpinLabelDismissed &&
                    (() => {
                      const pointerSize = isTablet ? 56 : 52;
                      const centerX = SCREEN_WIDTH / 2;
                      const centerY = SCREEN_HEIGHT * 0.58;
                      return (
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            {
                              position: "absolute",
                              left: centerX - pointerSize / 2,
                              top: centerY - pointerSize / 2,
                              width: pointerSize,
                              height: pointerSize,
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 500,
                            },
                            entitySpinHintPointerAnimatedStyle,
                          ]}
                        >
                          <MaterialIcons
                            name="touch-app"
                            size={pointerSize}
                            color="rgba(0, 0, 0, 0.5)"
                            style={{ position: "absolute", left: 2, top: 2 }}
                          />
                          <MaterialIcons
                            name="touch-app"
                            size={pointerSize}
                            color="#FFFFFF"
                          />
                        </Animated.View>
                      );
                    })()}
                  {!isWheelSpinningState &&
                    icons.map((item, index) => {
                      const x = SCREEN_WIDTH / 2 - spacing + index * spacing;
                      const y = iconY;
                      const hasNoMoments = item.count === 0;
                      const isPressBlocked = expandedMomentId !== null;
                      const isDisabled = hasNoMoments || isPressBlocked;

                      return (
                        <Animated.View
                          key={item.type}
                          pointerEvents="auto"
                          style={[
                            {
                              position: "absolute",
                              left: x - iconSize / 2,
                              top: y - iconSize / 2,
                              width: iconSize,
                              height: iconSize,
                              borderRadius: iconSize / 2,
                              overflow: "hidden",
                              opacity: isDisabled ? 0.3 : 1,
                              zIndex: 500,
                            },
                            getButtonStyle(item.type),
                          ]}
                        >
                          {/* Cosmic frosted glass - lighter when unselected (match main wheel) */}
                          <View style={StyleSheet.absoluteFillObject}>
                            <LinearGradient
                              colors={momentWheelGlassGradient(
                                item.type === "lesson"
                                  ? momentColors.lesson.background
                                  : item.type === "sunny"
                                    ? momentColors.sunny.background
                                    : momentColors.cloudy.background,
                                selectedMomentType === item.type,
                                colorScheme ?? "dark",
                              )}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFillObject}
                            />
                          </View>

                          {/* Hue ring overlay (Moments Colors, not cosmic purple/teal) */}
                          <Animated.View
                            style={[
                              StyleSheet.absoluteFillObject,
                              getGradientOverlayStyle(item.type),
                            ]}
                            pointerEvents="none"
                          >
                            <LinearGradient
                              colors={momentWheelRingGradient(
                                item.type === "lesson"
                                  ? momentColors.lesson.background
                                  : item.type === "sunny"
                                    ? momentColors.sunny.background
                                    : momentColors.cloudy.background,
                              )}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFillObject}
                            />
                          </Animated.View>

                          {/* Specular highlight overlay (liquid glass shine) */}
                          <Animated.View
                            style={[
                              StyleSheet.absoluteFillObject,
                              getHighlightStyle(item.type),
                            ]}
                          >
                            <LinearGradient
                              colors={[
                                "rgba(255,255,255,0.6)",
                                "rgba(255,255,255,0)",
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFillObject}
                            />
                          </Animated.View>

                          <Pressable
                            onPress={() => {
                              if (isPressBlocked) return;
                              if (hasNoMoments) {
                                triggerNoMomentsHaptic();
                                return;
                              }
                              setSelectedMomentType(item.type);
                            }}
                            onPressIn={() => {
                              if (!isDisabled) {
                                getPressScaleValue(item.type).value =
                                  withTiming(0.88, {
                                    duration: 100,
                                    easing: Easing.out(Easing.ease),
                                  });
                                getHighlightValue(item.type).value = withTiming(
                                  1,
                                  {
                                    duration: 150,
                                    easing: Easing.out(Easing.ease),
                                  },
                                );
                              }
                            }}
                            onPressOut={() => {
                              if (!isDisabled) {
                                getPressScaleValue(item.type).value =
                                  withSpring(1, {
                                    damping: 10,
                                    stiffness: 300,
                                  });
                                getHighlightValue(item.type).value = withTiming(
                                  0,
                                  {
                                    duration: 300,
                                    easing: Easing.out(Easing.ease),
                                  },
                                );
                              }
                            }}
                            disabled={isPressBlocked}
                            style={{
                              width: "100%",
                              height: "100%",
                              alignItems: "center",
                              justifyContent: "center",
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity:
                                selectedMomentType === item.type ? 0.3 : 0.1,
                              shadowRadius: 4,
                              elevation:
                                selectedMomentType === item.type ? 5 : 2,
                            }}
                          >
                            <MaterialIcons
                              name={item.icon}
                              size={28}
                              color={
                                isDisabled
                                  ? colors.textTertiary
                                  : item.type === "lesson"
                                    ? blendHex(
                                        momentColors.lesson.background,
                                        COSMIC_RING_START,
                                        0.28,
                                      )
                                    : item.type === "sunny"
                                      ? momentColors.sunny.background
                                      : momentColors.cloudy.background
                              }
                            />
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                </>
              );
            })()}

            {/* Floating moments that grow from memories */}
            {floatingMoments.map((moment) => (
              <FloatingMomentFromMemory
                key={`floating-moment-${moment.memoryIndex}-${moment.momentIndex}-${moment.momentType}`}
                memoryIndex={moment.memoryIndex}
                momentIndex={moment.momentIndex}
                totalMoments={
                  memories[moment.memoryIndex]?.[
                    moment.momentType === "lesson"
                      ? "lessonsLearned"
                      : moment.momentType === "sunny"
                        ? "goodFacts"
                        : "hardTruths"
                  ]?.length || 1
                }
                momentType={moment.momentType}
                colorScheme={colorScheme ?? "dark"}
                text={moment.text}
                isTablet={isTablet}
                isLargeDevice={isLargeDevice}
                orbitAngle={orbitAngle}
                starCenterX={starCenterX}
                starCenterY={starCenterY}
                focusedX={focusedX}
                focusedY={focusedY}
                panX={panX}
                panY={panY}
                memoriesCount={memories.length}
                memoryOffsetX={moment.memoryOffsetX}
                memoryOffsetY={moment.memoryOffsetY}
                memoryBaseAngle={moment.memoryBaseAngle}
                showEntityWheelShared={showEntityWheelShared}
                spawnSlot={moment.spawnSlot}
                batchSize={moment.batchSize}
                cycleId={moment.cycleId}
                angleJitter={moment.angleJitter ?? 0}
                bottomInset={
                  Math.round(78 * fontScale) +
                  Math.max(12, insets.bottom + 12 - 20 * fontScale)
                }
                momentId={moment.id}
                isExpanded={expandedMomentId === moment.id}
                momentsFrozen={expandedMomentId !== null || !isScreenActive}
                spawnTime={moment.spawnTime}
                expandedAtTimestamp={expandedAtTimestampRef.current}
                suppressExpandAnimation={
                  entityWheelMomentCard !== null || selectedWheelMoment !== null
                }
                onExpand={(id) => {
                  expandedAtTimestampRef.current = Date.now();
                  setExpandedMomentId(id);
                  setEntityWheelMomentCard({
                    type: moment.momentType,
                    text: moment.text ?? "",
                    memoryId: moment.memoryId,
                    memoryImageUri: moment.memoryImageUri,
                    entityId: moment.entityId ?? profile.id,
                    sphere: moment.sphere ?? profile.sphere,
                  });
                }}
                onCollapse={() => {
                  setExpandedMomentId(null);
                  setEntityWheelMomentCard(null);
                }}
                onMemoryImagePress={
                  onMemoryFocus &&
                  moment.entityId &&
                  moment.memoryId &&
                  moment.sphere
                    ? () => {
                        startTransitionLoader();
                        requestAnimationFrame(() => {
                          setTimeout(() => {
                            setExpandedMomentId(null);
                            onMemoryFocus(
                              moment.entityId!,
                              moment.memoryId,
                              moment.sphere,
                              undefined,
                            );
                            setShowEntityWheel(false);
                            if (onEntityWheelChange) {
                              onEntityWheelChange(false);
                            }
                          }, 120);
                        });
                      }
                    : undefined
                }
                entityId={moment.entityId}
                memoryId={moment.memoryId}
                sphere={moment.sphere}
                memoryImageUri={moment.memoryImageUri}
                onComplete={() => {
                  setFloatingMoments((prev) =>
                    prev.filter((m) => m.id !== moment.id),
                  );
                }}
              />
            ))}

            {/* Entity wheel moment card: shown when user taps a floating moment (same design as main wheel card) */}
            {entityWheelMomentCard &&
              (() => {
                const iconName =
                  entityWheelMomentCard.type === "sunny"
                    ? "wb-sunny"
                    : entityWheelMomentCard.type === "cloudy"
                      ? "cloud"
                      : "lightbulb";
                const accentColor =
                  entityWheelMomentCard.type === "sunny"
                    ? momentColors.sunny.background
                    : entityWheelMomentCard.type === "cloudy"
                      ? momentColors.cloudy.background
                      : momentColors.lesson.background;
                const openMemory = () => {
                  const { entityId, memoryId, sphere } = entityWheelMomentCard;
                  if (!entityId || !memoryId || !sphere) {
                    setEntityWheelMomentCard(null);
                    setExpandedMomentId(null);
                    return;
                  }
                  startTransitionLoader();
                  requestAnimationFrame(() => {
                    setTimeout(() => {
                      setEntityWheelMomentCard(null);
                      setExpandedMomentId(null);
                      onMemoryFocus?.(entityId, memoryId, sphere);
                      setShowEntityWheel(false);
                      onEntityWheelChange?.(false);
                    }, 120);
                  });
                };
                const CARD_WIDTH = Math.min(320, SCREEN_WIDTH - 48);
                const CARD_HEIGHT = 400;
                return (
                  <Pressable
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      zIndex: 1100,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(0,0,0,0.85)",
                    }}
                    onPress={() => {
                      setEntityWheelMomentCard(null);
                      setExpandedMomentId(null);
                    }}
                  >
                    <Pressable
                      onPress={(e) => e.stopPropagation()}
                      style={{
                        width: CARD_WIDTH,
                        minHeight: CARD_HEIGHT,
                        borderRadius: 24,
                        overflow: "hidden",
                        backgroundColor:
                          colorScheme === "dark"
                            ? "rgba(26, 35, 50, 0.98)"
                            : "rgba(255, 255, 255, 0.98)",
                        borderWidth: 1,
                        borderColor: `${accentColor}40`,
                        shadowColor: accentColor,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.35,
                        shadowRadius: 24,
                        elevation: 12,
                      }}
                    >
                      <Pressable
                        onPress={() => {
                          setEntityWheelMomentCard(null);
                          setExpandedMomentId(null);
                        }}
                        hitSlop={12}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          zIndex: 10,
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor:
                            colorScheme === "dark"
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(0,0,0,0.08)",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons
                          name="close"
                          size={22}
                          color={colorScheme === "dark" ? "#fff" : "#333"}
                        />
                      </Pressable>
                      <Pressable
                        onPress={openMemory}
                        style={{
                          flex: 1,
                          paddingTop: 20,
                          paddingHorizontal: 20,
                          paddingBottom: 20,
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: `${accentColor}28`,
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: 14,
                          }}
                        >
                          <MaterialIcons
                            name={iconName}
                            size={32}
                            color={accentColor}
                          />
                        </View>
                        <ThemedText
                          numberOfLines={3}
                          ellipsizeMode="tail"
                          style={{
                            fontSize: 15 * fontScale,
                            lineHeight: 22 * fontScale,
                            textAlign: "center",
                            marginBottom: 16,
                            paddingHorizontal: 8,
                          }}
                        >
                          {entityWheelMomentCard.text || " "}
                        </ThemedText>
                        {entityWheelMomentCard.memoryImageUri ? (
                          <View
                            style={{
                              width: CARD_WIDTH - 40,
                              height: 160,
                              borderRadius: 16,
                              overflow: "hidden",
                              backgroundColor:
                                colorScheme === "dark"
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.06)",
                            }}
                          >
                            <Image
                              source={{
                                uri: entityWheelMomentCard.memoryImageUri,
                              }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                            />
                          </View>
                        ) : (
                          <View
                            style={{
                              width: CARD_WIDTH - 40,
                              height: 100,
                              borderRadius: 16,
                              backgroundColor:
                                colorScheme === "dark"
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.06)",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <MaterialIcons
                              name="photo-library"
                              size={36}
                              color={
                                colorScheme === "dark"
                                  ? "rgba(255,255,255,0.3)"
                                  : "rgba(0,0,0,0.2)"
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
                              colorScheme === "dark"
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(0,0,0,0.08)",
                            justifyContent: "center",
                            alignItems: "center",
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

            {/* Selected moment floating display - large circular popup matching main wheel of life */}
            {selectedWheelMoment &&
              (() => {
                // Calculate dimensions dynamically based on text length for all moment types
                const textLength = selectedWheelMoment.text?.length || 0;

                // Base sizes for different moment types
                const baseSunSize = isTablet ? 240 : isLargeDevice ? 200 : 160;
                const baseCloudWidth = isTablet ? 260 : 190;
                const baseCloudHeight = isTablet ? 160 : 120;
                const baseLessonSize = isTablet ? 200 : 145; // Reverted - this affects floating moments positioning

                // Dynamic sizing based on text length
                // For sunny moments: circular, so width = height
                const dynamicSunSize = Math.min(
                  400,
                  Math.max(
                    baseSunSize,
                    baseSunSize + Math.floor(textLength * 1.5),
                  ),
                );

                // For cloudy moments: wider and shorter, scale width more than height
                const cloudWidthMultiplier = Math.min(
                  2.0,
                  Math.max(1.0, 1.0 + textLength / 100),
                );
                const cloudHeightMultiplier = Math.min(
                  1.2,
                  Math.max(1.0, 1.0 + textLength / 200),
                );
                const dynamicCloudWidth = baseCloudWidth * cloudWidthMultiplier;
                const dynamicCloudHeight =
                  baseCloudHeight * cloudHeightMultiplier;

                // For lesson moments: circular, scale based on text length
                const lessonSizeMultiplier = Math.min(
                  1.4,
                  Math.max(1.0, 1.0 + textLength / 150),
                );
                const dynamicLessonSize = baseLessonSize * lessonSizeMultiplier;

                // Set moment dimensions based on type
                const momentWidth =
                  selectedWheelMoment.type === "sunny"
                    ? dynamicSunSize
                    : selectedWheelMoment.type === "cloudy"
                      ? dynamicCloudWidth
                      : dynamicLessonSize;

                // Get visual properties based on moment type
                const momentVisuals = {
                  lesson: {
                    icon: "lightbulb" as const,
                    backgroundColor: `${momentColors.lesson.background}73`,
                    shadowColor: momentColors.lesson.background,
                    iconColor: momentColors.lesson.background,
                  },
                  sunny: {
                    icon: "wb-sunny" as const,
                    backgroundColor: `${momentColors.sunny.background}8C`,
                    shadowColor: momentColors.sunny.background,
                    iconColor: momentColors.sunny.background,
                  },
                  cloudy: {
                    icon: "cloud" as const,
                    backgroundColor: `${momentColors.cloudy.background}59`,
                    shadowColor: momentColors.cloudy.background,
                    iconColor: momentColors.cloudy.background,
                  },
                };

                const visuals = momentVisuals[selectedWheelMoment.type];

                return (
                  <Animated.View
                    style={[
                      {
                        position: "absolute",
                        left: SCREEN_WIDTH / 2 - momentWidth / 2, // Center horizontally
                        zIndex: 300,
                      },
                      popupAnimatedStyle,
                    ]}
                  >
                    {selectedWheelMoment.type === "sunny" ? (
                      /* For sunny moments, render the sun element directly (no Pressable wrapper with background) */
                      <Pressable
                        onPressIn={() => {
                          popupPressScale.value = withSpring(0.95, {
                            damping: 15,
                            stiffness: 300,
                          });
                        }}
                        onPressOut={() => {
                          popupPressScale.value = withSpring(1, {
                            damping: 15,
                            stiffness: 300,
                          });
                        }}
                        onPress={() => {
                          // Wait for press animation to complete before navigating
                          setTimeout(() => {
                            // Navigate to the focused memory
                            if (
                              onMemoryFocus &&
                              selectedWheelMoment?.memoryId
                            ) {
                              // If it's a sunny moment, pass the momentId so the draggable sun element appears automatically
                              onMemoryFocus(
                                profile.id,
                                selectedWheelMoment.memoryId,
                                profile.sphere,
                                selectedWheelMoment.momentId,
                              );
                              // Exit entity wheel mode
                              setShowEntityWheel(false);
                              if (onEntityWheelChange) {
                                onEntityWheelChange(false);
                              }
                            }
                            setSelectedWheelMoment(null);
                          }, 200);
                        }}
                        style={{
                          width: dynamicSunSize,
                          height: dynamicSunSize,
                          backgroundColor: "transparent",
                          justifyContent: "center",
                          alignItems: "center",
                          position: "relative",
                        }}
                      >
                        {/* EXACT COPY of sun element from focused memory view (lines 3155-3275) */}
                        <View
                          style={{
                            width: dynamicSunSize,
                            height: dynamicSunSize,
                            shadowColor: momentColors.sunny.background,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: isTablet ? 12 : 9,
                            elevation: 10,
                          }}
                        >
                          <Svg
                            width={dynamicSunSize}
                            height={dynamicSunSize}
                            viewBox="0 0 160 160"
                            preserveAspectRatio="xMidYMid meet"
                            style={{ position: "absolute", top: 0, left: 0 }}
                          >
                            <Defs>
                              <RadialGradient
                                id={`wheelSunGradient-${selectedWheelMoment.momentId || "default"}`}
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
                                  stopColor={momentColors.sunny.background}
                                  stopOpacity="0.9"
                                />
                                <Stop
                                  offset="60%"
                                  stopColor={momentColors.sunny.background}
                                  stopOpacity="1"
                                />
                                <Stop
                                  offset="100%"
                                  stopColor={momentColors.sunny.background}
                                  stopOpacity="1"
                                />
                              </RadialGradient>
                            </Defs>
                            {/* Sun rays - triangular rays */}
                            {Array.from({ length: 12 }).map((_, i) => {
                              const angle = (i * 360) / 12;
                              const radian = (angle * Math.PI) / 180;
                              const centerX = 80;
                              const centerY = 80;
                              const innerRadius = 48; // Adjusted for smaller sun
                              const outerRadius = 72; // Longer rays
                              const rayWidth = 3; // Width of triangle base at outer edge

                              // Calculate triangle points
                              const innerX =
                                centerX + Math.cos(radian) * innerRadius;
                              const innerY =
                                centerY + Math.sin(radian) * innerRadius;

                              const outerX =
                                centerX + Math.cos(radian) * outerRadius;
                              const outerY =
                                centerY + Math.sin(radian) * outerRadius;

                              // Perpendicular vector for triangle width
                              const perpAngle = radian + Math.PI / 2;
                              const halfWidth = rayWidth / 2;
                              const leftX =
                                outerX + Math.cos(perpAngle) * halfWidth;
                              const leftY =
                                outerY + Math.sin(perpAngle) * halfWidth;
                              const rightX =
                                outerX +
                                Math.cos(perpAngle + Math.PI) * halfWidth;
                              const rightY =
                                outerY +
                                Math.sin(perpAngle + Math.PI) * halfWidth;

                              return (
                                <Path
                                  key={`wheelRay-${i}`}
                                  d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                                  fill={momentColors.sunny.background}
                                />
                              );
                            })}
                            {/* Central circle - sized to fit text */}
                            <Circle
                              cx="80"
                              cy="80"
                              r="48" // Adjusted for smaller sun
                              fill={`url(#wheelSunGradient-${selectedWheelMoment.momentId || "default"})`}
                            />
                          </Svg>
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: dynamicSunSize,
                              height: dynamicSunSize,
                              justifyContent: "center",
                              alignItems: "center",
                              // Calculate padding based on sun circle radius to ensure text fits inside
                              // Sun radius in viewBox is 48, viewBox is 160, so actual radius = (dynamicSunSize / 160) * 48
                              paddingHorizontal:
                                (dynamicSunSize / 160) * 48 * 0.7, // 70% of radius for safe padding
                              paddingVertical:
                                (dynamicSunSize / 160) * 48 * 0.5, // 50% of radius for vertical padding
                            }}
                          >
                            <ThemedText
                              style={{
                                color: momentColors.sunny.text,
                                fontSize:
                                  Math.max(
                                    11,
                                    Math.min(16, 12 + textLength / 60),
                                  ) * fontScale,
                                textAlign: "center",
                                fontWeight: "700",
                                maxWidth: (dynamicSunSize / 160) * 48 * 1.5,
                              }}
                              numberOfLines={Math.min(
                                4,
                                Math.max(2, Math.ceil(textLength / 25)),
                              )}
                            >
                              {selectedWheelMoment.text?.split("\n")[0] ||
                                selectedWheelMoment.text}
                            </ThemedText>
                            {selectedWheelMoment.text?.includes("\n") && (
                              <ThemedText
                                style={{
                                  color: momentColors.sunny.text,
                                  fontSize:
                                    Math.max(
                                      7,
                                      Math.min(11, 7 + textLength / 100),
                                    ) * fontScale, // Scale font size for second line
                                  textAlign: "center",
                                  fontWeight: "600",
                                  maxWidth: (dynamicSunSize / 160) * 48 * 1.5, // Same max width as first line to stay within circle
                                }}
                                numberOfLines={Math.min(
                                  3,
                                  Math.max(1, Math.ceil(textLength / 50)),
                                )}
                              >
                                {selectedWheelMoment.text.split("\n")[1]}
                              </ThemedText>
                            )}
                            {/* Memory image */}
                            {selectedWheelMoment.memoryImageUri && (
                              <Image
                                source={{
                                  uri: selectedWheelMoment.memoryImageUri,
                                }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  marginTop: 8,
                                  borderWidth: 2,
                                  borderColor: momentColors.sunny.background,
                                }}
                              />
                            )}
                          </View>
                        </View>
                        {/* Close button for sunny moment - positioned at top right */}
                        <Pressable
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            setSelectedWheelMoment(null);
                          }}
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(0, 0, 0, 0.6)"
                                : "rgba(255, 255, 255, 0.95)",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 999,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.3,
                            shadowRadius: 2,
                            elevation: 5,
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={
                              colorScheme === "dark" ? "#FFFFFF" : "#000000"
                            }
                            style={{ opacity: 0.9 }}
                          />
                        </Pressable>
                      </Pressable>
                    ) : selectedWheelMoment.type === "cloudy" ? (
                      // For cloudy moments, use SVG cloud (matching video preview component)
                      <Pressable
                        onPressIn={() => {
                          popupPressScale.value = withSpring(0.95, {
                            damping: 15,
                            stiffness: 300,
                          });
                        }}
                        onPressOut={() => {
                          popupPressScale.value = withSpring(1, {
                            damping: 15,
                            stiffness: 300,
                          });
                        }}
                        onPress={() => {
                          // Wait for press animation to complete before navigating
                          setTimeout(() => {
                            // Navigate to the focused memory
                            if (
                              onMemoryFocus &&
                              selectedWheelMoment?.memoryId
                            ) {
                              onMemoryFocus(
                                profile.id,
                                selectedWheelMoment.memoryId,
                                profile.sphere,
                                selectedWheelMoment.momentId,
                              );
                              // Exit entity wheel mode
                              setShowEntityWheel(false);
                              if (onEntityWheelChange) {
                                onEntityWheelChange(false);
                              }
                            }
                            setSelectedWheelMoment(null);
                          }, 200);
                        }}
                        style={{
                          width: dynamicCloudWidth,
                          height: dynamicCloudHeight,
                          justifyContent: "center",
                          alignItems: "center",
                          position: "relative",
                        }}
                      >
                        {/* SVG cloud (matching video preview component) */}
                        <View
                          style={{
                            width: dynamicCloudWidth,
                            height: dynamicCloudHeight,
                            shadowColor: "#4A5568",
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.7,
                            shadowRadius: 10,
                            elevation: 8,
                          }}
                        >
                          <Svg
                            width={dynamicCloudWidth}
                            height={dynamicCloudHeight}
                            viewBox="0 0 320 100"
                            preserveAspectRatio="xMidYMid meet"
                            style={{ position: "absolute", top: 0, left: 0 }}
                          >
                            <Defs>
                              <SvgLinearGradient
                                id={`wheelCloudGradient-${selectedWheelMoment.momentId || "default"}`}
                                x1="0%"
                                y1="0%"
                                x2="0%"
                                y2="100%"
                              >
                                <Stop
                                  offset="0%"
                                  stopColor={momentColors.cloudy.background}
                                  stopOpacity="0.95"
                                />
                                <Stop
                                  offset="50%"
                                  stopColor={momentColors.cloudy.background}
                                  stopOpacity="0.98"
                                />
                                <Stop
                                  offset="100%"
                                  stopColor={momentColors.cloudy.background}
                                  stopOpacity="1"
                                />
                              </SvgLinearGradient>
                            </Defs>
                            <Path
                              d="M50,50
                             Q40,35 50,25
                             Q60,15 75,20
                             Q85,10 100,20
                             Q115,10 130,20
                             Q145,10 160,20
                             Q175,10 190,20
                             Q205,10 220,20
                             Q235,10 250,20
                             Q265,15 270,25
                             Q280,35 270,50
                             Q280,65 270,75
                             Q260,85 245,80
                             Q230,90 220,85
                             Q205,95 190,85
                             Q175,95 160,85
                             Q145,95 130,85
                             Q115,95 100,85
                             Q85,90 75,80
                             Q60,85 50,75
                             Q40,65 50,50 Z"
                              fill={`url(#wheelCloudGradient-${selectedWheelMoment.momentId || "default"})`}
                              stroke="rgba(0,0,0,0.7)"
                              strokeWidth={1.5}
                            />
                          </Svg>
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: dynamicCloudWidth,
                              height: dynamicCloudHeight,
                              justifyContent: "center",
                              alignItems: "center",
                              paddingHorizontal: Math.max(
                                20,
                                dynamicCloudWidth * 0.1,
                              ), // Scale padding with size
                            }}
                          >
                            <ThemedText
                              style={{
                                color: "rgba(255,255,255,0.9)",
                                fontSize:
                                  Math.max(
                                    12,
                                    Math.min(16, 14 + textLength / 80),
                                  ) * fontScale, // Scale font size with text length
                                textAlign: "center",
                                fontWeight: "500",
                              }}
                              numberOfLines={Math.min(
                                6,
                                Math.max(3, Math.ceil(textLength / 40)),
                              )} // More lines for longer text
                            >
                              {selectedWheelMoment.text}
                            </ThemedText>
                            {/* Memory image */}
                            {selectedWheelMoment.memoryImageUri && (
                              <Image
                                source={{
                                  uri: selectedWheelMoment.memoryImageUri,
                                }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  marginTop: 8,
                                  borderWidth: 2,
                                  borderColor: "rgba(255,255,255,0.3)",
                                }}
                              />
                            )}
                          </View>
                        </View>
                        {/* Close button for cloudy moment - positioned at top right */}
                        <Pressable
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            setSelectedWheelMoment(null);
                          }}
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(0, 0, 0, 0.6)"
                                : "rgba(255, 255, 255, 0.95)",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 999,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.3,
                            shadowRadius: 2,
                            elevation: 5,
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={
                              colorScheme === "dark" ? "#FFFFFF" : "#000000"
                            }
                            style={{ opacity: 0.9 }}
                          />
                        </Pressable>
                      </Pressable>
                    ) : selectedWheelExam &&
                      selectedWheelExam.step !== "result" ? (
                      // Entity wheel exam: cosmic question → answer (result shown as overlay card)
                      <View
                        style={{
                          width: Math.max(dynamicLessonSize, 280),
                          minHeight:
                            selectedWheelExam.step === "analyzing"
                              ? Math.max(dynamicLessonSize, 220)
                              : dynamicLessonSize,
                          justifyContent: "center",
                          alignItems: "center",
                          borderRadius: 24,
                          overflow: "hidden",
                          shadowColor: examModalPalette.shellShadowColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: examModalPalette.shellShadowOpacity,
                          shadowRadius: isTablet ? 24 : 20,
                          elevation: 24,
                          padding: 20,
                          position: "relative",
                          borderWidth: 1,
                          borderColor: examModalPalette.borderColor,
                        }}
                      >
                        <LinearGradient
                          colors={examModalPalette.gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        {selectedWheelExam.step === "analyzing" ? (
                          <>
                            <ActivityIndicator
                              size="large"
                              color={examModalPalette.spinner}
                            />
                            <ThemedText
                              size="sm"
                              style={{
                                marginTop: 12,
                                opacity: 0.9,
                                textAlign: "center",
                                color: examModalPalette.bodyText,
                              }}
                            >
                              {t("wheel.exam.analyzing")}
                            </ThemedText>
                          </>
                        ) : selectedWheelExam.step === "question" &&
                          !selectedWheelExam.question ? (
                          <ActivityIndicator
                            size="large"
                            color={examModalPalette.spinner}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="emoji-objects"
                              size={36}
                              color={momentColors.lesson.background}
                              style={{ marginBottom: 14, opacity: 0.95 }}
                            />
                            <ThemedText
                              size="sm"
                              weight="semibold"
                              style={{
                                marginBottom: 16,
                                textAlign: "center",
                                paddingHorizontal: 8,
                                color: examModalPalette.bodyText,
                                lineHeight: 22,
                              }}
                            >
                              {selectedWheelExam.question}
                            </ThemedText>
                            <Animated.View
                              style={[
                                { width: "100%" },
                                entityExamInputPulseStyle,
                              ]}
                            >
                              <TextInput
                                value={examAnswerInput}
                                onChangeText={setExamAnswerInput}
                                placeholder={t("wheel.exam.questionPrompt")}
                                placeholderTextColor={examModalPalette.placeholder}
                                style={{
                                  width: "100%",
                                  minHeight: 48,
                                  backgroundColor: examModalPalette.inputBg,
                                  borderRadius: 14,
                                  paddingHorizontal: 14,
                                  paddingVertical: 12,
                                  color: examModalPalette.bodyText,
                                  fontSize: 14 * fontScale,
                                  borderWidth: 1,
                                  borderColor: examModalPalette.inputBorder,
                                }}
                                multiline
                              />
                            </Animated.View>
                            <Animated.View
                              style={[
                                entityExamSubmitButtonStyle,
                                { width: "100%", marginTop: 16 },
                              ]}
                            >
                              <Pressable
                                onPressIn={() => {
                                  if (
                                    entityExamAnswerInputRef.current.trim()
                                      .length >= 2
                                  ) {
                                    cancelAnimation(entityExamSubmitPressScale);
                                    entityExamSubmitPressScale.value =
                                      withTiming(0.82, {
                                        duration: 80,
                                        easing: Easing.out(Easing.ease),
                                      });
                                  }
                                }}
                                onPressOut={() => {
                                  cancelAnimation(entityExamSubmitPressScale);
                                  entityExamSubmitPressScale.value = withSpring(
                                    1,
                                    {
                                      damping: 12,
                                      stiffness: 400,
                                    },
                                  );
                                }}
                                onPress={() => {
                                  const trimmed = examAnswerInput.trim();
                                  if (trimmed.length >= 2) {
                                    handleExamSubmit(trimmed);
                                    setExamAnswerInput("");
                                  } else {
                                    cancelAnimation(entityExamInputPulseScale);
                                    entityExamInputPulseScale.value =
                                      withSequence(
                                        withTiming(1.04, {
                                          duration: 80,
                                          easing: Easing.out(Easing.ease),
                                        }),
                                        withSpring(1, {
                                          damping: 12,
                                          stiffness: 400,
                                        }),
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
                            {(() => {
                              const displayedTriesLeft =
                                entityWheelExamTriesRemaining !== null &&
                                Number.isFinite(entityWheelExamTriesRemaining)
                                  ? Math.max(0, entityWheelExamTriesRemaining)
                                  : entityWheelExamTriesRemaining;
                              const triesLeftLabel =
                                displayedTriesLeft === null
                                  ? null
                                  : Number.isFinite(displayedTriesLeft)
                                    ? (
                                        t("universe.exam.triesRemainingFree") ||
                                        "{count} free tries left today"
                                      ).replace(
                                        "{count}",
                                        String(displayedTriesLeft),
                                      )
                                    : t("universe.exam.triesRemainingUnlimited") ||
                                      "Unlimited tries left today";
                              return triesLeftLabel ? (
                                <ThemedText
                                  size="xs"
                                  style={{
                                    marginTop: 8,
                                    textAlign: "center",
                                    color: examModalPalette.triesLabel,
                                    fontSize: 11,
                                  }}
                                >
                                  {triesLeftLabel}
                                </ThemedText>
                              ) : null;
                            })()}
                          </>
                        )}
                        <Pressable
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            clearWheelMomentAndExam();
                          }}
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: examModalPalette.closeBg,
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 999,
                            borderWidth: 1,
                            borderColor: examModalPalette.closeBorder,
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <MaterialIcons
                            name="close"
                            size={16}
                            color={examModalPalette.closeIcon}
                            style={{ opacity: 0.9 }}
                          />
                        </Pressable>
                      </View>
                    ) : (
                      // Fallback: lesson without exam (legacy)
                      <Pressable
                        onPressIn={() => {
                          popupPressScale.value = withSpring(0.95, {
                            damping: 15,
                            stiffness: 300,
                          });
                        }}
                        onPressOut={() => {
                          popupPressScale.value = withSpring(1, {
                            damping: 15,
                            stiffness: 300,
                          });
                        }}
                        onPress={() => {
                          setTimeout(() => {
                            if (
                              onMemoryFocus &&
                              selectedWheelMoment?.memoryId
                            ) {
                              onMemoryFocus(
                                profile.id,
                                selectedWheelMoment.memoryId,
                                profile.sphere,
                                selectedWheelMoment.momentId,
                              );
                              setShowEntityWheel(false);
                              if (onEntityWheelChange) {
                                onEntityWheelChange(false);
                              }
                            }
                            clearWheelMomentAndExam();
                          }, 200);
                        }}
                        style={{
                          width: dynamicLessonSize,
                          height: dynamicLessonSize,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: visuals.backgroundColor,
                          borderRadius: dynamicLessonSize / 2,
                          shadowColor: visuals.shadowColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.95,
                          shadowRadius: isTablet ? 40 : 30,
                          elevation: 24,
                          padding: Math.max(8, dynamicLessonSize * 0.05),
                          position: "relative",
                        }}
                      >
                        <MaterialIcons
                          name={visuals.icon}
                          size={dynamicLessonSize * 0.25}
                          color={visuals.iconColor}
                          style={{ marginBottom: 8 }}
                        />
                        <ThemedText
                          style={{
                            color:
                              colorScheme === "light"
                                ? Colors.light.text
                                : momentColors.lesson.text,
                            fontSize:
                              Math.max(13, Math.min(16, 13 + textLength / 60)) *
                              fontScale,
                            textAlign: "center",
                            fontWeight: "700",
                            maxWidth: dynamicLessonSize * 0.75,
                            lineHeight:
                              Math.max(17, Math.min(20, 17 + textLength / 60)) *
                              fontScale,
                          }}
                          numberOfLines={Math.min(
                            10,
                            Math.max(4, Math.ceil(textLength / 30)),
                          )}
                        >
                          {selectedWheelMoment?.text}
                        </ThemedText>
                        {selectedWheelMoment?.memoryImageUri && (
                          <Image
                            source={{
                              uri: selectedWheelMoment.memoryImageUri,
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              marginTop: 8,
                              borderWidth: 2,
                              borderColor: momentColors.lesson.background,
                            }}
                          />
                        )}
                        <Pressable
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            clearWheelMomentAndExam();
                          }}
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(0, 0, 0, 0.6)"
                                : "rgba(255, 255, 255, 0.95)",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 999,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.3,
                            shadowRadius: 2,
                            elevation: 5,
                          }}
                          hitSlop={{
                            top: 12,
                            bottom: 12,
                            left: 12,
                            right: 12,
                          }}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={
                              colorScheme === "dark" ? "#FFFFFF" : "#000000"
                            }
                            style={{ opacity: 0.9 }}
                          />
                        </Pressable>
                      </Pressable>
                    )}
                  </Animated.View>
                );
              })()}
            {/* Lesson bulb tap hint: bouncing pointer, shown from 2nd lesson appearance */}
            {appUsabilityHints &&
              selectedWheelMoment?.type === "lesson" &&
              !selectedWheelExam &&
              !wheelMomentHintDismissed &&
              wheelMomentAppearCount >= 2 &&
              (() => {
                const pointerSize = isTablet ? 72 : 64;
                const baseLessonSize = isTablet ? 200 : 145;
                const messageTop = 180;
                return (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: "absolute",
                        top: messageTop + baseLessonSize + 8,
                        left: SCREEN_WIDTH / 2 - pointerSize / 2,
                        width: pointerSize,
                        height: pointerSize,
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 350,
                      },
                      wheelMomentHintPointerAnimatedStyle,
                    ]}
                  >
                    <MaterialIcons
                      name="touch-app"
                      size={pointerSize}
                      color="rgba(0,0,0,0.4)"
                      style={{ position: "absolute", left: 2, top: 2 }}
                    />
                    <MaterialIcons
                      name="touch-app"
                      size={pointerSize}
                      color="#FFFFFF"
                    />
                  </Animated.View>
                );
              })()}
            {/* Exam result card overlay - shown as full card after answering */}
            {selectedWheelExam?.step === "result" &&
              selectedWheelExam.analysis &&
              selectedWheelMoment &&
              (() => {
                const resultAccentColor = selectedWheelExam.analysis.isCorrect
                  ? "#4CAF50"
                  : "#FFA726";
                const CARD_WIDTH = Math.min(320, SCREEN_WIDTH - 48);
                const openMemory = () => {
                  if (!selectedWheelMoment.memoryId) {
                    clearWheelMomentAndExam();
                    return;
                  }
                  startTransitionLoader();
                  requestAnimationFrame(() => {
                    setTimeout(() => {
                      clearWheelMomentAndExam();
                      onMemoryFocus?.(
                        profile.id,
                        selectedWheelMoment.memoryId,
                        profile.sphere,
                        selectedWheelMoment.momentId,
                      );
                      setShowEntityWheel(false);
                      onEntityWheelChange?.(false);
                    }, 120);
                  });
                };
                return (
                  <Pressable
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      zIndex: 1200,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(0,0,0,0.85)",
                    }}
                    onPress={clearWheelMomentAndExam}
                  >
                    <Pressable
                      onPress={(e) => e.stopPropagation()}
                      style={{
                        width: CARD_WIDTH,
                        borderRadius: 24,
                        overflow: "hidden",
                        backgroundColor:
                          colorScheme === "dark"
                            ? "rgba(26, 35, 50, 0.98)"
                            : "rgba(255, 255, 255, 0.98)",
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
                        onPress={clearWheelMomentAndExam}
                        hitSlop={12}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          zIndex: 10,
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor:
                            colorScheme === "dark"
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(0,0,0,0.08)",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons
                          name="close"
                          size={22}
                          color={colorScheme === "dark" ? "#fff" : "#333"}
                        />
                      </Pressable>
                      {/* Card content - tapping opens memory */}
                      <Pressable
                        onPress={openMemory}
                        style={{
                          paddingTop: 24,
                          paddingHorizontal: 20,
                          paddingBottom: 20,
                          alignItems: "center",
                        }}
                      >
                        {/* Result icon */}
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: `${resultAccentColor}28`,
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: 12,
                          }}
                        >
                          <MaterialIcons
                            name={
                              selectedWheelExam.analysis.isCorrect
                                ? "check-circle"
                                : "warning"
                            }
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
                          }}
                        >
                          {selectedWheelExam.analysis.isCorrect
                            ? t("wheel.exam.correctCelebration")
                            : t("wheel.exam.keepPracticing")}
                        </ThemedText>
                        {/* AI feedback */}
                        <ThemedText
                          size="xs"
                          style={{
                            marginBottom: 16,
                            textAlign: "center",
                            color:
                              colorScheme === "light"
                                ? Colors.light.textMediumEmphasis
                                : undefined,
                            opacity: colorScheme === "light" ? 1 : 0.75,
                          }}
                        >
                          {selectedWheelExam.analysis.feedback}
                        </ThemedText>
                        {/* Lesson text */}
                        <ThemedText
                          size="sm"
                          style={{
                            textAlign: "center",
                            fontStyle: "italic",
                            marginBottom: 16,
                            paddingHorizontal: 4,
                            lineHeight: 22 * fontScale,
                            color:
                              colorScheme === "light"
                                ? Colors.light.text
                                : undefined,
                          }}
                          numberOfLines={4}
                        >
                          {selectedWheelMoment.text}
                        </ThemedText>
                        {/* Memory image */}
                        {selectedWheelMoment.memoryImageUri ? (
                          <View
                            style={{
                              width: CARD_WIDTH - 40,
                              height: 160,
                              borderRadius: 16,
                              overflow: "hidden",
                              backgroundColor:
                                colorScheme === "dark"
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.06)",
                            }}
                          >
                            <Image
                              source={{
                                uri: selectedWheelMoment.memoryImageUri,
                              }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                            />
                          </View>
                        ) : (
                          <View
                            style={{
                              width: CARD_WIDTH - 40,
                              height: 100,
                              borderRadius: 16,
                              backgroundColor:
                                colorScheme === "dark"
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.06)",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <MaterialIcons
                              name="photo-library"
                              size={36}
                              color={
                                colorScheme === "dark"
                                  ? "rgba(255,255,255,0.3)"
                                  : "rgba(0,0,0,0.2)"
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
                              colorScheme === "dark"
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(0,0,0,0.08)",
                            justifyContent: "center",
                            alignItems: "center",
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
            {showWheelFireworks && (
              <Fireworks
                visible={showWheelFireworks}
                onComplete={() => setShowWheelFireworks(false)}
              />
            )}
          </View>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Keep isScreenActive in sync so wheel pause/resume logic reruns on app bg/fg.
    return (
      prevProps.profile.id === nextProps.profile.id &&
      prevProps.position.x === nextProps.position.x &&
      prevProps.position.y === nextProps.position.y &&
      prevProps.memories.length === nextProps.memories.length &&
      prevProps.isFocused === nextProps.isFocused &&
      prevProps.isScreenActive === nextProps.isScreenActive &&
      prevProps.focusedMemory?.profileId ===
        nextProps.focusedMemory?.profileId &&
      prevProps.focusedMemory?.memoryId === nextProps.focusedMemory?.memoryId &&
      prevProps.yearSection?.year === nextProps.yearSection?.year &&
      prevProps.yearSection?.top === nextProps.yearSection?.top &&
      prevProps.yearSection?.bottom === nextProps.yearSection?.bottom
    );
  },
);

// Memory Moments Renderer Component (extracted from IIFE)
const MemoryMomentsRenderer = React.memo(
  function MemoryMomentsRenderer({
    clouds,
    suns,
    lessons,
    isFocused,
    isMemoryFocused,
    visibleMomentIds,
    activeMomentId,
    setActiveMomentId,
    calculateClampedPosition,
    cloudWidth,
    cloudHeight,
    sunWidth,
    sunHeight,
    memorySize,
    cloudPositions,
    sunPositions,
    lessonPositions,
    position,
    memoryAnimatedPosition,
    memoryCenterX,
    memoryCenterY,
    avatarPanX,
    avatarPanY,
    focusedX,
    focusedY,
    offsetX,
    offsetY,
    cloudZIndex,
    sunZIndex,
    lessonZIndex,
    colorScheme,
    onDoubleTap,
    onUpdateMemory,
    newlyCreatedMoments,
    memory,
    showEntityWheel,
    showEntityWheelRef,
  }: {
    clouds: any[];
    suns: any[];
    lessons: any[];
    isFocused: boolean;
    isMemoryFocused: boolean;
    visibleMomentIds: Set<string>;
    activeMomentId: string | null;
    setActiveMomentId: (id: string | null) => void;
    calculateClampedPosition: (
      savedX: number | undefined,
      savedY: number | undefined,
      momentWidth: number,
      momentHeight: number,
      index: number,
      totalCount: number,
      memorySize: number,
      momentType: "cloud" | "sun",
    ) => { x: number; y: number };
    cloudWidth: number;
    cloudHeight: number;
    sunWidth: number;
    sunHeight: number;
    memorySize: number;
    cloudPositions: { angle: number; offsetX: number; offsetY: number }[];
    sunPositions: { angle: number; offsetX: number; offsetY: number }[];
    lessonPositions: { angle: number; offsetX: number; offsetY: number }[];
    position: { x: number; y: number };
    memoryAnimatedPosition: any;
    memoryCenterX?: ReturnType<typeof useSharedValue<number>>;
    memoryCenterY?: ReturnType<typeof useSharedValue<number>>;
    avatarPanX?: any;
    avatarPanY?: any;
    focusedX?: any;
    focusedY?: any;
    offsetX: number;
    offsetY: number;
    cloudZIndex: number;
    sunZIndex: number;
    lessonZIndex: number;
    colorScheme: "light" | "dark";
    onDoubleTap?: () => void;
    onUpdateMemory?: (updates: Partial<any>) => Promise<void>;
    newlyCreatedMoments: Map<string, { startX: number; startY: number }>;
    memory: any;
    showEntityWheel?: boolean;
    showEntityWheelRef?: React.MutableRefObject<boolean>;
  }) {
    const { momentColors } = useMomentColors();
    const fontScale = useFontScale();
    const { isTablet, isLargeDevice } = useLargeDevice();

    // Calculate sunny percentage for this memory's moments
    const sunnyPercentage = useMemo(() => {
      const totalClouds = clouds.length;
      const totalSuns = suns.length + lessons.length; // Include lessons as positive
      const total = totalClouds + totalSuns;
      if (total === 0) return 50; // Neutral if no moments
      return (totalSuns / total) * 100;
    }, [clouds.length, suns.length, lessons.length]);

    // Memoize filtered clouds - must be called unconditionally
    const filteredClouds = useMemo(() => {
      // Only show moments when entity is focused (isFocused is true)
      if (!isFocused) {
        return [];
      }

      const filtered = clouds.filter((cloud: any) => {
        // When specific memory is focused, only show visible moments
        if (isMemoryFocused) {
          const isVisible = cloud?.id && visibleMomentIds.has(cloud.id);
          return isVisible;
        }
        // When entity is focused but not specific memory, show all moments
        return true;
      });

      return filtered;
    }, [isFocused, clouds, isMemoryFocused, visibleMomentIds]);

    // Memoize cloud elements
    const cloudElements = useMemo(() => {
      if (!isFocused) {
        return null;
      }

      return filteredClouds.map((cloud: any, cloudIndex: number) => {
        // Additional safety check
        if (!cloud || typeof cloud !== "object") {
          return null;
        }

        // When memory is focused, use saved positions from memory data
        // Otherwise use calculated positions
        if (isMemoryFocused) {
          // Calculate dynamic cloud size based on text length
          const normalizedCloudText = (cloud.text || "").trim().replace(/\s+/g, " ");
          const textLength = normalizedCloudText.length;
          const cloudEstimatedLines = Math.max(
            1,
            Math.ceil(
              textLength / (isTablet ? 42 : isLargeDevice ? 34 : 26),
            ),
          );
          const cloudLongestWord = normalizedCloudText
            .split(" ")
            .reduce((max: number, word: string) => Math.max(max, word.length), 0);
          const baseCloudWidth = isTablet ? 720 : isLargeDevice ? 480 : 320;
          const baseCloudHeight = isTablet ? 225 : isLargeDevice ? 150 : 100;
          const dynamicCloudHeight = Math.min(
            isTablet ? 420 : isLargeDevice ? 340 : 280,
            Math.max(
              baseCloudHeight,
              baseCloudHeight + (cloudEstimatedLines - 1) * (isTablet ? 26 : 30),
            ),
          );
          const dynamicCloudWidth = Math.min(
            isTablet ? 920 : isLargeDevice ? 760 : 620,
            Math.max(
              baseCloudWidth,
              baseCloudWidth +
                Math.floor(textLength * (isTablet ? 0.65 : isLargeDevice ? 0.55 : 0.8)) +
                Math.max(0, cloudLongestWord - 12) * (isTablet ? 8 : 10),
            ),
          );

          // Calculate and clamp position to ensure it's within viewport and well distributed
          const clampedPos = calculateClampedPosition(
            cloud.x,
            cloud.y,
            dynamicCloudWidth,
            dynamicCloudHeight,
            cloudIndex,
            clouds.length,
            memorySize,
            "cloud",
          );
          const cloudX = clampedPos.x;
          const cloudY = clampedPos.y;

          const handlePositionChange = async (x: number, y: number) => {
            if (onUpdateMemory) {
              // Update the cloud's position in memory
              const updatedHardTruths = (memory.hardTruths || []).map(
                (truth: any) =>
                  truth.id === cloud.id ? { ...truth, x, y } : truth,
              );
              await onUpdateMemory({ hardTruths: updatedHardTruths });
            }
          };

          const startPos = newlyCreatedMoments.get(cloud.id);
          const isActive = activeMomentId === cloud.id;
          return (
            <DraggableMoment
              key={`cloud-focused-${cloud?.id || cloudIndex}`}
              initialX={cloudX}
              initialY={cloudY}
              width={dynamicCloudWidth}
              height={dynamicCloudHeight}
              zIndex={cloudZIndex}
              onPositionChange={handlePositionChange}
              onPress={() => {
                setActiveMomentId(cloud.id);
              }}
              entranceDelay={startPos ? 0 : cloudIndex * 100} // No delay for newly created moments
              startX={startPos?.startX}
              startY={startPos?.startY}
              isActive={isActive}
            >
              <View
                style={{
                  width: dynamicCloudWidth,
                  height: dynamicCloudHeight,
                  // Dark glow for clouds (negative moments)
                  shadowColor: "#4A5568",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.7,
                  shadowRadius: isTablet ? 10 : 7,
                  elevation: 8,
                }}
              >
                <Svg
                  width={dynamicCloudWidth}
                  height={dynamicCloudHeight}
                  viewBox="0 0 320 100"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ position: "absolute", top: 0, left: 0 }}
                >
                  <Defs>
                    <SvgLinearGradient
                      id={`cloudGradient-${cloud.id}`}
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <Stop
                        offset="0%"
                        stopColor={momentColors.cloudy.background}
                        stopOpacity="0.95"
                      />
                      <Stop
                        offset="50%"
                        stopColor={momentColors.cloudy.background}
                        stopOpacity="0.98"
                      />
                      <Stop
                        offset="100%"
                        stopColor={momentColors.cloudy.background}
                        stopOpacity="1"
                      />
                    </SvgLinearGradient>
                  </Defs>
                  <Path
                    d="M50,50 
                     Q40,35 50,25 
                     Q60,15 75,20 
                     Q85,10 100,20 
                     Q115,10 130,20 
                     Q145,10 160,20 
                     Q175,10 190,20 
                     Q205,10 220,20 
                     Q235,10 250,20 
                     Q265,15 270,25 
                     Q280,35 270,50 
                     Q280,65 270,75 
                     Q260,85 245,80 
                     Q230,90 220,85 
                     Q205,95 190,85 
                     Q175,95 160,85 
                     Q145,95 130,85 
                     Q115,95 100,85 
                     Q85,90 75,80 
                     Q60,85 50,75 
                     Q40,65 50,50 Z"
                    fill={`url(#cloudGradient-${cloud.id})`}
                    stroke="rgba(0,0,0,0.7)"
                    strokeWidth={1.5}
                  />
                </Svg>
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: dynamicCloudWidth,
                    height: dynamicCloudHeight,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 20,
                  }}
                >
                  <ThemedText
                    style={{
                      color: "rgba(255,255,255,0.9)",
                      fontSize:
                        Math.max(
                          isTablet ? 13 : isLargeDevice ? 12 : 11,
                          (isTablet ? 20 : isLargeDevice ? 17 : 14) -
                            Math.floor(textLength / (isTablet ? 180 : 140)),
                        ) * fontScale,
                      textAlign: "center",
                      fontWeight: "500",
                      lineHeight:
                        Math.max(
                          isTablet ? 16 : 14,
                          (isTablet ? 24 : isLargeDevice ? 21 : 18) -
                            Math.floor(textLength / (isTablet ? 240 : 180)),
                        ) * fontScale,
                      maxWidth: dynamicCloudWidth * 0.74,
                    }}
                  >
                    {cloud.text}
                  </ThemedText>
                </View>
              </View>
            </DraggableMoment>
          );
        }

        // Not focused - use small circular cloud
        const cloudPosData = cloudPositions[cloudIndex];
        if (!cloudPosData) {
          return null;
        }

        const initialCloudPos = {
          x: position.x + cloudPosData.offsetX,
          y: position.y + cloudPosData.offsetY,
        };

        return (
          <FloatingCloud
            key={`cloud-${cloud?.id || cloudIndex}-${cloudIndex}`}
            cloud={cloud}
            position={initialCloudPos}
            memoryAnimatedPosition={memoryAnimatedPosition}
            memoryCenterX={memoryCenterX}
            memoryCenterY={memoryCenterY}
            avatarPanX={avatarPanX}
            avatarPanY={avatarPanY}
            focusedX={focusedX}
            focusedY={focusedY}
            memoryOffsetX={offsetX}
            memoryOffsetY={offsetY}
            offsetX={cloudPosData.offsetX}
            offsetY={cloudPosData.offsetY}
            zIndex={cloudZIndex}
            isFocused={!!isFocused}
            colorScheme={colorScheme}
            onPress={onDoubleTap}
            sunnyPercentage={sunnyPercentage}
            showEntityWheel={showEntityWheel}
            showEntityWheelRef={showEntityWheelRef}
          />
        );
      });
    }, [
      isFocused,
      filteredClouds,
      isMemoryFocused,
      cloudPositions,
      position.x,
      position.y,
      memoryAnimatedPosition,
      avatarPanX,
      avatarPanY,
      focusedX,
      focusedY,
      offsetX,
      offsetY,
      cloudZIndex,
      colorScheme,
      onDoubleTap,
      calculateClampedPosition,
      cloudWidth,
      cloudHeight,
      clouds.length,
      memorySize,
      newlyCreatedMoments,
      isTablet,
      onUpdateMemory,
      memory.hardTruths,
      sunnyPercentage,
      showEntityWheel,
      showEntityWheelRef,
      activeMomentId,
      setActiveMomentId,
      fontScale,
      isLargeDevice,
      memoryCenterX,
      memoryCenterY,
      momentColors.cloudy.background,
    ]);

    // Memoize filtered suns - must be called unconditionally
    const filteredSuns = useMemo(() => {
      if (!isFocused) return [];
      const filtered = suns.filter((sun: any) => {
        // When memory is focused, only show visible moments
        if (isMemoryFocused) {
          const isVisible = sun?.id && visibleMomentIds.has(sun.id);
          return isVisible;
        }
        return true;
      });

      if (isMemoryFocused) {
      }

      return filtered;
    }, [isFocused, suns, isMemoryFocused, visibleMomentIds]);

    // Memoize sun elements
    const sunElements = useMemo(() => {
      if (!isFocused) return null;

      return filteredSuns.map((sun: any, sunIndex: number) => {
        // When memory is focused, use saved positions from memory data
        if (isMemoryFocused) {
          // Calculate dynamic sun size based on text length
          const normalizedSunText = (sun.text || "").trim().replace(/\s+/g, " ");
          const textLength = normalizedSunText.length;
          const sunEstimatedLines = Math.max(
            1,
            Math.ceil(
              textLength / (isTablet ? 22 : isLargeDevice ? 18 : 14),
            ),
          );
          const sunLongestWord = normalizedSunText
            .split(" ")
            .reduce((max: number, word: string) => Math.max(max, word.length), 0);
          const baseSunSize = isTablet ? 240 : isLargeDevice ? 200 : 160;
          const dynamicSunSize = Math.min(
            isTablet ? 420 : isLargeDevice ? 340 : 290,
            Math.max(
              baseSunSize,
              baseSunSize +
                (sunEstimatedLines - 1) * (isTablet ? 18 : isLargeDevice ? 16 : 14) +
                Math.floor(textLength * (isTablet ? 0.5 : isLargeDevice ? 0.45 : 0.35)) +
                Math.max(0, sunLongestWord - 10) * (isTablet ? 3 : 2),
            ),
          );

          // Calculate and clamp position to ensure it's within viewport and well distributed
          const clampedPos = calculateClampedPosition(
            sun.x,
            sun.y,
            dynamicSunSize,
            dynamicSunSize,
            sunIndex,
            suns.length,
            memorySize,
            "sun",
          );
          const sunX = clampedPos.x;
          const sunY = clampedPos.y;

          const handlePositionChange = async (x: number, y: number) => {
            if (onUpdateMemory) {
              // Update the sun's position in memory
              const updatedGoodFacts = (memory.goodFacts || []).map(
                (fact: any) => (fact.id === sun.id ? { ...fact, x, y } : fact),
              );
              await onUpdateMemory({ goodFacts: updatedGoodFacts });
            }
          };

          const startPos = newlyCreatedMoments.get(sun.id);
          const isActive = activeMomentId === sun.id;
          return (
            <DraggableMoment
              key={`sun-focused-${sun.id}`}
              initialX={sunX}
              initialY={sunY}
              width={dynamicSunSize}
              height={dynamicSunSize}
              zIndex={sunZIndex}
              onPositionChange={handlePositionChange}
              onPress={() => {
                setActiveMomentId(sun.id);
              }}
              entranceDelay={startPos ? 0 : sunIndex * 100} // No delay for newly created moments
              startX={startPos?.startX}
              startY={startPos?.startY}
              isActive={isActive}
            >
              <View
                style={{
                  width: dynamicSunSize,
                  height: dynamicSunSize,
                  shadowColor: momentColors.sunny.background,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: isTablet ? 12 : 9,
                  elevation: 10,
                }}
              >
                <Svg
                  width={dynamicSunSize}
                  height={dynamicSunSize}
                  viewBox="0 0 160 160"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ position: "absolute", top: 0, left: 0 }}
                >
                  <Defs>
                    <RadialGradient
                      id={`sunGradient-${sun.id}`}
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
                        stopColor={momentColors.sunny.background}
                        stopOpacity="0.9"
                      />
                      <Stop
                        offset="60%"
                        stopColor={momentColors.sunny.background}
                        stopOpacity="1"
                      />
                      <Stop
                        offset="100%"
                        stopColor={momentColors.sunny.background}
                        stopOpacity="1"
                      />
                    </RadialGradient>
                  </Defs>
                  {/* Sun rays - triangular rays */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 360) / 12;
                    const radian = (angle * Math.PI) / 180;
                    const centerX = 80;
                    const centerY = 80;
                    const innerRadius = 48; // Adjusted for smaller sun
                    const outerRadius = 72; // Longer rays
                    const rayWidth = 3; // Width of triangle base at outer edge

                    // Calculate triangle points
                    const innerX = centerX + Math.cos(radian) * innerRadius;
                    const innerY = centerY + Math.sin(radian) * innerRadius;

                    const outerX = centerX + Math.cos(radian) * outerRadius;
                    const outerY = centerY + Math.sin(radian) * outerRadius;

                    // Perpendicular vector for triangle width
                    const perpAngle = radian + Math.PI / 2;
                    const halfWidth = rayWidth / 2;
                    const leftX = outerX + Math.cos(perpAngle) * halfWidth;
                    const leftY = outerY + Math.sin(perpAngle) * halfWidth;
                    const rightX =
                      outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
                    const rightY =
                      outerY + Math.sin(perpAngle + Math.PI) * halfWidth;

                    return (
                      <Path
                        key={`ray-${i}`}
                        d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                        fill={momentColors.sunny.background}
                      />
                    );
                  })}
                  {/* Central circle - sized to fit text */}
                  <Circle
                    cx="80"
                    cy="80"
                    r="48" // Adjusted for smaller sun
                    fill={`url(#sunGradient-${sun.id})`}
                  />
                </Svg>
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: dynamicSunSize,
                    height: dynamicSunSize,
                    justifyContent: "center",
                    alignItems: "center",
                    // Font-first tuning: allow text to use more of the inner circle.
                    paddingHorizontal: (dynamicSunSize / 160) * 48 * 0.54,
                    paddingVertical: (dynamicSunSize / 160) * 48 * 0.4,
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
                      maxWidth: (dynamicSunSize / 160) * 48 * 1.5,
                    }}
                  >
                    {sun.text}
                  </ThemedText>
                </View>
              </View>
            </DraggableMoment>
          );
        }

        // Not focused - use small circular sun
        const sunPosData = sunPositions[sunIndex];
        const initialSunPos = {
          x: position.x + sunPosData.offsetX,
          y: position.y + sunPosData.offsetY,
        };

        return (
          <FloatingSun
            key={`sun-${sun.id}-${sunIndex}`}
            sun={sun}
            position={initialSunPos}
            memoryAnimatedPosition={memoryAnimatedPosition}
            memoryCenterX={memoryCenterX}
            memoryCenterY={memoryCenterY}
            avatarPanX={avatarPanX}
            avatarPanY={avatarPanY}
            focusedX={focusedX}
            focusedY={focusedY}
            memoryOffsetX={offsetX}
            memoryOffsetY={offsetY}
            offsetX={sunPosData.offsetX}
            offsetY={sunPosData.offsetY}
            zIndex={sunZIndex}
            isFocused={!!isFocused}
            colorScheme={colorScheme}
            onPress={onDoubleTap}
            sunnyPercentage={sunnyPercentage}
            showEntityWheel={showEntityWheel}
            showEntityWheelRef={showEntityWheelRef}
          />
        );
      });
    }, [
      isFocused,
      filteredSuns,
      isMemoryFocused,
      sunPositions,
      position.x,
      position.y,
      memoryAnimatedPosition,
      avatarPanX,
      avatarPanY,
      focusedX,
      focusedY,
      offsetX,
      offsetY,
      sunZIndex,
      colorScheme,
      onDoubleTap,
      calculateClampedPosition,
      sunWidth,
      sunHeight,
      suns.length,
      memorySize,
      newlyCreatedMoments,
      isTablet,
      isLargeDevice,
      fontScale,
      onUpdateMemory,
      memory.goodFacts,
      sunnyPercentage,
      showEntityWheel,
      showEntityWheelRef,
      activeMomentId,
      setActiveMomentId,
      memoryCenterX,
      memoryCenterY,
      momentColors.sunny.background,
    ]);

    // Memoize filtered lessons - must be called unconditionally
    const filteredLessons = useMemo(() => {
      if (!isFocused) return [];
      return lessons.filter((lesson: any) => {
        // When memory is focused, only show visible moments
        if (isMemoryFocused) {
          return lesson?.id && visibleMomentIds.has(lesson.id);
        }
        return true;
      });
    }, [isFocused, lessons, isMemoryFocused, visibleMomentIds]);

    // Memoize lesson elements - render using the same AnimatedLesson component from add-idealized-memory
    const lessonElements = useMemo(() => {
      if (!isFocused) return null;

      // For now, render lessons as lightbulb icons similar to suns but with different styling
      return filteredLessons.map((lesson: any, lessonIndex: number) => {
        // When memory is focused, use saved positions from memory data
        if (isMemoryFocused) {
          // Calculate dynamic lesson size based on text length
          const textToMeasure = (lesson.text || "").trim().replace(/\s+/g, " ");
          const lessonEstimatedLines = Math.max(
            1,
            Math.ceil(
              textToMeasure.length / (isTablet ? 20 : isLargeDevice ? 18 : 14),
            ),
          );
          const lessonLongestWord = textToMeasure
            .split(" ")
            .reduce((max: number, word: string) => Math.max(max, word.length), 0);
          const baseLessonSize = isTablet ? 240 : isLargeDevice ? 200 : 160;
          const dynamicLessonSize = Math.min(
            isTablet ? 460 : isLargeDevice ? 360 : 320,
            Math.max(
              baseLessonSize,
              baseLessonSize +
                (lessonEstimatedLines - 1) * (isTablet ? 22 : isLargeDevice ? 20 : 24) +
                Math.floor(textToMeasure.length * (isTablet ? 1.0 : isLargeDevice ? 0.9 : 1.1)) +
                Math.max(0, lessonLongestWord - 10) * (isTablet ? 3 : isLargeDevice ? 2 : 3),
            ),
          );

          const startPos = newlyCreatedMoments.get(lesson.id);
          const clampedPos = calculateClampedPosition(
            lesson.x,
            lesson.y,
            dynamicLessonSize,
            dynamicLessonSize,
            lessonIndex,
            lessons.length,
            memorySize,
            "sun",
          );
          const lessonX = clampedPos.x;
          const lessonY = clampedPos.y;

          const handlePositionChange = async (x: number, y: number) => {
            if (onUpdateMemory) {
              const updatedLessons = (memory.lessonsLearned || []).map(
                (l: any) => (l.id === lesson.id ? { ...l, x, y } : l),
              );
              await onUpdateMemory({ lessonsLearned: updatedLessons });
            }
          };

          // Use DraggableMoment for lessons when memory is focused (same as suns)
          const isActive = activeMomentId === lesson.id;
          return (
            <DraggableMoment
              key={`lesson-${lesson.id}-${lessonIndex}`}
              initialX={lessonX}
              initialY={lessonY}
              width={dynamicLessonSize}
              height={dynamicLessonSize}
              zIndex={lessonZIndex}
              onPositionChange={handlePositionChange}
              onPress={() => {
                setActiveMomentId(lesson.id);
              }}
              entranceDelay={startPos ? 0 : lessonIndex * 100}
              startX={startPos?.startX}
              startY={startPos?.startY}
              isActive={isActive}
            >
              {/* Render lightbulb with text for lessons */}
              <View
                style={{
                  width: dynamicLessonSize,
                  height: dynamicLessonSize,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: `${momentColors.lesson.background}40`,
                  borderRadius: dynamicLessonSize / 2,
                  shadowColor: momentColors.lesson.background,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: isTablet ? 12 : 8,
                  elevation: 8,
                  padding: 8,
                }}
              >
                <MaterialIcons
                  name="lightbulb"
                  size={dynamicLessonSize * 0.35}
                  color={momentColors.lesson.background}
                  style={{ marginBottom: 4 }}
                />
                {lesson.text && (
                  <ThemedText
                    style={{
                      color:
                        colorScheme === "light"
                          ? Colors.light.text
                          : momentColors.lesson.text,
                      fontSize: (isTablet ? 13 : 11) * fontScale,
                      textAlign: "center",
                      fontWeight: "700",
                      maxWidth: dynamicLessonSize * 0.72,
                      lineHeight: (isTablet ? 16 : 14) * fontScale,
                    }}
                  >
                    {lesson.text}
                  </ThemedText>
                )}
              </View>
            </DraggableMoment>
          );
        }

        // Not focused - use small circular lesson icon (floating around memory)
        const lessonPosData = lessonPositions[lessonIndex];
        if (!lessonPosData) {
          return null;
        }

        const initialLessonPos = {
          x: position.x + lessonPosData.offsetX,
          y: position.y + lessonPosData.offsetY,
        };

        return (
          <FloatingLesson
            key={`lesson-${lesson.id}-${lessonIndex}`}
            lesson={lesson}
            position={initialLessonPos}
            memoryAnimatedPosition={memoryAnimatedPosition}
            memoryCenterX={memoryCenterX}
            memoryCenterY={memoryCenterY}
            avatarPanX={avatarPanX}
            avatarPanY={avatarPanY}
            focusedX={focusedX}
            focusedY={focusedY}
            memoryOffsetX={offsetX}
            memoryOffsetY={offsetY}
            offsetX={lessonPosData.offsetX}
            offsetY={lessonPosData.offsetY}
            zIndex={lessonZIndex}
            isFocused={!!isFocused}
            colorScheme={colorScheme}
            onPress={onDoubleTap}
            showEntityWheel={showEntityWheel}
            showEntityWheelRef={showEntityWheelRef}
          />
        );
      });
    }, [
      isFocused,
      filteredLessons,
      isMemoryFocused,
      lessonPositions,
      lessons.length,
      calculateClampedPosition,
      sunWidth,
      sunHeight,
      memorySize,
      lessonZIndex,
      colorScheme,
      onDoubleTap,
      onUpdateMemory,
      newlyCreatedMoments,
      memory,
      isTablet,
      isLargeDevice,
      fontScale,
      position.x,
      position.y,
      memoryAnimatedPosition,
      memoryCenterX,
      memoryCenterY,
      avatarPanX,
      avatarPanY,
      focusedX,
      focusedY,
      offsetX,
      offsetY,
      showEntityWheel,
      showEntityWheelRef,
      activeMomentId,
      setActiveMomentId,
      momentColors.lesson.background,
      momentColors.lesson.text,
    ]);

    // Skip rendering moments for unfocused partners (not visible in viewport)
    if (!isFocused) {
      return null;
    }

    return (
      <>
        {/* Floating Clouds around Memory - only show when profile is focused */}
        {cloudElements}

        {/* Floating Suns around Memory - only show when profile is focused */}
        {sunElements}

        {/* Floating Lessons around Memory - only show when memory is focused */}
        {lessonElements}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.clouds.length === nextProps.clouds.length &&
      prevProps.suns.length === nextProps.suns.length &&
      prevProps.lessons.length === nextProps.lessons.length &&
      prevProps.isFocused === nextProps.isFocused &&
      prevProps.isMemoryFocused === nextProps.isMemoryFocused &&
      prevProps.visibleMomentIds.size === nextProps.visibleMomentIds.size &&
      prevProps.activeMomentId === nextProps.activeMomentId &&
      prevProps.memorySize === nextProps.memorySize &&
      prevProps.position.x === nextProps.position.x &&
      prevProps.position.y === nextProps.position.y &&
      prevProps.offsetX === nextProps.offsetX &&
      prevProps.offsetY === nextProps.offsetY &&
      prevProps.cloudZIndex === nextProps.cloudZIndex &&
      prevProps.sunZIndex === nextProps.sunZIndex &&
      prevProps.colorScheme === nextProps.colorScheme &&
      prevProps.memory.id === nextProps.memory.id
    );
  },
);

// Memory Action Buttons Component (extracted from IIFE)
const MemoryActionButtons = React.memo(
  function MemoryActionButtons({
    isMemoryFocused,
    memory,
    visibleMomentIds,
    memorySize,
    isLargeDevice,
    colorScheme,
    cloudButtonRef,
    sunButtonRef,
    lessonButtonRef,
    setCloudButtonPos,
    setSunButtonPos,
    setLessonButtonPos,
    handleAddCloud,
    handleAddSun,
    handleAddLesson,
  }: {
    isMemoryFocused: boolean;
    memory: any;
    visibleMomentIds: Set<string>;
    memorySize: number;
    isLargeDevice: boolean;
    colorScheme: "light" | "dark";
    cloudButtonRef: React.RefObject<View | null>;
    sunButtonRef: React.RefObject<View | null>;
    lessonButtonRef?: React.RefObject<View | null>;
    setCloudButtonPos: (pos: { x: number; y: number } | null) => void;
    setSunButtonPos: (pos: { x: number; y: number } | null) => void;
    setLessonButtonPos?: (pos: { x: number; y: number } | null) => void;
    handleAddCloud: () => void;
    handleAddSun: () => void;
    handleAddLesson?: () => void;
  }) {
    const { momentColors } = useMomentColors();
    const t = useTranslate();
    const allClouds = useMemo(
      () =>
        (memory.hardTruths || []).filter(
          (truth: any) =>
            truth && typeof truth === "object" && !Array.isArray(truth),
        ),
      [memory.hardTruths],
    );
    const allSuns = useMemo(
      () =>
        (memory.goodFacts || []).filter(
          (fact: any) => fact && typeof fact === "object",
        ),
      [memory.goodFacts],
    );
    const allLessons = useMemo(
      () =>
        (memory.lessonsLearned || []).filter(
          (lesson: any) => lesson && typeof lesson === "object",
        ),
      [memory.lessonsLearned],
    );
    const visibleCloudsCount = useMemo(
      () =>
        allClouds.filter((c: any) => c?.id && visibleMomentIds.has(c.id))
          .length,
      [allClouds, visibleMomentIds],
    );
    const visibleSunsCount = useMemo(
      () =>
        allSuns.filter((s: any) => s?.id && visibleMomentIds.has(s.id)).length,
      [allSuns, visibleMomentIds],
    );
    const visibleLessonsCount = useMemo(
      () =>
        allLessons.filter((l: any) => l?.id && visibleMomentIds.has(l.id))
          .length,
      [allLessons, visibleMomentIds],
    );

    // Pulse animation scales (must run before any early return — rules of hooks)
    const lessonButtonScale = useSharedValue(1);
    const cloudButtonScale = useSharedValue(1);
    const sunButtonScale = useSharedValue(1);

    const lessonButtonAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: lessonButtonScale.value }],
    }));

    const cloudButtonAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cloudButtonScale.value }],
    }));

    const sunButtonAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: sunButtonScale.value }],
    }));

    // Always render buttons when memory is focused, even if all moments are visible
    if (!isMemoryFocused) return null;
    const totalCloudsCount = allClouds.length;
    const totalSunsCount = allSuns.length;
    const totalLessonsCount = allLessons.length;
    const allCloudsVisible =
      totalCloudsCount > 0 && visibleCloudsCount >= totalCloudsCount;
    const allSunsVisible =
      totalSunsCount > 0 && visibleSunsCount >= totalSunsCount;
    const allLessonsVisible =
      totalLessonsCount > 0 && visibleLessonsCount >= totalLessonsCount;

    // Calculate position at bottom of screen (above navigation bar)
    const buttonSpacing = isLargeDevice ? 12 : 10;
    const buttonSize = isLargeDevice ? 96 : 88;
    const labelWidth = 100;
    const bottomRowWidth =
      buttonSize + buttonSpacing + labelWidth + buttonSpacing + buttonSize; // Cloud + text + Sun
    const totalWidth = Math.max(buttonSize, bottomRowWidth); // Use the wider of the two rows
    const bottomNavBarHeight = 80; // Approximate height of bottom navigation bar
    const bottomPadding = 60; // Padding from bottom - increased to move buttons up
    const containerBottom = bottomNavBarHeight + bottomPadding; // Position above navigation bar
    const colors = Colors[colorScheme ?? "dark"];

    // Pulse animation handlers
    const handleLessonPress = () => {
      lessonButtonScale.value = withSequence(
        withSpring(0.85, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
      handleAddLesson?.();
    };

    const handleCloudPress = () => {
      cloudButtonScale.value = withSequence(
        withSpring(0.85, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
      handleAddCloud();
    };

    const handleSunPress = () => {
      sunButtonScale.value = withSequence(
        withSpring(0.85, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
      handleAddSun();
    };

    return (
      <>
        {/* All action buttons container - positioned at bottom */}
        <View
          style={{
            position: "absolute",
            bottom: containerBottom,
            left: SCREEN_WIDTH / 2 - totalWidth / 2,
            flexDirection: "column",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          {/* Lesson Button - positioned above cloud and sun */}
          {lessonButtonRef && setLessonButtonPos && handleAddLesson && (
            <View
              ref={lessonButtonRef}
              onLayout={() => {
                lessonButtonRef.current?.measure(
                  (
                    fx: number,
                    fy: number,
                    width: number,
                    height: number,
                    px: number,
                    py: number,
                  ) => {
                    const buttonCenterX = px + width / 2;
                    const buttonCenterY = py + height / 2;
                    setLessonButtonPos({ x: buttonCenterX, y: buttonCenterY });
                  },
                );
              }}
              style={{ marginBottom: 16 }}
            >
              <Pressable
                onPress={handleLessonPress}
                disabled={allLessonsVisible || totalLessonsCount === 0}
              >
                <Animated.View
                  style={[
                    {
                      width: isLargeDevice ? 96 : 88,
                      height: isLargeDevice ? 96 : 88,
                      borderRadius: isLargeDevice ? 48 : 44,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.9)",
                      shadowColor: momentColors.lesson.background,
                      shadowOffset: {
                        width: 0,
                        height: colorScheme === "dark" ? 14 : 12,
                      },
                      shadowOpacity: colorScheme === "dark" ? 0.9 : 0.7,
                      shadowRadius: colorScheme === "dark" ? 24 : 20,
                      elevation: colorScheme === "dark" ? 18 : 15,
                      overflow: "visible",
                      borderWidth: colorScheme === "dark" ? 2 : 1.5,
                      borderColor: momentColors.lesson.background,
                      opacity:
                        allLessonsVisible || totalLessonsCount === 0 ? 0.4 : 1,
                    },
                    lessonButtonAnimatedStyle,
                  ]}
                >
                  <LinearGradient
                    colors={
                      colorScheme === "dark"
                        ? [
                            "rgba(255, 249, 196, 0.9)",
                            "rgba(255, 213, 79, 0.75)",
                            "rgba(255, 160, 0, 0.9)",
                          ]
                        : [
                            "rgba(255, 253, 231, 1)",
                            "rgba(255, 245, 157, 0.95)",
                            "rgba(255, 213, 79, 1)",
                          ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: isLargeDevice ? 48 : 44,
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        top: isLargeDevice ? 14 : 12,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons
                        name="lightbulb"
                        size={isLargeDevice ? 44 : 40}
                        color={momentPillGlyphColor(
                          momentColors.lesson.background,
                        )}
                      />
                    </View>
                    {/* Count badge */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: isLargeDevice ? 8 : 6,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: isLargeDevice ? 14 : 12,
                          fontWeight: "700",
                          color: momentPillGlyphColor(
                            momentColors.lesson.background,
                          ),
                          textAlign: "center",
                        }}
                      >
                        {totalLessonsCount > 0
                          ? `${visibleLessonsCount}/${totalLessonsCount}`
                          : "0"}
                      </ThemedText>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>
          )}

          {/* Bottom row: Cloud, Text, Sun */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              minHeight: buttonSize, // Ensure consistent height
            }}
          >
            {/* Cloud Button */}
            <View
              ref={cloudButtonRef}
              onLayout={() => {
                cloudButtonRef.current?.measure(
                  (
                    fx: number,
                    fy: number,
                    width: number,
                    height: number,
                    px: number,
                    py: number,
                  ) => {
                    const buttonCenterX = px + width / 2;
                    const buttonCenterY = py + height / 2;
                    setCloudButtonPos({ x: buttonCenterX, y: buttonCenterY });
                  },
                );
              }}
              style={{
                alignSelf: "center",
              }}
            >
              <Pressable onPress={handleCloudPress} disabled={allCloudsVisible}>
                <Animated.View
                  style={[
                    {
                      width: isLargeDevice ? 96 : 88,
                      height: isLargeDevice ? 96 : 88,
                      borderRadius: isLargeDevice ? 48 : 44,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.9)",
                      shadowColor: colorScheme === "dark" ? "#000" : "#000",
                      shadowOffset: {
                        width: 0,
                        height: colorScheme === "dark" ? 14 : 12,
                      },
                      shadowOpacity: colorScheme === "dark" ? 0.8 : 0.6,
                      shadowRadius: colorScheme === "dark" ? 24 : 20,
                      elevation: colorScheme === "dark" ? 18 : 15,
                      overflow: "visible", // Allow count text to be visible
                      borderWidth: colorScheme === "dark" ? 2 : 1.5,
                      borderColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.3)"
                          : "rgba(255, 255, 255, 0.6)",
                      opacity: allCloudsVisible ? 0.4 : 1,
                    },
                    cloudButtonAnimatedStyle,
                  ]}
                >
                  <LinearGradient
                    colors={
                      colorScheme === "dark"
                        ? [
                            "rgba(180, 180, 180, 0.8)",
                            "rgba(100, 100, 100, 0.6)",
                            "rgba(40, 40, 40, 0.8)",
                          ]
                        : [
                            "rgba(255, 255, 255, 1)",
                            "rgba(230, 230, 230, 0.95)",
                            "rgba(200, 200, 200, 1)",
                          ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: isLargeDevice ? 48 : 44,
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        top: isLargeDevice ? 14 : 12,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons
                        name="cloud"
                        size={isLargeDevice ? 44 : 40}
                        color={colorScheme === "dark" ? "#FFFFFF" : colors.textMediumEmphasis}
                      />
                    </View>
                    {/* Count badge */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: isLargeDevice ? 8 : 6,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: isLargeDevice ? 14 : 12,
                          fontWeight: "700",
                          color: colorScheme === "dark" ? "#FFFFFF" : colors.textMediumEmphasis,
                          textAlign: "center",
                        }}
                      >
                        {totalCloudsCount > 0
                          ? `${visibleCloudsCount}/${totalCloudsCount}`
                          : "0"}
                      </ThemedText>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>

            {/* RemindWhy Label */}
            <View
              style={{
                width: labelWidth,
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: buttonSpacing,
              }}
            >
              <ThemedText
                style={{
                  fontSize: isLargeDevice ? 16 : 14,
                  fontWeight: "600",
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                {t("memory.remindWhy")}
              </ThemedText>
            </View>

            {/* Sun Button */}
            <View
              ref={sunButtonRef}
              onLayout={() => {
                sunButtonRef.current?.measure(
                  (
                    fx: number,
                    fy: number,
                    width: number,
                    height: number,
                    px: number,
                    py: number,
                  ) => {
                    const buttonCenterX = px + width / 2;
                    const buttonCenterY = py + height / 2;
                    setSunButtonPos({ x: buttonCenterX, y: buttonCenterY });
                  },
                );
              }}
              style={{
                alignSelf: "center",
              }}
            >
              <Pressable onPress={handleSunPress} disabled={allSunsVisible}>
                <Animated.View
                  style={[
                    {
                      width: isLargeDevice ? 96 : 88,
                      height: isLargeDevice ? 96 : 88,
                      borderRadius: isLargeDevice ? 48 : 44,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.9)",
                      shadowColor: momentColors.sunny.background,
                      shadowOffset: {
                        width: 0,
                        height: colorScheme === "dark" ? 14 : 12,
                      },
                      shadowOpacity: colorScheme === "dark" ? 0.9 : 0.7,
                      shadowRadius: colorScheme === "dark" ? 24 : 20,
                      elevation: colorScheme === "dark" ? 18 : 15,
                      overflow: "visible",
                      borderWidth: colorScheme === "dark" ? 2 : 1.5,
                      borderColor: momentColors.sunny.background,
                      opacity: allSunsVisible ? 0.4 : 1,
                    },
                    sunButtonAnimatedStyle,
                  ]}
                >
                  <LinearGradient
                    colors={[
                      momentColors.sunny.background,
                      momentColors.sunny.background,
                      momentColors.sunny.background,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: isLargeDevice ? 48 : 44,
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        top: isLargeDevice ? 14 : 12,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons
                        name="wb-sunny"
                        size={isLargeDevice ? 44 : 40}
                        color={momentPillGlyphColor(
                          momentColors.sunny.background,
                        )}
                      />
                    </View>
                    {/* Count badge */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: isLargeDevice ? 8 : 6,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: isLargeDevice ? 14 : 12,
                          fontWeight: "700",
                          color: momentPillGlyphColor(
                            momentColors.sunny.background,
                          ),
                          textAlign: "center",
                        }}
                      >
                        {totalSunsCount > 0
                          ? `${visibleSunsCount}/${totalSunsCount}`
                          : "0"}
                      </ThemedText>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>
          </View>
        </View>
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isMemoryFocused === nextProps.isMemoryFocused &&
      prevProps.memory.id === nextProps.memory.id &&
      prevProps.visibleMomentIds.size === nextProps.visibleMomentIds.size &&
      prevProps.memorySize === nextProps.memorySize &&
      prevProps.isLargeDevice === nextProps.isLargeDevice &&
      prevProps.colorScheme === nextProps.colorScheme
    );
  },
);

// Floating Memory Component
const FloatingMemory = React.memo(
  function FloatingMemory({
    memory,
    position,
    avatarPanX,
    avatarPanY,
    focusedX,
    focusedY,
    offsetX,
    offsetY,
    baseOrbitAngle,
    orbitAngle,
    entityHintRotation,
    showEntityWheelShared,
    showEntityWheel,
    showEntityWheelRef,
    isFocused,
    colorScheme,
    calculatedMemorySize,
    onDoubleTap,
    isMemoryFocused,
    memorySlideOffset,
    onUpdateMemory,
    onPress,
    onMemoryFocus,
    zoomProgress,
    avatarStartX,
    avatarStartY,
    avatarTargetX,
    avatarTargetY,
    avatarPosition,
    focusedMemory,
    nudgeTargetIndex,
    nudgePulseScale,
    memorySlotIndex,
  }: {
    memory: any;
    position: { x: number; y: number };
    avatarPanX?: any;
    avatarPanY?: any;
    focusedX?: any;
    focusedY?: any;
    offsetX: number;
    offsetY: number;
    baseOrbitAngle?: number; // Base angle for this memory's orbit position
    orbitAngle?: ReturnType<typeof useSharedValue<number>>; // Animated orbit angle
    entityHintRotation?: ReturnType<typeof useSharedValue<number>>; // Wiggle when spin hint shown
    showEntityWheelShared?: ReturnType<typeof useSharedValue<boolean>>; // Shared value for worklet reactivity
    showEntityWheel?: boolean; // Boolean state for synchronous checking
    showEntityWheelRef?: React.MutableRefObject<boolean>; // Ref for absolute latest value
    isFocused: boolean;
    colorScheme: "light" | "dark";
    calculatedMemorySize?: number;
    onDoubleTap?: () => void;
    isMemoryFocused?: boolean;
    memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
    onUpdateMemory?: (updates: Partial<any>) => Promise<void>;
    onPress?: () => void;
    onMemoryFocus?: (
      entityId: string,
      memoryId: string,
      sphere?: LifeSphere,
      momentId?: string,
    ) => void;
    zoomProgress?: ReturnType<typeof useSharedValue<number>>;
    avatarStartX?: ReturnType<typeof useSharedValue<number>>;
    avatarStartY?: ReturnType<typeof useSharedValue<number>>;
    avatarTargetX?: number;
    avatarTargetY?: number;
    avatarPosition?: { x: number; y: number };
    nudgeTargetIndex?: ReturnType<typeof useSharedValue<number>>;
    nudgePulseScale?: ReturnType<typeof useSharedValue<number>>;
    /** Index in FloatingAvatar memories array — matches nudgeTargetIndex for pulse */
    memorySlotIndex?: number;
    focusedMemory?: {
      profileId?: string;
      jobId?: string;
      familyMemberId?: string;
      friendId?: string;
      hobbyId?: string;
      memoryId: string;
      sphere: LifeSphere;
      momentToShowId?: string;
    } | null;
  }) {
    const { momentColors } = useMomentColors();
    const { isLargeDevice, isTablet } = useLargeDevice();

    const [shareModalVisible, setShareModalVisible] = React.useState(false);
    const [shareModalContent, setShareModalContent] = React.useState({
      title: "",
      message: "",
    });

    // Track which moments are visible (initially none when memory is focused)
    const [visibleMomentIds, setVisibleMomentIds] = React.useState<Set<string>>(
      new Set(),
    );

    // Track the actively focused moment (for shrink/grow animation)
    const [activeMomentId, setActiveMomentId] = React.useState<string | null>(
      null,
    );

    // Track newly created moments with their start positions
    const [newlyCreatedMoments, setNewlyCreatedMoments] = React.useState<
      Map<string, { startX: number; startY: number }>
    >(new Map());

    // Track button positions for animation
    const cloudButtonRef = useRef<View>(null);
    const sunButtonRef = useRef<View>(null);
    const lessonButtonRef = useRef<View>(null);
    const [cloudButtonPos, setCloudButtonPos] = React.useState<{
      x: number;
      y: number;
    } | null>(null);
    const [sunButtonPos, setSunButtonPos] = React.useState<{
      x: number;
      y: number;
    } | null>(null);
    const [lessonButtonPos, setLessonButtonPos] = React.useState<{
      x: number;
      y: number;
    } | null>(null);

    // Reset visible moments when memory focus changes
    React.useEffect(() => {
      if (isMemoryFocused) {
        // When a specific memory is focused, hide all moments initially
        // (they can be shown one by one with buttons)
        // However, if there's a momentToShowId from wheel selection, show that one
        if (focusedMemory?.momentToShowId) {
          setVisibleMomentIds(new Set([focusedMemory.momentToShowId]));
          // Set it as active moment
          setActiveMomentId(focusedMemory.momentToShowId);
        } else {
          setVisibleMomentIds(new Set());
        }
      } else {
        // When memory is not focused (just entity is focused), show all moments
        const allIds = new Set<string>();
        (memory.hardTruths || []).forEach(
          (truth: any) => truth?.id && allIds.add(truth.id),
        );
        (memory.goodFacts || []).forEach(
          (fact: any) => fact?.id && allIds.add(fact.id),
        );
        (memory.lessonsLearned || []).forEach(
          (lesson: any) => lesson?.id && allIds.add(lesson.id),
        );
        setVisibleMomentIds(allIds);
      }
    }, [
      isMemoryFocused,
      memory.hardTruths,
      memory.goodFacts,
      memory.lessonsLearned,
      focusedMemory?.momentToShowId,
    ]);

    // When memory is focused, use smaller size like in creation screen (250px)
    // Otherwise use calculated size or default (scale for tablets)
    const memorySize = isMemoryFocused
      ? isTablet
        ? 375
        : isLargeDevice
          ? 300
          : 250 // 50% larger on tablets
      : (calculatedMemorySize ?? (isFocused ? 65 : 40));

    // Cloud and sun dimensions from creation screen (used when memory is focused)
    // Scale for tablets (50% larger)
    const cloudWidth = isTablet ? 720 : isLargeDevice ? 480 : 320; // 50% larger on tablets
    const cloudHeight = isTablet ? 225 : isLargeDevice ? 150 : 100; // 50% larger on tablets
    // Sun size - smaller to fit text nicely
    const sunWidth = isTablet ? 240 : isLargeDevice ? 200 : 160; // Smaller size
    const sunHeight = isTablet ? 240 : isLargeDevice ? 200 : 160; // Smaller size

    // Calculate moment radius to ensure moments are outside memory circle border
    // Memory size is determined above (either focused size or calculatedMemorySize)
    const memoryRadius = memorySize / 2;

    // Moment sizes when not focused (they're smaller when focused, but we use unfocused sizes for radius calculation)
    const cloudSize = isFocused ? 12 : 24;
    const sunSize = isFocused ? 10 : 22;
    const cloudMomentRadius = cloudSize / 2;
    const sunMomentRadius = sunSize / 2;
    const momentPadding = 10; // Padding to ensure moments are clearly outside memory border

    // Base radius: memory radius + moment radius + padding
    // Add extra spacing when focused to ensure clear separation
    const baseCloudRadius = memoryRadius + cloudMomentRadius + momentPadding;
    const baseSunRadius = memoryRadius + sunMomentRadius + momentPadding;

    const cloudRadius = isFocused ? baseCloudRadius + 15 : 25; // Further away when focused, with extra spacing
    const sunRadius = isFocused ? baseSunRadius + 13 : 22; // Further away when focused, with extra spacing

    // Calculate radius for lessons (similar to suns)
    const lessonSize = isFocused ? 10 : 22;
    const lessonMomentRadius = lessonSize / 2;
    const baseLessonRadius = memoryRadius + lessonMomentRadius + momentPadding;
    const lessonRadius = isFocused ? baseLessonRadius + 13 : 22;

    // Helper function to calculate and clamp moment position within viewport
    // Distributes moments evenly across the entire screen for better visibility
    const calculateClampedPosition = useMemo(() => {
      return (
        savedX: number | undefined,
        savedY: number | undefined,
        momentWidth: number,
        momentHeight: number,
        index: number,
        totalCount: number,
        memorySize: number,
        momentType: "cloud" | "sun" = "sun",
      ) => {
        const padding = 20; // Padding from edges
        const headerSafeZone = 120; // Safe zone from top to avoid header and back button
        const minX = padding + momentWidth / 2;
        const maxX = SCREEN_WIDTH - padding - momentWidth / 2;
        const minY = headerSafeZone + momentHeight / 2; // Ensure moments don't overlap header
        const availableWidth = maxX - minX;

        let momentX: number | undefined = undefined;
        let momentY: number | undefined = undefined;

        // Position all moments in the upper part of the screen (above the middle)
        // This ensures moments pop up above the middle when icon buttons are pressed
        const screenMiddle = SCREEN_HEIGHT / 2;
        const upperRegionStart = minY; // Start from header safe zone
        const upperRegionEnd = screenMiddle - momentHeight / 2 - 20; // End just above middle with padding

        // Distribute horizontally across available width
        const spacing = totalCount > 1 ? availableWidth / (totalCount - 1) : 0;
        const targetX =
          totalCount === 1
            ? SCREEN_WIDTH / 2 // Center if only one moment
            : minX + index * spacing;

        // Distribute vertically in the upper region
        const verticalSpacing =
          totalCount > 1
            ? (upperRegionEnd - upperRegionStart) / Math.max(1, totalCount - 1)
            : 0;
        const targetY = upperRegionStart + index * verticalSpacing;

        momentX =
          savedX !== undefined
            ? Math.max(minX, Math.min(maxX, savedX))
            : targetX;
        // Clamp Y to upper region (above middle of screen)
        momentY =
          savedY !== undefined
            ? Math.max(minY, Math.min(upperRegionEnd, savedY))
            : Math.max(minY, Math.min(upperRegionEnd, targetY));

        return { x: momentX, y: momentY };
      };
    }, [position.x, position.y]);

    // Handler to create a new cloud moment
    const handleAddCloud = React.useCallback(async () => {
      if (!onUpdateMemory) return;

      const allClouds = (memory.hardTruths || []).filter(
        (truth: any) =>
          truth && typeof truth === "object" && !Array.isArray(truth),
      );
      // Find first cloud that's not visible yet
      const nextCloud = allClouds.find(
        (cloud: any) => cloud?.id && !visibleMomentIds.has(cloud.id),
      );
      if (!nextCloud) return;

      // Calculate final position
      const visibleClouds = allClouds.filter((c: any) =>
        visibleMomentIds.has(c.id),
      );
      const clampedPos = calculateClampedPosition(
        nextCloud.x,
        nextCloud.y,
        cloudWidth,
        cloudHeight,
        visibleClouds.length,
        allClouds.length,
        memorySize,
        "cloud",
      );

      // Store start position for animation (button center, since panX/panY represent center)
      // Set this FIRST before marking as visible to ensure it's available when component renders
      // If button position isn't measured yet, measure it using requestAnimationFrame to ensure layout is complete
      const storeStartPosition = (
        buttonPos: { x: number; y: number } | null,
      ) => {
        if (buttonPos) {
          setNewlyCreatedMoments((prev) => {
            const next = new Map(prev);
            next.set(nextCloud.id, {
              startX: buttonPos.x,
              startY: buttonPos.y,
            });
            return next;
          });
        }
      };

      if (cloudButtonPos) {
        storeStartPosition(cloudButtonPos);
      } else if (cloudButtonRef.current) {
        // If position not available yet, measure it now
        // Use requestAnimationFrame to ensure layout has completed
        requestAnimationFrame(() => {
          cloudButtonRef.current?.measure(
            (
              fx: number,
              fy: number,
              width: number,
              height: number,
              px: number,
              py: number,
            ) => {
              const buttonCenterX = px + width / 2;
              const buttonCenterY = py + height / 2;
              const measuredPos = { x: buttonCenterX, y: buttonCenterY };
              setCloudButtonPos(measuredPos);
              storeStartPosition(measuredPos);
            },
          );
        });
      }

      // Update memory with new position
      const updatedHardTruths = (memory.hardTruths || []).map((truth: any) =>
        truth.id === nextCloud.id
          ? { ...truth, x: clampedPos.x, y: clampedPos.y }
          : truth,
      );
      await onUpdateMemory({ hardTruths: updatedHardTruths });

      // Mark as visible AFTER start position is set
      // If button position was already available, mark visible immediately
      // Otherwise, wait for the measurement to complete
      const markVisible = () => {
        setTimeout(() => {
          setVisibleMomentIds((prev) => new Set([...prev, nextCloud.id]));
          // Set this as the active moment when created
          setActiveMomentId(nextCloud.id);
          // Don't clear start position - it's harmless to keep it and prevents re-render issues
        }, 50); // Small delay to ensure start position state is set
      };

      if (cloudButtonPos) {
        markVisible();
      } else {
        // Wait a bit longer if we had to measure the button position
        setTimeout(markVisible, 100);
      }
    }, [
      memory.hardTruths,
      visibleMomentIds,
      onUpdateMemory,
      calculateClampedPosition,
      cloudWidth,
      cloudHeight,
      memorySize,
      cloudButtonPos,
    ]);

    // Handler to create a new sun moment
    const handleAddSun = React.useCallback(async () => {
      if (!onUpdateMemory) return;

      const allSuns = (memory.goodFacts || []).filter(
        (fact: any) => fact && typeof fact === "object",
      );
      // Find first sun that's not visible yet
      const nextSun = allSuns.find(
        (sun: any) => sun?.id && !visibleMomentIds.has(sun.id),
      );
      if (!nextSun) return;

      // Calculate final position
      const visibleSuns = allSuns.filter((s: any) =>
        visibleMomentIds.has(s.id),
      );
      const clampedPos = calculateClampedPosition(
        nextSun.x,
        nextSun.y,
        sunWidth,
        sunHeight,
        visibleSuns.length,
        allSuns.length,
        memorySize,
        "sun",
      );

      // Store start position for animation (button center, since panX/panY represent center)
      // Set this FIRST before marking as visible to ensure it's available when component renders
      // If button position isn't measured yet, measure it using requestAnimationFrame to ensure layout is complete
      const storeStartPosition = (
        buttonPos: { x: number; y: number } | null,
      ) => {
        if (buttonPos) {
          setNewlyCreatedMoments((prev) => {
            const next = new Map(prev);
            next.set(nextSun.id, {
              startX: buttonPos.x,
              startY: buttonPos.y,
            });
            return next;
          });
        }
      };

      if (sunButtonPos) {
        storeStartPosition(sunButtonPos);
      } else if (sunButtonRef.current) {
        // If position not available yet, measure it now
        // Use requestAnimationFrame to ensure layout has completed
        requestAnimationFrame(() => {
          sunButtonRef.current?.measure(
            (
              fx: number,
              fy: number,
              width: number,
              height: number,
              px: number,
              py: number,
            ) => {
              const buttonCenterX = px + width / 2;
              const buttonCenterY = py + height / 2;
              const measuredPos = { x: buttonCenterX, y: buttonCenterY };
              setSunButtonPos(measuredPos);
              storeStartPosition(measuredPos);
            },
          );
        });
      }

      // Update memory with new position
      const updatedGoodFacts = (memory.goodFacts || []).map((fact: any) =>
        fact.id === nextSun.id
          ? { ...fact, x: clampedPos.x, y: clampedPos.y }
          : fact,
      );
      await onUpdateMemory({ goodFacts: updatedGoodFacts });

      // Mark as visible AFTER start position is set
      // If button position was already available, mark visible immediately
      // Otherwise, wait for the measurement to complete
      const markVisible = () => {
        setTimeout(() => {
          setVisibleMomentIds((prev) => new Set([...prev, nextSun.id]));
          // Set this as the active moment when created
          setActiveMomentId(nextSun.id);
          // Don't clear start position - it's harmless to keep it and prevents re-render issues
        }, 50); // Small delay to ensure start position state is set
      };

      if (sunButtonPos) {
        markVisible();
      } else {
        // Wait a bit longer if we had to measure the button position
        setTimeout(markVisible, 100);
      }
    }, [
      memory.goodFacts,
      visibleMomentIds,
      onUpdateMemory,
      calculateClampedPosition,
      sunWidth,
      sunHeight,
      memorySize,
      sunButtonPos,
    ]);

    // Handler to create a new lesson moment
    const handleAddLesson = React.useCallback(async () => {
      if (!onUpdateMemory) return;

      const allLessons = (memory.lessonsLearned || []).filter(
        (lesson: any) => lesson && typeof lesson === "object",
      );
      // Find first lesson that's not visible yet
      const nextLesson = allLessons.find(
        (lesson: any) => lesson?.id && !visibleMomentIds.has(lesson.id),
      );
      if (!nextLesson) return;

      // Calculate final position (lessons use same dimensions as suns for now)
      const visibleLessons = allLessons.filter((l: any) =>
        visibleMomentIds.has(l.id),
      );
      const clampedPos = calculateClampedPosition(
        nextLesson.x,
        nextLesson.y,
        sunWidth, // Use sunWidth for lessons
        sunHeight, // Use sunHeight for lessons
        visibleLessons.length,
        allLessons.length,
        memorySize,
        "sun", // Use 'sun' type for lessons
      );

      // Store start position for animation
      const storeStartPosition = (
        buttonPos: { x: number; y: number } | null,
      ) => {
        if (buttonPos) {
          setNewlyCreatedMoments((prev) => {
            const next = new Map(prev);
            next.set(nextLesson.id, {
              startX: buttonPos.x,
              startY: buttonPos.y,
            });
            return next;
          });
        }
      };

      if (lessonButtonPos) {
        storeStartPosition(lessonButtonPos);
      } else if (lessonButtonRef.current) {
        requestAnimationFrame(() => {
          lessonButtonRef.current?.measure(
            (
              fx: number,
              fy: number,
              width: number,
              height: number,
              px: number,
              py: number,
            ) => {
              const buttonCenterX = px + width / 2;
              const buttonCenterY = py + height / 2;
              const measuredPos = { x: buttonCenterX, y: buttonCenterY };
              setLessonButtonPos(measuredPos);
              storeStartPosition(measuredPos);
            },
          );
        });
      }

      // Update memory with new position
      const updatedLessonsLearned = (memory.lessonsLearned || []).map(
        (lesson: any) =>
          lesson.id === nextLesson.id
            ? { ...lesson, x: clampedPos.x, y: clampedPos.y }
            : lesson,
      );
      await onUpdateMemory({ lessonsLearned: updatedLessonsLearned });

      // Mark as visible AFTER start position is set
      const markVisible = () => {
        setTimeout(() => {
          setVisibleMomentIds((prev) => new Set([...prev, nextLesson.id]));
          // Set this as the active moment when created
          setActiveMomentId(nextLesson.id);
        }, 50);
      };

      if (lessonButtonPos) {
        markVisible();
      } else {
        setTimeout(markVisible, 100);
      }
    }, [
      memory.lessonsLearned,
      visibleMomentIds,
      onUpdateMemory,
      calculateClampedPosition,
      sunWidth,
      sunHeight,
      memorySize,
      lessonButtonPos,
    ]);

    const floatAnimation = useSharedValue(0);

    // Scale animation for focused state - memories scale to 2x (bigger than avatar for visibility)
    const scale = useSharedValue(isMemoryFocused ? 2.5 : isFocused ? 2 : 1);
    React.useEffect(() => {
      scale.value = withSpring(isMemoryFocused ? 2.5 : isFocused ? 2 : 1, {
        damping: 15,
        stiffness: 100,
      });
    }, [isFocused, isMemoryFocused, scale]);

    React.useEffect(() => {
      if (!isMemoryFocused) {
        floatAnimation.value = withRepeat(
          withTiming(1, {
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true,
        );
      }

      return () => {
        // Cancel infinite float animation on cleanup
        cancelAnimation(floatAnimation);
      };
    }, [floatAnimation, isMemoryFocused]);

    // Shared values for memory center position (used by moments to orbit with memory)
    const memoryCenterX = useSharedValue(position.x);
    const memoryCenterY = useSharedValue(position.y);

    // Random radius offset for spinning animation (varies between -8 and +8 pixels)
    const radiusOffset = useSharedValue(Math.random() * 16 - 8);

    // Calculate memory position relative to container center
    // In wheel mode, each memory orbits individually around the entity
    const memoryAnimatedPosition = useAnimatedStyle(() => {
      "worklet";

      const isWheelMode = showEntityWheelShared
        ? showEntityWheelShared.value
        : false;

      let centerX = position.x;
      let centerY = position.y;
      let left = position.x - memorySize / 2;
      let top = position.y - memorySize / 2;

      if (isMemoryFocused) {
        // When memory is focused, center it on screen (moved higher)
        // Positive offsetY moves UP (subtracted from center)
        const offsetYValue = 120;
        centerX = SCREEN_WIDTH / 2;
        centerY = SCREEN_HEIGHT / 2 - offsetYValue;
        left = centerX - memorySize / 2;
        top = centerY - memorySize / 2;
      } else if (orbitAngle && baseOrbitAngle !== undefined && (isWheelMode || isFocused)) {
        // In focused or wheel mode with orbit animation, calculate position based on current orbit angle
        // IMPORTANT: Access orbitAngle.value to make this worklet reactive to changes
        const currentOrbitAngle = orbitAngle.value;

        // Calculate the current angle for this memory
        // baseOrbitAngle is this memory's starting position in radians
        // currentOrbitAngle is the current rotation offset in degrees
        // entityHintRotation adds wiggle when spin hint is shown
        const hintRot = entityHintRotation?.value ?? 0;
        const currentAngleRad =
          baseOrbitAngle + (currentOrbitAngle * Math.PI) / 180 + hintRot;

        // Calculate orbital radius (distance from entity center)
        // Add random offset to create slight variation during spin
        const baseRadius = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const radius = baseRadius + radiusOffset.value;

        // Calculate new position in circular orbit
        const newOffsetX = radius * Math.cos(currentAngleRad);
        const newOffsetY = radius * Math.sin(currentAngleRad);

        // Memory center position in screen coordinates
        centerX = SCREEN_WIDTH + newOffsetX;
        centerY = SCREEN_HEIGHT + newOffsetY;

        // Position relative to container center (where avatar is at SCREEN_WIDTH, SCREEN_HEIGHT)
        left = centerX - memorySize / 2;
        top = centerY - memorySize / 2;
      }

      // Update shared values for moments to use
      memoryCenterX.value = centerX;
      memoryCenterY.value = centerY;

      return {
        left,
        top,
      };
    });

    // Slide out animation for non-focused memories
    const slideOutStyle = useAnimatedStyle(() => {
      if (!memorySlideOffset || isMemoryFocused) {
        return {};
      }
      return {
        transform: [
          {
            translateX: memorySlideOffset.value * (offsetX > 0 ? 1 : -1),
          },
          {
            translateY: memorySlideOffset.value * (offsetY > 0 ? 1 : -1),
          },
        ],
        opacity: 1 - memorySlideOffset.value / (SCREEN_WIDTH * 2),
      };
    });

    // Entrance animation for focused memory
    const focusedMemoryEntrance = useSharedValue(0);

    React.useEffect(() => {
      if (isMemoryFocused) {
        // Start from 0 and animate to 1
        focusedMemoryEntrance.value = 0;
        focusedMemoryEntrance.value = withSpring(1, {
          damping: 15,
          stiffness: 120,
          mass: 0.8,
        });
      } else {
        focusedMemoryEntrance.value = 0;
      }
    }, [isMemoryFocused, focusedMemoryEntrance]);

    const focusedMemoryStyle = useAnimatedStyle(() => {
      if (!isMemoryFocused) {
        return {};
      }

      // Entrance animation
      const progress = focusedMemoryEntrance.value;
      return {
        opacity: progress,
        transform: [
          {
            scale: 0.5 + progress * 0.5, // Scale from 0.5 to 1
          },
        ],
      };
    });

    const animatedStyle = useAnimatedStyle(() => {
      const nudgeMul =
        nudgeTargetIndex &&
        nudgePulseScale &&
        memorySlotIndex !== undefined &&
        nudgeTargetIndex.value === memorySlotIndex
          ? nudgePulseScale.value
          : 1;
      return {
        transform: [
          { translateY: floatAnimation.value * 4 },
          { scale: scale.value * nudgeMul },
        ],
        // Reduce opacity when entity wheel is active to indicate disabled state
        opacity: showEntityWheelShared?.value ? 0.3 : 1,
      };
    });

    const clouds = useMemo(() => {
      const truths = memory.hardTruths || [];
      // Filter out any invalid entries (must be objects, not arrays, not strings)
      const validClouds = truths.filter((truth: any) => {
        const isValid =
          truth && typeof truth === "object" && !Array.isArray(truth);
        return isValid;
      });
      return validClouds;
    }, [memory.hardTruths]);
    const suns = useMemo(() => {
      const facts = memory.goodFacts || [];
      // Filter out any invalid entries (must be objects)
      return facts.filter((fact: any) => fact && typeof fact === "object");
    }, [memory.goodFacts]);
    const lessons = useMemo(() => {
      const lessonsData = memory.lessonsLearned || [];
      // Filter out any invalid entries (must be objects)
      return lessonsData.filter(
        (lesson: any) => lesson && typeof lesson === "object",
      );
    }, [memory.lessonsLearned]);

    // Calculate sunny percentage for gradient overlay
    const sunnyPercentage = useMemo(() => {
      const totalClouds = clouds.length;
      const totalSuns = suns.length;
      const total = totalClouds + totalSuns;
      if (total === 0) return 50; // Neutral if no moments
      return (totalSuns / total) * 100;
    }, [clouds.length, suns.length]);

    // Determine if memory is "sunny" (more good facts than hard truths) or "cloudy" (more hard truths than good facts)
    const hasMoments = clouds.length + suns.length > 0;

    // Calculate cloud and sun positions relative to memory
    // Distribute all moments evenly around the circle, interleaving clouds and suns
    const { cloudPositions, sunPositions, lessonPositions } = useMemo(() => {
      const totalMoments = clouds.length + suns.length + lessons.length;
      if (totalMoments === 0) {
        return { cloudPositions: [], sunPositions: [], lessonPositions: [] };
      }

      // Use Bresenham-like algorithm to distribute clouds, suns, and lessons evenly
      // This ensures they're interleaved proportionally without overlaps
      const cloudPositionsResult: {
        angle: number;
        offsetX: number;
        offsetY: number;
      }[] = [];
      const sunPositionsResult: {
        angle: number;
        offsetX: number;
        offsetY: number;
      }[] = [];
      const lessonPositionsResult: {
        angle: number;
        offsetX: number;
        offsetY: number;
      }[] = [];

      let cloudError = 0;
      let sunError = 0;
      let lessonError = 0;
      let cloudIndex = 0;
      let sunIndex = 0;
      let lessonIndex = 0;

      // Distribute positions using error accumulation (Bresenham-like)
      for (let position = 0; position < totalMoments; position++) {
        // Calculate error for all types
        cloudError += clouds.length;
        sunError += suns.length;
        lessonError += lessons.length;

        // Choose the one with highest error (needs placement most)
        if (
          cloudIndex < clouds.length &&
          cloudError >= sunError &&
          cloudError >= lessonError
        ) {
          const angle = (position * 2 * Math.PI) / totalMoments;
          cloudPositionsResult.push({
            angle,
            offsetX: cloudRadius * Math.cos(angle),
            offsetY: cloudRadius * Math.sin(angle),
          });
          cloudIndex++;
          cloudError -= totalMoments;
        } else if (lessonIndex < lessons.length && lessonError >= sunError) {
          const angle = (position * 2 * Math.PI) / totalMoments;
          lessonPositionsResult.push({
            angle,
            offsetX: lessonRadius * Math.cos(angle),
            offsetY: lessonRadius * Math.sin(angle),
          });
          lessonIndex++;
          lessonError -= totalMoments;
        } else if (sunIndex < suns.length) {
          const angle = (position * 2 * Math.PI) / totalMoments;
          sunPositionsResult.push({
            angle,
            offsetX: sunRadius * Math.cos(angle),
            offsetY: sunRadius * Math.sin(angle),
          });
          sunIndex++;
          sunError -= totalMoments;
        }
      }

      return {
        cloudPositions: cloudPositionsResult,
        sunPositions: sunPositionsResult,
        lessonPositions: lessonPositionsResult,
      };
    }, [clouds, suns, lessons, cloudRadius, sunRadius, lessonRadius]);

    // Click on memory: focus the memory (and profile if not already focused)
    const handlePress = React.useCallback(() => {
      // Don't handle press if handlers are disabled (e.g., entity wheel is active)
      if (!onMemoryFocus && !onPress) {
        return;
      }

      if (isMemoryFocused) {
        // Already focused, do nothing
        return;
      }

      // Always try to focus the memory
      if (onMemoryFocus) {
        onMemoryFocus(
          memory.entityId || memory.profileId || "",
          memory.id,
          memory.sphere || "relationships",
        );
      }

      // If profile is not focused, also focus it
      if (!isFocused && onPress) {
        onPress();
      }
    }, [
      onMemoryFocus,
      onPress,
      isMemoryFocused,
      isFocused,
      memory.id,
      memory.entityId,
      memory.profileId,
      memory.sphere,
    ]);

    // Skip rendering this memory if another memory from the same entity is focused and this one isn't
    // OR if THIS memory is focused (it will be rendered by FocusedMemoryRenderer instead)
    // This prevents duplicate rendering and unnecessary re-renders when a specific memory is focused
    // Note: This check happens after hooks to comply with Rules of Hooks
    if (focusedMemory) {
      const focusedEntityId =
        focusedMemory.profileId ||
        focusedMemory.jobId ||
        focusedMemory.familyMemberId ||
        focusedMemory.friendId ||
        focusedMemory.hobbyId;
      const currentEntityId =
        memory.profileId ||
        memory.jobId ||
        memory.familyMemberId ||
        memory.friendId ||
        memory.hobbyId;

      // Hide this memory if it's from the same entity and either:
      // 1. This IS the focused memory (FocusedMemoryRenderer will handle it)
      // 2. Another memory from this entity is focused
      if (focusedEntityId === currentEntityId) {
        return null;
      }
    }

    // Determine if we should use static or animated positioning
    // Only use static position as fallback when no animated position is available
    const hasAnimatedPosition =
      isMemoryFocused ||
      (zoomProgress &&
        avatarStartX &&
        avatarStartY &&
        avatarTargetX !== undefined &&
        avatarTargetY !== undefined &&
        avatarPosition) ||
      (focusedX && focusedY) ||
      (avatarPanX && avatarPanY);

    // Build base style with conditional static positioning
    const baseStyle = {
      position: "absolute" as const,
      // Only set static position if there's no animated position
      // This prevents duplicate rendering where both static and animated positions are visible
      ...(hasAnimatedPosition
        ? {}
        : {
            left: position.x - memorySize / 2,
            top: position.y - memorySize / 2,
          }),
      zIndex: isMemoryFocused ? 1000 : 50, // Memory base layer - higher than avatars (100) so they appear in front
      pointerEvents: "box-none" as const, // Allow touches to pass through to Pressable
    };

    return (
      <>
        <Animated.View
          pointerEvents={
            showEntityWheel || (!onMemoryFocus && !onPress) ? "none" : "auto"
          } // Disable all touches when entity wheel is active (use PROP not ref for render-time check)
          style={[
            baseStyle,
            memoryAnimatedPosition,
            animatedStyle,
            slideOutStyle,
            focusedMemoryStyle,
          ]}
        >
          {/* Memory title above the circle */}
          {isMemoryFocused && memory.title && (
            <ThemedText
              size="l"
              weight="semibold"
              numberOfLines={2}
              style={{
                position: "absolute",
                top: -40,
                left: -memorySize * 0.25,
                right: -memorySize * 0.25,
                textAlign: "center",
                zIndex: 20,
              }}
            >
              {memory.title}
            </ThemedText>
          )}
          <View
            style={{
              width: memorySize,
              height: memorySize,
              shadowColor: (() => {
                const t = sunnyPercentage / 100;
                const dark = hexToRgb(momentColors.cloudy.background);
                const bright = hexToRgb(momentColors.sunny.background);
                const r = Math.round(dark.r + (bright.r - dark.r) * t);
                const g = Math.round(dark.g + (bright.g - dark.g) * t);
                const b = Math.round(dark.b + (bright.b - dark.b) * t);
                return `rgb(${r}, ${g}, ${b})`;
              })(),
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isMemoryFocused ? 0.3 : 0.8,
              shadowRadius: isMemoryFocused ? 10 : 20,
              elevation: isMemoryFocused ? 6 : 12,
            }}
          >
            <Pressable
              disabled={showEntityWheel || (!onMemoryFocus && !onPress)} // Disable when entity wheel is active (use PROP for render-time check)
              style={{
                pointerEvents:
                  showEntityWheel || (!onMemoryFocus && !onPress)
                    ? "none"
                    : "auto", // Disable touches when entity wheel is active (use PROP for render-time check)
                width: memorySize,
                height: memorySize,
              }}
              onPress={() => {
                // CRITICAL: Check ref FIRST for absolute latest value, bypassing React's prop system
                if (showEntityWheelRef?.current) {
                  return;
                }
                // Fallback to prop check
                if (showEntityWheel) {
                  return;
                }
                handlePress();
              }}
            >
              {/* SVG Progress Bar Border - shows black and yellow proportionally - only show when not focused */}
              {hasMoments && !isMemoryFocused && (
                <Svg
                  width={memorySize}
                  height={memorySize}
                  style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}
                >
                  {(() => {
                    const centerX = memorySize / 2;
                    const centerY = memorySize / 2;
                    const strokeWidth = 1;
                    const borderRadius = memorySize / 2 - strokeWidth / 2; // Align border exactly on circle edge
                    const circumference = 2 * Math.PI * borderRadius;
                    const cloudyPercentage = 100 - sunnyPercentage;

                    // Black circle for cloudy portion - starts at top (-90 degrees)
                    const blackDashLength =
                      (cloudyPercentage / 100) * circumference;

                    // Yellow circle for sunny portion - starts where black ends
                    const yellowDashLength =
                      (sunnyPercentage / 100) * circumference;
                    // Rotate yellow to start where black ends: -90 (start) + (cloudyPercentage / 100) * 360 (where black ends)
                    const yellowRotation = -90 + (cloudyPercentage / 100) * 360;

                    return (
                      <>
                        {/* Cloudy border */}
                        {cloudyPercentage > 0 && (
                          <Circle
                            cx={centerX}
                            cy={centerY}
                            r={borderRadius}
                            stroke={momentColors.cloudy.background}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={`${blackDashLength} ${circumference * 10}`}
                            strokeDashoffset={0}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${centerX} ${centerY})`}
                          />
                        )}
                        {/* Sunny border */}
                        {sunnyPercentage > 0 && (
                          <Circle
                            cx={centerX}
                            cy={centerY}
                            r={borderRadius}
                            stroke={momentColors.sunny.background}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={`${yellowDashLength} ${circumference * 10}`}
                            strokeDashoffset={0}
                            strokeLinecap="round"
                            transform={`rotate(${yellowRotation} ${centerX} ${centerY})`}
                          />
                        )}
                      </>
                    );
                  })()}
                </Svg>
              )}
              <View
                style={{
                  width: memorySize,
                  height: memorySize,
                  borderRadius: memorySize / 2,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(100, 150, 200, 0.9)"
                      : "rgba(150, 200, 255, 0.95)",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {memory.imageUri ? (
                  <>
                    <Image
                      source={{ uri: memory.imageUri }}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: memorySize / 2,
                      }}
                      contentFit="cover"
                    />

                  </>
                ) : (
                  <MaterialIcons name="auto-stories" size={24} color="#fff" />
                )}
              </View>
            </Pressable>

            {/* Share button - moved outside parent Pressable to avoid nested Pressable issues */}
            {isMemoryFocused && memory.imageUri && (
              <Pressable
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  try {
                    // Format memory data as text
                    const title = memory.title || "Memory";
                    let message = `${title}\n\n`;

                    if (memory.goodFacts && memory.goodFacts.length > 0) {
                      message += "☀️ Sunny Moments:\n";
                      memory.goodFacts.forEach((fact: any, index: number) => {
                        const text =
                          typeof fact === "string"
                            ? fact
                            : fact.text || fact.content || String(fact);
                        message += `${index + 1}. ${text}\n`;
                      });
                      message += "\n";
                    }

                    if (memory.hardTruths && memory.hardTruths.length > 0) {
                      message += "☁️ Hard Truths:\n";
                      memory.hardTruths.forEach((truth: any, index: number) => {
                        const text =
                          typeof truth === "string"
                            ? truth
                            : truth.text || truth.content || String(truth);
                        message += `${index + 1}. ${text}\n`;
                      });
                      message += "\n";
                    }

                    if (
                      memory.lessonsLearned &&
                      memory.lessonsLearned.length > 0
                    ) {
                      message += "💡 Lessons Learned:\n";
                      memory.lessonsLearned.forEach(
                        (lesson: any, index: number) => {
                          const text =
                            typeof lesson === "string"
                              ? lesson
                              : lesson.text || lesson.content || String(lesson);
                          message += `${index + 1}. ${text}\n`;
                        },
                      );
                    }

                    // Open modal with content
                    setShareModalContent({
                      title: title,
                      message: message.trim(),
                    });
                    setShareModalVisible(true);
                  } catch (error) {
                    logError("HomeScreen:ShareContent", error);
                  }
                }}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(0, 0, 0, 0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 20,
                  borderWidth: 2,
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.3)"
                      : "rgba(255, 255, 255, 0.8)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <MaterialIcons name="share" size={24} color="#fff" />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Calculate z-index based on which type has more moments */}
        {(() => {
          const cloudCount = clouds.length;
          const sunCount = suns.length;
          const cloudsOnTop = cloudCount > sunCount;
          // Moments should be on top of memories
          // When memory is focused, use much higher z-index to be above the memory (which has zIndex 1000)
          const baseZIndex = isMemoryFocused ? 1001 : 20;
          const cloudZIndex = cloudsOnTop ? baseZIndex + 4 : baseZIndex + 3; // Higher than memories so moments are visible on top
          const sunZIndex = cloudsOnTop ? baseZIndex + 3 : baseZIndex + 4; // Higher than memories so moments are visible on top
          const lessonZIndex = baseZIndex + 5; // Lessons always on top of suns and clouds

          return (
            <MemoryMomentsRenderer
              clouds={clouds}
              suns={suns}
              lessons={lessons}
              isFocused={isFocused}
              isMemoryFocused={isMemoryFocused ?? false}
              visibleMomentIds={visibleMomentIds}
              activeMomentId={activeMomentId}
              setActiveMomentId={setActiveMomentId}
              calculateClampedPosition={calculateClampedPosition}
              cloudWidth={cloudWidth}
              cloudHeight={cloudHeight}
              sunWidth={sunWidth}
              sunHeight={sunHeight}
              memorySize={memorySize}
              cloudPositions={cloudPositions}
              sunPositions={sunPositions}
              lessonPositions={lessonPositions}
              position={position}
              memoryAnimatedPosition={memoryAnimatedPosition}
              memoryCenterX={memoryCenterX}
              memoryCenterY={memoryCenterY}
              avatarPanX={avatarPanX}
              avatarPanY={avatarPanY}
              focusedX={focusedX}
              focusedY={focusedY}
              offsetX={offsetX}
              offsetY={offsetY}
              cloudZIndex={cloudZIndex}
              sunZIndex={sunZIndex}
              lessonZIndex={lessonZIndex}
              colorScheme={colorScheme}
              onDoubleTap={onDoubleTap}
              onUpdateMemory={onUpdateMemory}
              newlyCreatedMoments={newlyCreatedMoments}
              memory={memory}
              showEntityWheel={showEntityWheel}
              showEntityWheelRef={showEntityWheelRef}
            />
          );
        })()}

        {/* Cloud and Sun Buttons - show buttons but without count badges */}
        <MemoryActionButtons
          isMemoryFocused={isMemoryFocused ?? false}
          memory={memory}
          visibleMomentIds={visibleMomentIds}
          memorySize={memorySize}
          isLargeDevice={isLargeDevice}
          colorScheme={colorScheme}
          cloudButtonRef={cloudButtonRef}
          sunButtonRef={sunButtonRef}
          lessonButtonRef={lessonButtonRef}
          setCloudButtonPos={setCloudButtonPos}
          setSunButtonPos={setSunButtonPos}
          setLessonButtonPos={setLessonButtonPos}
          handleAddCloud={handleAddCloud}
          handleAddSun={handleAddSun}
          handleAddLesson={handleAddLesson}
        />

        {/* Share Modal */}
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          title={shareModalContent.title}
          content={shareModalContent.message}
        />
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Note: avatarTargetX and avatarTargetY are constants (SCREEN_WIDTH/2, SCREEN_HEIGHT/2), so we don't need to compare them
    return (
      prevProps.memory.id === nextProps.memory.id &&
      prevProps.position.x === nextProps.position.x &&
      prevProps.position.y === nextProps.position.y &&
      prevProps.offsetX === nextProps.offsetX &&
      prevProps.offsetY === nextProps.offsetY &&
      prevProps.isFocused === nextProps.isFocused &&
      prevProps.isMemoryFocused === nextProps.isMemoryFocused &&
      prevProps.calculatedMemorySize === nextProps.calculatedMemorySize &&
      prevProps.colorScheme === nextProps.colorScheme &&
      prevProps.avatarPosition?.x === nextProps.avatarPosition?.x &&
      prevProps.avatarPosition?.y === nextProps.avatarPosition?.y &&
      prevProps.focusedMemory?.profileId ===
        nextProps.focusedMemory?.profileId &&
      prevProps.focusedMemory?.memoryId === nextProps.focusedMemory?.memoryId &&
      (prevProps.memory.hardTruths?.length ?? 0) ===
        (nextProps.memory.hardTruths?.length ?? 0) &&
      (prevProps.memory.goodFacts?.length ?? 0) ===
        (nextProps.memory.goodFacts?.length ?? 0)
    );
  },
);

// Floating Cloud Component
const FloatingCloud = React.memo(function FloatingCloud({
  cloud,
  position,
  memoryAnimatedPosition,
  memoryCenterX,
  memoryCenterY,
  avatarPanX,
  avatarPanY,
  focusedX,
  focusedY,
  memoryOffsetX,
  memoryOffsetY,
  offsetX,
  offsetY,
  zIndex,
  isFocused,
  colorScheme,
  onPress,
  sunnyPercentage = 50,
  showEntityWheel,
  showEntityWheelRef,
}: {
  cloud: any;
  position: { x: number; y: number };
  memoryAnimatedPosition?: any;
  memoryCenterX?: ReturnType<typeof useSharedValue<number>>;
  memoryCenterY?: ReturnType<typeof useSharedValue<number>>;
  avatarPanX?: any;
  avatarPanY?: any;
  focusedX?: any;
  focusedY?: any;
  memoryOffsetX: number;
  memoryOffsetY: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
  isFocused: boolean;
  colorScheme: "light" | "dark";
  onPress?: () => void;
  sunnyPercentage?: number;
  showEntityWheel?: boolean;
  showEntityWheelRef?: React.MutableRefObject<boolean>;
}) {
  const { momentColors } = useMomentColors();
  const cloudSize = isFocused ? 18 : 24;

  const floatAnimation = useSharedValue(0);

  // No scale animation when focused - use proper base size instead
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = 1; // Keep at 1 to maintain proportions
  }, [isFocused, scale]);

  React.useEffect(() => {
    if (isFocused) {
      floatAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(floatAnimation);
      floatAnimation.value = 0;
    }

    return () => {
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatAnimation);
    };
  }, [floatAnimation, isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
    // Reduce opacity when entity wheel is active (similar to how spheres are disabled)
    opacity: showEntityWheel ? 0.3 : 1,
  }));

  const cloudAnimatedPosition = useAnimatedStyle(() => {
    "worklet";

    // If we have animated memory center shared values, use them (for orbit mode)
    // Otherwise fall back to static position prop
    let finalX, finalY;

    if (memoryCenterX && memoryCenterY) {
      // Use animated memory center + offset for orbit mode
      const centerX = memoryCenterX.value;
      const centerY = memoryCenterY.value;
      finalX = centerX + offsetX - cloudSize / 2;
      finalY = centerY + offsetY - cloudSize / 2;
    } else {
      // Default: use the position prop directly (memory's absolute screen position)
      const safeX =
        typeof position?.x === "number" && !isNaN(position.x) ? position.x : 0;
      const safeY =
        typeof position?.y === "number" && !isNaN(position.y) ? position.y : 0;
      finalX = safeX - cloudSize / 2;
      finalY = safeY - cloudSize / 2;
    }

    return {
      left: finalX,
      top: finalY,
    };
  });

  // Safety check - if cloud is invalid, don't render (after all hooks)
  // Ensure cloud is a valid object and not a string or primitive
  if (!cloud || typeof cloud !== "object" || Array.isArray(cloud)) {
    return null;
  }

  // Ensure cloudSize is a number
  const safeCloudSize = typeof cloudSize === "number" ? cloudSize : 24;

  return (
    <Animated.View
      pointerEvents={showEntityWheel || !onPress ? "none" : "box-none"} // Disable all touches when entity wheel is active or no handler (use PROP for render-time check)
      style={[
        {
          position: "absolute",
          zIndex: typeof zIndex === "number" ? zIndex : 24, // Higher than memories (20) so moments are on top
        },
        cloudAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        disabled={showEntityWheel || !onPress} // Disable when entity wheel is active or no handler (use PROP for render-time check)
        style={{
          pointerEvents: showEntityWheel || !onPress ? "none" : "auto", // Disable touches when entity wheel is active or no handler (use PROP for render-time check)
          width: safeCloudSize,
          height: safeCloudSize,
        }}
        onPress={() => {
          // CRITICAL: Check ref FIRST for absolute latest value, bypassing React's prop system
          if (showEntityWheelRef?.current) {
            return;
          }
          // Fallback to prop check
          if (showEntityWheel) {
            return;
          }
          if (onPress) {
            try {
              onPress();
            } catch {
              // Error in onPress
            }
          }
        }}
      >
        <View
          style={{
            width: safeCloudSize,
            height: safeCloudSize,
            borderRadius: safeCloudSize / 2,
            backgroundColor:
              colorScheme === "dark" ? "#FFFFFF" : Colors.light.surfaceElevated1,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: "rgba(0,0,0,0.3)", // Dark border
            shadowColor: (() => {
              const t = sunnyPercentage / 100;
              const dark = hexToRgb(momentColors.cloudy.background);
              const bright = hexToRgb(momentColors.sunny.background);
              const r = Math.round(dark.r + (bright.r - dark.r) * t);
              const g = Math.round(dark.g + (bright.g - dark.g) * t);
              const b = Math.round(dark.b + (bright.b - dark.b) * t);
              return `rgb(${r}, ${g}, ${b})`;
            })(),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 7,
            elevation: 5,
          }}
        >
          <MaterialIcons
            name="cloud"
            size={safeCloudSize * 0.7}
            color={momentColors.cloudy.text}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// Floating Sun Component
const FloatingSun = React.memo(function FloatingSun({
  sun,
  position,
  memoryAnimatedPosition,
  memoryCenterX,
  memoryCenterY,
  avatarPanX,
  avatarPanY,
  focusedX,
  focusedY,
  memoryOffsetX,
  memoryOffsetY,
  offsetX,
  offsetY,
  zIndex,
  isFocused,
  colorScheme,
  onPress,
  sunnyPercentage = 50,
  showEntityWheel,
  showEntityWheelRef,
}: {
  sun: any;
  position: { x: number; y: number };
  memoryAnimatedPosition?: any;
  memoryCenterX?: ReturnType<typeof useSharedValue<number>>;
  memoryCenterY?: ReturnType<typeof useSharedValue<number>>;
  avatarPanX?: any;
  avatarPanY?: any;
  focusedX?: any;
  focusedY?: any;
  memoryOffsetX: number;
  memoryOffsetY: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
  isFocused: boolean;
  colorScheme: "light" | "dark";
  onPress?: () => void;
  sunnyPercentage?: number;
  showEntityWheel?: boolean;
  showEntityWheelRef?: React.MutableRefObject<boolean>;
}) {
  const { momentColors } = useMomentColors();
  const sunSize = isFocused ? 16 : 22;

  const floatAnimation = useSharedValue(0);

  // No scale animation when focused - use proper base size instead
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = 1; // Keep at 1 to maintain proportions
  }, [isFocused, scale]);

  React.useEffect(() => {
    if (isFocused) {
      floatAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(floatAnimation);
      floatAnimation.value = 0;
    }

    return () => {
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatAnimation);
    };
  }, [floatAnimation, isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
    // Reduce opacity when entity wheel is active (similar to how spheres are disabled)
    opacity: showEntityWheel ? 0.3 : 1,
  }));

  const sunAnimatedPosition = useAnimatedStyle(() => {
    "worklet";

    // If we have animated memory center shared values, use them (for orbit mode)
    // Otherwise fall back to static position prop
    let finalX, finalY;

    if (memoryCenterX && memoryCenterY) {
      // Use animated memory center + offset for orbit mode
      const centerX = memoryCenterX.value;
      const centerY = memoryCenterY.value;
      finalX = centerX + offsetX - sunSize / 2;
      finalY = centerY + offsetY - sunSize / 2;
    } else {
      // Default: use the position prop directly (memory's absolute screen position)
      const safeX =
        typeof position?.x === "number" && !isNaN(position.x) ? position.x : 0;
      const safeY =
        typeof position?.y === "number" && !isNaN(position.y) ? position.y : 0;
      finalX = safeX - sunSize / 2;
      finalY = safeY - sunSize / 2;
    }

    return {
      left: finalX,
      top: finalY,
    };
  });

  return (
    <Animated.View
      pointerEvents={showEntityWheel || !onPress ? "none" : "box-none"} // Disable all touches when entity wheel is active or no handler (use PROP for render-time check)
      style={[
        {
          position: "absolute",
          zIndex: typeof zIndex === "number" ? zIndex : 24, // Higher than memories (20) so moments are on top
        },
        sunAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        disabled={showEntityWheel || !onPress} // Disable when entity wheel is active or no handler (use PROP for render-time check)
        style={{ pointerEvents: showEntityWheel || !onPress ? "none" : "auto" }} // Disable touches when entity wheel is active or no handler (use PROP for render-time check)
        onPress={() => {
          // CRITICAL: Check ref FIRST for absolute latest value, bypassing React's prop system
          if (showEntityWheelRef?.current) {
            return;
          }
          // Fallback to prop check
          if (showEntityWheel) {
            return;
          }
          if (onPress) {
            try {
              onPress();
            } catch {
              // Error in onPress
            }
          }
        }}
      >
        <View
          style={{
            width: sunSize,
            height: sunSize,
            shadowColor: (() => {
              const t = sunnyPercentage / 100;
              const dark = hexToRgb(momentColors.cloudy.background);
              const bright = hexToRgb(momentColors.sunny.background);
              const r = Math.round(dark.r + (bright.r - dark.r) * t);
              const g = Math.round(dark.g + (bright.g - dark.g) * t);
              const b = Math.round(dark.b + (bright.b - dark.b) * t);
              return `rgb(${r}, ${g}, ${b})`;
            })(),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 7,
            elevation: 5,
          }}
        >
          <Svg
            width={sunSize}
            height={sunSize}
            viewBox="0 0 22 22"
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Defs>
              <RadialGradient
                id={`floatingSunGradient-${sun?.id || "default"}`}
                cx="11"
                cy="11"
                rx="5"
                ry="5"
                fx="11"
                fy="11"
                gradientUnits="userSpaceOnUse"
              >
                <Stop
                  offset="0%"
                  stopColor={momentColors.sunny.background}
                  stopOpacity="0.9"
                />
                <Stop
                  offset="50%"
                  stopColor={momentColors.sunny.background}
                  stopOpacity="1"
                />
                <Stop
                  offset="100%"
                  stopColor={momentColors.sunny.background}
                  stopOpacity="1"
                />
              </RadialGradient>
            </Defs>
            {/* Sun rays - 16 triangular rays for smaller version */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360) / 16;
              const radian = (angle * Math.PI) / 180;
              const centerX = 11;
              const centerY = 11;
              const innerRadius = 5;
              const outerRadius = 12; // Longer rays
              const rayWidth = 1.2; // Width of triangle base at outer edge

              // Calculate triangle points
              const innerX = centerX + Math.cos(radian) * innerRadius;
              const innerY = centerY + Math.sin(radian) * innerRadius;

              const outerX = centerX + Math.cos(radian) * outerRadius;
              const outerY = centerY + Math.sin(radian) * outerRadius;

              // Perpendicular vector for triangle width
              const perpAngle = radian + Math.PI / 2;
              const halfWidth = rayWidth / 2;
              const leftX = outerX + Math.cos(perpAngle) * halfWidth;
              const leftY = outerY + Math.sin(perpAngle) * halfWidth;
              const rightX = outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
              const rightY = outerY + Math.sin(perpAngle + Math.PI) * halfWidth;

              return (
                <Path
                  key={`floatingRay-${i}`}
                  d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                  fill={momentColors.sunny.background}
                />
              );
            })}
            {/* Central circle */}
            <Circle
              cx="11"
              cy="11"
              r="5"
              fill={`url(#floatingSunGradient-${sun?.id || "default"})`}
            />
          </Svg>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// Floating Lesson Component
const FloatingLesson = React.memo(function FloatingLesson({
  lesson,
  position,
  memoryAnimatedPosition,
  memoryCenterX,
  memoryCenterY,
  avatarPanX,
  avatarPanY,
  focusedX,
  focusedY,
  memoryOffsetX,
  memoryOffsetY,
  offsetX,
  offsetY,
  zIndex,
  isFocused,
  colorScheme,
  onPress,
  showEntityWheel,
  showEntityWheelRef,
}: {
  lesson: any;
  position: { x: number; y: number };
  memoryAnimatedPosition?: any;
  memoryCenterX?: ReturnType<typeof useSharedValue<number>>;
  memoryCenterY?: ReturnType<typeof useSharedValue<number>>;
  avatarPanX?: any;
  avatarPanY?: any;
  focusedX?: any;
  focusedY?: any;
  memoryOffsetX: number;
  memoryOffsetY: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
  isFocused: boolean;
  colorScheme: "light" | "dark";
  onPress?: () => void;
  showEntityWheel?: boolean;
  showEntityWheelRef?: React.MutableRefObject<boolean>;
}) {
  const { momentColors } = useMomentColors();
  const lessonSize = isFocused ? 16 : 22;

  const floatAnimation = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = 1;
  }, [isFocused, scale]);

  React.useEffect(() => {
    if (isFocused) {
      floatAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(floatAnimation);
      floatAnimation.value = 0;
    }

    return () => {
      cancelAnimation(floatAnimation);
    };
  }, [floatAnimation, isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
    // Reduce opacity when entity wheel is active (similar to how spheres are disabled)
    opacity: showEntityWheel ? 0.3 : 1,
  }));

  const lessonAnimatedPosition = useAnimatedStyle(() => {
    "worklet";

    let finalX, finalY;

    if (memoryCenterX && memoryCenterY) {
      const centerX = memoryCenterX.value;
      const centerY = memoryCenterY.value;
      finalX = centerX + offsetX - lessonSize / 2;
      finalY = centerY + offsetY - lessonSize / 2;
    } else {
      const safeX =
        typeof position?.x === "number" && !isNaN(position.x) ? position.x : 0;
      const safeY =
        typeof position?.y === "number" && !isNaN(position.y) ? position.y : 0;
      finalX = safeX - lessonSize / 2;
      finalY = safeY - lessonSize / 2;
    }

    return {
      left: finalX,
      top: finalY,
    };
  });

  return (
    <Animated.View
      pointerEvents={showEntityWheel || !onPress ? "none" : "box-none"} // Disable all touches when entity wheel is active or no handler (use PROP for render-time check)
      style={[
        {
          position: "absolute",
          zIndex: typeof zIndex === "number" ? zIndex : 24,
        },
        lessonAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        disabled={showEntityWheel || !onPress} // Disable when entity wheel is active or no handler (use PROP for render-time check)
        style={{ pointerEvents: showEntityWheel || !onPress ? "none" : "auto" }} // Disable touches when entity wheel is active or no handler (use PROP for render-time check)
        onPress={() => {
          // CRITICAL: Check ref FIRST for absolute latest value, bypassing React's prop system
          if (showEntityWheelRef?.current) {
            return;
          }
          // Fallback to prop check
          if (showEntityWheel) {
            return;
          }
          if (onPress) {
            try {
              onPress();
            } catch {
              // Error in onPress
            }
          }
        }}
      >
        <View
          style={{
            width: lessonSize,
            height: lessonSize,
            borderRadius: lessonSize / 2,
            backgroundColor: momentColors.lesson.background,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: momentColors.lesson.background,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <MaterialIcons
            name="lightbulb"
            size={lessonSize * 0.7}
            color={momentColors.lesson.text}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// Cosmic avatar palette (aligned with SunnyLifeAvatar in focused-sfera-view)
const COSMIC_RING_START = "#5CE1E6";
const COSMIC_RING_MID = "#9D7BDB";
const COSMIC_RING_END = "#7B68EE";
const COSMIC_TEXT = "#B8E8EC";
const COSMIC_TRACK = "#0D1525";
const MAIN_WHEEL_COSMIC_UNSELECTED = "rgba(26, 36, 64, 0.12)";
const MAIN_WHEEL_COSMIC_SELECTED = "rgba(92, 225, 230, 0.45)";

function mainWheelMomentTypeIconUnselected(scheme: "light" | "dark"): string {
  return scheme === "light" ? Colors.light.icon : "rgba(184, 232, 236, 0.95)";
}

/** Lesson exam popover after wheel spin: dark cosmic in dark mode, light surfaces in light mode (WCAG-friendly). */
function wheelExamModalPalette(scheme: "light" | "dark") {
  const isLight = scheme === "light";
  const gradientColors = isLight
    ? ([
        "#FFFFFF",
        Colors.light.surfaceElevated8,
        Colors.light.surfaceElevated4,
        Colors.light.surfaceElevated2,
      ] as const)
    : (["#0A0E1A", "#0F1422", "#151C2E", "#1A2440"] as const);
  return {
    gradientColors,
    shellShadowColor: isLight ? "rgba(0, 0, 0, 0.22)" : COSMIC_RING_START,
    shellShadowOpacity: isLight ? 0.18 : 0.5,
    borderColor: isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(92, 225, 230, 0.2)",
    loadingBorder: isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(92, 225, 230, 0.25)",
    bodyText: isLight ? Colors.light.text : COSMIC_TEXT,
    placeholder: isLight ? Colors.light.textDisabled : Colors.dark.textMediumEmphasis,
    inputBg: isLight ? Colors.light.surfaceElevated2 : "rgba(13, 21, 37, 0.8)",
    inputBorder: isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(92, 225, 230, 0.2)",
    triesLabel: isLight ? Colors.light.textMediumEmphasis : Colors.dark.textMediumEmphasis,
    closeBg: isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(92, 225, 230, 0.15)",
    closeBorder: isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(92, 225, 230, 0.3)",
    closeIcon: isLight ? Colors.light.text : COSMIC_TEXT,
    spinner: isLight ? Colors.light.primary : COSMIC_RING_START,
  };
}
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

// Constellation inside avatar circle (same pattern as SunnyLifeAvatar)
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
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b_.toString(16).padStart(2, "0")}`;
}

/** Hex to RGB 0–1 for FeColorMatrix (glow uses theme primary from personalization) */
function hexToRgbNorm(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

// Overall Percentage Avatar Component (center display)
const OverallPercentageAvatar = React.memo(function OverallPercentageAvatar({
  percentage,
  hasMemories,
  showPercentageLabel = true,
  colorScheme,
  colors,
}: {
  percentage: number;
  hasMemories: boolean;
  showPercentageLabel?: boolean;
  colorScheme: "light" | "dark";
  colors: any;
}) {
  const { momentColors } = useMomentColors();
  const { isTablet } = useLargeDevice();
  const t = useTranslate();
  const { language } = useLanguage();
  const primaryHex = colors.primary ?? Colors.dark.primary;
  const emptyAddFill = fabAccentBackground;
  const emptyAddIcon = Colors.dark.primaryLight;
  const glowMatrixValues = React.useMemo(() => {
    const rgb = hexToRgbNorm(primaryHex);
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
  }, [primaryHex]);

  // Calculate if floating entities intersect with main circle and adjust size accordingly
  // Floating entities are positioned: spherePosition + (cos(angle) * entityRadius, sin(angle) * entityRadius)
  // Where spherePosition is at distance Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3 from center
  // And entityRadius is isTablet ? 85 : 55 (larger on tablets by default)
  // Floating entity size is isTablet ? 36 : 24, so radius is isTablet ? 18 : 12
  const sphereDistanceFromCenter = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35;
  const floatingEntityRadius = isTablet ? 85 : 55;
  const floatingEntitySize = isTablet ? 36 : 20; // Decreased from 24 to 20 for smaller floating elements
  const floatingEntityRadiusSize = floatingEntitySize / 2;

  // Calculate minimum distance from main center to floating entity edge
  // This happens when the floating entity is positioned closest to center (on the line from center to sphere)
  const minDistanceToFloatingEntity =
    sphereDistanceFromCenter - floatingEntityRadius - floatingEntityRadiusSize;

  // Base avatar size
  const baseAvatarSize = isTablet ? 160 : 100; // Reduced - smaller central avatar
  const baseAvatarRadius = baseAvatarSize / 2;

  // Check if main circle (with some padding) would intersect floating entities
  // Add 5px padding to ensure clear separation
  const padding = 5;
  const maxSafeAvatarRadius = minDistanceToFloatingEntity - padding;

  // Use smaller size if intersection detected, otherwise use base size
  const avatarSize =
    maxSafeAvatarRadius < baseAvatarRadius
      ? Math.max(maxSafeAvatarRadius * 2, isTablet ? 140 : 80) // Minimum size to ensure readability
      : baseAvatarSize;

  const borderWidth = isTablet ? 12 : 8; // Scale border width proportionally
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const gradientColors =
    colorScheme === "dark" ? COSMIC_INNER_DARK : COSMIC_INNER_LIGHT;

  return (
    <View
      style={{
        position: "relative",
        width: avatarSize,
        height: avatarSize,
      }}
    >
      <View
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden", // Ensure perfect circle clipping
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
              id="overallNebulaHalo"
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
              <Stop offset="85%" stopColor={colors.primary} stopOpacity="0.2" />
              <Stop
                offset="100%"
                stopColor={colors.primaryDark ?? colors.primary}
                stopOpacity="0.35"
              />
            </RadialGradient>
            <Filter
              id="overallNebulaBlur"
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
              id="overallBorderGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
              <Stop
                offset="50%"
                stopColor={colors.primaryLight ?? colors.primary}
                stopOpacity="1"
              />
              <Stop
                offset="100%"
                stopColor={colors.primaryDark ?? colors.primary}
                stopOpacity="1"
              />
            </SvgLinearGradient>
            <Filter
              id="outerYellowGlow"
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
              id="yellowGlow"
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
                result="outerBlurMedium"
              />
              <FeColorMatrix
                in="outerBlurMedium"
                type="matrix"
                values={glowMatrixValues.m085}
                result="outerGlowMedium"
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
                <FeMergeNode in="outerGlowMedium" />
                <FeMergeNode in="innerGlow" />
                <FeMergeNode in="SourceGraphic" />
              </FeMerge>
            </Filter>
          </Defs>
          {/* Nebula halo - soft glow around outer part of circle */}
          <Circle
            cx={avatarSize / 2}
            cy={avatarSize / 2}
            r={radius + 18}
            fill="url(#overallNebulaHalo)"
            filter="url(#overallNebulaBlur)"
          />
          <Circle
            cx={avatarSize / 2}
            cy={avatarSize / 2}
            r={radius}
            stroke={COSMIC_TRACK}
            strokeWidth={borderWidth}
            fill="none"
          />
          {/* Outer glow layer - uses theme primary from personalization */}
          <Circle
            cx={avatarSize / 2}
            cy={avatarSize / 2}
            r={radius}
            stroke="url(#overallBorderGradient)"
            strokeWidth={borderWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#outerYellowGlow)"
            transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
          />
          {/* Glowing progress ring (theme primary from personalization) */}
          <Circle
            cx={avatarSize / 2}
            cy={avatarSize / 2}
            r={radius}
            stroke="url(#overallBorderGradient)"
            strokeWidth={borderWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#yellowGlow)"
            transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
          />
          {/* Constellation lines */}
          {AVATAR_CONSTELLATION_LINES.map(([i, j], k) => (
            <Line
              key={`line-${k}`}
              x1={AVATAR_STARS[i].x * avatarSize}
              y1={AVATAR_STARS[i].y * avatarSize}
              x2={AVATAR_STARS[j].x * avatarSize}
              y2={AVATAR_STARS[j].y * avatarSize}
              stroke={AVATAR_LINE_COLOR}
              strokeWidth={1}
              strokeLinecap="round"
            />
          ))}
          {/* Constellation dots */}
          {AVATAR_STARS.map((star, k) => (
            <Circle
              key={`star-${k}`}
              cx={star.x * avatarSize}
              cy={star.y * avatarSize}
              r={avatarSize < 120 ? 1 : 1.4}
              fill={AVATAR_STAR_COLOR}
            />
          ))}
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
                  style={{ color: COSMIC_TEXT, fontSize: 24 }}
                >
                  {Math.round(percentage)}%
                </ThemedText>
                {language === "bg" ? (
                  <View style={{ alignItems: "center" }}>
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={{
                        color: COSMIC_TEXT,
                        fontSize: 10,
                        marginTop: -2,
                        textAlign: "center",
                        lineHeight: 10,
                      }}
                    >
                      Слънчев
                    </ThemedText>
                    <ThemedText
                      size="sm"
                      weight="medium"
                      style={{
                        color: COSMIC_TEXT,
                        fontSize: 10,
                        textAlign: "center",
                        lineHeight: 10,
                        marginTop: -1,
                      }}
                    >
                      живот
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText
                    size="sm"
                    weight="medium"
                    style={{
                      color: COSMIC_TEXT,
                      fontSize: 12,
                      marginTop: -2,
                    }}
                  >
                    {t("avatar.sunnyLife")}
                  </ThemedText>
                )}
              </>
            ) : null
          ) : (
            <Pressable
              onPress={() => router.push("/(tabs)/spheres")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                justifyContent: "center",
                alignItems: "center",
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${emptyAddFill}40`,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialIcons
                  name="add"
                  size={28}
                  color={emptyAddIcon}
                />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Sun icon - darker shade of sunny color from settings */}
      {percentage > 0 &&
        (() => {
          const sunnyArcAngle = -90 + ((percentage / 100) * 360) / 2;
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

      {/* Cloud icon - positioned in the middle of the cloudy arc */}
      {percentage < 100 &&
        percentage > 0 &&
        (() => {
          // Calculate angle for middle of cloudy arc
          // Cloudy arc starts where sunny arc ends and goes to complete the circle
          // Start angle: -90° + (percentage/100 * 360°)
          // End angle: -90° + 360° (back to top)
          // Middle: start + (remaining arc / 2)
          const cloudyStartAngle = -90 + (percentage / 100) * 360;
          const cloudyArcLength = 360 - (percentage / 100) * 360;
          const cloudyArcAngle = cloudyStartAngle + cloudyArcLength / 2;
          const cloudyAngleRad = (cloudyArcAngle * Math.PI) / 180;
          const iconRadius = avatarSize / 2; // Position on the circle edge

          // Calculate position
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
    </View>
  );
});

// Sparkled Dots Component - animated glowing dots around avatar
const SparkledDots = React.memo(function SparkledDots({
  avatarSize,
  avatarCenterX,
  avatarCenterY,
  colorScheme,
  fullScreen = false,
}: {
  avatarSize: number;
  avatarCenterX: number | ReturnType<typeof useSharedValue<number>>;
  avatarCenterY: number | ReturnType<typeof useSharedValue<number>>;
  colorScheme: "light" | "dark";
  fullScreen?: boolean;
}) {
  const { isTablet } = useLargeDevice();

  // Generate random positions for dots around the avatar
  // Create more dots with better visibility
  const dots = React.useMemo(() => {
    // Always generate center dots around avatar/spheres (main concentration)
    const numDotsCenter = isTablet ? 60 : 45; // Main dots in center - increased for more density
    const minRadius = avatarSize / 2 + 20; // Start closer to avatar
    const maxRadius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.42; // Extend to near sphere positions

    const centerDots = Array.from({ length: numDotsCenter }, (_, i) => {
      // Random angle and radius for scattered effect
      const angle = Math.random() * 2 * Math.PI;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);

      // Store offset from center (0, 0) - will be added to actual center position in SparkledDot
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;

      // Medium size range for better visibility (2-4px)
      const size = 2 + Math.random() * 2;

      // Random delay for staggered animation
      const delay = Math.random() * 2000;

      // Random animation duration (2.5-4 seconds)
      const duration = 2500 + Math.random() * 1500;

      return {
        offsetX,
        offsetY,
        size,
        delay,
        duration,
        id: `center-${i}`,
        fixed: false,
      };
    });

    if (fullScreen) {
      // Add dots at top and bottom when fullScreen mode is enabled
      const numDotsTop = isTablet ? 8 : 6; // Dots at top - increased for more density
      const numDotsBottom = isTablet ? 8 : 6; // Dots at bottom - increased for more density
      const topAreaHeight = SCREEN_HEIGHT * 0.15; // Top 15% of screen
      const bottomAreaHeight = SCREEN_HEIGHT * 0.15; // Bottom 15% of screen

      const topDots = Array.from({ length: numDotsTop }, (_, i) => {
        // Random positions in top area - these stay fixed (absolute screen positions)
        const offsetX = Math.random() * SCREEN_WIDTH;
        const offsetY = Math.random() * topAreaHeight;

        // Medium size range for better visibility (2-4px)
        const size = 2 + Math.random() * 2;

        // Random delay for staggered animation
        const delay = Math.random() * 2000;

        // Random animation duration (2.5-4 seconds)
        const duration = 2500 + Math.random() * 1500;

        return {
          offsetX,
          offsetY,
          size,
          delay,
          duration,
          id: `top-${i}`,
          fixed: true,
        };
      });

      const bottomDots = Array.from({ length: numDotsBottom }, (_, i) => {
        // Random positions in bottom area - these stay fixed (absolute screen positions)
        const offsetX = Math.random() * SCREEN_WIDTH;
        const offsetY =
          SCREEN_HEIGHT - bottomAreaHeight + Math.random() * bottomAreaHeight;

        // Medium size range for better visibility (2-4px)
        const size = 2 + Math.random() * 2;

        // Random delay for staggered animation
        const delay = Math.random() * 2000;

        // Random animation duration (2.5-4 seconds)
        const duration = 2500 + Math.random() * 1500;

        return {
          offsetX,
          offsetY,
          size,
          delay,
          duration,
          id: `bottom-${i}`,
          fixed: true,
        };
      });

      return [...centerDots, ...topDots, ...bottomDots];
    } else {
      // Original mode: only center dots
      return centerDots;
    }
  }, [avatarSize, isTablet, fullScreen]);

  if (colorScheme === "light") {
    return null;
  }

  return (
    <>
      {dots.map((dot) => (
        <SparkledDot
          key={dot.id}
          avatarCenterX={avatarCenterX}
          avatarCenterY={avatarCenterY}
          offsetX={dot.offsetX}
          offsetY={dot.offsetY}
          size={dot.size}
          delay={dot.delay}
          duration={dot.duration}
          colorScheme={colorScheme}
          fixed={dot.fixed}
        />
      ))}
    </>
  );
});

// Individual Sparkled Dot Component
const SparkledDot = React.memo(function SparkledDot({
  avatarCenterX,
  avatarCenterY,
  offsetX,
  offsetY,
  size,
  delay,
  duration,
  colorScheme,
  fixed = false,
}: {
  avatarCenterX: number | ReturnType<typeof useSharedValue<number>>;
  avatarCenterY: number | ReturnType<typeof useSharedValue<number>>;
  offsetX: number;
  offsetY: number;
  size: number;
  delay: number;
  duration: number;
  colorScheme: "light" | "dark";
  fixed?: boolean;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  React.useEffect(() => {
    const settleDuration = Math.max(600, Math.min(duration, 1800));

    // Scale up animation
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 }),
    );

    // Fade in once and stay static to avoid continuous GPU work.
    opacity.value = withDelay(
      delay,
      withTiming(0.55, {
        duration: settleDuration,
        easing: Easing.out(Easing.ease),
      }),
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [delay, duration, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    // Calculate position based on avatar center (animated or static) + offset
    let x: number;
    let y: number;

    // Check if we're using animated values (check inside worklet for reactivity)
    const isAnimated =
      typeof avatarCenterX === "object" && "value" in avatarCenterX;

    if (isAnimated && !fixed) {
      // Use animated values for position tracking - dots follow avatar
      const centerXVal = (
        avatarCenterX as ReturnType<typeof useSharedValue<number>>
      ).value;
      const centerYVal = (
        avatarCenterY as ReturnType<typeof useSharedValue<number>>
      ).value;
      x = centerXVal + offsetX;
      y = centerYVal + offsetY;
    } else if (isAnimated && fixed) {
      // Fixed dots stay in absolute position (don't follow avatar)
      // For fixed dots, offsetX/offsetY already contain absolute screen positions
      x = offsetX;
      y = offsetY;
    } else {
      // Static avatar center - use static positioning
      x = (avatarCenterX as number) + offsetX;
      y = (avatarCenterY as number) + offsetY;
    }

    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
      left: x - size / 2,
      top: y - size / 2,
    };
  });

  const glowColor =
    colorScheme === "dark"
      ? "rgba(255, 255, 255, 0.65)"
      : "rgba(255, 215, 0, 0.55)";

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: glowColor,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8, // Increased from 0.6
          shadowRadius: size * 2, // Increased from size * 1.5
          elevation: 6, // Increased from 4
        },
        animatedStyle,
      ]}
    />
  );
});

// Spiraling Icons Component - moment icons that flow out from avatar during wheel spin or on correct exam answer (1s)
const SpiralingStars = React.memo(function SpiralingStars({
  avatarCenterX,
  avatarCenterY,
  isSpinning,
  celebrationSpinning,
  colorScheme,
  momentType = "lessons",
}: {
  avatarCenterX: ReturnType<typeof useSharedValue<number>>;
  avatarCenterY: ReturnType<typeof useSharedValue<number>>;
  isSpinning: ReturnType<typeof useSharedValue<boolean>>;
  celebrationSpinning?: ReturnType<typeof useSharedValue<boolean>>;
  colorScheme: "light" | "dark";
  momentType?: "lessons" | "hardTruths" | "sunnyMoments";
}) {
  const { isTablet } = useLargeDevice();

  // Generate particles
  const particles = React.useMemo(() => {
    const numParticles = isTablet ? 30 : 20; // Number of particles to generate
    return Array.from({ length: numParticles }, (_, i) => ({
      id: `spiral-particle-${i}`,
      // Particles start at different angles around a spiral
      startAngle: (i / numParticles) * Math.PI * 2,
      // Vary the spiral tightness
      spiralOffset: (i / numParticles) * Math.PI * 4,
      // Size based on moment type
      size: isTablet ? 24 : 18,
      // Stagger the animation start
      delay: (i / numParticles) * 800,
    }));
  }, [isTablet]);

  return (
    <>
      {particles.map((particle) => (
        <SpirallingStar
          key={particle.id}
          avatarCenterX={avatarCenterX}
          avatarCenterY={avatarCenterY}
          startAngle={particle.startAngle}
          spiralOffset={particle.spiralOffset}
          size={particle.size}
          delay={particle.delay}
          isSpinning={isSpinning}
          celebrationSpinning={celebrationSpinning}
          colorScheme={colorScheme}
          momentType={momentType}
        />
      ))}
    </>
  );
});

// Individual Spiraling Icon Component
const SpirallingStar = React.memo(function SpirallingStar({
  avatarCenterX,
  avatarCenterY,
  startAngle,
  spiralOffset,
  size,
  delay,
  isSpinning,
  celebrationSpinning,
  colorScheme,
  momentType = "lessons",
}: {
  avatarCenterX: ReturnType<typeof useSharedValue<number>>;
  avatarCenterY: ReturnType<typeof useSharedValue<number>>;
  startAngle: number;
  spiralOffset: number;
  size: number;
  delay: number;
  isSpinning: ReturnType<typeof useSharedValue<boolean>>;
  celebrationSpinning?: ReturnType<typeof useSharedValue<boolean>>;
  colorScheme: "light" | "dark";
  momentType?: "lessons" | "hardTruths" | "sunnyMoments";
}) {
  const { momentColors } = useMomentColors();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  // React to isSpinning changes using useAnimatedReaction
  useAnimatedReaction(
    () => isSpinning.value,
    (spinning, previousSpinning) => {
      "worklet";
      if (spinning && !previousSpinning) {
        // Just started spinning - start the animation
        progress.value = 0;
        opacity.value = 0;

        // Animate outward with delay
        progress.value = withDelay(
          delay,
          withRepeat(
            withTiming(1, {
              duration: 2500,
              easing: Easing.out(Easing.ease),
            }),
            -1, // Infinite repeat
            false, // Don't reverse
          ),
        );

        // Fade in then fade out as star travels
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
        // Just stopped spinning - cancel animations
        cancelAnimation(progress);
        cancelAnimation(opacity);
        progress.value = 0;
        opacity.value = 0;
      }
    },
    [delay],
  );

  // React to celebrationSpinning (correct exam answer) - 1 second one-shot
  useAnimatedReaction(
    () => celebrationSpinning?.value ?? false,
    (celebrating, previousCelebrating) => {
      "worklet";
      if (celebrating && !previousCelebrating && celebrationSpinning) {
        progress.value = 0;
        opacity.value = 0;

        // 1 second one-shot outward animation
        progress.value = withDelay(
          delay,
          withTiming(1, {
            duration: 800,
            easing: Easing.out(Easing.ease),
          }),
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
    "worklet";

    // Get current avatar center
    const centerX = avatarCenterX.value;
    const centerY = avatarCenterY.value;

    // Calculate spiral position
    // Radius grows as progress increases (outward motion)
    const maxRadius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.5;
    const radius = progress.value * maxRadius;

    // Angle combines start angle with spiral offset based on progress
    const angle = startAngle + spiralOffset * progress.value;

    // Calculate position
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    // Add slight rotation to the star itself
    const rotation = progress.value * 360;

    return {
      opacity: opacity.value,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { rotate: `${rotation}deg` },
        { scale: 1 - progress.value * 0.3 }, // Shrink slightly as it moves out
      ],
    };
  });

  const getIconConfig = () => {
    switch (momentType) {
      case "lessons":
        return { icon: "💡", color: momentColors.lesson.background };
      case "sunnyMoments":
        return { icon: "☀️", color: momentColors.sunny.background };
      case "hardTruths":
        return { icon: "☁️", color: momentColors.cloudy.background };
      default:
        return { icon: "💡", color: momentColors.lesson.background };
    }
  };

  const { icon, color } = getIconConfig();

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          left: 0,
          top: 0,
          justifyContent: "center",
          alignItems: "center",
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: size,
          elevation: 8,
        }}
      >
        <ThemedText
          style={{
            fontSize: size,
            lineHeight: size,
          }}
        >
          {icon}
        </ThemedText>
      </View>
    </Animated.View>
  );
});

// Sphere Avatar Component (simplified - no memories floating)
// Floating Entity Component (for partners/jobs around spheres)
const FloatingEntity = React.memo(function FloatingEntity({
  entity,
  position,
  colorScheme,
  colors,
  delay = 0,
  entityType,
  memories,
  selectedSphere,
  zoomProgress,
  isWrapped = false,
}: {
  entity: any;
  position: { x: number; y: number };
  colorScheme: "light" | "dark";
  colors: any;
  delay?: number;
  entityType: "partner" | "job" | "family" | "friend" | "hobby";
  memories: any[];
  selectedSphere: LifeSphere | null;
  zoomProgress: ReturnType<typeof useSharedValue<number>>;
  isWrapped?: boolean; // If true, don't use absolute positioning (parent handles it)
}) {
  const floatOffset = useSharedValue(0);

  // Animated position values - initialize with current position to prevent flash
  const animatedX = useSharedValue(position.x);
  const animatedY = useSharedValue(position.y);

  // Update animated position when position prop changes
  React.useEffect(() => {
    animatedX.value = withSpring(position.x, {
      damping: 15,
      stiffness: 150,
      mass: 1,
    });
    animatedY.value = withSpring(position.y, {
      damping: 15,
      stiffness: 150,
      mass: 1,
    });
  }, [position.x, position.y, animatedX, animatedY]);

  // Calculate sunny vs cloudy percentage for this entity
  const sunnyPercentage = React.useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;

    memories.forEach((memory) => {
      totalClouds += (memory.hardTruths || []).length;
      totalSuns +=
        (memory.goodFacts || []).length + (memory.lessonsLearned || []).length; // Lessons count as positive moments
    });

    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Default to neutral if no moments

    return (totalSuns / total) * 100;
  }, [memories]);

  // Determine if more cloudy (dark) or sunny (light)
  const isMoreSunny = sunnyPercentage >= 50;

  React.useEffect(() => {
    const startAnimation = () => {
      floatOffset.value = withRepeat(
        withTiming(1, {
          duration: (1500 + delay) * 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    };

    let timer: NodeJS.Timeout | null = null;

    if (delay > 0) {
      timer = setTimeout(startAnimation, delay) as unknown as NodeJS.Timeout;
    } else {
      startAnimation();
    }

    return () => {
      if (timer) clearTimeout(timer);
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatOffset);
    };
  }, [floatOffset, delay]);

  // Track if this floating entity should be hidden during zoom
  const shouldHideShared = useSharedValue(selectedSphere !== null);

  React.useEffect(() => {
    shouldHideShared.value = selectedSphere !== null;
  }, [selectedSphere, shouldHideShared]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const currentZoom = zoomProgress.value;
    const shouldHide = shouldHideShared.value;

    // Fade out and scale down completely when sphere is selected
    // Match the sphere animation timing for synchronized disappearance
    const opacity = shouldHide ? 1 - currentZoom : 1; // Fade from 1 to 0
    const scale = shouldHide ? 1 - currentZoom * 1.0 : 1; // Scale from 1 to 0 (completely shrink)

    // Only show floating animation when not zooming and sphere is not selected
    const floatY = !shouldHide && currentZoom === 0 ? floatOffset.value * 8 : 0; // 8px floating range

    return {
      transform: [
        { translateX: animatedX.value - position.x },
        { translateY: animatedY.value - position.y + floatY },
        { scale },
      ],
      opacity,
    };
  });

  const { isTablet } = useLargeDevice();
  const size = isTablet ? 36 : 24; // 50% larger on tablets

  // Color based on cloudy vs sunny: dark for more clouds, light for more suns
  const backgroundColor = React.useMemo(() => {
    if (isMoreSunny) {
      // More sunny - lighter colors
      if (entityType === "partner") {
        return colorScheme === "dark"
          ? "rgba(255, 150, 150, 0.6)"
          : "rgba(255, 200, 200, 0.7)";
      } else if (entityType === "job") {
        return colorScheme === "dark"
          ? "rgba(150, 200, 255, 0.6)"
          : "rgba(200, 230, 255, 0.7)";
      } else if (entityType === "family") {
        return colorScheme === "dark"
          ? "rgba(200, 150, 255, 0.6)"
          : "rgba(230, 200, 255, 0.7)";
      } else if (entityType === "friend") {
        return colorScheme === "dark"
          ? "rgba(139, 92, 246, 0.6)"
          : "rgba(167, 139, 250, 0.7)";
      } else {
        // hobby
        return colorScheme === "dark"
          ? "rgba(249, 115, 22, 0.6)"
          : "rgba(255, 157, 88, 0.7)";
      }
    } else {
      // More cloudy - darker colors
      if (entityType === "partner") {
        return colorScheme === "dark"
          ? "rgba(180, 60, 60, 0.7)"
          : "rgba(200, 100, 100, 0.6)";
      } else if (entityType === "job") {
        return colorScheme === "dark"
          ? "rgba(60, 100, 180, 0.7)"
          : "rgba(100, 130, 200, 0.6)";
      } else if (entityType === "family") {
        return colorScheme === "dark"
          ? "rgba(120, 60, 180, 0.7)"
          : "rgba(150, 100, 200, 0.6)";
      } else if (entityType === "friend") {
        return colorScheme === "dark"
          ? "rgba(88, 28, 135, 0.7)"
          : "rgba(124, 58, 237, 0.6)";
      } else {
        // hobby
        return colorScheme === "dark"
          ? "rgba(154, 52, 18, 0.7)"
          : "rgba(234, 88, 12, 0.6)";
      }
    }
  }, [isMoreSunny, entityType, colorScheme]);

  const borderColor = React.useMemo(() => {
    if (isMoreSunny) {
      // More sunny - lighter border
      return colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.6)"
        : "rgba(100, 150, 255, 0.8)";
    } else {
      // More cloudy - darker border
      return colorScheme === "dark"
        ? "rgba(100, 100, 100, 0.8)"
        : "rgba(50, 50, 50, 0.7)";
    }
  }, [isMoreSunny, colorScheme]);

  // Get glow color based on entity type
  const glowColor = React.useMemo(() => {
    if (entityType === "partner") {
      return isMoreSunny ? "#ff6b6b" : "#cc4444";
    } else if (entityType === "job") {
      return isMoreSunny ? "#4dabf7" : "#3b8ac7";
    } else if (entityType === "family") {
      return isMoreSunny ? "#b197fc" : "#8b6bc4";
    } else if (entityType === "friend") {
      return isMoreSunny ? "#8b5cf6" : "#6b3cc4";
    } else {
      // hobby
      return isMoreSunny ? "#ff922b" : "#e67700";
    }
  }, [entityType, isMoreSunny]);

  return (
    <Animated.View
      style={[
        {
          ...(isWrapped
            ? {}
            : {
                position: "absolute",
                left: position.x - size / 2,
                top: position.y - size / 2,
              }),
          width: size,
          height: size,
          borderRadius: size / 2,
          zIndex: 40,
          // Glowing effect
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: isTablet ? 12 : 8,
          elevation: 8, // For Android
        },
        animatedStyle,
      ]}
    >
      {entity.imageUri ? (
        <Image
          source={{ uri: entity.imageUri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: isTablet ? 3 : 2,
            borderColor: borderColor,
          }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: backgroundColor,
            borderWidth: isTablet ? 3 : 2,
            borderColor: borderColor,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialIcons
            name={
              entityType === "partner"
                ? "person"
                : entityType === "family"
                  ? "family-restroom"
                  : entityType === "friend"
                    ? "people"
                    : entityType === "hobby"
                      ? "sports-esports"
                      : "work"
            }
            size={isTablet ? 24 : 16}
            color={
              isMoreSunny
                ? colorScheme === "dark"
                  ? "#ffffff"
                  : "#333333"
                : colorScheme === "dark"
                  ? "#cccccc"
                  : "#333333"
            }
          />
        </View>
      )}
    </Animated.View>
  );
});

// Floating moment icon component - shows small icons (sun, cloud, lightbulb) around entities
const FloatingMomentIcon = React.memo(function FloatingMomentIcon({
  position,
  delay = 0,
  momentType,
  colorScheme,
  index,
  total,
  isWrapped = false,
  selectedMomentType,
}: {
  position: { x: number; y: number };
  delay?: number;
  momentType: "lessons" | "hardTruths" | "sunnyMoments";
  colorScheme: "light" | "dark";
  index: number;
  total: number;
  isWrapped?: boolean;
  selectedMomentType?: "lessons" | "hardTruths" | "sunnyMoments";
}) {
  const { momentColors } = useMomentColors();
  const floatOffset = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const { isTablet } = useLargeDevice();
  const iconSize = isTablet ? 16 : 12;

  const isSelected = selectedMomentType === momentType;

  // Start animation with delay
  React.useEffect(() => {
    const startAnimation = () => {
      // Fade in - reduce opacity for non-selected to indicate disabled state
      opacity.value = withTiming(isSelected ? 1 : 0.2, { duration: 300 });
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });

      // Start floating animation
      floatOffset.value = withRepeat(
        withTiming(1, {
          duration: 2000 + index * 100, // Slightly different durations for variety
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    };

    let timer: NodeJS.Timeout | null = null;

    if (delay > 0) {
      timer = setTimeout(startAnimation, delay) as unknown as NodeJS.Timeout;
    } else {
      startAnimation();
    }

    return () => {
      if (timer) clearTimeout(timer);
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatOffset);
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(pulseScale);
    };
  }, [floatOffset, opacity, scale, pulseScale, delay, index, isSelected]);

  // Add pulsing animation only for selected moment type
  React.useEffect(() => {
    if (isSelected) {
      // Start pulsing animation (scale between 1 and 1.4 for prominent effect)
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withDelay(1000, withTiming(1, { duration: 0 })), // 1 second pause between pulses
        ),
        -1,
        false,
      );
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      // Stop pulsing animation when deselected - reduce opacity to indicate disabled state
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0.2, { duration: 300 });
    }
  }, [isSelected, pulseScale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const floatY = floatOffset.value * 6; // 6px floating range

    return {
      transform: [
        { translateY: floatY },
        { scale: scale.value * pulseScale.value },
      ],
      opacity: opacity.value,
    };
  });

  // Icon properties based on moment type
  const iconProps = React.useMemo(() => {
    switch (momentType) {
      case "sunnyMoments":
        return {
          name: "wb-sunny" as const,
          color: momentColors.sunny.background,
        };
      case "hardTruths":
        return {
          name: "cloud" as const,
          color: momentColors.cloudy.background,
        };
      case "lessons":
      default:
        return {
          name: "lightbulb" as const,
          color: momentColors.lesson.background,
        };
    }
  }, [momentType, momentColors]);

  return (
    <Animated.View
      style={[
        {
          position: isWrapped ? ("relative" as const) : ("absolute" as const),
          ...(!isWrapped && {
            left: position.x - iconSize / 2,
            top: position.y - iconSize / 2,
          }),
          width: iconSize,
          height: iconSize,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 35, // Below entities (40) but above spheres
        },
        animatedStyle,
      ]}
    >
      <MaterialIcons
        name={iconProps.name}
        size={iconSize}
        color={iconProps.color}
      />
    </Animated.View>
  );
});

// Floating Moment From Memory - grows from memory position, dynamically following orbit
// Global map to track which moments have started animating (persists across unmount/remount)
const momentAnimationStateMap = new Map<
  string,
  { hasStarted: boolean; lastSeen: number }
>();

const FloatingMomentFromMemory = function FloatingMomentFromMemory({
  memoryIndex,
  momentIndex,
  totalMoments,
  momentType,
  colorScheme,
  text = "",
  isTablet,
  isLargeDevice,
  orbitAngle,
  starCenterX,
  starCenterY,
  focusedX,
  focusedY,
  panX,
  panY,
  memoriesCount,
  memoryOffsetX,
  memoryOffsetY,
  memoryBaseAngle,
  showEntityWheelShared,
  spawnSlot = 0,
  batchSize = 1,
  cycleId = 0,
  angleJitter = 0,
  bottomInset = 0,
  momentId,
  isExpanded = false,
  momentsFrozen = false,
  spawnTime,
  expandedAtTimestamp,
  onExpand,
  onCollapse,
  onMemoryImagePress,
  onComplete,
  entityId,
  memoryId,
  sphere,
  memoryImageUri,
  suppressExpandAnimation = false,
}: {
  memoryIndex: number;
  momentIndex: number;
  totalMoments: number;
  momentType: "lesson" | "sunny" | "cloudy";
  colorScheme: "light" | "dark";
  text?: string;
  isTablet: boolean;
  isLargeDevice?: boolean;
  orbitAngle: SharedValue<number>;
  starCenterX: SharedValue<number>;
  starCenterY: SharedValue<number>;
  focusedX: SharedValue<number>;
  focusedY: SharedValue<number>;
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  memoriesCount: number;
  memoryOffsetX: number;
  memoryOffsetY: number;
  memoryBaseAngle: number;
  showEntityWheelShared?: ReturnType<typeof useSharedValue<boolean>>;
  spawnSlot?: number;
  batchSize?: number;
  cycleId?: number;
  angleJitter?: number;
  bottomInset?: number;
  momentId?: number;
  isExpanded?: boolean;
  momentsFrozen?: boolean;
  spawnTime?: number;
  expandedAtTimestamp?: number | null;
  onExpand?: (id: number) => void;
  onCollapse?: () => void;
  onMemoryImagePress?: () => void;
  onComplete?: () => void;
  entityId?: string;
  memoryId?: string;
  sphere?: LifeSphere;
  memoryImageUri?: string;
  /** When true, show card overlay instead of scaling this element on tap */
  suppressExpandAnimation?: boolean;
}) {
  const positionIndex = batchSize > 0 ? spawnSlot % batchSize : 0;
  const totalConcurrent = Math.max(1, batchSize);
  const angleOffset = (cycleId * 0.618) % (2 * Math.PI);
  const fontScale = useFontScale();
  const { momentColors } = useMomentColors();

  // Expand/collapse on tap (matches main wheel PulsingFloatingMomentIcon)
  const expandProgress = useSharedValue(0);
  const hasExpandHandlers = useSharedValue(!!(onExpand || onCollapse));
  const prevMomentsFrozenRef = React.useRef(false);
  const onCompleteRef = React.useRef(onComplete);
  const momentsFrozenRef = React.useRef(false);
  onCompleteRef.current = onComplete;
  momentsFrozenRef.current = momentsFrozen;

  // Track the initial scale value to ensure we can always reset correctly
  const initialScaleRef = React.useRef<number | null>(null);

  // Track if animation has been initialized to prevent sudden appearance
  const animationInitializedRef = React.useRef(false);
  // Track the moment's identity to detect when it actually changes
  const momentIdentityRef = React.useRef<string>("");
  // Track if animation has started for this specific moment instance
  const hasStartedAnimationRef = React.useRef(false);

  // Calculate text length for dynamic sizing (matching selectedWheelMoment calculation)
  const textLength = text?.length || 0;

  // Base sizes for floating moments - scaled so "bigger amount of letters = bigger element"
  const baseSunSize = isTablet ? 180 : (isLargeDevice ?? false) ? 160 : 130;
  const baseCloudWidth = isTablet ? 220 : 180;
  const baseCloudHeight = isTablet ? 135 : 110;
  const baseLessonSize = isTablet ? 180 : 140;

  // Sunny moments only: scale with text length to fit full text
  const dynamicSunSize = Math.min(
    isTablet ? 300 : 280,
    Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 2.8)),
  );

  const cloudWidthMultiplier = Math.min(
    2.8,
    Math.max(1.2, 1.0 + textLength / 40),
  );
  const cloudHeightMultiplier = Math.min(
    2.4,
    Math.max(1.15, 1.0 + textLength / 45),
  );
  const dynamicCloudWidth = baseCloudWidth * cloudWidthMultiplier;
  const dynamicCloudHeight = baseCloudHeight * cloudHeightMultiplier;

  const lessonSizeMultiplier = Math.min(
    2.5,
    Math.max(1.0, 1.0 + textLength / 80),
  );
  const dynamicLessonSize = baseLessonSize * lessonSizeMultiplier;

  // Get final size based on type
  const finalWidth =
    momentType === "sunny"
      ? dynamicSunSize
      : momentType === "cloudy"
        ? dynamicCloudWidth
        : dynamicLessonSize;
  const finalHeight =
    momentType === "sunny"
      ? dynamicSunSize
      : momentType === "cloudy"
        ? dynamicCloudHeight
        : dynamicLessonSize;

  // Almost-invisible dot size before grow / after shrink (was 12–14px; now ~2px)
  const smallIconSize = isTablet ? 2.5 : 2;

  // Calculate scale ratios: start almost invisible, grow to full size, shrink back to almost invisible
  const initialScale = smallIconSize / Math.max(finalWidth, finalHeight);
  const finalScale = 1.0; // Full size

  // Store initial scale in ref for stable reference
  if (
    initialScaleRef.current === null ||
    initialScaleRef.current !== initialScale
  ) {
    initialScaleRef.current = initialScale;
  }

  // CRITICAL: Initialize scale to initialScale IMMEDIATELY (not 0)
  // This prevents moments from appearing at full size before animation starts
  // We calculate initialScale first, then initialize the shared value with it
  const scale = useSharedValue(initialScale);
  const growPulseScale = useSharedValue(1);

  // CRITICAL: Initialize scale to initial value synchronously before render
  // This prevents moments from appearing at full size suddenly
  // Only reset when the moment's identity actually changes (not when other props change)
  const currentMomentIdentity = `${memoryIndex}-${momentIndex}-${momentType}`;

  // Check global animation state to see if this moment has already started animating
  const globalAnimationState = momentAnimationStateMap.get(
    currentMomentIdentity,
  );
  const hasAnimatedBefore = globalAnimationState?.hasStarted ?? false;

  // All scale read/write happens in useLayoutEffect (before paint) to avoid Reanimated "during render" warnings
  useLayoutEffect(() => {
    if (momentIdentityRef.current !== currentMomentIdentity) {
      momentIdentityRef.current = currentMomentIdentity;
      if (hasAnimatedBefore) {
        momentAnimationStateMap.delete(currentMomentIdentity);
        hasStartedAnimationRef.current = false;
        animationInitializedRef.current = false;
        scale.value = initialScale;
        growPulseScale.value = 1;
        return;
      }
      hasStartedAnimationRef.current = false;
      cancelAnimation(scale);
      cancelAnimation(growPulseScale);
      scale.value = initialScale;
      growPulseScale.value = 1;
      animationInitializedRef.current = false;
    } else {
      const currentScale = scale.value;
      if (currentScale === 0) {
        scale.value = initialScale;
      } else if (
        currentScale >= 0.9 &&
        !hasStartedAnimationRef.current &&
        currentScale >= finalScale * 0.95
      ) {
        scale.value = initialScale;
        hasStartedAnimationRef.current = false;
      }
    }
  }, [
    scale,
    growPulseScale,
    initialScale,
    finalScale,
    currentMomentIdentity,
    hasAnimatedBefore,
  ]);

  // Animation: grow from small icon size to big size, hold, then shrink back
  React.useEffect(() => {
    const effectMomentIdentity = currentMomentIdentity;
    const globalState = momentAnimationStateMap.get(effectMomentIdentity);
    const hasStartedGlobally = globalState?.hasStarted ?? false;

    if (
      momentIdentityRef.current !== effectMomentIdentity ||
      hasStartedAnimationRef.current ||
      hasStartedGlobally
    ) {
      return;
    }

    hasStartedAnimationRef.current = true;
    momentAnimationStateMap.set(effectMomentIdentity, {
      hasStarted: true,
      lastSeen: Date.now(),
    });

    const GROW_DELAY = 400;
    const GROW_DURATION = 1400;
    const HOLD_DURATION = 3200;
    const SHRINK_DURATION = 1200;

    growPulseScale.value = 1;
    animationInitializedRef.current = true;

    let growTimeout: ReturnType<typeof setTimeout>;
    let pulseTimeout: ReturnType<typeof setTimeout>;
    let shrinkTimeout: ReturnType<typeof setTimeout>;

    growTimeout = setTimeout(() => {
      if (
        animationInitializedRef.current &&
        momentIdentityRef.current === effectMomentIdentity
      ) {
        const currentScale = scale.value;
        if (
          Math.abs(currentScale - initialScale) > 0.01 &&
          currentScale < initialScale * 1.1
        ) {
          scale.value = initialScale;
        }
        scale.value = withTiming(finalScale, {
          duration: GROW_DURATION,
          easing: Easing.out(Easing.ease),
        });
      }
    }, GROW_DELAY);

    pulseTimeout = setTimeout(() => {
      if (
        animationInitializedRef.current &&
        momentIdentityRef.current === effectMomentIdentity
      ) {
        growPulseScale.value = withRepeat(
          withSequence(
            withTiming(1.08, {
              duration: 600,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ),
          Math.floor(HOLD_DURATION / 1200),
          false,
        );
      }
    }, GROW_DELAY + GROW_DURATION);

    shrinkTimeout = setTimeout(
      () => {
        if (
          animationInitializedRef.current &&
          momentIdentityRef.current === effectMomentIdentity &&
          !momentsFrozenRef.current
        ) {
          scale.value = withTiming(initialScale, {
            duration: SHRINK_DURATION,
            easing: Easing.in(Easing.ease),
          });
        }
      },
      GROW_DELAY + GROW_DURATION + HOLD_DURATION,
    );

    return () => {
      if (momentIdentityRef.current !== effectMomentIdentity) {
        animationInitializedRef.current = false;
        hasStartedAnimationRef.current = false;
        cancelAnimation(scale);
        cancelAnimation(growPulseScale);
        if (growTimeout) clearTimeout(growTimeout);
        if (pulseTimeout) clearTimeout(pulseTimeout);
        if (shrinkTimeout) clearTimeout(shrinkTimeout);
      }
    };
  }, [initialScale, finalScale, scale, growPulseScale, currentMomentIdentity]);

  const HOLD_END_MS = 400 + 1400 + 3200; // GROW_DELAY + GROW_DURATION + HOLD_DURATION

  // When momentsFrozen (another moment expanded): hold at full size, cancel shrink
  // When collapsing: resume with remaining hold time, then shrink and call onComplete
  React.useEffect(() => {
    if (momentsFrozen && !isExpanded) {
      cancelAnimation(scale);
      cancelAnimation(growPulseScale);
      scale.value = finalScale;
      growPulseScale.value = 1;
    }

    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;
    if (
      prevMomentsFrozenRef.current &&
      !momentsFrozen &&
      !isExpanded &&
      onCompleteRef.current &&
      spawnTime != null &&
      expandedAtTimestamp != null
    ) {
      const remainingBeforeShrink = Math.max(
        0,
        HOLD_END_MS - (expandedAtTimestamp - spawnTime),
      );
      resumeTimeout = setTimeout(() => {
        scale.value = withTiming(initialScale, {
          duration: 1200,
          easing: Easing.in(Easing.ease),
        });
        const cb = onCompleteRef.current;
        setTimeout(() => {
          cb?.();
        }, 1200);
      }, remainingBeforeShrink);
    }
    prevMomentsFrozenRef.current = momentsFrozen;

    return () => {
      if (resumeTimeout != null) clearTimeout(resumeTimeout);
    };
  }, [
    momentsFrozen,
    isExpanded,
    scale,
    growPulseScale,
    finalScale,
    initialScale,
    spawnTime,
    expandedAtTimestamp,
  ]);

  // Smooth expand animation when user taps
  React.useEffect(() => {
    if (suppressExpandAnimation) {
      expandProgress.value = 0;
      return;
    }
    if (onExpand || onCollapse) {
      expandProgress.value = withSpring(isExpanded ? 1 : 0, {
        damping: 18,
        stiffness: 140,
      });
    }
  }, [
    isExpanded,
    expandProgress,
    onExpand,
    onCollapse,
    suppressExpandAnimation,
  ]);

  React.useEffect(() => {
    hasExpandHandlers.value = !!(onExpand || onCollapse);
  }, [onExpand, onCollapse, hasExpandHandlers]);

  // Text scales ~20% when expanded (vs container 50%) - matches main wheel
  const textScaleStyle = useAnimatedStyle(() => {
    const expandScale = hasExpandHandlers.value
      ? 1 + 0.5 * expandProgress.value
      : 1;
    const textScale =
      1 + 0.2 * (hasExpandHandlers.value ? expandProgress.value : 0);
    return { transform: [{ scale: textScale / expandScale }] };
  });

  // Lesson bulb gets ~3x bigger when expanded - matches main wheel
  const lessonBulbScaleStyle = useAnimatedStyle(() => {
    const s = hasExpandHandlers.value ? 1 + 2 * expandProgress.value : 1;
    return { transform: [{ scale: s }] };
  });

  // Calculate position dynamically based on current orbit angle
  // This MUST be reactive to all changes: focusedX, focusedY, orbitAngle, showEntityWheelShared
  const animatedStyle = useAnimatedStyle(() => {
    "worklet";

    // Check if we're in wheel mode (matching line 4954)
    const isWheelMode = showEntityWheelShared
      ? showEntityWheelShared.value
      : false;

    // Only calculate orbital positions in wheel mode
    // In non-wheel mode, moments should not appear (they only appear when wheel mode is active)
    if (!isWheelMode) {
      // Hide the moment when not in wheel mode
      return {
        position: "absolute",
        left: -10000, // Off-screen
        top: -10000,
        transform: [{ scale: 0 }],
        zIndex: 1005,
      };
    }

    // Position moments in a circular pattern around the avatar so GROWN sizes never overlap
    const avatarX = focusedX.value;
    const avatarY = focusedY.value;

    const avatarSize = isTablet ? 80 : 64;
    const viewportPadding = isTablet ? 24 : 20;

    // Use conservative max size so fully grown clouds (widest) never overlap
    const layoutMomentSize = isTablet ? 340 : 320;
    const minCenterToCenter = layoutMomentSize + (isTablet ? 60 : 50);
    const minRadius =
      avatarSize / 2 + layoutMomentSize / 2 + (isTablet ? 35 : 28);
    let distributionRadius = minRadius;

    if (totalConcurrent > 1) {
      const n = totalConcurrent;
      // Account for angle jitter (±30% of half-arc): worst-case min gap = 0.4 * (2π/n)
      const sinJitter = Math.sin((0.4 * Math.PI) / n);
      const radiusFromChord =
        sinJitter > 1e-6 ? minCenterToCenter / (2 * sinJitter) : minRadius;
      distributionRadius = Math.max(minRadius, radiusFromChord);
    }

    // Cap base radius so the circle fits; account for tab bar so moments stay above it
    const effectiveBottom = SCREEN_HEIGHT - bottomInset;
    const maxRLeft = avatarX - viewportPadding - layoutMomentSize / 2;
    const maxRRight =
      SCREEN_WIDTH - avatarX - viewportPadding - layoutMomentSize / 2;
    const maxRTop = avatarY - viewportPadding - layoutMomentSize / 2;
    const maxRBottom =
      effectiveBottom - avatarY - viewportPadding - layoutMomentSize / 2;
    const maxRFromViewport = Math.max(
      0,
      Math.min(maxRLeft, maxRRight, maxRTop, maxRBottom),
    );
    distributionRadius = Math.min(
      distributionRadius,
      Math.max(minRadius, maxRFromViewport),
    );

    const halfW = finalWidth / 2;
    const halfH = finalHeight / 2;
    const minX = viewportPadding + halfW;
    const maxX = SCREEN_WIDTH - viewportPadding - halfW;
    const minY = viewportPadding + halfH;
    const maxY = effectiveBottom - viewportPadding - halfH;

    let momentX = avatarX;
    let momentY = avatarY;

    if (totalConcurrent > 1) {
      const angleStep = (2 * Math.PI) / totalConcurrent;
      const angle =
        positionIndex * angleStep - Math.PI / 2 + angleOffset + angleJitter;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      let R = distributionRadius;
      let tMax = Infinity;
      if (Math.abs(cosA) > 1e-9) {
        const t1 = (minX - avatarX) / cosA;
        const t2 = (maxX - avatarX) / cosA;
        const txHi = Math.max(t1, t2);
        tMax = Math.min(tMax, txHi);
      }
      if (Math.abs(sinA) > 1e-9) {
        const t1 = (minY - avatarY) / sinA;
        const t2 = (maxY - avatarY) / sinA;
        const tyHi = Math.max(t1, t2);
        tMax = Math.min(tMax, tyHi);
      }
      const RClamp = tMax < Infinity && tMax > 0 ? Math.min(R, tMax) : R;
      R = Math.max(0, RClamp);

      momentX = avatarX + R * cosA;
      momentY = avatarY + R * sinA;
    } else {
      let R = distributionRadius;
      const tMax = avatarY - minY;
      const RClamp = tMax > 0 ? Math.min(R, tMax) : R;
      R = Math.max(0, RClamp);
      momentX = avatarX;
      momentY = avatarY - R;
    }

    // Expand-on-tap scale: 1 -> 1.5 when user taps (matches main wheel)
    const expandScale = hasExpandHandlers.value
      ? 1 + 0.5 * expandProgress.value
      : 1;

    return {
      position: "absolute",
      left: momentX - halfW,
      top: momentY - halfH,
      transform: [{ scale: scale.value * growPulseScale.value * expandScale }],
      zIndex: expandProgress.value > 0.5 ? 1060 : 1005,
    };
  }, [
    focusedX,
    focusedY,
    showEntityWheelShared,
    expandProgress,
    hasExpandHandlers,
    memoryIndex,
    momentIndex,
    momentType,
    isTablet,
    finalWidth,
    finalHeight,
    scale,
    growPulseScale,
    positionIndex,
    totalConcurrent,
    angleOffset,
    angleJitter,
    bottomInset,
  ]);

  const canInteract = !!(onExpand || onCollapse);

  // Render using the EXACT same visualization as selectedWheelMoment (post-spin moments)
  // This matches the wheel of life moment display exactly
  if (momentType === "sunny") {
    const sunnyBg = momentColors.sunny.background;
    const sunnyText = momentColors.sunny.text;
    return (
      <Animated.View
        style={animatedStyle}
        pointerEvents={canInteract ? "auto" : "none"}
      >
        <Pressable
          onPress={() => {
            if (!canInteract) return;
            if (isExpanded && momentId != null) {
              onCollapse?.();
            } else if (momentId != null) {
              onExpand?.(momentId);
            }
          }}
          style={{ width: finalWidth, height: finalHeight }}
        >
          <View
            style={{
              width: finalWidth,
              height: finalHeight,
              shadowColor: sunnyBg,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: isTablet ? 12 : 9,
              elevation: 10,
            }}
          >
            <Svg
              width={finalWidth}
              height={finalHeight}
              viewBox="0 0 160 160"
              preserveAspectRatio="xMidYMid meet"
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <Defs>
                <RadialGradient
                  id={`floatingSunGradient-${memoryIndex}-${momentIndex}`}
                  cx="80"
                  cy="80"
                  rx="48"
                  ry="48"
                  fx="80"
                  fy="80"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%" stopColor={sunnyBg} stopOpacity="0.9" />
                  <Stop offset="30%" stopColor={sunnyBg} stopOpacity="0.95" />
                  <Stop offset="60%" stopColor={sunnyBg} stopOpacity="1" />
                  <Stop offset="100%" stopColor={sunnyBg} stopOpacity="1" />
                </RadialGradient>
              </Defs>
              {/* Sun rays - triangular rays */}
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
                const rightX =
                  outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
                const rightY =
                  outerY + Math.sin(perpAngle + Math.PI) * halfWidth;

                return (
                  <Path
                    key={`floatingSunRay-${i}`}
                    d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                    fill={sunnyBg}
                  />
                );
              })}
              {/* Central circle */}
              <Circle
                cx="80"
                cy="80"
                r="48"
                fill={`url(#floatingSunGradient-${memoryIndex}-${momentIndex})`}
              />
            </Svg>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: finalWidth,
                  height: finalHeight,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: (finalWidth / 160) * 40,
                  paddingVertical: (finalWidth / 160) * 40,
                },
                textScaleStyle,
              ]}
            >
              <ThemedText
                style={{
                  color: sunnyText,
                  fontSize:
                    Math.max(12, Math.min(15, 14 - textLength / 100)) *
                    fontScale,
                  textAlign: "center",
                  fontWeight: "700",
                  lineHeight:
                    Math.max(16, Math.min(20, 18 - textLength / 100)) *
                    fontScale,
                  maxWidth: (finalWidth / 160) * 110,
                }}
              >
                {text?.split("\n")[0] || text}
              </ThemedText>
              {text?.includes("\n") && (
                <ThemedText
                  style={{
                    color: sunnyText,
                    fontSize:
                      Math.max(11, Math.min(13, 12 - textLength / 120)) *
                      fontScale,
                    textAlign: "center",
                    fontWeight: "600",
                    lineHeight:
                      Math.max(14, Math.min(16, 15 - textLength / 120)) *
                      fontScale,
                    maxWidth: (finalWidth / 160) * 110,
                  }}
                >
                  {text.split("\n")[1]}
                </ThemedText>
              )}
              {isExpanded && onMemoryImagePress && (
                <Pressable
                  onPress={onMemoryImagePress}
                  style={({ pressed }) => [
                    {
                      marginTop: 12,
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: sunnyBg,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(0,0,0,0.2)",
                    },
                    { transform: [{ scale: pressed ? 0.9 : 1 }] },
                  ]}
                >
                  {memoryImageUri ? (
                    <Image
                      source={{ uri: memoryImageUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : (
                    <MaterialIcons name="photo" size={28} color={sunnyBg} />
                  )}
                </Pressable>
              )}
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  if (momentType === "cloudy") {
    const cloudyBg = momentColors.cloudy.background;
    const cloudyText = momentColors.cloudy.text;
    return (
      <Animated.View
        style={animatedStyle}
        pointerEvents={canInteract ? "auto" : "none"}
      >
        <Pressable
          onPress={() => {
            if (!canInteract) return;
            if (isExpanded && momentId != null) {
              onCollapse?.();
            } else if (momentId != null) {
              onExpand?.(momentId);
            }
          }}
          style={{ width: finalWidth, height: finalHeight }}
        >
          <View
            style={{
              width: finalWidth,
              height: finalHeight,
              shadowColor: cloudyBg,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Svg
              width={finalWidth}
              height={finalHeight}
              viewBox="0 0 320 100"
              preserveAspectRatio="xMidYMid meet"
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <Defs>
                <SvgLinearGradient
                  id={`floatingCloudGradient-${memoryIndex}-${momentIndex}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor={cloudyBg} stopOpacity="0.95" />
                  <Stop offset="50%" stopColor={cloudyBg} stopOpacity="0.98" />
                  <Stop offset="100%" stopColor={cloudyBg} stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M50,50
                 Q40,35 50,25
                 Q60,15 75,20
                 Q85,10 100,20
                 Q115,10 130,20
                 Q145,10 160,20
                 Q175,10 190,20
                 Q205,10 220,20
                 Q235,10 250,20
                 Q265,15 270,25
                 Q280,35 270,50
                 Q280,65 270,75
                 Q260,85 245,80
                 Q230,90 220,85
                 Q205,95 190,85
                 Q175,95 160,85
                 Q145,95 130,85
                 Q115,95 100,85
                 Q85,90 75,80
                 Q60,85 50,75
                 Q40,65 50,50 Z"
                fill={`url(#floatingCloudGradient-${memoryIndex}-${momentIndex})`}
                stroke="rgba(0,0,0,0.7)"
                strokeWidth={1.5}
              />
            </Svg>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: finalWidth,
                  height: finalHeight,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: Math.max(28, finalWidth * 0.18),
                  paddingVertical: Math.max(16, finalHeight * 0.16),
                },
                textScaleStyle,
              ]}
            >
              <ThemedText
                style={{
                  color: cloudyText,
                  fontSize:
                    Math.max(10, Math.min(14, 13 - textLength / 60)) *
                    fontScale,
                  textAlign: "center",
                  fontWeight: "500",
                  lineHeight:
                    Math.max(12, Math.min(16, 14 - textLength / 60)) *
                    fontScale,
                  maxWidth: finalWidth * 0.8,
                }}
                numberOfLines={textLength > 70 ? 5 : 4}
              >
                {text}
              </ThemedText>
              {isExpanded && onMemoryImagePress && (
                <Pressable
                  onPress={onMemoryImagePress}
                  style={({ pressed }) => [
                    {
                      marginTop: 12,
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: cloudyBg,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(0,0,0,0.2)",
                    },
                    { transform: [{ scale: pressed ? 0.9 : 1 }] },
                  ]}
                >
                  {memoryImageUri ? (
                    <Image
                      source={{ uri: memoryImageUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : (
                    <MaterialIcons name="photo" size={28} color={cloudyBg} />
                  )}
                </Pressable>
              )}
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Lesson - lightbulb with text below it, cosmic-tinted (blend of lesson color from settings)
  const lessonBg = momentColors.lesson.background;
  const lessonText = momentColors.lesson.text;
  const lessonCaptionColor =
    colorScheme === "light" ? Colors.light.text : lessonText;
  const bulbColor = blendHex(
    momentColors.lesson.background,
    COSMIC_RING_START,
    0.28,
  );
  return (
    <Animated.View
      style={animatedStyle}
      pointerEvents={canInteract ? "auto" : "none"}
    >
      <Pressable
        onPress={() => {
          if (!canInteract) return;
          if (isExpanded && momentId != null) {
            onCollapse?.();
          } else if (momentId != null) {
            onExpand?.(momentId);
          }
        }}
        style={{
          width: finalWidth,
          height: finalHeight,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: finalWidth,
            height: finalHeight,
            shadowColor: lessonBg,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: isTablet ? 12 : 9,
            elevation: 10,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Animated.View
            style={[
              { justifyContent: "center", alignItems: "center" },
              lessonBulbScaleStyle,
            ]}
          >
            <MaterialIcons
              name="lightbulb"
              size={finalWidth * 0.4}
              color={bulbColor}
            />
          </Animated.View>
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: isExpanded && onMemoryImagePress ? 100 : 0,
                left: 0,
                right: 0,
                paddingHorizontal: 15,
                paddingBottom: 10,
                justifyContent: "center",
                alignItems: "center",
              },
              textScaleStyle,
            ]}
          >
            {text && (
              <ThemedText
                style={{
                  color: lessonCaptionColor,
                  fontSize:
                    Math.max(10, Math.min(14, 12 - textLength / 80)) *
                    fontScale,
                  textAlign: "center",
                  fontWeight: "600",
                  lineHeight:
                    Math.max(12, Math.min(16, 14 - textLength / 80)) *
                    fontScale,
                }}
                numberOfLines={textLength > 60 ? 4 : 3}
              >
                {text}
              </ThemedText>
            )}
          </Animated.View>
          {isExpanded && onMemoryImagePress && (
            <Pressable
              onPress={onMemoryImagePress}
              style={({ pressed }) => [
                {
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  marginLeft: -32,
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: lessonBg,
                  backgroundColor: "rgba(0,0,0,0.2)",
                  justifyContent: "center",
                  alignItems: "center",
                },
                { transform: [{ scale: pressed ? 0.9 : 1 }] },
              ]}
            >
              {memoryImageUri ? (
                <Image
                  source={{ uri: memoryImageUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <MaterialIcons name="photo" size={28} color={lessonBg} />
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

// Pulsing Floating Moment Icon - appears randomly around center avatar during moment type selection
const PulsingFloatingMomentIcon = function PulsingFloatingMomentIcon({
  centerX,
  centerY,
  angle,
  radius,
  momentType,
  colorScheme,
  delay = 0,
  onComplete,
  selectedMomentType,
  shouldGrowToFull = false,
  text = "",
  momentId,
  isExpanded = false,
  onExpand,
  onCollapse,
  onMemoryImagePress,
  entityId,
  memoryId,
  sphere,
  memoryImageUri,
  momentsFrozen = false,
  spawnTime,
  expandedAtTimestamp,
  suppressExpandAnimation = false,
  showTapHint = false,
  onTapHintDismiss,
}: {
  centerX: number;
  centerY: number;
  angle: number;
  radius: number;
  momentType: "lessons" | "hardTruths" | "sunnyMoments";
  colorScheme: "light" | "dark";
  delay?: number;
  onComplete?: () => void;
  selectedMomentType?: "lessons" | "hardTruths" | "sunnyMoments";
  shouldGrowToFull?: boolean;
  text?: string;
  momentId?: number;
  isExpanded?: boolean;
  onExpand?: (id: number) => void;
  onCollapse?: (momentIdToRemove: number) => void;
  onMemoryImagePress?: () => void;
  entityId?: string;
  memoryId?: string;
  sphere?: LifeSphere;
  memoryImageUri?: string;
  momentsFrozen?: boolean;
  spawnTime?: number;
  expandedAtTimestamp?: number | null;
  /** When true, tapping shows a card overlay instead of scaling this element */
  suppressExpandAnimation?: boolean;
  /** Show bouncing tap hint pointer on lessons bulb */
  showTapHint?: boolean;
  onTapHintDismiss?: () => void;
}) {
  // Initialize shared values - these will be fresh for each component instance
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const growPulseScale = useSharedValue(1); // Pulse animation when fully grown
  const floatOffset = useSharedValue(0);
  const expandProgress = useSharedValue(0); // 0 = collapsed, 1 = expanded (smooth tap-to-grow)
  const hasExpandHandlers = useSharedValue(!!(onExpand || onCollapse));
  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapHintOpacity = useSharedValue(0);
  const tapHintBounce = useSharedValue(0);
  const onTapHintDismissRef = useRef(onTapHintDismiss);
  onTapHintDismissRef.current = onTapHintDismiss;

  const { isTablet } = useLargeDevice();
  const fontScale = useFontScale();
  const { momentColors } = useMomentColors();
  const iconSize = isTablet ? 20 : 16; // Slightly larger than regular floating icons

  const isSelected = selectedMomentType === momentType;

  // Calculate position around center
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  // When expanded, keep at full size and cancel shrink
  React.useEffect(() => {
    if (isExpanded && shouldGrowToFull) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
      growPulseScale.value = 1;
    }
  }, [isExpanded, shouldGrowToFull, scale, opacity, growPulseScale]);

  const prevMomentsFrozenRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const remainingAtPauseRef = useRef<number>(0);

  // When another moment is expanded (momentsFrozen), hold all at full size - prevent shrink/disappear
  React.useEffect(() => {
    if (momentsFrozen && shouldGrowToFull && !isExpanded) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
      growPulseScale.value = 1;
    }

    // When user collapses (momentsFrozen: true -> false), resume - use expandedAtTimestamp so time while expanded doesn't count
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;
    if (
      prevMomentsFrozenRef.current &&
      !momentsFrozen &&
      shouldGrowToFull &&
      !isExpanded &&
      onCompleteRef.current
    ) {
      const HOLD_END_MS = 4800;
      const remainingBeforeShrink =
        expandedAtTimestamp != null && spawnTime != null
          ? Math.max(0, HOLD_END_MS - (expandedAtTimestamp - spawnTime))
          : remainingAtPauseRef.current;

      resumeTimeout = setTimeout(() => {
        const cb = onCompleteRef.current;
        scale.value = withTiming(0, {
          duration: 800,
          easing: Easing.in(Easing.ease),
        });
        opacity.value = withTiming(0, { duration: 800 }, (finished) => {
          if (finished && cb) runOnJS(cb)();
        });
      }, remainingBeforeShrink);
    }
    prevMomentsFrozenRef.current = momentsFrozen;

    return () => {
      if (resumeTimeout != null) clearTimeout(resumeTimeout);
    };
  }, [
    momentsFrozen,
    shouldGrowToFull,
    isExpanded,
    scale,
    opacity,
    growPulseScale,
    spawnTime,
    expandedAtTimestamp,
  ]);

  // Smooth expand/collapse animation when user taps moment (skip when card overlay is shown)
  React.useEffect(() => {
    if (suppressExpandAnimation) {
      expandProgress.value = 0;
      return;
    }
    if (onExpand || onCollapse) {
      expandProgress.value = withSpring(isExpanded ? 1 : 0, {
        damping: 18,
        stiffness: 140,
      });
    }
  }, [
    isExpanded,
    expandProgress,
    onExpand,
    onCollapse,
    suppressExpandAnimation,
  ]);

  React.useEffect(() => {
    hasExpandHandlers.value = !!(onExpand || onCollapse);
  }, [onExpand, onCollapse, hasExpandHandlers]);

  // Tap hint animation for lessons bulb
  React.useEffect(() => {
    if (!showTapHint || momentType !== "lessons" || !shouldGrowToFull) {
      cancelAnimation(tapHintOpacity);
      cancelAnimation(tapHintBounce);
      tapHintOpacity.value = withTiming(0, { duration: 200 });
      tapHintBounce.value = 0;
      return;
    }
    tapHintBounce.value = 0;
    tapHintOpacity.value = withTiming(0.9, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    tapHintBounce.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 350, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withTiming(-6, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(tapHintOpacity);
      cancelAnimation(tapHintBounce);
    };
  }, [
    showTapHint,
    momentType,
    shouldGrowToFull,
    tapHintOpacity,
    tapHintBounce,
  ]);

  // Animation effect for shouldGrowToFull moments - runs once on mount (skip if already expanded)
  React.useEffect(() => {
    if (!shouldGrowToFull || isExpanded) return;

    scale.value = 0;
    opacity.value = 0;
    growPulseScale.value = 1;

    const HOLD_DURATION = 4000;

    scale.value = withSequence(
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
      withDelay(
        HOLD_DURATION,
        withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) }),
      ),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 800 }),
      withDelay(HOLD_DURATION, withTiming(0, { duration: 800 })),
    );

    setTimeout(() => {
      growPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        Math.floor(HOLD_DURATION / 1200),
        false,
      );
    }, 800);
  }, [shouldGrowToFull, isExpanded]);

  // Animation effect for regular pulsing moments
  React.useEffect(() => {
    if (shouldGrowToFull) return; // Skip for shouldGrowToFull moments

    const startAnimation = () => {
      // Fade in and scale up - initial opacity based on selection state
      opacity.value = withTiming(isSelected ? 1 : 0.4, { duration: 400 });
      scale.value = withSpring(1, { damping: 10, stiffness: 150 });

      // Fade out after duration
      fadeOutTimerRef.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 }, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
        scale.value = withTiming(0.8, { duration: 500 });
        fadeOutTimerRef.current = null;
      }, 9600) as unknown as NodeJS.Timeout;

      // Start floating animation
      floatOffset.value = withRepeat(
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );
    };

    let delayTimer: NodeJS.Timeout | null = null;

    if (delay > 0) {
      delayTimer = setTimeout(
        startAnimation,
        delay,
      ) as unknown as NodeJS.Timeout;
    } else {
      startAnimation();
    }

    // Cleanup for regular moments
    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
      cancelAnimation(pulseScale);
      cancelAnimation(floatOffset);
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [delay, onComplete, shouldGrowToFull, isSelected]);

  // Handle pulsing for selected regular moments (not shouldGrowToFull)
  React.useEffect(() => {
    if (shouldGrowToFull) return; // Skip for shouldGrowToFull moments

    if (isSelected) {
      opacity.value = withTiming(1, { duration: 300 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000 }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(0.4, { duration: 300 });
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isSelected, shouldGrowToFull]);

  const animatedStyle = useAnimatedStyle(() => {
    const floatY = (floatOffset.value - 0.5) * 10; // -5px to +5px floating range

    // When shouldGrowToFull, apply growPulseScale for gentle pulsing while held
    // Otherwise use pulseScale for the pulsing effect
    const finalScale = shouldGrowToFull
      ? scale.value * growPulseScale.value
      : scale.value * pulseScale.value;

    // Smooth expand-on-tap scale: 1 (collapsed) -> 1.5 (expanded) when user taps
    const expandScale = hasExpandHandlers.value
      ? 1 + 0.5 * expandProgress.value
      : 1;

    return {
      transform: [{ translateY: floatY }, { scale: finalScale * expandScale }],
      opacity: opacity.value,
    };
  });

  // Text scales up a bit when moment grows (not as much as the container)
  const textScaleStyle = useAnimatedStyle(() => {
    const expandScale = hasExpandHandlers.value
      ? 1 + 0.5 * expandProgress.value
      : 1;
    // Text grows ~20% when expanded: 1x -> 1.2x (vs container 1x -> 1.5x)
    const textScale =
      1 + 0.2 * (hasExpandHandlers.value ? expandProgress.value : 0);
    return {
      transform: [{ scale: textScale / expandScale }],
    };
  });

  // Lesson bulb gets ~4.5x bigger when expanded (moment 1.5x × bulb scale 3 = 4.5x total)
  const lessonBulbScaleStyle = useAnimatedStyle(() => {
    const scale = hasExpandHandlers.value ? 1 + 2 * expandProgress.value : 1;
    return { transform: [{ scale }] };
  });

  // Icon properties based on moment type (uses custom moment colors)
  const iconProps = React.useMemo(() => {
    switch (momentType) {
      case "sunnyMoments":
        return {
          name: "wb-sunny" as const,
          color: momentColors.sunny.background,
        };
      case "hardTruths":
        return {
          name: "cloud" as const,
          color: momentColors.cloudy.background,
        };
      case "lessons":
      default:
        return {
          name: "lightbulb" as const,
          color: momentColors.lesson.background,
        };
    }
  }, [momentType, momentColors]);

  const tapHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tapHintOpacity.value,
    transform: [{ translateY: tapHintBounce.value }],
  }));

  // If shouldGrowToFull, render the full popup element, otherwise render icon
  if (shouldGrowToFull) {
    // Calculate size based on text length for better fit
    const textLength = text?.length || 0;

    // For sunny moments only: scale with text length - grow to fit full text (lessons keep original)
    const minSunnySize = isTablet ? 150 : 120;
    const maxSunnySize = isTablet ? 300 : 280;
    const calculatedSunnySize =
      momentType === "sunnyMoments"
        ? Math.min(
            maxSunnySize,
            Math.max(minSunnySize, minSunnySize + Math.floor(textLength * 2.8)),
          )
        : 0;

    // For lessons: original formula (revert)
    const minLessonSize = isTablet ? 200 : 140;
    const maxLessonSize = isTablet ? 320 : 220;
    const sunSizeIncrement = isTablet ? 0.6 : 0.4;
    const calculatedLessonSize = Math.min(
      maxLessonSize,
      minLessonSize + textLength * sunSizeIncrement,
    );

    const baseSunSize =
      momentType === "sunnyMoments"
        ? calculatedSunnySize
        : calculatedLessonSize;

    // For clouds: scale width and height based on text length
    const minCloudWidth = isTablet ? 320 : 250;
    const maxCloudWidth = isTablet ? 520 : 400;
    const cloudWidthIncrement = isTablet ? 1.4 : 1.0; // px per character
    const calculatedCloudWidth = Math.min(
      maxCloudWidth,
      minCloudWidth + textLength * cloudWidthIncrement,
    );

    const minCloudHeight = isTablet ? 130 : 100;
    const maxCloudHeight = isTablet ? 210 : 150;
    // Height scales more gradually to fit wrapped text
    const cloudHeightIncrement = isTablet ? 0.5 : 0.4;
    const calculatedCloudHeight = Math.min(
      maxCloudHeight,
      minCloudHeight + textLength * cloudHeightIncrement,
    );

    const baseCloudWidth = calculatedCloudWidth;
    const baseCloudHeight = calculatedCloudHeight;

    const canInteract = shouldGrowToFull && (onExpand || onCollapse);

    return (
      <Animated.View
        style={[
          {
            position: "absolute",
            left:
              momentType === "hardTruths"
                ? x - baseCloudWidth / 2
                : x - baseSunSize / 2,
            top:
              momentType === "hardTruths"
                ? y - baseCloudHeight / 2
                : y - baseSunSize / 2,
            justifyContent: "center",
            alignItems: "center",
            zIndex: isExpanded ? 60 : 55,
          },
          animatedStyle,
        ]}
        pointerEvents={canInteract ? "auto" : "none"}
      >
        {momentType === "sunnyMoments" ? (
          <Pressable
            onPress={() => {
              if (!canInteract) return;
              if (isExpanded && momentId != null) {
                onCollapse?.(momentId);
              } else if (momentId != null) {
                onExpand?.(momentId);
              }
            }}
            style={{ width: baseSunSize, height: baseSunSize }}
            pointerEvents={canInteract ? "auto" : "none"}
          >
            <View
              style={{
                width: baseSunSize,
                height: baseSunSize,
                shadowColor: momentColors.sunny.background,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: isTablet ? 12 : 9,
                elevation: 10,
              }}
            >
              <Svg
                width={baseSunSize}
                height={baseSunSize}
                viewBox="0 0 160 160"
                preserveAspectRatio="xMidYMid meet"
                style={{ position: "absolute", top: 0, left: 0 }}
              >
                <Defs>
                  <RadialGradient
                    id={`pulsingSunGradient-${centerX}-${centerY}-${angle}`}
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
                      stopColor={momentColors.sunny.background}
                      stopOpacity="0.9"
                    />
                    <Stop
                      offset="30%"
                      stopColor={momentColors.sunny.background}
                      stopOpacity="0.95"
                    />
                    <Stop
                      offset="60%"
                      stopColor={momentColors.sunny.background}
                      stopOpacity="1"
                    />
                    <Stop
                      offset="100%"
                      stopColor={momentColors.sunny.background}
                      stopOpacity="1"
                    />
                  </RadialGradient>
                </Defs>
                {/* Sun rays */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const rayAngle = (i * 360) / 12;
                  const radian = (rayAngle * Math.PI) / 180;
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
                  const rightX =
                    outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
                  const rightY =
                    outerY + Math.sin(perpAngle + Math.PI) * halfWidth;

                  return (
                    <Path
                      key={`pulsingRay-${i}`}
                      d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                      fill={momentColors.sunny.background}
                    />
                  );
                })}
                <Circle
                  cx="80"
                  cy="80"
                  r="48"
                  fill={`url(#pulsingSunGradient-${centerX}-${centerY}-${angle})`}
                />
              </Svg>
              {/* Text overlay - grows a bit when moment expands */}
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: baseSunSize,
                    height: baseSunSize,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: (baseSunSize / 160) * 40,
                    paddingVertical: (baseSunSize / 160) * 40,
                  },
                  textScaleStyle,
                ]}
              >
                <ThemedText
                  style={{
                    color: momentColors.sunny.text,
                    fontSize:
                      Math.max(12, Math.min(15, 14 - textLength / 100)) *
                      fontScale,
                    textAlign: "center",
                    fontWeight: "700",
                    lineHeight:
                      Math.max(16, Math.min(20, 18 - textLength / 100)) *
                      fontScale,
                    maxWidth: (baseSunSize / 160) * 110,
                  }}
                >
                  {text?.split("\n")[0] || text}
                </ThemedText>
                {text?.includes("\n") && (
                  <ThemedText
                    style={{
                      color: momentColors.sunny.text,
                      fontSize:
                        Math.max(11, Math.min(13, 12 - textLength / 120)) *
                        fontScale,
                      textAlign: "center",
                      fontWeight: "600",
                      lineHeight:
                        Math.max(14, Math.min(16, 15 - textLength / 120)) *
                        fontScale,
                      maxWidth: (baseSunSize / 160) * 110,
                    }}
                  >
                    {text.split("\n")[1]}
                  </ThemedText>
                )}
                {isExpanded && onMemoryImagePress && (
                  <Pressable
                    onPress={onMemoryImagePress}
                    style={({ pressed }) => [
                      {
                        marginTop: 12,
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: momentColors.sunny.background,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0,0,0,0.2)",
                      },
                      { transform: [{ scale: pressed ? 0.9 : 1 }] },
                    ]}
                  >
                    {memoryImageUri ? (
                      <Image
                        source={{ uri: memoryImageUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <MaterialIcons
                        name="photo"
                        size={28}
                        color={momentColors.sunny.background}
                      />
                    )}
                  </Pressable>
                )}
              </Animated.View>
            </View>
          </Pressable>
        ) : momentType === "hardTruths" ? (
          // Render full cloud element
          <Pressable
            onPress={() => {
              if (!canInteract) return;
              if (isExpanded && momentId != null) {
                onCollapse?.(momentId);
              } else if (momentId != null) {
                onExpand?.(momentId);
              }
            }}
            style={{
              width: baseCloudWidth,
              height: baseCloudHeight,
              shadowColor: momentColors.cloudy.background,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Svg
              width={baseCloudWidth}
              height={baseCloudHeight}
              viewBox="0 0 320 100"
              preserveAspectRatio="xMidYMid meet"
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <Defs>
                <SvgLinearGradient
                  id={`pulsingCloudGradient-${centerX}-${centerY}-${angle}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <Stop
                    offset="0%"
                    stopColor={momentColors.cloudy.background}
                    stopOpacity="0.95"
                  />
                  <Stop
                    offset="50%"
                    stopColor={momentColors.cloudy.background}
                    stopOpacity="0.98"
                  />
                  <Stop
                    offset="100%"
                    stopColor={momentColors.cloudy.background}
                    stopOpacity="1"
                  />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M50,50
                   Q40,35 50,25
                   Q60,15 75,20
                   Q85,10 100,20
                   Q115,10 130,20
                   Q145,10 160,20
                   Q175,10 190,20
                   Q205,10 220,20
                   Q235,10 250,20
                   Q265,15 270,25
                   Q280,35 270,50
                   Q280,65 270,75
                   Q260,85 245,80
                   Q230,90 220,85
                   Q205,95 190,85
                   Q175,95 160,85
                   Q145,95 130,85
                   Q115,95 100,85
                   Q85,90 75,80
                   Q60,85 50,75
                   Q40,65 50,50 Z"
                fill={`url(#pulsingCloudGradient-${centerX}-${centerY}-${angle})`}
                stroke="rgba(0,0,0,0.7)"
                strokeWidth={1.5}
              />
            </Svg>
            {/* Text overlay - grows a bit when moment expands */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: baseCloudWidth,
                  height: baseCloudHeight,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 28,
                  paddingVertical: 12,
                },
                textScaleStyle,
              ]}
            >
              <ThemedText
                style={{
                  color: momentColors.cloudy.text,
                  fontSize:
                    Math.max(10, Math.min(14, 13 - textLength / 55)) *
                    fontScale,
                  textAlign: "center",
                  fontWeight: "500",
                  lineHeight:
                    Math.max(12, Math.min(16, 14 - textLength / 55)) *
                    fontScale,
                  maxWidth: baseCloudWidth * 0.82,
                }}
                numberOfLines={textLength > 70 ? 5 : 4}
              >
                {text}
              </ThemedText>
              {isExpanded && onMemoryImagePress && (
                <Pressable
                  onPress={onMemoryImagePress}
                  style={({ pressed }) => [
                    {
                      marginTop: 12,
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: momentColors.cloudy.background,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(0,0,0,0.2)",
                    },
                    { transform: [{ scale: pressed ? 0.9 : 1 }] },
                  ]}
                >
                  {memoryImageUri ? (
                    <Image
                      source={{ uri: memoryImageUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : (
                    <MaterialIcons
                      name="photo"
                      size={28}
                      color={momentColors.cloudy.background}
                    />
                  )}
                </Pressable>
              )}
            </Animated.View>
          </Pressable>
        ) : (
          // Render full lightbulb element (lessons) - lightbulb with text below, no circle background
          <Pressable
            onPress={() => {
              if (!canInteract) return;
              onTapHintDismissRef.current?.();
              if (isExpanded && momentId != null) {
                onCollapse?.(momentId);
              } else if (momentId != null) {
                onExpand?.(momentId);
              }
            }}
            style={{
              width: baseSunSize,
              height: baseSunSize,
              shadowColor: momentColors.lesson.background,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: isTablet ? 12 : 9,
              elevation: 10,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Lightbulb - cosmic tint, no circle */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: "center",
                  alignItems: "center",
                },
                lessonBulbScaleStyle,
              ]}
            >
              <MaterialIcons
                name="lightbulb"
                size={baseSunSize * 0.4}
                color={blendHex(
                  momentColors.lesson.background,
                  COSMIC_RING_START,
                  0.28,
                )}
              />
            </Animated.View>
            {/* Tap hint pointer - bouncing finger shown from 2nd lesson appearance */}
            {showTapHint && !isExpanded && (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    bottom: -38,
                    alignSelf: "center",
                    width: isTablet ? 72 : 64,
                    height: isTablet ? 72 : 64,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                  },
                  tapHintAnimatedStyle,
                ]}
              >
                <MaterialIcons
                  name="touch-app"
                  size={isTablet ? 68 : 60}
                  color="rgba(0,0,0,0.4)"
                  style={{ position: "absolute", left: 2, top: 2 }}
                />
                <MaterialIcons
                  name="touch-app"
                  size={isTablet ? 68 : 60}
                  color="#FFFFFF"
                />
              </Animated.View>
            )}
            {/* Text overlay - sits below bulb; when expanded, pushed up to make room for image */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  bottom: isExpanded && onMemoryImagePress ? 100 : 0,
                  left: 0,
                  right: 0,
                  paddingHorizontal: 15,
                  paddingBottom: 10,
                  justifyContent: "center",
                  alignItems: "center",
                },
                textScaleStyle,
              ]}
            >
              <ThemedText
                style={{
                  color:
                    colorScheme === "light"
                      ? Colors.light.text
                      : momentColors.lesson.text,
                  fontSize:
                    Math.max(10, Math.min(14, 12 - textLength / 80)) *
                    fontScale,
                  textAlign: "center",
                  fontWeight: "600",
                  lineHeight:
                    Math.max(12, Math.min(16, 14 - textLength / 80)) *
                    fontScale,
                }}
                numberOfLines={textLength > 60 ? 4 : 3}
              >
                {text}
              </ThemedText>
            </Animated.View>
            {/* Memory image - positioned at very bottom, below bulb and text */}
            {isExpanded && onMemoryImagePress && (
              <Pressable
                onPress={onMemoryImagePress}
                style={({ pressed }) => [
                  {
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    marginLeft: -32,
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: momentColors.lesson.background,
                    backgroundColor: "rgba(0,0,0,0.2)",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                  { transform: [{ scale: pressed ? 0.9 : 1 }] },
                ]}
              >
                {memoryImageUri ? (
                  <Image
                    source={{ uri: memoryImageUri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialIcons
                    name="photo"
                    size={28}
                    color={momentColors.lesson.background}
                  />
                )}
              </Pressable>
            )}
          </Pressable>
        )}
      </Animated.View>
    );
  }

  // Default: render small icon
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - iconSize / 2,
          top: y - iconSize / 2,
          width: iconSize,
          height: iconSize,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 55,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <MaterialIcons
        name={iconProps.name}
        size={iconSize}
        color={iconProps.color}
      />
    </Animated.View>
  );
};

// Rotatable wrapper for spheres - applies rotation animation
const RotatableSphereWrapper = React.memo(function RotatableSphereWrapper({
  sphereIndex,
  rotation,
  hintRotation,
  centerX,
  centerY,
  radius,
  angleStep,
  startAngle,
  scale,
  children,
}: {
  sphereIndex: number;
  rotation: ReturnType<typeof useSharedValue<number>>;
  hintRotation?: ReturnType<typeof useSharedValue<number>>;
  centerX: number;
  centerY: number;
  radius: number;
  angleStep: number;
  startAngle: number;
  scale?: ReturnType<typeof useSharedValue<number>>;
  children: React.ReactNode;
}) {
  const { isTablet } = useLargeDevice();
  const sphereSize = isTablet ? 120 : 80; // Match SphereAvatar size
  const offset = -sphereSize / 2; // Center the sphere

  // Calculate animated position based on rotation (including hint rotation)
  const animatedStyle = useAnimatedStyle(() => {
    const baseAngle = startAngle + sphereIndex * angleStep;
    const hintRot = hintRotation?.value ?? 0;
    const currentAngle = baseAngle + rotation.value + hintRot;
    const x = centerX + radius * Math.cos(currentAngle);
    const y = centerY + radius * Math.sin(currentAngle);
    const scaleValue = scale?.value ?? 1;

    return {
      position: "absolute" as const,
      left: x,
      top: y,
      transform: [
        { translateX: offset },
        { translateY: offset },
        { scale: scaleValue },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
});

// Wrapper for floating entities that rotate with their parent sphere
const RotatableFloatingEntityWrapper = React.memo(
  function RotatableFloatingEntityWrapper({
    sphereIndex,
    rotation,
    hintRotation,
    centerX,
    centerY,
    sphereRadius,
    angleStep,
    startAngle,
    entityAngle,
    entityRadius,
    scale,
    children,
  }: {
    sphereIndex: number;
    rotation: ReturnType<typeof useSharedValue<number>>;
    hintRotation?: ReturnType<typeof useSharedValue<number>>;
    centerX: number;
    centerY: number;
    sphereRadius: number;
    angleStep: number;
    startAngle: number;
    entityAngle: number; // Base angle of entity relative to sphere (0 to 2π)
    entityRadius: number; // Distance of entity from sphere center
    scale?: ReturnType<typeof useSharedValue<number>>;
    children: React.ReactNode;
  }) {
    const { isTablet } = useLargeDevice();
    const entitySize = isTablet ? 36 : 24; // Match FloatingEntity size
    const offset = -entitySize / 2; // Center the entity

    // Calculate animated position based on rotation (including hint rotation)
    const animatedStyle = useAnimatedStyle(() => {
      // Calculate rotated sphere position
      const baseSphereAngle = startAngle + sphereIndex * angleStep;
      const hintRot = hintRotation?.value ?? 0;
      const currentSphereAngle = baseSphereAngle + rotation.value + hintRot;
      const sphereX = centerX + sphereRadius * Math.cos(currentSphereAngle);
      const sphereY = centerY + sphereRadius * Math.sin(currentSphereAngle);

      // Calculate entity position relative to rotated sphere
      // entityAngle is relative to the sphere, so we add it to the sphere's current angle
      const entityWorldAngle = currentSphereAngle + entityAngle;
      const entityX = sphereX + entityRadius * Math.cos(entityWorldAngle);
      const entityY = sphereY + entityRadius * Math.sin(entityWorldAngle);
      const scaleValue = scale?.value ?? 1;

      return {
        position: "absolute" as const,
        left: entityX,
        top: entityY,
        transform: [
          { translateX: offset },
          { translateY: offset },
          { scale: scaleValue },
        ],
      };
    });

    return (
      <Animated.View style={animatedStyle} pointerEvents="box-none">
        {children}
      </Animated.View>
    );
  },
);

// Rotatable wrapper for floating moment icons - applies rotation and positions around entities
const RotatableFloatingMomentIconWrapper = React.memo(
  function RotatableFloatingMomentIconWrapper({
    sphereIndex,
    rotation,
    hintRotation,
    centerX,
    centerY,
    sphereRadius,
    angleStep,
    startAngle,
    entityAngle,
    entityRadius,
    momentIconAngle,
    momentIconRadius,
    scale,
    children,
  }: {
    sphereIndex: number;
    rotation: ReturnType<typeof useSharedValue<number>>;
    hintRotation?: ReturnType<typeof useSharedValue<number>>;
    centerX: number;
    centerY: number;
    sphereRadius: number;
    angleStep: number;
    startAngle: number;
    entityAngle: number; // Base angle of entity relative to sphere (0 to 2π)
    entityRadius: number; // Distance of entity from sphere center
    momentIconAngle: number; // Angle of icon around the entity (0 to 2π)
    momentIconRadius: number; // Distance of icon from entity center
    scale?: ReturnType<typeof useSharedValue<number>>;
    children: React.ReactNode;
  }) {
    const { isTablet } = useLargeDevice();
    const iconSize = isTablet ? 16 : 12;
    const offset = -iconSize / 2; // Center the icon

    // Calculate animated position based on rotation (including hint rotation)
    const animatedStyle = useAnimatedStyle(() => {
      // Calculate rotated sphere position
      const baseSphereAngle = startAngle + sphereIndex * angleStep;
      const hintRot = hintRotation?.value ?? 0;
      const currentSphereAngle = baseSphereAngle + rotation.value + hintRot;
      const sphereX = centerX + sphereRadius * Math.cos(currentSphereAngle);
      const sphereY = centerY + sphereRadius * Math.sin(currentSphereAngle);

      // Calculate entity position relative to rotated sphere
      const entityWorldAngle = currentSphereAngle + entityAngle;
      const entityX = sphereX + entityRadius * Math.cos(entityWorldAngle);
      const entityY = sphereY + entityRadius * Math.sin(entityWorldAngle);

      // Calculate icon position relative to entity
      const iconWorldAngle = entityWorldAngle + momentIconAngle;
      const iconX = entityX + momentIconRadius * Math.cos(iconWorldAngle);
      const iconY = entityY + momentIconRadius * Math.sin(iconWorldAngle);

      const scaleValue = scale?.value ?? 1;

      return {
        position: "absolute" as const,
        left: iconX,
        top: iconY,
        transform: [
          { translateX: offset },
          { translateY: offset },
          { scale: scaleValue },
        ],
      };
    });

    return (
      <Animated.View style={animatedStyle} pointerEvents="none">
        {children}
      </Animated.View>
    );
  },
);

const SphereAvatar = React.memo(function SphereAvatar({
  sphere,
  position,
  colorScheme,
  colors,
  onPress,
  sunnyPercentage,
  selectedSphere,
  zoomProgress,
  disabled = false,
  isWrapped = false,
  sphere3DEffect = false,
  panHandlers,
}: {
  sphere: LifeSphere;
  position: { x: number; y: number };
  colorScheme: "light" | "dark";
  colors: any;
  onPress: () => void;
  sunnyPercentage: number; // 0-100, percentage of sunny moments
  selectedSphere: LifeSphere | null;
  zoomProgress: ReturnType<typeof useSharedValue<number>>;
  disabled?: boolean;
  isWrapped?: boolean; // If true, don't use absolute positioning (parent handles it)
  sphere3DEffect?: boolean;
  panHandlers?: ReturnType<typeof PanResponder.create>["panHandlers"];
}) {
  const { isTablet } = useLargeDevice();
  const sphereSize = isTablet ? 120 : 80; // 50% larger on tablets

  // Pulse animation for button press feedback
  const pulseScale = useSharedValue(1);

  // Loading progress animation (0 to 1)
  const loadingProgress = useSharedValue(0);

  // Track disabled state in shared value for worklet access
  const isDisabled = useSharedValue(disabled);

  // Update disabled state when prop changes
  React.useEffect(() => {
    isDisabled.value = disabled;
  }, [disabled, isDisabled]);

  const handlePress = () => {
    if (disabled) return;

    // Trigger slower, more gradual pulse animation
    pulseScale.value = withSequence(
      withTiming(0.85, { duration: 250, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );

    // Start loading progress animation
    loadingProgress.value = 0;
    loadingProgress.value = withTiming(1, {
      duration: 650, // Match the total zoom animation duration
      easing: Easing.out(Easing.ease),
    });

    // Call the original onPress handler
    onPress();
  };

  const sphereIcons = {
    relationships: "favorite",
    career: "work",
    family: "family-restroom",
    friends: "people",
    hobbies: "sports-esports",
  };

  // Reuse shared sphere gradient and icon colors (same as focused sfera view)
  const sphereGradientColors = React.useMemo(
    () => getSphereGradientColors(sphere, sunnyPercentage, colorScheme),
    [sphere, sunnyPercentage, colorScheme],
  );
  const sphereIconColor = getSphereIconColor(
    sphere,
    colorScheme,
    sunnyPercentage,
  );
  const sphereShadowColor = getSphereShadowColor(sphere, colorScheme);

  // Create subtle floating animation similar to floating memories
  const floatAnimation = useSharedValue(0);

  // Different animation delays and durations for each sphere to create organic movement
  const animationDelays = useMemo(
    () => ({
      relationships: 0,
      career: 500,
      family: 1000,
      friends: 1500,
      hobbies: 2000,
    }),
    [],
  );

  const animationDurations = useMemo(
    () => ({
      relationships: 2000,
      career: 1800,
      family: 1900,
      friends: 1950,
      hobbies: 1850,
    }),
    [],
  );

  // Track if this sphere is selected using shared values (worklet-compatible)
  // Use numeric encoding: 0 = relationships, 1 = career, 2 = family, 3 = friends, 4 = hobbies, -1 = null
  const sphereTypeNum =
    sphere === "relationships"
      ? 0
      : sphere === "career"
        ? 1
        : sphere === "family"
          ? 2
          : sphere === "friends"
            ? 3
            : sphere === "hobbies"
              ? 4
              : -1;
  const selectedSphereNum =
    selectedSphere === "relationships"
      ? 0
      : selectedSphere === "career"
        ? 1
        : selectedSphere === "family"
          ? 2
          : selectedSphere === "friends"
            ? 3
            : selectedSphere === "hobbies"
              ? 4
              : -1;

  const selectedSphereNumShared = useSharedValue(selectedSphereNum);
  const isSelectedFlag = useSharedValue(
    selectedSphereNum === sphereTypeNum ? 1 : 0,
  );
  const isOtherSelectedFlag = useSharedValue(
    selectedSphereNum !== -1 && selectedSphereNum !== sphereTypeNum ? 1 : 0,
  );

  // Update shared values immediately when selectedSphere changes using useLayoutEffect
  React.useLayoutEffect(() => {
    // Convert selectedSphere to numeric value
    const newSelectedNum =
      selectedSphere === "relationships"
        ? 0
        : selectedSphere === "career"
          ? 1
          : selectedSphere === "family"
            ? 2
            : selectedSphere === "friends"
              ? 3
              : selectedSphere === "hobbies"
                ? 4
                : -1;

    // Update all shared values immediately and synchronously
    selectedSphereNumShared.value = newSelectedNum;
    isSelectedFlag.value = newSelectedNum === sphereTypeNum ? 1 : 0;
    isOtherSelectedFlag.value =
      newSelectedNum !== -1 && newSelectedNum !== sphereTypeNum ? 1 : 0;
  }, [
    selectedSphere,
    sphereTypeNum,
    selectedSphereNumShared,
    isSelectedFlag,
    isOtherSelectedFlag,
  ]);

  React.useEffect(() => {
    // Start floating animation after delay (only when not selected)
    if (selectedSphere !== null) return;
    const delay = animationDelays[sphere];
    const duration = animationDurations[sphere];

    const startAnimation = () => {
      // Subtle floating animation (similar to floating memories)
      // Goes from 0 to 1 and back, then multiplied by small value in animatedStyle
      floatAnimation.value = withRepeat(
        withTiming(1, {
          duration: duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    };

    let timer: NodeJS.Timeout | null = null;

    // Start animation with delay
    if (delay > 0) {
      timer = setTimeout(startAnimation, delay) as unknown as NodeJS.Timeout;
    } else {
      startAnimation();
    }

    return () => {
      if (timer) clearTimeout(timer);
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatAnimation);
    };
  }, [
    sphere,
    floatAnimation,
    animationDelays,
    animationDurations,
    selectedSphere,
  ]);

  // Reset loading progress when sphere is deselected
  React.useEffect(() => {
    if (selectedSphere !== sphere) {
      loadingProgress.value = withTiming(0, { duration: 200 });
    }
  }, [selectedSphere, sphere, loadingProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    // Read all shared values to ensure reactivity
    // These must be read at the top level to establish dependencies
    const currentZoom = zoomProgress.value;
    const selectedFlag = isSelectedFlag.value;
    const otherSelectedFlag = isOtherSelectedFlag.value;

    // Convert numeric flags to booleans for easier logic
    const isSelected = selectedFlag === 1;
    const isOtherSelected = otherSelectedFlag === 1;

    // If this sphere is selected, zoom in (scale up)
    // If another sphere is selected, zoom out and fade (scale down, opacity down)
    // If no sphere is selected, return to normal

    let scale = 1;
    let opacity = 1;

    if (isSelected) {
      // Selected sphere: zoom in with more pronounced scale
      // Use easing curve for smooth zoom: scale from 1 to 1.8
      scale = 1 + currentZoom * 0.8; // Scale from 1 to 1.8
      opacity = 1; // Keep fully visible
    } else if (isOtherSelected) {
      // Other sphere: zoom out and fade completely
      // Use easing curve for smooth disappearance: scale from 1 to 0, opacity from 1 to 0
      // Ensure values are properly interpolated based on currentZoom
      const fadeProgress = currentZoom; // 0 to 1
      scale = 1 - fadeProgress; // Scale from 1 to 0
      opacity = 1 - fadeProgress; // Fade from 1 to 0

      // Clamp values to ensure they stay in valid range
      scale = Math.max(0, Math.min(1, scale));
      opacity = Math.max(0, Math.min(1, opacity));
    } else {
      // No sphere selected: return to normal state
      // When zooming back out, interpolate smoothly
      if (currentZoom > 0) {
        // Coming back from a zoomed state - reverse the animation
        scale = Math.max(0, 1 - currentZoom * 1.0);
        opacity = Math.max(0, 1 - currentZoom);
      } else {
        scale = 1;
        opacity = 1;
      }
    }

    // Add floating animation only when fully unfocused and no sphere is selected
    const floatY =
      !isOtherSelected && !isSelected && currentZoom === 0
        ? floatAnimation.value * 3
        : 0;

    // Combine scale with pulse animation
    const finalScale = scale * pulseScale.value;

    return {
      transform: [{ scale: finalScale }, { translateY: floatY }],
      opacity,
    };
  });

  // Animated style for loading progress ring visibility
  const loadingRingStyle = useAnimatedStyle(() => {
    const progress = loadingProgress.value;
    // Don't show loading ring if sphere is disabled
    if (isDisabled.value) {
      return { opacity: 0 };
    }
    return {
      opacity: progress > 0 && progress < 1 ? 1 : 0,
    };
  });

  // Animated props for the progress circle
  const circleRadius = sphereSize / 2 - 2;
  const circumference = 2 * Math.PI * circleRadius;

  const animatedCircleProps = useAnimatedProps(() => {
    const progress = loadingProgress.value;
    const strokeDashoffset = circumference * (1 - progress);

    return {
      strokeDashoffset,
    };
  });

  return (
    <Pressable
      {...panHandlers}
      onPress={handlePress}
      disabled={disabled}
      style={{
        ...(isWrapped
          ? {}
          : {
              position: "absolute",
              left: position.x - sphereSize / 2,
              top: position.y - sphereSize / 2,
            }),
        width: sphereSize,
        height: sphereSize,
        zIndex: 50,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Animated.View
        style={[
          {
            width: sphereSize,
            height: sphereSize,
            borderRadius: sphereSize / 2,
            overflow: "visible", // Changed to visible to show shadows properly
            justifyContent: "center",
            alignItems: "center",
            // Enhanced elevated shadow effect with glow
            shadowColor: colorScheme === "dark" ? sphereShadowColor : "#000",
            shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
            shadowOpacity: colorScheme === "dark" ? 0.4 : 0.2,
            shadowRadius: isTablet ? 12 : 8,
            elevation: 8, // For Android - subtle elevation effect
          },
          animatedStyle,
        ]}
      >
        {disabled ? (
          <Animated.View
            style={{
              width: sphereSize,
              height: sphereSize,
              borderRadius: sphereSize / 2,
              backgroundColor: "rgba(128, 128, 128, 0.3)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name={sphereIcons[sphere] as any}
              size={sphereSize * 0.5}
              color={sphereIconColor}
            />
          </Animated.View>
        ) : sphere3DEffect ? (
          <LinearGradient
            colors={sphereGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: sphereSize,
              height: sphereSize,
              borderRadius: sphereSize / 2,
              overflow: "hidden", // Ensures gradient respects border radius
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name={sphereIcons[sphere] as any}
              size={sphereSize * 0.5}
              color={sphereIconColor}
            />
          </LinearGradient>
        ) : (
          <View
            style={{
              width: sphereSize,
              height: sphereSize,
              borderRadius: sphereSize / 2,
              overflow: "hidden",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: sphereGradientColors[1],
            }}
          >
            <MaterialIcons
              name={sphereIcons[sphere] as any}
              size={sphereSize * 0.5}
              color={sphereIconColor}
            />
          </View>
        )}

        {/* Loading progress ring */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: sphereSize,
              height: sphereSize,
              justifyContent: "center",
              alignItems: "center",
              pointerEvents: "none",
            },
            loadingRingStyle,
          ]}
        >
          <Svg width={sphereSize} height={sphereSize}>
            <AnimatedCircle
              cx={sphereSize / 2}
              cy={sphereSize / 2}
              r={circleRadius}
              stroke={sphereShadowColor}
              strokeWidth={2}
              fill="none"
              strokeDasharray={circumference}
              strokeLinecap="round"
              transform={`rotate(-90 ${sphereSize / 2} ${sphereSize / 2})`}
              opacity={0.9}
              animatedProps={animatedCircleProps}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const lessonExamModalPalette = wheelExamModalPalette(
    colorScheme === "light" ? "light" : "dark",
  );
  const fontScale = useFontScale();
  const { isTablet, isLargeDevice } = useLargeDevice();
  /** Individual sfera view: back button row — title aligns to same band (vertically centered with arrow). */
  const sphereHeaderBackTop = 70;
  const iPadIndividualHeaderScale =
    Platform.OS === "ios" && Platform.isPad ? 1.3 : 1;
  const sphereHeaderBackSize = (isTablet ? 70 : 50) * iPadIndividualHeaderScale;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const isInsightsDrillMemoryFlow =
    (Array.isArray(params.insightsReturnPath)
      ? params.insightsReturnPath[0]
      : params.insightsReturnPath) === "/insights-moment-memories";
  const insightsReturnPath = Array.isArray(params.insightsReturnPath)
    ? params.insightsReturnPath[0]
    : (params.insightsReturnPath as string | undefined);
  const insightsReturnType = Array.isArray(params.insightsReturnType)
    ? params.insightsReturnType[0]
    : (params.insightsReturnType as string | undefined);
  const insightsReturnSphere = Array.isArray(params.insightsReturnSphere)
    ? params.insightsReturnSphere[0]
    : (params.insightsReturnSphere as string | undefined);
  const insightsReturnEntityId = Array.isArray(params.insightsReturnEntityId)
    ? params.insightsReturnEntityId[0]
    : (params.insightsReturnEntityId as string | undefined);

  const handledLessonNudgeKeyRef = useRef<string | null>(null);
  const [notificationLessonTarget, setNotificationLessonTarget] = useState<{
    key: string;
    lessonId?: string;
    memoryId: string;
    entityId: string;
    sphere: LifeSphere;
    text: string;
  } | null>(null);
  const { momentColors } = useMomentColors();
  const {
    orbitDurationMs,
    constellationAmount,
    constellationOpacity,
    appUsabilityHints,
    pulsingAnimations,
    sphere3DEffect,
  } = useVisualSettings();
  const {
    profiles,
    jobs,
    familyMembers,
    friends,
    hobbies,
    idealizedMemories,
    isLoading,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
    updateIdealizedMemory,
    getOverallSunnyPercentage,
    getHasRealMomentDataForSunCelebration,
    reloadAll,
  } = useJourney();
  const { hasAIEntitlement } = useSubscription();
  const t = useTranslate();
  const { isDemoMode } = useDemoMode();
  const { language: appLanguage } = useLanguage();
  const appLang = appLanguage === "bg" ? "bg" : "en";
  const aiConsent = useAIInsightsConsent();

  // Preload wheel exam questions on app open (main wheel pool, once when ready)
  const mainPreloadAttemptedRef = useRef(false);
  useEffect(() => {
    if (
      isLoading ||
      idealizedMemories.length === 0 ||
      mainPreloadAttemptedRef.current ||
      !aiConsent.isEnabled
    )
      return;
    mainPreloadAttemptedRef.current = true;
    void preloadMainWheelQuestions({
      memories: idealizedMemories,
      language: appLang,
      hasAIEntitlement,
    });
  }, [
    isLoading,
    idealizedMemories,
    appLang,
    hasAIEntitlement,
    aiConsent.isEnabled,
  ]);
  // Streak feature state
  const [streakState, setStreakState] = useState<{
    data: StreakData | null;
    currentBadge: StreakBadge | null;
    nextBadge: StreakBadge | null;
  }>({ data: null, currentBadge: null, nextBadge: null });
  const streakData = streakState.data;
  const currentBadge = streakState.currentBadge;
  const nextBadge = streakState.nextBadge;
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [streakRulesModalVisible, setStreakRulesModalVisible] = useState(false);
  const handleStreakBadgePress = useCallback(
    () => setStreakRulesModalVisible(true),
    [],
  );
  const handleStreakBadgeLongPress = useCallback(
    () => setStreakModalVisible(true),
    [],
  );
  const handleStreakRulesModalClose = useCallback(
    () => setStreakRulesModalVisible(false),
    [],
  );
  const handleStreakModalClose = useCallback(
    () => setStreakModalVisible(false),
    [],
  );

  // Guide prompt modal state
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);
  const [guideRecheckTick, setGuideRecheckTick] = useState(0);
  const [guideReadSections, setGuideReadSections] = useState<Set<string>>(
    new Set(),
  );
  const walkthroughCheckedRef = useRef(false);
  /** Last known onboarding flag from storage — used to clear a premature walkthroughCheckedRef when onboarding completes. */
  const prevOnboardingCompletedRef = useRef<boolean | null>(null);
  const walkthroughAfterOnboardingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeGuideRecheckAfterWelcomeDismiss(() => {
      walkthroughCheckedRef.current = false;
      setGuideRecheckTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);
  // Tracks whether the FocusedSferaView initial load gate (splash + data) has finished.
  // The walkthrough modal must not appear until this is true.
  const [focusedIntroComplete, setFocusedIntroComplete] = useState(false);
  /** Wall time when `focusedIntroComplete` became true. Used to show the guide 2s after that moment, not after AsyncStorage. */
  const focusedIntroCompleteAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (focusedIntroComplete) {
      focusedIntroCompleteAtRef.current = Date.now();
    }
  }, [focusedIntroComplete]);
  const {
    isAnimationComplete,
    isVisible: isSplashVisible,
    isStartupPreferenceResolved,
    isSplashAnimationEnabled,
  } = useSplash();

  // Home view mode — declared before guide walkthrough effect (that effect reads homeViewMode).
  const [homeViewMode, setHomeViewMode] = useState<"classic" | "focused">(
    "focused",
  );

  // Load streak data on mount and when screen focuses
  const loadStreakData = useCallback(async () => {
    try {
      // Recalculate streak first (handles badge downgrade if days passed)
      const data = await recalculateStreak();
      const badge = await getCurrentBadge();
      const next = await getNextBadge();
      // Single setState — avoids 3 separate re-renders from sequential awaits
      setStreakState({ data, currentBadge: badge, nextBadge: next });

      // Refresh notifications based on current streak status
      await refreshStreakNotifications();
    } catch (error) {
      logError("HomeScreen:LoadStreakData", error);
    }
  }, []);

  // Load streak data on mount
  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  // Keep streak badge UI in sync when memory saves happen within the same screen
  // (e.g. AI modal), where navigation focus does not change.
  useEffect(() => {
    const unsubscribe = subscribeBadgeRewardsChanged(() => {
      void loadStreakData();
    });

    return unsubscribe;
  }, [loadStreakData]);

  // Track app state to pause/resume intervals when app backgrounds/foregrounds
  const [isAppActive, setIsAppActive] = useState(true);
  const isHomeTabFocused = useIsFocused();
  const isScreenActive = isAppActive && isHomeTabFocused;
  // Set to true when returning from background so useFocusEffect skips the reload —
  // nothing can modify AsyncStorage while the app is backgrounded, so a reload is wasteful.
  const justCameFromBackgroundRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        justCameFromBackgroundRef.current = true;
      }
      setIsAppActive(nextAppState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Track if this is the first app launch (splash screen shown)
  const isFirstLaunchRef = useRef(true);

  // After the focused sun + sferas intro finishes, wait this long before showing the guide (remaining time after storage work still counts toward this).
  const GUIDE_WALKTHROUGH_AFTER_INTRO_MS = 2000;

  // Check once on app open and show walkthrough if guide not fully read
  useEffect(() => {
    let cancelled = false;

    const checkWalkthrough = async () => {
      // Wait for splash to complete and data to load
      if (isLoading || isSplashVisible || !isAnimationComplete) {
        return;
      }

      if (isInsightsDrillMemoryFlow) {
        setWalkthroughVisible(false);
        return;
      }

      // In focused view, wait for the sunny moments intro animation to finish
      // so the guide modal doesn't overlap the celebration animation.
      if (homeViewMode === "focused" && !focusedIntroComplete) {
        return;
      }

      const onboardingCompleted = await getOnboardingCompleted();
      if (cancelled) return;
      // Home mounts under the onboarding overlay; an earlier run could set
      // walkthroughCheckedRef before storage says onboarding is done — clear it on transition.
      if (prevOnboardingCompletedRef.current === false && onboardingCompleted) {
        walkthroughCheckedRef.current = false;
      }
      prevOnboardingCompletedRef.current = onboardingCompleted;

      if (!onboardingCompleted) {
        return;
      }

      // Check if coming from onboarding - show guide prompt and clear flag
      const showAfterOnboarding = await getShowWalkthroughAfterOnboarding();
      if (cancelled) {
        walkthroughCheckedRef.current = false;
        return;
      }

      const showPostOnboardingAIWelcome = await getShowPostOnboardingAIWelcome();
      const postOnboardingAIWelcomeDismissedThisSession =
        getPostOnboardingAIWelcomeDismissedThisSession();
      const shouldForcePostOnboardingAIWelcome =
        onboardingCompleted &&
        idealizedMemories.length < POST_ONBOARDING_AI_SPOTLIGHT_MAX_MEMORIES &&
        !postOnboardingAIWelcomeDismissedThisSession;
      if (cancelled) return;
      if (
        shouldForcePostOnboardingAIWelcome ||
        (showPostOnboardingAIWelcome &&
          !postOnboardingAIWelcomeDismissedThisSession)
      ) {
        // Keep guide hidden while onboarding AI spotlight is active unless user
        // explicitly dismissed it and requested guide prompt for this session.
        setWalkthroughVisible(false);
        walkthroughCheckedRef.current = false;
        return;
      }

      if (walkthroughCheckedRef.current) {
        return;
      }

      walkthroughCheckedRef.current = true;
      isFirstLaunchRef.current = false;

      if (showAfterOnboarding) {
        await setShowWalkthroughAfterOnboarding(false);
        walkthroughAfterOnboardingRef.current = true;
      }
      if (cancelled) {
        walkthroughCheckedRef.current = false;
        return;
      }

      // Check guide prompt conditions
      const dismissedForever = await getGuideDismissedForever();
      if (cancelled) {
        walkthroughCheckedRef.current = false;
        return;
      }
      if (!dismissedForever) {
        const readSections = await getReadSections();
        if (cancelled) {
          walkthroughCheckedRef.current = false;
          return;
        }
        setGuideReadSections(readSections);
        const allRead = SECTIONS.every((s) => readSections.has(s.id));
        if (!allRead) {
          const introEndedAt = focusedIntroCompleteAtRef.current;
          const waitMs =
            homeViewMode === "focused" && introEndedAt != null
              ? Math.max(
                  0,
                  GUIDE_WALKTHROUGH_AFTER_INTRO_MS - (Date.now() - introEndedAt),
                )
              : GUIDE_WALKTHROUGH_AFTER_INTRO_MS;
          await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
          if (cancelled) {
            walkthroughCheckedRef.current = false;
            return;
          }
          if (!isDemoMode) {
            setWalkthroughVisible(true);
          }
        }
      }
    };

    void checkWalkthrough();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    isAnimationComplete,
    isSplashVisible,
    focusedIntroComplete,
    homeViewMode,
    guideRecheckTick,
    idealizedMemories.length,
    isInsightsDrillMemoryFlow,
    profiles.length,
    jobs.length,
    familyMembers.length,
    friends.length,
    hobbies.length,
    isDemoMode,
  ]);

  // Hide guide prompt when entering demo mode
  useEffect(() => {
    if (isDemoMode) {
      setWalkthroughVisible(false);
    }
  }, [isDemoMode]);

  const handleWalkthroughDismiss = useCallback(() => {
    setWalkthroughVisible(false);
    walkthroughAfterOnboardingRef.current = false;
  }, []);

  const handleGuideOpen = useCallback(() => {
    setWalkthroughVisible(false);
    walkthroughAfterOnboardingRef.current = false;
    router.push("/guide");
  }, []);

  const handleGuideDismissForever = useCallback(async () => {
    await setGuideDismissedForever();
    setWalkthroughVisible(false);
    walkthroughAfterOnboardingRef.current = false;
  }, []);

  const guideWalkthroughModal = (
    <WalkthroughModal
      visible={walkthroughVisible}
      onDismiss={handleWalkthroughDismiss}
      onDismissForever={handleGuideDismissForever}
      onOpenGuide={handleGuideOpen}
      sections={SECTIONS.map((s) => ({
        id: s.id,
        icon: s.icon,
        titleKey:
          s.id === "overview"
            ? "guide.section.overview.shortTitle"
            : s.id === "recordingMemories"
              ? "guide.section.recordingMemories.shortTitle"
              : s.id === "tools"
                ? "guide.section.tools.shortTitle"
                : s.id === "notifications"
                  ? "guide.section.notifications.shortTitle"
                  : s.id === "badges"
                    ? "guide.section.badges.shortTitle"
                    : "guide.section.customizations.shortTitle",
        isDone: guideReadSections.has(s.id),
      }))}
    />
  );

  // Avatar pulse animation for Classic overview center avatar
  const avatarPulseScale = useSharedValue(1);

  // Reload all data from AsyncStorage when screen comes into focus
  // This ensures data is always fresh and not stale from React state
  // This is especially important after running the mock data script or after app restart
  const hasReloadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // Skip if already reloaded this focus session
      if (hasReloadedRef.current) {
        return;
      }
      // Skip if focus was caused by returning from background — nothing can write
      // to AsyncStorage while the app is backgrounded, so in-memory state is already
      // up to date. Only reload when focus comes from navigation (e.g. back from detail screen).
      if (justCameFromBackgroundRef.current) {
        justCameFromBackgroundRef.current = false;
        return;
      }

      hasReloadedRef.current = true;

      InteractionManager.runAfterInteractions(() => {
        Promise.all([reloadAll(), loadStreakData()]).catch(() => {
          hasReloadedRef.current = false;
        });
      });

      return () => {
        hasReloadedRef.current = false;
      };
    }, [reloadAll, loadStreakData]),
  );

  // Press feedback for Classic view circle avatar (scale down on press, spring back on release)
  const classicAvatarPressScale = useSharedValue(1);
  const classicAvatarStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: avatarPulseScale.value * classicAvatarPressScale.value },
    ],
  }));

  // Track selected sphere (null = showing all spheres, otherwise showing focused sphere)
  // Initialize from URL params if present
  const sphereParam =
    params.sphere &&
    typeof params.sphere === "string" &&
    ["relationships", "career", "family", "friends", "hobbies"].includes(
      params.sphere,
    )
      ? (params.sphere as LifeSphere)
      : null;
  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(
    sphereParam,
  );
  const previousSelectedSphereRef = useRef<LifeSphere | null>(null);
  const sphereRenderKeyRef = useRef<number>(0);

  // Classic overview visibility gate (main wheel + center avatar are actually visible).
  const shouldRunClassicOverviewAnimations =
    isScreenActive && homeViewMode === "classic" && selectedSphere === null;
  useEffect(() => {
    if (!shouldRunClassicOverviewAnimations) {
      cancelAnimation(avatarPulseScale);
      avatarPulseScale.value = 1;
      return;
    }

    avatarPulseScale.value = 1;
    avatarPulseScale.value = withRepeat(
      withSequence(
        withSpring(1.1, {
          damping: 8,
          stiffness: 100,
        }),
        withSpring(1, {
          damping: 10,
          stiffness: 150,
        }),
        withDelay(3000, withTiming(1, { duration: 0 })),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(avatarPulseScale);
      avatarPulseScale.value = 1;
    };
  }, [avatarPulseScale, shouldRunClassicOverviewAnimations]);

  // Home view mode: "Classic" = Classic view (wheel of life); "focused" = FocusedSferas view (one sphere in focus, swipe to change).
  // When FocusedSferas view is active, only FocusedSferaView is mounted — Classic view components are not in the tree.
  const [focusedSphereIndex, setFocusedSphereIndex] = useState(0);
  const hasAppliedDefaultFocusedSphereRef = useRef(false);
  const cameFromFocusedSferaForEntityRef = useRef(false);
  /** Persists FocusedSferaView sun menu (3 icons) across remounts when opening Insights / modals. */
  const focusedSunMenuExpandedRef = useRef(false);
  const [focusedSunMenuExpanded, setFocusedSunMenuExpanded] = useState(false);
  const focusedSunMenuCollapseRef = useRef<(() => void) | null>(null);
  const handleFocusedSunMenuExpandedChange = useCallback(
    (expanded: boolean) => {
      focusedSunMenuExpandedRef.current = expanded;
      setFocusedSunMenuExpanded(expanded);
      if (expanded) {
        setSferaSizeHintVisible(false);
      }
    },
    [],
  );
  const { showLoader: startTransitionLoader, hideLoader } =
    useHomeTransitionLoader() ?? {
      showLoader: () => {},
      hideLoader: () => {},
    };

  useEffect(() => {
    if (homeViewMode === "classic") {
      focusedSunMenuExpandedRef.current = false;
      setFocusedSunMenuExpanded(false);
    }
  }, [homeViewMode]);

  const handleFocusedSphereChange = useCallback((index: number) => {
    setFocusedSphereIndex(index);
  }, []);

  // Focused state management - must be at top level (moved before useFocusEffect)
  const [focusedProfileId, setFocusedProfileId] = useState<string | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [focusedFamilyMemberId, setFocusedFamilyMemberId] = useState<
    string | null
  >(null);
  const [focusedFriendId, setFocusedFriendId] = useState<string | null>(null);
  const [focusedHobbyId, setFocusedHobbyId] = useState<string | null>(null);
  const [focusedMemory, setFocusedMemory] = useState<{
    profileId?: string;
    jobId?: string;
    familyMemberId?: string;
    friendId?: string;
    hobbyId?: string;
    memoryId: string;
    sphere: LifeSphere;
    momentToShowId?: string;
  } | null>(null);

  // Entities display mode (orbit vs list)
  const [entitiesDisplayMode, setEntitiesDisplayMode] =
    useState<EntitiesDisplayMode>("orbit");
  const [entitiesDisplayModeHydrated, setEntitiesDisplayModeHydrated] =
    useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(
          ENTITIES_DISPLAY_MODE_STORAGE_KEY,
        );
        if (cancelled) return;
        if (raw === "orbit" || raw === "list") {
          setEntitiesDisplayMode(raw);
        }
        setEntitiesDisplayModeHydrated(true);
      } catch {
        if (!cancelled) setEntitiesDisplayModeHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!entitiesDisplayModeHydrated) return;
    void AsyncStorage.setItem(
      ENTITIES_DISPLAY_MODE_STORAGE_KEY,
      entitiesDisplayMode,
    );
  }, [entitiesDisplayMode, entitiesDisplayModeHydrated]);

  // Track if any entity wheel is active (to disable scrolling)
  const [isAnyEntityWheelActive, setIsAnyEntityWheelActive] =
    useState<boolean>(false);

  // Disable scroll when any entity is focused OR wheel is active (avoids ScrollView stealing wheel drag gestures)
  const hasFocusedEntity = !!(
    focusedProfileId ||
    focusedJobId ||
    focusedFamilyMemberId ||
    focusedFriendId ||
    focusedHobbyId
  );
  const scrollEnabledForSphere = hasFocusedEntity && !isAnyEntityWheelActive;

  const hasFocusedView = !!(
    focusedMemory ||
    selectedSphere ||
    focusedProfileId ||
    focusedJobId ||
    focusedFamilyMemberId ||
    focusedFriendId ||
    focusedHobbyId
  );
  const canShowTopLeftMenu =
    !focusedMemory &&
    !selectedSphere &&
    !focusedProfileId &&
    !focusedJobId &&
    !focusedFamilyMemberId &&
    !focusedFriendId &&
    !focusedHobbyId;
  const showFocusedSunMenuBack =
    homeViewMode === "focused" && focusedSunMenuExpanded && canShowTopLeftMenu;
  const editButton = canShowTopLeftMenu ? (
    showFocusedSunMenuBack ? (
      <Pressable
        onPress={() => focusedSunMenuCollapseRef.current?.()}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        hitSlop={12}
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          width: 40 * fontScale,
          height: 40 * fontScale,
          borderRadius: 20 * fontScale,
          backgroundColor: "rgba(26, 47, 74, 0.85)",
          borderWidth: 1,
          borderColor: "rgba(100, 181, 246, 0.4)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999,
          shadowColor: Colors.dark.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}
      >
        <MaterialIcons
          name="arrow-back"
          size={20 * fontScale}
          color={Colors.dark.primary}
        />
      </Pressable>
    ) : (
      <ExpandableMenuButton top={insets.top + 12} />
    )
  ) : null;

  const prevHasFocusedViewRef = useRef(hasFocusedView);

  useLayoutEffect(() => {
    const wasFocused = prevHasFocusedViewRef.current;
    prevHasFocusedViewRef.current = hasFocusedView;
    if (
      wasFocused &&
      !hasFocusedView &&
      cameFromFocusedSferaForEntityRef.current
    ) {
      cameFromFocusedSferaForEntityRef.current = false;
      setHomeViewMode("focused");
    }
  }, [
    hasFocusedView,
    focusedMemory,
    selectedSphere,
    focusedProfileId,
    focusedJobId,
    focusedFamilyMemberId,
    focusedFriendId,
    focusedHobbyId,
  ]);

  // When true: already on focused view with no selection — tab press should no-op (no loader, no state updates)
  const tabPressNoOpRef = useRef(false);

  // Subscribe to Home tab button press (fires even when already on Home — tabPress may not)
  useEffect(() => {
    const handleHomeTabPress = () => {
      // Ignore presses fired while Home is not focused (e.g. navigating back from another tab).
      // This preserves focused-sfera/entity state across tab switches.
      if (!isHomeTabFocused) {
        return;
      }

      const hasFocusedView = !!(
        focusedMemory ||
        selectedSphere ||
        focusedProfileId ||
        focusedJobId ||
        focusedFamilyMemberId ||
        focusedFriendId ||
        focusedHobbyId
      );

      if (hasFocusedView) {
        startTransitionLoader();
        // Yield one frame so the top loader paints before focused state resets.
        requestAnimationFrame(() => {
          setTimeout(() => {
            setFocusedMemory(null);
            setSelectedSphere(null);
            setFocusedProfileId(null);
            setFocusedJobId(null);
            setFocusedFamilyMemberId(null);
            setFocusedFriendId(null);
            setFocusedHobbyId(null);
            setExpandedMomentId(null);
            setIsAnyEntityWheelActive(false);
            setAnimationsComplete(false);
            setShowMomentTypeSelector(false);
            router.replace("/");
            hideLoader();
          }, 0);
        });
      } else {
        if (tabPressNoOpRef.current) return;
        // Skip loader to avoid Modal touch-blocking bug on iOS
        setShowMomentTypeSelector(false);
      }
    };
    return onHomeTabPress(handleHomeTabPress);
  }, [
    isHomeTabFocused,
    startTransitionLoader,
    hideLoader,
    focusedMemory,
    selectedSphere,
    focusedProfileId,
    focusedJobId,
    focusedFamilyMemberId,
    focusedFriendId,
    focusedHobbyId,
  ]);

  // Handle hardware back button when in Focused view - stay in Focused (clear any selection, or let default back happen)
  useEffect(() => {
    if (homeViewMode !== "focused") return;

    const handleBackPress = () => {
      const hadFocusedMemory = !!focusedMemory;
      if (
        hadFocusedMemory &&
        insightsReturnPath === "/insights-moment-memories" &&
        insightsReturnType &&
        insightsReturnSphere &&
        insightsReturnEntityId
      ) {
        router.back();
        return true;
      }
      if (hadFocusedMemory) {
        startTransitionLoader();
      }
      requestAnimationFrame(() => {
        setTimeout(() => {
          setFocusedMemory(null);
          setFocusedProfileId(null);
          setFocusedJobId(null);
          setFocusedFamilyMemberId(null);
          setFocusedFriendId(null);
          setFocusedHobbyId(null);
          setSelectedSphere(null);
          setExpandedMomentId(null);
          setIsAnyEntityWheelActive(false);
          setAnimationsComplete(false);
          setShowMomentTypeSelector(false);
          setHomeViewMode("focused");
          if (hadFocusedMemory) {
            hideLoader();
          }
        }, 0);
      });
      return true; // Prevent default (e.g. exiting app or going back in stack)
    };

    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );
    return () => sub.remove();
  }, [
    homeViewMode,
    focusedSphereIndex,
    focusedMemory,
    insightsReturnPath,
    insightsReturnType,
    insightsReturnSphere,
    insightsReturnEntityId,
    startTransitionLoader,
    hideLoader,
  ]);

  // Zoom progress for sphere animations (0 = normal view, 1 = zoomed in/out)
  const sphereZoomProgress = useSharedValue(0);

  // Update selectedSphere when params change (e.g., when navigating from spheres tab)
  React.useEffect(() => {
    if (sphereParam) {
      setSelectedSphere(sphereParam);
    }
  }, [sphereParam]);

  // Animate zoom when selectedSphere changes
  // Use useLayoutEffect to ensure animation starts after shared values are updated in child components
  React.useLayoutEffect(() => {
    if (selectedSphere !== null) {
      // Reset to 0 first to ensure animation starts from the beginning
      sphereZoomProgress.value = 0;
      // Then animate to 1 - use a tiny delay to ensure all child component useLayoutEffects have run
      requestAnimationFrame(() => {
        sphereZoomProgress.value = withTiming(1, {
          duration: 800,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Smooth ease-in-out
        });
      });
    } else {
      // Zoom out - animate from 1 to 0 with smooth easing
      sphereZoomProgress.value = withTiming(0, {
        duration: 600,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Smooth ease-in-out
      });
    }
    previousSelectedSphereRef.current = selectedSphere;
  }, [selectedSphere, sphereZoomProgress]);

  // Clear focused states when selectedSphere changes to prevent stale state
  // Only clear focus for spheres we're LEAVING — preserve focus for the sphere we're switching TO
  // (e.g. when coming from FocusedSfera, we set both selectedSphere and focused*Id together)
  const previousSphereForCleanup = useRef<LifeSphere | null>(null);
  React.useEffect(() => {
    const sphereChanged = selectedSphere !== previousSphereForCleanup.current;
    if (sphereChanged) {
      setFocusedMemory((prev) => {
        if (!prev) return null;
        // Preserve focused memory when navigation sets both sphere + focusedMemory
        // for the same sphere in the same transition.
        if (prev.sphere === selectedSphere) return prev;
        return null;
      });
      // Clear only the focused entity of spheres we're NOT switching to
      if (selectedSphere !== "relationships") setFocusedProfileId(null);
      if (selectedSphere !== "career") setFocusedJobId(null);
      if (selectedSphere !== "family") setFocusedFamilyMemberId(null);
      if (selectedSphere !== "friends") setFocusedFriendId(null);
      if (selectedSphere !== "hobbies") setFocusedHobbyId(null);
      setAnimationsComplete(false);
      sphereRenderKeyRef.current += 1;
      previousSphereForCleanup.current = selectedSphere;
    }
  }, [selectedSphere]);

  // Overall sunny percentage across all spheres — wrapped in useMemo so the O(n²)
  // filter+some inside getOverallSunnyPercentage only runs when the underlying data
  // actually changes, not on every unrelated re-render (e.g. RevenueCat, StreakModal).
  const overallSunnyPercentage = useMemo(
    () => getOverallSunnyPercentage(),
    [getOverallSunnyPercentage],
  );

  const sunCelebrationEligible = useMemo(
    () => getHasRealMomentDataForSunCelebration(),
    [getHasRealMomentDataForSunCelebration],
  );

  // Check if there are any moments (memories) at all
  const hasAnyMoments = useMemo(() => {
    return idealizedMemories && idealizedMemories.length > 0;
  }, [idealizedMemories]);

  const sferaSizeHintTabBarHeight = useMemo(
    () =>
      Math.round(78 * fontScale) +
      Math.max(12, insets.bottom + 12 - 20 * fontScale),
    [fontScale, insets.bottom],
  );

  const [sferaSizeHintNeverShow, setSferaSizeHintNeverShow] = useState<
    boolean | null
  >(null);
  /** Tracks whether focused-overview "gate" was already true — show hint on false → true only. */
  const prevCanShowFocusedOverviewRef = useRef(false);
  /** From FocusedSferaView: size hint only applies in Memory Balance rings mode. */
  const [focusedHomeMemoryBalance, setFocusedHomeMemoryBalance] = useState<
    boolean | null
  >(null);
  /** False while not in MB; true while in MB — used to detect orbit → MB to re-show hint. */
  const prevMbForHintRef = useRef(false);
  /** Mirrors `focusedHomeMemoryBalance` for timeout callbacks (avoid showing sunny hint after leaving MB). */
  const focusedHomeMemoryBalanceRef = useRef<boolean | null>(null);
  const [sferaSizeHintVisible, setSferaSizeHintVisible] = useState(false);
  const sferaSizeHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [sunnyVsCloudyHintVisible, setSunnyVsCloudyHintVisible] = useState(false);
  const [sunnyHintCollapsed, setSunnyHintCollapsedState] = useState(false);
  const [sunnyCelebrationVisible, setSunnyCelebrationVisible] =
    useState(false);
  const [sunnyMomentsCelebrationToken, setSunnyMomentsCelebrationToken] =
    useState(0);
  const prevCanShowSunnyVsCloudyRef = useRef(false);
  const sunnyVsCloudyHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  focusedHomeMemoryBalanceRef.current = focusedHomeMemoryBalance;

  useFocusEffect(
    useCallback(() => {
      void getSferaSizeHintDismissedForever().then(setSferaSizeHintNeverShow);
      void getSunnyHintCollapsed().then(setSunnyHintCollapsedState);
    }, []),
  );

  useEffect(() => {
    return () => {
      if (sferaSizeHintTimerRef.current) {
        clearTimeout(sferaSizeHintTimerRef.current);
        sferaSizeHintTimerRef.current = null;
      }
      if (sferaSizeHintAutoDismissRef.current) {
        clearTimeout(sferaSizeHintAutoDismissRef.current);
        sferaSizeHintAutoDismissRef.current = null;
      }
    };
  }, []);

  const sferaSizeHintAutoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSferaSizeHintShow = useCallback(() => {
    if (sferaSizeHintTimerRef.current) {
      clearTimeout(sferaSizeHintTimerRef.current);
      sferaSizeHintTimerRef.current = null;
    }
    sferaSizeHintTimerRef.current = setTimeout(() => {
      setSferaSizeHintVisible(true);
      sferaSizeHintTimerRef.current = null;
    }, 1700);
  }, []);

  const lifeSunnyVsCloudySummary = useMemo(() => {
    let sunny = 0;
    let cloudy = 0;
    idealizedMemories.forEach((memory) => {
      sunny += (memory.goodFacts || []).length;
      cloudy += (memory.hardTruths || []).length;
    });
    const total = sunny + cloudy;
    const percentage = total === 0 ? 0 : (sunny / total) * 100;
    return { sunny, cloudy, total, percentage };
  }, [idealizedMemories]);

  const allSunnyMomentEntries = useMemo(() => {
    const moments: Array<{
      id: string;
      text: string;
      sphere: LifeSphere;
    }> = [];
    idealizedMemories.forEach((memory) => {
      (memory.goodFacts || []).forEach((fact: { id?: string; text?: string }, fi: number) => {
        if (typeof fact?.text !== "string" || fact.text.trim().length === 0) {
          return;
        }
        const id =
          typeof fact.id === "string" && fact.id.length > 0
            ? fact.id
            : `gf-${memory.id}-${fi}`;
        moments.push({
          id,
          text: fact.text.trim(),
          sphere: memory.sphere,
        });
      });
    });
    return moments;
  }, [idealizedMemories]);

  const isSunnyVsCloudyHintEligible = useMemo(() => {
    const { sunny, total, percentage } = lifeSunnyVsCloudySummary;
    return (
      total > 0 &&
      (percentage >= SUNNY_VS_CLOUDY_HINT_CONGRATS_MIN_PERCENT ||
        sunny >= SUNNY_VS_CLOUDY_HINT_MIN_SUNNY_COUNT)
    );
  }, [lifeSunnyVsCloudySummary]);

  const sunnyVsCloudyHintVariant = useMemo((): "congrats" | "tapSunFlow" => {
    return lifeSunnyVsCloudySummary.percentage >= SUNNY_VS_CLOUDY_HINT_CONGRATS_MIN_PERCENT
      ? "congrats"
      : "tapSunFlow";
  }, [lifeSunnyVsCloudySummary.percentage]);

  useEffect(() => {
    const onFocusedOverviewSurface =
      isHomeTabFocused && homeViewMode === "focused" && !selectedSphere;

    const leavingFocusedOverviewSurface =
      !isHomeTabFocused ||
      homeViewMode !== "focused" ||
      selectedSphere !== null;

    const readyForSferaSizeHint =
      onFocusedOverviewSurface &&
      focusedHomeMemoryBalance === true &&
      !isLoading &&
      focusedIntroComplete &&
      !focusedSunMenuExpanded;

    if (isInsightsDrillMemoryFlow) {
      if (sferaSizeHintTimerRef.current) {
        clearTimeout(sferaSizeHintTimerRef.current);
        sferaSizeHintTimerRef.current = null;
      }
      setSferaSizeHintVisible(false);
      return;
    }

    if (sferaSizeHintNeverShow !== false) {
      if (leavingFocusedOverviewSurface) {
        prevCanShowFocusedOverviewRef.current = false;
      }
      if (sferaSizeHintTimerRef.current) {
        clearTimeout(sferaSizeHintTimerRef.current);
        sferaSizeHintTimerRef.current = null;
      }
      setSferaSizeHintVisible(false);
      return;
    }

    // Only reset Memory Balance sync when actually leaving this screen — not while intro/loading
    // (otherwise FocusedSferaView hydrates MB before intro completes and we clear it).
    if (leavingFocusedOverviewSurface) {
      prevCanShowFocusedOverviewRef.current = false;
      prevMbForHintRef.current = false;
      setFocusedHomeMemoryBalance(null);
      if (sferaSizeHintTimerRef.current) {
        clearTimeout(sferaSizeHintTimerRef.current);
        sferaSizeHintTimerRef.current = null;
      }
      setSferaSizeHintVisible(false);
      return;
    }

    if (!readyForSferaSizeHint) {
      if (sferaSizeHintTimerRef.current) {
        clearTimeout(sferaSizeHintTimerRef.current);
        sferaSizeHintTimerRef.current = null;
      }
      setSferaSizeHintVisible(false);
      return;
    }

    if (!prevCanShowFocusedOverviewRef.current) {
      prevCanShowFocusedOverviewRef.current = true;
      scheduleSferaSizeHintShow();
    }
  }, [
    sferaSizeHintNeverShow,
    isHomeTabFocused,
    homeViewMode,
    selectedSphere,
    focusedHomeMemoryBalance,
    focusedSunMenuExpanded,
    isLoading,
    focusedIntroComplete,
    scheduleSferaSizeHintShow,
    isInsightsDrillMemoryFlow,
  ]);

  useEffect(() => {
    const onFocusedOverviewSurface =
      isHomeTabFocused && homeViewMode === "focused" && !selectedSphere;
    const leavingFocusedOverviewSurface =
      !isHomeTabFocused ||
      homeViewMode !== "focused" ||
      selectedSphere !== null;
    // Sunny/cloudy banner is mounted only in Memory Balance mode (FocusedSferaView hint band).
    // Do not set visibility while in orbit — toggling MB would flash one frame of stale UI.
    const readyForSunnyVsCloudyHint =
      onFocusedOverviewSurface &&
      focusedHomeMemoryBalance === true &&
      !isLoading &&
      focusedIntroComplete &&
      hasAnyMoments &&
      !focusedSunMenuExpanded &&
      isSunnyVsCloudyHintEligible;

    if (isInsightsDrillMemoryFlow) {
      setSunnyVsCloudyHintVisible(false);
      return;
    }

    if (leavingFocusedOverviewSurface) {
      prevCanShowSunnyVsCloudyRef.current = false;
      setSunnyVsCloudyHintVisible(false);
      return;
    }

    // Keep sunny/cloudy hint behind the size hint priority queue:
    // while size-hint is visible OR waiting on its delayed show timer, sunny must not appear.
    if (
      !readyForSunnyVsCloudyHint ||
      sferaSizeHintVisible ||
      sferaSizeHintTimerRef.current !== null
    ) {
      setSunnyVsCloudyHintVisible(false);
      return;
    }

    if (!prevCanShowSunnyVsCloudyRef.current) {
      prevCanShowSunnyVsCloudyRef.current = true;
      setSunnyVsCloudyHintVisible(true);
    }
  }, [
    focusedHomeMemoryBalance, // orbit ↔ MB toggles size-hint timer (ref is non-reactive); re-run sunny vs sfera priority
    isHomeTabFocused,
    homeViewMode,
    selectedSphere,
    isLoading,
    focusedIntroComplete,
    hasAnyMoments,
    focusedSunMenuExpanded,
    isSunnyVsCloudyHintEligible,
    sferaSizeHintVisible,
    isInsightsDrillMemoryFlow,
  ]);

  useEffect(() => {
    if (focusedHomeMemoryBalance === true) return;
    prevCanShowSunnyVsCloudyRef.current = false;
    setSunnyVsCloudyHintVisible(false);
    if (sunnyVsCloudyHintTimerRef.current) {
      clearTimeout(sunnyVsCloudyHintTimerRef.current);
      sunnyVsCloudyHintTimerRef.current = null;
    }
  }, [focusedHomeMemoryBalance]);

  useEffect(() => {
    return () => {
      if (sunnyVsCloudyHintTimerRef.current) {
        clearTimeout(sunnyVsCloudyHintTimerRef.current);
        sunnyVsCloudyHintTimerRef.current = null;
      }
    };
  }, []);

  const scheduleSunnyVsCloudyHintAfterDelay = useCallback(() => {
    if (!isSunnyVsCloudyHintEligible) {
      return;
    }

    if (sunnyVsCloudyHintTimerRef.current) {
      clearTimeout(sunnyVsCloudyHintTimerRef.current);
      sunnyVsCloudyHintTimerRef.current = null;
    }

    sunnyVsCloudyHintTimerRef.current = setTimeout(() => {
      sunnyVsCloudyHintTimerRef.current = null;
      if (focusedHomeMemoryBalanceRef.current !== true) return;
      setSunnyVsCloudyHintVisible(true);
    }, 1200);
  }, [isSunnyVsCloudyHintEligible]);

  const handleSferaSizeHintClose = useCallback(() => {
    if (sferaSizeHintAutoDismissRef.current) {
      clearTimeout(sferaSizeHintAutoDismissRef.current);
      sferaSizeHintAutoDismissRef.current = null;
    }
    setSferaSizeHintVisible(false);
    scheduleSunnyVsCloudyHintAfterDelay();
  }, [scheduleSunnyVsCloudyHintAfterDelay]);

  const handleSferaSizeHintDontShowAgain = useCallback(() => {
    if (sferaSizeHintAutoDismissRef.current) {
      clearTimeout(sferaSizeHintAutoDismissRef.current);
      sferaSizeHintAutoDismissRef.current = null;
    }
    void setSferaSizeHintDismissedForever(true);
    setSferaSizeHintNeverShow(true);
    setSferaSizeHintVisible(false);
    scheduleSunnyVsCloudyHintAfterDelay();
  }, [scheduleSunnyVsCloudyHintAfterDelay]);

  // Auto-dismiss sfera size hint after 5 seconds, but only when the
  // sunny/cloudy collapsible notification would follow.
  useEffect(() => {
    if (!sferaSizeHintVisible || !isSunnyVsCloudyHintEligible) {
      if (sferaSizeHintAutoDismissRef.current) {
        clearTimeout(sferaSizeHintAutoDismissRef.current);
        sferaSizeHintAutoDismissRef.current = null;
      }
      return;
    }
    sferaSizeHintAutoDismissRef.current = setTimeout(() => {
      sferaSizeHintAutoDismissRef.current = null;
      setSferaSizeHintVisible(false);
      scheduleSunnyVsCloudyHintAfterDelay();
    }, 5000);
    return () => {
      if (sferaSizeHintAutoDismissRef.current) {
        clearTimeout(sferaSizeHintAutoDismissRef.current);
        sferaSizeHintAutoDismissRef.current = null;
      }
    };
  }, [sferaSizeHintVisible, isSunnyVsCloudyHintEligible, scheduleSunnyVsCloudyHintAfterDelay]);

  const handleSunnyVsCloudyHintClose = useCallback(() => {
    setSunnyVsCloudyHintVisible(false);
  }, []);

  const handleSunnyHintCollapsedChange = useCallback((value: boolean) => {
    setSunnyHintCollapsedState(value);
    void setSunnyHintCollapsed(value);
  }, []);


  const openSunnyCelebration = useCallback(() => {
    if (allSunnyMomentEntries.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Haptics unavailable (e.g. web)
    });
    setSunnyMomentsCelebrationToken((prev) => prev + 1);
    setSunnyCelebrationVisible(true);
  }, [allSunnyMomentEntries]);

  const closeSunnyCelebration = useCallback(() => {
    setSunnyCelebrationVisible(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSunnyCelebrationVisible(false);
      };
    }, []),
  );

  useEffect(() => {
    if (!isAppActive) {
      setSunnyCelebrationVisible(false);
    }
  }, [isAppActive]);

  const sunnyVsCloudyHintMessage = useMemo(() => {
    if (sunnyVsCloudyHintVariant === "congrats") {
      return t("home.sunnyVsCloudy.congrats", {
        percentage: Math.round(lifeSunnyVsCloudySummary.percentage),
      });
    }
    return t("home.sunnyVsCloudy.tapSunFlow");
  }, [lifeSunnyVsCloudySummary, sunnyVsCloudyHintVariant, t]);

  const sunnyMomentsCelebrationOverlay = (
    <SunnyMomentsCelebrationOverlay
      visible={sunnyCelebrationVisible}
      triggerToken={sunnyMomentsCelebrationToken}
      moments={allSunnyMomentEntries}
      onComplete={closeSunnyCelebration}
      onDismiss={closeSunnyCelebration}
    />
  );

  const messageTop = 180; // Position for lesson notification (below streak badge)

  const [aiInsightsConsentVisible, setAiInsightsConsentVisible] =
    useState(false);

  // Calculate sunny percentage for relationships sphere (all profiles)
  const relationshipsSunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;

    profiles.forEach((profile) => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
    });

    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Default to neutral if no moments

    return (totalSuns / total) * 100;
  }, [profiles, getIdealizedMemoriesByProfileId]);

  // Calculate sunny percentage for career sphere (all jobs)
  const careerSunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;

    jobs.forEach((job) => {
      const memories = getIdealizedMemoriesByEntityId(job.id, "career");
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
    });

    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Default to neutral if no moments

    return (totalSuns / total) * 100;
  }, [jobs, getIdealizedMemoriesByEntityId]);

  // Calculate sunny percentage for family sphere (all family members)
  const familySunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;

    familyMembers.forEach((member) => {
      const memories = getIdealizedMemoriesByEntityId(member.id, "family");
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
    });

    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Default to neutral if no moments

    return (totalSuns / total) * 100;
  }, [familyMembers, getIdealizedMemoriesByEntityId]);

  // Calculate sunny percentage for friends sphere (all friends)
  const friendsSunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;

    friends.forEach((friend) => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, "friends");
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
    });

    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Default to neutral if no moments

    return (totalSuns / total) * 100;
  }, [friends, getIdealizedMemoriesByEntityId]);

  // Calculate sunny percentage for hobbies sphere (all hobbies)
  const hobbiesSunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;

    hobbies.forEach((hobby) => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, "hobbies");
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
    });

    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Default to neutral if no moments

    return (totalSuns / total) * 100;
  }, [hobbies, getIdealizedMemoriesByEntityId]);

  const getSphereSunnyPercentage = useCallback(
    (sphere: LifeSphere) => {
      switch (sphere) {
        case "relationships":
          return relationshipsSunnyPercentage;
        case "career":
          return careerSunnyPercentage;
        case "family":
          return familySunnyPercentage;
        case "friends":
          return friendsSunnyPercentage;
        case "hobbies":
          return hobbiesSunnyPercentage;
      }
    },
    [
      relationshipsSunnyPercentage,
      careerSunnyPercentage,
      familySunnyPercentage,
      friendsSunnyPercentage,
      hobbiesSunnyPercentage,
    ],
  );

  const entityImageUrisBySphere = useMemo(
    () => ({
      relationships: profiles.map((p) => p.imageUri ?? ""),
      career: jobs.map((j) => j.imageUri ?? ""),
      family: familyMembers.map((m) => m.imageUri ?? ""),
      friends: friends.map((f) => f.imageUri ?? ""),
      hobbies: hobbies.map((h) => h.imageUri ?? ""),
    }),
    [profiles, jobs, familyMembers, friends, hobbies],
  );

  const entityIdsBySphere = useMemo(
    () => ({
      relationships: profiles.map((p) => p.id),
      career: jobs.map((j) => j.id),
      family: familyMembers.map((m) => m.id),
      friends: friends.map((f) => f.id),
      hobbies: hobbies.map((h) => h.id),
    }),
    [profiles, jobs, familyMembers, friends, hobbies],
  );

  const entityNamesBySphere = useMemo(
    () => ({
      relationships: profiles.map((p) => p.name),
      career: jobs.map((j) => j.name),
      family: familyMembers.map((m) => m.name),
      friends: friends.map((f) => f.name),
      hobbies: hobbies.map((h) => h.name),
    }),
    [profiles, jobs, familyMembers, friends, hobbies],
  );

  const memoriesPerEntityBySphere = useMemo(
    () => ({
      relationships: profiles.map((p) =>
        getIdealizedMemoriesByEntityId(p.id, "relationships"),
      ),
      career: jobs.map((j) => getIdealizedMemoriesByEntityId(j.id, "career")),
      family: familyMembers.map((m) =>
        getIdealizedMemoriesByEntityId(m.id, "family"),
      ),
      friends: friends.map((f) =>
        getIdealizedMemoriesByEntityId(f.id, "friends"),
      ),
      hobbies: hobbies.map((h) =>
        getIdealizedMemoriesByEntityId(h.id, "hobbies"),
      ),
    }),
    [
      profiles,
      jobs,
      familyMembers,
      friends,
      hobbies,
      getIdealizedMemoriesByEntityId,
    ],
  );

  const focusedDefaultIndexBySunnyMemories = useMemo(() => {
    let bestIndex = 0;
    let highestSunnyMemoryCount = -1;

    FOCUSED_SPHERES_ORDER.forEach((sphere, index) => {
      const sunnyMemoryCount = (memoriesPerEntityBySphere[sphere] ?? []).reduce(
        (count, entityMemories) =>
          count +
          entityMemories.reduce((entityCount, memory) => {
            const sunnyFacts = (memory.goodFacts ?? []).length;
            const cloudyFacts = (memory.hardTruths ?? []).length;
            return entityCount + (sunnyFacts >= cloudyFacts ? 1 : 0);
          }, 0),
        0,
      );

      if (sunnyMemoryCount > highestSunnyMemoryCount) {
        highestSunnyMemoryCount = sunnyMemoryCount;
        bestIndex = index;
      }
    });

    return bestIndex;
  }, [memoriesPerEntityBySphere]);

  /** Center sun: filled % vs "empty" + — true if user has memories OR at least one entity (onboarding save creates entities before any memory). */
  const centerSunHasLifeContent = useMemo(
    () =>
      idealizedMemories.length > 0 ||
      profiles.length +
        jobs.length +
        familyMembers.length +
        friends.length +
        hobbies.length >
        0,
    [
      idealizedMemories.length,
      profiles.length,
      jobs.length,
      familyMembers.length,
      friends.length,
      hobbies.length,
    ],
  );

  // Calculate sphere positions (evenly distributed in a circle for 5 spheres)
  // Wheel of Life rotation state
  const wheelRotation = useSharedValue(0); // Current rotation in radians
  const wheelVelocity = useSharedValue(0); // Rotation velocity
  const isWheelSpinning = useSharedValue(false); // Is wheel currently spinning
  const previousIsWheelSpinning = useSharedValue(false); // Track previous spinning state
  const hintRotation = useSharedValue(0); // Gentle continuous rotation hint (in radians)
  const isHintAnimating = useSharedValue(false); // Track if hint animation is active
  const spheresScale = useSharedValue(1); // Scale for floating spheres (shrink when selector is shown)
  const wheelCenterX = useSharedValue(SCREEN_WIDTH / 2); // Center X for wheel (shared value for stars)
  const wheelCenterY = useSharedValue(SCREEN_HEIGHT / 2); // Center Y for wheel (shared value for stars)
  const celebrationSparksVisible = useSharedValue(false); // Triggers spiraling sparks for 1s on correct exam answer
  // State for selected moment type when spinning the wheel
  type MomentType = "lessons" | "hardTruths" | "sunnyMoments";
  const [selectedMomentType, setSelectedMomentType] =
    useState<MomentType>("lessons");
  // LEGACY / DEAD CODE NOTE:
  // Main wheel lesson-check flow is not part of the active in-app UX anymore.
  // Keep this block only as a temporary fallback reference while migration stays in progress.
  // New lesson-check behavior should be implemented in entity wheel / universe exam flows instead.
  // MAIN WHEEL OF LIFE — lesson/exam state (triggered from classic view, circle avatar spin)
  const [selectedLesson, setSelectedLesson] = useState<{
    text: string;
    entityId: string;
    memoryId: string;
    memoryImageUri?: string;
    sphere: LifeSphere;
    isMock?: boolean;
    momentType?: MomentType;
    /** Main wheel exam: question from preloaded pool, step, AI analysis, user answer */
    examQuestion?: string;
    examStep?: "question" | "analyzing" | "result";
    examAnalysis?: { isCorrect: boolean; feedback: string };
    examUserAnswer?: string;
  } | null>(null);
  const [showLesson, setShowLesson] = useState(false);
  const [mainWheelExamAnswerInput, setMainWheelExamAnswerInput] = useState("");
  const [mainWheelExamTriesRemaining, setMainWheelExamTriesRemaining] =
    useState<number | null>(null);
  const mainWheelExamAnswerInputRef = useRef("");
  (mainWheelExamAnswerInputRef as React.MutableRefObject<string>).current =
    mainWheelExamAnswerInput;
  const [showMainWheelFireworks, setShowMainWheelFireworks] = useState(false);
  const [showMomentTypeSelector, setShowMomentTypeSelector] = useState(false);

  const mainWheelExamSubmitPressScale = useSharedValue(1);
  const mainWheelExamInputPulseScale = useSharedValue(1);

  // Keep tabPressNoOpRef in sync — when true, Home tab press (already on focused view) does nothing
  useEffect(() => {
    tabPressNoOpRef.current =
      homeViewMode === "focused" && !showMomentTypeSelector;
  }, [homeViewMode, showMomentTypeSelector]);

  // Track wheel spinning state for disabling icon buttons
  const [isSpinning, setIsSpinning] = useState(false);
  // Prevent double fire of release handler (e.g. duplicate events) so we don't consume free spin then show paywall
  const mainWheelReleaseInProgressRef = useRef(false);
  // In-flight question fetch started when spin begins, awaited when spin ends
  const pendingWheelQuestionRef = useRef<ReturnType<
    typeof pickAndConsumePreloadedQuestion
  > | null>(null);

  // Trigger glow effect when moment type changes - DISABLED
  // React.useEffect(() => {
  //   if (showMomentTypeSelector) {
  //     // Pulse the glow when a moment type is selected
  //     viewportGlowOpacity.value = withSequence(
  //       withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
  //       withTiming(0.6, { duration: 400, easing: Easing.inOut(Easing.ease) })
  //     );
  //   } else {
  //     viewportGlowOpacity.value = withTiming(0, { duration: 300 });
  //   }
  // }, [selectedMomentType, showMomentTypeSelector, viewportGlowOpacity]);

  // Sync animated value to state for TabScreenContainer - DISABLED
  // useAnimatedReaction(
  //   () => viewportGlowOpacity.value,
  //   (value) => {
  //     runOnJS(setCornerGlowOpacity)(value);
  //   }
  // );

  // Sync wheel spinning state to disable icon buttons during spin
  useAnimatedReaction(
    () => isWheelSpinning.value,
    (spinning) => {
      runOnJS(setIsSpinning)(spinning);
    },
  );

  // Reset main wheel spin state when user leaves the tab so re-entering works correctly
  useFocusEffect(
    useCallback(() => {
      return () => {
        isWheelSpinning.value = false;
        wheelVelocity.value = 0;
        mainWheelReleaseInProgressRef.current = false;
        pendingWheelQuestionRef.current = null;
        setIsSpinning(false);
      };
    }, [isWheelSpinning, wheelVelocity]),
  );

  const [momentTypeSelectorDismissed, setMomentTypeSelectorDismissed] =
    useState(false); // Track if user dismissed selector
  const lessonAppearCountRef = useRef(0);
  const [lessonAppearCount, setLessonAppearCount] = useState(0);
  const [lessonHintDismissed, setLessonHintDismissed] = useState(false);
  // Track pulsing lesson bulb appearances for tap hint
  const pulsingLessonAppearCountRef = useRef(0);
  const [pulsingLessonHintDismissed, setPulsingLessonHintDismissed] =
    useState(false);
  // The specific moment ID that should show the tap hint (set when 2nd+ lesson appears)
  const [tapHintMomentId, setTapHintMomentId] = useState<number | null>(null);

  // State for random pulsing moments around center avatar
  const [randomMoments, setRandomMoments] = useState<
    {
      id: number;
      angle: number;
      radius: number;
      momentType: "lessons" | "hardTruths" | "sunnyMoments";
      shouldGrowToFull?: boolean;
      text?: string;
      entityId?: string;
      memoryId?: string;
      sphere?: LifeSphere;
      memoryImageUri?: string;
      momentId?: string;
      spawnTime?: number;
    }[]
  >([]);
  const [expandedMomentId, setExpandedMomentId] = useState<number | null>(null);
  const expandedMomentIdRef = useRef<number | null>(null);
  expandedMomentIdRef.current = expandedMomentId;
  const expandedAtTimestampRef = useRef<number | null>(null);
  const prevExpandedMomentIdRef = useRef<number | null>(null);
  const momentIdCounter = useRef(0);

  // When user taps a growing moment, show this card instead of scaling the element
  const [momentCard, setMomentCard] = useState<{
    momentType: "lessons" | "hardTruths" | "sunnyMoments";
    text: string;
    entityId?: string;
    memoryId?: string;
    sphere?: LifeSphere;
    memoryImageUri?: string;
    momentId?: string;
  } | null>(null);

  // Track the current index for each moment type's sequential growth
  const currentMomentIndices = useRef<{ [key in MomentType]: number }>({
    lessons: 0,
    hardTruths: 0,
    sunnyMoments: 0,
  });

  // Track the previous selected moment type to detect changes
  const prevSelectedMomentType = useRef<MomentType | null>(null);
  const prevWasMomentsBlocked = useRef<boolean>(false); // Track if moments were previously blocked
  const milestoneInProgress = useRef(false); // Track if milestone is currently being handled
  const growAllShownAtRef = useRef<number>(0); // When grow-all was displayed (for spawnTime so moments can shrink individually on collapse)

  // Track if we should trigger "all at once" growth for a type
  const [growAllMomentsType, setGrowAllMomentsType] =
    useState<MomentType | null>(null);

  // Animation values for lesson notification
  const lessonOpacity = useSharedValue(0);
  const lessonScale = useSharedValue(0);
  const lessonPressScale = useSharedValue(1); // Press animation for main wheel popup
  const lessonTranslateX = useSharedValue(0);
  const lessonTranslateY = useSharedValue(0);
  const lessonShadowPulse = useSharedValue(1); // For pulsing shadow effect

  // Animation values for moment type selector icon buttons
  const iconButtonScale = useSharedValue(0);
  const lessonsButtonPressScale = useSharedValue(1);
  const hardTruthsButtonPressScale = useSharedValue(1);
  const sunnyMomentsButtonPressScale = useSharedValue(1);
  // Selection animation progress (0 = unselected, 1 = selected)
  const lessonsButtonSelection = useSharedValue(
    selectedMomentType === "lessons" ? 1 : 0,
  );
  const hardTruthsButtonSelection = useSharedValue(
    selectedMomentType === "hardTruths" ? 1 : 0,
  );
  const sunnyMomentsButtonSelection = useSharedValue(
    selectedMomentType === "sunnyMoments" ? 1 : 0,
  );
  // Liquid glass specular highlight (0 = no highlight, 1 = full highlight)
  const lessonsButtonHighlight = useSharedValue(0);
  const hardTruthsButtonHighlight = useSharedValue(0);
  const sunnyMomentsButtonHighlight = useSharedValue(0);
  const spinHintArcProgress = useSharedValue(0);
  const spinHintPointerOpacity = useSharedValue(0);
  const lessonHintPointerOpacity = useSharedValue(0);
  const lessonHintPointerBounce = useSharedValue(0);

  // Constants for sphere circle
  const sphereCircle = useMemo(() => {
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2; // Center of main circle and floating elements
    // On tablets, use smaller radius multiplier to keep spheres closer to the center
    const radiusMultiplier = isTablet ? 0.25 : 0.35; // Reduced from 0.35 to 0.25 on tablets
    const radius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * radiusMultiplier;
    const numSpheres = 5;
    const angleStep = (2 * Math.PI) / numSpheres; // 72 degrees in radians
    const startAngle = -Math.PI / 2; // Start from top (-90 degrees)

    return { centerX, centerY, radius, angleStep, startAngle };
  }, [isTablet]);

  // Calculate static sphere positions (for when not spinning)
  const spherePositions = useMemo(() => {
    const { centerX, centerY, radius, angleStep, startAngle } = sphereCircle;

    const relationshipsAngle = startAngle + 0 * angleStep;
    const careerAngle = startAngle + 1 * angleStep;
    const familyAngle = startAngle + 2 * angleStep;
    const friendsAngle = startAngle + 3 * angleStep;
    const hobbiesAngle = startAngle + 4 * angleStep;

    return {
      relationships: {
        x: centerX + radius * Math.cos(relationshipsAngle),
        y: centerY + radius * Math.sin(relationshipsAngle),
      },
      career: {
        x: centerX + radius * Math.cos(careerAngle),
        y: centerY + radius * Math.sin(careerAngle),
      },
      family: {
        x: centerX + radius * Math.cos(familyAngle),
        y: centerY + radius * Math.sin(familyAngle),
      },
      friends: {
        x: centerX + radius * Math.cos(friendsAngle),
        y: centerY + radius * Math.sin(friendsAngle),
      },
      hobbies: {
        x: centerX + radius * Math.cos(hobbiesAngle),
        y: centerY + radius * Math.sin(hobbiesAngle),
      },
    };
  }, [sphereCircle]);

  // Collect all moments by type from all memories across all spheres
  const getAllMomentsByType = useCallback(
    (momentType: MomentType) => {
      const moments: {
        text: string;
        entityId: string;
        memoryId: string;
        sphere: LifeSphere;
        memoryImageUri?: string;
        momentId?: string;
      }[] = [];

      // Normalize image URI: use imageUri if it's a non-empty string (handles legacy/edge cases)
      const getMemoryImageUri = (m: { imageUri?: string }) =>
        typeof m?.imageUri === "string" && m.imageUri.trim()
          ? m.imageUri.trim()
          : undefined;

      // Determine which property to access based on moment type
      const propertyName =
        momentType === "lessons"
          ? "lessonsLearned"
          : momentType === "hardTruths"
            ? "hardTruths"
            : "goodFacts";

      // Collect from relationships
      profiles.forEach((profile) => {
        const memories = getIdealizedMemoriesByProfileId(profile.id);
        memories.forEach((memory) => {
          const items = memory[propertyName];
          if (items && Array.isArray(items)) {
            items.forEach((item: { id?: string; text: string }) => {
              if (item.text && item.text.trim()) {
                moments.push({
                  text: item.text,
                  entityId: profile.id,
                  memoryId: memory.id,
                  sphere: "relationships" as LifeSphere,
                  memoryImageUri: getMemoryImageUri(memory),
                  momentId: item.id,
                });
              }
            });
          }
        });
      });

      // Collect from career
      jobs.forEach((job) => {
        const memories = getIdealizedMemoriesByEntityId(job.id, "career");
        memories.forEach((memory) => {
          const items = memory[propertyName];
          if (items && Array.isArray(items)) {
            items.forEach((item: { id?: string; text: string }) => {
              if (item.text && item.text.trim()) {
                moments.push({
                  text: item.text,
                  entityId: job.id,
                  memoryId: memory.id,
                  sphere: "career" as LifeSphere,
                  memoryImageUri: getMemoryImageUri(memory),
                  momentId: item.id,
                });
              }
            });
          }
        });
      });

      // Collect from family
      familyMembers.forEach((member) => {
        const memories = getIdealizedMemoriesByEntityId(member.id, "family");
        memories.forEach((memory) => {
          const items = memory[propertyName];
          if (items && Array.isArray(items)) {
            items.forEach((item: { id?: string; text: string }) => {
              if (item.text && item.text.trim()) {
                moments.push({
                  text: item.text,
                  entityId: member.id,
                  memoryId: memory.id,
                  sphere: "family" as LifeSphere,
                  memoryImageUri: getMemoryImageUri(memory),
                  momentId: item.id,
                });
              }
            });
          }
        });
      });

      // Collect from friends
      friends.forEach((friend) => {
        const memories = getIdealizedMemoriesByEntityId(friend.id, "friends");
        memories.forEach((memory) => {
          const items = memory[propertyName];
          if (items && Array.isArray(items)) {
            items.forEach((item: { id?: string; text: string }) => {
              if (item.text && item.text.trim()) {
                moments.push({
                  text: item.text,
                  entityId: friend.id,
                  memoryId: memory.id,
                  sphere: "friends" as LifeSphere,
                  memoryImageUri: getMemoryImageUri(memory),
                  momentId: item.id,
                });
              }
            });
          }
        });
      });

      // Collect from hobbies
      hobbies.forEach((hobby) => {
        const memories = getIdealizedMemoriesByEntityId(hobby.id, "hobbies");
        memories.forEach((memory) => {
          const items = memory[propertyName];
          if (items && Array.isArray(items)) {
            items.forEach((item: { id?: string; text: string }) => {
              if (item.text && item.text.trim()) {
                moments.push({
                  text: item.text,
                  entityId: hobby.id,
                  memoryId: memory.id,
                  sphere: "hobbies" as LifeSphere,
                  memoryImageUri: getMemoryImageUri(memory),
                  momentId: item.id,
                });
              }
            });
          }
        });
      });

      return moments;
    },
    [
      profiles,
      jobs,
      familyMembers,
      friends,
      hobbies,
      getIdealizedMemoriesByProfileId,
      getIdealizedMemoriesByEntityId,
    ],
  );

  // Get counts for all moment types for a specific entity
  const getAllMomentCountsForEntity = useCallback(
    (entityId: string, sphere: LifeSphere) => {
      const memories =
        sphere === "relationships"
          ? getIdealizedMemoriesByProfileId(entityId)
          : getIdealizedMemoriesByEntityId(entityId, sphere);

      let lessonsCount = 0;
      let hardTruthsCount = 0;
      let sunnyMomentsCount = 0;

      memories.forEach((memory) => {
        lessonsCount += (memory.lessonsLearned || []).length;
        hardTruthsCount += (memory.hardTruths || []).length;
        sunnyMomentsCount += (memory.goodFacts || []).length;
      });

      return {
        lessons: lessonsCount,
        hardTruths: hardTruthsCount,
        sunnyMoments: sunnyMomentsCount,
      };
    },
    [getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId],
  );

  // Handle wheel spin completion — always use lesson preloaded exam
  const onWheelSpinComplete = useCallback(async () => {
    const lessons = getAllMomentsByType("lessons");
    let momentToShow: {
      text: string;
      entityId: string;
      memoryId: string;
      memoryImageUri?: string;
      sphere: LifeSphere;
      isMock?: boolean;
      momentType: MomentType;
      examQuestion?: string;
      examStep?: "question" | "analyzing" | "result";
    };

    // Await the question fetch that was started when the spin began (or fall back to a fresh fetch)
    const fetchPromise =
      pendingWheelQuestionRef.current ??
      pickAndConsumePreloadedQuestion({
        type: "main",
        onRefetchMain: () =>
          preloadMainWheelQuestions({
            memories: idealizedMemories,
            language: appLang,
            hasAIEntitlement,
            appendOnly: true,
          }),
      });
    pendingWheelQuestionRef.current = null;
    const item = await fetchPromise;

    if (item) {
      momentToShow = {
        text: item.lessonText,
        entityId: item.entityId ?? "",
        memoryId: item.memoryId ?? "",
        memoryImageUri: item.memoryImageUri,
        sphere: (item.sphere ?? "relationships") as LifeSphere,
        momentType: "lessons",
        examQuestion: item.question,
        examStep: "question",
      };
    } else if (lessons.length > 0) {
      // Fallback: pool empty, pick random lesson (no exam)
      const randomIndex = Math.floor(Math.random() * lessons.length);
      momentToShow = {
        ...lessons[randomIndex],
        momentType: "lessons",
      };
    } else {
      momentToShow = {
        text: t("wheel.noLessons.message"),
        entityId: "",
        memoryId: "",
        sphere: "relationships" as LifeSphere,
        isMock: true,
        momentType: "lessons",
      };
    }

    setSelectedMomentType("lessons");
    setSelectedLesson(momentToShow);
    setShowLesson(true);
    setMainWheelExamAnswerInput("");

    // Start entrance animation
    const baseCircleSize = isTablet ? 260 : isLargeDevice ? 210 : 190;
    const lessonSunHeight = baseCircleSize;
    const avatarCenterX = sphereCircle.centerX;
    const avatarCenterY = sphereCircle.centerY;
    const finalX = SCREEN_WIDTH / 2;
    const finalY = messageTop + lessonSunHeight / 2;
    const startTranslateX = avatarCenterX - finalX;
    const startTranslateY = avatarCenterY - finalY;
    lessonOpacity.value = 0;
    lessonScale.value = 0.3;
    lessonTranslateX.value = startTranslateX;
    lessonTranslateY.value = startTranslateY;
    lessonOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    lessonScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    lessonTranslateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    lessonTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    lessonShadowPulse.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [
    getAllMomentsByType,
    idealizedMemories,
    appLang,
    hasAIEntitlement,
    lessonOpacity,
    lessonScale,
    lessonTranslateX,
    lessonTranslateY,
    lessonShadowPulse,
    sphereCircle,
    messageTop,
    isTablet,
    isLargeDevice,
    t,
  ]);

  // Main wheel exam: submit answer, AI evaluates, reveal lesson
  const handleMainWheelExamSubmit = useCallback(
    async (userAnswer: string) => {
      if (
        !selectedLesson ||
        selectedLesson.momentType !== "lessons" ||
        !selectedLesson.examQuestion
      )
        return;
      setSelectedLesson((p) =>
        p ? { ...p, examStep: "analyzing" as const } : null,
      );
      try {
        const analysis = await analyzeLessonExamAnswer(
          selectedLesson.text,
          selectedLesson.examQuestion,
          userAnswer,
          appLang,
        );
        setSelectedLesson((p) =>
          p
            ? {
                ...p,
                examStep: "result",
                examAnalysis: analysis,
                examUserAnswer: userAnswer,
              }
            : null,
        );
        if (analysis.isCorrect) {
          setShowMainWheelFireworks(true);
          celebrationSparksVisible.value = true;
          setTimeout(() => {
            celebrationSparksVisible.value = false;
          }, 1000);
        }
      } catch (err) {
        logError("main-wheel-exam-analyze", err as Error);
        setSelectedLesson((p) =>
          p
            ? {
                ...p,
                examStep: "result",
                examAnalysis: {
                  isCorrect: false,
                  feedback: "Something went wrong. Try again.",
                },
                examUserAnswer: userAnswer,
              }
            : null,
        );
      }
    },
    [selectedLesson, appLang, celebrationSparksVisible],
  );

  // Animate spheres scale and icon buttons when moment type selector is shown/hidden
  useEffect(() => {
    if (showMomentTypeSelector) {
      // Shrink spheres to 0.6 scale — softer spring so the wheel doesn’t “pop” in
      spheresScale.value = withSpring(0.6, {
        damping: 18,
        stiffness: 85,
      });
      // Animate icon buttons from 0 to 1 — slower so the percentage controls appear smoothly
      iconButtonScale.value = withSpring(1, {
        damping: 16,
        stiffness: 80,
        mass: 0.9,
      });
    } else {
      // Return to normal size
      spheresScale.value = withSpring(1, {
        damping: 18,
        stiffness: 85,
      });
      // Scale buttons back to 0 — slightly longer so hide feels consistent
      iconButtonScale.value = withTiming(0, { duration: 280 });
    }
  }, [showMomentTypeSelector, spheresScale, iconButtonScale]);

  // Reset spin hint when selector hides; dismiss driven by animation completion (smooth finger fade)
  useEffect(() => {
    if (!showMomentTypeSelector) {
      setMomentTypeSelectorDismissed(false);
      return;
    }

    if (!appUsabilityHints) {
      setMomentTypeSelectorDismissed(true);
      return;
    }

    setMomentTypeSelectorDismissed(false);
  }, [showMomentTypeSelector, appUsabilityHints]);

  // Note: We no longer clear moments when selectedMomentType changes
  // All moment types remain visible, but only the selected type will pulse

  // When user switches tab (e.g. to sunny moments), hide "grow all" overlay for other types
  // so lessons don't keep pulsing when we're on sunny moments
  useEffect(() => {
    if (
      growAllMomentsType !== null &&
      growAllMomentsType !== selectedMomentType
    ) {
      setGrowAllMomentsType(null);
    }
  }, [selectedMomentType, growAllMomentsType]);

  // Clear all moments immediately when spinning starts
  useEffect(() => {
    if (isSpinning) {
      setRandomMoments([]);
      setGrowAllMomentsType(null);
    }
  }, [isSpinning]);

  // Spawn moments with 4 concurrent staggered animations for the selected moment type
  // When all moments of a type are shown, grow all at once (except clouds), then restart
  useEffect(() => {
    // Check if moments are currently blocked from showing
    const momentsAreBlocked =
      !showMomentTypeSelector ||
      (appUsabilityHints && !momentTypeSelectorDismissed) ||
      !isScreenActive ||
      !selectedMomentType ||
      isSpinning ||
      !!selectedLesson ||
      expandedMomentId !== null; // Pause when a moment is expanded

    // Track if moment type changed
    const momentTypeChanged =
      prevSelectedMomentType.current !== selectedMomentType;

    // Check if we're transitioning from blocked to unblocked (returning to the view)
    const justUnblocked = prevWasMomentsBlocked.current && !momentsAreBlocked;

    // When unblocking by collapse: user tapped to close expanded moment - keep existing moments
    // so they can each run their individual remaining hold time + shrink (don't clear them).
    // When unblocking by other means (type change, app resume): clear and restart from beginning.
    const unblockedByCollapse =
      justUnblocked &&
      prevExpandedMomentIdRef.current !== null &&
      expandedMomentId === null;

    // Clear and reset when moment type changes OR when transitioning from blocked to unblocked
    // But when unblocked by collapse: don't clear randomMoments - let each moment shrink individually
    if (
      (momentTypeChanged || (justUnblocked && !unblockedByCollapse)) &&
      selectedMomentType &&
      !momentsAreBlocked
    ) {
      setRandomMoments([]);
      setGrowAllMomentsType(null);
      currentMomentIndices.current[selectedMomentType] = 0;
      milestoneInProgress.current = false; // Reset so next cycle can spawn (was stuck if growAllTimeout was cleared)
      prevSelectedMomentType.current = selectedMomentType;
    }
    // When unblocked by collapse: still reset indices and milestone so cycle can continue after moments shrink
    if (unblockedByCollapse && selectedMomentType && !momentsAreBlocked) {
      currentMomentIndices.current[selectedMomentType] = 0;
      milestoneInProgress.current = false;
    }
    prevExpandedMomentIdRef.current = expandedMomentId;

    // Update the blocked state tracker
    prevWasMomentsBlocked.current = momentsAreBlocked;

    if (momentsAreBlocked) {
      // Clear moments when selector is hidden or app backgrounded
      if (showMomentTypeSelector === false || isScreenActive === false) {
        setRandomMoments([]);
        setGrowAllMomentsType(null); // Clear so on resume we don't show wrong type (e.g. all lessons when on sunny)
        setExpandedMomentId(null); // Reset so re-entering doesn't think we're still paused
        expandedAtTimestampRef.current = null;
        prevSelectedMomentType.current = null;
      }
      // Reset indices when selector is hidden or when wheel is spinning
      if (!showMomentTypeSelector || !isScreenActive) {
        currentMomentIndices.current = {
          lessons: 0,
          hardTruths: 0,
          sunnyMoments: 0,
        };
      }
      return;
    }

    const avatarSize = isTablet ? 180 : 140;
    const avatarRadius = avatarSize / 2;
    const momentRadius = avatarRadius + (isTablet ? 120 : 80);

    // Get all moments of the selected type
    const allMomentsOfType = getAllMomentsByType(selectedMomentType);
    const totalCount = allMomentsOfType.length;

    if (totalCount === 0) {
      setRandomMoments([]);
      setGrowAllMomentsType(null);
      return;
    }

    // Safeguard: if indices are at/past end (e.g. growAllTimeout was cleared), reset so popping never stops
    const currentIdx = currentMomentIndices.current[selectedMomentType];
    if (currentIdx >= totalCount) {
      currentMomentIndices.current[selectedMomentType] = 0;
      milestoneInProgress.current = false; // Was stuck if growAllTimeout was cleared (e.g. user expanded during grow-all)
    }

    // Reset milestone flag when effect runs unblocked - ensures we never get stuck from a previous aborted grow-all
    milestoneInProgress.current = false;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Cloud moments (hardTruths) appear one by one with longer delays
    const isCloudMoment = selectedMomentType === "hardTruths";
    const INITIAL_CONCURRENT_MOMENTS = isCloudMoment ? 1 : 4; // Cloud: 1 at a time, Others: 4 concurrent
    const INITIAL_START_DELAY = 1000; // Wait 1 second after opening wheel before first moment
    const INITIAL_STAGGER_DELAY = isCloudMoment ? 1500 : 800; // Cloud: 1.5s delay (reduced from 2.5s), Others: 800ms
    const NEXT_MOMENT_DELAY = isCloudMoment ? 1500 : 400; // Cloud: 1.5s between each (reduced from 2.5s), Others: 400ms
    const MOMENT_DURATION = 5600; // Total duration: 800ms grow + 4000ms hold + 800ms shrink

    const spawnSingleMoment = (momentIndex: number, delay: number = 0) => {
      // Safety check: don't spawn if index is out of bounds or already processed
      if (momentIndex >= totalCount || momentIndex < 0) return;

      const timeout = setTimeout(() => {
        // Double-check index is still valid (in case of race conditions)
        if (momentIndex >= totalCount) return;
        // Random angle around the circle
        const angle = Math.random() * 2 * Math.PI;

        // Random radius variation for organic feel
        const radiusVariation = (Math.random() - 0.5) * (isTablet ? 40 : 25);
        const radius = momentRadius + radiusVariation;

        // Get the actual moment data for this index
        const momentData = allMomentsOfType[momentIndex];

        const spawnTime = Date.now();
        const newMoment = {
          id: momentIdCounter.current++,
          angle,
          radius,
          momentType: selectedMomentType,
          shouldGrowToFull: true,
          text: momentData?.text || "",
          entityId: momentData?.entityId,
          memoryId: momentData?.memoryId,
          sphere: momentData?.sphere,
          memoryImageUri: momentData?.memoryImageUri,
          momentId: momentData?.momentId,
          spawnTime,
        };

        // Add this moment to the array (use functional update to avoid stale closures)
        setRandomMoments((prev) => {
          if (prev.some((m) => m.id === newMoment.id)) return prev;
          return [...prev, newMoment];
        });

        // Remove this moment after it completes (skip if any moment is expanded - keep all visible)
        const removeTimeout = setTimeout(() => {
          setRandomMoments((prev) => {
            if (expandedMomentIdRef.current !== null) return prev;
            return prev.filter((m) => m.id !== newMoment.id);
          });
        }, MOMENT_DURATION + 100);
        timeouts.push(removeTimeout);

        // After this moment completes (finishes shrinking), spawn the next one
        // To maintain 4 concurrent moments: when moment X finishes, spawn moment X + 4
        const nextMomentIndex = momentIndex + INITIAL_CONCURRENT_MOMENTS;

        // Calculate milestone interval: if total moments < 40, use 20% intervals, otherwise use every 20 moments
        const MILESTONE_INTERVAL =
          totalCount < 40
            ? Math.max(1, Math.floor(totalCount * 0.2)) // 20% of total, minimum 1
            : 20; // Every 20 moments for 40+ total moments

        // Check if we've hit a milestone
        // For < 40 moments: milestones at 20%, 40%, 60%, 80%, 100%
        // For 40+ moments: milestones at 20, 40, 60, etc.
        // Check if nextMomentIndex would cross a milestone threshold
        // Calculate which milestone threshold we're approaching
        const currentMilestone = Math.floor(momentIndex / MILESTONE_INTERVAL);
        const nextMilestone = Math.floor(nextMomentIndex / MILESTONE_INTERVAL);
        const wouldReachMilestone =
          nextMilestone > currentMilestone && nextMomentIndex < totalCount;
        const isAtEnd = nextMomentIndex >= totalCount;

        const nextSpawnTimeout = setTimeout(() => {
          // Check milestone flag BEFORE processing to prevent race conditions
          if (milestoneInProgress.current) {
            return; // Milestone already being handled, don't spawn anything
          }

          // Update the highest index that has been spawned (atomic check)
          const actualCurrentHighest =
            currentMomentIndices.current[selectedMomentType];
          if (nextMomentIndex <= actualCurrentHighest) {
            // Another moment already spawned this or a later moment, skip
            return;
          }
          currentMomentIndices.current[selectedMomentType] = nextMomentIndex;

          // Check if we need to handle milestone
          if (wouldReachMilestone || isAtEnd) {
            milestoneInProgress.current = true;

            // Grow all moments at once (all types: sunny, lessons, clouds) - then restart so popping never stops
            growAllShownAtRef.current = Date.now();
            setGrowAllMomentsType(selectedMomentType);
            // Wait for complete animation cycle: 800ms grow + 4000ms hold (with pulsing) + 800ms shrink = 5600ms total
            const GROW_ALL_DURATION = 5600;
            const growAllTimeout = setTimeout(() => {
              setGrowAllMomentsType(null);

              // Reset milestone flag AFTER the grow-all completes
              milestoneInProgress.current = false;

              if (isAtEnd) {
                // At 100%, restart from beginning so popping never stops
                currentMomentIndices.current[selectedMomentType] = 0;

                // Wait before restarting with initial batch
                const continueTimeout = setTimeout(() => {
                  startInitialBatch();
                }, NEXT_MOMENT_DELAY);
                timeouts.push(continueTimeout);
              } else {
                // At milestone (not at end), continue spawning from the next index
                const continueTimeout = setTimeout(() => {
                  const startIndex =
                    currentMomentIndices.current[selectedMomentType];
                  if (startIndex < totalCount) {
                    const momentsToSpawn = Math.min(
                      INITIAL_CONCURRENT_MOMENTS,
                      totalCount - startIndex,
                    );
                    for (let i = 0; i < momentsToSpawn; i++) {
                      const momentIndex = startIndex + i;
                      if (momentIndex >= totalCount) break;
                      spawnSingleMoment(momentIndex, i * INITIAL_STAGGER_DELAY);
                    }
                  }
                }, NEXT_MOMENT_DELAY);
                timeouts.push(continueTimeout);
              }
            }, GROW_ALL_DURATION);
            timeouts.push(growAllTimeout);
          } else {
            // No milestone, spawn the next moment after 400ms delay
            // This maintains 4 concurrent moments: when moment X finishes, spawn moment X + 4
            if (nextMomentIndex < totalCount) {
              spawnSingleMoment(nextMomentIndex, NEXT_MOMENT_DELAY);
            }
          }
        }, MOMENT_DURATION);
        timeouts.push(nextSpawnTimeout);
      }, delay);

      timeouts.push(timeout);
    };

    const startInitialBatch = () => {
      const currentIndex = currentMomentIndices.current[selectedMomentType];
      const momentsToSpawn = Math.min(
        INITIAL_CONCURRENT_MOMENTS,
        totalCount - currentIndex,
      );

      // Spawn the initial batch with stagger delay between each
      // Each moment will spawn the next one when it finishes, maintaining 4 concurrent
      for (let i = 0; i < momentsToSpawn; i++) {
        const momentIndex = currentIndex + i;
        if (momentIndex >= totalCount) break;
        // Add INITIAL_START_DELAY to all moments, plus stagger for each subsequent moment
        spawnSingleMoment(
          momentIndex,
          INITIAL_START_DELAY + i * INITIAL_STAGGER_DELAY,
        );
      }

      // Update the highest index that has been spawned
      if (momentsToSpawn > 0) {
        const lastSpawnedIndex = currentIndex + momentsToSpawn - 1;
        currentMomentIndices.current[selectedMomentType] = lastSpawnedIndex;
      }
    };

    // Start spawning the initial batch of moments
    startInitialBatch();

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [
    showMomentTypeSelector,
    appUsabilityHints,
    momentTypeSelectorDismissed,
    selectedMomentType,
    isTablet,
    isScreenActive,
    getAllMomentsByType,
    isSpinning,
    selectedLesson,
    expandedMomentId,
  ]);

  // Handle moment completion (remove from array)
  const handleMomentComplete = useCallback((id: number) => {
    setRandomMoments((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // LEGACY / DEAD CODE NOTE:
  // "Challenge Me" here belongs to the deprecated main-wheel exam path.
  // Do not extend this path for new features; use entity wheel / universe lessons flows.
  // Challenge Me: run rate-limit/paywall checks then show exam modal in-place (no view switch)
  const handleChallengeMePress = useCallback(() => {
    if (!aiConsent.isEnabled) {
      setAiInsightsConsentVisible(true);
      return;
    }
    if (mainWheelReleaseInProgressRef.current) return;
    mainWheelReleaseInProgressRef.current = true;
    void (async () => {
      try {
        const consumed = await consumeUniverseExamIfAvailable(hasAIEntitlement);
        if (!consumed) {
          const purchased = await showPaywallForAIAccess();
          if (!purchased) return;
        }
        const remaining = await getRemainingUniverseExams(hasAIEntitlement);
        setMainWheelExamTriesRemaining(remaining);
        // Rate limit passed — show exam directly without switching to classic view
        await onWheelSpinComplete();
      } finally {
        mainWheelReleaseInProgressRef.current = false;
      }
    })();
  }, [
    aiConsent.isEnabled,
    hasAIEntitlement,
    setAiInsightsConsentVisible,
    onWheelSpinComplete,
  ]);

  // Animate lesson notification when manually closed
  useEffect(() => {
    if (!showLesson) {
      lessonOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      lessonScale.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      lessonTranslateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      lessonTranslateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      cancelAnimation(lessonShadowPulse); // Stop pulsing when closed
      lessonShadowPulse.value = 1; // Reset to default
    }
  }, [
    showLesson,
    lessonOpacity,
    lessonScale,
    lessonTranslateX,
    lessonTranslateY,
    lessonShadowPulse,
  ]);

  // Lesson bulb tap hint: bouncing pointer shown from the 1st appearance onward
  useEffect(() => {
    if (showLesson) {
      lessonAppearCountRef.current += 1;
      setLessonAppearCount(lessonAppearCountRef.current);
    }
    const count = lessonAppearCountRef.current;
    if (!showLesson || !appUsabilityHints || lessonHintDismissed || count < 1) {
      cancelAnimation(lessonHintPointerOpacity);
      cancelAnimation(lessonHintPointerBounce);
      lessonHintPointerOpacity.value = withTiming(0, { duration: 200 });
      lessonHintPointerBounce.value = 0;
      return;
    }
    // Fade in, then gently bounce to draw attention to the bulb
    lessonHintPointerBounce.value = 0;
    lessonHintPointerOpacity.value = withTiming(0.9, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    lessonHintPointerBounce.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 350, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withTiming(-6, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(lessonHintPointerOpacity);
      cancelAnimation(lessonHintPointerBounce);
    };
  }, [
    showLesson,
    appUsabilityHints,
    lessonHintDismissed,
    lessonHintPointerOpacity,
    lessonHintPointerBounce,
  ]);
  // Note: the above effect handles the main wheel lesson (HomeScreen). The entity wheel lesson hint
  // is handled inside FloatingAvatar with wheelMomentHintPointer* values.

  // Track how many times a pulsing lessons bulb has appeared (shouldGrowToFull)
  // and assign the tap hint to the specific moment ID (not "first in array" which shifts)
  const prevLessonMomentIdsRef = useRef<Set<number>>(new Set());
  // Whether the hint has already been assigned this session (so we don't reassign on every new bulb)
  const tapHintAssignedThisSessionRef = useRef(false);

  // Reset lesson tap hint counter each time the moment selector closes
  useEffect(() => {
    if (!showMomentTypeSelector) {
      pulsingLessonAppearCountRef.current = 0;
      prevLessonMomentIdsRef.current = new Set();
      tapHintAssignedThisSessionRef.current = false;
      setTapHintMomentId(null);
    }
  }, [showMomentTypeSelector]);

  useEffect(() => {
    const currentLessonMoments = randomMoments.filter(
      (m) => m.momentType === "lessons" && m.shouldGrowToFull,
    );
    const currentIds = new Set(currentLessonMoments.map((m) => m.id));
    // Count new lesson moments; assign hint only once per session (on the 2nd appearance)
    for (const m of currentLessonMoments) {
      if (!prevLessonMomentIdsRef.current.has(m.id)) {
        pulsingLessonAppearCountRef.current += 1;
        if (
          pulsingLessonAppearCountRef.current >= 2 &&
          !tapHintAssignedThisSessionRef.current &&
          !pulsingLessonHintDismissed
        ) {
          tapHintAssignedThisSessionRef.current = true;
          setTapHintMomentId(m.id);
        }
      }
    }
    // If the hinted moment disappeared, clear it but don't reassign (hint shown, job done)
    setTapHintMomentId((prev) =>
      prev !== null && !currentIds.has(prev) ? null : prev,
    );
    prevLessonMomentIdsRef.current = currentIds;
  }, [randomMoments, pulsingLessonHintDismissed]);

  // Fade out lesson notification when wheel starts spinning
  const fadeOutLesson = useCallback(() => {
    // Animate lesson out smoothly
    lessonOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });
    lessonScale.value = withTiming(0.8, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });
    lessonTranslateY.value = withTiming(-20, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });
    // Hide the lesson after animation completes
    setTimeout(() => {
      setShowLesson(false);
    }, 300);
  }, [lessonOpacity, lessonScale, lessonTranslateY]);

  // Reset button press scales when selection changes to prevent stuck animations
  useEffect(() => {
    lessonsButtonPressScale.value = withTiming(1, { duration: 150 });
    hardTruthsButtonPressScale.value = withTiming(1, { duration: 150 });
    sunnyMomentsButtonPressScale.value = withTiming(1, { duration: 150 });
  }, [
    selectedMomentType,
    lessonsButtonPressScale,
    hardTruthsButtonPressScale,
    sunnyMomentsButtonPressScale,
  ]);

  // Animate selection state when selectedMomentType changes
  useEffect(() => {
    // Animate lessons button
    lessonsButtonSelection.value = withTiming(
      selectedMomentType === "lessons" ? 1 : 0,
      { duration: 300, easing: Easing.inOut(Easing.ease) },
    );
    // Animate hard truths button
    hardTruthsButtonSelection.value = withTiming(
      selectedMomentType === "hardTruths" ? 1 : 0,
      { duration: 300, easing: Easing.inOut(Easing.ease) },
    );
    // Animate sunny moments button
    sunnyMomentsButtonSelection.value = withTiming(
      selectedMomentType === "sunnyMoments" ? 1 : 0,
      { duration: 300, easing: Easing.inOut(Easing.ease) },
    );
  }, [
    selectedMomentType,
    lessonsButtonSelection,
    hardTruthsButtonSelection,
    sunnyMomentsButtonSelection,
  ]);

  // Press handlers for moment type selector icon buttons with liquid glass highlight
  const handleLessonsButtonPressIn = useCallback(() => {
    "worklet";
    lessonsButtonPressScale.value = withTiming(0.88, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
    lessonsButtonHighlight.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [lessonsButtonPressScale, lessonsButtonHighlight]);

  const handleLessonsButtonPressOut = useCallback(() => {
    "worklet";
    lessonsButtonPressScale.value = withSpring(1, {
      damping: 10,
      stiffness: 300,
    });
    lessonsButtonHighlight.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [lessonsButtonPressScale, lessonsButtonHighlight]);

  const handleHardTruthsButtonPressIn = useCallback(() => {
    "worklet";
    hardTruthsButtonPressScale.value = withTiming(0.88, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
    hardTruthsButtonHighlight.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [hardTruthsButtonPressScale, hardTruthsButtonHighlight]);

  const handleHardTruthsButtonPressOut = useCallback(() => {
    "worklet";
    hardTruthsButtonPressScale.value = withSpring(1, {
      damping: 10,
      stiffness: 300,
    });
    hardTruthsButtonHighlight.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [hardTruthsButtonPressScale, hardTruthsButtonHighlight]);

  const handleSunnyMomentsButtonPressIn = useCallback(() => {
    "worklet";
    sunnyMomentsButtonPressScale.value = withTiming(0.88, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
    sunnyMomentsButtonHighlight.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [sunnyMomentsButtonPressScale, sunnyMomentsButtonHighlight]);

  const handleSunnyMomentsButtonPressOut = useCallback(() => {
    "worklet";
    sunnyMomentsButtonPressScale.value = withSpring(1, {
      damping: 10,
      stiffness: 300,
    });
    sunnyMomentsButtonHighlight.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [sunnyMomentsButtonPressScale, sunnyMomentsButtonHighlight]);

  useAnimatedReaction(
    () => isWheelSpinning.value,
    (isSpinning) => {
      // When wheel starts spinning (transitions from false to true)
      if (isSpinning && !previousIsWheelSpinning.value) {
        runOnJS(fadeOutLesson)();
      }
      previousIsWheelSpinning.value = isSpinning;
    },
  );

  // Animated style for lesson notification
  const lessonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: lessonOpacity.value,
      transform: [
        { translateX: lessonTranslateX.value },
        { translateY: lessonTranslateY.value },
        { scale: lessonScale.value * lessonPressScale.value },
      ],
    };
  });

  // Animated style for pulsing shadow on lesson
  const lessonShadowAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: 0.95 * lessonShadowPulse.value,
      shadowRadius: (isTablet ? 40 : 30) * lessonShadowPulse.value,
    };
  });

  // Animated style for icon buttons
  const iconButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconButtonScale.value }],
  }));

  // Orbit radius for the hint arc — sphere centers radius + outward offset so finger sits on the ring
  const hintOrbitRadius = sphereCircle.radius + 28;

  const spinHintPointerAnimatedStyle = useAnimatedStyle(() => {
    const t = spinHintArcProgress.value;
    const angle = HINT_ARC_START_RAD + t * HINT_ARC_SWEEP_RAD;
    const r = hintOrbitRadius;
    return {
      opacity: spinHintPointerOpacity.value,
      transform: [
        { translateX: r * Math.cos(angle) },
        { translateY: r * Math.sin(angle) },
        // Rotate icon to face its direction of travel, flipped 180° so finger points inward
        { rotate: `${angle + Math.PI / 2 + Math.PI}rad` },
      ],
    };
  });

  const lessonHintPointerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: lessonHintPointerOpacity.value,
    transform: [{ translateY: lessonHintPointerBounce.value }],
  }));

  const mainWheelExamSubmitButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainWheelExamSubmitPressScale.value }],
  }));

  const mainWheelExamInputPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainWheelExamInputPulseScale.value }],
  }));

  const handleMainWheelExamSubmitPressIn = useCallback(() => {
    if (mainWheelExamAnswerInputRef.current.trim().length >= 2) {
      cancelAnimation(mainWheelExamSubmitPressScale);
      mainWheelExamSubmitPressScale.value = withTiming(0.82, {
        duration: 80,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [mainWheelExamSubmitPressScale]);

  const handleMainWheelExamSubmitPressOut = useCallback(() => {
    cancelAnimation(mainWheelExamSubmitPressScale);
    mainWheelExamSubmitPressScale.value = withSpring(1, {
      damping: 12,
      stiffness: 400,
    });
  }, [mainWheelExamSubmitPressScale]);

  const handleMainWheelExamSubmitPress = useCallback(() => {
    const trimmed = mainWheelExamAnswerInput.trim();
    if (trimmed.length >= 2) {
      handleMainWheelExamSubmit(trimmed);
      setMainWheelExamAnswerInput("");
    } else {
      cancelAnimation(mainWheelExamInputPulseScale);
      mainWheelExamInputPulseScale.value = withSequence(
        withTiming(1.04, { duration: 80, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 12, stiffness: 400 }),
      );
    }
  }, [
    mainWheelExamAnswerInput,
    handleMainWheelExamSubmit,
    mainWheelExamSubmitPressScale,
    mainWheelExamInputPulseScale,
  ]);

  const handleDismissLesson = useCallback((e: GestureResponderEvent) => {
    e.stopPropagation();
    setShowLesson(false);
    setSelectedLesson(null);
    setMainWheelExamAnswerInput("");
  }, []);

  const handleAIConsentEnable = useCallback(() => {
    setAiInsightsConsentVisible(false);
    void aiConsent.setChoice("enabled");
  }, [aiConsent]);

  const handleAIConsentMaybeLater = useCallback(() => {
    void aiConsent.setChoice("maybe_later").then(() => {
      setAiInsightsConsentVisible(false);
    });
  }, [aiConsent]);

  // Animated styles for individual button press effects (match circle avatar ring)
  const lessonsButtonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      lessonsButtonSelection.value,
      [0, 1],
      [MAIN_WHEEL_COSMIC_UNSELECTED, MAIN_WHEEL_COSMIC_SELECTED],
    );
    const borderWidth = lessonsButtonSelection.value * 2; // Animate from 0 to 2

    return {
      transform: [{ scale: lessonsButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: MAIN_WHEEL_COSMIC_SELECTED,
      borderRadius: 30,
      width: 60,
      height: 60,
      overflow: "hidden", // For blur effect
    };
  });

  const hardTruthsButtonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      hardTruthsButtonSelection.value,
      [0, 1],
      [MAIN_WHEEL_COSMIC_UNSELECTED, MAIN_WHEEL_COSMIC_SELECTED],
    );
    const borderWidth = hardTruthsButtonSelection.value * 2; // Animate from 0 to 2

    return {
      transform: [{ scale: hardTruthsButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: MAIN_WHEEL_COSMIC_SELECTED,
      borderRadius: 30,
      width: 60,
      height: 60,
      overflow: "hidden", // For blur effect
    };
  });

  const sunnyMomentsButtonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      sunnyMomentsButtonSelection.value,
      [0, 1],
      [MAIN_WHEEL_COSMIC_UNSELECTED, MAIN_WHEEL_COSMIC_SELECTED],
    );
    const borderWidth = sunnyMomentsButtonSelection.value * 2; // Animate from 0 to 2

    return {
      transform: [{ scale: sunnyMomentsButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: MAIN_WHEEL_COSMIC_SELECTED,
      borderRadius: 30,
      width: 60,
      height: 60,
      overflow: "hidden", // For blur effect
    };
  });

  // Avatar ring gradient overlay (fades in when selected, muted)
  const lessonsGradientOverlayStyle = useAnimatedStyle(() => ({
    opacity: lessonsButtonSelection.value * 0.4,
  }));
  const sunnyMomentsGradientOverlayStyle = useAnimatedStyle(() => ({
    opacity: sunnyMomentsButtonSelection.value * 0.4,
  }));
  const hardTruthsGradientOverlayStyle = useAnimatedStyle(() => ({
    opacity: hardTruthsButtonSelection.value * 0.4,
  }));

  // Gentle continuous rotation hint animation (suppressed during initial spin hint)
  useEffect(() => {
    // Only run when the Classic overview wheel is actually visible.
    if (!shouldRunClassicOverviewAnimations) {
      return;
    }

    // Start hint animation when wheel is idle (not spinning, not dragging)
    // Skip when initial "spin hint" is shown (wiggle + pointer) — that uses hintRotation for wiggle
    const checkIdleState = () => {
      const inSpinHintPhase =
        appUsabilityHints &&
        showMomentTypeSelector &&
        !momentTypeSelectorDismissed;
      const isIdle = !isWheelSpinning.value && !isDragging.value;

      if (inSpinHintPhase) {
        // Don't start slow rotation — spin hint wiggle effect owns hintRotation
        return;
      }

      if (isIdle && !isHintAnimating.value) {
        // Start gentle continuous rotation hint (counter-clockwise)
        // Rotate 2π radians (full circle counter-clockwise) over 120 seconds = ~0.75 degrees per second
        isHintAnimating.value = true;
        hintRotation.value = withRepeat(
          withTiming(2 * Math.PI, {
            duration: 120000, // 120 seconds for one full rotation
            easing: Easing.linear,
          }),
          -1, // Infinite repeat
          false, // Don't reverse, just keep going
        );
      } else if (!isIdle && isHintAnimating.value) {
        // Stop hint animation when user interacts
        isHintAnimating.value = false;
        // Cancel the animation by setting to current value
        hintRotation.value = hintRotation.value;
      }
    };

    // Check idle state periodically
    const interval = setInterval(checkIdleState, 100); // Check every 100ms

    return () => {
      clearInterval(interval);
      // Cancel the infinite rotation animation on cleanup
      cancelAnimation(hintRotation);
      isHintAnimating.value = false;
    };
  }, [
    shouldRunClassicOverviewAnimations,
    appUsabilityHints,
    showMomentTypeSelector,
    momentTypeSelectorDismissed,
  ]);

  // Initial spin hint: arc-following finger + matching wheel rotation when moment type selector first appears
  useEffect(() => {
    if (
      !appUsabilityHints ||
      !showMomentTypeSelector ||
      momentTypeSelectorDismissed ||
      !shouldRunClassicOverviewAnimations
    ) {
      cancelAnimation(hintRotation);
      hintRotation.value = withTiming(0, { duration: 200 });
      spinHintPointerOpacity.value = withTiming(0, { duration: 200 });
      spinHintArcProgress.value = 0;
      return;
    }

    // Reset arc to 12 o'clock before starting
    spinHintArcProgress.value = 0;

    // Finger: appear quickly, then fade out as it finishes the arc
    // Total: 150ms fade-in, 2400ms drag forward, 900ms snap back = ~3450ms
    spinHintPointerOpacity.value = withSequence(
      withTiming(0.9, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 3300, easing: Easing.linear }, (finished) => {
        "worklet";
        if (finished) runOnJS(setMomentTypeSelectorDismissed)(true);
      }),
    );

    // Arc progress: drag counter-clockwise 90°, then snap back to 12 o'clock
    spinHintArcProgress.value = withSequence(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );

    // Wheel rotates clockwise 90° in sync with the finger, then eases back
    hintRotation.value = withSequence(
      withTiming(Math.PI / 2, {
        duration: 2400,
        easing: Easing.inOut(Easing.ease),
      }),
      withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) }),
    );

    return () => {
      cancelAnimation(hintRotation);
      cancelAnimation(spinHintArcProgress);
      cancelAnimation(spinHintPointerOpacity);
    };
  }, [
    appUsabilityHints,
    showMomentTypeSelector,
    momentTypeSelectorDismissed,
    shouldRunClassicOverviewAnimations,
  ]);

  // Wheel rotation animation with deceleration
  // Use ref to store latest callback to avoid recreating interval when callback changes
  const onWheelSpinCompleteRef = useRef(onWheelSpinComplete);
  useLayoutEffect(() => {
    onWheelSpinCompleteRef.current = onWheelSpinComplete;
  }, [onWheelSpinComplete]);

  useEffect(() => {
    // Only run wheel physics when the Classic overview wheel is actually visible.
    if (!shouldRunClassicOverviewAnimations) {
      return;
    }

    let completionTimer: NodeJS.Timeout | null = null;
    const interval = setInterval(() => {
      if (isWheelSpinning.value && Math.abs(wheelVelocity.value) > 0.005) {
        // Apply deceleration with exponential decay for natural slowdown
        // Use constant friction for smooth, predictable deceleration
        const friction = 0.97; // Consistent friction factor (lower = faster slowdown)
        wheelVelocity.value *= friction;
        wheelRotation.value += wheelVelocity.value;
      } else if (
        isWheelSpinning.value &&
        Math.abs(wheelVelocity.value) <= 0.005
      ) {
        // Spin complete - ensure it's fully stopped
        isWheelSpinning.value = false;
        wheelVelocity.value = 0;
        // Small delay to ensure visual stop before showing lesson
        completionTimer = setTimeout(() => {
          onWheelSpinCompleteRef.current();
          completionTimer = null;
        }, 100) as unknown as NodeJS.Timeout;
      }
    }, 16); // ~60fps

    return () => {
      clearInterval(interval);
      if (completionTimer) clearTimeout(completionTimer);
    };
  }, [shouldRunClassicOverviewAnimations]); // Shared values/callback don't need to trigger re-creation

  // Pan gesture handling for wheel rotation
  const lastAngle = useSharedValue(0);
  const startAngle = useSharedValue(0);
  const smoothedDragDelta = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false, // Don't capture immediately - let children handle taps
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Always allow wheel drag in classic view; only capture real drags (not taps).
          const shouldCapture =
            Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
          if (shouldCapture) {
            console.warn("[WheelPan] onMoveShouldSetPanResponder -> true", {
              dx: Number(gestureState.dx.toFixed(2)),
              dy: Number(gestureState.dy.toFixed(2)),
            });
          }
          return shouldCapture;
        },
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
          // Capture at parent level so child Pressables don't block wheel drag.
          const shouldCapture =
            Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
          if (shouldCapture) {
            console.warn(
              "[WheelPan] onMoveShouldSetPanResponderCapture -> true",
              {
              dx: Number(gestureState.dx.toFixed(2)),
              dy: Number(gestureState.dy.toFixed(2)),
              },
            );
          }
          return shouldCapture;
        },
        onPanResponderGrant: (evt) => {
          console.warn("[WheelPan] onPanResponderGrant");
          // Calculate initial angle from center
          const touch = evt.nativeEvent;
          const dx = touch.pageX - sphereCircle.centerX;
          const dy = touch.pageY - sphereCircle.centerY;
          startAngle.value = Math.atan2(dy, dx);
          lastAngle.value = startAngle.value;
          isWheelSpinning.value = false;
          wheelVelocity.value = 0;
          isDragging.value = true;
          smoothedDragDelta.value = 0;
          // Stop hint animation when user starts dragging
          if (isHintAnimating.value) {
            isHintAnimating.value = false;
            hintRotation.value = hintRotation.value; // Cancel animation
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          console.warn("[WheelPan] onPanResponderMove", {
            dx: Number(gestureState.dx.toFixed(2)),
            dy: Number(gestureState.dy.toFixed(2)),
          });
          const touch = evt.nativeEvent;
          const dx = touch.pageX - sphereCircle.centerX;
          const dy = touch.pageY - sphereCircle.centerY;
          const currentAngle = Math.atan2(dy, dx);

          // Calculate angle delta
          let deltaAngle = currentAngle - lastAngle.value;

          // Handle angle wrapping (when crossing -π/π boundary)
          if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
          if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

          // Clamp extreme per-frame deltas and low-pass filter for smoother, more static drag feel.
          const maxDeltaPerFrame = 0.2;
          const clampedDelta = Math.max(
            -maxDeltaPerFrame,
            Math.min(maxDeltaPerFrame, deltaAngle),
          );
          const smoothingFactor = 0.35;
          const filteredDelta =
            smoothedDragDelta.value * (1 - smoothingFactor) +
            clampedDelta * smoothingFactor;

          wheelRotation.value += filteredDelta;
          wheelVelocity.value = filteredDelta; // Track filtered velocity for momentum
          smoothedDragDelta.value = filteredDelta;
          lastAngle.value = currentAngle;
        },
        onPanResponderRelease: () => {
          console.warn("[WheelPan] onPanResponderRelease", {
            wheelVelocity: Number(wheelVelocity.value.toFixed(4)),
          });
          isDragging.value = false;
          smoothedDragDelta.value = 0;
          let velocity = wheelVelocity.value;
          // Minimum velocity for tiny drags — ensures satisfying spin (matches entity wheel)
          const MIN_VELOCITY = 0.02;
          if (Math.abs(velocity) > 0.001 && Math.abs(velocity) < MIN_VELOCITY) {
            velocity = (velocity >= 0 ? 1 : -1) * MIN_VELOCITY;
          }
          // Immediate continuation: keep wheel moving at release velocity while async runs (matches entity wheel)
          const continuationMultiplier = 2.0;
          if (Math.abs(velocity) > 0.001) {
            isWheelSpinning.value = true;
            wheelVelocity.value = velocity * continuationMultiplier;
          }
          // Start momentum spin — even smallest drag gets minimum boost; always use lesson exam (rate limit check)
          if (Math.abs(velocity) > 0.001) {
            // Block spin if AI is not enabled — show consent modal first
            if (!aiConsent.isEnabled) {
              setAiInsightsConsentVisible(true);
              return;
            }
            // Prevent double fire: if release handler runs twice, only one consume runs (avoids free spin + paywall)
            if (mainWheelReleaseInProgressRef.current) return;
            mainWheelReleaseInProgressRef.current = true;
            const startSpin = () => {
              setSelectedMomentType("lessons"); // Force lesson mode when spin starts (ignore current filter)
              isWheelSpinning.value = true;
              const velocityMagnitude = Math.abs(wheelVelocity.value);
              const momentumMultiplier =
                2.0 + Math.min(velocityMagnitude * 25, 2.0);
              wheelVelocity.value *= momentumMultiplier;
              const { logWheelMainSpin } = require("@/utils/analytics");
              logWheelMainSpin().catch(() => {});
              // Kick off question fetch immediately so it's ready when the wheel stops
              pendingWheelQuestionRef.current = pickAndConsumePreloadedQuestion(
                {
                  type: "main",
                  onRefetchMain: () =>
                    preloadMainWheelQuestions({
                      memories: idealizedMemories,
                      language: appLang,
                      hasAIEntitlement,
                      appendOnly: true,
                    }),
                },
              );
            };
            // Always check rate limit (lesson exam flow)
            const velocityAtRelease = wheelVelocity.value;
            void (async () => {
              try {
                const consumed =
                  await consumeUniverseExamIfAvailable(hasAIEntitlement);
                if (!consumed) {
                  const purchased = await showPaywallForAIAccess();
                  if (!purchased) {
                    isWheelSpinning.value = false;
                    wheelVelocity.value = 0;
                    return;
                  }
                }
                const remaining =
                  await getRemainingUniverseExams(hasAIEntitlement);
                setMainWheelExamTriesRemaining(remaining);
                wheelVelocity.value = velocityAtRelease;
                startSpin();
              } finally {
                mainWheelReleaseInProgressRef.current = false;
              }
            })();
          }
        },
      }),
    [
      sphereCircle.centerX,
      sphereCircle.centerY,
      wheelRotation,
      wheelVelocity,
      isWheelSpinning,
      lastAngle,
      startAngle,
      smoothedDragDelta,
      isDragging,
      showMomentTypeSelector,
      hasAIEntitlement,
      aiConsent.isEnabled,
      setAiInsightsConsentVisible,
    ],
  );

  // Sort profiles: current partners (ongoing) first, then by relationship start year (earliest first)
  const sortedProfiles = React.useMemo(() => {
    return [...profiles].sort((a, b) => {
      // First, separate ongoing (current) vs ended relationships - ongoing on top
      const aIsOngoing = a.relationshipEndDate === null;
      const bIsOngoing = b.relationshipEndDate === null;

      if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
      if (!aIsOngoing && bIsOngoing) return 1; // b is ongoing, a is not - b comes first

      // Both are ongoing or both are ended - sort by end date year (most recent first)
      // For ongoing, use start date year
      const aEndYear = aIsOngoing
        ? a.relationshipStartDate
          ? new Date(a.relationshipStartDate).getFullYear()
          : 0
        : a.relationshipEndDate
          ? new Date(a.relationshipEndDate).getFullYear()
          : 0;
      const bEndYear = bIsOngoing
        ? b.relationshipStartDate
          ? new Date(b.relationshipStartDate).getFullYear()
          : 0
        : b.relationshipEndDate
          ? new Date(b.relationshipEndDate).getFullYear()
          : 0;

      // Sort by year descending (most recent first)
      if (aEndYear !== bEndYear) {
        return bEndYear - aEndYear; // More recent year comes first
      }

      // If same year, sort by full end date (most recent first)
      const aEndDate = aIsOngoing
        ? a.relationshipStartDate
          ? new Date(a.relationshipStartDate).getTime()
          : 0
        : a.relationshipEndDate
          ? new Date(a.relationshipEndDate).getTime()
          : 0;
      const bEndDate = bIsOngoing
        ? b.relationshipStartDate
          ? new Date(b.relationshipStartDate).getTime()
          : 0
        : b.relationshipEndDate
          ? new Date(b.relationshipEndDate).getTime()
          : 0;
      return bEndDate - aEndDate; // More recent date comes first
    });
  }, [profiles]);

  // Sort jobs: current jobs (ongoing) first, then by end year
  const sortedJobs = React.useMemo(() => {
    return [...jobs].sort((a, b) => {
      // First, separate ongoing (current) vs ended jobs - ongoing on top
      const aIsOngoing = a.endDate === null;
      const bIsOngoing = b.endDate === null;

      if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
      if (!aIsOngoing && bIsOngoing) return 1; // b is ongoing, a is not - b comes first

      // Both are ongoing or both are ended - sort by end date year (most recent first)
      const aEndYear = aIsOngoing
        ? a.startDate
          ? new Date(a.startDate).getFullYear()
          : 0
        : a.endDate
          ? new Date(a.endDate).getFullYear()
          : 0;
      const bEndYear = bIsOngoing
        ? b.startDate
          ? new Date(b.startDate).getFullYear()
          : 0
        : b.endDate
          ? new Date(b.endDate).getFullYear()
          : 0;

      // Sort by year descending (most recent first)
      if (aEndYear !== bEndYear) {
        return bEndYear - aEndYear; // More recent year comes first
      }

      // If same year, sort by full end date (most recent first)
      const aEndDate = aIsOngoing
        ? a.startDate
          ? new Date(a.startDate).getTime()
          : 0
        : a.endDate
          ? new Date(a.endDate).getTime()
          : 0;
      const bEndDate = bIsOngoing
        ? b.startDate
          ? new Date(b.startDate).getTime()
          : 0
        : b.endDate
          ? new Date(b.endDate).getTime()
          : 0;
      return bEndDate - aEndDate; // More recent date comes first
    });
  }, [jobs]);

  // Get the section key for a profile - defined before yearSections so it can be used there
  const getProfileSectionKey = React.useCallback(
    (profile: any): string | null => {
      if (
        profile.relationshipEndDate === null ||
        profile.relationshipEndDate === undefined
      ) {
        return "ongoing";
      } else {
        const year = new Date(profile.relationshipEndDate).getFullYear();
        return year.toString();
      }
    },
    [],
  );

  // Calculate year-based sections for each profile
  // Ongoing partners get their own section at the top, then sorted by end year
  const yearSections = React.useMemo(() => {
    const sections = new Map<
      string,
      { year: number | string; top: number; bottom: number; height: number }
    >();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;

    // Separate ongoing and ended relationships
    const ongoingProfiles = sortedProfiles.filter(
      (p) => p.relationshipEndDate === null,
    );
    const endedProfiles = sortedProfiles.filter(
      (p) => p.relationshipEndDate !== null,
    );

    // Get all unique years from ended profiles
    const years = new Set<number>();
    endedProfiles.forEach((profile) => {
      if (profile.relationshipEndDate) {
        const endYear = new Date(profile.relationshipEndDate).getFullYear();
        years.add(endYear);
      }
    });

    // Sort years descending (most recent first)
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // Get all section keys that profiles might use (including from visibleProfiles to catch any that might not be in sortedProfiles yet)
    const allProfileSectionKeys = new Set<string>();
    sortedProfiles.forEach((profile) => {
      const sectionKey = getProfileSectionKey(profile);
      if (sectionKey) {
        allProfileSectionKeys.add(sectionKey);
      }
    });

    // Calculate number of sections (ongoing + years)
    const hasOngoing =
      allProfileSectionKeys.has("ongoing") || ongoingProfiles.length > 0;
    const numSections = (hasOngoing ? 1 : 0) + sortedYears.length;
    const sectionHeight =
      numSections > 0 ? availableHeight / numSections : availableHeight;

    let currentTop = topPadding;

    // Create "Ongoing" section at the top if there are ongoing partners or if any profile uses 'ongoing' key
    if (hasOngoing) {
      sections.set("ongoing", {
        year: "Ongoing",
        top: currentTop,
        bottom: currentTop + sectionHeight,
        height: sectionHeight,
      });
      currentTop += sectionHeight;
    }

    // Create sections for each year
    sortedYears.forEach((year) => {
      sections.set(year.toString(), {
        year,
        top: currentTop,
        bottom: currentTop + sectionHeight,
        height: sectionHeight,
      });
      currentTop += sectionHeight;
    });

    return sections;
  }, [sortedProfiles, getProfileSectionKey]);

  // Get the section key for a job - defined before jobYearSections so it can be used there
  const getJobSectionKey = React.useCallback((job: any): string | null => {
    // Check if job is ongoing (no end date)
    if (
      job.endDate === null ||
      job.endDate === undefined ||
      job.endDate === ""
    ) {
      return "ongoing";
    } else {
      try {
        const endDate = new Date(job.endDate);
        if (isNaN(endDate.getTime())) {
          // Invalid date, try to use start date as fallback
          if (job.startDate) {
            const startDate = new Date(job.startDate);
            if (!isNaN(startDate.getTime())) {
              return startDate.getFullYear().toString();
            }
          }
          return "ongoing"; // Fallback to ongoing if date is invalid
        }
        const year = endDate.getFullYear();
        return year.toString();
      } catch {
        return "ongoing"; // Fallback to ongoing on error
      }
    }
  }, []);

  // Calculate year-based sections for jobs (similar to profiles)
  const jobYearSections = React.useMemo(() => {
    const sections = new Map<
      string,
      { year: number | string; top: number; bottom: number; height: number }
    >();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;

    // Get all unique section keys from all jobs to ensure we create sections for every job
    const allSectionKeys = new Set<string>();
    sortedJobs.forEach((job) => {
      const sectionKey = getJobSectionKey(job);
      if (sectionKey) {
        allSectionKeys.add(sectionKey);
      }
    });

    // Extract all year section keys (excluding 'ongoing')
    const yearSectionKeys = Array.from(allSectionKeys).filter(
      (key) => key !== "ongoing",
    );
    const yearNumbers = yearSectionKeys
      .map((key) => {
        const year = parseInt(key, 10);
        return isNaN(year) ? null : year;
      })
      .filter((year): year is number => year !== null);

    // Sort years descending (most recent first)
    const sortedYears = yearNumbers.sort((a, b) => b - a);

    // Calculate number of sections (ongoing + years, but at least 1)
    const hasOngoingSection = allSectionKeys.has("ongoing");
    const numSections = Math.max(
      1,
      (hasOngoingSection ? 1 : 0) + sortedYears.length,
    );
    const sectionHeight =
      numSections > 0 ? availableHeight / numSections : availableHeight;

    let currentTop = topPadding;

    // Create "Ongoing" section at the top if there are ongoing jobs (most recent first)
    if (hasOngoingSection) {
      sections.set("ongoing", {
        year: "Current",
        top: currentTop,
        bottom: currentTop + sectionHeight,
        height: sectionHeight,
      });
      currentTop += sectionHeight;
    }

    // Create sections for each year (most recent first) - ensure all section keys have sections
    sortedYears.forEach((year) => {
      const yearKey = year.toString();
      if (allSectionKeys.has(yearKey)) {
        sections.set(yearKey, {
          year,
          top: currentTop,
          bottom: currentTop + sectionHeight,
          height: sectionHeight,
        });
        currentTop += sectionHeight;
      }
    });

    // If no sections were created, create a default one
    if (sections.size === 0) {
      sections.set("default", {
        year: "All",
        top: topPadding,
        bottom: topPadding + availableHeight,
        height: availableHeight,
      });
    }

    return sections;
  }, [sortedJobs, getJobSectionKey]);

  // Get the year section for a job
  const getJobYearSection = React.useCallback(
    (job: any) => {
      const sectionKey = getJobSectionKey(job);
      if (!sectionKey) return undefined;
      return jobYearSections.get(sectionKey);
    },
    [jobYearSections, getJobSectionKey],
  );

  // Get the year section for a profile
  const getProfileYearSection = React.useCallback(
    (profile: any) => {
      const sectionKey = getProfileSectionKey(profile);
      if (!sectionKey) return undefined;
      return yearSections.get(sectionKey);
    },
    [yearSections, getProfileSectionKey],
  );

  // Calculate sections for family members (single section covering all, no year grouping)
  const familyYearSections = React.useMemo(() => {
    const sections = new Map<
      string,
      { year: number | string; top: number; bottom: number; height: number }
    >();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;

    // Create a single section for all family members
    if (familyMembers.length > 0) {
      sections.set("all", {
        year: "Family",
        top: topPadding,
        bottom: topPadding + availableHeight,
        height: availableHeight,
      });
    }

    return sections;
  }, [familyMembers]);

  // Calculate sections for friends (single section covering all, no year grouping)
  const friendsYearSections = React.useMemo(() => {
    const sections = new Map<
      string,
      { year: number | string; top: number; bottom: number; height: number }
    >();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;

    // Create a single section for all friends
    if (friends.length > 0) {
      sections.set("all", {
        year: "Friends",
        top: topPadding,
        bottom: topPadding + availableHeight,
        height: availableHeight,
      });
    }

    return sections;
  }, [friends]);

  // Calculate sections for hobbies (single section covering all, no year grouping)
  const hobbiesYearSections = React.useMemo(() => {
    const sections = new Map<
      string,
      { year: number | string; top: number; bottom: number; height: number }
    >();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;

    // Create a single section for all hobbies
    if (hobbies.length > 0) {
      sections.set("all", {
        year: "Hobbies",
        top: topPadding,
        bottom: topPadding + availableHeight,
        height: availableHeight,
      });
    }

    return sections;
  }, [hobbies]);

  // Check if splash is still visible - delay heavy animations until splash is done
  // Note: useSplash() already called above for walkthrough - reuse those values
  const [animationsReady, setAnimationsReady] = useState(false);

  React.useEffect(() => {
    // Only initialize heavy animations after splash is hidden
    if (!isSplashVisible) {
      // Small delay to ensure splash is fully hidden
      const timer = setTimeout(() => {
        setAnimationsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSplashVisible]);

  // Track positions for each avatar (for dragging)
  const [avatarPositionsState, setAvatarPositionsState] = React.useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // Storage keys for entity positions
  const AVATAR_POSITIONS_KEY = "@sferas:avatar_positions";
  const FAMILY_POSITIONS_KEY = "@sferas:family_positions";
  const FRIEND_POSITIONS_KEY = "@sferas:friend_positions";
  const HOBBY_POSITIONS_KEY = "@sferas:hobby_positions";

  // Load saved avatar positions from storage
  const [savedPositions, setSavedPositions] = React.useState<Map<
    string,
    { x: number; y: number }
  > | null>(null);
  const [positionsLoaded, setPositionsLoaded] = React.useState(false);

  React.useEffect(() => {
    const loadSavedPositions = async () => {
      try {
        const saved = await AsyncStorage.getItem(AVATAR_POSITIONS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Record<
            string,
            { x: number; y: number }
          >;
          const positionsMap = new Map<string, { x: number; y: number }>();
          Object.entries(parsed).forEach(([profileId, position]) => {
            positionsMap.set(profileId, position);
          });
          setSavedPositions(positionsMap);
        }
      } catch {
        // Error loading avatar positions
      } finally {
        setPositionsLoaded(true);
      }
    };
    loadSavedPositions();
  }, []);

  // Calculate initial positions for avatars within their year sections
  // Helper function to generate consistent random offset from entity ID
  const getRandomOffset = (id: string, range: number) => {
    // Simple hash function to convert ID to a number
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Normalize to -1 to 1 range
    const normalized = (hash % 1000) / 1000;
    return normalized * range;
  };

  const initialAvatarPositions = useMemo(() => {
    if (!positionsLoaded) return []; // Wait for saved positions to load

    const positions: { x: number; y: number }[] = [];
    const exZoneRadius = 120; // Total radius from avatar center to furthest floating element edge (unfocused)
    const centerX = SCREEN_WIDTH / 2;

    sortedProfiles.forEach((profile) => {
      // Check if we have a saved position for this profile
      if (savedPositions?.has(profile.id)) {
        const saved = savedPositions.get(profile.id)!;
        const yearSection = getProfileYearSection(profile);

        // Validate saved position is still within its year section
        if (yearSection) {
          const topEdge = saved.y - exZoneRadius;
          const rightEdge = saved.x + exZoneRadius;
          const bottomEdge = saved.y + exZoneRadius;
          const leftEdge = saved.x - exZoneRadius;

          if (
            topEdge >= yearSection.top &&
            rightEdge <= SCREEN_WIDTH &&
            bottomEdge <= yearSection.bottom &&
            leftEdge >= 0
          ) {
            positions.push(saved);
            return;
          }
        }
      }

      // Place avatar in center of its year section
      const yearSection = getProfileYearSection(profile);
      if (yearSection) {
        // Get profiles in the same year section
        const sectionKey =
          profile.relationshipEndDate === null ||
          profile.relationshipEndDate === undefined
            ? "ongoing"
            : new Date(profile.relationshipEndDate).getFullYear().toString();
        const profilesInSection = sortedProfiles.filter((p) => {
          if (sectionKey === "ongoing") {
            return p.relationshipEndDate === null;
          } else {
            return (
              p.relationshipEndDate &&
              new Date(p.relationshipEndDate).getFullYear().toString() ===
                sectionKey
            );
          }
        });
        const indexInSection = profilesInSection.findIndex(
          (p) => p.id === profile.id,
        );

        // Distribute avatars evenly within the year section, centered both horizontally and vertically
        const sectionCenterY = yearSection.top + yearSection.height / 2;
        const spacing =
          profilesInSection.length > 1
            ? Math.min(yearSection.height * 0.6, 200)
            : 0;
        const startY =
          sectionCenterY - ((profilesInSection.length - 1) * spacing) / 2;

        // For profiles in year sections, center them horizontally (no random X offset)
        // Only add small Y offset for multiple profiles to avoid perfect vertical alignment
        const centerOffsetX = 0; // Always center horizontally in year sections
        // For single profiles, place them exactly at center (no Y offset)
        // For multiple profiles, add small random offset to avoid perfect alignment
        const centerOffsetY =
          profilesInSection.length === 1
            ? 0 // Exact center for single profiles
            : getRandomOffset(profile.id + "_y", yearSection.height * 0.1); // ±5% of section height for multiple profiles

        let position = {
          x: centerX + centerOffsetX, // Always use screen center for X
          y: startY + indexInSection * spacing + centerOffsetY,
        };

        // Clamp to year section bounds and ensure avatar stays in central area
        const avatarHalfSize = 40;
        const minMargin = 20; // Minimum margin from section edges
        const centerAreaMinX = SCREEN_WIDTH * 0.2; // 20% from left
        const centerAreaMaxX = SCREEN_WIDTH * 0.8; // 80% from left
        position.x = Math.max(
          Math.max(avatarHalfSize + minMargin, centerAreaMinX),
          Math.min(
            SCREEN_WIDTH - avatarHalfSize - minMargin,
            Math.min(centerAreaMaxX, position.x),
          ),
        );
        position.y = Math.max(
          yearSection.top + avatarHalfSize + minMargin,
          Math.min(yearSection.bottom - avatarHalfSize - minMargin, position.y),
        );

        positions.push(position);
      } else {
        // Fallback: center of screen
        positions.push({ x: centerX, y: SCREEN_HEIGHT / 2 });
      }
    });

    return positions;
  }, [sortedProfiles, savedPositions, positionsLoaded, getProfileYearSection]);

  // Initialize positions state from calculated positions (wait for saved positions to load)
  React.useEffect(() => {
    if (
      positionsLoaded &&
      initialAvatarPositions.length > 0 &&
      avatarPositionsState.size === 0
    ) {
      const newPositions = new Map<string, { x: number; y: number }>();
      profiles.forEach((profile, index) => {
        newPositions.set(profile.id, initialAvatarPositions[index]);
      });
      setAvatarPositionsState(newPositions);
    }
  }, [
    initialAvatarPositions,
    profiles,
    avatarPositionsState.size,
    positionsLoaded,
  ]);

  // Memoize all avatar positions to avoid recalculating on every render
  const avatarPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    sortedProfiles.forEach((profile, index) => {
      const yearSection = getProfileYearSection(profile);

      // Try to get position from state first
      const statePosition = avatarPositionsState.get(profile.id);
      if (statePosition) {
        if (yearSection) {
          // Validate state position is within section bounds
          const avatarHalfSize = 40; // baseAvatarSize / 2
          const margin = 20;
          const minY = yearSection.top + avatarHalfSize + margin;
          const maxY = yearSection.bottom - avatarHalfSize - margin;

          if (statePosition.y >= minY && statePosition.y <= maxY) {
            positions.set(profile.id, statePosition);
            return;
          }
          // Position is outside bounds, fall through to use initial position
        } else {
          // No section, use state position as-is
          positions.set(profile.id, statePosition);
          return;
        }
      }

      // Fall back to initial position
      const initialPosition = initialAvatarPositions[index];
      if (initialPosition) {
        positions.set(profile.id, initialPosition);
        return;
      }

      // Final fallback: center of screen or section
      if (yearSection) {
        const fallbackPosition = {
          x: SCREEN_WIDTH / 2,
          y: yearSection.top + yearSection.height / 2,
        };
        positions.set(profile.id, fallbackPosition);
        return;
      }

      positions.set(profile.id, { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 });
    });
    return positions;
  }, [
    sortedProfiles,
    avatarPositionsState,
    initialAvatarPositions,
    getProfileYearSection,
  ]);

  // Get current position for a profile (from memoized map)
  const getAvatarPosition = React.useCallback(
    (profileId: string, index: number) => {
      return (
        avatarPositions.get(profileId) || {
          x: SCREEN_WIDTH / 2,
          y: SCREEN_HEIGHT / 2,
        }
      );
    },
    [avatarPositions],
  );

  // Position storage for family/friends/hobbies
  const [familyPositionsState, setFamilyPositionsState] = React.useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const [friendPositionsState, setFriendPositionsState] = React.useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const [hobbyPositionsState, setHobbyPositionsState] = React.useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // Helper function to clamp position to ensure avatar is fully visible in viewport
  // Accounts for safe area insets (status bar at top) and tab bar at bottom
  const clampPositionToViewport = React.useCallback(
    (
      position: { x: number; y: number },
      avatarSize: number,
      entityId?: string,
    ): { x: number; y: number } => {
      const padding = avatarSize / 2;
      // Account for safe area insets at top and tab bar at bottom
      // Tab bar height: Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale)
      const tabBarHeight =
        Math.round(78 * fontScale) +
        Math.max(12, insets.bottom + 12 - 20 * fontScale);
      const visibleAreaTop = insets.top;
      const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area

      const minX = padding;
      const maxX = SCREEN_WIDTH - padding;
      const minY = visibleAreaTop + padding; // Top of visible area + avatar radius
      const maxY = visibleAreaBottom - padding; // Bottom of visible area - avatar radius

      const clamped = {
        x: Math.max(minX, Math.min(maxX, position.x)),
        y: Math.max(minY, Math.min(maxY, position.y)),
      };

      if (entityId && (clamped.x !== position.x || clamped.y !== position.y)) {
        // Position clamped to viewport
      }

      return clamped;
    },
    [insets.top, insets.bottom, fontScale],
  );

  // Update position for a family member and save to storage
  const updateFamilyMemberPosition = React.useCallback(
    async (memberId: string, newPosition: { x: number; y: number }) => {
      // Clamp position to ensure avatar is fully visible (use base avatar size for clamping)
      const baseAvatarSize = isTablet ? 120 : 100;
      const clampedPosition = clampPositionToViewport(
        newPosition,
        baseAvatarSize,
        `FamilyMember-${memberId}`,
      );

      setFamilyPositionsState((prev) => {
        const next = new Map(prev);
        next.set(memberId, clampedPosition);

        // Save to AsyncStorage asynchronously
        const positionsObj: Record<string, { x: number; y: number }> = {};
        next.forEach((pos, id) => {
          positionsObj[id] = pos;
        });
        AsyncStorage.setItem(
          FAMILY_POSITIONS_KEY,
          JSON.stringify(positionsObj),
        ).catch((error) => {
          logError("HomeScreen:SaveFamilyPositions", error);
        });

        return next;
      });
    },
    [isTablet, clampPositionToViewport],
  );

  // Update position for a friend and save to storage
  const updateFriendPosition = React.useCallback(
    async (friendId: string, newPosition: { x: number; y: number }) => {
      // Clamp position to ensure avatar is fully visible (use base avatar size for clamping)
      const baseAvatarSize = isTablet ? 120 : 100;
      const clampedPosition = clampPositionToViewport(
        newPosition,
        baseAvatarSize,
        `Friend-${friendId}`,
      );

      setFriendPositionsState((prev) => {
        const next = new Map(prev);
        next.set(friendId, clampedPosition);

        // Save to AsyncStorage asynchronously
        const positionsObj: Record<string, { x: number; y: number }> = {};
        next.forEach((pos, id) => {
          positionsObj[id] = pos;
        });
        AsyncStorage.setItem(
          FRIEND_POSITIONS_KEY,
          JSON.stringify(positionsObj),
        ).catch((error) => {
          logError("HomeScreen:SaveFriendPositions", error);
        });

        return next;
      });
    },
    [isTablet, clampPositionToViewport],
  );

  // Update position for a hobby and save to storage
  const updateHobbyPosition = React.useCallback(
    async (hobbyId: string, newPosition: { x: number; y: number }) => {
      // Clamp position to ensure avatar is fully visible (use base avatar size for clamping)
      const baseAvatarSize = isTablet ? 120 : 100;
      const clampedPosition = clampPositionToViewport(
        newPosition,
        baseAvatarSize,
        `Hobby-${hobbyId}`,
      );

      setHobbyPositionsState((prev) => {
        const next = new Map(prev);
        next.set(hobbyId, clampedPosition);

        // Save to AsyncStorage asynchronously
        const positionsObj: Record<string, { x: number; y: number }> = {};
        next.forEach((pos, id) => {
          positionsObj[id] = pos;
        });
        AsyncStorage.setItem(
          HOBBY_POSITIONS_KEY,
          JSON.stringify(positionsObj),
        ).catch((error) => {
          logError("HomeScreen:SaveHobbyPositions", error);
        });

        return next;
      });
    },
    [isTablet, clampPositionToViewport],
  );

  // No need for minHeight calculation since we're fitting within viewport
  const minHeight = SCREEN_HEIGHT;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: "transparent", // Transparent so gradient from TabScreenContainer shows through
        },
        content: {
          width: SCREEN_WIDTH,
          minHeight,
          position: "relative",
        },
      }),
    [colors.background, minHeight],
  );

  // Shared values to track focused avatar positions for SparkledDots
  const focusedFamilyMemberPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedFamilyMemberPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 80);
  const focusedFriendPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedFriendPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 80);
  const focusedHobbyPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedHobbyPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 80);

  // Track previous focused profile to handle shrink animation
  const previousFocusedIdRef = useRef<string | null>(null);
  // Track previous focused job to handle shrink animation
  const previousFocusedJobIdRef = useRef<string | null>(null);
  // Track previous focused family member to handle shrink animation
  const previousFocusedFamilyMemberIdRef = useRef<string | null>(null);
  // Track previous focused friend to handle shrink animation
  const previousFocusedFriendIdRef = useRef<string | null>(null);
  // Track previous focused hobby to handle shrink animation
  const previousFocusedHobbyIdRef = useRef<string | null>(null);
  // Track if animations are complete - used to skip rendering unfocused partners
  const [, setAnimationsComplete] = useState(false);

  // Update previous focused ID when focus changes
  React.useEffect(() => {
    if (focusedProfileId) {
      // When a profile is focused, remember it
      previousFocusedIdRef.current = focusedProfileId;
      // Reset animations complete flag when focus changes
      setAnimationsComplete(false);
    } else {
      // When focus is cleared, keep the previous ID for a moment to handle shrink animation
      // Reset animations complete flag when unfocusing
      setAnimationsComplete(false);
      // Clear the previous focused profile ID after animation completes (matching career pattern)
      const timeoutId = setTimeout(() => {
        previousFocusedIdRef.current = null;
      }, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [focusedProfileId]);

  // Update previous focused job ID when focus changes
  React.useEffect(() => {
    if (focusedJobId) {
      // When a job is focused, remember it
      previousFocusedJobIdRef.current = focusedJobId;
      // Reset animations complete flag when focus changes
      setAnimationsComplete(false);
    } else {
      // When focus is cleared, keep the previous ID for a moment to handle shrink animation
      // Reset animations complete flag when unfocusing
      setAnimationsComplete(false);
      // Clear the previous focused job ID after animation completes (9000ms matches zoom-out duration)
      const timeoutId = setTimeout(() => {
        previousFocusedJobIdRef.current = null;
      }, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [focusedJobId]);

  // Update previous focused family member ID when focus changes
  React.useEffect(() => {
    if (focusedFamilyMemberId) {
      previousFocusedFamilyMemberIdRef.current = focusedFamilyMemberId;
      setAnimationsComplete(false);
    } else {
      setAnimationsComplete(false);
      const timeoutId = setTimeout(() => {
        previousFocusedFamilyMemberIdRef.current = null;
      }, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [focusedFamilyMemberId]);

  // Update previous focused friend ID when focus changes
  React.useEffect(() => {
    if (focusedFriendId) {
      previousFocusedFriendIdRef.current = focusedFriendId;
      setAnimationsComplete(false);
    } else {
      setAnimationsComplete(false);
      const timeoutId = setTimeout(() => {
        previousFocusedFriendIdRef.current = null;
      }, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [focusedFriendId]);

  // Update previous focused hobby ID when focus changes
  React.useEffect(() => {
    if (focusedHobbyId) {
      previousFocusedHobbyIdRef.current = focusedHobbyId;
      setAnimationsComplete(false);
    } else {
      setAnimationsComplete(false);
      const timeoutId = setTimeout(() => {
        previousFocusedHobbyIdRef.current = null;
      }, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [focusedHobbyId]);

  // Initialize position shared values when family member becomes focused
  React.useEffect(() => {
    if (focusedFamilyMemberId && selectedSphere === "family") {
      const member = familyMembers.find((m) => m.id === focusedFamilyMemberId);
      if (member) {
        const section = familyYearSections.get("all");
        if (section) {
          const totalMembers = familyMembers.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing =
            totalMembers > 1
              ? Math.max(
                  minSpacing,
                  Math.min(section.height / (totalMembers + 1), 250),
                )
              : 0;
          const index = familyMembers.findIndex(
            (m) => m.id === focusedFamilyMemberId,
          );
          const y =
            totalMembers === 1
              ? sectionCenterY
              : section.top + verticalSpacing * (index + 1);
          focusedFamilyMemberPositionX.value = SCREEN_WIDTH / 2;
          focusedFamilyMemberPositionY.value = y;
        } else {
          focusedFamilyMemberPositionX.value = SCREEN_WIDTH / 2;
          focusedFamilyMemberPositionY.value = SCREEN_HEIGHT / 2 + 60;
        }
      }
    }
  }, [
    focusedFamilyMemberId,
    selectedSphere,
    familyMembers,
    familyYearSections,
    focusedFamilyMemberPositionX,
    focusedFamilyMemberPositionY,
  ]);

  // Initialize position shared values when friend becomes focused
  React.useEffect(() => {
    if (focusedFriendId && selectedSphere === "friends") {
      const friend = friends.find((f) => f.id === focusedFriendId);
      if (friend) {
        const section = friendsYearSections.get("all");
        if (section) {
          const totalFriends = friends.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing =
            totalFriends > 1
              ? Math.max(
                  minSpacing,
                  Math.min(section.height / (totalFriends + 1), 250),
                )
              : 0;
          const index = friends.findIndex((f) => f.id === focusedFriendId);
          const y =
            totalFriends === 1
              ? sectionCenterY
              : section.top + verticalSpacing * (index + 1);
          focusedFriendPositionX.value = SCREEN_WIDTH / 2;
          focusedFriendPositionY.value = y;
        } else {
          focusedFriendPositionX.value = SCREEN_WIDTH / 2;
          focusedFriendPositionY.value = SCREEN_HEIGHT / 2 + 60;
        }
      }
    }
  }, [
    focusedFriendId,
    selectedSphere,
    friends,
    friendsYearSections,
    focusedFriendPositionX,
    focusedFriendPositionY,
  ]);

  // Initialize position shared values when hobby becomes focused
  React.useEffect(() => {
    if (focusedHobbyId && selectedSphere === "hobbies") {
      const hobby = hobbies.find((h) => h.id === focusedHobbyId);
      if (hobby) {
        const section = hobbiesYearSections.get("all");
        if (section) {
          const totalHobbies = hobbies.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing =
            totalHobbies > 1
              ? Math.max(
                  minSpacing,
                  Math.min(section.height / (totalHobbies + 1), 250),
                )
              : 0;
          const index = hobbies.findIndex((h) => h.id === focusedHobbyId);
          const y =
            totalHobbies === 1
              ? sectionCenterY
              : section.top + verticalSpacing * (index + 1);
          focusedHobbyPositionX.value = SCREEN_WIDTH / 2;
          focusedHobbyPositionY.value = y;
        } else {
          focusedHobbyPositionX.value = SCREEN_WIDTH / 2;
          focusedHobbyPositionY.value = SCREEN_HEIGHT / 2 + 60;
        }
      }
    }
  }, [
    focusedHobbyId,
    selectedSphere,
    hobbies,
    hobbiesYearSections,
    focusedHobbyPositionX,
    focusedHobbyPositionY,
  ]);

  // Handle URL parameters to set focused memory
  React.useEffect(() => {
    const focusedMemoryId = params.focusedMemoryId as string | undefined;
    const profileId = params.profileId as string | undefined;
    const jobId = params.jobId as string | undefined;
    const familyMemberId = params.familyMemberId as string | undefined;
    const friendId = params.friendId as string | undefined;
    const hobbyId = params.hobbyId as string | undefined;
    const entityId = params.entityId as string | undefined;
    const sphere = params.sphere as LifeSphere | undefined;
    const momentId = params.momentId as string | undefined;

    if (focusedMemoryId && sphere) {
      if ((profileId || entityId) && sphere === "relationships") {
        const id = profileId || entityId;
        setFocusedMemory({
          profileId: id,
          memoryId: focusedMemoryId,
          sphere,
          momentToShowId: momentId,
        });
        setFocusedProfileId(id!);
        setSelectedSphere("relationships");
      } else if ((jobId || entityId) && sphere === "career") {
        const id = jobId || entityId;
        setFocusedMemory({
          jobId: id,
          memoryId: focusedMemoryId,
          sphere,
          momentToShowId: momentId,
        });
        setFocusedJobId(id!);
        setSelectedSphere("career");
      } else if ((familyMemberId || entityId) && sphere === "family") {
        const id = familyMemberId || entityId;
        setFocusedMemory({
          familyMemberId: id,
          memoryId: focusedMemoryId,
          sphere,
          momentToShowId: momentId,
        });
        setFocusedFamilyMemberId(id!);
        setSelectedSphere("family");
      } else if ((friendId || entityId) && sphere === "friends") {
        const id = friendId || entityId;
        setFocusedMemory({
          friendId: id,
          memoryId: focusedMemoryId,
          sphere,
          momentToShowId: momentId,
        });
        setFocusedFriendId(id!);
        setSelectedSphere("friends");
      } else if ((hobbyId || entityId) && sphere === "hobbies") {
        const id = hobbyId || entityId;
        setFocusedMemory({
          hobbyId: id,
          memoryId: focusedMemoryId,
          sphere,
          momentToShowId: momentId,
        });
        setFocusedHobbyId(id!);
        setSelectedSphere("hobbies");
      }
    } else if (entityId && sphere) {
      // Handle navigation to a specific entity without a focused memory
      if (sphere === "relationships") {
        setFocusedProfileId(entityId);
        setSelectedSphere("relationships");
      } else if (sphere === "career") {
        setFocusedJobId(entityId);
        setSelectedSphere("career");
      } else if (sphere === "family") {
        setFocusedFamilyMemberId(entityId);
        setSelectedSphere("family");
      } else if (sphere === "friends") {
        setFocusedFriendId(entityId);
        setSelectedSphere("friends");
      } else if (sphere === "hobbies") {
        setFocusedHobbyId(entityId);
        setSelectedSphere("hobbies");
      }
    }
  }, [
    params.focusedMemoryId,
    params.profileId,
    params.jobId,
    params.familyMemberId,
    params.friendId,
    params.hobbyId,
    params.entityId,
    params.sphere,
    params.momentId,
  ]);

  React.useEffect(() => {
    const nudgeMomentType = params.nudgeMomentType as string | undefined;
    if (nudgeMomentType !== "lesson") return;

    const text = params.nudgeMomentText as string | undefined;
    const entityId = params.nudgeEntityId as string | undefined;
    const memoryId = params.nudgeMemoryId as string | undefined;
    const sphere = params.nudgeSphere as LifeSphere | undefined;
    const momentId = params.nudgeMomentId as string | undefined;
    const nonce = params.nudgeNonce as string | undefined;

    if (!text || !entityId || !memoryId || !sphere) return;
    const key = `${nonce ?? "no-nonce"}:${momentId ?? "no-moment"}:${memoryId}`;
    if (handledLessonNudgeKeyRef.current === key) return;
    handledLessonNudgeKeyRef.current = key;

    // Lesson nudges open the focused Home "Sferas Lessons" modal, then jump to the specific lesson.
    setFocusedMemory(null);
    setFocusedProfileId(null);
    setFocusedJobId(null);
    setFocusedFamilyMemberId(null);
    setFocusedFriendId(null);
    setFocusedHobbyId(null);
    setSelectedSphere(null);
    setHomeViewMode("focused");
    setNotificationLessonTarget({
      key,
      lessonId: momentId,
      memoryId,
      entityId,
      sphere,
      text,
    });
  }, [
    params.nudgeMomentType,
    params.nudgeMomentText,
    params.nudgeMomentId,
    params.nudgeNonce,
    params.nudgeEntityId,
    params.nudgeMemoryId,
    params.nudgeSphere,
  ]);

  // Ensure entity is focused when memory is focused (for state consistency after tab switches)
  // CRITICAL: Only sync if the memory's sphere matches the selected sphere
  React.useEffect(() => {
    if (focusedMemory && focusedMemory.sphere === selectedSphere) {
      if (focusedMemory.profileId && selectedSphere === "relationships") {
        // Ensure profile is focused when its memory is focused
        if (!focusedProfileId || focusedProfileId !== focusedMemory.profileId) {
          setFocusedProfileId(focusedMemory.profileId);
        }
      } else if (focusedMemory.jobId && selectedSphere === "career") {
        // Ensure job is focused when its memory is focused
        if (!focusedJobId || focusedJobId !== focusedMemory.jobId) {
          setFocusedJobId(focusedMemory.jobId);
        }
      } else if (focusedMemory.familyMemberId && selectedSphere === "family") {
        // Ensure family member is focused when its memory is focused
        if (
          !focusedFamilyMemberId ||
          focusedFamilyMemberId !== focusedMemory.familyMemberId
        ) {
          setFocusedFamilyMemberId(focusedMemory.familyMemberId);
        }
      } else if (focusedMemory.friendId && selectedSphere === "friends") {
        // Ensure friend is focused when its memory is focused
        if (!focusedFriendId || focusedFriendId !== focusedMemory.friendId) {
          setFocusedFriendId(focusedMemory.friendId);
        }
      } else if (focusedMemory.hobbyId && selectedSphere === "hobbies") {
        // Ensure hobby is focused when its memory is focused
        if (!focusedHobbyId || focusedHobbyId !== focusedMemory.hobbyId) {
          setFocusedHobbyId(focusedMemory.hobbyId);
        }
      }
    } else if (focusedMemory && focusedMemory.sphere !== selectedSphere) {
      // If focusedMemory exists but is from a different sphere, clear it immediately
      setFocusedMemory(null);
      // Also clear any related focus states
      if (focusedMemory.profileId) {
        setFocusedProfileId(null);
      }
      if (focusedMemory.jobId) {
        setFocusedJobId(null);
      }
      if (focusedMemory.familyMemberId) {
        setFocusedFamilyMemberId(null);
      }
      // Reset animations to ensure fresh rendering
      setAnimationsComplete(false);
    }
  }, [
    focusedMemory,
    selectedSphere,
    focusedProfileId,
    focusedJobId,
    focusedFamilyMemberId,
  ]);

  // Create stable callbacks for runOnJS
  // Slide offset for non-focused memories when a memory is focused
  const memorySlideOffset = useSharedValue(0);

  React.useEffect(() => {
    if (focusedMemory) {
      memorySlideOffset.value = withSpring(SCREEN_WIDTH * 2, {
        damping: 20,
        stiffness: 100,
      });
    } else {
      memorySlideOffset.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
      });
    }
  }, [focusedMemory, memorySlideOffset]);

  // Memoize filtered profiles to avoid recalculating on every render
  // Keep all profiles in render tree for smooth animations
  // Don't filter them out - let the animation handle visibility
  const visibleProfiles = React.useMemo(() => {
    // All profiles available for focused entity render (one shown when focused)
    return sortedProfiles;
  }, [sortedProfiles]);

  // Group jobs by their year sections, preserving their index in sortedJobs
  const jobsBySection = React.useMemo(() => {
    const grouped = new Map<string, { job: any; index: number }[]>();

    sortedJobs.forEach((job, indexInSorted) => {
      const sectionKey = getJobSectionKey(job);
      // Ensure section exists, create it if needed (shouldn't happen, but safety check)
      if (sectionKey) {
        // Add job to section anyway - we want all jobs to show
        if (!grouped.has(sectionKey)) {
          grouped.set(sectionKey, []);
        }
        grouped.get(sectionKey)!.push({ job, index: indexInSorted });
      }
    });

    // Sort jobs within each section to ensure ongoing items are first
    grouped.forEach((jobs, sectionKey) => {
      jobs.sort((a, b) => {
        // First, ensure ongoing items come first within each section
        const aIsOngoing =
          a.job.endDate === null ||
          a.job.endDate === undefined ||
          a.job.endDate === "";
        const bIsOngoing =
          b.job.endDate === null ||
          b.job.endDate === undefined ||
          b.job.endDate === "";

        if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
        if (!aIsOngoing && bIsOngoing) return 1; // b is ongoing, a is not - b comes first

        // Both are ongoing or both are ended - sort by index (which preserves sortedJobs order)
        return a.index - b.index;
      });
    });

    return grouped;
  }, [sortedJobs, getJobSectionKey, jobYearSections]);

  // Memoize focused profiles render - must be called unconditionally
  // Renders the focused profile (FloatingAvatar) when user selects one from FocusedEntitiesView.
  // Only when a profile is focused (no "wasJustFocused" avatar so back returns to orbit only).
  const focusedProfilesRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;

    if (!focusedProfileId) return null;

    return visibleProfiles.map((profile, index) => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      const isFocused = focusedProfileId === profile.id;

      if (!isFocused) return null;

      // Get the profile's year section to calculate position for the focused card
      const yearSection = getProfileYearSection(profile);
      const currentPosition = getAvatarPosition(profile.id, index);

      return (
        <FloatingAvatar
          key={profile.id}
          profile={profile}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId =
              focusedProfileId === profile.id ? null : profile.id;
            setFocusedProfileId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? "dark"}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as {
              profileId?: string;
              memoryId: string;
              sphere: LifeSphere;
            };
            if (
              mem.profileId === profile.id &&
              mem.sphere === "relationships"
            ) {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(
            entityId: string,
            memoryId: string,
            sphere: LifeSphere = "relationships",
            momentId?: string,
          ) => {
            setFocusedMemory({
              profileId: entityId,
              memoryId,
              sphere,
              momentToShowId: momentId,
            });
          }}
          yearSection={yearSection}
          onEntityWheelChange={(isActive) =>
            setIsAnyEntityWheelActive(isActive)
          }
          orbitDurationMs={orbitDurationMs}
          isScreenActive={isScreenActive}
          onShowAIConsentModal={() => setAiInsightsConsentVisible(true)}
        />
      );
    });
  }, [
    animationsReady,
    focusedProfileId,
    focusedMemory,
    visibleProfiles,
    getIdealizedMemoriesByProfileId,
    getAvatarPosition,
    getProfileYearSection,
    setFocusedProfileId,
    setFocusedMemory,
    colors,
    colorScheme,
    orbitDurationMs,
    isScreenActive,
  ]);

  // Memoize focused jobs render - must be called unconditionally
  // Renders the focused job when user selects one from FocusedEntitiesView. Only when focused (no wasJustFocused so back returns to orbit only).
  const focusedJobsRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;

    if (!focusedJobId) return null;

    return sortedJobs.map((job, index) => {
      const memories = getIdealizedMemoriesByEntityId(job.id, "career");
      const isFocused = focusedJobId === job.id;

      if (!isFocused) return null;

      const yearSection = getJobYearSection(job);
      let currentPosition: { x: number; y: number };

      if (yearSection) {
        const sectionKey = getJobSectionKey(job);
        const jobsInSection = sectionKey
          ? jobsBySection.get(sectionKey)
          : undefined;
        if (jobsInSection) {
          const jobIndexInSection = jobsInSection.findIndex(
            ({ job: j }) => j.id === job.id,
          );
          const totalJobsInSection = jobsInSection.length;
          const sectionCenterY = yearSection.top + yearSection.height / 2;
          const verticalSpacing =
            totalJobsInSection > 1
              ? Math.min(yearSection.height / (totalJobsInSection + 1), 150)
              : 0;
          currentPosition = {
            x: SCREEN_WIDTH / 2,
            y:
              totalJobsInSection === 1
                ? sectionCenterY
                : yearSection.top + verticalSpacing * (jobIndexInSection + 1),
          };
        } else {
          currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
        }
      } else {
        currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
      }

      return (
        <FloatingAvatar
          key={job.id}
          profile={job}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId = focusedJobId === job.id ? null : job.id;
            setFocusedJobId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? "dark"}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as {
              profileId?: string;
              jobId?: string;
              memoryId: string;
              sphere: LifeSphere;
            };
            if (mem.jobId === job.id && mem.sphere === "career") {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(
            entityId: string,
            memoryId: string,
            sphere: LifeSphere = "career",
            momentId?: string,
          ) => {
            setFocusedMemory({
              jobId: entityId,
              memoryId,
              sphere,
              momentToShowId: momentId,
            });
          }}
          yearSection={yearSection}
          onEntityWheelChange={(isActive) =>
            setIsAnyEntityWheelActive(isActive)
          }
          orbitDurationMs={orbitDurationMs}
          isScreenActive={isScreenActive}
          onShowAIConsentModal={() => setAiInsightsConsentVisible(true)}
        />
      );
    });
  }, [
    animationsReady,
    focusedJobId,
    focusedMemory,
    sortedJobs,
    getIdealizedMemoriesByEntityId,
    getJobYearSection,
    getJobSectionKey,
    jobsBySection,
    setFocusedJobId,
    setFocusedMemory,
    colors,
    colorScheme,
    orbitDurationMs,
    isScreenActive,
  ]);

  // Memoize focused family members render - must be called unconditionally
  // Renders the focused family member when user selects one from FocusedEntitiesView. Only when focused (no wasJustFocused so back returns to orbit only).
  const focusedFamilyMembersRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;

    if (!focusedFamilyMemberId) return null;

    return familyMembers.map((member, index) => {
      const memories = getIdealizedMemoriesByEntityId(member.id, "family");
      const isFocused = focusedFamilyMemberId === member.id;

      if (!isFocused) return null;

      const section = familyYearSections.get("all");
      const savedPosition = familyPositionsState.get(member.id);
      const currentPosition: { x: number; y: number } = savedPosition
        ? savedPosition
        : { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };

      return (
        <FloatingAvatar
          key={member.id}
          profile={member}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId =
              focusedFamilyMemberId === member.id ? null : member.id;
            setFocusedFamilyMemberId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? "dark"}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as {
              familyMemberId?: string;
              memoryId: string;
              sphere: LifeSphere;
            };
            if (mem.familyMemberId === member.id && mem.sphere === "family") {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(
            entityId: string,
            memoryId: string,
            sphere: LifeSphere = "family",
            momentId?: string,
          ) => {
            setFocusedMemory({
              familyMemberId: entityId,
              memoryId,
              sphere,
              momentToShowId: momentId,
            });
          }}
          yearSection={section}
          enableDragging={true}
          externalPositionX={focusedFamilyMemberPositionX}
          externalPositionY={focusedFamilyMemberPositionY}
          onPositionChange={(x, y) => {
            if (isFocused) {
              focusedFamilyMemberPositionX.value = x;
              focusedFamilyMemberPositionY.value = y;
            }
            updateFamilyMemberPosition(member.id, { x, y });
          }}
          onEntityWheelChange={(isActive) =>
            setIsAnyEntityWheelActive(isActive)
          }
          orbitDurationMs={orbitDurationMs}
          isScreenActive={isScreenActive}
          onShowAIConsentModal={() => setAiInsightsConsentVisible(true)}
        />
      );
    });
  }, [
    animationsReady,
    focusedFamilyMemberId,
    focusedMemory,
    familyMembers,
    getIdealizedMemoriesByEntityId,
    familyYearSections,
    familyPositionsState,
    setFocusedFamilyMemberId,
    setFocusedMemory,
    colors,
    colorScheme,
    focusedFamilyMemberPositionX,
    focusedFamilyMemberPositionY,
    updateFamilyMemberPosition,
    orbitDurationMs,
    isScreenActive,
  ]);

  // Memoize focused friends render - must be called unconditionally
  // Renders the focused friend when user selects one from FocusedEntitiesView. Only when focused (no wasJustFocused so back returns to orbit only).
  const focusedFriendsRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;

    if (!focusedFriendId) return null;

    return friends.map((friend, index) => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, "friends");
      const isFocused = focusedFriendId === friend.id;

      if (!isFocused) return null;

      const section = friendsYearSections.get("all");
      const savedPosition = friendPositionsState.get(friend.id);
      const currentPosition: { x: number; y: number } = savedPosition
        ? savedPosition
        : { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };

      return (
        <FloatingAvatar
          key={friend.id}
          profile={friend}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId =
              focusedFriendId === friend.id ? null : friend.id;
            setFocusedFriendId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? "dark"}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as {
              friendId?: string;
              memoryId: string;
              sphere: LifeSphere;
            };
            if (mem.friendId === friend.id && mem.sphere === "friends") {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(
            entityId: string,
            memoryId: string,
            sphere: LifeSphere = "friends",
            momentId?: string,
          ) => {
            setFocusedMemory({
              friendId: entityId,
              memoryId,
              sphere,
              momentToShowId: momentId,
            });
          }}
          yearSection={section}
          enableDragging={true}
          externalPositionX={focusedFriendPositionX}
          externalPositionY={focusedFriendPositionY}
          onPositionChange={(x, y) => {
            if (isFocused) {
              focusedFriendPositionX.value = x;
              focusedFriendPositionY.value = y;
            }
            updateFriendPosition(friend.id, { x, y });
          }}
          onEntityWheelChange={(isActive) =>
            setIsAnyEntityWheelActive(isActive)
          }
          orbitDurationMs={orbitDurationMs}
          isScreenActive={isScreenActive}
          onShowAIConsentModal={() => setAiInsightsConsentVisible(true)}
        />
      );
    });
  }, [
    animationsReady,
    focusedFriendId,
    focusedMemory,
    friends,
    getIdealizedMemoriesByEntityId,
    friendsYearSections,
    friendPositionsState,
    setFocusedFriendId,
    setFocusedMemory,
    colors,
    colorScheme,
    focusedFriendPositionX,
    focusedFriendPositionY,
    updateFriendPosition,
    orbitDurationMs,
    isScreenActive,
  ]);

  // Memoize focused hobbies render - must be called unconditionally
  // Renders the focused hobby when user selects one from FocusedEntitiesView. Only when focused (no wasJustFocused so back returns to orbit only).
  const focusedHobbiesRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;

    if (!focusedHobbyId) return null;

    return hobbies.map((hobby, index) => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, "hobbies");
      const isFocused = focusedHobbyId === hobby.id;

      if (!isFocused) return null;

      const section = hobbiesYearSections.get("all");
      const savedPosition = hobbyPositionsState.get(hobby.id);
      const currentPosition: { x: number; y: number } = savedPosition
        ? savedPosition
        : { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };

      return (
        <FloatingAvatar
          key={hobby.id}
          profile={hobby}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId = focusedHobbyId === hobby.id ? null : hobby.id;
            setFocusedHobbyId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? "dark"}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as {
              hobbyId?: string;
              memoryId: string;
              sphere: LifeSphere;
            };
            if (mem.hobbyId === hobby.id && mem.sphere === "hobbies") {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(
            entityId: string,
            memoryId: string,
            sphere: LifeSphere = "hobbies",
            momentId?: string,
          ) => {
            setFocusedMemory({
              hobbyId: entityId,
              memoryId,
              sphere,
              momentToShowId: momentId,
            });
          }}
          yearSection={section}
          enableDragging={true}
          externalPositionX={focusedHobbyPositionX}
          externalPositionY={focusedHobbyPositionY}
          onPositionChange={(x, y) => {
            if (isFocused) {
              focusedHobbyPositionX.value = x;
              focusedHobbyPositionY.value = y;
            }
            updateHobbyPosition(hobby.id, { x, y });
          }}
          onEntityWheelChange={(isActive) =>
            setIsAnyEntityWheelActive(isActive)
          }
          orbitDurationMs={orbitDurationMs}
          isScreenActive={isScreenActive}
          onShowAIConsentModal={() => setAiInsightsConsentVisible(true)}
        />
      );
    });
  }, [
    animationsReady,
    focusedHobbyId,
    focusedMemory,
    hobbies,
    getIdealizedMemoriesByEntityId,
    hobbiesYearSections,
    hobbyPositionsState,
    setFocusedHobbyId,
    setFocusedMemory,
    colors,
    colorScheme,
    focusedHobbyPositionX,
    focusedHobbyPositionY,
    updateHobbyPosition,
    orbitDurationMs,
    isScreenActive,
  ]);

  // Render sphere view - show all 3 spheres with memories floating around, center shows overall percentage
  // When a sphere is selected, show the entities for that sphere (like year sections for relationships)

  // Calculate avatar center coordinates for sparkled dots (always show on all screens)
  const avatarCenterX = SCREEN_WIDTH / 2;
  const avatarCenterY = SCREEN_HEIGHT / 2 + 20; // Slightly below center for main circle
  const baseAvatarSize = isTablet ? 180 : 140; // Increased from 120 to 140
  const avatarSizeForDots = baseAvatarSize; // Use base size for dots positioning

  // Keep FocusedSferaView mounted when in entity detail so back press is instant (no remount).
  const showEntityDetail = !!selectedSphere;
  // Apply default carousel index before the hub mounts so FocusedSferaView never paints index 0 then animates.
  // React re-renders synchronously when setState runs during render; ref ensures this runs once after storage load.
  if (!isLoading && !hasAppliedDefaultFocusedSphereRef.current) {
    hasAppliedDefaultFocusedSphereRef.current = true;
    if (focusedSphereIndex !== focusedDefaultIndexBySunnyMemories) {
      setFocusedSphereIndex(focusedDefaultIndexBySunnyMemories);
    }
  }
  const keepFocusedSferaMounted =
    homeViewMode === "focused" || showEntityDetail;
  // Warm-mount FocusedSferaView while splash overlay is still visible so it can
  // hydrate persisted display mode and initial focused sphere before first reveal.
  const mountFocusedSferaHub =
    !isLoading || showEntityDetail || (isSplashVisible && keepFocusedSferaMounted);
  // When splash animation is disabled, block first reveal behind a centered loader
  // until home state (data + default focused sphere + heavy animations gate) is ready.
  const startupRouteReady =
    !isLoading && hasAppliedDefaultFocusedSphereRef.current && animationsReady;
  const showStartupLoader =
    isStartupPreferenceResolved &&
    !isSplashAnimationEnabled &&
    !startupRouteReady;
  const startupLoaderOverlay = showStartupLoader ? (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        backgroundColor:
          colorScheme === "dark"
            ? "rgba(5, 10, 18, 0.42)"
            : "rgba(248, 249, 252, 0.45)",
        alignItems: "center",
        justifyContent: "center",
      }}
      pointerEvents="auto"
    >
      <ActivityIndicator
        color={colors.primary}
        size="large"
        style={{ transform: [{ scale: 1.35 }] }}
      />
    </View>
  ) : null;
  const focusedSferaLayer = keepFocusedSferaMounted ? (
    <View
      key="focused-sfera-layer"
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: showEntityDetail ? 0 : 10 },
        showEntityDetail
          ? {
              opacity: 0,
              pointerEvents: "none" as const,
              // Opacity-only hiding can leave a faint circular compositing ghost on iOS
              // (e.g. where the top-right memory-balance control was). Move fully off-screen.
              transform: [{ translateX: -SCREEN_WIDTH * 4 }],
            }
          : { pointerEvents: "auto" as const },
      ]}
      collapsable={false}
    >
      <View style={{ flex: 1 }}>
        {mountFocusedSferaHub ? (
        <FocusedSferaView
          overallSunnyPercentage={overallSunnyPercentage}
          hasMemories={centerSunHasLifeContent}
          selectedSphere={selectedSphere}
          splashDone={!isSplashVisible || isAnimationComplete}
          onAddMemoriesPress={() => router.push("/(tabs)/spheres")}
          onSphereSelect={(sphere) => {
            startTransitionLoader();
            requestAnimationFrame(() => {
              setTimeout(() => {
                setFocusedMemory(null);
                setFocusedProfileId(null);
                setFocusedJobId(null);
                setFocusedFamilyMemberId(null);
                setFocusedFriendId(null);
                setFocusedHobbyId(null);
                setAnimationsComplete(false);
                setSelectedSphere(sphere);
                hideLoader();
              }, 0);
            });
          }}
          onEntitySelect={(entityId, sphere) => {
            cameFromFocusedSferaForEntityRef.current = true;
            startTransitionLoader();
            // Defer heavy state updates so loader can paint before entity detail mounts (same pattern as Classic transition).
            requestAnimationFrame(() => {
              setTimeout(() => {
                setFocusedMemory(null);
                setSelectedSphere(sphere);
                setFocusedProfileId(
                  sphere === "relationships" ? entityId : null,
                );
                setFocusedJobId(sphere === "career" ? entityId : null);
                setFocusedFamilyMemberId(sphere === "family" ? entityId : null);
                setFocusedFriendId(sphere === "friends" ? entityId : null);
                setFocusedHobbyId(sphere === "hobbies" ? entityId : null);
                setAnimationsComplete(false);
                setHomeViewMode("focused");
                hideLoader();
              }, 0);
            });
          }}
          onSwitchToClassic={() => {
            startTransitionLoader();
            // Defer heavy state updates so loader can paint and main thread doesn't block.
            // Mounting the full Classic view synchronously can freeze the app on real devices (TestFlight).
            // rAF + setTimeout(0) yields to event loop so loader paints before heavy mount.
            requestAnimationFrame(() => {
              setTimeout(() => {
                setFocusedMemory(null);
                setFocusedProfileId(null);
                setFocusedJobId(null);
                setFocusedFamilyMemberId(null);
                setFocusedFriendId(null);
                setFocusedHobbyId(null);
                setSelectedSphere(null);
                setAnimationsComplete(false);
                setShowMomentTypeSelector(true);
                setHomeViewMode("classic");
                hideLoader();
              }, 0);
            });
          }}
          onClearSelection={() => {
            // Clear selected sphere to return to initial focused view showing all sferas
            setSelectedSphere(null);
          }}
          colorScheme={colorScheme ?? "dark"}
          getSphereSunnyPercentage={getSphereSunnyPercentage}
          entityImageUrisBySphere={entityImageUrisBySphere}
          entityIdsBySphere={entityIdsBySphere}
          entityNamesBySphere={entityNamesBySphere}
          memoriesPerEntityBySphere={memoriesPerEntityBySphere}
          initialFocusedIdx={focusedSphereIndex}
          onFocusedSphereChange={handleFocusedSphereChange}
          orbitDurationMs={orbitDurationMs}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
          pulsingAnimations={pulsingAnimations}
          hidden={showEntityDetail}
          onInsightsPress={() => router.push("/insights")}
          onChallengeMePress={handleChallengeMePress}
          initialSunMenuExpanded={false}
          onSunMenuExpandedChange={handleFocusedSunMenuExpandedChange}
          onIntroComplete={() => setFocusedIntroComplete(true)}
          sferaDataReady={!isLoading}
          sunMenuCollapseActionRef={focusedSunMenuCollapseRef}
          bottomTabBarInset={sferaSizeHintTabBarHeight}
          onFocusedDisplayModeForHint={setFocusedHomeMemoryBalance}
          notificationLessonTarget={notificationLessonTarget}
          onNotificationLessonTargetHandled={(key) => {
            setNotificationLessonTarget((prev) =>
              prev?.key === key ? null : prev,
            );
          }}
          sferaSizeHint={
            sferaSizeHintVisible ? (
              <SferaSizeHintBanner
                key="home-sfera-size-hint"
                message={t("home.sferaSizeHint")}
                dismissLabel={t("guidePrompt.dismiss")}
                onClose={handleSferaSizeHintClose}
                onDontShowAgain={handleSferaSizeHintDontShowAgain}
              />
            ) : sunnyVsCloudyHintVisible ? (
              <SferaSizeHintBanner
                key={`home-sunny-vs-cloudy-${sunnyVsCloudyHintVariant}`}
                message={sunnyVsCloudyHintMessage}
                onClose={handleSunnyVsCloudyHintClose}
                actionLabel={t("guidePrompt.sunnyMomentsCta")}
                actionAccessibilityLabel={t("guidePrompt.sunnyMomentsFromSferas")}
                onActionPress={() => openSunnyCelebration()}
                actionIconName="wb-sunny"
                initialCollapsed={sunnyHintCollapsed}
                onCollapsedChange={handleSunnyHintCollapsedChange}
              />
            ) : null
          }
        />
        ) : null}
      </View>
    </View>
  ) : null;

  if (!selectedSphere) {
    // ─── FocusedSferas view: one sphere in focus, others on orbit ───
    // When focused, only this branch is rendered; classic view (wheel of life) is not in the tree.
    if (homeViewMode === "focused") {
      return (
        <TabScreenContainer>
          {hasAnyMoments && (
            <AIInsightsConsentModal
              visible={aiInsightsConsentVisible}
              onEnable={() => {
                setAiInsightsConsentVisible(false);
                void aiConsent.setChoice("enabled");
              }}
              onMaybeLater={() => {
                void aiConsent.setChoice("maybe_later").then(() => {
                  setAiInsightsConsentVisible(false);
                });
              }}
            />
          )}
          {streakData && streakData.currentStreak > 0 && (
            <StreakBadgeComponent
              currentStreak={streakData.currentStreak}
              currentBadge={currentBadge}
              onPress={handleStreakBadgePress}
              onLongPress={handleStreakBadgeLongPress}
            />
          )}
          <StreakRulesModal
            visible={streakRulesModalVisible}
            onClose={handleStreakRulesModalClose}
          />
          {streakData && (
            <StreakModal
              visible={streakModalVisible}
              onClose={handleStreakModalClose}
              streakData={streakData}
              currentBadge={currentBadge}
              nextBadge={nextBadge}
            />
          )}
          {focusedSferaLayer}
          {sunnyMomentsCelebrationOverlay}

          {guideWalkthroughModal}
          {editButton}
          {startupLoaderOverlay}
        </TabScreenContainer>
      );
    }

    // ─── Classic view: wheel of life and five spheres ───
    return (
      <TabScreenContainer
      // Glow effect disabled - no momentType or momentTypeOpacity
      // momentType={showMomentTypeSelector ? selectedMomentType : undefined}
      // momentTypeOpacity={cornerGlowOpacity}
      >
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        {/* Never show AI consent / banner if user has no memories */}
        {hasAnyMoments && (
          <AIInsightsConsentModal
            visible={aiInsightsConsentVisible}
            onEnable={handleAIConsentEnable}
            onMaybeLater={handleAIConsentMaybeLater}
          />
        )}

        {/* Streak Badge - Top Right */}
        {streakData && streakData.currentStreak > 0 && (
          <StreakBadgeComponent
            currentStreak={streakData.currentStreak}
            currentBadge={currentBadge}
            onPress={handleStreakBadgePress}
            onLongPress={handleStreakBadgeLongPress}
          />
        )}

        {/* Streak Rules Modal */}
        <StreakRulesModal
          visible={streakRulesModalVisible}
          onClose={handleStreakRulesModalClose}
        />

        {/* Streak Stats Modal */}
        {streakData && (
          <StreakModal
            visible={streakModalVisible}
            onClose={handleStreakModalClose}
            streakData={streakData}
            currentBadge={currentBadge}
            nextBadge={nextBadge}
          />
        )}
        {sunnyMomentsCelebrationOverlay}

        <View
          style={{
            flex: 1,
            height: SCREEN_HEIGHT,
            position: "relative",
            justifyContent: "center",
            alignItems: "center",
            marginTop: -insets.top + 44,
          }}
        >
          {/* Main wheel exam fireworks */}
          {showMainWheelFireworks && (
            <Fireworks
              visible={showMainWheelFireworks}
              onComplete={() => setShowMainWheelFireworks(false)}
            />
          )}

          {/* Sparkled Dots - Always visible on all screens - full screen coverage */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={avatarCenterX}
            avatarCenterY={avatarCenterY}
            colorScheme={colorScheme ?? "dark"}
            fullScreen={true}
          />

          {/* Sparkled Dots around top text box - positioned behind the text box */}
          {hasAnyMoments && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 250,
                zIndex: 150,
                pointerEvents: "none",
              }}
            >
              <SparkledDots
                avatarSize={SCREEN_WIDTH * 0.8} // Use a larger area to cover the text box region and surrounding area
                avatarCenterX={SCREEN_WIDTH / 2}
                avatarCenterY={100 + 50} // Position around the text box (top: 100 + approximate height/2)
                colorScheme={colorScheme ?? "dark"}
              />
            </View>
          )}

          {/* Random Moment from Wheel of Life Spin + exam result — wrapped in Modal so it also shows over focused view */}
          <Modal
            visible={
              !!(showLesson && selectedLesson) ||
              !!(
                selectedLesson?.examStep === "result" &&
                selectedLesson.examAnalysis
              )
            }
            transparent
            animationType="none"
            statusBarTranslucent
          >
            <View style={{ flex: 1 }}>
              {showLesson &&
                selectedLesson &&
                (() => {
                  const momentType = selectedLesson.momentType || "lessons";

                  // Calculate dimensions - all moment types use dynamic size based on text length
                  const textLength = selectedLesson.text?.length || 0;

                  // Base sizes
                  const baseSunSize = isTablet
                    ? 280
                    : isLargeDevice
                      ? 240
                      : 200;
                  const baseCircleSize = isTablet
                    ? 220
                    : isLargeDevice
                      ? 190
                      : 165;
                  const baseCloudWidth = isTablet
                    ? 280
                    : isLargeDevice
                      ? 240
                      : 220;

                  // Dynamic sizing based on text length
                  let momentWidth: number;
                  let momentHeight: number;

                  if (momentType === "sunnyMoments") {
                    const dynamicSunSize = Math.min(
                      SCREEN_WIDTH * 0.85,
                      Math.max(
                        baseSunSize,
                        baseSunSize + Math.floor(textLength * 1.8),
                      ),
                    );
                    momentWidth = dynamicSunSize;
                    momentHeight = dynamicSunSize;
                  } else if (momentType === "hardTruths") {
                    // Cloud grows wider and taller with text length
                    const dynamicCloudWidth = Math.min(
                      SCREEN_WIDTH * 0.9,
                      Math.max(
                        baseCloudWidth * 1.6,
                        baseCloudWidth * 1.6 + Math.floor(textLength * 1.2),
                      ),
                    );
                    const dynamicCloudHeight = Math.min(
                      250,
                      Math.max(
                        baseCloudWidth * 0.6,
                        baseCloudWidth * 0.6 + Math.floor(textLength * 0.5),
                      ),
                    );
                    momentWidth = dynamicCloudWidth;
                    momentHeight = dynamicCloudHeight;
                  } else {
                    // Lessons (lightbulb) - circle grows with text length (reduced growth rate)
                    const lessonSizeMultiplier = Math.min(
                      1.4,
                      Math.max(1.0, 1.0 + textLength / 150),
                    );
                    const dynamicCircleSize =
                      baseCircleSize * lessonSizeMultiplier;
                    momentWidth = dynamicCircleSize;
                    momentHeight = dynamicCircleSize;
                  }

                  // Get visual properties based on moment type
                  const momentVisuals = {
                    lessons: {
                      icon: "lightbulb" as const,
                      backgroundColor: `${momentColors.lesson.background}73`,
                      shadowColor: momentColors.lesson.background,
                      iconColor: momentColors.lesson.background,
                    },
                    hardTruths: {
                      icon: "cloud" as const,
                      backgroundColor: `${momentColors.cloudy.background}59`,
                      shadowColor: momentColors.cloudy.background,
                      iconColor: momentColors.cloudy.background,
                    },
                    sunnyMoments: {
                      icon: "wb-sunny" as const,
                      backgroundColor: `${momentColors.sunny.background}8C`,
                      shadowColor: momentColors.sunny.background,
                      iconColor: momentColors.sunny.background,
                    },
                  };

                  const visuals = momentVisuals[momentType];

                  const handlePress = () => {
                    setLessonHintDismissed(true);
                    // Wait for press animation to complete before navigating
                    setTimeout(() => {
                      // If it's a mock lesson, just close it (don't navigate)
                      if (selectedLesson.isMock) {
                        setShowLesson(false);
                        return;
                      }

                      // Navigate to the memory this lesson belongs to
                      const sphere = selectedLesson.sphere;
                      const entityId = selectedLesson.entityId;
                      const memoryId = selectedLesson.memoryId;

                      // Set focused memory, focused entity, and selected sphere based on sphere type
                      // We need to set the entity focus first, then the memory focus after a slight delay
                      // to ensure the entity's FloatingAvatar component has rendered
                      if (sphere === "relationships") {
                        const memoryData = {
                          profileId: entityId,
                          memoryId,
                          sphere,
                        };
                        setFocusedProfileId(entityId);
                        setSelectedSphere("relationships");
                        // Delay memory focus to ensure entity is rendered first
                        setTimeout(() => {
                          setFocusedMemory(memoryData);
                        }, 100);
                      } else if (sphere === "career") {
                        const memoryData = {
                          jobId: entityId,
                          memoryId,
                          sphere,
                        };
                        setFocusedJobId(entityId);
                        setSelectedSphere("career");
                        setTimeout(() => {
                          setFocusedMemory(memoryData);
                        }, 100);
                      } else if (sphere === "family") {
                        const memoryData = {
                          familyMemberId: entityId,
                          memoryId,
                          sphere,
                        };
                        setFocusedFamilyMemberId(entityId);
                        setSelectedSphere("family");
                        setTimeout(() => {
                          setFocusedMemory(memoryData);
                        }, 100);
                      } else if (sphere === "friends") {
                        const memoryData = {
                          friendId: entityId,
                          memoryId,
                          sphere,
                        };
                        setFocusedFriendId(entityId);
                        setSelectedSphere("friends");
                        setTimeout(() => {
                          setFocusedMemory(memoryData);
                        }, 100);
                      } else if (sphere === "hobbies") {
                        const memoryData = {
                          hobbyId: entityId,
                          memoryId,
                          sphere,
                        };
                        setFocusedHobbyId(entityId);
                        setSelectedSphere("hobbies");
                        setTimeout(() => {
                          setFocusedMemory(memoryData);
                        }, 100);
                      }

                      // Close the lesson display
                      setShowLesson(false);
                      setSelectedLesson(null);
                    }, 75);
                  };

                  return (
                    <Animated.View
                      style={[
                        {
                          position: "absolute",
                          top: messageTop,
                          left: SCREEN_WIDTH / 2 - momentWidth / 2, // Center horizontally
                          zIndex: 300,
                        },
                        lessonAnimatedStyle,
                      ]}
                    >
                      {momentType === "sunnyMoments" ? (
                        // SVG sun with rays (matching video preview component)
                        <AnimatedPressable
                          onPressIn={() => {
                            lessonPressScale.value = withSpring(0.95, {
                              damping: 15,
                              stiffness: 300,
                            });
                          }}
                          onPressOut={() => {
                            lessonPressScale.value = withSpring(1, {
                              damping: 15,
                              stiffness: 300,
                            });
                          }}
                          onPress={handlePress}
                          style={[
                            {
                              width: momentWidth,
                              height: momentHeight,
                              justifyContent: "center",
                              alignItems: "center",
                              position: "relative",
                            },
                            lessonShadowAnimatedStyle,
                          ]}
                        >
                          <View
                            style={{
                              width: momentWidth,
                              height: momentHeight,
                              shadowColor: momentColors.sunny.background,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.8,
                              shadowRadius: 12,
                              elevation: 10,
                            }}
                          >
                            <Svg
                              width={momentWidth}
                              height={momentHeight}
                              viewBox="0 0 160 160"
                              preserveAspectRatio="xMidYMid meet"
                              style={{ position: "absolute", top: 0, left: 0 }}
                            >
                              <Defs>
                                <RadialGradient
                                  id={`mainSunGradient-${selectedLesson.entityId || "default"}`}
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
                                    stopColor={momentColors.sunny.background}
                                    stopOpacity="0.9"
                                  />
                                  <Stop
                                    offset="60%"
                                    stopColor={momentColors.sunny.background}
                                    stopOpacity="1"
                                  />
                                  <Stop
                                    offset="100%"
                                    stopColor={momentColors.sunny.background}
                                    stopOpacity="1"
                                  />
                                </RadialGradient>
                              </Defs>
                              {/* Sun rays */}
                              {Array.from({ length: 12 }).map((_, i) => {
                                const angle = (i * 360) / 12;
                                const radian = (angle * Math.PI) / 180;
                                const centerX = 80;
                                const centerY = 80;
                                const innerRadius = 48;
                                const outerRadius = 72;
                                const rayWidth = 3;

                                const innerX =
                                  centerX + Math.cos(radian) * innerRadius;
                                const innerY =
                                  centerY + Math.sin(radian) * innerRadius;
                                const outerX =
                                  centerX + Math.cos(radian) * outerRadius;
                                const outerY =
                                  centerY + Math.sin(radian) * outerRadius;

                                const perpAngle = radian + Math.PI / 2;
                                const halfWidth = rayWidth / 2;
                                const leftX =
                                  outerX + Math.cos(perpAngle) * halfWidth;
                                const leftY =
                                  outerY + Math.sin(perpAngle) * halfWidth;
                                const rightX =
                                  outerX +
                                  Math.cos(perpAngle + Math.PI) * halfWidth;
                                const rightY =
                                  outerY +
                                  Math.sin(perpAngle + Math.PI) * halfWidth;

                                return (
                                  <Path
                                    key={`mainRay-${i}`}
                                    d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                                    fill={momentColors.sunny.background}
                                  />
                                );
                              })}
                              {/* Central circle */}
                              <Circle
                                cx="80"
                                cy="80"
                                r="48"
                                fill={`url(#mainSunGradient-${selectedLesson.entityId || "default"})`}
                              />
                            </Svg>
                            <View
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: momentWidth,
                                height: momentHeight,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: momentWidth * 0.25,
                                paddingVertical: momentHeight * 0.2,
                              }}
                            >
                              <ThemedText
                                style={{
                                  color: momentColors.sunny.text,
                                  fontSize: 13 * fontScale,
                                  textAlign: "center",
                                  fontWeight: "700",
                                  lineHeight: 18 * fontScale,
                                }}
                              >
                                {selectedLesson.text}
                              </ThemedText>
                              {/* Entity image circle below text */}
                              {(() => {
                                const entityId = selectedLesson.entityId;
                                const sphere = selectedLesson.sphere;
                                let entityImage: string | undefined;

                                if (sphere === "relationships") {
                                  entityImage = profiles.find(
                                    (p) => p.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "career") {
                                  entityImage = jobs.find(
                                    (j) => j.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "family") {
                                  entityImage = familyMembers.find(
                                    (f) => f.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "friends") {
                                  entityImage = friends.find(
                                    (f) => f.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "hobbies") {
                                  entityImage = hobbies.find(
                                    (h) => h.id === entityId,
                                  )?.imageUri;
                                }

                                if (!entityImage) return null;

                                return (
                                  <Image
                                    source={{ uri: entityImage }}
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      marginTop: 8,
                                      borderWidth: 2,
                                      borderColor: "rgba(0,0,0,0.2)",
                                    }}
                                  />
                                );
                              })()}
                            </View>
                          </View>
                          {/* Close button - positioned at top right */}
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              setShowLesson(false);
                              setSelectedLesson(null);
                            }}
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor:
                                colorScheme === "dark"
                                  ? "rgba(0, 0, 0, 0.4)"
                                  : "rgba(255, 255, 255, 0.9)",
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 10,
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color={
                                colorScheme === "dark" ? "#FFFFFF" : "#000000"
                              }
                              style={{ opacity: 0.8 }}
                            />
                          </Pressable>
                        </AnimatedPressable>
                      ) : momentType === "hardTruths" ? (
                        // SVG cloud (matching video preview component)
                        <AnimatedPressable
                          onPressIn={() => {
                            lessonPressScale.value = withSpring(0.95, {
                              damping: 15,
                              stiffness: 300,
                            });
                          }}
                          onPressOut={() => {
                            lessonPressScale.value = withSpring(1, {
                              damping: 15,
                              stiffness: 300,
                            });
                          }}
                          onPress={handlePress}
                          style={[
                            {
                              width: momentWidth,
                              height: momentHeight,
                              justifyContent: "center",
                              alignItems: "center",
                              position: "relative",
                            },
                            lessonShadowAnimatedStyle,
                          ]}
                        >
                          <View
                            style={{
                              width: momentWidth,
                              height: momentHeight,
                              shadowColor: "#4A5568",
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.7,
                              shadowRadius: 10,
                              elevation: 8,
                            }}
                          >
                            <Svg
                              width={momentWidth}
                              height={momentHeight}
                              viewBox="0 0 320 100"
                              preserveAspectRatio="xMidYMid meet"
                              style={{ position: "absolute", top: 0, left: 0 }}
                            >
                              <Defs>
                                <SvgLinearGradient
                                  id={`mainCloudGradient-${selectedLesson.entityId || "default"}`}
                                  x1="0%"
                                  y1="0%"
                                  x2="0%"
                                  y2="100%"
                                >
                                  <Stop
                                    offset="0%"
                                    stopColor={momentColors.cloudy.background}
                                    stopOpacity="0.95"
                                  />
                                  <Stop
                                    offset="50%"
                                    stopColor={momentColors.cloudy.background}
                                    stopOpacity="0.98"
                                  />
                                  <Stop
                                    offset="100%"
                                    stopColor={momentColors.cloudy.background}
                                    stopOpacity="1"
                                  />
                                </SvgLinearGradient>
                              </Defs>
                              <Path
                                d="M50,50
                             Q40,35 50,25
                             Q60,15 75,20
                             Q85,10 100,20
                             Q115,10 130,20
                             Q145,10 160,20
                             Q175,10 190,20
                             Q205,10 220,20
                             Q235,10 250,20
                             Q265,15 270,25
                             Q280,35 270,50
                             Q280,65 270,75
                             Q260,85 245,80
                             Q230,90 220,85
                             Q205,95 190,85
                             Q175,95 160,85
                             Q145,95 130,85
                             Q115,95 100,85
                             Q85,90 75,80
                             Q60,85 50,75
                             Q40,65 50,50 Z"
                                fill={`url(#mainCloudGradient-${selectedLesson.entityId || "default"})`}
                                stroke="rgba(0,0,0,0.7)"
                                strokeWidth={1.5}
                              />
                            </Svg>
                            <View
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: momentWidth,
                                height: momentHeight,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 20,
                              }}
                            >
                              <ThemedText
                                style={{
                                  color: "rgba(255,255,255,0.9)",
                                  fontSize: 14 * fontScale,
                                  textAlign: "center",
                                  fontWeight: "500",
                                }}
                              >
                                {selectedLesson.text}
                              </ThemedText>
                              {/* Entity image circle below text */}
                              {(() => {
                                const entityId = selectedLesson.entityId;
                                const sphere = selectedLesson.sphere;
                                let entityImage: string | undefined;

                                if (sphere === "relationships") {
                                  entityImage = profiles.find(
                                    (p) => p.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "career") {
                                  entityImage = jobs.find(
                                    (j) => j.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "family") {
                                  entityImage = familyMembers.find(
                                    (f) => f.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "friends") {
                                  entityImage = friends.find(
                                    (f) => f.id === entityId,
                                  )?.imageUri;
                                } else if (sphere === "hobbies") {
                                  entityImage = hobbies.find(
                                    (h) => h.id === entityId,
                                  )?.imageUri;
                                }

                                if (!entityImage) return null;

                                return (
                                  <Image
                                    source={{ uri: entityImage }}
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      marginTop: 8,
                                      borderWidth: 2,
                                      borderColor: "rgba(255,255,255,0.3)",
                                    }}
                                  />
                                );
                              })()}
                            </View>
                          </View>
                          {/* Close button - positioned at top right */}
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              setShowLesson(false);
                              setSelectedLesson(null);
                            }}
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor:
                                colorScheme === "dark"
                                  ? "rgba(0, 0, 0, 0.4)"
                                  : "rgba(255, 255, 255, 0.9)",
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 10,
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color={
                                colorScheme === "dark" ? "#FFFFFF" : "#000000"
                              }
                              style={{ opacity: 0.8 }}
                            />
                          </Pressable>
                        </AnimatedPressable>
                      ) : selectedLesson.examStep === "question" &&
                        !selectedLesson.examQuestion ? (
                        // Loading: lesson exam shell (theme-aware)
                        <View
                          style={[
                            {
                              width: Math.max(momentWidth, 280),
                              minWidth: 200,
                              padding: 20,
                              borderRadius: 24,
                              overflow: "hidden",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: 120,
                              position: "relative",
                              borderWidth: 1,
                              borderColor: lessonExamModalPalette.loadingBorder,
                              shadowColor: lessonExamModalPalette.shellShadowColor,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: lessonExamModalPalette.shellShadowOpacity,
                              shadowRadius: 20,
                              elevation: 24,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={lessonExamModalPalette.gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <ActivityIndicator
                            size="large"
                            color={lessonExamModalPalette.spinner}
                          />
                          <Pressable
                            onPress={handleDismissLesson}
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: lessonExamModalPalette.closeBg,
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 10,
                              borderWidth: 1,
                              borderColor: lessonExamModalPalette.closeBorder,
                            }}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color={lessonExamModalPalette.closeIcon}
                              style={{ opacity: 0.9 }}
                            />
                          </Pressable>
                        </View>
                      ) : selectedLesson.examQuestion &&
                        selectedLesson.examStep === "question" ? (
                        // Main wheel exam: question + answer UI (theme-aware shell)
                        <View
                          style={[
                            {
                              width: Math.max(momentWidth, 280),
                              minWidth: 200,
                              padding: 24,
                              borderRadius: 24,
                              overflow: "hidden",
                              shadowColor: lessonExamModalPalette.shellShadowColor,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: lessonExamModalPalette.shellShadowOpacity,
                              shadowRadius: isTablet ? 24 : 20,
                              elevation: 24,
                              alignItems: "center",
                              position: "relative",
                              borderWidth: 1,
                              borderColor: lessonExamModalPalette.borderColor,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={lessonExamModalPalette.gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <MaterialIcons
                            name="emoji-objects"
                            size={36}
                            color={momentColors.lesson.background}
                            style={{ marginBottom: 14, opacity: 0.95 }}
                          />
                          <ThemedText
                            size="sm"
                            weight="semibold"
                            style={{
                              marginBottom: 16,
                              textAlign: "center",
                              paddingHorizontal: 8,
                              color: lessonExamModalPalette.bodyText,
                              lineHeight: 22,
                            }}
                          >
                            {selectedLesson.examQuestion}
                          </ThemedText>
                          <Animated.View
                            style={[
                              { width: "100%" },
                              mainWheelExamInputPulseStyle,
                            ]}
                          >
                            <TextInput
                              value={mainWheelExamAnswerInput}
                              onChangeText={setMainWheelExamAnswerInput}
                              placeholder={t("wheel.exam.questionPrompt")}
                              placeholderTextColor={
                                lessonExamModalPalette.placeholder
                              }
                              style={{
                                width: "100%",
                                minHeight: 48,
                                backgroundColor: lessonExamModalPalette.inputBg,
                                borderRadius: 14,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                                color: lessonExamModalPalette.bodyText,
                                fontSize: 14 * fontScale,
                                borderWidth: 1,
                                borderColor: lessonExamModalPalette.inputBorder,
                              }}
                              multiline
                            />
                          </Animated.View>
                          <Animated.View
                            style={[
                              mainWheelExamSubmitButtonStyle,
                              { width: "100%", marginTop: 16 },
                            ]}
                          >
                            <Pressable
                              onPressIn={handleMainWheelExamSubmitPressIn}
                              onPressOut={handleMainWheelExamSubmitPressOut}
                              onPress={handleMainWheelExamSubmitPress}
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
                          {(() => {
                            const displayedTriesLeft =
                              mainWheelExamTriesRemaining !== null &&
                              Number.isFinite(mainWheelExamTriesRemaining)
                                ? Math.max(0, mainWheelExamTriesRemaining)
                                : mainWheelExamTriesRemaining;
                            const triesLeftLabel =
                              displayedTriesLeft === null
                                ? null
                                : Number.isFinite(displayedTriesLeft)
                                  ? (
                                      t("universe.exam.triesRemainingFree") ||
                                      "{count} free tries left today"
                                    ).replace(
                                      "{count}",
                                      String(displayedTriesLeft),
                                    )
                                  : t("universe.exam.triesRemainingUnlimited") ||
                                    "Unlimited tries left today";
                            return triesLeftLabel ? (
                              <ThemedText
                                size="xs"
                                style={{
                                  marginTop: 8,
                                  textAlign: "center",
                                  color: lessonExamModalPalette.triesLabel,
                                  fontSize: 11,
                                }}
                              >
                                {triesLeftLabel}
                              </ThemedText>
                            ) : null;
                          })()}
                          <Pressable
                            onPress={handleDismissLesson}
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: lessonExamModalPalette.closeBg,
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 10,
                              borderWidth: 1,
                              borderColor: lessonExamModalPalette.closeBorder,
                            }}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color={lessonExamModalPalette.closeIcon}
                              style={{ opacity: 0.9 }}
                            />
                          </Pressable>
                        </View>
                      ) : selectedLesson.examQuestion &&
                        selectedLesson.examStep === "analyzing" ? (
                        <Animated.View
                          style={[
                            {
                              width: Math.max(momentWidth, 280),
                              minWidth: 200,
                              minHeight: Math.max(momentHeight, 200),
                              justifyContent: "center",
                              alignItems: "center",
                              borderRadius: 24,
                              overflow: "hidden",
                              shadowColor:
                                lessonExamModalPalette.shellShadowColor,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity:
                                lessonExamModalPalette.shellShadowOpacity,
                              shadowRadius: isTablet ? 24 : 20,
                              elevation: 24,
                              padding: 24,
                              position: "relative",
                              borderWidth: 1,
                              borderColor: lessonExamModalPalette.loadingBorder,
                            },
                            lessonShadowAnimatedStyle,
                          ]}
                        >
                          <LinearGradient
                            colors={lessonExamModalPalette.gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <ActivityIndicator
                            size="large"
                            color={lessonExamModalPalette.spinner}
                          />
                          <ThemedText
                            size="sm"
                            style={{
                              marginTop: 12,
                              color: lessonExamModalPalette.bodyText,
                              textAlign: "center",
                              opacity: 0.9,
                            }}
                          >
                            {t("wheel.exam.analyzing")}
                          </ThemedText>
                        </Animated.View>
                      ) : selectedLesson.examStep ===
                        "result" ? // Result shown as separate overlay — renders null here, overlay card is below
                      null : (
                        // For lessons without exam, use the original circle design
                        <AnimatedPressable
                          onPressIn={() => {
                            lessonPressScale.value = withSpring(0.95, {
                              damping: 15,
                              stiffness: 300,
                            });
                          }}
                          onPressOut={() => {
                            lessonPressScale.value = withSpring(1, {
                              damping: 15,
                              stiffness: 300,
                            });
                          }}
                          onPress={handlePress}
                          style={[
                            {
                              width: momentWidth,
                              height: momentHeight,
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: visuals.backgroundColor,
                              borderRadius: momentWidth / 2,
                              shadowColor: visuals.shadowColor,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.95,
                              shadowRadius: isTablet ? 40 : 30,
                              elevation: 24,
                              padding: 8,
                              position: "relative",
                            },
                            lessonShadowAnimatedStyle,
                          ]}
                        >
                          <MaterialIcons
                            name={visuals.icon}
                            size={momentWidth * 0.25}
                            color={visuals.iconColor}
                            style={{ marginBottom: 8 }}
                          />
                          <ThemedText
                            style={{
                              color:
                                colorScheme === "dark" ? "#1A1A1A" : "#000000",
                              fontSize:
                                Math.max(
                                  13,
                                  Math.min(16, 13 + textLength / 60),
                                ) * fontScale,
                              textAlign: "center",
                              fontWeight: "700",
                              maxWidth: momentWidth * 0.85,
                              lineHeight:
                                Math.max(
                                  17,
                                  Math.min(20, 17 + textLength / 60),
                                ) * fontScale,
                            }}
                            numberOfLines={10}
                          >
                            {selectedLesson.text}
                          </ThemedText>

                          {/* Entity image circle below text */}
                          {(() => {
                            const entityId = selectedLesson.entityId;
                            const sphere = selectedLesson.sphere;
                            let entityImage: string | undefined;

                            if (sphere === "relationships") {
                              entityImage = profiles.find(
                                (p) => p.id === entityId,
                              )?.imageUri;
                            } else if (sphere === "career") {
                              entityImage = jobs.find(
                                (j) => j.id === entityId,
                              )?.imageUri;
                            } else if (sphere === "family") {
                              entityImage = familyMembers.find(
                                (f) => f.id === entityId,
                              )?.imageUri;
                            } else if (sphere === "friends") {
                              entityImage = friends.find(
                                (f) => f.id === entityId,
                              )?.imageUri;
                            } else if (sphere === "hobbies") {
                              entityImage = hobbies.find(
                                (h) => h.id === entityId,
                              )?.imageUri;
                            }

                            if (!entityImage) return null;

                            return (
                              <Image
                                source={{ uri: entityImage }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  marginTop: 8,
                                  borderWidth: 2,
                                  borderColor:
                                    colorScheme === "dark"
                                      ? "rgba(0,0,0,0.3)"
                                      : "rgba(255,255,255,0.5)",
                                }}
                              />
                            );
                          })()}

                          {/* Close button - positioned at top right */}
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              setShowLesson(false);
                              setSelectedLesson(null);
                            }}
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor:
                                colorScheme === "dark"
                                  ? "rgba(0, 0, 0, 0.4)"
                                  : "rgba(255, 255, 255, 0.9)",
                              justifyContent: "center",
                              alignItems: "center",
                              zIndex: 10,
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color={
                                colorScheme === "dark" ? "#FFFFFF" : "#000000"
                              }
                              style={{ opacity: 0.8 }}
                            />
                          </Pressable>
                        </AnimatedPressable>
                      )}
                    </Animated.View>
                  );
                })()}

              {/* LEGACY / DEAD CODE NOTE: main-wheel result overlay is deprecated and not part of active UX.
                  Keep only for backward compatibility until full cleanup/removal. */}
              {/* MAIN WHEEL OF LIFE — exam result card overlay (shown after user submits answer) */}
              {selectedLesson?.examStep === "result" &&
                selectedLesson.examAnalysis &&
                (() => {
                  const resultAccentColor = selectedLesson.examAnalysis
                    .isCorrect
                    ? "#4CAF50"
                    : "#FFA726";
                  const RESULT_CARD_WIDTH = Math.min(320, SCREEN_WIDTH - 48);
                  const dismiss = () => {
                    setShowLesson(false);
                    setSelectedLesson(null);
                    setShowMainWheelFireworks(false);
                  };
                  const openMemory = () => {
                    if (selectedLesson.isMock) {
                      dismiss();
                      return;
                    }
                    const { sphere, entityId, memoryId } = selectedLesson;
                    dismiss();
                    if (sphere === "relationships") {
                      setFocusedProfileId(entityId);
                      setSelectedSphere("relationships");
                      setTimeout(
                        () =>
                          setFocusedMemory({
                            profileId: entityId,
                            memoryId,
                            sphere,
                          }),
                        100,
                      );
                    } else if (sphere === "career") {
                      setFocusedJobId(entityId);
                      setSelectedSphere("career");
                      setTimeout(
                        () =>
                          setFocusedMemory({
                            jobId: entityId,
                            memoryId,
                            sphere,
                          }),
                        100,
                      );
                    } else if (sphere === "family") {
                      setFocusedFamilyMemberId(entityId);
                      setSelectedSphere("family");
                      setTimeout(
                        () =>
                          setFocusedMemory({
                            familyMemberId: entityId,
                            memoryId,
                            sphere,
                          }),
                        100,
                      );
                    } else if (sphere === "friends") {
                      setFocusedFriendId(entityId);
                      setSelectedSphere("friends");
                      setTimeout(
                        () =>
                          setFocusedMemory({
                            friendId: entityId,
                            memoryId,
                            sphere,
                          }),
                        100,
                      );
                    } else if (sphere === "hobbies") {
                      setFocusedHobbyId(entityId);
                      setSelectedSphere("hobbies");
                      setTimeout(
                        () =>
                          setFocusedMemory({
                            hobbyId: entityId,
                            memoryId,
                            sphere,
                          }),
                        100,
                      );
                    }
                  };
                  return (
                    <Pressable
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 1200,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0,0,0,0.85)",
                      }}
                      onPress={dismiss}
                    >
                      <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={{
                          width: RESULT_CARD_WIDTH,
                          borderRadius: 24,
                          overflow: "hidden",
                          backgroundColor:
                            colorScheme === "dark"
                              ? "rgba(26, 35, 50, 0.98)"
                              : "rgba(255, 255, 255, 0.98)",
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
                            position: "absolute",
                            top: 12,
                            right: 12,
                            zIndex: 10,
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(0,0,0,0.08)",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <MaterialIcons
                            name="close"
                            size={22}
                            color={colorScheme === "dark" ? "#fff" : "#333"}
                          />
                        </Pressable>
                        {/* Card content — tap to open memory */}
                        <Pressable
                          onPress={openMemory}
                          style={{
                            paddingTop: 24,
                            paddingHorizontal: 20,
                            paddingBottom: 20,
                            alignItems: "center",
                          }}
                        >
                          {/* Result icon */}
                          <View
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 28,
                              backgroundColor: `${resultAccentColor}28`,
                              justifyContent: "center",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <MaterialIcons
                              name={
                                selectedLesson.examAnalysis.isCorrect
                                  ? "check-circle"
                                  : "warning"
                              }
                              size={32}
                              color={resultAccentColor}
                            />
                          </View>
                          {/* Celebration / keep practicing */}
                          <ThemedText
                            size="l"
                            weight="bold"
                            style={{ marginBottom: 8, textAlign: "center" }}
                          >
                            {selectedLesson.examAnalysis.isCorrect
                              ? t("wheel.exam.correctCelebration")
                              : t("wheel.exam.keepPracticing")}
                          </ThemedText>
                          {/* AI feedback */}
                          <ThemedText
                            size="xs"
                            style={{
                              marginBottom: 16,
                              textAlign: "center",
                              color:
                                colorScheme === "light"
                                  ? Colors.light.textMediumEmphasis
                                  : undefined,
                              opacity: colorScheme === "light" ? 1 : 0.75,
                            }}
                          >
                            {selectedLesson.examAnalysis.feedback}
                          </ThemedText>
                          {/* Lesson text */}
                          <ThemedText
                            size="sm"
                            style={{
                              textAlign: "center",
                              fontStyle: "italic",
                              marginBottom: 16,
                              paddingHorizontal: 4,
                              lineHeight: 22 * fontScale,
                              color:
                                colorScheme === "light"
                                  ? Colors.light.text
                                  : undefined,
                            }}
                            numberOfLines={4}
                          >
                            {selectedLesson.text}
                          </ThemedText>
                          {/* Memory image */}
                          {selectedLesson.memoryImageUri ? (
                            <View
                              style={{
                                width: RESULT_CARD_WIDTH - 40,
                                height: 160,
                                borderRadius: 16,
                                overflow: "hidden",
                                backgroundColor:
                                  colorScheme === "dark"
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.06)",
                              }}
                            >
                              <Image
                                source={{ uri: selectedLesson.memoryImageUri }}
                                style={{ width: "100%", height: "100%" }}
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
                                  colorScheme === "dark"
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.06)",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <MaterialIcons
                                name="photo-library"
                                size={36}
                                color={
                                  colorScheme === "dark"
                                    ? "rgba(255,255,255,0.3)"
                                    : "rgba(0,0,0,0.2)"
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
                                colorScheme === "dark"
                                  ? "rgba(255,255,255,0.12)"
                                  : "rgba(0,0,0,0.08)",
                              justifyContent: "center",
                              alignItems: "center",
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
          </Modal>

          {/* MAIN Wheel of Life — center circle with sunny/cloudy % and five spheres */}
          {/* Center - Overall Percentage Avatar with Sparkled Dots */}
          {(() => {
            // Calculate avatar size considering floating entities intersection
            const sphereDistanceFromCenter =
              Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35;
            const floatingEntityRadius = isTablet ? 85 : 55; // Larger on tablets by default
            const floatingEntitySize = isTablet ? 36 : 20; // Decreased from 24 to 20 for smaller floating elements
            const floatingEntityRadiusSize = floatingEntitySize / 2;
            const minDistanceToFloatingEntity =
              sphereDistanceFromCenter -
              floatingEntityRadius -
              floatingEntityRadiusSize;
            const baseAvatarSize = isTablet ? 160 : 100; // Reduced - smaller central avatar
            const baseAvatarRadius = baseAvatarSize / 2;
            const padding = 5;
            const maxSafeAvatarRadius = minDistanceToFloatingEntity - padding;
            const avatarSize =
              maxSafeAvatarRadius < baseAvatarRadius
                ? Math.max(maxSafeAvatarRadius * 2, isTablet ? 140 : 80)
                : baseAvatarSize;
            const avatarCenterX = SCREEN_WIDTH / 2;
            const avatarCenterY = SCREEN_HEIGHT / 2 + 20; // Slightly below center for main circle

            return (
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    left: avatarCenterX - avatarSize / 2,
                    top: avatarCenterY - avatarSize / 2,
                    width: avatarSize,
                    height: avatarSize,
                    zIndex: 100,
                  },
                  classicAvatarStyle,
                ]}
              >
                <Pressable
                  onPressIn={() => {
                    cancelAnimation(classicAvatarPressScale);
                    classicAvatarPressScale.value = withSpring(0.9, {
                      damping: 12,
                      stiffness: 400,
                    });
                  }}
                  onPressOut={() => {
                    cancelAnimation(classicAvatarPressScale);
                    classicAvatarPressScale.value = withSpring(1, {
                      damping: 12,
                      stiffness: 400,
                    });
                  }}
                  onPress={() => {
                    // Switch to FocusedSferas view after press feedback
                    startTransitionLoader();
                    setShowMomentTypeSelector(false);
                    setHomeViewMode("focused");
                    hideLoader();
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <OverallPercentageAvatar
                    percentage={overallSunnyPercentage}
                    hasMemories={centerSunHasLifeContent}
                    showPercentageLabel={sunCelebrationEligible}
                    colorScheme={colorScheme ?? "dark"}
                    colors={colors}
                  />
                </Pressable>
              </Animated.View>
            );
          })()}

          {/* Lesson bulb tap hint: bouncing pointer, shown from 1st lesson appearance */}
          {appUsabilityHints &&
            showLesson &&
            !lessonHintDismissed &&
            lessonAppearCount >= 1 &&
            (() => {
              const pointerSize = isTablet ? 72 : 64;
              const baseCircleSize = isTablet ? 220 : isLargeDevice ? 190 : 165;
              return (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    {
                      position: "absolute",
                      top: messageTop + baseCircleSize + 8,
                      left: SCREEN_WIDTH / 2 - pointerSize / 2,
                      width: pointerSize,
                      height: pointerSize,
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 350,
                    },
                    lessonHintPointerAnimatedStyle,
                  ]}
                >
                  <MaterialIcons
                    name="touch-app"
                    size={pointerSize}
                    color="rgba(0,0,0,0.4)"
                    style={{ position: "absolute", left: 2, top: 2 }}
                  />
                  <MaterialIcons
                    name="touch-app"
                    size={pointerSize}
                    color="#FFFFFF"
                  />
                </Animated.View>
              );
            })()}

          {/* Spiraling Icons - appears during wheel spin and on correct exam answer (1s) */}
          <SpiralingStars
            avatarCenterX={wheelCenterX}
            avatarCenterY={wheelCenterY}
            isSpinning={isWheelSpinning}
            celebrationSpinning={celebrationSparksVisible}
            colorScheme={colorScheme ?? "dark"}
            momentType={selectedMomentType}
          />

          {/* Five Spheres - wrapped in rotatable container */}
          {animationsReady && (
            <View
              {...panResponder.panHandlers}
              onTouchStart={() => {
                console.warn("[WheelPan] wheel container onTouchStart");
              }}
              onTouchMove={() => {
                console.warn("[WheelPan] wheel container onTouchMove");
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                zIndex: 50,
              }}
              pointerEvents="auto"
            >
              <RotatableSphereWrapper
                sphereIndex={0}
                rotation={wheelRotation}
                hintRotation={hintRotation}
                centerX={sphereCircle.centerX}
                centerY={sphereCircle.centerY}
                radius={sphereCircle.radius}
                angleStep={sphereCircle.angleStep}
                startAngle={sphereCircle.startAngle}
                scale={spheresScale}
              >
                <SphereAvatar
                  sphere="relationships"
                  position={spherePositions.relationships}
                  colorScheme={colorScheme ?? "dark"}
                  colors={colors}
                  sphere3DEffect={sphere3DEffect}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere("relationships");
                    }
                  }}
                  sunnyPercentage={relationshipsSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={profiles.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
                  panHandlers={panResponder.panHandlers}
                />
              </RotatableSphereWrapper>

              <RotatableSphereWrapper
                sphereIndex={1}
                rotation={wheelRotation}
                hintRotation={hintRotation}
                centerX={sphereCircle.centerX}
                centerY={sphereCircle.centerY}
                radius={sphereCircle.radius}
                angleStep={sphereCircle.angleStep}
                startAngle={sphereCircle.startAngle}
                scale={spheresScale}
              >
                <SphereAvatar
                  sphere="career"
                  position={spherePositions.career}
                  colorScheme={colorScheme ?? "dark"}
                  colors={colors}
                  sphere3DEffect={sphere3DEffect}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere("career");
                    }
                  }}
                  sunnyPercentage={careerSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={jobs.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
                  panHandlers={panResponder.panHandlers}
                />
              </RotatableSphereWrapper>

              <RotatableSphereWrapper
                sphereIndex={2}
                rotation={wheelRotation}
                hintRotation={hintRotation}
                centerX={sphereCircle.centerX}
                centerY={sphereCircle.centerY}
                radius={sphereCircle.radius}
                angleStep={sphereCircle.angleStep}
                startAngle={sphereCircle.startAngle}
                scale={spheresScale}
              >
                <SphereAvatar
                  sphere="family"
                  position={spherePositions.family}
                  colorScheme={colorScheme ?? "dark"}
                  colors={colors}
                  sphere3DEffect={sphere3DEffect}
                  onPress={() => {
                    console.warn("[WheelPan] Family Sphere onPress fired");
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere("family");
                    }
                  }}
                  sunnyPercentage={familySunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={
                    familyMembers.length === 0 || showMomentTypeSelector
                  }
                  isWrapped={true}
                  panHandlers={panResponder.panHandlers}
                />
              </RotatableSphereWrapper>

              <RotatableSphereWrapper
                sphereIndex={3}
                rotation={wheelRotation}
                hintRotation={hintRotation}
                centerX={sphereCircle.centerX}
                centerY={sphereCircle.centerY}
                radius={sphereCircle.radius}
                angleStep={sphereCircle.angleStep}
                startAngle={sphereCircle.startAngle}
                scale={spheresScale}
              >
                <SphereAvatar
                  sphere="friends"
                  position={spherePositions.friends}
                  colorScheme={colorScheme ?? "dark"}
                  colors={colors}
                  sphere3DEffect={sphere3DEffect}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere("friends");
                    }
                  }}
                  sunnyPercentage={friendsSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={friends.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
                  panHandlers={panResponder.panHandlers}
                />
              </RotatableSphereWrapper>

              <RotatableSphereWrapper
                sphereIndex={4}
                rotation={wheelRotation}
                hintRotation={hintRotation}
                centerX={sphereCircle.centerX}
                centerY={sphereCircle.centerY}
                radius={sphereCircle.radius}
                angleStep={sphereCircle.angleStep}
                startAngle={sphereCircle.startAngle}
                scale={spheresScale}
              >
                <SphereAvatar
                  sphere="hobbies"
                  position={spherePositions.hobbies}
                  colorScheme={colorScheme ?? "dark"}
                  colors={colors}
                  sphere3DEffect={sphere3DEffect}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere("hobbies");
                    }
                  }}
                  sunnyPercentage={hobbiesSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={hobbies.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
                  panHandlers={panResponder.panHandlers}
                />
              </RotatableSphereWrapper>
            </View>
          )}

          {/* Floating entities - these should also rotate with the wheel */}
          {animationsReady && (
            <>
              {/* Floating Partners around Relationships Sphere */}
              {sortedProfiles
                .slice(0, Math.min(sortedProfiles.length, 5))
                .map((profile, index) => {
                  const totalPartners = Math.min(sortedProfiles.length, 5);
                  const entityAngle = (index * 2 * Math.PI) / totalPartners; // Angle relative to sphere
                  const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                  const memories = getIdealizedMemoriesByProfileId(profile.id);

                  // Calculate static position for initial render (FloatingEntity needs it)
                  const x =
                    spherePositions.relationships.x +
                    Math.cos(entityAngle) * entityRadius;
                  const y =
                    spherePositions.relationships.y +
                    Math.sin(entityAngle) * entityRadius;

                  return (
                    <RotatableFloatingEntityWrapper
                      key={`floating-partner-${profile.id}`}
                      sphereIndex={0} // relationships
                      rotation={wheelRotation}
                      hintRotation={hintRotation}
                      centerX={sphereCircle.centerX}
                      centerY={sphereCircle.centerY}
                      sphereRadius={sphereCircle.radius}
                      angleStep={sphereCircle.angleStep}
                      startAngle={sphereCircle.startAngle}
                      entityAngle={entityAngle}
                      entityRadius={entityRadius}
                      scale={spheresScale}
                    >
                      <FloatingEntity
                        entity={profile}
                        position={{ x, y }}
                        colorScheme={colorScheme ?? "dark"}
                        colors={colors}
                        delay={index * 200}
                        entityType="partner"
                        memories={memories}
                        selectedSphere={selectedSphere}
                        zoomProgress={sphereZoomProgress}
                        isWrapped={true}
                      />
                    </RotatableFloatingEntityWrapper>
                  );
                })}

              {/* Floating Jobs around Career Sphere */}
              {sortedJobs
                .slice(0, Math.min(sortedJobs.length, 5))
                .map((job, index) => {
                  const totalJobs = Math.min(sortedJobs.length, 5);
                  const entityAngle = (index * 2 * Math.PI) / totalJobs; // Angle relative to sphere
                  const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                  const memories = getIdealizedMemoriesByEntityId(
                    job.id,
                    "career",
                  );

                  // Calculate static position for initial render (FloatingEntity needs it)
                  const x =
                    spherePositions.career.x +
                    Math.cos(entityAngle) * entityRadius;
                  const y =
                    spherePositions.career.y +
                    Math.sin(entityAngle) * entityRadius;

                  return (
                    <RotatableFloatingEntityWrapper
                      key={`floating-job-${job.id}`}
                      sphereIndex={1} // career
                      rotation={wheelRotation}
                      hintRotation={hintRotation}
                      centerX={sphereCircle.centerX}
                      centerY={sphereCircle.centerY}
                      sphereRadius={sphereCircle.radius}
                      angleStep={sphereCircle.angleStep}
                      startAngle={sphereCircle.startAngle}
                      entityAngle={entityAngle}
                      entityRadius={entityRadius}
                      scale={spheresScale}
                    >
                      <FloatingEntity
                        entity={job}
                        position={{ x, y }}
                        colorScheme={colorScheme ?? "dark"}
                        colors={colors}
                        delay={index * 200}
                        entityType="job"
                        memories={memories}
                        selectedSphere={selectedSphere}
                        zoomProgress={sphereZoomProgress}
                        isWrapped={true}
                      />
                    </RotatableFloatingEntityWrapper>
                  );
                })}

              {/* Floating Family Members around Family Sphere */}
              {familyMembers
                .slice(0, Math.min(familyMembers.length, 5))
                .map((member, index) => {
                  const totalMembers = Math.min(familyMembers.length, 5);
                  const entityAngle = (index * 2 * Math.PI) / totalMembers; // Angle relative to sphere
                  const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                  const memories = getIdealizedMemoriesByEntityId(
                    member.id,
                    "family",
                  );

                  // Calculate static position for initial render (FloatingEntity needs it)
                  const x =
                    spherePositions.family.x +
                    Math.cos(entityAngle) * entityRadius;
                  const y =
                    spherePositions.family.y +
                    Math.sin(entityAngle) * entityRadius;

                  return (
                    <RotatableFloatingEntityWrapper
                      key={`floating-member-${member.id}`}
                      sphereIndex={2} // family
                      rotation={wheelRotation}
                      hintRotation={hintRotation}
                      centerX={sphereCircle.centerX}
                      centerY={sphereCircle.centerY}
                      sphereRadius={sphereCircle.radius}
                      angleStep={sphereCircle.angleStep}
                      startAngle={sphereCircle.startAngle}
                      entityAngle={entityAngle}
                      entityRadius={entityRadius}
                      scale={spheresScale}
                    >
                      <FloatingEntity
                        entity={member}
                        position={{ x, y }}
                        colorScheme={colorScheme ?? "dark"}
                        colors={colors}
                        delay={index * 200}
                        entityType="family"
                        memories={memories}
                        selectedSphere={selectedSphere}
                        zoomProgress={sphereZoomProgress}
                        isWrapped={true}
                      />
                    </RotatableFloatingEntityWrapper>
                  );
                })}

              {/* Floating Friends around Friends Sphere */}
              {friends
                .slice(0, Math.min(friends.length, 5))
                .map((friend, index) => {
                  const totalFriends = Math.min(friends.length, 5);
                  const entityAngle = (index * 2 * Math.PI) / totalFriends; // Angle relative to sphere
                  const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                  const memories = getIdealizedMemoriesByEntityId(
                    friend.id,
                    "friends",
                  );

                  // Calculate static position for initial render (FloatingEntity needs it)
                  const x =
                    spherePositions.friends.x +
                    Math.cos(entityAngle) * entityRadius;
                  const y =
                    spherePositions.friends.y +
                    Math.sin(entityAngle) * entityRadius;

                  return (
                    <RotatableFloatingEntityWrapper
                      key={`floating-friend-${friend.id}`}
                      sphereIndex={3} // friends
                      rotation={wheelRotation}
                      hintRotation={hintRotation}
                      centerX={sphereCircle.centerX}
                      centerY={sphereCircle.centerY}
                      sphereRadius={sphereCircle.radius}
                      angleStep={sphereCircle.angleStep}
                      startAngle={sphereCircle.startAngle}
                      entityAngle={entityAngle}
                      entityRadius={entityRadius}
                      scale={spheresScale}
                    >
                      <FloatingEntity
                        entity={friend}
                        position={{ x, y }}
                        colorScheme={colorScheme ?? "dark"}
                        colors={colors}
                        delay={index * 200}
                        entityType="friend"
                        memories={memories}
                        selectedSphere={selectedSphere}
                        zoomProgress={sphereZoomProgress}
                        isWrapped={true}
                      />
                    </RotatableFloatingEntityWrapper>
                  );
                })}

              {/* Floating Hobbies around Hobbies Sphere */}
              {hobbies
                .slice(0, Math.min(hobbies.length, 5))
                .map((hobby, index) => {
                  const totalHobbies = Math.min(hobbies.length, 5);
                  const entityAngle = (index * 2 * Math.PI) / totalHobbies; // Angle relative to sphere
                  const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                  const memories = getIdealizedMemoriesByEntityId(
                    hobby.id,
                    "hobbies",
                  );

                  // Calculate static position for initial render (FloatingEntity needs it)
                  const x =
                    spherePositions.hobbies.x +
                    Math.cos(entityAngle) * entityRadius;
                  const y =
                    spherePositions.hobbies.y +
                    Math.sin(entityAngle) * entityRadius;

                  return (
                    <RotatableFloatingEntityWrapper
                      key={`floating-hobby-${hobby.id}`}
                      sphereIndex={4} // hobbies
                      rotation={wheelRotation}
                      hintRotation={hintRotation}
                      centerX={sphereCircle.centerX}
                      centerY={sphereCircle.centerY}
                      sphereRadius={sphereCircle.radius}
                      angleStep={sphereCircle.angleStep}
                      startAngle={sphereCircle.startAngle}
                      entityAngle={entityAngle}
                      entityRadius={entityRadius}
                      scale={spheresScale}
                    >
                      <FloatingEntity
                        entity={hobby}
                        position={{ x, y }}
                        colorScheme={colorScheme ?? "dark"}
                        colors={colors}
                        delay={index * 200}
                        entityType="hobby"
                        memories={memories}
                        selectedSphere={selectedSphere}
                        zoomProgress={sphereZoomProgress}
                        isWrapped={true}
                      />
                    </RotatableFloatingEntityWrapper>
                  );
                })}
            </>
          )}

          {/* Floating moment icons - show around entities when moment type selector is visible (hide when spinning) */}
          {animationsReady &&
            showMomentTypeSelector &&
            !isSpinning &&
            (() => {
              const momentIconRadius = isTablet ? 28 : 20; // Distance from entity center
              const icons: React.ReactElement[] = [];

              // For each relationships entity
              sortedProfiles
                .slice(0, Math.min(sortedProfiles.length, 5))
                .forEach((profile, entityIndex) => {
                  const totalPartners = Math.min(sortedProfiles.length, 5);
                  const entityAngle =
                    (entityIndex * 2 * Math.PI) / totalPartners;
                  const momentCounts = getAllMomentCountsForEntity(
                    profile.id,
                    "relationships",
                  );

                  // Create array of all moment types with their counts
                  const momentTypes: { type: MomentType; count: number }[] = (
                    [
                      {
                        type: "lessons" as MomentType,
                        count: momentCounts.lessons,
                      },
                      {
                        type: "hardTruths" as MomentType,
                        count: momentCounts.hardTruths,
                      },
                      {
                        type: "sunnyMoments" as MomentType,
                        count: momentCounts.sunnyMoments,
                      },
                    ] as { type: MomentType; count: number }[]
                  ).filter((m) => m.count > 0);

                  const totalMomentIcons = Math.min(
                    momentTypes.reduce(
                      (sum, m) => sum + Math.min(m.count, 1),
                      0,
                    ), // Max 1 icon per type
                    3, // Max 3 icons total per entity
                  );

                  // Create icons around this entity for each moment type
                  let iconIndex = 0;
                  momentTypes.slice(0, 3).forEach((momentTypeData) => {
                    const iconAngle =
                      (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3); // Distribute evenly
                    const x =
                      spherePositions.relationships.x +
                      Math.cos(entityAngle) * (isTablet ? 85 : 55) +
                      Math.cos(iconAngle) * momentIconRadius;
                    const y =
                      spherePositions.relationships.y +
                      Math.sin(entityAngle) * (isTablet ? 85 : 55) +
                      Math.sin(iconAngle) * momentIconRadius;

                    icons.push(
                      <RotatableFloatingMomentIconWrapper
                        key={`moment-icon-relationships-${profile.id}-${momentTypeData.type}`}
                        sphereIndex={0}
                        rotation={wheelRotation}
                        hintRotation={hintRotation}
                        centerX={sphereCircle.centerX}
                        centerY={sphereCircle.centerY}
                        sphereRadius={sphereCircle.radius}
                        angleStep={sphereCircle.angleStep}
                        startAngle={sphereCircle.startAngle}
                        entityAngle={entityAngle}
                        entityRadius={isTablet ? 85 : 55}
                        momentIconAngle={iconAngle}
                        momentIconRadius={momentIconRadius}
                        scale={spheresScale}
                      >
                        <FloatingMomentIcon
                          position={{ x, y }}
                          delay={entityIndex * 50 + iconIndex * 100}
                          momentType={momentTypeData.type}
                          colorScheme={colorScheme ?? "dark"}
                          index={iconIndex}
                          total={totalMomentIcons}
                          isWrapped={true}
                          selectedMomentType={selectedMomentType}
                        />
                      </RotatableFloatingMomentIconWrapper>,
                    );
                    iconIndex++;
                  });
                });

              // For each career entity
              sortedJobs
                .slice(0, Math.min(sortedJobs.length, 5))
                .forEach((job, entityIndex) => {
                  const totalJobs = Math.min(sortedJobs.length, 5);
                  const entityAngle = (entityIndex * 2 * Math.PI) / totalJobs;
                  const momentCounts = getAllMomentCountsForEntity(
                    job.id,
                    "career",
                  );

                  // Create array of all moment types with their counts
                  const momentTypes: { type: MomentType; count: number }[] = (
                    [
                      {
                        type: "lessons" as MomentType,
                        count: momentCounts.lessons,
                      },
                      {
                        type: "hardTruths" as MomentType,
                        count: momentCounts.hardTruths,
                      },
                      {
                        type: "sunnyMoments" as MomentType,
                        count: momentCounts.sunnyMoments,
                      },
                    ] as { type: MomentType; count: number }[]
                  ).filter((m) => m.count > 0);

                  const totalMomentIcons = Math.min(
                    momentTypes.reduce(
                      (sum, m) => sum + Math.min(m.count, 1),
                      0,
                    ),
                    3,
                  );

                  // Create icons around this entity for each moment type
                  let iconIndex = 0;
                  momentTypes.slice(0, 3).forEach((momentTypeData) => {
                    const iconAngle =
                      (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                    const x =
                      spherePositions.career.x +
                      Math.cos(entityAngle) * (isTablet ? 85 : 55) +
                      Math.cos(iconAngle) * momentIconRadius;
                    const y =
                      spherePositions.career.y +
                      Math.sin(entityAngle) * (isTablet ? 85 : 55) +
                      Math.sin(iconAngle) * momentIconRadius;

                    icons.push(
                      <RotatableFloatingMomentIconWrapper
                        key={`moment-icon-career-${job.id}-${momentTypeData.type}`}
                        sphereIndex={1}
                        rotation={wheelRotation}
                        hintRotation={hintRotation}
                        centerX={sphereCircle.centerX}
                        centerY={sphereCircle.centerY}
                        sphereRadius={sphereCircle.radius}
                        angleStep={sphereCircle.angleStep}
                        startAngle={sphereCircle.startAngle}
                        entityAngle={entityAngle}
                        entityRadius={isTablet ? 85 : 55}
                        momentIconAngle={iconAngle}
                        momentIconRadius={momentIconRadius}
                        scale={spheresScale}
                      >
                        <FloatingMomentIcon
                          position={{ x, y }}
                          delay={entityIndex * 50 + iconIndex * 100}
                          momentType={momentTypeData.type}
                          colorScheme={colorScheme ?? "dark"}
                          index={iconIndex}
                          total={totalMomentIcons}
                          isWrapped={true}
                          selectedMomentType={selectedMomentType}
                        />
                      </RotatableFloatingMomentIconWrapper>,
                    );
                    iconIndex++;
                  });
                });

              // For each family entity
              familyMembers
                .slice(0, Math.min(familyMembers.length, 5))
                .forEach((member, entityIndex) => {
                  const totalMembers = Math.min(familyMembers.length, 5);
                  const entityAngle =
                    (entityIndex * 2 * Math.PI) / totalMembers;
                  const momentCounts = getAllMomentCountsForEntity(
                    member.id,
                    "family",
                  );

                  // Create array of all moment types with their counts
                  const momentTypes: { type: MomentType; count: number }[] = (
                    [
                      {
                        type: "lessons" as MomentType,
                        count: momentCounts.lessons,
                      },
                      {
                        type: "hardTruths" as MomentType,
                        count: momentCounts.hardTruths,
                      },
                      {
                        type: "sunnyMoments" as MomentType,
                        count: momentCounts.sunnyMoments,
                      },
                    ] as { type: MomentType; count: number }[]
                  ).filter((m) => m.count > 0);

                  const totalMomentIcons = Math.min(
                    momentTypes.reduce(
                      (sum, m) => sum + Math.min(m.count, 1),
                      0,
                    ),
                    3,
                  );

                  // Create icons around this entity for each moment type
                  let iconIndex = 0;
                  momentTypes.slice(0, 3).forEach((momentTypeData) => {
                    const iconAngle =
                      (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                    const x =
                      spherePositions.family.x +
                      Math.cos(entityAngle) * (isTablet ? 85 : 55) +
                      Math.cos(iconAngle) * momentIconRadius;
                    const y =
                      spherePositions.family.y +
                      Math.sin(entityAngle) * (isTablet ? 85 : 55) +
                      Math.sin(iconAngle) * momentIconRadius;

                    icons.push(
                      <RotatableFloatingMomentIconWrapper
                        key={`moment-icon-family-${member.id}-${momentTypeData.type}`}
                        sphereIndex={2}
                        rotation={wheelRotation}
                        hintRotation={hintRotation}
                        centerX={sphereCircle.centerX}
                        centerY={sphereCircle.centerY}
                        sphereRadius={sphereCircle.radius}
                        angleStep={sphereCircle.angleStep}
                        startAngle={sphereCircle.startAngle}
                        entityAngle={entityAngle}
                        entityRadius={isTablet ? 85 : 55}
                        momentIconAngle={iconAngle}
                        momentIconRadius={momentIconRadius}
                        scale={spheresScale}
                      >
                        <FloatingMomentIcon
                          position={{ x, y }}
                          delay={entityIndex * 50 + iconIndex * 100}
                          momentType={momentTypeData.type}
                          colorScheme={colorScheme ?? "dark"}
                          index={iconIndex}
                          total={totalMomentIcons}
                          isWrapped={true}
                          selectedMomentType={selectedMomentType}
                        />
                      </RotatableFloatingMomentIconWrapper>,
                    );
                    iconIndex++;
                  });
                });

              // For each friend entity
              friends
                .slice(0, Math.min(friends.length, 5))
                .forEach((friend, entityIndex) => {
                  const totalFriends = Math.min(friends.length, 5);
                  const entityAngle =
                    (entityIndex * 2 * Math.PI) / totalFriends;
                  const momentCounts = getAllMomentCountsForEntity(
                    friend.id,
                    "friends",
                  );

                  // Create array of all moment types with their counts
                  const momentTypes: { type: MomentType; count: number }[] = (
                    [
                      {
                        type: "lessons" as MomentType,
                        count: momentCounts.lessons,
                      },
                      {
                        type: "hardTruths" as MomentType,
                        count: momentCounts.hardTruths,
                      },
                      {
                        type: "sunnyMoments" as MomentType,
                        count: momentCounts.sunnyMoments,
                      },
                    ] as { type: MomentType; count: number }[]
                  ).filter((m) => m.count > 0);

                  const totalMomentIcons = Math.min(
                    momentTypes.reduce(
                      (sum, m) => sum + Math.min(m.count, 1),
                      0,
                    ),
                    3,
                  );

                  // Create icons around this entity for each moment type
                  let iconIndex = 0;
                  momentTypes.slice(0, 3).forEach((momentTypeData) => {
                    const iconAngle =
                      (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                    const x =
                      spherePositions.friends.x +
                      Math.cos(entityAngle) * (isTablet ? 85 : 55) +
                      Math.cos(iconAngle) * momentIconRadius;
                    const y =
                      spherePositions.friends.y +
                      Math.sin(entityAngle) * (isTablet ? 85 : 55) +
                      Math.sin(iconAngle) * momentIconRadius;

                    icons.push(
                      <RotatableFloatingMomentIconWrapper
                        key={`moment-icon-friends-${friend.id}-${momentTypeData.type}`}
                        sphereIndex={3}
                        rotation={wheelRotation}
                        hintRotation={hintRotation}
                        centerX={sphereCircle.centerX}
                        centerY={sphereCircle.centerY}
                        sphereRadius={sphereCircle.radius}
                        angleStep={sphereCircle.angleStep}
                        startAngle={sphereCircle.startAngle}
                        entityAngle={entityAngle}
                        entityRadius={isTablet ? 85 : 55}
                        momentIconAngle={iconAngle}
                        momentIconRadius={momentIconRadius}
                        scale={spheresScale}
                      >
                        <FloatingMomentIcon
                          position={{ x, y }}
                          delay={entityIndex * 50 + iconIndex * 100}
                          momentType={momentTypeData.type}
                          colorScheme={colorScheme ?? "dark"}
                          index={iconIndex}
                          total={totalMomentIcons}
                          isWrapped={true}
                          selectedMomentType={selectedMomentType}
                        />
                      </RotatableFloatingMomentIconWrapper>,
                    );
                    iconIndex++;
                  });
                });

              // For each hobby entity
              hobbies
                .slice(0, Math.min(hobbies.length, 5))
                .forEach((hobby, entityIndex) => {
                  const totalHobbies = Math.min(hobbies.length, 5);
                  const entityAngle =
                    (entityIndex * 2 * Math.PI) / totalHobbies;
                  const momentCounts = getAllMomentCountsForEntity(
                    hobby.id,
                    "hobbies",
                  );

                  // Create array of all moment types with their counts
                  const momentTypes: { type: MomentType; count: number }[] = (
                    [
                      {
                        type: "lessons" as MomentType,
                        count: momentCounts.lessons,
                      },
                      {
                        type: "hardTruths" as MomentType,
                        count: momentCounts.hardTruths,
                      },
                      {
                        type: "sunnyMoments" as MomentType,
                        count: momentCounts.sunnyMoments,
                      },
                    ] as { type: MomentType; count: number }[]
                  ).filter((m) => m.count > 0);

                  const totalMomentIcons = Math.min(
                    momentTypes.reduce(
                      (sum, m) => sum + Math.min(m.count, 1),
                      0,
                    ),
                    3,
                  );

                  // Create icons around this entity for each moment type
                  let iconIndex = 0;
                  momentTypes.slice(0, 3).forEach((momentTypeData) => {
                    const iconAngle =
                      (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                    const x =
                      spherePositions.hobbies.x +
                      Math.cos(entityAngle) * (isTablet ? 85 : 55) +
                      Math.cos(iconAngle) * momentIconRadius;
                    const y =
                      spherePositions.hobbies.y +
                      Math.sin(entityAngle) * (isTablet ? 85 : 55) +
                      Math.sin(iconAngle) * momentIconRadius;

                    icons.push(
                      <RotatableFloatingMomentIconWrapper
                        key={`moment-icon-hobbies-${hobby.id}-${momentTypeData.type}`}
                        sphereIndex={4}
                        rotation={wheelRotation}
                        hintRotation={hintRotation}
                        centerX={sphereCircle.centerX}
                        centerY={sphereCircle.centerY}
                        sphereRadius={sphereCircle.radius}
                        angleStep={sphereCircle.angleStep}
                        startAngle={sphereCircle.startAngle}
                        entityAngle={entityAngle}
                        entityRadius={isTablet ? 85 : 55}
                        momentIconAngle={iconAngle}
                        momentIconRadius={momentIconRadius}
                        scale={spheresScale}
                      >
                        <FloatingMomentIcon
                          position={{ x, y }}
                          delay={entityIndex * 50 + iconIndex * 100}
                          momentType={momentTypeData.type}
                          colorScheme={colorScheme ?? "dark"}
                          index={iconIndex}
                          total={totalMomentIcons}
                          isWrapped={true}
                          selectedMomentType={selectedMomentType}
                        />
                      </RotatableFloatingMomentIconWrapper>,
                    );
                    iconIndex++;
                  });
                });

              return <>{icons}</>;
            })()}

          {/* Pulsing Floating Moments - Randomly spawn around center avatar during moment type selection (hide when spinning) */}
          {animationsReady &&
            showMomentTypeSelector &&
            !isSpinning &&
            randomMoments.map((moment) => (
              <PulsingFloatingMomentIcon
                key={`pulsing-moment-${moment.id}`}
                centerX={sphereCircle.centerX}
                centerY={sphereCircle.centerY}
                angle={moment.angle}
                radius={moment.radius}
                momentType={moment.momentType}
                colorScheme={colorScheme ?? "dark"}
                onComplete={() => handleMomentComplete(moment.id)}
                selectedMomentType={selectedMomentType}
                shouldGrowToFull={moment.shouldGrowToFull}
                text={moment.text}
                momentId={moment.id}
                isExpanded={expandedMomentId === moment.id}
                momentsFrozen={expandedMomentId !== null}
                spawnTime={moment.spawnTime}
                expandedAtTimestamp={expandedAtTimestampRef.current}
                suppressExpandAnimation={momentCard !== null}
                onExpand={(id) => {
                  expandedAtTimestampRef.current = Date.now();
                  setExpandedMomentId(id);
                  setMomentCard({
                    momentType: moment.momentType,
                    text: moment.text ?? "",
                    entityId: moment.entityId,
                    memoryId: moment.memoryId,
                    sphere: moment.sphere,
                    memoryImageUri: moment.memoryImageUri,
                    momentId: moment.momentId,
                  });
                }}
                onCollapse={() => {
                  setExpandedMomentId(null);
                  setMomentCard(null);
                }}
                onMemoryImagePress={
                  moment.entityId && moment.memoryId && moment.sphere
                    ? () => {
                        startTransitionLoader();
                        requestAnimationFrame(() => {
                          setTimeout(() => {
                            setExpandedMomentId(null);
                            const entityId = moment.entityId!;
                            const memoryId = moment.memoryId!;
                            const sphere = moment.sphere!;
                            if (sphere === "relationships") {
                              setFocusedProfileId(entityId);
                              setSelectedSphere("relationships");
                              setFocusedMemory({
                                profileId: entityId,
                                memoryId,
                                sphere,
                              });
                            } else if (sphere === "career") {
                              setFocusedJobId(entityId);
                              setSelectedSphere("career");
                              setFocusedMemory({
                                jobId: entityId,
                                memoryId,
                                sphere,
                              });
                            } else if (sphere === "family") {
                              setFocusedFamilyMemberId(entityId);
                              setSelectedSphere("family");
                              setFocusedMemory({
                                familyMemberId: entityId,
                                memoryId,
                                sphere,
                              });
                            } else if (sphere === "friends") {
                              setFocusedFriendId(entityId);
                              setSelectedSphere("friends");
                              setFocusedMemory({
                                friendId: entityId,
                                memoryId,
                                sphere,
                              });
                            } else if (sphere === "hobbies") {
                              setFocusedHobbyId(entityId);
                              setSelectedSphere("hobbies");
                              setFocusedMemory({
                                hobbyId: entityId,
                                memoryId,
                                sphere,
                              });
                            }
                          }, 120);
                        });
                      }
                    : undefined
                }
                entityId={moment.entityId}
                memoryId={moment.memoryId}
                sphere={moment.sphere}
                memoryImageUri={moment.memoryImageUri}
                showTapHint={
                  appUsabilityHints &&
                  !pulsingLessonHintDismissed &&
                  moment.id === tapHintMomentId
                }
                onTapHintDismiss={() => setPulsingLessonHintDismissed(true)}
              />
            ))}

          {/* Grow All Moments At Once - When all moments of a type have been shown */}
          {animationsReady &&
            showMomentTypeSelector &&
            growAllMomentsType &&
            growAllMomentsType === selectedMomentType &&
            !isSpinning &&
            !selectedLesson &&
            (() => {
              const avatarSize = isTablet ? 180 : 140;
              const avatarRadius = avatarSize / 2;
              const momentRadius = avatarRadius + (isTablet ? 120 : 80);

              // Get all moments of this type to show actual moment data
              const allMomentsOfType = getAllMomentsByType(growAllMomentsType);
              const totalCount = Math.min(allMomentsOfType.length, 12); // Limit to 12 for visual clarity

              // Create moments evenly distributed around the circle with actual moment data
              return allMomentsOfType
                .slice(0, totalCount)
                .map((momentData, index) => {
                  const angle = (index * 2 * Math.PI) / totalCount;
                  const radiusVariation =
                    (Math.random() - 0.5) * (isTablet ? 20 : 15);
                  const radius = momentRadius + radiusVariation;
                  const growAllMomentId = 100000 + index;

                  return (
                    <PulsingFloatingMomentIcon
                      key={`grow-all-${growAllMomentsType}-${index}`}
                      centerX={sphereCircle.centerX}
                      centerY={sphereCircle.centerY}
                      angle={angle}
                      radius={radius}
                      momentType={growAllMomentsType}
                      colorScheme={colorScheme ?? "dark"}
                      selectedMomentType={growAllMomentsType}
                      shouldGrowToFull={true}
                      text={momentData?.text || ""}
                      delay={index * 50}
                      momentId={growAllMomentId}
                      isExpanded={expandedMomentId === growAllMomentId}
                      momentsFrozen={expandedMomentId !== null}
                      spawnTime={growAllShownAtRef.current + index * 50}
                      expandedAtTimestamp={expandedAtTimestampRef.current}
                      suppressExpandAnimation={momentCard !== null}
                      onExpand={(id) => {
                        expandedAtTimestampRef.current = Date.now();
                        setExpandedMomentId(id);
                        if (momentData) {
                          setMomentCard({
                            momentType: growAllMomentsType,
                            text: momentData.text ?? "",
                            entityId: momentData.entityId,
                            memoryId: momentData.memoryId,
                            sphere: momentData.sphere,
                            memoryImageUri: momentData.memoryImageUri,
                            momentId: momentData.momentId,
                          });
                        }
                      }}
                      onCollapse={() => {
                        setExpandedMomentId(null);
                        setMomentCard(null);
                        // Delay clearing so each moment can shrink individually (HOLD_END_MS 4800 + max stagger 550 + shrink 800 ≈ 6s)
                        setTimeout(() => setGrowAllMomentsType(null), 6200);
                      }}
                      onMemoryImagePress={
                        momentData?.entityId &&
                        momentData?.memoryId &&
                        momentData?.sphere
                          ? () => {
                              startTransitionLoader();
                              requestAnimationFrame(() => {
                                setTimeout(() => {
                                  setExpandedMomentId(null);
                                  setGrowAllMomentsType(null);
                                  const entityId = momentData!.entityId;
                                  const memoryId = momentData!.memoryId;
                                  const sphere = momentData!.sphere;
                                  if (sphere === "relationships") {
                                    setFocusedProfileId(entityId);
                                    setSelectedSphere("relationships");
                                    setFocusedMemory({
                                      profileId: entityId,
                                      memoryId,
                                      sphere,
                                    });
                                  } else if (sphere === "career") {
                                    setFocusedJobId(entityId);
                                    setSelectedSphere("career");
                                    setFocusedMemory({
                                      jobId: entityId,
                                      memoryId,
                                      sphere,
                                    });
                                  } else if (sphere === "family") {
                                    setFocusedFamilyMemberId(entityId);
                                    setSelectedSphere("family");
                                    setFocusedMemory({
                                      familyMemberId: entityId,
                                      memoryId,
                                      sphere,
                                    });
                                  } else if (sphere === "friends") {
                                    setFocusedFriendId(entityId);
                                    setSelectedSphere("friends");
                                    setFocusedMemory({
                                      friendId: entityId,
                                      memoryId,
                                      sphere,
                                    });
                                  } else if (sphere === "hobbies") {
                                    setFocusedHobbyId(entityId);
                                    setSelectedSphere("hobbies");
                                    setFocusedMemory({
                                      hobbyId: entityId,
                                      memoryId,
                                      sphere,
                                    });
                                  }
                                }, 120);
                              });
                            }
                          : undefined
                      }
                      entityId={momentData?.entityId}
                      memoryId={momentData?.memoryId}
                      sphere={momentData?.sphere}
                      memoryImageUri={momentData?.memoryImageUri}
                    />
                  );
                });
            })()}

          {/* Moment card overlay: shown when user taps a growing moment (fixed size, icon, truncated text, image; tap card opens memory) */}
          {momentCard &&
            (() => {
              const iconName =
                momentCard.momentType === "sunnyMoments"
                  ? "wb-sunny"
                  : momentCard.momentType === "hardTruths"
                    ? "cloud"
                    : "lightbulb";
              const accentColor =
                momentCard.momentType === "sunnyMoments"
                  ? momentColors.sunny.background
                  : momentCard.momentType === "hardTruths"
                    ? momentColors.cloudy.background
                    : momentColors.lesson.background;
              const openMemory = () => {
                const entityId = momentCard.entityId;
                const memoryId = momentCard.memoryId;
                const sphere = momentCard.sphere;
                if (!entityId || !memoryId || !sphere) {
                  setMomentCard(null);
                  setExpandedMomentId(null);
                  return;
                }
                startTransitionLoader();
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    setMomentCard(null);
                    setExpandedMomentId(null);
                    setGrowAllMomentsType(null);
                    if (sphere === "relationships") {
                      setFocusedProfileId(entityId);
                      setSelectedSphere("relationships");
                      setFocusedMemory({
                        profileId: entityId,
                        memoryId,
                        sphere,
                      });
                    } else if (sphere === "career") {
                      setFocusedJobId(entityId);
                      setSelectedSphere("career");
                      setFocusedMemory({ jobId: entityId, memoryId, sphere });
                    } else if (sphere === "family") {
                      setFocusedFamilyMemberId(entityId);
                      setSelectedSphere("family");
                      setFocusedMemory({
                        familyMemberId: entityId,
                        memoryId,
                        sphere,
                      });
                    } else if (sphere === "friends") {
                      setFocusedFriendId(entityId);
                      setSelectedSphere("friends");
                      setFocusedMemory({
                        friendId: entityId,
                        memoryId,
                        sphere,
                      });
                    } else if (sphere === "hobbies") {
                      setFocusedHobbyId(entityId);
                      setSelectedSphere("hobbies");
                      setFocusedMemory({
                        hobbyId: entityId,
                        memoryId,
                        sphere,
                      });
                    }
                  }, 120);
                });
              };
              const CARD_WIDTH = Math.min(320, SCREEN_WIDTH - 48);
              const CARD_HEIGHT = 400;
              return (
                <Pressable
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 1100,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.85)",
                  }}
                  onPress={() => {
                    setMomentCard(null);
                    setExpandedMomentId(null);
                    setGrowAllMomentsType(null);
                  }}
                >
                  <Pressable
                    onPress={(e) => e.stopPropagation()}
                    style={{
                      width: CARD_WIDTH,
                      minHeight: CARD_HEIGHT,
                      borderRadius: 24,
                      overflow: "hidden",
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(26, 35, 50, 0.98)"
                          : "rgba(255, 255, 255, 0.98)",
                      borderWidth: 1,
                      borderColor: `${accentColor}40`,
                      shadowColor: accentColor,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.35,
                      shadowRadius: 24,
                      elevation: 12,
                    }}
                  >
                    {/* Close button */}
                    <Pressable
                      onPress={() => {
                        setMomentCard(null);
                        setExpandedMomentId(null);
                        setGrowAllMomentsType(null);
                      }}
                      hitSlop={12}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        zIndex: 10,
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor:
                          colorScheme === "dark"
                            ? "rgba(255,255,255,0.12)"
                            : "rgba(0,0,0,0.08)",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <MaterialIcons
                        name="close"
                        size={22}
                        color={colorScheme === "dark" ? "#fff" : "#333"}
                      />
                    </Pressable>

                    {/* Tappable content: opens memory on press */}
                    <Pressable
                      onPress={openMemory}
                      style={{
                        flex: 1,
                        paddingTop: 20,
                        paddingHorizontal: 20,
                        paddingBottom: 20,
                        alignItems: "center",
                      }}
                    >
                      {/* Icon */}
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: `${accentColor}28`,
                          justifyContent: "center",
                          alignItems: "center",
                          marginBottom: 14,
                        }}
                      >
                        <MaterialIcons
                          name={iconName}
                          size={32}
                          color={accentColor}
                        />
                      </View>

                      {/* Truncated description */}
                      <ThemedText
                        numberOfLines={3}
                        ellipsizeMode="tail"
                        style={{
                          fontSize: 15 * fontScale,
                          lineHeight: 22 * fontScale,
                          textAlign: "center",
                          marginBottom: 16,
                          paddingHorizontal: 8,
                        }}
                      >
                        {momentCard.text || " "}
                      </ThemedText>

                      {/* Memory image */}
                      {momentCard.memoryImageUri ? (
                        <View
                          style={{
                            width: CARD_WIDTH - 40,
                            height: 160,
                            borderRadius: 16,
                            overflow: "hidden",
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.06)",
                          }}
                        >
                          <Image
                            source={{ uri: momentCard.memoryImageUri }}
                            style={{
                              width: "100%",
                              height: "100%",
                            }}
                            contentFit="cover"
                          />
                        </View>
                      ) : (
                        <View
                          style={{
                            width: CARD_WIDTH - 40,
                            height: 100,
                            borderRadius: 16,
                            backgroundColor:
                              colorScheme === "dark"
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.06)",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <MaterialIcons
                            name="photo-library"
                            size={36}
                            color={
                              colorScheme === "dark"
                                ? "rgba(255,255,255,0.3)"
                                : "rgba(0,0,0,0.2)"
                            }
                          />
                        </View>
                      )}

                      {/* Open-memory affordance: icon-only, fixed color across moment types */}
                      <View
                        style={{
                          marginTop: 14,
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor:
                            colorScheme === "dark"
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(0,0,0,0.08)",
                          justifyContent: "center",
                          alignItems: "center",
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

          {/* Spin hint: arc-following finger on orbit ring + wheel rotation (visible ~2s, suggests drag to spin) */}
          {animationsReady &&
            appUsabilityHints &&
            showMomentTypeSelector &&
            !momentTypeSelectorDismissed &&
            !isSpinning &&
            (() => {
              const pointerSize = isTablet ? 88 : 78;
              const orbitR = hintOrbitRadius;
              const numDots = 7;

              // Pre-compute dot positions along arc (t ∈ [0, 0.8])
              const arcDots = Array.from({ length: numDots }, (_, i) => {
                const t = (i / (numDots - 1)) * 0.8;
                const angle = HINT_ARC_START_RAD + t * HINT_ARC_SWEEP_RAD;
                return {
                  x: sphereCircle.centerX + orbitR * Math.cos(angle),
                  y: sphereCircle.centerY + orbitR * Math.sin(angle),
                };
              });

              return (
                <>
                  {/* Faint dotted arc trail */}
                  <Svg
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: SCREEN_WIDTH,
                      height: SCREEN_HEIGHT,
                      zIndex: 199,
                    }}
                    width={SCREEN_WIDTH}
                    height={SCREEN_HEIGHT}
                  >
                    {arcDots.map((dot, i) => (
                      <Circle
                        key={i}
                        cx={dot.x}
                        cy={dot.y}
                        r={3}
                        fill="rgba(255,255,255,0.35)"
                      />
                    ))}
                  </Svg>

                  {/* Finger icon anchored at wheel center, arc offset applied via animated style */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: "absolute",
                        left: sphereCircle.centerX - pointerSize / 2,
                        top: sphereCircle.centerY - pointerSize / 2,
                        width: pointerSize,
                        height: pointerSize,
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 200,
                      },
                      spinHintPointerAnimatedStyle,
                    ]}
                  >
                    {/* Shadow layer for better contrast */}
                    <MaterialIcons
                      name="touch-app"
                      size={pointerSize}
                      color="rgba(0, 0, 0, 0.5)"
                      style={{
                        position: "absolute",
                        left: 2,
                        top: 2,
                      }}
                    />
                    <MaterialIcons
                      name="touch-app"
                      size={pointerSize}
                      color="#FFFFFF"
                    />
                  </Animated.View>
                </>
              );
            })()}

          {/* Moment Type Selector Icon Buttons - Fixed position, animated scale (hide when spinning) */}
          {animationsReady &&
            showMomentTypeSelector &&
            !isSpinning &&
            (() => {
              // Position buttons at fixed distance from bottom of screen
              const bottomGap = 20; // Fixed gap from bottom

              return (
                <Animated.View
                  style={[
                    {
                      position: "absolute",
                      bottom: bottomGap,
                      left: 0,
                      right: 0,
                      alignItems: "center",
                      zIndex: 200,
                    },
                    iconButtonAnimatedStyle,
                  ]}
                >
                  {/* Icon buttons row */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Lessons button - Liquid Glass Effect */}
                    <Animated.View
                      style={[
                        lessonsButtonAnimatedStyle,
                        {
                          opacity:
                            isSpinning || expandedMomentId !== null ? 0.3 : 1,
                        },
                      ]}
                    >
                      {/* Cosmic frosted glass - lighter when unselected for see-through effect */}
                      <View style={StyleSheet.absoluteFillObject}>
                        <LinearGradient
                          colors={
                            selectedMomentType === "lessons"
                              ? [
                                  "rgba(92, 225, 230, 0.12)",
                                  "rgba(92, 225, 230, 0.04)",
                                  "rgba(157, 123, 219, 0.08)",
                                ]
                              : [
                                  "rgba(92, 225, 230, 0.03)",
                                  "rgba(92, 225, 230, 0.01)",
                                  "rgba(157, 123, 219, 0.02)",
                                ]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      </View>

                      {/* Avatar ring gradient overlay */}
                      <Animated.View
                        style={[
                          StyleSheet.absoluteFillObject,
                          lessonsGradientOverlayStyle,
                        ]}
                        pointerEvents="none"
                      >
                        <LinearGradient
                          colors={[
                            COSMIC_RING_START,
                            COSMIC_RING_MID,
                            COSMIC_RING_END,
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      </Animated.View>

                      <Pressable
                        onPress={() => setSelectedMomentType("lessons")}
                        onPressIn={handleLessonsButtonPressIn}
                        onPressOut={handleLessonsButtonPressOut}
                        disabled={isSpinning || expandedMomentId !== null}
                        style={{
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity:
                            isSpinning || expandedMomentId !== null
                              ? 0
                              : selectedMomentType === "lessons"
                                ? 0.3
                                : 0.1,
                          shadowRadius: 4,
                          elevation:
                            isSpinning || expandedMomentId !== null
                              ? 0
                              : selectedMomentType === "lessons"
                                ? 5
                                : 2,
                        }}
                      >
                        <MaterialIcons
                          name="emoji-objects"
                          size={28}
                          color={
                            isSpinning || expandedMomentId !== null
                              ? "rgba(150, 150, 150, 0.5)"
                              : selectedMomentType === "lessons"
                                ? momentColors.lesson.background
                                : mainWheelMomentTypeIconUnselected(colorScheme)
                          }
                        />
                      </Pressable>
                    </Animated.View>

                    {/* Sunny moments button - Liquid Glass Effect */}
                    <Animated.View
                      style={[
                        sunnyMomentsButtonAnimatedStyle,
                        {
                          opacity:
                            isSpinning || expandedMomentId !== null ? 0.3 : 1,
                        },
                      ]}
                    >
                      {/* Cosmic frosted glass - lighter when unselected for see-through effect */}
                      <View style={StyleSheet.absoluteFillObject}>
                        <LinearGradient
                          colors={
                            selectedMomentType === "sunnyMoments"
                              ? [
                                  "rgba(92, 225, 230, 0.12)",
                                  "rgba(92, 225, 230, 0.04)",
                                  "rgba(157, 123, 219, 0.08)",
                                ]
                              : [
                                  "rgba(92, 225, 230, 0.03)",
                                  "rgba(92, 225, 230, 0.01)",
                                  "rgba(157, 123, 219, 0.02)",
                                ]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      </View>

                      {/* Avatar ring gradient overlay */}
                      <Animated.View
                        style={[
                          StyleSheet.absoluteFillObject,
                          sunnyMomentsGradientOverlayStyle,
                        ]}
                        pointerEvents="none"
                      >
                        <LinearGradient
                          colors={[
                            COSMIC_RING_START,
                            COSMIC_RING_MID,
                            COSMIC_RING_END,
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      </Animated.View>

                      <Pressable
                        onPress={() => setSelectedMomentType("sunnyMoments")}
                        onPressIn={handleSunnyMomentsButtonPressIn}
                        onPressOut={handleSunnyMomentsButtonPressOut}
                        disabled={isSpinning || expandedMomentId !== null}
                        style={{
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity:
                            isSpinning || expandedMomentId !== null
                              ? 0
                              : selectedMomentType === "sunnyMoments"
                                ? 0.3
                                : 0.1,
                          shadowRadius: 4,
                          elevation:
                            isSpinning || expandedMomentId !== null
                              ? 0
                              : selectedMomentType === "sunnyMoments"
                                ? 5
                                : 2,
                        }}
                      >
                        <MaterialIcons
                          name="wb-sunny"
                          size={28}
                          color={
                            isSpinning || expandedMomentId !== null
                              ? "rgba(150, 150, 150, 0.5)"
                              : selectedMomentType === "sunnyMoments"
                                ? momentColors.sunny.background
                                : mainWheelMomentTypeIconUnselected(colorScheme)
                          }
                        />
                      </Pressable>
                    </Animated.View>

                    {/* Hard truths button - Liquid Glass Effect */}
                    <Animated.View
                      style={[
                        hardTruthsButtonAnimatedStyle,
                        {
                          opacity:
                            isSpinning || expandedMomentId !== null ? 0.3 : 1,
                        },
                      ]}
                    >
                      {/* Cosmic frosted glass - lighter when unselected for see-through effect */}
                      <View style={StyleSheet.absoluteFillObject}>
                        <LinearGradient
                          colors={
                            selectedMomentType === "hardTruths"
                              ? [
                                  "rgba(92, 225, 230, 0.12)",
                                  "rgba(92, 225, 230, 0.04)",
                                  "rgba(157, 123, 219, 0.08)",
                                ]
                              : [
                                  "rgba(92, 225, 230, 0.03)",
                                  "rgba(92, 225, 230, 0.01)",
                                  "rgba(157, 123, 219, 0.02)",
                                ]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      </View>

                      {/* Avatar ring gradient overlay */}
                      <Animated.View
                        style={[
                          StyleSheet.absoluteFillObject,
                          hardTruthsGradientOverlayStyle,
                        ]}
                        pointerEvents="none"
                      >
                        <LinearGradient
                          colors={[
                            COSMIC_RING_START,
                            COSMIC_RING_MID,
                            COSMIC_RING_END,
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      </Animated.View>

                      <Pressable
                        onPress={() => setSelectedMomentType("hardTruths")}
                        onPressIn={handleHardTruthsButtonPressIn}
                        onPressOut={handleHardTruthsButtonPressOut}
                        disabled={isSpinning || expandedMomentId !== null}
                        style={{
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity:
                            isSpinning || expandedMomentId !== null
                              ? 0
                              : selectedMomentType === "hardTruths"
                                ? 0.3
                                : 0.1,
                          shadowRadius: 4,
                          elevation:
                            isSpinning || expandedMomentId !== null
                              ? 0
                              : selectedMomentType === "hardTruths"
                                ? 5
                                : 2,
                        }}
                      >
                        <MaterialIcons
                          name="cloud-queue"
                          size={28}
                          color={
                            isSpinning || expandedMomentId !== null
                              ? "rgba(150, 150, 150, 0.5)"
                              : selectedMomentType === "hardTruths"
                                ? momentColors.cloudy.background
                                : mainWheelMomentTypeIconUnselected(colorScheme)
                          }
                        />
                      </Pressable>
                    </Animated.View>
                  </View>
                </Animated.View>
              );
            })()}
        </View>

        {guideWalkthroughModal}
        {editButton}
        {startupLoaderOverlay}
      </TabScreenContainer>
    );
  }

  // When a sphere is focused, show entities for that sphere
  // For relationships: circle avatar + orbiting ex-partners (same as other spheres)
  // For career: circle avatar + orbiting jobs
  const getEntityIdFromFocusedMemory = (
    memory: NonNullable<typeof focusedMemory>,
  ) =>
    memory.profileId ||
    memory.jobId ||
    memory.familyMemberId ||
    memory.friendId ||
    memory.hobbyId ||
    null;

  const handleOpenFocusedMemoryManualView = () => {
    if (isDemoMode) return;
    if (!focusedMemory) return;
    const entityId = getEntityIdFromFocusedMemory(focusedMemory);
    if (!entityId) return;

    router.push({
      pathname: "/add-idealized-memory",
      params: {
        entityId,
        sphere: focusedMemory.sphere,
        memoryId: focusedMemory.memoryId,
      },
    });
  };

  // --- Breadcrumb header (replaces separate sphere name / entity name / memory title headers) ---
  const breadcrumbHeader = (() => {
    if (!selectedSphere) return null;
    const sphere = selectedSphere as LifeSphere;
    const sphereLabel = t(`spheres.${sphere}`);

    // Resolve entity name
    let entityName: string | null = null;
    const eid =
      focusedProfileId || focusedJobId || focusedFamilyMemberId || focusedFriendId || focusedHobbyId;
    if (eid) {
      if (focusedProfileId && sphere === "relationships") {
        entityName = profiles.find((p) => p.id === focusedProfileId)?.name || null;
      } else if (focusedJobId && sphere === "career") {
        entityName = jobs.find((j) => j.id === focusedJobId)?.name || null;
      } else if (focusedFamilyMemberId && sphere === "family") {
        entityName = familyMembers.find((m) => m.id === focusedFamilyMemberId)?.name || null;
      } else if (focusedFriendId && sphere === "friends") {
        entityName = friends.find((f) => f.id === focusedFriendId)?.name || null;
      } else if (focusedHobbyId && sphere === "hobbies") {
        entityName = hobbies.find((h) => h.id === focusedHobbyId)?.name || null;
      }
    }

    // Resolve memory title
    let memoryTitle: string | null = null;
    if (focusedMemory) {
      const memEntityId = getEntityIdFromFocusedMemory(focusedMemory);
      if (memEntityId) {
        const memories =
          sphere === "relationships" && focusedMemory.profileId
            ? getIdealizedMemoriesByProfileId(focusedMemory.profileId)
            : getIdealizedMemoriesByEntityId(memEntityId, sphere);
        const memoryData = memories.find((m) => m.id === focusedMemory.memoryId);
        memoryTitle = memoryData?.title || null;
      }
    }

    // Build crumb segments: [{ label, onPress? }]
    const crumbs: { label: string; onPress?: () => void }[] = [];

    if (entityName || memoryTitle) {
      // Sphere label is tappable — navigate back to sphere level
      crumbs.push({
        label: sphereLabel,
        onPress: () => {
          setFocusedMemory(null);
          setFocusedProfileId(null);
          setFocusedJobId(null);
          setFocusedFamilyMemberId(null);
          setFocusedFriendId(null);
          setFocusedHobbyId(null);
        },
      });
    } else {
      // Only sphere — not tappable (already at this level)
      crumbs.push({ label: sphereLabel });
    }

    if (entityName) {
      if (memoryTitle) {
        // Entity is tappable — navigate back to entity level
        crumbs.push({
          label: entityName,
          onPress: () => {
            setFocusedMemory(null);
          },
        });
      } else {
        // Entity is the deepest level — not tappable
        crumbs.push({ label: entityName });
      }
    }

    // Memory title is shown above the image circle, not in the breadcrumb

    const isMemoryLevel = !!focusedMemory;
    const isSphereLevel = !entityName && !memoryTitle;
    const hasRightButton = isMemoryLevel;
    // Truncate long labels to keep breadcrumb compact
    const maxLabelChars = 20;
    const truncate = (text: string, max: number) =>
      text.length > max ? text.slice(0, max - 1).trimEnd() + "\u2026" : text;

    return (
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: sphereHeaderBackTop,
          left: 20 + sphereHeaderBackSize + 12,
          right: hasRightButton ? 20 + (isTablet ? 70 : 50) + 16 : 20,
          height: sphereHeaderBackSize,
          zIndex: 1000,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 1,
          }}
        >
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            const displayLabel = crumbs.length === 1
              ? crumb.label
              : truncate(crumb.label, maxLabelChars);
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <ThemedText
                    size="l"
                    emphasis="medium"
                    style={{
                      marginHorizontal: 4,
                      color: colors.text,
                      opacity: 0.35,
                    }}
                  >
                    /
                  </ThemedText>
                )}
                {crumb.onPress ? (
                  <Pressable
                    onPress={crumb.onPress}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <ThemedText
                      size="l"
                      weight="medium"
                      numberOfLines={1}
                      style={{
                        color: colors.text,
                        opacity: 0.5,
                      }}
                    >
                      {displayLabel}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText
                    size="l"
                    weight="bold"
                    numberOfLines={1}
                    style={{
                      color: colors.text,
                      flexShrink: isLast ? 1 : 0,
                    }}
                  >
                    {displayLabel}
                  </ThemedText>
                )}
              </React.Fragment>
            );
          })}
        </View>
        {isMemoryLevel && (
          <Pressable
            onPress={handleOpenFocusedMemoryManualView}
            accessibilityRole="button"
            accessibilityLabel={t("memory.edit")}
            disabled={isDemoMode}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.12)"
                  : "rgba(0, 0, 0, 0.12)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor:
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(0, 0, 0, 0.2)",
              opacity: isDemoMode ? 0.35 : 1,
              position: "absolute",
              right: -(isTablet ? 70 : 50) - 12,
            }}
          >
            <MaterialIcons
              name="edit"
              size={isTablet ? 30 : 20}
              color={colors.text}
            />
          </Pressable>
        )}
        {isSphereLevel && (
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEntitiesDisplayMode((prev) =>
                prev === "orbit" ? "list" : "orbit",
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={
              entitiesDisplayMode === "orbit"
                ? t("displayMode.switchToList")
                : t("displayMode.switchToOrbit")
            }
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              marginLeft: 10,
              opacity: 0.5,
            }}
          >
            <MaterialIcons
              name={
                entitiesDisplayMode === "orbit"
                  ? "view-list"
                  : "blur-circular"
              }
              size={isTablet ? 30 : 22}
              color={colors.text}
            />
          </Pressable>
        )}
      </View>
    );
  })();

  if (selectedSphere === "relationships") {
    return (
      <TabScreenContainer>
        {hasAnyMoments && (
          <AIInsightsConsentModal
            visible={aiInsightsConsentVisible}
            onEnable={() => {
              setAiInsightsConsentVisible(false);
              void aiConsent.setChoice("enabled");
            }}
            onMaybeLater={() => {
              void aiConsent.setChoice("maybe_later").then(() => {
                setAiInsightsConsentVisible(false);
              });
            }}
          />
        )}
        <StreakRulesModal
          visible={streakRulesModalVisible}
          onClose={handleStreakRulesModalClose}
        />
        {streakData && (
          <StreakModal
            visible={streakModalVisible}
            onClose={handleStreakModalClose}
            streakData={streakData}
            currentBadge={currentBadge}
            nextBadge={nextBadge}
          />
        )}
        {focusedSferaLayer}
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens - full screen coverage */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={avatarCenterX}
            avatarCenterY={avatarCenterY}
            colorScheme={colorScheme ?? "dark"}
            fullScreen={true}
          />

          {/* Back button to return to sphere view */}
          <PulsingPressable
            triggerPressOnPressIn
            onPress={() => {
              // Check if we came from a detail view (insights)
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;

              if (returnTo && returnToId) {
                // Navigate back to the detail view - use back() since detail view is in history
                router.back();
                return;
              }

              const hadFocusedMemory = !!focusedMemory;
              if (hadFocusedMemory) {
                startTransitionLoader();
              }

              // Exit immediately; deferring by RAF+setTimeout makes back navigation feel laggy.
              if (focusedMemory) {
                setFocusedMemory(null);
                if (focusedMemory.profileId) {
                  if (
                    !focusedProfileId ||
                    focusedProfileId !== focusedMemory.profileId
                  ) {
                    setFocusedProfileId(focusedMemory.profileId);
                  }
                }
              } else if (focusedProfileId) {
                setFocusedProfileId(null);
                setFocusedMemory(null);
              } else {
                setFocusedMemory(null);
                setFocusedProfileId(null);
                setFocusedJobId(null);
                setSelectedSphere(null);
              }
              if (hadFocusedMemory) {
                if (
                  insightsReturnPath === "/insights-moment-memories" &&
                  insightsReturnType &&
                  insightsReturnSphere &&
                  insightsReturnEntityId
                ) {
                  hideLoader();
                  router.back();
                  return;
                }
                hideLoader();
              }
            }}
            style={{
              position: "absolute",
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={isTablet ? 36 : 24}
              color={colors.text}
            />
          </PulsingPressable>

          {/* Breadcrumb navigation header */}
          {breadcrumbHeader}

          <ScrollView
            scrollEnabled={scrollEnabledForSphere}
            style={[
              styles.content,
              {
                flex: 1,
              },
            ]}
            contentContainerStyle={{
              minHeight: SCREEN_HEIGHT,
              paddingBottom: 100, // Extra padding at bottom for scrolling
              justifyContent: "flex-start",
              alignItems: "flex-start",
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Render entities in orbital view (circle avatar + floating entities) when no profile/memory is focused */}
            {animationsReady && !focusedProfileId && !focusedMemory && (
              <FocusedEntitiesView
                sphere="relationships"
                sphereSunnyPercentage={relationshipsSunnyPercentage}
                entities={sortedProfiles}
                memoriesPerEntity={sortedProfiles.map((p) =>
                  getIdealizedMemoriesByEntityId(p.id, "relationships"),
                )}
                onEntitySelect={(entityId) => {
                  setFocusedProfileId(entityId);
                }}
                colorScheme={colorScheme ?? "dark"}
                isActive={isScreenActive}
                orbitDurationMs={orbitDurationMs}
                constellationAmount={constellationAmount}
                constellationOpacity={constellationOpacity}
                displayMode={entitiesDisplayMode}
              />
            )}

            {/* Render focused profiles separately when focused (but hide profile when memory is focused) */}
            {entitiesDisplayMode === "list" &&
            focusedProfileId &&
            !focusedMemory &&
            animationsReady
              ? (() => {
                  const profile = sortedProfiles.find(
                    (p) => p.id === focusedProfileId,
                  );
                  if (!profile) return null;
                  const mem = getIdealizedMemoriesByEntityId(
                    profile.id,
                    "relationships",
                  );
                  return (
                    <FocusedEntityMemoryList
                      entity={profile}
                      memories={mem}
                      sphere="relationships"
                      colorScheme={colorScheme ?? "dark"}
                      onMemoryFocus={(eid, mid, sph) =>
                        setFocusedMemory({
                          profileId: eid,
                          memoryId: mid,
                          sphere: sph,
                        })
                      }
                    />
                  );
                })()
              : focusedProfilesRender}

            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={
                  getIdealizedMemoriesByProfileId
                }
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? "dark"}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </ScrollView>
        </View>
        {guideWalkthroughModal}
        {editButton}
        {startupLoaderOverlay}
      </TabScreenContainer>
    );
  }

  // For career sphere, show jobs in year sections (similar to relationships)
  if (selectedSphere === "career") {
    return (
      <TabScreenContainer>
        {focusedSferaLayer}
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={avatarCenterX}
            avatarCenterY={avatarCenterY}
            colorScheme={colorScheme ?? "dark"}
          />

          {/* Back button to return to sphere view */}
          <PulsingPressable
            triggerPressOnPressIn
            onPress={() => {
              // Check if we came from a detail view (insights)
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;

              if (returnTo && returnToId) {
                router.back();
                return;
              }

              const hadFocusedMemory = !!focusedMemory;
              if (hadFocusedMemory) {
                startTransitionLoader();
              }

              // Exit immediately; deferring by RAF+setTimeout makes back navigation feel laggy.
              if (focusedMemory) {
                setFocusedMemory(null);
                if (
                  !focusedJobId ||
                  (focusedMemory.jobId &&
                    focusedJobId !== focusedMemory.jobId)
                ) {
                  setFocusedJobId(focusedMemory.jobId || null);
                }
              } else if (focusedJobId) {
                setFocusedJobId(null);
              } else {
                setSelectedSphere(null);
              }
              if (hadFocusedMemory) {
                if (
                  insightsReturnPath === "/insights-moment-memories" &&
                  insightsReturnType &&
                  insightsReturnSphere &&
                  insightsReturnEntityId
                ) {
                  hideLoader();
                  router.back();
                  return;
                }
                hideLoader();
              }
            }}
            style={{
              position: "absolute",
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={isTablet ? 36 : 24}
              color={colors.text}
            />
          </PulsingPressable>

          {/* Breadcrumb navigation header */}
          {breadcrumbHeader}

          <ScrollView
            scrollEnabled={scrollEnabledForSphere}
            style={[
              styles.content,
              {
                flex: 1,
              },
            ]}
            contentContainerStyle={{
              minHeight: SCREEN_HEIGHT,
              paddingBottom: 100, // Extra padding at bottom for scrolling
              justifyContent: "flex-start",
              alignItems: "flex-start",
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Render entities in orbital view when no entity is focused */}
            {animationsReady && !focusedJobId && !focusedMemory && (
              <FocusedEntitiesView
                sphere="career"
                sphereSunnyPercentage={careerSunnyPercentage}
                entities={sortedJobs}
                memoriesPerEntity={sortedJobs.map((j) =>
                  getIdealizedMemoriesByEntityId(j.id, "career"),
                )}
                onEntitySelect={(entityId) => {
                  setFocusedJobId(entityId);
                }}
                colorScheme={colorScheme ?? "dark"}
                isActive={isScreenActive}
                orbitDurationMs={orbitDurationMs}
                constellationAmount={constellationAmount}
                constellationOpacity={constellationOpacity}
                displayMode={entitiesDisplayMode}
              />
            )}

            {/* Render focused jobs separately when focused (but hide job when memory is focused) */}
            {/* Only render if there's actually a focused job - not when showing orbital view */}
            {focusedJobId &&
              (entitiesDisplayMode === "list" &&
              !focusedMemory &&
              animationsReady
                ? (() => {
                    const job = sortedJobs.find(
                      (j) => j.id === focusedJobId,
                    );
                    if (!job) return null;
                    const mem = getIdealizedMemoriesByEntityId(
                      job.id,
                      "career",
                    );
                    return (
                      <FocusedEntityMemoryList
                        entity={job}
                        memories={mem}
                        sphere="career"
                        colorScheme={colorScheme ?? "dark"}
                        onMemoryFocus={(eid, mid, sph) =>
                          setFocusedMemory({
                            jobId: eid,
                            memoryId: mid,
                            sphere: sph,
                          })
                        }
                      />
                    );
                  })()
                : focusedJobsRender)}

            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={
                  getIdealizedMemoriesByProfileId
                }
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? "dark"}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </ScrollView>
        </View>
        {guideWalkthroughModal}
        {editButton}
        {startupLoaderOverlay}
      </TabScreenContainer>
    );
  }

  // For family sphere, show family members in a simple list (no year sections)
  if (selectedSphere === "family") {
    return (
      <TabScreenContainer>
        {focusedSferaLayer}
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={
              focusedFamilyMemberId
                ? focusedFamilyMemberPositionX
                : avatarCenterX
            }
            avatarCenterY={
              focusedFamilyMemberId
                ? focusedFamilyMemberPositionY
                : avatarCenterY
            }
            colorScheme={colorScheme ?? "dark"}
          />

          {/* Back button to return to sphere view */}
          <PulsingPressable
            triggerPressOnPressIn
            onPress={() => {
              // Check if we came from a detail view (insights)
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;

              if (returnTo && returnToId) {
                router.back();
                return;
              }

              const hadFocusedMemory = !!focusedMemory;
              if (hadFocusedMemory) {
                startTransitionLoader();
              }

              // Exit immediately; deferring by RAF+setTimeout makes back navigation feel laggy.
              if (focusedMemory) {
                setFocusedMemory(null);
                if (
                  !focusedFamilyMemberId ||
                  (focusedMemory.familyMemberId &&
                    focusedFamilyMemberId !== focusedMemory.familyMemberId)
                ) {
                  setFocusedFamilyMemberId(
                    focusedMemory.familyMemberId || null,
                  );
                }
              } else if (focusedFamilyMemberId) {
                setFocusedFamilyMemberId(null);
                setFocusedMemory(null);
              } else {
                setFocusedMemory(null);
                setFocusedProfileId(null);
                setFocusedJobId(null);
                setFocusedFamilyMemberId(null);
                setSelectedSphere(null);
              }
              if (hadFocusedMemory) {
                if (
                  insightsReturnPath === "/insights-moment-memories" &&
                  insightsReturnType &&
                  insightsReturnSphere &&
                  insightsReturnEntityId
                ) {
                  hideLoader();
                  router.back();
                  return;
                }
                hideLoader();
              }
            }}
            style={{
              position: "absolute",
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={isTablet ? 36 : 24}
              color={colors.text}
            />
          </PulsingPressable>

          {/* Breadcrumb navigation header */}
          {breadcrumbHeader}

          <View
            style={[
              styles.content,
              {
                flex: 1,
                height: SCREEN_HEIGHT,
                justifyContent: "flex-start",
                alignItems: "flex-start",
              },
            ]}
          >
            {/* Render entities in orbital view when no entity is focused */}
            {animationsReady && !focusedFamilyMemberId && !focusedMemory && (
              <FocusedEntitiesView
                sphere="family"
                sphereSunnyPercentage={familySunnyPercentage}
                entities={familyMembers}
                memoriesPerEntity={familyMembers.map((m) =>
                  getIdealizedMemoriesByEntityId(m.id, "family"),
                )}
                onEntitySelect={(entityId) => {
                  setFocusedFamilyMemberId(entityId);
                }}
                colorScheme={colorScheme ?? "dark"}
                isActive={isScreenActive}
                orbitDurationMs={orbitDurationMs}
                constellationAmount={constellationAmount}
                constellationOpacity={constellationOpacity}
                displayMode={entitiesDisplayMode}
              />
            )}

            {/* Render focused family members separately when focused (but hide family member when memory is focused) */}
            {/* Only render if there's actually a focused family member - not when showing orbital view */}
            {focusedFamilyMemberId &&
              (entitiesDisplayMode === "list" &&
              !focusedMemory &&
              animationsReady
                ? (() => {
                    const member = familyMembers.find(
                      (m) => m.id === focusedFamilyMemberId,
                    );
                    if (!member) return null;
                    const mem = getIdealizedMemoriesByEntityId(
                      member.id,
                      "family",
                    );
                    return (
                      <FocusedEntityMemoryList
                        entity={member}
                        memories={mem}
                        sphere="family"
                        colorScheme={colorScheme ?? "dark"}
                        onMemoryFocus={(eid, mid, sph) =>
                          setFocusedMemory({
                            familyMemberId: eid,
                            memoryId: mid,
                            sphere: sph,
                          })
                        }
                      />
                    );
                  })()
                : focusedFamilyMembersRender)}

            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={
                  getIdealizedMemoriesByProfileId
                }
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? "dark"}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </View>
        </View>
        {guideWalkthroughModal}
        {editButton}
        {startupLoaderOverlay}
      </TabScreenContainer>
    );
  }

  // For friends sphere, show friends in a simple list (no year sections)
  if (selectedSphere === "friends") {
    return (
      <TabScreenContainer>
        {focusedSferaLayer}
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={
              focusedFriendId ? focusedFriendPositionX : avatarCenterX
            }
            avatarCenterY={
              focusedFriendId ? focusedFriendPositionY : avatarCenterY
            }
            colorScheme={colorScheme ?? "dark"}
          />

          {/* Back button to return to sphere view */}
          <PulsingPressable
            triggerPressOnPressIn
            onPress={() => {
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;

              if (returnTo && returnToId) {
                router.back();
                return;
              }

              const hadFocusedMemory = !!focusedMemory;
              if (hadFocusedMemory) {
                startTransitionLoader();
              }

              // Exit immediately; deferring by RAF+setTimeout makes back navigation feel laggy.
              if (focusedMemory) {
                setFocusedMemory(null);
                if (
                  !focusedFriendId ||
                  (focusedMemory.friendId &&
                    focusedFriendId !== focusedMemory.friendId)
                ) {
                  setFocusedFriendId(focusedMemory.friendId || null);
                }
              } else if (focusedFriendId) {
                setFocusedFriendId(null);
                setFocusedMemory(null);
              } else {
                setFocusedMemory(null);
                setFocusedProfileId(null);
                setFocusedJobId(null);
                setFocusedFamilyMemberId(null);
                setFocusedFriendId(null);
                setFocusedHobbyId(null);
                setSelectedSphere(null);
              }
              if (hadFocusedMemory) {
                if (
                  insightsReturnPath === "/insights-moment-memories" &&
                  insightsReturnType &&
                  insightsReturnSphere &&
                  insightsReturnEntityId
                ) {
                  hideLoader();
                  router.back();
                  return;
                }
                hideLoader();
              }
            }}
            style={{
              position: "absolute",
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={isTablet ? 36 : 24}
              color={colors.text}
            />
          </PulsingPressable>

          {/* Breadcrumb navigation header */}
          {breadcrumbHeader}

          <View
            style={[
              styles.content,
              {
                flex: 1,
                height: SCREEN_HEIGHT,
                justifyContent: "flex-start",
                alignItems: "flex-start",
              },
            ]}
          >
            {/* Render entities in orbital view when no entity is focused */}
            {animationsReady && !focusedFriendId && !focusedMemory && (
              <FocusedEntitiesView
                sphere="friends"
                sphereSunnyPercentage={friendsSunnyPercentage}
                entities={friends}
                memoriesPerEntity={friends.map((f) =>
                  getIdealizedMemoriesByEntityId(f.id, "friends"),
                )}
                onEntitySelect={(entityId) => {
                  setFocusedFriendId(entityId);
                }}
                colorScheme={colorScheme ?? "dark"}
                isActive={isScreenActive}
                orbitDurationMs={orbitDurationMs}
                constellationAmount={constellationAmount}
                constellationOpacity={constellationOpacity}
                displayMode={entitiesDisplayMode}
              />
            )}

            {/* Render focused friends separately when focused (but hide friend when memory is focused) */}
            {/* Only render if there's actually a focused friend - not when showing orbital view */}
            {focusedFriendId &&
              (entitiesDisplayMode === "list" &&
              !focusedMemory &&
              animationsReady
                ? (() => {
                    const friend = friends.find(
                      (f) => f.id === focusedFriendId,
                    );
                    if (!friend) return null;
                    const mem = getIdealizedMemoriesByEntityId(
                      friend.id,
                      "friends",
                    );
                    return (
                      <FocusedEntityMemoryList
                        entity={friend}
                        memories={mem}
                        sphere="friends"
                        colorScheme={colorScheme ?? "dark"}
                        onMemoryFocus={(eid, mid, sph) =>
                          setFocusedMemory({
                            friendId: eid,
                            memoryId: mid,
                            sphere: sph,
                          })
                        }
                      />
                    );
                  })()
                : focusedFriendsRender)}

            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={
                  getIdealizedMemoriesByProfileId
                }
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? "dark"}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </View>
        </View>
        {guideWalkthroughModal}
        {editButton}
        {startupLoaderOverlay}
      </TabScreenContainer>
    );
  }

  // For hobbies sphere, show hobbies in a simple list (no year sections)
  if (selectedSphere === "hobbies") {
    return (
      <TabScreenContainer>
        {focusedSferaLayer}
        <ConstellationBackground
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={
              focusedHobbyId ? focusedHobbyPositionX : avatarCenterX
            }
            avatarCenterY={
              focusedHobbyId ? focusedHobbyPositionY : avatarCenterY
            }
            colorScheme={colorScheme ?? "dark"}
          />

          {/* Back button to return to sphere view */}
          <PulsingPressable
            triggerPressOnPressIn
            onPress={() => {
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;

              if (returnTo && returnToId) {
                router.back();
                return;
              }

              const hadFocusedMemory = !!focusedMemory;
              if (hadFocusedMemory) {
                startTransitionLoader();
              }

              // Exit immediately; deferring by RAF+setTimeout makes back navigation feel laggy.
              if (focusedMemory) {
                setFocusedMemory(null);
                if (
                  !focusedHobbyId ||
                  (focusedMemory.hobbyId &&
                    focusedHobbyId !== focusedMemory.hobbyId)
                ) {
                  setFocusedHobbyId(focusedMemory.hobbyId || null);
                }
              } else if (focusedHobbyId) {
                setFocusedHobbyId(null);
                setFocusedMemory(null);
              } else {
                setFocusedMemory(null);
                setFocusedProfileId(null);
                setFocusedJobId(null);
                setFocusedFamilyMemberId(null);
                setFocusedFriendId(null);
                setFocusedHobbyId(null);
                setSelectedSphere(null);
              }
              if (hadFocusedMemory) {
                if (
                  insightsReturnPath === "/insights-moment-memories" &&
                  insightsReturnType &&
                  insightsReturnSphere &&
                  insightsReturnEntityId
                ) {
                  hideLoader();
                  router.back();
                  return;
                }
                hideLoader();
              }
            }}
            style={{
              position: "absolute",
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={isTablet ? 36 : 24}
              color={colors.text}
            />
          </PulsingPressable>

          {/* Breadcrumb navigation header */}
          {breadcrumbHeader}

          <View
            style={[
              styles.content,
              {
                flex: 1,
                height: SCREEN_HEIGHT,
                justifyContent: "flex-start",
                alignItems: "flex-start",
              },
            ]}
          >
            {/* Render entities in orbital view when no entity is focused */}
            {animationsReady && !focusedHobbyId && !focusedMemory && (
              <FocusedEntitiesView
                sphere="hobbies"
                sphereSunnyPercentage={hobbiesSunnyPercentage}
                entities={hobbies}
                memoriesPerEntity={hobbies.map((h) =>
                  getIdealizedMemoriesByEntityId(h.id, "hobbies"),
                )}
                onEntitySelect={(entityId) => {
                  setFocusedHobbyId(entityId);
                }}
                colorScheme={colorScheme ?? "dark"}
                isActive={isScreenActive}
                orbitDurationMs={orbitDurationMs}
                constellationAmount={constellationAmount}
                constellationOpacity={constellationOpacity}
                displayMode={entitiesDisplayMode}
              />
            )}

            {/* Render focused hobbies separately when focused (but hide hobby when memory is focused) */}
            {/* Only render if there's actually a focused hobby - not when showing orbital view */}
            {focusedHobbyId &&
              (entitiesDisplayMode === "list" &&
              !focusedMemory &&
              animationsReady
                ? (() => {
                    const hobby = hobbies.find(
                      (h) => h.id === focusedHobbyId,
                    );
                    if (!hobby) return null;
                    const mem = getIdealizedMemoriesByEntityId(
                      hobby.id,
                      "hobbies",
                    );
                    return (
                      <FocusedEntityMemoryList
                        entity={hobby}
                        memories={mem}
                        sphere="hobbies"
                        colorScheme={colorScheme ?? "dark"}
                        onMemoryFocus={(eid, mid, sph) =>
                          setFocusedMemory({
                            hobbyId: eid,
                            memoryId: mid,
                            sphere: sph,
                          })
                        }
                      />
                    );
                  })()
                : focusedHobbiesRender)}

            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={
                  getIdealizedMemoriesByProfileId
                }
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? "dark"}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </View>
        </View>
        {guideWalkthroughModal}
        {editButton}
        {startupLoaderOverlay}
      </TabScreenContainer>
    );
  }

  const _exhaustive: never = selectedSphere;
  return _exhaustive;
}

// Focused Memory Renderer Component
const FocusedMemoryRenderer = React.memo(
  function FocusedMemoryRenderer({
    focusedMemory,
    sortedProfiles,
    sortedJobs,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
    updateIdealizedMemory,
    colorScheme,
    memorySlideOffset,
    setFocusedMemory,
  }: {
    focusedMemory: {
      profileId?: string;
      jobId?: string;
      familyMemberId?: string;
      friendId?: string;
      hobbyId?: string;
      memoryId: string;
      sphere: LifeSphere;
      momentToShowId?: string;
    };
    sortedProfiles: any[];
    sortedJobs?: any[];
    getIdealizedMemoriesByProfileId: (profileId: string) => any[];
    getIdealizedMemoriesByEntityId: (
      entityId: string,
      sphere: LifeSphere,
    ) => any[];
    updateIdealizedMemory: (
      memoryId: string,
      updates: Partial<any>,
    ) => Promise<void>;
    colorScheme: "light" | "dark";
    memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
    setFocusedMemory: (
      memory: {
        profileId?: string;
        jobId?: string;
        familyMemberId?: string;
        friendId?: string;
        hobbyId?: string;
        memoryId: string;
        sphere: LifeSphere;
        momentToShowId?: string;
      } | null,
    ) => void;
  }) {
    const entityId =
      focusedMemory.profileId ||
      focusedMemory.jobId ||
      focusedMemory.familyMemberId ||
      focusedMemory.friendId ||
      focusedMemory.hobbyId;
    const sphere = focusedMemory.sphere;

    if (!entityId) return null;

    // Get memories based on sphere
    const memories =
      sphere === "relationships" && focusedMemory.profileId
        ? getIdealizedMemoriesByProfileId(focusedMemory.profileId)
        : getIdealizedMemoriesByEntityId(entityId, sphere);

    const focusedMemoryData = memories.find(
      (m) => m.id === focusedMemory.memoryId,
    );
    if (!focusedMemoryData) return null;

    return (
      <FloatingMemory
        key={`focused-memory-${focusedMemory.memoryId}`}
        memory={focusedMemoryData}
        position={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 }}
        avatarPanX={undefined}
        avatarPanY={undefined}
        focusedX={undefined}
        focusedY={undefined}
        offsetX={0}
        offsetY={0}
        isFocused={true}
        colorScheme={colorScheme ?? "dark"}
        calculatedMemorySize={100}
        onDoubleTap={() => {
          setFocusedMemory(null);
        }}
        isMemoryFocused={true}
        memorySlideOffset={memorySlideOffset}
        onUpdateMemory={async (updates) => {
          if (focusedMemory) {
            await updateIdealizedMemory(focusedMemory.memoryId, updates);
            // Note: Streak updates only happen when creating NEW memories (in add-idealized-memory.tsx)
            // Editing existing memories does not affect streak
          }
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      (prevProps.focusedMemory.profileId ===
        nextProps.focusedMemory.profileId ||
        prevProps.focusedMemory.jobId === nextProps.focusedMemory.jobId ||
        prevProps.focusedMemory.familyMemberId ===
          nextProps.focusedMemory.familyMemberId) &&
      prevProps.focusedMemory.memoryId === nextProps.focusedMemory.memoryId &&
      prevProps.colorScheme === nextProps.colorScheme
    );
  },
);
