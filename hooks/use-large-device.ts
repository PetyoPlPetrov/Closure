import { useMemo } from 'react';
import { Dimensions } from 'react-native';

/**
 * Hook to detect large devices and provide max-width constraint
 * Returns max-width of 75% screen width for devices wider than 768px (iPad and larger)
 */
export function useLargeDevice() {
  const screenWidth = Dimensions.get('window').width;
  const isLargeDevice = screenWidth > 768;
  const maxContentWidth = useMemo(() => {
    return isLargeDevice ? screenWidth * 0.75 : '100%';
  }, [isLargeDevice, screenWidth]);

  return {
    isLargeDevice,
    maxContentWidth,
    screenWidth,
  };
}

