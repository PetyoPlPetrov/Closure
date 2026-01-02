import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TAB_BACKGROUND_COLOR_DARK = '#1A2332'; // Dark blue-grey background
export const TAB_BACKGROUND_COLOR_LIGHT = '#B0B0B0'; // Darker grey background for light mode

// Gradient colors for dark mode background - visible gradient from darker to lighter blue-grey
export const DARK_GRADIENT_COLORS = ['#080C14', '#0D121A', '#121820', '#1A2332', '#1F2A3A', '#243041', '#2A3545', '#2F3A4A', '#344050'] as const; // Visible gradient from darker to lighter blue-grey
export const LIGHT_GRADIENT_COLORS = ['#858585', '#909090', '#9B9B9B', '#B0B0B0', '#C5C5C5', '#D0D0D0', '#DBDBDB', '#E5E5E5', '#F0F0F0'] as const; // Visible gradient from darker to lighter grey

type MomentType = 'lessons' | 'sunnyMoments' | 'hardTruths';

type TabScreenContainerProps = ViewProps & {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  momentType?: MomentType;
  momentTypeOpacity?: number;
};

// Get corner accent color based on moment type
function getCornerAccentColor(momentType: MomentType | undefined): string {
  if (!momentType) return 'transparent';

  switch (momentType) {
    case 'lessons':
      return 'rgba(255, 215, 0, 0.15)'; // Yellowish for bulbs
    case 'sunnyMoments':
      return 'rgba(255, 193, 7, 0.15)'; // Sunny/golden for suns
    case 'hardTruths':
      return 'rgba(140, 140, 140, 0.12)'; // Greyish for clouds
  }
}

export function TabScreenContainer({
  children,
  style,
  contentStyle,
  momentType,
  momentTypeOpacity = 1,
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
          {/* Corner accent overlays - only visible when moment type is selected */}
          {momentType && momentTypeOpacity > 0 && (
            <>
              {/* Top-left corner */}
              <LinearGradient
                colors={[getCornerAccentColor(momentType), 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />

              {/* Top-right corner */}
              <LinearGradient
                colors={[getCornerAccentColor(momentType), 'transparent']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />

              {/* Bottom-left corner */}
              <LinearGradient
                colors={['transparent', getCornerAccentColor(momentType)]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />

              {/* Bottom-right corner */}
              <LinearGradient
                colors={['transparent', getCornerAccentColor(momentType)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />
            </>
          )}

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
          {/* Corner accent overlays - only visible when moment type is selected */}
          {momentType && momentTypeOpacity > 0 && (
            <>
              {/* Top-left corner */}
              <LinearGradient
                colors={[getCornerAccentColor(momentType), 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />

              {/* Top-right corner */}
              <LinearGradient
                colors={[getCornerAccentColor(momentType), 'transparent']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />

              {/* Bottom-left corner */}
              <LinearGradient
                colors={['transparent', getCornerAccentColor(momentType)]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />

              {/* Bottom-right corner */}
              <LinearGradient
                colors={['transparent', getCornerAccentColor(momentType)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: momentTypeOpacity }
                ]}
                pointerEvents="none"
              />
            </>
          )}

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

