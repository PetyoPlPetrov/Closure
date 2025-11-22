import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

type ProgressBarProps = {
  progress: number; // 0-100
  containerStyle?: ViewStyle;
};

export function ProgressBar({ progress, containerStyle }: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const isComplete = clampedProgress === 100;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          height: 8 * fontScale,
          borderRadius: 4 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        },
        fill: {
          height: '100%',
          borderRadius: 4 * fontScale,
          backgroundColor: isComplete ? '#10b981' : '#f97316', // Green for complete, orange for incomplete
          width: `${clampedProgress}%`,
        },
      }),
    [fontScale, colorScheme, clampedProgress, isComplete]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.fill} />
    </View>
  );
}

