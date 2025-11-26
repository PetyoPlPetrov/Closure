import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Localization from 'expo-localization';
import { Language } from './translations';
import { languageManager } from './language-manager';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  isDetecting: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isDetecting, setIsDetecting] = useState(true);

  // Detect language on mount
  useEffect(() => {
    const detectLanguage = async () => {
      try {
        // Try to get saved preference first
        const savedLanguage = await languageManager.getLanguage();
        if (savedLanguage) {
          setLanguageState(savedLanguage);
          setIsDetecting(false);
          return;
        }

        // Try to detect from device locale (may not be available until app is rebuilt)
        try {
          const locales = Localization.getLocales();
          const locale = locales[0];
          
          if (locale) {
            // Check country code first (BG for Bulgaria)
            const countryCode = locale.regionCode || locale.countryCode || '';
            const languageCode = locale.languageCode || '';
            
            // Check if device is in Bulgaria or uses Bulgarian language
            if (countryCode === 'BG' || languageCode === 'bg' || locale.languageTag?.toLowerCase().includes('bg')) {
              setLanguageState('bg');
              setIsDetecting(false);
              return;
            } else {
              setLanguageState('en');
              setIsDetecting(false);
              return;
            }
          }
        } catch (localizationError) {
          // expo-localization not available yet (needs rebuild), try fallback
          console.warn('[LanguageProvider] expo-localization not available, using fallback:', localizationError);
        }

        // Fallback: check locale string if available
        try {
          const localeString = Localization.locale || '';
          if (localeString.toLowerCase().includes('bg') || localeString.toLowerCase().includes('bulgaria')) {
            setLanguageState('bg');
          } else {
            setLanguageState('en');
          }
        } catch {
          // If all else fails, default to English
          setLanguageState('en');
        }
      } catch (error) {
        console.error('[LanguageProvider] Error detecting language:', error);
        setLanguageState('en');
      } finally {
        setIsDetecting(false);
      }
    };

    detectLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await languageManager.setLanguage(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isDetecting }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

