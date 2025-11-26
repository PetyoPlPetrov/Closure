import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import { useSplash } from '@/utils/SplashAnimationProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


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
  onDoubleTap,
}: {
  profile: any;
  position: { x: number; y: number };
  memories: any[];
  onPress: () => void;
  colors: any;
  colorScheme: 'light' | 'dark';
  onPositionChange: (newPosition: { x: number; y: number }) => void;
  isFocused: boolean;
  onDoubleTap: () => void;
}) {
  const baseAvatarSize = 80;
  const focusedAvatarSize = 100; // Smaller focused size so memories fit
  const avatarSize = isFocused ? focusedAvatarSize : baseAvatarSize;
  // Increase memory radius when focused to push them further away
  const memoryRadius = isFocused ? 140 : 85; // Further away when focused for better visibility
  const exZoneRadius = isFocused ? 200 : 142; // Larger zone when focused
  
  // Double tap detection
  const lastTapRef = useRef<number | null>(null);
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
  // Create a fixed number upfront (10 max) to ensure hooks are always called in same order
  const memoryPanX0 = useSharedValue(position.x);
  const memoryPanY0 = useSharedValue(position.x);
  const memoryPanX1 = useSharedValue(position.x);
  const memoryPanY1 = useSharedValue(position.x);
  const memoryPanX2 = useSharedValue(position.x);
  const memoryPanY2 = useSharedValue(position.x);
  const memoryPanX3 = useSharedValue(position.x);
  const memoryPanY3 = useSharedValue(position.x);
  const memoryPanX4 = useSharedValue(position.x);
  const memoryPanY4 = useSharedValue(position.x);
  const memoryPanX5 = useSharedValue(position.x);
  const memoryPanY5 = useSharedValue(position.x);
  const memoryPanX6 = useSharedValue(position.x);
  const memoryPanY6 = useSharedValue(position.x);
  const memoryPanX7 = useSharedValue(position.x);
  const memoryPanY7 = useSharedValue(position.x);
  const memoryPanX8 = useSharedValue(position.x);
  const memoryPanY8 = useSharedValue(position.x);
  const memoryPanX9 = useSharedValue(position.x);
  const memoryPanY9 = useSharedValue(position.x);
  
  // Store all animated values and their spring parameters
  const memoryAnimatedValues = React.useMemo(() => {
    const panXValues = [memoryPanX0, memoryPanX1, memoryPanX2, memoryPanX3, memoryPanX4, memoryPanX5, memoryPanX6, memoryPanX7, memoryPanX8, memoryPanX9];
    const panYValues = [memoryPanY0, memoryPanY1, memoryPanY2, memoryPanY3, memoryPanY4, memoryPanY5, memoryPanY6, memoryPanY7, memoryPanY8, memoryPanY9];
    
    return panXValues.map((panX, index) => {
      // Vary spring parameters for different speeds - very dramatic variation
      // Faster memories: lower damping, higher stiffness
      // Slower memories: higher damping, lower stiffness
      // Use index directly for more variation instead of modulo
      const speedVariation = index / 9; // 0 to 1 across all memories
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
  }, [memoryPanX0, memoryPanX1, memoryPanX2, memoryPanX3, memoryPanX4, memoryPanX5, memoryPanX6, memoryPanX7, memoryPanX8, memoryPanX9, memoryPanY0, memoryPanY1, memoryPanY2, memoryPanY3, memoryPanY4, memoryPanY5, memoryPanY6, memoryPanY7, memoryPanY8, memoryPanY9]);
  
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
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
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
    [position, onPositionChange, floatAnimation, isDragging, panX, panY, exZoneRadius]
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
            zIndex: 10,
          },
          animatedStyle,
        ]}
        {...(!isFocused ? panResponder.panHandlers : {})}
      >
        <Pressable
          onPress={() => {
            // Double tap detection
            const now = Date.now();
            if (lastTapRef.current && now - lastTapRef.current < 300) {
              onDoubleTap();
              lastTapRef.current = null;
            } else {
              lastTapRef.current = now;
              // Single tap - navigate after a delay
              setTimeout(() => {
                if (lastTapRef.current === now) {
                  onPress();
                }
              }, 300);
            }
          }}
        >
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 3,
              borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
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
        </Pressable>
      </Animated.View>

      {/* Floating Memories around Avatar - rendered separately for proper z-index */}
      {memories.map((memory, memIndex) => {
        const memPosData = memoryPositions[memIndex];
        const memAnimatedValues = memoryAnimatedValues[memIndex];
        
        // Initial position for first render
        const initialMemPos = {
          x: position.x + memPosData.offsetX,
          y: position.y + memPosData.offsetY,
        };
        
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
}) {
  // Make memories bigger when focused
  const memorySize = isFocused ? 65 : 50;
  // Increase cloud and sun radius when focused to push them further from memory
  const cloudRadius = isFocused ? 40 : 25; // Further away when focused
  const sunRadius = isFocused ? 38 : 22; // Further away when focused

  const floatAnimation = useSharedValue(0);
  
  // Scale animation for focused state - memories scale to 2x (bigger than avatar for visibility)
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
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [floatAnimation]);

  // Calculate memory position relative to avatar
  // When focused, use focusedX/focusedY; when dragging, use avatarPanX/avatarPanY
  const memoryAnimatedPosition = useAnimatedStyle(() => {
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnimation.value * 4 },
      { scale: scale.value },
    ],
  }));

  const clouds = useMemo(() => memory.hardTruths || [], [memory.hardTruths]);
  const suns = useMemo(() => memory.goodFacts || [], [memory.goodFacts]);

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

  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: position.x - memorySize / 2,
            top: position.y - memorySize / 2,
            zIndex: 5, // Memory base layer
          },
          memoryAnimatedPosition,
          animatedStyle,
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/add-idealized-memory',
              params: { profileId: memory.profileId, memoryId: memory.id },
            });
          }}
          activeOpacity={0.7}
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
        </TouchableOpacity>
      </Animated.View>

      {/* Calculate z-index based on which type has more moments */}
      {(() => {
        const cloudCount = clouds.length;
        const sunCount = suns.length;
        const cloudsOnTop = cloudCount > sunCount;
        const cloudZIndex = cloudsOnTop ? 6 : 5.5;
        const sunZIndex = cloudsOnTop ? 5.5 : 6;
        
        return (
          <>
            {/* Floating Clouds around Memory */}
            {clouds.map((cloud: any, cloudIndex: number) => {
              const cloudPosData = cloudPositions[cloudIndex];
              const initialCloudPos = {
                x: position.x + cloudPosData.offsetX,
                y: position.y + cloudPosData.offsetY,
              };
              
              return (
                <FloatingCloud
                  key={`cloud-${cloud.id}-${cloudIndex}`}
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
                  isFocused={isFocused}
                  colorScheme={colorScheme}
                />
              );
            })}

            {/* Floating Suns around Memory */}
            {suns.map((sun: any, sunIndex: number) => {
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
                  avatarPanX={avatarPanX}
                  avatarPanY={avatarPanY}
                  focusedX={focusedX}
                  focusedY={focusedY}
                  memoryOffsetX={offsetX}
                  memoryOffsetY={offsetY}
                  offsetX={sunPosData.offsetX}
                  offsetY={sunPosData.offsetY}
                  zIndex={sunZIndex}
                  isFocused={isFocused}
                  colorScheme={colorScheme}
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
}) {
  // Make clouds smaller when focused
  const cloudSize = isFocused ? 28 : 34; // Smaller when focused

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
    return {};
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: position.x - cloudSize / 2,
          top: position.y - cloudSize / 2,
          zIndex, // Dynamic z-index based on count
        },
        cloudAnimatedPosition,
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: cloudSize,
          height: cloudSize,
          borderRadius: cloudSize / 2,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(20, 20, 20, 0.95)' 
            : 'rgba(40, 40, 40, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: 'rgba(0,0,0,0.5)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <MaterialIcons name="cloud" size={20} color="#fff" />
      </View>
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
}) {
  // Make suns smaller when focused
  const sunSize = isFocused ? 26 : 32; // Smaller when focused

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
    return {};
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: position.x - sunSize / 2,
          top: position.y - sunSize / 2,
          zIndex, // Dynamic z-index based on count
        },
        sunAnimatedPosition,
        animatedStyle,
      ]}
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
        <MaterialIcons name="wb-sunny" size={18} color="#FFFFFF" />
      </LinearGradient>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const { profiles, getIdealizedMemoriesByProfileId } = useJourney();
  
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

  // Calculate initial random positions for avatars within viewport
  // EX Zone calculation from avatar center to furthest floating element edge:
  // - Memory center from avatar: 85px (memoryRadius)
  // - Cloud center from memory center: 25px (cloudRadius)
  // - Cloud edge from cloud center: 17px (cloudSize / 2 = 34 / 2)
  // Maximum distance: 85 + 25 + 17 = 127px
  // Add safety margin: 127 + 15 = 142px
  const initialAvatarPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const avatarRadius = 40; // Avatar size is 80px, so radius is 40px
    const exZoneRadius = 142; // Total radius from avatar center to furthest floating element edge
    const minSpacing = exZoneRadius * 2 + 30; // Minimum distance = 314px (ensures no overlap with buffer)
    const padding = exZoneRadius + 30; // Keep all floating memories within viewport
    const topPadding = exZoneRadius + 30;
    const bottomPadding = exZoneRadius + 30;
    
    const availableWidth = SCREEN_WIDTH - padding * 2;
    const availableHeight = SCREEN_HEIGHT - topPadding - bottomPadding;
    
    // Try to place each avatar randomly, ensuring no overlap
    profiles.forEach((profile, index) => {
      let attempts = 0;
      let position: { x: number; y: number };
      let validPosition = false;
      
      while (!validPosition && attempts < 50) {
        position = {
          x: padding + Math.random() * availableWidth,
          y: topPadding + Math.random() * availableHeight,
        };
        
        // Check if this position is far enough from existing positions (EX zone to EX zone)
        // Distance must be at least minSpacing to ensure zones don't overlap
        // Also check avatar-to-avatar distance as a minimum
        validPosition = positions.length === 0 || positions.every((existingPos) => {
          const dx = position.x - existingPos.x;
          const dy = position.y - existingPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // Ensure both EX zones and avatars don't overlap
          const avatarMinDistance = avatarRadius * 2 + 10; // At least 90px between avatar centers
          return distance >= minSpacing && distance >= avatarMinDistance;
        });
        
        // Also ensure the entire EX zone (including all floating memories and moments) is within viewport bounds
        if (validPosition) {
          // Check all 4 directions (top, right, bottom, left) for the entire EX zone
          // This ensures no floating memories or moments go outside the viewport
          const topEdge = position.y - exZoneRadius;
          const rightEdge = position.x + exZoneRadius;
          const bottomEdge = position.y + exZoneRadius;
          const leftEdge = position.x - exZoneRadius;
          
          validPosition = 
            topEdge >= 0 &&
            rightEdge <= SCREEN_WIDTH &&
            bottomEdge <= SCREEN_HEIGHT &&
            leftEdge >= 0;
          
          // Double-check with a slightly larger margin to be absolutely sure
          if (validPosition) {
            const margin = 5; // Extra safety margin
            validPosition = 
              (position.y - exZoneRadius - margin) >= 0 &&
              (position.x + exZoneRadius + margin) <= SCREEN_WIDTH &&
              (position.y + exZoneRadius + margin) <= SCREEN_HEIGHT &&
              (position.x - exZoneRadius - margin) >= 0;
          }
        }
        
        attempts++;
      }
      
      // If we couldn't find a valid position, use a fallback grid position
      // Grid spacing should respect minSpacing to avoid EX zone overlap
      if (!validPosition) {
        const cols = Math.max(1, Math.floor(availableWidth / minSpacing));
        const rows = Math.ceil(profiles.length / cols);
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        // Use minSpacing for grid, ensuring we don't go below it
        const spacingX = cols > 1 ? Math.max(minSpacing, availableWidth / (cols - 1)) : SCREEN_WIDTH / 2;
        const spacingY = rows > 1 ? Math.max(minSpacing, availableHeight / (rows - 1)) : SCREEN_HEIGHT / 2;
        
        position = {
          x: padding + (col * spacingX),
          y: topPadding + (row * spacingY),
        };
        
        // Ensure fallback position keeps EX zone in viewport
        const topEdge = position.y - exZoneRadius;
        const rightEdge = position.x + exZoneRadius;
        const bottomEdge = position.y + exZoneRadius;
        const leftEdge = position.x - exZoneRadius;
        
        if (topEdge < 0 || rightEdge > SCREEN_WIDTH || bottomEdge > SCREEN_HEIGHT || leftEdge < 0) {
          // Clamp to viewport if needed
          position.x = Math.max(padding + exZoneRadius, Math.min(SCREEN_WIDTH - padding - exZoneRadius, position.x));
          position.y = Math.max(topPadding + exZoneRadius, Math.min(SCREEN_HEIGHT - bottomPadding - exZoneRadius, position.y));
        }
        
        // Verify the fallback position doesn't overlap with existing positions
        const hasOverlap = positions.some((existingPos) => {
          const dx = position.x - existingPos.x;
          const dy = position.y - existingPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const avatarMinDistance = avatarRadius * 2 + 10;
          return distance < minSpacing || distance < avatarMinDistance;
        });
        
        if (hasOverlap) {
          // If overlap detected, try to adjust position
          let adjusted = false;
          for (let offset = minSpacing; offset <= minSpacing * 1.5 && !adjusted; offset += 10) {
            const testPositions = [
              { x: position.x + offset, y: position.y },
              { x: position.x - offset, y: position.y },
              { x: position.x, y: position.y + offset },
              { x: position.x, y: position.y - offset },
            ];
            
            for (const testPos of testPositions) {
              const topEdge = testPos.y - exZoneRadius;
              const rightEdge = testPos.x + exZoneRadius;
              const bottomEdge = testPos.y + exZoneRadius;
              const leftEdge = testPos.x - exZoneRadius;
              
              if (topEdge >= 0 && rightEdge <= SCREEN_WIDTH && bottomEdge <= SCREEN_HEIGHT && leftEdge >= 0) {
                const noOverlap = positions.every((existingPos) => {
                  const dx = testPos.x - existingPos.x;
                  const dy = testPos.y - existingPos.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  const avatarMinDistance = avatarRadius * 2 + 10;
                  return distance >= minSpacing && distance >= avatarMinDistance;
                });
                
                if (noOverlap) {
                  position = testPos;
                  adjusted = true;
                  break;
                }
              }
            }
          }
        }
      }
      
      positions.push(position!);
    });
    
    return positions;
  }, [profiles]);
  
  // Initialize positions state from calculated positions
  React.useEffect(() => {
    if (initialAvatarPositions.length > 0 && avatarPositionsState.size === 0) {
      const newPositions = new Map<string, { x: number; y: number }>();
      profiles.forEach((profile, index) => {
        newPositions.set(profile.id, initialAvatarPositions[index]);
      });
      setAvatarPositionsState(newPositions);
    }
  }, [initialAvatarPositions, profiles, avatarPositionsState.size]);
  
  // Get current position for a profile (either from state or initial)
  const getAvatarPosition = (profileId: string, index: number) => {
    return avatarPositionsState.get(profileId) || initialAvatarPositions[index] || { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
  };
  
  // Update position for a profile
  const updateAvatarPosition = (profileId: string, newPosition: { x: number; y: number }) => {
    setAvatarPositionsState((prev) => {
      const next = new Map(prev);
      next.set(profileId, newPosition);
      return next;
    });
  };

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
      if (focusedProfileId) {
        // Slide other zones out
        slideOffset.value = withSpring(SCREEN_WIDTH * 2, {
          damping: 20,
          stiffness: 100,
        });
      } else {
        // Slide other zones back in - use same spring animation for consistency
        slideOffset.value = withSpring(0, {
          damping: 20,
          stiffness: 100,
        });
      }
    }
  }, [focusedProfileId, animationsReady, slideOffset]);

  if (profiles.length === 0) {
    return (
      <TabScreenContainer>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ThemedText size="l" style={{ opacity: 0.6, textAlign: 'center', paddingHorizontal: 40 }}>
            No profiles yet. Add your first ex-profile to get started.
          </ThemedText>
        </View>
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
        {/* Back button - only visible when focused */}
        {focusedProfileId && (
          <Pressable
            onPress={() => setFocusedProfileId(null)}
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

        <View style={[styles.content, { height: SCREEN_HEIGHT }]}>
          {animationsReady && profiles.map((profile, index) => {
            const memories = getIdealizedMemoriesByProfileId(profile.id);
            const currentPosition = getAvatarPosition(profile.id, index);
            const isFocused = focusedProfileId === profile.id;
            
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
                isFocused={isFocused}
                wasJustFocused={previousFocusedIdRef.current === profile.id && !focusedProfileId}
                focusedProfileId={focusedProfileId}
                slideOffset={slideOffset}
                slideDirectionX={slideDirectionX}
                slideDirectionY={slideDirectionY}
              >
                <FloatingAvatar
                  profile={profile}
                  position={currentPosition}
                  memories={memories}
                  onPress={() => {
                    if (!isFocused) {
                      router.push({
                        pathname: '/edit-profile',
                        params: { profileId: profile.id },
                      });
                    }
                  }}
                  onDoubleTap={() => {
                    setFocusedProfileId(isFocused ? null : profile.id);
                  }}
                  onPositionChange={(newPosition) => updateAvatarPosition(profile.id, newPosition)}
                  isFocused={isFocused}
                  colors={colors}
                  colorScheme={colorScheme ?? 'dark'}
                />
              </NonFocusedZone>
            );
          })}
        </View>
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
        },
        nonFocusedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}
