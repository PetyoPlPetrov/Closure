import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLargeDevice } from '@/hooks/use-large-device';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { useSplash } from '@/utils/SplashAnimationProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Draggable Moment Component (for focused memory view)
function DraggableMoment({
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
  const entranceProgress = useSharedValue(hasStartPosition ? 1 : 1); // Set to 1 when hasStartPosition to avoid affecting opacity
  const scale = useSharedValue(hasStartPosition ? 0.3 : 1);
  const opacity = useSharedValue(hasStartPosition ? 0.95 : 1); // Start almost fully visible at button position to prevent blink
  
  // Use the actual content size as the draggable area (no extra padding)
  const hitAreaWidth = width;
  const hitAreaHeight = height;
  
  // Entrance animation with delay - if start position provided, animate from there
  React.useEffect(() => {
    if (hasStartPosition && propStartX !== undefined && propStartY !== undefined && !animationStartedRef.current) {
      // Mark animation as started to prevent reset
      animationStartedRef.current = true;
      
      // Set initial values immediately and synchronously to prevent any flash
      panX.value = propStartX;
      panY.value = propStartY;
      opacity.value = 0.95; // Start almost fully visible to prevent any blink
      scale.value = 0.3;
      entranceProgress.value = 1; // Set to 1 so it doesn't affect opacity (we use opacity.value directly)
      
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
      entranceProgress.value = 0;
      const timer = setTimeout(() => {
        entranceProgress.value = withSpring(1, {
          damping: 12,
          stiffness: 150,
          mass: 0.8,
        });
      }, entranceDelay);
      return () => clearTimeout(timer);
    }
    // If animation has started, don't reset anything even if start position is cleared
  }, [entranceProgress, entranceDelay, hasStartPosition, propStartX, propStartY, initialX, initialY, panX, panY, opacity, scale]);
  
  // Update position when initial values change (but not while dragging)
  React.useEffect(() => {
    if (!isDragging.value && !hasStartPosition) {
      panX.value = initialX;
      panY.value = initialY;
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
}

// Floating Avatar Component
function FloatingAvatar({
  profile,
  position,
  memories,
  onPress,
  colors,
  colorScheme,
  onPositionChange,
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
  onPositionChange: (newPosition: { x: number; y: number }) => void;
  isFocused: boolean;
  focusedMemory?: { profileId: string; memoryId: string } | null;
  memorySlideOffset?: ReturnType<typeof useSharedValue<number>>;
  onMemoryFocus?: (profileId: string, memoryId: string) => void;
  yearSection?: { year: number | string; top: number; bottom: number; height: number };
}) {
  const baseAvatarSize = 80;
  const focusedAvatarSize = 100; // Smaller focused size so memories fit
  const avatarSize = isFocused ? focusedAvatarSize : baseAvatarSize;
  // Memory radius - closer to avatar for more compact layout
  const memoryRadius = isFocused ? 135 : 60; // Slightly further when focused
  const exZoneRadius = isFocused ? 215 : 120; // Adjusted zone when memories are further
  
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
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
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
      dragging: isDragging.value,
    }),
    (current: { avatarX: number; avatarY: number; dragging: boolean }) => {
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

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          console.log(`[FloatingAvatar] onStartShouldSetPanResponder called for profile: ${profile.id}, returning false`);
          return false; // Don't capture immediately, let Pressable handle taps
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only capture if there's significant movement (dragging)
          const { dx, dy } = gestureState;
          const shouldCapture = Math.abs(dx) > 5 || Math.abs(dy) > 5;
          if (shouldCapture) {
            console.log(`[FloatingAvatar] onMoveShouldSetPanResponder: significant movement detected (dx: ${dx}, dy: ${dy}) for profile: ${profile.id}`);
          }
          return shouldCapture;
        },
        onPanResponderGrant: () => {
          // Stop floating animation while dragging
          floatAnimation.value = 0;
          isDragging.value = true;
        },
        onPanResponderMove: (_, gestureState) => {
          const newX = position.x + gestureState.dx;
          const newY = position.y + gestureState.dy;
          
          // Constrain to year section if available, otherwise use viewport bounds
          let minY, maxY, minX, maxX;
          if (yearSection) {
            // Strictly constrain to year section - avatar center must stay within bounds
            const avatarHalfSize = avatarSize / 2;
            minY = yearSection.top + exZoneRadius;
            maxY = yearSection.bottom - exZoneRadius;
            // Ensure avatar itself doesn't go outside section
            minY = Math.max(minY, yearSection.top + avatarHalfSize);
            maxY = Math.min(maxY, yearSection.bottom - avatarHalfSize);
            
            // X bounds: keep within viewport but also ensure memories don't go outside
            minX = exZoneRadius;
            maxX = SCREEN_WIDTH - exZoneRadius;
          } else {
            // Fallback to viewport bounds
            const avatarHalfSize = avatarSize / 2;
            minY = avatarHalfSize;
            maxY = SCREEN_HEIGHT - avatarHalfSize;
            minX = exZoneRadius;
            maxX = SCREEN_WIDTH - exZoneRadius;
          }
          
          const constrainedX = Math.max(minX, Math.min(maxX, newX));
          const constrainedY = Math.max(minY, Math.min(maxY, newY));
          
          // Avatar moves immediately
          panX.value = constrainedX;
          panY.value = constrainedY;
          // Memories will follow via the useAnimatedReaction above
        },
        onPanResponderRelease: (_, gestureState) => {
          const newX = position.x + gestureState.dx;
          const newY = position.y + gestureState.dy;
          
          // Constrain to year section if available, otherwise use viewport bounds
          let minY, maxY, minX, maxX;
          if (yearSection) {
            // Strictly constrain to year section - avatar center must stay within bounds
            const avatarHalfSize = avatarSize / 2;
            minY = yearSection.top + exZoneRadius;
            maxY = yearSection.bottom - exZoneRadius;
            // Ensure avatar itself doesn't go outside section
            minY = Math.max(minY, yearSection.top + avatarHalfSize);
            maxY = Math.min(maxY, yearSection.bottom - avatarHalfSize);
            
            // X bounds: keep within viewport but also ensure memories don't go outside
            minX = exZoneRadius;
            maxX = SCREEN_WIDTH - exZoneRadius;
          } else {
            // Fallback to viewport bounds
            const avatarHalfSize = avatarSize / 2;
            minY = avatarHalfSize;
            maxY = SCREEN_HEIGHT - avatarHalfSize;
            minX = exZoneRadius;
            maxX = SCREEN_WIDTH - exZoneRadius;
          }
          
          const constrainedX = Math.max(minX, Math.min(maxX, newX));
          const constrainedY = Math.max(minY, Math.min(maxY, newY));
          
          // Update avatar position with spring animation
          panX.value = withSpring(constrainedX);
          panY.value = withSpring(constrainedY);
          
          // Memories will catch up via the useAnimatedReaction
          isDragging.value = false;
          
          // Notify parent of position change
          onPositionChange({ x: constrainedX, y: constrainedY });
          
          // Resume floating animation after a delay
          setTimeout(() => {
            floatAnimation.value = withRepeat(
              withSequence(
                withTiming(1, { duration: 2000 }),
                withTiming(0, { duration: 2000 })
              ),
              -1,
              true
            );
          }, 300);
        },
      }),
      // SharedValues are stable references, but included to satisfy linter
     [position, onPositionChange, floatAnimation, isDragging, panX, panY, exZoneRadius, profile.id, yearSection, avatarSize]
   );

  // Scale animation for focused state - avatar scales to 1.5x (smaller to fit memories)
  const scale = useSharedValue(isFocused ? 1.5 : 1);
  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.5 : 1, {
      damping: 15,
      stiffness: 100,
    });
  }, [isFocused, scale]);
  
  // Center the avatar when focused
  const focusedX = useSharedValue(SCREEN_WIDTH / 2);
  const focusedY = useSharedValue(SCREEN_HEIGHT / 2);
  React.useEffect(() => {
    if (isFocused) {
      // Center the avatar on screen when focused
      focusedX.value = withSpring(SCREEN_WIDTH / 2, {
        damping: 15,
        stiffness: 100,
      });
      focusedY.value = withSpring(SCREEN_HEIGHT / 2, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      focusedX.value = withSpring(position.x, {
        damping: 15,
        stiffness: 100,
      });
      focusedY.value = withSpring(position.y, {
        damping: 15,
        stiffness: 100,
      });
    }
  }, [isFocused, position.x, position.y, focusedX, focusedY]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isFocused) {
      // When focused, use centered position - no floating animation
      return {
        transform: [
          { translateX: focusedX.value - position.x },
          { translateY: focusedY.value - position.y },
          { scale: scale.value },
        ],
      };
    }
    // When not focused, use pan position with floating animation
    return {
      transform: [
        { translateX: panX.value - position.x },
        { translateY: panY.value - position.y + floatAnimation.value * 6 },
        { scale: scale.value },
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
      const variedRadius = memoryRadius * momentsDistanceMultiplier * distanceVariation;
      
      // Distribute angles evenly around the circle
      const angle = (memIndex * 2 * Math.PI) / memories.length;
      
      // Add slight angle variation for more organic feel
      const angleVariation = (Math.cos(variationSeed * 2) * 0.15); // ±15% angle variation
      const variedAngle = angle + angleVariation;
      
      return {
        angle: variedAngle,
        offsetX: variedRadius * Math.cos(variedAngle),
        offsetY: variedRadius * Math.sin(variedAngle),
      };
    });
  }, [memories, memoryRadius]); // memoryRadius already depends on isFocused

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
        {...(!isFocused ? panResponder.panHandlers : {})}
      >
        <Pressable
          style={{ pointerEvents: 'auto' }} // Ensure Pressable can receive touches
          onPress={() => {
            console.log(`[FloatingAvatar] Press detected for profile: ${profile.id}, isFocused: ${isFocused}`);
            onPress();
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
          </View>
        </Pressable>
      </Animated.View>

      {/* Floating Memories around Avatar - rendered separately for proper z-index */}
      {memories
        .filter((memory) => {
          // If a memory is focused, only show that memory
          if (focusedMemory) {
            return focusedMemory.profileId === profile.id && focusedMemory.memoryId === memory.id;
          }
          // If profile is focused, show all its memories
          if (isFocused) {
            return true;
          }
          // If nothing is focused, show all memories
          return true;
        })
        .map((memory, memIndex) => {
        // Find the original index in the full memories array for position calculation
        const originalIndex = memories.findIndex(m => m.id === memory.id);
        const memPosData = memoryPositions[originalIndex];
        // Safety check: if we have more memories than animated values, use the last available one
        const memAnimatedValues = memoryAnimatedValues[originalIndex] || memoryAnimatedValues[memoryAnimatedValues.length - 1];
        
        // Initial position for first render
        const initialMemPos = {
          x: position.x + memPosData.offsetX,
          y: position.y + memPosData.offsetY,
        };
        
        // Calculate maximum memory size based on viewport constraints
        // Worst case: memory at memoryRadius from avatar, with moments orbiting at maxMomentRadius from memory
        // We need to ensure the entire EX zone fits: avatar + memoryRadius + memorySize/2 + maxMomentRadius + maxMomentSize/2 <= viewport edge
        const cloudSize = isFocused ? 20 : 24;
        const sunSize = isFocused ? 18 : 22;
        const maxMomentSize = Math.max(cloudSize, sunSize);
        const cloudRadius = isFocused ? 40 : 25;
        const sunRadius = isFocused ? 38 : 22;
        const maxMomentRadius = Math.max(cloudRadius, sunRadius);
        
        // Calculate distances from avatar center to nearest viewport edges
        // This ensures memories fit even when avatar is near edges
        const distanceToLeft = position.x;
        const distanceToRight = SCREEN_WIDTH - position.x;
        const distanceToTop = position.y;
        const distanceToBottom = SCREEN_HEIGHT - position.y;
        const minDistanceToEdge = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
        
        // Calculate maximum memory size that fits
        // Total distance from avatar to furthest moment edge = memoryRadius + memorySize/2 + maxMomentRadius + maxMomentSize/2
        // We need: memoryRadius + memorySize/2 + maxMomentRadius + maxMomentSize/2 <= minDistanceToEdge
        // Solving for memorySize: memorySize <= 2 * (minDistanceToEdge - memoryRadius - maxMomentRadius - maxMomentSize/2 - padding)
        const padding = 20; // Extra safety padding to ensure nothing goes outside viewport
        const availableSpace = minDistanceToEdge - memoryRadius - maxMomentRadius - maxMomentSize / 2 - padding;
        const calculatedMaxMemorySize = Math.max(30, Math.min(100, availableSpace * 2)); // Clamp between 30 and 100
        
        // Use the calculated size, but prefer focused/unfocused sizes if they're smaller
        const baseMemorySize = isFocused ? 65 : 50;
        const memorySize = Math.min(baseMemorySize, calculatedMaxMemorySize);
        
        return (
          <FloatingMemory
            key={`memory-${memory.id}-${memIndex}`}
            memory={memory}
            position={initialMemPos}
            avatarPanX={memAnimatedValues.panX}
            avatarPanY={memAnimatedValues.panY}
            focusedX={isFocused ? focusedX : undefined}
            focusedY={isFocused ? focusedY : undefined}
            offsetX={memPosData.offsetX}
            offsetY={memPosData.offsetY}
            isFocused={isFocused}
            colorScheme={colorScheme}
            calculatedMemorySize={memorySize}
            isMemoryFocused={focusedMemory?.profileId === profile.id && focusedMemory?.memoryId === memory.id}
            memorySlideOffset={memorySlideOffset}
            onPress={onPress}
            onMemoryFocus={onMemoryFocus}
          />
        );
      })}
    </>
  );
}

// Floating Memory Component
function FloatingMemory({
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
  onMemoryFocus?: (profileId: string, memoryId: string) => void;
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
  }, [memory.hardTruths, visibleMomentIds, onUpdateMemory, calculateClampedPosition, cloudWidth, cloudHeight, memorySize]);
  
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
  }, [memory.goodFacts, visibleMomentIds, onUpdateMemory, calculateClampedPosition, sunWidth, sunHeight, memorySize]);
  
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
      const memoryCenterY = SCREEN_HEIGHT / 2 - 100; // Moved up by 100px to match memory position
      const padding = 20; // Padding from edges
      const minX = padding + momentWidth / 2;
      const maxX = SCREEN_WIDTH - padding - momentWidth / 2;
      const minY = padding + momentHeight / 2;
      const maxY = SCREEN_HEIGHT - padding - momentHeight / 2;
      const availableWidth = maxX - minX;
      
      let momentX: number | undefined = undefined;
      let momentY: number | undefined = undefined;
      
      // Special positioning for clouds: place them just above and just below the memory image
      if (momentType === 'cloud') {
        const memoryBottom = memoryCenterY + (memorySize / 2);
        const memoryTop = memoryCenterY - (memorySize / 2);
        const cloudSpacing = 60; // Distance from memory edge
        const cloudYAbove = memoryTop - cloudSpacing - momentHeight / 2;
        const cloudYBelow = memoryBottom + cloudSpacing + momentHeight / 2;
        
        // Split clouds between above and below
        const cloudsAbove = Math.ceil(totalCount / 2);
        const cloudsBelow = totalCount - cloudsAbove;
        
        let targetX: number;
        let targetY: number;
        
        if (index < cloudsAbove) {
          // Place above memory
          const aboveIndex = index;
          const spacing = availableWidth / Math.max(1, cloudsAbove - 1);
          targetX = minX + (aboveIndex * spacing);
          targetY = cloudYAbove;
        } else {
          // Place below memory
          const belowIndex = index - cloudsAbove;
          const spacing = availableWidth / Math.max(1, cloudsBelow - 1);
          targetX = minX + (belowIndex * spacing);
          targetY = cloudYBelow;
        }
        
        // Add slight random offset for more organic feel (but keep it deterministic)
        const seed = index * 0.618; // Golden ratio for better distribution
        const offsetX = (Math.sin(seed) * availableWidth * 0.1); // ±10% of available width
        const offsetY = (Math.cos(seed * 2) * 20); // ±20px vertical offset
        
        momentX = targetX + offsetX;
        momentY = targetY + offsetY;
        
        // Final clamp to ensure moment stays within viewport
        momentX = Math.max(minX, Math.min(maxX, momentX));
        momentY = Math.max(minY, Math.min(maxY, momentY));
        
        return { x: momentX, y: momentY };
      }
      
      // For suns, use the original distribution logic
      // If we have saved positions, validate and use them if they're well distributed
      // Otherwise, redistribute for better coverage
      if (savedX !== undefined && savedY !== undefined) {
        // Check if saved position is within reasonable bounds
        const savedXClamped = Math.max(minX, Math.min(maxX, savedX));
        const savedYClamped = Math.max(minY, Math.min(maxY, savedY));
        
        // Use saved position if it's not too close to memory center (avoid clustering)
        const distanceFromCenter = Math.sqrt(
          Math.pow(savedXClamped - memoryCenterX, 2) + 
          Math.pow(savedYClamped - memoryCenterY, 2)
        );
        const minDistanceFromMemory = memorySize / 2 + Math.max(momentWidth, momentHeight) / 2 + 30;
        
        if (distanceFromCenter >= minDistanceFromMemory) {
          momentX = savedXClamped;
          momentY = savedYClamped;
        }
        // If saved position is too close to memory, momentX/Y remain undefined and we'll redistribute
      }
      
      // If no saved positions or saved position is invalid, distribute evenly across screen
      // Bias distribution: 70% BELOW memory center, 30% above
      if (momentX === undefined || momentY === undefined) {
        // Memory is centered at memoryCenterY (SCREEN_HEIGHT / 2)
        // Determine if this moment should be below memory (70% chance)
        const isBelowMemory = (index / totalCount) < 0.7;
        
        // Define regions relative to memory center
        const memoryBottom = memoryCenterY + (memorySize / 2);
        const memoryTop = memoryCenterY - (memorySize / 2);
        
        // Below memory region: from memory bottom to screen bottom
        const belowMemoryStart = memoryBottom + 40; // Start below memory with padding
        const belowMemoryEnd = maxY;
        const belowMemoryHeight = belowMemoryEnd - belowMemoryStart;
        
        // Above memory region: from screen top to memory top
        const aboveMemoryStart = minY;
        const aboveMemoryEnd = memoryTop - 40; // End above memory with padding
        const aboveMemoryHeight = aboveMemoryEnd - aboveMemoryStart;
        
        let targetY: number;
        let targetX: number;
        
        if (isBelowMemory) {
          // Place BELOW memory (70% of moments)
          const momentsBelow = Math.ceil(totalCount * 0.7);
          const belowIndex = index; // Index within the below-memory group
          
          // Distribute in grid below memory
          const cols = Math.ceil(Math.sqrt(momentsBelow * (availableWidth / belowMemoryHeight)));
          const rows = Math.ceil(momentsBelow / cols);
          
          const col = belowIndex % cols;
          const row = Math.floor(belowIndex / cols);
          
          const cellWidth = availableWidth / Math.max(1, cols - 1);
          const cellHeight = belowMemoryHeight / Math.max(1, rows - 1);
          
          // Base position below memory
          targetX = minX + (col * cellWidth);
          targetY = belowMemoryStart + (row * cellHeight);
        } else {
          // Place ABOVE memory (30% of moments)
          const momentsAbove = totalCount - Math.ceil(totalCount * 0.7);
          const aboveIndex = index - Math.ceil(totalCount * 0.7);
          
          const cols = Math.ceil(Math.sqrt(momentsAbove * (availableWidth / aboveMemoryHeight)));
          const rows = Math.ceil(momentsAbove / cols);
          
          const col = aboveIndex % cols;
          const row = Math.floor(aboveIndex / cols);
          
          const cellWidth = availableWidth / Math.max(1, cols - 1);
          const cellHeight = aboveMemoryHeight / Math.max(1, rows - 1);
          
          // Base position above memory
          targetX = minX + (col * cellWidth);
          targetY = aboveMemoryStart + (row * cellHeight);
        }
        
        // Add slight random offset for more organic feel (but keep it deterministic)
        const seed = index * 0.618; // Golden ratio for better distribution
        const offsetX = (Math.sin(seed) * availableWidth * 0.15); // ±15% of available width
        const offsetY = (Math.cos(seed * 2) * (isBelowMemory ? belowMemoryHeight : aboveMemoryHeight) * 0.15); // ±15% of region height
        
        momentX = targetX + offsetX;
        momentY = targetY + offsetY;
        
        // Ensure we don't place moments too close to memory center
        const distanceFromCenter = Math.sqrt(
          Math.pow(momentX - memoryCenterX, 2) + 
          Math.pow(momentY - memoryCenterY, 2)
        );
        const minDistanceFromMemory = memorySize / 2 + Math.max(momentWidth, momentHeight) / 2 + 40;
        
        if (distanceFromCenter < minDistanceFromMemory) {
          // Push moment away from memory center, prioritizing downward direction for below-memory moments
          let angle = Math.atan2(momentY - memoryCenterY, momentX - memoryCenterX);
          
          // If moment should be below memory but angle points up, adjust to point down
          if (isBelowMemory && momentY < memoryCenterY) {
            angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // Point downward (90° ± 90°)
          } else if (!isBelowMemory && momentY > memoryCenterY) {
            angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // Point upward (-90° ± 90°)
          }
          
          momentX = memoryCenterX + minDistanceFromMemory * Math.cos(angle);
          momentY = memoryCenterY + minDistanceFromMemory * Math.sin(angle);
          
          // Ensure moment stays in its assigned region
          if (isBelowMemory && momentY < belowMemoryStart) {
            momentY = belowMemoryStart + (momentHeight / 2) + 10;
          } else if (!isBelowMemory && momentY > aboveMemoryEnd) {
            momentY = aboveMemoryEnd - (momentHeight / 2) - 10;
          }
        }
      }
      
      // Final clamp to ensure moment stays within viewport
      momentX = Math.max(minX, Math.min(maxX, momentX));
      momentY = Math.max(minY, Math.min(maxY, momentY));
      
      return { x: momentX, y: momentY };
    };
  }, []);

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
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [floatAnimation, isMemoryFocused]);

  // Calculate memory position relative to avatar or center when memory is focused
  const memoryAnimatedPosition = useAnimatedStyle(() => {
    if (isMemoryFocused) {
      // When memory is focused, center it on screen (moved up by 100px)
      const offsetY = 100;
      return {
        left: SCREEN_WIDTH / 2 - memorySize / 2,
        top: SCREEN_HEIGHT / 2 - memorySize / 2 - offsetY,
      };
    }
    if (isFocused && focusedX && focusedY) {
      // When focused, follow the avatar to center
      return {
        left: focusedX.value + offsetX - memorySize / 2,
        top: focusedY.value + offsetY - memorySize / 2,
      };
    }
    if (avatarPanX && avatarPanY) {
      // When dragging, follow the avatar's pan position
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

  // Click on memory: if profile is focused, open focused memory view; otherwise focus the profile
  const handlePress = () => {
    console.log('[FloatingMemory] Press detected on memory:', memory.id, 'isFocused:', isFocused, 'isMemoryFocused:', isMemoryFocused);
    if (isMemoryFocused) {
      // Already focused, do nothing
      return;
    }
    
    if (isFocused) {
      // Profile is focused, open the focused memory view
      if (onMemoryFocus) {
        onMemoryFocus(memory.profileId, memory.id);
      }
    } else {
      // Profile is not focused, focus it
      if (onPress) {
        onPress();
      }
    }
  };

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
                  <Stop offset="100%" stopColor="#FFA500" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              {/* Background circle (cloudy/dark) */}
              <Circle
                cx={memorySize / 2}
                cy={memorySize / 2}
                r={memorySize / 2 - 4}
                stroke="#000000"
                strokeWidth={8}
                fill="none"
              />
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
                {/* Gradient overlay based on sunny/cloudy ratio - only show when profile is not focused */}
                {!isFocused && (
                  <LinearGradient
                    colors={
                      sunnyPercentage >= 50
                        ? // Sunny gradient (bright/yellow) for positive memories
                          ['rgba(255, 215, 0, 0.4)', 'rgba(255, 165, 0, 0.5)', 'rgba(255, 140, 0, 0.4)']
                        : // Dark gradient for negative memories
                          ['rgba(0, 0, 0, 0.5)', 'rgba(30, 30, 30, 0.6)', 'rgba(0, 0, 0, 0.5)']
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
        
        // Debug: Log when memory is focused
        if (isMemoryFocused) {
          console.log('[FloatingMemory] Memory focused - clouds:', cloudCount, 'suns:', sunCount, 'cloudZIndex:', cloudZIndex, 'sunZIndex:', sunZIndex);
        }
        
        return (
          <>
            {/* Floating Clouds around Memory - only show when profile is focused */}
            {isFocused && clouds
              .filter((cloud: any) => {
                // When memory is focused, only show visible moments
                if (isMemoryFocused) {
                  return cloud?.id && visibleMomentIds.has(cloud.id);
                }
                return true;
              })
              .map((cloud: any, cloudIndex: number) => {
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
            })}

            {/* Floating Suns around Memory - only show when profile is focused */}
            {isFocused && suns
              .filter((sun: any) => {
                // When memory is focused, only show visible moments
                if (isMemoryFocused) {
                  return sun?.id && visibleMomentIds.has(sun.id);
                }
                return true;
              })
              .map((sun: any, sunIndex: number) => {
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
                      colors={['#FFD700', '#FFA500', '#FF8C00']}
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
            })}
          </>
        );
      })()}
      
      {/* Cloud and Sun Buttons - only show when memory is focused */}
      {isMemoryFocused && (() => {
        const allClouds = (memory.hardTruths || []).filter((truth: any) => truth && typeof truth === 'object' && !Array.isArray(truth));
        const allSuns = (memory.goodFacts || []).filter((fact: any) => fact && typeof fact === 'object');
        const visibleCloudsCount = allClouds.filter((c: any) => c?.id && visibleMomentIds.has(c.id)).length;
        const visibleSunsCount = allSuns.filter((s: any) => s?.id && visibleMomentIds.has(s.id)).length;
        const totalCloudsCount = allClouds.length;
        const totalSunsCount = allSuns.length;
        const allCloudsVisible = totalCloudsCount > 0 && visibleCloudsCount >= totalCloudsCount;
        const allSunsVisible = totalSunsCount > 0 && visibleSunsCount >= totalSunsCount;
        
        // Calculate position below memory image (moved up by 100px to match memory)
        const offsetY = 100;
        const memoryCenterY = SCREEN_HEIGHT / 2 - offsetY;
        const memoryBottom = memoryCenterY + memorySize / 2;
        const buttonSpacing = isLargeDevice ? 12 : 10;
        const buttonSize = isLargeDevice ? 96 : 88;
        const labelWidth = 100;
        const totalWidth = buttonSize + buttonSpacing + labelWidth + buttonSpacing + buttonSize;
        const containerTop = memoryBottom + 40; // 40px spacing below memory
        
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
                borderWidth: 2,
                borderColor: 'blue',
              }}
            >
              {/* Cloud Button */}
              <View
                ref={cloudButtonRef}
                style={{ borderWidth: 2, borderColor: 'magenta' }}
                onLayout={() => {
                  cloudButtonRef.current?.measure((fx, fy, width, height, px, py) => {
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
              borderWidth: 2,
              borderColor: 'orange',
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
              RemindWhy
            </ThemedText>
          </View>
          
          {/* Sun Button */}
          <View
            ref={sunButtonRef}
            style={{ borderWidth: 2, borderColor: 'yellow' }}
            onLayout={() => {
              sunButtonRef.current?.measure((fx, fy, width, height, px, py) => {
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
                  shadowColor: colorScheme === 'dark' ? '#FFA500' : '#FFA500',
                  shadowOffset: { width: 0, height: colorScheme === 'dark' ? 14 : 12 },
                  shadowOpacity: colorScheme === 'dark' ? 0.9 : 0.7,
                  shadowRadius: colorScheme === 'dark' ? 24 : 20,
                  elevation: colorScheme === 'dark' ? 18 : 15,
                  overflow: 'visible', // Allow count text to be visible
                  borderWidth: colorScheme === 'dark' ? 2 : 1.5,
                  borderColor: colorScheme === 'dark' 
                    ? 'rgba(255, 220, 100, 0.5)' 
                    : 'rgba(255, 200, 0, 0.7)',
                  opacity: allSunsVisible ? 0.4 : 1,
                }}
              >
                <LinearGradient
                  colors={
                    colorScheme === 'dark'
                      ? ['rgba(255, 230, 140, 0.85)', 'rgba(255, 180, 70, 0.7)', 'rgba(255, 140, 40, 0.85)']
                      : ['rgba(255, 250, 200, 1)', 'rgba(255, 230, 120, 0.95)', 'rgba(255, 210, 60, 1)']
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
                      color={colorScheme === 'dark' ? '#FFD700' : '#FFA500'} 
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
      })()}
    </>
  );
}

// Floating Cloud Component
function FloatingCloud({
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
  // Make clouds smaller when focused
  const cloudSize = isFocused ? 20 : 24; // Smaller when focused

  const floatAnimation = useSharedValue(0);
  
  // Scale animation for focused state - clouds scale to 2x (bigger than avatar for visibility)
  const scale = useSharedValue(isFocused ? 2 : 1);
  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 2 : 1, {
      damping: 15,
      stiffness: 100,
    });
  }, [isFocused, scale]);
  
  React.useEffect(() => {
    floatAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
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
          <MaterialIcons name="cloud" size={16} color="#000000" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Floating Sun Component
function FloatingSun({
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
  // Make suns smaller when focused
  const sunSize = isFocused ? 18 : 22; // Smaller when focused

  const floatAnimation = useSharedValue(0);
  
  // Scale animation for focused state - suns scale to 2x (bigger than avatar for visibility)
  const scale = useSharedValue(isFocused ? 2 : 1);
  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 2 : 1, {
      damping: 15,
      stiffness: 100,
    });
  }, [isFocused, scale]);
  
  React.useEffect(() => {
    floatAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
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
          colors={['#FFD700', '#FFA500', '#FF8C00']}
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
          <MaterialIcons name="wb-sunny" size={14} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const { profiles, getIdealizedMemoriesByProfileId, updateIdealizedMemory } = useJourney();
  const t = useTranslate();
  
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
  
  // Calculate year-based sections for each profile
  // Ongoing partners get their own section at the top, then sorted by end year
  const yearSections = React.useMemo(() => {
    const sections = new Map<string, { year: number | string; top: number; bottom: number; height: number }>();
    const exZoneRadius = 120;
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
  
  // Get the year section for a profile
  const getProfileYearSection = React.useCallback((profile: any) => {
    if (profile.relationshipEndDate === null) {
      // Ongoing - use "ongoing" section
      return yearSections.get('ongoing');
    } else {
      // Ended - use end year
      const year = new Date(profile.relationshipEndDate).getFullYear();
      return yearSections.get(year.toString());
    }
  }, [yearSections]);
  
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
  const AVATAR_POSITIONS_KEY = '@closure:avatar_positions';

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
  
  // Get current position for a profile (either from state or initial)
  const getAvatarPosition = (profileId: string, index: number) => {
    return avatarPositionsState.get(profileId) || initialAvatarPositions[index] || { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
  };
  
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
  const [focusedMemory, setFocusedMemory] = useState<{ profileId: string; memoryId: string } | null>(null);
  // Track previous focused profile to handle shrink animation
  const previousFocusedIdRef = useRef<string | null>(null);
  
  // Update previous focused ID when focus changes
  React.useEffect(() => {
    if (focusedProfileId) {
      // When a profile is focused, remember it
      previousFocusedIdRef.current = focusedProfileId;
    } else {
      // When focus is cleared, keep the previous ID for a moment to handle shrink animation
      // The ref will be cleared when a new profile is focused
    }
  }, [focusedProfileId]);

  // Animated value for sliding other EX zones off-screen - only create when animations are ready
  const slideOffset = useSharedValue(0);
  React.useEffect(() => {
    if (animationsReady) {
      // Animate smoothly when focusing or unfocusing
      // Keep other ex-es hidden if either profile OR memory is focused
      if (focusedProfileId || focusedMemory) {
        // Slide other zones out
        slideOffset.value = withSpring(SCREEN_WIDTH * 2, {
          damping: 20,
          stiffness: 100,
        });
      } else {
        // Slide other zones back in - only when both profile and memory are unfocused
        slideOffset.value = withSpring(0, {
          damping: 20,
          stiffness: 100,
        });
      }
    }
  }, [focusedProfileId, focusedMemory, animationsReady, slideOffset]);
  
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

  if (sortedProfiles.length === 0) {
  return (
    <TabScreenContainer>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ThemedText size="l" style={{ opacity: 0.6, textAlign: 'center', paddingHorizontal: 40 }}>
            {t('home.emptyState')}
          </ThemedText>
        </View>
    </TabScreenContainer>
  );
}

  return (
    <TabScreenContainer>
      <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
        {/* Back button - only visible when focused */}
        {(focusedProfileId || focusedMemory) && (
          <Pressable
            onPress={() => {
              if (focusedMemory) {
                // If memory is focused, unfocus the memory and ensure profile is focused
                // This returns to the focused EX view with memories floating around
                setFocusedMemory(null);
                // Ensure the profile is focused so we return to focused EX view
                if (!focusedProfileId || focusedProfileId !== focusedMemory.profileId) {
                  setFocusedProfileId(focusedMemory.profileId);
                }
              } else {
                // If only profile is focused, unfocus it (this will bring back other ex-es)
                setFocusedProfileId(null);
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
        )}

        <ScrollView
          style={{ flex: 1, borderWidth: 3, borderColor: 'red' }}
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
              borderWidth: 3,
              borderColor: 'green',
              justifyContent: 'flex-start',
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!focusedProfileId && !focusedMemory}
        >
          {animationsReady && sortedProfiles
            .filter(profile => {
              // Only show focused profile, or all profiles if nothing is focused
              if (focusedProfileId) {
                return profile.id === focusedProfileId;
              }
              if (focusedMemory) {
                return profile.id === focusedMemory.profileId;
              }
              return true; // Show all when nothing is focused
            })
            .map((profile, index) => {
            const memories = getIdealizedMemoriesByProfileId(profile.id);
            const currentPosition = getAvatarPosition(profile.id, index);
            const isFocused = focusedProfileId === profile.id;
            const isProfileFocusedForMemory = focusedMemory?.profileId === profile.id;
            
            // Determine slide direction for non-focused zones - push in different directions
            // Use profile position to determine direction for more natural movement
            const centerX = SCREEN_WIDTH / 2;
            const centerY = SCREEN_HEIGHT / 2;
            const dx = currentPosition.x - centerX;
            const dy = currentPosition.y - centerY;
            // Determine direction based on position relative to center
            const slideDirectionX = dx > 0 ? 1 : -1; // Right side slides right, left side slides left
            const slideDirectionY = dy > 0 ? 1 : -1; // Bottom slides down, top slides up
            
            return (
              <NonFocusedZone
                key={profile.id}
                isFocused={isFocused || isProfileFocusedForMemory}
                wasJustFocused={previousFocusedIdRef.current === profile.id && !focusedProfileId && !focusedMemory}
                focusedProfileId={focusedProfileId}
                slideOffset={slideOffset}
                slideDirectionX={slideDirectionX}
                slideDirectionY={slideDirectionY}
              >
                {!isProfileFocusedForMemory && (
                  <FloatingAvatar
                    profile={profile}
                    position={currentPosition}
                    memories={memories}
                    onPress={() => {
                      console.log(`[HomeScreen] onPress called for profile: ${profile.id}, current focused: ${focusedProfileId}, isFocused: ${isFocused}`);
                      const newFocusedId = isFocused ? null : profile.id;
                      console.log(`[HomeScreen] Setting focusedProfileId to: ${newFocusedId}`);
                      setFocusedProfileId(newFocusedId);
                      setFocusedMemory(null); // Clear memory focus if profile is focused
                    }}
                    onPositionChange={(newPosition) => updateAvatarPosition(profile.id, newPosition)}
                    isFocused={isFocused}
                    colors={colors}
                    colorScheme={colorScheme ?? 'dark'}
                    focusedMemory={focusedMemory}
                    memorySlideOffset={memorySlideOffset}
                    onMemoryFocus={(profileId, memoryId) => {
                      setFocusedMemory({ profileId, memoryId });
                    }}
                    yearSection={getProfileYearSection(profile)}
                  />
                )}
              </NonFocusedZone>
            );
            })}
          
          {/* Render year section labels - hidden when focused */}
          {animationsReady && !focusedProfileId && !focusedMemory && Array.from(yearSections.entries()).map(([key, section]) => {
            return (
              <View
                key={`year-section-${key}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: section.top,
                  width: SCREEN_WIDTH,
                  height: section.height,
                  borderTopWidth: 2,
                  borderBottomWidth: 2,
                  borderLeftWidth: 2,
                  borderRightWidth: 2,
                  borderColor: 'cyan',
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                  zIndex: 0, // Behind avatars
                  pointerEvents: 'none', // Allow touches to pass through
                }}
              >
                {/* Year label */}
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
                  {section.year}
                </ThemedText>
              </View>
            );
          })}
          
          {/* Render focused memory separately when memory is focused */}
          {focusedMemory && animationsReady && (() => {
            const focusedProfile = sortedProfiles.find(p => p.id === focusedMemory.profileId);
            if (!focusedProfile) return null;
            
            const focusedMemoryData = getIdealizedMemoriesByProfileId(focusedMemory.profileId)
              .find(m => m.id === focusedMemory.memoryId);
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
          })()}
        </ScrollView>
      </View>
    </TabScreenContainer>
  );
}

// Component to handle non-focused zone animation
function NonFocusedZone({
  children,
  isFocused,
  wasJustFocused,
  focusedProfileId,
  slideOffset,
  slideDirectionX,
  slideDirectionY,
}: {
  children: React.ReactNode;
  isFocused: boolean;
  wasJustFocused: boolean;
  focusedProfileId: string | null;
  slideOffset: ReturnType<typeof useSharedValue<number>>;
  slideDirectionX: number;
  slideDirectionY: number;
}) {
  // Create animated style for this specific profile
  const nonFocusedStyle = useAnimatedStyle(() => {
    // If this profile is currently focused, it always stays in place
    if (isFocused) {
      return { 
        transform: [{ translateX: 0 }, { translateY: 0 }], 
        opacity: 1 
      };
    }
    
    // If this profile was just focused (now unfocused), keep it visible and in place
    // It will shrink back to normal size via the FloatingAvatar's own scale animation
    if (wasJustFocused) {
      return { 
        transform: [{ translateX: 0 }, { translateY: 0 }], 
        opacity: 1 
      };
    }
    
    // For other non-focused profiles, animate based on slideOffset
    // When slideOffset is 0, they're in normal position
    // When slideOffset is large, they slide off-screen
    const offset = slideOffset.value;
    // Use a smoother threshold for visibility - fade in/out as they slide
    const normalizedOffset = offset / (SCREEN_WIDTH * 2); // 0 to 1
    const isVisible = normalizedOffset < 0.5; // Fade out when more than halfway
    
    return {
      transform: [
        { translateX: offset * slideDirectionX },
        { translateY: offset * slideDirectionY * 0.5 }, // Less vertical movement
      ],
      // Animate opacity smoothly based on offset - same duration as slide animation
      opacity: withTiming(isVisible ? 1 : 0, { duration: 500 }),
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
}
