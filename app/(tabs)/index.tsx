import { StreakBadgeComponent } from '@/components/streak-badge';
import { StreakModal } from '@/components/streak-modal';
import { StreakRulesModal } from '@/components/streak-rules-modal';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { DARK_GRADIENT_COLORS, LIGHT_GRADIENT_COLORS, TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney, type LifeSphere } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
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
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, FeColorMatrix, FeGaussianBlur, FeMerge, FeMergeNode, Filter, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
}) {
  const hasStartPosition = propStartX !== undefined && propStartY !== undefined;
  const animationStartedRef = React.useRef(false); // Track if animation has started to prevent reset
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
        },
        onPanResponderTerminationRequest: () => false, // Don't allow other responders to take over
      }),
    [hitAreaWidth, hitAreaHeight, panX, panY, startX, startY, isDragging, onPositionChange]
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
}: {
  profile: any;
  position: { x: number; y: number };
  memories: any[];
  onPress: () => void;
  colors: any;
  colorScheme: 'light' | 'dark';
  isFocused: boolean;
  focusedMemory?: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere } | null;
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  onMemoryFocus?: (entityId: string, memoryId: string, sphere?: LifeSphere) => void;
  yearSection?: { year: number | string; top: number; bottom: number; height: number };
  onPositionChange?: (x: number, y: number) => void;
  enableDragging?: boolean;
  externalPositionX?: ReturnType<typeof useSharedValue<number>>;
  externalPositionY?: ReturnType<typeof useSharedValue<number>>;
}) {
  const { isTablet } = useLargeDevice();
  const baseAvatarSize = isTablet ? 120 : 80; // 50% larger on tablets
  const focusedAvatarSize = isTablet ? 150 : 100; // 50% larger on tablets
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
  const exZoneRadius = isFocused ? 180 : 120; // Adjusted zone when memories are closer
  
  // Calculate sunny moments percentage for progress bar
  const sunnyPercentage = useMemo(() => {
    let totalClouds = 0;
    let totalSuns = 0;
    
    memories.forEach((memory) => {
      totalClouds += (memory.hardTruths || []).length;
      totalSuns += (memory.goodFacts || []).length;
    });
    
    const total = totalClouds + totalSuns;
    if (total === 0) return 0; // No progress if no moments
    
    // Percentage of sunny moments (0-100)
    return (totalSuns / total) * 100;
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
  const panX = useSharedValue(position.x);
  const panY = useSharedValue(position.y);
  const isDragging = useSharedValue(false);
  const dragStartX = useSharedValue(position.x);
  const dragStartY = useSharedValue(position.y);
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

              // Clamp to viewport bounds
              const padding = avatarSize / 2 + 20;
              const minX = padding;
              const maxX = SCREEN_WIDTH - padding;
              const minY = padding;
              const maxY = SCREEN_HEIGHT - padding;

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

                // Clamp to viewport bounds
                const padding = avatarSize / 2 + 20;
                const minX = padding;
                const maxX = SCREEN_WIDTH - padding;
                const minY = padding;
                const maxY = SCREEN_HEIGHT - padding;

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
  React.useEffect(() => {
    if (!isDragging.value) {
      panX.value = position.x;
      panY.value = position.y;
      memoryAnimatedValues.forEach((mem) => {
        mem.panX.value = position.x;
        mem.panY.value = position.y;
      });
    }
  }, [position.x, position.y, panX, panY, memoryAnimatedValues, isDragging]);
  
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
    } else {
      // Stop floating when focused
      floatAnimation.value = 0;
    }
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
  const memoryAnimatedValuesRef = React.useRef(memoryAnimatedValues);
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


  // Zoom animation for focused state - smooth zoom-in/zoom-out effect
  // Calculate the scale factor: focused size (100px) / base size (80px) = 1.25
  const baseScale = 1;
  const focusedScale = focusedAvatarSize / baseAvatarSize; // 100/80 = 1.25
  
  // Always start from unfocused state to ensure smooth animation
  const zoomScale = useSharedValue(baseScale);
  const zoomProgress = useSharedValue(0);
  
  // Store the starting position when focusing begins (State A position)
  const startX = useSharedValue(position.x);
  const startY = useSharedValue(position.y);
  
  // Target position for focused state (State B - centered in visible viewport)
  const targetX = SCREEN_WIDTH / 2;
  const targetY = SCREEN_HEIGHT / 2;
  
  // Shared values for focused position (used by memories)
  const focusedX = useSharedValue(position.x);
  const focusedY = useSharedValue(position.y);
  
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
      const currentScale = zoomScale.value;
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
      ((m.hardTruths || []).length + (m.goodFacts || []).length)
    ), 1);
    const minMomentsCount = Math.min(...memories.map(m => 
      ((m.hardTruths || []).length + (m.goodFacts || []).length)
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
      const momentCount = (memory.hardTruths || []).length + (memory.goodFacts || []).length;
      
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
        // When there are less than 5 elements, position them further from avatar
        // But ensure single memory stays fully visible in viewport
        if (memories.length === 1) {
          // For single memory, keep it closer to ensure it's fully visible
          const closerMultiplier = isFocused ? 0.9 : 0.95; // Slightly closer to ensure visibility
          variedRadius = variedRadius * closerMultiplier;
        } else if (memories.length === 2) {
          // For 2 memories, position them further to ensure clear separation
          const furtherMultiplier = isFocused ? 1.25 : 1.15; // 25% further when focused, 15% further when unfocused
          variedRadius = variedRadius * furtherMultiplier;
        } else {
          // For 3-4 memories, position them further
          const furtherMultiplier = isFocused ? 1.2 : 1.1; // 20% further when focused, 10% further when unfocused
          variedRadius = variedRadius * furtherMultiplier;
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
    <>
      <Animated.View
        {...(panResponder?.panHandlers || {})}
        style={[
          {
            position: 'absolute',
            left: position.x - avatarSize / 2,
            top: position.y - avatarSize / 2,
            zIndex: 100, // Much higher z-index to ensure avatars are always on top and interactive
            pointerEvents: enableDragging && !isFocused ? 'auto' : 'box-none', // Allow touches when dragging enabled
          },
          animatedStyle,
        ]}
      >
        <Pressable
          style={{ pointerEvents: 'auto' }} // Always allow press events
          onPress={() => {
            // Only trigger onPress if we didn't drag
            // Use a small delay to check if drag started (PanResponder needs time to set the flag)
            const checkDrag = () => {
              if (!dragStartedRef.current && !isDragging.value) {
                onPress();
              }
            };
            // Check immediately and after a short delay to catch drags that start quickly
            checkDrag();
            setTimeout(checkDrag, 100);
          }}
        >
          {/* Circular progress bar border */}
          <View
            style={{
              width: avatarSize + borderWidth * 2,
              height: avatarSize + borderWidth * 2,
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
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
          </View>
        </Pressable>
      </Animated.View>

      {/* Floating Memories around Avatar - rendered separately for proper z-index */}
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
        
        // When focused, use the position prop which should be the animated position
        // The position prop is updated to center when focused, so use it directly
        // This ensures memories follow the avatar smoothly during animation
        const avatarCenterX = positionX;
        const avatarCenterY = positionY;
        
        // Initial position for first render - position prop already contains animated position
        const initialMemPos = {
          x: avatarCenterX + memPosData.offsetX,
          y: avatarCenterY + memPosData.offsetY,
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
        
        // Calculate distances from memory center (avatar + offset) to nearest viewport edges
        // This ensures each memory fits within the viewport
        // When focused, use centered avatar position
        const memoryCenterX = avatarCenterX + memPosData.offsetX;
        const memoryCenterY = avatarCenterY + memPosData.offsetY;
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
        const momentCount = (memory.hardTruths || []).length + (memory.goodFacts || []).length;
        
        // Calculate min and max moment counts across all memories for scaling
        const allMomentCounts = memories.map(m => 
          ((m.hardTruths || []).length + (m.goodFacts || []).length)
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
            isFocused={isFocused}
            colorScheme={colorScheme}
            calculatedMemorySize={memorySize}
            isMemoryFocused={(focusedMemory?.profileId === profile.id || focusedMemory?.jobId === profile.id) && focusedMemory?.memoryId === memory.id}
            memorySlideOffset={memorySlideOffset}
            onPress={onPress}
            onMemoryFocus={onMemoryFocus}
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
      }, [memories, focusedMemory, profile.id, isFocused, memoryPositions, memoryAnimatedValues, position.x, position.y, focusedX, focusedY, startX, startY, targetX, targetY, zoomProgress, colorScheme, memorySlideOffset, onPress, onMemoryFocus])}
    </>
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
  isFocused,
  isMemoryFocused,
  visibleMomentIds,
  calculateClampedPosition,
  cloudWidth,
  cloudHeight,
  sunWidth,
  sunHeight,
  memorySize,
  cloudPositions,
  sunPositions,
  position,
  memoryAnimatedPosition,
  avatarPanX,
  avatarPanY,
  focusedX,
  focusedY,
  offsetX,
  offsetY,
  cloudZIndex,
  sunZIndex,
  colorScheme,
  onDoubleTap,
  onUpdateMemory,
  newlyCreatedMoments,
  memory,
}: {
  clouds: any[];
  suns: any[];
  isFocused: boolean;
  isMemoryFocused: boolean;
  visibleMomentIds: Set<string>;
  calculateClampedPosition: (savedX: number | undefined, savedY: number | undefined, momentWidth: number, momentHeight: number, index: number, totalCount: number, memorySize: number, momentType: 'cloud' | 'sun') => { x: number; y: number };
  cloudWidth: number;
  cloudHeight: number;
  sunWidth: number;
  sunHeight: number;
  memorySize: number;
  cloudPositions: { angle: number; offsetX: number; offsetY: number }[];
  sunPositions: { angle: number; offsetX: number; offsetY: number }[];
  position: { x: number; y: number };
  memoryAnimatedPosition: any;
  avatarPanX?: any;
  avatarPanY?: any;
  focusedX?: any;
  focusedY?: any;
  offsetX: number;
  offsetY: number;
  cloudZIndex: number;
  sunZIndex: number;
  colorScheme: 'light' | 'dark';
  onDoubleTap?: () => void;
  onUpdateMemory?: (updates: Partial<any>) => Promise<void>;
  newlyCreatedMoments: Map<string, { startX: number; startY: number }>;
  memory: any;
}) {
  const fontScale = useFontScale();
  const { isTablet } = useLargeDevice();
  
  // Memoize filtered clouds - must be called unconditionally
  const filteredClouds = useMemo(() => {
    if (!isFocused) return [];
    return clouds.filter((cloud: any) => {
      // When memory is focused, only show visible moments
      if (isMemoryFocused) {
        return cloud?.id && visibleMomentIds.has(cloud.id);
      }
      return true;
    });
  }, [isFocused, clouds, isMemoryFocused, visibleMomentIds]);
  
  // Memoize cloud elements
  const cloudElements = useMemo(() => {
    if (!isFocused) return null;
    
    return filteredClouds.map((cloud: any, cloudIndex: number) => {
        // Additional safety check
        if (!cloud || typeof cloud !== 'object') {
          return null;
        }
        
        // When memory is focused, use saved positions from memory data
        // Otherwise use calculated positions
        if (isMemoryFocused) {
          // Calculate and clamp position to ensure it's within viewport and well distributed
          const clampedPos = calculateClampedPosition(
            cloud.x,
            cloud.y,
            cloudWidth,
            cloudHeight,
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
          return (
            <DraggableMoment
              key={`cloud-focused-${cloud?.id || cloudIndex}`}
              initialX={cloudX}
              initialY={cloudY}
              width={cloudWidth}
              height={cloudHeight}
              zIndex={cloudZIndex}
              onPositionChange={handlePositionChange}
              onPress={onDoubleTap}
              entranceDelay={startPos ? 0 : cloudIndex * 100} // No delay for newly created moments
              startX={startPos?.startX}
              startY={startPos?.startY}
            >
              <View
                style={{
                  width: cloudWidth,
                  height: cloudHeight,
                  // Dark glow for clouds (negative moments)
                  shadowColor: '#4A5568',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.7,
                  shadowRadius: isTablet ? 10 : 7,
                  elevation: 8,
                }}
              >
              <Svg
                width={cloudWidth}
                height={cloudHeight}
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
                  width: cloudWidth,
                  height: cloudHeight,
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
        
        const memoryCenterX = position.x;
        const memoryCenterY = position.y;
        const initialCloudPos = {
          x: memoryCenterX + cloudPosData.offsetX,
          y: memoryCenterY + cloudPosData.offsetY,
        };
        
        return (
          <FloatingCloud
            key={`cloud-${cloud?.id || cloudIndex}-${cloudIndex}`}
            cloud={cloud}
            position={initialCloudPos}
            memoryAnimatedPosition={memoryAnimatedPosition}
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
          />
        );
    });
  }, [isFocused, filteredClouds, calculateClampedPosition, cloudWidth, cloudHeight, memorySize, cloudPositions, position, memoryAnimatedPosition, avatarPanX, avatarPanY, focusedX, focusedY, offsetX, offsetY, cloudZIndex, colorScheme, onDoubleTap, onUpdateMemory, newlyCreatedMoments, memory, clouds.length, isMemoryFocused]);
  
  // Memoize filtered suns - must be called unconditionally
  const filteredSuns = useMemo(() => {
    if (!isFocused) return [];
    return suns.filter((sun: any) => {
      // When memory is focused, only show visible moments
      if (isMemoryFocused) {
        return sun?.id && visibleMomentIds.has(sun.id);
      }
      return true;
    });
  }, [isFocused, suns, isMemoryFocused, visibleMomentIds]);
  
  // Memoize sun elements
  const sunElements = useMemo(() => {
    if (!isFocused) return null;
    
    return filteredSuns.map((sun: any, sunIndex: number) => {
        // When memory is focused, use saved positions from memory data
        if (isMemoryFocused) {
          // Calculate and clamp position to ensure it's within viewport and well distributed
          const clampedPos = calculateClampedPosition(
            sun.x,
            sun.y,
            sunWidth,
            sunHeight,
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
          return (
            <DraggableMoment
              key={`sun-focused-${sun.id}`}
              initialX={sunX}
              initialY={sunY}
              width={sunWidth}
              height={sunHeight}
              zIndex={sunZIndex}
              onPositionChange={handlePositionChange}
              onPress={onDoubleTap}
              entranceDelay={startPos ? 0 : sunIndex * 100} // No delay for newly created moments
              startX={startPos?.startX}
              startY={startPos?.startY}
            >
              <View
                style={{
                  width: sunWidth,
                  height: sunHeight,
                  // Golden glow for suns (positive moments)
                  shadowColor: '#FFD700',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: isTablet ? 12 : 9,
                  elevation: 10,
                }}
              >
              <Svg
                width={sunWidth}
                height={sunHeight}
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
                  width: sunWidth,
                  height: sunHeight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  // Calculate padding based on sun circle radius to ensure text fits inside
                  // Sun radius in viewBox is 48, viewBox is 160, so actual radius = (sunWidth / 160) * 48
                  paddingHorizontal: (sunWidth / 160) * 48 * 0.6, // 60% of radius for safe padding
                  paddingVertical: (sunHeight / 160) * 48 * 0.4, // 40% of radius for vertical padding
                }}
              >
                <ThemedText
                  style={{
                    color: 'black',
                    fontSize: 12 * fontScale, // Smaller font size to ensure text fits inside
                    textAlign: 'center',
                    fontWeight: '700',
                    // Max width should be less than circle diameter minus padding
                    //maxWidth: (sunWidth / 160) * 48 * 1.6, // 80% of diameter to ensure text fits
                  }}
                  numberOfLines={2}
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
                      maxWidth: (sunWidth / 160) * 48 * 1.6, // Same max width
                    }}
                    numberOfLines={1}
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
        const memoryCenterX = position.x;
        const memoryCenterY = position.y;
        const initialSunPos = {
          x: memoryCenterX + sunPosData.offsetX,
          y: memoryCenterY + sunPosData.offsetY,
        };
        
        return (
          <FloatingSun
            key={`sun-${sun.id}-${sunIndex}`}
            sun={sun}
            position={initialSunPos}
            memoryAnimatedPosition={memoryAnimatedPosition}
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
          />
        );
    });
  }, [isFocused, filteredSuns, isMemoryFocused, suns.length, calculateClampedPosition, sunWidth, sunHeight, memorySize, sunPositions, position, memoryAnimatedPosition, avatarPanX, avatarPanY, focusedX, focusedY, offsetX, offsetY, sunZIndex, colorScheme, onDoubleTap, onUpdateMemory, newlyCreatedMoments, memory, clouds.length]);
  
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
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.clouds.length === nextProps.clouds.length &&
    prevProps.suns.length === nextProps.suns.length &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.isMemoryFocused === nextProps.isMemoryFocused &&
    prevProps.visibleMomentIds.size === nextProps.visibleMomentIds.size &&
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
  setCloudButtonPos,
  setSunButtonPos,
  handleAddCloud,
  handleAddSun,
}: {
  isMemoryFocused: boolean;
  memory: any;
  visibleMomentIds: Set<string>;
  memorySize: number;
  isLargeDevice: boolean;
  colorScheme: 'light' | 'dark';
  cloudButtonRef: React.RefObject<View | null>;
  sunButtonRef: React.RefObject<View | null>;
  setCloudButtonPos: (pos: { x: number; y: number } | null) => void;
  setSunButtonPos: (pos: { x: number; y: number } | null) => void;
  handleAddCloud: () => void;
  handleAddSun: () => void;
}) {
  const t = useTranslate();
  // Memoize these calculations - must be called unconditionally
  const allClouds = useMemo(() => (memory.hardTruths || []).filter((truth: any) => truth && typeof truth === 'object' && !Array.isArray(truth)), [memory.hardTruths]);
  const allSuns = useMemo(() => (memory.goodFacts || []).filter((fact: any) => fact && typeof fact === 'object'), [memory.goodFacts]);
  const visibleCloudsCount = useMemo(() => allClouds.filter((c: any) => c?.id && visibleMomentIds.has(c.id)).length, [allClouds, visibleMomentIds]);
  const visibleSunsCount = useMemo(() => allSuns.filter((s: any) => s?.id && visibleMomentIds.has(s.id)).length, [allSuns, visibleMomentIds]);
  
  if (!isMemoryFocused) return null;
  const totalCloudsCount = allClouds.length;
  const totalSunsCount = allSuns.length;
  const allCloudsVisible = totalCloudsCount > 0 && visibleCloudsCount >= totalCloudsCount;
  const allSunsVisible = totalSunsCount > 0 && visibleSunsCount >= totalSunsCount;
  
  // Calculate position below memory image (moved higher to match memory)
  const offsetY = 120;
  const memoryCenterY = SCREEN_HEIGHT / 2 - offsetY;
  const memoryBottom = memoryCenterY + memorySize / 2;
  const buttonSpacing = isLargeDevice ? 12 : 10;
  const buttonSize = isLargeDevice ? 96 : 88;
  const labelWidth = 100;
  const totalWidth = buttonSize + buttonSpacing + labelWidth + buttonSpacing + buttonSize;
  const containerTop = memoryBottom + 140; // 140px spacing below memory (moved lower)
  const colors = Colors[colorScheme ?? 'dark'];
  
  return (
    <>
      {/* Container for buttons and label */}
      <View
        style={{
          position: 'absolute',
          top: containerTop,
          left: SCREEN_WIDTH / 2 - totalWidth / 2,
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 2000,
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
        >
        <Pressable
          onPress={handleAddCloud}
          disabled={allCloudsVisible}
        >
        <View
          style={{
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
          }}
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
            {/* Count badge - horizontal bar at bottom of circle */}
            {totalCloudsCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 2,
                  right: 2,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000000',
                  borderBottomLeftRadius: isLargeDevice ? 48 : 44,
                  borderBottomRightRadius: isLargeDevice ? 48 : 44,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <ThemedText
                  style={{
                    fontSize: isLargeDevice ? 12 : 11,
                    fontWeight: '600',
                    color: '#FFFFFF',
                    textAlign: 'center',
                  }}
                >
                  {visibleCloudsCount}/{totalCloudsCount}
                </ThemedText>
              </View>
            )}
          </LinearGradient>
        </View>
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
    >
        <Pressable
          onPress={handleAddSun}
          disabled={allSunsVisible || totalSunsCount === 0}
        >
        <View
          style={{
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
            opacity: (allSunsVisible || totalSunsCount === 0) ? 0.4 : 1,
          }}
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
            {/* Count badge - horizontal bar at bottom of circle - always show, even if 0/0 */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 2,
                right: 2,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000000',
                borderBottomLeftRadius: isLargeDevice ? 48 : 44,
                borderBottomRightRadius: isLargeDevice ? 48 : 44,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <ThemedText
                style={{
                  fontSize: isLargeDevice ? 12 : 11,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                {visibleSunsCount}/{totalSunsCount}
              </ThemedText>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
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
  isFocused: boolean;
  colorScheme: 'light' | 'dark';
  calculatedMemorySize?: number;
  onDoubleTap?: () => void;
  isMemoryFocused?: boolean;
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  onUpdateMemory?: (updates: Partial<any>) => Promise<void>;
  onPress?: () => void;
  onMemoryFocus?: (entityId: string, memoryId: string, sphere?: LifeSphere) => void;
  zoomProgress?: ReturnType<typeof useSharedValue<number>>;
  avatarStartX?: ReturnType<typeof useSharedValue<number>>;
  avatarStartY?: ReturnType<typeof useSharedValue<number>>;
  avatarTargetX?: number;
  avatarTargetY?: number;
  avatarPosition?: { x: number; y: number };
  focusedMemory?: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere } | null;
}) {
  const { isLargeDevice, isTablet } = useLargeDevice();
  const colors = Colors[colorScheme ?? 'dark'];
  
  // Track which moments are visible (initially none when memory is focused)
  const [visibleMomentIds, setVisibleMomentIds] = React.useState<Set<string>>(new Set());
  
  // Track newly created moments with their start positions
  const [newlyCreatedMoments, setNewlyCreatedMoments] = React.useState<Map<string, { startX: number; startY: number }>>(new Map());
  
  // Track button positions for animation
  const cloudButtonRef = React.useRef<View>(null);
  const sunButtonRef = React.useRef<View>(null);
  const [cloudButtonPos, setCloudButtonPos] = React.useState<{ x: number; y: number } | null>(null);
  const [sunButtonPos, setSunButtonPos] = React.useState<{ x: number; y: number } | null>(null);
  
  // Reset visible moments when memory focus changes
  React.useEffect(() => {
    if (isMemoryFocused) {
      // When memory becomes focused, hide all moments initially
      setVisibleMomentIds(new Set());
    } else {
      // When memory loses focus, show all moments again
      const allIds = new Set<string>();
      (memory.hardTruths || []).forEach((truth: any) => truth?.id && allIds.add(truth.id));
      (memory.goodFacts || []).forEach((fact: any) => fact?.id && allIds.add(fact.id));
      setVisibleMomentIds(allIds);
    }
  }, [isMemoryFocused, memory.hardTruths, memory.goodFacts]);
  
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
  
  // Helper function to calculate and clamp moment position within viewport
  // Distributes moments evenly across the entire screen for better visibility
  const calculateClampedPosition = useMemo(() => {
    return (savedX: number | undefined, savedY: number | undefined, momentWidth: number, momentHeight: number, index: number, totalCount: number, memorySize: number, momentType: 'cloud' | 'sun' = 'sun') => {
      const memoryCenterX = SCREEN_WIDTH / 2;
      const memoryCenterY = SCREEN_HEIGHT / 2 - 120; // Moved higher to match memory position
      const padding = 20; // Padding from edges
      const headerSafeZone = 120; // Safe zone from top to avoid header and back button
      const minX = padding + momentWidth / 2;
      const maxX = SCREEN_WIDTH - padding - momentWidth / 2;
      const minY = headerSafeZone + momentHeight / 2; // Ensure moments don't overlap header
      const maxY = SCREEN_HEIGHT - padding - momentHeight / 2;
      const availableWidth = maxX - minX;
      
      let momentX: number | undefined = undefined;
      let momentY: number | undefined = undefined;
      
      // Special positioning for clouds: place them just above and just below the memory image
      if (momentType === 'cloud') {
        const memoryBottom = memoryCenterY + (memorySize / 2);
        const memoryTop = memoryCenterY - (memorySize / 2);
        const cloudSpacing = 60; // Distance from memory edge
        const cloudYBelow = memoryBottom + cloudSpacing + momentHeight / 2;
        
        // Split clouds between above and below
        const cloudsAbove = Math.ceil(totalCount / 2);
        const cloudsBelow = totalCount - cloudsAbove;
        
        let targetX: number;
        let targetY: number;
        
        if (index < cloudsAbove) {
          // Place above memory, but ensure it's below header safe zone
          const aboveIndex = index;
          const spacing = availableWidth / Math.max(1, cloudsAbove - 1);
          targetX = minX + (aboveIndex * spacing);
          // Use a safe zone above memory, clamped to not go into header
          const safeAboveZone = memoryTop - 40; // Safe distance above memory
          targetY = Math.max(minY, safeAboveZone);
        } else {
          // Place below memory
          const belowIndex = index - cloudsAbove;
          const spacing = availableWidth / Math.max(1, cloudsBelow - 1);
          targetX = minX + (belowIndex * spacing);
          targetY = cloudYBelow;
        }
        
        momentX = savedX !== undefined ? Math.max(minX, Math.min(maxX, savedX)) : targetX;
        // Clamp Y to ensure it doesn't go into header area or below screen
        momentY = savedY !== undefined 
          ? Math.max(minY, Math.min(maxY, savedY))
          : Math.max(minY, Math.min(maxY, targetY));
      } else {
        // Sun positioning: 70% below memory, 30% above
        const memoryBottom = memoryCenterY + (memorySize / 2);
        const memoryTop = memoryCenterY - (memorySize / 2);
        const belowMemoryStart = memoryBottom + 40;
        const belowMemoryEnd = maxY;
        const aboveMemoryStart = minY; // Already respects header safe zone
        const aboveMemoryEnd = Math.max(minY, memoryTop - 40); // Ensure it doesn't go into header area
        
        const sunsBelow = Math.floor(totalCount * 0.7);
        const sunsAbove = totalCount - sunsBelow;
        
        let targetX: number;
        let targetY: number;
        
        if (index < sunsBelow) {
          // Place below memory (70%)
          const belowIndex = index;
          const spacing = availableWidth / Math.max(1, sunsBelow - 1);
          targetX = minX + (belowIndex * spacing);
          // Distribute evenly in the below region
          const belowSpacing = (belowMemoryEnd - belowMemoryStart) / Math.max(1, sunsBelow - 1);
          targetY = belowMemoryStart + (belowIndex * belowSpacing);
        } else {
          // Place above memory (30%)
          const aboveIndex = index - sunsBelow;
          const spacing = availableWidth / Math.max(1, sunsAbove - 1);
          targetX = minX + (aboveIndex * spacing);
          // Distribute evenly in the above region
          const aboveSpacing = (aboveMemoryEnd - aboveMemoryStart) / Math.max(1, sunsAbove - 1);
          targetY = aboveMemoryStart + (aboveIndex * aboveSpacing);
        }
        
        momentX = savedX !== undefined ? Math.max(minX, Math.min(maxX, savedX)) : targetX;
        momentY = savedY !== undefined ? Math.max(minY, Math.min(maxY, savedY)) : targetY;
      }
      
      return { x: momentX, y: momentY };
    };
  }, []);
  
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
  }, [floatAnimation, isMemoryFocused]);

  // Calculate memory position relative to avatar or center when memory is focused
  // Use the same interpolation logic as the avatar for smooth zoom transitions
  const memoryAnimatedPosition = useAnimatedStyle(() => {
    'worklet';
    if (isMemoryFocused) {
      // When memory is focused, center it on screen (moved higher)
      // Positive offsetY moves UP (subtracted from center)
      const offsetY = 120;
      return {
        left: SCREEN_WIDTH / 2 - memorySize / 2,
        top: SCREEN_HEIGHT / 2 - memorySize / 2 - offsetY,
      };
    }

    // Use zoom interpolation if available (for smooth zoom-in/out transitions)
    if (zoomProgress && avatarStartX && avatarStartY && avatarTargetX !== undefined && avatarTargetY !== undefined && avatarPosition) {
      let avatarCurrentX: number;
      let avatarCurrentY: number;

      if (isFocused) {
        // Zoom-in: interpolate from start position to center
        avatarCurrentX = avatarStartX.value + (avatarTargetX - avatarStartX.value) * zoomProgress.value;
        avatarCurrentY = avatarStartY.value + (avatarTargetY - avatarStartY.value) * zoomProgress.value;
      } else {
        // Zoom-out: interpolate from center back to original position
        avatarCurrentX = avatarTargetX + (avatarPosition.x - avatarTargetX) * (1 - zoomProgress.value);
        avatarCurrentY = avatarTargetY + (avatarPosition.y - avatarTargetY) * (1 - zoomProgress.value);
      }

      // Position memory relative to interpolated avatar position
      return {
        left: avatarCurrentX + offsetX - memorySize / 2,
        top: avatarCurrentY + offsetY - memorySize / 2,
      };
    }

    // Primary source: use focusedX/focusedY when available (they animate during zoom-in/out and drag)
    // This ensures a single source of truth for position
    if (focusedX && focusedY) {
      return {
        left: focusedX.value + offsetX - memorySize / 2,
        top: focusedY.value + offsetY - memorySize / 2,
      };
    }

    // Fallback to pan position only if focusedX/focusedY are not available
    if (avatarPanX && avatarPanY) {
      return {
        left: avatarPanX.value + offsetX - memorySize / 2,
        top: avatarPanY.value + offsetY - memorySize / 2,
      };
    }

    return {};
  }, [isMemoryFocused, memorySize, zoomProgress, avatarStartX, avatarStartY, avatarTargetX, avatarTargetY, avatarPosition, isFocused, focusedX, focusedY, offsetX, offsetY, avatarPanX, avatarPanY]);
  
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

  // Calculate sunny percentage for gradient overlay
  const sunnyPercentage = useMemo(() => {
    const totalClouds = clouds.length;
    const totalSuns = suns.length;
    const total = totalClouds + totalSuns;
    if (total === 0) return 50; // Neutral if no moments
    return (totalSuns / total) * 100;
  }, [clouds.length, suns.length]);
  
  // Determine if memory is "sunny" (more good facts than hard truths) or "cloudy" (more hard truths than good facts)
  const isSunny = suns.length > clouds.length;
  const isCloudy = clouds.length > suns.length;
  const hasMoments = clouds.length + suns.length > 0;

  // Calculate cloud and sun positions relative to memory
  // Distribute all moments evenly around the circle, interleaving clouds and suns
  const { cloudPositions, sunPositions } = useMemo(() => {
    const totalMoments = clouds.length + suns.length;
    if (totalMoments === 0) {
      return { cloudPositions: [], sunPositions: [] };
    }
    
    // Use Bresenham-like algorithm to distribute clouds and suns evenly
    // This ensures they're interleaved proportionally without overlaps
    const cloudPositionsResult: { angle: number; offsetX: number; offsetY: number }[] = [];
    const sunPositionsResult: { angle: number; offsetX: number; offsetY: number }[] = [];
    
    let cloudError = 0;
    let sunError = 0;
    let cloudIndex = 0;
    let sunIndex = 0;
    
    // Distribute positions using error accumulation (Bresenham-like)
    for (let position = 0; position < totalMoments; position++) {
      // Calculate error for both types
      cloudError += clouds.length;
      sunError += suns.length;
      
      // Choose the one with higher error (needs placement more)
      if (cloudIndex < clouds.length && (sunIndex >= suns.length || cloudError >= sunError)) {
        const angle = (position * 2 * Math.PI) / totalMoments;
        cloudPositionsResult.push({
          angle,
          offsetX: cloudRadius * Math.cos(angle),
          offsetY: cloudRadius * Math.sin(angle),
        });
        cloudIndex++;
        cloudError -= totalMoments;
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
    
    return { cloudPositions: cloudPositionsResult, sunPositions: sunPositionsResult };
  }, [clouds, suns, cloudRadius, sunRadius]);

  // Click on memory: focus the memory (and profile if not already focused)
  const handlePress = () => {
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
  };

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
        style={[
          baseStyle,
          memoryAnimatedPosition,
          animatedStyle,
          slideOutStyle,
          focusedMemoryStyle,
        ]}
      >
        <Pressable
          style={{ 
            pointerEvents: 'auto', // Ensure Pressable can receive touches
            width: memorySize,
            height: memorySize,
          }}
          onPress={handlePress}
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
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
              elevation: 5,
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
      </Animated.View>

      {/* Calculate z-index based on which type has more moments */}
      {(() => {
        const cloudCount = clouds.length;
        const sunCount = suns.length;
        const cloudsOnTop = cloudCount > sunCount;
        // Moments should be on top of memories
        // When memory is focused, use much higher z-index to be above the memory (which has zIndex 1000)
        const baseZIndex = isMemoryFocused ? 1001 : 20;
        const cloudZIndex = cloudsOnTop ? baseZIndex + 5 : baseZIndex + 4; // Higher than memories so moments are visible on top
        const sunZIndex = cloudsOnTop ? baseZIndex + 4 : baseZIndex + 5; // Higher than memories so moments are visible on top
        
        
        return (
          <MemoryMomentsRenderer
            clouds={clouds}
            suns={suns}
            isFocused={isFocused}
            isMemoryFocused={isMemoryFocused ?? false}
            visibleMomentIds={visibleMomentIds}
            calculateClampedPosition={calculateClampedPosition}
            cloudWidth={cloudWidth}
            cloudHeight={cloudHeight}
            sunWidth={sunWidth}
            sunHeight={sunHeight}
            memorySize={memorySize}
            cloudPositions={cloudPositions}
            sunPositions={sunPositions}
            position={position}
            memoryAnimatedPosition={memoryAnimatedPosition}
            avatarPanX={avatarPanX}
            avatarPanY={avatarPanY}
            focusedX={focusedX}
            focusedY={focusedY}
            offsetX={offsetX}
            offsetY={offsetY}
            cloudZIndex={cloudZIndex}
            sunZIndex={sunZIndex}
            colorScheme={colorScheme}
            onDoubleTap={onDoubleTap}
            onUpdateMemory={onUpdateMemory}
            newlyCreatedMoments={newlyCreatedMoments}
            memory={memory}
          />
        );
      })()}
      
      {/* Cloud and Sun Buttons - only show when memory is focused */}
      <MemoryActionButtons
        isMemoryFocused={isMemoryFocused ?? false}
        memory={memory}
        visibleMomentIds={visibleMomentIds}
        memorySize={memorySize}
        isLargeDevice={isLargeDevice}
        colorScheme={colorScheme}
        cloudButtonRef={cloudButtonRef}
        sunButtonRef={sunButtonRef}
        setCloudButtonPos={setCloudButtonPos}
        setSunButtonPos={setSunButtonPos}
        handleAddCloud={handleAddCloud}
        handleAddSun={handleAddSun}
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
}: {
  cloud: any;
  position: { x: number; y: number };
  memoryAnimatedPosition?: any;
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
  }, [floatAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
  }));

  const cloudAnimatedPosition = useAnimatedStyle(() => {
    // When focused, use focusedX/focusedY; when dragging, use avatarPanX/avatarPanY
    if (isFocused && focusedX && focusedY) {
      // Calculate from focused avatar position: focused + memory offset + cloud offset
      const cloudX = focusedX.value + memoryOffsetX + offsetX;
      const cloudY = focusedY.value + memoryOffsetY + offsetY;
      // Check for valid numbers
      if (isNaN(cloudX) || isNaN(cloudY)) {
        // Fallback to position if calculation results in NaN
      } else {
        return {
          left: cloudX - cloudSize / 2,
          top: cloudY - cloudSize / 2,
        };
      }
    }
    if (avatarPanX && avatarPanY) {
      // Calculate from avatar position: avatar + memory offset + cloud offset
      const cloudX = avatarPanX.value + memoryOffsetX + offsetX;
      const cloudY = avatarPanY.value + memoryOffsetY + offsetY;
      // Check for valid numbers
      if (isNaN(cloudX) || isNaN(cloudY)) {
        // Fallback to position if calculation results in NaN
      } else {
        return {
          left: cloudX - cloudSize / 2,
          top: cloudY - cloudSize / 2,
        };
      }
    }
    // When memory is focused but no avatar position, use the position prop directly
    // This handles the case when memory is focused independently
    // Position is already relative to screen center, so use it directly
    // For focused memory, position is already at screen center, so we use it as-is
    const safeX = typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 0;
    const safeY = typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 0;
    const finalX = safeX - cloudSize / 2;
    const finalY = safeY - cloudSize / 2;
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
      style={[
        {
          position: 'absolute',
          zIndex: typeof zIndex === 'number' ? zIndex : 24, // Higher than memories (20) so moments are on top
          pointerEvents: 'box-none', // Allow touches to pass through to Pressable
        },
        cloudAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        style={{ 
          pointerEvents: 'auto', // Ensure Pressable can receive touches
          width: safeCloudSize,
          height: safeCloudSize,
        }}
        onPress={() => {
          if (onPress) {
            try {
              onPress();
            } catch (error) {
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
            elevation: 4,
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
}: {
  sun: any;
  position: { x: number; y: number };
  memoryAnimatedPosition?: any;
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
  }, [floatAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 2 },
      { scale: scale.value },
    ],
  }));

  const sunAnimatedPosition = useAnimatedStyle(() => {
    // When focused, use focusedX/focusedY; when dragging, use avatarPanX/avatarPanY
    if (isFocused && focusedX && focusedY) {
      // Calculate from focused avatar position: focused + memory offset + sun offset
      const sunX = focusedX.value + memoryOffsetX + offsetX;
      const sunY = focusedY.value + memoryOffsetY + offsetY;
      // Check for valid numbers
      if (isNaN(sunX) || isNaN(sunY)) {
        // Fallback to position if calculation results in NaN
      } else {
        return {
          left: sunX - sunSize / 2,
          top: sunY - sunSize / 2,
        };
      }
    }
    if (avatarPanX && avatarPanY) {
      // Calculate from avatar position: avatar + memory offset + sun offset
      const sunX = avatarPanX.value + memoryOffsetX + offsetX;
      const sunY = avatarPanY.value + memoryOffsetY + offsetY;
      // Check for valid numbers
      if (isNaN(sunX) || isNaN(sunY)) {
        // Fallback to position if calculation results in NaN
      } else {
        return {
          left: sunX - sunSize / 2,
          top: sunY - sunSize / 2,
        };
      }
    }
    // When memory is focused but no avatar position, use the position prop directly
    // This handles the case when memory is focused independently
    const safeX = typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 0;
    const safeY = typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 0;
    return {
      left: safeX - sunSize / 2,
      top: safeY - sunSize / 2,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          zIndex: typeof zIndex === 'number' ? zIndex : 24, // Higher than memories (20) so moments are on top
          pointerEvents: 'box-none', // Allow touches to pass through to Pressable
        },
        sunAnimatedPosition,
        animatedStyle,
      ]}
    >
      <Pressable
        style={{ pointerEvents: 'auto' }} // Ensure Pressable can receive touches
        onPress={() => {
          if (onPress) {
            try {
              onPress();
            } catch (error) {
              // Error in onPress
            }
          }
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
  
  // Calculate if floating entities intersect with main circle and adjust size accordingly
  // Floating entities are positioned: spherePosition + (cos(angle) * entityRadius, sin(angle) * entityRadius)
  // Where spherePosition is at distance Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3 from center
  // And entityRadius is isTablet ? 85 : 55 (larger on tablets by default)
  // Floating entity size is isTablet ? 36 : 24, so radius is isTablet ? 18 : 12
  const sphereDistanceFromCenter = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3;
  const floatingEntityRadius = isTablet ? 85 : 55;
  const floatingEntitySize = isTablet ? 36 : 24;
  const floatingEntityRadiusSize = floatingEntitySize / 2;
  
  // Calculate minimum distance from main center to floating entity edge
  // This happens when the floating entity is positioned closest to center (on the line from center to sphere)
  const minDistanceToFloatingEntity = sphereDistanceFromCenter - floatingEntityRadius - floatingEntityRadiusSize;
  
  // Base avatar size
  const baseAvatarSize = isTablet ? 180 : 120;
  const baseAvatarRadius = baseAvatarSize / 2;
  
  // Check if main circle (with some padding) would intersect floating entities
  // Add 5px padding to ensure clear separation
  const padding = 5;
  const maxSafeAvatarRadius = minDistanceToFloatingEntity - padding;
  
  // Use smaller size if intersection detected, otherwise use base size
  const avatarSize = maxSafeAvatarRadius < baseAvatarRadius 
    ? Math.max(maxSafeAvatarRadius * 2, isTablet ? 140 : 90) // Minimum size to ensure readability
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
      <ThemedText size="xl" weight="bold" style={{ color: colors.primaryLight, fontSize: 32 }}>
        {Math.round(percentage)}%
      </ThemedText>
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
  avatarCenterX: number | Animated.SharedValue<number>;
  avatarCenterY: number | Animated.SharedValue<number>;
  colorScheme: 'light' | 'dark';
  fullScreen?: boolean;
}) {
  const { isTablet } = useLargeDevice();

  // Check if we're using animated values
  const isAnimated = typeof avatarCenterX === 'object' && 'value' in avatarCenterX;
  
  // Extract static values for initial calculation (or use directly if not animated)
  const staticCenterX = isAnimated ? (avatarCenterX as ReturnType<typeof useSharedValue<number>>).value : avatarCenterX;
  const staticCenterY = isAnimated ? (avatarCenterY as ReturnType<typeof useSharedValue<number>>).value : avatarCenterY;

  // Generate random positions for dots around the avatar
  // Create more dots with better visibility
  const dots = React.useMemo(() => {
    // Always generate center dots around avatar/spheres (main concentration)
    const numDotsCenter = isTablet ? 35 : 25; // Main dots in center
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
      // Add just a few dots at top and bottom when fullScreen mode is enabled
      const numDotsTop = isTablet ? 4 : 3; // Few dots at top
      const numDotsBottom = isTablet ? 4 : 3; // Few dots at bottom
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
  avatarCenterX: number | Animated.SharedValue<number>;
  avatarCenterY: number | Animated.SharedValue<number>;
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
      totalSuns += (memory.goodFacts || []).length;
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
    
    if (delay > 0) {
      const timer = setTimeout(startAnimation, delay);
      return () => clearTimeout(timer);
    } else {
      startAnimation();
    }
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
          position: 'absolute',
          left: position.x - size / 2,
          top: position.y - size / 2,
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
}) {
  const { isTablet } = useLargeDevice();
  const sphereSize = isTablet ? 120 : 80; // 50% larger on tablets
  
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
    
    // Start animation with delay
    if (delay > 0) {
      const timer = setTimeout(startAnimation, delay);
      return () => clearTimeout(timer);
    } else {
      startAnimation();
    }
  }, [sphere, floatAnimation, animationDelays, animationDurations, selectedSphere]);

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
    
    return {
      transform: [
        { scale },
        { translateY: floatY },
      ],
      opacity,
    };
  });

  // Get glow color based on sphere type
  const glowColor = React.useMemo(() => {
    switch (sphere) {
      case 'relationships':
        return '#ff6b6b'; // Red glow for relationships
      case 'career':
        return '#4dabf7'; // Blue glow for career
      case 'family':
        return '#51cf66'; // Green glow for family
      case 'friends':
        return '#9775fa'; // Purple glow for friends
      case 'hobbies':
        return '#ff922b'; // Orange glow for hobbies
      default:
        return '#4dabf7';
    }
  }, [sphere]);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        position: 'absolute',
        left: position.x - sphereSize / 2,
        top: position.y - sphereSize / 2,
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
            shadowColor: colorScheme === 'dark' ? glowColor : '#000',
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
      </Animated.View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { isTablet } = useLargeDevice();
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
    getEntitiesBySphere,
    getOverallSunnyPercentage,
    reloadIdealizedMemories,
    reloadProfiles,
    reloadJobs,
    reloadFamilyMembers,
    reloadFriends,
    reloadHobbies,
  } = useJourney();
  const t = useTranslate();

  // Streak feature state
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [currentBadge, setCurrentBadge] = useState<StreakBadge | null>(null);
  const [nextBadge, setNextBadge] = useState<StreakBadge | null>(null);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [streakRulesModalVisible, setStreakRulesModalVisible] = useState(false);

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
      console.error('[HomeScreen] Error loading streak data:', error);
    }
  }, []);

  // Load streak data on mount
  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);


  // Redirect to spheres tab if there's no data (first time user)
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    // Only check once after data has loaded
    if (isLoading || hasRedirectedRef.current) return;
    
    const totalEntities = profiles.length + jobs.length + familyMembers.length + friends.length + hobbies.length;
    const totalMemories = idealizedMemories.length;
    
    // If there's no data, the walkthrough will appear automatically
    // when the user navigates to the spheres tab (handled in spheres.tsx)
    // No need to redirect here - let the user navigate naturally
  }, [isLoading, profiles.length, jobs.length, familyMembers.length, friends.length, hobbies.length, idealizedMemories.length]);

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
  
  // Track selected sphere (null = showing all spheres, otherwise showing focused sphere)
  // Initialize from URL params if present
  const sphereParam = params.sphere && typeof params.sphere === 'string' && ['relationships', 'career', 'family', 'friends', 'hobbies'].includes(params.sphere) 
    ? (params.sphere as LifeSphere)
    : null;
  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(sphereParam);
  const previousSelectedSphereRef = React.useRef<LifeSphere | null>(null);
  const sphereRenderKeyRef = React.useRef<number>(0);
  
  // Track if home screen was already focused to detect when user presses home tab while already on home
  const isHomeFocusedRef = React.useRef<boolean>(false);
  const navigation = useNavigation();
  
  // Listen for tab press events using navigation listeners
  useFocusEffect(
    React.useCallback(() => {
      // Listen for tab press events
      const unsubscribe = navigation.addListener('tabPress', () => {
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
  const previousSphereForCleanup = React.useRef<LifeSphere | null>(null);
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
  
  // State to track if encouragement message is visible (toggled by clicking avatar)
  const [isEncouragementVisible, setIsEncouragementVisible] = useState(false);
  const previousEncouragementVisibleRef = useRef(false);
  const hasAutoShownRef = useRef(false); // Track if we've auto-shown the message on initial load
  
  // Animation values for encouraging message
  const encouragementOpacity = useSharedValue(0);
  const encouragementScale = useSharedValue(0);
  const encouragementTranslateX = useSharedValue(0);
  const encouragementTranslateY = useSharedValue(0);
  const encouragementGlow = useSharedValue(0);
  const isGoodMoments = overallSunnyPercentage > 50;
  
  // Animation value for avatar bounce
  const avatarBounceScale = useSharedValue(1);
  
  // Animated style for avatar bounce
  const avatarBounceStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: avatarBounceScale.value }],
    };
  });
  
  // Avatar center position for animation (using different names to avoid conflicts)
  const encouragementAvatarCenterX = SCREEN_WIDTH / 2;
  const encouragementAvatarCenterY = SCREEN_HEIGHT / 2 + 60;
  const messageTop = 100;
  const messageLeft = 20;
  const messageRight = 20;
  const messageCenterX = messageLeft + (SCREEN_WIDTH - messageLeft - messageRight) / 2;
  const messageCenterY = messageTop + 50; // Approximate center of message (top + half height)
  
  // Calculate translation from avatar center to message position
  const translateXFromAvatar = messageCenterX - encouragementAvatarCenterX;
  const translateYFromAvatar = messageCenterY - encouragementAvatarCenterY;
  
  // Animate encouragement message when visibility changes
  React.useEffect(() => {
    const wasVisible = previousEncouragementVisibleRef.current;
    const isNowVisible = isEncouragementVisible && hasAnyMoments;
    
    if (isNowVisible) {
      // Animate from avatar center: scale from 0, translate from avatar position
      encouragementOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      encouragementScale.value = withSpring(1, { damping: 20, stiffness: 200 }); // Less bouncy: higher damping, higher stiffness
      encouragementTranslateX.value = withSpring(translateXFromAvatar, { damping: 20, stiffness: 200 }); // Less bouncy
      encouragementTranslateY.value = withSpring(translateYFromAvatar, { damping: 20, stiffness: 200 }); // Less bouncy
      
      // Subtle glow pulse for good moments
      if (isGoodMoments) {
        encouragementGlow.value = withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      } else {
        encouragementGlow.value = 0;
      }
    } else {
      // Animate back to avatar center: scale to 0, translate back to avatar position
      const disappearDuration = 300;
      encouragementOpacity.value = withTiming(0, { duration: disappearDuration, easing: Easing.in(Easing.cubic) });
      encouragementScale.value = withTiming(0, { duration: disappearDuration, easing: Easing.in(Easing.cubic) });
      encouragementTranslateX.value = withTiming(0, { duration: disappearDuration, easing: Easing.in(Easing.cubic) });
      encouragementTranslateY.value = withTiming(0, { duration: disappearDuration, easing: Easing.in(Easing.cubic) });
      encouragementGlow.value = 0;
      
      // Trigger avatar bounce when message is dismissed (was visible, now hidden)
      // Start bounce near the end of the disappearing animation (at ~80% of the duration)
      if (wasVisible && !isNowVisible) {
        const bounceDelay = disappearDuration * 0.8; // Start bounce at 80% of disappear animation (240ms)
        avatarBounceScale.value = withDelay(
          bounceDelay,
          withSequence(
            withSpring(1.15, { damping: 8, stiffness: 300 }), // Bounce up
            withSpring(1, { damping: 10, stiffness: 200 })   // Bounce back
          )
        );
      }
    }
    
    // Update previous value
    previousEncouragementVisibleRef.current = isNowVisible;
  }, [isEncouragementVisible, hasAnyMoments, isGoodMoments, translateXFromAvatar, translateYFromAvatar, avatarBounceScale]);
  
  // Animated styles for encouragement message
  const encouragementAnimatedStyle = useAnimatedStyle(() => {
    const glowOpacity = isGoodMoments 
      ? 0.15 + (encouragementGlow.value * 0.1)
      : 0.05;
    
    return {
      opacity: encouragementOpacity.value,
      transform: [
        { translateX: encouragementTranslateX.value },
        { translateY: encouragementTranslateY.value },
        { scale: encouragementScale.value }
      ],
      shadowOpacity: glowOpacity,
    };
  });
  
  
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
  const spherePositions = useMemo(() => {
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2 + 60; // Lower the main circle and floating elements by 60px
    const radius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3; // Distance from center
    
    // 5 spheres evenly distributed around a circle
    // Start from top (-90 degrees) and distribute evenly: 360 / 5 = 72 degrees apart
    const numSpheres = 5;
    const angleStep = (2 * Math.PI) / numSpheres; // 72 degrees in radians
    const startAngle = -Math.PI / 2; // Start from top (-90 degrees)
    
    // Calculate positions for each sphere
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
  }, []);
  
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
      } catch (e) {
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
  const { isVisible: isSplashVisible, isAnimationComplete: isSplashAnimationComplete } = useSplash();
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
  
  // Auto-show encouragement message when splash animation completes and home screen is ready
  React.useEffect(() => {
    if (
      !hasAutoShownRef.current &&
      !isSplashVisible &&
      isSplashAnimationComplete &&
      animationsReady &&
      hasAnyMoments &&
      !selectedSphere // Only show on main home screen, not when a sphere is selected
    ) {
      // Small delay after splash completes to let everything settle
      const timer = setTimeout(() => {
        setIsEncouragementVisible(true);
        hasAutoShownRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSplashVisible, isSplashAnimationComplete, animationsReady, hasAnyMoments, selectedSphere]);
  
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
      } catch (error) {
        // Error loading avatar positions
      } finally {
        setPositionsLoaded(true);
      }
    };
    loadSavedPositions();
  }, []);

  // Calculate initial positions for avatars within their year sections
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
        
        // Distribute avatars evenly within the year section
        const sectionCenterY = yearSection.top + (yearSection.height / 2);
        const spacing = profilesInSection.length > 1 ? Math.min(yearSection.height * 0.6, 200) : 0;
        const startY = sectionCenterY - ((profilesInSection.length - 1) * spacing / 2);
        
        let position = {
          x: centerX,
          y: startY + (indexInSection * spacing),
        };
        
        // Clamp to year section bounds
        const avatarHalfSize = 40;
        const minMargin = 20; // Minimum margin from section edges
        position.x = Math.max(avatarHalfSize + minMargin, Math.min(SCREEN_WIDTH - avatarHalfSize - minMargin, position.x));
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
        positions.set(profile.id, {
          x: SCREEN_WIDTH / 2,
          y: yearSection.top + yearSection.height / 2,
        });
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
  
  // Update position for a profile and save to storage
  const updateAvatarPosition = React.useCallback(async (profileId: string, newPosition: { x: number; y: number }) => {
    setAvatarPositionsState((prev) => {
      const next = new Map(prev);
      next.set(profileId, newPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(AVATAR_POSITIONS_KEY, JSON.stringify(positionsObj)).catch(() => {
        // Error saving avatar positions
      });
      
      return next;
    });
  }, []);
  
  // Update position for a family member and save to storage
  const updateFamilyMemberPosition = React.useCallback(async (memberId: string, newPosition: { x: number; y: number }) => {
    setFamilyPositionsState((prev) => {
      const next = new Map(prev);
      next.set(memberId, newPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(FAMILY_POSITIONS_KEY, JSON.stringify(positionsObj)).catch(() => {
        // Error saving family positions
      });
      
      return next;
    });
  }, []);
  
  // Update position for a friend and save to storage
  const updateFriendPosition = React.useCallback(async (friendId: string, newPosition: { x: number; y: number }) => {
    setFriendPositionsState((prev) => {
      const next = new Map(prev);
      next.set(friendId, newPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(FRIEND_POSITIONS_KEY, JSON.stringify(positionsObj)).catch(() => {
        // Error saving friend positions
      });
      
      return next;
    });
  }, []);
  
  // Update position for a hobby and save to storage
  const updateHobbyPosition = React.useCallback(async (hobbyId: string, newPosition: { x: number; y: number }) => {
    setHobbyPositionsState((prev) => {
      const next = new Map(prev);
      next.set(hobbyId, newPosition);
      
      // Save to AsyncStorage asynchronously
      const positionsObj: Record<string, { x: number; y: number }> = {};
      next.forEach((pos, id) => {
        positionsObj[id] = pos;
      });
      AsyncStorage.setItem(HOBBY_POSITIONS_KEY, JSON.stringify(positionsObj)).catch(() => {
        // Error saving hobby positions
      });
      
      return next;
    });
  }, []);

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
          justifyContent: 'flex-start'
        },
      }),
    [colors.background, minHeight]
  );

  // Focused state management - must be at top level
  const [focusedProfileId, setFocusedProfileId] = useState<string | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [focusedFamilyMemberId, setFocusedFamilyMemberId] = useState<string | null>(null);
  const [focusedFriendId, setFocusedFriendId] = useState<string | null>(null);
  const [focusedHobbyId, setFocusedHobbyId] = useState<string | null>(null);
  const [focusedMemory, setFocusedMemory] = useState<{ profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere } | null>(null);
  
  // Shared values to track focused avatar positions for SparkledDots
  const focusedFamilyMemberPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedFamilyMemberPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 60);
  const focusedFriendPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedFriendPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 60);
  const focusedHobbyPositionX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedHobbyPositionY = useSharedValue(SCREEN_HEIGHT / 2 + 60);
  
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
      animateSlideOffset(careerSlideOffset, focusedJobId || (focusedMemory && focusedMemory.sphere === 'career'));
      
      // Family slideOffset
      animateSlideOffset(familySlideOffset, focusedFamilyMemberId || (focusedMemory && focusedMemory.sphere === 'family'));
      
      // Friends slideOffset
      animateSlideOffset(friendsSlideOffset, focusedFriendId || (focusedMemory && focusedMemory.sphere === 'friends'));
      
      // Hobbies slideOffset
      animateSlideOffset(hobbiesSlideOffset, focusedHobbyId || (focusedMemory && focusedMemory.sphere === 'hobbies'));
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
    
    const totalProfilesInSections = Array.from(grouped.values()).flat().length;
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
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'relationships') => {
            setFocusedMemory({ profileId: entityId, memoryId, sphere });
          }}
          yearSection={yearSection}
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
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'career') => {
            setFocusedMemory({ jobId: entityId, memoryId, sphere });
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
      
      // Get the family member's section to calculate original position
      const section = familyYearSections.get('all');
      let currentPosition: { x: number; y: number };
      
      if (isFocused || wasJustFocused) {
        // Calculate original position from section
        if (section) {
          const totalMembers = familyMembers.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing = totalMembers > 1 
            ? Math.max(minSpacing, Math.min(section.height / (totalMembers + 1), 250))
            : 0;
          currentPosition = {
            x: SCREEN_WIDTH / 2,
            y: totalMembers === 1
              ? sectionCenterY
              : section.top + verticalSpacing * (index + 1)
          };
        } else {
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
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'family') => {
            setFocusedMemory({ familyMemberId: entityId, memoryId, sphere });
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
  }, [animationsReady, focusedFamilyMemberId, focusedMemory, familyMembers, getIdealizedMemoriesByEntityId, familyYearSections, previousFocusedFamilyMemberIdRef, setFocusedFamilyMemberId, setFocusedMemory, colors, colorScheme, focusedFamilyMemberPositionX, focusedFamilyMemberPositionY]);

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
      if (!isFocused && !wasJustFocused) return null;
      
      // Get the friend's section to calculate original position
      const section = friendsYearSections.get('all');
      let currentPosition: { x: number; y: number };
      
      if (isFocused || wasJustFocused) {
        // Calculate original position from section
        if (section) {
          const totalFriends = friends.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing = totalFriends > 1 
            ? Math.max(minSpacing, Math.min(section.height / (totalFriends + 1), 250))
            : 0;
          currentPosition = {
            x: SCREEN_WIDTH / 2,
            y: totalFriends === 1
              ? sectionCenterY
              : section.top + verticalSpacing * (index + 1)
          };
        } else {
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
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'friends') => {
            setFocusedMemory({ friendId: entityId, memoryId, sphere });
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
  }, [animationsReady, focusedFriendId, focusedMemory, friends, getIdealizedMemoriesByEntityId, friendsYearSections, previousFocusedFriendIdRef, setFocusedFriendId, setFocusedMemory, colors, colorScheme, focusedFriendPositionX, focusedFriendPositionY]);

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
      
      // Get the hobby's section to calculate original position
      const section = hobbiesYearSections.get('all');
      let currentPosition: { x: number; y: number };
      
      if (isFocused || wasJustFocused) {
        // Calculate original position from section
        if (section) {
          const totalHobbies = hobbies.length;
          const sectionCenterY = section.top + section.height / 2;
          const minSpacing = 200;
          const verticalSpacing = totalHobbies > 1 
            ? Math.max(minSpacing, Math.min(section.height / (totalHobbies + 1), 250))
            : 0;
          currentPosition = {
            x: SCREEN_WIDTH / 2,
            y: totalHobbies === 1
              ? sectionCenterY
              : section.top + verticalSpacing * (index + 1)
          };
        } else {
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
          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'hobbies') => {
            setFocusedMemory({ hobbyId: entityId, memoryId, sphere });
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
  }, [animationsReady, focusedHobbyId, focusedMemory, hobbies, getIdealizedMemoriesByEntityId, hobbiesYearSections, previousFocusedHobbyIdRef, setFocusedHobbyId, setFocusedMemory, colors, colorScheme, focusedHobbyPositionX, focusedHobbyPositionY]);

  // Render sphere view - show all 3 spheres with memories floating around, center shows overall percentage
  // When a sphere is selected, show the entities for that sphere (like year sections for relationships)
  
  // Calculate avatar center coordinates for sparkled dots (always show on all screens)
  const avatarCenterX = SCREEN_WIDTH / 2;
  const avatarCenterY = SCREEN_HEIGHT / 2 + 60; // Lower the main circle by 60px
  const baseAvatarSize = isTablet ? 180 : 120;
  const avatarSizeForDots = baseAvatarSize; // Use base size for dots positioning
  
  if (!selectedSphere) {
  return (
    <TabScreenContainer>
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
          {hasAnyMoments && (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: encouragementAvatarCenterY,
                  left: encouragementAvatarCenterX,
                  width: SCREEN_WIDTH - 40, // left + right = 40
                  marginLeft: -(SCREEN_WIDTH - 40) / 2, // Center horizontally on avatar
                  marginTop: -25, // Center vertically on avatar (approximate message height / 2)
                  zIndex: 200,
                  paddingLeft: 24 * fontScale,
                  paddingRight: 42 * fontScale, // Extra padding for close button (28px button + 12px margin + 12px spacing)
                  paddingVertical: 18 * fontScale,
                  borderRadius: 16 * fontScale,
                  backgroundColor: colorScheme === 'dark'
                    ? 'rgba(26, 35, 50, 0.95)' // Semi-transparent dark background
                    : 'rgba(255, 255, 255, 0.95)', // Semi-transparent light background
                  // Enhanced elevated shadow effect
                  shadowColor: colorScheme === 'dark' ? '#64B5F6' : '#000',
                  shadowOffset: { width: 0, height: isTablet ? 8 : 6 },
                  shadowOpacity: colorScheme === 'dark' ? 0.8 : 0.3,
                  shadowRadius: isTablet ? 20 : 16,
                  elevation: 12, // For Android - elevated effect
                },
                encouragementAnimatedStyle,
              ]}
            >
              {/* Close button */}
              <Pressable
                onPress={() => setIsEncouragementVisible(false)}
                style={{
                  position: 'absolute',
                  top: 12 * fontScale,
                  right: 12 * fontScale,
                  width: 28 * fontScale,
                  height: 28 * fontScale,
                  borderRadius: 14 * fontScale,
                  backgroundColor: colorScheme === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.08)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                colors={
                  overallSunnyPercentage > 50
                    ? colorScheme === 'dark'
                      ? ['rgba(100, 150, 255, 0.15)', 'rgba(100, 150, 255, 0.08)', 'rgba(100, 150, 255, 0.12)']
                      : ['rgba(100, 150, 255, 0.12)', 'rgba(100, 150, 255, 0.06)', 'rgba(100, 150, 255, 0.1)']
                    : colorScheme === 'dark'
                      ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.06)']
                      : ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.04)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 16 * fontScale,
                  overflow: 'hidden', // Ensure gradient respects border radius
                }}
              />
              
              {/* Border */}
              <View
                style={{
                  position: 'absolute',
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
                }}
              />
              
              {/* Shadow/Glow effect */}
              {overallSunnyPercentage > 50 && (
                <View
                  style={{
                    position: 'absolute',
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
                  }}
                />
              )}
              
              {/* Content */}
              <ThemedText
                size="sm"
                style={{
                  textAlign: 'center',
                  lineHeight: 22 * fontScale,
                  fontWeight: overallSunnyPercentage > 50 ? '600' : '500',
                  color: overallSunnyPercentage > 50
                    ? colors.primaryLight
                    : colors.text,
                  textShadowColor: overallSunnyPercentage > 50 && colorScheme === 'dark'
                    ? 'rgba(100, 150, 255, 0.3)'
                    : 'transparent',
                  textShadowOffset: overallSunnyPercentage > 50 ? { width: 0, height: 1 } : { width: 0, height: 0 },
                  textShadowRadius: overallSunnyPercentage > 50 ? 4 : 0,
                }}
              >
                {overallSunnyPercentage > 50
                  ? t('spheres.encouragement.goodMomentsPrevail')
                  : t('spheres.encouragement.keepPushing')
                }
              </ThemedText>
            </Animated.View>
          )}

          {/* Center - Overall Percentage Avatar with Sparkled Dots */}
          {(() => {
            // Calculate avatar size considering floating entities intersection
            const sphereDistanceFromCenter = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3;
            const floatingEntityRadius = isTablet ? 85 : 55; // Larger on tablets by default
            const floatingEntitySize = isTablet ? 36 : 24;
            const floatingEntityRadiusSize = floatingEntitySize / 2;
            const minDistanceToFloatingEntity = sphereDistanceFromCenter - floatingEntityRadius - floatingEntityRadiusSize;
            const baseAvatarSize = isTablet ? 180 : 120;
            const baseAvatarRadius = baseAvatarSize / 2;
            const padding = 5;
            const maxSafeAvatarRadius = minDistanceToFloatingEntity - padding;
            const avatarSize = maxSafeAvatarRadius < baseAvatarRadius 
              ? Math.max(maxSafeAvatarRadius * 2, isTablet ? 140 : 90)
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
                  avatarBounceStyle,
                ]}
              >
                <Pressable
                  onPress={() => {
                    if (hasAnyMoments) {
                      setIsEncouragementVisible(!isEncouragementVisible);
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

          {/* Five Spheres */}
          {animationsReady && (
            <>
              <SphereAvatar
                sphere="relationships"
                position={spherePositions.relationships}
                colorScheme={colorScheme ?? 'dark'}
                colors={colors}
                onPress={() => {
                  // Clear all focus states when selecting a sphere to ensure fresh start
                  setFocusedMemory(null);
                  setFocusedProfileId(null);
                  setFocusedJobId(null);
                  setFocusedFamilyMemberId(null);
                  setFocusedFriendId(null);
                  setFocusedHobbyId(null);
                  setAnimationsComplete(false); // Reset animations immediately
                  setSelectedSphere('relationships');
                }}
                sunnyPercentage={relationshipsSunnyPercentage}
                selectedSphere={selectedSphere}
                zoomProgress={sphereZoomProgress}
                disabled={profiles.length === 0}
              />
              <SphereAvatar
                sphere="career"
                position={spherePositions.career}
                colorScheme={colorScheme ?? 'dark'}
                colors={colors}
                onPress={() => {
                  // Clear all focus states when selecting a sphere to ensure fresh start
                  setFocusedMemory(null);
                  setFocusedProfileId(null);
                  setFocusedJobId(null);
                  setFocusedFamilyMemberId(null);
                  setFocusedFriendId(null);
                  setFocusedHobbyId(null);
                  setAnimationsComplete(false); // Reset animations immediately
                  setSelectedSphere('career');
                }}
                sunnyPercentage={careerSunnyPercentage}
                selectedSphere={selectedSphere}
                zoomProgress={sphereZoomProgress}
                disabled={jobs.length === 0}
              />
              <SphereAvatar
                sphere="family"
                position={spherePositions.family}
                colorScheme={colorScheme ?? 'dark'}
                colors={colors}
                onPress={() => {
                  // Clear all focus states when selecting a sphere to ensure fresh start
                  setFocusedMemory(null);
                  setFocusedProfileId(null);
                  setFocusedJobId(null);
                  setFocusedFamilyMemberId(null);
                  setFocusedFriendId(null);
                  setFocusedHobbyId(null);
                  setAnimationsComplete(false); // Reset animations immediately
                  setSelectedSphere('family');
                }}
                sunnyPercentage={familySunnyPercentage}
                selectedSphere={selectedSphere}
                zoomProgress={sphereZoomProgress}
                disabled={familyMembers.length === 0}
              />
              <SphereAvatar
                sphere="friends"
                position={spherePositions.friends}
                colorScheme={colorScheme ?? 'dark'}
                colors={colors}
                onPress={() => {
                  // Clear all focus states when selecting a sphere to ensure fresh start
                  setFocusedMemory(null);
                  setFocusedProfileId(null);
                  setFocusedJobId(null);
                  setFocusedFamilyMemberId(null);
                  setFocusedFriendId(null);
                  setFocusedHobbyId(null);
                  setAnimationsComplete(false); // Reset animations immediately
                  setSelectedSphere('friends');
                }}
                sunnyPercentage={friendsSunnyPercentage}
                selectedSphere={selectedSphere}
                zoomProgress={sphereZoomProgress}
                disabled={friends.length === 0}
              />
              <SphereAvatar
                sphere="hobbies"
                position={spherePositions.hobbies}
                colorScheme={colorScheme ?? 'dark'}
                colors={colors}
                onPress={() => {
                  // Clear all focus states when selecting a sphere to ensure fresh start
                  setFocusedMemory(null);
                  setFocusedProfileId(null);
                  setFocusedJobId(null);
                  setFocusedFamilyMemberId(null);
                  setFocusedFriendId(null);
                  setFocusedHobbyId(null);
                  setAnimationsComplete(false); // Reset animations immediately
                  setSelectedSphere('hobbies');
                }}
                sunnyPercentage={hobbiesSunnyPercentage}
                selectedSphere={selectedSphere}
                zoomProgress={sphereZoomProgress}
                disabled={hobbies.length === 0}
              />
              
              {/* Floating Partners around Relationships Sphere */}
              {sortedProfiles.slice(0, Math.min(sortedProfiles.length, 5)).map((profile, index) => {
                const totalPartners = Math.min(sortedProfiles.length, 5);
                const angle = (index * 2 * Math.PI) / totalPartners;
                const radius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByProfileId(profile.id);
                
                const x = spherePositions.relationships.x + Math.cos(angle) * radius;
                const y = spherePositions.relationships.y + Math.sin(angle) * radius;
                
                return (
                  <FloatingEntity
                    key={`floating-partner-${profile.id}`}
                    entity={profile}
                    position={{ x, y }}
                    colorScheme={colorScheme ?? 'dark'}
                    colors={colors}
                    delay={index * 200}
                    entityType="partner"
                    memories={memories}
                    selectedSphere={selectedSphere}
                    zoomProgress={sphereZoomProgress}
                  />
                );
              })}
              
              {/* Floating Jobs around Career Sphere */}
              {sortedJobs.slice(0, Math.min(sortedJobs.length, 5)).map((job, index) => {
                const totalJobs = Math.min(sortedJobs.length, 5);
                const angle = (index * 2 * Math.PI) / totalJobs;
                const radius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(job.id, 'career');
                
                const x = spherePositions.career.x + Math.cos(angle) * radius;
                const y = spherePositions.career.y + Math.sin(angle) * radius;
                
                return (
                  <FloatingEntity
                    key={`floating-job-${job.id}`}
                    entity={job}
                    position={{ x, y }}
                    colorScheme={colorScheme ?? 'dark'}
                    colors={colors}
                    delay={index * 200}
                    entityType="job"
                    memories={memories}
                    selectedSphere={selectedSphere}
                    zoomProgress={sphereZoomProgress}
                  />
                );
              })}
              
              {/* Floating Family Members around Family Sphere */}
              {familyMembers.slice(0, Math.min(familyMembers.length, 5)).map((member, index) => {
                const totalMembers = Math.min(familyMembers.length, 5);
                const angle = (index * 2 * Math.PI) / totalMembers;
                const radius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(member.id, 'family');
                
                const x = spherePositions.family.x + Math.cos(angle) * radius;
                const y = spherePositions.family.y + Math.sin(angle) * radius;
                
                return (
                  <FloatingEntity
                    key={`floating-member-${member.id}`}
                    entity={member}
                    position={{ x, y }}
                    colorScheme={colorScheme ?? 'dark'}
                    colors={colors}
                    delay={index * 200}
                    entityType="family"
                    memories={memories}
                    selectedSphere={selectedSphere}
                    zoomProgress={sphereZoomProgress}
                  />
                );
              })}
              
              {/* Floating Friends around Friends Sphere */}
              {friends.slice(0, Math.min(friends.length, 5)).map((friend, index) => {
                const totalFriends = Math.min(friends.length, 5);
                const angle = (index * 2 * Math.PI) / totalFriends;
                const radius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(friend.id, 'friends');
                
                const x = spherePositions.friends.x + Math.cos(angle) * radius;
                const y = spherePositions.friends.y + Math.sin(angle) * radius;
                
                return (
                  <FloatingEntity
                    key={`floating-friend-${friend.id}`}
                    entity={friend}
                    position={{ x, y }}
                    colorScheme={colorScheme ?? 'dark'}
                    colors={colors}
                    delay={index * 200}
                    entityType="friend"
                    memories={memories}
                    selectedSphere={selectedSphere}
                    zoomProgress={sphereZoomProgress}
                  />
                );
              })}
              
              {/* Floating Hobbies around Hobbies Sphere */}
              {hobbies.slice(0, Math.min(hobbies.length, 5)).map((hobby, index) => {
                const totalHobbies = Math.min(hobbies.length, 5);
                const angle = (index * 2 * Math.PI) / totalHobbies;
                const radius = isTablet ? 85 : 55; // Larger distance on tablets by default
                const memories = getIdealizedMemoriesByEntityId(hobby.id, 'hobbies');
                
                const x = spherePositions.hobbies.x + Math.cos(angle) * radius;
                const y = spherePositions.hobbies.y + Math.sin(angle) * radius;
                
                return (
                  <FloatingEntity
                    key={`floating-hobby-${hobby.id}`}
                    entity={hobby}
                    position={{ x, y }}
                    colorScheme={colorScheme ?? 'dark'}
                    colors={colors}
                    delay={index * 200}
                    entityType="hobby"
                    memories={memories}
                    selectedSphere={selectedSphere}
                    zoomProgress={sphereZoomProgress}
                  />
                );
              })}
            </>
          )}
        </View>
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
          </View>
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
            {/* Render year sections with jobs inside */}
            {animationsReady && !focusedMemory && (
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
                    
                    // Position jobs from top to bottom (most recent first)
                    const position = {
                      x: SCREEN_WIDTH / 2,
                      y: totalJobsInSection === 1
                        ? sectionCenterY
                        : section.top + verticalSpacing * (jobIndexInSection + 1)
                    };
                    
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
                          onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'career') => {
                            setFocusedMemory({ jobId: entityId, memoryId, sphere });
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
          </View>
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
            {animationsReady && !focusedMemory && (
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
                  
                  // Distribute family members vertically within the section
                  const totalMembers = familyMembers.length;
                  const sectionCenterY = section ? section.top + section.height / 2 : SCREEN_HEIGHT / 2;
                  
                  // Increased spacing between family members for better visual separation
                  // Minimum spacing of 200px between family members
                  const minSpacing = 200;
                  const verticalSpacing = totalMembers > 1 
                    ? Math.max(minSpacing, Math.min((section?.height || SCREEN_HEIGHT) / (totalMembers + 1), 250))
                    : 0;
                  
                  const position = {
                    x: SCREEN_WIDTH / 2,
                    y: totalMembers === 1
                      ? sectionCenterY
                      : (section?.top || 150) + verticalSpacing * (index + 1)
                  };
                  
                  const isFocused = focusedFamilyMemberId === member.id;
                  const wasJustFocused = previousFocusedFamilyMemberIdRef.current === member.id && !focusedFamilyMemberId;
                  
                  // Hide unfocused family members when a family member is focused
                  // Also hide family member that was just unfocused (it's being animated in focusedFamilyMembersRender)
                  if ((focusedFamilyMemberId && !isFocused) || wasJustFocused) {
                    return null;
                  }
                  
                  // Get saved position or use calculated position
                  const savedPosition = familyPositionsState.get(member.id);
                  const finalPosition = savedPosition || position;
                  
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
                        onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'family') => {
                          setFocusedMemory({ familyMemberId: entityId, memoryId, sphere });
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
            {animationsReady && !focusedMemory && (
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
                  
                  // Distribute friends vertically within the section
                  const totalFriends = friends.length;
                  const sectionCenterY = section ? section.top + section.height / 2 : SCREEN_HEIGHT / 2;
                  
                  // Increased spacing between friends for better visual separation
                  const minSpacing = 200;
                  const verticalSpacing = totalFriends > 1 
                    ? Math.max(minSpacing, Math.min((section?.height || SCREEN_HEIGHT) / (totalFriends + 1), 250))
                    : 0;
                  
                  const position = {
                    x: SCREEN_WIDTH / 2,
                    y: totalFriends === 1
                      ? sectionCenterY
                      : (section?.top || 150) + verticalSpacing * (index + 1)
                  };
                  
                  const isFocused = focusedFriendId === friend.id;
                  const wasJustFocused = previousFocusedFriendIdRef.current === friend.id && !focusedFriendId;
                  
                  // Hide unfocused friends when a friend is focused
                  // Also hide friend that was just unfocused (it's being animated in focusedFriendsRender)
                  if ((focusedFriendId && !isFocused) || wasJustFocused) {
                    return null;
                  }
                  
                  // Get saved position or use calculated position
                  const savedPosition = friendPositionsState.get(friend.id);
                  const finalPosition = savedPosition || position;
                  
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
                        onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'friends') => {
                          setFocusedMemory({ friendId: entityId, memoryId, sphere });
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
            {animationsReady && !focusedMemory && (
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
                  
                  // Distribute hobbies vertically within the section
                  const totalHobbies = hobbies.length;
                  const sectionCenterY = section ? section.top + section.height / 2 : SCREEN_HEIGHT / 2;
                  
                  // Increased spacing between hobbies for better visual separation
                  const minSpacing = 200;
                  const verticalSpacing = totalHobbies > 1 
                    ? Math.max(minSpacing, Math.min((section?.height || SCREEN_HEIGHT) / (totalHobbies + 1), 250))
                    : 0;
                  
                  const position = {
                    x: SCREEN_WIDTH / 2,
                    y: totalHobbies === 1
                      ? sectionCenterY
                      : (section?.top || 150) + verticalSpacing * (index + 1)
                  };
                  
                  const isFocused = focusedHobbyId === hobby.id;
                  const wasJustFocused = previousFocusedHobbyIdRef.current === hobby.id && !focusedHobbyId;
                  
                  // Hide unfocused hobbies when a hobby is focused
                  // Also hide hobby that was just unfocused (it's being animated in focusedHobbiesRender)
                  if ((focusedHobbyId && !isFocused) || wasJustFocused) {
                    return null;
                  }
                  
                  // Get saved position or use calculated position
                  const savedPosition = hobbyPositionsState.get(hobby.id);
                  const finalPosition = savedPosition || position;
                  
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
                        onMemoryFocus={(entityId: string, memoryId: string, sphere: LifeSphere = 'hobbies') => {
                          setFocusedMemory({ hobbyId: entityId, memoryId, sphere });
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
        </View>
      </View>
    </TabScreenContainer>
  );
}

// Year Sections Renderer Component
// NOTE: Removed React.memo temporarily to debug rendering issues after sphere changes
const YearSectionsRenderer = function YearSectionsRenderer({
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
  focusedMemory: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere } | null;
  previousFocusedId: string | null;
  slideOffset: ReturnType<typeof useSharedValue<number>>;
  getProfileYearSection: (profile: any) => { year: number | string; top: number; bottom: number; height: number } | undefined;
  updateAvatarPosition: (profileId: string, newPosition: { x: number; y: number }) => void;
  setFocusedProfileId: (id: string | null) => void;
  setFocusedMemory: (memory: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere } | null) => void;
  colors: any;
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  animationsComplete: boolean;
}) {
  // CRITICAL: Only use focusedMemory if it's from relationships sphere
  // This ensures cross-sphere focusedMemory (e.g., from career) doesn't affect relationships rendering
  const safeFocusedMemory = focusedMemory?.sphere === 'relationships' ? focusedMemory : null;
  
  // Memoize memories and positions for all profiles to prevent unnecessary re-renders
  // Reuse previous references when data hasn't changed to prevent cascading re-renders
  const profileDataMapRef = React.useRef<Map<string, { memories: any[]; position: { x: number; y: number } }>>(new Map());
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
};

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
  focusedMemory: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere };
  sortedProfiles: any[];
  sortedJobs?: any[];
  getIdealizedMemoriesByProfileId: (profileId: string) => any[];
  getIdealizedMemoriesByEntityId: (entityId: string, sphere: LifeSphere) => any[];
  updateIdealizedMemory: (memoryId: string, updates: Partial<any>) => Promise<void>;
  colorScheme: 'light' | 'dark';
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  setFocusedMemory: (memory: { profileId?: string; jobId?: string; familyMemberId?: string; friendId?: string; hobbyId?: string; memoryId: string; sphere: LifeSphere } | null) => void;
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
  focusedMemory: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere } | null;
  slideOffset: ReturnType<typeof useSharedValue<number>>;
  getProfileYearSection: (profile: any) => { year: number | string; top: number; bottom: number; height: number } | undefined;
  updateAvatarPosition: (profileId: string, newPosition: { x: number; y: number }) => void;
  setFocusedProfileId: (id: string | null) => void;
  setFocusedMemory: (memory: { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere } | null) => void;
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
  
  const handleMemoryFocus = useCallback((entityId: string, memoryId: string, sphere: LifeSphere = 'relationships') => {
    if (sphere === 'relationships') {
      setFocusedMemory({ profileId: entityId, memoryId, sphere });
    } else if (sphere === 'career') {
      setFocusedMemory({ jobId: entityId, memoryId, sphere });
    } else {
      setFocusedMemory({ profileId: entityId, memoryId, sphere });
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
