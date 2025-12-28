import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Easing,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import type { Translations } from '@/utils/languages/translations';

// Removed unused SCREEN_WIDTH - was not being used in the component

type OnboardingStep = {
  icon?: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  messageKey: keyof Translations;
  showGif?: boolean;
  gifSource?: 'welcome' | 'output' | 'memory' | 'insights' | 'notifications' | 'creating';
  imageComponent?: React.ReactNode;
};

type OnboardingStepperProps = {
  visible: boolean;
  onDismiss: () => void;
  onDemo?: () => void;
};

const STEPS: OnboardingStep[] = [
  {
    showGif: true,
    gifSource: 'welcome',
    titleKey: 'onboarding.intro.title',
    messageKey: 'onboarding.intro.message',
  },
  {
    showGif: true,
    gifSource: 'output',
    titleKey: 'onboarding.welcome.title',
    messageKey: 'onboarding.welcome.message',
  },
  {
    showGif: true,
    gifSource: 'memory',
    titleKey: 'onboarding.moments.title',
    messageKey: 'onboarding.moments.message',
  },
  {
    showGif: true,
    gifSource: 'insights',
    titleKey: 'onboarding.lessons.title',
    messageKey: 'onboarding.lessons.message',
  },
  {
    showGif: true,
    gifSource: 'notifications',
    titleKey: 'onboarding.notifications.title',
    messageKey: 'onboarding.notifications.message',
  },
  {
    showGif: true,
    gifSource: 'creating',
    titleKey: 'onboarding.getStarted.title',
    messageKey: 'onboarding.getStarted.message',
  },
];

export function OnboardingStepper({
  visible,
  onDismiss,
  onDemo,
}: OnboardingStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTextCollapsed, setIsTextCollapsed] = useState(false);
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();

  // Animated values for smooth expansion
  const gifScale = useSharedValue(0.85); // Start smaller
  const gifTranslateY = useSharedValue(0);

  const step = STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  // Removed unused progress variable - not being displayed in the component

  // Animated styles
  const gifAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: gifScale.value },
      { translateY: gifTranslateY.value },
    ],
  }));

  const handleToggleText = () => {
    const newCollapsedState = !isTextCollapsed;
    setIsTextCollapsed(newCollapsedState);

    const animationConfig = {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    };

    if (newCollapsedState) {
      // Collapse text, expand GIF
      const targetGifScale = 1.35;
      const targetTranslateY = 20 * fontScale; // Move down to prevent top clipping

      console.log('📝 COLLAPSING TEXT, EXPANDING GIF');
      console.log(`  GIF scale: 0.85 → ${targetGifScale}`);
      console.log(`  GIF translateY: 0 → ${targetTranslateY} (move down to prevent clipping)`);

      gifScale.value = withTiming(targetGifScale, animationConfig);
      gifTranslateY.value = withTiming(targetTranslateY, animationConfig);
    } else {
      // Expand text, shrink GIF
      console.log('📝 EXPANDING TEXT, SHRINKING GIF');
      console.log('  GIF scale: 1.35 → 0.85');
      console.log('  GIF translateY: → 0');

      gifScale.value = withTiming(0.85, animationConfig);
      gifTranslateY.value = withTiming(0, animationConfig);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      onDismiss();
    } else {
      setCurrentStep((prev) => prev + 1);
      setIsTextCollapsed(false); // Reset text to expanded when changing steps
      // Reset animations
      gifScale.value = 0.85;
      gifTranslateY.value = 0;
    }
  };

  const handlePrevious = () => {
    if (isFirstStep) {
      onDismiss();
    } else {
      setCurrentStep((prev) => prev - 1);
      setIsTextCollapsed(false); // Reset text to expanded when changing steps
      // Reset animations
      gifScale.value = 0.85;
      gifTranslateY.value = 0;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDemo = () => {
    onDemo?.();
    onDismiss();
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onDismiss();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20 * fontScale,
        },
        container: {
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          borderRadius: 24 * fontScale,
          padding: 28 * fontScale,
          width: '100%',
          maxWidth: 420 * fontScale,
          height: 580 * fontScale,
          position: 'relative',
          overflow: 'hidden',
        },
        gradientBackground: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24 * fontScale,
        },
        content: {
          position: 'relative',
          zIndex: 1,
          flex: 1,
          flexDirection: 'column',
        },
        scrollContainer: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16 * fontScale,
        },
        scrollContent: {
          flexGrow: 1,
          paddingBottom: 4 * fontScale,
          paddingTop: 20 * fontScale,
        },
        progressContainer: {
          flexDirection: 'row',
          gap: 6 * fontScale,
          flex: 1,
        },
        progressDot: {
          flex: 1,
          height: 4 * fontScale,
          borderRadius: 2 * fontScale,
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.1)',
        },
        progressDotActive: {
          backgroundColor: colors.primary,
        },
        skipButton: {
          marginLeft: 12 * fontScale,
          paddingHorizontal: 12 * fontScale,
          paddingVertical: 6 * fontScale,
          borderRadius: 8 * fontScale,
        },
        skipText: {
          color: colors.primary,
        },
        iconContainer: {
          width: 80 * fontScale,
          height: 80 * fontScale,
          borderRadius: 40 * fontScale,
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(100, 150, 255, 0.2)'
            : 'rgba(100, 150, 255, 0.15)',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginBottom: 20 * fontScale,
          marginTop: 12 * fontScale,
        },
        gifWrapper: {
          position: 'relative',
          alignSelf: 'center',
          marginBottom: 20 * fontScale,
          marginTop: -20,
          width: 340 * fontScale,
          height: 255 * fontScale,
        },
        gifContainer: {
          width: 340 * fontScale,
          height: 255 * fontScale,
          borderRadius: 16 * fontScale,
          overflow: 'hidden',
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(0, 0, 0, 0.3)'
            : 'rgba(0, 0, 0, 0.05)',
        },
        gif: {
          width: '100%',
          height: '100%',
        },
        textContainer: {
          position: 'relative',
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(100, 150, 255, 0.15)'
            : 'rgba(100, 150, 255, 0.1)',
          borderRadius: 16 * fontScale,
          borderWidth: 1.5,
          borderColor: colorScheme === 'dark'
            ? 'rgba(100, 150, 255, 0.3)'
            : 'rgba(100, 150, 255, 0.25)',
          padding: 16 * fontScale,
          paddingTop: 20 * fontScale,
          marginBottom: 16 * fontScale,
          overflow: 'hidden',
        },
        textCollapseIcon: {
          position: 'absolute',
          top: 12 * fontScale,
          right: 12 * fontScale,
          width: 28 * fontScale,
          height: 28 * fontScale,
          borderRadius: 14 * fontScale,
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(100, 150, 255, 0.25)'
            : 'rgba(100, 150, 255, 0.2)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        },
        collapsedBar: {
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(100, 150, 255, 0.15)'
            : 'rgba(100, 150, 255, 0.1)',
          borderRadius: 16 * fontScale,
          borderWidth: 1.5,
          borderColor: colorScheme === 'dark'
            ? 'rgba(100, 150, 255, 0.3)'
            : 'rgba(100, 150, 255, 0.25)',
          padding: 12 * fontScale,
          marginTop: 60 * fontScale,
          marginBottom: 20 * fontScale,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8 * fontScale,
        },
        title: {
          textAlign: 'center',
          marginBottom: 12 * fontScale,
        },
        message: {
          textAlign: 'center',
          lineHeight: 24 * fontScale,
          marginBottom: 12 * fontScale,
        },
        footer: {
          gap: 10 * fontScale,
          paddingTop: 16 * fontScale,
          flexShrink: 0,
          marginBottom: 4 * fontScale,
        },
        buttonRow: {
          flexDirection: 'row',
          gap: 12 * fontScale,
        },
        button: {
          flex: 1,
          height: 52 * fontScale,
          borderRadius: 14 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20 * fontScale,
        },
        buttonPrimary: {
          backgroundColor: colors.primary,
        },
        buttonSecondary: {
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1.5,
          borderColor: colorScheme === 'dark'
            ? 'rgba(100, 150, 255, 0.4)'
            : 'rgba(100, 150, 255, 0.3)',
        },
        buttonOutline: {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
        },
        buttonTextPrimary: {
          color: '#ffffff',
          fontWeight: '600',
        },
        buttonTextSecondary: {
          color: colors.text,
          fontWeight: '600',
        },
        buttonTextOutline: {
          color: colors.primary,
          fontWeight: '600',
        },
        stepIndicator: {
          textAlign: 'center',
          marginTop: 8 * fontScale,
        },
      }),
    [fontScale, colorScheme, colors]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleSkip}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Gradient background */}
              <LinearGradient
                colors={
                  colorScheme === 'dark'
                    ? ['rgba(70, 120, 220, 0.45)', 'rgba(50, 90, 180, 0.35)', 'rgba(80, 130, 230, 0.42)']
                    : ['rgba(100, 150, 255, 0.35)', 'rgba(120, 170, 255, 0.25)', 'rgba(100, 150, 255, 0.32)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              />

              {/* Border */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 24 * fontScale,
                  borderWidth: 1.5,
                  borderColor: colorScheme === 'dark'
                    ? 'rgba(100, 150, 255, 0.4)'
                    : 'rgba(100, 150, 255, 0.3)',
                }}
              />

              <View style={styles.content}>
                {/* Header with progress dots and skip */}
                <View style={styles.header}>
                  <View style={styles.progressContainer}>
                    {STEPS.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.progressDot,
                          index <= currentStep && styles.progressDotActive,
                        ]}
                      />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                  >
                    <ThemedText size="sm" weight="semibold" style={styles.skipText}>
                      {t('onboarding.skip')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Step content with ScrollView */}
                <View style={styles.scrollContainer}>
                  <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    alwaysBounceVertical={true}
                  >
                    <Animated.View
                      key={currentStep}
                      entering={SlideInRight.duration(300)}
                      exiting={SlideOutLeft.duration(300)}
                    >
                      {/* Icon or GIF */}
                      {step.showGif ? (
                        <View style={styles.gifWrapper}>
                          <Animated.View style={gifAnimatedStyle}>
                            <View style={styles.gifContainer}>
                              <Image
                                source={
                                  step.gifSource === 'welcome'
                                    ? require('@/assets/images/home.gif')
                                    : step.gifSource === 'output'
                                    ? require('@/assets/images/output.gif')
                                    : step.gifSource === 'memory'
                                    ? require('@/assets/images/memories.gif')
                                    : step.gifSource === 'insights'
                                    ? require('@/assets/images/insights.gif')
                                    : step.gifSource === 'notifications'
                                    ? require('@/assets/images/reminders.gif')
                                    : step.gifSource === 'creating'
                                    ? require('@/family.gif')
                                    : require('@/assets/images/output.gif')
                                }
                                style={styles.gif}
                                contentFit="contain"
                              />
                            </View>
                          </Animated.View>
                        </View>
                      ) : (
                        <View style={styles.iconContainer}>
                          <MaterialIcons
                            name={step.icon!}
                            size={40 * fontScale}
                            color={colors.primary}
                          />
                        </View>
                      )}

                      {/* Text Container - shows full or collapsed bar */}
                      {isTextCollapsed ? (
                        // Collapsed state - show simple bar with expand icon
                        <Pressable onPress={handleToggleText} style={styles.collapsedBar}>
                          <MaterialIcons
                            name="expand-more"
                            size={20 * fontScale}
                            color={colors.primary}
                          />
                          <ThemedText size="sm" weight="medium" style={{ color: colors.primary }}>
                            Show Details
                          </ThemedText>
                        </Pressable>
                      ) : (
                        // Expanded state - show full text container
                        <Pressable onPress={handleToggleText} style={styles.textContainer}>
                          {/* Collapse icon in top-right corner */}
                          <View style={styles.textCollapseIcon}>
                            <MaterialIcons
                              name="expand-less"
                              size={18 * fontScale}
                              color={colors.primary}
                            />
                          </View>

                          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
                            {t(step.titleKey)}
                          </ThemedText>

                          <ThemedText size="sm" weight="normal" style={styles.message}>
                            {t(step.messageKey)}
                          </ThemedText>
                        </Pressable>
                      )}

                      {/* Step indicator */}
                      <ThemedText size="xs" weight="medium" style={styles.stepIndicator}>
                        {currentStep + 1} {t('onboarding.of')} {STEPS.length}
                      </ThemedText>
                    </Animated.View>
                  </ScrollView>
                </View>

                {/* Footer with navigation buttons */}
                <View style={styles.footer}>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={handlePrevious}
                      activeOpacity={0.8}
                    >
                      <ThemedText size="l" weight="bold" style={styles.buttonTextSecondary}>
                        {t('onboarding.back')}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonPrimary]}
                      onPress={isLastStep ? onDismiss : handleNext}
                      activeOpacity={0.8}
                    >
                      <ThemedText size="l" weight="bold" style={styles.buttonTextPrimary}>
                        {isLastStep ? t('onboarding.done') : t('onboarding.next')}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
