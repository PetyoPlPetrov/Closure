import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLargeDevice } from '@/hooks/use-large-device';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney, type LifeSphere } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { useSplash } from '@/utils/SplashAnimationProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

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
}) {
  const baseAvatarSize = 80;
  const focusedAvatarSize = 100; // Smaller focused size so memories fit
  const avatarSize = isFocused ? focusedAvatarSize : baseAvatarSize;
  // Memory radius - when focused, ensure all floating elements fit within viewport
  // Calculation: memoryRadius + memorySize/2 + momentRadius + momentSize/2 + padding <= min(SCREEN_WIDTH/2, SCREEN_HEIGHT/2)
  // Where: memoryRadius is from avatar center, memorySize/2 = 22.5, momentRadius = 40, momentSize/2 = 6, padding = 25
  // So: memoryRadius + 22.5 + 40 + 6 + 25 = memoryRadius + 93.5 <= min(SCREEN_WIDTH/2, SCREEN_HEIGHT/2)
  // Therefore: memoryRadius <= min(SCREEN_WIDTH/2, SCREEN_HEIGHT/2) - 93.5
  const maxDistanceFromCenter = Math.min(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
  const estimatedMaxMemorySize = 45; // Maximum memory size when focused
  const estimatedMaxMomentRadius = 40; // Maximum radius of moments around memory
  const estimatedMaxMomentSize = 12; // Maximum moment size
  const safetyPadding = 25; // Safety padding from viewport edges
  const maxAllowedRadius = maxDistanceFromCenter - estimatedMaxMemorySize / 2 - estimatedMaxMomentRadius - estimatedMaxMomentSize / 2 - safetyPadding;
  const memoryRadius = isFocused ? Math.max(80, Math.min(110, maxAllowedRadius)) : 60; // Ensure all floating elements fit within viewport (80-110px range when focused)
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
  
  // Update pan values when position prop changes
  React.useEffect(() => {
    panX.value = position.x;
    panY.value = position.y;
    memoryAnimatedValues.forEach((mem) => {
      mem.panX.value = position.x;
      mem.panY.value = position.y;
    });
  }, [position.x, position.y, panX, panY, memoryAnimatedValues]);
  
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
      const zoomOutDuration = 4500; // Much slower, more gradual zoom-out
      
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
    // Interpolate position and scale based on zoom progress
    // When zoomProgress = 0: at start position (State A), scale = 1
    // When zoomProgress = 1: at center position (State B), scale = focusedScale
    
    let currentX: number;
    let currentY: number;
    
    if (isFocused) {
      // Zoom-in: interpolate from start position to center
      currentX = startX.value + (targetX - startX.value) * zoomProgress.value;
      currentY = startY.value + (targetY - startY.value) * zoomProgress.value;
    } else {
      // Zoom-out: interpolate from center back to original position
      // When zoomProgress = 1: at center (targetX, targetY)
      // When zoomProgress = 0: at original position (position.x, position.y)
      currentX = targetX + (position.x - targetX) * (1 - zoomProgress.value);
      currentY = targetY + (position.y - targetY) * (1 - zoomProgress.value);
    }
    
    if (isFocused) {
      // When focused, use interpolated position and scale (zoom-in effect)
      const currentScale = zoomScale.value;
      return {
        transform: [
          { translateX: currentX - position.x },
          { translateY: currentY - position.y },
          { scale: currentScale },
        ],
      };
    }
    // When not focused, continue using interpolated values for smooth zoom-out
    // Add floating animation only when fully unfocused (zoomProgress = 0)
    const floatOffset = zoomProgress.value === 0 ? floatAnimation.value * 6 : 0;
    
    return {
      transform: [
        { translateX: currentX - position.x },
        { translateY: currentY - position.y + floatOffset },
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
    // Memory size: 45px when focused, 30px when unfocused
    const memorySize = isFocused ? 45 : 30;
    const memoryRadiusSize = memorySize / 2; // Half the memory size
    const safetyPadding = 10; // Small padding from viewport edge
    
    // Calculate distances from avatar center to each viewport edge
    const distanceToTop = position.y;
    const distanceToBottom = SCREEN_HEIGHT - position.y;
    const distanceToLeft = position.x;
    const distanceToRight = SCREEN_WIDTH - position.x;
    
    // Maximum safe radius is the minimum distance to any edge, minus memory radius and padding
    const maxSafeRadius = Math.min(
      distanceToTop,
      distanceToBottom,
      distanceToLeft,
      distanceToRight
    ) - memoryRadiusSize - safetyPadding;
    
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
        // When there are less than 5 elements, position them just a bit further from avatar
        // But ensure single memory stays fully visible in viewport
        if (memories.length === 1) {
          // For single memory, keep it closer to ensure it's fully visible
          const closerMultiplier = isFocused ? 0.9 : 0.95; // Slightly closer to ensure visibility
          variedRadius = variedRadius * closerMultiplier;
        } else {
          // For 2-4 memories, position them just a bit further
          const furtherMultiplier = isFocused ? 1.1 : 1.05; // 10% further when focused, 5% further when unfocused
          variedRadius = variedRadius * furtherMultiplier;
        }
      } else if (isFocused && memories.length > 5 && topTwoIndices.includes(memIndex)) {
        // When focused and there are more than 5 elements, push top 2 elements further away
        const additionalRadius = 50; // Significant additional distance for top 2 elements
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
      const maxRadiusInDirection = Math.min(maxRadiusX, maxRadiusY, maxSafeRadius);
      
      // Clamp variedRadius to ensure memory stays fully visible
      variedRadius = Math.min(variedRadius, Math.max(0, maxRadiusInDirection));
      
      return {
        angle: variedAngle,
        offsetX: variedRadius * cosAngle,
        offsetY: variedRadius * sinAngle,
      };
    });
  }, [memories, memoryRadius, isFocused]);

  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: position.x - avatarSize / 2,
            top: position.y - avatarSize / 2,
            zIndex: 100, // Much higher z-index to ensure avatars are always on top and interactive
            pointerEvents: 'box-none', // Allow touches to pass through to children
          },
          animatedStyle,
        ]}
      >
        <Pressable
          style={{ pointerEvents: 'auto' }} // Ensure Pressable can receive touches
          onPress={onPress}
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
          </View>
        </Pressable>
      </Animated.View>

      {/* Floating Memories around Avatar - rendered separately for proper z-index */}
      {useMemo(() => {
        // Always show all memories - they should be visible around profiles at all times
        const filteredMemories = memories.filter((memory) => {
          // If a memory is focused, only show that specific memory
          if (focusedMemory) {
            const mem = focusedMemory as { profileId?: string; jobId?: string; memoryId: string; sphere: LifeSphere };
            if (mem.profileId === profile.id || mem.jobId === profile.id) {
              // Show only the focused memory for this profile/job
              return mem.memoryId === memory.id;
            }
            // If focused memory belongs to a different profile/job, hide all memories
            return false;
          }
          // If nothing is focused, show all memories (they should always be visible)
          return true;
        });
        
        // Memoize position objects to prevent unnecessary re-renders
        const positionX = position.x;
        const positionY = position.y;
        
        return filteredMemories.map((memory, memIndex) => {
        // Find the original index in the full memories array for position calculation
        const originalIndex = memories.findIndex(m => m.id === memory.id);
        const memPosData = memoryPositions[originalIndex];
        // Safety check: if we have more memories than animated values, use the last available one
        const memAnimatedValues = memoryAnimatedValues[originalIndex] || memoryAnimatedValues[memoryAnimatedValues.length - 1];
        
        // When focused, avatar is centered on screen, so use centered position for memory calculations
        const avatarCenterX = isFocused ? SCREEN_WIDTH / 2 : positionX;
        const avatarCenterY = isFocused ? SCREEN_HEIGHT / 2 : positionY;
        
        // Initial position for first render - use centered position when focused
        const initialMemPos = {
          x: avatarCenterX + memPosData.offsetX,
          y: avatarCenterY + memPosData.offsetY,
        };
        
        // Calculate maximum memory size based on viewport constraints
        // Worst case: memory at memoryRadius from avatar, with moments orbiting at maxMomentRadius from memory
        // We need to ensure the entire EX zone fits: avatar + memoryRadius + memorySize/2 + maxMomentRadius + maxMomentSize/2 <= viewport edge
        const cloudSize = isFocused ? 12 : 24;
        const sunSize = isFocused ? 10 : 22;
        const maxMomentSize = Math.max(cloudSize, sunSize);
        const cloudRadius = isFocused ? 40 : 25;
        const sunRadius = isFocused ? 38 : 22;
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
          // Base size is 35% of focused avatar size (35px - half of previous 70px)
          const baseSize = focusedAvatarSize * 0.35; // 35px
          
          if (maxMomentsCount > minMomentsCount) {
            // Scale from base size (35px) to up to 45% of avatar size (45px) based on moment count
            // More moments = bigger memory, but keep it smaller than avatar
            const momentsFactor = (momentCount - minMomentsCount) / (maxMomentsCount - minMomentsCount);
            // Scale from 35px (fewest moments) to 45px (most moments, 45% of avatar)
            const maxSize = focusedAvatarSize * 0.45; // 45px (45% of 100px avatar)
            baseMemorySize = baseSize + (momentsFactor * (maxSize - baseSize)); // Range: 35 to 45
          } else {
            // All memories have same moment count, use base size (35% of avatar)
            baseMemorySize = baseSize; // 35px
          }
        } else {
          // Not focused, use smaller size
          baseMemorySize = 50;
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
          console.warn(`[FloatingMemory] Invalid cloud at index ${cloudIndex}:`, cloud);
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
            </DraggableMoment>
          );
        }
        
        // Not focused - use small circular cloud
        const cloudPosData = cloudPositions[cloudIndex];
        if (!cloudPosData) {
          console.warn(`[FloatingMemory] Missing cloud position data at index ${cloudIndex}`);
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
              <LinearGradient
                colors={['#FFD700', '#FFD700', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  width: sunWidth,
                  height: sunHeight,
                  borderRadius: sunWidth / 2,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View style={{
                  position: 'absolute',
                  top: sunHeight * 0.2,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <MaterialIcons 
                    name="wb-sunny" 
                    size={sunWidth * 0.5} 
                    color="#FFFFFF" 
                  />
                </View>
              </LinearGradient>
              <View
                style={{
                  width: sunWidth,
                  height: sunHeight,
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingTop: sunHeight * 0.25,
                }}
              >
                <ThemedText
                  style={{
                    color: '#000000',
                    fontSize: 12,
                    textAlign: 'center',
                    fontWeight: '500',
                  }}
                >
                  {sun.text}
                </ThemedText>
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
          disabled={allSunsVisible}
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
            opacity: allSunsVisible ? 0.4 : 1,
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
            {/* Count badge - horizontal bar at bottom of circle */}
            {totalSunsCount > 0 && (
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
            )}
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
  const { isLargeDevice } = useLargeDevice();
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
  // Otherwise use calculated size or default
  const memorySize = isMemoryFocused 
    ? (isLargeDevice ? 300 : 250) 
    : (calculatedMemorySize ?? (isFocused ? 65 : 50));
  
  // Cloud and sun dimensions from creation screen (used when memory is focused)
  const cloudWidth = isLargeDevice ? 480 : 320;
  const cloudHeight = isLargeDevice ? 150 : 100;
  const sunWidth = isLargeDevice ? 150 : 100;
  const sunHeight = isLargeDevice ? 150 : 100;
  
  // Increase cloud and sun radius when focused to push them further from memory
  const cloudRadius = isFocused ? 40 : 25; // Further away when focused
  const sunRadius = isFocused ? 38 : 22; // Further away when focused
  
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
    if (cloudButtonPos) {
      setNewlyCreatedMoments(prev => {
        const next = new Map(prev);
        next.set(nextCloud.id, {
          startX: cloudButtonPos.x,
          startY: cloudButtonPos.y,
        });
        return next;
      });
    }
    
    // Update memory with new position
    const updatedHardTruths = (memory.hardTruths || []).map((truth: any) =>
      truth.id === nextCloud.id ? { ...truth, x: clampedPos.x, y: clampedPos.y } : truth
    );
    await onUpdateMemory({ hardTruths: updatedHardTruths });
    
    // Mark as visible AFTER start position is set
    // Use a small delay to ensure state update completes
    setTimeout(() => {
      setVisibleMomentIds(prev => new Set([...prev, nextCloud.id]));
      // Don't clear start position - it's harmless to keep it and prevents re-render issues
    }, 50); // Small delay to ensure start position state is set
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
    if (sunButtonPos) {
      setNewlyCreatedMoments(prev => {
        const next = new Map(prev);
        next.set(nextSun.id, {
          startX: sunButtonPos.x,
          startY: sunButtonPos.y,
        });
        return next;
      });
    }
    
    // Update memory with new position
    const updatedGoodFacts = (memory.goodFacts || []).map((fact: any) =>
      fact.id === nextSun.id ? { ...fact, x: clampedPos.x, y: clampedPos.y } : fact
    );
    await onUpdateMemory({ goodFacts: updatedGoodFacts });
    
    // Mark as visible AFTER start position is set
    // Use a small delay to ensure state update completes
    setTimeout(() => {
      setVisibleMomentIds(prev => new Set([...prev, nextSun.id]));
      // Don't clear start position - it's harmless to keep it and prevents re-render issues
    }, 50); // Small delay to ensure start position state is set
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
      'worklet';
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
    
    // Fallback: use focusedX/focusedY when available (they animate during zoom-in/out)
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
  }));

  const clouds = useMemo(() => {
    const truths = memory.hardTruths || [];
    // Filter out any invalid entries (must be objects, not arrays, not strings)
    const validClouds = truths.filter((truth: any) => {
      const isValid = truth && typeof truth === 'object' && !Array.isArray(truth);
      if (!isValid) {
        console.warn('[FloatingMemory] Invalid hardTruth entry:', truth, 'Type:', typeof truth);
      }
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

  // Calculate cloud and sun positions relative to memory
  const cloudPositions = useMemo(() => {
    return clouds.map((_: any, cloudIndex: number) => {
      const angle = (cloudIndex * 2 * Math.PI) / clouds.length;
      return {
        angle,
        offsetX: cloudRadius * Math.cos(angle),
        offsetY: cloudRadius * Math.sin(angle),
      };
    });
  }, [clouds, cloudRadius]);

  const sunPositions = useMemo(() => {
    return suns.map((_: any, sunIndex: number) => {
      const angle = ((sunIndex + clouds.length) * 2 * Math.PI) / (suns.length + clouds.length);
      return {
        angle,
        offsetX: sunRadius * Math.cos(angle),
        offsetY: sunRadius * Math.sin(angle),
      };
    });
  }, [suns, clouds, sunRadius]);

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

  // Skip rendering this memory if another memory is focused and this one isn't
  // This prevents unnecessary re-renders when a specific memory is focused
  // Note: This check happens after hooks to comply with Rules of Hooks
  if (focusedMemory && focusedMemory.profileId === memory.profileId && focusedMemory.memoryId !== memory.id) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: position.x - memorySize / 2,
            top: position.y - memorySize / 2,
            zIndex: isMemoryFocused ? 1000 : 20, // Memory base layer - lower than moments
            pointerEvents: 'box-none', // Allow touches to pass through to Pressable
          },
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
            {/* SVG Progress Bar Border - same as avatar */}
            <Svg
              width={memorySize}
              height={memorySize}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <Defs>
                <SvgLinearGradient id={`memoryBorderGradient-${memory.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#FFD700" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              {/* Background circle (cloudy/dark) - color based on sunny percentage */}
              {(() => {
                // Calculate dark color based on sunny percentage
                // The background circle represents the "cloudy" portion of the border
                // When sunnyPercentage = 0 (all clouds): fully black rgba(0,0,0,1)
                // When sunnyPercentage = 100 (all suns): very light gray (barely visible)
                // When sunnyPercentage > 0: can't be fully black because there ARE suns present
                
                // Calculate the cloudy percentage
                const cloudyPercentage = 100 - sunnyPercentage;
                
                let darkOpacity: number;
                let darkColorValue: number;
                
                if (sunnyPercentage === 0) {
                  // All clouds - fully black
                  darkOpacity = 1;
                  darkColorValue = 0;
                } else if (sunnyPercentage === 100) {
                  // All suns - very light gray (for border definition)
                  darkOpacity = 0.2;
                  darkColorValue = 200;
                } else {
                  // Mixed: interpolate between black and gray
                  // More cloudy = darker, more black
                  darkOpacity = 0.4 + (cloudyPercentage / 100) * 0.6; // Range: 0.4 to 1.0
                  darkColorValue = (cloudyPercentage / 100) * 50; // Range: 0 (black) to 50 (dark gray)
                }
                
                const darkColor = `rgba(${darkColorValue}, ${darkColorValue}, ${darkColorValue}, ${darkOpacity})`;
                
                return (
              <Circle
                cx={memorySize / 2}
                cy={memorySize / 2}
                r={memorySize / 2 - 4}
                    stroke={darkColor}
                strokeWidth={8}
                fill="none"
              />
                );
              })()}
              {/* Progress circle (sunny/yellow) */}
              {(() => {
                const borderRadius = memorySize / 2 - 4;
                const circumference = 2 * Math.PI * borderRadius;
                const strokeDashoffset = circumference - (sunnyPercentage / 100) * circumference;
                const gradientId = `memoryBorderGradient-${memory.id}`;
                return (
                  <Circle
                    cx={memorySize / 2}
                    cy={memorySize / 2}
                    r={borderRadius}
                    stroke={`url(#${gradientId})`}
                    strokeWidth={8}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${memorySize / 2} ${memorySize / 2})`}
                  />
                );
              })()}
            </Svg>
            
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
      return {
        left: cloudX - cloudSize / 2,
        top: cloudY - cloudSize / 2,
      };
    }
    if (avatarPanX && avatarPanY) {
      // Calculate from avatar position: avatar + memory offset + cloud offset
      const cloudX = avatarPanX.value + memoryOffsetX + offsetX;
      const cloudY = avatarPanY.value + memoryOffsetY + offsetY;
      return {
        left: cloudX - cloudSize / 2,
        top: cloudY - cloudSize / 2,
      };
    }
    // When memory is focused but no avatar position, use the position prop directly
    // This handles the case when memory is focused independently
    // Position is already relative to screen center, so use it directly
    // For focused memory, position is already at screen center, so we use it as-is
    const finalX = position.x - cloudSize / 2;
    const finalY = position.y - cloudSize / 2;
    return {
      left: finalX,
      top: finalY,
    };
  });

  // Safety check - if cloud is invalid, don't render (after all hooks)
  // Ensure cloud is a valid object and not a string or primitive
  if (!cloud || typeof cloud !== 'object' || Array.isArray(cloud)) {
    console.warn('[FloatingCloud] Invalid cloud object:', cloud);
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
        onPress={onPress}
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
      return {
        left: sunX - sunSize / 2,
        top: sunY - sunSize / 2,
      };
    }
    if (avatarPanX && avatarPanY) {
      // Calculate from avatar position: avatar + memory offset + sun offset
      const sunX = avatarPanX.value + memoryOffsetX + offsetX;
      const sunY = avatarPanY.value + memoryOffsetY + offsetY;
      return {
        left: sunX - sunSize / 2,
        top: sunY - sunSize / 2,
      };
    }
    // When memory is focused but no avatar position, use the position prop directly
    // This handles the case when memory is focused independently
    return {
      left: position.x - sunSize / 2,
      top: position.y - sunSize / 2,
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
        onPress={onPress}
      >
        <LinearGradient
          colors={['#FFD700', '#FFD700', '#FFD700']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: sunSize,
            height: sunSize,
            borderRadius: sunSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#FFD700',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <MaterialIcons name="wb-sunny" size={sunSize * 0.65} color="#FFFFFF" />
        </LinearGradient>
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
  const avatarSize = 120;
  const borderWidth = 8;
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View
      style={{
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: colorScheme === 'dark' 
          ? 'rgba(14, 165, 233, 0.2)' 
          : 'rgba(125, 211, 252, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden', // Ensure perfect circle clipping
      }}
    >
      <Svg
        width={avatarSize}
        height={avatarSize}
        viewBox={`0 0 ${avatarSize} ${avatarSize}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Defs>
          <SvgLinearGradient id="overallBorderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFD700" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={avatarSize / 2}
          cy={avatarSize / 2}
          r={radius}
          stroke="#000000"
          strokeWidth={borderWidth}
          fill="none"
        />
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
          transform={`rotate(-90 ${avatarSize / 2} ${avatarSize / 2})`}
        />
      </Svg>
      <ThemedText size="xl" weight="bold" style={{ color: colors.primaryLight, fontSize: 32 }}>
        {Math.round(percentage)}%
      </ThemedText>
    </View>
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
        { scale },
        { translateY: floatY },
      ],
      opacity,
    };
  });
  
  const size = 24; // Smaller size (reduced from 28)
  
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
            borderWidth: 2,
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
            borderWidth: 2,
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
            size={16} 
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
}: {
  sphere: LifeSphere;
  position: { x: number; y: number };
  colorScheme: 'light' | 'dark';
  colors: any;
  onPress: () => void;
  sunnyPercentage: number; // 0-100, percentage of sunny moments
  selectedSphere: LifeSphere | null;
  zoomProgress: ReturnType<typeof useSharedValue<number>>;
}) {
  const sphereSize = 80;
  
  const sphereIcons = {
    relationships: 'favorite',
    career: 'work',
    family: 'family-restroom',
    friends: 'people',
    hobbies: 'sports-esports',
  };
  
  // Determine sphere background color based on sunny vs cloudy
  // Lighter for more suns, darker for more clouds
  const sphereBackgroundColor = React.useMemo(() => {
    const isMoreSunny = sunnyPercentage >= 50;
    
    if (sphere === 'relationships') {
      if (isMoreSunny) {
        // More sunny - lighter pink/red
        return colorScheme === 'dark' 
          ? `rgba(255, 150, 150, ${0.4 + (sunnyPercentage / 100) * 0.3})` // Lighter pink
          : `rgba(255, 200, 200, ${0.5 + (sunnyPercentage / 100) * 0.3})`; // Lighter pink
      } else {
        // More cloudy - darker red
        const cloudyPercentage = 100 - sunnyPercentage;
        return colorScheme === 'dark'
          ? `rgba(180, 60, 60, ${0.3 + (cloudyPercentage / 100) * 0.4})` // Darker red
          : `rgba(200, 100, 100, ${0.4 + (cloudyPercentage / 100) * 0.4})`; // Darker red
      }
    } else if (sphere === 'career') {
      // Career sphere
      if (isMoreSunny) {
        // More sunny - lighter blue
        return colorScheme === 'dark' 
          ? `rgba(150, 200, 255, ${0.4 + (sunnyPercentage / 100) * 0.3})` // Lighter blue
          : `rgba(200, 230, 255, ${0.5 + (sunnyPercentage / 100) * 0.3})`; // Lighter blue
      } else {
        // More cloudy - darker blue
        const cloudyPercentage = 100 - sunnyPercentage;
        return colorScheme === 'dark'
          ? `rgba(60, 100, 180, ${0.3 + (cloudyPercentage / 100) * 0.4})` // Darker blue
          : `rgba(100, 130, 200, ${0.4 + (cloudyPercentage / 100) * 0.4})`; // Darker blue
      }
    } else if (sphere === 'family') {
      // Family sphere
      if (isMoreSunny) {
        // More sunny - lighter purple/violet
        return colorScheme === 'dark' 
          ? `rgba(200, 150, 255, ${0.4 + (sunnyPercentage / 100) * 0.3})` // Lighter purple
          : `rgba(230, 200, 255, ${0.5 + (sunnyPercentage / 100) * 0.3})`; // Lighter purple
      } else {
        // More cloudy - darker purple
        const cloudyPercentage = 100 - sunnyPercentage;
        return colorScheme === 'dark'
          ? `rgba(120, 60, 180, ${0.3 + (cloudyPercentage / 100) * 0.4})` // Darker purple
          : `rgba(150, 100, 200, ${0.4 + (cloudyPercentage / 100) * 0.4})`; // Darker purple
      }
    } else if (sphere === 'friends') {
      // Friends sphere - purple/violet
      if (isMoreSunny) {
        return colorScheme === 'dark' 
          ? `rgba(139, 92, 246, ${0.4 + (sunnyPercentage / 100) * 0.3})` // Lighter purple
          : `rgba(167, 139, 250, ${0.5 + (sunnyPercentage / 100) * 0.3})`; // Lighter purple
      } else {
        const cloudyPercentage = 100 - sunnyPercentage;
        return colorScheme === 'dark'
          ? `rgba(88, 28, 135, ${0.3 + (cloudyPercentage / 100) * 0.4})` // Darker purple
          : `rgba(124, 58, 237, ${0.4 + (cloudyPercentage / 100) * 0.4})`; // Darker purple
      }
    } else {
      // Hobbies sphere - orange
      if (isMoreSunny) {
        return colorScheme === 'dark' 
          ? `rgba(249, 115, 22, ${0.4 + (sunnyPercentage / 100) * 0.3})` // Lighter orange
          : `rgba(255, 157, 88, ${0.5 + (sunnyPercentage / 100) * 0.3})`; // Lighter orange
      } else {
        const cloudyPercentage = 100 - sunnyPercentage;
        return colorScheme === 'dark'
          ? `rgba(154, 52, 18, ${0.3 + (cloudyPercentage / 100) * 0.4})` // Darker orange
          : `rgba(234, 88, 12, ${0.4 + (cloudyPercentage / 100) * 0.4})`; // Darker orange
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

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        left: position.x - sphereSize / 2,
        top: position.y - sphereSize / 2,
        width: sphereSize,
        height: sphereSize,
        zIndex: 50,
      }}
    >
      <Animated.View
        style={[
          {
            width: sphereSize,
            height: sphereSize,
            borderRadius: sphereSize / 2,
            backgroundColor: sphereBackgroundColor,
            justifyContent: 'center',
            alignItems: 'center',
          },
          animatedStyle,
        ]}
      >
        <MaterialIcons
          name={sphereIcons[sphere] as any}
          size={sphereSize * 0.5}
          color={colors.primaryLight}
        />
      </Animated.View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const params = useLocalSearchParams();
  const { 
    profiles, 
    jobs, 
    familyMembers,
    friends,
    hobbies,
    idealizedMemories,
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
      ]).catch((error) => {
        console.error('[HomeScreen] Error reloading data:', error);
        hasReloadedRef.current = false; // Reset on error so we can retry
      });
      
      // Reset reload flag when screen loses focus (cleanup)
      return () => {
        hasReloadedRef.current = false;
      };
    }, [reloadIdealizedMemories, reloadProfiles, reloadJobs, reloadFamilyMembers, reloadFriends, reloadHobbies])
  );
  
  // Track selected sphere (null = showing all spheres, otherwise showing focused sphere)
  // Initialize from URL params if present
  const sphereParam = params.sphere && typeof params.sphere === 'string' && ['relationships', 'career', 'family', 'friends', 'hobbies'].includes(params.sphere) 
    ? (params.sphere as LifeSphere)
    : null;
  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(sphereParam);
  const previousSelectedSphereRef = React.useRef<LifeSphere | null>(null);
  const sphereRenderKeyRef = React.useRef<number>(0);
  
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
    const centerY = SCREEN_HEIGHT / 2;
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
    
    // Calculate number of sections (ongoing + years)
    const numSections = (ongoingProfiles.length > 0 ? 1 : 0) + sortedYears.length;
    const sectionHeight = numSections > 0 ? availableHeight / numSections : availableHeight;
    
    let currentTop = topPadding;
    
    // Create "Ongoing" section at the top if there are ongoing partners
    if (ongoingProfiles.length > 0) {
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
  }, [sortedProfiles]);
  
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
        console.warn('Error parsing job end date:', job.id, job.endDate);
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
  
  // Get the section key for a profile
  const getProfileSectionKey = React.useCallback((profile: any): string | null => {
    if (profile.relationshipEndDate === null || profile.relationshipEndDate === undefined) {
      return 'ongoing';
    } else {
      const year = new Date(profile.relationshipEndDate).getFullYear();
      return year.toString();
    }
  }, []);

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
  const { isVisible: isSplashVisible } = useSplash();
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

  // Storage key for avatar positions
  const AVATAR_POSITIONS_KEY = '@sferas:avatar_positions';

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
        console.error('Error loading avatar positions:', error);
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
      AsyncStorage.setItem(AVATAR_POSITIONS_KEY, JSON.stringify(positionsObj)).catch((error) => {
        console.error('Error saving avatar positions:', error);
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
          backgroundColor: colors.background,
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
      // The ref will be cleared when a new profile is focused
      // Reset animations complete flag when unfocusing
      setAnimationsComplete(false);
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
    }
  }, [focusedJobId]);

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
  const slideOffset = useSharedValue(0);
  
  // CRITICAL: Immediately reset slideOffset when sphere changes to ensure profiles are visible
  // This must run before the animation logic to prevent profiles from staying hidden
  React.useLayoutEffect(() => {
    // When sphere changes, immediately reset slideOffset to 0 to make profiles visible
    // This fixes the issue where profiles stay hidden after drilling into a memory and switching spheres
    slideOffset.value = 0;
  }, [selectedSphere, slideOffset]);
  
  // Use useLayoutEffect to start animation synchronously before paint to prevent flash
  React.useLayoutEffect(() => {
    if (animationsReady) {
      // Animate smoothly when focusing or unfocusing
      // Keep other ex-es hidden if either profile OR memory is focused
      const easingConfig = Easing.bezier(0.4, 0.0, 0.2, 1); // Smooth ease-in-out curve
      if (focusedProfileId || focusedJobId || focusedMemory) {
        // Slide other zones out with smooth fade
        const targetValue = SCREEN_WIDTH * 2;
        const currentValue = slideOffset.value;
        
        // Only start animation if not already at target (prevents restarting)
        if (Math.abs(currentValue - targetValue) > 1) {
          slideOffset.value = withTiming(targetValue, {
            duration: 1200, // Match the zoom-in duration for synchronized animation
            easing: easingConfig,
          }, (finished) => {
            'worklet';
            if (finished) {
              runOnJS(handleSlideOutComplete)();
            }
          });
        }
      } else {
        // Slide other zones back in - only when both profile and memory are unfocused
        // Start almost immediately when zoom-out begins for synchronized animation
        const currentValue = slideOffset.value;
        if (Math.abs(currentValue - 0) > 1) {
          slideOffset.value = withTiming(0, {
            duration: 600, // Faster appearance - 600ms instead of 1200ms
            easing: easingConfig,
          }, (finished) => {
            'worklet';
            // Animation complete - unfocusing is done
            if (finished) {
              runOnJS(handleSlideInComplete)();
            }
          });
        } else {
          // Already at 0, just reset the completion callback
          runOnJS(handleSlideInComplete)();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedProfileId, focusedMemory, animationsReady, handleSlideOutComplete, handleSlideInComplete]);
  
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
        // If section doesn't exist, log a warning but still try to add the job
        if (!jobYearSections.has(sectionKey)) {
          console.warn(`Job ${job.id} section key "${sectionKey}" not found in jobYearSections. Job might not display.`);
        }
        // Add job to section anyway - we want all jobs to show
        if (!grouped.has(sectionKey)) {
          grouped.set(sectionKey, []);
        }
        grouped.get(sectionKey)!.push({ job, index: indexInSorted });
      } else {
        console.warn(`Job ${job.id} has no valid section key. Skipping.`);
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
          
          // Log warning if section doesn't exist in yearSections
          if (!yearSections.has(sectionKey)) {
            console.warn(`[profilesBySection] Profile ${profile.id} (${profile.name}) has section key "${sectionKey}" but section doesn't exist in yearSections. Profile will still be rendered.`);
        }
        } else {
          console.warn(`[profilesBySection] Profile ${profile.id} (${profile.name}) not found in sortedProfiles. Index: ${indexInSorted}`);
        }
      } else {
        console.warn(`[profilesBySection] Profile ${profile.id} (${profile.name}) has no valid section key. Skipping.`);
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
  const focusedProfilesRender = useMemo(() => {
    if (!animationsReady || !focusedProfileId || focusedMemory) return null;
    
    return visibleProfiles.map((profile, index) => {
      const memories = getIdealizedMemoriesByProfileId(profile.id);
      const currentPosition = getAvatarPosition(profile.id, index);
      const isFocused = focusedProfileId === profile.id;
      // Calculate wasJustFocused here
      const wasJustFocused = previousFocusedIdRef.current === profile.id && !focusedProfileId && !focusedMemory;
      
      return (
        <ProfileRenderer
          key={profile.id}
          profile={profile}
          index={index}
          memories={memories}
          currentPosition={currentPosition}
          isFocused={isFocused}
          isProfileFocusedForMemory={false}
          wasJustFocused={wasJustFocused}
          focusedMemory={focusedMemory}
          slideOffset={slideOffset}
          getProfileYearSection={getProfileYearSection}
          updateAvatarPosition={updateAvatarPosition}
          setFocusedProfileId={setFocusedProfileId}
          setFocusedMemory={setFocusedMemory}
          colors={colors}
          colorScheme={colorScheme ?? 'dark'}
          memorySlideOffset={memorySlideOffset}
          animationsComplete={animationsComplete}
          focusedProfileId={focusedProfileId}
        />
      );
    });
  }, [animationsReady, focusedProfileId, focusedMemory, visibleProfiles, getIdealizedMemoriesByProfileId, getAvatarPosition, previousFocusedIdRef, slideOffset, getProfileYearSection, updateAvatarPosition, setFocusedProfileId, setFocusedMemory, colors, colorScheme, memorySlideOffset, animationsComplete]);

  // Render sphere view - show all 3 spheres with memories floating around, center shows overall percentage
  // When a sphere is selected, show the entities for that sphere (like year sections for relationships)
  if (!selectedSphere) {
  return (
    <TabScreenContainer>
        <View style={{ flex: 1, height: SCREEN_HEIGHT, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
          {/* Center - Overall Percentage Avatar */}
          <View
            style={{
              position: 'absolute',
              left: SCREEN_WIDTH / 2 - 60,
              top: SCREEN_HEIGHT / 2 - 60,
              width: 120,
              height: 120,
              zIndex: 100,
            }}
          >
            <OverallPercentageAvatar
              percentage={overallSunnyPercentage}
              colorScheme={colorScheme ?? 'dark'}
              colors={colors}
            />
          </View>

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
              />
              
              {/* Floating Partners around Relationships Sphere */}
              {sortedProfiles.slice(0, Math.min(sortedProfiles.length, 5)).map((profile, index) => {
                const totalPartners = Math.min(sortedProfiles.length, 5);
                const angle = (index * 2 * Math.PI) / totalPartners;
                const radius = 65; // Closer to sphere (reduced from 100)
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
                const radius = 65; // Closer to sphere (reduced from 100)
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
                const radius = 65; // Closer to sphere (reduced from 100)
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
                const radius = 65; // Closer to sphere (reduced from 100)
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
                const radius = 65; // Closer to sphere (reduced from 100)
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
              top: 50,
              left: 20,
              zIndex: 1000,
              width: 50,
              height: 50,
              borderRadius: 25,
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
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
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
                  top: 50,
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
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.content,
              {
                minHeight: SCREEN_HEIGHT,
                height: Math.max(
                  SCREEN_HEIGHT,
                  sortedProfiles.length > 0
                    ? (sortedProfiles.length - 1) * ((SCREEN_HEIGHT - (120 + 20) * 2) / Math.max(1, sortedProfiles.length - 1)) + (120 + 20) * 2
                    : SCREEN_HEIGHT
                ),
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={!focusedProfileId && !focusedJobId && !focusedMemory}
          >
            {/* Render year sections with profiles inside - hidden when focused */}
            {(() => {
              // CRITICAL: Only use focusedMemory if it's from relationships sphere
              const relevantFocusedMemory = getFocusedMemoryForSphere('relationships');
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
              top: 50,
              left: 20,
              zIndex: 1000,
              width: 50,
              height: 50,
              borderRadius: 25,
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
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
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
                  top: 50,
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
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.content,
              {
                minHeight: SCREEN_HEIGHT,
                height: Math.max(
                  SCREEN_HEIGHT,
                  sortedJobs.length > 0
                    ? (sortedJobs.length - 1) * ((SCREEN_HEIGHT - (120 + 20) * 2) / Math.max(1, sortedJobs.length - 1)) + (120 + 20) * 2
                    : SCREEN_HEIGHT
                ),
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={!focusedJobId && !focusedMemory}
          >
            {/* Render year sections with jobs inside */}
            {animationsReady && !focusedMemory && (
              <>
                {/* Year section backgrounds */}
                {Array.from(jobYearSections.entries()).map(([key, section]) => (
                  <YearSectionBackground
                    key={`job-year-section-bg-${key}`}
                    section={section}
                    colorScheme={colorScheme ?? 'dark'}
                    hideTitle={!!focusedMemory || !!focusedJobId}
                  />
                ))}
                
                {/* Render jobs in their year sections */}
                {Array.from(jobsBySection.entries()).map(([sectionKey, jobsData]) => {
                  const section = jobYearSections.get(sectionKey);
                  if (!section) {
                    console.warn(`Section ${sectionKey} not found in jobYearSections`);
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
                    
                    // Hide unfocused jobs when a job is focused
                    if (focusedJobId && !isFocused) {
                      return null;
                    }
                    
                    return (
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
                    );
                  });
                })}
              </>
            )}
            
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
              top: 50,
              left: 20,
              zIndex: 1000,
              width: 50,
              height: 50,
              borderRadius: 25,
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
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
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
                  top: 50,
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
          
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.content,
              {
                minHeight: SCREEN_HEIGHT,
                height: Math.max(
                  SCREEN_HEIGHT,
                  familyMembers.length > 0
                    ? (familyMembers.length - 1) * ((SCREEN_HEIGHT - (120 + 20) * 2) / Math.max(1, familyMembers.length - 1)) + (120 + 20) * 2
                    : SCREEN_HEIGHT
                ),
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={!focusedFamilyMemberId && !focusedMemory}
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
                  
                  // Hide unfocused family members when a family member is focused
                  if (focusedFamilyMemberId && !isFocused) {
                    return null;
                  }
                  
                  return (
                    <FloatingAvatar
                      key={`family-member-${member.id}`}
                      profile={member}
                      position={position}
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
                    />
                  );
                })}
              </>
            )}
            
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

  // For friends sphere, show friends in a simple list (no year sections)
  if (selectedSphere === 'friends') {
    return (
      <TabScreenContainer>
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
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
              top: 50,
              left: 20,
              zIndex: 1000,
              width: 50,
              height: 50,
              borderRadius: 25,
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
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
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
                  top: 50,
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
          
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.content,
              {
                minHeight: SCREEN_HEIGHT,
                height: Math.max(
                  SCREEN_HEIGHT,
                  friends.length > 0
                    ? (friends.length - 1) * ((SCREEN_HEIGHT - (120 + 20) * 2) / Math.max(1, friends.length - 1)) + (120 + 20) * 2
                    : SCREEN_HEIGHT
                ),
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={!focusedFriendId && !focusedMemory}
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
                  
                  // Hide unfocused friends when a friend is focused
                  if (focusedFriendId && !isFocused) {
                    return null;
                  }
                  
                  return (
                    <FloatingAvatar
                      key={`friend-${friend.id}`}
                      profile={friend}
                      position={position}
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
                    />
                  );
                })}
              </>
            )}
            
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

  // For hobbies sphere, show hobbies in a simple list (no year sections)
  if (selectedSphere === 'hobbies') {
    return (
      <TabScreenContainer>
        <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
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
              top: 50,
              left: 20,
              zIndex: 1000,
              width: 50,
              height: 50,
              borderRadius: 25,
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
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
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
                  top: 50,
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
          
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.content,
              {
                minHeight: SCREEN_HEIGHT,
                height: Math.max(
                  SCREEN_HEIGHT,
                  hobbies.length > 0
                    ? (hobbies.length - 1) * ((SCREEN_HEIGHT - (120 + 20) * 2) / Math.max(1, hobbies.length - 1)) + (120 + 20) * 2
                    : SCREEN_HEIGHT
                ),
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={!focusedHobbyId && !focusedMemory}
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
                  
                  // Hide unfocused hobbies when a hobby is focused
                  if (focusedHobbyId && !isFocused) {
                    return null;
                  }
                  
                  return (
                    <FloatingAvatar
                      key={`hobby-${hobby.id}`}
                      profile={hobby}
                      position={position}
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
                    />
                  );
                })}
              </>
            )}
            
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

  return (
    <TabScreenContainer>
      <View style={[styles.container, { height: SCREEN_HEIGHT }]}>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            {
              minHeight: SCREEN_HEIGHT,
              // Calculate content height to fit all profiles in list layout
              height: Math.max(
                SCREEN_HEIGHT,
                sortedProfiles.length > 0
                  ? (sortedProfiles.length - 1) * ((SCREEN_HEIGHT - (120 + 20) * 2) / Math.max(1, sortedProfiles.length - 1)) + (120 + 20) * 2
                  : SCREEN_HEIGHT
              ),
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            },
          ]}
          showsVerticalScrollIndicator={true}
          scrollEnabled={!focusedProfileId && !focusedMemory}
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
  
  return (
    <>
      {/* Render section backgrounds */}
      {Array.from(yearSections.entries()).map(([key, section]) => (
        <YearSectionBackground
          key={`year-section-bg-${key}`}
          section={section}
          colorScheme={colorScheme}
          hideTitle={!!safeFocusedMemory || !!focusedProfileId}
        />
      ))}
      
      {/* Render profiles at the same level (not nested in sections) */}
      {(() => {
        return Array.from(profilesBySection.entries()).flatMap(([key, sectionProfilesData]) => {
        return sectionProfilesData.map(({ profile, index: profileIndex }) => {
          const profileData = profileDataMap.get(profile.id);
            if (!profileData) {
              console.warn(`[YearSectionsRenderer] Profile ${profile.id} (${profile.name || 'unnamed'}) not found in profileDataMap! profileDataMap has ${profileDataMap.size} entries. Available IDs: ${Array.from(profileDataMap.keys()).join(', ')}`);
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
}: {
  section: { year: number | string; top: number; bottom: number; height: number };
  colorScheme: 'light' | 'dark';
  hideTitle?: boolean;
}) {
  const t = useTranslate();
  
  // Translate section year if it's a string, otherwise display the number
  const displayYear = typeof section.year === 'string' 
    ? (section.year === 'Ongoing' ? t('profile.ongoing') : section.year === 'Current' ? t('job.current') : section.year)
    : section.year;
  
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
      {/* Year label - hide when memory or job is focused */}
      {!hideTitle && (
      <ThemedText
        size="xl"
        weight="bold"
        style={{
          position: 'absolute',
          left: 16,
          top: 8,
          opacity: 0.6,
          color: colorScheme === 'dark' ? '#ffffff' : '#000000',
        }}
      >
        {displayYear}
      </ThemedText>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.section.year === nextProps.section.year &&
    prevProps.section.top === nextProps.section.top &&
    prevProps.section.bottom === nextProps.section.bottom &&
    prevProps.section.height === nextProps.section.height &&
    prevProps.colorScheme === nextProps.colorScheme &&
    prevProps.hideTitle === nextProps.hideTitle
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
  
  // Skip rendering unfocused partners and their memories/moments when animations are complete
  // This prevents unnecessary re-renders for components not visible in viewport
  // Note: focusedMemory is already filtered by sphere in YearSectionsRenderer, so we can safely check it here
  if (animationsComplete && focusedProfileId && !isFocused) {
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
