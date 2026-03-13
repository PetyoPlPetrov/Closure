import React, { createContext, useCallback, useContext, useRef } from 'react';

type UnsavedChangesChecker = () => boolean;

interface UnsavedChangesContextValue {
  registerScreen: (screenId: string, checker: UnsavedChangesChecker) => () => void;
  checkUnsavedChanges: () => { hasChanges: boolean; screenId: string | null };
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const screenCheckersRef = useRef<Map<string, UnsavedChangesChecker>>(new Map());

  const registerScreen = useCallback((screenId: string, checker: UnsavedChangesChecker) => {
    screenCheckersRef.current.set(screenId, checker);

    // Return cleanup function
    return () => {
      screenCheckersRef.current.delete(screenId);
    };
  }, []);

  const checkUnsavedChanges = useCallback(() => {
    // Check all registered screens for unsaved changes
    for (const [screenId, checker] of screenCheckersRef.current.entries()) {
      if (checker()) {
        return { hasChanges: true, screenId };
      }
    }
    return { hasChanges: false, screenId: null };
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ registerScreen, checkUnsavedChanges }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
}
