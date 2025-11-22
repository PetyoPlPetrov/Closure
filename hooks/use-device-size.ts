import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * Hook to detect if the device is a tablet/large device
 * Returns true if the device is a tablet (minimum screen dimension >= 600)
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(() => {
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    // Consider device a tablet if minimum dimension is >= 600
    // Also check Platform for iPad on iOS
    return minDimension >= 600 || (Platform.OS === 'ios' && Platform.isPad);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window;
      const minDimension = Math.min(width, height);
      const newIsTablet = minDimension >= 600 || (Platform.OS === 'ios' && Platform.isPad);
      setIsTablet(newIsTablet);
    });

    return () => subscription?.remove();
  }, []);

  return isTablet;
}

/**
 * Hook to get font scale multiplier based on device size
 * Returns 1.5 for tablets, 1.0 for phones
 */
export function useFontScale(): number {
  const isTablet = useIsTablet();
  return isTablet ? 1.5 : 1.0;
}

/**
 * Hook to get icon scale multiplier based on device size
 * Returns:
 * - 1.8 for tablets
 * - 1.2 for large phones (Pro Max, >6 inch, minDimension >= 400)
 * - 1.0 for regular phones
 */
export function useIconScale(): number {
  const isTablet = useIsTablet();
  const [iconScale, setIconScale] = useState(() => {
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    const isLargePhone = !isTablet && minDimension >= 400; // ~6 inch phones
    return isTablet ? 1.8 : (isLargePhone ? 1.2 : 1.0);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window;
      const minDimension = Math.min(width, height);
      const currentIsTablet = minDimension >= 600 || (Platform.OS === 'ios' && Platform.isPad);
      const isLargePhone = !currentIsTablet && minDimension >= 400; // ~6 inch phones
      const newIconScale = currentIsTablet ? 1.8 : (isLargePhone ? 1.2 : 1.0);
      setIconScale(newIconScale);
    });

    return () => subscription?.remove();
  }, [isTablet]);

  return iconScale;
}

/**
 * Utility function to scale spacing values (padding, margin, gap, etc.) based on device size
 * This should be used to scale numeric spacing values in styles
 */
export function scaleSpacing(value: number, fontScale: number): number {
  return value * fontScale;
}

