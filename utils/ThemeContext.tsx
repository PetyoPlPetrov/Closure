import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@closure_theme_mode';

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark'); // Default to dark
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const systemColorScheme = useRNColorScheme();

  // Load theme preference on mount
  useEffect(() => {
    loadThemeMode();
  }, []);

  // Update color scheme when theme mode or system color scheme changes
  useEffect(() => {
    if (themeMode === 'system') {
      setColorScheme(systemColorScheme || 'dark');
    } else {
      setColorScheme(themeMode);
    }
  }, [themeMode, systemColorScheme]);

  const loadThemeMode = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setThemeModeState(stored as ThemeMode);
      } else {
        // Default to dark if nothing stored
        setThemeModeState('dark');
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
      setThemeModeState('dark');
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, colorScheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

