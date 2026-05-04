/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Theme colors following Material Design elevation:
 * - **Light**: grey chrome tuned so primary greens + `#424242` disabled copy stay ≥7:1 vs `#D5D8DE` (WCAG 2.1 AAA / 1.4.6).
 * - **Dark**: opaque slate text tokens (opacity-on-glass fails AAA on brightest cards). Elevated slate steps are
 *   slightly subdued so `#E8EDF6` / `#E4EDF8` stay ≥7:1 vs every surface incl. cards (AAA).
 */

export const Colors = {
  light: {
    // Softer than #FFF/#FAFAFA to reduce glare. Body text stays AAA vs background; greens are
    // tuned so primary / primaryLight also meet AAA when used as text on this grey (see 1.4.6).
    text: '#0D0D0D',
    background: '#D5D8DE',
    textHighEmphasis: '#0D0D0D',
    textMediumEmphasis: '#2E2E2E',
    /** Lightest neutral that still achieves ≥7:1 vs `#D5D8DE` (AAA); slightly darker than `#4F4F4F`. */
    textDisabled: '#424242',
    tint: '#0C3819',
    icon: '#2E2E2E',
    tabIconDefault: '#383838',
    tabIconSelected: '#0C3819',
    /** Darkest green: fills / selected chrome; ≥7:1 vs background when used as text. */
    primary: '#0C3819',
    /** Slightly lighter than `primary` for gradients & pressed accents; still ≥7:1 vs background. */
    primaryLight: '#0F4720',
    primaryDark: '#082211',
    primaryText: '#FFFFFF',
    error: '#B71C1C',
    surface: '#D5D8DE',
    surfaceElevated1: '#DFE2E6',
    surfaceElevated2: '#E5E8EB',
    surfaceElevated4: '#EBEEF1',
    surfaceElevated8: '#F0F1F3',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1A2332',

    /** Opaque highs — translucent white loses AAA on brightest elevated cards (#424E62). */
    textHighEmphasis: '#FFFFFF',
    textMediumEmphasis: '#E8EDF6',
    textDisabled: '#E4EDF8',

    tint: '#64B5F6',
    primary: '#64B5F6',
    primaryLight: '#90CAF9',
    primaryDark: '#42A5F5',
    /** Third stop for 3-point glossy gradients (event cards, loaders). */
    primaryDeep: '#1E88E5',
    primaryText: '#1A2332',

    icon: '#E8EDF6',
    tabIconDefault: '#E8EDF6',
    tabIconSelected: '#64B5F6',

    error: '#EF5350',

    surface: '#1A2332',
    surfaceElevated1: '#243041',
    surfaceElevated2: '#2D3A4F',
    surfaceElevated4: '#364557',
    surfaceElevated8: '#424E62',
  },
};

/** Dark accent blue gradient (primary → darker → deepest) — reuse instead of `#64B5F6` literals. */
export const darkPrimaryGradient3: readonly [string, string, string] = [
  Colors.dark.primary,
  Colors.dark.primaryDark,
  Colors.dark.primaryDeep,
];

/** Two-stop gradient share / pill chrome (dark accent family). */
export const darkPrimaryShareGradient: readonly [string, string] = [
  Colors.dark.primaryDark,
  Colors.dark.primary,
];

/** Floating + / FAB fill in both themes (`Colors.light.primary` is brand green). */
export const fabAccentBackground = Colors.dark.primary;

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
