import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from './translations';

const LANGUAGE_STORAGE_KEY = '@sferas:language';

export const languageManager = {
  async getLanguage(): Promise<Language | null> {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'bg') {
        return saved as Language;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  async setLanguage(language: Language): Promise<void> {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      // Error setting language
    }
  },
};

