import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AIInsightsConsentChoice } from '@/utils/ai-insights-consent';
import { getAIInsightsConsentChoice, setAIInsightsConsentChoice } from '@/utils/ai-insights-consent';

type AIInsightsConsentContextValue = {
  choice: AIInsightsConsentChoice | null;
  isEnabled: boolean;
  isLoaded: boolean;
  setChoice: (choice: AIInsightsConsentChoice) => Promise<void>;
  refresh: () => Promise<void>;
};

const AIInsightsConsentContext = createContext<AIInsightsConsentContextValue | undefined>(undefined);

export function AIInsightsConsentProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<AIInsightsConsentChoice | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const c = await getAIInsightsConsentChoice();
    setChoiceState(c);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setChoice = useCallback(async (next: AIInsightsConsentChoice) => {
    // optimistic UI
    setChoiceState(next);
    setIsLoaded(true);
    try {
      await setAIInsightsConsentChoice(next);
    } catch (e) {
      // If persistence fails, re-sync from disk
      await refresh();
      throw e;
    }
  }, [refresh]);

  const value = useMemo<AIInsightsConsentContextValue>(() => {
    return {
      choice,
      isEnabled: choice === 'enabled',
      isLoaded,
      setChoice,
      refresh,
    };
  }, [choice, isLoaded, refresh, setChoice]);

  return <AIInsightsConsentContext.Provider value={value}>{children}</AIInsightsConsentContext.Provider>;
}

export function useAIInsightsConsent() {
  const ctx = useContext(AIInsightsConsentContext);
  if (!ctx) throw new Error('useAIInsightsConsent must be used within AIInsightsConsentProvider');
  return ctx;
}

