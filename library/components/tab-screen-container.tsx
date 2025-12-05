import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TAB_BACKGROUND_COLOR_DARK = '#1A2332'; // Dark blue-grey background
export const TAB_BACKGROUND_COLOR_LIGHT = '#B0B0B0'; // Darker grey background for light mode

// Gradient colors for dark mode background - more visible gradient from darker blue to lighter blue-grey
export const DARK_GRADIENT_COLORS = ['#0F1A28', '#1A2332', '#243041', '#2D3A4F'] as const; // Darker to lighter blue-grey gradient
export const LIGHT_GRADIENT_COLORS = ['#B0B0B0', '#D0D0D0', '#FFFFFF'] as const; // Gradient from grey to white (white at bottom) for light mode

type TabScreenContainerProps = ViewProps & {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

export function TabScreenContainer({ 
  children, 
  style,
  contentStyle,
  ...otherProps 
}: TabScreenContainerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView 
      style={[styles.container, style]}
      edges={['top']}
    >
      {isDark ? (
        <LinearGradient
          colors={DARK_GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={[styles.content, contentStyle]} {...otherProps}>
            {children}
          </View>
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={LIGHT_GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={[styles.content, contentStyle]} {...otherProps}>
            {children}
          </View>
        </LinearGradient>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

