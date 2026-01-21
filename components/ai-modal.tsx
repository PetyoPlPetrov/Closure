import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import { processMemoryPrompt, type AIMemoryResponse } from '@/utils/ai-service';
import { useJourney, type LifeSphere } from '@/utils/JourneyProvider';
import { 
  startBackgroundAIProcessing, 
  getPendingAIResponse, 
  getPendingAIRequest,
  clearPendingAIResponse,
  clearPendingAIRequest,
  stopBackgroundAIProcessing,
  isBackgroundTaskRunning,
  savePendingAIResponse,
  type PendingAIResponse 
} from '@/utils/ai-background-processor';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Modal as RNModal, AppState, AppStateStatus } from 'react-native';

// Conditionally import Voice to handle cases where native module isn't available
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default || require('@react-native-voice/voice');
} catch (error) {
  console.warn('Voice module not available:', error);
}
import { 
  ActivityIndicator, 
  Alert, 
  Modal, 
  Platform, 
  Pressable, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import Animated, { 
  Easing, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';

type ModalView = 'input' | 'loading' | 'results';

interface AIModalProps {
  visible: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onSend: (message: string) => Promise<void>;
  pendingResponse?: PendingAIResponse | null;
}

interface AIMemoryItem {
  id: string;
  type: 'hardTruth' | 'goodFact' | 'lesson';
  text: string;
}

interface AIMemoryItem {
  id: string;
  type: 'hardTruth' | 'goodFact' | 'lesson';
  text: string;
}

export function AIModal({ visible, onClose, onMinimize, onSend, pendingResponse }: AIModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { language } = useLanguage();
  const { 
    profiles, 
    jobs, 
    familyMembers, 
    friends, 
    hobbies,
    addIdealizedMemory
  } = useJourney();
  
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [partialResults, setPartialResults] = useState<string>('');
  const [currentView, setCurrentView] = useState<ModalView>('input');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AIMemoryResponse | null>(null);
  const [memoryItems, setMemoryItems] = useState<AIMemoryItem[]>([]);
  const [selectedSphere, setSelectedSphere] = useState<LifeSphere | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);
  const [showSpherePicker, setShowSpherePicker] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [backgroundRequestId, setBackgroundRequestId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Monitor app state to detect when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Count words in input text
  const wordCount = useMemo(() => {
    return inputText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, [inputText]);

  const canSubmit = wordCount >= 10 && !isProcessing && !isRecording;

  // Loading messages that rotate
  const loadingMessages = [
    t('ai.loading.thinking') || 'AI is thinking...',
    t('ai.loading.analyzing') || 'Analyzing your thoughts...',
    t('ai.loading.processing') || 'Processing memories...',
    t('ai.loading.generating') || 'Generating insights...',
  ];

  // Animation values
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);
  const pulseScale = useSharedValue(1);
  const micPulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);
  
  // Enhanced loading animations
  const sparkleScale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(1);
  const loadingPulseScale = useSharedValue(1);
  const dotsOpacity = useSharedValue([0.3, 0.3, 0.3]);
  
  const inputRef = useRef<TextInput>(null);

  // Check for pending AI response when modal opens or when pendingResponse prop changes
  useEffect(() => {
    if (visible) {
      // Reset minimizing flag when modal opens
      isMinimizingRef.current = false;
      
      // Always check for pending response when modal opens
      // This handles cases where modal was minimized and response arrived
      const checkAndRestore = async () => {
        // First check prop (from parent component)
        if (pendingResponse?.response) {
          // Move to loading view first
          setCurrentView('loading');
          setIsProcessing(true);
          // Restore image if it was saved with the response
          if (pendingResponse.imageUri) {
            setSelectedImage(pendingResponse.imageUri);
          }
          // Process pending response from prop
          // Don't clear AsyncStorage here - keep it until user saves or discards
          await processAIResponse(pendingResponse.response);
        } else {
          // Check storage for pending response (in case prop wasn't updated yet)
          await checkPendingAIResponse();
        }
      };
      
      checkAndRestore();
    }
  }, [visible, pendingResponse]);

  // Watch for pendingResponse prop changes while modal is open (for when background task completes)
  useEffect(() => {
    if (visible && isProcessing && !aiResponse && pendingResponse?.response) {
      // Response arrived via prop update (from parent component detecting it)
      setCurrentView('loading');
      setIsProcessing(true);
      if (pendingResponse.imageUri) {
        setSelectedImage(pendingResponse.imageUri);
      }
      processAIResponse(pendingResponse.response);
    }
  }, [pendingResponse, visible, isProcessing, aiResponse]);

  // Check if there's a pending request (processing in background)
  const checkPendingRequest = async () => {
    try {
      const pendingRequest = await getPendingAIRequest();
      const isRunning = await isBackgroundTaskRunning();
      if (pendingRequest || isRunning) {
        // There's a request being processed, show loading state
        setCurrentView('loading');
        setIsProcessing(true);
        // Restore image if available
        if (pendingRequest?.imageUri) {
          setSelectedImage(pendingRequest.imageUri);
        }
        // Set background request ID if we have one
        if (pendingRequest?.requestId) {
          setBackgroundRequestId(pendingRequest.requestId);
        }
      }
    } catch (error) {
      console.error('Failed to check pending request:', error);
    }
  };

  // Check for pending AI response
  const checkPendingAIResponse = async () => {
    try {
      const pendingResponse = await getPendingAIResponse();
      if (pendingResponse) {
        // Move to loading view first
        setCurrentView('loading');
        setIsProcessing(true);
        // Restore image if it was saved with the response
        if (pendingResponse.imageUri) {
          setSelectedImage(pendingResponse.imageUri);
        }
        // If we have a pending response, process it
        // Don't clear AsyncStorage here - keep it until user saves or discards
        await processAIResponse(pendingResponse.response);
        setBackgroundRequestId(null);
      } else {
        // Check if there's a pending request (still processing)
        await checkPendingRequest();
      }
    } catch (error) {
      console.error('Failed to check pending AI response:', error);
    }
  };

  // Process AI response and update state
  const processAIResponse = async (response: AIMemoryResponse) => {
    try {
      // Convert response to memory items
      const items: AIMemoryItem[] = [
        ...response.goodFacts.map((text, index) => ({
          id: `goodFact-${index}`,
          type: 'goodFact' as const,
          text,
        })),
        ...response.hardTruths.map((text, index) => ({
          id: `hardTruth-${index}`,
          type: 'hardTruth' as const,
          text,
        })),
        ...response.lessonsLearned.map((text, index) => ({
          id: `lesson-${index}`,
          type: 'lesson' as const,
          text,
        })),
      ];

      setAiResponse(response);
      setMemoryItems(items);
      
      // Validate and set sphere and entity
      const validSpheres: LifeSphere[] = ['relationships', 'career', 'family', 'friends', 'hobbies'];
      let finalSphere: LifeSphere | null = null;
      let finalEntityId: string | null = null;
      let finalEntityName: string | null = null;

      // Check if AI response sphere is valid
      if (response.sphere && validSpheres.includes(response.sphere)) {
        finalSphere = response.sphere;
        
        // Check if entity exists in the selected sphere
        let entityFound = false;
        if (response.entityName) {
          // Find entity in the appropriate list
          if (finalSphere === 'relationships') {
            const entity = profiles.find(p => p.name === response.entityName);
            if (entity) {
              finalEntityId = entity.id;
              finalEntityName = entity.name;
              entityFound = true;
            }
          } else if (finalSphere === 'career') {
            const entity = jobs.find(j => j.name === response.entityName);
            if (entity) {
              finalEntityId = entity.id;
              finalEntityName = entity.name;
              entityFound = true;
            }
          } else if (finalSphere === 'family') {
            const entity = familyMembers.find(f => f.name === response.entityName);
            if (entity) {
              finalEntityId = entity.id;
              finalEntityName = entity.name;
              entityFound = true;
            }
          } else if (finalSphere === 'friends') {
            const entity = friends.find(f => f.name === response.entityName);
            if (entity) {
              finalEntityId = entity.id;
              finalEntityName = entity.name;
              entityFound = true;
            }
          } else if (finalSphere === 'hobbies') {
            const entity = hobbies.find(h => h.name === response.entityName);
            if (entity) {
              finalEntityId = entity.id;
              finalEntityName = entity.name;
              entityFound = true;
            }
          }
        }
        
        // If entity not found, set sphere but let user select entity
        if (!entityFound) {
          setSelectedSphere(finalSphere);
        } else {
          setSelectedSphere(finalSphere);
          setSelectedEntityId(finalEntityId);
          setSelectedEntityName(finalEntityName);
        }
      }
      
      setIsProcessing(false);
      // Keep loading view but show results
    } catch (error) {
      console.error('Error processing AI response:', error);
      Alert.alert(
        t('common.error') || 'Error',
        (error as Error).message || t('ai.error.send') || 'Failed to process memory'
      );
      setIsProcessing(false);
    }
  };

  // Track if we're minimizing vs closing
  const isMinimizingRef = useRef(false);

  // Reset all state when modal closes (but not when minimized)
  useEffect(() => {
    if (!visible) {
      // Check if we're minimizing first (synchronous check)
      if (isMinimizingRef.current) {
        // Minimizing - preserve state, just reset the minimizing flag
        isMinimizingRef.current = false;
        return;
      }
      
      // Check if we should preserve state (has pending request/response) vs actually closing
      const shouldPreserveState = async () => {
        const pendingRequest = await getPendingAIRequest();
        const pendingResponse = await getPendingAIResponse();
        const isRunning = await isBackgroundTaskRunning();
        return !!(pendingRequest || pendingResponse || isRunning);
      };

      shouldPreserveState().then((preserve) => {
        if (!preserve) {
          // Actually closing (not minimizing) - reset all state
          // Close confirmation modal first if it's open
          setShowCloseConfirm(false);
          
          // Reset all state to initial values
          setInputText('');
          setIsRecording(false);
          setIsProcessing(false);
          setIsListening(false);
          setPartialResults('');
          setCurrentView('input');
          setSelectedImage(null);
          setAiResponse(null);
          setMemoryItems([]);
          setSelectedSphere(null);
          setSelectedEntityId(null);
          setSelectedEntityName(null);
          setShowSpherePicker(false);
          setShowEntityPicker(false);
          setLoadingMessageIndex(0);
          
          // Stop any ongoing voice recognition
          if (Voice && isListening) {
            try {
              Voice.stop();
              Voice.cancel();
            } catch (error) {
              // Ignore errors when stopping
            }
          }
        }
      });
    }
  }, [visible, backgroundRequestId]);

  // Modal entrance animation
  useEffect(() => {
    if (visible) {
      modalOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      
      // Subtle pulse animation for mic button (only when not recording)
      if (!isRecording) {
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }

      
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
    } else {
      modalOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.8, { duration: 200 });
      setInputText('');
      setIsRecording(false);
      setIsListening(false);
      setCurrentView('input');
      setSelectedImage(null);
      setAiResponse(null);
      setMemoryItems([]);
    }
  }, [visible, isRecording]);

  // Mic pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      micPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      waveOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      micPulseScale.value = withTiming(1, { duration: 200 });
      waveOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording]);

  // Rotate loading messages when in loading view
  useEffect(() => {
    if (currentView === 'loading') {
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentView, loadingMessages.length]);

  // Enhanced loading animations
  useEffect(() => {
    if (currentView === 'loading' && !aiResponse) {
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
  }, [currentView, aiResponse, sparkleScale, sparkleOpacity, loadingPulseScale, dotsOpacity]);

  // Voice recognition handlers
  useEffect(() => {
    if (!Voice) {
      return; // Voice module not available
    }

    // Set up Voice event handlers
    Voice.onSpeechStart = () => {
      setIsListening(true);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0];
        setInputText(prev => {
          // Remove partial results and add final transcript
          const cleaned = prev.replace(partialResults, '').trim();
          return cleaned ? `${cleaned} ${transcript}` : transcript;
        });
        setPartialResults('');
      }
    };

    Voice.onSpeechPartialResults = (e) => {
      if (e.value && e.value.length > 0) {
        const partial = e.value[0];
        setPartialResults(partial);
        // Show partial results in real-time
        setInputText(prev => {
          const cleaned = prev.replace(partialResults, '').trim();
          return cleaned ? `${cleaned} ${partial}` : partial;
        });
      }
    };

    Voice.onSpeechError = (e) => {
      console.error('Speech recognition error:', e);
      setIsRecording(false);
      setIsListening(false);
      setPartialResults('');
      
      if (e.error?.code !== '7') { // Ignore "No speech input" errors
        Alert.alert(
          t('common.error') || 'Error',
          e.error?.message || t('ai.error.recording') || 'Speech recognition failed'
        );
      }
    };

    // Cleanup on unmount
    return () => {
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      }
    };
  }, [partialResults, t]);

  const handleStartRecording = async () => {
    try {
      if (!Voice) {
        Alert.alert(
          t('common.error') || 'Error',
          t('ai.error.notAvailable') || 'Speech recognition is not available. Please rebuild the app with native modules.'
        );
        return;
      }

      // Check if Voice is available
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        Alert.alert(
          t('common.error') || 'Error',
          t('ai.error.notAvailable') || 'Speech recognition is not available on this device'
        );
        return;
      }

      // Request permissions (Voice handles this internally, but we can check)
      const permissions = await Voice.requestSpeechRecognitionPermission();
      if (permissions === false) {
        Alert.alert(
          t('ai.permission.title') || 'Permission Required',
          t('ai.permission.message') || 'Microphone permission is required for speech-to-text.',
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      // Clear previous partial results
      setPartialResults('');
      
      // Determine language code for voice recognition
      const languageCode = language === 'bg' ? 'bg-BG' : 'en-US';
      
      // Start voice recognition
      await Voice.start(languageCode);
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      Alert.alert(
        t('common.error') || 'Error',
        (error as Error).message || t('ai.error.recording') || 'Failed to start recording'
      );
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsListening(false);
      
      if (!Voice) {
        return;
      }
      
      // Stop voice recognition
      await Voice.stop();
      
      // Clear partial results
      setPartialResults('');
      
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      Alert.alert(
        t('common.error') || 'Error',
        (error as Error).message || t('ai.error.stopRecording') || 'Failed to stop recording'
      );
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('ai.permission.title') || 'Permission Required',
          t('ai.permission.image') || 'Photo library permission is required to upload images.',
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        
        // If AI response has already arrived, persist the image URI to AsyncStorage
        if (aiResponse) {
          try {
            const pendingResponse = await getPendingAIResponse();
            if (pendingResponse) {
              // Update the pending response with the new image URI
              await savePendingAIResponse({
                ...pendingResponse,
                imageUri,
              });
            }
          } catch (error) {
            console.error('Failed to save image URI to AsyncStorage:', error);
          }
        }
      }
    } catch (error) {
      Alert.alert(
        t('common.error') || 'Error',
        (error as Error).message || t('ai.error.image') || 'Failed to pick image'
      );
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !canSubmit) {
      return;
    }

    // Move to loading view
    setCurrentView('loading');
    setIsProcessing(true);

    try {
      // Prepare sferas with entities for AI context
      const sferas = {
        relationships: profiles.length > 0 ? profiles.map(p => p.name) : undefined,
        career: jobs.length > 0 ? jobs.map(j => j.name) : undefined,
        family: familyMembers.length > 0 ? familyMembers.map(f => f.name) : undefined,
        friends: friends.length > 0 ? friends.map(f => f.name) : undefined,
        hobbies: hobbies.length > 0 ? hobbies.map(h => h.name) : undefined,
      };

      // Start background processing (include image URI if uploaded)
      const requestId = await startBackgroundAIProcessing(
        inputText.trim(),
        { sferas },
        selectedImage || undefined
      );
      setBackgroundRequestId(requestId);

      // Only try foreground processing if app is currently active
      // If app goes to background, background task will handle it
      if (appState === 'active') {
        try {
          const response = await processMemoryPrompt(
            inputText.trim(), 
            { sferas }
          );
          
          // Check if app is still active before stopping background task
          // If app went to background, let background task handle it
          const currentAppState = AppState.currentState;
          if (currentAppState === 'active') {
            // If we got a response while app is active, stop background task and process it
            await stopBackgroundAIProcessing();
            setBackgroundRequestId(null);
            await processAIResponse(response);
          } else {
            // App went to background, let background task handle it
            // The response will be saved by background task
          }
        } catch (error) {
          // If foreground processing fails, background task will handle it
        }
      } else {
        // App is already in background, let background task handle it
      }
    } catch (error) {
      console.error('Failed to start AI processing:', error);
      Alert.alert(
        t('common.error') || 'Error',
        (error as Error).message || 'Failed to process AI request'
      );
      setIsProcessing(false);
      setCurrentView('input');
    }
  };

  const handleEditItem = (id: string, newText: string) => {
    setMemoryItems(prev =>
      prev.map(item => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setMemoryItems(prev => prev.filter(item => item.id !== id));
  };

  const handleBackToInput = () => {
    setCurrentView('input');
    setInputText('');
    setSelectedImage(null);
    setAiResponse(null);
    setMemoryItems([]);
    setSelectedSphere(null);
    setSelectedEntityId(null);
    setSelectedEntityName(null);
  };

  // Get available entities for the selected sphere
  const availableEntitiesForSphere = useMemo(() => {
    if (!selectedSphere) return [];
    
    switch (selectedSphere) {
      case 'relationships':
        return profiles.map(p => ({ id: p.id, name: p.name }));
      case 'career':
        return jobs.map(j => ({ id: j.id, name: j.name }));
      case 'family':
        return familyMembers.map(f => ({ id: f.id, name: f.name }));
      case 'friends':
        return friends.map(f => ({ id: f.id, name: f.name }));
      case 'hobbies':
        return hobbies.map(h => ({ id: h.id, name: h.name }));
      default:
        return [];
    }
  }, [selectedSphere, profiles, jobs, familyMembers, friends, hobbies]);

  // Handle sphere change - reset entity if sphere changes
  const handleSphereChange = (sphere: LifeSphere) => {
    setSelectedSphere(sphere);
    setSelectedEntityId(null);
    setSelectedEntityName(null);
    setShowSpherePicker(false);
  };

  // Handle entity change
  const handleEntityChange = (entityId: string, entityName: string) => {
    setSelectedEntityId(entityId);
    setSelectedEntityName(entityName);
    setShowEntityPicker(false);
  };

  const handleSave = async () => {
    if (!aiResponse || memoryItems.length === 0 || !selectedSphere) {
      return;
    }

    // Entity is required - ensure we have an entity selected
    if (!selectedEntityId) {
      if (availableEntitiesForSphere.length === 0) {
        Alert.alert(
          t('common.error') || 'Error',
          t('ai.results.noEntities') || 'No entities available for this sphere. Please add an entity first.'
        );
      } else {
        Alert.alert(
          t('common.error') || 'Error',
          t('ai.results.selectEntity') || 'Please select an entity'
        );
      }
      return;
    }

    setIsProcessing(true);
    try {
      // Use selected sphere and entity (or fallback to AI response)
      const finalSphere = selectedSphere || aiResponse.sphere;
      const finalEntityId = selectedEntityId || aiResponse.entityId;
      
      if (!finalEntityId) {
        throw new Error('No entity selected');
      }

      // Convert memory items to the format expected by IdealizedMemory
      const hardTruths = memoryItems
        .filter(item => item.type === 'hardTruth')
        .map((item, index) => ({
          id: item.id,
          text: item.text,
        }));

      const goodFacts = memoryItems
        .filter(item => item.type === 'goodFact')
        .map((item, index) => ({
          id: item.id,
          text: item.text,
        }));

      const lessonsLearned = memoryItems
        .filter(item => item.type === 'lesson')
        .map((item, index) => ({
          id: item.id,
          text: item.text,
        }));

      // Create the memory with AI suggestions
      const memoryId = await addIdealizedMemory(
        finalEntityId,
        finalSphere,
        {
          title: aiResponse.title || '', // Use AI-generated title
          imageUri: selectedImage || undefined,
          hardTruths,
          goodFacts,
          lessonsLearned,
        }
      );

      // Clear AsyncStorage after successful save
      await clearPendingAIResponse();
      await clearPendingAIRequest();
      await stopBackgroundAIProcessing();

      // Close the modal first
      onClose();

      // Show success alert with option to open memory
      Alert.alert(
        t('ai.save.success') || 'Memory saved successfully!',
        t('ai.save.successMessage') || 'Your memory has been created with AI suggestions.',
        [
          {
            text: t('common.cancel') || 'Cancel',
            style: 'cancel',
          },
          {
            text: t('ai.openMemory') || 'Open memory',
            onPress: () => {
              router.push({
                pathname: '/add-idealized-memory',
                params: {
                  entityId: finalEntityId,
                  sphere: finalSphere,
                  memoryId: memoryId,
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        t('common.error') || 'Error',
        (error as Error).message || t('ai.save.error') || 'Failed to save memory'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isRecording ? micPulseScale.value : pulseScale.value }],
  }));

  const animatedSparkleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sparkleScale.value }
    ],
    opacity: sparkleOpacity.value,
    alignItems: 'center',
    justifyContent: 'center',
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

  const animatedWaveStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value * 0.4, // Make it more subtle (40% of original opacity)
    transform: [{ scale: 1 + (micPulseScale.value - 1) * 1.5 }], // Expand more but start from center
  }));

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '90%',
      maxWidth: 500,
      borderRadius: 24 * fontScale,
    },
    modal: {
      backgroundColor: colors.background,
      borderRadius: 24 * fontScale,
      paddingHorizontal: 24 * fontScale,
      paddingTop: 24 * fontScale,
      paddingBottom: 32 * fontScale,
      minHeight: 400 * fontScale,
      maxHeight: '85%',
    },
    modalContainerLarge: {
      width: '95%',
      maxWidth: 600,
      borderRadius: 24 * fontScale,
    },
    modalLarge: {
      backgroundColor: colors.background,
      borderRadius: 24 * fontScale,
      paddingHorizontal: 24 * fontScale,
      paddingTop: 24 * fontScale,
      paddingBottom: 32 * fontScale,
      minHeight: 600 * fontScale,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32 * fontScale,
      position: 'relative',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      position: 'absolute',
      right: 0,
      width: 32 * fontScale,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    minimizeButton: {
      width: 32 * fontScale,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    micButtonContainer: {
      alignItems: 'center',
      marginBottom: 24 * fontScale,
    },
    largeMicButton: {
      width: 120 * fontScale,
      height: 120 * fontScale,
      borderRadius: 60 * fontScale,
      backgroundColor: '#FF9500', // Orange color
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#FF9500',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    inputContainer: {
      marginBottom: 0,
      width: '100%',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.08)',
      borderRadius: 16 * fontScale,
      borderWidth: 0,
      paddingHorizontal: 16 * fontScale,
      paddingVertical: 14 * fontScale,
      minHeight: 56 * fontScale,
    },
    textInput: {
      flex: 1,
      fontSize: 16 * fontScale,
      color: colors.text,
      maxHeight: 120 * fontScale,
      textAlignVertical: 'top',
      paddingRight: 8 * fontScale,
    },
    pencilIcon: {
      marginLeft: 8 * fontScale,
      opacity: 0.6,
    },
    micButton: {
      width: 40 * fontScale,
      height: 40 * fontScale,
      borderRadius: 20 * fontScale,
      backgroundColor: isRecording 
        ? colors.error || '#FF3B30'
        : colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12 * fontScale,
    },
    waveRing: {
      position: 'absolute',
      width: 120 * fontScale,
      height: 120 * fontScale,
      borderRadius: 60 * fontScale,
      borderWidth: 2,
      borderColor: '#FF9500',
      top: 0,
      left: 0,
    },
    submitButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 16 * fontScale,
      paddingVertical: 16 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20 * fontScale,
      flexDirection: 'row',
    },
    submitButtonDisabled: {
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      opacity: 0.5,
    },
    backButton: {
      position: 'absolute',
      left: 0,
      width: 32 * fontScale,
      height: 32 * fontScale,
      borderRadius: 16 * fontScale,
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageUploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12 * fontScale,
      paddingHorizontal: 16 * fontScale,
      borderRadius: 12 * fontScale,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginTop: 12 * fontScale,
      marginBottom: 8 * fontScale,
    },
    imageUploadButtonLarge: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24 * fontScale,
      paddingHorizontal: 32 * fontScale,
      borderRadius: 16 * fontScale,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(100, 181, 246, 0.1)' 
        : 'rgba(100, 181, 246, 0.05)',
      marginBottom: 24 * fontScale,
    },
    imagePreview: {
      width: '100%',
      height: 200 * fontScale,
      borderRadius: 12 * fontScale,
      marginTop: 16 * fontScale,
      marginBottom: 8 * fontScale,
      position: 'relative',
      overflow: 'hidden',
    },
    imagePreviewImage: {
      width: '100%',
      height: '100%',
      borderRadius: 12 * fontScale,
    },
    removeImageButton: {
      position: 'absolute',
      top: 8 * fontScale,
      right: 8 * fontScale,
      width: 28 * fontScale,
      height: 28 * fontScale,
      borderRadius: 14 * fontScale,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingViewWrapper: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      paddingVertical: 20 * fontScale,
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
      padding: 10 * fontScale,
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
    },
    loadingMessage: {
      textAlign: 'center',
      opacity: 0.9,
      marginBottom: 12 * fontScale,
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
    resultsContainer: {
      flex: 1,
      marginTop: 8 * fontScale,
    },
    resultsHeader: {
      marginBottom: 16 * fontScale,
      paddingBottom: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    memoryItem: {
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12 * fontScale,
      padding: 16 * fontScale,
      marginBottom: 12 * fontScale,
    },
    memoryItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8 * fontScale,
    },
    removeItemButton: {
      marginLeft: 'auto',
      padding: 4 * fontScale,
    },
    memoryItemText: {
      fontSize: 15 * fontScale,
      color: colors.text,
      minHeight: 40 * fontScale,
    },
    saveButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 16 * fontScale,
      paddingVertical: 16 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16 * fontScale,
      flexDirection: 'row',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    dropdownContainer: {
      width: '100%',
    },
    dropdownLabel: {
      marginBottom: 6 * fontScale,
      opacity: 0.7,
    },
    titleDisplay: {
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12 * fontScale,
      padding: 12 * fontScale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
      minHeight: 44 * fontScale,
      justifyContent: 'center',
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12 * fontScale,
      padding: 12 * fontScale,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerContainer: {
      backgroundColor: colors.background,
      borderRadius: 16 * fontScale,
      width: '85%',
      maxWidth: 400,
      maxHeight: '70%',
      overflow: 'hidden',
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    pickerList: {
      maxHeight: 300 * fontScale,
    },
    pickerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16 * fontScale,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
    },
    pickerItemSelected: {
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)',
    },
    confirmModalContainer: {
      backgroundColor: colors.background,
      borderRadius: 16 * fontScale,
      width: '85%',
      maxWidth: 400,
      padding: 24 * fontScale,
      alignItems: 'center',
    },
    confirmButtonContainer: {
      flexDirection: 'row',
      width: '100%',
      gap: 12 * fontScale,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12 * fontScale,
      borderRadius: 12 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: colorScheme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    discardButton: {
      backgroundColor: '#FF3B30',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={currentView === 'loading' ? styles.modalContainerLarge : styles.modalContainer} 
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View style={[
            currentView === 'loading' ? styles.modalLarge : styles.modal, 
            animatedModalStyle
          ]}>
            {/* Header */}
            {currentView !== 'loading' && (
              <View style={styles.header}>
                <ThemedText size="l" weight="semibold" style={styles.headerTitle}>
                  {t('ai.title') || 'Share your thoughts...'}
                </ThemedText>
                <Pressable 
                  onPress={() => {
                    // Check if there's any progress to lose
                    if (inputText.trim().length > 0 || selectedImage || aiResponse) {
                      setShowCloseConfirm(true);
                    } else {
                      onClose();
                    }
                  }} 
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={20 * fontScale} color={colors.text} />
                </Pressable>
              </View>
            )}
            
            {/* Header for loading view with minimize button */}
            {currentView === 'loading' && (
              <View style={styles.header}>
                <View style={{ flex: 1 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * fontScale, position: 'absolute', right: 0 }}>
                  {onMinimize && isProcessing && !aiResponse && (
                    <Pressable 
                      onPress={async () => {
                        // Mark that we're minimizing (not closing) to preserve state
                        isMinimizingRef.current = true;
                        // Minimize the modal (keep processing in background)
                        onMinimize();
                      }} 
                      style={styles.minimizeButton}
                    >
                      <MaterialIcons name="remove" size={20 * fontScale} color={colors.text} />
                    </Pressable>
                  )}
                  <Pressable 
                    onPress={() => setShowCloseConfirm(true)} 
                    style={styles.minimizeButton}
                  >
                    <MaterialIcons name="close" size={20 * fontScale} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Input View */}
            {currentView === 'input' && (
              <>
            {/* Large Microphone Button */}
            <View style={styles.micButtonContainer}>
              <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                {isRecording && (
                  <Animated.View 
                    style={[
                      styles.waveRing, 
                      animatedWaveStyle,
                      {
                        position: 'absolute',
                      }
                    ]} 
                  />
                )}
                <Animated.View style={animatedMicStyle}>
                  <TouchableOpacity
                    style={styles.largeMicButton}
                    onPress={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                  >
                    {isRecording ? (
                      <MaterialIcons 
                        name="stop" 
                        size={48 * fontScale} 
                        color="#ffffff" 
                      />
                    ) : (
                      <MaterialIcons 
                        name="mic" 
                        size={48 * fontScale} 
                        color="#ffffff" 
                      />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
              
              {isListening && (
                <View style={{ marginTop: 16 * fontScale, flexDirection: 'row', alignItems: 'center', gap: 8 * fontScale }}>
                  <ActivityIndicator size="small" color="#FF9500" />
                  <ThemedText size="sm" style={{ opacity: 0.7 }}>
                    {t('ai.listening') || 'Listening...'}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Text Input Container */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={t('ai.placeholder.input') || 'Or type here...'}
                  placeholderTextColor={colors.textSecondary || colors.text + '80'}
                  multiline
                  editable={!isRecording && !isProcessing}
                />
                <MaterialIcons 
                  name="edit" 
                  size={20 * fontScale} 
                  color={colors.textSecondary || colors.text + '80'} 
                  style={styles.pencilIcon}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSend}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <ThemedText style={{ fontSize: 20 * fontScale, marginRight: 8 * fontScale }}>
                ✨
              </ThemedText>
              <ThemedText size="l" weight="bold" style={{ color: '#ffffff' }}>
                {t('ai.submit') || 'Submit'}
              </ThemedText>
            </TouchableOpacity>
              </>
            )}

            {/* Loading View */}
            {currentView === 'loading' && (
              <View style={styles.loadingViewWrapper}>
              <ScrollView 
                style={styles.loadingContainer}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
              >
                {/* Image Upload Field */}
                {!selectedImage ? (
                  <TouchableOpacity
                    style={styles.imageUploadButtonLarge}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add-photo-alternate" size={32 * fontScale} color={colors.primary} />
                    <ThemedText size="m" weight="medium" style={{ color: colors.primary, marginTop: 8 * fontScale }}>
                      {t('ai.upload.image') || 'Add photo'}
                    </ThemedText>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreviewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={async () => {
                        setSelectedImage(null);
                        // If AI response exists, update AsyncStorage to remove image URI
                        if (aiResponse) {
                          try {
                            const pendingResponse = await getPendingAIResponse();
                            if (pendingResponse) {
                              await savePendingAIResponse({
                                ...pendingResponse,
                                imageUri: undefined,
                              });
                            }
                          } catch (error) {
                            console.error('Failed to update image URI in AsyncStorage:', error);
                          }
                        }
                      }}
                    >
                      <MaterialIcons name="close" size={16 * fontScale} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Loading Indicator */}
                {!aiResponse && (
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
                )}

                {/* Results (shown when AI response arrives) */}
                {aiResponse && (
                  <>
                    {/* Memory Title */}
                    <View style={[styles.resultsHeader, { marginTop: 24 * fontScale }]}>
                      <View style={styles.dropdownContainer}>
                        <ThemedText size="s" weight="medium" style={styles.dropdownLabel}>
                          {t('memory.title') || 'Title'}
                        </ThemedText>
                        <View style={styles.titleDisplay}>
                          <ThemedText size="m" weight="semibold">
                            {aiResponse.title || ''}
                          </ThemedText>
                        </View>
                      </View>
                    </View>

                    {/* Sphere and Entity Selectors */}
                    <View style={styles.resultsHeader}>
                      {/* Sphere Dropdown */}
                      <View style={styles.dropdownContainer}>
                        <ThemedText size="s" weight="medium" style={styles.dropdownLabel}>
                          {t('ai.results.sphere') || 'Sphere'}
                        </ThemedText>
                        <Pressable
                          style={styles.dropdownButton}
                          onPress={() => setShowSpherePicker(true)}
                        >
                          <ThemedText size="m" weight="semibold">
                            {selectedSphere || aiResponse.sphere}
                          </ThemedText>
                          <MaterialIcons name="arrow-drop-down" size={24 * fontScale} color={colors.text} />
                        </Pressable>
                      </View>

                      {/* Entity Dropdown */}
                      {selectedSphere && availableEntitiesForSphere.length > 0 && (
                        <View style={[styles.dropdownContainer, { marginTop: 12 * fontScale }]}>
                          <ThemedText size="s" weight="medium" style={styles.dropdownLabel}>
                            {t('ai.results.entity') || 'Entity'}
                          </ThemedText>
                          <Pressable
                            style={styles.dropdownButton}
                            onPress={() => setShowEntityPicker(true)}
                          >
                            <ThemedText size="m" weight="semibold">
                              {selectedEntityName || t('ai.results.selectEntity') || 'Select entity...'}
                            </ThemedText>
                            <MaterialIcons name="arrow-drop-down" size={24 * fontScale} color={colors.text} />
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {/* Memory Items List */}
                    {memoryItems
                      .sort((a, b) => {
                        // Order: goodFact first, then hardTruth, then lesson
                        const order: Record<string, number> = {
                          'goodFact': 0,
                          'hardTruth': 1,
                          'lesson': 2,
                        };
                        return (order[a.type] || 99) - (order[b.type] || 99);
                      })
                      .map((item) => (
                      <View key={item.id} style={styles.memoryItem}>
                        <View style={styles.memoryItemHeader}>
                          <MaterialIcons
                            name={
                              item.type === 'hardTruth' ? 'cloud' :
                              item.type === 'goodFact' ? 'wb-sunny' :
                              'lightbulb'
                            }
                            size={20 * fontScale}
                            color={
                              item.type === 'hardTruth' ? '#64B5F6' :
                              item.type === 'goodFact' ? '#FFD700' :
                              '#FFA726'
                            }
                          />
                          <ThemedText size="sm" weight="medium" style={{ marginLeft: 8 * fontScale, opacity: 0.7 }}>
                            {item.type === 'hardTruth' 
                              ? (t('ai.results.hardTruth') || 'Hard Truth')
                              : item.type === 'goodFact'
                              ? (t('ai.results.goodFact') || 'Good Fact')
                              : (t('ai.results.lesson') || 'Lesson')}
                          </ThemedText>
                          <TouchableOpacity
                            style={styles.removeItemButton}
                            onPress={() => handleRemoveItem(item.id)}
                          >
                            <MaterialIcons name="close" size={16 * fontScale} color={colors.textSecondary || colors.text} />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={styles.memoryItemText}
                          value={item.text}
                          onChangeText={(text) => handleEditItem(item.id, text)}
                          multiline
                          placeholderTextColor={colors.textSecondary || colors.text + '80'}
                        />
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>

              {/* Save Button - Always visible outside scroll */}
              {aiResponse && memoryItems.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    (isProcessing || !selectedEntityId) && styles.saveButtonDisabled
                  ]}
                  onPress={handleSave}
                  disabled={isProcessing || !selectedEntityId}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <ThemedText size="l" weight="bold" style={{ color: '#ffffff', marginLeft: 8 * fontScale }}>
                        {t('ai.saving') || 'Saving...'}
                      </ThemedText>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="save" size={20 * fontScale} color="#ffffff" />
                      <ThemedText size="l" weight="bold" style={{ color: '#ffffff', marginLeft: 8 * fontScale }}>
                        {t('ai.save') || 'Save'}
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
              </View>
            )}

          </Animated.View>
        </Pressable>

        {/* Sphere Picker Modal */}
        <RNModal
          visible={showSpherePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSpherePicker(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setShowSpherePicker(false)}>
            <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t('ai.results.sphere') || 'Select Sphere'}
                </ThemedText>
                <Pressable onPress={() => setShowSpherePicker(false)}>
                  <MaterialIcons name="close" size={24 * fontScale} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerList}>
                {(['relationships', 'career', 'family', 'friends', 'hobbies'] as LifeSphere[]).map((sphere) => {
                  const sphereLabels: Record<LifeSphere, string> = {
                    relationships: t('spheres.relationships') || 'Relationships',
                    career: t('spheres.career') || 'Career',
                    family: t('spheres.family') || 'Family',
                    friends: t('spheres.friends') || 'Friends',
                    hobbies: t('spheres.hobbies') || 'Hobbies',
                  };
                  return (
                    <Pressable
                      key={sphere}
                      style={[
                        styles.pickerItem,
                        selectedSphere === sphere && styles.pickerItemSelected
                      ]}
                      onPress={() => handleSphereChange(sphere)}
                    >
                      <ThemedText size="m" weight={selectedSphere === sphere ? 'bold' : 'regular'}>
                        {sphereLabels[sphere]}
                      </ThemedText>
                      {selectedSphere === sphere && (
                        <MaterialIcons name="check" size={20 * fontScale} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </RNModal>

        {/* Entity Picker Modal */}
        <RNModal
          visible={showEntityPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEntityPicker(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setShowEntityPicker(false)}>
            <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pickerHeader}>
                <ThemedText size="l" weight="bold">
                  {t('ai.results.entity') || 'Select Entity'}
                </ThemedText>
                <Pressable onPress={() => setShowEntityPicker(false)}>
                  <MaterialIcons name="close" size={24 * fontScale} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerList}>
                {availableEntitiesForSphere.map((entity) => (
                  <Pressable
                    key={entity.id}
                    style={[
                      styles.pickerItem,
                      selectedEntityId === entity.id && styles.pickerItemSelected
                    ]}
                    onPress={() => handleEntityChange(entity.id, entity.name)}
                  >
                    <ThemedText size="m" weight={selectedEntityId === entity.id ? 'bold' : 'regular'}>
                      {entity.name}
                    </ThemedText>
                    {selectedEntityId === entity.id && (
                      <MaterialIcons name="check" size={20 * fontScale} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </RNModal>

        {/* Close Confirmation Modal */}
        <RNModal
          visible={showCloseConfirm}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCloseConfirm(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setShowCloseConfirm(false)}>
            <Pressable style={styles.confirmModalContainer} onPress={(e) => e.stopPropagation()}>
              <ThemedText size="l" weight="bold" style={{ marginBottom: 16 * fontScale }}>
                {t('ai.closeConfirm.title') || 'Discard changes?'}
              </ThemedText>
              <ThemedText size="m" style={{ marginBottom: 24 * fontScale, opacity: 0.8, textAlign: 'center' }}>
                {t('ai.closeConfirm.message') || 'Your progress will be lost if you close this modal.'}
              </ThemedText>
              <View style={styles.confirmButtonContainer}>
                <Pressable
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => setShowCloseConfirm(false)}
                >
                  <ThemedText size="m" weight="semibold">
                    {t('common.cancel') || 'Cancel'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.confirmButton, styles.discardButton]}
                  onPress={async () => {
                    setShowCloseConfirm(false);
                    // Clear AsyncStorage when discarding
                    await clearPendingAIResponse();
                    await clearPendingAIRequest();
                    await stopBackgroundAIProcessing();
                    // Use setTimeout to ensure confirmation modal closes first
                    setTimeout(() => {
                      onClose();
                    }, 100);
                  }}
                >
                  <ThemedText size="m" weight="semibold" style={{ color: '#ffffff' }}>
                    {t('ai.closeConfirm.discard') || 'Discard'}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </RNModal>
      </Pressable>
    </Modal>
  );
}
