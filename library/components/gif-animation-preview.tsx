import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { DARK_GRADIENT_COLORS, LIGHT_GRADIENT_COLORS } from '@/library/components/tab-screen-container';
import { createVideoFromFrames } from '@/modules/video-composer';
import type { IdealizedMemory } from '@/utils/JourneyProvider';
import { MaterialIcons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Entity = {
  id: string;
  name: string;
  imageUri?: string;
  type: 'relationship' | 'job' | 'familyMember' | 'friend' | 'hobby';
};

type Moment = {
  id: string;
  text: string;
  type: 'lessons' | 'sunnyMoments' | 'hardTruths';
  memoryIndex: number;
};

type GifAnimationPreviewProps = {
  entity: Entity;
  memories: IdealizedMemory[];
  onClose: () => void;
};

// Separate component for a single floating moment around a memory (always visible, small)
function FloatingMoment({
  moment,
  momentIndex,
  totalMomentsForMemory,
  momentRotation,
  memorySize,
  momentSize,
  isCurrentlyPoppedUp,
  backgroundOpacity,
}: {
  moment: Moment;
  momentIndex: number;
  totalMomentsForMemory: number;
  momentRotation: Animated.SharedValue<number>;
  memorySize: number;
  momentSize: number;
  isCurrentlyPoppedUp: boolean;
  backgroundOpacity: number;
}) {
  // Use derived value to convert boolean prop to worklet-safe value
  const isHidden = useDerivedValue(() => isCurrentlyPoppedUp ? 1 : 0, [isCurrentlyPoppedUp]);

  const momentAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Calculate moment position - orbiting around its memory
    const orbitRadius = 80;
    const angle = (momentIndex / Math.max(1, totalMomentsForMemory)) * Math.PI * 2 + (momentRotation.value * Math.PI / 180);
    const posX = Math.cos(angle) * orbitRadius;
    const posY = Math.sin(angle) * orbitRadius;

    return {
      transform: [
        { translateX: posX },
        { translateY: posY },
        { scale: isHidden.value === 1 ? 0 : 1 }, // Hide when popped up
      ],
      opacity: isHidden.value === 1 ? 0 : backgroundOpacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: memorySize / 2 - momentSize / 2,
          top: memorySize / 2 - momentSize / 2,
          width: momentSize,
          height: momentSize,
          borderRadius: momentSize / 2,
          backgroundColor: moment.type === 'lessons'
            ? '#FFD700'
            : moment.type === 'sunnyMoments'
            ? '#FFA500'
            : '#999',
          justifyContent: 'center',
          alignItems: 'center',
        },
        momentAnimatedStyle,
      ]}
    >
      <ThemedText style={{ fontSize: 12 }}>
        {moment.type === 'lessons' ? '💡' : moment.type === 'sunnyMoments' ? '☀️' : '☁️'}
      </ThemedText>
    </Animated.View>
  );
}

// Separate component for a single memory to avoid hook issues
function FloatingMemory({
  memory,
  memoryIndex,
  position,
  allMomentsForMemory,
  currentPopupMomentId,
  memoryRotation,
  momentRotation,
  memorySize,
  momentSize,
  backgroundOpacity,
}: {
  memory: IdealizedMemory;
  memoryIndex: number;
  position: { x: number; y: number; angle: number };
  allMomentsForMemory: Moment[];
  currentPopupMomentId: string | null;
  memoryRotation: Animated.SharedValue<number>;
  momentRotation: Animated.SharedValue<number>;
  memorySize: number;
  momentSize: number;
  backgroundOpacity: number;
}) {
  const memoryAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const rotationOffset = (memoryRotation.value * Math.PI) / 180;
    const newAngle = position.angle + rotationOffset;
    const radius = 180;
    const x = SCREEN_WIDTH / 2 + Math.cos(newAngle) * radius - memorySize / 2;
    const y = SCREEN_HEIGHT / 2 + Math.sin(newAngle) * radius - memorySize / 2;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 1 },
      ],
      opacity: backgroundOpacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: memorySize,
          height: memorySize,
          borderRadius: memorySize / 2,
          backgroundColor: '#555',
        },
        memoryAnimatedStyle,
      ]}
    >
      {memory.imageUri ? (
        <Image
          source={{ uri: memory.imageUri }}
          style={{ width: memorySize, height: memorySize, borderRadius: memorySize / 2 }}
          contentFit="cover"
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: '#666', borderRadius: memorySize / 2 }} />
      )}

      {/* All moments floating around this memory - ALWAYS VISIBLE (except when popped up) */}
      {allMomentsForMemory.map((moment, momentIndex) => (
        <FloatingMoment
          key={moment.id}
          moment={moment}
          momentIndex={momentIndex}
          totalMomentsForMemory={allMomentsForMemory.length}
          momentRotation={momentRotation}
          memorySize={memorySize}
          momentSize={momentSize}
          isCurrentlyPoppedUp={currentPopupMomentId?.includes(moment.id) || false}
          backgroundOpacity={backgroundOpacity}
        />
      ))}
    </Animated.View>
  );
}

// Pop-up moment that appears above the avatar (matching entity wheel style)
// Animates from the floating moment position to a target position
// Custom Slider Component
function SpeedSlider({
  label,
  value,
  onValueChange,
  colorScheme,
}: {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  colorScheme: 'light' | 'dark';
}) {
  const sliderWidth = 200;
  const thumbSize = 16;
  const trackHeight = 3;
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        if (sliderRef.current) {
          sliderRef.current.measure((x, y, width, height, pageX, pageY) => {
            const touchX = evt.nativeEvent.pageX - pageX;
            const newValue = Math.max(0, Math.min(10, Math.round((touchX / sliderWidth) * 10)));
            onValueChange(newValue);
          });
        }
      },
      onPanResponderMove: (evt) => {
        if (sliderRef.current) {
          sliderRef.current.measure((x, y, width, height, pageX, pageY) => {
            const touchX = evt.nativeEvent.pageX - pageX;
            const newValue = Math.max(0, Math.min(10, Math.round((touchX / sliderWidth) * 10)));
            onValueChange(newValue);
          });
        }
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
    })
  ).current;

  const thumbPosition = (value / 10) * sliderWidth;

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <ThemedText
          style={{
            fontSize: 11,
            color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
          }}
        >
          {label}
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 10,
            color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
          }}
        >
          {value}/10
        </ThemedText>
      </View>
      <View
        ref={sliderRef}
        style={{
          width: sliderWidth,
          height: 32,
          justifyContent: 'center',
          position: 'relative',
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={{
            width: sliderWidth,
            height: trackHeight,
            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            borderRadius: trackHeight / 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: thumbPosition - thumbSize / 2,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: colorScheme === 'dark' ? 'rgba(100, 181, 246, 0.8)' : 'rgba(100, 181, 246, 0.9)',
            borderWidth: 1.5,
            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
            transform: [{ scale: isDragging ? 1.15 : 1 }],
          }}
        />
      </View>
    </View>
  );
}

// Loading overlay with splash animation during video export
function LoadingOverlay({ progress, colorScheme }: { progress: number; colorScheme: 'light' | 'dark' }) {
  const orbitRadius = 60;
  const sphereSize = 40;
  const avatarSize = 50;

  // Orbit angles for 5 spheres
  const orbit1 = useSharedValue(0);
  const orbit2 = useSharedValue(0);
  const orbit3 = useSharedValue(0);
  const orbit4 = useSharedValue(0);
  const orbit5 = useSharedValue(0);

  useEffect(() => {
    // All spheres orbit together
    orbit1.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
    orbit2.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
    orbit3.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
    orbit4.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
    orbit5.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
  }, []);

  const createOrbitStyle = (orbitValue: Animated.SharedValue<number>, baseAngle: number) => {
    return useAnimatedStyle(() => {
      const angle = (baseAngle + orbitValue.value) * (Math.PI / 180);
      const x = Math.sin(angle) * orbitRadius;
      const y = -Math.cos(angle) * orbitRadius;
      return {
        transform: [{ translateX: x }, { translateY: y }],
      };
    });
  };

  const sphere1Style = createOrbitStyle(orbit1, 0);
  const sphere2Style = createOrbitStyle(orbit2, 72);
  const sphere3Style = createOrbitStyle(orbit3, 144);
  const sphere4Style = createOrbitStyle(orbit4, 216);
  const sphere5Style = createOrbitStyle(orbit5, 288);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 500,
      }}
      pointerEvents="none"
    >
      {/* Orbiting animation */}
      <View style={{ width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 40 }}>
        {/* Central avatar */}
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: 'rgba(100, 181, 246, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name="person" size={30} color="rgba(255, 215, 0, 0.9)" />
        </View>

        {/* Sphere 1 - Relationships */}
        <Animated.View style={[{ position: 'absolute', width: sphereSize, height: sphereSize }, sphere1Style]}>
          <View style={{ width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2, backgroundColor: 'rgba(255, 150, 150, 0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="favorite" size={24} color="rgba(255, 180, 180, 0.9)" />
          </View>
        </Animated.View>

        {/* Sphere 2 - Career */}
        <Animated.View style={[{ position: 'absolute', width: sphereSize, height: sphereSize }, sphere2Style]}>
          <View style={{ width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2, backgroundColor: 'rgba(150, 200, 255, 0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="work" size={24} color="rgba(180, 220, 255, 0.9)" />
          </View>
        </Animated.View>

        {/* Sphere 3 - Family */}
        <Animated.View style={[{ position: 'absolute', width: sphereSize, height: sphereSize }, sphere3Style]}>
          <View style={{ width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2, backgroundColor: 'rgba(200, 150, 255, 0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="family-restroom" size={24} color="rgba(220, 180, 255, 0.9)" />
          </View>
        </Animated.View>

        {/* Sphere 4 - Friends */}
        <Animated.View style={[{ position: 'absolute', width: sphereSize, height: sphereSize }, sphere4Style]}>
          <View style={{ width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2, backgroundColor: 'rgba(139, 92, 246, 0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="people" size={24} color="rgba(167, 139, 250, 0.9)" />
          </View>
        </Animated.View>

        {/* Sphere 5 - Hobbies */}
        <Animated.View style={[{ position: 'absolute', width: sphereSize, height: sphereSize }, sphere5Style]}>
          <View style={{ width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2, backgroundColor: 'rgba(249, 115, 22, 0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="sports-esports" size={24} color="rgba(255, 157, 88, 0.9)" />
          </View>
        </Animated.View>
      </View>

      {/* Progress info */}
      <View style={{ alignItems: 'center' }}>
        <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Creating Video...
        </ThemedText>
        <ThemedText style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, marginBottom: 16 }}>
          {progress < 70 ? 'Recording frames' : progress < 90 ? 'Processing video' : 'Finalizing'}
        </ThemedText>

        {/* Progress bar */}
        <View style={{ width: 200, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
          <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#64B5F6', borderRadius: 2 }} />
        </View>

        <ThemedText style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, fontWeight: '500' }}>
          {Math.round(progress)}%
        </ThemedText>
      </View>
    </View>
  );
}

// Circular popup with MaterialIcons matching the entity wheel popup style
// Manages its own animation lifecycle
function PopUpMoment({
  moment,
  targetPosition,
  memoryPositions,
  momentsByMemory,
  memoryRotation,
  momentRotation,
  onComplete,
  disappearSpeed = 5,
  timeScaleFactor = 1,
}: {
  moment: Moment;
  targetPosition: { x: number; y: number };
  memoryPositions: { x: number; y: number; angle: number }[];
  momentsByMemory: { [key: number]: Moment[] };
  memoryRotation: Animated.SharedValue<number>;
  momentRotation: Animated.SharedValue<number>;
  onComplete?: () => void;
  disappearSpeed?: number; // 0-10 scale
  timeScaleFactor?: number; // Animation slowdown factor during capture
}) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const momentWidth = 190;
  const momentHeight = 190;

  // Start with small size (matching the floating moment size: 24px / 190px ≈ 0.126)
  const popupScale = useSharedValue(0.126);
  const popupOpacity = useSharedValue(1); // Start fully visible
  const popupTranslateX = useSharedValue(0);
  const popupTranslateY = useSharedValue(0);
  const sourceX = useSharedValue(SCREEN_WIDTH / 2);
  const sourceY = useSharedValue(SCREEN_HEIGHT / 2);

  // Get visual properties based on moment type (matching entity wheel popup)
  const momentVisuals = {
    lessons: {
      icon: 'lightbulb' as const,
      backgroundColor: 'rgba(255, 215, 0, 0.45)',
      shadowColor: '#FFD700',
      iconColor: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
    },
    sunnyMoments: {
      icon: 'wb-sunny' as const,
      backgroundColor: 'rgba(255, 215, 0, 0.55)',
      shadowColor: '#FFD700',
      iconColor: colorScheme === 'dark' ? '#FFD700' : '#FF9800',
    },
    hardTruths: {
      icon: 'cloud' as const,
      backgroundColor: 'rgba(150, 150, 180, 0.35)',
      shadowColor: '#9696B4',
      iconColor: colorScheme === 'dark' ? '#B0B0C8' : '#7878A0',
    },
  };

  const visuals = momentVisuals[moment.type];

  useEffect(() => {
    // Calculate source position using CURRENT rotation values (in worklet)
    const memoryIndex = moment.memoryIndex;
    const memoryPosition = memoryPositions[memoryIndex];
    const momentsForMemory = momentsByMemory[memoryIndex] || [];
    const momentIndexInMemory = momentsForMemory.findIndex(m => m.id === moment.id);

    // Capture values needed for the worklet
    const memAngle = memoryPosition.angle;
    const memCount = momentsForMemory.length;
    const targetX = targetPosition.x;
    const targetY = targetPosition.y;

    // Use runOnUI to calculate position on UI thread with current shared values
    const calculateAndAnimate = (
      memAngleParam: number,
      memCountParam: number,
      targetXParam: number,
      targetYParam: number,
      momentIndexParam: number,
      scaleFactorParam: number
    ) => {
      'worklet';
      // Calculate memory position using CURRENT rotation value
      const memoryRotationOffset = (memoryRotation.value * Math.PI) / 180;
      const memoryAngle = memAngleParam + memoryRotationOffset;
      const memoryRadius = 180;
      const memoryX = SCREEN_WIDTH / 2 + Math.cos(memoryAngle) * memoryRadius;
      const memoryY = SCREEN_HEIGHT / 2 + Math.sin(memoryAngle) * memoryRadius;

      // Calculate moment position around memory using CURRENT rotation value
      const momentOrbitRadius = 80;
      const momentRotationOffset = (momentRotation.value * Math.PI) / 180;
      const momentAngle = (momentIndexParam / Math.max(1, memCountParam)) * Math.PI * 2 + momentRotationOffset;
      const momentX = memoryX + Math.cos(momentAngle) * momentOrbitRadius;
      const momentY = memoryY + Math.sin(momentAngle) * momentOrbitRadius;

      sourceX.value = momentX;
      sourceY.value = momentY;

      // Calculate target position - very close to the entity avatar center
      const avatarCenterX = SCREEN_WIDTH / 2;
      const avatarCenterY = SCREEN_HEIGHT / 2;

      // Distance from avatar center (just outside the avatar edge)
      const avatarRadius = 60; // Avatar size / 2
      const offsetFromCenter = avatarRadius + 30; // 30px from avatar edge

      // Calculate angle from memory to avatar
      const angleToAvatar = Math.atan2(avatarCenterY - momentY, avatarCenterX - momentX);

      // Target position is just outside the avatar
      const targetX = avatarCenterX - Math.cos(angleToAvatar) * offsetFromCenter;
      const targetY = avatarCenterY - Math.sin(angleToAvatar) * offsetFromCenter;

      // Calculate deltas from source to target
      const deltaX = targetX - momentX;
      const deltaY = targetY - momentY;

      // Animate movement: go to avatar, hold, return back
      // Scale durations during capture to match slowed-down animations
      const moveDuration = 600 * scaleFactorParam;
      const holdDuration = 200 * scaleFactorParam;
      const returnDuration = 600 * scaleFactorParam;

      // Move to avatar
      popupTranslateX.value = withSequence(
        withTiming(deltaX, { duration: moveDuration, easing: Easing.out(Easing.cubic) }),
        withTiming(deltaX, { duration: holdDuration }), // Hold near avatar
        // Will return to 0 after visible duration (handled by timeout below)
      );

      popupTranslateY.value = withSequence(
        withTiming(deltaY, { duration: moveDuration, easing: Easing.out(Easing.cubic) }),
        withTiming(deltaY, { duration: holdDuration }), // Hold near avatar
        // Will return to 0 after visible duration (handled by timeout below)
      );

      // Grow slightly as it moves toward avatar
      popupScale.value = withSequence(
        withTiming(1.1, { duration: moveDuration, easing: Easing.out(Easing.cubic) }),
        withTiming(1.1, { duration: holdDuration }), // Hold at size
        // Will shrink after visible duration (handled by timeout below)
      );

      // Start fully visible
      popupOpacity.value = 1;
    };

    // Run on UI thread to access shared values - this prevents warnings
    runOnUI(calculateAndAnimate)(memAngle, memCount, targetX, targetY, momentIndexInMemory, timeScaleFactor);

    // Calculate total animation time (all scaled by timeScaleFactor)
    // Grow: 600ms, Hold large: 200ms, Hold visible: based on disappearSpeed, Shrink: 600ms
    const growDuration = 600 * timeScaleFactor;
    const holdLargeDuration = 200 * timeScaleFactor;

    // Map disappearSpeed 0-10 to hold visible duration
    // 0 = 500ms (shortest), 10 = 10000ms (longest)
    const holdVisibleDuration = (500 + (disappearSpeed * 950)) * timeScaleFactor;
    const shrinkDuration = 600 * timeScaleFactor;

    const totalDuration = growDuration + holdLargeDuration + holdVisibleDuration + shrinkDuration;

    // After move to avatar + hold, wait for visible duration, then return back
    const timeBeforeReturn = growDuration + holdLargeDuration + holdVisibleDuration;
    const returnTimer = setTimeout(() => {
      // Return to original position (translate back to 0,0)
      popupTranslateX.value = withTiming(0, { duration: shrinkDuration, easing: Easing.in(Easing.cubic) });
      popupTranslateY.value = withTiming(0, { duration: shrinkDuration, easing: Easing.in(Easing.cubic) });
      // Shrink back to normal size
      popupScale.value = withTiming(1, { duration: shrinkDuration, easing: Easing.in(Easing.cubic) });
      // Fade out
      popupOpacity.value = withTiming(0, { duration: shrinkDuration, easing: Easing.in(Easing.ease) });
    }, timeBeforeReturn);

    // Trigger completion callback after animation finishes
    const completeTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, totalDuration);

    return () => {
      clearTimeout(returnTimer);
      clearTimeout(completeTimer);
    };
  }, [moment.id, disappearSpeed, timeScaleFactor]);

  const popupAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      top: sourceY.value - momentHeight / 2,
      left: sourceX.value - momentWidth / 2,
      transform: [
        { translateX: popupTranslateX.value },
        { translateY: popupTranslateY.value },
        { scale: popupScale.value }
      ],
      opacity: popupOpacity.value,
    };
  });

  // Render different shapes based on moment type
  const renderMomentShape = () => {
    if (moment.type === 'lessons') {
      // Circular lightbulb (matching focused memory view)
      return (
        <View
          style={{
            width: momentWidth,
            height: momentHeight,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 215, 0, 0.25)',
            borderRadius: momentWidth / 2,
            shadowColor: '#FFD700',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 12,
            elevation: 8,
            padding: 8,
          }}
        >
          <MaterialIcons
            name="lightbulb"
            size={momentWidth * 0.35}
            color={colorScheme === 'dark' ? '#FFD700' : '#FFA000'}
            style={{ marginBottom: 4 }}
          />
          <ThemedText
            style={{
              color: colorScheme === 'dark' ? '#000000' : '#1A1A1A',
              fontSize: 11 * fontScale,
              textAlign: 'center',
              fontWeight: '700',
              maxWidth: momentWidth * 0.85,
              lineHeight: 14 * fontScale,
            }}
            numberOfLines={5}
          >
            {moment.text}
          </ThemedText>
        </View>
      );
    } else if (moment.type === 'sunnyMoments') {
      // SVG sun with rays (matching focused memory view)
      return (
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
                id={`sunGradient-${moment.id}`}
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
                  key={`ray-${i}`}
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
              fill={`url(#sunGradient-${moment.id})`}
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
              paddingHorizontal: (momentWidth / 160) * 48 * 0.6,
              paddingVertical: (momentWidth / 160) * 48 * 0.4,
            }}
          >
            <ThemedText
              style={{
                color: 'black',
                fontSize: 12 * fontScale,
                textAlign: 'center',
                fontWeight: '700',
              }}
              numberOfLines={3}
            >
              {moment.text}
            </ThemedText>
          </View>
        </View>
      );
    } else {
      // SVG cloud (matching focused memory view)
      const cloudWidth = momentWidth * 1.6; // Clouds are wider
      const cloudHeight = momentHeight * 0.6; // But shorter
      return (
        <View
          style={{
            width: cloudWidth,
            height: cloudHeight,
            shadowColor: '#4A5568',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
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
              <SvgLinearGradient id={`cloudGradient-${moment.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
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
              fill={`url(#cloudGradient-${moment.id})`}
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
              {moment.text}
            </ThemedText>
          </View>
        </View>
      );
    }
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          zIndex: 20, // Above avatar (which is zIndex: 10)
        },
        popupAnimatedStyle,
      ]}
    >
      {renderMomentShape()}
    </Animated.View>
  );
}

export function GifAnimationPreview({ entity, memories, onClose }: GifAnimationPreviewProps) {
  const colorScheme = useColorScheme();
  const viewShotRef = useRef<View>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [captureProgress, setCaptureProgress] = React.useState(0);
  const cancelCaptureRef = useRef(false);
  const timeScaleFactorRef = useRef(1); // Ref to track animation slowdown during capture
  const [memoryRotationSpeed, setMemoryRotationSpeed] = React.useState(6); // 0-10 scale, default 6
  const [popupDisappearSpeed, setPopupDisappearSpeed] = React.useState(2); // 0-10 scale, default 2
  const [backgroundBlur, setBackgroundBlur] = React.useState(2); // 0-10 scale, default 2 (slight dimming)
  const [isSettingsExpanded, setIsSettingsExpanded] = React.useState(false);

  // Moment type filters
  const [showLessons, setShowLessons] = React.useState(true);
  const [showSunnyMoments, setShowSunnyMoments] = React.useState(true);
  const [showHardTruths, setShowHardTruths] = React.useState(true);
  const avatarSize = 120;
  const memorySize = 50;
  const momentSize = 24;

  // Safety check - don't render if no memories
  if (!memories || memories.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={{ color: '#fff', fontSize: 18 }}>No memories to display</ThemedText>
        <Pressable
          onPress={onClose}
          style={{
            marginTop: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
          }}
        >
          <ThemedText style={{ color: '#fff' }}>Close</ThemedText>
        </Pressable>
      </View>
    );
  }

  // Calculate memory positions in a circle around avatar
  const memoryPositions = React.useMemo(() => {
    const radius = 180;
    return memories.map((_, index) => {
      const angle = (index / memories.length) * Math.PI * 2 - Math.PI / 2;
      return {
        x: SCREEN_WIDTH / 2 + Math.cos(angle) * radius,
        y: SCREEN_HEIGHT / 2 + Math.sin(angle) * radius,
        angle,
      };
    });
  }, [memories.length]);

  // Get ALL moments from ALL memories, filtered by selected types
  const allMoments = React.useMemo(() => {
    const moments: Moment[] = [];

    memories.forEach((memory, memoryIndex) => {
      if (showLessons) {
        (memory.lessonsLearned || []).forEach((lesson, i) => {
          const text = typeof lesson === 'string' ? lesson : lesson.text || '';
          moments.push({
            id: `${memory.id}-lesson-${i}`,
            text,
            type: 'lessons',
            memoryIndex
          });
        });
      }
      if (showSunnyMoments) {
        (memory.goodFacts || []).forEach((fact, i) => {
          const text = typeof fact === 'string' ? fact : fact.text || '';
          moments.push({
            id: `${memory.id}-sunny-${i}`,
            text,
            type: 'sunnyMoments',
            memoryIndex
          });
        });
      }
      if (showHardTruths) {
        (memory.hardTruths || []).forEach((truth, i) => {
          const text = typeof truth === 'string' ? truth : truth.text || '';
          moments.push({
            id: `${memory.id}-truth-${i}`,
            text,
            type: 'hardTruths',
            memoryIndex
          });
        });
      }
    });

    return moments;
  }, [memories, showLessons, showSunnyMoments, showHardTruths]);

  // Group moments by memory for rendering floating moments
  const momentsByMemory = React.useMemo(() => {
    const grouped: { [key: number]: Moment[] } = {};
    allMoments.forEach(moment => {
      if (!grouped[moment.memoryIndex]) {
        grouped[moment.memoryIndex] = [];
      }
      grouped[moment.memoryIndex].push(moment);
    });
    return grouped;
  }, [allMoments]);

  // Floating animation for memories (continuous rotation)
  const memoryRotation = useSharedValue(0);

  useEffect(() => {
    // Reset rotation to 0 when speed changes
    memoryRotation.value = 0;

    // Map speed 0-10 to duration: 0 = 40000ms (slowest), 10 = 5000ms (fastest)
    // Default 3 = 29500ms (slower, more relaxed pace)
    const duration = 40000 - (memoryRotationSpeed * 3500);
    memoryRotation.value = withRepeat(
      withTiming(360, {
        duration: Math.max(5000, Math.min(40000, duration)),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [memoryRotationSpeed]);

  // Moment floating animation (continuous rotation around memory)
  const momentRotation = useSharedValue(0);

  useEffect(() => {
    // Reset rotation to 0 when speed changes
    momentRotation.value = 0;

    // Map speed 0-10 to duration: 0 = 20000ms (slowest), 10 = 5000ms (fastest)
    // Default 3 = 15500ms (slower, more relaxed pace)
    const duration = 20000 - (memoryRotationSpeed * 1500);
    momentRotation.value = withRepeat(
      withTiming(360, {
        duration: Math.max(5000, Math.min(20000, duration)),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [memoryRotationSpeed]);

  // Track multiple active popups with their timestamps and positions
  const [activePopups, setActivePopups] = React.useState<{ moment: Moment; key: number; positionIndex: number }[]>([]);
  const nextMomentIndexRef = React.useRef(0);
  const popupKeyRef = React.useRef(0);
  const positionIndexRef = React.useRef(0);
  const lastMemoryIndexRef = React.useRef<number | null>(null);

  // Animation trigger - adds new moments continuously
  useEffect(() => {
    if (allMoments.length === 0) return;

    // Reset animation state when speeds change
    setActivePopups([]);
    nextMomentIndexRef.current = 0;
    popupKeyRef.current = 0;
    positionIndexRef.current = 0;
    lastMemoryIndexRef.current = null;

    // Calculate popup interval based on memory rotation speed
    // Slower rotation = slower popup appearances for better pacing
    // Speed 0 (slowest) = 1500ms interval, Speed 10 (fastest) = 500ms interval
    // Default speed 3 = 1200ms interval
    const baseInterval = 1500 - (memoryRotationSpeed * 100);
    const popupInterval = Math.max(500, Math.min(1500, baseInterval));

    // Scale interval during capture to match slowed-down animations
    const scaledInterval = popupInterval * timeScaleFactorRef.current;

    const timer = setInterval(() => {
      // Filter out moments from adjacent memories
      const availableMoments = allMoments.filter((moment) => {
        if (lastMemoryIndexRef.current === null) {
          // First moment - allow any
          return true;
        }
        
        const lastMemoryIndex = lastMemoryIndexRef.current;
        const currentMemoryIndex = moment.memoryIndex;
        const totalMemories = memories.length;
        
        // Calculate adjacent indices (wrapping around the circle)
        const prevIndex = (lastMemoryIndex - 1 + totalMemories) % totalMemories;
        const nextIndex = (lastMemoryIndex + 1) % totalMemories;
        
        // Exclude moments from the same memory and adjacent memories
        return currentMemoryIndex !== lastMemoryIndex &&
               currentMemoryIndex !== prevIndex &&
               currentMemoryIndex !== nextIndex;
      });

      // If no available moments (all are adjacent), allow any moment
      const momentsToChooseFrom = availableMoments.length > 0 ? availableMoments : allMoments;
      
      // Randomly select from available moments
      if (momentsToChooseFrom.length > 0) {
        const randomIndex = Math.floor(Math.random() * momentsToChooseFrom.length);
        const nextMoment = momentsToChooseFrom[randomIndex];
        
        // Update last memory index
        lastMemoryIndexRef.current = nextMoment.memoryIndex;
        
        // Assign a fixed position index that cycles through 6 positions
        const positionIndex = positionIndexRef.current % 6;
        setActivePopups((prev) => [...prev, {
          moment: nextMoment,
          key: popupKeyRef.current++,
          positionIndex
        }]);
        positionIndexRef.current++;
      }
    }, scaledInterval);

    return () => clearInterval(timer);
  }, [allMoments, memoryRotationSpeed, popupDisappearSpeed, isCapturing, memories.length]);

  // Remove completed popups
  const handlePopupComplete = React.useCallback((key: number) => {
    setActivePopups((prev) => prev.filter((p) => p.key !== key));
  }, []);

  // Handle sharing - creates video from frames and shares
  const handleShare = React.useCallback(async () => {
    try {
      // Reset animation to start from the beginning
      // Clear all active popups first
      setActivePopups([]);
      
      // Reset moment and position indices
      nextMomentIndexRef.current = 0;
      positionIndexRef.current = 0;
      lastMemoryIndexRef.current = null;
      
      // Reset rotation values to 0 and restart animations
      memoryRotation.value = 0;
      momentRotation.value = 0;

      // Calculate base animation durations from slider speed
      const memoryDuration = 40000 - (memoryRotationSpeed * 3500);
      const actualMemoryAnimDuration = Math.max(5000, Math.min(40000, memoryDuration));
      const momentDuration = 20000 - (memoryRotationSpeed * 1500);
      const actualMomentAnimDuration = Math.max(5000, Math.min(20000, momentDuration));

      // CRITICAL: Slow down animations during capture to match capture speed
      // Frame capture takes ~215ms per frame (not 33ms), so animations run 6.5x faster than video
      // We need to slow animations by the same factor
      // Estimate: captureRef takes ~200ms per frame on average
      const estimatedCaptureTimePerFrame = 200; // ms (based on previous captures)
      const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
      const timeScaleFactor = estimatedCaptureTimePerFrame / targetFrameTime; // ~6x slower

      // Update the ref so popup interval also gets scaled
      timeScaleFactorRef.current = timeScaleFactor;

      const scaledMemoryDuration = actualMemoryAnimDuration * timeScaleFactor;
      const scaledMomentDuration = actualMomentAnimDuration * timeScaleFactor;

      console.log(`[GifAnimationPreview] Starting capture with memoryRotationSpeed=${memoryRotationSpeed}, memoryDuration=${actualMemoryAnimDuration}ms`);
      console.log(`[GifAnimationPreview] popupDisappearSpeed=${popupDisappearSpeed}, backgroundBlur=${backgroundBlur}`);
      console.log(`[GifAnimationPreview] Time scale factor: ${timeScaleFactor.toFixed(1)}x (slowing animations for capture)`);
      console.log(`[GifAnimationPreview] Scaled memory duration: ${scaledMemoryDuration}ms, scaled moment duration: ${scaledMomentDuration}ms`);

      memoryRotation.value = withRepeat(
        withTiming(360, {
          duration: scaledMemoryDuration,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      momentRotation.value = withRepeat(
        withTiming(360, {
          duration: scaledMomentDuration,
          easing: Easing.linear,
        }),
        -1,
        false
      );
      
      // Wait a brief moment for animation to reset before starting capture
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsCapturing(true);
      setCaptureProgress(0);
      cancelCaptureRef.current = false;

      // Calculate frame timing based on animation speed
      // For smooth video, capture at 30 fps (33ms between frames)
      // Video should show ALL moments appearing and disappearing ONCE (not looping)

      // Calculate time needed for all moments to appear and disappear:
      // - Moments appear based on rotation speed (slower rotation = slower popups)
      // - Each moment takes: 1400ms (animation) + fullyVisibleDuration + 1200ms (shrink)
      // - fullyVisibleDuration = 500 + (popupDisappearSpeed * 950)

      // Calculate dynamic popup interval (same as in useEffect above)
      const baseInterval = 1500 - (memoryRotationSpeed * 100);
      const popupInterval = Math.max(500, Math.min(1500, baseInterval)); // Time between moment appearances

      // Calculate moment lifecycle timing (matching PopUpMoment component)
      const growDuration = 600;
      const holdLargeDuration = 200;
      const holdVisibleDuration = 500 + (popupDisappearSpeed * 950);
      const shrinkDuration = 600;
      const totalMomentDuration = growDuration + holdLargeDuration + holdVisibleDuration + shrinkDuration;

      // Time for all moments to appear: (allMoments.length - 1) * popupInterval
      const timeForAllToAppear = (allMoments.length - 1) * popupInterval;
      // Time for all moments to complete their lifecycle
      const timeForAllMomentsComplete = timeForAllToAppear + totalMomentDuration;

      // BUT: Also ensure we capture at least one full memory rotation
      // Otherwise the video looks sped up compared to the preview
      const captureTime = Math.max(timeForAllMomentsComplete, actualMemoryAnimDuration);

      // Capture frames in real-time matching the animation duration
      // captureTime is the animation duration we want to capture
      // We'll capture in real-time at the same pace as animations run
      const videoFps = 30; // Final video playback speed
      const frameDuration = 1000 / videoFps; // Time per frame in ms (33.33ms for 30fps)
      const frameCount = Math.floor(captureTime / frameDuration);
      const frames: string[] = [];

      console.log(`[GifAnimationPreview] Capture plan: ${allMoments.length} moments`);
      console.log(`[GifAnimationPreview] Popup interval: ${popupInterval}ms (based on rotation speed ${memoryRotationSpeed})`);
      console.log(`[GifAnimationPreview] Moments complete in: ${timeForAllMomentsComplete}ms (${(timeForAllMomentsComplete/1000).toFixed(1)}s)`);
      console.log(`[GifAnimationPreview] Memory full rotation: ${actualMemoryAnimDuration}ms (${(actualMemoryAnimDuration/1000).toFixed(1)}s)`);
      console.log(`[GifAnimationPreview] Capturing ${frameCount} frames over ${(captureTime/1000).toFixed(1)}s in real-time`);
      console.log(`[GifAnimationPreview] Frame interval: ${frameDuration.toFixed(1)}ms, Video playback: ${videoFps}fps = ${(frameCount/videoFps).toFixed(1)}s duration`);

      const captureStartTime = Date.now();
      for (let i = 0; i < frameCount; i++) {
        // Check for cancellation
        if (cancelCaptureRef.current) {
          setIsCapturing(false);
          setCaptureProgress(0);
          return;
        }

        try {
          const frameUri = await captureRef(viewShotRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
          frames.push(frameUri);

          // Update progress (frames capture is 70% of total process)
          const frameProgress = ((i + 1) / frameCount) * 70;
          setCaptureProgress(frameProgress);

          // Use precise timing: calculate when next frame should be captured
          const targetTime = captureStartTime + ((i + 1) * frameDuration);
          const currentTime = Date.now();
          const waitTime = Math.max(0, targetTime - currentTime);

          if (i < frameCount - 1) { // Don't wait after last frame
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (error) {
          console.error(`[GifAnimationPreview] Failed to capture frame ${i}:`, error);
        }
      }

      const totalCaptureTime = Date.now() - captureStartTime;
      console.log(`[GifAnimationPreview] Actual capture time: ${(totalCaptureTime/1000).toFixed(1)}s for ${frames.length} frames`);

      if (frames.length === 0) {
        throw new Error('Failed to capture any frames');
      }

      // Create output path in temp directory (more reliable for video creation)
      const timestamp = Date.now();
      const filename = `${entity.name.replace(/[^a-zA-Z0-9]/g, '_')}_animation_${timestamp}.mp4`;

      // Use documentDirectory instead of cacheDirectory for better compatibility
      const baseDir = FileSystemLegacy.documentDirectory || FileSystemLegacy.cacheDirectory;
      const outputPath = `${baseDir}${filename}`;

      // Convert file:// URIs to absolute paths for iOS and decode URL encoding
      const absoluteFramePaths = frames.map(uri => {
        // Remove file:// prefix
        let cleanPath = uri.replace(/^file:\/\//, '');

        // Decode URL encoding with error handling
        try {
          cleanPath = decodeURIComponent(cleanPath);
        } catch (e) {
          // Continue with cleaned path if decoding fails
        }

        // Remove any trailing slashes or whitespace
        cleanPath = cleanPath.trim();

        return cleanPath;
      }).filter(path => path.length > 0); // Remove any empty paths

      if (absoluteFramePaths.length === 0) {
        throw new Error('No valid frame paths after cleaning');
      }

      // Check for cancellation before video creation
      if (cancelCaptureRef.current) {
        setIsCapturing(false);
        setCaptureProgress(0);
        return;
      }

      setCaptureProgress(75); // Video creation starts at 75%

      console.log(`[GifAnimationPreview] Creating video with ${frameCount} frames at ${videoFps} fps`);
      console.log(`[GifAnimationPreview] Video will show all ${allMoments.length} moments appearing once`);
      console.log(`[GifAnimationPreview] Expected video duration: ${(frameCount / videoFps).toFixed(1)}s`);
      console.log(`[GifAnimationPreview] Each moment lifecycle: ${totalMomentDuration}ms (appear + visible + disappear)`);

      const videoPath = await createVideoFromFrames({
        framePaths: absoluteFramePaths,
        outputPath: outputPath, // Use original path with file:// if present
        fps: videoFps,
        width: Math.floor(SCREEN_WIDTH),
        height: Math.floor(SCREEN_HEIGHT),
      });

      // Check for cancellation after video creation
      if (cancelCaptureRef.current) {
        setIsCapturing(false);
        setCaptureProgress(0);
        return;
      }

      setCaptureProgress(90); // Video created, now cleaning up

      // Clean up frame files using new File API
      await Promise.all(frames.map(async (frameUri) => {
        try {
          // Remove file:// prefix if present
          const cleanPath = frameUri.replace(/^file:\/\//, '');
          const file = new File(cleanPath);
          // Try to delete - File.delete() will handle non-existent files gracefully
          await file.delete();
        } catch (error) {
          // Silently ignore errors - file might already be deleted or not exist
        }
      }));

      // Share the video
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(videoPath, {
          mimeType: 'video/mp4',
          dialogTitle: `${entity.name} Animation`,
        });
      } else {
        Alert.alert('Success', 'Video created and saved!');
      }

      setCaptureProgress(100);
      setIsCapturing(false);
      setCaptureProgress(0);

      // Reset time scale factor back to normal speed
      timeScaleFactorRef.current = 1;
    } catch (error: any) {
      setIsCapturing(false);
      setCaptureProgress(0);

      // Reset time scale factor back to normal speed
      timeScaleFactorRef.current = 1;

      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      Alert.alert(
        'Video Creation Failed',
        `Failed to create video: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, [entity.name, memoryRotation, momentRotation, memoryRotationSpeed, popupDisappearSpeed, backgroundBlur]);

  // Handle cancellation
  const handleCancelCapture = React.useCallback(() => {
    cancelCaptureRef.current = true;
    setIsCapturing(false);
    setCaptureProgress(0);
    // Reset time scale factor back to normal speed
    timeScaleFactorRef.current = 1;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Video capture view - this is what gets captured (buttons are outside) */}
      <View
        ref={viewShotRef}
        collapsable={false}
        style={styles.container}
      >
        {/* Subtle gradient background */}
        <LinearGradient
          colors={colorScheme === 'dark' ? DARK_GRADIENT_COLORS : LIGHT_GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Sparkled dots scattered around */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="dotGradient" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Generate random sparkled dots */}
          {Array.from({ length: 60 }).map((_, i) => {
            const x = (Math.sin(i * 1.3) * 0.5 + 0.5) * SCREEN_WIDTH;
            const y = (Math.cos(i * 1.7) * 0.5 + 0.5) * SCREEN_HEIGHT;
            const radius = 1 + (i % 3);
            const opacity = 0.2 + (i % 5) * 0.1;
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r={radius}
                fill="url(#dotGradient)"
                opacity={opacity}
              />
            );
          })}
        </Svg>

      {/* Avatar at center */}
      <View
        style={{
          position: 'absolute',
          left: SCREEN_WIDTH / 2 - avatarSize / 2,
          top: SCREEN_HEIGHT / 2 - avatarSize / 2,
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          overflow: 'hidden',
          backgroundColor: '#333',
          zIndex: 10,
        }}
      >
        {entity.imageUri ? (
          <Image
            source={{ uri: entity.imageUri }}
            style={{ width: avatarSize, height: avatarSize }}
            contentFit="cover"
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 32 }}>
              {entity.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Memories floating around avatar with their floating moments (always visible) */}
      {memories.map((memory, index) => {
        // Calculate opacity: 0 = 1.0 (full opacity), 10 = 0.1 (very faded)
        const calculatedOpacity = 1.0 - (backgroundBlur * 0.09);
        return (
          <FloatingMemory
            key={memory.id}
            memory={memory}
            memoryIndex={index}
            position={memoryPositions[index]}
            allMomentsForMemory={momentsByMemory[index] || []}
            currentPopupMomentId={activePopups.map(p => p.moment.id).join(',')}
            memoryRotation={memoryRotation}
            momentRotation={momentRotation}
            memorySize={memorySize}
            momentSize={momentSize}
            backgroundOpacity={calculatedOpacity}
          />
        );
      })}

      {/* Pop-up moments - multiple simultaneously at different positions */}
      {activePopups.map((popup) => {
        // Use the fixed position index assigned when popup was created
        // 6 positions in a circle around center
        const angle = (popup.positionIndex / 6) * Math.PI * 2;
        const radius = 120; // Distance from center
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;

        return (
          <PopUpMoment
            key={popup.key}
            moment={popup.moment}
            targetPosition={{
              x: SCREEN_WIDTH / 2 + offsetX,
              y: SCREEN_HEIGHT / 2 - 200 + offsetY
            }}
            memoryPositions={memoryPositions}
            momentsByMemory={momentsByMemory}
            memoryRotation={memoryRotation}
            momentRotation={momentRotation}
            onComplete={() => handlePopupComplete(popup.key)}
            disappearSpeed={popupDisappearSpeed}
            timeScaleFactor={timeScaleFactorRef.current}
          />
        );
      })}

      </View>

      {/* Semi-transparent overlay during capture to hide slow animations */}
      {isCapturing && (
        <LoadingOverlay progress={captureProgress} colorScheme={colorScheme} />
      )}

      {/* Bottom buttons - OUTSIDE capture view so they won't appear in video */}
      <View
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          flexDirection: 'row',
          gap: 16,
          justifyContent: 'center',
          zIndex: 1000,
          pointerEvents: 'box-none',
        }}
      >
        {/* Only show Cancel button when capturing, otherwise show both Close and Share Video */}
        {isCapturing ? (
          <Pressable
            onPress={handleCancelCapture}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Cancel
            </ThemedText>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onClose}
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
                Close
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={{
                backgroundColor: '#64B5F6',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
                minWidth: 140,
              }}
            >
              <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Share Video
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>

      {/* Settings Panel - OUTSIDE capture view so they won't appear in video */}
      {!isCapturing && (
        <>
          {/* Backdrop overlay - tap to collapse settings */}
          {isSettingsExpanded && (
            <Pressable
              onPress={() => setIsSettingsExpanded(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent',
                zIndex: 999, // Below settings panel (1000) but above everything else
              }}
            />
          )}

          <View
            style={{
              position: 'absolute',
              bottom: 140,
              left: (SCREEN_WIDTH - 240) / 2,
              backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
              borderRadius: 12,
              padding: isSettingsExpanded ? 12 : 8,
              zIndex: 1000,
              width: 240,
              alignItems: 'center',
            }}
          >
          <Pressable
            onPress={() => setIsSettingsExpanded(!isSettingsExpanded)}
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 4,
            }}
          >
            <ThemedText
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
              }}
            >
              Settings
            </ThemedText>
            <MaterialIcons
              name={isSettingsExpanded ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
              size={20}
              color={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'}
            />
          </Pressable>

          {isSettingsExpanded && (
            <View style={{ width: '100%', marginTop: 12 }}>
              {/* Moment Types Section */}
              <ThemedText
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Moment Types
              </ThemedText>

              {/* Sunny Moments Checkbox */}
              <Pressable
                onPress={() => setShowSunnyMoments(!showSunnyMoments)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: '#64B5F6',
                    backgroundColor: showSunnyMoments ? '#64B5F6' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  {showSunnyMoments && (
                    <MaterialIcons name="check" size={12} color="#fff" />
                  )}
                </View>
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                  }}
                >
                  ☀️ Sunny Moments
                </ThemedText>
              </Pressable>

              {/* Hard Truths Checkbox */}
              <Pressable
                onPress={() => setShowHardTruths(!showHardTruths)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: '#64B5F6',
                    backgroundColor: showHardTruths ? '#64B5F6' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  {showHardTruths && (
                    <MaterialIcons name="check" size={12} color="#fff" />
                  )}
                </View>
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                  }}
                >
                  ☁️ Hard Truths
                </ThemedText>
              </Pressable>

              {/* Lessons Learned Checkbox */}
              <Pressable
                onPress={() => setShowLessons(!showLessons)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: '#64B5F6',
                    backgroundColor: showLessons ? '#64B5F6' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  {showLessons && (
                    <MaterialIcons name="check" size={12} color="#fff" />
                  )}
                </View>
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                  }}
                >
                  🎓 Lessons Learned
                </ThemedText>
              </Pressable>

              {/* Select All / None Button */}
              <Pressable
                onPress={() => {
                  const allSelected = showSunnyMoments && showHardTruths && showLessons;
                  if (allSelected) {
                    // Deselect all
                    setShowSunnyMoments(false);
                    setShowHardTruths(false);
                    setShowLessons(false);
                  } else {
                    // Select all
                    setShowSunnyMoments(true);
                    setShowHardTruths(true);
                    setShowLessons(true);
                  }
                }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(100, 181, 246, 0.15)' : 'rgba(100, 181, 246, 0.1)',
                  borderRadius: 6,
                  alignItems: 'center',
                  marginTop: 4,
                  marginBottom: 12,
                }}
              >
                <ThemedText
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#64B5F6',
                  }}
                >
                  {showSunnyMoments && showHardTruths && showLessons ? 'Deselect All' : 'Select All'}
                </ThemedText>
              </Pressable>

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                  marginVertical: 12,
                }}
              />

              {/* Animation Speed Section */}
              <ThemedText
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Animation Speed
              </ThemedText>

              <SpeedSlider
                label="Floating Memories"
                value={memoryRotationSpeed}
                onValueChange={setMemoryRotationSpeed}
                colorScheme={colorScheme}
              />
              <SpeedSlider
                label="Popup Duration"
                value={popupDisappearSpeed}
                onValueChange={setPopupDisappearSpeed}
                colorScheme={colorScheme}
              />
              <SpeedSlider
                label="Background Blur"
                value={backgroundBlur}
                onValueChange={setBackgroundBlur}
                colorScheme={colorScheme}
              />
            </View>
          )}
        </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
