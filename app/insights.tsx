import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import type { LifeSphere } from '@/utils/JourneyProvider';
import { useJourney } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { useSubscription } from '@/utils/SubscriptionProvider';
import { showPaywallForPremiumAccess } from '@/utils/premium-access';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, ForeignObject, G, Path, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLinearGradient = Animated.createAnimatedComponent(SvgLinearGradient);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Wheel of Life Visualization Component
function WheelOfLifeVisualization({
  distribution,
  quality,
  colors,
  colorScheme,
  fontScale,
  onSlicePress,
}: {
  distribution: { relationships: number; career: number; family: number; friends: number; hobbies: number }; // Percentage of total moments
  quality: { relationships: number; career: number; family: number; friends: number; hobbies: number }; // Sunny percentage for gradient
  colors: typeof Colors.dark;
  colorScheme: 'light' | 'dark' | null;
  fontScale: number;
  onSlicePress?: (sphere: LifeSphere) => void;
}) {
  const size = Math.min(380 * fontScale, SCREEN_WIDTH - 40);
  const center = size / 2;
  const radius = size / 2 - 20;
  const gapAngle = 5; // Gap in degrees between slices

  // Normalize distribution percentages
  const totalDistribution = distribution.relationships + distribution.career + distribution.family + distribution.friends + distribution.hobbies;
  const hasNoData = totalDistribution === 0;
  const normalizedDist = {
    relationships: totalDistribution > 0 ? (distribution.relationships / totalDistribution) * 100 : 0,
    career: totalDistribution > 0 ? (distribution.career / totalDistribution) * 100 : 0,
    family: totalDistribution > 0 ? (distribution.family / totalDistribution) * 100 : 0,
    friends: totalDistribution > 0 ? (distribution.friends / totalDistribution) * 100 : 0,
    hobbies: totalDistribution > 0 ? (distribution.hobbies / totalDistribution) * 100 : 0,
  };

  // Calculate available angle (360 minus gaps between 5 slices)
  const totalGaps = gapAngle * 5; // 5 gaps between 5 slices
  const availableAngle = 360 - totalGaps;

  // Calculate pie slice angles (start from top, clockwise)
  let currentAngle = -90; // Start at top

  const relStartAngle = currentAngle;
  const relSweepAngle = (normalizedDist.relationships / 100) * availableAngle;
  currentAngle += relSweepAngle + gapAngle;

  const careerStartAngle = currentAngle;
  const careerSweepAngle = (normalizedDist.career / 100) * availableAngle;
  currentAngle += careerSweepAngle + gapAngle;

  const familyStartAngle = currentAngle;
  const familySweepAngle = (normalizedDist.family / 100) * availableAngle;
  currentAngle += familySweepAngle + gapAngle;

  const friendsStartAngle = currentAngle;
  const friendsSweepAngle = (normalizedDist.friends / 100) * availableAngle;
  currentAngle += friendsSweepAngle + gapAngle;

  const hobbiesStartAngle = currentAngle;
  const hobbiesSweepAngle = (normalizedDist.hobbies / 100) * availableAngle;

  // Helper function to create pie slice path (triangle from center)
  const createPieSlice = (startAngle: number, sweepAngle: number) => {
    if (sweepAngle <= 0) return '';

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;

    const x1 = center + Math.cos(startRad) * radius;
    const y1 = center + Math.sin(startRad) * radius;
    const x2 = center + Math.cos(endRad) * radius;
    const y2 = center + Math.sin(endRad) * radius;

    const largeArcFlag = sweepAngle > 180 ? 1 : 0;

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const relationshipsPath = createPieSlice(relStartAngle, relSweepAngle);
  const careerPath = createPieSlice(careerStartAngle, careerSweepAngle);
  const familyPath = createPieSlice(familyStartAngle, familySweepAngle);
  const friendsPath = createPieSlice(friendsStartAngle, friendsSweepAngle);
  const hobbiesPath = createPieSlice(hobbiesStartAngle, hobbiesSweepAngle);

  // Calculate label positions (middle of each slice)
  const getLabelPosition = (startAngle: number, sweepAngle: number) => {
    const midAngle = startAngle + sweepAngle / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius * 0.65; // Position label at 65% of radius
    return {
      x: center + Math.cos(midRad) * labelRadius,
      y: center + Math.sin(midRad) * labelRadius,
    };
  };

  const relLabelPos = getLabelPosition(relStartAngle, relSweepAngle);
  const careerLabelPos = getLabelPosition(careerStartAngle, careerSweepAngle);
  const familyLabelPos = getLabelPosition(familyStartAngle, familySweepAngle);
  const friendsLabelPos = getLabelPosition(friendsStartAngle, friendsSweepAngle);
  const hobbiesLabelPos = getLabelPosition(hobbiesStartAngle, hobbiesSweepAngle);

  // Get sphere-specific colors - theme-aware for proper contrast (matching spheres.tsx)
  const getSphereColor = (sphereType: 'relationships' | 'career' | 'family' | 'friends' | 'hobbies'): string => {
    if (colorScheme === 'light') {
      switch (sphereType) {
        case 'relationships':
          return '#D32F2F';
        case 'career':
          return '#1976D2';
        case 'family':
          return '#388E3C';
        case 'friends':
          return '#7B1FA2';
        case 'hobbies':
          return '#F57C00';
        default:
          return '#1976D2';
      }
    } else {
      switch (sphereType) {
        case 'relationships':
          return '#E57373';
        case 'career':
          return '#64B5F6';
        case 'family':
          return '#81C784';
        case 'friends':
          return '#BA68C8';
        case 'hobbies':
          return '#FFB74D';
        default:
          return '#64B5F6';
      }
    }
  };

  const relationshipsColor = getSphereColor('relationships');
  const careerColor = getSphereColor('career');
  const familyColor = getSphereColor('family');
  const friendsColor = getSphereColor('friends');
  const hobbiesColor = getSphereColor('hobbies');

  // Sphere icons
  const sphereIcons = {
    relationships: 'favorite',
    career: 'work',
    family: 'family-restroom',
    friends: 'people',
    hobbies: 'sports-esports',
  };

  // Icon size
  const iconSize = 24 * fontScale;

  // Pulsing animation state - randomly select which slice to pulse
  const [pulsingSlice, setPulsingSlice] = useState<LifeSphere>('relationships');
  const pulseScale = useSharedValue(1);
  const pulseRotation = useSharedValue(0);
  const gradientOffset = useSharedValue(-1);

  useEffect(() => {
    // Pulse duration: 1200ms grow + 1200ms shrink = 2400ms total
    // Pause duration: 5000ms
    // Total cycle: 2400ms + 5000ms = 7400ms per slice

    const spheres: LifeSphere[] = ['relationships', 'career', 'family', 'friends', 'hobbies'];
    let currentIndex = 0;

    const runPulseAnimation = () => {
      // Start scale animation - one pulse cycle
      pulseScale.value = withSequence(
        withTiming(1.12, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      );

      // Start shake animation - subtle wiggle during pulse
      pulseRotation.value = withSequence(
        withTiming(1.5, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1.5, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) })
      );

      // Start gradient sweep animation - one sweep cycle
      gradientOffset.value = -1;
      gradientOffset.value = withTiming(2, { duration: 2400, easing: Easing.linear });
    };

    // Start first animation immediately
    runPulseAnimation();

    // Schedule slice changes: wait for animation to complete (2400ms) + pause (5000ms)
    const interval = setInterval(() => {
      // Move to next slice
      currentIndex = (currentIndex + 1) % spheres.length;
      setPulsingSlice(spheres[currentIndex]);

      // Start new animation
      runPulseAnimation();
    }, 7400); // 2400ms animation + 5000ms pause

    return () => clearInterval(interval);
  }, [pulseScale, pulseRotation, gradientOffset]);

  // Helper to get gradient colors for pulsing effect
  const getGradientColor = (baseColor: string, isPulsing: boolean) => {
    if (!isPulsing) return baseColor;

    // Lighten the color for pulsing effect
    if (baseColor.startsWith('#')) {
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const b = parseInt(baseColor.slice(5, 7), 16);

      // Increase brightness by 20%
      const newR = Math.min(255, Math.floor(r * 1.2));
      const newG = Math.min(255, Math.floor(g * 1.2));
      const newB = Math.min(255, Math.floor(b * 1.2));

      return `rgb(${newR}, ${newG}, ${newB})`;
    }
    return baseColor;
  };

  // Animated props for gradient sweep
  const relationshipsGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));

  const careerGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));

  const familyGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));

  const friendsGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));

  const hobbiesGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));

  // Animated style for each slice group - for scale and rotation transform
  const relationshipsAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === 'relationships' ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === 'relationships' ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const careerAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === 'career' ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === 'career' ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const familyAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === 'family' ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === 'family' ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const friendsAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === 'friends' ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === 'friends' ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const hobbiesAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === 'hobbies' ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === 'hobbies' ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  // Show empty state when there's no data
  if (hasNoData) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth={2} />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 * fontScale }}>
          <MaterialIcons
            name="insights"
            size={48 * fontScale}
            color={colorScheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
            style={{ marginBottom: 16 * fontScale }}
          />
          <ThemedText
            style={{
              fontSize: 16 * fontScale,
              fontWeight: '600',
              textAlign: 'center',
              opacity: 0.7,
              color: colors.text,
            }}
          >
            Add memories and moments on other sferas to see data insights
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        {/* Subtle static gradients for each slice - radial from center */}
        <SvgLinearGradient id="relationshipsStaticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={relationshipsColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={relationshipsColor} stopOpacity="0.5" />
        </SvgLinearGradient>

        <SvgLinearGradient id="careerStaticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={careerColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={careerColor} stopOpacity="0.5" />
        </SvgLinearGradient>

        <SvgLinearGradient id="familyStaticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={familyColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={familyColor} stopOpacity="0.5" />
        </SvgLinearGradient>

        <SvgLinearGradient id="friendsStaticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={friendsColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={friendsColor} stopOpacity="0.5" />
        </SvgLinearGradient>

        <SvgLinearGradient id="hobbiesStaticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={hobbiesColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={hobbiesColor} stopOpacity="0.5" />
        </SvgLinearGradient>

        {/* Animated gradient for relationships slice */}
        <AnimatedLinearGradient id="relationshipsGradient" y1="0%" y2="0%" animatedProps={relationshipsGradientProps}>
          <Stop offset="0%" stopColor={relationshipsColor} stopOpacity="0" />
          <Stop offset="50%" stopColor="rgba(255,255,255,0.8)" stopOpacity="1" />
          <Stop offset="100%" stopColor={relationshipsColor} stopOpacity="0" />
        </AnimatedLinearGradient>

        {/* Animated gradient for career slice */}
        <AnimatedLinearGradient id="careerGradient" y1="0%" y2="0%" animatedProps={careerGradientProps}>
          <Stop offset="0%" stopColor={careerColor} stopOpacity="0" />
          <Stop offset="50%" stopColor="rgba(255,255,255,0.8)" stopOpacity="1" />
          <Stop offset="100%" stopColor={careerColor} stopOpacity="0" />
        </AnimatedLinearGradient>

        {/* Animated gradient for family slice */}
        <AnimatedLinearGradient id="familyGradient" y1="0%" y2="0%" animatedProps={familyGradientProps}>
          <Stop offset="0%" stopColor={familyColor} stopOpacity="0" />
          <Stop offset="50%" stopColor="rgba(255,255,255,0.8)" stopOpacity="1" />
          <Stop offset="100%" stopColor={familyColor} stopOpacity="0" />
        </AnimatedLinearGradient>

        {/* Animated gradient for friends slice */}
        <AnimatedLinearGradient id="friendsGradient" y1="0%" y2="0%" animatedProps={friendsGradientProps}>
          <Stop offset="0%" stopColor={friendsColor} stopOpacity="0" />
          <Stop offset="50%" stopColor="rgba(255,255,255,0.8)" stopOpacity="1" />
          <Stop offset="100%" stopColor={friendsColor} stopOpacity="0" />
        </AnimatedLinearGradient>

        {/* Animated gradient for hobbies slice */}
        <AnimatedLinearGradient id="hobbiesGradient" y1="0%" y2="0%" animatedProps={hobbiesGradientProps}>
          <Stop offset="0%" stopColor={hobbiesColor} stopOpacity="0" />
          <Stop offset="50%" stopColor="rgba(255,255,255,0.8)" stopOpacity="1" />
          <Stop offset="100%" stopColor={hobbiesColor} stopOpacity="0" />
        </AnimatedLinearGradient>
      </Defs>

      {/* Shadow/Elevation effect - multiple layers for depth */}
      <Circle
        cx={center + 3}
        cy={center + 3}
        r={radius}
        fill={colorScheme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)'}
        opacity={0.8}
      />
      <Circle
        cx={center + 2}
        cy={center + 2}
        r={radius}
        fill={colorScheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}
        opacity={0.6}
      />
      <Circle
        cx={center + 1}
        cy={center + 1}
        r={radius}
        fill={colorScheme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'}
        opacity={0.4}
      />

      {/* Background circle */}
      <Circle cx={center} cy={center} r={radius} fill="none" stroke={colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth={2} />

      {/* Relationships slice */}
      {relationshipsPath && (
        <AnimatedG onPress={() => onSlicePress?.('relationships')} animatedProps={relationshipsAnimatedStyle}>
          <Path
            d={relationshipsPath}
            fill="url(#relationshipsStaticGradient)"
          />
          {pulsingSlice === 'relationships' && (
            <Path
              d={relationshipsPath}
              fill="url(#relationshipsGradient)"
              opacity={0.9}
            />
          )}
          {relSweepAngle > 5 && (
            <>
              <ForeignObject
                x={relLabelPos.x - iconSize / 2}
                y={relLabelPos.y - iconSize - 8}
                width={iconSize}
                height={iconSize}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons
                    name={sphereIcons.relationships as any}
                    size={iconSize}
                    color={colors.text}
                  />
                </View>
              </ForeignObject>
              <SvgText
                x={relLabelPos.x}
                y={relLabelPos.y + 8}
                fontSize={14 * fontScale}
                fill={colors.text}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontWeight="bold"
              >
                {Math.round(normalizedDist.relationships)}%
              </SvgText>
            </>
          )}
        </AnimatedG>
      )}

      {/* Career slice */}
      {careerPath && (
        <AnimatedG onPress={() => onSlicePress?.('career')} animatedProps={careerAnimatedStyle}>
          <Path
            d={careerPath}
            fill="url(#careerStaticGradient)"
          />
          {pulsingSlice === 'career' && (
            <Path
              d={careerPath}
              fill="url(#careerGradient)"
              opacity={0.9}
            />
          )}
          {careerSweepAngle > 5 && (
            <>
              <ForeignObject
                x={careerLabelPos.x - iconSize / 2}
                y={careerLabelPos.y - iconSize - 8}
                width={iconSize}
                height={iconSize}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons
                    name={sphereIcons.career as any}
                    size={iconSize}
                    color={colors.text}
                  />
                </View>
              </ForeignObject>
              <SvgText
                x={careerLabelPos.x}
                y={careerLabelPos.y + 8}
                fontSize={14 * fontScale}
                fill={colors.text}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontWeight="bold"
              >
                {Math.round(normalizedDist.career)}%
              </SvgText>
            </>
          )}
        </AnimatedG>
      )}

      {/* Family slice */}
      {familyPath && (
        <AnimatedG onPress={() => onSlicePress?.('family')} animatedProps={familyAnimatedStyle}>
          <Path
            d={familyPath}
            fill="url(#familyStaticGradient)"
          />
          {pulsingSlice === 'family' && (
            <Path
              d={familyPath}
              fill="url(#familyGradient)"
              opacity={0.9}
            />
          )}
          {familySweepAngle > 5 && (
            <>
              <ForeignObject
                x={familyLabelPos.x - iconSize / 2}
                y={familyLabelPos.y - iconSize - 8}
                width={iconSize}
                height={iconSize}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons
                    name={sphereIcons.family as any}
                    size={iconSize}
                    color={colors.text}
                  />
                </View>
              </ForeignObject>
              <SvgText
                x={familyLabelPos.x}
                y={familyLabelPos.y + 8}
                fontSize={14 * fontScale}
                fill={colors.text}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontWeight="bold"
              >
                {Math.round(normalizedDist.family)}%
              </SvgText>
            </>
          )}
        </AnimatedG>
      )}

      {/* Friends slice */}
      {friendsPath && (
        <AnimatedG onPress={() => onSlicePress?.('friends')} animatedProps={friendsAnimatedStyle}>
          <Path
            d={friendsPath}
            fill="url(#friendsStaticGradient)"
          />
          {pulsingSlice === 'friends' && (
            <Path
              d={friendsPath}
              fill="url(#friendsGradient)"
              opacity={0.9}
            />
          )}
          {friendsSweepAngle > 5 && (
            <>
              <ForeignObject
                x={friendsLabelPos.x - iconSize / 2}
                y={friendsLabelPos.y - iconSize - 8}
                width={iconSize}
                height={iconSize}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons
                    name={sphereIcons.friends as any}
                    size={iconSize}
                    color={colors.text}
                  />
                </View>
              </ForeignObject>
              <SvgText
                x={friendsLabelPos.x}
                y={friendsLabelPos.y + 8}
                fontSize={14 * fontScale}
                fill={colors.text}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontWeight="bold"
              >
                {Math.round(normalizedDist.friends)}%
              </SvgText>
            </>
          )}
        </AnimatedG>
      )}

      {/* Hobbies slice */}
      {hobbiesPath && (
        <AnimatedG onPress={() => onSlicePress?.('hobbies')} animatedProps={hobbiesAnimatedStyle}>
          <Path
            d={hobbiesPath}
            fill="url(#hobbiesStaticGradient)"
          />
          {pulsingSlice === 'hobbies' && (
            <Path
              d={hobbiesPath}
              fill="url(#hobbiesGradient)"
              opacity={0.9}
            />
          )}
          {hobbiesSweepAngle > 5 && (
            <>
              <ForeignObject
                x={hobbiesLabelPos.x - iconSize / 2}
                y={hobbiesLabelPos.y - iconSize - 8}
                width={iconSize}
                height={iconSize}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons
                    name={sphereIcons.hobbies as any}
                    size={iconSize}
                    color={colors.text}
                  />
                </View>
              </ForeignObject>
              <SvgText
                x={hobbiesLabelPos.x}
                y={hobbiesLabelPos.y + 8}
                fontSize={14 * fontScale}
                fill={colors.text}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontWeight="bold"
              >
                {Math.round(normalizedDist.hobbies)}%
              </SvgText>
            </>
          )}
        </AnimatedG>
      )}
    </Svg>
  );
}

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { profiles, jobs, familyMembers, getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId } = useJourney();
  const { isSubscribed } = useSubscription();
  const t = useTranslate();

  // Temporary flag to hide the list view
  const HIDE_LIST_VIEW = true;

  // Handler for pie chart slice clicks - requires subscription
  const handleSlicePress = async (sphere: LifeSphere) => {
    const entities = getEntitiesBySphere(sphere);
    const hasEntities = entities.length > 0;

    if (!hasEntities) return;

    // Check subscription before navigating to comparison screens
    if (!isSubscribed) {
      // Show paywall (custom in dev, RevenueCat in prod)
      const subscribed = await showPaywallForPremiumAccess();
      if (!subscribed) return; // User cancelled or didn't subscribe
      // User subscribed, continue to navigation
    }

    // Log analytics event
    const { logInsightsSphereOpened } = require('@/utils/analytics');
    logInsightsSphereOpened(sphere).catch(() => {
      // Failed to log event
    });

    switch (sphere) {
      case 'relationships':
        router.push('/relationships-comparison');
        break;
      case 'career':
        router.push('/career-comparison');
        break;
      case 'family':
        router.push('/family-comparison');
        break;
      case 'friends':
        router.push('/friends-comparison');
        break;
      case 'hobbies':
        router.push('/hobbies-comparison');
        break;
    }
  };

  // Calculate sphere data: total moments (for distribution) and sunny percentage (for quality)
  const sphereData = useMemo(() => {
    const calculateSphereData = (sphereType: LifeSphere) => {
      const entities = getEntitiesBySphere(sphereType);
      if (entities.length === 0) return { totalMoments: 0, sunnyPercentage: 0 };

      let totalClouds = 0;
      let totalSuns = 0;

      entities.forEach((entity) => {
        const memories = sphereType === 'relationships' && 'id' in entity
          ? getIdealizedMemoriesByProfileId(entity.id)
          : getIdealizedMemoriesByEntityId(entity.id, sphereType);

        memories.forEach((memory) => {
          totalClouds += (memory.hardTruths || []).length;
          totalSuns += (memory.goodFacts || []).length;
        });
      });

      const totalMoments = totalClouds + totalSuns;
      const sunnyPercentage = totalMoments > 0 
        ? (totalSuns / totalMoments) * 100 
        : 0;

      return {
        totalMoments,
        sunnyPercentage: Math.max(0, Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage)),
      };
    };

    return {
      relationships: calculateSphereData('relationships'),
      career: calculateSphereData('career'),
      family: calculateSphereData('family'),
      friends: calculateSphereData('friends'),
      hobbies: calculateSphereData('hobbies'),
    };
  }, [getEntitiesBySphere, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId]);

  // Calculate distribution percentages (for segment sizes)
  const sphereDistribution = useMemo(() => {
    const totalAllMoments = sphereData.relationships.totalMoments +
                           sphereData.career.totalMoments +
                           sphereData.family.totalMoments +
                           sphereData.friends.totalMoments +
                           sphereData.hobbies.totalMoments;

    if (totalAllMoments === 0) {
      return {
        relationships: 0,
        career: 0,
        family: 0,
        friends: 0,
        hobbies: 0,
      };
    }

    return {
      relationships: (sphereData.relationships.totalMoments / totalAllMoments) * 100,
      career: (sphereData.career.totalMoments / totalAllMoments) * 100,
      family: (sphereData.family.totalMoments / totalAllMoments) * 100,
      friends: (sphereData.friends.totalMoments / totalAllMoments) * 100,
      hobbies: (sphereData.hobbies.totalMoments / totalAllMoments) * 100,
    };
  }, [sphereData]);

  // Keep sphereScores for insights (sunny percentage)
  const sphereScores = useMemo(() => ({
    relationships: sphereData.relationships.sunnyPercentage,
    career: sphereData.career.sunnyPercentage,
    family: sphereData.family.sunnyPercentage,
    friends: sphereData.friends.sunnyPercentage,
    hobbies: sphereData.hobbies.sunnyPercentage,
  }), [sphereData]);

  const spheres: { type: LifeSphere; icon: string; label: string; entities: any[] }[] = useMemo(() => {
    const allSpheres = [
      {
        type: 'relationships' as LifeSphere,
        icon: 'favorite',
        label: t('spheres.relationships'),
        entities: getEntitiesBySphere('relationships'),
      },
      {
        type: 'career' as LifeSphere,
        icon: 'work',
        label: t('spheres.career'),
        entities: getEntitiesBySphere('career'),
      },
      {
        type: 'family' as LifeSphere,
        icon: 'family-restroom',
        label: t('spheres.family'),
        entities: getEntitiesBySphere('family'),
      },
      {
        type: 'friends' as LifeSphere,
        icon: 'people',
        label: t('spheres.friends'),
        entities: getEntitiesBySphere('friends'),
      },
      {
        type: 'hobbies' as LifeSphere,
        icon: 'sports-esports',
        label: t('spheres.hobbies'),
        entities: getEntitiesBySphere('hobbies'),
      },
    ];
    
    // Filter out spheres that have no memories/moments
    return allSpheres.filter(sphere => {
      const data = sphereData[sphere.type];
      return data.totalMoments > 0;
    });
  }, [getEntitiesBySphere, t, sphereData]);

  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16 * fontScale,
      paddingTop: 20 * fontScale,
      paddingBottom: 8 * fontScale,
      marginTop: 50,
    },
    headerButton: {
      width: 48 * fontScale,
      height: 48 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 16 * fontScale,
      gap: 24 * fontScale,
    },
    wheelContainer: {
      marginBottom: 32 * fontScale,
      padding: 20 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
    },
    wheelTitle: {
      textAlign: 'center',
      marginBottom: 8 * fontScale,
    },
    wheelSubtitle: {
      textAlign: 'center',
      opacity: 0.95,
      marginBottom: 24 * fontScale,
    },
    wheelWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 20 * fontScale,
    },
    distributionExplanation: {
      marginTop: 16 * fontScale,
      marginBottom: 8 * fontScale,
      paddingHorizontal: 20 * fontScale,
      paddingVertical: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 8 * fontScale,
    },
    distributionExplanationText: {
      opacity: 0.9,
      lineHeight: 18 * fontScale,
      textAlign: 'center',
    },
    scoresContainer: {
      marginTop: 24 * fontScale,
      gap: 16 * fontScale,
    },
    scoreItem: {
      marginBottom: 12 * fontScale,
      borderRadius: 12 * fontScale,
      padding: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.03)' 
        : 'rgba(0, 0, 0, 0.03)',
    },
    scoreRowTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12 * fontScale,
      marginBottom: 8 * fontScale,
    },
    scoreLabel: {
      flex: 1,
    },
    scoreValue: {
      minWidth: 50 * fontScale,
      textAlign: 'right',
    },
    scoreBarContainer: {
      height: 6 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 3 * fontScale,
      overflow: 'hidden',
    },
    scoreBar: {
      height: '100%',
      borderRadius: 3 * fontScale,
    },
    percentageExplanation: {
      marginTop: 16 * fontScale,
      marginBottom: 8 * fontScale,
      paddingHorizontal: 20 * fontScale,
      paddingVertical: 12 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 8 * fontScale,
    },
    percentageExplanationText: {
      opacity: 0.7,
      lineHeight: 18 * fontScale,
      textAlign: 'center',
    },
  }), [fontScale, colorScheme, colors]);

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24 * fontScale} color={colors.text} />
        </TouchableOpacity>
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
          {t('insights.wheelOfLife.title')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 * fontScale }}
        showsVerticalScrollIndicator={false}
      >
        {/* Wheel of Life Visualization */}
        <View style={styles.wheelContainer}>
          <ThemedText size="sm" style={styles.wheelSubtitle}>
            {t('insights.wheelOfLife.subtitle')}
          </ThemedText>

          <View style={styles.wheelWrapper}>
            <WheelOfLifeVisualization
              distribution={sphereDistribution}
              quality={sphereScores}
              colors={colors}
              colorScheme={colorScheme}
              fontScale={fontScale}
              onSlicePress={handleSlicePress}
            />
          </View>

          {/* Distribution Explanation */}
          <View style={styles.distributionExplanation}>
            <ThemedText size="xs" style={styles.distributionExplanationText}>
              {t('insights.wheelOfLife.distributionExplanation')}
            </ThemedText>
          </View>

          {/* Sphere Scores - temporarily hidden */}
          {!HIDE_LIST_VIEW && <View style={styles.scoresContainer}>
            {spheres.map((sphere) => {
              const score = sphereScores[sphere.type];
              // Get sphere-specific colors - theme-aware for proper contrast (matching spheres.tsx)
              const getSphereColor = (sphereType: LifeSphere): string => {
                const scheme: 'light' | 'dark' = (colorScheme ?? 'dark') as 'light' | 'dark';
                if (scheme === 'light') {
                  switch (sphereType) {
                    case 'relationships':
                      return '#D32F2F';
                    case 'career':
                      return '#1976D2';
                    case 'family':
                      return '#388E3C';
                    case 'friends':
                      return '#7B1FA2';
                    case 'hobbies':
                      return '#F57C00';
                    default:
                      return '#1976D2';
                  }
                } else {
                  switch (sphereType) {
                    case 'relationships':
                      return '#E57373';
                    case 'career':
                      return '#64B5F6';
                    case 'family':
                      return '#81C784';
                    case 'friends':
                      return '#BA68C8';
                    case 'hobbies':
                      return '#FFB74D';
                    default:
                      return '#64B5F6';
                  }
                }
              };
              const sphereColor = getSphereColor(sphere.type);
              
              const hasEntities = sphere.entities.length > 0;
              const isClickable = (sphere.type === 'relationships' || sphere.type === 'career' || sphere.type === 'family' || sphere.type === 'friends' || sphere.type === 'hobbies') && hasEntities;
              
              return (
                <TouchableOpacity
                  key={sphere.type}
                  style={styles.scoreItem}
                  onPress={async () => {
                    if (!hasEntities) return;

                    // Check subscription before navigating to comparison screens
                    if (!isSubscribed) {
                      // Show paywall (custom in dev, RevenueCat in prod)
                      const subscribed = await showPaywallForPremiumAccess();
                      if (!subscribed) return; // User cancelled or didn't subscribe
                      // User subscribed, continue to navigation
                    }

                    if (sphere.type === 'relationships') {
                      router.push('/relationships-comparison');
                    } else if (sphere.type === 'career') {
                      router.push('/career-comparison');
                    } else if (sphere.type === 'family') {
                      router.push('/family-comparison');
                    } else if (sphere.type === 'friends') {
                      router.push('/friends-comparison');
                    } else if (sphere.type === 'hobbies') {
                      router.push('/hobbies-comparison');
                    }
                  }}
                  activeOpacity={isClickable ? 0.7 : 1}
                  disabled={!isClickable}
                >
                  <View style={styles.scoreRowTouchable}>
                    <MaterialIcons
                      name={sphere.icon as any}
                      size={20 * fontScale}
                      color={sphereColor}
                    />
                    <ThemedText size="sm" weight="semibold" style={styles.scoreLabel}>
                      {sphere.label}
                    </ThemedText>
                    <MaterialIcons
                      name={isClickable ? 'arrow-forward' : 'expand-more'}
                      size={24 * fontScale}
                      color={colors.icon}
                    />
                  </View>
                  <View style={styles.scoreBarContainer}>
                    <View style={[styles.scoreBar, { width: `${score}%`, backgroundColor: sphereColor }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>}

          {/* Percentage Explanation */}
          {!HIDE_LIST_VIEW && <View style={styles.percentageExplanation}>
            <ThemedText size="xs" style={styles.percentageExplanationText}>
              {t('insights.wheelOfLife.percentageExplanation')}
            </ThemedText>
          </View>}
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}

