import { useTheme } from '@/utils/ThemeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorScheme;
}
