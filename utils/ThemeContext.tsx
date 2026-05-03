import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

import {
  getThemeModePreference,
  setThemeModePreference,
  type ThemeMode,
} from './theme-storage';

export type { ThemeMode };

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveColorScheme(
  mode: ThemeMode,
  system: ColorSchemeName,
): 'light' | 'dark' {
  if (mode === 'system') {
    return system === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(() =>
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getThemeModePreference();
      if (!cancelled && saved != null) {
        setThemeModeState(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const colorScheme = useMemo(
    () => resolveColorScheme(themeMode, systemScheme),
    [themeMode, systemScheme],
  );

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await setThemeModePreference(mode);
  }, []);

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
