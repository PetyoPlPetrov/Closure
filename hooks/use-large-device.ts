import { useMemo } from 'react';
import { Dimensions } from 'react-native';

export type DeviceSize = 'small' | 'large' | 'tablet';

/**
 * Hook to detect device size and provide max-width constraint
 * - Small: < 768px (phones)
 * - Large: 768px - 1024px (large phones, small tablets)
 * - Tablet: >= 1024px (tablets in landscape, desktops)
 */
export function useLargeDevice() {
  const screenWidth = Dimensions.get('window').width;
  
  const deviceSize: DeviceSize = useMemo(() => {
    if (screenWidth >= 1024) {
      return 'tablet';
    } else if (screenWidth >= 768) {
      return 'large';
    } else {
      return 'small';
    }
  }, [screenWidth]);

  const isLargeDevice = deviceSize === 'large' || deviceSize === 'tablet';
  const isTablet = deviceSize === 'tablet';
  const isSmall = deviceSize === 'small';

  const maxContentWidth = useMemo(() => {
    if (isTablet) {
      return screenWidth * 0.75;
    } else if (isLargeDevice) {
      return screenWidth * 0.85;
    } else {
      return '100%';
    }
  }, [screenWidth, isTablet, isLargeDevice]);

  return {
    deviceSize,
    isLargeDevice, // For backward compatibility
    isTablet,
    isSmall,
    maxContentWidth,
    screenWidth,
  };
}

