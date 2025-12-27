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
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import type { Translations } from '@/utils/languages/translations';

type OnboardingStep = {
  icon?: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  messageKey: keyof Translations;
  showGif?: boolean;
  gifSource?: 'welcome' | 'output' | 'memory' | 'insights' | 'notifications';
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
    icon: 'rocket-launch',
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
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();

  const step = STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onDismiss();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (isFirstStep) {
      onDismiss();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

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
          justifyContent: 'center',
          paddingBottom: 4 * fontScale,
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
        gifContainer: {
          width: 240 * fontScale,
          height: 180 * fontScale,
          alignSelf: 'center',
          marginBottom: 20 * fontScale,
          marginTop: 12 * fontScale,
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
        title: {
          textAlign: 'center',
          marginBottom: 16 * fontScale,
        },
        message: {
          textAlign: 'center',
          lineHeight: 24 * fontScale,
          marginBottom: 16 * fontScale,
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
                    bounces={false}
                  >
                    <Animated.View
                      key={currentStep}
                      entering={SlideInRight.duration(300)}
                      exiting={SlideOutLeft.duration(300)}
                    >
                      {/* Icon or GIF */}
                      {step.showGif ? (
                        <View style={styles.gifContainer}>
                          <Image
                            source={
                              step.gifSource === 'welcome'
                                ? require('@/assets/images/welcome.gif')
                                : step.gifSource === 'output'
                                ? require('@/assets/images/output.gif')
                                : step.gifSource === 'memory'
                                ? require('@/assets/images/memories.gif')
                                : step.gifSource === 'insights'
                                ? require('@/assets/images/insights.gif')
                                : step.gifSource === 'notifications'
                                ? require('@/assets/images/reminders.gif')
                                : require('@/assets/images/output.gif')
                            }
                            style={styles.gif}
                            contentFit="contain"
                          />
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

                      {/* Title */}
                      <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
                        {t(step.titleKey)}
                      </ThemedText>

                      {/* Message */}
                      <ThemedText size="sm" weight="normal" style={styles.message}>
                        {t(step.messageKey)}
                      </ThemedText>

                      {/* Step indicator */}
                      <ThemedText size="xs" weight="medium" style={styles.stepIndicator}>
                        {currentStep + 1} {t('onboarding.of')} {STEPS.length}
                      </ThemedText>
                    </Animated.View>
                  </ScrollView>
                </View>

                {/* Footer with navigation buttons */}
                <View style={styles.footer}>
                  {isLastStep ? (
                    <>
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
                        {onDemo && (
                          <TouchableOpacity
                            style={[styles.button, styles.buttonPrimary]}
                            onPress={handleDemo}
                            activeOpacity={0.8}
                          >
                            <ThemedText size="l" weight="bold" style={styles.buttonTextPrimary}>
                              {t('onboarding.demo')}
                            </ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.button, styles.buttonPrimary]}
                        onPress={handleNext}
                        activeOpacity={0.8}
                      >
                        <ThemedText size="l" weight="bold" style={styles.buttonTextPrimary}>
                          {t('onboarding.finish')}
                        </ThemedText>
                      </TouchableOpacity>
                    </>
                  ) : (
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
                        onPress={handleNext}
                        activeOpacity={0.8}
                      >
                        <ThemedText size="l" weight="bold" style={styles.buttonTextPrimary}>
                          {t('onboarding.next')}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
