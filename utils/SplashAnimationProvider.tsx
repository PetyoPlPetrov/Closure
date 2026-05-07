import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SplashHubOrb, SplashOrbitOrb } from "@/components/splash-sfera-orbs";
import { Colors } from "@/constants/theme";
import { TAB_BACKGROUND_COLOR_LIGHT_COSMIC_OFF } from "@/library/components/tab-screen-container";
import { useTheme } from "@/utils/ThemeContext";
import { SPLASH_ANIMATION_KEY, useVisualSettings } from "@/utils/VisualSettingsProvider";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Line, Circle } from "react-native-svg";
import { useLargeDevice } from "@/hooks/use-large-device";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Individual Sparkled Dot Component
const SparkledDot = React.memo(function SparkledDot({
  x,
  y,
  size,
  delay,
  duration,
  glowColor,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  glowColor: string;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  React.useEffect(() => {
    // Scale up animation
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 }),
    );

    // Fade in first, then start pulsing
    opacity.value = withDelay(
      delay,
      withTiming(
        0.7,
        {
          duration: 600,
          easing: Easing.out(Easing.ease),
        },
        (finished) => {
          if (finished) {
            // After fade in completes, start pulsing (between 0.4 and 0.7)
            opacity.value = withRepeat(
              withTiming(0.4, { duration, easing: Easing.inOut(Easing.ease) }),
              -1,
              true,
            );
          }
        },
      ),
    );
  }, [delay, duration, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
      left: x - size / 2,
      top: y - size / 2,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: glowColor,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: size * 2,
          elevation: 6,
        },
        animatedStyle,
      ]}
    />
  );
});

// Constellation patterns: stars in normalized coords (0-1), connections as [from, to] indices
const CONSTELLATIONS: Array<{
  stars: Array<{ x: number; y: number }>;
  connections: Array<[number, number]>;
}> = [
  // Big Dipper (Ursa Major) - simplified
  {
    stars: [
      { x: 0.08, y: 0.12 },
      { x: 0.12, y: 0.08 },
      { x: 0.18, y: 0.1 },
      { x: 0.22, y: 0.06 },
      { x: 0.28, y: 0.08 },
      { x: 0.32, y: 0.14 },
      { x: 0.38, y: 0.18 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [1, 4],
    ],
  },
  // Orion's Belt
  {
    stars: [
      { x: 0.72, y: 0.22 },
      { x: 0.78, y: 0.2 },
      { x: 0.84, y: 0.24 },
      { x: 0.78, y: 0.32 },
      { x: 0.78, y: 0.4 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
    ],
  },
  // Cassiopeia (W shape)
  {
    stars: [
      { x: 0.88, y: 0.55 },
      { x: 0.82, y: 0.62 },
      { x: 0.86, y: 0.68 },
      { x: 0.8, y: 0.74 },
      { x: 0.84, y: 0.8 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  // Small triangle (Lyra-like)
  {
    stars: [
      { x: 0.15, y: 0.72 },
      { x: 0.22, y: 0.68 },
      { x: 0.18, y: 0.78 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  },
  // Cross pattern
  {
    stars: [
      { x: 0.92, y: 0.15 },
      { x: 0.9, y: 0.2 },
      { x: 0.94, y: 0.2 },
      { x: 0.92, y: 0.25 },
    ],
    connections: [
      [0, 3],
      [1, 2],
    ],
  },
];

const ConstellationBackground = React.memo(function ConstellationBackground({
  colorScheme,
}: {
  colorScheme: "light" | "dark";
}) {
  const opacity = useSharedValue(0);
  const strokeColor =
    colorScheme === "light"
      ? "rgba(13, 13, 13, 0.14)"
      : "rgba(255, 255, 255, 0.2)";
  const starFill =
    colorScheme === "light"
      ? "rgba(13, 13, 13, 0.38)"
      : "rgba(255, 255, 255, 0.5)";

  useEffect(() => {
    opacity.value = withDelay(
      200,
      withTiming(0.35, { duration: 1200, easing: Easing.out(Easing.ease) }),
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, animatedStyle]}
      pointerEvents="none"
    >
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        style={StyleSheet.absoluteFill}
      >
        {CONSTELLATIONS.map((constellation, cIdx) =>
          constellation.connections.map(([from, to], connIdx) => {
            const s1 = constellation.stars[from];
            const s2 = constellation.stars[to];
            if (!s1 || !s2) return null;
            return (
              <Line
                key={`c${cIdx}-${connIdx}`}
                x1={s1.x * SCREEN_WIDTH}
                y1={s1.y * SCREEN_HEIGHT}
                x2={s2.x * SCREEN_WIDTH}
                y2={s2.y * SCREEN_HEIGHT}
                stroke={strokeColor}
                strokeWidth={1}
                strokeLinecap="round"
              />
            );
          }),
        )}
        {CONSTELLATIONS.flatMap((constellation, cIdx) =>
          constellation.stars.map((star, sIdx) => (
            <Circle
              key={`c${cIdx}-s${sIdx}`}
              cx={star.x * SCREEN_WIDTH}
              cy={star.y * SCREEN_HEIGHT}
              r={1.5}
              fill={starFill}
            />
          )),
        )}
      </Svg>
    </Animated.View>
  );
});

interface SplashContextType {
  hideSplash: () => void;
  replaySplashAnimation: () => void;
  isVisible: boolean;
  isAnimationComplete: boolean;
  isStartupPreferenceResolved: boolean;
  isSplashAnimationEnabled: boolean;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

export const useSplash = () => {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error("useSplash must be used within SplashAnimationProvider");
  }
  return context;
};

interface SplashAnimationProviderProps {
  children: React.ReactNode;
}

export function SplashAnimationProvider({
  children,
}: SplashAnimationProviderProps) {
  const { colorScheme } = useTheme();
  const { cosmicBackgroundOpacity } = useVisualSettings();
  const lightCosmicOff =
    colorScheme === "light" && cosmicBackgroundOpacity === 0;
  const splashBackgroundColor = lightCosmicOff
    ? TAB_BACKGROUND_COLOR_LIGHT_COSMIC_OFF
    : Colors[colorScheme].background;
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [isReplayPriming, setIsReplayPriming] = useState(false);
  const [animationRunId, setAnimationRunId] = useState(0);
  const [isStartupPreferenceResolved, setIsStartupPreferenceResolved] = useState(false);
  const [isSplashAnimationEnabled, setIsSplashAnimationEnabled] = useState(true);
  const replayStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isTablet } = useLargeDevice();
  const splashOpacity = useSharedValue(1);

  // Scale sizes for tablets
  const avatarSize = isTablet ? 120 : 80; // 50% larger on tablets
  const sphereSize = isTablet ? 120 : 80; // 50% larger on tablets
  const orbitRadius = isTablet ? 180 : 120; // 50% larger on tablets
  const avatarContainerSize = isTablet ? 540 : 360; // Accommodate larger orbit radius

  // Avatar animations
  const avatarScale = useSharedValue(0);
  const avatarOpacity = useSharedValue(0);

  // Text animations
  const textOpacity = useSharedValue(0);

  // Floating elements animations - 5 small spheres
  const floatingElement1 = {
    popOutProgress: useSharedValue(0),
    orbitAngle: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  };

  const floatingElement2 = {
    popOutProgress: useSharedValue(0),
    orbitAngle: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  };

  const floatingElement3 = {
    popOutProgress: useSharedValue(0),
    orbitAngle: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  };

  const floatingElement4 = {
    popOutProgress: useSharedValue(0),
    orbitAngle: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  };

  const floatingElement5 = {
    popOutProgress: useSharedValue(0),
    orbitAngle: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  };

  // Dynamic quote style based on device size and theme
  const quoteStyle = useMemo(
    () => ({
      ...styles.quote,
      fontSize: isTablet ? 32 : 20, // Larger for impact
      lineHeight: isTablet ? 44 : 32,
      letterSpacing: isTablet ? 4 : 3, // More spacing on tablets
      ...(colorScheme === "light"
        ? {
            color: Colors.light.text,
            textShadowColor: "transparent",
            textShadowRadius: 0,
            textShadowOffset: { width: 0, height: 0 },
          }
        : {
            color: Colors.dark.text,
            textShadowColor: "transparent",
            textShadowRadius: 0,
            textShadowOffset: { width: 0, height: 0 },
          }),
    }),
    [isTablet, colorScheme],
  );

  const sparkleGlowColor = useMemo(
    () =>
      colorScheme === "light"
        ? "rgba(19, 94, 40, 0.42)"
        : "rgba(255, 255, 255, 0.65)",
    [colorScheme],
  );

  // Generate sparkled dots - scattered across the screen
  const sparkledDots = useMemo(() => {
    const numDots = isTablet ? 40 : 30; // More dots for immersive effect
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT * 0.35; // Centered around avatar area

    const dots = [];

    // Center dots around avatar
    const numCenterDots = Math.floor(numDots * 0.6); // 60% around center
    for (let i = 0; i < numCenterDots; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius =
        avatarSize / 2 +
        20 +
        Math.random() * (Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = 2 + Math.random() * 2;
      const delay = Math.random() * 2000;
      const duration = 2500 + Math.random() * 1500;

      dots.push({ x, y, size, delay, duration, id: `center-${i}` });
    }

    // Top area dots
    const numTopDots = Math.floor(numDots * 0.2); // 20% at top
    for (let i = 0; i < numTopDots; i++) {
      const x = Math.random() * SCREEN_WIDTH;
      const y = Math.random() * (SCREEN_HEIGHT * 0.15);
      const size = 2 + Math.random() * 2;
      const delay = Math.random() * 2000;
      const duration = 2500 + Math.random() * 1500;

      dots.push({ x, y, size, delay, duration, id: `top-${i}` });
    }

    // Bottom area dots
    const numBottomDots = numDots - numCenterDots - numTopDots; // Remaining at bottom
    for (let i = 0; i < numBottomDots; i++) {
      const x = Math.random() * SCREEN_WIDTH;
      const y =
        SCREEN_HEIGHT -
        SCREEN_HEIGHT * 0.15 +
        Math.random() * (SCREEN_HEIGHT * 0.15);
      const size = 2 + Math.random() * 2;
      const delay = Math.random() * 2000;
      const duration = 2500 + Math.random() * 1500;

      dots.push({ x, y, size, delay, duration, id: `bottom-${i}` });
    }

    return dots;
  }, [isTablet, avatarSize]);

  useEffect(() => {
    // Resolve splash preference before mounting any splash content.
    // This prevents showing a single animation frame when the setting is disabled.
    AsyncStorage.getItem(SPLASH_ANIMATION_KEY).then((val) => {
      if (val === "false") {
        setIsSplashAnimationEnabled(false);
        setIsAnimationComplete(true);
        setIsVisible(false);
      } else {
        setIsSplashAnimationEnabled(true);
        setIsVisible(true);
      }
      setIsStartupPreferenceResolved(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide native splash only after startup preference is resolved.
  useLayoutEffect(() => {
    if (!isStartupPreferenceResolved) return;
    SplashScreen.hideAsync().catch(() => {
      // Ignore errors if splash screen is already hidden
    });
  }, [isStartupPreferenceResolved]);

  const resetAnimationState = () => {
    setIsVisible(true);
    setIsAnimationComplete(false);
    splashOpacity.value = 1;
    avatarScale.value = 0;
    avatarOpacity.value = 0;
    textOpacity.value = 0;
    skipOpacity.value = 0;

    floatingElement1.popOutProgress.value = 0;
    floatingElement1.orbitAngle.value = 0;
    floatingElement1.opacity.value = 0;
    floatingElement1.scale.value = 0;

    floatingElement2.popOutProgress.value = 0;
    floatingElement2.orbitAngle.value = 0;
    floatingElement2.opacity.value = 0;
    floatingElement2.scale.value = 0;

    floatingElement3.popOutProgress.value = 0;
    floatingElement3.orbitAngle.value = 0;
    floatingElement3.opacity.value = 0;
    floatingElement3.scale.value = 0;

    floatingElement4.popOutProgress.value = 0;
    floatingElement4.orbitAngle.value = 0;
    floatingElement4.opacity.value = 0;
    floatingElement4.scale.value = 0;

    floatingElement5.popOutProgress.value = 0;
    floatingElement5.orbitAngle.value = 0;
    floatingElement5.opacity.value = 0;
    floatingElement5.scale.value = 0;
  };

  const replaySplashAnimation = () => {
    if (replayStartTimeoutRef.current) {
      clearTimeout(replayStartTimeoutRef.current);
      replayStartTimeoutRef.current = null;
    }

    resetAnimationState();
    setIsReplayPriming(true);

    replayStartTimeoutRef.current = setTimeout(() => {
      setIsReplayPriming(false);
      setAnimationRunId((current) => current + 1);
      replayStartTimeoutRef.current = null;
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (replayStartTimeoutRef.current) {
        clearTimeout(replayStartTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !isVisible ||
      !isStartupPreferenceResolved ||
      !isSplashAnimationEnabled
    ) {
      return;
    }
    // Animation sequence:
    // 1. Avatar appears (scale from 0, fade in)
    // 2. Floating elements pop out from avatar center
    // 3. Floating elements start orbiting around avatar
    // 4. Mark animation as complete

    // Step 1: Avatar entrance (600ms)
    avatarOpacity.value = withTiming(1, { duration: 300 });
    avatarScale.value = withSpring(1, {
      damping: 12,
      stiffness: 150,
      mass: 0.8,
    });

    // Step 2: Floating elements pop out from center (600ms delay, 600ms duration each)
    const popOutDelay = 600;
    const popOutDuration = 600;

    // Calculate when the last element finishes popping out
    // Element 5 starts at popOutDelay + 800, takes popOutDuration to finish
    const lastElementFinishTime = popOutDelay + 800 + popOutDuration; // 2000ms
    // All elements should start orbiting at the same time, after the last one finishes
    const orbitStartDelay = lastElementFinishTime;

    // Element 1 - pops out
    floatingElement1.opacity.value = withDelay(
      popOutDelay,
      withTiming(1, { duration: 300 }),
    );
    floatingElement1.scale.value = withDelay(
      popOutDelay,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      }),
    );
    floatingElement1.popOutProgress.value = withDelay(
      popOutDelay,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // Start orbiting at the same time as all others
    floatingElement1.orbitAngle.value = withDelay(
      orbitStartDelay,
      withRepeat(
        withTiming(360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // Element 2 - pops out with delay
    floatingElement2.opacity.value = withDelay(
      popOutDelay + 200,
      withTiming(1, { duration: 300 }),
    );
    floatingElement2.scale.value = withDelay(
      popOutDelay + 200,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      }),
    );
    floatingElement2.popOutProgress.value = withDelay(
      popOutDelay + 200,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // Start orbiting at the same time as all others
    floatingElement2.orbitAngle.value = withDelay(
      orbitStartDelay,
      withRepeat(
        withTiming(360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // Element 3 - pops out with delay
    floatingElement3.opacity.value = withDelay(
      popOutDelay + 400,
      withTiming(1, { duration: 300 }),
    );
    floatingElement3.scale.value = withDelay(
      popOutDelay + 400,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      }),
    );
    floatingElement3.popOutProgress.value = withDelay(
      popOutDelay + 400,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // Start orbiting at the same time as all others
    floatingElement3.orbitAngle.value = withDelay(
      orbitStartDelay,
      withRepeat(
        withTiming(360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // Element 4 - Friends - pops out with delay
    floatingElement4.opacity.value = withDelay(
      popOutDelay + 600,
      withTiming(1, { duration: 300 }),
    );
    floatingElement4.scale.value = withDelay(
      popOutDelay + 600,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      }),
    );
    floatingElement4.popOutProgress.value = withDelay(
      popOutDelay + 600,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // Start orbiting at the same time as all others
    floatingElement4.orbitAngle.value = withDelay(
      orbitStartDelay,
      withRepeat(
        withTiming(360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // Element 5 - Hobbies - pops out with delay (last one)
    floatingElement5.opacity.value = withDelay(
      popOutDelay + 800,
      withTiming(1, { duration: 300 }),
    );
    floatingElement5.scale.value = withDelay(
      popOutDelay + 800,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      }),
    );
    floatingElement5.popOutProgress.value = withDelay(
      popOutDelay + 800,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // Start orbiting at the same time as all others
    floatingElement5.orbitAngle.value = withDelay(
      orbitStartDelay,
      withRepeat(
        withTiming(360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // Step 3: Text appears after elements start orbiting (2000ms delay)
    textOpacity.value = withDelay(
      2000,
      withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Step 4: Mark animation as complete after text appears (3500ms total - increased for 5 elements)
    const completeTimeout = setTimeout(() => {
      runOnJS(setIsAnimationComplete)(true);
    }, 3500);

    return () => {
      clearTimeout(completeTimeout);
    };
  }, [
    animationRunId,
    isVisible,
    isStartupPreferenceResolved,
    isSplashAnimationEnabled,
  ]);

  const finishHiding = () => {
    setIsVisible(false);
  };

  const hideSplash = () => {
    // Fade out animation
    splashOpacity.value = withTiming(
      0,
      {
        duration: 500,
        easing: Easing.ease,
      },
      (finished) => {
        if (finished) {
          runOnJS(finishHiding)();
        }
      },
    );
  };

  const handleSkip = () => {
    setIsAnimationComplete(true);
    hideSplash();
  };

  const skipOpacity = useSharedValue(0);
  React.useEffect(() => {
    if (
      !isVisible ||
      !isStartupPreferenceResolved ||
      !isSplashAnimationEnabled
    ) {
      skipOpacity.value = 0;
      return;
    }
    skipOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, [
    animationRunId,
    isVisible,
    isStartupPreferenceResolved,
    isSplashAnimationEnabled,
    skipOpacity,
  ]);
  const skipStyle = useAnimatedStyle(() => ({ opacity: skipOpacity.value }));

  // Splash screen fade animation style
  const splashStyle = useAnimatedStyle(() => {
    return {
      opacity: splashOpacity.value,
    };
  });

  // Avatar animated style
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: avatarOpacity.value,
      transform: [{ scale: avatarScale.value }],
    };
  });

  // Text animated style
  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  // Floating element 1 animated style - Relationships (0°)
  const floatingElement1Style = useAnimatedStyle(() => {
    const radius = orbitRadius; // Orbit radius (scaled for tablet)
    const popOutRadius = interpolate(
      floatingElement1.popOutProgress.value,
      [0, 1],
      [0, radius],
    );
    const orbitAngleRad = (floatingElement1.orbitAngle.value * Math.PI) / 180; // Convert to radians
    const baseAngleRad = (0 * Math.PI) / 180; // 0 degrees - top position

    // Calculate position: baseAngle determines starting position, orbitAngle adds rotation
    const totalAngle = baseAngleRad + orbitAngleRad;
    const x = Math.sin(totalAngle) * popOutRadius;
    const y = -Math.cos(totalAngle) * popOutRadius;

    return {
      opacity: floatingElement1.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement1.scale.value },
      ],
    };
  });

  // Floating element 2 animated style - Career (72°)
  const floatingElement2Style = useAnimatedStyle(() => {
    const radius = orbitRadius; // Orbit radius (scaled for tablet)
    const popOutRadius = interpolate(
      floatingElement2.popOutProgress.value,
      [0, 1],
      [0, radius],
    );
    const orbitAngleRad = (floatingElement2.orbitAngle.value * Math.PI) / 180;
    const baseAngleRad = (72 * Math.PI) / 180; // 72 degrees offset (360/5 = 72)

    const totalAngle = baseAngleRad + orbitAngleRad;
    const x = Math.sin(totalAngle) * popOutRadius;
    const y = -Math.cos(totalAngle) * popOutRadius;

    return {
      opacity: floatingElement2.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement2.scale.value },
      ],
    };
  });

  // Floating element 3 animated style - Family (144°)
  const floatingElement3Style = useAnimatedStyle(() => {
    const radius = orbitRadius; // Orbit radius (scaled for tablet)
    const popOutRadius = interpolate(
      floatingElement3.popOutProgress.value,
      [0, 1],
      [0, radius],
    );
    const orbitAngleRad = (floatingElement3.orbitAngle.value * Math.PI) / 180;
    const baseAngleRad = (144 * Math.PI) / 180; // 144 degrees offset (72 * 2)

    const totalAngle = baseAngleRad + orbitAngleRad;
    const x = Math.sin(totalAngle) * popOutRadius;
    const y = -Math.cos(totalAngle) * popOutRadius;

    return {
      opacity: floatingElement3.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement3.scale.value },
      ],
    };
  });

  // Floating element 4 animated style - Friends (216°)
  const floatingElement4Style = useAnimatedStyle(() => {
    const radius = orbitRadius; // Orbit radius (scaled for tablet)
    const popOutRadius = interpolate(
      floatingElement4.popOutProgress.value,
      [0, 1],
      [0, radius],
    );
    const orbitAngleRad = (floatingElement4.orbitAngle.value * Math.PI) / 180;
    const baseAngleRad = (216 * Math.PI) / 180; // 216 degrees offset (72 * 3)

    const totalAngle = baseAngleRad + orbitAngleRad;
    const x = Math.sin(totalAngle) * popOutRadius;
    const y = -Math.cos(totalAngle) * popOutRadius;

    return {
      opacity: floatingElement4.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement4.scale.value },
      ],
    };
  });

  // Floating element 5 animated style - Hobbies (288°)
  const floatingElement5Style = useAnimatedStyle(() => {
    const radius = orbitRadius; // Orbit radius (scaled for tablet)
    const popOutRadius = interpolate(
      floatingElement5.popOutProgress.value,
      [0, 1],
      [0, radius],
    );
    const orbitAngleRad = (floatingElement5.orbitAngle.value * Math.PI) / 180;
    const baseAngleRad = (288 * Math.PI) / 180; // 288 degrees offset (72 * 4)

    const totalAngle = baseAngleRad + orbitAngleRad;
    const x = Math.sin(totalAngle) * popOutRadius;
    const y = -Math.cos(totalAngle) * popOutRadius;

    return {
      opacity: floatingElement5.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement5.scale.value },
      ],
    };
  });

  return (
    <SplashContext.Provider
      value={{
        hideSplash,
        replaySplashAnimation,
        isVisible,
        isAnimationComplete,
        isStartupPreferenceResolved,
        isSplashAnimationEnabled,
      }}
    >
      {children}
      {isVisible && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            splashStyle,
            styles.splashOverlay,
            { zIndex: 9999, elevation: 9999 },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.container}>
            {/* Solid background matching app theme (light / dark) */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: splashBackgroundColor },
              ]}
            />

            {isStartupPreferenceResolved && isSplashAnimationEnabled && (
              <>
                {/* Constellation background */}
                {!isReplayPriming && !lightCosmicOff && (
                  <ConstellationBackground colorScheme={colorScheme} />
                )}

                {/* Sparkled Dots */}
                {!isReplayPriming &&
                  !lightCosmicOff &&
                  sparkledDots.map((dot) => (
                    <SparkledDot
                      key={dot.id}
                      x={dot.x}
                      y={dot.y}
                      size={dot.size}
                      delay={dot.delay}
                      duration={dot.duration}
                      glowColor={sparkleGlowColor}
                    />
                  ))}

                {/* Content */}
                <View style={[styles.content, isReplayPriming && { opacity: 0 }]}>
                  {/* Avatar Container with Floating Elements */}
                  <View
                    style={[
                      styles.avatarContainer,
                      { width: avatarContainerSize, height: avatarContainerSize },
                    ]}
                  >
                    {/* Center = Sfera Insights entry (purple), orbit = life spheres from sphere-styles */}
                    <Animated.View
                      style={[
                        styles.avatarWrapper,
                        avatarAnimatedStyle,
                        { width: avatarSize, height: avatarSize },
                      ]}
                    >
                      <SplashHubOrb
                        size={avatarSize}
                        colorScheme={colorScheme}
                        iconSize={isTablet ? 60 : 40}
                      />
                    </Animated.View>

                    {/* Floating Element 1 - Relationships */}
                    <Animated.View
                      style={[
                        styles.floatingElement,
                        floatingElement1Style,
                        { width: sphereSize, height: sphereSize },
                      ]}
                    >
                      <SplashOrbitOrb
                        sphere="relationships"
                        size={sphereSize}
                        colorScheme={colorScheme}
                        iconSize={isTablet ? 54 : 36}
                      />
                    </Animated.View>

                    {/* Floating Element 2 - Career */}
                    <Animated.View
                      style={[
                        styles.floatingElement,
                        floatingElement2Style,
                        { width: sphereSize, height: sphereSize },
                      ]}
                    >
                      <SplashOrbitOrb
                        sphere="career"
                        size={sphereSize}
                        colorScheme={colorScheme}
                        iconSize={isTablet ? 54 : 36}
                      />
                    </Animated.View>

                    {/* Floating Element 3 - Family */}
                    <Animated.View
                      style={[
                        styles.floatingElement,
                        floatingElement3Style,
                        { width: sphereSize, height: sphereSize },
                      ]}
                    >
                      <SplashOrbitOrb
                        sphere="family"
                        size={sphereSize}
                        colorScheme={colorScheme}
                        iconSize={isTablet ? 54 : 36}
                      />
                    </Animated.View>

                    {/* Floating Element 4 - Friends */}
                    <Animated.View
                      style={[
                        styles.floatingElement,
                        floatingElement4Style,
                        { width: sphereSize, height: sphereSize },
                      ]}
                    >
                      <SplashOrbitOrb
                        sphere="friends"
                        size={sphereSize}
                        colorScheme={colorScheme}
                        iconSize={isTablet ? 54 : 36}
                      />
                    </Animated.View>

                    {/* Floating Element 5 - Hobbies */}
                    <Animated.View
                      style={[
                        styles.floatingElement,
                        floatingElement5Style,
                        { width: sphereSize, height: sphereSize },
                      ]}
                    >
                      <SplashOrbitOrb
                        sphere="hobbies"
                        size={sphereSize}
                        colorScheme={colorScheme}
                        iconSize={isTablet ? 54 : 36}
                      />
                    </Animated.View>
                  </View>

                  {/* Quote Text */}
                  <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                    <Text style={quoteStyle}>
                      LIVE SPHERICALLY,{"\n"}IN MANY DIRECTIONS!
                    </Text>
                  </Animated.View>
                </View>

                {/* Skip button — bottom right */}
                <Animated.View
                  style={[styles.skipButton, skipStyle]}
                  pointerEvents="box-none"
                >
                  <Pressable
                    onPress={handleSkip}
                    style={[
                      styles.skipPressable,
                      colorScheme === "light"
                        ? styles.skipPressableLight
                        : styles.skipPressableDark,
                    ]}
                  >
                    <Text
                      style={[
                        styles.skipText,
                        colorScheme === "light" && styles.skipTextLight,
                      ]}
                    >
                      Skip
                    </Text>
                  </Pressable>
                </Animated.View>
              </>
            )}
          </View>
        </Animated.View>
      )}
    </SplashContext.Provider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  content: {
    zIndex: 10,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: SCREEN_HEIGHT * 0.15, // Move content lower on screen
  },
  avatarContainer: {
    width: 360, // Base size, will be overridden dynamically
    height: 360,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 60,
    position: "relative",
  },
  avatarWrapper: {
    width: 80, // Base size, will be overridden dynamically
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingElement: {
    position: "absolute",
    width: 80, // Base size, will be overridden dynamically
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    paddingHorizontal: 32,
    alignItems: "center",
    maxWidth: SCREEN_WIDTH - 64,
  },
  quote: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 18,
    fontWeight: "700", // Bold for impact
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: 3, // Wide letter spacing for modern look
    textTransform: "uppercase" as const,
    textShadowColor: "rgba(100, 181, 246, 0.5)", // Subtle blue glow
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    ...Platform.select({
      web: {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        fontWeight: "800",
      },
      ios: {
        fontFamily: "System",
        fontWeight: "800",
      },
      android: {
        fontFamily: "sans-serif-condensed",
        fontWeight: "700",
      },
    }),
  },
  skipButton: {
    position: "absolute",
    bottom: 48,
    right: 28,
    zIndex: 10,
  },
  skipPressable: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipPressableDark: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.45)",
  },
  skipPressableLight: {
    backgroundColor: "rgba(13, 13, 13, 0.06)",
    borderColor: "#767676",
  },
  skipText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  skipTextLight: {
    color: Colors.light.textMediumEmphasis,
  },
});
