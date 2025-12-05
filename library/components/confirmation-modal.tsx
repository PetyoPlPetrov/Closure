import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useMemo } from 'react';
import {
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmationModalProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16 * fontScale,
        },
        container: {
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          borderRadius: 16 * fontScale,
          padding: 24 * fontScale,
          width: '100%',
          maxWidth: 400 * fontScale,
          gap: 24 * fontScale,
        },
        title: {
          marginBottom: 8 * fontScale,
        },
        message: {
          marginBottom: 8 * fontScale,
        },
        buttons: {
          flexDirection: 'row',
          gap: 12 * fontScale,
        },
        button: {
          flex: 1,
          height: 48 * fontScale,
          borderRadius: 8 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16 * fontScale,
        },
        cancelButton: {
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)',
        },
        confirmButton: {
          backgroundColor: destructive ? '#ef4444' : colors.primary,
        },
      }),
    [fontScale, colorScheme, colors.background, colors.primary, destructive]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View>
                <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
                  {title}
                </ThemedText>
                <ThemedText size="sm" weight="normal" style={styles.message}>
                  {message}
                </ThemedText>
              </View>

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <ThemedText size="l" weight="bold">
                    {cancelLabel}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={async () => {
                    try {
                      await onConfirm();
                    } catch (error) {
                      // Error in confirmation modal onConfirm
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <ThemedText size="l" weight="bold" style={{ color: '#ffffff' }}>
                    {confirmLabel}
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

