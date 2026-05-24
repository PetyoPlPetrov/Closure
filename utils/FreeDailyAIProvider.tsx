import React, { createContext, useContext, useEffect, useState } from "react";

interface FreeDailyAIContextType {
  /** Number of free AI requests allowed per day for non-subscribers. 0 means feature is hidden. */
  freeDailyAILimit: number;
  /** Whether the remote value has loaded */
  isLoaded: boolean;
}

const FreeDailyAIContext = createContext<FreeDailyAIContextType>({
  freeDailyAILimit: 0,
  isLoaded: false,
});

/**
 * Provides the remotely-configured free daily AI request limit.
 * Default is 0 (feature hidden). Replace fetchFreeDailyAILimit with a real
 * API call later.
 */
export function FreeDailyAIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [freeDailyAILimit, setFreeDailyAILimit] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchFreeDailyAILimit().then((limit) => {
      setFreeDailyAILimit(limit);
      setIsLoaded(true);
    });
  }, []);

  return (
    <FreeDailyAIContext.Provider value={{ freeDailyAILimit, isLoaded }}>
      {children}
    </FreeDailyAIContext.Provider>
  );
}

export function useFreeDailyAI(): FreeDailyAIContextType {
  return useContext(FreeDailyAIContext);
}

/**
 * Mock API call — replace with a real endpoint later.
 * Returns 3 for now to match existing behaviour.
 */
async function fetchFreeDailyAILimit(): Promise<number> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return 3;
}
