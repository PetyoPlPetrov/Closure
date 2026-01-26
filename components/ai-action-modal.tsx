import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
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
  onSelectCreateEntity: () => void;
  hasEntities: boolean;
};

export function AIActionModal({
  visible,
  onClose,
  onSelectCreateMemory,
  onSelectCreateEntity,
  hasEntities,
}: AIActionModalProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();

  // Pulse animation for the modal
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const iconScale = useSharedValue(1);
  const memoryButtonScale = useSharedValue(1);
  const entityButtonScale = useSharedValue(1);

  // Track which button should pulse next
  const buttonPulseRef = React.useRef<{ intervalId: NodeJS.Timeout | null; isMemoryTurn: boolean }>({
    intervalId: null,
    isMemoryTurn: true,
  });

  React.useEffect(() => {
    if (visible) {
      // Start pulsing animation for modal container - only for 3 seconds (1.5 pulse cycles)
      // Using 750ms per half-cycle to match icon timing: 750ms * 2 * 2 = 3000ms
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) })
        ),
        2, // 2 cycles = 3 seconds total (750ms * 2 * 2 = 3000ms)
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.ease) })
        ),
        2, // 2 cycles = 3 seconds total
        false
      );
      
      // Icon pulse animation - only for 3 seconds (2 pulse cycles)
      iconScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) })
        ),
        2, // 2 cycles = 3 seconds total (750ms * 2 * 2 = 3000ms)
        false
      );

      // After 3 seconds, stop all modal pulsing and start button pulsing (taking turns)
      const buttonPulseTimeout = setTimeout(() => {
        // Stop all modal pulsing (icon, container, glow)
        iconScale.value = 1;
        pulseScale.value = 1;
        glowOpacity.value = 0.3;
        
        // Reset button turn state
        buttonPulseRef.current.isMemoryTurn = true;
        
        const pulseNextButton = () => {
          if (buttonPulseRef.current.isMemoryTurn && hasEntities) {
            // Pulse "Create Memory" button
            memoryButtonScale.value = withSequence(
              withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
            );
            buttonPulseRef.current.isMemoryTurn = false;
          } else {
            // Pulse "Create Sfera Entity" button
            entityButtonScale.value = withSequence(
              withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
            );
            buttonPulseRef.current.isMemoryTurn = true;
          }
        };

        // Start first button pulse
        pulseNextButton();
        
        // Continue alternating (every 2 seconds: 600ms grow + 600ms shrink + 800ms pause)
        buttonPulseRef.current.intervalId = setInterval(() => {
          pulseNextButton();
        }, 2000);
      }, 3000);

      return () => {
        clearTimeout(buttonPulseTimeout);
        if (buttonPulseRef.current.intervalId) {
          clearInterval(buttonPulseRef.current.intervalId);
          buttonPulseRef.current.intervalId = null;
        }
      };
    } else {
      // Reset all animations when modal closes
      pulseScale.value = 1;
      glowOpacity.value = 0.3;
      iconScale.value = 1;
      memoryButtonScale.value = 1;
      entityButtonScale.value = 1;
      
      // Clear any running intervals
      if (buttonPulseRef.current.intervalId) {
        clearInterval(buttonPulseRef.current.intervalId);
        buttonPulseRef.current.intervalId = null;
      }
    }
  }, [visible, hasEntities, pulseScale, glowOpacity, iconScale, memoryButtonScale, entityButtonScale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const memoryButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: memoryButtonScale.value }],
  }));

  const entityButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entityButtonScale.value }],
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

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  {hasEntities ? (
                    <Animated.View style={memoryButtonAnimatedStyle}>
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
                    </Animated.View>
                  ) : (
                    <View>
                      <TouchableOpacity
                        disabled
                        activeOpacity={1}
                        style={[styles.button, styles.buttonDisabled]}
                      >
                        <MaterialIcons name="memory" size={24 * fontScale} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} />
                        <ThemedText size="l" weight="bold" style={[styles.buttonText, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                          {t('ai.action.createMemory')}
                        </ThemedText>
                      </TouchableOpacity>
                      <ThemedText size="xs" style={[styles.hintText, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                        {t('ai.action.createMemoryHint')}
                      </ThemedText>
                    </View>
                  )}

                  <Animated.View style={entityButtonAnimatedStyle}>
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onSelectCreateEntity();
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
                      <MaterialIcons name="person-add" size={24 * fontScale} color="#FFFFFF" />
                      <ThemedText size="l" weight="bold" style={styles.buttonText}>
                        {t('ai.action.createEntity')}
                      </ThemedText>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
