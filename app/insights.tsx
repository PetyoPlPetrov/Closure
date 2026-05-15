import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useJourney } from "@/utils/JourneyProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import {
  useMomentColors,
  type MomentColors,
} from "@/utils/MomentColorsProvider";
import { showPaywallForAnySubscriptionAccess } from "@/utils/premium-access";
import { useSubscription } from "@/utils/SubscriptionProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
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
import { WheelOfLifeVisualization } from "@/components/wheel-of-life-visualization";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLinearGradient =
  Animated.createAnimatedComponent(SvgLinearGradient);

type MomentKind = "sunny" | "cloudy" | "lessons";

function MomentTypesPieVisualization({
  distribution,
  colors,
  colorScheme,
  fontScale,
  momentColors,
  animationTrigger,
  onSlicePress,
}: {
  distribution: { sunny: number; cloudy: number; lessons: number };
  colors: typeof Colors.dark;
  colorScheme: "light" | "dark" | null;
  fontScale: number;
  momentColors: MomentColors;
  animationTrigger: number;
  onSlicePress?: (kind: MomentKind) => void;
}) {
  const size = Math.min(380 * fontScale, SCREEN_WIDTH - 40);
  const center = size / 2;
  const radius = size / 2 - 20;
  const gapAngle = 5;
  const total =
    distribution.sunny + distribution.cloudy + distribution.lessons;
  const hasNoData = total === 0;

  const normalized = {
    sunny: total > 0 ? (distribution.sunny / total) * 100 : 0,
    cloudy: total > 0 ? (distribution.cloudy / total) * 100 : 0,
    lessons: total > 0 ? (distribution.lessons / total) * 100 : 0,
  };

  const totalGaps = gapAngle * 3;
  const availableAngle = 360 - totalGaps;

  let currentAngle = -90;
  const sunnyStart = currentAngle;
  const sunnySweep = (normalized.sunny / 100) * availableAngle;
  currentAngle += sunnySweep + gapAngle;
  const cloudyStart = currentAngle;
  const cloudySweep = (normalized.cloudy / 100) * availableAngle;
  currentAngle += cloudySweep + gapAngle;
  const lessonsStart = currentAngle;
  const lessonsSweep = (normalized.lessons / 100) * availableAngle;

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

  const sunnyPath = createPieSlice(sunnyStart, sunnySweep);
  const cloudyPath = createPieSlice(cloudyStart, cloudySweep);
  const lessonsPath = createPieSlice(lessonsStart, lessonsSweep);

  const getLabelPosition = (startAngle: number, sweepAngle: number) => {
    const midAngle = startAngle + sweepAngle / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius * 0.65;
    return {
      x: center + Math.cos(midRad) * labelRadius,
      y: center + Math.sin(midRad) * labelRadius,
    };
  };

  const sunnyLabel = getLabelPosition(sunnyStart, sunnySweep);
  const cloudyLabel = getLabelPosition(cloudyStart, cloudySweep);
  const lessonsLabel = getLabelPosition(lessonsStart, lessonsSweep);
  const iconSize = 24 * fontScale;

  const iconFor: Record<MomentKind, string> = {
    sunny: "wb-sunny",
    cloudy: "cloud",
    lessons: "lightbulb",
  };

  const [pulsingSlice, setPulsingSlice] = useState<MomentKind>("sunny");
  const pulseScale = useSharedValue(1);
  const pulseRotation = useSharedValue(0);
  const gradientOffset = useSharedValue(-1);

  useEffect(() => {
    if (hasNoData) return;

    const slices: MomentKind[] = ["sunny", "cloudy", "lessons"];
    let currentIndex = 0;

    const runPulseAnimation = () => {
      pulseScale.value = withSequence(
        withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      );
      pulseRotation.value = withSequence(
        withTiming(1.5, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1.5, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
      );
      gradientOffset.value = -1;
      gradientOffset.value = withTiming(2, {
        duration: 2400,
        easing: Easing.linear,
      });
    };

    setPulsingSlice(slices[currentIndex]);
    runPulseAnimation();

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % slices.length;
      setPulsingSlice(slices[currentIndex]);
      runPulseAnimation();
    }, 7400);

    return () => clearInterval(interval);
  }, [animationTrigger, gradientOffset, hasNoData, pulseRotation, pulseScale]);

  const sunnyGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));
  const cloudyGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));
  const lessonGradientProps = useAnimatedProps(() => ({
    x1: `${(gradientOffset.value - 0.3) * 100}%`,
    x2: `${(gradientOffset.value + 0.3) * 100}%`,
  }));
  const sunnyAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "sunny" ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === "sunny" ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));
  const cloudyAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "cloudy" ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === "cloudy" ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));
  const lessonAnimatedStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: center },
      { translateY: center },
      { scale: pulsingSlice === "lessons" ? pulseScale.value : 1 },
      { rotate: `${pulsingSlice === "lessons" ? pulseRotation.value : 0}deg` },
      { translateX: -center },
      { translateY: -center },
    ],
  }));

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
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="sunnyMomentSlice" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={momentColors.sunny.background} stopOpacity="1" />
            <Stop offset="100%" stopColor={momentColors.sunny.background} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="cloudyMomentSlice" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={momentColors.cloudy.background} stopOpacity="1" />
            <Stop offset="100%" stopColor={momentColors.cloudy.background} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="lessonMomentSlice" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={momentColors.lesson.background} stopOpacity="1" />
            <Stop offset="100%" stopColor={momentColors.lesson.background} stopOpacity="1" />
          </SvgLinearGradient>

          <AnimatedLinearGradient
            id="sunnyMomentLaser"
            y1="0%"
            y2="0%"
            animatedProps={sunnyGradientProps}
          >
            <Stop offset="0%" stopColor={momentColors.sunny.background} stopOpacity="0" />
            <Stop offset="50%" stopColor="rgba(255,255,255,0.85)" stopOpacity="1" />
            <Stop offset="100%" stopColor={momentColors.sunny.background} stopOpacity="0" />
          </AnimatedLinearGradient>
          <AnimatedLinearGradient
            id="cloudyMomentLaser"
            y1="0%"
            y2="0%"
            animatedProps={cloudyGradientProps}
          >
            <Stop offset="0%" stopColor={momentColors.cloudy.background} stopOpacity="0" />
            <Stop offset="50%" stopColor="rgba(255,255,255,0.85)" stopOpacity="1" />
            <Stop offset="100%" stopColor={momentColors.cloudy.background} stopOpacity="0" />
          </AnimatedLinearGradient>
          <AnimatedLinearGradient
            id="lessonMomentLaser"
            y1="0%"
            y2="0%"
            animatedProps={lessonGradientProps}
          >
            <Stop offset="0%" stopColor={momentColors.lesson.background} stopOpacity="0" />
            <Stop offset="50%" stopColor="rgba(255,255,255,0.85)" stopOpacity="1" />
            <Stop offset="100%" stopColor={momentColors.lesson.background} stopOpacity="0" />
          </AnimatedLinearGradient>
        </Defs>

        {sunnyPath ? (
          <AnimatedG onPress={() => onSlicePress?.("sunny")} animatedProps={sunnyAnimatedStyle}>
            <Path d={sunnyPath} fill="url(#sunnyMomentSlice)" />
            {pulsingSlice === "sunny" && (
              <Path d={sunnyPath} fill="url(#sunnyMomentLaser)" opacity={0.9} />
            )}
            {sunnySweep > 8 && (
              <>
                <ForeignObject
                  x={sunnyLabel.x - iconSize / 2}
                  y={sunnyLabel.y - iconSize - 8}
                  width={iconSize}
                  height={iconSize}
                >
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons
                      name={iconFor.sunny}
                      size={iconSize}
                      color={momentColors.sunny.text}
                    />
                  </View>
                </ForeignObject>
                <SvgText
                  x={sunnyLabel.x}
                  y={sunnyLabel.y + 8}
                  fontSize={14 * fontScale}
                  fill={momentColors.sunny.text}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontWeight="bold"
                >
                  {Math.round(normalized.sunny)}%
                </SvgText>
              </>
            )}
          </AnimatedG>
        ) : null}

        {cloudyPath ? (
          <AnimatedG onPress={() => onSlicePress?.("cloudy")} animatedProps={cloudyAnimatedStyle}>
            <Path d={cloudyPath} fill="url(#cloudyMomentSlice)" />
            {pulsingSlice === "cloudy" && (
              <Path d={cloudyPath} fill="url(#cloudyMomentLaser)" opacity={0.9} />
            )}
            {cloudySweep > 8 && (
              <>
                <ForeignObject
                  x={cloudyLabel.x - iconSize / 2}
                  y={cloudyLabel.y - iconSize - 8}
                  width={iconSize}
                  height={iconSize}
                >
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons
                      name={iconFor.cloudy}
                      size={iconSize}
                      color={momentColors.cloudy.text}
                    />
                  </View>
                </ForeignObject>
                <SvgText
                  x={cloudyLabel.x}
                  y={cloudyLabel.y + 8}
                  fontSize={14 * fontScale}
                  fill={momentColors.cloudy.text}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontWeight="bold"
                >
                  {Math.round(normalized.cloudy)}%
                </SvgText>
              </>
            )}
          </AnimatedG>
        ) : null}

        {lessonsPath ? (
          <AnimatedG onPress={() => onSlicePress?.("lessons")} animatedProps={lessonAnimatedStyle}>
            <Path d={lessonsPath} fill="url(#lessonMomentSlice)" />
            {pulsingSlice === "lessons" && (
              <Path d={lessonsPath} fill="url(#lessonMomentLaser)" opacity={0.9} />
            )}
            {lessonsSweep > 8 && (
              <>
                <ForeignObject
                  x={lessonsLabel.x - iconSize / 2}
                  y={lessonsLabel.y - iconSize - 8}
                  width={iconSize}
                  height={iconSize}
                >
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons
                      name={iconFor.lessons}
                      size={iconSize}
                      color={momentColors.lesson.text}
                    />
                  </View>
                </ForeignObject>
                <SvgText
                  x={lessonsLabel.x}
                  y={lessonsLabel.y + 8}
                  fontSize={14 * fontScale}
                  fill={momentColors.lesson.text}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontWeight="bold"
                >
                  {Math.round(normalized.lessons)}%
                </SvgText>
              </>
            )}
          </AnimatedG>
        ) : null}
      </Svg>
    </View>
  );
}

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const {
    profiles,
    jobs,
    familyMembers,
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  } = useJourney();
  const { ensureSubscriptionResolved } = useSubscription();
  const t = useTranslate();
  const { momentColors } = useMomentColors();
  const [insightsMode, setInsightsMode] = useState<"sferas" | "moments">("moments");
  const [momentChartAnimationTrigger, setMomentChartAnimationTrigger] = useState(0);
  const chartModeTransition = useSharedValue(0);
  const chartSize = Math.min(380 * fontScale, SCREEN_WIDTH - 40);

  // Temporary flag to hide the list view
  const HIDE_LIST_VIEW = true;

  // Handler for pie chart slice clicks - requires subscription
  const handleSlicePress = useCallback(
    async (sphere: LifeSphere) => {
      const entities = getEntitiesBySphere(sphere);
      const hasEntities = entities.length > 0;

      if (!hasEntities) return;

      if (!__DEV__) {
        const { hasEntityLimitEntitlement } = await ensureSubscriptionResolved();
        if (!hasEntityLimitEntitlement) {
          const subscribed = await showPaywallForAnySubscriptionAccess();
          if (!subscribed) return;
        }
      }

      const { logInsightsSphereOpened } = require("@/utils/analytics");
      logInsightsSphereOpened(sphere).catch(() => {
        // Failed to log event
      });

      switch (sphere) {
        case "relationships":
          router.push("/relationships-comparison");
          break;
        case "career":
          router.push("/career-comparison");
          break;
        case "family":
          router.push("/family-comparison");
          break;
        case "friends":
          router.push("/friends-comparison");
          break;
        case "hobbies":
          router.push("/hobbies-comparison");
          break;
      }
    },
    [getEntitiesBySphere, ensureSubscriptionResolved],
  );

  /** Switch chart views freely; subscription applies when opening a slice (comparison). */
  const handleInsightsModeToggle = useCallback(() => {
    setInsightsMode((m) => {
      const next = m === "sferas" ? "moments" : "sferas";
      if (next === "moments") {
        // Each time we enter the moments view, bump a trigger so the
        // pie chart restarts its laser + growth animation immediately.
        setMomentChartAnimationTrigger((v) => v + 1);
      }
      return next;
    });
  }, []);

  // Also fire once on initial mount if we start in "moments" (future‑proofing).
  useEffect(() => {
    if (insightsMode === "moments") {
      setMomentChartAnimationTrigger((v) => v + 1);
    }
  }, [insightsMode]);

  useEffect(() => {
    chartModeTransition.value = withTiming(insightsMode === "moments" ? 1 : 0, {
      duration: 700,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [insightsMode, chartModeTransition]);

  const sferasChartAnimatedStyle = useAnimatedStyle(() => {
    const modeFade = interpolate(
      chartModeTransition.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: modeFade,
      transform: [
        {
          scale: interpolate(
            chartModeTransition.value,
            [0, 1],
            [1, 0.975],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });
  const momentsChartAnimatedStyle = useAnimatedStyle(() => {
    const modeFade = interpolate(
      chartModeTransition.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: modeFade,
      transform: [
        {
          scale: interpolate(
            chartModeTransition.value,
            [0, 1],
            [0.965, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const momentTotals = useMemo(() => {
    const spheres: LifeSphere[] = [
      "relationships",
      "career",
      "family",
      "friends",
      "hobbies",
    ];
    let sunny = 0;
    let cloudy = 0;
    let lessons = 0;

    for (const sphere of spheres) {
      const entities = getEntitiesBySphere(sphere);
      for (const entity of entities) {
        const memories =
          sphere === "relationships" && "id" in entity
            ? getIdealizedMemoriesByProfileId(entity.id)
            : getIdealizedMemoriesByEntityId(entity.id, sphere);
        for (const memory of memories) {
          sunny += memory.goodFacts?.length ?? 0;
          cloudy += memory.hardTruths?.length ?? 0;
          lessons += memory.lessonsLearned?.length ?? 0;
        }
      }
    }

    return { sunny, cloudy, lessons };
  }, [
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  ]);

  const handleMomentKindPress = useCallback(
    async (kind: MomentKind) => {
      if (!__DEV__) {
        const { hasEntityLimitEntitlement } = await ensureSubscriptionResolved();
        if (!hasEntityLimitEntitlement) {
          const subscribed = await showPaywallForAnySubscriptionAccess();
          if (!subscribed) return;
        }
      }
      router.push({
        pathname: "/insights-moment-distribution",
        params: { type: kind },
      });
    },
    [ensureSubscriptionResolved],
  );

  // Calculate sphere data: total moments (for distribution) and sunny percentage (for quality)
  // IMPORTANT: Only count entities that actually have memories
  const sphereData = useMemo(() => {
    const calculateSphereData = (sphereType: LifeSphere) => {
      const entities = getEntitiesBySphere(sphereType);
      if (entities.length === 0) return { totalMoments: 0, sunnyPercentage: 0, entitiesWithMemories: 0 };

      let totalClouds = 0;
      let totalSuns = 0;
      let entitiesWithMemories = 0;

      entities.forEach((entity) => {
        const memories =
          sphereType === "relationships" && "id" in entity
            ? getIdealizedMemoriesByProfileId(entity.id)
            : getIdealizedMemoriesByEntityId(entity.id, sphereType);

        let entityMoments = 0;
        memories.forEach((memory) => {
          const clouds = (memory.hardTruths || []).length;
          const suns = (memory.goodFacts || []).length;
          totalClouds += clouds;
          totalSuns += suns;
          entityMoments += clouds + suns;
        });

        // Only count this entity if it has at least one moment
        if (entityMoments > 0) {
          entitiesWithMemories++;
        }
      });

      const totalMoments = totalClouds + totalSuns;
      const sunnyPercentage =
        totalMoments > 0 ? (totalSuns / totalMoments) * 100 : 0;

      return {
        totalMoments,
        sunnyPercentage: Math.max(
          0,
          Math.min(100, isNaN(sunnyPercentage) ? 0 : sunnyPercentage),
        ),
        entitiesWithMemories,
      };
    };

    return {
      relationships: calculateSphereData("relationships"),
      career: calculateSphereData("career"),
      family: calculateSphereData("family"),
      friends: calculateSphereData("friends"),
      hobbies: calculateSphereData("hobbies"),
    };
  }, [
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  ]);

  // Calculate distribution percentages (for segment sizes)
  const sphereDistribution = useMemo(() => {
    const totalAllMoments =
      sphereData.relationships.totalMoments +
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
      relationships:
        (sphereData.relationships.totalMoments / totalAllMoments) * 100,
      career: (sphereData.career.totalMoments / totalAllMoments) * 100,
      family: (sphereData.family.totalMoments / totalAllMoments) * 100,
      friends: (sphereData.friends.totalMoments / totalAllMoments) * 100,
      hobbies: (sphereData.hobbies.totalMoments / totalAllMoments) * 100,
    };
  }, [sphereData]);

  // Keep sphereScores for insights (sunny percentage)
  const sphereScores = useMemo(
    () => ({
      relationships: sphereData.relationships.sunnyPercentage,
      career: sphereData.career.sunnyPercentage,
      family: sphereData.family.sunnyPercentage,
      friends: sphereData.friends.sunnyPercentage,
      hobbies: sphereData.hobbies.sunnyPercentage,
    }),
    [sphereData],
  );

  const spheres: {
    type: LifeSphere;
    icon: string;
    label: string;
    entities: any[];
  }[] = useMemo(() => {
    const allSpheres = [
      {
        type: "relationships" as LifeSphere,
        icon: "favorite",
        label: t("spheres.relationships"),
        entities: getEntitiesBySphere("relationships"),
      },
      {
        type: "career" as LifeSphere,
        icon: "work",
        label: t("spheres.career"),
        entities: getEntitiesBySphere("career"),
      },
      {
        type: "family" as LifeSphere,
        icon: "family-restroom",
        label: t("spheres.family"),
        entities: getEntitiesBySphere("family"),
      },
      {
        type: "friends" as LifeSphere,
        icon: "people",
        label: t("spheres.friends"),
        entities: getEntitiesBySphere("friends"),
      },
      {
        type: "hobbies" as LifeSphere,
        icon: "sports-esports",
        label: t("spheres.hobbies"),
        entities: getEntitiesBySphere("hobbies"),
      },
    ];

    // Filter out spheres that have no memories/moments
    return allSpheres.filter((sphere) => {
      const data = sphereData[sphere.type];
      return data.totalMoments > 0;
    });
  }, [getEntitiesBySphere, t, sphereData]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 50,
        },
        headerButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
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
          backgroundColor:
            colorScheme === "dark"
              ? colors.surfaceElevated1
              : "rgba(0, 0, 0, 0.05)",
        },
        wheelWrapper: {
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 20 * fontScale,
          width: chartSize,
          height: chartSize,
        },
        chartLayer: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        },
        chartDescription: {
          marginTop: 8 * fontScale,
          paddingHorizontal: 20 * fontScale,
          paddingVertical: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? colors.surfaceElevated2
              : "rgba(0, 0, 0, 0.05)",
          borderRadius: 8 * fontScale,
        },
        chartDescriptionText: {
          opacity: 0.92,
          lineHeight: 20 * fontScale,
          textAlign: "center",
        },
        scoresContainer: {
          marginTop: 24 * fontScale,
          gap: 16 * fontScale,
        },
        scoreItem: {
          marginBottom: 12 * fontScale,
          borderRadius: 12 * fontScale,
          padding: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(0, 0, 0, 0.03)",
        },
        scoreRowTouchable: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
          marginBottom: 8 * fontScale,
        },
        scoreLabel: {
          flex: 1,
        },
        scoreValue: {
          minWidth: 50 * fontScale,
          textAlign: "right",
        },
        scoreBarContainer: {
          height: 6 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          borderRadius: 3 * fontScale,
          overflow: "hidden",
        },
        scoreBar: {
          height: "100%",
          borderRadius: 3 * fontScale,
        },
        percentageExplanation: {
          marginTop: 16 * fontScale,
          marginBottom: 8 * fontScale,
          paddingHorizontal: 20 * fontScale,
          paddingVertical: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
          borderRadius: 8 * fontScale,
        },
        percentageExplanationText: {
          opacity: 0.7,
          lineHeight: 18 * fontScale,
          textAlign: "center",
        },
      }),
    [fontScale, colorScheme, colors, chartSize],
  );

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
              hitSlop={12}
        >
          <MaterialIcons
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText
          size="xl"
          weight="bold"
          letterSpacing="s"
          style={styles.headerTitle}
        >
          {t("insights.wheelOfLife.title")}
        </ThemedText>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleInsightsModeToggle}
          accessibilityRole="button"
          accessibilityLabel={
            insightsMode === "sferas"
              ? t("insights.viewToggle.a11yToMoments")
              : t("insights.viewToggle.a11yToSferas")
          }
          hitSlop={12}
        >
          <MaterialIcons
            name="swap-horiz"
            size={26 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 * fontScale }}
        showsVerticalScrollIndicator={false}
      >
        {/* Wheel of Life Visualization */}
        <View style={styles.wheelContainer}>
          <View style={styles.wheelWrapper}>
            <Animated.View
              pointerEvents={insightsMode === "sferas" ? "auto" : "none"}
              style={[styles.chartLayer, sferasChartAnimatedStyle]}
            >
              <WheelOfLifeVisualization
                distribution={sphereDistribution}
                quality={sphereScores}
                colors={colors}
                colorScheme={colorScheme}
                fontScale={fontScale}
                onSlicePress={handleSlicePress}
              />
            </Animated.View>
            <Animated.View
              pointerEvents={insightsMode === "moments" ? "auto" : "none"}
              style={[styles.chartLayer, momentsChartAnimatedStyle]}
            >
              <MomentTypesPieVisualization
                distribution={momentTotals}
                colors={colors}
                colorScheme={colorScheme}
                fontScale={fontScale}
                momentColors={momentColors}
                animationTrigger={momentChartAnimationTrigger}
                onSlicePress={handleMomentKindPress}
              />
            </Animated.View>
          </View>
          <View style={styles.chartDescription}>
            <ThemedText size="sm" style={styles.chartDescriptionText}>
              {insightsMode === "sferas"
                ? t("insights.wheelOfLife.distributionExplanation")
                : t("insights.momentsView.distributionExplanation")}
            </ThemedText>
          </View>

          {/* Sphere Scores - temporarily hidden */}
          {!HIDE_LIST_VIEW && (
            <View style={styles.scoresContainer}>
              {spheres.map((sphere) => {
                const score = sphereScores[sphere.type];
                // Get sphere-specific colors - theme-aware for proper contrast (matching spheres.tsx)
                const getSphereColor = (sphereType: LifeSphere): string => {
                  const scheme: "light" | "dark" = (colorScheme ?? "dark") as
                    | "light"
                    | "dark";
                  if (scheme === "light") {
                    switch (sphereType) {
                      case "relationships":
                        return "#D32F2F";
                      case "career":
                        return "#1976D2";
                      case "family":
                        return "#388E3C";
                      case "friends":
                        return "#7B1FA2";
                      case "hobbies":
                        return "#F57C00";
                      default:
                        return "#1976D2";
                    }
                  } else {
                    switch (sphereType) {
                      case "relationships":
                        return "#E57373";
                      case "career":
                        return Colors.dark.primary;
                      case "family":
                        return "#81C784";
                      case "friends":
                        return "#BA68C8";
                      case "hobbies":
                        return "#FFB74D";
                      default:
                        return Colors.dark.primary;
                    }
                  }
                };
                const sphereColor = getSphereColor(sphere.type);

                const hasEntities = sphere.entities.length > 0;
                const isClickable =
                  (sphere.type === "relationships" ||
                    sphere.type === "career" ||
                    sphere.type === "family" ||
                    sphere.type === "friends" ||
                    sphere.type === "hobbies") &&
                  hasEntities;

                return (
                  <TouchableOpacity
                    key={sphere.type}
                    style={styles.scoreItem}
                    onPress={async () => {
                      if (!hasEntities) return;

                      if (!__DEV__) {
                        const { hasEntityLimitEntitlement } =
                          await ensureSubscriptionResolved();
                        if (!hasEntityLimitEntitlement) {
                          const subscribed = await showPaywallForAnySubscriptionAccess();
                          if (!subscribed) return;
                        }
                      }

                      if (sphere.type === "relationships") {
                        router.push("/relationships-comparison");
                      } else if (sphere.type === "career") {
                        router.push("/career-comparison");
                      } else if (sphere.type === "family") {
                        router.push("/family-comparison");
                      } else if (sphere.type === "friends") {
                        router.push("/friends-comparison");
                      } else if (sphere.type === "hobbies") {
                        router.push("/hobbies-comparison");
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
                      <ThemedText
                        size="sm"
                        weight="semibold"
                        style={styles.scoreLabel}
                      >
                        {sphere.label}
                      </ThemedText>
                      <MaterialIcons
                        name={isClickable ? "arrow-forward" : "expand-more"}
                        size={24 * fontScale}
                        color={colors.icon}
                      />
                    </View>
                    <View style={styles.scoreBarContainer}>
                      <View
                        style={[
                          styles.scoreBar,
                          { width: `${score}%`, backgroundColor: sphereColor },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Percentage Explanation */}
          {!HIDE_LIST_VIEW && (
            <View style={styles.percentageExplanation}>
              <ThemedText size="xs" style={styles.percentageExplanationText}>
                {t("insights.wheelOfLife.percentageExplanation")}
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}
