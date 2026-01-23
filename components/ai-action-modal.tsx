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

  React.useEffect(() => {
    if (visible) {
      // Start pulsing animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = 1;
      glowOpacity.value = 0.3;
    }
  }, [visible]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
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
          width: 80 * fontScale,
          height: 80 * fontScale,
          borderRadius: 40 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 215, 0, 0.15)' 
            : 'rgba(255, 215, 0, 0.15)',
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
        },
        buttonText: {
          color: '#ffffff',
          fontWeight: '600',
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

              {/* Close button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons 
                  name="close" 
                  size={20 * fontScale} 
                  color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                />
              </TouchableOpacity>

              <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <ThemedText style={{ 
                    fontSize: 48 * fontScale,
                    lineHeight: 48 * fontScale,
                    textAlign: 'center',
                    includeFontPadding: false,
                  }}>
                    ✨
                  </ThemedText>
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
                  {hasEntities && (
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        onClose();
                        onSelectCreateMemory();
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="memory" size={24 * fontScale} color="#FFFFFF" />
                      <ThemedText size="l" weight="bold" style={styles.buttonText}>
                        {t('ai.action.createMemory')}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      onClose();
                      onSelectCreateEntity();
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="person-add" size={24 * fontScale} color="#FFFFFF" />
                    <ThemedText size="l" weight="bold" style={styles.buttonText}>
                      {t('ai.action.createEntity')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
