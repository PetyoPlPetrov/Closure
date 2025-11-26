import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
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
}: {
  profile: any;
  position: { x: number; y: number };
  memories: any[];
  onPress: () => void;
  colors: any;
  colorScheme: 'light' | 'dark';
  onPositionChange: (newPosition: { x: number; y: number }) => void;
}) {
  const avatarSize = 80;
  const memoryRadius = 85; // Very close to avatar for tight grouping
  const exZoneRadius = 142; // Total radius from avatar center to furthest floating element edge
  const initials = profile.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const floatAnimation = useSharedValue(0);
  const panX = useSharedValue(position.x);
  const panY = useSharedValue(position.y);
  
  // Update pan values when position prop changes
  React.useEffect(() => {
    panX.value = position.x;
    panY.value = position.y;
  }, [position.x, position.y, panX, panY]);
  
  React.useEffect(() => {
    floatAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, [floatAnimation]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          // Stop floating animation while dragging
          floatAnimation.value = 0;
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
          
          panX.value = constrainedX;
          panY.value = constrainedY;
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
          
          // Update position with spring animation
          panX.value = withSpring(constrainedX);
          panY.value = withSpring(constrainedY);
          
          // Notify parent of position change
          onPositionChange({ x: constrainedX, y: constrainedY });
          
          // Resume floating animation
          floatAnimation.value = withRepeat(
            withSequence(
              withTiming(1, { duration: 2000 }),
              withTiming(0, { duration: 2000 })
            ),
            -1,
            true
          );
        },
      }),
    [position, onPositionChange]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value - position.x },
      { translateY: panY.value - position.y + floatAnimation.value * 6 },
    ],
  }));

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
  }, [memories, memoryRadius]);

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
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} delayPressIn={200}>
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
        </TouchableOpacity>
      </Animated.View>

      {/* Floating Memories around Avatar - rendered separately for proper z-index */}
      {memories.map((memory, memIndex) => {
        const memPosData = memoryPositions[memIndex];
        
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
            avatarPanX={panX}
            avatarPanY={panY}
            offsetX={memPosData.offsetX}
            offsetY={memPosData.offsetY}
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
  offsetX,
  offsetY,
  colorScheme,
}: {
  memory: any;
  position: { x: number; y: number };
  avatarPanX?: any;
  avatarPanY?: any;
  offsetX: number;
  offsetY: number;
  colorScheme: 'light' | 'dark';
}) {
  const memorySize = 50;
  const cloudRadius = 25; // More overlap with memory for darker effect
  const sunRadius = 22; // More overlap with memory for brighter effect

  const floatAnimation = useSharedValue(0);
  
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

  // Calculate memory position relative to avatar if dragging
  // Always call the hook, but use it conditionally
  const memoryAnimatedPosition = useAnimatedStyle(() => {
    if (avatarPanX && avatarPanY) {
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
                  memoryOffsetX={offsetX}
                  memoryOffsetY={offsetY}
                  offsetX={cloudPosData.offsetX}
                  offsetY={cloudPosData.offsetY}
                  zIndex={cloudZIndex}
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
                  memoryOffsetX={offsetX}
                  memoryOffsetY={offsetY}
                  offsetX={sunPosData.offsetX}
                  offsetY={sunPosData.offsetY}
                  zIndex={sunZIndex}
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
  memoryOffsetX,
  memoryOffsetY,
  offsetX,
  offsetY,
  zIndex,
  colorScheme,
}: {
  cloud: any;
  position: { x: number; y: number };
  memoryAnimatedPosition?: any;
  avatarPanX?: any;
  avatarPanY?: any;
  memoryOffsetX: number;
  memoryOffsetY: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
  colorScheme: 'light' | 'dark';
}) {
  const cloudSize = 34; // Slightly smaller

  const floatAnimation = useSharedValue(0);
  
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
    ],
  }));

  const cloudAnimatedPosition = useAnimatedStyle(() => {
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
  memoryOffsetX,
  memoryOffsetY,
  offsetX,
  offsetY,
  zIndex,
  colorScheme,
}: {
  sun: any;
  position: { x: number; y: number };
  memoryAnimatedPosition?: any;
  avatarPanX?: any;
  avatarPanY?: any;
  memoryOffsetX: number;
  memoryOffsetY: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
  colorScheme: 'light' | 'dark';
}) {
  const sunSize = 32; // Slightly smaller

  const floatAnimation = useSharedValue(0);
  
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
    ],
  }));

  const sunAnimatedPosition = useAnimatedStyle(() => {
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
        <View style={[styles.content, { height: SCREEN_HEIGHT }]}>
          {profiles.map((profile, index) => {
            const memories = getIdealizedMemoriesByProfileId(profile.id);
            const currentPosition = getAvatarPosition(profile.id, index);
            return (
              <FloatingAvatar
                key={profile.id}
                profile={profile}
                position={currentPosition}
                memories={memories}
                onPress={() => {
                  router.push({
                    pathname: '/edit-profile',
                    params: { profileId: profile.id },
                  });
                }}
                onPositionChange={(newPosition) => updateAvatarPosition(profile.id, newPosition)}
                colors={colors}
                colorScheme={colorScheme ?? 'dark'}
              />
            );
          })}
        </View>
      </View>
    </TabScreenContainer>
  );
}
