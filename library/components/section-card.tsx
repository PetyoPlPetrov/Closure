import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type SectionCardProps = {
  title: string;
  isCompleted: boolean;
  onPress?: () => void;
  containerStyle?: ViewStyle;
};

export function SectionCard({
  title,
  isCompleted,
  onPress,
  containerStyle,
}: SectionCardProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16 * fontScale,
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : '#ffffff',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
        },
        iconContainer: {
          width: 48 * fontScale,
          height: 48 * fontScale,
          borderRadius: 24 * fontScale,
          backgroundColor: isCompleted
            ? colors.primary
            : colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          flex: 1,
        },
        title: {
          color: isCompleted ? colors.primary : colors.text,
        },
        arrow: {
          width: 24 * fontScale,
          height: 24 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [fontScale, colorScheme, colors.primary, colors.text, isCompleted]
  );

  const cardContent = (
    <>
      <View style={styles.iconContainer}>
        {isCompleted ? (
          <MaterialIcons
            name="check"
            size={24 * fontScale}
            color="#ffffff"
          />
        ) : null}
      </View>
      <View style={styles.content}>
        <ThemedText size="l" weight="bold" style={styles.title}>
          {title}
        </ThemedText>
      </View>
      {onPress && (
        <View style={styles.arrow}>
          <MaterialIcons
            name="chevron-right"
            size={24 * fontScale}
            color={colorScheme === 'dark' ? colors.icon : colors.tabIconDefault}
          />
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.container, containerStyle]}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {cardContent}
    </View>
  );
}

