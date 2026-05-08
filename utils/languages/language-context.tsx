import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { languageManager, type SpeechToTextLanguage } from './language-manager';
import { Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  speechToTextLanguage: SpeechToTextLanguage;
  resolvedSpeechToTextLanguage: Language;
  setSpeechToTextLanguage: (lang: SpeechToTextLanguage) => Promise<void>;
  isDetecting: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [speechToTextLanguage, setSpeechToTextLanguageState] = useState<SpeechToTextLanguage>('auto');
  const [isDetecting, setIsDetecting] = useState(true);

  // Detect language on mount
  useEffect(() => {
    const detectLanguage = async () => {
      try {
        // Try to get saved preferences first
        const [savedLanguage, savedSpeechToTextLanguage] = await Promise.all([
          languageManager.getLanguage(),
          languageManager.getSpeechToTextLanguage(),
        ]);
        setSpeechToTextLanguageState(savedSpeechToTextLanguage);

        if (savedLanguage) {
          setLanguageState(savedLanguage);
          return;
        }

        // First app open: default to English. User chooses language on onboarding step 0.
        setLanguageState('en');
      } catch (error) {
        setLanguageState('en');
        setSpeechToTextLanguageState('auto');
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

  const setSpeechToTextLanguage = useCallback(async (lang: SpeechToTextLanguage) => {
    setSpeechToTextLanguageState(lang);
    await languageManager.setSpeechToTextLanguage(lang);
  }, []);

  const resolvedSpeechToTextLanguage: Language =
    speechToTextLanguage === 'auto' ? language : speechToTextLanguage;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        speechToTextLanguage,
        resolvedSpeechToTextLanguage,
        setSpeechToTextLanguage,
        isDetecting,
      }}
    >
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

