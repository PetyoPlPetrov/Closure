import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { useLargeDevice } from '@/hooks/use-large-device';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
  withDelay,
    withRepeat,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Individual Sparkled Dot Component
const SparkledDot = React.memo(function SparkledDot({
  x,
  y,
  size,
  delay,
  duration,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  React.useEffect(() => {
    // Scale up animation
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 })
    );

    // Fade in first, then start pulsing
    opacity.value = withDelay(
      delay,
      withTiming(0.7, {
        duration: 600,
        easing: Easing.out(Easing.ease)
      }, (finished) => {
        if (finished) {
          // After fade in completes, start pulsing (between 0.4 and 0.7)
          opacity.value = withRepeat(
            withTiming(0.4, { duration, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
          );
        }
      })
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

  const glowColor = 'rgba(255, 255, 255, 0.65)';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
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

interface SplashContextType {
  hideSplash: () => void;
  isVisible: boolean;
  isAnimationComplete: boolean;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

export const useSplash = () => {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error('useSplash must be used within SplashAnimationProvider');
  }
  return context;
};

interface SplashAnimationProviderProps {
  children: React.ReactNode;
}

export function SplashAnimationProvider({ children }: SplashAnimationProviderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
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

  // Dynamic quote style based on device size
  const quoteStyle = useMemo(() => ({
    ...styles.quote,
    fontSize: isTablet ? 32 : 20, // Larger for impact
    lineHeight: isTablet ? 44 : 32,
    letterSpacing: isTablet ? 4 : 3, // More spacing on tablets
  }), [isTablet]);

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
      const radius = (avatarSize / 2 + 20) + Math.random() * (Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35);
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
      const y = SCREEN_HEIGHT - (SCREEN_HEIGHT * 0.15) + Math.random() * (SCREEN_HEIGHT * 0.15);
      const size = 2 + Math.random() * 2;
      const delay = Math.random() * 2000;
      const duration = 2500 + Math.random() * 1500;

      dots.push({ x, y, size, delay, duration, id: `bottom-${i}` });
    }

    return dots;
  }, [isTablet, avatarSize]);

  // Hide native splash screen immediately
  useLayoutEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Ignore errors if splash screen is already hidden
    });
  }, []);

  useEffect(() => {
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
    floatingElement1.opacity.value = withDelay(popOutDelay, withTiming(1, { duration: 300 }));
    floatingElement1.scale.value = withDelay(
      popOutDelay,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      })
    );
    floatingElement1.popOutProgress.value = withDelay(
      popOutDelay,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      })
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
        false
      )
    );

    // Element 2 - pops out with delay
    floatingElement2.opacity.value = withDelay(popOutDelay + 200, withTiming(1, { duration: 300 }));
    floatingElement2.scale.value = withDelay(
      popOutDelay + 200,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      })
    );
    floatingElement2.popOutProgress.value = withDelay(
      popOutDelay + 200,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      })
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
        false
      )
    );

    // Element 3 - pops out with delay
    floatingElement3.opacity.value = withDelay(popOutDelay + 400, withTiming(1, { duration: 300 }));
    floatingElement3.scale.value = withDelay(
      popOutDelay + 400,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      })
    );
    floatingElement3.popOutProgress.value = withDelay(
      popOutDelay + 400,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      })
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
        false
      )
    );

    // Element 4 - Friends - pops out with delay
    floatingElement4.opacity.value = withDelay(popOutDelay + 600, withTiming(1, { duration: 300 }));
    floatingElement4.scale.value = withDelay(
      popOutDelay + 600,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      })
    );
    floatingElement4.popOutProgress.value = withDelay(
      popOutDelay + 600,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      })
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
        false
      )
    );

    // Element 5 - Hobbies - pops out with delay (last one)
    floatingElement5.opacity.value = withDelay(popOutDelay + 800, withTiming(1, { duration: 300 }));
    floatingElement5.scale.value = withDelay(
      popOutDelay + 800,
      withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      })
    );
    floatingElement5.popOutProgress.value = withDelay(
      popOutDelay + 800,
      withTiming(1, {
        duration: popOutDuration,
        easing: Easing.out(Easing.cubic),
      })
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
        false
      )
    );

    // Step 3: Text appears after elements start orbiting (2000ms delay)
    textOpacity.value = withDelay(2000, withTiming(1, {
      duration: 800,
          easing: Easing.out(Easing.cubic),
    }));

    // Step 4: Mark animation as complete after text appears (3500ms total - increased for 5 elements)
    const completeTimeout = setTimeout(() => {
            runOnJS(setIsAnimationComplete)(true);
    }, 3500);

    return () => {
      clearTimeout(completeTimeout);
    };
  }, []);

  const finishHiding = () => {
    setIsVisible(false);
  };

  const hideSplash = () => {
    // Fade out animation
    splashOpacity.value = withTiming(0, {
      duration: 500,
      easing: Easing.ease,
    }, (finished) => {
      if (finished) {
        runOnJS(finishHiding)();
      }
    });
  };

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
    const popOutRadius = interpolate(floatingElement1.popOutProgress.value, [0, 1], [0, radius]);
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
    const popOutRadius = interpolate(floatingElement2.popOutProgress.value, [0, 1], [0, radius]);
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
    const popOutRadius = interpolate(floatingElement3.popOutProgress.value, [0, 1], [0, radius]);
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
    const popOutRadius = interpolate(floatingElement4.popOutProgress.value, [0, 1], [0, radius]);
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
    const popOutRadius = interpolate(floatingElement5.popOutProgress.value, [0, 1], [0, radius]);
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
    <SplashContext.Provider value={{ hideSplash, isVisible, isAnimationComplete }}>
      {children}
      {isVisible && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            splashStyle,
            styles.splashOverlay,
            { zIndex: 9999, elevation: 9999 }
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.container}>
        {/* Solid background matching home screen dark mode */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A2332' }]} />

            {/* Sparkled Dots */}
            {sparkledDots.map((dot) => (
              <SparkledDot
                key={dot.id}
                x={dot.x}
                y={dot.y}
                size={dot.size}
                delay={dot.delay}
                duration={dot.duration}
              />
            ))}

            {/* Content */}
            <View style={styles.content}>
              {/* Avatar Container with Floating Elements */}
              <View style={[styles.avatarContainer, { width: avatarContainerSize, height: avatarContainerSize }]}>
                {/* Central Avatar */}
                <Animated.View style={[styles.avatarWrapper, avatarAnimatedStyle, { width: avatarSize, height: avatarSize }]}>
                  <LinearGradient
                    colors={['rgba(14, 165, 233, 0.3)', 'rgba(14, 165, 233, 0.15)', 'rgba(14, 165, 233, 0.05)']}
                    style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                  >
                    <View style={styles.avatarInner}>
                      <MaterialIcons name="person" size={isTablet ? 60 : 40} color="rgba(255, 215, 0, 0.9)" />
                    </View>
                  </LinearGradient>
                </Animated.View>

                {/* Floating Element 1 - Relationships (Heart) */}
                <Animated.View style={[styles.floatingElement, floatingElement1Style, { width: sphereSize, height: sphereSize }]}>
            <LinearGradient
                    colors={['rgba(255, 150, 150, 0.4)', 'rgba(255, 150, 150, 0.2)', 'rgba(255, 150, 150, 0.05)']}
                    style={[styles.floatingElementInner, { width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2 }]}
                  >
                    <MaterialIcons name="favorite" size={isTablet ? 60 : 40} color="rgba(255, 180, 180, 0.9)" />
                  </LinearGradient>
          </Animated.View>

                {/* Floating Element 2 - Career (Briefcase) */}
                <Animated.View style={[styles.floatingElement, floatingElement2Style, { width: sphereSize, height: sphereSize }]}>
            <LinearGradient
                    colors={['rgba(150, 200, 255, 0.4)', 'rgba(150, 200, 255, 0.2)', 'rgba(150, 200, 255, 0.05)']}
                    style={[styles.floatingElementInner, { width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2 }]}
                  >
                    <MaterialIcons name="work" size={isTablet ? 60 : 40} color="rgba(180, 220, 255, 0.9)" />
                  </LinearGradient>
          </Animated.View>

                {/* Floating Element 3 - Family */}
                <Animated.View style={[styles.floatingElement, floatingElement3Style, { width: sphereSize, height: sphereSize }]}>
                  <LinearGradient
                    colors={['rgba(200, 150, 255, 0.4)', 'rgba(200, 150, 255, 0.2)', 'rgba(200, 150, 255, 0.05)']}
                    style={[styles.floatingElementInner, { width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2 }]}
                  >
                    <MaterialIcons name="family-restroom" size={isTablet ? 60 : 40} color="rgba(220, 180, 255, 0.9)" />
                  </LinearGradient>
                </Animated.View>

                {/* Floating Element 4 - Friends */}
                <Animated.View style={[styles.floatingElement, floatingElement4Style, { width: sphereSize, height: sphereSize }]}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']}
                    style={[styles.floatingElementInner, { width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2 }]}
                  >
                    <MaterialIcons name="people" size={isTablet ? 60 : 40} color="rgba(167, 139, 250, 0.9)" />
                  </LinearGradient>
                </Animated.View>

                {/* Floating Element 5 - Hobbies */}
                <Animated.View style={[styles.floatingElement, floatingElement5Style, { width: sphereSize, height: sphereSize }]}>
            <LinearGradient
                    colors={['rgba(249, 115, 22, 0.4)', 'rgba(249, 115, 22, 0.2)', 'rgba(249, 115, 22, 0.05)']}
                    style={[styles.floatingElementInner, { width: sphereSize, height: sphereSize, borderRadius: sphereSize / 2 }]}
                  >
                    <MaterialIcons name="sports-esports" size={isTablet ? 60 : 40} color="rgba(255, 157, 88, 0.9)" />
                  </LinearGradient>
          </Animated.View>
        </View>

              {/* Quote Text */}
              <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                <Text style={quoteStyle}>
                  LIVE SPHERICALLY,{'\n'}IN MANY DIRECTIONS!
                </Text>
          </Animated.View>
        </View>
      </View>
      </Animated.View>
      )}
    </SplashContext.Provider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: SCREEN_HEIGHT * 0.15, // Move content lower on screen
  },
  avatarContainer: {
    width: 360, // Base size, will be overridden dynamically
    height: 360,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    position: 'relative',
  },
  avatarWrapper: {
    width: 80, // Base size, will be overridden dynamically
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 80, // Base size, will be overridden dynamically
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // Subtle mask/shadow effect
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingElement: {
    position: 'absolute',
    width: 80, // Base size, will be overridden dynamically
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingElementInner: {
    width: 80, // Base size, will be overridden dynamically
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // Subtle mask effect with glow
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  textContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH - 64,
  },
  quote: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 18,
    fontWeight: '700', // Bold for impact
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: 3, // Wide letter spacing for modern look
    textTransform: 'uppercase' as const,
    textShadowColor: 'rgba(100, 181, 246, 0.5)', // Subtle blue glow
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    ...Platform.select({
      web: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        fontWeight: '800',
      },
      ios: {
        fontFamily: 'System',
        fontWeight: '800',
      },
      android: {
        fontFamily: 'sans-serif-condensed',
        fontWeight: '700',
      },
    }),
  },
});
