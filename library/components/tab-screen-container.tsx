import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMomentColors } from '@/utils/MomentColorsProvider';
import { useVisualSettings } from '@/utils/VisualSettingsProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const cosmicBackground = require('@/assets/images/cosmic-background.png');

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export const TAB_BACKGROUND_COLOR_DARK = '#1A2332'; // Dark blue-grey background
export const TAB_BACKGROUND_COLOR_LIGHT = '#B0B0B0'; // Darker grey background for light mode

// Gradient colors for dark mode background — semi-transparent so cosmic image shows through
export const DARK_GRADIENT_COLORS = [
  'rgba(5,8,16,0.55)',
  'rgba(10,15,24,0.55)',
  'rgba(15,22,32,0.55)',
  'rgba(21,30,46,0.55)',
  'rgba(26,37,54,0.55)',
  'rgba(31,43,60,0.55)',
  'rgba(36,49,66,0.55)',
  'rgba(41,54,72,0.55)',
  'rgba(46,59,77,0.55)',
] as const;
export const LIGHT_GRADIENT_COLORS = ['#858585', '#909090', '#9B9B9B', '#B0B0B0', '#C5C5C5', '#D0D0D0', '#DBDBDB', '#E5E5E5', '#F0F0F0'] as const; // Visible gradient from darker to lighter grey

type MomentType = 'lessons' | 'sunnyMoments' | 'hardTruths';

type TabScreenContainerProps = ViewProps & {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  momentType?: MomentType;
  momentTypeOpacity?: number;
};

// Get corner accent color based on moment type
function getCornerAccentColor(
  momentType: MomentType | undefined,
  momentColors: { sunny: { background: string }; cloudy: { background: string }; lesson: { background: string } }
): string {
  if (!momentType) return 'transparent';

  switch (momentType) {
    case 'lessons': {
      const { r, g, b } = hexToRgb(momentColors.lesson.background);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }
    case 'sunnyMoments': {
      const { r, g, b } = hexToRgb(momentColors.sunny.background);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }
    case 'hardTruths': {
      const { r, g, b } = hexToRgb(momentColors.cloudy.background);
      return `rgba(${r}, ${g}, ${b}, 0.12)`;
    }
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
  const { momentColors } = useMomentColors();
  const { cosmicBackgroundOpacity } = useVisualSettings();
  const isDark = colorScheme === 'dark';
  const cosmicImageOpacity = cosmicBackgroundOpacity / 10;
  const cornerAccentColor = getCornerAccentColor(momentType, momentColors);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[styles.container, style]}
      edges={['top']}
    >
      {isDark ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={cosmicBackground}
            style={[StyleSheet.absoluteFill, { opacity: cosmicImageOpacity }]}
            resizeMode="cover"
            pointerEvents="none"
          />
          <LinearGradient
            colors={DARK_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          >
            {momentType && momentTypeOpacity > 0 && (
              <>
                <LinearGradient
                  colors={[cornerAccentColor, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { opacity: momentTypeOpacity }]}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={[cornerAccentColor, 'transparent']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFill, { opacity: momentTypeOpacity }]}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['transparent', cornerAccentColor]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFill, { opacity: momentTypeOpacity }]}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['transparent', cornerAccentColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { opacity: momentTypeOpacity }]}
                  pointerEvents="none"
                />
              </>
            )}

            <View
              style={[styles.content, contentStyle]}
              {...otherProps}
            >
              {children}
            </View>
          </LinearGradient>
        </View>
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
                colors={[cornerAccentColor, 'transparent']}
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
                colors={[cornerAccentColor, 'transparent']}
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
                colors={['transparent', cornerAccentColor]}
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
                colors={['transparent', cornerAccentColor]}
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
    backgroundColor: 'transparent',
  },
});

