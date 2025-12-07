import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TAB_BACKGROUND_COLOR_DARK = '#1A2332'; // Dark blue-grey background
export const TAB_BACKGROUND_COLOR_LIGHT = '#B0B0B0'; // Darker grey background for light mode

// Gradient colors for dark mode background - visible gradient from darker to lighter blue-grey
export const DARK_GRADIENT_COLORS = ['#080C14', '#0D121A', '#121820', '#1A2332', '#1F2A3A', '#243041', '#2A3545', '#2F3A4A', '#344050'] as const; // Visible gradient from darker to lighter blue-grey
export const LIGHT_GRADIENT_COLORS = ['#858585', '#909090', '#9B9B9B', '#B0B0B0', '#C5C5C5', '#D0D0D0', '#DBDBDB', '#E5E5E5', '#F0F0F0'] as const; // Visible gradient from darker to lighter grey

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
          <View 
            style={[
              styles.content, 
              contentStyle
            ]} 
            {...otherProps}
          >
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
          <View 
            style={[
              styles.content, 
              contentStyle
            ]} 
            {...otherProps}
          >
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
    backgroundColor: 'transparent', // Ensure content is transparent so gradient shows through
  },
});

