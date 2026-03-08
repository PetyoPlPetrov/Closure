import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { languageManager } from './language-manager';
import { Language } from './translations';

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

        // First app open: default to English. User chooses language on onboarding step 0.
        setLanguageState('en');
      } catch (error) {
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

