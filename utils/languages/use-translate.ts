import { useMemo } from 'react';
import { useLanguage } from './language-context';
import { getTranslation, Translations } from './translations';

/**
 * Hook to get translation function
 * Usage: const t = useTranslate(); t('button.newChallenge')
 * With interpolation: t('message.greeting', { name: 'John' })
 */
export function useTranslate() {
  const { language } = useLanguage();

  const t = useMemo(() => {
    return (key: keyof Translations, params?: Record<string, string | number>): string => {
      let text = getTranslation(key, language);

      // Replace placeholders like {name}, {count}, etc.
      if (params) {
        Object.keys(params).forEach((paramKey) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
        });
      }

      return text;
    };
  }, [language]);

  return t;
}

