import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

interface Memory {
  id: string;
  title?: string;
  imageUri?: string;
  hardTruths?: { id: string; text: string; x?: number; y?: number }[];
  goodFacts?: { id: string; text: string; x?: number; y?: number }[];
  lessonsLearned?: { id: string; text: string; x?: number; y?: number }[];
}

interface MomentType {
  type: 'lesson' | 'sunny' | 'cloudy';
  icon: string;
  color: string;
  label: string;
}

interface EntityWheelOfLifeProps {
  entity: {
    id: string;
    name: string;
    imageUri?: string;
  };
  memories: Memory[];
  onClose: () => void;
  colors: typeof Colors.dark;
  colorScheme: 'light' | 'dark';
}

export function EntityWheelOfLife({
  entity,
  memories,
  onClose,
  colors,
  colorScheme,
}: EntityWheelOfLifeProps) {
  const { isTablet } = useLargeDevice();
  const fontScale = useFontScale();

  // Animation values
  const entranceProgress = useSharedValue(0);
  const spinRotation = useSharedValue(0);
  const selectedMomentScale = useSharedValue(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<{ type: 'lesson' | 'sunny' | 'cloudy'; text: string } | null>(null);

  // Sizes
  const avatarSize = isTablet ? 100 : 80;
  const memorySize = isTablet ? 50 : 40;
  const momentIconSize = isTablet ? 60 : 50;
  const orbitRadius = isTablet ? 180 : 140;

  // Moment types configuration
  const momentTypes: MomentType[] = [
    { type: 'lesson', icon: 'lightbulb', color: '#FFD700', label: 'Lesson' },
    { type: 'sunny', icon: 'wb-sunny', color: '#FFA726', label: 'Sunny' },
    { type: 'cloudy', icon: 'cloud', color: '#78909C', label: 'Cloudy' },
  ];

  // Collect all moments by type
  const momentsByType = useMemo(() => {
    const lessons: { id: string; text: string }[] = [];
    const sunny: { id: string; text: string }[] = [];
    const cloudy: { id: string; text: string }[] = [];

    memories.forEach((memory) => {
      if (memory.lessonsLearned) lessons.push(...memory.lessonsLearned);
      if (memory.goodFacts) sunny.push(...memory.goodFacts);
      if (memory.hardTruths) cloudy.push(...memory.hardTruths);
    });

    return { lesson: lessons, sunny, cloudy };
  }, [memories]);

  // Entrance animation
  useEffect(() => {
    entranceProgress.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
  }, [entranceProgress]);

  // Handle spin
  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setSelectedMoment(null);
    selectedMomentScale.value = 0;

    // Spin animation with multiple rotations
    const totalRotations = 3 + Math.random() * 2; // 3-5 full rotations
    spinRotation.value = withSequence(
      withTiming(totalRotations * 360, {
        duration: 2000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(totalRotations * 360, {
        duration: 0,
        easing: Easing.linear,
      })
    );

    // After spin completes, select random moment
    setTimeout(() => {
      // Randomly select a moment type that has moments
      const availableTypes = momentTypes.filter((mt) => momentsByType[mt.type].length > 0);
      if (availableTypes.length > 0) {
        const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const moments = momentsByType[randomType.type];
        const randomMomentObj = moments[Math.floor(Math.random() * moments.length)];

        setSelectedMoment({ type: randomType.type, text: randomMomentObj.text });
        selectedMomentScale.value = withSpring(1, {
          damping: 12,
          stiffness: 150,
        });
      }
      setIsSpinning(false);
    }, 2000);
  };

  // Avatar animated style - center and scale down
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const scale = 1 - entranceProgress.value * 0.3; // Scale down from 1 to 0.7
    return {
      position: 'absolute',
      left: SCREEN_WIDTH / 2 - avatarSize / 2,
      top: SCREEN_HEIGHT / 2 - avatarSize / 2 - 40,
      transform: [{ scale }],
      opacity: entranceProgress.value,
    };
  });

  // Memories orbit animated style
  const memoriesOrbitStyle = useAnimatedStyle(() => {
    const scale = entranceProgress.value; // Scale from 0 to 1
    return {
      position: 'absolute',
      left: SCREEN_WIDTH / 2 - orbitRadius,
      top: SCREEN_HEIGHT / 2 - orbitRadius - 40,
      transform: [{ rotate: `${spinRotation.value}deg` }, { scale }],
      opacity: entranceProgress.value,
    };
  });

  // Selected moment animated style
  const selectedMomentAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: selectedMomentScale.value }],
      opacity: selectedMomentScale.value,
    };
  });

  // Calculate progress for sunny percentage
  const sunnyPercentage = useMemo(() => {
    const total = momentsByType.lesson.length + momentsByType.sunny.length + momentsByType.cloudy.length;
    if (total === 0) return 0;
    return ((momentsByType.sunny.length + momentsByType.lesson.length) / total) * 100;
  }, [momentsByType]);

  // SVG progress circle parameters
  const borderWidth = 6;
  const radius = (avatarSize + borderWidth) / 2 - borderWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (sunnyPercentage / 100) * circumference;

  const initials = entity.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Semi-transparent backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={{ flex: 1 }} />
      </Pressable>

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose}>
        <MaterialIcons name="close" size={28 * fontScale} color={colors.text} />
      </Pressable>

      {/* Central avatar */}
      <AnimatedView
        style={[
          styles.avatarContainer,
          {
            width: avatarSize,
            height: avatarSize,
          },
          avatarAnimatedStyle,
        ]}
        pointerEvents="box-none"
      >
        <Svg width={avatarSize + borderWidth * 2} height={avatarSize + borderWidth * 2} style={styles.progressCircle}>
          <Defs>
            <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFA726" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFD700" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={(avatarSize + borderWidth * 2) / 2}
            cy={(avatarSize + borderWidth * 2) / 2}
            r={radius}
            stroke={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}
            strokeWidth={borderWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={(avatarSize + borderWidth * 2) / 2}
            cy={(avatarSize + borderWidth * 2) / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={borderWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${(avatarSize + borderWidth * 2) / 2}, ${(avatarSize + borderWidth * 2) / 2}`}
          />
        </Svg>

        {entity.imageUri ? (
          <Image source={{ uri: entity.imageUri }} style={[styles.avatar, { borderRadius: avatarSize / 2 }]} />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.primary,
                borderRadius: avatarSize / 2,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <ThemedText size="xl" weight="bold" style={{ color: '#fff' }}>
              {initials}
            </ThemedText>
          </View>
        )}
      </AnimatedView>

      {/* Memories in orbit */}
      <AnimatedView
        style={[
          styles.memoriesOrbit,
          {
            width: orbitRadius * 2,
            height: orbitRadius * 2,
          },
          memoriesOrbitStyle,
        ]}
        pointerEvents="box-none"
      >
        {memories.slice(0, 8).map((memory, index) => {
          const angle = (index / Math.min(memories.length, 8)) * 2 * Math.PI;
          const x = orbitRadius + Math.cos(angle) * orbitRadius - memorySize / 2;
          const y = orbitRadius + Math.sin(angle) * orbitRadius - memorySize / 2;

          return (
            <Animated.View
              key={memory.id}
              style={[
                styles.memoryIcon,
                {
                  width: memorySize,
                  height: memorySize,
                  borderRadius: memorySize / 2,
                  left: x,
                  top: y,
                },
              ]}
            >
              {memory.imageUri ? (
                <Image source={{ uri: memory.imageUri }} style={[styles.memoryImage, { borderRadius: memorySize / 2 }]} />
              ) : (
                <View style={[styles.memoryPlaceholder, { backgroundColor: colors.primary, borderRadius: memorySize / 2 }]}>
                  <MaterialIcons name="photo" size={memorySize * 0.5} color="#fff" />
                </View>
              )}
            </Animated.View>
          );
        })}
      </AnimatedView>

      {/* Moment type icons below avatar */}
      <View
        style={[
          styles.momentTypesContainer,
          {
            top: SCREEN_HEIGHT / 2 + 50,
          },
        ]}
      >
        {momentTypes.map((momentType, index) => {
          const count = momentsByType[momentType.type].length;
          const isDisabled = count === 0;

          return (
            <Pressable
              key={momentType.type}
              style={[
                styles.momentTypeButton,
                {
                  width: momentIconSize,
                  height: momentIconSize,
                  borderRadius: momentIconSize / 2,
                  opacity: isDisabled ? 0.3 : 1,
                },
              ]}
              onPress={handleSpin}
              disabled={isDisabled || isSpinning}
            >
              <MaterialIcons name={momentType.icon as any} size={momentIconSize * 0.5} color={momentType.color} />
              <ThemedText size="xs" style={{ marginTop: 4, color: momentType.color }}>
                {count}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Spin button */}
      <Pressable
        style={[
          styles.spinButton,
          {
            top: SCREEN_HEIGHT / 2 + 150,
            backgroundColor: colors.primary,
            opacity: isSpinning ? 0.5 : 1,
          },
        ]}
        onPress={handleSpin}
        disabled={isSpinning}
      >
        <MaterialIcons name="refresh" size={28 * fontScale} color="#fff" />
        <ThemedText size="sm" weight="semibold" style={{ marginLeft: 8, color: '#fff' }}>
          {isSpinning ? 'Spinning...' : 'Spin'}
        </ThemedText>
      </Pressable>

      {/* Selected moment display */}
      {selectedMoment && (
        <AnimatedView
          style={[
            styles.selectedMomentContainer,
            {
              top: SCREEN_HEIGHT / 2 + 220,
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            },
            selectedMomentAnimatedStyle,
          ]}
        >
          <View style={styles.selectedMomentHeader}>
            <MaterialIcons
              name={momentTypes.find((mt) => mt.type === selectedMoment.type)?.icon as any}
              size={24 * fontScale}
              color={momentTypes.find((mt) => mt.type === selectedMoment.type)?.color}
            />
            <ThemedText size="sm" weight="semibold" style={{ marginLeft: 8 }}>
              {momentTypes.find((mt) => mt.type === selectedMoment.type)?.label}
            </ThemedText>
          </View>
          <ThemedText size="sm" style={{ marginTop: 8, textAlign: 'center', opacity: 0.9 }}>
            {selectedMoment.text}
          </ThemedText>
        </AnimatedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1002,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  progressCircle: {
    position: 'absolute',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  memoriesOrbit: {
    zIndex: 1000,
  },
  memoryIcon: {
    position: 'absolute',
    overflow: 'hidden',
  },
  memoryImage: {
    width: '100%',
    height: '100%',
  },
  memoryPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentTypesContainer: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  spinButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  selectedMomentContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH - 60,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  selectedMomentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
