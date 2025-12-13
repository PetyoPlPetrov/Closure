// Always return dark theme - theme switching is disabled
export function useColorScheme() {
  return 'dark' as const;
}
