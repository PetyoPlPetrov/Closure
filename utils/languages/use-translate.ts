import { useMemo } from 'react';
import { useLanguage } from './language-context';
import { getTranslation, Translations } from './translations';

/**
 * Hook to get translation function
 * Usage: const t = useTranslate(); t('button.newChallenge')
 */
export function useTranslate() {
  const { language } = useLanguage();
  
  const t = useMemo(() => {
    return (key: keyof Translations): string => {
      return getTranslation(key, language);
    };
  }, [language]);
  
  return t;
}

