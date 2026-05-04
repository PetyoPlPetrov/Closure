import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMomentColors } from '@/utils/MomentColorsProvider';
import {
  MAX_COSMIC_BACKGROUND_OPACITY,
  useVisualSettings,
} from '@/utils/VisualSettingsProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Image, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const cosmicBackground = require('@/assets/images/cosmic-background.png');

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export const TAB_BACKGROUND_COLOR_DARK = '#1A2332'; // Dark blue-grey background
export const TAB_BACKGROUND_COLOR_LIGHT = '#D5D8DE';

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
// Muted cool greys — no near-white stops (easier on eyes than #FFF screens).
export const LIGHT_GRADIENT_COLORS = [
  '#C9CCD2',
  '#CED1D6',
  '#D3D6DB',
  '#D5D8DE',
  '#D8DBDF',
  '#DADCE1',
  '#DCDEE2',
  '#DEE0E4',
] as const;

/**
 * Single radial vignette — smooth falloff from center (no four-edge “cross” / boxy seam).
 * Static SVG only; still lighter than blur.
 */
const VIGNETTE_GRAD_ID = 'tabScreenViewportVignette';

/** Light theme: full strength when Cosmic background slider = 10 (strong edge preset). */
const VIGNETTE_LIGHT_MAX = {
  rgb: '88,98,114',
  edgeOpacity: 0.52,
  rx: '90%',
  ry: '94%',
} as const;

/** Dark theme: fixed vignette (cosmic slider only affects the starfield image). */
const VIGNETTE_DARK = { rgb: '6,10,20', edgeOpacity: 0.54 } as const;

const ViewportEdgeVignette = memo(function ViewportEdgeVignette({
  isDark,
  lightStrength = 0,
}: {
  isDark: boolean;
  /** 0–1 from Cosmic background slider in light mode; ignored in dark mode. */
  lightStrength?: number;
}) {
  if (!isDark) {
    const s = Math.max(0, Math.min(1, lightStrength));
    if (s <= 0) return null;
    const edgeOpacity = VIGNETTE_LIGHT_MAX.edgeOpacity * s;
    const c = `rgb(${VIGNETTE_LIGHT_MAX.rgb})`;
    const o = (t: number) => Math.round(edgeOpacity * t * 1000) / 1000;
    return (
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
      >
        <Defs>
          <RadialGradient
            id={VIGNETTE_GRAD_ID}
            cx="50%"
            cy="50%"
            rx={VIGNETTE_LIGHT_MAX.rx}
            ry={VIGNETTE_LIGHT_MAX.ry}
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor={c} stopOpacity={0} />
            <Stop offset="24%" stopColor={c} stopOpacity={0} />
            <Stop offset="44%" stopColor={c} stopOpacity={o(0.2)} />
            <Stop offset="62%" stopColor={c} stopOpacity={o(0.48)} />
            <Stop offset="80%" stopColor={c} stopOpacity={o(0.78)} />
            <Stop offset="100%" stopColor={c} stopOpacity={edgeOpacity} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${VIGNETTE_GRAD_ID})`} />
      </Svg>
    );
  }

  const { rgb, edgeOpacity } = VIGNETTE_DARK;
  const c = `rgb(${rgb})`;
  const o = (t: number) => Math.round(edgeOpacity * t * 1000) / 1000;
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
    >
      <Defs>
        <RadialGradient
          id={VIGNETTE_GRAD_ID}
          cx="50%"
          cy="50%"
          rx="78%"
          ry="84%"
          fx="50%"
          fy="50%"
        >
          <Stop offset="0%" stopColor={c} stopOpacity={0} />
          <Stop offset="32%" stopColor={c} stopOpacity={0} />
          <Stop offset="50%" stopColor={c} stopOpacity={o(0.18)} />
          <Stop offset="68%" stopColor={c} stopOpacity={o(0.45)} />
          <Stop offset="84%" stopColor={c} stopOpacity={o(0.72)} />
          <Stop offset="100%" stopColor={c} stopOpacity={edgeOpacity} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${VIGNETTE_GRAD_ID})`} />
    </Svg>
  );
});

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
  const lightVignetteStrength =
    cosmicBackgroundOpacity / MAX_COSMIC_BACKGROUND_OPACITY;
  const cornerAccentColor = getCornerAccentColor(momentType, momentColors);

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
            <ViewportEdgeVignette isDark />
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
          <ViewportEdgeVignette
            isDark={false}
            lightStrength={lightVignetteStrength}
          />
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

