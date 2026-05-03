import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_MODE_STORAGE_KEY = '@sferas:theme_mode';

export async function getThemeModePreference(): Promise<ThemeMode | null> {
  try {
    const saved = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setThemeModePreference(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore persistence errors
  }
}
