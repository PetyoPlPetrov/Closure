import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { getSphereAccentColor } from "@/utils/sphere-styles";
import { useTranslate } from "@/utils/languages/use-translate";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Dimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  ForeignObject,
  G,
  Path,
  Stop,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLinearGradient =
  Animated.createAnimatedComponent(SvgLinearGradient);
const AnimatedView = Animated.View;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Wheel of Life Visualization Component
export function WheelOfLifeVisualization({
  distribution,
  quality,
  colors,
  colorScheme,
  fontScale,
  onSlicePress,
}: {
  distribution: {
    relationships: number;
    career: number;
    family: number;
    friends: number;
    hobbies: number;
  }; // Percentage of total moments
  quality: {
    relationships: number;
    career: number;
    family: number;
    friends: number;
    hobbies: number;
  }; // Sunny percentage for gradient
  colors: typeof Colors.dark;
  colorScheme: "light" | "dark" | null;
  fontScale: number;
  onSlicePress?: (sphere: LifeSphere) => void;
}) {
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  const size = Math.min(380 * fontScale, SCREEN_WIDTH - 40);
  const center = size / 2;
  const radius = size / 2 - 20;
  const gapAngle = 5; // Gap in degrees between slices

  // Normalize distribution percentages
  const totalDistribution =
    distribution.relationships +
    distribution.career +
    distribution.family +
    distribution.friends +
    distribution.hobbies;
  const hasNoData = totalDistribution === 0;
  const normalizedDist = {
    relationships:
      totalDistribution > 0
        ? (distribution.relationships / totalDistribution) * 100
        : 0,
    career:
      totalDistribution > 0
        ? (distribution.career / totalDistribution) * 100
        : 0,
    family:
      totalDistribution > 0
        ? (distribution.family / totalDistribution) * 100
        : 0,
    friends:
      totalDistribution > 0
        ? (distribution.friends / totalDistribution) * 100
        : 0,
    hobbies:
      totalDistribution > 0
        ? (distribution.hobbies / totalDistribution) * 100
        : 0,
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
    if (sweepAngle <= 0) return "";

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
  const friendsLabelPos = getLabelPosition(
    friendsStartAngle,
    friendsSweepAngle,
  );
  const hobbiesLabelPos = getLabelPosition(
    hobbiesStartAngle,
    hobbiesSweepAngle,
  );

  // Use the shared sphere accent palette so the wheel matches sferas everywhere.
  const relationshipsColor = getSphereAccentColor(
    "relationships",
    (colorScheme ?? "dark") as "light" | "dark",
  );
  const careerColor = getSphereAccentColor(
    "career",
    (colorScheme ?? "dark") as "light" | "dark",
  );
  const familyColor = getSphereAccentColor(
    "family",
    (colorScheme ?? "dark") as "light" | "dark",
  );
  const friendsColor = getSphereAccentColor(
    "friends",
    (colorScheme ?? "dark") as "light" | "dark",
  );
  const hobbiesColor = getSphereAccentColor(
    "hobbies",
    (colorScheme ?? "dark") as "light" | "dark",
  );

  // Sphere icons
  const sphereIcons = {
    relationships: "favorite",
    career: "work",
    family: "family-restroom",
    friends: "people",
    hobbies: "sports-esports",
  };

  // Icon size
  const iconSize = 24 * fontScale;

  // Pulsing animation state - randomly select which slice to pulse
  const [pulsingSlice, setPulsingSlice] = useState<LifeSphere>("relationships");
  const pulseScale = useSharedValue(1);
  const pulseRotation = useSharedValue(0);
  const gradientOffset = useSharedValue(-1);
  const glowPulse = useSharedValue(1);

  useEffect(() => {
    // Pulse duration: 1200ms grow + 1200ms shrink = 2400ms total
    // Pause duration: 5000ms
    // Total cycle: 2400ms + 5000ms = 7400ms per slice

    const spheres: LifeSphere[] = [
      "relationships",
      "career",
      "family",
      "friends",
      "hobbies",
    ];
    let currentIndex = 0;

    const runPulseAnimation = () => {
      // Start scale animation - one pulse cycle
      pulseScale.value = withSequence(
        withTiming(1.12, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      );

      // Start shake animation - subtle wiggle during pulse
      pulseRotation.value = withSequence(
        withTiming(1.5, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1.5, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
      );

      // Start gradient sweep animation - one sweep cycle
      gradientOffset.value = -1;
      gradientOffset.value = withTiming(2, {
        duration: 2400,
        easing: Easing.linear,
      });
    };

    // Start first animation immediately
    runPulseAnimation();

    // Start continuous glow pulsing animation
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // Schedule slice changes: wait for animation to complete (2400ms) + pause (5000ms)
    const interval = setInterval(() => {
      // Move to next slice
      currentIndex = (currentIndex + 1) % spheres.length;
      setPulsingSlice(spheres[currentIndex]);

      // Start new animation
      runPulseAnimation();
    }, 7400); // 2400ms animation + 5000ms pause

    return () => clearInterval(interval);
  }, [pulseScale, pulseRotation, gradientOffset, glowPulse]);

  // Helper to get gradient colors for pulsing effect
  const getGradientColor = (baseColor: string, isPulsing: boolean) => {
    if (!isPulsing) return baseColor;

    // Lighten the color for pulsing effect
    if (baseColor.startsWith("#")) {
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

  // Animated style for glow pulsing
  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.2 * glowPulse.value,
    shadowRadius: 15 * glowPulse.value,
  }));

  // Animated style for each slice group - for scale and rotation transform
  const relationshipsAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "relationships" ? pulseScale.value : 1 },
      {
        rotate: `${pulsingSlice === "relationships" ? pulseRotation.value : 0}deg`,
      },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const careerAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "career" ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === "career" ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const familyAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "family" ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === "family" ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const friendsAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "friends" ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === "friends" ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  const hobbiesAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "hobbies" ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === "hobbies" ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

  // Show empty state when there's no data
  if (hasNoData) {
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={
              colorScheme === "dark"
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)"
            }
            strokeWidth={2}
          />
        </Svg>
        <View
          style={{
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40 * fontScale,
          }}
        >
          <MaterialIcons
            name="insights"
            size={48 * fontScale}
            color={
              colorScheme === "dark"
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.3)"
            }
            style={{ marginBottom: 16 * fontScale }}
          />
          <ThemedText
            style={{
              fontSize: 16 * fontScale,
              fontWeight: "600",
              textAlign: "center",
              opacity: 0.7,
              color: colors.text,
            }}
          >
            {t("insights.wheelOfLife.emptyState")}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <AnimatedView
      style={[
        {
          width: size,
          height: size,
          shadowColor: momentColors.sunny.background,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 15,
          elevation: 8,
        },
        glowAnimatedStyle,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Static gradients for each slice, kept fully opaque so colors match sferas */}
          <SvgLinearGradient
            id="relationshipsStaticGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={relationshipsColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={relationshipsColor} stopOpacity="1" />
          </SvgLinearGradient>

          <SvgLinearGradient
            id="careerStaticGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={careerColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={careerColor} stopOpacity="1" />
          </SvgLinearGradient>

          <SvgLinearGradient
            id="familyStaticGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={familyColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={familyColor} stopOpacity="1" />
          </SvgLinearGradient>

          <SvgLinearGradient
            id="friendsStaticGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={friendsColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={friendsColor} stopOpacity="1" />
          </SvgLinearGradient>

          <SvgLinearGradient
            id="hobbiesStaticGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={hobbiesColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={hobbiesColor} stopOpacity="1" />
          </SvgLinearGradient>

          {/* Animated gradient for relationships slice */}
          <AnimatedLinearGradient
            id="relationshipsGradient"
            y1="0%"
            y2="0%"
            animatedProps={relationshipsGradientProps}
          >
            <Stop offset="0%" stopColor={relationshipsColor} stopOpacity="0" />
            <Stop
              offset="50%"
              stopColor="rgba(255,255,255,0.8)"
              stopOpacity="1"
            />
            <Stop
              offset="100%"
              stopColor={relationshipsColor}
              stopOpacity="0"
            />
          </AnimatedLinearGradient>

          {/* Animated gradient for career slice */}
          <AnimatedLinearGradient
            id="careerGradient"
            y1="0%"
            y2="0%"
            animatedProps={careerGradientProps}
          >
            <Stop offset="0%" stopColor={careerColor} stopOpacity="0" />
            <Stop
              offset="50%"
              stopColor="rgba(255,255,255,0.8)"
              stopOpacity="1"
            />
            <Stop offset="100%" stopColor={careerColor} stopOpacity="0" />
          </AnimatedLinearGradient>

          {/* Animated gradient for family slice */}
          <AnimatedLinearGradient
            id="familyGradient"
            y1="0%"
            y2="0%"
            animatedProps={familyGradientProps}
          >
            <Stop offset="0%" stopColor={familyColor} stopOpacity="0" />
            <Stop
              offset="50%"
              stopColor="rgba(255,255,255,0.8)"
              stopOpacity="1"
            />
            <Stop offset="100%" stopColor={familyColor} stopOpacity="0" />
          </AnimatedLinearGradient>

          {/* Animated gradient for friends slice */}
          <AnimatedLinearGradient
            id="friendsGradient"
            y1="0%"
            y2="0%"
            animatedProps={friendsGradientProps}
          >
            <Stop offset="0%" stopColor={friendsColor} stopOpacity="0" />
            <Stop
              offset="50%"
              stopColor="rgba(255,255,255,0.8)"
              stopOpacity="1"
            />
            <Stop offset="100%" stopColor={friendsColor} stopOpacity="0" />
          </AnimatedLinearGradient>

          {/* Animated gradient for hobbies slice */}
          <AnimatedLinearGradient
            id="hobbiesGradient"
            y1="0%"
            y2="0%"
            animatedProps={hobbiesGradientProps}
          >
            <Stop offset="0%" stopColor={hobbiesColor} stopOpacity="0" />
            <Stop
              offset="50%"
              stopColor="rgba(255,255,255,0.8)"
              stopOpacity="1"
            />
            <Stop offset="100%" stopColor={hobbiesColor} stopOpacity="0" />
          </AnimatedLinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={
            colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
          }
          strokeWidth={2}
        />

        {/* Relationships slice */}
        {relationshipsPath && (
          <AnimatedG
            onPress={() => onSlicePress?.("relationships")}
            animatedProps={relationshipsAnimatedStyle}
          >
            <Path
              d={relationshipsPath}
              fill="url(#relationshipsStaticGradient)"
            />
            {pulsingSlice === "relationships" && (
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
                  <View
                    style={{ alignItems: "center", justifyContent: "center" }}
                  >
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
          <AnimatedG
            onPress={() => onSlicePress?.("career")}
            animatedProps={careerAnimatedStyle}
          >
            <Path d={careerPath} fill="url(#careerStaticGradient)" />
            {pulsingSlice === "career" && (
              <Path d={careerPath} fill="url(#careerGradient)" opacity={0.9} />
            )}
            {careerSweepAngle > 5 && (
              <>
                <ForeignObject
                  x={careerLabelPos.x - iconSize / 2}
                  y={careerLabelPos.y - iconSize - 8}
                  width={iconSize}
                  height={iconSize}
                >
                  <View
                    style={{ alignItems: "center", justifyContent: "center" }}
                  >
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
          <AnimatedG
            onPress={() => onSlicePress?.("family")}
            animatedProps={familyAnimatedStyle}
          >
            <Path d={familyPath} fill="url(#familyStaticGradient)" />
            {pulsingSlice === "family" && (
              <Path d={familyPath} fill="url(#familyGradient)" opacity={0.9} />
            )}
            {familySweepAngle > 5 && (
              <>
                <ForeignObject
                  x={familyLabelPos.x - iconSize / 2}
                  y={familyLabelPos.y - iconSize - 8}
                  width={iconSize}
                  height={iconSize}
                >
                  <View
                    style={{ alignItems: "center", justifyContent: "center" }}
                  >
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
          <AnimatedG
            onPress={() => onSlicePress?.("friends")}
            animatedProps={friendsAnimatedStyle}
          >
            <Path d={friendsPath} fill="url(#friendsStaticGradient)" />
            {pulsingSlice === "friends" && (
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
                  <View
                    style={{ alignItems: "center", justifyContent: "center" }}
                  >
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
          <AnimatedG
            onPress={() => onSlicePress?.("hobbies")}
            animatedProps={hobbiesAnimatedStyle}
          >
            <Path d={hobbiesPath} fill="url(#hobbiesStaticGradient)" />
            {pulsingSlice === "hobbies" && (
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
                  <View
                    style={{ alignItems: "center", justifyContent: "center" }}
                  >
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
    </AnimatedView>
  );
}
