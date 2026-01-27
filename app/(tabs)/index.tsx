import ShareModal from '@/components/ShareModal';
import { StreakBadgeComponent } from '@/components/streak-badge';
import { StreakModal } from '@/components/streak-modal';
import { StreakRulesModal } from '@/components/streak-rules-modal';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { GifAnimationPreview } from '@/library/components/gif-animation-preview';
import { OnboardingStepper } from '@/library/components/onboarding-stepper';
import { DARK_GRADIENT_COLORS, LIGHT_GRADIENT_COLORS, TabScreenContainer } from '@/library/components/tab-screen-container';
import { logError } from '@/utils/error-logger';
import { processHomeEncouragementPrompt } from '@/utils/ai-service';
import { AIInsightsConsentModal } from '@/components/ai-insights-consent-modal';
import { useJourney, type LifeSphere } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { useLanguage } from '@/utils/languages/language-context';
import { useAIInsightsConsent } from '@/utils/AIInsightsConsentProvider';
import { requestSpheresTabPulse, stopSpheresTabPulse } from '@/utils/spheres-tab-pulse';
import { useSplash } from '@/utils/SplashAnimationProvider';
import {
  getCurrentBadge,
  getNextBadge,
  recalculateStreak
} from '@/utils/streak-manager';
import { refreshStreakNotifications } from '@/utils/streak-notifications';
import type { StreakBadge, StreakData } from '@/utils/streak-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, Dimensions, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, FeColorMatrix, FeGaussianBlur, FeMerge, FeMergeNode, Filter, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Create animated Pressable component for shadow animations
const AnimatedPressable = createAnimatedComponent(Pressable);

// Create animated Circle component for loading progress
const AnimatedCircle = createAnimatedComponent(Circle);

// Constants for LinearGradient and Pressable props (avoid recreating objects on every render)
const LINEAR_GRADIENT_START = { x: 0, y: 0 };
const LINEAR_GRADIENT_END = { x: 1, y: 1 };
const CLOSE_BUTTON_HITSLOP = { top: 8, bottom: 8, left: 8, right: 8 };

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
    if (hasStartPosition && propStartX !== undefined && propStartY !== undefined && !animationStartedRef.current) {
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
  }, [hasStartPosition, propStartX, propStartY, panX, panY, opacity, scale, entranceProgress]);

  // Start the actual animation after layout is complete
  React.useEffect(() => {
    if (hasStartPosition && propStartX !== undefined && propStartY !== undefined && !animationStartedRef.current) {
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
        entranceProgress.value = withSpring(1, {
          damping: 12,
          stiffness: 150,
          mass: 0.8,
        }, () => {
          // After growing completes, hold at full scale for 2.5 seconds
          // This callback runs when the spring animation finishes
        });
      }, actualDelay);
      return () => clearTimeout(timer);
    }
    // If animation has started, don't reset anything even if start position is cleared
  }, [entranceDelay, hasStartPosition, propStartX, propStartY, initialX, initialY, panX, panY, opacity, scale, entranceProgress]);
  
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
  }, [initialX, initialY, panX, panY, startX, startY, isDragging, hasStartPosition]);

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
          const isTap = Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;

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
    [hitAreaWidth, hitAreaHeight, panX, panY, startX, startY, isDragging, onPositionChange, onPress]
  );
  
  const baseStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value - hitAreaWidth / 2 },
      { translateY: panY.value - hitAreaHeight / 2 },
      {
        scale: hasStartPosition ? scale.value : (0.3 + entranceProgress.value * 0.7), // Scale from 0.3 to 1
      },
    ],
    opacity: hasStartPosition ? opacity.value : entranceProgress.value,
  }));
  
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: hitAreaWidth,
          height: hitAreaHeight,
          zIndex,
          overflow: 'hidden', // Clip to exact size - no overflow
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

// Floating Avatar Component
const FloatingAvatar = React.memo(function FloatingAvatar({
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
}: {
  profile: any;
  position: { x: number; y: number };
  memories: any[];
  onPress: () => void;
  colors: any;
  colorScheme: 'light' | 'dark';
  isFocused: boolean;
  focusedMemory?: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null;
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  onMemoryFocus?: (entityId: string, memoryId: string, sphere?: LifeSphere, momentId?: string) => void;
  yearSection?: { year: number | string; top: number; bottom: number; height: number };
  onPositionChange?: (x: number, y: number) => void;
  enableDragging?: boolean;
  externalPositionX?: ReturnType<typeof useSharedValue<number>>;
  externalPositionY?: ReturnType<typeof useSharedValue<number>>;
  onEntityWheelChange?: (isActive: boolean) => void;
}) {
  const { isTablet, isLargeDevice } = useLargeDevice();
  const insets = useSafeAreaInsets();
  const fontScale = useFontScale();
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [shareModalContent, setShareModalContent] = React.useState({ title: '', message: '' });
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [isCapturingImage, setIsCapturingImage] = React.useState(false);
  const [captureTransform, setCaptureTransform] = React.useState({ scale: 1, translateX: 0, translateY: 0 });
  const [captureWrapperBounds, setCaptureWrapperBounds] = React.useState({ left: 0, top: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const [imagePreviewUri, setImagePreviewUri] = React.useState<string | null>(null);
  const [showGifAnimation, setShowGifAnimation] = React.useState(false);
  const [showEntityWheel, setShowEntityWheel] = React.useState(false);
  const [selectedWheelMoment, setSelectedWheelMoment] = React.useState<{ type: 'lesson' | 'sunny' | 'cloudy'; text: string; memoryId: string; momentId?: string; memoryImageUri?: string } | null>(null);
  const [selectedMomentType, setSelectedMomentType] = React.useState<'lesson' | 'sunny' | 'cloudy'>('lesson');
  const [isWheelSpinningState, setIsWheelSpinningState] = React.useState(false);

  // State for floating moments that grow from memories in entity wheel
  const [floatingMoments, setFloatingMoments] = React.useState<{
    id: number;
    memoryId: string;
    memoryIndex: number;
    momentIndex: number;
    momentType: 'lesson' | 'sunny' | 'cloudy';
    text: string;
    memoryImageUri?: string;
    memoryOffsetX: number;
    memoryOffsetY: number;
    memoryBaseAngle: number;
    spawnSlot: number; // Stable slot for layout (avoids blink when totalConcurrent drops)
    batchSize: number;
    cycleId: number; // Rotate positions each restart so they're not always the same
    angleJitter: number; // Random offset within slot arc for non-overlapping random positions
  }[]>([]);
  const momentIdCounter = useRef(0);
  const floatingMomentsTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
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

  // Entity wheel moment type selector animation values (matching main wheel)
  const entityLessonButtonPressScale = useSharedValue(1);
  const entitySunnyButtonPressScale = useSharedValue(1);
  const entityCloudyButtonPressScale = useSharedValue(1);
  const entityLessonButtonSelection = useSharedValue(1); // Start with lesson selected
  const entitySunnyButtonSelection = useSharedValue(0);
  const entityCloudyButtonSelection = useSharedValue(0);
  const entityLessonButtonHighlight = useSharedValue(0);
  const entitySunnyButtonHighlight = useSharedValue(0);
  const entityCloudyButtonHighlight = useSharedValue(0);

  // Avatar pulse animation for indicating clickability when entering focused view
  const avatarPulseScale = useSharedValue(1);

  const baseAvatarSize = isTablet ? 120 : 100; // 50% larger on tablets, increased from 80 to 100
  const focusedAvatarSize = isTablet ? 150 : 120; // 50% larger on tablets, increased from 100 to 120
  const avatarSize = isFocused ? focusedAvatarSize : baseAvatarSize;
  // Memory radius - when focused, ensure all floating elements fit within viewport
  // Calculation: memoryRadius + memorySize/2 + momentRadius + momentSize/2 + padding <= min(SCREEN_WIDTH/2, SCREEN_HEIGHT/2)
  // Where: memoryRadius is from avatar center, memorySize/2 = 22.5, momentRadius = 40, momentSize/2 = 6, padding = 25
  // So: memoryRadius + 22.5 + 40 + 6 + 25 = memoryRadius + 93.5 <= min(SCREEN_WIDTH/2, SCREEN_HEIGHT/2)
  // Therefore: memoryRadius <= min(SCREEN_WIDTH/2, SCREEN_HEIGHT/2) - 93.5
  const maxDistanceFromCenter = Math.min(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
  const estimatedMaxMemorySize = isTablet ? 68 : 45; // Maximum memory size when focused (50% larger on tablets)
  const estimatedMaxMomentRadius = isTablet ? 60 : 40; // Maximum radius of moments around memory (50% larger on tablets)
  const estimatedMaxMomentSize = isTablet ? 18 : 12; // Maximum moment size (50% larger on tablets)
  const safetyPadding = isTablet ? 38 : 25; // Safety padding from viewport edges (50% larger on tablets)
  const maxAllowedRadius = maxDistanceFromCenter - estimatedMaxMemorySize / 2 - estimatedMaxMomentRadius - estimatedMaxMomentSize / 2 - safetyPadding;
  // On tablets, increase memory radius when focused to position memories further from avatar
  // Use larger base radius on tablets to start with more spacing
  const baseMemoryRadius = isFocused 
    ? (isTablet ? Math.max(120, Math.min(160, maxAllowedRadius)) : Math.max(60, Math.min(90, maxAllowedRadius))) // Reduced for phones when focused
    : (isTablet ? 90 : 60); // Base radius for floating memories around spheres (reverted to original)
  // On tablets, position memories much further from avatar when focused (3x distance for better spacing)
  const memoryRadius = isTablet && isFocused ? baseMemoryRadius * 3 : baseMemoryRadius;
  
  // Calculate sunny moments percentage for progress bar and moment counts
  const { sunnyPercentage, momentCounts } = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;
    let totalLessons = 0;

    memories.forEach((memory) => {
      totalClouds += (memory.hardTruths || []).length;
      totalSuns += (memory.goodFacts || []).length;
      totalLessons += (memory.lessonsLearned || []).length;
    });

    const total = totalClouds + totalSuns + totalLessons;
    const percentage = total === 0 ? 0 : ((totalSuns + totalLessons) / total) * 100;

    return {
      sunnyPercentage: percentage,
      momentCounts: {
        lesson: totalLessons,
        sunny: totalSuns,
        cloudy: totalClouds,
      },
    };
  }, [memories]);
  
  // Calculate SVG circle parameters for progress bar
  const borderWidth = 6; // Increased from 4 to 6 for thicker border
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (sunnyPercentage / 100) * circumference;
  
  // Double tap detection
  const initials = profile.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
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
    const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
    const visibleAreaTop = insets.top;
    const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area
    clampedPositionX = Math.max(padding, Math.min(SCREEN_WIDTH - padding, position.x));
    clampedPositionY = Math.max(visibleAreaTop + padding, Math.min(visibleAreaBottom - padding, position.y));
  } else {
    // For non-draggable entities, only ensure they're not outside screen bounds (basic safety check)
    // The position should already be validated within year section bounds
    clampedPositionX = Math.max(padding, Math.min(SCREEN_WIDTH - padding, position.x));
    clampedPositionY = Math.max(padding, Math.min(SCREEN_HEIGHT - padding, position.y));
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
              const hasMovement = Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
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
              const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
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
      const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
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
    [enableDragging, isFocused, panX, panY, dragStartX, dragStartY, avatarSize, onPositionChange, externalPositionX, externalPositionY]
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
    const panXValues = [memoryPanX0, memoryPanX1, memoryPanX2, memoryPanX3, memoryPanX4, memoryPanX5, memoryPanX6, memoryPanX7, memoryPanX8, memoryPanX9, memoryPanX10, memoryPanX11, memoryPanX12, memoryPanX13, memoryPanX14, memoryPanX15, memoryPanX16, memoryPanX17, memoryPanX18, memoryPanX19, memoryPanX20, memoryPanX21, memoryPanX22, memoryPanX23, memoryPanX24];
    const panYValues = [memoryPanY0, memoryPanY1, memoryPanY2, memoryPanY3, memoryPanY4, memoryPanY5, memoryPanY6, memoryPanY7, memoryPanY8, memoryPanY9, memoryPanY10, memoryPanY11, memoryPanY12, memoryPanY13, memoryPanY14, memoryPanY15, memoryPanY16, memoryPanY17, memoryPanY18, memoryPanY19, memoryPanY20, memoryPanY21, memoryPanY22, memoryPanY23, memoryPanY24];
    
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
  }, [memoryPanX0, memoryPanX1, memoryPanX2, memoryPanX3, memoryPanX4, memoryPanX5, memoryPanX6, memoryPanX7, memoryPanX8, memoryPanX9, memoryPanX10, memoryPanX11, memoryPanX12, memoryPanX13, memoryPanX14, memoryPanX15, memoryPanX16, memoryPanX17, memoryPanX18, memoryPanX19, memoryPanX20, memoryPanX21, memoryPanX22, memoryPanX23, memoryPanX24, memoryPanY0, memoryPanY1, memoryPanY2, memoryPanY3, memoryPanY4, memoryPanY5, memoryPanY6, memoryPanY7, memoryPanY8, memoryPanY9, memoryPanY10, memoryPanY11, memoryPanY12, memoryPanY13, memoryPanY14, memoryPanY15, memoryPanY16, memoryPanY17, memoryPanY18, memoryPanY19, memoryPanY20, memoryPanY21, memoryPanY22, memoryPanY23, memoryPanY24]);
  
  // Update pan values when position prop changes (but not while dragging)
  // Also clamp position to ensure avatar stays within viewport (only for draggable entities)
  React.useEffect(() => {
    if (!isDragging.value) {
      const padding = avatarSize / 2;
      let clampedX = position.x;
      let clampedY = position.y;
      
      if (enableDragging) {
        // Only clamp draggable entities to visible area bounds (accounting for safe area insets and tab bar)
        const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
        const visibleAreaTop = insets.top;
        const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area
        clampedX = Math.max(padding, Math.min(SCREEN_WIDTH - padding, position.x));
        clampedY = Math.max(visibleAreaTop + padding, Math.min(visibleAreaBottom - padding, position.y));
      } else {
        // For non-draggable entities, only ensure they're not outside screen bounds (basic safety check)
        clampedX = Math.max(padding, Math.min(SCREEN_WIDTH - padding, position.x));
        clampedY = Math.max(padding, Math.min(SCREEN_HEIGHT - padding, position.y));
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
  }, [position.x, position.y, panX, panY, dragStartX, dragStartY, memoryAnimatedValues, isDragging, avatarSize, focusedX, focusedY, onPositionChange, enableDragging, fontScale, insets.top, insets.bottom]);
  
  React.useEffect(() => {
    if (!isFocused) {
      // Only float when not focused
      floatAnimation.value = withRepeat(
        withTiming(1, {
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      // Reset entity wheel when unfocused
      setShowEntityWheel(false);
    } else {
      // Stop floating when focused
      floatAnimation.value = 0;
    }

    return () => {
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatAnimation);
    };
  }, [floatAnimation, isFocused]);

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
        true // Reverse animation
      );
    } else {
      dragHandlePulse.value = 0;
    }
  }, [enableDragging, isFocused, dragHandlePulse]);
  
  // Animated style for drag handle pulse
  const dragHandleAnimatedStyle = useAnimatedStyle(() => {
    // Pulse: scale from 1 to 1.3 and back to 1
    // dragHandlePulse.value goes from 0 to 1 and back to 0
    const scale = 1 + (dragHandlePulse.value * 0.3);
    return {
      transform: [{ scale }],
    };
  });

  // Animate each memory to follow avatar with different speeds
  // Use a single reaction that handles all memories
  // Store memoryAnimatedValues in a ref so it can be accessed in worklet
  const memoryAnimatedValuesRef = useRef(memoryAnimatedValues);
  React.useEffect(() => {
    memoryAnimatedValuesRef.current = memoryAnimatedValues;
  }, [memoryAnimatedValues]);
  
  useAnimatedReaction(
    () => ({
      avatarX: panX.value,
      avatarY: panY.value,
    }),
    (current: { avatarX: number; avatarY: number }) => {
      'worklet';
      // Update each memory's position with its own spring parameters
      // The dramatic variation in damping/stiffness will create visible speed differences
      const values = memoryAnimatedValuesRef.current;
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
    }
  );


  // Animated style for container position - uses panX/panY to stay in sync with drag
  // Also clamp to ensure avatar stays fully visible (only for draggable entities)
  const avatarSizeForClamp = avatarSize; // Capture for worklet
  const enableDraggingForClamp = enableDragging; // Capture for worklet
  const visibleAreaTopForClamp = insets.top; // Capture for worklet
  const tabBarHeightForClamp = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale); // Capture for worklet
  const visibleAreaBottomForClamp = SCREEN_HEIGHT - tabBarHeightForClamp; // Capture for worklet
  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Ensure panX/panY are within bounds (double-check in case they weren't clamped)
    const padding = avatarSizeForClamp / 2;
    const clampedX = Math.max(padding, Math.min(SCREEN_WIDTH - padding, panX.value));
    let clampedY: number;
    
    if (enableDraggingForClamp) {
      // Only clamp draggable entities to visible area bounds
      clampedY = Math.max(visibleAreaTopForClamp + padding, Math.min(visibleAreaBottomForClamp - padding, panY.value));
    } else {
      // For non-draggable entities, only ensure they're not outside screen bounds
      clampedY = Math.max(padding, Math.min(SCREEN_HEIGHT - padding, panY.value));
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

  // Target position for focused state (State B - centered in visible viewport)
  const normalTargetY = SCREEN_HEIGHT / 2 + 80; // Lower the focused avatar by 80px
  const wheelTargetY = SCREEN_HEIGHT / 2 - 120; // Higher position for wheel mode (moved up from -40 to -120)
  const targetX = SCREEN_WIDTH / 2;
  const targetY = normalTargetY; // Will be animated based on wheelModeProgress

  // Update star center to match avatar's actual visual position
  useAnimatedReaction(
    () => {
      // Calculate the same interpolated position used in animatedStyle
      if (isFocused) {
        // Use focusedX/focusedY which represent the target position
        const currentX = startX.value + (focusedX.value - startX.value) * zoomProgress.value;
        const currentY = startY.value + (focusedY.value - startY.value) * zoomProgress.value;
        return { x: currentX, y: currentY };
      }
      return { x: position.x, y: position.y };
    },
    (result) => {
      starCenterX.value = result.x;
      starCenterY.value = result.y;
    }
  );

  // Sync showEntityWheel state with shared value for worklet reactivity
  React.useEffect(() => {
    showEntityWheelShared.value = showEntityWheel;
  }, [showEntityWheel, showEntityWheelShared]);

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

      // Start continuous orbit animation - slow rotation around entity
      // Each memory will use its base angle + this orbit angle to calculate position
      orbitAngle.value = 0;
      orbitAngle.value = withRepeat(
        withTiming(360, {
          duration: 60000, // 60 seconds (1 minute) for full rotation - slow and smooth
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false // Don't reverse
      );

      // Only set default selected moment type when first entering wheel mode
      if (wasWheelHidden) {
        setSelectedMomentType('lesson');
      }
    } else {
      wheelModeProgress.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
      });

      // Stop orbit animation
      cancelAnimation(orbitAngle);
      orbitAngle.value = 0; // Reset orbit angle
      cancelAnimation(wheelSpinRotation);
      wheelSpinRotation.value = 0; // Reset rotation

      setSelectedMomentType(null); // Reset selected icon
      // Return to normal focused position
      if (isFocused) {
        focusedY.value = withSpring(normalTargetY, {
          damping: 15,
          stiffness: 100,
        });
      }
    }

    // Update the ref to track the current state for next render
    previousShowEntityWheel.current = showEntityWheel;
  }, [showEntityWheel, isFocused, wheelModeProgress, wheelSpinRotation, focusedY, wheelTargetY, normalTargetY, memoryPositions, position.x, position.y, orbitAngle, targetX, starCenterX, starCenterY]);
  // Note: selectedMomentType is intentionally NOT in dependencies to avoid restarting animations when icon selection changes

  // Notify parent when entity wheel state changes
  React.useEffect(() => {
    if (onEntityWheelChange) {
      onEntityWheelChange(showEntityWheel && isFocused);
    }
  }, [showEntityWheel, isFocused, onEntityWheelChange]);

  // Clear floating moments immediately when moment type changes
  React.useEffect(() => {
    setFloatingMoments([]);
  }, [selectedMomentType]);

  // Spawn floating moments that grow from memories in entity wheel mode
  React.useEffect(() => {
    // Only spawn when entity wheel is active and not spinning
    // Also don't spawn if selectedWheelMoment popup is displayed
    if (!showEntityWheel || !isFocused || isWheelSpinningState || selectedWheelMoment) {
      setFloatingMoments([]);
      return;
    }

    // Collect all moments of selected type with their memory/moment indices
    const momentsWithPositions: Array<{
      memoryId: string;
      memoryIndex: number;
      momentIndex: number;
      momentType: 'lesson' | 'sunny' | 'cloudy';
      text: string;
      memoryImageUri?: string;
      memoryOffsetX: number;
      memoryOffsetY: number;
      memoryBaseAngle: number;
    }> = [];

    memories.forEach((memory, memoryIndex) => {
      // Get the memory's position data
      const memPosData = memoryPositions[memoryIndex];
      if (!memPosData) return;

      // Add moments based on selected type
      if (selectedMomentType === 'lesson' && memory.lessonsLearned) {
        memory.lessonsLearned.forEach((lesson: any, lessonIndex: number) => {
          momentsWithPositions.push({
            memoryId: memory.id,
            memoryIndex, // Store index to calculate position dynamically
            momentIndex: lessonIndex,
            momentType: 'lesson',
            text: lesson.text,
            memoryImageUri: memory.imageUri,
            memoryOffsetX: memPosData.offsetX,
            memoryOffsetY: memPosData.offsetY,
            memoryBaseAngle: memPosData.angle,
          });
        });
      } else if (selectedMomentType === 'sunny' && memory.goodFacts) {
        memory.goodFacts.forEach((sunny: any, sunnyIndex: number) => {
          momentsWithPositions.push({
            memoryId: memory.id,
            memoryIndex, // Store index to calculate position dynamically
            momentIndex: sunnyIndex,
            momentType: 'sunny',
            text: sunny.text,
            memoryImageUri: memory.imageUri,
            memoryOffsetX: memPosData.offsetX,
            memoryOffsetY: memPosData.offsetY,
            memoryBaseAngle: memPosData.angle,
          });
        });
      } else if (selectedMomentType === 'cloudy' && memory.hardTruths) {
        memory.hardTruths.forEach((cloudy: any, cloudyIndex: number) => {
          momentsWithPositions.push({
            memoryId: memory.id,
            memoryIndex, // Store index to calculate position dynamically
            momentIndex: cloudyIndex,
            momentType: 'cloudy',
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
      [momentsWithPositions[i], momentsWithPositions[j]] = [momentsWithPositions[j], momentsWithPositions[i]];
    }

    // Clear any existing timeouts from previous runs
    floatingMomentsTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    floatingMomentsTimeoutsRef.current = [];

    nextMomentIndexRef.current = 0;
    isSpawningNextRef.current = false;
    cycleIdRef.current++;
    restartScheduledRef.current = false;
    remainingBeforeRestartRef.current = 0;
    nextSlotRef.current = 0;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    // Initial concurrent moments: 3 for lessons, 4 for sunny, 2 for cloudy
    const INITIAL_CONCURRENT_MOMENTS = selectedMomentType === 'lesson' ? 3 : selectedMomentType === 'sunny' ? 4 : 2;
    const INITIAL_START_DELAY = 1000; // Wait 1 second after opening
    const INITIAL_STAGGER_DELAY = 600; // 600ms between each initial moment
    const GROW_DELAY = 400;
    const GROW_DURATION = 1400;
    const HOLD_DURATION = 3200;
    const SHRINK_DURATION = 1200;
    const TOTAL_DURATION = GROW_DELAY + GROW_DURATION + HOLD_DURATION + SHRINK_DURATION;
    const REMOVE_BUFFER_MS = 400;
    const CLOUDY_SPAWN_DELAY = 500;

    // For cloudy moments, spawn 2 at a time with delay between batches
    // For other moments, spawn concurrently (multiple at once)
    const isCloudyMoment = selectedMomentType === 'cloudy';

    const spawnSingleMoment = (momentIndex: number, delay: number = 0) => {
      if (momentIndex >= momentsWithPositions.length) return;
      
      // Don't spawn if selectedWheelMoment popup is displayed
      if (selectedWheelMoment) return;

      const timeout = setTimeout(() => {
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
        };

        setFloatingMoments(prev => {
          const isDuplicate = prev.some(m =>
            m.memoryIndex === newMoment.memoryIndex &&
            m.momentIndex === newMoment.momentIndex &&
            m.momentType === newMoment.momentType
          );
          if (isDuplicate) return prev;
          return [...prev, newMoment];
        });

        const removeTimeout = setTimeout(() => {
          if (cycleIdRef.current !== currentCycleId) {
            setFloatingMoments(prev => prev.filter(m => m.id !== newMoment.id));
            return;
          }
          momentAnimationStateMap.delete(momentIdentity);

          setFloatingMoments(prev => prev.filter(m => m.id !== newMoment.id));

          if (restartScheduledRef.current) {
            remainingBeforeRestartRef.current--;
            if (remainingBeforeRestartRef.current <= 0) {
              restartScheduledRef.current = false;
              remainingBeforeRestartRef.current = 0;
              const momentsToSpawn = Math.min(INITIAL_CONCURRENT_MOMENTS, momentsWithPositions.length);
              currentBatchSizeRef.current = momentsToSpawn;
              nextSlotRef.current = 0;
              cycleIdRef.current++;
              nextMomentIndexRef.current = 0;
              setFloatingMoments([]);
              for (let i = 0; i < momentsToSpawn; i++) {
                spawnSingleMoment(i, INITIAL_START_DELAY + (i * INITIAL_STAGGER_DELAY));
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
              if (cycleIdRef.current !== currentCycleId) {
                isSpawningNextRef.current = false;
                return;
              }
              isSpawningNextRef.current = false;
              if (!selectedWheelMoment) spawnSingleMoment(nextIndex, 0);
            }, delayAfterShrink);
            floatingMomentsTimeoutsRef.current.push(nextSpawnTimeout);
          } else {
            // Run out: wait for remaining moments to finish shrink and be removed, then restart.
            const momentsToSpawnThisCycle = Math.min(INITIAL_CONCURRENT_MOMENTS, momentsWithPositions.length);
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

    const momentsToSpawn = Math.min(INITIAL_CONCURRENT_MOMENTS, momentsWithPositions.length);
    currentBatchSizeRef.current = momentsToSpawn;
    nextSlotRef.current = 0;
    for (let i = 0; i < momentsToSpawn; i++) {
      spawnSingleMoment(i, INITIAL_START_DELAY + (i * INITIAL_STAGGER_DELAY));
      nextMomentIndexRef.current = i + 1;
    }

    return () => {
      // Clear all timeouts to prevent moments from spawning after cleanup
      timeouts.forEach(timeout => clearTimeout(timeout));
      floatingMomentsTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      floatingMomentsTimeoutsRef.current = [];
      // Reset next moment index and lock
      nextMomentIndexRef.current = 0;
      isSpawningNextRef.current = false;
      cycleIdRef.current++; // Increment cycle to invalidate any pending completions
      // Also clear floatingMoments to prevent stale moments from appearing
      setFloatingMoments([]);
    };
  }, [showEntityWheel, isFocused, isWheelSpinningState, selectedMomentType, memories, memoryPositions, starCenterX, starCenterY, orbitAngle, isTablet, selectedWheelMoment]);

  // Pulse animation when entering focused view to indicate avatar is clickable
  // Initialize to false so we detect the first focused render as a transition
  const previousIsFocused = useRef(false);
  const hasInitialPulseRun = useRef(false);

  React.useEffect(() => {
    // Detect transition from unfocused to focused (entering focused view)
    // OR first render when already focused (e.g., clicking friend from spheres view)
    if (isFocused && (!previousIsFocused.current || !hasInitialPulseRun.current)) {
      // Pulse 3 times: scale up slightly then back to normal
      avatarPulseScale.value = withSequence(
        withTiming(1.08, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.08, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.08, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) })
      );
      hasInitialPulseRun.current = true;
    } else if (!isFocused) {
      // Reset pulse when leaving focused view
      avatarPulseScale.value = 1;
      hasInitialPulseRun.current = false; // Reset so next focus triggers pulse
    }

    // Update ref for next render
    previousIsFocused.current = isFocused;
  }, [isFocused, avatarPulseScale]);

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
    const isTransitioningToFocused = isFocused && (prevIsFocused === false || (prevIsFocused === undefined && isFocused));
    
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
    }
    // Update ref AFTER checking for transitions
    prevIsFocusedRef.current = isFocused;
  }, [isFocused, position.x, position.y, startX, startY, zoomProgress, zoomScale, focusedX, focusedY, baseScale, focusedScale, targetX, targetY]);
  
  React.useEffect(() => {
    if (isFocused) {
      const currentProgress = zoomProgress.value;
      const currentScale = zoomScale.value;
      
      // Check if animation is already running (zoomProgress should be > 0 if useLayoutEffect started it)
      // Also check if animation was already started by useLayoutEffect
      // If zoomProgress is still 0 and animation wasn't started, useLayoutEffect didn't start it, so start it here
      if (currentProgress === 0 && currentScale === baseScale && !animationStartedForFocusRef.current) {
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
  }, [isFocused, position.x, position.y, zoomProgress, zoomScale, startX, startY, focusedX, focusedY, focusedScale, baseScale, targetX, targetY]);

  // Select random moment after wheel spin
  const selectRandomMoment = React.useCallback(() => {
    const allMoments: { type: 'lesson' | 'sunny' | 'cloudy'; text: string; memoryId: string; momentId?: string; memoryImageUri?: string }[] = [];

    memories.forEach((memory) => {
      if (selectedMomentType === 'lesson' && memory.lessonsLearned) {
        memory.lessonsLearned.forEach((lesson: { id: string; text: string }) => {
          allMoments.push({ type: 'lesson', text: lesson.text, memoryId: memory.id, momentId: lesson.id, memoryImageUri: memory.imageUri });
        });
      }
      if (selectedMomentType === 'sunny' && memory.goodFacts) {
        memory.goodFacts.forEach((fact: { id: string; text: string }) => {
          allMoments.push({ type: 'sunny', text: fact.text, memoryId: memory.id, momentId: fact.id, memoryImageUri: memory.imageUri });
        });
      }
      if (selectedMomentType === 'cloudy' && memory.hardTruths) {
        memory.hardTruths.forEach((truth: { id: string; text: string }) => {
          allMoments.push({ type: 'cloudy', text: truth.text, memoryId: memory.id, momentId: truth.id, memoryImageUri: memory.imageUri });
        });
      }
    });

    if (allMoments.length > 0) {
      const randomIndex = Math.floor(Math.random() * allMoments.length);
      setSelectedWheelMoment(allMoments[randomIndex]);
    }
  }, [memories, selectedMomentType]);

  // Clear floating moments when selectedWheelMoment popup appears
  React.useEffect(() => {
    if (selectedWheelMoment) {
      setFloatingMoments([]);
    }
  }, [selectedWheelMoment]);

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
  }, [selectedWheelMoment, popupAnimProgress, popupScale, popupOpacity]);

  // Update entity wheel button selection states when selectedMomentType changes
  React.useEffect(() => {
    entityLessonButtonSelection.value = withSpring(selectedMomentType === 'lesson' ? 1 : 0, { damping: 15, stiffness: 150 });
    entitySunnyButtonSelection.value = withSpring(selectedMomentType === 'sunny' ? 1 : 0, { damping: 15, stiffness: 150 });
    entityCloudyButtonSelection.value = withSpring(selectedMomentType === 'cloudy' ? 1 : 0, { damping: 15, stiffness: 150 });

    // Cancel any ongoing animations and reset all highlight and press scale values to prevent lingering press effects
    cancelAnimation(entityLessonButtonHighlight);
    cancelAnimation(entitySunnyButtonHighlight);
    cancelAnimation(entityCloudyButtonHighlight);
    cancelAnimation(entityLessonButtonPressScale);
    cancelAnimation(entitySunnyButtonPressScale);
    cancelAnimation(entityCloudyButtonPressScale);

    entityLessonButtonHighlight.value = 0;
    entitySunnyButtonHighlight.value = 0;
    entityCloudyButtonHighlight.value = 0;
    entityLessonButtonPressScale.value = 1;
    entitySunnyButtonPressScale.value = 1;
    entityCloudyButtonPressScale.value = 1;
  }, [selectedMomentType, entityLessonButtonSelection, entitySunnyButtonSelection, entityCloudyButtonSelection, entityLessonButtonHighlight, entitySunnyButtonHighlight, entityCloudyButtonHighlight, entityLessonButtonPressScale, entitySunnyButtonPressScale, entityCloudyButtonPressScale]);

  // Avatar pulse animated style for indicating clickability
  const avatarPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: avatarPulseScale.value }],
    };
  });

  // Entity wheel button animated styles (matching main wheel liquid glass effect)
  const entityLessonButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      entityLessonButtonSelection.value,
      [0, 1],
      [
        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        colors.primary
      ]
    );
    const borderWidth = entityLessonButtonSelection.value * 2;

    return {
      transform: [{ scale: entityLessonButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: colors.primary,
    };
  });

  const entityLessonHighlightStyle = useAnimatedStyle(() => {
    return { opacity: entityLessonButtonHighlight.value * 0.4 };
  });

  const entitySunnyButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      entitySunnyButtonSelection.value,
      [0, 1],
      [
        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        colors.primary
      ]
    );
    const borderWidth = entitySunnyButtonSelection.value * 2;

    return {
      transform: [{ scale: entitySunnyButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: colors.primary,
    };
  });

  const entitySunnyHighlightStyle = useAnimatedStyle(() => {
    return { opacity: entitySunnyButtonHighlight.value * 0.4 };
  });

  const entityCloudyButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      entityCloudyButtonSelection.value,
      [0, 1],
      [
        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        colors.primary
      ]
    );
    const borderWidth = entityCloudyButtonSelection.value * 2;

    return {
      transform: [{ scale: entityCloudyButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: colors.primary,
    };
  });

  const entityCloudyHighlightStyle = useAnimatedStyle(() => {
    return { opacity: entityCloudyButtonHighlight.value * 0.4 };
  });

  // Popup animated style - must be defined at top level, not inside conditional
  const popupAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
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
    if (!showEntityWheel || !isFocused) return null;

    // Calculate icon button exclusion zones
    const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
    const iconY = SCREEN_HEIGHT - tabBarHeight - 60;
    const iconSize = 60;
    const spacing = 85;

    const iconPositions = [
      { x: SCREEN_WIDTH / 2 - spacing, y: iconY }, // lesson
      { x: SCREEN_WIDTH / 2, y: iconY }, // sunny
      { x: SCREEN_WIDTH / 2 + spacing, y: iconY }, // cloudy
    ];

    const isTouchOnIcon = (x: number, y: number) => {
      return iconPositions.some(icon => {
        const dx = x - icon.x;
        const dy = y - icon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < iconSize / 2 + 10; // Add 10px padding for easier touch
      });
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Use pageX/pageY for absolute screen coordinates
        const { pageX, pageY } = evt.nativeEvent;

        // Don't capture if touch is on icon buttons
        if (isTouchOnIcon(pageX, pageY)) {
          return false;
        }
        return true;
      },
      onMoveShouldSetPanResponder: (evt) => {
        // Use pageX/pageY for absolute screen coordinates
        const { pageX, pageY } = evt.nativeEvent;

        // Don't capture if touch is on icon buttons
        if (isTouchOnIcon(pageX, pageY)) {
          return false;
        }
        return true;
      },
      onPanResponderGrant: (evt) => {
        // Stop the automatic rotation animation
        cancelAnimation(orbitAngle);
        isWheelSpinning.value = false;
        runOnJS(setIsWheelSpinningState)(false);
        wheelVelocity.value = 0;
        wheelDragFrameCount.value = 0;

        // Calculate initial angle from center
        const touch = evt.nativeEvent;
        const centerX = SCREEN_WIDTH / 2;
        const centerY = wheelTargetY;
        const dx = touch.pageX - centerX;
        const dy = touch.pageY - centerY;
        wheelStartAngle.value = Math.atan2(dy, dx);
        wheelLastAngle.value = wheelStartAngle.value;

        // Clear any existing popup when starting a new spin
        setSelectedWheelMoment(null);
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

        // Acceleration curve: start slow, then speed up (same as main wheel)
        // Use frame count to simulate time (assuming ~60fps, 45 frames = ~750ms)
        const targetFrames = 45; // Frames to reach full speed (slower acceleration)
        const accelerationFactor = Math.min(1, wheelDragFrameCount.value / targetFrames);
        // Apply easing curve for smoother acceleration (ease-out cubic)
        const easedAcceleration = 1 - Math.pow(1 - accelerationFactor, 3);

        // Apply acceleration to delta angle
        // Start at 30% speed, gradually reach 80% over ~750ms (reduced max speed)
        const acceleratedDelta = deltaAngle * (0.3 + easedAcceleration * 0.5);

        // Convert to degrees for orbitAngle
        const deltaDeg = (acceleratedDelta * 180) / Math.PI;

        orbitAngle.value = orbitAngle.value + deltaDeg;
        wheelVelocity.value = deltaDeg; // Track velocity for momentum in degrees
        wheelLastAngle.value = currentAngle;
      },
      onPanResponderRelease: () => {
        // Reset frame counter
        wheelDragFrameCount.value = 0;

        // Apply decay animation based on velocity
        isWheelSpinning.value = true;
        runOnJS(setIsWheelSpinningState)(true);
        const velocity = wheelVelocity.value;

        // Reduced momentum multiplier for slower peak speed
        const velocityMagnitude = Math.abs(velocity);
        // Scale from 15x to 45x based on velocity (increased for more responsive spinning)
        const momentumMultiplier = 15.0 + Math.min(velocityMagnitude * 4, 30.0);
        const amplifiedVelocity = velocity * momentumMultiplier;

        if (Math.abs(velocity) > 0.05) { // Very low threshold - trigger on minimal movement
          // Moderate travel distance
          const targetAngle = orbitAngle.value + amplifiedVelocity * 2.3;

          // Use a custom easing curve: slow start (ease in), fast middle, slow end (ease out)
          orbitAngle.value = withSequence(
            withTiming(targetAngle, {
              duration: 3000, // Longer duration for more spinning
              easing: Easing.out(Easing.cubic), // Decelerate smoothly
            }),
            withTiming(targetAngle, {
              duration: 0,
            }, (finished) => {
              'worklet';
              if (finished) {
                isWheelSpinning.value = false;
                runOnJS(setIsWheelSpinningState)(false);
                // Select random moment on JS thread
                runOnJS(selectRandomMoment)();

                // Restart automatic slow orbit from current position
                orbitAngle.value = withRepeat(
                  withTiming(orbitAngle.value + 360, {
                    duration: 60000,
                    easing: Easing.linear,
                  }),
                  -1,
                  false
                );
              }
            })
          );
        } else {
          isWheelSpinning.value = false;
          runOnJS(setIsWheelSpinningState)(false);

          // Restart automatic slow orbit from current position
          orbitAngle.value = withRepeat(
            withTiming(orbitAngle.value + 360, {
              duration: 60000,
              easing: Easing.linear,
            }),
            -1,
            false
          );
        }

        wheelVelocity.value = 0;
      },
    });
  }, [showEntityWheel, isFocused, wheelVelocity, isWheelSpinning, wheelTargetY, fontScale, insets.bottom, orbitAngle, selectRandomMoment, wheelDragFrameCount, wheelLastAngle, wheelStartAngle]);

  // No container rotation - each memory will animate individually
  // This is now just a placeholder for potential future container-level styles
  const memoriesOrbitRotation = useAnimatedStyle(() => {
    'worklet';
    // No transform - memories handle their own orbital movement
    return {};
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
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
      currentX = focusedX.value + (endPosX - focusedX.value) * (1 - zoomProgress.value);
      currentY = focusedY.value + (endPosY - focusedY.value) * (1 - zoomProgress.value);
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
    const floatOffset = zoomProgress.value === 0 ? floatAnimation.value * 6 : 0;
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

  // Calculate memory positions based on current animated position
  const memoryPositions = useMemo(() => {
    // Calculate max moments count to normalize distances
    const maxMomentsCount = Math.max(...memories.map(m => 
      ((m.hardTruths || []).length + (m.goodFacts || []).length + (m.lessonsLearned || []).length)
    ), 1);
    const minMomentsCount = Math.min(...memories.map(m => 
      ((m.hardTruths || []).length + (m.goodFacts || []).length + (m.lessonsLearned || []).length)
    ), 0);
    
    // Pre-calculate all angles to identify the top 2 elements (only if more than 5 elements)
    const topTwoIndices = isFocused && memories.length > 5 ? (() => {
      const topAngle = -Math.PI / 2; // Top position
      const allAngles = memories.map((_, idx) => {
        const baseAngle = (idx * 2 * Math.PI) / memories.length;
        const seed = idx * 0.618;
        const angleVar = (Math.cos(seed * 2) * 0.15);
        return baseAngle + angleVar;
      });
      
      // Find distances from top angle for all elements
      const distancesFromTop = allAngles.map(angle => {
        const diff = Math.abs(angle - topAngle);
        return Math.min(diff, 2 * Math.PI - diff);
      });
      
      // Sort by distance and get the indices of the top 2 closest elements
      return distancesFromTop
        .map((dist, idx) => ({ dist, idx }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2)
        .map(item => item.idx);
    })() : [];
    
    // Calculate maximum safe radius based on avatar position and viewport boundaries
    // Memory size: account for tablets (68px focused, 45px unfocused on tablets; 45px focused, 30px unfocused on phones)
    const memorySize = isFocused ? (isTablet ? 68 : 45) : (isTablet ? 45 : 30);
    const memoryRadiusSize = memorySize / 2; // Half the memory size
    const safetyPadding = isTablet ? 38 : 10; // Larger padding on tablets to match the increased sizes
    
    // Calculate distances from avatar center to each viewport edge
    const distanceToTop = position.y;
    const distanceToBottom = SCREEN_HEIGHT - position.y;
    const distanceToLeft = position.x;
    const distanceToRight = SCREEN_WIDTH - position.x;
    
    // Maximum safe radius is the minimum distance to any edge, minus memory radius and padding
    // Calculate minimum required radius: avatar radius + memory radius + padding to ensure memories float around avatar
    const avatarRadius = avatarSize / 2;
    const memoryRadiusForSpacing = memoryRadiusSize; // Half the memory size
    // Increase spacing padding when focused to ensure memories are clearly separated from avatar
    // When there are more than 5 memories, push them further out
    const baseSpacingPadding = isFocused ? 30 : 20; // More padding when focused (30px) vs unfocused (20px)
    const extraSpacingForManyMemories = isFocused && memories.length > 5 ? 25 : 0; // Extra spacing when more than 5 memories (increased from 15 to 25)
    const spacingPadding = baseSpacingPadding + extraSpacingForManyMemories;
    const minRequiredRadius = avatarRadius + memoryRadiusForSpacing + spacingPadding; // Ensure memories are clearly outside avatar
    
    const maxSafeRadius = Math.max(
      minRequiredRadius,
      Math.min(
        distanceToTop,
        distanceToBottom,
        distanceToLeft,
        distanceToRight
      ) - memoryRadiusSize - safetyPadding
    );
    
    return memories.map((memory, memIndex) => {
      // Calculate moment count for this memory
      const momentCount = (memory.hardTruths || []).length + (memory.goodFacts || []).length + (memory.lessonsLearned || []).length;
      
      // Calculate distance multiplier based on moments (more moments = further)
      let momentsDistanceMultiplier = 1.0;
      if (maxMomentsCount > minMomentsCount) {
        // Normalize to 0-1 range based on min/max
        const momentsFactor = (momentCount - minMomentsCount) / (maxMomentsCount - minMomentsCount);
        // Scale from 0.7x (fewest moments) to 1.8x (most moments) for clear distance difference
        momentsDistanceMultiplier = 0.7 + (momentsFactor * 1.1); // Range: 0.7 to 1.8
      }
      
      // Add unique variation for each memory to ensure different distances
      // Use a deterministic seed based on memory index for consistency
      const variationSeed = memIndex * 0.618; // Golden ratio for better distribution
      // Add ±10% variation to ensure each memory has a unique distance
      const distanceVariation = 0.9 + (Math.sin(variationSeed) * 0.2); // Range: 0.9 to 1.1
      
      // Combine moment-based distance with unique variation
      let variedRadius = memoryRadius * momentsDistanceMultiplier * distanceVariation;
      
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
      } else if (isFocused && memories.length > 5 && topTwoIndices.includes(memIndex)) {
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
      const angleVariation = (Math.cos(variationSeed * 2) * 0.15); // ±15% angle variation
      const variedAngle = angle + angleVariation;
      
      // CRITICAL: Calculate maximum safe radius for this specific angle
      // We need to ensure the memory circle (center + radius) stays fully within viewport
      const cosAngle = Math.cos(variedAngle);
      const sinAngle = Math.sin(variedAngle);
      
      // Calculate maximum radius based on horizontal constraint (X direction)
      let maxRadiusX: number;
      if (cosAngle > 0) {
        // Moving right - limited by right edge
        maxRadiusX = (distanceToRight - memoryRadiusSize - safetyPadding) / Math.abs(cosAngle);
      } else if (cosAngle < 0) {
        // Moving left - limited by left edge
        maxRadiusX = (distanceToLeft - memoryRadiusSize - safetyPadding) / Math.abs(cosAngle);
      } else {
        // cosAngle === 0, moving vertically only
        maxRadiusX = Infinity;
      }
      
      // Calculate maximum radius based on vertical constraint (Y direction)
      let maxRadiusY: number;
      if (sinAngle > 0) {
        // Moving down - limited by bottom edge
        maxRadiusY = (distanceToBottom - memoryRadiusSize - safetyPadding) / Math.abs(sinAngle);
      } else if (sinAngle < 0) {
        // Moving up - limited by top edge
        maxRadiusY = (distanceToTop - memoryRadiusSize - safetyPadding) / Math.abs(sinAngle);
      } else {
        // sinAngle === 0, moving horizontally only
        maxRadiusY = Infinity;
      }
      
      // The maximum safe radius is the minimum of both constraints
      // Use the same minimum radius calculation to ensure memories float around avatar
      const maxRadiusInDirection = Math.max(
        minRequiredRadius,
        Math.min(maxRadiusX, maxRadiusY, maxSafeRadius)
      );
      
      // Clamp variedRadius to ensure memory stays fully visible, but never go below minimum
      // This ensures memories are always positioned outside the avatar, floating around it
      variedRadius = Math.max(minRequiredRadius, Math.min(variedRadius, maxRadiusInDirection));
      
      const offsetX = variedRadius * cosAngle;
      const offsetY = variedRadius * sinAngle;
      
      return {
        angle: variedAngle,
        offsetX: offsetX,
        offsetY: offsetY,
      };
    });
  }, [memories, memoryRadius, isFocused, isTablet, position, profile.id, profile.name]);

  return (
    <View
      ref={viewShotRef}
      collapsable={false}
      style={{
        position: 'absolute',
        left: captureWrapperBounds.left,
        top: captureWrapperBounds.top,
        width: captureWrapperBounds.width,
        height: captureWrapperBounds.height,
        pointerEvents: 'box-none',
        backgroundColor: 'transparent',
      }}
    >
      {/* Draggable container wrapping avatar and memories */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            zIndex: 100, // Much higher z-index to ensure avatars are always on top and interactive
            pointerEvents: 'box-none', // Container doesn't block touches - children handle them
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
              position: 'absolute',
              left: SCREEN_WIDTH - avatarSize / 2,
              top: SCREEN_HEIGHT - avatarSize / 2,
              zIndex: 100,
              pointerEvents: 'auto', // Avatar can receive touches
            },
          ]}
          {...(panResponder?.panHandlers || {})} // Attach panResponder to avatar, not container
        >
          <Pressable
            style={{ pointerEvents: 'auto' }} // Always allow press events
            onPress={() => {
              // Only trigger onPress if we didn't drag
              // Use a small delay to check if drag started (PanResponder needs time to set the flag)
              setTimeout(() => {
                if (!dragStartedRef.current && !isDragging.value) {
                  // If entity is focused, toggle entity wheel mode
                  if (isFocused) {
                    setShowEntityWheel(!showEntityWheel);
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
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                },
                avatarPulseStyle,
              ]}
            >
              {/* SVG Progress Bar */}
              <Svg
                width={avatarSize + borderWidth * 2}
                height={avatarSize + borderWidth * 2}
                style={{ position: 'absolute' }}
              >
                {/* Background circle (cloudy/dark) - thicker */}
                <Circle
                  cx={(avatarSize + borderWidth * 2) / 2}
                  cy={(avatarSize + borderWidth * 2) / 2}
                  r={radius}
                  stroke="#000000" // Black for cloudy moments
                  strokeWidth={borderWidth + 2} // Thicker black border
                  fill="none"
                />
                {/* Progress circle (sunny/yellow) */}
                <Circle
                  cx={(avatarSize + borderWidth * 2) / 2}
                  cy={(avatarSize + borderWidth * 2) / 2}
                  r={radius}
                  stroke="#FFD700" // Yellow for sunny moments
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
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  shadowColor: '#000',
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
                      width: '100%',
                      height: '100%',
                      borderRadius: avatarSize / 2,
                    }}
                    contentFit="cover"
                  />
                ) : (
                  <ThemedText weight="bold" style={{ color: '#fff', fontSize: 24 }}>
                    {initials}
                  </ThemedText>
                )}
              </View>

              {/* Drag handle icon overlay - shown when dragging is enabled and not focused */}
              {enableDragging && !isFocused && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      padding: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 5,
                    },
                    dragHandleAnimatedStyle,
                  ]}
                >
                  <MaterialIcons name="drag-indicator" size={16} color="#fff" />
                </Animated.View>
              )}
            </Animated.View>
          </Pressable>

          {/* Share button - positioned outside the Pressable, shown when entity is focused and has memories (but not in entity wheel mode) */}
          {isFocused && memories.length > 0 && !isCapturingImage && !showEntityWheel && (
            <>
              <Pressable
                onPress={() => setShowShareMenu(!showShareMenu)}
                style={{
                  position: 'absolute',
                  top: 8, // Position at top-right corner, very close to avatar
                  left: avatarSize + borderWidth * 2 - 24, // Position very close to avatar's right edge
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 20,
                  borderWidth: 2,
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)',
                  shadowColor: '#000',
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
                    position: 'absolute',
                    top: 50, // Closer to share button
                    right: -10, // Align right edge with share button
                    backgroundColor: colorScheme === 'dark' ? 'rgba(26, 35, 50, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                    borderRadius: 16,
                    padding: 4,
                    zIndex: 21,
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? 'rgba(100, 181, 246, 0.3)' : 'rgba(100, 181, 246, 0.2)',
                    shadowColor: colorScheme === 'dark' ? '#64B5F6' : '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.25,
                    shadowRadius: 16,
                    elevation: 12,
                    width: 200,
                  }}
                >
                  <Pressable
                    onPress={async () => {
                      try {
                        // Format all memories for this entity as text
                        const entityName = profile.name || 'Entity';
                        let message = `${entityName}\n\n`;

                        memories.forEach((memory, index) => {
                          message += `${index + 1}. ${memory.title || 'Memory'}\n`;

                          if (memory.goodFacts && memory.goodFacts.length > 0) {
                            message += '   ☀️ Sunny Moments:\n';
                            memory.goodFacts.forEach((fact: any, factIndex: number) => {
                              const text = typeof fact === 'string' ? fact : fact.text || fact.content || String(fact);
                              message += `   ${factIndex + 1}. ${text}\n`;
                            });
                          }

                          if (memory.hardTruths && memory.hardTruths.length > 0) {
                            message += '   ☁️ Hard Truths:\n';
                            memory.hardTruths.forEach((truth: any, truthIndex: number) => {
                              const text = typeof truth === 'string' ? truth : truth.text || truth.content || String(truth);
                              message += `   ${truthIndex + 1}. ${text}\n`;
                            });
                          }

                          if (memory.lessonsLearned && memory.lessonsLearned.length > 0) {
                            message += '   💡 Lessons Learned:\n';
                            memory.lessonsLearned.forEach((lesson: any, lessonIndex: number) => {
                              const text = typeof lesson === 'string' ? lesson : lesson.text || lesson.content || String(lesson);
                              message += `   ${lessonIndex + 1}. ${text}\n`;
                            });
                          }

                          message += '\n';
                        });

                        // Open modal with content
                        setShareModalContent({
                          title: entityName,
                          message: message.trim(),
                        });
                        setShareModalVisible(true);
                        setShowShareMenu(false);
                      } catch (error) {
                        logError('HomeScreen:ShareContentText', error);
                      }
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      marginVertical: 2,
                      marginHorizontal: 4,
                      borderRadius: 12,
                      backgroundColor: pressed
                        ? (colorScheme === 'dark' ? 'rgba(100, 181, 246, 0.15)' : 'rgba(100, 181, 246, 0.1)')
                        : 'transparent',
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: colorScheme === 'dark' ? 'rgba(100, 181, 246, 0.15)' : 'rgba(100, 181, 246, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="text-fields" size={20} color="#64B5F6" />
                    </View>
                    <ThemedText size="sm" style={{ marginLeft: 12, fontWeight: '500' }}>Share as Text</ThemedText>
                  </Pressable>

                  <View style={{
                    height: 1,
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    marginHorizontal: 8,
                    marginVertical: 4,
                  }} />

                  <Pressable
                    onPress={async () => {
                      try {
                        setShowShareMenu(false);
                        setShowGifAnimation(true);
                      } catch (error) {
                        logError('HomeScreen:ShareAnimation', error);
                      }
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      marginVertical: 2,
                      marginHorizontal: 4,
                      borderRadius: 12,
                      backgroundColor: pressed
                        ? (colorScheme === 'dark' ? 'rgba(100, 181, 246, 0.15)' : 'rgba(100, 181, 246, 0.1)')
                        : 'transparent',
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: colorScheme === 'dark' ? 'rgba(100, 181, 246, 0.15)' : 'rgba(100, 181, 246, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="videocam" size={20} color="#64B5F6" />
                    </View>
                    <ThemedText size="sm" style={{ marginLeft: 12, fontWeight: '500' }}>View {profile.name}'s Story</ThemedText>
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
            position: 'absolute',
            left: 0,
            top: 0,
            width: SCREEN_WIDTH * 2,
            height: SCREEN_HEIGHT * 2,
            pointerEvents: showEntityWheel && isFocused ? 'auto' : 'box-none',
          },
          memoriesOrbitRotation
        ]}
        {...(() => {
          const handlers = showEntityWheel && isFocused && wheelPanResponder ? wheelPanResponder.panHandlers : {};
          return handlers;
        })()}
      >
      {useMemo(() => {
        // Always show all memories - they should be visible around profiles at all times
        const filteredMemories = memories.filter((memory) => {
          // If a memory is focused, only show that specific memory
          if (focusedMemory) {
            const mem = focusedMemory as { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere };
            if (mem.profileId === profile.id || mem.jobId === profile.id || mem.familyMemberId === profile.id || mem.friendId === profile.id || mem.hobbyId === profile.id) {
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
        
        const renderedMemories = filteredMemories.map((memory, memIndex) => {
        // Find the original index in the full memories array for position calculation
        const originalIndex = memories.findIndex(m => m.id === memory.id);
        const memPosData = memoryPositions[originalIndex];

        // Safety check: if we have more memories than animated values, use the last available one
        const memAnimatedValues = memoryAnimatedValues[originalIndex] || memoryAnimatedValues[memoryAnimatedValues.length - 1];
        
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
        const cloudSize = isFocused ? (isTablet ? 18 : 12) : (isTablet ? 36 : 24);
        const sunSize = isFocused ? (isTablet ? 15 : 10) : (isTablet ? 33 : 22);
        const maxMomentSize = Math.max(cloudSize, sunSize);
        // Calculate moment radius to ensure moments are outside memory circle border
        // Use estimated memory size for calculation (will be refined later)
        // Estimate: when focused, memory is ~32-42% of avatar size, when unfocused it's ~40-75px
        const estimatedMemorySize = isFocused 
          ? focusedAvatarSize * 0.37 // Average of 32% and 42%
          : (isTablet ? 60 : 40); // Average estimate for unfocused
        const estimatedMemoryRadius = estimatedMemorySize / 2;
        const momentSize = isFocused ? (isTablet ? 18 : 12) : (isTablet ? 36 : 24);
        const momentRadiusSize = momentSize / 2;
        const momentPadding = 8; // Padding to ensure moments are clearly outside memory border
        
        // Base radius: memory radius + moment radius + padding
        const baseMomentRadius = estimatedMemoryRadius + momentRadiusSize + momentPadding;
        
        const cloudRadius = isFocused 
          ? (isTablet ? baseMomentRadius + 20 : baseMomentRadius + 15) 
          : (isTablet ? 38 : 25);
        const sunRadius = isFocused 
          ? (isTablet ? baseMomentRadius + 18 : baseMomentRadius + 13) 
          : (isTablet ? 33 : 22);
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
        const minDistanceToEdge = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
        
        // Calculate maximum memory size that fits for this specific memory position
        // Total distance from memory center to furthest moment edge = memorySize/2 + maxMomentRadius + maxMomentSize/2
        // We need: memorySize/2 + maxMomentRadius + maxMomentSize/2 <= minDistanceToEdge
        // Solving for memorySize: memorySize <= 2 * (minDistanceToEdge - maxMomentRadius - maxMomentSize/2 - padding)
        const padding = 30; // Extra safety padding to ensure nothing goes outside viewport
        const availableSpace = minDistanceToEdge - maxMomentRadius - maxMomentSize / 2 - padding;
        // Cap the maximum memory size - when focused, max should be around 50px (half of previous)
        const maxAllowedSize = isFocused ? focusedAvatarSize * 0.5 : 100; // 50px when focused, 100px otherwise
        const calculatedMaxMemorySize = Math.max(20, Math.min(availableSpace * 2, maxAllowedSize));
        
        // Calculate moment count for this memory to scale size
        const momentCount = (memory.hardTruths || []).length + (memory.goodFacts || []).length + (memory.lessonsLearned || []).length;
        
        // Calculate min and max moment counts across all memories for scaling
        const allMomentCounts = memories.map(m => 
          ((m.hardTruths || []).length + (m.goodFacts || []).length + (m.lessonsLearned || []).length)
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
            const momentsFactor = (momentCount - minMomentsCount) / (maxMomentsCount - minMomentsCount);
            // Scale from 32px (fewest moments) to 42px (most moments, 42% of avatar)
            const maxSize = focusedAvatarSize * 0.42; // 42px (42% of 100px avatar, increased from 38px)
            baseMemorySize = baseSize + (momentsFactor * (maxSize - baseSize)); // Range: 32 to 42
          } else {
            // All memories have same moment count, use base size (32% of avatar)
            baseMemorySize = baseSize; // 32px
          }
        } else {
          // Not focused, use smaller size (scale for tablets)
          baseMemorySize = isTablet ? 75 : 40; // Smaller on non-tablet devices
        }
        
        const memorySize = Math.min(baseMemorySize, calculatedMaxMemorySize);

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
            showEntityWheelShared={showEntityWheelShared}
            isFocused={isFocused}
            colorScheme={colorScheme}
            calculatedMemorySize={memorySize}
            isMemoryFocused={(focusedMemory?.profileId === profile.id || focusedMemory?.jobId === profile.id) && focusedMemory?.memoryId === memory.id}
            memorySlideOffset={memorySlideOffset}
            showEntityWheel={showEntityWheel} // Pass showEntityWheel for synchronous checking
            showEntityWheelRef={showEntityWheelRef} // Pass ref for absolute latest value
            onPress={showEntityWheel ? undefined : onPress}
            onMemoryFocus={showEntityWheel ? undefined : onMemoryFocus}
            zoomProgress={zoomProgress}
            avatarStartX={startX}
            avatarStartY={startY}
            avatarTargetX={targetX}
            avatarTargetY={targetY}
            avatarPosition={position}
            focusedMemory={focusedMemory}
          />
        );
        });
        
        return renderedMemories;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [memories, focusedMemory, profile.id, isFocused, showEntityWheel, memoryPositions, memoryAnimatedValues, position.x, position.y, startX, startY, targetX, targetY, zoomProgress, colorScheme, memorySlideOffset, onPress, onMemoryFocus])}
      </Animated.View>
      </Animated.View>

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={shareModalContent.title}
        content={shareModalContent.message}
      />

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
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            justifyContent: 'center',
            alignItems: 'center',
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
                  flexDirection: 'row',
                  marginTop: 24,
                  gap: 16,
                }}
              >
                <Pressable
                  onPress={() => setImagePreviewUri(null)}
                  style={{
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    Cancel
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    try {
                      if (imagePreviewUri) {
                        await Sharing.shareAsync(imagePreviewUri, {
                          mimeType: 'image/png',
                          dialogTitle: 'Share image',
                        });
                        setImagePreviewUri(null);
                      }
                    } catch (error) {
                      logError('HomeScreen:SharePreviewImage', error);
                    }
                  }}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
                  <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
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
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {profile && (
            <GifAnimationPreview
              entity={{
                id: profile.id,
                name: profile.name,
                imageUri: profile.imageUri,
                type: profile.type || 'relationship',
              }}
              memories={memories}
              onClose={() => setShowGifAnimation(false)}
            />
          )}
        </View>
      </Modal>

      {/* Wheel Mode UI - moment type icons positioned around entity like wheel of life */}
      {showEntityWheel && isFocused && (
        <View style={{ position: 'absolute', width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: 'center', pointerEvents: 'box-none', zIndex: 400 }}>
          {/* 3 moment type icons at bottom - matching wheel of life liquid glass style */}
          {(() => {
            const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
            const iconY = SCREEN_HEIGHT - tabBarHeight - 60; // Moved up: 60px above tab bar (was 20px)
            const iconSize = 60; // Match main wheel size
            const spacing = 85; // Space between icons

            // Get button styles based on type
            const getButtonStyle = (type: 'lesson' | 'sunny' | 'cloudy') => {
              if (type === 'lesson') return entityLessonButtonStyle;
              if (type === 'sunny') return entitySunnyButtonStyle;
              return entityCloudyButtonStyle;
            };

            const getHighlightStyle = (type: 'lesson' | 'sunny' | 'cloudy') => {
              if (type === 'lesson') return entityLessonHighlightStyle;
              if (type === 'sunny') return entitySunnyHighlightStyle;
              return entityCloudyHighlightStyle;
            };

            const getPressScaleValue = (type: 'lesson' | 'sunny' | 'cloudy') => {
              if (type === 'lesson') return entityLessonButtonPressScale;
              if (type === 'sunny') return entitySunnyButtonPressScale;
              return entityCloudyButtonPressScale;
            };

            const getHighlightValue = (type: 'lesson' | 'sunny' | 'cloudy') => {
              if (type === 'lesson') return entityLessonButtonHighlight;
              if (type === 'sunny') return entitySunnyButtonHighlight;
              return entityCloudyButtonHighlight;
            };

            // Position icons horizontally at bottom
            const icons = [
              { type: 'lesson' as const, icon: 'emoji-objects' as const, count: momentCounts.lesson },
              { type: 'sunny' as const, icon: 'wb-sunny' as const, count: momentCounts.sunny },
              { type: 'cloudy' as const, icon: 'cloud-queue' as const, count: momentCounts.cloudy },
            ];

            return icons.map((item, index) => {
              const x = SCREEN_WIDTH / 2 - spacing + (index * spacing);
              const y = iconY;
              const isDisabled = item.count === 0;
              const isSpinningDisabled = isWheelSpinningState;

              return (
                <Animated.View
                  key={item.type}
                  pointerEvents={isSpinningDisabled ? "none" : "auto"}
                  style={[
                    {
                      position: 'absolute',
                      left: x - iconSize / 2,
                      top: y - iconSize / 2,
                      width: iconSize,
                      height: iconSize,
                      borderRadius: iconSize / 2,
                      overflow: 'hidden',
                      opacity: isDisabled ? 0.3 : (isSpinningDisabled ? 0.4 : 1),
                      zIndex: 500,
                    },
                    getButtonStyle(item.type),
                  ]}
                >
                  {/* Frosted glass base layer */}
                  <View style={StyleSheet.absoluteFillObject}>
                    <LinearGradient
                      colors={[
                        'rgba(255, 255, 255, 0.15)',
                        'rgba(255, 255, 255, 0.05)',
                        'rgba(255, 255, 255, 0.1)'
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>

                  {/* Specular highlight overlay (liquid glass shine) */}
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFillObject,
                      getHighlightStyle(item.type),
                    ]}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>

                  <Pressable
                    onPress={() => {
                      if (!isDisabled && !isSpinningDisabled) {
                        setSelectedMomentType(item.type);
                      }
                    }}
                    onPressIn={() => {
                      if (!isDisabled && !isSpinningDisabled) {
                        getPressScaleValue(item.type).value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
                        getHighlightValue(item.type).value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
                      }
                    }}
                    onPressOut={() => {
                      if (!isDisabled && !isSpinningDisabled) {
                        getPressScaleValue(item.type).value = withSpring(1, { damping: 10, stiffness: 300 });
                        getHighlightValue(item.type).value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
                      }
                    }}
                    disabled={isDisabled || isSpinningDisabled}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selectedMomentType === item.type ? 0.3 : 0.1,
                      shadowRadius: 4,
                      elevation: selectedMomentType === item.type ? 5 : 2,
                    }}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={28}
                      color={selectedMomentType === item.type ? '#fff' : colors.text}
                    />
                  </Pressable>
                </Animated.View>
              );
            });
          })()}

          {/* Floating moments that grow from memories */}
          {floatingMoments.map((moment) => (
            <FloatingMomentFromMemory
              key={`floating-moment-${moment.memoryIndex}-${moment.momentIndex}-${moment.momentType}`}
              memoryIndex={moment.memoryIndex}
              momentIndex={moment.momentIndex}
              totalMoments={memories[moment.memoryIndex]?.[
                moment.momentType === 'lesson' ? 'lessonsLearned' :
                moment.momentType === 'sunny' ? 'goodFacts' : 'hardTruths'
              ]?.length || 1}
              momentType={moment.momentType}
              colorScheme={colorScheme ?? 'dark'}
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
              bottomInset={Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale)}
            />
          ))}

          {/* Selected moment floating display - large circular popup matching main wheel of life */}
          {selectedWheelMoment && (() => {
            // Calculate dimensions dynamically based on text length for all moment types
            const textLength = selectedWheelMoment.text?.length || 0;

            // Base sizes for different moment types
            const baseSunSize = isTablet ? 240 : (isLargeDevice ? 200 : 160);
            const baseCloudWidth = isTablet ? 260 : 190;
            const baseCloudHeight = isTablet ? 160 : 120;
            const baseLessonSize = isTablet ? 200 : 145; // Reverted - this affects floating moments positioning

            // Dynamic sizing based on text length
            // For sunny moments: circular, so width = height
            const dynamicSunSize = Math.min(400, Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 1.5)));

            // For cloudy moments: wider and shorter, scale width more than height
            const cloudWidthMultiplier = Math.min(2.0, Math.max(1.0, 1.0 + (textLength / 100)));
            const cloudHeightMultiplier = Math.min(1.2, Math.max(1.0, 1.0 + (textLength / 200)));
            const dynamicCloudWidth = baseCloudWidth * cloudWidthMultiplier;
            const dynamicCloudHeight = baseCloudHeight * cloudHeightMultiplier;

            // For lesson moments: circular, scale based on text length
            const lessonSizeMultiplier = Math.min(1.4, Math.max(1.0, 1.0 + (textLength / 150)));
            const dynamicLessonSize = baseLessonSize * lessonSizeMultiplier;

            // Set moment dimensions based on type
            const momentWidth = selectedWheelMoment.type === 'sunny' 
              ? dynamicSunSize 
              : selectedWheelMoment.type === 'cloudy'
              ? dynamicCloudWidth
              : dynamicLessonSize;
            const momentHeight = selectedWheelMoment.type === 'sunny' 
              ? dynamicSunSize 
              : selectedWheelMoment.type === 'cloudy'
              ? dynamicCloudHeight
              : dynamicLessonSize;
            const messageTop = 180; // Final position below entity name (avoid overlap with name at top)

            // Get visual properties based on moment type
            const momentVisuals = {
              lesson: {
                icon: 'lightbulb' as const,
                backgroundColor: 'rgba(255, 215, 0, 0.45)',
                shadowColor: '#FFD700',
                iconColor: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
              },
              sunny: {
                icon: 'wb-sunny' as const,
                backgroundColor: 'rgba(255, 215, 0, 0.55)',
                shadowColor: '#FFD700',
                iconColor: colorScheme === 'dark' ? '#FFD700' : '#FF9800',
              },
              cloudy: {
                icon: 'cloud' as const,
                backgroundColor: 'rgba(150, 150, 180, 0.35)',
                shadowColor: '#9696B4',
                iconColor: colorScheme === 'dark' ? '#B0B0C8' : '#7878A0',
              },
            };

            const visuals = momentVisuals[selectedWheelMoment.type];

            return (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: SCREEN_WIDTH / 2 - momentWidth / 2, // Center horizontally
                    zIndex: 300,
                  },
                  popupAnimatedStyle,
                ]}
              >
                {selectedWheelMoment.type === 'sunny' ? (
                  /* For sunny moments, render the sun element directly (no Pressable wrapper with background) */
                  <Pressable
                    onPressIn={() => {
                      popupPressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      popupPressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                    }}
                    onPress={() => {
                      // Wait for press animation to complete before navigating
                      setTimeout(() => {
                        // Navigate to the focused memory
                        if (onMemoryFocus && selectedWheelMoment?.memoryId) {
                          // If it's a sunny moment, pass the momentId so the draggable sun element appears automatically
                          onMemoryFocus(profile.id, selectedWheelMoment.memoryId, profile.sphere, selectedWheelMoment.momentId);
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
                      backgroundColor: 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* EXACT COPY of sun element from focused memory view (lines 3155-3275) */}
                    <View
                      style={{
                        width: dynamicSunSize,
                        height: dynamicSunSize,
                        // Golden glow for suns (positive moments)
                        shadowColor: '#FFD700',
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
                        style={{ position: 'absolute', top: 0, left: 0 }}
                      >
                        <Defs>
                          <RadialGradient 
                            id={`wheelSunGradient-${selectedWheelMoment.momentId || 'default'}`} 
                            cx="80" 
                            cy="80" 
                            rx="48" 
                            ry="48"
                            fx="80"
                            fy="80"
                            gradientUnits="userSpaceOnUse"
                          >
                            <Stop offset="0%" stopColor="#FFEB3B" stopOpacity="1" />
                            <Stop offset="30%" stopColor="#FFEB3B" stopOpacity="1" />
                            <Stop offset="60%" stopColor="#FFD700" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#FFC107" stopOpacity="1" />
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
                          const rightX = outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
                          const rightY = outerY + Math.sin(perpAngle + Math.PI) * halfWidth;
                          
                          return (
                            <Path
                              key={`wheelRay-${i}`}
                              d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                              fill="#FFD700"
                            />
                          );
                        })}
                        {/* Central circle - sized to fit text */}
                        <Circle
                          cx="80"
                          cy="80"
                          r="48" // Adjusted for smaller sun
                          fill={`url(#wheelSunGradient-${selectedWheelMoment.momentId || 'default'})`}
                        />
                      </Svg>
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: dynamicSunSize,
                          height: dynamicSunSize,
                          justifyContent: 'center',
                          alignItems: 'center',
                          // Calculate padding based on sun circle radius to ensure text fits inside
                          // Sun radius in viewBox is 48, viewBox is 160, so actual radius = (dynamicSunSize / 160) * 48
                          paddingHorizontal: (dynamicSunSize / 160) * 48 * 0.7, // 70% of radius for safe padding
                          paddingVertical: (dynamicSunSize / 160) * 48 * 0.5, // 50% of radius for vertical padding
                        }}
                      >
                        <ThemedText
                          style={{
                            color: 'black',
                            fontSize: Math.max(11, Math.min(16, 12 + (textLength / 60))) * fontScale, // Scale font size with text length
                            textAlign: 'center',
                            fontWeight: '700',
                            // Max width should be less than circle diameter minus padding to ensure text fits within circle
                            // Circle diameter = (dynamicSunSize / 160) * 48 * 2, use 75% for safe margin
                            maxWidth: (dynamicSunSize / 160) * 48 * 1.5, // 75% of diameter to ensure text fits within circle
                          }}
                          numberOfLines={Math.min(4, Math.max(2, Math.ceil(textLength / 25)))} // More lines for longer text
                        >
                          {selectedWheelMoment.text?.split('\n')[0] || selectedWheelMoment.text}
                        </ThemedText>
                        {selectedWheelMoment.text?.includes('\n') && (
                          <ThemedText
                            style={{
                              color: 'black',
                              fontSize: Math.max(7, Math.min(11, 7 + (textLength / 100))) * fontScale, // Scale font size for second line
                              textAlign: 'center',
                              fontWeight: '600',
                              maxWidth: (dynamicSunSize / 160) * 48 * 1.5, // Same max width as first line to stay within circle
                            }}
                            numberOfLines={Math.min(3, Math.max(1, Math.ceil(textLength / 50)))}
                          >
                            {selectedWheelMoment.text.split('\n')[1]}
                          </ThemedText>
                        )}
                        {/* Memory image */}
                        {selectedWheelMoment.memoryImageUri && (
                          <Image
                            source={{ uri: selectedWheelMoment.memoryImageUri }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              marginTop: 8,
                              borderWidth: 2,
                              borderColor: '#FFD700',
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
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colorScheme === 'dark'
                          ? 'rgba(0, 0, 0, 0.6)'
                          : 'rgba(255, 255, 255, 0.95)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 999,
                        shadowColor: '#000',
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
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        style={{ opacity: 0.9 }}
                      />
                    </Pressable>
                  </Pressable>
                ) : selectedWheelMoment.type === 'cloudy' ? (
                  // For cloudy moments, use SVG cloud (matching video preview component)
                  <Pressable
                    onPressIn={() => {
                      popupPressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      popupPressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                    }}
                    onPress={() => {
                      // Wait for press animation to complete before navigating
                      setTimeout(() => {
                        // Navigate to the focused memory
                        if (onMemoryFocus && selectedWheelMoment?.memoryId) {
                          onMemoryFocus(profile.id, selectedWheelMoment.memoryId, profile.sphere, selectedWheelMoment.momentId);
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
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* SVG cloud (matching video preview component) */}
                    <View
                      style={{
                        width: dynamicCloudWidth,
                        height: dynamicCloudHeight,
                        shadowColor: '#4A5568',
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
                        style={{ position: 'absolute', top: 0, left: 0 }}
                      >
                        <Defs>
                          <SvgLinearGradient id={`wheelCloudGradient-${selectedWheelMoment.momentId || 'default'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#2C3E50" stopOpacity="0.95" />
                            <Stop offset="50%" stopColor="#1A1A1A" stopOpacity="0.98" />
                            <Stop offset="100%" stopColor="#0A0A0A" stopOpacity="1" />
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
                          fill={`url(#wheelCloudGradient-${selectedWheelMoment.momentId || 'default'})`}
                          stroke="rgba(0,0,0,0.7)"
                          strokeWidth={1.5}
                        />
                      </Svg>
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: dynamicCloudWidth,
                          height: dynamicCloudHeight,
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: Math.max(20, dynamicCloudWidth * 0.1), // Scale padding with size
                        }}
                      >
                        <ThemedText
                          style={{
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: Math.max(12, Math.min(16, 14 + (textLength / 80))) * fontScale, // Scale font size with text length
                            textAlign: 'center',
                            fontWeight: '500',
                          }}
                          numberOfLines={Math.min(6, Math.max(3, Math.ceil(textLength / 40)))} // More lines for longer text
                        >
                          {selectedWheelMoment.text}
                        </ThemedText>
                        {/* Memory image */}
                        {selectedWheelMoment.memoryImageUri && (
                          <Image
                            source={{ uri: selectedWheelMoment.memoryImageUri }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              marginTop: 8,
                              borderWidth: 2,
                              borderColor: 'rgba(255,255,255,0.3)',
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
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colorScheme === 'dark'
                          ? 'rgba(0, 0, 0, 0.6)'
                          : 'rgba(255, 255, 255, 0.95)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 999,
                        shadowColor: '#000',
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
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        style={{ opacity: 0.9 }}
                      />
                    </Pressable>
                  </Pressable>
                ) : (
                  // For lesson moments, use the original circle design with MaterialIcons
                  <Pressable
                    onPressIn={() => {
                      popupPressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      popupPressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                    }}
                    onPress={() => {
                      // Wait for press animation to complete before navigating
                      setTimeout(() => {
                        // Navigate to the focused memory
                        if (onMemoryFocus && selectedWheelMoment?.memoryId) {
                          onMemoryFocus(profile.id, selectedWheelMoment.memoryId, profile.sphere, selectedWheelMoment.momentId);
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
                      width: dynamicLessonSize,
                      height: dynamicLessonSize,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: visuals.backgroundColor,
                      borderRadius: dynamicLessonSize / 2,
                      shadowColor: visuals.shadowColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.95,
                      shadowRadius: isTablet ? 40 : 30,
                      elevation: 24,
                      padding: Math.max(8, dynamicLessonSize * 0.05), // Scale padding with size
                      position: 'relative',
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
                        color: colorScheme === 'dark' ? '#1A1A1A' : '#000000',
                        fontSize: Math.max(13, Math.min(16, 13 + (textLength / 60))) * fontScale, // Increased base from 11 to 13
                        textAlign: 'center',
                        fontWeight: '700',
                        maxWidth: dynamicLessonSize * 0.75, // Reduced to 75% to ensure text stays within circular bounds
                        lineHeight: Math.max(17, Math.min(20, 17 + (textLength / 60))) * fontScale, // Increased from 15 to 17
                      }}
                      numberOfLines={Math.min(10, Math.max(4, Math.ceil(textLength / 30)))} // More lines for longer text
                    >
                      {selectedWheelMoment.text}
                    </ThemedText>
                    {/* Memory image */}
                    {selectedWheelMoment.memoryImageUri && (
                      <Image
                        source={{ uri: selectedWheelMoment.memoryImageUri }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          marginTop: 8,
                          borderWidth: 2,
                          borderColor: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
                        }}
                      />
                    )}
                    {/* Close button for lesson - positioned at top right */}
                    <Pressable
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        setSelectedWheelMoment(null);
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colorScheme === 'dark'
                          ? 'rgba(0, 0, 0, 0.6)'
                          : 'rgba(255, 255, 255, 0.95)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 999,
                        shadowColor: '#000',
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
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        style={{ opacity: 0.9 }}
                      />
                    </Pressable>
                  </Pressable>
                )}
              </Animated.View>
            );
          })()}
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.profile.id === nextProps.profile.id &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.memories.length === nextProps.memories.length &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.focusedMemory?.profileId === nextProps.focusedMemory?.profileId &&
    prevProps.focusedMemory?.memoryId === nextProps.focusedMemory?.memoryId &&
    prevProps.yearSection?.year === nextProps.yearSection?.year &&
    prevProps.yearSection?.top === nextProps.yearSection?.top &&
    prevProps.yearSection?.bottom === nextProps.yearSection?.bottom
  );
});

// Memory Moments Renderer Component (extracted from IIFE)
const MemoryMomentsRenderer = React.memo(function MemoryMomentsRenderer({
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
  calculateClampedPosition: (savedX: number | undefined, savedY: number | undefined, momentWidth: number, momentHeight: number, index: number, totalCount: number, memorySize: number, momentType: 'cloud' | 'sun') => { x: number; y: number };
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
  colorScheme: 'light' | 'dark';
  onDoubleTap?: () => void;
  onUpdateMemory?: (updates: Partial<any>) => Promise<void>;
  newlyCreatedMoments: Map<string, { startX: number; startY: number }>;
  memory: any;
  showEntityWheel?: boolean;
  showEntityWheelRef?: React.MutableRefObject<boolean>;
}) {
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
        if (!cloud || typeof cloud !== 'object') {
          return null;
        }
        
        // When memory is focused, use saved positions from memory data
        // Otherwise use calculated positions
        if (isMemoryFocused) {
          // Calculate dynamic cloud size based on text length
          const textLength = cloud.text?.length || 0;
          const baseCloudWidth = isTablet ? 720 : (isLargeDevice ? 480 : 320);
          const baseCloudHeight = isTablet ? 225 : (isLargeDevice ? 150 : 100);
          const estimatedLines = Math.ceil(textLength / 30);
          const dynamicCloudHeight = Math.min(300, Math.max(baseCloudHeight, baseCloudHeight + (estimatedLines - 1) * 25));
          const dynamicCloudWidth = Math.min(800, Math.max(baseCloudWidth, baseCloudWidth + Math.floor(textLength * 0.5)));

          // Calculate and clamp position to ensure it's within viewport and well distributed
          const clampedPos = calculateClampedPosition(
            cloud.x,
            cloud.y,
            dynamicCloudWidth,
            dynamicCloudHeight,
            cloudIndex,
            clouds.length,
            memorySize,
            'cloud'
          );
          const cloudX = clampedPos.x;
          const cloudY = clampedPos.y;

          const handlePositionChange = async (x: number, y: number) => {
            if (onUpdateMemory) {
              // Update the cloud's position in memory
              const updatedHardTruths = (memory.hardTruths || []).map((truth: any) =>
                truth.id === cloud.id ? { ...truth, x, y } : truth
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
                  shadowColor: '#4A5568',
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
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <Defs>
                  <SvgLinearGradient id={`cloudGradient-${cloud.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#2C3E50" stopOpacity="0.95" />
                    <Stop offset="50%" stopColor="#1A1A1A" stopOpacity="0.98" />
                    <Stop offset="100%" stopColor="#0A0A0A" stopOpacity="1" />
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
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: dynamicCloudWidth,
                  height: dynamicCloudHeight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                }}
              >
                <ThemedText
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 14,
                    textAlign: 'center',
                    fontWeight: '500',
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
  }, [isFocused, filteredClouds, isMemoryFocused, cloudPositions, position.x, position.y, memoryAnimatedPosition, avatarPanX, avatarPanY, focusedX, focusedY, offsetX, offsetY, cloudZIndex, colorScheme, onDoubleTap, calculateClampedPosition, cloudWidth, cloudHeight, clouds.length, memorySize, newlyCreatedMoments, isTablet, onUpdateMemory, memory.hardTruths, sunnyPercentage, showEntityWheel, showEntityWheelRef, activeMomentId, setActiveMomentId]);
  
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
          const textLength = sun.text?.length || 0;
          const baseSunSize = isTablet ? 240 : (isLargeDevice ? 200 : 160);
          const dynamicSunSize = Math.min(350, Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 1.2)));

          // Calculate and clamp position to ensure it's within viewport and well distributed
          const clampedPos = calculateClampedPosition(
            sun.x,
            sun.y,
            dynamicSunSize,
            dynamicSunSize,
            sunIndex,
            suns.length,
            memorySize,
            'sun'
          );
          const sunX = clampedPos.x;
          const sunY = clampedPos.y;

          const handlePositionChange = async (x: number, y: number) => {
            if (onUpdateMemory) {
              // Update the sun's position in memory
              const updatedGoodFacts = (memory.goodFacts || []).map((fact: any) =>
                fact.id === sun.id ? { ...fact, x, y } : fact
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
                  // Golden glow for suns (positive moments)
                  shadowColor: '#FFD700',
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
                style={{ position: 'absolute', top: 0, left: 0 }}
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
                    <Stop offset="0%" stopColor="#FFEB3B" stopOpacity="1" />
                    <Stop offset="30%" stopColor="#FFEB3B" stopOpacity="1" />
                    <Stop offset="60%" stopColor="#FFD700" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#FFC107" stopOpacity="1" />
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
                  const rightX = outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
                  const rightY = outerY + Math.sin(perpAngle + Math.PI) * halfWidth;
                  
                  return (
                    <Path
                      key={`ray-${i}`}
                      d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                      fill="#FFD700"
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
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: dynamicSunSize,
                  height: dynamicSunSize,
                  justifyContent: 'center',
                  alignItems: 'center',
                  // Calculate padding based on sun circle radius to ensure text fits inside
                  // Sun radius in viewBox is 48, viewBox is 160, so actual radius = (dynamicSunSize / 160) * 48
                  paddingHorizontal: (dynamicSunSize / 160) * 48 * 0.6, // 60% of radius for safe padding
                  paddingVertical: (dynamicSunSize / 160) * 48 * 0.4, // 40% of radius for vertical padding
                }}
              >
                <ThemedText
                  style={{
                    color: 'black',
                    fontSize: 12 * fontScale, // Smaller font size to ensure text fits inside
                    textAlign: 'center',
                    fontWeight: '700',
                    // Max width should be less than circle diameter minus padding
                    //maxWidth: (dynamicSunSize / 160) * 48 * 1.6, // 80% of diameter to ensure text fits
                  }}
                  numberOfLines={3}
                >
                  {sun.text?.split('\n')[0] || sun.text}
                </ThemedText>
                {sun.text?.includes('\n') && (
                  <ThemedText
                    style={{
                      color: 'black',
                      fontSize: 7 * fontScale, // Smaller font size for second line
                      textAlign: 'center',
                      fontWeight: '600',
                      maxWidth: (dynamicSunSize / 160) * 48 * 1.6, // Same max width
                    }}
                    numberOfLines={2}
                  >
                    {sun.text.split('\n')[1]}
                  </ThemedText>
                )}
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
  }, [isFocused, filteredSuns, isMemoryFocused, sunPositions, position.x, position.y, memoryAnimatedPosition, avatarPanX, avatarPanY, focusedX, focusedY, offsetX, offsetY, sunZIndex, colorScheme, onDoubleTap, calculateClampedPosition, sunWidth, sunHeight, suns.length, memorySize, newlyCreatedMoments, isTablet, isLargeDevice, fontScale, onUpdateMemory, memory.goodFacts, sunnyPercentage, showEntityWheel, showEntityWheelRef, activeMomentId, setActiveMomentId]);

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
        const textToMeasure = lesson.text || '';
        const baseLessonSize = isTablet ? 240 : (isLargeDevice ? 200 : 160);
        const dynamicLessonSize = Math.min(350, Math.max(baseLessonSize, baseLessonSize + Math.floor(textToMeasure.length * 1.2)));

        const startPos = newlyCreatedMoments.get(lesson.id);
        const clampedPos = calculateClampedPosition(
          lesson.x,
          lesson.y,
          dynamicLessonSize,
          dynamicLessonSize,
          lessonIndex,
          lessons.length,
          memorySize,
          'sun'
        );
        const lessonX = clampedPos.x;
        const lessonY = clampedPos.y;

        const handlePositionChange = async (x: number, y: number) => {
          if (onUpdateMemory) {
            const updatedLessons = (memory.lessonsLearned || []).map((l: any) =>
              l.id === lesson.id ? { ...l, x, y } : l
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
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 215, 0, 0.25)',
                borderRadius: dynamicLessonSize / 2,
                // Golden glow for lessons
                shadowColor: '#FFD700',
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
                color={colorScheme === 'dark' ? '#FFD700' : '#FFA000'}
                style={{ marginBottom: 4 }}
              />
              {lesson.text && (
                <ThemedText
                  style={{
                    color: colorScheme === 'dark' ? '#000000' : '#1A1A1A',
                    fontSize: 11 * fontScale,
                    textAlign: 'center',
                    fontWeight: '700',
                    maxWidth: dynamicLessonSize * 0.85,
                    lineHeight: 14 * fontScale,
                  }}
                  numberOfLines={5}
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
  }, [isFocused, filteredLessons, isMemoryFocused, lessonPositions, lessons.length, calculateClampedPosition, sunWidth, sunHeight, memorySize, lessonZIndex, colorScheme, onDoubleTap, onUpdateMemory, newlyCreatedMoments, memory, isTablet, position.x, position.y, memoryAnimatedPosition, memoryCenterX, memoryCenterY, avatarPanX, avatarPanY, focusedX, focusedY, offsetX, offsetY, showEntityWheel, showEntityWheelRef, activeMomentId, setActiveMomentId]);

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
}, (prevProps, nextProps) => {
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
});

// Memory Action Buttons Component (extracted from IIFE)
const MemoryActionButtons = React.memo(function MemoryActionButtons({
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
  colorScheme: 'light' | 'dark';
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
  const t = useTranslate();
  // Memoize these calculations - must be called unconditionally
  const allClouds = useMemo(() => (memory.hardTruths || []).filter((truth: any) => truth && typeof truth === 'object' && !Array.isArray(truth)), [memory.hardTruths]);
  const allSuns = useMemo(() => (memory.goodFacts || []).filter((fact: any) => fact && typeof fact === 'object'), [memory.goodFacts]);
  const allLessons = useMemo(() => (memory.lessonsLearned || []).filter((lesson: any) => lesson && typeof lesson === 'object'), [memory.lessonsLearned]);
  const visibleCloudsCount = useMemo(() => allClouds.filter((c: any) => c?.id && visibleMomentIds.has(c.id)).length, [allClouds, visibleMomentIds]);
  const visibleSunsCount = useMemo(() => allSuns.filter((s: any) => s?.id && visibleMomentIds.has(s.id)).length, [allSuns, visibleMomentIds]);
  const visibleLessonsCount = useMemo(() => allLessons.filter((l: any) => l?.id && visibleMomentIds.has(l.id)).length, [allLessons, visibleMomentIds]);

  // Always render buttons when memory is focused, even if all moments are visible
  if (!isMemoryFocused) return null;
  const totalCloudsCount = allClouds.length;
  const totalSunsCount = allSuns.length;
  const totalLessonsCount = allLessons.length;
  const allCloudsVisible = totalCloudsCount > 0 && visibleCloudsCount >= totalCloudsCount;
  const allSunsVisible = totalSunsCount > 0 && visibleSunsCount >= totalSunsCount;
  const allLessonsVisible = totalLessonsCount > 0 && visibleLessonsCount >= totalLessonsCount;

  // Calculate position at bottom of screen (above navigation bar)
  const buttonSpacing = isLargeDevice ? 12 : 10;
  const buttonSize = isLargeDevice ? 96 : 88;
  const labelWidth = 100;
  const bottomRowWidth = buttonSize + buttonSpacing + labelWidth + buttonSpacing + buttonSize; // Cloud + text + Sun
  const totalWidth = Math.max(buttonSize, bottomRowWidth); // Use the wider of the two rows
  const bottomNavBarHeight = 80; // Approximate height of bottom navigation bar
  const bottomPadding = 60; // Padding from bottom - increased to move buttons up
  const containerBottom = bottomNavBarHeight + bottomPadding; // Position above navigation bar
  const colors = Colors[colorScheme ?? 'dark'];

  // Pulse animation scales
  const lessonButtonScale = useSharedValue(1);
  const cloudButtonScale = useSharedValue(1);
  const sunButtonScale = useSharedValue(1);

  // Animated styles for pulse effect
  const lessonButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lessonButtonScale.value }],
  }));

  const cloudButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cloudButtonScale.value }],
  }));

  const sunButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sunButtonScale.value }],
  }));

  // Pulse animation handlers
  const handleLessonPress = () => {
    lessonButtonScale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    handleAddLesson?.();
  };

  const handleCloudPress = () => {
    cloudButtonScale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    handleAddCloud();
  };

  const handleSunPress = () => {
    sunButtonScale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    handleAddSun();
  };

  return (
    <>
      {/* All action buttons container - positioned at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: containerBottom,
          left: SCREEN_WIDTH / 2 - totalWidth / 2,
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2000,
        }}
      >
        {/* Lesson Button - positioned above cloud and sun */}
        {lessonButtonRef && setLessonButtonPos && handleAddLesson && (
        <View
          ref={lessonButtonRef}
          onLayout={() => {
            lessonButtonRef.current?.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
              const buttonCenterX = px + width / 2;
              const buttonCenterY = py + height / 2;
              setLessonButtonPos({ x: buttonCenterX, y: buttonCenterY });
            });
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
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 0.9)',
                shadowColor: colorScheme === 'dark' ? '#FFA000' : '#FFA000',
                shadowOffset: { width: 0, height: colorScheme === 'dark' ? 14 : 12 },
                shadowOpacity: colorScheme === 'dark' ? 0.9 : 0.7,
                shadowRadius: colorScheme === 'dark' ? 24 : 20,
                elevation: colorScheme === 'dark' ? 18 : 15,
                overflow: 'visible',
                borderWidth: colorScheme === 'dark' ? 2 : 1.5,
                borderColor: colorScheme === 'dark'
                  ? '#FFA000'
                  : '#FFA000',
                opacity: (allLessonsVisible || totalLessonsCount === 0) ? 0.4 : 1,
              },
              lessonButtonAnimatedStyle,
            ]}
          >
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['rgba(255, 249, 196, 0.9)', 'rgba(255, 213, 79, 0.75)', 'rgba(255, 160, 0, 0.9)']
                  : ['rgba(255, 253, 231, 1)', 'rgba(255, 245, 157, 0.95)', 'rgba(255, 213, 79, 1)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: isLargeDevice ? 48 : 44,
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: isLargeDevice ? 14 : 12,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons
                  name="lightbulb"
                  size={isLargeDevice ? 44 : 40}
                  color={colorScheme === 'dark' ? '#FFD700' : '#555'}
                />
              </View>
              {/* Count badge */}
              {totalLessonsCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: isLargeDevice ? 8 : 6,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: isLargeDevice ? 14 : 12,
                      fontWeight: '700',
                      color: colorScheme === 'dark' ? '#FFD700' : '#555',
                      textAlign: 'center',
                    }}
                  >
                    {visibleLessonsCount}/{totalLessonsCount}
                  </ThemedText>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
        )}

        {/* Bottom row: Cloud, Text, Sun */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: buttonSize, // Ensure consistent height
          }}
        >
        {/* Cloud Button */}
        <View
          ref={cloudButtonRef}
          onLayout={() => {
            cloudButtonRef.current?.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
              const buttonCenterX = px + width / 2;
              const buttonCenterY = py + height / 2;
              setCloudButtonPos({ x: buttonCenterX, y: buttonCenterY });
            });
          }}
          style={{
            alignSelf: 'center',
          }}
        >
        <Pressable
          onPress={handleCloudPress}
          disabled={allCloudsVisible}
        >
        <Animated.View
          style={[
            {
              width: isLargeDevice ? 96 : 88,
              height: isLargeDevice ? 96 : 88,
              borderRadius: isLargeDevice ? 48 : 44,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.9)',
              shadowColor: colorScheme === 'dark' ? '#000' : '#000',
              shadowOffset: { width: 0, height: colorScheme === 'dark' ? 14 : 12 },
              shadowOpacity: colorScheme === 'dark' ? 0.8 : 0.6,
              shadowRadius: colorScheme === 'dark' ? 24 : 20,
              elevation: colorScheme === 'dark' ? 18 : 15,
              overflow: 'visible', // Allow count text to be visible
              borderWidth: colorScheme === 'dark' ? 2 : 1.5,
              borderColor: colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(255, 255, 255, 0.6)',
              opacity: allCloudsVisible ? 0.4 : 1,
            },
            cloudButtonAnimatedStyle,
          ]}
        >
          <LinearGradient
            colors={
              colorScheme === 'dark'
                ? ['rgba(180, 180, 180, 0.8)', 'rgba(100, 100, 100, 0.6)', 'rgba(40, 40, 40, 0.8)']
                : ['rgba(255, 255, 255, 1)', 'rgba(230, 230, 230, 0.95)', 'rgba(200, 200, 200, 1)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: isLargeDevice ? 48 : 44,
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: isLargeDevice ? 14 : 12,
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons 
                name="cloud" 
                size={isLargeDevice ? 44 : 40} 
                color={colorScheme === 'dark' ? '#FFFFFF' : '#555'} 
              />
            </View>
            {/* Count badge */}
            {totalCloudsCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: isLargeDevice ? 8 : 6,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ThemedText
                  style={{
                    fontSize: isLargeDevice ? 14 : 12,
                    fontWeight: '700',
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#555',
                    textAlign: 'center',
                  }}
                >
                  {visibleCloudsCount}/{totalCloudsCount}
                </ThemedText>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>

    {/* RemindWhy Label */}
    <View
      style={{
        width: labelWidth,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: buttonSpacing,
      }}
    >
      <ThemedText
        style={{
          fontSize: isLargeDevice ? 16 : 14,
          fontWeight: '600',
          color: colors.text,
          textAlign: 'center',
        }}
      >
        {t('memory.remindWhy')}
      </ThemedText>
    </View>
    
    {/* Sun Button */}
    <View
      ref={sunButtonRef}
      onLayout={() => {
        sunButtonRef.current?.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          const buttonCenterX = px + width / 2;
          const buttonCenterY = py + height / 2;
          setSunButtonPos({ x: buttonCenterX, y: buttonCenterY });
        });
      }}
      style={{
        alignSelf: 'center',
      }}
    >
        <Pressable
          onPress={handleSunPress}
          disabled={allSunsVisible}
        >
        <Animated.View
          style={[
            {
              width: isLargeDevice ? 96 : 88,
              height: isLargeDevice ? 96 : 88,
              borderRadius: isLargeDevice ? 48 : 44,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.9)',
              shadowColor: colorScheme === 'dark' ? '#FFD700' : '#FFD700',
              shadowOffset: { width: 0, height: colorScheme === 'dark' ? 14 : 12 },
              shadowOpacity: colorScheme === 'dark' ? 0.9 : 0.7,
              shadowRadius: colorScheme === 'dark' ? 24 : 20,
              elevation: colorScheme === 'dark' ? 18 : 15,
              overflow: 'visible', // Allow count text to be visible
              borderWidth: colorScheme === 'dark' ? 2 : 1.5,
              borderColor: colorScheme === 'dark'
                ? '#FFD700'
                : '#FFD700',
              opacity: allSunsVisible ? 0.4 : 1,
            },
            sunButtonAnimatedStyle,
          ]}
        >
          <LinearGradient
            colors={
              colorScheme === 'dark'
                ? ['#FFD700', '#FFD700', '#FFD700']
                : ['#FFD700', '#FFD700', '#FFD700']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: isLargeDevice ? 48 : 44,
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: isLargeDevice ? 14 : 12,
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons 
                name="wb-sunny" 
                size={isLargeDevice ? 44 : 40} 
                color={colorScheme === 'dark' ? '#FFFFFF' : '#555'} 
              />
            </View>
            {/* Count badge */}
            {totalSunsCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: isLargeDevice ? 8 : 6,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ThemedText
                  style={{
                    fontSize: isLargeDevice ? 14 : 12,
                    fontWeight: '700',
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#555',
                    textAlign: 'center',
                  }}
                >
                  {visibleSunsCount}/{totalSunsCount}
                </ThemedText>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
        </View>
      </View>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isMemoryFocused === nextProps.isMemoryFocused &&
    prevProps.memory.id === nextProps.memory.id &&
    prevProps.visibleMomentIds.size === nextProps.visibleMomentIds.size &&
    prevProps.memorySize === nextProps.memorySize &&
    prevProps.isLargeDevice === nextProps.isLargeDevice &&
    prevProps.colorScheme === nextProps.colorScheme
  );
});

// Floating Memory Component
const FloatingMemory = React.memo(function FloatingMemory({
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
  showEntityWheelShared?: ReturnType<typeof useSharedValue<boolean>>; // Shared value for worklet reactivity
  showEntityWheel?: boolean; // Boolean state for synchronous checking
  showEntityWheelRef?: React.MutableRefObject<boolean>; // Ref for absolute latest value
  isFocused: boolean;
  colorScheme: 'light' | 'dark';
  calculatedMemorySize?: number;
  onDoubleTap?: () => void;
  isMemoryFocused?: boolean;
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  onUpdateMemory?: (updates: Partial<any>) => Promise<void>;
  onPress?: () => void;
  onMemoryFocus?: (entityId: string, memoryId: string, sphere?: LifeSphere, momentId?: string) => void;
  zoomProgress?: ReturnType<typeof useSharedValue<number>>;
  avatarStartX?: ReturnType<typeof useSharedValue<number>>;
  avatarStartY?: ReturnType<typeof useSharedValue<number>>;
  avatarTargetX?: number;
  avatarTargetY?: number;
  avatarPosition?: { x: number; y: number };
  focusedMemory?: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null;
}) {
  const { isLargeDevice, isTablet } = useLargeDevice();

  // Share modal state
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [shareModalContent, setShareModalContent] = React.useState({ title: '', message: '' });

  // Track which moments are visible (initially none when memory is focused)
  const [visibleMomentIds, setVisibleMomentIds] = React.useState<Set<string>>(new Set());

  // Track the actively focused moment (for shrink/grow animation)
  const [activeMomentId, setActiveMomentId] = React.useState<string | null>(null);

  // Track newly created moments with their start positions
  const [newlyCreatedMoments, setNewlyCreatedMoments] = React.useState<Map<string, { startX: number; startY: number }>>(new Map());
  
  // Track button positions for animation
  const cloudButtonRef = useRef<View>(null);
  const sunButtonRef = useRef<View>(null);
  const lessonButtonRef = useRef<View>(null);
  const [cloudButtonPos, setCloudButtonPos] = React.useState<{ x: number; y: number } | null>(null);
  const [sunButtonPos, setSunButtonPos] = React.useState<{ x: number; y: number } | null>(null);
  const [lessonButtonPos, setLessonButtonPos] = React.useState<{ x: number; y: number } | null>(null);
  
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
      (memory.hardTruths || []).forEach((truth: any) => truth?.id && allIds.add(truth.id));
      (memory.goodFacts || []).forEach((fact: any) => fact?.id && allIds.add(fact.id));
      (memory.lessonsLearned || []).forEach((lesson: any) => lesson?.id && allIds.add(lesson.id));
      setVisibleMomentIds(allIds);
    }
  }, [isMemoryFocused, memory.hardTruths, memory.goodFacts, memory.lessonsLearned, focusedMemory?.momentToShowId]);
  
  // When memory is focused, use smaller size like in creation screen (250px)
  // Otherwise use calculated size or default (scale for tablets)
  const memorySize = isMemoryFocused 
    ? (isTablet ? 375 : (isLargeDevice ? 300 : 250)) // 50% larger on tablets
    : (calculatedMemorySize ?? (isFocused ? 65 : 40));
  
  // Cloud and sun dimensions from creation screen (used when memory is focused)
  // Scale for tablets (50% larger)
  const cloudWidth = isTablet ? 720 : (isLargeDevice ? 480 : 320); // 50% larger on tablets
  const cloudHeight = isTablet ? 225 : (isLargeDevice ? 150 : 100); // 50% larger on tablets
  // Sun size - smaller to fit text nicely
  const sunWidth = isTablet ? 240 : (isLargeDevice ? 200 : 160); // Smaller size
  const sunHeight = isTablet ? 240 : (isLargeDevice ? 200 : 160); // Smaller size
  
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
    return (savedX: number | undefined, savedY: number | undefined, momentWidth: number, momentHeight: number, index: number, totalCount: number, memorySize: number, momentType: 'cloud' | 'sun' = 'sun') => {
      const memoryCenterX = position.x;
      const memoryCenterY = position.y;

      const padding = 20; // Padding from edges
      const headerSafeZone = 120; // Safe zone from top to avoid header and back button
      const minX = padding + momentWidth / 2;
      const maxX = SCREEN_WIDTH - padding - momentWidth / 2;
      const minY = headerSafeZone + momentHeight / 2; // Ensure moments don't overlap header
      const maxY = SCREEN_HEIGHT - padding - momentHeight / 2;
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
      const targetX = totalCount === 1 
        ? SCREEN_WIDTH / 2 // Center if only one moment
        : minX + (index * spacing);
      
      // Distribute vertically in the upper region
      const verticalSpacing = totalCount > 1 
        ? (upperRegionEnd - upperRegionStart) / Math.max(1, totalCount - 1)
        : 0;
      const targetY = upperRegionStart + (index * verticalSpacing);
        
        momentX = savedX !== undefined ? Math.max(minX, Math.min(maxX, savedX)) : targetX;
      // Clamp Y to upper region (above middle of screen)
        momentY = savedY !== undefined 
        ? Math.max(minY, Math.min(upperRegionEnd, savedY))
        : Math.max(minY, Math.min(upperRegionEnd, targetY));

      return { x: momentX, y: momentY };
    };
  }, [position.x, position.y]);
  
  // Handler to create a new cloud moment
  const handleAddCloud = React.useCallback(async () => {
    if (!onUpdateMemory) return;
    
    const allClouds = (memory.hardTruths || []).filter((truth: any) => truth && typeof truth === 'object' && !Array.isArray(truth));
    // Find first cloud that's not visible yet
    const nextCloud = allClouds.find((cloud: any) => cloud?.id && !visibleMomentIds.has(cloud.id));
    if (!nextCloud) return;
    
    // Calculate final position
    const visibleClouds = allClouds.filter((c: any) => visibleMomentIds.has(c.id));
    const clampedPos = calculateClampedPosition(
      nextCloud.x,
      nextCloud.y,
      cloudWidth,
      cloudHeight,
      visibleClouds.length,
      allClouds.length,
      memorySize,
      'cloud'
    );
    
    // Store start position for animation (button center, since panX/panY represent center)
    // Set this FIRST before marking as visible to ensure it's available when component renders
    // If button position isn't measured yet, measure it using requestAnimationFrame to ensure layout is complete
    const storeStartPosition = (buttonPos: { x: number; y: number } | null) => {
      if (buttonPos) {
        setNewlyCreatedMoments(prev => {
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
        cloudButtonRef.current?.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          const buttonCenterX = px + width / 2;
          const buttonCenterY = py + height / 2;
          const measuredPos = { x: buttonCenterX, y: buttonCenterY };
          setCloudButtonPos(measuredPos);
          storeStartPosition(measuredPos);
        });
      });
    }
    
    // Update memory with new position
    const updatedHardTruths = (memory.hardTruths || []).map((truth: any) =>
      truth.id === nextCloud.id ? { ...truth, x: clampedPos.x, y: clampedPos.y } : truth
    );
    await onUpdateMemory({ hardTruths: updatedHardTruths });
    
    // Mark as visible AFTER start position is set
    // If button position was already available, mark visible immediately
    // Otherwise, wait for the measurement to complete
    const markVisible = () => {
      setTimeout(() => {
        setVisibleMomentIds(prev => new Set([...prev, nextCloud.id]));
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
  }, [memory.hardTruths, visibleMomentIds, onUpdateMemory, calculateClampedPosition, cloudWidth, cloudHeight, memorySize, cloudButtonPos]);
  
  // Handler to create a new sun moment
  const handleAddSun = React.useCallback(async () => {
    if (!onUpdateMemory) return;
    
    const allSuns = (memory.goodFacts || []).filter((fact: any) => fact && typeof fact === 'object');
    // Find first sun that's not visible yet
    const nextSun = allSuns.find((sun: any) => sun?.id && !visibleMomentIds.has(sun.id));
    if (!nextSun) return;
    
    // Calculate final position
    const visibleSuns = allSuns.filter((s: any) => visibleMomentIds.has(s.id));
    const clampedPos = calculateClampedPosition(
      nextSun.x,
      nextSun.y,
      sunWidth,
      sunHeight,
      visibleSuns.length,
      allSuns.length,
      memorySize,
      'sun'
    );
    
    // Store start position for animation (button center, since panX/panY represent center)
    // Set this FIRST before marking as visible to ensure it's available when component renders
    // If button position isn't measured yet, measure it using requestAnimationFrame to ensure layout is complete
    const storeStartPosition = (buttonPos: { x: number; y: number } | null) => {
      if (buttonPos) {
        setNewlyCreatedMoments(prev => {
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
        sunButtonRef.current?.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          const buttonCenterX = px + width / 2;
          const buttonCenterY = py + height / 2;
          const measuredPos = { x: buttonCenterX, y: buttonCenterY };
          setSunButtonPos(measuredPos);
          storeStartPosition(measuredPos);
        });
      });
    }
    
    // Update memory with new position
    const updatedGoodFacts = (memory.goodFacts || []).map((fact: any) =>
      fact.id === nextSun.id ? { ...fact, x: clampedPos.x, y: clampedPos.y } : fact
    );
    await onUpdateMemory({ goodFacts: updatedGoodFacts });
    
    // Mark as visible AFTER start position is set
    // If button position was already available, mark visible immediately
    // Otherwise, wait for the measurement to complete
    const markVisible = () => {
      setTimeout(() => {
        setVisibleMomentIds(prev => new Set([...prev, nextSun.id]));
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
  }, [memory.goodFacts, visibleMomentIds, onUpdateMemory, calculateClampedPosition, sunWidth, sunHeight, memorySize, sunButtonPos]);

  // Handler to create a new lesson moment
  const handleAddLesson = React.useCallback(async () => {
    if (!onUpdateMemory) return;

    const allLessons = (memory.lessonsLearned || []).filter((lesson: any) => lesson && typeof lesson === 'object');
    // Find first lesson that's not visible yet
    const nextLesson = allLessons.find((lesson: any) => lesson?.id && !visibleMomentIds.has(lesson.id));
    if (!nextLesson) return;

    // Calculate final position (lessons use same dimensions as suns for now)
    const visibleLessons = allLessons.filter((l: any) => visibleMomentIds.has(l.id));
    const clampedPos = calculateClampedPosition(
      nextLesson.x,
      nextLesson.y,
      sunWidth, // Use sunWidth for lessons
      sunHeight, // Use sunHeight for lessons
      visibleLessons.length,
      allLessons.length,
      memorySize,
      'sun' // Use 'sun' type for lessons
    );

    // Store start position for animation
    const storeStartPosition = (buttonPos: { x: number; y: number } | null) => {
      if (buttonPos) {
        setNewlyCreatedMoments(prev => {
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
        lessonButtonRef.current?.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          const buttonCenterX = px + width / 2;
          const buttonCenterY = py + height / 2;
          const measuredPos = { x: buttonCenterX, y: buttonCenterY };
          setLessonButtonPos(measuredPos);
          storeStartPosition(measuredPos);
        });
      });
    }

    // Update memory with new position
    const updatedLessonsLearned = (memory.lessonsLearned || []).map((lesson: any) =>
      lesson.id === nextLesson.id ? { ...lesson, x: clampedPos.x, y: clampedPos.y } : lesson
    );
    await onUpdateMemory({ lessonsLearned: updatedLessonsLearned });

    // Mark as visible AFTER start position is set
    const markVisible = () => {
      setTimeout(() => {
        setVisibleMomentIds(prev => new Set([...prev, nextLesson.id]));
        // Set this as the active moment when created
        setActiveMomentId(nextLesson.id);
      }, 50);
    };

    if (lessonButtonPos) {
      markVisible();
    } else {
      setTimeout(markVisible, 100);
    }
  }, [memory.lessonsLearned, visibleMomentIds, onUpdateMemory, calculateClampedPosition, sunWidth, sunHeight, memorySize, lessonButtonPos]);

  const floatAnimation = useSharedValue(0);
  
  // Scale animation for focused state - memories scale to 2x (bigger than avatar for visibility)
  const scale = useSharedValue(isMemoryFocused ? 2.5 : (isFocused ? 2 : 1));
  React.useEffect(() => {
    scale.value = withSpring(isMemoryFocused ? 2.5 : (isFocused ? 2 : 1), {
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
        true
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
    'worklet';

    const isWheelMode = showEntityWheelShared ? showEntityWheelShared.value : false;

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
    } else if (isWheelMode && orbitAngle && baseOrbitAngle !== undefined) {
      // In wheel mode with orbit animation, calculate position based on current orbit angle
      // IMPORTANT: Access orbitAngle.value to make this worklet reactive to changes
      const currentOrbitAngle = orbitAngle.value;

      // Calculate the current angle for this memory
      // baseOrbitAngle is this memory's starting position in radians
      // currentOrbitAngle is the current rotation offset in degrees
      const currentAngleRad = baseOrbitAngle + (currentOrbitAngle * Math.PI / 180);

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
      opacity: 1 - (memorySlideOffset.value / (SCREEN_WIDTH * 2)),
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 4 },
      { scale: scale.value },
    ],
    // Reduce opacity when entity wheel is active to indicate disabled state
    opacity: showEntityWheelShared?.value ? 0.3 : 1,
  }));

  const clouds = useMemo(() => {
    const truths = memory.hardTruths || [];
    // Filter out any invalid entries (must be objects, not arrays, not strings)
    const validClouds = truths.filter((truth: any) => {
      const isValid = truth && typeof truth === 'object' && !Array.isArray(truth);
      return isValid;
    });
    return validClouds;
  }, [memory.hardTruths]);
  const suns = useMemo(() => {
    const facts = memory.goodFacts || [];
    // Filter out any invalid entries (must be objects)
    return facts.filter((fact: any) => fact && typeof fact === 'object');
  }, [memory.goodFacts]);
  const lessons = useMemo(() => {
    const lessonsData = memory.lessonsLearned || [];
    // Filter out any invalid entries (must be objects)
    return lessonsData.filter((lesson: any) => lesson && typeof lesson === 'object');
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
    const cloudPositionsResult: { angle: number; offsetX: number; offsetY: number }[] = [];
    const sunPositionsResult: { angle: number; offsetX: number; offsetY: number }[] = [];
    const lessonPositionsResult: { angle: number; offsetX: number; offsetY: number }[] = [];

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
      if (cloudIndex < clouds.length && cloudError >= sunError && cloudError >= lessonError) {
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

    return { cloudPositions: cloudPositionsResult, sunPositions: sunPositionsResult, lessonPositions: lessonPositionsResult };
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
      onMemoryFocus(memory.entityId || memory.profileId || '', memory.id, memory.sphere || 'relationships');
    }

    // If profile is not focused, also focus it
    if (!isFocused && onPress) {
      onPress();
    }
  }, [onMemoryFocus, onPress, isMemoryFocused, isFocused, memory.id, memory.entityId, memory.profileId, memory.sphere]);

  // Skip rendering this memory if another memory from the same entity is focused and this one isn't
  // OR if THIS memory is focused (it will be rendered by FocusedMemoryRenderer instead)
  // This prevents duplicate rendering and unnecessary re-renders when a specific memory is focused
  // Note: This check happens after hooks to comply with Rules of Hooks
  if (focusedMemory) {
    const focusedEntityId = focusedMemory.profileId || focusedMemory.jobId || focusedMemory.familyMemberId || focusedMemory.friendId || focusedMemory.hobbyId;
    const currentEntityId = memory.profileId || memory.jobId || memory.familyMemberId || memory.friendId || memory.hobbyId;

    // Hide this memory if it's from the same entity and either:
    // 1. This IS the focused memory (FocusedMemoryRenderer will handle it)
    // 2. Another memory from this entity is focused
    if (focusedEntityId === currentEntityId) {
      return null;
    }
  }

  // Determine if we should use static or animated positioning
  // Only use static position as fallback when no animated position is available
  const hasAnimatedPosition = isMemoryFocused ||
    (zoomProgress && avatarStartX && avatarStartY && avatarTargetX !== undefined && avatarTargetY !== undefined && avatarPosition) ||
    (focusedX && focusedY) ||
    (avatarPanX && avatarPanY);

  // Build base style with conditional static positioning
  const baseStyle = {
    position: 'absolute' as const,
    // Only set static position if there's no animated position
    // This prevents duplicate rendering where both static and animated positions are visible
    ...(hasAnimatedPosition ? {} : {
      left: position.x - memorySize / 2,
      top: position.y - memorySize / 2,
    }),
    zIndex: isMemoryFocused ? 1000 : 50, // Memory base layer - higher than avatars (100) so they appear in front
    pointerEvents: 'box-none' as const, // Allow touches to pass through to Pressable
  };

  return (
    <>
      <Animated.View
        pointerEvents={(showEntityWheel || (!onMemoryFocus && !onPress)) ? 'none' : 'auto'} // Disable all touches when entity wheel is active (use PROP not ref for render-time check)
        style={[
          baseStyle,
          memoryAnimatedPosition,
          animatedStyle,
          slideOutStyle,
          focusedMemoryStyle,
        ]}
      >
        <View
          style={{
            width: memorySize,
            height: memorySize,
            // Dynamic shadow color based on sunny/cloudy ratio - applied to outer container
            shadowColor: (() => {
              // Interpolate between dark gray (cloudy) and yellow (sunny)
              const t = sunnyPercentage / 100; // 0 = all cloudy, 1 = all sunny
              // Dark color: #2D3748 (darker gray)
              const darkR = 45, darkG = 55, darkB = 72;
              // Sunny color: #FFD700 (gold)
              const sunnyR = 255, sunnyG = 215, sunnyB = 0;
              // Interpolate
              const r = Math.round(darkR + (sunnyR - darkR) * t);
              const g = Math.round(darkG + (sunnyG - darkG) * t);
              const b = Math.round(darkB + (sunnyB - darkB) * t);
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
            pointerEvents: (showEntityWheel || (!onMemoryFocus && !onPress)) ? 'none' : 'auto', // Disable touches when entity wheel is active (use PROP for render-time check)
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
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
            >
              {(() => {
                  const centerX = memorySize / 2;
                  const centerY = memorySize / 2;
                  const strokeWidth = 1;
                  const borderRadius = memorySize / 2 - strokeWidth / 2; // Align border exactly on circle edge
                  const circumference = 2 * Math.PI * borderRadius;
                const cloudyPercentage = 100 - sunnyPercentage;
                
                  // Black circle for cloudy portion - starts at top (-90 degrees)
                  const blackDashLength = (cloudyPercentage / 100) * circumference;
                  
                  // Yellow circle for sunny portion - starts where black ends
                  const yellowDashLength = (sunnyPercentage / 100) * circumference;
                  // Rotate yellow to start where black ends: -90 (start) + (cloudyPercentage / 100) * 360 (where black ends)
                  const yellowRotation = -90 + (cloudyPercentage / 100) * 360;
                
                return (
                    <>
                      {/* Black border for cloudy moments */}
                      {cloudyPercentage > 0 && (
              <Circle
                          cx={centerX}
                          cy={centerY}
                          r={borderRadius}
                          stroke="#000000"
                          strokeWidth={strokeWidth}
                fill="none"
                          strokeDasharray={`${blackDashLength} ${circumference * 10}`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${centerX} ${centerY})`}
                        />
                      )}
                      {/* Yellow border for sunny moments */}
                      {sunnyPercentage > 0 && (
                  <Circle
                          cx={centerX}
                          cy={centerY}
                    r={borderRadius}
                          stroke="#FFD700"
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
              backgroundColor: colorScheme === 'dark'
                ? 'rgba(100, 150, 200, 0.9)'
                : 'rgba(150, 200, 255, 0.95)',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {memory.imageUri ? (
              <>
                <Image
                  source={{ uri: memory.imageUri }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: memorySize / 2,
                  }}
                  contentFit="cover"
                />

                {/* Gradient overlay based on sunny/cloudy ratio - show always except when memory itself is focused */}
                {!isMemoryFocused && (
                  <LinearGradient
                    colors={
                      sunnyPercentage >= 50
                        ? // Sunny gradient (bright/yellow) for positive memories
                          ['rgba(255, 215, 0, 0.4)', 'rgba(255, 215, 0, 0.5)', 'rgba(255, 215, 0, 0.4)']
                        : // Dark gradient for negative memories - intensity based on cloudy percentage
                          (() => {
                            const cloudyPercentage = 100 - sunnyPercentage;
                            // Calculate overlay opacity based on cloudy percentage
                            // When 0% sunny (100% cloudy): dark overlay (opacity 0.65) - dark but still see some image
                            // When 25% sunny: medium dark (opacity 0.55)
                            // When 49% sunny: lighter dark (opacity 0.5)
                            
                            // Linear interpolation: darker when more cloudy, lighter when more sunny
                            // Range: 0.5 (minimum) to 0.65 (maximum) - dark enough to indicate cloudy but not fully black
                            const baseOpacity = 0.5 + (cloudyPercentage / 100) * 0.15; // Range: 0.5 to 0.65
                            
                            return [
                              `rgba(0, 0, 0, ${baseOpacity})`,
                              `rgba(0, 0, 0, ${Math.min(0.7, baseOpacity + 0.05)})`,
                              `rgba(0, 0, 0, ${baseOpacity})`
                            ];
                          })()
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: memorySize / 2,
                    }}
                  />
                )}
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
                const title = memory.title || 'Memory';
                let message = `${title}\n\n`;

                if (memory.goodFacts && memory.goodFacts.length > 0) {
                  message += '☀️ Sunny Moments:\n';
                  memory.goodFacts.forEach((fact: any, index: number) => {
                    const text = typeof fact === 'string' ? fact : fact.text || fact.content || String(fact);
                    message += `${index + 1}. ${text}\n`;
                  });
                  message += '\n';
                }

                if (memory.hardTruths && memory.hardTruths.length > 0) {
                  message += '☁️ Hard Truths:\n';
                  memory.hardTruths.forEach((truth: any, index: number) => {
                    const text = typeof truth === 'string' ? truth : truth.text || truth.content || String(truth);
                    message += `${index + 1}. ${text}\n`;
                  });
                  message += '\n';
                }

                if (memory.lessonsLearned && memory.lessonsLearned.length > 0) {
                  message += '💡 Lessons Learned:\n';
                  memory.lessonsLearned.forEach((lesson: any, index: number) => {
                    const text = typeof lesson === 'string' ? lesson : lesson.text || lesson.content || String(lesson);
                    message += `${index + 1}. ${text}\n`;
                  });
                }

                // Open modal with content
                setShareModalContent({
                  title: title,
                  message: message.trim(),
                });
                setShareModalVisible(true);
              } catch (error) {
                logError('HomeScreen:ShareContent', error);
              }
            }}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 20,
              borderWidth: 2,
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)',
              shadowColor: '#000',
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
        const lessonCount = lessons.length;
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
}, (prevProps, nextProps) => {
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
    prevProps.focusedMemory?.profileId === nextProps.focusedMemory?.profileId &&
    prevProps.focusedMemory?.memoryId === nextProps.focusedMemory?.memoryId &&
    (prevProps.memory.hardTruths?.length ?? 0) === (nextProps.memory.hardTruths?.length ?? 0) &&
    (prevProps.memory.goodFacts?.length ?? 0) === (nextProps.memory.goodFacts?.length ?? 0)
  );
});

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
  colorScheme: 'light' | 'dark';
  onPress?: () => void;
  sunnyPercentage?: number;
  showEntityWheel?: boolean;
  showEntityWheelRef?: React.MutableRefObject<boolean>;
}) {
  // Make clouds smaller when focused, but maintain proper proportions
  // Use larger base size to avoid clipping and maintain aspect ratio
  const cloudSize = isFocused ? 18 : 24; // Smaller when focused, but not too small

  const floatAnimation = useSharedValue(0);

  // No scale animation when focused - use proper base size instead
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = 1; // Keep at 1 to maintain proportions
  }, [isFocused, scale]);

  React.useEffect(() => {
    floatAnimation.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatAnimation);
    };
  }, [floatAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
    // Reduce opacity when entity wheel is active (similar to how spheres are disabled)
    opacity: showEntityWheel ? 0.3 : 1,
  }));

  const cloudAnimatedPosition = useAnimatedStyle(() => {
    'worklet';

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
      const safeX = typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 0;
      const safeY = typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 0;
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
  if (!cloud || typeof cloud !== 'object' || Array.isArray(cloud)) {
    return null;
  }

  // Ensure cloudSize is a number
  const safeCloudSize = typeof cloudSize === 'number' ? cloudSize : 24;

  return (
    <Animated.View
      pointerEvents={(showEntityWheel || !onPress) ? 'none' : 'box-none'} // Disable all touches when entity wheel is active or no handler (use PROP for render-time check)
      style={[
        {
          position: 'absolute',
          zIndex: typeof zIndex === 'number' ? zIndex : 24, // Higher than memories (20) so moments are on top
        },
        cloudAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        disabled={showEntityWheel || !onPress} // Disable when entity wheel is active or no handler (use PROP for render-time check)
        style={{
          pointerEvents: (showEntityWheel || !onPress) ? 'none' : 'auto', // Disable touches when entity wheel is active or no handler (use PROP for render-time check)
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
            backgroundColor: '#FFFFFF', // White background
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: 'rgba(0,0,0,0.3)', // Dark border
            // Dynamic shadow color based on sunny/cloudy ratio
            shadowColor: (() => {
              // Interpolate between dark gray (cloudy) and yellow (sunny)
              const t = sunnyPercentage / 100; // 0 = all cloudy, 1 = all sunny
              // Dark color: #2D3748 (darker gray)
              const darkR = 45, darkG = 55, darkB = 72;
              // Sunny color: #FFD700 (gold)
              const sunnyR = 255, sunnyG = 215, sunnyB = 0;
              // Interpolate
              const r = Math.round(darkR + (sunnyR - darkR) * t);
              const g = Math.round(darkG + (sunnyG - darkG) * t);
              const b = Math.round(darkB + (sunnyB - darkB) * t);
              return `rgb(${r}, ${g}, ${b})`;
            })(),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 7,
            elevation: 5,
          }}
        >
          <MaterialIcons name="cloud" size={safeCloudSize * 0.7} color="#000000" />
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
  colorScheme: 'light' | 'dark';
  onPress?: () => void;
  sunnyPercentage?: number;
  showEntityWheel?: boolean;
  showEntityWheelRef?: React.MutableRefObject<boolean>;
}) {
  // Make suns smaller when focused, but maintain proper proportions
  // Use larger base size to avoid clipping and maintain aspect ratio
  const sunSize = isFocused ? 16 : 22; // Smaller when focused, but not too small

  const floatAnimation = useSharedValue(0);

  // No scale animation when focused - use proper base size instead
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = 1; // Keep at 1 to maintain proportions
  }, [isFocused, scale]);

  React.useEffect(() => {
    floatAnimation.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      // Cancel infinite float animation on cleanup
      cancelAnimation(floatAnimation);
    };
  }, [floatAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
    // Reduce opacity when entity wheel is active (similar to how spheres are disabled)
    opacity: showEntityWheel ? 0.3 : 1,
  }));

  const sunAnimatedPosition = useAnimatedStyle(() => {
    'worklet';

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
      const safeX = typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 0;
      const safeY = typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 0;
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
      pointerEvents={(showEntityWheel || !onPress) ? 'none' : 'box-none'} // Disable all touches when entity wheel is active or no handler (use PROP for render-time check)
      style={[
        {
          position: 'absolute',
          zIndex: typeof zIndex === 'number' ? zIndex : 24, // Higher than memories (20) so moments are on top
        },
        sunAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        disabled={showEntityWheel || !onPress} // Disable when entity wheel is active or no handler (use PROP for render-time check)
        style={{ pointerEvents: (showEntityWheel || !onPress) ? 'none' : 'auto' }} // Disable touches when entity wheel is active or no handler (use PROP for render-time check)
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
            // Dynamic shadow color based on sunny/cloudy ratio
            shadowColor: (() => {
              // Interpolate between dark gray (cloudy) and yellow (sunny)
              const t = sunnyPercentage / 100; // 0 = all cloudy, 1 = all sunny
              // Dark color: #2D3748 (darker gray)
              const darkR = 45, darkG = 55, darkB = 72;
              // Sunny color: #FFD700 (gold)
              const sunnyR = 255, sunnyG = 215, sunnyB = 0;
              // Interpolate
              const r = Math.round(darkR + (sunnyR - darkR) * t);
              const g = Math.round(darkG + (sunnyG - darkG) * t);
              const b = Math.round(darkB + (sunnyB - darkB) * t);
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
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Defs>
            <RadialGradient 
              id={`floatingSunGradient-${sun?.id || 'default'}`} 
              cx="11" 
              cy="11" 
              rx="5" 
              ry="5"
              fx="11"
              fy="11"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#FFB300" stopOpacity="1" />
              <Stop offset="50%" stopColor="#FFC107" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFD54F" stopOpacity="1" />
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
                fill="#FFD700"
              />
            );
          })}
          {/* Central circle */}
          <Circle
            cx="11"
            cy="11"
            r="5"
            fill={`url(#floatingSunGradient-${sun?.id || 'default'})`}
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
  colorScheme: 'light' | 'dark';
  onPress?: () => void;
  showEntityWheel?: boolean;
  showEntityWheelRef?: React.MutableRefObject<boolean>;
}) {
  const lessonSize = isFocused ? 16 : 22;

  const floatAnimation = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = 1;
  }, [isFocused, scale]);

  React.useEffect(() => {
    floatAnimation.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(floatAnimation);
    };
  }, [floatAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
    // Reduce opacity when entity wheel is active (similar to how spheres are disabled)
    opacity: showEntityWheel ? 0.3 : 1,
  }));

  const lessonAnimatedPosition = useAnimatedStyle(() => {
    'worklet';

    let finalX, finalY;

    if (memoryCenterX && memoryCenterY) {
      const centerX = memoryCenterX.value;
      const centerY = memoryCenterY.value;
      finalX = centerX + offsetX - lessonSize / 2;
      finalY = centerY + offsetY - lessonSize / 2;
    } else {
      const safeX = typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 0;
      const safeY = typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 0;
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
      pointerEvents={(showEntityWheel || !onPress) ? 'none' : 'box-none'} // Disable all touches when entity wheel is active or no handler (use PROP for render-time check)
      style={[
        {
          position: 'absolute',
          zIndex: typeof zIndex === 'number' ? zIndex : 24,
        },
        lessonAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        disabled={showEntityWheel || !onPress} // Disable when entity wheel is active or no handler (use PROP for render-time check)
        style={{ pointerEvents: (showEntityWheel || !onPress) ? 'none' : 'auto' }} // Disable touches when entity wheel is active or no handler (use PROP for render-time check)
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
            backgroundColor: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#FFD700',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <MaterialIcons
            name="lightbulb"
            size={lessonSize * 0.7}
            color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// Overall Percentage Avatar Component (center display)
const OverallPercentageAvatar = React.memo(function OverallPercentageAvatar({
  percentage,
  colorScheme,
  colors,
}: {
  percentage: number;
  colorScheme: 'light' | 'dark';
  colors: any;
}) {
  const { isTablet } = useLargeDevice();
  const t = useTranslate();
  const { language } = useLanguage();
  
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
  const minDistanceToFloatingEntity = sphereDistanceFromCenter - floatingEntityRadius - floatingEntityRadiusSize;
  
  // Base avatar size
  const baseAvatarSize = isTablet ? 160 : 100; // Reduced - smaller central avatar
  const baseAvatarRadius = baseAvatarSize / 2;

  // Check if main circle (with some padding) would intersect floating entities
  // Add 5px padding to ensure clear separation
  const padding = 5;
  const maxSafeAvatarRadius = minDistanceToFloatingEntity - padding;

  // Use smaller size if intersection detected, otherwise use base size
  const avatarSize = maxSafeAvatarRadius < baseAvatarRadius
    ? Math.max(maxSafeAvatarRadius * 2, isTablet ? 140 : 80) // Minimum size to ensure readability
    : baseAvatarSize;
  
  const borderWidth = isTablet ? 12 : 8; // Scale border width proportionally
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Use the same gradient colors as the screen background
  const gradientColors = colorScheme === 'dark' ? DARK_GRADIENT_COLORS : LIGHT_GRADIENT_COLORS;

  return (
    <View
      style={{
        position: 'relative',
        width: avatarSize,
        height: avatarSize,
      }}
    >
      <View
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden', // Ensure perfect circle clipping
        }}
      >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
        }}
      />
      <Svg
        width={avatarSize}
        height={avatarSize}
        viewBox={`0 0 ${avatarSize} ${avatarSize}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Defs>
          <SvgLinearGradient id="overallBorderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFF9C4" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FFD700" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFA000" stopOpacity="1" />
          </SvgLinearGradient>
          {/* Strong outer glow filter - extends outward prominently */}
          <Filter id="outerYellowGlow" x="-200%" y="-200%" width="500%" height="500%">
            {/* Large outer glow layer - very spread out */}
            <FeGaussianBlur in="SourceGraphic" stdDeviation="20" result="outerBlurLarge" />
            <FeColorMatrix
              in="outerBlurLarge"
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.5 0"
              result="outerGlowLarge"
            />
            {/* Medium outer glow layer */}
            <FeGaussianBlur in="SourceGraphic" stdDeviation="12" result="outerBlurMedium" />
            <FeColorMatrix
              in="outerBlurMedium"
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.7 0"
              result="outerGlowMedium"
            />
            {/* Smaller outer glow layer for definition */}
            <FeGaussianBlur in="SourceGraphic" stdDeviation="6" result="outerBlurSmall" />
            <FeColorMatrix
              in="outerBlurSmall"
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.9 0"
              result="outerGlowSmall"
            />
            {/* Merge all outer glow layers */}
            <FeMerge>
              <FeMergeNode in="outerGlowLarge" />
              <FeMergeNode in="outerGlowMedium" />
              <FeMergeNode in="outerGlowSmall" />
            </FeMerge>
          </Filter>
          {/* Enhanced glow filter with both inner and outer glow */}
          <Filter id="yellowGlow" x="-200%" y="-200%" width="500%" height="500%">
            {/* Strong outer glow - larger blur that extends outward prominently */}
            <FeGaussianBlur in="SourceGraphic" stdDeviation="16" result="outerBlur" />
            <FeColorMatrix
              in="outerBlur"
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 1.0 0"
              result="outerGlow"
            />
            {/* Medium outer glow for more spread */}
            <FeGaussianBlur in="SourceGraphic" stdDeviation="10" result="outerBlurMedium" />
            <FeColorMatrix
              in="outerBlurMedium"
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.85 0"
              result="outerGlowMedium"
            />
            {/* Inner glow - smaller blur that extends inward */}
            <FeGaussianBlur in="SourceGraphic" stdDeviation="4" result="innerBlur" />
            <FeColorMatrix
              in="innerBlur"
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 0.843   0 0 0 0 0   0 0 0 0.8 0"
              result="innerGlow"
            />
            {/* Merge: outer glows (behind), inner glow (middle), source (front) */}
            <FeMerge>
              <FeMergeNode in="outerGlow" />
              <FeMergeNode in="outerGlowMedium" />
              <FeMergeNode in="innerGlow" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        </Defs>
        <Circle
          cx={avatarSize / 2}
          cy={avatarSize / 2}
          r={radius}
          stroke="#000000"
          strokeWidth={borderWidth}
          fill="none"
        />
        {/* Outer glow layer - extends outward from the circle */}
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
        {/* Glowing yellow progress ring with enhanced shine (inner + outer glow) */}
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
      </Svg>

      <View style={{ alignItems: 'center', marginTop: -8 }}>
        <ThemedText size="xl" weight="bold" style={{ color: '#FFD700', fontSize: 24 }}>
          {Math.round(percentage)}%
        </ThemedText>
        {language === 'bg' ? (
          <View style={{ alignItems: 'center' }}>
            <ThemedText 
              size="sm" 
              weight="medium" 
              style={{ 
                color: '#FFD700', 
                fontSize: 10,
                marginTop: -2,
                textAlign: 'center',
                lineHeight: 10
              }}
            >
              Слънчев
            </ThemedText>
            <ThemedText 
              size="sm" 
              weight="medium" 
              style={{ 
                color: '#FFD700', 
                fontSize: 10,
                textAlign: 'center',
                lineHeight: 10,
                marginTop: -1
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
              color: '#FFD700', 
              fontSize: 12,
              marginTop: -2 
            }}
          >
            {t('avatar.sunnyLife')}
          </ThemedText>
        )}
      </View>
      </View>

      {/* Sun icon - positioned in the middle of the yellow (sunny) arc */}
      {percentage > 0 && (() => {
        // Calculate angle for middle of sunny arc
        // Arc starts at -90° (top) and goes clockwise by percentage
        // Middle of sunny arc is at: -90° + (percentage/100 * 360°) / 2
        const sunnyArcAngle = -90 + (percentage / 100 * 360) / 2;
        const sunnyAngleRad = (sunnyArcAngle * Math.PI) / 180;
        const iconRadius = avatarSize / 2; // Position on the circle edge

        // Calculate position
        const sunX = avatarSize / 2 + iconRadius * Math.cos(sunnyAngleRad) - 12;
        const sunY = avatarSize / 2 + iconRadius * Math.sin(sunnyAngleRad) - 12;

        return (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: sunY,
              left: sunX,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#FFD700',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#FFA500',
              zIndex: 999,
              elevation: 30,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            }}
          >
            <MaterialIcons name="wb-sunny" size={14} color="#FFFFFF" />
          </View>
        );
      })()}

      {/* Cloud icon - positioned in the middle of the black (cloudy) arc */}
      {percentage < 100 && percentage > 0 && (() => {
        // Calculate angle for middle of cloudy arc
        // Cloudy arc starts where sunny arc ends and goes to complete the circle
        // Start angle: -90° + (percentage/100 * 360°)
        // End angle: -90° + 360° (back to top)
        // Middle: start + (remaining arc / 2)
        const cloudyStartAngle = -90 + (percentage / 100 * 360);
        const cloudyArcLength = 360 - (percentage / 100 * 360);
        const cloudyArcAngle = cloudyStartAngle + cloudyArcLength / 2;
        const cloudyAngleRad = (cloudyArcAngle * Math.PI) / 180;
        const iconRadius = avatarSize / 2; // Position on the circle edge

        // Calculate position
        const cloudX = avatarSize / 2 + iconRadius * Math.cos(cloudyAngleRad) - 12;
        const cloudY = avatarSize / 2 + iconRadius * Math.sin(cloudyAngleRad) - 12;

        return (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: cloudY,
              left: cloudX,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#555555',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#222222',
              zIndex: 999,
              elevation: 30,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            }}
          >
            <MaterialIcons name="cloud" size={14} color="#FFFFFF" />
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
  colorScheme: 'light' | 'dark';
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

      return { offsetX, offsetY, size, delay, duration, id: `center-${i}`, fixed: false };
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

        return { offsetX, offsetY, size, delay, duration, id: `top-${i}`, fixed: true };
      });

      const bottomDots = Array.from({ length: numDotsBottom }, (_, i) => {
        // Random positions in bottom area - these stay fixed (absolute screen positions)
        const offsetX = Math.random() * SCREEN_WIDTH;
        const offsetY = SCREEN_HEIGHT - bottomAreaHeight + Math.random() * bottomAreaHeight;

        // Medium size range for better visibility (2-4px)
        const size = 2 + Math.random() * 2;

        // Random delay for staggered animation
        const delay = Math.random() * 2000;

        // Random animation duration (2.5-4 seconds)
        const duration = 2500 + Math.random() * 1500;

        return { offsetX, offsetY, size, delay, duration, id: `bottom-${i}`, fixed: true };
      });

      return [...centerDots, ...topDots, ...bottomDots];
    } else {
      // Original mode: only center dots
      return centerDots;
    }
  }, [avatarSize, isTablet, fullScreen]);

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
  colorScheme: 'light' | 'dark';
  fixed?: boolean;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  React.useEffect(() => {
    // Scale up animation
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 })
    );

    // Fade in first, then start pulsing with better visibility
    opacity.value = withDelay(
      delay,
      withTiming(0.7, {
        duration: 600,
        easing: Easing.out(Easing.ease)
      }, (finished) => {
        if (finished) {
          // After fade in completes, start pulsing (between 0.4 and 0.7 for better visibility)
          opacity.value = withRepeat(
            withTiming(0.4, { duration, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
          );
        }
      })
    );

    return () => {
      // Cancel infinite opacity pulse animation on cleanup
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [delay, duration, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Calculate position based on avatar center (animated or static) + offset
    let x: number;
    let y: number;

    // Check if we're using animated values (check inside worklet for reactivity)
    const isAnimated = typeof avatarCenterX === 'object' && 'value' in avatarCenterX;

    if (isAnimated && !fixed) {
      // Use animated values for position tracking - dots follow avatar
      const centerXVal = (avatarCenterX as ReturnType<typeof useSharedValue<number>>).value;
      const centerYVal = (avatarCenterY as ReturnType<typeof useSharedValue<number>>).value;
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

  // More visible glow color based on theme
  const glowColor = colorScheme === 'dark'
    ? 'rgba(255, 255, 255, 0.65)' // Increased from 0.4 to 0.65
    : 'rgba(255, 215, 0, 0.55)'; // Increased from 0.3 to 0.55

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
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

// Spiraling Icons Component - moment icons that flow out from avatar during wheel spin
const SpiralingStars = React.memo(function SpiralingStars({
  avatarCenterX,
  avatarCenterY,
  isSpinning,
  colorScheme,
  momentType = 'lessons',
}: {
  avatarCenterX: ReturnType<typeof useSharedValue<number>>;
  avatarCenterY: ReturnType<typeof useSharedValue<number>>;
  isSpinning: ReturnType<typeof useSharedValue<boolean>>;
  colorScheme: 'light' | 'dark';
  momentType?: 'lessons' | 'hardTruths' | 'sunnyMoments';
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
  colorScheme,
  momentType = 'lessons',
}: {
  avatarCenterX: ReturnType<typeof useSharedValue<number>>;
  avatarCenterY: ReturnType<typeof useSharedValue<number>>;
  startAngle: number;
  spiralOffset: number;
  size: number;
  delay: number;
  isSpinning: ReturnType<typeof useSharedValue<boolean>>;
  colorScheme: 'light' | 'dark';
  momentType?: 'lessons' | 'hardTruths' | 'sunnyMoments';
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  // React to isSpinning changes using useAnimatedReaction
  useAnimatedReaction(
    () => isSpinning.value,
    (spinning, previousSpinning) => {
      'worklet';
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
            false // Don't reverse
          )
        );

        // Fade in then fade out as star travels
        opacity.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }),
              withTiming(0, { duration: 2000, easing: Easing.in(Easing.ease) })
            ),
            -1,
            false
          )
        );
      } else if (!spinning && previousSpinning) {
        // Just stopped spinning - cancel animations
        cancelAnimation(progress);
        cancelAnimation(opacity);
        progress.value = 0;
        opacity.value = 0;
      }
    },
    [delay]
  );

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';

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

  // Icon and color based on moment type
  const getIconConfig = () => {
    switch (momentType) {
      case 'lessons':
        return {
          icon: '💡',
          color: 'rgba(255, 215, 0, 1)', // Bright yellow for bulbs
        };
      case 'sunnyMoments':
        return {
          icon: '☀️',
          color: 'rgba(255, 193, 7, 1)', // Golden yellow for suns
        };
      case 'hardTruths':
        return {
          icon: '☁️',
          color: 'rgba(140, 140, 140, 1)', // Grey for clouds
        };
      default:
        return {
          icon: '💡',
          color: 'rgba(255, 215, 0, 1)', // Bright yellow for bulbs
        };
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
  colorScheme: 'light' | 'dark';
  colors: any;
  delay?: number;
  entityType: 'partner' | 'job' | 'family' | 'friend' | 'hobby';
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
      totalSuns += (memory.goodFacts || []).length + (memory.lessonsLearned || []).length; // Lessons count as positive moments
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
        true
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
    'worklet';
    const currentZoom = zoomProgress.value;
    const shouldHide = shouldHideShared.value;
    
    // Fade out and scale down completely when sphere is selected
    // Match the sphere animation timing for synchronized disappearance
    const opacity = shouldHide ? (1 - currentZoom) : 1; // Fade from 1 to 0
    const scale = shouldHide ? (1 - currentZoom * 1.0) : 1; // Scale from 1 to 0 (completely shrink)
    
    // Only show floating animation when not zooming and sphere is not selected
    const floatY = (!shouldHide && currentZoom === 0) ? floatOffset.value * 8 : 0; // 8px floating range
    
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
      if (entityType === 'partner') {
        return colorScheme === 'dark' ? 'rgba(255, 150, 150, 0.6)' : 'rgba(255, 200, 200, 0.7)';
      } else if (entityType === 'job') {
        return colorScheme === 'dark' ? 'rgba(150, 200, 255, 0.6)' : 'rgba(200, 230, 255, 0.7)';
      } else if (entityType === 'family') {
        return colorScheme === 'dark' ? 'rgba(200, 150, 255, 0.6)' : 'rgba(230, 200, 255, 0.7)';
      } else if (entityType === 'friend') {
        return colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.6)' : 'rgba(167, 139, 250, 0.7)';
      } else {
        // hobby
        return colorScheme === 'dark' ? 'rgba(249, 115, 22, 0.6)' : 'rgba(255, 157, 88, 0.7)';
      }
    } else {
      // More cloudy - darker colors
      if (entityType === 'partner') {
        return colorScheme === 'dark' ? 'rgba(180, 60, 60, 0.7)' : 'rgba(200, 100, 100, 0.6)';
      } else if (entityType === 'job') {
        return colorScheme === 'dark' ? 'rgba(60, 100, 180, 0.7)' : 'rgba(100, 130, 200, 0.6)';
      } else if (entityType === 'family') {
        return colorScheme === 'dark' ? 'rgba(120, 60, 180, 0.7)' : 'rgba(150, 100, 200, 0.6)';
      } else if (entityType === 'friend') {
        return colorScheme === 'dark' ? 'rgba(88, 28, 135, 0.7)' : 'rgba(124, 58, 237, 0.6)';
      } else {
        // hobby
        return colorScheme === 'dark' ? 'rgba(154, 52, 18, 0.7)' : 'rgba(234, 88, 12, 0.6)';
      }
    }
  }, [isMoreSunny, entityType, colorScheme]);
  
  const borderColor = React.useMemo(() => {
    if (isMoreSunny) {
      // More sunny - lighter border
      return colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(100, 150, 255, 0.8)';
    } else {
      // More cloudy - darker border
      return colorScheme === 'dark' ? 'rgba(100, 100, 100, 0.8)' : 'rgba(50, 50, 50, 0.7)';
    }
  }, [isMoreSunny, colorScheme]);
  
  // Get glow color based on entity type
  const glowColor = React.useMemo(() => {
    if (entityType === 'partner') {
      return isMoreSunny ? '#ff6b6b' : '#cc4444';
    } else if (entityType === 'job') {
      return isMoreSunny ? '#4dabf7' : '#3b8ac7';
    } else if (entityType === 'family') {
      return isMoreSunny ? '#b197fc' : '#8b6bc4';
    } else if (entityType === 'friend') {
      return isMoreSunny ? '#8b5cf6' : '#6b3cc4';
    } else {
      // hobby
      return isMoreSunny ? '#ff922b' : '#e67700';
    }
  }, [entityType, isMoreSunny]);

  return (
    <Animated.View
      style={[
        {
          ...(isWrapped ? {} : {
          position: 'absolute',
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
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons
            name={
              entityType === 'partner' ? 'person' :
              entityType === 'family' ? 'family-restroom' :
              entityType === 'friend' ? 'people' :
              entityType === 'hobby' ? 'sports-esports' :
              'work'
            }
            size={isTablet ? 24 : 16}
            color={isMoreSunny ? (colorScheme === 'dark' ? '#ffffff' : '#333333') : (colorScheme === 'dark' ? '#cccccc' : '#ffffff')}
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
  momentType: 'lessons' | 'hardTruths' | 'sunnyMoments';
  colorScheme: 'light' | 'dark';
  index: number;
  total: number;
  isWrapped?: boolean;
  selectedMomentType?: 'lessons' | 'hardTruths' | 'sunnyMoments';
}) {
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
        true
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
          withDelay(1000, withTiming(1, { duration: 0 })) // 1 second pause between pulses
        ),
        -1,
        false
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
      case 'sunnyMoments':
        return {
          name: 'wb-sunny' as const,
          color: colorScheme === 'dark' ? '#FFC832' : '#FF9800',
        };
      case 'hardTruths':
        return {
          name: 'cloud' as const,
          color: colorScheme === 'dark' ? '#B0B0C8' : '#7878A0',
        };
      case 'lessons':
      default:
        return {
          name: 'lightbulb' as const,
          color: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
        };
    }
  }, [momentType, colorScheme]);

  return (
    <Animated.View
      style={[
        {
          position: isWrapped ? ('relative' as const) : ('absolute' as const),
          ...(!isWrapped && {
            left: position.x - iconSize / 2,
            top: position.y - iconSize / 2,
          }),
          width: iconSize,
          height: iconSize,
          justifyContent: 'center',
          alignItems: 'center',
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
const momentAnimationStateMap = new Map<string, { hasStarted: boolean; lastSeen: number }>();

const FloatingMomentFromMemory = function FloatingMomentFromMemory({
  memoryIndex,
  momentIndex,
  totalMoments,
  momentType,
  colorScheme,
  text = '',
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
}: {
  memoryIndex: number;
  momentIndex: number;
  totalMoments: number;
  momentType: 'lesson' | 'sunny' | 'cloudy';
  colorScheme: 'light' | 'dark';
  text?: string;
  isTablet: boolean;
  isLargeDevice: boolean;
  orbitAngle: Animated.SharedValue<number>;
  starCenterX: Animated.SharedValue<number>;
  starCenterY: Animated.SharedValue<number>;
  focusedX: Animated.SharedValue<number>;
  focusedY: Animated.SharedValue<number>;
  panX: Animated.SharedValue<number>;
  panY: Animated.SharedValue<number>;
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
}) {
  const positionIndex = batchSize > 0 ? spawnSlot % batchSize : 0;
  const totalConcurrent = Math.max(1, batchSize);
  const angleOffset = (cycleId * 0.618) % (2 * Math.PI);
  const fontScale = useFontScale();
  
  // Track the initial scale value to ensure we can always reset correctly
  const initialScaleRef = React.useRef<number | null>(null);
  
  // Track if animation has been initialized to prevent sudden appearance
  const animationInitializedRef = React.useRef(false);
  // Track the moment's identity to detect when it actually changes
  const momentIdentityRef = React.useRef<string>('');
  // Track if animation has started for this specific moment instance
  const hasStartedAnimationRef = React.useRef(false);
  
  // Calculate text length for dynamic sizing (matching selectedWheelMoment calculation)
  const textLength = text?.length || 0;

  // Base sizes for floating moments - scaled so "bigger amount of letters = bigger element"
  const baseSunSize = isTablet ? 180 : (isLargeDevice ? 160 : 130);
  const baseCloudWidth = isTablet ? 200 : 160;
  const baseCloudHeight = isTablet ? 125 : 100;
  const baseLessonSize = isTablet ? 180 : 140;

  // Scale aggressively with text length so long text never overflows
  const dynamicSunSize = Math.min(
    isTablet ? 440 : 400,
    Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 2.5))
  );

  const cloudWidthMultiplier = Math.min(2.8, Math.max(1.0, 1.0 + (textLength / 55)));
  const cloudHeightMultiplier = Math.min(2.4, Math.max(1.0, 1.0 + (textLength / 60)));
  const dynamicCloudWidth = baseCloudWidth * cloudWidthMultiplier;
  const dynamicCloudHeight = baseCloudHeight * cloudHeightMultiplier;

  const lessonSizeMultiplier = Math.min(2.5, Math.max(1.0, 1.0 + (textLength / 80)));
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

  // Almost-invisible dot size before grow / after shrink (was 12–14px; now ~2px)
  const smallIconSize = isTablet ? 2.5 : 2;

  // Calculate scale ratios: start almost invisible, grow to full size, shrink back to almost invisible
  const initialScale = smallIconSize / Math.max(finalWidth, finalHeight);
  const finalScale = 1.0; // Full size
  
  // Store initial scale in ref for stable reference
  if (initialScaleRef.current === null || initialScaleRef.current !== initialScale) {
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
  const globalAnimationState = momentAnimationStateMap.get(currentMomentIdentity);
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
      } else if (currentScale >= 0.9 && !hasStartedAnimationRef.current && currentScale >= finalScale * 0.95) {
        scale.value = initialScale;
        hasStartedAnimationRef.current = false;
      }
    }
  }, [scale, growPulseScale, initialScale, finalScale, currentMomentIdentity, hasAnimatedBefore]);

  // Animation: grow from small icon size to big size, hold, then shrink back
  React.useEffect(() => {
    const effectMomentIdentity = currentMomentIdentity;
    const globalState = momentAnimationStateMap.get(effectMomentIdentity);
    const hasStartedGlobally = globalState?.hasStarted ?? false;

    if (momentIdentityRef.current !== effectMomentIdentity || hasStartedAnimationRef.current || hasStartedGlobally) {
      return;
    }

    hasStartedAnimationRef.current = true;
    momentAnimationStateMap.set(effectMomentIdentity, { hasStarted: true, lastSeen: Date.now() });

    const GROW_DELAY = 400;
    const GROW_DURATION = 1400;
    const HOLD_DURATION = 3200;
    const SHRINK_DURATION = 1200;

    growPulseScale.value = 1;
    animationInitializedRef.current = true;

    let growTimeout: NodeJS.Timeout;
    let pulseTimeout: NodeJS.Timeout;
    let shrinkTimeout: NodeJS.Timeout;

    growTimeout = setTimeout(() => {
      if (animationInitializedRef.current && momentIdentityRef.current === effectMomentIdentity) {
        const currentScale = scale.value;
        if (Math.abs(currentScale - initialScale) > 0.01 && currentScale < initialScale * 1.1) {
          scale.value = initialScale;
        }
        scale.value = withTiming(finalScale, { duration: GROW_DURATION, easing: Easing.out(Easing.ease) });
      }
    }, GROW_DELAY);

    pulseTimeout = setTimeout(() => {
      if (animationInitializedRef.current && momentIdentityRef.current === effectMomentIdentity) {
        growPulseScale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
          ),
          Math.floor(HOLD_DURATION / 1200),
          false
        );
      }
    }, GROW_DELAY + GROW_DURATION);

    shrinkTimeout = setTimeout(() => {
      if (animationInitializedRef.current && momentIdentityRef.current === effectMomentIdentity) {
        scale.value = withTiming(initialScale, { duration: SHRINK_DURATION, easing: Easing.in(Easing.ease) });
      }
    }, GROW_DELAY + GROW_DURATION + HOLD_DURATION);

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

  // Calculate position dynamically based on current orbit angle
  // This MUST be reactive to all changes: focusedX, focusedY, orbitAngle, showEntityWheelShared
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';

    // Check if we're in wheel mode (matching line 4954)
    const isWheelMode = showEntityWheelShared ? showEntityWheelShared.value : false;

    // Only calculate orbital positions in wheel mode
    // In non-wheel mode, moments should not appear (they only appear when wheel mode is active)
    if (!isWheelMode) {
      // Hide the moment when not in wheel mode
      return {
        position: 'absolute',
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
    const layoutMomentSize = isTablet ? 620 : 530;
    const minCenterToCenter = layoutMomentSize + (isTablet ? 60 : 50);
    const minRadius = avatarSize / 2 + layoutMomentSize / 2 + (isTablet ? 35 : 28);
    let distributionRadius = minRadius;

    if (totalConcurrent > 1) {
      const n = totalConcurrent;
      // Account for angle jitter (±30% of half-arc): worst-case min gap = 0.4 * (2π/n)
      const sinJitter = Math.sin(0.4 * Math.PI / n);
      const radiusFromChord = sinJitter > 1e-6
        ? minCenterToCenter / (2 * sinJitter)
        : minRadius;
      distributionRadius = Math.max(minRadius, radiusFromChord);
    }
    
    // Cap base radius so the circle fits; account for tab bar so moments stay above it
    const effectiveBottom = SCREEN_HEIGHT - bottomInset;
    const maxRLeft = avatarX - viewportPadding - layoutMomentSize / 2;
    const maxRRight = SCREEN_WIDTH - avatarX - viewportPadding - layoutMomentSize / 2;
    const maxRTop = avatarY - viewportPadding - layoutMomentSize / 2;
    const maxRBottom = effectiveBottom - avatarY - viewportPadding - layoutMomentSize / 2;
    const maxRFromViewport = Math.max(0, Math.min(maxRLeft, maxRRight, maxRTop, maxRBottom));
    distributionRadius = Math.min(distributionRadius, Math.max(minRadius, maxRFromViewport));

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
      const angle = (positionIndex * angleStep) - (Math.PI / 2) + angleOffset + angleJitter;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      let R = distributionRadius;
      let tMax = Infinity;
      if (Math.abs(cosA) > 1e-9) {
        const t1 = (minX - avatarX) / cosA;
        const t2 = (maxX - avatarX) / cosA;
        const txLo = Math.min(t1, t2);
        const txHi = Math.max(t1, t2);
        tMax = Math.min(tMax, txHi);
      }
      if (Math.abs(sinA) > 1e-9) {
        const t1 = (minY - avatarY) / sinA;
        const t2 = (maxY - avatarY) / sinA;
        const tyLo = Math.min(t1, t2);
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

    return {
      position: 'absolute',
      left: momentX - halfW,
      top: momentY - halfH,
      transform: [{ scale: scale.value * growPulseScale.value }],
      zIndex: 1005,
    };
  }, [focusedX, focusedY, showEntityWheelShared, memoryIndex, momentIndex, momentType, isTablet, finalWidth, finalHeight, scale, growPulseScale, positionIndex, totalConcurrent, angleOffset, angleJitter, bottomInset]);

  // Render using the EXACT same visualization as selectedWheelMoment (post-spin moments)
  // This matches the wheel of life moment display exactly
  if (momentType === 'sunny') {
    return (
      <Animated.View style={animatedStyle}>
        <View
          style={{
            width: finalWidth,
            height: finalHeight,
            shadowColor: '#FFD700',
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
            style={{ position: 'absolute', top: 0, left: 0 }}
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
                <Stop offset="0%" stopColor="#FFEB3B" stopOpacity="1" />
                <Stop offset="30%" stopColor="#FFEB3B" stopOpacity="1" />
                <Stop offset="60%" stopColor="#FFD700" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FFC107" stopOpacity="1" />
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
              const rightX = outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
              const rightY = outerY + Math.sin(perpAngle + Math.PI) * halfWidth;
              
              return (
                <Path
                  key={`floatingSunRay-${i}`}
                  d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                  fill="#FFD700"
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
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: finalWidth,
              height: finalHeight,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: (finalWidth / 160) * 48 * 0.7,
              paddingVertical: (finalWidth / 160) * 48 * 0.5,
            }}
          >
            <ThemedText
              style={{
                color: 'black',
                fontSize: Math.max(11, Math.min(16, 12 + (textLength / 60))) * fontScale,
                textAlign: 'center',
                fontWeight: '700',
                maxWidth: (finalWidth / 160) * 48 * 1.5,
              }}
            >
              {text?.split('\n')[0] || text}
            </ThemedText>
            {text?.includes('\n') && (
              <ThemedText
                style={{
                  color: 'black',
                  fontSize: Math.max(7, Math.min(11, 7 + (textLength / 100))) * fontScale,
                  textAlign: 'center',
                  fontWeight: '600',
                  maxWidth: (finalWidth / 160) * 48 * 1.5,
                }}
              >
                {text.split('\n')[1]}
              </ThemedText>
            )}
          </View>
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
            shadowColor: '#4A5568',
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
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <Defs>
              <SvgLinearGradient id={`floatingCloudGradient-${memoryIndex}-${momentIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#2C3E50" stopOpacity="0.95" />
                <Stop offset="50%" stopColor="#1A1A1A" stopOpacity="0.98" />
                <Stop offset="100%" stopColor="#0A0A0A" stopOpacity="1" />
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
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: finalWidth,
              height: finalHeight,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: Math.max(20, finalWidth * 0.12),
              paddingVertical: Math.max(12, finalHeight * 0.12),
            }}
          >
            <ThemedText
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: Math.max(11, Math.min(15, 12 + (textLength / 70))) * fontScale,
                textAlign: 'center',
                fontWeight: '500',
                maxWidth: finalWidth * 0.9,
              }}
            >
              {text}
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Lesson - use full lightbulb element with text below (matching main wheel of life PulsingFloatingMomentIcon)
  return (
    <Animated.View style={animatedStyle}>
      <View
        style={{
          width: finalWidth,
          height: finalHeight,
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: isTablet ? 12 : 9,
          elevation: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <MaterialIcons
          name="lightbulb"
          size={finalWidth * 0.4}
          color={colorScheme === 'dark' ? '#FFD700' : '#FFA000'}
        />
        {/* Text below lightbulb */}
        {text && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 15,
              paddingBottom: 10,
            }}
          >
            <ThemedText
              style={{
                color: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
                fontSize: Math.max(9, Math.min(13, 11 - (textLength / 70))) * fontScale,
                textAlign: 'center',
                fontWeight: '600',
                lineHeight: Math.max(11, Math.min(15, 13 - (textLength / 70))) * fontScale,
              }}
              numberOfLines={textLength > 80 ? 4 : 3}
            >
              {text}
            </ThemedText>
          </View>
        )}
      </View>
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
  text = '',
}: {
  centerX: number;
  centerY: number;
  angle: number; // Angle around the center avatar (0 to 2π)
  radius: number; // Distance from center avatar
  momentType: 'lessons' | 'hardTruths' | 'sunnyMoments';
  colorScheme: 'light' | 'dark';
  delay?: number;
  onComplete?: () => void;
  selectedMomentType?: 'lessons' | 'hardTruths' | 'sunnyMoments';
  shouldGrowToFull?: boolean; // Whether to grow to full popup size instead of just pulsing
  text?: string; // The moment text to display inside the element
}) {
  // Initialize shared values - these will be fresh for each component instance
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const growPulseScale = useSharedValue(1); // Pulse animation when fully grown
  const floatOffset = useSharedValue(0);
  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textRef = useRef(text); // Store text in ref to avoid re-renders
  const hasStartedGrowAnimation = useRef(false); // Track if grow animation has started

  const { isTablet } = useLargeDevice();
  const fontScale = useFontScale();
  const iconSize = isTablet ? 20 : 16; // Slightly larger than regular floating icons

  const isSelected = selectedMomentType === momentType;

  // Calculate position around center
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  // Animation effect for shouldGrowToFull moments - runs once on mount
  React.useEffect(() => {
    if (!shouldGrowToFull) return;

    // For grow-to-full moments: always start animation on mount
    // Explicitly set starting values
    scale.value = 0;
    opacity.value = 0;
    growPulseScale.value = 1;

    const HOLD_DURATION = 4000; // Hold for 4 seconds while pulsing

    // Start the animation sequence
    scale.value = withSequence(
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
      withDelay(HOLD_DURATION, withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) }))
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 800 }),
      withDelay(HOLD_DURATION, withTiming(0, { duration: 800 }))
    );

    // Start pulsing animation after growing completes (800ms delay)
    // Pulse for the duration of the hold period
    setTimeout(() => {
      growPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        Math.floor(HOLD_DURATION / 1200), // Number of pulse cycles that fit in hold duration
        false
      );
    }, 800);

    // No cleanup - let animation complete naturally
  }, [shouldGrowToFull]); // Only depend on shouldGrowToFull to avoid re-animations

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
        true
      );
    };

    let delayTimer: NodeJS.Timeout | null = null;

    if (delay > 0) {
      delayTimer = setTimeout(startAnimation, delay) as unknown as NodeJS.Timeout;
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
          withTiming(1, { duration: 2000 })
        ),
        -1,
        false
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

    return {
      transform: [
        { translateY: floatY },
        { scale: finalScale },
      ],
      opacity: opacity.value,
    };
  });

  // Icon properties based on moment type
  const iconProps = React.useMemo(() => {
    switch (momentType) {
      case 'sunnyMoments':
        return {
          name: 'wb-sunny' as const,
          color: colorScheme === 'dark' ? '#FFC832' : '#FF9800',
        };
      case 'hardTruths':
        return {
          name: 'cloud' as const,
          color: colorScheme === 'dark' ? '#B0B0C8' : '#7878A0',
        };
      case 'lessons':
      default:
        return {
          name: 'lightbulb' as const,
          color: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
        };
    }
  }, [momentType, colorScheme]);

  // If shouldGrowToFull, render the full popup element, otherwise render icon
  if (shouldGrowToFull) {
    // Calculate size based on text length for better fit
    const textLength = text?.length || 0;

    // For suns and lessons: scale based on text length
    // Base size + additional size based on character count
    const minSunSize = isTablet ? 200 : 140;
    const maxSunSize = isTablet ? 320 : 220;
    const sunSizeIncrement = isTablet ? 0.6 : 0.4; // px per character
    const calculatedSunSize = Math.min(maxSunSize, minSunSize + (textLength * sunSizeIncrement));
    const baseSunSize = calculatedSunSize;

    // For clouds: scale width and height based on text length
    const minCloudWidth = isTablet ? 300 : 220;
    const maxCloudWidth = isTablet ? 500 : 360;
    const cloudWidthIncrement = isTablet ? 1.2 : 0.8; // px per character
    const calculatedCloudWidth = Math.min(maxCloudWidth, minCloudWidth + (textLength * cloudWidthIncrement));

    const minCloudHeight = isTablet ? 120 : 90;
    const maxCloudHeight = isTablet ? 200 : 140;
    // Height scales more gradually
    const cloudHeightIncrement = isTablet ? 0.4 : 0.3;
    const calculatedCloudHeight = Math.min(maxCloudHeight, minCloudHeight + (textLength * cloudHeightIncrement));

    const baseCloudWidth = calculatedCloudWidth;
    const baseCloudHeight = calculatedCloudHeight;

    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: momentType === 'hardTruths' ? x - baseCloudWidth / 2 : x - baseSunSize / 2,
            top: momentType === 'hardTruths' ? y - baseCloudHeight / 2 : y - baseSunSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 55,
          },
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        {momentType === 'sunnyMoments' ? (
          // Render full sun element
          <View
            style={{
              width: baseSunSize,
              height: baseSunSize,
              shadowColor: '#FFD700',
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
              style={{ position: 'absolute', top: 0, left: 0 }}
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
                  <Stop offset="0%" stopColor="#FFEB3B" stopOpacity="1" />
                  <Stop offset="30%" stopColor="#FFEB3B" stopOpacity="1" />
                  <Stop offset="60%" stopColor="#FFD700" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#FFC107" stopOpacity="1" />
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
                const rightX = outerX + Math.cos(perpAngle + Math.PI) * halfWidth;
                const rightY = outerY + Math.sin(perpAngle + Math.PI) * halfWidth;

                return (
                  <Path
                    key={`pulsingRay-${i}`}
                    d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                    fill="#FFD700"
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
            {/* Text overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: baseSunSize,
                height: baseSunSize,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: (baseSunSize / 160) * 48 * 0.6,
                paddingVertical: (baseSunSize / 160) * 48 * 0.4,
              }}
            >
              <ThemedText
                style={{
                  color: 'black',
                  fontSize: Math.max(10, Math.min(14, 12 - (textLength / 60))) * fontScale,
                  textAlign: 'center',
                  fontWeight: '700',
                  lineHeight: Math.max(12, Math.min(16, 14 - (textLength / 60))) * fontScale,
                }}
                numberOfLines={textLength > 80 ? 4 : 3}
              >
                {text?.split('\n')[0] || text}
              </ThemedText>
              {text?.includes('\n') && (
                <ThemedText
                  style={{
                    color: 'black',
                    fontSize: Math.max(6, Math.min(9, 7 - (textLength / 80))) * fontScale,
                    textAlign: 'center',
                    fontWeight: '600',
                  }}
                  numberOfLines={2}
                >
                  {text.split('\n')[1]}
                </ThemedText>
              )}
            </View>
          </View>
        ) : momentType === 'hardTruths' ? (
          // Render full cloud element
          <View
            style={{
              width: baseCloudWidth,
              height: baseCloudHeight,
              shadowColor: '#4A5568',
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
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <Defs>
                <SvgLinearGradient id={`pulsingCloudGradient-${centerX}-${centerY}-${angle}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#2C3E50" stopOpacity="0.95" />
                  <Stop offset="50%" stopColor="#1A1A1A" stopOpacity="0.98" />
                  <Stop offset="100%" stopColor="#0A0A0A" stopOpacity="1" />
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
            {/* Text overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: baseCloudWidth,
                height: baseCloudHeight,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 20,
              }}
            >
              <ThemedText
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: Math.max(11, Math.min(16, 14 - (textLength / 50))) * fontScale,
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: Math.max(13, Math.min(18, 16 - (textLength / 50))) * fontScale,
                }}
                numberOfLines={textLength > 100 ? 5 : 4}
              >
                {text}
              </ThemedText>
            </View>
          </View>
        ) : (
          // Render full lightbulb element (lessons)
          <View
            style={{
              width: baseSunSize,
              height: baseSunSize,
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: isTablet ? 12 : 9,
              elevation: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons
              name="lightbulb"
              size={baseSunSize * 0.4}
              color={colorScheme === 'dark' ? '#FFD700' : '#FFA000'}
            />
            {/* Text below lightbulb */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 15,
                paddingBottom: 10,
              }}
            >
              <ThemedText
                style={{
                  color: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
                  fontSize: Math.max(9, Math.min(13, 11 - (textLength / 70))) * fontScale,
                  textAlign: 'center',
                  fontWeight: '600',
                  lineHeight: Math.max(11, Math.min(15, 13 - (textLength / 70))) * fontScale,
                }}
                numberOfLines={textLength > 80 ? 4 : 3}
              >
                {text}
              </ThemedText>
            </View>
          </View>
        )}
      </Animated.View>
    );
  }

  // Default: render small icon
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - iconSize / 2,
          top: y - iconSize / 2,
          width: iconSize,
          height: iconSize,
          justifyContent: 'center',
          alignItems: 'center',
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
      position: 'absolute' as const,
      left: x,
      top: y,
      transform: [{ translateX: offset }, { translateY: offset }, { scale: scaleValue }],
    };
  });

  return (
    <Animated.View style={animatedStyle} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
});

// Wrapper for floating entities that rotate with their parent sphere
const RotatableFloatingEntityWrapper = React.memo(function RotatableFloatingEntityWrapper({
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
      position: 'absolute' as const,
      left: entityX,
      top: entityY,
      transform: [{ translateX: offset }, { translateY: offset }, { scale: scaleValue }],
    };
  });

  return (
    <Animated.View style={animatedStyle} pointerEvents="box-none">
      {children}
    </Animated.View>
  );
});

// Rotatable wrapper for floating moment icons - applies rotation and positions around entities
const RotatableFloatingMomentIconWrapper = React.memo(function RotatableFloatingMomentIconWrapper({
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
      position: 'absolute' as const,
      left: iconX,
      top: iconY,
      transform: [{ translateX: offset }, { translateY: offset }, { scale: scaleValue }],
    };
  });

  return (
    <Animated.View style={animatedStyle} pointerEvents="none">
      {children}
    </Animated.View>
  );
});

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
}: {
  sphere: LifeSphere;
  position: { x: number; y: number };
  colorScheme: 'light' | 'dark';
  colors: any;
  onPress: () => void;
  sunnyPercentage: number; // 0-100, percentage of sunny moments
  selectedSphere: LifeSphere | null;
  zoomProgress: ReturnType<typeof useSharedValue<number>>;
  disabled?: boolean;
  isWrapped?: boolean; // If true, don't use absolute positioning (parent handles it)
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
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
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
    relationships: 'favorite',
    career: 'work',
    family: 'family-restroom',
    friends: 'people',
    hobbies: 'sports-esports',
  };

  // Get sphere-specific icon colors - theme-aware for proper contrast
  // Light mode: Use darker, more saturated colors for contrast against light grey backgrounds
  // Dark mode: Use desaturated colors for reduced eye strain and better readability
  const getSphereIconColor = (sphereType: LifeSphere): string => {
    if (colorScheme === 'light') {
      // Light mode: Use darker, more saturated colors for better contrast with light grey backgrounds
      // Following Material Design principles for light surfaces
      switch (sphereType) {
        case 'relationships':
          return '#D32F2F'; // Darker red for better contrast
        case 'career':
          return '#1976D2'; // Darker blue for better contrast
        case 'family':
          return '#388E3C'; // Darker green for better contrast
        case 'friends':
          return '#7B1FA2'; // Darker purple for better contrast
        case 'hobbies':
          return '#F57C00'; // Darker orange for better contrast
        default:
          return '#1976D2'; // Default to darker blue
      }
    } else {
      // Dark mode: Use desaturated colors (Material Design 300 palette)
      // These work well against dark backgrounds and reduce eye strain
      switch (sphereType) {
        case 'relationships':
          return '#E57373'; // Desaturated red
        case 'career':
          return '#64B5F6'; // Desaturated blue
        case 'family':
          return '#81C784'; // Desaturated green
        case 'friends':
          return '#BA68C8'; // Desaturated purple
        case 'hobbies':
          return '#FFB74D'; // Desaturated orange
        default:
          return '#64B5F6'; // Default to desaturated blue
      }
    }
  };
  
  // Determine sphere background gradient colors based on sunny vs cloudy
  // Lighter for more suns, darker for more clouds
  // Returns an array of 3 colors for a subtle gradient
  // Light mode uses grey shades, dark mode uses colorful gradients
  const sphereGradientColors = React.useMemo(() => {
    const isMoreSunny = sunnyPercentage >= 50;
    
    // Light mode: Use darker grey shades for better contrast with darker icon colors
    // Following accessibility guidelines: darker backgrounds provide better contrast
    if (colorScheme === 'light') {
      if (isMoreSunny) {
        // More sunny - medium grey gradient (darker for better contrast)
        // Base grey value increases with sunny percentage but stays darker for contrast
        const baseGrey = 170 + (sunnyPercentage / 100) * 30; // Range: 170-200 (darker than before)
        return [
          `rgb(${baseGrey - 8}, ${baseGrey - 8}, ${baseGrey - 8})`, // Slightly darker
          `rgb(${baseGrey}, ${baseGrey}, ${baseGrey})`, // Base color
          `rgb(${baseGrey + 8}, ${baseGrey + 8}, ${baseGrey + 8})`, // Slightly lighter
        ] as const;
      } else {
        // More cloudy - darker grey gradient
        const cloudyPercentage = 100 - sunnyPercentage;
        const baseGrey = 130 + (cloudyPercentage / 100) * 40; // Range: 130-170 (darker for contrast)
        return [
          `rgb(${baseGrey - 8}, ${baseGrey - 8}, ${baseGrey - 8})`, // Slightly darker
          `rgb(${baseGrey}, ${baseGrey}, ${baseGrey})`, // Base color
          `rgb(${baseGrey + 8}, ${baseGrey + 8}, ${baseGrey + 8})`, // Slightly lighter
        ] as const;
      }
    }
    
    // Dark mode: Use colorful gradients (existing logic)
    if (sphere === 'relationships') {
      if (isMoreSunny) {
        // More sunny - lighter pink/red gradient
        const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
        return [
          `rgba(255, 140, 140, ${baseOpacity - 0.05})`, // Slightly darker
          `rgba(255, 150, 150, ${baseOpacity})`, // Base color
          `rgba(255, 160, 160, ${baseOpacity + 0.05})`, // Slightly lighter
        ] as const;
      } else {
        // More cloudy - darker red gradient
        const cloudyPercentage = 100 - sunnyPercentage;
        const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
        return [
          `rgba(170, 50, 50, ${baseOpacity - 0.05})`,
          `rgba(180, 60, 60, ${baseOpacity})`,
          `rgba(190, 70, 70, ${baseOpacity + 0.05})`,
        ] as const;
      }
    } else if (sphere === 'career') {
      // Career sphere
      if (isMoreSunny) {
        // More sunny - lighter blue gradient
        const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
        return [
          `rgba(140, 190, 245, ${baseOpacity - 0.05})`,
          `rgba(150, 200, 255, ${baseOpacity})`,
          `rgba(160, 210, 255, ${baseOpacity + 0.05})`,
        ] as const;
      } else {
        // More cloudy - darker blue gradient
        const cloudyPercentage = 100 - sunnyPercentage;
        const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
        return [
          `rgba(50, 90, 170, ${baseOpacity - 0.05})`,
          `rgba(60, 100, 180, ${baseOpacity})`,
          `rgba(70, 110, 190, ${baseOpacity + 0.05})`,
        ] as const;
      }
    } else if (sphere === 'family') {
      // Family sphere
      if (isMoreSunny) {
        // More sunny - lighter purple/violet gradient
        const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
        return [
          `rgba(190, 140, 245, ${baseOpacity - 0.05})`,
          `rgba(200, 150, 255, ${baseOpacity})`,
          `rgba(210, 160, 255, ${baseOpacity + 0.05})`,
        ] as const;
      } else {
        // More cloudy - darker purple gradient
        const cloudyPercentage = 100 - sunnyPercentage;
        const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
        return [
          `rgba(110, 50, 170, ${baseOpacity - 0.05})`,
          `rgba(120, 60, 180, ${baseOpacity})`,
          `rgba(130, 70, 190, ${baseOpacity + 0.05})`,
        ] as const;
      }
    } else if (sphere === 'friends') {
      // Friends sphere - purple/violet
      if (isMoreSunny) {
        const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
        return [
          `rgba(129, 82, 236, ${baseOpacity - 0.05})`,
          `rgba(139, 92, 246, ${baseOpacity})`,
          `rgba(149, 102, 255, ${baseOpacity + 0.05})`,
        ] as const;
      } else {
        const cloudyPercentage = 100 - sunnyPercentage;
        const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
        return [
          `rgba(78, 18, 125, ${baseOpacity - 0.05})`,
          `rgba(88, 28, 135, ${baseOpacity})`,
          `rgba(98, 38, 145, ${baseOpacity + 0.05})`,
        ] as const;
      }
    } else {
      // Hobbies sphere - orange
      if (isMoreSunny) {
        const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
        return [
          `rgba(239, 105, 12, ${baseOpacity - 0.05})`,
          `rgba(249, 115, 22, ${baseOpacity})`,
          `rgba(255, 125, 32, ${baseOpacity + 0.05})`,
        ] as const;
      } else {
        const cloudyPercentage = 100 - sunnyPercentage;
        const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
        return [
          `rgba(144, 42, 8, ${baseOpacity - 0.05})`,
          `rgba(154, 52, 18, ${baseOpacity})`,
          `rgba(164, 62, 28, ${baseOpacity + 0.05})`,
        ] as const;
      }
    }
  }, [sunnyPercentage, colorScheme, sphere]);

  // Create subtle floating animation similar to floating memories
  const floatAnimation = useSharedValue(0);
  
  // Different animation delays and durations for each sphere to create organic movement
  const animationDelays = useMemo(() => ({
    relationships: 0,
    career: 500,
    family: 1000,
    friends: 1500,
    hobbies: 2000,
  }), []);
  
  const animationDurations = useMemo(() => ({
    relationships: 2000,
    career: 1800,
    family: 1900,
    friends: 1950,
    hobbies: 1850,
  }), []);

  // Track if this sphere is selected using shared values (worklet-compatible)
  // Use numeric encoding: 0 = relationships, 1 = career, 2 = family, 3 = friends, 4 = hobbies, -1 = null
  const sphereTypeNum = sphere === 'relationships' ? 0 : sphere === 'career' ? 1 : sphere === 'family' ? 2 : sphere === 'friends' ? 3 : sphere === 'hobbies' ? 4 : -1;
  const selectedSphereNum = selectedSphere === 'relationships' ? 0 : selectedSphere === 'career' ? 1 : selectedSphere === 'family' ? 2 : selectedSphere === 'friends' ? 3 : selectedSphere === 'hobbies' ? 4 : -1;
  
  const selectedSphereNumShared = useSharedValue(selectedSphereNum);
  const isSelectedFlag = useSharedValue(selectedSphereNum === sphereTypeNum ? 1 : 0);
  const isOtherSelectedFlag = useSharedValue(selectedSphereNum !== -1 && selectedSphereNum !== sphereTypeNum ? 1 : 0);
  
  // Update shared values immediately when selectedSphere changes using useLayoutEffect
  React.useLayoutEffect(() => {
    // Convert selectedSphere to numeric value
    const newSelectedNum = selectedSphere === 'relationships' ? 0 : selectedSphere === 'career' ? 1 : selectedSphere === 'family' ? 2 : selectedSphere === 'friends' ? 3 : selectedSphere === 'hobbies' ? 4 : -1;
    
    // Update all shared values immediately and synchronously
    selectedSphereNumShared.value = newSelectedNum;
    isSelectedFlag.value = newSelectedNum === sphereTypeNum ? 1 : 0;
    isOtherSelectedFlag.value = newSelectedNum !== -1 && newSelectedNum !== sphereTypeNum ? 1 : 0;
  }, [selectedSphere, sphereTypeNum, selectedSphereNumShared, isSelectedFlag, isOtherSelectedFlag]);

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
        true
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
  }, [sphere, floatAnimation, animationDelays, animationDurations, selectedSphere]);

  // Reset loading progress when sphere is deselected
  React.useEffect(() => {
    if (selectedSphere !== sphere) {
      loadingProgress.value = withTiming(0, { duration: 200 });
    }
  }, [selectedSphere, sphere, loadingProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
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
      scale = 1 + (currentZoom * 0.8); // Scale from 1 to 1.8
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
        scale = Math.max(0, 1 - (currentZoom * 1.0));
        opacity = Math.max(0, 1 - currentZoom);
      } else {
        scale = 1;
        opacity = 1;
      }
    }
    
    // Add floating animation only when fully unfocused and no sphere is selected
    const floatY = (!isOtherSelected && !isSelected && currentZoom === 0) ? floatAnimation.value * 3 : 0;

    // Combine scale with pulse animation
    const finalScale = scale * pulseScale.value;

    return {
      transform: [
        { scale: finalScale },
        { translateY: floatY },
      ],
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

  // Get loading border color based on sphere type and theme
  // Colors match the sphere's gradient for better visual cohesion
  const loadingBorderColor = React.useMemo(() => {
    if (colorScheme === 'light') {
      // Light mode: Use vibrant colors that stand out against grey spheres
      switch (sphere) {
        case 'relationships':
          return '#D32F2F'; // Red
        case 'career':
          return '#1976D2'; // Blue
        case 'family':
          return '#388E3C'; // Green
        case 'friends':
          return '#7B1FA2'; // Purple
        case 'hobbies':
          return '#F57C00'; // Orange
        default:
          return '#1976D2';
      }
    } else {
      // Dark mode: Use colors that match the sphere gradients
      switch (sphere) {
        case 'relationships':
          return '#FF9696'; // Lighter pink/red to match sphere
        case 'career':
          return '#96CAFF'; // Lighter blue to match sphere
        case 'family':
          return '#C89CFF'; // Lighter purple to match family sphere
        case 'friends':
          return '#9B7AFF'; // Lighter purple to match friends sphere
        case 'hobbies':
          return '#FFAA5A'; // Lighter orange to match sphere
        default:
          return '#96CAFF';
      }
    }
  }, [sphere, colorScheme]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={{
        ...(isWrapped ? {} : {
        position: 'absolute',
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
            overflow: 'visible', // Changed to visible to show shadows properly
            justifyContent: 'center',
            alignItems: 'center',
            // Enhanced elevated shadow effect with glow
            shadowColor: colorScheme === 'dark' ? loadingBorderColor : '#000',
            shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
            shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.2,
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
              backgroundColor: 'rgba(128, 128, 128, 0.3)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons
              name={sphereIcons[sphere] as any}
              size={sphereSize * 0.5}
              color={getSphereIconColor(sphere)}
            />
          </Animated.View>
        ) : (
          <LinearGradient
            colors={sphereGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: sphereSize,
              height: sphereSize,
              borderRadius: sphereSize / 2,
              overflow: 'hidden', // Ensures gradient respects border radius
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons
              name={sphereIcons[sphere] as any}
              size={sphereSize * 0.5}
              color={getSphereIconColor(sphere)}
            />
          </LinearGradient>
        )}

        {/* Loading progress ring */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: sphereSize,
              height: sphereSize,
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
            },
            loadingRingStyle,
          ]}
        >
          <Svg width={sphereSize} height={sphereSize}>
            <AnimatedCircle
              cx={sphereSize / 2}
              cy={sphereSize / 2}
              r={circleRadius}
              stroke={loadingBorderColor}
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
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { isTablet, isLargeDevice } = useLargeDevice();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
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
    reloadIdealizedMemories,
    reloadProfiles,
    reloadJobs,
    reloadFamilyMembers,
    reloadFriends,
    reloadHobbies,
  } = useJourney();
  const t = useTranslate();
  const { language: appLanguage } = useLanguage();

  // Streak feature state
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [currentBadge, setCurrentBadge] = useState<StreakBadge | null>(null);
  const [nextBadge, setNextBadge] = useState<StreakBadge | null>(null);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [streakRulesModalVisible, setStreakRulesModalVisible] = useState(false);

  // Walkthrough modal state
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);
  const walkthroughCheckedRef = useRef(false);
  const { isAnimationComplete, isVisible: isSplashVisible } = useSplash();

  // Load streak data on mount and when screen focuses
  const loadStreakData = useCallback(async () => {
    try {
      // Recalculate streak first (handles badge downgrade if days passed)
      const data = await recalculateStreak();
      setStreakData(data);

      const badge = await getCurrentBadge();
      setCurrentBadge(badge);

      const next = await getNextBadge();
      setNextBadge(next);

      // Refresh notifications based on current streak status
      await refreshStreakNotifications();
    } catch (error) {
      logError('HomeScreen:LoadStreakData', error);
    }
  }, []);

  // Load streak data on mount
  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  // Track app state to pause/resume intervals when app backgrounds/foregrounds
  const [isAppActive, setIsAppActive] = useState(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setIsAppActive(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Track if this is the first app launch (splash screen shown)
  const isFirstLaunchRef = useRef(true);

  // Check for first launch and show walkthrough if no data exists
  // This runs whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset the check when screen comes into focus
      walkthroughCheckedRef.current = false;

      // Function to check and show walkthrough
      const checkWalkthrough = () => {
        // Only check once per focus
        if (walkthroughCheckedRef.current) {
          return;
        }

        // On first launch, wait for splash to complete
        // On subsequent navigations, only wait for loading to complete
        const shouldWaitForSplash = isFirstLaunchRef.current;
        const splashConditionsMet = shouldWaitForSplash ? (!isSplashVisible && isAnimationComplete) : true;

        if (!isLoading && splashConditionsMet) {
          // Mark as checked FIRST to prevent re-runs
          walkthroughCheckedRef.current = true;

          // After first check, we don't need to wait for splash anymore
          if (isFirstLaunchRef.current && splashConditionsMet) {
            isFirstLaunchRef.current = false;
          }

          // Check if there are any entities or memories
          const totalEntities = profiles.length + jobs.length + familyMembers.length + friends.length + hobbies.length;
          const totalMemories = idealizedMemories.length;

          // If no entities and no memories, show walkthrough
          if (totalEntities === 0 && totalMemories === 0) {
            setWalkthroughVisible(true);
            // Request infinite pulse animation on spheres tab
            requestSpheresTabPulse(false); // false = pulse infinitely
          }
        }
      };

      // Check immediately on focus
      checkWalkthrough();

      return () => {
        // Cleanup: stop pulse when leaving the screen
        stopSpheresTabPulse();
      };
    }, [isLoading, isAnimationComplete, isSplashVisible, profiles.length, jobs.length, familyMembers.length, friends.length, hobbies.length, idealizedMemories.length])
  );

  const handleWalkthroughDismiss = useCallback(async () => {
    try {
      // Don't save to AsyncStorage - we want modal to reappear if user navigates back
      setWalkthroughVisible(false);

      // Check if there are no entities - if so, redirect to spheres tab
      const totalEntities = profiles.length + jobs.length + familyMembers.length + friends.length + hobbies.length;
      if (totalEntities === 0) {
        // Redirect to spheres tab after a small delay to ensure modal is closed
        setTimeout(() => {
          router.push('/(tabs)/spheres');
        }, 300);
        return;
      }

      // Pulse ONCE to remind the user to go to spheres tab
      // Don't stop first - just request a single pulse which will replace the infinite one
      requestSpheresTabPulse(true); // true = pulse only once
    } catch (_error) {
      setWalkthroughVisible(false);
    }
  }, [profiles.length, jobs.length, familyMembers.length, friends.length, hobbies.length]);

  const handleOnboardingDemo = useCallback(() => {
    // Navigate to settings to trigger demo data generation
    router.push('/(tabs)/settings');
  }, []);

  // Avatar pulse animation - continuously pulses every 3 seconds
  const avatarPulseScale = useSharedValue(1);

  // Continuous pulse animation - pulses every 3 seconds
  useFocusEffect(
    useCallback(() => {
      // Start continuous pulse animation - pulse to 1.1 then back to 1, repeat with 3 second intervals
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
          withDelay(3000, withTiming(1, { duration: 0 })) // 3 second delay before next pulse
        ),
        -1, // Repeat infinitely
        false // Don't reverse
      );

      // Cleanup: cancel animation when leaving the screen
      return () => {
        cancelAnimation(avatarPulseScale);
        avatarPulseScale.value = 1;
      };
    }, [avatarPulseScale])
  );

  // Reload all data from AsyncStorage when screen comes into focus
  // This ensures data is always fresh and not stale from React state
  // This is especially important after running the mock data script or after app restart
  const hasReloadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // Only reload once per focus session to prevent infinite loops
      if (hasReloadedRef.current) {
        return;
      }
      
      hasReloadedRef.current = true;
      
      Promise.all([
        reloadIdealizedMemories(),
        reloadProfiles(),
        reloadJobs(),
        reloadFamilyMembers(),
        reloadFriends(),
        reloadHobbies(),
        loadStreakData(), // Reload streak data when screen regains focus
      ]).catch((error) => {
        hasReloadedRef.current = false; // Reset on error so we can retry
      });
      
      // Reset reload flag when screen loses focus (cleanup)
      return () => {
        hasReloadedRef.current = false;
      };
    }, [reloadIdealizedMemories, reloadProfiles, reloadJobs, reloadFamilyMembers, reloadFriends, reloadHobbies, loadStreakData])
  );

  // Animated style for avatar pulse
  const avatarPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: avatarPulseScale.value }],
    };
  });
  
  // Track selected sphere (null = showing all spheres, otherwise showing focused sphere)
  // Initialize from URL params if present
  const sphereParam = params.sphere && typeof params.sphere === 'string' && ['relationships', 'career', 'family', 'friends', 'hobbies'].includes(params.sphere) 
    ? (params.sphere as LifeSphere)
    : null;
  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(sphereParam);
  const previousSelectedSphereRef = useRef<LifeSphere | null>(null);
  const sphereRenderKeyRef = useRef<number>(0);
  
  // Focused state management - must be at top level (moved before useFocusEffect)
  const [focusedProfileId, setFocusedProfileId] = useState<string | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [focusedFamilyMemberId, setFocusedFamilyMemberId] = useState<string | null>(null);
  const [focusedFriendId, setFocusedFriendId] = useState<string | null>(null);
  const [focusedHobbyId, setFocusedHobbyId] = useState<string | null>(null);
  const [focusedMemory, setFocusedMemory] = useState<{ profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null>(null);

  // Track if any entity wheel is active (to disable scrolling)
  const [isAnyEntityWheelActive, setIsAnyEntityWheelActive] = useState<boolean>(false);
  
  // Track if home screen was already focused to detect when user presses home tab while already on home
  const isHomeFocusedRef = useRef<boolean>(false);
  const navigation = useNavigation();
  
  // Listen for tab press events using navigation listeners
  useFocusEffect(
    React.useCallback(() => {
      // Listen for tab press events
      const unsubscribe = navigation.addListener('tabPress' as any, () => {
        // Check if there's any focused view
        const hasFocusedView = !!(focusedMemory || selectedSphere || focusedProfileId || focusedJobId || focusedFamilyMemberId || focusedFriendId || focusedHobbyId);
        
        if (hasFocusedView) {
          // Clear all focused states to return to main view
          setFocusedMemory(null);
          setSelectedSphere(null);
          setFocusedProfileId(null);
          setFocusedJobId(null);
          setFocusedFamilyMemberId(null);
          setFocusedFriendId(null);
          setFocusedHobbyId(null);
          // Clear URL params to reset navigation state
          router.replace('/');
        }
      });
      
      // Mark that home screen is now focused
      isHomeFocusedRef.current = true;
      
      return () => {
        unsubscribe();
        // When leaving home tab, reset the ref
        isHomeFocusedRef.current = false;
      };
    }, [navigation, focusedMemory, selectedSphere, focusedProfileId, focusedJobId, focusedFamilyMemberId, focusedFriendId, focusedHobbyId])
  );
  
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
  // This MUST run first to clear any cross-sphere state
  const previousSphereForCleanup = useRef<LifeSphere | null>(null);
  React.useEffect(() => {
    // Clear focus states when sphere changes (including when selecting a sphere for the first time)
    const sphereChanged = selectedSphere !== previousSphereForCleanup.current;
    if (sphereChanged) {
      // Clear all focus states immediately when sphere changes
      setFocusedMemory(null);
      setFocusedProfileId(null);
      setFocusedJobId(null);
      setFocusedFamilyMemberId(null);
      // Reset animations complete to ensure profiles aren't hidden by stale animation state
      setAnimationsComplete(false);
      // Increment render key to force remount of YearSectionsRenderer
      sphereRenderKeyRef.current += 1;
      previousSphereForCleanup.current = selectedSphere;
    }
  }, [selectedSphere]);
  
  // Overall sunny percentage across all spheres
  // Function is already memoized in JourneyProvider and depends on idealizedMemories
  const overallSunnyPercentage = getOverallSunnyPercentage();
  
  // Check if there are any moments (memories) at all - if yes, show encouraging message even if percentage is 0
  const hasAnyMoments = useMemo(() => {
    return idealizedMemories && idealizedMemories.length > 0;
  }, [idealizedMemories]);
  
  // State to track if encouragement message is visible (shown automatically on tab open)
  const [isEncouragementVisible, setIsEncouragementVisible] = useState(false);
  const [aiEncouragementText, setAiEncouragementText] = useState<string | null>(null);
  const [aiEncouragementLoading, setAiEncouragementLoading] = useState(false);
  const [aiEncouragementError, setAiEncouragementError] = useState(false);
  const [aiInsightsConsentVisible, setAiInsightsConsentVisible] = useState(false);
  const aiInsightsConsentPromptedRef = useRef(false);
  const aiConsent = useAIInsightsConsent();
  // When user closes the banner, bump this to force a new AI message next time it shows.
  const [encouragementCacheBust, setEncouragementCacheBust] = useState(0);
  const lastEncouragementCacheKeyRef = useRef<string | null>(null);
  
  // Show encouragement message automatically when home tab is opened
  useFocusEffect(
    React.useCallback(() => {
      // Show encouragement message when tab is focused and there are moments
      if (hasAnyMoments) {
        setIsEncouragementVisible(true);
      }
      
      return () => {
        // Hide message when leaving tab
        setIsEncouragementVisible(false);
      };
    }, [hasAnyMoments])
  );

  // Build fallback message (existing logic)
  const fallbackEncouragementText = useMemo(() => {
    return overallSunnyPercentage > 50
      ? t('spheres.encouragement.goodMomentsPrevail')
      : t('spheres.encouragement.keepPushing');
  }, [overallSunnyPercentage, t]);

  // Ensure we always show a sparkle at the end (the AI sometimes omits it).
  // If the AI already included a sparkle/AI-style icon at the end, don't double-append.
  const encouragementTextWithSparkle = useMemo(() => {
    const base = (aiEncouragementText || fallbackEncouragementText || '').trim();
    if (!base) return base;
    // If it already ends with a sparkle (or common variants), keep as-is.
    // Handles cases like: "…✨", "… ✨", "…✨✨", "…✨." (punctuation after).
    if (/(?:✨|🌟|⭐️?)+[\s.!?…]*$/.test(base)) return base;
    return `${base} ✨`;
  }, [aiEncouragementText, fallbackEncouragementText]);

  const fallbackEncouragementTextClean = useMemo(() => {
    // Some local translations include sparkle/star emojis; when AI is disabled we don't want AI-like adornments.
    return (fallbackEncouragementText || '').trim().replace(/(?:\s*(?:✨|🌟|⭐️?)+[\s.!?…]*)+$/g, '').trim();
  }, [fallbackEncouragementText]);

  // AI encouragement (cached). Keeps existing logic as fallback.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!hasAnyMoments || !isEncouragementVisible) return;
      // Gate AI usage behind explicit consent.
      const consent = aiConsent.choice;
      if (!aiConsent.isLoaded) return;
      if (consent !== 'enabled') {
        // Only show the prompt once automatically; otherwise silently fallback.
        if (consent === null && !aiInsightsConsentPromptedRef.current) {
          aiInsightsConsentPromptedRef.current = true;
          if (!cancelled) setAiInsightsConsentVisible(true);
        }
        if (!cancelled) setAiEncouragementText(null);
        if (!cancelled) setAiEncouragementError(false);
        if (!cancelled) setAiEncouragementLoading(false);
        return;
      }

      // While we fetch a fresh AI message, avoid flashing fallback text.
      setAiEncouragementError(false);
      setAiEncouragementLoading(true);

      // Derive signal for prompt
      const sunnyMoments = (idealizedMemories || []).flatMap((m: any) => (m.goodFacts || []).map((x: any) => x.text).filter(Boolean));
      const cloudyMoments = (idealizedMemories || []).flatMap((m: any) => (m.hardTruths || []).map((x: any) => x.text).filter(Boolean));
      const lessons = (idealizedMemories || []).flatMap((m: any) => (m.lessonsLearned || []).map((x: any) => x.text).filter(Boolean));

      // Keep prompt small: take a few recent-ish samples from the end
      const sampleLessons = lessons.slice(-5);
      const sampleSunny = sunnyMoments.slice(-5);

      // Make the AI banner message a bit longer than the current fallback copy
      const targetCharCount = Math.round(((fallbackEncouragementText || '').length || 120) * 1.35);
      const bucket = Math.round(overallSunnyPercentage / 10) * 10;
      // Also refresh sooner if the underlying signals change meaningfully.
      // Use coarse buckets to avoid spamming AI for tiny fluctuations.
      const sunnyCountBucket = Math.floor(sunnyMoments.length / 5) * 5; // 0,5,10,15...
      const lessonsCountBucket = Math.floor(lessons.length / 3) * 3; // 0,3,6,9...
      // Small fingerprint of the latest content so message can update when the content updates,
      // even if counts stay in the same bucket.
      const contentFingerprint = `${sampleLessons.join(' ').slice(0, 80)}|${sampleSunny.join(' ').slice(0, 80)}`;
      const contentBucket = contentFingerprint.length; // stable-ish small signal without heavy hashing
      // Refresh more often than daily: use a rolling time window (every 2 hours).
      // This keeps the message feeling fresh without calling AI on every render.
      // Dev: refresh super frequently for iteration. Prod: refresh less often.
      const windowMs = __DEV__ ? 60_000 : 10 * 60 * 1000; // 1 min in dev, 10 min in prod
      const windowId = Math.floor(Date.now() / windowMs);
      const cacheKey = `home_encouragement_v4:${appLanguage}:${bucket}:s${sunnyCountBucket}:l${lessonsCountBucket}:c${contentBucket}:ms${windowMs}:${windowId}:b${encouragementCacheBust}`;
      lastEncouragementCacheKeyRef.current = cacheKey;

      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { message?: string };
          if (!cancelled && parsed?.message) {
            setAiEncouragementText(parsed.message);
            setAiEncouragementLoading(false);
            return;
          }
        }

        const resp = await processHomeEncouragementPrompt({
          overallSunnyPercentage,
          sunnyMomentsCount: sunnyMoments.length,
          cloudyMomentsCount: cloudyMoments.length,
          sampleLessons,
          sampleSunnyMoments: sampleSunny,
          targetCharCount,
          language: appLanguage === 'bg' ? 'bg' : 'en',
        });

        const message = resp?.message?.trim();
        if (!message) return;

        await AsyncStorage.setItem(cacheKey, JSON.stringify({ message }));
        if (!cancelled) setAiEncouragementText(message);
        if (!cancelled) setAiEncouragementLoading(false);
      } catch (e) {
        // Keep fallback behavior
        logError(e, 'home-ai-encouragement');
        if (!cancelled) setAiEncouragementText(null);
        if (!cancelled) setAiEncouragementError(true);
        if (!cancelled) setAiEncouragementLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    hasAnyMoments,
    isEncouragementVisible,
    idealizedMemories,
    overallSunnyPercentage,
    fallbackEncouragementText,
    appLanguage,
    encouragementCacheBust,
    aiInsightsConsentVisible,
    aiConsent.choice,
    aiConsent.isLoaded,
  ]);
  
  // Message position constants
  // Badge is at top: 80, badge height ~40px, so position message slightly below badge
  const messageTop = 130; // Position for encouragement message and lesson notification (below streak badge)
  const messageLeft = 20;
  const messageRight = 20;
  
  // Static styles for encouragement message (no animation)
  const encouragementStaticStyle = {
    opacity: (isEncouragementVisible && hasAnyMoments) ? 1 : 0,
  };
  
  // Memoized styles for encouragement message section to avoid recreating on every render
  const encouragementContainerStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: messageTop,
    left: messageLeft,
    right: messageRight,
    zIndex: 200,
    paddingLeft: 24 * fontScale,
    paddingRight: 42 * fontScale, // Extra padding for close button (28px button + 12px margin + 12px spacing)
    paddingVertical: 18 * fontScale,
    borderRadius: 16 * fontScale,
    backgroundColor: colorScheme === 'dark'
      ? 'rgba(26, 35, 50, 0.95)' // Semi-transparent dark background
      : 'rgba(255, 255, 255, 0.95)', // Semi-transparent light background
    // Moderate shadow effect
    shadowColor: colorScheme === 'dark' ? '#64B5F6' : '#000',
    shadowOffset: { width: 0, height: isTablet ? 4 : 3 },
    shadowOpacity: colorScheme === 'dark' ? 0.5 : 0.2,
    shadowRadius: isTablet ? 12 : 8,
    elevation: 6, // For Android - moderate elevation
  }), [messageTop, messageLeft, messageRight, fontScale, colorScheme, isTablet]);

  const closeButtonStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: 12 * fontScale,
    right: 12 * fontScale,
    width: 28 * fontScale,
    height: 28 * fontScale,
    borderRadius: 14 * fontScale,
    backgroundColor: colorScheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10,
  }), [fontScale, colorScheme]);

  const gradientColors = useMemo((): [string, string, string] => 
    overallSunnyPercentage > 50
      ? colorScheme === 'dark'
        ? ['rgba(100, 150, 255, 0.15)', 'rgba(100, 150, 255, 0.08)', 'rgba(100, 150, 255, 0.12)'] as [string, string, string]
        : ['rgba(100, 150, 255, 0.12)', 'rgba(100, 150, 255, 0.06)', 'rgba(100, 150, 255, 0.1)'] as [string, string, string]
      : colorScheme === 'dark'
        ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.06)'] as [string, string, string]
        : ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.04)'] as [string, string, string]
  , [overallSunnyPercentage, colorScheme]);

  const gradientStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16 * fontScale,
    overflow: 'hidden' as const, // Ensure gradient respects border radius
  }), [fontScale]);

  const borderStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16 * fontScale,
    borderWidth: 1.5,
    borderColor: overallSunnyPercentage > 50
      ? colorScheme === 'dark'
        ? 'rgba(100, 150, 255, 0.4)'
        : 'rgba(100, 150, 255, 0.3)'
      : colorScheme === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.12)',
  }), [fontScale, overallSunnyPercentage, colorScheme]);

  const shadowGlowStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: -10,
    right: -10,
    top: -10,
    bottom: -10,
    borderRadius: 20 * fontScale,
    backgroundColor: colorScheme === 'dark'
      ? 'rgba(100, 150, 255, 0.2)'
      : 'rgba(100, 150, 255, 0.15)',
    opacity: 0.3,
    zIndex: -1,
  }), [fontScale, colorScheme]);

  const encouragementTextStyle = useMemo(() => ({
    textAlign: 'center' as const,
    lineHeight: 22 * fontScale,
    fontWeight: (overallSunnyPercentage > 50 ? '600' : '500') as '600' | '500',
    color: overallSunnyPercentage > 50
      ? colors.primaryLight
      : colors.text,
    textShadowColor: overallSunnyPercentage > 50 && colorScheme === 'dark'
      ? 'rgba(100, 150, 255, 0.25)'
      : 'transparent',
    textShadowOffset: overallSunnyPercentage > 50 ? { width: 0, height: 1 } : { width: 0, height: 0 },
    textShadowRadius: overallSunnyPercentage > 50 ? 3 : 0,
  }), [fontScale, overallSunnyPercentage, colorScheme, colors.primaryLight, colors.text]);
  
  // Calculate sunny percentage for relationships sphere (all profiles)
  const relationshipsSunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;
    
    profiles.forEach(profile => {
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
    
    jobs.forEach(job => {
      const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
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
    
    familyMembers.forEach(member => {
      const memories = getIdealizedMemoriesByEntityId(member.id, 'family');
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
    
    friends.forEach(friend => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
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
    
    hobbies.forEach(hobby => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
      memories.forEach((memory) => {
        totalClouds += (memory.hardTruths || []).length;
        totalSuns += (memory.goodFacts || []).length;
      });
    });
    
    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Default to neutral if no moments
    
    return (totalSuns / total) * 100;
  }, [hobbies, getIdealizedMemoriesByEntityId]);
  
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
  const wheelCenterY = useSharedValue(SCREEN_HEIGHT / 2 + 40); // Center Y for wheel (shared value for stars)

  // State for selected moment type when spinning the wheel
  type MomentType = 'lessons' | 'hardTruths' | 'sunnyMoments';
  const [selectedMomentType, setSelectedMomentType] = useState<MomentType>('lessons');
  const [selectedLesson, setSelectedLesson] = useState<{ text: string; entityId: string; memoryId: string; sphere: LifeSphere; isMock?: boolean; momentType?: MomentType } | null>(null);
  const [showLesson, setShowLesson] = useState(false);
  const [showMomentTypeSelector, setShowMomentTypeSelector] = useState(false);

  // Viewport glow effect for moment type selection
  const viewportGlowOpacity = useSharedValue(0);
  const [cornerGlowOpacity, setCornerGlowOpacity] = useState(0);

  // Track wheel spinning state for disabling icon buttons
  const [isSpinning, setIsSpinning] = useState(false);

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
    }
  );

  const [momentTypeSelectorDismissed, setMomentTypeSelectorDismissed] = useState(false); // Track if user dismissed selector

  // State for random pulsing moments around center avatar
  const [randomMoments, setRandomMoments] = useState<{
    id: number;
    angle: number;
    radius: number;
    momentType: 'lessons' | 'hardTruths' | 'sunnyMoments';
    shouldGrowToFull?: boolean; // Whether this moment should grow to full popup size
    text?: string; // The actual moment text to display
  }[]>([]);
  const momentIdCounter = useRef(0);

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

  // Track if we should trigger "all at once" growth for a type
  const [growAllMomentsType, setGrowAllMomentsType] = useState<MomentType | null>(null);

  // Animation values for lesson notification (same style as encouragement message)
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
  const lessonsButtonSelection = useSharedValue(selectedMomentType === 'lessons' ? 1 : 0);
  const hardTruthsButtonSelection = useSharedValue(selectedMomentType === 'hardTruths' ? 1 : 0);
  const sunnyMomentsButtonSelection = useSharedValue(selectedMomentType === 'sunnyMoments' ? 1 : 0);
  // Liquid glass specular highlight (0 = no highlight, 1 = full highlight)
  const lessonsButtonHighlight = useSharedValue(0);
  const hardTruthsButtonHighlight = useSharedValue(0);
  const sunnyMomentsButtonHighlight = useSharedValue(0);

  // Constants for sphere circle
  const sphereCircle = useMemo(() => {
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2 + 40; // Lower the main circle and floating elements by 60px
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
  const getAllMomentsByType = useCallback((momentType: MomentType) => {
    const moments: { text: string; entityId: string; memoryId: string; sphere: LifeSphere }[] = [];

    // Determine which property to access based on moment type
    const propertyName = momentType === 'lessons' ? 'lessonsLearned' : momentType === 'hardTruths' ? 'hardTruths' : 'goodFacts';

    // Collect from relationships
    profiles.forEach(profile => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      memories.forEach(memory => {
        const items = memory[propertyName];
        if (items && Array.isArray(items)) {
          items.forEach((item: { text: string }) => {
            if (item.text && item.text.trim()) {
              moments.push({
                text: item.text,
                entityId: profile.id,
                memoryId: memory.id,
                sphere: 'relationships' as LifeSphere,
              });
            }
          });
        }
      });
    });

    // Collect from career
    jobs.forEach(job => {
      const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
      memories.forEach(memory => {
        const items = memory[propertyName];
        if (items && Array.isArray(items)) {
          items.forEach((item: { text: string }) => {
            if (item.text && item.text.trim()) {
              moments.push({
                text: item.text,
                entityId: job.id,
                memoryId: memory.id,
                sphere: 'career' as LifeSphere,
              });
            }
          });
        }
      });
    });

    // Collect from family
    familyMembers.forEach(member => {
      const memories = getIdealizedMemoriesByEntityId(member.id, 'family');
      memories.forEach(memory => {
        const items = memory[propertyName];
        if (items && Array.isArray(items)) {
          items.forEach((item: { text: string }) => {
            if (item.text && item.text.trim()) {
              moments.push({
                text: item.text,
                entityId: member.id,
                memoryId: memory.id,
                sphere: 'family' as LifeSphere,
              });
            }
          });
        }
      });
    });

    // Collect from friends
    friends.forEach(friend => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
      memories.forEach(memory => {
        const items = memory[propertyName];
        if (items && Array.isArray(items)) {
          items.forEach((item: { text: string }) => {
            if (item.text && item.text.trim()) {
              moments.push({
                text: item.text,
                entityId: friend.id,
                memoryId: memory.id,
                sphere: 'friends' as LifeSphere,
              });
            }
          });
        }
      });
    });

    // Collect from hobbies
    hobbies.forEach(hobby => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
      memories.forEach(memory => {
        const items = memory[propertyName];
        if (items && Array.isArray(items)) {
          items.forEach((item: { text: string }) => {
            if (item.text && item.text.trim()) {
              moments.push({
                text: item.text,
                entityId: hobby.id,
                memoryId: memory.id,
                sphere: 'hobbies' as LifeSphere,
              });
            }
          });
        }
      });
    });

    return moments;
  }, [profiles, jobs, familyMembers, friends, hobbies, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Keep the old function for backward compatibility (now uses the new function)
  const getAllLessons = useCallback(() => {
    return getAllMomentsByType('lessons');
  }, [getAllMomentsByType]);

  // Get count of moments for a specific entity
  const getMomentCountForEntity = useCallback((entityId: string, sphere: LifeSphere, momentType: MomentType) => {
    const memories = sphere === 'relationships'
      ? getIdealizedMemoriesByProfileId(entityId)
      : getIdealizedMemoriesByEntityId(entityId, sphere);

    const propertyName = momentType === 'lessons'
      ? 'lessonsLearned'
      : momentType === 'hardTruths'
      ? 'hardTruths'
      : 'goodFacts';

    let count = 0;
    memories.forEach((memory) => {
      count += (memory[propertyName] || []).length;
    });

    return count;
  }, [getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Get counts for all moment types for a specific entity
  const getAllMomentCountsForEntity = useCallback((entityId: string, sphere: LifeSphere) => {
    const memories = sphere === 'relationships'
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
  }, [getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Handle wheel spin completion
  const onWheelSpinComplete = useCallback(() => {
    const moments = getAllMomentsByType(selectedMomentType);
    let momentToShow: { text: string; entityId: string; memoryId: string; sphere: LifeSphere; isMock?: boolean; momentType: MomentType };

    if (moments.length > 0) {
      const randomIndex = Math.floor(Math.random() * moments.length);
      momentToShow = {
        ...moments[randomIndex],
        momentType: selectedMomentType, // Capture the type at selection time
      };
    } else {
      // Show mock moment when no moments are available - use different message based on type
      const mockMessages: Record<MomentType, string> = {
        lessons: t('wheel.noLessons.message'),
        hardTruths: t('wheel.noHardTruths.message'),
        sunnyMoments: t('wheel.noSunnyMoments.message'),
      };
      momentToShow = {
        text: mockMessages[selectedMomentType],
        entityId: '',
        memoryId: '',
        sphere: 'relationships' as LifeSphere,
        isMock: true,
        momentType: selectedMomentType, // Capture the type at selection time
      };
    }

    setSelectedLesson(momentToShow);
    setShowLesson(true);

    // Calculate lesson dimensions (same as in render) - use base size for positioning calculations
    const baseCircleSize = isTablet ? 260 : (isLargeDevice ? 210 : 190);
    const lessonSunHeight = baseCircleSize; // Use base size for positioning

    // Calculate positions: start from avatar center, end at messageTop
    const avatarCenterX = sphereCircle.centerX;
    const avatarCenterY = sphereCircle.centerY;
    const finalX = SCREEN_WIDTH / 2;
    const finalY = messageTop + (lessonSunHeight / 2); // Center of lesson notification

    // Calculate translation needed: from avatar to final position
    const startTranslateX = avatarCenterX - finalX;
    const startTranslateY = avatarCenterY - finalY;

    // Start from avatar position (small scale, at avatar)
    lessonOpacity.value = 0;
    lessonScale.value = 0.3;
    lessonTranslateX.value = startTranslateX;
    lessonTranslateY.value = startTranslateY;

    // Animate to final position (full scale, at top)
    lessonOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    lessonScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    lessonTranslateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    lessonTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });

    // Start pulsing shadow animation after entrance completes
    lessonShadowPulse.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      false
    );
  }, [getAllMomentsByType, selectedMomentType, lessonOpacity, lessonScale, lessonTranslateX, lessonTranslateY, lessonShadowPulse, sphereCircle, messageTop, isTablet, isLargeDevice, t]);

  // Animate spheres scale and icon buttons when moment type selector is shown/hidden
  useEffect(() => {
    if (showMomentTypeSelector) {
      // Shrink spheres to 0.6 scale
      spheresScale.value = withSpring(0.6, {
        damping: 15,
        stiffness: 150,
      });
      // Animate icon buttons from 0 to 1
      iconButtonScale.value = withSpring(1, {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      });
    } else {
      // Return to normal size
      spheresScale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      // Scale buttons back to 0
      iconButtonScale.value = withTiming(0, { duration: 200 });
    }
  }, [showMomentTypeSelector, spheresScale, iconButtonScale]);

  // Auto-dismiss "Spin the wheel" label after 5 seconds
  useEffect(() => {
    if (!showMomentTypeSelector) {
      // Reset dismissed state when selector is hidden
      setMomentTypeSelectorDismissed(false);
      return;
    }

    // Reset dismissed state when selector is shown
    setMomentTypeSelectorDismissed(false);

    // Auto-dismiss after 5 seconds
    const autoDismissTimer = setTimeout(() => {
      setMomentTypeSelectorDismissed(true);
    }, 5000);

    return () => {
      clearTimeout(autoDismissTimer);
    };
  }, [showMomentTypeSelector]);

  // Note: We no longer clear moments when selectedMomentType changes
  // All moment types remain visible, but only the selected type will pulse

  // Clear all moments immediately when spinning starts
  useEffect(() => {
    if (isSpinning) {
      setRandomMoments([]);
    }
  }, [isSpinning]);

  // Spawn moments with 4 concurrent staggered animations for the selected moment type
  // When all moments of a type are shown, grow all at once (except clouds), then restart
  useEffect(() => {
    // Check if moments are currently blocked from showing
    const momentsAreBlocked = !showMomentTypeSelector || !isAppActive || !selectedMomentType || isSpinning || selectedLesson;

    // Track if moment type changed
    const momentTypeChanged = prevSelectedMomentType.current !== selectedMomentType;

    // Check if we're transitioning from blocked to unblocked (returning to the view)
    const justUnblocked = prevWasMomentsBlocked.current && !momentsAreBlocked;

    // Clear and reset when moment type changes OR when transitioning from blocked to unblocked
    if ((momentTypeChanged || justUnblocked) && selectedMomentType && !momentsAreBlocked) {
      setRandomMoments([]);
      currentMomentIndices.current[selectedMomentType] = 0;
      prevSelectedMomentType.current = selectedMomentType;
    }

    // Update the blocked state tracker
    prevWasMomentsBlocked.current = momentsAreBlocked;

    if (momentsAreBlocked) {
      // Clear moments when selector is hidden or conditions prevent showing
      if (showMomentTypeSelector === false || isAppActive === false) {
        setRandomMoments([]);
        prevSelectedMomentType.current = null;
      }
      // Reset indices when selector is hidden or when wheel is spinning
      if (!showMomentTypeSelector || !isAppActive) {
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
      return;
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Cloud moments (hardTruths) appear one by one with longer delays
    const isCloudMoment = selectedMomentType === 'hardTruths';
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

        const newMoment = {
          id: momentIdCounter.current++,
          angle,
          radius,
          momentType: selectedMomentType,
          shouldGrowToFull: true,
          text: momentData?.text || '',
        };

        // Add this moment to the array (use functional update to avoid stale closures)
        setRandomMoments(prev => {
          // Check if moment already exists to prevent duplicates
          if (prev.some(m => m.id === newMoment.id)) {
            return prev;
          }
          return [...prev, newMoment];
        });

        // Remove this moment after it completes its animation (add 100ms buffer to ensure animation finishes)
        const removeTimeout = setTimeout(() => {
          setRandomMoments(prev => prev.filter(m => m.id !== newMoment.id));
        }, MOMENT_DURATION + 100);
        timeouts.push(removeTimeout);

        // After this moment completes (finishes shrinking), spawn the next one
        // To maintain 4 concurrent moments: when moment X finishes, spawn moment X + 4
        const nextMomentIndex = momentIndex + INITIAL_CONCURRENT_MOMENTS;
        
        // Calculate milestone interval: if total moments < 40, use 20% intervals, otherwise use every 20 moments
        const MILESTONE_INTERVAL = totalCount < 40 
          ? Math.max(1, Math.floor(totalCount * 0.2)) // 20% of total, minimum 1
          : 20; // Every 20 moments for 40+ total moments

        // Check if we've hit a milestone
        // For < 40 moments: milestones at 20%, 40%, 60%, 80%, 100%
        // For 40+ moments: milestones at 20, 40, 60, etc.
        // Check if nextMomentIndex would cross a milestone threshold
        // Calculate which milestone threshold we're approaching
        const currentMilestone = Math.floor(momentIndex / MILESTONE_INTERVAL);
        const nextMilestone = Math.floor(nextMomentIndex / MILESTONE_INTERVAL);
        const wouldReachMilestone = nextMilestone > currentMilestone && nextMomentIndex < totalCount;
        const isAtEnd = nextMomentIndex >= totalCount;

        const nextSpawnTimeout = setTimeout(() => {
          // Check milestone flag BEFORE processing to prevent race conditions
          if (milestoneInProgress.current) {
            return; // Milestone already being handled, don't spawn anything
          }

          // Update the highest index that has been spawned (atomic check)
          const actualCurrentHighest = currentMomentIndices.current[selectedMomentType];
          if (nextMomentIndex <= actualCurrentHighest) {
            // Another moment already spawned this or a later moment, skip
            return;
          }
          currentMomentIndices.current[selectedMomentType] = nextMomentIndex;

          // Check if we need to handle milestone
          if (wouldReachMilestone || isAtEnd) {
            milestoneInProgress.current = true;

            // Grow all moments at once (except clouds)
            if (selectedMomentType !== 'hardTruths') {
              setGrowAllMomentsType(selectedMomentType);
              // Wait for complete animation cycle: 800ms grow + 4000ms hold (with pulsing) + 800ms shrink = 5600ms total
              const GROW_ALL_DURATION = 5600;
              const growAllTimeout = setTimeout(() => {
                setGrowAllMomentsType(null);

                // Reset milestone flag AFTER the grow-all completes
                milestoneInProgress.current = false;

                if (isAtEnd) {
                  // At 100%, restart from beginning
                  currentMomentIndices.current[selectedMomentType] = 0;

                  // Wait 400ms before restarting with initial batch
                  const continueTimeout = setTimeout(() => {
                    startInitialBatch();
                  }, NEXT_MOMENT_DELAY);
                  timeouts.push(continueTimeout);
                } else {
                  // At milestone (not at end), continue spawning from the next index
                  // Spawn the initial batch starting from nextMomentIndex
                  const continueTimeout = setTimeout(() => {
                    const startIndex = currentMomentIndices.current[selectedMomentType];
                    if (startIndex < totalCount) {
                      // Spawn the initial batch of concurrent moments
                      const momentsToSpawn = Math.min(INITIAL_CONCURRENT_MOMENTS, totalCount - startIndex);
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
              // For clouds, just continue without the "all at once" effect
              // Reset milestone flag immediately for clouds (no grow-all animation)
              milestoneInProgress.current = false;

              if (isAtEnd) {
                currentMomentIndices.current[selectedMomentType] = 0;
              }
              // Continue spawning with 400ms delay
              if (nextMomentIndex < totalCount) {
                spawnSingleMoment(nextMomentIndex, NEXT_MOMENT_DELAY);
              }
            }
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
      const momentsToSpawn = Math.min(INITIAL_CONCURRENT_MOMENTS, totalCount - currentIndex);

      // Spawn the initial batch with stagger delay between each
      // Each moment will spawn the next one when it finishes, maintaining 4 concurrent
      for (let i = 0; i < momentsToSpawn; i++) {
        const momentIndex = currentIndex + i;
        if (momentIndex >= totalCount) break;
        // Add INITIAL_START_DELAY to all moments, plus stagger for each subsequent moment
        spawnSingleMoment(momentIndex, INITIAL_START_DELAY + (i * INITIAL_STAGGER_DELAY));
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
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [showMomentTypeSelector, selectedMomentType, isTablet, isAppActive, getAllMomentsByType, isSpinning, selectedLesson]);

  // Handle moment completion (remove from array)
  const handleMomentComplete = useCallback((id: number) => {
    setRandomMoments(prev => prev.filter(m => m.id !== id));
  }, []);

  // Function to programmatically spin the wheel (called when avatar is pressed)
  const spinWheel = useCallback(() => {
    // Stop hint animation if active
    if (isHintAnimating.value) {
      isHintAnimating.value = false;
      hintRotation.value = hintRotation.value; // Cancel animation
    }
    
    // Stop any current spinning
    isWheelSpinning.value = false;
    wheelVelocity.value = 0;

    // Set initial velocity for a nice spin (clockwise)
    // Random velocity between 0.15 and 0.25 radians per frame (at 60fps, negative for clockwise)
    const randomSpeed = 0.15 + Math.random() * 0.1; // 0.15 to 0.25
    wheelVelocity.value = -randomSpeed; // Negative for clockwise rotation

    // Start spinning
    isWheelSpinning.value = true;
    
    // Log analytics event
    const { logWheelSpin } = require('@/utils/analytics');
    logWheelSpin().catch(() => {
      // Failed to log event
    });
  }, [isHintAnimating, hintRotation, isWheelSpinning, wheelVelocity]);
  
  // Animate lesson notification when manually closed
  useEffect(() => {
    if (!showLesson) {
      lessonOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
      lessonScale.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
      lessonTranslateX.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
      lessonTranslateY.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
      cancelAnimation(lessonShadowPulse); // Stop pulsing when closed
      lessonShadowPulse.value = 1; // Reset to default
    }
  }, [showLesson, lessonOpacity, lessonScale, lessonTranslateX, lessonTranslateY, lessonShadowPulse]);

  // Fade out lesson notification when wheel starts spinning
  const fadeOutLesson = useCallback(() => {
    // Animate lesson out smoothly
    lessonOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) });
    lessonScale.value = withTiming(0.8, { duration: 300, easing: Easing.in(Easing.cubic) });
    lessonTranslateY.value = withTiming(-20, { duration: 300, easing: Easing.in(Easing.cubic) });
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
  }, [selectedMomentType, lessonsButtonPressScale, hardTruthsButtonPressScale, sunnyMomentsButtonPressScale]);

  // Animate selection state when selectedMomentType changes
  useEffect(() => {
    // Animate lessons button
    lessonsButtonSelection.value = withTiming(
      selectedMomentType === 'lessons' ? 1 : 0,
      { duration: 300, easing: Easing.inOut(Easing.ease) }
    );
    // Animate hard truths button
    hardTruthsButtonSelection.value = withTiming(
      selectedMomentType === 'hardTruths' ? 1 : 0,
      { duration: 300, easing: Easing.inOut(Easing.ease) }
    );
    // Animate sunny moments button
    sunnyMomentsButtonSelection.value = withTiming(
      selectedMomentType === 'sunnyMoments' ? 1 : 0,
      { duration: 300, easing: Easing.inOut(Easing.ease) }
    );
  }, [selectedMomentType, lessonsButtonSelection, hardTruthsButtonSelection, sunnyMomentsButtonSelection]);

  // Press handlers for moment type selector icon buttons with liquid glass highlight
  const handleLessonsButtonPressIn = useCallback(() => {
    'worklet';
    lessonsButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
    lessonsButtonHighlight.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
  }, [lessonsButtonPressScale, lessonsButtonHighlight]);

  const handleLessonsButtonPressOut = useCallback(() => {
    'worklet';
    lessonsButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    lessonsButtonHighlight.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [lessonsButtonPressScale, lessonsButtonHighlight]);

  const handleHardTruthsButtonPressIn = useCallback(() => {
    'worklet';
    hardTruthsButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
    hardTruthsButtonHighlight.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
  }, [hardTruthsButtonPressScale, hardTruthsButtonHighlight]);

  const handleHardTruthsButtonPressOut = useCallback(() => {
    'worklet';
    hardTruthsButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    hardTruthsButtonHighlight.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [hardTruthsButtonPressScale, hardTruthsButtonHighlight]);

  const handleSunnyMomentsButtonPressIn = useCallback(() => {
    'worklet';
    sunnyMomentsButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
    sunnyMomentsButtonHighlight.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
  }, [sunnyMomentsButtonPressScale, sunnyMomentsButtonHighlight]);

  const handleSunnyMomentsButtonPressOut = useCallback(() => {
    'worklet';
    sunnyMomentsButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    sunnyMomentsButtonHighlight.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [sunnyMomentsButtonPressScale, sunnyMomentsButtonHighlight]);

  useAnimatedReaction(
    () => isWheelSpinning.value,
    (isSpinning) => {
      // When wheel starts spinning (transitions from false to true)
      if (isSpinning && !previousIsWheelSpinning.value) {
        runOnJS(fadeOutLesson)();
      }
      previousIsWheelSpinning.value = isSpinning;
    }
  );
  
  // Animated style for lesson notification
  const lessonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: lessonOpacity.value,
      transform: [
        { translateX: lessonTranslateX.value },
        { translateY: lessonTranslateY.value },
        { scale: lessonScale.value * lessonPressScale.value }
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

  // Animated styles for individual button press effects with liquid glass
  const lessonsButtonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      lessonsButtonSelection.value,
      [0, 1],
      [
        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        colors.primary
      ]
    );
    const borderWidth = lessonsButtonSelection.value * 2; // Animate from 0 to 2

    return {
      transform: [{ scale: lessonsButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: colors.primary,
      borderRadius: 30,
      width: 60,
      height: 60,
      overflow: 'hidden', // For blur effect
    };
  });

  // Specular highlight overlay for lessons button (liquid glass shine)
  const lessonsHighlightStyle = useAnimatedStyle(() => {
    return {
      opacity: lessonsButtonHighlight.value * 0.4, // Max 40% opacity
    };
  });

  const hardTruthsButtonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      hardTruthsButtonSelection.value,
      [0, 1],
      [
        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        colors.primary
      ]
    );
    const borderWidth = hardTruthsButtonSelection.value * 2; // Animate from 0 to 2

    return {
      transform: [{ scale: hardTruthsButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: colors.primary,
      borderRadius: 30,
      width: 60,
      height: 60,
      overflow: 'hidden', // For blur effect
    };
  });

  // Specular highlight overlay for hard truths button (liquid glass shine)
  const hardTruthsHighlightStyle = useAnimatedStyle(() => {
    return {
      opacity: hardTruthsButtonHighlight.value * 0.4, // Max 40% opacity
    };
  });

  const sunnyMomentsButtonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      sunnyMomentsButtonSelection.value,
      [0, 1],
      [
        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        colors.primary
      ]
    );
    const borderWidth = sunnyMomentsButtonSelection.value * 2; // Animate from 0 to 2

    return {
      transform: [{ scale: sunnyMomentsButtonPressScale.value }],
      backgroundColor,
      borderWidth,
      borderColor: colors.primary,
      borderRadius: 30,
      width: 60,
      height: 60,
      overflow: 'hidden', // For blur effect
    };
  });

  // Specular highlight overlay for sunny moments button (liquid glass shine)
  const sunnyMomentsHighlightStyle = useAnimatedStyle(() => {
    return {
      opacity: sunnyMomentsButtonHighlight.value * 0.4, // Max 40% opacity
    };
  });


  // Gentle continuous rotation hint animation
  useEffect(() => {
    // Don't run interval when app is backgrounded
    if (!isAppActive) {
      return;
    }

    // Start hint animation when wheel is idle (not spinning, not dragging)
    const checkIdleState = () => {
      const isIdle = !isWheelSpinning.value && !isDragging.value;

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
          false // Don't reverse, just keep going
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
  }, [isAppActive]); // Re-run when app state changes

  // Wheel rotation animation with deceleration
  // Use ref to store latest callback to avoid recreating interval when callback changes
  const onWheelSpinCompleteRef = useRef(onWheelSpinComplete);
  useLayoutEffect(() => {
    onWheelSpinCompleteRef.current = onWheelSpinComplete;
  }, [onWheelSpinComplete]);

  useEffect(() => {
    // Don't run interval when app is backgrounded
    if (!isAppActive) {
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
      } else if (isWheelSpinning.value && Math.abs(wheelVelocity.value) <= 0.005) {
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
  }, [isAppActive]); // Only depend on isAppActive - shared values and callback don't need to trigger re-creation

  // Pan gesture handling for wheel rotation
  const lastAngle = useSharedValue(0);
  const startAngle = useSharedValue(0);
  const dragFrameCount = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false, // Don't capture immediately - let children handle taps
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Only allow wheel spin if moment type selector is shown
          if (!showMomentTypeSelector) {
            return false;
          }
          // Only capture if there's significant movement (it's a drag, not a tap)
          return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: (evt) => {
          // Calculate initial angle from center
          const touch = evt.nativeEvent;
          const dx = touch.pageX - sphereCircle.centerX;
          const dy = touch.pageY - sphereCircle.centerY;
          startAngle.value = Math.atan2(dy, dx);
          lastAngle.value = startAngle.value;
          isWheelSpinning.value = false;
          wheelVelocity.value = 0;
          isDragging.value = true;
          dragFrameCount.value = 0;
          // Stop hint animation when user starts dragging
          if (isHintAnimating.value) {
            isHintAnimating.value = false;
            hintRotation.value = hintRotation.value; // Cancel animation
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const touch = evt.nativeEvent;
          const dx = touch.pageX - sphereCircle.centerX;
          const dy = touch.pageY - sphereCircle.centerY;
          const currentAngle = Math.atan2(dy, dx);

          // Calculate angle delta
          let deltaAngle = currentAngle - lastAngle.value;

          // Handle angle wrapping (when crossing -π/π boundary)
          if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
          if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

          // Increment frame counter for acceleration
          dragFrameCount.value += 1;

          // Acceleration curve: start slow, then speed up
          // Use frame count to simulate time (assuming ~60fps, 30 frames = ~500ms)
          const targetFrames = 30; // Frames to reach full speed
          const accelerationFactor = Math.min(1, dragFrameCount.value / targetFrames);
          // Apply easing curve for smoother acceleration (ease-out cubic)
          const easedAcceleration = 1 - Math.pow(1 - accelerationFactor, 3);
          
          // Apply acceleration to delta angle
          // Start at 40% speed, gradually reach 100% over ~500ms
          const acceleratedDelta = deltaAngle * (0.4 + easedAcceleration * 0.6);

          wheelRotation.value += acceleratedDelta;
          wheelVelocity.value = acceleratedDelta; // Track velocity for momentum
          lastAngle.value = currentAngle;
        },
        onPanResponderRelease: () => {
          isDragging.value = false;
          dragFrameCount.value = 0;
          // Start momentum spin if there's significant velocity
          if (Math.abs(wheelVelocity.value) > 0.01) {
            isWheelSpinning.value = true;
            // Amplify initial velocity based on how fast they were dragging
            // Faster drags get more momentum (scale from 2x to ~4x)
            const velocityMagnitude = Math.abs(wheelVelocity.value);
            const momentumMultiplier = 2.0 + Math.min(velocityMagnitude * 25, 2.0);
            wheelVelocity.value *= momentumMultiplier;
          }
        },
      }),
    [sphereCircle.centerX, sphereCircle.centerY, wheelRotation, wheelVelocity, isWheelSpinning, lastAngle, startAngle, dragFrameCount, isDragging, showMomentTypeSelector]
  );

  // Sort profiles: current partners (ongoing) first, then by relationship start year (earliest first)
  const sortedProfiles = React.useMemo(() => {
    return [...profiles].sort((a, b) => {
      // First, separate ongoing (current) vs ended relationships - ongoing on top
      const aIsOngoing = a.relationshipEndDate === null;
      const bIsOngoing = b.relationshipEndDate === null;
      
      if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
      if (!aIsOngoing && bIsOngoing) return 1;  // b is ongoing, a is not - b comes first
      
      // Both are ongoing or both are ended - sort by end date year (most recent first)
      // For ongoing, use start date year
      const aEndYear = aIsOngoing 
        ? (a.relationshipStartDate ? new Date(a.relationshipStartDate).getFullYear() : 0)
        : (a.relationshipEndDate ? new Date(a.relationshipEndDate).getFullYear() : 0);
      const bEndYear = bIsOngoing 
        ? (b.relationshipStartDate ? new Date(b.relationshipStartDate).getFullYear() : 0)
        : (b.relationshipEndDate ? new Date(b.relationshipEndDate).getFullYear() : 0);
      
      // Sort by year descending (most recent first)
      if (aEndYear !== bEndYear) {
        return bEndYear - aEndYear; // More recent year comes first
      }
      
      // If same year, sort by full end date (most recent first)
      const aEndDate = aIsOngoing
        ? (a.relationshipStartDate ? new Date(a.relationshipStartDate).getTime() : 0)
        : (a.relationshipEndDate ? new Date(a.relationshipEndDate).getTime() : 0);
      const bEndDate = bIsOngoing
        ? (b.relationshipStartDate ? new Date(b.relationshipStartDate).getTime() : 0)
        : (b.relationshipEndDate ? new Date(b.relationshipEndDate).getTime() : 0);
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
      if (!aIsOngoing && bIsOngoing) return 1;  // b is ongoing, a is not - b comes first
      
      // Both are ongoing or both are ended - sort by end date year (most recent first)
      const aEndYear = aIsOngoing 
        ? (a.startDate ? new Date(a.startDate).getFullYear() : 0)
        : (a.endDate ? new Date(a.endDate).getFullYear() : 0);
      const bEndYear = bIsOngoing 
        ? (b.startDate ? new Date(b.startDate).getFullYear() : 0)
        : (b.endDate ? new Date(b.endDate).getFullYear() : 0);
      
      // Sort by year descending (most recent first)
      if (aEndYear !== bEndYear) {
        return bEndYear - aEndYear; // More recent year comes first
      }
      
      // If same year, sort by full end date (most recent first)
      const aEndDate = aIsOngoing
        ? (a.startDate ? new Date(a.startDate).getTime() : 0)
        : (a.endDate ? new Date(a.endDate).getTime() : 0);
      const bEndDate = bIsOngoing
        ? (b.startDate ? new Date(b.startDate).getTime() : 0)
        : (b.endDate ? new Date(b.endDate).getTime() : 0);
      return bEndDate - aEndDate; // More recent date comes first
    });
  }, [jobs]);
  
  // Get the section key for a profile - defined before yearSections so it can be used there
  const getProfileSectionKey = React.useCallback((profile: any): string | null => {
    if (profile.relationshipEndDate === null || profile.relationshipEndDate === undefined) {
      return 'ongoing';
    } else {
      const year = new Date(profile.relationshipEndDate).getFullYear();
      return year.toString();
    }
  }, []);
  
  // Calculate year-based sections for each profile
  // Ongoing partners get their own section at the top, then sorted by end year
  const yearSections = React.useMemo(() => {
    const sections = new Map<string, { year: number | string; top: number; bottom: number; height: number }>();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;
    
    // Separate ongoing and ended relationships
    const ongoingProfiles = sortedProfiles.filter(p => p.relationshipEndDate === null);
    const endedProfiles = sortedProfiles.filter(p => p.relationshipEndDate !== null);
    
    // Get all unique years from ended profiles
    const years = new Set<number>();
    endedProfiles.forEach(profile => {
      if (profile.relationshipEndDate) {
        const endYear = new Date(profile.relationshipEndDate).getFullYear();
        years.add(endYear);
      }
    });
    
    // Sort years descending (most recent first)
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    // Get all section keys that profiles might use (including from visibleProfiles to catch any that might not be in sortedProfiles yet)
    const allProfileSectionKeys = new Set<string>();
    sortedProfiles.forEach(profile => {
      const sectionKey = getProfileSectionKey(profile);
      if (sectionKey) {
        allProfileSectionKeys.add(sectionKey);
      }
    });
    
    // Calculate number of sections (ongoing + years)
    const hasOngoing = allProfileSectionKeys.has('ongoing') || ongoingProfiles.length > 0;
    const numSections = (hasOngoing ? 1 : 0) + sortedYears.length;
    const sectionHeight = numSections > 0 ? availableHeight / numSections : availableHeight;
    
    let currentTop = topPadding;
    
    // Create "Ongoing" section at the top if there are ongoing partners or if any profile uses 'ongoing' key
    if (hasOngoing) {
      sections.set('ongoing', {
        year: 'Ongoing',
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
    if (job.endDate === null || job.endDate === undefined || job.endDate === '') {
      return 'ongoing';
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
          return 'ongoing'; // Fallback to ongoing if date is invalid
        }
        const year = endDate.getFullYear();
        return year.toString();
      } catch {
        return 'ongoing'; // Fallback to ongoing on error
      }
    }
  }, []);

  // Calculate year-based sections for jobs (similar to profiles)
  const jobYearSections = React.useMemo(() => {
    const sections = new Map<string, { year: number | string; top: number; bottom: number; height: number }>();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;
    
    // Get all unique section keys from all jobs to ensure we create sections for every job
    const allSectionKeys = new Set<string>();
    sortedJobs.forEach(job => {
      const sectionKey = getJobSectionKey(job);
      if (sectionKey) {
        allSectionKeys.add(sectionKey);
      }
    });
    
    // Extract all year section keys (excluding 'ongoing')
    const yearSectionKeys = Array.from(allSectionKeys).filter(key => key !== 'ongoing');
    const yearNumbers = yearSectionKeys
      .map(key => {
        const year = parseInt(key, 10);
        return isNaN(year) ? null : year;
      })
      .filter((year): year is number => year !== null);
    
    // Sort years descending (most recent first)
    const sortedYears = yearNumbers.sort((a, b) => b - a);
    
    // Calculate number of sections (ongoing + years, but at least 1)
    const hasOngoingSection = allSectionKeys.has('ongoing');
    const numSections = Math.max(1, (hasOngoingSection ? 1 : 0) + sortedYears.length);
    const sectionHeight = numSections > 0 ? availableHeight / numSections : availableHeight;
    
    let currentTop = topPadding;
    
    // Create "Ongoing" section at the top if there are ongoing jobs (most recent first)
    if (hasOngoingSection) {
      sections.set('ongoing', {
        year: 'Current',
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
      sections.set('default', {
        year: 'All',
        top: topPadding,
        bottom: topPadding + availableHeight,
        height: availableHeight,
      });
    }
    
    return sections;
  }, [sortedJobs, getJobSectionKey]);

  // Get the year section for a job
  const getJobYearSection = React.useCallback((job: any) => {
    const sectionKey = getJobSectionKey(job);
    if (!sectionKey) return undefined;
    return jobYearSections.get(sectionKey);
  }, [jobYearSections, getJobSectionKey]);

  // Get the year section for a profile
  const getProfileYearSection = React.useCallback((profile: any) => {
    const sectionKey = getProfileSectionKey(profile);
    if (!sectionKey) return undefined;
    return yearSections.get(sectionKey);
  }, [yearSections, getProfileSectionKey]);

  // Calculate sections for family members (single section covering all, no year grouping)
  const familyYearSections = React.useMemo(() => {
    const sections = new Map<string, { year: number | string; top: number; bottom: number; height: number }>();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;
    
    // Create a single section for all family members
    if (familyMembers.length > 0) {
      sections.set('all', {
        year: 'Family',
        top: topPadding,
        bottom: topPadding + availableHeight,
        height: availableHeight,
      });
    }
    
    return sections;
  }, [familyMembers]);

  // Calculate sections for friends (single section covering all, no year grouping)
  const friendsYearSections = React.useMemo(() => {
    const sections = new Map<string, { year: number | string; top: number; bottom: number; height: number }>();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;
    
    // Create a single section for all friends
    if (friends.length > 0) {
      sections.set('all', {
        year: 'Friends',
        top: topPadding,
        bottom: topPadding + availableHeight,
        height: availableHeight,
      });
    }
    
    return sections;
  }, [friends]);

  // Calculate sections for hobbies (single section covering all, no year grouping)
  const hobbiesYearSections = React.useMemo(() => {
    const sections = new Map<string, { year: number | string; top: number; bottom: number; height: number }>();
    const exZoneRadius = 0;
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;
    
    // Create a single section for all hobbies
    if (hobbies.length > 0) {
      sections.set('all', {
        year: 'Hobbies',
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
  const [avatarPositionsState, setAvatarPositionsState] = React.useState<Map<string, { x: number; y: number }>>(new Map());

  // Storage keys for entity positions
  const AVATAR_POSITIONS_KEY = '@sferas:avatar_positions';
  const FAMILY_POSITIONS_KEY = '@sferas:family_positions';
  const FRIEND_POSITIONS_KEY = '@sferas:friend_positions';
  const HOBBY_POSITIONS_KEY = '@sferas:hobby_positions';

  // Load saved avatar positions from storage
  const [savedPositions, setSavedPositions] = React.useState<Map<string, { x: number; y: number }> | null>(null);
  const [positionsLoaded, setPositionsLoaded] = React.useState(false);

  React.useEffect(() => {
    const loadSavedPositions = async () => {
      try {
        const saved = await AsyncStorage.getItem(AVATAR_POSITIONS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, { x: number; y: number }>;
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
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Normalize to -1 to 1 range
    const normalized = (hash % 1000) / 1000;
    return normalized * range;
  };

  // Helper function to check if two positions overlap
  const checkPositionOverlap = (pos1: { x: number; y: number }, pos2: { x: number; y: number }, minDistance: number) => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < minDistance;
  };

  // Helper function to find non-overlapping position using spiral search
  const findNonOverlappingPosition = (
    initialPos: { x: number; y: number },
    existingPositions: { x: number; y: number }[],
    minDistance: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): { x: number; y: number } => {
    // First check if initial position is valid
    const hasOverlap = existingPositions.some(pos => checkPositionOverlap(initialPos, pos, minDistance));
    if (!hasOverlap) {
      return initialPos;
    }

    // If there's overlap, search in a spiral pattern for a free spot
    const maxAttempts = 100;
    const angleStep = Math.PI / 6; // 30 degrees
    const radiusStep = minDistance * 0.5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const spiralIndex = Math.floor(attempt / 12); // 12 angles per spiral
      const angleIndex = attempt % 12;
      const angle = angleIndex * angleStep;
      const radius = radiusStep * (spiralIndex + 1);

      const newPos = {
        x: initialPos.x + Math.cos(angle) * radius,
        y: initialPos.y + Math.sin(angle) * radius
      };

      // Check if position is within bounds
      if (newPos.x < bounds.minX || newPos.x > bounds.maxX ||
          newPos.y < bounds.minY || newPos.y > bounds.maxY) {
        continue;
      }

      // Check if this position overlaps with any existing position
      const overlaps = existingPositions.some(pos => checkPositionOverlap(newPos, pos, minDistance));
      if (!overlaps) {
        return newPos;
      }
    }

    // If we couldn't find a non-overlapping position, return the initial position
    // (this means we're out of space)
    return initialPos;
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
        const sectionKey = profile.relationshipEndDate === null || profile.relationshipEndDate === undefined
          ? 'ongoing'
          : new Date(profile.relationshipEndDate).getFullYear().toString();
        const profilesInSection = sortedProfiles.filter(p => {
          if (sectionKey === 'ongoing') {
            return p.relationshipEndDate === null;
          } else {
            return p.relationshipEndDate && new Date(p.relationshipEndDate).getFullYear().toString() === sectionKey;
          }
        });
        const indexInSection = profilesInSection.findIndex(p => p.id === profile.id);
        
        // Distribute avatars evenly within the year section, centered both horizontally and vertically
        const sectionCenterY = yearSection.top + (yearSection.height / 2);
        const spacing = profilesInSection.length > 1 ? Math.min(yearSection.height * 0.6, 200) : 0;
        const startY = sectionCenterY - ((profilesInSection.length - 1) * spacing / 2);
        
        // For profiles in year sections, center them horizontally (no random X offset)
        // Only add small Y offset for multiple profiles to avoid perfect vertical alignment
        const centerOffsetX = 0; // Always center horizontally in year sections
        // For single profiles, place them exactly at center (no Y offset)
        // For multiple profiles, add small random offset to avoid perfect alignment
        const centerOffsetY = profilesInSection.length === 1 
          ? 0 // Exact center for single profiles
          : getRandomOffset(profile.id + '_y', yearSection.height * 0.1); // ±5% of section height for multiple profiles
        
        let position = {
          x: centerX + centerOffsetX, // Always use screen center for X
          y: startY + (indexInSection * spacing) + centerOffsetY,
        };
        
        // Clamp to year section bounds and ensure avatar stays in central area
        const avatarHalfSize = 40;
        const minMargin = 20; // Minimum margin from section edges
        const centerAreaMinX = SCREEN_WIDTH * 0.2; // 20% from left
        const centerAreaMaxX = SCREEN_WIDTH * 0.8; // 80% from left
        const beforeClamp = { ...position };
        position.x = Math.max(
          Math.max(avatarHalfSize + minMargin, centerAreaMinX),
          Math.min(SCREEN_WIDTH - avatarHalfSize - minMargin, Math.min(centerAreaMaxX, position.x))
        );
        position.y = Math.max(
          yearSection.top + avatarHalfSize + minMargin,
          Math.min(yearSection.bottom - avatarHalfSize - minMargin, position.y)
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
    if (positionsLoaded && initialAvatarPositions.length > 0 && avatarPositionsState.size === 0) {
      const newPositions = new Map<string, { x: number; y: number }>();
      profiles.forEach((profile, index) => {
        newPositions.set(profile.id, initialAvatarPositions[index]);
      });
      setAvatarPositionsState(newPositions);
    }
  }, [initialAvatarPositions, profiles, avatarPositionsState.size, positionsLoaded]);
  
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
          const sectionCenterY = yearSection.top + yearSection.height / 2;
          
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
  }, [sortedProfiles, avatarPositionsState, initialAvatarPositions, getProfileYearSection]);
  
  // Get current position for a profile (from memoized map)
  const getAvatarPosition = React.useCallback((profileId: string, index: number) => {
    return avatarPositions.get(profileId) || { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
  }, [avatarPositions]);
  
  // Position storage for family/friends/hobbies
  const [familyPositionsState, setFamilyPositionsState] = React.useState<Map<string, { x: number; y: number }>>(new Map());
  const [friendPositionsState, setFriendPositionsState] = React.useState<Map<string, { x: number; y: number }>>(new Map());
  const [hobbyPositionsState, setHobbyPositionsState] = React.useState<Map<string, { x: number; y: number }>>(new Map());
  
  // Helper function to clamp position to ensure avatar is fully visible in viewport
  // Accounts for safe area insets (status bar at top) and tab bar at bottom
  const clampPositionToViewport = React.useCallback((position: { x: number; y: number }, avatarSize: number, entityId?: string): { x: number; y: number } => {
    const padding = avatarSize / 2;
    // Account for safe area insets at top and tab bar at bottom
    // Tab bar height: Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale)
    const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
    const visibleAreaTop = insets.top;
    const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight; // Account for tab bar, not just safe area
    const visibleAreaHeight = visibleAreaBottom - visibleAreaTop;
    
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
  }, [insets.top, insets.bottom, fontScale]);

  // Update position for a profile and save to storage
  const updateAvatarPosition = React.useCallback(async (profileId: string, newPosition: { x: number; y: number }) => {
    // Clamp position to ensure avatar is fully visible (use base avatar size for clamping)
    const baseAvatarSize = isTablet ? 120 : 100;
    const clampedPosition = clampPositionToViewport(newPosition, baseAvatarSize);
    
    setAvatarPositionsState((prev) => {
      const next = new Map(prev);
      next.set(profileId, clampedPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(AVATAR_POSITIONS_KEY, JSON.stringify(positionsObj)).catch((error) => {
        logError('HomeScreen:SaveAvatarPositions', error);
      });
      
      return next;
    });
  }, [isTablet, clampPositionToViewport]);
  
  // Update position for a family member and save to storage
  const updateFamilyMemberPosition = React.useCallback(async (memberId: string, newPosition: { x: number; y: number }) => {
    // Clamp position to ensure avatar is fully visible (use base avatar size for clamping)
    const baseAvatarSize = isTablet ? 120 : 100;
    const clampedPosition = clampPositionToViewport(newPosition, baseAvatarSize, `FamilyMember-${memberId}`);

    setFamilyPositionsState((prev) => {
      const next = new Map(prev);
      next.set(memberId, clampedPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(FAMILY_POSITIONS_KEY, JSON.stringify(positionsObj)).catch((error) => {
        logError('HomeScreen:SaveFamilyPositions', error);
      });
      
      return next;
    });
  }, [isTablet, clampPositionToViewport]);
  
  // Update position for a friend and save to storage
  const updateFriendPosition = React.useCallback(async (friendId: string, newPosition: { x: number; y: number }) => {
    // Clamp position to ensure avatar is fully visible (use base avatar size for clamping)
    const baseAvatarSize = isTablet ? 120 : 100;
    const clampedPosition = clampPositionToViewport(newPosition, baseAvatarSize, `Friend-${friendId}`);

    setFriendPositionsState((prev) => {
      const next = new Map(prev);
      next.set(friendId, clampedPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(FRIEND_POSITIONS_KEY, JSON.stringify(positionsObj)).catch((error) => {
        logError('HomeScreen:SaveFriendPositions', error);
      });
      
      return next;
    });
  }, [isTablet, clampPositionToViewport]);
  
  // Update position for a hobby and save to storage
  const updateHobbyPosition = React.useCallback(async (hobbyId: string, newPosition: { x: number; y: number }) => {
    // Clamp position to ensure avatar is fully visible (use base avatar size for clamping)
    const baseAvatarSize = isTablet ? 120 : 100;
    const clampedPosition = clampPositionToViewport(newPosition, baseAvatarSize, `Hobby-${hobbyId}`);

    setHobbyPositionsState((prev) => {
      const next = new Map(prev);
      next.set(hobbyId, clampedPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(HOBBY_POSITIONS_KEY, JSON.stringify(positionsObj)).catch((error) => {
        logError('HomeScreen:SaveHobbyPositions', error);
      });
      
      return next;
    });
  }, [isTablet, clampPositionToViewport]);

  // No need for minHeight calculation since we're fitting within viewport
  const minHeight = SCREEN_HEIGHT;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: 'transparent', // Transparent so gradient from TabScreenContainer shows through
        },
        content: {
          width: SCREEN_WIDTH,
          minHeight,
          position: 'relative',
        },
      }),
    [colors.background, minHeight]
  );
  
  // Shared values to track focused avatar positions for SparkledDots
  const focusedFamilyMemberPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedFamilyMemberPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 80);
  const focusedFriendPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedFriendPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 80);
  const focusedHobbyPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedHobbyPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 80);
  
  // Helper: Get focusedMemory only if it matches the current selectedSphere
  // This ensures cross-sphere focusedMemory is ignored everywhere
  const getFocusedMemoryForSphere = useCallback((sphere: LifeSphere | null): { profileId?: string; jobId?: string; familyMemberId?: string; memoryId: string; sphere: LifeSphere } | null => {
    if (!focusedMemory || !sphere) return null;
    return focusedMemory.sphere === sphere ? focusedMemory : null;
  }, [focusedMemory]);
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
  const [animationsComplete, setAnimationsComplete] = useState(false);
  
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
    if (focusedFamilyMemberId && selectedSphere === 'family') {
      const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
      if (member) {
        const section = familyYearSections.get('all');
        if (section) {
          const totalMembers = familyMembers.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing = totalMembers > 1 
            ? Math.max(minSpacing, Math.min(section.height / (totalMembers + 1), 250))
            : 0;
          const index = familyMembers.findIndex(m => m.id === focusedFamilyMemberId);
          const y = totalMembers === 1
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
  }, [focusedFamilyMemberId, selectedSphere, familyMembers, familyYearSections, focusedFamilyMemberPositionX, focusedFamilyMemberPositionY]);

  // Initialize position shared values when friend becomes focused
  React.useEffect(() => {
    if (focusedFriendId && selectedSphere === 'friends') {
      const friend = friends.find(f => f.id === focusedFriendId);
      if (friend) {
        const section = friendsYearSections.get('all');
        if (section) {
          const totalFriends = friends.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing = totalFriends > 1 
            ? Math.max(minSpacing, Math.min(section.height / (totalFriends + 1), 250))
            : 0;
          const index = friends.findIndex(f => f.id === focusedFriendId);
          const y = totalFriends === 1
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
  }, [focusedFriendId, selectedSphere, friends, friendsYearSections, focusedFriendPositionX, focusedFriendPositionY]);

  // Initialize position shared values when hobby becomes focused
  React.useEffect(() => {
    if (focusedHobbyId && selectedSphere === 'hobbies') {
      const hobby = hobbies.find(h => h.id === focusedHobbyId);
      if (hobby) {
        const section = hobbiesYearSections.get('all');
        if (section) {
          const totalHobbies = hobbies.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing = totalHobbies > 1 
            ? Math.max(minSpacing, Math.min(section.height / (totalHobbies + 1), 250))
            : 0;
          const index = hobbies.findIndex(h => h.id === focusedHobbyId);
          const y = totalHobbies === 1
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
  }, [focusedHobbyId, selectedSphere, hobbies, hobbiesYearSections, focusedHobbyPositionX, focusedHobbyPositionY]);

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
    
    if (focusedMemoryId && sphere) {
      if (profileId && sphere === 'relationships') {
        setFocusedMemory({ profileId, memoryId: focusedMemoryId, sphere });
        setFocusedProfileId(profileId);
        setSelectedSphere('relationships');
      } else if (jobId && sphere === 'career') {
        setFocusedMemory({ jobId, memoryId: focusedMemoryId, sphere });
        setFocusedJobId(jobId);
        setSelectedSphere('career');
      } else if (familyMemberId && sphere === 'family') {
        setFocusedMemory({ familyMemberId, memoryId: focusedMemoryId, sphere });
        setFocusedFamilyMemberId(familyMemberId);
        setSelectedSphere('family');
      } else if ((friendId || entityId) && sphere === 'friends') {
        const id = friendId || entityId;
        setFocusedMemory({ friendId: id, memoryId: focusedMemoryId, sphere });
        setFocusedFriendId(id!);
        setSelectedSphere('friends');
      } else if ((hobbyId || entityId) && sphere === 'hobbies') {
        const id = hobbyId || entityId;
        setFocusedMemory({ hobbyId: id, memoryId: focusedMemoryId, sphere });
        setFocusedHobbyId(id!);
        setSelectedSphere('hobbies');
      }
    } else if (entityId && sphere) {
      // Handle navigation from spheres tab without focused memory
      if (sphere === 'friends') {
        setFocusedFriendId(entityId);
        setSelectedSphere('friends');
      } else if (sphere === 'hobbies') {
        setFocusedHobbyId(entityId);
        setSelectedSphere('hobbies');
      }
    }
  }, [params.focusedMemoryId, params.profileId, params.jobId, params.familyMemberId, params.friendId, params.hobbyId, params.entityId, params.sphere]);

  // Ensure entity is focused when memory is focused (for state consistency after tab switches)
  // CRITICAL: Only sync if the memory's sphere matches the selected sphere
  React.useEffect(() => {
    if (focusedMemory && focusedMemory.sphere === selectedSphere) {
      if (focusedMemory.profileId && selectedSphere === 'relationships') {
        // Ensure profile is focused when its memory is focused
        if (!focusedProfileId || focusedProfileId !== focusedMemory.profileId) {
          setFocusedProfileId(focusedMemory.profileId);
        }
      } else if (focusedMemory.jobId && selectedSphere === 'career') {
        // Ensure job is focused when its memory is focused
        if (!focusedJobId || focusedJobId !== focusedMemory.jobId) {
          setFocusedJobId(focusedMemory.jobId);
        }
      } else if (focusedMemory.familyMemberId && selectedSphere === 'family') {
        // Ensure family member is focused when its memory is focused
        if (!focusedFamilyMemberId || focusedFamilyMemberId !== focusedMemory.familyMemberId) {
          setFocusedFamilyMemberId(focusedMemory.familyMemberId);
        }
      } else if (focusedMemory.friendId && selectedSphere === 'friends') {
        // Ensure friend is focused when its memory is focused
        if (!focusedFriendId || focusedFriendId !== focusedMemory.friendId) {
          setFocusedFriendId(focusedMemory.friendId);
        }
      } else if (focusedMemory.hobbyId && selectedSphere === 'hobbies') {
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
  }, [focusedMemory, selectedSphere, focusedProfileId, focusedJobId, focusedFamilyMemberId]);

  // Create stable callbacks for runOnJS
  const handleSlideOutComplete = useCallback(() => {
    setAnimationsComplete(true);
  }, []);

  const handleSlideInComplete = useCallback(() => {
    setAnimationsComplete(false);
  }, []);

  // Animated value for sliding other EX zones off-screen - only create when animations are ready
  const slideOffset = useSharedValue(0); // For relationships
  // Separate slideOffset values for each sphere
  const careerSlideOffset = useSharedValue(0);
  const familySlideOffset = useSharedValue(0);
  const friendsSlideOffset = useSharedValue(0);
  const hobbiesSlideOffset = useSharedValue(0);
  
  // CRITICAL: Immediately reset slideOffset when sphere changes to ensure profiles are visible
  // This must run before the animation logic to prevent profiles from staying hidden
  React.useLayoutEffect(() => {
    // When sphere changes, immediately reset all slideOffsets to 0 to make entities visible
    // This fixes the issue where entities stay hidden after drilling into a memory and switching spheres
    slideOffset.value = 0;
    careerSlideOffset.value = 0;
    familySlideOffset.value = 0;
    friendsSlideOffset.value = 0;
    hobbiesSlideOffset.value = 0;
  }, [selectedSphere, slideOffset, careerSlideOffset, familySlideOffset, friendsSlideOffset, hobbiesSlideOffset]);
  
  // Use useLayoutEffect to start animation synchronously before paint to prevent flash
  React.useLayoutEffect(() => {
    if (animationsReady) {
      // Animate smoothly when focusing or unfocusing
      // Keep other ex-es hidden if either profile OR memory is focused
      const easingConfig = Easing.bezier(0.4, 0.0, 0.2, 1); // Smooth ease-in-out curve
      const targetValue = SCREEN_WIDTH * 2;
      
      // Helper function to animate slideOffset
      const animateSlideOffset = (offset: ReturnType<typeof useSharedValue<number>>, shouldSlideOut: boolean) => {
        const currentValue = offset.value;
        if (shouldSlideOut) {
          if (Math.abs(currentValue - targetValue) > 1) {
            offset.value = withTiming(targetValue, {
              duration: 1200,
              easing: easingConfig,
            });
          }
        } else {
          if (Math.abs(currentValue - 0) > 1) {
            offset.value = withTiming(0, {
              duration: 600,
              easing: easingConfig,
            });
          }
        }
      };
      
      // Relationships slideOffset
      const shouldSlideOutRelationships = focusedProfileId || (focusedMemory && focusedMemory.sphere === 'relationships');
      if (shouldSlideOutRelationships) {
        const currentValue = slideOffset.value;
        if (Math.abs(currentValue - targetValue) > 1) {
          slideOffset.value = withTiming(targetValue, {
            duration: 1200,
            easing: easingConfig,
          }, (finished) => {
            'worklet';
            if (finished) {
              runOnJS(handleSlideOutComplete)();
            }
          });
        }
      } else {
        const currentValue = slideOffset.value;
        if (Math.abs(currentValue - 0) > 1) {
          slideOffset.value = withTiming(0, {
            duration: 600,
            easing: easingConfig,
          }, (finished) => {
            'worklet';
            if (finished) {
              runOnJS(handleSlideInComplete)();
            }
          });
        } else {
          runOnJS(handleSlideInComplete)();
        }
      }
      
      // Career slideOffset
      animateSlideOffset(careerSlideOffset, !!(focusedJobId || (focusedMemory && focusedMemory.sphere === 'career')));
      
      // Family slideOffset
      animateSlideOffset(familySlideOffset, !!(focusedFamilyMemberId || (focusedMemory && focusedMemory.sphere === 'family')));
      
      // Friends slideOffset
      animateSlideOffset(friendsSlideOffset, !!(focusedFriendId || (focusedMemory && focusedMemory.sphere === 'friends')));
      
      // Hobbies slideOffset
      animateSlideOffset(hobbiesSlideOffset, !!(focusedHobbyId || (focusedMemory && focusedMemory.sphere === 'hobbies')));
    }
     
  }, [focusedProfileId, focusedJobId, focusedFamilyMemberId, focusedFriendId, focusedHobbyId, focusedMemory, animationsReady, handleSlideOutComplete, handleSlideInComplete, slideOffset, careerSlideOffset, familySlideOffset, friendsSlideOffset, hobbiesSlideOffset]);
  
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
    // Always return all profiles so they can animate out smoothly
    // The NonFocusedZone component will handle the animation
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
        const aIsOngoing = a.job.endDate === null || a.job.endDate === undefined || a.job.endDate === '';
        const bIsOngoing = b.job.endDate === null || b.job.endDate === undefined || b.job.endDate === '';
        
        if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
        if (!aIsOngoing && bIsOngoing) return 1;  // b is ongoing, a is not - b comes first
        
        // Both are ongoing or both are ended - sort by index (which preserves sortedJobs order)
        return a.index - b.index;
      });
    });
    
    return grouped;
  }, [sortedJobs, getJobSectionKey, jobYearSections]);

  // Group visible profiles by their year sections, preserving their index in sortedProfiles
  const profilesBySection = React.useMemo(() => {
    const grouped = new Map<string, { profile: any; index: number }[]>();
    
    
    visibleProfiles.forEach(profile => {
      const sectionKey = getProfileSectionKey(profile);
      if (sectionKey) {
        // Find the index in sortedProfiles
        const indexInSorted = sortedProfiles.findIndex(p => p.id === profile.id);
        
        if (indexInSorted >= 0) {
          // Always add profile to group, even if section doesn't exist in yearSections yet
          // The section will be created or we'll handle it during rendering
          if (!grouped.has(sectionKey)) {
            grouped.set(sectionKey, []);
          }
          grouped.get(sectionKey)!.push({ profile, index: indexInSorted });
        }
      }
    });
    
    // Sort profiles within each section to ensure ongoing items are first
    grouped.forEach((profiles, sectionKey) => {
      profiles.sort((a, b) => {
        // First, ensure ongoing items come first within each section
        const aIsOngoing = a.profile.relationshipEndDate === null || a.profile.relationshipEndDate === undefined;
        const bIsOngoing = b.profile.relationshipEndDate === null || b.profile.relationshipEndDate === undefined;
        
        if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
        if (!aIsOngoing && bIsOngoing) return 1;  // b is ongoing, a is not - b comes first
        
        // Both are ongoing or both are ended - sort by index (which preserves sortedProfiles order)
        return a.index - b.index;
      });
    });

    return grouped;
  }, [visibleProfiles, sortedProfiles, getProfileSectionKey, yearSections, focusedProfileId, focusedMemory, selectedSphere]);

  // Memoize focused profiles render - must be called unconditionally
  // This renders profiles when they're focused, and also handles the unfocus animation
  // Changed to match career pattern: use FloatingAvatar directly instead of ProfileRenderer
  const focusedProfilesRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;
    
    // Only render if there's a focused profile OR if we need to handle unfocus animation
    if (!focusedProfileId && !previousFocusedIdRef.current) return null;
    
    return visibleProfiles.map((profile, index) => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      const isFocused = focusedProfileId === profile.id;
      const wasJustFocused = previousFocusedIdRef.current === profile.id && !focusedProfileId;
      
      // Render focused profile OR profile that was just unfocused (for animation)
      if (!isFocused && !wasJustFocused) return null;
      
      // Get the profile's year section to calculate original position
      const yearSection = getProfileYearSection(profile);
      let currentPosition: { x: number; y: number };
      
      if (isFocused) {
        // When focused, use original position - the animation will move it to center
        // Calculate original position from year section
        currentPosition = getAvatarPosition(profile.id, index);
      } else if (wasJustFocused) {
        // When just unfocused, use original position from year section
        currentPosition = getAvatarPosition(profile.id, index);
      } else {
        // Fallback
        currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
      }
      
      return (
        <FloatingAvatar
          key={profile.id}
          profile={profile}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId = focusedProfileId === profile.id ? null : profile.id;
            setFocusedProfileId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? 'dark'}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as { profileId?: string; memoryId: string; sphere: LifeSphere };
            if (mem.profileId === profile.id && mem.sphere === 'relationships') {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'relationships', momentId?: string) => {
            setFocusedMemory({ profileId: entityId, memoryId, sphere, momentToShowId: momentId });
          }}
          yearSection={yearSection}
          onEntityWheelChange={(isActive) => setIsAnyEntityWheelActive(isActive)}
        />
      );
    });
  }, [animationsReady, focusedProfileId, focusedMemory, visibleProfiles, getIdealizedMemoriesByProfileId, getAvatarPosition, getProfileYearSection, previousFocusedIdRef, setFocusedProfileId, setFocusedMemory, colors, colorScheme]);

  // Memoize focused jobs render - must be called unconditionally
  // This renders jobs when they're focused, and also handles the unfocus animation
  const focusedJobsRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;
    
    // Only render if there's a focused job OR if we need to handle unfocus animation
    if (!focusedJobId && !previousFocusedJobIdRef.current) return null;
    
    return sortedJobs.map((job, index) => {
      const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
      const isFocused = focusedJobId === job.id;
      const wasJustFocused = previousFocusedJobIdRef.current === job.id && !focusedJobId;
      
      // Render focused job OR job that was just unfocused (for animation)
      if (!isFocused && !wasJustFocused) return null;
      
      // Get the job's year section to calculate original position
      const yearSection = getJobYearSection(job);
      let currentPosition: { x: number; y: number };
      
      if (isFocused) {
        // When focused, use original position - the animation will move it to center
        // Calculate original position from year section
        if (yearSection) {
          const sectionKey = getJobSectionKey(job);
          const jobsInSection = sectionKey ? jobsBySection.get(sectionKey) : undefined;
          if (jobsInSection) {
            const jobIndexInSection = jobsInSection.findIndex(({ job: j }) => j.id === job.id);
            const totalJobsInSection = jobsInSection.length;
            const sectionCenterY = yearSection.top + yearSection.height / 2;
            const verticalSpacing = totalJobsInSection > 1 
              ? Math.min(yearSection.height / (totalJobsInSection + 1), 150)
              : 0;
            currentPosition = {
              x: SCREEN_WIDTH / 2,
              y: totalJobsInSection === 1
                ? sectionCenterY
                : yearSection.top + verticalSpacing * (jobIndexInSection + 1)
            };
          } else {
            // Fallback to center if section not found
            currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
          }
        } else {
          // Fallback to center if no year section
          currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
        }
      } else if (wasJustFocused && yearSection) {
        // When just unfocused, use original position from year section
        // Find the job's position in its section
        const sectionKey = getJobSectionKey(job);
        const jobsInSection = sectionKey ? jobsBySection.get(sectionKey) : undefined;
        if (jobsInSection) {
          const jobIndexInSection = jobsInSection.findIndex(({ job: j }) => j.id === job.id);
          const totalJobsInSection = jobsInSection.length;
          const sectionCenterY = yearSection.top + yearSection.height / 2;
          const verticalSpacing = totalJobsInSection > 1 
            ? Math.min(yearSection.height / (totalJobsInSection + 1), 150)
            : 0;
          currentPosition = {
            x: SCREEN_WIDTH / 2,
            y: totalJobsInSection === 1
              ? sectionCenterY
              : yearSection.top + verticalSpacing * (jobIndexInSection + 1)
          };
        } else {
          currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
        }
      } else {
        // Fallback
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
          colorScheme={colorScheme ?? 'dark'}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere };
            if (mem.jobId === job.id && mem.sphere === 'career') {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'career', momentId?: string) => {
            setFocusedMemory({ jobId: entityId, memoryId, sphere, momentToShowId: momentId });
          }}
          yearSection={yearSection}
        />
      );
    });
  }, [animationsReady, focusedJobId, focusedMemory, sortedJobs, getIdealizedMemoriesByEntityId, getJobYearSection, getJobSectionKey, jobsBySection, previousFocusedJobIdRef, setFocusedJobId, setFocusedMemory, colors, colorScheme]);

  // Memoize focused family members render - must be called unconditionally
  // This renders family members when they're focused, and also handles the unfocus animation
  const focusedFamilyMembersRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;
    
    // Only render if there's a focused family member OR if we need to handle unfocus animation
    if (!focusedFamilyMemberId && !previousFocusedFamilyMemberIdRef.current) return null;
    
    return familyMembers.map((member, index) => {
      const memories = getIdealizedMemoriesByEntityId(member.id, 'family');
      const isFocused = focusedFamilyMemberId === member.id;
      const wasJustFocused = previousFocusedFamilyMemberIdRef.current === member.id && !focusedFamilyMemberId;
      
      // Render focused family member OR family member that was just unfocused (for animation)
      if (!isFocused && !wasJustFocused) return null;
      
      // Get the family member's section and position
      const section = familyYearSections.get('all');
      let currentPosition: { x: number; y: number };

      // Check if we have a saved position
      const savedPosition = familyPositionsState.get(member.id);

      if (wasJustFocused && savedPosition) {
        // When unfocusing, use the saved position so it animates from where it was last placed
        currentPosition = savedPosition;
      } else if (isFocused || wasJustFocused) {
        // When focusing or no saved position, use the pre-calculated collision-free position
        const calculatedPosition = familyMemberPositions && familyMemberPositions[index];
        if (calculatedPosition) {
          currentPosition = calculatedPosition;
        } else if (savedPosition) {
          // Fallback to saved position if no calculated position
          currentPosition = savedPosition;
        } else {
          // Final fallback to center
          currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
        }
      } else {
        currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
      }
      
      return (
        <FloatingAvatar
          key={member.id}
          profile={member}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId = focusedFamilyMemberId === member.id ? null : member.id;
            setFocusedFamilyMemberId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? 'dark'}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as { familyMemberId?: string; memoryId: string; sphere: LifeSphere };
            if (mem.familyMemberId === member.id && mem.sphere === 'family') {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'family', momentId?: string) => {
            setFocusedMemory({ familyMemberId: entityId, memoryId, sphere, momentToShowId: momentId });
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
        />
      );
    });
  }, [animationsReady, focusedFamilyMemberId, focusedMemory, familyMembers, getIdealizedMemoriesByEntityId, familyYearSections, previousFocusedFamilyMemberIdRef.current, setFocusedFamilyMemberId, setFocusedMemory, colors, colorScheme, focusedFamilyMemberPositionX, focusedFamilyMemberPositionY, updateFamilyMemberPosition]);

  // Memoize focused friends render - must be called unconditionally
  // This renders friends when they're focused, and also handles the unfocus animation
  const focusedFriendsRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;
    
    // Only render if there's a focused friend OR if we need to handle unfocus animation
    if (!focusedFriendId && !previousFocusedFriendIdRef.current) return null;
    
    return friends.map((friend, index) => {
      const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
      const isFocused = focusedFriendId === friend.id;
      const wasJustFocused = previousFocusedFriendIdRef.current === friend.id && !focusedFriendId;

      // Render focused friend OR friend that was just unfocused (for animation)
      if (!isFocused && !wasJustFocused) {
        return null;
      }
      
      // Get the friend's section and position
      const section = friendsYearSections.get('all');
      let currentPosition: { x: number; y: number };

      // Check if we have a saved position
      const savedPosition = friendPositionsState.get(friend.id);

      if (wasJustFocused && savedPosition) {
        // When unfocusing, use the saved position so it animates from where it was last placed
        currentPosition = savedPosition;
      } else if (isFocused || wasJustFocused) {
        // When focusing or no saved position, use the pre-calculated collision-free position
        const calculatedPosition = friendPositions && friendPositions[index];
        if (calculatedPosition) {
          currentPosition = calculatedPosition;
        } else if (savedPosition) {
          // Fallback to saved position if no calculated position
          currentPosition = savedPosition;
        } else {
          // Final fallback to center
          currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
        }
      } else {
        currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
      }
      
      return (
        <FloatingAvatar
          key={friend.id}
          profile={friend}
          position={currentPosition}
          memories={memories}
          onPress={() => {
            const newFocusedId = focusedFriendId === friend.id ? null : friend.id;
            setFocusedFriendId(newFocusedId);
            setFocusedMemory(null);
          }}
          colors={colors}
          colorScheme={colorScheme ?? 'dark'}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as { friendId?: string; memoryId: string; sphere: LifeSphere };
            if (mem.friendId === friend.id && mem.sphere === 'friends') {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'friends', momentId?: string) => {
            setFocusedMemory({ friendId: entityId, memoryId, sphere, momentToShowId: momentId });
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
        />
      );
    });
  }, [animationsReady, focusedFriendId, focusedMemory, friends, getIdealizedMemoriesByEntityId, friendsYearSections, previousFocusedFriendIdRef.current, setFocusedFriendId, setFocusedMemory, colors, colorScheme, focusedFriendPositionX, focusedFriendPositionY, updateFriendPosition]);

  // Memoize focused hobbies render - must be called unconditionally
  // This renders hobbies when they're focused, and also handles the unfocus animation
  const focusedHobbiesRender = useMemo(() => {
    if (!animationsReady || focusedMemory) return null;
    
    // Only render if there's a focused hobby OR if we need to handle unfocus animation
    if (!focusedHobbyId && !previousFocusedHobbyIdRef.current) return null;
    
    return hobbies.map((hobby, index) => {
      const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
      const isFocused = focusedHobbyId === hobby.id;
      const wasJustFocused = previousFocusedHobbyIdRef.current === hobby.id && !focusedHobbyId;
      
      // Render focused hobby OR hobby that was just unfocused (for animation)
      if (!isFocused && !wasJustFocused) return null;
      
      // Get the hobby's section and position
      const section = hobbiesYearSections.get('all');
      let currentPosition: { x: number; y: number };

      // Check if we have a saved position
      const savedPosition = hobbyPositionsState.get(hobby.id);

      if (wasJustFocused && savedPosition) {
        // When unfocusing, use the saved position so it animates from where it was last placed
        currentPosition = savedPosition;
      } else if (isFocused || wasJustFocused) {
        // When focusing or no saved position, use the pre-calculated collision-free position
        const calculatedPosition = hobbyPositions && hobbyPositions[index];
        if (calculatedPosition) {
          currentPosition = calculatedPosition;
        } else if (savedPosition) {
          // Fallback to saved position if no calculated position
          currentPosition = savedPosition;
        } else {
          // Final fallback to center
          currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
        }
      } else {
        currentPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
      }
      
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
          colorScheme={colorScheme ?? 'dark'}
          isFocused={isFocused}
          focusedMemory={(() => {
            if (!focusedMemory) return null;
            const mem = focusedMemory as { hobbyId?: string; memoryId: string; sphere: LifeSphere };
            if (mem.hobbyId === hobby.id && mem.sphere === 'hobbies') {
              return mem;
            }
            return null;
          })()}
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'hobbies', momentId?: string) => {
            setFocusedMemory({ hobbyId: entityId, memoryId, sphere, momentToShowId: momentId });
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
        />
      );
    });
  }, [animationsReady, focusedHobbyId, focusedMemory, hobbies, getIdealizedMemoriesByEntityId, hobbiesYearSections, previousFocusedHobbyIdRef.current, setFocusedHobbyId, setFocusedMemory, colors, colorScheme, focusedHobbyPositionX, focusedHobbyPositionY, updateHobbyPosition]);

  // Memoize calculated positions for family members with collision detection
  const familyMemberPositions = useMemo(() => {
    const baseAvatarSize = isTablet ? 120 : 100;
    const minDistance = baseAvatarSize * 1.3;
    const calculatedPositions: { x: number; y: number }[] = [];

    const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
    const visibleAreaTop = insets.top;
    const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight;
    const visibleAreaHeight = visibleAreaBottom - visibleAreaTop;
    const visibleAreaCenterY = visibleAreaTop + visibleAreaHeight / 2;

    const centerAreaTop = visibleAreaTop + visibleAreaHeight * 0.2;
    const centerAreaBottom = visibleAreaBottom - visibleAreaHeight * 0.2;
    const centerAreaMinX = SCREEN_WIDTH * 0.15;
    const centerAreaMaxX = SCREEN_WIDTH * 0.85;

    const bounds = {
      minX: centerAreaMinX,
      maxX: centerAreaMaxX,
      minY: centerAreaTop + 50,
      maxY: centerAreaBottom - 50
    };

    const getMemberHash = (memberId: string, seed: string = '') => {
      let hash = 0;
      const str = memberId + seed;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash % 10000) / 10000;
    };

    familyMembers.forEach((member) => {
      const angle = getMemberHash(member.id, 'angle') * 2 * Math.PI;
      const maxRadius = Math.min(SCREEN_WIDTH, visibleAreaHeight) * 0.35;
      const minRadius = Math.min(SCREEN_WIDTH, visibleAreaHeight) * 0.1;
      const radiusFactor = getMemberHash(member.id, 'radius');
      const radius = minRadius + radiusFactor * (maxRadius - minRadius);

      const initialPosition = {
        x: SCREEN_WIDTH / 2 + Math.cos(angle) * radius,
        y: visibleAreaCenterY + Math.sin(angle) * radius
      };

      initialPosition.x = Math.max(bounds.minX, Math.min(bounds.maxX, initialPosition.x));
      initialPosition.y = Math.max(bounds.minY, Math.min(bounds.maxY, initialPosition.y));

      const finalPosition = findNonOverlappingPosition(initialPosition, calculatedPositions, minDistance, bounds);
      calculatedPositions.push(finalPosition);
    });

    return calculatedPositions;
  }, [familyMembers, isTablet, fontScale, insets.top, insets.bottom, findNonOverlappingPosition]);

  // Memoize calculated positions for friends with collision detection
  const friendPositions = useMemo(() => {
    const baseAvatarSize = isTablet ? 120 : 100;
    const minDistance = baseAvatarSize * 1.3;
    const calculatedPositions: { x: number; y: number }[] = [];

    const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
    const visibleAreaTop = insets.top;
    const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight;
    const visibleAreaHeight = visibleAreaBottom - visibleAreaTop;
    const visibleAreaCenterY = visibleAreaTop + visibleAreaHeight / 2;

    const centerAreaTop = visibleAreaTop + visibleAreaHeight * 0.2;
    const centerAreaBottom = visibleAreaBottom - visibleAreaHeight * 0.2;
    const centerAreaMinX = SCREEN_WIDTH * 0.15;
    const centerAreaMaxX = SCREEN_WIDTH * 0.85;

    const bounds = {
      minX: centerAreaMinX,
      maxX: centerAreaMaxX,
      minY: centerAreaTop + 50,
      maxY: centerAreaBottom - 50
    };

    const getFriendHash = (friendId: string, seed: string = '') => {
      let hash = 0;
      const str = friendId + seed;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash % 10000) / 10000;
    };

    friends.forEach((friend) => {
      const angle = getFriendHash(friend.id, 'angle') * 2 * Math.PI;
      const maxRadius = Math.min(SCREEN_WIDTH, visibleAreaHeight) * 0.35;
      const minRadius = Math.min(SCREEN_WIDTH, visibleAreaHeight) * 0.1;
      const radiusFactor = getFriendHash(friend.id, 'radius');
      const radius = minRadius + radiusFactor * (maxRadius - minRadius);

      const initialPosition = {
        x: SCREEN_WIDTH / 2 + Math.cos(angle) * radius,
        y: visibleAreaCenterY + Math.sin(angle) * radius
      };

      initialPosition.x = Math.max(bounds.minX, Math.min(bounds.maxX, initialPosition.x));
      initialPosition.y = Math.max(bounds.minY, Math.min(bounds.maxY, initialPosition.y));

      const finalPosition = findNonOverlappingPosition(initialPosition, calculatedPositions, minDistance, bounds);
      calculatedPositions.push(finalPosition);
    });

    return calculatedPositions;
  }, [friends, isTablet, fontScale, insets.top, insets.bottom, findNonOverlappingPosition]);

  // Memoize calculated positions for hobbies with collision detection
  const hobbyPositions = useMemo(() => {
    const baseAvatarSize = isTablet ? 120 : 100;
    const minDistance = baseAvatarSize * 1.3;
    const calculatedPositions: { x: number; y: number }[] = [];

    const tabBarHeight = Math.round(78 * fontScale) + Math.max(12, insets.bottom + 12 - 20 * fontScale);
    const visibleAreaTop = insets.top;
    const visibleAreaBottom = SCREEN_HEIGHT - tabBarHeight;
    const visibleAreaHeight = visibleAreaBottom - visibleAreaTop;
    const visibleAreaCenterY = visibleAreaTop + visibleAreaHeight / 2;

    const centerAreaTop = visibleAreaTop + visibleAreaHeight * 0.2;
    const centerAreaBottom = visibleAreaBottom - visibleAreaHeight * 0.2;
    const centerAreaMinX = SCREEN_WIDTH * 0.15;
    const centerAreaMaxX = SCREEN_WIDTH * 0.85;

    const bounds = {
      minX: centerAreaMinX,
      maxX: centerAreaMaxX,
      minY: centerAreaTop + 50,
      maxY: centerAreaBottom - 50
    };

    const getHobbyHash = (hobbyId: string, seed: string = '') => {
      let hash = 0;
      const str = hobbyId + seed;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash % 10000) / 10000;
    };

    hobbies.forEach((hobby) => {
      const angle = getHobbyHash(hobby.id, 'angle') * 2 * Math.PI;
      const maxRadius = Math.min(SCREEN_WIDTH, visibleAreaHeight) * 0.35;
      const minRadius = Math.min(SCREEN_WIDTH, visibleAreaHeight) * 0.1;
      const radiusFactor = getHobbyHash(hobby.id, 'radius');
      const radius = minRadius + radiusFactor * (maxRadius - minRadius);

      const initialPosition = {
        x: SCREEN_WIDTH / 2 + Math.cos(angle) * radius,
        y: visibleAreaCenterY + Math.sin(angle) * radius
      };

      initialPosition.x = Math.max(bounds.minX, Math.min(bounds.maxX, initialPosition.x));
      initialPosition.y = Math.max(bounds.minY, Math.min(bounds.maxY, initialPosition.y));

      const finalPosition = findNonOverlappingPosition(initialPosition, calculatedPositions, minDistance, bounds);
      calculatedPositions.push(finalPosition);
    });

    return calculatedPositions;
  }, [hobbies, isTablet, fontScale, insets.top, insets.bottom, findNonOverlappingPosition]);

  // Render sphere view - show all 3 spheres with memories floating around, center shows overall percentage
  // When a sphere is selected, show the entities for that sphere (like year sections for relationships)
  
  // Calculate avatar center coordinates for sparkled dots (always show on all screens)
  const avatarCenterX = SCREEN_WIDTH / 2;
  const avatarCenterY = SCREEN_HEIGHT / 2 + 60; // Lower the main circle by 60px
  const baseAvatarSize = isTablet ? 180 : 140; // Increased from 120 to 140
  const avatarSizeForDots = baseAvatarSize; // Use base size for dots positioning
  
  if (!selectedSphere) {
  return (
    <TabScreenContainer
      // Glow effect disabled - no momentType or momentTypeOpacity
      // momentType={showMomentTypeSelector ? selectedMomentType : undefined}
      // momentTypeOpacity={cornerGlowOpacity}
    >
        {/* Never show AI consent / banner if user has no memories */}
        {hasAnyMoments && (
          <AIInsightsConsentModal
            visible={aiInsightsConsentVisible}
            onEnable={() => {
              void aiConsent.setChoice('enabled').then(() => {
                setAiInsightsConsentVisible(false);
                // Trigger a fresh AI message now that consent is granted
                setAiEncouragementText(null);
                setEncouragementCacheBust((x) => x + 1);
              });
            }}
            onMaybeLater={() => {
              void aiConsent.setChoice('maybe_later').then(() => {
                setAiInsightsConsentVisible(false);
                // Use fallback (no AI call)
                setAiEncouragementText(null);
                setAiEncouragementLoading(false);
              });
            }}
          />
        )}

        {/* Streak Badge - Top Right */}
        {streakData && (
          <StreakBadgeComponent
            currentStreak={streakData.currentStreak}
            currentBadge={currentBadge}
            onPress={() => setStreakRulesModalVisible(true)}
            onLongPress={() => setStreakModalVisible(true)}
          />
        )}

        {/* Streak Rules Modal */}
        <StreakRulesModal
          visible={streakRulesModalVisible}
          onClose={() => setStreakRulesModalVisible(false)}
        />

        {/* Streak Stats Modal */}
        {streakData && (
          <StreakModal
            visible={streakModalVisible}
            onClose={() => setStreakModalVisible(false)}
            streakData={streakData}
            currentBadge={currentBadge}
            nextBadge={nextBadge}
          />
        )}

        <View style={{ flex: 1, height: SCREEN_HEIGHT, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
          {/* Sparkled Dots - Always visible on all screens - full screen coverage */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={avatarCenterX}
            avatarCenterY={avatarCenterY}
            colorScheme={colorScheme ?? 'dark'}
            fullScreen={true}
          />
          
          {/* Sparkled Dots around top text box - positioned behind the text box */}
          {hasAnyMoments && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250, zIndex: 150, pointerEvents: 'none' }}>
              <SparkledDots
                avatarSize={SCREEN_WIDTH * 0.8} // Use a larger area to cover the text box region and surrounding area
                avatarCenterX={SCREEN_WIDTH / 2}
                avatarCenterY={100 + 50} // Position around the text box (top: 100 + approximate height/2)
                colorScheme={colorScheme ?? 'dark'}
              />
            </View>
          )}
          
          {/* Encouraging Message Section */}
          {/* Only render when we have content (AI text) or an error fallback. Avoid empty flash while AI loads. */}
          {hasAnyMoments &&
            isEncouragementVisible &&
            // If AI isn't enabled, always show the local fallback encouragement.
            // If AI is enabled, only show when we have AI text or an error (fallback).
            (!aiConsent.isEnabled || aiEncouragementError || !!aiEncouragementText) && (
            <View
              style={[
                encouragementContainerStyle,
                encouragementStaticStyle,
              ]}
            >
              {/* Close button */}
              <Pressable
                onPress={() => {
                  void (async () => {
                    try {
                      const key = lastEncouragementCacheKeyRef.current;
                      if (key) {
                        await AsyncStorage.removeItem(key);
                      }
                    } catch {
                      // ignore cache removal errors
                    } finally {
                      // Hide now, force refresh next time
                      setAiEncouragementText(null);
                      setEncouragementCacheBust((x) => x + 1);
                      setIsEncouragementVisible(false);
                    }
                  })();
                }}
                style={closeButtonStyle}
                hitSlop={CLOSE_BUTTON_HITSLOP}
              >
                <MaterialIcons 
                  name="close" 
                  size={18 * fontScale} 
                  color={colors.text} 
                  style={{ opacity: 0.7 }}
                />
              </Pressable>
              
              {/* Gradient background */}
              <LinearGradient
                colors={gradientColors}
                start={LINEAR_GRADIENT_START}
                end={LINEAR_GRADIENT_END}
                style={gradientStyle}
              />
              
              {/* Border */}
              <View style={borderStyle} />
              
              {/* Shadow/Glow effect */}
              {overallSunnyPercentage > 50 && (
                <View style={shadowGlowStyle} />
              )}
              
              {/* Content */}
              <ThemedText
                size="sm"
                style={encouragementTextStyle}
              >
                {aiConsent.isEnabled && aiEncouragementText
                  ? encouragementTextWithSparkle
                  : fallbackEncouragementTextClean}
              </ThemedText>
            </View>
          )}

          {/* Random Moment from Wheel of Life Spin - matches focused memory view style */}
          {showLesson && selectedLesson && (() => {
            const momentType = selectedLesson.momentType || 'lessons';
            
            // Calculate dimensions - all moment types use dynamic size based on text length
            const textLength = selectedLesson.text?.length || 0;

            // Base sizes
            const baseSunSize = isTablet ? 280 : (isLargeDevice ? 240 : 200);
            const baseCircleSize = isTablet ? 220 : (isLargeDevice ? 190 : 165);
            const baseCloudWidth = isTablet ? 280 : (isLargeDevice ? 240 : 220);

            // Dynamic sizing based on text length
            let momentWidth: number;
            let momentHeight: number;

            if (momentType === 'sunnyMoments') {
              const dynamicSunSize = Math.min(SCREEN_WIDTH * 0.85, Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 1.8)));
              momentWidth = dynamicSunSize;
              momentHeight = dynamicSunSize;
            } else if (momentType === 'hardTruths') {
              // Cloud grows wider and taller with text length
              const dynamicCloudWidth = Math.min(SCREEN_WIDTH * 0.9, Math.max(baseCloudWidth * 1.6, baseCloudWidth * 1.6 + Math.floor(textLength * 1.2)));
              const dynamicCloudHeight = Math.min(250, Math.max(baseCloudWidth * 0.6, baseCloudWidth * 0.6 + Math.floor(textLength * 0.5)));
              momentWidth = dynamicCloudWidth;
              momentHeight = dynamicCloudHeight;
            } else {
              // Lessons (lightbulb) - circle grows with text length (reduced growth rate)
              const lessonSizeMultiplier = Math.min(1.4, Math.max(1.0, 1.0 + (textLength / 150)));
              const dynamicCircleSize = baseCircleSize * lessonSizeMultiplier;
              momentWidth = dynamicCircleSize;
              momentHeight = dynamicCircleSize;
            }

            // Get visual properties based on moment type
            const momentVisuals = {
              lessons: {
                icon: 'lightbulb' as const,
                backgroundColor: 'rgba(255, 215, 0, 0.45)',
                shadowColor: '#FFD700',
                iconColor: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
              },
              hardTruths: {
                icon: 'cloud' as const,
                backgroundColor: 'rgba(150, 150, 180, 0.35)',
                shadowColor: '#9696B4',
                iconColor: colorScheme === 'dark' ? '#B0B0C8' : '#7878A0',
              },
              sunnyMoments: {
                icon: 'wb-sunny' as const,
                backgroundColor: 'rgba(255, 215, 0, 0.55)',
                shadowColor: '#FFD700',
                iconColor: colorScheme === 'dark' ? '#FFD700' : '#FF9800',
              },
            };

            const visuals = momentVisuals[momentType];

            const handlePress = () => {
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
                if (sphere === 'relationships') {
                  const memoryData = { profileId: entityId, memoryId, sphere };
                  setFocusedProfileId(entityId);
                  setSelectedSphere('relationships');
                  // Delay memory focus to ensure entity is rendered first
                  setTimeout(() => {
                    setFocusedMemory(memoryData);
                  }, 100);
                } else if (sphere === 'career') {
                  const memoryData = { jobId: entityId, memoryId, sphere };
                  setFocusedJobId(entityId);
                  setSelectedSphere('career');
                  setTimeout(() => {
                    setFocusedMemory(memoryData);
                  }, 100);
                } else if (sphere === 'family') {
                  const memoryData = { familyMemberId: entityId, memoryId, sphere };
                  setFocusedFamilyMemberId(entityId);
                  setSelectedSphere('family');
                  setTimeout(() => {
                    setFocusedMemory(memoryData);
                  }, 100);
                } else if (sphere === 'friends') {
                  const memoryData = { friendId: entityId, memoryId, sphere };
                  setFocusedFriendId(entityId);
                  setSelectedSphere('friends');
                  setTimeout(() => {
                    setFocusedMemory(memoryData);
                  }, 100);
                } else if (sphere === 'hobbies') {
                  const memoryData = { hobbyId: entityId, memoryId, sphere };
                  setFocusedHobbyId(entityId);
                  setSelectedSphere('hobbies');
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
                  position: 'absolute',
                    top: messageTop,
                    left: SCREEN_WIDTH / 2 - (momentWidth / 2), // Center horizontally
                  zIndex: 300, // Higher than encouragement message
                  },
                  lessonAnimatedStyle,
                ]}
              >
                {momentType === 'sunnyMoments' ? (
                  // SVG sun with rays (matching video preview component)
                  <AnimatedPressable
                    onPressIn={() => {
                      lessonPressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      lessonPressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                    }}
                    onPress={handlePress}
                    style={[
                      {
                        width: momentWidth,
                        height: momentHeight,
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative',
                      },
                      lessonShadowAnimatedStyle,
                    ]}
                  >
                    <View
                      style={{
                        width: momentWidth,
                        height: momentHeight,
                        shadowColor: '#FFD700',
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
                        style={{ position: 'absolute', top: 0, left: 0 }}
                      >
                        <Defs>
                          <RadialGradient
                            id={`mainSunGradient-${selectedLesson.entityId || 'default'}`}
                            cx="80"
                            cy="80"
                            rx="48"
                            ry="48"
                            fx="80"
                            fy="80"
                            gradientUnits="userSpaceOnUse"
                          >
                            <Stop offset="0%" stopColor="#FFEB3B" stopOpacity="1" />
                            <Stop offset="30%" stopColor="#FFEB3B" stopOpacity="1" />
                            <Stop offset="60%" stopColor="#FFD700" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#FFC107" stopOpacity="1" />
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
                              key={`mainRay-${i}`}
                              d={`M ${innerX} ${innerY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
                              fill="#FFD700"
                            />
                          );
                        })}
                        {/* Central circle */}
                        <Circle
                          cx="80"
                          cy="80"
                          r="48"
                          fill={`url(#mainSunGradient-${selectedLesson.entityId || 'default'})`}
                        />
                      </Svg>
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: momentWidth,
                          height: momentHeight,
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: momentWidth * 0.25,
                          paddingVertical: momentHeight * 0.2,
                        }}
                      >
                        <ThemedText
                          style={{
                            color: 'black',
                            fontSize: 13 * fontScale,
                            textAlign: 'center',
                            fontWeight: '700',
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

                          if (sphere === 'relationships') {
                            entityImage = profiles.find(p => p.id === entityId)?.imageUri;
                          } else if (sphere === 'career') {
                            entityImage = jobs.find(j => j.id === entityId)?.imageUri;
                          } else if (sphere === 'family') {
                            entityImage = familyMembers.find(f => f.id === entityId)?.imageUri;
                          } else if (sphere === 'friends') {
                            entityImage = friends.find(f => f.id === entityId)?.imageUri;
                          } else if (sphere === 'hobbies') {
                            entityImage = hobbies.find(h => h.id === entityId)?.imageUri;
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
                                borderColor: 'rgba(0,0,0,0.2)',
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
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colorScheme === 'dark'
                          ? 'rgba(0, 0, 0, 0.4)'
                          : 'rgba(255, 255, 255, 0.9)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        style={{ opacity: 0.8 }}
                      />
                    </Pressable>
                  </AnimatedPressable>
                ) : momentType === 'hardTruths' ? (
                  // SVG cloud (matching video preview component)
                  <AnimatedPressable
                    onPressIn={() => {
                      lessonPressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      lessonPressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                    }}
                    onPress={handlePress}
                    style={[
                      {
                        width: momentWidth,
                        height: momentHeight,
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative',
                      },
                      lessonShadowAnimatedStyle,
                    ]}
                  >
                    <View
                      style={{
                        width: momentWidth,
                        height: momentHeight,
                        shadowColor: '#4A5568',
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
                        style={{ position: 'absolute', top: 0, left: 0 }}
                      >
                        <Defs>
                          <SvgLinearGradient id={`mainCloudGradient-${selectedLesson.entityId || 'default'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#2C3E50" stopOpacity="0.95" />
                            <Stop offset="50%" stopColor="#1A1A1A" stopOpacity="0.98" />
                            <Stop offset="100%" stopColor="#0A0A0A" stopOpacity="1" />
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
                          fill={`url(#mainCloudGradient-${selectedLesson.entityId || 'default'})`}
                          stroke="rgba(0,0,0,0.7)"
                          strokeWidth={1.5}
                        />
                      </Svg>
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: momentWidth,
                          height: momentHeight,
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 20,
                        }}
                      >
                        <ThemedText
                          style={{
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: 14 * fontScale,
                            textAlign: 'center',
                            fontWeight: '500',
                          }}
                        >
                          {selectedLesson.text}
                        </ThemedText>
                        {/* Entity image circle below text */}
                        {(() => {
                          const entityId = selectedLesson.entityId;
                          const sphere = selectedLesson.sphere;
                          let entityImage: string | undefined;

                          if (sphere === 'relationships') {
                            entityImage = profiles.find(p => p.id === entityId)?.imageUri;
                          } else if (sphere === 'career') {
                            entityImage = jobs.find(j => j.id === entityId)?.imageUri;
                          } else if (sphere === 'family') {
                            entityImage = familyMembers.find(f => f.id === entityId)?.imageUri;
                          } else if (sphere === 'friends') {
                            entityImage = friends.find(f => f.id === entityId)?.imageUri;
                          } else if (sphere === 'hobbies') {
                            entityImage = hobbies.find(h => h.id === entityId)?.imageUri;
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
                                borderColor: 'rgba(255,255,255,0.3)',
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
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colorScheme === 'dark'
                          ? 'rgba(0, 0, 0, 0.4)'
                          : 'rgba(255, 255, 255, 0.9)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        style={{ opacity: 0.8 }}
                      />
                    </Pressable>
                  </AnimatedPressable>
                ) : (
                  // For lessons, use the original circle design with MaterialIcons
                  <AnimatedPressable
                    onPressIn={() => {
                      lessonPressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
                    }}
                    onPressOut={() => {
                      lessonPressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                    }}
                    onPress={handlePress}
                    style={[
                      {
                        width: momentWidth,
                        height: momentHeight,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: visuals.backgroundColor,
                        borderRadius: momentWidth / 2,
                        shadowColor: visuals.shadowColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.95,
                        shadowRadius: isTablet ? 40 : 30,
                        elevation: 24,
                        padding: 8,
                        position: 'relative',
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
                        color: colorScheme === 'dark' ? '#1A1A1A' : '#000000',
                        fontSize: Math.max(13, Math.min(16, 13 + (textLength / 60))) * fontScale,
                        textAlign: 'center',
                        fontWeight: '700',
                        maxWidth: momentWidth * 0.85,
                        lineHeight: Math.max(17, Math.min(20, 17 + (textLength / 60))) * fontScale,
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

                      if (sphere === 'relationships') {
                        entityImage = profiles.find(p => p.id === entityId)?.imageUri;
                      } else if (sphere === 'career') {
                        entityImage = jobs.find(j => j.id === entityId)?.imageUri;
                      } else if (sphere === 'family') {
                        entityImage = familyMembers.find(f => f.id === entityId)?.imageUri;
                      } else if (sphere === 'friends') {
                        entityImage = friends.find(f => f.id === entityId)?.imageUri;
                      } else if (sphere === 'hobbies') {
                        entityImage = hobbies.find(h => h.id === entityId)?.imageUri;
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
                            borderColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
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
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colorScheme === 'dark'
                          ? 'rgba(0, 0, 0, 0.4)'
                          : 'rgba(255, 255, 255, 0.9)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        style={{ opacity: 0.8 }}
                      />
                    </Pressable>
                  </AnimatedPressable>
                )}
            </Animated.View>
            );
          })()}

          {/* Center - Overall Percentage Avatar with Sparkled Dots */}
          {(() => {
            // Calculate avatar size considering floating entities intersection
            const sphereDistanceFromCenter = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35;
            const floatingEntityRadius = isTablet ? 85 : 55; // Larger on tablets by default
            const floatingEntitySize = isTablet ? 36 : 20; // Decreased from 24 to 20 for smaller floating elements
            const floatingEntityRadiusSize = floatingEntitySize / 2;
            const minDistanceToFloatingEntity = sphereDistanceFromCenter - floatingEntityRadius - floatingEntityRadiusSize;
            const baseAvatarSize = isTablet ? 160 : 100; // Reduced - smaller central avatar
            const baseAvatarRadius = baseAvatarSize / 2;
            const padding = 5;
            const maxSafeAvatarRadius = minDistanceToFloatingEntity - padding;
            const avatarSize = maxSafeAvatarRadius < baseAvatarRadius
              ? Math.max(maxSafeAvatarRadius * 2, isTablet ? 140 : 80)
              : baseAvatarSize;
            const avatarCenterX = SCREEN_WIDTH / 2;
            const avatarCenterY = SCREEN_HEIGHT / 2 + 60; // Lower the main circle by 60px
            
            return (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: avatarCenterX - avatarSize / 2,
                    top: avatarCenterY - avatarSize / 2,
                    width: avatarSize,
                    height: avatarSize,
                    zIndex: 100,
                  },
                  avatarPulseStyle,
                ]}
              >
                <Pressable
                  onPress={() => {
                    // Trigger pulse animation when avatar is pressed
                    // Cancel any ongoing animation and reset to 1 first
                    cancelAnimation(avatarPulseScale);
                    avatarPulseScale.value = 1;
                    // Then start new pulse animation
                    avatarPulseScale.value = withSequence(
                      withSpring(1.15, {
                        damping: 8,
                        stiffness: 120,
                      }),
                      withSpring(1, {
                        damping: 10,
                        stiffness: 150,
                      })
                    );

                    // Toggle moment type selector when avatar is pressed
                    if (!isWheelSpinning.value) {
                      setShowMomentTypeSelector(!showMomentTypeSelector);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <OverallPercentageAvatar
                    percentage={overallSunnyPercentage}
                    colorScheme={colorScheme ?? 'dark'}
                    colors={colors}
                  />
                </Pressable>
              </Animated.View>
            );
          })()}

          {/* Spiraling Icons - appears during wheel spin */}
          <SpiralingStars
            avatarCenterX={wheelCenterX}
            avatarCenterY={wheelCenterY}
            isSpinning={isWheelSpinning}
            colorScheme={colorScheme ?? 'dark'}
            momentType={selectedMomentType}
          />

          {/* Five Spheres - wrapped in rotatable container */}
          {animationsReady && (
            <View
              {...panResponder.panHandlers}
              style={{
                position: 'absolute',
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
                  colorScheme={colorScheme ?? 'dark'}
                  colors={colors}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere('relationships');
                    }
                  }}
                  sunnyPercentage={relationshipsSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={profiles.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
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
                  colorScheme={colorScheme ?? 'dark'}
                  colors={colors}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere('career');
                    }
                  }}
                  sunnyPercentage={careerSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={jobs.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
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
                  colorScheme={colorScheme ?? 'dark'}
                  colors={colors}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere('family');
                    }
                  }}
                  sunnyPercentage={familySunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={familyMembers.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
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
                  colorScheme={colorScheme ?? 'dark'}
                  colors={colors}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere('friends');
                    }
                  }}
                  sunnyPercentage={friendsSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={friends.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
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
                  colorScheme={colorScheme ?? 'dark'}
                  colors={colors}
                  onPress={() => {
                    if (!isWheelSpinning.value && !showMomentTypeSelector) {
                      setFocusedMemory(null);
                      setFocusedProfileId(null);
                      setFocusedJobId(null);
                      setFocusedFamilyMemberId(null);
                      setFocusedFriendId(null);
                      setFocusedHobbyId(null);
                      setAnimationsComplete(false);
                      setSelectedSphere('hobbies');
                    }
                  }}
                  sunnyPercentage={hobbiesSunnyPercentage}
                  selectedSphere={selectedSphere}
                  zoomProgress={sphereZoomProgress}
                  disabled={hobbies.length === 0 || showMomentTypeSelector}
                  isWrapped={true}
                />
              </RotatableSphereWrapper>
            </View>
          )}

          {/* Floating entities - these should also rotate with the wheel */}
          {animationsReady && (
            <>
              {/* Floating Partners around Relationships Sphere */}
              {sortedProfiles.slice(0, Math.min(sortedProfiles.length, 5)).map((profile, index) => {
                const totalPartners = Math.min(sortedProfiles.length, 5);
                const entityAngle = (index * 2 * Math.PI) / totalPartners; // Angle relative to sphere
                const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByProfileId(profile.id);
                
                // Calculate static position for initial render (FloatingEntity needs it)
                const x = spherePositions.relationships.x + Math.cos(entityAngle) * entityRadius;
                const y = spherePositions.relationships.y + Math.sin(entityAngle) * entityRadius;
                
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
                    colorScheme={colorScheme ?? 'dark'}
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
              {sortedJobs.slice(0, Math.min(sortedJobs.length, 5)).map((job, index) => {
                const totalJobs = Math.min(sortedJobs.length, 5);
                const entityAngle = (index * 2 * Math.PI) / totalJobs; // Angle relative to sphere
                const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
                
                // Calculate static position for initial render (FloatingEntity needs it)
                const x = spherePositions.career.x + Math.cos(entityAngle) * entityRadius;
                const y = spherePositions.career.y + Math.sin(entityAngle) * entityRadius;
                
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
                    colorScheme={colorScheme ?? 'dark'}
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
              {familyMembers.slice(0, Math.min(familyMembers.length, 5)).map((member, index) => {
                const totalMembers = Math.min(familyMembers.length, 5);
                const entityAngle = (index * 2 * Math.PI) / totalMembers; // Angle relative to sphere
                const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(member.id, 'family');
                
                // Calculate static position for initial render (FloatingEntity needs it)
                const x = spherePositions.family.x + Math.cos(entityAngle) * entityRadius;
                const y = spherePositions.family.y + Math.sin(entityAngle) * entityRadius;
                
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
                    colorScheme={colorScheme ?? 'dark'}
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
              {friends.slice(0, Math.min(friends.length, 5)).map((friend, index) => {
                const totalFriends = Math.min(friends.length, 5);
                const entityAngle = (index * 2 * Math.PI) / totalFriends; // Angle relative to sphere
                const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
                
                // Calculate static position for initial render (FloatingEntity needs it)
                const x = spherePositions.friends.x + Math.cos(entityAngle) * entityRadius;
                const y = spherePositions.friends.y + Math.sin(entityAngle) * entityRadius;
                
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
                    colorScheme={colorScheme ?? 'dark'}
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
              {hobbies.slice(0, Math.min(hobbies.length, 5)).map((hobby, index) => {
                const totalHobbies = Math.min(hobbies.length, 5);
                const entityAngle = (index * 2 * Math.PI) / totalHobbies; // Angle relative to sphere
                const entityRadius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
                
                // Calculate static position for initial render (FloatingEntity needs it)
                const x = spherePositions.hobbies.x + Math.cos(entityAngle) * entityRadius;
                const y = spherePositions.hobbies.y + Math.sin(entityAngle) * entityRadius;
                
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
                    colorScheme={colorScheme ?? 'dark'}
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

          {/* Floating moment icons - show around entities when moment type selector is visible */}
          {animationsReady && showMomentTypeSelector && (() => {
            const momentIconRadius = isTablet ? 28 : 20; // Distance from entity center
            const icons: React.ReactElement[] = [];

            // For each relationships entity
            sortedProfiles.slice(0, Math.min(sortedProfiles.length, 5)).forEach((profile, entityIndex) => {
              const totalPartners = Math.min(sortedProfiles.length, 5);
              const entityAngle = (entityIndex * 2 * Math.PI) / totalPartners;
              const momentCounts = getAllMomentCountsForEntity(profile.id, 'relationships');

              // Create array of all moment types with their counts
              const momentTypes: { type: MomentType; count: number }[] = ([
                { type: 'lessons' as MomentType, count: momentCounts.lessons },
                { type: 'hardTruths' as MomentType, count: momentCounts.hardTruths },
                { type: 'sunnyMoments' as MomentType, count: momentCounts.sunnyMoments },
              ] as { type: MomentType; count: number }[]).filter(m => m.count > 0);

              const totalMomentIcons = Math.min(
                momentTypes.reduce((sum, m) => sum + Math.min(m.count, 1), 0), // Max 1 icon per type
                3 // Max 3 icons total per entity
              );

              // Create icons around this entity for each moment type
              let iconIndex = 0;
              momentTypes.slice(0, 3).forEach((momentTypeData) => {
                const iconAngle = (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3); // Distribute evenly
                const x = spherePositions.relationships.x + Math.cos(entityAngle) * (isTablet ? 85 : 55) + Math.cos(iconAngle) * momentIconRadius;
                const y = spherePositions.relationships.y + Math.sin(entityAngle) * (isTablet ? 85 : 55) + Math.sin(iconAngle) * momentIconRadius;

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
                      colorScheme={colorScheme ?? 'dark'}
                      index={iconIndex}
                      total={totalMomentIcons}
                      isWrapped={true}
                      selectedMomentType={selectedMomentType}
                    />
                  </RotatableFloatingMomentIconWrapper>
                );
                iconIndex++;
              });
            });

            // For each career entity
            sortedJobs.slice(0, Math.min(sortedJobs.length, 5)).forEach((job, entityIndex) => {
              const totalJobs = Math.min(sortedJobs.length, 5);
              const entityAngle = (entityIndex * 2 * Math.PI) / totalJobs;
              const momentCounts = getAllMomentCountsForEntity(job.id, 'career');

              // Create array of all moment types with their counts
              const momentTypes: { type: MomentType; count: number }[] = ([
                { type: 'lessons' as MomentType, count: momentCounts.lessons },
                { type: 'hardTruths' as MomentType, count: momentCounts.hardTruths },
                { type: 'sunnyMoments' as MomentType, count: momentCounts.sunnyMoments },
              ] as { type: MomentType; count: number }[]).filter(m => m.count > 0);

              const totalMomentIcons = Math.min(
                momentTypes.reduce((sum, m) => sum + Math.min(m.count, 1), 0),
                3
              );

              // Create icons around this entity for each moment type
              let iconIndex = 0;
              momentTypes.slice(0, 3).forEach((momentTypeData) => {
                const iconAngle = (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                const x = spherePositions.career.x + Math.cos(entityAngle) * (isTablet ? 85 : 55) + Math.cos(iconAngle) * momentIconRadius;
                const y = spherePositions.career.y + Math.sin(entityAngle) * (isTablet ? 85 : 55) + Math.sin(iconAngle) * momentIconRadius;

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
                      colorScheme={colorScheme ?? 'dark'}
                      index={iconIndex}
                      total={totalMomentIcons}
                      isWrapped={true}
                      selectedMomentType={selectedMomentType}
                    />
                  </RotatableFloatingMomentIconWrapper>
                );
                iconIndex++;
              });
            });

            // For each family entity
            familyMembers.slice(0, Math.min(familyMembers.length, 5)).forEach((member, entityIndex) => {
              const totalMembers = Math.min(familyMembers.length, 5);
              const entityAngle = (entityIndex * 2 * Math.PI) / totalMembers;
              const momentCounts = getAllMomentCountsForEntity(member.id, 'family');

              // Create array of all moment types with their counts
              const momentTypes: { type: MomentType; count: number }[] = ([
                { type: 'lessons' as MomentType, count: momentCounts.lessons },
                { type: 'hardTruths' as MomentType, count: momentCounts.hardTruths },
                { type: 'sunnyMoments' as MomentType, count: momentCounts.sunnyMoments },
              ] as { type: MomentType; count: number }[]).filter(m => m.count > 0);

              const totalMomentIcons = Math.min(
                momentTypes.reduce((sum, m) => sum + Math.min(m.count, 1), 0),
                3
              );

              // Create icons around this entity for each moment type
              let iconIndex = 0;
              momentTypes.slice(0, 3).forEach((momentTypeData) => {
                const iconAngle = (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                const x = spherePositions.family.x + Math.cos(entityAngle) * (isTablet ? 85 : 55) + Math.cos(iconAngle) * momentIconRadius;
                const y = spherePositions.family.y + Math.sin(entityAngle) * (isTablet ? 85 : 55) + Math.sin(iconAngle) * momentIconRadius;

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
                      colorScheme={colorScheme ?? 'dark'}
                      index={iconIndex}
                      total={totalMomentIcons}
                      isWrapped={true}
                      selectedMomentType={selectedMomentType}
                    />
                  </RotatableFloatingMomentIconWrapper>
                );
                iconIndex++;
              });
            });

            // For each friend entity
            friends.slice(0, Math.min(friends.length, 5)).forEach((friend, entityIndex) => {
              const totalFriends = Math.min(friends.length, 5);
              const entityAngle = (entityIndex * 2 * Math.PI) / totalFriends;
              const momentCounts = getAllMomentCountsForEntity(friend.id, 'friends');

              // Create array of all moment types with their counts
              const momentTypes: { type: MomentType; count: number }[] = ([
                { type: 'lessons' as MomentType, count: momentCounts.lessons },
                { type: 'hardTruths' as MomentType, count: momentCounts.hardTruths },
                { type: 'sunnyMoments' as MomentType, count: momentCounts.sunnyMoments },
              ] as { type: MomentType; count: number }[]).filter(m => m.count > 0);

              const totalMomentIcons = Math.min(
                momentTypes.reduce((sum, m) => sum + Math.min(m.count, 1), 0),
                3
              );

              // Create icons around this entity for each moment type
              let iconIndex = 0;
              momentTypes.slice(0, 3).forEach((momentTypeData) => {
                const iconAngle = (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                const x = spherePositions.friends.x + Math.cos(entityAngle) * (isTablet ? 85 : 55) + Math.cos(iconAngle) * momentIconRadius;
                const y = spherePositions.friends.y + Math.sin(entityAngle) * (isTablet ? 85 : 55) + Math.sin(iconAngle) * momentIconRadius;

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
                      colorScheme={colorScheme ?? 'dark'}
                      index={iconIndex}
                      total={totalMomentIcons}
                      isWrapped={true}
                      selectedMomentType={selectedMomentType}
                    />
                  </RotatableFloatingMomentIconWrapper>
                );
                iconIndex++;
              });
            });

            // For each hobby entity
            hobbies.slice(0, Math.min(hobbies.length, 5)).forEach((hobby, entityIndex) => {
              const totalHobbies = Math.min(hobbies.length, 5);
              const entityAngle = (entityIndex * 2 * Math.PI) / totalHobbies;
              const momentCounts = getAllMomentCountsForEntity(hobby.id, 'hobbies');

              // Create array of all moment types with their counts
              const momentTypes: { type: MomentType; count: number }[] = ([
                { type: 'lessons' as MomentType, count: momentCounts.lessons },
                { type: 'hardTruths' as MomentType, count: momentCounts.hardTruths },
                { type: 'sunnyMoments' as MomentType, count: momentCounts.sunnyMoments },
              ] as { type: MomentType; count: number }[]).filter(m => m.count > 0);

              const totalMomentIcons = Math.min(
                momentTypes.reduce((sum, m) => sum + Math.min(m.count, 1), 0),
                3
              );

              // Create icons around this entity for each moment type
              let iconIndex = 0;
              momentTypes.slice(0, 3).forEach((momentTypeData) => {
                const iconAngle = (iconIndex * 2 * Math.PI) / Math.max(totalMomentIcons, 3);
                const x = spherePositions.hobbies.x + Math.cos(entityAngle) * (isTablet ? 85 : 55) + Math.cos(iconAngle) * momentIconRadius;
                const y = spherePositions.hobbies.y + Math.sin(entityAngle) * (isTablet ? 85 : 55) + Math.sin(iconAngle) * momentIconRadius;

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
                      colorScheme={colorScheme ?? 'dark'}
                      index={iconIndex}
                      total={totalMomentIcons}
                      isWrapped={true}
                      selectedMomentType={selectedMomentType}
                    />
                  </RotatableFloatingMomentIconWrapper>
                );
                iconIndex++;
              });
            });

            return <>{icons}</>;
          })()}

          {/* Pulsing Floating Moments - Randomly spawn around center avatar during moment type selection */}
          {animationsReady && showMomentTypeSelector && randomMoments.map((moment) => (
            <PulsingFloatingMomentIcon
              key={`pulsing-moment-${moment.id}`}
              centerX={sphereCircle.centerX}
              centerY={sphereCircle.centerY}
              angle={moment.angle}
              radius={moment.radius}
              momentType={moment.momentType}
              colorScheme={colorScheme ?? 'dark'}
              onComplete={() => handleMomentComplete(moment.id)}
              selectedMomentType={selectedMomentType}
              shouldGrowToFull={moment.shouldGrowToFull}
              text={moment.text}
            />
          ))}

          {/* Grow All Moments At Once - When all moments of a type have been shown */}
          {animationsReady && showMomentTypeSelector && growAllMomentsType && !isSpinning && !selectedLesson && (() => {
            const avatarSize = isTablet ? 180 : 140;
            const avatarRadius = avatarSize / 2;
            const momentRadius = avatarRadius + (isTablet ? 120 : 80);

            // Get all moments of this type to show actual moment data
            const allMomentsOfType = getAllMomentsByType(growAllMomentsType);
            const totalCount = Math.min(allMomentsOfType.length, 12); // Limit to 12 for visual clarity

            // Create moments evenly distributed around the circle with actual moment data
            return allMomentsOfType.slice(0, totalCount).map((momentData, index) => {
              const angle = (index * 2 * Math.PI) / totalCount;
              const radiusVariation = (Math.random() - 0.5) * (isTablet ? 20 : 15);
              const radius = momentRadius + radiusVariation;

              return (
                <PulsingFloatingMomentIcon
                  key={`grow-all-${growAllMomentsType}-${index}`}
                  centerX={sphereCircle.centerX}
                  centerY={sphereCircle.centerY}
                  angle={angle}
                  radius={radius}
                  momentType={growAllMomentsType}
                  colorScheme={colorScheme ?? 'dark'}
                  selectedMomentType={growAllMomentsType}
                  shouldGrowToFull={true}
                  text={momentData?.text || ''}
                  delay={index * 50} // Stagger slightly for visual effect
                />
              );
            });
          })()}

          {/* Moment Type Selector Label - Below the wheel */}
          {animationsReady && showMomentTypeSelector && !momentTypeSelectorDismissed && (() => {
            // Calculate position below the wheel
            const wheelCenterY = SCREEN_HEIGHT / 2 + 60;
            const avatarSize = isTablet ? 180 : 140;
            const avatarRadius = avatarSize / 2;

            // Position below the wheel: wheel center + avatar radius + spacing
            const topPosition = wheelCenterY + avatarRadius + 60;

            return (
              <View style={{
                position: 'absolute',
                top: topPosition,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 200,
              }}>
                {/* "Spin the wheel" text with dismiss button */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                  <ThemedText size="sm" weight="bold" style={{
                    opacity: 0.7,
                    textAlign: 'center',
                  }}>
                    {t('wheel.spinForRandom')}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      setMomentTypeSelectorDismissed(true);
                    }}
                    hitSlop={CLOSE_BUTTON_HITSLOP}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons
                      name="close"
                      size={16}
                      color={colors.text}
                      style={{ opacity: 0.7 }}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })()}

          {/* Moment Type Selector Icon Buttons - Fixed position, animated scale */}
          {animationsReady && showMomentTypeSelector && (() => {
            // Calculate fixed position below the wheel
            const wheelCenterY = SCREEN_HEIGHT / 2 + 60;
            const avatarSize = isTablet ? 180 : 140;
            const avatarRadius = avatarSize / 2;

            // Position buttons at fixed distance from bottom of screen
            const bottomGap = 20; // Fixed gap from bottom

            return (
              <Animated.View style={[{
                position: 'absolute',
                bottom: bottomGap,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 200,
              }, iconButtonAnimatedStyle]}>
                {/* Icon buttons row */}
                <View style={{
                  flexDirection: 'row',
                  gap: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {/* Lessons button - Liquid Glass Effect */}
                <Animated.View style={[lessonsButtonAnimatedStyle, { opacity: isSpinning ? 0.3 : 1 }]}>
                  {/* Frosted glass base layer */}
                  <View style={StyleSheet.absoluteFillObject}>
                    <LinearGradient
                      colors={[
                        'rgba(255, 255, 255, 0.15)',
                        'rgba(255, 255, 255, 0.05)',
                        'rgba(255, 255, 255, 0.1)'
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>

                  <Pressable
                    onPress={() => setSelectedMomentType('lessons')}
                    onPressIn={handleLessonsButtonPressIn}
                    onPressOut={handleLessonsButtonPressOut}
                    disabled={isSpinning}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSpinning ? 0 : (selectedMomentType === 'lessons' ? 0.3 : 0.1),
                      shadowRadius: 4,
                      elevation: isSpinning ? 0 : (selectedMomentType === 'lessons' ? 5 : 2),
                    }}
                  >
                    <MaterialIcons
                      name="emoji-objects"
                      size={28}
                      color={isSpinning ? 'rgba(150, 150, 150, 0.5)' : (selectedMomentType === 'lessons' ? '#fff' : colors.text)}
                    />
                  </Pressable>
                </Animated.View>

                {/* Sunny moments button - Liquid Glass Effect */}
                <Animated.View style={[sunnyMomentsButtonAnimatedStyle, { opacity: isSpinning ? 0.3 : 1 }]}>
                  {/* Frosted glass base layer */}
                  <View style={StyleSheet.absoluteFillObject}>
                    <LinearGradient
                      colors={[
                        'rgba(255, 255, 255, 0.15)',
                        'rgba(255, 255, 255, 0.05)',
                        'rgba(255, 255, 255, 0.1)'
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>

                  <Pressable
                    onPress={() => setSelectedMomentType('sunnyMoments')}
                    onPressIn={handleSunnyMomentsButtonPressIn}
                    onPressOut={handleSunnyMomentsButtonPressOut}
                    disabled={isSpinning}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSpinning ? 0 : (selectedMomentType === 'sunnyMoments' ? 0.3 : 0.1),
                      shadowRadius: 4,
                      elevation: isSpinning ? 0 : (selectedMomentType === 'sunnyMoments' ? 5 : 2),
                    }}
                  >
                    <MaterialIcons
                      name="wb-sunny"
                      size={28}
                      color={isSpinning ? 'rgba(150, 150, 150, 0.5)' : (selectedMomentType === 'sunnyMoments' ? '#fff' : colors.text)}
                    />
                  </Pressable>
                </Animated.View>

                {/* Hard truths button - Liquid Glass Effect */}
                <Animated.View style={[hardTruthsButtonAnimatedStyle, { opacity: isSpinning ? 0.3 : 1 }]}>
                  {/* Frosted glass base layer */}
                  <View style={StyleSheet.absoluteFillObject}>
                    <LinearGradient
                      colors={[
                        'rgba(255, 255, 255, 0.15)',
                        'rgba(255, 255, 255, 0.05)',
                        'rgba(255, 255, 255, 0.1)'
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>

                  <Pressable
                    onPress={() => setSelectedMomentType('hardTruths')}
                    onPressIn={handleHardTruthsButtonPressIn}
                    onPressOut={handleHardTruthsButtonPressOut}
                    disabled={isSpinning}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSpinning ? 0 : (selectedMomentType === 'hardTruths' ? 0.3 : 0.1),
                      shadowRadius: 4,
                      elevation: isSpinning ? 0 : (selectedMomentType === 'hardTruths' ? 5 : 2),
                    }}
                  >
                    <MaterialIcons
                      name="cloud-queue"
                      size={28}
                      color={isSpinning ? 'rgba(150, 150, 150, 0.5)' : (selectedMomentType === 'hardTruths' ? '#fff' : colors.text)}
                    />
                  </Pressable>
                </Animated.View>
              </View>
            </Animated.View>
            );
          })()}
        </View>

      {/* Onboarding Stepper */}
      <OnboardingStepper
        visible={walkthroughVisible}
        onDismiss={handleWalkthroughDismiss}
        onDemo={handleOnboardingDemo}
      />
    </TabScreenContainer>
  );
}

  // When a sphere is focused, show entities for that sphere
  // For relationships: show year sections with partners (the original home view)
  // For career: show jobs
  if (selectedSphere === 'relationships') {
    // Show the original year sections view with partners
    // Use the existing sortedProfiles and year sections logic
  return (
    <TabScreenContainer>
      <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens - full screen coverage */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={avatarCenterX}
            avatarCenterY={avatarCenterY}
            colorScheme={colorScheme ?? 'dark'}
            fullScreen={true}
          />
          
          {/* Back button to return to sphere view */}
          <Pressable
            onPress={() => {
              // Check if we came from a detail view (insights)
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;
              
              if (returnTo && returnToId) {
                // Navigate back to the detail view - use back() since detail view is in history
                router.back();
                return;
              }
              
              // Default behavior - unfocus memory/profile
              if (focusedMemory) {
                // If memory is focused, unfocus the memory and ensure profile is focused
                // This returns to the focused profile view with memories floating around
                setFocusedMemory(null);
                // Ensure the profile is focused so we return to focused profile view
                if (focusedMemory.profileId) {
                if (!focusedProfileId || focusedProfileId !== focusedMemory.profileId) {
                  setFocusedProfileId(focusedMemory.profileId);
                }
                }
              } else if (focusedProfileId) {
                // If only profile is focused, unfocus it (this will bring back other profiles)
                setFocusedProfileId(null);
                setFocusedMemory(null); // Clear any stale memory state
              } else {
                // No focus, return to sphere selection
                setFocusedMemory(null); // Clear any stale memory state
                setFocusedProfileId(null); // Clear any stale profile focus
                setFocusedJobId(null); // Clear any stale job focus
                setSelectedSphere(null);
              }
            }}
            style={{
              position: 'absolute',
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons name="arrow-back" size={isTablet ? 36 : 24} color={colors.text} />
          </Pressable>
          
          {/* Year title below back arrow - shown when partner/job is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let yearTitle: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Get year for focused entity
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              if (job?.startDate) {
                const year = new Date(job.startDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              if (profile?.relationshipStartDate) {
                const year = new Date(profile.relationshipStartDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            
            if (yearTitle) {
              return (
                <ThemedText
                  size="l"
                  weight="bold"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Below back arrow
                    left: 20, // Align with back arrow
                    zIndex: 1000,
                    color: colors.text,
                    opacity: 0.6,
                  }}
                >
                  {yearTitle}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity name below back arrow - shown when partner/job/friend/family/hobby is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Include jobs (career sphere) - show name below back arrow for all entities
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            if (entityName) {
              return (
                <ThemedText
                  size="l"
                  weight="medium"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Lower the name further
                    right: 20,
                    zIndex: 1000,
                    color: colors.text,
                    maxWidth: SCREEN_WIDTH - 100, // Leave space for left side content
                    textAlign: 'right',
                  }}
                >
                  {entityName}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity or sphere name header - shown when sphere is selected and no memory is focused */}
          {!focusedMemory && selectedSphere && (() => {
            // Check if an entity is focused and get its name
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere; // Use type assertion to avoid type narrowing issues
            
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            // Only show sphere name when no entity is focused - entity name is shown below Текуща
            // Don't show entity name here to avoid duplication
            if (entityName) {
              return null; // Hide when entity is focused - title is shown below Текуща
            }
            
            const displayText = t(`spheres.${sphere}`);
            
            return (
              <ThemedText
                size={isTablet ? "xl" : "l"}
                weight="semibold"
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  top: 82,
                  right: 20,
                  zIndex: 1000,
                  color: colors.text,
                  textAlign: 'right',
                }}
              >
                {displayText}
              </ThemedText>
            );
          })()}
          
          {/* Memory title header - shown when memory is focused */}
          {focusedMemory && (() => {
            const entityId = focusedMemory.profileId || focusedMemory.jobId;
            const sphere = focusedMemory.sphere;
            if (!entityId) return null;
            
            const memories = sphere === 'relationships' && focusedMemory.profileId
              ? getIdealizedMemoriesByProfileId(focusedMemory.profileId)
              : getIdealizedMemoriesByEntityId(entityId, sphere);
            
            const memoryData = memories.find(m => m.id === focusedMemory.memoryId);
            if (!memoryData) return null;
            
            return (
              <View
                style={{
                  position: 'absolute',
                  top: 70,
                  left: 80,
                  right: 20,
                  zIndex: 1000,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  size="l"
                  weight="semibold"
                  numberOfLines={2}
                  style={{
                    color: colors.text,
                    textAlign: 'center',
                  }}
                >
                  {memoryData.title || 'Memory'}
                </ThemedText>
              </View>
            );
          })()}

          <ScrollView
            scrollEnabled={!isAnyEntityWheelActive}
            style={[
              styles.content,
              {
                flex: 1,
              },
            ]}
            contentContainerStyle={{
              minHeight: SCREEN_HEIGHT,
              paddingBottom: 100, // Extra padding at bottom for scrolling
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Render year sections with profiles inside - hidden when focused */}
            {(() => {
              // CRITICAL: Only use focusedMemory if it's from relationships sphere
              const relevantFocusedMemory = getFocusedMemoryForSphere('relationships');
              // Allow year sections to render when no profile is focused (even if one was just unfocused)
              // The ProfileRenderer will hide the specific profile that was just unfocused
              const shouldRender = animationsReady && !focusedProfileId && !relevantFocusedMemory && sortedProfiles.length > 0 && profilesBySection.size > 0;
              const totalProfilesInSections = Array.from(profilesBySection.values()).flat().length;
              
              if (shouldRender) {
                const renderKey = `year-sections-relationships-${selectedSphere}-${sortedProfiles.length}-${sphereRenderKeyRef.current}`;
                return (
                  <YearSectionsRenderer
                    key={renderKey}
                    yearSections={yearSections}
                    profilesBySection={profilesBySection}
                    colorScheme={colorScheme ?? 'dark'}
                    getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
                    getAvatarPosition={getAvatarPosition}
                    focusedProfileId={focusedProfileId}
                    focusedMemory={relevantFocusedMemory}
                    previousFocusedId={previousFocusedIdRef.current}
                    slideOffset={slideOffset}
                    getProfileYearSection={getProfileYearSection}
                    updateAvatarPosition={updateAvatarPosition}
                    setFocusedProfileId={setFocusedProfileId}
                    setFocusedMemory={setFocusedMemory}
                    colors={colors}
                    memorySlideOffset={memorySlideOffset}
                    animationsComplete={animationsComplete}
                  />
                );
              }
              return null;
            })()}
            
            {/* Render focused profiles separately when focused (but hide profile when memory is focused) */}
            {focusedProfilesRender}
            
            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? 'dark'}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </ScrollView>
        </View>
      </TabScreenContainer>
    );
  }

  // For career sphere, show jobs in year sections (similar to relationships)
  if (selectedSphere === 'career') {
    return (
      <TabScreenContainer>
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={avatarCenterX}
            avatarCenterY={avatarCenterY}
            colorScheme={colorScheme ?? 'dark'}
          />
          
          {/* Back button to return to sphere view */}
          <Pressable
            onPress={() => {
              // Check if we came from a detail view (insights)
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;
              
              if (returnTo && returnToId) {
                // Navigate back to the detail view - use back() since detail view is in history
                router.back();
                return;
              }
              
              // Default behavior - unfocus memory/job
              if (focusedMemory) {
                // If memory is focused, unfocus the memory and ensure job is focused
                // This returns to the focused job view with memories floating around
                setFocusedMemory(null);
                // Ensure the job is focused so we return to focused job view
                if (!focusedJobId || (focusedMemory.jobId && focusedJobId !== focusedMemory.jobId)) {
                  setFocusedJobId(focusedMemory.jobId || null);
                }
              } else if (focusedJobId) {
                // If only job is focused, unfocus it (this will bring back other jobs)
                setFocusedJobId(null);
              } else {
                // No focus, return to sphere selection
                setSelectedSphere(null);
              }
            }}
            style={{
              position: 'absolute',
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons name="arrow-back" size={isTablet ? 36 : 24} color={colors.text} />
          </Pressable>
          
          {/* Year title below back arrow - shown when partner/job is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let yearTitle: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Get year for focused entity
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              if (job?.startDate) {
                const year = new Date(job.startDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              if (profile?.relationshipStartDate) {
                const year = new Date(profile.relationshipStartDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            
            if (yearTitle) {
              return (
                <ThemedText
                  size="l"
                  weight="bold"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Below back arrow
                    left: 20, // Align with back arrow
                    zIndex: 1000,
                    color: colors.text,
                    opacity: 0.6,
                  }}
                >
                  {yearTitle}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity name below back arrow - shown when partner/job/friend/family/hobby is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Include jobs (career sphere) - show name below back arrow for all entities
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            if (entityName) {
              return (
                <ThemedText
                  size="l"
                  weight="medium"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Lower the name further
                    right: 20,
                    zIndex: 1000,
                    color: colors.text,
                    maxWidth: SCREEN_WIDTH - 100, // Leave space for left side content
                    textAlign: 'right',
                  }}
                >
                  {entityName}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity or sphere name header - shown when sphere is selected and no memory is focused */}
          {!focusedMemory && selectedSphere && (() => {
            // Check if an entity is focused and get its name
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere; // Use type assertion to avoid type narrowing issues
            
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            // Only show sphere name when no entity is focused - entity name is shown below Текуща
            // Don't show entity name here to avoid duplication
            if (entityName) {
              return null; // Hide when entity is focused - title is shown below Текуща
            }
            
            const displayText = t(`spheres.${sphere}`);
            
            return (
              <ThemedText
                size={isTablet ? "xl" : "l"}
                weight="semibold"
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  top: 82,
                  right: 20,
                  zIndex: 1000,
                  color: colors.text,
                  textAlign: 'right',
                }}
              >
                {displayText}
              </ThemedText>
            );
          })()}
          
          {/* Memory title header - shown when memory is focused */}
          {focusedMemory && (() => {
            const entityId = focusedMemory.profileId || focusedMemory.jobId;
            const sphere = focusedMemory.sphere;
            if (!entityId) return null;
            
            const memories = sphere === 'relationships' && focusedMemory.profileId
              ? getIdealizedMemoriesByProfileId(focusedMemory.profileId)
              : getIdealizedMemoriesByEntityId(entityId, sphere);
            
            const memoryData = memories.find(m => m.id === focusedMemory.memoryId);
            if (!memoryData) return null;
            
            return (
              <View
                style={{
                  position: 'absolute',
                  top: 70,
                  left: 80,
                  right: 20,
                  zIndex: 1000,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  size="l"
                  weight="semibold"
                  numberOfLines={2}
                  style={{
                    color: colors.text,
                    textAlign: 'center',
                  }}
                >
                  {memoryData.title || 'Memory'}
                </ThemedText>
              </View>
            );
          })()}

          <ScrollView
            scrollEnabled={!isAnyEntityWheelActive}
            style={[
              styles.content,
              {
                flex: 1,
              },
            ]}
            contentContainerStyle={{
              minHeight: SCREEN_HEIGHT,
              paddingBottom: 100, // Extra padding at bottom for scrolling
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Render year sections with jobs inside */}
            {animationsReady && !focusedJobId && !focusedMemory && (
              <>
                {/* Year titles below back arrow - shown for each year section in listing view */}
                {!focusedJobId && Array.from(jobYearSections.entries()).map(([key, section]) => {
                  const displayYear = typeof section.year === 'string' 
                    ? (section.year === 'Ongoing' ? t('profile.ongoing') : section.year === 'Current' ? t('job.current') : section.year)
                    : section.year;
                  
                  // Position year title below back arrow, aligned with section top
                  const backArrowBottom = (isTablet ? 70 : 50) + (isTablet ? 70 : 50);
                  const yearTitleTop = section.top < backArrowBottom + 10 
                    ? backArrowBottom + 10  // Position below back arrow
                    : section.top + 8; // Position at section top if section is far below
                  
                  return (
                    <ThemedText
                      key={`job-year-title-${key}`}
                      size="l"
                      weight="bold"
                      numberOfLines={1}
                      style={{
                        position: 'absolute',
                        top: yearTitleTop,
                        left: 20, // Align with back arrow
                        zIndex: 1000,
                        color: colors.text,
                        opacity: 0.6,
                      }}
                    >
                      {displayYear}
                    </ThemedText>
                  );
                })}
                
                {/* Year section backgrounds */}
                {Array.from(jobYearSections.entries()).map(([key, section]) => {
                  // Get the name of the job(s) in this year section
                  const jobsInSection = jobsBySection.get(key);
                  const sectionJobName = jobsInSection && jobsInSection.length > 0 
                    ? jobsInSection[0].job.name 
                    : null;
                  // Check if this section contains the focused job
                  const isFocusedSection = jobsInSection?.some(({ job }) => job.id === focusedJobId) ?? false;
                  // Hide title if memory is focused OR if a job is focused (but show it if this is the focused job's section)
                  // Don't show focusedEntityName in year section - it's now shown below back arrow
                  const shouldHideTitle = !!focusedMemory || (!!focusedJobId && !isFocusedSection);
                  
                  return (
                    <YearSectionBackground
                      key={`job-year-section-bg-${key}`}
                      section={section}
                      colorScheme={colorScheme ?? 'dark'}
                      hideTitle={shouldHideTitle}
                      focusedEntityName={null} // Don't show entity name in year section - it's shown below back arrow
                    />
                  );
                })}
                
                {/* Render jobs in their year sections */}
                {Array.from(jobsBySection.entries()).map(([sectionKey, jobsData]) => {
                  const section = jobYearSections.get(sectionKey);
                  if (!section) {
                    return null;
                  }
                  
                  // Sort jobs within the section: ongoing first, then by index (most recent first)
                  const sortedJobsInSection = [...jobsData].sort((a, b) => {
                    // First, ensure ongoing items come first
                    const aIsOngoing = a.job.endDate === null || a.job.endDate === undefined || a.job.endDate === '';
                    const bIsOngoing = b.job.endDate === null || b.job.endDate === undefined || b.job.endDate === '';
                    
                    if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
                    if (!aIsOngoing && bIsOngoing) return 1;  // b is ongoing, a is not - b comes first
                    
                    // Both are ongoing or both are ended - sort by index (most recent first)
                    return a.index - b.index;
                  });
                  
                  return sortedJobsInSection.map(({ job, index: jobIndexInSorted }, jobIndexInSection) => {
                    const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
                    
                    // Distribute jobs vertically within the section (most recent on top)
                    // Each job gets a position based on its index in the section
                    const totalJobsInSection = sortedJobsInSection.length;
                    const sectionCenterY = section.top + section.height / 2;
                    const verticalSpacing = totalJobsInSection > 1 
                      ? Math.min(section.height / (totalJobsInSection + 1), 150) // Space between jobs
                      : 0;
                    
                    // Position jobs from top to bottom (most recent first), centered horizontally
                    // For jobs in year sections, center them horizontally (no random X offset)
                    // Only add small Y offset for multiple jobs to avoid perfect vertical alignment
                    const getJobOffset = (jobId: string, range: number) => {
                      let hash = 0;
                      for (let i = 0; i < jobId.length; i++) {
                        hash = ((hash << 5) - hash) + jobId.charCodeAt(i);
                        hash = hash & hash;
                      }
                      return ((hash % 1000) / 1000) * range;
                    };
                    const centerOffsetX = 0; // Always center horizontally in year sections
                    // For single jobs, place them exactly at center (no Y offset)
                    // For multiple jobs, add small random offset to avoid perfect alignment
                    const centerOffsetY = totalJobsInSection === 1
                      ? 0 // Exact center for single jobs
                      : getJobOffset(job.id + '_y', section.height * 0.1); // ±5% of section height for multiple jobs
                    const baseY = totalJobsInSection === 1
                      ? sectionCenterY
                      : section.top + verticalSpacing * (jobIndexInSection + 1);
                    
                    const position = {
                      x: SCREEN_WIDTH / 2 + centerOffsetX, // Always use screen center for X
                      y: baseY + centerOffsetY
                    };
                    
                    // Clamp to ensure avatar stays in central area
                    const centerAreaMinX = SCREEN_WIDTH * 0.2;
                    const centerAreaMaxX = SCREEN_WIDTH * 0.8;
                    position.x = Math.max(centerAreaMinX, Math.min(centerAreaMaxX, position.x));
                    position.y = Math.max(
                      section.top + 50,
                      Math.min(section.bottom - 50, position.y)
                    );
                    
                    const isFocused = focusedJobId === job.id;
                    const wasJustFocused = previousFocusedJobIdRef.current === job.id && !focusedJobId;
                    
                    // Hide unfocused jobs when a job is focused
                    // Also hide job that was just unfocused (it's being animated in focusedJobsRender)
                    if ((focusedJobId && !isFocused) || wasJustFocused) {
                      return null;
                    }
                    
                    // Calculate slide direction for slide-in animation
                    const centerX = SCREEN_WIDTH / 2;
                    const centerY = SCREEN_HEIGHT / 2;
                    const dx = position.x - centerX;
                    const dy = position.y - centerY;
                    const slideDirectionX = dx > 0 ? 1 : -1;
                    const slideDirectionY = dy > 0 ? 1 : -1;
                    
                    return (
                      <NonFocusedZone
                        key={`job-zone-${job.id}`}
                        isFocused={isFocused}
                        wasJustFocused={wasJustFocused}
                        slideOffset={careerSlideOffset}
                        slideDirectionX={slideDirectionX}
                        slideDirectionY={slideDirectionY}
                      >
                        <FloatingAvatar
                          key={`job-${job.id}`}
                          profile={job}
                          position={position}
                          memories={memories}
                          onPress={() => {
                            const newFocusedId = focusedJobId === job.id ? null : job.id;
                            setFocusedJobId(newFocusedId);
                            setFocusedMemory(null);
                          }}
                          colors={colors}
                          colorScheme={colorScheme ?? 'dark'}
                          isFocused={isFocused}
                          focusedMemory={(() => {
                            if (!focusedMemory) return null;
                            const mem = focusedMemory as { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere };
                            if (mem.jobId === job.id && mem.sphere === 'career') {
                              return mem;
                            }
                            return null;
                          })()}
                          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'career', momentId?: string) => {
                            setFocusedMemory({ jobId: entityId, memoryId, sphere, momentToShowId: momentId });
                          }}
                          yearSection={section}
                        />
                      </NonFocusedZone>
                    );
                  });
                })}
              </>
            )}
            
            {/* Render focused jobs separately when focused (but hide job when memory is focused) */}
            {focusedJobsRender}
            
            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? 'dark'}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </ScrollView>
        </View>
      </TabScreenContainer>
    );
  }

  // For family sphere, show family members in a simple list (no year sections)
  if (selectedSphere === 'family') {
    return (
      <TabScreenContainer>
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={focusedFamilyMemberId ? focusedFamilyMemberPositionX : avatarCenterX}
            avatarCenterY={focusedFamilyMemberId ? focusedFamilyMemberPositionY : avatarCenterY}
            colorScheme={colorScheme ?? 'dark'}
          />
          
          {/* Back button to return to sphere view */}
          <Pressable
            onPress={() => {
              // Check if we came from a detail view (insights)
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;
              
              if (returnTo && returnToId) {
                // Navigate back to the detail view - use back() since detail view is in history
                router.back();
                return;
              }
              
              if (focusedMemory) {
                // If memory is focused, unfocus the memory and ensure family member is focused
                // This returns to the focused family member view with memories floating around
                setFocusedMemory(null);
                // Ensure the family member is focused so we return to focused family member view
                if (!focusedFamilyMemberId || (focusedMemory.familyMemberId && focusedFamilyMemberId !== focusedMemory.familyMemberId)) {
                  setFocusedFamilyMemberId(focusedMemory.familyMemberId || null);
                }
              } else if (focusedFamilyMemberId) {
                // If only family member is focused, unfocus it (this will bring back other family members)
                setFocusedFamilyMemberId(null);
                setFocusedMemory(null); // Clear any stale memory state
              } else {
                // No focus, return to sphere selection
                setFocusedMemory(null); // Clear any stale memory state
                setFocusedProfileId(null); // Clear any stale profile focus
                setFocusedJobId(null); // Clear any stale job focus
                setFocusedFamilyMemberId(null); // Clear any stale family member focus
                setSelectedSphere(null);
              }
            }}
            style={{
              position: 'absolute',
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons name="arrow-back" size={isTablet ? 36 : 24} color={colors.text} />
          </Pressable>
          
          {/* Year title below back arrow - shown when partner/job is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let yearTitle: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Get year for focused entity
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              if (job?.startDate) {
                const year = new Date(job.startDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              if (profile?.relationshipStartDate) {
                const year = new Date(profile.relationshipStartDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            
            if (yearTitle) {
              return (
                <ThemedText
                  size="l"
                  weight="bold"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Below back arrow
                    left: 20, // Align with back arrow
                    zIndex: 1000,
                    color: colors.text,
                    opacity: 0.6,
                  }}
                >
                  {yearTitle}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity name below back arrow - shown when partner/job/friend/family/hobby is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Include jobs (career sphere) - show name below back arrow for all entities
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            if (entityName) {
              return (
                <ThemedText
                  size="l"
                  weight="medium"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Lower the name further
                    right: 20,
                    zIndex: 1000,
                    color: colors.text,
                    maxWidth: SCREEN_WIDTH - 100, // Leave space for left side content
                    textAlign: 'right',
                  }}
                >
                  {entityName}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity or sphere name header - shown when sphere is selected and no memory is focused */}
          {!focusedMemory && selectedSphere && (() => {
            // Check if an entity is focused and get its name
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere; // Use type assertion to avoid type narrowing issues
            
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            // Only show sphere name when no entity is focused - entity name is shown below Текуща
            // Don't show entity name here to avoid duplication
            if (entityName) {
              return null; // Hide when entity is focused - title is shown below Текуща
            }
            
            const displayText = t(`spheres.${sphere}`);
            
            return (
              <ThemedText
                size={isTablet ? "xl" : "l"}
                weight="semibold"
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  top: 82,
                  right: 20,
                  zIndex: 1000,
                  color: colors.text,
                  textAlign: 'right',
                }}
              >
                {displayText}
              </ThemedText>
            );
          })()}
          
          {/* Memory title header - shown when memory is focused */}
          {focusedMemory && (() => {
            const entityId = focusedMemory.profileId || focusedMemory.jobId || focusedMemory.familyMemberId;
            const sphere = focusedMemory.sphere;
            if (!entityId) return null;
            
            const memories = getIdealizedMemoriesByEntityId(entityId, sphere);
            
            const memoryData = memories.find(m => m.id === focusedMemory.memoryId);
            if (!memoryData) return null;
            
            return (
              <View
                style={{
                  position: 'absolute',
                  top: 70,
                  left: 80,
                  right: 20,
                  zIndex: 1000,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  size="l"
                  weight="semibold"
                  numberOfLines={2}
                  style={{
                    color: colors.text,
                    textAlign: 'center',
                  }}
                >
                  {memoryData.title}
                </ThemedText>
              </View>
            );
          })()}
          
          <View
            style={[
              styles.content,
              {
                flex: 1,
                height: SCREEN_HEIGHT,
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
          >
            {/* Render family members with year section backgrounds (titles hidden) */}
            {animationsReady && !focusedFamilyMemberId && !focusedMemory && (
              <>
                {/* Year section backgrounds - titles are hidden */}
                {Array.from(familyYearSections.entries()).map(([key, section]) => (
                  <YearSectionBackground
                    key={`family-year-section-bg-${key}`}
                    section={section}
                    colorScheme={colorScheme ?? 'dark'}
                    hideTitle={true}
                  />
                ))}

                {/* Show family members distributed within the section */}
                {familyMembers.map((member, index) => {
                  const memories = getIdealizedMemoriesByEntityId(member.id, 'family');

                  // Get the section for family members
                  const section = familyYearSections.get('all');

                  // Use the pre-calculated position with collision detection
                  const position = familyMemberPositions[index];

                  // Clamp position to ensure avatar is fully visible in viewport
                  const baseAvatarSize = isTablet ? 120 : 100;
                  const clampedCalculatedPosition = clampPositionToViewport(position, baseAvatarSize);

                  const isFocused = focusedFamilyMemberId === member.id;
                  const wasJustFocused = previousFocusedFamilyMemberIdRef.current === member.id && !focusedFamilyMemberId;

                  // Hide unfocused family members when a family member is focused
                  // Also hide family member that was just unfocused (it's being animated in focusedFamilyMembersRender)
                  if ((focusedFamilyMemberId && !isFocused) || wasJustFocused) {
                    return null;
                  }
                  
                  // Get saved position or use calculated position - clamp saved position if it exists
                  const savedPosition = familyPositionsState.get(member.id);
                  const clampedSavedPosition = savedPosition ? clampPositionToViewport(savedPosition, baseAvatarSize) : null;
                  const finalPosition = clampedSavedPosition || clampedCalculatedPosition;
                  
                  // Calculate slide direction for slide-in animation
                  const centerX = SCREEN_WIDTH / 2;
                  const centerY = SCREEN_HEIGHT / 2;
                  const dx = finalPosition.x - centerX;
                  const dy = finalPosition.y - centerY;
                  const slideDirectionX = dx > 0 ? 1 : -1;
                  const slideDirectionY = dy > 0 ? 1 : -1;
                  
                  return (
                    <NonFocusedZone
                      key={`family-zone-${member.id}`}
                      isFocused={isFocused}
                      wasJustFocused={wasJustFocused}
                      slideOffset={familySlideOffset}
                      slideDirectionX={slideDirectionX}
                      slideDirectionY={slideDirectionY}
                    >
                      <FloatingAvatar
                        key={`family-member-${member.id}`}
                        profile={member}
                        position={finalPosition}
                        memories={memories}
                        onPress={() => {
                          const newFocusedId = focusedFamilyMemberId === member.id ? null : member.id;
                          setFocusedFamilyMemberId(newFocusedId);
                          setFocusedMemory(null);
                        }}
                        colors={colors}
                        colorScheme={colorScheme ?? 'dark'}
                        isFocused={isFocused}
                        focusedMemory={(() => {
                          if (!focusedMemory) return null;
                          const mem = focusedMemory as { profileId?: string; jobId?: string; familyMemberId?: string; memoryId: string; sphere: LifeSphere };
                          if (mem.familyMemberId === member.id && mem.sphere === 'family') {
                            return mem;
                          }
                          return null;
                        })()}
                        onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'family', momentId?: string) => {
                          setFocusedMemory({ familyMemberId: entityId, memoryId, sphere, momentToShowId: momentId });
                        }}
                        yearSection={section}
                        enableDragging={!isFocused}
                        onPositionChange={(x, y) => updateFamilyMemberPosition(member.id, { x, y })}
                        externalPositionX={focusedFamilyMemberPositionX}
                        externalPositionY={focusedFamilyMemberPositionY}
                      />
                    </NonFocusedZone>
                  );
                })}
              </>
            )}

            {/* Render focused family members separately when focused (but hide family member when memory is focused) */}
            {focusedFamilyMembersRender}
            
            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? 'dark'}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </View>
        </View>
      </TabScreenContainer>
    );
  }

  // For friends sphere, show friends in a simple list (no year sections)
  if (selectedSphere === 'friends') {
    return (
      <TabScreenContainer>
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={focusedFriendId ? focusedFriendPositionX : avatarCenterX}
            avatarCenterY={focusedFriendId ? focusedFriendPositionY : avatarCenterY}
            colorScheme={colorScheme ?? 'dark'}
          />
          
          {/* Back button to return to sphere view */}
          <Pressable
            onPress={() => {
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;
              
              if (returnTo && returnToId) {
                router.back();
                return;
              }
              
              if (focusedMemory) {
                setFocusedMemory(null);
                if (!focusedFriendId || (focusedMemory.friendId && focusedFriendId !== focusedMemory.friendId)) {
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
            }}
            style={{
              position: 'absolute',
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons name="arrow-back" size={isTablet ? 36 : 24} color={colors.text} />
          </Pressable>
          
          {/* Year title below back arrow - shown when partner/job is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let yearTitle: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Get year for focused entity
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              if (job?.startDate) {
                const year = new Date(job.startDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              if (profile?.relationshipStartDate) {
                const year = new Date(profile.relationshipStartDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            
            if (yearTitle) {
              return (
                <ThemedText
                  size="l"
                  weight="bold"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Below back arrow
                    left: 20, // Align with back arrow
                    zIndex: 1000,
                    color: colors.text,
                    opacity: 0.6,
                  }}
                >
                  {yearTitle}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity name below back arrow - shown when partner/job/friend/family/hobby is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Include jobs (career sphere) - show name below back arrow for all entities
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            if (entityName) {
              return (
                <ThemedText
                  size="l"
                  weight="medium"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Lower the name further
                    right: 20,
                    zIndex: 1000,
                    color: colors.text,
                    maxWidth: SCREEN_WIDTH - 100, // Leave space for left side content
                    textAlign: 'right',
                  }}
                >
                  {entityName}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity or sphere name header - shown when sphere is selected and no memory is focused */}
          {!focusedMemory && selectedSphere && (() => {
            // Check if an entity is focused and get its name
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere; // Use type assertion to avoid type narrowing issues
            
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            // Only show sphere name when no entity is focused - entity name is shown below Текуща
            // Don't show entity name here to avoid duplication
            if (entityName) {
              return null; // Hide when entity is focused - title is shown below Текуща
            }
            
            const displayText = t(`spheres.${sphere}`);
            
            return (
              <ThemedText
                size={isTablet ? "xl" : "l"}
                weight="semibold"
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  top: 82,
                  right: 20,
                  zIndex: 1000,
                  color: colors.text,
                  textAlign: 'right',
                }}
              >
                {displayText}
              </ThemedText>
            );
          })()}
          
          {/* Memory title header - shown when memory is focused */}
          {focusedMemory && (() => {
            const entityId = focusedMemory.profileId || focusedMemory.jobId || focusedMemory.familyMemberId || focusedMemory.friendId || focusedMemory.hobbyId;
            const sphere = focusedMemory.sphere;
            if (!entityId) return null;
            
            const memories = getIdealizedMemoriesByEntityId(entityId, sphere);
            
            const memoryData = memories.find(m => m.id === focusedMemory.memoryId);
            if (!memoryData) return null;
            
            return (
              <View
                style={{
                  position: 'absolute',
                  top: 70,
                  left: 80,
                  right: 20,
                  zIndex: 1000,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  size="l"
                  weight="semibold"
                  numberOfLines={2}
                  style={{
                    color: colors.text,
                    textAlign: 'center',
                  }}
                >
                  {memoryData.title}
                </ThemedText>
              </View>
            );
          })()}

          <View
            style={[
              styles.content,
              {
                flex: 1,
                height: SCREEN_HEIGHT,
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
          >
            {/* Render friends with year section backgrounds (titles hidden) */}
            {animationsReady && !focusedFriendId && !focusedMemory && (
              <>
                {/* Year section backgrounds - titles are hidden */}
                {Array.from(friendsYearSections.entries()).map(([key, section]) => (
                  <YearSectionBackground
                    key={`friends-year-section-bg-${key}`}
                    section={section}
                    colorScheme={colorScheme ?? 'dark'}
                    hideTitle={true}
                  />
                ))}

                {/* Show friends distributed within the section */}
                {friends.map((friend, index) => {
                  const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');

                  // Get the section for friends
                  const section = friendsYearSections.get('all');

                  // Use the pre-calculated position with collision detection
                  const position = friendPositions[index];
                  
                  // Clamp position to ensure avatar is fully visible in viewport
                  const baseAvatarSize = isTablet ? 120 : 100;
                  const clampedCalculatedPosition = clampPositionToViewport(position, baseAvatarSize);
                  
                  const isFocused = focusedFriendId === friend.id;
                  const wasJustFocused = previousFocusedFriendIdRef.current === friend.id && !focusedFriendId;

                  // Hide unfocused friends when a friend is focused
                  // Also hide friend that was just unfocused (it's being animated in focusedFriendsRender)
                  if ((focusedFriendId && !isFocused) || wasJustFocused) {
                    return null;
                  }

                  // Get saved position or use calculated position - clamp saved position if it exists
                  const savedPosition = friendPositionsState.get(friend.id);
                  const clampedSavedPosition = savedPosition ? clampPositionToViewport(savedPosition, baseAvatarSize) : null;
                  const finalPosition = clampedSavedPosition || clampedCalculatedPosition;
                  
                  // Calculate slide direction for slide-in animation
                  const centerX = SCREEN_WIDTH / 2;
                  const centerY = SCREEN_HEIGHT / 2;
                  const dx = finalPosition.x - centerX;
                  const dy = finalPosition.y - centerY;
                  const slideDirectionX = dx > 0 ? 1 : -1;
                  const slideDirectionY = dy > 0 ? 1 : -1;
                  
                  return (
                    <NonFocusedZone
                      key={`friend-zone-${friend.id}`}
                      isFocused={isFocused}
                      wasJustFocused={wasJustFocused}
                      slideOffset={friendsSlideOffset}
                      slideDirectionX={slideDirectionX}
                      slideDirectionY={slideDirectionY}
                    >
                      <FloatingAvatar
                        key={`friend-${friend.id}`}
                        profile={friend}
                        position={finalPosition}
                        memories={memories}
                        onPress={() => {
                          const newFocusedId = focusedFriendId === friend.id ? null : friend.id;
                          setFocusedFriendId(newFocusedId);
                          setFocusedMemory(null);
                        }}
                        colors={colors}
                        colorScheme={colorScheme ?? 'dark'}
                        isFocused={isFocused}
                        focusedMemory={(() => {
                          if (!focusedMemory) return null;
                          const mem = focusedMemory as { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere };
                          if (mem.friendId === friend.id && mem.sphere === 'friends') {
                            return mem;
                          }
                          return null;
                        })()}
                        onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'friends', momentId?: string) => {
                          setFocusedMemory({ friendId: entityId, memoryId, sphere, momentToShowId: momentId });
                        }}
                        yearSection={section}
                        enableDragging={!isFocused}
                        onPositionChange={(x, y) => updateFriendPosition(friend.id, { x, y })}
                        externalPositionX={focusedFriendPositionX}
                        externalPositionY={focusedFriendPositionY}
                      />
                    </NonFocusedZone>
                  );
                })}
              </>
            )}

            {/* Render focused friends separately when focused (but hide friend when memory is focused) */}
            {focusedFriendsRender}
            
            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? 'dark'}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </View>
        </View>
      </TabScreenContainer>
    );
  }

  // For hobbies sphere, show hobbies in a simple list (no year sections)
  if (selectedSphere === 'hobbies') {
    return (
      <TabScreenContainer>
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
          {/* Sparkled Dots - Always visible on all screens */}
          <SparkledDots
            avatarSize={avatarSizeForDots}
            avatarCenterX={focusedHobbyId ? focusedHobbyPositionX : avatarCenterX}
            avatarCenterY={focusedHobbyId ? focusedHobbyPositionY : avatarCenterY}
            colorScheme={colorScheme ?? 'dark'}
          />
          
          {/* Back button to return to sphere view */}
          <Pressable
            onPress={() => {
              const returnTo = params.returnTo as string | undefined;
              const returnToId = params.returnToId as string | undefined;
              
              if (returnTo && returnToId) {
                router.back();
                return;
              }
              
              if (focusedMemory) {
                setFocusedMemory(null);
                if (!focusedHobbyId || (focusedMemory.hobbyId && focusedHobbyId !== focusedMemory.hobbyId)) {
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
            }}
            style={{
              position: 'absolute',
              top: 70,
              left: 20,
              zIndex: 1000,
              width: isTablet ? 70 : 50,
              height: isTablet ? 70 : 50,
              borderRadius: isTablet ? 35 : 25,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <MaterialIcons name="arrow-back" size={isTablet ? 36 : 24} color={colors.text} />
          </Pressable>
          
          {/* Year title below back arrow - shown when partner/job is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let yearTitle: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Get year for focused entity
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              if (job?.startDate) {
                const year = new Date(job.startDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              if (profile?.relationshipStartDate) {
                const year = new Date(profile.relationshipStartDate).getFullYear();
                yearTitle = year.toString();
              }
            }
            
            if (yearTitle) {
              return (
                <ThemedText
                  size="l"
                  weight="bold"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Below back arrow
                    left: 20, // Align with back arrow
                    zIndex: 1000,
                    color: colors.text,
                    opacity: 0.6,
                  }}
                >
                  {yearTitle}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity name below back arrow - shown when partner/job/friend/family/hobby is focused */}
          {!focusedMemory && selectedSphere && (() => {
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere;
            
            // Include jobs (career sphere) - show name below back arrow for all entities
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            if (entityName) {
              return (
                <ThemedText
                  size="l"
                  weight="medium"
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: (isTablet ? 70 : 50) + (isTablet ? 70 : 50) + 26, // Lower the name further
                    right: 20,
                    zIndex: 1000,
                    color: colors.text,
                    maxWidth: SCREEN_WIDTH - 100, // Leave space for left side content
                    textAlign: 'right',
                  }}
                >
                  {entityName}
                </ThemedText>
              );
            }
            return null;
          })()}
          
          {/* Entity or sphere name header - shown when sphere is selected and no memory is focused */}
          {!focusedMemory && selectedSphere && (() => {
            // Check if an entity is focused and get its name
            let entityName: string | null = null;
            const sphere = selectedSphere as LifeSphere; // Use type assertion to avoid type narrowing issues
            
            if (focusedProfileId && sphere === 'relationships') {
              const profile = profiles.find(p => p.id === focusedProfileId);
              entityName = profile?.name || null;
            }
            if (focusedJobId && sphere === 'career') {
              const job = jobs.find(j => j.id === focusedJobId);
              entityName = job?.name || null;
            }
            if (focusedFamilyMemberId && sphere === 'family') {
              const member = familyMembers.find(m => m.id === focusedFamilyMemberId);
              entityName = member?.name || null;
            }
            if (focusedFriendId && sphere === 'friends') {
              const friend = friends.find(f => f.id === focusedFriendId);
              entityName = friend?.name || null;
            }
            if (focusedHobbyId && sphere === 'hobbies') {
              const hobby = hobbies.find(h => h.id === focusedHobbyId);
              entityName = hobby?.name || null;
            }
            
            // Only show sphere name when no entity is focused - entity name is shown below Текуща
            // Don't show entity name here to avoid duplication
            if (entityName) {
              return null; // Hide when entity is focused - title is shown below Текуща
            }
            
            const displayText = t(`spheres.${sphere}`);
            
            return (
              <ThemedText
                size={isTablet ? "xl" : "l"}
                weight="semibold"
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  top: 82,
                  right: 20,
                  zIndex: 1000,
                  color: colors.text,
                  textAlign: 'right',
                }}
              >
                {displayText}
              </ThemedText>
            );
          })()}
          
          {/* Memory title header - shown when memory is focused */}
          {focusedMemory && (() => {
            const entityId = focusedMemory.profileId || focusedMemory.jobId || focusedMemory.familyMemberId || focusedMemory.friendId || focusedMemory.hobbyId;
            const sphere = focusedMemory.sphere;
            if (!entityId) return null;
            
            const memories = getIdealizedMemoriesByEntityId(entityId, sphere);
            
            const memoryData = memories.find(m => m.id === focusedMemory.memoryId);
            if (!memoryData) return null;
            
            return (
              <View
                style={{
                  position: 'absolute',
                  top: 70,
                  left: 80,
                  right: 20,
                  zIndex: 1000,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  size="l"
                  weight="semibold"
                  numberOfLines={2}
                  style={{
                    color: colors.text,
                    textAlign: 'center',
                  }}
                >
                  {memoryData.title}
                </ThemedText>
              </View>
            );
          })()}

          <View
            style={[
              styles.content,
              {
                flex: 1,
                height: SCREEN_HEIGHT,
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
          >
            {/* Render hobbies with year section backgrounds (titles hidden) */}
            {animationsReady && !focusedHobbyId && !focusedMemory && (
              <>
                {/* Year section backgrounds - titles are hidden */}
                {Array.from(hobbiesYearSections.entries()).map(([key, section]) => (
                  <YearSectionBackground
                    key={`hobbies-year-section-bg-${key}`}
                    section={section}
                    colorScheme={colorScheme ?? 'dark'}
                    hideTitle={true}
                  />
                ))}

                {/* Show hobbies distributed within the section */}
                {hobbies.map((hobby, index) => {
                  const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');

                  // Get the section for hobbies
                  const section = hobbiesYearSections.get('all');

                  // Use the pre-calculated position with collision detection
                  const position = hobbyPositions[index];

                  // Clamp position to ensure avatar is fully visible in viewport
                  const baseAvatarSize = isTablet ? 120 : 100;
                  const clampedCalculatedPosition = clampPositionToViewport(position, baseAvatarSize);

                  const isFocused = focusedHobbyId === hobby.id;
                  const wasJustFocused = previousFocusedHobbyIdRef.current === hobby.id && !focusedHobbyId;

                  // Hide unfocused hobbies when a hobby is focused
                  // Also hide hobby that was just unfocused (it's being animated in focusedHobbiesRender)
                  if ((focusedHobbyId && !isFocused) || wasJustFocused) {
                    return null;
                  }
                  
                  // Get saved position or use calculated position - clamp saved position if it exists
                  const savedPosition = hobbyPositionsState.get(hobby.id);
                  const clampedSavedPosition = savedPosition ? clampPositionToViewport(savedPosition, baseAvatarSize) : null;
                  const finalPosition = clampedSavedPosition || clampedCalculatedPosition;
                  
                  // Calculate slide direction for slide-in animation
                  const centerX = SCREEN_WIDTH / 2;
                  const centerY = SCREEN_HEIGHT / 2;
                  const dx = finalPosition.x - centerX;
                  const dy = finalPosition.y - centerY;
                  const slideDirectionX = dx > 0 ? 1 : -1;
                  const slideDirectionY = dy > 0 ? 1 : -1;
                  
                  return (
                    <NonFocusedZone
                      key={`hobby-zone-${hobby.id}`}
                      isFocused={isFocused}
                      wasJustFocused={wasJustFocused}
                      slideOffset={hobbiesSlideOffset}
                      slideDirectionX={slideDirectionX}
                      slideDirectionY={slideDirectionY}
                    >
                      <FloatingAvatar
                        key={`hobby-${hobby.id}`}
                        profile={hobby}
                        position={finalPosition}
                        memories={memories}
                        onPress={() => {
                          const newFocusedId = focusedHobbyId === hobby.id ? null : hobby.id;
                          setFocusedHobbyId(newFocusedId);
                          setFocusedMemory(null);
                        }}
                        colors={colors}
                        colorScheme={colorScheme ?? 'dark'}
                        isFocused={isFocused}
                        focusedMemory={(() => {
                          if (!focusedMemory) return null;
                          const mem = focusedMemory as { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere };
                          if (mem.hobbyId === hobby.id && mem.sphere === 'hobbies') {
                            return mem;
                          }
                          return null;
                        })()}
                        onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'hobbies', momentId?: string) => {
                          setFocusedMemory({ hobbyId: entityId, memoryId, sphere, momentToShowId: momentId });
                        }}
                        yearSection={section}
                        enableDragging={!isFocused}
                        onPositionChange={(x, y) => updateHobbyPosition(hobby.id, { x, y })}
                        externalPositionX={focusedHobbyPositionX}
                        externalPositionY={focusedHobbyPositionY}
                      />
                    </NonFocusedZone>
                  );
                })}
              </>
            )}

            {/* Render focused hobbies separately when focused (but hide hobby when memory is focused) */}
            {focusedHobbiesRender}
            
            {/* Render focused memory separately when memory is focused */}
            {focusedMemory && animationsReady && (
              <FocusedMemoryRenderer
                focusedMemory={focusedMemory}
                sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
                getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
                updateIdealizedMemory={updateIdealizedMemory}
                colorScheme={colorScheme ?? 'dark'}
                memorySlideOffset={memorySlideOffset}
                setFocusedMemory={setFocusedMemory}
              />
            )}
          </View>
        </View>
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
        
        <ScrollView
          scrollEnabled={!isAnyEntityWheelActive}
          style={[
            styles.content,
            {
              flex: 1,
            },
          ]}
          contentContainerStyle={{
            minHeight: SCREEN_HEIGHT,
            paddingBottom: 100, // Extra padding at bottom for scrolling
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Render year sections with profiles inside - hidden when focused */}
          {animationsReady && !focusedProfileId && !focusedMemory && (
            <YearSectionsRenderer
              yearSections={yearSections}
              profilesBySection={profilesBySection}
              colorScheme={colorScheme ?? 'dark'}
              getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
              getAvatarPosition={getAvatarPosition}
              focusedProfileId={focusedProfileId}
              focusedMemory={focusedMemory}
              previousFocusedId={previousFocusedIdRef.current}
              slideOffset={slideOffset}
              getProfileYearSection={getProfileYearSection}
              updateAvatarPosition={updateAvatarPosition}
              setFocusedProfileId={setFocusedProfileId}
              setFocusedMemory={setFocusedMemory}
              colors={colors}
              memorySlideOffset={memorySlideOffset}
              animationsComplete={animationsComplete}
            />
          )}
          
          {/* Render focused profiles separately when focused (but hide profile when memory is focused) */}
          {focusedProfilesRender}
          
          {/* Render focused memory separately when memory is focused */}
          {focusedMemory && animationsReady && (
            <FocusedMemoryRenderer
              focusedMemory={focusedMemory}
              sortedProfiles={sortedProfiles}
                sortedJobs={sortedJobs}
              getIdealizedMemoriesByProfileId={getIdealizedMemoriesByProfileId}
                getIdealizedMemoriesByEntityId={getIdealizedMemoriesByEntityId}
              updateIdealizedMemory={updateIdealizedMemory}
              colorScheme={colorScheme ?? 'dark'}
              memorySlideOffset={memorySlideOffset}
              setFocusedMemory={setFocusedMemory}
            />
          )}
        </ScrollView>
      </View>

      {/* Onboarding Stepper */}
      <OnboardingStepper
        visible={walkthroughVisible}
        onDismiss={handleWalkthroughDismiss}
        onDemo={handleOnboardingDemo}
      />
    </TabScreenContainer>
  );
}

// Year Sections Renderer Component
const YearSectionsRenderer = React.memo(function YearSectionsRenderer({
  yearSections,
  profilesBySection,
  colorScheme,
  getIdealizedMemoriesByProfileId,
  getAvatarPosition,
  focusedProfileId,
  focusedMemory,
  previousFocusedId,
  slideOffset,
  getProfileYearSection,
  updateAvatarPosition,
  setFocusedProfileId,
  setFocusedMemory,
  colors,
  memorySlideOffset,
  animationsComplete,
}: {
  yearSections: Map<string, { year: number | string; top: number; bottom: number; height: number }>;
  profilesBySection: Map<string, any[]>;
  colorScheme: 'light' | 'dark';
  getIdealizedMemoriesByProfileId: (profileId: string) => any[];
  getAvatarPosition: (profileId: string, index: number) => { x: number; y: number };
  focusedProfileId: string | null;
  focusedMemory: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null;
  previousFocusedId: string | null;
  slideOffset: ReturnType<typeof useSharedValue<number>>;
  getProfileYearSection: (profile: any) => { year: number | string; top: number; bottom: number; height: number } | undefined;
  updateAvatarPosition: (profileId: string, newPosition: { x: number; y: number }) => void;
  setFocusedProfileId: (id: string | null) => void;
  setFocusedMemory: (memory: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null) => void;
  colors: any;
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  animationsComplete: boolean;
}) {
  // CRITICAL: Only use focusedMemory if it's from relationships sphere
  // This ensures cross-sphere focusedMemory (e.g., from career) doesn't affect relationships rendering
  const safeFocusedMemory = focusedMemory?.sphere === 'relationships' ? focusedMemory : null;
  
  // Memoize memories and positions for all profiles to prevent unnecessary re-renders
  // Reuse previous references when data hasn't changed to prevent cascading re-renders
  const profileDataMapRef = useRef<Map<string, { memories: any[]; position: { x: number; y: number } }>>(new Map());
  const profileDataMap = useMemo(() => {
    const dataMap = new Map<string, { memories: any[]; position: { x: number; y: number } }>();
    const allProfilesInSections = Array.from(profilesBySection.values()).flat();
    
    allProfilesInSections.forEach(({ profile, index: profileIndex }) => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      const position = getAvatarPosition(profile.id, profileIndex);
      
      // Check if data actually changed for this profile
      const prevData = profileDataMapRef.current.get(profile.id);
      if (prevData && 
          prevData.memories.length === memories.length &&
          prevData.position.x === position.x &&
          prevData.position.y === position.y) {
        // Reuse previous reference if data is the same (check memory IDs to be sure)
        const prevMemoryIds = prevData.memories.map(m => m?.id).join(',');
        const currentMemoryIds = memories.map(m => m?.id).join(',');
        if (prevMemoryIds === currentMemoryIds) {
          dataMap.set(profile.id, prevData);
          return; // Reuse previous reference
        }
      }
      
      // Data changed or first time - create new reference
      dataMap.set(profile.id, { memories, position });
    });
    profileDataMapRef.current = dataMap;
    return dataMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesBySection]); // Only profilesBySection - functions are stable via useCallback
  
  // Get the name of the partner in each year section (show first/primary partner name per section)
  const getSectionEntityName = (sectionKey: string) => {
    const sectionProfiles = profilesBySection.get(sectionKey);
    if (sectionProfiles && sectionProfiles.length > 0) {
      // Return the name of the first partner in this section
      return sectionProfiles[0].profile.name;
    }
    return null;
  };
  
  const t = useTranslate();
  const { isTablet } = useLargeDevice();
  
  return (
    <>
      {/* Year titles below back arrow - shown for each year section in listing view */}
      {!focusedProfileId && Array.from(yearSections.entries()).map(([key, section]) => {
        const displayYear = typeof section.year === 'string' 
          ? (section.year === 'Ongoing' ? t('profile.ongoing') : section.year === 'Current' ? t('job.current') : section.year)
          : section.year;
        
        // Position year title below back arrow, aligned with section top
        const backArrowBottom = (isTablet ? 70 : 50) + (isTablet ? 70 : 50);
        const yearTitleTop = section.top < backArrowBottom + 10 
          ? backArrowBottom + 10  // Position below back arrow
          : section.top + 8; // Position at section top if section is far below
        
        return (
          <ThemedText
            key={`year-title-${key}`}
            size="l"
            weight="bold"
            numberOfLines={1}
            style={{
              position: 'absolute',
              top: yearTitleTop,
              left: 20, // Align with back arrow
              zIndex: 1000,
              color: colors.text,
              opacity: 0.6,
            }}
          >
            {displayYear}
          </ThemedText>
        );
      })}
      
      {/* Render section backgrounds */}
      {Array.from(yearSections.entries()).map(([key, section]) => {
        const sectionEntityName = getSectionEntityName(key);
        // Check if this section contains the focused profile
        const sectionProfiles = profilesBySection.get(key);
        const isFocusedSection = sectionProfiles?.some(({ profile }) => profile.id === focusedProfileId) ?? false;
        // Hide title if memory is focused OR if a profile is focused (but show it if this is the focused profile's section)
        const shouldHideTitle = !!safeFocusedMemory || (!!focusedProfileId && !isFocusedSection);
        return (
          <YearSectionBackground
            key={`year-section-bg-${key}`}
            section={section}
            colorScheme={colorScheme}
            hideTitle={shouldHideTitle}
            focusedEntityName={null} // Don't show entity name in year section - it's shown below back arrow
          />
        );
      })}
      
      {/* Render profiles at the same level (not nested in sections) */}
      {(() => {
        return Array.from(profilesBySection.entries()).flatMap(([key, sectionProfilesData]) => {
        return sectionProfilesData.map(({ profile, index: profileIndex }) => {
          const profileData = profileDataMap.get(profile.id);
            if (!profileData) {
              return null; // Should not happen, but safety check
            }
          
          const { memories, position: currentPosition } = profileData;
          const isFocused = focusedProfileId === profile.id;
          // Use safeFocusedMemory (already filtered by sphere) - only relationships memories
          const isProfileFocusedForMemory = safeFocusedMemory?.profileId === profile.id;
          // Calculate wasJustFocused here to avoid passing previousFocusedId to all profiles
          const wasJustFocused = previousFocusedId === profile.id && !focusedProfileId && !safeFocusedMemory;
          
          return (
            <ProfileRenderer
              key={profile.id}
              profile={profile}
              index={profileIndex}
              memories={memories}
              currentPosition={currentPosition}
              isFocused={isFocused}
              isProfileFocusedForMemory={isProfileFocusedForMemory}
              wasJustFocused={wasJustFocused}
              focusedMemory={safeFocusedMemory}
              slideOffset={slideOffset}
              getProfileYearSection={getProfileYearSection}
              updateAvatarPosition={updateAvatarPosition}
              setFocusedProfileId={setFocusedProfileId}
              setFocusedMemory={setFocusedMemory}
              colors={colors}
              colorScheme={colorScheme}
              memorySlideOffset={memorySlideOffset}
              animationsComplete={animationsComplete}
              focusedProfileId={focusedProfileId}
            />
          );
        });
      });
      })()}
    </>
  );
});

// Year Section Background Component (just the visual container)
const YearSectionBackground = React.memo(function YearSectionBackground({
  section,
  colorScheme,
  hideTitle = false,
  focusedEntityName,
}: {
  section: { year: number | string; top: number; bottom: number; height: number };
  colorScheme: 'light' | 'dark';
  hideTitle?: boolean;
  focusedEntityName?: string | null;
}) {
  const t = useTranslate();
  const { isTablet } = useLargeDevice();
  
  // Translate section year if it's a string, otherwise display the number
  const displayYear = typeof section.year === 'string' 
    ? (section.year === 'Ongoing' ? t('profile.ongoing') : section.year === 'Current' ? t('job.current') : section.year)
    : section.year;
  
  // Combine year and entity name if entity is focused
  const displayText = focusedEntityName ? `${displayYear} - ${focusedEntityName}` : displayYear;
  
  // Back arrow button position: top: 70, height: isTablet ? 70 : 50
  // So bottom of button is at: 70 + (isTablet ? 70 : 50) = 120 or 140
  // Position year title below the back arrow button
  const backArrowBottom = 70 + (isTablet ? 70 : 50);
  const backArrowLeft = 20;
  // Calculate vertical position: if section starts below back arrow, position at section top + small offset
  // Otherwise, position just below back arrow
  const yearTitleTop = section.top < backArrowBottom + 10 
    ? backArrowBottom + 10 - section.top  // Position below back arrow relative to section
    : 8; // Default position if section is far below
  
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: section.top,
        width: SCREEN_WIDTH,
        height: section.height,
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        zIndex: 0, // Behind avatars
        pointerEvents: 'none', // Allow touches to pass through
      }}
    >
      {/* Year label removed - now shown below back arrow when entity is focused */}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.section.year === nextProps.section.year &&
    prevProps.section.top === nextProps.section.top &&
    prevProps.section.bottom === nextProps.section.bottom &&
    prevProps.section.height === nextProps.section.height &&
    prevProps.colorScheme === nextProps.colorScheme &&
    prevProps.hideTitle === nextProps.hideTitle &&
    prevProps.focusedEntityName === nextProps.focusedEntityName
  );
});

// Focused Memory Renderer Component
const FocusedMemoryRenderer = React.memo(function FocusedMemoryRenderer({
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
  focusedMemory: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string };
  sortedProfiles: any[];
  sortedJobs?: any[];
  getIdealizedMemoriesByProfileId: (profileId: string) => any[];
  getIdealizedMemoriesByEntityId: (entityId: string, sphere: LifeSphere) => any[];
  updateIdealizedMemory: (memoryId: string, updates: Partial<any>) => Promise<void>;
  colorScheme: 'light' | 'dark';
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  setFocusedMemory: (memory: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null) => void;
}) {
  const entityId = focusedMemory.profileId || focusedMemory.jobId || focusedMemory.familyMemberId || focusedMemory.friendId || focusedMemory.hobbyId;
  const sphere = focusedMemory.sphere;
  
  if (!entityId) return null;
  
  // Get memories based on sphere
  const memories = sphere === 'relationships' && focusedMemory.profileId
    ? getIdealizedMemoriesByProfileId(focusedMemory.profileId)
    : getIdealizedMemoriesByEntityId(entityId, sphere);
  
  const focusedMemoryData = memories.find(m => m.id === focusedMemory.memoryId);
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
      colorScheme={colorScheme ?? 'dark'}
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
}, (prevProps, nextProps) => {
  return (
    (prevProps.focusedMemory.profileId === nextProps.focusedMemory.profileId || 
     prevProps.focusedMemory.jobId === nextProps.focusedMemory.jobId ||
     prevProps.focusedMemory.familyMemberId === nextProps.focusedMemory.familyMemberId) &&
    prevProps.focusedMemory.memoryId === nextProps.focusedMemory.memoryId &&
    prevProps.colorScheme === nextProps.colorScheme
  );
});

// Profile Renderer Component
const ProfileRenderer = React.memo(function ProfileRenderer({
  profile,
  index,
  memories,
  currentPosition,
  isFocused,
  isProfileFocusedForMemory,
  wasJustFocused,
  focusedMemory,
  slideOffset,
  getProfileYearSection,
  updateAvatarPosition,
  setFocusedProfileId,
  setFocusedMemory,
  colors,
  colorScheme,
  memorySlideOffset,
  animationsComplete,
  focusedProfileId,
}: {
  profile: any;
  index: number;
  memories: any[];
  currentPosition: { x: number; y: number };
  isFocused: boolean;
  isProfileFocusedForMemory: boolean;
  wasJustFocused: boolean;
  focusedMemory: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null;
  slideOffset: ReturnType<typeof useSharedValue<number>>;
  getProfileYearSection: (profile: any) => { year: number | string; top: number; bottom: number; height: number } | undefined;
  updateAvatarPosition: (profileId: string, newPosition: { x: number; y: number }) => void;
  setFocusedProfileId: (id: string | null) => void;
  setFocusedMemory: (memory: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere; momentToShowId?: string } | null) => void;
  colors: any;
  colorScheme: 'light' | 'dark';
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  animationsComplete: boolean;
  focusedProfileId: string | null;
}) {
  // Determine slide direction for non-focused zones
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;
  const dx = currentPosition.x - centerX;
  const dy = currentPosition.y - centerY;
  const slideDirectionX = dx > 0 ? 1 : -1;
  const slideDirectionY = dy > 0 ? 1 : -1;
  
  // Memoize callbacks to prevent unnecessary re-renders
  const handlePress = useCallback(() => {
    const newFocusedId = isFocused ? null : profile.id;
    // Don't use startTransition - it defers the update and causes flash
    // Update state immediately so useLayoutEffect can run synchronously
    setFocusedProfileId(newFocusedId);
    setFocusedMemory(null);
  }, [profile.id, isFocused, setFocusedProfileId, setFocusedMemory]);
  
  const handleMemoryFocus = useCallback((entityId: string, memoryId: string, sphere: LifeSphere = 'relationships', momentId?: string) => {
    if (sphere === 'relationships') {
      setFocusedMemory({ profileId: entityId, memoryId, sphere, momentToShowId: momentId });
    } else if (sphere === 'career') {
      setFocusedMemory({ jobId: entityId, memoryId, sphere, momentToShowId: momentId });
    } else {
      setFocusedMemory({ profileId: entityId, memoryId, sphere, momentToShowId: momentId });
    }
  }, [setFocusedMemory]);
  
  // Don't render the profile at all when a memory is focused (it's rendered separately)
  if (isProfileFocusedForMemory) {
    return null;
  }
  
  // Hide unfocused profiles immediately when a profile is focused
  // Also hide profile that was just unfocused (it's being animated in focusedProfilesRender)
  // This prevents showing both start and end positions simultaneously
  // Note: focusedMemory is already filtered by sphere in YearSectionsRenderer, so we can safely check it here
  if ((focusedProfileId && !isFocused) || wasJustFocused) {
    return null;
  }
  
  return (
    <NonFocusedZone
      key={profile.id}
      isFocused={isFocused}
      wasJustFocused={wasJustFocused}
      slideOffset={slideOffset}
      slideDirectionX={slideDirectionX}
      slideDirectionY={slideDirectionY}
    >
      <FloatingAvatar
        profile={profile}
        position={currentPosition}
        memories={memories}
        onPress={handlePress}
        isFocused={isFocused}
        colors={colors}
        colorScheme={colorScheme ?? 'dark'}
        focusedMemory={focusedMemory}
        memorySlideOffset={memorySlideOffset}
        onMemoryFocus={(entityId: string, memoryId: string) => handleMemoryFocus(entityId, memoryId, 'relationships')}
        yearSection={getProfileYearSection(profile)}
      />
    </NonFocusedZone>
  );
}, (prevProps, nextProps) => {
  // Quick reference check first
  if (prevProps.memories === nextProps.memories) {
    // Same reference, check other props
    // Note: We don't check focusedProfileId directly - isFocused already captures focus changes
    return (
      prevProps.profile.id === nextProps.profile.id &&
      prevProps.currentPosition.x === nextProps.currentPosition.x &&
      prevProps.currentPosition.y === nextProps.currentPosition.y &&
      prevProps.isFocused === nextProps.isFocused &&
      prevProps.isProfileFocusedForMemory === nextProps.isProfileFocusedForMemory &&
      prevProps.wasJustFocused === nextProps.wasJustFocused &&
      prevProps.focusedMemory?.profileId === nextProps.focusedMemory?.profileId &&
      prevProps.focusedMemory?.memoryId === nextProps.focusedMemory?.memoryId &&
      prevProps.animationsComplete === nextProps.animationsComplete &&
      prevProps.focusedProfileId === nextProps.focusedProfileId
    );
  }
  
  // Different reference - check if contents are the same (shallow comparison by ID)
  if (prevProps.memories.length !== nextProps.memories.length) {
    return false;
  }
  
  // Compare memory IDs to see if contents changed
  const prevIds = prevProps.memories.map(m => m?.id).join(',');
  const nextIds = nextProps.memories.map(m => m?.id).join(',');
  if (prevIds !== nextIds) {
    return false;
  }
  
  // Memories are the same, check other props
  // Note: We don't check focusedProfileId directly - isFocused already captures focus changes
  return (
    prevProps.profile.id === nextProps.profile.id &&
    prevProps.currentPosition.x === nextProps.currentPosition.x &&
    prevProps.currentPosition.y === nextProps.currentPosition.y &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.isProfileFocusedForMemory === nextProps.isProfileFocusedForMemory &&
    prevProps.wasJustFocused === nextProps.wasJustFocused &&
    prevProps.focusedMemory?.profileId === nextProps.focusedMemory?.profileId &&
    prevProps.focusedMemory?.memoryId === nextProps.focusedMemory?.memoryId &&
    prevProps.animationsComplete === nextProps.animationsComplete &&
    prevProps.focusedProfileId === nextProps.focusedProfileId
  );
});

// Component to handle non-focused zone animation
const NonFocusedZone = React.memo(function NonFocusedZone({
  children,
  isFocused,
  wasJustFocused,
  slideOffset,
  slideDirectionX,
  slideDirectionY,
}: {
  children: React.ReactNode;
  isFocused: boolean;
  wasJustFocused: boolean;
  slideOffset: ReturnType<typeof useSharedValue<number>>;
  slideDirectionX: number;
  slideDirectionY: number;
}) {
  // Create animated style for this specific profile
  const nonFocusedStyle = useAnimatedStyle(() => {
    // If this profile is currently focused, it always stays in place
    if (isFocused) {
      return { 
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }], 
        opacity: 1 
      };
    }
    
    // If this profile was just focused (now unfocused), keep it visible and in place
    // It will shrink back to normal size via the FloatingAvatar's own scale animation
    if (wasJustFocused) {
      return { 
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }], 
        opacity: 1 
      };
    }
    
    // For other non-focused profiles, animate based on slideOffset
    // When slideOffset is 0, they're in normal position
    // When slideOffset is large, they slide off-screen with fade and scale
    const offset = slideOffset.value;
    // Normalize offset to 0-1 range for smooth fade and scale
    const normalizedOffset = Math.min(offset / (SCREEN_WIDTH * 2), 1); // 0 to 1
    // Fade out and scale down as they slide away
    const opacity = 1 - normalizedOffset; // Fade from 1 to 0
    const scale = 1 - normalizedOffset * 0.3; // Scale down from 1 to 0.7
    
    return {
      transform: [
        { translateX: offset * slideDirectionX },
        { translateY: offset * slideDirectionY * 0.5 }, // Less vertical movement
        { scale: scale }, // Scale down as they disappear
      ],
      opacity: opacity, // Smooth fade out
    };
  });
  
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          pointerEvents: 'box-none', // Allow touches to pass through to children
        },
        nonFocusedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.wasJustFocused === nextProps.wasJustFocused &&
    prevProps.slideDirectionX === nextProps.slideDirectionX &&
    prevProps.slideDirectionY === nextProps.slideDirectionY
  );
});
