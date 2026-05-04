import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import {
  getRemainingAIRequests,
  REQUESTS_PER_DAY_PREMIUM,
} from '@/utils/ai-rate-limiter';
import { getFreeAIDailyLimit } from '@/utils/badge-rewards';
import { subscribeBadgeRewardsChanged } from '@/utils/badge-rewards-events';
import { useTranslate } from '@/utils/languages/use-translate';
import { useSubscription } from '@/utils/SubscriptionProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type AIActionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectCreateMemory: () => void;
  hasEntities: boolean;
};

export function AIActionModal({
  visible,
  onClose,
  onSelectCreateMemory,
  hasEntities,
}: AIActionModalProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();
  const { hasAIEntitlement } = useSubscription();
  const [remainingAIRequests, setRemainingAIRequests] = useState<number | null>(null);
  // Free-tier daily limit is dynamic: 3 by default, 5 with active Sferas badge.
  const [freeAIDailyLimit, setFreeAIDailyLimit] = useState(3);

  useEffect(() => {
    if (visible) {
      const refresh = () => {
        getRemainingAIRequests(hasAIEntitlement).then(setRemainingAIRequests);
        if (!hasAIEntitlement) {
          getFreeAIDailyLimit().then(setFreeAIDailyLimit);
        }
      };
      refresh();
      // Subscribe so the displayed limit/remaining updates the moment the user crosses
      // the Sferas threshold (or loses the badge) while this modal is open.
      const unsubscribe = subscribeBadgeRewardsChanged(refresh);
      return unsubscribe;
    } else {
      setRemainingAIRequests(null);
    }
  }, [visible, hasAIEntitlement]);

  // Pulse animation for the modal (container, glow, icon only — no button pulsing)
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const iconScale = useSharedValue(1);

  React.useEffect(() => {
    if (visible) {
      // Start pulsing animation for modal container - only for 3 seconds (1.5 pulse cycles)
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) })
        ),
        2,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.ease) })
        ),
        2,
        false
      );
      iconScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) })
        ),
        2,
        false
      );
    } else {
      pulseScale.value = 1;
      glowOpacity.value = 0.3;
      iconScale.value = 1;
    }
  }, [visible, pulseScale, glowOpacity, iconScale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20 * fontScale,
        },
        container: {
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          borderRadius: 24 * fontScale,
          padding: 32 * fontScale,
          width: '100%',
          maxWidth: 400 * fontScale,
          gap: 24 * fontScale,
          position: 'relative',
          overflow: 'visible',
        },
        dotsOverlay: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: 24 * fontScale,
          pointerEvents: 'none',
        },
        glowContainer: {
          position: 'absolute',
          top: -20,
          left: -20,
          right: -20,
          bottom: -20,
          borderRadius: 44 * fontScale,
          overflow: 'hidden',
        },
        content: {
          position: 'relative',
          zIndex: 1,
        },
        iconContainer: {
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginBottom: 20 * fontScale,
        },
        title: {
          textAlign: 'center',
          marginBottom: 12 * fontScale,
        },
        message: {
          textAlign: 'center',
          lineHeight: 22 * fontScale,
          marginBottom: 24 * fontScale,
        },
        buttonContainer: {
          gap: 12 * fontScale,
        },
        button: {
          height: 56 * fontScale,
          borderRadius: 16 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24 * fontScale,
          flexDirection: 'row',
          gap: 12 * fontScale,
          overflow: 'hidden',
          position: 'relative',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12,
        },
        buttonDisabled: {
          opacity: 0.5,
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        buttonText: {
          color: '#ffffff',
          fontWeight: '600',
        },
        hintText: {
          marginTop: 6 * fontScale,
          marginBottom: 4 * fontScale,
          paddingHorizontal: 8 * fontScale,
          textAlign: 'center',
          opacity: 0.8,
        },
        closeButton: {
          position: 'absolute',
          top: 16 * fontScale,
          right: 16 * fontScale,
          width: 32 * fontScale,
          height: 32 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        },
      }),
    [fontScale, colorScheme, colors.background]
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.container, pulseAnimatedStyle]}>
              {/* Glow effect */}
              <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
                <LinearGradient
                  colors={
                    colorScheme === 'dark'
                      ? ['rgba(100, 150, 255, 0.4)', 'rgba(100, 150, 255, 0.2)', 'rgba(100, 150, 255, 0.3)']
                      : ['rgba(100, 150, 255, 0.3)', 'rgba(100, 150, 255, 0.15)', 'rgba(100, 150, 255, 0.25)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              {/* Sparse white dots overlay */}
              {colorScheme === 'dark' && (
                <View style={styles.dotsOverlay}>
                  {[...Array(20)].map((_, i) => {
                    const size = Math.random() * 2 + 1;
                    const left = Math.random() * 100;
                    const top = Math.random() * 100;
                    return (
                      <View
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${left}%`,
                          top: `${top}%`,
                          width: size,
                          height: size,
                          borderRadius: size / 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        }}
                      />
                    );
                  })}
                </View>
              )}

              {/* Close button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons 
                  name="close" 
                  size={20 * fontScale} 
                  color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                />
              </TouchableOpacity>

              <View style={styles.content}>
                {/* Icon - no circle, just pulsing */}
                <View style={styles.iconContainer}>
                  <Animated.Text 
                    style={[
                      iconAnimatedStyle,
                      {
                        fontSize: 56 * fontScale,
                        lineHeight: 56 * fontScale,
                        textAlign: 'center',
                        includeFontPadding: false,
                      }
                    ]}
                  >
                    ✨
                  </Animated.Text>
                </View>

                {/* Title */}
                <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
                  {t('ai.action.title')}
                </ThemedText>

                {/* Message */}
                <ThemedText size="sm" weight="normal" style={styles.message}>
                  {hasEntities 
                    ? t('ai.action.message.withEntities')
                    : t('ai.action.message.noEntities')
                  }
                </ThemedText>

                {/* Remaining free AI memory creations, or daily limit reached (premium) */}
                {remainingAIRequests !== null &&
                  (hasAIEntitlement && remainingAIRequests === 0 ? (
                    <ThemedText
                      size="xs"
                      style={[
                        styles.hintText,
                        {
                          marginBottom: 16 * fontScale,
                          color: colors.textMediumEmphasis,
                        },
                      ]}
                    >
                      {t('ai.rateLimit.premiumMessage') ||
                        "You've reached the daily limit. Try again tomorrow."}
                    </ThemedText>
                  ) : (
                    <ThemedText
                      size="xs"
                      style={[
                        styles.hintText,
                        {
                          marginBottom: 16 * fontScale,
                          color: colors.textMediumEmphasis,
                        },
                      ]}
                    >
                      {(t('ai.remainingCreations') || '{count} of {limit} free AI memory creations left today')
                        .replace('{count}', String(remainingAIRequests))
                        .replace(
                          '{limit}',
                          String(hasAIEntitlement ? REQUESTS_PER_DAY_PREMIUM : freeAIDailyLimit),
                        )}
                    </ThemedText>
                  ))}

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  {hasEntities && !(hasAIEntitlement && remainingAIRequests === 0) ? (
                    <View>
                      <TouchableOpacity
                        onPress={() => {
                          onClose();
                          onSelectCreateMemory();
                        }}
                        activeOpacity={0.8}
                        style={styles.button}
                      >
                        <LinearGradient
                          colors={['#4A90E2', '#357ABD', '#2E6DA4']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          borderRadius={16 * fontScale}
                        />
                        <MaterialIcons name="memory" size={24 * fontScale} color="#FFFFFF" />
                        <ThemedText size="l" weight="bold" style={styles.buttonText}>
                          {t('ai.action.createMemory')}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <TouchableOpacity
                        disabled
                        activeOpacity={1}
                        style={[styles.button, styles.buttonDisabled]}
                      >
                        <MaterialIcons name="memory" size={24 * fontScale} color={colors.textDisabled} />
                        <ThemedText size="l" weight="bold" style={[styles.buttonText, { color: colors.textMediumEmphasis }]}>
                          {t('ai.action.createMemory')}
                        </ThemedText>
                      </TouchableOpacity>
                      <ThemedText size="xs" style={[styles.hintText, { color: colors.textMediumEmphasis }]}>
                        {hasAIEntitlement && remainingAIRequests === 0
                          ? (t('ai.rateLimit.premiumMessage') || "You've reached the daily limit. Try again tomorrow.")
                          : t('ai.action.createMemoryHint')}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
