import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useTranslate } from '@/utils/languages/use-translate';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

type UploadPictureProps = {
  label?: string;
  containerStyle?: ViewStyle;
  onPress?: () => void;
  onDelete?: () => void;
  hasImage?: boolean;
  imageUri?: string | null;
  isLoading?: boolean;
  showShadow?: boolean;
  avatarMode?: boolean; // If true, makes it circular like an avatar
};

export function UploadPicture({
  label = 'Add a Picture',
  containerStyle,
  onPress,
  onDelete,
  hasImage = false,
  imageUri,
  isLoading = false,
  showShadow = true,
  avatarMode = false,
}: UploadPictureProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];
  const t = useTranslate();

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
          height: avatarMode ? 120 * fontScale : 160 * fontScale,
          width: avatarMode ? 120 * fontScale : '100%',
          borderRadius: avatarMode ? 60 * fontScale : 12 * fontScale,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colorScheme === 'dark' 
            ? 'rgba(226, 232, 240, 0.3)' 
            : 'rgba(148, 163, 184, 0.5)',
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.03)' 
            : 'rgba(241, 245, 249, 0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: avatarMode ? 0 : 24 * fontScale,
          gap: 8 * fontScale,
          overflow: 'hidden',
          alignSelf: avatarMode ? 'center' : 'stretch',
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
        deleteButton: {
          position: 'absolute',
          top: 8 * fontScale,
          right: 8 * fontScale,
          zIndex: 1001,
        },
        deleteBadge: {
          width: 24 * fontScale,
          height: 24 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: '#FF3B30',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#FF3B30',
          shadowOpacity: 0.5,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        },
        deleteLine: {
          width: 12 * fontScale,
          height: 2 * fontScale,
          backgroundColor: '#FFFFFF',
          borderRadius: 1,
        },
      }),
    [fontScale, colorScheme, avatarMode]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText size="sm" weight="medium" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View
        style={[
          styles.uploadArea,
          showShadow && Platform.OS === 'ios'
            ? {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
              }
            : showShadow
            ? {
                elevation: 12,
              }
            : {},
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
          onPress={onPress}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', gap: 12 * fontScale }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText size="sm" weight="medium" style={styles.uploadText}>
                {t('profile.openingGallery')}
              </ThemedText>
            </View>
          ) : imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: avatarMode ? (60 * fontScale) : (12 * fontScale),
                }}
                contentFit="cover"
              />
              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <View style={styles.deleteBadge}>
                    <View style={styles.deleteLine} />
                  </View>
                </TouchableOpacity>
              )}
              {!avatarMode && (
                <View style={{
                  position: 'absolute',
                  bottom: 8 * fontScale,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  backgroundColor: colorScheme === 'dark' 
                    ? 'rgba(0, 0, 0, 0.5)' 
                    : 'rgba(255, 255, 255, 0.8)',
                  paddingVertical: 4 * fontScale,
                  paddingHorizontal: 8 * fontScale,
                  borderRadius: 4 * fontScale,
                  marginHorizontal: 8 * fontScale,
                }}>
                  <ThemedText size="xs" style={styles.supportedFormats}>
                    {t('profile.changePicture')}
                  </ThemedText>
                </View>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

