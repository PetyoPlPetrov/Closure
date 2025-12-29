import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { FloatingActionButton } from '@/library/components/floating-action-button';
import { logMomentCreated } from '@/utils/analytics';
import { useInAppNotification } from '@/utils/InAppNotificationProvider';
import { useJourney, type LifeSphere } from '@/utils/JourneyProvider';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import { getLifeLessonPlaceholder } from '@/utils/life-lessons';
import {
  getHardTruthSuggestion,
  getGoodFactSuggestion,
  getLessonSuggestion
} from '@/utils/moment-suggestions';
import { updateStreakOnMemoryCreation } from '@/utils/streak-manager';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Defs, Path, RadialGradient, Stop, Svg, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Blinking cursor indicator component
function CursorBlinkIndicator({ style, opacity }: { style: any; opacity: any }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animatedStyle]} />;
}

// Animated TextInput wrapper that animates border width and scale
function AnimatedTitleInput({ 
  borderWidth, 
  isFocused,
  pulseScale,
  ...props 
}: { 
  borderWidth: any; 
  isFocused: boolean;
  pulseScale?: any;
  [key: string]: any;
}) {
  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderWidth: isFocused ? borderWidth.value : 1,
  }));
  
  const animatedScaleStyle = useAnimatedStyle(() => {
    return {
      transform: pulseScale ? [{ scale: pulseScale.value }] : [],
    };
  });
  

  return (
    <Animated.View style={animatedScaleStyle}>
      <AnimatedTextInput
        {...props}
        style={[
          props.style,
          isFocused && animatedBorderStyle,
        ]}
      />
    </Animated.View>
  );
}

// Animated Cloud Component
function AnimatedCloud({
  cloud,
  panHandlers,
  styles,
  onTextChange,
  onAnimationComplete,
  onDelete,
  onRegisterAnimatedValues,
  colors,
  cloudWidth,
  cloudHeight,
  placeholder,
  viewOnly = false,
  inputRef,
  shouldAutoFocus = false,
}: {
  cloud: { id: string; text: string; x: number; y: number; startX?: number; startY?: number; placeholder?: string };
  panHandlers: any;
  styles: any;
  onTextChange: (id: string, text: string) => void;
  onAnimationComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onRegisterAnimatedValues: (id: string, translateX: any, translateY: any) => void;
  colors: typeof Colors.light | typeof Colors.dark;
  cloudWidth: number;
  cloudHeight: number;
  placeholder: string;
  viewOnly?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  shouldAutoFocus?: boolean;
}) {
  // Animation values
  const translateX = useSharedValue(cloud.startX !== undefined ? cloud.startX : cloud.x);
  const translateY = useSharedValue(cloud.startY !== undefined ? cloud.startY : cloud.y);
  const opacity = useSharedValue(cloud.startX !== undefined ? 0 : 1);
  const scale = useSharedValue(cloud.startX !== undefined ? 0.3 : 1);
  const isAnimating = useRef(false);

  // Apply placeholder handler
  const handleApplyPlaceholder = () => {
    if (cloud.placeholder) {
      onTextChange(cloud.id, cloud.placeholder);
    }
    // Blur the input after applying placeholder
    if (inputRef?.current) {
      inputRef.current.blur();
    }
  };

  // Show icon immediately when cloud is empty and has placeholder (no delay)
  const showApplyIcon = !cloud.text && cloud.placeholder && !viewOnly;

  // Register animated values so PanResponder can access current position
  useEffect(() => {
    onRegisterAnimatedValues(cloud.id, translateX, translateY);
  }, [cloud.id, translateX, translateY, onRegisterAnimatedValues]);

  // Focus input immediately if auto-focus is enabled and there's no animation
  useEffect(() => {
    if (shouldAutoFocus && inputRef?.current && cloud.startX === undefined && cloud.startY === undefined) {
      // No animation, focus immediately
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [shouldAutoFocus, inputRef, cloud.startX, cloud.startY]);

  // Animate to final position when cloud is created
  useEffect(() => {
    if (cloud.startX !== undefined && cloud.startY !== undefined && !isAnimating.current) {
      isAnimating.current = true;
      // Start animation
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      translateX.value = withSpring(cloud.x, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      translateY.value = withSpring(cloud.y, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      
      // Clear start positions after animation completes (approximate timing)
      setTimeout(() => {
        isAnimating.current = false;
        onAnimationComplete(cloud.id);
        // Focus the input after animation completes if auto-focus is enabled
        if (shouldAutoFocus && inputRef?.current) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      }, 1000);
    }
  }, [cloud.id, cloud.startX, cloud.startY, cloud.x, cloud.y, opacity, scale, translateX, translateY, onAnimationComplete, shouldAutoFocus, inputRef]);

  // Sync position during drag (update immediately without animation)
  useAnimatedReaction(
    () => ({ x: cloud.x, y: cloud.y, hasStart: cloud.startX !== undefined }),
    (current, previous) => {
      // Only sync if not in initial animation phase
      if (!current.hasStart && (!previous || previous.x !== current.x || previous.y !== current.y)) {
        translateX.value = current.x;
        translateY.value = current.y;
      }
    }
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      {...panHandlers}
      style={[
        styles.cloudContainer,
        {
          top: 0,
          left: 0,
        },
        animatedStyle,
      ]}
    >
      <Svg 
        width={cloudWidth} 
        height={cloudHeight} 
        viewBox="0 0 320 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute' }}
      >
        <Defs>
          <SvgLinearGradient id={`cloudGradient-${cloud.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
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
          fill={`url(#cloudGradient-${cloud.id})`}
          stroke="rgba(0,0,0,0.7)"
          strokeWidth={1.5}
        />
      </Svg>
      {/* Delete button - top right corner - hidden in view-only mode */}
      {!viewOnly && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(cloud.id)}
          onPressIn={(e) => e.stopPropagation()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <View style={styles.deleteBadge}>
            <View style={styles.deleteLine} />
          </View>
        </TouchableOpacity>
      )}

      <View
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
      >
        <TextInput
          ref={inputRef}
          value={cloud.text}
          onChangeText={(text) => {
            if (!viewOnly && text.length <= 50) {
              onTextChange(cloud.id, text);
            }
          }}
          style={styles.cloudTextInput}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          maxLength={50}
          editable={!viewOnly}
          autoFocus={shouldAutoFocus}
        />
        {/* Apply icon - shown in top right when placeholder is visible */}
        {showApplyIcon && (
          <TouchableOpacity
            onPress={handleApplyPlaceholder}
            style={{
              position: 'absolute',
              top: 10,
              right: 20,
              backgroundColor: colors.primary,
              borderRadius: 12,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1001,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="check" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// Animated Sun Component
function AnimatedSun({
  sun,
  panHandlers,
  styles,
  onTextChange,
  onAnimationComplete,
  onDelete,
  onRegisterAnimatedValues,
  colors,
  sunWidth,
  sunHeight,
  placeholder,
  viewOnly = false,
  inputRef,
  shouldAutoFocus = false,
}: {
  sun: { id: string; text: string; x: number; y: number; startX?: number; startY?: number; placeholder?: string };
  panHandlers: any;
  styles: any;
  onTextChange: (id: string, text: string) => void;
  onAnimationComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onRegisterAnimatedValues: (id: string, translateX: any, translateY: any) => void;
  colors: typeof Colors.light | typeof Colors.dark;
  sunWidth: number;
  sunHeight: number;
  placeholder: string;
  viewOnly?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  shouldAutoFocus?: boolean;
}) {
  // Animation values
  const translateX = useSharedValue(sun.startX !== undefined ? sun.startX : sun.x);
  const translateY = useSharedValue(sun.startY !== undefined ? sun.startY : sun.y);
  const opacity = useSharedValue(sun.startX !== undefined ? 0 : 1);
  const scale = useSharedValue(sun.startX !== undefined ? 0.3 : 1);
  const isAnimating = useRef(false);

  // Apply placeholder handler
  const handleApplyPlaceholder = () => {
    if (sun.placeholder) {
      onTextChange(sun.id, sun.placeholder);
    }
    // Blur the input after applying placeholder
    if (inputRef?.current) {
      inputRef.current.blur();
    }
  };

  // Show icon immediately when sun is empty and has placeholder (no delay)
  const showApplyIcon = !sun.text && sun.placeholder && !viewOnly;

  // Register animated values so PanResponder can access current position
  useEffect(() => {
    onRegisterAnimatedValues(sun.id, translateX, translateY);
  }, [sun.id, translateX, translateY, onRegisterAnimatedValues]);

  // Focus input immediately if auto-focus is enabled and there's no animation
  useEffect(() => {
    if (shouldAutoFocus && inputRef?.current && sun.startX === undefined && sun.startY === undefined) {
      // No animation, focus immediately
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [shouldAutoFocus, inputRef, sun.startX, sun.startY]);

  // Animate to final position when sun is created
  useEffect(() => {
    if (sun.startX !== undefined && sun.startY !== undefined && !isAnimating.current) {
      isAnimating.current = true;
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      translateX.value = withSpring(sun.x, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      translateY.value = withSpring(sun.y, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      
      setTimeout(() => {
        isAnimating.current = false;
        onAnimationComplete(sun.id);
        // Focus the input after animation completes if auto-focus is enabled
        if (shouldAutoFocus && inputRef?.current) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      }, 1000);
    }
  }, [sun.id, sun.startX, sun.startY, sun.x, sun.y, opacity, scale, translateX, translateY, onAnimationComplete, shouldAutoFocus, inputRef]);

  // Sync position during drag
  useAnimatedReaction(
    () => ({ x: sun.x, y: sun.y, hasStart: sun.startX !== undefined }),
    (current, previous) => {
      if (!current.hasStart && (!previous || previous.x !== current.x || previous.y !== current.y)) {
        translateX.value = current.x;
        translateY.value = current.y;
      }
    }
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      {...panHandlers}
      style={[
        styles.sunContainer,
        {
          top: 0,
          left: 0,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: sunWidth,
          height: sunHeight,
          // Golden glow for suns (positive moments)
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Svg
          width={sunWidth}
          height={sunHeight}
          viewBox="0 0 160 160"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Defs>
            <RadialGradient
              id={`sunGradient-${sun.id}`}
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
          {/* Sun rays - triangular rays */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 360) / 12;
            const radian = (angle * Math.PI) / 180;
            const centerX = 80;
            const centerY = 80;
            const innerRadius = 48;
            const outerRadius = 72;
            const rayWidth = 3;

            // Calculate triangle points
            const innerX = centerX + Math.cos(radian) * innerRadius;
            const innerY = centerY + Math.sin(radian) * innerRadius;

            const outerX = centerX + Math.cos(radian) * outerRadius;
            const outerY = centerY + Math.sin(radian) * outerRadius;

            // Perpendicular vector for triangle width
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
            fill={`url(#sunGradient-${sun.id})`}
          />
        </Svg>
      </View>
      {/* Delete button - top right corner - hidden in view-only mode */}
      {!viewOnly && (
        <TouchableOpacity
          style={styles.sunDeleteButton}
          onPress={() => onDelete(sun.id)}
          onPressIn={(e) => e.stopPropagation()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <View style={styles.deleteBadge}>
            <View style={styles.deleteLine} />
          </View>
        </TouchableOpacity>
      )}

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: sunWidth,
          height: sunHeight,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextInput
          ref={inputRef}
          value={sun.text}
          onChangeText={(text) => {
            if (!viewOnly && text.length <= 80) {
              onTextChange(sun.id, text);
            }
          }}
          style={[styles.sunTextInput, {
            fontSize: 12,
            fontWeight: '700',
            textAlign: 'center',
            textAlignVertical: 'center',
            // Calculate width to fit within the inner circle (radius 48 in viewBox 160)
            // Inner circle diameter = (sunWidth / 160) * 96
            // Use 80% of diameter for safe text area
            width: (sunWidth / 160) * 96 * 0.8,
            // Use maxHeight instead of height to allow text to size naturally
            // Container's justifyContent: 'center' will handle vertical centering
            maxHeight: (sunHeight / 160) * 96 * 0.8,
            padding: 0,
            margin: 0,
          }]}
          includeFontPadding={false}
          placeholder={placeholder}
          placeholderTextColor="rgba(0,0,0,0.5)"
          multiline
          numberOfLines={4}
          maxLength={80}
          editable={!viewOnly}
          autoFocus={shouldAutoFocus}
        />
        {/* Apply icon - shown in top right when placeholder is visible */}
        {showApplyIcon && (
          <TouchableOpacity
            onPress={handleApplyPlaceholder}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: colors.primary,
              borderRadius: 12,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1001,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="check" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// Animated Lesson Component (Lightbulb)
function AnimatedLesson({
  lesson,
  panHandlers,
  styles,
  onTextChange,
  onAnimationComplete,
  onDelete,
  onRegisterAnimatedValues,
  colors,
  colorScheme,
  lessonWidth,
  lessonHeight,
  placeholder,
  viewOnly = false,
  inputRef,
  shouldAutoFocus = false,
}: {
  lesson: { id: string; text: string; x: number; y: number; startX?: number; startY?: number };
  panHandlers: any;
  styles: any;
  onTextChange: (id: string, text: string) => void;
  onAnimationComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onRegisterAnimatedValues: (id: string, translateX: any, translateY: any) => void;
  colors: typeof Colors.light | typeof Colors.dark;
  colorScheme: 'light' | 'dark' | null;
  lessonWidth: number;
  lessonHeight: number;
  placeholder: string;
  viewOnly?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  shouldAutoFocus?: boolean;
}) {
  // Animation values
  const translateX = useSharedValue(lesson.startX !== undefined ? lesson.startX : lesson.x);
  const translateY = useSharedValue(lesson.startY !== undefined ? lesson.startY : lesson.y);
  const opacity = useSharedValue(lesson.startX !== undefined ? 0 : 1);
  const scale = useSharedValue(lesson.startX !== undefined ? 0.3 : 1);
  const isAnimating = useRef(false);
  
  // Extract the actual lesson text from placeholder (remove "Ex.: " prefix)
  const getPlaceholderText = () => {
    if (placeholder.startsWith('Ex.: ')) {
      return placeholder.substring(5); // Remove "Ex.: " prefix
    }
    return placeholder;
  };

  const handleApplyPlaceholder = () => {
    const actualText = getPlaceholderText();
    onTextChange(lesson.id, actualText);
    // Blur the input after applying
    if (inputRef?.current) {
      inputRef.current.blur();
    }
  };

  // Show icon immediately when lesson is empty and has placeholder (no delay)
  const showApplyIcon = !lesson.text && placeholder && !viewOnly;

  // Register animated values so PanResponder can access current position
  useEffect(() => {
    onRegisterAnimatedValues(lesson.id, translateX, translateY);
  }, [lesson.id, translateX, translateY, onRegisterAnimatedValues]);

  // Focus input immediately if auto-focus is enabled and there's no animation
  useEffect(() => {
    if (shouldAutoFocus && inputRef?.current && lesson.startX === undefined && lesson.startY === undefined) {
      // No animation, focus immediately
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [shouldAutoFocus, inputRef, lesson.startX, lesson.startY]);

  // Animate to final position when lesson is created
  useEffect(() => {
    if (lesson.startX !== undefined && lesson.startY !== undefined && !isAnimating.current) {
      isAnimating.current = true;
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      translateX.value = withSpring(lesson.x, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      translateY.value = withSpring(lesson.y, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });

      setTimeout(() => {
        isAnimating.current = false;
        onAnimationComplete(lesson.id);
        // Focus the input after animation completes if auto-focus is enabled
        if (shouldAutoFocus && inputRef?.current) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      }, 1000);
    }
  }, [lesson.id, lesson.startX, lesson.startY, lesson.x, lesson.y, opacity, scale, translateX, translateY, onAnimationComplete, shouldAutoFocus, inputRef]);

  // Sync position during drag
  useAnimatedReaction(
    () => ({ x: lesson.x, y: lesson.y, hasStart: lesson.startX !== undefined }),
    (current, previous) => {
      if (!current.hasStart && (!previous || previous.x !== current.x || previous.y !== current.y)) {
        translateX.value = current.x;
        translateY.value = current.y;
      }
    }
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      {...panHandlers}
      style={[
        styles.lessonContainer,
        {
          top: 0,
          left: 0,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['#FFD700', '#FFA000']  // Gold gradient
            : ['#FFE082', '#FFB300']  // Lighter gold gradient
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: lessonWidth,
          height: lessonWidth, // Square
          borderRadius: lessonWidth / 2, // Perfect circle
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          padding: 8,
        }}
      >
        <MaterialIcons
          name="lightbulb"
          size={lessonWidth * 0.35}
          color={colorScheme === 'dark' ? '#000000' : '#1A1A1A'}
          style={{ marginBottom: 4 }}
        />
        <View style={{ position: 'relative', width: '100%', alignItems: 'center' }}>
          <TextInput
            ref={inputRef}
            style={{
              color: colorScheme === 'dark' ? '#000000' : '#1A1A1A',
              fontSize: 11,
              textAlign: 'center',
              fontWeight: '700',
              maxWidth: lessonWidth * 0.85,
              minHeight: 30,
              lineHeight: 14,
            }}
            value={lesson.text}
            onChangeText={(text) => onTextChange(lesson.id, text)}
            placeholder={placeholder}
            placeholderTextColor={(colorScheme === 'dark' ? '#000000' : '#1A1A1A') + '80'}
            multiline
            numberOfLines={5}
            editable={!viewOnly}
          />
          {/* Apply icon - shown in top right when placeholder is visible and focused */}
          {showApplyIcon && (
            <TouchableOpacity
              onPress={handleApplyPlaceholder}
              style={{
                position: 'absolute',
                top: -8,
                right: lessonWidth * 0.05,
                backgroundColor: colors.primary,
                borderRadius: 12,
                width: 24,
                height: 24,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1001,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="check" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Delete button - positioned outside the circle */}
      {!viewOnly && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: colors.error,
            borderRadius: 12,
            width: 24,
            height: 24,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001,
          }}
          onPress={() => onDelete(lesson.id)}
        >
          <MaterialIcons name="close" size={16} color="#ffffff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function AddIdealizedMemoryScreen() {
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth, isLargeDevice } = useLargeDevice();
  
  // Cloud dimensions - larger on large devices
  const cloudWidth = isLargeDevice ? 480 : 320; // 1.5x on large devices
  const cloudHeight = isLargeDevice ? 150 : 100; // 1.5x on large devices
  
  // Sun dimensions - smaller than clouds
  const sunWidth = isLargeDevice ? 150 : 100;
  const sunHeight = isLargeDevice ? 150 : 100;
  const params = useLocalSearchParams();
  const { addIdealizedMemory, updateIdealizedMemory, getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId } = useJourney();
  const t = useTranslate();
  const { language } = useLanguage();
  const { showNotification } = useInAppNotification();

  // Support both old (profileId) and new (entityId + sphere) parameters
  // Handle params that might be strings or arrays (expo-router can return arrays)
  const profileId = Array.isArray(params.profileId) ? params.profileId[0] : (params.profileId as string | undefined);
  const entityId = Array.isArray(params.entityId) ? params.entityId[0] : (params.entityId as string | undefined);
  const sphere = Array.isArray(params.sphere) ? params.sphere[0] as LifeSphere : (params.sphere as LifeSphere | undefined);
  const memoryId = Array.isArray(params.memoryId) ? params.memoryId[0] : (params.memoryId as string | undefined);
  const viewOnly = (Array.isArray(params.viewOnly) ? params.viewOnly[0] : params.viewOnly) === 'true';
  const isEditMode = memoryId !== undefined;
  
  // Determine which mode we're in: new (entityId + sphere) or old (profileId)
  const isNewMode = !!(entityId && sphere);
  const finalEntityId = entityId || profileId;
  const finalSphere = sphere || 'relationships';
  
  // Get existing memory if editing - use new API if entityId and sphere are provided
  const existingMemories = isNewMode
    ? getIdealizedMemoriesByEntityId(entityId!, sphere!)
    : profileId 
    ? getIdealizedMemoriesByProfileId(profileId) 
    : [];
  const existingMemory = memoryId ? existingMemories.find(m => m.id === memoryId) : null;

  // Redirect if we don't have either profileId or (entityId + sphere)
  useEffect(() => {
    const hasOldMode = !!profileId;
    const hasNewMode = !!(entityId && sphere);
    
    if (!hasOldMode && !hasNewMode) {
      alert(t('error.missingParameters'));
      isNavigatingAway.current = true;
      router.back();
    }
  }, [entityId, profileId, sphere]);

  // 🔥 Two-way binding
  const [memoryLabel, setMemoryLabel] = useState(existingMemory?.title || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(existingMemory?.imageUri || null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  
  // Animated cursor opacity for blinking effect
  const cursorOpacity = useSharedValue(1);
  
  // Pulse animation for border width
  const borderWidth = useSharedValue(1);
  
  // Pulse animation for title field when user tries to add moment without title
  const titlePulseScale = useSharedValue(1);

  // Button press animations for moment type buttons
  const cloudButtonPressScale = useSharedValue(1);
  const sunButtonPressScale = useSharedValue(1);
  const lightbulbButtonPressScale = useSharedValue(1);

  // Cancel animation on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(titlePulseScale);
      titlePulseScale.value = 1;
    };
  }, [titlePulseScale]);
  
  // Start blinking cursor animation when focused
  useEffect(() => {
    if (isTitleFocused) {
      cursorOpacity.value = withRepeat(
        withTiming(0, { duration: 500 }),
        -1,
        true
      );
      borderWidth.value = 2.5; // Static border width when focused
    } else {
      cursorOpacity.value = withTiming(0, { duration: 200 });
      borderWidth.value = 1;
    }
  }, [isTitleFocused, cursorOpacity, borderWidth]);
  
  // Track initial state for unsaved changes detection
  const initialMemoryLabel = useRef(existingMemory?.title || '');
  const initialSelectedImage = useRef(existingMemory?.imageUri || null);
  // Cloud bubbles state - array of clouds with position and animation
  const [clouds, setClouds] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    startX?: number;
    startY?: number;
    placeholder?: string;
  }[]>([]);

  // Sun elements state - array of suns with position and animation (for good facts)
  const [suns, setSuns] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    startX?: number;
    startY?: number;
    placeholder?: string;
  }[]>([]);

  // Lessons learned state - array of lightbulbs with position and animation
  const [lessons, setLessons] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    startX?: number;
    startY?: number;
    placeholder?: string;
  }[]>([]);

  const initialClouds = useRef<typeof clouds>([]);
  const initialSuns = useRef<typeof suns>([]);
  const initialLessons = useRef<typeof lessons>([]);
  
  // Navigation hook for intercepting back navigation
  const navigation = useNavigation();
  const isNavigatingAway = useRef(false);
  
  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Check if title changed
    if (memoryLabel.trim() !== initialMemoryLabel.current.trim()) {
      return true;
    }
    
    // Check if image changed
    if (selectedImage !== initialSelectedImage.current) {
      return true;
    }
    
    // Check if clouds changed (count, text, or positions)
    if (clouds.length !== initialClouds.current.length) {
      return true;
    }
    
    // Check if cloud text or positions changed
    for (const cloud of clouds) {
      const initialCloud = initialClouds.current.find(c => c.id === cloud.id);
      if (!initialCloud) {
        return true; // New cloud added
      }
      if (cloud.text.trim() !== initialCloud.text.trim() || 
          cloud.x !== initialCloud.x || 
          cloud.y !== initialCloud.y) {
        return true;
      }
    }
    
    // Check if any initial cloud was deleted
    for (const initialCloud of initialClouds.current) {
      if (!clouds.find(c => c.id === initialCloud.id)) {
        return true;
      }
    }
    
    // Check if suns changed (count, text, or positions)
    if (suns.length !== initialSuns.current.length) {
      return true;
    }
    
    // Check if sun text or positions changed
    for (const sun of suns) {
      const initialSun = initialSuns.current.find(s => s.id === sun.id);
      if (!initialSun) {
        return true; // New sun added
      }
      if (sun.text.trim() !== initialSun.text.trim() || 
          sun.x !== initialSun.x || 
          sun.y !== initialSun.y) {
        return true;
      }
    }
    
    // Check if any initial sun was deleted
    for (const initialSun of initialSuns.current) {
      if (!suns.find(s => s.id === initialSun.id)) {
        return true;
      }
    }

    // Check if lessons changed (count, text, or positions)
    if (lessons.length !== initialLessons.current.length) {
      return true;
    }

    // Check if lesson text or positions changed
    for (const lesson of lessons) {
      const initialLesson = initialLessons.current.find(l => l.id === lesson.id);
      if (!initialLesson) {
        return true; // New lesson added
      }
      if (lesson.text.trim() !== initialLesson.text.trim() ||
          lesson.x !== initialLesson.x ||
          lesson.y !== initialLesson.y) {
        return true;
      }
    }

    // Check if any initial lesson was deleted
    for (const initialLesson of initialLessons.current) {
      if (!lessons.find(l => l.id === initialLesson.id)) {
        return true;
      }
    }

    return false;
  }, [memoryLabel, selectedImage, clouds, suns, lessons]);
  
  // Intercept navigation to show confirmation dialog if there are unsaved changes
  useEffect(() => {
    // Don't intercept navigation in view-only mode
    if (viewOnly) {
      return;
    }
    
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Don't show dialog if we're intentionally navigating away
      if (isNavigatingAway.current) {
        return;
      }
      
      // Don't show dialog if we're saving (navigation is intentional)
      if (isSaving) {
        return;
      }
      
      // Don't show dialog if there are no unsaved changes
      if (!hasUnsavedChanges()) {
        return;
      }
      
      // Prevent default behavior of leaving the screen
      e.preventDefault();
      
      // Show confirmation dialog
      Alert.alert(
        t('memory.unsavedChanges.title'),
        t('memory.unsavedChanges.message'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => {
              // Do nothing, stay on screen
            },
          },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => {
              // Mark as intentionally navigating away
              isNavigatingAway.current = true;
              // Navigate away
              router.back();
            },
          },
        ]
      );
    });
    
    return unsubscribe;
  }, [navigation, hasUnsavedChanges, isSaving, t, viewOnly]);

  // Function to get initial cloud position (center of screen with small random offset)
  const getInitialCloudPosition = useCallback(() => {
    // Get screen dimensions
    const screenW = Dimensions.get('window').width;
    const screenH = Dimensions.get('window').height;
    
    // Center vertically on screen
    const centerY = (screenH / 2) - (cloudHeight / 2);
    
    // Center horizontally on screen
    const centerX = (screenW / 2) - (cloudWidth / 2);
    
    // Add small random offset (5-10 pixels) to prevent exact stacking
    const offsetX = (Math.random() - 0.5) * 10; // -5 to +5 pixels
    const offsetY = (Math.random() - 0.5) * 10; // -5 to +5 pixels
    
    return {
      x: centerX + offsetX,
      y: centerY + offsetY,
    };
  }, [cloudWidth, cloudHeight]);

  // Function to get initial sun position (center of screen with small random offset)
  const getInitialSunPosition = useCallback(() => {
    // Get screen dimensions
    const screenW = Dimensions.get('window').width;
    const screenH = Dimensions.get('window').height;
    const padding = 20;
    
    // Center vertically on screen
    const centerY = (screenH / 2) - (sunHeight / 2);
    
    // Center horizontally on screen
    const centerX = (screenW / 2) - (sunWidth / 2);
    
    // Add small random offset (5-10 pixels) to prevent exact stacking
    const offsetX = (Math.random() - 0.5) * 10; // -5 to +5 pixels
    const offsetY = (Math.random() - 0.5) * 10; // -5 to +5 pixels
    
    // Calculate position with offset
    let x = centerX + offsetX;
    let y = centerY + offsetY;
    
    // Clamp to ensure sun is within viewport
    const minX = padding;
    const maxX = screenW - sunWidth - padding;
    const minY = padding;
    const maxY = screenH - sunHeight - padding;
    
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    
    return {
      x,
      y,
    };
  }, [sunWidth, sunHeight]);

  // Function to get initial lesson position (center of screen with small random offset)
  const getInitialLessonPosition = useCallback(() => {
    // Get screen dimensions
    const screenW = Dimensions.get('window').width;
    const screenH = Dimensions.get('window').height;
    const padding = 20;

    // Lesson dimensions - larger to accommodate template text
    const lessonWidth = isLargeDevice ? 180 : 130;
    const lessonHeight = isLargeDevice ? 180 : 130;

    // Center vertically on screen
    const centerY = (screenH / 2) - (lessonHeight / 2);

    // Center horizontally on screen
    const centerX = (screenW / 2) - (lessonWidth / 2);

    // Add small random offset (5-10 pixels) to prevent exact stacking
    const offsetX = (Math.random() - 0.5) * 10; // -5 to +5 pixels
    const offsetY = (Math.random() - 0.5) * 10; // -5 to +5 pixels

    // Calculate position with offset
    let x = centerX + offsetX;
    let y = centerY + offsetY;

    // Clamp to ensure lesson is within viewport
    const minX = padding;
    const maxX = screenW - lessonWidth - padding;
    const minY = padding;
    const maxY = screenH - lessonHeight - padding;

    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));

    return {
      x,
      y,
    };
  }, [isLargeDevice]);

  // Load existing memory data when editing
  useEffect(() => {
    if (existingMemory) {
      setMemoryLabel(existingMemory.title || '');
      setSelectedImage(existingMemory.imageUri || null);
      initialMemoryLabel.current = existingMemory.title || '';
      initialSelectedImage.current = existingMemory.imageUri || null;
      
      // Initialize clouds from existing memory
      if (existingMemory.hardTruths && existingMemory.hardTruths.length > 0) {
        const screenW = Dimensions.get('window').width;
        const screenH = Dimensions.get('window').height;
        const padding = 20;
        const minX = padding;
        const maxX = screenW - cloudWidth - padding;
        const minY = padding;
        const maxY = screenH - cloudHeight - padding;
        
        const initialCloudsData = existingMemory.hardTruths.map((truth) => {
          // Use saved positions if available, otherwise calculate default position
          if (truth.x !== undefined && truth.y !== undefined) {
            // Clamp saved positions to ensure they're within viewport
            const clampedX = Math.max(minX, Math.min(maxX, truth.x));
            const clampedY = Math.max(minY, Math.min(maxY, truth.y));
            return {
              id: truth.id,
              text: truth.text,
              x: clampedX,
              y: clampedY,
            };
          } else {
            // Fallback to center position if no saved positions
            const initialPos = getInitialCloudPosition();
            return {
              id: truth.id,
              text: truth.text,
              x: initialPos.x,
              y: initialPos.y,
            };
          }
        });
        
        setClouds(initialCloudsData);
        initialClouds.current = initialCloudsData.map(c => ({ ...c }));
      }

      // Initialize suns from existing memory
      if (existingMemory.goodFacts && existingMemory.goodFacts.length > 0) {
        const screenW = Dimensions.get('window').width;
        const screenH = Dimensions.get('window').height;
        const padding = 20;
        const minX = padding;
        const maxX = screenW - sunWidth - padding;
        const minY = padding;
        const maxY = screenH - sunHeight - padding;
        
        const initialSunsData = existingMemory.goodFacts.map((fact) => {
          // Use saved positions if available, otherwise calculate default position
          if (fact.x !== undefined && fact.y !== undefined) {
            // Clamp saved positions to ensure they're within viewport
            const clampedX = Math.max(minX, Math.min(maxX, fact.x));
            const clampedY = Math.max(minY, Math.min(maxY, fact.y));
            return {
              id: fact.id,
              text: fact.text,
              x: clampedX,
              y: clampedY,
            };
          } else {
            // Fallback to center position if no saved positions
            const initialPos = getInitialSunPosition();
            return {
              id: fact.id,
              text: fact.text,
              x: initialPos.x,
              y: initialPos.y,
            };
          }
        });
        
        setSuns(initialSunsData);
        initialSuns.current = initialSunsData.map(s => ({ ...s }));
      }

      // Initialize lessons from existing memory
      if (existingMemory.lessonsLearned && existingMemory.lessonsLearned.length > 0) {
        const screenW = Dimensions.get('window').width;
        const screenH = Dimensions.get('window').height;
        const padding = 20;
        const lessonWidth = isLargeDevice ? 180 : 130;
        const lessonHeight = isLargeDevice ? 180 : 130;
        const minX = padding;
        const maxX = screenW - lessonWidth - padding;
        const minY = padding;
        const maxY = screenH - lessonHeight - padding;

        const initialLessonsData = existingMemory.lessonsLearned.map((lesson) => {
          // Use saved positions if available, otherwise calculate default position
          if (lesson.x !== undefined && lesson.y !== undefined) {
            // Clamp saved positions to ensure they're within viewport
            const clampedX = Math.max(minX, Math.min(maxX, lesson.x));
            const clampedY = Math.max(minY, Math.min(maxY, lesson.y));
            return {
              id: lesson.id,
              text: lesson.text,
              x: clampedX,
              y: clampedY,
            };
          } else {
            // Fallback to center position if no saved positions
            const initialPos = getInitialLessonPosition();
            return {
              id: lesson.id,
              text: lesson.text,
              x: initialPos.x,
              y: initialPos.y,
            };
          }
        });

        setLessons(initialLessonsData);
        initialLessons.current = initialLessonsData.map(l => ({ ...l }));
      }
    } else {
      // New memory - initialize refs with empty state
      initialMemoryLabel.current = '';
      initialSelectedImage.current = null;
      initialClouds.current = [];
      initialSuns.current = [];
      initialLessons.current = [];
    }
  }, [existingMemory, cloudWidth, cloudHeight, sunWidth, sunHeight, getInitialCloudPosition, getInitialSunPosition, getInitialLessonPosition, isLargeDevice]);
  
  // Track button positions for animation
  const plusButtonRef = useRef<View>(null);
  const titleInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const sunButtonRef = useRef<View>(null);
  const lightbulbButtonRef = useRef<View>(null);
  const floatingButtonRef = useRef<View>(null);
  const [plusButtonPos, setPlusButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [sunButtonPos, setSunButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [lightbulbButtonPos, setLightbulbButtonPos] = useState<{ x: number; y: number } | null>(null);

  // Track refs for cloud, sun, and lesson TextInputs to enable auto-focus
  const cloudInputRefs = useRef<Record<string, React.RefObject<TextInput | null>>>({});
  const sunInputRefs = useRef<Record<string, React.RefObject<TextInput | null>>>({});
  const lessonInputRefs = useRef<Record<string, React.RefObject<TextInput | null>>>({});
  
  // Auto-focus title input when screen opens (only for new memories, not view-only)
  useEffect(() => {
    if (!viewOnly && !isEditMode && titleInputRef.current) {
      // Small delay to ensure screen is fully rendered
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [viewOnly, isEditMode]);
  
  // Track the ID of the newly created moment that should be focused
  const [newlyCreatedCloudId, setNewlyCreatedCloudId] = useState<string | null>(null);
  const [newlyCreatedSunId, setNewlyCreatedSunId] = useState<string | null>(null);
  const [newlyCreatedLessonId, setNewlyCreatedLessonId] = useState<string | null>(null);
  
  // Track drag start positions for each cloud
  const dragStart = useRef<Record<string, { x: number; y: number }>>({});
  
  // Track upload container ref (kept for potential future use)
  const containerRef = useRef<View>(null);

  // Store panResponders in a ref to prevent re-creation on each render
  const panResponders = useRef<Record<string, any>>({});

  // Function to pick an image
  const pickImage = async () => {
    setIsLoadingImage(true);
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setIsLoadingImage(false);
        alert(t('error.cameraPermissionRequired'));
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      setIsLoadingImage(false);
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      setIsLoadingImage(false);
      alert(t('error.imagePickFailed'));
    }
  };

  // Function to handle check button press - save the memory
  const handleCheckButtonPress = async () => {
    // Check if we have either old mode (profileId) or new mode (entityId + sphere)
    const hasOldMode = !!profileId;
    const hasNewMode = !!(entityId && sphere);
    
    if (!hasOldMode && !hasNewMode) {
      alert(t('error.missingParameters'));
      return;
    }

    // Check title is required
    if (memoryLabel.trim().length === 0) {
      alert(t('memory.error.titleRequired'));
      return;
    }

    // Check that all created clouds have text (if any exist)
    const allCloudsHaveText = clouds.length === 0 || clouds.every((cloud) => cloud.text.trim().length > 0);
    
    if (!allCloudsHaveText) {
      // Show alert to fill all clouds
      alert(t('memory.fillAllClouds'));
      return;
    }

    // Check that all created suns have text (if any exist)
    const allSunsHaveText = suns.length === 0 || suns.every((sun) => sun.text.trim().length > 0);
    
    if (!allSunsHaveText) {
      // Show alert to fill all suns
      alert(t('memory.fillAllSuns'));
      return;
    }

    // Check that all created lessons have text (if any exist)
    const allLessonsHaveText = lessons.length === 0 || lessons.every((lesson) => lesson.text.trim().length > 0);
    
    if (!allLessonsHaveText) {
      // Show alert to fill all lessons
      alert(t('memory.error.fillAllLessonsBeforeAdding') || 'Please fill all lessons before saving');
      return;
    }

    // Require at least one moment (cloud, sun, or lesson) total
    const totalMoments = clouds.length + suns.length + lessons.length;
    if (totalMoments === 0) {
      alert(t('memory.error.atLeastOneMomentRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const hardTruths = clouds
        .filter(cloud => cloud.text.trim().length > 0)
        .map(cloud => ({
          id: cloud.id,
          text: cloud.text.trim(),
          x: cloud.x,
          y: cloud.y,
        }));

      const goodFacts = suns
        .filter(sun => sun.text.trim().length > 0)
        .map(sun => ({
          id: sun.id,
          text: sun.text.trim(),
          x: sun.x,
          y: sun.y,
        }));

      const lessonsLearned = lessons
        .filter(lesson => lesson.text.trim().length > 0)
        .map(lesson => ({
          id: lesson.id,
          text: lesson.text.trim(),
          x: lesson.x,
          y: lesson.y,
        }));

      if (isEditMode && memoryId) {
        // Update existing memory
        await updateIdealizedMemory(memoryId, {
          title: memoryLabel.trim(),
          imageUri: selectedImage || undefined,
          hardTruths,
          goodFacts,
          lessonsLearned,
        });
      } else {
        // Create new memory - support both old (profileId) and new (entityId + sphere) signatures
        let newMemoryId: string;
        if (isNewMode && entityId && sphere) {
          // New signature: (entityId, sphere, memoryData)
          newMemoryId = await addIdealizedMemory(entityId, sphere, {
            title: memoryLabel.trim(),
            imageUri: selectedImage || undefined,
            hardTruths,
            goodFacts,
            lessonsLearned,
          });
        } else if (profileId) {
          // Old signature: (profileId, memoryData) - backward compatibility
          newMemoryId = await addIdealizedMemory(profileId, {
            title: memoryLabel.trim(),
            imageUri: selectedImage || undefined,
            hardTruths,
            goodFacts,
            lessonsLearned,
          });
        } else {
          throw new Error('Missing required parameters to save memory');
        }

        // Trigger streak update for new memory creation
        try {
          const streakResult = await updateStreakOnMemoryCreation();
          const currentStreak = streakResult.data.currentStreak;

          // Show in-app notification for new badges or milestones
          if (streakResult.newBadges.length > 0) {
            const badge = streakResult.newBadges[0]; // Show first badge if multiple
            const emoji = badge.daysRequired >= 100 ? '👑' : badge.daysRequired >= 30 ? '🏆' : badge.daysRequired >= 7 ? '🌟' : '🔥';
            
            showNotification({
              title: 'New Badge Unlocked!',
              message: `You've earned the ${badge.name} badge with ${badge.daysRequired} consecutive days!`,
              emoji,
              duration: 4000,
            });
          } else if (streakResult.newMilestones.length > 0) {
            const milestone = streakResult.newMilestones[0];
            const emoji = milestone >= 100 ? '👑' : milestone >= 30 ? '🏆' : milestone >= 7 ? '🌟' : '🔥';
            
            showNotification({
              title: `${milestone}-day streak!`,
              message: `Amazing! You've created memories for ${milestone} days in a row.`,
              emoji,
              duration: 4000,
            });
          } else if (streakResult.streakIncreased || streakResult.isFirstMemory) {
            // Show notification for regular streak increment (no badge/milestone) or first memory
            const emoji = currentStreak >= 30 ? '👑' : currentStreak >= 14 ? '🏆' : currentStreak >= 7 ? '⭐' : currentStreak >= 3 ? '🔥' : '✨';

            let title = '';
            let message = '';

            if (currentStreak === 1) {
              title = 'Streak started!';
              message = 'You\'re on day 1! Keep creating memories daily to build your streak.';
            } else if (currentStreak === 2) {
              title = 'Great start!';
              message = '2 days in a row! One more day until your Flame badge.';
            } else {
              title = `${currentStreak}-day streak!`;
              message = `Amazing! You've created memories for ${currentStreak} days in a row. Keep it up!`;
            }
            
            showNotification({
              title,
              message,
              emoji,
              duration: 3000,
            });
          }
        } catch (error) {
          // Don't block memory creation if streak update fails
        }
      }
      
      // Update initial state after saving to prevent false positives
      initialMemoryLabel.current = memoryLabel.trim();
      initialSelectedImage.current = selectedImage;
      initialClouds.current = clouds.map(c => ({ ...c }));
      initialSuns.current = suns.map(s => ({ ...s }));
      initialLessons.current = lessons.map(l => ({ ...l }));

      // Navigate back after saving
      isNavigatingAway.current = true;
      router.back();
    } catch (error) {
      alert(t('memory.error.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Press handlers for moment type buttons with scale animations
  const handleCloudButtonPressIn = useCallback(() => {
    'worklet';
    cloudButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
  }, [cloudButtonPressScale]);

  const handleCloudButtonPressOut = useCallback(() => {
    'worklet';
    cloudButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  }, [cloudButtonPressScale]);

  const handleSunButtonPressIn = useCallback(() => {
    'worklet';
    sunButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
  }, [sunButtonPressScale]);

  const handleSunButtonPressOut = useCallback(() => {
    'worklet';
    sunButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  }, [sunButtonPressScale]);

  const handleLightbulbButtonPressIn = useCallback(() => {
    'worklet';
    lightbulbButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
  }, [lightbulbButtonPressScale]);

  const handleLightbulbButtonPressOut = useCallback(() => {
    'worklet';
    lightbulbButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  }, [lightbulbButtonPressScale]);

  // Function to add a new cloud
  const addNewCloud = () => {
    // Check if memory title is filled
    if (!memoryLabel.trim()) {
      // Pulse the title field to draw attention
      // Cancel any existing animation and reset before starting new pulse
      cancelAnimation(titlePulseScale);
      titlePulseScale.value = 1;
      titlePulseScale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
      );
      return;
    }
    
    // Check if all existing clouds have text
    const allCloudsHaveText = clouds.length === 0 || clouds.every((cloud) => cloud.text.trim().length > 0);
    
    if (!allCloudsHaveText) {
      alert(t('memory.error.fillAllCloudsBeforeAdding'));
      return;
    }
    
    // All clouds appear at the same center position
    const initialPos = getInitialCloudPosition();
    
    // Determine start position for animation - use "Add Hard Truth" plus button position
    let startPos: { x: number; y: number };
    
    if (plusButtonPos) {
      // Use measured plus button position (already in screen coordinates)
      startPos = plusButtonPos;
    } else {
      // Estimate "Add Hard Truth" button position if not measured yet
      // Button is in the scroll content, roughly at: header + container + label + some margin
      const headerHeight = 72; // Approximate header height
      const containerHeight = 220;
      const labelHeight = 40;
      const buttonY = headerHeight + containerHeight + labelHeight + 40 + 22; // Approximate button center
      startPos = { 
        x: 22 * fontScale + 22, // Left padding + half button width
        y: buttonY 
      };
    }
    
    const newCloud = {
      id: Date.now().toString() + Math.random().toString(),
      text: '', // Empty text - placeholder will be shown
      x: initialPos.x,
      y: initialPos.y,
      // Start position: center cloud on the plus button
      startX: startPos.x - (cloudWidth / 2), // Center cloud horizontally
      startY: startPos.y - (cloudHeight / 2), // Center cloud vertically
      placeholder: getHardTruthSuggestion(memoryLabel, language), // Smart suggestion based on memory title
    };
    setClouds((prev) => [...prev, newCloud]);
    // Set the newly created cloud ID to trigger auto-focus
    setNewlyCreatedCloudId(newCloud.id);
    
    // Log analytics event
    logMomentCreated(finalSphere, 'cloud').catch(() => {
      // Failed to log moment created
    });
  };

  // Function to add a new sun
  const addNewSun = () => {
    // Check if memory title is filled
    if (!memoryLabel.trim()) {
      // Pulse the title field to draw attention
      // Cancel any existing animation and reset before starting new pulse
      cancelAnimation(titlePulseScale);
      titlePulseScale.value = 1;
      titlePulseScale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
      );
      return;
    }
    
    // Check if all existing suns have text
    const allSunsHaveText = suns.length === 0 || suns.every((sun) => sun.text.trim().length > 0);
    
    if (!allSunsHaveText) {
      alert(t('memory.error.fillAllSunsBeforeAdding'));
      return;
    }
    
    // All suns appear at the same center position
    const initialPos = getInitialSunPosition();
    
    // Determine start position for animation - use "Add Good Fact" plus button position
    let startPos: { x: number; y: number };
    
    if (sunButtonPos) {
      // Use measured plus button position (already in screen coordinates)
      startPos = sunButtonPos;
    } else {
      // Estimate "Add Good Fact" button position if not measured yet
      const headerHeight = 72;
      const containerHeight = 220;
      const labelHeight = 40;
      const screenW = Dimensions.get('window').width;
      const buttonY = headerHeight + containerHeight + labelHeight + 40 + 22;
      const buttonX = screenW - 22 * fontScale - (isLargeDevice ? 56 : 44) / 2; // Right side
      startPos = { x: buttonX, y: buttonY };
    }
    
    const newSun = {
      id: Date.now().toString() + Math.random().toString(),
      text: '', // Empty text - placeholder will be shown
      x: initialPos.x,
      y: initialPos.y,
      // Start position: center sun on the plus button
      startX: startPos.x - (sunWidth / 2), // Center sun horizontally
      startY: startPos.y - (sunHeight / 2), // Center sun vertically
      placeholder: getGoodFactSuggestion(memoryLabel, language), // Smart suggestion based on memory title
    };
    setSuns((prev) => [...prev, newSun]);
    // Set the newly created sun ID to trigger auto-focus
    setNewlyCreatedSunId(newSun.id);
    
    // Log analytics event
    logMomentCreated(finalSphere, 'sun').catch(() => {
      // Failed to log moment created
    });
  };

  // Function to add a new lesson learned
  const addNewLesson = () => {
    // Check if memory title is filled
    if (!memoryLabel.trim()) {
      // Pulse the title field to draw attention
      // Cancel any existing animation and reset before starting new pulse
      cancelAnimation(titlePulseScale);
      titlePulseScale.value = 1;
      titlePulseScale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
      );
      return;
    }
    
    // Check if all existing lessons have text
    const allLessonsHaveText = lessons.length === 0 || lessons.every((lesson) => lesson.text.trim().length > 0);

    if (!allLessonsHaveText) {
      alert(t('memory.error.fillAllLessonsBeforeAdding'));
      return;
    }

    // All lessons appear at the same center position
    const initialPos = getInitialLessonPosition();

    // Determine start position for animation - use lightbulb button position
    let startPos: { x: number; y: number };

    if (lightbulbButtonPos) {
      // Use measured lightbulb button position (already in screen coordinates)
      startPos = lightbulbButtonPos;
    } else {
      // Estimate lightbulb button position if not measured yet
      const headerHeight = 72;
      const containerHeight = 220;
      const labelHeight = 40;
      const screenW = Dimensions.get('window').width;
      const buttonY = headerHeight + containerHeight + labelHeight + 40 + 22;
      const buttonX = screenW / 2; // Center position (between cloud and sun buttons)
      startPos = { x: buttonX, y: buttonY };
    }

    const lessonWidth = isLargeDevice ? 180 : 130;
    const lessonHeight = isLargeDevice ? 180 : 130;

    const newLesson = {
      id: Date.now().toString() + Math.random().toString(),
      text: '', // Empty text - placeholder will be shown
      x: initialPos.x,
      y: initialPos.y,
      // Start position: center lesson on the lightbulb button
      startX: startPos.x - (lessonWidth / 2), // Center lesson horizontally
      startY: startPos.y - (lessonHeight / 2), // Center lesson vertically
      placeholder: getLessonSuggestion(memoryLabel, language), // Smart suggestion based on memory title
    };
    setLessons((prev) => [...prev, newLesson]);
    // Set the newly created lesson ID to trigger auto-focus
    setNewlyCreatedLessonId(newLesson.id);

    // Log analytics event
    logMomentCreated(finalSphere, 'lesson').catch(() => {
      // Failed to log lesson created
    });
  };

  // Store animated values ref for each cloud to access current position
  const cloudAnimatedValues = useRef<Record<string, { translateX: any; translateY: any }>>({});

  // Store animated values ref for each sun to access current position
  const sunAnimatedValues = useRef<Record<string, { translateX: any; translateY: any }>>({});

  // Store animated values ref for each lesson to access current position
  const lessonAnimatedValues = useRef<Record<string, { translateX: any; translateY: any }>>({});

  // Create PanResponder for each cloud
  const createPanResponder = (cloudId: string) => {
    if (panResponders.current[cloudId]) return panResponders.current[cloudId];

    panResponders.current[cloudId] = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Allow dragging from anywhere on the cloud, including text area
        return true;
      },
      onStartShouldSetPanResponderCapture: () => false, // Don't capture immediately, let TextInput handle if needed
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // If there's significant movement, it's a drag, not text selection
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Use current animated position instead of state position
        const animatedVals = cloudAnimatedValues.current[cloudId];
        if (animatedVals) {
          dragStart.current[cloudId] = { 
            x: animatedVals.translateX.value, 
            y: animatedVals.translateY.value 
          };
        } else {
          // Fallback to state position if animated values not available
          const cloud = clouds.find((c) => c.id === cloudId);
          if (cloud) {
            dragStart.current[cloudId] = { x: cloud.x, y: cloud.y };
          }
        }
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStart.current[cloudId];
        if (!start) return;

        const screenW = Dimensions.get('window').width;
        const screenH = Dimensions.get('window').height;
        const padding = 20;

        // Calculate dynamic cloud size for current cloud
        const currentCloud = clouds.find((c) => c.id === cloudId);
        const textLength = currentCloud?.text?.length || 0;
        const baseCloudWidth = isLargeDevice ? 480 : 320;
        const baseCloudHeight = isLargeDevice ? 150 : 100;
        const estimatedLines = Math.ceil(textLength / 30);
        const dynamicCloudHeight = Math.min(250, Math.max(baseCloudHeight, baseCloudHeight + (estimatedLines - 1) * 25));
        const dynamicCloudWidth = Math.min(600, Math.max(baseCloudWidth, baseCloudWidth + Math.floor(textLength * 0.5)));

        // Calculate new position
        let newX = start.x + gesture.dx;
        let newY = start.y + gesture.dy;

        // Clamp to viewport bounds
        const minX = padding;
        const maxX = screenW - dynamicCloudWidth - padding;
        const minY = padding;
        const maxY = screenH - dynamicCloudHeight - padding;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        setClouds((prev) =>
          prev.map((c) =>
            c.id === cloudId
              ? { ...c, x: newX, y: newY }
              : c
          )
        );
      },
      onPanResponderRelease: () => {
        delete dragStart.current[cloudId];
      },
    });

    return panResponders.current[cloudId];
  };

  // Create PanResponder for each sun
  const createSunPanResponder = (sunId: string) => {
    const sunKey = `sun_${sunId}`;
    if (panResponders.current[sunKey]) return panResponders.current[sunKey];

    panResponders.current[sunKey] = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return true;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        const animatedVals = sunAnimatedValues.current[sunId];
        if (animatedVals) {
          dragStart.current[sunKey] = { 
            x: animatedVals.translateX.value, 
            y: animatedVals.translateY.value 
          };
        } else {
          const sun = suns.find((s) => s.id === sunId);
          if (sun) {
            dragStart.current[sunKey] = { x: sun.x, y: sun.y };
          }
        }
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStart.current[sunKey];
        if (!start) return;

        const screenW = Dimensions.get('window').width;
        const screenH = Dimensions.get('window').height;
        const padding = 20;

        // Calculate dynamic sun size for current sun
        const currentSun = suns.find((s) => s.id === sunId);
        const textLength = currentSun?.text?.length || 0;
        const baseSunSize = isLargeDevice ? 200 : 160;
        const dynamicSunSize = Math.min(350, Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 1.2)));

        // Calculate new position
        let newX = start.x + gesture.dx;
        let newY = start.y + gesture.dy;

        // Clamp to viewport bounds
        const minX = padding;
        const maxX = screenW - dynamicSunSize - padding;
        const minY = padding;
        const maxY = screenH - dynamicSunSize - padding;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        setSuns((prev) =>
          prev.map((s) =>
            s.id === sunId
              ? { ...s, x: newX, y: newY }
              : s
          )
        );
      },
      onPanResponderRelease: () => {
        delete dragStart.current[sunKey];
      },
    });

    return panResponders.current[sunKey];
  };

  const createLessonPanResponder = (lessonId: string) => {
    const lessonKey = `lesson_${lessonId}`;
    if (panResponders.current[lessonKey]) return panResponders.current[lessonKey];

    panResponders.current[lessonKey] = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return true;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        const animatedVals = lessonAnimatedValues.current[lessonId];
        if (animatedVals) {
          dragStart.current[lessonKey] = {
            x: animatedVals.translateX.value,
            y: animatedVals.translateY.value
          };
        } else {
          const lesson = lessons.find((l) => l.id === lessonId);
          if (lesson) {
            dragStart.current[lessonKey] = { x: lesson.x, y: lesson.y };
          }
        }
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStart.current[lessonKey];
        if (!start) return;

        const screenW = Dimensions.get('window').width;
        const screenH = Dimensions.get('window').height;
        const padding = 20;

        // Calculate dynamic lesson size based on current lesson's text
        const currentLesson = lessons.find((l) => l.id === lessonId);
        const textToMeasure = currentLesson?.text || currentLesson?.placeholder || '';
        const baseSize = isLargeDevice ? 180 : 130;
        const dynamicSize = Math.min(300, Math.max(baseSize, baseSize + Math.floor(textToMeasure.length * 1.2)));
        const lessonWidth = dynamicSize;
        const lessonHeight = dynamicSize;

        // Calculate new position
        let newX = start.x + gesture.dx;
        let newY = start.y + gesture.dy;

        // Clamp to viewport bounds
        const minX = padding;
        const maxX = screenW - lessonWidth - padding;
        const minY = padding;
        const maxY = screenH - lessonHeight - padding;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        setLessons((prev) =>
          prev.map((l) =>
            l.id === lessonId
              ? { ...l, x: newX, y: newY }
              : l
          )
        );
      },
      onPanResponderRelease: () => {
        delete dragStart.current[lessonKey];
      },
    });

    return panResponders.current[lessonKey];
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background,
        },

        scroll: {
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 22 * fontScale,
          ...(typeof maxContentWidth === 'number' ? { maxWidth: maxContentWidth } : {}),
          alignSelf: 'center',
          width: '100%',
        },

        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
          marginTop: 50,
        },

        headerButton: {
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
        },

        headerTitle: {
          flex: 1,
          textAlign: 'center',
        },

        centerContent: {
          alignItems: 'center',
          width: '100%',
        },

        // ⭐ Strong external glow
        uploadShadowWrap: {
          width: '100%',
          alignItems: 'center',
          zIndex: 1, // Lower than clouds

          shadowColor: colorScheme === 'dark' ? '#3BAFFB' : '#34C759',
          shadowOpacity: colorScheme === 'dark' ? 0.75 : 0.4,
          shadowRadius: 50,
          shadowOffset: { width: 0, height: 20 },

          elevation: 30,
        },

        // ⭐ Main upload container with strong shadow
        uploadContainer: {
          width: '100%',
          height: 220,
          borderRadius: 18,

          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderWidth: 1.3,
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
          borderStyle: 'dashed',

          justifyContent: 'center',
          alignItems: 'center',

          // Inner glow
          shadowColor: colorScheme === 'dark' ? '#0EA5E9' : '#34C759',
          shadowOpacity: colorScheme === 'dark' ? 0.55 : 0.3,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 18 },

          elevation: 22,
        },

        uploadedImage: {
          width: '100%',
          height: '100%',
          borderRadius: 18,
        },

        loadingContainer: {
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },

        memoryLabelContainer: {
          marginTop: 14,
          width: '100%',
          alignItems: 'center',
        },

        memoryLabelInput: {
          fontSize: isLargeDevice ? 22 : 17, // Bigger on large devices
          fontWeight: '600',
          color: colors.text,
          textAlign: 'center',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(59, 175, 251, 0.3)' 
            : 'rgba(59, 175, 251, 0.25)',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 8,
          minHeight: 24,
        },

        memoryLabelInputFocused: {
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(59, 175, 251, 0.06)' 
            : 'rgba(59, 175, 251, 0.03)',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(59, 175, 251, 0.3)' 
            : 'rgba(59, 175, 251, 0.25)',
          shadowColor: colorScheme === 'dark' ? '#3BAFFB' : '#3BAFFB',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: colorScheme === 'dark' ? 0.15 : 0.1,
          shadowRadius: 6,
          elevation: 2,
        },

        memoryLabelInputFocusedBorder: {
          borderColor: colorScheme === 'dark' 
            ? 'rgba(59, 175, 251, 0.3)' 
            : 'rgba(59, 175, 251, 0.25)',
        },

        cursorIndicator: {
          position: 'absolute',
          width: 2,
          height: isLargeDevice ? 22 : 17,
          backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
          alignSelf: 'center',
        },

        buttonsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 60,
          paddingHorizontal: 16 * fontScale,
          width: '100%',
          gap: 16 * fontScale,
        },

        addHardTruthButton: {
          width: isLargeDevice ? 64 : 56,
          height: isLargeDevice ? 64 : 56,
          borderRadius: isLargeDevice ? 32 : 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'rgba(255, 255, 255, 0.9)',
          // Neumorphic shadow effect
          shadowColor: colorScheme === 'dark' ? '#000' : '#000',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
          shadowRadius: 8,
          elevation: 4,
          // Inner highlight for 3D effect
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(255, 255, 255, 0.8)',
        },
        addHardTruthButtonDisabled: {
          opacity: 0.4,
        },

        floatingButton: {
          position: 'absolute',
          bottom: 200 * fontScale,
          right: 22 * fontScale,
          zIndex: 1000,
        },

        bottomBadgesContainer: {
          position: 'absolute',
          bottom: 50 * fontScale,
          left: 0,
          right: 0,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12 * fontScale,
          zIndex: 1000,
        },

        bottomBadgesRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20 * fontScale,
        },

        momentBadge: {
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        },

        momentBadgeCircle: {
          width: isLargeDevice ? 64 : 56,
          height: isLargeDevice ? 64 : 56,
          borderRadius: isLargeDevice ? 32 : 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        },

        momentCountBadge: {
          position: 'absolute',
          bottom: -8,
          minWidth: isLargeDevice ? 40 : 36,
          height: isLargeDevice ? 24 : 20,
          borderRadius: isLargeDevice ? 12 : 10,
          paddingHorizontal: 8,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 3,
        },

        momentCountText: {
          fontSize: isLargeDevice ? 12 : 10,
          fontWeight: '700',
          color: '#FFFFFF',
        },

        floatingButtonDisabled: {
          opacity: 0.4,
        },

        cloudContainer: {
          position: 'absolute',
          zIndex: 10000, // Higher than suns to always appear on top
          width: cloudWidth,
          height: cloudHeight,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible', // Allow delete button to be positioned outside if needed
        },

        cloudWrapper: {
          alignItems: 'center',
          justifyContent: 'center',
        },

        cloudSvg: {
          position: 'absolute',
        },

        cloudTextContainer: {
          position: 'absolute',
          paddingHorizontal: 20,
          paddingVertical: 16,
          maxWidth: 280,
          alignItems: 'center',
          justifyContent: 'center',
        },

        cloudTextInput: {
          fontSize: isLargeDevice ? 20 : 17, // Bigger font, even bigger on large devices
          color: '#FFFFFF', // Always white since clouds are dark in both themes
          textAlign: 'center',
          width: '100%',
          backgroundColor: 'transparent',
          textAlignVertical: 'center',
        },

        deleteButton: {
          position: 'absolute',
          top: 10,
          right: cloudWidth * 0.15, // Position inside the top-right bulge of the cloud (around 15% from right)
          zIndex: 1001,
        },

        addGoodFactButton: {
          width: isLargeDevice ? 64 : 56,
          height: isLargeDevice ? 64 : 56,
          borderRadius: isLargeDevice ? 32 : 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'rgba(255, 255, 255, 0.9)',
          // Neumorphic shadow effect
          shadowColor: colorScheme === 'dark' ? '#000' : '#000',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
          shadowRadius: 8,
          elevation: 4,
          // Inner highlight for 3D effect
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(255, 255, 255, 0.8)',
        },
        addGoodFactButtonDisabled: {
          opacity: 0.4,
        },

        plusButtonBetween: {
          width: isLargeDevice ? 56 : 48,
          height: isLargeDevice ? 56 : 48,
          borderRadius: isLargeDevice ? 28 : 24,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
          zIndex: 10,
        },

        sunContainer: {
          position: 'absolute',
          zIndex: 9998, // Lower than clouds so clouds always appear on top when they intersect
          width: sunWidth,
          height: sunHeight,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
        },

        sunTextInput: {
          color: '#000000', // Dark text on bright sun
          textAlign: 'center',
          backgroundColor: 'transparent',
          fontWeight: '600',
          // Adjust lineHeight to better match fontSize for visual centering
          lineHeight: 16,
        },

        sunDeleteButton: {
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1001,
        },

        lessonContainer: {
          position: 'absolute',
          zIndex: 9997, // Lower than suns
          width: isLargeDevice ? 150 : 100,
          height: isLargeDevice ? 150 : 100,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
        },

        lessonContentContainer: {
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        },

        lessonBulbContainer: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        },

        lessonInput: {
          position: 'absolute',
          top: isLargeDevice ? '28%' : '26%',
          left: isLargeDevice ? '22.5%' : '25%',
          right: isLargeDevice ? '22.5%' : '25%',
          bottom: isLargeDevice ? '22%' : '20%',
          fontSize: isLargeDevice ? 12 : 10,
          color: colors.text,
          textAlign: 'center',
          textAlignVertical: 'center',
          backgroundColor: 'transparent',
          fontWeight: '600',
          zIndex: 1,
          paddingHorizontal: isLargeDevice ? 8 : 6,
          paddingVertical: 0,
          justifyContent: 'center',
          alignItems: 'center',
          textShadowColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        },

        deleteLessonButton: {
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1001,
          backgroundColor: '#FF3B30',
          width: isLargeDevice ? 28 : 22,
          height: isLargeDevice ? 28 : 22,
          borderRadius: isLargeDevice ? 14 : 11,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#FF3B30',
          shadowOpacity: 0.5,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        },

        imageDeleteButton: {
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1001,
        },

        deleteBadge: {
          width: isLargeDevice ? 32 : 24, // Bigger on large devices
          height: isLargeDevice ? 32 : 24, // Bigger on large devices
          borderRadius: isLargeDevice ? 16 : 12,
          backgroundColor: '#FF3B30',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#FF3B30',
          shadowOpacity: 0.5,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        },

        deleteLine: {
          width: isLargeDevice ? 16 : 12, // Bigger line on large devices
          height: isLargeDevice ? 3 : 2, // Slightly thicker on large devices
          backgroundColor: '#FFFFFF',
          borderRadius: 1,
        },
      }),
    [colors, fontScale, colorScheme, maxContentWidth, cloudWidth, cloudHeight, sunWidth, sunHeight, isLargeDevice]
  );

  // Animated styles for moment type buttons
  const cloudButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cloudButtonPressScale.value }],
  }));

  const sunButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sunButtonPressScale.value }],
  }));

  const lightbulbButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lightbulbButtonPressScale.value }],
  }));

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            // Don't check for changes in view-only mode
            if (viewOnly) {
              isNavigatingAway.current = true;
              router.back();
              return;
            }

            // Check for unsaved changes before navigating
            if (hasUnsavedChanges() && !isSaving) {
              Alert.alert(
                t('memory.unsavedChanges.title'),
                t('memory.unsavedChanges.message'),
                [
                  {
                    text: t('common.cancel'),
                    style: 'cancel',
                  },
                  {
                    text: t('common.discard'),
                    style: 'destructive',
                    onPress: () => {
                      isNavigatingAway.current = true;
                      router.back();
                    },
                  },
                ]
              );
            } else {
              isNavigatingAway.current = true;
              router.back();
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <View style={styles.headerButton} />
      </View>

      {/* Scroll content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.centerContent}>
          <View style={styles.uploadShadowWrap}>
            <TouchableOpacity
              ref={containerRef}
              style={styles.uploadContainer}
              onPress={viewOnly ? undefined : () => {
                // Don't open gallery if image is already selected
                // User must remove current image first
                if (selectedImage) {
                  return;
                }
                pickImage();
              }}
              onLayout={() => {
                // Container ref is available for potential future use
              }}
              activeOpacity={0.8}
              delayPressIn={0}
              disabled={isLoadingImage || viewOnly || !!selectedImage}
            >
              {isLoadingImage ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primaryLight} />
                  <ThemedText style={{ marginTop: 12, opacity: 0.75, textAlign: 'center' }}>
                    {t('profile.openingGallery')}
                  </ThemedText>
                </View>
              ) : selectedImage ? (
                <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.uploadedImage}
                    contentFit="cover"
                  />
                  {!viewOnly && (
                    <TouchableOpacity
                      style={styles.imageDeleteButton}
                      onPress={() => setSelectedImage(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.deleteBadge}>
                        <View style={styles.deleteLine} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
              <MaterialIcons
                name="add-a-photo"
                size={50}
                color={colors.primaryLight}
              />
             
                </>
              )}
            </TouchableOpacity>
            </View>

          {/* Editable memory label */}
          <View style={styles.memoryLabelContainer}>
            <View style={{ position: 'relative', width: '100%', alignItems: 'center' }}>
              <AnimatedTitleInput
                ref={titleInputRef}
                value={memoryLabel}
                onChangeText={setMemoryLabel}
                borderWidth={borderWidth}
                isFocused={isTitleFocused}
                pulseScale={titlePulseScale}
                style={[
                  styles.memoryLabelInput,
                  isTitleFocused && styles.memoryLabelInputFocused,
                ]}
                placeholder={t('memory.title.placeholder')}
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                textAlign="center"
                editable={!viewOnly}
                autoFocus={!viewOnly && !isEditMode}
                maxLength={24}
                selectionColor={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                caretHidden={true}
                showSoftInputOnFocus={true}
                onFocus={(e) => {
                  setIsTitleFocused(true);
                  // Set selection to end of text to ensure cursor is visible
                  if (titleInputRef.current) {
                    const length = memoryLabel.length;
                    titleInputRef.current.setNativeProps({
                      selection: { start: length, end: length },
                    });
                  }
                  // Scroll to title input when focused to ensure it's visible above keyboard
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                  }, 300);
                }}
                onBlur={() => {
                  setIsTitleFocused(false);
                }}
              />
              {/* Custom blinking cursor indicator - only show when focused and empty */}
              {isTitleFocused && memoryLabel.length === 0 && !viewOnly && (
                <CursorBlinkIndicator
                  style={styles.cursorIndicator}
                  opacity={cursorOpacity}
                />
              )}
            </View>
          </View>

          {/* Add Hard Truth and Good Fact - Same Row - hidden in view-only mode */}
          {!viewOnly && (
          <View style={styles.buttonsRow}>
            <Pressable
              ref={plusButtonRef}
              onLayout={() => {
                plusButtonRef.current?.measure((fx, fy, width, height, px, py) => {
                  // px, py are relative to window, which matches root View coordinate system
                  const buttonCenterX = px + width / 2;
                  const buttonCenterY = py + height / 2;
                  setPlusButtonPos({ x: buttonCenterX, y: buttonCenterY });
                });
              }}
              onPress={addNewCloud}
              onPressIn={handleCloudButtonPressIn}
              onPressOut={handleCloudButtonPressOut}
              disabled={clouds.length > 0 && !clouds.every((cloud) => cloud.text.trim().length > 0)}
            >
              <Animated.View style={[
                styles.addHardTruthButton,
                clouds.length > 0 && !clouds.every((cloud) => cloud.text.trim().length > 0)
                  ? styles.addHardTruthButtonDisabled
                  : undefined,
                cloudButtonAnimatedStyle,
              ]}>
              <View style={{
                width: isLargeDevice ? 64 : 56,
                height: isLargeDevice ? 64 : 56,
                borderRadius: isLargeDevice ? 32 : 28,
                justifyContent: 'center',
                alignItems: 'center',
                // Enhanced 3D shadow effect - stronger for dark theme
                shadowColor: colorScheme === 'dark' ? '#000' : '#000',
                shadowOffset: { width: 0, height: colorScheme === 'dark' ? 14 : 12 },
                shadowOpacity: colorScheme === 'dark' ? 0.8 : 0.6,
                shadowRadius: colorScheme === 'dark' ? 24 : 20,
                elevation: colorScheme === 'dark' ? 18 : 15,
                overflow: 'hidden',
              }}>
                <LinearGradient
                  colors={
                    colorScheme === 'dark'
                      ? ['rgba(180, 180, 180, 0.8)', 'rgba(100, 100, 100, 0.6)', 'rgba(40, 40, 40, 0.8)']
                      : ['rgba(255, 255, 255, 1)', 'rgba(230, 230, 230, 0.95)', 'rgba(200, 200, 200, 1)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: isLargeDevice ? 32 : 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: colorScheme === 'dark' ? 2 : 1,
                    borderTopColor: colorScheme === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(255, 255, 255, 0.8)',
                    borderLeftColor: colorScheme === 'dark' 
                      ? 'rgba(255, 255, 255, 0.25)' 
                      : 'rgba(255, 255, 255, 0.8)',
                    borderBottomColor: colorScheme === 'dark' 
                      ? 'rgba(0, 0, 0, 0.5)' 
                      : 'rgba(200, 200, 200, 0.8)',
                    borderRightColor: colorScheme === 'dark' 
                      ? 'rgba(0, 0, 0, 0.4)' 
                      : 'rgba(200, 200, 200, 0.8)',
                  }}
                >
                  <MaterialIcons
                    name="cloud"
                    size={isLargeDevice ? 32 : 28}
                    color={colorScheme === 'dark' ? '#FFFFFF' : '#555'}
                  />
                </LinearGradient>
              </View>
              </Animated.View>
            </Pressable>

            <Pressable
              ref={sunButtonRef}
              onLayout={() => {
                sunButtonRef.current?.measure((fx, fy, width, height, px, py) => {
                  const buttonCenterX = px + width / 2;
                  const buttonCenterY = py + height / 2;
                  setSunButtonPos({ x: buttonCenterX, y: buttonCenterY });
                });
              }}
              onPress={addNewSun}
              onPressIn={handleSunButtonPressIn}
              onPressOut={handleSunButtonPressOut}
              disabled={suns.length > 0 && !suns.every((sun) => sun.text.trim().length > 0)}
            >
              <Animated.View style={[
                styles.addGoodFactButton,
                suns.length > 0 && !suns.every((sun) => sun.text.trim().length > 0)
                  ? styles.addGoodFactButtonDisabled
                  : undefined,
                sunButtonAnimatedStyle,
              ]}>
              <View style={{
                width: isLargeDevice ? 64 : 56,
                height: isLargeDevice ? 64 : 56,
                borderRadius: isLargeDevice ? 32 : 28,
                justifyContent: 'center',
                alignItems: 'center',
                // Enhanced 3D shadow effect - stronger for dark theme
                shadowColor: colorScheme === 'dark' ? '#FFA500' : '#FFA500',
                shadowOffset: { width: 0, height: colorScheme === 'dark' ? 14 : 12 },
                shadowOpacity: colorScheme === 'dark' ? 0.9 : 0.7,
                shadowRadius: colorScheme === 'dark' ? 24 : 20,
                elevation: colorScheme === 'dark' ? 18 : 15,
                overflow: 'hidden',
              }}>
                <LinearGradient
                  colors={
                    colorScheme === 'dark'
                      ? ['rgba(255, 230, 140, 0.85)', 'rgba(255, 180, 70, 0.7)', 'rgba(255, 140, 40, 0.85)']
                      : ['rgba(255, 250, 200, 1)', 'rgba(255, 230, 120, 0.95)', 'rgba(255, 210, 60, 1)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: isLargeDevice ? 32 : 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: colorScheme === 'dark' ? 2 : 1,
                    borderTopColor: colorScheme === 'dark' 
                      ? 'rgba(255, 255, 220, 0.4)' 
                      : 'rgba(255, 255, 255, 0.9)',
                    borderLeftColor: colorScheme === 'dark' 
                      ? 'rgba(255, 255, 200, 0.35)' 
                      : 'rgba(255, 255, 255, 0.9)',
                    borderBottomColor: colorScheme === 'dark' 
                      ? 'rgba(200, 120, 0, 0.5)' 
                      : 'rgba(255, 210, 60, 0.9)',
                    borderRightColor: colorScheme === 'dark' 
                      ? 'rgba(200, 100, 0, 0.4)' 
                      : 'rgba(255, 210, 60, 0.9)',
                  }}
                >
                  <MaterialIcons
                    name="wb-sunny"
                    size={isLargeDevice ? 32 : 28}
                    color={colorScheme === 'dark' ? '#FFD700' : '#FFA500'}
                  />
                </LinearGradient>
              </View>
              </Animated.View>
            </Pressable>

            {/* Add Lesson Learned Button (Lightbulb) */}
            <Pressable
              ref={lightbulbButtonRef}
              onLayout={() => {
                lightbulbButtonRef.current?.measure((fx, fy, width, height, px, py) => {
                  const buttonCenterX = px + width / 2;
                  const buttonCenterY = py + height / 2;
                  setLightbulbButtonPos({ x: buttonCenterX, y: buttonCenterY });
                });
              }}
              onPress={addNewLesson}
              onPressIn={handleLightbulbButtonPressIn}
              onPressOut={handleLightbulbButtonPressOut}
              disabled={lessons.length > 0 && !lessons.every((lesson) => lesson.text.trim().length > 0)}
            >
              <Animated.View style={[
                styles.addGoodFactButton,
                lessons.length > 0 && !lessons.every((lesson) => lesson.text.trim().length > 0)
                  ? styles.addGoodFactButtonDisabled
                  : undefined,
                lightbulbButtonAnimatedStyle,
              ]}>
              <View style={{
                width: isLargeDevice ? 64 : 56,
                height: isLargeDevice ? 64 : 56,
                borderRadius: isLargeDevice ? 32 : 28,
                justifyContent: 'center',
                alignItems: 'center',
                // Enhanced 3D shadow effect - golden glow for lightbulb
                shadowColor: colorScheme === 'dark' ? '#FFD700' : '#FFA000',
                shadowOffset: { width: 0, height: colorScheme === 'dark' ? 14 : 12 },
                shadowOpacity: colorScheme === 'dark' ? 0.85 : 0.65,
                shadowRadius: colorScheme === 'dark' ? 24 : 20,
                elevation: colorScheme === 'dark' ? 18 : 15,
                overflow: 'hidden',
              }}>
                <LinearGradient
                  colors={
                    colorScheme === 'dark'
                      ? ['rgba(255, 249, 196, 0.9)', 'rgba(255, 213, 79, 0.75)', 'rgba(255, 160, 0, 0.9)']
                      : ['rgba(255, 253, 231, 1)', 'rgba(255, 245, 157, 0.95)', 'rgba(255, 213, 79, 1)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: isLargeDevice ? 32 : 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: colorScheme === 'dark' ? 2 : 1,
                    borderTopColor: colorScheme === 'dark'
                      ? 'rgba(255, 255, 240, 0.45)'
                      : 'rgba(255, 255, 255, 0.95)',
                    borderLeftColor: colorScheme === 'dark'
                      ? 'rgba(255, 255, 230, 0.4)'
                      : 'rgba(255, 255, 255, 0.95)',
                    borderBottomColor: colorScheme === 'dark'
                      ? 'rgba(200, 130, 0, 0.55)'
                      : 'rgba(255, 213, 79, 0.95)',
                    borderRightColor: colorScheme === 'dark'
                      ? 'rgba(200, 110, 0, 0.45)'
                      : 'rgba(255, 213, 79, 0.95)',
                  }}
                >
                  <MaterialIcons
                    name="lightbulb"
                    size={isLargeDevice ? 32 : 28}
                    color={colorScheme === 'dark' ? '#FFD700' : '#FFA000'}
                  />
                </LinearGradient>
              </View>
              </Animated.View>
            </Pressable>
          </View>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Cloud Bubbles - render all clouds positioned on screen (after ScrollView to ensure they appear on top) */}
      {clouds.map((cloud) => {
        const pan = createPanResponder(cloud.id);
        // Create or get ref for this cloud's input
        if (!cloudInputRefs.current[cloud.id]) {
          cloudInputRefs.current[cloud.id] = React.createRef<TextInput>();
        }
        const inputRef = cloudInputRefs.current[cloud.id]!;
        const shouldAutoFocus = newlyCreatedCloudId === cloud.id;

        // Calculate dynamic cloud size based on text length
        const baseCloudWidth = isLargeDevice ? 480 : 320;
        const baseCloudHeight = isLargeDevice ? 150 : 100;
        // Increase height based on text length (approximate lines)
        const textLength = cloud.text?.length || 0;
        const estimatedLines = Math.ceil(textLength / 30); // Roughly 30 chars per line
        const dynamicCloudHeight = Math.min(250, Math.max(baseCloudHeight, baseCloudHeight + (estimatedLines - 1) * 25));
        const dynamicCloudWidth = Math.min(600, Math.max(baseCloudWidth, baseCloudWidth + Math.floor(textLength * 0.5)));

        return (
          <AnimatedCloud
            key={cloud.id}
            cloud={cloud}
            panHandlers={pan.panHandlers}
            styles={styles}
            colors={colors}
            cloudWidth={dynamicCloudWidth}
            cloudHeight={dynamicCloudHeight}
            placeholder={cloud.placeholder || t('memory.hardTruth.placeholder')}
            onTextChange={(id, text) => {
              setClouds((prev) =>
                prev.map((c) => (c.id === id ? { ...c, text } : c))
              );
            }}
            onAnimationComplete={(id) => {
              // Clear start positions after animation completes
              setClouds((prev) =>
                prev.map((c) =>
                  c.id === id ? { ...c, startX: undefined, startY: undefined } : c
                )
              );
              // Clear the newly created flag after animation completes
              if (newlyCreatedCloudId === id) {
                setNewlyCreatedCloudId(null);
              }
            }}
            onDelete={(id) => {
              setClouds((prev) => prev.filter((c) => c.id !== id));
              // Clean up ref when cloud is deleted
              delete cloudInputRefs.current[id];
              if (newlyCreatedCloudId === id) {
                setNewlyCreatedCloudId(null);
              }
            }}
            onRegisterAnimatedValues={(id, translateX, translateY) => {
              cloudAnimatedValues.current[id] = { translateX, translateY };
            }}
            viewOnly={viewOnly}
            inputRef={inputRef}
            shouldAutoFocus={shouldAutoFocus}
          />
        );
      })}

      {/* Sun Elements - render all suns positioned on screen */}
      {suns.map((sun) => {
        const pan = createSunPanResponder(sun.id);
        // Create or get ref for this sun's input
        if (!sunInputRefs.current[sun.id]) {
          sunInputRefs.current[sun.id] = React.createRef<TextInput>();
        }
        const inputRef = sunInputRefs.current[sun.id]!;
        const shouldAutoFocus = newlyCreatedSunId === sun.id;

        // Calculate dynamic sun size based on text length
        const baseSunSize = isLargeDevice ? 200 : 160;
        const textLength = sun.text?.length || 0;
        // Suns grow in a circular fashion - both width and height increase equally
        // Increase growth rate to 1.2px per character for more noticeable scaling
        const dynamicSunSize = Math.min(350, Math.max(baseSunSize, baseSunSize + Math.floor(textLength * 1.2)));

        return (
          <AnimatedSun
            key={sun.id}
            sun={sun}
            panHandlers={pan.panHandlers}
            styles={styles}
            colors={colors}
            sunWidth={dynamicSunSize}
            sunHeight={dynamicSunSize}
            placeholder={sun.placeholder || t('memory.goodFact.placeholder')}
            onTextChange={(id, text) => {
              setSuns((prev) =>
                prev.map((s) => (s.id === id ? { ...s, text } : s))
              );
            }}
            onAnimationComplete={(id) => {
              setSuns((prev) =>
                prev.map((s) => (s.id === id ? { ...s, startX: undefined, startY: undefined } : s))
              );
              // Clear the newly created flag after animation completes
              if (newlyCreatedSunId === id) {
                setNewlyCreatedSunId(null);
              }
            }}
            onDelete={(id) => {
              setSuns((prev) => prev.filter((s) => s.id !== id));
              // Clean up ref when sun is deleted
              delete sunInputRefs.current[id];
              if (newlyCreatedSunId === id) {
                setNewlyCreatedSunId(null);
              }
            }}
            onRegisterAnimatedValues={(id, translateX, translateY) => {
              sunAnimatedValues.current[id] = { translateX, translateY };
            }}
            viewOnly={viewOnly}
            inputRef={inputRef}
            shouldAutoFocus={shouldAutoFocus}
          />
        );
      })}

      {/* Lesson Lightbulbs - render all lessons positioned on screen */}
      {lessons.map((lesson) => {
        const pan = createLessonPanResponder(lesson.id);
        // Create or get ref for this lesson's input
        if (!lessonInputRefs.current[lesson.id]) {
          lessonInputRefs.current[lesson.id] = React.createRef<TextInput>();
        }
        const inputRef = lessonInputRefs.current[lesson.id]!;
        const shouldAutoFocus = newlyCreatedLessonId === lesson.id;

        // Calculate dynamic lesson size based on text or placeholder length
        const textToMeasure = lesson.text || lesson.placeholder || '';
        const baseSize = isLargeDevice ? 180 : 130;
        // Increase size based on text length - increased to 1.2px per character for better visibility
        const dynamicSize = Math.min(300, Math.max(baseSize, baseSize + Math.floor(textToMeasure.length * 1.2)));
        const lessonWidth = dynamicSize;
        const lessonHeight = dynamicSize;

        return (
          <AnimatedLesson
            key={lesson.id}
            lesson={lesson}
            panHandlers={pan.panHandlers}
            styles={styles}
            colors={colors}
            colorScheme={colorScheme}
            lessonWidth={lessonWidth}
            lessonHeight={lessonHeight}
            placeholder={lesson.placeholder || t('memory.lesson.placeholder')}
            onTextChange={(id, text) => {
              setLessons((prev) =>
                prev.map((l) => (l.id === id ? { ...l, text } : l))
              );
            }}
            onAnimationComplete={(id) => {
              setLessons((prev) =>
                prev.map((l) => (l.id === id ? { ...l, startX: undefined, startY: undefined } : l))
              );
              // Clear the newly created flag after animation completes
              if (newlyCreatedLessonId === id) {
                setNewlyCreatedLessonId(null);
              }
            }}
            onDelete={(id) => {
              setLessons((prev) => prev.filter((l) => l.id !== id));
              // Clean up ref when lesson is deleted
              delete lessonInputRefs.current[id];
              if (newlyCreatedLessonId === id) {
                setNewlyCreatedLessonId(null);
              }
            }}
            onRegisterAnimatedValues={(id, translateX, translateY) => {
              lessonAnimatedValues.current[id] = { translateX, translateY };
            }}
            viewOnly={viewOnly}
            inputRef={inputRef}
            shouldAutoFocus={shouldAutoFocus}
          />
        );
      })}

      {/* Floating Action Button - hidden in view-only mode */}
      {!viewOnly && (
        <View
          ref={floatingButtonRef}
          style={styles.floatingButton}
        >
          <FloatingActionButton
            onPress={handleCheckButtonPress}
            icon="check"
            containerStyle={
              !(memoryLabel.trim().length > 0 &&
                (clouds.length + suns.length + lessons.length) > 0 &&
                (clouds.length === 0 || clouds.every((cloud) => cloud.text.trim().length > 0)) &&
                (suns.length === 0 || suns.every((sun) => sun.text.trim().length > 0)) &&
                (lessons.length === 0 || lessons.every((lesson) => lesson.text.trim().length > 0))) || isSaving
                ? styles.floatingButtonDisabled
                : undefined
            }
          />
      </View>
      )}

    </View>
  );
}
