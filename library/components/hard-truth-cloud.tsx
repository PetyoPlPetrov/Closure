import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

type HardTruthCloudProps = {
  text: string;
  onDelete?: () => void;
  containerStyle?: ViewStyle;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

export function HardTruthCloud({
  text,
  onDelete,
  containerStyle,
  position = 'top-left',
}: HardTruthCloudProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          maxWidth: '70%',
          position: 'relative',
          alignSelf: position.includes('left') ? 'flex-start' : 'flex-end',
        },
        cloud: {
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(241, 245, 249, 0.8)',
          borderRadius: 16 * fontScale,
          padding: 12 * fontScale,
          paddingTop: 16 * fontScale,
          borderWidth: 1,
          borderColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(148, 163, 184, 0.3)',
        },
        text: {},
        deleteButton: {
          position: 'absolute',
          top: 4 * fontScale,
          right: 4 * fontScale,
          width: 24 * fontScale,
          height: 24 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(0, 0, 0, 0.3)'
              : 'rgba(255, 255, 255, 0.8)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        },
      }),
    [fontScale, colorScheme, position]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.cloud}>
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="close"
              size={14 * fontScale}
              color={colorScheme === 'dark' ? colors.text : '#000000'}
            />
          </TouchableOpacity>
        )}
        <ThemedText size="sm" weight="normal" style={styles.text}>
          {text}
        </ThemedText>
      </View>
    </View>
  );
}

