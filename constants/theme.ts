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
    background: '#FFFFFF',
    textHighEmphasis: '#0D0D0D',
    textMediumEmphasis: '#444444',
    /** Lightest neutral that still achieves ≥7:1 vs `#D5D8DE` (AAA); slightly darker than `#4F4F4F`. */
    textDisabled: '#94A3B8',
    tint: '#0C3819',
    icon: '#2E2E2E',
    tabIconDefault: '#64748B',
    tabIconSelected: '#0C3819',
    /** Brand success green for light theme fills; lighter than legacy tone while keeping white-label contrast. */
    primary: '#166A31',
    /** Lighter companion stop for glossy gradients / pressed accents. */
    primaryLight: '#228B41',
    primaryDark: '#0A4D22',
    primaryText: '#FFFFFF',
    error: '#D32F2F',
    surface: '#FFFFFF',
    surfaceElevated1: '#F8FAFC',
    surfaceElevated2: '#F1F5F9',
    surfaceElevated4: '#E2E8F0',
    surfaceElevated8: '#CBD5E1',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B1120',

    /** Opaque highs — translucent white loses AAA on brightest elevated cards (#424E62). */
    textHighEmphasis: '#FFFFFF',
    textMediumEmphasis: '#94A3B8',
    textDisabled: '#475569',

    tint: '#34D399',
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    /** Third stop for 3-point glossy gradients (event cards, loaders). */
    primaryDeep: '#047857',
    primaryText: '#0B1120',

    icon: '#F8FAFC',
    tabIconDefault: '#475569',
    tabIconSelected: '#34D399',

    error: '#EF4444',

    surface: '#0B1120',
    surfaceElevated1: '#151E32',
    surfaceElevated2: '#1D283E',
    surfaceElevated4: '#2A3750',
    surfaceElevated8: '#3A4C6A',
  },
};

/** Dark accent blue gradient (primary → darker → deepest) — reuse instead of `#64B5F6` literals. */
export const darkPrimaryGradient3: readonly [string, string, string] = [
  Colors.dark.primaryLight,
  Colors.dark.primary,
  Colors.dark.primaryDark,
];

/** Two-stop gradient share / pill chrome (dark accent family). */
export const darkPrimaryShareGradient: readonly [string, string] = [
  Colors.dark.primary,
  Colors.dark.primaryLight,
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
