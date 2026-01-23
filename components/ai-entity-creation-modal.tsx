import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { LifeSphere, useJourney } from '@/utils/JourneyProvider';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Conditionally import Voice
import type { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default || require('@react-native-voice/voice');
} catch (error) {
  console.warn('Voice module not available:', error);
}

type AIEntityCreationModalProps = {
  visible: boolean;
  onClose: () => void;
  onEntityCreated?: () => void;
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
  onEntityCreated,
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

  // Keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const micScale = useSharedValue(1);
  const micOpacity = useSharedValue(1);

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
      console.error('Speech recognition error:', e);
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
      Alert.alert(t('common.error') || 'Error', t('ai.error.notAvailable') || 'Speech recognition is not available');
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
      console.error('Failed to start recording:', error);
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
      console.error('Failed to stop recording:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSphere) {
      Alert.alert(t('common.error') || 'Error', 'Please select a sphere');
      return;
    }

    if (!inputText.trim() || inputText.trim().length < 10) {
      Alert.alert(t('common.error') || 'Error', t('ai.error.empty') || 'Please enter at least 10 words');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Call AI service to suggest entity
      // For now, create a basic entity based on sphere
      const trimmedText = inputText.trim();
      
      // Simple extraction - in real implementation, use AI
      const nameMatch = trimmedText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
      const name = nameMatch ? nameMatch[1] : 'New Entity';

      switch (selectedSphere) {
        case 'relationships':
          await addProfile({
            name,
            description: trimmedText.substring(0, 200),
            sphere: 'relationships',
            setupProgress: 0,
            isCompleted: false,
          });
          break;
        case 'career':
          await addJob({
            name,
            description: trimmedText.substring(0, 200),
            sphere: 'career',
            setupProgress: 0,
            isCompleted: false,
            ongoing: true,
          });
          break;
        case 'family':
          await addFamilyMember({
            name,
            description: trimmedText.substring(0, 200),
            relationship: 'Family Member',
            sphere: 'family',
            setupProgress: 0,
            isCompleted: false,
          });
          break;
        case 'friends':
          await addFriend({
            name,
            description: trimmedText.substring(0, 200),
            sphere: 'friends',
            setupProgress: 0,
            isCompleted: false,
          });
          break;
        case 'hobbies':
          await addHobby({
            name,
            description: trimmedText.substring(0, 200),
            sphere: 'hobbies',
            setupProgress: 0,
            isCompleted: false,
          });
          break;
      }

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
  };

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
          width: '80%',
          maxWidth: 360 * fontScale,
          maxHeight: '75%',
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
        },
        closeButton: {
          position: 'absolute',
          top: 12 * fontScale,
          right: 12 * fontScale,
          width: 32 * fontScale,
          height: 32 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : 'rgba(0, 0, 0, 0.08)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
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
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 12 * fontScale,
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
      }),
    [fontScale, colorScheme, colors]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
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
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.container} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
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
                <ThemedText size="xl" weight="bold" style={styles.headerTitle}>
                  {t('ai.entity.title') || 'Create Entity with AI'}
                </ThemedText>
                <ThemedText size="sm" style={{ opacity: 0.7 }}>
                  {t('ai.entity.subtitle') || 'Select a sphere and tell us about the entity'}
                </ThemedText>
              </View>

              <View style={styles.content}>
                <View style={styles.sphereContainer}>
                  <ThemedText size="s" weight="medium" style={{ marginBottom: 12 * fontScale, opacity: 0.7 }}>
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
                        size="m" 
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

                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
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
                      placeholderTextColor={colors.muted}
                      value={inputText}
                      onChangeText={setInputText}
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
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText size="l" weight="bold" style={{ color: '#FFFFFF' }}>
                      {t('ai.entity.create') || 'Create Entity'}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
