import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
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

  // Avatar animations
  const avatarScale = useSharedValue(0);
  const avatarOpacity = useSharedValue(0);
  
  // Text animations
  const textOpacity = useSharedValue(0);
  
  // Floating elements animations - 3 small spheres
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

    // Step 2: Floating elements pop out from center (800ms delay, 600ms duration)
    const popOutDelay = 600;
    
    // Element 1 - pops out and starts orbiting
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
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        if (finished) {
          // Start orbiting after pop out completes
          floatingElement1.orbitAngle.value = withRepeat(
            withTiming(360, {
              duration: 4000,
              easing: Easing.linear,
            }),
            -1,
            false
          );
        }
      })
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
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        if (finished) {
          floatingElement2.orbitAngle.value = withRepeat(
            withTiming(360, {
              duration: 4500, // Slightly different speed for variety
              easing: Easing.linear,
            }),
            -1,
            false
          );
        }
      })
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
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        if (finished) {
          floatingElement3.orbitAngle.value = withRepeat(
            withTiming(360, {
              duration: 5000, // Different speed for variety
              easing: Easing.linear,
            }),
            -1,
            false
          );
        }
      })
    );

    // Step 3: Text appears after elements start orbiting (2000ms delay)
    textOpacity.value = withDelay(2000, withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    }));

    // Step 4: Mark animation as complete after text appears (3000ms total)
    const completeTimeout = setTimeout(() => {
      runOnJS(setIsAnimationComplete)(true);
    }, 3000);

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

  // Floating element 1 animated style
  const floatingElement1Style = useAnimatedStyle(() => {
    const radius = 120; // Orbit radius - increased from 80 to move elements further
    const popOutRadius = interpolate(floatingElement1.popOutProgress.value, [0, 1], [0, radius]);
    const angle = (floatingElement1.orbitAngle.value * Math.PI) / 180; // Convert to radians
    const baseAngle = 0; // Start at top
    
    const x = Math.sin(baseAngle + angle) * popOutRadius;
    const y = -Math.cos(baseAngle + angle) * popOutRadius;
    
    return {
      opacity: floatingElement1.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement1.scale.value },
      ],
    };
  });

  // Floating element 2 animated style
  const floatingElement2Style = useAnimatedStyle(() => {
    const radius = 120; // Orbit radius - increased from 80
    const popOutRadius = interpolate(floatingElement2.popOutProgress.value, [0, 1], [0, radius]);
    const angle = (floatingElement2.orbitAngle.value * Math.PI) / 180;
    const baseAngle = (120 * Math.PI) / 180; // 120 degrees offset
    
    const x = Math.sin(baseAngle + angle) * popOutRadius;
    const y = -Math.cos(baseAngle + angle) * popOutRadius;
    
    return {
      opacity: floatingElement2.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement2.scale.value },
      ],
    };
  });

  // Floating element 3 animated style
  const floatingElement3Style = useAnimatedStyle(() => {
    const radius = 120; // Orbit radius - increased from 80
    const popOutRadius = interpolate(floatingElement3.popOutProgress.value, [0, 1], [0, radius]);
    const angle = (floatingElement3.orbitAngle.value * Math.PI) / 180;
    const baseAngle = (240 * Math.PI) / 180; // 240 degrees offset
    
    const x = Math.sin(baseAngle + angle) * popOutRadius;
    const y = -Math.cos(baseAngle + angle) * popOutRadius;
    
    return {
      opacity: floatingElement3.opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: floatingElement3.scale.value },
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
            <LinearGradient
              colors={['#101A3D', '#2d4b81']}
              style={StyleSheet.absoluteFill}
            />
            
            {/* Content */}
            <View style={styles.content}>
              {/* Avatar Container with Floating Elements */}
              <View style={styles.avatarContainer}>
                {/* Central Avatar */}
                <Animated.View style={[styles.avatarWrapper, avatarAnimatedStyle]}>
                  <LinearGradient
                    colors={['rgba(14, 165, 233, 0.3)', 'rgba(14, 165, 233, 0.15)', 'rgba(14, 165, 233, 0.05)']}
                    style={styles.avatar}
                  >
                    <View style={styles.avatarInner}>
                      <MaterialIcons name="person" size={40} color="rgba(255, 215, 0, 0.9)" />
                    </View>
                  </LinearGradient>
                </Animated.View>

                {/* Floating Element 1 - Relationships (Heart) */}
                <Animated.View style={[styles.floatingElement, floatingElement1Style]}>
                  <LinearGradient
                    colors={['rgba(255, 150, 150, 0.4)', 'rgba(255, 150, 150, 0.2)', 'rgba(255, 150, 150, 0.05)']}
                    style={styles.floatingElementInner}
                  >
                    <MaterialIcons name="favorite" size={40} color="rgba(255, 180, 180, 0.9)" />
                  </LinearGradient>
                </Animated.View>

                {/* Floating Element 2 - Career (Briefcase) */}
                <Animated.View style={[styles.floatingElement, floatingElement2Style]}>
                  <LinearGradient
                    colors={['rgba(150, 200, 255, 0.4)', 'rgba(150, 200, 255, 0.2)', 'rgba(150, 200, 255, 0.05)']}
                    style={styles.floatingElementInner}
                  >
                    <MaterialIcons name="work" size={40} color="rgba(180, 220, 255, 0.9)" />
                  </LinearGradient>
                </Animated.View>

                {/* Floating Element 3 - Family */}
                <Animated.View style={[styles.floatingElement, floatingElement3Style]}>
                  <LinearGradient
                    colors={['rgba(200, 150, 255, 0.4)', 'rgba(200, 150, 255, 0.2)', 'rgba(200, 150, 255, 0.05)']}
                    style={styles.floatingElementInner}
                  >
                    <MaterialIcons name="family-restroom" size={40} color="rgba(220, 180, 255, 0.9)" />
                  </LinearGradient>
                </Animated.View>
              </View>

              {/* Quote Text */}
              <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                <Text style={styles.quote}>
                  Live spherically — in many directions
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
    width: 360, // Increased to accommodate larger orbit radius (120 * 2 + 120 avatar = 360)
    height: 360,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    position: 'relative',
  },
  avatarWrapper: {
    width: 80, // Real size matching baseAvatarSize from main screen
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 80, // Real size matching baseAvatarSize from main screen
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
    width: 80, // Real size matching sphereSize from main screen
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingElementInner: {
    width: 80, // Real size matching sphereSize from main screen
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
    color: 'rgba(240, 244, 248, 0.9)',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
    textAlign: 'center',
    fontStyle: 'italic',
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
