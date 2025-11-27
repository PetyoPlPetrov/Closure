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
}) {
  const panX = useSharedValue(initialX);
  const panY = useSharedValue(initialY);
  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  const isDragging = useSharedValue(false);
  const entranceProgress = useSharedValue(0);
  
  // Use the actual content size as the draggable area (no extra padding)
  const hitAreaWidth = width;
  const hitAreaHeight = height;
  
  // Entrance animation with delay
  React.useEffect(() => {
    entranceProgress.value = 0;
    const timer = setTimeout(() => {
      entranceProgress.value = withSpring(1, {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      });
    }, entranceDelay);
    return () => clearTimeout(timer);
  }, [entranceProgress, entranceDelay]);
  
  // Update position when initial values change (but not while dragging)
  React.useEffect(() => {
    if (!isDragging.value) {
      panX.value = initialX;
      panY.value = initialY;
      startX.value = initialX;
      startY.value = initialY;
    }
  }, [initialX, initialY, panX, panY, startX, startY, isDragging]);
  
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
        scale: 0.3 + entranceProgress.value * 0.7, // Scale from 0.3 to 1
      },
    ],
    opacity: entranceProgress.value,
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
          
          // Keep within viewport bounds (accounting for EX zone radius)
          // Allow avatar to move closer to edges - allow slight overflow for better UX
          const minY = exZoneRadius - 20; // Allow slight overflow at top for better movement
          const maxY = SCREEN_HEIGHT - exZoneRadius + 20; // Allow slight overflow at bottom
          const minX = exZoneRadius;
          const maxX = SCREEN_WIDTH - exZoneRadius;
          
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
          
          // Keep within viewport bounds
          // Allow avatar to move closer to edges - allow slight overflow for better UX
          const minY = exZoneRadius - 20; // Allow slight overflow at top for better movement
          const maxY = SCREEN_HEIGHT - exZoneRadius + 20; // Allow slight overflow at bottom
          const minX = exZoneRadius;
          const maxX = SCREEN_WIDTH - exZoneRadius;
          
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
    [position, onPositionChange, floatAnimation, isDragging, panX, panY, exZoneRadius, profile.id]
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
    return memories.map((_, memIndex) => {
      // Use current pan values for initial calculation
      const angle = (memIndex * 2 * Math.PI) / memories.length;
      return {
        angle,
        offsetX: memoryRadius * Math.cos(angle),
        offsetY: memoryRadius * Math.sin(angle),
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
      {memories.map((memory, memIndex) => {
        const memPosData = memoryPositions[memIndex];
        // Safety check: if we have more memories than animated values, use the last available one
        const memAnimatedValues = memoryAnimatedValues[memIndex] || memoryAnimatedValues[memoryAnimatedValues.length - 1];
        
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
  // Also ensures moments are well distributed around the memory
  const calculateClampedPosition = useMemo(() => {
    return (savedX: number | undefined, savedY: number | undefined, momentWidth: number, momentHeight: number, index: number, totalCount: number, memorySize: number) => {
      const memoryCenterX = SCREEN_WIDTH / 2;
      const memoryCenterY = SCREEN_HEIGHT / 2;
      
      let momentX: number;
      let momentY: number;
      
      // If we have saved positions, use them (adjusted for current screen center)
      if (savedX !== undefined && savedY !== undefined) {
        // Calculate offset from memory center
        // Saved positions are from creation screen where memory is also centered
        const offsetX = savedX - memoryCenterX;
        const offsetY = savedY - memoryCenterY;
        
        // Apply offset to current centered memory position
        momentX = memoryCenterX + offsetX;
        momentY = memoryCenterY + offsetY;
      } else {
        // If no saved positions, distribute in a circular pattern around memory
        const angle = (2 * Math.PI * index) / totalCount;
        const radius = memorySize / 2 + Math.max(momentWidth, momentHeight) / 2 + 40; // Distance from memory edge
        momentX = memoryCenterX + radius * Math.cos(angle);
        momentY = memoryCenterY + radius * Math.sin(angle);
      }
      
      // Clamp to ensure moment stays within viewport with padding
      const padding = 20; // Padding from edges
      const minX = padding + momentWidth / 2;
      const maxX = SCREEN_WIDTH - padding - momentWidth / 2;
      const minY = padding + momentHeight / 2;
      const maxY = SCREEN_HEIGHT - padding - momentHeight / 2;
      
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
      // When memory is focused, center it on screen
      return {
        left: SCREEN_WIDTH / 2 - memorySize / 2,
        top: SCREEN_HEIGHT / 2 - memorySize / 2,
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
              borderWidth: 2,
              borderColor: colorScheme === 'dark' 
                ? 'rgba(255,255,255,0.3)' 
                : 'rgba(255,255,255,0.7)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
              elevation: 5,
              overflow: 'hidden',
            }}
          >
            {memory.imageUri ? (
              <Image
                source={{ uri: memory.imageUri }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: memorySize / 2,
                }}
                contentFit="cover"
              />
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
            {/* Floating Clouds around Memory */}
            {clouds.map((cloud: any, cloudIndex: number) => {
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
                  memorySize
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
                    entranceDelay={cloudIndex * 100} // Stagger entrance by 100ms per cloud
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

            {/* Floating Suns around Memory */}
            {suns.map((sun: any, sunIndex: number) => {
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
                  memorySize
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
                    entranceDelay={sunIndex * 100} // Stagger entrance by 100ms per sun
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
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingTop: sunHeight * 0.45,
                      }}
                    >
                      <ThemedText
                        style={{
                          color: 'rgba(255,255,255,0.9)',
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
      // First, separate ongoing (current) vs ended relationships
      const aIsOngoing = a.relationshipEndDate === null;
      const bIsOngoing = b.relationshipEndDate === null;
      
      if (aIsOngoing && !bIsOngoing) return -1; // a is ongoing, b is not - a comes first
      if (!aIsOngoing && bIsOngoing) return 1;  // b is ongoing, a is not - b comes first
      
      // Both are ongoing or both are ended - sort by start date (earliest first)
      const aStartYear = a.relationshipStartDate ? new Date(a.relationshipStartDate).getFullYear() : 0;
      const bStartYear = b.relationshipStartDate ? new Date(b.relationshipStartDate).getFullYear() : 0;
      
      if (aStartYear !== bStartYear) {
        return aStartYear - bStartYear; // Earlier year comes first
      }
      
      // If same year, sort by full date (earliest first)
      const aStartDate = a.relationshipStartDate ? new Date(a.relationshipStartDate).getTime() : 0;
      const bStartDate = b.relationshipStartDate ? new Date(b.relationshipStartDate).getTime() : 0;
      return aStartDate - bStartDate;
    });
  }, [profiles]);
  
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

  // Calculate initial evenly distributed positions for avatars within viewport
  // EX Zone calculation from avatar center to furthest floating element edge:
  // - Memory center from avatar: 60px (memoryRadius, unfocused)
  // - Cloud center from memory center: 25px (cloudRadius)
  // - Cloud edge from cloud center: 12px (cloudSize / 2 = 24 / 2)
  // Maximum distance: 60 + 25 + 12 = 97px
  // Add safety margin: 97 + 23 = 120px
  const initialAvatarPositions = useMemo(() => {
    if (!positionsLoaded) return []; // Wait for saved positions to load
    
    const positions: { x: number; y: number }[] = [];
    const exZoneRadius = 120; // Total radius from avatar center to furthest floating element edge (unfocused)
    const padding = exZoneRadius + 20; // Keep all floating memories within viewport
    const topPadding = exZoneRadius + 20;
    const bottomPadding = exZoneRadius + 20;
    
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;
    
    // Use vertical list layout - profiles centered horizontally, evenly spaced vertically
    const centerX = SCREEN_WIDTH / 2;
    const numProfiles = sortedProfiles.length;
    const spacingY = numProfiles > 1 ? availableHeight / (numProfiles - 1) : 0;
    
    sortedProfiles.forEach((profile, index) => {
      // Check if we have a saved position for this profile
      if (savedPositions?.has(profile.id)) {
        const saved = savedPositions.get(profile.id)!;
        // Validate saved position is still within viewport
        const topEdge = saved.y - exZoneRadius;
        const rightEdge = saved.x + exZoneRadius;
        const bottomEdge = saved.y + exZoneRadius;
        const leftEdge = saved.x - exZoneRadius;
        
        if (
          topEdge >= 0 &&
          rightEdge <= SCREEN_WIDTH &&
          bottomEdge <= SCREEN_HEIGHT &&
          leftEdge >= 0
        ) {
          positions.push(saved);
          return;
        }
      }
      
      // Use vertical list layout for new or invalid positions
      // Center horizontally, distribute evenly vertically
      let position = {
        x: centerX,
        y: topPadding + (index * spacingY),
      };
      
      // Ensure position keeps EX zone in viewport - clamp if needed
      position.x = Math.max(padding + exZoneRadius, Math.min(SCREEN_WIDTH - padding - exZoneRadius, position.x));
      position.y = Math.max(topPadding + exZoneRadius, Math.min(SCREEN_HEIGHT - bottomPadding - exZoneRadius, position.y));
      
      positions.push(position);
    });
    
    return positions;
  }, [sortedProfiles, savedPositions, positionsLoaded]);
  
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
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!focusedProfileId && !focusedMemory}
        >
          {animationsReady && sortedProfiles.map((profile, index) => {
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
                  />
                )}
              </NonFocusedZone>
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
