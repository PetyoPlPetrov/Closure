import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { FloatingActionButton } from '@/library/components/floating-action-button';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  PanResponder,
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
      }, 1000);
    }
  }, [cloud.id, cloud.startX, cloud.startY, cloud.x, cloud.y, opacity, scale, translateX, translateY, onAnimationComplete]);

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
      {/* Delete button - top right corner */}
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
          value={cloud.text}
          onChangeText={(text) => {
            if (text.length <= 50) {
              onTextChange(cloud.id, text);
            }
          }}
          style={styles.cloudTextInput}
          placeholder="Enter hard truth..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          maxLength={50}
          editable={true}
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
      }, 1000);
    }
  }, [sun.id, sun.startX, sun.startY, sun.x, sun.y, opacity, scale, translateX, translateY, onAnimationComplete]);

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

  // Sun SVG path - circular with rays (using fixed viewBox size 100x100)
  const viewBoxSize = 100;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const radius = viewBoxSize * 0.35;
  const rayLength = viewBoxSize * 0.15;
  const numRays = 12;

  // Generate sun path with rays
  let sunPath = `M ${centerX + radius} ${centerY} `;
  for (let i = 0; i < numRays; i++) {
    const angle1 = (i * 2 * Math.PI) / numRays;
    const angle2 = ((i + 0.5) * 2 * Math.PI) / numRays;
    const angle3 = ((i + 1) * 2 * Math.PI) / numRays;
    
    const x1 = centerX + (radius + rayLength) * Math.cos(angle1);
    const y1 = centerY + (radius + rayLength) * Math.sin(angle1);
    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);
    const x3 = centerX + (radius + rayLength) * Math.cos(angle3);
    const y3 = centerY + (radius + rayLength) * Math.sin(angle3);
    
    sunPath += `L ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} `;
  }
  sunPath += 'Z';

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
      <Svg 
        width={sunWidth} 
        height={sunHeight} 
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute' }}
      >
        <Defs>
          <SvgLinearGradient id={`sunGradient-${sun.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={sunPath}
          fill={`url(#sunGradient-${sun.id})`}
          stroke="rgba(255,200,0,0.8)"
          strokeWidth={2}
        />
      </Svg>
      {/* Delete button - top right corner */}
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

      <View
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          value={sun.text}
          onChangeText={(text) => {
            if (text.length <= 50) {
              onTextChange(sun.id, text);
            }
          }}
          style={styles.sunTextInput}
          placeholder="Enter good fact..."
          placeholderTextColor="rgba(0,0,0,0.5)"
          multiline
          maxLength={50}
          editable={true}
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
  const { addIdealizedMemory, updateIdealizedMemory, getIdealizedMemoriesByProfileId } = useJourney();
  
  const profileId = params.profileId as string | undefined;
  const memoryId = params.memoryId as string | undefined;
  const isEditMode = memoryId !== undefined;
  
  // Get existing memory if editing
  const existingMemories = profileId ? getIdealizedMemoriesByProfileId(profileId) : [];
  const existingMemory = memoryId ? existingMemories.find(m => m.id === memoryId) : null;

  // Redirect if profileId is missing
  useEffect(() => {
    if (!profileId) {
      alert('Profile ID is missing. Redirecting back...');
      router.back();
    }
  }, [profileId]);

  // 🔥 Two-way binding
  const [memoryLabel, setMemoryLabel] = useState(existingMemory?.title || 'Our first vacation');
  const [selectedImage, setSelectedImage] = useState<string | null>(existingMemory?.imageUri || null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
    
    // Center vertically on screen
    const centerY = (screenH / 2) - (sunHeight / 2);
    
    // Center horizontally on screen
    const centerX = (screenW / 2) - (sunWidth / 2);
    
    // Add small random offset (5-10 pixels) to prevent exact stacking
    const offsetX = (Math.random() - 0.5) * 10; // -5 to +5 pixels
    const offsetY = (Math.random() - 0.5) * 10; // -5 to +5 pixels
    
    return {
      x: centerX + offsetX,
      y: centerY + offsetY,
    };
  }, [sunWidth, sunHeight]);

  // Load existing memory data when editing
  useEffect(() => {
    if (existingMemory) {
      setMemoryLabel(existingMemory.title || 'Our first vacation');
      setSelectedImage(existingMemory.imageUri || null);
      
      // Initialize clouds from existing memory
      if (existingMemory.hardTruths && existingMemory.hardTruths.length > 0) {
        const initialClouds = existingMemory.hardTruths.map((truth) => {
          // Use saved positions if available, otherwise calculate default position
          if (truth.x !== undefined && truth.y !== undefined) {
            return {
              id: truth.id,
              text: truth.text,
              x: truth.x,
              y: truth.y,
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
        
        setClouds(initialClouds);
      }

      // Initialize suns from existing memory
      if (existingMemory.goodFacts && existingMemory.goodFacts.length > 0) {
        const initialSuns = existingMemory.goodFacts.map((fact) => {
          // Use saved positions if available, otherwise calculate default position
          if (fact.x !== undefined && fact.y !== undefined) {
            return {
              id: fact.id,
              text: fact.text,
              x: fact.x,
              y: fact.y,
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
        
        setSuns(initialSuns);
      }
    }
  }, [existingMemory, cloudWidth, cloudHeight, sunWidth, sunHeight, getInitialCloudPosition, getInitialSunPosition]);
  
  // Track button positions for animation
  const plusButtonRef = useRef<View>(null);
  const sunButtonRef = useRef<View>(null);
  const floatingButtonRef = useRef<View>(null);
  const [plusButtonPos, setPlusButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [sunButtonPos, setSunButtonPos] = useState<{ x: number; y: number } | null>(null);
  
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
        alert('Sorry, we need camera roll permissions to upload photos!');
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
      alert('Failed to pick image. Please try again.');
    }
  };

  // Function to handle check button press - save the memory
  const handleCheckButtonPress = async () => {
    if (!profileId) {
      alert('Profile ID is missing. Please go back and try again.');
      return;
    }

    const allCloudsHaveText = clouds.length > 0 && clouds.every((cloud) => cloud.text.trim().length > 0);
    const allSunsHaveText = suns.length === 0 || suns.every((sun) => sun.text.trim().length > 0);
    
    if (!allCloudsHaveText) {
      // Show alert to fill all clouds
      alert('Please fill all available clouds with text before continuing.');
      return;
    }

    if (!allSunsHaveText) {
      // Show alert to fill all suns
      alert('Please fill all available suns with text before continuing.');
      return;
    }

    if (memoryLabel.trim().length === 0) {
      alert('Please enter a memory title.');
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
        // Create new memory
        await addIdealizedMemory(profileId, {
          title: memoryLabel.trim(),
          imageUri: selectedImage || undefined,
          hardTruths,
          goodFacts: goodFacts.length > 0 ? goodFacts : undefined,
        });
      }
      
      // Navigate back after saving
      router.back();
    } catch (error) {
      console.error('Error saving memory:', error);
      alert('Failed to save memory. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to add a new cloud
  const addNewCloud = () => {
    // Check if all existing clouds have text
    const allCloudsHaveText = clouds.length === 0 || clouds.every((cloud) => cloud.text.trim().length > 0);
    
    if (!allCloudsHaveText) {
      alert('Please fill all existing clouds with text before adding a new one.');
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
  };

  // Function to add a new sun
  const addNewSun = () => {
    // Check if all existing suns have text
    const allSunsHaveText = suns.length === 0 || suns.every((sun) => sun.text.trim().length > 0);
    
    if (!allSunsHaveText) {
      alert('Please fill all existing suns with text before adding a new one.');
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

        setClouds((prev) =>
          prev.map((c) =>
            c.id === cloudId
              ? { ...c, x: start.x + gesture.dx, y: start.y + gesture.dy }
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

        setSuns((prev) =>
          prev.map((s) =>
            s.id === sunId
              ? { ...s, x: start.x + gesture.dx, y: start.y + gesture.dy }
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

        hardTruthRow: {
          alignSelf: 'flex-start',
          marginTop: 40,
          marginLeft: 4,
          flexDirection: 'row',
          alignItems: 'center',
        },

        addHardTruthButton: {
          width: isLargeDevice ? 56 : 44, // Bigger on large devices
          height: isLargeDevice ? 56 : 44, // Bigger on large devices
          borderRadius: isLargeDevice ? 28 : 22,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
        },
        addHardTruthButtonDisabled: {
          opacity: 0.4,
        },

        hardTruthText: {
          marginLeft: 10,
          fontSize: isLargeDevice ? 20 : 16, // Bigger on large devices
          fontWeight: '500',
          color: colors.text,
          opacity: 0.9,
        },

        floatingButton: {
          position: 'absolute',
          bottom: 26,
          right: 22,
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

        goodFactRow: {
          alignSelf: 'flex-end',
          marginTop: 40,
          marginRight: 4,
          flexDirection: 'row',
          alignItems: 'center',
        },

        addGoodFactButton: {
          width: isLargeDevice ? 56 : 44,
          height: isLargeDevice ? 56 : 44,
          borderRadius: isLargeDevice ? 28 : 22,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
        },
        addGoodFactButtonDisabled: {
          opacity: 0.4,
        },

        goodFactText: {
          marginRight: 10,
          fontSize: isLargeDevice ? 20 : 16,
          fontWeight: '500',
          color: colors.text,
          opacity: 0.9,
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
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <ThemedText size="l" weight="bold" style={styles.headerTitle}>
          Memory
        </ThemedText>

        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="help-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Scroll content */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.centerContent}>
          <View style={styles.uploadShadowWrap}>
            <TouchableOpacity
              ref={containerRef}
              style={styles.uploadContainer}
              onPress={pickImage}
              onLayout={() => {
                // Container ref is available for potential future use
              }}
              activeOpacity={0.8}
              delayPressIn={0}
              disabled={isLoadingImage}
            >
              {isLoadingImage ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primaryLight} />
                  <ThemedText style={{ marginTop: 12, opacity: 0.75 }}>
                    Opening gallery...
                  </ThemedText>
                </View>
              ) : selectedImage ? (
                <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.uploadedImage}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.imageDeleteButton}
                    onPress={() => setSelectedImage(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.deleteBadge}>
                      <View style={styles.deleteLine} />
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
              <MaterialIcons
                name="add-a-photo"
                size={50}
                color={colors.primaryLight}
              />
              <ThemedText style={{ marginTop: 6, opacity: 0.75 }}>
                Tap to Add Photo
              </ThemedText>
                </>
              )}
            </TouchableOpacity>
            </View>

          {/* Editable memory label */}
          <View style={styles.memoryLabelContainer}>
            <TextInput
              value={memoryLabel}
              onChangeText={setMemoryLabel}
              style={styles.memoryLabelInput}
              placeholder="Our first vacation"
              placeholderTextColor="rgba(255,255,255,0.4)"
              textAlign="center"
            />
          </View>

          {/* Add Hard Truth */}
          <View style={styles.hardTruthRow}>
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
              <MaterialIcons name="add" size={isLargeDevice ? 32 : 24} color={colors.text} />
            </TouchableOpacity>

            <ThemedText style={styles.hardTruthText}>
              Add Hard Truth
            </ThemedText>
          </View>

          {/* Add Good Fact */}
          <View style={styles.goodFactRow}>
            <ThemedText style={styles.goodFactText}>
              Add Good Fact
            </ThemedText>
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
              <MaterialIcons name="add" size={isLargeDevice ? 32 : 24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Cloud Bubbles - render all clouds positioned on screen (after ScrollView to ensure they appear on top) */}
      {clouds.map((cloud) => {
        const pan = createPanResponder(cloud.id);
        return (
          <AnimatedCloud
            key={cloud.id}
            cloud={cloud}
            panHandlers={pan.panHandlers}
            styles={styles}
            colors={colors}
            cloudWidth={cloudWidth}
            cloudHeight={cloudHeight}
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
            }}
            onDelete={(id) => {
              setClouds((prev) => prev.filter((c) => c.id !== id));
            }}
            onRegisterAnimatedValues={(id, translateX, translateY) => {
              cloudAnimatedValues.current[id] = { translateX, translateY };
            }}
          />
        );
      })}

      {/* Sun Elements - render all suns positioned on screen */}
      {suns.map((sun) => {
        const pan = createSunPanResponder(sun.id);
        return (
          <AnimatedSun
            key={sun.id}
            sun={sun}
            panHandlers={pan.panHandlers}
            styles={styles}
            colors={colors}
            sunWidth={sunWidth}
            sunHeight={sunHeight}
            onTextChange={(id, text) => {
              setSuns((prev) =>
                prev.map((s) => (s.id === id ? { ...s, text } : s))
              );
            }}
            onAnimationComplete={(id) => {
              setSuns((prev) =>
                prev.map((s) => (s.id === id ? { ...s, startX: undefined, startY: undefined } : s))
              );
            }}
            onDelete={(id) => {
              setSuns((prev) => prev.filter((s) => s.id !== id));
            }}
            onRegisterAnimatedValues={(id, translateX, translateY) => {
              sunAnimatedValues.current[id] = { translateX, translateY };
            }}
          />
        );
      })}

      {/* Floating Action Button - always visible, enabled when all clouds and suns have text */}
      <View
        ref={floatingButtonRef}
        style={styles.floatingButton}
      >
        <FloatingActionButton
          onPress={handleCheckButtonPress}
          icon="check"
          containerStyle={
            !(clouds.length > 0 && clouds.every((cloud) => cloud.text.trim().length > 0) &&
              (suns.length === 0 || suns.every((sun) => sun.text.trim().length > 0))) || isSaving
              ? styles.floatingButtonDisabled
              : undefined
          }
        />
      </View>
    </View>
  );
}
