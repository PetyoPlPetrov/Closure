import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { FloatingActionButton } from '@/library/components/floating-action-button';
import { useJourney, type LifeSphere } from '@/utils/JourneyProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { logMomentCreated } from '@/utils/analytics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Defs, Path, Stop, Svg, LinearGradient as SvgLinearGradient } from 'react-native-svg';

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
  cloud: { id: string; text: string; x: number; y: number; startX?: number; startY?: number };
  panHandlers: any;
  styles: any;
  onTextChange: (id: string, text: string) => void;
  onAnimationComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onRegisterAnimatedValues: (id: string, translateX: any, translateY: any) => void;
  colors: typeof Colors.dark;
  cloudWidth: number;
  cloudHeight: number;
  placeholder: string;
  viewOnly?: boolean;
  inputRef?: React.RefObject<TextInput>;
  shouldAutoFocus?: boolean;
}) {
  // Animation values
  const translateX = useSharedValue(cloud.startX !== undefined ? cloud.startX : cloud.x);
  const translateY = useSharedValue(cloud.startY !== undefined ? cloud.startY : cloud.y);
  const opacity = useSharedValue(cloud.startX !== undefined ? 0 : 1);
  const scale = useSharedValue(cloud.startX !== undefined ? 0.3 : 1);
  const isAnimating = useRef(false);

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
  sun: { id: string; text: string; x: number; y: number; startX?: number; startY?: number };
  panHandlers: any;
  styles: any;
  onTextChange: (id: string, text: string) => void;
  onAnimationComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onRegisterAnimatedValues: (id: string, translateX: any, translateY: any) => void;
  colors: typeof Colors.dark;
  sunWidth: number;
  sunHeight: number;
  placeholder: string;
  viewOnly?: boolean;
  inputRef?: React.RefObject<TextInput>;
  shouldAutoFocus?: boolean;
}) {
  // Animation values
  const translateX = useSharedValue(sun.startX !== undefined ? sun.startX : sun.x);
  const translateY = useSharedValue(sun.startY !== undefined ? sun.startY : sun.y);
  const opacity = useSharedValue(sun.startX !== undefined ? 0 : 1);
  const scale = useSharedValue(sun.startX !== undefined ? 0.3 : 1);
  const isAnimating = useRef(false);

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
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FF8C00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          width: sunWidth,
          height: sunHeight,
          borderRadius: sunWidth / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={{
          position: 'absolute',
          top: sunHeight * 0.2,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <MaterialIcons 
            name="wb-sunny" 
            size={sunWidth * 0.5} 
            color="#FFFFFF" 
          />
        </View>
      </LinearGradient>
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
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingTop: sunHeight * 0.45,
        }}
      >
        <TextInput
          ref={inputRef}
          value={sun.text}
          onChangeText={(text) => {
            if (!viewOnly && text.length <= 50) {
              onTextChange(sun.id, text);
            }
          }}
          style={styles.sunTextInput}
          placeholder={placeholder}
          placeholderTextColor="rgba(0,0,0,0.5)"
          multiline
          maxLength={50}
          editable={!viewOnly}
          autoFocus={shouldAutoFocus}
        />
      </View>
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
  
  // Debug: log params to help troubleshoot
  if (__DEV__) {
    console.log('Memory screen params:', { profileId, entityId, sphere, memoryId, isNewMode });
  }
  
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
  }[]>([]);

  // Sun elements state - array of suns with position and animation (for good facts)
  const [suns, setSuns] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    startX?: number;
    startY?: number;
  }[]>([]);
  
  const initialClouds = useRef<typeof clouds>([]);
  const initialSuns = useRef<typeof suns>([]);
  
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
    
    return false;
  }, [memoryLabel, selectedImage, clouds, suns]);
  
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
    } else {
      // New memory - initialize refs with empty state
      initialMemoryLabel.current = '';
      initialSelectedImage.current = null;
      initialClouds.current = [];
      initialSuns.current = [];
    }
  }, [existingMemory, cloudWidth, cloudHeight, sunWidth, sunHeight, getInitialCloudPosition, getInitialSunPosition]);
  
  // Track button positions for animation
  const plusButtonRef = useRef<View>(null);
  const titleInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const sunButtonRef = useRef<View>(null);
  const floatingButtonRef = useRef<View>(null);
  const [plusButtonPos, setPlusButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [sunButtonPos, setSunButtonPos] = useState<{ x: number; y: number } | null>(null);
  
  // Track refs for cloud and sun TextInputs to enable auto-focus
  const cloudInputRefs = useRef<Record<string, TextInput | null>>({});
  const sunInputRefs = useRef<Record<string, TextInput | null>>({});
  
  // Track the ID of the newly created moment that should be focused
  const [newlyCreatedCloudId, setNewlyCreatedCloudId] = useState<string | null>(null);
  const [newlyCreatedSunId, setNewlyCreatedSunId] = useState<string | null>(null);
  
  // Track drag start positions for each cloud
  const dragStart = useRef<Record<string, { x: number; y: number }>>({});
  
  // Track upload container ref (kept for potential future use)
  const containerRef = useRef<View>(null);

  // Store panResponders in a ref to prevent re-creation on each render
  const panResponders = useRef<Record<string, any>>({});

  // Function to pick an image
  const pickImage = async () => {
    console.log('pickImage called'); // Debug log
    setIsLoadingImage(true);
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission status:', status); // Debug log
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

      console.log('Image picker result:', result); // Debug log
      setIsLoadingImage(false);
      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
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

    // Require at least one moment (cloud or sun) total
    const totalMoments = clouds.length + suns.length;
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

      if (isEditMode && memoryId) {
        // Update existing memory
        await updateIdealizedMemory(memoryId, {
          title: memoryLabel.trim(),
          imageUri: selectedImage || undefined,
          hardTruths,
          goodFacts: goodFacts.length > 0 ? goodFacts : undefined,
        });
      } else {
        // Create new memory - support both old (profileId) and new (entityId + sphere) signatures
        if (isNewMode && entityId && sphere) {
          // New signature: (entityId, sphere, memoryData)
          await addIdealizedMemory(entityId, sphere, {
            title: memoryLabel.trim(),
            imageUri: selectedImage || undefined,
            hardTruths,
            goodFacts: goodFacts.length > 0 ? goodFacts : undefined,
          });
        } else if (profileId) {
          // Old signature: (profileId, memoryData) - backward compatibility
          await addIdealizedMemory(profileId, {
            title: memoryLabel.trim(),
            imageUri: selectedImage || undefined,
            hardTruths,
            goodFacts: goodFacts.length > 0 ? goodFacts : undefined,
          });
        } else {
          throw new Error('Missing required parameters to save memory');
        }
      }
      
      // Update initial state after saving to prevent false positives
      initialMemoryLabel.current = memoryLabel.trim();
      initialSelectedImage.current = selectedImage;
      initialClouds.current = clouds.map(c => ({ ...c }));
      initialSuns.current = suns.map(s => ({ ...s }));
      
      // Navigate back after saving
      isNavigatingAway.current = true;
      router.back();
    } catch (error) {
      console.error('Error saving memory:', error);
      alert(t('memory.error.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Function to add a new cloud
  const addNewCloud = () => {
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
    };
    setClouds((prev) => [...prev, newCloud]);
    // Set the newly created cloud ID to trigger auto-focus
    setNewlyCreatedCloudId(newCloud.id);
    
    // Log analytics event
    logMomentCreated(finalSphere, 'cloud').catch((error) => {
      console.warn('Failed to log moment created:', error);
    });
  };

  // Function to add a new sun
  const addNewSun = () => {
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
    };
    setSuns((prev) => [...prev, newSun]);
    // Set the newly created sun ID to trigger auto-focus
    setNewlyCreatedSunId(newSun.id);
    
    // Log analytics event
    logMomentCreated(finalSphere, 'sun').catch((error) => {
      console.warn('Failed to log moment created:', error);
    });
  };

  // Store animated values ref for each cloud to access current position
  const cloudAnimatedValues = useRef<Record<string, { translateX: any; translateY: any }>>({});
  
  // Store animated values ref for each sun to access current position
  const sunAnimatedValues = useRef<Record<string, { translateX: any; translateY: any }>>({});

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
        
        // Calculate new position
        let newX = start.x + gesture.dx;
        let newY = start.y + gesture.dy;
        
        // Clamp to viewport bounds
        const minX = padding;
        const maxX = screenW - cloudWidth - padding;
        const minY = padding;
        const maxY = screenH - cloudHeight - padding;
        
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
        
        // Calculate new position
        let newX = start.x + gesture.dx;
        let newY = start.y + gesture.dy;
        
        // Clamp to viewport bounds
        const minX = padding;
        const maxX = screenW - sunWidth - padding;
        const minY = padding;
        const maxY = screenH - sunHeight - padding;
        
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
          borderWidth: 0,
          padding: 0,
          minHeight: 24,
        },

        buttonsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 40,
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
          fontSize: isLargeDevice ? 16 : 14,
          color: '#000000', // Dark text on bright sun
          textAlign: 'center',
          width: '100%',
          backgroundColor: 'transparent',
          fontWeight: '600',
        },

        sunDeleteButton: {
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1001,
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
                  <ThemedText style={{ marginTop: 12, opacity: 0.75 }}>
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
            <TextInput
              ref={titleInputRef}
              value={memoryLabel}
              onChangeText={setMemoryLabel}
              style={styles.memoryLabelInput}
              placeholder={t('memory.title.placeholder')}
              placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
              textAlign="center"
              editable={!viewOnly}
              onFocus={() => {
                // Scroll to title input when focused to ensure it's visible above keyboard
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                }, 300);
              }}
            />
          </View>

          {/* Add Hard Truth and Good Fact - Same Row - hidden in view-only mode */}
          {!viewOnly && (
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              ref={plusButtonRef}
              style={[
                styles.addHardTruthButton,
                clouds.length > 0 && !clouds.every((cloud) => cloud.text.trim().length > 0)
                  ? styles.addHardTruthButtonDisabled
                  : undefined,
              ]}
              onLayout={() => {
                plusButtonRef.current?.measure((fx, fy, width, height, px, py) => {
                  // px, py are relative to window, which matches root View coordinate system
                  const buttonCenterX = px + width / 2;
                  const buttonCenterY = py + height / 2;
                  setPlusButtonPos({ x: buttonCenterX, y: buttonCenterY });
                });
              }}
              onPress={addNewCloud}
              disabled={clouds.length > 0 && !clouds.every((cloud) => cloud.text.trim().length > 0)}
            >
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
            </TouchableOpacity>

            <TouchableOpacity
              ref={sunButtonRef}
              style={[
                styles.addGoodFactButton,
                suns.length > 0 && !suns.every((sun) => sun.text.trim().length > 0)
                  ? styles.addGoodFactButtonDisabled
                  : undefined,
              ]}
              onLayout={() => {
                sunButtonRef.current?.measure((fx, fy, width, height, px, py) => {
                  const buttonCenterX = px + width / 2;
                  const buttonCenterY = py + height / 2;
                  setSunButtonPos({ x: buttonCenterX, y: buttonCenterY });
                });
              }}
              onPress={addNewSun}
              disabled={suns.length > 0 && !suns.every((sun) => sun.text.trim().length > 0)}
            >
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
            </TouchableOpacity>
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
        const inputRef = cloudInputRefs.current[cloud.id];
        const shouldAutoFocus = newlyCreatedCloudId === cloud.id;
        
        return (
          <AnimatedCloud
            key={cloud.id}
            cloud={cloud}
            panHandlers={pan.panHandlers}
            styles={styles}
            colors={colors}
            cloudWidth={cloudWidth}
            cloudHeight={cloudHeight}
            placeholder={t('memory.hardTruth.placeholder')}
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
        const inputRef = sunInputRefs.current[sun.id];
        const shouldAutoFocus = newlyCreatedSunId === sun.id;
        
        return (
          <AnimatedSun
            key={sun.id}
            sun={sun}
            panHandlers={pan.panHandlers}
            styles={styles}
            colors={colors}
            sunWidth={sunWidth}
            sunHeight={sunHeight}
            placeholder={t('memory.goodFact.placeholder')}
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
                (clouds.length + suns.length) > 0 &&
                (clouds.length === 0 || clouds.every((cloud) => cloud.text.trim().length > 0)) &&
                (suns.length === 0 || suns.every((sun) => sun.text.trim().length > 0))) || isSaving
                ? styles.floatingButtonDisabled
                : undefined
            }
          />
      </View>
      )}
    </View>
  );
}
