import React, { createContext, useCallback, useContext, useRef } from 'react';

type UnsavedChangesChecker = () => boolean;
type ResetScreenFunction = () => void;

interface UnsavedChangesContextValue {
  registerScreen: (screenId: string, checker: UnsavedChangesChecker, resetFn?: ResetScreenFunction) => () => void;
  checkUnsavedChanges: () => { hasChanges: boolean; screenId: string | null };
  resetScreen: (screenId: string) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const screenCheckersRef = useRef<Map<string, UnsavedChangesChecker>>(new Map());
  const screenResettersRef = useRef<Map<string, ResetScreenFunction>>(new Map());

  const registerScreen = useCallback((screenId: string, checker: UnsavedChangesChecker, resetFn?: ResetScreenFunction) => {
    screenCheckersRef.current.set(screenId, checker);
    if (resetFn) {
      screenResettersRef.current.set(screenId, resetFn);
    }

    // Return cleanup function
    return () => {
      screenCheckersRef.current.delete(screenId);
      screenResettersRef.current.delete(screenId);
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

  const resetScreen = useCallback((screenId: string) => {
    const resetFn = screenResettersRef.current.get(screenId);
    if (resetFn) {
      resetFn();
    }
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ registerScreen, checkUnsavedChanges, resetScreen }}>
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
