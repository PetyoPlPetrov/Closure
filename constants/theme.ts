/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Theme colors following Material Design and iOS dark mode principles:
 * - Dark background: #121212 (dark grey, not pure black) for reduced eye strain
 * - Text opacity levels: 87% (high), 60% (medium), 38% (disabled)
 * - Desaturated colors for better readability on dark backgrounds
 * - Elevation-based surfaces that get lighter with higher elevation
 */

export const Colors = {
  light: {
    text: '#11181C',
    background: '#B0B0B0', // Darker grey background for light mode
    tint: '#34C759',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#34C759',
    primary: '#34C759',
    primaryLight: '#7dd3fc',
    primaryDark: '#0c4a6e',
    error: '#ff4444',
  },
  dark: {
    // Base colors
    text: '#FFFFFF', // Pure white base for text (opacity applied in components)
    background: '#1A2332', // Dark blue-grey background (softer than pure dark grey)
    
    // Text colors with proper opacity levels
    textHighEmphasis: 'rgba(255, 255, 255, 0.87)', // 87% opacity for high-emphasis text
    textMediumEmphasis: 'rgba(255, 255, 255, 0.60)', // 60% opacity for medium-emphasis text
    textDisabled: 'rgba(255, 255, 255, 0.38)', // 38% opacity for disabled text
    
    // Desaturated accent colors (less vibrant for dark theme)
    tint: '#64B5F6', // Desaturated blue (was #38bdf8)
    primary: '#64B5F6', // Desaturated blue primary
    primaryLight: '#90CAF9', // Lighter desaturated blue
    primaryDark: '#42A5F5', // Darker desaturated blue
    
    // Icon colors (desaturated)
    icon: 'rgba(255, 255, 255, 0.60)', // Medium emphasis for icons
    tabIconDefault: 'rgba(255, 255, 255, 0.60)', // Medium emphasis
    tabIconSelected: '#64B5F6', // Desaturated blue for selected
    
    // Error color (slightly desaturated)
    error: '#EF5350', // Desaturated red (was #ff4444)
    
    // Surface colors for elevation (get lighter with higher elevation)
    surface: '#1A2332', // Base surface (elevation 0) - dark blue-grey
    surfaceElevated1: '#243041', // Elevation 1 - slightly lighter blue-grey
    surfaceElevated2: '#2D3A4F', // Elevation 2 - medium blue-grey
    surfaceElevated4: '#3A4A5F', // Elevation 4 - lighter blue-grey
    surfaceElevated8: '#4A5A6F', // Elevation 8 - lightest blue-grey
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
