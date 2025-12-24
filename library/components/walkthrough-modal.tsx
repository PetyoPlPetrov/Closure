import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import { useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type WalkthroughModalProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function WalkthroughModal({
  visible,
  onDismiss,
}: WalkthroughModalProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();

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
          borderRadius: 20 * fontScale,
          padding: 24 * fontScale,
          width: '100%',
          maxWidth: 360 * fontScale,
          gap: 20 * fontScale,
          position: 'relative',
          overflow: 'hidden',
        },
        gradientBackground: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 20 * fontScale,
        },
        content: {
          position: 'relative',
          zIndex: 1,
        },
        iconContainer: {
          width: 64 * fontScale,
          height: 64 * fontScale,
          borderRadius: 32 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(100, 150, 255, 0.2)' 
            : 'rgba(100, 150, 255, 0.15)',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginBottom: 16 * fontScale,
        },
        title: {
          textAlign: 'center',
          marginBottom: 12 * fontScale,
        },
        message: {
          textAlign: 'center',
          lineHeight: 22 * fontScale,
          marginBottom: 8 * fontScale,
        },
        button: {
          height: 48 * fontScale,
          borderRadius: 12 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24 * fontScale,
          marginTop: 8 * fontScale,
        },
        buttonText: {
          color: '#ffffff',
          fontWeight: '600',
        },
      }),
    [fontScale, colorScheme, colors.background]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Gradient background */}
              <LinearGradient
                colors={
                  colorScheme === 'dark'
                    ? ['rgba(100, 150, 255, 0.15)', 'rgba(100, 150, 255, 0.08)', 'rgba(100, 150, 255, 0.12)']
                    : ['rgba(100, 150, 255, 0.12)', 'rgba(100, 150, 255, 0.06)', 'rgba(100, 150, 255, 0.1)']
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
                  borderRadius: 20 * fontScale,
                  borderWidth: 1.5,
                  borderColor: colorScheme === 'dark'
                    ? 'rgba(100, 150, 255, 0.4)'
                    : 'rgba(100, 150, 255, 0.3)',
                }}
              />

              <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <MaterialIcons 
                    name="lightbulb" 
                    size={32 * fontScale} 
                    color={colors.primaryLight} 
                  />
                </View>

                {/* Title */}
                <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
                  {t('walkthrough.title')}
                </ThemedText>

                {/* Message */}
                <ThemedText size="sm" weight="normal" style={styles.message}>
                  {t('walkthrough.message')}
                </ThemedText>

                {/* Button */}
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={onDismiss}
                  activeOpacity={0.8}
                >
                  <ThemedText size="l" weight="bold" style={styles.buttonText}>
                    {t('walkthrough.button')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

