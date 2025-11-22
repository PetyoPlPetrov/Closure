import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

type ActionSheetOption = {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

type ActionSheetProps = {
  visible: boolean;
  title: string;
  options: ActionSheetOption[];
  onCancel: () => void;
  cancelLabel?: string;
};

export function ActionSheet({
  visible,
  title,
  options,
  onCancel,
  cancelLabel = 'Cancel',
}: ActionSheetProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        },
        container: {
          backgroundColor: colorScheme === 'dark' ? colors.background : '#ffffff',
          borderTopLeftRadius: 16 * fontScale,
          borderTopRightRadius: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          maxHeight: '80%',
        },
        header: {
          padding: 16 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          alignItems: 'center',
        },
        option: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16 * fontScale,
          gap: 12 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
        },
        optionIcon: {
          width: 24 * fontScale,
          height: 24 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cancelButton: {
          margin: 16 * fontScale,
          marginTop: 8 * fontScale,
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [fontScale, colorScheme, colors.background]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <ThemedText size="l" weight="bold" letterSpacing="s">
                  {title}
                </ThemedText>
              </View>

              {/* Options */}
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.option}
                  onPress={() => {
                    option.onPress();
                    // Call onCancel for non-destructive actions
                    // Destructive actions (like delete) should handle closing themselves
                    // so they can preserve state needed for confirmation modals
                    if (!option.destructive) {
                      onCancel();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {option.icon && (
                    <View style={styles.optionIcon}>
                      <MaterialIcons
                        name={option.icon}
                        size={24 * fontScale}
                        color={option.destructive ? '#ef4444' : colors.text}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      size="l"
                      weight="normal"
                      style={{ 
                        color: option.destructive ? '#ef4444' : colors.text,
                      }}
                    >
                      {option.label}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <ThemedText size="l" weight="bold">
                  {cancelLabel}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

