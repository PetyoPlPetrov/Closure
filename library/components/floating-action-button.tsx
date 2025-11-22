import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

type FloatingActionButtonProps = {
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  containerStyle?: ViewStyle;
};

export function FloatingActionButton({
  onPress,
  icon = 'add',
  containerStyle,
}: FloatingActionButtonProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  const colors = Colors[colorScheme ?? 'dark'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          width: 56 * fontScale,
          height: 56 * fontScale,
          borderRadius: 28 * fontScale,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4 * fontScale,
          },
          shadowOpacity: 0.3,
          shadowRadius: 4.65 * fontScale,
          elevation: 8, // Android shadow
        },
      }),
    [fontScale, colors.primary]
  );

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialIcons
        name={icon}
        size={24 * fontScale}
        color={colorScheme === 'dark' ? '#ffffff' : '#ffffff'}
      />
    </TouchableOpacity>
  );
}

