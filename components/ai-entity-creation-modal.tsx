import { AIEntityResultsView } from '@/components/ai-entity-results-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import {
  clearPendingEntityError,
  clearPendingEntityRequest,
  clearPendingEntityResponse,
  getPendingEntityError,
  getPendingEntityRequest,
  getPendingEntityResponse,
  isBackgroundEntityTaskRunning,
  startBackgroundEntityProcessing,
  stopBackgroundEntityProcessing,
  type PendingEntityResponse,
} from '@/utils/ai-background-processor';
import { processEntityCreationPrompt, type AIEntityCreationResponse } from '@/utils/ai-service';
import { LifeSphere, useJourney } from '@/utils/JourneyProvider';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Conditionally import Voice
import type { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default || require('@react-native-voice/voice');
} catch (error) {
  // Voice module not available
}

type AIEntityCreationModalProps = {
  visible: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onEntityCreated?: () => void;
  onCreateMemory?: () => void;
  pendingResponse?: PendingEntityResponse | null;
};

const SPHERES: { value: LifeSphere; label: string; icon: string }[] = [
  { value: 'relationships', label: 'Relationships', icon: 'favorite' },
  { value: 'career', label: 'Career', icon: 'work' },
  { value: 'family', label: 'Family', icon: 'family-restroom' },
  { value: 'friends', label: 'Friends', icon: 'people' },
  { value: 'hobbies', label: 'Hobbies', icon: 'sports-esports' },
];

export function AIEntityCreationModal({
  visible,
  onClose,
  onMinimize,
  onEntityCreated,
  onCreateMemory,
  pendingResponse,
}: AIEntityCreationModalProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();
  const { language } = useLanguage();
  const { addProfile, addJob, addFamilyMember, addFriend, addHobby } = useJourney();

  const [selectedSphere, setSelectedSphere] = useState<LifeSphere>('family');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [partialResults, setPartialResults] = useState('');
  const baseTextRef = useRef('');
  const [aiResponse, setAiResponse] = useState<AIEntityCreationResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showOpenSferaModal, setShowOpenSferaModal] = useState(false);
  const [savedSphere, setSavedSphere] = useState<LifeSphere | null>(null);
  const [backgroundRequestId, setBackgroundRequestId] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const isMinimizingRef = useRef(false);

  // Keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const micScale = useSharedValue(1);
  const micOpacity = useSharedValue(1);

  // Loading messages that rotate
  const loadingMessages = [
    t('ai.loading.thinking') || 'AI is thinking...',
    t('ai.loading.analyzing') || 'Analyzing your thoughts...',
    t('ai.loading.processing') || 'Processing entities...',
    t('ai.loading.generating') || 'Generating insights...',
  ];
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Enhanced loading animations
  const sparkleScale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(1);
  const loadingPulseScale = useSharedValue(1);
  const dotsOpacity = useSharedValue([0.3, 0.3, 0.3]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      micScale.value = withSpring(0.3);
      micOpacity.value = withTiming(0.3);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      micScale.value = withSpring(1);
      micOpacity.value = withTiming(1);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // App state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // Rotate loading messages when processing
  useEffect(() => {
    if (isProcessing && !aiResponse) {
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, aiResponse, loadingMessages.length]);

  // Enhanced loading animations
  useEffect(() => {
    if (isProcessing && !aiResponse) {
      // Sparkle pulse animation
      sparkleScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      // Sparkle opacity fade
      sparkleOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );

      // Pulse animation for background glow
      loadingPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      // Animated dots
      dotsOpacity.value = withRepeat(
        withSequence(
          withTiming([1, 0.3, 0.3], { duration: 400 }),
          withTiming([0.3, 1, 0.3], { duration: 400 }),
          withTiming([0.3, 0.3, 1], { duration: 400 }),
          withTiming([0.3, 0.3, 0.3], { duration: 400 })
        ),
        -1,
        false
      );
    } else {
      // Reset animations when not loading
      sparkleScale.value = 1;
      sparkleOpacity.value = 1;
      loadingPulseScale.value = 1;
      dotsOpacity.value = [0.3, 0.3, 0.3];
    }
  }, [isProcessing, aiResponse, sparkleScale, sparkleOpacity, loadingPulseScale, dotsOpacity]);

  // Check if there's a pending request (processing in background)
  const checkPendingRequest = async () => {
    try {
      const pendingRequest = await getPendingEntityRequest();
      const isRunning = await isBackgroundEntityTaskRunning();
      if (pendingRequest || isRunning) {
        setIsProcessing(true);
        if (pendingRequest?.requestId) {
          setBackgroundRequestId(pendingRequest.requestId);
        }
      }
    } catch (error) {
      // Failed to check pending request
    }
  };

  // Check for pending entity creation response or error
  const checkPendingEntityResponse = async () => {
    try {
      // First check for errors
      const pendingError = await getPendingEntityError();
      if (pendingError) {
        await clearPendingEntityError();
        setIsProcessing(false);
        Alert.alert(
          t('ai.error.title') || 'AI Processing Failed',
          (t('ai.error.message') || 'Failed to process your request: {error}. Please try again.').replace('{error}', pendingError.error),
          [{ text: t('common.ok') || 'OK' }]
        );
        setBackgroundRequestId(null);
        return;
      }
      
      // Check for successful response
      const pendingResponse = await getPendingEntityResponse();
      if (pendingResponse) {
        setIsProcessing(true);
        setAiResponse(pendingResponse.response);
        setShowResults(true);
        setIsProcessing(false);
        await clearPendingEntityResponse();
        await clearPendingEntityRequest();
        await stopBackgroundEntityProcessing();
        setBackgroundRequestId(null);
      }
    } catch (error) {
      // Failed to check pending entity response
    }
  };

  // Check for pending response when modal opens
  useEffect(() => {
    if (visible) {
      isMinimizingRef.current = false;
      checkPendingEntityResponse();
      checkPendingRequest();
    } else {
      // Reset state when modal closes (but not when minimized)
      if (!isMinimizingRef.current) {
        setIsProcessing(false);
        setBackgroundRequestId(null);
        setAiResponse(null);
        setShowResults(false);
      }
      isMinimizingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Watch for pendingResponse prop changes while modal is open
  useEffect(() => {
    if (visible && isProcessing && !aiResponse && pendingResponse?.response) {
      setAiResponse(pendingResponse.response);
      setShowResults(true);
      setIsProcessing(false);
      stopBackgroundEntityProcessing().then(() => {
        setBackgroundRequestId(null);
      });
    }
     
  }, [pendingResponse, visible, isProcessing, aiResponse]);

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
    opacity: micOpacity.value,
  }));

  // Voice recognition setup
  useEffect(() => {
    if (!Voice) return;

    Voice.onSpeechStart = () => {
      setIsListening(true);
      setIsRecording(true);
      // Preserve existing text when starting new recording session
      baseTextRef.current = inputText;
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      setIsRecording(false);
      setPartialResults('');
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      // Final results - commit to baseTextRef
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0].trim();
        if (transcript) {
          const currentBase = baseTextRef.current;
          const newText = currentBase 
            ? `${currentBase} ${transcript}`.trim()
            : transcript;
          baseTextRef.current = newText;
          setInputText(newText);
        }
        setPartialResults('');
      }
      setIsRecording(false);
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      // Partial results - only for preview, don't commit
      if (e.value && e.value.length > 0) {
        const partial = e.value[0].trim();
        setPartialResults(partial);
        // Show preview: baseTextRef + partial (temporary)
        const currentBase = baseTextRef.current;
        const previewText = currentBase 
          ? `${currentBase} ${partial}`.trim()
          : partial;
        setInputText(previewText);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setIsRecording(false);
      setIsListening(false);
      setPartialResults('');
      
      // Ignore "No speech input" errors (code 7)
      if (e.error?.code === '7') {
        return;
      }
      
      // Handle specific error codes
      let errorMessage = e.error?.message || t('ai.error.recording') || 'Speech recognition failed';
      
      if (e.error?.code === 'audio' || e.error?.message?.toLowerCase().includes('session activation')) {
        errorMessage = 'Audio session failed. Please close other apps using the microphone and try again.';
      }
      
      Alert.alert(
        t('common.error') || 'Error',
        errorMessage
      );
    };

    return () => {
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      }
    };
  }, [inputText, t]);

  const handleStartRecording = async () => {
    if (!Voice) {
      Alert.alert(t('common.error') || 'Error', (t('ai.error.notAvailable' as any)) || 'Speech recognition is not available');
      return;
    }

    try {
      // Cleanup previous session
      try {
        await Voice.stop();
      } catch (e) {
        // Ignore if not running
      }
      try {
        await Voice.cancel();
      } catch (e) {
        // Ignore if not running
      }
      try {
        await Voice.destroy();
      } catch (e) {
        // Ignore if already destroyed
      }
      
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));

      const languageCode = language === 'bg' ? 'bg-BG' : 'en-US';
      
      // Android-specific options for better speech recognition
      const options = Platform.OS === 'android' 
        ? {
            RECOGNIZER_ENGINE: 'GOOGLE',
            EXTRA_PARTIAL_RESULTS: true,
            EXTRA_LANGUAGE_MODEL: 'free_form',
            EXTRA_MAX_RESULTS: 5,
            EXTRA_CALLING_PACKAGE: 'com.petyoplpetrov.Sphere',
            // Silence timeout - Android only
            silenceTimeout: 5000, // 5 seconds of silence before stopping
          }
        : {};

      await Voice.start(languageCode, options);
      setIsRecording(true);
    } catch (error: any) {
      setIsRecording(false);
      Alert.alert(
        t('common.error') || 'Error',
        error.message || t('ai.error.recording') || 'Failed to start recording'
      );
    }
  };

  const handleStopRecording = async () => {
    if (!Voice) return;
    try {
      await Voice.stop();
      setIsRecording(false);
    } catch (error) {
      // Failed to stop recording
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() || inputText.trim().length < 10) {
      setShowValidationErrors(true);
      Alert.alert(t('common.error') || 'Error', t('ai.error.empty') || 'Please enter at least 10 words');
      return;
    }

    // Clear validation errors if validation passes
    setShowValidationErrors(false);

    // Only process family, friends, hobbies, relationships, and career with AI
    if (['family', 'friends', 'hobbies', 'relationships', 'career'].includes(selectedSphere)) {
      setIsProcessing(true);
      try {
        // Ensure language is defined (default to 'en' if not available)
        const currentLanguage = language || 'en';
        
        // Start background processing
        const requestId = await startBackgroundEntityProcessing(
          inputText.trim(),
          selectedSphere as 'family' | 'friends' | 'hobbies' | 'relationships' | 'career',
          currentLanguage
        );
        setBackgroundRequestId(requestId);

        // Try foreground processing if app is active
        if (appState === 'active') {
          try {
            const response = await processEntityCreationPrompt(
              inputText.trim(),
              selectedSphere as 'family' | 'friends' | 'hobbies' | 'relationships' | 'career',
              currentLanguage
            );
            
            const currentAppState = AppState.currentState;
            if (currentAppState === 'active') {
              await stopBackgroundEntityProcessing();
              setBackgroundRequestId(null);
              setAiResponse(response);
              setShowResults(true);
              setIsProcessing(false);
            }
          } catch (error) {
            const currentAppState = AppState.currentState;
            if (currentAppState === 'active') {
              setIsProcessing(false);
              const errorMessage = error instanceof Error ? error.message : String(error);
              Alert.alert(
                t('ai.error.title') || 'AI Processing Failed',
                (t('ai.error.message') || 'Failed to process your request: {error}. Please try again.').replace('{error}', errorMessage),
                [{ text: t('common.ok') || 'OK' }]
              );
            }
          }
        }
      } catch (error: any) {
        Alert.alert(
          t('common.error') || 'Error',
          error.message || t('ai.error.send') || 'Failed to process request'
        );
        setIsProcessing(false);
      }
    } else {
      // For career, use the old simple flow (can be enhanced later)
      setIsProcessing(true);
      try {
        const trimmedText = inputText.trim();
        const nameMatch = trimmedText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
        const name = nameMatch ? nameMatch[1] : 'New Entity';

        await addJob({
          name,
          description: trimmedText.substring(0, 200),
          setupProgress: 0,
          isCompleted: false,
        });

        Alert.alert(
          t('common.success') || 'Success',
          'Entity created successfully!',
          [{ text: t('common.ok') || 'OK', onPress: () => {
            onClose();
            setInputText('');
            setSelectedSphere('family');
            if (onEntityCreated) onEntityCreated();
          }}]
        );
      } catch (error: any) {
        Alert.alert(
          t('common.error') || 'Error',
          error.message || 'Failed to create entity'
        );
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleResultsSave = async () => {
    // Store the sphere before clearing state
    const sphereToOpen = aiResponse?.sphere || selectedSphere;
    
    await clearPendingEntityResponse();
    await clearPendingEntityRequest();
    await stopBackgroundEntityProcessing();
    setBackgroundRequestId(null);
    setInputText('');
    setSelectedSphere('family');
    setAiResponse(null);
    setShowResults(false);
    
    // Show the "Open Sfera" modal
    setSavedSphere(sphereToOpen);
    setShowOpenSferaModal(true);
    
    if (onEntityCreated) onEntityCreated();
  };

  const handleOpenSfera = () => {
    console.log('🟣 [AI Entity Modal] handleOpenSfera called');
    console.log('🟣 [AI Entity Modal] savedSphere:', savedSphere);
    if (savedSphere) {
      const sphereToOpen = savedSphere;
      console.log('🟣 [AI Entity Modal] Navigating to sphere:', sphereToOpen);
      
      setShowOpenSferaModal(false);
      setSavedSphere(null);
      onClose();
      
      // Longer delay to ensure modal closes and state is cleared before navigation
      setTimeout(() => {
        // Navigate to the spheres tab with the specific sphere
        // Use push instead of replace to ensure params are updated even if already on the route
        const navigationParams = { selectedSphere: sphereToOpen };
        console.log('🟣 [AI Entity Modal] router.push with params:', navigationParams);
        router.push({
          pathname: '/(tabs)/spheres' as const,
          params: navigationParams,
        });
        console.log('🟣 [AI Entity Modal] router.push completed');
      }, 200);
    } else {
      console.log('🟣 [AI Entity Modal] No savedSphere, cannot navigate');
    }
  };

  const handleCancelOpenSfera = () => {
    setShowOpenSferaModal(false);
    onClose();
    setSavedSphere(null);
  };

  const handleResultsCancel = () => {
    Alert.alert(
      t('ai.closeConfirm.title') || 'Discard changes?',
      t('ai.closeConfirm.message') || 'Your progress will be lost if you close this modal.',
      [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('ai.closeConfirm.discard') || 'Discard',
          style: 'destructive',
          onPress: async () => {
            // Clear all state and close modals
            await clearPendingEntityResponse();
            await clearPendingEntityRequest();
            await stopBackgroundEntityProcessing();
            setBackgroundRequestId(null);
            setAiResponse(null);
            setShowResults(false);
            setInputText('');
            setSelectedSphere('family');
            onClose();
          },
        },
      ]
    );
  };

  const handleMinimize = () => {
    if (onMinimize && isProcessing && !aiResponse) {
      isMinimizingRef.current = true;
      onMinimize();
    }
  };

  // Animated styles for loading
  const animatedSparkleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sparkleScale.value }
    ],
    opacity: sparkleOpacity.value,
  }));

  const animatedPulseBgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingPulseScale.value }],
  }));

  const animatedDot1Style = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value[0],
  }));

  const animatedDot2Style = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value[1],
  }));

  const animatedDot3Style = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value[2],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        container: {
          width: 360 * fontScale, // Fixed width
          maxWidth: 360 * fontScale,
          maxHeight: '75%',
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          borderRadius: 20 * fontScale,
          overflow: 'hidden',
        },
        containerLoading: {
          width: 360 * fontScale, // Fixed width
          maxWidth: 360 * fontScale,
          height: 500 * fontScale, // Fixed height during loading
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          borderRadius: 20 * fontScale,
          overflow: 'hidden',
        },
        header: {
          padding: 16 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 12 * fontScale,
          paddingRight: 50 * fontScale, // Add padding to prevent title from overlapping close button
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          position: 'relative',
        },
        headerTitle: {
          marginBottom: 4 * fontScale,
          flexShrink: 0,
        },
        headerButtons: {
          position: 'absolute',
          top: 12 * fontScale,
          right: 12 * fontScale,
          flexDirection: 'row',
          gap: 8 * fontScale,
          zIndex: 10,
        },
        closeButton: {
          width: 32 * fontScale,
          height: 32 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : 'rgba(0, 0, 0, 0.08)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        minimizeButton: {
          width: 32 * fontScale,
          height: 32 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : 'rgba(0, 0, 0, 0.08)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        loadingContainer: {
          flex: 1,
          paddingVertical: 20 * fontScale,
          backgroundColor: 'transparent',
        },
        loadingIndicatorContainer: {
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingVertical: 40 * fontScale,
          paddingHorizontal: 20 * fontScale,
          marginTop: 24 * fontScale,
          overflow: 'visible',
        },
        animationCirclesContainer: {
          position: 'relative',
          width: 200 * fontScale,
          height: 200 * fontScale,
          marginBottom: 24 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        loadingGlow: {
          position: 'absolute',
          width: 200 * fontScale,
          height: 200 * fontScale,
          borderRadius: 100 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 215, 0, 0.15)' 
            : 'rgba(255, 215, 0, 0.25)',
          top: 0,
          left: '50%',
          marginLeft: -100 * fontScale,
        },
        aiIconWrapper: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -70 * fontScale,
          marginTop: -70 * fontScale,
          width: 140 * fontScale,
          height: 140 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        aiIconContainer: {
          width: 140 * fontScale,
          height: 140 * fontScale,
          borderRadius: 70 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 215, 0, 0.15)' 
            : 'rgba(255, 215, 0, 0.25)',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10,
        },
        loadingMessageContainer: {
          alignItems: 'center',
          marginTop: 8 * fontScale,
          width: '100%',
          paddingHorizontal: 20 * fontScale,
        },
        loadingMessage: {
          textAlign: 'center',
          opacity: 0.9,
          marginBottom: 12 * fontScale,
          width: '100%',
        },
        loadingDots: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8 * fontScale,
          marginTop: 4 * fontScale,
        },
        loadingDot: {
          width: 8 * fontScale,
          height: 8 * fontScale,
          borderRadius: 4 * fontScale,
          backgroundColor: colors.primary,
        },
        progressBarContainer: {
          width: '100%',
          marginTop: 24 * fontScale,
          paddingHorizontal: 20 * fontScale,
        },
        progressBarBackground: {
          width: '100%',
          height: 4 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          borderRadius: 2 * fontScale,
          overflow: 'hidden',
        },
        progressBarFill: {
          height: '100%',
          backgroundColor: colors.primary,
          borderRadius: 2 * fontScale,
        },
        content: {
          padding: 16 * fontScale,
        },
        sphereContainer: {
          marginBottom: 16 * fontScale,
        },
        sphereOption: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12 * fontScale,
          borderRadius: 12 * fontScale,
          marginBottom: 8 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
        },
        sphereOptionActive: {
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(100, 150, 255, 0.2)' 
            : 'rgba(100, 150, 255, 0.15)',
          borderWidth: 1,
          borderColor: colors.primary,
        },
        sphereIcon: {
          marginRight: 12 * fontScale,
        },
        inputContainer: {
          marginBottom: 16 * fontScale,
        },
        inputLabel: {
          marginBottom: 8 * fontScale,
        },
        inputWrapper: {
          position: 'relative',
        },
        textInput: {
          minHeight: 80 * fontScale,
          padding: 12 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
          color: colors.text,
          fontSize: 15 * fontScale,
          textAlignVertical: 'top',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
        },
        textInputError: {
          borderColor: '#FF3B30',
          borderWidth: 2,
        },
        micButton: {
          position: 'absolute',
          bottom: 12 * fontScale,
          right: 12 * fontScale,
          width: 44 * fontScale,
          height: 44 * fontScale,
          borderRadius: 22 * fontScale,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        },
        micButtonRecording: {
          backgroundColor: '#FF4444',
        },
        submitButton: {
          height: 48 * fontScale,
          borderRadius: 12 * fontScale,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 12 * fontScale,
          overflow: 'hidden',
          position: 'relative',
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
      }),
    [fontScale, colorScheme, colors]
  );

  // Allow "Open Sfera" modal to show even if main modal is closed
  if (!visible && !showOpenSferaModal) return null;
  
  // If "Open Sfera" modal should be shown, show only that
  if (showOpenSferaModal) {
    const sphereLabel = savedSphere 
      ? SPHERES.find(s => s.value === savedSphere)?.label || savedSphere
      : 'Sfera';
    
    return (
      <Modal
        visible={showOpenSferaModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelOpenSfera}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <Pressable 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20 * fontScale,
          }}
          onPress={handleCancelOpenSfera}
        >
          <Pressable
            style={{
              backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
              borderRadius: 16 * fontScale,
              padding: 24 * fontScale,
              width: '100%',
              maxWidth: 400 * fontScale,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ alignItems: 'center', marginBottom: 12 * fontScale }}>
              <ThemedText size="xl" weight="bold" style={{ textAlign: 'center' }}>
                {t('ai.entity.openSferaMessage') || 'Entities have been saved successfully!'}
              </ThemedText>
            </View>
            
            <View style={{ gap: 12 * fontScale, marginTop: 24 * fontScale }}>
              <TouchableOpacity
                style={{
                  width: '100%',
                  borderRadius: 8 * fontScale,
                  padding: 14 * fontScale,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onPress={handleOpenSfera}
                activeOpacity={0.8}
              >
                <View style={[StyleSheet.absoluteFillObject, { borderRadius: 8 * fontScale, overflow: 'hidden' }]}>
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD', '#2E6DA4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
                <ThemedText size="sm" weight="bold" style={{ color: '#FFFFFF', textAlign: 'center' }}>
                  {t('ai.entity.openSfera') ? `${t('ai.entity.openSfera')} ${sphereLabel}` : `Open ${sphereLabel} Sfera`}
                </ThemedText>
              </TouchableOpacity>
              
              {onCreateMemory && (
                <TouchableOpacity
                  style={{
                    width: '100%',
                    borderRadius: 8 * fontScale,
                    padding: 14 * fontScale,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  onPress={() => {
                    setShowOpenSferaModal(false);
                    onClose();
                    onCreateMemory();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[StyleSheet.absoluteFillObject, { borderRadius: 8 * fontScale, overflow: 'hidden' }]}>
                    <LinearGradient
                      colors={['#4A90E2', '#357ABD', '#2E6DA4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                  <ThemedText size="sm" weight="bold" style={{ color: '#FFFFFF', textAlign: 'center' }}>
                    {t('ai.action.createMemory') || 'Create Memory'}
                  </ThemedText>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={{
                  width: '100%',
                  backgroundColor: colorScheme === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 8 * fontScale,
                  padding: 14 * fontScale,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleCancelOpenSfera}
                activeOpacity={0.8}
              >
                <ThemedText size="sm" weight="medium" style={{ textAlign: 'center' }}>
                  {t('common.cancel') || 'Cancel'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // Show results view if AI response is ready
  if (showResults && aiResponse && !showOpenSferaModal) {
    return (
      <>
        <Modal
          visible={visible && !showOpenSferaModal}
          transparent={false}
          animationType="slide"
          onRequestClose={handleResultsCancel}
          presentationStyle="fullScreen"
          statusBarTranslucent
        >
        <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff' }}>
          <View style={{ 
            padding: 16 * fontScale, 
            paddingTop: 50 * fontScale,
            borderBottomWidth: 1,
            borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <ThemedText size="xl" weight="bold">
              {t('ai.entity.results') || 'Review Entities'}
            </ThemedText>
            <TouchableOpacity
              style={{
                width: 32 * fontScale,
                height: 32 * fontScale,
                borderRadius: 16 * fontScale,
                backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleResultsCancel}
            >
              <MaterialIcons 
                name="close" 
                size={20 * fontScale} 
                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
              />
            </TouchableOpacity>
          </View>
          <AIEntityResultsView
            sphere={aiResponse.sphere}
            entities={aiResponse.entities}
            onSave={handleResultsSave}
            onCancel={handleResultsCancel}
          />
        </View>
      </Modal>
      
      {/* Open Sfera Modal */}
      <Modal
        visible={showOpenSferaModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelOpenSfera}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <Pressable 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20 * fontScale,
          }}
          onPress={handleCancelOpenSfera}
        >
          <Pressable
            style={{
              backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
              borderRadius: 16 * fontScale,
              padding: 24 * fontScale,
              width: '100%',
              maxWidth: 400 * fontScale,
            }}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText size="xl" weight="bold" style={{ marginBottom: 12 * fontScale, textAlign: 'center' }}>
              {t('ai.entity.openSferaMessage') || 'Entities have been saved successfully!'}
            </ThemedText>
            
            <View style={{ gap: 12 * fontScale, marginTop: 24 * fontScale }}>
              <TouchableOpacity
                style={{
                  width: '100%',
                  borderRadius: 8 * fontScale,
                  padding: 14 * fontScale,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onPress={handleOpenSfera}
                activeOpacity={0.8}
              >
                <View style={[StyleSheet.absoluteFillObject, { borderRadius: 8 * fontScale, overflow: 'hidden' }]}>
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD', '#2E6DA4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
                <ThemedText size="sm" weight="bold" style={{ color: '#FFFFFF' }}>
                  {(() => {
                    const sphereLabel = savedSphere 
                      ? SPHERES.find(s => s.value === savedSphere)?.label || savedSphere
                      : 'Sfera';
                    return t('ai.entity.openSfera') ? `${t('ai.entity.openSfera')} ${sphereLabel}` : `Open ${sphereLabel} Sfera`;
                  })()}
                </ThemedText>
              </TouchableOpacity>
              
              {onCreateMemory && (
                <TouchableOpacity
                  style={{
                    width: '100%',
                    borderRadius: 8 * fontScale,
                    padding: 14 * fontScale,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  onPress={() => {
                    setShowOpenSferaModal(false);
                    onClose();
                    onCreateMemory();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[StyleSheet.absoluteFillObject, { borderRadius: 8 * fontScale, overflow: 'hidden' }]}>
                    <LinearGradient
                      colors={['#4A90E2', '#357ABD', '#2E6DA4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                  <ThemedText size="sm" weight="bold" style={{ color: '#FFFFFF' }}>
                    {t('ai.action.createMemory') || 'Create Memory'}
                  </ThemedText>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={{
                  width: '100%',
                  backgroundColor: colorScheme === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 8 * fontScale,
                  padding: 14 * fontScale,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleCancelOpenSfera}
                activeOpacity={0.8}
              >
                <ThemedText size="sm" weight="medium">
                  {t('common.cancel') || 'Cancel'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
    );
  }

  return (
    <>
      <Modal
        visible={visible && !showOpenSferaModal}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={onClose}
        >
          <Pressable 
            style={isProcessing && !aiResponse ? styles.containerLoading : styles.container} 
            onStartShouldSetResponder={() => true}
            onPress={(e) => {
              e.stopPropagation();
              // Dismiss keyboard when clicking outside input
              if (keyboardVisible) {
                Keyboard.dismiss();
              }
            }}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => {
                if (keyboardVisible) {
                  Keyboard.dismiss();
                }
              }}
            >
              <View style={styles.header}>
                <View style={styles.headerButtons}>
                  {onMinimize && isProcessing && !aiResponse && (
                    <TouchableOpacity
                      style={styles.minimizeButton}
                      onPress={handleMinimize}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons 
                        name="minimize" 
                        size={22 * fontScale} 
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons 
                      name="close" 
                      size={22 * fontScale} 
                      color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                    />
                  </TouchableOpacity>
                </View>
                {isProcessing && !aiResponse ? (
                  <View style={styles.loadingContainer}>
                    <View style={{ flex: 1 }}>
                      {/* Loading Indicator */}
                      <View style={styles.loadingIndicatorContainer}>
                        {/* Animation circles container */}
                        <View style={styles.animationCirclesContainer}>
                          {/* Animated background glow */}
                          <Animated.View style={[styles.loadingGlow, animatedPulseBgStyle]} />
                          
                          {/* Main sparkle icon with enhanced animation - centered */}
                          <View style={styles.aiIconWrapper}>
                            <Animated.View style={animatedSparkleStyle}>
                              <View style={styles.aiIconContainer}>
                                <ThemedText style={{ 
                                  fontSize: 64 * fontScale,
                                  lineHeight: 64 * fontScale,
                                  textAlign: 'center',
                                  includeFontPadding: false,
                                }}>
                                  ✨
                                </ThemedText>
                              </View>
                            </Animated.View>
                          </View>
                        </View>

                        {/* Loading message with animated dots */}
                        <View style={styles.loadingMessageContainer}>
                          <ThemedText size="l" weight="medium" style={styles.loadingMessage}>
                            {loadingMessages[loadingMessageIndex]}
                          </ThemedText>
                          <View style={styles.loadingDots}>
                            <Animated.View style={[styles.loadingDot, animatedDot1Style]} />
                            <Animated.View style={[styles.loadingDot, animatedDot2Style]} />
                            <Animated.View style={[styles.loadingDot, animatedDot3Style]} />
                          </View>
                        </View>

                        {/* Progress indicator */}
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBarBackground}>
                            <View 
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${(loadingMessageIndex + 1) * 25}%`,
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <ThemedText 
                      size="l" 
                      weight="bold" 
                      style={styles.headerTitle}
                      numberOfLines={1}
                    >
                      {t('ai.entity.title') || 'Create Entity with AI'}
                    </ThemedText>
                    <ThemedText size="sm" style={{ opacity: 0.7 }}>
                      {t('ai.entity.subtitle') || 'Select a sphere and tell us about the entity'}
                    </ThemedText>
                  </>
                )}
              </View>

              {!isProcessing && (
                <View style={styles.content}>
                  {!keyboardVisible && (
                    <View style={styles.sphereContainer}>
                      <ThemedText size="xs" weight="medium" style={{ marginBottom: 12 * fontScale, opacity: 0.7 }}>
                        {t('ai.entity.selectSphere') || 'Select Sphere'}
                      </ThemedText>
                      {SPHERES.map((sphere) => (
                        <TouchableOpacity
                          key={sphere.value}
                          style={[
                            styles.sphereOption,
                            selectedSphere === sphere.value && styles.sphereOptionActive,
                          ]}
                          onPress={() => setSelectedSphere(sphere.value)}
                        >
                          <MaterialIcons 
                            name={sphere.icon as any} 
                            size={20 * fontScale} 
                            color={selectedSphere === sphere.value ? colors.primary : colors.text}
                            style={styles.sphereIcon}
                          />
                          <ThemedText 
                            size="sm" 
                            weight={selectedSphere === sphere.value ? 'bold' : 'normal'}
                            style={{ 
                              color: selectedSphere === sphere.value ? colors.primary : colors.text,
                              flex: 1,
                            }}
                          >
                            {sphere.label}
                          </ThemedText>
                          {selectedSphere === sphere.value && (
                            <MaterialIcons 
                              name="check-circle" 
                              size={20 * fontScale} 
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {/* Show only selected sphere when keyboard is visible */}
                  {keyboardVisible && (
                    <View style={styles.sphereContainer}>
                      <ThemedText size="xs" weight="medium" style={{ marginBottom: 12 * fontScale, opacity: 0.7 }}>
                        {t('ai.entity.selectSphere') || 'Select Sphere'}
                      </ThemedText>
                      {SPHERES.filter(sphere => sphere.value === selectedSphere).map((sphere) => (
                        <TouchableOpacity
                          key={sphere.value}
                          style={[
                            styles.sphereOption,
                            styles.sphereOptionActive,
                          ]}
                          onPress={() => {
                            Keyboard.dismiss();
                            setSelectedSphere(sphere.value);
                          }}
                        >
                          <MaterialIcons 
                            name={sphere.icon as any} 
                            size={20 * fontScale} 
                            color={colors.primary}
                            style={styles.sphereIcon}
                          />
                          <ThemedText 
                            size="sm" 
                            weight="bold"
                            style={{ 
                              color: colors.primary,
                              flex: 1,
                            }}
                          >
                            {sphere.label}
                          </ThemedText>
                          <MaterialIcons 
                            name="check-circle" 
                            size={20 * fontScale} 
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.textInput,
                        (showValidationErrors && (!inputText.trim() || inputText.trim().length < 10)) ? styles.textInputError : null
                      ].filter(Boolean)}
                      placeholder={
                        selectedSphere === 'relationships' 
                          ? (t('ai.entity.placeholder.relationship') || 'Tell me about one relationship of yours. When it started, when it ended.')
                          : selectedSphere === 'career'
                          ? (t('ai.entity.placeholder.career') || 'Tell me about one job of yours. When it started, when it ended.')
                          : selectedSphere === 'family'
                          ? (t('ai.entity.placeholder.family') || 'Tell me about your family.')
                          : selectedSphere === 'friends'
                          ? (t('ai.entity.placeholder.friends') || 'Tell me about your friends.')
                          : selectedSphere === 'hobbies'
                          ? (t('ai.entity.placeholder.hobbies') || 'Tell me about your hobbies.')
                          : (t('ai.entity.placeholder') || 'Write or use the microphone to tell a story...')
                      }
                      placeholderTextColor={colorScheme === 'dark' ? colors.textMediumEmphasis : colors.text + '80'}
                      value={inputText}
                      onChangeText={(text) => {
                        setInputText(text);
                        // Clear validation error when user starts typing valid text
                        if (showValidationErrors && text.trim().length >= 10) {
                          setShowValidationErrors(false);
                        }
                      }}
                      onFocus={() => {
                        // Clear validation error when user focuses on the field
                        if (showValidationErrors && inputText.trim().length >= 10) {
                          setShowValidationErrors(false);
                        }
                      }}
                      multiline
                      textAlignVertical="top"
                    />
                    {!keyboardVisible && (
                      <Animated.View style={[
                        styles.micButton, 
                        isRecording && styles.micButtonRecording,
                        micAnimatedStyle
                      ]}>
                        <TouchableOpacity
                          onPress={isRecording ? handleStopRecording : handleStartRecording}
                          activeOpacity={0.8}
                          disabled={isProcessing}
                        >
                          <MaterialIcons
                            name={isRecording ? 'mic' : 'mic-none'}
                            size={24 * fontScale}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                  </View>
                  {(isListening || isRecording) && (
                    <ThemedText size="xs" style={{ marginTop: 8 * fontScale, opacity: 0.7, color: isRecording ? colors.primary : colors.text }}>
                      {isRecording ? (t('ai.listening') || 'Listening...') : (t('ai.processing') || 'Processing...')}
                    </ThemedText>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!inputText.trim() || inputText.trim().length < 10 || isProcessing) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!inputText.trim() || inputText.trim().length < 10 || isProcessing}
                  activeOpacity={0.8}
                >
                  <View style={[StyleSheet.absoluteFillObject, { borderRadius: 12 * fontScale, overflow: 'hidden' }]}>
                    <LinearGradient
                      colors={
                        (!inputText.trim() || inputText.trim().length < 10 || isProcessing)
                          ? colorScheme === 'dark'
                            ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)']
                            : ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.1)']
                          : ['#4A90E2', '#357ABD', '#2E6DA4']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText size="l" weight="bold" style={{ color: '#FFFFFF' }}>
                      {t('ai.entity.create') || 'Create Entity'}
                    </ThemedText>
                  )}
                </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
      </Modal>
      
      {/* Open Sfera Modal */}
      <Modal
        visible={showOpenSferaModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelOpenSfera}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <Pressable 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20 * fontScale,
          }}
          onPress={handleCancelOpenSfera}
        >
          <Pressable
            style={{
              backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
              borderRadius: 16 * fontScale,
              padding: 24 * fontScale,
              width: '100%',
              maxWidth: 400 * fontScale,
            }}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText size="xl" weight="bold" style={{ marginBottom: 12 * fontScale, textAlign: 'center' }}>
              {t('ai.entity.openSferaMessage') || 'Entities have been saved successfully!'}
            </ThemedText>
            
            <View style={{ gap: 12 * fontScale, marginTop: 24 * fontScale }}>
              <TouchableOpacity
                style={{
                  width: '100%',
                  borderRadius: 8 * fontScale,
                  padding: 14 * fontScale,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onPress={handleOpenSfera}
                activeOpacity={0.8}
              >
                <View style={[StyleSheet.absoluteFillObject, { borderRadius: 8 * fontScale, overflow: 'hidden' }]}>
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD', '#2E6DA4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
                <ThemedText size="sm" weight="bold" style={{ color: '#FFFFFF' }}>
                  {(() => {
                    const sphereLabel = savedSphere 
                      ? SPHERES.find(s => s.value === savedSphere)?.label || savedSphere
                      : 'Sfera';
                    return t('ai.entity.openSfera') ? `${t('ai.entity.openSfera')} ${sphereLabel}` : `Open ${sphereLabel} Sfera`;
                  })()}
                </ThemedText>
              </TouchableOpacity>
              
              {onCreateMemory && (
                <TouchableOpacity
                  style={{
                    width: '100%',
                    borderRadius: 8 * fontScale,
                    padding: 14 * fontScale,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  onPress={() => {
                    setShowOpenSferaModal(false);
                    onClose();
                    onCreateMemory();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[StyleSheet.absoluteFillObject, { borderRadius: 8 * fontScale, overflow: 'hidden' }]}>
                    <LinearGradient
                      colors={['#4A90E2', '#357ABD', '#2E6DA4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                  <ThemedText size="sm" weight="bold" style={{ color: '#FFFFFF' }}>
                    {t('ai.action.createMemory') || 'Create Memory'}
                  </ThemedText>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={{
                  width: '100%',
                  backgroundColor: colorScheme === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 8 * fontScale,
                  padding: 14 * fontScale,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleCancelOpenSfera}
                activeOpacity={0.8}
              >
                <ThemedText size="sm" weight="medium">
                  {t('common.cancel') || 'Cancel'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
