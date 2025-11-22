import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export const TAB_BACKGROUND_COLOR_DARK = '#1E3A52';
export const TAB_BACKGROUND_COLOR_LIGHT = '#ffffff';

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
  const backgroundColor = colorScheme === 'dark' 
    ? TAB_BACKGROUND_COLOR_DARK 
    : TAB_BACKGROUND_COLOR_LIGHT;

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor }, style]}
      edges={['top', 'bottom']}
    >
      <View 
        style={[styles.content, { backgroundColor }, contentStyle]}
        {...otherProps}
      >
        {children}
      </View>
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

