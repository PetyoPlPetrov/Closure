import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
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
}: {
  moment: Moment;
  momentIndex: number;
  totalMomentsForMemory: number;
  momentRotation: Animated.SharedValue<number>;
  memorySize: number;
  momentSize: number;
  isCurrentlyPoppedUp: boolean;
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
      opacity: isHidden.value === 1 ? 0 : 1,
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
      ],
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
}: {
  moment: Moment;
  targetPosition: { x: number; y: number };
  memoryPositions: { x: number; y: number; angle: number }[];
  momentsByMemory: { [key: number]: Moment[] };
  memoryRotation: Animated.SharedValue<number>;
  momentRotation: Animated.SharedValue<number>;
  onComplete?: () => void;
  disappearSpeed?: number; // 0-10 scale
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
      momentIndexParam: number
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

      // Calculate translation needed from source to target
      const deltaX = targetXParam - momentX;
      const deltaY = targetYParam - momentY;

      // Animate from source position to target with smooth easing
      popupTranslateX.value = withTiming(deltaX, { duration: 1200, easing: Easing.out(Easing.cubic) });
      popupTranslateY.value = withTiming(deltaY, { duration: 1200, easing: Easing.out(Easing.cubic) });

      // Grow from small (0.126) to slightly larger (1.15) then settle to normal (1)
      popupScale.value = withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
      );

      // Keep opacity at 1 since we start visible
      popupOpacity.value = 1;
    };

    // Run on UI thread to access shared values - this prevents warnings
    runOnUI(calculateAndAnimate)(memAngle, memCount, targetX, targetY, momentIndexInMemory);

    // Calculate when animations complete (use the longest animation duration)
    const animationCompleteTime = 1400; // Scale + position animation (1200ms + 200ms settle)
    // Map disappearSpeed 0-10 to visible duration: 0 = 500ms (fastest disappear), 10 = 10000ms (slowest disappear, longest visible)
    // Default 2 = 2400ms
    // Higher slider value = slower disappear = longer visible time
    const fullyVisibleDuration = 500 + (disappearSpeed * 950);
    const delayBeforeShrink = animationCompleteTime + Math.max(500, Math.min(10000, fullyVisibleDuration));

    // Wait for the moment to be fully visible, then start shrinking after delay
    const timer = setTimeout(() => {
      'worklet';
      // Slowly shrink to zero (slower - 1200ms)
      popupScale.value = withTiming(0, { duration: 1200, easing: Easing.in(Easing.ease) });
      popupOpacity.value = withTiming(0, { duration: 1200, easing: Easing.in(Easing.ease) });

      if (onComplete) {
        setTimeout(onComplete, 1200); // Wait for shrink animation to complete
      }
    }, delayBeforeShrink); // Animation time + fully visible duration

    return () => clearTimeout(timer);
  }, [moment.id, disappearSpeed]);

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
  const [memoryRotationSpeed, setMemoryRotationSpeed] = React.useState(5); // 0-10 scale, default 5
  const [popupDisappearSpeed, setPopupDisappearSpeed] = React.useState(2); // 0-10 scale, default 2
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
    // Default 5 = 20000ms
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
    // Default 5 = 10000ms
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

  // Animation trigger - adds new moments continuously
  useEffect(() => {
    if (allMoments.length === 0) return;

    // Reset animation state when speeds change
    setActivePopups([]);
    nextMomentIndexRef.current = 0;
    popupKeyRef.current = 0;
    positionIndexRef.current = 0;

    // Add new moment every 1200ms for better visibility (slower)
    const timer = setInterval(() => {
      const nextMoment = allMoments[nextMomentIndexRef.current];
      if (nextMoment) {
        // Assign a fixed position index that cycles through 6 positions
        const positionIndex = positionIndexRef.current % 6;
        setActivePopups((prev) => [...prev, {
          moment: nextMoment,
          key: popupKeyRef.current++,
          positionIndex
        }]);
        nextMomentIndexRef.current = (nextMomentIndexRef.current + 1) % allMoments.length;
        positionIndexRef.current++;
      }
    }, 800); // Increased from 300ms to 800ms

    return () => clearInterval(timer);
  }, [allMoments, memoryRotationSpeed, popupDisappearSpeed]);

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
      
      // Reset rotation values to 0 and restart animations
      memoryRotation.value = 0;
      momentRotation.value = 0;
      
      // Restart rotation animations
      const memoryDuration = 40000 - (memoryRotationSpeed * 3500);
      memoryRotation.value = withRepeat(
        withTiming(360, {
          duration: Math.max(5000, Math.min(40000, memoryDuration)),
          easing: Easing.linear,
        }),
        -1,
        false
      );
      
      const momentDuration = 20000 - (memoryRotationSpeed * 1500);
      momentRotation.value = withRepeat(
        withTiming(360, {
          duration: Math.max(5000, Math.min(20000, momentDuration)),
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

      // Capture 40 frames over 8 seconds (5 fps)
      const frameCount = 40;
      const frameDuration = 200; // 200ms between frames = 5 fps
      const frames: string[] = [];

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

          // Wait before capturing next frame
          await new Promise(resolve => setTimeout(resolve, frameDuration));
        } catch (error) {
          console.error(`[GifAnimationPreview] Failed to capture frame ${i}:`, error);
        }
      }

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

      const videoPath = await createVideoFromFrames({
        framePaths: absoluteFramePaths,
        outputPath: outputPath, // Use original path with file:// if present
        fps: 5,
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
    } catch (error: any) {
      setIsCapturing(false);
      setCaptureProgress(0);

      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      Alert.alert(
        'Video Creation Failed',
        `Failed to create video: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, [entity.name, memoryRotation, momentRotation, memoryRotationSpeed]);

  // Handle cancellation
  const handleCancelCapture = React.useCallback(() => {
    cancelCaptureRef.current = true;
    setIsCapturing(false);
    setCaptureProgress(0);
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
          colors={[
            colorScheme === 'dark' ? '#0a0e1a' : '#1a1f2e',
            colorScheme === 'dark' ? '#1a2332' : '#2a3342',
            colorScheme === 'dark' ? '#0f1419' : '#1f242e',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Sparkled dots scattered around */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="dotGradient" cx="50%" cy="50%">
              <Stop offset="0%" stopColor="#64B5F6" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#64B5F6" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Generate random sparkled dots */}
          {Array.from({ length: 30 }).map((_, i) => {
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
      {memories.map((memory, index) => (
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
        />
      ))}

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
          />
        );
      })}

      </View>

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
        <Pressable
          onPress={() => {
            if (isCapturing) {
              // If video is being created, cancel it
              handleCancelCapture();
            } else {
              // Otherwise, just close the preview
              onClose();
            }
          }}
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
            {isCapturing ? 'Cancel' : 'Close'}
          </ThemedText>
        </Pressable>

        {!isCapturing && (
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
        )}

        {isCapturing && (
          <View
            style={{
              backgroundColor: colorScheme === 'dark' ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 24,
              minWidth: 140,
            }}
          >
            <ThemedText style={{ color: colorScheme === 'dark' ? '#fff' : '#000', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              {Math.round(captureProgress)}%
            </ThemedText>
          </View>
        )}
      </View>

      {/* Settings Panel - OUTSIDE capture view so they won't appear in video */}
      {!isCapturing && (
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
            </View>
          )}
        </View>
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
