import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

type UploadPictureProps = {
  label?: string;
  containerStyle?: ViewStyle;
  onPress?: () => void;
  hasImage?: boolean;
  supportedFormats?: string;
};

export function UploadPicture({
  label = 'Add a Picture',
  containerStyle,
  onPress,
  hasImage = false,
  supportedFormats = 'PNG, JPG or GIF',
}: UploadPictureProps) {
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
        uploadArea: {
          minHeight: 120 * fontScale,
          borderRadius: 8 * fontScale,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colorScheme === 'dark' 
            ? 'rgba(226, 232, 240, 0.3)' 
            : 'rgba(148, 163, 184, 0.5)',
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.02)' 
            : 'rgba(241, 245, 249, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24 * fontScale,
          gap: 8 * fontScale,
        },
        iconContainer: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          borderRadius: 24 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(56, 189, 248, 0.2)' 
            : 'rgba(56, 189, 248, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        uploadText: {
          marginTop: 4 * fontScale,
        },
        supportedFormats: {
          marginTop: 2 * fontScale,
        },
      }),
    [fontScale, colorScheme]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText size="sm" weight="medium" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TouchableOpacity
        style={styles.uploadArea}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={hasImage ? 'image' : 'photo-camera'}
            size={28 * fontScale}
            color={colors.primary}
          />
          {!hasImage && (
            <View style={{
              position: 'absolute',
              bottom: -2 * fontScale,
              right: -2 * fontScale,
              width: 20 * fontScale,
              height: 20 * fontScale,
              borderRadius: 10 * fontScale,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialIcons
                name="add"
                size={14 * fontScale}
                color="#ffffff"
              />
            </View>
          )}
        </View>
        <ThemedText size="sm" weight="medium" style={styles.uploadText}>
          Upload Picture
        </ThemedText>
        <ThemedText size="xs" style={styles.supportedFormats}>
          {supportedFormats}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

