import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { Text, type TextProps } from 'react-native';

type FontSize = 'xs' | 'sm' | 'l' | 'xl' | 'xxs';
type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
type LetterSpacing = 's' | 'm' | 'l';

const FONT_SIZES: Record<FontSize, number> = {
  xxs: 10,
  xs: 12,
  sm: 14,
  l: 20,
  xl: 32,
};

const FONT_WEIGHTS: Record<FontWeight, '400' | '500' | '600' | '700'> = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const LETTER_SPACINGS: Record<LetterSpacing, number> = {
  s: -0.015, // Small/tight spacing
  m: 0,      // Medium/normal spacing
  l: 0.015,  // Large/wide spacing
};

const DEFAULT_FONT_SIZE = 16; // Default medium/base size
const DEFAULT_FONT_WEIGHT: '400' | '500' | '600' | '700' = '400'; // Default normal weight
const DEFAULT_LETTER_SPACING = 0; // Default normal spacing

export type ThemedTextProps = TextProps & {
  size?: FontSize;
  weight?: FontWeight;
  letterSpacing?: LetterSpacing;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  emphasis?: 'high' | 'medium' | 'disabled'; // Text emphasis level for dark mode
};

export function ThemedText({
  style,
  size,
  weight = 'normal',
  letterSpacing,
  type = 'default',
  emphasis = 'high',
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const fontScale = useFontScale();
  
  // Determine text color based on theme and emphasis level
  // Dark mode: use proper opacity levels (87% high, 60% medium, 38% disabled)
  // Light mode: use standard text color
  let textColor: string;
  if (colorScheme === 'dark') {
    switch (emphasis) {
      case 'high':
        textColor = Colors.dark.textHighEmphasis;
        break;
      case 'medium':
        textColor = Colors.dark.textMediumEmphasis;
        break;
      case 'disabled':
        textColor = Colors.dark.textDisabled;
        break;
      default:
        textColor = Colors.dark.textHighEmphasis;
    }
  } else {
    textColor = Colors.light.text;
  }
  
  // Use size preset if provided, otherwise use default
  // Scale by fontScale (1.5 for tablets, 1.0 for phones)
  const baseFontSize = size ? FONT_SIZES[size] : DEFAULT_FONT_SIZE;
  const fontSize = baseFontSize * fontScale;
  // Use weight preset if provided, otherwise use default
  const fontWeight = weight ? FONT_WEIGHTS[weight] : DEFAULT_FONT_WEIGHT;
  // Use letter spacing preset if provided, otherwise use default
  const letterSpacingValue = letterSpacing ? LETTER_SPACINGS[letterSpacing] : DEFAULT_LETTER_SPACING;

  // Calculate line height automatically based on font size (1.4x multiplier for good readability)
  // This ensures line height scales proportionally with font size
  const calculatedLineHeight = fontSize * 1.4;
  
  // Special line heights for specific types (only used if type is set)
  const titleLineHeight = type === 'title' ? fontSize * 1.0 : undefined; // Tighter for titles
  const linkLineHeight = type === 'link' ? fontSize * 1.875 : undefined; // ~30/16 ratio

  // Check if color is explicitly set in style prop
  const styleColor = (style && typeof style === 'object' && !Array.isArray(style)) 
    ? (style as any).color 
    : undefined;
  
  // Check if letterSpacing is explicitly set in style prop (should override preset)
  const styleLetterSpacing = (style && typeof style === 'object' && !Array.isArray(style)) 
    ? (style as any).letterSpacing 
    : undefined;
  
  // Check if lineHeight is explicitly set in style prop (scale it too)
  const styleLineHeight = (style && typeof style === 'object' && !Array.isArray(style)) 
    ? (style as any).lineHeight 
    : undefined;
  
  // Use explicit color from style if provided, otherwise use theme color
  // For link type, use link color unless explicitly overridden
  const linkColor = '#0a7ea4';
  const finalColor = styleColor ?? (type === 'link' ? linkColor : textColor);
  // Use explicit letterSpacing from style if provided, otherwise use preset
  const finalLetterSpacing = styleLetterSpacing ?? letterSpacingValue;
  
  // Determine lineHeight: use style override if provided (and scale it), 
  // otherwise use type-specific line height, otherwise use calculated default
  let lineHeight: number | undefined;
  if (styleLineHeight !== undefined) {
    // Scale lineHeight if explicitly set in style (multiply by fontScale)
    lineHeight = typeof styleLineHeight === 'number' 
      ? styleLineHeight * fontScale 
      : styleLineHeight;
  } else if (titleLineHeight !== undefined) {
    lineHeight = titleLineHeight;
  } else if (linkLineHeight !== undefined) {
    lineHeight = linkLineHeight;
  } else {
    // Default: calculate based on font size
    lineHeight = calculatedLineHeight;
  }

  return (
    <Text
      style={[
        { 
          color: finalColor, 
          fontSize, 
          fontWeight, 
          letterSpacing: finalLetterSpacing,
          ...(lineHeight !== undefined && { lineHeight }),
        },
        style,
      ]}
      {...rest}
    />
  );
}
