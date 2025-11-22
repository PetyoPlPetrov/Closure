import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useMemo } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

type TextAreaProps = TextInputProps & {
  label?: string;
  containerStyle?: ViewStyle;
  error?: string;
  rows?: number;
};

export function TextArea({
  label,
  containerStyle,
  error,
  rows = 4,
  style,
  placeholderTextColor,
  multiline = true,
  textAlignVertical = 'top',
  ...rest
}: TextAreaProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: 8 * fontScale,
        },
        label: {
          marginBottom: 4 * fontScale,
        },
        textArea: {
          minHeight: (48 + (rows - 1) * 24) * fontScale,
          paddingHorizontal: 16 * fontScale,
          paddingVertical: 12 * fontScale,
          borderRadius: 8 * fontScale,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? 'rgba(226, 232, 240, 0.2)' : 'rgba(226, 232, 240, 1)',
          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
          color: colorScheme === 'dark' ? '#ffffff' : Colors.light.text,
          fontSize: 16 * fontScale,
        },
        errorText: {
          marginTop: 4 * fontScale,
        },
      }),
    [fontScale, colorScheme, rows]
  );

  const defaultPlaceholderColor =
    colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText size="sm" weight="medium" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        style={[styles.textArea, style]}
        placeholderTextColor={placeholderTextColor ?? defaultPlaceholderColor}
        multiline={multiline}
        textAlignVertical={textAlignVertical}
        {...rest}
      />
      {error && (
        <ThemedText size="xs" style={[styles.errorText, { color: '#ef4444' }]}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

