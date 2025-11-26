import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, G, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

// Create animated Path component for reanimated
const AnimatedPath = Animated.createAnimatedComponent(Path) as any;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const splashOpacity = useSharedValue(1);

  // Sphere 1 animations
  const sphere1X = useSharedValue(0);
  const sphere1Y = useSharedValue(0);
  
  // Sphere 2 animations
  const sphere2X = useSharedValue(0);
  const sphere2Y = useSharedValue(0);
  
  // Sphere 3 animations
  const sphere3X = useSharedValue(0);
  const sphere3Y = useSharedValue(0);

  // Logo pulse animation
  const logoOpacity = useSharedValue(1);
  
  // Circle split animation - start merged (0) and split apart (1)
  const circleSplitProgress = useSharedValue(0);
  
  // Circle pulse animation before split
  const circlePulseScale = useSharedValue(1);

  // Hide native splash screen immediately - use useLayoutEffect to run before paint
  useLayoutEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Ignore errors if splash screen is already hidden
    });
  }, []);

  useEffect(() => {
    // Use a small delay to ensure the component is fully mounted and ready
    // This helps when the app first loads
    const initTimeout = setTimeout(() => {
    // Animate sphere 1 (12s, alternate, ease-in-out)
    sphere1X.value = withRepeat(
      withTiming(1, {
        duration: 12000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    sphere1Y.value = withRepeat(
      withTiming(1, {
        duration: 12000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Animate sphere 2 (15s, alternate, ease-in-out, delay -4s)
    const timeout2 = setTimeout(() => {
      sphere2X.value = withRepeat(
        withTiming(1, {
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      sphere2Y.value = withRepeat(
        withTiming(1, {
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }, 4000);

    // Animate sphere 3 (18s, alternate, ease-in-out, delay -8s)
    const timeout3 = setTimeout(() => {
      sphere3X.value = withRepeat(
        withTiming(1, {
          duration: 18000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      sphere3Y.value = withRepeat(
        withTiming(1, {
          duration: 18000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }, 8000);

    // Animation sequence: Pulse first, then split
    // Step 1: Pulse the merged circle (single slow pulse)
    circlePulseScale.value = withSequence(
      withTiming(1.12, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      withTiming(1, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      })
    );

    // Step 2: After pulse, split the circles (2.5s, slower)
    const splitTimeout = setTimeout(() => {
      // Explicitly ensure we start from 0
      circleSplitProgress.value = 0;
      // Small delay to ensure the reset is applied before animation starts
      setTimeout(() => {
        circleSplitProgress.value = withTiming(1, {
          duration: 2500,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          // Mark animation as complete when split finishes
          if (finished) {
            runOnJS(setIsAnimationComplete)(true);
          }
        });
      }, 16); // One frame delay to ensure reset is applied
    }, 1600); // Start after pulse completes (1.6s total: 0.8s grow + 0.8s shrink)

    // Step 3: Logo pulse animation (6s, infinite) - start after split
    // This runs in background while splash is visible
    setTimeout(() => {
      logoOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, {
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.9, {
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );
    }, 4100); // Start after pulse (1.6s) + split (2.5s) = 4.1s

      return () => {
        if (timeout2) clearTimeout(timeout2);
        if (timeout3) clearTimeout(timeout3);
        if (splitTimeout) clearTimeout(splitTimeout);
      };
    }, 100); // Small delay to ensure component is ready

    return () => {
      clearTimeout(initTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - shared values are stable

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
        // Hide after animation completes (run on JS thread)
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

  // Sphere 1 animated style
  const sphere1Style = useAnimatedStyle(() => {
    const translateX = interpolate(sphere1X.value, [0, 1], [0, SCREEN_WIDTH * 0.2]);
    const translateY = interpolate(sphere1Y.value, [0, 1], [0, SCREEN_HEIGHT * 0.2]);
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  // Sphere 2 animated style
  const sphere2Style = useAnimatedStyle(() => {
    const translateX = interpolate(sphere2X.value, [0, 1], [0, -SCREEN_WIDTH * 0.2]);
    const translateY = interpolate(sphere2Y.value, [0, 1], [0, -SCREEN_HEIGHT * 0.2]);
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  // Sphere 3 animated style
  const sphere3Style = useAnimatedStyle(() => {
    const translateX = interpolate(sphere3X.value, [0, 1], [0, SCREEN_WIDTH * 0.1]);
    const translateY = interpolate(sphere3Y.value, [0, 1], [0, -SCREEN_HEIGHT * 0.1]);
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  // Logo animated style
  const logoStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
    };
  });

  // Circle 1 animated path (moves left as it splits)
  // Start at center x=96, move to left position x=76
  const circle1AnimatedProps = useAnimatedProps(() => {
    'worklet';
    const centerX = interpolate(
      circleSplitProgress.value,
      [0, 1],
      [96, 76] // Start at center, move to left
    );
    // Apply pulse scale to the path (only when merged, i.e., splitProgress < 0.1)
    const isMerged = circleSplitProgress.value < 0.1;
    const scale = isMerged ? circlePulseScale.value : 1;
    // Scale the circle path around its center
    const scaledX = centerX;
    const scaledSize = 48 * scale; // Scale the radius
    const scaledControl = 32 * scale;
    // Path for circle centered at scaledX with scaled size
    const d = `M${scaledX} ${96 - scaledSize} C ${scaledX + scaledControl} ${96 - scaledSize}, ${scaledX + scaledSize} ${96 - scaledControl}, ${scaledX + scaledSize} ${96} C ${scaledX + scaledSize} ${96 + scaledControl}, ${scaledX + scaledControl} ${96 + scaledSize}, ${scaledX} ${96 + scaledSize} C ${scaledX - scaledControl} ${96 + scaledSize}, ${scaledX - scaledSize} ${96 + scaledControl}, ${scaledX - scaledSize} ${96} C ${scaledX - scaledSize} ${96 - scaledControl}, ${scaledX - scaledControl} ${96 - scaledSize}, ${scaledX} ${96 - scaledSize} Z`;
    return { d } as any;
  });

  // Circle 2 animated path (moves right as it splits)
  // Start at center x=96, move to right position x=116
  const circle2AnimatedProps = useAnimatedProps(() => {
    'worklet';
    const centerX = interpolate(
      circleSplitProgress.value,
      [0, 1],
      [96, 116] // Start at center, move to right
    );
    // Apply pulse scale to the path (only when merged, i.e., splitProgress < 0.1)
    const isMerged = circleSplitProgress.value < 0.1;
    const scale = isMerged ? circlePulseScale.value : 1;
    // Scale the circle path around its center
    const scaledX = centerX;
    const scaledSize = 48 * scale; // Scale the radius
    const scaledControl = 32 * scale;
    // Path for circle centered at scaledX with scaled size
    const d = `M${scaledX} ${96 - scaledSize} C ${scaledX + scaledControl} ${96 - scaledSize}, ${scaledX + scaledSize} ${96 - scaledControl}, ${scaledX + scaledSize} ${96} C ${scaledX + scaledSize} ${96 + scaledControl}, ${scaledX + scaledControl} ${96 + scaledSize}, ${scaledX} ${96 + scaledSize} C ${scaledX - scaledControl} ${96 + scaledSize}, ${scaledX - scaledSize} ${96 + scaledControl}, ${scaledX - scaledSize} ${96} C ${scaledX - scaledSize} ${96 - scaledControl}, ${scaledX - scaledControl} ${96 - scaledSize}, ${scaledX} ${96 - scaledSize} Z`;
    return { d } as any;
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
        <LinearGradient
          colors={['#101A3D', '#2d4b81']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Animated Spheres */}
        <View style={styles.sphereContainer}>
          {/* Sphere 1 */}
          <Animated.View style={[styles.sphere1, sphere1Style]}>
            <LinearGradient
              colors={['rgba(200, 220, 255, 0.2)', 'rgba(108, 170, 223, 0.1)', 'rgba(16, 26, 61, 0)']}
              style={styles.sphereGradient}
            />
          </Animated.View>

          {/* Sphere 2 */}
          <Animated.View style={[styles.sphere2, sphere2Style]}>
            <LinearGradient
              colors={['rgba(200, 220, 255, 0.2)', 'rgba(108, 170, 223, 0.1)', 'rgba(16, 26, 61, 0)']}
              style={styles.sphereGradient}
            />
          </Animated.View>

          {/* Sphere 3 */}
          <Animated.View style={[styles.sphere3, sphere3Style]}>
            <LinearGradient
              colors={['rgba(200, 220, 255, 0.2)', 'rgba(108, 170, 223, 0.1)', 'rgba(16, 26, 61, 0)']}
              style={styles.sphereGradient}
            />
          </Animated.View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <Svg width={192} height={192} viewBox="0 0 192 192">
              <Defs>
                <SvgLinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#F0F4F8" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#A8C5E2" stopOpacity="1" />
                </SvgLinearGradient>
                <SvgLinearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#F0F4F8" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#A8C5E2" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <G opacity="0.9">
                {/* Circle 1 - animated path (splits left) */}
                <AnimatedPath
                  animatedProps={circle1AnimatedProps}
                  fill="url(#grad1)"
                />
                {/* Circle 2 - animated path (splits right) */}
                <AnimatedPath
                  animatedProps={circle2AnimatedProps}
                  fill="url(#grad2)"
                />
              </G>
            </Svg>
          </Animated.View>

          <Text style={styles.title}>Closure</Text>
          <Text style={styles.subtitle}>Embrace your new beginning.</Text>
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
  sphereContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  sphere1: {
    position: 'absolute',
    width: 300,
    height: 300,
    top: '10%',
    left: '5%',
    borderRadius: 150,
  },
  sphere2: {
    position: 'absolute',
    width: 350,
    height: 350,
    bottom: '5%',
    right: '10%',
    borderRadius: 175,
  },
  sphere3: {
    position: 'absolute',
    width: 250,
    height: 250,
    top: '60%',
    left: '20%',
    borderRadius: 125,
  },
  sphereGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  content: {
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  logoContainer: {
    width: 192,
    height: 192,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#F0F4F8',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 40,
    ...Platform.select({
      web: {
        fontFamily: 'Montserrat, sans-serif',
      },
      default: {
        fontFamily: Platform.select({
          ios: 'System',
          android: 'sans-serif-medium',
        }),
      },
    }),
  },
  subtitle: {
    color: 'rgba(240, 244, 248, 0.7)',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    marginTop: 8,
    ...Platform.select({
      web: {
        fontFamily: 'Montserrat, sans-serif',
      },
      default: {
        fontFamily: Platform.select({
          ios: 'System',
          android: 'sans-serif',
        }),
      },
    }),
  },
});

